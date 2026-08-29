// app/api/copilot/visit-prep/route.js
//
// Track 3 Phase B — Generate pre-visit prep.
//
// Input:
//   { petId, symptomCheckId?, visitReason?, triageResult?, differentials?, scheduledDate? }
//
// Output:
//   { visitPrepId, prepContent }
//
// Works two ways:
//   1. From a triage — pass symptomCheckId, triageResult, differentials
//   2. Standalone checkup — pass visitReason (e.g. "Annual checkup"), no triage
//
// Flow:
//   1. Verify caller owns the pet
//   2. If a symptomCheckId is given, verify ownership + pull differentials
//   3. Return existing active prep for this check/pet if present (avoid dupes)
//   4. Ask Haiku to generate structured prep content
//   5. Persist + return

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
    petId,
    symptomCheckId,
    visitReason,
    triageResult,
    differentials,
    scheduledDate,
  } = body;

  if (!petId) {
    return NextResponse.json({ error: "petId is required" }, { status: 400 });
  }

  // ── Verify pet ownership
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
    return NextResponse.json(
      { error: "You do not own this pet" },
      { status: 403 },
    );
  }

  // ── If from a symptom check, verify + pull data
  let effectiveDifferentials = differentials || [];
  let effectiveTriage = triageResult || null;
  let effectiveReason = visitReason || null;

  if (symptomCheckId) {
    const { data: check } = await supabaseAdmin
      .from("symptom_checks")
      .select("id, owner_id, pet_id, triage_result, differentials")
      .eq("id", symptomCheckId)
      .maybeSingle();

    if (!check || check.owner_id !== user.id) {
      return NextResponse.json(
        { error: "Symptom check not found or not owned" },
        { status: 404 },
      );
    }
    effectiveDifferentials = check.differentials || effectiveDifferentials;
    effectiveTriage = check.triage_result || effectiveTriage;
    if (!effectiveReason) {
      effectiveReason =
        effectiveDifferentials.length > 0
          ? effectiveDifferentials[0]
          : "Health concern";
    }

    // Return existing active prep for this check (avoid duplicates)
    const { data: existing } = await supabaseAdmin
      .from("copilot_visit_prep")
      .select("*")
      .eq("symptom_check_id", symptomCheckId)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        visitPrepId: existing.id,
        prepContent: existing.prep_content,
        cached: true,
      });
    }
  }

  if (!effectiveReason) effectiveReason = "Checkup";

  // ── Generate prep content
  const prompt = buildPrepPrompt({
    pet,
    visitReason: effectiveReason,
    triageResult: effectiveTriage,
    differentials: effectiveDifferentials,
  });

  let prepContent = {};
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });
    prepContent = parsePrepResponse(response.content[0].text);
  } catch (err) {
    console.error("visit-prep LLM error:", err.message);
    prepContent = fallbackPrep(effectiveReason);
  }

  // ── Persist
  const { data: saved, error: saveError } = await supabaseAdmin
    .from("copilot_visit_prep")
    .insert({
      pet_id: petId,
      owner_id: user.id,
      symptom_check_id: symptomCheckId || null,
      visit_reason: effectiveReason,
      triage_result: effectiveTriage,
      differentials: effectiveDifferentials,
      prep_content: prepContent,
      scheduled_date: scheduledDate || null,
      reasoning_model: "claude-haiku-4-5",
    })
    .select("id")
    .single();

  if (saveError) {
    return NextResponse.json(
      { error: `Failed to save: ${saveError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    visitPrepId: saved.id,
    prepContent,
    cached: false,
  });
}

function buildPrepPrompt({ pet, visitReason, triageResult, differentials }) {
  const petBits = [];
  if (pet.name) petBits.push(pet.name);
  if (pet.species) petBits.push(pet.species);
  if (pet.breed) petBits.push(pet.breed);
  if (pet.birthday) petBits.push(`born ${pet.birthday}`);

  const diffText =
    differentials && differentials.length > 0
      ? differentials.join(", ")
      : "none specified";

  const triageText = triageResult
    ? `Triage result was ${triageResult}.`
    : "This is a routine or user-initiated visit (no triage).";

  return `You are helping a pet owner prepare for a vet visit. Generate practical, specific prep content.

PET: ${petBits.join(", ")}
${pet.allergies ? `ALLERGIES: ${pet.allergies}` : ""}
${pet.medical_conditions ? `EXISTING CONDITIONS: ${pet.medical_conditions}` : ""}
VISIT REASON: ${visitReason}
LIKELY ISSUES: ${diffText}
${triageText}

Generate prep content as JSON. Be specific to this pet and reason — not generic. Keep each item short and scannable.

Rules:
- questions_to_ask: 3-5 specific questions the owner should ask the vet. IMPORTANT: at least one question MUST cover home care after the visit — what to watch for at home and how to know if the pet is NOT improving (e.g. "What symptoms mean I should come back or call?"). This is high-value and often forgotten.
- symptoms_to_mention: 2-4 things about the pet's condition worth flagging (only if relevant; empty array if routine). Separate stating known facts from observations to make before going where possible.
- what_to_bring: 2-4 practical items (records, current meds, a stool/urine sample only if GI/urinary, etc.). If the visit may involve tests or a procedure, include a note to call ahead about whether the pet should eat beforehand (fasting).
- what_to_expect: 1-2 sentences on what the visit might involve. Do NOT promise outcomes. Do NOT give absolute cost claims.
- cost_note: 1 sentence, general. Do NOT invent specific prices. Something like "Ask for an estimate before any tests or procedures, and share your budget so the vet can prioritize."

Respond with ONLY this JSON, nothing else:
{
  "questions_to_ask": ["...", "..."],
  "symptoms_to_mention": ["...", "..."],
  "what_to_bring": ["...", "..."],
  "what_to_expect": "...",
  "cost_note": "..."
}`;
}

function parsePrepResponse(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return fallbackPrep();
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      questions_to_ask: Array.isArray(parsed.questions_to_ask)
        ? parsed.questions_to_ask
        : [],
      symptoms_to_mention: Array.isArray(parsed.symptoms_to_mention)
        ? parsed.symptoms_to_mention
        : [],
      what_to_bring: Array.isArray(parsed.what_to_bring)
        ? parsed.what_to_bring
        : [],
      what_to_expect:
        typeof parsed.what_to_expect === "string" ? parsed.what_to_expect : "",
      cost_note: typeof parsed.cost_note === "string" ? parsed.cost_note : "",
    };
  } catch {
    return fallbackPrep();
  }
}

function fallbackPrep(visitReason) {
  return {
    questions_to_ask: [
      "What is the most likely cause of the symptoms?",
      "What tests do you recommend, and what will they tell us?",
      "What are the treatment options and their costs?",
      "What should I watch for at home, and how will I know if my pet isn't getting better?",
    ],
    symptoms_to_mention: [],
    what_to_bring: [
      "Any current medications or supplements",
      "Records of past visits or vaccinations",
      "A list of symptoms and when they started",
    ],
    what_to_expect:
      "The vet will examine your pet and may recommend tests to narrow down the cause. Bring your questions so nothing gets missed.",
    cost_note:
      "Ask for an estimate before agreeing to any tests or procedures, and share your budget so the vet can prioritize.",
  };
}
