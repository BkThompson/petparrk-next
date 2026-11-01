import { permanentRedirect } from "next/navigation";

// ============================================================================
// PET CARD — bare slug  (app/pet-card/[slug]/page.js)
// ----------------------------------------------------------------------------
// There is no page at /pet-card/<slug>. The real routes all carry a suffix:
//
//   /pet-card/<slug>/care        the Care Card (owner)
//   /pet-card/<slug>/care-edit   the Care Card editor
//   /pet-card/<slug>/hero        the Hero Card
//   /pet-card/<slug>/share       the share screen
//
// Without this file the bare address 404s, which it did for anyone who
// shortened a link by hand, had one truncated by an email client, or guessed
// the address from the pet's name. Send them to /care — it's the card people
// mean, and it's what PetTile and the profile pages already link to.
//
// permanentRedirect = HTTP 308. Search engines fold the bare address into
// /care instead of treating it as a separate page, and browsers stop asking.
// The trade-off is that a 308 is cached by the browser indefinitely, so if a
// real page is ever wanted at /pet-card/<slug>, anyone who hit this address
// first would keep being bounced. Decided now, pre-launch, while nothing is
// cached anywhere; changing it later would not be free.
// ============================================================================

export default async function PetCardSlugRedirect({ params }) {
  const { slug } = await params;
  permanentRedirect(`/pet-card/${encodeURIComponent(slug)}/care`);
}
