// app/api/price-receipt/extract/route.js
//
// Track 3 Phase D — Receipt price extraction.
//
// Takes a single uploaded receipt (image or PDF), reads it with Claude vision,
// and returns structured price line items ready for admin review. Called once
// per file by the batch uploader; the client handles sequencing and staging.
//
// This route does NOT write to the database. It extracts and returns. The
// client collects results across the batch, shows the user a summary, and only
// then submits confirmed rows. Keeps extraction and persistence separate so a
// user can back out after seeing what was read.
//
// DESIGN CONSTRAINTS:
//   • Prices only — this is not the pet-records extractor. We want service
//     line items and their costs, plus the clinic identity and visit date.
//   • Clinic verification: the caller passes the expected vet (the page the
//     user is on). We read the clinic name off the receipt and compare, so a
//     Berkeley receipt uploaded on Montclair's page gets flagged, not silently
//     attributed to the wrong clinic.
//   • Three-way line classification: mapped service / unmapped service /
//     product. Administrative and $0 lines are dropped at extraction.
//   • 1-year date cap enforced here as a backstop (client checks too).

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// The full service taxonomy (18 items). Small enough to pass inline and let
// the model map directly — more accurate than any retrieval step at this size.
const SERVICES = [
  { id: 1, name: "Doctor Exam" },
  { id: 2, name: "Vet Tech Exam" },
  { id: 3, name: "Annual Wellness Exam" },
  { id: 4, name: "Dental Cleaning" },
  { id: 5, name: "Spay" },
  { id: 6, name: "Neuter" },
  { id: 7, name: "Emergency Visit" },
  { id: 8, name: "Dental Cleaning (No Anesthesia)" },
  { id: 9, name: "Urgent Care Visit" },
  { id: 10, name: "Rabies Vaccine" },
  { id: 11, name: "DHPP Vaccine" },
  { id: 12, name: "Bordetella Vaccine" },
  { id: 13, name: "Leptospirosis Vaccine" },
  { id: 14, name: "FVRCP Vaccine" },
  { id: 15, name: "FeLV Vaccine" },
  { id: 16, name: "Vaccine Package — Dog" },
  { id: 17, name: "Vaccine Package — Cat" },
  { id: 18, name: "Canine Influenza Vaccine" },
  // 19-33 were missing, so the model was never told these services existed and
  // could not match them — a receipt line reading "Bloodwork" came back
  // unmatched and fell through to "Other", even though the form offers
  // Bloodwork in its dropdown. Ids are the real ones from the services table.
  { id: 19, name: "Urinalysis" },
  { id: 20, name: "X-Ray" },
  { id: 21, name: "Heartworm Prevention" },
  { id: 22, name: "Ultrasound" },
  { id: 23, name: "Nail Trim" },
  { id: 24, name: "Ear Infection Treatment" },
  { id: 25, name: "Flea & Tick Treatment" },
  { id: 26, name: "Wound Treatment" },
  { id: 27, name: "Microchipping" },
  { id: 28, name: "Bloodwork" },
  { id: 29, name: "Eye Treatment" },
  { id: 30, name: "Dental Extraction" },
  { id: 31, name: "Fecal Test" },
  { id: 32, name: "Heartworm Test" },
  { id: 33, name: "Skin / Allergy Treatment" },
  { id: 34, name: "Acupuncture" },
  { id: 35, name: "Physical Rehabilitation" },
];

const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

export async function POST(request) {
  // ── Auth: sign-in required for receipt uploads
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json(
      { error: "Please sign in to upload receipts." },
      { status: 401 },
    );
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
    return NextResponse.json(
      { error: "Your session has expired. Please sign in again." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.documentBase64) {
    return NextResponse.json(
      { error: "No document was provided." },
      { status: 400 },
    );
  }

  const { documentBase64, documentMediaType, expectedVet } = body;

  // ── Build the document block (image or PDF)
  const isPdf = documentMediaType === "application/pdf";
  const documentBlock = isPdf
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
      };

  const servicesList = SERVICES.map((s) => `  ${s.id}. ${s.name}`).join("\n");

  const instruction = `You are extracting veterinary PRICE data from a receipt or invoice for a community pricing database. Read carefully and return structured data.

Extract:

1. CLINIC IDENTITY — the name of the veterinary clinic on the receipt, and its city if shown. This is used to verify the receipt belongs to the expected clinic.

2. VISIT/INVOICE DATE — the date of service (YYYY-MM-DD). Not the print date if a separate service date is shown.

3. LINE ITEMS — every billable line with a price. For each, classify it:
   - "mapped": matches one of these known services. Use the service's id.
${servicesList}
   - "unmapped_service": a real clinical service NOT in the list above (e.g. cytology, biopsy, anesthesia, hospitalization, fluids). Set service_id to null. Note that common lab work and imaging ARE in the list above — match those rather than calling them unmapped.
   - "product": a medication or physical product (e.g. Cytopoint, Simparica, Apoquel, prescription food, flea/tick preventative). Set service_id to null.

   DO NOT include: administrative or zero-dollar lines such as "Charges Complete", "No Treatment Progress Exam Needed", "The doctor has not recommended...", subtotals, tax lines, payment lines, or totals. Skip anything that is not an actual priced service or product.

For each line item provide:
   - raw_label: the exact text as printed on the receipt
   - classification: "mapped" | "unmapped_service" | "product"
   - service_id: the matching id number if mapped, otherwise null
   - price: the line's price as a number (the total for that line, not unit price if quantity > 1 is shown — use the line total)

ACCURACY IS CRITICAL for prices. Read each price digit by digit, exactly as printed. Do not round, estimate, or infer. If a digit is unclear, read it as printed rather than guessing a "cleaner" number. The price must match the receipt character-for-character (e.g. if it says 183.77, return 183.77, never 187.77).

Also extract, when present on the receipt (these describe the clinic/visit and help price comparison):
   - species: "dog", "cat", or other if identifiable, else null

IMPORTANT — date: the visit/service date must be within the last 12 months. If the receipt's date is clearly older than one year, still report it accurately in visit_date so it can be filtered out.

SENSITIVE DATA — separately, report whether the document displays either of these:
   - full_card_number: a complete payment card number (13 or more consecutive digits, or a number printed in full such as 4111 1111 1111 1111). A masked number showing only the last four digits — "VISA ****1234", "ending in 1234", "XXXXXXXXXXXX1234" — is NOT a full card number and must be reported as false. Most receipts show only the last four; do not flag those.
   - ssn: a Social Security Number, printed as 123-45-6789 or labelled SSN.
Report these accurately. A customer's name, address, phone number or email is NOT sensitive for this purpose — do not flag those.

Respond with ONLY this JSON, nothing else:
{
  "clinic_name": "exact clinic name or null",
  "clinic_city": "city or null",
  "visit_date": "YYYY-MM-DD or null",
  "species": "dog | cat | other | null",
  "line_items": [
    { "raw_label": "...", "classification": "mapped|unmapped_service|product", "service_id": number or null, "price": number }
  ],
  "sensitive": { "full_card_number": true or false, "ssn": true or false }
}`;

  let extraction;
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1500,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [documentBlock, { type: "text", text: instruction }],
        },
      ],
    });
    const text = response.content?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    extraction = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (err) {
    console.error("receipt extraction failed:", err);
    return NextResponse.json(
      { error: "We couldn't read this document. Please try a clearer photo." },
      { status: 200 }, // 200 with error field so the client can mark this file failed without failing the batch
    );
  }

  // Refuse a receipt showing a full card number or an SSN. This happens here,
  // in memory, before the file is ever uploaded — the browser only uploads
  // receipts that produced entries, so a refusal means it never reaches
  // storage at all. Redacting after the fact would mean holding the original
  // first, which is the thing worth avoiding.
  //
  // Deliberately not logged: no file name, no page content, nothing that would
  // put the sensitive value in a log line instead of a bucket.
  const flagged = extraction?.sensitive || {};
  if (flagged.full_card_number || flagged.ssn) {
    return NextResponse.json(
      {
        rejected: "sensitive_data",
        sensitive_kind: flagged.full_card_number ? "card" : "ssn",
      },
      { status: 200 },
    );
  }

  if (!extraction) {
    return NextResponse.json(
      {
        error:
          "We couldn't find price information on this document. Make sure it's a vet receipt or invoice.",
      },
      { status: 200 },
    );
  }

  // ── 1-year date cap (backstop; client checks before upload too)
  if (extraction.visit_date) {
    const visitTime = new Date(extraction.visit_date).getTime();
    if (!isNaN(visitTime) && Date.now() - visitTime > ONE_YEAR_MS) {
      return NextResponse.json({
        rejected: "too_old",
        visit_date: extraction.visit_date,
        clinic_name: extraction.clinic_name || null,
        message:
          "This receipt is more than a year old. To keep pricing current, we only accept receipts from the past 12 months.",
      });
    }
  }

  // ── Clinic verification against the expected vet (the page the user is on)
  let clinicMatch = "unknown";
  if (expectedVet && extraction.clinic_name) {
    clinicMatch = clinicNamesMatch(expectedVet.name, extraction.clinic_name)
      ? "match"
      : "mismatch";
  }

  // ── Shape line items; drop anything without a usable price
  const lineItems = (extraction.line_items || [])
    .filter(
      (li) =>
        li &&
        li.price != null &&
        !isNaN(Number(li.price)) &&
        Number(li.price) > 0 &&
        li.raw_label,
    )
    .map((li) => ({
      raw_label: String(li.raw_label),
      classification: ["mapped", "unmapped_service", "product"].includes(
        li.classification,
      )
        ? li.classification
        : "unmapped_service",
      service_id:
        li.classification === "mapped" && li.service_id != null
          ? Number(li.service_id)
          : null,
      // Return the matched service's name, not just its id. The form's
      // dropdown is keyed by name, and having the client keep its own copy of
      // this list would be one more pair of things to drift apart. An id that
      // doesn't match anything here resolves to null, and the form falls back
      // to "Other".
      service_name:
        li.classification === "mapped" && li.service_id != null
          ? SERVICES.find((sv) => sv.id === Number(li.service_id))?.name || null
          : null,
      price: Math.round(Number(li.price) * 100) / 100,
    }));

  return NextResponse.json({
    clinic_name: extraction.clinic_name || null,
    clinic_city: extraction.clinic_city || null,
    clinic_match: clinicMatch,
    visit_date: extraction.visit_date || null,
    species: extraction.species || null,
    line_items: lineItems,
  });
}

// Loose clinic-name comparison. Receipts abbreviate and reorder ("Montclair
// Pet Hospital" vs "Montclair Pet Hosp."), so we normalize and check whether
// the distinctive words overlap rather than requiring an exact string match.
function clinicNamesMatch(expected, found) {
  const norm = (s) =>
    String(s)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(
        /\b(the|a|an|pet|animal|hospital|clinic|veterinary|vet|care|center|centre|of|and)\b/g,
        " ",
      )
      .split(/\s+/)
      .filter(Boolean);

  const e = new Set(norm(expected));
  const f = new Set(norm(found));
  if (e.size === 0 || f.size === 0) return false;

  let overlap = 0;
  for (const w of e) if (f.has(w)) overlap++;

  // Match if the distinctive words substantially overlap. Requiring the
  // smaller set to be mostly covered handles abbreviations without matching
  // two unrelated clinics that happen to share "pet hospital".
  const smaller = Math.min(e.size, f.size);
  return overlap / smaller >= 0.5;
}
