"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { Check, X } from "lucide-react";

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

/* ══════════════════════════════════════════════════════════════════════════
   One save confirmation for the whole site.

   This used to be a solid green bar at the bottom centre, while the pet-card
   editors (care-edit, share, hero-edit) each had their own white pill at the
   bottom right. Two different answers to the same question, so a save on the
   profile looked nothing like a save two clicks away.

   The white pill won: it is quieter, it carries a pending state the green bar
   never had, and it sits out of the way of centred content and CTAs. The
   measurements here are lifted from .he-save-toast so the shared component and
   the editors that still have their own copy are indistinguishable.

   showToast(message)            → success
   showToast(message, "error")   → error
   showToast(message, "saving")  → pending, no icon
   ══════════════════════════════════════════════════════════════════════════ */
export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}

      <div className="np-toast-wrap">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`np-toast ${toast.type}`}
            role={toast.type === "error" ? "alert" : "status"}
          >
            {toast.type === "success" && <Check size={16} strokeWidth={2.6} />}
            {toast.type === "error" && <X size={16} strokeWidth={2.6} />}
            {toast.message}
          </div>
        ))}
      </div>

      <style>{`
        .np-toast-wrap {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          pointer-events: none;
        }
        .np-toast {
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
          animation: np-toast-in 0.18s ease-out;
        }
        .np-toast.success { color: var(--color-success-text); }
        .np-toast.error { color: var(--color-error); }
        @keyframes np-toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .np-toast { animation: none; }
        }
        @media (max-width: 640px) {
          .np-toast-wrap { right: 16px; bottom: 16px; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
