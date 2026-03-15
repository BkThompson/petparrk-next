"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";
import Navbar from "../../../components/Navbar";

const ACCORDION_COPY = {
  4: {
    heading: "About dental pricing",
    body: "Dental costs vary based on your dog's age, size, and the condition of their teeth. This is a starting estimate. Pre-surgical bloodwork and extractions, if needed, are typically billed separately. Always call to confirm for your specific pet.",
  },
  8: {
    heading: "About non-anesthesia dental",
    body: "Non-anesthesia dental cleaning is a surface-level cleaning performed without sedation. It does not replace a full dental procedure under anesthesia, which allows the vet to examine below the gumline. Ask your vet whether this option is appropriate for your pet.",
  },
  5: {
    heading: "About spay pricing",
    body: "Surgery costs depend on your dog's size, age, weight, and health. A dog in heat or overweight at the time of surgery may cost more. Pre-surgical bloodwork is often billed separately. Always call to confirm pricing for your specific pet.",
  },
  6: {
    heading: "About neuter pricing",
    body: "Surgery costs depend on your dog's size, age, weight, and health. Pre-surgical bloodwork is often billed separately. Always call to confirm pricing for your specific pet.",
  },
  7: {
    heading: "About emergency fees",
    body: "This is the initial visit or urgent care fee only. It does not include treatment, diagnostics, medications, or procedures, which are billed separately based on your pet's needs.",
  },
};

function formatPhone(phone) {
  if (!phone) return null;
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === "1") return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return phone;
}

export default function VetPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [isSaved, setIsSaved] = useState(false);
  const [saveAnimating, setSaveAnimating] = useState(false);
  const [vet, setVet] = useState(null);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [allPrices, setAllPrices] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [formData, setFormData] = useState({ vet_name: "", service_name: "", price_paid: "", visit_date: "", submitter_note: "" });
  const [formStatus, setFormStatus] = useState(null);
  const [chartVisible, setChartVisible] = useState(false);
  const chartRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchData() {
      const { data: vetData } = await supabase.from("vets").select("*").eq("slug", slug).single();
      const { data: priceData } = await supabase.from("vet_prices").select("*, services(id, name)").eq("vet_id", vetData?.id);
      const { data: allPricesData } = await supabase.from("vet_prices").select("*, services(id, name)");
      setVet(vetData);
      setPrices(priceData || []);
      setAllPrices(allPricesData || []);
      setLoading(false);
    }
    fetchData();
  }, [slug]);

  useEffect(() => {
    if (!session || !vet) return;
    async function checkSaved() {
      const { data } = await supabase.from("saved_vets").select("id").eq("user_id", session.user.id).eq("vet_id", vet.id).single();
      setIsSaved(!!data);
    }
    checkSaved();
  }, [session, vet]);

  useEffect(() => {
    if (!loading) setTimeout(() => setChartVisible(true), 500);
  }, [loading]);

  async function toggleSave() {
    if (!session) { router.push("/auth"); return; }
    setSaveAnimating(true);
    setTimeout(() => setSaveAnimating(false), 400);
    if (isSaved) {
      await supabase.from("saved_vets").delete().eq("user_id", session.user.id).eq("vet_id", vet.id);
      setIsSaved(false);
    } else {
      await supabase.from("saved_vets").insert({ user_id: session.user.id, vet_id: vet.id });
      setIsSaved(true);
    }
  }

  const handleSubmit = async () => {
    if (!formData.vet_name || !formData.service_name || !formData.price_paid) { setFormStatus("error"); return; }
    const { error } = await supabase.from("price_submissions").insert([{
      vet_name: formData.vet_name, service_name: formData.service_name,
      price_paid: parseFloat(formData.price_paid), visit_date: formData.visit_date || null,
      submitter_note: formData.submitter_note || null,
    }]);
    if (error) { setFormStatus("error"); return; }
    setFormStatus("success");
    setFormData({ vet_name: "", service_name: "", price_paid: "", visit_date: "", submitter_note: "" });
  };

  function formatPrice(low, high, priceType) {
    if (!low && low !== 0) return "Call for quote";
    if (priceType === "starting") return `$${Number(low).toLocaleString()}+`;
    if (priceType === "range" && low !== high) return `$${Number(low).toLocaleString()}–$${Number(high).toLocaleString()}`;
    return `$${Number(low).toLocaleString()}`;
  }

  function formatVerifiedDate(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  function parseHours(hoursStr) {
    if (!hoursStr) return [];
    const dayPattern = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Mon-Fri|Mon-Thu|Mon-Wed|Tue-Fri|Sat-Sun|Weekday|Weekend|Emergency)/i;
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
    if (navigator.share) {
      await navigator.share({ title: vet.name, text: `Check out ${vet.name} on PetParrk`, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  }

  function toggleRow(id) {
    setExpandedRows((prev) => ({ [id]: !prev[id] }));
  }

  const lastVerified = prices.length > 0
    ? prices.filter((p) => p.created_at).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]?.created_at
    : null;

  if (loading) return <p style={{ padding: "20px" }}>Loading...</p>;
  if (!vet) return <p style={{ padding: "20px" }}>Vet not found.</p>;

  const hoursLines = parseHours(vet.hours);
  const locationLine = [vet.neighborhood, vet.city].filter(Boolean).join(" · ");

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
        .expand-btn {
          width: 26px; height: 26px; border-radius: 50%;
          border: 1.5px solid #2d6a4f; background: #fff; color: #2d6a4f;
          font-size: 18px; font-weight: 400; line-height: 0;
          cursor: pointer; padding: 0; user-select: none;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: background 0.2s ease, color 0.2s ease;
        }
        .expand-btn:hover { background: #2d6a4f; color: #fff; }
        .accordion-wrap { display: grid; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows 0.38s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .accordion-wrap.open { grid-template-rows: 1fr; opacity: 1; }
        .accordion-inner { overflow: hidden; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; animation: mFadeIn 0.15s ease; }
        @keyframes mFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal-box { background: #fff; border-radius: 14px; padding: 24px; max-width: 420px; width: 100%; animation: mSlideUp 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes mSlideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      {showPricingModal && (
        <div className="modal-overlay" onClick={() => setShowPricingModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#111" }}>About our pricing data</h3>
              <button onClick={() => setShowPricingModal(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 12px", fontSize: "20px", color: "#aaa", lineHeight: 1, flexShrink: 0 }}>×</button>
            </div>
            <p style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#444", lineHeight: "1.6" }}>
              Prices shown are estimates and may have changed. PetParrk is not responsible for discrepancies between listed prices and what you are charged.
            </p>
            <p style={{ margin: 0, fontSize: "14px", color: "#444", lineHeight: "1.6" }}>
              Always confirm pricing directly with your vet before booking your appointment.
            </p>
          </div>
        </div>
      )}

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px", fontFamily: "system-ui, sans-serif", minHeight: "100vh", boxSizing: "border-box" }}>
        {/* Top nav */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <Link href="/" style={{ color: "#2d6a4f", fontSize: "14px", textDecoration: "none" }}>← Back to all vets</Link>
          {session !== undefined && (session
            ? <Navbar />
            : <button onClick={() => router.push("/auth")} style={{ padding: "6px 14px", borderRadius: "20px", border: "1px solid #2d6a4f", background: "#fff", color: "#2d6a4f", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>Sign In</button>
          )}
        </div>

        {/* Vet Info Card */}
        <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
          {/* Name + heart */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <h1 style={{ margin: 0, fontSize: "1.4rem", color: "#111", lineHeight: "1.3", flex: 1 }}>{vet.name}</h1>
            <button onClick={toggleSave} title={isSaved ? "Remove from saved" : "Save this vet"} className={`save-btn${saveAnimating ? " save-animating" : ""}`} style={{ marginLeft: "12px", flexShrink: 0 }}>
              {isSaved ? "❤️" : "🤍"}
            </button>
          </div>

          {/* Badges */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
            {(Array.isArray(vet.vet_type) ? vet.vet_type : [vet.vet_type]).filter(Boolean).map((t) => (
              <span key={t} style={{ fontSize: "11px", background: "#e8f5e9", color: "#2d6a4f", padding: "4px 10px", borderRadius: "12px" }}>{t}</span>
            ))}
            {vet.ownership && (
              <span style={{ fontSize: "11px", background: "#f0f0f0", color: "#555", padding: "4px 10px", borderRadius: "12px" }}>{vet.ownership}</span>
            )}
          </div>

          {/* Location — no label */}
          {locationLine && (
            <p style={{ margin: "0 0 6px 0", fontSize: "14px", color: "#555" }}>{locationLine}</p>
          )}

          {/* Address — no label, just linked address */}
          {vet.address && (
            <div style={{ margin: "0 0 6px 0", fontSize: "14px" }}>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(vet.address + " " + (vet.city || "") + " CA " + (vet.zip_code || ""))}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#2d6a4f", textDecoration: "none" }}
              >
                <span style={{ display: "block" }}>{vet.address}</span>
                <span style={{ display: "block" }}>{vet.city}, CA {vet.zip_code} ↗</span>
              </a>
            </div>
          )}

          {/* Phone — no label, formatted */}
          {vet.phone && (
            <p style={{ margin: "0 0 6px 0", fontSize: "14px" }}>
              <a href={`tel:${vet.phone}`} style={{ color: "#2d6a4f", textDecoration: "none" }}>
                {formatPhone(vet.phone)}
              </a>
            </p>
          )}

          {/* Website — no label */}
          {vet.website && (
            <p style={{ margin: "0 0 14px 0", fontSize: "14px" }}>
              <a href={`https://${vet.website}`} target="_blank" rel="noopener noreferrer" style={{ color: "#2d6a4f", textDecoration: "none" }}>
                {vet.website} ↗
              </a>
            </p>
          )}

          {/* CareCredit + New Patients */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "14px", marginBottom: "16px" }}>
            <div>
              <span style={{ color: "#888", display: "block", marginBottom: "2px" }}>CareCredit</span>
              <strong style={{ color: "#111" }}>{vet.carecredit ? "✅ Accepted" : "❌ Not accepted"}</strong>
            </div>
            <div>
              {vet.accepting_new_patients !== null && (
                <>
                  <span style={{ color: "#888", display: "block", marginBottom: "2px" }}>New Patients</span>
                  <strong style={{ color: vet.accepting_new_patients ? "#2d6a4f" : "#c62828" }}>
                    {vet.accepting_new_patients ? "✅ Accepting" : "❌ Not accepting"}
                  </strong>
                </>
              )}
            </div>
          </div>

          {/* Hours */}
          {hoursLines.length > 0 && (
            <div style={{ fontSize: "14px", marginBottom: "16px" }}>
              <span style={{ color: "#888", display: "block", marginBottom: "4px" }}>Hours</span>
              {hoursLines.map((line, i) => (
                <div key={i} style={{ color: "#333" }}>{line}</div>
              ))}
            </div>
          )}

          <button onClick={handleShare} style={{ background: "none", border: "none", padding: "0", color: "#2d6a4f", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
            🔗 <span style={{ textDecoration: "underline" }}>Share this vet</span>
          </button>
        </div>

        {/* Price Comparison Chart */}
        {prices.length > 0 && allPrices.length > 0 && (
          <div ref={chartRef} style={{ background: "#fff", borderRadius: "12px", padding: "24px", marginBottom: "24px", border: "1px solid #e0e0e0" }}>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "18px", color: "#111", fontWeight: "700" }}>Price Comparison</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#888" }}>How this vet compares to the East Bay average</p>
            {prices.map((price) => {
              if (price.price_type === "starting") return null;
              const serviceName = price.services?.name;
              const vetPrice = price.price_low || price.price_paid;
              const allForService = allPrices.filter((p) => p.services?.name === serviceName && p.price_low && p.services?.id !== 8 && p.price_type !== "starting");
              const avg = allForService.length > 0 ? Math.round(allForService.reduce((sum, p) => sum + p.price_low, 0) / allForService.length) : null;
              if (!vetPrice || !avg) return null;
              const isCheaper = vetPrice <= avg;
              const max = Math.max(vetPrice, avg) * 1.2;
              const vetWidth = Math.round((vetPrice / max) * 100);
              const avgWidth = Math.round((avg / max) * 100);
              return (
                <div key={price.id} style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#333" }}>{serviceName}</span>
                    <span style={{ fontSize: "11px", fontWeight: "600", padding: "2px 8px", borderRadius: "20px", background: isCheaper ? "#e8f5e9" : "#fdecea", color: isCheaper ? "#2d6a4f" : "#c0392b" }}>
                      {isCheaper ? "✓ Below average" : "↑ Above average"}
                    </span>
                  </div>
                  {[
                    { label: "This vet", width: vetWidth, value: vetPrice, color: isCheaper ? "#2d6a4f" : "#e05c5c" },
                    { label: "East Bay avg", width: avgWidth, value: avg, color: "#bbb" },
                  ].map((bar) => (
                    <div key={bar.label} style={{ marginBottom: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "11px", color: "#666", width: "80px", flexShrink: 0 }}>{bar.label}</span>
                        <div style={{ flex: 1, background: "#f0f0f0", borderRadius: "4px", height: "20px", overflow: "hidden" }}>
                          <div style={{ width: chartVisible ? `${bar.width}%` : "0%", height: "100%", background: bar.color, borderRadius: "4px", transition: "width 0.8s ease", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: "6px" }}>
                            <span style={{ fontSize: "11px", color: "#fff", fontWeight: "600", whiteSpace: "nowrap" }}>${bar.value.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div style={{ height: "1px", background: "#f0f0f0", marginTop: "16px" }} />
                </div>
              );
            })}
          </div>
        )}

        {/* Pricing Section */}
        {vet.accepting_new_patients === false && !prices.some((p) => p.is_verified && p.price_low) ? (
          <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: "12px", padding: "24px", marginBottom: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "28px", marginBottom: "12px" }}>🚫</div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#111" }}>Not currently accepting new patients</h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#666", lineHeight: "1.6", maxWidth: "320px", marginLeft: "auto", marginRight: "auto" }}>
              This vet is not taking new clients at this time. We recommend calling ahead to check on availability before visiting.
            </p>
            {vet.phone && (
              <a href={`tel:${vet.phone}`} style={{ display: "inline-block", padding: "10px 24px", background: "#2d6a4f", color: "#fff", borderRadius: "8px", fontSize: "14px", textDecoration: "none", fontWeight: "600" }}>
                Call to check availability
              </a>
            )}
          </div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: "12px", padding: "20px", marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
              <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#111" }}>Pricing</h2>
              <button onClick={() => setShowPricingModal(true)} style={{ background: "none", border: "none", padding: 0, fontSize: "12px", color: "#2d6a4f", textDecoration: "underline", cursor: "pointer" }}>
                About these prices
              </button>
            </div>

            {lastVerified && (
              <p style={{ margin: "0 0 16px 0", fontSize: "11px", color: "#bbb" }}>Last verified {formatVerifiedDate(lastVerified)}</p>
            )}

            {prices.filter((p) => p.price_low !== null).length === 0 ? (
              <p style={{ color: "#999", fontStyle: "italic" }}>No pricing available yet.</p>
            ) : (
              prices.filter((p) => p.price_low !== null).map((p, i, arr) => {
                const serviceId = p.services?.id;
                const accordionCopy = ACCORDION_COPY[serviceId];
                const isExpanded = !!expandedRows[p.id];
                const noteLines = parseNotes(p.price_notes);
                const isLast = i === arr.length - 1;
                return (
                  <div key={p.id}>
                    <div onClick={accordionCopy ? () => toggleRow(p.id) : undefined} style={{ padding: "12px 0", cursor: accordionCopy ? "pointer" : "default" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: "14px", color: "#111" }}>{p.services?.name}</span>
                          {!accordionCopy && noteLines.map((note, j) => (
                            <p key={j} style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#888" }}>{note}</p>
                          ))}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "12px" }}>
                          <span style={{ fontSize: "14px", fontWeight: "bold", color: "#111", whiteSpace: "nowrap" }}>
                            {formatPrice(p.price_low, p.price_high, p.price_type)}
                          </span>
                          {accordionCopy && (
                            <button className="expand-btn" onClick={(e) => { e.stopPropagation(); toggleRow(p.id); }} aria-label={isExpanded ? "Collapse details" : "Expand details"}>
                              {isExpanded ? "−" : "+"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {accordionCopy && (
                      <div className={`accordion-wrap${isExpanded ? " open" : ""}`}>
                        <div className="accordion-inner">
                          <div style={{ background: "#f9f9f7", borderRadius: "8px", padding: "16px", marginBottom: "8px", display: "grid", gridTemplateColumns: noteLines.length > 0 ? "1fr 1fr" : "1fr", gap: "20px" }}>
                            {noteLines.length > 0 && (
                              <div>
                                <p style={{ margin: "0 0 8px 0", fontSize: "11px", fontWeight: "700", color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>What's included</p>
                                {noteLines.map((note, j) => (
                                  <p key={j} style={{ margin: "0 0 4px 0", fontSize: "13px", color: "#444", lineHeight: "1.6" }}>{note}</p>
                                ))}
                              </div>
                            )}
                            <div>
                              <p style={{ margin: "0 0 8px 0", fontSize: "11px", fontWeight: "700", color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>{accordionCopy.heading}</p>
                              <p style={{ margin: 0, fontSize: "13px", color: "#444", lineHeight: "1.6" }}>{accordionCopy.body}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {!isLast && <div style={{ height: "1px", background: "#f0f0f0" }} />}
                  </div>
                );
              })
            )}
          </div>
        )}

        {!(vet.accepting_new_patients === false && !prices.some((p) => p.is_verified && p.price_low)) && (
          <p style={{ fontSize: "11px", color: "#bbb", textAlign: "center", margin: "0 0 16px 0", lineHeight: "1.5" }}>
            Prices are estimates and may have changed.{" "}
            <button onClick={() => setShowPricingModal(true)} style={{ background: "none", border: "none", padding: 0, fontSize: "11px", color: "#bbb", textDecoration: "underline", cursor: "pointer" }}>
              Learn more.
            </button>
          </p>
        )}

        {/* Submit a Price */}
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <button onClick={() => { setShowForm(!showForm); setFormStatus(null); }} style={{ padding: "10px 24px", backgroundColor: "#2d6a4f", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>
            {showForm ? "Cancel" : "💰 Submit a Price"}
          </button>
          {showForm && (
            <div style={{ marginTop: "20px", background: "#fff", border: "1px solid #ddd", borderRadius: "12px", padding: "20px", textAlign: "left" }}>
              <h3 style={{ margin: "0 0 16px 0", color: "#111" }}>Submit a Vet Price</h3>
              {["vet_name", "service_name", "price_paid", "visit_date", "submitter_note"].map((field) => (
                <div key={field} style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "4px" }}>
                    {field === "vet_name" ? "Vet Name *" : field === "service_name" ? "Service *" : field === "price_paid" ? "Price Paid ($) *" : field === "visit_date" ? "Date of Visit (optional)" : "Notes (optional)"}
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
              <button onClick={handleSubmit} style={{ padding: "10px 24px", backgroundColor: "#2d6a4f", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>Submit</button>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer style={{ marginTop: "60px", borderTop: "1px solid #ddd", paddingTop: "24px", paddingBottom: "40px", textAlign: "center", color: "#888", fontSize: "13px" }}>
          <p style={{ margin: "0 0 8px 0", fontWeight: "bold", color: "#2d6a4f", fontSize: "15px" }}>🐾 PetParrk</p>
          <p style={{ margin: "0 0 8px 0" }}>Real prices. Real vets. No surprises.</p>
          <p style={{ margin: "0 0 8px 0" }}>Pricing data is verified by our team. Always call to confirm before your visit.</p>
          <p style={{ margin: "0" }}>
            Questions or feedback?{" "}
            <a href="mailto:bkalthompson@gmail.com" style={{ color: "#2d6a4f", textDecoration: "none" }}>bkalthompson@gmail.com</a>
          </p>
        </footer>
      </div>
    </>
  );
}
