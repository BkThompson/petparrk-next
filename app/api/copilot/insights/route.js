// app/api/copilot/insights/route.js
//
// Track 3 Phase C — Longitudinal insights.
//
// GET-style POST: { petId, force? } → { insights: [...], cached: bool }
//
// DESIGN CONSTRAINT (non-negotiable):
//   Insights are FACTUAL and TREND-ONLY. This route performs date math and
//   states observed changes. It NEVER infers a medical condition, never
//   suggests a diagnosis, and never implies causation. If you are tempted to
//   add "this may indicate X" — don't. That's a different product with
//   different liability.
//
// Everything here is deterministic rules. No LLM call is required for
// correctness; the phrasing is templated so it can't hallucinate a number.

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import crypto from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Regenerate if the cache is older than this AND the fingerprint changed.
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

// Thresholds
const VAX_SOON_DAYS = 30;
const VISIT_STALE_MONTHS = 14; // gentle nudge, not alarm
const WEIGHT_CHANGE_PCT = 7; // only surface meaningful movement

export async function POST(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const accessToken = authHeader.replace("Bearer ", "");
  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const {
    data: { user },
    error: userError,
  } = await supabaseUser.auth.getUser(accessToken);
  if (userError || !user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.petId) {
    return NextResponse.json({ error: "petId is required" }, { status: 400 });
  }
  const { petId, force } = body;

  // ── Verify ownership
  const { data: pet, error: petError } = await supabaseAdmin
    .from("pets")
    .select("*")
    .eq("id", petId)
    .maybeSingle();

  if (petError) {
    return NextResponse.json(
      { error: `Pet lookup failed: ${petError.message}` },
      { status: 500 },
    );
  }
  if (!pet) {
    return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  }
  if (pet.owner_id !== user.id) {
    return NextResponse.json({ error: "Not your pet" }, { status: 403 });
  }

  // ── Load source data
  const [vaxRes, medRes, visitRes, weightRes] = await Promise.all([
    supabaseAdmin
      .from("pet_vaccinations")
      .select("*")
      .eq("pet_id", petId)
      .order("date_administered", { ascending: false }),
    supabaseAdmin
      .from("pet_medications")
      .select("*")
      .eq("pet_id", petId)
      .order("started_date", { ascending: false }),
    supabaseAdmin
      .from("pet_vet_visits")
      .select("*")
      .eq("pet_id", petId)
      .order("visit_date", { ascending: false }),
    supabaseAdmin
      .from("pet_weight_history")
      .select("*")
      .eq("pet_id", petId)
      .order("measured_at", { ascending: false }),
  ]);

  const vaccinations = vaxRes.data || [];
  const medications = medRes.data || [];
  const visits = visitRes.data || [];
  const weights = weightRes.data || [];

  // ── Cache check via a fingerprint.
  // IMPORTANT: this must include every field the rules below read. Row counts
  // alone are not enough — editing a `next_due` or `ended_date` changes what
  // insights should exist without changing any count.
  const fingerprintSource = [
    vaccinations
      .map((v) => `${v.id}:${v.next_due || ""}:${v.date_administered || ""}`)
      .join(","),
    medications.map((m) => `${m.id}:${m.ended_date || ""}`).join(","),
    visits
      .map((v) => `${v.id}:${v.visit_date || ""}:${v.reason || ""}`)
      .join(","),
    weights
      .map(
        (w) =>
          `${w.id}:${w.weight || ""}:${w.unit || ""}:${w.measured_at || ""}`,
      )
      .join(","),
  ].join("|");

  // Hash so the stored fingerprint stays small regardless of record count.
  const fingerprint = crypto
    .createHash("sha256")
    .update(fingerprintSource)
    .digest("hex");

  const { data: lastRun } = await supabaseAdmin
    .from("copilot_insight_runs")
    .select("*")
    .eq("pet_id", petId)
    .maybeSingle();

  // Cache is fresh only if: not forced, fingerprint matches, within TTL, AND
  // still the same calendar day. Insights are date-relative ("due in 3 weeks"),
  // so they must be recomputed when the day rolls over even if data is static.
  const lastRunDate = lastRun
    ? new Date(lastRun.last_run_at).toDateString()
    : null;
  const sameDay = lastRunDate === new Date().toDateString();

  const cacheIsFresh =
    !force &&
    lastRun &&
    lastRun.source_fingerprint === fingerprint &&
    sameDay &&
    Date.now() - new Date(lastRun.last_run_at).getTime() < CACHE_TTL_MS;

  if (cacheIsFresh) {
    const { data: cached } = await supabaseAdmin
      .from("copilot_insights")
      .select("*")
      .eq("pet_id", petId)
      .order("severity", { ascending: true })
      .order("reference_date", { ascending: true });
    return NextResponse.json({ insights: cached || [], cached: true });
  }

  // ── Compute insights (pure rules — no LLM, no inference)
  const insights = [];
  const today = startOfDay(new Date());

  // 1. Vaccination due dates ------------------------------------------------
  for (const vax of vaccinations) {
    if (!vax.next_due) continue;
    const due = parseDate(vax.next_due);
    if (!due) continue;
    const days = daysBetween(today, due);

    if (days < 0) {
      insights.push({
        kind: "reminder",
        category: "vaccination",
        severity: "overdue",
        title: `${vax.vaccine_type} was due ${formatDate(due)}`,
        detail: vax.date_administered
          ? `Last given ${formatDate(parseDate(vax.date_administered))}.`
          : null,
        reference_date: vax.next_due,
        profile_eligible: true,
        source_table: "pet_vaccinations",
        source_row_id: String(vax.id),
        dedupe_key: `vax_due:${vax.id}`,
      });
    } else if (days <= VAX_SOON_DAYS) {
      insights.push({
        kind: "reminder",
        category: "vaccination",
        severity: "soon",
        title: `${vax.vaccine_type} due ${describeDays(days)}`,
        detail: `Due ${formatDate(due)}.`,
        reference_date: vax.next_due,
        profile_eligible: true,
        source_table: "pet_vaccinations",
        source_row_id: String(vax.id),
        dedupe_key: `vax_due:${vax.id}`,
      });
    }
  }

  // 2. Medication end dates -------------------------------------------------
  for (const med of medications) {
    if (!med.ended_date) continue;
    const end = parseDate(med.ended_date);
    if (!end) continue;
    const days = daysBetween(today, end);
    // Only surface upcoming ends (a refill decision point), not past ones
    if (days >= 0 && days <= VAX_SOON_DAYS) {
      insights.push({
        kind: "reminder",
        category: "medication",
        severity: days <= 7 ? "soon" : "info",
        title: `${med.medication_name} course ends ${describeDays(days)}`,
        detail: med.frequency ? `Currently ${med.frequency}.` : null,
        reference_date: med.ended_date,
        profile_eligible: true,
        source_table: "pet_medications",
        source_row_id: String(med.id),
        dedupe_key: `med_end:${med.id}`,
      });
    }
  }

  // 3. Time since last visit ------------------------------------------------
  if (visits.length > 0 && visits[0].visit_date) {
    const last = parseDate(visits[0].visit_date);
    if (last) {
      const months = monthsBetween(last, today);
      if (months >= VISIT_STALE_MONTHS) {
        insights.push({
          kind: "reminder",
          category: "visit",
          severity: "info",
          title: `Last recorded visit was ${months} months ago`,
          detail: `${formatDate(last)}${visits[0].clinic_name ? ` at ${visits[0].clinic_name}` : ""}.`,
          reference_date: visits[0].visit_date,
          profile_eligible: false, // informational, not an action item
          source_table: "pet_vet_visits",
          source_row_id: String(visits[0].id),
          dedupe_key: "visit_gap",
        });
      }
    }
  }

  // 4. Weight trend (FACTUAL statement of change only) ----------------------
  if (weights.length >= 2) {
    const latest = weights[0];
    const earliest = weights[weights.length - 1];
    const w1 = Number(latest.weight);
    const w0 = Number(earliest.weight);
    if (
      !isNaN(w1) &&
      !isNaN(w0) &&
      w0 > 0 &&
      latest.unit === earliest.unit // don't compare lb to kg
    ) {
      const pct = ((w1 - w0) / w0) * 100;
      if (Math.abs(pct) >= WEIGHT_CHANGE_PCT) {
        const direction = pct > 0 ? "up" : "down";
        insights.push({
          kind: "trend",
          category: "weight",
          severity: "info",
          title: `Weight is ${direction} ${Math.abs(pct).toFixed(0)}% since ${formatDate(parseDate(earliest.measured_at))}`,
          detail: `${w0}${earliest.unit || ""} → ${w1}${latest.unit || ""}. Worth mentioning at the next visit.`,
          reference_date: latest.measured_at,
          profile_eligible: false,
          source_table: "pet_weight_history",
          source_row_id: String(latest.id),
          dedupe_key: "weight_trend",
        });
      }
    }
  }

  // 5. Repeat visit reasons (FACTUAL count only, no inference) --------------
  const reasonCounts = {};
  for (const v of visits) {
    const r = (v.reason || "").trim().toLowerCase();
    if (!r) continue;
    // Only look at the last 18 months
    const d = parseDate(v.visit_date);
    if (!d || monthsBetween(d, today) > 18) continue;
    reasonCounts[r] = (reasonCounts[r] || 0) + 1;
  }
  for (const [reason, count] of Object.entries(reasonCounts)) {
    if (count >= 3) {
      insights.push({
        kind: "trend",
        category: "visit",
        severity: "info",
        title: `${count} visits for "${reason}" in the last 18 months`,
        detail: "Worth mentioning at the next visit.",
        reference_date: null,
        profile_eligible: false,
        source_table: "pet_vet_visits",
        source_row_id: null,
        dedupe_key: `repeat_reason:${crypto
          .createHash("sha256")
          .update(reason)
          .digest("hex")
          .slice(0, 16)}`,
      });
    }
  }

  // ── Guard: ensure dedupe_key is unique within this batch. Two rules could
  // theoretically produce the same key (e.g. truncated reason strings); a
  // duplicate inside one upsert payload would error.
  const seenKeys = new Set();
  const deduped = [];
  for (const i of insights) {
    if (seenKeys.has(i.dedupe_key)) continue;
    seenKeys.add(i.dedupe_key);
    deduped.push(i);
  }
  insights.length = 0;
  insights.push(...deduped);

  // ── Persist. Use upsert on (pet_id, dedupe_key) so concurrent requests
  // (React strict-mode double-invoke, rapid refreshes) can't collide on the
  // unique index. Then remove any stale rows that are no longer generated.
  let saved = [];
  const generatedKeys = insights.map((i) => i.dedupe_key);

  if (insights.length > 0) {
    const rows = insights.map((i) => ({
      ...i,
      pet_id: petId,
      owner_id: user.id,
      generated_at: new Date().toISOString(),
    }));
    const { data: upserted, error: upsertError } = await supabaseAdmin
      .from("copilot_insights")
      .upsert(rows, { onConflict: "pet_id,dedupe_key" })
      .select("*");
    if (upsertError) {
      console.error("insights upsert error:", upsertError.message);
      return NextResponse.json(
        { error: `Could not save insights: ${upsertError.message}` },
        { status: 500 },
      );
    }
    saved = upserted || [];
  }

  // Clear insights that no longer apply (e.g. a vaccine was renewed).
  if (generatedKeys.length > 0) {
    await supabaseAdmin
      .from("copilot_insights")
      .delete()
      .eq("pet_id", petId)
      .not(
        "dedupe_key",
        "in",
        `(${generatedKeys.map((k) => `"${k}"`).join(",")})`,
      );
  } else {
    await supabaseAdmin.from("copilot_insights").delete().eq("pet_id", petId);
  }

  // Record the run
  await supabaseAdmin.from("copilot_insight_runs").upsert(
    {
      pet_id: petId,
      owner_id: user.id,
      last_run_at: new Date().toISOString(),
      source_fingerprint: fingerprint,
    },
    { onConflict: "pet_id" },
  );

  return NextResponse.json({ insights: saved, cached: false });
}

// ── Date helpers ────────────────────────────────────────────────────────────

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return startOfDay(d);
}

function daysBetween(from, to) {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function monthsBetween(from, to) {
  return Math.max(
    0,
    (to.getFullYear() - from.getFullYear()) * 12 +
      (to.getMonth() - from.getMonth()),
  );
}

function formatDate(d) {
  if (!d) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function describeDays(days) {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 7) return `in ${days} days`;
  if (days < 14) return "in about a week";
  if (days < 21) return "in about 2 weeks";
  if (days < 35) return "in about a month";
  return `in ${days} days`;
}
