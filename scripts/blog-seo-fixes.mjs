// FILE: scripts/blog-seo-fixes.mjs
// One-time cleanup for the articles already in Sanity. It only changes:
//   1. the Google description of the five price articles (shorter, and no
//      longer says how many clinics we have)
//   2. phone numbers inside callout boxes, which become tap-to-call links
//   3. author titles that still say PetParrk ("Founder, PetParrk" → "Founder, Nehalyn")
// Nothing else is touched. Safe to run more than once.
//
// Run from the project folder:
//   npx sanity exec scripts/blog-seo-fixes.mjs --with-user-token
import { getCliClient } from "sanity/cli";

const client = getCliClient({ apiVersion: "2026-10-01" });

const DESCRIPTIONS = {
  "dog-teeth-cleaning-cost-california":
    "Most California clinics charge $650 to $1,300 for a dog dental cleaning. See what drives the price, what's included, and what to ask before you book.",
  "dog-spay-neuter-cost-california":
    "Most California clinics charge $550 to $950 to spay a dog and $460 to $850 to neuter. See what's usually included and why prices vary so much.",
  "dog-vet-visit-cost-california":
    "A dog vet exam costs $65 to $92 at most California clinics. See what's included, why prices vary, and the cheaper vet tech visit most owners miss.",
  "dog-vaccine-cost-california":
    "Most dog vaccines cost $30 to $60 each in California. Prices for rabies, DHPP, Bordetella, canine flu and lepto, plus the exam fee people forget.",
  "dog-emergency-vet-cost-california":
    "An emergency vet visit costs $100 to $179 just to be seen at most California clinics, and urgent care $85 to $132. Here's how to know which you need.",
};

// "(888) 426-4435" → "[(888) 426-4435](tel:+18884264435)", unless already a link.
const PHONE = /(?<!\[)\((\d{3})\) (\d{3})-(\d{4})(?!\]\()/g;
const linkPhones = (text) =>
  text.replace(PHONE, (m, a, b, c) => `[${m}](tel:+1${a}${b}${c})`);

const posts = await client.fetch(
  `*[_type == "post"]{ _id, title, description, "slug": slug.current, body[]{ _key, _type, text } }`,
);

let changed = 0;
for (const p of posts) {
  const set = {};
  const want = DESCRIPTIONS[p.slug];
  if (want && p.description !== want) set.description = want;
  for (const b of p.body || []) {
    if (b._type !== "callout" || !b.text) continue;
    const fixed = linkPhones(b.text);
    if (fixed !== b.text) set[`body[_key=="${b._key}"].text`] = fixed;
  }
  const n = Object.keys(set).length;
  if (n === 0) continue;
  await client.patch(p._id).set(set).commit();
  changed++;
  console.log(`Updated: ${p.title}${p._id.startsWith("drafts.") ? " (draft)" : ""}`);
  for (const k of Object.keys(set)) console.log(`   - ${k.startsWith("body") ? "phone number link" : k}`);
}
const authors = await client.fetch(`*[_type == "author" && role match "PetParrk"]{ _id, name, role }`);
for (const a of authors) {
  const role = a.role.replace(/PetParrk/g, "Nehalyn");
  await client.patch(a._id).set({ role }).commit();
  changed++;
  console.log(`Updated author: ${a.name} → "${role}"`);
}

console.log(changed ? `Done. ${changed} change(s) made.` : "Done. Nothing needed changing.");
