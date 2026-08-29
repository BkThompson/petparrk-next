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
   - "unmapped_service": a real clinical service NOT in the list above (e.g. bloodwork panel, cytology, ear cytology, fecal test, urinalysis, imaging). Set service_id to null.
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

Respond with ONLY this JSON, nothing else:
{
  "clinic_name": "exact clinic name or null",
  "clinic_city": "city or null",
  "visit_date": "YYYY-MM-DD or null",
  "species": "dog | cat | other | null",
  "line_items": [
    { "raw_label": "...", "classification": "mapped|unmapped_service|product", "service_id": number or null, "price": number }
  ]
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
