"use client";

import { useEffect, useState, useRef } from "react";
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

function formatPhone(phone) {
  if (!phone) return null;
  const d = phone.replace(/\D/g, "");
  if (d.length === 10)
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === "1")
    return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return phone;
}

const PRICE_RANGES = [
  { label: "All", value: "all" },
  { label: "Under $75", value: "under75" },
  { label: "$75–$125", value: "75to125" },
  { label: "$125+", value: "over125" },
];

const PILLARS = [
  {
    icon: "💰",
    title: "Vet Pricing",
    description:
      "Compare real exam fees, dental costs, and more before you walk in. No surprises.",
    cta: "Find a Vet",
    href: "#vet-directory",
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
    cta: "Coming Soon",
    href: "/profile",
  },
];

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [savedVetIds, setSavedVetIds] = useState(new Set());
  const [animatingId, setAnimatingId] = useState(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(null);
  const [avatarError, setAvatarError] = useState(false);
  const dropdownRef = useRef(null);
  const [vets, setVets] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [neighborhood, setNeighborhood] = useState("All");
  const [search, setSearch] = useState("");
  const [ownership, setOwnership] = useState("All");
  const [sortBy, setSortBy] = useState("price");
  const [vetTypeFilter, setVetTypeFilter] = useState("All");
  const [acceptingFilter, setAcceptingFilter] = useState("All");
  const [priceRange, setPriceRange] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    vet_name: "",
    service_name: "",
    price_paid: "",
    visit_date: "",
    submitter_note: "",
  });
  const [formStatus, setFormStatus] = useState(null);
  const [heroSearch, setHeroSearch] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (window.location.hash)
        window.history.replaceState(null, "", window.location.pathname);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => setSession(session));
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
    async function fetchSaved() {
      const { data } = await supabase
        .from("saved_vets")
        .select("vet_id")
        .eq("user_id", session.user.id);
      setSavedVetIds(new Set(data?.map((s) => s.vet_id) || []));
    }
    fetchSaved();
  }, [session]);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setProfileAvatarUrl(data.avatar_url);
      });
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

  const neighborhoods = [
    "All",
    ...new Set(
      vets
        .map((v) => v.neighborhood)
        .filter(Boolean)
        .sort(),
    ),
  ];

  const vetTypes = [
    "All",
    ...new Set(
      vets
        .flatMap((v) => (Array.isArray(v.vet_type) ? v.vet_type : [v.vet_type]))
        .filter((t) => t && typeof t === "string")
        .map((t) => t.trim())
        .sort(),
    ),
  ];

  const filtered = vets
    .filter((v) => neighborhood === "All" || v.neighborhood === neighborhood)
    .filter((v) => ownership === "All" || v.ownership === ownership)
    .filter((v) => {
      if (vetTypeFilter === "All") return true;
      const types = (Array.isArray(v.vet_type) ? v.vet_type : [v.vet_type])
        .filter((t) => t && typeof t === "string")
        .map((t) => t.trim());
      return types.includes(vetTypeFilter);
    })
    .filter((v) => {
      if (acceptingFilter === "All") return true;
      if (acceptingFilter === "Yes") return v.accepting_new_patients === true;
      if (acceptingFilter === "No") return v.accepting_new_patients === false;
      return true;
    })
    .filter((v) => {
      if (priceRange === "all") return true;
      const exam = prices[v.id]?.find(
        (p) => p.services?.name === "Doctor Exam",
      );
      const examPrice = exam?.price_low ?? null;
      if (examPrice === null) return false;
      if (priceRange === "under75") return examPrice < 75;
      if (priceRange === "75to125") return examPrice >= 75 && examPrice <= 125;
      if (priceRange === "over125") return examPrice > 125;
      return true;
    })
    .filter((v) => v.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "az") return a.name.localeCompare(b.name);
      const aExam = prices[a.id]?.find(
        (p) => p.services?.name === "Doctor Exam",
      );
      const bExam = prices[b.id]?.find(
        (p) => p.services?.name === "Doctor Exam",
      );
      const aPrice = aExam?.price_low ?? null;
      const bPrice = bExam?.price_low ?? null;
      if (aPrice === null && bPrice === null) return 0;
      if (aPrice === null) return 1;
      if (bPrice === null) return -1;
      return aPrice - bPrice;
    });

  // 3 teaser vets — cheapest exam price
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

  const handleSubmit = async () => {
    if (!formData.vet_name || !formData.service_name || !formData.price_paid) {
      setFormStatus("error");
      return;
    }
    const { error } = await supabase.from("price_submissions").insert([
      {
        vet_name: formData.vet_name,
        service_name: formData.service_name,
        price_paid: parseFloat(formData.price_paid),
        visit_date: formData.visit_date || null,
        submitter_note: formData.submitter_note || null,
      },
    ]);
    if (error) {
      setFormStatus("error");
      return;
    }
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    if (currentSession) {
      fetch("/api/notify-submission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({
          vet_name: formData.vet_name,
          service_name: formData.service_name,
          price_paid: parseFloat(formData.price_paid),
          visit_date: formData.visit_date || null,
          submitter_note: formData.submitter_note || null,
        }),
      }).catch(() => {});
    }
    setFormStatus("success");
    setFormData({
      vet_name: "",
      service_name: "",
      price_paid: "",
      visit_date: "",
      submitter_note: "",
    });
  };

  function handleHeroSearch(e) {
    e.preventDefault();
    setSearch(heroSearch);
    document
      .getElementById("vet-directory")
      ?.scrollIntoView({ behavior: "smooth" });
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

        .vet-card { border: 1px solid var(--color-border, #EDE8E0); border-radius: 16px; padding: 20px; background: #fff; transition: box-shadow 0.2s ease, transform 0.2s ease; box-shadow: 0 2px 8px rgba(23,37,49,0.06); }
        .vet-card:hover { box-shadow: 0 8px 32px rgba(23,37,49,0.12); transform: translateY(-2px); }

        .pillar-card { background: #fff; border: 1px solid var(--color-border, #EDE8E0); border-radius: 20px; padding: 28px 24px; transition: box-shadow 0.2s ease, transform 0.2s ease; box-shadow: 0 2px 8px rgba(23,37,49,0.05); }
        .pillar-card:hover { box-shadow: 0 8px 24px rgba(23,37,49,0.10); transform: translateY(-2px); }

        .filter-pill { padding: 7px 14px; border-radius: 20px; border: 1px solid #EDE8E0; background: #fff; color: var(--color-ink, #1A1A1A); cursor: pointer; font-size: 13px; font-weight: 500; font-family: var(--font, 'Urbanist', sans-serif); transition: all 0.15s ease; white-space: nowrap; }
        .filter-pill:hover { border-color: var(--color-navy-dark, #172531); }
        .filter-pill.active { background: var(--color-navy-dark, #172531); color: #fff; border-color: var(--color-navy-dark, #172531); }

        .pp-select { padding: 8px 14px; border-radius: 10px; border: 1px solid #EDE8E0; font-size: 14px; font-family: var(--font, 'Urbanist', sans-serif); background: #fff; color: var(--color-ink, #1A1A1A); outline: none; cursor: pointer; }
        .pp-select:focus { border-color: var(--color-terracotta, #CF5C36); }

        .hero-search { width: 100%; padding: 16px 20px; border-radius: 12px; border: 2px solid transparent; font-size: 16px; font-family: var(--font, 'Urbanist', sans-serif); background: #fff; color: var(--color-ink, #1A1A1A); outline: none; box-shadow: 0 4px 24px rgba(23,37,49,0.12); transition: border-color 0.15s; box-sizing: border-box; }
        .hero-search:focus { border-color: var(--color-terracotta, #CF5C36); }
        .hero-search::placeholder { color: #9CA3AF; }

        .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; white-space: nowrap; }
        .badge-navy { background: #EBF0F5; color: #2C4657; }
        .badge-success { background: #EDFAF3; color: #1A6641; }
        .badge-error { background: #FCEAEA; color: #C94040; }
        .badge-terra { background: #FEF3EB; color: #8B3A1E; }

        .price-chip { display: inline-flex; align-items: center; gap: 4px; background: var(--color-cream, #F5F0E8); border-radius: 8px; padding: 5px 10px; font-size: 13px; }
        .price-chip-label { color: var(--color-muted, #9CA3AF); }
        .price-chip-value { font-weight: 700; color: var(--color-terracotta, #CF5C36); }

        .section-divider { border: none; border-top: 1px solid var(--color-border, #EDE8E0); margin: 0; }

        .submit-input { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1.5px solid #EDE8E0; font-size: 14px; font-family: var(--font, 'Urbanist', sans-serif); background: #fff; outline: none; box-sizing: border-box; transition: border-color 0.15s; }
        .submit-input:focus { border-color: var(--color-terracotta, #CF5C36); }
      `}</style>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section
        style={{
          background: "var(--color-navy-mid, #2C4657)",
          padding: "64px 20px 80px",
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
            East Bay · Oakland · Berkeley
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
            Real vet prices for the East Bay. Compare costs, check symptoms, and
            take control of your pet's health.
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
              placeholder="Search vets by name or neighborhood..."
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
          padding: "64px 20px",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
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
              Your pet's daily companion
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {PILLARS.map((pillar) => (
              <div key={pillar.title} className="pillar-card">
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "14px",
                    background: "var(--color-cream, #F5F0E8)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    marginBottom: "16px",
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
                  }}
                >
                  {pillar.description}
                </p>
                <a
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
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VET TEASERS ───────────────────────────────────────────── */}
      {!loading && teaserVets.length > 0 && (
        <section style={{ background: "#fff", padding: "64px 20px" }}>
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
                  Vets near you
                </h2>
              </div>
              <a
                href="#vet-directory"
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "var(--color-terracotta, #CF5C36)",
                  textDecoration: "none",
                }}
              >
                See all {vets.length} vets →
              </a>
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
                          onMouseEnter={(e) =>
                            (e.target.style.color =
                              "var(--color-terracotta, #CF5C36)")
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.color =
                              "var(--color-navy-dark, #172531)")
                          }
                        >
                          {vet.name}
                        </Link>
                        <p
                          style={{
                            fontSize: "13px",
                            color: "var(--color-muted, #9CA3AF)",
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
          padding: "40px 20px",
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
            { value: "Free", label: "Always free to use" },
            { value: "Real", label: "Prices from real visits" },
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

      {/* ── SIGN UP CTA (logged out only) ─────────────────────────── */}
      {session === null && (
        <section
          style={{
            background: "var(--color-cream, #F5F0E8)",
            padding: "64px 20px",
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

      {/* ── FULL VET DIRECTORY ────────────────────────────────────── */}
      <section
        id="vet-directory"
        style={{
          background: "var(--color-cream, #F5F0E8)",
          padding: "64px 20px 80px",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          {/* Directory header */}
          <div style={{ marginBottom: "32px" }}>
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
              Vet directory
            </p>
            <h2
              style={{
                fontSize: "clamp(22px, 3vw, 30px)",
                fontWeight: "800",
                color: "var(--color-navy-dark, #172531)",
                fontFamily: "var(--font, 'Urbanist', sans-serif)",
              }}
            >
              All vets in the East Bay
            </h2>
          </div>

          {/* Search */}
          <div style={{ marginBottom: "16px" }}>
            <input
              type="text"
              placeholder="Search vets by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1.5px solid var(--color-border, #EDE8E0)",
                fontSize: "15px",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "var(--font, 'Urbanist', sans-serif)",
                background: "#fff",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor =
                  "var(--color-terracotta, #CF5C36)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "var(--color-border, #EDE8E0)")
              }
            />
          </div>

          {/* Filters row */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <select
              className="pp-select"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
            >
              {neighborhoods.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>

            {vetTypes.length > 2 && (
              <select
                className="pp-select"
                value={vetTypeFilter}
                onChange={(e) => setVetTypeFilter(e.target.value)}
              >
                {vetTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}

            {["All", "Independent", "Corporate"].map((o) => (
              <button
                key={o}
                onClick={() => setOwnership(o)}
                className={`filter-pill${ownership === o ? " active" : ""}`}
              >
                {o}
              </button>
            ))}

            {[
              { label: "All", value: "All" },
              { label: "✓ Accepting", value: "Yes" },
              { label: "✕ Not accepting", value: "No" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAcceptingFilter(opt.value)}
                className={`filter-pill${acceptingFilter === opt.value ? " active" : ""}`}
              >
                {opt.label}
              </button>
            ))}

            {PRICE_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setPriceRange(r.value)}
                className={`filter-pill${priceRange === r.value ? " active" : ""}`}
              >
                {r.label}
              </button>
            ))}

            {[
              ["price", "💰 Cheapest"],
              ["az", "A–Z"],
            ].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setSortBy(val)}
                className={`filter-pill${sortBy === val ? " active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Result count */}
          <p
            style={{
              color: "var(--color-muted, #9CA3AF)",
              fontSize: "13px",
              marginBottom: "20px",
            }}
          >
            {loading
              ? "Loading…"
              : `${filtered.length} vet${filtered.length !== 1 ? "s" : ""} found`}
          </p>

          {/* Vet cards grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "16px",
            }}
          >
            {filtered.map((vet) => {
              const vetPrices = prices[vet.id] || [];
              const exam = vetPrices.find(
                (p) => p.services?.name === "Doctor Exam" && p.price_low,
              );
              const dental = vetPrices.find(
                (p) => p.services?.name === "Dental Cleaning" && p.price_low,
              );
              const spay = vetPrices.find(
                (p) => p.services?.name === "Spay (~40lb dog)" && p.price_low,
              );
              const neuter = vetPrices.find(
                (p) => p.services?.name === "Neuter (~40lb dog)" && p.price_low,
              );
              const lastUpdated = vet.last_verified
                ? new Date(vet.last_verified + "T12:00:00")
                : vetPrices.length > 0
                  ? new Date(
                      Math.max(...vetPrices.map((p) => new Date(p.created_at))),
                    )
                  : null;
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
                        onMouseEnter={(e) =>
                          (e.target.style.color =
                            "var(--color-terracotta, #CF5C36)")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.color =
                            "var(--color-navy-dark, #172531)")
                        }
                      >
                        {vet.name}
                      </Link>
                      <p
                        style={{
                          fontSize: "13px",
                          color: "var(--color-muted, #9CA3AF)",
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
                      <span className="badge badge-error">✕ Not accepting</span>
                    )}
                    {vet.ownership && (
                      <span className="badge badge-terra">{vet.ownership}</span>
                    )}
                  </div>

                  {vet.phone && (
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--color-slate, #4B5563)",
                        marginBottom: "4px",
                      }}
                    >
                      <a
                        href={`tel:${vet.phone}`}
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        {formatPhone(vet.phone)}
                      </a>
                    </p>
                  )}

                  {!exam && !dental && !spay && !neuter ? (
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--color-muted, #9CA3AF)",
                        fontStyle: "italic",
                        margin: "12px 0 0",
                      }}
                    >
                      No pricing available
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        marginTop: "10px",
                        flexWrap: "wrap",
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
                      {spay && (
                        <span className="price-chip">
                          <span className="price-chip-label">Spay</span>
                          <span className="price-chip-value">
                            {formatPrice(
                              spay.price_low,
                              spay.price_high,
                              spay.price_type,
                            )}
                          </span>
                        </span>
                      )}
                      {neuter && (
                        <span className="price-chip">
                          <span className="price-chip-label">Neuter</span>
                          <span className="price-chip-value">
                            {formatPrice(
                              neuter.price_low,
                              neuter.price_high,
                              neuter.price_type,
                            )}
                          </span>
                        </span>
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "14px",
                      borderTop: "1px solid var(--color-border, #EDE8E0)",
                      paddingTop: "10px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--color-muted, #9CA3AF)",
                      }}
                    >
                      {lastUpdated
                        ? `Verified ${lastUpdated.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
                        : ""}
                    </span>
                    <Link
                      href={`/vet/${vet.slug}`}
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "var(--color-terracotta, #CF5C36)",
                        textDecoration: "none",
                      }}
                    >
                      View profile →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* No results */}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <p style={{ fontSize: "32px", margin: "0 0 12px" }}>🔍</p>
              <p
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "var(--color-navy-dark, #172531)",
                  margin: "0 0 8px",
                }}
              >
                No vets found
              </p>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--color-muted, #9CA3AF)",
                  margin: 0,
                }}
              >
                Try adjusting your filters
              </p>
            </div>
          )}

          {/* Submit a Price */}
          <div style={{ marginTop: "60px", textAlign: "center" }}>
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-slate, #4B5563)",
                marginBottom: "12px",
              }}
            >
              Visited a vet recently? Help the community.
            </p>
            <button
              onClick={() => {
                setShowForm(!showForm);
                setFormStatus(null);
              }}
              style={{
                padding: "12px 28px",
                background: "var(--color-navy-dark, #172531)",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
                fontFamily: "var(--font, 'Urbanist', sans-serif)",
              }}
            >
              {showForm ? "Cancel" : "💰 Submit a Price"}
            </button>

            {showForm && (
              <div
                style={{
                  marginTop: "20px",
                  background: "#fff",
                  border: "1px solid var(--color-border, #EDE8E0)",
                  borderRadius: "16px",
                  padding: "28px",
                  textAlign: "left",
                  maxWidth: "500px",
                  margin: "20px auto 0",
                  boxShadow: "0 4px 16px rgba(23,37,49,0.08)",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 20px",
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "var(--color-navy-dark, #172531)",
                    fontFamily: "var(--font, 'Urbanist', sans-serif)",
                  }}
                >
                  Submit a Vet Price
                </h3>
                {[
                  "vet_name",
                  "service_name",
                  "price_paid",
                  "visit_date",
                  "submitter_note",
                ].map((field) => (
                  <div key={field} style={{ marginBottom: "14px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "var(--color-slate, #4B5563)",
                        marginBottom: "6px",
                      }}
                    >
                      {field === "vet_name"
                        ? "Vet Name *"
                        : field === "service_name"
                          ? "Service (e.g. Exam, Dental) *"
                          : field === "price_paid"
                            ? "Price Paid ($) *"
                            : field === "visit_date"
                              ? "Date of Visit (optional)"
                              : "Notes (optional)"}
                    </label>
                    <input
                      type={
                        field === "price_paid"
                          ? "number"
                          : field === "visit_date"
                            ? "date"
                            : "text"
                      }
                      value={formData[field]}
                      onChange={(e) =>
                        setFormData({ ...formData, [field]: e.target.value })
                      }
                      className="submit-input"
                    />
                  </div>
                ))}
                {formStatus === "error" && (
                  <p
                    style={{
                      color: "var(--color-error, #C94040)",
                      fontSize: "13px",
                      marginBottom: "8px",
                    }}
                  >
                    Please fill in all required fields.
                  </p>
                )}
                {formStatus === "success" && (
                  <p
                    style={{
                      color: "var(--color-success, #2A7D4F)",
                      fontSize: "13px",
                      marginBottom: "8px",
                    }}
                  >
                    Thanks! Your submission is under review.
                  </p>
                )}
                <button
                  onClick={handleSubmit}
                  style={{
                    padding: "12px 28px",
                    background: "var(--color-terracotta, #CF5C36)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontWeight: "700",
                    cursor: "pointer",
                    fontFamily: "var(--font, 'Urbanist', sans-serif)",
                  }}
                >
                  Submit
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

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
                ["Find a Vet", "/"],
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
                  onMouseEnter={(e) => (e.target.style.color = "#fff")}
                  onMouseLeave={(e) =>
                    (e.target.style.color = "rgba(255,255,255,0.6)")
                  }
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
                  onMouseEnter={(e) => (e.target.style.color = "#fff")}
                  onMouseLeave={(e) =>
                    (e.target.style.color = "rgba(255,255,255,0.6)")
                  }
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
                  onMouseEnter={(e) => (e.target.style.color = "#fff")}
                  onMouseLeave={(e) =>
                    (e.target.style.color = "rgba(255,255,255,0.6)")
                  }
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
              © 2026 PetParrk. Pricing data is self-reported and verified by our
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
