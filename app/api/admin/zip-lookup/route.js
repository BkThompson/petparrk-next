// app/api/admin/zip-lookup/route.js
//
// Secure server-side ZIP -> city/state lookup using the Google Geocoding API.
// The API key stays on the server (read from an env var) and is NEVER sent to
// the browser. The admin form calls this route with a 5-digit ZIP and gets back
// { city, state } (or an error), then autofills the form. If this route is slow
// or fails, the form falls back to manual entry — nothing breaks.
//
// SETUP:
//   1. Add to your environment variables (e.g. .env.local):
//        GOOGLE_GEOCODING_KEY=your_key_here
//   2. In Google Cloud Console, ensure the Geocoding API is enabled for the
//      project, and restrict the key to the Geocoding API. Because this key is
//      used server-side only, you can also add an IP restriction for your
//      server rather than an HTTP-referrer restriction.

import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const zip = (searchParams.get("zip") || "").trim();

  // Basic validation: US ZIP is 5 digits (optionally ZIP+4, we take the first 5).
  const zip5 = zip.slice(0, 5);
  if (!/^\d{5}$/.test(zip5)) {
    return NextResponse.json({ error: "Invalid ZIP" }, { status: 400 });
  }

  const key = process.env.GOOGLE_GEOCODING_KEY;
  if (!key) {
    // Missing key — return a soft error so the client falls back to manual entry.
    return NextResponse.json({ error: "Lookup unavailable" }, { status: 503 });
  }

  try {
    const url =
      "https://maps.googleapis.com/maps/api/geocode/json" +
      `?components=postal_code:${encodeURIComponent(zip5)}|country:US` +
      `&key=${key}`;

    // Guard against a slow upstream: abort after 4s so the admin isn't left
    // waiting. On abort we return a soft error and the client falls back.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ error: "Lookup failed" }, { status: 502 });
    }

    const data = await res.json();
    if (data.status !== "OK" || !data.results?.length) {
      return NextResponse.json({ error: "ZIP not found" }, { status: 404 });
    }

    // Pull city (locality) and state (administrative_area_level_1 short name)
    // out of the address components.
    const comps = data.results[0].address_components || [];
    let city = null;
    let state = null;
    for (const c of comps) {
      if (c.types.includes("locality")) city = c.long_name;
      if (
        !city &&
        (c.types.includes("postal_town") ||
          c.types.includes("sublocality") ||
          c.types.includes("neighborhood"))
      ) {
        city = c.long_name;
      }
      if (c.types.includes("administrative_area_level_1")) {
        state = c.short_name; // e.g. "CA"
      }
    }

    return NextResponse.json({ city: city || "", state: state || "" });
  } catch (err) {
    // Timeout or network error — soft-fail so the client falls back to manual.
    return NextResponse.json({ error: "Lookup error" }, { status: 504 });
  }
}
