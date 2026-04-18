// ── PetParrk Vet Geocoder ──────────────────────────────────────────────────
// Looks up neighborhood + city for vets missing them using Google Geocoding API
// then updates your Supabase database.
//
// SETUP:
//   1. npm install @supabase/supabase-js node-fetch dotenv
//   2. Create a .env file in the same folder with:
//      GOOGLE_MAPS_API_KEY=your_key_here
//      SUPABASE_URL=your_supabase_url
//      SUPABASE_SERVICE_KEY=your_service_role_key  ← use service role, not anon
//   3. node geocode-vets.js --dry-run   (preview changes, nothing saved)
//   4. node geocode-vets.js             (apply changes to database)
//
// Run anytime you add new vets — it only processes vets missing neighborhood.

import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import * as dotenv from "dotenv";
dotenv.config({ path: "../.env.local" });

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const DRY_RUN = process.argv.includes("--dry-run");

// Google address component type priority for neighborhood
const NEIGHBORHOOD_TYPES = [
  "neighborhood",
  "sublocality_level_1",
  "sublocality",
];
const CITY_TYPES = ["locality", "administrative_area_level_3", "postal_town"];

function getComponent(components, types) {
  for (const type of types) {
    const match = components.find((c) => c.types.includes(type));
    if (match) return match.long_name;
  }
  return null;
}

async function geocodeAddress(address, city, state, zip) {
  const query = [address, city, state, zip].filter(Boolean).join(", ");
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK" || !data.results.length) {
    return null;
  }

  const components = data.results[0].address_components;
  const neighborhood = getComponent(components, NEIGHBORHOOD_TYPES);
  const city_result = getComponent(components, CITY_TYPES);

  return { neighborhood, city: city_result };
}

async function run() {
  console.log(
    `\n🐾 PetParrk Vet Geocoder ${DRY_RUN ? "(DRY RUN — no changes saved)" : ""}\n`,
  );

  if (!GOOGLE_KEY) {
    console.error("❌ GOOGLE_MAPS_API_KEY not set in .env");
    process.exit(1);
  }

  // Fetch vets missing neighborhood
  const { data: vets, error } = await supabase
    .from("vets")
    .select("id, name, address, city, state, zip_code, neighborhood")
    .eq("status", "active")
    .or("neighborhood.is.null,neighborhood.eq.");

  if (error) {
    console.error("❌ Supabase error:", error.message);
    process.exit(1);
  }

  if (!vets.length) {
    console.log(
      "✅ All active vets already have neighborhoods. Nothing to do.",
    );
    return;
  }

  console.log(`Found ${vets.length} vets missing neighborhood:\n`);

  const updates = [];

  for (const vet of vets) {
    process.stdout.write(`  Looking up: ${vet.name}... `);

    if (!vet.address) {
      console.log("⚠️  No address — skipping");
      continue;
    }

    const result = await geocodeAddress(
      vet.address,
      vet.city,
      vet.state,
      vet.zip_code,
    );

    // Rate limit — Google allows 50 req/sec but be polite
    await new Promise((r) => setTimeout(r, 100));

    if (!result) {
      console.log("❌ No result from Google");
      continue;
    }

    const { neighborhood, city } = result;
    console.log(
      `✓ ${neighborhood || "no neighborhood"} · ${city || "no city"}`,
    );

    updates.push({
      id: vet.id,
      name: vet.name,
      neighborhood: neighborhood || vet.neighborhood,
      city: city || vet.city,
    });
  }

  console.log(`\n── Proposed updates (${updates.length}) ──────────────────\n`);
  updates.forEach((u) => {
    console.log(`  ${u.name}`);
    console.log(`    neighborhood: ${u.neighborhood}`);
    console.log(`    city:         ${u.city}\n`);
  });

  if (DRY_RUN) {
    console.log("DRY RUN complete — run without --dry-run to apply changes.\n");
    return;
  }

  console.log("Applying updates to Supabase...\n");

  let successCount = 0;
  for (const u of updates) {
    const { error } = await supabase
      .from("vets")
      .update({ neighborhood: u.neighborhood, city: u.city })
      .eq("id", u.id);

    if (error) {
      console.log(`  ❌ Failed: ${u.name} — ${error.message}`);
    } else {
      console.log(`  ✅ Updated: ${u.name}`);
      successCount++;
    }
  }

  console.log(`\nDone. ${successCount}/${updates.length} vets updated.\n`);
}

run().catch(console.error);
