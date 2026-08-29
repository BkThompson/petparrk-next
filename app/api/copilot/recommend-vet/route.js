// app/api/copilot/recommend-vet/route.js
//
// Track 3 Phase A — Vet recommendation from triage result.
//
// Input:
//   { symptomCheckId, petId, triageResult, differentials, userZip }
//
// Output:
//   { recommendationId, rankedVets: [...], reasoning }
//
// Flow:
//   1. Verify caller is authenticated and owns the pet
//   2. Return cached recommendation if one already exists for this check
//   3. Query candidate vets — prefer same zip, then same city, then anywhere
//      accepting new patients; emergency capability weighted heavily on
//      EMERGENCY triage
//   4. Ask Haiku 4.5 to rank the top candidates with one-line reasoning each
//   5. Persist and return

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CANDIDATE_LIMIT = 15; // fed to LLM
const RETURN_TOP = 3; // returned to user

export async function POST(request) {
  // ── Auth: any authenticated user (they're recommending for their own pet)
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
  const { symptomCheckId, petId, triageResult, differentials, userZip } = body;

  if (!symptomCheckId || !petId || !triageResult) {
    return NextResponse.json(
      {
        error: "Missing required fields: symptomCheckId, petId, triageResult",
      },
      { status: 400 },
    );
  }

  if (!["EMERGENCY", "SEE_VET", "MONITOR"].includes(triageResult)) {
    return NextResponse.json(
      { error: "triageResult must be EMERGENCY, SEE_VET, or MONITOR" },
      { status: 400 },
    );
  }

  // ── Verify the caller owns the referenced pet and check
  const { data: check, error: checkError } = await supabaseAdmin
    .from("symptom_checks")
    .select("id, owner_id, pet_id")
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
  if (check.pet_id !== petId) {
    return NextResponse.json(
      { error: "petId does not match symptom check" },
      { status: 400 },
    );
  }

  // ── Return cached recommendation if it exists
  const { data: existing } = await supabaseAdmin
    .from("copilot_vet_recommendations")
    .select("*")
    .eq("symptom_check_id", symptomCheckId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      recommendationId: existing.id,
      rankedVets: existing.ranked_vets,
      cached: true,
    });
  }

  // ── Get user's zip from profile if not provided
  let effectiveZip = userZip;
  if (!effectiveZip) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("zip_code")
      .eq("id", user.id)
      .maybeSingle();
    effectiveZip = profile?.zip_code || null;
  }

  // ── Fetch pet context for the reasoning step
  const { data: pet, error: petError } = await supabaseAdmin
    .from("pets")
    .select("*")
    .eq("id", petId)
    .maybeSingle();

  if (petError) {
    console.error("recommend-vet: pet lookup error", petError);
    return NextResponse.json(
      { error: `Pet lookup failed: ${petError.message}` },
      { status: 500 },
    );
  }
  if (!pet) {
    return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  }

  // ── Query candidate vets, ordered by proximity heuristic
  // Only active vets. For EMERGENCY, we'd prefer vets with emergency capability
  // (not yet in schema explicitly, so we look at vet_type array).
  const candidateSelect =
    "id, slug, name, phone, city, zip_code, address, hours, accepting_new_patients, carecredit, vet_type";

  let candidates = [];

  // For exotic pets (not dog/cat), prefetch specialty vets first — they may be
  // outside the user's zip but are more relevant than a nearby general practice.
  const petSpecies = (pet.species || "").toLowerCase();
  const isExoticPet =
    petSpecies &&
    !["dog", "cat", "puppy", "kitten", "canine", "feline"].some((s) =>
      petSpecies.includes(s),
    );

  if (isExoticPet) {
    // Match specialty vets by common labels found on the vets.vet_type column.
    // Use overlap query: any element of vet_type intersecting these labels.
    const specialtyLabels = [
      "Avian",
      "Exotic",
      "Bird",
      "Reptile",
      "Small Mammal",
      "Fish",
    ];
    const { data: specialty } = await supabaseAdmin
      .from("vets")
      .select(candidateSelect)
      .eq("status", "active")
      .overlaps("vet_type", specialtyLabels)
      .limit(8);
    if (specialty) {
      candidates = specialty.map((v) => ({
        ...v,
        distance_bucket:
          effectiveZip && v.zip_code === effectiveZip
            ? "same_zip"
            : effectiveZip &&
                v.zip_code?.startsWith(effectiveZip.substring(0, 3))
              ? "nearby"
              : "unknown",
      }));
    }
  }

  if (effectiveZip && candidates.length < CANDIDATE_LIMIT) {
    const excludeIds = candidates.map((c) => c.id);
    let query = supabaseAdmin
      .from("vets")
      .select(candidateSelect)
      .eq("status", "active")
      .eq("zip_code", effectiveZip)
      .limit(CANDIDATE_LIMIT - candidates.length);
    if (excludeIds.length > 0)
      query = query.not("id", "in", `(${excludeIds.join(",")})`);
    const { data: sameZip } = await query;
    if (sameZip) {
      candidates = candidates.concat(
        sameZip.map((v) => ({ ...v, distance_bucket: "same_zip" })),
      );
    }
  }

  if (candidates.length < CANDIDATE_LIMIT && effectiveZip) {
    // Same 3-digit zip prefix = nearby
    const zipPrefix = effectiveZip.substring(0, 3);
    const excludeIds = candidates.map((c) => c.id);
    let query = supabaseAdmin
      .from("vets")
      .select(candidateSelect)
      .eq("status", "active")
      .like("zip_code", `${zipPrefix}%`)
      .neq("zip_code", effectiveZip)
      .limit(CANDIDATE_LIMIT - candidates.length);
    if (excludeIds.length > 0)
      query = query.not("id", "in", `(${excludeIds.join(",")})`);
    const { data: nearby } = await query;
    if (nearby) {
      candidates = candidates.concat(
        nearby.map((v) => ({ ...v, distance_bucket: "nearby" })),
      );
    }
  }

  if (candidates.length < CANDIDATE_LIMIT) {
    const excludeIds = candidates.map((c) => c.id);
    let query = supabaseAdmin
      .from("vets")
      .select(candidateSelect)
      .eq("status", "active")
      .limit(CANDIDATE_LIMIT - candidates.length);
    if (excludeIds.length > 0)
      query = query.not("id", "in", `(${excludeIds.join(",")})`);
    const { data: any } = await query;
    if (any) {
      candidates = candidates.concat(
        any.map((v) => ({ ...v, distance_bucket: "unknown" })),
      );
    }
  }

  if (candidates.length === 0) {
    return NextResponse.json({
      recommendationId: null,
      rankedVets: [],
      message: "No active vets found in the directory yet.",
    });
  }

  // ── Ask Haiku to rank
  const prompt = buildRankingPrompt({
    pet,
    triageResult,
    differentials: differentials || [],
    userZip: effectiveZip,
    candidates,
  });

  let rankedVets = [];
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content[0].text;
    rankedVets = parseRankingResponse(text, candidates);
  } catch (err) {
    // Fall back to simple deterministic ranking if the LLM call fails
    console.error("Recommendation LLM error:", err.message);
    rankedVets = simpleFallbackRanking(candidates, triageResult);
  }

  // Keep top N
  rankedVets = rankedVets.slice(0, RETURN_TOP);

  // Attach fit_signal to each ranked vet (species mismatch, severity mismatch)
  // The candidate rows have the extra fields we need — look them up by id.
  const candidateById = new Map(candidates.map((c) => [c.id, c]));
  rankedVets = rankedVets.map((v) => {
    const cand = candidateById.get(v.vet_id);
    return {
      ...v,
      fit_signal: computeFitSignal({
        vet: cand || v,
        pet,
        triageResult,
      }),
    };
  });

  // ── Persist
  const { data: saved, error: saveError } = await supabaseAdmin
    .from("copilot_vet_recommendations")
    .insert({
      symptom_check_id: symptomCheckId,
      pet_id: petId,
      owner_id: user.id,
      triage_result: triageResult,
      differentials: differentials || [],
      user_zip: effectiveZip,
      ranked_vets: rankedVets,
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
    recommendationId: saved.id,
    rankedVets,
    cached: false,
  });
}

function buildRankingPrompt({
  pet,
  triageResult,
  differentials,
  userZip,
  candidates,
}) {
  const petBits = [];
  if (pet.name) petBits.push(pet.name);
  if (pet.species) petBits.push(pet.species);
  if (pet.breed) petBits.push(pet.breed);
  if (pet.birthday) petBits.push(`born ${pet.birthday}`);
  if (pet.sex) petBits.push(pet.sex);

  const differentialsText =
    differentials.length > 0
      ? differentials.join(", ")
      : "no specific differentials";

  const candidateList = candidates
    .map((c, i) => {
      const parts = [`${i + 1}. ${c.name}`];
      if (c.vet_type && c.vet_type.length > 0)
        parts.push(`type: ${c.vet_type.join("/")}`);
      if (c.city) parts.push(`city: ${c.city}`);
      if (c.zip_code) parts.push(`zip: ${c.zip_code}`);
      if (c.distance_bucket)
        parts.push(`proximity: ${c.distance_bucket.replace(/_/g, " ")}`);
      if (c.accepting_new_patients === true)
        parts.push("accepting new patients");
      if (c.accepting_new_patients === false)
        parts.push("NOT accepting new patients");
      if (c.carecredit === true) parts.push("accepts CareCredit");
      return `- ${parts.join(", ")}`;
    })
    .join("\n");

  // Species-specialty guidance — critical for non-dog/cat pets
  const species = (pet.species || "").toLowerCase();
  const isExotic =
    species &&
    !["dog", "cat", "puppy", "kitten", "canine", "feline"].some((s) =>
      species.includes(s),
    );
  const speciesSpecialty = isExotic
    ? `\n\nIMPORTANT: This pet is a ${pet.species}, not a dog or cat. General practice vets often do not treat non-cat/dog species. STRONGLY PREFER any candidate whose vet_type includes "Avian", "Exotic", "Bird", "Reptile", or a specialty matching this species. Only fall back to general practice if no specialty vet is available, and note that limitation in your reasoning.`
    : "";

  const priorityGuidance =
    triageResult === "EMERGENCY"
      ? "This is an EMERGENCY. Prioritize any vet whose type includes 'Emergency' or 'Urgent Care'. Distance matters. Accepting new patients matters less because emergencies are usually seen regardless."
      : triageResult === "SEE_VET"
        ? "This is a SEE_VET case (not emergency, but needs professional attention soon). Prioritize accepting new patients, then proximity, then general practice."
        : "This is a MONITOR case (may not need a vet visit). Show general practice options nearby the user may want to save for later.";

  return `You are ranking veterinary clinics for a pet owner. Pick the top 3 and give a one-sentence reason for each.

PET: ${petBits.join(", ")}
${pet.allergies ? `ALLERGIES: ${pet.allergies}` : ""}
${pet.medical_conditions ? `CONDITIONS: ${pet.medical_conditions}` : ""}

TRIAGE RESULT: ${triageResult}
LIKELY ISSUES: ${differentialsText}
USER LOCATION: zip ${userZip || "unknown"}

${priorityGuidance}${speciesSpecialty}

CANDIDATE CLINICS:
${candidateList}

Respond in this exact JSON format, nothing else:
{
  "ranked": [
    { "index": <number from candidate list>, "reasoning": "one short sentence why this vet fits" },
    { "index": <number from candidate list>, "reasoning": "..." },
    { "index": <number from candidate list>, "reasoning": "..." }
  ]
}`;
}

function parseRankingResponse(text, candidates) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return simpleFallbackRanking(candidates);

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return simpleFallbackRanking(candidates);
  }

  const ranked = [];
  const seenIds = new Set();
  for (const item of parsed.ranked || []) {
    const idx = (item.index || 0) - 1;
    if (idx < 0 || idx >= candidates.length) continue;
    const c = candidates[idx];
    if (seenIds.has(c.id)) continue;
    seenIds.add(c.id);
    ranked.push({
      vet_id: c.id,
      vet_slug: c.slug,
      name: c.name,
      rank: ranked.length + 1,
      reasoning: item.reasoning || "",
      accepting_new_patients: c.accepting_new_patients,
      distance_bucket: c.distance_bucket,
      city: c.city,
      phone: c.phone,
    });
    if (ranked.length >= RETURN_TOP) break;
  }

  if (ranked.length === 0) return simpleFallbackRanking(candidates);
  return ranked;
}

function simpleFallbackRanking(candidates, triageResult) {
  // Deterministic backup: prefer same_zip → accepting → any
  const scored = candidates.map((c) => {
    let score = 0;
    if (c.distance_bucket === "same_zip") score += 30;
    else if (c.distance_bucket === "nearby") score += 15;
    if (c.accepting_new_patients === true) score += 20;
    if (
      triageResult === "EMERGENCY" &&
      c.vet_type &&
      c.vet_type.some((t) => /emerg|urgent/i.test(t))
    ) {
      score += 50;
    }
    return { c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, RETURN_TOP).map((s, i) => ({
    vet_id: s.c.id,
    vet_slug: s.c.slug,
    name: s.c.name,
    rank: i + 1,
    reasoning: "Selected based on proximity and availability",
    accepting_new_patients: s.c.accepting_new_patients,
    distance_bucket: s.c.distance_bucket,
    city: s.c.city,
    phone: s.c.phone,
  }));
}

// ── Fit signal computation ────────────────────────────────────────────────────
// Returns { label, tooltip, kind } if the vet has a meaningful mismatch with
// the pet's needs, or null if fit is fine.
//
// Priority (only ONE badge shown per vet):
//   1. Severity mismatch — EMERGENCY triage + not an emergency clinic
//   2. Species mismatch — exotic pet + no matching specialty in vet_type
//
// This is NOT about data completeness. It's about whether this vet is likely
// to actually treat the presenting issue vs. refer.
function computeFitSignal({ vet, pet, triageResult }) {
  if (!vet) return null;

  const vetTypes = Array.isArray(vet.vet_type)
    ? vet.vet_type.map((t) => (t || "").toLowerCase())
    : [];

  // ── Priority 1: Severity mismatch (emergency triage + non-emergency clinic)
  if (triageResult === "EMERGENCY") {
    const hasEmergencyCapability = vetTypes.some((t) =>
      /emerg|urgent|24/i.test(t),
    );
    if (!hasEmergencyCapability) {
      return {
        kind: "severity_mismatch",
        label: "Not an emergency clinic — call first",
        tooltip:
          "This clinic is a general practice. For emergencies, call ahead to confirm they can see your pet or ask for an emergency referral.",
      };
    }
  }

  // ── Priority 2: Species mismatch (exotic pet + no matching specialty)
  const petSpecies = (pet?.species || "").toLowerCase();
  const isDogOrCat =
    petSpecies &&
    ["dog", "cat", "puppy", "kitten", "canine", "feline"].some((s) =>
      petSpecies.includes(s),
    );

  if (petSpecies && !isDogOrCat) {
    // Map pet species → specialty terms we'd want in vet_type
    const speciesSpecialtyMap = {
      bird: ["avian", "bird", "exotic"],
      parrot: ["avian", "bird", "exotic"],
      cockatiel: ["avian", "bird", "exotic"],
      finch: ["avian", "bird", "exotic"],
      reptile: ["reptile", "exotic"],
      snake: ["reptile", "exotic"],
      lizard: ["reptile", "exotic"],
      turtle: ["reptile", "exotic"],
      tortoise: ["reptile", "exotic"],
      rabbit: ["small mammal", "exotic"],
      "guinea pig": ["small mammal", "exotic"],
      hamster: ["small mammal", "exotic"],
      ferret: ["small mammal", "exotic"],
      hedgehog: ["small mammal", "exotic"],
      fish: ["fish", "aquatic", "exotic"],
    };

    // Find matching specialty terms for this pet's species
    let specialtyTerms = null;
    for (const [key, terms] of Object.entries(speciesSpecialtyMap)) {
      if (petSpecies.includes(key)) {
        specialtyTerms = terms;
        break;
      }
    }

    // If we don't know what specialty they'd need, treat as generic exotic
    if (!specialtyTerms) specialtyTerms = ["exotic"];

    const hasMatchingSpecialty = vetTypes.some((vt) =>
      specialtyTerms.some((term) => vt.includes(term)),
    );

    if (!hasMatchingSpecialty) {
      const speciesLabel = pet.species; // preserve original casing for display
      return {
        kind: "species_mismatch",
        label: `May refer for ${speciesLabel.toLowerCase()} care`,
        tooltip: `This clinic is a general practice and may not treat ${speciesLabel.toLowerCase()}s directly. They may recommend a specialty clinic. The cost estimate reflects a standard exam only.`,
      };
    }
  }

  return null;
}
