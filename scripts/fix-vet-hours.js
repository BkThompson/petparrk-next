// scripts/fix-vet-hours.js
//
// Finds active vets whose opening hours the site can't read, looks them up on
// Google Places, and rewrites the hours in a format the parser understands.
//
// Why this exists: "Open now" stays silent when hours can't be parsed — better
// than sending someone to a locked door. But free-text hours like "Call for
// hours" or "M-F 8-6" can't be read, so those vets never show it. Google
// Places returns hours already formatted as "Monday: 9:00 AM – 6:00 PM", which
// is exactly what the parser reads, so this fixes the data rather than asking
// anyone to retype it.
//
// Usage, from the project root:
//   node --env-file=.env.local scripts/fix-vet-hours.js          (preview)
//   node --env-file=.env.local scripts/fix-vet-hours.js --write  (saves)
//
// Always preview first. It prints the current hours and the proposed
// replacement for each vet, and changes nothing.
//
// Needs in .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   GOOGLE_PLACES_API_KEY    (the rotated key; it has the Places API)

import { createClient } from "@supabase/supabase-js";
import { isOpenNow } from "../lib/vetRanking.js";

const WRITE = process.argv.includes("--write");
const DELAY_MS = 200; // two Places calls per vet; stay polite

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const googleKey = process.env.GOOGLE_PLACES_API_KEY;

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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Readable on every day of the week? Anything less and the vet will be silent
// on at least one day.
function fullyReadable(hours) {
  if (!hours || !String(hours).trim()) return false;
  return [0, 1, 2, 3, 4, 5, 6].every(
    (day) => isOpenNow(hours, { day, minutes: 12 * 60 }) !== null,
  );
}

async function hoursFromGoogle(vet) {
  const query = [vet.name, vet.address, vet.city, vet.state || "CA"]
    .filter(Boolean)
    .join(", ");

  const findRes = await fetch(
    "https://maps.googleapis.com/maps/api/place/findplacefromtext/json" +
      "?input=" +
      encodeURIComponent(query) +
      "&inputtype=textquery&fields=place_id,name&key=" +
      googleKey,
  );
  const find = await findRes.json();
  const candidate = find.candidates?.[0];
  if (!candidate?.place_id) return { error: find.status || "no match" };

  await sleep(DELAY_MS);

  const detRes = await fetch(
    "https://maps.googleapis.com/maps/api/place/details/json?place_id=" +
      candidate.place_id +
      "&fields=name,opening_hours&key=" +
      googleKey,
  );
  const det = await detRes.json();
  const weekday = det.result?.opening_hours?.weekday_text;
  if (!weekday || !weekday.length) {
    return { error: "no hours published", matchedName: det.result?.name };
  }
  return { hours: weekday.join("\n"), matchedName: det.result?.name };
}

const { data: vets, error } = await db
  .from("vets")
  .select("id, name, address, city, state, hours")
  .eq("status", "active")
  .order("name");

if (error) {
  console.error("Could not read vets:", error.message);
  process.exit(1);
}

const needsFixing = vets.filter((v) => !fullyReadable(v.hours));
console.log(
  `${vets.length} active vets. ${vets.length - needsFixing.length} already readable, ` +
    `${needsFixing.length} to look up. ` +
    (WRITE ? "WRITING." : "Preview only — nothing will be saved.") +
    "\n",
);

let fixed = 0;
const failed = [];

for (const vet of needsFixing) {
  const g = await hoursFromGoogle(vet);
  if (g.error) {
    failed.push(`${vet.name} — ${g.error}`);
    console.log(`  ✗ ${vet.name}: ${g.error}`);
    await sleep(DELAY_MS);
    continue;
  }

  // Google matched something — but a wrong match would overwrite good data
  // with another clinic's hours, so flag any name that doesn't look the same.
  const a = vet.name.toLowerCase().replace(/[^a-z]/g, "");
  const b = (g.matchedName || "").toLowerCase().replace(/[^a-z]/g, "");
  const looksRight = a.includes(b.slice(0, 10)) || b.includes(a.slice(0, 10));

  // And only accept hours the parser can actually read, or we've swapped one
  // unreadable value for another.
  if (!fullyReadable(g.hours)) {
    failed.push(`${vet.name} — Google's hours still aren't readable`);
    console.log(`  ✗ ${vet.name}: Google's hours still aren't readable`);
    await sleep(DELAY_MS);
    continue;
  }

  console.log(
    `  ✓ ${vet.name}${looksRight ? "" : `  [matched "${g.matchedName}" — CHECK THIS]`}`,
  );
  console.log(
    `      was:  ${String(vet.hours || "(empty)")
      .replace(/\n/g, " | ")
      .slice(0, 90)}`,
  );
  console.log(`      now:  ${g.hours.replace(/\n/g, " | ").slice(0, 90)}`);

  if (WRITE) {
    if (!looksRight) {
      console.log("      skipped — name mismatch, fix this one by hand");
      failed.push(`${vet.name} — name mismatch with "${g.matchedName}"`);
      await sleep(DELAY_MS);
      continue;
    }
    const { error: upErr } = await db
      .from("vets")
      .update({ hours: g.hours })
      .eq("id", vet.id);
    if (upErr) {
      failed.push(`${vet.name} — save failed: ${upErr.message}`);
      await sleep(DELAY_MS);
      continue;
    }
  }
  fixed++;
  await sleep(DELAY_MS);
}

console.log(
  `\n${fixed} ${WRITE ? "updated" : "would be updated"}, ${failed.length} need a manual look.`,
);
if (failed.length) {
  console.log("\nManual:");
  failed.forEach((f) => console.log("  - " + f));
}
if (!WRITE) console.log("\nPreview only. Re-run with --write to save.");
