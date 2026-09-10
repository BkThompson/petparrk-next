"use client";

/* ════════════════════════════════════════════════════════════════════════
   ProfileEditForm — the owner's profile editor (name, username, bio,
   banner colour).

   Shared by:
     • app/profile/page.js            (ProfileMain)
     • app/profile/[username]/page.js (ProfileUsername)

   The two copies were 88% identical. The only real divergence was the
   "Preview as public" row, so that is now driven by two props:

     previewHref  — where the preview link points. ProfileMain navigates to
                    the public profile; ProfileUsername is already there and
                    passes "?preview=public".
     onCopyLink   — optional async () => boolean. Supplied only by
                    ProfileMain, which owns the clipboard + toast. When
                    absent, the "Copy link" button does not render — on the
                    public page the URL is already in the address bar.
   ════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Copy,
  X,
  WandSparkles,
  AlertTriangle,
} from "lucide-react";
import AutoGrowTextarea from "./AutoGrowTextarea";
import {
  BANNER_PALETTE,
  BANNER_LUCIDE,
  CUSTOM_LUCIDE,
  pageGradient,
} from "../lib/petTileHelpers";

export default function ProfileEditForm({
  C,
  profileForm,
  setProfileForm,
  savedUsername,
  usernameError,
  setUsernameError,
  autoKey,
  onSave,
  onCancel,
  saving,
  // Where "Preview as public" points. ProfileMain navigates to the public
  // profile; ProfileUsername is already there, so it passes "?preview=public".
  previewHref,
  // Optional. Only ProfileMain (the owner's console) shows "Copy link" —
  // on the public page the URL is already in the address bar.
  onCopyLink,
}) {
  const [copied, setCopied] = useState(false);

  // Live city/state preview from the zip the user is currently typing
  // (debounced), so they get instant feedback before saving — not only
  // after the save round-trips back into profile.zip_code.
  const [zipCity, setZipCity] = useState("");
  useEffect(() => {
    const zip = (profileForm.zip_code || "").trim();
    if (zip.length !== 5) {
      setZipCity("");
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      fetch(`https://api.zippopotam.us/us/${zip}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (cancelled) return;
          if (d?.places?.[0]) {
            setZipCity(
              `${d.places[0]["place name"]}, ${d.places[0]["state abbreviation"]}`,
            );
          } else {
            setZipCity("");
          }
        })
        .catch(() => {
          if (!cancelled) setZipCity("");
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [profileForm.zip_code]);

  return (
    <div className="pp-form-card" style={{ position: "relative" }}>
      <button
        className="pp-modal-close"
        onClick={onCancel}
        aria-label="Close form"
        type="button"
        style={{
          position: "absolute",
          top: "14px",
          right: "14px",
          zIndex: 10,
        }}
      >
        <X size={22} strokeWidth={2.2} />
      </button>
      <div className="pp-form-head" style={{ paddingRight: "48px" }}>
        <p className="pp-form-eyebrow">Profile</p>
        <h3>Edit your profile</h3>
      </div>
      <div className="form-grid">
        <div className="field">
          <label className="label">Display Name</label>
          <input
            className="input"
            value={profileForm.full_name}
            onChange={(e) =>
              setProfileForm({ ...profileForm, full_name: e.target.value })
            }
            placeholder="Your name"
          />
        </div>
        <div className="field">
          <label className="label">Username</label>
          <input
            className="input"
            value={profileForm.username}
            onChange={(e) => {
              setUsernameError("");
              setProfileForm({
                ...profileForm,
                username: e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9_]/g, "")
                  .slice(0, 20),
              });
            }}
            placeholder="username"
            style={{ borderColor: usernameError ? C.error : undefined }}
          />
          {usernameError ? (
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "12px",
                fontWeight: 500,
                color: C.error,
              }}
            >
              {usernameError}
            </p>
          ) : profileForm.username &&
            savedUsername &&
            profileForm.username !== savedUsername ? (
            <div
              style={{
                margin: "8px 0 0",
                padding: "12px 14px",
                background: C.warningBg,
                border: `1px solid ${C.warning}33`,
                borderRadius: "10px",
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
              }}
            >
              <AlertTriangle
                size={18}
                strokeWidth={2.2}
                style={{ color: C.warning, flexShrink: 0, marginTop: "1px" }}
              />
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: 700,
                    color: C.warning,
                    textWrap: "pretty",
                  }}
                >
                  Changing your username breaks shared links
                </p>
                <p
                  style={{
                    margin: "3px 0 0",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: C.warning,
                    lineHeight: 1.45,
                    textWrap: "pretty",
                  }}
                >
                  Anyone with your old link won&apos;t find your profile.
                </p>
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: C.warning,
                    lineHeight: 1.45,
                    textWrap: "pretty",
                  }}
                >
                  Your new URL will be:{" "}
                  <span style={{ fontWeight: 700, wordBreak: "break-all" }}>
                    petparrk.com/profile/{profileForm.username}
                  </span>
                  .
                </p>
              </div>
            </div>
          ) : (
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "14px",
                fontWeight: 500,
                color: C.muted,
              }}
            >
              Your profile lives at petparrk.com/profile/
              {profileForm.username || "username"}
            </p>
          )}
        </div>
      </div>
      <div className="field">
        <label className="label">Bio</label>
        <AutoGrowTextarea
          className="input"
          value={profileForm.bio}
          onChange={(e) =>
            setProfileForm({ ...profileForm, bio: e.target.value })
          }
          placeholder="A little about you and your pets..."
          rows={3}
          minHeight="84px"
        />
      </div>
      <div className="form-grid">
        <div className="field">
          <label className="label">Zip Code</label>
          <input
            className="input"
            value={profileForm.zip_code}
            onChange={(e) =>
              setProfileForm({
                ...profileForm,
                zip_code: e.target.value.replace(/\D/g, "").slice(0, 5),
              })
            }
            placeholder="e.g. 94610"
            style={{ maxWidth: "180px" }}
          />
          {zipCity && (
            <p
              style={{
                margin: "6px 0 0",
                fontSize: "14px",
                fontWeight: 600,
                color: C.terracotta,
              }}
            >
              {zipCity}
            </p>
          )}
        </div>
        <div className="field" style={{ alignSelf: "start" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: 600,
              color: C.navyDark,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={profileForm.is_public}
              onChange={(e) =>
                setProfileForm({ ...profileForm, is_public: e.target.checked })
              }
            />
            Make my profile public
          </label>
          <p
            style={{
              margin: "6px 0 0 24px",
              fontSize: "14px",
              fontWeight: "500",
              color: C.muted,
            }}
          >
            Other users can find you and see your community contributions.
          </p>

          {profileForm.is_public && (
            <div
              style={{
                marginTop: "14px",
                marginLeft: "24px",
                paddingLeft: "14px",
                borderLeft: `2px solid ${C.border}`,
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: C.slate,
                  cursor: "pointer",
                  marginBottom: "8px",
                }}
              >
                <input
                  type="checkbox"
                  checked={profileForm.show_location_public}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      show_location_public: e.target.checked,
                    })
                  }
                />
                Show my location publicly
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: C.slate,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={profileForm.show_bio_public}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      show_bio_public: e.target.checked,
                    })
                  }
                />
                Show my bio publicly
              </label>
            </div>
          )}

          {/* Preview link + Copy link — always available, regardless of is_public */}
          <div
            style={{
              margin: "14px 0 0 24px",
              fontSize: "14px",
              fontWeight: 500,
              color: C.muted,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "8px 16px",
            }}
          >
            <Link
              href={savedUsername ? previewHref : "#"}
              style={{
                color: C.terracotta,
                textDecoration: "none",
                fontWeight: 600,
                opacity: savedUsername ? 1 : 0.45,
                pointerEvents: savedUsername ? "auto" : "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Preview as public{" "}
              <ArrowRight
                size={14}
                strokeWidth={2.4}
                style={{ marginLeft: "4px", verticalAlign: "middle" }}
              />
            </Link>
            {onCopyLink && (
              <>
                <span
                  aria-hidden="true"
                  style={{
                    width: "1px",
                    height: "14px",
                    background: C.border,
                    display: "inline-block",
                  }}
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!savedUsername) return;
                    const ok = await onCopyLink();
                    if (ok) {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                  disabled={!savedUsername}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: copied ? C.success : C.terracotta,
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: savedUsername ? "pointer" : "not-allowed",
                    opacity: savedUsername ? 1 : 0.45,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
                    transition: "color 0.18s ease",
                  }}
                >
                  {copied ? (
                    <>
                      <Check size={14} strokeWidth={2.4} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} strokeWidth={2.4} />
                      Copy link
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="pp-section-divider">Banner color</p>
      <p
        style={{
          margin: "-8px 0 16px",
          fontSize: "14px",
          fontWeight: "500",
          color: C.muted,
        }}
      >
        Auto picks your banner color from the pets in your pack, and updates it
        whenever your pack changes. Mixed is what it uses when you have more
        than one kind of animal. Prefer to choose yourself? Pick any color
        below.
      </p>

      <div className="pp-banner-pick-grid">
        <button
          className={`pp-banner-swatch ${profileForm.banner_color === "auto" ? "selected" : ""}`}
          onClick={() =>
            setProfileForm({ ...profileForm, banner_color: "auto" })
          }
        >
          <div
            className="pp-banner-swatch-color"
            style={{ background: pageGradient(autoKey) }}
          >
            <WandSparkles size={20} strokeWidth={1.8} />
          </div>
          <p className="pp-banner-swatch-label">Auto</p>
        </button>
        {Object.entries(BANNER_PALETTE)
          .filter(([_, v]) => v.group === "species")
          .map(([key, val]) => {
            const SpeciesIcon = BANNER_LUCIDE[key];
            return (
              <button
                key={key}
                className={`pp-banner-swatch ${profileForm.banner_color === key ? "selected" : ""}`}
                onClick={() =>
                  setProfileForm({ ...profileForm, banner_color: key })
                }
              >
                <div
                  className="pp-banner-swatch-color"
                  style={{ background: pageGradient(key) }}
                >
                  {SpeciesIcon && <SpeciesIcon size={20} strokeWidth={1.8} />}
                </div>
                <p className="pp-banner-swatch-label">{val.title}</p>
              </button>
            );
          })}
      </div>

      <p
        style={{
          margin: "20px 0 8px",
          fontSize: "12px",
          fontWeight: 800,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: "0.10em",
        }}
      >
        Custom
      </p>
      <div className="pp-banner-pick-grid">
        {Object.entries(BANNER_PALETTE)
          .filter(([_, v]) => v.group === "extra")
          .map(([key, val]) => (
            <button
              key={key}
              className={`pp-banner-swatch ${profileForm.banner_color === key ? "selected" : ""}`}
              onClick={() =>
                setProfileForm({ ...profileForm, banner_color: key })
              }
            >
              <div
                className="pp-banner-swatch-color"
                style={{ background: pageGradient(key) }}
              >
                {(() => {
                  const CustomIcon = CUSTOM_LUCIDE[key];
                  return CustomIcon ? (
                    <CustomIcon size={20} strokeWidth={1.8} />
                  ) : null;
                })()}
              </div>
              <p className="pp-banner-swatch-label">{val.label}</p>
            </button>
          ))}
      </div>

      <div
        className="btn-row"
        style={{
          marginTop: "24px",
          paddingTop: "20px",
          borderTop: `1px solid ${C.border}`,
          justifyContent: "flex-end",
        }}
      >
        <button onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button onClick={onSave} className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
// ════════════════════════════════════════════════════════════════════════
// PetFormCard
// ════════════════════════════════════════════════════════════════════════
