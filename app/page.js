"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Link from "next/link";

function formatPrice(low, high) {
  if (!low) return null;
  if (low === high) return `$${Number(low).toLocaleString()}`;
  return `$${Number(low).toLocaleString()}–$${Number(high).toLocaleString()}`;
}

export default function Home() {
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
    <div
      style={{
        maxWidth: "860px",
        margin: "0 auto",
        padding: "20px",
        fontFamily: "system-ui, sans-serif",
        //background: "#f9f9f9",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
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
        {["All", "Independent", "Corporate"].map((o) => (
          <button
            key={o}
            onClick={() => setOwnership(o)}
            style={{
              marginRight: "8px",
              padding: "6px 14px",
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
              padding: "6px 14px",
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
        const exam = vetPrices.find((p) => p.services?.name === "Doctor Exam");
        const dental = vetPrices.find(
          (p) => p.services?.name === "Dental Cleaning"
        );
        const spay = vetPrices.find(
          (p) => p.services?.name === "Spay (~40lb dog)"
        );
        const neuter = vetPrices.find(
          (p) => p.services?.name === "Neuter (~40lb dog)"
        );
        const lastUpdated =
          vetPrices.length > 0
            ? new Date(
                Math.max(...vetPrices.map((p) => new Date(p.created_at)))
              )
            : null;

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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <h2 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>
                  <Link
                    href={`/vet/${vet.id}`}
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
                <p
                  style={{
                    margin: "0 0 2px 0",
                    color: "#666",
                    fontSize: "13px",
                  }}
                >
                  {vet.neighborhood}
                </p>
                <p style={{ margin: "0 0 2px 0", fontSize: "13px" }}>
                  <a
                    href={`tel:${vet.phone}`}
                    style={{ color: "#666", textDecoration: "none" }}
                  >
                    {vet.phone}
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
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    background: "#e8f5e9",
                    color: "#2d6a4f",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {vet.vet_type}
                </span>
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
                    ✅ Accepting patients
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
                    ❌ Not accepting
                  </span>
                )}
              </div>
            </div>

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
                      {formatPrice(exam.price_low, exam.price_high)}
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
                      {formatPrice(dental.price_low, dental.price_high)}
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
                      {formatPrice(spay.price_low, spay.price_high)}
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
                      {formatPrice(neuter.price_low, neuter.price_high)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {lastUpdated && (
              <p
                style={{
                  margin: "10px 0 0 0",
                  color: "#aaa",
                  fontSize: "11px",
                  borderTop: "1px solid #f0f0f0",
                  paddingTop: "8px",
                }}
              >
                Updated{" "}
                {lastUpdated.toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        );
      })}

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
          Pricing data is self-reported and verified by our team. Always call to
          confirm before your visit.
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
  );
}
