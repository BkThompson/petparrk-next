// app/api/copilot/visit-recap/route.js
//
// Track 3 Phase B — Post-visit recap extraction.
//
// Input (JSON):
//   {
//     petId,
//     visitPrepId?,          // optional link back to the prep
//     inputMethod: 'typed' | 'photo' | 'pdf',
//     rawInput?,             // typed text (when inputMethod === 'typed')
//     documentBase64?,       // base64 image/pdf (when photo/pdf)
//     documentMediaType?,    // e.g. 'image/jpeg', 'application/pdf'
//     documentUrl?           // optional storage path if already uploaded
//   }
//
// Output:
//   { recapId, plainSummary, extracted, stagedItems }
//
// Flow:
//   1. Verify caller owns the pet
//   2. Build a Claude message — text for typed, vision for photo/pdf
//   3. Claude returns plain-English summary + structured extraction
//   4. Create the recap row (status 'draft')
//   5. Create staged items (one per extracted medication/visit/vaccination)
//   6. Return everything for the confirm UI
//
// Nothing writes to pet_medications / pet_vet_visits here — that happens only
// after the user confirms, in the confirm route.

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
    visitPrepId,
    inputMethod,
    rawInput,
    documentBase64,
    documentMediaType,
    documentUrl,
  } = body;

  if (!petId || !inputMethod) {
    return NextResponse.json(
      { error: "petId and inputMethod are required" },
      { status: 400 },
    );
  }
  if (!["typed", "photo", "pdf"].includes(inputMethod)) {
    return NextResponse.json(
      { error: "inputMethod must be typed, photo, or pdf" },
      { status: 400 },
    );
  }
  if (inputMethod === "typed" && !rawInput) {
    return NextResponse.json(
      { error: "rawInput is required for typed recaps" },
      { status: 400 },
    );
  }
  if ((inputMethod === "photo" || inputMethod === "pdf") && !documentBase64) {
    return NextResponse.json(
      { error: "documentBase64 is required for photo/pdf recaps" },
      { status: 400 },
    );
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

  // ── Build the Claude message content
  const instruction = buildExtractionInstruction(pet);

  let messageContent;
  if (inputMethod === "typed") {
    messageContent = [
      { type: "text", text: `${instruction}\n\nVISIT NOTES:\n${rawInput}` },
    ];
  } else {
    // Vision path — image or PDF
    const isPdf =
      inputMethod === "pdf" || documentMediaType === "application/pdf";
    messageContent = [
      { type: "text", text: instruction },
      isPdf
        ? {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: documentBase64,
            },
          }
        : {
            type: "image",
            source: {
              type: "base64",
              media_type: documentMediaType || "image/jpeg",
              data: documentBase64,
            },
          },
    ];
  }

  // ── Call Claude
  let extractionResult;
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: messageContent }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    extractionResult = parseExtraction(textBlock ? textBlock.text : "");
  } catch (err) {
    console.error("visit-recap extraction error:", err.message);
    return NextResponse.json(
      { error: "Could not read the visit information. Please try again." },
      { status: 500 },
    );
  }

  // ── Create the recap row (draft)
  const { data: recap, error: recapError } = await supabaseAdmin
    .from("copilot_visit_recaps")
    .insert({
      pet_id: petId,
      owner_id: user.id,
      visit_prep_id: visitPrepId || null,
      input_method: inputMethod,
      raw_input: inputMethod === "typed" ? rawInput : null,
      document_url: documentUrl || null,
      plain_summary: extractionResult.plain_summary || null,
      extracted: extractionResult,
      visit_date: extractionResult.visit_date || null,
      vet_name: extractionResult.vet_name || null,
      reasoning_model: "claude-haiku-4-5",
    })
    .select("id")
    .single();

  if (recapError) {
    return NextResponse.json(
      { error: `Failed to save recap: ${recapError.message}` },
      { status: 500 },
    );
  }

  // ── Build staged items from the extraction
  const stagedRows = buildStagedItems({
    extracted: extractionResult,
    recapId: recap.id,
    petId,
    ownerId: user.id,
  });

  let stagedItems = [];
  if (stagedRows.length > 0) {
    const { data: inserted, error: stageError } = await supabaseAdmin
      .from("copilot_recap_staged_items")
      .insert(stagedRows)
      .select("*");
    if (stageError) {
      console.error("staged items insert error:", stageError.message);
      // Return the error so the client can show it rather than silently
      // reporting "no records to add".
      return NextResponse.json(
        {
          recapId: recap.id,
          plainSummary: extractionResult.plain_summary || "",
          extracted: extractionResult,
          stagedItems: [],
          stagingError: stageError.message,
        },
        { status: 200 },
      );
    }
    stagedItems = inserted || [];
  }

  return NextResponse.json({
    recapId: recap.id,
    plainSummary: extractionResult.plain_summary || "",
    extracted: extractionResult,
    stagedItems,
  });
}

function buildExtractionInstruction(pet) {
  return `You are helping a pet owner understand and record what happened at their pet's vet visit. The pet is ${pet.name || "their pet"}${pet.species ? `, a ${pet.species}` : ""}.

You will receive either typed notes or a document (receipt, invoice, or discharge paper). Do two things:

1. Write a warm, plain-English summary of the visit — what happened, what it means, in language a non-medical owner understands. Translate any jargon. Do not add information that isn't present. Do not give absolute promises about outcomes. 2-4 sentences.

2. Extract structured data. Be COMPLETE — capture every billable line item you can find. Do NOT invent dosages, dates, or prices. If something isn't present, omit it or use null.

CRITICAL extraction rules:
- medications: capture EVERY drug, injection, or prescription. This includes injectables like Cytopoint, oral meds, topicals, flea/tick/heartworm preventatives (e.g. Simparica, NexGard), and anything with a dosage or "(Per Inj)"/"INJ"/"mg" marker. Do not miss injections — they are medications, not services.
  - For the medication "name", give the CLEAN drug name and strength only (e.g. "Simparica Trio 48mg", "Cytopoint 80mg"). STRIP packaging/size/species qualifiers like "K9", "20-40kg (44.1-88lb)", "CHEW", "(Per Box)", "Per Injection". Put the dosage/strength in the "dosage" field.
- vaccinations: capture EVERY vaccine (Rabies, Bordetella, Leptospirosis, Canine Influenza, DA2PP, etc.). Give a clean vaccine name.
- services: capture every other billable line — exams, consultations, lab tests (cytology, fecal, bloodwork panels, UPC), imaging, procedures. Include the price. Skip $0.00 administrative lines like "Charges Complete" or "No Treatment Progress Exam Needed".
- receipt_total: the ACTUAL invoice/receipt total amount paid (look for "Total", "Invoice Total", "Amount Paid", "Paid to Date"). This is the real amount charged — not a sum you calculate. Use the number only.
- treatment: write a CLEAN plain-English summary of what was done at the visit (e.g. "Annual wellness exam with senior bloodwork, urinalysis, and vaccines"). Do NOT just concatenate receipt line items.
- A line is a MEDICATION if it's a drug given or dispensed. A line is a SERVICE if it's an exam, test, lab, or procedure. When unsure, put vaccines in vaccinations, drugs in medications, everything else in services.

Respond with ONLY this JSON, nothing else:
{
  "plain_summary": "...",
  "visit_date": "YYYY-MM-DD or null",
  "vet_name": "clinic or vet name if present, else null",
  "reason": "why the pet came in (e.g. 'Annual checkup', 'Limping') or null",
  "diagnosis": "what the vet found/diagnosed, if stated, or null",
  "treatment": "clean plain-English summary of what was done, or null",
  "receipt_total": number or null,
  "services": [{"name": "...", "price": number or null}],
  "medications": [{"name": "clean drug name + strength", "dosage": "...", "frequency": "...", "duration": "..."}],
  "vaccinations": [{"name": "...", "date": "YYYY-MM-DD or null"}],
  "follow_up": {"date": "YYYY-MM-DD or null", "reason": "..."},
  "action_items": ["things the owner needs to do at home"]
}`;
}

function parseExtraction(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const empty = {
    plain_summary: "",
    visit_date: null,
    vet_name: null,
    reason: null,
    diagnosis: null,
    treatment: null,
    receipt_total: null,
    services: [],
    medications: [],
    vaccinations: [],
    follow_up: { date: null, reason: "" },
    action_items: [],
  };
  if (!jsonMatch) return empty;
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      plain_summary: parsed.plain_summary || "",
      visit_date: parsed.visit_date || null,
      vet_name: parsed.vet_name || null,
      reason: parsed.reason || null,
      diagnosis: parsed.diagnosis || null,
      treatment: parsed.treatment || null,
      receipt_total:
        parsed.receipt_total != null && !isNaN(Number(parsed.receipt_total))
          ? Number(parsed.receipt_total)
          : null,
      services: Array.isArray(parsed.services) ? parsed.services : [],
      medications: Array.isArray(parsed.medications) ? parsed.medications : [],
      vaccinations: Array.isArray(parsed.vaccinations)
        ? parsed.vaccinations
        : [],
      follow_up: parsed.follow_up || { date: null, reason: "" },
      action_items: Array.isArray(parsed.action_items)
        ? parsed.action_items
        : [],
    };
  } catch {
    return empty;
  }
}

// Build staged items — visit record, medications, vaccinations, and services.
// Services use target_table 'visit_service' — they fold into the visit's
// treatment on confirm rather than creating standalone rows.
function buildStagedItems({ extracted, recapId, petId, ownerId }) {
  const rows = [];

  // Visit record (create one if we have a date, reason, diagnosis, or clinic)
  if (
    extracted.visit_date ||
    extracted.reason ||
    extracted.diagnosis ||
    extracted.vet_name
  ) {
    const labelBits = [];
    if (extracted.visit_date) labelBits.push(extracted.visit_date);
    const desc = extracted.diagnosis || extracted.reason;
    // Cost = the actual receipt total (a fact), NOT a sum of checked services.
    // Fall back to summing services only if no explicit total was found.
    const visitCost =
      extracted.receipt_total != null
        ? extracted.receipt_total
        : totalServicesCost(extracted.services);
    rows.push({
      recap_id: recapId,
      pet_id: petId,
      owner_id: ownerId,
      target_table: "pet_vet_visits",
      display_label: `Visit${labelBits.length ? ` — ${labelBits.join(" ")}` : ""}${desc ? `: ${desc}` : ""}`,
      payload: {
        visit_date: extracted.visit_date,
        clinic_name: extracted.vet_name,
        reason: extracted.reason,
        diagnosis: extracted.diagnosis,
        treatment: extracted.treatment,
        cost: visitCost,
      },
    });
  }

  // Medications — names are already clean from extraction; add dosage/frequency
  for (const med of extracted.medications || []) {
    if (!med.name) continue;
    const parts = [med.name];
    if (med.frequency) parts.push(med.frequency);
    if (med.duration) parts.push(`for ${med.duration}`);
    rows.push({
      recap_id: recapId,
      pet_id: petId,
      owner_id: ownerId,
      target_table: "pet_medications",
      display_label: parts.join(", "),
      payload: {
        medication_name: med.name,
        dosage: med.dosage || null,
        frequency: med.frequency || null,
        notes: med.duration ? `Duration: ${med.duration}` : null,
      },
    });
  }

  // Vaccinations
  for (const vax of extracted.vaccinations || []) {
    if (!vax.name) continue;
    rows.push({
      recap_id: recapId,
      pet_id: petId,
      owner_id: ownerId,
      target_table: "pet_vaccinations",
      display_label: `${vax.name}${vax.date ? ` — ${vax.date}` : ""}`,
      payload: {
        vaccine_type: vax.name,
        date_administered: vax.date || extracted.visit_date || null,
      },
    });
  }

  // Services / labs — fold into the visit's treatment on confirm.
  for (const svc of extracted.services || []) {
    if (!svc.name) continue;
    const priceLabel =
      svc.price != null && !isNaN(Number(svc.price))
        ? ` — $${Number(svc.price).toFixed(2)}`
        : "";
    rows.push({
      recap_id: recapId,
      pet_id: petId,
      owner_id: ownerId,
      target_table: "visit_service",
      display_label: `${svc.name}${priceLabel}`,
      payload: {
        name: svc.name,
        price: svc.price != null ? Number(svc.price) : null,
      },
    });
  }

  return rows;
}

function totalServicesCost(services) {
  if (!Array.isArray(services)) return null;
  const sum = services.reduce(
    (acc, s) =>
      acc + (s.price != null && !isNaN(Number(s.price)) ? Number(s.price) : 0),
    0,
  );
  if (sum <= 0) return null;
  return Math.round(sum * 100) / 100;
}
