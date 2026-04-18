#!/usr/bin/env node

// ── Import NorCal and SoCal VA call sheet vets into pending_vets ──────────────
// Usage: node import-va-vets.js
// Reads both CSV files, deduplicates against existing DB, inserts as pending

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Clean website URL ─────────────────────────────────────────────────────────
function cleanWebsiteUrl(url) {
  if (!url) return null;
  return (
    url
      .replace(/\?.*$/, "")
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .trim() || null
  );
}

// ── Format hours — fix uppercase AM/PM and normalize dashes ──────────────────
function formatHours(hours) {
  if (!hours) return null;
  return hours
    .replace(/\bAM\b/g, "am")
    .replace(/\bPM\b/g, "pm")
    .replace(/\s*[-–—]\s*/g, " – ")
    .trim();
}

// ── Normalize name for duplicate detection ────────────────────────────────────
function normalizeName(name) {
  return (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// ── Parse a CSV file and return data rows ─────────────────────────────────────
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const rows = parse(content, { relax_column_count: true, skip_empty_lines: false });
  // Data starts at row 4 (index 3), skip example row (index 3), real data from index 4
  const headers = rows[2]; // row index 2 = header row
  const dataRows = rows.slice(4).filter(r => r[0] && r[0].trim().match(/^\d+$/));
  return { headers, dataRows };
}

async function main() {
  console.log("🐾 Starting VA call sheet import...\n");

  // Load existing vets and pending_vets to check for duplicates
  const { data: existingVets } = await supabase.from("vets").select("name, phone");
  const { data: existingPending } = await supabase.from("pending_vets").select("name, phone");

  const existingNames = new Set([
    ...(existingVets || []).map(v => normalizeName(v.name)),
    ...(existingPending || []).map(v => normalizeName(v.name)),
  ]);
  const existingPhones = new Set([
    ...(existingVets || []).map(v => v.phone).filter(Boolean),
    ...(existingPending || []).map(v => v.phone).filter(Boolean),
  ]);

  console.log(`📋 Found ${existingNames.size} existing vets/pending to check against\n`);

  const files = [
    { path: "./NorCal_VA_Call_Sheet.xlsx - Call & Price Log.csv", region: "NorCal", state: "CA" },
    { path: "./SoCal_VA_Call_Sheet.xlsx - Call & Price Log.csv", region: "SoCal", state: "CA" },
  ];

  let totalAdded = 0;
  let totalSkipped = 0;
  let totalErrors = [];

  for (const file of files) {
    console.log(`📂 Processing ${file.region}...`);

    let rows;
    try {
      const { dataRows } = parseCSV(file.path);
      rows = dataRows;
    } catch (err) {
      console.error(`❌ Could not read ${file.path}:`, err.message);
      continue;
    }

    let added = 0;
    let skipped = 0;

    for (const row of rows) {
      const name = (row[1] || "").trim();
      const phone = (row[2] || "").trim() || null;
      const address = (row[3] || "").trim() || null;
      const city = (row[4] || "").trim() || null;
      const zip = (row[5] || "").trim() || null;
      const vetType = (row[6] || "General Practice").trim();
      const hours = formatHours((row[7] || "").trim() || null);

      if (!name) { skipped++; continue; }

      // Duplicate check by name or phone
      if (existingNames.has(normalizeName(name))) {
        skipped++;
        continue;
      }
      if (phone && existingPhones.has(phone)) {
        skipped++;
        continue;
      }

      // Generate slug
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const { error } = await supabase.from("pending_vets").insert({
        name,
        phone,
        address,
        city,
        state: file.state,
        zip_code: zip,
        hours,
        vet_type: [vetType],
        website: null,
        neighborhood: null,
        status: "pending",
        source: `VA Call Sheet - ${file.region}`,
      });

      if (error) {
        totalErrors.push(`${name}: ${error.message}`);
      } else {
        added++;
        totalAdded++;
        existingNames.add(normalizeName(name));
        if (phone) existingPhones.add(phone);
      }

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 50));
    }

    console.log(`   ✅ Added: ${added} | Skipped (duplicates): ${skipped}\n`);
    totalSkipped += skipped;
  }

  console.log("─────────────────────────────────────────────");
  console.log(`🎉 Import complete!`);
  console.log(`   Total added:   ${totalAdded}`);
  console.log(`   Total skipped: ${totalSkipped}`);
  if (totalErrors.length > 0) {
    console.log(`   Errors (${totalErrors.length}):`);
    totalErrors.slice(0, 10).forEach(e => console.log(`   ⚠️  ${e}`));
  }
  console.log("\nNext step: run the batch fixer to auto-populate neighborhoods and clean hours:");
  console.log("  node run-fix.js (with table=pending_vets)");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
