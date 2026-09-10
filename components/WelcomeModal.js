"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";
import { TIERS } from "../lib/levelSystem";
import {
  Sprout,
  HeartHandshake,
  Footprints,
  Compass,
  Flame,
  Trophy,
  Mountain,
  ArrowRight,
  X,
} from "lucide-react";

const C = {
  navyDark: "#172531",
  navyMid: "#2C4657",
  terracotta: "#CF5C36",
  gold: "#EFC88B",
  cream: "#F5F0E8",
  white: "#FFFFFF",
  slate: "#4B5563",
  muted: "#717A86",
  border: "#EDE8E0",
};

// Level ladder — names, icons, and colors are the SAME 7 tiers defined in
// lib/levelSystem (TIERS), so what a new user learns here always matches their
// profile. Onboarding-friendly blurbs are layered on top of the canonical tier
// data; everything else (name, icon, gradient) comes straight from the source
// of truth and can never drift out of sync again.
const TIER_BLURBS = {
  1: "Add your first pet and complete your profile.",
  2: "Run symptom checks to track your pets' health.",
  3: "Save vets and compare real local pricing.",
  4: "Find the right care with confidence.",
  5: "Blaze the trail for other pet parents.",
  6: "Publish a Hero card to become a Champion.",
  7: "Complete a full Care card — top of the pack.",
};

const LEVELS = TIERS.map((t) => ({
  n: t.n,
  name: t.name,
  icon: t.icon,
  stops: t.stops,
  text: t.text,
  blurb: TIER_BLURBS[t.n] || t.summary,
}));

export default function WelcomeModal() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [saving, setSaving] = useState(false);

  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);
  // Guards against the close handler running twice (Escape + click, etc.)
  const dismissedRef = useRef(false);

  // Open only when the callback flagged this load with ?welcome=1.
  useEffect(() => {
    if (searchParams.get("welcome") === "1" && !dismissedRef.current) {
      setOpen(true);
    }
  }, [searchParams]);

  // Persist that the user has seen onboarding (idempotent, best-effort).
  const persistSeen = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ has_seen_welcome: true })
          .eq("id", user.id);
      }
    } catch (e) {
      // Non-fatal — worst case the modal could reappear on a future
      // ?welcome=1 load, but the callback only sets that flag while the
      // column is still false, so a successful write prevents recurrence.
      console.error("Failed to persist has_seen_welcome:", e?.message ?? e);
    }
  }, []);

  // Close the modal. If `navigateTo` is given, the user is leaving this page,
  // so we push there instead of stripping the query param (avoids a
  // replace-vs-push race that would bounce them back). Otherwise we play the
  // exit animation and remove ?welcome=1 in place.
  const finish = useCallback(
    async (navigateTo) => {
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      setSaving(true);

      await persistSeen();

      if (navigateTo) {
        // Leaving the page — close the modal first (it lives in the root
        // layout, so it would otherwise persist on top of the destination).
        setOpen(false);
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        // Strip ?welcome=1 from the CURRENT history entry synchronously, so
        // pressing back lands on a clean URL. Using the native History API
        // here (rather than router.replace) guarantees the current entry is
        // rewritten before router.push navigates away — chaining
        // router.replace + router.push races and the replace gets dropped.
        try {
          const params = new URLSearchParams(window.location.search);
          params.delete("welcome");
          const qs = params.toString();
          window.history.replaceState(
            window.history.state,
            "",
            qs ? `${pathname}?${qs}` : pathname,
          );
        } catch (e) {
          console.error("Failed to strip welcome param:", e?.message ?? e);
        }
        router.push(navigateTo);
        return;
      }

      // Play the exit animation, then unmount and clean the URL.
      setClosing(true);
      setTimeout(() => {
        setOpen(false);
        setClosing(false);
        setSaving(false);
        // Remove ?welcome=1 (and only that) without adding a history entry.
        const params = new URLSearchParams(Array.from(searchParams.entries()));
        params.delete("welcome");
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      }, 200);
    },
    [router, pathname, searchParams, persistSeen],
  );

  // Body scroll lock + Escape-to-close + focus management while open.
  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement;
    // `overflow: hidden` alone does not stop scrolling in iOS Safari. Pinning
    // the body and offsetting it by the current scroll is what works; the
    // offset is restored with scrollTo on close so the page doesn't jump.
    const scrollY = window.scrollY;
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    const prevTop = document.body.style.top;
    const prevWidth = document.body.style.width;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    // Move focus into the dialog for keyboard + screen-reader users.
    const t = setTimeout(() => {
      dialogRef.current?.focus();
    }, 0);

    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        finish();
        return;
      }
      // Minimal focus trap: keep Tab within the dialog.
      if (e.key === "Tab") {
        const focusables = dialogRef.current?.querySelectorAll(
          'button, a[href], [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables || focusables.length === 0) return;
        const list = Array.from(focusables);
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.top = prevTop;
      document.body.style.width = prevWidth;
      window.scrollTo(0, scrollY);
      // Restore focus to wherever it was before the modal opened.
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus();
      }
    };
  }, [open, finish]);

  if (!open) return null;

  function handlePrimary() {
    // Mark seen and navigate to the L1 action in one path (no replace race).
    finish("/profile");
  }

  return (
    <div
      className={`wm-backdrop${closing ? " wm-closing" : ""}`}
      onMouseDown={(e) => {
        // Dismiss on backdrop click, but not on clicks inside the card.
        if (e.target === e.currentTarget) finish();
      }}
    >
      <div
        ref={dialogRef}
        className={`wm-card${closing ? " wm-card-closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wm-title"
        aria-describedby="wm-sub"
        tabIndex={-1}
      >
        <button
          className="wm-close"
          onClick={() => finish()}
          aria-label="Close"
          disabled={saving}
        >
          <X size={18} strokeWidth={2.4} />
        </button>

        <div className="wm-head">
          <p className="wm-eyebrow">Welcome to PetParrk</p>
          <h2 id="wm-title" className="wm-title">
            Level up as you go
          </h2>
          <p id="wm-sub" className="wm-sub">
            PetParrk rewards real contribution. As you add pets, run symptom
            checks, save vets, and submit verified prices, you climb through
            seven levels — each one a signal of a trusted community member.
          </p>
        </div>

        <div className="wm-start" aria-hidden="true">
          <span className="wm-start-dot" />
          <span className="wm-start-text">
            You're at the trailhead — <strong>Level 1</strong> is your first
            climb
          </span>
        </div>

        <ol className="wm-ladder" aria-label="The seven PetParrk levels">
          {LEVELS.map((lvl, i) => {
            const Icon = lvl.icon;
            const isFirst = lvl.n === 1;
            return (
              <li
                key={lvl.n}
                className={`wm-rung${isFirst ? " wm-rung-next" : ""}`}
                style={{ animationDelay: `${0.08 * i + 0.12}s` }}
              >
                <span
                  className="wm-rung-icon"
                  aria-hidden="true"
                  style={{
                    background: `linear-gradient(160deg, ${lvl.stops[0]} 0%, ${lvl.stops[1]} 30%, ${lvl.stops[2]} 70%, ${lvl.stops[3]} 100%)`,
                  }}
                >
                  <Icon size={20} strokeWidth={2} color={lvl.text} />
                </span>
                <span className="wm-rung-body">
                  <span className="wm-rung-top">
                    <span className="wm-rung-name">
                      Level {lvl.n} · {lvl.name}
                    </span>
                    {isFirst && <span className="wm-rung-tag">Base camp</span>}
                  </span>
                  <span className="wm-rung-blurb">{lvl.blurb}</span>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="wm-actions">
          <button
            className="wm-btn wm-btn-primary"
            onClick={handlePrimary}
            disabled={saving}
          >
            Add my first pet
            <ArrowRight size={16} strokeWidth={2.4} />
          </button>
          <button
            className="wm-btn wm-btn-ghost"
            onClick={() => finish()}
            disabled={saving}
          >
            I'll explore first
          </button>
        </div>
      </div>

      <style>{`
        .wm-backdrop {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(23, 37, 49, 0.55);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          animation: wmFadeIn 0.2s ease;
          box-sizing: border-box;
        }
        .wm-backdrop.wm-closing { animation: wmFadeOut 0.2s ease forwards; }

        .wm-card {
          position: relative;
          width: 100%;
          max-width: 480px;
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          background: ${C.white};
          border-radius: 20px;
          padding: 32px 24px 28px;
          box-shadow: 0 24px 60px rgba(23, 37, 49, 0.28);
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          animation: wmCardIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          box-sizing: border-box;
        }
        .wm-card.wm-card-closing { animation: wmCardOut 0.2s ease forwards; }

        .wm-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 9px;
          background: ${C.cream};
          color: ${C.muted};
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .wm-close:hover { background: ${C.border}; color: ${C.navyDark}; }
        .wm-close:disabled { opacity: 0.5; cursor: default; }

        .wm-head { margin-bottom: 22px; padding-right: 24px; }
        .wm-eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: ${C.terracotta};
          margin: 0 0 10px;
        }
        .wm-title {
          font-size: clamp(24px, 4vw, 30px);
          font-weight: 800;
          letter-spacing: -0.025em;
          color: ${C.navyDark};
          margin: 0 0 10px;
          line-height: 1.1;
        }
        .wm-sub {
          font-size: 16px;
          font-weight: 500;
          color: ${C.slate};
          line-height: 1.6;
          margin: 0;
          text-wrap: pretty;
        }

        .wm-start {
          display: flex;
          align-items: center;
          gap: 9px;
          margin: 0 0 12px;
          padding: 0 2px;
        }
        .wm-start-dot {
          flex: 0 0 auto;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: ${C.terracotta};
          box-shadow: 0 0 0 4px rgba(207, 92, 54, 0.15);
        }
        .wm-start-text {
          font-size: 16px;
          font-weight: 600;
          color: ${C.muted};
        }
        .wm-start-text strong { color: ${C.navyDark}; font-weight: 800; }

        .wm-ladder {
          list-style: none;
          margin: 0 0 24px;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .wm-rung {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          padding: 12px 14px;
          border-radius: 12px;
          background: ${C.cream};
          border: 1.5px solid transparent;
          opacity: 0;
          animation: wmRungIn 0.4s ease forwards;
        }
        .wm-rung-next {
          background: ${C.white};
          border-color: ${C.terracotta};
          box-shadow: 0 4px 14px rgba(207, 92, 54, 0.12);
        }
        .wm-rung-icon {
          flex: 0 0 auto;
          width: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
        }
        .wm-rung-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .wm-rung-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .wm-rung-name {
          font-size: 16px;
          font-weight: 700;
          color: ${C.navyDark};
        }
        .wm-rung-tag {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: ${C.terracotta};
          background: rgba(207, 92, 54, 0.1);
          padding: 2px 8px;
          border-radius: 999px;
        }
        .wm-rung-blurb {
          font-size: 15px;
          font-weight: 500;
          color: ${C.muted};
          line-height: 1.45;
        }

        .wm-actions { display: flex; flex-direction: column; gap: 10px; }
        .wm-btn {
          height: 48px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.2s, color 0.2s, border-color 0.2s;
        }
        .wm-btn:disabled { opacity: 0.6; cursor: default; }
        .wm-btn-primary {
          border: 2px solid ${C.terracotta};
          background: ${C.terracotta};
          color: ${C.white};
        }
        .wm-btn-primary:hover:not(:disabled) {
          background: ${C.white};
          color: ${C.terracotta};
          border: 2px solid ${C.terracotta};
          }
        .wm-btn-ghost {
          background: transparent;
          color: ${C.navyDark};
          border: 2px solid ${C.navyDark};
        }
        .wm-btn-ghost:hover:not(:disabled) { 
          background: ${C.navyDark};
          color: ${C.white};
          border: 2px solid ${C.navyDark};
        }

        @keyframes wmFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes wmFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes wmCardIn {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes wmCardOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(8px) scale(0.99); }
        }
        @keyframes wmRungIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @media (max-width: 520px) {
          .wm-backdrop { padding: 16px; align-items: center; }
          .wm-card {
            max-width: 100%;
            width: 100%;
            /* Centered card with margins on all sides. dvh keeps it within the
               visible viewport (accounts for mobile browser chrome). */
            max-height: calc(100dvh - 32px);
            border-radius: 20px;
            padding: 24px 16px calc(20px + env(safe-area-inset-bottom, 0px));
            animation: wmCardIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .wm-card.wm-card-closing { animation: wmCardOut 0.2s ease forwards; }
          .wm-head { padding-right: 16px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .wm-backdrop, .wm-backdrop.wm-closing,
          .wm-card, .wm-card.wm-card-closing, .wm-rung {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
