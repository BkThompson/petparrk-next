"use client";

// ============================================================================
// HeroCardView — the SHARED Hero Card renderer.
// ============================================================================
// Single source of truth for the Hero Card's look + markup. Imported by BOTH:
//   • the owner display page  (app/pet-card/[slug]/hero/page.js)
//   • the public token page   (app/pet-card/[slug]/hero/[token]/page.js)
// Edit the card design HERE once; both pages update. Pass publicMode on the
// token page to hide owner-only actions (Share/Download/Copy + editor link).
// ============================================================================

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Share2,
  Download,
  Link2,
  Check,
  ChevronDown,
  Award,
  PawPrint,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import dynamic from "next/dynamic";
const VantaBackground = dynamic(() => import("./VantaBackground"), {
  ssr: false,
});
import { CssDesign, BUSY_DESIGNS } from "./HeroBackgrounds";
import HeroNameplate from "./HeroNameplate";
import {
  getActiveShareToken,
  createShareToken,
  buildShareUrl,
} from "../lib/petCardApi";
import { exportHeroFlipImage } from "./HeroFlipCard";

const HERO_PALETTE = {
  caramel: {
    stops: ["#F4A85F", "#D8762A", "#B95A18", "#8B3F0E"],
    accent: "#B95A18",
  },
  plum: {
    stops: ["#B967A8", "#8E3B7C", "#6A2660", "#471945"],
    accent: "#6A2660",
  },
  sky: {
    stops: ["#6BB0DC", "#2E7AA8", "#1B5C82", "#0E3D5A"],
    accent: "#1B5C82",
  },
  honey: {
    stops: ["#FCC773", "#E59B2B", "#B57614", "#7F4D08"],
    accent: "#B57614",
  },
  sage: {
    stops: ["#5BBE7D", "#2E8A4F", "#1A6638", "#0E4324"],
    accent: "#1A6638",
  },
  violet: {
    stops: ["#9D7AEB", "#6B3FCB", "#4A2A9E", "#2D1968"],
    accent: "#6B3FCB",
  },
  emerald: {
    stops: ["#3FCFA0", "#0E8060", "#0A5A45", "#043A2C"],
    accent: "#0A5A45",
  },
  copper: {
    stops: ["#EE9264", "#C7531D", "#973A0E", "#5E2207"],
    accent: "#973A0E",
  },
  teal: {
    stops: ["#46B5C0", "#0E6973", "#084850", "#042C32"],
    accent: "#084850",
  },
  rose: {
    stops: ["#F8A8B4", "#D85F70", "#A93D52", "#6E2034"],
    accent: "#A93D52",
  },
  mono: {
    stops: ["#3B5570", "#1A2D44", "#0F1F2E", "#060F1A"],
    accent: "#1A2D44",
  },
};

// Rarity tiers — distinct collectible colors (must match Hero Editor RARITY_TIERS).
// The editor saves the tier KEY (e.g. "legendary"); the card looks up label + color.
const RARITY_TIERS = {
  common: { label: "Beloved", color: "#8A94A6" },
  uncommon: { label: "Special", color: "#16A34A" },
  rare: { label: "Rare", color: "#2563EB" },
  epic: { label: "Epic", color: "#9333EA" },
  legendary: { label: "Legendary", color: "#F59E0B" },
};
const DEFAULT_THEME = "caramel";

// Independent customization defaults (mirror the editor)
const DEFAULT_BG = "#F8EFE2";
const DEFAULT_CARD = "#FFFFFF";
const DEFAULT_ACCENT = "#B95A18";
const DEFAULT_DESIGN = "gradient";
const DEFAULT_CATEGORY = "css";

const TAG_META = {
  champion: { label: "Champion", emoji: "🏆" },
  service_therapy: { label: "Service / Therapy", emoji: "⛑️" },
  emotional_support: { label: "Emotional Support", emoji: "💝" },
  rescue: { label: "Rescue", emoji: "🏠" },
  adventurer: { label: "Adventurer", emoji: "🏔️" },
  royalty: { label: "Royalty", emoji: "👑" },
  working: { label: "Working", emoji: "🦺" },
  birthday: { label: "Birthday", emoji: "🎂" },
  forever_loved: { label: "Forever Loved", emoji: "🌟" },
  young: { label: "Young", emoji: "🌱" },
  senior: { label: "Senior", emoji: "🌳" },
  special_needs: { label: "Special Needs", emoji: "🎗️" },
  foodie: { label: "Foodie", emoji: "🍖" },
  bff_pair: { label: "BFF Pair", emoji: "💞" },
};

const SPECIES_EMOJI = {
  dog: "🐕",
  cat: "🐈",
  bird: "🐦",
  rabbit: "🐰",
  fish: "🐠",
  reptile: "🦎",
  "small furry": "🐹",
  horse: "🐴",
};

// ---- helpers ----
function formatAge(birthday) {
  if (!birthday) return null;
  const birthMs = new Date(birthday).getTime();
  if (isNaN(birthMs)) return null;
  const diffMs = Date.now() - birthMs;
  if (diffMs < 0) return "Not born yet";
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 7) return days <= 1 ? "1 day old" : `${days} days old`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return w === 1 ? "1 week old" : `${w} weeks old`;
  }
  const months = Math.floor(days / 30.44);
  if (months < 24) return months === 1 ? "1 month old" : `${months} months old`;
  const years = Math.floor(days / 365.25);
  return years === 1 ? "1 year old" : `${years} years old`;
}

// Full date like "January 1, 2002" (dates are stored as YYYY-MM-DD; parse at
// local noon to avoid timezone day-shift).
function formatFullDate(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// "In Loving Memory" date line: a birth–passing range when the birthday is
// known, otherwise just the passing date. Gracefully handles adopted pets
// with no known birthdate.
function formatMemorialDate(birthday, passing) {
  const passed = formatFullDate(passing);
  const born = formatFullDate(birthday);
  if (born && passed) return `${born} – ${passed}`;
  return passed || born || null;
}

function speciesEmoji(species) {
  if (!species) return "🐾";
  return SPECIES_EMOJI[species.toLowerCase()] || "🐾";
}

function asArray(v) {
  return Array.isArray(v) ? v.filter(Boolean) : [];
}

function meaningful(v) {
  if (!v) return false;
  const t = String(v).trim().toLowerCase();
  return t && !["none", "n/a", "na", "no", "-", "nothing"].includes(t);
}

// =============================================================
// PAGE
function HeroBackground({ design, category, bg, accent, lighting }) {
  // Route by category: animated Vanta or abstract CSS.
  // Legacy pets saved with the removed "svg" scene category fall back to a
  // clean CSS gradient so their card still renders.
  if (category === "svg")
    return (
      <CssDesign
        design="gradient"
        bg={bg}
        accent={accent}
        lighting={lighting}
      />
    );
  if (category === "css")
    return (
      <CssDesign design={design} bg={bg} accent={accent} lighting={lighting} />
    );
  return <VantaBackground effect={design} bg={bg} accent={accent} fullHeight />;
}

export function HeroCardView({ pet, slug, previewMode, publicMode }) {
  // Draft / Publish: the public sees the PUBLISHED snapshot (hero_published);
  // the owner's preview (?preview=public) shows the DRAFT (live hero_* columns)
  // so they can check pending changes before publishing. Base pet info (name,
  // photo, species) always comes from the row itself.
  const pub = pet.hero_published || null;
  const data = publicMode || previewMode || !pub ? pet : { ...pet, ...pub };

  // ── Owner action buttons (Share / Copy / Download) ───────────────────────
  // Only rendered for the owner (!publicMode). Share & Copy hand out a PUBLIC
  // link, so they respect the master share_enabled kill switch: reuse an active
  // token, generate one if sharing is on, or send the owner to the central
  // Share & Privacy page if sharing is off. Download is a PRIVATE export of the
  // owner's own card (print → Save as PDF) — it never touches the public token
  // system, so it always works regardless of sharing state (industry standard:
  // exporting your own content is not a sharing action).
  const router = useRouter();
  const [actionBusy, setActionBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Resolve a public share URL for Share/Copy. Honors the kill switch.
  // Returns "" and redirects to /share if sharing is off (so nothing public is
  // created when the owner has globally disabled sharing).
  async function resolveShareUrl() {
    // Sharing globally off → don't create a token; send owner to manage it.
    if (!pet.share_enabled) {
      router.push(`/pet-card/${slug}/share`);
      return "";
    }
    // Reuse an existing active token if present.
    let token = null;
    const existing = await getActiveShareToken(pet.id, "hero");
    if (existing?.data?.token) {
      token = existing.data.token;
    } else {
      // Auto-generate on first share (sharing is on, so this is consented).
      const created = await createShareToken(pet.id, "hero");
      token = created?.data?.token || null;
    }
    if (!token) {
      return "";
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return buildShareUrl(pet.slug, "hero", token, origin);
  }

  async function handleShare() {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      const url = await resolveShareUrl();
      if (!url) {
        return;
      }

      const isTouchDevice =
        typeof window !== "undefined" &&
        ("ontouchstart" in window || (navigator?.maxTouchPoints ?? 0) > 0);

      if (
        isTouchDevice &&
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      ) {
        try {
          await navigator.share({
            title: `${pet.name} — Hero Card`,
            text: `Check out ${pet.name}'s Hero Card`,
            url,
          });
          return;
        } catch {
          // cancelled / failed → fall through to copy
        }
      }

      await copyToClipboard(url, "share");
    } catch (err) {
      console.error("[share] FAILED:", err);
    } finally {
      setActionBusy(false);
    }
  }

  async function handleCopy() {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      const url = await resolveShareUrl();
      if (!url) return; // redirected to /share or failed
      await copyToClipboard(url, "copy");
    } finally {
      setActionBusy(false);
    }
  }

  async function copyToClipboard(url, which) {
    const flagCopied = () => {
      if (which === "share") {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } else {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    };

    // 1) Modern Clipboard API — only reliable in a secure context (HTTPS, or
    //    localhost on desktop). This is the production path.
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function" &&
      typeof window !== "undefined" &&
      window.isSecureContext === true
    ) {
      try {
        await navigator.clipboard.writeText(url);
        flagCopied();
        return;
      } catch {
        // fall through
      }
    }

    // 2) Legacy execCommand — can work on desktop HTTP, unreliable on mobile.
    try {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.setAttribute("readonly", "");
      // iOS will not copy from a readonly field, ignores anything positioned
      // off-viewport, and needs a real Selection Range — select() alone is not
      // enough. 16px avoids the focus zoom.
      ta.contentEditable = "true";
      ta.readOnly = false;
      ta.style.cssText =
        "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;" +
        "outline:0;opacity:0;font-size:16px;-webkit-user-select:text;user-select:text;";
      document.body.appendChild(ta);

      const range = document.createRange();
      range.selectNodeContents(ta);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      ta.setSelectionRange(0, 999999);

      const ok = document.execCommand("copy");
      sel.removeAllRanges();
      document.body.removeChild(ta);
      if (ok) {
        flagCopied();
        return;
      }
      // Last resort. Over plain http:// on iOS there is no reliable
      // programmatic copy at all: the Clipboard API needs a secure context and
      // Safari has stopped honouring execCommand. Rather than fail silently or
      // claim a copy that never happened, put the link in front of the user so
      // they can copy it by hand. Production is HTTPS, so this path is only
      // reached when testing over a LAN address.
      if (typeof window !== "undefined" && window.prompt) {
        window.prompt("Copy this link:", url);
      }
    } catch {
      // If even the textarea path throws, there's nothing more we can do
      // silently — leave it; production (HTTPS) uses the reliable path above.
    }
  }

  // Download = export the card as a trading-card IMAGE (PNG). Private export of
  // the owner's own card — independent of public sharing, always available.
  const [downloading, setDownloading] = useState(false);
  // Share differs from Copy link only when the OS share sheet exists — a touch
  // device in a secure context, since navigator.share is gated on HTTPS.
  // Everywhere else handleShare falls through to the same copy that handleCopy
  // uses, so showing both is two buttons doing one thing.
  const [canNativeShare, setCanNativeShare] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const touch =
      "ontouchstart" in window || (navigator?.maxTouchPoints ?? 0) > 0;
    setCanNativeShare(
      touch &&
        typeof navigator.share === "function" &&
        window.isSecureContext === true,
    );
  }, []);
  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      await exportHeroFlipImage(pet);
    } finally {
      setDownloading(false);
    }
  }

  // Independent customization: each surface its own color, plus a chosen
  // background design. Falls back to coordinated defaults for any unset field.
  const bgColor = data.hero_bg_color || DEFAULT_BG;
  const cardColor = data.hero_card_color || DEFAULT_CARD;
  const accentColor = data.hero_accent_color || DEFAULT_ACCENT;
  const bgDesign = data.hero_bg_design || DEFAULT_DESIGN;
  const bgCategory = data.hero_bg_category || DEFAULT_CATEGORY;
  // Per-design lighting map (JSON). Pick the entry for the active design.
  const bgLightingMap = (() => {
    const raw = data.hero_lighting;
    if (!raw) return {};
    try {
      const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
      return obj && typeof obj === "object" ? obj : {};
    } catch {
      return {};
    }
  })();
  const bgLighting = bgLightingMap[bgDesign] || null;
  const barFill = `linear-gradient(90deg, ${accentColor}, ${accentColor})`;

  // ---- color math (WCAG-aware) ----------------------------------------
  const toRgb = (hex) => {
    const h = (hex || "#000000").replace("#", "");
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  };
  const hexToRgba = (hex, a) => {
    const [r, g, b] = toRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };
  const toHex = (r, g, b) =>
    "#" +
    [r, g, b]
      .map((v) =>
        Math.max(0, Math.min(255, Math.round(v)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");
  // Relative luminance (WCAG).
  const lum = (hex) => {
    const c = toRgb(hex).map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  // WCAG contrast ratio between two colors.
  const contrast = (a, b) => {
    const la = lum(a);
    const lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  // Lighten/darken a hex toward white/black by amount t (0..1).
  const mix = (hex, target, t) => {
    const [r, g, b] = toRgb(hex);
    const [tr, tg, tb] = toRgb(target);
    return toHex(r + (tr - r) * t, g + (tg - g) * t, b + (tb - b) * t);
  };
  // Return a version of `color` that meets `ratio` against `bg`, nudging it
  // lighter or darker (depending on bg) until it passes or we run out of room.
  const ensureContrast = (color, bg, ratio = 4.5) => {
    if (contrast(color, bg) >= ratio) return color;
    const target = lum(bg) > 0.4 ? "#000000" : "#FFFFFF";
    let best = color;
    for (let t = 0.1; t <= 1; t += 0.1) {
      const candidate = mix(color, target, t);
      if (contrast(candidate, bg) >= ratio) return candidate;
      best = candidate;
    }
    return best;
  };

  const cardIsDark = lum(cardColor) < 0.4;

  // ---- stat fill tiers: subtle escalation so high stats read as a brag ----
  // 1-7: flat accent. 8-9: accent->lighter sheen. 10: bright gradient + glow.
  const accentLite = mix(accentColor, "#FFFFFF", 0.34);
  const accentBright = mix(accentColor, "#FFFFFF", 0.5);
  const statFillFor = (v) => {
    if (v >= 10)
      return `linear-gradient(90deg, ${accentColor} 0%, ${accentBright} 100%)`;
    if (v >= 8)
      return `linear-gradient(90deg, ${accentColor} 0%, ${accentLite} 100%)`;
    return barFill;
  };
  const statGlowFor = (v) =>
    v >= 10 ? `0 0 8px ${hexToRgba(accentColor, 0.55)}` : "none";

  // Base text + muted on the card surface (always AA).
  const cardText = cardIsDark ? "#FFFFFF" : "#172531";
  const cardMuted = cardIsDark
    ? "rgba(255,255,255,0.66)"
    : "rgba(23,37,49,0.60)";
  // Accent, contrast-corrected so accent-colored text/labels stay readable on
  // the card surface (e.g. section labels, the quote, "Made on PetParrk").
  const accentOnCard = ensureContrast(accentColor, cardColor, 4.5);
  // ---- text colors for content sitting on the PAGE BACKGROUND ----
  // (the right-hand "Meet X" panel sits on --t-bg, not on the card)
  const bgIsDark = lum(bgColor) < 0.4;
  const bgText = bgIsDark ? "#FFFFFF" : "#172531";
  const bgMuted = bgIsDark ? "rgba(255,255,255,0.72)" : "rgba(23,37,49,0.62)";
  // Intro / framing color override. When the owner sets hero_intro_color, it
  // colors the intro name, the subtitle (a softened version), and the
  // "Made on PetParrk" footer + paw — one coordinated accent. Empty/unset =
  // AUTO (the bgText/bgMuted defaults above). The name uses the exact color;
  // the subtitle uses the same hue at reduced opacity so it reads as secondary.
  const introOverride = meaningful(data.hero_intro_color)
    ? data.hero_intro_color
    : null;
  // "Meet {name}" heading has its OWN color control (hero_name_color), separate
  // from the intro/footer color. Falls back to AUTO (bgText) when unset.
  const nameOverride = meaningful(data.hero_name_color)
    ? data.hero_name_color
    : null;
  const introName = nameOverride || bgText;
  // Subtitle + footer follow the intro/footer color.
  const introSub = introOverride ? hexToRgba(introOverride, 0.75) : bgMuted;
  // Footer "Made on PetParrk" sits on the CARD surface. When an intro color is
  // Footer accent ("PetParrk" + paw) has its OWN color control now
  // (hero_footer_color), decoupled from the intro color. Falls back to the
  // intro color, then the default accent-on-card. Contrast-fitted to the card.
  const footerOverride = meaningful(data.hero_footer_color)
    ? data.hero_footer_color
    : introOverride;
  const footerColor = footerOverride
    ? ensureContrast(footerOverride, cardColor, 4.5)
    : null; // null => CSS default (--t-accent-on-card)
  const accentOnBg = ensureContrast(accentColor, bgColor, 4.5);
  // Pick whichever of white/navy has the higher contrast against a given
  // surface — more reliable than a luminance threshold for edge colors.
  const pickReadable = (surface) =>
    contrast("#FFFFFF", surface) >= contrast("#172531", surface)
      ? "#FFFFFF"
      : "#172531";
  // The Share button is FILLED with accentOnBg, so its text must contrast THAT
  // fill. The Download/Copy buttons' outline+text must contrast the page bg.
  // Both chosen by real contrast so they work for ANY accent/background.
  const textOnAccentOnBg = pickReadable(accentOnBg);
  const btnOutlineOnBg = pickReadable(bgColor);
  // "Hero Card" eyebrow label color — controlled by the editor's label-color
  // picker (hero_label_color). Falls back to the accent when unset, and is
  // contrast-ensured on the background. The flip/share card mirrors this EXACT
  // logic so the eyebrow color matches everywhere.
  // Option B: render the owner's EXACT chosen label color — no contrast
  // auto-adjustment. The label is a deliberate aesthetic choice, so what they
  // pick is what shows. (The editor warns them if a pick is low-contrast.)
  // Only the default-fallback (accent) is left raw too, for consistency.
  const labelColor =
    data.hero_label_color || data.hero_accent_color || accentColor;
  // Banner sits on the accent color — pick readable text on it.
  const bannerText = lum(accentColor) > 0.5 ? "#172531" : "#FFFFFF";
  // Scrim trigger: busy/patterned backgrounds (Vanta or flagged designs) always
  // get a subtle scrim behind text; calm ones only if text contrast < AA.
  const bgBusy =
    bgCategory === "vanta" || (BUSY_DESIGNS && BUSY_DESIGNS.has(bgDesign));
  // Dynamic scrim: opacity scales with how far the text falls below readable.
  // - Solid/gradient backgrounds: use the exact text-vs-bg contrast.
  // - Busy/patterned backgrounds: assume a worst-case lower contrast, since the
  //   text sits over multiple colors we can't measure as one.
  // The text sits over the background. For SOLID/gradient backgrounds we can
  // measure exact contrast. For BUSY/patterned backgrounds the text crosses
  // multiple colors (e.g. navy + gold stripes), so we take the WORST contrast
  // among the colors actually present (bg AND accent) — whichever is hardest.
  const cVsBg = contrast(bgText, bgColor);
  const cVsAccent = contrast(bgText, accentColor);
  const effContrast = bgBusy
    ? Math.min(cVsBg, cVsAccent) // hardest color the text crosses
    : cVsBg;
  // Ramp: at/above AA (4.5) => no scrim; falls to full strength by 2.0.
  const deficit = Math.max(0, Math.min(1, (4.5 - effContrast) / (4.5 - 2.0)));
  // Busy/patterned backgrounds ALWAYS get a scrim (they have a floor below, so
  // text never sits directly on the raw pattern even when single-color contrast
  // looks fine). Calm/solid backgrounds only get a scrim when the text actually
  // falls below readable contrast.
  // Show the scrim on ALL patterned backgrounds (any CSS design or animated
  // Vanta) — matching the flip card exactly — plus any calm/solid bg where text
  // contrast is low. (Previously only the 6 "busy" designs got it, so calm CSS
  // designs like Grain/Solid/Blend showed no scrim while the flip card did.)
  const isPatterned = bgCategory === "css" || bgCategory === "vanta";
  const needsScrim = isPatterned || deficit > 0.02;
  // Scrim strength is defined ONCE by the light/mid values (the look we like),
  // then dark backgrounds reuse the SAME values scaled by one consistent ratio
  // — so the dark scrim is an exact lighter mirror of the light/mid scrim, not
  // a separately-tuned set of numbers. (Lower ratio => lighter on dark bgs.)
  const SCRIM_BASE_BUSY_CEIL = 0.85; // light/mid busy ceiling (source of truth)
  const SCRIM_BASE_SOLID_CEIL = 0.6; // light/mid solid ceiling
  const SCRIM_BASE_BUSY_FLOOR = 0.55; // light/mid busy floor
  const DARK_SCRIM_RATIO = 0.55; // dark = this fraction of the light/mid strength
  const scrimScale = bgIsDark ? DARK_SCRIM_RATIO : 1;

  const maxScrim =
    (bgBusy ? SCRIM_BASE_BUSY_CEIL : SCRIM_BASE_SOLID_CEIL) * scrimScale;
  const rawAlpha = deficit * maxScrim;
  // Floor (the minimum scrim a busy bg always gets). On LIGHT pages the scrim is
  // a light panel, so masking the busy pattern requires real OPACITY — a
  // half-transparent light panel just lets the dots show through. So light pages
  // use a higher "frosted panel" floor; dark pages keep their lighter floor.
  const LIGHT_BUSY_FLOOR = 0.88; // light frosted-panel floor (masks pattern)
  const busyFloor = bgIsDark
    ? SCRIM_BASE_BUSY_FLOOR * scrimScale
    : LIGHT_BUSY_FLOOR;
  const scrimAlpha = (
    isPatterned ? Math.max(rawAlpha, busyFloor) : rawAlpha
  ).toFixed(3);
  // Scrim tone: a clean, tinted backdrop behind the intro text.
  // - Dark pages: a deep dark panel (light intro text reads on it).
  // - Light pages: a light panel tinted toward the CARD surface (not pure
  //   white), so it reads as a clean solid that MASKS busy/dotted patterns and
  //   lets the dark intro text separate. Separation here comes from the scrim
  //   being opaque enough to cover the pattern (see floor below), not from
  //   making it darker — dark scrim + dark text would be unreadable.
  const scrimBase = bgIsDark
    ? mix(cardColor, "#0B131A", 0.95) // deep, card-tinted dark
    : mix(cardColor, "#FFFFFF", 0.55); // light, card-tinted panel (was 0.82)
  const sb = toRgb(scrimBase);
  const scrimColor = `rgba(${sb[0]},${sb[1]},${sb[2]},${scrimAlpha})`;
  // Chip surface: a soft tint that sits on the card and still reads.
  const chipBg = cardIsDark ? "rgba(255,255,255,0.10)" : "rgba(23,37,49,0.05)";
  const chipText = cardText;
  // Loves = friendly green, Dislikes = warm red — both contrast-corrected.
  const lovesColor = ensureContrast("#16A34A", cardColor, 4.5);
  const dislikesColor = ensureContrast("#EF4444", cardColor, 4.5);
  // Distinct dynamic colors for the two Food sub-labels so they don't read as
  // one block. Amber for favorite foods, teal for quirks — both contrast-fitted
  // to the card like loves/dislikes.
  // Favorite foods and Food quirks share one dynamic color (teal), contrast-
  // fitted to the card so it adapts when the theme/accent changes — same
  // pattern as loves/dislikes.
  const foodsColor = ensureContrast("#0891B2", cardColor, 4.5);

  const themeVars = {
    "--t-bg": bgColor,
    "--t-card": cardColor,
    "--t-accent": accentColor,
    "--t-accent-soft": hexToRgba(accentColor, 0.5),
    "--t-frame": hexToRgba(accentColor, 0.55),
    "--t-card-text": cardText,
    "--t-card-muted": cardMuted,
    "--t-card-border": cardIsDark
      ? "rgba(255,255,255,0.14)"
      : "rgba(23,37,49,0.10)",
    // Single neutral divider color for ALL section/footer/column dividers.
    // Mid-gray (Muted #9CA3AF) reads on both light and dark cards, one value.
    "--t-divider": "#9CA3AF",
    "--t-accent-on-card": accentOnCard,
    "--t-chip-bg": chipBg,
    "--t-chip-text": chipText,
    "--t-loves": lovesColor,
    "--t-dislikes": dislikesColor,
    "--t-foods": foodsColor,
    "--t-bg-text": bgText,
    "--t-bg-muted": bgMuted,
    "--t-intro-name": introName,
    "--t-intro-sub": introSub,
    "--t-footer": footerColor || "var(--t-accent-on-card)",
    "--t-accent-on-bg": accentOnBg,
    "--t-label": labelColor,
    "--t-text-on-accent-on-bg": textOnAccentOnBg,
    "--t-btn-outline-on-bg": btnOutlineOnBg,
    "--t-banner-text": bannerText,
    "--t-scrim": needsScrim ? scrimColor : "transparent",
  };

  const tags = asArray(data.identity_tags);
  // "Forever Loved" becomes its own In Loving Memory section, so exclude it
  // from the generic badge chips.
  const badgeTags = tags.filter((t) => t !== "forever_loved");
  const isMemorial = tags.includes("forever_loved");
  const memorialMessage = meaningful(data.memorial_message)
    ? data.memorial_message
    : null;
  const passingDate = meaningful(data.passing_date) ? data.passing_date : null;
  const memorialBirth = meaningful(data.birth_date) ? data.birth_date : null;
  const memorialDate = formatMemorialDate(memorialBirth, passingDate);
  const hasMemorial = isMemorial && (memorialMessage || memorialDate);
  const traits = asArray(data.personality_traits);
  const loves = asArray(data.loves);
  const dislikes = asArray(data.dislikes);
  const favoriteFoods = asArray(data.favorite_foods);
  const stats = asArray(data.hero_stats);
  const age = formatAge(pet.birthday);
  const hasLovesDislikes =
    loves.length > 0 || dislikes.length > 0 || favoriteFoods.length > 0;

  // Rarity tier resolution now lives inside <HeroNameplate> (shared with the
  // Pet Cards hub). It receives the raw data.hero_rarity key and looks up the
  // label + color from HERO_RARITY_TIERS (identical to RARITY_TIERS here).

  // Body empty-state: true only when the pet has NO personality content at all.
  // Shown as a gentle nudge to the Hero Editor instead of a blank card body.
  const bodyEmpty =
    tags.length === 0 &&
    stats.length === 0 &&
    traits.length === 0 &&
    !hasLovesDislikes &&
    !meaningful(data.fun_fact) &&
    !meaningful(pet.rescue_story);

  return (
    <div
      className={`hc-stage ${
        previewMode
          ? "hc-stage--preview"
          : !publicMode
            ? "hc-stage--owner"
            : "hc-stage--public"
      }`}
      style={themeVars}
    >
      <div className="hc-bg-layer">
        <HeroBackground
          design={bgDesign}
          category={bgCategory}
          bg={bgColor}
          accent={accentColor}
          lighting={bgLighting}
        />
      </div>
      {previewMode && (
        <div className="hc-preview-bar">
          <span className="hc-preview-text">
            Preview of your current card — this is how it will look once you
            publish.{" "}
            <Link
              href={`/pet-card/${slug}/hero-edit`}
              className="hc-preview-exit"
            >
              Exit preview
              <ArrowRight size={14} strokeWidth={2.4} />
            </Link>
          </span>
        </div>
      )}

      {/* Owner nav bar — same treatment + fixed position as the preview bar,
          but for the OWNER viewing their own live Hero card. Back on the left,
          jump-to-editor on the right. Hidden for public shared views and while
          previewing (the preview bar occupies this slot then). */}
      {!publicMode && !previewMode && (
        <div className="hc-owner-bar">
          <Link href="/pet-card" className="hc-owner-back">
            <ArrowLeft size={15} strokeWidth={2.4} />
            Pet Cards
          </Link>
          <Link href={`/pet-card/${slug}/hero-edit`} className="hc-owner-edit">
            Edit Hero Card
            <ArrowRight size={14} strokeWidth={2.4} />
          </Link>
        </div>
      )}

      <div className="pp-container hc-container">
        <div className="hc-inner">
          {/* tablet/mobile intro (above card) */}
          <div className="hc-intro">
            <p className="hc-eyebrow">Hero Card</p>
            <h1 className="hc-intro-name">Meet {data.nickname || pet.name}</h1>
            <p className="hc-intro-sub">
              {meaningful(data.hero_description)
                ? data.hero_description
                : `A little about who ${data.nickname || pet.name} is.`}
            </p>
          </div>

          {/* CARD */}
          <div className="hc-card-wrap">
            <div className="hc-card">
              <div className="hc-leftcol">
                <HeroNameplate
                  variant="full"
                  name={pet.name}
                  nickname={data.nickname}
                  breed={pet.breed}
                  age={age}
                  photoUrl={pet.photo_url}
                  species={pet.species}
                  rarity={data.hero_rarity}
                />

                {(loves.length > 0 || dislikes.length > 0) && (
                  <div className="hc-prefs-section hc-leftcol-section">
                    <div className="hc-section-label hc-prefs-title">
                      Preferences
                    </div>
                    <div className="hc-prefs">
                      {loves.length > 0 && (
                        <ChipColumn
                          className="hc-loves"
                          chipClass="hc-chip-love"
                          heading="Loves"
                          items={loves}
                          cap={8}
                        />
                      )}
                      {dislikes.length > 0 && (
                        <ChipColumn
                          className="hc-dislikes"
                          chipClass="hc-chip-dislike"
                          heading="Not a fan"
                          items={dislikes}
                          cap={8}
                        />
                      )}
                    </div>
                  </div>
                )}

                {favoriteFoods.length > 0 && (
                  <div className="hc-prefs-section hc-leftcol-section hc-foods-section">
                    <div className="hc-section-label hc-prefs-title">
                      Food preferences
                    </div>
                    <div className="hc-prefs">
                      <ChipColumn
                        className="hc-foods"
                        chipClass="hc-chip-food"
                        heading="Favorite foods"
                        items={favoriteFoods}
                        cap={8}
                      />
                      {meaningful(data.food_quirks) && (
                        <div className="hc-like-col hc-quirks">
                          <h4>Food quirks</h4>
                          <p className="hc-food-quirks">{data.food_quirks}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="hc-content">
                {meaningful(data.hero_title) && (
                  <div
                    className="hc-title-banner"
                    style={{ background: accentColor }}
                  >
                    {data.hero_title}
                  </div>
                )}

                <div className="hc-body">
                  {bodyEmpty && !publicMode && !previewMode && (
                    <div className="hc-empty">
                      <p className="hc-empty-title">
                        {pet.name}&apos;s Hero Card is just getting started
                      </p>
                      <p className="hc-empty-sub">
                        Add personality traits, stats, badges, and a fun fact to
                        bring this card to life.
                      </p>
                      <Link
                        href={`/pet-card/${slug}/hero-edit`}
                        className="hc-empty-link"
                      >
                        Open the Hero Editor →
                      </Link>
                    </div>
                  )}

                  {stats.length > 0 && (
                    <div className="hc-section hc-sec-stats">
                      <div className="hc-section-label">Stats</div>
                      <div className="hc-stats">
                        {stats.map((s, i) => {
                          const val = Math.max(
                            0,
                            Math.min(10, Number(s.value) || 0),
                          );
                          return (
                            <div className="hc-stat-row" key={i}>
                              <div className="hc-stat-name">
                                <span className="hc-stat-emoji">{s.emoji}</span>
                                <span className="hc-stat-label-text">
                                  {s.label}
                                </span>
                              </div>
                              <div className="hc-stat-bar">
                                <div
                                  className="hc-stat-fill"
                                  style={{
                                    width: `${val * 10}%`,
                                    background: statFillFor(val),
                                    boxShadow: statGlowFor(val),
                                  }}
                                />
                              </div>
                              <div
                                className={`hc-stat-val${val >= 10 ? " is-max" : ""}`}
                              >
                                {val >= 10 && (
                                  <span className="hc-stat-star">★</span>
                                )}
                                {val}/10
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {traits.length > 0 && (
                    <div className="hc-section hc-sec-personality">
                      <div className="hc-section-label">Personality</div>
                      <ExpandableChips
                        items={traits.map((t, i) => ({ key: i, label: t }))}
                        cap={4}
                      />
                    </div>
                  )}

                  {meaningful(data.fun_fact) && (
                    <div className="hc-section hc-sec-funfact">
                      <div className="hc-section-label">Fun fact</div>
                      <div className="hc-funfact">
                        <span className="hc-quote">&ldquo;</span>
                        {data.fun_fact}
                        <span className="hc-quote">&rdquo;</span>
                      </div>
                    </div>
                  )}

                  {badgeTags.length > 0 && (
                    <div className="hc-section hc-sec-badges">
                      <div className="hc-section-label">Badges</div>
                      <ExpandableChips
                        items={badgeTags.map((s) => ({
                          key: s,
                          emoji: TAG_META[s]?.emoji,
                          label: TAG_META[s]?.label || s,
                        }))}
                        cap={4}
                      />
                    </div>
                  )}

                  {meaningful(data.rescue_story) && (
                    <div className="hc-section hc-sec-story">
                      <div className="hc-section-label">My story</div>
                      <ClampText
                        text={data.rescue_story}
                        org={
                          meaningful(data.rescue_organization)
                            ? data.rescue_organization
                            : null
                        }
                        accent={accentOnCard}
                        lines={3}
                      />
                    </div>
                  )}

                  {hasMemorial && (
                    <div className="hc-section hc-sec-memory">
                      <div className="hc-section-label hc-memory-label">
                        In Loving Memory
                      </div>
                      {memorialMessage && (
                        <p className="hc-memory-msg">{memorialMessage}</p>
                      )}
                      {memorialDate && (
                        <p className="hc-memory-date">{memorialDate}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="hc-footer">
                <span className="hc-made">
                  Made on <b>PetParrk</b>{" "}
                  <PawPrint
                    size={13}
                    strokeWidth={2.5}
                    className="hc-made-paw"
                    aria-hidden="true"
                  />
                </span>
              </div>
            </div>
          </div>

          {/* desktop side panel */}
          <div className="hc-panel">
            <p className="hc-eyebrow">Hero Card</p>
            <h1 className="hc-panel-name">Meet {data.nickname || pet.name}</h1>
            <p className="hc-panel-sub">
              {meaningful(data.hero_description)
                ? data.hero_description
                : `A little about who ${data.nickname || pet.name} is.`}
            </p>
            {!publicMode && (
              <>
                <div className="hc-panel-actions">
                  <button
                    className="hc-btn hc-btn-primary"
                    onClick={handleShare}
                    disabled={actionBusy}
                  >
                    {shareCopied ? (
                      <>
                        <Check size={18} /> Link copied!
                      </>
                    ) : (
                      <>
                        <Share2 size={18} />{" "}
                        {canNativeShare
                          ? "Share Hero Card"
                          : "Copy Hero Card link"}
                      </>
                    )}
                  </button>
                  <button
                    className="hc-btn hc-btn-ghost"
                    onClick={handleDownload}
                    disabled={downloading}
                  >
                    <Download size={18} />{" "}
                    {downloading ? "Preparing…" : "Download Hero Card"}
                  </button>
                  {/* Only a separate control when the primary button opens the
                      OS share sheet. Otherwise the primary already copies the
                      link and this is a second button doing the same thing. */}
                  {canNativeShare && (
                    <button
                      className="hc-btn hc-btn-ghost"
                      onClick={handleCopy}
                      disabled={actionBusy}
                    >
                      {copied ? (
                        <>
                          <Check size={18} /> Copied
                        </>
                      ) : (
                        <>
                          <Link2 size={18} /> Copy link
                        </>
                      )}
                    </button>
                  )}
                </div>
                <p className="hc-panel-foot">
                  Add more personality in the{" "}
                  <Link href={`/pet-card/${slug}/hero-edit`}>
                    Hero Editor →
                  </Link>
                </p>
              </>
            )}
          </div>

          {/* tablet/mobile actions (below card) — stacked. Owner-only. */}
          {!publicMode && (
            <div className="hc-below-actions">
              <button
                className="hc-btn hc-btn-primary"
                onClick={handleShare}
                disabled={actionBusy}
              >
                {shareCopied ? (
                  <>
                    <Check size={18} /> Link copied!
                  </>
                ) : (
                  <>
                    <Share2 size={18} />{" "}
                    {canNativeShare ? "Share Hero Card" : "Copy Hero Card link"}
                  </>
                )}
              </button>
              <button
                className="hc-btn hc-btn-ghost"
                onClick={handleDownload}
                disabled={downloading}
              >
                <Download size={18} />{" "}
                {downloading ? "Preparing…" : "Download Hero Card"}
              </button>
              {canNativeShare && (
                <button
                  className="hc-btn hc-btn-ghost"
                  onClick={handleCopy}
                  disabled={actionBusy}
                >
                  {copied ? (
                    <>
                      <Check size={18} /> Copied
                    </>
                  ) : (
                    <>
                      <Link2 size={18} /> Copy link
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{heroCardCss}</style>
    </div>
  );
}

// Chips with show more / show less
function ExpandableChips({ items, cap }) {
  const [expanded, setExpanded] = useState(false);
  const overflow = items.length - cap;
  const visible = expanded ? items : items.slice(0, cap);
  return (
    <div className="hc-tags">
      {visible.map((it, idx) => (
        <span
          className={`hc-tag${expanded && idx >= cap ? " hc-fade" : ""}`}
          key={it.key}
        >
          {it.emoji ? <span>{it.emoji}</span> : null} {it.label}
        </span>
      ))}
      {overflow > 0 && !expanded && (
        <button
          className="hc-tag hc-tag-toggle"
          onClick={() => setExpanded(true)}
        >
          <Plus size={13} strokeWidth={2.5} /> {overflow} more
        </button>
      )}
      {expanded && overflow > 0 && (
        <button
          className="hc-tag hc-tag-toggle"
          onClick={() => setExpanded(false)}
        >
          <Minus size={13} strokeWidth={2.5} /> Show less
        </button>
      )}
    </div>
  );
}

// Loves / dislikes as bullet lists with show more / less
function ChipColumn({ className, chipClass, heading, items, cap }) {
  const [expanded, setExpanded] = useState(false);
  const overflow = items.length - cap;
  const visible = expanded ? items : items.slice(0, cap);
  return (
    <div className={`hc-like-col ${className}`}>
      {heading ? <h4>{heading}</h4> : null}
      <ul>
        {visible.map((item, i) => (
          <li key={i} className={expanded && i >= cap ? "hc-fade" : ""}>
            {item}
          </li>
        ))}
        {overflow > 0 && !expanded && (
          <li className="hc-like-toggle-li">
            <button
              className="hc-like-toggle"
              onClick={() => setExpanded(true)}
            >
              <Plus size={13} strokeWidth={2.5} /> {overflow} more
            </button>
          </li>
        )}
        {overflow > 0 && expanded && (
          <li className="hc-like-toggle-li">
            <button
              className="hc-like-toggle"
              onClick={() => setExpanded(false)}
            >
              <Minus size={13} strokeWidth={2.5} /> Show less
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}

// read-more clamp with smooth height animation
function ClampText({ text, org, accent, lines = 3 }) {
  const [collapsed, setCollapsed] = useState(true);
  const [needsClamp, setNeedsClamp] = useState(false);
  const [maxH, setMaxH] = useState("none");
  const [collapsedH, setCollapsedH] = useState("none");
  const ref = useRef(null);

  // Measure the ACTUAL rendered line-height of the element (varies by viewport
  // — desktop's wider column + any responsive font sizing). Comparing the real
  // collapsed height (lines * actual line-height) against the real full height
  // avoids the old bug where a hardcoded 14px/1.6 guess made the toggle appear
  // on desktop even when the text fit in fewer lines than `lines`.
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const measure = () => {
      const cs = window.getComputedStyle(el);
      let lh = parseFloat(cs.lineHeight);
      if (Number.isNaN(lh)) {
        lh = parseFloat(cs.fontSize) * 1.5;
      }
      const collapsedPx = lh * lines;
      // Measure the natural full height regardless of the current clamp.
      const prev = el.style.maxHeight;
      el.style.maxHeight = "none";
      const full = el.scrollHeight;
      el.style.maxHeight = prev;
      setCollapsedH(`${collapsedPx}px`);
      setNeedsClamp(full > collapsedPx + 4);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [text, lines]);

  useEffect(() => {
    if (!ref.current) return;
    if (collapsed) {
      setMaxH(collapsedH);
    } else {
      setMaxH(`${ref.current.scrollHeight}px`);
    }
  }, [collapsed, collapsedH, text]);

  return (
    <div className="hc-clampable">
      <div
        className="hc-clamp-text"
        ref={ref}
        style={{ maxHeight: needsClamp ? maxH : "none" }}
      >
        {text}
      </div>
      {needsClamp && (
        <button
          className="hc-read-more"
          style={{ color: accent }}
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? "Read more" : "Show less"}
          <ChevronDown
            size={14}
            className="hc-chev"
            style={{ transform: collapsed ? "none" : "rotate(180deg)" }}
          />
        </button>
      )}
      {org && (
        <p className="hc-org">
          Adopted from: <span className="hc-org-name">{org}</span>
        </p>
      )}
    </div>
  );
}

const heroCardCss = `
  .hc-preview-bar {
    position:fixed; top:64px; left:0; right:0; z-index:60;
    background:var(--navy); color:#fff; padding:10px 16px;
    display:flex; justify-content:center; align-items:center; gap:10px 16px; flex-wrap:wrap;
    font-size:13px; font-weight:500; box-shadow:0 4px 14px rgba(0,0,0,0.20); text-align:center;
  }
  .hc-preview-text { display:inline; }
  .hc-preview-exit { color:var(--gold); font-weight:700; text-decoration:none; white-space:nowrap; }
  .hc-preview-exit svg { vertical-align:-2px; margin-left:3px; }
  .hc-preview-exit:hover { text-decoration:underline; }
  /* Owner nav bar — mirrors .hc-preview-bar exactly (same fixed slot below the
     64px navbar, same navy fill, same gold accent), laid out as back-left /
     edit-right. Reads on any card theme because it brings its own navy bg. */
  .hc-owner-bar {
    position:fixed; top:64px; left:0; right:0; z-index:60;
    background:var(--navy); color:#fff; padding:10px 16px;
    display:flex; justify-content:space-between; align-items:center; gap:10px 16px;
    font-size:13px; font-weight:500; box-shadow:0 4px 14px rgba(0,0,0,0.20);
  }
  /* 22.1px as bare text links. Padding grows the target, the negative
     margin keeps them where they sit in the header row. */
  .hc-owner-back, .hc-owner-edit {
    display:inline-flex; align-items:center; gap:6px; min-height:44px;
    padding:11px 0; margin:-11px 0;
    font-weight:700; text-decoration:none; white-space:nowrap;
  }
  .hc-owner-back { color:#fff; }
  .hc-owner-back svg { vertical-align:-2px; }
  .hc-owner-back:hover { text-decoration:underline; }
  .hc-owner-edit { color:var(--gold); }
  .hc-owner-edit svg { vertical-align:-2px; }
  .hc-owner-edit:hover { text-decoration:underline; }
  .hc-stage {
    --navy:#172531; --terracotta:#CF5C36; --terracotta-dark:#A8471D;
    --cream:#F5F0E8; --border:#EDE8E0; --muted:#717A86; --slate:#4B5563;
    --gold:#EFC88B; --success:#1A6641;
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
    color: var(--navy);
    background: var(--t-bg);
    min-height: 100vh;
    overflow: hidden;
    position: relative;
    padding: 56px 0 72px;
  }
  /* Independent top-spacing per viewer state. The owner and preview states show
     a fixed bar at the top (needs extra clearance); the public state has no bar.
     These are separate so logged-in and logged-out spacing can be tuned without
     affecting each other. Adjust each padding-top on its own. */
  .hc-stage--owner   { padding-top: 86px; }
  .hc-stage--preview { padding-top: 86px; }
  .hc-stage--public  { padding-top: 45px; }
  /* Background sits in an absolute layer INSIDE the stage so the footer and all
     content flow normally. The Vanta canvas is given a stable viewport-anchored
     height and only resizes on WIDTH changes, so a toggle changing the page
     height never resets the effect (no jump) while the footer still shows. */
  .hc-bg-layer { position:absolute; inset:0; z-index:0; overflow:hidden; pointer-events:none; }
  .hc-container { position: relative; z-index: 1; }
  .hc-inner {
    margin-top: 8px;
    display: grid;
    grid-template-columns: 400px 440px;
    justify-content: center;
    gap: 64px;
    align-items: start;
  }
  .hc-bg-orb { position:absolute; border-radius:50%; filter:blur(70px); opacity:0.7; pointer-events:none; z-index:0; }
  .hc-o1 { width:520px; height:520px; top:-140px; left:-120px; background:radial-gradient(circle,var(--t-accent),transparent 68%); animation:hcFloat1 18s ease-in-out infinite; }
  .hc-o2 { width:460px; height:460px; bottom:-160px; right:-100px; background:radial-gradient(circle,var(--t-accent-soft),transparent 68%); animation:hcFloat2 22s ease-in-out infinite; }
  .hc-o3 { width:400px; height:400px; top:38%; right:14%; background:radial-gradient(circle,var(--t-accent),transparent 68%); animation:hcFloat3 26s ease-in-out infinite; }
  @keyframes hcFloat1 { 0%,100%{transform:translate(0,0);} 50%{transform:translate(40px,30px);} }
  @keyframes hcFloat2 { 0%,100%{transform:translate(0,0);} 50%{transform:translate(-30px,-40px);} }
  @keyframes hcFloat3 { 0%,100%{transform:translate(0,0);} 50%{transform:translate(20px,-30px);} }
  .hc-card-wrap, .hc-panel, .hc-intro, .hc-below-actions { position:relative; z-index:1; }

  .hc-card-wrap { display: flex; justify-content: center; grid-column: 1; }
  .hc-card {
    width: 100%; max-width: 400px; background: var(--t-card);
    color: var(--t-card-text);
    border-radius: 28px; overflow: hidden; position: relative;
    box-shadow: 0 30px 70px rgba(23,37,49,0.26), 0 8px 20px rgba(23,37,49,0.1);
    border: 2px solid var(--t-frame);
  }
  @keyframes hcFadeIn { from { opacity:0; transform:translateY(-6px);} to { opacity:1; transform:none;} }

  .hc-photo { position:relative; aspect-ratio:4/3.4; background:linear-gradient(150deg,#2A3F4D,#172531); overflow:hidden; }
  .hc-photo img { width:100%; height:100%; object-fit:cover; display:block; color:transparent; font-size:0; }
  /* soft vignette wrapping the whole photo so badges (top) + name (bottom) stay readable on any image */
  .hc-photo::after {
    content:""; position:absolute; inset:0; pointer-events:none; z-index:1;
    background: linear-gradient(to bottom, rgba(23,37,49,0.42) 0%, rgba(23,37,49,0) 24%, rgba(23,37,49,0) 54%, rgba(23,37,49,0.55) 100%);
  }
  .hc-photo-fallback { width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.85); }

  /* rarity — sits as the top line of the nameplate identity stack (left-aligned),
     so it never overlaps the photo subject and groups with name/aka/breed */
  .hc-rarity {
    align-self:flex-start; display:inline-flex; align-items:center; gap:5px;
    height:24px; padding:0 11px 0 9px; margin-bottom:10px; line-height:1; color:#fff; font-size:11px;
    font-weight:800; letter-spacing:0.08em; text-transform:uppercase; border-radius:999px;
    background-image: linear-gradient(160deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0) 42%), linear-gradient(340deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0) 50%);
    text-shadow: 0 1px 1px rgba(0,0,0,0.3);
  }
  .hc-rarity svg { color: var(--gold); }

  .hc-nameplate {
    position:absolute; left:0; right:0; bottom:0; z-index:3; padding:54px 20px 20px; color:#fff;
    display:flex; flex-direction:column; align-items:flex-start;
    background: linear-gradient(to top, rgba(23,37,49,0.94) 25%, transparent);
  }
  .hc-name { 
    font-size:34px; 
    font-weight:800; 
    line-height:1; 
    letter-spacing:-0.02em; 
    /* margin-bottom:7px; */
  }
  .hc-nickname { 
    font-size:16px; 
    font-weight:600; 
    font-style:italic;
    color:var(--gold); 
    /* margin-bottom:9px; */
  }
  .hc-breed { font-size:15px; font-weight:500; color:rgba(255,255,255,0.85); }
  .hc-age { font-size:15px; font-weight:500; color:rgba(255,255,255,0.7); margin-top:2px; }

  .hc-title-banner { color:var(--t-banner-text); text-align:center; padding:13px 20px; font-size:18px; font-weight:800; letter-spacing:-0.01em; }

  .hc-body { padding:22px; }
  .hc-empty { text-align:center; padding:28px 18px; }
  .hc-empty-title { font-size:18px; font-weight:800; color:var(--navy); margin:0 0 8px; letter-spacing:-0.01em; }
  .hc-empty-sub { font-size:15px; font-weight:500; color:var(--slate); line-height:1.5; margin:0 0 18px; max-width:340px; margin-left:auto; margin-right:auto; }
  .hc-empty-link { display:inline-flex; align-items:center; font-size:15px; font-weight:700; color:var(--terracotta); text-decoration:none; }
  .hc-empty-link:hover { text-decoration:underline; }
  .hc-section { margin-bottom:22px; }
  .hc-section:last-child { margin-bottom:0; }
  .hc-section-label { font-size:17px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; color:var(--t-accent-on-card); margin-bottom:12px; }

  .hc-tags { display:flex; flex-wrap:wrap; gap:8px; }
  .hc-tag {
    display:inline-flex; align-items:center; gap:5px; padding:6px 12px; background:var(--t-chip-bg);
    border:1px solid var(--t-card-border); border-radius:999px; font-size:14px; font-weight:600;
    color:var(--t-chip-text); white-space:nowrap;line-height: 1.2;
  }
  /* The "N more" pill is a button; plain tags are not, so only this one
     needs a real target. 30.8px before. */
  .hc-tag-toggle { min-height:44px; background:transparent; color:var(--t-accent-on-card); cursor:pointer; font-family:inherit; font-weight:700; }
  .hc-tag-toggle:hover { background:var(--t-chip-bg); }
  .hc-fade { animation: hcFadeIn 0.4s cubic-bezier(0.33, 1, 0.68, 1) both; }

  .hc-stats { display:flex; flex-direction:column; gap:17px; }
  .hc-stat-row { display:flex; align-items:center; gap:12px; }
  .hc-stat-name { flex:0 0 116px; font-size:15px; font-weight:600; color:var(--t-card-text); display:flex; align-items:flex-start; gap:6px; }
  .hc-stat-emoji { flex:0 0 auto; line-height:1.3; }
  .hc-stat-label-text { flex:1 1 auto; min-width:0; overflow-wrap:break-word; line-height:1.3; }
  .hc-stat-bar { flex:1; height:11px; background:var(--t-chip-bg); border-radius:999px; overflow:hidden; }
  .hc-stat-fill { height:100%; border-radius:999px; }
  .hc-stat-val { flex:0 0 auto; min-width:36px; text-align:right; font-size:14px; font-weight:800; color:var(--t-card-muted); display:inline-flex; align-items:center; justify-content:flex-end; gap:3px; white-space:nowrap; }
  .hc-stat-val.is-max { color:var(--t-accent-on-card); }
  .hc-stat-star { color:var(--gold); font-size:11px; line-height:1; }

  .hc-likes-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; align-items:start; }
  /* Loves / Not-a-fan block (under the photo). Base = mobile: padded, side by side. */
  .hc-prefs-section { padding:22px; }
  .hc-prefs-title { margin-bottom:12px; }
  .hc-prefs { display:flex; flex-direction:column; gap:30px; align-items:stretch; }
  .hc-like-col h4 { font-size:15px; font-weight:700; letter-spacing: 0.06em; margin-bottom:10px; display:flex; align-items:center; gap:5px; }
  .hc-like-col.hc-loves h4 { color:var(--t-loves); }
  .hc-like-col.hc-dislikes h4 { color:var(--t-dislikes); }
  .hc-like-col.hc-foods h4 { color:var(--t-foods); }
  .hc-like-col ul { list-style:none; display:flex; flex-wrap:wrap; gap:8px; padding:0; margin:0; }
  .hc-like-col li {
    font-size:14px; font-weight:600; color:var(--t-chip-text); line-height:1.2;
    padding:6px 12px; border-radius:999px; background:var(--t-chip-bg);
    border:1px solid var(--t-card-border); white-space:nowrap;
  }
  .hc-like-col.hc-loves li {
    background:color-mix(in srgb, var(--t-loves) 14%, var(--t-card));
    border-color:color-mix(in srgb, var(--t-loves) 55%, transparent);
  }
  .hc-like-col.hc-dislikes li {
    background:color-mix(in srgb, var(--t-dislikes) 14%, var(--t-card));
    border-color:color-mix(in srgb, var(--t-dislikes) 55%, transparent);
  }
  .hc-like-col.hc-foods li {
    background:color-mix(in srgb, var(--t-foods) 14%, var(--t-card));
    border-color:color-mix(in srgb, var(--t-foods) 55%, transparent);
  }
  .hc-like-toggle-li { display:contents; }
  .hc-like-toggle {
    display:inline-flex; align-items:center; gap:5px; padding:6px 12px;
    background:transparent; border:1px solid var(--t-card-border); border-radius:999px;
    font-family:inherit; font-size:13px; font-weight:700; color:var(--t-accent-on-card);
    cursor:pointer; white-space:nowrap;
  }
  .hc-like-toggle:hover { background:var(--t-chip-bg); }
  .hc-food-quirks { color:var(--t-card-text); font-size:16px; font-weight:500; line-height:1.5; margin:0; }
  .hc-like-col.hc-quirks h4 { color:var(--t-foods); }

  .hc-funfact { color:var(--t-card-text); font-size:16px; font-weight:500; line-height:1.5; }
  .hc-quote { color:var(--t-accent-on-card); font-weight:800; }
  .hc-memory-label { color:var(--t-accent-on-card); }
  .hc-memory-msg { color:var(--t-card-text); font-size:16px; font-weight:500; font-style:italic; line-height:1.55; margin:0; }
  .hc-memory-date { color:var(--t-card-muted); font-size:14px; font-weight:600; margin:8px 0 0; }

  .hc-clampable .hc-clamp-text {
    font-size:16px; font-weight:500; line-height:1.6; overflow:hidden;
    transition: max-height 0.38s ease;
  }
  .hc-org { color:var(--t-card-muted); font-weight:500; display:block; margin:10px 0 0; font-size:14px; }
  .hc-org-name { font-weight:700; color:var(--t-card-text); }
  /* 16px before — the smallest control on the page. */
  .hc-read-more { margin-top:8px; min-height:44px; background:none; border:none; cursor:pointer; font-family:inherit; font-size:13px; font-weight:800; display:inline-flex; align-items:center; gap:4px; padding:12px 0; margin-bottom:-12px; }
  .hc-chev { transition:transform 0.3s; }

  .hc-footer { border-top:1px solid var(--t-divider); padding:16px 22px; display:flex; align-items:center; justify-content:space-between; }
  .hc-made { font-size:13px; font-weight:700; color:var(--t-card-muted); }
  .hc-made b { color:var(--t-footer); }
  .hc-made-paw { color:var(--t-footer); vertical-align:middle; display:inline-block; }

  .hc-panel { grid-column:2; width:100%; max-width:420px; align-self:start; position:sticky; top:64px; position:relative; }
   .hc-intro::before { content:""; position:absolute; inset:-24px -28px; z-index:0; background:radial-gradient(150% 130% at 50% 40%, var(--t-scrim) 0%, var(--t-scrim) 42%, transparent 88%); border-radius:28px; pointer-events:none; }
  .hc-panel > * { position:relative; z-index:1; }
  .hc-intro { position:relative; }
  .hc-intro > * { position:relative; z-index:1; }
  .hc-eyebrow { font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:var(--t-label); margin:0 0 8px; }
  .hc-intro-sub { margin:12px auto 0; font-size:16px; font-weight:500; color:var(--t-intro-sub); line-height:1.5; padding: 0 20px; }
  .hc-panel-name { font-size:clamp(30px, 3.2vw, 48px); font-weight:800; line-height:1.05; letter-spacing:-0.03em; margin:0 0 10px; overflow-wrap:break-word; text-wrap:balance; max-width:100%; color:var(--t-intro-name); }
  .hc-panel-sub { font-size:17px; font-weight:500; color:var(--t-intro-sub); line-height:1.5; margin:0 0 28px; }
  .hc-panel-actions { display:flex; flex-direction:column; gap:12px; max-width:340px; }
  .hc-btn {
    height:48px; border-radius:12px; border:none; cursor:pointer; font-family:inherit; font-size:15px; font-weight:700;
    display:inline-flex; align-items:center; justify-content:center; gap:9px;
    transition:background 0.15s, border-color 0.15s, color 0.15s;
  }
  /* Buttons sit on --t-bg (the pet's chosen background), so their colors are
     DYNAMIC — derived from the theme — to stay readable on ANY background.
     All fills/borders are SOLID (no transparency). Share's text uses
     --t-text-on-accent-on-bg so the label contrasts its own fill for every
     accent/background combination. */
  .hc-btn-primary {
    background: var(--t-accent-on-bg);
    color: var(--t-text-on-accent-on-bg);
    border: 2px solid var(--t-accent-on-bg);
  }
  .hc-btn-primary:hover {
    background: var(--t-bg);
    color: var(--t-accent-on-bg);
    border: 2px solid var(--t-accent-on-bg);
  }
  .hc-btn-ghost {
    background: var(--t-bg);
    color: var(--t-btn-outline-on-bg);
    border: 2px solid var(--t-btn-outline-on-bg);
  }
  .hc-btn-ghost:hover {
    background: var(--t-btn-outline-on-bg);
    color: var(--t-bg);
    border: 2px solid var(--t-btn-outline-on-bg);
  }
  .hc-panel-foot { margin-top:26px; font-size:13px; font-weight:500; color:var(--t-bg-muted); }
  .hc-panel-foot a { color:var(--t-accent-on-bg); font-weight:700; text-decoration:none; }

  .hc-intro { display:none; }
  .hc-below-actions { display:none; }

  /* DESKTOP (Option A) — intro above, wide horizontal card (photo left +
     2-column body), actions below. Side panel hidden; card spans full width.
     The photo keeps its own aspect ratio so toggles only grow the content
     column and never resize the image/background. */
  @media (min-width: 1024px) {
    .hc-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
      max-width: 1100px;
      margin-left: auto;
      margin-right: auto;
    }
    .hc-panel { display: none; }
    .hc-intro { display: block; text-align: center; margin-bottom: 50px; order: 1; }
    .hc-intro-name {
      font-size: 46px; font-weight: 800; letter-spacing: -0.03em;
      line-height: 1.04; margin: 0; color: var(--t-intro-name);
    }
    .hc-intro-sub {
      margin: 12px auto 0; font-size: 17px; font-weight: 500;
      color: var(--t-intro-sub); max-width: 600px;
    }
    .hc-card-wrap { order: 2; width: 100%; }
    .hc-below-actions {
      display: flex; flex-direction: row; justify-content: stretch; flex-wrap: nowrap;
      gap: 14px; margin-top: 30px; width: 100%; max-width: 1100px; order: 3;
    }
    .hc-below-actions .hc-btn { flex: 1 1 0; width: auto; padding: 0 22px; justify-content: center; }

    /* CARD grid: left column (photo + prefs) | right column (sections);
    /* Simple 2-column card: left column (photo + Loves/Not-a-fan stacked) and
       right column (sections). The left column is its own flex stack, fully
       independent of the right — so expanding a toggle only grows the left
       column downward and never repositions the photo or anything else. */
    .hc-card {
      max-width: 1100px;
      display: grid;
      grid-template-columns: 380px minmax(0, 1fr);
      align-items: start;
    }
    .hc-card > .hc-leftcol {
      display: flex;
      flex-direction: column;
      border-right: none;
      align-self: start;
    }
    /* photo flush to the top-left corner; FIXED height (3:4 of the 380px
       column = 507px) so expanding a toggle can never change its size. */
    .hc-card > .hc-leftcol > .hc-photo {
      height: 500px;
      aspect-ratio: auto;
      flex: 0 0 auto;
      border-radius: 22px 0 0 0;
    }
    .hc-card > .hc-leftcol > .hc-photo img { object-fit: cover; }
    /* Left-column sections (Preferences, Favorite foods) each get a hairline
       divider below, matching the right column. Drawn as an inset ::after so it
       doesn't touch the column walls (mirrors how the other dividers sit inside
       the padding). :last-of-type omits the final one so there's never a
       trailing/double divider, self-correcting when a section is absent. */
    .hc-card > .hc-leftcol > .hc-leftcol-section {
      position: relative;
    }
    .hc-card > .hc-leftcol > .hc-leftcol-section::after {
      content: "";
      position: absolute;
      left: 16px;
      right: 16px;
      bottom: 0;
      height: 1px;
      background: var(--t-divider);
    }
    .hc-card > .hc-leftcol > .hc-leftcol-section:last-of-type::after {
      display: none;
    }
    /* Loves & Dislikes section under the photo: a title, then the two boxes */
    .hc-card > .hc-leftcol > .hc-prefs-section {
      padding: 20px 20px;
    }
    .hc-prefs-title { margin-bottom: 12px; }
    .hc-card > .hc-leftcol > .hc-prefs-section > .hc-prefs {
      display: flex;
      flex-direction: column;
      gap: 30px;
      align-items: stretch;
    }
    /* Badges relocated under Preferences in the left column. Matches the prefs
       padding and gets a hairline divider above so it reads as its own section. */
    .hc-card > .hc-leftcol > .hc-leftcol-badges {
      padding: 18px 16px;
      border-top: 1px solid var(--t-divider);
      margin: 0 16px;
      padding-left: 0;
      padding-right: 0;
    }
    /* right column: Stats, Personality, Badges, Fun fact stacked w/ dividers */
    .hc-content {
      display: flex;
      flex-direction: column;
      min-width: 0;
      border-left: none;
      margin-left: 0;
      align-self: stretch;
    }
    .hc-content .hc-body { display: flex; flex-direction: column; padding: 6px 26px 20px; }
    .hc-content .hc-body > .hc-section {
      margin: 0; padding: 20px 0;
      border-bottom: 1px solid var(--t-divider);
    }
    .hc-content .hc-body > .hc-section:last-child { border-bottom: none; }
    /* bottom clearance so the last section in each column never crowds the
       full-width footer divider below */
    .hc-card > .hc-leftcol { 
      // padding-bottom: 8px; 
      }
    .hc-content .hc-body { padding-bottom: 8px; }
    /* full-width footer: a true footer row spanning BOTH columns, below
       everything, with a divider across the whole card. */
    .hc-card > .hc-footer {
      grid-column: 1 / -1;
      border-top: 1px solid var(--t-divider);
      padding: 16px 26px;
    }
    /* the per-box LOVES / NOT A FAN headers (secondary, under the section title) */
    .hc-card > .hc-leftcol .hc-like-col h4 {
      font-size: 15px; 
      font-weight: 700; 
      /* text-transform: uppercase; */
      margin-bottom: 10px;
    }
    /* fade the photo's bottom edge into the card background (whatever theme
       color that is) so it dissolves in instead of a hard line. Kept short so
       it doesn't wash out the name/breed sitting above it. */
    .hc-card > .hc-leftcol > .hc-photo::before {
      content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 56px;
      z-index: 2; pointer-events: none;
      background: linear-gradient(to bottom, transparent 0%, var(--t-card) 100%);
    }
  }

  /* TABLET — single column, intro above, actions stacked below */
  @media (max-width: 1023px) {
    .hc-inner { display:flex; flex-direction:column; align-items:center; gap:0; max-width:460px; margin-left:auto; margin-right:auto; }
    .hc-panel { display:none; }
    .hc-intro { display:block; text-align:center; margin-bottom:40px; order:1; width:100%; align-self:stretch; padding:0 4px; }
    .hc-intro::before { inset:-14px 0; border-radius:20px; }
    .hc-intro-name { font-size:clamp(28px,7vw,40px); font-weight:800; letter-spacing:-0.03em; line-height:1.04; margin:0; overflow-wrap:anywhere; text-wrap:balance; color:var(--t-intro-name); }
    .hc-card-wrap { order:2; width:100%; }
    .hc-below-actions { display:flex; flex-direction:column; gap:12px; margin-top:28px; width:100%; max-width:400px; order:3; }
    .hc-below-actions .hc-btn { width:100%; }

    /* Mobile stacking order: photo → banner → Stats → Personality →
       Preferences → Badges → Fun fact → (Story) → footer.
       The card is a flex column; the leftcol/content/body wrappers use
       display:contents so all sections become direct flex items orderable
       independently of their desktop DOM grouping. */
    .hc-card { display:flex; flex-direction:column; }
    .hc-card > .hc-leftcol,
    .hc-card > .hc-content,
    .hc-card > .hc-content > .hc-body { display:contents; }

      .hc-stage--owner   { padding-top: 76px; }
     .hc-stage--public  { padding-top: 34px; }
    .hc-stage--preview  { padding-top: 96px; }

    /* display:contents removes the .hc-body wrapper box, so its padding is
       gone — restore breathing room by padding each section directly. Dividers
       are drawn as INSET pseudo-lines (not wall-to-wall) to mirror desktop. */
    .hc-card .hc-title-banner { order:2; }
    .hc-card .hc-empty { order:3; }
    .hc-card .hc-body > .hc-section,
    .hc-card .hc-leftcol-badges,
    .hc-card .hc-prefs-section {
      position:relative;
      margin:0;
      padding:20px 20px;
      border-bottom:none;
    }
    .hc-card .hc-body > .hc-section::after,
    .hc-card .hc-leftcol-badges::after,
    .hc-card .hc-prefs-section::after {
      content:""; position:absolute; left:20px; right:20px; bottom:0;
      height:1px; background:var(--t-divider);
    }
    /* The last visible section before the footer shouldn't draw a divider.
       Memory is the last section when present (so it gets no divider, and Story
       keeps its divider, separating Story from Memory). When Memory is absent,
       Story is last — :last-of-type handles that automatically. */
    .hc-card .hc-sec-memory::after { display:none; }
    .hc-card .hc-body > .hc-section:last-of-type::after { display:none; }
    .hc-card .hc-footer { padding:16px 22px; }

    .hc-card .hc-photo { order:1; }
    .hc-card .hc-sec-stats { order:3; }
    .hc-card .hc-sec-personality { order:4; }
    .hc-card .hc-prefs-section { order:5; }
    .hc-card .hc-foods-section { order:6; }
    .hc-card .hc-sec-funfact { order:7; }
    .hc-card .hc-sec-badges { order:8; }
    .hc-card .hc-sec-story { order:9; }
    .hc-card .hc-sec-memory { order:10; }
    .hc-card .hc-footer { order:10; }
  }

  /* MOBILE */
  @media (max-width: 560px) {
    .hc-intro-name { font-size:32px; }
    .hc-name { font-size:30px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .hc-o1, .hc-o2, .hc-o3 { animation:none; }
  }
`;
