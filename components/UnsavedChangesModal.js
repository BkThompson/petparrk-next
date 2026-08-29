"use client";

/* ════════════════════════════════════════════════════════════════════════
   UnsavedChangesModal + useUnsavedChanges

   One copy. Previously lived, separately, in ProfileMain, the Care editor,
   and the Hero editor. The three had drifted, and each carried a fix the
   others lacked:

     • ProfileMain compensated for the scrollbar width when locking body
       scroll, so the page did not shift horizontally as the bar vanished.
     • The Care editor rendered through a portal into document.body with
       inline positioning, so a transformed or positioned ancestor could
       not off-center the overlay.

   This version is the union of both. The markup, the `ucm-` CSS, the copy,
   and the onChoice("save" | "discard" | "keep") contract were already
   byte-identical in all three.

   Usage:
     const { confirmUnsaved, unsavedModal } = useUnsavedChanges();
     ...
     {unsavedModal}
   ════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

export function UnsavedChangesModal({ open, onChoice }) {
  // Lock background scroll while the modal is open (and compensate for the
  // scrollbar's width so the page doesn't shift horizontally when it hides).
  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const scrollBarComp =
      window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPadRight = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (scrollBarComp > 0) {
      body.style.paddingRight = `${scrollBarComp}px`;
    }
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadRight;
    };
  }, [open]);

  if (!open) return null;
  // Render into document.body via a portal so the modal's centering is relative
  // to the viewport, not a transformed/positioned ancestor in the page layout.
  if (typeof document === "undefined") return null;
  // Inline position styles (not just the class) so nothing in global CSS or a
  // transformed ancestor can shift or off-center the overlay. Flex-centered on
  // the real viewport via 100vw/100vh + fixed at 0,0.
  const backdropStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    boxSizing: "border-box",
    zIndex: 4000,
  };
  return createPortal(
    <div
      className="ucm-backdrop"
      style={backdropStyle}
      onMouseDown={(e) => {
        // Click outside the card = keep editing.
        if (e.target === e.currentTarget) onChoice("keep");
      }}
    >
      <div
        className="ucm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ucm-title"
      >
        <div className="ucm-head">
          <h3 className="ucm-title" id="ucm-title">
            Unsaved changes
          </h3>
          <button
            type="button"
            className="ucm-close"
            aria-label="Keep editing"
            onClick={() => onChoice("keep")}
          >
            &times;
          </button>
        </div>
        <div className="ucm-body">
          You have unsaved changes. Would you like to save them before leaving?
        </div>
        <div className="ucm-actions">
          <button
            type="button"
            className="ucm-btn ucm-btn-secondary"
            onClick={() => onChoice("discard")}
          >
            Discard
          </button>
          <button
            type="button"
            className="ucm-btn ucm-btn-primary"
            onClick={() => onChoice("save")}
          >
            Save changes
          </button>
        </div>
      </div>
      <style>{`
        .ucm-backdrop {
          position: fixed; inset: 0;
          background: rgba(23,37,49,0.55);
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
          color: #4b5563; font-size: 15px; font-weight: 500; line-height: 1.5;
        }
        .ucm-actions {
          display: flex; gap: 10px; justify-content: flex-end;
          padding: 22px 24px 22px;
          flex-wrap: wrap;
        }
        .ucm-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          font-family: inherit; font-size: 15px; font-weight: 700;
          padding: 0 24px; height: 44px; border-radius: 12px; cursor: pointer;
          border: 2px solid transparent; white-space: nowrap;
          transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
          line-height: 1;
        }
        .ucm-btn-primary { background: #fff; color: #172531; border-color: #DAD3C5; }
        .ucm-btn-primary:hover { background: #172531; color: #fff; border-color: #172531; }
        .ucm-btn-secondary { background: #fff; color: #c94040; border-color: #c94040; }
        .ucm-btn-secondary:hover { background: #c94040; color: #fff; border-color: #c94040; }
        @media (max-width: 480px) {
          .ucm-actions { flex-direction: column-reverse; }
          .ucm-btn { width: 100%; }
        }
      `}</style>
    </div>,
    document.body,
  );
}

// Hook: returns confirmUnsaved() (a promise resolving to "save"|"discard"|"keep")
// and the modal element to render.

export function useUnsavedChanges() {
  const [open, setOpen] = useState(false);
  const resolverRef = useRef(null);
  const confirmUnsaved = useCallback(() => {
    setOpen(true);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);
  const handleChoice = useCallback((choice) => {
    setOpen(false);
    if (resolverRef.current) {
      resolverRef.current(choice);
      resolverRef.current = null;
    }
  }, []);
  const unsavedModal = (
    <UnsavedChangesModal open={open} onChoice={handleChoice} />
  );
  return { confirmUnsaved, unsavedModal };
}
