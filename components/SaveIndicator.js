"use client";

import { Check, Loader2 } from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════════
   The save indicator for the pet-card editors.

   These editors autosave, so their confirmation is driven by a status rather
   than by an event: it has to stay up for as long as the request is in
   flight. That is why it is a component taking a status prop and not a call
   into ToastProvider, whose toasts are fired and forgotten on a 3s timer.

   It was three byte-identical copies — one each in care-edit, share and
   hero-edit — differing only in class prefix. The styles below are the same
   measurements, and ToastProvider's pill matches them too, so every save
   confirmation on the site is now the same object.

   status: "idle" | "saving" | "saved" | "error"
   ══════════════════════════════════════════════════════════════════════════ */
export default function SaveIndicator({ status }) {
  // The styles render whatever the status, including idle. In the originals
  // this CSS lived in each page's permanent style block, so it was in the
  // document before the pill ever appeared; scoping it to the pill's own
  // render would have tied the two together and left a one-frame window on a
  // slow paint where the pill exists and its rules do not.
  const live = status && status !== "idle";

  return (
    <>
      {live && status === "saving" && (
        <div className="np-save-toast" role="status">
          <Loader2
            size={14}
            strokeWidth={2.2}
            className="np-save-toast-spin"
          />
          Saving…
        </div>
      )}
      {live && status === "saved" && (
        <div className="np-save-toast is-saved" role="status">
          <Check size={14} strokeWidth={2.4} />
          Saved
        </div>
      )}
      {live && status === "error" && (
        <div className="np-save-toast is-error" role="alert">
          Couldn&apos;t save — please retry
        </div>
      )}

      <style>{`
        .np-save-toast {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 50;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: var(--color-white);
          border-radius: 9999px;
          box-shadow:
            0 8px 24px rgb(var(--color-navy-dark-rgb) / 0.18),
            0 0 0 1px rgb(var(--color-navy-dark-rgb) / 0.06);
          font-family: var(--font-urbanist, 'Urbanist', sans-serif);
          font-size: 14px;
          font-weight: 600;
          color: var(--color-muted);
          animation: np-save-toast-in 0.18s ease-out;
        }
        .np-save-toast.is-saved { color: var(--color-success-text); }
        .np-save-toast.is-error { color: var(--color-error); }
        @keyframes np-save-toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .np-save-toast-spin { animation: np-save-toast-spin 0.9s linear infinite; }
        @keyframes np-save-toast-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .np-save-toast { animation: none; }
          .np-save-toast-spin { animation-duration: 2s; }
        }
        @media (max-width: 640px) {
          .np-save-toast { right: 16px; bottom: 16px; }
        }
      `}</style>
    </>
  );
}
