// app/api/vets/nearby/route.js
//
// POST { lat, lng }   or   { zip }
//      + triage, differentials, species (all optional)
// → { primary, specialists, covered, matched_specialties }
//
// The one place that decides which vets are "near you". The symptom checker
// and the home page both call it, so they can't disagree.
//
// Open to guests on purpose: a worried owner shouldn't need an account to find
// the nearest emergency vet. The ranking itself lives in lib/vetRanking.js.

import { createClient } from "@supabase/supabase-js";
import { rankVets } from "../../../../lib/vetRanking";

// ZIP → coordinates is a paid Google call, so each ZIP is looked up once per
// server instance. "Use my location" sends coordinates directly and never
// touches Google at all.
const zipCache = new Map();

async function coordsForZip(zip) {
  if (zipCache.has(zip)) return zipCache.get(zip);
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      "https://maps.googleapis.com/maps/api/geocode/json?components=postal_code:" +
        zip +
        "|country:US&key=" +
        key,
    );
    const data = await res.json();
    const loc = data.results?.[0]?.geometry?.location;
    if (!loc) return null;
    const coords = { lat: loc.lat, lng: loc.lng };
    zipCache.set(zip, coords);
    return coords;
  } catch (err) {
    console.error("[nearby] ZIP lookup failed:", err?.message);
    return null;
  }
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const { zip, triage, differentials, species } = body || {};
  let { lat, lng } = body || {};

  if (typeof lat !== "number" || typeof lng !== "number") {
    const z = String(zip || "").trim();
    if (!/^\d{5}$/.test(z)) {
      return Response.json({ error: "zip_invalid" }, { status: 400 });
    }
    const coords = await coordsForZip(z);
    if (!coords) {
      return Response.json({ error: "zip_not_found" }, { status: 404 });
    }
    ({ lat, lng } = coords);
  }

  // Public vet data, so the anon client is enough — no reason to reach for
  // the service role here.
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
  const { data: vets, error } = await db
    .from("vets")
    .select(
      "id, slug, name, phone, address, city, hours, vet_type, specialties, dogs_cats_only, latitude, longitude, accepting_new_patients, carecredit",
    )
    .eq("status", "active")
    .not("latitude", "is", null);

  if (error) {
    console.error("[nearby] vet query failed:", error.message);
    return Response.json({ error: "lookup_failed" }, { status: 500 });
  }

  const result = rankVets({
    vets,
    lat,
    lng,
    triage: typeof triage === "string" ? triage : null,
    differentials: Array.isArray(differentials) ? differentials : [],
    species: typeof species === "string" ? species : "",
  });

  // Echo the resolved point so the page can remember it without a second
  // lookup next time.
  return Response.json({ ...result, lat, lng });
}
