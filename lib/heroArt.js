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
  // Home art, all three no-icon variants. Tablet (5:4) and phone (3:4) are
  // Andika's originals from 20 Oct 2026 — the first install took his
  // icons-in-front files by mistake, swapped 22 Oct. Desktop was replaced the
  // same day with his reworked file (3840x1707), the 2.25:1 the brief asked
  // for; the first one came back at 3.38:1.
  //
  // The first desktop file was 3.38:1. HeroBanner fits the art to the banner's
  // height and pins it right, so at 568px tall that one always drew 1921px
  // wide: every screen under 1920px lost the left of the picture, which is the
  // shadowed part the headline sits on, and the gold half of the headline
  // measured 1.40:1 where it needs 3:1. At 2.25:1 the art draws 1278px, so the
  // whole illustration is visible from 1280px up and the navy section
  // background fills in to its left.
  //
  // Measured after the swap, headline against the art behind it with the
  // text-shadow halo credited (WCAG G18): nothing below 3:1 at any width from
  // 360 to 2560. Worst case is the gold phrase at 1100px, and even there only
  // a single antialiased pixel dips; the 2nd percentile is 8.8:1.
  //
  // To switch the whole banner back off, change this entry to `home: null,` —
  // nothing else needs touching.
  home: {
    wide: "/hero/home-wide.webp",
    tablet: "/hero/home-tablet.webp",
    phone: "/hero/home-phone.webp",
  },
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
