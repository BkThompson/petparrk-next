// app/api/waitlist/route.js
// ---------------------------------------------------------------------------
// Public waitlist signup endpoint. Protected like the rest of the app:
//   • Cloudflare Turnstile token verified server-side (blocks bot floods)
//   • Disposable / throwaway email domains rejected
//   • Email normalized for dedupe (dot/plus tricks collapse to one identity)
//   • Insert via service_role so the row lands even though the table is
//     otherwise insert-only to the public (keeps the list unreadable).
// Returns { ok: true } on success (including "already on the list").
// ---------------------------------------------------------------------------
import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
}

// Known disposable / throwaway email domains (mirrors the signup blocklist).
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "grr.la",
  "sharklasers.com",
  "throwawaymail.com",
  "yopmail.com",
  "getnada.com",
  "trashmail.com",
  "maildrop.cc",
  "dispostable.com",
  "fakeinbox.com",
  "mintemail.com",
  "mailnesia.com",
  "mohmal.com",
  "emailondeck.com",
  "spamgourmet.com",
  "mytemp.email",
  "tempinbox.com",
  "burnermail.io",
  "temp-mail.io",
  "moakt.com",
  "tempmailo.com",
  "1secmail.com",
  "inboxkitten.com",
  "mailpoof.com",
  "vomoto.com",
]);

function isDisposableEmail(email) {
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  return DISPOSABLE_EMAIL_DOMAINS.has(
    email
      .slice(at + 1)
      .trim()
      .toLowerCase(),
  );
}

// Collapse the common "same inbox, many addresses" tricks for dedupe.
function normalizeEmail(raw) {
  if (!raw) return "";
  const e = raw.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at <= 0) return "";
  let local = e.slice(0, at);
  let domain = e.slice(at + 1);
  if (domain === "googlemail.com") domain = "gmail.com";
  if (
    ["gmail.com", "outlook.com", "hotmail.com", "proton.me"].includes(domain)
  ) {
    const plus = local.indexOf("+");
    if (plus !== -1) local = local.slice(0, plus);
  }
  if (domain === "gmail.com") local = local.replace(/\./g, "");
  return local ? `${local}@${domain}` : "";
}

// Verify the Turnstile token with Cloudflare. The waitlist page uses the
// MANAGED widget (NEXT_PUBLIC_TURNSTILE_SITE_KEY), so this MUST verify with the
// MANAGED secret (TURNSTILE_SECRET_KEY) — the secret is paired to the widget
// that issued the token. Using the invisible secret here would always 403.
async function verifyTurnstile(token, req) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured — skip (fail-safe for dev)
  if (!token) {
    console.error("[waitlist captcha] no token sent");
    return false;
  }
  try {
    const fwd = req.headers.get("x-forwarded-for") || "";
    const body = new URLSearchParams({ secret, response: token });
    const ip = fwd.split(",")[0].trim();
    if (ip) body.append("remoteip", ip);
    const r = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body },
    );
    const json = await r.json();
    if (json.success !== true) {
      // Log the exact reason Cloudflare rejected so this is never a guess.
      console.error(
        "[waitlist captcha] siteverify rejected:",
        JSON.stringify(json["error-codes"] || json),
      );
    }
    return json.success === true;
  } catch (e) {
    // Cloudflare unreachable — fail open so an outage doesn't block signups.
    return true;
  }
}

export async function POST(req) {
  let payload;
  try {
    payload = await req.json();
  } catch (e) {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const email = (payload?.email || "").trim();
  const token = payload?.captchaToken || "";

  // Basic shape check.
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json(
      { ok: false, error: "invalid_email" },
      { status: 400 },
    );
  }

  // Bot gate.
  const human = await verifyTurnstile(token, req);
  if (!human) {
    return Response.json({ ok: false, error: "captcha" }, { status: 403 });
  }

  // Throwaway-domain gate.
  if (isDisposableEmail(email)) {
    return Response.json({ ok: false, error: "disposable" }, { status: 400 });
  }

  const normalized = normalizeEmail(email);

  try {
    const { error } = await admin()
      .from("waitlist")
      .insert({ email, normalized_email: normalized, source: "coming_soon" });
    // 23505 = unique violation = already on the list.
    if (error && error.code === "23505") {
      return Response.json({ ok: true, duplicate: true });
    }
    if (error) {
      return Response.json({ ok: false, error: "server" }, { status: 500 });
    }
    return Response.json({ ok: true, duplicate: false });
  } catch (e) {
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
}
