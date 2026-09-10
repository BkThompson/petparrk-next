// =============================================================
// components/BrandArt.js — PetParrk brand illustrations.
//
// Style A (flat two-tone), per the Viewport & Imagery System.
// Palette is locked to the four brand colours. No gradients,
// no strokes except where a stroke IS the shape, no shadows.
//
//   terracotta #CF5C36 · navy #172531 · cream #F5F0E8 · gold #EFC88B
//
// Slot IDs map to the imagery registry:
//   ArtPricing    HOME-02a   36px, inside the 68px pillar icon box
//   ArtTriage     HOME-02b   36px, same
//   ArtRecord     HOME-02c   36px, same
//   ArtSteps      HOME-03    320×240, steps section left column
//   ArtEmptyPets  HOMEDASH-01 140×120, empty pets state
//
// All components take `size` (spots) or `width` (scenes). Every one
// is decorative-by-default: pass a `title` only when the illustration
// carries meaning the surrounding copy doesn't already state.
// =============================================================

const NAVY = "#172531";
const TERRA = "#CF5C36";
const CREAM = "#F5F0E8";
const GOLD = "#EFC88B";

function frame(title) {
  return title
    ? { role: "img", "aria-label": title }
    : { "aria-hidden": "true", focusable: "false" };
}

/* ── HOME-02a · Transparent Pricing ───────────────────────────
   A receipt with a legible price on it. Reads at 36px. */
export function ArtPricing({ size = 36, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      xmlns="http://www.w3.org/2000/svg"
      {...frame(title)}
    >
      <path
        d="M6,7 q0,-3 3,-3 h18 q3,0 3,3 V29 l-3,2 l-3,-2 l-3,2 l-3,-2 l-3,2 l-3,-2 l-3,2 l-3,-2 Z"
        fill={CREAM}
      />
      <rect
        x="10"
        y="8"
        width="16"
        height="2.4"
        rx="1.2"
        fill={NAVY}
        opacity="0.26"
      />
      <rect
        x="10"
        y="12.2"
        width="10"
        height="2.4"
        rx="1.2"
        fill={NAVY}
        opacity="0.26"
      />
      <rect
        x="17.2"
        y="14.6"
        width="1.7"
        height="14.2"
        rx="0.85"
        fill={TERRA}
      />
      <path
        d="M20.9,20 a2.9,2.25 0 1 0 -2.9,2.25 a2.9,2.25 0 1 1 -2.9,2.25"
        fill="none"
        stroke={TERRA}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── HOME-02b · AI Symptom Triage ─────────────────────────────
   A message bubble carrying a vitals trace. */
export function ArtTriage({ size = 36, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      xmlns="http://www.w3.org/2000/svg"
      {...frame(title)}
    >
      <path
        d="M4,12 q0,-6 6,-6 h16 q6,0 6,6 v9 q0,6 -6,6 h-11 l-6,5 v-5 h-3 q-2,0 -2,-2 Z"
        fill={CREAM}
      />
      <polyline
        points="9,17 13,17 15.5,12.5 19,21.5 21.5,17 27,17"
        fill="none"
        stroke={TERRA}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="29" cy="7.5" r="4.5" fill={GOLD} />
    </svg>
  );
}

/* ── HOME-02c · Pet Health History ────────────────────────────
   A record card on a clip. */
export function ArtRecord({ size = 36, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      xmlns="http://www.w3.org/2000/svg"
      {...frame(title)}
    >
      <rect x="6" y="6" width="24" height="26" rx="4" fill={CREAM} />
      <rect x="13" y="3" width="10" height="6" rx="3" fill={GOLD} />
      <rect
        x="11"
        y="14"
        width="14"
        height="2.6"
        rx="1.3"
        fill={NAVY}
        opacity="0.28"
      />
      <rect
        x="11"
        y="19"
        width="14"
        height="2.6"
        rx="1.3"
        fill={NAVY}
        opacity="0.28"
      />
      <rect x="11" y="24" width="8" height="2.6" rx="1.3" fill={TERRA} />
    </svg>
  );
}

/* ── HOME-03 · Steps section, left column ─────────────────────
   A price list with a dog waiting beside it. Sits on navy. */
export function ArtSteps({ width = 320, title }) {
  return (
    <svg
      width={width}
      viewBox="0 0 320 240"
      xmlns="http://www.w3.org/2000/svg"
      style={{ height: "auto", maxWidth: "100%", display: "block" }}
      {...frame(title)}
    >
      <g transform="rotate(-4 110 120)">
        <rect x="18" y="42" width="176" height="150" rx="14" fill={CREAM} />
        <rect
          x="38"
          y="64"
          width="70"
          height="9"
          rx="4.5"
          fill={NAVY}
          opacity="0.75"
        />
        <rect
          x="38"
          y="94"
          width="86"
          height="7"
          rx="3.5"
          fill={NAVY}
          opacity="0.2"
        />
        <rect x="140" y="90" width="36" height="15" rx="7.5" fill={TERRA} />
        <rect
          x="38"
          y="122"
          width="72"
          height="7"
          rx="3.5"
          fill={NAVY}
          opacity="0.2"
        />
        <rect x="140" y="118" width="36" height="15" rx="7.5" fill={TERRA} />
        <rect
          x="38"
          y="150"
          width="94"
          height="7"
          rx="3.5"
          fill={NAVY}
          opacity="0.2"
        />
        <rect x="140" y="146" width="36" height="15" rx="7.5" fill={GOLD} />
      </g>
      <g transform="translate(180,52)">
        <path
          d="M84,150 q18,-6 13,-22 q-3,-9 -11,-6 q-6,3 -4,10 q2,8 -4,12 Z"
          fill={TERRA}
        />
        <path
          d="M26,152 q-6,-32 8,-48 q8,-10 18,-10 q10,0 18,10 q14,16 8,48 Z"
          fill={TERRA}
        />
        <rect x="30" y="134" width="16" height="20" rx="8" fill={TERRA} />
        <rect x="58" y="134" width="16" height="20" rx="8" fill={TERRA} />
        <ellipse cx="38" cy="152" rx="8" ry="4" fill={CREAM} />
        <ellipse cx="66" cy="152" rx="8" ry="4" fill={CREAM} />
        <path
          d="M30,50 q-18,6 -18,28 q0,18 12,20 q8,-8 6,-24 q-2,-16 0,-24 Z"
          fill={TERRA}
        />
        <path
          d="M74,50 q18,6 18,28 q0,18 -12,20 q-8,-8 -6,-24 q2,-16 0,-24 Z"
          fill={TERRA}
        />
        <circle cx="52" cy="70" r="30" fill={TERRA} />
        <ellipse cx="52" cy="84" rx="15" ry="11.5" fill={CREAM} />
        <ellipse cx="52" cy="78" rx="4.6" ry="3.6" fill={NAVY} />
        <circle cx="41" cy="64" r="3.5" fill={NAVY} />
        <circle cx="63" cy="64" r="3.5" fill={NAVY} />
        <rect x="32" y="104" width="40" height="9" rx="4.5" fill={CREAM} />
        <circle cx="52" cy="119" r="7" fill={GOLD} />
      </g>
    </svg>
  );
}

/* ── HOMEDASH-01 · Empty pets state ───────────────────────────
   Sits on white. An empty bowl is the invitation. */
export function ArtEmptyPets({ width = 140, title }) {
  return (
    <svg
      width={width}
      viewBox="0 0 140 120"
      xmlns="http://www.w3.org/2000/svg"
      style={{ height: "auto", display: "block", margin: "0 auto" }}
      {...frame(title)}
    >
      <rect x="20" y="18" width="100" height="80" rx="14" fill={CREAM} />
      <rect
        x="20"
        y="18"
        width="100"
        height="80"
        rx="14"
        fill="none"
        stroke={NAVY}
        strokeOpacity="0.2"
        strokeWidth="2"
        strokeDasharray="7 5"
      />
      <circle cx="50" cy="50" r="18" fill={NAVY} opacity="0.1" />
      <g fill={NAVY} opacity="0.32">
        <ellipse
          cx="43"
          cy="45"
          rx="3.2"
          ry="4.3"
          transform="rotate(-18 43 45)"
        />
        <ellipse cx="50" cy="42" rx="3.2" ry="4.3" />
        <ellipse
          cx="57"
          cy="45"
          rx="3.2"
          ry="4.3"
          transform="rotate(18 57 45)"
        />
        <ellipse cx="50" cy="55" rx="7.5" ry="6" />
      </g>
      <rect
        x="76"
        y="42"
        width="34"
        height="7"
        rx="3.5"
        fill={NAVY}
        opacity="0.18"
      />
      <rect
        x="76"
        y="55"
        width="22"
        height="6"
        rx="3"
        fill={NAVY}
        opacity="0.12"
      />
      <circle cx="106" cy="88" r="16" fill={TERRA} />
      <rect x="104.3" y="80" width="3.4" height="16" rx="1.7" fill={CREAM} />
      <rect x="98" y="86.3" width="16" height="3.4" rx="1.7" fill={CREAM} />
    </svg>
  );
}

/* ── FINDVET-01 · No search results ───────────────────────────
   Same family as ArtEmptyPets: a cream card with a dashed edge
   meaning "nothing here", plus one terracotta object. */
export function ArtNoResults({ width = 140, title }) {
  return (
    <svg
      width={width}
      viewBox="0 0 140 120"
      xmlns="http://www.w3.org/2000/svg"
      style={{ height: "auto", display: "block", margin: "0 auto" }}
      {...frame(title)}
    >
      <rect x="18" y="22" width="94" height="72" rx="12" fill={CREAM} />
      <rect
        x="18"
        y="22"
        width="94"
        height="72"
        rx="12"
        fill="none"
        stroke={NAVY}
        strokeOpacity="0.2"
        strokeWidth="2"
        strokeDasharray="7 5"
      />
      <rect
        x="32"
        y="40"
        width="52"
        height="7"
        rx="3.5"
        fill={NAVY}
        opacity="0.16"
      />
      <rect
        x="32"
        y="55"
        width="36"
        height="6"
        rx="3"
        fill={NAVY}
        opacity="0.12"
      />
      <rect
        x="32"
        y="69"
        width="44"
        height="6"
        rx="3"
        fill={NAVY}
        opacity="0.12"
      />
      <circle cx="100" cy="80" r="19" fill={CREAM} />
      <circle
        cx="100"
        cy="80"
        r="19"
        fill="none"
        stroke={TERRA}
        strokeWidth="5"
      />
      <line
        x1="114"
        y1="94"
        x2="125"
        y2="105"
        stroke={TERRA}
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── VETSLUG-01 · No pricing yet ──────────────────────────────
   A receipt with nothing on it and an add badge, because this
   empty state is also the invitation to submit the first price. */
export function ArtNoPricing({ width = 140, title }) {
  return (
    <svg
      width={width}
      viewBox="0 0 140 120"
      xmlns="http://www.w3.org/2000/svg"
      style={{ height: "auto", display: "block", margin: "0 auto" }}
      {...frame(title)}
    >
      <path
        d="M30,32 q0,-12 12,-12 h42 q12,0 12,12 V84 l-11,7 l-11,-7 l-11,7 l-11,-7 l-11,7 l-11,-7 Z"
        fill={CREAM}
      />
      <path
        d="M30,32 q0,-12 12,-12 h42 q12,0 12,12 V84 l-11,7 l-11,-7 l-11,7 l-11,-7 l-11,7 l-11,-7 Z"
        fill="none"
        stroke={NAVY}
        strokeOpacity="0.2"
        strokeWidth="2"
        strokeDasharray="7 5"
      />
      <rect
        x="42"
        y="36"
        width="42"
        height="7"
        rx="3.5"
        fill={NAVY}
        opacity="0.16"
      />
      <rect
        x="42"
        y="50"
        width="28"
        height="6"
        rx="3"
        fill={NAVY}
        opacity="0.12"
      />
      <rect
        x="42"
        y="63"
        width="42"
        height="12"
        rx="6"
        fill="none"
        stroke={TERRA}
        strokeOpacity="0.4"
        strokeWidth="2"
        strokeDasharray="5 4"
      />
      <circle cx="103" cy="86" r="15" fill={TERRA} />
      <rect x="101.4" y="78.5" width="3.2" height="15" rx="1.6" fill={CREAM} />
      <rect x="95.5" y="84.4" width="15" height="3.2" rx="1.6" fill={CREAM} />
    </svg>
  );
}

/* ── VETSLUG-02 · Submit a price ──────────────────────────────
   Deliberately NOT a receipt. Two receipts on one page read as
   the same icon at a glance. This is the act of contributing:
   a pencil over a note. */
export function ArtSubmitPrice({ size = 44, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      xmlns="http://www.w3.org/2000/svg"
      {...frame(title)}
    >
      <rect x="4" y="7" width="21" height="24" rx="3.5" fill={CREAM} />
      <rect
        x="8"
        y="12"
        width="13"
        height="2.4"
        rx="1.2"
        fill={NAVY}
        opacity="0.26"
      />
      <rect
        x="8"
        y="17"
        width="9"
        height="2.4"
        rx="1.2"
        fill={NAVY}
        opacity="0.26"
      />
      <rect x="8" y="24" width="7" height="3.2" rx="1.6" fill={GOLD} />
      <g transform="rotate(38 25 19)">
        <path d="M21.6,30.5 l3.4,5.2 l3.4,-5.2 Z" fill={NAVY} opacity="0.75" />
        <rect x="21.6" y="27.6" width="6.8" height="3.4" fill={CREAM} />
        <rect
          x="21.6"
          y="8.5"
          width="6.8"
          height="19.4"
          rx="1.4"
          fill={TERRA}
        />
        <rect x="21.6" y="5.4" width="6.8" height="3.6" rx="1.4" fill={GOLD} />
      </g>
    </svg>
  );
}

/* ── HEALTHHISTORY-01 · No health checks yet ──────────────────
   Dashed clipboard, empty, with a terracotta vitals trace. Shares
   the pulse motif with ArtTriage so the two read as related, and
   the clipboard silhouette keeps it distinct from the other
   empty states on the site. */
export function ArtNoChecks({ width = 140, title }) {
  return (
    <svg
      width={width}
      viewBox="0 0 140 120"
      xmlns="http://www.w3.org/2000/svg"
      style={{ height: "auto", display: "block", margin: "0 auto" }}
      {...frame(title)}
    >
      <rect x="34" y="20" width="72" height="86" rx="12" fill={CREAM} />
      <rect
        x="34"
        y="20"
        width="72"
        height="86"
        rx="12"
        fill="none"
        stroke={NAVY}
        strokeOpacity="0.2"
        strokeWidth="2"
        strokeDasharray="7 5"
      />
      <rect x="58" y="11" width="24" height="16" rx="8" fill={GOLD} />
      <rect
        x="48"
        y="40"
        width="44"
        height="7"
        rx="3.5"
        fill={NAVY}
        opacity="0.16"
      />
      <rect
        x="48"
        y="53"
        width="30"
        height="6"
        rx="3"
        fill={NAVY}
        opacity="0.12"
      />
      <polyline
        points="46,80 56,80 62,68 70,92 76,80 94,80"
        fill="none"
        stroke={TERRA}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ============================================================
   SYMPTOM AREA ICONS — SCC step 1.
   These sit on white cards in a list, so they render bare at
   44px rather than in a 68px tile: seven tiles stacked would
   out-weigh the copy they label. Terracotta carries the form,
   navy adds detail, gold accents. Same flat two-tone rules.
   ============================================================ */

/* Stomach / Digestion — the organ itself. A bowl said "food", not
   "digestion". */
export function ArtStomach({ size = 44, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      xmlns="http://www.w3.org/2000/svg"
      {...frame(title)}
    >
      <path
        d="M12,4 q0,-1 1.6,-1 q1.6,0 1.6,1 v4"
        fill="none"
        stroke={TERRA}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M13,8 q10,-1 12,7 q2,8 -4,12 q-6,4 -10,0 q-4,-4 -3,-10 q1,-6 5,-9 Z"
        fill={TERRA}
      />
      <path
        d="M11,27 q-1,5 4,6 q4,1 5,-3"
        fill="none"
        stroke={TERRA}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M15,13 q5,1 6,5"
        fill="none"
        stroke={CREAM}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

/* Eyes / Ears — a dog's face, so the eyes are obviously an animal's
   and the ears are obviously ears. Separate eye + ear objects sitting
   beside each other read as neither. */
export function ArtEyes({ size = 44, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      xmlns="http://www.w3.org/2000/svg"
      {...frame(title)}
    >
      <path
        d="M10,11 q-7,2 -7,10 q0,9 6,10 q3,-4 2,-11 q-1,-6 -1,-9 Z"
        fill={GOLD}
      />
      <path
        d="M26,11 q7,2 7,10 q0,9 -6,10 q-3,-4 -2,-11 q1,-6 1,-9 Z"
        fill={GOLD}
      />
      <circle cx="18" cy="19" r="11.5" fill={TERRA} />
      <circle cx="13.6" cy="16.6" r="3.9" fill={CREAM} />
      <circle cx="22.4" cy="16.6" r="3.9" fill={CREAM} />
      <circle cx="13.6" cy="16.9" r="2" fill={NAVY} />
      <circle cx="22.4" cy="16.9" r="2" fill={NAVY} />
      <ellipse cx="18" cy="25.5" rx="6.2" ry="4.4" fill={CREAM} />
      <ellipse cx="18" cy="23.6" rx="2.3" ry="1.7" fill={NAVY} />
    </svg>
  );
}

/* Skin / Coat — a patch of skin with irritation on it. No paw: the paw
   read as "pet" and collided with every other pet mark on the site. */
export function ArtSkin({ size = 44, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      xmlns="http://www.w3.org/2000/svg"
      {...frame(title)}
    >
      <rect
        x="4"
        y="6"
        width="28"
        height="24"
        rx="7"
        fill={CREAM}
        stroke={TERRA}
        strokeWidth="2.4"
      />
      <circle cx="13" cy="14" r="2.9" fill={TERRA} />
      <circle cx="22" cy="12.5" r="2.2" fill={TERRA} />
      <circle cx="18" cy="21" r="2.6" fill={TERRA} />
      <circle cx="25.5" cy="21.5" r="1.9" fill={GOLD} />
      <circle cx="11" cy="23" r="1.7" fill={GOLD} />
    </svg>
  );
}

/* Breathing / Cough — lungs, drawn with a real gap between the lobes so
   they don't merge into one blob at 44px. */
export function ArtBreathing({ size = 44, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      xmlns="http://www.w3.org/2000/svg"
      {...frame(title)}
    >
      <path
        d="M18,5 v11"
        fill="none"
        stroke={TERRA}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M12.5,13 h11"
        fill="none"
        stroke={TERRA}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M15,15 q-8,2 -9.5,10 q-1,7 2.5,9 q4,2 6,-3 q1,-3 1,-8 Z"
        fill={TERRA}
      />
      <path
        d="M21,15 q8,2 9.5,10 q1,7 -2.5,9 q-4,2 -6,-3 q-1,-3 -1,-8 Z"
        fill={TERRA}
      />
    </svg>
  );
}

/* Behavior / Energy — a battery running low. Reads instantly at 44px,
   which a curled-up dog silhouette did not. */
export function ArtBehavior({ size = 44, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      xmlns="http://www.w3.org/2000/svg"
      {...frame(title)}
    >
      <rect
        x="3"
        y="11"
        width="26"
        height="14"
        rx="4.5"
        fill={CREAM}
        stroke={TERRA}
        strokeWidth="2.6"
      />
      <rect x="30.5" y="15" width="3.5" height="6" rx="1.6" fill={TERRA} />
      <rect x="6.5" y="14.5" width="5.5" height="7" rx="2" fill={TERRA} />
      <circle cx="21" cy="30" r="2.2" fill={GOLD} />
      <circle cx="27.5" cy="30" r="1.7" fill={GOLD} opacity="0.7" />
    </svg>
  );
}

/* Limping / Movement — a bandaged paw. Says injured limb without
   reusing the plain paw. */
export function ArtLimping({ size = 44, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      xmlns="http://www.w3.org/2000/svg"
      {...frame(title)}
    >
      <ellipse
        cx="8"
        cy="10"
        rx="3.8"
        ry="5"
        fill={TERRA}
        transform="rotate(-20 8 10)"
      />
      <ellipse cx="16" cy="6.5" rx="3.8" ry="5" fill={TERRA} />
      <ellipse
        cx="24"
        cy="9"
        rx="3.8"
        ry="5"
        fill={TERRA}
        transform="rotate(18 24 9)"
      />
      <ellipse
        cx="30"
        cy="16"
        rx="3.4"
        ry="4.5"
        fill={TERRA}
        transform="rotate(34 30 16)"
      />
      <path
        d="M17,17 q9,0 10,7 q1,7 -6,8 q-8,1 -11,-3 q-3,-5 1,-9 q2,-3 6,-3 Z"
        fill={TERRA}
      />
      <rect
        x="4"
        y="22.5"
        width="26"
        height="7"
        rx="2"
        fill={CREAM}
        transform="rotate(-14 17 26)"
      />
      <rect
        x="4"
        y="25"
        width="26"
        height="2.4"
        rx="1.2"
        fill={GOLD}
        transform="rotate(-14 17 26)"
      />
    </svg>
  );
}

/* Something else — a question mark. An ellipsis bubble read as
   "message us", which is the wrong promise. */
export function ArtSomethingElse({ size = 44, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      xmlns="http://www.w3.org/2000/svg"
      {...frame(title)}
    >
      <circle
        cx="18"
        cy="18"
        r="14.5"
        fill={CREAM}
        stroke={TERRA}
        strokeWidth="2.6"
      />
      <path
        d="M13.1,13.9 a4.9,4.9 0 1 1 4.9,5.2 v1.9"
        fill="none"
        stroke={TERRA}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle cx="18" cy="26.2" r="2.2" fill={TERRA} />
    </svg>
  );
}

/* ============================================================
   ABOUT — the three problems. These are scenes, not spots: they
   fill a 4:3 panel, so they render at panel width rather than
   the 44px spot size. Same flat two-tone rules.
   ============================================================ */

/* ABOUT-01 · Decision paralysis — "Is this an emergency?"
   The copy is specific: it's late, and what you get back is a list of
   possibilities that leaves you more worried. So: a phone at 2am, its
   screen full of conflicting answers. */
export function ArtProblemNight({ width = 420, title }) {
  return (
    <svg
      width={width}
      viewBox="0 0 400 300"
      xmlns="http://www.w3.org/2000/svg"
      style={{ height: "auto", maxWidth: "100%", display: "block" }}
      {...frame(title)}
    >
      <defs>
        <linearGradient id="ppNight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2C4657" />
          <stop offset="1" stopColor="#172531" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#ppNight)" />
      <path d="M356,30 a22,22 0 1 0 6,36 a18,18 0 1 1 -6,-36 Z" fill={GOLD} />
      <circle cx="58" cy="44" r="2.6" fill={CREAM} opacity="0.45" />
      <circle cx="104" cy="70" r="1.9" fill={CREAM} opacity="0.3" />
      <circle cx="300" cy="112" r="2" fill={CREAM} opacity="0.26" />
      {/* clock, late */}
      <circle cx="66" cy="128" r="30" fill={CREAM} opacity="0.14" />
      <circle
        cx="66"
        cy="128"
        r="30"
        fill="none"
        stroke={CREAM}
        strokeOpacity="0.3"
        strokeWidth="3"
      />
      <path
        d="M66,110 v18 l13,8"
        fill="none"
        stroke={CREAM}
        strokeOpacity="0.55"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* phone */}
      <rect x="130" y="34" width="176" height="248" rx="24" fill={NAVY} />
      <rect x="142" y="48" width="152" height="220" rx="14" fill={CREAM} />
      {/* a search, and everything it returned */}
      <rect
        x="156"
        y="64"
        width="124"
        height="20"
        rx="10"
        fill={NAVY}
        opacity="0.08"
      />
      <rect
        x="166"
        y="71"
        width="58"
        height="6"
        rx="3"
        fill={NAVY}
        opacity="0.28"
      />
      <circle cx="166" cy="106" r="9" fill={TERRA} />
      <rect x="164.6" y="100" width="2.8" height="7" rx="1.4" fill={CREAM} />
      <circle cx="166" cy="111" r="1.6" fill={CREAM} />
      <rect
        x="182"
        y="99"
        width="94"
        height="7"
        rx="3.5"
        fill={NAVY}
        opacity="0.3"
      />
      <rect
        x="182"
        y="111"
        width="66"
        height="6"
        rx="3"
        fill={NAVY}
        opacity="0.14"
      />
      <circle cx="166" cy="146" r="9" fill={GOLD} />
      <rect
        x="164.6"
        y="140"
        width="2.8"
        height="7"
        rx="1.4"
        fill={NAVY}
        opacity="0.6"
      />
      <circle cx="166" cy="151" r="1.6" fill={NAVY} opacity="0.6" />
      <rect
        x="182"
        y="139"
        width="86"
        height="7"
        rx="3.5"
        fill={NAVY}
        opacity="0.3"
      />
      <rect
        x="182"
        y="151"
        width="74"
        height="6"
        rx="3"
        fill={NAVY}
        opacity="0.14"
      />
      <circle cx="166" cy="186" r="9" fill={TERRA} opacity="0.55" />
      <rect
        x="182"
        y="179"
        width="98"
        height="7"
        rx="3.5"
        fill={NAVY}
        opacity="0.3"
      />
      <rect
        x="182"
        y="191"
        width="58"
        height="6"
        rx="3"
        fill={NAVY}
        opacity="0.14"
      />
      <circle cx="166" cy="226" r="9" fill={NAVY} opacity="0.2" />
      <rect
        x="182"
        y="219"
        width="78"
        height="7"
        rx="3.5"
        fill={NAVY}
        opacity="0.22"
      />
      <rect
        x="182"
        y="231"
        width="88"
        height="6"
        rx="3"
        fill={NAVY}
        opacity="0.1"
      />
      {/* none of it is an answer */}
      <circle cx="308" cy="228" r="40" fill={TERRA} />
      <g transform="translate(308,228) scale(2.7) translate(-18,-18)">
        <path
          d="M13.1,13.9 a4.9,4.9 0 1 1 4.9,5.2 v1.9"
          fill="none"
          stroke={CREAM}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx="18" cy="26.2" r="2.2" fill={CREAM} />
      </g>
    </svg>
  );
}

/* ABOUT-02 · Price opacity — "What will this actually cost?"
   An upright vet bill: paw letterhead, itemised lines with prices,
   and a total that is a range wide enough to be useless. */
export function ArtProblemPrice({ width = 420, title }) {
  return (
    <svg
      width={width}
      viewBox="0 0 400 300"
      xmlns="http://www.w3.org/2000/svg"
      style={{ height: "auto", maxWidth: "100%", display: "block" }}
      {...frame(title)}
    >
      <rect x="96" y="26" width="192" height="238" rx="14" fill={CREAM} />
      <ellipse
        cx="122"
        cy="56"
        rx="4.6"
        ry="6"
        fill={TERRA}
        transform="rotate(-20 122 56)"
      />
      <ellipse cx="132" cy="51" rx="4.6" ry="6" fill={TERRA} />
      <ellipse
        cx="142"
        cy="55"
        rx="4.6"
        ry="6"
        fill={TERRA}
        transform="rotate(18 142 55)"
      />
      <ellipse cx="132" cy="67" rx="10.5" ry="8" fill={TERRA} />
      <rect
        x="158"
        y="52"
        width="66"
        height="10"
        rx="5"
        fill={NAVY}
        opacity="0.7"
      />
      <rect
        x="116"
        y="92"
        width="152"
        height="2"
        rx="1"
        fill={NAVY}
        opacity="0.12"
      />
      <rect
        x="116"
        y="110"
        width="78"
        height="8"
        rx="4"
        fill={NAVY}
        opacity="0.16"
      />
      <rect
        x="228"
        y="110"
        width="40"
        height="8"
        rx="4"
        fill={NAVY}
        opacity="0.28"
      />
      <rect
        x="116"
        y="136"
        width="64"
        height="8"
        rx="4"
        fill={NAVY}
        opacity="0.16"
      />
      <rect
        x="228"
        y="136"
        width="40"
        height="8"
        rx="4"
        fill={NAVY}
        opacity="0.28"
      />
      <rect
        x="116"
        y="162"
        width="86"
        height="8"
        rx="4"
        fill={NAVY}
        opacity="0.16"
      />
      <rect
        x="228"
        y="162"
        width="40"
        height="8"
        rx="4"
        fill={NAVY}
        opacity="0.28"
      />
      <rect
        x="116"
        y="190"
        width="152"
        height="2"
        rx="1"
        fill={NAVY}
        opacity="0.12"
      />
      <rect
        x="116"
        y="210"
        width="46"
        height="10"
        rx="5"
        fill={NAVY}
        opacity="0.55"
      />
      <rect x="116" y="234" width="52" height="16" rx="8" fill={TERRA} />
      <rect
        x="176"
        y="240"
        width="18"
        height="5"
        rx="2.5"
        fill={NAVY}
        opacity="0.4"
      />
      <rect x="202" y="234" width="66" height="16" rx="8" fill={TERRA} />
      <circle cx="306" cy="222" r="42" fill={TERRA} />
      <g transform="translate(306,222) scale(2.9) translate(-18,-18)">
        <path
          d="M13.1,13.9 a4.9,4.9 0 1 1 4.9,5.2 v1.9"
          fill="none"
          stroke={CREAM}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx="18" cy="26.2" r="2.2" fill={CREAM} />
      </g>
    </svg>
  );
}
/* ABOUT-03 · Information overload — "Where is everything?"
   One dog, four different places their records live, plus loose
   sheets. Steeper angles and overlap so it reads as chaos. */
export function ArtProblemScatter({ width = 420, title }) {
  return (
    <svg
      width={width}
      viewBox="0 0 400 300"
      xmlns="http://www.w3.org/2000/svg"
      style={{ height: "auto", maxWidth: "100%", display: "block" }}
      {...frame(title)}
    >
      {/* darker wash so the cream records read as objects on a surface
          rather than blending into the panel's cream gradient */}
      <rect width="400" height="300" fill={NAVY} opacity="0.13" />
      <g transform="rotate(-19 72 70)">
        <rect x="26" y="34" width="92" height="72" rx="10" fill={CREAM} />
        <path
          d="M26,46 q0,-12 12,-12 h20 l8,10 h40 q12,0 12,12 Z"
          fill={GOLD}
        />
        <rect
          x="42"
          y="66"
          width="50"
          height="7"
          rx="3.5"
          fill={NAVY}
          opacity="0.16"
        />
        <rect x="42" y="82" width="32" height="7" rx="3.5" fill={TERRA} />
      </g>
      <g transform="rotate(24 108 42)">
        <rect
          x="82"
          y="18"
          width="62"
          height="48"
          rx="7"
          fill={CREAM}
          opacity="0.9"
        />
        <rect
          x="92"
          y="32"
          width="34"
          height="6"
          rx="3"
          fill={NAVY}
          opacity="0.14"
        />
        <rect
          x="92"
          y="45"
          width="22"
          height="5"
          rx="2.5"
          fill={NAVY}
          opacity="0.1"
        />
      </g>
      <g transform="rotate(16 326 66)">
        <rect x="296" y="24" width="60" height="94" rx="12" fill={NAVY} />
        <rect x="302" y="32" width="48" height="78" rx="6" fill={CREAM} />
        <rect
          x="312"
          y="48"
          width="28"
          height="6"
          rx="3"
          fill={NAVY}
          opacity="0.16"
        />
        <rect
          x="312"
          y="62"
          width="20"
          height="6"
          rx="3"
          fill={NAVY}
          opacity="0.12"
        />
        <circle cx="326" cy="88" r="10" fill={TERRA} />
      </g>
      <g transform="rotate(-13 262 44)">
        <rect
          x="236"
          y="24"
          width="56"
          height="42"
          rx="7"
          fill={CREAM}
          opacity="0.85"
        />
        <rect
          x="246"
          y="36"
          width="30"
          height="6"
          rx="3"
          fill={NAVY}
          opacity="0.12"
        />
        <rect x="246" y="48" width="18" height="5" rx="2.5" fill={GOLD} />
      </g>
      <g transform="rotate(14 62 222)">
        <rect x="18" y="188" width="88" height="68" rx="10" fill={CREAM} />
        <rect
          x="32"
          y="206"
          width="46"
          height="7"
          rx="3.5"
          fill={NAVY}
          opacity="0.16"
        />
        <rect
          x="32"
          y="222"
          width="56"
          height="6"
          rx="3"
          fill={NAVY}
          opacity="0.12"
        />
        <rect x="32" y="238" width="24" height="7" rx="3.5" fill={GOLD} />
      </g>
      <g transform="rotate(-21 336 226)">
        <path
          d="M294,194 h84 q8,0 8,8 v50 q0,8 -8,8 h-84 q-8,0 -8,-8 v-50 q0,-8 8,-8 Z"
          fill={CREAM}
        />
        <path
          d="M288,199 l48,30 l48,-30"
          fill="none"
          stroke={TERRA}
          strokeWidth="5"
          strokeLinejoin="round"
        />
      </g>
      <path
        d="M170,270 q-6,-30 8,-44 q10,-10 22,-10 q12,0 22,10 q14,14 8,44 Z"
        fill={TERRA}
      />
      <rect x="174" y="254" width="17" height="20" rx="8.5" fill={TERRA} />
      <rect x="209" y="254" width="17" height="20" rx="8.5" fill={TERRA} />
      <ellipse cx="182" cy="272" rx="9" ry="4.4" fill={CREAM} />
      <ellipse cx="218" cy="272" rx="9" ry="4.4" fill={CREAM} />
      <path
        d="M178,180 q-18,6 -18,28 q0,18 12,20 q8,-8 6,-24 q-2,-16 0,-24 Z"
        fill={TERRA}
      />
      <path
        d="M222,180 q18,6 18,28 q0,18 -12,20 q-8,-8 -6,-24 q2,-16 0,-24 Z"
        fill={TERRA}
      />
      <circle cx="200" cy="200" r="30" fill={TERRA} />
      <ellipse cx="200" cy="214" rx="15" ry="11.5" fill={CREAM} />
      <ellipse cx="200" cy="208" rx="4.6" ry="3.6" fill={NAVY} />
      <circle cx="189" cy="194" r="3.5" fill={NAVY} />
      <circle cx="211" cy="194" r="3.5" fill={NAVY} />
      {/* one brow up: the difference between a dog sitting and a dog
          that has no idea where anything is */}
      <path
        d="M183,184 q6,-4 12,-1"
        fill="none"
        stroke={NAVY}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M206,181 q6,-2 12,3"
        fill="none"
        stroke={NAVY}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* an unsure mouth: the brows alone left the face neutral */}
      <path
        d="M193,218 q3.5,3 7,0 q3.5,-3 7,0"
        fill="none"
        stroke={NAVY}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.75"
      />
      <circle cx="248" cy="150" r="26" fill={TERRA} />
      <g transform="translate(248,150) scale(1.75) translate(-18,-18)">
        <path
          d="M13.1,13.9 a4.9,4.9 0 1 1 4.9,5.2 v1.9"
          fill="none"
          stroke={CREAM}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx="18" cy="26.2" r="2.2" fill={CREAM} />
      </g>
    </svg>
  );
}

/* CONTACT-01 · The dog brings the message, indoors, in daylight.
   The panel behind this is navy, so the scene paints its own warm
   background — the room should feel bright, not nocturnal. */
export function ArtContact({ width = 340, title }) {
  return (
    <svg
      width={width}
      viewBox="0 0 300 300"
      xmlns="http://www.w3.org/2000/svg"
      style={{ height: "auto", maxWidth: "100%", display: "block" }}
      {...frame(title)}
    >
      <defs>
        <linearGradient id="ppRoom" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EFE6D8" />
          <stop offset="1" stopColor="#E3D6C3" />
        </linearGradient>
        <linearGradient id="ppSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EFC88B" />
          <stop offset="1" stopColor="#F7E3C4" />
        </linearGradient>
      </defs>
      <rect width="300" height="300" fill="url(#ppRoom)" />
      <path d="M0,236 h300 v64 H0 Z" fill={GOLD} opacity="0.32" />
      <rect x="0" y="232" width="300" height="5" fill={NAVY} opacity="0.07" />
      {/* window, sun outside */}
      <rect x="28" y="40" width="92" height="104" rx="8" fill="url(#ppSky)" />
      <circle cx="94" cy="70" r="15" fill={CREAM} opacity="0.85" />
      <path d="M28,104 q24,-20 46,-8 q22,12 46,-4" fill={GOLD} opacity="0.5" />
      <rect
        x="24"
        y="36"
        width="100"
        height="112"
        rx="10"
        fill="none"
        stroke={CREAM}
        strokeWidth="9"
      />
      <rect
        x="24"
        y="36"
        width="100"
        height="112"
        rx="10"
        fill="none"
        stroke={NAVY}
        strokeOpacity="0.12"
        strokeWidth="2.5"
      />
      <path d="M74,40 v104 M28,92 h92" stroke={CREAM} strokeWidth="6" />
      {/* framed picture, filling the wall beside the window */}
      <rect x="174" y="52" width="76" height="62" rx="6" fill={CREAM} />
      <rect
        x="182"
        y="60"
        width="60"
        height="46"
        rx="4"
        fill={NAVY}
        opacity="0.12"
      />
      <circle cx="229" cy="74" r="7" fill={GOLD} opacity="0.8" />
      <path
        d="M182,106 l18,-20 l14,14 l12,-10 l16,16 Z"
        fill={TERRA}
        opacity="0.45"
      />
      {/* plant */}
      <path d="M246,236 h34 l-5,-38 h-24 Z" fill={TERRA} opacity="0.75" />
      <path
        d="M263,198 q-24,-6 -22,-32 q22,2 22,32 Z"
        fill={NAVY}
        opacity="0.5"
      />
      <path
        d="M263,198 q24,-10 20,-38 q-22,6 -20,38 Z"
        fill={NAVY}
        opacity="0.42"
      />
      {/* armchair */}
      <path
        d="M34,236 v-46 q0,-16 16,-16 h44 q16,0 16,16 v46 Z"
        fill={NAVY}
        opacity="0.14"
      />
      <rect
        x="24"
        y="198"
        width="18"
        height="38"
        rx="8"
        fill={NAVY}
        opacity="0.2"
      />
      <rect
        x="102"
        y="198"
        width="18"
        height="38"
        rx="8"
        fill={NAVY}
        opacity="0.2"
      />
      <rect
        x="44"
        y="188"
        width="56"
        height="12"
        rx="6"
        fill={GOLD}
        opacity="0.6"
      />
      {/* rug */}
      <ellipse cx="160" cy="264" rx="112" ry="22" fill={TERRA} opacity="0.16" />
      <ellipse cx="160" cy="264" rx="84" ry="15" fill={TERRA} opacity="0.14" />
      {/* dog, trotting in with the mail */}
      <ellipse cx="158" cy="268" rx="62" ry="9" fill={NAVY} opacity="0.1" />
      <path
        d="M116,256 q-10,-40 14,-56 q26,-16 54,-6 q28,10 24,44 l-2,18 Z"
        fill={GOLD}
      />
      <path
        d="M206,234 q26,-10 26,-32 q0,-12 -11,-11 q-10,1 -9,12 q1,16 -12,20 Z"
        fill={GOLD}
      />
      <rect x="126" y="238" width="18" height="24" rx="9" fill={GOLD} />
      <rect x="176" y="238" width="18" height="24" rx="9" fill={GOLD} />
      <ellipse cx="135" cy="260" rx="10" ry="5" fill={CREAM} />
      <ellipse cx="185" cy="260" rx="10" ry="5" fill={CREAM} />
      <path
        d="M122,168 q-20,8 -18,30 q2,20 16,20 q7,-10 6,-26 q-1,-16 -4,-24 Z"
        fill={TERRA}
      />
      <path
        d="M182,168 q20,8 18,30 q-2,20 -16,20 q-7,-10 -6,-26 q1,-16 4,-24 Z"
        fill={TERRA}
      />
      <circle cx="152" cy="184" r="34" fill={GOLD} />
      <circle cx="140" cy="174" r="4" fill={NAVY} />
      <circle cx="165" cy="174" r="4" fill={NAVY} />
      <g transform="rotate(-6 154 214)">
        <rect x="104" y="194" width="100" height="42" rx="7" fill={CREAM} />
        <rect
          x="104"
          y="194"
          width="100"
          height="42"
          rx="7"
          fill="none"
          stroke={NAVY}
          strokeOpacity="0.1"
          strokeWidth="2"
        />
        <path
          d="M104,198 l50,26 l50,-26"
          fill="none"
          stroke={TERRA}
          strokeWidth="5"
          strokeLinejoin="round"
        />
      </g>
      <ellipse cx="154" cy="198" rx="14" ry="10" fill={GOLD} />
      <ellipse cx="154" cy="193" rx="5" ry="4" fill={NAVY} />
      {/* Green, not terracotta: this badge means "delivered", and green is
          the convention for that. Muted and slightly desaturated so it sits
          with cream, navy and gold rather than reading as a generic success
          tick. Terracotta stays the "selected" colour elsewhere. */}
      <circle cx="224" cy="174" r="22" fill="#2E8B57" />
      <path
        d="M214,174 l6,7 l13,-15"
        fill="none"
        stroke={CREAM}
        strokeWidth="5.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── SAVEDVET-01 · No saved vets yet ──────────────────────────
   Dashed card with a heart outline. Same family as the other
   empty states: cream object, dashed edge, one terracotta mark. */
export function ArtNoSavedVets({ width = 140, title }) {
  return (
    <svg
      width={width}
      viewBox="0 0 140 120"
      xmlns="http://www.w3.org/2000/svg"
      style={{ height: "auto", display: "block", margin: "0 auto" }}
      {...frame(title)}
    >
      <rect x="22" y="22" width="96" height="76" rx="12" fill={CREAM} />
      <rect
        x="22"
        y="22"
        width="96"
        height="76"
        rx="12"
        fill="none"
        stroke={NAVY}
        strokeOpacity="0.2"
        strokeWidth="2"
        strokeDasharray="7 5"
      />
      <rect
        x="36"
        y="40"
        width="42"
        height="7"
        rx="3.5"
        fill={NAVY}
        opacity="0.16"
      />
      <rect
        x="36"
        y="54"
        width="30"
        height="6"
        rx="3"
        fill={NAVY}
        opacity="0.12"
      />
      <rect x="36" y="72" width="22" height="7" rx="3.5" fill={GOLD} />
      <path
        d="M100,86 c-7,-5 -11,-8.5 -11,-13 a5.6,5.6 0 0 1 11,-2.7 a5.6,5.6 0 0 1 11,2.7 c0,4.5 -4,8 -11,13 Z"
        fill="none"
        stroke={TERRA}
        strokeWidth="3.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── SAVEDVET-02 · No results for a filter ────────────────────
   Reuses the magnifier language from ArtNoResults on FindVet —
   same problem, so it should look the same. */
export function ArtNoMatches({ width = 140, title }) {
  return (
    <svg
      width={width}
      viewBox="0 0 140 120"
      xmlns="http://www.w3.org/2000/svg"
      style={{ height: "auto", display: "block", margin: "0 auto" }}
      {...frame(title)}
    >
      <rect x="18" y="22" width="94" height="72" rx="12" fill={CREAM} />
      <rect
        x="18"
        y="22"
        width="94"
        height="72"
        rx="12"
        fill="none"
        stroke={NAVY}
        strokeOpacity="0.2"
        strokeWidth="2"
        strokeDasharray="7 5"
      />
      <rect
        x="32"
        y="40"
        width="52"
        height="7"
        rx="3.5"
        fill={NAVY}
        opacity="0.16"
      />
      <rect
        x="32"
        y="55"
        width="36"
        height="6"
        rx="3"
        fill={NAVY}
        opacity="0.12"
      />
      <rect
        x="32"
        y="69"
        width="44"
        height="6"
        rx="3"
        fill={NAVY}
        opacity="0.12"
      />
      <circle cx="100" cy="80" r="19" fill={CREAM} />
      <circle
        cx="100"
        cy="80"
        r="19"
        fill="none"
        stroke={TERRA}
        strokeWidth="5"
      />
      <line
        x1="114"
        y1="94"
        x2="125"
        y2="105"
        stroke={TERRA}
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ============================================================
   PET CARD — the three feature spots on the signed-out page.
   Same treatment as the Home pillars: 44px art in a 68px tile.
   Silhouettes deliberately differ — all three are "a card", so
   the shape of each has to carry the difference, not the detail.
   ============================================================ */

/* PETCARD-01 · Care Card — the practical record. The original
   drawing, scaled to fill the 44px box: same shapes, more of the
   frame used, so it reads larger without changing the tile. */
export function ArtCareCard({ size = 44, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      xmlns="http://www.w3.org/2000/svg"
      {...frame(title)}
    >
      <rect x="4" y="2" width="33" height="40" rx="5.5" fill={CREAM} />
      <rect x="4" y="2" width="33" height="8.5" rx="4.25" fill={NAVY} />
      <rect
        x="9"
        y="16.5"
        width="22"
        height="3.2"
        rx="1.6"
        fill={NAVY}
        opacity="0.18"
      />
      <rect
        x="9"
        y="23.5"
        width="15"
        height="3.2"
        rx="1.6"
        fill={NAVY}
        opacity="0.18"
      />
      <circle cx="30" cy="31" r="10" fill={TERRA} />
      <rect x="28.4" y="25.8" width="3.2" height="10.4" rx="1.6" fill={CREAM} />
      <rect x="24.8" y="29.4" width="10.4" height="3.2" rx="1.6" fill={CREAM} />
    </svg>
  );
}

/* PETCARD-02 · Hero Card — the collectible. Original drawing at
   full size. */
export function ArtHeroCard({ size = 44, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      xmlns="http://www.w3.org/2000/svg"
      {...frame(title)}
    >
      <g transform="rotate(-9 22 22)">
        <rect x="7" y="2" width="30" height="40" rx="6" fill={GOLD} />
        <rect x="11.5" y="6.5" width="21" height="24" rx="3.5" fill={CREAM} />
        <path
          d="M22 10l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5-4.7-4.6 6.5-.9Z"
          fill={TERRA}
        />
        <rect
          x="13"
          y="34"
          width="18"
          height="3.2"
          rx="1.6"
          fill={NAVY}
          opacity="0.22"
        />
      </g>
    </svg>
  );
}

/* PETCARD-03 · Share anywhere — one card, copies leaving it.
   Original drawing at full size. */
export function ArtShareCard({ size = 44, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      xmlns="http://www.w3.org/2000/svg"
      {...frame(title)}
    >
      <rect
        x="16"
        y="2"
        width="26"
        height="18"
        rx="4"
        fill={GOLD}
        opacity="0.55"
      />
      <rect x="11" y="8" width="26" height="18" rx="4" fill={GOLD} />
      <rect x="2" y="16" width="30" height="24" rx="5" fill={CREAM} />
      <rect x="2" y="16" width="30" height="6.5" rx="3.25" fill={NAVY} />
      <rect
        x="7"
        y="28"
        width="14"
        height="3.2"
        rx="1.6"
        fill={NAVY}
        opacity="0.18"
      />
      <rect x="7" y="34" width="9" height="3.2" rx="1.6" fill={TERRA} />
      <path
        d="M33 24l7-7"
        fill="none"
        stroke={TERRA}
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M35.5 16.5h5.5V22"
        fill="none"
        stroke={TERRA}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ============================================================
   SYMPTOM CHECKER — the three "how it works" steps. Same
   treatment as the Home pillars: 44px art in a 68px tile.
   ============================================================ */

/* SCH-01 · Pick the area — a horizontal list with one row
   chosen, which is the shape of the step itself. A 2x2 grid read
   as a generic app-menu icon; a list reads as choosing from
   options. */
export function ArtPickArea({ size = 44, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      xmlns="http://www.w3.org/2000/svg"
      {...frame(title)}
    >
      <rect x="2" y="5" width="40" height="10" rx="5" fill="#FFFFFF" />
      <circle cx="9" cy="10" r="3" fill={GOLD} />
      <rect
        x="16"
        y="8"
        width="18"
        height="4"
        rx="2"
        fill={NAVY}
        opacity="0.18"
      />

      <rect x="2" y="17" width="40" height="10" rx="5" fill={TERRA} />
      <circle cx="9" cy="22" r="3" fill={CREAM} />
      <rect
        x="16"
        y="20"
        width="14"
        height="4"
        rx="2"
        fill={CREAM}
        opacity="0.75"
      />
      <path
        d="M34 22l2 2 3.5-4"
        fill="none"
        stroke={CREAM}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <rect x="2" y="29" width="40" height="10" rx="5" fill="#FFFFFF" />
      <circle cx="9" cy="34" r="3" fill={GOLD} />
      <rect
        x="16"
        y="32"
        width="21"
        height="4"
        rx="2"
        fill={NAVY}
        opacity="0.18"
      />
    </svg>
  );
}

/* SCH-02 · How long — a clock, with the elapsed wedge marked. */
export function ArtHowLong({ size = 44, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      xmlns="http://www.w3.org/2000/svg"
      {...frame(title)}
    >
      <circle cx="22" cy="23" r="17" fill="#FFFFFF" />
      <path d="M22 23V9a14 14 0 0 1 12.1 7Z" fill={GOLD} />
      <circle
        cx="22"
        cy="23"
        r="17"
        fill="none"
        stroke={NAVY}
        strokeWidth="3"
      />
      <path
        d="M22 13v10l7 4"
        fill="none"
        stroke={TERRA}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="18" y="2" width="8" height="4" rx="2" fill={NAVY} />
    </svg>
  );
}

/* SCH-03 · Severity — three rising bars, the tallest in
   terracotta. Reads as a scale rather than a measurement. */
export function ArtSeverity({ size = 44, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      xmlns="http://www.w3.org/2000/svg"
      {...frame(title)}
    >
      <rect x="4" y="26" width="10" height="14" rx="3.5" fill={GOLD} />
      <rect x="17" y="18" width="10" height="22" rx="3.5" fill={GOLD} />
      <rect x="30" y="8" width="10" height="32" rx="3.5" fill={TERRA} />
      <path
        d="M6 17q7-9 16-9"
        fill="none"
        stroke={NAVY}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray="0.1 5"
        opacity="0.35"
      />
    </svg>
  );
}
