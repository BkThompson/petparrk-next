// scripts/backfill-vet-coords.js
//
// One-off: give every active vet a latitude and longitude, so "vets near you"
// can use real distance instead of matching ZIP-code prefixes.
//
// Before this, 24 of 79 active vets had coordinates. Ranking by distance with
// that coverage would silently drop two thirds of the directory, so this runs
// first.
//
// Usage, from the project root:
//   node --env-file=.env.local scripts/backfill-vet-coords.js          (preview)
//   node --env-file=.env.local scripts/backfill-vet-coords.js --write  (saves)
//
// Always do the preview first. It prints what it would write and changes
// nothing, so you can check a few coordinates against a map before committing.
//
// Uses import because scripts/package.json sets "type": "module", which makes
// every .js file in this folder an ES module — require() is not available.
//
// Needs in .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (writes past row-level security)
//   GOOGLE_PLACES_API_KEY       (the rotated key; it has the Geocoding API)

import { createClient } from "@supabase/supabase-js";

const WRITE = process.argv.includes("--write");
const DELAY_MS = 150; // well under Google's rate limit; 55 vets takes ~10s

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const googleKey = process.env.GOOGLE_PLACES_API_KEY;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocode(vet) {
  if (!vet.address) return { error: "no street address" };
  const parts = [vet.address, vet.city, vet.state || "CA", vet.zip_code]
    .filter(Boolean)
    .join(", ");

  const res = await fetch(
    "https://maps.googleapis.com/maps/api/geocode/json?address=" +
      encodeURIComponent(parts) +
      "&key=" +
      googleKey,
  );
  const data = await res.json();
  if (data.status !== "OK" || !data.results || !data.results[0]) {
    return { error: data.status || "no result" };
  }
  const r = data.results[0];
  const { lat, lng } = r.geometry.location;
  // ROOFTOP is a real building match. Anything coarser — a street, a ZIP
  // centroid — is flagged so it can be checked rather than trusted blindly.
  return { lat, lng, precision: r.geometry.location_type };
}

async function main() {
  for (const [name, v] of [
    ["NEXT_PUBLIC_SUPABASE_URL", url],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceKey],
    ["GOOGLE_PLACES_API_KEY", googleKey],
  ]) {
    if (!v) {
      console.error(`Missing ${name} — run with --env-file=.env.local`);
      process.exit(1);
    }
  }

  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: vets, error } = await db
    .from("vets")
    .select("id, name, address, city, state, zip_code, latitude, longitude")
    .eq("status", "active")
    .or("latitude.is.null,longitude.is.null");

  if (error) {
    console.error("Could not read vets:", error.message);
    process.exit(1);
  }

  console.log(
    `${vets.length} active vets missing coordinates. ` +
      (WRITE ? "WRITING." : "Preview only — nothing will be saved.") +
      "\n",
  );

  let ok = 0;
  let approx = 0;
  const failed = [];

  for (const vet of vets) {
    const g = await geocode(vet);
    if (g.error) {
      failed.push(`${vet.name} — ${g.error}`);
      console.log(`  ✗ ${vet.name}: ${g.error}`);
    } else {
      const flag =
        g.precision === "ROOFTOP" ? "" : `  [${g.precision} — check this]`;
      if (flag) approx++;
      console.log(
        `  ✓ ${vet.name}: ${g.lat.toFixed(5)}, ${g.lng.toFixed(5)}${flag}`,
      );
      if (WRITE) {
        const { error: upErr } = await db
          .from("vets")
          .update({ latitude: g.lat, longitude: g.lng })
          .eq("id", vet.id);
        if (upErr) {
          failed.push(`${vet.name} — save failed: ${upErr.message}`);
          continue;
        }
      }
      ok++;
    }
    await sleep(DELAY_MS);
  }

  console.log(
    `\n${ok} geocoded, ${approx} approximate, ${failed.length} failed.`,
  );
  if (failed.length) {
    console.log("\nNeeds a manual look:");
    failed.forEach((f) => console.log("  - " + f));
  }
  if (!WRITE) console.log("\nPreview only. Re-run with --write to save.");
}

main().catch((err) => {
  console.error("Backfill failed:", err.message);
  process.exit(1);
});
