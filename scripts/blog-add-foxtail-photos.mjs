// FILE: scripts/blog-add-foxtail-photos.mjs
// Puts the real foxtail photo into the Foxtails article in Sanity, after the
// paragraph that starts "Those barbs are the whole problem." It also removes
// any photos added by earlier versions of this script (the AI-generated ones
// and the sunlit-field photo), so only this one photo remains.
// Nothing else in the article changes. Safe to run more than once.
//
// Run from the project folder:
//   npx sanity exec scripts/blog-add-foxtail-photos.mjs --with-user-token
import fs from "node:fs";
import path from "node:path";
import { getCliClient } from "sanity/cli";

// "raw" = see drafts as well as published articles (by default Sanity hides drafts).
const client = getCliClient({ apiVersion: "2026-10-01" }).withConfig({ perspective: "raw" });
const DIR = path.join(process.cwd(), "scripts", "blog-images");

const PHOTOS = [
  {
    file: "foxtail-seed-heads.jpg",
    after: "Those barbs are the whole problem.",
    // Read aloud by screen readers in place of the photo, so it says what's
    // actually in the picture.
    alt: "Close-up of three dry, bristly foxtail seed heads on their stems",
  },
];

const textOf = (b) => (b.children || []).map((c) => c.text || "").join("");
const key = () => `ph${Math.random().toString(36).slice(2, 10)}`;

const docs = await client.fetch(
  `*[_type == "post" && (
     _id in ["post-foxtails-dogs-california", "drafts.post-foxtails-dogs-california"] ||
     slug.current in ["foxtails-and-dogs", "foxtails-dogs-california"]
   )]{ _id, body }`,
);
if (docs.length === 0) {
  console.log("Couldn't find the Foxtails article in Sanity. Check that it shows under Articles in /studio.");
  process.exit(1);
}

const assets = {};
for (const p of PHOTOS) {
  const asset = await client.assets.upload("image", fs.createReadStream(path.join(DIR, p.file)), {
    filename: p.file,
  });
  assets[p.file] = asset._id;
}

for (const d of docs) {
  const body = d.body || [];
  let tx = client.patch(d._id);
  let changes = 0;

  // Remove photos added by earlier versions of this script.
  for (const b of body) {
    const oldVersion =
      /AI-generated/i.test(b.credit || "") ||
      b.alt === "A patch of dry foxtail grass, its bristly seed heads lit by low sun";
    if (b._type === "photo" && oldVersion) {
      tx = tx.unset([`body[_key=="${b._key}"]`]);
      changes++;
    }
  }

  for (const p of PHOTOS) {
    if (body.some((b) => b._type === "photo" && b.alt === p.alt)) continue; // already there
    const anchor = body.find((b) => b._type === "block" && textOf(b).startsWith(p.after));
    if (!anchor) {
      console.log(`  ! couldn't find "${p.after}…", skipped`);
      continue;
    }
    tx = tx.insert("after", `body[_key=="${anchor._key}"]`, [
      { _type: "photo", _key: key(), asset: { _type: "reference", _ref: assets[p.file] }, alt: p.alt },
    ]);
    changes++;
  }

  if (changes) await tx.commit();
  console.log(`${d._id.startsWith("drafts.") ? "Draft" : "Published"} article: ${changes} change(s)`);
}
console.log("Done. Open the article in /studio and click Publish if it shows changes.");
