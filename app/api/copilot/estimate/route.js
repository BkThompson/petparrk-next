// app/api/copilot/estimate/route.js
//
// Track 3 Phase A — Cost estimate for a specific vet given differentials.
//
// Input:
//   { recommendationId?, symptomCheckId, petId, vetId, differentials }
//
// Output:
//   { estimateId, estimateLow, estimateHigh, confidence, reasoning }
//
// Flow:
//   1. Verify caller owns the pet
//   2. Return cached estimate if one exists for (symptomCheckId, vetId)
//   3. Map differentials → likely services (heuristic based on differential
//      keywords, tunable over time)
//   4. Look up vet_prices for the mapped services
//   5. Ask Haiku for a plain-English cost estimate range + confidence
//   6. Persist and return

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Differential → service mapping (heuristic, tunable) ──────────────────────
// This is Phase A's first cut. Over time, extract to a config table so it can
// be tuned without a code deploy. Keys are lowercase substrings; values are
// service names that appear in the `services` table.
const DIFFERENTIAL_TO_SERVICES = {
  vomit: ["Doctor Exam", "Bloodwork", "X-Ray"],
  diarrhea: ["Doctor Exam", "Bloodwork"],
  gastroenteritis: ["Doctor Exam", "Bloodwork"],
  "foreign body": ["Doctor Exam", "X-Ray", "Anesthesia"],
  "ear infection": ["Doctor Exam"],
  "skin infection": ["Doctor Exam"],
  allergy: ["Doctor Exam"],
  allergies: ["Doctor Exam"],
  dental: ["Dental Cleaning", "Doctor Exam"],
  "tooth pain": ["Dental Cleaning", "Doctor Exam"],
  limping: ["Doctor Exam", "X-Ray"],
  fracture: ["Doctor Exam", "X-Ray", "Anesthesia"],
  "urinary tract infection": ["Doctor Exam", "Bloodwork"],
  uti: ["Doctor Exam", "Bloodwork"],
  "kidney disease": ["Doctor Exam", "Bloodwork"],
  bloat: ["Emergency Visit", "X-Ray", "Bloodwork"],
  "hit by car": ["Emergency Visit", "X-Ray", "Anesthesia"],
  hbc: ["Emergency Visit", "X-Ray", "Anesthesia"],
  seizure: ["Emergency Visit", "Bloodwork"],
  poisoning: ["Emergency Visit", "Bloodwork"],
  ingestion: ["Emergency Visit", "X-Ray", "Bloodwork"],
  parvo: ["Emergency Visit", "Bloodwork"],
};

const DEFAULT_SERVICES_FOR_TRIAGE = {
  EMERGENCY: ["Emergency Visit", "X-Ray", "Bloodwork"],
  SEE_VET: ["Doctor Exam"],
  MONITOR: ["Doctor Exam"],
};

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
  const {
    recommendationId,
    symptomCheckId,
    petId,
    vetId,
    pendingVetId,
    differentials,
  } = body;

  if (!symptomCheckId || !petId || (!vetId && !pendingVetId)) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: symptomCheckId, petId, and either vetId or pendingVetId",
      },
      { status: 400 },
    );
  }

  // ── Verify ownership through the symptom check
  const { data: check, error: checkError } = await supabaseAdmin
    .from("symptom_checks")
    .select("id, owner_id, pet_id, triage_result")
    .eq("id", symptomCheckId)
    .maybeSingle();

  if (checkError || !check) {
    return NextResponse.json(
      { error: "Symptom check not found" },
      { status: 404 },
    );
  }
  if (check.owner_id !== user.id) {
    return NextResponse.json(
      { error: "You do not own this symptom check" },
      { status: 403 },
    );
  }

  // ── Return cached estimate
  const cachedQuery = supabaseAdmin
    .from("copilot_cost_estimates")
    .select("*")
    .eq("symptom_check_id", symptomCheckId);
  if (vetId) cachedQuery.eq("vet_id", vetId);
  else cachedQuery.eq("pending_vet_id", pendingVetId);
  const { data: existing } = await cachedQuery.maybeSingle();

  if (existing) {
    return NextResponse.json({
      estimateId: existing.id,
      estimateLow: existing.estimate_low,
      estimateHigh: existing.estimate_high,
      confidence: existing.confidence,
      reasoning: existing.reasoning,
      cached: true,
    });
  }

  // ── Map differentials to service names
  const diffs = (differentials || []).map((d) => d.toLowerCase());
  const triageDefault = DEFAULT_SERVICES_FOR_TRIAGE[check.triage_result] || [
    "Doctor Exam",
  ];

  const matchedServiceNames = new Set(triageDefault);
  for (const diff of diffs) {
    for (const [needle, services] of Object.entries(DIFFERENTIAL_TO_SERVICES)) {
      if (diff.includes(needle)) {
        services.forEach((s) => matchedServiceNames.add(s));
      }
    }
  }

  // ── Look up service IDs
  const { data: services } = await supabaseAdmin
    .from("services")
    .select("id, name")
    .in("name", Array.from(matchedServiceNames));

  const serviceIds = (services || []).map((s) => s.id);

  if (serviceIds.length === 0) {
    return NextResponse.json({
      estimateId: null,
      estimateLow: null,
      estimateHigh: null,
      confidence: "low",
      reasoning:
        "Could not map likely services for this issue. Recommend calling the clinic for a quote.",
    });
  }

  // ── Look up prices at this vet
  const priceQuery = supabaseAdmin
    .from("vet_prices")
    .select(
      "service_id, price_low, price_high, price_type, call_for_quote, services(name)",
    )
    .in("service_id", serviceIds);
  if (vetId) priceQuery.eq("vet_id", vetId);
  else priceQuery.eq("pending_vet_id", pendingVetId);
  const { data: prices } = await priceQuery;

  const availablePrices = (prices || []).filter(
    (p) => !p.call_for_quote && p.price_low != null,
  );

  if (availablePrices.length === 0) {
    return NextResponse.json({
      estimateId: null,
      estimateLow: null,
      estimateHigh: null,
      confidence: "low",
      reasoning:
        "This clinic hasn't published prices for the services likely needed. Call for a quote.",
    });
  }

  // ── Simple range math + Haiku for the plain-English reasoning
  const totalLow = availablePrices.reduce(
    (sum, p) => sum + Number(p.price_low),
    0,
  );
  const totalHigh = availablePrices.reduce(
    (sum, p) => sum + Number(p.price_high ?? p.price_low),
    0,
  );

  const coverage = availablePrices.length / matchedServiceNames.size;
  const confidence =
    coverage >= 0.75 ? "high" : coverage >= 0.4 ? "medium" : "low";

  // Ask Haiku for a plain-English summary
  const summary = availablePrices
    .map((p) => {
      const svc = p.services?.name || `service ${p.service_id}`;
      const range =
        p.price_high && p.price_high !== p.price_low
          ? `$${Number(p.price_low)}–$${Number(p.price_high)}`
          : `$${Number(p.price_low)}`;
      return `${svc}: ${range}`;
    })
    .join("; ");

  let reasoning = `A typical visit at this clinic runs around $${Math.round(totalLow)}${totalHigh !== totalLow ? `–$${Math.round(totalHigh)}` : ""} for the services usually involved.`;

  try {
    const llmRes = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `You are writing 1-2 sentences to help a pet owner understand a cost estimate at a specific vet clinic. Be professional, warm, and grounded — like a real person wrote it for a real person in an anxious moment. Not cheerful, not clinical.

STRICT RULES — violating these breaks the product:
- Do NOT reference where the pricing came from. Never say "prices this clinic shared", "based on data we have", "based on our records", "we called and asked", or anything that reveals sourcing.
- Do NOT use "affordable", "simple", "straightforward", "easy", "quick", "cheap", or minimizing words.
- Do NOT say "that's the only cost", "just $X", "only", or make absolute promises. The vet may recommend additional tests, medications, or follow-up care after examining the pet.
- Do NOT tell the user to "take a breath" or use overly cheerful language.
- Do NOT exaggerate or minimize the cost.
- Prefer "most owners pay" or "typically costs" over "estimates suggest" — sounds more human.
- If the estimate could be misleading (low confidence internally), acknowledge that the final cost depends on what the vet finds. Frame it warmly, not clinically.

Services included in the estimate: ${summary}
Estimated total: $${Math.round(totalLow)}${totalHigh !== totalLow ? `–$${Math.round(totalHigh)}` : ""}
Internal confidence: ${confidence}

Respond with ONLY the explanation, no preamble.`,
        },
      ],
    });
    reasoning = llmRes.content[0].text.trim();
  } catch (err) {
    console.error("Estimate reasoning LLM error:", err.message);
    // Keep deterministic reasoning as fallback
  }

  // ── Persist
  const insertPayload = {
    recommendation_id: recommendationId || null,
    symptom_check_id: symptomCheckId,
    pet_id: petId,
    owner_id: user.id,
    differentials: differentials || [],
    service_ids: serviceIds,
    estimate_low: Math.round(totalLow),
    estimate_high: Math.round(totalHigh),
    confidence,
    reasoning,
  };
  if (vetId) insertPayload.vet_id = vetId;
  else insertPayload.pending_vet_id = pendingVetId;

  const { data: saved, error: saveError } = await supabaseAdmin
    .from("copilot_cost_estimates")
    .insert(insertPayload)
    .select("id")
    .single();

  if (saveError) {
    return NextResponse.json(
      { error: `Failed to save: ${saveError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    estimateId: saved.id,
    estimateLow: Math.round(totalLow),
    estimateHigh: Math.round(totalHigh),
    confidence,
    reasoning,
    cached: false,
  });
}
