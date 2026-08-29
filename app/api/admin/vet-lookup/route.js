// app/api/admin/vet-lookup/route.js
//
// Secure server-side vet lookup using the Google Places API. Lets the admin
// type a clinic name and autofill the form from the matching Google business
// listing (address, city, state, ZIP, phone, website, hours).
//
// The Places API key stays on the server (env var) and never reaches the
// browser. If this route is slow or fails, the admin just fills the form
// manually — nothing breaks.
//
// TWO MODES:
//   GET ?q=<search text>            -> returns up to 5 candidate matches
//                                      [{ place_id, name, address }]
//   GET ?place_id=<id>              -> returns full details for one place
//                                      { name, address, city, state, zip,
//                                        phone, website, hours }
//
// SETUP:
//   1. Add to environment variables (e.g. .env.local):
//        GOOGLE_PLACES_KEY=your_places_api_key_here
//   2. In Google Cloud Console, enable the Places API and restrict the key to
//      it. Because this is server-side, use "None" or an IP restriction (not an
//      HTTP-referrer restriction, which would block the server call).

import { NextResponse } from "next/server";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Convert Google's opening_hours.periods into the vet-slug hours string:
// "Monday: 9:00 am – 6:00 pm" (split hours comma-separated). Google gives times
// as "HHMM" 24h strings per weekday (0 = Sunday).
function periodsToHours(periods) {
  if (!periods || !periods.length) return "";
  // 24-hour case: Google represents "open 24h" as a single period with an
  // open time of 0000 and no close.
  const byDay = {};
  DAYS.forEach((d) => (byDay[d] = []));

  const dayName = (googleDay) => {
    // Google: 0 = Sunday .. 6 = Saturday. Our list is Monday-first.
    const map = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return map[googleDay];
  };

  const fmt = (hhmm) => {
    const h = parseInt(hhmm.slice(0, 2), 10);
    const m = hhmm.slice(2);
    const ampm = h < 12 ? "am" : "pm";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m} ${ampm}`;
  };

  // Detect all-day (open with no close, open time 0000)
  for (const p of periods) {
    if (p.open && !p.close && p.open.time === "0000") {
      const d = dayName(p.open.day);
      if (d) byDay[d] = ["OPEN24"];
      continue;
    }
    if (p.open && p.close) {
      const d = dayName(p.open.day);
      if (d) byDay[d].push(`${fmt(p.open.time)} – ${fmt(p.close.time)}`);
    }
  }

  return DAYS.filter((d) => byDay[d].length)
    .map((d) => {
      if (byDay[d][0] === "OPEN24") return `${d}: Open 24 hours`;
      return `${d}: ${byDay[d].join(", ")}`;
    })
    .join("\n");
}

function parseAddress(components) {
  let city = "";
  let state = "";
  let zip = "";
  let neighborhood = "";
  for (const c of components || []) {
    if (c.types.includes("neighborhood")) neighborhood = c.long_name;
    if (!neighborhood && c.types.includes("sublocality"))
      neighborhood = c.long_name;
    if (c.types.includes("locality")) city = c.long_name;
    if (!city && c.types.includes("sublocality")) city = c.long_name;
    if (c.types.includes("administrative_area_level_1")) state = c.short_name;
    if (c.types.includes("postal_code")) zip = c.long_name;
  }
  return { city, state, zip, neighborhood };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const placeId = (searchParams.get("place_id") || "").trim();

  const key = process.env.GOOGLE_PLACES_KEY;
  if (!key) {
    return NextResponse.json({ error: "Lookup unavailable" }, { status: 503 });
  }

  const withTimeout = async (url) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      return res;
    } catch (e) {
      clearTimeout(timeout);
      throw e;
    }
  };

  try {
    // MODE 1: search by text -> candidate list
    if (q && !placeId) {
      const url =
        "https://maps.googleapis.com/maps/api/place/textsearch/json" +
        `?query=${encodeURIComponent(q)}` +
        `&key=${key}`;
      const res = await withTimeout(url);
      const data = await res.json();
      if (data.status !== "OK" || !data.results?.length) {
        return NextResponse.json({ results: [] });
      }
      const results = data.results.slice(0, 5).map((r) => ({
        place_id: r.place_id,
        name: r.name,
        address: r.formatted_address,
      }));
      return NextResponse.json({ results });
    }

    // MODE 2: details by place_id -> full form fields
    if (placeId) {
      const fields = [
        "name",
        "formatted_address",
        "address_components",
        "formatted_phone_number",
        "website",
        "opening_hours",
      ].join(",");
      const url =
        "https://maps.googleapis.com/maps/api/place/details/json" +
        `?place_id=${encodeURIComponent(placeId)}` +
        `&fields=${fields}` +
        `&key=${key}`;
      const res = await withTimeout(url);
      const data = await res.json();
      if (data.status !== "OK" || !data.result) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const r = data.result;
      const { city, state, zip, neighborhood } = parseAddress(
        r.address_components,
      );
      // Street address: strip the city/state/zip tail from formatted_address.
      let address = r.formatted_address || "";
      if (city && address.includes(",")) {
        address = address.split(",")[0].trim();
      }
      return NextResponse.json({
        name: r.name || "",
        address,
        city,
        state,
        zip_code: zip,
        neighborhood: neighborhood || city || "",
        phone: r.formatted_phone_number || "",
        website: r.website || "",
        hours: periodsToHours(r.opening_hours?.periods),
      });
    }

    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "Lookup error" }, { status: 504 });
  }
}
