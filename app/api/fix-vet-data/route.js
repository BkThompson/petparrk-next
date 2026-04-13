import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY;
const MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;

// ── Clean website URL ─────────────────────────────────────────────────────────
function cleanWebsiteUrl(url) {
  if (!url) return null;
  return (
    url
      .replace(/\?.*$/, "")
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .trim() || null
  );
}

// ── Format hours from Google Places weekday_text ──────────────────────────────
// Google returns: ["Monday: 8:00 AM – 4:00 PM", ...]
// We want:        "Monday: 8:00 am – 4:00 pm\nTuesday: ..."
function formatHours(weekday_text) {
  if (!weekday_text || !Array.isArray(weekday_text)) return null;
  return weekday_text
    .map((line) =>
      line
        .replace(/\bAM\b/g, "am")
        .replace(/\bPM\b/g, "pm")
        // Normalize various dash types to en-dash
        .replace(/\s*[-–—]\s*/g, " – "),
    )
    .join("\n");
}

// ── Get neighborhood from Google Geocoding API ────────────────────────────────
async function getNeighborhood(address, city, state, zip) {
  try {
    const fullAddress = `${address}, ${city}, ${state || "CA"} ${zip}`;
    const encoded = encodeURIComponent(fullAddress);
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${MAPS_KEY}`,
    );
    const data = await res.json();
    if (!data.results?.[0]) return null;
    const components = data.results[0].address_components;
    const neighborhood = components.find(
      (c) =>
        c.types.includes("neighborhood") ||
        c.types.includes("sublocality_level_1"),
    );
    return neighborhood?.long_name || null;
  } catch (err) {
    console.error("Geocoding error:", err.message);
    return null;
  }
}

// ── Find a vet on Google Places and get their details ────────────────────────
async function getPlaceDetails(name, address, city) {
  try {
    // Step 1: Text search to find the place
    const query = encodeURIComponent(`${name} ${address} ${city} CA`);
    const searchRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${PLACES_KEY}`,
    );
    const searchData = await searchRes.json();
    const place = searchData.results?.[0];
    if (!place) return null;

    // Step 2: Get full details including hours and website
    const detailRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=opening_hours,website&key=${PLACES_KEY}`,
    );
    const detailData = await detailRes.json();
    return detailData.result || null;
  } catch (err) {
    console.error("Places API error:", err.message);
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const offset = parseInt(searchParams.get("offset") || "0");
  const limit = parseInt(searchParams.get("limit") || "20");
  const dryRun = searchParams.get("dry_run") === "true";

  if (!PLACES_KEY || !MAPS_KEY) {
    return Response.json(
      { error: "Missing GOOGLE_PLACES_API_KEY or GOOGLE_MAPS_API_KEY" },
      { status: 500 },
    );
  }

  // Fetch batch of vets
  const { data: vets, error } = await supabase
    .from("vets")
    .select(
      "id, name, address, city, state, zip_code, website, hours, neighborhood",
    )
    .order("name")
    .range(offset, offset + limit - 1);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const results = {
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    changes: [],
    nextOffset: offset + limit,
    totalFetched: vets.length,
    done: vets.length < limit,
  };

  for (const vet of vets) {
    results.processed++;

    try {
      const updates = {};
      const changeLog = { id: vet.id, name: vet.name, changes: [] };

      // ── 1. Fix website ──────────────────────────────────────────────────
      const cleanedSite = cleanWebsiteUrl(vet.website);
      if (cleanedSite !== vet.website) {
        updates.website = cleanedSite;
        changeLog.changes.push(`website: "${vet.website}" → "${cleanedSite}"`);
      }

      // ── 2. Fix neighborhood (only if missing or just the city name) ─────
      const neighborhoodIsMissing =
        !vet.neighborhood ||
        vet.neighborhood.trim().toLowerCase() ===
          (vet.city || "").trim().toLowerCase();

      if (neighborhoodIsMissing && vet.address && vet.city) {
        const hood = await getNeighborhood(
          vet.address,
          vet.city,
          vet.state,
          vet.zip_code,
        );
        if (hood) {
          updates.neighborhood = hood;
          changeLog.changes.push(
            `neighborhood: "${vet.neighborhood}" → "${hood}"`,
          );
        }
      }

      // ── 3. Fix hours (fetch from Google Places) ─────────────────────────
      if (vet.address && vet.city) {
        const place = await getPlaceDetails(vet.name, vet.address, vet.city);
        if (place) {
          // Fix hours format
          if (place.opening_hours?.weekday_text) {
            const formattedHours = formatHours(
              place.opening_hours.weekday_text,
            );
            if (formattedHours && formattedHours !== vet.hours) {
              updates.hours = formattedHours;
              changeLog.changes.push(`hours: updated to correct format`);
            }
          }

          // Use Google website only if vet has no website or a broken one
          if (!vet.website && place.website) {
            const googleSite = cleanWebsiteUrl(place.website);
            if (googleSite) {
              updates.website = googleSite;
              changeLog.changes.push(
                `website: added from Google → "${googleSite}"`,
              );
            }
          }
        }
      }

      // ── Apply updates ───────────────────────────────────────────────────
      if (Object.keys(updates).length > 0) {
        if (!dryRun) {
          const { error: updateError } = await supabase
            .from("vets")
            .update(updates)
            .eq("id", vet.id);
          if (updateError) {
            results.errors.push(`${vet.name}: ${updateError.message}`);
            continue;
          }
        }
        results.updated++;
        results.changes.push(changeLog);
      } else {
        results.skipped++;
      }

      // Small delay to avoid hitting Google rate limits
      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      results.errors.push(`${vet.name}: ${err.message}`);
    }
  }

  return Response.json({
    success: true,
    dryRun,
    offset,
    limit,
    ...results,
  });
}
