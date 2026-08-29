"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  getOwnerPetBySlug,
  getPetVaccinations,
  getPetMedications,
  getPetVetVisits,
  getPetWeightHistory,
  getPetEmergencyContacts,
  getPetSpecialists,
} from "../../../../lib/petCardApi";
import PageLoader from "../../../../components/PageLoader";
import CareCardView, {
  UnavailableState,
} from "../../../../components/CareCardView";

// ============================================================================
// OWNER CARE CARD DISPLAY PAGE  (app/pet-card/[slug]/care/page.js)
// ----------------------------------------------------------------------------
// Owner-only route at /pet-card/[slug]/care. Loads the owner's OWN data via
// owner-auth (RLS enforces ownership) and renders the SHARED <CareCardView>
// with mode="owner" (which adds the Edit / Share / Download owner actions).
// All markup + styling lives in CareCardView so this page and the public
// token page can never drift apart.
//
// ?print=1 (from the editor's "Download PDF") auto-fires the print dialog once
// data has loaded — the live page IS the PDF.
// ============================================================================

export default function OwnerCareCardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params?.slug;
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
    if (!slug) return;
    let cancelled = false;

    async function load() {
      const petRes = await getOwnerPetBySlug(slug);
      if (cancelled) return;

      if (petRes.error || !petRes.data) {
        setError(
          "We couldn't load this Care Card. It may not exist, or you may not have access to it.",
        );
        setLoading(false);
        return;
      }

      const petData = petRes.data;

      const [vaxRes, medRes, visitRes, weightRes, contactsRes, specialistsRes] =
        await Promise.all([
          getPetVaccinations(petData.id),
          getPetMedications(petData.id),
          getPetVetVisits(petData.id),
          getPetWeightHistory(petData.id),
          getPetEmergencyContacts(petData.id),
          getPetSpecialists(petData.id),
        ]);

      if (cancelled) return;

      setPet(petData);
      setMedical({
        vaccinations: vaxRes.data || [],
        medications: medRes.data || [],
        vet_visits: visitRes.data || [],
        weight_history: weightRes.data || [],
        emergency_contacts: contactsRes.data || [],
        specialists: specialistsRes.data || [],
      });
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Auto-print when arriving from the editor's "Download PDF" button.
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

  return <CareCardView pet={pet} medical={medical} mode="owner" slug={slug} />;
}
