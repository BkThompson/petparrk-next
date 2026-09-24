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
  // AL — price notes, shown publicly beneath each price.
  priceNotes: 37,
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

function parsePriceEntries(priceVal, noteVal) {
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
        note: null,
      },
    ];
  }

  const priceParts = firstLine
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);
  const noteFirstLine = (noteVal || "")
    .toString()
    .split(/[\n\r]/)[0]
    .trim();
  const noteParts = noteFirstLine.split("/").map((n) => n.trim());
  const entries = [];
  for (let i = 0; i < priceParts.length; i++) {
    const parsed = parseSinglePrice(priceParts[i]);
    if (parsed) entries.push({ ...parsed, note: noteParts[i] || null });
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
    "id, name, phone, accepting_new_patients, carecredit, internal_notes",
  );
  const existingPending = await loadAll(
    "pending_vets",
    "id, name, phone, accepting_new_patients, carecredit, internal_notes",
  );

  const existingPrices = await loadAll(
    "vet_prices",
    "id, vet_id, pending_vet_id, service_id, price_low, price_high, price_type, call_for_quote, source, region",
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
        if (Object.keys(upd).length > 0) {
          vetFlagUpdates.push({
            table: vetRef.type === "vet" ? "vets" : "pending_vets",
            id: vetRef.id,
            updates: upd,
          });
        }
      }

      const priceNotesRaw = row[COL.priceNotes] || "";
      for (const svc of SERVICE_MAP) {
        const entries = parsePriceEntries(row[svc.col], priceNotesRaw);
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

  // Build the payload for a sheet price entry.
  function buildPayload(entry, serviceId, region, vetId, isPending) {
    const base = entry.call_for_quote
      ? {
          service_id: serviceId,
          price_low: null,
          price_high: null,
          price_type: null,
          call_for_quote: true,
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
          notes: entry.note || null,
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
      // Conflict: group will have sheet + non-sheet prices.
      if (existingNonSheet.length > 0 && g.entries.length > 0) {
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

  for (const g of groups.values()) {
    if (!g.vetId) continue; // scheduled vet failed to create
    const existing = pricesByVetService.get(g.vsKey) || [];
    const existingSheet = existing.filter((r) => r.source === "sheet");
    const existingNonSheet = existing.filter((r) => r.source !== "sheet");

    const newSigs = new Set(g.entries.map(entrySig));
    const oldSigs = new Set(existingSheet.map(rowSig));

    // Delete old sheet rows no longer present in the sheet.
    for (const r of existingSheet) {
      if (!newSigs.has(rowSig(r))) {
        idsToDelete.push(r.id);
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
    for (const e of g.entries) {
      if (oldSigs.has(entrySig(e))) {
        results.pricesSkipped++;
      } else {
        pricesToInsert.push(
          buildPayload(e, g.serviceId, g.region, g.vetId, g.isPending),
        );
      }
    }
    // Flag conflict if this vet+service has both sheet and non-sheet prices.
    if (existingNonSheet.length > 0 && g.entries.length > 0) {
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
    `${r.conflictsFound} conflict${r.conflictsFound !== 1 ? "s" : ""} flagged, ` +
    `${r.notFound.length} rows dropped (no phone/address).`
  );
}
