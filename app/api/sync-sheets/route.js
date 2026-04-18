import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY;

const SHEETS = [
  {
    region: "NorCal",
    id: "1_nReOmbE4iKHSA1GTgXlml-IsZFNNLWMrTuzjQ7jiiw",
    tab: "Call & Price Log",
  },
  {
    region: "SoCal",
    id: "1JBw1ZEyYv1Ys8CW4V20HCogMj8IDsmnuEUVENck0xiU",
    tab: "Call & Price Log",
  },
];

// ── Column indices (0-based) ──────────────────────────────────────────────────
const COL = {
  number: 0,
  name: 1,
  phone: 2,
  address: 3,
  city: 4,
  zip: 5,
  vetType: 6,
  hours: 7,
  callStatus: 8,
  noPricesReason: 9,
  acceptingNewPatients: 10,
  carecredit: 11,
  contactName: 12,
  callNotes: 13,
  examFee: 14,
  vetTechFee: 15,
  rabies: 16,
  dhpp: 17,
  fvrcp: 18,
  felv: 19,
  bordetella: 20,
  canineFlu: 21,
  lepto: 22,
  vaccinePkgDog: 23,
  vaccinePkgCat: 24,
  spay: 25,
  neuter: 26,
  dentalCleaning: 27,
  dentalNoAnesthesia: 28,
  xray: 29,
  bloodwork: 30,
  anesthesia: 31,
  emergencyVisit: 32,
  urgentCare: 33,
  speciesSeen: 34,
  notes: 35,
  verifiedBySusan: 36,
};

// ── Service name map to match your services table ─────────────────────────────
const SERVICE_MAP = [
  { col: COL.examFee, name: "Annual Wellness Exam" },
  { col: COL.vetTechFee, name: "Vet Tech Exam" },
  { col: COL.rabies, name: "Rabies Vaccine" },
  { col: COL.dhpp, name: "DHPP Vaccine" },
  { col: COL.fvrcp, name: "FVRCP Vaccine" },
  { col: COL.felv, name: "FeLV Vaccine" },
  { col: COL.bordetella, name: "Bordetella Vaccine" },
  { col: COL.canineFlu, name: "Canine Influenza Vaccine" },
  { col: COL.lepto, name: "Leptospirosis Vaccine" },
  { col: COL.vaccinePkgDog, name: "Vaccine Package — Dog" },
  { col: COL.vaccinePkgCat, name: "Vaccine Package — Cat" },
  { col: COL.spay, name: "Spay" },
  { col: COL.neuter, name: "Neuter" },
  { col: COL.dentalCleaning, name: "Dental Cleaning" },
  { col: COL.dentalNoAnesthesia, name: "Dental Cleaning (No Anesthesia)" },
  { col: COL.emergencyVisit, name: "Emergency Visit" },
  { col: COL.urgentCare, name: "Urgent Care Visit" },
];

function normalize(str) {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parsePrice(val) {
  if (!val || val.trim() === "") return null;
  const num = parseFloat(val.replace(/[^0-9.]/g, ""));
  return isNaN(num) ? null : num;
}

function parseBoolean(val) {
  if (!val) return null;
  const v = val.toLowerCase().trim();
  if (v === "yes" || v === "y") return true;
  if (v === "no" || v === "n") return false;
  return null;
}

async function fetchSheetRows(sheetId, tabName) {
  const encodedTab = encodeURIComponent(tabName);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedTab}!A4:AK2000?key=${PLACES_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.values || [];
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get("dry_run") === "true";

  if (!PLACES_KEY) {
    return Response.json(
      { error: "Missing GOOGLE_PLACES_API_KEY" },
      { status: 500 },
    );
  }

  // Load all services for matching
  const { data: services } = await supabase.from("services").select("id, name");
  const serviceMap = {};
  (services || []).forEach((s) => {
    serviceMap[normalize(s.name)] = s.id;
  });

  // Load existing vets and pending_vets for matching
  const { data: existingVets } = await supabase
    .from("vets")
    .select("id, name, phone");
  const { data: existingPending } = await supabase
    .from("pending_vets")
    .select("id, name, phone");

  const results = {
    processed: 0,
    matched: 0,
    pricesAdded: 0,
    notesAdded: 0,
    notFound: [],
    errors: [],
    dryRun,
  };

  for (const sheet of SHEETS) {
    let rows;
    try {
      rows = await fetchSheetRows(sheet.id, sheet.tab);
    } catch (err) {
      results.errors.push(`${sheet.region}: ${err.message}`);
      continue;
    }

    for (const row of rows) {
      const callStatus = (row[COL.callStatus] || "").trim();

      // Only process rows where VA got prices
      if (callStatus !== "Called - Got Prices") continue;

      results.processed++;

      const name = (row[COL.name] || "").trim();
      const phone = (row[COL.phone] || "").trim();
      const notes = (row[COL.notes] || "").trim();
      const callNotes = (row[COL.callNotes] || "").trim();
      const acceptingNewPatients = parseBoolean(row[COL.acceptingNewPatients]);
      const carecredit = parseBoolean(row[COL.carecredit]);

      // Match vet by name or phone in vets table first, then pending_vets
      let vetId = null;
      let vetTable = null;

      const vetMatch = existingVets?.find(
        (v) =>
          normalize(v.name) === normalize(name) ||
          (phone &&
            v.phone &&
            v.phone.replace(/\D/g, "") === phone.replace(/\D/g, "")),
      );

      if (vetMatch) {
        vetId = vetMatch.id;
        vetTable = "vets";
      } else {
        const pendingMatch = existingPending?.find(
          (v) =>
            normalize(v.name) === normalize(name) ||
            (phone &&
              v.phone &&
              v.phone.replace(/\D/g, "") === phone.replace(/\D/g, "")),
        );
        if (pendingMatch) {
          vetId = pendingMatch.id;
          vetTable = "pending_vets";
        }
      }

      if (!vetId) {
        results.notFound.push(`${name} (${sheet.region})`);
        continue;
      }

      results.matched++;

      if (dryRun) continue;

      // Update accepting_new_patients and carecredit if we have values
      const vetUpdates = {};
      if (acceptingNewPatients !== null)
        vetUpdates.accepting_new_patients = acceptingNewPatients;
      if (carecredit !== null) vetUpdates.carecredit = carecredit;
      if (Object.keys(vetUpdates).length > 0) {
        await supabase.from(vetTable).update(vetUpdates).eq("id", vetId);
      }

      // Save call notes if any
      if (callNotes) {
        const { data: existingNote } = await supabase
          .from("call_notes")
          .select("id")
          .eq("vet_id", vetId)
          .ilike("note", callNotes.substring(0, 50) + "%")
          .maybeSingle();

        if (!existingNote) {
          await supabase.from("call_notes").insert({
            vet_id: vetId,
            vet_name: name,
            note: callNotes,
          });
          results.notesAdded++;
        }
      }

      // Insert prices for each service that has a value
      for (const svc of SERVICE_MAP) {
        const priceVal = parsePrice(row[svc.col]);
        if (!priceVal) continue;

        const serviceId = serviceMap[normalize(svc.name)];
        if (!serviceId) continue;

        // Check if price already exists for this vet + service
        const { data: existingPrice } = await supabase
          .from("vet_prices")
          .select("id")
          .eq("vet_id", vetId)
          .eq("service_id", serviceId)
          .maybeSingle();

        if (existingPrice) continue; // Don't overwrite existing prices

        const { error } = await supabase.from("vet_prices").insert({
          vet_id: vetId,
          service_id: serviceId,
          price_low: priceVal,
          price_type: "exact",
          is_verified: false, // Susan still needs to verify
          source: `VA Call Sheet - ${sheet.region}`,
          notes: notes || null,
        });

        if (error) {
          results.errors.push(`${name} - ${svc.name}: ${error.message}`);
        } else {
          results.pricesAdded++;
        }
      }
    }
  }

  return Response.json({
    success: true,
    ...results,
    summary: `Processed ${results.processed} called rows, matched ${results.matched} vets, added ${results.pricesAdded} prices, ${results.notFound.length} not found in DB`,
  });
}
