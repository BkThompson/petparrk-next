"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import Link from "next/link";

function useScrollReveal(threshold = 0.08) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

const PHRASES = [
  {
    text: "they complete our family",
    x: "60%",
    y: "40%",
    angle: 3,
    size: 20,
    opacity: 0.44,
    color: "#172531",
    delay: 0.0,
  },
  {
    text: "worth every penny",
    x: "70%",
    y: "4%",
    angle: -3,
    size: 24,
    opacity: 0.5,
    color: "#CF5C36",
    delay: 1.2,
  },
  {
    text: "my best friend",
    x: "20%",
    y: "81%",
    angle: 3,
    size: 27,
    opacity: 0.52,
    color: "#CF5C36",
    delay: 2.4,
  },
  {
    text: "my baby ♥",
    x: "80%",
    y: "24%",
    angle: -6,
    size: 30,
    opacity: 0.54,
    color: "#172531",
    delay: 3.6,
  },
  {
    text: "pure love",
    x: "34%",
    y: "10%",
    angle: 6,
    size: 22,
    opacity: 0.46,
    color: "#172531",
    delay: 4.8,
  },
  {
    text: "she saved me too",
    x: "56%",
    y: "76%",
    angle: -4,
    size: 21,
    opacity: 0.44,
    color: "#CF5C36",
    delay: 6.0,
  },
  {
    text: "unconditional",
    x: "38%",
    y: "67%",
    angle: -3,
    size: 23,
    opacity: 0.44,
    color: "#172531",
    delay: 7.2,
  },
  {
    text: "she chose me first",
    x: "51%",
    y: "17%",
    angle: 4,
    size: 21,
    opacity: 0.46,
    color: "#CF5C36",
    delay: 8.4,
  },
  {
    text: "he just knows",
    x: "86%",
    y: "58%",
    angle: 5,
    size: 24,
    opacity: 0.48,
    color: "#CF5C36",
    delay: 9.6,
  },
  {
    text: "my whole world",
    x: "74%",
    y: "80%",
    angle: -4,
    size: 26,
    opacity: 0.5,
    color: "#172531",
    delay: 10.8,
  },
];

const ORBS = [
  {
    size: 500,
    color: "rgba(207,92,54,0.15)",
    ix: "-15%",
    iy: "8%",
    ax: ["-15%", "-5%", "-12%", "-15%"],
    ay: ["8%", "20%", "3%", "8%"],
    dur: 20,
  },
  {
    size: 460,
    color: "rgba(239,200,139,0.18)",
    ix: "70%",
    iy: "-6%",
    ax: ["70%", "58%", "66%", "70%"],
    ay: ["-6%", "7%", "-12%", "-6%"],
    dur: 24,
  },
  {
    size: 380,
    color: "rgba(180,70,30,0.10)",
    ix: "28%",
    iy: "52%",
    ax: ["28%", "36%", "24%", "28%"],
    ay: ["52%", "38%", "58%", "52%"],
    dur: 28,
  },
];

const VALUES = [
  {
    number: "01",
    title: "Pet Owners First",
    body: "Every decision we make starts with one question: does this help the pet owner? Not the advertiser, not us — the person trying to do right by their pet.",
  },
  {
    number: "02",
    title: "Transparency Always",
    body: "Honest pricing, clear information, no hidden agendas. We show you where our data comes from and we never charge you to access information that should always have been available.",
  },
  {
    number: "03",
    title: "Prevention Over Reaction",
    body: "The best vet visit is the one you were prepared for. We're building tools that help you stay ahead — not just tools for when things go wrong.",
  },
  {
    number: "04",
    title: "Community Over Competition",
    body: "We're not replacing vets — we're helping you work with them better. Great vets deserve to be found. Pet owners deserve to find them.",
  },
  {
    number: "05",
    title: "Accessibility for All",
    body: "Pet care shouldn't be a privilege. We're keeping the core platform free and fighting to make information that's always existed behind phone calls available to everyone.",
  },
];

const PROBLEMS = [
  {
    label: "Decision Paralysis",
    title: "Is this an emergency?",
    body: "It's late. Your pet isn't acting like themselves. You don't know if this is something that can wait until morning or something that can't. You want a clear answer from someone who knows your pet — not a list of possibilities that leaves you more worried than when you started.",
    emoji: "🌙",
  },
  {
    label: "Price Opacity",
    title: "What will this actually cost?",
    body: "You ask for a price before you go. You get a range so wide it's useless, or a number that turns out to be just the starting point. By the time you find out the real cost, you're already committed. That's not your fault. It's a broken system.",
    emoji: "💸",
  },
  {
    label: "Information Overload",
    title: "Where is everything?",
    body: "Records at one vet. Notes at another. Reminders on your phone. Advice from six different places. New pet owners especially feel this — there's so much to know and no single place to put it all.",
    emoji: "📂",
  },
];

// ── MOBILE DOG SVG ──────────────────────────────────────────────────────────
// To adjust dog positions:
//   translate(X, Y) — increase X to move RIGHT, increase Y to move DOWN
//   Navy dog:       translate(27, 58.5)   ← x=27, y=58.5 per user
//   Terracotta dog: translate(50, 60)     ← x=50 pushes right so dogs hug right edge
// ────────────────────────────────────────────────────────────────────────────
const MOBILE_DOG_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 338">
  <g opacity="0.22" transform="translate(27, 58.5) scale(0.80)">
    <ellipse cx="228" cy="332" rx="50" ry="4" fill="rgba(80,30,5,0.55)"/>
    <ellipse cx="228" cy="302" rx="38" ry="22" fill="#2C4657"/>
    <ellipse cx="228" cy="280" rx="20" ry="14" fill="#2C4657"/>
    <circle cx="228" cy="256" r="26" fill="#2C4657"/>
    <path d="M205 244 C194 244 186 252 184 265 C182 278 184 295 188 306 C190 312 198 314 203 308 C207 302 207 278 206 258 C206 250 206 244 205 244Z" fill="#1a2f3d"/>
    <path d="M251 244 C262 244 270 252 272 265 C274 278 272 295 268 306 C266 312 258 314 253 308 C249 302 249 278 250 258 C250 250 250 244 251 244Z" fill="#1a2f3d"/>
    <path d="M214 262 C212 268 212 278 214 284 C218 290 238 290 242 284 C244 278 244 268 242 262 C238 257 218 257 214 262Z" fill="#1a2f3d"/>
    <ellipse cx="228" cy="261" rx="7" ry="5" fill="#0d0a08"/>
    <circle cx="216" cy="249" r="5.5" fill="rgba(240,228,192,0.55)"/>
    <circle cx="217" cy="249" r="2.8" fill="#0d0a08"/>
    <circle cx="240" cy="249" r="5.5" fill="rgba(240,228,192,0.55)"/>
    <circle cx="241" cy="249" r="2.8" fill="#0d0a08"/>
    <path d="M222 285 C220 290 220 298 223 302 C225 305 231 305 233 302 C236 298 236 290 234 285Z" fill="#b05060" opacity="0.75"/>
    <ellipse cx="210" cy="322" rx="12" ry="7" fill="#1a2f3d"/>
    <ellipse cx="246" cy="322" rx="12" ry="7" fill="#1a2f3d"/>
  </g>
  <g opacity="0.22" transform="translate(50, 60) scale(0.80)">
    <ellipse cx="318" cy="330" rx="58" ry="4.5" fill="rgba(80,30,5,0.55)"/>
    <ellipse cx="318" cy="293" rx="44" ry="28" fill="#CF5C36"/>
    <ellipse cx="318" cy="268" rx="26" ry="18" fill="#CF5C36"/>
    <circle cx="318" cy="236" r="32" fill="#CF5C36"/>
    <path d="M288 222 C276 224 270 238 270 254 C270 266 276 274 282 270 C287 266 288 246 288 226 C288 223 288 222 288 222Z" fill="#A84428"/>
    <path d="M348 222 C360 224 366 238 366 254 C366 266 360 274 354 270 C349 266 348 246 348 226 C348 223 348 222 348 222Z" fill="#A84428"/>
    <path d="M300 250 C298 257 298 268 300 274 C304 281 332 281 336 274 C338 268 338 257 336 250 C332 244 304 244 300 250Z" fill="#A84428"/>
    <ellipse cx="318" cy="250" rx="10" ry="7" fill="#1a0800"/>
    <circle cx="303" cy="228" r="6.5" fill="rgba(240,228,192,0.55)"/>
    <circle cx="304" cy="228" r="3.2" fill="#1a0800"/>
    <circle cx="333" cy="228" r="6.5" fill="rgba(240,228,192,0.55)"/>
    <circle cx="334" cy="228" r="3.2" fill="#1a0800"/>
    <path d="M310 276 C307 282 307 292 310 297 C312 300 318 301 322 299 C326 296 327 286 324 279 C321 275 313 273 310 276Z" fill="#e8897a" opacity="0.82"/>
    <line x1="317" y1="278" x2="317" y2="296" stroke="#c06050" stroke-width="1.4" opacity="0.4"/>
    <ellipse cx="296" cy="318" rx="14" ry="8" fill="#A84428"/>
    <ellipse cx="340" cy="318" rx="14" ry="8" fill="#A84428"/>
  </g>
</svg>`,
);

function DogGolden() {
  const C = "#CF5C36",
    D = "#A84428";
  return (
    <svg
      width="152"
      height="92"
      viewBox="0 0 152 92"
      style={{ display: "block", overflow: "visible" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse
        cx="74"
        cy="89"
        rx="52"
        ry="4"
        fill="rgba(80,30,5,0.15)"
        className="shadow-golden"
      />
      <g className="golden-body">
        <path
          d="M22 52 C12 40 9 24 16 10 C19 4 25 3 24 9 C20 20 22 37 26 50Z"
          fill={C}
        />
        <path d="M16 10 C8 4 9 -3 17 0 C23 3 23 10 18 13Z" fill={C} />
        <path d="M22 5 C17 0 19 -5 25 -2 C29 1 28 7 24 9Z" fill={C} />
        <path d="M24 0 C20 -4 23 -8 28 -5 C32 -2 30 4 26 4Z" fill={C} />
        <path
          d="M28 57 C26 46 30 33 43 28 C57 23 76 23 90 28 C101 32 106 42 103 53 C100 64 91 70 76 71 C57 72 35 70 29 63 C27 60 27 59 28 57Z"
          fill={C}
        />
        <path
          d="M100 53 C108 50 114 44 114 36 C114 27 108 21 100 20 C108 26 110 36 107 46 C105 52 102 56 100 53Z"
          fill={C}
        />
        <path
          d="M92 33 C97 24 108 14 118 10 C122 14 122 25 116 34 C110 42 98 44 92 40Z"
          fill={C}
        />
        <circle cx="120" cy="17" r="18" fill={C} />
        <circle cx="125" cy="15" r="4.4" fill={D} />
        <circle cx="125" cy="15" r="3.4" fill="rgba(255,255,255,0.90)" />
        <ellipse cx="126.5" cy="15" rx="2.0" ry="2.2" fill="#1a0800" />
        <circle cx="127" cy="13.6" r="1.0" fill="rgba(255,255,255,0.92)" />
        <path
          d="M110 7 C104 7 96 12 93 22 C90 32 92 47 99 52 C104 55 111 53 113 46 C116 37 115 18 111 7Z"
          fill={D}
        />
        <path
          d="M109 10 C104 16 99 26 97 36"
          stroke={C}
          strokeWidth="1.5"
          fill="none"
          opacity="0.25"
        />
        <path
          d="M121 23 C128 22 140 24 142 31 C142 37 137 41 130 41 C122 41 119 37 119 30 C119 24 120 23 121 23Z"
          fill={D}
        />
        <ellipse cx="141" cy="29" rx="4" ry="3.5" fill="#1a0800" />
        <path
          d="M125 37 C129 41 135 41 138 37"
          stroke="#8B3520"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M127 41 C124 43 122 48 124 52 C126 56 132 56 133 52 C134 48 132 43 129 41Z"
          fill="#e8897a"
        />
        <line
          x1="128"
          y1="41"
          x2="128"
          y2="52"
          stroke="#c06050"
          strokeWidth="1.3"
          opacity="0.45"
        />
        <g className="golden-leg-fl">
          <path
            d="M88 67 C86 72 85 78 87 85 C89 89 95 89 95 85 C94 78 93 72 90 67Z"
            fill={C}
          />
          <ellipse cx="91" cy="87" rx="5" ry="2.5" fill={D} />
        </g>
        <g className="golden-leg-fr">
          <path
            d="M77 67 C75 72 74 78 76 84 C78 88 84 88 84 84 C83 78 82 72 79 67Z"
            fill={D}
          />
          <ellipse cx="80" cy="86" rx="4.5" ry="2" fill="#8B3520" />
        </g>
        <g className="golden-leg-bl">
          <path
            d="M46 66 C48 71 49 75 47 78 C45 81 43 84 45 88 C47 91 52 91 52 87 C50 83 49 79 50 75 C51 71 50 66 48 66Z"
            fill={D}
          />
          <ellipse cx="48" cy="89" rx="4.5" ry="2" fill="#8B3520" />
        </g>
        <g className="golden-leg-br">
          <path
            d="M35 66 C37 71 38 75 36 78 C34 81 32 84 34 88 C36 91 41 91 41 87 C39 83 38 79 39 75 C40 71 39 66 37 66Z"
            fill={C}
          />
          <ellipse cx="37" cy="89" rx="5" ry="2.5" fill={D} />
        </g>
      </g>
    </svg>
  );
}

function DogDachshund() {
  const C = "#2C4657",
    D = "#1a2f3d";
  return (
    <svg
      width="172"
      height="66"
      viewBox="0 0 172 66"
      style={{ display: "block", overflow: "visible" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse
        cx="86"
        cy="63"
        rx="58"
        ry="3.5"
        fill="rgba(80,30,5,0.13)"
        className="shadow-dach"
      />
      <g className="dach-body">
        <path
          d="M12 38 C5 28 4 16 10 7 C12 3 16 4 15 8 C12 16 14 28 16 37Z"
          fill={D}
        />
        <path d="M10 7 C6 2 8 -2 13 0 C16 2 15 8 11 8Z" fill={C} />
        <path
          d="M16 42 C14 33 18 24 30 20 C48 16 102 16 122 20 C133 23 138 31 136 41 C133 51 124 56 110 57 C84 58 28 57 20 51 C17 48 16 45 16 42Z"
          fill={C}
        />
        <path
          d="M129 23 C134 16 143 10 151 8 C154 12 153 20 148 27 C143 33 132 35 128 31Z"
          fill={C}
        />
        <circle cx="154" cy="16" r="15" fill={C} />
        <circle cx="159" cy="11.5" r="3.6" fill={D} />
        <circle cx="159" cy="11.5" r="2.7" fill="rgba(255,255,255,0.90)" />
        <ellipse cx="160.2" cy="11.5" rx="1.5" ry="1.7" fill="#1a0800" />
        <circle cx="160.8" cy="10.4" r="0.8" fill="rgba(255,255,255,0.92)" />
        <path
          d="M146 5 C140 5 131 10 129 20 C126 31 128 48 134 55 C138 59 145 58 148 52 C151 44 150 22 148 8 C147 5 147 5 146 5Z"
          fill={D}
        />
        <path
          d="M145 8 C140 16 136 28 135 40"
          stroke={C}
          strokeWidth="1.2"
          strokeLinecap="butt"
          fill="none"
          opacity="0.2"
        />
        <path
          d="M155 18 C162 17 170 19 171 25 C171 30 167 33 161 33 C155 33 152 30 152 24 C152 18 154 18 155 18Z"
          fill={D}
        />
        <ellipse cx="170" cy="23" rx="3" ry="2.8" fill="#1a0800" />
        <path
          d="M156 29 C160 33 165 33 168 29"
          stroke="#111e28"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M160 33 C158 35 157 40 159 43 C161 46 165 46 166 43 C167 40 166 35 164 33Z"
          fill="#b05060"
          opacity="0.78"
        />
        <line
          x1="162"
          y1="33"
          x2="162"
          y2="43"
          stroke="#8a3040"
          strokeWidth="1.1"
          opacity="0.4"
        />
        <g className="dach-leg-fl">
          <path
            d="M120 50 C119 53 119 58 120 62 C121 64 124 64 124 62 C123 58 123 53 122 50Z"
            fill={C}
          />
          <ellipse cx="122" cy="63" rx="3.5" ry="1.8" fill={D} />
        </g>
        <g className="dach-leg-fr">
          <path
            d="M111 50 C110 53 110 58 111 62 C112 64 115 64 115 62 C114 58 114 53 113 50Z"
            fill={D}
          />
          <ellipse cx="113" cy="63" rx="3" ry="1.5" fill="#111e28" />
        </g>
        <g className="dach-leg-bl">
          <path
            d="M44 48 C43 51 43 56 44 60 C45 62 48 62 48 60 C47 56 47 51 46 48Z"
            fill={D}
          />
          <ellipse cx="46" cy="61" rx="3" ry="1.5" fill="#111e28" />
        </g>
        <g className="dach-leg-br">
          <path
            d="M34 48 C33 51 33 56 34 60 C35 62 38 62 38 60 C37 56 37 51 36 48Z"
            fill={C}
          />
          <ellipse cx="36" cy="61" rx="3.5" ry="1.8" fill={D} />
        </g>
      </g>
    </svg>
  );
}

const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=swap');

  @property --about-tc   { syntax:'<color>'; inherits:false; initial-value:rgba(207,92,54,0.18); }
  @property --about-gold { syntax:'<color>'; inherits:false; initial-value:rgba(239,200,139,0.22); }
  @keyframes warmBreath {
    0%,100% { --about-tc:rgba(207,92,54,0.20); --about-gold:rgba(239,200,139,0.24); }
    50%     { --about-tc:rgba(207,92,54,0.34); --about-gold:rgba(239,200,139,0.40); }
  }

  /* Desktop: animated gradient */
  .about-header-bg {
    animation: warmBreath 10s ease-in-out infinite;
    background:
      radial-gradient(ellipse 60% 120% at 8% 50%, var(--about-tc) 0%, transparent 58%),
      radial-gradient(ellipse 55% 110% at 92% 50%, var(--about-gold) 0%, transparent 58%),
      #E8D9C0;
  }

  /* Tablet: same gradient, no animation — frozen at the midpoint colours */
  @media (max-width:1023px) {
    .about-header-bg {
      animation: none;
      background:
        radial-gradient(ellipse 60% 120% at 8% 50%, rgba(207,92,54,0.27) 0%, transparent 58%),
        radial-gradient(ellipse 55% 110% at 92% 50%, rgba(239,200,139,0.31) 0%, transparent 58%),
        #E8D9C0;
    }
  }

  .about-header-hatch {
    background-image:
      repeating-linear-gradient( 45deg,rgba(100,50,15,0.022) 0px,rgba(100,50,15,0.022) 1px,transparent 1px,transparent 8px),
      repeating-linear-gradient(-45deg,rgba(100,50,15,0.015) 0px,rgba(100,50,15,0.015) 1px,transparent 1px,transparent 8px);
  }

  @keyframes bodyBob   { 0%,100%{transform:translateY(0px)} 45%{transform:translateY(-6px)} }
  @keyframes bodyBobSm { 0%,100%{transform:translateY(0px)} 45%{transform:translateY(-3px)} }
  .golden-body { animation:bodyBob   0.44s ease-in-out infinite; }
  .dach-body   { animation:bodyBobSm 0.38s ease-in-out infinite 0.08s; }
  @keyframes shadowPulse {
    0%,100% { transform:scaleX(1) scaleY(1); opacity:0.13; }
    45%     { transform:scaleX(1.18) scaleY(0.55); opacity:0.06; }
  }
  .shadow-golden { animation:shadowPulse 0.44s ease-in-out infinite;       transform-origin:74px 89px; }
  .shadow-dach   { animation:shadowPulse 0.38s ease-in-out infinite 0.08s; transform-origin:86px 63px; }
  @keyframes legSwingA    { 0%,100%{transform:rotate(-28deg)} 50%{transform:rotate(28deg)}  }
  @keyframes legSwingB    { 0%,100%{transform:rotate( 28deg)} 50%{transform:rotate(-28deg)} }
  @keyframes legSwingA-sm { 0%,100%{transform:rotate(-18deg)} 50%{transform:rotate(18deg)}  }
  @keyframes legSwingB-sm { 0%,100%{transform:rotate( 18deg)} 50%{transform:rotate(-18deg)} }
  .golden-leg-fl { animation:legSwingA    0.44s ease-in-out infinite; transform-origin:89px 67px; }
  .golden-leg-br { animation:legSwingA    0.44s ease-in-out infinite; transform-origin:37px 66px; }
  .golden-leg-fr { animation:legSwingB    0.44s ease-in-out infinite; transform-origin:79px 67px; }
  .golden-leg-bl { animation:legSwingB    0.44s ease-in-out infinite; transform-origin:47px 66px; }
  .dach-leg-fl   { animation:legSwingA-sm 0.38s ease-in-out infinite; transform-origin:121px 50px; }
  .dach-leg-br   { animation:legSwingA-sm 0.38s ease-in-out infinite; transform-origin:35px  48px; }
  .dach-leg-fr   { animation:legSwingB-sm 0.38s ease-in-out infinite; transform-origin:112px 50px; }
  .dach-leg-bl   { animation:legSwingB-sm 0.38s ease-in-out infinite; transform-origin:45px  48px; }

  .rv  { opacity:0; transform:translateY(40px);  transition:opacity 1.2s cubic-bezier(0.22,1,0.36,1),transform 1.2s cubic-bezier(0.22,1,0.36,1); }
  .rl  { opacity:0; transform:translateX(-40px); transition:opacity 1.2s cubic-bezier(0.22,1,0.36,1),transform 1.2s cubic-bezier(0.22,1,0.36,1); }
  .rs  { opacity:0; transform:scale(0.94);       transition:opacity 1.2s cubic-bezier(0.22,1,0.36,1),transform 1.2s cubic-bezier(0.22,1,0.36,1); }
  .rv.on,.rl.on,.rs.on { opacity:1; transform:translateY(0) translateX(0) scale(1); }
  .d1{transition-delay:.14s} .d2{transition-delay:.28s} .d3{transition-delay:.42s}
  .d4{transition-delay:.56s} .d5{transition-delay:.70s}

  .problem-row { display:grid; grid-template-columns:1fr 1fr; gap:64px; align-items:center; padding:72px 0; border-top:1px solid var(--color-border,#EDE8E0); }
  .problem-row:last-child { border-bottom:1px solid var(--color-border,#EDE8E0); }
  .problem-row-reverse .problem-text { order:2; }
  .problem-row-reverse .problem-image { order:1; }
  .problem-text-inner { border-left:3px solid var(--color-terracotta,#CF5C36); padding-left:24px; }
  .problem-image-box  { width:100%; aspect-ratio:4/3; background:linear-gradient(135deg,var(--color-cream,#F5F0E8) 0%,#E2D9CE 100%); border-radius:20px; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:10px; }
  .value-stripe-row { display:grid; grid-template-columns:140px 1fr; gap:48px; padding:48px 0; border-top:1px solid var(--color-border,#EDE8E0); align-items:start; }
  .value-stripe-row:last-child { border-bottom:1px solid var(--color-border,#EDE8E0); }
  .vsnum { font-size:clamp(72px,9vw,110px); font-weight:800; line-height:1; color:var(--color-border,#EDE8E0); font-family:var(--font-urbanist,'Urbanist',sans-serif); user-select:none; padding-top:4px; }

  .btn-tc {
    height:48px; padding:0 32px; line-height:1;
    background:var(--color-terracotta,#CF5C36); color:#fff;
    border:2px solid var(--color-terracotta,#CF5C36); border-radius:12px;
    font-size:15px; font-weight:700; text-decoration:none;
    font-family:var(--font-urbanist,'Urbanist',sans-serif);
    display:inline-flex; align-items:center; justify-content:center;
    transition:background .25s,color .25s;
  }
  .btn-tc:hover { background:#fff; color:var(--color-terracotta,#CF5C36); }
  .btn-wh {
    height:48px; padding:0 32px; line-height:1;
    background:transparent; color:#fff;
    border:2px solid rgba(255,255,255,0.35); border-radius:12px;
    font-size:15px; font-weight:700; text-decoration:none;
    font-family:var(--font-urbanist,'Urbanist',sans-serif);
    display:inline-flex; align-items:center; justify-content:center;
    transition:background .25s,border-color .25s;
  }
  .btn-wh:hover { background:rgba(255,255,255,0.1); border-color:rgba(255,255,255,0.6); }

  .carousel-btn { width:52px; height:52px; background:transparent; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--color-navy-dark,#172531); font-size:40px; font-weight:300; transition:color .2s; padding:0; flex-shrink:0; line-height:1; }
  .carousel-btn:hover { color:var(--color-terracotta,#CF5C36); }
  .carousel-track { overflow:hidden; border-radius:20px; box-shadow:0 2px 12px rgba(23,37,49,0.06); position:relative; height:280px; }
  .carousel-card  { background:#fff; border-radius:20px; padding:32px 28px; border:1px solid var(--color-border,#EDE8E0); height:280px; box-sizing:border-box; overflow:hidden; }

  .values-carousel { display:none; }
  .values-desktop  { display:block; }

  @media (max-width:768px) {
    .values-carousel { display:block; }
    .values-desktop  { display:none;  }
    .problem-row,.problem-row-reverse { grid-template-columns:1fr; gap:28px; padding:40px 0; }
    .problem-row-reverse .problem-text { order:unset; }
    .problem-image { display:none; }
    .value-stripe-row { grid-template-columns:56px 1fr; gap:16px; padding:32px 0; }
    .vsnum { font-size:48px; }
    .btn-tc,.btn-wh { width:100%; box-sizing:border-box; height:48px; justify-content:center; }
    .about-mobile-header { min-height:368px !important; }
  }
`;

const SLIDE_DUR = 440;

export default function AboutPage() {
  const headerRef = useRef(null);
  const dog1Ref = useRef(null);
  const dog2Ref = useRef(null);
  const hasAnimated = useRef(false);
  const [phrasesFrozen, setPhrasesFrozen] = useState(false);
  const [viewport, setViewport] = useState("desktop");

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      if (w <= 768) setViewport("mobile");
      else if (w <= 1023) setViewport("tablet");
      else setViewport("desktop");
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const isDesktop = viewport === "desktop";
  const isTablet = viewport === "tablet";
  const isMobile = viewport === "mobile";

  useEffect(() => {
    if (!isDesktop) return;
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    const dog1 = dog1Ref.current,
      dog2 = dog2Ref.current,
      header = headerRef.current;
    if (!dog1 || !dog2 || !header) return;
    const W = header.offsetWidth;
    gsap.fromTo(
      dog1,
      { x: -160, opacity: 0 },
      {
        x: W + 20,
        duration: 14,
        ease: "none",
        onStart: () => gsap.to(dog1, { opacity: 1, duration: 0.9 }),
      },
    );
    gsap.to(dog1, { opacity: 0, duration: 1.0, delay: 13.4 });
    gsap.fromTo(
      dog2,
      { x: -180, opacity: 0 },
      {
        x: W + 20,
        duration: 10,
        ease: "none",
        delay: 1.6,
        onStart: () => gsap.to(dog2, { opacity: 1, duration: 0.9 }),
      },
    );
    gsap.to(dog2, { opacity: 0, duration: 1.0, delay: 12.0 });
    const t = setTimeout(() => setPhrasesFrozen(true), 11200);
    return () => {
      clearTimeout(t);
      gsap.killTweensOf(dog1);
      gsap.killTweensOf(dog2);
    };
  }, [isDesktop]);

  const [missionRef, missionVisible] = useScrollReveal(0.08);
  const [problemsRef, problemsVisible] = useScrollReveal(0.06);
  const [valuesRef, valuesVisible] = useScrollReveal(0.06);
  const [ctaRef, ctaVisible] = useScrollReveal(0.1);

  const [activeValue, setActiveValue] = useState(0);
  const [txState, setTxState] = useState(null);
  const isAnimating = txState !== null;

  function goToValue(next, dir) {
    if (isAnimating || next === activeValue) return;
    if (dir === undefined) {
      const wrap = VALUES.length;
      const diff = (next - activeValue + wrap) % wrap;
      dir = diff <= wrap / 2 ? 1 : -1;
    }
    setTxState({ from: activeValue, to: next, dir, live: false });
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setTxState((prev) => (prev ? { ...prev, live: true } : null));
        setTimeout(() => {
          setActiveValue(next);
          setTxState(null);
        }, SLIDE_DUR + 20);
      }),
    );
  }

  // ── MOBILE HEADER ──
  const mobileHeader = (
    <div
      ref={headerRef}
      className="about-mobile-header"
      style={{
        padding: "80px 0 88px",
        minHeight: "368px",
        position: "relative",
        overflow: "hidden",
        borderBottom: "1px solid rgba(120,70,30,0.12)",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "flex-start",
        background: "#E8D9C0",
        backgroundImage: [
          `url("data:image/svg+xml,${MOBILE_DOG_SVG}")`,
          "repeating-linear-gradient(45deg,rgba(100,50,15,0.022) 0px,rgba(100,50,15,0.022) 1px,transparent 1px,transparent 8px)",
          "repeating-linear-gradient(-45deg,rgba(100,50,15,0.015) 0px,rgba(100,50,15,0.015) 1px,transparent 1px,transparent 8px)",
        ].join(","),
        backgroundSize: "100% 100%, auto, auto",
        backgroundRepeat: "no-repeat, repeat, repeat",
      }}
    >
      <div
        className="pp-container"
        style={{ position: "relative", zIndex: 2, width: "100%" }}
      >
        <p
          style={{
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--color-terracotta,#CF5C36)",
            marginBottom: "12px",
          }}
        >
          Our Story
        </p>
        <h1
          style={{
            fontSize: "clamp(30px,5.5vw,58px)",
            fontWeight: "800",
            color: "#172531",
            fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
            marginBottom: "16px",
            letterSpacing: "-0.025em",
            lineHeight: "1.05",
          }}
        >
          About PetParrk.
        </h1>
        <p
          style={{
            fontSize: "17px",
            color: "#3D4F5C",
            margin: 0,
            maxWidth: "480px",
            lineHeight: "1.75",
          }}
        >
          Built in Oakland. Built for every pet owner who deserves better.
        </p>
      </div>
    </div>
  );

  // ── DESKTOP / TABLET HEADER ──
  const desktopTabletHeader = (
    <div
      ref={headerRef}
      style={{
        padding: "80px 0 88px",
        minHeight: "393px",
        position: "relative",
        overflow: isDesktop ? "hidden" : "visible",
        borderBottom: "1px solid rgba(120,70,30,0.12)",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "flex-start",
        background: "#E8D9C0",
      }}
    >
      {/* Gradient background — animated on desktop, static on tablet via CSS */}
      <div
        className="about-header-bg"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        className="about-header-hatch"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <filter
          id="aboutGrain"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.70"
            numOctaves="4"
            stitchTiles="stitch"
            result="noise"
          />
          <feColorMatrix
            type="saturate"
            values="0"
            in="noise"
            result="grayNoise"
          />
          <feBlend
            in="SourceGraphic"
            in2="grayNoise"
            mode="multiply"
            result="blend"
          />
          <feComposite in="blend" in2="SourceGraphic" operator="in" />
        </filter>
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          filter: "url(#aboutGrain)",
          opacity: 0.08,
          background: "#fff",
          zIndex: 0,
        }}
      />
      {isDesktop &&
        ORBS.map((orb, i) => (
          <motion.div
            key={i}
            initial={{ x: orb.ix, y: orb.iy }}
            animate={{ x: orb.ax, y: orb.ay }}
            transition={{
              duration: orb.dur,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "mirror",
            }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: orb.size,
              height: orb.size,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
              pointerEvents: "none",
              filter: "blur(52px)",
              zIndex: 0,
            }}
          />
        ))}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background:
            "radial-gradient(ellipse 85% 95% at 50% 50%, transparent 40%, rgba(90,40,8,0.04) 65%, rgba(70,25,4,0.10) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background:
            "linear-gradient(to right, rgba(80,30,5,0.08) 0%, transparent 25%, transparent 75%, rgba(80,30,5,0.08) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background:
            "linear-gradient(to bottom, rgba(80,30,5,0.06) 0%, transparent 28%, transparent 72%, rgba(80,30,5,0.07) 100%)",
        }}
      />

      {/* Phrases — animated on desktop, static on tablet */}
      {isDesktop && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          {PHRASES.map((p, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: phrasesFrozen ? p.opacity * 0.28 : p.opacity,
                y: 0,
              }}
              transition={
                phrasesFrozen
                  ? { duration: 2.2, ease: "easeOut" }
                  : { duration: 0.8, delay: p.delay, ease: "easeOut" }
              }
              style={{
                position: "absolute",
                left: p.x,
                top: p.y,
                fontFamily: "'Caveat', cursive",
                fontSize: p.size,
                fontWeight: 700,
                color: p.color,
                whiteSpace: "nowrap",
                transform: `rotate(${p.angle}deg)`,
                userSelect: "none",
                lineHeight: 1,
              }}
            >
              {p.text}
            </motion.span>
          ))}
        </div>
      )}
      {isTablet && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          {PHRASES.map((p, i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                left: p.x,
                top: p.y,
                fontFamily: "'Caveat', cursive",
                fontSize: p.size,
                fontWeight: 700,
                color: p.color,
                opacity: p.opacity * 0.28,
                whiteSpace: "nowrap",
                transform: "none",
                userSelect: "none",
                lineHeight: 1,
              }}
            >
              {p.text}
            </span>
          ))}
        </div>
      )}

      {isDesktop && (
        <>
          <div
            ref={dog1Ref}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              zIndex: 2,
              opacity: 0,
              transform: "translateX(-160px)",
            }}
          >
            <DogGolden />
          </div>
          <div
            ref={dog2Ref}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              zIndex: 2,
              opacity: 0,
              transform: "translateX(-180px)",
            }}
          >
            <DogDachshund />
          </div>
        </>
      )}

      <div
        className="pp-container"
        style={{ position: "relative", zIndex: 5, width: "100%" }}
      >
        <p
          style={{
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--color-terracotta,#CF5C36)",
            marginBottom: "12px",
          }}
        >
          Our Story
        </p>
        <h1
          style={{
            fontSize: "clamp(30px,5.5vw,58px)",
            fontWeight: "800",
            color: "#172531",
            fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
            marginBottom: "16px",
            letterSpacing: "-0.025em",
            lineHeight: "1.05",
          }}
        >
          About PetParrk.
        </h1>
        <p
          style={{
            fontSize: "17px",
            color: "#3D4F5C",
            margin: 0,
            maxWidth: "480px",
            lineHeight: "1.75",
          }}
        >
          Built in Oakland. Built for every pet owner who deserves better.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
      {isMobile ? mobileHeader : desktopTabletHeader}

      {/* MISSION */}
      <section
        style={{ background: "var(--color-cream,#F5F0E8)", padding: "96px 0" }}
      >
        <div className="pp-container-text">
          <div ref={missionRef}>
            <p
              className={`rv${missionVisible ? " on" : ""}`}
              style={{
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--color-terracotta,#CF5C36)",
                marginBottom: "16px",
              }}
            >
              Why we exist
            </p>
            <h2
              className={`rv${missionVisible ? " on" : ""} d1`}
              style={{
                fontSize: "clamp(28px,4vw,42px)",
                fontWeight: "800",
                color: "var(--color-navy-dark,#172531)",
                lineHeight: "1.15",
                marginBottom: "28px",
                fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
              }}
            >
              Pet care is one of the most emotional decisions you'll ever make —
              and somehow one of the least supported.
            </h2>
            <p
              className={`rv${missionVisible ? " on" : ""} d2`}
              style={{
                fontSize: "18px",
                color: "var(--color-slate,#4B5563)",
                lineHeight: "1.8",
                marginBottom: "20px",
              }}
            >
              When your pet isn't acting like themselves in the middle of the
              night, you're not looking for a search result. You're looking for
              someone to tell you it's okay — or that it's not — and what to do
              either way. When you get a vet bill that's twice what you
              expected, you don't just feel surprised. You feel like you were
              set up to fail.
            </p>
            <p
              className={`rv${missionVisible ? " on" : ""} d3`}
              style={{
                fontSize: "18px",
                color: "var(--color-slate,#4B5563)",
                lineHeight: "1.8",
                marginBottom: "20px",
              }}
            >
              We built PetParrk because pet owners deserve better than that.
              Real prices, so you're never shocked at checkout. Instant
              guidance, so you're never left guessing. A place to keep your
              pet's health story, so you're never starting from scratch at a new
              vet.
            </p>
            <p
              className={`rv${missionVisible ? " on" : ""} d4`}
              style={{
                fontSize: "18px",
                color: "var(--color-slate,#4B5563)",
                lineHeight: "1.8",
              }}
            >
              We started in Oakland. We're building for every pet owner who has
              ever felt like the system wasn't built for them.
            </p>
          </div>
        </div>
      </section>

      {/* PROBLEMS */}
      <section style={{ background: "#fff", padding: "80px 0" }}>
        <div className="pp-container">
          <div
            ref={problemsRef}
            style={{ maxWidth: "900px", marginBottom: "64px" }}
          >
            <p
              className={`rv${problemsVisible ? " on" : ""}`}
              style={{
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--color-terracotta,#CF5C36)",
                marginBottom: "12px",
              }}
            >
              The problem
            </p>
            <h2
              className={`rv${problemsVisible ? " on" : ""} d1`}
              style={{
                fontSize: "clamp(26px,3vw,36px)",
                fontWeight: "800",
                color: "var(--color-navy-dark,#172531)",
                fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
                margin: 0,
              }}
            >
              Three things that shouldn't be this hard.
            </h2>
          </div>
          {PROBLEMS.map((p, i) => (
            <div
              key={p.title}
              className={`problem-row${i % 2 !== 0 ? " problem-row-reverse" : ""}`}
            >
              <div
                className={`problem-text rl${problemsVisible ? " on" : ""} d${i + 1}`}
              >
                <div className="problem-text-inner">
                  <p
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--color-terracotta,#CF5C36)",
                      marginBottom: "10px",
                    }}
                  >
                    {p.label}
                  </p>
                  <h3
                    style={{
                      fontSize: "clamp(20px,2.5vw,28px)",
                      fontWeight: "800",
                      color: "var(--color-navy-dark,#172531)",
                      marginBottom: "16px",
                      fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
                      lineHeight: "1.2",
                    }}
                  >
                    {p.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "16px",
                      color: "var(--color-slate,#4B5563)",
                      lineHeight: "1.8",
                      margin: 0,
                    }}
                  >
                    {p.body}
                  </p>
                </div>
              </div>
              <div
                className={`problem-image rs${problemsVisible ? " on" : ""} d${i + 2}`}
              >
                <div className="problem-image-box">
                  <div style={{ fontSize: "52px" }}>{p.emoji}</div>
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#9CA3AF",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      margin: 0,
                    }}
                  >
                    Photo coming soon
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* VALUES */}
      <section
        style={{ background: "var(--color-cream,#F5F0E8)", padding: "80px 0" }}
      >
        <div className="pp-container">
          <div
            ref={valuesRef}
            style={{ maxWidth: "900px", marginBottom: "64px" }}
          >
            <p
              className={`rv${valuesVisible ? " on" : ""}`}
              style={{
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--color-terracotta,#CF5C36)",
                marginBottom: "12px",
              }}
            >
              What we believe
            </p>
            <h2
              className={`rv${valuesVisible ? " on" : ""} d1`}
              style={{
                fontSize: "clamp(24px,3vw,32px)",
                fontWeight: "800",
                color: "var(--color-navy-dark,#172531)",
                fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
                margin: 0,
              }}
            >
              Our values
            </h2>
          </div>
          <div className="values-desktop">
            {VALUES.map((val, i) => (
              <div
                key={val.title}
                className={`value-stripe-row rv${valuesVisible ? " on" : ""} d${Math.min(i + 1, 5)}`}
              >
                <div className="vsnum">{val.number}</div>
                <div style={{ paddingTop: "12px" }}>
                  <h3
                    style={{
                      fontSize: "clamp(20px,2.5vw,28px)",
                      fontWeight: "800",
                      color: "var(--color-navy-dark,#172531)",
                      margin: "0 0 12px",
                      fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
                      lineHeight: "1.2",
                    }}
                  >
                    {val.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "17px",
                      color: "var(--color-slate,#4B5563)",
                      lineHeight: "1.8",
                      margin: 0,
                      maxWidth: "600px",
                    }}
                  >
                    {val.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="values-carousel">
            <div className="carousel-track">
              {txState ? (
                <>
                  <div
                    className="carousel-card"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      transform: txState.live
                        ? `translateX(${txState.dir * -110}%)`
                        : "translateX(0)",
                      transition: txState.live
                        ? `transform ${SLIDE_DUR}ms cubic-bezier(0.4,0,0.2,1)`
                        : "none",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "52px",
                        fontWeight: "800",
                        color: "var(--color-border,#EDE8E0)",
                        fontFamily:
                          "var(--font-urbanist,'Urbanist',sans-serif)",
                        lineHeight: 1,
                        marginBottom: "14px",
                        userSelect: "none",
                      }}
                    >
                      {VALUES[txState.from].number}
                    </div>
                    <h3
                      style={{
                        fontSize: "19px",
                        fontWeight: "800",
                        color: "var(--color-navy-dark,#172531)",
                        margin: "0 0 10px",
                        fontFamily:
                          "var(--font-urbanist,'Urbanist',sans-serif)",
                      }}
                    >
                      {VALUES[txState.from].title}
                    </h3>
                    <p
                      style={{
                        fontSize: "14px",
                        color: "var(--color-slate,#4B5563)",
                        lineHeight: "1.7",
                        margin: 0,
                      }}
                    >
                      {VALUES[txState.from].body}
                    </p>
                  </div>
                  <div
                    className="carousel-card"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      transform: txState.live
                        ? "translateX(0)"
                        : `translateX(${txState.dir * 110}%)`,
                      transition: txState.live
                        ? `transform ${SLIDE_DUR}ms cubic-bezier(0.4,0,0.2,1)`
                        : "none",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "52px",
                        fontWeight: "800",
                        color: "var(--color-border,#EDE8E0)",
                        fontFamily:
                          "var(--font-urbanist,'Urbanist',sans-serif)",
                        lineHeight: 1,
                        marginBottom: "14px",
                        userSelect: "none",
                      }}
                    >
                      {VALUES[txState.to].number}
                    </div>
                    <h3
                      style={{
                        fontSize: "19px",
                        fontWeight: "800",
                        color: "var(--color-navy-dark,#172531)",
                        margin: "0 0 10px",
                        fontFamily:
                          "var(--font-urbanist,'Urbanist',sans-serif)",
                      }}
                    >
                      {VALUES[txState.to].title}
                    </h3>
                    <p
                      style={{
                        fontSize: "14px",
                        color: "var(--color-slate,#4B5563)",
                        lineHeight: "1.7",
                        margin: 0,
                      }}
                    >
                      {VALUES[txState.to].body}
                    </p>
                  </div>
                </>
              ) : (
                <div className="carousel-card">
                  <div
                    style={{
                      fontSize: "52px",
                      fontWeight: "800",
                      color: "var(--color-border,#EDE8E0)",
                      fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
                      lineHeight: 1,
                      marginBottom: "14px",
                      userSelect: "none",
                    }}
                  >
                    {VALUES[activeValue].number}
                  </div>
                  <h3
                    style={{
                      fontSize: "19px",
                      fontWeight: "800",
                      color: "var(--color-navy-dark,#172531)",
                      margin: "0 0 10px",
                      fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
                    }}
                  >
                    {VALUES[activeValue].title}
                  </h3>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "var(--color-slate,#4B5563)",
                      lineHeight: "1.7",
                      margin: 0,
                    }}
                  >
                    {VALUES[activeValue].body}
                  </p>
                </div>
              )}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "20px",
                marginTop: "20px",
              }}
            >
              <button
                className="carousel-btn"
                onClick={() =>
                  goToValue(
                    activeValue === 0 ? VALUES.length - 1 : activeValue - 1,
                    -1,
                  )
                }
                aria-label="Previous"
              >
                &#8249;
              </button>
              <div
                style={{ display: "flex", gap: "10px", alignItems: "center" }}
              >
                {VALUES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToValue(i)}
                    aria-label={`Value ${i + 1}`}
                    style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "50%",
                      background:
                        activeValue === i
                          ? "var(--color-terracotta,#CF5C36)"
                          : "var(--color-border,#EDE8E0)",
                      border: "none",
                      cursor: "pointer",
                      transform: activeValue === i ? "scale(1.2)" : "scale(1)",
                      transition: "background 0.3s,transform 0.3s",
                      padding: 0,
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
              <button
                className="carousel-btn"
                onClick={() =>
                  goToValue(
                    activeValue === VALUES.length - 1 ? 0 : activeValue + 1,
                    1,
                  )
                }
                aria-label="Next"
              >
                &#8250;
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          background: "var(--color-navy-mid,#2C4657)",
          padding: "96px 0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.025) 1px,transparent 1px)",
            backgroundSize: "36px 36px",
            pointerEvents: "none",
          }}
        />
        <div
          ref={ctaRef}
          className={`rv${ctaVisible ? " on" : ""}`}
          style={{ position: "relative", zIndex: 1 }}
        >
          <div className="pp-container-text" style={{ textAlign: "center" }}>
            <p
              style={{
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--color-gold,#EFC88B)",
                marginBottom: "16px",
              }}
            >
              Where we're going
            </p>
            <h2
              style={{
                fontSize: "clamp(24px,4vw,38px)",
                fontWeight: "800",
                color: "#fff",
                lineHeight: "1.2",
                marginBottom: "20px",
                fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
              }}
            >
              Every pet owner's trusted companion for confident, informed care.
            </h2>
            <p
              style={{
                fontSize: "17px",
                color: "rgba(255,255,255,0.7)",
                lineHeight: "1.7",
                marginBottom: "36px",
              }}
            >
              We're starting in Oakland and Berkeley and expanding across the
              Bay Area and beyond. If you're a pet owner, a vet, or someone who
              thinks this problem matters — we'd love to hear from you.
            </p>
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <Link href="/vets" className="btn-tc">
                Find a Vet
              </Link>
              <Link href="/contact" className="btn-wh">
                Get in Touch
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
