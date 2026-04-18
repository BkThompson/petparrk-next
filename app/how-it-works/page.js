"use client";

import { useEffect, useState, useRef } from "react";
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

const BG_PAWS = [
  { x: "3.2%", y: "3.4%", size: 24.1, rot: 89, opacity: 0.093 },
  { x: "12.2%", y: "5.6%", size: 41.3, rot: 194, opacity: 0.106 },
  { x: "24.4%", y: "6.1%", size: 38.8, rot: 78, opacity: 0.103 },
  { x: "33.7%", y: "5.7%", size: 41.2, rot: 55, opacity: 0.086 },
  { x: "47.7%", y: "5.1%", size: 50.2, rot: 190, opacity: 0.094 },
  { x: "54.9%", y: "5.8%", size: 27.2, rot: 3, opacity: 0.054 },
  { x: "69.2%", y: "7.4%", size: 33.7, rot: 324, opacity: 0.082 },
  { x: "79.4%", y: "5.3%", size: 25.3, rot: 331, opacity: 0.051 },
  { x: "88.1%", y: "8.1%", size: 51.4, rot: 340, opacity: 0.086 },
  { x: "92.3%", y: "1.3%", size: 34.1, rot: 295, opacity: 0.046 },
  { x: "3.4%", y: "23.3%", size: 28.5, rot: 2, opacity: 0.063 },
  { x: "14.4%", y: "24.7%", size: 44.8, rot: 20, opacity: 0.055 },
  { x: "22.5%", y: "27.1%", size: 44.0, rot: 127, opacity: 0.089 },
  { x: "38.0%", y: "23.8%", size: 47.4, rot: 216, opacity: 0.092 },
  { x: "45.8%", y: "27.1%", size: 21.3, rot: 52, opacity: 0.052 },
  { x: "52.5%", y: "24.0%", size: 25.1, rot: 202, opacity: 0.094 },
  { x: "67.7%", y: "32.4%", size: 22.0, rot: 296, opacity: 0.053 },
  { x: "72.1%", y: "25.7%", size: 37.9, rot: 17, opacity: 0.055 },
  { x: "85.0%", y: "32.1%", size: 31.6, rot: 149, opacity: 0.066 },
  { x: "92.7%", y: "32.8%", size: 49.4, rot: 260, opacity: 0.068 },
  { x: "3.6%", y: "47.2%", size: 40.2, rot: 235, opacity: 0.062 },
  { x: "17.2%", y: "52.1%", size: 25.4, rot: 291, opacity: 0.087 },
  { x: "22.4%", y: "47.1%", size: 43.6, rot: 29, opacity: 0.071 },
  { x: "38.4%", y: "46.6%", size: 35.1, rot: 327, opacity: 0.101 },
  { x: "47.2%", y: "49.9%", size: 49.6, rot: 92, opacity: 0.102 },
  { x: "54.4%", y: "51.4%", size: 38.8, rot: 102, opacity: 0.087 },
  { x: "66.2%", y: "55.3%", size: 40.7, rot: 158, opacity: 0.067 },
  { x: "78.7%", y: "47.6%", size: 40.7, rot: 250, opacity: 0.108 },
  { x: "83.3%", y: "51.5%", size: 23.8, rot: 230, opacity: 0.086 },
  { x: "97.9%", y: "53.9%", size: 25.9, rot: 310, opacity: 0.064 },
  { x: "3.2%", y: "66.1%", size: 36.1, rot: 0, opacity: 0.062 },
  { x: "15.6%", y: "73.7%", size: 23.7, rot: 283, opacity: 0.071 },
  { x: "22.1%", y: "73.7%", size: 43.1, rot: 168, opacity: 0.077 },
  { x: "35.6%", y: "72.3%", size: 44.0, rot: 277, opacity: 0.054 },
  { x: "41.1%", y: "66.0%", size: 28.5, rot: 209, opacity: 0.107 },
  { x: "54.4%", y: "69.2%", size: 36.9, rot: 341, opacity: 0.081 },
  { x: "63.7%", y: "73.8%", size: 51.7, rot: 286, opacity: 0.068 },
  { x: "72.9%", y: "70.3%", size: 22.4, rot: 47, opacity: 0.071 },
  { x: "88.6%", y: "73.2%", size: 32.2, rot: 344, opacity: 0.053 },
  { x: "94.0%", y: "68.0%", size: 37.5, rot: 320, opacity: 0.067 },
  { x: "6.6%", y: "97.2%", size: 34.3, rot: 321, opacity: 0.102 },
  { x: "14.0%", y: "88.0%", size: 20.5, rot: 86, opacity: 0.072 },
  { x: "20.6%", y: "90.0%", size: 34.8, rot: 121, opacity: 0.091 },
  { x: "35.2%", y: "92.4%", size: 39.5, rot: 210, opacity: 0.069 },
  { x: "42.2%", y: "93.1%", size: 19.6, rot: 13, opacity: 0.064 },
  { x: "53.0%", y: "95.1%", size: 23.4, rot: 158, opacity: 0.089 },
  { x: "64.7%", y: "95.7%", size: 22.0, rot: 62, opacity: 0.059 },
  { x: "74.5%", y: "92.7%", size: 24.7, rot: 201, opacity: 0.089 },
  { x: "87.0%", y: "95.8%", size: 20.8, rot: 244, opacity: 0.091 },
  { x: "98.6%", y: "87.8%", size: 20.9, rot: 273, opacity: 0.085 },
];

const PAW_TRAIL = [
  { left: "4%", top: "68%", rot: 90, delay: 0 },
  { left: "11%", top: "44%", rot: 82, delay: 1200 },
  { left: "19%", top: "66%", rot: 91, delay: 2400 },
  { left: "27%", top: "41%", rot: 85, delay: 3600 },
  { left: "35%", top: "64%", rot: 89, delay: 4800 },
  { left: "43%", top: "39%", rot: 83, delay: 6000 },
  { left: "51%", top: "66%", rot: 90, delay: 7200 },
  { left: "59%", top: "37%", rot: 86, delay: 8400 },
  { left: "67%", top: "63%", rot: 91, delay: 9600 },
  { left: "75%", top: "35%", rot: 84, delay: 10800 },
  { left: "82%", top: "65%", rot: 88, delay: 12000 },
  { left: "90%", top: "38%", rot: 87, delay: 13200 },
];

const STEPS = [
  {
    number: "01",
    icon: "🔍",
    title: "Find a Vet",
    description:
      "Search verified vets in your neighborhood. Filter by price, specialty, or availability. See real prices before you ever pick up the phone.",
  },
  {
    number: "02",
    icon: "🩺",
    title: "Check Symptoms",
    description:
      "Not sure if it's urgent? Get instant AI triage guidance personalized to your pet — 24/7, completely free. No subscription required.",
  },
  {
    number: "03",
    icon: "📋",
    title: "Track Your Pet's Health",
    description:
      "Build your pet's complete health history over time. Vet visits, vaccines, notes — all in one place you own and control.",
  },
];

const FAQS = [
  {
    q: "Is PetParrk free to use?",
    a: "Yes. Browsing the vet directory, viewing prices, and running one symptom check are all free with no account required. Create a free account to save vets and build your pet's health history.",
  },
  {
    q: "Where does the pricing data come from?",
    a: "Prices are submitted by pet owners in the community and verified by our team before going live. We never show unverified data.",
  },
  {
    q: "Is the symptom checker a replacement for a vet?",
    a: "No — PetParrk provides triage guidance only. We help you understand urgency and next steps. We never diagnose or replace professional veterinary care.",
  },
  {
    q: "What areas does PetParrk cover?",
    a: "We're starting in Oakland and the East Bay, expanding across the Bay Area based on community interest.",
  },
];

function PawShape({ fill = "white" }) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      fill={fill}
      style={{ width: "100%", height: "100%" }}
    >
      <ellipse cx="50" cy="72" rx="22" ry="18" />
      <ellipse cx="25" cy="50" rx="11" ry="9" />
      <ellipse cx="75" cy="50" rx="11" ry="9" />
      <ellipse cx="38" cy="35" rx="10" ry="8" />
      <ellipse cx="62" cy="35" rx="10" ry="8" />
    </svg>
  );
}

export default function HowItWorksPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [visiblePaws, setVisiblePaws] = useState([]);
  const [fadingPaws, setFadingPaws] = useState([]);
  const [allFaded, setAllFaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [stepsRef, stepsVisible] = useScrollReveal(0.08);
  const [faqRef, faqVisible] = useScrollReveal(0.1);
  const [ctaRef, ctaVisible] = useScrollReveal(0.1);

  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth <= 768) {
        setIsMobile(true);
        setAllFaded(true);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) return;
    const timers = [];
    const HOLD = 1600;
    PAW_TRAIL.forEach((p, i) => {
      timers.push(
        setTimeout(() => {
          setVisiblePaws((prev) => [...prev, i]);
          const fadeAfter =
            i < PAW_TRAIL.length - 1
              ? PAW_TRAIL[i + 1].delay - p.delay + HOLD
              : HOLD;
          timers.push(
            setTimeout(() => setFadingPaws((prev) => [...prev, i]), fadeAfter),
          );
        }, p.delay),
      );
    });
    const total = PAW_TRAIL[PAW_TRAIL.length - 1].delay + HOLD + 1200;
    timers.push(setTimeout(() => setAllFaded(true), total));
    return () => timers.forEach(clearTimeout);
  }, [isMobile]);

  return (
    <>
      <style>{`
        .rv { opacity:0; transform:translateY(36px); transition:opacity 1.2s cubic-bezier(0.22,1,0.36,1),transform 1.2s cubic-bezier(0.22,1,0.36,1); }
        .rl { opacity:0; transform:translateX(-36px); transition:opacity 1.2s cubic-bezier(0.22,1,0.36,1),transform 1.2s cubic-bezier(0.22,1,0.36,1); }
        .rr { opacity:0; transform:translateX(36px); transition:opacity 1.2s cubic-bezier(0.22,1,0.36,1),transform 1.2s cubic-bezier(0.22,1,0.36,1); }
        .rv.on,.rl.on,.rr.on { opacity:1; transform:translate(0); }
        .d1{transition-delay:.1s} .d2{transition-delay:.22s} .d3{transition-delay:.34s}

        .walk-paw { position:absolute; transition:opacity 0.55s ease-out, transform 0.45s cubic-bezier(0.175,0.885,0.32,1.275); }
        .bg-paw { position:absolute; transition:opacity 1.8s ease-in-out; }

        @media (max-width: 768px) {
          .walk-paw { display: none !important; }
          .hiw-vignette-center { opacity: 0.3 !important; }
          .hiw-vignette-side { opacity: 0.28 !important; }
          .paw-hide-mobile { display: none !important; }
          .bg-paw { transition: none !important; }
          .hiw-header { min-height: 368px !important; height: auto !important; padding: 80px 0 88px !important; }
        }

        .sc-outer { position:relative; border-radius:22px; padding:1.5px; transition:transform 0.3s ease; height:100%; }
        .sc-outer:hover { transform:translateY(-4px); }
        .sc { border-radius:20px; padding:36px 28px; background:linear-gradient(160deg,rgba(42,62,78,.97) 0%,rgba(26,42,55,.97) 100%); text-align:center; transition:background .3s,box-shadow .3s; height:100%; box-sizing:border-box; }
        .sc-outer:hover .sc { background:linear-gradient(160deg,rgba(50,72,90,.98) 0%,rgba(34,54,68,.98) 100%); box-shadow:0 20px 50px rgba(0,0,0,.3); }
        .sg { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; align-items:stretch; }
        @media(max-width:900px){.sg{grid-template-columns:1fr;}}

        .fq { border-top:1px solid rgba(255,255,255,.07); padding:24px 0; cursor:pointer; }
        .fq:last-child { border-bottom:1px solid rgba(255,255,255,.07); }
        .fa { display:grid; grid-template-rows:0fr; opacity:0; transition:grid-template-rows .38s cubic-bezier(.4,0,.2,1),opacity .3s; }
        .fa.open { grid-template-rows:1fr; opacity:1; }
        .fa-inner { overflow:hidden; }

        .bt { height:48px; padding:0 32px; line-height:0; border-radius:12px; font-size:15px; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; font-family:var(--font-urbanist,'Urbanist',sans-serif); transition:background .25s,color .25s; }
        .bt-tc { background:var(--color-terracotta,#CF5C36); color:#fff; border:2px solid var(--color-terracotta,#CF5C36); }
        .bt-tc:hover { background:#fff; color:var(--color-terracotta,#CF5C36); }
        .bt-dk { background:transparent; color:var(--color-navy-dark,#172531); border:2px solid var(--color-navy-dark,#172531); }
        .bt-dk:hover { background:var(--color-navy-dark,#172531); color:#fff; }

        @media(max-width:768px){.fqg{grid-template-columns:1fr!important;} .bt{width:100%;box-sizing:border-box;height:48px;justify-content:center;}}
      `}</style>

      {/* HEADER — minHeight 393px desktop, 368px mobile via .hiw-header class */}
      <div
        className="hiw-header"
        style={{
          background: "var(--color-navy-dark, #172531)",
          padding: "80px 0 88px",
          minHeight: "393px",
          height: "393px",
          position: "relative",
          overflow: "hidden",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          boxSizing: "border-box",
        }}
      >
        <div
          className="hiw-vignette-center"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse 75% 85% at 50% 50%, rgba(44,70,87,0.5) 0%, rgba(23,37,49,0.0) 45%, rgba(10,18,26,0.6) 80%, rgba(6,12,18,0.85) 100%)",
          }}
        />
        <div
          className="hiw-vignette-side"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 0,
            background:
              "linear-gradient(to right, rgba(6,14,22,0.7) 0%, rgba(6,14,22,0.2) 18%, transparent 35%, transparent 65%, rgba(6,14,22,0.2) 82%, rgba(6,14,22,0.7) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 0,
            background:
              "linear-gradient(to bottom, rgba(6,14,22,0.5) 0%, transparent 25%, transparent 75%, rgba(6,14,22,0.5) 100%)",
          }}
        />

        {BG_PAWS.map((p, i) => (
          <div
            key={`bg${i}`}
            className={`bg-paw${i % 2 !== 0 ? " paw-hide-mobile" : ""}`}
            style={{
              left: p.x,
              top: p.y,
              width: p.size + "px",
              height: p.size + "px",
              opacity: allFaded ? p.opacity : 0,
              transform: `rotate(${p.rot}deg)`,
              pointerEvents: "none",
            }}
          >
            <PawShape fill="rgba(255,255,255,1)" />
          </div>
        ))}

        {PAW_TRAIL.map((p, i) => (
          <div
            key={`w${i}`}
            className={`walk-paw${i % 2 !== 0 ? " hide-mobile" : ""}`}
            style={{
              left: p.left,
              top: p.top,
              width: "30px",
              height: "30px",
              opacity: allFaded
                ? 0
                : fadingPaws.includes(i)
                  ? 0.06
                  : visiblePaws.includes(i)
                    ? 0.38
                    : 0,
              transform: visiblePaws.includes(i)
                ? `rotate(${p.rot}deg) scale(1)`
                : `rotate(${p.rot}deg) scale(1.6)`,
              pointerEvents: "none",
            }}
          >
            <PawShape fill="rgba(239,200,139,1)" />
          </div>
        ))}

        <div
          className="pp-container"
          style={{ position: "relative", zIndex: 1 }}
        >
          <p
            style={{
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--color-gold,#EFC88B)",
              marginBottom: "12px",
            }}
          >
            How It Works
          </p>
          <h1
            style={{
              fontSize: "clamp(30px,5.5vw,56px)",
              fontWeight: "800",
              color: "#fff",
              fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
              marginBottom: "16px",
              letterSpacing: "-0.025em",
              lineHeight: "1.05",
            }}
          >
            Vet care without
            <br />
            the surprises.
          </h1>
          <p
            style={{
              fontSize: "17px",
              color: "rgba(255,255,255,0.65)",
              margin: 0,
              lineHeight: "1.75",
              maxWidth: "520px",
            }}
          >
            Three simple steps to take control of your pet's health — and always
            know what to expect.
          </p>
        </div>
      </div>

      {/* STEPS */}
      <section
        style={{
          background: "var(--color-navy-mid,#2C4657)",
          padding: "88px 0",
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
          className="pp-container"
          style={{ position: "relative", zIndex: 1 }}
        >
          <div ref={stepsRef} className="sg">
            {STEPS.map((step, i) => (
              <div
                key={step.number}
                className={`rv${stepsVisible ? " on" : ""} d${i + 1}`}
                style={{ height: "100%" }}
              >
                <div
                  className="sc-outer"
                  style={{
                    background:
                      "linear-gradient(135deg,rgba(255,255,255,0.14) 0%,rgba(255,255,255,0.04) 28%,transparent 42%,transparent 58%,rgba(255,255,255,0.04) 72%,rgba(255,255,255,0.14) 100%)",
                  }}
                >
                  <div className="sc">
                    <div
                      style={{
                        position: "absolute",
                        top: "16px",
                        right: "20px",
                        fontSize: "72px",
                        fontWeight: "800",
                        color: "rgba(255,255,255,0.04)",
                        lineHeight: 1,
                        userSelect: "none",
                      }}
                    >
                      {step.number}
                    </div>
                    <div
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "16px",
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "28px",
                        margin: "0 auto 20px",
                        filter: "brightness(1.2)",
                      }}
                    >
                      {step.icon}
                    </div>
                    <h3
                      style={{
                        fontSize: "20px",
                        fontWeight: "800",
                        color: "#fff",
                        marginBottom: "12px",
                        fontFamily:
                          "var(--font-urbanist,'Urbanist',sans-serif)",
                      }}
                    >
                      {step.title}
                    </h3>
                    <p
                      style={{
                        fontSize: "15px",
                        color: "rgba(255,255,255,0.55)",
                        lineHeight: "1.75",
                        margin: 0,
                      }}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        style={{
          background: "var(--color-navy-dark,#172531)",
          padding: "88px 0",
        }}
      >
        <div className="pp-container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "80px",
              alignItems: "start",
            }}
            className="fqg"
          >
            <div ref={faqRef} className={`rl${faqVisible ? " on" : ""}`}>
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
                Common questions
              </p>
              <h2
                style={{
                  fontSize: "clamp(26px,3.5vw,40px)",
                  fontWeight: "800",
                  color: "#fff",
                  lineHeight: "1.1",
                  fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
                  marginBottom: "20px",
                  letterSpacing: "-0.02em",
                }}
              >
                Got questions?
                <br />
                We've got answers.
              </h2>
              <p
                style={{
                  fontSize: "16px",
                  color: "rgba(255,255,255,0.5)",
                  lineHeight: "1.75",
                  marginBottom: "36px",
                }}
              >
                Everything you need to know about how PetParrk works.
              </p>
              <Link
                href="/contact"
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "var(--color-gold,#EFC88B)",
                  textDecoration: "none",
                }}
              >
                Still have questions? Contact us →
              </Link>
            </div>
            <div className={`rr${faqVisible ? " on" : ""}`}>
              {FAQS.map((faq, i) => (
                <div
                  key={i}
                  className="fq"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "16px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "16px",
                        fontWeight: "700",
                        color: "#fff",
                        margin: 0,
                        fontFamily:
                          "var(--font-urbanist,'Urbanist',sans-serif)",
                      }}
                    >
                      {faq.q}
                    </p>
                    <span
                      style={{
                        fontSize: "26px",
                        fontWeight: "300",
                        color: "var(--color-gold,#EFC88B)",
                        flexShrink: 0,
                        lineHeight: 1,
                        transition: "transform .3s",
                        transform:
                          openFaq === i ? "rotate(45deg)" : "rotate(0deg)",
                      }}
                    >
                      +
                    </span>
                  </div>
                  <div className={`fa${openFaq === i ? " open" : ""}`}>
                    <div className="fa-inner">
                      <p
                        style={{
                          fontSize: "15px",
                          color: "rgba(255,255,255,0.55)",
                          lineHeight: "1.75",
                          margin: "14px 0 0",
                          paddingRight: "32px",
                        }}
                      >
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{ background: "var(--color-cream,#F5F0E8)", padding: "96px 0" }}
      >
        <div
          ref={ctaRef}
          className={`rv${ctaVisible ? " on" : ""}`}
          style={{
            maxWidth: "640px",
            margin: "0 auto",
            textAlign: "center",
            padding: "0 24px",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--color-terracotta,#CF5C36)",
              marginBottom: "16px",
            }}
          >
            Get started free
          </p>
          <h2
            style={{
              fontSize: "clamp(26px,4vw,42px)",
              fontWeight: "800",
              color: "var(--color-navy-dark,#172531)",
              marginBottom: "16px",
              fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
              letterSpacing: "-0.02em",
              lineHeight: "1.1",
            }}
          >
            Ready to find your next vet?
          </h2>
          <p
            style={{
              fontSize: "17px",
              color: "var(--color-slate,#4B5563)",
              lineHeight: "1.7",
              marginBottom: "36px",
            }}
          >
            Browse verified vets with real prices — no account needed.
          </p>
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link href="/vets" className="bt bt-tc">
              Find a Vet →
            </Link>
            <Link href="/symptom-checker" className="bt bt-dk">
              Check Symptoms →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
