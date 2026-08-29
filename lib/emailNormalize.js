// lib/emailNormalize.js
// ---------------------------------------------------------------------------
// Collapse the common "same person, many addresses" email tricks into one
// canonical identity so duplicates become detectable. Use this ANYWHERE you
// need "one per real person" — signup, survey/reward claims, referrals.
//
// What it catches:
//   • Gmail dot trick:   j.o.h.n@gmail.com      → john@gmail.com
//   • Gmail plus alias:  john+anything@gmail.com→ john@gmail.com
//   • Case / whitespace: John@Gmail.COM         → john@gmail.com
//   • googlemail.com alias of gmail.com
//   • Plus-aliasing on other major providers (outlook, proton, icloud, etc.)
//
// What it does NOT catch (be honest about this):
//   • Genuinely separate real inboxes (john1@gmail.com vs john2@gmail.com).
//     No email rule can — those need other signals (IP/device, phone, review).
//
// Store BOTH the raw email (what the user typed, for actually emailing them)
// AND the normalized email (for duplicate checks). Compare on normalized.
// ---------------------------------------------------------------------------

// Providers where "+alias" routes to the same inbox (strip the +suffix).
const PLUS_ALIAS_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "proton.me",
  "protonmail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "fastmail.com",
  "yahoo.com", // yahoo uses '-' historically but '+' is increasingly ignored too
]);

// Providers where dots in the local part are ignored (Gmail behavior).
const DOT_IGNORING_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

// Domains that are aliases of a canonical domain.
const DOMAIN_ALIASES = {
  "googlemail.com": "gmail.com",
};

/**
 * Returns a canonical form of an email for duplicate detection.
 * Returns "" if the input isn't a parseable email.
 */
export function normalizeEmail(rawEmail) {
  if (!rawEmail || typeof rawEmail !== "string") return "";
  const email = rawEmail.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return "";

  let local = email.slice(0, at);
  let domain = email.slice(at + 1);

  // Canonicalize aliased domains (googlemail → gmail).
  if (DOMAIN_ALIASES[domain]) domain = DOMAIN_ALIASES[domain];

  // Strip +alias suffix on providers that support it.
  if (PLUS_ALIAS_DOMAINS.has(domain)) {
    const plus = local.indexOf("+");
    if (plus !== -1) local = local.slice(0, plus);
  }

  // Remove dots on providers that ignore them (Gmail).
  if (DOT_IGNORING_DOMAINS.has(domain)) {
    local = local.replace(/\./g, "");
  }

  if (!local) return "";
  return `${local}@${domain}`;
}

/**
 * True if two emails resolve to the same real inbox (per the rules above).
 */
export function isSameInbox(a, b) {
  const na = normalizeEmail(a);
  const nb = normalizeEmail(b);
  return na !== "" && na === nb;
}

/**
 * Given a candidate email and a list of already-used emails (raw or normalized),
 * returns true if the candidate collides with any of them after normalization.
 * Use for reward/survey "already claimed" checks.
 */
export function isDuplicateEmail(candidate, existingEmails = []) {
  const nc = normalizeEmail(candidate);
  if (!nc) return false;
  return existingEmails.some((e) => normalizeEmail(e) === nc);
}
