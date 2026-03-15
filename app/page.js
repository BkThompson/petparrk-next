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
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === "1") return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return phone;
}

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
        .sort()
    ),
  ];
  const filtered = vets
    .filter((v) => neighborhood === "All" || v.neighborhood === neighborhood)
    .filter((v) => ownership === "All" || v.ownership === ownership)
    .filter((v) => v.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "az") return a.name.localeCompare(b.name);
      const aExam = prices[a.id]?.find(
        (p) => p.services?.name === "Doctor Exam"
      );
      const bExam = prices[b.id]?.find(
        (p) => p.services?.name === "Doctor Exam"
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
    fetch("/api/notify-submission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vet_name: formData.vet_name,
        service_name: formData.service_name,
        price_paid: parseFloat(formData.price_paid),
        visit_date: formData.visit_date || null,
        submitter_note: formData.submitter_note || null,
      }),
    }).catch(() => {});
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

        {/* Neighborhood Filter */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{ fontWeight: "bold", marginRight: "8px", color: "#333" }}
          >
            Neighborhood:
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
          <span style={{ marginLeft: "12px", color: "#888", fontSize: "14px" }}>
            {filtered.length} vets
          </span>
        </div>

        {/* Ownership Filter */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{ fontWeight: "bold", marginRight: "8px", color: "#333" }}
          >
            Ownership:
          </label>
          <div
            style={{
              display: "inline-flex",
              flexWrap: "wrap",
              gap: "8px",
              marginTop: "4px",
            }}
          >
            {["All", "Independent", "Corporate"].map((o) => (
              <button
                key={o}
                onClick={() => setOwnership(o)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  border: "1px solid #ccc",
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

        {/* Sort */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{ fontWeight: "bold", marginRight: "8px", color: "#333" }}
          >
            Sort:
          </label>
          {[
            ["price", "💰 Cheapest First"],
            ["az", "A–Z"],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setSortBy(val)}
              style={{
                marginRight: "8px",
                padding: "6px 12px",
                borderRadius: "20px",
                border: "1px solid #ccc",
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

        {/* Search */}
        <div style={{ marginBottom: "20px" }}>
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

        {loading && <p>Loading vets...</p>}

        {/* Vet Cards */}
        {filtered.map((vet) => {
          const vetPrices = prices[vet.id] || [];
          const exam = vetPrices.find(
            (p) => p.services?.name === "Doctor Exam" && p.price_low
          );
          const dental = vetPrices.find(
            (p) => p.services?.name === "Dental Cleaning" && p.price_low
          );
          const spay = vetPrices.find(
            (p) => p.services?.name === "Spay (~40lb dog)" && p.price_low
          );
          const neuter = vetPrices.find(
            (p) => p.services?.name === "Neuter (~40lb dog)" && p.price_low
          );
          const lastUpdated = vet.last_verified
            ? new Date(vet.last_verified + "T12:00:00")
            : vetPrices.length > 0
            ? new Date(Math.max(...vetPrices.map((p) => new Date(p.created_at))))
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
              {/* Vet name + badges */}
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

              {/* Badges inline under name */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "6px" }}>
                {(Array.isArray(vet.vet_type) ? vet.vet_type : [vet.vet_type])
                  .filter(Boolean)
                  .map((t) => (
                    <span key={t} style={{ fontSize: "11px", background: "#e8f5e9", color: "#2d6a4f", padding: "2px 8px", borderRadius: "12px", whiteSpace: "nowrap" }}>
                      {t}
                    </span>
                  ))}
                {vet.accepting_new_patients === true && (
                  <span style={{ fontSize: "11px", background: "#e8f0fe", color: "#3949ab", padding: "2px 8px", borderRadius: "12px", whiteSpace: "nowrap" }}>
                    ✅ Accepting patients
                  </span>
                )}
                {vet.accepting_new_patients === false && (
                  <span style={{ fontSize: "11px", background: "#fce8e8", color: "#c62828", padding: "2px 8px", borderRadius: "12px", whiteSpace: "nowrap" }}>
                    ❌ Not accepting
                  </span>
                )}
              </div>

              {/* Neighborhood / phone / website */}
              <p style={{ margin: "0 0 2px 0", color: "#666", fontSize: "13px" }}>
                {[vet.neighborhood, vet.city].filter(Boolean).join(" · ")}
              </p>
              <p style={{ margin: "0 0 2px 0", fontSize: "13px" }}>
                <a href={`tel:${vet.phone}`} style={{ color: "#666", textDecoration: "none" }}>
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
                    onMouseEnter={(e) => (e.target.style.textDecoration = "underline")}
                    onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
                  >
                    Website ↗
                  </a>
                </p>
              )}

              {/* Price chips */}
              {!exam && !dental && !spay && !neuter ? (
                <p style={{ margin: "12px 0 0 0", fontSize: "13px", color: "#999", fontStyle: "italic" }}>
                  No pricing available
                </p>
              ) : (
                <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                  {exam && (
                    <div style={{ background: "#f0f0f0", borderRadius: "6px", padding: "6px 10px", fontSize: "13px" }}>
                      <span style={{ color: "#666" }}>Exam </span>
                      <span style={{ fontWeight: "bold", color: "#111" }}>{formatPrice(exam.price_low, exam.price_high, exam.price_type)}</span>
                    </div>
                  )}
                  {dental && (
                    <div style={{ background: "#f0f0f0", borderRadius: "6px", padding: "6px 10px", fontSize: "13px" }}>
                      <span style={{ color: "#666" }}>Dental </span>
                      <span style={{ fontWeight: "bold", color: "#111" }}>{formatPrice(dental.price_low, dental.price_high, dental.price_type)}</span>
                    </div>
                  )}
                  {spay && (
                    <div style={{ background: "#f0f0f0", borderRadius: "6px", padding: "6px 10px", fontSize: "13px" }}>
                      <span style={{ color: "#666" }}>Spay </span>
                      <span style={{ fontWeight: "bold", color: "#111" }}>{formatPrice(spay.price_low, spay.price_high, spay.price_type)}</span>
                    </div>
                  )}
                  {neuter && (
                    <div style={{ background: "#f0f0f0", borderRadius: "6px", padding: "6px 10px", fontSize: "13px" }}>
                      <span style={{ color: "#666" }}>Neuter </span>
                      <span style={{ fontWeight: "bold", color: "#111" }}>{formatPrice(neuter.price_low, neuter.price_high, neuter.price_type)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom row — verified + heart */}
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

        {/* Submit a Price */}
        <div style={{ marginTop: "40px", textAlign: "center" }}>
          <button
            onClick={() => { setShowForm(!showForm); setFormStatus(null); }}
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
              <h3 style={{ margin: "0 0 16px 0", color: "#111" }}>Submit a Vet Price</h3>
              {["vet_name", "service_name", "price_paid", "visit_date", "submitter_note"].map((field) => (
                <div key={field} style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "4px" }}>
                    {field === "vet_name" ? "Vet Name *"
                      : field === "service_name" ? "Service (e.g. Exam, Dental) *"
                      : field === "price_paid" ? "Price Paid ($) *"
                      : field === "visit_date" ? "Date of Visit (optional)"
                      : "Notes (optional)"}
                  </label>
                  <input
                    type={field === "price_paid" ? "number" : field === "visit_date" ? "date" : "text"}
                    value={formData[field]}
                    onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px", boxSizing: "border-box" }}
                  />
                </div>
              ))}
              {formStatus === "error" && <p style={{ color: "red", fontSize: "13px" }}>Please fill in all required fields.</p>}
              {formStatus === "success" && <p style={{ color: "green", fontSize: "13px" }}>Thanks! Your submission is under review.</p>}
              <button
                onClick={handleSubmit}
                style={{ padding: "10px 24px", backgroundColor: "#2d6a4f", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer", marginTop: "4px" }}
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
          <p style={{ margin: "0 0 8px 0", fontWeight: "bold", color: "#2d6a4f", fontSize: "15px" }}>🐾 PetParrk</p>
          <p style={{ margin: "0 0 8px 0" }}>Real prices. Real vets. No surprises.</p>
          <p style={{ margin: "0 0 8px 0" }}>Pricing data is self-reported and verified by our team. Always call to confirm before your visit.</p>
          <p style={{ margin: "0" }}>
            Questions or feedback?{" "}
            <a href="mailto:bkalthompson@gmail.com" style={{ color: "#2d6a4f", textDecoration: "none" }}>
              bkalthompson@gmail.com
            </a>
          </p>
        </footer>
      </div>
    </>
  );
}
