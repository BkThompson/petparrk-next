#!/usr/bin/env node

// Usage:
//   node run-fix.js                                          (local)
//   node run-fix.js https://your-vercel-url.vercel.app      (production)

const BASE_URL = process.argv[2] || "http://localhost:3000";
const LIMIT = 20;

async function runBatch(offset, table) {
  const url = `${BASE_URL}/api/fix-vet-data?offset=${offset}&limit=${LIMIT}&table=${table}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

async function processTable(table) {
  console.log(`\n📋 Processing table: ${table}`);
  console.log("─────────────────────────────────────────────────");

  let offset = 0;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  while (true) {
    console.log(`⏳ Offset ${offset}...`);

    let data;
    try {
      data = await runBatch(offset, table);
    } catch (err) {
      console.error(`❌ Failed at offset ${offset}:`, err.message);
      break;
    }

    totalProcessed += data.processed || 0;
    totalUpdated += data.updated || 0;
    totalSkipped += data.skipped || 0;

    console.log(
      `   ✅ Processed: ${data.processed} | Updated: ${data.updated} | Skipped: ${data.skipped}`
    );

    if (data.changes && data.changes.length > 0) {
      data.changes.forEach((c) => {
        console.log(`   📝 ${c.name}: ${c.changes.join(", ")}`);
      });
    }

    if (data.errors && data.errors.length > 0) {
      data.errors.forEach((e) => {
        console.log(`   ⚠️  Error: ${e}`);
      });
    }

    if (data.done) {
      console.log(`\n✅ ${table} complete!`);
      console.log(`   Total processed: ${totalProcessed}`);
      console.log(`   Total updated:   ${totalUpdated}`);
      console.log(`   Total skipped:   ${totalSkipped}`);
      break;
    }

    offset += LIMIT;
    await new Promise((r) => setTimeout(r, 2000));
  }
}

async function main() {
  console.log(`🐾 Starting vet data batch fix against: ${BASE_URL}`);

  // Run on active vets first, then pending vets
  await processTable("vets");
  await processTable("pending_vets");

  console.log("\n🎉 All done! Both tables have been cleaned.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
