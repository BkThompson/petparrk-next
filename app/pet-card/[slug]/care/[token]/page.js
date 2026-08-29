"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  getSharedPetForCare,
  getSharedCareMedical,
  recordCardView,
} from "../../../../../lib/petCardApi";
import PageLoader from "../../../../../components/PageLoader";
import CareCardView, {
  UnavailableState,
} from "../../../../../components/CareCardView";

// ============================================================================
// PUBLIC CARE CARD TOKEN PAGE  (app/pet-card/[slug]/care/[token]/page.js)
// ----------------------------------------------------------------------------
// Public, no-login route at /pet-card/[slug]/care/[token]. Anyone with the link
// loads Care-Card-appropriate data via the shared-token RPCs and renders the
// SHARED <CareCardView> with mode="public" (NO owner actions — no Edit/Share).
// All markup + styling lives in CareCardView, so this public card is always
// byte-identical to the owner's display card.
//
// Records a single view on mount via recordCardView() for owner-visible stats.
// ============================================================================

export default function PublicCareCardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params?.token;
  const wantsAutoPrint = searchParams?.get("print") === "1";

  const [pet, setPet] = useState(null);
  const [medical, setMedical] = useState({
    vaccinations: [],
    medications: [],
    weight_history: [],
    vet_visits: [],
    emergency_contacts: [],
    specialists: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      const [petRes, medRes] = await Promise.all([
        getSharedPetForCare(token),
        getSharedCareMedical(token),
      ]);

      if (cancelled) return;

      if (petRes.error || !petRes.data) {
        setError(
          "This Care Card link is no longer active. Ask the pet's owner for a fresh link.",
        );
        setLoading(false);
        return;
      }

      setPet(petRes.data);
      setMedical(
        medRes.data || {
          vaccinations: [],
          medications: [],
          weight_history: [],
          vet_visits: [],
          emergency_contacts: [],
          specialists: [],
        },
      );
      setLoading(false);

      // Fire-and-forget view count.
      recordCardView(token, "care").catch(() => {});
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Auto-print when arriving via ?print=1.
  useEffect(() => {
    if (loading || !wantsAutoPrint || !pet) return;
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") window.print();
    }, 350);
    return () => clearTimeout(timer);
  }, [loading, pet, wantsAutoPrint]);

  if (loading) return <PageLoader for="careCard" />;
  if (error || !pet)
    return <UnavailableState message={error || "Card unavailable."} />;

  return <CareCardView pet={pet} medical={medical} mode="public" />;
}
