import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Bay Area zip codes — covers all 9 counties
const BAY_AREA_ZIPS = [
  // San Francisco
  "94102",
  "94103",
  "94104",
  "94105",
  "94107",
  "94108",
  "94109",
  "94110",
  "94111",
  "94112",
  "94114",
  "94115",
  "94116",
  "94117",
  "94118",
  "94121",
  "94122",
  "94123",
  "94124",
  "94127",
  "94131",
  "94132",
  "94133",
  "94134",
  // Oakland / Alameda County
  "94601",
  "94602",
  "94603",
  "94605",
  "94606",
  "94607",
  "94608",
  "94609",
  "94610",
  "94611",
  "94612",
  "94613",
  "94618",
  "94619",
  "94621",
  "94501",
  "94502", // Alameda
  "94541",
  "94542",
  "94544",
  "94545", // Hayward
  "94577",
  "94578",
  "94579", // San Leandro
  "94546",
  "94552",
  "94555",
  "94560",
  "94568", // Castro Valley / Dublin / Fremont
  "94536",
  "94537",
  "94538",
  "94539", // Fremont
  "94550",
  "94551", // Livermore / Pleasanton
  // Berkeley / Albany / Emeryville / El Cerrito
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
  "94806", // Richmond
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

// Deduplicate and normalize a business name for comparison
function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Search Google Places for vets near a zip code
async function searchVetsNearZip(zip) {
  const query = `veterinarian+${zip}+CA`;
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results || [];
}

// Get place details (phone, website, hours)
async function getPlaceDetails(placeId) {
  const fields =
    "name,formatted_address,formatted_phone_number,website,opening_hours,vicinity";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.result || {};
}

// Extract zip code from formatted address
function extractZip(address) {
  const match = address?.match(/\b(\d{5})\b/);
  return match ? match[1] : null;
}

// Extract city from formatted address
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

// Format hours from Google Places
function formatHours(opening_hours) {
  if (!opening_hours?.weekday_text) return null;
  return opening_hours.weekday_text.join("\n");
}

export const maxDuration = 60; // Vercel max for hobby plan

export async function GET(request) {
  const { searchParams, headers } = new URL(request.url);

  // Protect the route — only callable with a secret token
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.AGENT_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!GOOGLE_API_KEY) {
    return Response.json(
      { error: "GOOGLE_PLACES_API_KEY not set" },
      { status: 500 }
    );
  }

  const results = { found: 0, added: 0, skipped: 0, errors: [] };

  try {
    // Load existing vet names and phone numbers to check for duplicates
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

    // Limit zips per run to avoid timeout — process in batches
    const maxZips =
      parseInt(new URL(request.url).searchParams.get("maxZips")) || 20;
    const offset =
      parseInt(new URL(request.url).searchParams.get("offset")) || 0;
    const zipsToProcess = BAY_AREA_ZIPS.slice(offset, offset + maxZips);

    for (const zip of zipsToProcess) {
      try {
        const places = await searchVetsNearZip(zip);
        results.found += places.length;

        for (const place of places) {
          // Skip if name already exists
          if (existingNames.has(normalizeName(place.name))) {
            results.skipped++;
            continue;
          }

          // Get full details
          const details = await getPlaceDetails(place.place_id);
          const phone = details.formatted_phone_number || null;

          // Skip if phone already exists
          if (phone && existingPhones.has(phone)) {
            results.skipped++;
            continue;
          }

          const address = details.formatted_address || place.formatted_address;
          const zipCode = extractZip(address);

          // Skip if not in Bay Area zip
          if (zipCode && !BAY_AREA_ZIPS.includes(zipCode)) {
            results.skipped++;
            continue;
          }

          const city = extractCity(address);
          const hours = formatHours(details.opening_hours);

          // Insert into pending_vets
          const { error } = await supabase.from("pending_vets").insert({
            name: place.name,
            address: address?.split(",")[0]?.trim() || null,
            city: city,
            zip_code: zipCode,
            phone: phone,
            website: details.website || null,
            hours: hours,
            neighborhood: city,
            vet_type: "General Practice",
            source: "Google Places",
            status: "pending",
          });

          if (error) {
            results.errors.push(`${place.name}: ${error.message}`);
          } else {
            results.added++;
            existingNames.add(normalizeName(place.name));
            if (phone) existingPhones.add(phone);
          }

          // Small delay to avoid hitting rate limits
          await new Promise((r) => setTimeout(r, 100));
        }

        // Delay between zip searches
        await new Promise((r) => setTimeout(r, 200));
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
