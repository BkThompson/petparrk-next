"use client";

// ============================================================================
// PUBLIC HERO CARD — token page  (app/pet-card/[slug]/hero/[token]/page.js)
// ============================================================================
// No-login public view via a secret share token. Only published + shareable
// cards resolve (enforced by get_pet_for_hero_token). Records a view on mount.
// Renders the interactive FLIP card on the pet's REAL hero background (CSS
// design or animated Vanta) — the collectible the share link is meant to show.
// ============================================================================

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { Download } from "lucide-react";
import PageLoader from "../../../../../components/PageLoader";
import {
  getSharedPetForHero,
  recordCardView,
} from "../../../../../lib/petCardApi";
import HeroFlipCardLive from "../../../../../components/HeroFlipCardLive";
import {
  deriveTheme,
  exportHeroFlipImage,
} from "../../../../../components/HeroFlipCard";
import { CssDesign } from "../../../../../components/HeroBackgrounds";

const VantaBackground = dynamic(
  () => import("../../../../../components/VantaBackground"),
  { ssr: false },
);

const DEFAULT_DESIGN = "waves";
const DEFAULT_CATEGORY = "vanta";

// Mirrors the HeroBackground in HeroCardView: route by category.
function HeroBackground({ design, category, bg, accent, lighting }) {
  if (category === "svg")
    return (
      <CssDesign
        design="gradient"
        bg={bg}
        accent={accent}
        lighting={lighting}
      />
    );
  if (category === "css")
    return (
      <CssDesign design={design} bg={bg} accent={accent} lighting={lighting} />
    );
  return <VantaBackground effect={design} bg={bg} accent={accent} fullHeight />;
}

export default function PublicHeroCardPage() {
  const params = useParams();
  const token = params?.token;

  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function load() {
      const { data, error: err } = await getSharedPetForHero(token);
      if (cancelled) return;
      if (err || !data) {
        setError("This Hero Card link is no longer available.");
        setLoading(false);
        return;
      }
      setPet(data);
      setLoading(false);
      recordCardView(token, "hero").catch(() => {});
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return <PageLoader for="heroCard" />;
  }
  if (error || !pet) {
    return <HeroUnavailable message={error || "Card unavailable."} />;
  }

  const pub = pet.hero_published || null;
  const data = pub ? { ...pet, ...pub } : pet;
  const theme = deriveTheme(data);
  const bgDesign = data.hero_bg_design || DEFAULT_DESIGN;
  const bgCategory = data.hero_bg_category || DEFAULT_CATEGORY;
  const bgLighting = (() => {
    const raw = data.hero_lighting;
    if (!raw) return null;
    try {
      const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
      return (obj && obj[bgDesign]) || null;
    } catch {
      return null;
    }
  })();

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      await exportHeroFlipImage(pet);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      className="pht-page"
      style={{
        "--pht-accent": theme.accent,
        "--pht-accent-on-bg": theme.accentOnBg,
        "--pht-label": theme.labelColor,
        "--pht-text-on-accent": theme.textOnAccentOnBg,
        "--pht-bg": theme.bg,
        "--pht-bg-text": theme.bgText,
        "--pht-bg-muted": theme.bgMuted,
        "--pht-brand-shadow": theme.brandShadow,
        "--pht-scrim": theme.scrimColor,
        "--pht-intro-name": theme.introName,
        "--pht-intro-sub": theme.introSub,
        "--pht-footer": theme.introFooter || theme.accentOnBg,
      }}
    >
      {/* Real hero background (CSS design or animated Vanta), full-bleed. */}
      <div className="pht-bg">
        <HeroBackground
          design={bgDesign}
          category={bgCategory}
          bg={theme.bg}
          accent={theme.accent}
          lighting={bgLighting}
        />
      </div>

      <div className="pht-inner">
        <div className="pht-intro">
          <p className="pht-eyebrow">Hero Card</p>
          <h1 className="pht-name">Meet {data.nickname || pet.name}</h1>
        </div>

        <HeroFlipCardLive pet={pet} />

        {/* Layout order: download → make-your-own, spaced. Flip affordance now
            lives on the card itself (corner badge). */}
        <div className="pht-actions">
          <button
            type="button"
            className="pht-download"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download size={18} />
            {downloading ? "Preparing…" : "Download Hero Card"}
          </button>

          <a
            className="pht-brand"
            href="https://petparrk.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Make your own on <b>PetParrk</b>{" "}
            <svg
              className="pht-brand-paw"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="4" r="2" />
              <circle cx="18" cy="8" r="2" />
              <circle cx="20" cy="16" r="2" />
              <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
            </svg>
          </a>
        </div>
      </div>

      <style>{`
        .pht-page {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 45px 18px 72px;
          font-family: 'Urbanist',-apple-system,BlinkMacSystemFont,sans-serif;
          overflow: hidden;
        }
        .pht-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
        .pht-inner {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 380px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 26px;
        }
        /* Scrim behind the title for legibility on any background — mirrors
           the hero card's .hc-intro::before radial scrim. */
        .pht-intro {
          position: relative;
          text-align: center;
          width: 100%;
          padding: 4px 8px 0;
          margin-bottom: 10px;
        }
        .pht-intro::before {
          content: "";
          position: absolute;
          inset: -14px 0;
          background: radial-gradient(
            150% 130% at 50% 40%,
            var(--pht-scrim, transparent) 0%,
            var(--pht-scrim, transparent) 42%,
            transparent 88%
          );
          z-index: -1;
          border-radius: 20px;
        }
        .pht-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--pht-label, #a68ce0);
          margin: 0 0 8px;
        }
        .pht-name {
          font-size: 32px; font-weight: 800; color: var(--pht-intro-name, #fff);
          margin: 0; text-align: center; letter-spacing: -0.03em;
          line-height: 1.04;
        }
        .pht-actions {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
        }
        /* Full-width download button. Resting = filled accent; hover = outline
           (transparent + accent border + white text) so it reads on any bg. */
        .pht-download {
          width: 100%;
          display: inline-flex; align-items: center; justify-content: center;
          gap: 9px;
          background: var(--pht-accent-on-bg, #a68ce0);
          border: 2px solid var(--pht-accent-on-bg, #a68ce0);
          color: var(--pht-text-on-accent, #172531);
          font-family: inherit; font-size: 16px; font-weight: 700;
          padding: 14px 20px; border-radius: 14px; cursor: pointer;
          transition: background 0.18s ease, color 0.18s ease, transform 0.05s ease;
        }
        .pht-download:hover {
          background: var(--pht-bg, #1A2D44);
          color: var(--pht-accent-on-bg, #a68ce0);
          border-color: var(--pht-accent-on-bg, #a68ce0);
        }
        .pht-download:active { transform: translateY(1px); }
        .pht-download:disabled { opacity: 0.65; cursor: default; }
        .pht-brand {
          font-size: 13px; font-weight: 600;
          color: var(--pht-bg-muted, rgba(255,255,255,0.8));
          text-decoration: none;
        }
        .pht-brand b { color: var(--pht-footer, var(--pht-bg-text, #fff)); }
        .pht-brand-paw { color: var(--pht-footer, var(--pht-bg-text, #fff)); vertical-align: middle; display: inline-block; }
        .pht-brand:hover { color: var(--pht-footer, var(--pht-bg-text, #fff)); }
      `}</style>
    </div>
  );
}

function HeroUnavailable({ message }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F8EFE2",
        fontFamily: "'Urbanist',-apple-system,sans-serif",
        padding: "24px",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "420px" }}>
        <div style={{ fontSize: "44px", marginBottom: "12px" }}>🐾</div>
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 800,
            color: "#172531",
            margin: "0 0 8px",
          }}
        >
          Hero Card unavailable
        </h1>
        <p
          style={{
            fontSize: "15px",
            color: "#717A86",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {message} The owner may have turned off sharing or unpublished this
          card.
        </p>
      </div>
    </div>
  );
}
