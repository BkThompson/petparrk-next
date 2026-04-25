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
// Hidden columns still occupy index slots in the API response:
// S(18)=FVRCP hidden, T(19)=FeLV hidden, X(23)=VaxPkgDog hidden,
// Y(24)=VaxPkgCat hidden, AD(29)=X-Ray hidden, AE(30)=Bloodwork hidden,
// AF(31)=Anesthesia hidden, AI(34)=SpeciesSeen hidden
const COL = {
  number: 0,
  name: 1,
  phone: 2,
  address: 3,
  city: 4,
  zip: 5,
  vetType: 6,
  hours: 7,
  callStatus: 8, // I
  noPricesReason: 9, // J
  acceptingNewPatients: 10, // K
  carecredit: 11, // L
  contactName: 12, // M
  // col 13 (N) = callNotes — intentionally excluded from sync
  examFee: 14, // O
  vetTechFee: 15, // P
  rabies: 16, // Q
  dhpp: 17, // R
  fvrcp: 18, // S (hidden)
  felv: 19, // T (hidden)
  bordetella: 20, // U
  canineFlu: 21, // V
  lepto: 22, // W
  vaccinePkgDog: 23, // X (hidden)
  vaccinePkgCat: 24, // Y (hidden)
  spay: 25, // Z
  neuter: 26, // AA
  dentalCleaning: 27, // AB
  dentalNoAnesthesia: 28, // AC
  // col 29 (AD) = X-Ray hidden
  // col 30 (AE) = Bloodwork hidden
  // col 31 (AF) = Anesthesia hidden
  emergencyVisit: 32, // AG
  urgentCare: 33, // AH
  // col 34 (AI) = Species Seen hidden
  // col 35 (AJ) = Notes — intentionally excluded from sync
  verifiedBySusan: 36, // AK
  priceNotes: 37, // AL — context for multiple prices e.g. "small dog / large dog"
};

// ── Service map — col → service name in your services table ──────────────────
// Fix #2: examFee correctly maps to "Doctor Exam" not "Annual Wellness Exam"
const SERVICE_MAP = [
  { col: COL.examFee, name: "Doctor Exam" },
  { col: COL.vetTechFee, name: "Vet Tech Exam" },
  { col: COL.rabies, name: "Rabies Vaccine" },
  { col: COL.dhpp, name: "DHPP Vaccine" },
  { col: COL.fvrcp, name: "FVRCP Vaccine" },
  { col: COL.felv, name: "FeLV Vaccine" },
  { col: COL.bordetella, name: "Bordetella Vaccine" },
  { col: COL.canineFlu, name: "Canine Influenza Vaccine" },
  { col: COL.lepto, name: "Leptospirosis Vaccine" },
  { col: COL.vaccinePkgDog, name: "Vaccine Package \u2014 Dog" },
  { col: COL.vaccinePkgCat, name: "Vaccine Package \u2014 Cat" },
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

// ── Fix #3 & #4: Parse price value AND detect price type ─────────────────────
// Convention in spreadsheet cells:
//   65          → exact  (single number)
//   65-80       → range  (two numbers with hyphen)
//   65+         → starting (number followed by +)
//
// Multiple prices for same service use / separator:
//   200/350              → two exact prices
//   200-250/350-400      → two range prices
//   200+/350+            → two starting prices
//   200/350-400          → mixed types allowed
//
// Price Notes column (AL) provides context for each price, also / separated:
//   "small dog / large dog"  → note[0] goes with price[0], note[1] with price[1]

function parseSinglePrice(str) {
  const s = str.trim();
  if (!s) return null;

  // Range: two numbers with hyphen/dash
  const rangeMatch = s.match(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    return {
      price_low: parseFloat(rangeMatch[1]),
      price_high: parseFloat(rangeMatch[2]),
      price_type: "range",
    };
  }

  // Starting: number followed by +
  const startingMatch = s.match(/(\d+(?:\.\d+)?)\s*\+/);
  if (startingMatch) {
    return {
      price_low: parseFloat(startingMatch[1]),
      price_high: null,
      price_type: "starting",
    };
  }

  // Exact: first number only, ignore everything else
  const exactMatch = s.match(/(\d+(?:\.\d+)?)/);
  if (exactMatch) {
    return {
      price_low: parseFloat(exactMatch[1]),
      price_high: null,
      price_type: "exact",
    };
  }

  return null;
}

// Returns array of { price_low, price_high, price_type, note } objects
// Handles both single prices and multiple prices separated by /
function parsePriceEntries(priceVal, noteVal) {
  if (!priceVal || priceVal.toString().trim() === "") return [];

  // Read only first line — ignore any extra lines in the cell
  const firstLine = priceVal
    .toString()
    .split(/[\n\r]/)[0]
    .trim();

  // Split by / to get individual price entries
  const priceParts = firstLine
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);

  // Split notes the same way — note[i] matches price[i]
  const noteFirstLine = (noteVal || "")
    .toString()
    .split(/[\n\r]/)[0]
    .trim();
  const noteParts = noteFirstLine.split("/").map((n) => n.trim());

  const entries = [];
  for (let i = 0; i < priceParts.length; i++) {
    const parsed = parseSinglePrice(priceParts[i]);
    if (parsed) {
      entries.push({
        ...parsed,
        note: noteParts[i] || null,
      });
    }
  }

  return entries;
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
  // Range extended to AL to include the new Price Notes column
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedTab}!A4:AM2000?key=${PLACES_KEY}`;
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

  // Load all existing vets
  const { data: existingVets } = await supabase
    .from("vets")
    .select("id, name, phone, accepting_new_patients, carecredit")
    .limit(10000);

  // Load ALL pending_vets by paginating
  let existingPending = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data: page } = await supabase
      .from("pending_vets")
      .select("id, name, phone, accepting_new_patients, carecredit")
      .range(from, from + pageSize - 1);
    if (!page || page.length === 0) break;
    existingPending = existingPending.concat(page);
    if (page.length < pageSize) break;
    from += pageSize;
  }

  console.log(
    `Sync: Loaded ${existingVets?.length} vets, ${existingPending.length} pending vets`,
  );

  const results = {
    processed: 0,
    matched: 0,
    pricesAdded: 0,
    pricesSkipped: 0,
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
      const name = (row[COL.name] || "").trim();

      // Skip example rows
      if (name === "Example Animal Hospital" || row[COL.number] === "EX")
        continue;

      // Only process rows where VA confirmed prices were collected
      if (callStatus !== "Called - Got Prices") continue;

      results.processed++;

      const phone = (row[COL.phone] || "").trim();
      const acceptingNewPatients = parseBoolean(row[COL.acceptingNewPatients]);
      const carecredit = parseBoolean(row[COL.carecredit]);

      // Fix #1: callNotes (col 13) and notes (col 35) are intentionally NOT read here

      // Match vet by name or phone in vets table first, then pending_vets
      let vetId = null;
      let vetTable = null;
      let existingVetRecord = null;

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
        existingVetRecord = vetMatch;
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
          existingVetRecord = pendingMatch;
        }
      }

      if (!vetId) {
        results.notFound.push(`${name} (${sheet.region})`);
        continue;
      }

      results.matched++;

      if (dryRun) continue;

      // Fix #5: Only update accepting_new_patients and carecredit if they are
      // currently null in the admin — never overwrite values Susan has set manually
      const vetUpdates = {};
      if (
        acceptingNewPatients !== null &&
        existingVetRecord?.accepting_new_patients === null
      ) {
        vetUpdates.accepting_new_patients = acceptingNewPatients;
      }
      if (carecredit !== null && existingVetRecord?.carecredit === null) {
        vetUpdates.carecredit = carecredit;
      }
      if (Object.keys(vetUpdates).length > 0) {
        await supabase.from(vetTable).update(vetUpdates).eq("id", vetId);
      }

      // Fix #1: callNotes are NOT synced to call_notes table
      // Fix #1: notes column is NOT passed into price payloads

      // Read Price Notes column for context on multiple prices
      const priceNotesRaw = row[COL.priceNotes] || "";

      // Insert prices for each service that has a value
      for (const svc of SERVICE_MAP) {
        const rawVal = row[svc.col];

        // Fix #3, #4 & multiple prices: parse all price entries for this service
        const entries = parsePriceEntries(rawVal, priceNotesRaw);
        if (!entries.length) continue;

        const serviceId = serviceMap[normalize(svc.name)];
        if (!serviceId) {
          results.errors.push(`Service not found in DB: ${svc.name}`);
          continue;
        }

        const isPending = vetTable === "pending_vets";
        const priceIdField = isPending ? "pending_vet_id" : "vet_id";

        for (const entry of entries) {
          // Fix #5: Skip if this exact price already exists for this vet + service + amount
          // We check price_low too so we don't skip legitimate second prices for same service
          const { data: existingPrice } = await supabase
            .from("vet_prices")
            .select("id")
            .eq(priceIdField, vetId)
            .eq("service_id", serviceId)
            .eq("price_low", entry.price_low)
            .maybeSingle();

          if (existingPrice) {
            results.pricesSkipped++;
            continue;
          }

          const pricePayload = {
            service_id: serviceId,
            price_low: entry.price_low,
            price_high: entry.price_high,
            price_type: entry.price_type,
            notes: entry.note || null, // price-specific note e.g. "small dog"
            is_verified: true,
            source: `VA Call Sheet - ${sheet.region}`,
          };

          if (isPending) {
            pricePayload.pending_vet_id = vetId;
            pricePayload.vet_id = null;
          } else {
            pricePayload.vet_id = vetId;
          }

          const { error } = await supabase
            .from("vet_prices")
            .insert(pricePayload);

          if (error) {
            results.errors.push(`${name} - ${svc.name}: ${error.message}`);
          } else {
            results.pricesAdded++;
          }
        }
      }
    }
  }

  return Response.json({
    success: true,
    ...results,
    summary: `Processed ${results.processed} rows, matched ${results.matched} vets, added ${results.pricesAdded} prices, skipped ${results.pricesSkipped} existing, ${results.notFound.length} not found in DB`,
  });
}
