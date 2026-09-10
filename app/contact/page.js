"use client";

import { ArtContact } from "../../components/BrandArt";
import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  MessageCircle,
  Hospital,
  Newspaper,
  PawPrint,
  Mail,
} from "lucide-react";

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

const REASONS = [
  {
    icon: MessageCircle,
    label: "General feedback",
    body: "Tell us what's working, what's not, or what you wish PetParrk could do. Your feedback shapes what we build.",
  },
  {
    icon: Hospital,
    label: "Vet partnerships",
    body: "Are you a vet or clinic interested in being featured or partnering with us? We'd love to connect.",
  },
  {
    icon: Newspaper,
    label: "Press & media",
    body: "Writing about pet care, health tech, or consumer startups? Reach out and we'll get back to you quickly.",
  },
  {
    icon: PawPrint,
    label: "Submit a price",
    body: "Visited a vet recently? Help the community by submitting what you paid from that vet's profile page.",
  },
];

const ARC_RADII = [90, 180, 270, 360, 450, 540, 660, 800];
const PULSE_DURATION = 700;
const PULSE_INTERVAL = 500;
const TOTAL_SEQUENCE_MS =
  ARC_RADII.length * PULSE_INTERVAL + PULSE_DURATION + 400;

export default function ContactPage() {
  const [pulseIndex, setPulseIndex] = useState(-1);
  const [animDone, setAnimDone] = useState(false);
  const [dotVisible, setDotVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [contentRef, contentVisible] = useScrollReveal(0.08);
  const [ctaRef, ctaVisible] = useScrollReveal(0.1);

  useEffect(() => {
    const mobile = window.innerWidth <= 768;
    setIsMobile(mobile);
    if (mobile) {
      setAnimDone(true);
      return;
    }
    const DOT_DELAY = 700;
    const timers = [];
    timers.push(setTimeout(() => setDotVisible(true), 80));
    ARC_RADII.forEach((_, i) => {
      timers.push(
        setTimeout(() => setPulseIndex(i), DOT_DELAY + i * PULSE_INTERVAL),
      );
    });
    timers.push(
      setTimeout(() => {
        setAnimDone(true);
        setPulseIndex(-1);
      }, DOT_DELAY + TOTAL_SEQUENCE_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <>
      <style>{`
        @keyframes arcPulse {
          0%   { opacity: 0; stroke-width: 2.5; }
          15%  { opacity: 1; stroke-width: 2;   }
          70%  { opacity: 0.5; }
          100% { opacity: 0; stroke-width: 1;   }
        }
        @keyframes dotRise {
          0%   { opacity: 0; transform: translateY(14px); }
          60%  { opacity: 1; transform: translateY(0px);  }
          100% { opacity: 1; transform: translateY(0px);  }
        }
        .rv { opacity:0; transform:translateY(36px); transition:opacity 1.2s cubic-bezier(0.22,1,0.36,1),transform 1.2s cubic-bezier(0.22,1,0.36,1); }
        .rl { opacity:0; transform:translateX(-36px); transition:opacity 1.2s cubic-bezier(0.22,1,0.36,1),transform 1.2s cubic-bezier(0.22,1,0.36,1); }
        .rr { opacity:0; transform:translateX(36px); transition:opacity 1.2s cubic-bezier(0.22,1,0.36,1),transform 1.2s cubic-bezier(0.22,1,0.36,1); }
        .rv.on,.rl.on,.rr.on { opacity:1; transform:translate(0); }
        .d1 { transition-delay:.12s; }
        .cg { display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:start; }
        .ci { display:block; }
        /* Below 1024 the two-column split starves the reasons list to give
           room to atmosphere. The illustration goes, same as on phones. */
        @media (max-width:1023px) {
          .cg { grid-template-columns:1fr; gap:48px; }
          .ci { display:none; }
        }
        .cr { display:flex; gap:16px; align-items:flex-start; padding:20px 0; border-bottom:1px solid rgba(23,37,49,0.08); }
        /* the last row keeps its rule — it separates the reasons from the
           two contact buttons below */
        .cr:last-child { border-bottom:1px solid rgba(23,37,49,0.08); margin-bottom:28px; }
        /* Same tile as every other spot on the site, scaled for a list row:
           68/44 proportion held at 52/34. */
        .ri { width:52px; height:52px; border-radius:14px; background:rgba(207,92,54,0.1); border:1px solid rgba(207,92,54,0.18); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .eb { display:inline-flex; align-items:center; gap:10px; padding:16px 24px; border-radius:12px; text-decoration:none; font-weight:700; font-size:16px; font-family:var(--font-urbanist,'Urbanist',sans-serif); transition:background .25s,color .25s; width:100%; box-sizing:border-box; justify-content:flex-start; }
        .eb-p { background:var(--color-navy-dark,#172531); color:#fff; border:2px solid var(--color-navy-dark,#172531); }
        .eb-p:hover { background:transparent; color:var(--color-navy-dark,#172531); }
        .eb-s { background:transparent; color:var(--color-navy-dark,#172531); border:2px solid var(--color-navy-dark,#172531); }
        .eb-s:hover { background:var(--color-navy-dark,#172531); color:#fff; }
        .ico { position:relative; max-width:515px; margin:0 auto; border-radius:22px; padding:1.5px; background:linear-gradient(135deg,rgba(239,200,139,0.4) 0%,rgba(207,92,54,0.2) 15%,transparent 35%,transparent 65%,rgba(207,92,54,0.15) 85%,rgba(239,200,139,0.35) 100%); }
        .ici { border-radius:20px; overflow:hidden; background:linear-gradient(160deg,#2C4657 0%,#172531 100%); }
        .bc { height:48px; padding:0 32px; line-height:1; background:var(--color-terracotta,#CF5C36); color:#fff; border:2px solid var(--color-terracotta,#CF5C36); border-radius:12px; font-size:15px; font-weight:700; text-decoration:none; font-family:var(--font-urbanist,'Urbanist',sans-serif); display:inline-flex; align-items:center; justify-content:center; gap:8px; transition:background .25s,color .25s; }
        .bc:hover { background:#fff; color:var(--color-terracotta,#CF5C36); }
        .contact-header { min-height:393px; height:393px; overflow:hidden; }
        @media (max-width: 768px) {
          .contact-header { height:auto !important; min-height:368px !important; padding:80px 0 88px !important; overflow:hidden; }
          .cg { grid-template-columns:1fr; gap:48px; }
          .ci { display:none; }
          .bc { width:100%; box-sizing:border-box; height:48px; justify-content:center; }
          .eb { width:100%; box-sizing:border-box; height:48px; }
        }

  /* Widow control. "balance" evens short headings so the last line isn't one
     orphaned word; "pretty" does the same for body copy without re-flowing the
     whole paragraph. Both fall back to normal wrapping where unsupported. */
  h1, h2, h3 { text-wrap: balance; }
  p, li { text-wrap: pretty; }
      `}</style>

      {/* HEADER — minHeight 393px desktop, 368px mobile */}
      <div
        className="contact-header"
        style={{
          background: "var(--color-navy-dark, #172531)",
          padding: "80px 0 88px",
          minHeight: "393px",
          position: "relative",
          overflow: "hidden",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse 75% 85% at 50% 50%, rgba(44,70,87,0.5) 0%, rgba(23,37,49,0) 45%, rgba(10,18,26,0.6) 80%, rgba(6,12,18,0.85) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "linear-gradient(to right, rgba(6,14,22,0.65) 0%, rgba(6,14,22,0.18) 18%, transparent 35%, transparent 65%, rgba(6,14,22,0.18) 82%, rgba(6,14,22,0.65) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "linear-gradient(to bottom, rgba(6,14,22,0.45) 0%, transparent 28%, transparent 72%, rgba(6,14,22,0.45) 100%)",
          }}
        />

        {isMobile && (
          <svg
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
            viewBox="0 0 1440 368"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient
                id="goldChromeMobile"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#CF5C36" stopOpacity="0.5" />
                <stop offset="18%" stopColor="#EFC88B" stopOpacity="0.85" />
                <stop offset="38%" stopColor="#FFF4DC" stopOpacity="1" />
                <stop offset="52%" stopColor="#EFC88B" stopOpacity="1" />
                <stop offset="68%" stopColor="#FFF4DC" stopOpacity="0.95" />
                <stop offset="84%" stopColor="#EFC88B" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#CF5C36" stopOpacity="0.45" />
              </linearGradient>
              <linearGradient
                id="silverChromeMobile"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#EFC88B" stopOpacity="0.3" />
                <stop offset="25%" stopColor="rgba(255,255,255,0.8)" />
                <stop offset="50%" stopColor="#FFF4DC" stopOpacity="1" />
                <stop offset="75%" stopColor="rgba(255,255,255,0.8)" />
                <stop offset="100%" stopColor="#EFC88B" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            {ARC_RADII.map((r, i) => {
              const sx = 720 - r,
                ex = 720 + r;
              const isGold = i % 2 === 1;
              const sw = Math.max(0.7, 1.4 - i * 0.08);
              const op = Math.max(0.1, 0.25 - i * 0.015);
              return (
                <path
                  key={i}
                  d={`M ${sx},368 A ${r},${r} 0 0,1 ${ex},368`}
                  fill="none"
                  stroke={
                    isGold
                      ? "url(#goldChromeMobile)"
                      : "url(#silverChromeMobile)"
                  }
                  strokeWidth={sw}
                  strokeLinecap="round"
                  opacity={op}
                />
              );
            })}
          </svg>
        )}

        {!isMobile && (
          <svg
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              width: "100%",
              height: "1px",
              overflow: "visible",
              pointerEvents: "none",
            }}
            viewBox="0 0 1440 1"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMax meet"
          >
            <defs>
              <linearGradient id="goldChrome" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#CF5C36" stopOpacity="0.5" />
                <stop offset="18%" stopColor="#EFC88B" stopOpacity="0.85" />
                <stop offset="38%" stopColor="#FFF4DC" stopOpacity="1" />
                <stop offset="52%" stopColor="#EFC88B" stopOpacity="1" />
                <stop offset="68%" stopColor="#FFF4DC" stopOpacity="0.95" />
                <stop offset="84%" stopColor="#EFC88B" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#CF5C36" stopOpacity="0.45" />
              </linearGradient>
              <radialGradient id="dotGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#EFC88B" stopOpacity="0.7" />
                <stop offset="60%" stopColor="#CF5C36" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#CF5C36" stopOpacity="0.1" />
              </radialGradient>
              <linearGradient
                id="silverChrome"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#EFC88B" stopOpacity="0.3" />
                <stop offset="25%" stopColor="rgba(255,255,255,0.8)" />
                <stop offset="50%" stopColor="#FFF4DC" stopOpacity="1" />
                <stop offset="75%" stopColor="rgba(255,255,255,0.8)" />
                <stop offset="100%" stopColor="#EFC88B" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            <circle
              cx="720"
              cy="1"
              r="34"
              fill="url(#goldChrome)"
              stroke="none"
              fillOpacity="0.32"
              opacity={dotVisible ? (animDone ? 0.22 : 0.26) : 0}
              style={
                dotVisible && !animDone
                  ? {
                      animation:
                        "dotRise 0.55s cubic-bezier(0.22,1,0.36,1) forwards",
                    }
                  : { transition: "opacity 0.8s ease, fill-opacity 0.8s ease" }
              }
            />
            {ARC_RADII.map((r, i) => {
              const sx = 720 - r,
                ex = 720 + r;
              const isGold = i % 2 === 1;
              const sw = Math.max(0.7, 1.4 - i * 0.08);
              const staticOp = Math.max(0.1, 0.25 - i * 0.015);
              if (animDone) {
                return (
                  <path
                    key={i}
                    d={`M ${sx},1 A ${r},${r} 0 0,1 ${ex},1`}
                    fill="none"
                    stroke={isGold ? "url(#goldChrome)" : "url(#silverChrome)"}
                    strokeWidth={sw}
                    strokeLinecap="round"
                    opacity={staticOp}
                  />
                );
              }
              const isPulsing = pulseIndex === i;
              const hasPulsed = pulseIndex > i;
              return (
                <path
                  key={i}
                  d={`M ${sx},1 A ${r},${r} 0 0,1 ${ex},1`}
                  fill="none"
                  stroke={
                    isGold ? "rgba(239,200,139,1)" : "rgba(255,255,255,1)"
                  }
                  strokeWidth={isPulsing ? 2.2 : sw}
                  strokeLinecap="round"
                  opacity={isPulsing ? 0.85 : hasPulsed ? staticOp * 0.6 : 0}
                  style={
                    isPulsing
                      ? {
                          animation: `arcPulse ${PULSE_DURATION}ms ease-out forwards`,
                        }
                      : { transition: "opacity 0.4s ease-out" }
                  }
                />
              );
            })}
          </svg>
        )}

        <div
          className="pp-container"
          style={{ position: "relative", zIndex: 2 }}
        >
          <p
            style={{
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--color-gold,#EFC88B)",
              marginBottom: "12px",
            }}
          >
            Say Hello
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
            We'd love to
            <br />
            hear from you.
          </h1>
          <p
            style={{
              fontSize: "17px",
              fontWeight: 500,
              color: "rgba(255,255,255,0.65)",
              margin: 0,
              maxWidth: "460px",
              lineHeight: "1.75",
            }}
          >
            We're a small team building something we believe in. Every message
            gets read.
          </p>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <section
        style={{ background: "var(--color-cream,#F5F0E8)", padding: "88px 0" }}
      >
        <div className="pp-container">
          <div className="cg">
            <div
              ref={contentRef}
              className={`rl${contentVisible ? " on" : ""}`}
            >
              <div style={{ marginBottom: "40px" }}>
                {REASONS.map((item) => (
                  <div key={item.label} className="cr">
                    <div className="ri">
                      <item.icon
                        size={34}
                        strokeWidth={2}
                        color="var(--color-terracotta,#CF5C36)"
                      />
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: "15px",
                          fontWeight: "700",
                          color: "var(--color-navy-dark,#172531)",
                          marginBottom: "4px",
                          fontFamily:
                            "var(--font-urbanist,'Urbanist',sans-serif)",
                        }}
                      >
                        {item.label}
                      </p>
                      <p
                        style={{
                          fontSize: "16px",
                          fontWeight: 500,
                          color: "var(--color-slate,#4B5563)",
                          lineHeight: "1.7",
                          margin: 0,
                          maxWidth: "68ch",
                          textWrap: "pretty",
                        }}
                      >
                        {item.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <a href="mailto:info@petparrk.com" className="eb eb-p">
                  <Mail
                    size={16}
                    strokeWidth={2}
                    style={{ marginRight: "4px", verticalAlign: "middle" }}
                  />{" "}
                  info@petparrk.com
                </a>
                <a href="mailto:support@petparrk.com" className="eb eb-s">
                  <MessageCircle
                    size={16}
                    strokeWidth={2}
                    style={{ marginRight: "4px", verticalAlign: "middle" }}
                  />{" "}
                  support@petparrk.com
                </a>
              </div>
            </div>
            <div className={`ci rr${contentVisible ? " on" : ""} d1`}>
              <div className="ico">
                <div
                  className="ici"
                  style={{
                    width: "100%",
                    aspectRatio: "1/1",
                    padding: "18px",
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ArtContact width={500} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section
        style={{
          background: "var(--color-navy-dark,#172531)",
          paddingTop: "48px",
          paddingBottom: "0",
        }}
      >
        <div
          ref={ctaRef}
          className={`pp-container rv${ctaVisible ? " on" : ""}`}
          style={{
            textAlign: "center",
            paddingBottom: "48px",
          }}
        >
          <p
            style={{
              fontSize: "17px",
              maxWidth: "62ch",
              marginLeft: "auto",
              marginRight: "auto",
              fontWeight: 500,
              color: "rgba(255,255,255,0.65)",
              lineHeight: "1.7",
              marginBottom: "24px",
            }}
          >
            Not sure where to start? Take a look at the vets we've verified so
            far across California. Browsing is free.
          </p>
          <Link href="/vets" className="bc">
            Find a Vet{" "}
            <ArrowRight
              size={14}
              strokeWidth={2.4}
              style={{ marginLeft: "4px", verticalAlign: "middle" }}
            />
          </Link>
        </div>
        <div
          style={{
            height: "1px",
            background:
              "linear-gradient(to right,rgba(255,255,255,0),rgba(255,255,255,0.2) 20%,rgba(255,255,255,0.2) 80%,rgba(255,255,255,0))",
            margin: 0,
          }}
        />
      </section>
    </>
  );
}
