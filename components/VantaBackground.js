"use client";

// =============================================================
// VantaBackground — client-only animated background.
//
// Vanta's effect modules reference `window` at module scope, so they MUST NOT
// be imported at the top level of a file that Next.js renders on the server.
// This component lives behind a `next/dynamic` import with { ssr: false } in
// the pages that use it, AND loads three + the effect via dynamic import()
// inside useEffect — so all Vanta/three code runs only in the browser.
//
// Effect keys map to the design names used by the Hero Card / editor.
// =============================================================

import { useEffect, useRef } from "react";

// design key -> the dynamic import of its Vanta effect module
const EFFECT_LOADERS = {
  waves: () => import("vanta/dist/vanta.waves.min"),
  mesh: () => import("vanta/dist/vanta.cells.min"),
  rings: () => import("vanta/dist/vanta.rings.min"),
  birds: () => import("vanta/dist/vanta.birds.min"),
  starfield: () => import("vanta/dist/vanta.net.min"),
  aero: () => import("vanta/dist/vanta.topology.min"),
};

// Topology is the one effect that renders with p5.js instead of three.js.
const P5_EFFECTS = new Set(["aero"]);

function hexToInt(hex) {
  return parseInt((hex || "#000000").replace("#", ""), 16);
}

export default function VantaBackground({ effect, bg, accent, fullHeight }) {
  const elRef = useRef(null);
  const vantaRef = useRef(null);
  const roRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    // Skip the animation entirely when the visitor has asked for reduced
    // motion, or on a touch device. Vanta is a continuous WebGL render loop:
    // it measurably drags on tablets even in a production build, and the
    // static gradient underneath is a perfectly good background. The
    // accessibility statement claims motion is respected, so the first of
    // these two conditions is also a promise being kept.
    if (typeof window !== "undefined") {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      if (reduced || coarse) return;
    }

    // Legacy pets may have a now-removed effect saved (fog/halo/globe/clouds).
    // Fall back to a supported effect so their card still animates.
    const effectKey = EFFECT_LOADERS[effect] ? effect : "waves";
    const loader = EFFECT_LOADERS[effectKey];
    if (!loader || !elRef.current) return;

    (async () => {
      try {
        const isP5 = P5_EFFECTS.has(effectKey);
        // Topology renders with p5.js; all other effects use three.js.
        // Load the library AND the effect module in PARALLEL (not sequentially)
        // so the slower one — p5 is ~900KB — overlaps with the effect download,
        // shaving the time before topology appears.
        let THREE = null;
        let p5lib = null;
        let mod = null;
        if (isP5) {
          const [p5mod, effectMod] = await Promise.all([
            import("p5"),
            loader(),
          ]);
          p5lib = p5mod.default || p5mod;
          mod = effectMod;
        } else {
          const [threeMod, effectMod] = await Promise.all([
            import("three"),
            loader(),
          ]);
          THREE = threeMod;
          mod = effectMod;
        }
        const factory = mod.default || mod;
        if (cancelled || !elRef.current) return;

        // Cap device pixel ratio so heavy effects don't render at 2-3x on
        // retina screens (a major cause of lag/freezing).
        const baseOpts = {
          el: elRef.current,
          ...(isP5 ? { p5: p5lib } : { THREE: THREE }),
          mouseControls: false,
          touchControls: false,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          scale: 0.7,
          scaleMobile: 0.7,
          backgroundColor: hexToInt(bg),
          color: hexToInt(accent),
          color1: hexToInt(accent),
          color2: hexToInt(bg),
          baseColor: hexToInt(bg),
          highlightColor: hexToInt(accent),
          midtoneColor: hexToInt(accent),
          lowlightColor: hexToInt(bg),
        };
        // Per-effect tuning for the 6 supported effects. Values chosen to look
        // closer to the Vanta website demos (less "zoomed-out"/sparse): denser
        // points, tighter spacing, modest zoom-in. Kept to well-supported keys
        // so a bad option can't break init.
        const perEffect = {
          // Zoomed out so more of the wave field shows; bigger slow swells.
          waves: {
            waveHeight: 22.0,
            waveSpeed: 0.7,
            zoom: 0.62,
            shininess: 35.0,
          },
          // Smaller cell size = more cells visible (zoomed-out look), gentle motion.
          mesh: { size: 2.2, speed: 1.1 },
          // Rings: zoom out so the full ring system is visible, not cropped.
          rings: { scale: 0.65, scaleMobile: 0.65 },
          // Fuller sky: more birds, wider field, normal size so more fit in view.
          birds: {
            quantity: 5.0,
            birdSize: 1.1,
            wingSpan: 20.0,
            speedLimit: 4.0,
            separation: 28.0,
            alignment: 28.0,
            cohesion: 28.0,
          },
          // Denser, wider net so more of the point web is visible.
          starfield: { points: 13.0, maxDistance: 26.0, spacing: 13.0 },
          // Topology (p5): zoom out via scale so more of the flow field shows.
          aero: { scale: 0.65, scaleMobile: 0.65 },
        };
        const tuned = { ...baseOpts, ...(perEffect[effectKey] || {}) };
        vantaRef.current = factory(tuned);
        // Clamp the renderer's pixel ratio after init (three.js effects only;
        // the p5 topology effect has no .renderer). 2.0 keeps effects crisp on
        // retina without paying the full 3x cost.
        try {
          if (
            !isP5 &&
            vantaRef.current &&
            vantaRef.current.renderer &&
            vantaRef.current.renderer.setPixelRatio
          ) {
            vantaRef.current.renderer.setPixelRatio(
              Math.min(window.devicePixelRatio || 1, 2.0),
            );
          }
        } catch (e) {
          /* ignore */
        }

        // The Vanta effect RESHAPES its whole pattern whenever .resize() runs,
        // so calling resize() on a height change (e.g. a section toggle) makes
        // the background visibly "take a new shape" — the jump you saw. The fix:
        // never resize on height. The element is sized tall up front (see the
        // render below: minHeight covers the whole document), so a toggle just
        // reveals more of an ALREADY-rendered background — no resize, no jump.
        // We only resize on genuine WIDTH changes (window resize / orientation),
        // debounced to one call per frame.
        if (typeof ResizeObserver !== "undefined" && elRef.current) {
          const parent = elRef.current.parentElement;
          if (parent) {
            let lastW = parent.clientWidth;
            let rafId = null;
            const doResize = () => {
              rafId = null;
              try {
                if (vantaRef.current && vantaRef.current.resize) {
                  vantaRef.current.resize();
                }
              } catch (e) {
                /* ignore */
              }
            };
            roRef.current = new ResizeObserver(() => {
              const w = parent.clientWidth;
              // Width-only: height changes from a toggle must NOT resize (that
              // reshapes the effect). Only real width changes resize.
              if (Math.abs(w - lastW) < 1) return;
              lastW = w;
              if (
                rafId == null &&
                typeof requestAnimationFrame !== "undefined"
              ) {
                rafId = requestAnimationFrame(doResize);
              } else if (rafId == null) {
                doResize();
              }
            });
            roRef.current.observe(parent);
            roRef.current._cancelRaf = () => {
              if (
                rafId != null &&
                typeof cancelAnimationFrame !== "undefined"
              ) {
                cancelAnimationFrame(rafId);
                rafId = null;
              }
            };
          }
        }
      } catch (e) {
        // If three or the effect fails to load/init, leave the base color.
        // (No throw — the page must keep working without the animation.)
        // eslint-disable-next-line no-console
        console.warn("VantaBackground init skipped:", e?.message || e);
      }
    })();

    return () => {
      cancelled = true;
      if (roRef.current) {
        try {
          if (roRef.current._cancelRaf) roRef.current._cancelRaf();
          roRef.current.disconnect();
        } catch (e) {
          /* ignore */
        }
        roRef.current = null;
      }
      if (vantaRef.current) {
        // Vanta's destroy can race React's DOM teardown (removeChild errors).
        // Guard it so a teardown race can never crash the app.
        try {
          if (typeof vantaRef.current.destroy === "function") {
            vantaRef.current.destroy();
          }
        } catch (e) {
          /* ignore teardown race */
        }
        vantaRef.current = null;
      }
    };
  }, [effect, bg, accent]);

  return (
    <div
      ref={elRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        // On the full Hero Card (fullHeight), render the canvas TALL up front so
        // a fully-expanded card (every section open) is already painted; the
        // parent's overflow:hidden clips the excess. Opening a toggle then just
        // reveals already-painted background — no .resize() (which would reshape
        // the effect) needed. In the small editor preview box we don't inflate.
        height: "100%",
        minHeight: fullHeight ? "205vh" : "100%",
        zIndex: 0,
        pointerEvents: "none",
        // The pet's chosen colour, painted whether or not the animation runs.
        // Vanta used to be the only thing colouring this element, so skipping
        // it on touch devices and under reduced motion left the shared card
        // with no background at all. Now the static version is the same
        // colour, just still.
        background: bg || undefined,
      }}
    />
  );
}
