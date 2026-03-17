import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

// ⚠️ This route uses the service role key intentionally.
// It bypasses RLS to read vets/services and write vet_prices during AI price scraping.
// It is protected by AGENT_SECRET and should never be called from the client.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Fetch a webpage and return its text content
async function fetchWebpage(url) {
  try {
    if (!url.startsWith("http")) url = "https://" + url;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PetParrk/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);
    return text;
  } catch {
    return null;
  }
}

// Try common pricing page URLs
async function findPricingText(baseUrl) {
  if (!baseUrl) return null;
  const base = baseUrl.replace(/\/$/, "");
  const paths = [
    "",
    "/services",
    "/pricing",
    "/fees",
    "/prices",
    "/services-fees",
    "/our-services",
  ];
  for (const path of paths) {
    const text = await fetchWebpage(base + path);
    if (
      text &&
      (text.toLowerCase().includes("exam") ||
        text.toLowerCase().includes("vaccine") ||
        text.toLowerCase().includes("spay") ||
        text.toLowerCase().includes("dental") ||
        text.toLowerCase().includes("price") ||
        text.toLowerCase().includes("fee") ||
        text.toLowerCase().includes("cost"))
    ) {
      return text;
    }
  }
  return null;
}

// Use Claude to extract prices from webpage text
async function extractPrices(vetName, pageText, servicesList) {
  const prompt = `You are extracting veterinary pricing from a clinic's website.

Clinic: ${vetName}
Services to look for: ${servicesList.map((s) => s.name).join(", ")}

Website text:
${pageText}

Extract any prices you can find. Return ONLY a JSON array like this (no other text):
[
  {
    "service_name": "exact service name from the list above",
    "price_low": 65,
    "price_high": null,
    "price_type": "exact",
    "notes": "optional note",
    "includes_bloodwork": false,
    "includes_xrays": false,
    "includes_anesthesia": false
  }
]

Rules:
- Only include services from the provided list
- price_type must be "exact", "range", or "starting"
- For ranges, set both price_low and price_high
- For "starting at" prices, set price_type to "starting" and price_high to null
- If no prices found, return empty array []
- Return ONLY the JSON array, nothing else`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content[0].text.trim();
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return [];
  }
}

export async function GET(request) {
  // Auth check
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.AGENT_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const maxVets = parseInt(url.searchParams.get("maxVets")) || 10;
  const offset = parseInt(url.searchParams.get("offset")) || 0;

  const results = {
    processed: 0,
    pricesFound: 0,
    pricesAdded: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Get services list
    const { data: servicesList } = await supabase
      .from("services")
      .select("id, name");
    if (!servicesList?.length)
      return Response.json({ error: "No services found" }, { status: 500 });

    // Get vets with websites that don't have prices yet
    const { data: allVets } = await supabase
      .from("vets")
      .select("id, name, website")
      .eq("status", "active")
      .not("website", "is", null);
    const { data: existingPrices } = await supabase
      .from("vet_prices")
      .select("vet_id");
    const vetsWithPrices = new Set((existingPrices || []).map((p) => p.vet_id));

    // Also check pending_vets with websites
    const { data: pendingWithSites } = await supabase
      .from("pending_vets")
      .select("id, name, website")
      .eq("status", "pending")
      .not("website", "is", null);

    const vetsToProcess = [
      ...(allVets || [])
        .filter((v) => !vetsWithPrices.has(v.id))
        .map((v) => ({ ...v, _source: "active" })),
      ...(pendingWithSites || []).map((v) => ({ ...v, _source: "pending" })),
    ].slice(offset, offset + maxVets);

    for (const vet of vetsToProcess) {
      results.processed++;
      try {
        const pageText = await findPricingText(vet.website);
        if (!pageText) {
          results.skipped++;
          continue;
        }

        const prices = await extractPrices(vet.name, pageText, servicesList);
        if (!prices?.length) {
          results.skipped++;
          continue;
        }

        results.pricesFound += prices.length;

        for (const price of prices) {
          const service = servicesList.find(
            (s) =>
              s.name.toLowerCase() === price.service_name?.toLowerCase() ||
              s.name
                .toLowerCase()
                .includes(price.service_name?.toLowerCase()) ||
              price.service_name?.toLowerCase().includes(s.name.toLowerCase()),
          );
          if (!service) continue;

          const { error } = await supabase.from("vet_prices").insert({
            vet_id: vet._source === "active" ? vet.id : null,
            pending_vet_id: vet._source === "pending" ? vet.id : null,
            service_id: service.id,
            price_low: price.price_low || null,
            price_high: price.price_high || null,
            price_type: price.price_type || "exact",
            notes: price.notes || null,
            includes_bloodwork: price.includes_bloodwork || false,
            includes_xrays: price.includes_xrays || false,
            includes_anesthesia: price.includes_anesthesia || false,
            is_verified: false,
            source: "ai_scraper",
          });

          if (!error) results.pricesAdded++;
          else results.errors.push(`${vet.name}: ${error.message}`);
        }

        await new Promise((r) => setTimeout(r, 500));
      } catch (vetError) {
        results.errors.push(`${vet.name}: ${vetError.message}`);
      }
    }

    return Response.json({
      success: true,
      processed: results.processed,
      pricesFound: results.pricesFound,
      pricesAdded: results.pricesAdded,
      skipped: results.skipped,
      errors: results.errors,
      nextOffset: offset + maxVets,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
