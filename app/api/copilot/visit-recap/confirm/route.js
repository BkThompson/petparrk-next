// app/api/copilot/visit-recap/confirm/route.js
//
// Track 3 Phase B — Confirm staged recap items and write them to real tables.
//
// Input:
//   {
//     recapId,
//     decisions: [{ stagedItemId, decision: 'accepted' | 'rejected' }]
//   }
//
// Output:
//   { written: number, skipped: number, errors: [] }
//
// Flow:
//   1. Verify caller owns the recap
//   2. For each decision, update the staged item's decision field
//   3. For accepted items, write the payload to its target_table
//   4. Mark the recap 'confirmed'
//
// COLUMN MAPPING: the maps below translate the generic payload keys the
// extraction route produced into your real table columns. Adjust the right-hand
// values if your schema differs (see the schema query in the build notes).

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ── Column maps: payload key → real DB column ────────────────────────────────
// Verified against the live schema 2026-07-19.
const COLUMN_MAPS = {
  pet_vet_visits: {
    visit_date: "visit_date",
    clinic_name: "clinic_name",
    reason: "reason",
    diagnosis: "diagnosis",
    treatment: "treatment",
    cost: "cost",
    notes: "notes",
  },
  pet_medications: {
    medication_name: "medication_name",
    dosage: "dosage",
    frequency: "frequency",
    started_date: "started_date",
    ended_date: "ended_date",
    reason: "reason",
    notes: "notes",
  },
  pet_vaccinations: {
    vaccine_type: "vaccine_type",
    date_administered: "date_administered",
    next_due: "next_due",
    notes: "notes",
  },
  pet_weight_history: {
    weight: "weight",
    unit: "unit",
    measured_at: "measured_at",
    notes: "notes",
  },
};

function mapPayload(targetTable, payload, petId) {
  const map = COLUMN_MAPS[targetTable];
  if (!map) return null;
  const row = { pet_id: petId };
  for (const [payloadKey, dbColumn] of Object.entries(map)) {
    if (payload[payloadKey] != null && payload[payloadKey] !== "") {
      row[dbColumn] = payload[payloadKey];
    }
  }
  return row;
}

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
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { recapId, decisions } = body;

  if (!recapId || !Array.isArray(decisions)) {
    return NextResponse.json(
      { error: "recapId and decisions[] are required" },
      { status: 400 },
    );
  }

  // ── Verify recap ownership
  const { data: recap, error: recapError } = await supabaseAdmin
    .from("copilot_visit_recaps")
    .select("id, owner_id, pet_id")
    .eq("id", recapId)
    .maybeSingle();

  if (recapError || !recap) {
    return NextResponse.json({ error: "Recap not found" }, { status: 404 });
  }
  if (recap.owner_id !== user.id) {
    return NextResponse.json(
      { error: "You do not own this recap" },
      { status: 403 },
    );
  }

  const results = { written: 0, skipped: 0, errors: [] };

  // ── Load the staged items referenced by the decisions
  const stagedItemIds = decisions.map((d) => d.stagedItemId).filter(Boolean);
  const { data: stagedItems } = await supabaseAdmin
    .from("copilot_recap_staged_items")
    .select("*")
    .eq("recap_id", recapId)
    .in("id", stagedItemIds);

  const stagedById = new Map((stagedItems || []).map((s) => [s.id, s]));

  // ── Process each decision
  for (const decision of decisions) {
    const staged = stagedById.get(decision.stagedItemId);
    if (!staged) {
      results.errors.push(`Staged item ${decision.stagedItemId} not found`);
      continue;
    }

    if (decision.decision === "rejected") {
      await supabaseAdmin
        .from("copilot_recap_staged_items")
        .update({ decision: "rejected" })
        .eq("id", staged.id);
      results.skipped++;
      continue;
    }

    if (decision.decision !== "accepted") {
      results.skipped++;
      continue;
    }

    // Idempotency: skip already-written items
    if (staged.written_row_id || staged.decision === "accepted") {
      results.skipped++;
      continue;
    }

    // ── Services are informational only — they never write a row.
    // (Cost lives on the visit as the receipt total; treatment is the
    // clean summary. Services don't need their own record.)
    if (staged.target_table === "visit_service") {
      await supabaseAdmin
        .from("copilot_recap_staged_items")
        .update({ decision: "accepted" })
        .eq("id", staged.id);
      results.skipped++;
      continue;
    }

    // ── Write to the real table
    const row = mapPayload(staged.target_table, staged.payload, recap.pet_id);
    if (!row) {
      results.errors.push(`Unknown target table: ${staged.target_table}`);
      continue;
    }

    const { data: written, error: writeError } = await supabaseAdmin
      .from(staged.target_table)
      .insert(row)
      .select("id")
      .single();

    if (writeError) {
      results.errors.push(`${staged.display_label}: ${writeError.message}`);
      continue;
    }

    await supabaseAdmin
      .from("copilot_recap_staged_items")
      .update({
        decision: "accepted",
        written_row_id: written?.id ? String(written.id) : null,
      })
      .eq("id", staged.id);

    results.written++;
  }

  // ── Mark recap confirmed
  await supabaseAdmin
    .from("copilot_visit_recaps")
    .update({ status: "confirmed", updated_at: new Date().toISOString() })
    .eq("id", recapId);

  return NextResponse.json(results);
}
