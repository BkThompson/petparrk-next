"use client";

import { PawPrint } from "lucide-react";

// Brand colors — edit here to update loader appearance site-wide
const TERRACOTTA = "#CF5C36";
const MUTED = "#717A86";

// ── Centralized loader messages ──────────────────────────────────────────
// All loader wording lives HERE so it stays consistent site-wide. Pages pass
// a key via `for="..."` instead of a raw string, e.g. <PageLoader for="profile" />.
// Convention: owner-context surfaces use "your …"; public / shared / viewing
// surfaces stay neutral. To reword any loader app-wide, edit it once here.
export const LOADER_MESSAGES = {
  // ── Owner surfaces — the person's own stuff ("your …") ──────────────
  profile: "Loading your profile…", // /profile
  petCards: "Loading your pet cards…", // /pet-card
  openingCard: "Opening your card…", // /pet-card — redirecting a 1-pet owner
  healthHistory: "Loading your health checks…", // /health-history
  careEditor: "Loading care card editor…", // /pet-card/[slug]/care-edit
  heroEditor: "Loading hero card editor…", // /pet-card/[slug]/hero-edit
  shareSettings: "Loading your share settings…", // /pet-card/[slug]/share
  accountSettings: "Loading your account settings…", // /account
  savedVets: "Loading your saved vets…", // /saved-vets

  // ── A pet's cards (viewing, may be someone else's) ──────────────────
  heroCard: "Loading hero card…", // /pet-card/[slug]/hero (+ /[token])
  careCard: "Loading care card…", // /pet-card/[slug]/care (+ /[token])
  petPage: "Loading pet…", // /pet/[petId]

  // ── People ──────────────────────────────────────────────────────────
  // A PERSON's public profile page (not a vet clinic).
  publicProfile: "Loading profile…", // /profile/[username]

  // ── Vets (clinics — distinct from people's profiles) ────────────────
  vetDirectory: "Loading vets…", // /vets  (the find-a-vet directory)
  vetClinic: "Loading vet…", // /vet/[slug] (one clinic's page)

  // ── Symptom checker ─────────────────────────────────────────────────
  symptomChecker: "Loading symptom checker…", // /symptom-checker
  symptomChat: "Loading chat…", // /symptom-checker/chat

  // ── Marketing / info pages ──────────────────────────────────────────
  home: "Loading PetParrk…", // /
  about: "Loading about…", // /about
  howItWorks: "Loading how it works…", // /how-it-works
  contact: "Loading contact…", // /contact

  // ── Legal / policy pages ────────────────────────────────────────────
  privacyPolicy: "Loading privacy policy…", // /privacy-policy
  termsOfService: "Loading terms of service…", // /terms-of-service
  codeOfConduct: "Loading code of conduct…", // /code-of-conduct
  accessibility: "Loading accessibility…", // /accessibility
  doNotSell: "Loading your privacy choices…", // /do-not-sell (Do Not Sell My Personal Information)

  // ── Auth / admin ────────────────────────────────────────────────────
  admin: "Loading admin…", // /admin
  unlock: "Loading…", // /unlock
  resetPassword: "Loading password reset…", // /reset-password

  // ── Generic fallback (any route without its own key) ────────────────
  default: "Loading…",
};

export default function PageLoader({
  message,
  for: forKey,
  fullHeight = true,
}) {
  // Resolve the text: an explicit `message` wins (back-compat); otherwise look
  // up the `for` key in the central map; otherwise fall back to the default.
  const resolved =
    message ?? LOADER_MESSAGES[forKey] ?? LOADER_MESSAGES.default;
  return (
    <div
      style={{
        minHeight: fullHeight ? "calc(100vh - 64px)" : undefined,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "14px",
        padding: "32px 16px",
      }}
    >
      <div
        className="page-loader-trail"
        style={{ display: "flex", alignItems: "center", gap: "10px" }}
        aria-hidden="true"
      >
        <PawPrint size={24} strokeWidth={2} />
        <PawPrint size={24} strokeWidth={2} />
        <PawPrint size={24} strokeWidth={2} />
      </div>
      <p
        role="status"
        aria-live="polite"
        style={{
          fontFamily: "var(--font-urbanist, 'Urbanist', sans-serif)",
          fontSize: "16px",
          fontWeight: 500,
          color: MUTED,
          margin: 0,
        }}
      >
        {resolved}
      </p>

      <style jsx global>{`
        @keyframes paw-walk {
          0%,
          100% {
            opacity: 0.2;
          }
          40%,
          60% {
            opacity: 1;
          }
        }
        .page-loader-trail svg {
          color: ${TERRACOTTA};
          opacity: 0.2;
          animation: paw-walk 1.2s ease-in-out infinite;
        }
        .page-loader-trail svg:nth-child(1) {
          transform: rotate(-12deg) translateY(2px);
          animation-delay: 0s;
        }
        .page-loader-trail svg:nth-child(2) {
          transform: translateY(-2px);
          animation-delay: 0.2s;
        }
        .page-loader-trail svg:nth-child(3) {
          transform: rotate(12deg) translateY(2px);
          animation-delay: 0.4s;
        }
        @media (prefers-reduced-motion: reduce) {
          .page-loader-trail svg {
            animation: none;
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}
