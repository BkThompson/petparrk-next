"use client";

// ============================================================================
// HeroFlipCardLive — interactive flip card for the shared web link.
// Renders the SAME front/back faces as the download (from HeroFlipCard.js's
// builders) inside a CSS 3D flip container. Tap the card (or the corner flip
// badge) to flip. A dark-scrim circular badge with a white flip icon sits in
// the top-right of each face — readable on ANY background, fills with the
// accent colour on hover, and pulses briefly on load to invite the flip.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import {
  buildFront,
  buildBack,
  deriveTheme,
  equalizeHeights,
} from "./HeroFlipCard";

export default function HeroFlipCardLive({ pet }) {
  const frontWrapRef = useRef(null);
  const backWrapRef = useRef(null);
  const [flipped, setFlipped] = useState(false);
  const [height, setHeight] = useState(null);
  const [accent, setAccent] = useState("#6B3FCB");
  const [peeking, setPeeking] = useState(false);
  const peekedRef = useRef(false);

  useEffect(() => {
    if (!pet || !frontWrapRef.current || !backWrapRef.current) return;
    const pub = pet.hero_published || null;
    const data = pub ? { ...pet, ...pub } : pet;
    const theme = deriveTheme(data);
    setAccent(theme.accent);

    const front = buildFront(pet, data, theme);
    const back = buildBack(pet, data, theme);
    front.style.width = "100%";
    back.style.width = "100%";

    // These mount divs are React-empty (React owns the badge sibling, not
    // these), so manual DOM here won't conflict with React's reconciliation.
    const frontMount = frontWrapRef.current;
    const backMount = backWrapRef.current;
    while (frontMount.firstChild) frontMount.removeChild(frontMount.firstChild);
    while (backMount.firstChild) backMount.removeChild(backMount.firstChild);
    frontMount.appendChild(front);
    backMount.appendChild(back);

    const equalize = () => {
      const h = Math.max(front.offsetHeight, back.offsetHeight);
      if (h > 0) {
        front.style.height = h + "px";
        back.style.height = h + "px";
        setHeight(h);
        // One-time auto-peek once the card has real dimensions.
        if (!peekedRef.current) {
          peekedRef.current = true;
          setTimeout(() => setPeeking(true), 500);
          setTimeout(() => setPeeking(false), 500 + 1300);
        }
      }
    };
    const img = front.querySelector("img");
    if (img && !img.complete) {
      img.addEventListener("load", equalize);
      img.addEventListener("error", equalize);
    }
    const t = setTimeout(equalize, 200);
    window.addEventListener("resize", equalize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", equalize);
      // Remove our manually-inserted nodes (guard: only if still attached).
      if (front.parentNode === frontMount) frontMount.removeChild(front);
      if (back.parentNode === backMount) backMount.removeChild(back);
    };
  }, [pet]);

  const flip = (e) => {
    if (e) e.stopPropagation();
    setFlipped((f) => !f);
  };

  // Flip icon (lucide RefreshCw-style rotate arrows), white.
  const FlipIcon = () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );

  return (
    <div className="hfc-root" style={{ "--hfc-accent": accent }}>
      <div className="hfc-perspective">
        <div
          className={`hfc-flip${flipped ? " is-flipped" : ""}${
            peeking && !flipped ? " hfc-peeking" : ""
          }`}
          style={height ? { height } : undefined}
          /* Clicking the card is a mouse convenience only. It deliberately
             carries no role, tabIndex or aria-label: each face already holds a
             real <button>, and a button nested inside role="button" is invalid
             ARIA — it announces a button within a button and gives keyboard
             users two controls that do the same thing. The badge is the
             accessible control; this is just a large hit area for pointers. */
          onClick={flip}
        >
          <div className="hfc-face hfc-front">
            <div className="hfc-mount" ref={frontWrapRef} />
            <button
              type="button"
              className="hfc-flip-badge"
              onClick={flip}
              aria-label="Flip card"
            >
              <FlipIcon />
            </button>
          </div>
          <div className="hfc-face hfc-back">
            <div className="hfc-mount" ref={backWrapRef} />
            <button
              type="button"
              className="hfc-flip-badge"
              onClick={flip}
              aria-label="Flip card back"
            >
              <FlipIcon />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .hfc-root {
          width: 380px;
          max-width: 100%;
          margin: 0 auto;
        }
        .hfc-perspective {
          perspective: 1600px;
          width: 100%;
        }
        .hfc-flip {
          width: 100%;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .hfc-flip.is-flipped { transform: rotateY(180deg); }
        /* Auto-peek: a subtle one-time 3D tilt, triggered by state so it runs
           exactly once and can't re-fire on hover/repaint. */
        .hfc-peeking {
          animation: hfcPeek 1.3s ease-in-out 1;
        }
        @keyframes hfcPeek {
          0%   { transform: rotateY(0deg); }
          35%  { transform: rotateY(-18deg); }
          60%  { transform: rotateY(-9deg); }
          100% { transform: rotateY(0deg); }
        }
        .hfc-face {
          width: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          position: relative;
        }
        .hfc-mount { width: 100%; display: block; }
        .hfc-back {
          position: absolute;
          inset: 0;
          transform: rotateY(180deg);
        }
        /* Corner flip badge — dark scrim + white icon (reads on any bg),
           accent fill on hover. Sits above the card content. */
        .hfc-flip-badge {
          /* 38px before. Grown to the touch minimum; top/right pulled in by
             the same 3px each side so the badge stays visually where it was
             rather than creeping toward the artwork. */
          position: absolute;
          top: 11px;
          right: 11px;
          z-index: 5;
          width: 44px;
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1.5px solid rgba(255,255,255,0.55);
          background: rgba(0,0,0,0.38);
          color: #fff;
          cursor: pointer;
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
          box-shadow: 0 2px 10px rgba(0,0,0,0.35);
          transition: background 0.18s ease, transform 0.18s ease,
            border-color 0.18s ease;
        }
        .hfc-flip-badge:hover {
          background: var(--hfc-accent, #6B3FCB);
          border-color: var(--hfc-accent, #6B3FCB);
          transform: rotate(-30deg);
        }
        .hfc-flip-badge:active { transform: rotate(-180deg) scale(0.92); }
        @media (prefers-reduced-motion: reduce) {
          .hfc-peeking { animation: none; }
          .hfc-flip { transition: none; }
        }
      `}</style>
    </div>
  );
}
