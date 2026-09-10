"use client";
// =============================================================
// PetTile.js — shared pet-card tile
// Single source of truth for the pet tile used across the profile /
// pet-card pages. Renders the photo, identity, specs, med lines, the
// recent symptom-check row, and (owner-only) a Care / Hero / Share
// actions row.
// =============================================================
import Link from "next/link";
import { useState } from "react";
import {
  Pencil,
  Camera,
  ArrowRight,
  PawPrint,
  ClipboardList,
  Award,
  Share2,
} from "lucide-react";
import PetInsights from "./PetInsights";
import {
  C,
  BANNER_LUCIDE,
  ClampedMedline,
  speciesBucket,
  speciesCardGradient,
  formatAge,
  smartRoundWeight,
  convertWeightToDisplay,
} from "../lib/petTileHelpers";

// The tile's self-contained CSS. Co-located so any page that imports
// <PetTile> gets the correct styling with no CSS to copy. Rendered once
// per tile is fine (identical <style> blocks dedupe in the DOM), but
// callers that render many tiles can also lift <PetTileStyles/> out.
export function PetTileStyles() {
  return (
    <style>{`
        .pp-pet-card-outer {
          border-radius: 18px;
          padding: 1.5px;
          height: 100%;
          background: ${C.border};
          transition: transform 0.3s, background 0.25s ease;
          text-decoration: none;
          display: block;
          color: inherit;
        }
        .pp-pet-card-outer:hover { background: rgba(239,200,139,0.5); }
        .pp-pet-photo-link {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }
        .pp-pet-photo-link img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .pp-pet-name-link {
          display: inline-flex;
          align-items: center;
          min-height: 44px;
          color: inherit;
          text-decoration: none;
          transition: color 0.15s;
        }
        .pp-pet-name-link:hover { color: ${C.terracotta}; }
        .pp-pet-photo-link:focus-visible,
        .pp-pet-name-link:focus-visible {
          outline: 2px solid ${C.terracotta};
          outline-offset: 2px;
        }
        .pp-pet-card {
          border-radius: 16px;
          background: #fff;
          transition: box-shadow 0.25s;
          box-shadow: 0 2px 12px rgba(23,37,49,0.07);
          border: 1px solid ${C.border};
          position: relative;
          overflow: hidden;
          display: flex; flex-direction: column;
          height: 100%;
        }
        .pp-pet-card-outer:hover .pp-pet-card {
          box-shadow: 0 0 0 1.5px rgba(239,200,139,0.9), 0 16px 48px rgba(23,37,49,0.13);
        }
        .pp-pet-photo {
          /* height: 220px; */
          aspect-ratio: 1 / 1;
          position: relative;
          display: flex; 
          align-items: center; 
          justify-content: center;
          font-size: 64px;
          overflow: hidden;
        }
        .pp-pet-photo img {
          width: 100%; 
          height: 100%; 
          object-fit: cover; 
          display: block;
        }
        .pp-pet-photo-camera {
          position: absolute; bottom: 12px; right: 12px;
          z-index: 2;
          width: 44px; height: 44px;
          border-radius: 50%;
          background: ${C.terracotta};
          color: #fff;
          border: 2px solid #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.20);
          transition: background 0.15s;
          line-height: 1;
        }
        .pp-pet-photo-camera:hover { background: ${C.terracottaDark}; }

        .pp-pet-edit-btn {
          position: absolute; top: 12px; right: 12px;
          z-index: 2;
          width: 44px; height: 44px;
          border-radius: 50%;
          background: rgba(255,255,255,0.95);
          color: ${C.navyDark};
          border: 2px solid #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          transition: background 0.15s, color 0.15s;
          line-height: 1;
          z-index: 2;
        }
        .pp-pet-edit-btn:hover {
          background: ${C.navyDark};
          color: #fff;
        }

        .pp-pet-body { padding: 14px 16px 14px; flex: 1; display: flex; flex-direction: column; }
        .pp-pet-name {
          margin: 0 0 10px; font-size: 20px; font-weight: 800;
          color: ${C.navyDark}; letter-spacing: -0.01em;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pp-pet-name-divider {
          height: 1px;
          background: ${C.border};
          margin: 0 0 12px;
        }
        .pp-pet-specs {
          display: flex;
          flex-direction: column;
          gap: 5px;
          font-size: 16px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pp-pet-specs > div {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .pp-pet-spec-label { 
          color: ${C.muted}; 
          font-weight: 500; 
          white-space: nowrap;
          flex-shrink: 0;
        }
        .pp-pet-spec-value {
          color: ${C.navyDark};
          font-weight: 600;
          margin-left: auto;
          text-align: right;
          min-width: 0;
        }
        .pp-pet-spec-breed .pp-pet-spec-value {
          word-break: break-word;
        }

        .pp-pet-medlines {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 75px;
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid ${C.border};
        }
        .pp-medline {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 16px;
          line-height: 1.4;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          min-width: 0;
        }
        .pp-medline-label {
          color: ${C.muted};
          font-weight: 500;
          flex-shrink: 0;
        }
        .pp-medline-clip {
          overflow: hidden;
          transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pp-medline-value {
          font-weight: 600;
          min-width: 0;
          display: block;
        }
        .pp-medline-value.pp-medvalue-clamp {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        @media (prefers-reduced-motion: reduce) {
          .pp-medline-clip { transition: none; }
        }
        .pp-medline-toggle {
          display: inline-flex;
          align-items: center;
          min-height: 44px;
          align-self: flex-start;
          background: none;
          border: none;
          padding: 12px 0 10px;
          margin: -10px 0;
          font-size: 14px;
          font-weight: 700;
          color: ${C.terracotta};
          cursor: pointer;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: color 0.15s;
        }
        .pp-medline-toggle:hover {
          color: ${C.navyDark};
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .pp-pet-recent {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 16px;
          border-top: 1px solid ${C.border};
          border-left: none; border-right: none; border-bottom: none;
          background: #fff;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          width: 100%;
          cursor: pointer;
          font: inherit;
          transition: background 0.15s;
        }
        .pp-pet-recent { transition: background 0.18s ease; background: var(--recent-bg, #fff); }
        .pp-pet-recent:hover { background: var(--recent-bg-hover, ${C.cream}); }
        .pp-pet-recent-text {
          font-size: 16px; 
          font-weight: 600;
          color: ${C.slate};
          display: flex; align-items: center; gap: 6px;
          min-width: 0;
          line-height: 1.3;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pp-pet-recent-text .dot {
          width: 8px; height: 8px; border-radius: 50%;
          flex-shrink: 0;
        }
        .pp-pet-recent-arrow {
          color: ${C.terracotta};
          transition: transform 0.15s;
          flex-shrink: 0;
          line-height: 1;
          display: inline-flex;
          align-items: center;
        }
        .pp-pet-recent:hover .pp-pet-recent-arrow { transform: translateX(3px); }
        .pp-pet-recent.empty { cursor: default; }
        .pp-pet-recent.empty:hover { background: #fff; }

        /* ---- Reminders strip (owner-only, conditional) ----
           Only takes up space once PetInsights reports it has something. */
        .pp-pet-reminders.has-content {
          padding: 12px 16px;
          border-top: 1px solid ${C.border};
          background: #fff;
        }

        /* ---- Actions row: Care Card / Hero Card / Share (owner-only) ---- */
        .pp-pet-actions {
          display: flex;
          align-items: stretch;
          border-top: 1px solid ${C.border};
          background: #fff;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pp-pet-action {
          flex: 1 1 0;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 11px 8px;
          font-size: 13.5px;
          font-weight: 700;
          color: ${C.slate};
          text-decoration: none;
          background: none;
          border: none;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
          font-family: inherit;
          line-height: 1;
          min-width: 0;
        }
        .pp-pet-action + .pp-pet-action {
          border-left: 1px solid ${C.border};
        }
        .pp-pet-action:hover {
          background: ${C.cream};
          color: ${C.terracotta};
        }
        .pp-pet-action:focus-visible {
          outline: 2px solid ${C.terracotta};
          outline-offset: -2px;
        }
        .pp-pet-action svg { flex-shrink: 0; }
        .pp-pet-action-label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        @media (max-width: 380px) {
          .pp-pet-action { font-size: 12.5px; padding: 11px 4px; gap: 4px; }
        }
        @media (max-width: 768px) {
          .pp-pet-photo {
            aspect-ratio: 1 / 1;
            font-size: 56px;
          }
          .pp-pet-name { font-size: 20px; }
          .pp-pet-specs { row-gap: 5px; }
        }
    `}</style>
  );
}

export default function PetTile({
  pet,
  isOwner = false,
  recent = null,
  triage = null,
  bannerPalette,
  petPhotoRefs,
  onEdit,
  onPhotoUpload,
  onViewSymptomCheck,
  relativeTimeShort,
  includeStyles = true,
}) {
  const [hasReminders, setHasReminders] = useState(false);
  const ageStr = formatAge(pet.birthday);
  const speciesDisplay = pet.species || "—";
  // Care Card link → the owner's Care Card DISPLAY (view-first). Editing is
  // reached from a prominent "Edit Care Card" button on that page, mirroring
  // how the Hero Card link opens the Hero display. Used by the photo, the
  // name, and the "Care Card" action button so the whole tile is consistent.
  const careHref = pet.slug ? `/pet-card/${pet.slug}/care` : "/pet-card";
  const heroHref = pet.slug ? `/pet-card/${pet.slug}/hero` : "/pet-card";
  const shareHref = pet.slug ? `/pet-card/${pet.slug}/share` : "/pet-card";

  // The photo and the name are the card's two big click targets. For the OWNER
  // they open the Care Card. A visitor must never be sent there — it holds
  // medications, allergies, and vet records — so they get the public hub.
  // careHref/heroHref/shareHref below are only ever rendered inside
  // `isOwner &&` blocks; this one is not, so it needs its own guard.
  const cardHref = isOwner ? careHref : "/pet-card";

  return (
    <div className="pp-pet-card-outer">
      {includeStyles && <PetTileStyles />}
      <div className="pp-pet-card">
        <div
          className="pp-pet-photo"
          style={{
            background: pet.photo_url
              ? "transparent"
              : speciesCardGradient(pet.species),
          }}
        >
          <Link
            href={cardHref}
            className="pp-pet-photo-link"
            aria-label={`Open ${pet.name}'s pet card`}
          >
            {pet.photo_url ? (
              <img src={pet.photo_url} alt={pet.name} />
            ) : (
              (() => {
                const SpeciesIcon =
                  BANNER_LUCIDE[speciesBucket(pet.species)] || PawPrint;
                return (
                  <SpeciesIcon
                    size={132}
                    strokeWidth={1.4}
                    color="rgba(255,255,255,0.85)"
                  />
                );
              })()
            )}
          </Link>
          {isOwner && (
            <>
              <button
                className="pp-pet-edit-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit?.(pet);
                }}
                title="Edit pet"
                aria-label="Edit pet"
              >
                <Pencil size={16} />
              </button>
              <button
                className="pp-pet-photo-camera"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  petPhotoRefs?.current[pet.id]?.click();
                }}
                title="Change pet photo"
                aria-label="Change pet photo"
              >
                <Camera size={18} />
              </button>
              <input
                ref={(el) => {
                  if (petPhotoRefs) petPhotoRefs.current[pet.id] = el;
                }}
                type="file"
                accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
                onChange={(e) => onPhotoUpload?.(e, pet.id)}
                style={{ display: "none" }}
                onClick={(e) => e.stopPropagation()}
              />
            </>
          )}
        </div>

        <div className="pp-pet-body">
          <h3 className="pp-pet-name">
            <Link href={cardHref} className="pp-pet-name-link">
              {pet.name}
            </Link>
          </h3>
          <div className="pp-pet-name-divider" />
          <div className="pp-pet-specs">
            <div className="pp-pet-spec-breed">
              <span className="pp-pet-spec-label">Breed: </span>
              <span className="pp-pet-spec-value">
                {pet.breed || speciesDisplay}
              </span>
            </div>
            <div>
              <span className="pp-pet-spec-label">Age: </span>
              <span className="pp-pet-spec-value">{ageStr || "—"}</span>
            </div>
            <div>
              <span className="pp-pet-spec-label">Sex: </span>
              <span className="pp-pet-spec-value">{pet.sex || "—"}</span>
            </div>
            <div>
              <span className="pp-pet-spec-label">Weight: </span>
              <span className="pp-pet-spec-value">
                {pet.weight_value != null
                  ? `${smartRoundWeight(convertWeightToDisplay(pet.weight_value, pet.weight_unit || "lbs"))} ${pet.weight_unit || "lbs"}`
                  : "—"}
              </span>
            </div>
            <div>
              <span className="pp-pet-spec-label">Microchipped: </span>
              <span className="pp-pet-spec-value">
                {pet.microchip_number?.trim() ? "Yes" : "No"}
              </span>
            </div>
          </div>

          <div className="pp-pet-medlines">
            <ClampedMedline
              C={C}
              label="Allergies:"
              value={pet.allergies}
              accent={bannerPalette?.accent}
            />
            <ClampedMedline
              C={C}
              label="Meds:"
              value={pet.medications}
              accent={bannerPalette?.accent}
            />
          </div>
        </div>

        {recent ? (
          <button
            type="button"
            className="pp-pet-recent"
            style={{
              "--recent-bg": `${triage.dot}26`,
              "--recent-bg-hover": `${triage.dot}40`,
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onViewSymptomCheck?.(pet, recent);
            }}
          >
            <span
              className="pp-pet-recent-text"
              style={{ color: triage.text, fontWeight: 700 }}
            >
              <span className="dot" style={{ background: triage.dot }} />
              {triage.short} · {relativeTimeShort?.(recent.created_at)}
            </span>
            <span
              className="pp-pet-recent-arrow"
              style={{ color: triage.text }}
            >
              <ArrowRight size={16} strokeWidth={2.4} />
            </span>
          </button>
        ) : (
          <div className="pp-pet-recent empty">
            <span className="pp-pet-recent-text" style={{ color: C.muted }}>
              No checks yet
            </span>
          </div>
        )}

        {/* Reminders — owner-only, and only when there's something actionable.
            The wrapper only gets its border/padding once PetInsights reports
            it has something to show, so an identity-focused tile stays clean. */}
        {isOwner && (
          <div
            className={`pp-pet-reminders${hasReminders ? " has-content" : ""}`}
          >
            <PetInsights
              petId={pet.id}
              surface="profile"
              petName={pet.name}
              onLoaded={(count) => setHasReminders(count > 0)}
            />
          </div>
        )}

        {/* Actions row — owner-only. View the Care Card / Hero Card, or manage
            sharing. Editing each card is reached from its display page. */}
        {isOwner && (
          <div className="pp-pet-actions">
            <Link href={careHref} className="pp-pet-action">
              <ClipboardList size={15} strokeWidth={2} />
              <span className="pp-pet-action-label">Care Card</span>
            </Link>
            <Link href={heroHref} className="pp-pet-action">
              <Award size={15} strokeWidth={2} />
              <span className="pp-pet-action-label">Hero Card</span>
            </Link>
            <Link href={shareHref} className="pp-pet-action">
              <Share2 size={15} strokeWidth={2} />
              <span className="pp-pet-action-label">Share</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
