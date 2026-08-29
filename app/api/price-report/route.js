// app/api/price-report/route.js
//
// Accepts price correction reports from users (signed-in or anonymous).
// Rate limited per IP to prevent abuse.

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import crypto from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const MAX_REPORTS_PER_IP_PER_DAY = 5;

function hashIp(ip) {
  return crypto
    .createHash("sha256")
    .update(ip + (process.env.NEXT_PUBLIC_SUPABASE_URL || ""))
    .digest("hex");
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const {
    vetPriceId,
    vetId,
    serviceId,
    reasonCategory,
    suggestedPriceLow,
    suggestedPriceHigh,
    reasonText,
    contactEmail,
  } = body;

  // Required fields
  if (!vetId || !reasonCategory) {
    return NextResponse.json(
      { error: "vetId and reasonCategory are required" },
      { status: 400 },
    );
  }

  // Category whitelist
  const validCategories = [
    "too_high",
    "too_low",
    "not_offered",
    "wrong_service",
    "other",
  ];
  if (!validCategories.includes(reasonCategory)) {
    return NextResponse.json(
      { error: "Invalid reasonCategory" },
      { status: 400 },
    );
  }

  // ── Rate limiting per IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const ipHash = hashIp(ip);

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("price_reports")
    .select("id", { count: "exact", head: true })
    .eq("reporter_ip_hash", ipHash)
    .gte("created_at", oneDayAgo);

  if ((count || 0) >= MAX_REPORTS_PER_IP_PER_DAY) {
    return NextResponse.json(
      {
        error:
          "You've submitted too many reports today. Please try again tomorrow.",
      },
      { status: 429 },
    );
  }

  // ── Optionally resolve signed-in user
  let reporterId = null;
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    try {
      const accessToken = authHeader.replace("Bearer ", "");
      const supabaseUser = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      );
      const {
        data: { user },
      } = await supabaseUser.auth.getUser(accessToken);
      if (user) reporterId = user.id;
    } catch {
      // ignore; treat as anonymous
    }
  }

  // ── Truncate freeform text defensively
  const trimmedReason =
    typeof reasonText === "string" ? reasonText.slice(0, 500) : null;
  const trimmedEmail =
    typeof contactEmail === "string" ? contactEmail.slice(0, 200) : null;

  const { error: insertError } = await supabaseAdmin
    .from("price_reports")
    .insert({
      vet_price_id: vetPriceId || null,
      vet_id: vetId,
      service_id: serviceId || null,
      reporter_id: reporterId,
      reason_category: reasonCategory,
      suggested_price_low:
        suggestedPriceLow != null && !isNaN(Number(suggestedPriceLow))
          ? Number(suggestedPriceLow)
          : null,
      suggested_price_high:
        suggestedPriceHigh != null && !isNaN(Number(suggestedPriceHigh))
          ? Number(suggestedPriceHigh)
          : null,
      reason_text: trimmedReason,
      contact_email: trimmedEmail,
      reporter_ip_hash: ipHash,
    });

  if (insertError) {
    console.error("price-report insert error:", insertError);
    return NextResponse.json(
      { error: "Could not submit report. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "Thanks for the report — we'll review it.",
  });
}
