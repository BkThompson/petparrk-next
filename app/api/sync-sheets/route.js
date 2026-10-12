// app/api/sync-sheets/route.js
//
// Changes in this version (2026-07-17, batched + auth):
//   • AUTH: POST + requireAdmin('edit_prices') check (was unauthenticated GET)
//   • PERF: Replaced ~10,500 individual dedup queries with one bulk load into
//     a Set — dedup lookups are now O(1) in memory, no round trip.
//   • PERF: Batched pending_vets creation (was ~1,261 sequential inserts).
//   • PERF: Batched vet_prices inserts (was ~10,000 sequential inserts).
//   • Expected runtime: ~15–30 seconds, down from 5+ minutes.

import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY;
const BATCH_SIZE = 500;

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
  emergencyVisit: 32,
  urgentCare: 33,
  // AJ — "Internal Admin Notes" on the call sheet: what Susan and the VAs
  // write after phoning a clinic. Admin-only; never published.
  internalNotes: 35,
  // 36 is the old "verified by Susan" column. Deliberately not read: every
  // sheet price was marked verified regardless of whether anyone ticked it, so
  // it claimed a check that wasn't happening. Admin has real price
  // verification. The column stays in the sheet as a spacer — removing it
  // there would shift every column after it and the sync would silently read
  // the wrong ones.
  // 37 is AL, the old "price notes" column. No longer read, and the reason is
  // worth keeping: AL holds one value for a whole row, but a row holds up to
  // 17 service prices. The sync handed that single cell to every service
  // column, so one note in AL was stamped onto a dozen unrelated prices on the
  // vet page. It was only ever correct for a multi-price cell ("50 / 75") whose
  // note happened to be split the same way, and silently wrong everywhere else.
  //
  // A note that applies to every price is AM's job. A note that applies to one
  // price is written in Admin, against that price. AL stays in the sheet as a
  // spacer — deleting the column there would shift AM left and the sync would
  // start reading the wrong one.
  // AM — the clinic's note about its pricing as a whole, shown publicly under
  // the price list: why a price needs an exam first, what a range assumes.
  // Lands in vets.pricing_note, the field Admin already calls "Public pricing
  // note".
  publicNotes: 38,
};

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

function relaxName(str) {
  return (str || "")
    .toLowerCase()
    .replace(/\s+[-–—]\s+.+$/, "")
    .replace(/[^a-z0-9]/g, "");
}

function parseSinglePrice(str) {
  const s = str.trim();
  if (!s) return null;
  const rangeMatch = s.match(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    return {
      price_low: parseFloat(rangeMatch[1]),
      price_high: parseFloat(rangeMatch[2]),
      price_type: "range",
    };
  }
  const startingMatch = s.match(/(\d+(?:\.\d+)?)\s*\+/);
  if (startingMatch) {
    return {
      price_low: parseFloat(startingMatch[1]),
      price_high: null,
      price_type: "starting",
    };
  }
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

// Prices only. Notes are no longer read from the sheet — see COL above.
function parsePriceEntries(priceVal) {
  if (!priceVal || priceVal.toString().trim() === "") return [];
  const firstLine = priceVal
    .toString()
    .split(/[\n\r]/)[0]
    .trim();

  // "Declined to share" convention — cell contains N/A, Declined, or No Price.
  // Sync creates a call_for_quote row so the vet page shows
  // "Pricing not currently available" instead of a blank.
  const declinedRe = /^(n\/?a|declined|no\s*price|not\s*available)$/i;
  if (declinedRe.test(firstLine)) {
    return [
      {
        price_low: null,
        price_high: null,
        price_type: null,
        call_for_quote: true,
      },
    ];
  }

  const priceParts = firstLine
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);
  const entries = [];
  for (const part of priceParts) {
    const parsed = parseSinglePrice(part);
    if (parsed) entries.push(parsed);
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
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedTab}!A4:AM2000?key=${PLACES_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.values || [];
}

async function loadAll(tableName, columns) {
  const all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data: page, error } = await supabase
      .from(tableName)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`loadAll ${tableName}: ${error.message}`);
    if (!page || page.length === 0) break;
    all.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function batchInsert(tableName, rows, returning, errors, label) {
  const all = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const query = supabase.from(tableName).insert(batch);
    const { data, error } = returning
      ? await query.select(returning)
      : await query;
    if (error) {
      errors.push(`${label} batch failed at index ${i}: ${error.message}`);
      for (let j = 0; j < batch.length; j++) all.push(null);
      continue;
    }
    if (returning && data) all.push(...data);
    else for (let j = 0; j < batch.length; j++) all.push({ inserted: true });
  }
  return all;
}

export async function POST(request) {
  // Admin auth gate — must be authenticated admin with 'edit_prices' permission
  const auth = await requireAdmin(request, "edit_prices");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get("dry_run") === "true";

  if (!PLACES_KEY) {
    return Response.json(
      { error: "Missing GOOGLE_PLACES_API_KEY" },
      { status: 500 },
    );
  }

  const { data: services } = await supabase.from("services").select("id, name");
  const serviceMap = {};
  (services || []).forEach((s) => {
    serviceMap[normalize(s.name)] = s.id;
  });

  const existingVets = await loadAll(
    "vets",
    "id, name, phone, accepting_new_patients, carecredit, internal_notes, pricing_note",
  );
  const existingPending = await loadAll(
    "pending_vets",
    "id, name, phone, accepting_new_patients, carecredit, internal_notes, pricing_note",
  );

  const existingPrices = await loadAll(
    "vet_prices",
    // `notes` is read so a note written in Admin can be carried onto the
    // replacement row when a sheet price changes — see the reconciliation
    // below. Without it here, r.notes is undefined and every price edit
    // quietly wipes the note that explained it.
    // sheet_value is read so a locked group's "the call sheet says …" line can
    // be refreshed only when it has actually changed, rather than rewriting
    // every override on every run.
    "id, vet_id, pending_vet_id, service_id, price_low, price_high, price_type, call_for_quote, source, region, notes, sheet_value",
  );
  // Index existing prices by vet+service so we can do replace-per-service
  // scoped to sheet-sourced rows, and detect cross-source conflicts.
  // Key: "v:<id>:<serviceId>" or "p:<id>:<serviceId>"
  const pricesByVetService = new Map();
  existingPrices.forEach((p) => {
    if (p.service_id == null) return;
    const vetKey = p.vet_id
      ? `v:${p.vet_id}`
      : p.pending_vet_id
        ? `p:${p.pending_vet_id}`
        : null;
    if (!vetKey) return;
    const vsKey = `${vetKey}:${p.service_id}`;
    if (!pricesByVetService.has(vsKey)) pricesByVetService.set(vsKey, []);
    pricesByVetService.get(vsKey).push(p);
  });

  console.log(
    `Sync: Loaded ${existingVets.length} vets, ${existingPending.length} pending vets, ${existingPrices.length} existing prices`,
  );

  const vetsByExactName = new Map();
  const vetsByRelaxedName = new Map();
  const vetsByPhone = new Map();
  existingVets.forEach((v) => {
    vetsByExactName.set(normalize(v.name), v);
    const relaxed = relaxName(v.name);
    if (relaxed) vetsByRelaxedName.set(relaxed, v);
    if (v.phone) vetsByPhone.set(v.phone.replace(/\D/g, ""), v);
  });

  const pendingByExactName = new Map();
  const pendingByRelaxedName = new Map();
  const pendingByPhone = new Map();
  existingPending.forEach((v) => {
    pendingByExactName.set(normalize(v.name), v);
    const relaxed = relaxName(v.name);
    if (relaxed) pendingByRelaxedName.set(relaxed, v);
    if (v.phone) pendingByPhone.set(v.phone.replace(/\D/g, ""), v);
  });

  const scheduledByExactName = new Map();
  const scheduledByRelaxedName = new Map();
  const scheduledByPhone = new Map();

  const results = {
    processed: 0,
    exactMatched: 0,
    relaxedMatched: 0,
    autoCreated: 0,
    autoCreatedList: [],
    matchedVets: [],
    pricesAdded: 0,
    pricesUpdated: 0,
    pricesRemoved: 0,
    pricesSkipped: 0,
    removedList: [],
    conflictsFound: 0,
    conflictList: [],
    // Prices Admin has taken over. The sheet is the bulk entry point, Admin is
    // the final word — so a price edited in Admin wins, and the sync reports
    // what it left alone rather than quietly doing nothing. Without this the
    // override is invisible: Susan changes a cell, the number doesn't move,
    // and there's nothing to point at.
    pricesLocked: 0,
    lockedList: [],
    notFound: [],
    errors: [],
    dryRun,
  };

  const pendingVetsToCreate = [];
  const priceInserts = [];
  const vetFlagUpdates = [];

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

      if (!name) continue;
      if (name === "Example Animal Hospital" || row[COL.number] === "EX")
        continue;
      if (callStatus !== "Called - Got Prices") continue;

      results.processed++;

      const phone = (row[COL.phone] || "").trim();
      const phoneDigits = phone.replace(/\D/g, "");
      const address = (row[COL.address] || "").trim();
      const city = (row[COL.city] || "").trim();
      const zip = (row[COL.zip] || "").trim();
      const vetType = (row[COL.vetType] || "").trim();
      const hours = (row[COL.hours] || "").trim();
      const acceptingNewPatients = parseBoolean(row[COL.acceptingNewPatients]);
      const carecredit = parseBoolean(row[COL.carecredit]);
      const internalNotes = (row[COL.internalNotes] || "").trim();
      const publicNotes = (row[COL.publicNotes] || "").trim();
      const normalizedName = normalize(name);
      const relaxedName = relaxName(name);

      let vetRef = null;
      let existingRecord = null;
      let matchType = null;

      let hit =
        vetsByExactName.get(normalizedName) ||
        (phoneDigits && vetsByPhone.get(phoneDigits));
      if (hit) {
        vetRef = { type: "vet", id: hit.id };
        existingRecord = hit;
        matchType = "exact";
      }

      if (!vetRef) {
        hit =
          pendingByExactName.get(normalizedName) ||
          (phoneDigits && pendingByPhone.get(phoneDigits));
        if (hit) {
          vetRef = { type: "pending", id: hit.id };
          existingRecord = hit;
          matchType = "exact";
        }
      }

      if (!vetRef && relaxedName) {
        hit = vetsByRelaxedName.get(relaxedName);
        if (hit) {
          vetRef = { type: "vet", id: hit.id };
          existingRecord = hit;
          matchType = "relaxed";
        } else {
          hit = pendingByRelaxedName.get(relaxedName);
          if (hit) {
            vetRef = { type: "pending", id: hit.id };
            existingRecord = hit;
            matchType = "relaxed";
          }
        }
      }

      if (!vetRef) {
        let scheduledIdx = scheduledByExactName.get(normalizedName);
        if (scheduledIdx == null && phoneDigits)
          scheduledIdx = scheduledByPhone.get(phoneDigits);
        if (scheduledIdx == null && relaxedName)
          scheduledIdx = scheduledByRelaxedName.get(relaxedName);
        if (scheduledIdx != null)
          vetRef = { type: "scheduled", index: scheduledIdx };
      }

      if (!vetRef) {
        const hasContact = phoneDigits || address;
        if (!hasContact) {
          results.notFound.push(
            `${name} (${sheet.region}) — no phone or address, skipped`,
          );
          continue;
        }

        const idx = pendingVetsToCreate.length;
        pendingVetsToCreate.push({
          name,
          phone: phone || null,
          address: address || null,
          city: city || null,
          zip_code: zip || null,
          vet_type: vetType || null,
          hours: hours || null,
          state: "CA",
          status: "pending",
          source: `VA Call Sheet - ${sheet.region}`,
          accepting_new_patients: acceptingNewPatients,
          carecredit,
          // Carried on creation too, so a clinic added by the sync arrives
          // with the call context already attached rather than needing a
          // second pass.
          internal_notes: internalNotes || null,
          pricing_note: publicNotes || null,
        });
        scheduledByExactName.set(normalizedName, idx);
        if (relaxedName) scheduledByRelaxedName.set(relaxedName, idx);
        if (phoneDigits) scheduledByPhone.set(phoneDigits, idx);

        vetRef = { type: "scheduled", index: idx };
        matchType = "created";
        results.autoCreated++;
        results.autoCreatedList.push(`${name} (${sheet.region})`);
      }

      if (matchType === "exact") results.exactMatched++;
      else if (matchType === "relaxed") results.relaxedMatched++;
      results.matchedVets.push(`${name} (${sheet.region})`);

      if (existingRecord && vetRef.type !== "scheduled") {
        const upd = {};
        if (
          acceptingNewPatients !== null &&
          existingRecord.accepting_new_patients === null
        ) {
          upd.accepting_new_patients = acceptingNewPatients;
        }
        if (carecredit !== null && existingRecord.carecredit === null) {
          upd.carecredit = carecredit;
        }
        // Call notes from the sheet, but never over the top of notes already
        // written in Admin — same rule as the flags above. Someone typing in
        // Admin is making a deliberate edit; the sheet is a bulk import.
        if (internalNotes && !existingRecord.internal_notes) {
          upd.internal_notes = internalNotes;
        }
        // Same rule: fill it, never overwrite. Someone typing in Admin is
        // making a deliberate edit; the sheet is a bulk import.
        if (publicNotes && !existingRecord.pricing_note) {
          upd.pricing_note = publicNotes;
        }
        if (Object.keys(upd).length > 0) {
          vetFlagUpdates.push({
            table: vetRef.type === "vet" ? "vets" : "pending_vets",
            id: vetRef.id,
            updates: upd,
          });
        }
      }

      for (const svc of SERVICE_MAP) {
        const entries = parsePriceEntries(row[svc.col]);
        if (!entries.length) continue;

        const serviceId = serviceMap[normalize(svc.name)];
        if (!serviceId) {
          results.errors.push(`Service not found in DB: ${svc.name}`);
          continue;
        }

        for (const entry of entries) {
          priceInserts.push({
            _vetRef: vetRef,
            _serviceId: serviceId,
            _entry: entry,
            _region: sheet.region,
            _vetName: name,
            _svcName: svc.name,
          });
        }
      }
    }
  }

  // ── Reconciliation: replace-per-service, scoped to source='sheet'. ──
  // Group this run's sheet price entries by vet+service. For each group we
  // compare against existing SHEET prices for that vet+service and compute:
  //   • adds    — sheet prices not already present
  //   • removes — old sheet prices no longer in the sheet (replace semantics)
  // Non-sheet prices (manual/scraper/community) are NEVER touched here. After
  // reconciling, if a vet+service ends up with both sheet and non-sheet prices,
  // the whole group is flagged in_conflict for admin review.

  // Resolve each priceInsert to a concrete vetKey (skip scheduled placeholders
  // in dry-run; in live mode they resolve after pending vets are created).
  function vetKeyFor(vetRef, resolvedId) {
    if (vetRef.type === "vet")
      return { key: `v:${vetRef.id}`, id: vetRef.id, isPending: false };
    if (vetRef.type === "pending")
      return { key: `p:${vetRef.id}`, id: vetRef.id, isPending: true };
    if (resolvedId)
      return { key: `p:${resolvedId}`, id: resolvedId, isPending: true };
    return null;
  }

  // Signature for comparing a sheet entry to an existing sheet row.
  // Numbers are normalized so 61.5 and 61.50 compare equal (avoids churn),
  // while genuinely different values (61.75 vs 61.7586) stay distinct.
  function numKey(n) {
    if (n == null || n === "") return "";
    const f = Number(n);
    return Number.isNaN(f) ? String(n) : String(f);
  }
  function entrySig(entry) {
    return entry.call_for_quote
      ? "declined"
      : `${numKey(entry.price_low)}|${numKey(entry.price_high)}|${entry.price_type ?? ""}`;
  }
  function rowSig(row) {
    return row.call_for_quote
      ? "declined"
      : `${numKey(row.price_low)}|${numKey(row.price_high)}|${row.price_type ?? ""}`;
  }

  // What the sheet currently holds for a vet+service, as something to read.
  // Stored on an Admin-owned price so the Prices tab can say "the call sheet
  // says $50–$70" beside the overridden number — and because the sync rewrites
  // it every run, that line stays true as the sheet changes rather than being
  // a snapshot from whenever the override was made.
  //
  // Deliberately a display string, not numbers. It exists to be shown to a
  // person comparing two values by eye; nothing computes with it.
  function money(n) {
    const num = Number(n);
    if (Number.isNaN(num)) return String(n);
    return num % 1 === 0
      ? `$${num.toLocaleString("en-US")}`
      : `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  function sheetValueText(entries) {
    if (!entries || entries.length === 0) return null;
    const parts = entries.map((e) => {
      if (e.call_for_quote) return "Call for quote";
      if (e.price_type === "starting") return `${money(e.price_low)}+`;
      if (e.price_type === "range" && e.price_high != null)
        return `${money(e.price_low)}–${money(e.price_high)}`;
      return money(e.price_low);
    });
    // A cell holding "45/55" produced two entries; show both the way the cell
    // reads rather than picking one and hiding the other.
    return parts.join(" / ");
  }

  // Build the payload for a sheet price entry.
  //
  // `carriedNote` is a note written in Admin against the sheet row this one
  // replaces — see the reconciliation below. The sheet never supplies a note
  // of its own any more, so this is the only way `notes` gets a value here,
  // and it is always something a person typed in Admin rather than anything
  // read out of a cell.
  function buildPayload(
    entry,
    serviceId,
    region,
    vetId,
    isPending,
    carriedNote,
  ) {
    const base = entry.call_for_quote
      ? {
          service_id: serviceId,
          price_low: null,
          price_high: null,
          price_type: null,
          call_for_quote: true,
          // Nothing carried onto a declined row. A clinic that has stopped
          // sharing a price has changed its answer, not its price, and a note
          // explaining what the old number included would be left standing
          // over "Call for quote".
          notes: null,
          is_verified: true,
          source: "sheet",
          region: region || null,
        }
      : {
          service_id: serviceId,
          price_low: entry.price_low,
          price_high: entry.price_high,
          price_type: entry.price_type,
          call_for_quote: false,
          notes: carriedNote || null,
          is_verified: true,
          source: "sheet",
          region: region || null,
        };
    if (isPending) {
      base.pending_vet_id = vetId;
      base.vet_id = null;
    } else {
      base.vet_id = vetId;
    }
    return base;
  }

  // In dry-run we can't create pending vets, so scheduled refs have no id yet.
  // We still report their adds (as brand-new vets' prices) but can't diff them.
  function planGroups(resolveScheduledId) {
    // Map: vsKey -> { vetId, isPending, serviceId, region, entries:[], vetName, svcName }
    const groups = new Map();
    for (const p of priceInserts) {
      let resolvedId = null;
      if (p._vetRef.type === "scheduled") {
        resolvedId = resolveScheduledId
          ? resolveScheduledId(p._vetRef.index)
          : null;
      }
      const vk = vetKeyFor(p._vetRef, resolvedId);
      if (!vk) continue; // scheduled with no id (dry-run) — handled separately below
      const vsKey = `${vk.key}:${p._serviceId}`;
      if (!groups.has(vsKey)) {
        groups.set(vsKey, {
          vsKey,
          vetId: vk.id,
          isPending: vk.isPending,
          serviceId: p._serviceId,
          region: p._region,
          entries: [],
          vetName: p._vetName,
          svcName: p._svcName,
        });
      }
      groups.get(vsKey).entries.push(p._entry);
    }
    return groups;
  }

  // Scheduled (brand-new) vets in dry-run: their prices are all pure adds.
  const scheduledAddCount = dryRun
    ? priceInserts.filter((p) => p._vetRef.type === "scheduled").length
    : 0;

  if (dryRun) {
    const groups = planGroups(null);
    for (const g of groups.values()) {
      const existing = pricesByVetService.get(g.vsKey) || [];
      const existingSheet = existing.filter((r) => r.source === "sheet");
      const existingNonSheet = existing.filter((r) => r.source !== "sheet");

      // Admin has taken this one over — leave it alone and say so. Reported
      // here as well as in the live run, so the preview tells you what the
      // sync is going to decline to touch before you commit to it.
      if (existing.some((r) => r.source === "admin")) {
        results.pricesLocked++;
        results.lockedList.push(
          `${g.vetName} — ${g.svcName}: sheet says ${
            sheetValueText(g.entries) || "nothing"
          }, Admin's value stands`,
        );
        continue;
      }

      const newSigs = new Set(g.entries.map(entrySig));
      const oldSigs = new Set(existingSheet.map(rowSig));

      // Adds: new sheet entries whose signature isn't already a sheet row.
      for (const e of g.entries) {
        if (oldSigs.has(entrySig(e))) {
          results.pricesSkipped++;
        } else {
          results.pricesAdded++;
        }
      }
      // Removes: existing sheet rows whose signature is gone from the sheet.
      for (const r of existingSheet) {
        if (!newSigs.has(rowSig(r))) {
          results.pricesRemoved++;
          results.removedList.push(
            `${g.vetName} — ${g.svcName}: ${
              r.call_for_quote
                ? "call for quote"
                : `$${r.price_low}${r.price_high ? "–$" + r.price_high : ""}`
            }`,
          );
        }
      }
      // Conflict: the group will hold both sheet and non-sheet prices AND
      // they disagree. The value check was added to the live run but not
      // here, so the preview counted every co-existing pair as a dispute and
      // reported conflicts the sync then didn't flag — a preview that doesn't
      // predict the run is worse than no preview.
      const nonSheetSigsDry = new Set(existingNonSheet.map(rowSig));
      const valuesDifferDry =
        existingNonSheet.some((r) => !newSigs.has(rowSig(r))) ||
        g.entries.some((e) => !nonSheetSigsDry.has(entrySig(e)));
      if (
        existingNonSheet.length > 0 &&
        g.entries.length > 0 &&
        valuesDifferDry
      ) {
        results.conflictsFound++;
        results.conflictList.push(`${g.vetName} — ${g.svcName}`);
      }
    }
    results.pricesAdded += scheduledAddCount;

    results.matched =
      results.exactMatched + results.relaxedMatched + results.autoCreated;
    return Response.json({
      success: true,
      ...results,
      summary: buildSummary(results),
    });
  }

  // ── LIVE MODE ──
  // 1. Create any brand-new pending vets first (so scheduled refs resolve).
  const createdRows = await batchInsert(
    "pending_vets",
    pendingVetsToCreate,
    "id",
    results.errors,
    "pending_vets",
  );
  const createdVetIds = createdRows.map((r) => (r ? r.id : null));

  // 2. Apply vet accepting/carecredit flag updates.
  for (const upd of vetFlagUpdates) {
    const { error } = await supabase
      .from(upd.table)
      .update(upd.updates)
      .eq("id", upd.id);
    if (error) {
      results.errors.push(
        `Flag update failed for ${upd.table} id ${upd.id}: ${error.message}`,
      );
    }
  }

  // 3. Reconcile prices per vet+service.
  const groups = planGroups((idx) => createdVetIds[idx]);
  const idsToDelete = [];
  const pricesToInsert = [];
  const conflictKeysToFlag = []; // { vetId, isPending, serviceId }
  const sheetValueUpdates = []; // { ids:[], text } — for locked groups

  for (const g of groups.values()) {
    if (!g.vetId) continue; // scheduled vet failed to create
    const existing = pricesByVetService.get(g.vsKey) || [];
    const existingSheet = existing.filter((r) => r.source === "sheet");
    const existingNonSheet = existing.filter((r) => r.source !== "sheet");

    // ── Admin override ──
    // The sheet is where prices are entered in bulk; Admin is where they're
    // finalised. So a price someone edited in Admin wins, and this whole
    // vet+service is left alone: nothing inserted, nothing deleted, no
    // conflict raised. Without the skip, the reconciliation below would see
    // an Admin value the sheet doesn't contain, delete it as a stale sheet
    // row, and put the sheet's number back — which is exactly the silent
    // reversal that made the Edit button get taken away in the first place.
    //
    // The group's own sheet rows (a second price from a "45/55" cell, say)
    // are frozen too. That's the honest reading of "Admin owns this service
    // for this clinic", rather than half the service syncing and half not.
    const adminRows = existing.filter((r) => r.source === "admin");
    if (adminRows.length > 0) {
      results.pricesLocked++;
      const text = sheetValueText(g.entries);
      results.lockedList.push(
        `${g.vetName} — ${g.svcName}: sheet says ${
          text || "nothing"
        }, Admin's value stands`,
      );
      // Refresh what the sheet says on the overriding rows, so the Prices tab
      // can show it and keep showing the truth as the sheet changes.
      const stale = adminRows.filter((r) => (r.sheet_value || null) !== text);
      if (stale.length > 0) {
        sheetValueUpdates.push({ ids: stale.map((r) => r.id), text });
      }
      continue;
    }

    const newSigs = new Set(g.entries.map(entrySig));
    const oldSigs = new Set(existingSheet.map(rowSig));

    // Delete old sheet rows no longer present in the sheet.
    const departing = [];
    for (const r of existingSheet) {
      if (!newSigs.has(rowSig(r))) {
        idsToDelete.push(r.id);
        departing.push(r);
        results.pricesRemoved++;
        results.removedList.push(
          `${g.vetName} — ${g.svcName}: ${
            r.call_for_quote
              ? "call for quote"
              : `$${r.price_low}${r.price_high ? "–$" + r.price_high : ""}`
          }`,
        );
      }
    }
    // Insert new sheet entries not already present.
    const arriving = [];
    for (const e of g.entries) {
      if (oldSigs.has(entrySig(e))) {
        results.pricesSkipped++;
      } else {
        arriving.push(e);
      }
    }

    // A changed price is a delete plus an insert, which used to take any note
    // written in Admin against that price down with it — Susan edits $50 to
    // $65 and "includes the exam", still true, silently disappears from the
    // vet page. Carry those notes onto the replacements.
    //
    // Only when the counts line up, which covers the real cases: one price
    // changing (1→1), and a whole multi-price cell being rewritten (n→n). An
    // uneven swap — two prices becoming one, or one becoming three — has no
    // honest mapping, so nothing is carried rather than guessing which new
    // number a note belonged to.
    const carryNotes =
      departing.length > 0 &&
      departing.length === arriving.length &&
      departing.some((r) => r.notes);

    for (let i = 0; i < arriving.length; i++) {
      pricesToInsert.push(
        buildPayload(
          arriving[i],
          g.serviceId,
          g.region,
          g.vetId,
          g.isPending,
          carryNotes ? departing[i].notes : null,
        ),
      );
    }
    // Flag a conflict only when the values actually disagree. This used to
    // fire whenever a service had both a sheet and a non-sheet price, without
    // comparing them — so Susan entering the same price in Admin and in the
    // call sheet flagged it as a dispute and hid both from the vet's page.
    // Of 527 flagged, 433 were identical. Two sources agreeing is
    // confirmation, not a conflict.
    const nonSheetSigs = new Set(existingNonSheet.map(rowSig));
    const valuesDiffer =
      existingNonSheet.some((r) => !newSigs.has(rowSig(r))) ||
      g.entries.some((e) => !nonSheetSigs.has(entrySig(e)));
    if (existingNonSheet.length > 0 && g.entries.length > 0 && valuesDiffer) {
      conflictKeysToFlag.push({
        vetId: g.vetId,
        isPending: g.isPending,
        serviceId: g.serviceId,
      });
    }
  }

  // 4. Execute deletes (old sheet rows).
  for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
    const batch = idsToDelete.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("vet_prices")
      .delete()
      .in("id", batch);
    if (error) {
      results.errors.push(`vet_prices delete failed: ${error.message}`);
    }
  }

  // 5. Execute inserts (new sheet rows).
  for (let i = 0; i < pricesToInsert.length; i += BATCH_SIZE) {
    const batch = pricesToInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("vet_prices").insert(batch);
    if (error) {
      results.errors.push(
        `vet_prices batch failed at index ${i}: ${error.message}`,
      );
      continue;
    }
    results.pricesAdded += batch.length;
  }

  // 5b. Refresh "the call sheet says …" on Admin-owned prices whose sheet
  //     cell has changed since the override was made. Nothing else about
  //     those rows is touched — this writes one display-only column so the
  //     Prices tab can show the two values side by side. Grouped by text so
  //     identical values go out in one statement rather than one per row.
  const byText = new Map();
  for (const u of sheetValueUpdates) {
    const key = u.text ?? "";
    if (!byText.has(key)) byText.set(key, []);
    byText.get(key).push(...u.ids);
  }
  for (const [text, ids] of byText.entries()) {
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("vet_prices")
        .update({ sheet_value: text || null })
        .in("id", batch);
      if (error) {
        results.errors.push(`sheet_value refresh failed: ${error.message}`);
      }
    }
  }

  // 6. Flag conflicts (set in_conflict + conflict_key on all rows for each
  //    conflicted vet+service).
  for (const c of conflictKeysToFlag) {
    const conflictKey = `${c.vetId}:${c.serviceId}`;
    let q = supabase
      .from("vet_prices")
      .update({ in_conflict: true, conflict_key: conflictKey })
      .eq("service_id", c.serviceId);
    q = c.isPending ? q.eq("pending_vet_id", c.vetId) : q.eq("vet_id", c.vetId);
    const { error } = await q;
    if (error) {
      results.errors.push(`Conflict flag failed: ${error.message}`);
    } else {
      results.conflictsFound++;
      results.conflictList.push(conflictKey);
    }
  }

  results.matched =
    results.exactMatched + results.relaxedMatched + results.autoCreated;

  return Response.json({
    success: true,
    ...results,
    summary: buildSummary(results),
  });
}

function buildSummary(r) {
  const verb = r.dryRun ? "would be" : "";
  return (
    `Processed ${r.processed} rows — ` +
    `${r.exactMatched} exact matches, ` +
    `${r.relaxedMatched} relaxed matches, ` +
    `${r.autoCreated} auto-created pending vets. ` +
    `${r.pricesAdded} prices ${r.dryRun ? "would be added" : "added"}, ` +
    `${r.pricesRemoved} ${verb} removed, ` +
    `${r.pricesSkipped} unchanged, ` +
    // Named in the summary rather than left to the detail lists. A number the
    // sync declined to change is the one thing someone reading this needs to
    // know about and can't infer from the others.
    `${r.pricesLocked} left to Admin, ` +
    `${r.conflictsFound} conflict${r.conflictsFound !== 1 ? "s" : ""} flagged, ` +
    `${r.notFound.length} rows dropped (no phone/address).`
  );
}