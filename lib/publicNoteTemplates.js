// lib/publicNoteTemplates.js
//
// Canned public pricing notes. Using a template KEY (not free-typed text) keeps
// the copy uniform: every vet with no pricing shows the SAME sentence, because
// they all reference `no_pricing` here rather than 200 hand-typed variants.
//
// TO ADD A NEW TEMPLATE: add one entry below. It automatically appears in the
// admin's note picker and renders correctly on the vet page. No other changes.
//
// `custom` is special: it means the note is free-text the admin typed, not a
// template. public_pricing_note holds the text; public_pricing_note_key is null.

export const PUBLIC_NOTE_TEMPLATES = {
  no_pricing:
    "Pricing isn't available online yet — call the clinic for a quote.",
  call_for_quote: "Prices vary by visit; call for an estimate.",
  weight_based: "Pricing depends on your pet's weight — call to confirm.",
  new_clients_only: "Currently accepting new patients — call to schedule.",
  not_accepting: "Not accepting new patients at this time.",
  exam_required: "An exam may be required before pricing is quoted.",
};

// Human-readable labels for the admin dropdown.
export const PUBLIC_NOTE_LABELS = {
  no_pricing: "No pricing available",
  call_for_quote: "Call for quote",
  weight_based: "Weight-based pricing",
  new_clients_only: "Accepting new patients",
  not_accepting: "Not accepting patients",
  exam_required: "Exam required first",
  custom: "Custom message…",
};

// Resolve what text to display for a vet's public note.
// Prefers the template (so edits to copy propagate everywhere); falls back to
// the stored free-text for custom notes or legacy rows.
export function resolvePublicNote(vet) {
  if (!vet) return null;
  const key = vet.public_pricing_note_key;
  if (key && key !== "custom" && PUBLIC_NOTE_TEMPLATES[key]) {
    return PUBLIC_NOTE_TEMPLATES[key];
  }
  return vet.public_pricing_note || null;
}

// Match a raw sheet note against a template, so bulk sheet entry that happens
// to type a known phrase still gets keyed (keeps copy uniform on re-render).
// Returns a template key if the text closely matches one, else null (custom).
export function matchTemplateKey(text) {
  if (!text) return null;
  const norm = text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
  for (const [key, msg] of Object.entries(PUBLIC_NOTE_TEMPLATES)) {
    const nmsg = msg
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .trim();
    if (norm === nmsg) return key;
  }
  // loose keyword matching for common sheet shorthand
  if (/no prices?|no pricing|call.*(price|quote)/.test(norm))
    return "no_pricing";
  if (/varies|vary|call.*estimate/.test(norm)) return "call_for_quote";
  if (/weight/.test(norm)) return "weight_based";
  return null; // treat as custom free-text
}
