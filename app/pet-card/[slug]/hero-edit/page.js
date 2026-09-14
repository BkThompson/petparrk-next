"use client";

import { useEffect, useState, useRef, useCallback, Fragment } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Plus,
  Trash2,
  Check,
  Sparkles,
  Pencil,
  X,
  Heart,
  Frown,
  Lightbulb,
  Award,
  Scale,
  PawPrint,
  Eye,
  Send,
  Loader2,
  ChevronDown,
  TriangleAlert,
} from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import PageLoader from "../../../../components/PageLoader";
import Breadcrumb from "../../../../components/Breadcrumb";
import {
  getOwnerPetBySlug,
  updatePet,
  prepareImageFile,
  uploadHeroPhoto,
  selectHeroPhoto,
  deleteHeroPhoto,
  MAX_HERO_PHOTOS,
} from "../../../../lib/petCardApi";

// Vanta animated background — client-only via next/dynamic (no SSR).
import dynamic from "next/dynamic";
const VantaBackground = dynamic(
  () => import("../../../../components/VantaBackground"),
  { ssr: false },
);
import { CssDesign } from "../../../../components/HeroBackgrounds";

// =============================================================
// COLOR THEMES — reused from the profile banner palette
// =============================================================
// Size of the Pencil "edit" icon used on every editable section header. Change
// this ONE value to resize all of them at once.
const EDIT_ICON_SIZE = 14;

// Size of the X "close" icon on section close/cancel buttons. One dial resizes
// all of them. (The tiny X's that remove a chip / preset / photo are a
// different, smaller UI role and are intentionally left at their own sizes.)
const CLOSE_ICON_SIZE = 17;

const HERO_PALETTE = {
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
const DEFAULT_THEME = "caramel";

// =============================================================
// RARITY TIERS — distinct, vivid, collectible (not brand palette)
// =============================================================
const RARITY_TIERS = [
  { key: "common", label: "Beloved", color: "#8A94A6", desc: "Every good pet" },
  { key: "uncommon", label: "Special", color: "#16A34A", desc: "A cut above" },
  { key: "rare", label: "Rare", color: "#2563EB", desc: "Hard to find" },
  { key: "epic", label: "Epic", color: "#9333EA", desc: "Truly special" },
  {
    key: "legendary",
    label: "Legendary",
    color: "#F59E0B",
    desc: "One in a million",
  },
];

// =============================================================
// PRESET STATS — hybrid: presets to start, + add your own
// =============================================================
const PRESET_STATS = [
  { emoji: "⚡", label: "Zoomies" },
  { emoji: "💖", label: "Cuddliness" },
  { emoji: "🍖", label: "Treat Drive" },
  { emoji: "📢", label: "Bark Volume" },
  { emoji: "🧠", label: "Smarts" },
  { emoji: "😴", label: "Nap Game" },
  { emoji: "🎾", label: "Playfulness" },
  { emoji: "🐶", label: "Guard Duty" },
];
// Theme-grouped emoji set. Every emoji here is a "fully-qualified" solid glyph
// that renders in color on all major platforms — no variation-selector emojis
// (like the old heart-hands/shield) that show as blank boxes on some systems.
const STAT_EMOJI_GROUPS = [
  {
    label: "Energy",
    emojis: ["⚡", "🔥", "💨", "🚀", "🌈", "🏃", "🤸", "🌀"],
  },
  {
    label: "Affection",
    emojis: ["💖", "💕", "🥰", "😍", "🤗", "💞", "💝", "😻"],
  },
  {
    label: "Food & treats",
    emojis: ["🍖", "🦴", "🍗", "🥩", "🍪", "🧀", "🥕", "🍦"],
  },
  {
    label: "Play",
    emojis: ["🎾", "🥏", "🧶", "🪀", "🎯", "🤾", "🏀", "🪃"],
  },
  {
    label: "Rest",
    emojis: ["😴", "💤", "🛌", "🌙", "🌧", "🦥", "🛏", "🧸"],
  },
  {
    label: "Smarts",
    emojis: ["🧠", "💡", "🎓", "🔍", "🧩", "📚", "🤓", "🎲"],
  },
  {
    label: "Vocal",
    emojis: ["📢", "🔊", "🎤", "📣", "💬", "🎺", "🔔", "👂"],
  },
  {
    label: "Pet & nature",
    emojis: ["🐶", "🐱", "🐾", "🐰", "🐦", "🐟", "🦮", "🌿"],
  },
  {
    label: "Personality",
    emojis: ["👑", "✨", "🌟", "😎", "🤪", "😇", "🦸", "🎭"],
  },
  {
    label: "Strength & spirit",
    emojis: ["💪", "🦾", "🏆", "⭐", "🥇", "🦁", "🐻", "🦊"],
  },
];
// Flat list (used by the per-stat picker dropdown).
const STAT_EMOJI_CHOICES = STAT_EMOJI_GROUPS.flatMap((g) => g.emojis);

// Searchable emoji library — emoji + keywords. Lets users type "kick", "leg",
// "fast", etc. and find a fitting glyph. Solid glyphs only (no blank-render).
const STAT_EMOJI_LIBRARY = [
  { e: "⚡", k: "energy fast lightning bolt power zap speed electric" },
  { e: "🔥", k: "fire hot flame lit burn heat fierce" },
  { e: "💨", k: "wind fast dash speed gust air zoom puff" },
  { e: "🚀", k: "rocket fast launch space speed boost fly" },
  { e: "🏃", k: "run running fast sprint jog runner move" },
  { e: "🤸", k: "cartwheel flip acrobat gymnast tumble agile" },
  { e: "🌀", k: "spiral dizzy swirl spin cyclone twist" },
  { e: "🌈", k: "rainbow color happy bright sky pride" },
  { e: "🦵", k: "leg kick foot limb stomp knee" },
  { e: "🦶", k: "foot feet kick stomp paw step" },
  { e: "🥋", k: "martial arts karate kick fight judo belt" },
  { e: "🥊", k: "boxing punch fight glove hit strong" },
  { e: "🦷", k: "tooth teeth bite chew dental gnaw" },
  { e: "👅", k: "tongue lick taste slobber" },
  { e: "👀", k: "eyes look watch stare see alert" },
  { e: "👂", k: "ear hear listen sound alert" },
  { e: "👃", k: "nose smell sniff scent" },
  { e: "🧠", k: "brain smart smarts clever genius mind think" },
  { e: "💡", k: "idea smart bright light clever bulb" },
  { e: "🎓", k: "smart graduate school clever educated learn" },
  { e: "🔍", k: "search find detective curious investigate look" },
  { e: "🧩", k: "puzzle smart problem solve clever piece" },
  { e: "📚", k: "books smart read study learn nerd" },
  { e: "🤓", k: "nerd smart glasses geek clever" },
  { e: "🎲", k: "dice luck random game chance roll" },
  { e: "💖", k: "love heart affection cuddle sweet adore" },
  { e: "💕", k: "love hearts affection sweet care" },
  { e: "🥰", k: "love adore happy sweet affection smile" },
  { e: "😍", k: "love heart eyes adore crush" },
  { e: "🤗", k: "hug cuddle warm embrace affection" },
  { e: "😻", k: "cat love heart eyes cute adore" },
  { e: "🍖", k: "meat food treat snack bone hungry eat" },
  { e: "🦴", k: "bone dog chew treat gnaw" },
  { e: "🍗", k: "chicken food meat drumstick treat eat" },
  { e: "🥩", k: "steak meat food treat protein" },
  { e: "🍪", k: "cookie treat snack sweet food" },
  { e: "🧀", k: "cheese food snack treat" },
  { e: "🥕", k: "carrot veggie food healthy snack" },
  { e: "🍦", k: "ice cream treat sweet dessert" },
  { e: "🎾", k: "tennis ball play fetch toy game" },
  { e: "🥏", k: "frisbee disc play fetch throw catch" },
  { e: "🧶", k: "yarn ball play cat toy string" },
  { e: "🪀", k: "yoyo toy play spin" },
  { e: "🎯", k: "target focus aim bullseye accurate goal" },
  { e: "🏀", k: "basketball play ball sport bounce" },
  { e: "🪃", k: "boomerang throw fetch return play" },
  { e: "😴", k: "sleep nap tired rest snooze zzz" },
  { e: "💤", k: "sleep zzz nap tired snore rest" },
  { e: "🛌", k: "sleep bed nap rest tired lazy" },
  { e: "🌙", k: "moon night sleep calm" },
  { e: "🦥", k: "sloth lazy slow sleepy chill" },
  { e: "🧸", k: "teddy bear cuddle soft toy snuggle" },
  { e: "📢", k: "loud bark volume announce shout speaker" },
  { e: "🔊", k: "loud volume sound speaker noise" },
  { e: "🎤", k: "mic sing voice loud talk" },
  { e: "📣", k: "megaphone loud shout announce bark" },
  { e: "💬", k: "talk chat speak bark voice" },
  { e: "🔔", k: "bell alert sound ring alarm" },
  { e: "🐶", k: "dog puppy pet guard loyal" },
  { e: "🐱", k: "cat kitty pet feline" },
  { e: "🐾", k: "paw print pet track foot" },
  { e: "🐰", k: "rabbit bunny pet hop" },
  { e: "🐦", k: "bird pet fly tweet" },
  { e: "🐟", k: "fish pet swim" },
  { e: "🦮", k: "dog guide service guard loyal" },
  { e: "🌿", k: "plant nature leaf green calm" },
  { e: "👑", k: "crown king queen royal boss best" },
  { e: "✨", k: "sparkle shine special magic star" },
  { e: "🌟", k: "star shine special glow bright" },
  { e: "😎", k: "cool sunglasses chill confident swag" },
  { e: "🤪", k: "crazy wild silly goofy zany" },
  { e: "😇", k: "angel good sweet innocent halo" },
  { e: "😈", k: "mischief naughty devil trouble sneaky" },
  { e: "🦸", k: "hero super strong brave save" },
  { e: "🎭", k: "drama theater mood expressive act" },
  { e: "💪", k: "strong muscle strength power tough flex" },
  { e: "🦾", k: "strong arm power robot tough mechanical" },
  { e: "🏆", k: "trophy win champion best award victory" },
  { e: "⭐", k: "star best top rating favorite" },
  { e: "🥇", k: "gold medal first win best champion" },
  { e: "🦁", k: "lion brave strong king fierce" },
  { e: "🐻", k: "bear strong big cuddle tough" },
  { e: "🦊", k: "fox clever sly smart cunning" },
  { e: "🐺", k: "wolf wild fierce pack howl" },
  { e: "🦅", k: "eagle fly sharp keen soar" },
  { e: "🐢", k: "turtle slow steady calm patient" },
  { e: "🐇", k: "rabbit fast hop quick bunny" },
  { e: "🦘", k: "kangaroo jump hop kick bounce" },
  { e: "🤺", k: "fencing lunge attack sword agile" },
  { e: "🤾", k: "handball throw active sport" },
  { e: "🧗", k: "climb scale tough determined" },
  { e: "🏋️", k: "lift weight strong gym workout" },
  { e: "🤣", k: "laugh funny silly happy lol" },
  { e: "😤", k: "determined huff stubborn proud fierce" },
  { e: "🥺", k: "cute beg puppy eyes sweet plead" },
  { e: "😋", k: "yum tasty tongue food happy" },
  { e: "🤤", k: "drool hungry food slobber want" },
  { e: "💩", k: "poop silly funny mess gross" },
  { e: "🛡", k: "shield guard protect defense" },
];

const MAX_STATS = 9;
const MAX_CUSTOM_STATS = 3;
const STAT_LABEL_MAX = 20;
const STAT_LABEL_WARN = 15;
const TITLE_MAX = 32;
const TITLE_WARN = 24;
const DESC_MAX = 150;

// =============================================================
// CUSTOMIZATION — independent colors + background designs
// =============================================================
// Curated swatch palettes (guaranteed-coordinated). Each picker also has a
// custom option (native color input) for power users.
const BG_SWATCHES = [
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
const CARD_SWATCHES = [
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
const ACCENT_SWATCHES = [
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

// Background designs — each renders with the chosen bg color. The design is a
// separate choice from the color (picking a color never changes the design).
// Two background categories, each playing to its strength, no overlap:
//   vanta = animated 3D effects | css = abstract gradients/textures/glows
// Design keys are unique WITHIN a category; the app pairs (category, key).
const BG_CATEGORIES = [
  {
    key: "vanta",
    label: "Animated",
    blurb: "Living, moving backgrounds.",
    designs: [
      { key: "waves", label: "Waves" },
      { key: "mesh", label: "Cells" },
      { key: "rings", label: "Rings" },
      { key: "birds", label: "Birds" },
      { key: "starfield", label: "Net" },
      { key: "aero", label: "Topology" },
    ],
  },
  {
    key: "css",
    label: "Abstract",
    blurb: "Gradients, glows, and texture.",
    designs: [
      { key: "solid", label: "Solid" },
      { key: "gradient", label: "Blend" },
      { key: "mesh-grad", label: "Mesh" },
      { key: "grain", label: "Grain" },
      { key: "aurora-wash", label: "Aurora" },
      { key: "spotlight", label: "Spotlight" },
      { key: "maze", label: "Maze" },
      { key: "dots", label: "Dots" },
      { key: "stripes", label: "Stripes" },
      { key: "weave", label: "Weave" },
      { key: "concentric", label: "Rings" },
      { key: "cosmos", label: "Cosmos" },
      { key: "metallic", label: "Chrome" },
    ],
  },
];

// Flat lookup: key -> category, for convenience.
const DESIGN_CATEGORY = {};
BG_CATEGORIES.forEach((c) =>
  c.designs.forEach((d) => {
    DESIGN_CATEGORY[d.key] = c.key;
  }),
);

const DEFAULT_BG = "#F8EFE2";
const DEFAULT_CARD = "#FFFFFF";
const DEFAULT_ACCENT = "#B95A18";
const DEFAULT_DESIGN = "gradient";
// Default lighting (matches each design's built-in look — multipliers of 1,
// full gradient depth, light bloom at the original top-left origin).
const DEFAULT_LIGHTING = { x: 24, y: 18, intensity: 1, vignette: 1, depth: 1 };
// hero_lighting is stored as a JSON object keyed by design. Parse safely.
function parseLighting(raw) {
  if (!raw) return {};
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}
const DEFAULT_CATEGORY = "css";

// Single source of truth for which CONTENT fields get copied into the publish
// snapshot (hero_published). Design/color/lighting fields are set explicitly in
// the publish handler (they come from dedicated editor state); everything here
// is pulled from petState automatically. Add a new publishable content field
// HERE once and it will flow to the published flip/share card — no more
// per-field bugs where a value shows on the live card but not the shared one.
const HERO_SNAPSHOT_FIELDS = [
  "identity_tags",
  "personality_traits",
  "loves",
  "dislikes",
  "fun_fact",
  "nickname",
  "rescue_story",
  "rescue_organization",
  "favorite_foods",
  "food_quirks",
  "memorial_message",
  "birth_date",
  "passing_date",
];

// ============================================================================
// UnsavedChangesModal — shared styled confirm modal (baked-in palette).
// Identical look across Hero, Profile, ProfileUsername. Returns a choice via
// the useUnsavedChanges() hook: "save" | "discard" | "keep".
// ============================================================================
function UnsavedChangesModal({ open, onChoice }) {
  // Lock background scroll while the modal is open (and compensate for the
  // scrollbar's width so the page doesn't shift horizontally when it hides).
  useEffect(() => {
    if (!open) return;
    const body = document.body;
    // `overflow: hidden` alone does not stop scrolling in iOS Safari. Pinning
    // the body and offsetting it by the current scroll is what works; the
    // offset is restored with scrollTo on close so the page doesn't jump.
    const scrollY = window.scrollY;
    const scrollBarComp =
      window.innerWidth - document.documentElement.clientWidth;
    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
    };
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    if (scrollBarComp > 0) body.style.paddingRight = `${scrollBarComp}px`;
    return () => {
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.paddingRight = prev.paddingRight;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="ucm-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onChoice("keep");
      }}
    >
      <div
        className="ucm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ucm-title"
      >
        <div className="ucm-head">
          <h3 className="ucm-title" id="ucm-title">
            Unsaved changes
          </h3>
          <button
            type="button"
            className="ucm-close"
            aria-label="Keep editing"
            onClick={() => onChoice("keep")}
          >
            &times;
          </button>
        </div>
        <div className="ucm-body">
          You have unsaved changes. Would you like to save them before leaving?
        </div>
        <div className="ucm-actions">
          <button
            type="button"
            className="ucm-btn ucm-btn-secondary"
            onClick={() => onChoice("discard")}
          >
            Discard
          </button>
          <button
            type="button"
            className="ucm-btn ucm-btn-primary"
            onClick={() => onChoice("save")}
          >
            Save changes
          </button>
        </div>
      </div>
      <style>{`
        .ucm-backdrop {
          position: fixed; inset: 0;
          background: rgba(23,37,49,0.55);
          backdrop-filter: blur(4px);
          z-index: 4000;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: ucm-fade 0.18s ease-out;
        }
        @keyframes ucm-fade { from { opacity: 0; } to { opacity: 1; } }
        .ucm-card {
          background: #fff;
          border-radius: 18px;
          max-width: 440px; width: 100%;
          box-shadow: 0 30px 60px rgba(0,0,0,0.40);
          font-family: var(--font-urbanist,'Urbanist',system-ui,sans-serif);
          overflow: hidden;
          animation: ucm-pop 0.2s cubic-bezier(0.33,1,0.68,1);
        }
        @keyframes ucm-pop {
          from { opacity:0; transform: translateY(8px) scale(0.98); }
          to { opacity:1; transform:none; }
        }
        .ucm-head {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 22px 24px 0;
        }
        .ucm-title {
          margin: 0; font-size: 19px; font-weight: 800; color: #172531;
          letter-spacing: -0.01em;
        }
        .ucm-close {
          width: 32px; height: 32px; flex-shrink: 0;
          border: none; background: transparent; color: #717A86;
          cursor: pointer; border-radius: 8px; font-size: 22px; line-height: 1;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, color 0.15s;
          margin: -4px -6px 0 8px;
        }
        .ucm-close:hover { background: #F5F0E8; color: #172531; }
        .ucm-body {
          padding: 10px 24px 0;
          color: #4a5560; font-size: 15px; line-height: 1.5;
        }
        .ucm-actions {
          display: flex; gap: 10px; justify-content: flex-end;
          padding: 22px 24px 22px;
          flex-wrap: wrap;
        }
        .ucm-btn {
          font-family: inherit; font-size: 14.5px; font-weight: 700;
          padding: 11px 18px; border-radius: 10px; cursor: pointer;
          border: var(--pill-border-w, 2px) solid transparent; transition: all 0.15s;
          line-height: 1;
        }
        .ucm-btn-primary { background: #CF5C36; color: #fff; border-color: #CF5C36; }
        .ucm-btn-primary:hover { background: #A8471D; border-color: #A8471D; }
        .ucm-btn-secondary { background: #fff; color: #172531; border-color: #EDE8E0; }
        .ucm-btn-secondary:hover { background: #F5F0E8; border-color: #d9d2c6; }
        @media (max-width: 480px) {
          .ucm-actions { flex-direction: column-reverse; }
          .ucm-btn { width: 100%; }
        }
      `}</style>
    </div>
  );
}

function useUnsavedChanges() {
  const [open, setOpen] = useState(false);
  const resolverRef = useRef(null);
  const confirmUnsaved = useCallback(() => {
    setOpen(true);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);
  const handleChoice = useCallback((choice) => {
    setOpen(false);
    if (resolverRef.current) {
      resolverRef.current(choice);
      resolverRef.current = null;
    }
  }, []);
  const unsavedModal = (
    <UnsavedChangesModal open={open} onChoice={handleChoice} />
  );
  return { confirmUnsaved, unsavedModal };
}

function asArray(v) {
  return Array.isArray(v) ? v.filter(Boolean) : [];
}

// Decide whether the current draft differs from what's published (i.e. there
// are changes visitors don't see yet). Compares the live hero_* draft columns
// against the hero_published snapshot. If never published -> always unpublished.
function computeHasUnpublished(pet) {
  if (!pet || !pet.hero_is_published || !pet.hero_published) return true;
  const pub = pet.hero_published || {};
  // Must include EVERY field captured in the publish snapshot — otherwise a
  // change to a field missing from this list (e.g. label color, foods, memorial)
  // won't register as "needs publish", disabling the Publish button even though
  // there are real unpublished changes.
  const fields = [
    "hero_title",
    "hero_description",
    "hero_rarity",
    "hero_stats",
    "hero_bg_color",
    "hero_card_color",
    "hero_accent_color",
    "hero_label_color",
    "hero_intro_color",
    "hero_name_color",
    "hero_footer_color",
    "hero_bg_design",
    "hero_bg_category",
    "identity_tags",
    "personality_traits",
    "loves",
    "dislikes",
    "fun_fact",
    "nickname",
    "rescue_story",
    "rescue_organization",
    "favorite_foods",
    "food_quirks",
    "memorial_message",
    "birth_date",
    "passing_date",
  ];
  // Normalize so DB round-trips don't cause false "unpublished changes":
  // - null / undefined / "" all collapse to the same empty value
  // - values that are JSON strings are parsed so a stringified snapshot and a
  //   parsed draft compare equal
  // - object keys are sorted recursively so key-order differences don't register
  const sortKeys = (val) => {
    if (Array.isArray(val)) return val.map(sortKeys);
    if (val && typeof val === "object") {
      const out = {};
      for (const k of Object.keys(val).sort()) out[k] = sortKeys(val[k]);
      return out;
    }
    return val;
  };
  const canon = (v) => {
    if (v === null || v === undefined || v === "") return null;
    let val = v;
    if (typeof val === "string") {
      const t = val.trim();
      if (
        (t.startsWith("{") && t.endsWith("}")) ||
        (t.startsWith("[") && t.endsWith("]"))
      ) {
        try {
          val = JSON.parse(t);
        } catch {
          /* keep as string */
        }
      }
    }
    return val;
  };
  const norm = (v) => JSON.stringify(sortKeys(canon(v)) ?? null);
  for (const f of fields) {
    // personality fields live on pet directly; hero_* are the draft columns.
    const draftVal = pet[f];
    const pubVal = pub[f];
    if (norm(draftVal) !== norm(pubVal)) return true;
  }
  return false;
}

// =============================================================
// Collapse — smoothly animates children's height open AND closed via the
// grid-template-rows 0fr<->1fr technique (content stays mounted; both opening
// and closing glide). Inner div needs overflow:hidden + min-height:0.
// =============================================================
// Collapsible section wrapper — mirrors the Care editor's SectionShell exactly:
// the whole header is a clean full-width toggle (icon + title + subtitle on the
// left, caret on the right). NO edit pencil in the header. Editing is handled
// INSIDE the body (an Edit control next to the content), so the header stays a
// pure toggle just like Care. `icon` is a lucide component; `title`/`sub` are
// the section's heading text.
function HeroSectionShell({ id, icon: Icon, title, sub, editing, children }) {
  // Static section. When `editing` is true the section gets a distinct visual
  // state (highlighted border + tint) so view-vs-edit mode is unmistakable.
  return (
    <section className={`he-card-section${editing ? " is-editing" : ""}`}>
      <div className="he-sec-head">
        <h2 className="he-sec-toggle-title">{title}</h2>
        {sub ? <p className="he-sec-toggle-sub">{sub}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Collapse({ open, children, className }) {
  return (
    <div
      className={`he-collapse${open ? " is-open" : ""}${className ? " " + className : ""}`}
      aria-hidden={open ? undefined : true}
    >
      <div className="he-collapse-inner">{children}</div>
    </div>
  );
}

// =============================================================
// PAGE
// =============================================================
export default function HeroEditorPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug;

  const [session, setSession] = useState(undefined);
  const [pet, setPet] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session || null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(s || null));
    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) {
      router.replace(`/auth?redirect=/pet-card/${slug}/hero-edit`);
      return;
    }
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await getOwnerPetBySlug(slug);
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        return;
      }
      setPet(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [session, slug, router]);

  if (session === undefined || (session && !pet && !notFound)) {
    return <PageLoader for="heroEditor" />;
  }
  if (notFound) {
    return (
      <div className="he-notfound">
        <p className="he-notfound-title">We couldn&apos;t find that pet.</p>
        <p className="he-notfound-sub">
          The link may be incorrect, or this pet isn&apos;t public.
        </p>
        <Link href="/pet-card" className="he-btn he-btn-primary">
          Back to Pet Cards
        </Link>
        <style>{`
          .he-notfound {
            min-height:70vh;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            gap:10px;
            padding:40px;
            text-align:center;
            font-family:var(--font-urbanist,'Urbanist',sans-serif);
            color:#172531;
          }
          .he-notfound-title { 
            font-size: 20px; 
            font-weight: 800; 
            margin: 0; 
          }
          .he-notfound-sub {
            font-size: 16px; 
            font-weight: 500; 
            color: #4B5563;
            margin: 0 0 10px; 
            max-width: 380px; 
            line-height: 1.5;
          } 
          .he-btn-primary {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 0 24px;
            height: 42px;
            border-radius: 12px;
            background: #CF5C36;
            color: #fff;
            font-size: 15px;
            font-weight: 700;
            text-decoration: none;
            border: 2px solid #CF5C36;
            transition: background 0.15s, color 0.15s;
          }
          .he-btn-primary:hover {
            background:#fff;
            color:#CF5C36;
          }
        `}</style>
      </div>
    );
  }
  if (!pet) return <PageLoader for="heroEditor" />;

  return <HeroEditorView pet={pet} slug={slug} />;
}

// =============================================================
// EDITOR VIEW
// =============================================================
// =============================================================
// HERO BACKGROUND — layered SVG illustrations, colored by the
// chosen background + accent. Sharp at any size, no dependency.
// =============================================================
function HeroBackground({ design, bg, accent }) {
  // Local color helpers (self-contained so this can render anywhere).
  const toRgb = (hex) => {
    const h = (hex || "#000000").replace("#", "");
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
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
  const shade = (hex, t) => {
    // t>0 lightens toward white, t<0 darkens toward black.
    const [r, g, b] = toRgb(hex);
    const target = t >= 0 ? 255 : 0;
    const a = Math.abs(t);
    return toHex(
      r + (target - r) * a,
      g + (target - g) * a,
      b + (target - b) * a,
    );
  };

  const bgLight = shade(bg, 0.18);
  const bgDark = shade(bg, -0.12);
  const bgDarker = shade(bg, -0.24);
  const accLight = shade(accent, 0.25);
  const accDark = shade(accent, -0.18);

  const common = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    zIndex: 0,
    pointerEvents: "none",
  };
  const svgProps = {
    style: common,
    viewBox: "0 0 1200 1600",
    preserveAspectRatio: "xMidYMid slice",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": "true",
  };

  switch (design) {
    case "mountains":
      return (
        <svg {...svgProps}>
          <defs>
            <linearGradient id="hbSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={bgLight} />
              <stop offset="60%" stopColor={bg} />
              <stop offset="100%" stopColor={bgDark} />
            </linearGradient>
          </defs>
          <rect width="1200" height="1600" fill="url(#hbSky)" />
          {/* sun glow */}
          <circle cx="860" cy="360" r="150" fill={accLight} opacity="0.35" />
          {/* far range */}
          <path
            d="M0 1050 L180 880 L360 1000 L560 760 L760 980 L980 800 L1200 960 L1200 1600 L0 1600 Z"
            fill={shade(bg, -0.06)}
            opacity="0.85"
          />
          {/* mid range */}
          <path
            d="M0 1220 L220 1020 L430 1180 L640 940 L880 1180 L1060 1020 L1200 1140 L1200 1600 L0 1600 Z"
            fill={bgDark}
          />
          {/* near range */}
          <path
            d="M0 1420 L260 1220 L520 1380 L760 1180 L1000 1380 L1200 1280 L1200 1600 L0 1600 Z"
            fill={bgDarker}
          />
        </svg>
      );

    case "waves":
      return (
        <svg {...svgProps}>
          <defs>
            <linearGradient id="hbWv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={bgLight} />
              <stop offset="100%" stopColor={bg} />
            </linearGradient>
          </defs>
          <rect width="1200" height="1600" fill="url(#hbWv)" />
          <path
            d="M0 980 C300 880 480 1080 760 980 C980 900 1080 1020 1200 970 L1200 1600 L0 1600 Z"
            fill={shade(bg, -0.05)}
            opacity="0.7"
          />
          <path
            d="M0 1120 C260 1020 520 1220 800 1100 C1000 1020 1120 1140 1200 1090 L1200 1600 L0 1600 Z"
            fill={accLight}
            opacity="0.45"
          />
          <path
            d="M0 1260 C300 1160 540 1340 820 1230 C1020 1160 1140 1280 1200 1230 L1200 1600 L0 1600 Z"
            fill={bgDark}
          />
          <path
            d="M0 1420 C280 1340 560 1500 860 1380 C1040 1320 1160 1420 1200 1390 L1200 1600 L0 1600 Z"
            fill={accDark}
            opacity="0.55"
          />
        </svg>
      );

    case "aurora":
      return (
        <svg {...svgProps}>
          <defs>
            <linearGradient id="hbAur" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={bgDark} />
              <stop offset="100%" stopColor={bg} />
            </linearGradient>
            <linearGradient id="hbRib1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={accLight} stopOpacity="0" />
              <stop offset="50%" stopColor={accLight} stopOpacity="0.8" />
              <stop offset="100%" stopColor={accLight} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="hbRib2" x1="0" y1="0" x2="1" y2="1">
              <stop
                offset="0%"
                stopColor={shade(accent, 0.4)}
                stopOpacity="0"
              />
              <stop
                offset="50%"
                stopColor={shade(accent, 0.4)}
                stopOpacity="0.7"
              />
              <stop
                offset="100%"
                stopColor={shade(accent, 0.4)}
                stopOpacity="0"
              />
            </linearGradient>
            <filter id="hbBlur">
              <feGaussianBlur stdDeviation="40" />
            </filter>
          </defs>
          <rect width="1200" height="1600" fill="url(#hbAur)" />
          <g filter="url(#hbBlur)">
            <path
              d="M-100 500 C300 350 500 650 900 480 C1100 400 1250 520 1350 460 L1350 760 C1150 820 900 660 700 760 C400 900 100 700 -100 800 Z"
              fill="url(#hbRib1)"
            />
            <path
              d="M-100 760 C350 620 600 900 1000 720 C1200 640 1300 760 1400 700 L1400 980 C1150 1060 850 880 600 980 C350 1080 50 940 -100 1020 Z"
              fill="url(#hbRib2)"
            />
          </g>
        </svg>
      );

    case "starfield":
      return (
        <svg {...svgProps}>
          <defs>
            <radialGradient id="hbGlow" cx="70%" cy="22%" r="60%">
              <stop offset="0%" stopColor={accLight} stopOpacity="0.4" />
              <stop offset="100%" stopColor={accLight} stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1200" height="1600" fill={bg} />
          <rect width="1200" height="1600" fill="url(#hbGlow)" />
          {[
            [140, 180, 3.2],
            [360, 120, 1.8],
            [560, 260, 2.4],
            [820, 160, 2.0],
            [1020, 300, 1.6],
            [220, 460, 2.0],
            [480, 520, 3.0],
            [720, 440, 1.6],
            [980, 560, 2.4],
            [1120, 460, 1.8],
            [120, 760, 2.6],
            [400, 820, 1.8],
            [640, 720, 2.2],
            [900, 820, 3.0],
            [1080, 760, 1.6],
            [200, 1040, 2.0],
            [520, 1100, 2.6],
            [780, 1020, 1.8],
            [1000, 1120, 2.2],
            [1140, 1040, 1.6],
            [160, 1320, 3.0],
            [440, 1380, 1.8],
            [700, 1300, 2.4],
            [960, 1400, 2.0],
            [1100, 1320, 1.8],
          ].map(([cx, cy, r], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill={shade(bg, 0.85)}
              opacity={0.55 + (r - 1.6) * 0.2}
            />
          ))}
        </svg>
      );

    case "aero":
      return (
        <svg {...svgProps}>
          <rect width="1200" height="1600" fill={bg} />
          <g fill="none" strokeLinecap="round">
            <path
              d="M-100 400 C300 300 700 700 1300 500"
              stroke={accLight}
              strokeWidth="3"
              opacity="0.5"
            />
            <path
              d="M-100 600 C350 480 750 900 1300 680"
              stroke={shade(bg, 0.5)}
              strokeWidth="2.5"
              opacity="0.6"
            />
            <path
              d="M-100 820 C300 700 800 1100 1300 900"
              stroke={accent}
              strokeWidth="3.5"
              opacity="0.4"
            />
            <path
              d="M-100 1040 C400 920 820 1320 1300 1120"
              stroke={shade(bg, 0.45)}
              strokeWidth="2.5"
              opacity="0.55"
            />
            <path
              d="M-100 1260 C350 1140 780 1500 1300 1320"
              stroke={accLight}
              strokeWidth="3"
              opacity="0.45"
            />
          </g>
        </svg>
      );

    case "rings":
      return (
        <svg {...svgProps}>
          <rect width="1200" height="1600" fill={bg} />
          <g fill="none" stroke={accent} opacity="0.4">
            {[120, 240, 360, 480, 600, 720, 840].map((r, i) => (
              <circle
                key={i}
                cx="600"
                cy="640"
                r={r}
                strokeWidth={i % 2 ? 2 : 3}
              />
            ))}
          </g>
          <circle cx="600" cy="640" r="90" fill={accLight} opacity="0.25" />
        </svg>
      );

    case "mesh":
      return (
        <svg {...svgProps}>
          <defs>
            <filter id="hbMesh">
              <feGaussianBlur stdDeviation="80" />
            </filter>
          </defs>
          <rect width="1200" height="1600" fill={bg} />
          <g filter="url(#hbMesh)">
            <circle cx="240" cy="360" r="260" fill={accent} opacity="0.6" />
            <circle
              cx="980"
              cy="420"
              r="240"
              fill={shade(bg, 0.4)}
              opacity="0.7"
            />
            <circle cx="620" cy="1240" r="320" fill={accLight} opacity="0.55" />
            <circle
              cx="1040"
              cy="1180"
              r="220"
              fill={shade(bg, 0.3)}
              opacity="0.6"
            />
          </g>
        </svg>
      );

    case "chrome":
      return (
        <svg {...svgProps}>
          <defs>
            <linearGradient id="hbCh" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={shade(bg, 0.5)} />
              <stop offset="22%" stopColor={accLight} />
              <stop offset="44%" stopColor={bgDark} />
              <stop offset="60%" stopColor={shade(bg, 0.55)} />
              <stop offset="80%" stopColor={accent} />
              <stop offset="100%" stopColor={shade(bg, 0.4)} />
            </linearGradient>
          </defs>
          <rect width="1200" height="1600" fill="url(#hbCh)" />
          <rect width="1200" height="1600" fill="#ffffff" opacity="0.05" />
        </svg>
      );

    case "flares":
      // Handled by the animated orb divs in the stage; render base only.
      return (
        <svg {...svgProps}>
          <rect width="1200" height="1600" fill={bg} />
        </svg>
      );

    case "plain":
    default:
      return (
        <svg {...svgProps}>
          <defs>
            <linearGradient id="hbPl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={bgLight} />
              <stop offset="55%" stopColor={bg} />
              <stop offset="100%" stopColor={bgDark} />
            </linearGradient>
          </defs>
          <rect width="1200" height="1600" fill="url(#hbPl)" />
        </svg>
      );
  }
}

function EmojiPicker({ value, onPick }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const q = query.trim().toLowerCase();
  const results = q
    ? STAT_EMOJI_LIBRARY.filter((item) => item.k.toLowerCase().includes(q)).map(
        (item) => item.e,
      )
    : null;

  return (
    <div className="he-emoji" ref={ref}>
      <button
        type="button"
        className="he-emoji-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label="Choose emoji"
      >
        {value}
      </button>
      {open && (
        <div className="he-emoji-pop">
          <input
            className="he-emoji-search"
            type="text"
            value={query}
            placeholder="Search (e.g. kick, fast, sleep)"
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {results ? (
            results.length ? (
              <div className="he-emoji-grid">
                {results.map((em, idx) => (
                  <button
                    key={em + idx}
                    type="button"
                    className={`he-emoji-cell${value === em ? " is-active" : ""}`}
                    onClick={() => {
                      onPick(em);
                      setOpen(false);
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            ) : (
              <p className="he-emoji-empty">No matches — try another word</p>
            )
          ) : (
            STAT_EMOJI_GROUPS.map((group) => (
              <div className="he-emoji-group" key={group.label}>
                <p className="he-emoji-group-label">{group.label}</p>
                <div className="he-emoji-grid">
                  {group.emojis.map((em) => (
                    <button
                      key={em}
                      type="button"
                      className={`he-emoji-cell${value === em ? " is-active" : ""}`}
                      onClick={() => {
                        onPick(em);
                        setOpen(false);
                      }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Hex color text input ─────────────────────────────────────────────────
// A copy/paste-friendly hex field next to each color picker. Accepts typed or
// pasted values (with or without '#'), validates 3- or 6-digit hex, and only
// commits valid colors. Selecting the text lets the user copy the code out.
function HexInput({ value, onChange }) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);

  // Keep the field in sync with external changes (swatch clicks, color wheel)
  // when the user isn't actively editing it.
  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);

  const normalize = (raw) => {
    let v = raw.trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{3}$/.test(v)) {
      v = v
        .split("")
        .map((c) => c + c)
        .join("");
    }
    return /^[0-9a-fA-F]{6}$/.test(v) ? `#${v.toLowerCase()}` : null;
  };

  const commit = (raw) => {
    const hex = normalize(raw);
    if (hex) onChange(hex);
    else setDraft(value); // revert invalid input
  };

  return (
    <div className="he-hex">
      <span className="he-hex-prefix">#</span>
      <input
        className="he-hex-input"
        type="text"
        spellCheck={false}
        value={draft.replace(/^#/, "")}
        onFocus={(e) => {
          setFocused(true);
          e.target.select();
        }}
        onBlur={() => {
          setFocused(false);
          commit(draft);
        }}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit(draft);
            e.target.blur();
          }
        }}
        aria-label="Hex color code"
        placeholder="000000"
        maxLength={7}
      />
    </div>
  );
}

// ── Lighting controls panel ──────────────────────────────────────────────
// Collapsible panel under the design picker. Live preview + position pad +
// intensity / vignette / gradient-depth sliders. Lighting is per-design.
function LightingPanel({
  designKey,
  bg,
  accent,
  category,
  lighting,
  onChange,
  onReset,
}) {
  const [open, setOpen] = useState(false);
  const padRef = useRef(null);

  // Animated (Vanta) designs don't use the CSS lighting layers, so the panel
  // only applies to the abstract CSS designs.
  if (category === "vanta") return null;

  const L = lighting || DEFAULT_LIGHTING;

  // Drag the light position on the pad.
  const handlePad = (e) => {
    const rect = padRef.current.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const x = Math.max(0, Math.min(100, Math.round((cx / rect.width) * 100)));
    const y = Math.max(0, Math.min(100, Math.round((cy / rect.height) * 100)));
    onChange({ x, y });
  };
  const startPad = (e) => {
    handlePad(e);
    const move = (ev) => handlePad(ev);
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move);
    window.addEventListener("touchend", up);
  };

  return (
    <div className="he-light">
      <button
        type="button"
        className="he-light-toggle"
        onClick={() => setOpen((o) => !o)}
      >
        <span>Lighting &amp; effects</span>
        <ChevronDown
          size={18}
          strokeWidth={2.5}
          className={`he-light-chev${open ? " is-open" : ""}`}
        />
      </button>

      <Collapse open={open}>
        <div className="he-light-body">
          <div className="he-light-preview">
            <CssDesign
              design={designKey}
              bg={bg}
              accent={accent}
              lighting={L}
            />
          </div>

          <div className="he-light-grid">
            <div className="he-light-pad-wrap">
              <span className="he-light-label">Light position</span>
              <div
                ref={padRef}
                className="he-light-pad"
                onMouseDown={startPad}
                onTouchStart={startPad}
              >
                <span
                  className="he-light-dotmark"
                  style={{ left: `${L.x}%`, top: `${L.y}%` }}
                />
              </div>
            </div>

            <div className="he-light-sliders">
              <LightSlider
                label="Brightness"
                value={L.intensity}
                min={0}
                max={2}
                step={0.05}
                onChange={(v) => onChange({ intensity: v })}
              />
              <LightSlider
                label="Edge shadow"
                value={L.vignette}
                min={0}
                max={2}
                step={0.05}
                onChange={(v) => onChange({ vignette: v })}
              />
              <LightSlider
                label="Depth"
                value={L.depth}
                min={0}
                max={1}
                step={0.05}
                hint="0 = flat solid color · 1 = full depth"
                onChange={(v) => onChange({ depth: v })}
              />
              <div className="he-light-reset-row">
                <button type="button" className="he-textlink" onClick={onReset}>
                  Reset lighting
                </button>
              </div>
            </div>
          </div>
        </div>
      </Collapse>
    </div>
  );
}

function LightSlider({ label, value, min, max, step, onChange, hint }) {
  return (
    <label className="he-light-slider">
      <span className="he-light-label">
        {label}
        <span className="he-light-val">{Number(value).toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      {hint && <span className="he-light-hint">{hint}</span>}
    </label>
  );
}

function HeroEditorView({ pet, slug }) {
  const [title, setTitle] = useState(pet.hero_title || "");
  const [description, setDescription] = useState(pet.hero_description || "");
  const [rarity, setRarity] = useState(pet.hero_rarity || "");
  const [bgColor, setBgColor] = useState(pet.hero_bg_color || DEFAULT_BG);
  const [cardColor, setCardColor] = useState(
    pet.hero_card_color || DEFAULT_CARD,
  );
  const [accentColor, setAccentColor] = useState(
    pet.hero_accent_color || DEFAULT_ACCENT,
  );
  // "Hero Card" eyebrow label color. Defaults to the accent so it looks cohesive
  // out of the box, but the owner can override it independently.
  const [labelColor, setLabelColor] = useState(
    pet.hero_label_color || pet.hero_accent_color || DEFAULT_ACCENT,
  );
  // Intro / framing color — controls "Meet X", the subtitle, and the
  // "Made on PetParrk" footer + paw icon as one coordinated accent. Empty
  // string = AUTO (smart default derived from the background). The owner can
  // override with a single color for true theming freedom.
  const [introColor, setIntroColor] = useState(pet.hero_intro_color || "");
  // "Meet {name}" heading color — its own control, separate from intro/footer.
  // Empty = AUTO (navy/white from background).
  const [nameColor, setNameColor] = useState(pet.hero_name_color || "");
  // Footer accent color ("PetParrk" + paw) — its own control, decoupled from
  // intro. Empty = follows intro/accent automatically.
  const [footerColor, setFooterColor] = useState(pet.hero_footer_color || "");
  // Option C: warn (don't block) when the chosen label color is hard to read on
  // the chosen background, and offer a one-click readable alternative. We RENDER
  // the exact color (Option B); this only informs. WCAG AA small text = 4.5.
  const labelColorMath = (() => {
    const toRgb = (hex) => {
      const h = (hex || "#000000").replace("#", "").padEnd(6, "0");
      return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
      ];
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
    const lum = (hex) => {
      const c = toRgb(hex).map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const contrast = (a, b) => {
      const la = lum(a);
      const lb = lum(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };
    const mix = (hex, target, t) => {
      const [r, g, b] = toRgb(hex);
      const [tr, tg, tb] = toRgb(target);
      return toHex(r + (tr - r) * t, g + (tg - g) * t, b + (tb - b) * t);
    };
    const ratio = contrast(labelColor, bgColor);
    // The "Hero Card" label is small BUT bold and uppercase, so WCAG's large/bold
    // threshold (3.0) is the right bar — not 4.5 (which is for normal body text
    // and flagged reasonable brand colors like terracotta/caramel). Only warn on
    // genuinely hard-to-read picks.
    const low = ratio < 3.0;
    // A readable version of the SAME hue. On MID-TONE backgrounds, nudging toward
    // only one end (black OR white) can fail — e.g. white on a medium blue can't
    // get more contrast by adding more white. So we try BOTH directions and keep
    // whichever first reaches the 3.0 bar; if neither fully clears it (very hard
    // mid-tones), we keep whichever ended up with the higher contrast.
    let suggestion = labelColor;
    if (low) {
      let best = labelColor;
      let bestContrast = ratio;
      for (const target of ["#000000", "#FFFFFF"]) {
        for (let t = 0.1; t <= 1.0001; t += 0.1) {
          const c = mix(labelColor, target, t);
          const cc = contrast(c, bgColor);
          if (cc > bestContrast) {
            best = c;
            bestContrast = cc;
          }
          if (cc >= 3.0) break; // this direction reached the bar; stop nudging
        }
        if (bestContrast >= 3.0) break; // already readable — don't try the other end
      }
      suggestion = best;
    }
    return { ratio, low, suggestion };
  })();
  const labelLowContrast = labelColorMath.low;
  const labelSuggestion = labelColorMath.suggestion;
  const [bgDesign, setBgDesign] = useState(
    pet.hero_bg_design || DEFAULT_DESIGN,
  );
  // Per-design lighting map: { [designKey]: { x, y, intensity, vignette, depth } }.
  // Each design remembers its own lighting. Missing entries use DEFAULT_LIGHTING.
  const [bgLighting, setBgLighting] = useState(() =>
    parseLighting(pet.hero_lighting),
  );
  // Lighting for the currently-selected design (falls back to defaults).
  const curLighting = bgLighting[bgDesign] || DEFAULT_LIGHTING;
  const setCurLighting = (patch) =>
    setBgLighting((prev) => ({
      ...prev,
      [bgDesign]: { ...(prev[bgDesign] || DEFAULT_LIGHTING), ...patch },
    }));
  // Hero photo gallery (up to MAX_HERO_PHOTOS). These persist immediately on
  // upload/select/delete (like the profile photo), so they're not part of the
  // draft Save flow — they write straight to the pet row.
  const [heroPhotos, setHeroPhotos] = useState(
    Array.isArray(pet.hero_photos) ? pet.hero_photos : [],
  );
  const [heroPhotoIndex, setHeroPhotoIndex] = useState(
    Number.isInteger(pet.hero_photo_index) ? pet.hero_photo_index : 0,
  );
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [bgCategory, setBgCategory] = useState(
    pet.hero_bg_category || DEFAULT_CATEGORY,
  );
  const [hoverDesign, setHoverDesign] = useState(null);
  const [stats, setStats] = useState(asArray(pet.hero_stats));
  const [saveStatus, setSaveStatus] = useState("idle");

  const [publishStatus, setPublishStatus] = useState("idle"); // idle|publishing|published|error
  const [hasUnpublished, setHasUnpublished] = useState(() =>
    computeHasUnpublished(pet),
  );
  // Any draft edit flips the dirty flag (wrap save so every change marks dirty).
  const markDirty = useCallback(() => setHasUnpublished(true), []);

  const saveTimer = useRef(null);
  const lastSaveFields = useRef({});

  // True while a save is in flight (used for the Saving… status).
  const [hasPendingSave, setHasPendingSave] = useState(false);

  // Persist fields to the draft (hero_* columns) IMMEDIATELY. This is no longer
  // an autosave — it is called only when the user clicks Save on a section (or
  // on an explicit revert). Nothing persists while the user is just editing.
  const save = useCallback(
    async (fields) => {
      setSaveStatus("saving");
      setHasUnpublished(true);
      setHasPendingSave(true);
      const { error } = await updatePet(pet.id, fields);
      setSaveStatus(error ? "error" : "saved");
      setHasPendingSave(false);
      if (!error) setTimeout(() => setSaveStatus("idle"), 2000);
      return !error;
    },
    [pet.id],
  );

  // ---- personality state (declared early; used by publish + sections) ----
  const [petState, setPetState] = useState(pet);
  const [openFormId, setOpenFormId] = useState(null);
  const { confirmUnsaved, unsavedModal } = useUnsavedChanges();
  const pendingFieldsRef = useRef({});

  // ---- Collapsible top-level sections (mirrors Care editor) ----
  // Desktop: all open. Mobile: only the first (Title) open, rest collapsed —
  // research-backed default so the mobile page is short and scannable.
  const HERO_SECTION_IDS = [
    "title",
    "description",
    "rarity",
    "stats",
    "design",
    "personality",
    "tags",
  ];
  const [openSections, setOpenSections] = useState(
    () => new Set(HERO_SECTION_IDS),
  );
  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    setOpenSections(isMobile ? new Set(["title"]) : new Set(HERO_SECTION_IDS));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const toggleSection = (sid) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(sid) ? next.delete(sid) : next.add(sid);
      return next;
    });
  const allSectionsOpen = openSections.size >= HERO_SECTION_IDS.length;
  const toggleAllSections = () =>
    setOpenSections(allSectionsOpen ? new Set() : new Set(HERO_SECTION_IDS));

  // ---- Draft / Publish ----
  // The hero_* columns are the live DRAFT. hero_published is the snapshot the
  // public sees. Editing marks the draft dirty (unpublished changes); Publish
  // copies the current draft into hero_published.
  const publish = useCallback(async () => {
    setPublishStatus("publishing");
    // Build the published snapshot from the CURRENT draft values.
    // ── Publish snapshot — built AUTOMATICALLY from the current draft ────────
    // Previously each field was listed by hand, so any new field (foods,
    // memorial, label color…) silently failed to publish until added here in
    // three places. Now we assemble it from a single source-of-truth list, so a
    // new hero field only needs to be added to HERO_SNAPSHOT_FIELDS once.
    //
    // Values come from the live editor state where we track it explicitly
    // (colors, design, lighting, title/description with pending edits), and fall
    // back to petState (the working copy of the row) for everything else.
    const explicit = {
      // Use the CURRENT edited values (title/description state), not the stale
      // `pet` prop from page-load. A pending uncommitted edit takes top priority;
      // otherwise the live state is the source of truth. (The old order put the
      // stale `pet.hero_title` ahead of the live `title`, so a saved title change
      // published the OLD title.)
      hero_title:
        pendingFieldsRef.current.hero_title ?? title ?? pet.hero_title ?? null,
      hero_description:
        pendingFieldsRef.current.hero_description ??
        description ??
        pet.hero_description ??
        null,
      hero_rarity: rarity || null,
      hero_stats: stats,
      hero_bg_color: bgColor,
      hero_card_color: cardColor,
      hero_accent_color: accentColor,
      hero_label_color: labelColor,
      hero_intro_color: introColor || null,
      hero_name_color: nameColor || null,
      hero_footer_color: footerColor || null,
      hero_bg_design: bgDesign,
      hero_bg_category: bgCategory,
      hero_lighting: JSON.stringify(bgLighting),
    };
    // Every other publishable hero/content field — pulled from petState so we
    // never miss one. Add new content fields here and they auto-publish.
    const snapshot = { ...explicit };
    for (const f of HERO_SNAPSHOT_FIELDS) {
      if (!(f in snapshot)) snapshot[f] = petState[f] ?? null;
    }
    const { error } = await updatePet(pet.id, {
      hero_published: snapshot,
      hero_is_published: true,
    });
    if (error) {
      setPublishStatus("error");
    } else {
      setPublishStatus("published");
      setHasUnpublished(false);
      setPetState((prev) => ({ ...prev, hero_is_published: true }));
      setTimeout(() => setPublishStatus("idle"), 2500);
    }
  }, [
    pet.id,
    pet.hero_title,
    pet.hero_description,
    title,
    description,
    rarity,
    stats,
    bgColor,
    cardColor,
    accentColor,
    bgDesign,
    petState,
  ]);

  // ---- Unpublish ----
  // Taking a card down: set hero_is_published false. We deliberately DO NOT
  // touch show_on_profile — the public grid already requires hero_is_published,
  // so an unpublished card is hidden regardless. Preserving the user's
  // "show on profile" preference means re-publishing automatically restores the
  // card to the profile, with no need to re-toggle anything. Share LINKS
  // (tokens) are also untouched — that's the Share page's master switch.
  const unpublish = useCallback(async () => {
    setPublishStatus("publishing");
    const { error } = await updatePet(pet.id, {
      hero_is_published: false,
    });
    if (error) {
      setPublishStatus("error");
    } else {
      setPublishStatus("idle");
      setHasUnpublished(true);
      setPetState((prev) => ({
        ...prev,
        hero_is_published: false,
      }));
    }
  }, [pet.id]);

  // Single handler the toggle calls: publish when turning ON, unpublish when OFF.
  const togglePublish = useCallback(() => {
    if (petState.hero_is_published) {
      unpublish();
    } else {
      publish();
    }
  }, [petState.hero_is_published, publish, unpublish]);

  // ---- personality state + updateField adapter (mirrors Care Editor) ----
  function updateField(keyOrObj, value) {
    const updates =
      typeof keyOrObj === "object" ? keyOrObj : { [keyOrObj]: value };
    setPetState((prev) => ({ ...prev, ...updates }));
    pendingFieldsRef.current = { ...pendingFieldsRef.current, ...updates };
    save(pendingFieldsRef.current);
  }

  // Save is now immediate (no debounce), so there's nothing to flush — kept as
  // a no-op so Preview's call site stays simple.
  const flushSave = useCallback(async () => {}, []);

  // Preview: open the preview in the same tab. (Section edits are committed via
  // the section Save button before Preview; nothing is pending.)
  const handlePreview = useCallback(async () => {
    if (typeof window !== "undefined") {
      window.location.href = `/pet-card/${slug}/hero?preview=public`;
    }
  }, [slug]);

  // ---- per-section Save / Cancel (autosave still runs underneath) ----
  // Opening a section snapshots its current committed values so Cancel can
  // revert any edits made during this editing session. Save just closes.
  const snapshotRef = useRef(null);
  async function openSection(id) {
    // If a DIFFERENT section is open with unsaved changes, ask before switching.
    if (openFormId && openFormId !== id && isSectionDirty()) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return; // dismissed — stay where we are
      if (choice === "save") {
        const ok = await saveSection();
        // If the save failed, stay on the current section so edits aren't lost.
        if (!ok) return;
      } else {
        revertAndCloseSection();
      }
    }
    snapshotRef.current = {
      hero_title: title,
      hero_description: description,
      hero_rarity: rarity,
      hero_stats: stats,
      hero_bg_color: bgColor,
      hero_card_color: cardColor,
      hero_accent_color: accentColor,
      hero_label_color: labelColor,
      hero_intro_color: introColor || null,
      hero_name_color: nameColor || null,
      hero_footer_color: footerColor || null,
      hero_bg_design: bgDesign,
      hero_bg_category: bgCategory,
      hero_lighting: JSON.stringify(bgLighting),
    };
    setOpenFormId(id);
  }
  // Has the user changed anything in the open section vs the snapshot taken
  // when it opened? Drives the unsaved-changes guard.
  function isSectionDirty() {
    const s = snapshotRef.current;
    if (!s) return false;
    return (
      s.hero_title !== title ||
      s.hero_description !== description ||
      s.hero_rarity !== rarity ||
      JSON.stringify(s.hero_stats) !== JSON.stringify(stats) ||
      s.hero_bg_color !== bgColor ||
      s.hero_card_color !== cardColor ||
      s.hero_accent_color !== accentColor ||
      (s.hero_label_color || s.hero_accent_color) !== labelColor ||
      s.hero_bg_design !== bgDesign ||
      s.hero_bg_category !== bgCategory ||
      (s.hero_lighting || "") !== JSON.stringify(bgLighting)
    );
  }
  // Save commits the current draft to the database, then closes the section.
  async function saveSection() {
    const fields = {
      hero_title: (title || "").trim() || null,
      hero_description: (description || "").trim() || null,
      hero_rarity: rarity || null,
      hero_stats: stats,
      hero_bg_color: bgColor,
      hero_card_color: cardColor,
      hero_accent_color: accentColor,
      hero_label_color: labelColor,
      hero_intro_color: introColor || null,
      hero_name_color: nameColor || null,
      hero_footer_color: footerColor || null,
      hero_bg_design: bgDesign,
      hero_bg_category: bgCategory,
      hero_lighting: JSON.stringify(bgLighting),
    };
    const ok = await save(fields);
    // Only close the section if the save actually succeeded; on failure keep
    // the form open with the user's edits intact so they can retry.
    if (ok) {
      // Keep petState in sync with what we just persisted, so the publish
      // snapshot (which reads petState/current state) never publishes a stale
      // value. Without this, saving a title here left petState.hero_title stale.
      setPetState((prev) => ({ ...prev, ...fields }));
      snapshotRef.current = null;
      setOpenFormId(null);
    }
    return ok;
  }
  // Cancel reverts the in-memory draft to the snapshot. Nothing was persisted
  // while editing, so there is no database write to undo.
  // Cancel button. If the section has unsaved edits, show the styled modal
  // (Save / Discard / Keep editing) so behaviour matches Profile. If nothing
  // changed, just close.
  async function cancelSection() {
    if (openFormId && isSectionDirty()) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return; // dismissed — stay in the form
      if (choice === "save") {
        const ok = await saveSection();
        if (!ok) return; // save failed — keep the form open
        return; // saveSection already closed the form
      }
      // choice === "discard" → fall through to revert + close
    }
    revertAndCloseSection();
  }
  // Revert the in-memory draft to the snapshot and close. No DB write — nothing
  // was persisted while editing.
  function revertAndCloseSection() {
    const snap = snapshotRef.current;
    if (snap) {
      setTitle(snap.hero_title);
      setDescription(snap.hero_description);
      setRarity(snap.hero_rarity);
      setStats(snap.hero_stats);
      setBgColor(snap.hero_bg_color);
      setCardColor(snap.hero_card_color);
      setAccentColor(snap.hero_accent_color);
      setLabelColor(snap.hero_label_color || snap.hero_accent_color);
      setIntroColor(snap.hero_intro_color || "");
      setNameColor(snap.hero_name_color || "");
      setFooterColor(snap.hero_footer_color || "");
      setBgDesign(snap.hero_bg_design);
      setBgCategory(snap.hero_bg_category);
      setBgLighting(parseLighting(snap.hero_lighting));
    }
    snapshotRef.current = null;
    setOpenFormId(null);
  }
  // Guarded attempt to leave the open section (e.g. clicking another section's
  // edit, or Preview). If there are unsaved changes, ask Save / Discard.
  async function guardedLeaveSection(onProceed) {
    if (openFormId && isSectionDirty()) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return; // dismissed — don't proceed
      if (choice === "save") {
        const ok = await saveSection();
        if (!ok) return; // save failed — stay
      } else {
        revertAndCloseSection();
      }
    }
    if (onProceed) onProceed();
  }

  // ---- title ----
  function onTitleChange(v) {
    const next = v.slice(0, TITLE_MAX);
    setTitle(next);
  }

  // ---- description ----
  function onDescriptionChange(v) {
    const next = v.slice(0, DESC_MAX);
    setDescription(next);
  }

  // ---- rarity ----
  function onRarityPick(key) {
    setRarity(key);
  }

  // ---- customization (independent colors + bg design) ----
  function onBgColor(hex) {
    setBgColor(hex);
  }
  // ── Hero photo gallery handlers ──────────────────────────────────────────
  async function handleHeroPhotoUpload(e) {
    const raw = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!raw) return;
    if (heroPhotos.length >= MAX_HERO_PHOTOS) {
      setPhotoError(`You can store up to ${MAX_HERO_PHOTOS} photos.`);
      return;
    }
    setPhotoError("");
    setPhotoBusy(true);
    const { file, error: prepErr } = await prepareImageFile(raw);
    if (prepErr || !file) {
      setPhotoError(prepErr || "Could not use that image.");
      setPhotoBusy(false);
      return;
    }
    const { photos, index, error } = await uploadHeroPhoto(
      pet.id,
      file,
      heroPhotos,
    );
    if (error) {
      setPhotoError(error.message || "Upload failed.");
    } else {
      setHeroPhotos(photos);
      setHeroPhotoIndex(index);
    }
    setPhotoBusy(false);
  }
  async function handleHeroPhotoSelect(i) {
    if (i === heroPhotoIndex) return;
    setHeroPhotoIndex(i);
    await selectHeroPhoto(pet.id, heroPhotos, i);
  }
  async function handleHeroPhotoDelete(i) {
    setPhotoBusy(true);
    const { photos, index, error } = await deleteHeroPhoto(
      pet.id,
      heroPhotos,
      i,
      heroPhotoIndex,
    );
    if (!error) {
      setHeroPhotos(photos);
      setHeroPhotoIndex(index);
    } else {
      setPhotoError(error.message || "Could not remove photo.");
    }
    setPhotoBusy(false);
  }

  function onCardColor(hex) {
    setCardColor(hex);
  }
  function onAccentColor(hex) {
    setAccentColor(hex);
  }
  function onLabelColor(hex) {
    setLabelColor(hex);
  }
  function onNameColor(hex) {
    setNameColor(hex || "");
  }
  function onIntroColor(hex) {
    // "" = Auto (clear override). Otherwise store the chosen hex.
    setIntroColor(hex || "");
  }
  function onFooterColor(hex) {
    setFooterColor(hex || "");
  }
  function onBgDesign(key, category) {
    setBgDesign(key);
    if (category) {
      setBgCategory(category);
    }
  }

  // ---- stats ----
  function commitStats(next) {
    setStats(next);
  }
  // ---- saved custom presets (per-user, persisted in hero_stat_presets) ----
  const [savedPresets, setSavedPresets] = useState([]);
  // Returning from the same-tab Preview lands you wherever you were (the bottom
  // action bar). Reset to the top of the page on mount so you start at the top.
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, []);
  // Warn before leaving (tab close / refresh) if an open section has unsaved
  // changes. dirtyRef mirrors the current dirty state so the handler sees fresh
  // values without re-binding every render.
  const dirtyRef = useRef(false);
  dirtyRef.current = !!openFormId && isSectionDirty();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("hero_stat_presets")
          .select("presets")
          .eq("user_id", user.id)
          .maybeSingle();
        if (active && data && Array.isArray(data.presets)) {
          setSavedPresets(data.presets);
        }
      } catch (e) {
        /* no saved presets yet */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function persistPresets(next) {
    setSavedPresets(next);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("hero_stat_presets").upsert(
        {
          user_id: user.id,
          presets: next,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    } catch (e) {
      /* ignore persist failure */
    }
  }

  function saveStatAsPreset(stat) {
    const label = (stat.label || "").trim();
    if (!label) return;
    if (savedPresets.some((p) => p.label === label)) return;
    persistPresets([...savedPresets, { emoji: stat.emoji, label }]);
  }
  function deleteSavedPreset(label) {
    persistPresets(savedPresets.filter((p) => p.label !== label));
  }

  function addPresetStat(preset) {
    if (stats.length >= MAX_STATS) return;
    if (stats.some((s) => s.label === preset.label)) return;
    commitStats([
      ...stats,
      { emoji: preset.emoji, label: preset.label, value: 5 },
    ]);
  }
  const customCount = stats.filter((s) => s.custom).length;
  function addCustomStat() {
    if (stats.length >= MAX_STATS) return;
    if (customCount >= MAX_CUSTOM_STATS) return;
    commitStats([...stats, { emoji: "✨", label: "", value: 5, custom: true }]);
  }
  function updateStat(i, patch) {
    commitStats(stats.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function removeStat(i) {
    commitStats(stats.filter((_, idx) => idx !== i));
  }

  return (
    <div className="he-stage">
      <SaveIndicator status={saveStatus} />
      {unsavedModal}
      {/* Persistent action bar — Preview + Publish reachable from anywhere */}
      <div className="he-actionbar">
        <div className="he-actionbar-inner">
          <div className="he-actionbar-status">
            {openFormId && isSectionDirty() ? (
              <span
                className="he-pub-dot"
                title="You have unsaved changes in the section you're editing. Click Save to keep them."
              >
                ●{" "}
                <span className="he-status-stack">
                  <span className="he-status-main">Unsaved changes</span>
                  <span className="he-status-detail">
                    Save to keep your edits
                  </span>
                </span>
              </span>
            ) : !petState.hero_is_published ? (
              <span
                className="he-pub-dot"
                title="This card is a draft — not visible to visitors. Toggle Publish on to make it live."
              >
                ●{" "}
                <span className="he-status-stack">
                  <span className="he-status-main">Draft — not live</span>
                  <span className="he-status-detail">
                    Publish to make it visible
                  </span>
                </span>
              </span>
            ) : hasUnpublished ? (
              <span
                className="he-pub-dot"
                title="Your changes are saved but not yet visible to visitors. Toggle Publish to push your latest version."
              >
                ●{" "}
                <span className="he-status-stack">
                  <span className="he-status-main">Saved — not live</span>
                  <span className="he-status-detail">Re-publish to update</span>
                </span>
              </span>
            ) : (
              <span
                className="he-pub-live"
                title="Your card is published. Visitors see your latest version."
              >
                ●{" "}
                <span className="he-status-stack">
                  <span className="he-status-main">Published</span>
                  <span className="he-status-detail">Visitors see this</span>
                </span>
              </span>
            )}
          </div>
          <div className="he-actionbar-actions">
            <button
              type="button"
              className="he-btn he-btn-ghost he-btn-sm"
              onClick={handlePreview}
            >
              <Eye size={16} /> Preview
            </button>
            <div className="he-pubtoggle-wrap">
              <span className="he-pubtoggle-label">
                {petState.hero_is_published ? "Published" : "Unpublished"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={!!petState.hero_is_published}
                aria-label={
                  petState.hero_is_published
                    ? "Unpublish Hero Card"
                    : "Publish Hero Card"
                }
                className={`he-pubtoggle${
                  petState.hero_is_published ? " is-on" : ""
                }`}
                onClick={togglePublish}
                disabled={publishStatus === "publishing"}
                title={
                  petState.hero_is_published
                    ? "Published — visitors can see this card. Toggle off to unpublish."
                    : "Draft — not visible to visitors. Toggle on to publish."
                }
              >
                <span className="he-pubtoggle-knob">
                  {publishStatus === "publishing" ? (
                    <Loader2 size={12} className="he-spin" />
                  ) : null}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="pp-container he-container">
        {/* header */}
        <div className="he-head">
          <Breadcrumb
            items={[
              { label: "Pet Cards", href: "/pet-card" },
              { label: pet.name || "Pet" },
              { label: "Hero Card", href: `/pet-card/${slug}/hero` },
              { label: "Edit" },
            ]}
          />
          <div className="he-head-row">
            <div>
              <p className="he-eyebrow">Hero Editor</p>
              <h1 className="he-title">{pet.name}&apos;s Hero Card</h1>
              <p className="he-sub">
                The fun stuff — personality, stats, and flair for sharing.
              </p>
              <Link
                href={`/pet-card/${slug}/hero`}
                className="he-viewcard-pill"
              >
                View Hero Card
                <ArrowRight size={14} strokeWidth={2.4} />
              </Link>
            </div>
          </div>
        </div>

        {/* TITLE / ARCHETYPE */}
        <HeroSectionShell
          id="title"
          icon={Sparkles}
          title="Title"
          sub="A fun archetype that appears as a banner on the card."
          editing={openFormId === "hero-title"}
        >
          {openFormId === "hero-title" && (
            <div className="he-body-edit-row">
              <button
                type="button"
                className="he-edit-btn"
                onClick={cancelSection}
                aria-label="Close"
              >
                <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
              </button>
            </div>
          )}
          <Collapse open={openFormId === "hero-title"}>
            <div className="he-field">
              <input
                className="he-input"
                type="text"
                value={title}
                maxLength={TITLE_MAX}
                placeholder="e.g. The Velcro Cuddler"
                onChange={(e) => onTitleChange(e.target.value)}
              />
              <div className="he-field-foot he-field-foot-title ">
                <span className="he-hint">Keep it short and playful.</span>
                <span
                  className={`he-count${title.length >= TITLE_MAX ? " is-max" : ""}`}
                >
                  {title.length}/{TITLE_MAX}
                </span>
              </div>
            </div>
            <div className="he-edit-actions">
              <button
                type="button"
                className="he-btn he-btn-ghost he-btn-sm"
                onClick={cancelSection}
              >
                Cancel
              </button>
              <button
                type="button"
                className="he-btn he-btn-primary he-btn-sm"
                onClick={saveSection}
              >
                Save
              </button>
            </div>
          </Collapse>
          <Collapse open={!(openFormId === "hero-title")}>
            <div className="he-display">
              <button
                type="button"
                className="he-edit-btn he-edit-btn--inset"
                onClick={() => openSection("hero-title")}
                aria-label="Edit title"
              >
                <Pencil size={EDIT_ICON_SIZE} strokeWidth={2} />
              </button>
              {title.trim() ? (
                <p className="he-display-value">{title}</p>
              ) : (
                <p className="he-display-empty">No title yet.</p>
              )}
            </div>
          </Collapse>
        </HeroSectionShell>

        {/* DESCRIPTION */}
        <HeroSectionShell
          id="description"
          icon={Sparkles}
          title="Description"
          sub="A short intro line that appears under your pet's name."
          editing={openFormId === "hero-description"}
        >
          {openFormId === "hero-description" && (
            <div className="he-body-edit-row">
              <button
                type="button"
                className="he-edit-btn"
                onClick={cancelSection}
                aria-label="Close"
              >
                <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
              </button>
            </div>
          )}
          <Collapse open={openFormId === "hero-description"}>
            <div className="he-field">
              <textarea
                className="he-input he-textarea"
                rows={2}
                value={description}
                maxLength={DESC_MAX}
                placeholder="e.g. A gentle giant who loves sunbeams and snacks."
                onChange={(e) => onDescriptionChange(e.target.value)}
              />
              <div className="he-field-foot">
                <span className="he-hint">One or two short sentences.</span>
                <span
                  className={`he-count${description.length >= DESC_MAX ? " is-max" : ""}`}
                >
                  {description.length}/{DESC_MAX}
                </span>
              </div>
            </div>
            <div className="he-edit-actions">
              <button
                type="button"
                className="he-btn he-btn-ghost he-btn-sm"
                onClick={cancelSection}
              >
                Cancel
              </button>
              <button
                type="button"
                className="he-btn he-btn-primary he-btn-sm"
                onClick={saveSection}
              >
                Save
              </button>
            </div>
          </Collapse>
          <Collapse open={!(openFormId === "hero-description")}>
            <div className="he-display">
              <button
                type="button"
                className="he-edit-btn he-edit-btn--inset"
                onClick={() => openSection("hero-description")}
                aria-label="Edit description"
              >
                <Pencil size={EDIT_ICON_SIZE} strokeWidth={2} />
              </button>
              {description.trim() ? (
                <p className="he-display-value">{description}</p>
              ) : (
                <p className="he-display-empty">No description yet.</p>
              )}
            </div>
          </Collapse>
        </HeroSectionShell>

        {/* RARITY */}
        <HeroSectionShell
          id="rarity"
          icon={Award}
          title="Rarity"
          sub="A fun collectible badge you choose for flair — pick any tier you like."
          editing={openFormId === "hero-rarity"}
        >
          {openFormId === "hero-rarity" && (
            <div className="he-body-edit-row">
              <button
                type="button"
                className="he-edit-btn"
                onClick={cancelSection}
                aria-label="Close"
              >
                <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
              </button>
            </div>
          )}

          <Collapse open={openFormId === "hero-rarity"}>
            <div className="he-rarity-grid">
              {RARITY_TIERS.map((t) => {
                const active = rarity === t.key;
                return (
                  <button
                    key={t.key || "none"}
                    className={`he-rarity-opt${active ? " is-active" : ""}`}
                    style={
                      active
                        ? {
                            borderColor: t.color,
                            boxShadow: `0 0 0 1.5px ${t.color}`,
                          }
                        : {}
                    }
                    onClick={() => onRarityPick(t.key)}
                  >
                    <span
                      className="he-rarity-dot"
                      style={{
                        background: active ? t.color : `${t.color}1a`,
                      }}
                    >
                      {active ? (
                        <Check size={19} strokeWidth={2.8} color="#fff" />
                      ) : (
                        <Award size={20} strokeWidth={2.2} color={t.color} />
                      )}
                    </span>
                    <span
                      className="he-rarity-label"
                      style={t.key ? { color: t.color } : {}}
                    >
                      {t.label}
                    </span>
                    <span className="he-rarity-desc">{t.desc}</span>
                  </button>
                );
              })}
            </div>
            {rarity ? (
              <button
                type="button"
                className="he-rarity-clear"
                onClick={() => setRarity("")}
              >
                Remove badge
              </button>
            ) : null}
            <div className="he-edit-actions">
              <button
                type="button"
                className="he-btn he-btn-ghost he-btn-sm"
                onClick={cancelSection}
              >
                Cancel
              </button>
              <button
                type="button"
                className="he-btn he-btn-primary he-btn-sm"
                onClick={saveSection}
              >
                Save
              </button>
            </div>
          </Collapse>
          <Collapse open={!(openFormId === "hero-rarity")}>
            <div className="he-display">
              <button
                type="button"
                className="he-edit-btn he-edit-btn--inset"
                onClick={() => openSection("hero-rarity")}
                aria-label="Edit rarity"
              >
                <Pencil size={EDIT_ICON_SIZE} strokeWidth={2} />
              </button>
              {(() => {
                const tier = RARITY_TIERS.find((t) => t.key === rarity);
                if (!tier) {
                  return (
                    <p className="he-display-empty">
                      No badge — tap to add one.
                    </p>
                  );
                }
                return (
                  <div className="he-rarity-current">
                    <span
                      className="he-display-pill"
                      style={{ background: tier.color }}
                    >
                      <Award size={16} strokeWidth={2.3} /> {tier.label}
                    </span>
                    <span className="he-rarity-current-desc">{tier.desc}</span>
                  </div>
                );
              })()}
            </div>
          </Collapse>
        </HeroSectionShell>

        {/* STATS */}
        <HeroSectionShell
          id="stats"
          icon={Scale}
          title="Stats"
          sub={`Playful stat meters (0–10). Add up to ${MAX_STATS}.`}
          editing={openFormId === "hero-stats"}
        >
          {openFormId === "hero-stats" && (
            <div className="he-body-edit-row">
              <button
                type="button"
                className="he-edit-btn"
                onClick={cancelSection}
                aria-label="Close"
              >
                <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
              </button>
            </div>
          )}

          <Collapse open={openFormId === "hero-stats"}>
            {stats.length > 0 && (
              <div className="he-stat-list">
                {stats.map((s, i) => {
                  const isSaved = savedPresets.some(
                    (p) => p.label === s.label.trim(),
                  );
                  return (
                    <div className="he-stat-row" key={i}>
                      <div className="he-stat-main">
                        <EmojiPicker
                          value={s.emoji}
                          onPick={(em) => updateStat(i, { emoji: em })}
                        />
                        <div className="he-stat-field">
                          <input
                            className="he-stat-label"
                            type="text"
                            value={s.label}
                            maxLength={STAT_LABEL_MAX}
                            placeholder="Stat name"
                            onChange={(e) =>
                              updateStat(i, {
                                label: e.target.value.slice(0, STAT_LABEL_MAX),
                              })
                            }
                          />
                          {/* sub-line always reserved so every row is the
                                same height and evenly spaced. The character
                                counter shows on EVERY stat; the save-preset
                                button stays custom-only. */}
                          <div className="he-stat-sub">
                            <div className="he-stat-sub-left">
                              {s.custom && s.label.trim() && !isSaved && (
                                <button
                                  type="button"
                                  className="he-stat-save-preset"
                                  onClick={() => saveStatAsPreset(s)}
                                  title="Save as a reusable preset"
                                >
                                  <Plus size={13} strokeWidth={2.6} /> Save
                                  preset
                                </button>
                              )}
                            </div>
                            <span
                              className={`he-stat-count${s.label.length >= STAT_LABEL_MAX ? " is-max" : ""}`}
                            >
                              {s.label.length}/{STAT_LABEL_MAX}
                            </span>
                          </div>
                        </div>
                        <input
                          className="he-stat-slider"
                          type="range"
                          min="0"
                          max="10"
                          step="1"
                          value={s.value}
                          style={{ accentColor: accentColor }}
                          onChange={(e) =>
                            updateStat(i, { value: Number(e.target.value) })
                          }
                        />
                        <span className="he-stat-val">{s.value}/10</span>
                        <button
                          className="he-stat-del"
                          onClick={() => removeStat(i)}
                          aria-label="Remove stat"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add custom stat — directly under the last stat */}
            {stats.length < MAX_STATS && (
              <div className="he-custom-row">
                {customCount < MAX_CUSTOM_STATS ? (
                  <button
                    type="button"
                    className="he-add-custom-btn"
                    onClick={addCustomStat}
                  >
                    <Plus size={15} strokeWidth={2.5} /> Add custom stat (
                    {customCount}/{MAX_CUSTOM_STATS})
                  </button>
                ) : (
                  <span className="he-custom-max-note">
                    Custom stat limit reached ({MAX_CUSTOM_STATS}/
                    {MAX_CUSTOM_STATS})
                  </span>
                )}
              </div>
            )}

            {/* Add a preset — defaults + your saved presets, at the bottom */}
            {stats.length < MAX_STATS && (
              <div className="he-stat-add">
                <p className="he-hint">Add a preset:</p>
                <div className="he-preset-chips">
                  {PRESET_STATS.filter(
                    (p) => !stats.some((s) => s.label === p.label),
                  ).map((p) => (
                    <button
                      key={p.label}
                      className="he-preset-chip"
                      onClick={() => addPresetStat(p)}
                    >
                      {p.emoji} {p.label}
                    </button>
                  ))}
                  {savedPresets.map((p) => {
                    const onCard = stats.some((s) => s.label === p.label);
                    return (
                      <span
                        key={p.label}
                        className={`he-preset-chip he-preset-saved${onCard ? " is-on-card" : ""}`}
                      >
                        <button
                          type="button"
                          className="he-preset-saved-add"
                          onClick={() => addPresetStat(p)}
                          disabled={onCard || stats.length >= MAX_STATS}
                          title={
                            onCard ? "Already on this card" : "Add to card"
                          }
                        >
                          {p.emoji} {p.label}
                        </button>
                        <button
                          type="button"
                          className="he-preset-saved-del"
                          onClick={() => deleteSavedPreset(p.label)}
                          aria-label={`Delete saved preset ${p.label}`}
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="he-edit-actions">
              <button
                type="button"
                className="he-btn he-btn-ghost he-btn-sm"
                onClick={cancelSection}
              >
                Cancel
              </button>
              <button
                type="button"
                className="he-btn he-btn-primary he-btn-sm"
                onClick={saveSection}
              >
                Save
              </button>
            </div>
          </Collapse>
          <Collapse open={!(openFormId === "hero-stats")}>
            <div className="he-display">
              <button
                type="button"
                className="he-edit-btn he-edit-btn--inset"
                onClick={() => openSection("hero-stats")}
                aria-label="Edit stats"
              >
                <Pencil size={EDIT_ICON_SIZE} strokeWidth={2} />
              </button>
              {stats.length > 0 ? (
                <div className="he-display-stats">
                  {stats.map((s, i) => (
                    <span className="he-display-stat" key={i}>
                      {s.emoji} {s.label || "Unnamed"} · {s.value}/10
                    </span>
                  ))}
                </div>
              ) : (
                <p className="he-display-empty">No stats yet.</p>
              )}
            </div>
          </Collapse>
        </HeroSectionShell>

        {/* CUSTOMIZATION — independent colors + background design */}
        <HeroSectionShell
          id="design"
          icon={PawPrint}
          title="Card design"
          sub="Pick the background, card, and accent colors — plus a background design."
          editing={openFormId === "hero-design"}
        >
          {openFormId === "hero-design" && (
            <div className="he-body-edit-row">
              <button
                type="button"
                className="he-edit-btn"
                onClick={cancelSection}
                aria-label="Close"
              >
                <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
              </button>
            </div>
          )}

          <Collapse open={openFormId === "hero-design"}>
            {/* Background color */}
            <div className="he-pick-block">
              <p className="he-pick-label">Background color</p>
              <div className="he-swatch-row">
                {BG_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    className={`he-swatch${bgColor === hex ? " is-active" : ""}`}
                    style={{ background: hex }}
                    onClick={() => onBgColor(hex)}
                    aria-label={`Background ${hex}`}
                  >
                    {bgColor === hex && (
                      <Check size={13} strokeWidth={3} color="#fff" />
                    )}
                  </button>
                ))}
                <label
                  className="he-swatch he-swatch-custom"
                  title="Custom color"
                >
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => onBgColor(e.target.value)}
                  />
                  <Plus size={14} strokeWidth={2.5} />
                </label>
              </div>
              <HexInput value={bgColor} onChange={onBgColor} />
            </div>

            {/* Background design — three categories */}
            <div className="he-pick-block">
              <p className="he-pick-label">Background design</p>

              {/* category tabs */}
              <div className="he-cat-tabs">
                {BG_CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={`he-cat-tab${bgCategory === c.key ? " is-active" : ""}`}
                    onClick={() => setBgCategory(c.key)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <p className="he-cat-blurb">
                {(BG_CATEGORIES.find((c) => c.key === bgCategory) || {}).blurb}
              </p>

              <div key={bgCategory} className="he-cat-fade">
                {(() => {
                  const cat =
                    BG_CATEGORIES.find((c) => c.key === bgCategory) ||
                    BG_CATEGORIES[0];

                  if (cat.key === "vanta") {
                    // Animated: one shared live preview (hover/select), labeled cards.
                    const previewKey = hoverDesign || bgDesign;
                    return (
                      <>
                        <div className="he-design-preview">
                          <VantaBackground
                            key={previewKey}
                            effect={previewKey}
                            bg={bgColor}
                            accent={accentColor}
                          />
                          <span className="he-design-preview-label">
                            Live preview ·{" "}
                            {(
                              cat.designs.find((d) => d.key === previewKey) ||
                              {}
                            ).label || ""}
                          </span>
                        </div>
                        <div className="he-vanta-cards">
                          {cat.designs.map((d) => (
                            <button
                              key={d.key}
                              type="button"
                              className={`he-vanta-card${bgDesign === d.key && bgCategory === "vanta" ? " is-active" : ""}`}
                              onMouseEnter={() => setHoverDesign(d.key)}
                              onMouseLeave={() => setHoverDesign(null)}
                              onClick={() => onBgDesign(d.key, "vanta")}
                            >
                              <span
                                className="he-vanta-chip"
                                style={{
                                  background: `linear-gradient(135deg, ${bgColor}, ${accentColor})`,
                                }}
                              />
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </>
                    );
                  }

                  // CSS: real thumbnails (static = exact match), no preview.
                  const Renderer = CssDesign;
                  return (
                    <div className="he-design-grid">
                      {cat.designs.map((d) => (
                        <button
                          key={d.key}
                          type="button"
                          className={`he-design-opt${bgDesign === d.key && bgCategory === cat.key ? " is-active" : ""}`}
                          onClick={() => onBgDesign(d.key, cat.key)}
                        >
                          <span className="he-design-swatch">
                            <Renderer
                              design={d.key}
                              bg={bgColor}
                              accent={accentColor}
                              lighting={bgLighting[d.key] || DEFAULT_LIGHTING}
                            />
                          </span>
                          <span className="he-design-name">{d.label}</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}

                {/* Lighting controls for the selected design (collapsible). */}
                <LightingPanel
                  designKey={bgDesign}
                  bg={bgColor}
                  accent={accentColor}
                  category={bgCategory}
                  lighting={curLighting}
                  onChange={setCurLighting}
                  onReset={() =>
                    setBgLighting((prev) => {
                      const next = { ...prev };
                      delete next[bgDesign];
                      return next;
                    })
                  }
                />
              </div>
            </div>

            {/* "Hero Card" label color — defaults to accent, override freely */}
            <div className="he-pick-block">
              <p className="he-pick-label">
                &ldquo;Hero Card&rdquo; label color
              </p>
              <div className="he-label-row">
                <label
                  className="he-swatch he-swatch-custom"
                  title="Custom color"
                  style={{ background: labelColor }}
                >
                  <input
                    type="color"
                    value={labelColor}
                    onChange={(e) => onLabelColor(e.target.value)}
                  />
                </label>
                <HexInput value={labelColor} onChange={onLabelColor} />
                {labelColor !== accentColor && (
                  <button
                    type="button"
                    className="he-textlink"
                    onClick={() => onLabelColor(accentColor)}
                  >
                    Match accent color
                  </button>
                )}
              </div>
              {labelLowContrast && (
                <div className="he-label-warn">
                  <span className="he-label-warn-text">
                    <TriangleAlert
                      size={15}
                      strokeWidth={2.2}
                      className="he-label-warn-icon"
                    />
                    <span>
                      This color may be hard to read on your background. It will
                      still show exactly as chosen.
                    </span>
                  </span>
                  <button
                    type="button"
                    className="he-textlink he-label-warn-fix"
                    onClick={() => onLabelColor(labelSuggestion)}
                  >
                    Use a readable shade
                    <span
                      className="he-label-warn-swatch"
                      style={{ background: labelSuggestion }}
                    />
                  </button>
                </div>
              )}
              <p className="he-photo-hint">
                Colors the small <strong>&ldquo;Hero Card&rdquo;</strong> label
                above your pet&apos;s name.
              </p>
            </div>

            {/* "Meet {name}" heading color — its own control. Defaults to AUTO. */}
            <div className="he-pick-block">
              <p className="he-pick-label">
                &ldquo;Meet {pet.name || "your pet"}&rdquo; color
              </p>
              <div className="he-label-row">
                <label
                  className="he-swatch he-swatch-custom"
                  title="Custom heading color"
                  style={{ background: nameColor || "var(--border,#EDE8E0)" }}
                >
                  <input
                    type="color"
                    value={nameColor || "#172531"}
                    onChange={(e) => onNameColor(e.target.value)}
                  />
                </label>
                <HexInput
                  value={nameColor || ""}
                  onChange={onNameColor}
                  placeholder="Automatic"
                />
                {nameColor !== "" && (
                  <button
                    type="button"
                    className="he-textlink"
                    onClick={() => onNameColor("")}
                  >
                    Reset to automatic
                  </button>
                )}
              </div>
              <p className="he-photo-hint">
                Colors the large{" "}
                <strong>&ldquo;Meet {pet.name || "your pet"}&rdquo;</strong>
                heading above the card.
                <br />
                <span className="he-hint-auto">Leave blank for automatic.</span>
              </p>
            </div>

            {/* Intro / footer color — subtitle + "Made on PetParrk" footer. */}
            <div className="he-pick-block">
              <p className="he-pick-label">Intro &amp; footer color</p>
              <div className="he-label-row">
                <label
                  className="he-swatch he-swatch-custom"
                  title="Custom intro color"
                  style={{
                    background: introColor || "var(--border,#EDE8E0)",
                  }}
                >
                  <input
                    type="color"
                    value={introColor || "#172531"}
                    onChange={(e) => onIntroColor(e.target.value)}
                  />
                </label>
                <HexInput
                  value={introColor || ""}
                  onChange={onIntroColor}
                  placeholder="Automatic"
                />
                {introColor !== "" && (
                  <button
                    type="button"
                    className="he-textlink"
                    onClick={() => onIntroColor("")}
                  >
                    Reset to automatic
                  </button>
                )}
              </div>
              <p className="he-photo-hint">
                Colors the description line under the heading.
                <br />
                <span className="he-hint-auto">Leave blank for automatic.</span>
              </p>
            </div>

            {/* Footer accent color — "PetParrk" + paw in "Made on PetParrk". */}
            <div className="he-pick-block">
              <p className="he-pick-label">Footer accent color</p>
              <div className="he-label-row">
                <label
                  className="he-swatch he-swatch-custom"
                  title="Custom footer accent"
                  style={{ background: footerColor || "var(--border,#EDE8E0)" }}
                >
                  <input
                    type="color"
                    value={footerColor || "#172531"}
                    onChange={(e) => onFooterColor(e.target.value)}
                  />
                </label>
                <HexInput
                  value={footerColor || ""}
                  onChange={onFooterColor}
                  placeholder="Automatic"
                />
                {footerColor !== "" && (
                  <button
                    type="button"
                    className="he-textlink"
                    onClick={() => onFooterColor("")}
                  >
                    Reset to automatic
                  </button>
                )}
              </div>
              <p className="he-photo-hint">
                Colors <strong>&ldquo;PetParrk&rdquo;</strong> and the paw in
                the footer.
                <br />
                <strong>&ldquo;Made on&rdquo; </strong>stays a soft neutral.
                <br />
                <span className="he-hint-auto">Leave blank for automatic.</span>
              </p>
            </div>

            {/* Card color */}
            <div className="he-pick-block">
              <p className="he-pick-label">Card color</p>
              <div className="he-swatch-row">
                {CARD_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    className={`he-swatch${cardColor === hex ? " is-active" : ""}`}
                    style={{ background: hex }}
                    onClick={() => onCardColor(hex)}
                    aria-label={`Card ${hex}`}
                  >
                    {cardColor === hex && (
                      <Check size={13} strokeWidth={3} color="#fff" />
                    )}
                  </button>
                ))}
                <label
                  className="he-swatch he-swatch-custom"
                  title="Custom color"
                >
                  <input
                    type="color"
                    value={cardColor}
                    onChange={(e) => onCardColor(e.target.value)}
                  />
                  <Plus size={14} strokeWidth={2.5} />
                </label>
              </div>
              <HexInput value={cardColor} onChange={onCardColor} />
            </div>

            {/* Accent color */}
            <div className="he-pick-block">
              <p className="he-pick-label">Accent color</p>
              <div className="he-swatch-row">
                {ACCENT_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    className={`he-swatch${accentColor === hex ? " is-active" : ""}`}
                    style={{ background: hex }}
                    onClick={() => onAccentColor(hex)}
                    aria-label={`Accent ${hex}`}
                  >
                    {accentColor === hex && (
                      <Check size={13} strokeWidth={3} color="#fff" />
                    )}
                  </button>
                ))}
                <label
                  className="he-swatch he-swatch-custom"
                  title="Custom color"
                >
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => onAccentColor(e.target.value)}
                  />
                  <Plus size={14} strokeWidth={2.5} />
                </label>
              </div>
              <HexInput value={accentColor} onChange={onAccentColor} />
            </div>

            {/* Hero photo gallery — up to MAX_HERO_PHOTOS, pick the active one */}
            <div className="he-pick-block">
              <p className="he-pick-label">
                Hero photo{" "}
                <span className="he-photo-count">
                  {heroPhotos.length}/{MAX_HERO_PHOTOS}
                </span>
              </p>
              <div className="he-photo-grid">
                {heroPhotos.map((url, i) => (
                  <div
                    key={url}
                    className={`he-photo-thumb${i === heroPhotoIndex ? " is-active" : ""}`}
                    onClick={() => handleHeroPhotoSelect(i)}
                    role="button"
                    tabIndex={0}
                  >
                    <img src={url} alt="" />
                    {i === heroPhotoIndex && (
                      <span className="he-photo-active-badge">
                        <Check size={13} strokeWidth={3} />
                      </span>
                    )}
                    <button
                      type="button"
                      className="he-photo-del"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleHeroPhotoDelete(i);
                      }}
                      disabled={photoBusy}
                      aria-label="Remove photo"
                    >
                      <X size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
                {heroPhotos.length < MAX_HERO_PHOTOS && (
                  <label
                    className={`he-photo-add${photoBusy ? " is-busy" : ""}`}
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/heic,image/heif"
                      onChange={handleHeroPhotoUpload}
                      disabled={photoBusy}
                      hidden
                    />
                    {photoBusy ? (
                      <span className="he-photo-spinner" />
                    ) : (
                      <>
                        <Plus size={20} strokeWidth={2.5} />
                        <span>Add photo</span>
                      </>
                    )}
                  </label>
                )}
              </div>
              {photoError && <p className="he-photo-error">{photoError}</p>}
              <p className="he-photo-hint">
                Tap a photo to use it on your Hero Card. JPG or PNG, up to 5MB.
              </p>
            </div>

            <div className="he-edit-actions he-edit-actions--design">
              <button
                type="button"
                className="he-btn he-btn-ghost he-btn-sm"
                onClick={cancelSection}
              >
                Cancel
              </button>
              <button
                type="button"
                className="he-btn he-btn-primary he-btn-sm"
                onClick={saveSection}
              >
                Save
              </button>
            </div>
          </Collapse>
          <Collapse open={!(openFormId === "hero-design")}>
            <div className="he-display">
              <button
                type="button"
                className="he-edit-btn he-edit-btn--inset"
                onClick={() => openSection("hero-design")}
                aria-label="Edit card design"
              >
                <Pencil size={EDIT_ICON_SIZE} strokeWidth={2} />
              </button>
              <div className="he-display-design">
                <span className="he-display-colors">
                  <span
                    className="he-display-dot"
                    style={{ background: bgColor }}
                    title="Background"
                  />
                  <span
                    className="he-display-dot"
                    style={{ background: cardColor }}
                    title="Card"
                  />
                  <span
                    className="he-display-dot"
                    style={{ background: accentColor }}
                    title="Accent"
                  />
                </span>
                <span className="he-display-designname">
                  {
                    (
                      BG_CATEGORIES.flatMap((c) => c.designs).find(
                        (d) => d.key === bgDesign,
                      ) || { label: bgDesign }
                    ).label
                  }{" "}
                  background
                </span>
              </div>
            </div>
          </Collapse>
        </HeroSectionShell>

        {/* ===== PERSONALITY (moved from Care Editor) ===== */}
        <HeroSectionShell
          id="personality"
          icon={Heart}
          title="Personality"
          sub="The Hero Card details that celebrate your pet's personality."
          editing={false}
        >
          <PersonalitySection
            pet={petState}
            onUpdate={updateField}
            setSaveStatus={setSaveStatus}
            openFormId={openFormId}
            setOpenFormId={setOpenFormId}
            confirmUnsaved={confirmUnsaved}
          />
        </HeroSectionShell>
        <HeroSectionShell
          id="tags"
          icon={Award}
          title="Identity tags"
          sub="Tags that tell your pet's story, shown as badges on the Hero Card."
          editing={false}
        >
          <IdentityTagsSection
            pet={petState}
            onUpdate={updateField}
            setSaveStatus={setSaveStatus}
            openFormId={openFormId}
            setOpenFormId={setOpenFormId}
            confirmUnsaved={confirmUnsaved}
          />
        </HeroSectionShell>

        {/* Bottom call-to-action: the natural "done editing" moment. */}
        <div className="he-viewcard-cta">
          <p className="he-viewcard-cta-label">Done editing?</p>
          <Link href={`/pet-card/${slug}/hero`} className="he-viewcard-cta-btn">
            View Hero Card
            <ArrowRight size={15} strokeWidth={2.4} />
          </Link>
        </div>
      </div>

      <HeroScrollTopButton />

      <style>{heroEditorCss}</style>
    </div>
  );
}

// Back-to-top button — identical behavior to the care pages' ScrollTopButton
// (appears after 600px of scroll, smooth-scrolls to top). On mobile it offsets
// upward so it clears the fixed bottom action bar (see he-scrolltop CSS).
function HeroScrollTopButton() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <button
      type="button"
      className="he-scrolltop"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <ArrowUp size={20} strokeWidth={2.4} />
    </button>
  );
}

// =============================================================
// PERSONALITY COMPONENTS (moved from Care Editor)
// =============================================================
function TagInput({
  value,
  onChange,
  placeholder,
  maxLength = 40,
  maxTags = 12,
  autoFocus = false,
}) {
  const [draft, setDraft] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const errorTimerRef = useRef(null);
  const inputRef = useRef(null);
  const tags = Array.isArray(value) ? value : [];

  // Clear any pending error-clear timer when unmounting so we don't call
  // setState on an unmounted component.
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  function showError(msg) {
    setErrorMsg(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    // Auto-clear after 2.5 seconds so the error doesn't linger forever.
    errorTimerRef.current = setTimeout(() => setErrorMsg(""), 2500);
  }

  function addTag(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (tags.length >= maxTags) {
      showError(`Maximum ${maxTags} tags reached.`);
      return;
    }
    // De-duplicate (case-insensitive). Show a brief error so the user knows
    // why their input was rejected — silent failures are confusing.
    if (tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      showError(`"${trimmed}" is already in the list.`);
      setDraft("");
      return;
    }
    setErrorMsg("");
    onChange([...tags, trimmed]);
    setDraft("");
  }

  function removeTag(idx) {
    const next = tags.filter((_, i) => i !== idx);
    onChange(next);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      // Remove last tag when input is empty and user hits backspace.
      removeTag(tags.length - 1);
    }
  }

  function handleBlur() {
    // Commit any in-progress text as a tag on blur so users don't lose work
    // by clicking outside the input.
    if (draft.trim()) addTag(draft);
  }

  const atLimit = tags.length >= maxTags;

  return (
    <>
      <div
        className={`pce-tag-input${errorMsg ? " pce-tag-input--error" : ""}`}
        onClick={() => inputRef.current && inputRef.current.focus()}
      >
        {tags.map((tag, idx) => (
          <span key={`${tag}-${idx}`} className="pce-tag-chip">
            {tag}
            <button
              type="button"
              className="pce-tag-chip-remove"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(idx);
              }}
              aria-label={`Remove ${tag}`}
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </span>
        ))}
        {!atLimit ? (
          <input
            ref={inputRef}
            type="text"
            className="pce-tag-input-field"
            value={draft}
            onChange={(e) => {
              // Clear error as soon as user starts typing again — they are
              // engaging with the input so the message has done its job.
              if (errorMsg) setErrorMsg("");
              setDraft(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={tags.length === 0 ? placeholder : ""}
            maxLength={maxLength}
            autoFocus={autoFocus}
          />
        ) : (
          // At limit — show a small inline notice where the input would be,
          // so the user understands the input is gone on purpose. The remove
          // (×) buttons on existing chips still work, so the user can free up
          // a slot if they want to add a different tag.
          <span className="pce-tag-input-limit-notice">
            Max {maxTags} reached. Remove one to add another.
          </span>
        )}
      </div>
      {errorMsg ? (
        // Ephemeral error (duplicate / invalid action) — auto-clears after
        // 2.5 seconds via showError, or as soon as the user types again.
        <p className="pce-field-hint pce-field-warn" role="alert">
          {errorMsg}
        </p>
      ) : null}
    </>
  );
}

// Wrapped export so the caller can also render the error message in a
// consistent spot below the input. We return the input + the error hint
// from one component to keep the API simple.

// =============================================================
// PERSONALITY SECTION — Hero Card content
// =============================================================
// 5 fields with the now-established view/edit pattern:
//   1. Nickname              — single text input
//   2. Personality traits    — TagInput (array, chips)
//   3. Loves                 — TagInput (array, chips)
//   4. Dislikes              — TagInput (array, chips)
//   5. Fun fact              — textarea (free text)
//
// Each field is its own sub-block with its own form (own formId), so the
// site-wide openFormId coordinator opens one at a time. Auto-save-on-close
// matches the pattern used elsewhere — if user opens another form mid-edit,
// the in-progress draft commits silently.
function PersonalitySection({
  pet,
  onUpdate,
  setSaveStatus,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
}) {
  return (
    <>
      {/* Nickname — single text input */}
      <div className="pce-subsection">
        <NicknameCard
          formId="nickname"
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
          value={pet.nickname}
          onUpdate={onUpdate}
        />
      </div>

      {/* Personality traits — chip-style array */}
      <div className="pce-subsection">
        <TagArrayCard
          formId="personality-traits"
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
          value={pet.personality_traits}
          fieldName="personality_traits"
          onUpdate={onUpdate}
          title="Personality traits"
          subtitle="Words that describe who they are. Press Enter after each."
          placeholder="e.g. goofy, gentle, food-motivated"
          icon={Sparkles}
        />
      </div>

      {/* Loves */}
      <div className="pce-subsection">
        <TagArrayCard
          formId="loves"
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
          value={pet.loves}
          fieldName="loves"
          onUpdate={onUpdate}
          title="Loves"
          subtitle="The things that make them happiest."
          placeholder="e.g. tennis balls, butt scratches, the mailman"
          emoji="❤️"
        />
      </div>

      {/* Dislikes */}
      <div className="pce-subsection">
        <TagArrayCard
          formId="dislikes"
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
          value={pet.dislikes}
          fieldName="dislikes"
          onUpdate={onUpdate}
          title="Not a Fan"
          subtitle="What stresses them out or grosses them out."
          placeholder="e.g. vacuums, baths, the doorbell"
          emoji="🙅"
        />
      </div>

      {/* Fun fact — long-form textarea, reuses existing TextareaCard */}
      <div className="pce-subsection">
        <TextareaCard
          formId="fun-fact"
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
          value={pet.fun_fact}
          fieldName="fun_fact"
          onUpdate={onUpdate}
          title="Fun fact"
          subtitle="One quirky story or detail people love hearing."
          placeholder="e.g. Cooper howls along to ambulance sirens — exactly in tune."
          maxLength={300}
          rows={3}
        />
      </div>
    </>
  );
}

// Nickname — single text input with view/edit/save pattern.
// Different from TextareaCard because it's a one-line input, not a textarea.
function NicknameCard({
  formId,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
  value,
  onUpdate,
}) {
  const editing = openFormId === formId;
  const hasValue = value && value.trim().length > 0;
  const [draft, setDraft] = useState(value || "");
  const draftRef = useRef(draft);
  const valueRef = useRef(value);
  draftRef.current = draft;
  valueRef.current = value;
  const [cancelled, setCancelled] = useState(false);

  // Sync draft from value when entering edit mode (covers re-opens after autosave)
  useEffect(() => {
    if (editing) {
      setDraft(value || "");
      setCancelled(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  // Autosave on close (matches TextareaCard pattern exactly)
  const wasEditingRef = useRef(editing);
  useEffect(() => {
    if (wasEditingRef.current && !editing && !cancelled) {
      const draftTrimmed = (draftRef.current || "").trim();
      const valueTrimmed = (valueRef.current || "").trim();
      if (draftTrimmed !== valueTrimmed) {
        onUpdate("nickname", draftTrimmed || null);
      }
    }
    wasEditingRef.current = editing;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  function handleSave() {
    const next = draft.trim();
    if (next !== (value || "")) {
      onUpdate("nickname", next || null);
    }
    setOpenFormId(null);
  }

  async function handleCancel() {
    if (confirmUnsaved && draft.trim() !== (value || "")) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return;
      if (choice === "save") {
        handleSave();
        return;
      }
    }
    setCancelled(true);
    setDraft(value || "");
    setOpenFormId(null);
  }

  return (
    <>
      <h3 className="pce-sub-title">Nickname</h3>
      <p className="pce-sub-sub">
        What you actually call them — Cooper-bear, Mr. Tubbs, the goblin.
      </p>

      <Collapse open={!editing}>
        {hasValue ? (
          <div className="pce-list">
            <div className="pce-list-item pce-list-item--single">
              <div className="pce-list-item-body">
                <div className="pce-list-item-title-row">
                  <p className="pce-list-item-title">{value}</p>
                </div>
              </div>
              <div className="pce-list-item-actions">
                <button
                  type="button"
                  className="pce-icon-btn"
                  onClick={() => setOpenFormId(formId)}
                  aria-label="Edit nickname"
                >
                  <Pencil size={EDIT_ICON_SIZE} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="pce-list-empty">No nickname on file.</div>
        )}
      </Collapse>

      <Collapse open={editing}>
        <div className="pce-inline-form">
          <button
            type="button"
            className="pce-form-close"
            aria-label="Close"
            onClick={handleCancel}
          >
            <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
          </button>
          <div className="pce-entry-card">
            <div className="pce-field">
              <input
                type="text"
                className="pce-input pce-input-hero-edit"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="e.g. Coop, Mr. Tubbs, the goblin"
                maxLength={40}
                autoFocus
              />
            </div>
          </div>
          <div className="pce-inline-form-actions">
            <button
              type="button"
              className="pce-btn-secondary"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="pce-btn-primary"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>
      </Collapse>
      {!editing && !hasValue ? (
        // Hidden when value exists — pencil on view-mode card is the edit affordance.
        <button
          type="button"
          className="pce-add-btn"
          onClick={() => setOpenFormId(formId)}
        >
          <Plus size={16} strokeWidth={2.4} />
          Add nickname
        </button>
      ) : null}
    </>
  );
}

// Tag array card — view/edit pattern for text[] fields using TagInput.
// Mirrors TextareaCard's structure (view card with chips, edit form with
// TagInput, Cancel/Save) but for arrays instead of strings.
function TagArrayCard({
  formId,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
  value,
  fieldName,
  onUpdate,
  title,
  subtitle,
  placeholder,
  icon: Icon,
  emoji,
  // headingLevel: "section" (default, big h3) or "label" (smaller h4 for
  // field-level headings inside extension cards that have a parent section
  // header above them — prevents two h3s rendering at the same visual weight).
  headingLevel = "section",
}) {
  const editing = openFormId === formId;
  const tags = Array.isArray(value) ? value : [];
  const hasValue = tags.length > 0;
  const [draft, setDraft] = useState(tags);
  const draftRef = useRef(draft);
  const valueRef = useRef(tags);
  draftRef.current = draft;
  valueRef.current = tags;
  const [cancelled, setCancelled] = useState(false);

  // Sync draft from value when entering edit mode (covers re-opens after autosave)
  useEffect(() => {
    if (editing) {
      setDraft(tags);
      setCancelled(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  // Autosave on close
  const wasEditingRef = useRef(editing);
  useEffect(() => {
    if (wasEditingRef.current && !editing && !cancelled) {
      const d = draftRef.current;
      const v = valueRef.current;
      const dirty = d.length !== v.length || d.some((t, i) => t !== v[i]);
      if (dirty) {
        onUpdate(fieldName, d.length === 0 ? null : d);
      }
    }
    wasEditingRef.current = editing;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  function handleSave() {
    const v = valueRef.current;
    const dirty = draft.length !== v.length || draft.some((t, i) => t !== v[i]);
    if (dirty) {
      onUpdate(fieldName, draft.length === 0 ? null : draft);
    }
    setOpenFormId(null);
  }

  async function handleCancel() {
    const dirty =
      draft.length !== tags.length || draft.some((t, i) => t !== tags[i]);
    if (confirmUnsaved && dirty) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return;
      if (choice === "save") {
        handleSave();
        return;
      }
    }
    setCancelled(true);
    setDraft(tags);
    setOpenFormId(null);
  }

  return (
    <>
      {headingLevel === "label" ? (
        <h4 className="pce-field-heading">{title}</h4>
      ) : (
        <h3 className="pce-sub-title">{title}</h3>
      )}
      {subtitle ? <p className="pce-sub-sub">{subtitle}</p> : null}

      <Collapse open={!editing}>
        {hasValue ? (
          <div className="pce-list">
            <div className="pce-list-item pce-list-item--chips">
              <div className="pce-list-item-body">
                <div className="pce-list-item-title-row pce-list-item-title-row--prose">
                  <div className="pce-tag-chips-display">
                    {tags.map((tag, idx) => (
                      <span
                        key={`${tag}-${idx}`}
                        className="pce-tag-chip pce-tag-chip--display"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="pce-list-item-actions">
                <button
                  type="button"
                  className="pce-icon-btn"
                  onClick={() => setOpenFormId(formId)}
                  aria-label={`Edit ${title.toLowerCase()}`}
                >
                  <Pencil size={EDIT_ICON_SIZE} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="pce-list-empty">
            No {title.toLowerCase()} on file.
          </div>
        )}
      </Collapse>

      <Collapse open={editing}>
        <div className="pce-inline-form">
          <button
            type="button"
            className="pce-form-close"
            aria-label="Close"
            onClick={handleCancel}
          >
            <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
          </button>
          <div className="pce-entry-card">
            <div className="pce-field">
              <TagInput
                value={draft}
                onChange={setDraft}
                placeholder={placeholder}
                autoFocus
              />
            </div>
          </div>
          <div className="pce-inline-form-actions">
            <button
              type="button"
              className="pce-btn-secondary"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="pce-btn-primary"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>
      </Collapse>
      {!editing && !hasValue ? (
        <button
          type="button"
          className="pce-add-btn"
          onClick={() => setOpenFormId(formId)}
        >
          <Plus size={16} strokeWidth={2.4} />
          Add {title.toLowerCase()}
        </button>
      ) : null}
    </>
  );
}

// =============================================================
// IDENTITY TAGS — Hero Card celebration tags
// =============================================================
// 13 fixed tags users can toggle to celebrate their pet's identity.
// Selected tags display as emoji + label chips on the Hero Card.
//
// Some tags unlock extension fields (Phase B): Rescue → org + story,
// Champion → titles, Adventurer → favorite trails, etc. The extension
// sub-form appears inline below the picker when that tag is selected.
//
// All tags stored in pets.identity_tags (text[]). Extension fields are
// individual columns (rescue_organization, competitions_won[], etc.) —
// see migration 01 for the full schema.

// Catalog of all 13 tags. The DISPLAY label for `young` is dynamic
// (computed from pet.species at render time) — see getYoungLabel().
//
// Adding new tags? Update both:
//   1. This catalog
//   2. lib/petCardApi.js VALID_IDENTITY_TAGS
// (Server validates against the API list before writing.)
const IDENTITY_TAGS = [
  {
    slug: "champion",
    label: "Champion",
    emoji: "🏆",
    subtitle: "Earned titles, sport wins, or competition achievements.",
  },
  {
    slug: "service_therapy",
    label: "Service / Therapy",
    emoji: "⛑️",
    subtitle: "Trained to help people — service work or therapy visits.",
  },
  {
    slug: "emotional_support",
    label: "Emotional Support",
    emoji: "💝",
    subtitle: "An ESA — your comfort companion for mental health.",
  },
  {
    slug: "rescue",
    label: "Rescue",
    emoji: "🏠",
    subtitle: "Adopted from a shelter or rescue — they have a home now.",
  },
  {
    slug: "adventurer",
    label: "Adventurer",
    emoji: "🏔️",
    subtitle: "Hikes, camps, road trips, or anywhere outdoors.",
  },
  {
    slug: "royalty",
    label: "Royalty",
    emoji: "👑",
    subtitle: "Spoiled, pampered, treated like the royalty they are.",
  },
  {
    slug: "working",
    label: "Working",
    emoji: "🦺",
    subtitle: "Farm work, herding, hunting, or any active job.",
  },
  {
    slug: "birthday",
    label: "Birthday",
    emoji: "🎂",
    subtitle: "It's their birthday season.",
  },
  {
    slug: "forever_loved",
    label: "Forever Loved",
    emoji: "🌟",
    subtitle: "A tribute to a pet who has passed.",
  },
  {
    slug: "young",
    label: "Young",
    emoji: "🌱",
    subtitle: "In their early life — under ~2 years.",
  },
  {
    slug: "senior",
    label: "Senior",
    emoji: "🌳",
    subtitle: "Wise older soul, often 8+ years.",
  },
  {
    slug: "special_needs",
    label: "Special Needs",
    emoji: "🎗️",
    subtitle:
      "Lives with a disability or chronic condition needing extra care.",
  },
  {
    slug: "foodie",
    label: "Foodie",
    emoji: "🍖",
    subtitle: "Strong food opinions — picky, treat-obsessed, or both.",
  },
  {
    slug: "bff_pair",
    label: "BFF Pair",
    emoji: "💞",
    subtitle: "Inseparably bonded with another pet in your home.",
  },
];

// Lookup table for fast tag → metadata
const IDENTITY_TAGS_BY_SLUG = Object.fromEntries(
  IDENTITY_TAGS.map((t) => [t.slug, t]),
);

// The `young` tag's display label is species-specific. Other tags are static.
function getYoungLabel(species) {
  const s = (species || "").toLowerCase().trim();
  if (s === "dog") return "Puppy";
  if (s === "cat") return "Kitten";
  if (s === "bird") return "Hatchling";
  if (s === "rabbit") return "Bunny";
  return "Little One";
}

// Resolve the display label for any tag given the pet's species.
function getTagLabel(tagSlug, species) {
  if (tagSlug === "young") return getYoungLabel(species);
  return IDENTITY_TAGS_BY_SLUG[tagSlug]?.label || tagSlug;
}

// Which tags have an extension sub-form (Phase B). Order matches IDENTITY_TAGS.
const TAGS_WITH_EXTENSIONS = new Set([
  "champion",
  "service_therapy",
  "rescue",
  "adventurer",
  "foodie",
  "forever_loved",
  "bff_pair",
]);

// =============================================================
// IDENTITY TAGS SECTION
// =============================================================
function IdentityTagsSection({
  pet,
  onUpdate,
  setSaveStatus,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
}) {
  const FORM_ID = "identity-tags";
  const editing = openFormId === FORM_ID;
  const selectedTags = Array.isArray(pet.identity_tags)
    ? pet.identity_tags
    : [];
  const hasTags = selectedTags.length > 0;

  return (
    <>
      {/* Top section: tag picker + selected tag chips display */}
      <div className="pce-subsection">
        <IdentityTagsCard
          formId={FORM_ID}
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
          pet={pet}
          selectedTags={selectedTags}
          onUpdate={onUpdate}
        />
      </div>

      {/* Phase B: each selected tag with extension fields gets its own
          sub-block for entering tag-specific content. Only renders if the
          tag is currently selected AND has extension fields defined. */}
      {selectedTags.includes("rescue") ? (
        <div className="pce-subsection">
          <RescueExtensionCard
            pet={pet}
            onUpdate={onUpdate}
            openFormId={openFormId}
            setOpenFormId={setOpenFormId}
            confirmUnsaved={confirmUnsaved}
          />
        </div>
      ) : null}

      {selectedTags.includes("service_therapy") ||
      selectedTags.includes("emotional_support") ? (
        <div className="pce-subsection">
          {/* ESA and Service/Therapy both use the same extension fields
              (service_type, service_certification, service_organization).
              Showing one extension card for either selection prevents
              duplicate forms and lets users specify their exact role. */}
          <ServiceExtensionCard
            pet={pet}
            onUpdate={onUpdate}
            openFormId={openFormId}
            setOpenFormId={setOpenFormId}
            confirmUnsaved={confirmUnsaved}
          />
        </div>
      ) : null}

      {selectedTags.includes("champion") ? (
        <div className="pce-subsection">
          <ChampionExtensionCard
            pet={pet}
            onUpdate={onUpdate}
            openFormId={openFormId}
            setOpenFormId={setOpenFormId}
            confirmUnsaved={confirmUnsaved}
          />
        </div>
      ) : null}

      {selectedTags.includes("adventurer") ? (
        <div className="pce-subsection">
          <AdventurerExtensionCard
            pet={pet}
            onUpdate={onUpdate}
            openFormId={openFormId}
            setOpenFormId={setOpenFormId}
            confirmUnsaved={confirmUnsaved}
          />
        </div>
      ) : null}

      {selectedTags.includes("foodie") ? (
        <div className="pce-subsection">
          <FoodieExtensionCard
            pet={pet}
            onUpdate={onUpdate}
            openFormId={openFormId}
            setOpenFormId={setOpenFormId}
            confirmUnsaved={confirmUnsaved}
          />
        </div>
      ) : null}

      {selectedTags.includes("forever_loved") ? (
        <div className="pce-subsection">
          <ForeverLovedExtensionCard
            pet={pet}
            onUpdate={onUpdate}
            openFormId={openFormId}
            setOpenFormId={setOpenFormId}
            confirmUnsaved={confirmUnsaved}
          />
        </div>
      ) : null}

      {selectedTags.includes("bff_pair") ? (
        <div className="pce-subsection">
          <BffPairExtensionCard
            pet={pet}
            onUpdate={onUpdate}
            openFormId={openFormId}
            setOpenFormId={setOpenFormId}
            confirmUnsaved={confirmUnsaved}
          />
        </div>
      ) : null}
    </>
  );
}

// =============================================================
// IDENTITY TAGS CARD — view/edit pattern for the main tag picker
// =============================================================
function IdentityTagsCard({
  formId,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
  pet,
  selectedTags,
  onUpdate,
}) {
  const editing = openFormId === formId;
  const hasTags = selectedTags.length > 0;
  const [draft, setDraft] = useState(selectedTags);
  const draftRef = useRef(draft);
  const valueRef = useRef(selectedTags);
  draftRef.current = draft;
  valueRef.current = selectedTags;
  const [cancelled, setCancelled] = useState(false);
  // Tags whose info popovers are currently open. Multiple popovers can be
  // open at once so users can compare tag descriptions side-by-side.
  // Click (i) again or × to close an individual popover.
  const [infoSlugs, setInfoSlugs] = useState(() => new Set());
  // Tags currently animating their popover closed (kept mounted briefly so
  // the close transition can play, then removed). Mirrors the open/close
  // easing the main section collapses have.
  const [closingSlugs, setClosingSlugs] = useState(() => new Set());
  const INFO_ANIM_MS = 300;
  function toggleInfo(slug) {
    setInfoSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
        startClosing(slug);
      } else {
        next.add(slug);
        setClosingSlugs((c) => {
          if (!c.has(slug)) return c;
          const n = new Set(c);
          n.delete(slug);
          return n;
        });
      }
      return next;
    });
  }
  function startClosing(slug) {
    setClosingSlugs((c) => {
      const n = new Set(c);
      n.add(slug);
      return n;
    });
    setTimeout(() => {
      setClosingSlugs((c) => {
        if (!c.has(slug)) return c;
        const n = new Set(c);
        n.delete(slug);
        return n;
      });
    }, INFO_ANIM_MS);
  }
  function closeInfo(slug) {
    setInfoSlugs((prev) => {
      if (!prev.has(slug)) return prev;
      const next = new Set(prev);
      next.delete(slug);
      return next;
    });
    startClosing(slug);
  }

  // Sync draft from value when entering edit mode. Also clear any
  // previously-open info popovers — they should NOT persist across
  // open/close cycles. Whether the user saved, cancelled, or autosaved on
  // close, the next time the picker opens it should start clean.
  useEffect(() => {
    if (editing) {
      setDraft(selectedTags);
      setCancelled(false);
      setInfoSlugs(new Set());
    } else {
      // Also clear when leaving — defensive; ensures state is fresh next open.
      setInfoSlugs(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  // Autosave on close (matches the pattern from Personality TagArrayCard)
  const wasEditingRef = useRef(editing);
  useEffect(() => {
    if (wasEditingRef.current && !editing && !cancelled) {
      const d = draftRef.current;
      const v = valueRef.current;
      const dirty = d.length !== v.length || d.some((t, i) => t !== v[i]);
      if (dirty) {
        onUpdate("identity_tags", d.length === 0 ? null : d);
      }
    }
    wasEditingRef.current = editing;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  function toggleTag(slug) {
    setDraft((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  function handleSave() {
    const v = valueRef.current;
    const dirty = draft.length !== v.length || draft.some((t, i) => t !== v[i]);
    if (dirty) {
      onUpdate("identity_tags", draft.length === 0 ? null : draft);
    }
    setInfoSlugs(new Set());
    setOpenFormId(null);
  }

  async function handleCancel() {
    const dirty =
      draft.length !== selectedTags.length ||
      draft.some((t, i) => t !== selectedTags[i]);
    if (confirmUnsaved && dirty) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return;
      if (choice === "save") {
        handleSave();
        return;
      }
    }
    setCancelled(true);
    setDraft(selectedTags);
    setInfoSlugs(new Set());
    setOpenFormId(null);
  }

  return (
    <>
      <h3 className="pce-sub-title">Tags</h3>
      <p className="pce-sub-sub">
        Tap any that fit. You can pick as many as you'd like.
      </p>

      {hasTags && !editing ? (
        <div className="pce-list">
          <div className="pce-list-item pce-list-item--chips">
            <div className="pce-list-item-body">
              <div className="pce-tag-chips-display">
                {selectedTags.map((slug) => {
                  const tag = IDENTITY_TAGS_BY_SLUG[slug];
                  if (!tag) return null;
                  return (
                    <span
                      key={slug}
                      className="pce-identity-tag-chip pce-identity-tag-chip--display"
                    >
                      <span
                        className="pce-identity-tag-emoji"
                        aria-hidden="true"
                      >
                        {tag.emoji}
                      </span>
                      <span>{getTagLabel(slug, pet.species)}</span>
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="pce-list-item-actions">
              <button
                type="button"
                className="pce-icon-btn"
                onClick={() => setOpenFormId(formId)}
                aria-label="Edit identity tags"
              >
                <Pencil size={EDIT_ICON_SIZE} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!hasTags && !editing ? (
        <div className="pce-list-empty">
          No tags chosen yet. Tap below to pick the ones that describe your pet.
        </div>
      ) : null}

      <Collapse open={editing}>
        <div className="pce-inline-form">
          <button
            type="button"
            className="pce-form-close"
            aria-label="Close"
            onClick={handleCancel}
          >
            <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
          </button>
          <div className="pce-entry-card">
            <div className="pce-field">
              <div className="pce-identity-tag-grid">
                {IDENTITY_TAGS.map((tag) => {
                  const isSelected = draft.includes(tag.slug);
                  const infoOpen = infoSlugs.has(tag.slug);
                  const infoClosing = closingSlugs.has(tag.slug);
                  // Render while open OR while animating closed, so the close
                  // transition can play. `is-open` drives the eased height.
                  const infoMounted = infoOpen || infoClosing;
                  return (
                    <Fragment key={tag.slug}>
                      <div
                        className={`pce-identity-tag-pill${isSelected ? " is-selected" : ""}`}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        onClick={() => toggleTag(tag.slug)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleTag(tag.slug);
                          }
                        }}
                      >
                        <span
                          className="pce-identity-tag-emoji"
                          aria-hidden="true"
                        >
                          {tag.emoji}
                        </span>
                        <span className="pce-identity-tag-label">
                          {getTagLabel(tag.slug, pet.species)}
                        </span>
                        {/* Info button — stop propagation so tapping (i) doesn't
                            toggle the tag selection. Toggles a popover with the
                            tag's description. The visible button is small (20px)
                            but its tap target is 44x44px on mobile via the
                            ::before pseudo-element — see CSS. */}
                        <button
                          type="button"
                          className="pce-identity-tag-info"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleInfo(tag.slug);
                          }}
                          aria-label={`What does ${getTagLabel(tag.slug, pet.species)} mean?`}
                          aria-expanded={infoOpen}
                        >
                          i
                        </button>
                      </div>
                      {infoMounted ? (
                        <div
                          className={`pce-info-collapse${infoOpen ? " is-open" : ""}`}
                          aria-hidden={infoOpen ? undefined : true}
                        >
                          <div className="pce-info-collapse-inner">
                            <div className="pce-identity-tag-info-popover">
                              <button
                                type="button"
                                className="pce-identity-tag-info-popover-close"
                                onClick={() => closeInfo(tag.slug)}
                                aria-label="Close description"
                              >
                                ×
                              </button>
                              <div className="pce-identity-tag-info-popover-title">
                                {getTagLabel(tag.slug, pet.species)}
                              </div>
                              <div className="pce-identity-tag-info-popover-sub">
                                {tag.subtitle}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </Fragment>
                  );
                })}
              </div>
              <p className="pce-field-hint">
                {draft.length === 0
                  ? "Tap any tag to add it."
                  : `${draft.length} selected. Tap to add or remove.`}
              </p>
            </div>
          </div>
          <div className="pce-inline-form-actions">
            <button
              type="button"
              className="pce-btn-secondary"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="pce-btn-primary"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>
      </Collapse>
      {!editing && !hasTags ? (
        <button
          type="button"
          className="pce-add-btn"
          onClick={() => setOpenFormId(formId)}
        >
          <Plus size={16} strokeWidth={2.4} />
          Add identity tags
        </button>
      ) : null}
    </>
  );
}

// =============================================================
// EXTENSION CARDS (Phase B) — each tag's tag-specific fields
// =============================================================
// All follow the same view/edit pattern with autosave-on-close.
// The shared `TagExtensionCardShell` would be the right abstraction here,
// but for readability we keep each one self-contained (different field
// shapes — text vs textarea vs array vs date — would make the shared
// component fork-heavy anyway).

// --- RESCUE extension: org name + rescue story ---
function RescueExtensionCard({
  pet,
  onUpdate,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
}) {
  const formId = "rescue-extension";
  const editing = openFormId === formId;
  const hasValue = Boolean(pet.rescue_organization || pet.rescue_story);
  const [draftOrg, setDraftOrg] = useState(pet.rescue_organization || "");
  const [draftStory, setDraftStory] = useState(pet.rescue_story || "");
  const draftRef = useRef({ draftOrg, draftStory });
  const valueRef = useRef({
    org: pet.rescue_organization || "",
    story: pet.rescue_story || "",
  });
  draftRef.current = { draftOrg, draftStory };
  valueRef.current = {
    org: pet.rescue_organization || "",
    story: pet.rescue_story || "",
  };
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (editing) {
      setDraftOrg(pet.rescue_organization || "");
      setDraftStory(pet.rescue_story || "");
      setCancelled(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const wasEditingRef = useRef(editing);
  useEffect(() => {
    if (wasEditingRef.current && !editing && !cancelled) {
      const d = draftRef.current;
      const v = valueRef.current;
      const newOrg = d.draftOrg.trim();
      const newStory = d.draftStory.trim();
      const dirty = newOrg !== v.org || newStory !== v.story;
      if (dirty) {
        onUpdate({
          rescue_organization: newOrg || null,
          rescue_story: newStory || null,
        });
      }
    }
    wasEditingRef.current = editing;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  function handleSave() {
    onUpdate({
      rescue_organization: draftOrg.trim() || null,
      rescue_story: draftStory.trim() || null,
    });
    setOpenFormId(null);
  }

  async function handleCancel() {
    const dirty =
      draftOrg !== (pet.rescue_organization || "") ||
      draftStory !== (pet.rescue_story || "");
    if (confirmUnsaved && dirty) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return;
      if (choice === "save") {
        handleSave();
        return;
      }
    }
    setCancelled(true);
    setDraftOrg(pet.rescue_organization || "");
    setDraftStory(pet.rescue_story || "");
    setOpenFormId(null);
  }

  return (
    <>
      <h3 className="pce-sub-title">Their story</h3>
      <p className="pce-sub-sub">
        Where did your pet come from? Share their origin.
      </p>

      <Collapse open={!editing}>
        {hasValue ? (
          <div className="pce-list">
            <div className="pce-list-item pce-list-item--prose">
              <div className="pce-list-item-body">
                {pet.rescue_story ? (
                  <p className="pce-list-item-prose">{pet.rescue_story}</p>
                ) : null}
                {pet.rescue_organization ? (
                  <p className="pce-list-item-source">
                    Adopted from: <strong>{pet.rescue_organization}</strong>
                  </p>
                ) : null}
              </div>
              <div className="pce-list-item-actions">
                <button
                  type="button"
                  className="pce-icon-btn"
                  onClick={() => setOpenFormId(formId)}
                  aria-label="Edit their story"
                >
                  <Pencil size={EDIT_ICON_SIZE} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="pce-list-empty">
            No story yet. Share where they came from and their journey.
          </div>
        )}
      </Collapse>

      <Collapse open={editing}>
        <div className="pce-inline-form">
          <button
            type="button"
            className="pce-form-close"
            aria-label="Close"
            onClick={handleCancel}
          >
            <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
          </button>
          <div className="pce-entry-card">
            <div className="pce-field">
              <label className="pce-label">Their story</label>
              <textarea
                className="pce-textarea"
                value={draftStory}
                onChange={(e) => setDraftStory(e.target.value)}
                placeholder="How did you find each other? What was their journey?"
                maxLength={600}
                rows={4}
                autoFocus
              />
            </div>
            <div className="pce-field">
              <label className="pce-label">Who or where they came from</label>
              <input
                type="text"
                className="pce-input"
                value={draftOrg}
                onChange={(e) => setDraftOrg(e.target.value)}
                placeholder="e.g. East Bay SPCA, or a friend, neighbor, breeder…"
                maxLength={120}
              />
            </div>
          </div>
          <div className="pce-inline-form-actions">
            <button
              type="button"
              className="pce-btn-secondary"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="pce-btn-primary"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>
      </Collapse>
      {!editing && !hasValue ? (
        <button
          type="button"
          className="pce-add-btn"
          onClick={() => setOpenFormId(formId)}
        >
          <Plus size={16} strokeWidth={2.4} />
          Add rescue story
        </button>
      ) : null}
    </>
  );
}

// --- SERVICE / THERAPY extension: type + cert + organization ---
function ServiceExtensionCard({
  pet,
  onUpdate,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
}) {
  const formId = "service-extension";
  const editing = openFormId === formId;
  const hasValue = Boolean(
    pet.service_type || pet.service_certification || pet.service_organization,
  );
  const [draftType, setDraftType] = useState(pet.service_type || "");
  const [draftCert, setDraftCert] = useState(pet.service_certification || "");
  const [draftOrg, setDraftOrg] = useState(pet.service_organization || "");
  const draftRef = useRef({ draftType, draftCert, draftOrg });
  const valueRef = useRef({
    type: pet.service_type || "",
    cert: pet.service_certification || "",
    org: pet.service_organization || "",
  });
  draftRef.current = { draftType, draftCert, draftOrg };
  valueRef.current = {
    type: pet.service_type || "",
    cert: pet.service_certification || "",
    org: pet.service_organization || "",
  };
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (editing) {
      setDraftType(pet.service_type || "");
      setDraftCert(pet.service_certification || "");
      setDraftOrg(pet.service_organization || "");
      setCancelled(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const wasEditingRef = useRef(editing);
  useEffect(() => {
    if (wasEditingRef.current && !editing && !cancelled) {
      const d = draftRef.current;
      const v = valueRef.current;
      const newType = d.draftType.trim();
      const newCert = d.draftCert.trim();
      const newOrg = d.draftOrg.trim();
      const dirty =
        newType !== v.type || newCert !== v.cert || newOrg !== v.org;
      if (dirty) {
        onUpdate({
          service_type: newType || null,
          service_certification: newCert || null,
          service_organization: newOrg || null,
        });
      }
    }
    wasEditingRef.current = editing;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  function handleSave() {
    onUpdate({
      service_type: draftType.trim() || null,
      service_certification: draftCert.trim() || null,
      service_organization: draftOrg.trim() || null,
    });
    setOpenFormId(null);
  }

  async function handleCancel() {
    const dirty =
      draftType !== (pet.service_type || "") ||
      draftCert !== (pet.service_certification || "") ||
      draftOrg !== (pet.service_organization || "");
    if (confirmUnsaved && dirty) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return;
      if (choice === "save") {
        handleSave();
        return;
      }
    }
    setCancelled(true);
    setDraftType(pet.service_type || "");
    setDraftCert(pet.service_certification || "");
    setDraftOrg(pet.service_organization || "");
    setOpenFormId(null);
  }

  return (
    <>
      <h3 className="pce-sub-title">Service, therapy, or ESA details</h3>
      <p className="pce-sub-sub">
        What role does your pet serve? Add cert or registration info if
        applicable.
      </p>

      <Collapse open={!editing}>
        {hasValue ? (
          <div className="pce-list">
            <div className="pce-list-item">
              <div className="pce-list-item-body">
                <ul className="pce-list-item-meta pce-list-item-meta--vet-history">
                  {pet.service_type ? (
                    <li className="pce-list-item-meta-row">
                      <span className="pce-list-item-meta-label">Role:</span>
                      <span className="pce-list-item-meta-value">
                        {pet.service_type}
                      </span>
                    </li>
                  ) : null}
                  {pet.service_organization ? (
                    <li className="pce-list-item-meta-row">
                      <span className="pce-list-item-meta-label">Org:</span>
                      <span className="pce-list-item-meta-value">
                        {pet.service_organization}
                      </span>
                    </li>
                  ) : null}
                  {pet.service_certification ? (
                    <li className="pce-list-item-meta-row">
                      <span className="pce-list-item-meta-label">Cert:</span>
                      <span className="pce-list-item-meta-value">
                        {pet.service_certification}
                      </span>
                    </li>
                  ) : null}
                </ul>
              </div>
              <div className="pce-list-item-actions">
                <button
                  type="button"
                  className="pce-icon-btn"
                  onClick={() => setOpenFormId(formId)}
                  aria-label="Edit service details"
                >
                  <Pencil size={EDIT_ICON_SIZE} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="pce-list-empty">No service details yet.</div>
        )}
      </Collapse>

      <Collapse open={editing}>
        <div className="pce-inline-form">
          <button
            type="button"
            className="pce-form-close"
            aria-label="Close"
            onClick={handleCancel}
          >
            <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
          </button>
          <div className="pce-entry-card">
            <div className="pce-field">
              <label className="pce-label">Role</label>
              <input
                type="text"
                className="pce-input"
                value={draftType}
                onChange={(e) => setDraftType(e.target.value)}
                placeholder="e.g. Therapy dog, Service dog, ESA"
                maxLength={80}
                autoFocus
              />
            </div>
            <div className="pce-field">
              <label className="pce-label">Organization</label>
              <input
                type="text"
                className="pce-input"
                value={draftOrg}
                onChange={(e) => setDraftOrg(e.target.value)}
                placeholder="e.g. Therapy Dogs International"
                maxLength={120}
              />
            </div>
            <div className="pce-field">
              <label className="pce-label">Certification number</label>
              <input
                type="text"
                className="pce-input"
                value={draftCert}
                onChange={(e) => setDraftCert(e.target.value)}
                placeholder="Cert or registration number"
                maxLength={80}
              />
            </div>
          </div>
          <div className="pce-inline-form-actions">
            <button
              type="button"
              className="pce-btn-secondary"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="pce-btn-primary"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>
      </Collapse>
      {!editing && !hasValue ? (
        <button
          type="button"
          className="pce-add-btn"
          onClick={() => setOpenFormId(formId)}
        >
          <Plus size={16} strokeWidth={2.4} />
          Add service details
        </button>
      ) : null}
    </>
  );
}

// --- CHAMPION extension: competitions[] + titles[] (TagInput) ---
function ChampionExtensionCard({
  pet,
  onUpdate,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
}) {
  return (
    <>
      <h3 className="pce-sub-title">Championship details</h3>
      <div className="pce-subsection pce-subsection--nested">
        <TagArrayCard
          formId="champion-competitions"
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
          value={pet.competitions_won}
          fieldName="competitions_won"
          onUpdate={onUpdate}
          title="Competitions won"
          subtitle="What events have they placed in?"
          placeholder="e.g. AKC National Agility, Westminster"
          headingLevel="label"
        />
      </div>
      <div className="pce-subsection pce-subsection--nested">
        <TagArrayCard
          formId="champion-titles"
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
          value={pet.titles_earned}
          fieldName="titles_earned"
          onUpdate={onUpdate}
          title="Titles earned"
          subtitle="Formal titles, certifications, or honors."
          placeholder="e.g. CGC, MACH, Best in Show"
          headingLevel="label"
        />
      </div>
    </>
  );
}

// --- ADVENTURER extension: trails[] + places[] (TagInput) ---
function AdventurerExtensionCard({
  pet,
  onUpdate,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
}) {
  return (
    <>
      <h3 className="pce-sub-title">Adventure log</h3>
      <div className="pce-subsection pce-subsection--nested">
        <TagArrayCard
          formId="adventurer-trails"
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
          value={pet.favorite_trails}
          fieldName="favorite_trails"
          onUpdate={onUpdate}
          title="Favorite trails"
          subtitle="Where do they love to hike?"
          placeholder="e.g. Redwood Regional, Tilden Park"
          headingLevel="label"
        />
      </div>
      <div className="pce-subsection pce-subsection--nested">
        <TagArrayCard
          formId="adventurer-places"
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
          value={pet.places_visited}
          fieldName="places_visited"
          onUpdate={onUpdate}
          title="Places visited"
          subtitle="Notable trips or travel destinations."
          placeholder="e.g. Yosemite, Big Sur, Lake Tahoe"
          headingLevel="label"
        />
      </div>
    </>
  );
}

// --- FOODIE extension: favorite_foods[] + food_quirks text ---
function FoodieExtensionCard({
  pet,
  onUpdate,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
}) {
  return (
    <>
      <h3 className="pce-sub-title">Food preferences</h3>
      <div className="pce-subsection pce-subsection--nested">
        <TagArrayCard
          formId="foodie-favorites"
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
          value={pet.favorite_foods}
          fieldName="favorite_foods"
          onUpdate={onUpdate}
          title="Favorite foods"
          subtitle="What do they go crazy for?"
          placeholder="e.g. blueberries, salmon skin, cheese"
          headingLevel="label"
        />
      </div>
      <div className="pce-subsection pce-subsection--nested">
        <TextareaCard
          formId="foodie-quirks"
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
          value={pet.food_quirks}
          fieldName="food_quirks"
          onUpdate={onUpdate}
          title="Food quirks"
          subtitle="Write a sentence or two — picky habits, weird preferences, or allergies to remember."
          placeholder="e.g. Won't eat unless the food is in his blue bowl, and he's allergic to chicken."
          maxLength={300}
          rows={3}
          headingLevel="label"
        />
      </div>
    </>
  );
}

// --- FOREVER LOVED extension: passing_date + memorial_message ---
// Emotionally sensitive — keep copy warm and gentle.
function ForeverLovedExtensionCard({
  pet,
  onUpdate,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
}) {
  const formId = "memorial-extension";
  const editing = openFormId === formId;
  const hasValue = Boolean(
    pet.passing_date || pet.memorial_message || pet.birth_date,
  );
  const [draftDate, setDraftDate] = useState(pet.passing_date || "");
  const [draftBirth, setDraftBirth] = useState(pet.birth_date || "");
  const [draftMsg, setDraftMsg] = useState(pet.memorial_message || "");
  const draftRef = useRef({ draftDate, draftBirth, draftMsg });
  const valueRef = useRef({
    date: pet.passing_date || "",
    birth: pet.birth_date || "",
    msg: pet.memorial_message || "",
  });
  draftRef.current = { draftDate, draftBirth, draftMsg };
  valueRef.current = {
    date: pet.passing_date || "",
    birth: pet.birth_date || "",
    msg: pet.memorial_message || "",
  };
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (editing) {
      setDraftDate(pet.passing_date || "");
      setDraftBirth(pet.birth_date || "");
      setDraftMsg(pet.memorial_message || "");
      setCancelled(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const wasEditingRef = useRef(editing);
  useEffect(() => {
    if (wasEditingRef.current && !editing && !cancelled) {
      const d = draftRef.current;
      const v = valueRef.current;
      const newDate = d.draftDate || null;
      const newBirth = d.draftBirth || null;
      const newMsg = d.draftMsg.trim();
      // Don't persist an impossible range (born after passing).
      const invalid = newBirth && newDate && newBirth > newDate;
      const dirty =
        newDate !== (v.date || null) ||
        newBirth !== (v.birth || null) ||
        newMsg !== v.msg;
      if (dirty && !invalid) {
        onUpdate({
          birth_date: newBirth,
          passing_date: newDate,
          memorial_message: newMsg || null,
        });
      }
    }
    wasEditingRef.current = editing;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  function handleSave() {
    const today = new Date().toISOString().slice(0, 10);
    // Block only the impossible case: born after they passed. (Dates in the
    // future are already prevented by the inputs' max attribute.)
    if (draftBirth && draftDate && draftBirth > draftDate) return;
    onUpdate({
      birth_date: draftBirth || null,
      passing_date: draftDate || null,
      memorial_message: draftMsg.trim() || null,
    });
    setOpenFormId(null);
  }

  async function handleCancel() {
    const dirty =
      draftDate !== (pet.passing_date || "") ||
      draftBirth !== (pet.birth_date || "") ||
      draftMsg !== (pet.memorial_message || "");
    if (confirmUnsaved && dirty) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return;
      if (choice === "save") {
        handleSave();
        return;
      }
    }
    setCancelled(true);
    setDraftDate(pet.passing_date || "");
    setDraftBirth(pet.birth_date || "");
    setDraftMsg(pet.memorial_message || "");
    setOpenFormId(null);
  }

  return (
    <>
      <h3 className="pce-sub-title">In loving memory</h3>
      <p className="pce-sub-sub">
        A space to honor them. Whatever you want to share is enough.
      </p>

      <Collapse open={!editing}>
        {hasValue ? (
          <div className="pce-list">
            <div className="pce-list-item pce-list-item--prose">
              <div className="pce-list-item-body">
                {pet.birth_date && pet.passing_date ? (
                  <p className="pce-list-item-title pce-list-title-memory">
                    {formatPetDate(pet.birth_date)} –{" "}
                    {formatPetDate(pet.passing_date)}
                  </p>
                ) : pet.passing_date ? (
                  <p className="pce-list-item-title">
                    Passed {formatPetDate(pet.passing_date)}
                  </p>
                ) : pet.birth_date ? (
                  <p className="pce-list-item-title">
                    Born {formatPetDate(pet.birth_date)}
                  </p>
                ) : null}
                {pet.memorial_message ? (
                  <p className="pce-list-item-prose">{pet.memorial_message}</p>
                ) : null}
              </div>
              <div className="pce-list-item-actions">
                <button
                  type="button"
                  className="pce-icon-btn"
                  onClick={() => setOpenFormId(formId)}
                  aria-label="Edit memorial"
                >
                  <Pencil size={EDIT_ICON_SIZE} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="pce-list-empty">
            No memorial details added yet. There's no wrong way to do this — say
            as much or as little as feels right.
          </div>
        )}
      </Collapse>

      <Collapse open={editing}>
        <div className="pce-inline-form">
          <button
            type="button"
            className="pce-form-close"
            aria-label="Close"
            onClick={handleCancel}
          >
            <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
          </button>
          <div className="pce-entry-card">
            <div className="pce-field">
              <label className="pce-label">
                Date of birth{" "}
                <span className="pce-label-optional">(optional)</span>
              </label>
              <input
                type="date"
                className="pce-input"
                value={draftBirth}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDraftBirth(e.target.value)}
              />
            </div>
            <div className="pce-field">
              <label className="pce-label">Date they passed</label>
              <input
                type="date"
                className="pce-input"
                value={draftDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDraftDate(e.target.value)}
              />
              {draftBirth && draftDate && draftBirth > draftDate ? (
                <p className="pce-field-error">
                  Please double-check these dates — the date of birth comes
                  after the date they passed.
                </p>
              ) : null}
            </div>
            <div className="pce-field">
              <label className="pce-label">Memorial message</label>
              <textarea
                className="pce-textarea"
                value={draftMsg}
                onChange={(e) => setDraftMsg(e.target.value)}
                placeholder="A favorite memory, a tribute, or anything you want their card to say."
                maxLength={600}
                rows={4}
                autoFocus
              />
            </div>
          </div>
          <div className="pce-inline-form-actions">
            <button
              type="button"
              className="pce-btn-secondary"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="pce-btn-primary"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>
      </Collapse>
      {!editing && !hasValue ? (
        <button
          type="button"
          className="pce-add-btn"
          onClick={() => setOpenFormId(formId)}
        >
          <Plus size={16} strokeWidth={2.4} />
          Add memorial
        </button>
      ) : null}
    </>
  );
}

// --- BFF PAIR extension: bonded_pet_id (picker from user's other pets) ---
// Stub for MVP — full pet-picker UX (loads all user pets, picker dropdown,
// reverse linkage) is a polish item. For now we show a placeholder that
// explains the feature is coming.
function BffPairExtensionCard({
  pet,
  onUpdate,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
}) {
  return (
    <>
      <h3 className="pce-sub-title">Bonded pair</h3>
      <p className="pce-sub-sub">
        Link to their inseparable partner — coming in the next update.
      </p>
      <div className="pce-list-empty">
        Pet-to-pet bonding is being designed. For now, mention their BFF in
        Personality → Fun fact.
      </div>
    </>
  );
}

// Format an ISO date string for display ("Jan 15, 2025").
// If parsing fails, returns the original string.
function formatPetDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ---- TextareaCard (duplicated; also used by Care Editor) ----
function TextareaCard({
  formId,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
  value,
  fieldName,
  onUpdate,
  title,
  subtitle,
  placeholder,
  maxLength = 500,
  rows = 3,
  emptyPrompt,
  icon: Icon,
  // See TagArrayCard for explanation of headingLevel.
  headingLevel = "section",
}) {
  const editing = openFormId === formId;
  const hasValue = value && value.trim().length > 0;
  const [draft, setDraft] = useState(value || "");
  // Track whether the user explicitly cancelled this session — if so, we
  // suppress the autosave-on-close behavior so cancellation actually discards.
  const [cancelled, setCancelled] = useState(false);
  const draftRef = useRef(draft);
  const valueRef = useRef(value);
  draftRef.current = draft;
  valueRef.current = value;

  // Sync draft from value when entering edit mode (covers re-opens after autosave)
  useEffect(() => {
    if (editing) {
      setDraft(value || "");
      setCancelled(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  // Autosave on close: when this form transitions from open → closed (because
  // a DIFFERENT form opened, or user navigated away), commit any pending draft
  // changes. Skipped if the user explicitly clicked Cancel.
  const wasEditingRef = useRef(editing);
  useEffect(() => {
    if (wasEditingRef.current && !editing && !cancelled) {
      const draftTrimmed = (draftRef.current || "").trim();
      const valueTrimmed = (valueRef.current || "").trim();
      if (draftTrimmed !== valueTrimmed) {
        onUpdate(fieldName, draftTrimmed || null);
      }
    }
    wasEditingRef.current = editing;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  function handleSave() {
    const next = draft.trim();
    if (next !== (value || "")) {
      onUpdate(fieldName, next || null);
    }
    setOpenFormId(null);
  }

  async function handleCancel() {
    if (confirmUnsaved && draft.trim() !== (value || "")) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return;
      if (choice === "save") {
        handleSave();
        return;
      }
    }
    setCancelled(true);
    setDraft(value || "");
    setOpenFormId(null);
  }

  return (
    <>
      {headingLevel === "label" ? (
        <h4 className="pce-field-heading">{title}</h4>
      ) : (
        <h3 className="pce-sub-title">{title}</h3>
      )}
      {subtitle ? <p className="pce-sub-sub">{subtitle}</p> : null}

      <Collapse open={!editing}>
        {hasValue ? (
          <div className="pce-list">
            <div className="pce-list-item pce-list-item--single">
              <div className="pce-list-item-body">
                <div className="pce-list-item-title-row pce-list-item-title-row--prose">
                  {Icon ? (
                    <span className="pce-list-item-icon-inline">
                      <Icon size={18} strokeWidth={2} />
                    </span>
                  ) : null}
                  <p className="pce-list-item-prose">{value}</p>
                </div>
              </div>
              <div className="pce-list-item-actions">
                <button
                  type="button"
                  className="pce-icon-btn"
                  onClick={() => setOpenFormId(formId)}
                  aria-label={`Edit ${title.toLowerCase()}`}
                >
                  <Pencil size={EDIT_ICON_SIZE} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="pce-list-empty">
            {emptyPrompt || `No ${title.toLowerCase()} on file.`}
          </div>
        )}
      </Collapse>

      <Collapse open={editing}>
        <div className="pce-inline-form">
          <button
            type="button"
            className="pce-form-close"
            aria-label="Close"
            onClick={handleCancel}
          >
            <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
          </button>
          <div className="pce-entry-card">
            <div className="pce-field">
              <textarea
                className="pce-textarea"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={placeholder}
                maxLength={maxLength}
                rows={rows}
                autoFocus
              />
            </div>
          </div>
          <div className="pce-inline-form-actions">
            <button
              type="button"
              className="pce-btn-secondary"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="pce-btn-primary"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>
      </Collapse>
      {!editing && !hasValue ? (
        // Only show the "+ Add X" button when there is no value yet. When a
        // value exists, the pencil icon on the view-mode card is the canonical
        // edit affordance — a separate "+ Edit X" button below would be a
        // redundant and contradictory affordance (the + icon means "add").
        // Same pattern as PrimaryVetBlock / EmergencyVetBlock / InsuranceBlock.
        <button
          type="button"
          className="pce-add-btn"
          onClick={() => setOpenFormId(formId)}
        >
          <Plus size={16} strokeWidth={2.4} />
          Add {title.toLowerCase()}
        </button>
      ) : null}
    </>
  );
}

function SaveIndicator({ status }) {
  if (status === "idle") return null;
  if (status === "saving") {
    return (
      <div className="he-save-toast saving" role="status">
        <Loader2 size={14} strokeWidth={2.2} className="he-spin" />
        Saving…
      </div>
    );
  }
  if (status === "saved") {
    return (
      <div className="he-save-toast saved" role="status">
        <Check size={14} strokeWidth={2.4} />
        Saved
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="he-save-toast error" role="alert">
        Couldn&apos;t save — please retry
      </div>
    );
  }
  return null;
}

const heroEditorCss = `
  /* Reserve scrollbar space so opening a modal (which locks scroll) doesn't
     shift the page left/right. */
  html { scrollbar-gutter: stable; }
  .he-stage {
    --navy:#172531; --terracotta:#CF5C36; --terracotta-dark:#A8471D;
    --cream:#F5F0E8; --border:#EDE8E0; --muted:#717A86; --slate:#4B5563;
    /* Control outlines — inputs, selects, chips, option tiles. Matches
       the Care Editor, which uses this same value for .pce-input. It is
       a cooler grey than --border, which stays the divider and card-edge
       color. */
    /* --control-border is NOT declared here on purpose: it comes from
       globals.css so every page shares one value. */
    --gold:#EFC88B; --success:#1A6641; --error:#C94040;
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
    color: var(--navy); background: var(--cream); min-height: 100vh;
    padding: 0 0 80px;
  }
  .he-container { max-width: 760px !important; }
  .he-head { margin-bottom: 22px; position: relative; }
  .he-back { display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:700; color:var(--terracotta); text-decoration:none; margin-bottom:24px; }
  .he-back:hover { color: var(--navy); }
  .he-head-row { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; padding-top: 8px; }
  .he-eyebrow { font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:var(--terracotta); margin:0 0 6px; }
  .he-title { font-size:30px; font-weight:800; letter-spacing:-0.02em; margin:0 0 6px; line-height:1.1; }
  .he-sub { font-size:15px; font-weight:500; color:var(--slate); margin:0; }

  /* "View Hero Card" — header pill + bottom CTA. Same action, same treatment,
     and now the same size: the header one was 40.8px against the CTA's 47, and
     two sizes for one action reads as an accident rather than a hierarchy. */
  .he-viewcard-pill {
    display:inline-flex; align-items:center; gap:7px; margin-top:12px;
    min-height:44px; padding:0 22px; border:var(--pill-border-w, 2px) solid var(--terracotta); border-radius:999px;
    color:var(--terracotta); font-size:15px; font-weight:700; text-decoration:none;
    background:transparent; transition:background 0.15s, color 0.15s;
  }
  .he-viewcard-pill:hover { background:var(--terracotta); color:#fff; }
  .he-viewcard-cta {
    display:flex; flex-direction:column; align-items:center; gap:10px;
    margin-top:8px; padding:24px 0 8px; border-top:1px solid var(--border); text-align:center;
  }
  .he-viewcard-cta-label { font-size:15px; font-weight:500; color:var(--slate); margin:0; }
  .he-viewcard-cta-btn {
    display:inline-flex; align-items:center; gap:7px;
    min-height:44px; padding:0 22px; border-radius:999px;
    border:var(--pill-border-w, 2px) solid var(--terracotta); background:transparent; color:var(--terracotta);
    font-size:15px; font-weight:700; text-decoration:none;
    transition:background 0.15s, color 0.15s;
  }
  .he-viewcard-cta-btn:hover { background:var(--terracotta); color:#fff; border-color:var(--terracotta); }

  /* Back-to-top — identical look to the care pages' .pcc-scrolltop. */
  .he-scrolltop {
    position:fixed; 
    right:20px; 
    bottom:20px; 
    z-index:30;
    width:44px; 
    height:44px; 
    border-radius:9999px; 
    border:none;
    background:var(--navy); 
    color:#fff; 
    display:inline-flex; 
    align-items:center; 
    justify-content:center;
    cursor:pointer;
     box-shadow:0 6px 20px rgba(23,37,49,0.28); 
     transition:background 0.15s, transform 0.15s;
     box-shadow: 0 6px 20px rgba(23,37,49,0.28), 0 0 0 2px rgba(255,255,255,0.9);
  }
  .he-scrolltop:hover { background:#0f1a24; transform:translateY(-2px); }
  .he-preview { flex-shrink:0; white-space:nowrap; }
  .he-save-toast { position:fixed; right:24px; bottom:24px; z-index:50; display:inline-flex; align-items:center; gap:8px; padding:10px 16px; background:#fff; border-radius:9999px; box-shadow:0 8px 24px rgba(23,37,49,0.18), 0 0 0 1px rgba(23,37,49,0.06); font-size:14px; font-weight:600; color:var(--muted); animation:he-toast-in 0.18s ease-out; }
  .he-save-toast.saved { color:#1A6641; }
  .he-save-toast.error { color:#C94040; }
  @keyframes he-toast-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  .he-spin { animation:he-spin 0.9s linear infinite; }
  @keyframes he-spin { to { transform:rotate(360deg); } }

  .he-card-section { position:relative; background:#fff; border:1px solid var(--border); border-radius:18px; padding:20px; margin-bottom:18px; transition:border-color 0.2s, box-shadow 0.2s, background 0.2s; }
  /* Distinct EDIT MODE: highlighted terracotta border + warm tint so it's
     unmistakable which section you're actively editing. */
  .he-card-section.is-editing {
    border-color:var(--terracotta);
    box-shadow:0 0 0 3px rgba(207,92,54,0.12);
    background:#FFFCFA;
  }
  /* view/edit pattern (matches Care Editor) */
  .he-sec-head-row { display:flex; justify-content:space-between; align-items:flex-start; gap:14px; }
  .he-edit-btn { 
    /* Was 22px. Padding grows the target; the negative margin keeps the
       pencil sitting where it did next to the title. */
    flex-shrink:0; 
    background:transparent; 
    border:none; 
    border-radius:8px; 
    color: var(--color-muted, #717A86); 
    cursor:pointer; 
    display:flex; 
    align-items:flex-start; 
    justify-content:center; 
    padding:11px; 
    margin:-7px; 
    transition:background 0.15s, color 0.15s; 
  }
  .he-edit-btn:hover { background:rgba(23,37,49,0.06); color:var(--navy); border-color:rgba(23,37,49,0.18); }
  .he-display {
    position:static;
    // margin-top:4px;
    background:#fff;
    border:1px solid var(--border);
    border-radius:12px;
    padding:15px 15px;
    box-shadow:0 1px 3px rgba(23,37,49,0.04);
  }
  /* Top sections wrap display+edit in <Collapse>; its inner element has a
     transform that would trap the absolute pencil/X inside the editor box.
     Neutralize it so the controls anchor to the SECTION corner (opposite the
     title), matching the sub-sections below. */
  .he-card-section > .he-collapse > .he-collapse-inner {
    transform: none !important;
  }
  /* clear room for the inset pencil so content never crowds it */
  // .he-display > .he-display-stats,
  // .he-display > .he-rarity-current,
  // .he-display > .he-display-design,
  // .he-display > .he-display-value,
  // .he-display > .he-display-empty { 
  //   padding-right:34px;
  // }
  /* Edit pencil anchored to the SECTION top-right corner (opposite the title) */
  .he-edit-btn--inset {
    position:absolute;
    top:20px;
    right:20px;
    z-index:4;
  }
  /* X close (edit mode) anchors to the EXACT same section corner as the
     pencil, so toggling swaps pencil<->X in place across every section. */
  .he-body-edit-row {
    position:absolute;
    top:20px;
    right:20px;
    z-index:4;
    margin:0;
  }
  // .he-display-value, .he-display-empty { 
  //   padding-right:32px;
  // }
  .he-display-value { font-size:16px; font-weight:500; color: var(--color-navy-dark, #172531); margin:0; }
  .he-display-empty { font-size:15px; font-weight:500; font-style:italic; color:var(--muted); margin:0; }
  .he-display-pill { display:inline-flex; align-items:center; gap:6px; padding:6px 13px; border-radius:999px; color:#fff; font-size:12px; font-weight:800; letter-spacing:0.06em; text-transform:uppercase;
    background-image: linear-gradient(160deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 40%), linear-gradient(340deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0) 50%);
    box-shadow: inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.22), 0 2px 5px rgba(0,0,0,0.16);
    text-shadow: 0 1px 1px rgba(0,0,0,0.25); }
  /* Rarity view state: pill + tier description side by side, so the content card
     isn't a lonely pill in a big box. */
  .he-rarity-current { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
  .he-rarity-current-desc { font-size:16px; font-weight:600; color:var(--slate,#4B5563); }
  .he-rarity-clear { 
    margin: 20px 5px 0; 
    background:none; 
    border:none; 
    color:var(--terracotta); 
    font-size:14px; 
    font-weight:700; 
    text-decoration:underline;
    text-underline-offset: 2px;
    text-decoration-thickness: 1.5px;
    cursor:pointer; 
    font-family:inherit; 
  }
  .he-rarity-clear:hover { 
    color:var(--navy); 
  }
  .he-display-stats { display:flex; flex-wrap:wrap; gap:8px; }
  .he-display-stat { display:inline-flex; align-items:center; padding:6px 12px; background:var(--cream); border:var(--pill-border-w, 2px) solid var(--control-border); border-radius:999px; font-size:14px; font-weight:700; color:var(--navy); }
  .he-display-theme { display:inline-flex; align-items:center; gap:10px; font-size:15px; font-weight:600; color:var(--navy); }
  .he-display-swatch { width:32px; height:22px; border-radius:7px; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.08); }
  .he-edit-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:20px; }
  /* The Card Design section ends with the Lighting & effects panel; give its
     Save/Cancel a divider above and extra breathing room (matching how the
     other sections separate their actions). */
  .he-edit-actions--design {
    border-top:1px solid var(--border,#EDE8E0);
    margin-top:28px;
    padding-top:20px;
  }
  .he-btn-sm { height:42px; min-width:90px; padding:0 24px; font-size:15px; border-radius:12px; }

  /* persistent action bar */
  /* sticky top action bar — sits under the site nav, above editor content */
  .he-actionbar { position:sticky; top:64px; z-index:40; background:rgba(255,255,255,0.94); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); border-bottom:1px solid var(--border); box-shadow:0 4px 16px rgba(23,37,49,0.05); }
  .he-actionbar-inner { max-width:760px; margin:0 auto; padding:12px 20px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:nowrap; }
  .he-actionbar-status { display:flex; align-items:flex-start; gap:12px; min-height:24px; flex:1 1 auto; min-width:0; }
  .he-actionbar-status > span { overflow:visible; }
  .he-actionbar-actions { display:flex; align-items:center; gap:10px; flex:0 0 auto; }
  /* Publish/unpublish toggle — iOS-style switch, matching the Share page's
     pce-toggle. ON (terracotta) = published/live; OFF (grey) = draft. */
  .he-pubtoggle-wrap { display:inline-flex; align-items:center; gap:8px; }
  .he-pubtoggle-label { font-size:13px; font-weight:700; color:var(--navy); white-space:nowrap; min-width:73px; text-align:right; }
  .he-pubtoggle {
    position:relative; width:44px; height:26px; border-radius:999px; border:none;
    background:#C7CDD4; cursor:pointer; padding:0; flex:0 0 auto; transition:background 0.18s;
  }
  .he-pubtoggle.is-on { background:var(--terracotta); }
  .he-pubtoggle:disabled { cursor:default; opacity:0.7; }
  .he-pubtoggle-knob {
    position:absolute; top:3px; left:3px; width:20px; height:20px; border-radius:50%;
    background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.25);
    display:flex; align-items:center; justify-content:center; color:var(--terracotta);
    transition:transform 0.18s;
  }
  .he-pubtoggle.is-on .he-pubtoggle-knob { transform:translateX(18px); }
  .he-pub-dot { font-size:13px; font-weight:600; color:#B8860B; white-space:nowrap; display:flex; align-items:flex-start; gap:8px; }
  .he-pub-live { font-size:13px; font-weight:600; color:var(--success); white-space:nowrap; display:flex; align-items:flex-start; gap:8px; }
  /* Two-line stacked status: bold main label on top, muted detail below. Same
     on every viewport — no truncation, no wrapping, no misleading short form. */
  .he-status-stack { display:inline-flex; flex-direction:column; line-height:1.25; gap:1px; white-space:normal; }
  .he-status-main { font-size:15px; font-weight:700; white-space:nowrap; }
  .he-status-detail { font-size:13px; font-weight:500; opacity:1; white-space:nowrap; }
  .he-btn-primary:disabled { opacity:0.5; cursor:not-allowed; background:var(--terracotta); color:#fff; border-color:var(--terracotta); }
  /* breathing room between the sticky bar and the back button below it */
  .he-actionbar + .he-container { padding-top:32px; }
  .he-sec-head { margin-bottom:16px; }
  .he-sec-head h2 { font-size:18px; font-weight:800; margin:0 0 4px; display:flex; align-items:center; gap:7px; }
  .he-sec-head h2 svg { color:var(--terracotta); }
  .he-sec-head p { font-size:16px; font-weight:500; color:var(--muted); margin:0; line-height: 1.6;}

  /* Collapsible section toggle — mirrors Care's pce-section-toggle. The whole
     header is a clean full-width button: title block left, caret right. Reuses
     the exact he-sec-head h2/p look so an expanded section is visually identical
     to the original static header. */
  .he-sec-toggle {
    display:flex; align-items:flex-start; justify-content:space-between; gap:16px;
    width:100%; background:none; border:none; padding:0; margin:0 0 16px;
    cursor:pointer; text-align:left; font:inherit; color:inherit;
    -webkit-tap-highlight-color:transparent;
  }
  .he-section--collapsible:not(.is-open) .he-sec-toggle { margin-bottom:0; }
  .he-sec-toggle-text { display:flex; flex-direction:column; min-width:0; }
  .he-sec-toggle-title {
    font-size:18px; font-weight:800; letter-spacing:-0.01em; margin:0 0 4px;
    display:flex; align-items:center; gap:7px; color:var(--navy);
  }
  .he-sec-toggle-title svg { color:var(--terracotta); }
  .he-sec-toggle-sub { font-size:14px; font-weight:500; color:var(--muted); margin:0; }
  .he-sec-caret {
    flex-shrink:0; margin-top:5px; color:var(--muted);
    transition:transform 0.3s cubic-bezier(0.33,1,0.68,1);
  }
  .he-section--collapsible.is-open .he-sec-caret { transform:rotate(180deg); }
  .he-expand-all-row { display:flex; justify-content:flex-end; margin-bottom:12px; }
  .he-expand-all-btn {
    background:none; border:var(--pill-border-w, 2px) solid var(--control-border); border-radius:9999px;
    padding:6px 14px; font-size:13px; font-weight:600; color:var(--slate,#4B5563);
    cursor:pointer; font-family:inherit; transition:background 0.15s, color 0.15s;
  }
  .he-expand-all-btn:hover { background:#F5F0E8; color:var(--navy); border-color:var(--navy); }
  /* Edit pencil relocated into the body — small inline control above content */

  /* Option A: bordered content card wrapping each section's content, matching the
     pce-list-item treatment used by the Personality/Tags sections so all sections
     are visually consistent. */
  .he-content-card {
    background:#fff; border:1px solid var(--border); border-radius:12px;
    padding:18px 20px; box-shadow:0 2px 12px rgba(23,37,49,0.07);
  }
  .he-content-card + .he-content-card { margin-top:12px; }

  .he-field { }
  .he-input { width:100%; height:44px; padding: 0 14px; border:var(--pill-border-w, 2px) solid var(--control-border); border-radius:12px; font-family:inherit; font-size:15px; font-weight:500; color:var(--navy); background:#fff; box-sizing:border-box; }
  .he-textarea { height:auto; min-height:64px; padding:12px 16px; line-height:1.5; resize:vertical; }
  .he-input:focus { outline:none; border-color:var(--terracotta); }
  .he-field-foot { 
    display:flex; 
    justify-content:space-between; 
    align-items:center; 
    }

  .he-field-foot-title {
    margin-top: 7px;
  }
  .he-hint { font-size:14px; font-weight:500; color:var(--muted); }
  .he-count { font-size:13px; font-weight:500; color:#717A86; }
  .he-count.is-max { color:#CF5C36; font-weight:600; }

  /* rarity */
  .he-rarity-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top: 3px; padding: 0 3px; }
  /* Centred: the labels and descriptions are short enough to hold, and the
     symmetry reads better than a left edge with a dot floating above it.
     "One in a million" is the longest description and the one to watch
     if a third column ever gets narrower. */
  .he-rarity-opt { display:flex; flex-direction:column; align-items:center; gap:6px; padding:13px; background:#fff; border:var(--pill-border-w, 2px) solid var(--control-border); border-radius:13px; cursor:pointer; font-family:inherit; text-align:center; transition:border-color 0.15s; }
  .he-rarity-opt:hover { border-color:var(--muted); }
  /* 22px holding a 14px mark read as a bullet rather than a badge. 32px
     keeps the same inset-highlight treatment with room for the icon. */
  .he-rarity-dot { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;
    background-image: linear-gradient(145deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 42%), linear-gradient(320deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0) 45%);
    box-shadow: inset 0 1px 1px rgba(255,255,255,0.6), inset 0 -2px 3px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.18); }
  .he-rarity-label { font-size:16px; font-weight:800; color:var(--navy); }
  .he-rarity-desc { font-size:14px; font-weight:500; color:var(--muted); }

  /* stats */
  /* ---- SHARED stat styling (visual only; layout lives in breakpoint zones) ---- */
  .he-stat-list { display:flex; flex-direction:column; }
  .he-stat-row { display:flex; flex-direction:column; }
  .he-stat-main { display:flex; }
  .he-stat-field { display:flex; flex-direction:column; min-width:0; }
  .he-stat-sub { display:flex; align-items:center; justify-content:space-between; }
  .he-stat-sub-left { display:flex; align-items:center; }
  /* emoji picker popover */
  .he-emoji { position:relative; flex:0 0 auto; }
  .he-emoji-trigger { height:42px; width:48px; border:var(--pill-border-w, 2px) solid var(--control-border); border-radius:10px; font-size:20px; line-height:1; text-align:center; background:#fff; cursor:pointer; font-family:inherit; display:flex; align-items:center; justify-content:center; }
  .he-emoji-trigger:hover { border-color:var(--terracotta); }
  .he-emoji-pop { position:absolute; top:48px; left:0; z-index:30; width:280px; max-height:300px; overflow-y:auto; background:#fff; border:1.5px solid var(--border); border-radius:14px; box-shadow:0 12px 32px rgba(23,37,49,0.18); padding:12px; }
  .he-emoji-search { width:100%; height:36px; padding:0 12px; margin-bottom:10px; border:var(--pill-border-w, 2px) solid var(--control-border); border-radius:9px; font-family:inherit; font-size:13px; box-sizing:border-box; position:sticky; top:0; }
  .he-emoji-search:focus { outline:none; border-color:var(--terracotta); }
  .he-emoji-empty { font-size:13px; color:var(--muted); text-align:center; padding:12px 0; margin:0; }
  .he-emoji-group { margin-bottom:12px; }
  .he-emoji-group-label { font-size:11px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:var(--muted); margin:0 0 6px; }
  .he-emoji-grid { display:grid; grid-template-columns:repeat(8,1fr); gap:4px; }
  .he-emoji-cell { aspect-ratio:1; display:flex; align-items:center; justify-content:center; font-size:18px; border:none; background:transparent; border-radius:8px; cursor:pointer; transition:background 0.12s; }
  .he-emoji-cell:hover { background:var(--cream); }
  .he-emoji-cell.is-active { background:var(--terracotta); }
  .he-stat-label { height:42px; padding:0 12px; border:var(--pill-border-w, 2px) solid var(--control-border); border-radius:10px; font-family:inherit; font-size:14px; font-weight:600; color:var(--navy); box-sizing:border-box; }
  .he-stat-label:focus, .he-stat-emoji:focus { outline:none; border-color:var(--terracotta); }
  .he-stat-slider { height:42px; cursor:pointer; }
  .he-stat-val { height:42px; display:flex; align-items:center; justify-content:flex-end; font-size:14px; font-weight:800; color:var(--muted); }
  .he-stat-del { height:42px; background:none; border:none; color:var(--muted); cursor:pointer; padding:0 6px; border-radius:8px; display:flex; align-items:center; }
  .he-stat-del:hover { color:var(--error); background:#FBEAEA; }

  .he-stat-add .he-hint { margin:15px 0; }
  .he-custom-row { margin-top:12px; }
  .he-add-custom-btn { display:inline-flex; align-items:center; gap:7px; padding:10px 16px; background:#fff; border:var(--pill-border-w, 2px) dashed var(--terracotta); border-radius:12px; color:var(--terracotta); font-family:inherit; font-size:14px; font-weight:700; cursor:pointer; transition:background 0.15s; }
  .he-add-custom-btn:hover { background:#FBF6EE; border-color:var(--terracotta); }
  .he-custom-max-note { display:inline-flex; align-items:center; padding:10px 16px; background:#FBF6EE; border:var(--pill-border-w, 2px) solid var(--control-border); border-radius:12px; color:var(--muted); font-size:14px; font-weight:600; }
  .he-preset-chips { display:flex; flex-wrap:wrap; gap:7px; }
  .he-preset-chip { display:inline-flex; align-items:center; gap:5px; padding:6px 12px; background:var(--cream); border:var(--pill-border-w, 2px) solid var(--control-border); border-radius:999px; font-family:inherit; font-size:13px; font-weight:700; color:var(--navy); cursor:pointer; }
  .he-preset-chip:hover { border-color:var(--terracotta); }
  .he-preset-saved { padding:0; overflow:hidden; }
  .he-preset-saved.is-on-card { opacity:0.5; }
  .he-preset-saved-add:disabled { cursor:default; }

  /* =========================================================
     STAT LAYOUT — three INDEPENDENT breakpoint zones.
     Each zone fully owns its spacing/sizing. Editing one never
     affects the others. (Shared visual styling is above.)
     ========================================================= */

  /* ----- DESKTOP (>=901px) ----- */
  @media (min-width: 901px) {
    .he-stat-list { gap:14px; margin-bottom:18px; }
    .he-stat-main { align-items:flex-start; gap:10px; flex-wrap:nowrap; }
    .he-stat-field { flex:1 1 auto; gap:4px; }
    .he-stat-sub { gap:10px; height:20px; }
    .he-emoji { align-self:flex-start; }
    .he-stat-label { width:100%; }
    .he-stat-slider { flex:1 0 130px; align-self:flex-start; }
    .he-stat-val { flex:0 0 44px; align-self:flex-start; }
    .he-stat-del { align-self:flex-start; }
  }

  /* ----- TABLET (641px - 900px) ----- */
  @media (min-width: 641px) and (max-width: 900px) {
    .he-stat-list { gap:14px; margin-bottom:18px; }
    .he-stat-main { align-items:flex-start; gap:9px; flex-wrap:nowrap; }
    .he-stat-field { flex:1 1 auto; gap:4px; }
    .he-stat-sub { gap:10px; height:20px; }
    .he-emoji { align-self:flex-start; }
    .he-stat-label { width:100%; }
    .he-stat-slider { flex:1 0 100px; align-self:flex-start; }
    .he-stat-val { flex:0 0 42px; align-self:flex-start; }
    .he-stat-del { align-self:flex-start; }
  }

  /* ----- MOBILE (<=640px) ----- */
  @media (max-width: 640px) {
    /* all section action buttons stack on mobile: Save on top, Cancel below,
       with a divider line above (matches Care Editor), evenly spaced */
    .he-edit-actions { flex-direction:column; align-items:stretch; gap:10px; border-top:1px solid rgba(23,37,49,0.06); padding-top:16px; margin-top:16px; }
    .he-edit-actions .he-btn { width:100%; justify-content:center; }
    .he-edit-actions .he-btn-primary { order:1; }
    .he-edit-actions .he-btn-ghost { order:2; }
    .he-stat-list { gap:14px; margin-bottom:18px; }
    /* ── Mobile stat layout (Option A) — desktop is untouched ──
       Each stat is a self-contained card so it's unambiguous which controls
       belong to which stat. Line 1: emoji + name input (+ counter on the right,
       under the input). Line 2: slider with its value at the end. The delete
       button is anchored to the card's top-right corner. */
    .he-stat-row {
      position:relative;
      background:#fff;
      border:1px solid var(--border);
      border-radius:14px;
      padding:14px 14px 16px;
      box-shadow:0 1px 3px rgba(23,37,49,0.04);
    }
    .he-stat-main { align-items:flex-start; gap:10px; flex-wrap:wrap; row-gap:12px; }
    /* leave room on line 1 for the absolutely-positioned trash in the corner */
    .he-stat-field { flex:1 1 60%; gap:4px; padding-right:34px; }
    .he-stat-label { width:100%; }
    /* counter stays on the RIGHT under the input (he-stat-sub is
       justify-content:space-between, so the counter sits right) */
    .he-stat-sub { gap:8px; height:20px; }
    .he-emoji { align-self:flex-start; }
    /* line 2: slider takes most of the row, value sits at its end (same line).
       The label field is flex:1 1 60% above; forcing a wrap before the slider
       via a full-width spacer keeps slider+value together on their own line. */
    .he-stat-slider { flex:1 1 auto; order:5; align-self:center; height:36px; min-width:0; }
    .he-stat-val { flex:0 0 auto; order:6; align-self:center; height:auto; padding-left:4px; }
    /* delete: pinned to the card's top-right corner, tied to THIS stat */
    .he-stat-del {
      position:absolute;
      top:26px;
      right:8px;
      order:0;
      height:auto;
      align-self:auto;
      margin:0;
      z-index:2;
    }
  }
  .he-preset-saved-add { border:none; background:transparent; font-family:inherit; font-size:13px; font-weight:600; color:var(--navy); padding:7px 6px 7px 13px; cursor:pointer; }
  .he-preset-saved-del { border:none; background:transparent; color:var(--muted); padding:7px 10px 7px 4px; cursor:pointer; display:inline-flex; align-items:center; }
  .he-preset-saved-del:hover { color:var(--error); }
  .he-stat-save-preset { display:inline-flex; align-items:center; gap:4px; border:var(--pill-border-w, 2px) solid var(--control-border); background:#fff; border-radius:8px; font-family:inherit; font-size:12px; font-weight:700; color:var(--terracotta); padding:5px 12px; cursor:pointer; white-space:nowrap; }
  .he-stat-save-preset:hover:not(:disabled) { border-color:var(--terracotta); }
  .he-stat-save-preset:disabled { color:var(--success); border-color:var(--border); cursor:default; }
  .he-preset-chip.he-custom { background:#fff; color:var(--terracotta); font-weight:700; }
  .he-custom-max { background:#FBF6EE; color:var(--muted); font-weight:600; cursor:default; }
  .he-stat-count { font-size:12px; font-weight:500; color:#717A86; white-space:nowrap; }
  .he-stat-count.is-max { color:#CF5C36; font-weight:600; }

  /* theme */
  .he-theme-opt { display:flex; flex-direction:column; align-items:center; gap:7px; background:none; border:none; cursor:pointer; font-family:inherit; padding:4px; }
  .he-theme-swatch { width:100%; aspect-ratio:1.6; border-radius:12px; display:flex; align-items:center; justify-content:center; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06); transition:transform 0.12s; }
  .he-theme-opt:not(.is-active):hover .he-theme-swatch { transform:translateY(-2px); box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06), 0 0 0 var(--pill-border-w, 2px) var(--terracotta); }
  .he-theme-opt.is-active .he-theme-swatch { box-shadow:0 0 0 2.5px var(--navy); }
  .he-theme-name { font-size:12px; font-weight:600; color:var(--slate); }

  .he-note { background:#FBF6EE; border:1px dashed var(--border); border-radius:14px; padding:16px 18px; margin-bottom:24px; }
  .he-note p { font-size:14px; font-weight:500; color:var(--muted); margin:0; }

  .he-btn { height:42px; padding:0 22px; border-radius:12px; border:none; cursor:pointer; font-family:inherit; font-size:15px; font-weight:700; display:inline-flex; align-items:center; justify-content:center; gap:9px; text-decoration:none; }
  .he-btn-primary { background:var(--terracotta); color:#fff; border:2px solid var(--terracotta); }
  .he-btn-primary:hover { background:#fff; color:var(--terracotta); border-color:var(--terracotta); }
  .he-btn-ghost { background:#fff; color:var(--navy); border:2px solid rgba(23,37,49,0.10); font-weight:600; }
  .he-btn-ghost:hover { border-color:var(--terracotta); color:var(--terracotta); }
  /* Compact toolbar sizing for ONLY the Preview/Publish buttons in the action
     bar. Higher specificity than .he-btn so it wins regardless of source order;
     scoped to the bar so other .he-btn-sm buttons are unaffected. */
  .he-actionbar-actions .he-btn { height:40px; min-width:0; padding:0 16px; font-size:13.5px; border-radius:9px; gap:6px; }
  /* Publish button holds a fixed width so it doesn't jump when its label swaps
     between "Publish" / "Publishing…" / "Published" (the checkmark state was
     resizing it). 134px fits the widest label ("Publishing…"). */
  .he-actionbar-actions .he-btn-primary { min-width:134px; }


  /* customization pickers */
  .he-pick-block { margin-bottom:20px; }
  /* Evenly-spaced hairline dividers between the Card Design sub-sections
     (Hero photo · Background color · Card color · Accent · Label color · Design),
     matching the rest of the editor's sectioning. */
  .he-pick-block + .he-pick-block {
    border-top:1px solid var(--border,#EDE8E0);
    padding-top:20px;
  }
  .he-photo-count { font-weight:700; color:var(--slate,#9AA3AD); font-size:16px; }
  .he-photo-grid { display:flex; flex-wrap:wrap; gap:12px; }
  .he-photo-thumb {
    position:relative; width:84px; height:84px; border-radius:12px; overflow:hidden;
    cursor:pointer; border:2px solid var(--border,#EDE8E0); background:#f4f2ee;
    transition:border-color 0.15s, transform 0.1s;
  }
  .he-photo-thumb:not(.is-active):hover { transform:translateY(-1px); border-color:var(--terracotta,#CF5C36); }
  .he-photo-thumb.is-active { border-color:var(--terracotta,#CF5C36); }
  .he-photo-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
  .he-photo-active-badge {
    position:absolute; top:5px; left:5px; width:20px; height:20px; border-radius:999px;
    background:var(--terracotta,#CF5C36); color:#fff; display:flex; align-items:center; justify-content:center;
    box-shadow:0 1px 4px rgba(0,0,0,0.3);
  }
  .he-photo-del {
    position:absolute; top:5px; right:5px; width:20px; height:20px; border-radius:999px;
    background:rgba(23,37,49,0.72); color:#fff; border:none; cursor:pointer;
    display:flex; align-items:center; justify-content:center; padding:0;
  }
  .he-photo-del:hover { background:rgba(23,37,49,0.92); }
  .he-photo-del:disabled { opacity:0.5; cursor:default; }
  .he-photo-add {
    width:84px; height:84px; border-radius:12px; cursor:pointer;
    border:2px dashed var(--border,#D9D3C9); background:#fafafa;
    display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px;
    color:var(--slate,#717A86); font-size:11px; font-weight:600; font-family:inherit;
    transition:border-color 0.15s, color 0.15s;
  }
  .he-photo-add:hover { border-color:var(--terracotta,#CF5C36); color:var(--terracotta,#CF5C36); }
  .he-photo-add.is-busy { cursor:default; }
  .he-photo-spinner {
    width:22px; height:22px; border-radius:999px; border:2.5px solid var(--border,#E5E0D8);
    border-top-color:var(--terracotta,#CF5C36); animation:he-spin 0.7s linear infinite;
  }
  @keyframes he-spin { to { transform:rotate(360deg); } }
  .he-photo-error { color:#C2410C; font-size:13px; font-weight:600; margin:10px 0 0; }
  .he-label-warn {
    display:flex; flex-direction:column; align-items:flex-start; gap:8px;
    margin:10px 0 0; font-size:13px; font-weight:600; line-height:1.4; color:#B45309;
  }
  .he-label-warn-text { display:flex; align-items:flex-start; gap:6px; }
  .he-label-warn-icon { flex:0 0 auto; margin-top:1px; color:#B45309; }
  .he-label-warn-fix { display:inline-flex; align-items:center; gap:8px; }
  .he-label-warn-swatch {
    width:16px; height:16px; border-radius:5px; display:inline-block;
    border:1px solid rgba(23,37,49,0.15);
  }
  /* Shared text-link style (Match accent color, Reset lighting): looks like a
     real link with hover + underline so it reads as interactive, not bland. */
  .he-textlink {
    background:none; border:none; cursor:pointer; font-family:inherit;
    font-size:14px; font-weight:700; color:var(--terracotta,#CF5C36);
    padding:2px 2px; text-decoration:underline; text-underline-offset:2px;
    text-decoration-thickness:1.5px; border-radius:4px;
    transition:color 0.15s, background 0.15s;
  }
  .he-textlink:hover {
    color:var(--navy,#172531);
    text-decoration-thickness:2px;
  }
  .he-textlink:active { transform:translateY(0.5px); }
  /* Label color row: swatch + hex + link all on one baseline, vertically
     centered and evenly spaced (no more staggered alignment). */
  .he-label-row { display:flex; align-items:center; gap:12px; flex-wrap:wrap; padding-left:2px; }
  /* The "Match accent color" / "Reset to automatic" link sits inline directly
     after the hex field (normal gap), on desktop, tablet, and mobile — not
     pushed to the far right. If the row runs out of space it wraps naturally
     onto the next line, still left-aligned under the swatch/hex. */
  /* Secondary "Leave blank for automatic" note under a color hint — lighter and
     smaller so the primary sentence reads first. */
  .he-hint-auto { display:inline-block; margin-top:10px; font-size:13px; color:#9AA3AD; font-weight:500; }
  /* Reset lighting sits at the bottom, right-aligned. */
  .he-light-reset-row { display:flex; justify-content:flex-start; margin-top:4px; }
  .he-photo-hint { color: #717a86; font-size:14px; font-weight: 500;  margin:10px 0 0; max-width:68ch; }
  .he-textlink--active { color:var(--terracotta); font-weight:800; text-decoration:underline; text-underline-offset:2px; }
  .he-pick-label { font-size:16px; font-weight:700; color:var(--navy); margin:0 0 9px; }
  .he-swatch-row { display:flex; flex-wrap:wrap; gap:9px; margin-bottom: 10px; padding-left: 2px;}
  .he-swatch { width:34px; height:34px; border-radius:9px; border:2px solid rgba(0,0,0,0.08); cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; position:relative; transition:transform 0.12s; }
  .he-swatch:not(.is-active):hover { transform:translateY(-2px); box-shadow:0 0 0 var(--pill-border-w, 2px) var(--terracotta); }
  .he-swatch.is-active { border-color:var(--navy); box-shadow:inset 0 0 0 2px var(--navy); }
  .he-swatch-custom { background:#fff; color:var(--terracotta); overflow:hidden; }
  .he-swatch-custom input[type="color"] { position:absolute; inset:0; opacity:0; cursor:pointer; border:none; padding:0; }
  .he-hex {
    display:inline-flex; align-items:center; gap:2px;
    border:var(--pill-border-w, 2px) solid var(--control-border); border-radius:9px;
    padding:6px 10px; background:#fff; max-width:130px;
  }
  .he-hex:focus-within { border-color:var(--terracotta,#CF5C36); }
  .he-hex-prefix { color:var(--slate,#9AA3AD); font-weight:700; font-size:14px; }
  .he-hex-input {
    border:none; outline:none; font-family:inherit; font-size:14px; font-weight:600;
    color:var(--navy,#172531); width:78px; text-transform:lowercase;
    letter-spacing:0.02em; background:transparent;
  }

  .he-design-preview { position:relative; width:100%; height:140px; border-radius:14px; overflow:hidden; margin-bottom:14px; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.08); background:var(--cream); }
  .he-design-preview-label { position:absolute; left:10px; bottom:8px; z-index:2; font-size:11px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.5); }
  /* category tabs */
  .he-cat-tabs { display:flex; gap:6px; background:var(--cream); padding:4px; border-radius:12px; margin-bottom:8px; }
  .he-cat-tab { flex:1; padding:9px 10px; border:none; background:transparent; border-radius:9px; font-family:inherit; font-size:14px; font-weight:700; color:var(--muted); cursor:pointer; transition:background 0.15s, color 0.15s; }
  .he-cat-tab.is-active { background:#fff; color:var(--navy); box-shadow:0 1px 4px rgba(23,37,49,0.08); }
  .he-cat-blurb { font-size:15px; color:var(--muted); margin:0 0 14px; font-weight: 500;}
  /* vanta labeled cards (no thumbnails) */
  .he-vanta-cards { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
  .he-vanta-card { display:flex; align-items:center; gap:10px; padding:11px 13px; background:#fff; border:var(--pill-border-w, 2px) solid var(--control-border); border-radius:12px; font-family:inherit; font-size:14px; font-weight:600; color:var(--navy); cursor:pointer; transition:border-color 0.15s, transform 0.1s; }
  .he-vanta-card:hover { border-color:var(--terracotta); transform:translateY(-1px); }
  .he-vanta-card.is-active { border-color:var(--terracotta); box-shadow:inset 0 0 0 1.5px var(--terracotta); }
  .he-vanta-chip { width:22px; height:22px; border-radius:6px; flex-shrink:0; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.08); }
  .he-design-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; }
  .he-design-opt { display:flex; flex-direction:column; align-items:center; gap:7px; background:none; border:none; cursor:pointer; font-family:inherit; padding:4px; }
  .he-design-swatch { position:relative; width:100%; aspect-ratio:1.5; border-radius:11px; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.08); overflow:hidden; transition:transform 0.12s; }
  .he-design-opt:not(.is-active):hover .he-design-swatch { transform:translateY(-2px); box-shadow:inset 0 0 0 1px rgba(0,0,0,0.08), 0 0 0 var(--pill-border-w, 2px) var(--terracotta); }
  .he-design-opt.is-active .he-design-swatch { box-shadow:inset 0 0 0 3px var(--terracotta); transform:translateY(-2px); }
  .he-design-opt.is-active { filter:drop-shadow(0 4px 12px rgba(207,92,54,0.3)); }
  .he-design-opt.is-active .he-design-name { color:var(--terracotta); font-weight:800; }
  /* clear "selected" check badge on the active swatch */
  .he-design-opt.is-active .he-design-swatch::after {
    content:"";
    position:absolute; top:6px; right:6px; width:20px; height:20px;
    border-radius:50%; background:var(--terracotta);
    box-shadow:0 1px 4px rgba(0,0,0,0.35);
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:center;
    z-index:3;
  }
  .he-design-name { font-size:15px; font-weight:600; color:var(--slate); }

  /* Lighting panel */
  .he-light { margin-top:18px; border-top:1px solid var(--border,#EDE8E0); padding-top:14px; }
  .he-light-toggle {
    width:100%; display:flex; align-items:center; justify-content:space-between;
    background:none; border:none; cursor:pointer; font-family:inherit; padding:6px 0;
    font-size:16px; font-weight:700; color:var(--navy,#172531);
  }
  .he-light-toggle > span:first-child { display:inline-flex; align-items:center; gap:8px; }
  .he-light-dot { width:7px; height:7px; border-radius:999px; background:var(--terracotta,#CF5C36); display:inline-block; }
  .he-light-chev { transition:transform 0.2s; color:var(--slate,#717A86); flex:0 0 auto; }
  .he-light-chev.is-open { transform:rotate(180deg); }
  .he-light-body { padding:14px 0 4px; }
  .he-light-preview { width:100%; height:120px; border-radius:12px; overflow:hidden; position:relative; margin-bottom:16px; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.08); }
  .he-light-grid { display:grid; grid-template-columns:160px 1fr; gap:20px; align-items:start; }
  .he-light-label { display:flex; align-items:center; justify-content:space-between; font-size:15px; font-weight:600; color:var(--slate,#717A86); margin-bottom:7px; }
  .he-light-val { font-weight:700; color:var(--navy,#172531); font-variant-numeric:tabular-nums; }
  .he-light-pad {
    position:relative; width:100%; aspect-ratio:.95; border-radius:12px;
    background:linear-gradient(135deg,#2a3a4d,#0f1722); cursor:crosshair;
    box-shadow:inset 0 0 0 1px rgba(0,0,0,0.12); touch-action:none;
  }
  .he-light-dotmark {
    position:absolute; width:18px; height:18px; border-radius:999px;
    background:#fff; border:2px solid var(--terracotta,#CF5C36);
    transform:translate(-50%,-50%); box-shadow:0 2px 6px rgba(0,0,0,0.4); pointer-events:none;
  }
  .he-light-sliders { display:flex; flex-direction:column; gap:16px; padding: 0 3px; }
  .he-light-slider input[type=range] { width:100%; accent-color:var(--terracotta,#CF5C36); cursor:pointer; }
  .he-light-hint { display:block; font-size:14px; font-weight: 500; color:var(--slate,#9AA3AD); margin-top:3px; }
  @media (max-width:1023px) {
    /* Light Position spans the full width on tablet and mobile. */
    .he-light-grid { grid-template-columns:1fr; gap:16px; }
    .he-light-pad-wrap { width:100%; }
    .he-light-pad { width:100%; max-width:none; aspect-ratio:2.2; }
  }

  /* design summary in display mode */
  .he-display-design { display:flex; align-items:center; gap:12px; }
  .he-display-colors { display:inline-flex; gap:5px; }
  .he-display-dot { width:22px; height:22px; border-radius:6px; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.10); }
  .he-display-designname { font-size:16px; font-weight:600; color:var(--navy); }

  @media (max-width: 640px) {
    .he-head-row { flex-direction:column; }
    .he-rarity-grid { grid-template-columns:repeat(2,1fr); }
    .he-design-grid { grid-template-columns:repeat(3,1fr); }
    .he-save-toast { right:16px; bottom:16px; }
    /* action bar: stack on mobile, Publish (primary) on top */
    /* Mobile: slim action bar pinned to the BOTTOM (thumb-reachable) so it
       never eats the content viewport. Single compact row. */
    .he-actionbar {
      position:fixed; top:auto; left:0; right:0; bottom:0;
      border-bottom:none; border-top:1px solid var(--border);
      box-shadow:0 -4px 16px rgba(23,37,49,0.08);
      padding-bottom:env(safe-area-inset-bottom);
    }
    .he-actionbar-inner { padding:12px 12px; gap:8px; flex-wrap:nowrap; flex-direction:row; align-items:center; }
    .he-actionbar-status { flex:1 1 auto; min-width:0; justify-content:flex-start; }
    .he-actionbar-actions { order:2; flex-direction:row; gap:8px; flex:0 0 auto; }
    .he-actionbar-actions .he-btn { width:auto; padding:0 12px; }
    /* The bar is fixed at the bottom, so it no longer pushes page content. Add
       bottom padding to the page so the last content isn't hidden behind it. */
    .he-actionbar + .he-container { padding-top:20px; padding-bottom:72px; }
    .he-scrolltop { bottom:84px; right:16px; }
  }


  /* ===== Personality (pce-) styles moved from Care Editor ===== */
/* Sections */
        .pce-section {
          background: #fff;
          border-radius: 16px;
          padding: 28px 24px;
          margin-bottom: 20px;
          border: 1px solid rgba(23,37,49,0.06);
        }
.pce-section-header { margin-bottom: 20px; }
.pce-section-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-terracotta, #CF5C36);
          margin: 0 0 6px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
.pce-section-title {
          font-size: clamp(19px, 2.6vw, 22px);
          font-weight: 800;
          color: var(--color-navy-dark, #172531);
          margin: 0 0 4px;
          letter-spacing: -0.01em;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          line-height: 1.2;
        }
.pce-section-sub {
          font-size: 16px;
          font-weight: 500;
          color: var(--color-slate, #4B5563);
          margin: 0;
          line-height: 1.6;
        }
.pce-frequency-block > .pce-field + .pce-days-picker {
          margin-top: -6px;
        }
.pce-field {
          display: flex;
          flex-direction: column;
        }
/* Form-block spacing is now handled by parent container gap rules
           on .pce-modal-body and .pce-entry-card (see above). Adjacency
           selectors are not needed — every direct child of those flex columns
           inherits the 14px gap automatically. If a form is rendered outside
           those containers, the parent should also use display:flex;
           flex-direction:column; gap:14px for consistent spacing. */
        .pce-label {
          font-size: 14px;
          font-weight: 700;
          color: var(--color-navy-dark, #172531);
          margin-bottom: 6px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
.pce-input,
        .pce-select {
          width: 100%;
          height: 46px;
          padding: 11px 14px;
          font-size: 15px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          color: var(--color-navy-dark, #172531);
          background: #fff;
          border: 2px solid rgba(23,37,49,0.10);
          border-radius: 10px;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
          -webkit-appearance: none;
          appearance: none;
        }
textarea.pce-input { height: auto; padding: 12px 14px; min-height: 80px; }
.pce-input:focus,
        .pce-select:focus {
          outline: none;
          border-color: var(--color-terracotta, #CF5C36);
          box-shadow: 0 0 0 3px rgba(207,92,54,0.12);
        }
.pce-slug-row .pce-input { flex: 1 1 auto; min-width: 0; }
.pce-field-hint {
          font-size: 14px;
          font-weight: 500;
          color: #717A86;
          margin: 6px 0 0;
          line-height: 1.4;
        }
.pce-field-hint.pce-field-warn {
          color: #C94040;
          font-weight: 600;
        }
/* Textarea - used for allergies, conditions free-text */
        .pce-textarea {
          width: 100%;
          min-height: 80px;
          padding: 12px 14px;
          font-size: 15px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          color: var(--color-navy-dark, #172531);
          background: #fff;
          border: var(--pill-border-w, 2px) solid var(--control-border);
          border-radius: 10px;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
          resize: vertical;
          line-height: 1.5;
        }
.pce-textarea:focus {
          outline: none;
          border-color: var(--color-terracotta, #CF5C36);
          box-shadow: 0 0 0 3px rgba(207,92,54,0.12);
        }
/* List of structured items (vaccinations, medications) */
        .pce-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin: 3px 0 20px;
        }
/* List item: white card with warm border + soft shadow.
           Matches Profile pet card styling (.pp-pet-card).
           Hover adds amber-cream ring + deepened shadow for prominent feedback. */
        .pce-list-item {
          display: flex;
          align-items: flex-start;
          // gap: 4px;
          padding: 20px;
          background: #fff;
          border: 1px solid #EDE8E0;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(23,37,49,0.07);
          transition: box-shadow 0.25s, border-color 0.25s;
        }
.pce-list-item:hover {
          border-color: rgba(239,200,139,0.9);
          box-shadow: 0 0 0 1.5px rgba(239,200,139,0.9),
                      0 16px 48px rgba(23,37,49,0.13);
        }
/* Inline icon — sits next to title text inside the title row. */
        .pce-list-item-icon-inline {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--color-terracotta, #CF5C36);
          flex-shrink: 0;
          line-height: 0;
        }
        .pce-emoji-icon { font-size: 18px; line-height: 1; }
.pce-list-item-body { flex: 1; min-width: 0; }
/* Title row: title + status pill side by side, vertically centered. */
        .pce-list-item-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          /* flex-wrap: wrap; */
          margin-bottom: 0;
        }
/* Variant for TextareaCard (Allergies/Medical conditions/Quirks): the
           "title" is actually multi-line prose that may wrap to many lines.
           Anchor the icon to the TOP-LEFT so it stays adjacent to the first
           line of text regardless of how much the text wraps. */
        .pce-list-item-title-row--prose {
          align-items: flex-start;
          flex-wrap: nowrap;
        }
/* Nudge the icon down slightly so it visually aligns with the first
           line of prose text (icon box top vs. text baseline) */
        .pce-list-item-title-row--prose .pce-list-item-icon-inline {
          margin-top: 2px;
        }
.pce-list-item-title {
          font-size: 16px;
          font-weight: 500;
          color: var(--color-navy-dark, #172531);
          margin-bottom: 0;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          line-height: 1.3;
          word-break: break-word;
        }
.pce-list-title-memory {
  margin-bottom: 8px;
}
/* Used by TextareaCard view-mode (Allergies, Medical conditions, Quirks)
           — renders the multi-line text content like body prose, not bold title. */
        .pce-list-item-prose {
          font-size: 16px;
          font-weight: 500;
          color: var(--color-navy-dark, #172531);
          margin: 0;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          /* line-height: 1.5; */
          white-space: pre-wrap;
          word-break: break-word;
        }
/* Meta section — label:value rows.
           MOBILE (default, <720px): stacked rows, "Label: Value" inline.
           DESKTOP (>=720px): grid layout with equal-width columns,
           label on top + value below per column (uses --col-count from JSX). */
        .pce-list-item-meta {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
.pce-list-item-meta-row {
          display: flex;
          gap: 8px;
          align-items: baseline;
          font-size: 16px;
          line-height: 1.4;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
/* Per-section modifier classes for .pce-list-item-meta. Each section
           has its own min-width tuned to its longest label so labels and values
           sit on the same line without wrapping into adjacent columns.
           Mobile (<=375px) still uses the base stacked layout (label above value),
           so these modifiers only kick in above 375px where the grid is active.
           To tweak any section's label width, edit the px value in its block. */
        @media (min-width: 376px) {
          /* Identity (view-mode card): Species, Breed, Sex, Spay / Neuter, etc. */
          .pce-list-item-meta--identity .pce-list-item-meta-label {
            min-width: 72px;
          }

          /* Emergency contacts: Relationship, Phone, Alt phone, Email */
          .pce-list-item-meta--emergency .pce-list-item-meta-label {
            min-width: 88px;
          }

          /* Vet visit history: Date, Clinic, Reason */
          .pce-list-item-meta--vet-history .pce-list-item-meta-label {
            min-width: 54px;
          }

          /* Primary vet card: Phone, Address */
          .pce-list-item-meta--primary-vet .pce-list-item-meta-label {
            min-width: 61px;
          }

          /* Emergency vet card: Phone, Address */
          .pce-list-item-meta--emergency-vet .pce-list-item-meta-label {
            min-width: 61px;
          }

          /* Specialists: Specialty, Phone, Address */
          .pce-list-item-meta--specialists .pce-list-item-meta-label {
            min-width: 69px;
          }

          /* Insurance card: Policy #, Phone, CareCredit, CareCredit # */
          .pce-list-item-meta--insurance .pce-list-item-meta-label {
            min-width: 97px;
          }

          /* Feeding cards: Time, Amount, Days */
          .pce-list-item-meta--feedings .pce-list-item-meta-label {
            min-width: 76px;
          }

          /* Walk cards: Time, Duration, Days */
          .pce-list-item-meta--walks .pce-list-item-meta-label {
            min-width: 76px;
          }

          /* Vaccination cards: Given, Given by, Next due */
          .pce-list-item-meta--vaccinations .pce-list-item-meta-label {
            min-width: 67px;
          }

          /* Medication cards: Dose, Given, Given by, Frequency */
          .pce-list-item-meta--medications .pce-list-item-meta-label {
            min-width: 76px;
          }
        }
.pce-list-item-meta-label {
          font-weight: 500;
          color: #717A86;
          flex-shrink: 0;
          min-width: 70px;
        }
/* Weight entry cards: align both labels ("Weight:" and "Change:")
           by giving the label column enough width to fit the longest one. */
        .pce-list-item-meta--weight .pce-list-item-meta-label {
          min-width: 59px;
        }
/* Weight cards used to override align-items to center for the arrow icon
           in "Weight change" but that broke the layout in other contexts. Removed —
           default baseline alignment works correctly. */
        /* If a Weight entry has only one row (no previous to compare), use the
           tighter 40px label so it doesn't look airy with a 145px label and short value. */
        .pce-list-item-meta--weight[style*="--col-count: 1"] .pce-list-item-meta-label {
          min-width: 40px;
        }
/* Weight change uses neutral dark navy (same as other meta values).
           No semantic coloring — pet weight goals vary (some pets need to gain,
           some need to lose, some maintain). The words "Gained" / "Lost" convey
           direction; color would imply a judgment that may not match the user's goal. */
        /* Default meta-value — renders inline beside the label. Multi-line
           values (e.g. 2-line addresses) use <br/> for line breaks rather than
           CSS flex tricks, which avoids browser quirks with inline-flex/block
           combinations and works reliably across all viewports and browsers. */
        .pce-list-item-meta-value {
          font-weight: 600;
          color: var(--color-navy-dark, #172531);
          word-break: break-word;
          min-width: 0;
        }
.pce-list-item-actions {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }
.pce-icon-btn {
          width: 15px;
          height: 27px;
          border-radius: 8px;
          background: transparent;
          color: var(--color-muted, #717A86);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          transition: background 0.15s, color 0.15s;
        }
.pce-icon-btn:hover { background: rgba(23,37,49,0.06); color: var(--color-navy-dark, #172531); }
.pce-icon-btn.danger:hover { background: rgba(201,64,64,0.10); color: #C94040; }
/* Empty state inside a list section. The 20px margin-bottom matches
           .pce-list's margin-bottom so the gap between the content area and
           whatever follows (typically a "+ Add" button or the next subsection)
           is identical whether the section is empty or has items. */
        .pce-list-empty {
          padding: 18px 20px;
          background: var(--color-cream, #F5F0E8);
          border-radius: 12px;
          color: var(--color-muted, #717A86);
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 20px;
        }
/* =============================================================
           TAG INPUT (chip-style array editor) — used by Personality fields
           (traits, loves, dislikes) and Identity tags. Visually mimics a
           text input with chips rendered inline before the text caret.
           ============================================================= */
        .pce-tag-input {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 8px 10px;
          min-height: 46px;
          background: #fff;
          border: var(--pill-border-w, 2px) solid var(--control-border);
          border-radius: 10px;
          cursor: text;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          align-items: center;
        }
.pce-tag-input:focus-within {
          border-color: var(--color-navy-dark, #172531);
          box-shadow: 0 0 0 3px rgba(23,37,49,0.08);
        }
/* Error state: shown briefly when user attempts an invalid action
           (duplicate tag, max tags reached). Tint the border red for stronger
           visual feedback than just the message below. */
        .pce-tag-input--error {
          border-color: #C94040;
        }
.pce-tag-input--error:focus-within {
          border-color: #C94040;
          box-shadow: 0 0 0 3px rgba(201,64,64,0.10);
        }
/* At-limit notice: shown inside the chip box when the user has hit
           maxTags, in place of the input field. Italicized + muted so it
           reads as informational (not as another chip). */
        .pce-tag-input-limit-notice {
          font-size: 14px;
          font-style: italic;
          font-weight: 500;
          color: var(--color-muted, #717A86);
          padding: 4px 0;
          flex: 1 1 100%;
          width: 100%;
          min-width: 0;
        }
.pce-tag-input-field {
          flex: 1;
          min-width: 80px;
          border: none;
          outline: none;
          background: transparent;
          font-size: 15px;
          font-family: inherit;
          color: var(--color-navy-dark, #172531);
          padding: 4px 0;
        }
.pce-tag-input-field::placeholder {
          color: var(--color-muted, #717A86);
        }
/* ============================================================
           Share section buttons — Option Z styling.
           Share = filled terracotta (primary).
           Both Downloads = identical navy outline (visual peers).
           Local 2px border definition so the buttons are pixel-equal,
           without touching the global .pce-btn-secondary class used
           elsewhere in the editor.
           ============================================================ */
        .pce-share-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 16px;
          margin-top: 20px;
        }
/* Match the Generate button height (48px from .pce-btn-primary, the
           page-wide primary CTA size) so they line up cleanly side-by-side. */
        .pce-share-expire-select {
          height: 42px;
          max-width: 180px;
          padding: 0 32px 0 12px;
          font-size: 14px;
        }
/* Chip — the rendered tag pill. Two variants:
           - default (inside TagInput): has a remove × button
           - --display (inside view-mode cards): static, no remove button */
        /* Same pill treatment as Home and the vets pages: an outline at the
           shared thickness and weight 700. Without a border these read as
           soft blobs on a cream field rather than as discrete tags. */
        .pce-tag-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 6px 6px 12px;
          background: var(--color-cream, #F5F0E8);
          color: var(--color-navy-dark, #172531);
          font-size: 14px;
          font-weight: 700;
          border: var(--pill-border-w, 2px) solid var(--control-border);
          border-radius: 999px;
          line-height: 1.3;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
.pce-tag-chip--display {
          padding: 6px 12px;
        }
.pce-tag-chip-remove {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border: none;
          background: rgba(23,37,49,0.08);
          color: var(--color-navy-dark, #172531);
          border-radius: 999px;
          cursor: pointer;
          padding: 0;
          transition: background 120ms ease;
        }
.pce-tag-chip-remove:hover {
          background: rgba(23,37,49,0.16);
        }
/* Chip display row inside view-mode list-item — flex-wraps so long
           lists wrap to multiple lines instead of overflowing. */
        .pce-tag-chips-display {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          min-width: 0;
        }
/* For TagArrayCard chip view, center-align the row vertically so the
           pencil icon aligns with the visual center of the chip cluster.
           Multi-row meta sections (vaccinations, weight, etc.) keep the
           default flex-start alignment because their content is taller. */
        .pce-list-item--chips {
          align-items: flex-start;
        }
/* For cards whose body is logically ONE ROW of content (Nickname,
           Allergies, Medical conditions, Quirks, Fun fact). Target the BODY
           only — let it center its own content vertically inside its height.
           The outer list-item keeps the default flex-start alignment, so the
           pencil icon stays anchored to the top-right corner untouched.
           Multi-row meta cards (vaccinations, vet visits, etc.) don't get
           this modifier — their content stays naturally top-aligned. */
        .pce-list-item--single .pce-list-item-body {
          display: flex;
          flex-direction: column;
          justify-content: center;
          // min-height: 28px;
        }
/* =============================================================
           IDENTITY TAGS — pill grid + chip display (Hero Card celebration)
           Used by IdentityTagsSection. Tag pills are larger, more visual
           than personality chips because they're the headline identity
           statements (like trading-card badges).
           ============================================================= */
        /* Mobile: 1 column so long labels (Emotional Support, Service /
           Therapy, Forever Loved, Special Needs) never wrap. Each pill gets
           the full row width and the same fixed height.
           Tablet: 2 columns. Desktop: 3 columns. We don't go to 4 columns
           because at narrower desktops long labels would wrap again. */
        .pce-identity-tag-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
@media (min-width: 640px) {
          .pce-identity-tag-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
@media (min-width: 900px) {
          .pce-identity-tag-grid {
            grid-template-columns: 1fr 1fr 1fr;
          }
        }
/* The pill is structured as a relative container so the (i) info
           button can sit absolutely in the top-right corner. Inner row uses
           flex with center alignment so icon + label stay vertically aligned
           even when label wraps to two lines. Fixed min-height ensures all
           pills have the same height regardless of label length. */
        .pce-identity-tag-pill {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
          padding: 12px 30px 12px 14px;
          background: #fff;
          border: 2px solid #EDE8E0;
          border-radius: 14px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          font-size: 14px;
          font-weight: 600;
          color: var(--color-navy-dark, #172531);
          cursor: pointer;
          transition: background 120ms ease, border-color 120ms ease,
                      transform 120ms ease, box-shadow 120ms ease;
          text-align: left;
          min-height: 64px;
        }
.pce-identity-tag-pill:hover {
          border-color: rgba(207,92,54,0.40);
          background: rgba(245,240,232,0.50);
        }
.pce-identity-tag-pill.is-selected {
          background: var(--color-navy-mid, #172531);
          border-color: var(--color-navy-mid, #172531);
          color: #fff;
        }
.pce-identity-tag-pill.is-selected:hover {
          background: var(--color-navy-mid, #172531);
          border-color: var(--color-navy-mid, #172531);
        }
/* Subtle press-down on click for tactile feel — matches the "trading
           card / picker game" feel users get from Pokemon-style selection. */
        .pce-identity-tag-pill:active {
          transform: scale(0.97);
        }
.pce-identity-tag-emoji {
          font-size: 24px;
          line-height: 1;
          flex-shrink: 0;
        }
.pce-identity-tag-label {
          line-height: 1.25;
          word-break: break-word;
          min-width: 0;
          flex: 1;
        }
/* Info button in the top-right corner of each pill. Tapping it
           reveals the tag's description in a popover below the pill,
           explaining what the tag means before the user selects it. */
        .pce-identity-tag-info {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 20px;
          height: 20px;
          border-radius: 999px;
          border: none;
          background: rgba(23,37,49,0.10);
          color: var(--color-navy-dark, #172531);
          /* Urbanist (site default), heavy weight for clarity. The "i"
             reads cleanly as "info" at small sizes when bold. */
          font-family: var(--font-urbanist, 'Urbanist', sans-serif);
          font-size: 14px;
          font-weight: 800;
          font-style: normal;
          letter-spacing: 0.02em;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          line-height: 1;
          transition: background 120ms ease;
        }
.pce-identity-tag-info:hover {
          background: rgba(23,37,49,0.18);
        }
.pce-identity-tag-pill.is-selected .pce-identity-tag-info {
          background: rgba(255,255,255,0.18);
          color: #fff;
        }
.pce-identity-tag-pill.is-selected .pce-identity-tag-info:hover {
          background: rgba(255,255,255,0.28);
        }
/* Description popover that appears below a tag pill when its (i)
           button is tapped. Spans the full row width inside the grid via
           grid-column: 1 / -1, so it doesn't squeeze the pills themselves. */
        .pce-identity-tag-info-popover {
          grid-column: 1 / -1;
          padding: 12px 14px;
          background: var(--color-cream, #F5F0E8);
          border: 2px solid #EDE8E0;
          border-radius: 10px;
          font-size: 14px;
          line-height: 1.5;
          color: var(--color-navy-dark, #172531);
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
.pce-identity-tag-info-popover-title {
          font-weight: 700;
          margin-bottom: 2px;
        }
        /* The description line under the title. It was a bare div with no
           class, so it inherited whatever the popover set and there was no way
           to target it. */
        .pce-identity-tag-info-popover-sub {
          font-weight: 600;
        }
.pce-identity-tag-info-popover-close {
          display: inline-block;
          float: right;
          background: transparent;
          border: none;
          color: var(--color-muted, #717A86);
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          padding: 0;
          margin-left: 8px;
        }
        /* (i) info popover — eases open AND closed to match the section
           collapses. Rendered only while open or animating-closed, so it never
           leaves an empty full-width grid item that would stack the pills.
           Enter: keyframe expands 0fr→1fr. Exit: when is-open is removed the
           grid-template-rows transition plays 1fr→0fr before unmount. */
        .pce-info-collapse {
          grid-column: 1 / -1;
          margin-top: -4px;
          display: grid;
          grid-template-rows: 0fr;
          opacity: 0;
          transition: grid-template-rows 0.30s cubic-bezier(0.33, 1, 0.68, 1),
                      opacity 0.20s ease;
        }
        .pce-info-collapse.is-open {
          grid-template-rows: 1fr;
          opacity: 1;
          animation: pce-info-expand 0.30s cubic-bezier(0.33, 1, 0.68, 1);
        }
        @keyframes pce-info-expand {
          from { grid-template-rows: 0fr; opacity: 0; }
          to   { grid-template-rows: 1fr; opacity: 1; }
        }
        .pce-info-collapse-inner {
          overflow: hidden;
          min-height: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .pce-info-collapse { transition: none; animation: none; }
          .pce-info-collapse.is-open { animation: none; }
        }
/* Display-mode chips for selected identity tags (inside view-mode
           list-item card). Smaller than the editor pills but with the same
           emoji + label structure. Cream background for warmth. */
        .pce-identity-tag-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--color-cream, #F5F0E8);
          color: var(--color-navy-dark, #172531);
          font-size: 14px;
          font-weight: 700;
          border-radius: 999px;
          line-height: 1.3;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          border: var(--pill-border-w, 2px) solid var(--control-border);
        }
.pce-identity-tag-chip .pce-identity-tag-emoji {
          font-size: 15px;
        }
/* List item variant for prose content (used by extension cards like
           Rescue story, Forever Loved memorial). Body grows vertically so
           the pencil stays top-right. */
        .pce-list-item--prose {
          align-items: flex-start;
        }
.pce-list-item-prose {
          font-size: 16px;
          line-height: 1.6;
          color: var(--color-navy-dark, #172531);
          /* margin removed — let parent container handle spacing */
          white-space: pre-wrap;
          word-break: break-word;
        }
/* Add-row button (e.g. "+ Add vaccination") - matches Profile .pp-add-pet-btn */
        .pce-add-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 24px;
          height: 42px;
          background: var(--color-navy-dark, #172531);
          color: #fff;
          border: 2px solid var(--color-navy-dark, #172531);
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          white-space: nowrap;
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
.pce-add-btn:hover {
          background: #fff;
          color: var(--color-navy-dark, #172531);
          border-color: var(--color-navy-dark, #172531);
        }
/* Subsection - used to group e.g. "Vaccinations" inside Medical */
        .pce-subsection { margin-top: 28px; }
.pce-subsection:first-child { margin-top: 0; }
.pce-sub-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--color-navy-dark, #172531);
          margin: 0 0 4px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          letter-spacing: -0.01em;
        }
/* Field-level heading for sub-fields inside extension cards
           (Champion/Adventurer/Foodie). Smaller + lighter than .pce-sub-title
           so the section heading (h3) above remains visually dominant.
           Two-tier hierarchy: section heading → field heading → input.
           The 20px top margin gives breathing room between the parent
           section heading (or the previous field's content/button) and
           this field. The 4px bottom keeps the heading tight to its
           subtitle/input below. */
        .pce-field-heading {
          font-size: 16px;
          font-weight: 700;
          color: var(--color-navy-dark, #172531);
          margin: 20px 0 4px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          text-transform: none;
          letter-spacing: 0;
        }
.pce-sub-sub {
          font-size: 15px;
          font-weight: 500;
          color: #717A86;
          margin: 0 0 14px;
          line-height: 1.6;
          max-width: 68ch;
        }
/* Modal */
        /* Inline expanding form (vaccinations + medications add).
           Sits below the "+ Add" button when active. Replaces modal for add-mode. */
        .pce-inline-form {
          margin-top: 16px;
          position: relative;
        }
        .pce-form-close {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 38px;
          height: 38px;
          border: none;
          background: transparent;
          color: var(--color-muted, #717A86);
          cursor: pointer;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, color 0.15s;
          z-index: 2;
        }
        /* Give the form content room so it never sits under the close X. */
        .pce-inline-form > .pce-entry-card,
        .pce-inline-form > .pce-field,
        .pce-inline-form > .pce-sub-title,
        .pce-inline-form > h3,
        .pce-inline-form > .pce-field-grid {
          padding-right: 44px;
        }
        .pce-form-close:hover {
          background: var(--color-cream, #F5F0E8);
          color: var(--color-navy-dark, #172531);
        }
.pce-inline-form-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 8px;
          flex-wrap: wrap;
        }
@media (max-width: 640px) {
          .pce-inline-form-actions {
            flex-direction: column-reverse;
            border-top: 1px solid rgba(23,37,49,0.06);
            padding-top: 16px;
            margin-top: 20px;
          }
          .pce-inline-form-actions .pce-btn-primary,
          .pce-inline-form-actions .pce-btn-secondary {
            width: 100%;
          }
        }
/* Multi-entry cards in add-mode modals (vaccinations, medications).
           Each entry is visually grouped as a card so the user sees clear
           boundaries between records being added at once. */
        .pce-entry-card {
          padding: 20px 20px 20px;
          background: #fff;
          border: 1px solid rgba(23,37,49,0.10);
          border-radius: 12px;
          margin-bottom: 12px;
          box-shadow: 0 1px 3px rgba(23,37,49,0.04);
          /* Single source of truth for vertical spacing inside entry cards.
             Same reasoning as .pce-modal-body — gap ensures every direct child
             gets a uniform 14px gap regardless of class. */
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
@media (max-width: 640px) {
          .pce-inline-form-actions--split {
            flex-direction: column-reverse;
            align-items: stretch;
            border-top: 1px solid rgba(23,37,49,0.06);
            padding-top: 16px;
            margin-top: 20px;
          }
          .pce-inline-form-actions-right {
            width: 100%;
          }
          .pce-inline-form-actions-right .pce-btn-secondary,
          .pce-inline-form-actions-right .pce-btn-primary {
            flex: 1 1 0;
          }
          .pce-inline-form-actions--split .pce-btn-danger-text {
            width: 100%;
            text-align: center;
          }
        }
/* PAUSED state — feeding/walks that are temporarily inactive.  */
        .pce-list-item.is-paused {
          opacity: 0.65;
          background: rgba(23,37,49,0.02);
        }
.pce-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 42px;
          min-width: 90px;
          padding: 0 24px;
          // line-height: 1;
          background: var(--color-terracotta, #CF5C36);
          color: #fff;
          border: 2px solid var(--color-terracotta, #CF5C36);
          border-radius: 12px;
          font-weight: 700;
          font-size: 15px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          white-space: nowrap;
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
.pce-btn-primary:hover { background: #fff; color: var(--color-terracotta, #CF5C36); border-color: var(--color-terracotta, #CF5C36); }
.pce-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; background: var(--color-terracotta, #CF5C36); color: #fff; border-color: var(--color-terracotta, #CF5C36); }
.pce-btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 42px;
          min-width: 90px;
          padding: 0 24px;
          // line-height: 1;
          background: #fff;
          color: var(--color-navy-dark, #172531);
          border: 1.5px solid rgba(23,37,49,0.10);
          border-radius: 12px;
          font-weight: 600;
          font-size: 15px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          white-space: nowrap;
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
.pce-btn-secondary:hover {
          background: var(--color-navy-dark, #172531);
          color: #fff;
          border-color: var(--color-navy-dark, #172531);
        }
@media (max-width: 640px) {
          .pce-body { padding: 20px 0 80px; }
          .pce-section { padding: 22px 18px; }
          .pce-pet-header { padding: 16px; gap: 14px; }
          .pce-pet-photo-wrap { width: 72px; height: 72px; }
          /* Modal footer: stack buttons vertically. Order: Save top, Cancel middle, Delete bottom.
             JSX order is Delete, Cancel, Save — flex order reverses for stacking. */
          .pce-modal-footer {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .pce-modal-footer .pce-btn-primary { order: 1; width: 100%; }
          .pce-modal-footer .pce-btn-secondary { order: 2; width: 100%; }
          .pce-modal-footer .pce-btn-danger-text { order: 3; width: 100%; margin-right: 0; }

          /* MOBILE FULL-WIDTH BUTTONS — all action buttons span full width.
             Exclusions: day-of-week (flex:1 already), pencil/X icons (small),
             unit sub-toggles inside other components stay sized.
             This block enforces full-width for everything else. */
          .pce-add-btn {
            width: 100%;
            justify-content: center;
          }
          .pce-weight-range-tabs {
            display: flex;
            width: 100%;
          }
          .pce-weight-range-btn {
            flex: 1 1 0;
            padding: 10px 8px;
            text-align: center;
          }
          .pce-weight-history-right {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .pce-weight-history-right .pce-weight-unit-toggle {
            display: flex;
            width: 100%;
            height: 40px;
          }
          .pce-weight-history-right .pce-weight-unit-btn {
            flex: 1 1 0;
            padding: 0 14px;
            font-size: 14px;
          }
          .pce-weight-range-row {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .pce-weight-trend {
            align-self: flex-start;
          }
        }

  /* ===== Toggle: a single, clean height-only ease — same on every section.
     Opening a section grows it to reveal the editor (expected — edit mode has
     more content); closing shrinks it back. No opacity fade and no transform,
     so there's no icon ghosting and no content drifting sideways — just a
     smooth, consistent expand/collapse. ================================== */
  .he-collapse {
    display: grid;
    grid-template-rows: 0fr;
    visibility: hidden;
    transition: grid-template-rows 0.22s cubic-bezier(0.4, 0, 0.2, 1),
                visibility 0s linear 0.22s;
  }
  .he-collapse.is-open {
    grid-template-rows: 1fr;
    visibility: visible;
    transition: grid-template-rows 0.22s cubic-bezier(0.4, 0, 0.2, 1),
                visibility 0s linear 0s;
  }
  /* Closing panel's content hides instantly so pencil and X never overlap. */
  .he-collapse > .he-collapse-inner > * { opacity: 0; }
  .he-collapse.is-open > .he-collapse-inner > * { opacity: 1; }
  .he-collapse-inner {
    overflow: hidden;
    min-height: 0;
  }
  .he-collapse.is-open .he-collapse-inner { transform: none; }
  @keyframes heGlideIn {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .he-cat-fade { animation: heCatGlide 0.42s cubic-bezier(0.33, 1, 0.68, 1) both; }
  @keyframes heCatGlide {
    from { opacity: 0; transform: translateY(8px) scale(0.99); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .he-cat-tab { transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease; }
  .he-design-opt .he-design-swatch,
  .he-vanta-card,
  .he-swatch,
  .he-rarity-opt,
  .he-preset-chip { transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease, color 0.18s ease; }
  @media (prefers-reduced-motion: reduce) {
    .he-collapse { transition: none; }
    .he-cat-fade { animation: none; }
  }

  /* ── DOUBLE-BORDER FIX for tag/extension edit forms ───────────
     In the Hero editor, TagArrayCard (Loves, Not-a-Fan, Favorite
     foods, etc.) renders its edit form as:
       he-card-section(border)  >  pce-entry-card(border)  >  pce-tag-input(border)
     producing a visible box-in-a-box double outline. The section
     already frames the content, and pce-tag-input frames the pills,
     so the MIDDLE pce-entry-card border/shadow/background is
     redundant. Scoped to .he-card-section so the Care Editor — which
     uses pce-entry-card without this shell — is unaffected. */
  .he-card-section .pce-entry-card {
    border: none;
    box-shadow: none;
    background: transparent;
    padding: 0;
    margin-bottom: 0;
  }
  /* Make the DISPLAY-state inner card (pce-list-item) use the same inner
     padding as the EDIT-state input box (pce-tag-input ~8px 10px), so the
     pills sit at the same inset whether a section is being viewed or edited.
     Previously pce-list-item used 20px, pushing display chips ~10px further
     in than edit chips — sections looked misaligned between states. Scoped to
     the hero shell so the Care Editor is unaffected. */
  .he-card-section .pce-list-item {
    padding: 15px;
    box-shadow: 0 1px 3px rgba(23,37,49,0.04);
  }
  /* Edit-mode input box: give the pills the same breathing room as the
     display card so edit mode doesn't read tighter than view mode. */
  .he-card-section .pce-tag-input {
    padding: 15px;
    gap: 8px;
  }
  .he-card-section .pce-tag-input .pce-tag-chip {
    margin: 1px 0;
  }
  /* ── SUB-CARD CONTROLS: pencil and X identical in look, size, position ──
     Every sub-card (Nickname, Loves, Not-a-Fan, Favorite foods, Tags, Their
     story, Memorial, extensions) lives in a .pce-subsection. The pencil
     (pce-icon-btn, shown when viewing) and the X (pce-form-close, shown when
     editing) must be visually IDENTICAL and occupy the EXACT same pixel so
     toggling swaps one for the other with no visible movement.

     We anchor both to the subsection's top-right corner. The edit form is
     wrapped in <Collapse> whose inner element has transform:translateY(),
     which would otherwise become the X's positioning ancestor (a transformed
     element is always the containing block for absolute children) and push
     the X down — so we strip that transform inside subsections. */
  .he-card-section .pce-subsection {
    position: relative;
  }
  .he-card-section .pce-subsection .he-collapse,
  .he-card-section .pce-subsection .he-collapse-inner,
  .he-card-section .pce-subsection .pce-inline-form {
    position: static !important;
  }
  .he-card-section .pce-subsection .he-collapse-inner {
    transform: none !important;
  }
  /* Both controls: same 28x28 transparent box, top-right of the subsection. */
  .he-card-section .pce-subsection .pce-list-item-actions,
  .he-card-section .pce-subsection .pce-form-close {
    position: absolute !important;
    top: 0 !important;
    right: 0 !important;
    bottom: auto !important;
    left: auto !important;
    width: 24px !important;
    height: 24px !important;
    min-width: 0 !important;
    min-height: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    background: transparent !important;
    border: none !important;
    border-radius: 8px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    color: var(--color-muted, #717A86) !important;
    z-index: 3;
  }
  /* The pencil button inside the actions wrapper: strip its own box so the
     wrapper above is the single 28x28 control. */
  .he-card-section .pce-subsection .pce-list-item-actions .pce-icon-btn {
    width: 100% !important;
    height: 100% !important;
    padding: 0 !important;
    background: transparent !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  .he-card-section .pce-subsection .pce-list-item-actions:hover,
  .he-card-section .pce-subsection .pce-form-close:hover {
    background: rgba(23,37,49,0.06) !important;
    color: var(--color-navy-dark, #172531) !important;
  }
  /* Identical 16px icons (the X was authored at 18, pencil at 16). */
  .he-card-section .pce-subsection .pce-form-close svg,
  .he-card-section .pce-subsection .pce-list-item-actions .pce-icon-btn svg {
    width: 16px !important;
    height: 16px !important;
  }
  .he-card-section .pce-inline-form {
    padding-top: 0;
  }
  /* Nested sub-cards (Foodie, Champion, Adventurer wrap two cards under one
     heading). Each gets its own positioning context so its pencil/X anchor to
     ITS corner, not a shared one — otherwise the second card's pencil overlaps
     the first card's X. */
  .he-card-section .pce-subsection--nested {
    margin-top: 18px;
  }
  .he-card-section .pce-subsection--nested:first-of-type {
    margin-top: 12px;
  }
  /* Memorial date validation: red error text + muted optional label. */
  .he-card-section .pce-field-error {
    color: #C2410C;
    font-size: 13px;
    font-weight: 600;
    margin: 6px 0 0;
  }
  .he-card-section .pce-label-optional {
    color: #717A86;
    font-weight: 500;
  }
  /* Rescue display: the "Adopted from X" source line sits below the story
     with clear separation so it reads as context, not as the author. */
  .he-card-section .pce-list-item-source {
    margin: 12px 0 0;
    font-size: 14px;
    font-weight: 500;
    color: #717A86;
  }
  .he-card-section .pce-list-item-source strong {
    font-weight: 700;
    color: var(--color-navy-dark, #172531);
  }
  /* More breathing room between the story and the who/where field in the
     rescue edit form (they were too close on save). */
  .he-card-section .pce-entry-card .pce-field + .pce-field {
    margin-top: 8px;
  }
`;
