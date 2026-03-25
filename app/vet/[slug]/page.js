"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";

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
  if (d.length === 10)
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === "1")
    return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
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
  const [allPrices, setAllPrices] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [shareConfirmed, setShareConfirmed] = useState(false);
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
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
        .eq("slug", slug)
        .single();
      const { data: priceData } = await supabase
        .from("vet_prices")
        .select("*, services(id, name)")
        .eq("vet_id", vetData?.id);
      const { data: allPricesData } = await supabase
        .from("vet_prices")
        .select("*, services(id, name)");
      setVet(vetData);
      setPrices(priceData || []);
      setAllPrices(allPricesData || []);
      setLoading(false);
      if (vetData) setFormData((f) => ({ ...f, vet_name: vetData.name }));
    }
    fetchData();
  }, [slug]);

  useEffect(() => {
    if (!session || !vet) return;
    supabase
      .from("saved_vets")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("vet_id", vet.id)
      .single()
      .then(({ data }) => setIsSaved(!!data));
  }, [session, vet]);

  // IntersectionObserver for chart animation
  useEffect(() => {
    if (!chartRef.current || loading) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setChartVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, [loading]);

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

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({
        title: vet.name,
        text: `Check out ${vet.name} on PetParrk`,
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      setShareConfirmed(true);
      setTimeout(() => setShareConfirmed(false), 2000);
    }
  }

  async function handleSubmit() {
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
      vet_name: vet?.name || "",
      service_name: "",
      price_paid: "",
      visit_date: "",
      submitter_note: "",
    });
  }

  function toggleRow(id) {
    setExpandedRows((prev) => ({ [id]: !prev[id] }));
  }

  function formatPrice(low, high, priceType) {
    if (!low && low !== 0) return "Call for quote";
    if (priceType === "starting") return `$${Number(low).toLocaleString()}+`;
    if (priceType === "range" && low !== high)
      return `$${Number(low).toLocaleString()}–$${Number(high).toLocaleString()}`;
    return `$${Number(low).toLocaleString()}`;
  }

  function formatVerifiedDate(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
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

  const lastVerified =
    prices.length > 0
      ? prices
          .filter((p) => p.created_at)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
          ?.created_at
      : null;

  if (loading)
    return (
      <div
        style={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>🐾</div>
          <p
            style={{
              color: "var(--color-muted, #9CA3AF)",
              fontSize: "14px",
              fontFamily: "var(--font-urbanist, system-ui)",
            }}
          >
            Loading vet profile…
          </p>
        </div>
      </div>
    );

  if (!vet)
    return (
      <div
        style={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>😕</div>
          <p
            style={{
              color: "var(--color-muted, #9CA3AF)",
              fontSize: "14px",
              fontFamily: "var(--font-urbanist, system-ui)",
            }}
          >
            Vet not found.
          </p>
          <Link
            href="/vets"
            style={{
              color: "var(--color-terracotta, #CF5C36)",
              fontSize: "14px",
              fontWeight: "700",
            }}
          >
            ← Back to all vets
          </Link>
        </div>
      </div>
    );

  const hoursLines = parseHours(vet.hours);
  const locationLine = [vet.neighborhood, vet.city].filter(Boolean).join(" · ");

  return (
    <>
      <style>{`
        /* Save button */
        @keyframes heartPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.5); }
          70%  { transform: scale(0.85); }
          100% { transform: scale(1); }
        }
        .save-btn { background: none; border: none; cursor: pointer; padding: 0; font-size: 24px; line-height: 1; transition: transform 0.1s; }
        .save-btn:hover { transform: scale(1.15); }
        .save-animating { animation: heartPop 0.4s ease forwards; }

        /* Accordion */
        .expand-btn {
          width: 28px; height: 28px; border-radius: 50%;
          border: 1.5px solid var(--color-terracotta, #CF5C36);
          background: transparent; color: var(--color-terracotta, #CF5C36);
          font-size: 18px; line-height: 0; cursor: pointer; padding: 0;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: background 0.2s ease, color 0.2s ease;
        }
        .expand-btn:hover { background: var(--color-terracotta, #CF5C36); color: #fff; }
        .accordion-wrap { display: grid; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease; }
        .accordion-wrap.open { grid-template-rows: 1fr; opacity: 1; }
        .accordion-inner { overflow: hidden; }

        /* Pricing modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; animation: fadeIn 0.15s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal-box { background: #fff; border-radius: 16px; padding: 28px; max-width: 440px; width: 100%; animation: slideUp 0.2s cubic-bezier(0.4,0,0.2,1); }
        @keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        /* Submit price bottom sheet */
        .sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: flex-end; animation: fadeIn 0.2s ease; }
        .sheet-box { background: #fff; border-radius: 20px 20px 0 0; padding: 28px 24px 40px; width: 100%; max-height: 90vh; overflow-y: auto; animation: sheetUp 0.3s cubic-bezier(0.4,0,0.2,1); }
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .sheet-handle { width: 40px; height: 4px; background: var(--color-border, #EDE8E0); border-radius: 4px; margin: 0 auto 20px; }

        /* Form inputs */
        .pp-form-input {
          width: 100%; padding: 12px 14px; border-radius: 10px;
          border: 1.5px solid var(--color-border, #EDE8E0);
          font-size: 15px; font-family: var(--font-urbanist, system-ui);
          outline: none; box-sizing: border-box; background: #fff;
          transition: border-color 0.15s ease; color: var(--color-navy-dark, #172531);
        }
        .pp-form-input:focus { border-color: var(--color-terracotta, #CF5C36); }

        /* Price row hover */
        .price-row { transition: background 0.15s ease; border-radius: 10px; }
        .price-row:hover { background: var(--color-cream, #F5F0E8); }

        /* Share confirmation */
        .share-btn { background: none; border: none; cursor: pointer; color: var(--color-terracotta, #CF5C36); font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; padding: 0; font-family: var(--font-urbanist, system-ui); transition: opacity 0.15s; }
        .share-btn:hover { opacity: 0.75; }

        /* Info grid */
        .info-pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; }

        @media (max-width: 768px) {
          .vet-header-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Pricing info modal */}
      {showPricingModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowPricingModal(false)}
        >
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "16px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "17px",
                  fontWeight: "800",
                  color: "var(--color-navy-dark, #172531)",
                  fontFamily: "var(--font-urbanist, system-ui)",
                }}
              >
                About our pricing data
              </h3>
              <button
                onClick={() => setShowPricingModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "22px",
                  color: "#aaa",
                  lineHeight: 1,
                  padding: "0 0 0 12px",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>
            <p
              style={{
                margin: "0 0 12px",
                fontSize: "15px",
                color: "var(--color-slate, #4B5563)",
                lineHeight: "1.7",
              }}
            >
              Prices shown are estimates based on community submissions and may
              have changed. PetParrk is not responsible for discrepancies
              between listed prices and what you are charged.
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "15px",
                color: "var(--color-slate, #4B5563)",
                lineHeight: "1.7",
              }}
            >
              Always confirm pricing directly with your vet before booking your
              appointment.
            </p>
          </div>
        </div>
      )}

      {/* Submit a Price bottom sheet */}
      {showSubmitModal && (
        <div
          className="sheet-overlay"
          onClick={() => {
            setShowSubmitModal(false);
            setFormStatus(null);
          }}
        >
          <div className="sheet-box" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "6px",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: "0 0 4px",
                    fontSize: "20px",
                    fontWeight: "800",
                    color: "var(--color-navy-dark, #172531)",
                    fontFamily: "var(--font-urbanist, system-ui)",
                  }}
                >
                  Submit a Price
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "var(--color-muted, #9CA3AF)",
                  }}
                >
                  Help other pet owners know what to expect.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSubmitModal(false);
                  setFormStatus(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "22px",
                  color: "#aaa",
                  lineHeight: 1,
                  padding: "0 0 0 12px",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                height: "1px",
                background: "var(--color-border, #EDE8E0)",
                margin: "16px 0 20px",
              }}
            />

            {formStatus === "success" ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎉</div>
                <h4
                  style={{
                    fontSize: "18px",
                    fontWeight: "800",
                    color: "var(--color-navy-dark, #172531)",
                    margin: "0 0 8px",
                    fontFamily: "var(--font-urbanist, system-ui)",
                  }}
                >
                  Thank you!
                </h4>
                <p
                  style={{
                    fontSize: "15px",
                    color: "var(--color-slate, #4B5563)",
                    lineHeight: "1.7",
                    margin: "0 0 24px",
                  }}
                >
                  Your submission is under review. Once verified it will help
                  pet owners in your community make better decisions.
                </p>
                <button
                  onClick={() => {
                    setShowSubmitModal(false);
                    setFormStatus(null);
                  }}
                  style={{
                    padding: "12px 28px",
                    background: "var(--color-terracotta, #CF5C36)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "15px",
                    fontWeight: "700",
                    cursor: "pointer",
                    fontFamily: "var(--font-urbanist, system-ui)",
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {[
                  {
                    field: "vet_name",
                    label: "Vet Name",
                    required: true,
                    type: "text",
                    placeholder: vet.name,
                  },
                  {
                    field: "service_name",
                    label: "Service",
                    required: true,
                    type: "text",
                    placeholder: "e.g. Doctor Exam, Dental Cleaning",
                  },
                  {
                    field: "price_paid",
                    label: "Price Paid ($)",
                    required: true,
                    type: "number",
                    placeholder: "e.g. 85",
                  },
                  {
                    field: "visit_date",
                    label: "Date of Visit",
                    required: false,
                    type: "date",
                    placeholder: "",
                  },
                  {
                    field: "submitter_note",
                    label: "Notes",
                    required: false,
                    type: "text",
                    placeholder: "Anything else that would help others?",
                  },
                ].map(({ field, label, required, type, placeholder }) => (
                  <div key={field} style={{ marginBottom: "16px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "var(--color-slate, #4B5563)",
                        marginBottom: "6px",
                        fontFamily: "var(--font-urbanist, system-ui)",
                      }}
                    >
                      {label}{" "}
                      {required && (
                        <span
                          style={{ color: "var(--color-terracotta, #CF5C36)" }}
                        >
                          *
                        </span>
                      )}
                    </label>
                    <input
                      type={type}
                      value={formData[field]}
                      onChange={(e) =>
                        setFormData({ ...formData, [field]: e.target.value })
                      }
                      placeholder={placeholder}
                      className="pp-form-input"
                    />
                  </div>
                ))}

                {formStatus === "error" && (
                  <div
                    style={{
                      background: "#FCEAEA",
                      color: "#C94040",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      fontSize: "14px",
                      marginBottom: "16px",
                    }}
                  >
                    Please fill in all required fields.
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "var(--color-terracotta, #CF5C36)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "15px",
                    fontWeight: "700",
                    cursor: "pointer",
                    fontFamily: "var(--font-urbanist, system-ui)",
                    marginTop: "4px",
                  }}
                >
                  Submit Price
                </button>
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--color-muted, #9CA3AF)",
                    textAlign: "center",
                    marginTop: "12px",
                    lineHeight: "1.6",
                  }}
                >
                  All submissions are reviewed before going live. We never share
                  your personal information.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Page header */}
      <div
        style={{
          background: "var(--color-navy-dark, #172531)",
          padding: "56px 0",
          minHeight: "180px",
          boxSizing: "border-box",
        }}
      >
        <div className="pp-container">
          <Link
            href="/vets"
            style={{
              fontSize: "13px",
              fontWeight: "600",
              color: "rgba(255,255,255,0.55)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "16px",
              transition: "color 0.15s",
            }}
          >
            ← Back to all vets
          </Link>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "16px",
            }}
          >
            <div style={{ flex: 1 }}>
              {/* Badges */}
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  flexWrap: "wrap",
                  marginBottom: "10px",
                }}
              >
                {(Array.isArray(vet.vet_type) ? vet.vet_type : [vet.vet_type])
                  .filter(Boolean)
                  .map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        background: "rgba(239,200,139,0.15)",
                        color: "var(--color-gold, #EFC88B)",
                        padding: "4px 10px",
                        borderRadius: "20px",
                        border: "1px solid rgba(239,200,139,0.3)",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                {vet.ownership && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      background: "rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.6)",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                  >
                    {vet.ownership}
                  </span>
                )}
              </div>
              <h1
                style={{
                  margin: "0 0 6px",
                  fontSize: "clamp(22px, 4vw, 36px)",
                  fontWeight: "800",
                  color: "#fff",
                  fontFamily: "var(--font-urbanist, 'Urbanist', sans-serif)",
                  lineHeight: "1.15",
                }}
              >
                {vet.name}
              </h1>
              {locationLine && (
                <p
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  {locationLine}
                </p>
              )}
            </div>
            {/* Save + Share */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexShrink: 0,
                paddingTop: "4px",
              }}
            >
              <button
                onClick={handleShare}
                className="share-btn"
                title="Share this vet"
              >
                {shareConfirmed ? "✓ Copied!" : "🔗 Share"}
              </button>
              <button
                onClick={toggleSave}
                title={isSaved ? "Remove from saved" : "Save this vet"}
                className={`save-btn${saveAnimating ? " save-animating" : ""}`}
              >
                {isSaved ? "❤️" : "🤍"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        className="pp-container"
        style={{ padding: "32px 24px 80px", boxSizing: "border-box" }}
      >
        {/* Info grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {/* Contact card */}
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid var(--color-border, #EDE8E0)",
              boxShadow: "0 2px 8px rgba(23,37,49,0.05)",
            }}
          >
            <p
              style={{
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--color-muted, #9CA3AF)",
                marginBottom: "14px",
              }}
            >
              Contact
            </p>
            {vet.address && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(vet.address + " " + (vet.city || "") + " CA " + (vet.zip_code || ""))}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  fontSize: "14px",
                  color: "var(--color-terracotta, #CF5C36)",
                  textDecoration: "none",
                  marginBottom: "8px",
                  lineHeight: "1.5",
                }}
              >
                📍 {vet.address}, {vet.city}, CA {vet.zip_code} ↗
              </a>
            )}
            {vet.phone && (
              <a
                href={`tel:${vet.phone}`}
                style={{
                  display: "block",
                  fontSize: "14px",
                  color: "var(--color-terracotta, #CF5C36)",
                  textDecoration: "none",
                  marginBottom: "8px",
                }}
              >
                📞 {formatPhone(vet.phone)}
              </a>
            )}
            {vet.website && (
              <a
                href={`https://${vet.website}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  fontSize: "14px",
                  color: "var(--color-terracotta, #CF5C36)",
                  textDecoration: "none",
                }}
              >
                🌐 {vet.website} ↗
              </a>
            )}
          </div>

          {/* Details card */}
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid var(--color-border, #EDE8E0)",
              boxShadow: "0 2px 8px rgba(23,37,49,0.05)",
            }}
          >
            <p
              style={{
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--color-muted, #9CA3AF)",
                marginBottom: "14px",
              }}
            >
              Details
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <span
                className="info-pill"
                style={{
                  background: vet.carecredit ? "#EDFAF3" : "#FEF2F2",
                  color: vet.carecredit ? "#1A6641" : "#C94040",
                }}
              >
                {vet.carecredit ? "✅" : "❌"} CareCredit
              </span>
              {vet.accepting_new_patients !== null && (
                <span
                  className="info-pill"
                  style={{
                    background: vet.accepting_new_patients
                      ? "#EDFAF3"
                      : "#FEF2F2",
                    color: vet.accepting_new_patients ? "#1A6641" : "#C94040",
                  }}
                >
                  {vet.accepting_new_patients ? "✅" : "❌"} New Patients
                </span>
              )}
            </div>
          </div>

          {/* Hours card */}
          {hoursLines.length > 0 && (
            <div
              style={{
                background: "#fff",
                borderRadius: "16px",
                padding: "24px",
                border: "1px solid var(--color-border, #EDE8E0)",
                boxShadow: "0 2px 8px rgba(23,37,49,0.05)",
              }}
            >
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--color-muted, #9CA3AF)",
                  marginBottom: "14px",
                }}
              >
                Hours
              </p>
              {hoursLines.map((line, i) => (
                <p
                  key={i}
                  style={{
                    margin: "0 0 4px",
                    fontSize: "14px",
                    color: "var(--color-slate, #4B5563)",
                    lineHeight: "1.5",
                  }}
                >
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Price Comparison Chart */}
        {prices.length > 0 && allPrices.length > 0 && (
          <div
            ref={chartRef}
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "28px",
              marginBottom: "20px",
              border: "1px solid var(--color-border, #EDE8E0)",
              boxShadow: "0 2px 8px rgba(23,37,49,0.05)",
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              <h3
                style={{
                  margin: "0 0 4px",
                  fontSize: "18px",
                  fontWeight: "800",
                  color: "var(--color-navy-dark, #172531)",
                  fontFamily: "var(--font-urbanist, system-ui)",
                }}
              >
                Price Comparison
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color: "var(--color-muted, #9CA3AF)",
                }}
              >
                How this vet compares to the East Bay average
              </p>
            </div>
            {prices.map((price) => {
              if (price.price_type === "starting") return null;
              const serviceName = price.services?.name;
              const vetPrice = price.price_low || price.price_paid;
              const allForService = allPrices.filter(
                (p) =>
                  p.services?.name === serviceName &&
                  p.price_low &&
                  p.services?.id !== 8 &&
                  p.price_type !== "starting",
              );
              const avg =
                allForService.length > 0
                  ? Math.round(
                      allForService.reduce((sum, p) => sum + p.price_low, 0) /
                        allForService.length,
                    )
                  : null;
              if (!vetPrice || !avg) return null;
              const isCheaper = vetPrice <= avg;
              const max = Math.max(vetPrice, avg) * 1.2;
              const vetWidth = Math.round((vetPrice / max) * 100);
              const avgWidth = Math.round((avg / max) * 100);
              return (
                <div key={price.id} style={{ marginBottom: "24px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "10px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "700",
                        color: "var(--color-navy-dark, #172531)",
                      }}
                    >
                      {serviceName}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        padding: "3px 10px",
                        borderRadius: "20px",
                        background: isCheaper ? "#EDFAF3" : "#FEF2F2",
                        color: isCheaper ? "#1A6641" : "#C94040",
                      }}
                    >
                      {isCheaper ? "✓ Below average" : "↑ Above average"}
                    </span>
                  </div>
                  {[
                    {
                      label: "This vet",
                      width: vetWidth,
                      value: vetPrice,
                      color: isCheaper
                        ? "var(--color-navy-mid, #2C4657)"
                        : "var(--color-terracotta, #CF5C36)",
                    },
                    {
                      label: "East Bay avg",
                      width: avgWidth,
                      value: avg,
                      color: "var(--color-border, #EDE8E0)",
                    },
                  ].map((bar) => (
                    <div key={bar.label} style={{ marginBottom: "8px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--color-muted, #9CA3AF)",
                            width: "80px",
                            flexShrink: 0,
                            fontWeight: "600",
                          }}
                        >
                          {bar.label}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            background: "var(--color-cream, #F5F0E8)",
                            borderRadius: "6px",
                            height: "22px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: chartVisible ? `${bar.width}%` : "0%",
                              height: "100%",
                              background: bar.color,
                              borderRadius: "6px",
                              transition:
                                "width 0.9s cubic-bezier(0.4,0,0.2,1)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              paddingRight: "8px",
                              boxSizing: "border-box",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "11px",
                                color:
                                  bar.color === "var(--color-border, #EDE8E0)"
                                    ? "var(--color-slate, #4B5563)"
                                    : "#fff",
                                fontWeight: "700",
                                whiteSpace: "nowrap",
                              }}
                            >
                              ${bar.value.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div
                    style={{
                      height: "1px",
                      background: "var(--color-border, #EDE8E0)",
                      marginTop: "16px",
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Pricing Section */}
        {vet.accepting_new_patients === false &&
        !prices.some((p) => p.is_verified && p.price_low) ? (
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--color-border, #EDE8E0)",
              borderRadius: "16px",
              padding: "40px 24px",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>🚫</div>
            <h3
              style={{
                margin: "0 0 8px",
                fontSize: "18px",
                fontWeight: "800",
                color: "var(--color-navy-dark, #172531)",
                fontFamily: "var(--font-urbanist, system-ui)",
              }}
            >
              Not currently accepting new patients
            </h3>
            <p
              style={{
                margin: "0 0 20px",
                fontSize: "15px",
                color: "var(--color-slate, #4B5563)",
                lineHeight: "1.7",
                maxWidth: "340px",
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              This vet is not taking new clients at this time. We recommend
              calling ahead to check on availability before visiting.
            </p>
            {vet.phone && (
              <a
                href={`tel:${vet.phone}`}
                style={{
                  display: "inline-block",
                  padding: "12px 28px",
                  background: "var(--color-terracotta, #CF5C36)",
                  color: "#fff",
                  borderRadius: "12px",
                  fontSize: "15px",
                  textDecoration: "none",
                  fontWeight: "700",
                  fontFamily: "var(--font-urbanist, system-ui)",
                }}
              >
                Call to check availability
              </a>
            )}
          </div>
        ) : (
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--color-border, #EDE8E0)",
              borderRadius: "16px",
              padding: "24px 28px",
              marginBottom: "8px",
              boxShadow: "0 2px 8px rgba(23,37,49,0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "4px",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: "800",
                  color: "var(--color-navy-dark, #172531)",
                  fontFamily: "var(--font-urbanist, system-ui)",
                }}
              >
                Pricing
              </h2>
              <button
                onClick={() => setShowPricingModal(true)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: "13px",
                  color: "var(--color-terracotta, #CF5C36)",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontFamily: "var(--font-urbanist, system-ui)",
                  fontWeight: "600",
                }}
              >
                About these prices
              </button>
            </div>
            {lastVerified && (
              <p
                style={{
                  margin: "0 0 20px",
                  fontSize: "12px",
                  color: "var(--color-muted, #9CA3AF)",
                }}
              >
                Last verified {formatVerifiedDate(lastVerified)}
              </p>
            )}

            {prices.filter((p) => p.price_low !== null).length === 0 ? (
              <p
                style={{
                  color: "var(--color-muted, #9CA3AF)",
                  fontStyle: "italic",
                  fontSize: "15px",
                }}
              >
                No pricing available yet.
              </p>
            ) : (
              prices
                .filter((p) => p.price_low !== null)
                .map((p, i, arr) => {
                  const serviceId = p.services?.id;
                  const accordionCopy = ACCORDION_COPY[serviceId];
                  const isExpanded = !!expandedRows[p.id];
                  const noteLines = parseNotes(p.price_notes);
                  const isLast = i === arr.length - 1;
                  return (
                    <div key={p.id}>
                      <div
                        className="price-row"
                        onClick={
                          accordionCopy ? () => toggleRow(p.id) : undefined
                        }
                        style={{
                          padding: "14px 10px",
                          cursor: accordionCopy ? "pointer" : "default",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <span
                              style={{
                                fontSize: "15px",
                                fontWeight: "600",
                                color: "var(--color-navy-dark, #172531)",
                              }}
                            >
                              {p.services?.name}
                            </span>
                            {!accordionCopy &&
                              noteLines.map((note, j) => (
                                <p
                                  key={j}
                                  style={{
                                    margin: "2px 0 0",
                                    fontSize: "12px",
                                    color: "var(--color-muted, #9CA3AF)",
                                  }}
                                >
                                  {note}
                                </p>
                              ))}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              marginLeft: "16px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "15px",
                                fontWeight: "800",
                                color: "var(--color-navy-dark, #172531)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {formatPrice(
                                p.price_low,
                                p.price_high,
                                p.price_type,
                              )}
                            </span>
                            {accordionCopy && (
                              <button
                                className="expand-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRow(p.id);
                                }}
                                aria-label={isExpanded ? "Collapse" : "Expand"}
                              >
                                {isExpanded ? "−" : "+"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {accordionCopy && (
                        <div
                          className={`accordion-wrap${isExpanded ? " open" : ""}`}
                        >
                          <div className="accordion-inner">
                            <div
                              style={{
                                background: "var(--color-cream, #F5F0E8)",
                                borderRadius: "12px",
                                padding: "20px",
                                marginBottom: "8px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "14px",
                              }}
                            >
                              {noteLines.length > 0 && (
                                <div>
                                  <p
                                    style={{
                                      margin: "0 0 6px",
                                      fontSize: "11px",
                                      fontWeight: "700",
                                      color: "var(--color-muted, #9CA3AF)",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                    }}
                                  >
                                    What's included
                                  </p>
                                  {noteLines.map((note, j) => (
                                    <p
                                      key={j}
                                      style={{
                                        margin: "0 0 4px",
                                        fontSize: "13px",
                                        color: "var(--color-slate, #4B5563)",
                                        lineHeight: "1.6",
                                      }}
                                    >
                                      {note}
                                    </p>
                                  ))}
                                </div>
                              )}
                              <div>
                                <p
                                  style={{
                                    margin: "0 0 6px",
                                    fontSize: "11px",
                                    fontWeight: "700",
                                    color: "var(--color-muted, #9CA3AF)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                  }}
                                >
                                  {accordionCopy.heading}
                                </p>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: "13px",
                                    color: "var(--color-slate, #4B5563)",
                                    lineHeight: "1.6",
                                  }}
                                >
                                  {accordionCopy.body}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {!isLast && (
                        <div
                          style={{
                            height: "1px",
                            background: "var(--color-border, #EDE8E0)",
                            margin: "0 10px",
                          }}
                        />
                      )}
                    </div>
                  );
                })
            )}
          </div>
        )}

        {/* Pricing disclaimer */}
        {!(
          vet.accepting_new_patients === false &&
          !prices.some((p) => p.is_verified && p.price_low)
        ) && (
          <p
            style={{
              fontSize: "12px",
              color: "var(--color-muted, #9CA3AF)",
              textAlign: "center",
              margin: "0 0 28px",
              lineHeight: "1.6",
            }}
          >
            Prices are estimates and may have changed.{" "}
            <button
              onClick={() => setShowPricingModal(true)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                fontSize: "12px",
                color: "var(--color-muted, #9CA3AF)",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              Learn more.
            </button>
          </p>
        )}

        {/* Submit a Price CTA */}
        <div
          style={{
            background: "var(--color-cream, #F5F0E8)",
            borderRadius: "16px",
            padding: "24px 28px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            border: "1px solid var(--color-border, #EDE8E0)",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 4px",
                fontSize: "15px",
                fontWeight: "700",
                color: "var(--color-navy-dark, #172531)",
                fontFamily: "var(--font-urbanist, system-ui)",
              }}
            >
              Visited {vet.name}?
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                color: "var(--color-slate, #4B5563)",
              }}
            >
              Help other pet owners by sharing what you paid.
            </p>
          </div>
          <button
            onClick={() => {
              setShowSubmitModal(true);
              setFormStatus(null);
            }}
            style={{
              padding: "12px 24px",
              background: "var(--color-terracotta, #CF5C36)",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: "700",
              cursor: "pointer",
              fontFamily: "var(--font-urbanist, system-ui)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Submit a Price
          </button>
        </div>
      </div>
    </>
  );
}
