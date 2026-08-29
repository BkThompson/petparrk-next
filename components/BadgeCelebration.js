"use client";

/* ════════════════════════════════════════════════════════════════════════
   BadgeCelebration — the one-shot level-up / tier-crossing burst that
   anchors on the profile level badge.

   Shared by:
     • app/profile/page.js            (ProfileMain — always the owner)
     • app/profile/[username]/page.js (ProfileUsername — owner-gated)

   The host is responsible for:
     1. computing the `celebrate` payload (level, tierCrossed, tierName, tierN)
        and ONLY setting it for the profile owner, and
     2. rendering <BadgeCelebrationStyles /> once, and
     3. placing <BadgeCelebration/> inside a position:relative wrapper that
        also contains the badge (see .pp-level-outer).

   Pure CSS keyframes — no animation library, so it cannot fail silently the
   way a lazy import inside a try/catch can.
   ════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { Sparkles, Trophy, ChevronUp } from "lucide-react";

// Escalation. Each tier introduces something the tier below it does NOT
// have — escalation reads as new elements appearing, not existing ones
// growing 9%. Only TIER CROSSINGS escalate; a plain level-up always uses
// CELEB_LEVELUP so ordinary levels stay ordinary.
//
//   1 Newcomer     baseline burst
//   2 Companion    + glow dots
//   3 Tracker      + gravity arc (particles fall)
//   4 Pathfinder   + staggered waves (not one ring)
//   5 Trailblazer  + shockwave ring
//   6 Champion     + second delayed ring, + badge pulse
//   7 Pack Leader  + SECOND FULL BURST, lingering glow, gold-only palette,
//                    shimmer sweep. The apex stands alone.
const CELEB_TIERS = {
  1: {
    count: 12,
    min: 90,
    span: 50,
    dur: 1.2,
    sizes: [9, 12],
    dots: false,
    arc: false,
    waves: 1,
    rings: 0,
    pulse: false,
    reburst: false,
    afterglow: false,
    goldOnly: false,
    sweep: false,
  },
  2: {
    count: 14,
    min: 100,
    span: 55,
    dur: 1.3,
    sizes: [10, 13],
    dots: true,
    arc: false,
    waves: 1,
    rings: 0,
    pulse: false,
    reburst: false,
    afterglow: false,
    goldOnly: false,
    sweep: false,
  },
  3: {
    count: 16,
    min: 110,
    span: 60,
    dur: 1.4,
    sizes: [10, 14],
    dots: true,
    arc: true,
    waves: 1,
    rings: 0,
    pulse: false,
    reburst: false,
    afterglow: false,
    goldOnly: false,
    sweep: false,
  },
  4: {
    count: 18,
    min: 120,
    span: 65,
    dur: 1.5,
    sizes: [11, 15],
    dots: true,
    arc: true,
    waves: 3,
    rings: 0,
    pulse: false,
    reburst: false,
    afterglow: false,
    goldOnly: false,
    sweep: false,
  },
  5: {
    count: 20,
    min: 130,
    span: 70,
    dur: 1.65,
    sizes: [12, 16],
    dots: true,
    arc: true,
    waves: 3,
    rings: 1,
    pulse: false,
    reburst: false,
    afterglow: false,
    goldOnly: false,
    sweep: false,
  },
  6: {
    count: 22,
    min: 142,
    span: 78,
    dur: 1.85,
    sizes: [12, 17],
    dots: true,
    arc: true,
    waves: 3,
    rings: 2,
    pulse: true,
    reburst: false,
    afterglow: false,
    goldOnly: false,
    sweep: false,
  },
  7: {
    count: 26,
    min: 155,
    span: 90,
    dur: 2.15,
    sizes: [13, 20],
    dots: true,
    arc: true,
    waves: 3,
    rings: 2,
    pulse: true,
    reburst: true,
    afterglow: true,
    goldOnly: true,
    sweep: true,
  },
};
const CELEB_LEVELUP = {
  count: 12,
  min: 90,
  span: 50,
  dur: 1.2,
  sizes: [9, 12],
  dots: false,
  arc: false,
  waves: 1,
  rings: 0,
  pulse: false,
  reburst: false,
  afterglow: false,
  goldOnly: false,
  sweep: false,
};

const GOLD_PALETTE = ["#FFE08A", "#EFC88B", "#FFF3D0", "#E8B53A"];

export function BadgeCelebration({ celebrate, tierDef, onDone }) {
  const playedRef = useRef(null);
  const [visible, setVisible] = useState(false);

  const crossed = !!celebrate?.tierCrossed;
  const cfg = crossed
    ? CELEB_TIERS[celebrate?.tierN] || CELEB_TIERS[1]
    : CELEB_LEVELUP;

  useEffect(() => {
    if (!celebrate) return;
    const key = `${celebrate.level}-${celebrate.tierCrossed}`;
    if (playedRef.current === key) return;
    playedRef.current = key;

    setVisible(true);
    // Pack Leader's second burst + afterglow need real room to land.
    const holdMs = crossed
      ? cfg.reburst
        ? 5600
        : 3400 + (celebrate.tierN || 1) * 240
      : 3200;
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, holdMs);
    return () => clearTimeout(t);
  }, [celebrate, onDone, crossed, cfg.reburst]);

  if (!celebrate || !visible) return null;

  const Icon = crossed ? Trophy : ChevronUp;

  const stops = tierDef?.stops || ["#FFE08A", "#E8B53A", "#B57E1A", "#6E4A0A"];
  const inkColor = stops[2];
  const iconPillBg = stops[1];

  // Build one wave of particles. `wave` shifts angle + delay so successive
  // waves don't overlay the first.
  const buildWave = (wave, waveDelay) =>
    Array.from({ length: cfg.count }, (_, i) => {
      const angle =
        (360 / cfg.count) * i + ((i * 17) % 13) - 6 + wave * (180 / cfg.count);
      const dist = cfg.min + ((i * 43) % cfg.span) - wave * 6;
      const delay =
        waveDelay +
        (cfg.waves > 1 ? ((i * 11) % 7) * 0.03 : ((i * 11) % 7) * 0.04);
      const spin = i % 2 ? 240 : -200;
      const size = i % 5 === 0 ? cfg.sizes[1] : cfg.sizes[0];
      const isDot = cfg.dots && i % 6 === 4;
      const drop = cfg.arc ? 18 + (celebrate.tierN || 1) * 4 : 0;
      // Gold-only palette at the apex; otherwise gold + terracotta.
      const stroke = cfg.goldOnly
        ? GOLD_PALETTE[i % GOLD_PALETTE.length]
        : i % 3 === 0
          ? "#CF5C36"
          : "#EFC88B";
      const fill = cfg.goldOnly
        ? i % 3 === 0
          ? "#FFE08A"
          : "none"
        : i % 4 === 0
          ? "#EFC88B"
          : "none";
      return {
        angle,
        dist,
        delay,
        spin,
        size,
        isDot,
        drop,
        stroke,
        fill,
        key: `${wave}-${i}`,
      };
    });

  // Wave delays: a single wave at low tiers; three staggered at 4+.
  const waveOffsets = cfg.waves === 1 ? [0] : [0, 0.12, 0.24];
  let particles = waveOffsets.flatMap((off, w) => buildWave(w, off));
  // Pack Leader only: a second FULL burst, well after the first has flown.
  if (cfg.reburst) {
    particles = particles.concat(
      waveOffsets.flatMap((off, w) => buildWave(w + 3, 1.05 + off)),
    );
  }

  const cls = [
    "pp-celeb",
    cfg.sweep && "has-sweep",
    cfg.pulse && "has-pulse",
    cfg.afterglow && "has-afterglow",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cls}
      style={{ "--celeb-dur": `${cfg.dur}s` }}
      aria-hidden="true"
    >
      {cfg.rings >= 1 && (
        <span
          className="pp-celeb-ring"
          style={{ borderColor: stops[0], "--ring-max": `${cfg.min * 2.1}px` }}
        />
      )}
      {cfg.rings >= 2 && (
        <span
          className="pp-celeb-ring ring-2"
          style={{ borderColor: stops[1], "--ring-max": `${cfg.min * 2.8}px` }}
        />
      )}
      {cfg.afterglow && <span className="pp-celeb-afterglow" />}

      <div className="pp-celeb-particles">
        {particles.map((pt) => (
          <span
            key={pt.key}
            className={`pp-celeb-particle${pt.isDot ? " is-dot" : ""}`}
            style={{
              "--ang": `${pt.angle}deg`,
              "--dist": `${pt.dist}px`,
              "--delay": `${pt.delay}s`,
              "--spin": `${pt.spin}deg`,
              "--drop": `${pt.drop}px`,
            }}
          >
            {pt.isDot ? (
              <span
                className="pp-celeb-dot"
                style={{
                  width: pt.size - 5,
                  height: pt.size - 5,
                  background: cfg.goldOnly ? "#FFE08A" : pt.stroke,
                }}
              />
            ) : (
              <Sparkles
                size={pt.size}
                strokeWidth={2.1}
                color={pt.stroke}
                fill={pt.fill}
              />
            )}
          </span>
        ))}
      </div>

      <div className="pp-celeb-banner-outer">
        <div className="pp-celeb-banner" style={{ color: inkColor }}>
          <span className="pp-celeb-icon" style={{ background: iconPillBg }}>
            <Icon size={13} strokeWidth={3} color="#FFFFFF" />
          </span>
          <span className="pp-celeb-text">
            {crossed
              ? `Welcome to ${celebrate.tierName || "a new tier"}`
              : `Level ${celebrate.level} reached`}
          </span>
        </div>
        <span className="pp-celeb-pointer" aria-hidden="true" />
      </div>
    </div>
  );
}

export function BadgeCelebrationStyles() {
  return (
    <style>{`
      /* ── Badge celebration (pure CSS, no animation library) ──────
         Scales by tier via --celeb-dur / --dist / --drop, plus optional
         shockwave ring (tiers 5-6) and gold shimmer sweep (tier 7).
         Particles burst from a point above the badge so they envelop both
         the badge and the banner. */
      .pp-celeb {
        position: absolute;
        inset: 0;
        pointer-events: none;
        overflow: visible;
        --celeb-dur: 1.6s;
      }
      .pp-celeb-particles {
        position: absolute;
        inset: 0;
        z-index: 0;
      }
      .pp-celeb-particle {
        position: absolute;
        top: -18px;
        left: 50%;
        margin: -8px 0 0 -8px;
        opacity: 0;
        --drop: 0px;
        filter: drop-shadow(0 0 6px rgba(239, 200, 139, 0.75));
        transform: rotate(var(--ang)) translateX(0) rotate(calc(-1 * var(--ang)));
        animation: ppCelebFly var(--celeb-dur) cubic-bezier(0.16, 0.66, 0.24, 1)
          var(--delay) forwards;
        will-change: transform, opacity;
      }
      .pp-celeb-dot {
        display: block;
        border-radius: 50%;
        box-shadow: 0 0 10px 2px rgba(239, 200, 139, 0.9);
      }
      @keyframes ppCelebFly {
        0% {
          opacity: 0;
          transform: rotate(var(--ang)) translateX(0)
            rotate(calc(-1 * var(--ang))) scale(0.12);
        }
        7%  { opacity: 1; }
        50% {
          opacity: 1;
          transform: rotate(var(--ang)) translateX(calc(var(--dist) * 0.7))
            rotate(calc(var(--spin) * 0.5 - var(--ang))) scale(1.12);
        }
        86% { opacity: 0.92; }
        100% {
          opacity: 0;
          /* --drop pulls the landing point down: a gravity arc on high tiers */
          transform: rotate(var(--ang)) translateX(var(--dist))
            rotate(calc(var(--spin) - var(--ang)))
            translateY(var(--drop)) scale(0.82);
        }
      }

      /* Shockwave ring — tiers 5+ */
      .pp-celeb-ring {
        position: absolute;
        top: -18px;
        left: 50%;
        width: 10px;
        height: 10px;
        margin: -5px 0 0 -5px;
        border-radius: 50%;
        border: 2px solid;
        opacity: 0;
        z-index: 0;
        --ring-max: 260px;
        animation: ppCelebRing 1.1s cubic-bezier(0.12, 0.72, 0.2, 1) 0.04s forwards;
        will-change: transform, opacity;
      }
      @keyframes ppCelebRing {
        0%   { opacity: 0.85; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-width: 3px; }
        70%  { opacity: 0.28; }
        100% {
          opacity: 0;
          width: var(--ring-max);
          height: var(--ring-max);
          margin: calc(var(--ring-max) / -2) 0 0 calc(var(--ring-max) / -2);
          border-width: 1px;
        }
      }

      /* Second, delayed ring — tier 6+ (Champion's distinguishing mark). */
      .pp-celeb-ring.ring-2 {
        animation-delay: 0.28s;
        animation-duration: 1.35s;
        opacity: 0;
      }

      /* Badge pulse — tier 6+. The badge itself answers the burst. */
      .pp-celeb.has-pulse::before {
        content: "";
        position: absolute;
        inset: -3px;
        border-radius: 26px;
        z-index: 1;
        pointer-events: none;
        box-shadow: 0 0 0 0 rgba(239, 200, 139, 0.85);
        animation: ppCelebPulse 1.5s cubic-bezier(0.2, 0.7, 0.3, 1) 0.1s 2;
      }
      @keyframes ppCelebPulse {
        0%   { box-shadow: 0 0 0 0 rgba(239, 200, 139, 0.8); }
        70%  { box-shadow: 0 0 0 22px rgba(239, 200, 139, 0); }
        100% { box-shadow: 0 0 0 0 rgba(239, 200, 139, 0); }
      }

      /* Lingering afterglow — Pack Leader ONLY. Persists after the
         particles clear, so the apex doesn't just vanish. */
      .pp-celeb-afterglow {
        position: absolute;
        inset: -14px;
        z-index: 0;
        border-radius: 34px;
        pointer-events: none;
        background: radial-gradient(
          ellipse at center,
          rgba(255, 224, 138, 0.55) 0%,
          rgba(239, 200, 139, 0.28) 42%,
          rgba(239, 200, 139, 0) 72%
        );
        opacity: 0;
        animation: ppCelebAfterglow 5.4s ease-out 0.2s forwards;
      }
      @keyframes ppCelebAfterglow {
        0%   { opacity: 0; transform: scale(0.7); }
        10%  { opacity: 1; transform: scale(1.04); }
        22%  { opacity: 0.85; transform: scale(1); }
        70%  { opacity: 0.7; }
        100% { opacity: 0; transform: scale(1.02); }
      }

      /* Gold shimmer sweep across the badge — tier 7 only */
      .pp-celeb.has-sweep::after {
        content: "";
        position: absolute;
        left: -6%;
        right: -6%;
        top: 0;
        bottom: 0;
        z-index: 4;
        border-radius: 24px;
        pointer-events: none;
        background: linear-gradient(
          105deg,
          transparent 34%,
          rgba(255, 255, 255, 0.72) 47%,
          rgba(255, 240, 200, 0.9) 51%,
          transparent 64%
        );
        transform: translateX(-115%);
        animation: ppCelebSweep 1.6s cubic-bezier(0.3, 0.1, 0.2, 1) 0.35s 3;
      }
      @keyframes ppCelebSweep {
        0%   { transform: translateX(-115%); opacity: 0; }
        12%  { opacity: 1; }
        88%  { opacity: 1; }
        100% { transform: translateX(115%); opacity: 0; }
      }

      /* Banner — gold frame keeps it in the badge's family, but the fill is
         inverted (cream ground, tier-colored ink). */
      .pp-celeb-banner-outer {
        position: absolute;
        left: 50%;
        top: -18px;
        z-index: 3;
        transform: translate(-50%, -100%);
        border-radius: 999px;
        padding: 1.5px;
        background: linear-gradient(135deg,
          #FFE8B8 0%,
          #EFC88B 18%,
          #FFFFFF 32%,
          #EFC88B 50%,
          #FFFFFF 68%,
          #EFC88B 82%,
          #FFE8B8 100%);
        filter: drop-shadow(0 0 12px rgba(239, 200, 139, 0.6))
          drop-shadow(0 6px 18px rgba(0, 0, 0, 0.30));
        opacity: 0;
        animation: ppCelebBanner 3.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        will-change: transform, opacity;
        line-height: 1;
      }
      .pp-celeb-banner {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
        padding: 8px 15px 8px 8px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-family: var(--font-urbanist,'Urbanist',sans-serif);
        background: linear-gradient(170deg, #FFFDF7 0%, #FDF3DF 55%, #F7E6C4 100%);
      }
      .pp-celeb-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .pp-celeb-text { line-height: 1; }
      .pp-celeb-pointer {
        position: absolute;
        left: 50%;
        bottom: -6px;
        width: 12px;
        height: 12px;
        transform: translateX(-50%) rotate(45deg);
        background: linear-gradient(135deg, #F7E6C4 0%, #EFC88B 100%);
        border-radius: 2px;
        box-shadow: 2px 2px 0 0 #EFC88B;
      }
      @keyframes ppCelebBanner {
        0%   { opacity: 0; transform: translate(-50%, -58%) scale(0.42); }
        10%  { opacity: 1; transform: translate(-50%, -114%) scale(1.09); }
        17%  { transform: translate(-50%, -96%) scale(0.97); }
        24%  { transform: translate(-50%, -100%) scale(1); }
        84%  { opacity: 1; transform: translate(-50%, -100%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -124%) scale(0.95); }
      }
      @media (max-width: 767px) {
        .pp-celeb-banner { font-size: 12px; padding: 7px 13px 7px 7px; }
        .pp-celeb-icon { width: 21px; height: 21px; }
      }
      @media (prefers-reduced-motion: reduce) {
        .pp-celeb-particle,
        .pp-celeb-ring,
        .pp-celeb-afterglow { display: none; }
        .pp-celeb.has-sweep::after,
        .pp-celeb.has-pulse::before { animation: none; opacity: 0; }
        .pp-celeb-banner-outer { animation: none; opacity: 1; }
      }
    `}</style>
  );
}
