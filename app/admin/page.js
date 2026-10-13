"use client";

import { useEffect, useState, useRef, memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
// Arrows come from Lucide so Prev/Skip match every other arrow in the
// product. The rest of this file uses hand-rolled SVG for its nav marks;
// those stay as they are.
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { svgHex } from "../../lib/tokens";
import { smoothScroll } from "../../lib/a11y";

const ADMIN_EMAILS = ["bkalthompson@gmail.com", "maggie.tursi@gmail.com"];

// Temporary guard: pause live "Sync now" writes while the upgraded
// source-aware sync route is being finished. Preview (dry-run) is unaffected.
// Flip to false to re-enable live sync once the new route is deployed.
const SYNC_WRITE_DISABLED = false;

const TABS = [
  "Submissions",
  "Pending Vets",
  "Price Conflicts",
  "Price Reports",
  "Vets",
  "Prices",
  "Call Sheet",
  "Users",
  "Pets",
  "Team",
  "Waitlist",
  "Symptom Logs",
];

// Sidebar nav grouping. Icons are inline lucide-style SVGs.
const _navIco = (d) => (
  <svg aria-hidden="true"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {d}
  </svg>
);
const NAV_GROUPS = [
  {
    label: "Review",
    tabs: [
      {
        name: "Dashboard",
        icon: _navIco(
          <>
            <rect x="3" y="3" width="7" height="9" />
            <rect x="14" y="3" width="7" height="5" />
            <rect x="14" y="12" width="7" height="9" />
            <rect x="3" y="16" width="7" height="5" />
          </>,
        ),
      },
      {
        name: "Submissions",
        icon: _navIco(
          <>
            <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
            <path d="M8 7h8M8 11h8M8 15h5" />
          </>,
        ),
      },
      {
        name: "Pending Vets",
        icon: _navIco(
          <>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </>,
        ),
      },
      {
        name: "Price Conflicts",
        icon: _navIco(
          <>
            <path d="M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z" />
            <path d="M2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z" />
            <path d="M7 21h10" />
            <path d="M12 3v18" />
            <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
          </>,
        ),
      },
      {
        name: "Price Reports",
        icon: _navIco(
          <>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </>,
        ),
      },
    ],
  },
  {
    label: "Directory",
    tabs: [
      {
        name: "Vets",
        icon: _navIco(
          <>
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
            <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
            <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
            <path d="M10 6h4M10 10h4M10 14h4M10 18h4" />
          </>,
        ),
      },
      {
        name: "Prices",
        icon: _navIco(
          <>
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </>,
        ),
      },
      {
        name: "Call Sheet",
        icon: _navIco(
          <>
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0122 16.92z" />
          </>,
        ),
      },
    ],
  },
  {
    label: "People",
    tabs: [
      {
        name: "Users",
        icon: _navIco(
          <>
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </>,
        ),
      },
      {
        name: "Pets",
        icon: _navIco(
          <>
            <circle cx="11" cy="4" r="2" />
            <circle cx="18" cy="8" r="2" />
            <circle cx="20" cy="16" r="2" />
            <path d="M9 10a5 5 0 015 5v3.5a3.5 3.5 0 01-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 015.5 10Z" />
          </>,
        ),
      },
      {
        name: "Team",
        icon: _navIco(
          <>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </>,
        ),
      },
      {
        name: "Waitlist",
        icon: _navIco(
          <>
            <path d="M4 4h16v16H4z" />
            <path d="M22 6l-10 7L2 6" />
          </>,
        ),
      },
    ],
  },
  {
    label: "Logs",
    tabs: [
      {
        name: "Symptom Logs",
        icon: _navIco(
          <>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
          </>,
        ),
      },
    ],
  },
];

// Must match the vets_vet_type_allowed constraint in the database. Hospital
// and Vaccine Clinic already existed in the data but were missing here, so
// Susan could see those vets but not set or unset the type.
const VET_TYPES = [
  "General Practice",
  "Emergency",
  "Urgent Care",
  "Specialty",
  "Hospital",
  "Holistic",
  "Low-Cost / Non-Profit",
  "Vaccine Clinic",
  "Animal Shelter",
  "Mobile / House Call",
];
const OWNERSHIP_TYPES = ["Independent", "Corporate", "Other"];
const STATUS_TYPES = ["active", "inactive", "pending"];

const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
  "District of Columbia",
];

// Map 2-letter codes (from the ZIP/Places lookups) to full state names.
const STATE_ABBR_TO_NAME = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia",
};
function stateToFull(s) {
  if (!s) return s;
  return STATE_ABBR_TO_NAME[s.toUpperCase()] || s;
}

// Turn a clinic name into a URL slug: lowercase, strip punctuation, hyphenate.
// Format a phone number to match the vet slug page: (555) 555-5555.
function formatPhone(p) {
  if (!p) return null;
  const d = p.replace(/\D/g, "");
  if (d.length === 10)
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === "1")
    return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return p;
}

function slugify(name) {
  return (name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Parse an hours string (the vet-slug format) back into structured day data so
// the picker can display existing hours. Format per line: "Monday: 8:00 AM - 6:00 PM"
// or split: "Monday: 9:00 AM - 12:00 PM, 2:00 PM - 6:00 PM".
function parseHoursToStructure(str) {
  const base = {};
  DAYS_OF_WEEK.forEach((d) => (base[d] = { open: false, ranges: [] }));
  if (!str) return base;
  str
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      const idx = line.indexOf(":");
      if (idx === -1) return;
      const day = line.slice(0, idx).trim();
      const rest = line.slice(idx + 1).trim();
      const dayKey = DAYS_OF_WEEK.find(
        (d) => d.toLowerCase() === day.toLowerCase(),
      );
      if (!dayKey) return;
      if (/closed/i.test(rest)) {
        base[dayKey] = { open: false, ranges: [] };
        return;
      }
      if (/24\s*hour|open 24/i.test(rest)) {
        base[dayKey] = { open: true, allDay: true, ranges: [] };
        return;
      }
      const ranges = rest.split(",").map((r) => {
        const [from, to] = r.split(/\s*[-–]\s*/).map((x) => x.trim());
        const norm = (t) =>
          (t || "")
            .replace(/\s*(AM|am)\s*$/, " am")
            .replace(/\s*(PM|pm)\s*$/, " pm")
            .trim();
        return { from: norm(from), to: norm(to) };
      });
      base[dayKey] = { open: true, ranges };
    });
  return base;
}

// Build the vet-slug hours string from structured day data.
function buildHoursString(structure) {
  return DAYS_OF_WEEK.filter((d) => structure[d]?.open)
    .map((d) => {
      if (structure[d].allDay) return `${d}: Open 24 hours`;
      const ranges = structure[d].ranges
        .filter((r) => r.from && r.to)
        .map((r) => `${r.from} – ${r.to}`)
        .join(", ");
      return ranges ? `${d}: ${ranges}` : null;
    })
    .filter(Boolean)
    .join("\n");
}

// Time options for the hours picker dropdowns (15-min increments).
const TIME_OPTIONS = (() => {
  const out = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      const ampm = h < 12 ? "am" : "pm";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const mm = m.toString().padStart(2, "0");
      out.push(`${h12}:${mm} ${ampm}`);
    }
  }
  return out;
})();
const PRICE_TYPES = ["exact", "range", "starting"];

const TRIAGE_CONFIG = {
  EMERGENCY: {
    color: "var(--color-error-text)",
    bg: "var(--color-error-light)",
    border: "rgb(var(--color-error-rgb) / 0.24)",
    label: "Emergency",
  },
  SEE_VET: {
    color: "var(--color-caution-text)",
    bg: "var(--color-caution-light)",
    border: "rgb(var(--color-caution-rgb) / 0.4)",
    label: "See a Vet Soon",
  },
  MONITOR: {
    color: "var(--color-success-text)",
    bg: "var(--color-success-light)",
    border: "rgb(var(--color-success-text-rgb) / 0.22)",
    label: "Monitor at Home",
  },
};

// ── Strip tracking params and normalize website URLs before saving ──────────
// Removes ?utm_source=... and other query params Google Places appends.
// Also strips http:// / https:// prefix and trailing slashes.
function cleanWebsiteUrl(url) {
  if (!url) return null;
  return (
    url
      .replace(/\?.*$/, "") // strip query params like ?utm_source=...
      .replace(/^https?:\/\//, "") // strip http:// or https://
      .replace(/\/$/, "") // strip trailing slash
      .trim() || null
  );
}

// ── Auto-lookup neighborhood from Google Geocoding API ──────────────────────
// Same lookup, returning coordinates as well. New vets need latitude and
// longitude so "vets near you" can rank by real distance — before the backfill
// only 24 of 79 had them, because nothing recorded them at approval. Using the
// one Google call for both avoids paying for it twice.
async function lookupAddress(address, city, zipCode) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return {};
    const res = await fetch("/api/geocode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ address, city, zipCode }),
    });
    if (!res.ok) return {};
    const data = await res.json();
    return {
      neighborhood: data.neighborhood || null,
      latitude: typeof data.lat === "number" ? data.lat : null,
      longitude: typeof data.lng === "number" ? data.lng : null,
    };
  } catch (err) {
    console.error("Address lookup failed:", err);
    return {};
  }
}

// Classify a submission line for the Submissions review UI.
// mapped = has a resolved service_id; product = flagged product/non-service;
// unmapped = a real service line we couldn't match to the 18 services.
function subClassify(item) {
  if (item.service_id) return "mapped";
  if (
    item.extraction_confidence === "unmapped" ||
    item._classification === "product" ||
    item._classification === "unmapped_product"
  )
    return "product";
  if (item.service_name && !item.service_id) return "unmapped";
  return item.service_id ? "mapped" : "unmapped";
}

// Small inline icons (stroke style, matching lucide) for the Submissions tab.
const _ico = (paths) => (
  <svg aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="18"
    height="18"
  >
    {paths}
  </svg>
);
const SubSearchIcon = () =>
  _ico(
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.3-4.3" />
    </>,
  );
const SubReceiptIcon = () =>
  _ico(
    <>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </>,
  );
const SubManualIcon = () =>
  _ico(
    <>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z" />
    </>,
  );
const SubCheckIcon = () => (
  <svg aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="15"
    height="15"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
const SubWarnIcon = () => (
  <svg aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="15"
    height="15"
  >
    <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);
const ChevronRight = ({ size = 15 }) => (
  <svg aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);
const SubInboxIcon = () => (
  <svg aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="40"
    height="40"
  >
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
  </svg>
);

// Structured day-by-day hours editor with split-hours support. Produces the
// exact newline format the vet slug page parses.
// Keep only a safe subset of formatting tags from editor HTML before storing.
// Only admins (you + Susan) can write these, but we strip to an allowlist
// anyway so nothing unexpected can ever be saved or rendered.
function sanitizeRichText(html) {
  if (!html) return "";
  if (typeof document === "undefined") return html;
  const allowed = new Set([
    "STRONG",
    "B",
    "EM",
    "I",
    "P",
    "BR",
    "UL",
    "OL",
    "LI",
    "A",
  ]);
  // Dropped with their contents. Unwrapping one of these to text used to dump
  // its source into the note — pasting from a web page could leave a block of
  // CSS or the text of a script sitting under a price. Inert either way, but
  // it has no business being there.
  const dropped = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "TEMPLATE",
    "IFRAME",
    "OBJECT",
    "EMBED",
    "APPLET",
    "META",
    "LINK",
    "HEAD",
    "TITLE",
  ]);
  // Disallowed tags that are block-level in the browser, so dropping them
  // loses a line break rather than just a wrapper. contentEditable produces
  // DIV for every Enter keypress (Chrome's default paragraph separator), which
  // is why two typed lines used to come back joined into one: the DIV was
  // flattened to bare text and the break went with it. These become <p>, which
  // is allowed, styled, and renders as its own line everywhere a note is shown.
  //
  // Table and list *containers* are deliberately not here. Turning TABLE and
  // TR into paragraphs as well as their cells produced <p><p><p>a</p></p></p>,
  // which no browser renders as written. They unwrap instead, so only the
  // cells become lines.
  const blockish = new Set([
    "DIV",
    "SECTION",
    "ARTICLE",
    "ASIDE",
    "MAIN",
    "HEADER",
    "FOOTER",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "BLOCKQUOTE",
    "PRE",
    "ADDRESS",
    "FIGCAPTION",
    "DD",
    "DT",
    "TD",
    "TH",
  ]);
  const container = document.createElement("div");
  container.innerHTML = html;
  // insideP tracks whether we're already inside a paragraph. A block nested in
  // one can't become another <p> — <p> cannot contain <p>, and the browser
  // silently closes the outer one, scrambling the order. It becomes a <br>
  // plus its contents, which keeps the line break without the invalid nesting.
  const walk = (node, insideP) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === 1) {
        if (dropped.has(child.tagName)) {
          node.removeChild(child);
          continue;
        }
        if (!allowed.has(child.tagName)) {
          // A <p> can hold neither another <p> nor a list, so a block that
          // contains one of those can't become a paragraph either — the
          // browser would close the <p> early and reorder what follows. Those
          // unwrap instead; the list or paragraph inside already carries the
          // break that the wrapper was there for.
          const holdsBlock = child.querySelector
            ? !!child.querySelector("p, ul, ol")
            : false;
          if (blockish.has(child.tagName) && !insideP && !holdsBlock) {
            // Keep the break: swap the block for a <p> holding the same
            // children, then clean those as normal.
            const p = document.createElement("p");
            while (child.firstChild) p.appendChild(child.firstChild);
            node.replaceChild(p, child);
            walk(p, true);
            continue;
          }
          // Inline wrapper (SPAN, FONT, a pasted <mark>…), a table or list
          // container, or a block already inside a paragraph — unwrap it in
          // place, keeping its children rather than collapsing them to text.
          // textContent was being used here, which threw away any formatting
          // inside: "<span>a <b>bold</b> word</span>" came back unbolded.
          //
          // Clean the inside first, then lift the cleaned children out, so
          // nothing nested escapes the allowlist by being hoisted past it.
          walk(child, insideP);
          if (blockish.has(child.tagName) && child.previousSibling) {
            node.insertBefore(document.createElement("br"), child);
          }
          while (child.firstChild) {
            node.insertBefore(child.firstChild, child);
          }
          node.removeChild(child);
          continue;
        } else if (child.tagName === "A") {
          // For links, keep only a safe http(s) href; strip everything else.
          const href = child.getAttribute("href") || "";
          while (child.attributes.length > 0) {
            child.removeAttribute(child.attributes[0].name);
          }
          if (/^https?:\/\//i.test(href)) {
            child.setAttribute("href", href);
            child.setAttribute("target", "_blank");
            child.setAttribute("rel", "noopener noreferrer");
          }
          walk(child, insideP);
        } else {
          // Strip all attributes (no styles, classes, event handlers, etc.)
          while (child.attributes.length > 0) {
            child.removeAttribute(child.attributes[0].name);
          }
          // Normalize <b>/<i> to <strong>/<em>
          if (child.tagName === "B" || child.tagName === "I") {
            const repl = document.createElement(
              child.tagName === "B" ? "strong" : "em",
            );
            repl.innerHTML = child.innerHTML;
            node.replaceChild(repl, child);
            walk(repl, insideP);
            continue;
          }
          walk(child, insideP || child.tagName === "P");
        }
      } else if (child.nodeType === 8) {
        // strip comment nodes
        node.removeChild(child);
      }
    }
  };
  walk(container, false);
  // Paragraphs with nothing at all in them — left behind by the unwrapping
  // above, and by browsers splitting invalid markup before we see it. A <p>
  // holding just a <br> is kept: that's a blank line someone typed on purpose.
  container.querySelectorAll("p").forEach((p) => {
    if (p.childNodes.length === 0) p.remove();
  });
  return container.innerHTML.trim();
}

// Lightweight rich-text editor using the browser's contentEditable. No external
// dependency. Toolbar: Bold, Italic, Bullet list. Produces sanitized HTML.
// A collapsible list in the sync result. Replaces a native <details>: that
// element puts its marker on the left, can't be restyled to a chevron without
// fighting two vendor pseudo-elements, and has no way to animate its height.
// Same button + grid-template-rows pattern as the sheet-format guide, so the
// two disclosures in this tab behave identically.
function SyncDetail({ label, tone, defaultOpen = false, children }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className={`adm-sync-detail${tone ? ` ${tone}` : ""}`}>
      <button
        type="button"
        className="adm-sync-detail-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {/* The label and the chevron are one inline run, not two flex items.
            Twice now a flex layout here has pushed the arrow to the far edge
            of the panel — once from justify-content, once from something
            stretching the button. As inline content the arrow sits after the
            last word because that is where the text ends; no width rule
            anywhere can separate them. */}
        {label}{" "}
        <svg
          className={`adm-sync-chev${open ? " open" : ""}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div className={`adm-sync-detail-wrap${open ? " open" : ""}`}>
        <div className="adm-sync-detail-inner">{children}</div>
      </div>
    </div>
  );
}

const RichTextEditor = memo(function RichTextEditor({
  value,
  onChange,
  placeholder,
}) {
  const ref = useRef(null);
  const [focused, setFocused] = useState(false);
  // The latest value, for the mount-time write below. A ref rather than
  // reading the prop directly, so the attach callback can't close over a
  // stale render.
  const valueRef = useRef(value);
  valueRef.current = value;

  // Content written the moment the node exists. A ref callback runs in the
  // commit phase, before the browser paints — the effect below used to be the
  // only writer, and effects run AFTER paint, so the field was visibly blank
  // for a frame and then filled. That flash is what read as the editor being
  // slow to populate.
  const attach = useCallback((node) => {
    ref.current = node;
    if (node && node.innerHTML !== (valueRef.current || "")) {
      node.innerHTML = valueRef.current || "";
    }
  }, []);

  // Only push external value into the DOM when the editor is NOT focused
  // (i.e. loading a different vet). During active typing we never rewrite
  // innerHTML — that would reset the cursor to the top.
  //
  // Still needed alongside the callback above: that one fires once, on mount,
  // while this handles a value that arrives or changes later.
  useEffect(() => {
    if (ref.current && !focused && ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused]);

  const exec = (command) => {
    document.execCommand(command, false, null);
    if (ref.current) onChange(sanitizeRichText(ref.current.innerHTML));
    ref.current?.focus();
  };

  const onInput = () => {
    if (ref.current) onChange(sanitizeRichText(ref.current.innerHTML));
  };

  const isEmpty = !value || value === "<br>" || value === "<p></p>";

  return (
    <div className="adm-rte">
      <div className="adm-rte-toolbar">
        <button
          type="button"
          className="adm-rte-btn"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("bold");
          }}
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className="adm-rte-btn"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("italic");
          }}
          title="Italic"
        >
          <span style={{ fontStyle: "italic", fontFamily: "Georgia, serif" }}>
            I
          </span>
        </button>
        <button
          type="button"
          className="adm-rte-btn"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("insertUnorderedList");
          }}
          title="Bullet list"
        >
          <svg aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          className="adm-rte-btn"
          onMouseDown={(e) => {
            e.preventDefault();
            const url = window.prompt("Link URL (https://…)");
            if (url) {
              const safe = /^https?:\/\//i.test(url) ? url : `https://${url}`;
              document.execCommand("createLink", false, safe);
              if (ref.current)
                onChange(sanitizeRichText(ref.current.innerHTML));
            }
            ref.current?.focus();
          }}
          title="Add link"
        >
          <svg aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </button>
      </div>
      <div className="adm-rte-editor-wrap">
        {isEmpty && placeholder && (
          <span className="adm-rte-placeholder">{placeholder}</span>
        )}
        <div
          ref={attach}
          className="adm-rte-editor"
          contentEditable
          suppressContentEditableWarning
          onInput={onInput}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onInput();
          }}
        />
      </div>
    </div>
  );
});

function HoursPicker({ value, onChange }) {
  const structure = parseHoursToStructure(value);

  const update = (next) => onChange(buildHoursString(next));

  const toggleDay = (day) => {
    const next = { ...structure };
    if (next[day].open) {
      next[day] = { open: false, ranges: [] };
    } else {
      next[day] = { open: true, ranges: [{ from: "9:00 am", to: "5:00 pm" }] };
    }
    update(next);
  };

  const setRange = (day, i, field, v) => {
    const next = { ...structure };
    const ranges = next[day].ranges.map((r, ri) =>
      ri === i ? { ...r, [field]: v } : r,
    );
    next[day] = { ...next[day], ranges };
    update(next);
  };

  const addRange = (day) => {
    const next = { ...structure };
    next[day] = {
      ...next[day],
      ranges: [...next[day].ranges, { from: "2:00 pm", to: "6:00 pm" }],
    };
    update(next);
  };

  const removeRange = (day, i) => {
    const next = { ...structure };
    const ranges = next[day].ranges.filter((_, ri) => ri !== i);
    next[day] = { ...next[day], ranges: ranges.length ? ranges : [] };
    if (ranges.length === 0) next[day].open = false;
    update(next);
  };

  return (
    <div className="adm-hours">
      {DAYS_OF_WEEK.map((day) => {
        const d = structure[day];
        return (
          <div key={day} className="adm-hours-row">
            <button
              type="button"
              className={`adm-hours-day${d.open ? " open" : ""}`}
              onClick={() => toggleDay(day)}
            >
              <span className="adm-perm-box">
                {d.open && (
                  <svg aria-hidden="true"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-white)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </span>
              {day}
            </button>

            {d.open ? (
              d.allDay ? (
                <div className="adm-hours-ranges">
                  <div className="adm-hours-24">
                    <span className="adm-hours-24-label">Open 24 hours</span>
                    <button
                      type="button"
                      className="adm-hours-add"
                      onClick={() => {
                        const next = { ...structure };
                        next[day] = {
                          open: true,
                          allDay: false,
                          ranges: [{ from: "9:00 am", to: "5:00 pm" }],
                        };
                        update(next);
                      }}
                    >
                      Set specific hours
                    </button>
                  </div>
                </div>
              ) : (
                <div className="adm-hours-ranges">
                  {d.ranges.map((r, i) => (
                    <div key={i} className="adm-hours-range">
                      <select aria-label={`${day} opens`}
                        className="adm-field-input adm-field-select adm-hours-time"
                        value={r.from}
                        onChange={(e) =>
                          setRange(day, i, "from", e.target.value)
                        }
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <span className="adm-hours-dash">–</span>
                      <select aria-label={`${day} closes`}
                        className="adm-field-input adm-field-select adm-hours-time"
                        value={r.to}
                        onChange={(e) => setRange(day, i, "to", e.target.value)}
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      {d.ranges.length > 1 && (
                        <button
                          type="button"
                          className="adm-hours-x"
                          onClick={() => removeRange(day, i)}
                          aria-label="Remove range"
                        >
                          <svg aria-hidden="true"
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="adm-hours-actions">
                    <button
                      type="button"
                      className="adm-hours-add"
                      onClick={() => addRange(day)}
                    >
                      + Split hours
                    </button>
                    <button
                      type="button"
                      className="adm-hours-add"
                      onClick={() => {
                        const next = { ...structure };
                        next[day] = { open: true, allDay: true, ranges: [] };
                        update(next);
                      }}
                    >
                      24 hours
                    </button>
                  </div>
                </div>
              )
            ) : (
              <span className="adm-hours-closed">Closed</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VetForm({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
  submitLabel,
  verifyChecks,
  setVerifyChecks,
}) {
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const [slugEdited, setSlugEdited] = useState(false);
  const [showSlug, setShowSlug] = useState(false);
  const [zipLooking, setZipLooking] = useState(false);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [placeFilled, setPlaceFilled] = useState(false);

  // Auto-search Google Places as the user types (debounced 400ms).
  useEffect(() => {
    const q = placeQuery.trim();
    if (q.length < 3) {
      setPlaceResults([]);
      return;
    }
    let cancelled = false;
    setPlaceSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/vet-lookup?q=${encodeURIComponent(q)}`,
        );
        if (res.ok && !cancelled) {
          const data = await res.json();
          setPlaceResults(data.results || []);
        }
      } catch (e) {
        // soft-fail
      }
      if (!cancelled) setPlaceSearching(false);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [placeQuery]);

  const pickPlace = async (placeId) => {
    setPlaceSearching(true);
    try {
      const res = await fetch(
        `/api/admin/vet-lookup?place_id=${encodeURIComponent(placeId)}`,
      );
      if (res.ok) {
        const d = await res.json();
        setForm((p) => ({
          ...p,
          name: d.name || p.name,
          slug: slugEdited ? p.slug : slugify(d.name || p.name),
          address: d.address || p.address,
          city: d.city || p.city,
          state: stateToFull(d.state) || p.state,
          zip_code: d.zip_code || p.zip_code,
          neighborhood: d.neighborhood || p.neighborhood,
          phone: d.phone || p.phone,
          website: d.website || p.website,
          hours: d.hours || p.hours,
        }));
        setPlaceFilled(true);
        setPlaceResults([]);
        setPlaceQuery("");
      }
    } catch (e) {
      // soft-fail
    }
    setPlaceSearching(false);
  };

  // Slug auto-generates from the name unless the user has manually edited it.
  const onNameChange = (name) => {
    setForm((p) => ({
      ...p,
      name,
      slug: slugEdited ? p.slug : slugify(name),
    }));
  };

  // When a full 5-digit ZIP is entered, look up city/state via the secure
  // server route and autofill. Fails silently to manual entry.
  const onZipChange = async (zip) => {
    set("zip_code", zip);
    const zip5 = zip.trim().slice(0, 5);
    if (!/^\d{5}$/.test(zip5)) return;
    setZipLooking(true);
    try {
      const res = await fetch(`/api/admin/zip-lookup?zip=${zip5}`);
      if (res.ok) {
        const data = await res.json();
        setForm((p) => ({
          ...p,
          city: data.city || p.city,
          state: stateToFull(data.state) || p.state,
        }));
      }
    } catch (e) {
      // soft-fail: leave fields for manual entry
    }
    setZipLooking(false);
  };
  return (
    <div className="adm-pv-editform">
      <div className="adm-vet-lookup">
        <label className="adm-field-label">Find on Google</label>
        <p className="adm-vet-lookup-hint">
          Start typing a clinic name to autofill address, phone, website &
          hours.
        </p>
        <div className="adm-vet-lookup-row">
          <input aria-label="Vet name to look up"
            className="adm-field-input"
            value={placeQuery}
            onChange={(e) => setPlaceQuery(e.target.value)}
            placeholder="e.g. Berkeley Dog & Cat Hospital"
          />
          {placeSearching && (
            <span className="adm-vet-lookup-spinner">Searching…</span>
          )}
        </div>
        {placeResults.length > 0 && (
          <div className="adm-vet-lookup-results">
            {placeResults.map((r) => (
              <button
                key={r.place_id}
                type="button"
                className="adm-vet-lookup-result"
                onClick={() => pickPlace(r.place_id)}
              >
                <span className="adm-vet-lookup-name">{r.name}</span>
                <span className="adm-vet-lookup-addr">{r.address}</span>
              </button>
            ))}
          </div>
        )}
        {placeFilled && (
          <p className="adm-vet-lookup-filled">
            ✓ Autofilled from Google — review and adjust below.
          </p>
        )}
      </div>

      <div className="adm-pv-fieldgrid">
        <div className="adm-field">
          <label className="adm-field-label">Name *</label>
          <input aria-label="Name"
            className="adm-field-input"
            value={form.name || ""}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Clinic name"
          />
        </div>
        <div className="adm-field">
          <label className="adm-field-label">Status</label>
          <select aria-label="Status"
            className="adm-field-input adm-field-select"
            value={form.status || "active"}
            onChange={(e) => set("status", e.target.value)}
          >
            {STATUS_TYPES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="adm-field">
          <label className="adm-field-label">Neighborhood</label>
          <input aria-label="Neighborhood"
            className="adm-field-input"
            value={form.neighborhood || ""}
            onChange={(e) => set("neighborhood", e.target.value)}
          />
        </div>
        <div className="adm-field">
          <label className="adm-field-label">City</label>
          <input aria-label="City"
            className="adm-field-input"
            value={form.city || ""}
            onChange={(e) => set("city", e.target.value)}
          />
        </div>
        <div className="adm-field">
          <label className="adm-field-label">State</label>
          <select aria-label="State"
            className="adm-field-input adm-field-select"
            value={form.state || ""}
            onChange={(e) => set("state", e.target.value)}
          >
            <option value="">—</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="adm-field">
          <label className="adm-field-label">Address</label>
          <input aria-label="Address"
            className="adm-field-input"
            value={form.address || ""}
            onChange={(e) => set("address", e.target.value)}
          />
        </div>
        <div className="adm-field">
          <label className="adm-field-label">
            ZIP{zipLooking ? " · looking up…" : ""}
          </label>
          <input aria-label={`ZIP${zipLooking ? " · looking up…" : ""}`}
            className="adm-field-input"
            value={form.zip_code || ""}
            onChange={(e) => onZipChange(e.target.value)}
            placeholder="Autofills city & state"
          />
        </div>
        <div className="adm-field">
          <label className="adm-field-label">Phone</label>
          <input aria-label="Phone"
            className="adm-field-input"
            value={form.phone || ""}
            onChange={(e) => set("phone", e.target.value)}
          />
        </div>
        <div className="adm-field">
          <label className="adm-field-label">Website</label>
          <input aria-label="Website"
            className="adm-field-input"
            value={form.website || ""}
            onChange={(e) => set("website", e.target.value)}
            placeholder="clinicname.com"
          />
        </div>
        <div className="adm-field">
          <label className="adm-field-label">Ownership</label>
          <select aria-label="Ownership"
            className="adm-field-input adm-field-select"
            value={
              form.ownership?.startsWith("Other:")
                ? "Other"
                : form.ownership || ""
            }
            onChange={(e) => set("ownership", e.target.value)}
          >
            <option value="">— Select —</option>
            {OWNERSHIP_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="adm-field">
          <label className="adm-field-label">Accepting patients</label>
          <select aria-label="Accepting patients"
            className="adm-field-input adm-field-select"
            value={
              form.accepting_new_patients === null ||
              form.accepting_new_patients === undefined
                ? ""
                : form.accepting_new_patients
                  ? "yes"
                  : "no"
            }
            onChange={(e) =>
              set(
                "accepting_new_patients",
                e.target.value === "" ? null : e.target.value === "yes",
              )
            }
          >
            <option value="">— Select —</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <div className="adm-field">
          <label className="adm-field-label">CareCredit</label>
          <select aria-label="CareCredit"
            className="adm-field-input adm-field-select"
            value={
              form.carecredit === null || form.carecredit === undefined
                ? ""
                : form.carecredit
                  ? "yes"
                  : "no"
            }
            onChange={(e) =>
              set(
                "carecredit",
                e.target.value === "" ? null : e.target.value === "yes",
              )
            }
          >
            <option value="">— Select —</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <div className="adm-field">
          <label className="adm-field-label">Last verified</label>
          <input aria-label="Last verified"
            className="adm-field-input"
            type="date"
            value={form.last_verified || ""}
            onChange={(e) => set("last_verified", e.target.value)}
          />
        </div>
      </div>

      <div className="adm-field" style={{ marginBottom: "16px" }}>
        <label className="adm-field-label">Vet type</label>
        <div className="adm-perms-grid">
          {VET_TYPES.map((t) => {
            const on = (form.vet_type || []).includes(t);
            return (
              <button
                key={t}
                type="button"
                className={`adm-perm${on ? " on" : ""}`}
                onClick={() => {
                  const cur = form.vet_type || [];
                  set(
                    "vet_type",
                    on ? cur.filter((x) => x !== t) : [...cur, t],
                  );
                }}
              >
                <span className="adm-perm-box">
                  {on && (
                    <svg aria-hidden="true"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-white)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </span>
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div className="adm-field" style={{ marginBottom: "16px" }}>
        <label className="adm-field-label">Hours</label>
        <HoursPicker
          value={form.hours || ""}
          onChange={(v) => set("hours", v)}
        />
      </div>
      <div className="adm-field" style={{ marginBottom: "16px" }}>
        <label className="adm-field-label">Public pricing note</label>
        <p className="adm-vet-lookup-hint" style={{ margin: "0 0 8px" }}>
          Shown to visitors under this clinic's prices (e.g. "All prices are
          estimates — call to confirm").
        </p>
        <RichTextEditor
          value={form.pricing_note || ""}
          onChange={(v) => set("pricing_note", v)}
          placeholder="Leave blank if none"
        />
      </div>
      <div className="adm-field" style={{ marginBottom: "16px" }}>
        <label className="adm-field-label">Internal notes</label>
        <p className="adm-vet-lookup-hint" style={{ margin: "0 0 8px" }}>
          Admin-only — never shown publicly.
        </p>
        <RichTextEditor
          value={form.internal_notes || ""}
          onChange={(v) => set("internal_notes", v)}
          placeholder="Admin-only notes"
        />
      </div>

      <div className="adm-vet-pageurl">
        <span className="adm-field-label">Page URL</span>
        <span className="adm-vet-pageurl-path">
          /vet/{form.slug || slugify(form.name) || "…"}
        </span>
        {!showSlug ? (
          <button
            type="button"
            className="adm-vet-pageurl-edit"
            onClick={() => setShowSlug(true)}
          >
            Edit
          </button>
        ) : (
          <input aria-label="Page address"
            className="adm-field-input adm-vet-pageurl-input"
            value={form.slug || ""}
            onChange={(e) => {
              setSlugEdited(true);
              set("slug", slugify(e.target.value));
            }}
            placeholder="page-url"
          />
        )}
      </div>

      {form.status === "active" && verifyChecks && (
        <div className="adm-vet-checklist">
          <p className="adm-vet-checklist-title">
            Verify each field before activating
          </p>
          {[
            {
              key: "address",
              label: "Address & ZIP verified",
              href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((form.address || "") + " " + (form.city || "") + " " + (form.zip_code || ""))}`,
              linkLabel: "Open in Maps",
            },
            {
              key: "phone",
              label: "Phone number verified",
              href: form.website
                ? `https://${form.website}`
                : `https://www.google.com/search?q=${encodeURIComponent((form.name || "") + " " + (form.city || "") + " phone number")}`,
              linkLabel: form.website ? "Check website" : "Search Google",
            },
            {
              key: "website",
              label: "Website verified",
              href: `https://www.google.com/search?q=${encodeURIComponent((form.name || "") + " " + (form.city || "") + " official website")}`,
              linkLabel: "Search Google",
            },
            {
              key: "hours",
              label: "Hours verified",
              href: form.website
                ? `https://${form.website}`
                : `https://www.google.com/search?q=${encodeURIComponent((form.name || "") + " " + (form.city || "") + " hours")}`,
              linkLabel: form.website ? "Check website" : "Search Google",
            },
            {
              key: "neighborhood",
              label: "Neighborhood verified",
              href: `https://www.google.com/search?q=${encodeURIComponent("What neighborhood is " + (form.address || "") + " " + (form.city || "") + " in?")}`,
              linkLabel: "Search Google",
            },
            {
              key: "ownership",
              label: "Ownership verified (corporate or independent)",
              href: `https://www.google.com/search?q=${encodeURIComponent("Is " + (form.name || "") + " " + (form.city || "") + " corporate or independently owned vet?")}`,
              linkLabel: "Search Google",
            },
          ].map(({ key, label, href, linkLabel }) => {
            const on = !!verifyChecks[key];
            return (
              <div key={key} className="adm-vet-check-row">
                <button
                  type="button"
                  className={`adm-vet-check${on ? " on" : ""}`}
                  onClick={() =>
                    setVerifyChecks((prev) => ({ ...prev, [key]: !on }))
                  }
                >
                  <span className="adm-perm-box">
                    {on && (
                      <svg aria-hidden="true"
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--color-white)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                  {label}
                </button>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="adm-vet-check-link"
                >
                  {linkLabel}
                </a>
              </div>
            );
          })}
        </div>
      )}

      <div className="adm-pv-editform-actions">
        {onCancel && (
          <button className="adm-b adm-b-outline" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button
          className="adm-b adm-b-primary"
          onClick={onSave}
          disabled={
            saving ||
            !form.name ||
            (form.status === "active" &&
              verifyChecks &&
              !Object.values(verifyChecks).every(Boolean))
          }
        >
          {saving ? "Saving…" : submitLabel || "Save"}
        </button>
      </div>
    </div>
  );
}

// A vaccine-package service unlocks a "vaccines included" field, matching the
// public submit-a-price form.
function isVaccinePackage(name) {
  return name && name.toLowerCase().includes("vaccine package");
}

// Shared price add/edit form — used by both the Add Price and inline Edit flows.
function PriceForm({
  form,
  setForm,
  services,
  onSave,
  onCancel,
  saving,
  submitLabel,
  error,
}) {
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Group services by category for the dropdown.
  const grouped = {};
  (services || []).forEach((s) => {
    const cat = s.category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  });
  const catOrder = [
    "Exam",
    "Vaccine",
    "Dental",
    "Surgery",
    "Diagnostics",
    "Preventive",
    "Emergency",
    "Treatment",
    "Other",
  ];
  const sortedCats = [
    ...new Set([...catOrder, ...Object.keys(grouped)]),
  ].filter((c) => grouped[c]);

  const speciesIsOther =
    form.species === "other" ||
    (form.species &&
      !["dog", "cat", "rabbit", "bird", "other", ""].includes(form.species));

  const cfq = !!form.call_for_quote;
  const selectedService = (services || []).find(
    (s) => s.id === form.service_id,
  );
  const isVaxPkg = isVaccinePackage(selectedService?.name);
  const isRange = form.price_type === "range";

  return (
    <div className="adm-pv-editform adm-priceform">
      <div className="adm-pf-grid">
        <div className="adm-field adm-pf-full">
          <label className="adm-field-label">Service *</label>
          <select aria-label="Service"
            className={`adm-field-input adm-field-select${error && !form.service_id ? " adm-field-error" : ""}`}
            value={form.service_id || ""}
            onChange={(e) => set("service_id", e.target.value)}
          >
            <option value="">— Select —</option>
            {sortedCats.map((cat) => (
              <optgroup key={cat} label={cat}>
                {grouped[cat].map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {isVaxPkg && (
          <div className="adm-field adm-pf-full">
            <label className="adm-field-label">Vaccines included</label>
            <input aria-label="Vaccines included"
              className="adm-field-input"
              value={form.vaccines_included || ""}
              onChange={(e) => set("vaccines_included", e.target.value)}
              placeholder="e.g. Rabies, DHPP, Bordetella…"
            />
            <p className="adm-vet-lookup-hint" style={{ margin: "6px 0 0" }}>
              Displays publicly on the vet profile.
            </p>
          </div>
        )}

        <div className="adm-field adm-pf-full">
          <label className="adm-cfq-check">
            <input
              type="checkbox"
              checked={cfq}
              onChange={(e) => set("call_for_quote", e.target.checked)}
            />
            <span>No set price — clinic asks you to call for a quote</span>
          </label>
        </div>

        {!cfq && (
          <>
            <div className="adm-field adm-pf-full">
              <label className="adm-field-label">Price type *</label>
              <div className="adm-seg-group">
                {PRICE_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`adm-seg-btn${form.price_type === t ? " active" : ""}${error && !form.price_type ? " adm-seg-error" : ""}`}
                    onClick={() => set("price_type", t)}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="adm-field adm-pf-full">
              {isRange ? (
                <div className="adm-price-lowhigh">
                  <div className="adm-field">
                    <label className="adm-field-label">Price low *</label>
                    <input aria-label="Price low"
                      className={`adm-field-input${error && !form.price_low ? " adm-field-error" : ""}`}
                      type="number"
                      step="0.01"
                      value={form.price_low || ""}
                      onChange={(e) => set("price_low", e.target.value)}
                      placeholder="e.g. 65.00"
                    />
                  </div>
                  <div className="adm-field">
                    <label className="adm-field-label">Price high *</label>
                    <input aria-label="Price high"
                      className="adm-field-input"
                      type="number"
                      step="0.01"
                      value={form.price_high || ""}
                      onChange={(e) => set("price_high", e.target.value)}
                      placeholder="e.g. 120.00"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <label className="adm-field-label">Price *</label>
                  <input aria-label="Price"
                    className={`adm-field-input${error && !form.price_low ? " adm-field-error" : ""}`}
                    type="number"
                    step="0.01"
                    value={form.price_low || ""}
                    onChange={(e) => set("price_low", e.target.value)}
                    placeholder="e.g. 65.00"
                  />
                </>
              )}
            </div>
          </>
        )}

        <div className="adm-field">
          <label className="adm-field-label">Species *</label>
          <select aria-label="Species"
            className={`adm-field-input adm-field-select${error && !form.species ? " adm-field-error" : ""}`}
            value={speciesIsOther ? "other" : form.species || ""}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                species: e.target.value,
                species_other: "",
              }))
            }
          >
            <option value="">— Select —</option>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
            <option value="rabbit">Rabbit</option>
            <option value="bird">Bird</option>
            <option value="other">Other…</option>
          </select>
        </div>

        {speciesIsOther && (
          <div className="adm-field">
            <label className="adm-field-label">Specify species</label>
            <input aria-label="Specify species"
              className="adm-field-input"
              value={form.species_other || ""}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  species: "other",
                  species_other: e.target.value,
                }))
              }
              placeholder="e.g. Guinea pig, hedgehog…"
            />
          </div>
        )}

        <div className="adm-field adm-pf-full">
          <label className="adm-field-label">Includes</label>
          <div className="adm-perms-grid">
            {[
              ["includes_bloodwork", "Bloodwork"],
              ["includes_xrays", "X-rays"],
              ["includes_anesthesia", "Anesthesia"],
            ].map(([f, label]) => {
              const on = !!form[f];
              return (
                <button
                  key={f}
                  type="button"
                  className={`adm-perm${on ? " on" : ""}`}
                  onClick={() => set(f, !on)}
                >
                  <span className="adm-perm-box">
                    {on && (
                      <svg aria-hidden="true"
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--color-white)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="adm-field adm-pf-full">
          <label className="adm-field-label">Public note</label>
          <p className="adm-vet-lookup-hint" style={{ margin: "0 0 8px" }}>
            Shown to visitors beneath this price (e.g. "Exam fee waived on first
            visit").
          </p>
          <RichTextEditor
            value={form.notes || ""}
            onChange={(v) => set("notes", v)}
            placeholder="Optional"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="adm-invite-error">
          Please fill in the required fields (service, species, and a price or
          call-for-quote).
        </p>
      )}

      <div className="adm-pv-editform-actions">
        {onCancel && (
          <button className="adm-b adm-b-outline" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button
          className="adm-b adm-b-primary"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Saving…" : submitLabel || "Save"}
        </button>
      </div>
    </div>
  );
}

function PendingVetEditForm({ form, setForm, onApprove, onCancel }) {
  return (
    <div className="adm-pv-editform">
      <div className="adm-pv-fieldgrid">
        {[
          ["name", "Name"],
          ["address", "Address"],
          ["city", "City"],
          ["state", "State"],
          ["zip_code", "ZIP"],
          ["phone", "Phone"],
          ["website", "Website"],
          ["neighborhood", "Neighborhood"],
          ["vet_type", "Vet Type"],
        ].map(([f, label]) => (
          <div className="adm-field" key={f}>
            <label className="adm-field-label">{label}</label>
            <input aria-label={label}
              className="adm-field-input"
              value={form[f] || ""}
              onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
            />
          </div>
        ))}
        <div className="adm-field">
          <label className="adm-field-label">Accepting Patients</label>
          <select aria-label="Accepting Patients"
            className="adm-field-input adm-field-select"
            value={
              form.accepting_new_patients === null
                ? ""
                : form.accepting_new_patients
                  ? "yes"
                  : "no"
            }
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                accepting_new_patients:
                  e.target.value === "" ? null : e.target.value === "yes",
              }))
            }
          >
            <option value="">— Select —</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <div className="adm-field">
          <label className="adm-field-label">CareCredit</label>
          <select aria-label="CareCredit"
            className="adm-field-input adm-field-select"
            value={
              form.carecredit === true
                ? "yes"
                : form.carecredit === false
                  ? "no"
                  : ""
            }
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                carecredit:
                  e.target.value === "" ? null : e.target.value === "yes",
              }))
            }
          >
            <option value="">— Select —</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>
      <div className="adm-field" style={{ marginTop: "16px" }}>
        <label className="adm-field-label">Hours</label>
        <HoursPicker
          value={form.hours || ""}
          onChange={(v) => setForm((p) => ({ ...p, hours: v }))}
        />
      </div>
      <div className="adm-field" style={{ marginTop: "16px" }}>
        <label className="adm-field-label">Notes</label>
        <RichTextEditor
          value={form.notes || form.internal_notes || ""}
          onChange={(v) => setForm((p) => ({ ...p, notes: v }))}
          placeholder="Internal notes about this vet"
        />
      </div>
      <div className="adm-pv-editform-actions">
        <button className="adm-b adm-b-outline" onClick={onCancel}>
          Cancel
        </button>
        <button className="adm-b adm-b-primary" onClick={onApprove}>
          Approve &amp; add to site
        </button>
      </div>
    </div>
  );
}

const ServiceDropdown = memo(function ServiceDropdown({
  value,
  onChange,
  style,
  services,
  ariaLabel = "Service",
}) {
  const grouped = {};
  (services || []).forEach((s) => {
    const cat = s.category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  });
  const catOrder = [
    "Exam",
    "Vaccine",
    "Dental",
    "Surgery",
    "Diagnostics",
    "Preventive",
    "Emergency",
    "Treatment",
    "Other",
  ];
  const sorted = [...new Set([...catOrder, ...Object.keys(grouped)])].filter(
    (c) => grouped[c],
  );
  return (
    <select
      aria-label={ariaLabel}
      className="adm-field-input adm-field-select"
      value={value}
      onChange={onChange}
      style={style}
    >
      <option value="">— Select —</option>
      {sorted.map((cat) => (
        <optgroup key={cat} label={cat}>
          {grouped[cat].map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
});

const CallPriceRow = memo(function CallPriceRow({
  p,
  i,
  services,
  updateCallPrice,
  removeCallPrice,
  setCallPrices,
  callSpeciesError,
  setCallSpeciesError,
}) {
  return (
    <div key={i} className="row-edit-bg" style={{ marginBottom: "20px" }}>
      <div style={{ marginBottom: "10px" }}>
        <label className="adm-field-label">Service</label>
        <ServiceDropdown
          services={services}
          value={p.service_id}
          onChange={(e) => {
            setCallSpeciesError(false);
            updateCallPrice(i, "service_id", e.target.value);
          }}
          style={
            callSpeciesError && !p.service_id
              ? {
                  borderColor: "var(--color-error)",
                  borderWidth: "2px",
                }
              : {}
          }
        />
      </div>
      {(() => {
        const svc = services.find(
          (s) => s.id === parseInt(p.service_id) || s.id === p.service_id,
        );
        return (
          svc?.name?.toLowerCase().includes("package") &&
          svc?.category === "Vaccine"
        );
      })() && (
        <div style={{ marginBottom: "10px" }}>
          <label
            className="adm-field-label"
            style={{
              display: "block",
              marginBottom: "6px",
            }}
          >
            Vaccines Included
          </label>
          <input aria-label="Vaccines Included"
            className="adm-field-input"
            value={p.vaccines_included || ""}
            onChange={(e) =>
              updateCallPrice(i, "vaccines_included", e.target.value)
            }
            placeholder="e.g. Rabies, DHPP, Bordetella..."
          />
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: "11px",
              color: "var(--color-muted)",
            }}
          >
            This will display publicly on the vet profile
          </p>
        </div>
      )}
      <div style={{ marginBottom: "14px" }}>
        <label className="adm-cfq-check">
          <input
            type="checkbox"
            checked={!!p.call_for_quote}
            onChange={(e) =>
              updateCallPrice(i, "call_for_quote", e.target.checked)
            }
          />
          <span>No set price — clinic asks you to call for a quote</span>
        </label>
      </div>
      <div style={{ marginBottom: "14px" }}>
        <label className="adm-field-label">Price type</label>
        <div
          className="adm-seg-group"
          style={
            p.call_for_quote
              ? {
                  opacity: 0.4,
                  pointerEvents: "none",
                }
              : {}
          }
        >
          {PRICE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={`adm-seg-btn${p.price_type === t ? " active" : ""}`}
              onClick={() => updateCallPrice(i, "price_type", t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: "14px" }}>
        {p.price_type === "range" ? (
          <div className="adm-price-lowhigh">
            <div className="adm-field">
              <label className="adm-field-label">Price low</label>
              <input aria-label="Price low"
                className="adm-field-input"
                type="number"
                step="0.01"
                value={p.price_low}
                disabled={!!p.call_for_quote}
                style={
                  p.call_for_quote
                    ? {
                        opacity: 0.4,
                        pointerEvents: "none",
                      }
                    : callSpeciesError && !p.price_low && !p.call_for_quote
                      ? {
                          borderColor: "var(--color-error)",
                          borderWidth: "2px",
                        }
                      : {}
                }
                onChange={(e) => {
                  setCallSpeciesError(false);
                  updateCallPrice(i, "price_low", e.target.value);
                }}
                placeholder="e.g. 65.00"
              />
            </div>
            <div className="adm-field">
              <label className="adm-field-label">Price high</label>
              <input aria-label="Price high"
                className="adm-field-input"
                type="number"
                step="0.01"
                value={p.price_high}
                disabled={!!p.call_for_quote}
                style={
                  p.call_for_quote
                    ? {
                        opacity: 0.4,
                        pointerEvents: "none",
                      }
                    : {}
                }
                onChange={(e) =>
                  updateCallPrice(i, "price_high", e.target.value)
                }
                placeholder="e.g. 120.00"
              />
            </div>
          </div>
        ) : (
          <>
            <label className="adm-field-label">Price</label>
            <input aria-label="Price"
              className="adm-field-input"
              type="number"
              step="0.01"
              value={p.price_low}
              disabled={!!p.call_for_quote}
              style={
                p.call_for_quote
                  ? {
                      opacity: 0.4,
                      pointerEvents: "none",
                    }
                  : callSpeciesError && !p.price_low && !p.call_for_quote
                    ? {
                        borderColor: "var(--color-error)",
                        borderWidth: "2px",
                      }
                    : {}
              }
              onChange={(e) => {
                setCallSpeciesError(false);
                updateCallPrice(i, "price_low", e.target.value);
              }}
              placeholder="e.g. 65.00"
            />
          </>
        )}
      </div>
      <div style={{ marginBottom: "14px" }}>
        <div className="adm-price-lowhigh adm-species-grid">
          <div className="adm-field">
            <label className="adm-field-label">Species *</label>
            <select aria-label="Species"
              className="adm-field-input adm-field-select"
              value={
                p.species === "other" ||
                (p.species &&
                  !["dog", "cat", "rabbit", "bird", "other", ""].includes(
                    p.species,
                  ))
                  ? "other"
                  : p.species || ""
              }
              onChange={(e) => {
                setCallSpeciesError(false);
                setCallPrices((prev) =>
                  prev.map((row, idx) =>
                    idx === i
                      ? {
                          ...row,
                          species: e.target.value,
                          speciesOther:
                            e.target.value !== "other" ? "" : row.speciesOther,
                        }
                      : row,
                  ),
                );
              }}
              style={
                callSpeciesError && !p.species
                  ? {
                      borderColor: "var(--color-error)",
                      borderWidth: "2px",
                    }
                  : {}
              }
            >
              <option value="">— Select —</option>
              <option value="dog">Dog</option>
              <option value="cat">Cat</option>
              <option value="rabbit">Rabbit</option>
              <option value="bird">Bird</option>
              <option value="other">Other...</option>
            </select>
          </div>
          {(p.species === "other" ||
            (p.species &&
              !["dog", "cat", "rabbit", "bird", "other", ""].includes(
                p.species,
              ))) && (
            <div className="adm-field">
              <label className="adm-field-label">Specify species</label>
              <input aria-label="Specify species"
                className="adm-field-input"
                value={p.speciesOther || ""}
                onChange={(e) =>
                  setCallPrices((prev) =>
                    prev.map((row, idx) =>
                      idx === i
                        ? {
                            ...row,
                            species: "other",
                            speciesOther: e.target.value,
                          }
                        : row,
                    ),
                  )
                }
                placeholder="e.g. Guinea pig, hedgehog…"
              />
            </div>
          )}
        </div>
        <div style={{ marginTop: "14px" }}>
          <label
            className="adm-field-label"
            style={{
              display: "block",
              marginBottom: "8px",
            }}
          >
            Includes
          </label>
          <div className="adm-perms-grid">
            {[
              ["includes_bloodwork", "Bloodwork"],
              ["includes_xrays", "X-rays"],
              ["includes_anesthesia", "Anesthesia"],
            ].map(([field, label]) => {
              const on = !!p[field];
              return (
                <button
                  key={field}
                  type="button"
                  className={`adm-perm${on ? " on" : ""}`}
                  onClick={() =>
                    setCallPrices((prev) =>
                      prev.map((row, idx) =>
                        idx === i
                          ? {
                              ...row,
                              [field]: !row[field],
                            }
                          : row,
                      ),
                    )
                  }
                >
                  <span className="adm-perm-box">
                    {on && (
                      <svg aria-hidden="true"
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--color-white)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div
        style={{
          marginBottom: "14px",
          marginTop: "6px",
        }}
      >
        <label
          className="adm-field-label"
          style={{
            display: "block",
            marginBottom: "8px",
          }}
        >
          Public note
        </label>
        <p className="adm-vet-lookup-hint" style={{ margin: "0 0 8px" }}>
          Shown to visitors beneath this price (e.g. "Exam fee waived on first
          visit").
        </p>
        <RichTextEditor
          value={p.notes || ""}
          onChange={(v) => updateCallPrice(i, "notes", v)}
          placeholder="Optional"
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "8px",
          alignItems: "center",
        }}
      >
        <button
          className="adm-b adm-b-outline"
          onClick={() => {
            setCallPrices((prev) =>
              prev.map((row, idx) =>
                idx === i
                  ? {
                      ...row,
                      service_id: "",
                      price_low: "",
                      price_high: "",
                      price_type: "exact",
                      includes_bloodwork: false,
                      includes_xrays: false,
                      includes_anesthesia: false,
                      species: "",
                      call_for_quote: false,
                      notes: "",
                    }
                  : row,
              ),
            );
          }}
        >
          Clear
        </button>
        <button
          className="adm-b adm-b-danger"
          onClick={() => removeCallPrice(i)}
        >
          Remove
        </button>
      </div>
    </div>
  );
});

const GlobalNotesPanel = memo(function GlobalNotesPanel({
  showAllNotes,
  setShowAllNotes,
  allCallNotes,
  allNotesLoading,
  allNotesEditingId,
  setAllNotesEditingId,
  allNotesEditingText,
  setAllNotesEditingText,
  allNotesDeletingId,
  setAllNotesDeletingId,
  showNewNote,
  setShowNewNote,
  newNoteText,
  setNewNoteText,
  newNoteVetId,
  setNewNoteVetId,
  newNoteVetName,
  setNewNoteVetName,
  newNoteVetSearch,
  setNewNoteVetSearch,
  newNoteSaving,
  saveGlobalNote,
  updateCallNote,
  deleteCallNote,
  jumpToVet,
  vetOptions,
  formatLogDate,
}) {
  return (
    <div
      className={`notes-panel-desktop${showAllNotes ? " notes-panel-open" : ""}`}
      style={{
        position: "fixed",
        zIndex: 500,
        background: "var(--color-white)",
        boxShadow: "0 0 32px rgb(var(--color-black-rgb) / 0.18)",
        transition: "transform 0.3s ease",
        overflowY: "auto",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-white)",
          position: "sticky",
          top: 0,
        }}
      >
        <span style={{ fontSize: "15px", fontWeight: "800", color: "var(--color-navy-dark)" }}>
          All Call Notes{" "}
          {allCallNotes.length > 0 ? `(${allCallNotes.length})` : ""}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            className="adm-b adm-b-green"
            style={{
              height: "38px",
              padding: "0 14px",
              fontSize: "15px",
              borderRadius: "12px",
            }}
            onClick={() => setShowNewNote((v) => !v)}
          >
            + New note
          </button>
          <button
            onClick={() => setShowAllNotes(false)}
            className="adm-callnotes-close"
            title="Close"
          >
            <svg aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      {showNewNote && (
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-white)",
          }}
        >
          <label className="adm-field-label">Vet (optional)</label>
          {newNoteVetId ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "10px",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "var(--color-success-text)",
                }}
              >
                {newNoteVetName}
              </span>
              <button
                type="button"
                className="adm-b adm-b-outline"
                style={{ height: "30px", padding: "0 10px", fontSize: "12px" }}
                onClick={() => {
                  setNewNoteVetId(null);
                  setNewNoteVetName("");
                  setNewNoteVetSearch("");
                }}
              >
                Change
              </button>
            </div>
          ) : (
            <div style={{ position: "relative", marginBottom: "10px" }}>
              <input aria-label="Search a vet to attach"
                className="adm-field-input"
                value={newNoteVetSearch}
                onChange={(e) => setNewNoteVetSearch(e.target.value)}
                placeholder="Search a vet to attach, or leave blank for a general note"
              />
              {newNoteVetSearch.trim() && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    background: "var(--color-white)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "10px",
                    boxShadow: "0 6px 20px rgb(var(--color-navy-deeper-rgb) / 0.12)",
                    maxHeight: "200px",
                    overflowY: "auto",
                    zIndex: 10,
                  }}
                >
                  {vetOptions
                    .filter((v) =>
                      v.name
                        ?.toLowerCase()
                        .includes(newNoteVetSearch.toLowerCase()),
                    )
                    .slice(0, 8)
                    .map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setNewNoteVetId(v.id);
                          setNewNoteVetName(v.name);
                          setNewNoteVetSearch("");
                        }}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "9px 12px",
                          background: "none",
                          border: "none",
                          borderBottom: "1px solid var(--color-cream)",
                          cursor: "pointer",
                          fontFamily: "'Urbanist', sans-serif",
                          fontSize: "14px",
                          color: "var(--color-navy-dark)",
                        }}
                      >
                        {v.name}
                      </button>
                    ))}
                  {vetOptions.filter((v) =>
                    v.name
                      ?.toLowerCase()
                      .includes(newNoteVetSearch.toLowerCase()),
                  ).length === 0 && (
                    <p
                      style={{
                        margin: 0,
                        padding: "9px 12px",
                        fontSize: "13px",
                        color: "var(--color-muted)",
                      }}
                    >
                      No vet found — leave blank for a general note.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          <RichTextEditor
            value={newNoteText}
            onChange={(v) => setNewNoteText(v)}
            placeholder="Write your note…"
          />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              gap: "8px",
              marginTop: "10px",
            }}
          >
            <button
              className="adm-b adm-b-green adm-b-notes"
              onClick={saveGlobalNote}
              disabled={newNoteSaving || !newNoteText.trim()}
            >
              {newNoteSaving ? "Saving…" : "Save note"}
            </button>
            <button
              className="adm-b adm-b-outline adm-b-notes"
              onClick={() => {
                setShowNewNote(false);
                setNewNoteText("");
                setNewNoteVetId(null);
                setNewNoteVetName("");
                setNewNoteVetSearch("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div style={{ padding: "0" }}>
        {allNotesLoading && (
          <p
            style={{
              padding: "16px",
              color: "var(--color-muted)",
              fontSize: "13px",
              margin: 0,
            }}
          >
            Loading notes...
          </p>
        )}
        {!allNotesLoading && allCallNotes.length === 0 && (
          <p
            style={{
              padding: "16px",
              color: "var(--color-muted)",
              fontSize: "13px",
              fontStyle: "italic",
              margin: 0,
            }}
          >
            No notes saved yet.
          </p>
        )}
        {!allNotesLoading &&
          allCallNotes.map((n) => (
            <div
              key={n.id}
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid var(--color-badge-neutral-bg)",
              }}
            >
              {allNotesEditingId === n.id ? (
                <div>
                  <p
                    style={{
                      margin: "0 0 6px 0",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "var(--color-success-text)",
                    }}
                  >
                    {n.vet_name}
                  </p>
                  <textarea aria-label={`Note for ${n.vet_name}`}
                    className="adm-input"
                    rows={3}
                    style={{
                      width: "100%",
                      resize: "vertical",
                      height: "auto",
                      marginBottom: "8px",
                    }}
                    value={allNotesEditingText}
                    onChange={(e) => setAllNotesEditingText(e.target.value)}
                  />
                  <div className="adm-note-actions">
                    <button
                      className="adm-b adm-b-outline adm-b-notes"
                      onClick={() => {
                        setAllNotesEditingId(null);
                        setAllNotesEditingText("");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="adm-b adm-b-green adm-b-notes"
                      onClick={() => updateCallNote(n.id, allNotesEditingText)}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : allNotesDeletingId === n.id ? (
                <div
                  style={{
                    background: "var(--color-error-light)",
                    border: "1px solid rgb(var(--color-error-rgb) / 0.24)",
                    borderRadius: "6px",
                    padding: "12px",
                  }}
                >
                  <p className="adm-note-vettitle">{n.vet_name}</p>
                  <p className="adm-note-delq">Delete this note?</p>
                  <div className="adm-note-confirm-btns">
                    <button
                      className="adm-b adm-b-outline adm-b-notes"
                      onClick={() => setAllNotesDeletingId(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="adm-b adm-b-danger adm-b-notes"
                      onClick={() => deleteCallNote(n.id)}
                    >
                      Yes, Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {n.vet_id ? (
                    <div className="adm-note-vetlink-wrap">
                      <button
                        type="button"
                        onClick={() => jumpToVet(n.vet_id, n.vet_name)}
                        className="adm-note-vetlink"
                        title="Go to this vet in the call queue"
                      >
                        {n.vet_name}
                        <svg aria-hidden="true"
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M7 17L17 7M7 7h10v10" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <p
                      style={{
                        margin: "0 0 4px",
                        fontSize: "14px",
                        fontWeight: 800,
                        color: "var(--color-muted)",
                      }}
                    >
                      General note
                    </p>
                  )}
                  <p className="adm-note-date">
                    {formatLogDate(n.created_at)}
                    {n.updated_at !== n.created_at ? " · edited" : ""}
                  </p>
                  <p className="adm-note-copy">{n.note}</p>
                  <div className="adm-note-actions">
                    <button
                      className="adm-b adm-b-outline adm-b-notes"
                      onClick={() => {
                        setAllNotesEditingId(n.id);
                        setAllNotesEditingText(n.note);
                        setAllNotesDeletingId(null);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="adm-b adm-b-danger adm-b-notes"
                      onClick={() => {
                        setAllNotesDeletingId(n.id);
                        setAllNotesEditingId(null);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
});

export default function AdminPage() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [authorized, setAuthorized] = useState(false);
  const [tab, setTab] = useState("Dashboard");

  // All valid tab names (Dashboard + the TABS list). Used to validate the
  // ?tab= URL param so a bad value can't set an unknown tab.
  const ALL_TABS = ["Dashboard", ...TABS];

  // On mount, restore the tab from the URL (?tab=Submissions) so a refresh
  // keeps you on the same tab instead of resetting to Dashboard.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get("tab");
    if (urlTab) {
      const match = ALL_TABS.find(
        (t) => t.toLowerCase().replace(/\s+/g, "-") === urlTab.toLowerCase(),
      );
      if (match) setTab(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [navOpen, setNavOpen] = useState(false); // mobile sidebar drawer
  const skipScrollRestore = useRef(false); // set when switching tabs from drawer

  // Lock background scroll while the mobile drawer is open, so the page behind
  // the scrim doesn't scroll. Restores the prior scroll position on close,
  // unless we're switching tabs (then we want to land at the top instead).
  useEffect(() => {
    if (navOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      const onKey = (e) => {
        if (e.key === "Escape") setNavOpen(false);
      };
      window.addEventListener("keydown", onKey);
      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        if (skipScrollRestore.current) {
          skipScrollRestore.current = false;
          window.scrollTo(0, 0);
        } else {
          window.scrollTo(0, scrollY);
        }
        window.removeEventListener("keydown", onKey);
      };
    }
  }, [navOpen]);

  // ─── Unsaved-changes tracking ──────────────────────────────────────────
  // When a heavy editor opens, we snapshot its form state. isAnyEditorDirty()
  // compares the live form to that snapshot so we only warn when the user has
  // actually changed something (not merely opened a form). This avoids
  // "cry wolf" warnings that train users to dismiss the prompt.
  const editorSnapshotRef = useRef(null);

  // Call when a heavy editor opens, passing the initial form object.
  function snapshotEditor(formObj) {
    try {
      editorSnapshotRef.current = JSON.stringify(formObj ?? null);
    } catch {
      editorSnapshotRef.current = null;
    }
  }

  // True if a heavy editor is open AND its form differs from the snapshot.
  function isAnyEditorDirty() {
    let liveForm = null;
    if (editingVet) liveForm = vetForm;
    else if (editingPendingVet) liveForm = pendingVetForm;
    else if (showAddVet) liveForm = addVetForm;
    else if (editingPrice) liveForm = priceForm;
    else if (showAddPrice) liveForm = addPriceForm;
    else return false; // no heavy editor open
    if (editorSnapshotRef.current == null) return false;
    try {
      return JSON.stringify(liveForm) !== editorSnapshotRef.current;
    } catch {
      return false;
    }
  }

  // Returns true if there are ANY unsaved changes (heavy editors OR call prices).
  function hasUnsavedChanges() {
    return isAnyEditorDirty() || callPrices.length > 0;
  }

  // Closes every open inline editor/add-form across the admin. Used when opening
  // the notes panel or jumping to a vet, so only one editing context is open at
  // a time (an open editor never lingers behind the notes panel, and vice versa).
  function closeAllEditors() {
    setEditingVet(null);
    setEditingPendingVet(null);
    setEditingPrice(null);
    setEditingNote(null);
    setNoteDraft("");
    setHandBackConfirm(null);
    setShowAddVet(false);
    setShowAddPrice(false);
    setCallReviewEditing(null);
    setShowInviteForm(false);
  }

  function switchTab(t) {
    const doSwitch = () => {
      setTab(t);
      // Pull fresh data when opening the Waitlist tab so new signups show
      // without a manual page refresh.
      if (t === "Waitlist") fetchWaitlist();
      // Reflect the tab in the URL (?tab=slug) so a refresh stays on this tab.
      const slug = t.toLowerCase().replace(/\s+/g, "-");
      const url = new URL(window.location.href);
      url.searchParams.set("tab", slug);
      window.history.replaceState({}, "", url);
      // New tab starts at the top. If the drawer is open, flag its close handler
      // to land at the top instead of restoring the old scroll; otherwise (desktop
      // or drawer already closed) scroll to the top directly.
      if (navOpen) {
        skipScrollRestore.current = true;
        setNavOpen(false);
      } else {
        window.scrollTo(0, 0);
      }
      setEditingVet(null);
      setEditingPendingVet(null);
      setEditingPrice(null);
      setEditingNote(null);
      setNoteDraft("");
      setHandBackConfirm(null);
      setShowAddPrice(false);
      setCallReviewEditing(null);
      setShowInviteForm(false);
      // Closing the notes panel on tab switch also resets any open note edit /
      // new-note form (via the showAllNotes reset effect).
      setShowAllNotes(false);
      setInviteError("");
      setTeamEditingId(null);
      setTeamEditName("");
      setShowCallbackNotes(false);
      setCallbackNoteText("");
      setCallPrices([]);
      setLockedVetId(null);
      setLockedVetName("");
      if (t === "Prices" && selectedVetId) {
        setPricesLoading(true);
        fetchPricesForVet(selectedVetId);
      }
      fetchAllCallNotes();
      if (t === "Call Sheet" && callReviewVetId)
        fetchReviewPrices(callReviewVetId);
      if (t === "Team") fetchAdminUsers();
    };
    if (hasUnsavedChanges() && t !== tab) {
      setUnsavedModal({
        message: "You have unsaved changes. Switch tabs anyway?",
        action: doSwitch,
      });
    } else {
      doSwitch();
    }
  }

  // Submissions
  const [submissions, setSubmissions] = useState([]);
  const [subFilter, setSubFilter] = useState("pending");
  const [subSearch, setSubSearch] = useState("");
  const [subPage, setSubPage] = useState(1);
  const [subMatchSel, setSubMatchSel] = useState({}); // {submissionId: serviceId} for unmapped
  const [subLoading, setSubLoading] = useState(true);

  // Pending Vets
  const [pendingVets, setPendingVets] = useState([]);
  const [pendingVetsLoading, setPendingVetsLoading] = useState(true);
  const [editingPendingVet, setEditingPendingVet] = useState(null);
  const [pendingVetForm, setPendingVetForm] = useState({});
  const [pendingVetFilter, setPendingVetFilter] = useState("all");
  const [pendingVetsWithPrices, setPendingVetsWithPrices] = useState(new Set());

  // Vets
  const [vets, setVets] = useState([]);
  const [vetsLoading, setVetsLoading] = useState(true);
  const [vetSearch, setVetSearch] = useState("");
  const [vetStatusFilter, setVetStatusFilter] = useState("all");
  const [vetPage, setVetPage] = useState(1);
  const [editingVet, setEditingVet] = useState(null);
  const [vetForm, setVetForm] = useState({});
  const [vetSaving, setVetSaving] = useState(false);
  const [showAddVet, setShowAddVet] = useState(false);
  const [addVetForm, setAddVetForm] = useState({
    name: "",
    slug: "",
    neighborhood: "",
    city: "",
    state: "",
    address: "",
    zip_code: "",
    phone: "",
    website: "",
    vet_type: [],
    ownership: "",
    accepting_new_patients: null,
    carecredit: null,
    hours: "",
    status: "active",
    internal_notes: "",
    pricing_note: "",
  });

  // Prices
  const [selectedVetId, setSelectedVetId] = useState("");
  const [vetPriceSearch, setVetPriceSearch] = useState("");
  const [showVetDropdown, setShowVetDropdown] = useState(false);
  const [vetPrices, setVetPrices] = useState([]);
  const [services, setServices] = useState([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null);
  const [priceForm, setPriceForm] = useState({});
  const [priceSaving, setPriceSaving] = useState(false);
  // Note-only editing, for prices the call sheet owns. The sheet sets the
  // number and the sync would undo any change to it, but nothing in the sheet
  // writes the note any more — so the note is editable even where the price
  // isn't, and it gets its own small editor rather than the full price form.
  const [editingNote, setEditingNote] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  // Handing an overridden price back to the call sheet. Confirmed rather than
  // immediate: it discards a deliberate correction, and the sheet's value
  // doesn't return until the next sync, so it isn't trivially undoable.
  const [handBackConfirm, setHandBackConfirm] = useState(null);
  const [handBackSaving, setHandBackSaving] = useState(null);
  const [showAddPrice, setShowAddPrice] = useState(false);
  const [addPriceForm, setAddPriceForm] = useState({
    service_id: "",
    price_low: "",
    price_high: "",
    price_type: "",
    includes_bloodwork: false,
    includes_xrays: false,
    includes_anesthesia: false,
    species: "",
    species_other: "",
    call_for_quote: false,
    notes: "",
    vaccines_included: "",
  });
  const priceSearchRef = useRef(null);

  // Users
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  // How many user cards to draw. The list is filtered in full and then cut
  // here — without the cut, every keystroke in the search rebuilt a card for
  // every matching profile, which is what made typing lag by seconds.
  const [userLimit, setUserLimit] = useState(50);

  // Pets
  const [pets, setPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [petSearch, setPetSearch] = useState("");
  const [petLimit, setPetLimit] = useState(50);

  // Waitlist
  const [waitlist, setWaitlist] = useState([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  // Symptom Logs
  const [symptomLogs, setSymptomLogs] = useState([]);
  const [symptomLoading, setSymptomLoading] = useState(true);
  const [symptomFilter, setSymptomFilter] = useState("all");
  const [logPage, setLogPage] = useState(1);

  // Pagination scroll: jump instantly to the top of the logs section on page
  // change, accounting for the sticky mobile topbar so it doesn't hide under it.
  function goToLogPage(next) {
    setLogPage(next);
    requestAnimationFrame(() => {
      const anchor = document.getElementById("adm-logs-section");
      if (!anchor) return;
      const isMobile = window.matchMedia("(max-width: 960px)").matches;
      const offset = isMobile ? 74 : 12; // sticky topbar height on mobile
      const y =
        anchor.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: y, behavior: "auto" });
    });
  }

  // Call Sheet
  const [callQueue, setCallQueue] = useState([]);
  const [callQueueLoading, setCallQueueLoading] = useState(true);
  const [callIndex, setCallIndex] = useState(0);
  const [callPrices, setCallPrices] = useState([]);
  const callPricesRef = useRef([]);
  useEffect(() => {
    callPricesRef.current = callPrices;
  }, [callPrices]);
  const [callSaving, setCallSaving] = useState(false);
  const [lockedVetId, setLockedVetId] = useState(null);
  const [lockedVetName, setLockedVetName] = useState("");
  const [unsavedModal, setUnsavedModal] = useState(null);

  // Lock background scroll while the unsaved-changes warning is up, matching
  // the behavior of other modals in the app.
  useEffect(() => {
    if (!unsavedModal) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [unsavedModal]);

  const [callSpeciesError, setCallSpeciesError] = useState(false);
  const [pendingVetSearch, setPendingVetSearch] = useState("");
  const [pendingVetPage, setPendingVetPage] = useState(1);
  const [callSheetSearch, setCallSheetSearch] = useState("");
  const [showCallbackNotes, setShowCallbackNotes] = useState(false);
  const [callbackNoteText, setCallbackNoteText] = useState("");
  const [callNotes, setCallNotes] = useState([]);
  const [allCallNotes, setAllCallNotes] = useState([]);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [allNotesLoading, setAllNotesLoading] = useState(false);
  const [allNotesEditingId, setAllNotesEditingId] = useState(null);
  const [allNotesEditingText, setAllNotesEditingText] = useState("");
  const [allNotesDeletingId, setAllNotesDeletingId] = useState(null);
  const [showNewNote, setShowNewNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteVetId, setNewNoteVetId] = useState(null);
  const [newNoteVetName, setNewNoteVetName] = useState("");
  const [newNoteVetSearch, setNewNoteVetSearch] = useState("");
  const [newNoteSaving, setNewNoteSaving] = useState(false);
  // Warn on browser refresh / tab close if there are unsaved changes. The
  // browser shows its own generic confirmation dialog; we only opt in by
  // setting returnValue when actually dirty.
  useEffect(() => {
    const handler = (e) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editingVet,
    editingPendingVet,
    showAddVet,
    editingPrice,
    showAddPrice,
    vetForm,
    pendingVetForm,
    addVetForm,
    priceForm,
    addPriceForm,
    callPrices,
  ]);

  // Reset the "new note" form AND any open edit/delete state whenever the notes
  // panel is closed, so nothing reappears half-open when the panel is reopened.
  useEffect(() => {
    if (!showAllNotes) {
      setShowNewNote(false);
      setNewNoteText("");
      setNewNoteVetId(null);
      setNewNoteVetName("");
      setNewNoteVetSearch("");
      setAllNotesEditingId(null);
      setAllNotesEditingText("");
      setAllNotesDeletingId(null);
    }
  }, [showAllNotes]);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [notesVetId, setNotesVetId] = useState(null);
  const [notesVetName, setNotesVetName] = useState("");
  const [callLog, setCallLog] = useState([]);
  const [showAllVets, setShowAllVets] = useState(false);
  const [showSyncGuide, setShowSyncGuide] = useState(false);
  const [fullCallQueue, setFullCallQueue] = useState([]);
  const [deletePriceConfirm, setDeletePriceConfirm] = useState(null);
  const [addPriceError, setAddPriceError] = useState(false);
  const [editPriceError, setEditPriceError] = useState(false);
  const [callSaved, setCallSaved] = useState(false);
  const [callReviewPrices, setCallReviewPrices] = useState([]);
  const [callReviewVetId, setCallReviewVetId] = useState(null);
  const [callReviewEditing, setCallReviewEditing] = useState(null);

  // Team / admin users
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", full_name: "" });
  const [inviteError, setInviteError] = useState("");
  const [inviteSaving, setInviteSaving] = useState(false);
  const [teamDeactivatingId, setTeamDeactivatingId] = useState(null);
  const [teamDeletingId, setTeamDeletingId] = useState(null);
  const [teamEditingId, setTeamEditingId] = useState(null);
  const [teamEditName, setTeamEditName] = useState("");

  // Unverified prices
  const [unverifiedPrices, setUnverifiedPrices] = useState([]);
  const [conflictGroups, setConflictGroups] = useState([]);
  const [conflictLoading, setConflictLoading] = useState(true);
  const [conflictResolving, setConflictResolving] = useState(null);
  const [unverifiedLoading, setUnverifiedLoading] = useState(true);

  // Google Sheets sync
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // Verification checklist (shown when activating a vet)
  const [vetVerifyChecks, setVetVerifyChecks] = useState({
    address: false,
    phone: false,
    website: false,
    hours: false,
    neighborhood: false,
    ownership: false,
  });
  const [addVetVerifyChecks, setAddVetVerifyChecks] = useState({
    address: false,
    phone: false,
    website: false,
    hours: false,
    neighborhood: false,
    ownership: false,
  });

  // Stats
  const [stats, setStats] = useState({
    activeVets: 0,
    pendingSubs: 0,
    totalPrices: 0,
    pendingVets: 0,
    totalUsers: 0,
    totalSymptomChecks: 0,
  });

  // ── Auth ──────────────────────────────────────────────────────────
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  // Authorized if the logged-in user is an ACTIVE admin (checked via the
  // SECURITY DEFINER is_admin_with('any') function — the same check the database
  // RLS policies use, which avoids the RLS catch-22 of reading admin_users
  // directly), OR (as a lockout-proof fallback) is in the hardcoded ADMIN_EMAILS
  // list. The fallback guarantees the original admins can always get in even if
  // the RPC fails. Remove the fallback only once this is proven in production.
  async function isAuthorizedAdmin(email) {
    if (!email) return false;
    const normalized = email.trim().toLowerCase();
    // Hardcoded fallback first — cheap, and guarantees no lockout.
    if (ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(normalized)) {
      return true;
    }
    // Table-driven check via the SECURITY DEFINER helper (works for any active
    // admin, including ones not in the hardcoded list).
    try {
      const { data, error } = await supabase.rpc("is_admin_with", {
        permission: "any",
      });
      if (error) return false;
      return data === true;
    } catch (e) {
      return false;
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      const email = data.session?.user?.email;
      if (!data.session || !(await isAuthorizedAdmin(email))) {
        router.push("/");
      } else {
        setAuthorized(true);
        setCurrentUserEmail(email);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_e, s) => {
      if (!s || !(await isAuthorizedAdmin(s.user.email))) router.push("/");
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setEditingVet(null);
    setShowAddVet(false);
    setEditingPrice(null);
    setEditingNote(null);
    setNoteDraft("");
    setHandBackConfirm(null);
    setShowAddPrice(false);
    setEditingPendingVet(null);
  }, [tab]);

  useEffect(() => {
    if (!authorized) return;
    fetchSubmissions();
    fetchPendingVets();
    fetchVets();
    fetchServices();
    fetchUsers();
    fetchPets();
    fetchSymptomLogs();
    fetchWaitlist();
    fetchStats();
    fetchCallQueue();
    fetchUnverifiedPrices();
    fetchConflicts();
    fetchReports();
    fetchAdminUsers();
  }, [authorized]);

  // Reload when the tab is actually returned to — not on window focus, which
  // also fires when devtools opens, and not more than once a minute.
  const lastRefreshRef = useRef(Date.now());
  useEffect(() => {
    if (!authorized) return;
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastRefreshRef.current < 60000) return;
      lastRefreshRef.current = Date.now();
      fetchSubmissions();
      fetchPendingVets();
      fetchStats();
      fetchConflicts();
      fetchReports();
      fetchWaitlist();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized]);

  async function fetchStats() {
    const [
      { count: activeVets },
      { count: pendingSubs },
      { count: totalPrices },
      { count: pendingVetsCount },
      { count: totalUsers },
      { count: totalSymptomChecks },
    ] = await Promise.all([
      supabase
        .from("vets")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("price_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase.from("vet_prices").select("*", { count: "exact", head: true }),
      supabase
        .from("pending_vets")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("symptom_checks")
        .select("*", { count: "exact", head: true }),
    ]);
    setStats({
      activeVets: activeVets || 0,
      pendingSubs: pendingSubs || 0,
      totalPrices: totalPrices || 0,
      pendingVets: pendingVetsCount || 0,
      totalUsers: totalUsers || 0,
      totalSymptomChecks: totalSymptomChecks || 0,
    });
  }

  async function fetchSubmissions() {
    setSubLoading(true);
    // Phase D: pull the receipt-extraction fields so batches can be grouped and
    // the corrected approve logic has price_low/high, price_type, service_id, etc.
    const { data } = await supabase
      .from("price_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    const subs = data || [];

    // Attach the submitter's real name (from profiles) so the review UI shows
    // who submitted, instead of a generic "a user". Falls back to email.
    const userIds = [...new Set(subs.map((s) => s.user_id).filter(Boolean))];
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      const nameById = {};
      for (const p of profs || []) nameById[p.id] = p.full_name;

      // Emails via the admin route (auth.users isn't client-readable), so users
      // without a full_name still show an identifier instead of "a user".
      let emailById = {};
      try {
        const {
          data: { session: sess },
        } = await supabase.auth.getSession();
        const res = await fetch("/api/admin/user-emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sess?.access_token || ""}`,
          },
          body: JSON.stringify({ ids: userIds }),
        });
        if (res.ok) emailById = (await res.json()).emails || {};
      } catch {
        // non-fatal
      }

      for (const s of subs) {
        s.submitter_name = s.submitter_name || nameById[s.user_id] || null;
        s.submitter_email = s.submitter_email || emailById[s.user_id] || null;
      }
    }

    setSubmissions(subs);
    setSubLoading(false);
  }

  async function fetchPendingVets() {
    setPendingVetsLoading(true);

    // Paginate to load all pending vets (Supabase max 1000 per request)
    let allPendingVets = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data: page } = await supabase
        .from("pending_vets")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (!page || page.length === 0) break;
      allPendingVets = allPendingVets.concat(page);
      if (page.length < pageSize) break;
      from += pageSize;
    }
    setPendingVets(allPendingVets);

    // Check which pending vets have prices via pending_vet_id (paginate all)
    let allPriceData = [];
    let priceFrom = 0;
    while (true) {
      const { data: pricePage } = await supabase
        .from("vet_prices")
        .select("pending_vet_id")
        .not("pending_vet_id", "is", null)
        .range(priceFrom, priceFrom + 999);
      if (!pricePage || pricePage.length === 0) break;
      allPriceData = allPriceData.concat(pricePage);
      if (pricePage.length < 1000) break;
      priceFrom += 1000;
    }
    const vetIdsWithPrices = new Set(allPriceData.map((p) => p.pending_vet_id));
    setPendingVetsWithPrices(vetIdsWithPrices);

    setPendingVetsLoading(false);
  }

  async function fetchVets() {
    setVetsLoading(true);
    const { data } = await supabase.from("vets").select("*").order("name");
    setVets(data || []);
    setVetsLoading(false);
  }

  async function fetchServices() {
    const { data } = await supabase.from("services").select("*").order("name");
    setServices(data || []);
  }

  async function fetchUsers() {
    setUsersLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select(
        "id, full_name, zip_code, created_at, is_public, status, is_flagged, flag_reason",
      )
      .order("created_at", { ascending: false });
    const profiles = data || [];

    if (profiles.length === 0) {
      setUsers([]);
      setUsersLoading(false);
      return;
    }

    const ids = profiles.map((p) => p.id);

    // Pet counts — group by owner_id
    const petCounts = {};
    {
      const { data: petsData } = await supabase
        .from("pets")
        .select("owner_id")
        .in("owner_id", ids);
      for (const row of petsData || []) {
        petCounts[row.owner_id] = (petCounts[row.owner_id] || 0) + 1;
      }
    }

    // Submission counts + status breakdown (for computed flags) — by user_id
    const subTotals = {};
    const subRejected = {};
    {
      const { data: subData } = await supabase
        .from("price_submissions")
        .select("user_id, status")
        .in("user_id", ids);
      for (const row of subData || []) {
        subTotals[row.user_id] = (subTotals[row.user_id] || 0) + 1;
        if (row.status === "rejected")
          subRejected[row.user_id] = (subRejected[row.user_id] || 0) + 1;
      }
    }

    // Emails — via the service-role admin route (auth.users isn't client-readable)
    let emailMap = {};
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/user-emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        const json = await res.json();
        emailMap = json.emails || {};
      }
    } catch {
      // Non-fatal — emails just show as "—" if the lookup fails.
    }

    const enriched = profiles.map((p) => {
      const total = subTotals[p.id] || 0;
      const rejected = subRejected[p.id] || 0;
      const rejectRate = total > 0 ? rejected / total : 0;
      // Computed flags (from data we already have)
      const computedFlags = [];
      if (total >= 3 && rejectRate >= 0.5)
        computedFlags.push({
          key: "high_reject",
          label: `${Math.round(rejectRate * 100)}% rejected`,
        });
      if (total >= 25)
        computedFlags.push({ key: "high_volume", label: "High volume" });
      return {
        ...p,
        email: emailMap[p.id] || null,
        pet_count: petCounts[p.id] || 0,
        submission_count: total,
        submission_rejected: rejected,
        computed_flags: computedFlags,
      };
    });

    setUsers(enriched);
    setUsersLoading(false);
  }

  async function setUserStatus(userId, newStatus) {
    const { error } = await supabase
      .from("profiles")
      .update({ status: newStatus })
      .eq("id", userId);
    if (!error) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u)),
      );
    }
  }

  async function toggleUserFlag(user) {
    const next = !user.is_flagged;
    const reason = next
      ? window.prompt(
          "Reason for flagging this user (optional):",
          user.flag_reason || "",
        )
      : null;
    // prompt returns null if cancelled on a flag action — only abort on flagging
    if (next && reason === null) return;
    const { error } = await supabase
      .from("profiles")
      .update({ is_flagged: next, flag_reason: next ? reason || null : null })
      .eq("id", user.id);
    if (!error) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? {
                ...u,
                is_flagged: next,
                flag_reason: next ? reason || null : null,
              }
            : u,
        ),
      );
    }
  }

  async function fetchPets() {
    setPetsLoading(true);
    const { data: petsData } = await supabase
      .from("pets")
      .select("id, name, species, breed, birthday, weight_value, sex, owner_id")
      .order("created_at", { ascending: false });

    if (!petsData?.length) {
      setPets([]);
      setPetsLoading(false);
      return;
    }

    // Get unique owner IDs and fetch their names from profiles
    const ownerIds = [
      ...new Set(petsData.map((p) => p.owner_id).filter(Boolean)),
    ];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ownerIds);

    const profileMap = {};
    (profilesData || []).forEach((p) => {
      profileMap[p.id] = p.full_name;
    });

    setPets(
      petsData.map((pet) => ({
        ...pet,
        ownerName: profileMap[pet.owner_id] || null,
      })),
    );
    setPetsLoading(false);
  }

  function updatePetSex(petId, sex) {
    // Optimistic + fire-and-forget: update UI instantly, persist in the
    // background without awaiting (so nothing blocks between changes).
    setPets((prev) => prev.map((p) => (p.id === petId ? { ...p, sex } : p)));
    supabase
      .from("pets")
      .update({ sex })
      .eq("id", petId)
      .then(({ error }) => {
        if (error) {
          alert("Couldn't save the change — please try again.");
          fetchPets();
        }
      });
  }

  async function fetchUnverifiedPrices() {
    setUnverifiedLoading(true);
    const { data } = await supabase
      .from("vet_prices")
      .select("*, services(name), vets(name, slug), pending_vets(name)")
      .eq("is_verified", false)
      .eq("source", "ai_scraper")
      .order("created_at", { ascending: false });
    setUnverifiedPrices(data || []);
    setUnverifiedLoading(false);
  }

  async function approveUnverifiedPrice(id) {
    await supabase
      .from("vet_prices")
      .update({ is_verified: true })
      .eq("id", id);
    setUnverifiedPrices((prev) => prev.filter((p) => p.id !== id));
    fetchStats();
  }

  async function rejectUnverifiedPrice(id) {
    await supabase.from("vet_prices").delete().eq("id", id);
    setUnverifiedPrices((prev) => prev.filter((p) => p.id !== id));
  }

  // ── Price conflicts: prices flagged in_conflict for the same vet+service. ──
  // ── Price reports: what visitors told us is wrong. ──
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsFilter, setReportsFilter] = useState("pending");

  async function fetchReports() {
    setReportsLoading(true);
    let q = supabase
      .from("price_reports")
      .select(
        "*, services(name), vets(name, slug), vet_prices(price_low, price_high, price_type, call_for_quote, source)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (reportsFilter !== "all") q = q.eq("status", reportsFilter);
    const { data, error } = await q;
    if (error) console.error("price_reports:", error.message);
    setReports(data || []);
    setReportsLoading(false);
  }

  async function setReportStatus(id, status) {
    const { error } = await supabase
      .from("price_reports")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      alert("Couldn't update that report — please try again.");
      return;
    }
    fetchReports();
  }

  // Only where it would hold. A sheet price is owned by the call sheet:
  // deleting it here looks like it worked and the next sync writes it back.
  async function removeReportedPrice(report) {
    const price = report.vet_prices;
    if (!report.vet_price_id || !price || price.source === "sheet") return;
    if (
      !confirm(
        "Remove this price from the site? This deletes it — it can't be undone.",
      )
    )
      return;
    const { error } = await supabase
      .from("vet_prices")
      .delete()
      .eq("id", report.vet_price_id);
    if (error) {
      alert("Couldn't remove that price — please try again.");
      return;
    }
    setReportStatus(report.id, "resolved");
  }

  // View page shows what a visitor sees; this goes where the work happens.
  function openReportInPrices(report) {
    if (!report.vet_id) return;
    setSelectedVetId(report.vet_id);
    setTab("Prices");
    setPricesLoading(true);
    fetchPricesForVet(report.vet_id);
  }

  async function fetchConflicts() {
    setConflictLoading(true);
    const { data } = await supabase
      .from("vet_prices")
      .select("*, services(name), vets(name, slug), pending_vets(name)")
      .eq("in_conflict", true)
      .order("conflict_key", { ascending: true })
      .order("created_at", { ascending: true });

    // Group rows by conflict_key so each group is one vet+service.
    const groups = {};
    (data || []).forEach((row) => {
      const key = row.conflict_key || `${row.vet_id}:${row.service_id}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          vetName: row.vets?.name || row.pending_vets?.name || "Unknown vet",
          vetSlug: row.vets?.slug || null,
          serviceName: row.services?.name || "Unknown service",
          rows: [],
        };
      }
      groups[key].rows.push(row);
    });
    setConflictGroups(Object.values(groups));
    setConflictLoading(false);
  }

  // Keep one price for a vet+service, delete the other conflicting rows,
  // and clear the flag on the survivor.
  async function resolveConflictKeep(group, keepId) {
    setConflictResolving(group.key);
    const deleteIds = group.rows.map((r) => r.id).filter((id) => id !== keepId);
    if (deleteIds.length) {
      await supabase.from("vet_prices").delete().in("id", deleteIds);
    }
    await supabase
      .from("vet_prices")
      .update({ in_conflict: false, conflict_key: null })
      .eq("id", keepId);
    setConflictGroups((prev) => prev.filter((g) => g.key !== group.key));
    setConflictResolving(null);
    fetchStats();
  }

  // Keep BOTH (dismiss the conflict without deleting) — clears the flag on
  // every row in the group. Use when both prices are legitimately valid.
  async function resolveConflictKeepBoth(group) {
    setConflictResolving(group.key);
    const ids = group.rows.map((r) => r.id);
    await supabase
      .from("vet_prices")
      .update({ in_conflict: false, conflict_key: null })
      .in("id", ids);
    setConflictGroups((prev) => prev.filter((g) => g.key !== group.key));
    setConflictResolving(null);
    fetchStats();
  }

  async function syncFromSheets(dryRun = false) {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(
        `/api/sync-sheets${dryRun ? "?dry_run=true" : ""}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || ""}`,
          },
        },
      );
      let data;
      try {
        data = await res.json();
      } catch {
        data = {
          error: `Server returned ${res.status} ${res.statusText || ""} with no readable response.`,
        };
      }
      if (!res.ok && !data.error) {
        data = { error: data.error || `Request failed (${res.status}).` };
      }
      setSyncResult(data);
      if (!dryRun && res.ok && !data.error) {
        fetchCallQueue();
        fetchUnverifiedPrices();
        fetchStats();
        fetchPendingVets();
      }
    } catch (err) {
      setSyncResult({ error: err.message });
    }
    setSyncLoading(false);
  }

  async function fetchCallQueue() {
    setCallQueueLoading(true);
    const [{ data: pendingVetsList }, { data: activeVets }, { data: prices }] =
      await Promise.all([
        supabase
          .from("pending_vets")
          .select("*")
          .eq("status", "pending")
          .order("created_at"),
        supabase.from("vets").select("*").eq("status", "active").order("name"),
        supabase.from("vet_prices").select("vet_id"),
      ]);
    const vetsWithPrices = new Set((prices || []).map((p) => p.vet_id));
    const pending = (pendingVetsList || []).map((v) => ({
      ...v,
      _source: "pending",
      _hasPrices: false,
      _declined: v.notes === "declined_to_share",
    }));
    const activeAll = (activeVets || []).map((v) => ({
      ...v,
      _source: "active",
      _hasPrices: vetsWithPrices.has(v.id),
      _declined: v.internal_notes === "declined_to_share",
    }));
    const activeMissing = activeAll.filter(
      (v) => !v._hasPrices && !v._declined,
    );
    setFullCallQueue([...pending, ...activeAll]);
    setCallQueue([...pending, ...activeMissing]);
    setCallQueueLoading(false);
  }

  async function saveCallPrices(vet) {
    const targetVet =
      lockedVetId && lockedVetId !== vet.id
        ? { ...vet, id: lockedVetId, name: lockedVetName }
        : vet;
    const vetToSave = targetVet;
    setCallSaving(true);
    const latestPrices = callPricesRef.current;
    const validPrices = latestPrices.filter(
      (p) => p.service_id && p.species && (p.price_low || p.call_for_quote),
    );
    if (callPrices.length > 0 && validPrices.length < callPrices.length) {
      setCallSaving(false);
      setCallSpeciesError(true);
      return;
    }

    function cleanPrice(p, vetId) {
      return {
        vet_id: vetId,
        service_id: p.service_id,
        price_low: p.price_low ? parseFloat(p.price_low) : null,
        price_high: p.price_high ? parseFloat(p.price_high) : null,
        price_type: p.price_type || "exact",
        includes_bloodwork: !!p.includes_bloodwork,
        includes_xrays: !!p.includes_xrays,
        includes_anesthesia: !!p.includes_anesthesia,
        species:
          p.species === "other" ? p.speciesOther || "other" : p.species || null,
        call_for_quote: !!p.call_for_quote,
        notes: p.notes || null,
        is_verified: true,
        source: "call_sheet",
      };
    }

    let savedVetId = callReviewVetId || vet.id;
    if (vetToSave._source === "pending" && !callReviewVetId) {
      const { data: existingVet } = await supabase
        .from("vets")
        .select("id")
        .ilike("name", vetToSave.name.trim())
        .maybeSingle();
      if (existingVet) {
        savedVetId = existingVet.id;
        await supabase
          .from("pending_vets")
          .update({ status: "approved" })
          .eq("id", vetToSave.id);
      } else {
        const slug = (vetToSave.slug || vetToSave.name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        // ── Auto-lookup neighborhood from Google Geocoding API ──
        const geo = await lookupAddress(
          vetToSave.address,
          vetToSave.city,
          vetToSave.zip_code,
        );
        const autoNeighborhood = geo.neighborhood || null;
        const { data: newVet, error: vetError } = await supabase
          .from("vets")
          .insert({
            name: vetToSave.name,
            slug,
            address: vetToSave.address,
            city: vetToSave.city,
            state: vetToSave.state || null,
            zip_code: vetToSave.zip_code,
            phone: vetToSave.phone,
            // ── cleanWebsiteUrl applied here ──
            website: cleanWebsiteUrl(vetToSave.website),
            hours: vetToSave.hours,
            neighborhood: autoNeighborhood || vetToSave.neighborhood || null,
            latitude: geo.latitude ?? null,
            longitude: geo.longitude ?? null,
            vet_type: vetToSave.vet_type
              ? Array.isArray(vetToSave.vet_type)
                ? vetToSave.vet_type
                : [vetToSave.vet_type]
              : ["General Practice"],
            accepting_new_patients: null,
            carecredit: false,
            status: "inactive",
          })
          .select()
          .single();
        if (vetError) {
          alert("Error approving vet: " + vetError.message);
          setCallSaving(false);
          return;
        }
        await supabase
          .from("pending_vets")
          .update({ status: "approved" })
          .eq("id", vetToSave.id);
        savedVetId = newVet.id;
      }
      // Any notes written against the pending vet's id still point at the old id.
      // Remap them to the real vet id so their "go to vet" links keep working.
      // Best-effort: if this fails, the read-time name fallback still covers it.
      if (savedVetId && savedVetId !== vetToSave.id) {
        try {
          await supabase
            .from("call_notes")
            .update({ vet_id: savedVetId })
            .eq("vet_id", vetToSave.id);
          setAllCallNotes((prev) =>
            prev.map((n) =>
              n.vet_id === vetToSave.id ? { ...n, vet_id: savedVetId } : n,
            ),
          );
        } catch (e) {
          // Non-fatal — the name fallback in jumpToVet still resolves these.
        }
      }
      const updatedVet = {
        ...vetToSave,
        id: savedVetId,
        _source: "active",
        _hasPrices: true,
      };
      setCallQueue((prev) =>
        prev.map((v) =>
          v.id === vetToSave.id && v._source === "pending" ? updatedVet : v,
        ),
      );
      setFullCallQueue((prev) =>
        prev.map((v) =>
          v.id === vetToSave.id && v._source === "pending" ? updatedVet : v,
        ),
      );
    }

    const savedRows = [];
    for (const p of validPrices) {
      const payload = cleanPrice(p, savedVetId);
      const { data, error } = await supabase
        .from("vet_prices")
        .insert(payload)
        .select()
        .single();
      if (error) {
        alert("Price error: " + error.message);
      } else {
        savedRows.push({ ...p, id: data.id });
      }
    }

    setCallSaving(false);
    setCallSaved(true);
    setCallReviewVetId(savedVetId);
    setCallReviewEditing(null);
    setCallPrices([]);
    setLockedVetId(null);
    setLockedVetName("");
    await fetchReviewPrices(savedVetId);
    setCallQueue((prev) =>
      prev.map((v) => (v.id === savedVetId ? { ...v, _hasPrices: true } : v)),
    );
    setFullCallQueue((prev) =>
      prev.map((v) => (v.id === savedVetId ? { ...v, _hasPrices: true } : v)),
    );
    fetchStats();
    fetchVets();
  }

  async function updateReviewPrice(index, form) {
    const row = callReviewPrices[index];
    const { error } = await supabase
      .from("vet_prices")
      .update({
        service_id: form.service_id,
        price_low: form.price_low ? parseFloat(form.price_low) : null,
        price_high: form.price_high ? parseFloat(form.price_high) : null,
        price_type: form.price_type,
        includes_bloodwork: !!form.includes_bloodwork,
        includes_xrays: !!form.includes_xrays,
        includes_anesthesia: !!form.includes_anesthesia,
        species:
          form.species === "other"
            ? form.speciesOther || "other"
            : form.species || null,
        call_for_quote: !!form.call_for_quote,
        notes: form.notes || null,
      })
      .eq("id", row.id);
    if (error) {
      alert("Update error: " + error.message);
      return;
    }
    setCallReviewEditing(null);
    await fetchReviewPrices(callReviewVetId);
    if (selectedVetId === callReviewVetId) fetchPricesForVet(selectedVetId);
  }

  async function deleteReviewPrice(index) {
    const row = callReviewPrices[index];
    const { error } = await supabase
      .from("vet_prices")
      .delete()
      .eq("id", row.id);
    if (error) {
      alert("Delete error: " + error.message);
      return;
    }
    await fetchReviewPrices(callReviewVetId);
    if (selectedVetId === callReviewVetId) fetchPricesForVet(selectedVetId);
  }

  function advanceFromReview() {
    const activeQueue = showAllVets ? fullCallQueue : callQueue;
    const vet = activeQueue[callIndex];
    if (vet) {
      setCallLog((prev) =>
        [
          { name: vet.name, count: callReviewPrices.length, ts: new Date() },
          ...prev,
        ].slice(0, 10),
      );
    }
    setCallSaved(false);
    setCallReviewPrices([]);
    setCallReviewVetId(null);
    setCallReviewEditing(null);
    setCallIndex((i) => i + 1);
  }

  async function markCallStatus(vet, status) {
    if (vet._source === "pending") {
      if (status === "skip") {
        await supabase
          .from("pending_vets")
          .update({ status: "rejected" })
          .eq("id", vet.id);
      } else if (status === "declined") {
        await supabase
          .from("pending_vets")
          .update({ notes: "declined_to_share" })
          .eq("id", vet.id);
      } else {
        await supabase
          .from("pending_vets")
          .update({ notes: status })
          .eq("id", vet.id);
      }
    } else {
      if (status === "declined") {
        await supabase
          .from("vets")
          .update({ internal_notes: "declined_to_share" })
          .eq("id", vet.id);
      } else {
        await supabase
          .from("vets")
          .update({ internal_notes: status })
          .eq("id", vet.id);
      }
    }
    if (status === "declined") {
      setCallQueue((prev) =>
        prev.map((v, idx) =>
          idx === callIndex ? { ...v, _declined: true } : v,
        ),
      );
      setFullCallQueue((prev) =>
        prev.map((v, idx) =>
          idx === callIndex ? { ...v, _declined: true } : v,
        ),
      );
    }
    setCallIndex((i) => i + 1);
  }

  function addCallPriceRow(vet) {
    if (vet && !lockedVetId) {
      setLockedVetId(vet.id);
      setLockedVetName(vet.name);
    }
    setCallPrices((prev) => [
      ...prev,
      {
        service_id: "",
        price_low: "",
        price_high: "",
        price_type: "exact",
        includes_bloodwork: false,
        includes_xrays: false,
        includes_anesthesia: false,
        species: "dog",
        call_for_quote: false,
        notes: "",
      },
    ]);
  }

  const updateCallPrice = useCallback((index, field, value) => {
    setCallPrices((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );
  }, []);

  const removeCallPrice = useCallback((index) => {
    setCallPrices((prev) => prev.filter((_, i) => i !== index));
  }, []);

  async function fetchReviewPrices(vetId) {
    if (!vetId) return;
    const toBool = (v) => v === true || v === "true" || v === 1 || v === "1";
    const { data } = await supabase
      .from("vet_prices")
      .select("*, services(name)")
      .eq("vet_id", vetId)
      .order("created_at");
    const clean = (data || []).map((p) => ({
      ...p,
      includes_bloodwork: toBool(p.includes_bloodwork),
      includes_xrays: toBool(p.includes_xrays),
      includes_anesthesia: toBool(p.includes_anesthesia),
    }));
    setCallReviewPrices(clean);
  }

  async function fetchAllCallNotes() {
    setAllNotesLoading(true);
    const { data } = await supabase
      .from("call_notes")
      .select("*")
      .order("created_at", { ascending: false });
    setAllCallNotes(data || []);
    setAllNotesLoading(false);
  }

  async function fetchCallNotes(vetId) {
    if (!vetId) return;
    const { data } = await supabase
      .from("call_notes")
      .select("*")
      .eq("vet_id", vetId)
      .order("created_at", { ascending: false });
    setCallNotes(data || []);
  }

  async function saveCallNote(vetId, vetName, text) {
    if (!text.trim()) return;
    const { data, error } = await supabase
      .from("call_notes")
      .insert({ vet_id: vetId, vet_name: vetName, note: text.trim() })
      .select()
      .single();
    if (error) {
      alert("Error saving note: " + error.message);
      return;
    }
    setCallNotes((prev) => [data, ...prev]);
    setCallbackNoteText("");
    setAllCallNotes((prev) => [data, ...prev]);
  }

  async function updateCallNote(id, text) {
    if (!text.trim()) return;
    const { error } = await supabase
      .from("call_notes")
      .update({ note: text.trim(), updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      alert("Error updating note: " + error.message);
      return;
    }
    setCallNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, note: text.trim() } : n)),
    );
    setAllCallNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, note: text.trim() } : n)),
    );
    setEditingNoteId(null);
    setEditingNoteText("");
    setAllNotesEditingId(null);
    setAllNotesEditingText("");
  }

  // Create a note from the global panel. Vet is optional: if attached, it
  // links + jumps like any other note; if not, it's a general note.
  async function saveGlobalNote() {
    if (!newNoteText.trim()) return;
    setNewNoteSaving(true);
    const { data, error } = await supabase
      .from("call_notes")
      .insert({
        vet_id: newNoteVetId,
        vet_name: newNoteVetId ? newNoteVetName : "General note",
        note: newNoteText.trim(),
      })
      .select()
      .single();
    setNewNoteSaving(false);
    if (error) {
      alert("Error saving note: " + error.message);
      return;
    }
    setAllCallNotes((prev) => [data, ...prev]);
    // If the note is for the vet currently open, reflect it in the per-vet list.
    if (newNoteVetId && newNoteVetId === notesVetId) {
      setCallNotes((prev) => [data, ...prev]);
    }
    setNewNoteText("");
    setNewNoteVetId(null);
    setNewNoteVetName("");
    setNewNoteVetSearch("");
    setShowNewNote(false);
  }

  async function deleteCallNote(id) {
    const { error } = await supabase.from("call_notes").delete().eq("id", id);
    if (error) {
      alert("Error deleting note: " + error.message);
      return;
    }
    setCallNotes((prev) => prev.filter((n) => n.id !== id));
    setAllCallNotes((prev) => prev.filter((n) => n.id !== id));
    setDeletingNoteId(null);
    setAllNotesDeletingId(null);
  }

  // Jump the call queue to a specific vet (used from the global notes list).
  // Searches the unpriced queue first; if not there, switches to "All vets"
  // and searches the full queue. Warns on unsaved changes before navigating.
  async function jumpToVet(vetId, vetName) {
    const go = async () => {
      const matchesId = (v) => v.id === vetId;
      const matchesName = (v) =>
        vetName && v.name && v.name.trim() === vetName.trim();
      const find = (list) =>
        (list || []).find(matchesId) ||
        (vetName ? (list || []).find(matchesName) : null);

      // 1. In the call queues → jump straight to it in the Call Sheet.
      let idx = callQueue.findIndex(
        (v) => v.id === vetId || (vetName && v.name?.trim() === vetName.trim()),
      );
      if (idx !== -1) {
        setShowAllVets(false);
        goToQueueIndex(idx);
        return;
      }
      idx = fullCallQueue.findIndex(
        (v) => v.id === vetId || (vetName && v.name?.trim() === vetName.trim()),
      );
      if (idx !== -1) {
        setShowAllVets(true);
        goToQueueIndex(idx);
        return;
      }

      // 2. Not in the queue — find the actual vet record (active/inactive) or
      //    pending record from loaded state, and open the right editor.
      const activeVet = find(vets);
      if (activeVet) {
        setShowAllNotes(false);
        // Filter the vets list down to this vet so it's actually visible
        // (the list is paginated — otherwise it may be on another page).
        setVetStatusFilter("all");
        setVetSearch(activeVet.name || "");
        setVetPage(1);
        setEditingVet(activeVet.id);
        setSelectedVetId(activeVet.id);
        setTab("Vets");
        window.scrollTo({ top: 0, behavior: smoothScroll() });
        return;
      }
      const pendingVet = find(pendingVets);
      if (pendingVet) {
        setShowAllNotes(false);
        setPendingVetSearch(pendingVet.name || "");
        setPendingVetPage(1);
        setEditingPendingVet(pendingVet.id);
        setTab("Pending Vets");
        window.scrollTo({ top: 0, behavior: smoothScroll() });
        return;
      }

      // 3. Last resort — query the database directly (state may be stale).
      try {
        let dbVet = null;
        if (vetId) {
          const { data } = await supabase
            .from("vets")
            .select("*")
            .eq("id", vetId)
            .maybeSingle();
          dbVet = data;
        }
        if (!dbVet && vetName) {
          const { data } = await supabase
            .from("vets")
            .select("*")
            .ilike("name", vetName.trim())
            .maybeSingle();
          dbVet = data;
        }
        if (dbVet) {
          setVets((prev) =>
            prev.some((v) => v.id === dbVet.id) ? prev : [...prev, dbVet],
          );
          setShowAllNotes(false);
          setVetStatusFilter("all");
          setVetSearch(dbVet.name || "");
          setVetPage(1);
          setEditingVet(dbVet.id);
          setSelectedVetId(dbVet.id);
          setTab("Vets");
          window.scrollTo({ top: 0, behavior: smoothScroll() });
          return;
        }
      } catch (e) {
        // fall through to the not-found message
      }

      alert(
        "This vet couldn't be found — it may have been removed. Try Refresh.",
      );
    };

    if (hasUnsavedChanges()) {
      setUnsavedModal({
        message: "You have unsaved changes. Leave and go to this vet anyway?",
        action: go,
      });
      return;
    }
    go();
  }

  function goToQueueIndex(idx) {
    setCallIndex(idx);
    setCallPrices([]);
    setCallReviewPrices([]);
    setCallReviewVetId(null);
    setCallSaved(false);
    setLockedVetId(null);
    setLockedVetName("");
    setShowAllNotes(false);
    setTab("Call Sheet");
    window.scrollTo({ top: 0, behavior: smoothScroll() });
  }

  async function fetchAdminUsers() {
    setAdminUsersLoading(true);
    const { data } = await supabase
      .from("admin_users")
      .select("*")
      .order("created_at");
    setAdminUsers(data || []);
    setAdminUsersLoading(false);
  }

  async function inviteAdminUser() {
    if (!inviteForm.email.trim()) {
      setInviteError("Email is required.");
      return;
    }
    setInviteSaving(true);
    setInviteError("");
    const { error } = await supabase.from("admin_users").insert({
      email: inviteForm.email.trim().toLowerCase(),
      full_name: inviteForm.full_name.trim() || null,
      status: "active",
      can_view_call_sheet: !!inviteForm.can_view_call_sheet,
      can_edit_prices: !!inviteForm.can_edit_prices,
      can_approve_vets: !!inviteForm.can_approve_vets,
      can_manage_users: !!inviteForm.can_manage_users,
      can_manage_team: !!inviteForm.can_manage_team,
      invited_by: currentUserEmail,
    });
    if (error) {
      setInviteError(error.message);
      setInviteSaving(false);
      return;
    }
    setInviteForm({ email: "", full_name: "" });
    setShowInviteForm(false);
    setInviteSaving(false);
    fetchAdminUsers();
  }

  function closeInviteForm() {
    setShowInviteForm(false);
    setInviteForm({ email: "", full_name: "" });
    setInviteError("");
  }

  // Team tab has three mutually-exclusive interactive states: the invite form,
  // an open name-edit, and a pending deactivate confirm. Only one at a time —
  // opening any one closes the others.
  function closeAllTeamPanels() {
    setShowInviteForm(false);
    setInviteForm({ email: "", full_name: "" });
    setInviteError("");
    setTeamEditingId(null);
    setTeamEditName("");
    setTeamDeactivatingId(null);
    setTeamDeletingId(null);
  }

  async function updateAdminPermission(id, field, value) {
    // Guard: don't remove Manage Team from the last active admin who has it.
    if (field === "can_manage_team" && value === false) {
      const target = adminUsers.find((u) => u.id === id);
      if (
        target?.status === "active" &&
        activeManageTeamCount(adminUsers) <= 1
      ) {
        alert(
          "You can't remove Manage Team from the last member who has it — someone needs to be able to manage the team. Grant another active member Manage Team first.",
        );
        return;
      }
    }
    await supabase
      .from("admin_users")
      .update({ [field]: value })
      .eq("id", id);
    setAdminUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, [field]: value } : u)),
    );
  }

  async function updateAdminName(id, name) {
    await supabase
      .from("admin_users")
      .update({ full_name: name.trim() || null })
      .eq("id", id);
    setAdminUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, full_name: name.trim() || null } : u,
      ),
    );
    setTeamEditingId(null);
    setTeamEditName("");
  }

  // Count active admins who can manage the team. Used to prevent locking
  // everyone out of team management.
  function activeManageTeamCount(list) {
    return list.filter((u) => u.status === "active" && u.can_manage_team)
      .length;
  }

  async function toggleAdminStatus(user) {
    const newStatus = user.status === "active" ? "inactive" : "active";
    // Guard: don't deactivate the last active Manage-Team admin.
    if (
      newStatus === "inactive" &&
      user.can_manage_team &&
      activeManageTeamCount(adminUsers) <= 1
    ) {
      alert(
        "You can't deactivate the last team member with Manage Team access — someone needs to be able to manage the team. Give another active member Manage Team first.",
      );
      setTeamDeactivatingId(null);
      return;
    }
    await supabase
      .from("admin_users")
      .update({ status: newStatus })
      .eq("id", user.id);
    setAdminUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)),
    );
    setTeamDeactivatingId(null);
  }

  async function deleteAdminUser(user) {
    // Guard 1: never delete yourself (would risk locking yourself out).
    if (user.email === currentUserEmail) {
      alert("You can't delete your own admin account.");
      setTeamDeletingId(null);
      return;
    }
    // Guard 2: don't delete the last active member who can manage the team.
    if (
      user.status === "active" &&
      user.can_manage_team &&
      activeManageTeamCount(adminUsers) <= 1
    ) {
      alert(
        "You can't delete the last team member with Manage Team access — someone needs to be able to manage the team. Grant another active member Manage Team first.",
      );
      setTeamDeletingId(null);
      return;
    }
    const { error } = await supabase
      .from("admin_users")
      .delete()
      .eq("id", user.id);
    if (error) {
      alert("Error deleting team member: " + error.message);
      setTeamDeletingId(null);
      return;
    }
    setAdminUsers((prev) => prev.filter((u) => u.id !== user.id));
    setTeamDeletingId(null);
  }

  async function fetchWaitlist() {
    setWaitlistLoading(true);
    const { data } = await supabase
      .from("waitlist")
      .select("id, email, source, created_at")
      .order("created_at", { ascending: false });
    setWaitlist(data || []);
    setWaitlistLoading(false);
  }

  // Download the waitlist as a CSV (email + signup date + source).
  function exportWaitlistCsv() {
    const rows = [["Email", "Signed up", "Source"]];
    waitlist.forEach((w) => {
      rows.push([
        w.email || "",
        w.created_at ? new Date(w.created_at).toISOString() : "",
        w.source || "",
      ]);
    });
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `petparrk-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function fetchSymptomLogs() {
    setSymptomLoading(true);
    const { data } = await supabase
      .from("symptom_checks")
      .select("id, created_at, triage_result, pet_id, pets(name, species)")
      .order("created_at", { ascending: false })
      .limit(200);
    setSymptomLogs(data || []);
    setSymptomLoading(false);
  }

  async function fetchPricesForVet(vetId) {
    if (!vetId) return;
    setPricesLoading(true);
    setVetPrices([]);
    const { data, error } = await supabase
      .from("vet_prices")
      .select(`*, services(name), _ts:created_at`)
      .eq("vet_id", vetId)
      .order("created_at")
      .limit(200);
    if (error) console.error("fetchPricesForVet error:", error);
    const toBool = (v) => v === true || v === "true" || v === 1 || v === "1";
    const clean = (data || []).map((p) => ({
      ...p,
      includes_bloodwork: toBool(p.includes_bloodwork),
      includes_xrays: toBool(p.includes_xrays),
      includes_anesthesia: toBool(p.includes_anesthesia),
    }));
    setVetPrices(clean);
    setPricesLoading(false);
  }

  // ── Submission actions ────────────────────────────────────────────
  async function updateSubmissionStatus(id, status, overrideServiceId) {
    await supabase.from("price_submissions").update({ status }).eq("id", id);
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s)),
    );

    // When approving: insert into vet_prices so it shows on the vet profile.
    // Phase D-correct: read price_low/price_high, carry price_type, use the
    // pre-resolved service_id (or an admin-chosen override for unmapped lines),
    // and pass through species / includes_* / carecredit.
    if (status === "approved") {
      const sub = submissions.find((s) => s.id === id);
      if (!sub) {
        fetchStats();
        return;
      }

      // Resolve vet_id — prefer stored, fall back to name lookup.
      let vetId = sub.vet_id || null;
      if (!vetId && sub.vet_name) {
        const { data: vetMatch } = await supabase
          .from("vets")
          .select("id")
          .ilike("name", sub.vet_name.trim())
          .maybeSingle();
        if (vetMatch) vetId = vetMatch.id;
      }

      // Service: use the admin override (from Match-to-service), else the
      // pre-resolved service_id from extraction, else a last-resort name lookup
      // for legacy manual submissions.
      let serviceId = overrideServiceId || sub.service_id || null;
      if (!serviceId && sub.service_name) {
        const { data: svcMatch } = await supabase
          .from("services")
          .select("id")
          .ilike("name", sub.service_name.trim())
          .maybeSingle();
        if (svcMatch) serviceId = svcMatch.id;
      }

      // DESIGN RULE: nothing enters vet_prices without a service_id. Unmapped
      // lines must be matched (or skipped) first.
      if (vetId && serviceId) {
        // price_low is the primary; fall back to legacy price_paid if present.
        const low =
          sub.price_low != null
            ? sub.price_low
            : sub.price_paid != null
              ? parseFloat(sub.price_paid)
              : null;
        const { error } = await supabase.from("vet_prices").insert({
          vet_id: vetId,
          service_id: serviceId,
          price_low: low,
          price_high: sub.price_high != null ? sub.price_high : null,
          price_type: sub.price_type || "exact",
          species: sub.species || null,
          includes_bloodwork: sub.includes_bloodwork ?? null,
          includes_xrays: sub.includes_xrays ?? null,
          includes_anesthesia: sub.includes_anesthesia ?? null,
          carecredit: sub.carecredit || null,
          is_verified: true,
          source: "community_submission",
          notes: sub.submitter_note || sub.raw_label || null,
        });
        if (error) {
          console.error("Failed to insert vet_price:", error.message);
          alert(`Approved, but price entry failed: ${error.message}`);
        }
      } else {
        const missing = [];
        if (!vetId) missing.push("vet not found in database");
        if (!serviceId)
          missing.push("no service matched — use Match to service first");
        alert(
          `Marked approved but price NOT added:\n${missing.join("\n")}\n\nMatch the service or add via the Prices tab.`,
        );
      }
    }

    fetchStats();
  }

  // ── Pending Vet actions ───────────────────────────────────────────
  async function approvePendingVet(vet) {
    const form = editingPendingVet === vet.id ? pendingVetForm : vet;
    const slug = (form.slug || form.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    // ── Auto-lookup neighborhood from Google Geocoding API ──
    const geo = await lookupAddress(form.address, form.city, form.zip_code);
    const autoNeighborhood = geo.neighborhood || null;
    const { error } = await supabase.from("vets").insert({
      name: form.name,
      slug,
      address: form.address,
      city: form.city,
      state: form.state || null,
      zip_code: form.zip_code,
      phone: form.phone,
      // ── cleanWebsiteUrl strips tracking params automatically ──
      website: cleanWebsiteUrl(form.website),
      hours: form.hours,
      // ── neighborhood: auto-lookup first, then manual entry, then null ──
      neighborhood: autoNeighborhood || form.neighborhood || null,
      latitude: geo.latitude ?? null,
      longitude: geo.longitude ?? null,
      vet_type: form.vet_type
        ? Array.isArray(form.vet_type)
          ? form.vet_type
          : [form.vet_type]
        : ["General Practice"],
      accepting_new_patients: form.accepting_new_patients ?? null,
      carecredit: form.carecredit ?? false,
      status: "inactive",
      internal_notes: form.notes || form.internal_notes || null,
      // Carried through approval. The sync can put a pricing note on a pending
      // vet from column AM, and without this it was captured and then dropped
      // the moment Susan approved them.
      pricing_note: form.pricing_note || null,
    });
    if (error) {
      alert("Error approving: " + error.message);
      return;
    }

    // ── Get the new vet's integer ID ──
    const { data: newVet } = await supabase
      .from("vets")
      .select("id")
      .eq("slug", slug)
      .single();

    // ── Migrate prices from pending_vet_id to vet_id ──
    if (newVet) {
      await supabase
        .from("vet_prices")
        .update({ vet_id: newVet.id, pending_vet_id: null })
        .eq("pending_vet_id", vet.id);
    }

    await supabase
      .from("pending_vets")
      .update({ status: "approved" })
      .eq("id", vet.id);
    setPendingVets((prev) => prev.filter((v) => v.id !== vet.id));
    setEditingPendingVet(null);
    fetchStats();
    fetchVets();
  }

  async function rejectPendingVet(id) {
    await supabase
      .from("pending_vets")
      .update({ status: "rejected" })
      .eq("id", id);
    setPendingVets((prev) => prev.filter((v) => v.id !== id));
    fetchStats();
  }

  // ── Vet actions ───────────────────────────────────────────────────
  function startEditVet(vet, overrides = {}) {
    closeAllEditors();
    setShowAllNotes(false);
    setEditingVet(vet.id);
    // Clean vet_type on load — strip brackets/quotes from any malformed entries
    const rawType = vet.vet_type;
    const cleanedType = Array.isArray(rawType)
      ? rawType
          .map((t) =>
            String(t)
              .replace(/[\[\]"'\\]/g, "")
              .trim(),
          )
          .filter(Boolean)
      : typeof rawType === "string"
        ? rawType
            .replace(/[\[\]"'\\]/g, "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
    // Deduplicate
    const dedupedType = [...new Set(cleanedType)];
    const initialVetForm = { ...vet, ...overrides, vet_type: dedupedType };
    setVetForm(initialVetForm);
    snapshotEditor(initialVetForm);
    setVetVerifyChecks({
      address: false,
      phone: false,
      website: false,
      hours: false,
      neighborhood: false,
      ownership: false,
    });
    // Scroll the newly-opened editor into view at the top, so switching from one
    // editor to another lands at the start of the new form (not wherever the
    // previous one left the page). Poll briefly for the card to render.
    let tries = 0;
    const scrollToCard = () => {
      const el = document.querySelector(`[data-vet-card="${vet.id}"]`);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: smoothScroll() });
      } else if (tries++ < 20) {
        setTimeout(scrollToCard, 50);
      }
    };
    setTimeout(scrollToCard, 50);
  }

  async function saveVet() {
    setVetSaving(true);
    const { error } = await supabase
      .from("vets")
      .update({
        name: vetForm.name,
        slug: vetForm.slug,
        neighborhood: vetForm.neighborhood || null,
        city: vetForm.city,
        state: vetForm.state || null,
        address: vetForm.address,
        zip_code: vetForm.zip_code,
        phone: vetForm.phone,
        // ── cleanWebsiteUrl applied on save ──
        website: cleanWebsiteUrl(vetForm.website),
        vet_type: Array.isArray(vetForm.vet_type)
          ? vetForm.vet_type
          : [vetForm.vet_type],
        ownership: vetForm.ownership,
        accepting_new_patients: vetForm.accepting_new_patients,
        carecredit: vetForm.carecredit,
        hours: vetForm.hours,
        status: vetForm.status,
        internal_notes: vetForm.internal_notes,
        pricing_note: vetForm.pricing_note || null,
        last_verified: vetForm.last_verified,
      })
      .eq("id", editingVet);
    if (!error) {
      setVets((prev) =>
        prev.map((v) =>
          v.id === editingVet
            ? { ...v, ...vetForm, website: cleanWebsiteUrl(vetForm.website) }
            : v,
        ),
      );
      setEditingVet(null);
    } else {
      alert("Save failed: " + error.message);
    }
    setVetSaving(false);
  }

  async function addVet() {
    const slug =
      addVetForm.slug ||
      addVetForm.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const { data, error } = await supabase
      .from("vets")
      .insert({
        ...addVetForm,
        slug,
        // ── cleanWebsiteUrl applied on add ──
        website: cleanWebsiteUrl(addVetForm.website),
        neighborhood: addVetForm.neighborhood || null,
        vet_type: Array.isArray(addVetForm.vet_type)
          ? addVetForm.vet_type
          : [addVetForm.vet_type],
      })
      .select()
      .single();
    if (!error) {
      setVets((prev) =>
        [...prev, data].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setShowAddVet(false);
      setAddVetForm({
        name: "",
        slug: "",
        neighborhood: "",
        city: "",
        address: "",
        zip_code: "",
        phone: "",
        website: "",
        vet_type: [],
        ownership: "",
        accepting_new_patients: null,
        carecredit: null,
        hours: "",
        status: "active",
        internal_notes: "",
        pricing_note: "",
      });
      fetchStats();
    } else {
      alert("Error: " + error.message);
    }
  }

  async function toggleVetStatus(vet) {
    const newStatus = vet.status === "active" ? "inactive" : "active";
    await supabase.from("vets").update({ status: newStatus }).eq("id", vet.id);
    setVets((prev) =>
      prev.map((v) => (v.id === vet.id ? { ...v, status: newStatus } : v)),
    );
    fetchStats();
  }

  // ── Price actions ─────────────────────────────────────────────────
  function startEditPrice(price) {
    closeAllEditors();
    setShowAllNotes(false);
    setEditingPrice(price.id);
    const initialPriceForm = {
      ...price,
      price_low: price.price_low != null ? String(price.price_low) : "",
      price_high: price.price_high != null ? String(price.price_high) : "",
    };
    setPriceForm(initialPriceForm);
    snapshotEditor(initialPriceForm);
  }

  async function savePrice(formData) {
    const f = formData || priceForm;
    if (
      !f.service_id ||
      !f.species ||
      (!f.call_for_quote && (!f.price_low || !f.price_type))
    ) {
      setEditPriceError(true);
      return;
    }
    setEditPriceError(false);
    setPriceSaving(true);
    const payload = {
      service_id: f.service_id,
      price_low: f.price_low !== "" ? parseFloat(f.price_low) : null,
      price_high: f.price_high !== "" ? parseFloat(f.price_high) : null,
      price_type: f.price_type,
      includes_bloodwork: !!f.includes_bloodwork,
      includes_xrays: !!f.includes_xrays,
      includes_anesthesia: !!f.includes_anesthesia,
      species: f.species === "other" ? f.species_other || "Other" : f.species,
      call_for_quote: !!f.call_for_quote,
      // Same normalisation as savePriceNote: an emptied rich-text field leaves
      // "<p></p>" behind, which is a non-empty string, so a cleared note would
      // otherwise stay set as far as the database is concerned.
      notes: hasText(f.notes) ? f.notes : null,
      vaccines_included: f.vaccines_included || null,
      is_verified: true,
    };

    // ── Taking a call-sheet price over ──
    // The sheet is where prices are entered in bulk; this is where they're
    // finalised. Editing one here hands ownership to Admin by changing its
    // source, which is the whole mechanism: the sync skips any vet+service
    // holding an 'admin' row, so it will neither delete this value nor put
    // the sheet's back. Before the sync learned that rule, an edit here was
    // reverted on the next run, which is why the Edit button was removed.
    //
    // sheet_value records what the sheet held at the moment of the override,
    // so the Prices tab can show both numbers. The sync keeps it current from
    // then on — if Susan later corrects the cell, this line follows it.
    //
    // in_conflict is cleared deliberately. A conflict means two sources
    // disagree and nobody has decided; an override IS the decision, so the
    // price should go back to being visible on the vet page rather than
    // staying hidden behind "being updated shortly".
    const current = vetPrices.find((p) => p.id === editingPrice);
    if (current && current.source === "sheet") {
      payload.source = "admin";
      payload.sheet_value = current.call_for_quote
        ? "Call for quote"
        : current.price_low
          ? formatPrice(
              current.price_low,
              current.price_high,
              current.price_type,
            )
          : null;
      payload.in_conflict = false;
      payload.conflict_key = null;
    }

    const { data, error } = await supabase
      .from("vet_prices")
      .update(payload)
      .eq("id", editingPrice)
      .select();
    if (error) {
      alert("Save failed: " + error.message + "\n\nCode: " + error.code);
    } else if (!data || data.length === 0) {
      alert(
        "Save ran but 0 rows were updated.\n\nCheck Supabase RLS policies on vet_prices.",
      );
    } else {
      setVetPrices((prev) =>
        prev.map((p) =>
          p.id === editingPrice
            ? { ...p, ...payload, services: p.services }
            : p,
        ),
      );
      setEditingPrice(null);
      if (callReviewVetId === selectedVetId) fetchReviewPrices(callReviewVetId);
    }
    setPriceSaving(false);
  }

  // Gives an overridden price back to the call sheet.
  //
  // Sets source back to 'sheet' rather than deleting the row. The sync then
  // reconciles it the ordinary way: it sees a sheet row holding a value the
  // sheet doesn't contain, removes it, and inserts the sheet's — and because
  // that is a one-for-one replacement, the note-carrying rule brings any note
  // along with it. Deleting here would drop the note and leave the service
  // with no price until the next run.
  //
  // So the value doesn't change on screen straight away. The next sync is
  // what restores the sheet's number, and the UI says so rather than implying
  // an instant revert.
  async function handBackToSheet(id) {
    setHandBackSaving(id);
    const { data, error } = await supabase
      .from("vet_prices")
      .update({ source: "sheet", sheet_value: null })
      .eq("id", id)
      .select();
    if (error) {
      alert("Hand back failed: " + error.message + "\n\nCode: " + error.code);
    } else if (!data || data.length === 0) {
      alert(
        "Save ran but 0 rows were updated.\n\nCheck Supabase RLS policies on vet_prices.",
      );
    } else {
      setVetPrices((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, source: "sheet", sheet_value: null } : p,
        ),
      );
      setHandBackConfirm(null);
    }
    setHandBackSaving(null);
  }

  // Saves the public note and nothing else. Used for call-sheet prices, where
  // writing the price columns is what the sync would undo — this touches one
  // column the sync no longer writes, so it holds.
  //
  // An emptied editor is stored as null rather than "<p></p>", which the
  // rich-text editor leaves behind and which is a non-empty string: left as
  // that, the vet page and this list both have to defend against it, and a
  // cleared note reads as still set.
  async function savePriceNote(id) {
    setNoteSaving(true);
    const value = hasText(noteDraft) ? noteDraft : null;
    const { data, error } = await supabase
      .from("vet_prices")
      .update({ notes: value })
      .eq("id", id)
      .select();
    if (error) {
      alert("Note save failed: " + error.message + "\n\nCode: " + error.code);
    } else if (!data || data.length === 0) {
      alert(
        "Save ran but 0 rows were updated.\n\nCheck Supabase RLS policies on vet_prices.",
      );
    } else {
      setVetPrices((prev) =>
        prev.map((p) => (p.id === id ? { ...p, notes: value } : p)),
      );
      setEditingNote(null);
      setNoteDraft("");
      setHandBackConfirm(null);
    }
    setNoteSaving(false);
  }

  async function deletePrice(id) {
    await supabase.from("vet_prices").delete().eq("id", id);
    setVetPrices((prev) => prev.filter((p) => p.id !== id));
    setDeletePriceConfirm(null);
    fetchStats();
    if (callReviewVetId === selectedVetId) fetchReviewPrices(callReviewVetId);
  }

  async function addPrice() {
    if (
      !addPriceForm.service_id ||
      !addPriceForm.species ||
      (!addPriceForm.call_for_quote &&
        (!addPriceForm.price_low || !addPriceForm.price_type))
    ) {
      setAddPriceError(true);
      return;
    }
    setAddPriceError(false);
    const { data, error } = await supabase
      .from("vet_prices")
      .insert({
        vet_id: selectedVetId,
        service_id: addPriceForm.service_id,
        price_low: addPriceForm.price_low,
        price_high: addPriceForm.price_high || null,
        price_type: addPriceForm.price_type,
        includes_bloodwork: addPriceForm.includes_bloodwork,
        includes_xrays: addPriceForm.includes_xrays,
        includes_anesthesia: addPriceForm.includes_anesthesia,
        species:
          addPriceForm.species === "other"
            ? addPriceForm.species_other || "Other"
            : addPriceForm.species,
        call_for_quote: addPriceForm.call_for_quote,
        notes: hasText(addPriceForm.notes) ? addPriceForm.notes : null,
        vaccines_included: addPriceForm.vaccines_included || null,
      })
      .select("*, services(name)")
      .single();
    if (!error) {
      setVetPrices((prev) => [...prev, data]);
      setShowAddPrice(false);
      setAddPriceForm({
        service_id: "",
        price_low: "",
        price_high: "",
        price_type: "",
        includes_bloodwork: false,
        includes_xrays: false,
        includes_anesthesia: false,
        species: "",
        species_other: "",
        call_for_quote: false,
        notes: "",
        vaccines_included: "",
      });
      setAddPriceError(false);
      fetchStats();
      if (callReviewVetId === selectedVetId) fetchReviewPrices(callReviewVetId);
    } else {
      alert("Error: " + error.message);
    }
  }

  // ── Vet price search helpers ──────────────────────────────────────
  const filteredPriceVets = vetPriceSearch.trim()
    ? vets.filter((v) =>
        v.name.toLowerCase().includes(vetPriceSearch.trim().toLowerCase()),
      )
    : vets;

  function selectPriceVet(v) {
    setSelectedVetId(v.id);
    setVetPriceSearch(v.name);
    setShowVetDropdown(false);
    setEditingPrice(null);
    setShowAddPrice(false);
    fetchPricesForVet(v.id);
  }

  function handlePriceSearchChange(e) {
    const val = e.target.value;
    setVetPriceSearch(val);
    setShowVetDropdown(true);
    if (!val.trim()) {
      setSelectedVetId("");
      setVetPrices([]);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────
  function formatDate(iso) {
    if (!iso) return "—";
    // Date-only strings ("YYYY-MM-DD") parse as UTC midnight, which then
    // renders as the previous day in western timezones. Parse those as
    // LOCAL by splitting the parts. Full timestamps (with T) are fine as-is.
    let d;
    if (typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, day] = iso.split("-").map(Number);
      d = new Date(y, m - 1, day);
    } else {
      d = new Date(iso);
    }
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  function formatLogDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  function formatLogTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  }
  // One format across Admin: "Sep 29, 2026", and "… at 4:12 PM" where the
  // time matters. The built-in version rendered "Sep 29, 2026, 4:12 PM" — a
  // comma doing two jobs in one string.
  function formatDateTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return `${d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })} at ${d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }
  function formatPrice(low, high, type) {
    if (!low) return "—";
    const fmt = (n) =>
      Number(n).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    if (type === "starting") return `$${fmt(low)}+`;
    if (type === "range" && high) return `$${fmt(low)}–$${fmt(high)}`;
    return `$${fmt(low)}`;
  }

  const filteredSubs = submissions.filter((s) =>
    subFilter === "all" ? true : s.status === subFilter,
  );

  // Phase D — group submissions into batches. Receipt-extracted rows share a
  // receipt_batch_id; manual entries are their own single-item "batch". Search
  // filters by vet, service, or submitter. Then paginate the batches.
  const searchedSubs = filteredSubs.filter((s) => {
    if (!subSearch.trim()) return true;
    const q = subSearch.toLowerCase();
    return (
      s.vet_name?.toLowerCase().includes(q) ||
      s.service_name?.toLowerCase().includes(q) ||
      s.raw_label?.toLowerCase().includes(q) ||
      s.submitter_email?.toLowerCase().includes(q) ||
      s.submitter_name?.toLowerCase().includes(q)
    );
  });

  // Group by VET (one card per clinic), then sub-group each vet's items by
  // receipt (or manual). Susan reasons by clinic; the receipt stays visible as
  // the evidence unit for per-receipt batch approval.
  const vetGroupMap = new Map();
  for (const s of searchedSubs) {
    const vetKey = s.vet_id
      ? `v${s.vet_id}`
      : `n${(s.vet_name || "unknown").toLowerCase()}`;
    if (!vetGroupMap.has(vetKey))
      vetGroupMap.set(vetKey, { vetName: s.vet_name, items: [] });
    vetGroupMap.get(vetKey).items.push(s);
  }

  // Receipt viewing. The bucket is private, so each view needs a signed link.
  // Generated only when Susan asks for one — links for every receipt on the
  // page would exist whether or not anyone looked at them. They last an hour:
  // long enough to be interrupted and come back, short enough that a link left
  // in a browser history stops working the same day. The file itself never
  // expires; a lapsed link just means clicking again.
  const [receiptLinks, setReceiptLinks] = useState({});
  const [receiptOpen, setReceiptOpen] = useState({});
  const [receiptLoading, setReceiptLoading] = useState({});

  async function toggleReceipt(path) {
    if (!path) return;
    if (receiptOpen[path]) {
      setReceiptOpen((o) => ({ ...o, [path]: false }));
      return;
    }
    if (receiptLinks[path]) {
      setReceiptOpen((o) => ({ ...o, [path]: true }));
      return;
    }
    setReceiptLoading((l) => ({ ...l, [path]: true }));
    const { data, error } = await supabase.storage
      .from("receipts")
      .createSignedUrl(path, 3600);
    setReceiptLoading((l) => ({ ...l, [path]: false }));
    if (error || !data?.signedUrl) {
      alert("Couldn't open that receipt — please try again.");
      return;
    }
    setReceiptLinks((m) => ({ ...m, [path]: data.signedUrl }));
    setReceiptOpen((o) => ({ ...o, [path]: true }));
  }

  // Shown under a submission so prices and the receipt can be read together —
  // the actual job — rather than in a separate tab.
  function ReceiptViewer({ path }) {
    if (!path) return null;
    const open = !!receiptOpen[path];
    const url = receiptLinks[path];
    const isPdf = /\.pdf($|\?)/i.test(path);
    return (
      <div className="adm-receipt">
        <button
          type="button"
          className="adm-receipt-toggle"
          onClick={() => toggleReceipt(path)}
          disabled={!!receiptLoading[path]}
        >
          {receiptLoading[path]
            ? "Opening…"
            : open
              ? "Hide receipt"
              : "View receipt"}
        </button>
        {open &&
          url &&
          (isPdf ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="adm-receipt-open"
            >
              Open PDF in a new tab
            </a>
          ) : (
            <div className="adm-receipt-panel">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt="Submitted receipt" />
              </a>
            </div>
          ))}
      </div>
    );
  }

  // True only when a rich-text value has actual words in it. RichTextEditor
  // saves "<p></p>" or "<p><br></p>" for an empty field, and both are
  // non-empty strings — so a plain truthiness check treats a blank note as
  // content and opens a block with nothing in it.
  function hasText(html) {
    if (!html) return false;
    return (
      String(html)
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim().length > 0
    );
  }

  // Within each vet, split into receipt sub-groups.
  function subGroupsForVet(items) {
    const map = new Map();
    for (const s of items) {
      let key, kind;
      // Group by the receipt itself, not the batch. Someone can upload up to
      // five receipts in one submission, and those rows all share a
      // receipt_batch_id — so grouping by batch put prices from several
      // different receipts under one heading, with View receipt showing only
      // the first file. Prices then looked like they'd come from a receipt
      // they hadn't.
      // Manual entries have no receipt_url, so they still group by batch,
      // which is what keeps a multi-entry manual submission together.
      if (s.receipt_url) {
        key = `receipt-${s.receipt_url}`;
        kind = "receipt";
      } else if (s.receipt_batch_id) {
        key = `batch-${s.receipt_batch_id}`;
        kind = "manual";
      } else {
        key = `single-${s.id}`;
        kind = s.receipt_url ? "receipt" : "manual";
      }
      if (!map.has(key)) map.set(key, { key, kind, items: [] });
      map.get(key).items.push(s);
    }
    return Array.from(map.values()).map((g) => ({
      ...g,
      date: g.items[0].visit_date || g.items[0].created_at,
      submitter:
        g.items[0].submitter_name ||
        g.items[0].submitter_email ||
        g.items[0].user_email ||
        (g.items[0].user_id
          ? `user ${String(g.items[0].user_id).slice(0, 8)}`
          : "a user"),
      clinicVerified: g.items[0].clinic_verified === true,
    }));
  }

  const vetGroups = Array.from(vetGroupMap.values()).map((g) => ({
    vetName: g.vetName,
    items: g.items,
    subGroups: subGroupsForVet(g.items),
  }));

  const SUB_PAGE_SIZE = 8;
  const subTotalPages = Math.max(
    1,
    Math.ceil(vetGroups.length / SUB_PAGE_SIZE),
  );
  const subPageClamped = Math.min(subPage, subTotalPages);
  const pagedVetGroups = vetGroups.slice(
    (subPageClamped - 1) * SUB_PAGE_SIZE,
    subPageClamped * SUB_PAGE_SIZE,
  );

  const filteredVets = vets.filter((v) => {
    const q = vetSearch.toLowerCase();
    const matchesSearch =
      !vetSearch ||
      v.name.toLowerCase().includes(q) ||
      v.neighborhood?.toLowerCase().includes(q);
    const matchesStatus =
      vetStatusFilter === "all" || v.status === vetStatusFilter;
    return matchesSearch && matchesStatus;
  });
  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    const matchesSearch =
      !userSearch ||
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.zip_code?.includes(userSearch);
    const matchesStatus =
      userStatusFilter === "all" ||
      (userStatusFilter === "flagged" && u.is_flagged) ||
      u.status === userStatusFilter;
    return matchesSearch && matchesStatus;
  });
  const filteredLogs =
    symptomFilter === "all"
      ? symptomLogs
      : symptomLogs.filter((s) => s.triage_result === symptomFilter);
  const LOG_PAGE_SIZE = 15;
  const logTotalPages = Math.max(
    1,
    Math.ceil(filteredLogs.length / LOG_PAGE_SIZE),
  );
  const logPageSafe = Math.min(logPage, logTotalPages);
  const pagedLogs = filteredLogs.slice(
    (logPageSafe - 1) * LOG_PAGE_SIZE,
    logPageSafe * LOG_PAGE_SIZE,
  );

  if (session === undefined || !authorized) return null;

  // Shared vet add/edit form — used by both the Add Vet form and the inline
  // edit form so the two stay identical. Styled with our tokens.

  // ── Service dropdown helper (used in multiple places) ─────────────
  // ── Includes pills helper ─────────────────────────────────────────
  function IncludesPills({ form, setForm, fields }) {
    return (
      <div
        style={{
          display: "flex",
          gap: "6px",
          flexWrap: "nowrap",
          marginBottom: "10px",
        }}
      >
        {[
          ["includes_bloodwork", "Bloodwork"],
          ["includes_xrays", "X-rays"],
          ["includes_anesthesia", "Anesthesia"],
        ].map(([f, l]) => (
          <button
            key={f}
            type="button"
            className={`adm-pill${form[f] ? " active" : ""}`}
            onClick={() => setForm((prev) => ({ ...prev, [f]: !prev[f] }))}
          >
            {l}
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .adm-input { width: 100%; height: 44px; padding: 0 14px; border: 1px solid var(--color-border-field); border-radius: 12px; font-size: 15px; font-family: 'Urbanist', sans-serif; outline: none; background: var(--color-white); box-sizing: border-box; }
        textarea.adm-input { height: auto; min-height: 80px; padding: 12px 14px; resize: vertical; }
        .adm-input:focus { border-color: var(--color-terracotta); }
        @media (max-width: 700px) { .adm-input { padding: 8px 10px; font-size: 13px; } }
        select.adm-input { cursor: pointer; padding-right: 28px; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='${svgHex("muted")}' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; }
        /* 42px is the site-wide button height. These were sized by padding alone,
           so they came out shorter than every other button in the product. */
        .adm-btn { display: inline-flex; align-items: center; justify-content: center; height: 40px; padding: 0 14px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: system-ui, sans-serif; white-space: nowrap; box-sizing: border-box; }
        .adm-btn-green { background: var(--color-success); color: var(--color-white); }
        @media (hover: hover) { .adm-btn-green:hover { background: var(--color-success); } }
        .adm-btn-red { background: var(--color-error-light); color: var(--color-error-text); border: var(--pill-border-w, 2px) solid rgb(var(--color-error-rgb) / 0.24); }
        @media (hover: hover) { .adm-btn-red:hover { background: var(--color-error-light); } }
        .call-no-prices-btns { display: flex; gap: 8px; }
        .call-no-prices-btns .adm-b { flex: 1; }
        .call-sheet-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        @media (max-width: 600px) {
          .call-no-prices-btns { flex-direction: column; }
          .call-no-prices-btns .adm-b { width: 100%; flex: unset; }
          .call-sheet-header { flex-direction: column; align-items: flex-start; gap: 16px; }
          .call-sheet-header > div:last-child { width: 100%; display: flex; gap: 6px; }
          .call-sheet-header > div:last-child .adm-btn { flex: 1; }
          .form-grid-4 { grid-template-columns: 1fr 1fr; }
          .form-grid-3 { grid-template-columns: 1fr 1fr; }
        }
        .adm-btn-gray { background: var(--color-badge-neutral-bg); color: var(--color-slate); border: var(--pill-border-w, 2px) solid var(--color-border); }
        @media (hover: hover) { .adm-btn-gray:hover { background: var(--color-badge-neutral-bg); } }
        .adm-btn-outline { background: var(--color-white); color: var(--color-success-text); border: var(--pill-border-w, 2px) solid var(--color-success-text); }
        @media (hover: hover) { .adm-btn-outline:hover { background: var(--color-success-light); } }
        .adm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .stat-card { background: var(--color-white); border: 1px solid var(--color-border); border-radius: 10px; padding: 14px 18px; }
        .tab-btn { padding: 10px 16px; border: none; background: none; font-size: 14px; font-weight: 600; cursor: pointer; color: var(--color-muted); border-bottom: 2px solid transparent; font-family: system-ui, sans-serif; white-space: nowrap; transition: color 0.25s ease, border-bottom-color 0.25s ease; }
        .tab-btn.active { color: var(--color-success-text); border-bottom-color: var(--color-success-text); }
        @media (hover: hover) { .tab-btn:hover:not(.active) { color: var(--color-slate); } }
        .tabs-scroll { overflow-x: auto; display: flex; border-bottom: 1px solid var(--color-badge-neutral-bg); scrollbar-width: none; }
        .tabs-scroll::-webkit-scrollbar { display: none; }
        .tab-badge { display: inline-block; margin-left: 5px; background: var(--color-warning); color: var(--color-white); border-radius: 20px; padding: 1px 6px; font-size: 10px; }
        .badge { display: inline-flex; align-items: center; padding: 7px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; }
        .badge-pending { background: var(--color-caution-light); color: var(--color-warning-text); }
        .badge-approved { background: var(--color-success-light); color: var(--color-success-text); }
        .badge-rejected { background: var(--color-error-light); color: var(--color-error-text); }
        .badge-active { background: var(--color-success-light); color: var(--color-success-text); border: 1px solid rgb(var(--color-success-text-rgb) / 0.22); }
        .badge-inactive { background: var(--color-badge-neutral-bg); color: var(--color-muted); border: 1px solid var(--color-border); }
        .row-edit-bg { background: var(--color-white); border-radius: 10px; padding: 20px 20px 16px 20px; margin: 6px 0 20px 0; border: 1px solid var(--color-border); }
        .pv-edit-btns .adm-btn { font-size: 11px; padding: 8px 10px; }
        @media (min-width: 425px) { .pv-edit-btns .adm-btn { font-size: 13px; padding: 7px 14px; } }
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        .form-grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16px; }
        .field-label { display: block; font-size: 11px; color: var(--color-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .sub-card { background: var(--color-white); border: 1px solid var(--color-border); border-radius: 10px; padding: 18px 20px; margin-bottom: 12px; }
        .pending-vet-card { background: var(--color-white); border: 1px solid var(--color-border); border-radius: 10px; padding: 18px 20px; margin-bottom: 12px; }
        .vet-row { border-bottom: 1px solid var(--color-badge-neutral-bg); padding: 10px 0; }
        .vet-row:last-child { border-bottom: none; }
        .price-row-wrap { border-bottom: 1px solid var(--color-badge-neutral-bg); padding: 18px 16px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .price-row-wrap:last-child { border-bottom: none; }
        .price-row-info { flex: 1; min-width: 0; }
        .price-row-btns { display: flex; gap: 6px; flex-shrink: 0; align-self: flex-start; }
        @media (max-width: 600px) {
          .price-row-wrap { flex-direction: column; gap: 10px; }
          .price-row-btns { width: 100%; padding-top: 10px; border-top: 1px solid var(--color-badge-neutral-bg); }
          .price-row-btns .adm-btn { flex: 1; text-align: center; }
        }
        .log-table-header { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; padding: 10px 16px; background: var(--color-white); border-bottom: 1px solid var(--color-border); }
        .log-table-header span { font-size: 13px; color: var(--color-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .log-row { border-bottom: 1px solid var(--color-border); padding: 14px 16px; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; align-items: center; gap: 8px; }
        .log-row:last-child { border-bottom: none; }
        @media (hover: hover) { .log-row:hover { background: var(--color-white); } }
        .log-mobile { display: none; }
        .log-col { display: block; }
        @media (max-width: 700px) {
          .log-table-header { display: none; }
          .log-row { display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; }
          .log-col { display: none !important; }
          .log-mobile { display: flex !important; flex-direction: column; gap: 6px; width: 100%; }
        }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .stat-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 20px; }
        .filter-bar { display: flex; gap: 6px; flex-wrap: wrap; }
        .tabs-scroll { display: flex; overflow-x: auto; border-bottom: 1px solid var(--color-border); padding: 0 16px; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .tabs-scroll::-webkit-scrollbar { display: none; }
        .users-table-header { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; padding: 10px 16px; background: var(--color-white); border-bottom: 1px solid var(--color-border); }
        .users-table-header span { font-size: 12px; color: var(--color-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .users-table-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; padding: 14px 16px; border-bottom: 1px solid var(--color-border); align-items: start; gap: 8px; }
        .users-table-row:last-child { border-bottom: none; }
        .users-col { display: flex; flex-direction: column; gap: 2px; }
        .users-label { display: none; font-size: 11px; color: var(--color-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
        .users-mobile-detail { display: none; }
        .bio-desktop { display: block; }
        @media (max-width: 600px) { .bio-desktop { display: none; } }
        @media (max-width: 600px) {
          .users-table-header { display: none; }
          .users-table-row { grid-template-columns: 1fr; gap: 0; padding: 14px 16px; border-bottom: 1px solid var(--color-badge-neutral-bg); }
          .users-col { display: none; }
          .users-col-name { margin-bottom: 6px; }
          .users-mobile-detail { display: block; }
        }
        html { scrollbar-gutter: stable; }
        .notes-panel-desktop { top: 0; right: 0; bottom: 0; width: 380px; transform: translateX(100%); }
        .notes-panel-desktop.notes-panel-open { transform: translateX(0); }
        @media (max-width: 600px) {
          .notes-panel-desktop { top: auto; left: 0; right: 0; bottom: 0; width: 100%; height: 70vh; border-radius: 16px 16px 0 0; transform: translateY(100%); }
          .notes-panel-desktop.notes-panel-open { transform: translateY(0); }
        }
        .team-edit-name-row { display: flex; gap: 8px; align-items: center; }
        .team-edit-name-input { flex: 1; min-width: 0; width: 100%; box-sizing: border-box; }
        .team-edit-name-btns { display: flex; gap: 8px; flex-shrink: 0; }
        .team-edit-btn { font-size: 13px; padding: 7px 14px; }
        .team-member-row { display: flex; flex-direction: column; gap: 0; padding: 16px; }
        .team-member-row-top { display: block; }
        .team-member-info { flex: 1; min-width: 0; overflow: visible; }
        .team-perms-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px 12px; }
        .invite-perms-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .invite-perm-label { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; }
        @media (max-width: 700px) {
          .team-member-row-top { flex-direction: column; gap: 12px; }
          .team-perms-grid { grid-template-columns: repeat(2, 1fr); }
          .invite-perms-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 425px) {
          .team-edit-name-row { flex-direction: column; align-items: stretch; }
          .team-edit-name-input { width: 100%; }
          .team-edit-name-btns { justify-content: flex-end; margin-top: 8px; }
          .team-edit-btn { font-size: 11px; padding: 6px 10px; }
          .team-perms-grid { grid-template-columns: repeat(2, 1fr); }
          .invite-perms-grid { grid-template-columns: repeat(2, 1fr); }
        }
        .scroll-arrow-btn { width: 40px; height: 40px; border-radius: 50%; background: var(--color-success-text); color: var(--color-white); border: 2px solid var(--color-success-text); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgb(var(--color-navy-deeper-rgb) / 0.18); transition: background 0.15s, color 0.15s; }
        @media (hover: hover) { .scroll-arrow-btn:hover { background: var(--color-white); color: var(--color-success-text); } }
        .price-search-wrap { position: relative; }
        .price-search-dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: var(--color-white); border: 1px solid var(--color-border); border-radius: 8px; max-height: 220px; overflow-y: auto; z-index: 100; box-shadow: 0 4px 16px rgb(var(--color-black-rgb) / 0.1); }
        .price-search-item { padding: 9px 12px; cursor: pointer; font-size: 13px; border-bottom: 1px solid var(--color-badge-neutral-bg); }
        .price-search-item:last-child { border-bottom: none; }
        @media (hover: hover) { .price-search-item:hover { background: var(--color-success-light); } }
        .price-search-item.selected { background: var(--color-success-light); }
        .vet-row-inner { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
        .vet-row-buttons { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
        .symptom-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .symptom-stat-label { font-size: 13px; }
        .pv-card-inner { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
        .pv-buttons { display: flex; gap: 6px; flex-shrink: 0; }
        @media (max-width: 700px) {
          .stat-grid { grid-template-columns: repeat(3, 1fr); }
          .form-grid-2, .form-grid-3, .form-grid-4 { grid-template-columns: 1fr; }
          .section-header { flex-direction: column; align-items: flex-start !important; gap: 10px; }
          .vet-row-inner { flex-direction: column; gap: 12px; }
          .vet-row-buttons { width: 100%; padding-top: 10px; border-top: 1px solid var(--color-badge-neutral-bg); gap: 8px; }
          .vet-row-buttons .badge { flex: 1; justify-content: center; }
          .vet-row-buttons .adm-btn { flex: 1; text-align: center; }
          .symptom-stats { grid-template-columns: repeat(2, 1fr); }
          .pv-card-inner { flex-direction: column; }
          .pv-buttons { width: 100%; padding-top: 10px; border-top: 1px solid var(--color-badge-neutral-bg); }
          .pv-buttons .adm-btn { flex: 1; }
          .filter-bar .adm-btn { padding: 5px 10px; font-size: 12px; }
        }
        @media (max-width: 600px) {
          .users-table-header { display: none; }
          .users-table-row { grid-template-columns: 1fr; gap: 4px; padding: 12px 16px; border-bottom: 1px solid var(--color-badge-neutral-bg); }
          .users-label { display: block; }
          .users-col-name { margin-bottom: 4px; }
          .users-col { display: none; }
          .users-meta-mobile { display: block !important; }
        }
        @media (min-width: 601px) { .users-meta-mobile { display: none !important; } }
        @media (max-width: 480px) {
          .stat-grid { grid-template-columns: repeat(2, 1fr); }
          .symptom-stats { grid-template-columns: repeat(2, 1fr); }
        }

        /* ═══════════ REDESIGN (Track 6) — real brand tokens ═══════════ */
        .adm-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; gap: 12px; }
        .adm-page-root { padding: 20px 16px; }
        @media (min-width: 961px) { .adm-page-root { padding: 32px 16px 20px; } }
        @media (max-width: 768px) { .adm-page-root { padding: 16px; } }
        .adm-shell { display: flex; gap: 20px; align-items: flex-start; }
        /* The nav is ~715px of content against a viewport-height cap, so on
           anything shorter than about 755px — a laptop with devtools docked, a
           short window — it was taller than its own box. Without overflow-y it
           had no scroll container: the white card stopped at max-height and
           the remaining buttons painted outside it with no way to reach them.
           The mobile drawer below 960px always had this; the sticky desktop
           one didn't.
           overscroll-behavior stops a flick at the end of the nav from
           carrying on into the page scroll behind it.
           dvh first, vh after as the fallback — a later declaration wins where
           it's understood, and dvh tracks the actually-visible viewport. */
        .adm-sidebar {
          width: 214px; flex-shrink: 0; background: var(--color-white);
          border: 1px solid var(--color-border); border-radius: 16px;
          padding: 14px 0; position: sticky; top: 20px;
          display: flex; flex-direction: column;
          max-height: calc(100vh - 40px);
          max-height: calc(100dvh - 40px);
          overflow-y: auto;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: var(--color-border-strong) transparent;
        }
        /* WebKit equivalent of scrollbar-width/color — a default 15px bar in a
           214px card eats the labels. */
        .adm-sidebar::-webkit-scrollbar { width: 8px; }
        .adm-sidebar::-webkit-scrollbar-track { background: transparent; }
        .adm-sidebar::-webkit-scrollbar-thumb { background: var(--color-border-strong); border-radius: 9999px; }
        @media (hover: hover) { .adm-sidebar::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--color-border-strong) 75%, var(--color-muted)); } }
        .adm-nav-group-label {
          padding: 10px 20px 4px; font-size: 11px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.09em; color: var(--color-muted);
        }
        .adm-nav-group.divided { border-top: 1px solid var(--color-border); margin-top: 8px; padding-top: 4px; }
        .adm-nav-btn {
          width: 100%; text-align: left; border: none; background: none;
          padding: 11px 20px; font-size: 15px; font-weight: 600; cursor: pointer;
          color: var(--color-slate); display: flex; align-items: center; gap: 11px;
          border-left: 3px solid transparent; transition: background 0.15s ease, color 0.15s ease;
          font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        @media (hover: hover) { .adm-nav-btn:hover { background: var(--color-cream); color: var(--color-navy-dark); } }
        .adm-nav-btn.active { background: var(--color-warning-light); color: var(--color-terracotta-700); border-left-color: var(--color-terracotta); font-weight: 700; }
        .adm-nav-btn svg { width: 18px; height: 18px; flex-shrink: 0; }
        .adm-nav-count { margin-left: auto; background: var(--color-terracotta-600); color: var(--color-white); border-radius: 9999px; padding: 2px 8px; font-size: 11px; font-weight: 800; flex-shrink: 0; }
        .adm-nav-label { white-space: nowrap; }
        .adm-main { flex: 1; min-width: 0; background: var(--color-white); border: 1px solid var(--color-border); border-radius: 16px; padding: 20px; }
        .adm-hamburger { display: none; width: 44px; height: 44px; border-radius: 8px; border: 1px solid var(--color-border-strong); background: var(--color-white); cursor: pointer; align-items: center; justify-content: center; color: var(--color-navy-dark); flex-shrink: 0; position: relative; z-index: 58; }
        .adm-scrim { display: none; position: fixed; inset: 0; background: rgb(var(--color-navy-dark-rgb) / 0.45); z-index: 40; }

        .adm-view-title { font-size: 24px; font-weight: 800; color: var(--color-navy-dark); margin: 0 0 3px; }
        .adm-view-sub { font-size: 16px; font-weight: 500; color: var(--color-slate); margin: 0 0 15px; }

        /* Dashboard */
        .adm-action-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
        .adm-action-card { background: var(--color-white); border: 1px solid var(--color-terracotta); border-radius: 12px; padding: 22px 20px; cursor: pointer; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 7px; font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; transition: box-shadow 0.15s ease; }
        @media (hover: hover) { .adm-action-card:hover { box-shadow: 0 4px 16px rgb(var(--color-navy-dark-rgb) / 0.1); } }
        .adm-action-card.neutral { border-color: var(--color-border); }
        .adm-ac-value { font-size: 32px; font-weight: 800; color: var(--color-navy-dark); line-height: 1; }
        .adm-ac-label { font-size: 16px; color: var(--color-slate); font-weight: 700; white-space: nowrap; }
        .adm-ac-hint { font-size: 14px; color: var(--color-terracotta-700); font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 3px; white-space: nowrap; }
        .adm-ac-hint.q { color: var(--color-muted); }
        .adm-statline { display: grid; grid-template-columns: repeat(4, 1fr); background: var(--color-white); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; }
        .adm-stat-item { display: flex; flex-direction: column; align-items: center; gap: 2px; position: relative; }
        @media (min-width: 961px) {
          .adm-stat-item:not(:last-child)::after { content: ""; position: absolute; right: 0; top: 12%; height: 76%; width: 1px; background: var(--color-border); }
        }
        .adm-stat-num { font-size: 24px; font-weight: 800; color: var(--color-navy-dark); }
        .adm-stat-lbl { font-size: 15px; color: var(--color-slate); font-weight: 600; white-space: nowrap; }
        .adm-attention { background: var(--color-white); border: 1px solid var(--color-border); border-radius: 12px; padding: 20px; }
        .adm-attention-title { font-size: 20px; font-weight: 800; color: var(--color-navy-dark); }
        .adm-att-row { display: flex; align-items: flex-start; gap: 12px; padding: 20px 0; border: none; border-bottom: 1px solid var(--color-border); cursor: pointer; width: 100%; text-align: left; background: none; font-family: 'Urbanist', sans-serif; }
        .adm-att-row:last-child { border-bottom: none; }
        /* Tinted tile, matching the spot tiles on Home, How It Works and the
           dashboard quick actions. The box was already here at 34px, but only
           .info carried a background — .warn set a colour and nothing else, so
           warning rows showed a bare icon beside tiled ones in the same list.
           Each variant's outline comes from its own colour, the same rule the
           pills follow. */
        .adm-att-ico { width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-sizing: border-box; border: var(--pill-border-w, 2px) solid transparent; }
        .adm-att-ico.warn { background: rgb(var(--color-terracotta-rgb) / 0.14); color: var(--color-terracotta); border-color: rgb(var(--color-terracotta-rgb) / 0.3); }
        .adm-att-ico.info { background: var(--color-cream); color: var(--color-muted); border-color: rgb(var(--color-muted-rgb) / 0.26); }
        .adm-att-main { flex: 1; min-width: 0; }
        .adm-att-h { font-size: 18px; color: var(--color-navy-dark); font-weight: 600; }
        .adm-att-s { font-size: 15px; font-weight: 500; padding-top: 5px; color: var(--color-slate); }
        .adm-att-go { font-size: 14px; color: var(--color-terracotta-700); font-weight: 700; white-space: nowrap; display: flex; align-items: center; gap: 3px; flex-shrink: 0; }

        /* Submissions */
        .adm-searchbar { position: relative; margin-bottom: 16px; }
        /* Clear button, matching Find a Vet and Saved Vets. Clearing a search
           that returned nothing otherwise means backspacing the whole term. */
        .adm-searchbar { position: relative; }
        .adm-search-clear {
          position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
          width: 32px; height: 32px; display: inline-flex; align-items: center;
          justify-content: center; border: none; background: transparent;
          border-radius: 8px; cursor: pointer; color: var(--color-muted);
          transition: background 0.15s, color 0.15s;
        }
        @media (hover: hover) { .adm-search-clear:hover { background: var(--color-cream); color: var(--color-navy-dark); } }
        .adm-searchbar input { width: 100%; height: 44px; padding: 0 40px 0 14px; border: 1px solid var(--color-border-field); border-radius: 12px; font-size: 15px; font-weight: 500; outline: none; font-family: 'Urbanist', sans-serif; box-sizing: border-box; }
        .adm-searchbar input:focus { border-color: var(--color-terracotta); }
        .adm-signed-in { margin: 0; font-size: 13px; font-weight: 500; color: var(--color-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        /* Drawer footer (signed-in + back-to-site) — hidden on desktop, shown in mobile drawer */
        .adm-drawer-footer { display: block; margin-top: auto; padding: 16px 20px 6px; border-top: 1px solid var(--color-border); }
        .adm-drawer-signed { margin: 0 0 10px; font-size: 13px; font-weight: 500; color: var(--color-muted); word-break: break-word; }
        .adm-view-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .adm-refresh { display: inline-flex; align-items: center; gap: 7px; height: 34px; padding: 0 16px; border: 2px solid var(--color-border-strong); background: var(--color-white); border-radius: 12px; font-size: 15px; font-weight: 700; color: var(--color-navy-dark); cursor: pointer; font-family: 'Urbanist', sans-serif; transition: background 0.15s, border-color 0.15s; flex-shrink: 0; }
        .adm-addbtn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 40px; padding: 0 20px; border: 2px solid var(--color-navy-dark); background: var(--color-navy-dark); border-radius: 12px; font-size: 15px; font-weight: 700; color: var(--color-white); cursor: pointer; font-family: 'Urbanist', sans-serif; transition: background 0.15s, color 0.15s; flex-shrink: 0; }
        @media (hover: hover) { .adm-addbtn:hover { background: var(--color-white); color: var(--color-navy-dark); } }
        @media (hover: hover) { .adm-refresh:hover:not(:disabled) { background: var(--color-cream); border-color: var(--color-terracotta); color: var(--color-terracotta-700); } }
        .adm-refresh:disabled { opacity: 0.6; cursor: default; }
        .adm-drawer-back { font-size: 13px; color: var(--color-terracotta-700); text-decoration: none; font-weight: 700; transition: color 0.15s; }
        @media (hover: hover) { .adm-drawer-back:hover { color: var(--color-navy-dark); } }
        /* Pending Vets */
        .adm-pv-source { display: inline-block; align-self: flex-start; font-size: 12px; font-weight: 700; color: var(--color-muted); background: var(--color-cream); padding: 3px 10px; border-radius: 9999px; border: var(--pill-border-w, 2px) solid rgb(var(--color-muted-rgb) / 0.26); margin-bottom: 6px; }
        .adm-pv-details { padding: 14px 0; border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); display: flex; flex-direction: column; gap: 2px; font-size: 16px; }
        .adm-pv-details p { margin: 0; font-size: 15px; color: var(--color-slate); font-weight: 500; }
        .adm-pv-details .adm-pv-web { color: var(--color-success-text); }
        .adm-pv-details .adm-pv-found { font-size: 14px; font-weight: 500; color: var(--color-muted); margin-top: 4px; }
        .adm-pv-editform { margin-top: 4px; background: var(--color-white); border: 1px solid var(--color-border); border-radius: 12px; padding: 18px; }
        .adm-pv-fieldgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
        .adm-field-select { appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='${svgHex("muted")}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 38px; cursor: pointer; }
        .adm-field-textarea { height: auto; padding: 10px 14px; resize: vertical; line-height: 1.5; }
        .adm-pricing-note::placeholder { color: var(--color-muted); }
        /* Rich text editor */
        .adm-rte { border: 1px solid var(--color-border-strong); border-radius: 10px; overflow: hidden; background: var(--color-white); }
        .adm-rte-toolbar { display: flex; gap: 0; padding: 6px 8px; border-bottom: 1px solid var(--color-border); background: var(--color-white); }
        .adm-rte-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; height: 32px; padding: 0 8px; border: none; border-radius: 6px; background: none; color: var(--color-navy-dark); font-size: 15px; cursor: pointer; font-family: 'Urbanist', sans-serif; transition: background 0.15s; }
        @media (hover: hover) { .adm-rte-btn:hover { background: var(--color-border); } }
        .adm-rte-btn + .adm-rte-btn { margin-left: 8px; position: relative; }
        .adm-rte-btn + .adm-rte-btn::before { content: ""; position: absolute; left: -4px; top: 50%; transform: translateY(-50%); width: 1px; height: 18px; background: var(--color-border-strong); }
        .adm-rte-editor-wrap { position: relative; }
        .adm-rte-placeholder { position: absolute; top: 12px; left: 14px; color: var(--color-muted); font-size: 15px; pointer-events: none; }
        .adm-rte-editor { min-height: 72px; padding: 12px 14px; font-size: 15px; font-weight: 500; line-height: 1.6; color: var(--color-navy-dark); font-family: 'Urbanist', sans-serif; outline: none; }
        .adm-rte-editor:focus { outline: none; }
        .adm-rte-editor p { margin: 0 0 8px; }
        .adm-rte-editor p:last-child { margin-bottom: 0; }
        .adm-rte-editor ul { margin: 0 0 8px; padding-left: 22px; }
        .adm-rte-editor strong { font-weight: 800; }
        .adm-rte-editor em { font-style: italic; }
        .adm-rte-editor a { color: var(--color-terracotta-700); text-decoration: underline; }
        /* Verification checklist */
        .adm-vet-checklist { margin: 4px 0 4px; padding: 16px; background: var(--color-caution-light); border: 1px solid var(--color-gold); border-radius: 10px; }
        .adm-vet-checklist-title { margin: 0 0 12px; font-size: 13px; font-weight: 800; color: var(--color-warning-text); text-transform: uppercase; letter-spacing: 0.05em; }
        .adm-vet-check-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 5px 0; }
        .adm-vet-check { display: inline-flex; align-items: center; gap: 10px; border: none; background: none; font-size: 14px; font-weight: 600; color: var(--color-navy-dark); cursor: pointer; font-family: 'Urbanist', sans-serif; text-align: left; flex: 1; padding: 0; }
        .adm-vet-check .adm-perm-box { width: 20px; height: 20px; flex-shrink: 0; }
        .adm-vet-check.on .adm-perm-box { background: var(--color-success-text); border-color: var(--color-success-text); }
        .adm-vet-check.on { color: var(--color-success-text); }
        .adm-vet-check-link { font-size: 13px; font-weight: 700; color: var(--color-terracotta-700); text-decoration: none; white-space: nowrap; flex-shrink: 0; }
        @media (hover: hover) { .adm-vet-check-link:hover { text-decoration: underline; } }
        /* Hours picker */
        .adm-hours { display: flex; flex-direction: column; gap: 8px; border: 1px solid var(--color-border-strong); border-radius: 10px; padding: 20px; background: var(--color-white); }
        .adm-hours-row { display: flex; align-items: flex-start; gap: 12px; }
        .adm-hours-day { display: inline-flex; align-items: center; gap: 8px; width: 128px; flex-shrink: 0; padding: 9px 12px; border: 1px solid var(--color-border-strong); border-radius: 8px; background: var(--color-white); font-size: 14px; font-weight: 700; color: var(--color-navy-dark); cursor: pointer; font-family: 'Urbanist', sans-serif; }
        .adm-hours-day.open { border-color: var(--color-navy-dark); }
        .adm-hours-day .adm-perm-box { width: 18px; height: 18px; }
        .adm-hours-day.open .adm-perm-box { background: var(--color-navy-dark); border-color: var(--color-navy-dark); }
        .adm-hours-ranges { display: flex; flex-direction: column; gap: 8px; flex: 1; padding: 0; }
        .adm-hours-range { display: flex; align-items: center; gap: 8px; }
        .adm-hours-time { width: auto; min-width: 118px; height: 44px; }
        .adm-hours-dash { color: var(--color-muted); font-weight: 600; }
        .adm-hours-x { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: none; background: none; color: var(--color-error); cursor: pointer; border-radius: 8px; flex-shrink: 0; }
        @media (hover: hover) { .adm-hours-x:hover { background: var(--color-error-light); } }
        .adm-hours-add { align-self: flex-start; border: none; background: none; color: var(--color-terracotta-700); font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Urbanist', sans-serif; padding: 2px 0; text-decoration: underline; text-underline-offset: 2px; transition: color 0.15s; }
        @media (hover: hover) { .adm-hours-add:hover { color: var(--color-terracotta-700); } }
        .adm-hours-actions { display: flex; align-items: center; gap: 14px; padding: 5px 0; }
        .adm-hours-actions .adm-hours-add + .adm-hours-add { position: relative; padding-left: 14px; }
        .adm-hours-actions .adm-hours-add + .adm-hours-add::before { content: ""; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 1px; height: 14px; background: var(--color-border-strong); }
        .adm-hours-actions { display: flex; gap: 16px; }
        .adm-hours-24 { display: flex; align-items: center; gap: 16px; padding-top: 9px; }
        .adm-hours-24-label { font-size: 14px; font-weight: 600; color: var(--color-navy-dark); }
        /* Google Places lookup */
        .adm-vet-lookup { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--color-border); }
        .adm-vet-lookup-hint { margin: 4px 0 10px; font-size: 14px; font-weight: 500; color: var(--color-muted); }
        .adm-vet-lookup-row .adm-field-input { flex: 1; width: 100%; }
        .adm-vet-lookup-btn { height: 40px; white-space: nowrap; }
        .adm-vet-lookup-row { display: flex; gap: 10px; align-items: stretch; position: relative; }
        .adm-vet-lookup-spinner { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); display: flex; align-items: center; font-size: 13px; font-weight: 600; color: var(--color-muted); white-space: nowrap; pointer-events: none; background: var(--color-white); padding-left: 8px; }
        .adm-vet-lookup-results { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
        .adm-vet-lookup-result { display: flex; flex-direction: column; gap: 2px; align-items: flex-start; text-align: left; padding: 10px 14px; border: 1px solid var(--color-border-strong); border-radius: 10px; background: var(--color-white); cursor: pointer; font-family: 'Urbanist', sans-serif; transition: border-color 0.15s, background 0.15s; }
        @media (hover: hover) { .adm-vet-lookup-result:hover { border-color: var(--color-navy-dark); background: var(--color-white); } }
        .adm-vet-lookup-name { font-size: 15px; font-weight: 700; color: var(--color-navy-dark); }
        .adm-vet-lookup-addr { font-size: 13px; font-weight: 500; color: var(--color-muted); }
        .adm-vet-lookup-filled { margin: 10px 0 0; font-size: 13px; font-weight: 700; color: var(--color-success-text); }
        .adm-hours-closed { color: var(--color-muted); font-size: 15px; font-weight: 500; padding-top: 11px; }
        /* Page URL row */
        .adm-vet-pageurl { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 4px; padding: 12px 0; border-top: 1px solid var(--color-border); }
        .adm-vet-pageurl-path { font-size: 14px; color: var(--color-slate); font-weight: 600; font-family: monospace; }
        .adm-vet-pageurl-edit { border: none; background: none; color: var(--color-terracotta-700); font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Urbanist', sans-serif; }
        .adm-vet-pageurl-input { width: auto; flex: 1; min-width: 200px; max-width: 340px; height: 44px; }
        .adm-vet-declined { font-size: 13px; font-weight: 700; padding: 3px 11px; border-radius: 9999px; background: var(--color-error-light); color: var(--color-error-text);  border: var(--pill-border-w, 2px) solid transparent; border-color: color-mix(in srgb, currentColor 30%, transparent);}
        .adm-vet-unverified { display: inline-flex; align-items: center; font-size: 13px; font-weight: 700; padding: 3px 11px; border-radius: 9999px; background: var(--color-caution-light); color: var(--color-warning); font-family: 'Urbanist', sans-serif;  border: var(--pill-border-w, 2px) solid transparent; border-color: color-mix(in srgb, currentColor 30%, transparent);}
        /* Prices tab */
        .adm-price-vetsearch { margin-bottom: 24px; }
        .adm-price-vetsearch .adm-field-label { margin-bottom: 6px; display: block; }
        .adm-price-search-wrap { position: relative; }
        .adm-price-search-wrap input { padding-right: 38px; }
        .adm-price-search-clear { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 15px; color: var(--color-muted); padding: 0; z-index: 2; }
        @media (hover: hover) { .adm-price-search-clear:hover { color: var(--color-navy-dark); } }
        .adm-price-dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: var(--color-white); border: 1px solid var(--color-border-strong); border-radius: 12px; box-shadow: 0 6px 20px rgb(var(--color-navy-dark-rgb) / 0.1); max-height: 300px; overflow-y: auto; z-index: 100; }
        .adm-price-dropdown-empty { padding: 12px 14px; font-size: 14px; color: var(--color-muted); }
        .adm-price-dropdown-item { padding: 11px 14px; font-size: 15px; font-weight: 600; color: var(--color-navy-dark); cursor: pointer; border-bottom: 1px solid var(--color-cream); }
        .adm-price-dropdown-item:last-child { border-bottom: none; }
        .adm-price-dropdown-item.selected { background: var(--color-warning-light); color: var(--color-terracotta-700); }
        @media (hover: hover) { .adm-price-dropdown-item:hover { background: var(--color-warning-light); color: var(--color-terracotta-700); } }
        .adm-price-dropdown-city { color: var(--color-muted); font-size: 14px; font-weight: 500; }
        .adm-price-showing { margin: 8px 0 0; font-size: 14px; font-weight: 600; color: var(--color-success-text); }
        .adm-price-count { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-slate); }
        .adm-price-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 4px 0 18px; }
        .adm-price-addform { margin-bottom: 20px; }
        .adm-price-value { font-size: 16px; font-weight: 800; color: var(--color-success-text); }
        .adm-price-type { font-size: 14px; font-weight: 500; color: var(--color-muted); }
        .adm-price-species { font-size: 13px; font-weight: 700; padding: 3px 11px; border-radius: 9999px; background: var(--color-badge-navy-bg); color: var(--color-navy-mid); text-transform: capitalize;  border: var(--pill-border-w, 2px) solid transparent; border-color: color-mix(in srgb, currentColor 30%, transparent);}
        /* Top border only. The line under it is the actions row's own top
           border, which is always there — so an empty row shows one divider
           and a row with a note or tags shows two. */
        .adm-price-details { padding: 14px 0; border-top: 1px solid var(--color-border); display: flex; flex-direction: column; gap: 8px; }
        .adm-price-actions { border-top: 1px solid var(--color-border); padding-top: 14px; margin-top: 14px; }
        .adm-price-details + .adm-price-actions { margin-top: 0; }
        .adm-price-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .adm-price-tag { font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 9999px; background: var(--color-success-light); color: var(--color-success-text);  border: var(--pill-border-w, 2px) solid transparent; border-color: color-mix(in srgb, currentColor 30%, transparent);}
        .adm-price-note { font-size: 15px; font-weight: 500; color: var(--color-slate); line-height: 1.6; }
        .adm-price-note p { margin: 0 0 6px; }
        .adm-price-note p:last-child { margin-bottom: 0; }
        .adm-price-note ul { margin: 0 0 6px; padding-left: 20px; }
        .adm-price-note strong { font-weight: 800; }
        .adm-price-note em { font-style: italic; }
        .adm-price-note a { color: var(--color-terracotta-700); text-decoration: underline; }
        .adm-field-error { border-color: var(--color-error) !important; }
        /* Call queue navigation */
        .adm-cq-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 18px; flex-wrap: wrap; }
        .adm-cq-titlewrap { display: flex; flex-direction: column; gap: 10px; }
        .adm-cq-count { margin: 0; font-size: 16px; font-weight: 700; color: var(--color-slate); }
        /* Sliding toggle (Unpriced / All vets) */
        .adm-toggle { position: relative; display: inline-grid; grid-template-columns: 1fr 1fr; align-items: stretch; width: 260px; height: 44px; padding: 4px; background: var(--color-border); border: var(--pill-border-w, 2px) solid var(--control-border); border-radius: 9999px; }
        .adm-toggle-slider { position: absolute; top: 0px; left: 0px; width: calc(50% - 0px); height: calc(100% - 0px); background: var(--color-white); border-radius: 9999px; box-shadow: 0 1px 3px rgb(var(--color-navy-dark-rgb) / 0.12); transition: transform 0.25s ease-in-out; }
        .adm-toggle.right .adm-toggle-slider { transform: translateX(100%); }
        .adm-toggle-opt { position: relative; z-index: 1; border: none; background: none; cursor: pointer; font-size: 15px; font-weight: 700; color: var(--color-muted); font-family: 'Urbanist', sans-serif; transition: color 0.25s ease-in-out; }
        .adm-toggle-opt.active { color: var(--color-navy-dark); }
        
        .adm-cq-nav { display: flex; gap: 8px; flex-shrink: 0; }
        .adm-calllog { background: var(--color-success-light); border: 1px solid rgb(var(--color-success-text-rgb) / 0.22); border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; }
        .adm-calllog-head { margin: 0 0 6px; font-size: 13px; font-weight: 700; color: var(--color-success-text); }
        .adm-calllog-item { margin: 2px 0; font-size: 14px; color: var(--color-slate); }
        /* Call panel — callback notes */
        .adm-callnotes { margin-top: 14px; background: var(--color-white); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px; }
        .adm-callnotes-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
        .adm-callnotes-title { margin: 0; font-size: 15px; font-weight: 800; color: var(--color-navy-dark); }
        .adm-callnotes-close { background: none; border: none; border-radius: 8px; cursor: pointer; color: var(--color-muted); padding: 5px; display: flex; flex-shrink: 0; transition: background 0.15s, color 0.15s; }
        @media (hover: hover) { .adm-callnotes-close:hover { color: var(--color-navy-dark); background: var(--color-cream); } }
        .adm-callnotes-textarea { width: 100%; height: auto; min-height: 80px; padding: 9px 12px !important; resize: vertical; line-height: 1.5; }
        .adm-callnotes-empty { font-size: 14px; color: var(--color-muted); font-style: italic; margin: 0; }
        .adm-callnote-date { margin: 0 0 6px; font-size: 13px; color: var(--color-muted); }
        .adm-callnote-text { margin: 0 0 10px; font-size: 14px; color: var(--color-slate); line-height: 1.5; }
        .adm-callprice-empty { color: var(--color-muted); font-size: 15px; font-weight: 500; font-style: italic; margin: 0 0 12px; }
        .adm-callprice-save { font-size: 15px; padding: 0 28px; }
        .adm-note-vetlink { display: inline; text-align: left; background: none; border: none; padding: 0; font-family: 'Urbanist', sans-serif; font-size: 18px; font-weight: 800; color: var(--color-success-text); cursor: pointer; transition: color 0.15s; line-height: 1.35; }
        .adm-note-vetlink svg { display: inline; vertical-align: baseline; margin-left: 4px; }
        .adm-note-vetlink-wrap { margin: 0 0 4px; }
        /* slate = #4B5563 (secondary text), muted = #717A86 (captions) per design system */
        .adm-review-title { margin: 0; font-size: 20px; font-weight: 800; color: var(--color-success-text); font-family: 'Urbanist', sans-serif; }
        .adm-review-caption { margin: 0; font-size: 15px; font-weight: 500; color: var(--color-slate); font-family: 'Urbanist', sans-serif; }
        .adm-review-service { margin: 0 0 6px; font-size: 18px; font-weight: 700; color: var(--color-navy-dark); font-family: 'Urbanist', sans-serif; }
        .adm-review-price { margin: 0 0 8px; font-size: 16px; font-weight: 700; color: var(--color-success-text); font-family: 'Urbanist', sans-serif; }
        .adm-review-range { font-size: 14px; font-weight: 500; color: var(--color-muted); margin-left: 6px; }
        .adm-review-note { margin: 0 0 8px; font-size: 15px; font-weight: 500; color: var(--color-slate); font-family: 'Urbanist', sans-serif; line-height: 1.5; }
        .adm-review-hint { font-size: 13px; font-weight: 500; color: var(--color-muted); font-family: 'Urbanist', sans-serif; }
        /* Status badges take a border derived from their own text colour via
           color-mix, rather than a hardcoded value per variant. Several of
           these get their colours inline from a config object — the activity
           log badge among them — so listing variants here would have missed
           them. The transparent border is declared first, so a browser without
           color-mix support keeps the box size and simply shows no outline.
           Thickness follows --pill-border-w with the rest of the site. */
        .adm-badge { display: inline-flex; align-items: center; font-size: 14px; font-weight: 600; padding: 3px 10px; border-radius: 9999px; font-family: 'Urbanist', sans-serif; text-transform: capitalize;  border: var(--pill-border-w, 2px) solid transparent; border-color: color-mix(in srgb, currentColor 30%, transparent);}
        .adm-badge-species { background: var(--color-cream); color: var(--color-slate); }
        .adm-badge-incl { background: var(--color-success-light); color: var(--color-success-text); }
        .adm-priced-badge { display: inline-flex; align-items: center; font-size: 13px; font-weight: 700; padding: 3px 11px; border-radius: 9999px; background: var(--color-success-light); color: var(--color-success-text); font-family: 'Urbanist', sans-serif;  border: var(--pill-border-w, 2px) solid transparent; border-color: color-mix(in srgb, currentColor 30%, transparent);}
        .adm-nextvet-wrap { display: flex; justify-content: flex-end; }
        .adm-nextvet-btn { font-size: 15px; }
        @media (max-width: 600px) {
          .adm-nextvet-btn { width: 100%; }
        }
        .adm-review-actions { display: flex; gap: 8px; padding-top: 16px; }
        @media (max-width: 600px) {
          .adm-review-actions { flex-direction: column; }
          .adm-review-actions .adm-b { width: 100%; flex: none; }
        }
        .adm-note-vettitle { margin: 0 0 4px; font-size: 18px; font-weight: 800; color: var(--color-navy-dark); font-family: 'Urbanist', sans-serif; }
        .adm-note-delq { margin: 0 0 12px; font-size: 14px; font-weight: 600; color: var(--color-error-text); font-family: 'Urbanist', sans-serif; }
        .adm-note-confirm-btns { display: flex; justify-content: center; gap: 10px; }
        .adm-note-confirm-btns .adm-b { flex: 1; }
        .adm-note-actions { display: flex; justify-content: center; gap: 10px; }
        .adm-note-actions .adm-b { flex: 1; }
        @media (max-width: 600px) {
          .adm-note-confirm-btns { flex-direction: column; }
          .adm-note-confirm-btns .adm-b { flex: none; width: 100%; }
          .adm-note-actions { flex-direction: column; }
          .adm-note-actions .adm-b { flex: none; width: 100%; }
        }
        .adm-note-date { margin: 0 0 6px; font-size: 14px; font-weight: 500; color: var(--color-muted); font-family: 'Urbanist', sans-serif; }
        .adm-note-copy { margin: 0 0 10px; font-size: 16px; font-weight: 500; color: var(--color-slate); line-height: 1.5; font-family: 'Urbanist', sans-serif; }
        .adm-b-green { background: var(--color-success-text); color: var(--color-white); border-color: var(--color-success-text); }
        @media (hover: hover) { .adm-b-green:hover:not(:disabled) { background: var(--color-white); color: var(--color-success-text); border-color: var(--color-success-text); } }
        @media (hover: hover) { .adm-note-vetlink:hover { color: var(--color-success-text); text-decoration: underline; } }
        .adm-cq-hasnotes { display: inline-flex; align-items: center; gap: 6px; background: var(--color-success-light); border: var(--pill-border-w, 2px) solid rgb(var(--color-success-text-rgb) / 0.22); border-radius: 9999px; padding: 4px 12px; margin: 0 0 8px; font-family: 'Urbanist', sans-serif; font-size: 13px; font-weight: 700; color: var(--color-success-text); cursor: pointer; transition: background 0.15s; }
        @media (hover: hover) { .adm-cq-hasnotes:hover { background: rgb(var(--color-success-rgb) / 0.12); } }
        .adm-savenote-btn { flex: none; }
        .adm-addprice-btn { flex: none; }
        .adm-pill { padding: 0 14px; height: 34px; border-radius: 9999px; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; font-family: 'Urbanist', sans-serif; border: var(--pill-border-w, 2px) solid var(--control-border); background: var(--color-white); color: var(--color-slate); transition: all 0.15s; }
        @media (hover: hover) { .adm-pill:hover { border-color: var(--color-navy-dark); } }
        .adm-pill.active { background: var(--color-success-text); border-color: var(--color-success-text); color: var(--color-white); }
        @media (hover: hover) { .adm-pill.active:hover { background: var(--color-success-text); } }
        /* Call panel — vet header */
        .adm-cq-vettitle { margin: 0 0 6px; font-size: 18px; font-weight: 800; color: var(--color-navy-dark); }
        .adm-cq-vetaddress { margin: 0 0 4px; font-size: 15px; font-weight: 500; color: var(--color-slate); }
        .adm-cq-veturl { display: flex; width: fit-content; align-items: center; gap: 5px; font-size: 15px; font-weight: 500; color: var(--color-terracotta-700); text-decoration: none; margin: 0 0 8px; }
        @media (hover: hover) { .adm-cq-veturl:hover { color: var(--color-terracotta-700); text-decoration: underline; } }
        .adm-cq-phone { display: inline-flex; align-items: center; height: 35px; padding: 0 18px; border-radius: 10px; font-size: 14px; font-weight: 700; color: var(--color-white); text-decoration: none; border: 2px solid transparent; background: var(--color-success-text); margin-bottom: 12px; transition: background 0.2s, color 0.2s, border-color 0.2s; }
        @media (hover: hover) { .adm-cq-phone:hover { background: var(--color-white); color: var(--color-success-text); border-color: var(--color-success-text); } }
        @media (max-width: 768px) {
          .adm-cq-header { flex-direction: column; align-items: stretch; }
          .adm-toggle { width: 100%; }
          .adm-cq-nav { width: 100%; flex-wrap: wrap; }
          .adm-cq-nav .adm-b:first-child { flex-basis: 100%; }
          .adm-cq-nav .adm-b:not(:first-child) { flex: 1; padding: 0 12px; }
        }
        @media (max-width: 600px) {
          .adm-unsaved-actions { flex-direction: column; }
          .adm-unsaved-actions button { flex: none !important; width: 100%; }
          .adm-callprice-save { width: 100%; }
          .adm-savenote-btn { width: 100%; }
          .adm-priceentry-head { flex-direction: column; align-items: stretch !important; gap: 10px; }
          .adm-addprice-btn { width: 100%; }
        }
        .adm-sync { border: 1px solid var(--color-border); border-radius: 14px; background: var(--color-white); padding: 18px 20px; margin-bottom: 16px; }
        .adm-sync-top { display: flex; flex-direction: column; align-items: stretch; gap: 16px; }
        .adm-sync-title { margin: 0 0 3px; font-size: 18px; font-weight: 800; color: var(--color-navy-dark); }
        .adm-sync-desc { margin: 0; font-size: 15px; font-weight: 500; color: var(--color-slate); line-height: 1.5; }
        .adm-sync-desc strong { font-weight: 800; color: var(--color-navy-dark); }
        .adm-sync-actions { display: flex; gap: 8px; flex-shrink: 0; }
        .adm-sync-paused { margin: 16px 0 0; font-size: 15px; font-weight: 600; color: var(--color-warning-text); display: flex; flex-direction: column; gap: 4px; }
        /* Price conflicts review */
        /* Price reports reuse the conflict card, head, option and price
           classes. These are the only additions. */
        .adm-reports-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
        .adm-reports-filters { display: flex; gap: 8px; flex-wrap: wrap; }
        .adm-reports-filter { height: 34px; padding: 0 14px; border-radius: 999px; border: var(--pill-border-w, 2px) solid var(--color-border); background: var(--color-white); color: var(--color-muted); font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
        .adm-reports-filter.active { border-color: var(--color-navy-dark); color: var(--color-navy-dark); }
        /* The problem in words, under the service. Amber where the claim is
           that the row shouldn't exist rather than that the number is wrong. */
        .adm-report-problem { margin: 6px 0 0; font-size: 16px; font-weight: 800; color: var(--color-error); }
        .adm-report-problem.is-warn { color: var(--color-warning-text); }
        .adm-report-new { color: var(--color-success-text); }
        /* Their own words, so it shouldn't look like another data box. White
           with a terracotta edge — a quotation rather than a panel. */
        .adm-report-reason { margin: 14px 0 0; padding: 12px 16px; background: var(--color-white); border-left: 3px solid var(--color-terracotta); border-radius: 0 10px 10px 0; font-size: 156x; font-weight: 500; line-height: 1.6; color: var(--color-navy-dark); font-style: italic; }
        /* Who and when on the left, the two links hard right on the same line. */
        .adm-report-foot { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-top: 14px; }
        .adm-report-meta { margin: 0; font-size: 15px; font-weight: 500; color: var(--color-muted); }
        .adm-report-meta-label { display: block; font-weight: 700; color: var(--color-slate); }
        .adm-report-who, .adm-report-date { display: block; }
        .adm-report-links { display: flex; gap: 16px; align-items: center; }
        /* Pill and price centred together. They're one unit — a left-aligned
           pill sitting over a centred number reads as a mistake. */
        .adm-opt-centred { align-items: center; text-align: center; }
        .adm-conflict-opt-main { align-items: center; text-align: center; }
        .adm-conflict-opt-meta { justify-content: center; }
        .adm-report-noprice { font-size: 16px; font-weight: 700; color: var(--color-muted); }
        /* Navigation stays a link — it leaves the page rather than deciding. */
        .adm-report-link { padding: 0; border: none; background: none; font-family: inherit; font-size: 15px; font-weight: 700; color: var(--color-terracotta-700); text-decoration: underline; cursor: pointer; white-space: nowrap; }
        @media (hover: hover) { .adm-report-link:hover { color: var(--color-navy-dark); } }
        /* The decisions, divided from everything above them. */
        .adm-report-actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; justify-content: flex-end; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--color-border); }
        .adm-report-sheetnote { margin: 12px 0 0; font-size: 14px; font-weight: 500; color: var(--color-muted); line-height: 1.55; }
        /* View page sits below "Both are valid", divided, hard right. */
        .adm-conflict-viewrow { display: flex; justify-content: flex-end; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--color-border); }
        @media (max-width: 720px) {
          .adm-report-foot { flex-direction: column; align-items: stretch; gap: 12px; }
          /* Links side by side and centred, so neither is the obvious one. */
          .adm-report-links { justify-content: center; gap: 24px; }
          .adm-report-actions { flex-direction: column; align-items: stretch; }
          .adm-report-actions .adm-b { width: 100%; }
          .adm-conflict-viewrow { justify-content: center; }
        }
        .adm-conflict-list { display: flex; flex-direction: column; gap: 14px; }
        .adm-conflict-card { border: 1px solid var(--color-border); border-radius: 14px; background: var(--color-white); padding: 18px 20px; }
        .adm-conflict-head { margin-bottom: 14px; }
        .adm-conflict-vet { margin: 0 0 2px; font-size: 18px; font-weight: 800; color: var(--color-navy-dark); }
        .adm-conflict-svc { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-muted); }
        .adm-conflict-options { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .adm-conflict-opt { display: flex; flex-direction: column; gap: 10px; padding: 14px; background: var(--color-white); border: 1px solid var(--color-border); border-radius: 12px; }
        .adm-conflict-opt-main { display: flex; flex-direction: column; gap: 6px; }
        .adm-conflict-price { font-size: 20px; font-weight: 800; color: var(--color-navy-dark); }
        .adm-conflict-src { display: inline-flex; align-items: center; align-self: center; padding: 4px 10px; border-radius: 9999px; font-size: 13px; font-weight: 700; text-transform: capitalize; background: var(--color-border); color: var(--color-slate);  border: var(--pill-border-w, 2px) solid transparent; border-color: color-mix(in srgb, currentColor 30%, transparent);}
        .adm-src-sheet { background: var(--color-success-light); color: var(--color-success-text); }
        .adm-src-manual { background: var(--color-warning-light); color: var(--color-warning-text); }
        .adm-src-scraper { background: var(--color-info-light); color: var(--color-info-text); }
        .adm-src-community { background: var(--color-badge-neutral-bg); color: var(--color-info-text); }
        .adm-conflict-opt-meta { display: flex; align-items: center; gap: 10px; }
        .adm-conflict-verified { font-size: 16px; font-weight: 700; color: var(--color-success-text); }
        .adm-conflict-date { font-size: 16px; color: var(--color-slate); font-weight: 500; }
        .adm-conflict-pick { width: 100%; }
        .adm-conflict-foot { margin-top: 14px; display: flex; justify-content: center; }
        .adm-conflict-keepboth { min-width: 260px; }
        .adm-sync-guide-toggle { margin-top: 14px; display: inline-flex; align-items: center; gap: 7px; border: none; background: none; padding: 0; font-size: 16px; font-weight: 700; color: var(--color-terracotta-700); cursor: pointer; font-family: 'Urbanist', sans-serif; }
        @media (hover: hover) { .adm-sync-guide-toggle:hover { color: var(--color-terracotta-700); } }
        .adm-sync-chev { transition: transform 0.25s ease-in-out; }
        .adm-sync-chev.open { transform: rotate(180deg); }
        .adm-sync-guide-wrap { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.28s ease-in-out; }
        .adm-sync-guide-wrap.open { grid-template-rows: 1fr; }
        .adm-sync-guide-wrap > .adm-sync-guide { overflow: hidden; min-height: 0; }
        .adm-sync-guide { margin-top: 0; padding: 0; background: transparent; border: none; }
        .adm-sync-guide-wrap.open > .adm-sync-guide { margin-top: 12px; }
        .adm-sync-guide-inner { padding: 16px; background: var(--color-white); border: 1px solid var(--color-border); border-radius: 10px; }
        .adm-sync-guide-lead { margin: 0 0 12px; font-size: 15px; font-weight: 500; color: var(--color-slate); line-height: 1.6; }
        .adm-sync-guide-lead code, .adm-sync-guide-list code, .adm-sync-guide-item code { background: var(--color-cream); border: 1px solid var(--color-border); border-radius: 5px; padding: 1px 6px; font-size: 14px; font-family: ui-monospace, monospace; color: var(--color-warning-text); white-space: nowrap; }
        .adm-sync-guide-list { margin: 0; display: flex; flex-direction: column; gap: 16px; }
        /* A line of explanation under a heading, before the bullets — for
           saying which columns a rule applies to without burying it in the
           list itself. */
        .adm-sync-guide-note { margin: 0 0 8px; font-size: 15px; font-weight: 500; color: var(--color-slate); line-height: 1.6; }
        .adm-sync-guide-item .adm-sync-guide-note:last-child { margin: 8px 0 0; }
        /* The column map. Reads by position, which is the whole reason it
           exists, so it's laid out as a reference table rather than prose.
           Wraps into however many columns fit — 27 rows in one stack is a
           wall nobody reads. */
        .adm-colmap { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 2px 18px; margin: 0; }
        .adm-colmap-row { display: flex; align-items: baseline; gap: 10px; padding: 3px 0; min-width: 0; }
        .adm-colmap-col { flex-shrink: 0; min-width: 34px; text-align: center; }
        .adm-colmap-what { font-size: 15px; font-weight: 500; color: var(--color-slate); line-height: 1.5; overflow-wrap: break-word; min-width: 0; }
        .adm-sync-guide-inner > .adm-sync-guide-item { margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid var(--color-border); }
        .adm-sync-guide-item .adm-sync-guide-h { margin: 0 0 6px; font-size: 14px; font-weight: 800; color: var(--color-navy-dark); text-transform: uppercase; letter-spacing: 0.04em; }
        .adm-sync-guide-item ul { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 4px; }
        .adm-sync-guide-item li { font-size: 15px; font-weight: 500; color: var(--color-slate); line-height: 1.6; }
        .adm-sync-guide-item li strong { font-weight: 800; color: var(--color-navy-dark); }
        .adm-sync-result { border: 1px solid var(--color-border); border-radius: 14px; background: var(--color-white); padding: 18px 20px; margin-bottom: 16px; }
        .adm-sync-result.error { background: var(--color-error-light); border-color: rgb(var(--color-error-rgb) / 0.24); }
        .adm-sync-result-title { margin: 0 0 14px; font-size: 15px; font-weight: 800; color: var(--color-success-text); }
        .adm-sync-result.error .adm-sync-result-title { color: var(--color-error); }
        .adm-sync-result-msg { margin: 0; font-size: 14px; color: var(--color-error-text); }
        .adm-sync-stats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
        .adm-sync-stat { display: flex; flex-direction: column; gap: 3px; align-items: center; text-align: center; padding: 16px 12px; background: var(--color-white); border: 1px solid var(--color-border); border-radius: 10px; }
        .adm-sync-stat-n { font-size: 22px; font-weight: 800; color: var(--color-navy-dark); }
        .adm-sync-stat-l { font-size: 14px; font-weight: 600; color: var(--color-slate); }
        /* Was a native <details>, which puts its triangle on the left and
           can't animate its height. Same button + grid-template-rows pattern
           as the sheet-format guide above, so every disclosure in this tab
           opens the same way. */
        .adm-sync-detail { margin-top: 12px; font-size: 14px; }
        /* No flex. The chevron is inline content after the label, so it lands
           where the sentence ends — the two previous attempts used a flex row
           and both put the arrow at the far edge of the panel, once from
           justify-content and once from the button being stretched. Inline
           flow can't be pulled apart by a width rule, which is the point.
           display:block + width:fit-content keeps the click target to the
           text plus the arrow rather than the full width of the card. */
        .adm-sync-detail-toggle {
          display: block; width: fit-content; max-width: 100%;
          padding: 6px 0; border: none; background: none; cursor: pointer;
          font-family: 'Urbanist', sans-serif; font-size: 14px; font-weight: 700;
          line-height: 1.5; color: var(--color-slate); text-align: left;
        }
        /* -3px rather than middle: at 14px text, baseline-middle sits the
           arrow slightly high against the cap height. */
        .adm-sync-detail-toggle .adm-sync-chev {
          display: inline-block; vertical-align: -3px; margin-left: 2px;
        }
        .adm-sync-detail.warn .adm-sync-detail-toggle { color: var(--color-warning-text); }
        .adm-sync-detail.error .adm-sync-detail-toggle { color: var(--color-error); }
        .adm-sync-detail-wrap { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.28s ease-in-out; }
        .adm-sync-detail-wrap.open { grid-template-rows: 1fr; }
        .adm-sync-detail-wrap > .adm-sync-detail-inner { overflow: hidden; min-height: 0; }
        .adm-sync-detail ul { margin: 6px 0 0; padding-left: 20px; }
        .adm-sync-detail li { font-size: 14px; font-weight: 500; color: var(--color-muted); margin-bottom: 2px; line-height: 1.5; }
        .adm-pf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px; }
        .adm-pf-full { grid-column: 1 / -1; }
        .adm-priceform .adm-pf-grid .adm-field { margin: 0; }
        .adm-seg-group { display: flex; gap: 8px; }
        .adm-seg-btn { flex: 1; height: 44px; padding: 0 24px; border: 2px solid var(--color-border-strong); border-radius: 12px; background: var(--color-white); font-size: 15px; font-weight: 700; color: var(--color-slate); cursor: pointer; font-family: 'Urbanist', sans-serif; transition: all 0.15s; }
        @media (hover: hover) { .adm-seg-btn:hover { border-color: var(--color-navy-dark); background: var(--color-cream); } }
        @media (hover: hover) { .adm-seg-btn.active:hover { background: var(--color-navy-dark); } }
        .adm-seg-btn.active { background: var(--color-navy-dark); border-color: var(--color-navy-dark); color: var(--color-white); }
        .adm-seg-error { border-color: var(--color-error); }
        .adm-price-lowhigh { display: flex; gap: 12px; align-items: flex-start; }
        .adm-price-lowhigh .adm-field { flex: 1; margin: 0; }
        .adm-priceform .adm-field { margin-bottom: 14px; }
        .adm-cfq-check { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 15px; font-weight: 600; color: var(--color-navy-dark); padding: 12px 14px; background: var(--color-white); border: 1px solid var(--color-border); border-radius: 12px; }
        .adm-cfq-check input { width: 18px; height: 18px; accent-color: var(--color-terracotta); cursor: pointer; }
        .adm-vet-phone { font-size: 15px; color: var(--color-navy-dark); font-weight: 600; text-decoration: none; display: inline-block; }
        @media (hover: hover) { .adm-vet-phone:hover { text-decoration: underline; } }
        .adm-vet-addrow { display: flex; justify-content: flex-end; margin-bottom: 18px; }
        .adm-pv-editform-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--color-border); }
        @media (max-width: 720px) {
          .adm-pv-fieldgrid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 960px) {
          .adm-pv-fieldgrid { grid-template-columns: 1fr 1fr; }
          .adm-hours-row { display: block; }
          .adm-hours-day { width: 100%; margin-bottom: 4px; }
          .adm-hours-range { padding-top: 10px; }
          .adm-hours-time { flex: 1; min-width: 0; }
          .adm-vet-lookup-row { flex-direction: column; }
          .adm-vet-lookup-row .adm-field-input { flex: none; width: 100%; }
          .adm-vet-lookup-btn { width: 100%; }
          .adm-sync-stats { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 620px) {
          .adm-pv-fieldgrid { grid-template-columns: 1fr; }
          .adm-hours-range { flex-wrap: wrap; gap: 8px; }
          .adm-hours-range .adm-hours-time { flex: 1 1 100%; }
          .adm-hours-dash { display: none; }
          .adm-hours-x { flex: 0 0 auto; margin-left: auto; }
          .adm-hours-actions { padding: 10px 0; }
          .adm-vet-check-row { flex-direction: column; align-items: flex-start; gap: 4px; }
          .adm-vet-check-link { padding-left: 30px; }
          .adm-pv-editform-actions { flex-direction: column-reverse; }
          .adm-vet-addrow { margin-bottom: 16px; }
          .adm-vet-addbtn { width: 100%; }
          .adm-pv-editform-actions .adm-b { width: 100%; }
        }
        /* Team tab */
        .adm-invite-card { border: 1px solid var(--color-border); border-radius: 12px; padding: 22px; margin-bottom: 22px; background: var(--color-white); }
        .adm-invite-title { margin: 0 0 16px; font-size: 17px; font-weight: 800; color: var(--color-navy-dark); }
        .adm-invite-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
        .adm-field { display: flex; flex-direction: column; gap: 6px; }
        .adm-field-label { font-size: 13px; font-weight: 800; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.10em; }
        .adm-field-input { width: 100%; height: 44px; padding: 0 14px; border: 1px solid var(--color-border-field); border-radius: 12px; font-size: 15px; font-weight: 500; font-family: 'Urbanist', sans-serif; color: var(--color-navy-dark); background-color: var(--color-white); }
        textarea.adm-field-input { height: auto; min-height: 80px; padding: 12px 14px; resize: vertical; }
        .adm-field-input:focus { outline: none; border-color: var(--color-terracotta); }
        .adm-perms-label { display: block; font-size: 13px; font-weight: 800; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px; }
        .adm-perms-hint { margin: 0 0 12px; font-size: 13px; font-weight: 500; color: var(--color-muted); }
        .adm-perms-grid { display: flex; flex-wrap: wrap; gap: 8px; }
        .adm-perm { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px 8px 10px; border: var(--pill-border-w, 2px) solid var(--control-border); border-radius: 9999px; background: var(--color-white); font-size: 14px; font-weight: 600; color: var(--color-navy-dark); cursor: pointer; font-family: 'Urbanist', sans-serif; transition: border-color 0.15s ease, background 0.15s ease; }
        @media (hover: hover) { .adm-perm:hover:not(.disabled) { border-color: var(--color-navy-dark); } }
        .adm-perm-box { width: 20px; height: 20px; border-radius: 6px; border: var(--pill-border-w, 2px) solid var(--control-border); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.15s ease, border-color 0.15s ease; }
        .adm-perm.on .adm-perm-box { background: var(--color-navy-dark); border-color: var(--color-navy-dark); }
        .adm-perm.on { border-color: var(--color-navy-dark); }
        .adm-perm.disabled { opacity: 0.45; cursor: not-allowed; }
        .adm-invite-error { margin: 14px 0 0; font-size: 14px; color: var(--color-error); font-weight: 700; }
        .adm-invite-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--color-border); }
        .adm-team-invitedby { font-size: 13px; font-weight: 500; color: var(--color-muted); }
        .adm-team-invite-row { display: flex; justify-content: flex-end; align-items: center; margin-bottom: 16px; min-height: 34px; }
        .adm-team-you { font-size: 13px; font-weight: 700; padding: 3px 11px; border-radius: 9999px; background: var(--color-badge-navy-bg); color: var(--color-navy-mid);  border: var(--pill-border-w, 2px) solid transparent; border-color: color-mix(in srgb, currentColor 30%, transparent);}
        .adm-team-perms { padding: 14px 0 0; border-top: 1px solid var(--color-border); display: flex; flex-direction: column; gap: 10px; }
        .adm-team-actions { border-top: 1px solid var(--color-border); padding-top: 14px; }
        .adm-team-action-btns { display: flex; gap: 10px; justify-content: flex-end; }
        .adm-team-confirm { display: flex; flex-direction: row; align-items: center; justify-content: flex-end; gap: 12px; flex-wrap: wrap; }
        .adm-team-confirm-q { font-size: 15px; font-weight: 700; color: var(--color-error); margin-right: auto; }
        .adm-team-confirm-btns { display: flex; gap: 10px; justify-content: flex-end; }
        .adm-team-edit { display: flex; align-items: flex-start; gap: 10px; }
        .adm-team-edit .adm-field-input { flex: 1 1 auto; width: auto; min-width: 0; max-width: 420px; }
        /* When the name edit is open, let the id column take the full card width
           so the input can grow and the buttons lay out without being squeezed
           by the space-between header row. Users tab is unaffected. */
        .adm-user-id-editing { flex: 1 1 100%; width: 100%; }
        .adm-team-edit-btns { display: flex; gap: 8px; margin-bottom: 10px; }
        /* Waitlist table */
        .adm-wl-export { height: 40px; padding: 0 24px; border-radius: 12px; background: var(--color-navy-dark); color: var(--color-white); border: 2px solid var(--color-navy-dark); font-size: 15px; font-weight: 700; font-family: 'Urbanist', sans-serif; cursor: pointer; transition: background 0.15s, color 0.15s; }
        @media (hover: hover) { .adm-wl-export:hover { background: var(--color-white); color: var(--color-navy-dark); } }
        .adm-wl-table { border: 1px solid var(--color-border); border-radius: 12px; overflow: hidden; margin-top: 8px; }
        .adm-wl-head { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; padding: 12px 16px; background: var(--color-cream); font-size: 13px; font-weight: 700; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .adm-wl-row { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; padding: 14px 16px; align-items: center; }
        .adm-wl-row + .adm-wl-row { border-top: 1px solid var(--color-border); }
        .adm-wl-email { font-size: 16px; font-weight: 600; color: var(--color-navy-dark); word-break: break-all; }
        .adm-wl-date { font-size: 16px; font-weight: 500; color: var(--color-slate); }
        .adm-wl-source { font-size: 16px; font-weight: 500; color: var(--color-muted); text-transform: capitalize; }
        @media (max-width: 640px) {
          .adm-wl-head { display: none; }
          .adm-wl-row { grid-template-columns: 1fr; gap: 4px; }
        }

        /* Symptom Logs — triage filter cards + log list */
        .adm-filter-label { display: block; font-size: 13px; font-weight: 700; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
        .adm-triage-filters { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 22px; }
        .adm-triage-card { position: relative; flex: 1; min-width: 120px; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 16px 12px; border: 2px solid; border-radius: 12px; cursor: pointer; font-family: 'Urbanist', sans-serif; box-shadow: 0 1px 2px rgb(var(--color-navy-dark-rgb) / 0.04); transition: transform 0.1s ease, box-shadow 0.15s ease; }
        @media (hover: hover) { .adm-triage-card:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgb(var(--color-navy-dark-rgb) / 0.1); } }
        .adm-triage-card.active { box-shadow: 0 3px 8px rgb(var(--color-navy-dark-rgb) / 0.16); }
        .adm-triage-check { position: absolute; top: 8px; right: 8px; display: inline-flex; }
        .adm-triage-count { font-size: 24px; font-weight: 800; line-height: 1; }
        .adm-triage-label { font-size: 15px; font-weight: 600; }
        .adm-chiprow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 0 0 18px; }
        .adm-chip { display: inline-flex; align-items: center; gap: 8px; height: 34px; padding: 0 6px 0 14px; border-radius: 9999px; font-size: 14px; font-weight: 700; border: var(--pill-border-w, 2px) solid; }
        .adm-chip-x { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: rgb(var(--color-black-rgb) / 0.08); cursor: pointer; border: none; padding: 0; }
        @media (hover: hover) { .adm-chip-x:hover { background: rgb(var(--color-black-rgb) / 0.16); } }
        .adm-clear-full { display: none; }
        .adm-log-list { display: flex; flex-direction: column; gap: 12px; }
        /* Pagination (reusable) */
        .adm-pager { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 28px; }
        .adm-pager-btn { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 18px; border: var(--pill-border-w, 2px) solid var(--control-border); background: var(--color-white); border-radius: 10px; font-size: 14px; font-weight: 700; color: var(--color-navy-dark); cursor: pointer; font-family: 'Urbanist', sans-serif; transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, opacity 0.18s ease; }
        @media (hover: hover) { .adm-pager-btn:hover:not(:disabled) { background: var(--color-cream); border-color: var(--color-terracotta); color: var(--color-terracotta-700); } }
        .adm-pager-btn:disabled { opacity: 0.4; cursor: default; }
        .adm-pager-info { font-size: 14px; font-weight: 600; color: var(--color-muted); min-width: 110px; text-align: center; }
        .adm-log-card { border: 1px solid var(--color-border); border-radius: 12px; padding: 16px 18px; display: flex; flex-direction: column; gap: 8px; }
        .adm-log-main { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .adm-log-id { display: flex; flex-direction: column; gap: 1px; }
        .adm-log-pet { font-size: 18px; font-weight: 600; color: var(--color-navy-dark); }
        .adm-log-species { font-size: 16px; font-weight: 500; color: var(--color-slate); text-transform: capitalize; }
        .adm-log-badge { font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; white-space: nowrap; flex-shrink: 0;  border: var(--pill-border-w, 2px) solid transparent; border-color: color-mix(in srgb, currentColor 30%, transparent);}
        .adm-log-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 15px; color: var(--color-slate); font-weight: 500; }
        .adm-log-date { color: var(--color-muted); font-size: 14px; font-weight: 500; }
        .adm-log-time { font-size: 14px; font-weight: 500; color: var(--color-muted); }
        @media (max-width: 620px) {
          .adm-triage-card { min-width: 100%; flex: none; }
          .adm-log-main { flex-direction: row; align-items: flex-start; justify-content: space-between; gap: 10px; }
          .adm-chiprow { display: none; }
          .adm-clear-full { display: block; width: 100%; height: 42px; margin: -8px 0 20px; border: 2px solid var(--color-border-strong); background: var(--color-white); border-radius: 10px; font-size: 15px; font-weight: 700; color: var(--color-terracotta-700); cursor: pointer; font-family: 'Urbanist', sans-serif; transition: background 0.2s, color 0.2s, border-color 0.2s; }
          /* Inverts on hover: the text color becomes the fill, the fill
             becomes the text, and the border takes the text color too. */
          @media (hover: hover) { .adm-clear-full:hover { background: var(--color-terracotta-700); color: var(--color-white); border-color: var(--color-terracotta-700); } }
        }
        /* Pets — card grid (2-col desktop, 1-col mobile) */
        .adm-pet-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        @media (max-width: 720px) { .adm-pet-grid { grid-template-columns: 1fr; } }
        .adm-pet-card { border: 1px solid var(--color-border); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 14px; }
        .adm-pet-head { display: flex; flex-direction: column; gap: 2px; }
        .adm-pet-name { font-size: 18px; font-weight: 700; color: var(--color-navy-dark); }
        .adm-pet-owner { font-size: 15px; font-weight: 500; color: var(--color-muted); }
        .adm-pet-attrs { display: flex; flex-direction: column; gap: 0; border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); }
        .adm-pet-attr { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 10px 0; border-bottom: 1px solid var(--color-cream); }
        .adm-pet-attr:last-child { border-bottom: none; }
        .adm-pet-attr-l { font-size: 13px; font-weight: 700; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.04em; flex-shrink: 0; }
        .adm-pet-attr-v { font-size: 16px; font-weight: 600; color: var(--color-navy-dark); text-align: right; }
        .adm-pet-foot { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
        .adm-pet-foot .adm-pet-attr-l { align-self: center; }
        .adm-pet-select { height: 44px; font-size: 15px; max-width: 180px; }
        @media (max-width: 720px) {
        }
        /* Restyled data table (Pets, etc.) */
        .adm-table-wrap { border: 1px solid var(--color-border); border-radius: 12px; overflow: hidden; overflow-x: auto; }
        .adm-table { width: 100%; border-collapse: collapse; font-family: 'Urbanist', sans-serif; }
        .adm-table thead th { text-align: left; font-size: 14px; font-weight: 800; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; padding: 13px 16px; background: var(--color-white); border-bottom: 1px solid var(--color-border); white-space: nowrap; }
        .adm-table tbody td { font-size: 15px; color: var(--color-slate); font-weight: 500; padding: 13px 16px; border-bottom: 1px solid var(--color-cream); vertical-align: middle; }
        .adm-table tbody tr:last-child td { border-bottom: none; }
        @media (hover: hover) { .adm-table tbody tr:hover { background: var(--color-white); } }
        .adm-td-strong { font-size: 15px !important; font-weight: 700 !important; color: var(--color-navy-dark) !important; }
        .adm-td-select { height: 34px; font-size: 13px; width: auto; min-width: 0; max-width: 170px; padding-right: 34px; }
        /* Mobile: collapse table rows into labeled cards */
        @media (max-width: 720px) {
          .adm-table-wrap { border: none; border-radius: 0; overflow: visible; }
          .adm-table, .adm-table tbody, .adm-table tr, .adm-table td { display: block; width: 100%; }
          .adm-table thead { display: none; }
          .adm-table tr { border: 1px solid var(--color-border); border-radius: 12px; margin-bottom: 20px; padding: 6px 4px; }
          @media (hover: hover) { .adm-table tbody tr:hover { background: transparent; } }
          .adm-table td { border-bottom: 1px solid var(--color-cream) !important; padding: 11px 16px; display: flex; justify-content: space-between; align-items: center; gap: 14px; text-align: right; }
          .adm-table tr td:last-child { border-bottom: none !important; }
          .adm-table td::before { content: attr(data-label); font-size: 12px; font-weight: 800; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.04em; text-align: left; flex-shrink: 0; }
          .adm-td-strong { font-size: 16px !important; }
          .adm-td-select { width: auto; min-width: 0; max-width: 190px; }
        }
        /* Users tab */
        .adm-userfilters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
        .adm-userfilter { padding: 7px 14px; border: var(--pill-border-w, 2px) solid var(--control-border); background: var(--color-white); border-radius: 9999px; font-size: 15px; font-weight: 700; color: var(--color-slate); cursor: pointer; font-family: 'Urbanist', sans-serif; transition: all 0.15s; white-space: nowrap; }
        .adm-userfilter.active { background: var(--color-navy-dark); color: var(--color-white); border-color: var(--color-navy-dark); }
        .adm-user-list { display: flex; flex-direction: column; gap: 20px; }
        .adm-user-card { border: 1px solid var(--color-border); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 14px; }
        .adm-user-main { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
        .adm-user-id { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .adm-user-name { font-size: 18px; font-weight: 700; color: var(--color-navy-dark); }
        .adm-user-email { font-size: 15px; color: var(--color-muted); font-weight: 500; word-break: break-word; }
        .adm-user-badges { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
        .adm-ustatus { font-size: 13px; font-weight: 700; padding: 3px 12px; border-radius: 9999px;  border: var(--pill-border-w, 2px) solid transparent; border-color: color-mix(in srgb, currentColor 30%, transparent);}
        .adm-ustatus-active { background: var(--color-success-light); color: var(--color-success-text); }
        .adm-ustatus-suspended { background: var(--color-warning-light); color: var(--color-warning-text); }
        .adm-ustatus-banned { background: var(--color-error-light); color: var(--color-error-text); }
        .adm-ustatus-new { background: var(--color-warning-light); color: var(--color-warning-text); }
        .adm-uflag { font-size: 13px; font-weight: 700; padding: 3px 11px; border-radius: 9999px; background: var(--color-warning-light); color: var(--color-warning-text); display: inline-flex; align-items: center; gap: 4px;  border: var(--pill-border-w, 2px) solid transparent; border-color: color-mix(in srgb, currentColor 30%, transparent);}
        .adm-uflag.auto { background: var(--color-cream); color: var(--color-muted); }
        .adm-uflag svg { width: 12px; height: 12px; }
        .adm-user-meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 14px 0; border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); }
        .adm-user-stat { display: flex; flex-direction: column; gap: 2px; align-items: center; text-align: center; position: relative; }
        @media (min-width: 621px) {
          .adm-user-stat:not(:last-child)::after { content: ""; position: absolute; right: 0; top: 12%; height: 76%; width: 1px; background: var(--color-border); }
        }
        .adm-user-stat-n { font-size: 18px; font-weight: 800; color: var(--color-navy-dark); }
        .adm-user-stat-l { font-size: 15px; color: var(--color-slate); font-weight: 600; }
        .adm-user-actions { display: flex; gap: 10px; align-items: center; justify-content: flex-end; }
        .adm-user-status-select { height: 40px; padding: 0 38px 0 14px; border: 1px solid var(--color-border-field); border-radius: 12px; font-size: 15px; font-weight: 600; font-family: 'Urbanist', sans-serif; color: var(--color-navy-dark); background: var(--color-white); cursor: pointer; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='${svgHex("muted")}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; }
        @media (max-width: 620px) {
          .adm-user-meta { grid-template-columns: repeat(2, 1fr); gap: 0; padding: 4px 0; }
          .adm-user-main { flex-direction: column; align-items: flex-start; gap: 8px; }
          .adm-invite-grid { grid-template-columns: 1fr; }
          .adm-team-edit { flex-direction: column; gap: 10px; }
          .adm-team-edit .adm-field-input { flex: none; width: 100%; max-width: none; }
          .adm-team-edit-btns { flex-direction: column-reverse; width: 100%; }
          .adm-team-edit-btns .adm-b { width: 100%; }
          .adm-team-action-btns { flex-direction: column; width: 100%; }
          .adm-team-action-btns .adm-b { width: 100%; }
          .adm-invite-actions { flex-direction: column-reverse; }
          .adm-invite-actions .adm-b { width: 100%; }
          .adm-team-confirm { flex-direction: column; align-items: stretch; }
          .adm-team-confirm-q { margin-right: 0; }
          .adm-team-confirm-btns { flex-direction: column-reverse; width: 100%; }
          .adm-team-confirm-btns .adm-b { width: 100%; }
          .adm-user-stat { padding: 14px 0; }
          .adm-user-stat:not(:last-child)::after { content: none; }
          .adm-user-stat:nth-child(1)::before { content: ""; position: absolute; right: 0; top: 10%; bottom: 6px; width: 1px; background: var(--color-border); }
          .adm-user-stat:nth-child(3)::before { content: ""; position: absolute; right: 0; top: 6px; bottom: 10%; width: 1px; background: var(--color-border); }
          .adm-user-stat:nth-child(1)::after { content: ""; position: absolute; bottom: 0; left: 10%; right: 6px; height: 1px; background: var(--color-border); }
          .adm-user-stat:nth-child(2)::after { content: ""; position: absolute; bottom: 0; left: 6px; right: 10%; height: 1px; background: var(--color-border); }
          .adm-user-actions { flex-direction: column; align-items: stretch; }
          .adm-pv-actions { flex-direction: column; }
          .adm-pf-grid { grid-template-columns: 1fr; }
          .adm-seg-group { flex-direction: column; }
          .adm-seg-btn { flex: none; width: 100%; }
          .adm-price-head { flex-direction: column; align-items: stretch; gap: 12px; }
          .adm-price-head .adm-vet-addbtn { width: 100%; }
          .adm-sync-top { flex-direction: column; }
          .adm-sync-actions { width: 100%; flex-direction: column; }
          .adm-sync-actions .adm-b { width: 100%; }
          .adm-sync-stats { grid-template-columns: repeat(2, 1fr); }
          .adm-conflict-options { grid-template-columns: 1fr; }
          .adm-conflict-keepboth { min-width: 0; width: 100%; }
          .adm-pv-actions .adm-b { width: 100%; }
          .adm-price-lowhigh { flex-direction: row; }
          .adm-species-grid { flex-direction: column; }
          .adm-species-grid .adm-field { width: 100%; }
          .adm-user-status-select { width: 100%; }
        }
        .adm-brand-title { margin: 0 0 2px 0; font-size: 20px; color: var(--color-navy-dark); font-weight: 800; white-space: nowrap; }
        .adm-filter-row { display: flex; gap: 8px; margin-bottom: 16px; }
        .adm-filter-pill { padding: 0 24px; height: 38px; border-radius: 12px; border: 2px solid var(--color-border-strong); background: var(--color-white); font-size: 15px; font-weight: 700; cursor: pointer; color: var(--color-slate); white-space: nowrap; font-family: 'Urbanist', sans-serif; transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease; }
        @media (hover: hover) { .adm-filter-pill:hover:not(.on) { border-color: var(--color-navy-dark); color: var(--color-navy-dark); } }
        .adm-filter-pill.on { background: var(--color-terracotta-600); border-color: var(--color-terracotta-600); color: var(--color-white); }

        .adm-batch { background: var(--color-white); border: 1px solid var(--color-border); border-radius: 12px; margin-bottom: 16px; overflow: hidden; }
        /* Vet header — the clinic heading for the whole card */
        .adm-vet-head { padding: 18px 18px 14px; border-bottom: 1px solid var(--color-border); }
        /* Receipt/manual sub-group inside a vet card */
        .adm-subgroup { border-bottom: 1px solid var(--color-border); }
        .adm-subgroup:last-child { border-bottom: none; }
        .adm-subgroup-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 18px; background: var(--color-white); border-bottom: 1px solid var(--color-border); }
        /* Receipt viewer. Stacked, so the toggle sits on its own line with
           whatever it opens beneath it. Panel matches the admin's card
           treatment; the toggle is a plain text link, not a button competing
           with Approve and Reject. */
        /* Says where this number came from. The pill, on the same line as the
           number it describes — the shape is what makes it read as a label
           rather than more of the grey sentence after the price. Same size,
           padding, radius and border weight as .adm-price-species, so the two
           pills in this card match. */
        .adm-sheet-owned {
          display: inline-flex; align-items: center; justify-content: center;
          margin-left: 8px; vertical-align: middle;
          font-size: 13px; font-weight: 700; padding: 3px 11px;
          border-radius: 9999px;
          background: var(--color-cream); color: var(--color-muted);
          border: var(--pill-border-w, 2px) solid rgb(var(--color-muted-rgb) / 0.26);
          white-space: nowrap; box-sizing: border-box;
        }
        /* Same pill, terracotta. "From call sheet" is where a number came from
           and is neutral; "Edited here" is a decision someone made, which is
           worth more weight than a neutral grey gives it — and it needs to be
           told apart from its sibling at a glance when a list holds both. */
        .adm-price-overridden {
          background: var(--color-warning-light); color: var(--color-terracotta-700);
          border-color: rgb(var(--color-terracotta-rgb) / 0.3);
        }
        /* What the call sheet holds while Admin's value is the one in force.
           Its own line under the price rather than trailing it: it's a second
           number, and two numbers on one line invite being read as a range. */
        .adm-sheet-says {
          display: block; margin-top: 2px;
          font-size: 14px; font-weight: 500; color: var(--color-muted);
        }
        /* Said above the price form, before the save. Warning colour, not an
           error colour — nothing is wrong, something is about to change hands. */
        .adm-takeover-note {
          margin: 10px 0 0; padding: 12px 14px;
          background: var(--color-warning-light); border: 1px solid rgb(var(--color-warning-text-rgb) / 0.22);
          border-radius: 10px;
          font-size: 15px; font-weight: 500; line-height: 1.55; color: var(--color-warning-text);
          text-wrap: pretty;
        }
        .adm-takeover-note strong { font-weight: 800; }
        /* Hand-back confirm. Its own block under the action row rather than a
           member of it: the question needs a full sentence, and a sentence
           inside a flex row of 42px buttons stretched the row and pushed the
           question away from the button it answered. */
        .adm-handback {
          margin-top: 12px; padding: 14px 16px;
          background: var(--color-white); border: 1px solid var(--color-border); border-radius: 12px;
        }
        .adm-handback-q { margin: 0; font-size: 15px; font-weight: 800; color: var(--color-navy-dark); }
        .adm-handback-body {
          margin: 4px 0 0; font-size: 15px; font-weight: 500;
          line-height: 1.55; color: var(--color-slate); text-wrap: pretty;
        }
        .adm-handback-actions {
          display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px;
        }
        @media (max-width: 640px) {
          .adm-handback-actions { flex-direction: column-reverse; }
          .adm-handback-actions .adm-b { width: 100%; }
        }
        /* Note-only editor, for a price whose number the call sheet owns.
           Same surface, border and radius as .adm-pv-editform so it reads as
           the same kind of panel, just the one field tall. */
        .adm-notepanel {
          margin-top: 4px; background: var(--color-white);
          border: 1px solid var(--color-border); border-radius: 12px; padding: 18px;
        }
        .adm-notepanel-hint {
          margin: 4px 0 10px; font-size: 14px; font-weight: 500;
          line-height: 1.55; color: var(--color-muted); text-wrap: pretty;
        }
        .adm-notepanel-actions {
          display: flex; justify-content: flex-end; gap: 10px;
          margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--color-border);
        }
        @media (max-width: 640px) {
          .adm-notepanel-actions { flex-direction: column-reverse; }
          .adm-notepanel-actions .adm-b { width: 100%; }
        }
        /* One line above the list, not one per price. */
        /* Two sentences about two different things — which field the sheet
           owns, and which one Admin owns. Run together they read as one long
           qualification; on their own lines they read as two rules. */
        .adm-price-sheet-note {
          margin: 0 0 14px; padding: 12px 14px;
          background: var(--color-cream); border-radius: 10px;
          font-size: 15px; font-weight: 500; line-height: 1.55;
          color: var(--color-slate);
          display: flex; flex-direction: column; gap: 8px;
        }
        .adm-receipt {
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .adm-receipt-toggle {
          padding: 0; border: none; background: none; cursor: pointer;
          font-family: inherit; font-size: 15px; font-weight: 700;
          color: var(--color-terracotta-700); text-decoration: underline;
        }
        @media (hover: hover) { .adm-receipt-toggle:hover:not(:disabled) { color: var(--color-navy-dark); } }
        .adm-receipt-toggle:disabled { opacity: 0.6; cursor: default; }
        .adm-receipt-panel {
          margin-top: 10px; padding: 12px; background: var(--color-white);
          border: 1px solid var(--color-border); border-radius: 12px; max-width: 520px;
        }
        .adm-receipt-panel img {
          display: block; width: 100%; height: auto; border-radius: 8px;
        }
        /* Navy, not terracotta: terracotta is the primary action colour and
           Approve/Reject are the decisions that matter here. The border looks
           redundant until hover, when the fill turns white and it becomes the
           visible edge. */
        .adm-receipt-open {
          margin-top: 10px;
          display: inline-flex; align-items: center; justify-content: center;
          height: 42px; padding: 0 24px; border-radius: 12px;
          border: var(--pill-border-w, 2px) solid var(--color-navy-dark);
          background: var(--color-navy-dark); color: var(--color-white); font-size: 15px; font-weight: 700;
          text-decoration: none; box-sizing: border-box;
          transition: background 0.2s, color 0.2s;
        }
        @media (hover: hover) { .adm-receipt-open:hover { background: var(--color-white); color: var(--color-navy-dark); } }
        @media (max-width: 640px) {
          .adm-receipt-open { display: flex; width: 100%; }
        }
        /* Matches .adm-line-caption exactly. A multi-item receipt header and a
           single manual entry show the same three facts in the same place, so
           they should look the same — the header was carrying its own heavier
           weight for no reason. */
        .adm-subgroup-meta { font-size: 16px; color: var(--color-slate); font-weight: 500; line-height: 1.6; }
        .adm-subgroup-meta .adm-cap-kind { font-size: 16px; font-weight: 800; color: var(--color-slate); }
        .adm-subgroup-meta .adm-cap-date { font-size: 14px; font-weight: 700; color: var(--color-muted); }
        .adm-subgroup-meta .from { display: inline-block; font-size: 14px; color: var(--color-muted); font-weight: 500; padding-top: 5px; }
        .adm-subgroup-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .adm-subgroup-actions { display: flex; gap: 8px; flex-shrink: 0; }
        /* Caption on a single-item block (date/submitter attached to the line) */
        .adm-line-caption { font-size: 16px; color: var(--color-slate); font-weight: 500; margin: -2px 0 8px; line-height: 1.6; }
        .adm-line-caption .from { display: inline-block; font-size: 14px; color: var(--color-muted); font-weight: 500; padding-top: 5px; }
        .adm-line-caption .adm-cap-kind { font-size: 16px; font-weight: 800; color: var(--color-slate); }
        .adm-line-caption .adm-cap-date { font-size: 14px; font-weight: 700; color: var(--color-muted); }
        .adm-batch-head { display: flex; gap: 13px; padding: 16px 18px; background: var(--color-white); border-bottom: 1px solid var(--color-border); align-items: center; }
        .adm-batch-ico { width: 38px; height: 38px; border-radius: 9px; background: var(--color-cream); display: flex; align-items: center; justify-content: center; color: var(--color-navy-mid); flex-shrink: 0; }
        .adm-batch-info { flex: 1; min-width: 0; }
        .adm-batch-name { font-size: 20px; font-weight: 800; color: var(--color-navy-dark); white-space: nowrap; overflow: hidden; }
        .adm-batch-meta { font-size: 13px; color: var(--color-slate); line-height: 1.5; }
        .adm-batch-meta .from { color: var(--color-muted); }
        .adm-batch-badge { flex-shrink: 0; display: flex; }
        .adm-status-pill { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 40px; padding: 0 16px; border-radius: 9999px; font-size: 13px; font-weight: 700; white-space: nowrap;  border: var(--pill-border-w, 2px) solid transparent; border-color: color-mix(in srgb, currentColor 30%, transparent);}
        .adm-status-verified { background: var(--color-success-light); color: var(--color-success-text); }
        .adm-status-flag { background: var(--color-warning-light); color: var(--color-warning-text); }
        .adm-batch-actions { display: flex; gap: 8px; flex-shrink: 0; }

        .adm-line { padding: 16px 18px; border-bottom: 1px solid var(--color-border); }
        .adm-line:last-child { border-bottom: none; }
        .adm-line.flag { background: var(--color-cream); border-left: 3px solid var(--color-terracotta); }
        .adm-line-top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
        .adm-line-name { font-size: 18px; color: var(--color-navy-dark); font-weight: 600; }
        .adm-line-price { font-size: 16px; font-weight: 800; color: var(--color-navy-dark); white-space: nowrap; flex-shrink: 0; }
        .adm-line-bottom { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .adm-tag { display: inline-block; border-radius: 9999px; padding: 4px 13px; font-size: 13px; font-weight: 700; white-space: nowrap;  border: var(--pill-border-w, 2px) solid transparent; border-color: color-mix(in srgb, currentColor 30%, transparent);}
        .adm-tag-mapped { background: var(--color-success-light); color: var(--color-success-text); }
        .adm-tag-unmapped { background: var(--color-warning-light); color: var(--color-warning-text); }
        .adm-tag-product { background: var(--color-badge-navy-bg); color: var(--color-slate); }
        .adm-line-controls { display: flex; gap: 8px; flex-shrink: 0; }
        .adm-line-select { font-size: 15px; padding: 0 38px 0 14px; height: 44px; border-radius: 12px; border: 1px solid var(--color-border-field); background: var(--color-white); font-weight: 600; color: var(--color-navy-dark); font-family: 'Urbanist', sans-serif; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='${svgHex("muted")}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; }
        .adm-line-note { font-size: 13px; color: var(--color-warning-text); padding: 14px 18px; display: flex; gap: 7px; align-items: flex-start; line-height: 1.6; }

        .adm-pager { display: flex; justify-content: center; align-items: center; gap: 6px; margin-top: 18px; }
        .adm-pager button { border: 2px solid var(--color-border-strong); background: var(--color-white); border-radius: 12px; padding: 0 18px; height: 38px; font-size: 13px; font-weight: 700; cursor: pointer; color: var(--color-navy-dark); font-family: 'Urbanist', sans-serif; transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease; }
        @media (hover: hover) { .adm-pager button:hover:not(:disabled) { background: var(--color-navy-dark); color: var(--color-white); border-color: var(--color-navy-dark); } }
        .adm-pager button:disabled { opacity: 0.4; cursor: not-allowed; }
        .adm-pager span { font-size: 13px; color: var(--color-slate); padding: 0 8px; font-weight: 600; }

        .adm-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 240px; color: var(--color-muted); gap: 12px; text-align: center; }

        /* Buttons — EXACT mockup values (fill-to-outline hover, 2px border) */
        .adm-b { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 24px; height: 40px; border-radius: 12px; font-size: 15px; font-weight: 700; border: 2px solid transparent; cursor: pointer; font-family: 'Urbanist', sans-serif; white-space: nowrap; transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease; }
        .adm-b.adm-b-notes { height: 38px !important; }
        .adm-b:disabled { cursor: not-allowed; opacity: 0.45; }
        /* Disabled primary reads as clearly inert (not a faded live button) */
        .adm-b-primary:disabled { background: var(--color-border); color: var(--color-muted); border-color: var(--color-border); }
        @media (hover: hover) { .adm-b-primary:disabled:hover { background: var(--color-border); color: var(--color-muted); border-color: var(--color-border); } }
        .adm-b-primary { background: var(--color-terracotta-600); color: var(--color-white); border-color: var(--color-terracotta-600); }
        @media (hover: hover) { .adm-b-primary:hover:not(:disabled) { background: var(--color-white); color: var(--color-terracotta-700); } }
        .adm-b-navy { background: var(--color-navy-dark); color: var(--color-white); border-color: var(--color-navy-dark); }
        @media (hover: hover) { .adm-b-navy:hover:not(:disabled) { background: var(--color-white); color: var(--color-navy-dark); border-color: var(--color-navy-dark); } }
        .adm-b-outline { background: var(--color-white); color: var(--color-navy-dark); border-color: var(--color-border-strong); }
        @media (hover: hover) { .adm-b-outline:hover { background: var(--color-navy-dark); color: var(--color-white); border-color: var(--color-navy-dark); } }
        .adm-b-danger { background: var(--color-white); color: var(--color-error); border-color: var(--color-error); }
        @media (hover: hover) { .adm-b-danger:hover { background: var(--color-error); color: var(--color-white); border-color: var(--color-error); } }
        .adm-b-rejectall { background: var(--color-white); color: var(--color-error); border: 2px solid var(--color-error); }
        @media (hover: hover) { .adm-b-rejectall:hover { background: var(--color-error); color: var(--color-white); border-color: var(--color-error); } }

        @media (max-width: 960px) {
          .adm-topbar { position: sticky; top: 0; z-index: 60; background: var(--color-white); margin: -20px -16px 22px; padding: 13px 16px; border-bottom: 1px solid var(--color-border); box-shadow: 0 1px 3px rgb(var(--color-navy-dark-rgb) / 0.06); transition: box-shadow 0.2s ease; will-change: transform; transform: translateZ(0); }
          /* max-height is cleared here on purpose: the drawer is fixed with
             top/bottom, so its height already comes from the viewport. A
             leftover calc() cap would fight that and clip the last item. */
          .adm-sidebar { position: fixed; top: 66px; left: 0; bottom: 0; width: 260px; max-height: none; border-radius: 0; z-index: 55; transform: translateX(-100%); transition: transform 0.25s ease; overflow-y: auto; padding-top: 14px; display: flex; flex-direction: column; }
          .adm-sidebar.open { transform: translateX(0); }
          .adm-hamburger { display: flex; }
          .adm-shell { display: block; }
          .adm-scrim.show { display: block; top: 66px; }
          .adm-action-cards { grid-template-columns: 1fr; }
          .adm-statline { grid-template-columns: 1fr 1fr; padding: 0; }
          .adm-stat-item { padding: 24px 0; }
          /* VERTICAL center line — left-column items (1st, 3rd), right edge */
          .adm-stat-item:nth-child(1)::before { content: ""; position: absolute; right: 0; top: 10%; bottom: 6px; width: 1px; background: var(--color-border); }
          .adm-stat-item:nth-child(3)::before { content: ""; position: absolute; right: 0; top: 6px; bottom: 10%; width: 1px; background: var(--color-border); }
          /* HORIZONTAL center line — top-row items (1st, 2nd), bottom edge */
          .adm-stat-item:nth-child(1)::after { content: ""; position: absolute; bottom: 0; left: 10%; right: 6px; height: 1px; background: var(--color-border); }
          .adm-stat-item:nth-child(2)::after { content: ""; position: absolute; bottom: 0; left: 6px; right: 10%; height: 1px; background: var(--color-border); }
        }
        @media (max-width: 720px) {
          /* Sub-group header stacks; actions full-width stacked, Approve on top */
          .adm-subgroup-head { flex-direction: column; align-items: stretch; gap: 12px; }
          /* Separate viewing the receipt from deciding on it. */
          .adm-subgroup-head .adm-receipt {
            padding-bottom: 12px;
            border-bottom: 1px solid var(--color-border);
          }
          .adm-subgroup-right { flex-direction: column; align-items: stretch; }
          .adm-status-pill { width: 100%; }
          .adm-subgroup-actions { width: 100%; flex-direction: column; }
          .adm-subgroup-actions .adm-b { width: 100%; }
          .adm-subgroup-actions .adm-b-primary { order: 1; }
          .adm-subgroup-actions .adm-b-rejectall { order: 2; }
          /* Line controls stack full-width, Approve above Reject */
          .adm-line-bottom { flex-direction: column; align-items: flex-start; gap: 12px; }
          .adm-line-controls { width: 100%; flex-direction: column; }
          .adm-line-controls .adm-b { width: 100%; }
          .adm-line-controls .adm-b-primary { order: 1; }
          .adm-line-controls .adm-b-outline { order: 2; }
          .adm-line-select { width: 100%; order: 0; }
          .adm-att-row { flex-wrap: wrap; }
          .adm-att-go { width: 100%; justify-content: flex-start; padding-left: 46px; }
          .adm-filter-row { flex-wrap: wrap; }
          .adm-main { padding: 18px; }
        }
        @media (max-width: 520px) {
          .adm-filter-row { flex-direction: column; }
          .adm-filter-pill { width: 100%; }
        }

        /* ── "Show 50 more" (Users and Pets) ────────────────────────────────
           Those two lists were the only searchable ones drawing every match
           at once; the others already page. The cap is what keeps typing in
           the search box responsive, and this is how you get past it. */
        .adm-showmore { display: flex; align-items: center; gap: 14px; margin-top: 20px; flex-wrap: wrap; }
        .adm-showmore-count { font-size: 14px; font-weight: 500; color: var(--color-muted); line-height: initial; }
        @media (max-width: 520px) {
          .adm-showmore { flex-direction: column; align-items: stretch; }
          .adm-showmore .adm-b { width: 100%; }
          .adm-showmore-count { text-align: center; }
        }

        /* ── Pills, badges, chips and tags ──────────────────────────────────
           The document line-height is 1.7, which every one of these inherits.
           On a pill with a fixed height and align-items:center that's hidden;
           on the ones sized by their own content it inflated the capsule well
           past the text it holds. "initial" resolves to "normal", sizing the
           line to the font instead of the page.

           One grouped rule at the end of the stylesheet rather than a
           declaration edited into 29 separate blocks: the whole set is
           visible in one place, a new pill joins it by adding one selector,
           and being last it wins over the per-class rules at equal
           specificity without needing !important.

           Deliberately NOT included: .adm-toggle and .adm-toggle-slider (a
           switch, whose geometry is set by width/height, not text),
           .scroll-arrow-btn (a round icon button) and .adm-perm (a permission
           row with a checkbox, not a pill). Changing the line box on those
           would alter the control, which is not what was asked for. */
        .tab-badge,
        .badge,
        .adm-badge,
        .adm-nav-count,
        .adm-pv-source,
        .adm-vet-declined,
        .adm-vet-unverified,
        .adm-price-species,
        .adm-price-tag,
        .adm-priced-badge,
        .adm-cq-hasnotes,
        .adm-pill,
        .adm-reports-filter,
        .adm-conflict-src,
        .adm-team-you,
        .adm-chip,
        .adm-chip-x,
        .adm-log-badge,
        .adm-userfilter,
        .adm-ustatus,
        .adm-uflag,
        .adm-filter-pill,
        .adm-sheet-owned,
        .adm-status-pill,
        .adm-tag { line-height: initial; }
      `}</style>

      <div
        className="adm-page-root"
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          fontFamily: "'Urbanist', system-ui, sans-serif",
          minHeight: "100vh",
        }}
      >
        {/* Topbar */}
        <div className="adm-topbar">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "11px",
              minWidth: 0,
            }}
          >
            <button
              className="adm-hamburger"
              onClick={() => setNavOpen((v) => !v)}
              aria-label={navOpen ? "Close menu" : "Open menu"}
            >
              {navOpen ? (
                <svg aria-hidden="true"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg aria-hidden="true"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
            <div style={{ minWidth: 0 }}>
              <h1 className="adm-brand-title">PetParrk Admin</h1>
            </div>
          </div>
        </div>

        {/* Mobile scrim */}
        <div
          className={`adm-scrim${navOpen ? " show" : ""}`}
          onClick={() => setNavOpen(false)}
        />

        {/* Shell: sidebar + main */}
        <div className="adm-shell">
          <nav className={`adm-sidebar${navOpen ? " open" : ""}`}>
            {NAV_GROUPS.map((group, gi) => (
              <div
                key={group.label}
                className={gi > 0 ? "adm-nav-group divided" : "adm-nav-group"}
              >
                <div className="adm-nav-group-label">{group.label}</div>
                {group.tabs.map((t) => (
                  <button
                    key={t.name}
                    className={`adm-nav-btn${tab === t.name ? " active" : ""}`}
                    onClick={() => {
                      switchTab(t.name);
                      setNavOpen(false);
                    }}
                  >
                    {t.icon}
                    <span className="adm-nav-label">{t.name}</span>
                    {t.name === "Submissions" && stats.pendingSubs > 0 && (
                      <span className="adm-nav-count">{stats.pendingSubs}</span>
                    )}
                    {t.name === "Pending Vets" && stats.pendingVets > 0 && (
                      <span className="adm-nav-count">{stats.pendingVets}</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
            {/* Drawer footer — signed-in + back-to-site, shown only in mobile drawer */}
            <div className="adm-drawer-footer">
              <p className="adm-drawer-signed">
                <strong>Signed in: </strong>
                {session?.user?.email}
              </p>
              <Link href="/" className="adm-drawer-back">
                ← Back to site
              </Link>
            </div>
          </nav>

          <div className="adm-main">
            {/* ── DASHBOARD ── */}
            {tab === "Dashboard" && (
              <div>
                <h2 className="adm-view-title">Dashboard</h2>
                <p className="adm-view-sub">
                  Here's what needs your attention.
                </p>
                <div className="adm-action-cards">
                  <button
                    className="adm-action-card"
                    onClick={() => switchTab("Submissions")}
                  >
                    <div className="adm-ac-value">
                      {(stats.pendingSubs || 0).toLocaleString()}
                    </div>
                    <div className="adm-ac-label">Submissions to review</div>
                    <div className="adm-ac-hint">
                      Open queue <ChevronRight />
                    </div>
                  </button>
                  <button
                    className="adm-action-card"
                    onClick={() => switchTab("Pending Vets")}
                  >
                    <div className="adm-ac-value">
                      {(stats.pendingVets || 0).toLocaleString()}
                    </div>
                    <div className="adm-ac-label">Pending vets to activate</div>
                    <div className="adm-ac-hint">
                      Review <ChevronRight />
                    </div>
                  </button>
                  <button
                    className="adm-action-card neutral"
                    onClick={() => switchTab("Prices")}
                  >
                    <div className="adm-ac-value">
                      {(stats.totalPrices || 0).toLocaleString()}
                    </div>
                    <div className="adm-ac-label">Total prices</div>
                    <div className="adm-ac-hint q">
                      View directory <ChevronRight />
                    </div>
                  </button>
                </div>
                <div className="adm-statline">
                  <div className="adm-stat-item">
                    <span className="adm-stat-num">
                      {(stats.activeVets || 0).toLocaleString()}
                    </span>
                    <span className="adm-stat-lbl">Active vets</span>
                  </div>
                  <div className="adm-stat-item">
                    <span className="adm-stat-num">
                      {(stats.totalPrices || 0).toLocaleString()}
                    </span>
                    <span className="adm-stat-lbl">Prices</span>
                  </div>
                  <div className="adm-stat-item">
                    <span className="adm-stat-num">
                      {(stats.totalUsers || 0).toLocaleString()}
                    </span>
                    <span className="adm-stat-lbl">Users</span>
                  </div>
                  <div className="adm-stat-item">
                    <span className="adm-stat-num">
                      {(stats.totalSymptomChecks || 0).toLocaleString()}
                    </span>
                    <span className="adm-stat-lbl">Checks</span>
                  </div>
                </div>
                <div className="adm-attention">
                  <div className="adm-attention-title">
                    Needs attention first
                  </div>
                  {stats.pendingSubs > 0 && (
                    <button
                      className="adm-att-row"
                      onClick={() => switchTab("Submissions")}
                    >
                      <div className="adm-att-ico warn">
                        <svg aria-hidden="true"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
                          <path d="M12 9v4M12 17h.01" />
                        </svg>
                      </div>
                      <div className="adm-att-main">
                        <div className="adm-att-h">
                          {stats.pendingSubs} submission
                          {stats.pendingSubs === 1 ? "" : "s"} awaiting review
                        </div>
                        <div className="adm-att-s">
                          Community-submitted prices to approve or reject
                        </div>
                      </div>
                      <div className="adm-att-go">
                        Review <ChevronRight size={16} />
                      </div>
                    </button>
                  )}
                  {stats.pendingVets > 0 && (
                    <button
                      className="adm-att-row"
                      onClick={() => switchTab("Pending Vets")}
                    >
                      <div className="adm-att-ico warn">
                        <svg aria-hidden="true"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 6v6l4 2" />
                        </svg>
                      </div>
                      <div className="adm-att-main">
                        <div className="adm-att-h">
                          {stats.pendingVets} pending vet
                          {stats.pendingVets === 1 ? "" : "s"} to activate
                        </div>
                        <div className="adm-att-s">
                          New clinics submitted by users, ready to review
                        </div>
                      </div>
                      <div className="adm-att-go">
                        Review <ChevronRight size={16} />
                      </div>
                    </button>
                  )}
                  {!stats.pendingSubs && !stats.pendingVets && (
                    <div
                      style={{
                        padding: "18px 0",
                        color: "var(--color-muted)",
                        fontSize: "14px",
                      }}
                    >
                      All caught up — nothing needs review right now.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── STATS (legacy grid, kept for reference below dashboard) ── */}
            {tab === "__never__" && (
              <div className="stat-grid">
                {[
                  {
                    label: "Active Vets",
                    value: stats.activeVets,
                    color: "var(--color-success-text)",
                  },
                  {
                    label: "Pending Vets",
                    value: stats.pendingVets,
                    color: stats.pendingVets > 0 ? "var(--color-warning-text)" : "var(--color-ink)",
                  },
                  {
                    label: "Pending Prices",
                    value: stats.pendingSubs,
                    color: stats.pendingSubs > 0 ? "var(--color-warning-text)" : "var(--color-ink)",
                  },
                  {
                    label: "Total Prices",
                    value: stats.totalPrices,
                    color: "var(--color-ink)",
                  },
                  {
                    label: "Total Users",
                    value: stats.totalUsers,
                    color: "var(--color-ink)",
                  },
                  {
                    label: "Symptom Checks",
                    value: stats.totalSymptomChecks,
                    color: "var(--color-ink)",
                  },
                ].map((s) => (
                  <div key={s.label} className="stat-card">
                    <p
                      style={{
                        margin: "0 0 2px 0",
                        fontSize: "11px",
                        color: "var(--color-muted)",
                        fontWeight: "600",
                        textTransform: "uppercase",
                      }}
                    >
                      {s.label}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "1.5rem",
                        fontWeight: "700",
                        color: s.color,
                      }}
                    >
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* ── existing tab content blocks follow, now inside adm-main ── */}
            {tab === "Submissions" && (
              <div>
                <div className="adm-view-head">
                  <h2 className="adm-view-title">Submissions</h2>
                  <button
                    className="adm-refresh"
                    onClick={fetchSubmissions}
                    disabled={subLoading}
                    aria-label="Refresh submissions"
                  >
                    <svg aria-hidden="true"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M23 4v6h-6M1 20v-6h6" />
                      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                    </svg>
                    {subLoading ? "Refreshing…" : "Refresh"}
                  </button>
                </div>
                <p className="adm-view-sub">
                  {vetGroups.length}{" "}
                  {vetGroups.length === 1 ? "clinic" : "clinics"}
                  {subFilter === "all" ? "" : ` · ${subFilter}`}
                  <br />
                  Grouped by vet
                </p>

                <div className="adm-searchbar">
                  <input aria-label="Search submissions"
                    placeholder="Search by vet, service, or submitter"
                    value={subSearch}
                    onChange={(e) => {
                      setSubSearch(e.target.value);
                      setSubPage(1);
                    }}
                  />
                  {subSearch && (
                    <button
                      type="button"
                      className="adm-search-clear"
                      aria-label="Clear search"
                      onClick={() => setSubSearch("")}
                    >
                      <X size={15} strokeWidth={2.6} />
                    </button>
                  )}
                </div>

                <div className="adm-filter-row">
                  {["all", "pending", "approved", "rejected"].map((f) => (
                    <button
                      key={f}
                      className={`adm-filter-pill ${subFilter === f ? "on" : ""}`}
                      onClick={() => {
                        setSubFilter(f);
                        setSubPage(1);
                      }}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>

                {subLoading && (
                  <p style={{ color: "var(--color-muted)", fontSize: "14px" }}>
                    Loading...
                  </p>
                )}
                {!subLoading && vetGroups.length === 0 && (
                  <div className="adm-empty">
                    <SubInboxIcon />
                    <div style={{ fontSize: "15px", fontWeight: 600 }}>
                      No {subFilter === "all" ? "" : subFilter} submissions
                    </div>
                  </div>
                )}

                {pagedVetGroups.map((vg) => (
                  <div key={vg.vetName || Math.random()} className="adm-batch">
                    <div className="adm-vet-head">
                      <div className="adm-batch-name">
                        {vg.vetName || "Unknown clinic"}
                      </div>
                    </div>

                    {vg.subGroups.map((sg) => {
                      const pendingItems = sg.items.filter(
                        (i) => i.status === "pending",
                      );
                      const single = sg.items.length === 1;

                      // Shared line renderer (service, price, tag, controls)
                      const renderLine = (item, caption) => {
                        const cls = subClassify(item);
                        const price =
                          item.price_low != null
                            ? item.price_high != null &&
                              item.price_high !== item.price_low
                              ? `$${Number(item.price_low).toLocaleString()}–$${Number(item.price_high).toLocaleString()}`
                              : `$${Number(item.price_low).toLocaleString()}`
                            : item.price_paid != null
                              ? `$${Number(item.price_paid).toLocaleString()}`
                              : "—";
                        return (
                          <div
                            key={item.id}
                            className={`adm-line${item._ai_flag ? " flag" : ""}`}
                          >
                            <div className="adm-line-top">
                              <span className="adm-line-name">
                                {item.service_name ||
                                  item.raw_label ||
                                  "Line item"}
                              </span>
                              <span className="adm-line-price">{price}</span>
                            </div>
                            {caption && (
                              <div className="adm-line-caption">{caption}</div>
                            )}
                            <div className="adm-line-bottom">
                              <span className={`adm-tag adm-tag-${cls}`}>
                                {cls.charAt(0).toUpperCase() + cls.slice(1)}
                              </span>
                              {item.status === "pending" ? (
                                <div className="adm-line-controls">
                                  {cls === "unmapped" && (
                                    <select aria-label="Match to a service"
                                      className="adm-line-select"
                                      value={subMatchSel[item.id] || ""}
                                      onChange={(e) =>
                                        setSubMatchSel((prev) => ({
                                          ...prev,
                                          [item.id]: e.target.value
                                            ? Number(e.target.value)
                                            : undefined,
                                        }))
                                      }
                                    >
                                      <option value="">
                                        Match to service…
                                      </option>
                                      {services.map((svc) => (
                                        <option key={svc.id} value={svc.id}>
                                          {svc.name}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                  {cls === "product" ? (
                                    <button
                                      className="adm-b adm-b-outline"
                                      onClick={() =>
                                        updateSubmissionStatus(
                                          item.id,
                                          "rejected",
                                        )
                                      }
                                    >
                                      Skip
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        className="adm-b adm-b-outline"
                                        onClick={() =>
                                          updateSubmissionStatus(
                                            item.id,
                                            "rejected",
                                          )
                                        }
                                      >
                                        Reject
                                      </button>
                                      <button
                                        className="adm-b adm-b-primary"
                                        disabled={
                                          cls === "unmapped" &&
                                          !subMatchSel[item.id]
                                        }
                                        onClick={() =>
                                          updateSubmissionStatus(
                                            item.id,
                                            "approved",
                                            subMatchSel[item.id],
                                          )
                                        }
                                      >
                                        Approve
                                      </button>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <span className={`badge badge-${item.status}`}>
                                  {item.status}
                                </span>
                              )}
                            </div>
                            {item._ai_flag && (
                              <div className="adm-line-note">
                                <SubWarnIcon />
                                <span>
                                  {item._ai_flag_reason ||
                                    "Flagged for review. Verify before approving."}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      };

                      const caption = (
                        <>
                          <span className="adm-cap-kind">
                            {sg.kind === "receipt" ? "Receipt" : "Manual entry"}
                          </span>
                          <br />
                          <span className="adm-cap-date">
                            {formatDate(sg.date)}
                          </span>
                          <br />
                          <span className="from">From: {sg.submitter}</span>
                          {sg.kind === "receipt" && (
                            <ReceiptViewer path={sg.items[0].receipt_url} />
                          )}
                        </>
                      );

                      // SINGLE item: one clean block, caption attached to the line,
                      // no redundant batch header / duplicate buttons.
                      if (single) {
                        return (
                          <div key={sg.key} className="adm-subgroup">
                            {renderLine(sg.items[0], caption)}
                          </div>
                        );
                      }

                      // MULTI item: sub-group header with batch actions, then lines.
                      return (
                        <div key={sg.key} className="adm-subgroup">
                          <div className="adm-subgroup-head">
                            <div className="adm-subgroup-meta">
                              <span className="adm-cap-kind">
                                {sg.kind === "receipt"
                                  ? "Receipt"
                                  : "Manual entry"}
                              </span>
                              <br />
                              <span className="adm-cap-date">
                                {formatDate(sg.date)}
                                {sg.kind === "receipt"
                                  ? ` · ${sg.items.length} items`
                                  : ` · ${sg.items.length} entries`}
                              </span>
                              <br />
                              <span className="from">From: {sg.submitter}</span>
                              {sg.kind === "receipt" && (
                                <ReceiptViewer path={sg.items[0].receipt_url} />
                              )}
                            </div>
                            <div className="adm-subgroup-right">
                              {sg.kind === "receipt" && sg.clinicVerified && (
                                <span className="adm-status-pill adm-status-verified">
                                  <SubCheckIcon />
                                  Clinic verified
                                </span>
                              )}
                              {pendingItems.length > 0 && (
                                <div className="adm-subgroup-actions">
                                  <button
                                    className="adm-b adm-b-rejectall"
                                    onClick={() =>
                                      pendingItems.forEach((i) =>
                                        updateSubmissionStatus(
                                          i.id,
                                          "rejected",
                                        ),
                                      )
                                    }
                                  >
                                    Reject all
                                  </button>
                                  <button
                                    className="adm-b adm-b-primary"
                                    onClick={() =>
                                      pendingItems.forEach((i) => {
                                        const cls = subClassify(i);
                                        if (
                                          cls === "unmapped" &&
                                          !subMatchSel[i.id]
                                        )
                                          return;
                                        if (cls === "product") return;
                                        updateSubmissionStatus(
                                          i.id,
                                          "approved",
                                          subMatchSel[i.id],
                                        );
                                      })
                                    }
                                  >
                                    Approve all
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          {sg.items.map((item) => renderLine(item, null))}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {vetGroups.length > SUB_PAGE_SIZE && (
                  <div className="adm-pager">
                    <button
                      disabled={subPageClamped <= 1}
                      onClick={() => setSubPage(subPageClamped - 1)}
                    >
                      ‹ Prev
                    </button>
                    <span>
                      Page {subPageClamped} of {subTotalPages}
                    </span>
                    <button
                      disabled={subPageClamped >= subTotalPages}
                      onClick={() => setSubPage(subPageClamped + 1)}
                    >
                      Next ›
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── PENDING VETS ── */}
            {tab === "Pending Vets" && (
              <div>
                <h2 className="adm-view-title">Pending Vets</h2>
                <p className="adm-view-sub">
                  {pendingVets.length} found by the AI agent
                  <br />
                  Review before going live
                </p>

                <div className="adm-userfilters">
                  {[
                    { key: "all", label: `All (${pendingVets.length})` },
                    {
                      key: "has_prices",
                      label: `Has prices (${pendingVets.filter((v) => pendingVetsWithPrices.has(v.id)).length})`,
                    },
                    {
                      key: "no_prices",
                      label: `No prices yet (${pendingVets.filter((v) => !pendingVetsWithPrices.has(v.id)).length})`,
                    },
                  ].map((f) => (
                    <button
                      key={f.key}
                      className={`adm-userfilter${pendingVetFilter === f.key ? " active" : ""}`}
                      onClick={() => {
                        setPendingVetFilter(f.key);
                        setPendingVetPage(1);
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="adm-searchbar">
                  <input aria-label="Search by name"
                    placeholder="Search by name"
                    value={pendingVetSearch}
                    onChange={(e) => {
                      setPendingVetSearch(e.target.value);
                      setPendingVetPage(1);
                    }}
                  />
                  {pendingVetSearch && (
                    <button
                      type="button"
                      className="adm-search-clear"
                      aria-label="Clear search"
                      onClick={() => setPendingVetSearch("")}
                    >
                      <X size={15} strokeWidth={2.6} />
                    </button>
                  )}
                </div>

                {pendingVetsLoading && pendingVets.length === 0 && (
                  <p style={{ color: "var(--color-muted)", fontSize: "14px" }}>Loading…</p>
                )}

                {(() => {
                  const shown = pendingVets.filter((v) => {
                    const matchesSearch =
                      !pendingVetSearch.trim() ||
                      v.name
                        ?.toLowerCase()
                        .includes(pendingVetSearch.toLowerCase());
                    const hasPrices = pendingVetsWithPrices.has(v.id);
                    const matchesFilter =
                      pendingVetFilter === "all" ||
                      (pendingVetFilter === "has_prices" && hasPrices) ||
                      (pendingVetFilter === "no_prices" && !hasPrices);
                    return matchesSearch && matchesFilter;
                  });

                  if (!pendingVetsLoading && shown.length === 0) {
                    return (
                      <div className="adm-empty">
                        <SubInboxIcon />
                        <p>No pending vets.</p>
                      </div>
                    );
                  }

                  const PV_PAGE = 20;
                  const totalPages = Math.max(
                    1,
                    Math.ceil(shown.length / PV_PAGE),
                  );
                  const pageSafe = Math.min(pendingVetPage, totalPages);
                  const paged = shown.slice(
                    (pageSafe - 1) * PV_PAGE,
                    pageSafe * PV_PAGE,
                  );

                  return (
                    <>
                      <div className="adm-user-list">
                        {paged.map((vet) => {
                          const hasPrices = pendingVetsWithPrices.has(vet.id);
                          const city =
                            vet.city && vet.city.length > 2
                              ? vet.city
                              : vet.neighborhood && vet.neighborhood.length > 2
                                ? vet.neighborhood
                                : null;
                          const loc = [city, vet.state, vet.zip_code]
                            .filter(Boolean)
                            .join(", ");
                          const editing = editingPendingVet === vet.id;
                          return (
                            <div key={vet.id} className="adm-user-card">
                              <div className="adm-user-main">
                                <div className="adm-user-id">
                                  {vet.source && (
                                    <span className="adm-pv-source">
                                      via {vet.source}
                                    </span>
                                  )}
                                  <span className="adm-user-name">
                                    {vet.name}
                                  </span>
                                </div>
                                <div className="adm-user-badges">
                                  <span
                                    className={`adm-ustatus adm-ustatus-${hasPrices ? "active" : "banned"}`}
                                  >
                                    {hasPrices ? "Has prices" : "No prices yet"}
                                  </span>
                                </div>
                              </div>

                              <div className="adm-pv-details">
                                {vet.address && <p>{vet.address}</p>}
                                {loc && <p>{loc}</p>}
                                {vet.phone && <p>{vet.phone}</p>}
                                {vet.website && (
                                  <p className="adm-pv-web">
                                    {cleanWebsiteUrl(vet.website)}
                                  </p>
                                )}
                                <p className="adm-pv-found">
                                  Found: {formatDate(vet.created_at)}
                                </p>
                              </div>

                              <div className="adm-user-actions adm-pv-actions">
                                <button
                                  className="adm-b adm-b-outline"
                                  onClick={() => {
                                    if (editing) {
                                      setEditingPendingVet(null);
                                    } else {
                                      closeAllEditors();
                                      setShowAllNotes(false);
                                      setEditingPendingVet(vet.id);
                                      setPendingVetForm({ ...vet });
                                      snapshotEditor({ ...vet });
                                    }
                                  }}
                                >
                                  {editing ? "Cancel" : "Edit"}
                                </button>
                                <button
                                  className="adm-b adm-b-danger"
                                  onClick={() => rejectPendingVet(vet.id)}
                                >
                                  Reject
                                </button>
                                <button
                                  className="adm-b adm-b-primary"
                                  onClick={() => approvePendingVet(vet)}
                                >
                                  Approve
                                </button>
                              </div>

                              {editing && (
                                <PendingVetEditForm
                                  form={pendingVetForm}
                                  setForm={setPendingVetForm}
                                  onApprove={() => approvePendingVet(vet)}
                                  onCancel={() => setEditingPendingVet(null)}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {totalPages > 1 && (
                        <div className="adm-pager">
                          <button
                            className="adm-pager-btn"
                            disabled={pageSafe <= 1}
                            onClick={() =>
                              setPendingVetPage(Math.max(1, pageSafe - 1))
                            }
                          >
                            <svg aria-hidden="true"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M15 18l-6-6 6-6" />
                            </svg>
                            Previous
                          </button>
                          <span className="adm-pager-info">
                            Page {pageSafe} of {totalPages}
                          </span>
                          <button
                            className="adm-pager-btn"
                            disabled={pageSafe >= totalPages}
                            onClick={() =>
                              setPendingVetPage(
                                Math.min(totalPages, pageSafe + 1),
                              )
                            }
                          >
                            Next
                            <svg aria-hidden="true"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M9 18l6-6-6-6" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* ── PRICE CONFLICTS ── */}
            {tab === "Price Reports" && (
              <div>
                <div className="adm-reports-head">
                  <p className="adm-price-count">
                    {reportsLoading
                      ? "Loading…"
                      : `${reports.length} report${reports.length === 1 ? "" : "s"}`}
                  </p>
                  <div className="adm-reports-filters">
                    {["pending", "resolved", "dismissed", "all"].map((f) => (
                      <button
                        key={f}
                        type="button"
                        className={`adm-reports-filter${reportsFilter === f ? " active" : ""}`}
                        onClick={() => setReportsFilter(f)}
                      >
                        {f[0].toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                {!reportsLoading && reports.length === 0 && (
                  <p className="adm-conflict-svc">
                    Nothing here. Reports appear when someone tells us a price
                    is wrong.
                  </p>
                )}
                <div className="adm-conflict-list">
                  {reports.map((r) => {
                    const cur = r.vet_prices;
                    const fmt = (lo, hi, type, cfq) =>
                      cfq
                        ? "Call for quote"
                        : lo == null
                          ? "—"
                          : hi
                            ? `$${lo}–$${hi}`
                            : type === "starting"
                              ? `$${lo}+`
                              : `$${lo}`;
                    const problem =
                      {
                        too_high: "Price is too high",
                        too_low: "Price is too low",
                        not_offered: "Clinic doesn't offer this service",
                        wrong_service: "Wrong service label",
                        other: "Something else",
                      }[r.reason_category] || r.reason_category;
                    const suggested =
                      r.suggested_price_low != null
                        ? fmt(
                            r.suggested_price_low,
                            r.suggested_price_high,
                            null,
                            false,
                          )
                        : null;
                    const listed = cur
                      ? fmt(
                          cur.price_low,
                          cur.price_high,
                          cur.price_type,
                          cur.call_for_quote,
                        )
                      : "No longer on the site";
                    const canRemove =
                      !!r.vet_price_id && cur && cur.source !== "sheet";
                    return (
                      <div key={r.id} className="adm-conflict-card">
                        <div className="adm-conflict-head">
                          <p className="adm-conflict-vet">
                            {r.vets?.name || "Unknown vet"}
                          </p>
                          <p className="adm-conflict-svc">
                            {r.services?.name || "Unknown service"}
                          </p>
                          <p
                            className={`adm-report-problem${r.reason_category === "not_offered" || r.reason_category === "wrong_service" ? " is-warn" : ""}`}
                          >
                            {problem}
                          </p>
                        </div>
                        <div className="adm-conflict-options">
                          <div className="adm-conflict-opt adm-opt-centred">
                            <span className="adm-conflict-src">Listed now</span>
                            <span className="adm-conflict-price">{listed}</span>
                          </div>
                          <div className="adm-conflict-opt adm-opt-centred">
                            <span className="adm-conflict-src adm-src-community">
                              Reported as
                            </span>
                            {suggested ? (
                              <span className="adm-conflict-price adm-report-new">
                                {suggested}
                              </span>
                            ) : (
                              // No number was given, because the claim isn't
                              // about the number. Say which claim it is rather
                              // than leaving the column empty.
                              <span className="adm-report-noprice">
                                {r.reason_category === "not_offered"
                                  ? "Not offered here"
                                  : r.reason_category === "wrong_service"
                                    ? "Wrong service"
                                    : "No price given"}
                              </span>
                            )}
                          </div>
                        </div>
                        {r.reason_text && (
                          <p className="adm-report-reason">{r.reason_text}</p>
                        )}
                        <div className="adm-report-foot">
                          <p className="adm-report-meta">
                            <span className="adm-report-meta-label">
                              Reported by:
                            </span>
                            <span className="adm-report-who">
                              {r.contact_email
                                ? r.contact_email
                                : r.reporter_id
                                  ? "a signed-in user"
                                  : "someone not signed in"}
                            </span>
                            <span className="adm-report-date">
                              {formatDate(r.created_at)}
                            </span>
                          </p>
                          <span className="adm-report-links">
                            {r.vets?.slug && (
                              <a
                                className="adm-report-link"
                                href={`/vet/${r.vets.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                View page
                              </a>
                            )}
                            <button
                              className="adm-report-link"
                              onClick={() => openReportInPrices(r)}
                            >
                              Open in Prices
                            </button>
                          </span>
                        </div>
                        <div className="adm-report-actions">
                          {canRemove && (
                            <button
                              className="adm-b adm-b-outline"
                              onClick={() => removeReportedPrice(r)}
                            >
                              Remove price
                            </button>
                          )}
                          {r.status !== "dismissed" && (
                            <button
                              className="adm-b adm-b-outline"
                              onClick={() => setReportStatus(r.id, "dismissed")}
                            >
                              Dismiss
                            </button>
                          )}
                          {r.status !== "resolved" && (
                            <button
                              className="adm-b adm-b-primary"
                              onClick={() => setReportStatus(r.id, "resolved")}
                            >
                              Mark fixed
                            </button>
                          )}
                        </div>
                        {!canRemove && r.vet_price_id && (
                          <p className="adm-report-sheetnote">
                            This price comes from the call sheet — remove it by
                            putting N/A in that cell, not here.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {tab === "Price Conflicts" && (
              <div>
                <h2 className="adm-view-title">Price Conflicts</h2>
                <p className="adm-view-sub">
                  These vets have more than one price on file for the same
                  service — usually a sheet price alongside a manually-entered
                  one. Pick the correct price for each, or keep both if they're
                  both valid.
                </p>

                {conflictLoading && (
                  <p className="adm-price-count">Loading conflicts…</p>
                )}

                {!conflictLoading && conflictGroups.length === 0 && (
                  <div className="adm-empty">
                    <SubInboxIcon />
                    <p>No price conflicts to review. All clear.</p>
                  </div>
                )}

                {!conflictLoading && conflictGroups.length > 0 && (
                  <>
                    <p className="adm-price-count" style={{ marginBottom: 14 }}>
                      {conflictGroups.length} conflict
                      {conflictGroups.length !== 1 ? "s" : ""} to review
                    </p>
                    <div className="adm-conflict-list">
                      {conflictGroups.map((group) => (
                        <div key={group.key} className="adm-conflict-card">
                          <div className="adm-conflict-head">
                            <p className="adm-conflict-vet">{group.vetName}</p>
                            <p className="adm-conflict-svc">
                              {group.serviceName}
                            </p>
                          </div>
                          <div className="adm-conflict-options">
                            {group.rows.map((row) => (
                              <div key={row.id} className="adm-conflict-opt">
                                <div className="adm-conflict-opt-main">
                                  {/* Source above the price, matching Price
                                      Reports. Side by side, the labels line up
                                      so the numbers sit level. */}
                                  <span
                                    className={`adm-conflict-src adm-src-${row.source}`}
                                  >
                                    {row.source}
                                    {row.region ? ` · ${row.region}` : ""}
                                  </span>
                                  <span className="adm-conflict-price">
                                    {row.call_for_quote
                                      ? "Call for quote"
                                      : row.price_low == null
                                        ? "No price set"
                                        : formatPrice(
                                            row.price_low,
                                            row.price_high,
                                            row.price_type,
                                          )}
                                  </span>
                                </div>
                                <div className="adm-conflict-opt-meta">
                                  {row.is_verified && (
                                    <span className="adm-conflict-verified">
                                      Verified:
                                    </span>
                                  )}
                                  <span className="adm-conflict-date">
                                    {formatDate(row.created_at)}
                                  </span>
                                </div>
                                <button
                                  className="adm-b adm-b-primary adm-conflict-pick"
                                  onClick={() =>
                                    resolveConflictKeep(group, row.id)
                                  }
                                  disabled={conflictResolving === group.key}
                                >
                                  {conflictResolving === group.key
                                    ? "Saving…"
                                    : "Keep this one"}
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="adm-conflict-foot">
                            <button
                              className="adm-b adm-b-outline adm-conflict-keepboth"
                              onClick={() => resolveConflictKeepBoth(group)}
                              disabled={conflictResolving === group.key}
                            >
                              Both are valid — keep both
                            </button>
                          </div>
                          {group.vetSlug && (
                            <div className="adm-conflict-viewrow">
                              <a
                                className="adm-report-link"
                                href={`/vet/${group.vetSlug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                View page
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── VETS ── */}
            {tab === "Vets" && (
              <div>
                <div>
                  <h2 className="adm-view-title">Vets</h2>
                  <p className="adm-view-sub">
                    {vets.length} vet {vets.length === 1 ? "record" : "records"}
                    <br />
                    Live directory
                  </p>
                </div>

                <div className="adm-userfilters">
                  {[
                    { k: "all", label: "All" },
                    { k: "active", label: "Active" },
                    { k: "inactive", label: "Inactive" },
                  ].map((f) => (
                    <button
                      key={f.k}
                      className={`adm-userfilter${vetStatusFilter === f.k ? " active" : ""}`}
                      onClick={() => {
                        setVetStatusFilter(f.k);
                        setVetPage(1);
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="adm-searchbar">
                  <input aria-label="Search vets by name or neighborhood"
                    placeholder="Search by name or neighborhood"
                    value={vetSearch}
                    onChange={(e) => {
                      setVetSearch(e.target.value);
                      setVetPage(1);
                    }}
                  />
                  {vetSearch && (
                    <button
                      type="button"
                      className="adm-search-clear"
                      aria-label="Clear search"
                      onClick={() => setVetSearch("")}
                    >
                      <X size={15} strokeWidth={2.6} />
                    </button>
                  )}
                </div>

                {!showAddVet && (
                  <div className="adm-vet-addrow">
                    <button
                      className="adm-addbtn adm-vet-addbtn"
                      onClick={() => {
                        closeAllEditors();
                        setEditingVet(null);
                        setShowAddVet(true);
                        snapshotEditor(addVetForm);
                        setAddVetVerifyChecks({
                          address: false,
                          phone: false,
                          website: false,
                          hours: false,
                          neighborhood: false,
                          ownership: false,
                        });
                      }}
                    >
                      + Add vet
                    </button>
                  </div>
                )}

                {showAddVet && (
                  <VetForm
                    form={addVetForm}
                    setForm={setAddVetForm}
                    onSave={addVet}
                    onCancel={() => setShowAddVet(false)}
                    saving={vetSaving}
                    submitLabel="Add vet"
                    verifyChecks={addVetVerifyChecks}
                    setVerifyChecks={setAddVetVerifyChecks}
                  />
                )}

                {vetsLoading && vets.length === 0 && (
                  <p style={{ color: "var(--color-muted)", fontSize: "14px" }}>Loading…</p>
                )}

                {(() => {
                  if (!vetsLoading && filteredVets.length === 0) {
                    return (
                      <div className="adm-empty">
                        <SubInboxIcon />
                        <p className="no-vets">No vets found.</p>
                      </div>
                    );
                  }
                  const V_PAGE = 20;
                  const totalPages = Math.max(
                    1,
                    Math.ceil(filteredVets.length / V_PAGE),
                  );
                  const pageSafe = Math.min(vetPage, totalPages);
                  const paged = filteredVets.slice(
                    (pageSafe - 1) * V_PAGE,
                    pageSafe * V_PAGE,
                  );
                  return (
                    <>
                      <div className="adm-user-list">
                        {paged.map((vet) => {
                          const editing = editingVet === vet.id;
                          const declined =
                            vet.internal_notes === "declined_to_share";
                          return (
                            <div
                              key={vet.id}
                              data-vet-card={vet.id}
                              className="adm-user-card"
                            >
                              <div className="adm-user-main">
                                <div className="adm-user-id">
                                  <span className="adm-user-name">
                                    {vet.name}
                                  </span>
                                  {vet.neighborhood && (
                                    <span className="adm-user-email">
                                      {vet.neighborhood}
                                    </span>
                                  )}
                                  {vet.phone && (
                                    <a
                                      href={`tel:${vet.phone}`}
                                      className="adm-vet-phone"
                                    >
                                      {formatPhone(vet.phone)}
                                    </a>
                                  )}
                                </div>
                                <div className="adm-user-badges">
                                  {declined && (
                                    <span className="adm-vet-declined">
                                      Declined
                                    </span>
                                  )}
                                  {vet.status !== "active" &&
                                    !vet.last_verified && (
                                      <span className="adm-vet-unverified">
                                        <svg aria-hidden="true"
                                          width="12"
                                          height="12"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2.4"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          style={{ marginRight: "4px" }}
                                        >
                                          <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                        </svg>
                                        Needs verification
                                      </span>
                                    )}
                                  <span
                                    className={`adm-ustatus adm-ustatus-${vet.status === "active" ? "active" : "banned"}`}
                                  >
                                    {vet.status === "active"
                                      ? "Active"
                                      : "Inactive"}
                                  </span>
                                </div>
                              </div>

                              <div className="adm-user-actions adm-pv-actions">
                                <button
                                  className="adm-b adm-b-outline"
                                  onClick={() =>
                                    editing
                                      ? setEditingVet(null)
                                      : startEditVet(vet)
                                  }
                                >
                                  {editing ? "Cancel" : "Edit"}
                                </button>
                                {vet.status === "active" ? (
                                  <button
                                    className="adm-b adm-b-outline"
                                    onClick={() => toggleVetStatus(vet)}
                                  >
                                    Deactivate
                                  </button>
                                ) : (
                                  <button
                                    className="adm-b adm-b-primary"
                                    onClick={() =>
                                      startEditVet(vet, { status: "active" })
                                    }
                                  >
                                    Activate
                                  </button>
                                )}
                              </div>

                              {editing && (
                                <VetForm
                                  form={vetForm}
                                  setForm={setVetForm}
                                  onSave={saveVet}
                                  onCancel={() => setEditingVet(null)}
                                  saving={vetSaving}
                                  submitLabel="Save changes"
                                  verifyChecks={vetVerifyChecks}
                                  setVerifyChecks={setVetVerifyChecks}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {totalPages > 1 && (
                        <div className="adm-pager">
                          <button
                            className="adm-pager-btn"
                            disabled={pageSafe <= 1}
                            onClick={() =>
                              setVetPage(Math.max(1, pageSafe - 1))
                            }
                          >
                            <svg aria-hidden="true"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M15 18l-6-6 6-6" />
                            </svg>
                            Previous
                          </button>
                          <span className="adm-pager-info">
                            Page {pageSafe} of {totalPages}
                          </span>
                          <button
                            className="adm-pager-btn"
                            disabled={pageSafe >= totalPages}
                            onClick={() =>
                              setVetPage(Math.min(totalPages, pageSafe + 1))
                            }
                          >
                            Next
                            <svg aria-hidden="true"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M9 18l6-6-6-6" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* ── PRICES ── */}
            {tab === "Prices" && (
              <div>
                <h2 className="adm-view-title">Prices</h2>
                <p className="adm-view-sub">
                  Select a vet to view and manage their prices
                </p>

                <div className="adm-price-vetsearch">
                  <label className="adm-field-label">Search vet</label>
                  <div className="adm-price-search-wrap">
                    <div style={{ position: "relative" }}>
                      <input aria-label="Search vet"
                        ref={priceSearchRef}
                        className="adm-field-input"
                        value={vetPriceSearch}
                        onChange={handlePriceSearchChange}
                        onFocus={() => setShowVetDropdown(true)}
                        onBlur={() => {
                          setTimeout(() => setShowVetDropdown(false), 150);
                        }}
                        placeholder="Click to browse or type to filter…"
                        autoComplete="off"
                      />
                      {vetPriceSearch && (
                        <button
                          type="button"
                          className="adm-price-search-clear"
                          onClick={() => {
                            setVetPriceSearch("");
                            setSelectedVetId("");
                            setVetPrices([]);
                            setShowVetDropdown(false);
                            setEditingPrice(null);
                            setEditingNote(null);
                            setNoteDraft("");
                            setHandBackConfirm(null);
                            setShowAddPrice(false);
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {showVetDropdown && (
                      <div className="adm-price-dropdown">
                        {filteredPriceVets.length === 0 && (
                          <div className="adm-price-dropdown-empty">
                            No vets found
                          </div>
                        )}
                        {filteredPriceVets.slice(0, 50).map((v) => (
                          <div
                            key={v.id}
                            className={`adm-price-dropdown-item${selectedVetId === v.id ? " selected" : ""}`}
                            onMouseDown={() => selectPriceVet(v)}
                          >
                            {v.name}
                            {v.city && (
                              <span className="adm-price-dropdown-city">
                                {" "}
                                — {v.city}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedVetId && (
                    <p className="adm-price-showing">
                      Showing prices for <strong>{vetPriceSearch}</strong>
                    </p>
                  )}
                </div>

                {!selectedVetId && (
                  <div className="adm-empty">
                    <SubInboxIcon />
                    <p>Search and select a vet above to view their prices.</p>
                  </div>
                )}

                {selectedVetId && (
                  <>
                    {/* Said once per vet instead of on every row. Repeating
                        the explanation beside fifteen prices made it noise;
                        here it's read once, and only by someone looking at a
                        vet that actually has sheet prices. */}
                    {!pricesLoading &&
                      vetPrices.some((p) => p.source === "sheet") && (
                        <p className="adm-price-sheet-note">
                          {/* Three sentences, one per button, each saying what
                              the button does to the price. The previous version
                              explained the reasoning in one long sentence, and
                              the reasoning is not what someone standing at this
                              screen needs. */}
                          <span>
                            <strong>Edit</strong> &mdash; changes the price and
                            keeps it. The pill becomes{" "}
                            <strong>Set in Admin</strong>, and the call sheet
                            stops updating that service for this clinic.
                          </span>
                          <span>
                            <strong>Add note</strong> &mdash; saves the note
                            only. The call sheet keeps updating the price.
                          </span>
                          <span>
                            <strong>Hand back to call sheet</strong> &mdash;
                            undoes an Edit. The sheet&rsquo;s price comes back
                            on the next sync.
                          </span>
                        </p>
                      )}
                    <div className="adm-price-head">
                      <p className="adm-price-count">
                        {pricesLoading
                          ? "Loading prices…"
                          : `${vetPrices.length} price${vetPrices.length !== 1 ? "s" : ""} on file`}
                      </p>
                      {!showAddPrice && (
                        <button
                          className="adm-addbtn adm-vet-addbtn"
                          onClick={() => {
                            closeAllEditors();
                            setEditingPrice(null);
                            setShowAddPrice(true);
                            const initialAddPrice = {
                              service_id: "",
                              price_low: "",
                              price_high: "",
                              price_type: "",
                              includes_bloodwork: false,
                              includes_xrays: false,
                              includes_anesthesia: false,
                              species: "",
                              species_other: "",
                              call_for_quote: false,
                              notes: "",
                              vaccines_included: "",
                            };
                            setAddPriceForm(initialAddPrice);
                            snapshotEditor(initialAddPrice);
                            setAddPriceError(false);
                          }}
                        >
                          + Add price
                        </button>
                      )}
                    </div>

                    {showAddPrice && (
                      <div className="adm-price-addform">
                        <PriceForm
                          form={addPriceForm}
                          setForm={setAddPriceForm}
                          services={services}
                          onSave={addPrice}
                          onCancel={() => {
                            setShowAddPrice(false);
                            setAddPriceError(false);
                          }}
                          saving={false}
                          submitLabel="Add price"
                          error={addPriceError}
                        />
                      </div>
                    )}

                    {pricesLoading && vetPrices.length === 0 && (
                      <p style={{ color: "var(--color-muted)", fontSize: "14px" }}>
                        Loading prices…
                      </p>
                    )}

                    {!pricesLoading && vetPrices.length === 0 && (
                      <div className="adm-empty">
                        <SubInboxIcon />
                        <p>No prices on file for this vet.</p>
                      </div>
                    )}

                    <div className="adm-user-list">
                      {vetPrices.map((p) => {
                        const editing = editingPrice === p.id;
                        const noteEditing = editingNote === p.id;
                        const isDeleting = deletePriceConfirm === p.id;
                        return (
                          <div key={p.id} className="adm-user-card">
                            <div className="adm-user-main">
                              <div className="adm-user-id">
                                <span className="adm-user-name">
                                  {p.services?.name || "—"}
                                </span>
                                <span className="adm-price-value">
                                  {p.call_for_quote
                                    ? "Call for quote"
                                    : p.price_low
                                      ? formatPrice(
                                          p.price_low,
                                          p.price_high,
                                          p.price_type,
                                        )
                                      : "No price set"}
                                  {!p.call_for_quote && p.price_low && (
                                    <span className="adm-price-type">
                                      {" "}
                                      ({p.price_type})
                                    </span>
                                  )}
                                  {/* Provenance reads best attached to the
                                      thing it describes — this says where
                                      *this number* came from, so it belongs on
                                      the same line as the number. It was a
                                      pill in the button row first, where it
                                      looked like a disabled button and made
                                      the Edit button seem missing rather than
                                      deliberately replaced; then a pill in the
                                      badge row, which put it at the opposite
                                      corner of the card from the price. As
                                      quiet text here it needs no shape of its
                                      own, and the badge row goes back to
                                      holding only species. */}
                                  {p.source === "sheet" && (
                                    <span className="adm-sheet-owned">
                                      From call sheet
                                    </span>
                                  )}
                                  {/* An overridden price says so in the same
                                      slot, in terracotta rather than the
                                      neutral grey — it's the one state on this
                                      card where the number came from a person
                                      deciding rather than from an import. */}
                                  {p.source === "admin" && (
                                    <span className="adm-sheet-owned adm-price-overridden">
                                      Set in Admin
                                    </span>
                                  )}
                                </span>
                                {/* What the sheet holds for this service while
                                    the override is in force. The sync rewrites
                                    it every run, so this stays true as the
                                    sheet changes — the point being that an
                                    override you can't audit is worse than no
                                    override at all. Hidden when the sheet
                                    agrees, since there's nothing to compare. */}
                                {p.source === "admin" && p.sheet_value && (
                                  <span className="adm-sheet-says">
                                    The call sheet says {p.sheet_value}
                                  </span>
                                )}
                              </div>
                              <div className="adm-user-badges">
                                {p.species && (
                                  <span className="adm-price-species">
                                    {p.species}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* call_for_quote no longer belongs in either
                                condition. It used to render a pill here; with
                                that gone, a call-for-quote price with no note
                                still opened this block and an empty tags row,
                                leaving two dividers with nothing between
                                them. */}
                            {(p.includes_bloodwork ||
                              p.includes_xrays ||
                              p.includes_anesthesia ||
                              hasText(p.notes)) && (
                              <div className="adm-price-details">
                                {(p.includes_bloodwork ||
                                  p.includes_xrays ||
                                  p.includes_anesthesia) && (
                                  <div className="adm-price-tags">
                                    {p.includes_bloodwork && (
                                      <span className="adm-price-tag">
                                        + Bloodwork
                                      </span>
                                    )}
                                    {p.includes_xrays && (
                                      <span className="adm-price-tag">
                                        + X-rays
                                      </span>
                                    )}
                                    {p.includes_anesthesia && (
                                      <span className="adm-price-tag">
                                        + Anesthesia
                                      </span>
                                    )}
                                    {/* No "Call for quote" pill here. The
                                        price value above already says it, and
                                        this row is for what's included in a
                                        price — bloodwork, x-rays, anesthesia —
                                        not for the price itself. */}
                                  </div>
                                )}
                                {hasText(p.notes) && (
                                  <div
                                    className="adm-price-note"
                                    dangerouslySetInnerHTML={{
                                      __html: p.notes,
                                    }}
                                  />
                                )}
                              </div>
                            )}

                            <div className="adm-user-actions adm-pv-actions adm-price-actions">
                              {/* Edit is available on every price, whatever its
                                  source. It used to be hidden on call-sheet
                                  prices because the sync reconciles them by
                                  value: an edit from $95 to $100 looked like a
                                  sheet row the sheet no longer contained, so
                                  the next run deleted it and put $95 back.
                                  Hiding the button stopped the silent reversal
                                  but took away the ability to correct a price,
                                  which was the wrong trade. The sync now skips
                                  any vet+service holding an 'admin' row, so
                                  saving here takes the price over and it
                                  stands. */}
                              <button
                                className="adm-b adm-b-outline"
                                onClick={() => {
                                  if (editing) {
                                    setEditingPrice(null);
                                  } else {
                                    setShowAddPrice(false);
                                    // One editor at a time — the note panel
                                    // and the full price form both edit the
                                    // same field, so two open at once is two
                                    // drafts of it.
                                    setEditingNote(null);
                                    setNoteDraft("");
                                    setHandBackConfirm(null);
                                    setEditingPrice(p.id);
                                    setPriceForm({
                                      service_id: p.service_id,
                                      price_low: p.price_low ?? "",
                                      price_high: p.price_high ?? "",
                                      price_type: p.price_type || "",
                                      includes_bloodwork: p.includes_bloodwork,
                                      includes_xrays: p.includes_xrays,
                                      includes_anesthesia:
                                        p.includes_anesthesia,
                                      species: p.species || "",
                                      species_other: "",
                                      call_for_quote: p.call_for_quote,
                                      notes: p.notes || "",
                                      vaccines_included:
                                        p.vaccines_included || "",
                                    });
                                    setEditPriceError(false);
                                  }
                                }}
                              >
                                {editing ? "Cancel" : "Edit"}
                              </button>

                              {/* Note-only, and only on call-sheet prices —
                                  this is the one path that does NOT take the
                                  price over. The sheet stopped carrying price
                                  notes when column AL was retired, so nothing
                                  can overwrite a note written here, and the
                                  price keeps syncing as normal. Without this
                                  shortcut, adding a note would mean opening
                                  the full form, and saving that would freeze
                                  the number against the sheet as a side
                                  effect of writing a sentence. */}
                              {p.source === "sheet" && (
                                <button
                                  className="adm-b adm-b-outline"
                                  onClick={() => {
                                    if (noteEditing) {
                                      setEditingNote(null);
                                      setNoteDraft("");
                                      setHandBackConfirm(null);
                                    } else {
                                      setShowAddPrice(false);
                                      setEditingPrice(null);
                                      setEditingNote(p.id);
                                      setNoteDraft(p.notes || "");
                                    }
                                  }}
                                >
                                  {noteEditing
                                    ? "Cancel"
                                    : hasText(p.notes)
                                      ? "Edit note"
                                      : "Add note"}
                                </button>
                              )}

                              {/* The way out of an override. The confirm is a
                                  block of its own below this row rather than a
                                  member of it — a sentence of explanation
                                  inside a flex row of 42px buttons stretched
                                  the row and left the question nowhere near the
                                  button it belonged to. */}
                              {p.source === "admin" &&
                                (handBackConfirm === p.id ? null : (
                                  <button
                                    className="adm-b adm-b-outline"
                                    onClick={() => setHandBackConfirm(p.id)}
                                  >
                                    Hand back to call sheet
                                  </button>
                                ))}
                              {isDeleting ? (
                                <div className="adm-team-confirm">
                                  <span className="adm-team-confirm-q">
                                    Delete this price?
                                  </span>
                                  <div className="adm-team-confirm-btns">
                                    <button
                                      className="adm-b adm-b-outline"
                                      onClick={() =>
                                        setDeletePriceConfirm(null)
                                      }
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      className="adm-b adm-b-danger"
                                      onClick={() => deletePrice(p.id)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  className="adm-b adm-b-danger"
                                  onClick={() => setDeletePriceConfirm(p.id)}
                                >
                                  Delete
                                </button>
                              )}
                            </div>

                            {/* Full width, under the buttons, so the question
                                and its two answers sit together at any width
                                instead of fighting the button row for space.
                                Below rather than above on mobile too: it reads
                                as the consequence of the button you just
                                pressed, which was directly above it. */}
                            {p.source === "admin" &&
                              handBackConfirm === p.id && (
                                <div className="adm-handback">
                                  <p className="adm-handback-q">
                                    Hand this price back to the call sheet?
                                  </p>
                                  <p className="adm-handback-body">
                                    Your price stays until the next sync, then
                                    the call sheet&rsquo;s value replaces it.
                                    Any note you&rsquo;ve written is kept.
                                  </p>
                                  <div className="adm-handback-actions">
                                    <button
                                      className="adm-b adm-b-outline"
                                      onClick={() => setHandBackConfirm(null)}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      className="adm-b adm-b-navy"
                                      disabled={handBackSaving === p.id}
                                      onClick={() => handBackToSheet(p.id)}
                                    >
                                      {handBackSaving === p.id
                                        ? "Saving…"
                                        : "Hand back"}
                                    </button>
                                  </div>
                                </div>
                              )}

                            {/* Said before the save, not after it. Taking a
                                price over from the sheet is a real change of
                                ownership — Susan's cell stops affecting this
                                service for this clinic — and discovering that
                                from a changed label afterwards is too late to
                                decide against it. Only on sheet prices: for
                                one Admin already owns, saving changes nothing
                                about where it comes from. */}
                            {editing && p.source === "sheet" && (
                              <p className="adm-takeover-note">
                                Saving this takes the price over from the call
                                sheet. The sheet will stop updating{" "}
                                {p.services?.name || "this service"} for this
                                clinic until you hand it back. A note on its own
                                doesn&rsquo;t do that &mdash; use{" "}
                                <strong>
                                  {hasText(p.notes) ? "Edit note" : "Add note"}
                                </strong>{" "}
                                for that.
                              </p>
                            )}

                            {editing && (
                              <PriceForm
                                form={priceForm}
                                setForm={setPriceForm}
                                services={services}
                                onSave={() => savePrice(priceForm)}
                                onCancel={() => setEditingPrice(null)}
                                saving={priceSaving}
                                submitLabel="Save changes"
                                error={editPriceError}
                              />
                            )}

                            {/* One field, so it gets one field's worth of
                                chrome rather than the whole price form with
                                everything in it disabled. Same editor and the
                                same wording as the Public note field inside
                                PriceForm, so a note written here and a note
                                written there are plainly the same thing. */}
                            {noteEditing && (
                              <div className="adm-notepanel">
                                <label className="adm-field-label">
                                  Public note
                                </label>
                                <p className="adm-notepanel-hint">
                                  Shown to visitors beneath this price (e.g.
                                  &ldquo;Exam fee waived on first visit&rdquo;).
                                  Saved here, not in the call sheet — a later
                                  sync won&rsquo;t clear it.
                                </p>
                                <RichTextEditor
                                  value={noteDraft}
                                  onChange={setNoteDraft}
                                  placeholder="Optional"
                                />
                                <div className="adm-notepanel-actions">
                                  <button
                                    className="adm-b adm-b-outline"
                                    onClick={() => {
                                      setEditingNote(null);
                                      setNoteDraft("");
                                      setHandBackConfirm(null);
                                    }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    className="adm-b adm-b-primary"
                                    onClick={() => savePriceNote(p.id)}
                                    disabled={noteSaving}
                                  >
                                    {noteSaving ? "Saving…" : "Save note"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── CALL SHEET ── */}
            {tab === "Call Sheet" &&
              (() => {
                const activeQueue = showAllVets ? fullCallQueue : callQueue;
                return (
                  <div>
                    {/* ── Google Sheets Sync ── */}
                    <h2 className="adm-view-title">Call Sheet</h2>
                    <p className="adm-view-sub">
                      Sync completed calls from the VA sheets, then work the
                      queue below.
                    </p>

                    <div className="adm-sync">
                      <div className="adm-sync-top">
                        <div className="adm-sync-intro">
                          <p className="adm-sync-title">
                            Sync from VA Google Sheets
                          </p>
                          <p className="adm-sync-desc">
                            Pulls rows marked{" "}
                            <strong>Called - Got Prices</strong> from the NorCal
                            &amp; SoCal sheets and adds their prices.
                          </p>
                        </div>
                        <div className="adm-sync-actions">
                          <button
                            className="adm-b adm-b-outline"
                            onClick={() => syncFromSheets(true)}
                            disabled={syncLoading}
                          >
                            {syncLoading ? "Working…" : "Preview"}
                          </button>
                          <button
                            className="adm-b adm-b-primary"
                            onClick={() => syncFromSheets(false)}
                            disabled={syncLoading || SYNC_WRITE_DISABLED}
                            title={
                              SYNC_WRITE_DISABLED
                                ? "Live sync is temporarily paused while the new source-aware sync is being finished. Preview still works."
                                : undefined
                            }
                          >
                            {syncLoading ? "Syncing…" : "Sync now"}
                          </button>
                        </div>
                      </div>

                      {SYNC_WRITE_DISABLED && (
                        <p className="adm-sync-paused">
                          <span>
                            Sync now is paused while the upgraded source-aware
                            sync is being finished.
                          </span>
                          <span>
                            Preview still works and is safe to run anytime.
                          </span>
                        </p>
                      )}

                      <button
                        type="button"
                        className="adm-sync-guide-toggle"
                        onClick={() => setShowSyncGuide((s) => !s)}
                      >
                        {/* Chevron after the label, not before it — it points
                            at what it opens rather than sitting out front. */}
                        How to format the Google Sheet
                        <svg aria-hidden="true"
                          className={`adm-sync-chev${showSyncGuide ? " open" : ""}`}
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                      <div
                        className={`adm-sync-guide-wrap${showSyncGuide ? " open" : ""}`}
                      >
                        <div className="adm-sync-guide">
                          <div className="adm-sync-guide-inner">
                            <p className="adm-sync-guide-lead">
                              The sync only reads a row when its{" "}
                              <strong>Call Status</strong> (<code>I</code>) cell
                              is exactly <code>Called - Got Prices</code>.
                              Everything else is ignored, so Susan can keep
                              working — rows aren't touched until they're marked
                              done.
                            </p>
                            {/* The sync reads cells by POSITION, not by header
                                name, so this table is the contract. Anyone who
                                inserts or deletes a column shifts everything
                                after it and the import silently starts reading
                                the wrong field — hence the warning at the
                                bottom and the two retired-but-kept columns. */}
                            <div className="adm-sync-guide-item">
                              <p className="adm-sync-guide-h">
                                Which column is which
                              </p>
                              <p className="adm-sync-guide-note">
                                The sync reads cells by their{" "}
                                <strong>position</strong>, not by the header
                                text. These are the only columns it looks at.
                              </p>
                              <div className="adm-colmap">
                                {[
                                  ["B", "Clinic Name"],
                                  ["C", "Phone"],
                                  ["D", "Address"],
                                  ["E", "City"],
                                  ["F", "Zip"],
                                  ["G", "Vet Type"],
                                  ["H", "Hours"],
                                  ["I", "Call Status — the on/off switch"],
                                  ["K", "Accepting New Patients"],
                                  ["L", "CareCredit"],
                                  ["O", "Doctor Exam"],
                                  ["P", "Vet Tech Exam"],
                                  ["Q", "Rabies"],
                                  ["R", "DHPP"],
                                  ["S", "FVRCP"],
                                  ["T", "FeLV"],
                                  ["U", "Bordetella"],
                                  ["V", "Canine Influenza"],
                                  ["W", "Leptospirosis"],
                                  ["X", "Vaccine Package — Dog"],
                                  ["Y", "Vaccine Package — Cat"],
                                  ["Z", "Spay"],
                                  ["AA", "Neuter"],
                                  ["AB", "Dental Cleaning"],
                                  ["AC", "Dental Cleaning (No Anesthesia)"],
                                  ["AG", "Emergency Visit"],
                                  ["AH", "Urgent Care Visit"],
                                  ["AJ", "Internal Admin Notes — private"],
                                  ["AK", "Verified by Susan — retired, unread"],
                                  ["AL", "Price Notes — retired, unread"],
                                  ["AM", "Public Notes — public"],
                                ].map(([col, what]) => (
                                  <div className="adm-colmap-row" key={col}>
                                    <code className="adm-colmap-col">
                                      {col}
                                    </code>
                                    <span className="adm-colmap-what">
                                      {what}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <p className="adm-sync-guide-note">
                                <strong>Verified by Susan</strong> (
                                <code>AK</code>) and{" "}
                                <strong>Price Notes</strong> (<code>AL</code>)
                                are retired and no longer read &mdash; see
                                below. Leave them where they are.
                              </p>
                            </div>
                            <div className="adm-sync-guide-list">
                              <div className="adm-sync-guide-item">
                                <p className="adm-sync-guide-h">
                                  Entering a price
                                </p>
                                <p className="adm-sync-guide-note">
                                  In any service column &mdash; from{" "}
                                  <strong>Doctor Exam</strong> (<code>O</code>)
                                  to <strong>Urgent Care Visit</strong> (
                                  <code>AH</code>). The table above says which
                                  letter is which service.
                                </p>
                                <ul>
                                  <li>
                                    <code>95</code> → a flat{" "}
                                    <strong>$95.00</strong>
                                  </li>
                                  <li>
                                    <code>95+</code> → a starting price, shown
                                    as <strong>$95+</strong>
                                  </li>
                                  <li>
                                    <code>95-120</code> → a range, shown as{" "}
                                    <strong>$95–$120</strong>
                                  </li>
                                </ul>
                              </div>
                              <div className="adm-sync-guide-item">
                                <p className="adm-sync-guide-h">
                                  More than one price in the same cell
                                </p>
                                <ul>
                                  <li>
                                    Separate them with a slash:{" "}
                                    <code>45/55</code> creates two prices for
                                    that service — $45 and $55
                                  </li>
                                  <li>
                                    Ranges work too: <code>40-50/55-65</code>
                                  </li>
                                  <li>
                                    Note: extra prices come in{" "}
                                    <strong>without a species label</strong>.
                                    Dog vs. cat is only tracked where the sheet
                                    has a separate column for each &mdash;{" "}
                                    <strong>Vaccine Package — Dog</strong> (
                                    <code>X</code>) and{" "}
                                    <strong>Vaccine Package — Cat</strong> (
                                    <code>Y</code>).
                                  </li>
                                </ul>
                              </div>
                              <div className="adm-sync-guide-item">
                                <p className="adm-sync-guide-h">
                                  When a clinic won't give a price
                                </p>
                                <ul>
                                  <li>
                                    In that service&rsquo;s price cell &mdash;
                                    anywhere from <strong>Doctor Exam</strong> (
                                    <code>O</code>) to{" "}
                                    <strong>Urgent Care Visit</strong> (
                                    <code>AH</code>) &mdash; type{" "}
                                    <code>N/A</code>, <code>Declined</code>, or{" "}
                                    <code>No Price</code>
                                  </li>
                                  <li>
                                    The vet's page then shows{" "}
                                    <strong>“call for quote”</strong> for that
                                    service, instead of leaving it blank
                                  </li>
                                </ul>
                              </div>
                              {/* AL was removed from the sync because one cell
                                  there applied to a whole row, and a row holds
                                  up to 17 prices — so a single note got stamped
                                  onto every service that had a number. The
                                  three-part split below (what used to be here,
                                  what to do instead, what not to do to the
                                  column) is the whole of what anyone working
                                  the sheet needs to know. */}
                              <div className="adm-sync-guide-item">
                                <p className="adm-sync-guide-h">
                                  A note under one price
                                </p>
                                <ul>
                                  <li>
                                    <strong>Not in the sheet any more.</strong>{" "}
                                    <strong>Price Notes</strong> (
                                    <code>AL</code>) is no longer read
                                  </li>
                                  <li>
                                    Write it here in Admin instead:{" "}
                                    <strong>Prices</strong> → pick the vet →{" "}
                                    <strong>Add note</strong> on the price it
                                    belongs to. It shows on the vet&rsquo;s page
                                    under that one price
                                  </li>
                                  <li>
                                    <strong>Why it moved.</strong>{" "}
                                    <strong>Price Notes</strong> (
                                    <code>AL</code>) held one value for a whole
                                    row, but a row holds up to 17 prices. The
                                    sync had no way to tell which price the note
                                    was for, so it put it on all of them &mdash;
                                    one note about a dental fee appeared under
                                    the rabies shot too
                                  </li>
                                  <li>
                                    A note written in Admin{" "}
                                    <strong>survives a price change</strong>. If
                                    Susan changes $50 to $65 in the sheet,
                                    &ldquo;includes the exam&rdquo; stays put
                                  </li>
                                  <li>
                                    <strong>
                                      Leave Price Notes (<code>AL</code>) where
                                      it is.
                                    </strong>{" "}
                                    Susan can use it as scratch space &mdash;
                                    nothing reads it &mdash; but deleting the
                                    column shifts <strong>Public Notes</strong>{" "}
                                    (<code>AM</code>) left and the sync starts
                                    reading the wrong field
                                  </li>
                                </ul>
                              </div>
                              <div className="adm-sync-guide-item">
                                <p className="adm-sync-guide-h">
                                  A note about the clinic&rsquo;s pricing
                                </p>
                                <ul>
                                  <li>
                                    <strong>Public Notes</strong> (
                                    <code>AM</code>) &mdash; for anything that
                                    explains the clinic&rsquo;s pricing as a
                                    whole: &ldquo;dental needs an exam
                                    first&rdquo;, &ldquo;this range assumes
                                    anesthesia&rdquo;, &ldquo;bloodwork is
                                    required before surgery&rdquo;
                                  </li>
                                  <li>
                                    <strong>Public.</strong> It shows on the
                                    vet&rsquo;s page above their prices, under
                                    the heading &ldquo;About pricing
                                    here&rdquo;, so someone understands why a
                                    price is missing or why a range is wide
                                  </li>
                                  <li>
                                    This is the same field as{" "}
                                    <strong>Public pricing note</strong> on the
                                    vet&rsquo;s record here in Admin. The sync
                                    fills it only when that&rsquo;s empty, so
                                    anything written here is never overwritten
                                  </li>
                                  <li>
                                    <strong>
                                      Public Notes (<code>AM</code>) is for the
                                      clinic as a whole. Price Notes (
                                      <code>AL</code>) is dead. One
                                      price&rsquo;s note lives in Admin.
                                    </strong>{" "}
                                    If a note only makes sense next to one
                                    number, it belongs in Admin, not here
                                  </li>
                                </ul>
                              </div>
                              <div className="adm-sync-guide-item">
                                <p className="adm-sync-guide-h">
                                  Notes about the call
                                </p>
                                <ul>
                                  <li>
                                    <strong>Internal Admin Notes</strong> (
                                    <code>AJ</code>) &mdash; what was said on
                                    the call, who to ask for, when to try again
                                  </li>
                                  <li>
                                    <strong>Never shown publicly.</strong> They
                                    appear in Admin on the vet&rsquo;s record,
                                    for us only
                                  </li>
                                  <li>
                                    The sync fills these in only when a vet has
                                    no notes in Admin yet, so anything written
                                    in Admin is never overwritten by an import
                                  </li>
                                </ul>
                              </div>
                              <div className="adm-sync-guide-item">
                                <p className="adm-sync-guide-h">
                                  Accepting patients &amp; CareCredit
                                </p>
                                <ul>
                                  <li>
                                    Type <code>Yes</code> or <code>No</code> in{" "}
                                    <strong>Accepting New Patients</strong> (
                                    <code>K</code>) and{" "}
                                    <strong>CareCredit</strong> (<code>L</code>)
                                  </li>
                                  <li>
                                    Blank or anything else = “unknown” (left off
                                    the vet page)
                                  </li>
                                </ul>
                              </div>
                              <div className="adm-sync-guide-item">
                                <p className="adm-sync-guide-h">
                                  Linking the row to the right vet
                                </p>
                                <ul>
                                  <li>
                                    Every row has to land on the right clinic.
                                    The sync matches on{" "}
                                    <strong>Clinic Name</strong> (<code>B</code>
                                    ) and <strong>Phone</strong> (<code>C</code>
                                    ) — either one is enough
                                  </li>
                                  <li>
                                    <strong>
                                      This is why the phone number matters.
                                    </strong>{" "}
                                    If the name is spelled differently from how
                                    it&rsquo;s stored — &ldquo;St.&rdquo; for
                                    &ldquo;Saint&rdquo;, a missing
                                    &ldquo;Animal&rdquo; — the phone number
                                    still finds it
                                  </li>
                                  <li>
                                    If <em>both</em> are different, the sync
                                    can&rsquo;t tell it&rsquo;s the same clinic
                                    and creates a second listing. Nothing is
                                    lost, but someone has to merge them later —
                                    so check the number before calling
                                  </li>
                                  <li>
                                    For a clinic that genuinely isn&rsquo;t in
                                    the directory, that&rsquo;s the right
                                    outcome: it&rsquo;s added as{" "}
                                    <strong>pending</strong>, with its prices
                                    attached, and shows in the Pending Vets tab
                                    for approval. Nothing goes live until
                                    someone approves it
                                  </li>
                                  <li>
                                    So you never need to add a clinic first —
                                    call it, fill in the row, and the sync
                                    creates it
                                  </li>
                                </ul>
                              </div>
                              {/* Last, and deliberately blunt. This is the one
                                  mistake that breaks the import without
                                  anything looking wrong: every value lands in
                                  the field next door and the sync reports
                                  success. */}
                              <div className="adm-sync-guide-item">
                                <p className="adm-sync-guide-h">
                                  Never insert or delete a column
                                </p>
                                <ul>
                                  <li>
                                    The sync finds each value by{" "}
                                    <strong>which column it sits in</strong>,
                                    not by what the header says. Add or remove
                                    one and everything after it shifts
                                  </li>
                                  <li>
                                    Nothing errors when that happens. Prices
                                    import into the wrong services, notes land
                                    in the wrong field, and the sync still
                                    reports success &mdash; which is why this is
                                    worth saying twice
                                  </li>
                                  <li>
                                    <strong>Verified by Susan</strong> (
                                    <code>AK</code>) and{" "}
                                    <strong>Price Notes</strong> (
                                    <code>AL</code>) are unread on purpose. They
                                    stay as spacers so{" "}
                                    <strong>Public Notes</strong> (
                                    <code>AM</code>) doesn&rsquo;t move
                                  </li>
                                  <li>
                                    Renaming a header is safe. Reordering,
                                    inserting or deleting is not. To add a
                                    service, put the new column{" "}
                                    <strong>at the far right</strong>, after{" "}
                                    <strong>Public Notes</strong> (
                                    <code>AM</code>), and tell me &mdash; the
                                    sync needs a one-line change to read it
                                  </li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {syncResult &&
                      (syncResult.error ? (
                        <div className="adm-sync-result error">
                          <p className="adm-sync-result-title">Sync failed</p>
                          <p className="adm-sync-result-msg">
                            {syncResult.error}
                          </p>
                        </div>
                      ) : (
                        <div className="adm-sync-result">
                          <p className="adm-sync-result-title">
                            {syncResult.dryRun
                              ? "Preview — nothing saved yet"
                              : "Sync complete"}
                          </p>
                          <div className="adm-sync-stats">
                            {[
                              ["Rows processed", syncResult.processed],
                              ["Exact matches", syncResult.exactMatched],
                              ["Relaxed matches", syncResult.relaxedMatched],
                              ["Auto-created", syncResult.autoCreated],
                              [
                                syncResult.dryRun
                                  ? "Prices to add"
                                  : "Prices added",
                                syncResult.pricesAdded,
                              ],
                              ["Duplicates skipped", syncResult.pricesSkipped],
                              // The route has always counted removals; nothing
                              // showed them. Sheet prices use replace
                              // semantics, so a price cleared from the sheet is
                              // deleted from the site — that needs to be
                              // visible in the preview, not discovered after a
                              // live run.
                              [
                                syncResult.dryRun
                                  ? "Prices to remove"
                                  : "Prices removed",
                                syncResult.pricesRemoved,
                              ],
                            ].map(([label, val]) => (
                              <div key={label} className="adm-sync-stat">
                                <span className="adm-sync-stat-n">
                                  {val ?? 0}
                                </span>
                                <span className="adm-sync-stat-l">{label}</span>
                              </div>
                            ))}
                          </div>

                          {/* Which prices would disappear. A count alone
                              doesn't tell you whether it's a clinic that
                              genuinely changed its prices or a cell someone
                              cleared by accident. */}
                          {syncResult.removedList?.length > 0 && (
                            <SyncDetail
                              label={`${syncResult.removedList.length} prices ${
                                syncResult.dryRun
                                  ? "would be removed"
                                  : "removed"
                              } — no longer in the sheet`}
                            >
                              <ul>
                                {syncResult.removedList
                                  .slice(0, 30)
                                  .map((n, i) => (
                                    <li key={i}>{n}</li>
                                  ))}
                                {syncResult.removedList.length > 30 && (
                                  <li>
                                    …and {syncResult.removedList.length - 30}{" "}
                                    more
                                  </li>
                                )}
                              </ul>
                            </SyncDetail>
                          )}
                          {/* Prices the sync declined to touch because Admin
                              owns them. Listed rather than only counted: a
                              number that didn't change is the one outcome
                              nobody can see by looking at the result. */}
                          {syncResult.lockedList?.length > 0 && (
                            <SyncDetail
                              label={`${syncResult.lockedList.length} prices left to Admin — the sheet was ignored`}
                            >
                              <ul>
                                {syncResult.lockedList
                                  .slice(0, 30)
                                  .map((n, i) => (
                                    <li key={i}>{n}</li>
                                  ))}
                                {syncResult.lockedList.length > 30 && (
                                  <li>
                                    …and {syncResult.lockedList.length - 30}{" "}
                                    more
                                  </li>
                                )}
                              </ul>
                            </SyncDetail>
                          )}
                          {syncResult.autoCreatedList?.length > 0 && (
                            <SyncDetail
                              label={`${syncResult.autoCreatedList.length} vets auto-created as pending`}
                            >
                              <ul>
                                {syncResult.autoCreatedList
                                  .slice(0, 30)
                                  .map((n, i) => (
                                    <li key={i}>{n}</li>
                                  ))}
                                {syncResult.autoCreatedList.length > 30 && (
                                  <li>
                                    …and{" "}
                                    {syncResult.autoCreatedList.length - 30}{" "}
                                    more
                                  </li>
                                )}
                              </ul>
                            </SyncDetail>
                          )}

                          {syncResult.notFound?.length > 0 && (
                            <SyncDetail
                              tone="warn"
                              label={`${syncResult.notFound.length} rows dropped (no phone or address to match)`}
                            >
                              <ul>
                                {syncResult.notFound
                                  .slice(0, 30)
                                  .map((n, i) => (
                                    <li key={i}>{n}</li>
                                  ))}
                                {syncResult.notFound.length > 30 && (
                                  <li>
                                    …and {syncResult.notFound.length - 30} more
                                  </li>
                                )}
                              </ul>
                            </SyncDetail>
                          )}

                          {syncResult.errors?.length > 0 && (
                            <SyncDetail
                              tone="error"
                              defaultOpen
                              label={`${syncResult.errors.length} error${
                                syncResult.errors.length !== 1 ? "s" : ""
                              }`}
                            >
                              <ul>
                                {syncResult.errors.map((e, i) => (
                                  <li key={i}>{e}</li>
                                ))}
                              </ul>
                            </SyncDetail>
                          )}
                        </div>
                      ))}
                    {callQueueLoading && (
                      <p className="adm-price-count">Loading call queue…</p>
                    )}
                    {!callQueueLoading && activeQueue.length === 0 && (
                      <div className="adm-empty">
                        <SubInboxIcon />
                        <p>All vets have been called.</p>
                      </div>
                    )}
                    {!callQueueLoading &&
                      callIndex >= activeQueue.length &&
                      activeQueue.length > 0 && (
                        <div className="adm-empty">
                          <SubInboxIcon />
                          <p>You've reached the end of the queue.</p>
                          <button
                            className="adm-b adm-b-outline"
                            style={{ marginTop: "14px" }}
                            onClick={() => setCallIndex(0)}
                          >
                            Start over
                          </button>
                        </div>
                      )}
                    {callLog.length > 0 && (
                      <div className="adm-calllog">
                        <p className="adm-calllog-head">Recently processed</p>
                        {callLog.map((entry, i) => (
                          <p key={i} className="adm-calllog-item">
                            <strong>{entry.name}</strong> — {entry.count} price
                            {entry.count !== 1 ? "s" : ""} saved
                          </p>
                        ))}
                      </div>
                    )}
                    {!callQueueLoading &&
                      callIndex < activeQueue.length &&
                      (() => {
                        const vet = activeQueue[callIndex];
                        return (
                          <div>
                            <div className="adm-cq-header">
                              <div className="adm-cq-titlewrap">
                                <p className="adm-cq-count">
                                  Vet {callIndex + 1} of {activeQueue.length}
                                </p>
                                <div
                                  className={`adm-toggle${showAllVets ? " right" : ""}`}
                                  role="tablist"
                                >
                                  <span className="adm-toggle-slider" />
                                  <button
                                    type="button"
                                    role="tab"
                                    aria-selected={!showAllVets}
                                    className={`adm-toggle-opt${!showAllVets ? " active" : ""}`}
                                    onClick={() => {
                                      setShowAllVets(false);
                                      setCallIndex(0);
                                      setCallPrices([]);
                                      setCallReviewPrices([]);
                                      setCallReviewVetId(null);
                                      setCallSaved(false);
                                    }}
                                  >
                                    Unpriced
                                  </button>
                                  <button
                                    type="button"
                                    role="tab"
                                    aria-selected={showAllVets}
                                    className={`adm-toggle-opt${showAllVets ? " active" : ""}`}
                                    onClick={() => {
                                      setShowAllVets(true);
                                      setCallIndex(0);
                                      setCallPrices([]);
                                      setCallReviewPrices([]);
                                      setCallReviewVetId(null);
                                      setCallSaved(false);
                                    }}
                                  >
                                    All vets
                                  </button>
                                </div>
                              </div>
                              <div className="adm-cq-nav">
                                <button
                                  className="adm-b adm-b-outline"
                                  onClick={() => {
                                    if (callPrices.length > 0) {
                                      setUnsavedModal({
                                        message:
                                          "You have unsaved prices. Refresh anyway?",
                                        action: () => {
                                          fetchCallQueue();
                                          setCallIndex(0);
                                          setCallPrices([]);
                                          setCallReviewPrices([]);
                                          setCallReviewVetId(null);
                                          setCallSaved(false);
                                          setCallReviewEditing(null);
                                          setLockedVetId(null);
                                          setLockedVetName("");
                                        },
                                      });
                                      return;
                                    }
                                    fetchCallQueue();
                                    setCallIndex(0);
                                    setCallPrices([]);
                                    setCallReviewPrices([]);
                                    setCallReviewVetId(null);
                                    setCallSaved(false);
                                    setCallReviewEditing(null);
                                    setLockedVetId(null);
                                    setLockedVetName("");
                                  }}
                                >
                                  Refresh
                                </button>
                                <button
                                  className="adm-b adm-b-outline"
                                  onClick={() => {
                                    if (callPrices.length > 0) {
                                      setUnsavedModal({
                                        message:
                                          "You have unsaved prices. Go back anyway?",
                                        action: () => {
                                          setCallIndex((i) =>
                                            Math.max(0, i - 1),
                                          );
                                          setCallPrices([]);
                                          setLockedVetId(null);
                                          setLockedVetName("");
                                        },
                                      });
                                      return;
                                    }
                                    setCallIndex((i) => Math.max(0, i - 1));
                                    setCallPrices([]);
                                    setLockedVetId(null);
                                    setLockedVetName("");
                                  }}
                                  disabled={callIndex === 0}
                                >
                                  <ArrowLeft size={14} strokeWidth={2.4} />
                                  Prev
                                </button>
                                <button
                                  className="adm-b adm-b-primary"
                                  onClick={() => {
                                    if (callPrices.length > 0) {
                                      setUnsavedModal({
                                        message:
                                          "You have unsaved prices. Skip this vet anyway?",
                                        action: () => {
                                          setCallIndex((i) => i + 1);
                                          setCallPrices([]);
                                          setLockedVetId(null);
                                          setLockedVetName("");
                                        },
                                      });
                                      return;
                                    }
                                    setCallIndex((i) => i + 1);
                                    setCallPrices([]);
                                    setLockedVetId(null);
                                    setLockedVetName("");
                                  }}
                                >
                                  Skip
                                  <ArrowRight size={14} strokeWidth={2.4} />
                                </button>
                              </div>
                            </div>

                            {/* Call sheet search */}
                            <div
                              style={{
                                marginBottom: "14px",
                                position: "relative",
                              }}
                            >
                              <input aria-label="Search vet by name"
                                className="adm-field-input"
                                value={callSheetSearch}
                                onChange={(e) =>
                                  setCallSheetSearch(e.target.value)
                                }
                                placeholder="Search vet by name to jump to them…"
                              />
                              {callSheetSearch.trim() && (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "calc(100% + 4px)",
                                    left: 0,
                                    right: 0,
                                    background: "var(--color-white)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "8px",
                                    maxHeight: "200px",
                                    overflowY: "auto",
                                    zIndex: 100,
                                    boxShadow: "0 4px 16px rgb(var(--color-black-rgb) / 0.1)",
                                  }}
                                >
                                  {activeQueue
                                    .filter((v) =>
                                      v.name
                                        .toLowerCase()
                                        .includes(
                                          callSheetSearch.toLowerCase(),
                                        ),
                                    )
                                    .slice(0, 8)
                                    .map((v) => {
                                      const realIdx = activeQueue.findIndex(
                                        (q) =>
                                          q.id === v.id &&
                                          q._source === v._source,
                                      );
                                      return (
                                        <div
                                          key={v.id + v._source}
                                          style={{
                                            padding: "9px 12px",
                                            cursor: "pointer",
                                            fontSize: "13px",
                                            borderBottom: "1px solid var(--color-badge-neutral-bg)",
                                          }}
                                          onMouseDown={() => {
                                            if (callPrices.length > 0) {
                                              setUnsavedModal({
                                                message:
                                                  "You have unsaved prices. Jump to another vet anyway?",
                                                action: () => {
                                                  setCallIndex(realIdx);
                                                  setCallPrices([]);
                                                  setLockedVetId(null);
                                                  setLockedVetName("");
                                                  setCallSheetSearch("");
                                                },
                                              });
                                              return;
                                            }
                                            setCallIndex(realIdx);
                                            setCallPrices([]);
                                            setLockedVetId(null);
                                            setLockedVetName("");
                                            setCallSheetSearch("");
                                          }}
                                        >
                                          {v.name}
                                          <span
                                            style={{
                                              fontSize: "11px",
                                              color: "var(--color-muted)",
                                              marginLeft: "8px",
                                            }}
                                          >
                                            #{realIdx + 1}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  {activeQueue.filter((v) =>
                                    v.name
                                      .toLowerCase()
                                      .includes(callSheetSearch.toLowerCase()),
                                  ).length === 0 && (
                                    <div
                                      style={{
                                        padding: "9px 12px",
                                        fontSize: "13px",
                                        color: "var(--color-muted)",
                                      }}
                                    >
                                      No vets found
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Progress bar */}
                            <div
                              style={{
                                height: "4px",
                                background: "var(--color-badge-neutral-bg)",
                                borderRadius: "4px",
                                marginBottom: "24px",
                              }}
                            >
                              <div
                                style={{
                                  height: "4px",
                                  background: "var(--color-success)",
                                  borderRadius: "4px",
                                  width: `${((callIndex + 1) / activeQueue.length) * 100}%`,
                                  transition: "width 0.3s",
                                }}
                              />
                            </div>

                            {/* Vet card */}
                            <div
                              style={{
                                background: "var(--color-white)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "12px",
                                padding: "20px",
                                marginBottom: "16px",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  gap: "6px",
                                  marginBottom: "6px",
                                  flexWrap: "wrap",
                                }}
                              >
                                <span
                                  className={`adm-ustatus adm-ustatus-${vet._source === "pending" ? "new" : "active"}`}
                                >
                                  {vet._source === "pending" ? "New" : "Active"}
                                </span>
                                {vet._hasPrices && (
                                  <span className="adm-priced-badge">
                                    <svg aria-hidden="true"
                                      width="12"
                                      height="12"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      style={{ marginRight: "4px" }}
                                    >
                                      <path d="M20 6L9 17l-5-5" />
                                    </svg>
                                    Priced
                                  </span>
                                )}
                                {vet._declined && (
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      background: "var(--color-error-light)",
                                      color: "var(--color-error-text)",
                                      padding: "2px 8px",
                                      borderRadius: "20px",
                                      fontWeight: "600",
                                      border: "1px solid rgb(var(--color-error-rgb) / 0.4)",
                                    }}
                                  >
                                    Declined
                                  </span>
                                )}
                              </div>
                              <h3 className="adm-cq-vettitle">{vet.name}</h3>
                              {(() => {
                                const noteCount = allCallNotes.filter(
                                  (n) => n.vet_id === vet.id,
                                ).length;
                                return noteCount > 0 ? (
                                  <button
                                    type="button"
                                    className="adm-cq-hasnotes"
                                    onClick={() => {
                                      closeAllEditors();
                                      setShowAllNotes(true);
                                      fetchAllCallNotes();
                                    }}
                                    title="This vet has saved notes"
                                  >
                                    <svg aria-hidden="true"
                                      width="13"
                                      height="13"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M8 2v4M16 2v4M4 8h16M4 6a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
                                    </svg>
                                    {noteCount} note{noteCount !== 1 ? "s" : ""}{" "}
                                    on file
                                  </button>
                                ) : null;
                              })()}
                              {vet.address && (
                                <p className="adm-cq-vetaddress">
                                  {vet.address}
                                </p>
                              )}
                              {(vet.city && vet.city.length > 2) ||
                              (vet.neighborhood &&
                                vet.neighborhood.length > 2) ? (
                                <p className="adm-cq-vetaddress">
                                  {[
                                    (vet.city && vet.city.length > 2
                                      ? vet.city
                                      : null) ||
                                      (vet.neighborhood &&
                                      vet.neighborhood.length > 2
                                        ? vet.neighborhood
                                        : null),
                                    vet.state,
                                    vet.zip_code,
                                  ]
                                    .filter(Boolean)
                                    .join(", ")}
                                </p>
                              ) : (
                                <div style={{ margin: "0 0 8px 0" }}>
                                  {(vet.state || vet.zip_code) && (
                                    <p className="adm-cq-vetaddress">
                                      {[vet.state, vet.zip_code]
                                        .filter(Boolean)
                                        .join(", ")}
                                    </p>
                                  )}
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px",
                                    }}
                                  >
                                    <input aria-label="City"
                                      className="adm-input"
                                      style={{
                                        maxWidth: "180px",
                                        fontSize: "13px",
                                        padding: "4px 8px",
                                      }}
                                      placeholder="Enter city..."
                                      defaultValue=""
                                      onBlur={async (e) => {
                                        const city = e.target.value.trim();
                                        if (!city) return;
                                        const table =
                                          vet._source === "pending"
                                            ? "pending_vets"
                                            : "vets";
                                        await supabase
                                          .from(table)
                                          .update({ city })
                                          .eq("id", vet.id);
                                        setCallQueue((prev) =>
                                          prev.map((v, idx) =>
                                            idx === callIndex
                                              ? { ...v, city }
                                              : v,
                                          ),
                                        );
                                      }}
                                    />
                                    <span
                                      style={{
                                        fontSize: "11px",
                                        color: "var(--color-warning-text)",
                                        fontWeight: "600",
                                      }}
                                    >
                                      ⚠️ City missing
                                    </span>
                                  </div>
                                </div>
                              )}
                              {vet.website &&
                                (() => {
                                  try {
                                    const cleanUrl = cleanWebsiteUrl(
                                      vet.website,
                                    );
                                    return (
                                      <a
                                        href={
                                          vet.website.startsWith("http")
                                            ? vet.website
                                            : `https://${cleanUrl}`
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="adm-cq-veturl"
                                      >
                                        {cleanUrl}
                                        <svg aria-hidden="true"
                                          width="13"
                                          height="13"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <path d="M7 17L17 7M7 7h10v10" />
                                        </svg>
                                      </a>
                                    );
                                  } catch {
                                    return (
                                      <a
                                        href={vet.website}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="adm-cq-veturl"
                                      >
                                        {vet.website}
                                        <svg aria-hidden="true"
                                          width="13"
                                          height="13"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <path d="M7 17L17 7M7 7h10v10" />
                                        </svg>
                                      </a>
                                    );
                                  }
                                })()}
                              {vet.phone && (
                                <a
                                  href={`tel:${vet.phone}`}
                                  className="adm-cq-phone"
                                >
                                  {vet.phone}
                                </a>
                              )}

                              <div
                                className="form-grid-2"
                                style={{
                                  marginBottom: "14px",
                                  marginTop: "16px",
                                }}
                              >
                                <div>
                                  <label className="adm-field-label">
                                    Accepting New Patients
                                  </label>
                                  <select aria-label="Accepting New Patients"
                                    className="adm-field-input adm-field-select"
                                    value={
                                      vet.accepting_new_patients === true
                                        ? "yes"
                                        : vet.accepting_new_patients === false
                                          ? "no"
                                          : ""
                                    }
                                    onChange={async (e) => {
                                      const dbVal =
                                        e.target.value === "yes"
                                          ? true
                                          : e.target.value === "no"
                                            ? false
                                            : null;
                                      const table =
                                        vet._source === "pending"
                                          ? "pending_vets"
                                          : "vets";
                                      await supabase
                                        .from(table)
                                        .update({
                                          accepting_new_patients: dbVal,
                                        })
                                        .eq("id", vet.id);
                                      setCallQueue((prev) =>
                                        prev.map((v, i) =>
                                          i === callIndex
                                            ? {
                                                ...v,
                                                accepting_new_patients: dbVal,
                                              }
                                            : v,
                                        ),
                                      );
                                      setFullCallQueue((prev) =>
                                        prev.map((v, i) =>
                                          i === callIndex
                                            ? {
                                                ...v,
                                                accepting_new_patients: dbVal,
                                              }
                                            : v,
                                        ),
                                      );
                                    }}
                                  >
                                    <option value="">— Select —</option>
                                    <option value="yes">Yes</option>
                                    <option value="no">No</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="adm-field-label">
                                    CareCredit
                                  </label>
                                  <select aria-label="CareCredit"
                                    className="adm-field-input adm-field-select"
                                    value={
                                      vet.carecredit === true
                                        ? "yes"
                                        : vet.carecredit === false
                                          ? "no"
                                          : ""
                                    }
                                    onChange={async (e) => {
                                      const dbVal =
                                        e.target.value === "yes"
                                          ? true
                                          : e.target.value === "no"
                                            ? false
                                            : null;
                                      const table =
                                        vet._source === "pending"
                                          ? "pending_vets"
                                          : "vets";
                                      await supabase
                                        .from(table)
                                        .update({ carecredit: dbVal })
                                        .eq("id", vet.id);
                                      setCallQueue((prev) =>
                                        prev.map((v, i) =>
                                          i === callIndex
                                            ? { ...v, carecredit: dbVal }
                                            : v,
                                        ),
                                      );
                                      setFullCallQueue((prev) =>
                                        prev.map((v, i) =>
                                          i === callIndex
                                            ? { ...v, carecredit: dbVal }
                                            : v,
                                        ),
                                      );
                                    }}
                                  >
                                    <option value="">— Select —</option>
                                    <option value="yes">Yes</option>
                                    <option value="no">No</option>
                                  </select>
                                </div>
                              </div>

                              {/* Price entry */}
                              <div>
                                <div
                                  className="adm-priceentry-head"
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "10px",
                                  }}
                                >
                                  <p
                                    className="adm-field-label"
                                    style={{ margin: 0 }}
                                  >
                                    Enter prices from call
                                  </p>
                                  <button
                                    className="adm-b adm-b-navy adm-addprice-btn"
                                    onClick={() => {
                                      addCallPriceRow(vet);
                                      setShowCallbackNotes(false);
                                      setCallbackNoteText("");
                                    }}
                                  >
                                    + Add price
                                  </button>
                                </div>
                                {callPrices.length === 0 && (
                                  <p className="adm-callprice-empty">
                                    No prices added yet — click "+ Add price"
                                    for each service they quote you.
                                  </p>
                                )}
                                {callPrices.map((p, i) => (
                                  <CallPriceRow
                                    key={i}
                                    p={p}
                                    i={i}
                                    services={services}
                                    updateCallPrice={updateCallPrice}
                                    removeCallPrice={removeCallPrice}
                                    setCallPrices={setCallPrices}
                                    callSpeciesError={callSpeciesError}
                                    setCallSpeciesError={setCallSpeciesError}
                                  />
                                ))}
                                {callPrices.length > 0 && (
                                  <div style={{ marginTop: "8px" }}>
                                    {callSpeciesError && (
                                      <div role="alert"
                                        style={{
                                          background: "var(--color-error-light)",
                                          border: "1px solid rgb(var(--color-error-rgb) / 0.24)",
                                          borderRadius: "8px",
                                          padding: "10px 14px",
                                          marginBottom: "10px",
                                        }}
                                      >
                                        <p
                                          style={{
                                            margin: 0,
                                            fontSize: "13px",
                                            color: "var(--color-error-text)",
                                            fontWeight: "600",
                                          }}
                                        >
                                          Complete all required fields before
                                          saving:
                                        </p>
                                        <ul
                                          style={{
                                            margin: "6px 0 0 0",
                                            paddingLeft: "18px",
                                            fontSize: "13px",
                                            color: "var(--color-error-text)",
                                          }}
                                        >
                                          {callPrices.map((p, idx) => {
                                            const missing = [];
                                            if (!p.service_id)
                                              missing.push("Service");
                                            if (!p.species)
                                              missing.push("Species");
                                            if (
                                              !p.price_low &&
                                              !p.call_for_quote
                                            )
                                              missing.push("Price");
                                            return missing.length > 0 ? (
                                              <li key={idx}>
                                                Row {idx + 1}:{" "}
                                                {missing.join(", ")}
                                              </li>
                                            ) : null;
                                          })}
                                        </ul>
                                      </div>
                                    )}
                                    {lockedVetId && lockedVetId !== vet.id && (
                                      <p
                                        style={{
                                          margin: "0 0 8px 0",
                                          fontSize: "12px",
                                          color: "var(--color-warning-text)",
                                          fontWeight: "600",
                                        }}
                                      >
                                        Saving prices for {lockedVetName}
                                      </p>
                                    )}
                                    <button
                                      className="adm-b adm-b-primary adm-callprice-save"
                                      onClick={() => {
                                        setCallSpeciesError(false);
                                        saveCallPrices(vet);
                                      }}
                                      disabled={callSaving}
                                    >
                                      {callSaving ? "Saving…" : "Save prices"}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div
                              style={{
                                borderTop: "1px solid var(--color-border)",
                                paddingTop: "16px",
                                marginBottom: "16px",
                              }}
                            >
                              <p
                                className="adm-field-label"
                                style={{ marginBottom: "8px" }}
                              >
                                No prices?
                              </p>
                              <div className="call-no-prices-btns">
                                <button
                                  className="adm-b adm-b-outline"
                                  onClick={() =>
                                    markCallStatus(vet, "declined")
                                  }
                                >
                                  Declined to share
                                </button>
                                <button
                                  className="adm-b adm-b-outline"
                                  onClick={() => {
                                    setNotesVetId(vet.id);
                                    setNotesVetName(vet.name);
                                    fetchCallNotes(vet.id);
                                    setShowCallbackNotes(true);
                                    setCallPrices([]);
                                  }}
                                >
                                  Call back later
                                </button>
                              </div>
                              {showCallbackNotes && notesVetId === vet.id && (
                                <div className="adm-callnotes">
                                  <div className="adm-callnotes-head">
                                    <p className="adm-callnotes-title">
                                      Notes for {vet.name}
                                    </p>
                                    <button
                                      className="adm-callnotes-close"
                                      onClick={() =>
                                        setShowCallbackNotes(false)
                                      }
                                      aria-label="Close notes"
                                    >
                                      <svg aria-hidden="true"
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                      >
                                        <path d="M18 6L6 18M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                  <div style={{ marginBottom: "16px" }}>
                                    <RichTextEditor
                                      value={callbackNoteText}
                                      onChange={(v) => setCallbackNoteText(v)}
                                      placeholder="Add a note about this vet…"
                                    />
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "flex-start",
                                        marginTop: "10px",
                                      }}
                                    >
                                      <button
                                        className="adm-b adm-b-green adm-savenote-btn"
                                        onClick={() =>
                                          saveCallNote(
                                            vet.id,
                                            vet.name,
                                            callbackNoteText,
                                          )
                                        }
                                      >
                                        Save note
                                      </button>
                                    </div>
                                  </div>
                                  {callNotes.length === 0 && (
                                    <p className="adm-callnotes-empty">
                                      No notes yet.
                                    </p>
                                  )}
                                  {callNotes.map((n) => (
                                    <div
                                      key={n.id}
                                      style={{
                                        borderTop: "1px solid var(--color-border)",
                                        paddingTop: "12px",
                                        marginTop: "12px",
                                      }}
                                    >
                                      {editingNoteId === n.id ? (
                                        <div>
                                          <RichTextEditor
                                            value={editingNoteText}
                                            onChange={(v) =>
                                              setEditingNoteText(v)
                                            }
                                            placeholder="Edit note…"
                                          />
                                          <div
                                            style={{
                                              display: "flex",
                                              justifyContent: "flex-end",
                                              gap: "8px",
                                              marginTop: "10px",
                                            }}
                                          >
                                            <button
                                              className="adm-b adm-b-outline"
                                              onClick={() => {
                                                setEditingNoteId(null);
                                                setEditingNoteText("");
                                              }}
                                            >
                                              Cancel
                                            </button>
                                            <button
                                              className="adm-b adm-b-primary"
                                              onClick={() =>
                                                updateCallNote(
                                                  n.id,
                                                  editingNoteText,
                                                )
                                              }
                                            >
                                              Save changes
                                            </button>
                                          </div>
                                        </div>
                                      ) : deletingNoteId === n.id ? (
                                        <div
                                          style={{
                                            background: "var(--color-error-light)",
                                            border: "1px solid rgb(var(--color-error-rgb) / 0.24)",
                                            borderRadius: "6px",
                                            padding: "12px",
                                          }}
                                        >
                                          <p
                                            style={{
                                              margin: "0 0 10px 0",
                                              fontSize: "13px",
                                              color: "var(--color-error-text)",
                                              fontWeight: "600",
                                            }}
                                          >
                                            Delete this note?
                                          </p>
                                          <div
                                            style={{
                                              display: "flex",
                                              justifyContent: "flex-end",
                                              gap: "8px",
                                            }}
                                          >
                                            <button
                                              className="adm-b adm-b-outline"
                                              onClick={() =>
                                                setDeletingNoteId(null)
                                              }
                                            >
                                              Cancel
                                            </button>
                                            <button
                                              className="adm-b adm-b-danger"
                                              onClick={() =>
                                                deleteCallNote(n.id)
                                              }
                                            >
                                              Yes, delete
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div>
                                          <p className="adm-callnote-date">
                                            {formatLogDate(n.created_at)}
                                            {n.updated_at !== n.created_at
                                              ? " · edited"
                                              : ""}
                                          </p>
                                          <p className="adm-callnote-text">
                                            {n.note}
                                          </p>
                                          <div
                                            style={{
                                              display: "flex",
                                              justifyContent: "flex-end",
                                              gap: "8px",
                                            }}
                                          >
                                            <button
                                              className="adm-b adm-b-outline"
                                              onClick={() => {
                                                setEditingNoteId(n.id);
                                                setEditingNoteText(n.note);
                                              }}
                                            >
                                              Edit
                                            </button>
                                            <button
                                              className="adm-b adm-b-danger"
                                              onClick={() =>
                                                setDeletingNoteId(n.id)
                                              }
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Review Panel */}
                            {callReviewPrices.length > 0 && (
                              <div
                                style={{
                                  background: "var(--color-white)",
                                  border: "2px solid var(--color-success)",
                                  borderRadius: "12px",
                                  padding: "20px",
                                  marginTop: "16px",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginBottom: "16px",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "10px",
                                    }}
                                  >
                                    <span
                                      style={{
                                        display: "flex",
                                        flexShrink: 0,
                                        color: "var(--color-success-text)",
                                      }}
                                    >
                                      <svg aria-hidden="true"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.4"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <path d="M20 6L9 17l-5-5" />
                                      </svg>
                                    </span>
                                    <div>
                                      <p className="adm-review-title">
                                        Saved prices for {vet.name}
                                      </p>
                                      <p className="adm-review-caption">
                                        {callReviewPrices.length} price
                                        {callReviewPrices.length !== 1
                                          ? "s"
                                          : ""}{" "}
                                        — edit or remove before moving on
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                {callReviewPrices.map((row, i) => {
                                  const svc = services.find(
                                    (s) =>
                                      s.id === row.service_id ||
                                      s.id === parseInt(row.service_id),
                                  );
                                  const isEditing = callReviewEditing === i;
                                  return (
                                    <div
                                      key={row.id || i}
                                      style={{
                                        borderTop: "1px solid var(--color-badge-neutral-bg)",
                                        paddingTop: "12px",
                                        marginTop: "12px",
                                      }}
                                    >
                                      {!isEditing ? (
                                        <div>
                                          <p className="adm-review-service">
                                            {svc?.name || "Unknown service"}
                                          </p>
                                          <p className="adm-review-price">
                                            {row.call_for_quote
                                              ? "Call for quote"
                                              : [
                                                  row.price_low &&
                                                    `$${parseFloat(row.price_low).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                                                  row.price_high &&
                                                    `– $${parseFloat(row.price_high).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                                                ]
                                                  .filter(Boolean)
                                                  .join(" ")}
                                            {row.price_type &&
                                              row.price_type !== "exact" && (
                                                <span className="adm-review-range">
                                                  ({row.price_type})
                                                </span>
                                              )}
                                          </p>
                                          {row.species && (
                                            <div
                                              style={{ marginBottom: "8px" }}
                                            >
                                              <span className="adm-badge adm-badge-species">
                                                {row.species}
                                              </span>
                                            </div>
                                          )}
                                          {(row.includes_bloodwork === true ||
                                            row.includes_xrays === true ||
                                            row.includes_anesthesia ===
                                              true) && (
                                            <div
                                              style={{
                                                display: "flex",
                                                gap: "6px",
                                                flexWrap: "wrap",
                                                marginBottom: "8px",
                                              }}
                                            >
                                              {row.includes_bloodwork ===
                                                true && (
                                                <span className="adm-badge adm-badge-incl">
                                                  + bloodwork
                                                </span>
                                              )}
                                              {row.includes_xrays === true && (
                                                <span className="adm-badge adm-badge-incl">
                                                  + x-rays
                                                </span>
                                              )}
                                              {row.includes_anesthesia ===
                                                true && (
                                                <span className="adm-badge adm-badge-incl">
                                                  + anesthesia
                                                </span>
                                              )}
                                            </div>
                                          )}
                                          {row.notes && (
                                            <p className="adm-review-note">
                                              {row.notes}
                                            </p>
                                          )}
                                          <div
                                            className="adm-review-actions"
                                            style={{
                                              marginTop: "16px",
                                              borderTop: "1px solid var(--color-badge-neutral-bg)",
                                            }}
                                          >
                                            <button
                                              className="adm-b adm-b-outline"
                                              onClick={() =>
                                                setCallReviewEditing(i)
                                              }
                                            >
                                              Edit
                                            </button>
                                            <button
                                              className="adm-b adm-b-danger"
                                              onClick={() =>
                                                deleteReviewPrice(i)
                                              }
                                            >
                                              Remove
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div
                                          style={{
                                            background: "var(--color-white)",
                                            borderRadius: "8px",
                                            padding: "16px",
                                          }}
                                        >
                                          <div
                                            className="form-grid-4"
                                            style={{ marginBottom: "14px" }}
                                          >
                                            <div>
                                              <label className="adm-field-label">
                                                Service
                                              </label>
                                              <ServiceDropdown
                                                services={services}
                                                value={row.service_id}
                                                onChange={(e) => {
                                                  const u = [
                                                    ...callReviewPrices,
                                                  ];
                                                  u[i] = {
                                                    ...u[i],
                                                    service_id: e.target.value,
                                                  };
                                                  setCallReviewPrices(u);
                                                }}
                                              />
                                            </div>
                                            <div>
                                              <label className="adm-field-label">
                                                Price Type
                                              </label>
                                              <select aria-label="Price Type"
                                                className="adm-field-input adm-field-select"
                                                value={
                                                  row.price_type || "exact"
                                                }
                                                disabled={!!row.call_for_quote}
                                                style={
                                                  row.call_for_quote
                                                    ? {
                                                        opacity: 0.4,
                                                        pointerEvents: "none",
                                                      }
                                                    : {}
                                                }
                                                onChange={(e) => {
                                                  const u = [
                                                    ...callReviewPrices,
                                                  ];
                                                  u[i] = {
                                                    ...u[i],
                                                    price_type: e.target.value,
                                                  };
                                                  setCallReviewPrices(u);
                                                }}
                                              >
                                                {[
                                                  "exact",
                                                  "range",
                                                  "starting",
                                                  "up to",
                                                ].map((t) => (
                                                  <option key={t}>{t}</option>
                                                ))}
                                              </select>
                                            </div>
                                            <div>
                                              <label className="adm-field-label">
                                                Price Low
                                              </label>
                                              <input aria-label="Price Low"
                                                className="adm-field-input"
                                                type="number"
                                                step="0.01"
                                                value={row.price_low || ""}
                                                disabled={!!row.call_for_quote}
                                                style={
                                                  row.call_for_quote
                                                    ? {
                                                        opacity: 0.4,
                                                        pointerEvents: "none",
                                                      }
                                                    : {}
                                                }
                                                onChange={(e) => {
                                                  const u = [
                                                    ...callReviewPrices,
                                                  ];
                                                  u[i] = {
                                                    ...u[i],
                                                    price_low: e.target.value,
                                                  };
                                                  setCallReviewPrices(u);
                                                }}
                                                placeholder="e.g. 65.00"
                                              />
                                            </div>
                                            <div>
                                              <label className="adm-field-label">
                                                Price High
                                              </label>
                                              <input aria-label="Price High"
                                                className="adm-field-input"
                                                type="number"
                                                step="0.01"
                                                value={row.price_high || ""}
                                                disabled={!!row.call_for_quote}
                                                style={
                                                  row.call_for_quote
                                                    ? {
                                                        opacity: 0.4,
                                                        pointerEvents: "none",
                                                      }
                                                    : {}
                                                }
                                                onChange={(e) => {
                                                  const u = [
                                                    ...callReviewPrices,
                                                  ];
                                                  u[i] = {
                                                    ...u[i],
                                                    price_high: e.target.value,
                                                  };
                                                  setCallReviewPrices(u);
                                                }}
                                                placeholder="range only"
                                              />
                                            </div>
                                          </div>
                                          <div
                                            className="form-grid-2"
                                            style={{ marginBottom: "14px" }}
                                          >
                                            <div>
                                              <label className="adm-field-label">
                                                Species *
                                              </label>
                                              <select aria-label="Species"
                                                className="adm-field-input adm-field-select"
                                                value={
                                                  row.species === "other" ||
                                                  (row.species &&
                                                    ![
                                                      "dog",
                                                      "cat",
                                                      "rabbit",
                                                      "bird",
                                                      "other",
                                                      "",
                                                    ].includes(row.species))
                                                    ? "other"
                                                    : row.species || ""
                                                }
                                                onChange={(e) => {
                                                  const u = [
                                                    ...callReviewPrices,
                                                  ];
                                                  u[i] = {
                                                    ...u[i],
                                                    species: e.target.value,
                                                    speciesOther: "",
                                                  };
                                                  setCallReviewPrices(u);
                                                }}
                                              >
                                                <option value="">
                                                  — Select —
                                                </option>
                                                <option value="dog">Dog</option>
                                                <option value="cat">Cat</option>
                                                <option value="rabbit">
                                                  Rabbit
                                                </option>
                                                <option value="bird">
                                                  Bird
                                                </option>
                                                <option value="other">
                                                  Other...
                                                </option>
                                              </select>
                                              {(row.species === "other" ||
                                                (row.species &&
                                                  ![
                                                    "dog",
                                                    "cat",
                                                    "rabbit",
                                                    "bird",
                                                    "other",
                                                    "",
                                                  ].includes(row.species))) && (
                                                <input aria-label="Specify species"
                                                  className="adm-field-input"
                                                  style={{ marginTop: "8px" }}
                                                  value={row.speciesOther || ""}
                                                  onChange={(e) => {
                                                    const u = [
                                                      ...callReviewPrices,
                                                    ];
                                                    u[i] = {
                                                      ...u[i],
                                                      species: "other",
                                                      speciesOther:
                                                        e.target.value,
                                                    };
                                                    setCallReviewPrices(u);
                                                  }}
                                                  placeholder="e.g. Guinea pig, snake..."
                                                />
                                              )}
                                            </div>
                                            <div>
                                              <label className="adm-field-label">
                                                Includes
                                              </label>
                                              <div
                                                style={{
                                                  display: "flex",
                                                  gap: "6px",
                                                  flexWrap: "nowrap",
                                                  paddingTop: "2px",
                                                }}
                                              >
                                                {[
                                                  [
                                                    "includes_bloodwork",
                                                    "Bloodwork",
                                                  ],
                                                  ["includes_xrays", "X-rays"],
                                                  [
                                                    "includes_anesthesia",
                                                    "Anesthesia",
                                                  ],
                                                ].map(([field, label]) => (
                                                  <button
                                                    key={field}
                                                    type="button"
                                                    onClick={() => {
                                                      const u = [
                                                        ...callReviewPrices,
                                                      ];
                                                      u[i] = {
                                                        ...u[i],
                                                        [field]: !u[i][field],
                                                      };
                                                      setCallReviewPrices(u);
                                                    }}
                                                    style={{
                                                      padding: "3px 8px",
                                                      borderRadius: "20px",
                                                      fontSize: "11px",
                                                      fontWeight: "600",
                                                      cursor: "pointer",
                                                      border: row[field]
                                                        ? "none"
                                                        : "1px solid var(--color-border)",
                                                      background: row[field]
                                                        ? "var(--color-success)"
                                                        : "var(--color-badge-neutral-bg)",
                                                      color: row[field]
                                                        ? "var(--color-white)"
                                                        : "var(--color-slate)",
                                                      whiteSpace: "nowrap",
                                                    }}
                                                  >
                                                    {label}
                                                  </button>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                          <div style={{ marginBottom: "14px" }}>
                                            <label className="adm-field-label">
                                              Notes
                                            </label>
                                            <textarea aria-label="Notes"
                                              className="adm-field-input"
                                              rows={3}
                                              style={{
                                                width: "100%",
                                                resize: "vertical",
                                                height: "auto",
                                              }}
                                              value={row.notes || ""}
                                              onChange={(e) => {
                                                const u = [...callReviewPrices];
                                                u[i] = {
                                                  ...u[i],
                                                  notes: e.target.value,
                                                };
                                                setCallReviewPrices(u);
                                              }}
                                              placeholder="Notes about this price..."
                                            />
                                          </div>
                                          <div
                                            style={{
                                              display: "flex",
                                              gap: "8px",
                                              justifyContent: "flex-end",
                                            }}
                                          >
                                            <button
                                              className="adm-b adm-b-outline"
                                              onClick={() =>
                                                setCallReviewEditing(null)
                                              }
                                            >
                                              Cancel
                                            </button>
                                            <button
                                              className="adm-b adm-b-primary"
                                              onClick={() =>
                                                updateReviewPrice(i, row)
                                              }
                                            >
                                              Save Changes
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                <div
                                  style={{
                                    marginTop: "20px",
                                    paddingTop: "16px",
                                    borderTop: "1px solid var(--color-badge-neutral-bg)",
                                  }}
                                >
                                  <p
                                    className="adm-review-hint"
                                    style={{ margin: "0 0 8px" }}
                                  >
                                    Add more prices above, or move on when
                                    ready.
                                  </p>
                                  <div className="adm-nextvet-wrap">
                                    <button
                                      className="adm-b adm-b-primary adm-nextvet-btn"
                                      onClick={advanceFromReview}
                                    >
                                      Next Vet →
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                  </div>
                );
              })()}

            {/* ── USERS ── */}
            {tab === "Users" && (
              <div>
                <h2 className="adm-view-title">Users</h2>
                <p className="adm-view-sub">
                  {users.length} registered{" "}
                  {users.length === 1 ? "user" : "users"}
                </p>

                <div className="adm-searchbar">
                  <input aria-label="Search users by name, email or zip"
                    placeholder="Search by name, email, or zip"
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      // Back to the top of the list on a new search, so you
                      // don't land halfway down someone else's results.
                      setUserLimit(50);
                    }}
                  />
                  {userSearch && (
                    <button
                      type="button"
                      className="adm-search-clear"
                      aria-label="Clear search"
                      onClick={() => {
                        setUserSearch("");
                        setUserLimit(50);
                      }}
                    >
                      <X size={15} strokeWidth={2.6} />
                    </button>
                  )}
                </div>

                <div className="adm-userfilters">
                  {[
                    { k: "all", label: "All" },
                    { k: "active", label: "Active" },
                    { k: "suspended", label: "Suspended" },
                    { k: "banned", label: "Banned" },
                    { k: "flagged", label: "Flagged" },
                  ].map((f) => (
                    <button
                      key={f.k}
                      className={`adm-userfilter${userStatusFilter === f.k ? " active" : ""}`}
                      onClick={() => {
                        setUserStatusFilter(f.k);
                        setUserLimit(50);
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {usersLoading && users.length === 0 && (
                  <p style={{ color: "var(--color-muted)", fontSize: "14px" }}>Loading…</p>
                )}

                {!usersLoading && filteredUsers.length === 0 && (
                  <div className="adm-empty">
                    <SubInboxIcon />
                    <p>No users match.</p>
                  </div>
                )}

                {/* Capped. This list was rendering every matching user, and
                    each card is a few dozen elements — so with a few thousand
                    profiles, one keystroke in the search above rebuilt tens of
                    thousands of nodes and the letter took seconds to appear.
                    Pending Vets, Vets and Symptom Logs in this same file were
                    already capped for the same reason; Users and Pets were the
                    two that weren't.
                    The slice goes AFTER the filter, so searching still looks
                    at every user — it just stops drawing after 50. */}
                <div className="adm-user-list">
                  {filteredUsers.slice(0, userLimit).map((u) => (
                    <div key={u.id} className="adm-user-card">
                      <div className="adm-user-main">
                        <div className="adm-user-id">
                          <span className="adm-user-name">
                            {u.full_name || "No name"}
                          </span>
                          <span className="adm-user-email">
                            {u.email || "—"}
                          </span>
                        </div>
                        <div className="adm-user-badges">
                          <span
                            className={`adm-ustatus adm-ustatus-${u.status || "active"}`}
                          >
                            {(u.status || "active").charAt(0).toUpperCase() +
                              (u.status || "active").slice(1)}
                          </span>
                          {u.is_flagged && (
                            <span
                              className="adm-uflag"
                              title={u.flag_reason || "Flagged"}
                            >
                              <SubWarnIcon /> Flagged
                            </span>
                          )}
                          {u.computed_flags?.map((cf) => (
                            <span key={cf.key} className="adm-uflag auto">
                              {cf.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="adm-user-meta">
                        <div className="adm-user-stat">
                          <span className="adm-user-stat-n">{u.pet_count}</span>
                          <span className="adm-user-stat-l">Pets</span>
                        </div>
                        <div className="adm-user-stat">
                          <span className="adm-user-stat-n">
                            {u.submission_count}
                          </span>
                          <span className="adm-user-stat-l">Submissions</span>
                        </div>
                        <div className="adm-user-stat">
                          <span className="adm-user-stat-n">
                            {u.is_public ? "Public" : "Private"}
                          </span>
                          <span className="adm-user-stat-l">Profile</span>
                        </div>
                        <div className="adm-user-stat">
                          <span className="adm-user-stat-n">
                            {formatDate(u.created_at)}
                          </span>
                          <span className="adm-user-stat-l">Joined</span>
                        </div>
                      </div>

                      <div className="adm-user-actions">
                        <select aria-label={`Status for ${u.email || "user"}`}
                          className="adm-user-status-select"
                          value={u.status || "active"}
                          onChange={(e) => setUserStatus(u.id, e.target.value)}
                        >
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                          <option value="banned">Banned</option>
                        </select>
                        <button
                          className={`adm-b ${u.is_flagged ? "adm-b-outline" : "adm-b-outline"}`}
                          onClick={() => toggleUserFlag(u)}
                        >
                          {u.is_flagged ? "Unflag" : "Flag"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {filteredUsers.length > userLimit && (
                  <div className="adm-showmore">
                    <button
                      className="adm-b adm-b-outline"
                      onClick={() => setUserLimit((n) => n + 50)}
                    >
                      Show 50 more
                    </button>
                    <span className="adm-showmore-count">
                      Showing {userLimit} of {filteredUsers.length}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ── PETS ── */}
            {tab === "Pets" && (
              <div>
                <h2 className="adm-view-title">Pets</h2>
                <p className="adm-view-sub">
                  {pets.length} registered {pets.length === 1 ? "pet" : "pets"}
                </p>

                <div className="adm-searchbar">
                  <input aria-label="Search by pet name or owner"
                    placeholder="Search by pet name or owner"
                    value={petSearch}
                    onChange={(e) => {
                      setPetSearch(e.target.value);
                      setPetLimit(50);
                    }}
                  />
                  {petSearch && (
                    <button
                      type="button"
                      className="adm-search-clear"
                      aria-label="Clear search"
                      onClick={() => {
                        setPetSearch("");
                        setPetLimit(50);
                      }}
                    >
                      <X size={15} strokeWidth={2.6} />
                    </button>
                  )}
                </div>

                {petsLoading && pets.length === 0 && (
                  <p style={{ color: "var(--color-muted)", fontSize: "14px" }}>Loading…</p>
                )}

                {(() => {
                  const shown = pets.filter((p) => {
                    const q = petSearch.toLowerCase();
                    return (
                      !q ||
                      p.name?.toLowerCase().includes(q) ||
                      p.ownerName?.toLowerCase().includes(q)
                    );
                  });
                  if (!petsLoading && shown.length === 0) {
                    return (
                      <div className="adm-empty">
                        <SubInboxIcon />
                        <p>No pets found.</p>
                      </div>
                    );
                  }
                  // Capped for the same reason as the user list above — the
                  // search sees every pet, the grid stops drawing after the
                  // limit.
                  return (
                    <>
                      <div className="adm-pet-grid">
                        {shown.slice(0, petLimit).map((pet) => {
                          const ageYrs = pet.birthday
                            ? Math.floor(
                                (Date.now() - new Date(pet.birthday)) /
                                  (365.25 * 24 * 3600 * 1000),
                              )
                            : null;
                          const ageLabel =
                            ageYrs === null
                              ? "—"
                              : ageYrs < 1
                                ? "< 1 yr"
                                : ageYrs === 1
                                  ? "1 yr"
                                  : `${ageYrs} yrs`;
                          return (
                            <div key={pet.id} className="adm-pet-card">
                              <div className="adm-pet-head">
                                <span className="adm-pet-name">
                                  {pet.name || "Unnamed"}
                                </span>
                                <span className="adm-pet-owner">
                                  {pet.ownerName || "—"}
                                </span>
                              </div>

                              <div className="adm-pet-attrs">
                                <div className="adm-pet-attr">
                                  <span className="adm-pet-attr-l">
                                    Species
                                  </span>
                                  <span className="adm-pet-attr-v">
                                    {pet.species || "—"}
                                  </span>
                                </div>
                                <div className="adm-pet-attr">
                                  <span className="adm-pet-attr-l">Breed</span>
                                  <span className="adm-pet-attr-v">
                                    {pet.breed || "—"}
                                  </span>
                                </div>
                                <div className="adm-pet-attr">
                                  <span className="adm-pet-attr-l">Age</span>
                                  <span className="adm-pet-attr-v">
                                    {ageLabel}
                                  </span>
                                </div>
                                <div className="adm-pet-attr">
                                  <span className="adm-pet-attr-l">Weight</span>
                                  <span className="adm-pet-attr-v">
                                    {pet.weight_value
                                      ? `${pet.weight_value} lbs`
                                      : "—"}
                                  </span>
                                </div>
                              </div>

                              <div className="adm-pet-foot">
                                <span className="adm-pet-attr-l">Sex</span>
                                <select aria-label="Sex"
                                  className="adm-line-select adm-pet-select"
                                  value={pet.sex || ""}
                                  onChange={(e) =>
                                    updatePetSex(pet.id, e.target.value || null)
                                  }
                                >
                                  <option value="">— Select —</option>
                                  <option value="Male">Male</option>
                                  <option value="Female">Female</option>
                                  <option value="Male (neutered)">
                                    Male (neutered)
                                  </option>
                                  <option value="Female (spayed)">
                                    Female (spayed)
                                  </option>
                                  <option value="Unknown">Unknown</option>
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {shown.length > petLimit && (
                        <div className="adm-showmore">
                          <button
                            className="adm-b adm-b-outline"
                            onClick={() => setPetLimit((n) => n + 50)}
                          >
                            Show 50 more
                          </button>
                          <span className="adm-showmore-count">
                            Showing {petLimit} of {shown.length}
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* ── TEAM ── */}
            {tab === "Team" && (
              <div>
                <div>
                  <h2 className="adm-view-title">Team</h2>
                  <p className="adm-view-sub">
                    {adminUsers.length}{" "}
                    {adminUsers.length === 1 ? "member" : "members"}
                    <br />
                    Manage access and permissions
                  </p>
                </div>

                <div className="adm-team-invite-row">
                  {adminUsers.find((a) => a.email === currentUserEmail)
                    ?.can_manage_team &&
                    !showInviteForm && (
                      <button
                        className="adm-addbtn"
                        onClick={() => {
                          closeAllTeamPanels();
                          setShowInviteForm(true);
                        }}
                      >
                        + Invite person
                      </button>
                    )}
                </div>

                {showInviteForm && (
                  <div className="adm-invite-card">
                    <p className="adm-invite-title">Invite a team member</p>
                    <div className="adm-invite-grid">
                      <div className="adm-field">
                        <label className="adm-field-label">Email *</label>
                        <input aria-label="Email"
                          className="adm-field-input"
                          type="email"
                          value={inviteForm.email}
                          onChange={(e) => {
                            setInviteForm((p) => ({
                              ...p,
                              email: e.target.value,
                            }));
                            setInviteError("");
                          }}
                          placeholder="email@example.com"
                        />
                      </div>
                      <div className="adm-field">
                        <label className="adm-field-label">Full name</label>
                        <input aria-label="Full name"
                          className="adm-field-input"
                          value={inviteForm.full_name}
                          onChange={(e) =>
                            setInviteForm((p) => ({
                              ...p,
                              full_name: e.target.value,
                            }))
                          }
                          placeholder="Optional"
                        />
                      </div>
                    </div>

                    <p className="adm-perms-label">Permissions</p>
                    <p className="adm-perms-hint">
                      You can change these at any time after inviting.
                    </p>
                    <div className="adm-perms-grid">
                      {[
                        ["can_view_call_sheet", "Call Sheet"],
                        ["can_edit_prices", "Edit Prices"],
                        ["can_approve_vets", "Approve Vets"],
                        ["can_manage_users", "Manage Users"],
                        ["can_manage_team", "Manage Team"],
                      ].map(([field, label]) => {
                        const on = !!inviteForm[field];
                        return (
                          <button
                            key={field}
                            type="button"
                            className={`adm-perm${on ? " on" : ""}`}
                            onClick={() =>
                              setInviteForm((p) => ({ ...p, [field]: !on }))
                            }
                          >
                            <span className="adm-perm-box">
                              {on && (
                                <svg aria-hidden="true"
                                  width="13"
                                  height="13"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="var(--color-white)"
                                  strokeWidth="3.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              )}
                            </span>
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {inviteError && (
                      <p role="alert" className="adm-invite-error">{inviteError}</p>
                    )}

                    <div className="adm-invite-actions">
                      <button
                        className="adm-b adm-b-outline"
                        onClick={closeInviteForm}
                      >
                        Cancel
                      </button>
                      <button
                        className="adm-b adm-b-primary"
                        onClick={inviteAdminUser}
                        disabled={inviteSaving}
                      >
                        {inviteSaving ? "Saving…" : "Add to team"}
                      </button>
                    </div>
                  </div>
                )}

                {adminUsersLoading && adminUsers.length === 0 && (
                  <p style={{ color: "var(--color-muted)", fontSize: "14px" }}>
                    Loading team…
                  </p>
                )}

                {!adminUsersLoading && adminUsers.length === 0 && (
                  <div className="adm-empty">
                    <SubInboxIcon />
                    <p>No team members yet.</p>
                  </div>
                )}

                <div className="adm-user-list">
                  {adminUsers.map((u) => {
                    const isMe = u.email === currentUserEmail;
                    const isDeactivating = teamDeactivatingId === u.id;
                    const isDeleting = teamDeletingId === u.id;
                    const canManage = adminUsers.find(
                      (a) => a.email === currentUserEmail,
                    )?.can_manage_team;
                    return (
                      <div key={u.id} className="adm-user-card">
                        <div className="adm-user-main">
                          <div
                            className={`adm-user-id${teamEditingId === u.id ? " adm-user-id-editing" : ""}`}
                          >
                            {teamEditingId === u.id ? (
                              <div className="adm-team-edit">
                                <input aria-label="Full name"
                                  className="adm-field-input"
                                  value={teamEditName}
                                  onChange={(e) =>
                                    setTeamEditName(e.target.value)
                                  }
                                  placeholder="Full name…"
                                />
                                <div className="adm-team-edit-btns">
                                  <button
                                    className="adm-b adm-b-outline"
                                    onClick={() => {
                                      setTeamEditingId(null);
                                      setTeamEditName("");
                                    }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    className="adm-b adm-b-primary"
                                    onClick={() =>
                                      updateAdminName(u.id, teamEditName)
                                    }
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="adm-user-name">
                                {u.full_name || "No name"}
                              </span>
                            )}
                            <span className="adm-user-email">{u.email}</span>
                            {u.invited_by && u.invited_by !== "system" && (
                              <span className="adm-team-invitedby">
                                Invited by: {u.invited_by}
                              </span>
                            )}
                          </div>
                          <div className="adm-user-badges">
                            {isMe && <span className="adm-team-you">You</span>}
                            <span
                              className={`adm-ustatus adm-ustatus-${u.status === "active" ? "active" : "banned"}`}
                            >
                              {u.status === "active" ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>

                        <div className="adm-team-perms">
                          <span className="adm-perms-label">Permissions</span>
                          <div className="adm-perms-grid">
                            {[
                              ["can_view_call_sheet", "Call Sheet"],
                              ["can_edit_prices", "Edit Prices"],
                              ["can_approve_vets", "Approve Vets"],
                              ["can_manage_users", "Manage Users"],
                              ["can_manage_team", "Manage Team"],
                            ].map(([field, label]) => {
                              const locked =
                                isMe && field === "can_manage_team";
                              const on = !!u[field];
                              const disabled = locked || !canManage;
                              return (
                                <button
                                  key={field}
                                  type="button"
                                  className={`adm-perm${on ? " on" : ""}${disabled ? " disabled" : ""}`}
                                  disabled={disabled}
                                  onClick={() =>
                                    updateAdminPermission(u.id, field, !on)
                                  }
                                >
                                  <span className="adm-perm-box">
                                    {on && (
                                      <svg aria-hidden="true"
                                        width="13"
                                        height="13"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="var(--color-white)"
                                        strokeWidth="3.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <path d="M20 6L9 17l-5-5" />
                                      </svg>
                                    )}
                                  </span>
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {!isMe && canManage && (
                          <div className="adm-team-actions">
                            {isDeactivating ? (
                              <div className="adm-team-confirm">
                                <span className="adm-team-confirm-q">
                                  {u.status === "active"
                                    ? "Deactivate"
                                    : "Reactivate"}{" "}
                                  {u.full_name || u.email}?
                                </span>
                                <div className="adm-team-confirm-btns">
                                  <button
                                    className="adm-b adm-b-outline"
                                    onClick={() => setTeamDeactivatingId(null)}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    className={`adm-b ${u.status === "active" ? "adm-b-danger" : "adm-b-primary"}`}
                                    onClick={() => toggleAdminStatus(u)}
                                  >
                                    {u.status === "active"
                                      ? "Deactivate"
                                      : "Reactivate"}
                                  </button>
                                </div>
                              </div>
                            ) : isDeleting ? (
                              <div className="adm-team-confirm">
                                <span className="adm-team-confirm-q">
                                  Permanently delete {u.full_name || u.email}?
                                  This can't be undone.
                                </span>
                                <div className="adm-team-confirm-btns">
                                  <button
                                    className="adm-b adm-b-outline"
                                    onClick={() => setTeamDeletingId(null)}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    className="adm-b adm-b-danger"
                                    onClick={() => deleteAdminUser(u)}
                                  >
                                    Yes, delete
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="adm-team-action-btns">
                                {teamEditingId !== u.id && (
                                  <button
                                    className="adm-b adm-b-outline"
                                    onClick={() => {
                                      closeAllTeamPanels();
                                      setTeamEditingId(u.id);
                                      setTeamEditName(u.full_name || "");
                                    }}
                                  >
                                    Edit name
                                  </button>
                                )}
                                <button
                                  className="adm-b adm-b-outline"
                                  onClick={() => {
                                    closeAllTeamPanels();
                                    setTeamDeactivatingId(u.id);
                                  }}
                                >
                                  {u.status === "active"
                                    ? "Deactivate"
                                    : "Reactivate"}
                                </button>
                                <button
                                  className="adm-b adm-b-danger"
                                  onClick={() => {
                                    closeAllTeamPanels();
                                    setTeamDeletingId(u.id);
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── SYMPTOM LOGS ── */}
            {tab === "Symptom Logs" && (
              <div id="adm-logs-section">
                <h2 className="adm-view-title">Symptom Logs</h2>
                <p className="adm-view-sub">
                  {filteredLogs.length}{" "}
                  {filteredLogs.length === 1 ? "check" : "checks"}
                </p>

                {/* Active filter chip (desktop) — removable */}
                {symptomFilter !== "all" && (
                  <div className="adm-chiprow">
                    <span
                      className="adm-chip"
                      style={{
                        background: TRIAGE_CONFIG[symptomFilter]?.bg,
                        borderColor: TRIAGE_CONFIG[symptomFilter]?.border,
                        color: TRIAGE_CONFIG[symptomFilter]?.color,
                      }}
                    >
                      {TRIAGE_CONFIG[symptomFilter]?.label || symptomFilter}
                      <button
                        className="adm-chip-x"
                        aria-label="Clear filter"
                        onClick={() => {
                          setSymptomFilter("all");
                          setLogPage(1);
                        }}
                      >
                        <svg aria-hidden="true"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={
                            TRIAGE_CONFIG[symptomFilter]?.color || "var(--color-slate)"
                          }
                          strokeWidth="3"
                          strokeLinecap="round"
                        >
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  </div>
                )}

                {/* Triage filter cards — clickable to filter by result */}
                <span className="adm-filter-label">Filter by result</span>
                <div className="adm-triage-filters">
                  {Object.entries(TRIAGE_CONFIG).map(([key, cfg]) => {
                    const count = symptomLogs.filter(
                      (s) => s.triage_result === key,
                    ).length;
                    const active = symptomFilter === key;
                    return (
                      <button
                        key={key}
                        className={`adm-triage-card${active ? " active" : ""}`}
                        style={{
                          background: active ? cfg.color : cfg.bg,
                          borderColor: active ? cfg.color : cfg.border,
                        }}
                        onClick={() => {
                          setSymptomFilter(key);
                          setLogPage(1);
                        }}
                      >
                        {active && (
                          <span className="adm-triage-check" aria-hidden="true">
                            <svg aria-hidden="true"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="var(--color-white)"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          </span>
                        )}
                        <span
                          className="adm-triage-count"
                          style={{ color: active ? "var(--color-white)" : cfg.color }}
                        >
                          {count}
                        </span>
                        <span
                          className="adm-triage-label"
                          style={{ color: active ? "var(--color-white)" : cfg.color }}
                        >
                          {cfg.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {symptomFilter !== "all" && (
                  <button
                    className="adm-clear-full"
                    onClick={() => {
                      setSymptomFilter("all");
                      setLogPage(1);
                    }}
                  >
                    Clear filter
                  </button>
                )}

                {symptomLoading && symptomLogs.length === 0 && (
                  <p style={{ color: "var(--color-muted)", fontSize: "14px" }}>Loading…</p>
                )}

                {!symptomLoading && filteredLogs.length === 0 && (
                  <div className="adm-empty">
                    <SubInboxIcon />
                    <p>No symptom checks found.</p>
                  </div>
                )}

                <div className="adm-log-list">
                  {pagedLogs.map((s) => {
                    const cfg = TRIAGE_CONFIG[s.triage_result] || {
                      color: "var(--color-muted)",
                      bg: "var(--color-cream)",
                      border: "var(--color-border)",
                      label: s.triage_result || "Unknown",
                    };
                    return (
                      <div key={s.id} className="adm-log-card">
                        <div className="adm-log-main">
                          <div className="adm-log-id">
                            <span className="adm-log-pet">
                              {s.pets?.name || "Guest"}
                            </span>
                            <span className="adm-log-species">
                              {s.pets?.species || "—"}
                            </span>
                          </div>
                          <span
                            className="adm-log-badge"
                            style={{ color: cfg.color, background: cfg.bg }}
                          >
                            {cfg.label}
                          </span>
                        </div>
                        <div className="adm-log-meta">
                          <span className="adm-log-date">
                            {formatLogDate(s.created_at)}
                          </span>
                          <span className="adm-log-time">
                            {formatLogTime(s.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {logTotalPages > 1 && (
                  <div className="adm-pager">
                    <button
                      className="adm-pager-btn"
                      disabled={logPageSafe <= 1}
                      onClick={() => goToLogPage(Math.max(1, logPageSafe - 1))}
                      aria-label="Previous page"
                    >
                      <svg aria-hidden="true"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                      Previous
                    </button>
                    <span className="adm-pager-info">
                      Page {logPageSafe} of {logTotalPages}
                    </span>
                    <button
                      className="adm-pager-btn"
                      disabled={logPageSafe >= logTotalPages}
                      onClick={() =>
                        goToLogPage(Math.min(logTotalPages, logPageSafe + 1))
                      }
                      aria-label="Next page"
                    >
                      Next
                      <svg aria-hidden="true"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}

            {tab === "Waitlist" && (
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h2 className="adm-view-title">Waitlist</h2>
                    <p className="adm-view-sub">
                      {waitlist.length}{" "}
                      {waitlist.length === 1 ? "signup" : "signups"}
                    </p>
                  </div>
                  {waitlist.length > 0 && (
                    <button
                      className="adm-wl-export"
                      onClick={exportWaitlistCsv}
                    >
                      Export CSV
                    </button>
                  )}
                </div>

                {waitlistLoading ? (
                  <p className="adm-view-sub">Loading…</p>
                ) : waitlist.length === 0 ? (
                  <p className="adm-view-sub">No signups yet.</p>
                ) : (
                  <div className="adm-wl-table">
                    <div className="adm-wl-head">
                      <span>Email</span>
                      <span>Signed up</span>
                      <span>Source</span>
                    </div>
                    {waitlist.map((w) => (
                      <div className="adm-wl-row" key={w.id}>
                        <span className="adm-wl-email">{w.email}</span>
                        <span className="adm-wl-date">
                          {w.created_at
                            ? new Date(w.created_at).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )
                            : "—"}
                        </span>
                        <span className="adm-wl-source">{w.source || "—"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Unsaved Prices Modal ── */}
      {unsavedModal && (
        <>
          <div
            onClick={() => setUnsavedModal(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgb(var(--color-black-rgb) / 0.4)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              zIndex: 600,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              zIndex: 700,
              background: "var(--color-white)",
              borderRadius: "16px",
              padding: "24px",
              width: "min(400px, 90vw)",
              boxShadow: "0 8px 32px rgb(var(--color-navy-deeper-rgb) / 0.18)",
              fontFamily: "'Urbanist', sans-serif",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                margin: "0 0 8px 0",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "var(--color-navy-dark)",
                }}
              >
                Unsaved changes
              </p>
              <button
                type="button"
                aria-label="Keep editing"
                onClick={() => setUnsavedModal(null)}
                style={{
                  width: "32px",
                  height: "32px",
                  flexShrink: 0,
                  border: "none",
                  background: "transparent",
                  color: "var(--color-muted)",
                  cursor: "pointer",
                  borderRadius: "8px",
                  fontSize: "22px",
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "-4px -6px 0 8px",
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--color-cream)";
                  e.currentTarget.style.color = "var(--color-navy-dark)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--color-muted)";
                }}
              >
                &times;
              </button>
            </div>
            <p
              style={{
                margin: "0 0 22px 0",
                fontSize: "15px",
                fontWeight: 500,
                color: "var(--color-slate)",
                lineHeight: 1.5,
              }}
            >
              {unsavedModal.message}
            </p>
            <div
              className="adm-unsaved-actions"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                className="adm-b adm-b-outline"
                onClick={() => setUnsavedModal(null)}
              >
                Keep editing
              </button>
              <button
                className="adm-b adm-b-danger"
                onClick={() => {
                  unsavedModal.action();
                  setUnsavedModal(null);
                }}
              >
                Discard &amp; continue
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Global Notes Panel ── */}
      <GlobalNotesPanel
        showAllNotes={showAllNotes}
        setShowAllNotes={setShowAllNotes}
        allCallNotes={allCallNotes}
        allNotesLoading={allNotesLoading}
        allNotesEditingId={allNotesEditingId}
        setAllNotesEditingId={setAllNotesEditingId}
        allNotesEditingText={allNotesEditingText}
        setAllNotesEditingText={setAllNotesEditingText}
        allNotesDeletingId={allNotesDeletingId}
        setAllNotesDeletingId={setAllNotesDeletingId}
        showNewNote={showNewNote}
        setShowNewNote={setShowNewNote}
        newNoteText={newNoteText}
        setNewNoteText={setNewNoteText}
        newNoteVetId={newNoteVetId}
        setNewNoteVetId={setNewNoteVetId}
        newNoteVetName={newNoteVetName}
        setNewNoteVetName={setNewNoteVetName}
        newNoteVetSearch={newNoteVetSearch}
        setNewNoteVetSearch={setNewNoteVetSearch}
        newNoteSaving={newNoteSaving}
        saveGlobalNote={saveGlobalNote}
        updateCallNote={updateCallNote}
        deleteCallNote={deleteCallNote}
        jumpToVet={jumpToVet}
        vetOptions={vets}
        formatLogDate={formatLogDate}
      />

      {/* Floating action buttons */}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "19px",
          zIndex: 300,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => {
            // Closing is always fine.
            if (showAllNotes) {
              setShowAllNotes(false);
              return;
            }
            // Opening with unsaved changes: warn first (one editing context at a time).
            const openNotes = () => {
              closeAllEditors();
              setShowAllNotes(true);
              fetchAllCallNotes();
            };
            if (hasUnsavedChanges()) {
              setUnsavedModal({
                message:
                  "You have unsaved changes. Open notes anyway? Your changes won't be saved.",
                action: openNotes,
              });
              return;
            }
            openNotes();
          }}
          className="scroll-arrow-btn"
          style={{ fontSize: "18px" }}
          title="Call Notes"
        >
          <svg aria-hidden="true"
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 2v4M16 2v4M4 8h16M4 6a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
            <path d="M8 12h8M8 16h5" />
          </svg>
        </button>
        <button
          className="scroll-arrow-btn"
          onClick={() => window.scrollTo({ top: 0, behavior: smoothScroll() })}
          title="Scroll to top"
        >
          <svg aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>
        <button
          className="scroll-arrow-btn"
          onClick={() =>
            window.scrollTo({
              top: document.body.scrollHeight,
              behavior: smoothScroll(),
            })
          }
          title="Scroll to bottom"
        >
          <svg aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
      {showAllNotes && (
        <div
          onClick={() => setShowAllNotes(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgb(var(--color-black-rgb) / 0.3)",
            zIndex: 400,
          }}
        />
      )}
    </>
  );
}
