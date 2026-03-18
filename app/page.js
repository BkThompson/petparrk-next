"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import Link from "next/link";
import Navbar from "../components/Navbar";

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

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [savedVetIds, setSavedVetIds] = useState(new Set());
  const [animatingId, setAnimatingId] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
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

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    setShowDropdown(false);
    await supabase.auth.signOut();
    router.push("/auth");
  }

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

  const avatarLetter = session?.user?.email?.[0]?.toUpperCase();
  const avatarUrl =
    (!avatarError &&
      (profileAvatarUrl || session?.user?.user_metadata?.avatar_url)) ||
    null;

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

    // Only send notification email if user is logged in (route requires auth)
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

  return (
    <>
      <style>{`
        @keyframes heartPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.5); }
          70%  { transform: scale(0.85); }
          100% { transform: scale(1); }
        }
        .heart-btn { transition: transform 0.1s; border: none; background: none; cursor: pointer; padding: 0; font-size: 20px; line-height: 1; }
        .heart-btn:hover { transform: scale(1.15); }
        .heart-animating { animation: heartPop 0.4s ease forwards; }
        .avatar-dropdown-item {
          display: block;
          width: 100%;
          padding: 10px 16px;
          text-align: left;
          background: none;
          border: none;
          font-size: 13px;
          cursor: pointer;
          color: #333;
          white-space: nowrap;
          box-sizing: border-box;
        }
        .avatar-dropdown-item:hover { background: #f5f5f5; }
        .avatar-dropdown-item.danger { color: #555; }
        .avatar-dropdown-item.danger:hover { background: #f5f5f5; }
      `}</style>

      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "20px",
          fontFamily: "system-ui, sans-serif",
          minHeight: "100vh",
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "relative",
            textAlign: "center",
            marginBottom: "24px",
          }}
        >
          {session !== undefined && (
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {session ? (
                <Navbar />
              ) : (
                <button
                  onClick={() => router.push("/auth")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    border: "1px solid #2d6a4f",
                    background: "#fff",
                    color: "#2d6a4f",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Sign In
                </button>
              )}
            </div>
          )}

          <h1 style={{ color: "#2d6a4f", fontSize: "2rem", margin: "0" }}>
            🐾 PetParrk
          </h1>
          <p
            style={{
              color: "#333",
              margin: "4px 0 2px 0",
              fontSize: "15px",
              fontWeight: "500",
            }}
          >
            Know what you'll pay before you go.
          </p>
          <p style={{ color: "#888", margin: "0", fontSize: "13px" }}>
            Vet pricing transparency for the East Bay
          </p>
        </div>

        {/* Search */}
        <div style={{ marginBottom: "16px" }}>
          <input
            type="text"
            placeholder="Search vets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              fontSize: "15px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Neighborhood Filter */}
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              fontWeight: "bold",
              marginRight: "8px",
              color: "#333",
              fontSize: "13px",
            }}
          >
            Neighborhood
          </label>
          <select
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              fontSize: "14px",
            }}
          >
            {neighborhoods.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* Vet Type Filter */}
        {vetTypes.length > 2 && (
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                fontWeight: "bold",
                marginRight: "8px",
                color: "#333",
                fontSize: "13px",
              }}
            >
              Type
            </label>
            <select
              value={vetTypeFilter}
              onChange={(e) => setVetTypeFilter(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                fontSize: "14px",
              }}
            >
              {vetTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Ownership Filter */}
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              fontWeight: "bold",
              marginBottom: "8px",
              color: "#333",
              fontSize: "13px",
            }}
          >
            Ownership
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {["All", "Independent", "Corporate"].map((o) => (
              <button
                key={o}
                onClick={() => setOwnership(o)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  border: `1px solid ${ownership === o ? "#2d6a4f" : "#ccc"}`,
                  background: ownership === o ? "#2d6a4f" : "#fff",
                  color: ownership === o ? "#fff" : "#333",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        {/* Accepting New Patients Filter */}
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              fontWeight: "bold",
              marginBottom: "8px",
              color: "#333",
              fontSize: "13px",
            }}
          >
            Accepting New Patients
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {[
              { label: "All", value: "All" },
              { label: "✅ Accepting", value: "Yes" },
              { label: "❌ Not accepting", value: "No" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAcceptingFilter(opt.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  border: `1px solid ${acceptingFilter === opt.value ? "#2d6a4f" : "#ccc"}`,
                  background:
                    acceptingFilter === opt.value ? "#2d6a4f" : "#fff",
                  color: acceptingFilter === opt.value ? "#fff" : "#333",
                  cursor: "pointer",
                  fontSize: "13px",
                  whiteSpace: "nowrap",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Exam Price Range Filter */}
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              fontWeight: "bold",
              marginBottom: "8px",
              color: "#333",
              fontSize: "13px",
            }}
          >
            Exam Price
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {PRICE_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setPriceRange(r.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  border: `1px solid ${priceRange === r.value ? "#2d6a4f" : "#ccc"}`,
                  background: priceRange === r.value ? "#2d6a4f" : "#fff",
                  color: priceRange === r.value ? "#fff" : "#333",
                  cursor: "pointer",
                  fontSize: "13px",
                  whiteSpace: "nowrap",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              fontWeight: "bold",
              marginBottom: "8px",
              color: "#333",
              fontSize: "13px",
            }}
          >
            Sort
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {[
              ["price", "💰 Cheapest First"],
              ["az", "A–Z"],
            ].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setSortBy(val)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  border: `1px solid ${sortBy === val ? "#2d6a4f" : "#ccc"}`,
                  background: sortBy === val ? "#2d6a4f" : "#fff",
                  color: sortBy === val ? "#fff" : "#333",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Result count */}
        <p
          style={{
            color: "#888",
            fontSize: "13px",
            marginBottom: "16px",
            marginTop: "0",
          }}
        >
          {loading
            ? "Loading…"
            : `${filtered.length} vet${filtered.length !== 1 ? "s" : ""} found`}
        </p>

        {/* Vet Cards */}
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
            <div
              key={vet.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "12px",
                background: "#ffffff",
              }}
            >
              <h2 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>
                <Link
                  href={`/vet/${vet.slug}`}
                  style={{ color: "#111", textDecoration: "none" }}
                  onMouseEnter={(e) => {
                    e.target.style.color = "#2d6a4f";
                    e.target.style.textDecoration = "underline";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = "#111";
                    e.target.style.textDecoration = "none";
                  }}
                >
                  {vet.name}
                </Link>
              </h2>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "4px",
                  marginBottom: "6px",
                }}
              >
                {(Array.isArray(vet.vet_type) ? vet.vet_type : [vet.vet_type])
                  .filter(Boolean)
                  .map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: "11px",
                        background: "#e8f5e9",
                        color: "#2d6a4f",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                {vet.accepting_new_patients === true && (
                  <span
                    style={{
                      fontSize: "11px",
                      background: "#e8f0fe",
                      color: "#3949ab",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ✅ Accepting New Patients
                  </span>
                )}
                {vet.accepting_new_patients === false && (
                  <span
                    style={{
                      fontSize: "11px",
                      background: "#fce8e8",
                      color: "#c62828",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ❌ Not Accepting New Patients
                  </span>
                )}
              </div>

              <p
                style={{ margin: "0 0 2px 0", color: "#666", fontSize: "13px" }}
              >
                {[vet.neighborhood, vet.city].filter(Boolean).join(" · ")}
              </p>
              <p style={{ margin: "0 0 2px 0", fontSize: "13px" }}>
                <a
                  href={`tel:${vet.phone}`}
                  style={{ color: "#666", textDecoration: "none" }}
                >
                  {formatPhone(vet.phone)}
                </a>
              </p>
              {vet.website && (
                <p style={{ margin: "0", fontSize: "13px" }}>
                  <a
                    href={`https://${vet.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#2d6a4f", textDecoration: "none" }}
                    onMouseEnter={(e) =>
                      (e.target.style.textDecoration = "underline")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.textDecoration = "none")
                    }
                  >
                    Website ↗
                  </a>
                </p>
              )}

              {!exam && !dental && !spay && !neuter ? (
                <p
                  style={{
                    margin: "12px 0 0 0",
                    fontSize: "13px",
                    color: "#999",
                    fontStyle: "italic",
                  }}
                >
                  No pricing available
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  {exam && (
                    <div
                      style={{
                        background: "#f0f0f0",
                        borderRadius: "6px",
                        padding: "6px 10px",
                        fontSize: "13px",
                      }}
                    >
                      <span style={{ color: "#666" }}>Exam </span>
                      <span style={{ fontWeight: "bold", color: "#111" }}>
                        {formatPrice(
                          exam.price_low,
                          exam.price_high,
                          exam.price_type,
                        )}
                      </span>
                    </div>
                  )}
                  {dental && (
                    <div
                      style={{
                        background: "#f0f0f0",
                        borderRadius: "6px",
                        padding: "6px 10px",
                        fontSize: "13px",
                      }}
                    >
                      <span style={{ color: "#666" }}>Dental </span>
                      <span style={{ fontWeight: "bold", color: "#111" }}>
                        {formatPrice(
                          dental.price_low,
                          dental.price_high,
                          dental.price_type,
                        )}
                      </span>
                    </div>
                  )}
                  {spay && (
                    <div
                      style={{
                        background: "#f0f0f0",
                        borderRadius: "6px",
                        padding: "6px 10px",
                        fontSize: "13px",
                      }}
                    >
                      <span style={{ color: "#666" }}>Spay </span>
                      <span style={{ fontWeight: "bold", color: "#111" }}>
                        {formatPrice(
                          spay.price_low,
                          spay.price_high,
                          spay.price_type,
                        )}
                      </span>
                    </div>
                  )}
                  {neuter && (
                    <div
                      style={{
                        background: "#f0f0f0",
                        borderRadius: "6px",
                        padding: "6px 10px",
                        fontSize: "13px",
                      }}
                    >
                      <span style={{ color: "#666" }}>Neuter </span>
                      <span style={{ fontWeight: "bold", color: "#111" }}>
                        {formatPrice(
                          neuter.price_low,
                          neuter.price_high,
                          neuter.price_type,
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "10px",
                  borderTop: "1px solid #f0f0f0",
                  paddingTop: "8px",
                }}
              >
                <p style={{ margin: 0, color: "#aaa", fontSize: "11px" }}>
                  {lastUpdated
                    ? `Verified ${lastUpdated.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
                    : ""}
                </p>
                <button
                  onClick={(e) => toggleSave(e, vet.id)}
                  title={isSaved ? "Remove from saved" : "Save this vet"}
                  className={`heart-btn${isAnimating ? " heart-animating" : ""}`}
                >
                  {isSaved ? "❤️" : "🤍"}
                </button>
              </div>
            </div>
          );
        })}

        {!loading && filtered.length === 0 && (
          <div
            style={{ textAlign: "center", padding: "40px 20px", color: "#888" }}
          >
            <p style={{ fontSize: "32px", margin: "0 0 12px 0" }}>🔍</p>
            <p
              style={{
                fontSize: "15px",
                fontWeight: "600",
                color: "#555",
                margin: "0 0 8px 0",
              }}
            >
              No vets found
            </p>
            <p style={{ fontSize: "13px", margin: "0" }}>
              Try adjusting your filters
            </p>
          </div>
        )}

        {/* Submit a Price */}
        <div style={{ marginTop: "40px", textAlign: "center" }}>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setFormStatus(null);
            }}
            style={{
              padding: "10px 24px",
              backgroundColor: "#2d6a4f",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            {showForm ? "Cancel" : "💰 Submit a Price"}
          </button>
          {showForm && (
            <div
              style={{
                marginTop: "20px",
                background: "#fff",
                border: "1px solid #ddd",
                borderRadius: "12px",
                padding: "24px",
                textAlign: "left",
                maxWidth: "500px",
                margin: "20px auto 0",
              }}
            >
              <h3 style={{ margin: "0 0 16px 0", color: "#111" }}>
                Submit a Vet Price
              </h3>
              {[
                "vet_name",
                "service_name",
                "price_paid",
                "visit_date",
                "submitter_note",
              ].map((field) => (
                <div key={field} style={{ marginBottom: "12px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      color: "#555",
                      marginBottom: "4px",
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
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}
              {formStatus === "error" && (
                <p style={{ color: "red", fontSize: "13px" }}>
                  Please fill in all required fields.
                </p>
              )}
              {formStatus === "success" && (
                <p style={{ color: "green", fontSize: "13px" }}>
                  Thanks! Your submission is under review.
                </p>
              )}
              <button
                onClick={handleSubmit}
                style={{
                  padding: "10px 24px",
                  backgroundColor: "#2d6a4f",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  cursor: "pointer",
                  marginTop: "4px",
                }}
              >
                Submit
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer
          style={{
            marginTop: "60px",
            borderTop: "1px solid #ddd",
            paddingTop: "24px",
            paddingBottom: "40px",
            textAlign: "center",
            color: "#888",
            fontSize: "13px",
          }}
        >
          <p
            style={{
              margin: "0 0 8px 0",
              fontWeight: "bold",
              color: "#2d6a4f",
              fontSize: "15px",
            }}
          >
            🐾 PetParrk
          </p>
          <p style={{ margin: "0 0 8px 0" }}>
            Real prices. Real vets. No surprises.
          </p>
          <p style={{ margin: "0 0 8px 0" }}>
            Pricing data is self-reported and verified by our team. Always call
            to confirm before your visit.
          </p>
          <p style={{ margin: "0" }}>
            Questions or feedback?{" "}
            <a
              href="mailto:bkalthompson@gmail.com"
              style={{ color: "#2d6a4f", textDecoration: "none" }}
            >
              bkalthompson@gmail.com
            </a>
          </p>
        </footer>
      </div>
    </>
  );
}
