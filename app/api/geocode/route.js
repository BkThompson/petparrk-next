// app/api/geocode/route.js
//
// Moves the neighbourhood lookup off the browser. Admin previously called
// Google's Geocoding API directly with NEXT_PUBLIC_GOOGLE_PLACES_API_KEY —
// and anything prefixed NEXT_PUBLIC_ is compiled into the JavaScript bundle,
// so that key was readable by anyone who viewed source. Marking it Secret in
// Vercel did nothing, because a second public copy was shipping to the client.
//
// Here the key stays on the server. The browser asks this route for a
// neighbourhood and never sees a credential.
//
// Admin-only: geocoding is billable, so an open proxy would let anyone spend
// your Google quota. The session check is what stops that.

import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  // Identify the caller. Same pattern the symptom-checker route uses: read the
  // bearer token and verify it with Supabase.
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
  const { data: userData, error: userErr } = await sb.auth.getUser(token);
  if (userErr || !userData?.user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // Same authorisation the admin page itself uses: the hardcoded list first as
  // a lockout-proof fallback, then the SECURITY DEFINER is_admin_with('any')
  // helper. Mirroring it matters — a different rule here would let someone
  // into the admin UI and then refuse their neighbourhood lookups.
  const ADMIN_EMAILS = ["bkalthompson@gmail.com", "maggie.tursi@gmail.com"];
  const email = (userData.user.email || "").trim().toLowerCase();
  let authorized = ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email);

  if (!authorized) {
    // Called as the user, not the service role, so the helper sees their
    // identity and can answer for them.
    const asUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      },
    );
    const { data: isAdmin } = await asUser.rpc("is_admin_with", {
      permission: "any",
    });
    authorized = isAdmin === true;
  }

  if (!authorized) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const { address, city, zipCode } = await req.json();
  if (!address) {
    return Response.json({ error: "address_required" }, { status: 400 });
  }

  const key =
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!key) {
    return Response.json({ neighborhood: null });
  }

  try {
    const fullAddress = `${address}, ${city || ""}, CA ${zipCode || ""}`;
    const res = await fetch(
      "https://maps.googleapis.com/maps/api/geocode/json?address=" +
        encodeURIComponent(fullAddress) +
        "&key=" +
        key,
    );
    const data = await res.json();
    const components = data.results?.[0]?.address_components;
    if (!components) return Response.json({ neighborhood: null });

    const neighborhood = components.find(
      (c) =>
        c.types.includes("neighborhood") ||
        c.types.includes("sublocality_level_1"),
    );
    return Response.json({ neighborhood: neighborhood?.long_name || null });
  } catch (err) {
    // Never block a vet from being saved because a lookup failed.
    console.error("[geocode] lookup failed:", err?.message);
    return Response.json({ neighborhood: null });
  }
}
