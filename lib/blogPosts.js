// FILE: lib/blogPosts.js
// ─────────────────────────────────────────────────────────────────────────────
// Where the blog gets its articles, authors, categories and settings.
//
//   • Articles, authors, categories and the end-of-article text are edited
//     in the CMS at /studio (see BLOG-CMS-SETUP.md). Nothing to change here.
//   • Until the CMS is connected, the blog shows lib/blogSeed.js instead, so
//     the site keeps working in between.
//
// The few site-wide switches below stay in code on purpose: they change how
// the whole site behaves, and only change once (brand name, launch day).
// ─────────────────────────────────────────────────────────────────────────────

import { cache } from "react";
import { createClient } from "next-sanity";
import { SEED_AUTHORS, SEED_CATEGORIES, SEED_SETTINGS, SEED_POSTS } from "./blogSeed";
import { portableTextToBlocks } from "./blogPortableText";

// ── BRAND NAME ── Used in page titles and buttons across the blog.
export const BRAND = "PetParrk";

// ── LAUNCH SWITCH ── Before launch, the blog's button invites readers to be
// notified. On launch day, change false → true and every button and sentence
// on the blog switches to the live price search.
export const SITE_LAUNCHED = false;

export const CTA = SITE_LAUNCHED
  ? {
      href: "/vets",
      label: "See prices near you",
      line: "See what clinics near you charge, for free.",
    }
  : {
      href: "/unlock",
      label: "Get notified when we open",
      line: "We open in early 2027 with prices for clinics near you.",
    };
export const WAITLIST_HREF = CTA.href; // kept for older code

// Your real domain — set NEXT_PUBLIC_SITE_URL in Vercel and .env.local.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

// Articles per page on /blog (after the featured article on page 1).
export const PER_PAGE = 9;

// Every blog date is shown in California time.
export const TIME_ZONE = "America/Los_Angeles";

// How often (seconds) the blog checks the CMS for newly published changes.
export const REFRESH_SECONDS = 60;

// ── Connection to the CMS ───────────────────────────────────────────────────
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
export const CMS_CONNECTED = Boolean(projectId);

// The live site only ever shows published articles. Local dev and Vercel
// preview also show unpublished drafts — but only if a read token is set
// (SANITY_API_READ_TOKEN), since drafts are private.
const isLiveSite = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === "production"
  : process.env.NODE_ENV === "production";
const readToken = process.env.SANITY_API_READ_TOKEN;
export const SHOWS_DRAFTS = !isLiveSite && Boolean(readToken);

const client = CMS_CONNECTED
  ? createClient({
      projectId,
      dataset,
      apiVersion: "2026-10-01",
      useCdn: !SHOWS_DRAFTS,
      perspective: SHOWS_DRAFTS ? "drafts" : "published",
      token: SHOWS_DRAFTS ? readToken : undefined,
    })
  : null;

async function query(groq, params = {}) {
  return client.fetch(groq, params, { next: { revalidate: SHOWS_DRAFTS ? 0 : REFRESH_SECONDS } });
}

const POSTS_QUERY = `*[_type == "post" && defined(slug.current)]{
  "id": _id,
  "slug": slug.current,
  title, crumb, topic, featured, description, dek,
  "category": category->slug.current,
  "author": author->{ name, role, bio },
  publishedAt, updatedAt, cover, glance, body
}`;
const CATEGORIES_QUERY = `*[_type == "category" && defined(slug.current)] | order(order asc, title asc){
  "key": slug.current, "label": title
}`;
const SETTINGS_QUERY = `*[_type == "blogSettings"][0]{
  bylinePrefix, endNoteTitle, endNoteText, disclaimerTitle, disclaimerText
}`;

// ── Shared shaping ─────────────────────────────────────────────────────────
function wordsIn(blocks) {
  return blocks
    .map((b) =>
      [
        b.text,
        b.title,
        b.caption,
        b.label,
        b.note,
        ...(b.items || []).map((i) => (typeof i === "string" ? i : `${i.q} ${i.a}`)),
        ...(b.rows || []).flat(),
      ].join(" "),
    )
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function finish(post) {
  return {
    ...post,
    readMinutes: Math.max(1, Math.round(wordsIn(post.blocks) / 225)),
    headings: post.blocks.filter((b) => b.type === "h2").map((b) => b.text),
  };
}

function sortPosts(list) {
  return list.sort((a, b) => {
    if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1;
    return a.published < b.published ? 1 : a.published > b.published ? -1 : 0;
  });
}

// ── Loaders (each runs once per page view, however often it's called) ────
const loadPosts = cache(async () => {
  if (!CMS_CONNECTED) {
    const authors = Object.fromEntries(SEED_AUTHORS.map((a) => [a.key, a]));
    return sortPosts(
      SEED_POSTS.map((p) =>
        finish({
          ...p,
          draft: false,
          authorInfo: authors[p.author] || null,
        }),
      ),
    );
  }
  const rows = (await query(POSTS_QUERY)) || [];
  // With drafts on, a published article and its draft both come back; keep one.
  const bySlug = new Map();
  for (const r of rows) {
    const isDraft = r.id.startsWith("drafts.");
    if (!bySlug.has(r.slug) || isDraft) bySlug.set(r.slug, { ...r, isDraft });
  }
  return sortPosts(
    [...bySlug.values()].map((r) =>
      finish({
        slug: r.slug,
        crumb: r.crumb,
        title: r.title || "Untitled",
        description: r.description || "",
        dek: r.dek || "",
        topic: r.topic || "",
        featured: !!r.featured,
        category: r.category || null,
        published: r.publishedAt || "",
        updated: r.updatedAt || null,
        draft: r.isDraft,
        authorInfo: r.author || null,
        cover: r.cover || null,
        glance: (r.glance || []).filter((g) => g && g.value && g.label),
        blocks: portableTextToBlocks(r.body),
      }),
    ),
  );
});

const loadCategories = cache(async () => {
  if (!CMS_CONNECTED) return SEED_CATEGORIES;
  return (await query(CATEGORIES_QUERY)) || [];
});

const loadSettings = cache(async () => {
  if (!CMS_CONNECTED) return SEED_SETTINGS;
  const s = (await query(SETTINGS_QUERY)) || {};
  // Anything left blank in the CMS falls back to the starting text.
  return Object.fromEntries(Object.keys(SEED_SETTINGS).map((k) => [k, s[k] ?? SEED_SETTINGS[k]]));
});

// ── What the pages use ─────────────────────────────────────────────────────
/** Every visible article, featured first, then newest first. */
export async function getAllPosts() {
  return loadPosts();
}

export async function getPost(slug) {
  return (await loadPosts()).find((p) => p.slug === slug) || null;
}

/** Up to `n` other articles to suggest at the end of an article. */
export async function getRelated(slug, n = 3) {
  return (await loadPosts()).filter((p) => p.slug !== slug).slice(0, n);
}

export async function getCategories() {
  return loadCategories();
}

/** Categories that have at least one visible article. */
export async function getActiveCategories() {
  const [posts, cats] = await Promise.all([loadPosts(), loadCategories()]);
  const used = new Set(posts.map((p) => p.category));
  return cats.filter((c) => used.has(c.key));
}

export async function getSettings() {
  return loadSettings();
}

/**
 * One page of the /blog list, optionally for one category. Page 1 of "All"
 * shows the featured article plus PER_PAGE more; every other view shows
 * PER_PAGE per page.
 */
export async function getPage(page = 1, category = null) {
  const all = (await loadPosts()).filter((p) => !category || p.category === category);
  const useLead = !category && page === 1;
  const [lead, ...rest] = all;
  const list = useLead || !category ? rest : all;
  const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const start = (page - 1) * PER_PAGE;
  return {
    lead: useLead ? lead || null : null,
    posts: list.slice(start, start + PER_PAGE),
    page,
    totalPages,
  };
}

/** "October 8, 2026", in California time. Accepts "2026-10-08" or a full timestamp. */
export function formatDate(value) {
  if (!value) return "";
  // A plain date has no time of day; read it as midday so it can never slip
  // to the day before or after.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00-07:00`) : new Date(value);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: TIME_ZONE });
}