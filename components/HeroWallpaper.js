"use client";

/* HeroWallpaper — the animated banner behind the profile identity block.
   Extracted from ProfileMain / ProfileUsername (they were byte-identical). */

import { useState, useEffect } from "react";
import {
  PawPrint,
  Feather,
  Sparkles,
  Leaf,
  Bone,
  Cat,
  Dog,
  Fish,
  Bird,
  Heart,
} from "lucide-react";
import { BANNER_LUCIDE } from "../lib/petTileHelpers";

export default function HeroWallpaper({ bannerKey }) {
  // ─── Desktop / tablet positions (≥601px viewport) ──────────────────────
  // Edit these freely — each entry controls one icon's position, size,
  // rotation and opacity on desktop and tablet
  const positionsDesktop = [
    // CONTENT ZONE (where King's name/bio sits) — denser, higher opacity
    { top: "8%", left: "20%", size: 38, rot: 22, opacity: 0.18 },
    { top: "30%", left: "12%", size: 32, rot: -12, opacity: 0.16 },
    { top: "10%", left: "55%", size: 44, rot: 18, opacity: 0.1 },
    { top: "4%", left: "72%", size: 36, rot: -22, opacity: 0.08 },
    { top: "26%", left: "28%", size: 40, rot: 8, opacity: 0.08 }, // Icon near username
    { top: "30%", left: "48%", size: 34, rot: -16, opacity: 0.08 },
    { top: "28%", left: "65%", size: 42, rot: 24, opacity: 0.08 },
    { top: "50%", left: "18%", size: 36, rot: -10, opacity: 0.18 },
    { top: "46%", left: "40%", size: 30, rot: 26, opacity: 0.0 },
    { top: "42%", left: "58%", size: 44, rot: -18, opacity: 0.08 },
    { top: "48%", left: "81%", size: 36, rot: 14, opacity: 0.1 },
    { top: "60%", left: "28%", size: 32, rot: -24, opacity: 0.19 },
    { top: "50%", left: "39%", size: 32, rot: 12, opacity: 0.17 },
    { top: "62%", left: "65%", size: 38, rot: -8, opacity: 0.18 },
    { top: "78%", left: "32%", size: 36, rot: 28, opacity: 0.18 },
    { top: "72%", left: "48%", size: 42, rot: -14, opacity: 0.12 },
    { top: "80%", left: "70%", size: 34, rot: 20, opacity: 0.17 },
    { top: "92%", left: "20%", size: 38, rot: -26, opacity: 0.18 },
    { top: "94%", left: "60%", size: 32, rot: 10, opacity: 0.16 },

    // EDGES (gutters) — fewer, slightly lower opacity for accent only
    { top: "20%", left: "4%", size: 36, rot: -14, opacity: 0.14 },
    { top: "60%", left: "5%", size: 40, rot: 22, opacity: 0.15 },
    { top: "15%", left: "88%", size: 38, rot: 18, opacity: 0.14 },
    { top: "60%", left: "93%", size: 36, rot: -10, opacity: 0.15 },
    { top: "88%", left: "8%", size: 34, rot: 26, opacity: 0.13 },
    { top: "88%", left: "85%", size: 36, rot: -22, opacity: 0.13 },
  ];

  // ─── Mobile positions (≤600px viewport) ────────────────────────────────
  // Independent from desktop — edit positions, sizes, rotations, opacities
  // Narrow viewport so positions span 5%-90% horizontal
  const positionsMobile = [
    { top: "5%", left: "7%", size: 30, rot: -14, opacity: 0.08 },
    { top: "10%", left: "82%", size: 28, rot: 22, opacity: 0.1 },
    { top: "26%", left: "64%", size: 32, rot: -8, opacity: 0.06 },
    { top: "44%", left: "12%", size: 28, rot: 18, opacity: 0.1 },
    { top: "48%", left: "76%", size: 30, rot: -22, opacity: 0.1 },
    { top: "62%", left: "44%", size: 30, rot: 14, opacity: 0.06 },
    { top: "80%", left: "10%", size: 28, rot: -18, opacity: 0.15 },
    { top: "84%", left: "50%", size: 32, rot: 24, opacity: 0.1 },
    { top: "82%", left: "82%", size: 28, rot: -10, opacity: 0.1 },
  ];

  // Detect viewport — picks correct list at render time + on resize
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const positions = isMobile ? positionsMobile : positionsDesktop;

  // Pool of 10 Lucide icons that mix well at low opacity:
  // species shapes + organic/decorative shapes
  const MIXED_POOL = [
    PawPrint,
    Feather,
    Sparkles,
    Leaf,
    Bone,
    Cat,
    Dog,
    Fish,
    Bird,
    Heart,
  ];
  const isMixed = bannerKey === "mixed";
  const SpeciesIcon = BANNER_LUCIDE[bannerKey] || Sparkles;

  const pickIcon = (i) => {
    if (isMixed) return MIXED_POOL[i % MIXED_POOL.length];
    // Single species: rotate species icon + complementary shapes
    const single = [
      SpeciesIcon,
      PawPrint,
      SpeciesIcon,
      Sparkles,
      SpeciesIcon,
      Leaf,
      SpeciesIcon,
      Heart,
    ];
    return single[i % single.length];
  };

  return (
    <div className="pp-hero-wallpaper" aria-hidden="true">
      {positions.map((p, i) => {
        const Icon = pickIcon(i);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: p.top,
              left: p.left,
              transform: `rotate(${p.rot}deg)`,
              opacity: p.opacity,
              color: "#fff",
              pointerEvents: "none",
            }}
          >
            <Icon size={p.size} strokeWidth={1.6} />
          </div>
        );
      })}
    </div>
  );
}
