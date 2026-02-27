"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function VetPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [isSaved, setIsSaved] = useState(false);
  const [saveAnimating, setSaveAnimating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [vet, setVet] = useState(null);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [allPrices, setAllPrices] = useState([]);
  const [formData, setFormData] = useState({
    vet_name: "",
    service_name: "",
    price_paid: "",
    visit_date: "",
    submitter_note: "",
  });
  const [formStatus, setFormStatus] = useState(null);
  const [chartVisible, setChartVisible] = useState(false);
  const chartRef = useRef(null);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch vet data
  useEffect(() => {
    async function fetchData() {
      const { data: vetData } = await supabase
        .from("vets")
        .select("*")
        .eq("slug", slug)
        .single();
      const { data: priceData } = await supabase
        .from("vet_prices")
        .select("*, services(name)")
        .eq("vet_id", vetData?.id);
      const { data: allPricesData } = await supabase
        .from("vet_prices")
        .select("*, services(name)");
      setVet(vetData);
      setPrices(priceData || []);
      setAllPrices(allPricesData || []);
      setLoading(false);
    }
    fetchData();
  }, [slug]);

  // Check if this vet is saved
  useEffect(() => {
    if (!session || !vet) return;
    async function checkSaved() {
      const { data } = await supabase
        .from("saved_vets")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("vet_id", vet.id)
        .single();
      setIsSaved(!!data);
    }
    checkSaved();
  }, [session, vet]);

  useEffect(() => {
    if (!loading) setTimeout(() => setChartVisible(true), 500);
  }, [loading]);

  async function handleSignOut() {
    setShowDropdown(false);
    await supabase.auth.signOut();
    router.push("/auth");
  }

  async function toggleSave() {
    if (!session) {
      router.push("/auth");
      return;
    }
    setSaveAnimating(true);
    setTimeout(() => setSaveAnimating(false), 400);
    if (isSaved) {
      await supabase
        .from("saved_vets")
        .delete()
        .eq("user_id", session.user.id)
        .eq("vet_id", vet.id);
      setIsSaved(false);
    } else {
      await supabase
        .from("saved_vets")
        .insert({ user_id: session.user.id, vet_id: vet.id });
      setIsSaved(true);
    }
  }

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
    setFormStatus("success");
    setFormData({
      vet_name: "",
      service_name: "",
      price_paid: "",
      visit_date: "",
      submitter_note: "",
    });
  };

  function formatPrice(low, high) {
    if (!low) return null;
    if (low === high) return `$${Number(low).toLocaleString()}`;
    return `$${Number(low).toLocaleString()}–$${Number(high).toLocaleString()}`;
  }

  function parseHours(hoursStr) {
    if (!hoursStr) return [];
    const dayPattern =
      /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Mon-Fri|Mon-Thu|Mon-Wed|Tue-Fri|Sat-Sun|Weekday|Weekend|Emergency)/i;
    const parts = hoursStr.split(",").map((p) => p.trim());
    const lines = [];
    parts.forEach((part) => {
      if (dayPattern.test(part) || lines.length === 0) lines.push(part);
      else lines[lines.length - 1] += ", " + part;
    });
    return lines;
  }

  function parseNotes(notes) {
    if (!notes) return [];
    return notes.split(" / ").map((n) => n.trim());
  }

  async function handleShare() {
    const url = window.location.href;
    const text = `Check out ${vet.name} on PetParrk`;
    if (navigator.share) {
      await navigator.share({ title: vet.name, text, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  }

  const avatarLetter = session?.user?.email?.[0]?.toUpperCase();

  if (loading) return <p style={{ padding: "20px" }}>Loading...</p>;
  if (!vet) return <p style={{ padding: "20px" }}>Vet not found.</p>;

  const hoursLines = parseHours(vet.hours);

  return (
    <>
      <style>{`
        @keyframes heartPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.5); }
          70%  { transform: scale(0.85); }
          100% { transform: scale(1); }
        }
        .save-btn { transition: transform 0.1s; background: none; border: none; cursor: pointer; padding: 0; font-size: 22px; line-height: 1; }
        .save-btn:hover { transform: scale(1.15); }
        .save-animating { animation: heartPop 0.4s ease forwards; }
        .avatar-dropdown-item { display: block; width: 100%; padding: 10px 16px; text-align: left; background: none; border: none; font-size: 13px; cursor: pointer; color: #333; white-space: nowrap; box-sizing: border-box; }
        .avatar-dropdown-item:hover { background: #f5f5f5; }
        .avatar-dropdown-item.danger { color: #555; }
        .avatar-dropdown-item.danger:hover { background: #f5f5f5; }
      `}</style>

      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          padding: "20px",
          fontFamily: "system-ui, sans-serif",
          minHeight: "100vh",
          boxSizing: "border-box",
        }}
      >
        {/* Top nav */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <Link
            href="/"
            style={{
              color: "#2d6a4f",
              fontSize: "14px",
              textDecoration: "none",
            }}
          >
            ← Back to all vets
          </Link>

          {session !== undefined && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {session ? (
                <>
                  <div ref={dropdownRef} style={{ position: "relative" }}>
                    <div
                      onClick={() => setShowDropdown(!showDropdown)}
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: "#2d6a4f",
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: "700",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      {avatarLetter}
                    </div>
                    {showDropdown && (
                      <div
                        style={{
                          position: "absolute",
                          textAlign: "left",
                          top: "40px",
                          right: 0,
                          background: "#fff",
                          border: "1px solid #e0e0e0",
                          borderRadius: "10px",
                          boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                          minWidth: "180px",
                          zIndex: 100,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            padding: "10px 16px",
                            borderBottom: "1px solid #f0f0f0",
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              fontSize: "11px",
                              color: "#888",
                            }}
                          >
                            Signed in as
                          </p>
                          <p
                            style={{
                              margin: "2px 0 0 0",
                              fontSize: "13px",
                              fontWeight: "600",
                              color: "#333",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "160px",
                            }}
                          >
                            {session.user.email}
                          </p>
                        </div>
                        <Link
                          href="/saved"
                          onClick={() => setShowDropdown(false)}
                          style={{
                            display: "block",
                            padding: "10px 16px",
                            fontSize: "13px",
                            color: "#333",
                            textDecoration: "none",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#f5f5f5")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "none")
                          }
                        >
                          ❤️ Saved Vets
                        </Link>
                        <div style={{ borderTop: "1px solid #f0f0f0" }}>
                          <button
                            onClick={handleSignOut}
                            className="avatar-dropdown-item danger"
                          >
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
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
        </div>

        {/* Vet Info Card */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "16px",
          }}
        >
          {/* Name row + heart */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "10px",
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: "1.4rem",
                color: "#111",
                lineHeight: "1.3",
                flex: 1,
              }}
            >
              {vet.name}
            </h1>
            <button
              onClick={toggleSave}
              title={isSaved ? "Remove from saved" : "Save this vet"}
              className={`save-btn${saveAnimating ? " save-animating" : ""}`}
              style={{ marginLeft: "12px", flexShrink: 0 }}
            >
              {isSaved ? "❤️" : "🤍"}
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
              marginBottom: "16px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                background: "#e8f5e9",
                color: "#2d6a4f",
                padding: "4px 10px",
                borderRadius: "12px",
              }}
            >
              {vet.vet_type}
            </span>
            {vet.ownership && (
              <span
                style={{
                  fontSize: "11px",
                  background: "#f0f0f0",
                  color: "#555",
                  padding: "4px 10px",
                  borderRadius: "12px",
                }}
              >
                {vet.ownership}
              </span>
            )}
          </div>

          <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#555" }}>
            <span style={{ color: "#888" }}>Neighborhood: </span>
            <strong style={{ color: "#111" }}>
              {vet.neighborhood} · {vet.city}
            </strong>
          </p>

          {vet.address && (
            <div style={{ margin: "0 0 16px 0", fontSize: "14px" }}>
              <span style={{ color: "#888" }}>Address: </span>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(
                  vet.address + " " + vet.city + " CA " + (vet.zip_code || "")
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#2d6a4f", textDecoration: "none" }}
              >
                <span style={{ display: "block" }}>{vet.address}</span>
                <span style={{ display: "block" }}>
                  {vet.city}, CA {vet.zip_code} ↗
                </span>
              </a>
            </div>
          )}

          <p style={{ margin: "0 0 8px 0", fontSize: "14px" }}>
            <span style={{ color: "#888" }}>Phone: </span>
            {vet.phone ? (
              <a
                href={`tel:${vet.phone}`}
                style={{
                  color: "#111",
                  textDecoration: "none",
                  fontWeight: "bold",
                }}
              >
                {vet.phone}
              </a>
            ) : (
              <strong style={{ color: "#888" }}>N/A</strong>
            )}
          </p>

          {vet.website && (
            <p style={{ margin: "0 0 16px 0", fontSize: "14px" }}>
              <span style={{ color: "#888" }}>Website: </span>
              <a
                href={`https://${vet.website}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#2d6a4f",
                  fontWeight: "bold",
                  textDecoration: "none",
                }}
              >
                {vet.website} ↗
              </a>
            </p>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              fontSize: "14px",
              marginBottom: "16px",
            }}
          >
            <div>
              <span
                style={{ color: "#888", display: "block", marginBottom: "2px" }}
              >
                CareCredit
              </span>
              <strong style={{ color: "#111" }}>
                {vet.carecredit ? "✅ Accepted" : "❌ Not accepted"}
              </strong>
            </div>
            <div>
              {vet.accepting_new_patients !== null && (
                <>
                  <span
                    style={{
                      color: "#888",
                      display: "block",
                      marginBottom: "2px",
                    }}
                  >
                    New Patients
                  </span>
                  <strong
                    style={{
                      color:
                        vet.accepting_new_patients === true
                          ? "#2d6a4f"
                          : "#c62828",
                    }}
                  >
                    {vet.accepting_new_patients === true
                      ? "✅ Accepting"
                      : "❌ Not accepting"}
                  </strong>
                </>
              )}
            </div>
          </div>

          {hoursLines.length > 0 && (
            <div style={{ fontSize: "14px", marginBottom: "16px" }}>
              <span
                style={{ color: "#888", display: "block", marginBottom: "4px" }}
              >
                Hours
              </span>
              {hoursLines.map((line, i) => (
                <div key={i} style={{ color: "#111", fontWeight: "bold" }}>
                  {line}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleShare}
            style={{
              background: "none",
              border: "none",
              padding: "0",
              color: "#2d6a4f",
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            🔗{" "}
            <span style={{ textDecoration: "underline" }}>Share this vet</span>
          </button>
        </div>

        {/* Map */}
        {vet.latitude && vet.longitude && (
          <div
            style={{
              borderRadius: "12px",
              overflow: "hidden",
              marginBottom: "24px",
              border: "1px solid #e0e0e0",
            }}
          >
            <iframe
              title="Vet location map"
              width="100%"
              height="300"
              style={{ display: "block", border: "none" }}
              src={`https://maps.google.com/maps?q=${vet.latitude},${vet.longitude}&z=15&output=embed`}
            />
          </div>
        )}

        {/* Price Comparison Chart */}
        {prices.length > 0 && allPrices.length > 0 && (
          <div
            ref={chartRef}
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "24px",
              marginBottom: "24px",
              border: "1px solid #e0e0e0",
            }}
          >
            <h3
              style={{
                margin: "0 0 4px 0",
                fontSize: "18px",
                color: "#111",
                fontWeight: "700",
              }}
            >
              Price Comparison
            </h3>
            <p
              style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#888" }}
            >
              How this vet compares to the East Bay average
            </p>
            {prices.map((price) => {
              const serviceName = price.services?.name;
              const vetPrice = price.price_low || price.price_paid;
              const allForService = allPrices.filter(
                (p) => p.services?.name === serviceName && p.price_low
              );
              const avg =
                allForService.length > 0
                  ? Math.round(
                      allForService.reduce((sum, p) => sum + p.price_low, 0) /
                        allForService.length
                    )
                  : null;
              if (!vetPrice || !avg) return null;
              const isCheaper = vetPrice <= avg;
              const max = Math.max(vetPrice, avg) * 1.2;
              const vetWidth = Math.round((vetPrice / max) * 100);
              const avgWidth = Math.round((avg / max) * 100);
              return (
                <div key={price.id} style={{ marginBottom: "20px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#333",
                      }}
                    >
                      {serviceName}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        padding: "2px 8px",
                        borderRadius: "20px",
                        background: isCheaper ? "#e8f5e9" : "#fdecea",
                        color: isCheaper ? "#2d6a4f" : "#c0392b",
                      }}
                    >
                      {isCheaper ? "✓ Below average" : "↑ Above average"}
                    </span>
                  </div>
                  <div style={{ marginBottom: "6px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#666",
                          width: "80px",
                          flexShrink: 0,
                        }}
                      >
                        This vet
                      </span>
                      <div
                        style={{
                          flex: 1,
                          background: "#f0f0f0",
                          borderRadius: "4px",
                          height: "20px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: chartVisible ? `${vetWidth}%` : "0%",
                            height: "100%",
                            background: isCheaper ? "#2d6a4f" : "#e05c5c",
                            borderRadius: "4px",
                            transition: "width 0.8s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            paddingRight: "6px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#fff",
                              fontWeight: "600",
                              whiteSpace: "nowrap",
                            }}
                          >
                            ${vetPrice.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#666",
                          width: "80px",
                          flexShrink: 0,
                        }}
                      >
                        East Bay avg
                      </span>
                      <div
                        style={{
                          flex: 1,
                          background: "#f0f0f0",
                          borderRadius: "4px",
                          height: "20px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: chartVisible ? `${avgWidth}%` : "0%",
                            height: "100%",
                            background: "#bbb",
                            borderRadius: "4px",
                            transition: "width 0.8s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            paddingRight: "6px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#fff",
                              fontWeight: "600",
                              whiteSpace: "nowrap",
                            }}
                          >
                            ${avg.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      height: "1px",
                      background: "#f0f0f0",
                      marginTop: "16px",
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Pricing */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "16px",
          }}
        >
          <h2
            style={{ margin: "0 0 16px 0", fontSize: "1.1rem", color: "#111" }}
          >
            Pricing
          </h2>
          {prices.length === 0 ? (
            <p style={{ color: "#999", fontStyle: "italic" }}>
              No pricing available yet.
            </p>
          ) : (
            prices.map((p, i) => {
              const noteLines = parseNotes(p.price_notes);
              return (
                <div
                  key={p.id}
                  style={{
                    padding: "12px 0",
                    borderBottom:
                      i < prices.length - 1 ? "1px solid #f0f0f0" : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <span style={{ fontSize: "14px", color: "#111" }}>
                      {p.services?.name}
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "bold",
                        color: "#111",
                        marginLeft: "12px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatPrice(p.price_low, p.price_high)}
                    </span>
                  </div>
                  {noteLines.length > 0 &&
                    noteLines.map((note, j) => (
                      <p
                        key={j}
                        style={{
                          margin: "2px 0 0 0",
                          fontSize: "12px",
                          color: "#888",
                        }}
                      >
                        {note}
                      </p>
                    ))}
                </div>
              );
            })
          )}
        </div>

        {/* Submit a Price */}
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
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
                padding: "20px",
                textAlign: "left",
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
                      ? "Service *"
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
