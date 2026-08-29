// =============================================================
// lib/levelSystem.js — SINGLE SOURCE OF TRUTH for the profile
// leveling system. Imported by ProfileMain AND ProfileUsername.
//
// MODEL (action-gated, cumulative, continuous levels):
//   • TIERS   — 7 named prestige bands (the badge). Each spans a
//               range of continuous levels.
//   • LEVELS  — a single continuous ladder (1..N) that does NOT reset
//               per tier. Each level is a set of real REQUIREMENTS.
//   • XP      — every requirement is worth points. A level's total XP
//               = the sum of its requirement points. Earning those
//               points fills the bar; completing the requirements IS
//               reaching the next level (XP and requirements are the
//               same system).
//
// HARD-GATED + CUMULATIVE + BANKED/ORDERED:
//   You advance level-by-level in order. Each level requires everything
//   the previous level did, plus more (cumulative). You can do actions
//   in any order (banked), but levels promote in sequence.
//
// FAIRNESS:
//   • Per-ACCOUNT requirements (checks, saved vets, verified prices,
//     tenure) are FLAT for everyone.
//   • Per-PET requirements (pet profile, Hero card, Care card) scale
//     "1 per pet owned" — single-pet users need 1, multi-pet users
//     need one per pet. Nobody is blocked.
//
// TUNING: the whole ladder lives in the LADDER array below. To adjust
// difficulty after launch, edit the numbers there — one place, one dial.
// =============================================================

import {
  Sprout,
  HeartHandshake,
  Footprints,
  Compass,
  Flame,
  Trophy,
  Mountain,
} from "lucide-react";

// ─── Per-action XP point values ──────────────────────────────────────
// Each requirement references one of these. A level's total XP is the
// sum of its requirements' points (see levelTotalXp).
export const XP = {
  account: 25, // creating your account (auto-met — earns Level 1)
  ownerProfile: 50, // complete your own profile (bio+zip+username)
  petProfile: 50, // complete a pet's full profile (per pet)
  heroPublished: 150, // publish a Hero card (per pet)
  careComplete: 200, // complete a full Care card (per pet, all 4 records)
  symptomCheck: 10, // per symptom check
  savedVet: 15, // per saved vet
  verifiedPrice: 40, // per admin-approved price submission
  tenureMonth: 25, // per tenure milestone reached (see LADDER tenureDays)
};

export const TIERS = [
  {
    n: 1,
    name: "Newcomer",
    icon: Sprout,
    minXp: 0,
    stops: ["#6FCB87", "#2E9C5C", "#1A6B3D", "#0F4525"], // green
    text: "#E8FBE8",
    pillBg: "#0F4525",
    pillText: "#6FCB87",
    summary: "Welcome to the pack — your journey begins.",
  },
  {
    n: 2,
    name: "Companion",
    icon: HeartHandshake,
    minXp: 100,
    stops: ["#FF9577", "#E8543A", "#B53520", "#7A1F0E"], // coral
    text: "#FFEAE0",
    pillBg: "#7A1F0E",
    pillText: "#FF9577",
    summary: "You and your pet are true companions.",
  },
  {
    n: 3,
    name: "Tracker",
    icon: Footprints,
    minXp: 250,
    stops: ["#5FD6C8", "#22A79A", "#136E67", "#0A413D"], // teal (bridges coral→blue)
    text: "#E0FBF6",
    pillBg: "#0A413D",
    pillText: "#5FD6C8",
    summary: "You're on the trail, learning the ropes.",
  },
  {
    n: 4,
    name: "Pathfinder",
    icon: Compass,
    minXp: 450,
    stops: ["#6FB5E8", "#2E7AC8", "#1A4F92", "#0E2E5A"], // blue
    text: "#E0EEFB",
    pillBg: "#0E2E5A",
    pillText: "#6FB5E8",
    summary: "You know the way and find the answers.",
  },
  {
    n: 5,
    name: "Trailblazer",
    icon: Flame,
    minXp: 750,
    stops: ["#F5544E", "#C81E22", "#8E1214", "#4A0A0A"], // red (fiery trailblazer)
    text: "#FCE3E1",
    pillBg: "#4A0A0A",
    pillText: "#F5544E",
    summary: "You blaze the trail for other pet parents.",
  },
  {
    n: 6,
    name: "Champion",
    icon: Trophy,
    minXp: 1200,
    gate: (s) => Boolean(s.heroPublished),
    gateLabel: "Publish a Hero card",
    stops: ["#B987EB", "#7B3FCB", "#532A9E", "#2D1968"], // purple (prestige/royalty for Champion)
    text: "#EDE0FA",
    pillBg: "#2D1968",
    pillText: "#B987EB",
    summary: "A proven champion for the whole community.",
  },
  {
    n: 7,
    name: "Pack Leader",
    icon: Mountain,
    minXp: 2000,
    gate: (s) => Boolean(s.careComplete),
    gateLabel: "Complete a full Care card",
    stops: ["#FFE08A", "#E8B53A", "#B57E1A", "#6E4A0A"], // gold
    text: "#3A2A05",
    pillBg: "#6E4A0A",
    pillText: "#FFE08A",
    summary: "Top of the pack — rare and earned.",
  },
];

// Back-compat: some older code referenced LEVELS. Keep an alias so

// Back-compat alias (older code referenced LEVELS as the tier list).
export const LEVELS = TIERS;

export function tierGradient(n) {
  const t = TIERS[n - 1];
  if (!t) return null;
  return `linear-gradient(160deg, ${t.stops[0]} 0%, ${t.stops[1]} 30%, ${t.stops[2]} 70%, ${t.stops[3]} 100%)`;
}
export const levelGradient = tierGradient;

// ─── Completeness helpers (unchanged) ────────────────────────────────
export function fullPetProfile(pet) {
  if (!pet) return false;
  return Boolean(
    pet.name &&
    pet.species &&
    pet.breed &&
    pet.birthday &&
    pet.sex &&
    pet.weight_value,
  );
}

export function fullOwnerProfile(profile) {
  if (!profile) return false;
  return Boolean(profile.bio && profile.zip_code && profile.username);
}

export function memberDays(profile, session) {
  const iso = profile?.created_at || session?.user?.created_at;
  if (!iso) return 0;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// ═══════════════════════════════════════════════════════════════════
// THE LADDER — the one dial. Each level = a set of cumulative
// requirements. Edit these numbers to tune difficulty after launch.
//
// Requirement kinds:
//   • account "count" reqs: { kind, need }  — flat for everyone.
//       kinds: "checks" | "saved" | "verified"
//   • tenure req:           { kind:"tenure", days }
//   • per-pet reqs:         { kind, perPet:true } — need = petCount
//       kinds: "petProfile" | "hero" | "care"
//
// `xp` on each requirement = points earned for completing it (for a
// count req, points are per-unit up to `need`; the level's total XP is
// computed by levelTotalXp()).
//
// Cumulative: each level's count/tenure needs are >= the previous
// level's (enforced by design in the numbers below).
// ═══════════════════════════════════════════════════════════════════
export const LADDER = [
  // ---- Newcomer (Tier 1): levels 1-4 ----
  // Level 1 is earned by creating an account — auto-met, so everyone starts
  // AT Level 1 and no user is ever "Level 0". It still carries a requirement
  // (and XP) so a completed Level 1 shows a pill like every other level.
  { level: 1, tier: 1, reqs: [{ kind: "account" }] },
  {
    level: 2,
    tier: 1,
    reqs: [{ kind: "petProfile", perPet: true }, { kind: "ownerProfile" }],
  },
  {
    level: 3,
    tier: 1,
    reqs: [
      { kind: "petProfile", perPet: true },
      { kind: "ownerProfile" },
      { kind: "checks", need: 2 },
      { kind: "saved", need: 1 },
    ],
  },
  {
    level: 4,
    tier: 1,
    reqs: [
      { kind: "petProfile", perPet: true },
      { kind: "ownerProfile" },
      { kind: "checks", need: 5 },
      { kind: "saved", need: 3 },
      { kind: "verified", need: 1 },
    ],
  },
  // ---- Companion (Tier 2): levels 5-6 ----
  {
    level: 5,
    tier: 2,
    reqs: [
      { kind: "petProfile", perPet: true },
      { kind: "ownerProfile" },
      { kind: "checks", need: 8 },
      { kind: "saved", need: 4 },
      { kind: "verified", need: 2 },
      { kind: "hero", perPet: true },
    ],
  },
  {
    level: 6,
    tier: 2,
    reqs: [
      { kind: "petProfile", perPet: true },
      { kind: "ownerProfile" },
      { kind: "checks", need: 12 },
      { kind: "saved", need: 6 },
      { kind: "verified", need: 4 },
      { kind: "hero", perPet: true },
      { kind: "tenure", days: 30 },
    ],
  },
  // ---- Tracker (Tier 3): levels 7-8 ----
  {
    level: 7,
    tier: 3,
    reqs: [
      { kind: "petProfile", perPet: true },
      { kind: "ownerProfile" },
      { kind: "checks", need: 16 },
      { kind: "saved", need: 7 },
      { kind: "verified", need: 6 },
      { kind: "hero", perPet: true },
      { kind: "care", perPet: true },
      { kind: "tenure", days: 60 },
    ],
  },
  {
    level: 8,
    tier: 3,
    reqs: [
      { kind: "petProfile", perPet: true },
      { kind: "ownerProfile" },
      { kind: "checks", need: 20 },
      { kind: "saved", need: 9 },
      { kind: "verified", need: 8 },
      { kind: "hero", perPet: true },
      { kind: "care", perPet: true },
      { kind: "tenure", days: 90 },
    ],
  },
  // ---- Pathfinder (Tier 4): levels 9-10 ----
  {
    level: 9,
    tier: 4,
    reqs: [
      { kind: "petProfile", perPet: true },
      { kind: "ownerProfile" },
      { kind: "checks", need: 25 },
      { kind: "saved", need: 11 },
      { kind: "verified", need: 11 },
      { kind: "hero", perPet: true },
      { kind: "care", perPet: true },
      { kind: "tenure", days: 150 },
    ],
  },
  {
    level: 10,
    tier: 4,
    reqs: [
      { kind: "petProfile", perPet: true },
      { kind: "ownerProfile" },
      { kind: "checks", need: 30 },
      { kind: "saved", need: 12 },
      { kind: "verified", need: 14 },
      { kind: "hero", perPet: true },
      { kind: "care", perPet: true },
      { kind: "tenure", days: 210 },
    ],
  },
  // ---- Trailblazer (Tier 5): levels 11-12 ----
  {
    level: 11,
    tier: 5,
    reqs: [
      { kind: "petProfile", perPet: true },
      { kind: "ownerProfile" },
      { kind: "checks", need: 36 },
      { kind: "saved", need: 14 },
      { kind: "verified", need: 18 },
      { kind: "hero", perPet: true },
      { kind: "care", perPet: true },
      { kind: "tenure", days: 270 },
    ],
  },
  {
    level: 12,
    tier: 5,
    reqs: [
      { kind: "petProfile", perPet: true },
      { kind: "ownerProfile" },
      { kind: "checks", need: 42 },
      { kind: "saved", need: 15 },
      { kind: "verified", need: 22 },
      { kind: "hero", perPet: true },
      { kind: "care", perPet: true },
      { kind: "tenure", days: 365 },
    ],
  },
  // ---- Champion (Tier 6): level 13 ----
  {
    level: 13,
    tier: 6,
    reqs: [
      { kind: "petProfile", perPet: true },
      { kind: "ownerProfile" },
      { kind: "checks", need: 48 },
      { kind: "saved", need: 17 },
      { kind: "verified", need: 26 },
      { kind: "hero", perPet: true },
      { kind: "care", perPet: true },
      { kind: "tenure", days: 365 },
    ],
  },
  // ---- Pack Leader (Tier 7): level 14 (apex) ----
  {
    level: 14,
    tier: 7,
    reqs: [
      { kind: "petProfile", perPet: true },
      { kind: "ownerProfile" },
      { kind: "checks", need: 55 },
      { kind: "saved", need: 20 },
      { kind: "verified", need: 30 },
      { kind: "hero", perPet: true },
      { kind: "care", perPet: true },
      { kind: "tenure", days: 365 },
    ],
  },
];

export const MAX_LEVEL = LADDER.length;

// Human labels + per-unit XP for each requirement kind.
const REQ_META = {
  account: { label: () => "Create your account", xp: XP.account },
  ownerProfile: { label: () => "Complete your profile", xp: XP.ownerProfile },
  petProfile: {
    label: (n) =>
      n > 1 ? `Complete ${n} pet profiles` : "Complete your pet's profile",
    xp: XP.petProfile,
  },
  hero: {
    label: (n) => (n > 1 ? `Publish ${n} Hero cards` : "Publish a Hero card"),
    xp: XP.heroPublished,
  },
  care: {
    label: (n) =>
      n > 1 ? `Complete ${n} Care cards` : "Complete a full Care card",
    xp: XP.careComplete,
  },
  checks: {
    label: (n) => `${n} health check${n === 1 ? "" : "s"}`,
    xp: XP.symptomCheck,
  },
  saved: {
    label: (n) => `${n} saved vet${n === 1 ? "" : "s"}`,
    xp: XP.savedVet,
  },
  verified: {
    label: (n) => `${n} verified price${n === 1 ? "" : "s"}`,
    xp: XP.verifiedPrice,
  },
  tenure: { label: (d) => tenureLabel(d), xp: XP.tenureMonth },
};

function tenureLabel(days) {
  const m = Math.round(days / 30);
  if (m >= 12) return "Member for 1 year";
  return `Member for ${m} month${m === 1 ? "" : "s"}`;
}

// How many "units" a requirement needs, given pet count.
function reqNeed(req, petCount) {
  if (req.perPet) return Math.max(1, petCount || 1);
  if (req.kind === "tenure") return 1;
  if (req.kind === "account") return 1; // auto-met boolean milestone
  if (req.kind === "ownerProfile") return 1; // boolean milestone
  return req.need || 0;
}

// The user's current progress toward a requirement, from signals.
function reqHave(req, s, petCount) {
  switch (req.kind) {
    // Viewing this at all means the account exists — always satisfied.
    case "account":
      return 1;
    case "ownerProfile":
      return s.fullOwner ? 1 : 0;
    case "petProfile":
      return Math.min(s.fullPets || 0, reqNeed(req, petCount));
    case "hero":
      return Math.min(s.heroPublishedCount || 0, reqNeed(req, petCount));
    case "care":
      return Math.min(s.careCompleteCount || 0, reqNeed(req, petCount));
    case "checks":
      return Math.min(s.checkCount || 0, req.need || 0);
    case "saved":
      return Math.min(s.savedCount || 0, req.need || 0);
    case "verified":
      return Math.min(s.verifiedSubs || 0, req.need || 0);
    case "tenure":
      return (s.tenureDays ?? (s.months || 0) * 30) >= req.days ? 1 : 0;
    default:
      return 0;
  }
}

// Is a single requirement fully met?
function reqMet(req, s, petCount) {
  return reqHave(req, s, petCount) >= reqNeed(req, petCount);
}

// XP points for a requirement (per-unit * units needed).
function reqTotalXp(req, petCount) {
  const meta = REQ_META[req.kind];
  if (!meta) return 0;
  if (req.kind === "tenure") return meta.xp;
  return meta.xp * reqNeed(req, petCount);
}

// XP the user has EARNED toward a requirement (per-unit * units done).
function reqEarnedXp(req, s, petCount) {
  const meta = REQ_META[req.kind];
  if (!meta) return 0;
  if (req.kind === "tenure") return reqMet(req, s, petCount) ? meta.xp : 0;
  return meta.xp * reqHave(req, s, petCount);
}

// A level's TOTAL XP = sum of its requirement points.
export function levelTotalXp(levelDef, petCount) {
  return (levelDef?.reqs || []).reduce(
    (sum, r) => sum + reqTotalXp(r, petCount),
    0,
  );
}

// Is an ENTIRE level satisfied?
function levelMet(levelDef, s, petCount) {
  return (levelDef?.reqs || []).every((r) => reqMet(r, s, petCount));
}

// ─── Requirement list for display (labels, points, progress, met) ────
export function levelRequirements(levelDef, s, petCount) {
  if (!levelDef) return [];
  return levelDef.reqs.map((req) => {
    const need = reqNeed(req, petCount);
    const have = reqHave(req, s, petCount);
    const meta = REQ_META[req.kind];
    let label;
    if (req.kind === "tenure") label = meta.label(req.days);
    else label = meta.label(need);
    return {
      kind: req.kind,
      label,
      met: have >= need,
      xp: reqTotalXp(req, petCount),
      // Progress "have/need" shown on EVERY requirement for uniformity —
      // booleans read "1/1", counts read "18/20", tenure reads "1/1".
      progress: `${have}/${need}`,
    };
  });
}

// ─── Signals: normalize raw data into the counts the engine needs ────
export function buildSignals({ pets, profile, counts, session }) {
  const p = pets || [];
  const c = counts || {};
  return {
    fullOwner: fullOwnerProfile(profile),
    fullPets: p.filter(fullPetProfile).length,
    heroPublishedCount: p.filter((x) => x.hero_is_published).length,
    careCompleteCount:
      typeof c.careCompleteCount === "number"
        ? c.careCompleteCount
        : c.careComplete
          ? 1
          : 0,
    checkCount: c.checks || 0,
    savedCount: c.saved || 0,
    verifiedSubs: c.verifiedSubmissions || 0,
    tenureDays: memberDays(profile, session),
    months: Math.floor(memberDays(profile, session) / 30),
    petCount: p.length,
  };
}

// ─── LIFETIME XP — total points earned across everything (the score) ──
// Repeatable actions keep counting (no cap), so the score always grows.
export function computeXP(signals) {
  const s = signals || {};
  let xp = 0;
  if (s.fullOwner) xp += XP.ownerProfile;
  xp += (s.fullPets || 0) * XP.petProfile;
  xp += (s.heroPublishedCount || 0) * XP.heroPublished;
  xp += (s.careCompleteCount || 0) * XP.careComplete;
  xp += (s.checkCount || 0) * XP.symptomCheck;
  xp += (s.savedCount || 0) * XP.savedVet;
  xp += (s.verifiedSubs || 0) * XP.verifiedPrice;
  xp += (s.months || 0) * XP.tenureMonth;
  return xp;
}

// ─── Current level: highest continuous level with ALL reqs met ───────
// Ordered + cumulative: walk up from 1, stop at the first unmet level.
export function computeLevel(signals) {
  const s = signals || {};
  const petCount = s.petCount || 1;
  let current = 0;
  for (const def of LADDER) {
    if (levelMet(def, s, petCount)) current = def.level;
    else break;
  }
  // Level 0 = not even level 1 yet; treat display as "working toward L1".
  return current;
}

// The tier a given level belongs to.
export function tierForLevel(level) {
  const def = LADDER.find((d) => d.level === level);
  return def ? def.tier : 1;
}

// ─── Progress toward the NEXT level (bar = XP earned / level total) ──
// Since points sum to the level total, "requirements done" and "XP
// earned" fill the same bar. Returns everything the UI needs.
export function computeProgress(signals) {
  const s = signals || {};
  const petCount = s.petCount || 1;
  const current = computeLevel(s);
  const nextLevel = current + 1;
  const nextDef = LADDER.find((d) => d.level === nextLevel) || null;

  // Bar tracks progress toward the NEXT level's requirements.
  let earned = 0,
    total = 0,
    reqsDone = 0,
    reqsTotal = 0;
  if (nextDef) {
    total = levelTotalXp(nextDef, petCount);
    earned = nextDef.reqs.reduce(
      (sum, r) => sum + reqEarnedXp(r, s, petCount),
      0,
    );
    earned = Math.min(earned, total);
    reqsTotal = nextDef.reqs.length;
    reqsDone = nextDef.reqs.filter((r) => reqMet(r, s, petCount)).length;
  }
  const pct =
    total > 0
      ? Math.round((earned / total) * 100)
      : current >= MAX_LEVEL
        ? 100
        : 0;

  // Target label: next level normally; next TIER name when the next
  // level starts a new tier (crossing a tier boundary).
  const curTier = current >= 1 ? tierForLevel(current) : 1;
  const nextTier = nextDef ? nextDef.tier : curTier;
  const crossesTier = nextDef ? nextTier !== curTier : false;
  const targetTierObj = TIERS[(nextDef ? nextTier : curTier) - 1] || null;
  const targetName = nextDef
    ? crossesTier
      ? targetTierObj?.name
      : `Level ${nextLevel}`
    : null; // null => at max level

  return {
    currentLevel: current,
    nextLevel: nextDef ? nextLevel : null,
    atMax: current >= MAX_LEVEL,
    earnedXp: earned,
    totalXp: total,
    xpLeft: Math.max(0, total - earned),
    pct,
    reqsDone,
    reqsTotal,
    crossesTier,
    targetName, // "Level 8" or "Pathfinder" or null (maxed)
    targetTier: nextDef ? nextTier : curTier,
  };
}

// ─── computeLevelState — the object the profiles consume ─────────────
// Keeps the SAME return shape keys the UI already reads (tier, level,
// subLevel, progress, quests) plus new fields (lifetimeXp, requirements).
export function computeLevelState({ pets, profile, counts, session }) {
  const signals = buildSignals({ pets, profile, counts, session });
  return computeLevelStateFromSignals(signals);
}

// Compute from a pre-built signals object (used by the public RPC path).
export function computeLevelStateFromSignals(rawSignals) {
  const s = { ...(rawSignals || {}) };
  if (s.petCount == null) s.petCount = s.fullPets || 1;
  const petCount = s.petCount || 1;

  const level = computeLevel(s);
  const tierN = level >= 1 ? tierForLevel(level) : 1;
  const tier = TIERS[tierN - 1] || TIERS[0];
  const progress = computeProgress(s);
  const lifetimeXp = computeXP(s);

  // Requirements for the NEXT level (what the current-level card shows).
  const nextDef = progress.nextLevel
    ? LADDER.find((d) => d.level === progress.nextLevel)
    : null;
  const requirements = nextDef ? levelRequirements(nextDef, s, petCount) : [];

  return {
    signals: s,
    tier, // TIERS entry (badge styling/name/icon)
    level, // continuous level (0 = pre-L1)
    tierN, // tier index
    // back-compat: some UI reads subLevel for the badge pill — expose
    // the continuous level here so the badge shows "Lv N".
    subLevel: level,
    lifetimeXp,
    progress, // full bar/target data (see computeProgress)
    requirements, // checklist for the next level
    petCount,
  };
}

// ─── Full ladder for the modal (every tier + its levels) ─────────────
// Returns tiers with their levels and, for the current level, the live
// requirement checklist. `signals` supplies the user's progress.
export function buildLadderView(signals) {
  const s = signals || {};
  const petCount = s.petCount || 1;
  const current = computeLevel(s);
  return TIERS.map((t) => {
    const levels = LADDER.filter((d) => d.tier === t.n).map((d) => {
      const state =
        d.level < current ? "done" : d.level === current ? "current" : "future";
      return {
        level: d.level,
        state,
        // completed levels expose their (met) requirements for the
        // "look what I did" pills; current exposes live checklist.
        requirements:
          d.level <= current + 1 ? levelRequirements(d, s, petCount) : [],
      };
    });
    // A tier is "reached" if any of its levels is <= current.
    const reached = levels.some((l) => l.level <= current);
    const isCurrent = levels.some((l) => l.state === "current");
    return { tier: t, levels, reached, isCurrent };
  });
}

// ═══════════════════════════════════════════════════════════════════
// BACK-COMPAT SHIMS — keep older call sites working during rollout.
// ═══════════════════════════════════════════════════════════════════

// Old code destructured { level } from calculateLevel(...) to cache it.
export function calculateLevel({ pets, profile, counts, session }) {
  const signals = buildSignals({ pets, profile, counts, session });
  return { level: computeLevel(signals) };
}

// l1Progress — the "unlock Level 1" checklist shown to brand-new users.
export function l1Progress({ pets, profile }) {
  const items = [
    { label: "Add a pet", done: (pets || []).length >= 1 },
    {
      label: "Complete a pet's profile",
      done: (pets || []).some(fullPetProfile),
    },
    { label: "Add your bio", done: Boolean(profile?.bio) },
    { label: "Add your zip code", done: Boolean(profile?.zip_code) },
    { label: "Pick a username", done: Boolean(profile?.username) },
  ];
  const done = items.filter((i) => i.done).length;
  return { items, done, total: items.length };
}

// computeQuests — retained for any UI still reading a flat "ways to earn
// XP" list. Now derives from the NEXT level's requirements.
export function computeQuests(signals) {
  const s = signals || {};
  const petCount = s.petCount || 1;
  const current = computeLevel(s);
  const nextDef = LADDER.find((d) => d.level === current + 1);
  if (!nextDef) return [];
  return levelRequirements(nextDef, s, petCount).map((r) => ({
    key: r.kind,
    label: r.label,
    xp: r.xp,
    done: r.met,
    progress: r.progress,
  }));
}

// ─── Care-completion helper (per-pet, batched queries) ───────────────
export async function computeCareCompleteCount(supabase, petIds) {
  if (!petIds || petIds.length === 0) return 0;
  const tables = [
    "pet_vaccinations",
    "pet_medications",
    "pet_vet_visits",
    "pet_emergency_contacts",
  ];
  try {
    const results = await Promise.all(
      tables.map((t) => supabase.from(t).select("pet_id").in("pet_id", petIds)),
    );
    const sets = results.map((r) => {
      const set = new Set();
      (r.data || []).forEach((row) => set.add(row.pet_id));
      return set;
    });
    let count = 0;
    for (const petId of petIds) {
      if (sets.every((set) => set.has(petId))) count += 1;
    }
    return count;
  } catch {
    return 0;
  }
}

export async function computeCareComplete(supabase, petIds) {
  return (await computeCareCompleteCount(supabase, petIds)) > 0;
}
