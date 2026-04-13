import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;

// ── All Bay Area zip codes ────────────────────────────────────────────────────
const BAY_AREA_ZIPS = [
  // Alameda County
  "94501",
  "94502",
  "94536",
  "94537",
  "94538",
  "94539",
  "94540",
  "94541",
  "94542",
  "94543",
  "94544",
  "94545",
  "94546",
  "94550",
  "94551",
  "94552",
  "94555",
  "94557",
  "94560",
  "94566",
  "94568",
  "94577",
  "94578",
  "94579",
  "94580",
  "94586",
  "94587",
  "94588",
  "94601",
  "94602",
  "94603",
  "94604",
  "94605",
  "94606",
  "94607",
  "94608",
  "94609",
  "94610",
  "94611",
  "94612",
  "94613",
  "94614",
  "94615",
  "94617",
  "94618",
  "94619",
  "94621",
  "94622",
  "94623",
  "94624",
  "94625",
  "94649",
  "94659",
  "94660",
  "94661",
  "94662",
  "94666",
  // Berkeley / El Cerrito
  "94702",
  "94703",
  "94704",
  "94705",
  "94706",
  "94707",
  "94708",
  "94709",
  "94710",
  "94720",
  "94530",
  "94608",
  // Contra Costa County
  "94520",
  "94521",
  "94523",
  "94525",
  "94526",
  "94528",
  "94530",
  "94531",
  "94553",
  "94556",
  "94563",
  "94564",
  "94565",
  "94595",
  "94596",
  "94597",
  "94598",
  "94801",
  "94803",
  "94804",
  "94805",
  "94806",
  // Marin County
  "94901",
  "94903",
  "94904",
  "94920",
  "94925",
  "94930",
  "94939",
  "94941",
  "94945",
  "94947",
  "94949",
  "94950",
  "94960",
  "94965",
  "94970",
  "94973",
  // San Mateo County
  "94002",
  "94005",
  "94010",
  "94011",
  "94013",
  "94014",
  "94015",
  "94019",
  "94020",
  "94021",
  "94025",
  "94027",
  "94028",
  "94030",
  "94044",
  "94061",
  "94062",
  "94063",
  "94065",
  "94066",
  "94070",
  "94074",
  "94080",
  "94401",
  "94402",
  "94403",
  "94404",
  // Santa Clara County
  "94022",
  "94023",
  "94024",
  "94035",
  "94039",
  "94040",
  "94041",
  "94042",
  "94043",
  "94085",
  "94086",
  "94087",
  "94088",
  "94089",
  "94301",
  "94302",
  "94303",
  "94304",
  "94305",
  "94306",
  "95002",
  "95008",
  "95014",
  "95032",
  "95050",
  "95051",
  "95054",
  "95070",
  "95101",
  "95110",
  "95112",
  "95116",
  "95117",
  "95118",
  "95120",
  "95121",
  "95122",
  "95123",
  "95124",
  "95125",
  "95126",
  "95127",
  "95128",
  "95129",
  "95130",
  "95131",
  "95132",
  "95133",
  "95134",
  "95135",
  "95136",
  "95138",
  "95139",
  "95140",
  // Sonoma County
  "94928",
  "94931",
  "94951",
  "94952",
  "94954",
  "94975",
  "95401",
  "95403",
  "95404",
  "95405",
  "95407",
  "95409",
  "95442",
  "95448",
  "95452",
  "95472",
  "95476",
  // Napa County
  "94558",
  "94559",
  "94562",
  "94574",
  "94576",
  "94581",
  "94599",
  // Solano County
  "94510",
  "94512",
  "94533",
  "94534",
  "94535",
  "94571",
  "94585",
  "94589",
  "94590",
  "94591",
  "94592",
];

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
        .replace(/\s*[-–—]\s*/g, " – "),
    )
    .join("\n");
}

// ── Clean vet name (strip city tags Google appends in parentheses) ─────────────
function cleanVetName(name) {
  if (!name) return name;
  return name
    .replace(/\s*\([^)]*\)\s*$/, "") // strip trailing (SAN LEANDRO) etc
    .replace(/\s*-\s*[A-Z\s]+$/, (match) => {
      // Only strip if it looks like an all-caps city suffix
      return match === match.toUpperCase() ? "" : match;
    })
    .trim();
}

// ── Get neighborhood from Google Geocoding API ────────────────────────────────
async function getNeighborhood(address, city, zip) {
  try {
    const fullAddress = `${address}, ${city}, CA ${zip}`;
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

// ── Extract zip from formatted address ───────────────────────────────────────
function extractZip(address) {
  const match = address?.match(/\b(\d{5})\b/);
  return match ? match[1] : null;
}

// ── Extract city from formatted address ──────────────────────────────────────
function extractCity(address) {
  if (!address) return null;
  const parts = address.split(",");
  if (parts.length >= 2)
    return parts[parts.length - 2]
      .trim()
      .replace(/\s+\d{5}.*/, "")
      .trim();
  return null;
}

// ── Search Google Places for vets near a zip code ────────────────────────────
async function searchVetsNearZip(zip) {
  const query = `veterinarian+${zip}+CA`;
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results || [];
}

// ── Get place details (hours, website) ───────────────────────────────────────
async function getPlaceDetails(placeId) {
  const fields =
    "name,formatted_address,formatted_phone_number,website,opening_hours,vicinity";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.result || {};
}

// ── Normalize name for duplicate detection ────────────────────────────────────
function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function GET(req) {
  if (!GOOGLE_API_KEY) {
    return Response.json(
      { error: "GOOGLE_PLACES_API_KEY not set" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(req.url);
  const maxZips = parseInt(searchParams.get("maxZips") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");

  const results = { found: 0, added: 0, skipped: 0, errors: [] };

  try {
    // Load existing names and phones to check duplicates
    const { data: existingVets } = await supabase
      .from("vets")
      .select("name, phone");
    const { data: existingPending } = await supabase
      .from("pending_vets")
      .select("name, phone");

    const existingNames = new Set([
      ...(existingVets || []).map((v) => normalizeName(v.name)),
      ...(existingPending || []).map((v) => normalizeName(v.name)),
    ]);
    const existingPhones = new Set([
      ...(existingVets || []).map((v) => v.phone).filter(Boolean),
      ...(existingPending || []).map((v) => v.phone).filter(Boolean),
    ]);

    const zipsToProcess = BAY_AREA_ZIPS.slice(offset, offset + maxZips);

    for (const zip of zipsToProcess) {
      try {
        const places = await searchVetsNearZip(zip);
        results.found += places.length;

        for (const place of places) {
          try {
            const details = await getPlaceDetails(place.place_id);

            // ── Clean name ──────────────────────────────────────────────
            const cleanedName = cleanVetName(details.name || place.name || "");
            if (!cleanedName) {
              results.skipped++;
              continue;
            }

            // ── Duplicate check ─────────────────────────────────────────
            const phone = details.formatted_phone_number || null;
            if (
              existingNames.has(normalizeName(cleanedName)) ||
              (phone && existingPhones.has(phone))
            ) {
              results.skipped++;
              continue;
            }

            // ── Extract address parts ───────────────────────────────────
            const formattedAddress =
              details.formatted_address || place.formatted_address || "";
            const addressLine = formattedAddress.split(",")[0]?.trim() || null;
            const city = extractCity(formattedAddress);
            const zipCode = extractZip(formattedAddress) || zip;

            // ── Clean website ───────────────────────────────────────────
            const website = cleanWebsiteUrl(details.website || null);

            // ── Format hours ────────────────────────────────────────────
            const hours = formatHours(
              details.opening_hours?.weekday_text || null,
            );

            // ── Get neighborhood from Geocoding API ─────────────────────
            let neighborhood = null;
            if (addressLine && city) {
              neighborhood = await getNeighborhood(addressLine, city, zipCode);
              await new Promise((r) => setTimeout(r, 100));
            }

            // ── Insert into pending_vets ────────────────────────────────
            const { error } = await supabase.from("pending_vets").insert({
              name: cleanedName,
              address: addressLine,
              city: city,
              state: "CA",
              zip_code: zipCode,
              phone: phone,
              website: website,
              hours: hours,
              neighborhood: neighborhood,
              vet_type: ["General Practice"],
              source: "Google Places",
              status: "pending",
            });

            if (error) {
              results.errors.push(`${cleanedName}: ${error.message}`);
            } else {
              results.added++;
              existingNames.add(normalizeName(cleanedName));
              if (phone) existingPhones.add(phone);
            }

            await new Promise((r) => setTimeout(r, 150));
          } catch (placeErr) {
            results.errors.push(`Place error: ${placeErr.message}`);
          }
        }

        await new Promise((r) => setTimeout(r, 250));
      } catch (zipError) {
        results.errors.push(`ZIP ${zip}: ${zipError.message}`);
      }
    }

    return Response.json({
      success: true,
      zipsProcessed: zipsToProcess.length,
      nextOffset: offset + maxZips,
      totalZips: BAY_AREA_ZIPS.length,
      ...results,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
