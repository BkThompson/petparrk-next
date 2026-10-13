// Hero banner art, one entry per page.
//
// A page switches to its new illustrated banner only when its entry here has
// files. Until then it keeps its current hero, so art can arrive one page at
// a time.
//
// To add a page's final art:
//   1. Put the three WebP files in public/hero/ (e.g. home-wide.webp,
//      home-tablet.webp, home-phone.webp).
//   2. Fill in its entry below, e.g.
//        home: { wide: "/hero/home-wide.webp",
//                tablet: "/hero/home-tablet.webp",
//                phone: "/hero/home-phone.webp" },
//
// Listing has a single texture: give it `wide` only.
export const HERO_ART = {
  home: null,
  about: null,
  howItWorks: null,
  search: null, // Find a Vet
  guidance: null, // Symptom Checker
  contact: null,
  listing: null, // vet pages
};

// Work-in-progress previews, for checking placement on your own machine only.
// They're watermarked and under NDA, so they live in public/hero/preview/,
// which is kept out of git. Switched on by NEXT_PUBLIC_HERO_PREVIEW=1 in
// .env.local; final art above always wins.
const PREVIEW = {
  home: {
    wide: "/hero/preview/home-wide.webp",
    tablet: "/hero/preview/home-tablet.webp",
    phone: "/hero/preview/home-phone.webp",
  },
};

export function heroArt(page) {
  if (HERO_ART[page]) return HERO_ART[page];
  if (process.env.NEXT_PUBLIC_HERO_PREVIEW === "1" && PREVIEW[page]) {
    return PREVIEW[page];
  }
  return null;
}
