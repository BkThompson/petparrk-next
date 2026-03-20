"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import Link from "next/link";

function formatPrice(low, high, type) {
  if (!low) return null;
  if (type === "starting") return `$${Number(low).toLocaleString()}+`;
  if (type === "range")
    return `$${Number(low).toLocaleString()}–$${Number(high).toLocaleString()}`;
  if (!high || low === high) return `$${Number(low).toLocaleString()}`;
  return `$${Number(low).toLocaleString()}–$${Number(high).toLocaleString()}`;
}

const PILLARS = [
  {
    icon: "💰",
    title: "Vet Pricing",
    description:
      "Compare real exam fees, dental costs, and more before you walk in. No surprises.",
    cta: "Find a Vet",
    href: "/vets",
  },
  {
    icon: "🩺",
    title: "Symptom Checker",
    description:
      "Not sure if it's an emergency? Get instant AI triage guidance — 24/7, free.",
    cta: "Check Symptoms",
    href: "/symptom-checker",
  },
  {
    icon: "📋",
    title: "Pet Health Card",
    description:
      "Build your pet's health history over time. Records and vet visits in one place.",
    cta: "View Health Card",
    href: "/profile",
  },
];

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [vets, setVets] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [savedVetIds, setSavedVetIds] = useState(new Set());
  const [animatingId, setAnimatingId] = useState(null);
  const [heroSearch, setHeroSearch] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (window.location.hash)
        window.history.replaceState(null, "", window.location.pathname);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchData() {
      const { data: vetData } = await supabase
        .from("vets")
        .select("*")
        .eq("status", "active")
        .order("name");
      const { data: priceData } = await supabase
        .from("vet_prices")
        .select("*, services(name)");
      const priceMap = {};
      priceData?.forEach((p) => {
        if (!priceMap[p.vet_id]) priceMap[p.vet_id] = [];
        priceMap[p.vet_id].push(p);
      });
      setVets(vetData || []);
      setPrices(priceMap);
      setLoading(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("saved_vets")
      .select("vet_id")
      .eq("user_id", session.user.id)
      .then(({ data }) =>
        setSavedVetIds(new Set(data?.map((s) => s.vet_id) || [])),
      );
  }, [session]);

  async function toggleSave(e, vetId) {
    e.preventDefault();
    e.stopPropagation();
    if (!session) {
      router.push("/auth");
      return;
    }
    setAnimatingId(vetId);
    setTimeout(() => setAnimatingId(null), 400);
    if (savedVetIds.has(vetId)) {
      await supabase
        .from("saved_vets")
        .delete()
        .eq("user_id", session.user.id)
        .eq("vet_id", vetId);
      setSavedVetIds((prev) => {
        const next = new Set(prev);
        next.delete(vetId);
        return next;
      });
    } else {
      await supabase
        .from("saved_vets")
        .insert({ user_id: session.user.id, vet_id: vetId });
      setSavedVetIds((prev) => new Set([...prev, vetId]));
    }
  }

  const teaserVets = [...vets]
    .filter((v) =>
      prices[v.id]?.find(
        (p) => p.services?.name === "Doctor Exam" && p.price_low,
      ),
    )
    .sort((a, b) => {
      const aP =
        prices[a.id]?.find((p) => p.services?.name === "Doctor Exam")
          ?.price_low ?? 999;
      const bP =
        prices[b.id]?.find((p) => p.services?.name === "Doctor Exam")
          ?.price_low ?? 999;
      return aP - bP;
    })
    .slice(0, 3);

  function handleHeroSearch(e) {
    e.preventDefault();
    if (heroSearch.trim()) {
      router.push(`/vets?search=${encodeURIComponent(heroSearch.trim())}`);
    } else {
      router.push("/vets");
    }
  }

  return (
    <>
      <style>{`
        @keyframes heartPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.5); }
          70%  { transform: scale(0.85); }
          100% { transform: scale(1); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .heart-btn { transition: transform 0.1s; border: none; background: none; cursor: pointer; padding: 0; font-size: 20px; line-height: 1; }
        .heart-btn:hover { transform: scale(1.15); }
        .heart-animating { animation: heartPop 0.4s ease forwards; }
        .anim-1 { animation: fadeSlideUp 0.5s ease forwards; }
        .anim-2 { animation: fadeSlideUp 0.5s 0.1s ease both; }
        .anim-3 { animation: fadeSlideUp 0.5s 0.2s ease both; }
        .anim-4 { animation: fadeSlideUp 0.5s 0.3s ease both; }

        .pillar-card { background: #fff; border: 1px solid var(--color-border, #EDE8E0); border-radius: 20px; padding: 28px 24px; transition: box-shadow 0.2s ease, transform 0.2s ease; box-shadow: 0 2px 8px rgba(23,37,49,0.05); }
        .pillar-card:hover { box-shadow: 0 8px 24px rgba(23,37,49,0.10); transform: translateY(-2px); }

        .vet-card { border: 1px solid var(--color-border, #EDE8E0); border-radius: 16px; padding: 20px; background: #fff; transition: box-shadow 0.2s ease, transform 0.2s ease; box-shadow: 0 2px 8px rgba(23,37,49,0.06); }
        .vet-card:hover { box-shadow: 0 8px 32px rgba(23,37,49,0.12); transform: translateY(-2px); }

        .hero-search { width: 100%; padding: 16px 130px 16px 20px; border-radius: 12px; border: 2px solid transparent; font-size: 16px; font-family: var(--font, 'Urbanist', sans-serif); background: #fff; color: #1A1A1A; outline: none; box-shadow: 0 4px 24px rgba(23,37,49,0.12); transition: border-color 0.15s; box-sizing: border-box; }
        .hero-search:focus { border-color: var(--color-terracotta, #CF5C36); }
        .hero-search::placeholder { color: #9CA3AF; }

        .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; white-space: nowrap; }
        .badge-navy { background: #EBF0F5; color: #2C4657; }
        .badge-success { background: #EDFAF3; color: #1A6641; }
        .badge-error { background: #FCEAEA; color: #C94040; }

        .price-chip { display: inline-flex; align-items: center; gap: 4px; background: var(--color-cream, #F5F0E8); border-radius: 8px; padding: 5px 10px; font-size: 13px; }
        .price-chip-label { color: #9CA3AF; }
        .price-chip-value { font-weight: 700; color: var(--color-terracotta, #CF5C36); }

        .pillars-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        @media (max-width: 768px) { .pillars-grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section
        style={{
          background: "var(--color-navy-mid, #2C4657)",
          padding: "72px 20px 88px",
        }}
      >
        <div
          style={{ maxWidth: "720px", margin: "0 auto", textAlign: "center" }}
        >
          <p
            className="anim-1"
            style={{
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--color-gold, #EFC88B)",
              marginBottom: "16px",
            }}
          >
            San Francisco Bay Area
          </p>
          <h1
            className="anim-2"
            style={{
              fontSize: "clamp(32px, 6vw, 56px)",
              fontWeight: "800",
              color: "#fff",
              lineHeight: "1.1",
              marginBottom: "16px",
              fontFamily: "var(--font, 'Urbanist', sans-serif)",
            }}
          >
            Know what you'll pay
            <br />
            before you go.
          </h1>
          <p
            className="anim-3"
            style={{
              fontSize: "18px",
              color: "rgba(255,255,255,0.75)",
              lineHeight: "1.7",
              marginBottom: "36px",
            }}
          >
            Real vet prices across the Bay Area. Compare costs, check symptoms,
            and take control of your pet's health.
          </p>
          <form
            className="anim-4"
            onSubmit={handleHeroSearch}
            style={{
              position: "relative",
              maxWidth: "560px",
              margin: "0 auto",
            }}
          >
            <input
              type="text"
              className="hero-search"
              placeholder="Search vets by name..."
              value={heroSearch}
              onChange={(e) => setHeroSearch(e.target.value)}
            />
            <button
              type="submit"
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "var(--color-terracotta, #CF5C36)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
                fontFamily: "var(--font, 'Urbanist', sans-serif)",
                whiteSpace: "nowrap",
              }}
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* ── THREE PILLARS ─────────────────────────────────────────── */}
      <section
        style={{
          background: "var(--color-cream, #F5F0E8)",
          padding: "72px 20px",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <p
              style={{
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--color-terracotta, #CF5C36)",
                marginBottom: "12px",
              }}
            >
              What PetParrk does
            </p>
            <h2
              style={{
                fontSize: "clamp(24px, 4vw, 36px)",
                fontWeight: "800",
                color: "var(--color-navy-dark, #172531)",
                lineHeight: "1.2",
                fontFamily: "var(--font, 'Urbanist', sans-serif)",
              }}
            >
              Your pet's health companion
            </h2>
          </div>
          <div className="pillars-grid">
            {PILLARS.map((pillar) => (
              <div key={pillar.title} className="pillar-card">
                <div
                  style={{
                    fontSize: "48px",
                    marginBottom: "16px",
                    textAlign: "center",
                  }}
                >
                  {pillar.icon}
                </div>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "var(--color-navy-dark, #172531)",
                    marginBottom: "8px",
                    fontFamily: "var(--font, 'Urbanist', sans-serif)",
                    textAlign: "center",
                  }}
                >
                  {pillar.title}
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--color-slate, #4B5563)",
                    lineHeight: "1.7",
                    marginBottom: "20px",
                    textAlign: "center",
                  }}
                >
                  {pillar.description}
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Link
                    href={pillar.href}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "var(--color-terracotta, #CF5C36)",
                      textDecoration: "none",
                    }}
                  >
                    {pillar.cta} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VET TEASERS ───────────────────────────────────────────── */}
      {!loading && teaserVets.length > 0 && (
        <section style={{ background: "#fff", padding: "72px 20px" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginBottom: "32px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--color-terracotta, #CF5C36)",
                    marginBottom: "8px",
                  }}
                >
                  Real data, right now
                </p>
                <h2
                  style={{
                    fontSize: "clamp(22px, 3vw, 30px)",
                    fontWeight: "800",
                    color: "var(--color-navy-dark, #172531)",
                    lineHeight: "1.2",
                    fontFamily: "var(--font, 'Urbanist', sans-serif)",
                  }}
                >
                  Affordable vets near you
                </h2>
              </div>
              <Link
                href="/vets"
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "var(--color-terracotta, #CF5C36)",
                  textDecoration: "none",
                }}
              >
                See all vets →
              </Link>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "16px",
              }}
            >
              {teaserVets.map((vet) => {
                const vetPrices = prices[vet.id] || [];
                const exam = vetPrices.find(
                  (p) => p.services?.name === "Doctor Exam" && p.price_low,
                );
                const dental = vetPrices.find(
                  (p) => p.services?.name === "Dental Cleaning" && p.price_low,
                );
                const isSaved = savedVetIds.has(vet.id);
                const isAnimating = animatingId === vet.id;
                return (
                  <div key={vet.id} className="vet-card">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "8px",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <Link
                          href={`/vet/${vet.slug}`}
                          style={{
                            fontSize: "16px",
                            fontWeight: "700",
                            color: "var(--color-navy-dark, #172531)",
                            textDecoration: "none",
                            fontFamily: "var(--font, 'Urbanist', sans-serif)",
                          }}
                        >
                          {vet.name}
                        </Link>
                        <p
                          style={{
                            fontSize: "13px",
                            color: "#9CA3AF",
                            margin: "2px 0 0",
                          }}
                        >
                          {[vet.neighborhood, vet.city]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <button
                        onClick={(e) => toggleSave(e, vet.id)}
                        className={`heart-btn${isAnimating ? " heart-animating" : ""}`}
                        title={isSaved ? "Remove from saved" : "Save this vet"}
                      >
                        {isSaved ? "❤️" : "🤍"}
                      </button>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                        marginBottom: "12px",
                      }}
                    >
                      {(Array.isArray(vet.vet_type)
                        ? vet.vet_type
                        : [vet.vet_type]
                      )
                        .filter(Boolean)
                        .map((t) => (
                          <span key={t} className="badge badge-navy">
                            {t}
                          </span>
                        ))}
                      {vet.accepting_new_patients === true && (
                        <span className="badge badge-success">✓ Accepting</span>
                      )}
                      {vet.accepting_new_patients === false && (
                        <span className="badge badge-error">
                          ✕ Not accepting
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                        marginBottom: "14px",
                      }}
                    >
                      {exam && (
                        <span className="price-chip">
                          <span className="price-chip-label">Exam</span>
                          <span className="price-chip-value">
                            {formatPrice(
                              exam.price_low,
                              exam.price_high,
                              exam.price_type,
                            )}
                          </span>
                        </span>
                      )}
                      {dental && (
                        <span className="price-chip">
                          <span className="price-chip-label">Dental</span>
                          <span className="price-chip-value">
                            {formatPrice(
                              dental.price_low,
                              dental.price_high,
                              dental.price_type,
                            )}
                          </span>
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        borderTop: "1px solid var(--color-border, #EDE8E0)",
                        paddingTop: "12px",
                      }}
                    >
                      <Link
                        href={`/vet/${vet.slug}`}
                        style={{
                          fontSize: "13px",
                          fontWeight: "700",
                          color: "var(--color-terracotta, #CF5C36)",
                          textDecoration: "none",
                        }}
                      >
                        View full profile →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── TRUST STRIP ───────────────────────────────────────────── */}
      <section
        style={{
          background: "var(--color-navy-dark, #172531)",
          padding: "48px 20px",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "32px",
            textAlign: "center",
          }}
        >
          {[
            { value: `${vets.length}+`, label: "Verified vets" },
            { value: "Free", label: "No account required to browse" },
            {
              value: "Staff-verified",
              label: "Every price reviewed before it goes live",
            },
          ].map((stat) => (
            <div key={stat.label}>
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: "800",
                  color: "var(--color-gold, #EFC88B)",
                  fontFamily: "var(--font, 'Urbanist', sans-serif)",
                  marginBottom: "4px",
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── DIVIDER ──────────────────────────────────────────────────── */}
      <div
        style={{ height: "1px", background: "var(--color-border, #EDE8E0)" }}
      />

      {/* ── SIGN UP CTA (logged out only) ─────────────────────────── */}
      {session === null && (
        <section
          style={{
            background: "var(--color-cream, #F5F0E8)",
            padding: "72px 20px",
          }}
        >
          <div
            style={{ maxWidth: "560px", margin: "0 auto", textAlign: "center" }}
          >
            <h2
              style={{
                fontSize: "clamp(24px, 4vw, 32px)",
                fontWeight: "800",
                color: "var(--color-navy-dark, #172531)",
                marginBottom: "12px",
                fontFamily: "var(--font, 'Urbanist', sans-serif)",
              }}
            >
              Save vets. Track your pet's health.
            </h2>
            <p
              style={{
                fontSize: "16px",
                color: "var(--color-slate, #4B5563)",
                lineHeight: "1.7",
                marginBottom: "28px",
              }}
            >
              Create a free account to save vets, run symptom checks, and build
              your pet's health history.
            </p>
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/auth"
                style={{
                  padding: "14px 32px",
                  background: "var(--color-terracotta, #CF5C36)",
                  color: "#fff",
                  borderRadius: "12px",
                  fontSize: "16px",
                  fontWeight: "700",
                  textDecoration: "none",
                  fontFamily: "var(--font, 'Urbanist', sans-serif)",
                }}
              >
                Create free account
              </Link>
              <Link
                href="/auth"
                style={{
                  padding: "13px 32px",
                  background: "transparent",
                  color: "var(--color-navy-dark, #172531)",
                  border: "2px solid var(--color-navy-dark, #172531)",
                  borderRadius: "12px",
                  fontSize: "16px",
                  fontWeight: "700",
                  textDecoration: "none",
                  fontFamily: "var(--font, 'Urbanist', sans-serif)",
                }}
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer
        style={{
          background: "var(--color-navy-dark, #172531)",
          padding: "48px 20px 40px",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "32px",
              marginBottom: "40px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "800",
                  color: "#fff",
                  marginBottom: "8px",
                  fontFamily: "var(--font, 'Urbanist', sans-serif)",
                }}
              >
                PetParrk
              </div>
              <p
                style={{
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.5)",
                  lineHeight: "1.7",
                  margin: 0,
                }}
              >
                Real prices. Real vets.
                <br />
                No surprises.
              </p>
            </div>
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "var(--color-gold, #EFC88B)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                }}
              >
                Product
              </div>
              {[
                ["Find a Vet", "/vets"],
                ["Symptom Checker", "/symptom-checker"],
                ["How It Works", "/how-it-works"],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: "block",
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.6)",
                    textDecoration: "none",
                    marginBottom: "8px",
                  }}
                >
                  {label}
                </Link>
              ))}
            </div>
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "var(--color-gold, #EFC88B)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                }}
              >
                Company
              </div>
              {[
                ["About", "/about"],
                ["Contact", "/contact"],
                ["Press", "/press"],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: "block",
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.6)",
                    textDecoration: "none",
                    marginBottom: "8px",
                  }}
                >
                  {label}
                </Link>
              ))}
            </div>
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "var(--color-gold, #EFC88B)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                }}
              >
                Legal
              </div>
              {[
                ["Privacy Policy", "/privacy-policy"],
                ["Terms of Service", "/terms"],
                ["Your Privacy Choices", "/privacy-policy"],
              ].map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  style={{
                    display: "block",
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.6)",
                    textDecoration: "none",
                    marginBottom: "8px",
                  }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.1)",
              paddingTop: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "rgba(255,255,255,0.4)",
                margin: 0,
              }}
            >
              © 2026 PetParrk. Prices are community-sourced and verified by our
              team. Always call to confirm before your visit.
            </p>
            <a
              href="mailto:bkalthompson@gmail.com"
              style={{
                fontSize: "13px",
                color: "rgba(255,255,255,0.5)",
                textDecoration: "none",
              }}
            >
              bkalthompson@gmail.com
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
