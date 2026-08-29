// ============================================================================
// heroFlipCard.js — builds a two-sided Hero "trading card" (front + back) that
// matches the live website card's look. Used for:
//   • the interactive FLIP on the shared web link (CSS 3D flip)
//   • the static DOWNLOAD image (both faces captured side by side)
// Both faces are locked to the SAME width and the SAME height (the taller of
// the two) so the flip looks right and the download is even.
// ============================================================================

import { toPng } from "html-to-image";

// ── shared constants (match the real card) ─────────────────────────────────
const RARITY_TIERS = {
  common: { label: "Beloved", color: "#8A94A6" },
  uncommon: { label: "Special", color: "#16A34A" },
  rare: { label: "Rare", color: "#2563EB" },
  epic: { label: "Epic", color: "#9333EA" },
  legendary: { label: "Legendary", color: "#F59E0B" },
};
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
const GOLD = "#EFC88B";
const DEFAULT_BG = "#1A2D44";
const DEFAULT_CARD = "#172531";
const DEFAULT_ACCENT = "#6B3FCB";
const CARD_W = 380;

// ── color helpers (capture-safe hex/rgb, no color-mix) ──────────────────────
function hexToRgb(hex) {
  if (!hex) return { r: 0, g: 0, b: 0 };
  let h = hex.replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgba(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function lighten(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  const f = (c) => Math.round(c + (255 - c) * amt);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function darken(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  const f = (c) => Math.round(c * (1 - amt));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
function asArray(v) {
  return Array.isArray(v) ? v.filter((x) => x && String(x).trim()) : [];
}
function meaningful(v) {
  return v != null && String(v).trim() !== "";
}
function el(tag, styles, text) {
  const e = document.createElement(tag);
  if (styles) Object.assign(e.style, styles);
  if (text != null) e.textContent = text;
  return e;
}
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
// Wall-to-wall footer pinned to the bottom of a flex-column face.
// The border spans the full card width; the text is padded inside.
function buildFooter(theme) {
  const { accentOnCard, muted, card, divider, introFooter } = theme;
  const footerInk = introFooter || accentOnCard;
  const footer = el("div", {
    marginTop: "auto", // pin to bottom
    borderTop: `1px solid ${divider}`,
    padding: "16px 22px",
    fontSize: "13px",
    fontWeight: "700",
    color: muted,
    background: card,
    position: "relative",
    zIndex: "2",
  });
  const made = el("span", null, "Made on ");
  made.appendChild(el("b", { color: footerInk }, "PetParrk"));
  // Paw as an inline SVG so it takes the SAME color as "PetParrk" (an emoji
  // can't be recolored). This is the EXACT lucide "PawPrint" icon (stroke-based,
  // 3 toe circles + pad) so it matches the hero card's <PawPrint> component.
  made.appendChild(document.createTextNode(" "));
  const pawNS = "http://www.w3.org/2000/svg";
  const paw = document.createElementNS(pawNS, "svg");
  paw.setAttribute("width", "13");
  paw.setAttribute("height", "13");
  paw.setAttribute("viewBox", "0 0 24 24");
  paw.setAttribute("fill", "none");
  paw.setAttribute("stroke", footerInk);
  paw.setAttribute("stroke-width", "2.5");
  paw.setAttribute("stroke-linecap", "round");
  paw.setAttribute("stroke-linejoin", "round");
  paw.style.verticalAlign = "middle";
  paw.style.display = "inline-block";
  // 3 toe circles
  [
    ["11", "4"],
    ["18", "8"],
    ["20", "16"],
  ].forEach(([cx, cy]) => {
    const c = document.createElementNS(pawNS, "circle");
    c.setAttribute("cx", cx);
    c.setAttribute("cy", cy);
    c.setAttribute("r", "2");
    paw.appendChild(c);
  });
  // pad
  const pad = document.createElementNS(pawNS, "path");
  pad.setAttribute(
    "d",
    "M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z",
  );
  paw.appendChild(pad);
  made.appendChild(paw);
  footer.appendChild(made);
  return footer;
}

function fmtDate(d) {
  if (!d) return "";
  try {
    // Parse at local noon to avoid timezone day-shift (matches hero card).
    const dt = new Date(`${d}T12:00:00`);
    if (isNaN(dt.getTime())) return "";
    return dt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

// Award icon (lucide) as inline SVG, gold — matches the real rarity badge.
function awardSvg() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", "12");
  svg.setAttribute("height", "12");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", GOLD);
  svg.setAttribute("stroke-width", "2.5");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const circle = document.createElementNS(ns, "circle");
  circle.setAttribute("cx", "12");
  circle.setAttribute("cy", "8");
  circle.setAttribute("r", "6");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", "M15.477 12.89 17 22l-5-3-5 3 1.523-9.11");
  svg.appendChild(circle);
  svg.appendChild(path);
  return svg;
}

// ── background layer (mirrors the real HeroBackground) ──────────────────────
// CSS designs are reproduced with capture-safe CSS. Vanta (animated WebGL)
// can't be captured, so for the static image we use a color-matched gradient.
function buildBgLayer(data, theme, forImage) {
  const { bg, accent } = theme;
  const design = data.hero_bg_design || "gradient";
  const category = data.hero_bg_category || "vanta";
  const layer = el("div", { position: "absolute", inset: "0" });

  const cssGradient = () => {
    layer.style.background = `linear-gradient(155deg, ${lighten(bg, 0.18)} 0%, ${lighten(bg, 0.06)} 30%, ${accent} 82%, ${darken(accent, 0.25)} 100%)`;
  };

  if (category === "css") {
    switch (design) {
      case "dots":
        layer.style.background = bg;
        layer.style.backgroundImage = `radial-gradient(${rgba("#FFFFFF", 0.07)} 1.5px, transparent 1.5px)`;
        layer.style.backgroundSize = "20px 20px";
        break;
      case "mesh-grad":
        layer.style.background = `radial-gradient(at 16% 20%, ${accent} 0px, transparent 46%), radial-gradient(at 84% 26%, ${lighten(bg, 0.2)} 0px, transparent 44%), radial-gradient(at 50% 86%, ${lighten(accent, 0.3)} 0px, transparent 50%), radial-gradient(at 12% 80%, ${lighten(bg, 0.1)} 0px, transparent 46%), ${bg}`;
        break;
      case "stripes":
        layer.style.background = bg;
        layer.style.backgroundImage = `repeating-linear-gradient(45deg, ${rgba("#FFFFFF", 0.05)} 0 12px, transparent 12px 28px)`;
        break;
      default:
        cssGradient();
    }
  } else {
    // Vanta or unknown → color-matched gradient stand-in for the static image.
    cssGradient();
  }
  return layer;
}

// ── FRONT face ──────────────────────────────────────────────────────────────
function buildFront(pet, data, theme) {
  const { bg, card, accent, accentLite, accentOnCard, bannerText, ink, muted } =
    theme;
  const face = el("div", {
    width: CARD_W + "px",
    borderRadius: "22px",
    overflow: "hidden",
    position: "relative",
    fontFamily: "'Urbanist',-apple-system,sans-serif",
    boxSizing: "border-box",
    background: card,
    flex: "0 0 auto",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 18px 44px rgba(0,0,0,0.35)",
    border: `2px solid ${rgba(accent, 0.55)}`,
    zIndex: "1",
  });
  const cardSurface = face; // content goes directly on the solid card face

  // Photo + nameplate
  const photoH = 360;
  const photo = el("div", {
    position: "relative",
    width: "100%",
    height: photoH + "px",
    overflow: "hidden",
  });
  if (pet.photo_url) {
    const img = el("img", {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    });
    img.crossOrigin = "anonymous";
    img.src = pet.photo_url;
    photo.appendChild(img);
  } else {
    photo.appendChild(
      el(
        "div",
        {
          width: "100%",
          height: "100%",
          background: `linear-gradient(135deg, ${accent}, ${accentLite})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "110px",
        },
        "🐾",
      ),
    );
  }

  // nameplate overlaid on photo bottom
  const nameplate = el("div", {
    position: "absolute",
    left: "0",
    right: "0",
    bottom: "0",
    zIndex: "3",
    padding: "54px 20px 20px",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    background: "linear-gradient(to top, rgba(23,37,49,0.94) 25%, transparent)",
  });
  const rarity = data.hero_rarity ? RARITY_TIERS[data.hero_rarity] : null;
  if (rarity) {
    const badge = el("div", {
      alignSelf: "flex-start",
      display: "inline-flex",
      alignItems: "center",
      gap: "5px",
      height: "24px",
      padding: "0 11px 0 9px",
      marginBottom: "10px",
      lineHeight: "1",
      color: "#fff",
      fontSize: "11px",
      fontWeight: "800",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      borderRadius: "999px",
      background: rarity.color,
      backgroundImage:
        "linear-gradient(160deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0) 42%), linear-gradient(340deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0) 50%)",
      textShadow: "0 1px 1px rgba(0,0,0,0.3)",
      boxShadow:
        "0 2px 8px rgba(0,0,0,0.3), 0 0 0 1.5px rgba(255,255,255,0.85)",
    });
    badge.appendChild(awardSvg());
    badge.appendChild(document.createTextNode(rarity.label));
    nameplate.appendChild(badge);
  }
  nameplate.appendChild(
    el(
      "div",
      {
        fontSize: "34px",
        fontWeight: "800",
        lineHeight: "1",
        letterSpacing: "-0.02em",
      },
      pet.name || "Unnamed",
    ),
  );
  if (meaningful(data.nickname)) {
    nameplate.appendChild(
      el(
        "div",
        {
          fontSize: "16px",
          fontWeight: "600",
          fontStyle: "italic",
          color: GOLD,
        },
        `aka "${data.nickname}"`,
      ),
    );
  }
  if (meaningful(pet.breed)) {
    nameplate.appendChild(
      el(
        "div",
        {
          fontSize: "15px",
          fontWeight: "500",
          color: "rgba(255,255,255,0.85)",
        },
        pet.breed,
      ),
    );
  }
  // Public share pages receive a coarsened `age` string from
  // get_pet_for_hero_token — the raw birthday never leaves the DB. Owner-facing
  // renders have the real column and format it here, as before.
  const age = pet.age ?? formatAge(pet.birthday);
  if (age) {
    nameplate.appendChild(
      el(
        "div",
        {
          fontSize: "15px",
          fontWeight: "500",
          color: "rgba(255,255,255,0.7)",
          marginTop: "2px",
        },
        age,
      ),
    );
  }
  photo.appendChild(nameplate);

  // content area below photo (stats etc.) — banner is separate, full-width.
  const content = el("div", {
    position: "relative",
    zIndex: "2",
    background: card,
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  });
  const stats = asArray(data.hero_stats);
  if (stats.length) {
    const sw = el("div", {
      display: "flex",
      flexDirection: "column",
      gap: "15px",
    });
    stats.forEach((s) => {
      const row = el("div", {
        display: "flex",
        alignItems: "center",
        gap: "12px",
      });
      const nm = el("div", {
        flex: "0 0 120px",
        fontSize: "14px",
        fontWeight: "600",
        color: ink,
        display: "flex",
        alignItems: "flex-start",
        gap: "6px",
      });
      nm.appendChild(el("span", { flex: "0 0 auto" }, s.emoji || "⭐"));
      nm.appendChild(
        el(
          "span",
          { flex: "1 1 auto", minWidth: "0", lineHeight: "1.3" },
          s.label || "",
        ),
      );
      row.appendChild(nm);
      const bar = el("div", {
        flex: "1",
        height: "11px",
        background: rgba("#FFFFFF", 0.12),
        borderRadius: "999px",
        overflow: "hidden",
      });
      const val = Math.max(0, Math.min(10, Number(s.value) || 0));
      bar.appendChild(
        el("div", {
          height: "100%",
          width: val * 10 + "%",
          borderRadius: "999px",
          background: `linear-gradient(90deg, ${accent}, ${accentLite})`,
        }),
      );
      row.appendChild(bar);
      const isMax = val >= 10;
      const valEl = el("div", {
        flex: "0 0 auto",
        minWidth: "36px",
        textAlign: "right",
        fontSize: "14px",
        fontWeight: "800",
        color: isMax ? accentOnCard : muted,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "3px",
      });
      if (isMax)
        valEl.appendChild(el("span", { color: GOLD, fontSize: "11px" }, "★"));
      valEl.appendChild(document.createTextNode(`${val}/10`));
      row.appendChild(valEl);
      sw.appendChild(row);
    });
    content.appendChild(sw);
  }

  // Personality + Badges on the front (fills space, matches real card order:
  // Stats → Personality → Badges). Chip rows, same styling as the back.
  const frontChip = {
    display: "inline-flex",
    fontSize: "13px",
    fontWeight: "600",
    padding: "5px 12px",
    borderRadius: "999px",
    background: theme.chipBg,
    color: ink,
    border: `1px solid ${theme.cardBorder}`,
    lineHeight: "1.2",
  };
  const frontSecTitle = (t) =>
    el(
      "div",
      {
        fontSize: "13px",
        fontWeight: "800",
        color: accentOnCard,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        margin: "0 0 10px",
      },
      t,
    );
  const frontChipRow = (arr, style) => {
    const w = el("div", { display: "flex", flexWrap: "wrap", gap: "8px" });
    arr.forEach((t) => w.appendChild(el("span", style, t)));
    return w;
  };
  const frontDivider = () =>
    el("div", { height: "1px", background: theme.divider });

  const personality = asArray(data.personality_traits);
  if (personality.length) {
    content.appendChild(frontDivider());
    const s = el("div", null);
    s.appendChild(frontSecTitle("Personality"));
    s.appendChild(frontChipRow(personality, frontChip));
    content.appendChild(s);
  }
  const tags = asArray(data.identity_tags)
    .map((t) => TAG_META[t])
    .filter(Boolean);
  if (tags.length) {
    content.appendChild(frontDivider());
    const s = el("div", null);
    s.appendChild(frontSecTitle("Badges"));
    const w = el("div", { display: "flex", flexWrap: "wrap", gap: "8px" });
    tags.forEach((t) => {
      const chip = el("span", {
        ...frontChip,
        alignItems: "center",
        gap: "5px",
      });
      if (t.emoji) chip.appendChild(el("span", null, t.emoji));
      chip.appendChild(document.createTextNode(t.label));
      w.appendChild(chip);
    });
    s.appendChild(w);
    content.appendChild(s);
  }

  cardSurface.appendChild(photo);
  // Title banner: directly under the photo, full width (like the hero card).
  if (meaningful(data.hero_title)) {
    cardSurface.appendChild(
      el(
        "div",
        {
          position: "relative",
          zIndex: "2",
          color: bannerText,
          textAlign: "center",
          padding: "13px 20px",
          fontSize: "18px",
          fontWeight: "800",
          letterSpacing: "-0.01em",
          background: accent,
        },
        data.hero_title,
      ),
    );
  }
  cardSurface.appendChild(content);
  cardSurface.appendChild(buildFooter(theme));
  return face;
}

// ── BACK face ───────────────────────────────────────────────────────────────
function buildBack(pet, data, theme) {
  const { card, accent, accentLite, accentOnCard, ink, muted } = theme;
  const face = el("div", {
    width: CARD_W + "px",
    borderRadius: "22px",
    overflow: "hidden",
    position: "relative",
    fontFamily: "'Urbanist',-apple-system,sans-serif",
    boxSizing: "border-box",
    background: card,
    flex: "0 0 auto",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 18px 44px rgba(0,0,0,0.35)",
    border: `2px solid ${rgba(accent, 0.55)}`,
    zIndex: "1",
  });
  const cardSurface = face;

  const inner = el("div", {
    position: "relative",
    zIndex: "2",
    padding: "24px 22px",
    display: "flex",
    flexDirection: "column",
    background: card,
    flex: "1 1 auto",
  });

  const secTitle = (t) =>
    el(
      "div",
      {
        fontSize: "13px",
        fontWeight: "800",
        color: accentOnCard,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        margin: "0 0 10px",
      },
      t,
    );
  const divider = () =>
    el("div", { height: "1px", background: theme.divider, margin: "0 0 18px" });

  const baseChip = {
    display: "inline-flex",
    fontSize: "13px",
    fontWeight: "600",
    padding: "5px 12px",
    borderRadius: "999px",
    background: theme.chipBg,
    color: ink,
    border: `1px solid ${theme.cardBorder}`,
    lineHeight: "1.2",
  };
  // Mirror the hero card's chip styling exactly:
  //   background: color-mix(srgb, color 14%, card)
  //   border:     color at 55% alpha
  //   text:       --t-card-text (white) — same as other chips
  const mixInto = (c, pct) => {
    const [r1, g1, b1] = tcToRgb(c);
    const [r2, g2, b2] = tcToRgb(card);
    const f = pct / 100;
    return `rgb(${Math.round(r1 * f + r2 * (1 - f))}, ${Math.round(
      g1 * f + g2 * (1 - f),
    )}, ${Math.round(b1 * f + b2 * (1 - f))})`;
  };
  const tint = (base, c) => ({
    ...base,
    background: mixInto(c, 14),
    border: `1px solid ${rgba(c, 0.55)}`,
    color: ink,
  });
  const chipRow = (arr, style) => {
    const w = el("div", { display: "flex", flexWrap: "wrap", gap: "8px" });
    arr.forEach((t) => w.appendChild(el("span", style, t)));
    return w;
  };

  const chipSec = (title, node) => {
    const s = el("div", { marginBottom: "18px" });
    s.appendChild(secTitle(title));
    s.appendChild(node);
    inner.appendChild(s);
    inner.appendChild(divider());
  };
  const textSec = (title, body, textColor) => {
    const s = el("div", { marginBottom: "18px" });
    s.appendChild(secTitle(title));
    s.appendChild(
      el(
        "div",
        {
          fontSize: "14px",
          lineHeight: "1.6",
          color: textColor || ink,
          fontWeight: "500",
          whiteSpace: "pre-wrap",
        },
        body,
      ),
    );
    inner.appendChild(s);
    inner.appendChild(divider());
  };

  // header
  inner.appendChild(
    el(
      "div",
      {
        fontSize: "20px",
        fontWeight: "800",
        color: ink,
        marginBottom: "4px",
        letterSpacing: "-0.01em",
      },
      `${pet.name || "Pet"}`,
    ),
  );
  inner.appendChild(
    el(
      "div",
      {
        fontSize: "12px",
        fontWeight: "600",
        color: muted,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        marginBottom: "16px",
      },
      "The full story",
    ),
  );
  inner.appendChild(divider());

  if (meaningful(data.hero_description))
    textSec("About", data.hero_description, muted);

  const loves = asArray(data.loves);
  if (loves.length)
    chipSec("Loves", chipRow(loves, tint(baseChip, theme.lovesColor)));

  const dislikes = asArray(data.dislikes);
  if (dislikes.length)
    chipSec(
      "Not a fan",
      chipRow(dislikes, tint(baseChip, theme.dislikesColor)),
    );

  const foods = asArray(data.favorite_foods);
  if (foods.length)
    chipSec("Favorite foods", chipRow(foods, tint(baseChip, theme.foodsColor)));
  if (meaningful(data.food_quirks)) textSec("Food quirks", data.food_quirks);

  if (meaningful(data.fun_fact)) {
    const s = el("div", { marginBottom: "18px" });
    s.appendChild(secTitle("Fun fact"));
    const body = el("div", {
      fontSize: "14px",
      lineHeight: "1.55",
      color: ink,
      fontWeight: "500",
    });
    const q1 = el("span", { color: accentOnCard, fontWeight: "800" }, "\u201C");
    const q2 = el("span", { color: accentOnCard, fontWeight: "800" }, "\u201D");
    body.appendChild(q1);
    body.appendChild(document.createTextNode(data.fun_fact));
    body.appendChild(q2);
    s.appendChild(body);
    inner.appendChild(s);
    inner.appendChild(divider());
  }

  if (meaningful(data.rescue_story)) {
    const s = el("div", { marginBottom: "18px" });
    s.appendChild(secTitle("My story"));
    s.appendChild(
      el(
        "div",
        {
          fontSize: "14px",
          lineHeight: "1.6",
          color: ink,
          fontWeight: "500",
          whiteSpace: "pre-wrap",
        },
        data.rescue_story,
      ),
    );
    if (meaningful(data.rescue_organization)) {
      const org = el("div", {
        fontSize: "13px",
        fontWeight: "600",
        color: muted,
        marginTop: "8px",
      });
      org.appendChild(document.createTextNode("Adopted from: "));
      org.appendChild(
        el("span", { color: ink, fontWeight: "700" }, data.rescue_organization),
      );
      s.appendChild(org);
    }
    inner.appendChild(s);
    inner.appendChild(divider());
  }

  const hasMemorial =
    meaningful(data.memorial_message) ||
    meaningful(data.birth_date) ||
    meaningful(data.passing_date);
  if (hasMemorial) {
    const s = el("div", { marginBottom: "8px" });
    s.appendChild(secTitle("In Loving Memory"));
    if (meaningful(data.memorial_message)) {
      s.appendChild(
        el(
          "div",
          {
            fontSize: "15px",
            fontWeight: "500",
            fontStyle: "italic",
            lineHeight: "1.55",
            color: ink,
            whiteSpace: "pre-wrap",
          },
          data.memorial_message,
        ),
      );
    }
    const dl = [fmtDate(data.birth_date), fmtDate(data.passing_date)]
      .filter(Boolean)
      .join(" – ");
    if (dl) {
      s.appendChild(
        el(
          "div",
          {
            fontSize: "14px",
            fontWeight: "600",
            color: muted,
            marginTop: "8px",
          },
          dl,
        ),
      );
    }
    inner.appendChild(s);
  }

  cardSurface.appendChild(inner);
  cardSurface.appendChild(buildFooter(theme));
  return face;
}

// ── theme derivation (from the pet's real colors) ───────────────────────────
// ── color math copied EXACTLY from the hero card (HeroCardView) so the flip
//    card's theme values are byte-identical. Do not "simplify" these.
function tcToRgb(hex) {
  const h = (hex || "#000000").replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
function tcToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.max(0, Math.min(255, Math.round(v)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
function tcLum(hex) {
  const c = tcToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function tcContrast(a, b) {
  const la = tcLum(a);
  const lb = tcLum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function tcMix(hex, target, t) {
  const [r, g, b] = tcToRgb(hex);
  const [tr, tg, tb] = tcToRgb(target);
  return tcToHex(r + (tr - r) * t, g + (tg - g) * t, b + (tb - b) * t);
}
function tcEnsureContrast(color, bg, ratio = 4.5) {
  if (tcContrast(color, bg) >= ratio) return color;
  const target = tcLum(bg) > 0.4 ? "#000000" : "#FFFFFF";
  let best = color;
  for (let t = 0.1; t <= 1; t += 0.1) {
    const candidate = tcMix(color, target, t);
    if (tcContrast(candidate, bg) >= ratio) return candidate;
    best = candidate;
  }
  return best;
}

function deriveTheme(data) {
  const bg = data.hero_bg_color || DEFAULT_BG;
  const card = data.hero_card_color || DEFAULT_CARD;
  const accent = data.hero_accent_color || DEFAULT_ACCENT;

  const cardIsDark = tcLum(card) < 0.4;
  const bgIsDark = tcLum(bg) < 0.4;

  // EXACT mirrors of HeroCardView's theme vars:
  const cardText = cardIsDark ? "#FFFFFF" : "#172531"; // --t-card-text
  const cardMuted = cardIsDark
    ? "rgba(255,255,255,0.66)"
    : "rgba(23,37,49,0.60)"; // --t-card-muted
  const bgText = bgIsDark ? "#FFFFFF" : "#172531"; // --t-bg-text
  const bgMuted = bgIsDark ? "rgba(255,255,255,0.72)" : "rgba(23,37,49,0.62)"; // --t-bg-muted
  // Intro / framing color override — mirrors HeroCardView. Colors "Meet X", the
  // subtitle, and the "Made on PetParrk" brand. Empty/unset = AUTO.
  const introOverride =
    data.hero_intro_color && String(data.hero_intro_color).trim()
      ? data.hero_intro_color
      : null;
  // "Meet X" heading has its own color (hero_name_color), separate from intro.
  const nameOverride =
    data.hero_name_color && String(data.hero_name_color).trim()
      ? data.hero_name_color
      : null;
  const introName = nameOverride || bgText;
  const introSub = introOverride
    ? `rgba(${tcToRgb(introOverride).join(",")},0.75)`
    : bgMuted;
  // Footer "Made on PetParrk" tint: follows the intro override (contrast-fitted
  // to the card), else the default accent-on-card.
  // Footer accent has its own color (hero_footer_color), else intro, else accent.
  const footerOverride =
    data.hero_footer_color && String(data.hero_footer_color).trim()
      ? data.hero_footer_color
      : introOverride;
  const introFooter = footerOverride
    ? tcEnsureContrast(footerOverride, card, 4.5)
    : null;
  const accentOnCard = tcEnsureContrast(accent, card, 4.5); // --t-accent-on-card
  const accentOnBg = tcEnsureContrast(accent, bg, 4.5); // --t-accent-on-bg
  // "Hero Card" eyebrow label color — EXACT mirror of HeroCardView's --t-label.
  // Option B: render the owner's exact chosen color (no contrast adjustment),
  // so the flip/share card matches the hero card and the editor pick exactly.
  const labelColor = data.hero_label_color || data.hero_accent_color || accent; // --t-label
  // Pick whichever of white/navy contrasts a surface better (for button text).
  const pickReadable = (surface) =>
    tcContrast("#FFFFFF", surface) >= tcContrast("#172531", surface)
      ? "#FFFFFF"
      : "#172531";
  const textOnAccentOnBg = pickReadable(accentOnBg); // text on the filled button
  const btnOutlineOnBg = pickReadable(bg); // outline/text on the page bg
  const bannerText = tcLum(accent) > 0.5 ? "#172531" : "#FFFFFF"; // --t-banner-text
  const accentLite = tcMix(accent, "#FFFFFF", 0.34); // stat-fill lighten
  const chipBg = cardIsDark ? "rgba(255,255,255,0.10)" : "rgba(23,37,49,0.05)"; // --t-chip-bg
  const cardBorder = cardIsDark
    ? "rgba(255,255,255,0.14)"
    : "rgba(23,37,49,0.10)"; // --t-card-border
  const divider = "rgba(156,163,175,0.30)"; // --t-divider (#9CA3AF) softened
  const lovesColor = tcEnsureContrast("#16A34A", card, 4.5);
  const dislikesColor = tcEnsureContrast("#EF4444", card, 4.5);
  const foodsColor = tcEnsureContrast("#0891B2", card, 4.5);
  const frame = `rgba(${tcToRgb(accent).join(",")},0.55)`; // --t-frame

  // ── Intro scrim — EXACT mirror of HeroCardView's scrim so the flip/share page
  // darkens behind the "Hero Card / Meet X / subtitle" block the same way. The
  // token page previously used a hardcoded dark gradient, which didn't match.
  const scrimDesign = data.hero_bg_design || "gradient";
  const scrimCategory = data.hero_bg_category || "vanta";
  // Busy/patterned designs (mirror BUSY_DESIGNS in HeroBackgrounds).
  const BUSY = new Set([
    "dots",
    "stripes",
    "weave",
    "concentric",
    "metallic",
    "maze",
  ]);
  const bgBusy = scrimCategory === "vanta" || BUSY.has(scrimDesign);
  const cVsBg = tcContrast(bgText, bg);
  const cVsAccent = tcContrast(bgText, accent);
  const effContrast = bgBusy ? Math.min(cVsBg, cVsAccent) : cVsBg;
  const deficit = Math.max(0, Math.min(1, (4.5 - effContrast) / (4.5 - 2.0)));
  const isPatterned = scrimCategory === "vanta" || scrimCategory === "css";
  const needsScrim = isPatterned || deficit > 0.02;
  const SCRIM_BASE_BUSY_CEIL = 0.85;
  const SCRIM_BASE_SOLID_CEIL = 0.6;
  const SCRIM_BASE_BUSY_FLOOR = 0.55;
  const DARK_SCRIM_RATIO = 0.55;
  const scrimScale = bgIsDark ? DARK_SCRIM_RATIO : 1;
  const maxScrim =
    (bgBusy ? SCRIM_BASE_BUSY_CEIL : SCRIM_BASE_SOLID_CEIL) * scrimScale;
  const rawAlpha = deficit * maxScrim;
  const LIGHT_BUSY_FLOOR = 0.88;
  const busyFloor = bgIsDark
    ? SCRIM_BASE_BUSY_FLOOR * scrimScale
    : LIGHT_BUSY_FLOOR;
  // Manual per-design scrim multiplier from the lighting controls.
  const scrimLighting = (() => {
    const raw = data.hero_lighting;
    if (!raw) return 1;
    try {
      const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
      return obj?.[scrimDesign]?.scrim ?? 1;
    } catch {
      return 1;
    }
  })();
  const baseAlpha = isPatterned ? Math.max(rawAlpha, busyFloor) : rawAlpha;
  const scrimAlpha = Math.max(
    0,
    Math.min(1, baseAlpha * scrimLighting),
  ).toFixed(3);
  const scrimBase = bgIsDark
    ? tcMix(card, "#0B131A", 0.95)
    : tcMix(card, "#FFFFFF", 0.55);
  const sb = tcToRgb(scrimBase);
  const scrimColor = needsScrim
    ? `rgba(${sb[0]},${sb[1]},${sb[2]},${scrimAlpha})`
    : "transparent";

  return {
    bg,
    card,
    accent,
    accentLite,
    accentOnCard,
    accentOnBg,
    labelColor,
    textOnAccentOnBg,
    btnOutlineOnBg,
    bannerText,
    bgText,
    bgMuted,
    introName,
    introSub,
    introFooter,
    // Adaptive shadow for the "Make your own on PetParrk" brand text on the page
    // background: a DARK shadow when the bg is light (so light text/edges read),
    // a LIGHT shadow when the bg is dark. Gives separation without a scrim/pill.
    brandShadow: bgIsDark
      ? "0 1px 8px rgba(255,255,255,0.45)"
      : "0 1px 6px rgba(0,0,0,0.55)",
    ink: cardText, // white (#FFFFFF) on dark cards — matches --t-card-text
    muted: cardMuted, // --t-card-muted
    chipBg,
    cardBorder,
    divider,
    lovesColor,
    dislikesColor,
    foodsColor,
    frame,
    scrimColor,
  };
}

// ── build both faces, locked to equal height ────────────────────────────────
// Returns { front, back, height }. Caller must have them in the DOM to measure.
function equalizeHeights(front, back) {
  const h = Math.max(front.offsetHeight, back.offsetHeight);
  front.style.height = h + "px";
  back.style.height = h + "px";
  return h;
}

// ============================================================================
// PUBLIC: download the two faces as a single side-by-side PNG.
// ============================================================================
export async function exportHeroFlipImage(pet) {
  if (typeof window === "undefined" || !pet) return;
  const pub = pet.hero_published || null;
  const data = pub ? { ...pet, ...pub } : pet;
  const theme = deriveTheme(data);

  const overlay = el("div", {
    position: "fixed",
    inset: "0",
    zIndex: "2147483646",
    background: "rgba(20,20,25,0.86)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontFamily: "'Urbanist',-apple-system,sans-serif",
    fontSize: "16px",
    fontWeight: "700",
  });
  overlay.appendChild(el("div", null, "Preparing your card…"));

  const stage = el("div", {
    position: "fixed",
    left: "0",
    top: "0",
    zIndex: "2147483645",
    display: "flex",
    alignItems: "flex-start",
    gap: "30px",
    padding: "40px",
    overflow: "hidden",
  });
  // The chosen hero background fills the whole canvas behind both cards.
  const stageBg = buildBgLayer(data, theme, true);
  stageBg.style.zIndex = "0";
  stage.appendChild(stageBg);
  const front = buildFront(pet, data, theme);
  const back = buildBack(pet, data, theme);
  stage.appendChild(front);
  stage.appendChild(back);
  document.body.appendChild(stage);
  document.body.appendChild(overlay);

  try {
    const img = front.querySelector("img");
    if (img && !img.complete) {
      await new Promise((res) => {
        img.onload = res;
        img.onerror = res;
        setTimeout(res, 3000);
      });
    }
    await new Promise((r) => requestAnimationFrame(() => r()));
    await new Promise((r) => setTimeout(r, 200));

    // Lock both faces to equal height for an even download.
    equalizeHeights(front, back);
    await new Promise((r) => setTimeout(r, 150));

    console.log("[flipCard] sizes:", {
      stageW: stage.offsetWidth,
      stageH: stage.offsetHeight,
      frontH: front.offsetHeight,
      backH: back.offsetHeight,
    });
    if (!stage.offsetWidth || !stage.offsetHeight) {
      throw new Error("Stage has no dimensions");
    }

    const dataUrl = await toPng(stage, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: undefined,
      width: stage.offsetWidth,
      height: stage.offsetHeight,
    });
    console.log("[flipCard] dataUrl length:", dataUrl ? dataUrl.length : 0);
    if (!dataUrl || dataUrl.length < 1000)
      throw new Error("Capture produced empty image");

    const a = document.createElement("a");
    const safe = (pet.name || "pet").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    a.download = `${safe}-hero-card.png`;
    a.href = dataUrl;
    a.click();
  } catch (err) {
    console.error("[flipCard] export failed:", err);
    if (typeof window !== "undefined")
      window.alert(
        "Sorry — the card image couldn't be generated. Please try again.",
      );
  } finally {
    if (stage.parentNode) document.body.removeChild(stage);
    if (overlay.parentNode) document.body.removeChild(overlay);
  }
}

// Exposed for the interactive flip component (web link) to build faces.
export { buildFront, buildBack, deriveTheme, equalizeHeights };
