"use client";

// =============================================================
// HeroNameplate — shared photo + nameplate, single source of truth
// for BOTH the Hero Card display (variant="full") and the Pet Cards
// hub mini-preview (variant="mini").
//
// APPROACH B (full): emits the EXACT `hc-` structure the Hero Card
// already styles (.hc-photo > img/.hc-photo-fallback + .hc-nameplate
// > .hc-rarity/.hc-name/.hc-nickname/.hc-breed/.hc-age). The display
// page's existing CSS — including proven-fix rules
// (.hc-card > .hc-leftcol > .hc-photo{height:500px}, the ::after
// overlay, and the ::before blend into --t-card) — keeps matching
// UNTOUCHED. Full carries NO CSS of its own.
//
// Mini is self-contained with its own scoped `hn-` CSS.
// =============================================================

import { Award, PawPrint } from "lucide-react";
import { BANNER_LUCIDE, speciesBucket } from "../lib/petTileHelpers";

export const HERO_RARITY_TIERS = {
  common: { label: "Beloved", color: "#8A94A6" },
  uncommon: { label: "Special", color: "#16A34A" },
  rare: { label: "Rare", color: "#2563EB" },
  epic: { label: "Epic", color: "#9333EA" },
  legendary: { label: "Legendary", color: "#F59E0B" },
};

const GOLD = "#EFC88B";

function hnMeaningful(v) {
  if (!v) return false;
  const t = String(v).trim().toLowerCase();
  return t && !["none", "n/a", "na", "no", "-", "nothing"].includes(t);
}

export default function HeroNameplate({
  name,
  nickname,
  breed,
  age,
  photoUrl,
  species,
  rarity,
  variant = "full",
  showAge = variant === "full",
  cardColor = "#FFFFFF",
}) {
  const tier = hnMeaningful(rarity) ? HERO_RARITY_TIERS[rarity] : null;

  // ── FULL: byte-identical to the card's original inline JSX ──
  if (variant === "full") {
    return (
      <div className="hc-photo">
        {photoUrl ? (
          <img src={photoUrl} alt="" />
        ) : (
          <div className="hc-photo-fallback">
            {(() => {
              const SpeciesIcon =
                BANNER_LUCIDE[speciesBucket(species)] || PawPrint;
              return <SpeciesIcon size={96} strokeWidth={1.5} />;
            })()}
          </div>
        )}
        <div className="hc-nameplate">
          {tier && (
            <div
              className="hc-rarity"
              style={{
                background: tier.color,
                boxShadow: `0 2px 8px rgba(0,0,0,0.3), 0 0 0 1.5px rgba(255,255,255,0.85)`,
              }}
            >
              <Award size={12} strokeWidth={2.5} />
              {tier.label}
            </div>
          )}
          <div className="hc-name">{name}</div>
          {hnMeaningful(nickname) && (
            <div className="hc-nickname">aka &ldquo;{nickname}&rdquo;</div>
          )}
          {hnMeaningful(breed) && <div className="hc-breed">{breed}</div>}
          {showAge && age && <div className="hc-age">{age}</div>}
        </div>
      </div>
    );
  }

  // ── MINI: self-contained (hub page has no `hc-` styles) ──
  return (
    <div className="hn-root hn-mini">
      <div className="hn-photo">
        {photoUrl ? (
          <img src={photoUrl} alt="" loading="lazy" />
        ) : (
          <div className="hn-photo-fallback">
            {(() => {
              const SpeciesIcon =
                BANNER_LUCIDE[speciesBucket(species)] || PawPrint;
              return <SpeciesIcon size={64} strokeWidth={1.5} />;
            })()}
          </div>
        )}
        <div
          className="hn-photo-blend"
          style={{
            background: `linear-gradient(to bottom, transparent 0%, ${cardColor} 100%)`,
          }}
        />
        <div className="hn-nameplate">
          {tier && (
            <div
              className="hn-rarity"
              style={{
                background: tier.color,
                boxShadow: `0 2px 8px rgba(0,0,0,0.3), 0 0 0 1.5px rgba(255,255,255,0.85)`,
              }}
            >
              <Award size={11} strokeWidth={2.5} color={GOLD} />
              {tier.label}
            </div>
          )}
          <div className="hn-name">{name}</div>
          {hnMeaningful(nickname) && (
            <div className="hn-nickname">aka &ldquo;{nickname}&rdquo;</div>
          )}
          {hnMeaningful(breed) && <div className="hn-breed">{breed}</div>}
          {showAge && age && <div className="hn-age">{age}</div>}
        </div>
      </div>

      <style>{`
        .hn-root { position: relative; width: 100%; height: 100%; }
        .hn-photo {
          position: relative; width: 100%; height: 100%; overflow: hidden;
          background: linear-gradient(150deg, #2A3F4D, #172531);
        }
        .hn-photo img { width: 100%; height: 100%; object-fit: cover; display: block; color: transparent; font-size: 0; }
        .hn-photo-fallback {
          width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.85);
        }
        .hn-photo-blend {
          position: absolute; left: 0; right: 0; bottom: 0; height: 40px;
          z-index: 2; pointer-events: none;
        }
        .hn-nameplate {
          position: absolute; 
          left: 0; 
          right: 0; 
          bottom: 0; 
          z-index: 3;
          padding: 34px 13px 20px; 
          color: #fff;
          display: flex; 
          flex-direction: column; 
          align-items: flex-start;
          justify-content: center;
          background: linear-gradient(to top, rgba(23,37,49,0.94) 30%, transparent);
          margin-top: 20px;
        }
        .hn-rarity {
          align-self: flex-start; display: inline-flex; align-items: center; gap: 5px;
          height: 24px; padding: 0 11px 0 9px; margin-bottom: 10px; line-height: 1;
          color: #fff; font-size: 11px; font-weight: 800; letter-spacing: 0.08em;
          text-transform: uppercase; border-radius: 999px;
          text-shadow: 0 1px 1px rgba(0,0,0,0.3);
        }
        .hn-name { font-size: 28px; font-weight: 800; line-height: 1; letter-spacing: -0.02em; }
        .hn-nickname { font-size: 16px; font-weight: 600; font-style: italic; color: ${GOLD}; }
        .hn-breed { font-size: 15px; font-weight: 500; color: rgba(255,255,255,0.85); }
        .hn-age { font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.7); margin-top: 2px; }
      `}</style>
    </div>
  );
}
