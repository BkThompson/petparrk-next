"use client";

// ============================================================================
// SHARE & PRIVACY PAGE  —  /pet-card/[slug]/share
// ============================================================================
// Central place where the owner manages public sharing for BOTH of this pet's
// cards (Care Card + Hero Card). One master "Allow sharing" kill switch, plus a
// per-card share link with generate / copy / regenerate / stop-sharing / view
// stats / QR. Each editor (Care, Hero) links here rather than embedding its own
// share UI, so there is a single source of truth for sharing + privacy.
//
// Components (ShareSection, ShareLinkCard, ShareQRBlock, ShareActivityLog) are
// lifted verbatim from the Care editor so behavior is identical to what shipped
// there — this page is their new, dedicated home.
// ============================================================================

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Printer,
  QrCode,
  RefreshCw,
  Share2,
  Loader2,
  ClipboardList,
  Award,
  ChevronDown,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../../../lib/supabase";
import PageLoader from "../../../../components/PageLoader";
import Breadcrumb from "../../../../components/Breadcrumb";
import {
  getOwnerPetBySlug,
  getActiveShareToken,
  createShareToken,
  revokeShareTokens,
  setShareEnabled,
  setShowOnProfile,
  getCardViewStats,
  getShareTokenEvents,
  buildShareUrl,
} from "../../../../lib/petCardApi";

export default function SharePrivacyPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug;

  const [session, setSession] = useState(undefined);
  const [pet, setPet] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");

  // Auth gate — same pattern as the Care/Hero editors.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (active) setSession(s ?? null);
    });
    return () => {
      active = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) {
      router.replace(`/auth?redirect=/pet-card/${slug}/share`);
      return;
    }
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await getOwnerPetBySlug(slug);
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        return;
      }
      setPet(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [session, slug, router]);

  // Local field updater — the share components only touch share_enabled, which
  // they also persist server-side themselves; this keeps the UI in sync.
  function updateField(keyOrObj, value) {
    const updates =
      typeof keyOrObj === "object" ? keyOrObj : { [keyOrObj]: value };
    setPet((prev) => ({ ...prev, ...updates }));
  }

  if (notFound) {
    return (
      <div className="spp-body">
        <div className="spp-container">
          <div className="spp-notfound">
            <h1>Pet not found</h1>
            <p>
              We couldn&apos;t find that pet, or you don&apos;t have access.
            </p>
            <Link
              href="/pet-card"
              className="pce-share-btn pce-share-btn--primary"
            >
              Back to my pets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (session === undefined || !pet) {
    return <PageLoader for="shareSettings" />;
  }

  return (
    <div className="spp-body">
      <div className="spp-container">
        <div className="spp-topbar">
          <Breadcrumb
            items={[
              { label: "Pet Cards", href: "/pet-card" },
              { label: pet.name || "Pet" },
              { label: "Share & Privacy" },
            ]}
          />
        </div>

        <div className="spp-head">
          <p className="spp-eyebrow">Share &amp; Privacy</p>
          <h1 className="spp-title">
            Share {pet.name || "your pet"}&apos;s cards
          </h1>
          <p className="spp-sub">
            Generate secret links for each card. Anyone with a link can view —
            turn sharing off or rotate a link any time.
          </p>
        </div>

        <ShareSection
          pet={pet}
          onUpdate={updateField}
          setSaveStatus={setSaveStatus}
        />
      </div>
      <SaveIndicator status={saveStatus} />
      <style>{`
        /* ===== Page shell (spp- prefix, unique to this page) ===== */
        .spp-body { min-height:100vh; background:var(--color-cream,#FBF8F4); padding:0 0 80px; font-family:var(--font-urbanist),'Urbanist',-apple-system,BlinkMacSystemFont,sans-serif; }
        .spp-container { max-width:900px; margin:0 auto; padding:0 24px; }
        .spp-topbar { padding:32px 0 28px; }
        .spp-topbar .bc-nav { margin-bottom:0; }
        .spp-back { display:inline-flex; align-items:center; gap:7px; color:var(--color-terracotta,#CF5C36); text-decoration:none; font-weight:600; font-size:13px; }
        .spp-back:hover { color:var(--color-navy-dark,#172531); }
        .spp-head { padding:0px 0 0px; margin-bottom: 22px; }
        .spp-eyebrow { font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:var(--color-terracotta,#CF5C36); margin:0 0 8px; }
        .spp-title { font-size:28px; font-weight:800; color:var(--color-navy-dark,#172531); margin:0 0 8px; line-height:1.2; }
        .spp-sub { font-size:15px; font-weight: 500; color:var(--color-slate); margin:0; line-height:1.5; max-width:68ch; }
        .spp-notfound { text-align:center; padding:80px 0; }
        .spp-notfound h1 { font-size:24px; font-weight:800; color:var(--color-navy-dark,#172531); }
        .spp-notfound p { color:var(--color-muted,#717A86); margin:8px 0 20px; }
        @media (max-width:640px){ .spp-container{ padding:0 16px; } .spp-title{ font-size:24px; } }

        /* ===== Full Care-editor CSS — included verbatim so the share cards render
           1:1 identical to how they look in the Care editor. ===== */


        .ucm-backdrop {
          position: fixed; inset: 0;
          background: rgba(23,37,49,0.55);
          -webkit-backdrop-filter: blur(4px);
          backdrop-filter: blur(4px);
          z-index: 4000;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: ucm-fade 0.18s ease-out;
        }
        @keyframes ucm-fade { from { opacity: 0; } to { opacity: 1; } }
        .ucm-card {
          background: #fff;
          border-radius: 18px;
          max-width: 440px; width: 100%;
          box-shadow: 0 30px 60px rgba(0,0,0,0.40);
          font-family: var(--font-urbanist,'Urbanist',system-ui,sans-serif);
          overflow: hidden;
          animation: ucm-pop 0.2s cubic-bezier(0.33,1,0.68,1);
        }
        @keyframes ucm-pop {
          from { opacity:0; transform: translateY(8px) scale(0.98); }
          to { opacity:1; transform:none; }
        }
        .ucm-head {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 22px 24px 0;
        }
        .ucm-title {
          margin: 0; font-size: 19px; font-weight: 800; color: #172531;
          letter-spacing: -0.01em;
        }
        .ucm-close {
          width: 32px; height: 32px; flex-shrink: 0;
          border: none; background: transparent; color: #717A86;
          cursor: pointer; border-radius: 8px; font-size: 22px; line-height: 1;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, color 0.15s;
          margin: -4px -6px 0 8px;
        }
        .ucm-close:hover { background: #F5F0E8; color: #172531; }
        .ucm-body {
          padding: 10px 24px 0;
          color: #4a5560; font-size: 15px; line-height: 1.5;
        }
        .ucm-actions {
          display: flex; gap: 10px; justify-content: flex-end;
          padding: 22px 24px 22px;
          flex-wrap: wrap;
        }
        .ucm-btn {
          font-family: inherit; font-size: 14.5px; font-weight: 700;
          padding: 11px 18px; border-radius: 10px; cursor: pointer;
          border: 1.5px solid transparent; transition: all 0.15s;
          line-height: 1;
        }
        .ucm-btn-primary { background: #CF5C36; color: #fff; border-color: #CF5C36; }
        .ucm-btn-primary:hover { background: #A8471D; border-color: #A8471D; }
        .ucm-btn-secondary { background: #fff; color: #172531; border-color: #EDE8E0; }
        .ucm-btn-secondary:hover { background: #F5F0E8; border-color: #d9d2c6; }
        @media (max-width: 480px) {
          .ucm-actions { flex-direction: column-reverse; }
          .ucm-btn { width: 100%; }
        }
      


        .pc-nf { background: var(--color-cream, #F5F0E8); min-height: calc(100vh - 64px); display: flex; align-items: center; justify-content: center; padding: 48px 24px; }
        .pc-nf-card {
          background: #fff;
          border-radius: 20px;
          padding: 48px 36px;
          max-width: 460px;
          width: 100%;
          text-align: center;
          border: 1px solid rgba(23,37,49,0.06);
        }
        .pc-nf-card h2 {
          font-size: 22px;
          font-weight: 800;
          color: var(--color-navy-dark, #172531);
          margin: 0 0 10px;
          letter-spacing: -0.01em;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pc-nf-card p {
          font-size: 15px;
          color: var(--color-slate, #4B5563);
          line-height: 1.7;
          margin: 0 0 24px;
        }
        .pc-nf-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 42px;
          padding: 0 28px;
          line-height: 1;
          background: var(--color-terracotta, #CF5C36);
          color: #fff;
          border: 2px solid var(--color-terracotta, #CF5C36);
          border-radius: 9999px;
          text-decoration: none;
          font-weight: 700;
          font-size: 15px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: background 0.2s, color 0.2s;
        }
        .pc-nf-btn:hover { background: #fff; color: var(--color-terracotta, #CF5C36); }
      


        /* Reserve the scrollbar's space permanently so opening a modal (which
           locks body scroll) doesn't change the content width and shift the
           page left/right. */
        html { scrollbar-gutter: stable; }
        .pce-body { background: var(--color-cream, #F5F0E8); min-height: calc(100vh - 64px); padding: 32px 0 96px; }

        /* Top compact header row (back link + save indicator) */
        .pce-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          min-height: 36px;
        }
        .pce-back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--color-terracotta, #CF5C36);
          text-decoration: none;
          font-size: 15px;
          font-weight: 700;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: color 0.15s;
        }
        .pce-back-link:hover { 
          color: var(--color-navy-dark, #172531);
          opacity: 1;
          
          }

        /* Persistent save status in top bar */
        .pce-save-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          font-weight: 600;
          color: var(--color-muted, #717A86);
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-save-status.saved { color: #1A6641; }
        .pce-save-status.error { color: #C94040; }

        /* Save indicator — bottom-right floating toast */
        .pce-save-toast {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 50;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: #fff;
          border-radius: 9999px;
          box-shadow: 0 8px 24px rgba(23,37,49,0.18), 0 0 0 1px rgba(23,37,49,0.06);
          font-size: 14px;
          font-weight: 600;
          color: var(--color-muted, #717A86);
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          animation: pce-toast-in 0.18s ease-out;
        }
        .pce-save-toast.saved { color: #1A6641; }
        .pce-save-toast.error { color: #C94040; }
        @keyframes pce-toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 640px) {
          .pce-save-toast { right: 16px; bottom: 16px; }
        }
        .pce-spin { animation: pce-spin 0.9s linear infinite; }
        @keyframes pce-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* Pet header — compact identity strip at top */
        .pce-pet-header {
          display: flex;
          gap: 20px;
          align-items: center;
          padding: 20px;
          background: #fff;
          border-radius: 16px;
          border: 1px solid rgba(23,37,49,0.06);
          margin-bottom: 28px;
        }
        .pce-pet-photo-wrap {
          position: relative;
          width: 88px;
          height: 88px;
          border-radius: 14px;
          overflow: hidden;
          flex-shrink: 0;
        }
        .pce-pet-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .pce-pet-photo-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pce-photo-change-btn {
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 32px;
          height: 32px;
          border-radius: 9999px;
          background: var(--color-terracotta, #CF5C36);
          color: #fff;
          border: 2px solid #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s;
        }
        .pce-photo-change-btn:hover { transform: scale(1.05); }
        .pce-photo-change-btn:disabled { opacity: 0.5; cursor: wait; }
        .pce-photo-input { display: none; }
        .pce-pet-header-info { flex: 1; min-width: 0; }
        .pce-pet-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-terracotta, #CF5C36);
          margin: 0 0 4px;
        }
        .pce-pet-name {
          font-size: clamp(19px, 2.6vw, 22px);
          font-weight: 800;
          color: var(--color-navy-dark, #172531);
          margin: 0 0 4px;
          letter-spacing: -0.01em;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          line-height: 1.2;
          word-break: break-word;
        }
        .pce-pet-quick-meta {
          font-size: 15px;
          font-weight: 500;
          color: #717A86;
          margin: 0;
          line-height: 1.4;
        }
        .pce-photo-error {
          font-size: 14px;
          color: #C94040;
          margin-top: 8px;
          line-height: 1.5;
        }

        /* Sections */
        .pce-section {
          background: #fff;
          border-radius: 16px;
          padding: 28px 24px;
          margin-bottom: 20px;
          border: 1px solid rgba(23,37,49,0.06);
        }
        .pce-section-header { margin-bottom: 20px; }
        .pce-section-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-terracotta, #CF5C36);
          margin: 0 0 6px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-section-title {
          font-size: clamp(19px, 2.6vw, 22px);
          font-weight: 800;
          color: var(--color-navy-dark, #172531);
          margin: 0 0 4px;
          letter-spacing: -0.01em;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          line-height: 1.2;
        }
        .pce-section-sub {
          font-size: 16px;
          font-weight: 500;
          color: var(--color-slate, #4B5563);
          margin: 0;
          line-height: 1.55;
        }

        /* Section coming-soon placeholder */
        .pce-coming-soon {
          padding: 18px 20px;
          background: var(--color-cream, #F5F0E8);
          border-radius: 12px;
          color: var(--color-muted, #717A86);
          font-size: 16px;
          line-height: 1.55;
        }

        /* Form fields */
        .pce-field-grid {
          display: grid;
          grid-template-columns: 1fr;
          /* Match the 14px adjacency gap used elsewhere in forms for visual
             consistency — without this, fields inside grids felt slightly more
             spaced out than the rest of the modal. */
          gap: 14px;
        }
        /* FrequencyField wrapper — when it contains multiple sub-blocks
           (Frequency dropdown + days picker + Repeats), they stack with the
           standard 14px gap. The days picker gets a slightly tighter gap above
           it (-6px adjustment = effective 8px gap) as a visual cue that the
           picker is tied to the Frequency dropdown directly above it. */
        .pce-frequency-block {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .pce-frequency-block > .pce-field + .pce-days-picker {
          margin-top: -6px;
        }
        @media (min-width: 640px) {
          .pce-field-grid.two-col { grid-template-columns: 1fr 1fr; }
        }
        .pce-field {
          display: flex;
          flex-direction: column;
        }
        /* Form-block spacing is now handled by parent container gap rules
           on .pce-modal-body and .pce-entry-card (see above). Adjacency
           selectors are not needed — every direct child of those flex columns
           inherits the 14px gap automatically. If a form is rendered outside
           those containers, the parent should also use display:flex;
           flex-direction:column; gap:14px for consistent spacing. */
        .pce-label {
          font-size: 14px;
          font-weight: 700;
          color: var(--color-navy-dark, #172531);
          margin-bottom: 6px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-input,
        .pce-select {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          font-size: 15px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          color: var(--color-navy-dark, #172531);
          background: #fff;
          border: 1px solid rgba(23,37,49,0.10);
          border-radius: 12px;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
          -webkit-appearance: none;
          appearance: none;
        }
        textarea.pce-input { height: auto; padding: 12px 14px; min-height: 80px; }
        .pce-select {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          padding-right: 40px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23717A86' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          background-size: 12px 8px;
        }
        .pce-input:focus,
        .pce-select:focus {
          outline: none;
          border-color: var(--color-terracotta, #CF5C36);
          box-shadow: 0 0 0 3px rgba(207,92,54,0.12);
        }
        /* Pet card URL field — slug input + dedicated Update button.
           Update is intentional (not autosave) because changing URL breaks shared links. */
        .pce-slug-row {
          display: flex;
          gap: 8px;
          align-items: stretch;
        }
        .pce-slug-row .pce-input { flex: 1 1 auto; min-width: 0; }
        .pce-slug-save-btn {
          flex-shrink: 0;
          height: 46px;
          padding: 0 18px;
          font-size: 14px;
          font-weight: 700;
          color: var(--color-navy-dark, #172531);
          background: #fff;
          border: 1.5px solid rgba(23,37,49,0.16);
          border-radius: 10px;
          cursor: pointer;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: background 0.15s, border-color 0.15s, color 0.15s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          white-space: nowrap;
        }
        .pce-slug-save-btn:hover:not(:disabled) {
          background: var(--color-navy-dark, #172531);
          color: #fff;
          border-color: var(--color-navy-dark, #172531);
        }
        .pce-slug-save-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .pce-field-saved {
          color: #1A6641;
          font-weight: 600;
        }
        .pce-field-warn-soft {
          color: #8C6A11;
          font-weight: 500;
        }
        @media (max-width: 640px) {
          .pce-slug-row {
            flex-direction: column;
          }
          .pce-slug-save-btn { width: 100%; }
        }

        .pce-field-hint {
          font-size: 14px;
          font-weight: 500;
          color: #717A86;
          margin: 6px 0 0;
          line-height: 1.4;
        }
        .pce-field-hint.pce-field-warn {
          color: #C94040;
          font-weight: 600;
        }
        .pce-field-hint--with-count {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
        }
        .pce-char-count {
          flex-shrink: 0;
          font-size: 14px;
          font-weight: 500;
          color: #717A86;
        }
        .pce-char-count.is-max {
          color: var(--color-terracotta, #CF5C36);
          font-weight: 600;
        }
        .pce-req-mark {
          color: #C94040;
          font-weight: 700;
          margin-left: 2px;
        }

        /* Textarea - used for allergies, conditions free-text */
        .pce-textarea {
          width: 100%;
          min-height: 80px;
          padding: 12px 14px;
          font-size: 15px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          color: var(--color-navy-dark, #172531);
          background: #fff;
          border: 1.5px solid rgba(23,37,49,0.10);
          border-radius: 10px;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
          resize: vertical;
          line-height: 1.5;
        }
        .pce-textarea:focus {
          outline: none;
          border-color: var(--color-terracotta, #CF5C36);
          box-shadow: 0 0 0 3px rgba(207,92,54,0.12);
        }

        /* List of structured items (vaccinations, medications) */
        .pce-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }
        /* List item: white card with warm border + soft shadow.
           Matches Profile pet card styling (.pp-pet-card).
           Hover adds amber-cream ring + deepened shadow for prominent feedback. */
        .pce-list-item {
          display: flex;
          align-items: flex-start;
          // gap: 4px;
          padding: 20px;
          background: #fff;
          border: 1px solid #EDE8E0;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(23,37,49,0.07);
          transition: box-shadow 0.25s, border-color 0.25s;
        }
        .pce-list-item:hover {
          border-color: rgba(239,200,139,0.9);
          box-shadow: 0 0 0 1.5px rgba(239,200,139,0.9),
                      0 16px 48px rgba(23,37,49,0.13);
        }
        /* Inline icon — sits next to title text inside the title row. */
        .pce-list-item-icon-inline {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--color-terracotta, #CF5C36);
          flex-shrink: 0;
          line-height: 0;
        }
        .pce-list-item-body { flex: 1; min-width: 0; }
        /* Title row: title + status pill side by side, vertically centered. */
        .pce-list-item-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          /* flex-wrap: wrap; */
          margin-bottom: 0;
        }
        /* Variant for TextareaCard (Allergies/Medical conditions/Quirks): the
           "title" is actually multi-line prose that may wrap to many lines.
           Anchor the icon to the TOP-LEFT so it stays adjacent to the first
           line of text regardless of how much the text wraps. */
        .pce-list-item-title-row--prose {
          align-items: flex-start;
          flex-wrap: nowrap;
        }
        /* Nudge the icon down slightly so it visually aligns with the first
           line of prose text (icon box top vs. text baseline) */
        .pce-list-item-title-row--prose .pce-list-item-icon-inline {
          margin-top: 2px;
        }
        .pce-list-item-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--color-navy-dark, #172531);
          margin: 0;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          line-height: 1.3;
          word-break: break-word;
        }
        /* Used by TextareaCard view-mode (Allergies, Medical conditions, Quirks)
           — renders the multi-line text content like body prose, not bold title. */
        .pce-list-item-prose {
          font-size: 16px;
          font-weight: 500;
          color: var(--color-navy-dark, #172531);
          margin: 0;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          /* line-height: 1.5; */
          white-space: pre-wrap;
          word-break: break-word;
        }
        /* Status pill — sits inline with title for immediate awareness. */
        .pce-list-item-status {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          white-space: nowrap;
          flex-shrink: 0;
        }
        /* Separator: subtle horizontal line splitting status from meta details. */
        .pce-list-item-sep {
          height: 1px;
          background: rgba(23,37,49,0.08);
          margin: 12px 0;
        }
        /* Meta section — label:value rows.
           MOBILE (default, <720px): stacked rows, "Label: Value" inline.
           DESKTOP (>=720px): grid layout with equal-width columns,
           label on top + value below per column (uses --col-count from JSX). */
        .pce-list-item-meta {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .pce-list-item-meta-row {
          display: flex;
          gap: 8px;
          align-items: baseline;
          font-size: 16px;
          line-height: 1.4;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        /* Slug display in Identity view-mode card — shows the public URL path. */
        .pce-identity-slug {
          margin: 4px 0 0;
          padding-left: 28px;
          font-size: 16px;
          font-weight: 500;
          color: #717A86;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          word-break: break-all;
        }

        /* Per-section modifier classes for .pce-list-item-meta. Each section
           has its own min-width tuned to its longest label so labels and values
           sit on the same line without wrapping into adjacent columns.
           Mobile (<=375px) still uses the base stacked layout (label above value),
           so these modifiers only kick in above 375px where the grid is active.
           To tweak any section's label width, edit the px value in its block. */
        @media (min-width: 376px) {
          /* Identity (view-mode card): Species, Breed, Sex, Spay / Neuter, etc. */
          .pce-list-item-meta--identity .pce-list-item-meta-label {
            min-width: 72px;
          }

          /* Emergency contacts: Relationship, Phone, Alt phone, Email */
          .pce-list-item-meta--emergency .pce-list-item-meta-label {
            min-width: 88px;
          }

          /* Vet visit history: Date, Clinic, Reason */
          .pce-list-item-meta--vet-history .pce-list-item-meta-label {
            min-width: 54px;
          }

          /* Primary vet card: Phone, Address */
          .pce-list-item-meta--primary-vet .pce-list-item-meta-label {
            min-width: 61px;
          }

          /* Emergency vet card: Phone, Address */
          .pce-list-item-meta--emergency-vet .pce-list-item-meta-label {
            min-width: 61px;
          }

          /* Specialists: Specialty, Phone, Address */
          .pce-list-item-meta--specialists .pce-list-item-meta-label {
            min-width: 69px;
          }

          /* Insurance card: Policy #, Phone, CareCredit, CareCredit # */
          .pce-list-item-meta--insurance .pce-list-item-meta-label {
            min-width: 97px;
          }

          /* Feeding cards: Time, Amount, Days */
          .pce-list-item-meta--feedings .pce-list-item-meta-label {
            min-width: 76px;
          }

          /* Walk cards: Time, Duration, Days */
          .pce-list-item-meta--walks .pce-list-item-meta-label {
            min-width: 76px;
          }

          /* Vaccination cards: Given, Given by, Next due */
          .pce-list-item-meta--vaccinations .pce-list-item-meta-label {
            min-width: 67px;
          }

          /* Medication cards: Dose, Given, Given by, Frequency */
          .pce-list-item-meta--medications .pce-list-item-meta-label {
            min-width: 76px;
          }
        }

        /* Identity birthday: date + (X years old) on two lines within the
           value column. Used by .pce-identity-value-stack inside a meta-row. */
        .pce-identity-value-stack {
          display: inline-flex;
          flex-direction: column;
          gap: 2px;
        }
        .pce-identity-sub-line {
          font-size: 14px;
          font-weight: 500;
          color: #717A86;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }

        .pce-list-item-meta-label {
          font-weight: 500;
          color: #717A86;
          flex-shrink: 0;
          min-width: 70px;
        }
        /* Weight entry cards: align both labels ("Weight:" and "Change:")
           by giving the label column enough width to fit the longest one. */
        .pce-list-item-meta--weight .pce-list-item-meta-label {
          min-width: 59px;
        }
        /* Weight cards used to override align-items to center for the arrow icon
           in "Weight change" but that broke the layout in other contexts. Removed —
           default baseline alignment works correctly. */
        /* If a Weight entry has only one row (no previous to compare), use the
           tighter 40px label so it doesn't look airy with a 145px label and short value. */
        .pce-list-item-meta--weight[style*="--col-count: 1"] .pce-list-item-meta-label {
          min-width: 40px;
        }

        /* Inline arrow icon + text within the weight change value cell.
           Renders as a plain inline span (NOT inline-flex), so when the parent
           row uses align-items: baseline, the text inside this value sits on
           the baseline naturally — same as any other text value.
           The SVG icon is vertical-aligned to text-bottom so it sits on the
           same baseline as the text, rather than peeking above it. */
        .pce-weight-change {
          white-space: nowrap;
        }
        .pce-weight-change svg {
          vertical-align: text-bottom;
          margin-right: 2px;
        }
        /* Direction colors for the weight change indicator. We don't use
           red/green because for pets, gain/loss isn't inherently good or
           bad (depends on age, recovery, etc.). Instead: terracotta when
           there's any change (matches the chart line + tooltip value),
           muted gray when stable. Same logic as the chart's tooltip: the
           active data gets the accent color. */
        .pce-weight-change.up,
        .pce-weight-change.down {
          color: var(--color-terracotta, #CF5C36);
        }
        .pce-weight-change.up svg,
        .pce-weight-change.down svg {
          color: var(--color-terracotta, #CF5C36);
        }
        .pce-weight-change.stable {
          color: var(--color-muted, #717A86);
        }

        /* Weight change uses neutral dark navy (same as other meta values).
           No semantic coloring — pet weight goals vary (some pets need to gain,
           some need to lose, some maintain). The words "Gained" / "Lost" convey
           direction; color would imply a judgment that may not match the user's goal. */
        /* Default meta-value — renders inline beside the label. Multi-line
           values (e.g. 2-line addresses) use <br/> for line breaks rather than
           CSS flex tricks, which avoids browser quirks with inline-flex/block
           combinations and works reliably across all viewports and browsers. */
        .pce-list-item-meta-value {
          font-weight: 600;
          color: var(--color-navy-dark, #172531);
          word-break: break-word;
          min-width: 0;
        }
        /* Notes section — appears below meta when item has notes.
           Label on top + content below (matches label-above-value pattern).
           Long notes truncate at preview, expand with smooth transition. */
        .pce-notes {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(23,37,49,0.08);
        }
        .pce-notes-label {
          font-size: 16px;
          font-weight: 500;
          color: #717A86;
          margin: 0 0 4px;
          line-height: 1.4;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-notes-content {
          overflow: hidden;
          transition: max-height 0.3s ease;
          /* max-height set via inline style — uses measured content heights */
        }

        .pce-notes-text {
          font-size: 16px;
          font-weight: 500;
          color: var(--color-navy-dark, #172531);
          margin: 0;
          line-height: 1.5;
          word-break: break-word;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        /* CSS line-clamp: native 3-line truncation with browser-rendered
           ellipsis. Applied to text in collapsed state. No JS text swap needed —
           the ellipsis appears instantly when the class is toggled. */
        .pce-notes-clamped {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .pce-notes-toggle {
          background: none;
          border: none;
          padding: 6px 0 0;
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          color: var(--color-terracotta, #CF5C36);
          cursor: pointer;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: color 0.15s;
        }
        .pce-notes-toggle:hover {
          color: var(--color-navy-dark, #172531);
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        /* Smallest phones (≤375px): stack label above value so values get full width.
           Larger phones use the inline label+value pattern (still readable). */
        @media (max-width: 375px) {
          .pce-list-item-meta-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
          }

          .pce-list-item-meta-label {
            min-width: 40px;
            font-size: 16px;
            /* letter-spacing: 0.04em; */
            line-height: 1.3;
          }
        }
        /* Special-case: Identity stacks on mobile (376-767px) because its values
           (breed, color, microchip) are the longest and wrap badly inline. Other
           sections stay inline in this range. Below 376px everything stacks. */
        @media (min-width: 600px) {
          /* Desktop: CSS Grid with natural-content columns. Each pair takes its own
             natural width (max-content) but gets at least 160px to avoid cramping.
             auto-fit fills the row with as many columns as fit, then wraps. */
          .pce-list-item-meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, max-content));
            gap: 14px 32px;
            align-items: flex-start;
          }
          /* Identity card: force a clean 2-column grid on desktop. Each row uses
             the inline label:value pattern (label left, value right) instead of the
             default column-stacked grid, so the 90px label min-width lines up. */
          .pce-list-item-meta--identity,
          .pce-list-item-meta--insurance {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .pce-list-item-meta--identity .pce-list-item-meta-row,
          .pce-list-item-meta--insurance .pce-list-item-meta-row {
            flex-direction: row;
            align-items: baseline;
            gap: 8px;
          }
          .pce-list-item-meta--identity .pce-list-item-meta-label,
          .pce-list-item-meta--insurance .pce-list-item-meta-label {
            font-size: 16px;
            letter-spacing: 0;
            line-height: 1.4;
          }
          .pce-list-item-meta--identity .pce-list-item-meta-label {
            min-width: 72px;
          }
          .pce-list-item-meta--insurance .pce-list-item-meta-label {
            /* min-width: 87px; */
            min-width: 40px;
          }
          .pce-list-item-meta-row {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
            min-width: 0;
          }
          .pce-list-item-meta-label {
            font-size: 16px;
            /* letter-spacing: 0.04em; */
            line-height: 1.3;
            min-width: 0;
          }
          .pce-list-item-meta-value {
            font-size: 16px;
            line-height: 1.4;
            word-break: break-word;
          }
        }
        .pce-list-item-status.overdue { background: rgba(201,64,64,0.12); color: #C94040; }
        .pce-list-item-status.soon    { background: rgba(217,162,27,0.14); color: #8C6A11; }
        .pce-list-item-status.ok      { background: rgba(26,102,65,0.12); color: #1A6641; }
        .pce-list-item-status.active  { background: rgba(26,102,65,0.12); color: #1A6641; }
        .pce-list-item-status.ended   { background: rgba(113,122,134,0.14); color: #4B5563; }
        .pce-list-item-actions {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }
        .pce-icon-btn {
          width: 15px;
          height: 27px;
          border-radius: 8px;
          background: transparent;
          color: var(--color-muted, #717A86);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          transition: background 0.15s, color 0.15s;
        }
        .pce-icon-btn:hover { background: rgba(23,37,49,0.06); color: var(--color-navy-dark, #172531); }
        .pce-icon-btn.danger:hover { background: rgba(201,64,64,0.10); color: #C94040; }

        /* Empty state inside a list section. The 20px margin-bottom matches
           .pce-list's margin-bottom so the gap between the content area and
           whatever follows (typically a "+ Add" button or the next subsection)
           is identical whether the section is empty or has items. */
        .pce-list-empty {
          padding: 18px 20px;
          background: var(--color-cream, #F5F0E8);
          border-radius: 12px;
          color: var(--color-muted, #717A86);
          font-size: 16px;
          line-height: 1.55;
          margin-bottom: 20px;
        }

        /* =============================================================
           TAG INPUT (chip-style array editor) — used by Personality fields
           (traits, loves, dislikes) and Identity tags. Visually mimics a
           text input with chips rendered inline before the text caret.
           ============================================================= */
        .pce-tag-input {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 8px 10px;
          min-height: 44px;
          background: #fff;
          border: 1px solid rgba(23,37,49,0.16);
          border-radius: 12px;
          cursor: text;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          align-items: center;
        }
        .pce-tag-input:focus-within {
          border-color: var(--color-navy-dark, #172531);
          box-shadow: 0 0 0 3px rgba(23,37,49,0.08);
        }
        /* Error state: shown briefly when user attempts an invalid action
           (duplicate tag, max tags reached). Tint the border red for stronger
           visual feedback than just the message below. */
        .pce-tag-input--error {
          border-color: #C94040;
        }
        .pce-tag-input--error:focus-within {
          border-color: #C94040;
          box-shadow: 0 0 0 3px rgba(201,64,64,0.10);
        }
        /* At-limit notice: shown inside the chip box when the user has hit
           maxTags, in place of the input field. Italicized + muted so it
           reads as informational (not as another chip). */
        .pce-tag-input-limit-notice {
          font-size: 14px;
          font-style: italic;
          color: var(--color-muted, #717A86);
          padding: 4px 0;
          flex: 1 1 100%;
          width: 100%;
          min-width: 0;
        }
        .pce-tag-input-field {
          flex: 1;
          min-width: 80px;
          border: none;
          outline: none;
          background: transparent;
          font-size: 15px;
          font-family: inherit;
          color: var(--color-navy-dark, #172531);
          padding: 4px 0;
        }
        .pce-tag-input-field::placeholder {
          color: var(--color-muted, #717A86);
        }

        /* =============================================================
           SHARE SECTION — master toggle + per-card share URL controls
           ============================================================= */

        /* Master toggle row at the top of the Share section.
           Contains the description and the actual toggle switch. */
       .pce-share-master {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 20px;
          // background: var(--color-cream, #EDE8E0);
          border: 1px solid #EDE8E0;
          border-radius: 12px;
          margin-bottom: 20px;
          box-shadow: 0 2px 12px rgba(23,37,49,0.07)
        }
        /* Show-on-profile toggle sits below the share cards; a bit more top
           space separates it from the card grid. Disabled (dimmed) until the
           Hero Card is published. */
        .pce-profile-toggle { margin-top: 14px; }
        .pce-profile-toggle.is-disabled {
          opacity: 0.55;
        }
        .pce-profile-toggle.is-disabled .pce-toggle {
          cursor: not-allowed;
        }
        .pce-share-master-text {
          flex: 1;
          min-width: 0;
        }
        .pce-share-master-title {
          font-size: 18px;
          font-weight: 800;
          color: var(--color-navy-dark, #172531);
          margin: 0 0 2px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-share-master-sub {
          font-size: 15px;
          font-weight: 500;
          color: #717A86;
          line-height: 1.5;
          margin: 0;
        }

        /* iOS-style toggle switch. Solid pill background. When ON, the
           background turns navy dark; the knob slides to the right. */
        .pce-toggle {
          flex-shrink: 0;
          position: relative;
          width: 44px;
          height: 26px;
          border-radius: 999px;
          border: none;
          background: rgba(23,37,49,0.20);
          cursor: pointer;
          padding: 0;
          transition: background 180ms ease;
        }
        .pce-toggle.is-on {
          background: var(--color-navy-dark, #172531);
        }
        .pce-toggle-knob {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 20px;
          height: 20px;
          border-radius: 999px;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.18);
          transition: left 180ms ease;
        }
        .pce-toggle.is-on .pce-toggle-knob {
          left: 21px;
        }

        /* Group of share cards (one per card type). When master is OFF the
           whole group is faded but still readable so the user understands
           what they'd be turning on. */
        .pce-share-cards {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .pce-share-cards.is-disabled {
          opacity: 0.55;
          pointer-events: none;
          /* Allow the "Stop sharing" button to still work even when master
             is off — the user may want to clean up before disabling. But
             practically, master-off is a kill switch so revoking individual
             tokens isn't necessary. Keep it simple: full lockout when off. */
        }

        /* One share card: header + URL row + meta + actions. */
        .pce-share-card {
          background: #fff;
          border: 1px solid #EDE8E0;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 12px rgba(23,37,49,0.07);
        }
        .pce-share-card-header {
          display: flex;
          align-items: flex-start;
          gap: 0;
          margin-bottom: 16px;
        }
        .pce-share-card-icon {
          display: inline-flex;
          align-items: flex-start;
          justify-content: center;
          /* width: 36px; */
          height: 36px;
          color: var(--color-navy-dark, #172531);
          flex-shrink: 0;
          margin-right: 8px;
        }
        .pce-share-card-heading {
          flex: 1;
          min-width: 0;
        }
        .pce-share-card-title {
          font-size: 18px;
          font-weight: 800;
          color: var(--color-navy-dark, #172531);
          margin: 0 0 4px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-share-card-desc {
          font-size: 16px;
          font-weight: 500;
          line-height: 1.5;
          color: #717A86;
          margin: 0;
        }
        .pce-share-card-loading {
          font-size: 14px;
          color: var(--color-muted, #717A86);
          font-style: italic;
          margin: 0;
        }

        /* URL row: read-only input + Copy button, side by side.
           On mobile the input shrinks; the copy button has a fixed min width
           so its label always fits ("Copied" doesn't truncate). */
        /* QR code block — toggled below share URL meta. */
        .pce-share-qr {
          margin-top: 12px;
        }
        .pce-share-qr-toggle {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 0;
          background: transparent;
          border: none;
          font-size: 16px;
          font-weight: 700;
          color: var(--color-terracotta, #CF5C36);
          cursor: pointer;
          font-family: var(--font-urbanist, 'Urbanist', sans-serif);
        }
        .pce-share-qr-toggle:hover {
          color: var(--color-navy-dark, #172531);
        }
        .pce-share-qr-chevron {
          transition: transform 0.2s ease;
        }
        .pce-share-qr-toggle.is-open .pce-share-qr-chevron {
          transform: rotate(180deg);
        }
        .pce-share-qr-anim {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.28s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pce-share-qr-anim.is-open {
          grid-template-rows: 1fr;
        }
        .pce-share-qr-anim-inner {
          overflow: hidden;
          min-height: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .pce-share-qr-anim { transition: none; }
        }
        .pce-share-qr-panel {
          display: flex;
          gap: 20px;
          align-items: center;
          margin-top: 12px;
          padding: 16px;
          background: var(--color-cream, #F5F0E8);
          border: 1px solid #EDE8E0;
          border-radius: 12px;
        }
        .pce-share-qr-svg {
          flex-shrink: 0;
          padding: 10px;
          background: #fff;
          border-radius: 10px;
          border: 1px solid #EDE8E0;
          line-height: 0;
        }
        .pce-share-qr-svg svg {
          display: block;
        }
        /* QR caption — sits next to the QR image, mirrors PCC pattern. */
        .pce-share-qr-caption {
          flex: 1;
          min-width: 0;
        }
        .pce-share-qr-caption-label {
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #717A86;
          margin: 0 0 4px;
        }
        .pce-share-qr-caption-url {
          font-size: 15px;
          font-weight: 500;
          color: var(--color-navy-dark, #172531);
          margin: 0;
          word-break: break-all;
          line-height: 1.4;
          font-variant-numeric: tabular-nums;
        }
        .pce-share-qr-info {
          flex: 1;
          min-width: 0;
        }
        /* ============================================================
           Share section buttons — Option Z styling.
           Share = filled terracotta (primary).
           Both Downloads = identical navy outline (visual peers).
           Local 2px border definition so the buttons are pixel-equal,
           without touching the global .pce-btn-secondary class used
           elsewhere in the editor.
           ============================================================ */
        .pce-share-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 16px;
          margin-top: 20px;
        }
        .pce-share-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 42px;
          min-width: 90px;
          padding: 0 24px;
          line-height: 1;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          font-family: var(--font-urbanist, 'Urbanist', sans-serif);
          white-space: nowrap;
          cursor: pointer;
          border: 2px solid transparent;
          text-decoration: none;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .pce-share-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .pce-share-btn--primary {
          background: var(--color-terracotta, #CF5C36);
          color: #fff;
          border-color: var(--color-terracotta, #CF5C36);
        }
        .pce-share-btn--primary:hover:not(:disabled) {
          background: #fff;
          color: var(--color-terracotta, #CF5C36);
        }
        .pce-share-btn--secondary,
        a.pce-share-btn--secondary,
        a.pce-share-btn--secondary:link,
        a.pce-share-btn--secondary:visited {
          background: #fff;
          color: var(--color-navy-dark, #172531);
          border-color: rgba(23, 37, 49, 0.18);
          font-weight: 600;
        }
        /* :hover scoped to :not(:focus-visible) so hover doesn't stay
           "stuck" after a click leaves the button focused. */
        .pce-share-btn--secondary:hover:not(:disabled):not(:focus-visible),
        a.pce-share-btn--secondary:hover:not(:focus-visible) {
          background: var(--color-navy-dark, #172531);
          color: #fff;
          border-color: var(--color-navy-dark, #172531);
        }

        /* Hints — two paragraphs with breathing room. */
        .pce-share-hints {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 0;
        }
        .pce-share-hint {
          font-size: 14px;
          font-weight: 500;
          color: #717A86;
          margin: 0;
          line-height: 1.55;
        }
        .pce-share-hint strong {
          font-weight: 700;
          color: var(--color-navy-dark, #172531);
        }

        /* B1: Manage-link toggle — destructive actions tucked away. */
        .pce-share-manage {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(23, 37, 49, 0.08);
        }
        .pce-share-manage-toggle {
          /* 19px as a bare text button. */
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          font-size: 16px;
          font-weight: 700;
          color: var(--color-terracotta, #CF5C36);
          cursor: pointer;
          font-family: var(--font-urbanist, 'Urbanist', sans-serif);
          /* Smooth color + width animation so the label swap doesn't
             snap. Width adjusts to fit the (different-length) label,
             but the change animates over 200ms. */
          transition: color 0.15s ease, min-width 0.2s ease;
        }
        /* :hover scoped to :not(:focus-visible) so the color doesn't
           stay navy after a click that left focus on the button. */
        .pce-share-manage-toggle:hover:not(:focus-visible) {
          color: var(--color-navy-dark, #172531);
        }
        /* Chevron rotates 180° when manage panel is open, signaling
           expand/collapse to the user. */
        .pce-share-manage-chevron {
          transition: transform 0.2s ease;
        }
        .pce-share-manage-toggle.is-open .pce-share-manage-chevron {
          transform: rotate(180deg);
        }
        .pce-share-manage-panel {
          margin-top: 12px;
          padding: 18px 20px;
          background: rgba(23, 37, 49, 0.025);
          border: 1px solid rgba(23, 37, 49, 0.06);
          border-radius: 10px;
        }
        /* Smooth open/close: animate grid-template-rows 0fr -> 1fr so the panel
           expands to its natural height without a hardcoded max-height. Matches
           the Read more transition feel. */
        .pce-share-manage-anim {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.28s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pce-share-manage-anim.is-open {
          grid-template-rows: 1fr;
        }
        .pce-share-manage-anim-inner {
          overflow: hidden;
          min-height: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .pce-share-manage-anim { transition: none; }
        }
        /* Two hint paragraphs grouped, each on its own line. */
        .pce-share-manage-hints {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .pce-share-manage-hint {
          font-size: 14px;
          font-weight: 500;
          color: #717A86;
          margin: 0;
          line-height: 1.55;
        }
        .pce-share-manage-hint strong {
          font-weight: 700;
          color: var(--color-navy-dark, #172531);
        }
        /* Divider inside the panel — separates hints from buttons so
           the buttons read as their own distinct action area. */
        .pce-share-manage-divider {
          height: 1px;
          background: rgba(23, 37, 49, 0.10);
          margin: 16px 0;
        }
        .pce-share-manage-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        @media (max-width: 640px) {
          .pce-share-manage-actions {
            flex-direction: column;
            gap: 8px;
          }
          .pce-share-manage-actions > * {
            width: 100%;
          }
        }

        /* Divider between actions and QR-code collapsible. */
        .pce-share-divider {
          height: 1px;
          background: rgba(23, 37, 49, 0.08);
          margin: 20px 0 16px;
        }
        @media (max-width: 640px) {
          .pce-share-qr-toggle {
            /* Left-aligned on mobile to match PCC and the rest of the
               share section content. */
            justify-content: flex-start;
            padding: 6px 0;
          }
          .pce-share-qr-panel {
            flex-direction: column;
            align-items: stretch;
            text-align: center;
          }
          .pce-share-qr-svg {
            align-self: center;
          }
          .pce-share-actions {
            flex-direction: column;
            gap: 10px;
          }
          .pce-share-actions > .pce-share-btn {
            width: 100%;
          }
        }

        .pce-share-url-row {
          display: flex;
          align-items: stretch;
          gap: 8px;
          margin-bottom: 14px;
        }
        .pce-share-url {
          flex: 1;
          min-width: 0;
          height: 44px;
          padding: 0 14px;
          font-size: 15px;
          font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
          color: var(--color-navy-dark, #172531);
          // background: var(--color-cream, #F5F0E8);
          border: 1px solid #EDE8E0;
          border-radius: 12px;
          outline: none;
          box-sizing: border-box;
        }
        .pce-share-url:focus {
          border-color: var(--color-navy-dark, #172531);
          box-shadow: 0 0 0 3px rgba(23,37,49,0.08);
        }
        .pce-share-copy-btn {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 14px;
          height: 42px;
          background: var(--color-navy-dark, #172531);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          cursor: pointer;
          transition: background 120ms ease;
          min-width: 86px;
          justify-content: center;
        }
        .pce-share-copy-btn:hover {
          background: #fff;
          color: var(--color-navy-dark, #172531);
          border: 2px solid rgba(23, 37, 49, 0.18);
        }

        .pce-share-copy-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Meta row below the URL: view count + Preview link. */
        .pce-share-card-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 13px;
          font-weight: 500;
          color: #717A86;
          margin-bottom: 16px;
        }
        .pce-share-card-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .pce-share-card-preview {
          /* 22.1px as a bare text link. */
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--color-navy-dark, #172531);
          font-weight: 600;
          text-decoration: none;
        }
        .pce-share-card-preview:hover {
          text-decoration: underline;
        }

        /* Action buttons row: Regenerate + Stop sharing.
           "New link" is secondary, "Stop sharing" is destructive (text-only,
           red on hover) so it's deliberately less prominent — accidentally
           revoking is a frustrating mistake. */
        .pce-share-card-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        /* Destructive text-only button. Used for "Stop sharing" — visually
           subdued to discourage accidental clicks, but reads clearly as a
           destructive action via the red hover state. */
        .pce-btn-danger-text {
          background: transparent;
          color: var(--color-muted, #717A86);
          border: none;
          font-size: 14px;
          font-weight: 600;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 8px;
          transition: color 120ms ease, background 120ms ease;
        }
        .pce-btn-danger-text:hover:not(:disabled) {
          color: #C94040;
          background: rgba(201,64,64,0.06);
        }
        .pce-btn-danger-text:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Mobile: stack URL row vertically so the input gets full width
           and the copy button drops below it. Stack the master toggle row
           too (text on top, toggle below) since the subtitle is longer than
           a typical toggle row can hold cleanly. Generate/New link/Stop
           sharing buttons become full-width so they're easy to tap. */
        @media (max-width: 640px) {
          .pce-share-url-row {
            flex-direction: column;
          }
          .pce-share-url-row .pce-share-url {
            flex: none;
            width: 100%;
          }
          .pce-share-copy-btn {
            width: 100%;
          }
          .pce-share-master {
            padding: 14px 16px;
          }
          .pce-share-card {
            padding: 16px;
          }
          /* Buttons inside the share card actions row stretch to full width
             on mobile. The flex container wraps so primary + destructive
             stack with proper gap. */
          .pce-share-card-actions {
            flex-direction: column;
            align-items: stretch;
          }
          .pce-share-card-actions .pce-btn-primary,
          .pce-share-card-actions .pce-btn-secondary,
          .pce-share-card-actions .pce-btn-danger-text {
            width: 100%;
            justify-content: center;
          }
        }

        /* Generate row: Expires field (label-above-dropdown) on the left,
           Generate button on the right, both the same height. On desktop
           they sit opposite-aligned with space between. On mobile they
           stack full-width with Expires above Generate. */
        .pce-share-generate-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .pce-share-expire-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .pce-share-expire-label {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          color: #717A86;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        /* Match the Generate button height (48px from .pce-btn-primary, the
           page-wide primary CTA size) so they line up cleanly side-by-side. */
        .pce-share-expire-select {
          height: 44px;
          max-width: 180px;
          padding: 0 32px 0 12px;
          font-size: 15px;
        }

        /* Recent activity (audit log) — collapsible list below the share
           cards. Subtle visual treatment so it doesn't compete with the
           primary share actions above. */
        .pce-share-activity {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #EDE8E0;
        }
        .pce-share-activity-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--color-navy-dark, #172531);
          margin: 0 0 12px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-share-activity-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .pce-share-activity-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 14px;
          color: var(--color-navy-dark, #172531);
          padding: 3px 0;
        }
        .pce-share-activity-action {
          flex: 1;
          min-width: 0;
          font-size: 14px;
          font-weight: 600;
        }
        .pce-share-activity-card {
          color: #717A86;
          font-weight: 500;
        }
        .pce-share-activity-time {
          flex-shrink: 0;
          color: #717A86;
          font-size: 14px;
          font-weight: 500;
        }
        .pce-share-activity-toggle {
          margin-top: 10px;
          background: transparent;
          border: none;
          color: var(--color-terracotta, #CF5C36);
          font-weight: 600;
          font-size: 14px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          cursor: pointer;
          padding: 4px 0;
        }
        .pce-share-activity-toggle.is-open {
          color: var(--color-navy-dark, #172531);
        }
        .pce-share-activity-toggle:hover {
          text-decoration: underline;
        }
        .pce-share-activity-toggle {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .pce-share-activity-chevron {
          transition: transform 0.2s ease;
        }
        .pce-share-activity-toggle.is-open .pce-share-activity-chevron {
          transform: rotate(180deg);
        }
        .pce-share-activity-anim {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.28s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pce-share-activity-anim.is-open {
          grid-template-rows: 1fr;
        }
        .pce-share-activity-anim-inner {
          overflow: hidden;
          min-height: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .pce-share-activity-anim { transition: none; }
        }

        @media (max-width: 640px) {
          /* Mobile: Expires field on top, Generate button below.
             Both full-width and same height for consistent tap targets. */
          .pce-share-generate-row {
            flex-direction: column;
            align-items: stretch;
          }
          .pce-share-expire-field {
            width: 100%;
          }
          .pce-share-expire-select {
            max-width: none;
            width: 100%;
          }
        }

        /* Chip — the rendered tag pill. Two variants:
           - default (inside TagInput): has a remove × button
           - --display (inside view-mode cards): static, no remove button */
        .pce-tag-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 4px 4px 10px;
          background: var(--color-cream, #F5F0E8);
          color: var(--color-navy-dark, #172531);
          font-size: 14px;
          font-weight: 600;
          border-radius: 999px;
          line-height: 1.3;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-tag-chip--display {
          padding: 4px 10px;
        }
        .pce-tag-chip-remove {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border: none;
          background: rgba(23,37,49,0.08);
          color: var(--color-navy-dark, #172531);
          border-radius: 999px;
          cursor: pointer;
          padding: 0;
          transition: background 120ms ease;
        }
        .pce-tag-chip-remove:hover {
          background: rgba(23,37,49,0.16);
        }

        /* Chip display row inside view-mode list-item — flex-wraps so long
           lists wrap to multiple lines instead of overflowing. */
        .pce-tag-chips-display {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          min-width: 0;
        }
        /* For TagArrayCard chip view, center-align the row vertically so the
           pencil icon aligns with the visual center of the chip cluster.
           Multi-row meta sections (vaccinations, weight, etc.) keep the
           default flex-start alignment because their content is taller. */
        .pce-list-item--chips {
          align-items: flex-start;
        }
        /* For cards whose body is logically ONE ROW of content (Nickname,
           Allergies, Medical conditions, Quirks, Fun fact). Target the BODY
           only — let it center its own content vertically inside its height.
           The outer list-item keeps the default flex-start alignment, so the
           pencil icon stays anchored to the top-right corner untouched.
           Multi-row meta cards (vaccinations, vet visits, etc.) don't get
           this modifier — their content stays naturally top-aligned. */
        .pce-list-item--single .pce-list-item-body {
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: 28px;
        }

        /* =============================================================
           IDENTITY TAGS — pill grid + chip display (Hero Card celebration)
           Used by IdentityTagsSection. Tag pills are larger, more visual
           than personality chips because they're the headline identity
           statements (like trading-card badges).
           ============================================================= */
        /* Mobile: 1 column so long labels (Emotional Support, Service /
           Therapy, Forever Loved, Special Needs) never wrap. Each pill gets
           the full row width and the same fixed height.
           Tablet: 2 columns. Desktop: 3 columns. We don't go to 4 columns
           because at narrower desktops long labels would wrap again. */
        .pce-identity-tag-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        @media (min-width: 640px) {
          .pce-identity-tag-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (min-width: 900px) {
          .pce-identity-tag-grid {
            grid-template-columns: 1fr 1fr 1fr;
          }
        }
        /* The pill is structured as a relative container so the (i) info
           button can sit absolutely in the top-right corner. Inner row uses
           flex with center alignment so icon + label stay vertically aligned
           even when label wraps to two lines. Fixed min-height ensures all
           pills have the same height regardless of label length. */
        .pce-identity-tag-pill {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
          padding: 12px 30px 12px 14px;
          background: #fff;
          border: 2px solid #EDE8E0;
          border-radius: 12px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          font-size: 14px;
          font-weight: 600;
          color: var(--color-navy-dark, #172531);
          cursor: pointer;
          transition: background 120ms ease, border-color 120ms ease,
                      transform 120ms ease, box-shadow 120ms ease;
          text-align: left;
          min-height: 64px;
        }
        .pce-identity-tag-pill:hover {
          border-color: rgba(207,92,54,0.40);
          background: rgba(245,240,232,0.50);
        }
        .pce-identity-tag-pill.is-selected {
          background: var(--color-navy-mid, #172531);
          border-color: var(--color-navy-mid, #172531);
          color: #fff;
        }
        .pce-identity-tag-pill.is-selected:hover {
          background: var(--color-navy-mid, #172531);
          border-color: var(--color-navy-mid, #172531);
        }
        /* Subtle press-down on click for tactile feel — matches the "trading
           card / picker game" feel users get from Pokemon-style selection. */
        .pce-identity-tag-pill:active {
          transform: scale(0.97);
        }
        .pce-identity-tag-emoji {
          font-size: 24px;
          line-height: 1;
          flex-shrink: 0;
        }
        .pce-identity-tag-label {
          line-height: 1.25;
          word-break: break-word;
          min-width: 0;
          flex: 1;
        }

        /* Info button in the top-right corner of each pill. Tapping it
           reveals the tag's description in a popover below the pill,
           explaining what the tag means before the user selects it. */
        .pce-identity-tag-info {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 20px;
          height: 20px;
          border-radius: 999px;
          border: none;
          background: rgba(23,37,49,0.10);
          color: var(--color-navy-dark, #172531);
          /* Urbanist (site default), heavy weight for clarity. The "i"
             reads cleanly as "info" at small sizes when bold. */
          font-family: var(--font-urbanist, 'Urbanist', sans-serif);
          font-size: 14px;
          font-weight: 800;
          font-style: normal;
          letter-spacing: 0.02em;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          line-height: 1;
          transition: background 120ms ease;
        }
        /* Mobile-only invisible tap area: expands the (i) hit zone to ~44x44
           without enlarging the visible button. Apple HIG minimum is 44pt.
           The pseudo-element extends outward from the button via negative
           insets, capturing taps in the surrounding empty corner. */
        @media (max-width: 640px) {
          .pce-identity-tag-info::before {
            content: "";
            position: absolute;
            top: -12px;
            right: -12px;
            bottom: -12px;
            left: -12px;
          }
        }
        .pce-identity-tag-info:hover {
          background: rgba(23,37,49,0.18);
        }
        .pce-identity-tag-pill.is-selected .pce-identity-tag-info {
          background: rgba(255,255,255,0.18);
          color: #fff;
        }
        .pce-identity-tag-pill.is-selected .pce-identity-tag-info:hover {
          background: rgba(255,255,255,0.28);
        }

        /* Description popover that appears below a tag pill when its (i)
           button is tapped. Spans the full row width inside the grid via
           grid-column: 1 / -1, so it doesn't squeeze the pills themselves. */
        .pce-identity-tag-info-popover {
          grid-column: 1 / -1;
          padding: 12px 14px;
          background: var(--color-cream, #F5F0E8);
          border: 1px solid #EDE8E0;
          border-radius: 10px;
          font-size: 14px;
          line-height: 1.5;
          color: var(--color-navy-dark, #172531);
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          margin-top: -4px;
        }
        .pce-identity-tag-info-popover-title {
          font-weight: 700;
          margin-bottom: 2px;
        }
        .pce-identity-tag-info-popover-close {
          display: inline-block;
          float: right;
          background: transparent;
          border: none;
          color: var(--color-muted, #717A86);
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          padding: 0;
          margin-left: 8px;
        }

        /* Display-mode chips for selected identity tags (inside view-mode
           list-item card). Smaller than the editor pills but with the same
           emoji + label structure. Cream background for warmth. */
        .pce-identity-tag-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--color-cream, #F5F0E8);
          color: var(--color-navy-dark, #172531);
          font-size: 14px;
          font-weight: 600;
          border-radius: 999px;
          line-height: 1.3;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-identity-tag-chip .pce-identity-tag-emoji {
          font-size: 15px;
        }

        /* List item variant for prose content (used by extension cards like
           Rescue story, Forever Loved memorial). Body grows vertically so
           the pencil stays top-right. */
        .pce-list-item--prose {
          align-items: flex-start;
        }
        .pce-list-item-prose {
          font-size: 16px;
          line-height: 1.55;
          color: var(--color-navy-dark, #172531);
          /* margin removed — let parent container handle spacing */
          white-space: pre-wrap;
          word-break: break-word;
        }

        /* Add-row button (e.g. "+ Add vaccination") - matches Profile .pp-add-pet-btn */
        .pce-add-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 24px;
          height: 42px;
          background: var(--color-navy-dark, #172531);
          color: #fff;
          border: 2px solid var(--color-navy-dark, #172531);
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          white-space: nowrap;
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .pce-showall-btn {
          display: flex;
          width: fit-content;
          align-items: center;
          gap: 5px;
          margin-top: 10px;
          margin-bottom: 4px;
          padding: 7px 4px;
          background: none;
          border: none;
          color: var(--color-terracotta, #CF5C36);
          font-size: 13.5px;
          font-weight: 700;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          cursor: pointer;
          transition: color 0.15s;
        }
        .pce-showall-btn:hover { color: var(--color-terracotta-dark, #A8471D); }
        .pce-showall-chev {
          transition: transform 0.3s cubic-bezier(0.33,1,0.68,1);
        }
        .pce-showall-chev.is-open { transform: rotate(180deg); }
        .pce-list--more { margin-top: 0; }
        .pce-add-btn:hover {
          background: #fff;
          color: var(--color-navy-dark, #172531);
          border-color: var(--color-navy-dark, #172531);
        }

        /* Subsection - used to group e.g. "Vaccinations" inside Medical */
        .pce-subsection { margin-top: 28px; }
        .pce-subsection:first-child { margin-top: 0; }
        .pce-sub-title {
          font-size: 17px;
          font-weight: 800;
          color: var(--color-navy-dark, #172531);
          margin: 0 0 4px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          letter-spacing: -0.01em;
        }
        /* Field-level heading for sub-fields inside extension cards
           (Champion/Adventurer/Foodie). Smaller + lighter than .pce-sub-title
           so the section heading (h3) above remains visually dominant.
           Two-tier hierarchy: section heading → field heading → input.
           The 20px top margin gives breathing room between the parent
           section heading (or the previous field's content/button) and
           this field. The 4px bottom keeps the heading tight to its
           subtitle/input below. */
        .pce-field-heading {
          font-size: 14px;
          font-weight: 700;
          color: var(--color-navy-dark, #172531);
          margin: 20px 0 4px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          text-transform: none;
          letter-spacing: 0;
        }
        .pce-sub-sub {
          font-size: 16px;
          font-weight: 500;
          color: #717A86;
          margin: 0 0 14px;
          line-height: 1.55;
        }

        /* Modal */
        /* Inline expanding form (vaccinations + medications add).
           Sits below the "+ Add" button when active. Replaces modal for add-mode. */
        .pce-inline-form {
          margin-top: 16px;
          position: relative;
        }
        .pce-form-close {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 38px;
          height: 38px;
          border: none;
          background: transparent;
          color: var(--color-muted, #717A86);
          cursor: pointer;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, color 0.15s;
          z-index: 2;
        }
        /* Give the form content room so it never sits under the close X. */
        .pce-inline-form > .pce-entry-card,
        .pce-inline-form > .pce-field,
        .pce-inline-form > .pce-sub-title,
        .pce-inline-form > h3,
        .pce-inline-form > .pce-field-grid {
          padding-right: 44px;
        }
        .pce-form-close:hover {
          background: var(--color-cream, #F5F0E8);
          color: var(--color-navy-dark, #172531);
        }
        .pce-collapse {
          display: grid; grid-template-rows: 0fr; opacity: 0; visibility: hidden;
          transition: grid-template-rows 0.3s cubic-bezier(0.33,1,0.68,1), opacity 0.22s ease, visibility 0s linear 0.3s;
        }
        .pce-collapse.is-open {
          grid-template-rows: 1fr; opacity: 1; visibility: visible;
          transition: grid-template-rows 0.3s cubic-bezier(0.33,1,0.68,1), opacity 0.26s ease 0.04s, visibility 0s linear 0s;
        }
        .pce-collapse-inner {
          overflow: hidden; min-height: 0; transform: translateY(-5px);
          transition: transform 0.3s cubic-bezier(0.33,1,0.68,1);
        }
        .pce-collapse.is-open .pce-collapse-inner { transform: translateY(0); }
        @media (prefers-reduced-motion: reduce) { .pce-collapse, .pce-collapse-inner { transition: none; } }
        .pce-inline-form-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        @media (max-width: 640px) {
          .pce-inline-form-actions {
            flex-direction: column-reverse;
            border-top: 1px solid rgba(23,37,49,0.06);
            margin-top: 16px;
            padding-top: 16px;
          }
          .pce-inline-form-actions .pce-btn-primary,
          .pce-inline-form-actions .pce-btn-secondary {
            width: 100%;
          }
        }

        /* Multi-entry cards in add-mode modals (vaccinations, medications).
           Each entry is visually grouped as a card so the user sees clear
           boundaries between records being added at once. */
        .pce-entry-card {
          padding: 20px 20px 20px;
          background: #fff;
          border: 1px solid rgba(23,37,49,0.10);
          border-radius: 12px;
          margin-bottom: 12px;
          box-shadow: 0 1px 3px rgba(23,37,49,0.04);
          /* Single source of truth for vertical spacing inside entry cards.
             Same reasoning as .pce-modal-body — gap ensures every direct child
             gets a uniform 14px gap regardless of class. */
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .pce-entry-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          /* No margin-bottom — the parent's gap handles spacing to next child */
        }
        .pce-entry-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-terracotta, #CF5C36);
        }
        /* "Linked" badge shown in form headers when a directory vet is picked.
           Communicates that auto-filled data is sourced from the vet directory. */
        .pce-entry-linked-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 9px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #2E7D5F;
          background: rgba(46,125,95,0.10);
          border-radius: 999px;
          line-height: 1.4;
        }

        /* Split layout for inline form action rows that have a destructive
           action on one side (Clear / Delete) and the cancel+save buttons on
           the other. Used by Primary vet, Emergency vet, Insurance inline forms. */
        .pce-inline-form-actions--split {
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .pce-inline-form-actions-right {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        @media (max-width: 640px) {
          .pce-inline-form-actions--split {
            flex-direction: column-reverse;
            align-items: stretch;
            border-top: 1px solid rgba(23,37,49,0.06);
            margin-top: 16px;
            padding-top: 16px;
          }
          .pce-inline-form-actions-right {
            width: 100%;
          }
          .pce-inline-form-actions-right .pce-btn-secondary,
          .pce-inline-form-actions-right .pce-btn-primary {
            flex: 1 1 0;
          }
          .pce-inline-form-actions--split .pce-btn-danger-text {
            width: 100%;
            text-align: center;
          }
        }

        /* "+ Add another vaccination/medication" button — dashed outline,
           matches Vet Slug's .isp-add-entry treatment */
        .pce-add-entry {
          width: 100%;
          padding: 13px;
          background: transparent;
          color: var(--color-terracotta, #CF5C36);
          border: 1.5px dashed var(--color-terracotta, #CF5C36);
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 4px;
          margin-bottom: 8px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: background 0.15s;
        }
        .pce-add-entry:hover { background: rgba(207,92,54,0.06); }

        /* Show more / less button — appears below long lists.
           Same dashed-outline aesthetic as pce-add-entry but with chevron icon. */
        .pce-show-more-btn {
          width: 100%;
          padding: 12px;
          background: transparent;
          color: var(--color-navy-dark, #172531);
          border: 1.5px solid rgba(23,37,49,0.16);
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 8px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: background 0.15s, border-color 0.15s;
        }
        .pce-show-more-btn:hover {
          background: rgba(23,37,49,0.03);
          border-color: rgba(23,37,49,0.26);
        }

        /* Vet & Emergency: phone/email links inside meta values */
        .pce-link {
          color: var(--color-terracotta, #CF5C36);
          text-decoration: none;
          font-weight: 600;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-link:hover { text-decoration: underline; }

        /* Pet Poison Helpline footer card — static safety info, not editable */
        .pce-helpline-card {
          display: flex;
          gap: 14px;
          padding: 18px 20px;
          background: rgba(207,92,54,0.06);
          border: 1.5px solid rgba(207,92,54,0.20);
          border-radius: 12px;
          margin-top: 8px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-helpline-icon {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(207,92,54,0.14);
          color: var(--color-terracotta, #CF5C36);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pce-helpline-body { flex: 1; min-width: 0; }
        .pce-helpline-title {
          margin: 0 0 4px;
          font-size: 16px;
          font-weight: 700;
          color: var(--color-navy-dark, #172531);
        }
        .pce-helpline-sub {
          margin: 0 0 8px;
          font-size: 15px;
          font-weight: 500;
          color: #717A86;
          line-height: 1.4;
        }
        .pce-helpline-phone {
          display: inline-block;
          font-size: 17px;
          font-weight: 700;
          color: var(--color-terracotta, #CF5C36);
          text-decoration: none;
          letter-spacing: 0.01em;
        }
        .pce-helpline-phone:hover { text-decoration: underline; }

        /* Weight unit toggle — used in Identity section weight field.  */
        .pce-weight-row {
          display: flex;
          gap: 8px;
          align-items: stretch;
        }
        .pce-weight-input {
          flex: 1 1 auto;
          min-width: 0;
        }
        .pce-weight-unit-toggle {
          display: inline-flex;
          border: 1.5px solid rgba(23,37,49,0.16);
          border-radius: 10px;
          overflow: hidden;
          flex-shrink: 0;
        }
        .pce-weight-unit-btn {
          padding: 0 14px;
          background: #fff;
          border: none;
          color: var(--color-muted, #717A86);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: background 0.15s, color 0.15s;
        }
        .pce-weight-unit-btn.active {
          background: var(--color-navy-dark, #172531);
          color: #fff;
        }
        .pce-weight-unit-btn:not(.active):hover {
          background: rgba(23,37,49,0.04);
          color: var(--color-navy-dark, #172531);
        }

        /* Weight history chart container + range filters + trend pill */
        .pce-weight-range-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .pce-weight-range-tabs {
          display: inline-flex;
          border: 1px solid rgba(23,37,49,0.10);
          border-radius: 10px;
          overflow: hidden;
          background: #fff;
          height: 40px;
        }
        .pce-weight-range-btn {
          padding: 6px 14px;
          background: transparent;
          border: none;
          color: var(--color-muted, #717A86);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: background 0.15s, color 0.15s;
        }
        .pce-weight-range-btn.active {
          background: var(--color-navy-dark, #172531);
          color: #fff;
        }
        .pce-weight-range-btn:not(.active):hover {
          background: rgba(23,37,49,0.04);
          color: var(--color-navy-dark, #172531);
        }
        /* Vertical divider between adjacent tabs — hidden when either side is active.
           Result: dividers only appear between two inactive tabs. */
        .pce-weight-range-btn + .pce-weight-range-btn {
          border-left: 1px solid rgba(23,37,49,0.10);
        }
        .pce-weight-range-btn.active + .pce-weight-range-btn,
        .pce-weight-range-btn.active {
          border-left-color: transparent;
        }
        .pce-weight-trend {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-weight-trend.up {
          background: rgba(217,162,27,0.14);
          color: #8C6A11;
        }
        .pce-weight-trend.down {
          background: rgba(26,102,65,0.10);
          color: #1A6641;
        }
        .pce-weight-trend-summary {
          margin: 0 0 12px;
          font-size: 16px;
          font-weight: 600;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        /* Trend summary above chart: neutral color matching per-card weight change.
           Pet weight goals vary, so we don't pre-judge gain/loss as good or bad. */
        .pce-weight-trend-summary.up,
        .pce-weight-trend-summary.down,
        .pce-weight-trend-summary.stable { color: var(--color-navy-dark, #172531); }
        .pce-weight-trend.stable {
          background: rgba(23,37,49,0.06);
          color: var(--color-muted, #717A86);
        }
        .pce-weight-history-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .pce-weight-history-right .pce-weight-unit-toggle {
          height: 40px;
        }
        .pce-weight-history-right .pce-weight-unit-btn {
          padding: 0 12px;
          font-size: 14px;
        }
        .pce-weight-chart {
          background: #fff;
          border: 1px solid #EDE8E0;
          border-radius: 12px;
          padding: 14px 8px 8px;
          margin-bottom: 14px;
          box-shadow: 0 2px 12px rgba(23,37,49,0.05);
        }

        /* WEIGHT_CHART_TOOLTIP — Recharts tooltip styling, scoped to the
           weight chart's tooltip wrapper so it doesn't bleed to other charts.
           Targets Recharts' built-in classes (.recharts-tooltip-label is the
           date heading; .recharts-tooltip-item-value is the "81.4 lbs" value).
           font-weight: 600 (semi-bold) makes the data pop in quick-scan UI
           while staying readable at 13px. */
        .pce-weight-tooltip .recharts-tooltip-label {
          font-weight: 600;
          color: var(--color-navy-dark, #172531);
        }
        .pce-weight-tooltip .recharts-tooltip-item-value {
          font-weight: 600;
          color: var(--color-terracotta, #CF5C36);
        }
        .pce-weight-tooltip .recharts-tooltip-item-name {
          font-weight: 600;
          color: var(--color-navy-dark, #172531);
        }

        /* PAUSED state — feeding/walks that are temporarily inactive.  */
        .pce-list-item.is-paused {
          opacity: 0.65;
          background: rgba(23,37,49,0.02);
        }
        .pce-list-item-status.paused {
          background: rgba(23,37,49,0.08);
          color: var(--color-muted, #717A86);
        }

        /* Day-of-week picker — 7 toggle buttons for custom frequency */
        .pce-days-picker {
          display: flex;
          gap: 6px;
          margin-top: 0;
          flex-wrap: nowrap;
          width: 100%;
        }
        .pce-day-btn {
          flex: 1 1 0;
          min-width: 0;
          height: 42px;
          border-radius: 8px;
          border: 2px solid rgba(23,37,49,0.16);
          background: #fff;
          color: var(--color-muted, #717A86);
          font-size: 14px;
          font-weight: 700;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
          padding: 0;
        }
        .pce-day-btn:hover {
          background: rgba(23,37,49,0.04);
          color: var(--color-navy-dark, #172531);
        }
        .pce-day-btn.active {
          background: var(--color-terracotta, #CF5C36);
          border-color: var(--color-terracotta, #CF5C36);
          color: #fff;
        }
        .pce-day-btn.active:hover {
          background: #B84B26;
          border-color: #B84B26;
        }

        /* Checkbox row — used in modals for boolean toggles (e.g. paused). */
        .pce-checkbox-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: rgba(23,37,49,0.03);
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          line-height: 1.2;
          font-weight: 600;
          color: var(--color-navy-dark, #172531);
          margin-top: 4px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-checkbox-row input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: var(--color-terracotta, #CF5C36);
          cursor: pointer;
          flex-shrink: 0;
          /* Match line-height so checkbox aligns with first line of label, not centered on wrapped text. */
          margin-top: 2px;
        }
        .pce-checkbox-row > span {
          flex: 1;
          min-width: 0;
        }
        @media (max-width: 640px) {
          .pce-weight-row {
            flex-direction: column;
          }
          .pce-weight-unit-toggle {
            display: flex;
            width: 100%;
            height: 46px;
            margin-top: 5px;

          }
          .pce-weight-unit-btn {
            flex: 1 1 0;
            padding: 0 14px;
            font-size: 14px;
          }
        }

        /* Vet autocomplete dropdown */
        .pce-vet-autocomplete {
          position: relative;
          width: 100%;
        }
        .pce-vet-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: #fff;
          border: 1.5px solid rgba(23,37,49,0.10);
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(23,37,49,0.12);
          z-index: 10;
          max-height: 240px;
          overflow-y: auto;
        }
        .pce-vet-option {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          width: 100%;
          padding: 10px 14px;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(23,37,49,0.06);
          cursor: pointer;
          text-align: left;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: background 0.12s;
        }
        .pce-vet-option:last-child { border-bottom: none; }
        .pce-vet-option:hover { background: rgba(23,37,49,0.04); }
        .pce-vet-option-name {
          font-size: 14px;
          font-weight: 700;
          color: var(--color-navy-dark, #172531);
          line-height: 1.3;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .pce-vet-option-badge {
          display: inline-block;
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #2E7D5F;
          background: rgba(46,125,95,0.10);
          border-radius: 999px;
          line-height: 1.4;
        }
        .pce-vet-option-meta {
          font-size: 14px;
          font-weight: 500;
          color: var(--color-muted, #717A86);
          margin-top: 2px;
        }
        .pce-vet-dropdown-empty { padding: 12px 14px; }
        .pce-vet-empty-msg {
          margin: 0;
          font-size: 14px;
          color: var(--color-muted, #717A86);
          line-height: 1.4;
        }

        .pce-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(23,37,49,0.55);
          -webkit-backdrop-filter: blur(4px);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: pce-overlay-in 0.18s ease-out;
        }
        @keyframes pce-overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .pce-modal {
          background: #fff;
          border-radius: 18px;
          width: 100%;
          max-width: 560px;
          max-height: 86vh;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          box-shadow: 0 30px 60px rgba(0,0,0,0.40);
          animation: pce-modal-in 0.22s ease-out;
          box-sizing: border-box;
        }
        @keyframes pce-modal-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pce-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 22px 24px 14px;
        }
        .pce-modal-title {
          font-size: clamp(19px, 2.6vw, 22px);
          font-weight: 800;
          color: var(--color-navy-dark, #172531);
          margin: 0;
          letter-spacing: -0.01em;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-modal-close {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: transparent;
          color: var(--color-muted, #717A86);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, color 0.15s;
        }
        .pce-modal-close:hover { background: rgba(23,37,49,0.06); color: var(--color-navy-dark, #172531); }
        .pce-modal-body {
          padding: 0 24px 12px;
          display: flex;
          flex-direction: column;
          /* Single source of truth for vertical spacing between every direct
             child block (pce-field, pce-field-grid, pce-checkbox-row, etc.).
             Replaces the fragile adjacency-selector approach which required
             every possible pairing to be listed and failed when new blocks
             were added. With gap, ALL children space evenly automatically. */
          gap: 14px;
        }
        /* Error banner shown when save/delete fails. Works inside both modals
           (where modal-body has horizontal padding) and inline forms. */
        .pce-modal-error {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0 0 12px;
          padding: 12px 14px;
          background: rgba(220,38,38,0.06);
          border: 1.5px solid rgba(220,38,38,0.20);
          border-radius: 10px;
          color: #B91C1C;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.4;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        /* Inside modals, the body has 24px horizontal padding; the error sits
           outside body but before footer — give it matching horizontal margin. */
        .pce-modal .pce-modal-error {
          margin-left: 24px;
          margin-right: 24px;
        }
        .pce-modal-error svg {
          flex-shrink: 0;
          color: #DC2626;
        }
        .pce-modal-footer {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          padding: 14px 24px 22px;
          margin-top: 16px;
          flex-wrap: wrap;
          position: relative;
        }
        /* divider inset to the modal content width (matches inline form dividers,
           does not span the full modal edge-to-edge) */
        .pce-modal-footer::before {
          content: "";
          position: absolute;
          top: 0;
          left: 24px;
          right: 24px;
          height: 1px;
          background: rgba(23,37,49,0.06);
        }
        .pce-modal-footer .pce-btn-danger-text {
          margin-right: auto;
        }
        .pce-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 42px;
          min-width: 90px;
          padding: 0 24px;
          line-height: 1;
          background: var(--color-terracotta, #CF5C36);
          color: #fff;
          border: 2px solid var(--color-terracotta, #CF5C36);
          border-radius: 12px;
          font-weight: 700;
          font-size: 15px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          white-space: nowrap;
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .pce-btn-primary:hover { background: #fff; color: var(--color-terracotta, #CF5C36); border-color: var(--color-terracotta, #CF5C36); }
        .pce-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; background: var(--color-terracotta, #CF5C36); color: #fff; border-color: var(--color-terracotta, #CF5C36); }
        .pce-btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 42px;
          min-width: 90px;
          padding: 0 24px;
          line-height: 1;
          background: #fff;
          color: var(--color-navy-dark, #172531);
          border: 2px solid rgba(23,37,49,0.10);
          border-radius: 12px;
          font-weight: 600;
          font-size: 15px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          white-space: nowrap;
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .pce-btn-secondary:hover {
          background: var(--color-navy-dark, #172531);
          color: #fff;
          border-color: var(--color-navy-dark, #172531);
        }
        /* Delete button — red outline matching Profile's .btn-danger-sm.
           White bg + red border + red text. Inverts on hover. */
        .pce-btn-danger-text {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 42px;
          padding: 0 20px;
          font-size: 15px;
          font-weight: 700;
          color: #C94040;
          background: #fff;
          border: 2px solid #F4C5C5;
          border-radius: 12px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .pce-btn-danger-text:hover {
          background: #C94040;
          color: #fff;
          border-color: #C94040;
        }
        .pce-btn-danger-text:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .pce-body { padding: 20px 0 80px; }
          .pce-section { padding: 22px 18px; }
          .pce-pet-header { padding: 16px; gap: 14px; }
          .pce-pet-photo-wrap { width: 72px; height: 72px; }
          /* Modal footer: stack buttons vertically. Order: Save top, Cancel middle, Delete bottom.
             JSX order is Delete, Cancel, Save — flex order reverses for stacking. */
          .pce-modal-footer {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .pce-modal-footer .pce-btn-primary { order: 1; width: 100%; }
          .pce-modal-footer .pce-btn-secondary { order: 2; width: 100%; }
          .pce-modal-footer .pce-btn-danger-text { order: 3; width: 100%; margin-right: 0; }

          /* MOBILE FULL-WIDTH BUTTONS — all action buttons span full width.
             Exclusions: day-of-week (flex:1 already), pencil/X icons (small),
             unit sub-toggles inside other components stay sized.
             This block enforces full-width for everything else. */
          .pce-add-btn {
            width: 100%;
            justify-content: center;
          }
          .pce-weight-range-tabs {
            display: flex;
            width: 100%;
          }
          .pce-weight-range-btn {
            flex: 1 1 0;
            padding: 10px 8px;
            text-align: center;
          }
          .pce-weight-history-right {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .pce-weight-history-right .pce-weight-unit-toggle {
            display: flex;
            width: 100%;
            height: 40px;
          }
          .pce-weight-history-right .pce-weight-unit-btn {
            flex: 1 1 0;
            padding: 0 14px;
            font-size: 14px;
          }
          .pce-weight-range-row {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .pce-weight-trend {
            align-self: flex-start;
          }
        }
      
`}</style>
    </div>
  );
}

function formatExpiryDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = d.getTime() - Date.now();
  if (diffMs < 0) return "Expired";
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return "tomorrow";
  if (diffDays <= 14) return `in ${diffDays} days`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Format the audit log event timestamp ("3 days ago", "just now", etc.)
function formatRelativeTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return `${m} minute${m !== 1 ? "s" : ""} ago`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return `${h} hour${h !== 1 ? "s" : ""} ago`;
  }
  const days = Math.floor(diffSec / 86400);
  if (days < 30) return `${days} day${days !== 1 ? "s" : ""} ago`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Audit log of share-token events (created, revoked). Owner-only via RLS.
// Renders below the two share cards. Helps owners spot unexpected activity
// (e.g. "I revoked a Care Card link last Tuesday but didn't generate one

function ShareActivityLog({ petId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await getShareTokenEvents(petId, 20);
      if (cancelled) return;
      setEvents(data || []);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [petId]);

  if (loading) return null;
  if (events.length === 0) {
    // No history yet — surfacing the empty state would just be noise.
    return null;
  }

  // Under 10 events, just show them all — collapsing saves negligible space
  // and adds friction. Once we hit 10+, collapse to the 5 most recent so the
  // section doesn't dominate the page.
  const COLLAPSE_THRESHOLD = 10;
  const COLLAPSED_COUNT = 5;
  const hasMore = events.length > COLLAPSE_THRESHOLD;
  const alwaysVisible = hasMore ? events.slice(0, COLLAPSED_COUNT) : events;
  const overflow = hasMore ? events.slice(COLLAPSED_COUNT) : [];

  const renderRow = (e) => {
    const cardLabel = e.card_type === "care" ? "Care Card" : "Hero Card";
    const actionLabel =
      e.event_type === "created"
        ? "Link created"
        : e.event_type === "revoked"
          ? "Link stopped"
          : e.event_type;
    return (
      <li key={e.id} className="pce-share-activity-row">
        <span className="pce-share-activity-action">
          {actionLabel}
          <span className="pce-share-activity-card"> · {cardLabel}</span>
        </span>
        <span className="pce-share-activity-time">
          {formatRelativeTime(e.occurred_at)}
        </span>
      </li>
    );
  };

  return (
    <div className="pce-share-activity">
      <h3 className="pce-sub-title">Recent activity</h3>
      <ul className="pce-share-activity-list">
        {alwaysVisible.map(renderRow)}
      </ul>
      {hasMore ? (
        <>
          <div
            className={`pce-share-activity-anim ${expanded ? "is-open" : ""}`}
          >
            <div className="pce-share-activity-anim-inner">
              <ul className="pce-share-activity-list">
                {overflow.map(renderRow)}
              </ul>
            </div>
          </div>
          <button
            type="button"
            className={`pce-share-activity-toggle${expanded ? " is-open" : ""}`}
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            {expanded
              ? "Show less"
              : `Show ${events.length - COLLAPSED_COUNT} more`}
            <ChevronDown
              size={16}
              strokeWidth={2}
              className="pce-share-activity-chevron"
            />
          </button>
        </>
      ) : null}
    </div>
  );
}

function ShareSection({ pet, onUpdate, setSaveStatus }) {
  const masterOn = pet.share_enabled !== false; // default true; only false explicitly disables

  // Whether this pet's published Hero Card is listed on the owner's public
  // profile directory. Separate from share_enabled and hero_is_published.
  const showOnProfile = !!pet.show_on_profile;
  const heroPublished = !!pet.hero_is_published;

  async function handleShowOnProfileToggle() {
    const next = !showOnProfile;
    setSaveStatus("saving");
    const { error } = await setShowOnProfile(pet.id, next);
    if (error) {
      setSaveStatus("error");
      return;
    }
    onUpdate("show_on_profile", next);
    setSaveStatus("saved");
  }

  // Toggle the master share_enabled flag on the pet record. When OFF, both
  // share URLs immediately stop working (RLS function checks share_enabled).
  async function handleMasterToggle() {
    const next = !masterOn;
    setSaveStatus("saving");
    const { error } = await setShareEnabled(pet.id, next);
    if (error) {
      setSaveStatus("error");
      return;
    }
    // Optimistically reflect the new value in the parent pet object so the
    // rest of the section re-renders disabled/enabled immediately.
    onUpdate("share_enabled", next);
    setSaveStatus("saved");
  }

  return (
    <div className="pce-section">
      {/* Master toggle — kill switch for ALL share links at once. */}
      <div className="pce-share-master">
        <div className="pce-share-master-text">
          <p className="pce-share-master-title">Allow sharing</p>
          <p className="pce-share-master-sub">
            {masterOn
              ? "Sharing is on. Generate links below for each card."
              : "Sharing is off. All existing links are disabled."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={masterOn}
          className={`pce-toggle${masterOn ? " is-on" : ""}`}
          onClick={handleMasterToggle}
        >
          <span className="pce-toggle-knob" />
        </button>
      </div>

      {/* The two share cards are dimmed (but still visible) when sharing is
          off, so the user understands what would be there if they turn it on. */}
      <div className={`pce-share-cards${masterOn ? "" : " is-disabled"}`}>
        <ShareLinkCard
          pet={pet}
          cardType="care"
          icon={ClipboardList}
          title="Care Card"
          description="Medical history, vaccinations, vet info, allergies, and daily care routines."
          masterOn={masterOn}
          setSaveStatus={setSaveStatus}
        />
        <ShareLinkCard
          pet={pet}
          cardType="hero"
          icon={Award}
          title="Hero Card"
          description="Photo, personality, identity tags, fun fact — the celebration card."
          masterOn={masterOn}
          setSaveStatus={setSaveStatus}
        />
      </div>

      {/* Show-on-public-profile toggle — lists this pet's PUBLISHED Hero Card
          in the owner's public profile directory. Independent of share links:
          this is the "directory" opt-in, gated together with is_public,
          hero_is_published, and share_enabled. Disabled until the Hero Card is
          published, since only a published card can be listed. */}
      <div
        className={`pce-share-master pce-profile-toggle${
          heroPublished ? "" : " is-disabled"
        }`}
      >
        <div className="pce-share-master-text">
          <p className="pce-share-master-title">Show on public profile</p>
          <p className="pce-share-master-sub">
            {!heroPublished
              ? "Publish the Hero Card first to list it on your public profile."
              : showOnProfile
                ? "Listed on your public profile for anyone to see."
                : "Not listed. Turn on to feature this Hero Card on your profile."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={showOnProfile}
          disabled={!heroPublished}
          className={`pce-toggle${showOnProfile ? " is-on" : ""}`}
          onClick={handleShowOnProfileToggle}
        >
          <span className="pce-toggle-knob" />
        </button>
      </div>

      <ShareActivityLog petId={pet.id} />
    </div>
  );
}

// Shortens the live share URL for the QR caption. Collapses the long
// random token to "abcd…wxyz" so the displayed line stays readable.
// Works for both care and hero share URL shapes:
//   /pet-card/[slug]/care/[token]
//   /pet-card/[slug]/hero/[token]
function shortenShareUrlForDisplay(rawUrl) {
  if (!rawUrl) return "";
  try {
    const u = new URL(rawUrl);
    const segments = u.pathname.split("/").filter(Boolean);
    if (
      segments.length === 4 &&
      (segments[2] === "care" || segments[2] === "hero")
    ) {
      const token = segments[3];
      const short =
        token.length > 8 ? `${token.slice(0, 4)}…${token.slice(-4)}` : token;
      return `${u.host}/${segments[0]}/${segments[1]}/${segments[2]}/${short}`;
    }
    return `${u.host}${u.pathname}`;
  } catch {
    return rawUrl;
  }
}

// =============================================================
// ShareQRBlock — expandable QR code for the active share URL.
// Lives inside ShareLinkCard, appears below the URL/meta row.
// Lets the owner show/hide the QR and download it as an SVG.
// data-qr-card scopes the download target so Care vs Hero QR are
// fetched correctly.
// =============================================================
function ShareQRBlock({ url, cardType, petName }) {
  const [open, setOpen] = useState(false);
  const [shareState, setShareState] = useState("idle"); // idle | copied

  // Three-tier share fallback so the button works in every environment:
  //   1. navigator.share         — HTTPS native share sheet
  //   2. navigator.clipboard     — HTTPS + localhost silent copy
  //   3. document.execCommand    — legacy fallback for HTTP LAN IPs
  async function handleShare() {
    if (!url) return;
    const cardLabel = cardType === "care" ? "Care" : "Hero";

    // Tier 1: native share sheet — ONLY on a secure context (HTTPS) where the
    // native sheet actually exists. On desktop / localhost / HTTP, navigator.share
    // can hang or behave badly, so we skip it and copy instead.
    const isSecure =
      typeof window !== "undefined" && window.isSecureContext === true;
    const canNativeShare =
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      isSecure;

    if (canNativeShare) {
      try {
        await navigator.share({
          title: `${petName || "Pet"} — ${cardLabel} Card`,
          text: `${petName || "Pet"}'s ${cardLabel} Card`,
          url,
        });
        return;
      } catch (err) {
        // User cancelled or share failed; fall through to copy.
      }
    }

    // Tier 2: Async Clipboard API.
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      navigator.clipboard.writeText
    ) {
      try {
        await navigator.clipboard.writeText(url);
        setShareState("copied");
        setTimeout(() => setShareState("idle"), 2000);
        return;
      } catch (err) {
        // Fall through to legacy.
      }
    }

    // Tier 3: Legacy fallback.
    // Same iOS requirements as handleCopy below: on-screen, editable, a real
    // Selection Range. An element at left:-9999px is off-viewport and iOS
    // refuses to copy from it.
    try {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.setAttribute("readonly", "");
      ta.contentEditable = "true";
      ta.readOnly = false;
      ta.style.cssText =
        "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;" +
        "outline:0;opacity:0;font-size:16px;-webkit-user-select:text;user-select:text;";
      document.body.appendChild(ta);

      const range = document.createRange();
      range.selectNodeContents(ta);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      ta.setSelectionRange(0, 999999);

      const ok = document.execCommand("copy");
      sel.removeAllRanges();
      document.body.removeChild(ta);
      if (ok) {
        setShareState("copied");
        setTimeout(() => setShareState("idle"), 2000);
      }
    } catch (err) {
      // No-op.
    }
  }

  function handleDownload() {
    const svgEl = document.querySelector(`[data-qr-card="${cardType}"] svg`);
    if (!svgEl) return;
    const xml = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = dlUrl;
    a.download = `${(petName || "pet").toLowerCase()}-${cardType}-card-qr.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(dlUrl);
  }

  return (
    <div className="pce-share-block">
      {/* Buttons live at the TOP of the share block, immediately visible.
          Option Z: Share = filled terracotta, both Downloads = identical
          navy outline. Same styling desktop + mobile (layout differs only). */}
      <div className="pce-share-actions">
        <button
          type="button"
          className="pce-share-btn pce-share-btn--primary"
          onClick={handleShare}
          disabled={!url}
          aria-label={`Share ${cardType === "care" ? "Care" : "Hero"} Card link`}
        >
          {shareState === "copied" ? (
            <>
              <Check size={14} strokeWidth={2.5} />
              Copied!
            </>
          ) : (
            <>
              <Share2 size={14} strokeWidth={2} />
              Share
            </>
          )}
        </button>
        {/* Care cards only. ?print=1 is read by the care card pages, which
            fire window.print() on load — there is no equivalent on the hero
            side, so the button did nothing there. A Hero Card is a flip card
            on an animated background; printing it would give one face and no
            background, so this is a deliberate omission rather than a gap. */}
        {cardType === "care" && (
          <a
            className="pce-share-btn pce-share-btn--secondary"
            href={`${url}?print=1`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download Care Card as PDF"
          >
            <Printer size={14} strokeWidth={2} />
            Download PDF
          </a>
        )}
        <button
          type="button"
          className="pce-share-btn pce-share-btn--secondary"
          onClick={handleDownload}
          disabled={!url}
          aria-label="Download QR code as SVG"
        >
          <Download size={14} strokeWidth={2} />
          Download QR
        </button>
      </div>

      <div className="pce-share-hints">
        <p className="pce-share-hint">
          <strong>Share</strong> sends a link that always points to the latest
          version of this {cardType === "care" ? "Care" : "Hero"} Card.
        </p>
        {cardType === "care" && (
          <p className="pce-share-hint">
            <strong>Download PDF</strong> saves a snapshot you can email or
            print.
          </p>
        )}
        <p className="pce-share-hint">
          <strong>Download QR</strong> saves the QR code as an image file.
        </p>
      </div>

      <div className="pce-share-divider" />
      <button
        type="button"
        className={`pce-share-qr-toggle${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <QrCode size={14} strokeWidth={2} />
        {open ? "Hide QR code" : "Show QR code"}
        <ChevronDown
          size={16}
          strokeWidth={2}
          className="pce-share-qr-chevron"
        />
      </button>
      <div className={`pce-share-qr-anim ${open ? "is-open" : ""}`}>
        <div className="pce-share-qr-anim-inner">
          <div className="pce-share-qr-panel" data-qr-card={cardType}>
            <div className="pce-share-qr-svg">
              <QRCodeSVG
                value={url}
                size={140}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#172531"
              />
            </div>
            {/* URL caption — mirrors PCC's expanded QR card so the editor
              preview tells the owner exactly what the QR encodes. */}
            <div className="pce-share-qr-caption">
              <p className="pce-share-qr-caption-label">
                {cardType === "care" ? "Care" : "Hero"} Card URL
              </p>
              <p className="pce-share-qr-caption-url">
                {shortenShareUrlForDisplay(url) || "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// One row per card type (care or hero). Loads its own active token + view
// stats on mount. Provides generate / regenerate / copy / revoke / preview.
function ShareLinkCard({
  pet,
  cardType,
  icon: Icon,
  title,
  description,
  masterOn,
  setSaveStatus,
}) {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewStats, setViewStats] = useState({ total: 0, last30Days: 0 });
  // Expiration UI state: when null, the "Generate" button is shown alone.
  // When the user clicks the expiration dropdown, we capture their choice
  // and pass it to createShareToken. Default: never expire (matches old
  // behavior so existing users see no surprise).
  const [expirePickerOpen, setExpirePickerOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [expireDays, setExpireDays] = useState(null); // null = never
  const copiedTimerRef = useRef(null);

  // Initial load: fetch active token + view stats in parallel.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [tokRes, statsRes] = await Promise.all([
        getActiveShareToken(pet.id, cardType),
        getCardViewStats(pet.id),
      ]);
      if (cancelled) return;
      setToken(tokRes.data || null);
      if (statsRes.data && statsRes.data[cardType]) {
        setViewStats(statsRes.data[cardType]);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [pet.id, cardType]);

  // Clean up the "Copied!" timer if the component unmounts mid-message.
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const hasToken = !!token;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = hasToken
    ? buildShareUrl(pet.slug, cardType, token.token, origin)
    : "";

  async function handleGenerate() {
    setBusy(true);
    setSaveStatus("saving");
    const { data, error } = await createShareToken(
      pet.id,
      cardType,
      expireDays,
    );
    setBusy(false);
    setExpirePickerOpen(false);
    if (error) {
      setSaveStatus("error");
      return;
    }
    setToken(data);
    setSaveStatus("saved");
  }

  async function handleRegenerate() {
    if (
      !confirm(
        `Regenerate the ${title} link?\n\nThe current link will stop working immediately. Anyone you've shared it with will need the new link.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setSaveStatus("saving");
    // Regenerated tokens reuse the same expiration choice as the previous
    // token (null if never set, otherwise re-applied N days from now).
    // This matches user intent — "I picked 7-day links, give me another."
    const prevExpiry =
      token && token.expires_at
        ? Math.max(
            1,
            Math.ceil(
              (new Date(token.expires_at) - Date.now()) / (1000 * 60 * 60 * 24),
            ),
          )
        : null;
    const { data, error } = await createShareToken(
      pet.id,
      cardType,
      prevExpiry,
    );
    setBusy(false);
    if (error) {
      setSaveStatus("error");
      return;
    }
    setToken(data);
    setSaveStatus("saved");
  }

  async function handleRevoke() {
    if (
      !confirm(
        `Stop sharing the ${title}?\n\nThe link will be deactivated immediately and can't be reused.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setSaveStatus("saving");
    const { error } = await revokeShareTokens(pet.id, cardType);
    setBusy(false);
    if (error) {
      setSaveStatus("error");
      return;
    }
    setToken(null);
    setSaveStatus("saved");
  }

  async function handleCopy() {
    if (!shareUrl) return;

    // Try modern Clipboard API first (HTTPS + localhost).
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      navigator.clipboard.writeText
    ) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
        return;
      } catch {
        // Fall through to legacy below.
      }
    }

    // Legacy fallback for HTTP LAN IPs where modern API is blocked.
    // execCommand("copy") works on the active text selection — we use
    // the existing readonly URL input itself as the selection source.
    // iOS Safari will not copy from a readonly input, and select() alone does
    // not create a Range it recognises. It needs: an editable, non-readonly
    // element, a real Selection Range over it, then setSelectionRange. This is
    // the only combination that works on iPad over http:// (a LAN IP is not a
    // secure context, so the Clipboard API above is unavailable there).
    try {
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      ta.setAttribute("readonly", "");
      ta.contentEditable = "true";
      ta.readOnly = false;
      // Kept on-screen but invisible: iOS ignores display:none and elements
      // positioned outside the viewport. 16px avoids the focus zoom.
      ta.style.cssText =
        "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;" +
        "outline:0;opacity:0;font-size:16px;-webkit-user-select:text;user-select:text;";
      document.body.appendChild(ta);

      const range = document.createRange();
      range.selectNodeContents(ta);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      ta.setSelectionRange(0, 999999);

      const ok = document.execCommand("copy");
      sel.removeAllRanges();
      document.body.removeChild(ta);

      if (ok) {
        setCopied(true);
        if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
        return;
      }
    } catch {
      // Even legacy failed; fall through to selection-only.
    }

    // Worst case: keep the URL selected so the user can long-press copy.
    {
      const input = document.getElementById(`share-url-${cardType}`);
      if (input) {
        input.select();
        input.setSelectionRange(0, 99999);
      }
    }
  }

  return (
    <div className="pce-share-card">
      <div className="pce-share-card-header">
        <span className="pce-share-card-icon" aria-hidden="true">
          <Icon size={20} strokeWidth={2} />
        </span>
        <div className="pce-share-card-heading">
          <h3 className="pce-share-card-title">{title}</h3>
          <p className="pce-share-card-desc">{description}</p>
        </div>
      </div>

      {loading ? (
        <p className="pce-share-card-loading">Loading…</p>
      ) : !hasToken ? (
        // No active token — Expires picker (left) + Generate button (right).
        // Desktop: side-by-side, opposite-aligned, both same height.
        // Mobile: stacked, full-width, Expires above Generate.
        <div className="pce-share-generate-row">
          <div className="pce-share-expire-field">
            <label
              className="pce-share-expire-label"
              htmlFor={`expire-${cardType}`}
            >
              Expires
            </label>
            <select
              id={`expire-${cardType}`}
              className="pce-select pce-share-expire-select"
              value={expireDays === null ? "0" : String(expireDays)}
              onChange={(e) => {
                const v = e.target.value;
                setExpireDays(v === "0" ? null : Number(v));
              }}
              disabled={busy || !masterOn}
              aria-label={`Expiration for ${title} link`}
            >
              <option value="0">Never</option>
              <option value="7">In 7 days</option>
              <option value="30">In 30 days</option>
              <option value="90">In 90 days</option>
            </select>
          </div>
          <button
            type="button"
            className="pce-btn-primary"
            onClick={handleGenerate}
            disabled={busy || !masterOn}
          >
            <Share2 size={16} strokeWidth={2.4} />
            Generate {title} link
          </button>
        </div>
      ) : (
        // Active token exists — show URL + copy + view count + manage actions.
        <div className="pce-share-card-body">
          <div className="pce-share-url-row">
            <input
              id={`share-url-${cardType}`}
              type="text"
              className="pce-share-url"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.target.select()}
              aria-label={`${title} share URL`}
            />
            <button
              type="button"
              className="pce-share-copy-btn"
              onClick={handleCopy}
              disabled={!masterOn}
              aria-label={`Copy ${title} link`}
            >
              {copied ? (
                <>
                  <Check size={16} strokeWidth={2.4} />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={16} strokeWidth={2.4} />
                  Copy
                </>
              )}
            </button>
          </div>

          <div className="pce-share-card-meta">
            <span className="pce-share-card-meta-item">
              <Eye size={14} strokeWidth={2} />
              {viewStats.total} view{viewStats.total === 1 ? "" : "s"}
              {viewStats.last30Days > 0
                ? ` · ${viewStats.last30Days} this month`
                : ""}
            </span>
            {token && token.expires_at ? (
              <span className="pce-share-card-meta-item">
                Expires {formatExpiryDate(token.expires_at)}
              </span>
            ) : null}
            <a
              className="pce-share-card-preview"
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={14} strokeWidth={2} />
              Preview
            </a>
          </div>

          {/* B1 manage zone — New link / Stop sharing collapsed behind
              a toggle. View stats / expiry / Preview stay visible above.
              These actions are destructive (Stop) or near-destructive
              (New link invalidates the previous URL), so they earn the
              extra friction of a click to reveal. */}
          <div className="pce-share-manage">
            <button
              type="button"
              className={`pce-share-manage-toggle${manageOpen ? " is-open" : ""}`}
              onClick={() => setManageOpen((v) => !v)}
              aria-expanded={manageOpen}
              aria-controls={`manage-${cardType}`}
            >
              {manageOpen ? "Hide these options" : "Regenerate or revoke"}
              <ChevronDown
                size={16}
                strokeWidth={2}
                className="pce-share-manage-chevron"
              />
            </button>
            <div
              className={`pce-share-manage-anim ${manageOpen ? "is-open" : ""}`}
            >
              <div className="pce-share-manage-anim-inner">
                <div
                  id={`manage-${cardType}`}
                  className="pce-share-manage-panel"
                >
                  <div className="pce-share-manage-hints">
                    <p className="pce-share-manage-hint">
                      <strong>New link</strong> generates a fresh URL and
                      immediately invalidates the current one.
                    </p>
                    <p className="pce-share-manage-hint">
                      <strong>Stop sharing</strong> revokes access entirely.
                    </p>
                  </div>
                  <div className="pce-share-manage-divider" />
                  <div className="pce-share-manage-actions">
                    <button
                      type="button"
                      className="pce-btn-secondary"
                      onClick={handleRegenerate}
                      disabled={busy || !masterOn}
                    >
                      <RefreshCw size={14} strokeWidth={2} />
                      New link
                    </button>
                    <button
                      type="button"
                      className="pce-btn-danger-text"
                      onClick={handleRevoke}
                      disabled={busy}
                    >
                      Stop sharing
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* QR code — owner-facing utility. Owner can screenshot or
              download to print/share. Same URL the Copy button copies. */}
          <ShareQRBlock url={shareUrl} cardType={cardType} petName={pet.name} />
        </div>
      )}
    </div>
  );
}

// =============================================================
// MEDICAL SECTION
// =============================================================
// Three subsections inside the Medical card:
//   1. Allergies + Conditions — free-text textareas, autosaved
//   2. Vaccinations — structured list with add/edit/delete modal
//   3. Medications — structured list with add/edit/delete modal

// =============================================================
// TextareaCard — reusable view/edit block for single-textarea fields.
// Used by: Allergies, Medical conditions, Quirks & warnings.
// Coordinates with the parent section's openFormId so only one is open at a time.
// =============================================================
function SaveIndicator({ status }) {
  if (status === "idle") return null;
  if (status === "saving") {
    return (
      <div className="pce-save-toast saving" role="status">
        <Loader2 size={14} strokeWidth={2.2} className="pce-spin" />
        Saving…
      </div>
    );
  }
  if (status === "saved") {
    return (
      <div className="pce-save-toast saved" role="status">
        <Check size={14} strokeWidth={2.4} />
        Saved
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="pce-save-toast error" role="alert">
        Couldn&apos;t save — please retry
      </div>
    );
  }
  return null;
}
