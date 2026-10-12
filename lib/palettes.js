// lib/palettes.js
//
// Named colour palettes that are NOT interface colours, so they are not
// tokens: the profile banner themes and the species card gradients that
// a person's pets and choices select. These are the only hex values
// allowed outside app/globals.css and lib/tokens.js (see
// scripts/check-colors.mjs). Interface colours always come from tokens.

// ---- Banner palette (species + extra gradient themes) ----
// `accent` is used for decorative tints; `accentText` is the version that
// passes 4.5:1 as small text on cream. Only Dog and Honey needed darkening.
export const BANNER_PALETTE = {
  dog: {
    label: "Caramel",
    title: "Dog",
    group: "species",
    stops: ["#F09A5A", "#D25F1F", "#A8400F", "#752807"],
    text: "#FFEFD9",
    accent: "#B95A18",
    // Accent for small text on cream (4.5:1 or better).
    accentText: "#B74B00",
  },
  cat: {
    label: "Plum",
    title: "Cat",
    group: "species",
    stops: ["#B967A8", "#8E3B7C", "#6A2660", "#471945"],
    text: "#F4DDF0",
    accent: "#6A2660",
    // Accent for small text on cream (4.5:1 or better).
    accentText: "#6A2660",
  },
  bird: {
    label: "Sky",
    title: "Bird",
    group: "species",
    stops: ["#6BB0DC", "#2E7AA8", "#1B5C82", "#0E3D5A"],
    text: "#DCEAF6",
    accent: "#1B5C82",
    // Accent for small text on cream (4.5:1 or better).
    accentText: "#1B5C82",
  },
  small_furry: {
    label: "Honey",
    title: "Small Furry",
    group: "species",
    stops: ["#FFD98A", "#F0B23A", "#C98C10", "#8A5D04"],
    text: "#FFF1D5",
    accent: "#B57614",
    // Accent for small text on cream (4.5:1 or better).
    accentText: "#9B5E00",
  },
  reptile_fish: {
    label: "Sage",
    title: "Reptile/Fish",
    group: "species",
    stops: ["#7CBB57", "#4A8A2E", "#33641E", "#1B4012"],
    text: "#DCF1E2",
    accent: "#1A6638",
    // Accent for small text on cream (4.5:1 or better).
    accentText: "#1A6638",
  },
  mixed: {
    label: "Royal Violet",
    title: "Mixed",
    group: "species",
    stops: ["#9D7AEB", "#6B3FCB", "#4A2A9E", "#2D1968"],
    text: "#E5DDF8",
    accent: "#6B3FCB",
    // Accent for small text on cream (4.5:1 or better).
    accentText: "#6B3FCB",
  },
  emerald: {
    label: "Emerald Forest",
    group: "extra",
    stops: ["#3FCFA0", "#0E8060", "#0A5A45", "#043A2C"],
    text: "#D6F4E5",
    accent: "#0A5A45",
    // Accent for small text on cream (4.5:1 or better).
    accentText: "#0A5A45",
  },
  copper: {
    label: "Copper Bronze",
    group: "extra",
    stops: ["#D9A15C", "#A9702E", "#7E4F1C", "#4A2C0D"],
    text: "#FFE3D2",
    accent: "#973A0E",
    // Accent for small text on cream (4.5:1 or better).
    accentText: "#973A0E",
  },
  teal: {
    label: "Midnight Teal",
    group: "extra",
    stops: ["#46B5C0", "#0E6973", "#084850", "#042C32"],
    text: "#D6EFEF",
    accent: "#084850",
    // Accent for small text on cream (4.5:1 or better).
    accentText: "#084850",
  },
  rose: {
    label: "Rose Gold",
    group: "extra",
    stops: ["#F8A8B4", "#D85F70", "#A93D52", "#6E2034"],
    text: "#F9DBDF",
    accent: "#A93D52",
    // Accent for small text on cream (4.5:1 or better).
    accentText: "#A93D52",
  },
  mono: {
    label: "Mono Navy",
    group: "extra",
    stops: ["#3B5570", "#1A2D44", "#0F1F2E", "#060F1A"],
    text: "#D7DFEC",
    accent: "#1A2D44",
    // Accent for small text on cream (4.5:1 or better).
    accentText: "#1A2D44",
  },
};

// ---- Species card gradients (pet tiles) ----
// The fallback uses tokens, since it is an interface colour, not a pet's.
export const SPECIES_CARD_GRADIENT = {
  dog: "linear-gradient(135deg, #C97A3D 0%, #7A4520 100%)",
  cat: "linear-gradient(135deg, #7B4B6E 0%, #4A2C44 100%)",
  bird: "linear-gradient(135deg, #5C8FA8 0%, #2C5F6B 100%)",
  small_furry: "linear-gradient(135deg, #D9A05B 0%, #A06A2E 100%)",
  reptile_fish: "linear-gradient(135deg, #6B8E6F 0%, #3E5C42 100%)",
  default:
    "linear-gradient(135deg, var(--color-muted) 0%, var(--color-navy-mid) 100%)",
};

// ---- CONTACT_ART: app/contact/page.js ----
export const CONTACT_ART = {
  cream50: "#FFF4DC",
};

// ---- BRAND_ART: components/BrandArt.js ----
export const BRAND_ART = {
  cream100: "#EFE6D8",
  cream100x: "#F7E3C4",
  green600: "#2E8B57",
  orange150: "#E3D6C3",
};

// ---- GOOGLE_LOGO: app/auth/page.js ----
export const GOOGLE_LOGO = {
  amber450: "#FFC107",
  blue500: "#1976D2",
  green500: "#4CAF50",
  red500: "#FF3D00",
};

// ---- ABOUT_HERO_ART: app/about/page.js ----
export const ABOUT_HERO_ART = {
  amber150_a55: "rgba(240,228,192,0.55)",
  brown550_a10: "rgba(180,70,30,0.10)",
  brown650_a12: "rgba(120,70,30,0.12)",
  brown750_a02: "rgba(100,50,15,0.022)",
  brown750_a02x: "rgba(100,50,15,0.015)",
  brown750_a04: "rgba(90,40,8,0.04)",
  brown800_a06: "rgba(80,30,5,0.06)",
  brown800_a07: "rgba(80,30,5,0.07)",
  brown800_a08: "rgba(80,30,5,0.08)",
  brown800_a10: "rgba(70,25,4,0.10)",
  brown800_a13: "rgba(80,30,5,0.13)",
  brown800_a15: "rgba(80,30,5,0.15)",
  brown800_a55: "rgba(80,30,5,0.55)",
  brown900: "#0D0A08",
  brown900x: "#1A0800",
  navy800: "#1A2F3D",
  navy850: "#111E28",
  orange150: "#E8D9C0",
  orange150x: "#E2D9CE",
  red450: "#B05060",
  red550: "#A84428",
  red600: "#8A3040",
  red650: "#8B3520",
};

// ---- VET_HERO_ART: app/vet/[slug]/page.js ----
export const VET_HERO_ART = {
  blue150_a09: "rgba(180,210,255,0.09)",
};

// ---- VETS_HERO_ART: app/vets/page.js ----
export const VETS_HERO_ART = {
  blue200_a100: "rgba(160,210,240,1)",
};

// ---- SC_HERO_ART: app/symptom-checker/page.js ----
export const SC_HERO_ART = {
  blue150_a07: "rgba(180,210,255,0.07)",
  blue150_a09: "rgba(180,210,255,0.09)",
};

// ---- Hero card themes (the person picks one) ----
export const HERO_PALETTE = {
  caramel: {
    label: "Caramel",
    stops: ["#F4A85F", "#D8762A", "#B95A18", "#8B3F0E"],
    accent: "#B95A18",
  },
  plum: {
    label: "Plum",
    stops: ["#B967A8", "#8E3B7C", "#6A2660", "#471945"],
    accent: "#6A2660",
  },
  sky: {
    label: "Sky",
    stops: ["#6BB0DC", "#2E7AA8", "#1B5C82", "#0E3D5A"],
    accent: "#1B5C82",
  },
  honey: {
    label: "Honey",
    stops: ["#FCC773", "#E59B2B", "#B57614", "#7F4D08"],
    accent: "#B57614",
  },
  sage: {
    label: "Sage",
    stops: ["#5BBE7D", "#2E8A4F", "#1A6638", "#0E4324"],
    accent: "#1A6638",
  },
  violet: {
    label: "Royal Violet",
    stops: ["#9D7AEB", "#6B3FCB", "#4A2A9E", "#2D1968"],
    accent: "#6B3FCB",
  },
  emerald: {
    label: "Emerald",
    stops: ["#3FCFA0", "#0E8060", "#0A5A45", "#043A2C"],
    accent: "#0A5A45",
  },
  copper: {
    label: "Copper",
    stops: ["#EE9264", "#C7531D", "#973A0E", "#5E2207"],
    accent: "#973A0E",
  },
  teal: {
    label: "Midnight Teal",
    stops: ["#46B5C0", "#0E6973", "#084850", "#042C32"],
    accent: "#084850",
  },
  rose: {
    label: "Rose Gold",
    stops: ["#F8A8B4", "#D85F70", "#A93D52", "#6E2034"],
    accent: "#A93D52",
  },
  mono: {
    label: "Mono Navy",
    stops: ["#3B5570", "#1A2D44", "#0F1F2E", "#060F1A"],
    accent: "#1A2D44",
  },
};

// ---- Hero card defaults (before a person picks their own) ----
export const HERO_DEFAULTS = {
  bg: "#F8EFE2",
  card: "#FFFFFF",
  accent: "#B95A18",
};

// ---- Hero card rarity colours ----
export const HERO_RARITY_TIERS = {
  common: { label: "Beloved", color: "#8A94A6" },
  uncommon: { label: "Special", color: "#16A34A" },
  rare: { label: "Rare", color: "#2563EB" },
  epic: { label: "Epic", color: "#9333EA" },
  legendary: { label: "Legendary", color: "#F59E0B" },
};

// ---- Hero card editor swatches ----
export const HERO_BG_SWATCHES = [
  "#F8EFE2",
  "#F3E7F0",
  "#E5F0F8",
  "#FBF1DD",
  "#E8F4EC",
  "#EFE9FB",
  "#E2F5EE",
  "#FBEAE0",
  "#E3F2F3",
  "#FCEBEE",
  "#EBEEF2",
  "#1A2D44",
];

export const HERO_CARD_SWATCHES = [
  "#FFFFFF",
  "#FBF6EE",
  "#F4ECE0",
  "#FDF0F2",
  "#EAF2F8",
  "#F0EAFB",
  "#172531",
  "#2A3F4D",
  "#3B2A2A",
  "#1A2D44",
];

export const HERO_ACCENT_SWATCHES = [
  "#B95A18",
  "#6A2660",
  "#1B5C82",
  "#B57614",
  "#1A6638",
  "#6B3FCB",
  "#0A5A45",
  "#973A0E",
  "#084850",
  "#A93D52",
  "#CF5C36",
  "#1A2D44",
];

// ---- Level tier colours (badge gradients), in tier order ----
export const LEVEL_TIER_COLORS = [
  { stops: ["#6FCB87", "#2E9C5C", "#1A6B3D", "#0F4525"], text: "#E8FBE8", pillBg: "#0F4525", pillText: "#6FCB87" },
  { stops: ["#FF9577", "#E8543A", "#B53520", "#7A1F0E"], text: "#FFEAE0", pillBg: "#7A1F0E", pillText: "#FF9577" },
  { stops: ["#5FD6C8", "#22A79A", "#136E67", "#0A413D"], text: "#E0FBF6", pillBg: "#0A413D", pillText: "#5FD6C8" },
  { stops: ["#6FB5E8", "#2E7AC8", "#1A4F92", "#0E2E5A"], text: "#E0EEFB", pillBg: "#0E2E5A", pillText: "#6FB5E8" },
  { stops: ["#F5544E", "#C81E22", "#8E1214", "#4A0A0A"], text: "#FCE3E1", pillBg: "#4A0A0A", pillText: "#F5544E" },
  { stops: ["#B987EB", "#7B3FCB", "#532A9E", "#2D1968"], text: "#EDE0FA", pillBg: "#2D1968", pillText: "#B987EB" },
  { stops: ["#FFE08A", "#E8B53A", "#B57E1A", "#6E4A0A"], text: "#3A2A05", pillBg: "#6E4A0A", pillText: "#FFE08A" },
];

// ---- Celebration confetti ----
export const GOLD_CONFETTI = ["#FFE08A", "#EFC88B", "#FFF3D0", "#E8B53A"];

// ---- HERO_CARD_VIEW_COLORS: components/HeroCardView.js ----
export const HERO_CARD_VIEW_COLORS = {
  brown550: "#B95A18",
  cream50: "#F8EFE2",
  green600: "#16A34A",
  grey350: "#9CA3AF",
  navy750: "#2A3F4D",
  navy900: "#0B131A",
  red400: "#EF4444",
  teal600: "#0891B2",
};

// ---- HERO_FLIP_CARD_COLORS: components/HeroFlipCard.js ----
export const HERO_FLIP_CARD_COLORS = {
  green600: "#16A34A",
  grey350: "#9CA3AF",
  grey350_a30: "rgba(156,163,175,0.30)",
  grey850_a86: "rgba(20,20,25,0.86)",
  navy750: "#1A2D44",
  navy900: "#0B131A",
  purple450: "#6B3FCB",
  red400: "#EF4444",
  teal600: "#0891B2",
};

// ---- HERO_NAMEPLATE_COLORS: components/HeroNameplate.js ----
export const HERO_NAMEPLATE_COLORS = {
  navy750: "#2A3F4D",
};

// ---- HERO_FLIP_CARD_LIVE_COLORS: components/HeroFlipCardLive.js ----
export const HERO_FLIP_CARD_LIVE_COLORS = {
  purple450: "#6B3FCB",
};

// ---- BADGE_CELEBRATION_COLORS: components/BadgeCelebration.js ----
export const BADGE_CELEBRATION_COLORS = {
  amber200: "#FFE08A",
  amber200_a55: "rgba(255, 224, 138, 0.55)",
  amber400: "#E8B53A",
  brown550: "#B57E1A",
  brown750: "#6E4A0A",
  cream100: "#F7E6C4",
  cream100_a90: "rgba(255, 240, 200, 0.9)",
  cream150: "#FFE8B8",
  cream50: "#FFFDF7",
  cream50x: "#FDF3DF",
};

// ---- HERO_SHARE_COLORS: app/pet-card/[slug]/hero/[token]/page.js ----
export const HERO_SHARE_COLORS = {
  purple250: "#A68CE0",
};

// ---- BLOG_COVER_ART: components/BlogBlocks.js ----
export const BLOG_COVER_ART = {
  orange150: "#E8D9C0",
};
