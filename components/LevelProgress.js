"use client";

// =============================================================
// components/LevelProgress.js — the CURRENT-LEVEL expanded panel.
//
// Features:
//   • XP bar fills toward the next level's total XP. Animation is
//     SCROLL-TRIGGERED via IntersectionObserver, so it plays when the
//     bar scrolls into view (not just on mount).
//   • Lucide icons (ArrowRight for the target, Check inside the
//     requirement circles).
//   • "Ways to earn XP" checklist: every row has a check-circle,
//     progress (18/20 or 1/1), and points (+N).
//   • GSAP celebration: when the host passes a `celebrate` payload
//     (a level-up happened), a burst of Lucide sparkles/trophies
//     animates; crossing a TIER reveals the new tier name.
//
// Props:
//   state      — from computeLevelState / ...FromSignals
//   animate    — enable the scroll-triggered bar fill (default true)
//   celebrate  — { level, tierCrossed, tierName } one-shot trigger
// =============================================================

import { useState, useEffect, useRef } from "react";
import { ArrowRight, Check, Sparkles, Trophy } from "lucide-react";
import { tierGradient } from "../lib/levelSystem";

export default function LevelProgress({
  state,
  animate = true,
  celebrate = null,
}) {
  const p = state?.progress;
  const reqs = state?.requirements || [];
  const targetPct = p?.pct ?? 0;

  const [fillPct, setFillPct] = useState(animate ? 0 : targetPct);
  const barRef = useRef(null);
  const playedRef = useRef(false);

  // Scroll-triggered fill: play once when the bar enters the viewport.
  useEffect(() => {
    if (!animate) {
      setFillPct(targetPct);
      return;
    }
    const el = barRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      const t = setTimeout(() => setFillPct(targetPct), 220);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !playedRef.current) {
            playedRef.current = true;
            setFillPct(0);
            requestAnimationFrame(() =>
              setTimeout(() => setFillPct(targetPct), 120),
            );
          }
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [animate, targetPct]);

  // Re-glide if the target changes after first play (e.g. data refresh).
  useEffect(() => {
    if (playedRef.current) setFillPct(targetPct);
  }, [targetPct]);

  // ── GSAP celebration ──────────────────────────────────────────────
  const celebRef = useRef(null);
  const lastCelebRef = useRef(null);
  useEffect(() => {
    if (!celebrate || !celebRef.current) return;
    const key = `${celebrate.level}-${celebrate.tierCrossed}`;
    if (lastCelebRef.current === key) return;
    lastCelebRef.current = key;

    let ctx;
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("gsap");
        if (cancelled) return;
        const gsap = mod.gsap || mod.default || mod;
        const root = celebRef.current;
        if (!root) return;
        const particles = root.querySelectorAll(".lvp-particle");
        const badge = root.querySelector(".lvp-celeb-badge");

        ctx = gsap.context(() => {
          gsap.set(root, { autoAlpha: 1 });
          particles.forEach((el, i) => {
            const angle = (Math.PI * 2 * i) / particles.length + Math.random();
            const dist = 60 + Math.random() * 60;
            gsap.set(el, { x: 0, y: 0, scale: 0, opacity: 1, rotation: 0 });
            gsap.to(el, {
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              scale: 0.7 + Math.random() * 0.8,
              rotation: (Math.random() - 0.5) * 220,
              duration: 0.9 + Math.random() * 0.4,
              ease: "power3.out",
            });
            gsap.to(el, {
              opacity: 0,
              duration: 0.5,
              delay: 0.7 + Math.random() * 0.3,
              ease: "power1.in",
            });
          });
          if (badge) {
            gsap.fromTo(
              badge,
              { scale: 0.3, opacity: 0, y: 10 },
              {
                scale: 1,
                opacity: 1,
                y: 0,
                duration: 0.6,
                ease: "back.out(1.8)",
              },
            );
            gsap.to(badge, {
              opacity: 0,
              scale: 0.9,
              duration: 0.5,
              delay: celebrate.tierCrossed ? 2.4 : 1.6,
              ease: "power1.in",
            });
          }
          gsap.to(root, {
            autoAlpha: 0,
            duration: 0.4,
            delay: celebrate.tierCrossed ? 3.0 : 2.2,
          });
        }, root);
      } catch (e) {
        // GSAP missing/failed — silently skip.
      }
    })();

    return () => {
      cancelled = true;
      if (ctx) ctx.revert();
    };
  }, [celebrate]);

  if (!state || !p) return null;

  const grad = tierGradient(state.tierN || 1);
  const target = p.targetName; // "Level 8" | "Pathfinder" | null (maxed)
  const doneCount = reqs.filter((r) => r.met).length;
  const tierCrossed = celebrate?.tierCrossed;
  const CelebIcon = tierCrossed ? Trophy : Sparkles;
  const PARTICLES = tierCrossed ? 16 : 10;

  return (
    <div className="lvp">
      <style>{`
        .lvp { font-family: var(--font-urbanist,'Urbanist',sans-serif); position: relative; }
        .lvp-xprow {
          display: flex; justify-content: space-between; align-items: center;
          gap: 8px; margin-bottom: 7px;
        }
        .lvp-xp { font-size: 14px; font-weight: 800; color: #172531; white-space: nowrap; }
        .lvp-target {
          font-size: 14px; font-weight: 800; color: #CF5C36; white-space: nowrap;
          display: inline-flex; align-items: center; gap: 3px;
        }
        .lvp-track {
          height: 9px; border-radius: 999px; background: #EDE8E0;
          overflow: hidden; margin-bottom: 5px;
        }
        .lvp-fill {
          height: 100%; border-radius: 999px;
          transition: width 1.15s cubic-bezier(0.22,1,0.36,1);
        }
        .lvp-left { font-size: 13px; font-weight: 600; color: #94A0AB; margin-bottom: 16px; }
        .lvp-reqs-head {
          display: flex; justify-content: space-between; align-items: center;
          gap: 8px; margin-bottom: 6px;
        }
        .lvp-reqs-title {
          font-size: 13px; font-weight: 800; letter-spacing: 0.05em;
          text-transform: uppercase; color: #CF5C36;
        }
        .lvp-reqs-count { font-size: 13px; font-weight: 500; color: #717A86; white-space: nowrap; }
        .lvp-req { display: flex; align-items: center; gap: 10px; padding: 4px 0; }
        .lvp-circle {
          width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
          display: inline-flex; align-items: center; justify-content: center;
          box-sizing: border-box;
        }
        .lvp-circle.met { background: #16A34A; }
        .lvp-circle.unmet { border: 2px solid #CBD2DA; background: #fff; }
        .lvp-req-label { font-size: 14px; min-width: 0; }
        .lvp-req-label.met { color: #172531; font-weight: 600; }
        .lvp-req-label.unmet { color: #4B5563; font-weight: 500; }
        .lvp-req-right {
          margin-left: auto; display: flex; align-items: center; gap: 8px;
          flex-shrink: 0; padding-left: 8px;
        }
        .lvp-req-prog { font-size: 13px; font-weight: 800; white-space: nowrap; }
        .lvp-req-prog.met { color: #16A34A; }
        .lvp-req-prog.unmet { color: #717A86; }
        .lvp-req-pts {
          font-size: 12px; font-weight: 800; padding: 2px 8px;
          border-radius: 999px; white-space: nowrap;
        }
        .lvp-req-pts.met { color: #16A34A; background: rgba(22,163,74,0.10); }
        .lvp-req-pts.unmet { color: #CF5C36; background: rgba(207,92,54,0.10); }
        .lvp-maxed { font-size: 14px; font-weight: 700; color: #4B5563; margin: 4px 0 0; }

        .lvp-celeb {
          position: absolute; inset: -20px 0 auto 0; top: -10px; height: 120px;
          pointer-events: none; z-index: 5; visibility: hidden; opacity: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .lvp-particle { position: absolute; top: 40px; left: 50%; color: var(--gold, #EFC88B); }
        .lvp-celeb-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: #172531; color: #fff; font-weight: 800; font-size: 14px;
          padding: 10px 16px; border-radius: 999px; opacity: 0;
          box-shadow: 0 10px 30px rgba(23,37,49,0.35);
        }
      `}</style>

      <div className="lvp-celeb" ref={celebRef} aria-hidden="true">
        {Array.from({ length: PARTICLES }).map((_, i) => (
          <span className="lvp-particle" key={i}>
            <CelebIcon
              size={tierCrossed ? 18 : 14}
              strokeWidth={2.4}
              color={i % 2 ? "#CF5C36" : "#EFC88B"}
              fill={i % 3 === 0 ? "#EFC88B" : "none"}
            />
          </span>
        ))}
        {celebrate && (
          <div className="lvp-celeb-badge">
            <CelebIcon size={18} strokeWidth={2.4} color="#EFC88B" />
            {tierCrossed
              ? `Welcome to ${celebrate.tierName || "a new tier"}!`
              : `Level ${celebrate.level || ""} reached!`}
          </div>
        )}
      </div>

      {p.atMax ? (
        <>
          <div className="lvp-xprow">
            <span className="lvp-xp">
              {(state.lifetimeXp || 0).toLocaleString()} XP
            </span>
            <span className="lvp-target">Max level</span>
          </div>
          <p className="lvp-maxed">You've reached the top of the pack.</p>
        </>
      ) : (
        <>
          <div className="lvp-xprow">
            <span className="lvp-xp">
              {p.earnedXp.toLocaleString()} / {p.totalXp.toLocaleString()} XP
            </span>
            {target ? (
              <span className="lvp-target">
                <ArrowRight size={14} strokeWidth={2.6} />
                {target}
              </span>
            ) : null}
          </div>
          <div className="lvp-track" ref={barRef}>
            <div
              className="lvp-fill"
              style={{ width: `${fillPct}%`, background: grad }}
            />
          </div>
          {target ? (
            <div className="lvp-left">
              {p.xpLeft.toLocaleString()} XP to {target}
            </div>
          ) : null}

          {reqs.length > 0 && (
            <>
              <div className="lvp-reqs-head">
                <span className="lvp-reqs-title">Ways to earn XP</span>
                <span className="lvp-reqs-count">
                  {doneCount} of {reqs.length} done
                </span>
              </div>
              {reqs.map((r, i) => (
                <div className="lvp-req" key={i}>
                  <span className={`lvp-circle ${r.met ? "met" : "unmet"}`}>
                    {r.met ? (
                      <Check size={12} strokeWidth={3.2} color="#fff" />
                    ) : null}
                  </span>
                  <span className={`lvp-req-label ${r.met ? "met" : "unmet"}`}>
                    {r.label}
                  </span>
                  <span className="lvp-req-right">
                    {r.progress ? (
                      <span
                        className={`lvp-req-prog ${r.met ? "met" : "unmet"}`}
                      >
                        {r.progress}
                      </span>
                    ) : null}
                    <span className={`lvp-req-pts ${r.met ? "met" : "unmet"}`}>
                      +{r.xp}
                    </span>
                  </span>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
