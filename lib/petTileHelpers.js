// =============================================================
// petTileHelpers.js — shared helpers + palette + ClampedMedline
// Single source of truth for the pet-tile UI, used by the shared
// PetTile component and the profile / pet-card pages.
// =============================================================
import { useState, useRef, useEffect } from "react";
import {
  Dog,
  Cat,
  Bird,
  Rabbit,
  Fish,
  Shapes,
  TreePine,
  Flame,
  Moon,
  Gem,
  Anchor,
} from "lucide-react";

// ---- Colours ----
// Interface colours come from the tokens (lib/tokens.js ← app/globals.css).
// Re-exported so existing `import { C } from "../lib/petTileHelpers"` keeps
// working. The banner palette lives in lib/palettes.js.
export { C } from "./tokens";
import { BANNER_PALETTE, SPECIES_CARD_GRADIENT } from "./palettes";
export { BANNER_PALETTE };

// ---- Species -> lucide icon ----
export const BANNER_LUCIDE = {
  dog: Dog,
  cat: Cat,
  bird: Bird,
  small_furry: Rabbit,
  reptile_fish: Fish,
  // Different shapes grouped together — an assortment. Sparkles read as
  // "magic", which is Auto's job, and PawPrint is already used elsewhere.
  mixed: Shapes,
};

// The custom swatches are named for their colour, so each icon is an
// association with the name rather than a definition. Anchor for Mono Navy is
// a play on the word; swap for Waves or Mountain if that reads too cute.
export const CUSTOM_LUCIDE = {
  emerald: TreePine,
  copper: Flame,
  teal: Moon,
  rose: Gem,
  mono: Anchor,
};

// ---- Weight helpers ----
export function convertWeightToDisplay(lbsValue, displayUnit) {
  if (lbsValue == null || lbsValue === "" || isNaN(Number(lbsValue)))
    return lbsValue;
  if (displayUnit === "kg") return Number(lbsValue) * 0.453592;
  return Number(lbsValue);
}

/* Inverse of convertWeightToDisplay. The DB stores weight_value in lbs
   ALWAYS; weight_unit is only a display preference. Anything writing a
   user-entered weight must pass it through here first. */
export function convertDisplayToLbs(displayValue, displayUnit) {
  if (
    displayValue == null ||
    displayValue === "" ||
    isNaN(Number(displayValue))
  )
    return displayValue;
  if (displayUnit === "kg") return Number(displayValue) * 2.20462;
  return Number(displayValue);
}

/* ────────────────────────────────────────────────────────────────────────
   The weight boundary. USE THESE, not the raw converters above.

   `weight_value` means two different things depending on where it lives:
     • in the DB  — a NUMBER, always canonical lbs
     • in a form  — a STRING, in the user's chosen display unit

   Forgetting which side you are on has caused four separate bugs: a save
   that stored kg into an lbs column, a load that skipped the conversion,
   a dirty-check that compared a display string to a canonical number, and
   a Care editor form that showed lbs under a kg label.

   Route every read through petFormWeight() and every write through
   petWeightFromForm(). The direction is then in the name, and a comparison
   is safe as long as both sides come from petFormWeight().
   ──────────────────────────────────────────────────────────────────────── */

/** DB row -> the string a form input should hold. Always display units. */
export function petFormWeight(pet) {
  if (!pet || pet.weight_value == null || pet.weight_value === "") return "";
  const display = convertWeightToDisplay(
    pet.weight_value,
    pet.weight_unit || "lbs",
  );
  if (display == null || isNaN(Number(display))) return "";
  return String(smartRoundWeight(display));
}

/** Form input -> the number the DB column should hold. Always canonical lbs. */
export function petWeightFromForm(value, unit) {
  if (value == null || value === "" || isNaN(Number(value))) return null;
  return smartRoundWeight(convertDisplayToLbs(value, unit || "lbs"));
}

/** True when a form's weight differs from what the pet row already holds. */
export function petWeightChanged(formValue, formUnit, pet) {
  return (
    (formValue ?? "") !== petFormWeight(pet) ||
    (formUnit || "lbs") !== (pet?.weight_unit || "lbs")
  );
}

/** Re-express a display value in a different display unit (form-local only). */
export function convertDisplayUnit(value, fromUnit, toUnit) {
  if (value == null || value === "" || isNaN(Number(value))) return value;
  if ((fromUnit || "lbs") === (toUnit || "lbs")) return value;
  const lbs = convertDisplayToLbs(value, fromUnit || "lbs");
  return smartRoundWeight(convertWeightToDisplay(lbs, toUnit || "lbs"));
}

export function smartRoundWeight(v) {
  if (v == null || isNaN(v)) return v;
  const n = Number(v);
  const asInt = Math.round(n);
  if (Math.abs(n - asInt) < 0.15) return asInt;
  return Math.round(n * 10) / 10;
}

// ---- Species bucket + gradient ----
export function speciesBucket(species) {
  if (!species) return null;
  const s = String(species).toLowerCase().trim();
  if (s.startsWith("dog")) return "dog";
  if (s.startsWith("cat")) return "cat";
  if (s.startsWith("bird")) return "bird";
  if (
    s.startsWith("rabbit") ||
    s.startsWith("hamster") ||
    s.startsWith("guinea") ||
    s.startsWith("ferret") ||
    s.startsWith("otter") ||
    s.startsWith("rat") ||
    s.startsWith("mouse")
  )
    return "small_furry";
  if (
    s.startsWith("reptile") ||
    s.startsWith("fish") ||
    s.startsWith("snake") ||
    s.startsWith("lizard") ||
    s.startsWith("turtle") ||
    s.startsWith("frog") ||
    s.startsWith("gecko")
  )
    return "reptile_fish";
  return null;
}

export function speciesCardGradient(species) {
  const bucket = speciesBucket(species);
  return SPECIES_CARD_GRADIENT[bucket] || SPECIES_CARD_GRADIENT.default;
}

// ---- Age formatter ----
export function formatAge(birthday) {
  if (!birthday) return null;
  const birthMs = new Date(birthday).getTime();
  if (isNaN(birthMs)) return null;
  const diffMs = Date.now() - birthMs;
  if (diffMs < 0) return "Not born yet";
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 7) return days <= 1 ? "1 day" : `${days} days`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return w === 1 ? "1 week" : `${w} weeks`;
  }
  const months = Math.floor(days / 30.44);
  if (months < 24) return months === 1 ? "1 month" : `${months} months`;
  const years = Math.floor(days / 365.25);
  return years === 1 ? "1 year" : `${years} years`;
}

// ---- Field meaningfulness (used by ClampedMedline) ----
export function meaningfulField(val) {
  if (!val) return null;
  const lower = String(val).trim().toLowerCase();
  if (
    !lower ||
    lower === "none" ||
    lower === "nothing" ||
    lower === "n/a" ||
    lower === "na" ||
    lower === "no" ||
    lower === "-"
  )
    return null;
  return val;
}

// ---- Clamped med line (Allergies / Meds) with Read more ----
export function ClampedMedline({ C, label, value, accent }) {
  const text = meaningfulField(value) ? value.trim() : "None";

  // Two coordinated states (mirrors the Pet editor's NotesSection):
  //   `expanded`   — user intent; drives the max-height target.
  //   `cssClamped` — actual clamp class; on expand it's removed before the
  //                  height grows; on collapse it's re-applied only after the
  //                  height finishes shrinking (via onTransitionEnd), so the
  //                  text doesn't snap-clamp then animate empty space.
  const [expanded, setExpanded] = useState(false);
  const [cssClamped, setCssClamped] = useState(true);

  const textRef = useRef(null);
  const [isLong, setIsLong] = useState(false);
  const [clampedHeight, setClampedHeight] = useState(0);
  const [fullHeight, setFullHeight] = useState(0);

  useEffect(() => {
    if (!textRef.current) return;
    const el = textRef.current;
    function measure() {
      if (!textRef.current) return;
      // Measure the natural (unclamped) full height.
      const wasClamped = el.classList.contains("pp-medvalue-clamp");
      el.classList.remove("pp-medvalue-clamp");
      // Force reflow so scrollHeight reflects the unclamped layout.
      void el.offsetHeight;
      const fh = el.scrollHeight;
      // Compute the height of exactly 2 lines from the resolved line-height,
      // rather than toggling the clamp class (which gives unreliable reads).
      const cs = window.getComputedStyle(el);
      let lh = parseFloat(cs.lineHeight);
      if (Number.isNaN(lh)) lh = parseFloat(cs.fontSize) * 1.4;
      const twoLine = lh * 2;
      if (wasClamped) el.classList.add("pp-medvalue-clamp");
      setClampedHeight(Math.round(twoLine));
      setFullHeight(fh);
      // Only offer Read more when the text genuinely exceeds 2 lines.
      setIsLong(fh > twoLine + 2);
    }
    measure();
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(() => requestAnimationFrame(measure));
    }
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(measure).catch(() => {});
    }
    // Re-measure on resize: a wider card may fit the text in ≤2 lines, in
    // which case "Read more" should disappear (and vice-versa).
    if (typeof window !== "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
  }, [text]);

  useEffect(() => {
    if (expanded) setCssClamped(false);
    // On collapse, cssClamped stays false until the height transition ends.
  }, [expanded]);

  function handleTransitionEnd(e) {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== "max-height") return;
    if (!expanded) setCssClamped(true);
  }

  const targetHeight = expanded ? fullHeight : clampedHeight;
  const maxHeightStyle = targetHeight ? `${targetHeight}px` : "none";

  return (
    <div className="pp-medline">
      <span className="pp-medline-label">{label}</span>
      <div
        className="pp-medline-clip"
        style={{ maxHeight: maxHeightStyle }}
        onTransitionEnd={handleTransitionEnd}
      >
        <span
          ref={textRef}
          className={`pp-medline-value${cssClamped ? " pp-medvalue-clamp" : ""}`}
          style={{ color: accent }}
        >
          {text}
        </span>
      </div>
      {isLong && (
        <button
          type="button"
          className="pp-medline-toggle"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {expanded ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
}

// ─── Moved from ProfileMain/ProfileUsername (were byte-identical) ────────

export const SESSION_KEY = "petparrk_symptom_session";

export function pageGradient(key) {
  const stops = BANNER_PALETTE[key]?.stops || BANNER_PALETTE.mixed.stops;
  return `linear-gradient(15deg, ${stops[0]} 0%, ${stops[1]} 30%, ${stops[2]} 65%, ${stops[3]} 100%)`;
}

export function shortenForChip(raw, max = 20) {
  const v = meaningfulField(raw);
  if (!v) return null;
  const first = String(v).split(/[,;]/)[0].trim();
  if (first.length > max) return first.slice(0, max - 1) + "…";
  return first;
}

export function autoBannerKey(pets) {
  if (!pets || pets.length === 0) return "mixed";
  const buckets = new Set();
  pets.forEach((p) => {
    const b = speciesBucket(p.species) || "other";
    buckets.add(b);
  });
  if (buckets.size > 1) return "mixed";
  const only = [...buckets][0];
  return BANNER_PALETTE[only] ? only : "mixed";
}
