// lib/copilotApi.js
//
// Data access layer for the Pet Health Co-pilot.
// Parallel to lib/petCardApi.js — all functions use the browser Supabase client.
// RLS enforces owner-scoping on every operation.

import { supabase } from "./supabase";

// ── Vet recommendations ─────────────────────────────────────────────────────

export async function getVetRecommendationForCheck(symptomCheckId) {
  const { data, error } = await supabase
    .from("copilot_vet_recommendations")
    .select("*")
    .eq("symptom_check_id", symptomCheckId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getRecentRecommendationsForPet(petId, limit = 5) {
  const { data, error } = await supabase
    .from("copilot_vet_recommendations")
    .select("*")
    .eq("pet_id", petId)
    .order("generated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// ── Cost estimates ──────────────────────────────────────────────────────────

export async function getEstimatesForRecommendation(recommendationId) {
  const { data, error } = await supabase
    .from("copilot_cost_estimates")
    .select("*")
    .eq("recommendation_id", recommendationId)
    .order("estimate_low", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getEstimatesForCheck(symptomCheckId) {
  const { data, error } = await supabase
    .from("copilot_cost_estimates")
    .select("*")
    .eq("symptom_check_id", symptomCheckId)
    .order("estimate_low", { ascending: true });
  if (error) throw error;
  return data || [];
}

// ── Client-side triggers of server-side co-pilot routes ────────────────────
// These call the API routes we built for Phase A.
// The server does the heavy lifting (LLM calls, vet matching, price math).

export async function triggerVetRecommendation({
  symptomCheckId,
  petId,
  triageResult,
  differentials,
  userZip,
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const res = await fetch("/api/copilot/recommend-vet", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      symptomCheckId,
      petId,
      triageResult,
      differentials,
      userZip,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function triggerCostEstimate({
  recommendationId,
  symptomCheckId,
  petId,
  vetId,
  pendingVetId,
  differentials,
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const res = await fetch("/api/copilot/estimate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      recommendationId,
      symptomCheckId,
      petId,
      vetId,
      pendingVetId,
      differentials,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

// ── Phase B: Visit prep ─────────────────────────────────────────────────────

export async function getActiveVisitPrepForPet(petId) {
  const { data, error } = await supabase
    .from("copilot_visit_prep")
    .select("*")
    .eq("pet_id", petId)
    .eq("status", "active")
    .order("generated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function triggerVisitPrep({
  petId,
  symptomCheckId,
  visitReason,
  triageResult,
  differentials,
  scheduledDate,
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const res = await fetch("/api/copilot/visit-prep", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      petId,
      symptomCheckId,
      visitReason,
      triageResult,
      differentials,
      scheduledDate,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function updateVisitPrepStatus(visitPrepId, status) {
  const { error } = await supabase
    .from("copilot_visit_prep")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", visitPrepId);
  if (error) throw error;
  return true;
}

// ── Phase B: Visit recap ────────────────────────────────────────────────────

export async function getRecapsForPet(petId, limit = 10) {
  const { data, error } = await supabase
    .from("copilot_visit_recaps")
    .select("*")
    .eq("pet_id", petId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getStagedItemsForRecap(recapId) {
  const { data, error } = await supabase
    .from("copilot_recap_staged_items")
    .select("*")
    .eq("recap_id", recapId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

// Submit a recap for extraction.
// For typed: pass { petId, inputMethod: 'typed', rawInput }
// For photo: pass { petId, inputMethod: 'photo', documentBase64, documentMediaType }
export async function triggerVisitRecap({
  petId,
  visitPrepId,
  inputMethod,
  rawInput,
  documentBase64,
  documentMediaType,
  documentUrl,
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const res = await fetch("/api/copilot/visit-recap", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      petId,
      visitPrepId,
      inputMethod,
      rawInput,
      documentBase64,
      documentMediaType,
      documentUrl,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

// Confirm which staged items to write.
// decisions: [{ stagedItemId, decision: 'accepted' | 'rejected' }]
export async function confirmRecapItems({ recapId, decisions }) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const res = await fetch("/api/copilot/visit-recap/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ recapId, decisions }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

// ── Phase C: Insights ───────────────────────────────────────────────────────

// Fetch (and lazily regenerate) insights for a pet.
// The route handles caching — it only recomputes when the source data changed
// or the cache is stale.
export async function getInsightsForPet(petId, { force = false } = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const res = await fetch("/api/copilot/insights", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ petId, force }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

// ── Phase C Pass 3: Past-check co-pilot data ────────────────────────────────

// Load the co-pilot output (ranked vets + any cost estimates) that was
// generated for a past symptom check, so history can display it inline.
// Returns { recommendation, estimates } — either may be null/empty if the
// check predates the co-pilot or landed on MONITOR (no recommendation fires).
export async function getCopilotDataForCheck(symptomCheckId) {
  if (!symptomCheckId) return { recommendation: null, estimates: [] };

  const [recRes, estRes] = await Promise.all([
    supabase
      .from("copilot_vet_recommendations")
      .select("*")
      .eq("symptom_check_id", symptomCheckId)
      .maybeSingle(),
    supabase
      .from("copilot_cost_estimates")
      .select("*")
      .eq("symptom_check_id", symptomCheckId),
  ]);

  return {
    recommendation: recRes.data || null,
    estimates: estRes.data || [],
  };
}

// Load a past check plus its pet, for seeding a contextual follow-up.
export async function getCheckForFollowUp(symptomCheckId) {
  const { data, error } = await supabase
    .from("symptom_checks")
    .select("id, pet_id, triage_result, differentials, transcript, created_at")
    .eq("id", symptomCheckId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

// ── Phase D: Receipt price extraction ───────────────────────────────────────

// Extract price line items from a single receipt via Claude vision.
// Returns { clinic_name, clinic_match, visit_date, line_items } or
// { rejected: 'too_old', message } or { error }.
export async function extractReceiptPrices({
  documentBase64,
  documentMediaType,
  expectedVet,
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Please sign in to upload receipts.");

  const res = await fetch("/api/price-receipt/extract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ documentBase64, documentMediaType, expectedVet }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

// Submit a confirmed batch of extracted prices to price_submissions.
// All rows share one receipt_batch_id so admins review the receipt as a unit.
// `receipts` is an array of { receiptUrl, clinicName, visitDate, species,
// lineItems: [{ raw_label, classification, service_id, price }] }.
export async function submitReceiptBatch({ vet, receipts }) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Please sign in to upload receipts.");

  const rows = [];
  for (const r of receipts) {
    const batchId = crypto.randomUUID();
    for (const li of r.lineItems) {
      const confidence =
        li.classification === "mapped"
          ? "high"
          : li.classification === "product"
            ? "unmapped"
            : "medium";
      rows.push({
        vet_id: vet.id,
        vet_name: vet.name,
        user_id: session.user.id,
        service_id: li.service_id,
        service_name: li.raw_label, // human-readable; admin maps if unmapped
        raw_label: li.raw_label,
        price_type: "exact",
        price_low: li.price,
        price_high: null,
        species: r.species || null,
        visit_date: r.visitDate || null,
        receipt_url: r.receiptUrl,
        receipt_batch_id: batchId,
        source: "receipt_extraction",
        extraction_confidence: confidence,
        status: "pending",
      });
    }
  }

  if (rows.length === 0) return { inserted: 0 };
  const { error } = await supabase.from("price_submissions").insert(rows);
  if (error) throw new Error(error.message);
  return { inserted: rows.length };
}
