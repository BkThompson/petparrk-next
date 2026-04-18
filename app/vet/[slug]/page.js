"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";

const C = {
  navyDark: "#172531",
  navyMid: "#2C4657",
  terracotta: "#CF5C36",
  gold: "#EFC88B",
  cream: "#F5F0E8",
  white: "#FFFFFF",
  slate: "#4B5563",
  muted: "#717A86",
  success: "#2A7D4F",
  error: "#C94040",
  border: "#EDE8E0",
};

const ACCORDION_COPY = {
  4: {
    heading: "About dental pricing",
    body: "Dental costs vary based on your dog's age, size, and the condition of their teeth. This is a starting estimate. Pre-surgical bloodwork and extractions, if needed, are typically billed separately. Always call to confirm for your specific pet.",
  },
  8: {
    heading: "About non-anesthesia dental",
    body: "Non-anesthesia dental cleaning is a surface-level cleaning performed without sedation. It does not replace a full dental procedure under anesthesia. Ask your vet whether this option is appropriate for your pet.",
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

const EMPTY_ENTRY = {
  service_name: "",
  price_type: "exact",
  price_low: "",
  price_high: "",
  species: "",
  species_other: "",
  includes_bloodwork: false,
  includes_xrays: false,
  includes_anesthesia: false,
  carecredit: "",
  accepting_new_patients: "",
  vaccines_included: "",
};

const MAZE_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">` +
    `<line x1="0" y1="0" x2="30" y2="0" stroke="rgba(180,210,255,0.09)" stroke-width="1"/>` +
    `<line x1="50" y1="40" x2="80" y2="40" stroke="rgba(180,210,255,0.09)" stroke-width="1"/>` +
    `<line x1="0" y1="80" x2="20" y2="80" stroke="rgba(180,210,255,0.09)" stroke-width="1"/>` +
    `<line x1="60" y1="80" x2="80" y2="80" stroke="rgba(180,210,255,0.09)" stroke-width="1"/>` +
    `<line x1="0" y1="0" x2="0" y2="30" stroke="rgba(180,210,255,0.09)" stroke-width="1"/>` +
    `<line x1="30" y1="0" x2="30" y2="40" stroke="rgba(180,210,255,0.09)" stroke-width="1"/>` +
    `<line x1="80" y1="40" x2="80" y2="80" stroke="rgba(180,210,255,0.09)" stroke-width="1"/>` +
    `<line x1="20" y1="60" x2="20" y2="80" stroke="rgba(180,210,255,0.09)" stroke-width="1"/>` +
    `<line x1="60" y1="20" x2="60" y2="80" stroke="rgba(180,210,255,0.09)" stroke-width="1"/>` +
    `</svg>`,
);
const MAZE_BG = `url("data:image/svg+xml,${MAZE_SVG}")`;

function isVaccinePackage(n) {
  return n && n.toLowerCase().includes("vaccine package");
}
function formatPhone(p) {
  if (!p) return null;
  const d = p.replace(/\D/g, "");
  if (d.length === 10)
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === "1")
    return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return p;
}
function formatPrice(low, high, type) {
  if (!low && low !== 0) return "Call for quote";
  if (type === "starting") return `$${Number(low).toLocaleString()}+`;
  if (type === "range" && low !== high)
    return `$${Number(low).toLocaleString()}–$${Number(high).toLocaleString()}`;
  return `$${Number(low).toLocaleString()}`;
}
function formatVerifiedDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}
function parseHours(s) {
  if (!s) return [];
  if (s.includes(",")) {
    const DAY =
      /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon-Fri|Sat-Sun|Weekday|Weekend|Emergency|Daily)/i;
    const parts = s
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const lines = [];
    parts.forEach((part) => {
      if (DAY.test(part) || lines.length === 0) lines.push(part);
      else lines[lines.length - 1] += ", " + part;
    });
    if (lines.length > 1) return lines;
  }
  const split = s.split(
    /(?=\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b)/,
  );
  if (split.length > 1) return split.map((p) => p.trim()).filter(Boolean);
  return [s.trim()];
}
function parseNotes(n) {
  if (!n) return [];
  return n.split(" / ").map((x) => x.trim());
}

function HoursDisplay({ lines }) {
  if (lines.length === 0)
    return (
      <p style={{ fontSize: "14px", color: C.muted, margin: 0 }}>
        Call for hours
      </p>
    );
  if (lines.length >= 4) {
    const mid = Math.ceil(lines.length / 2);
    return (
      <>
        <div className="hours-2col" style={{ display: "flex", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "3px",
              flex: 1,
            }}
          >
            {lines.slice(0, mid).map((l, i) => (
              <span
                key={i}
                style={{
                  fontSize: "13px",
                  color: C.slate,
                  lineHeight: "1.6",
                  display: "block",
                  overflowWrap: "break-word",
                }}
              >
                {l}
              </span>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "3px",
              flex: 1,
            }}
          >
            {lines.slice(mid).map((l, i) => (
              <span
                key={i}
                style={{
                  fontSize: "13px",
                  color: C.slate,
                  lineHeight: "1.6",
                  display: "block",
                  overflowWrap: "break-word",
                }}
              >
                {l}
              </span>
            ))}
          </div>
        </div>
        <div
          className="hours-1col"
          style={{ display: "none", flexDirection: "column", gap: "3px" }}
        >
          {lines.map((l, i) => (
            <span
              key={i}
              style={{
                fontSize: "13px",
                color: C.slate,
                lineHeight: "1.6",
                display: "block",
                overflowWrap: "break-word",
              }}
            >
              {l}
            </span>
          ))}
        </div>
      </>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
      {lines.map((l, i) => (
        <span
          key={i}
          style={{
            fontSize: "14px",
            color: C.slate,
            lineHeight: "1.5",
            display: "block",
            overflowWrap: "break-word",
          }}
        >
          {l}
        </span>
      ))}
    </div>
  );
}

function InfoLabel({ children }) {
  return (
    <p
      style={{
        fontSize: "11px",
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: C.muted,
        margin: "0 0 10px",
      }}
    >
      {children}
    </p>
  );
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
  const [shareConfirmed, setShareConfirmed] = useState(false);
  const [chartVisible, setChartVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [sheetMounted, setSheetMounted] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const SHEET_DUR = 340;
  const [visitDate, setVisitDate] = useState("");
  const [submitterNote, setSubmitterNote] = useState("");
  const [submitFile, setSubmitFile] = useState(null);
  const [entries, setEntries] = useState([{ ...EMPTY_ENTRY }]);
  const [formStatus, setFormStatus] = useState(null);
  const [vetName, setVetName] = useState("");
  const [vetId, setVetId] = useState(null);
  const chartRef = useRef(null);
  const fileInputRef = useRef(null);
  const sbWidthRef = useRef(0);

  useEffect(() => {
    sbWidthRef.current =
      window.innerWidth - document.documentElement.clientWidth;
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
        .select("*, services(id,name)")
        .eq("vet_id", vetData?.id);
      const { data: allPricesData } = await supabase
        .from("vet_prices")
        .select("*, services(id,name)");
      setVet(vetData);
      setPrices(priceData || []);
      setAllPrices(allPricesData || []);
      setLoading(false);
      if (vetData) {
        setVetName(vetData.name);
        setVetId(vetData.id);
      }
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

  useEffect(() => {
    if (!chartRef.current || loading) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setChartVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(chartRef.current);
    return () => obs.disconnect();
  }, [loading]);

  useEffect(() => {
    const html = document.documentElement;
    if (sheetMounted) {
      html.style.setProperty("--sb-width", `${sbWidthRef.current}px`);
      html.classList.add("sheet-open");
    } else {
      html.classList.remove("sheet-open");
      html.style.removeProperty("--sb-width");
    }
    return () => {
      html.classList.remove("sheet-open");
      html.style.removeProperty("--sb-width");
    };
  }, [sheetMounted]);

  function openSheet() {
    resetForm();
    setSheetMounted(true);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setSheetVisible(true)),
    );
  }
  function closeSheet() {
    setSheetVisible(false);
    setTimeout(() => {
      setSheetMounted(false);
      setFormStatus(null);
    }, SHEET_DUR);
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
  function updateEntry(idx, field, val) {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: val } : e)),
    );
  }
  function addEntry() {
    setEntries((prev) => [...prev, { ...EMPTY_ENTRY }]);
  }
  function removeEntry(idx) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }
  async function handleSubmit() {
    const valid = entries.every((e) => e.service_name && e.price_low);
    if (!valid) {
      setFormStatus("error");
      return;
    }
    const rows = entries.map((e) => ({
      vet_id: vetId,
      vet_name: vetName,
      service_name: e.service_name,
      species: e.species === "other" ? e.species_other || "other" : e.species,
      price_paid: parseFloat(e.price_low),
      visit_date: visitDate || null,
      submitter_note: submitterNote || null,
    }));
    const { error } = await supabase.from("price_submissions").insert(rows);
    if (error) {
      setFormStatus("error");
      return;
    }
    setFormStatus("success");
  }
  function resetForm() {
    setEntries([{ ...EMPTY_ENTRY }]);
    setVisitDate("");
    setSubmitterNote("");
    setSubmitFile(null);
    setFormStatus(null);
  }
  function validateAndSetFile(file) {
    const ok = ["image/jpeg", "image/png", "application/pdf"].includes(
      file.type,
    );
    if (!ok || file.size > 5 * 1024 * 1024) return;
    setSubmitFile(file);
  }
  function toggleRow(id) {
    setExpandedRows((prev) => ({ [id]: !prev[id] }));
  }

  const lastVerified =
    prices.length > 0
      ? prices
          .filter((p) => p.created_at)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
          ?.created_at
      : null;
  const returnUrl =
    typeof window !== "undefined" ? window.location.pathname : `/vet/${slug}`;
  const visibleChartPrices = prices.filter((price) => {
    if (price.price_type === "starting") return false;
    const vp = price.price_low || price.price_paid;
    const all = allPrices.filter(
      (p) =>
        p.services?.name === price.services?.name &&
        p.price_low &&
        p.services?.id !== 8 &&
        p.price_type !== "starting",
    );
    return vp && all.length > 0;
  });
  const pricedRows = prices.filter((p) => p.price_low !== null);

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
          <p style={{ color: C.muted, fontSize: "14px" }}>
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
          <p style={{ color: C.muted, fontSize: "14px" }}>Vet not found.</p>
          <Link
            href="/vets"
            style={{ color: C.terracotta, fontSize: "14px", fontWeight: "700" }}
          >
            ← Back to all vets
          </Link>
        </div>
      </div>
    );

  const hoursLines = parseHours(vet?.hours || "");
  const locationLine = [vet?.neighborhood, vet?.city]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <style>{`
        @keyframes heartPop{0%{transform:scale(1)}40%{transform:scale(1.5)}70%{transform:scale(0.85)}100%{transform:scale(1)}}
        .save-btn{background:none;border:none;cursor:pointer;padding:0;font-size:20px;line-height:1;transition:transform 0.1s;}
        .save-btn:hover{transform:scale(1.15);}
        .save-animating{animation:heartPop 0.4s ease forwards;}
        .acc-wrap{display:grid;grid-template-rows:0fr;opacity:0;transition:grid-template-rows 0.38s cubic-bezier(0.4,0,0.2,1),opacity 0.3s ease;}
        .acc-wrap.open{grid-template-rows:1fr;opacity:1;}
        .acc-inner{overflow:hidden;}
        .expand-btn{width:28px;height:28px;border-radius:50%;border:1.5px solid ${C.terracotta};background:transparent;color:${C.terracotta};cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background 0.2s,color 0.2s;outline:none;}
        .expand-btn:hover,.expand-btn.is-open{background:${C.terracotta};color:#fff;}
        .expand-btn.is-open:hover{background:#a8471d;border-color:#a8471d;}
        .expand-icon{width:10px;height:10px;display:block;flex-shrink:0;transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);user-select:none;}
        .expand-icon.open{transform:rotate(45deg);}
        .price-row{padding:16px 0px;}
        .sheet-overlay{position:fixed;inset:0;background:rgba(0,0,0,0);z-index:1000;display:flex;align-items:flex-end;justify-content:center;transition:background ${SHEET_DUR}ms ease;pointer-events:none;}
        .sheet-overlay.visible{background:rgba(0,0,0,0.5);pointer-events:all;}
        .sheet-box{background:#fff;border-radius:20px 20px 0 0;width:100%;max-width:800px;max-height:92vh;overflow-y:auto;box-sizing:border-box;position:relative;transform:translateY(100%);transition:transform ${SHEET_DUR}ms cubic-bezier(0.4,0,0.2,1);}
        .sheet-overlay.visible .sheet-box{transform:translateY(0);}
        .sheet-header-row{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 0;position:sticky;top:0;z-index:10;background:#fff;}
        .sheet-handle-bar{width:40px;height:4px;background:${C.border};border-radius:4px;}
        .sheet-close-btn{width:32px;height:32px;border-radius:50%;background:${C.cream};border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;line-height:1;color:${C.slate};transition:background 0.15s;flex-shrink:0;}
        .sheet-close-btn:hover{background:${C.border};}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px;}
        .modal-box{background:#fff;border-radius:16px;padding:28px;max-width:440px;width:100%;}
        .pp-input{width:100%;padding:11px 14px;border-radius:10px;border:1.5px solid ${C.border};font-size:15px;font-family:var(--font-urbanist,system-ui);outline:none;box-sizing:border-box;background:#fff;transition:border-color 0.15s;color:${C.navyDark};-webkit-appearance:none;appearance:none;}
        .pp-input:focus{border-color:${C.terracotta};}
        .pp-label{display:block;font-size:13px;font-weight:700;color:${C.slate};margin-bottom:6px;}
        .pp-select-wrap{position:relative;}
        .pp-select-wrap::after{content:"▾";position:absolute;right:14px;top:50%;transform:translateY(-50%);color:${C.muted};pointer-events:none;font-size:13px;}
        .seg-btn{flex:1;padding:10px 6px;border:1.5px solid ${C.border};border-radius:10px;background:#fff;color:${C.slate};font-weight:600;font-size:13px;cursor:pointer;transition:all 0.15s;text-align:center;}
        .seg-btn.active{background:${C.terracotta};color:#fff;border-color:${C.terracotta};}
        .pill-toggle{padding:7px 14px;border-radius:20px;font-size:13px;font-weight:600;border:1.5px solid ${C.border};background:#fff;cursor:pointer;transition:all 0.15s;color:${C.slate};}
        .pill-toggle.active{background:${C.navyDark};color:#fff;border-color:${C.navyDark};}
        .upload-zone{border:2px dashed ${C.border};border-radius:12px;padding:28px 16px;text-align:center;cursor:pointer;transition:border-color 0.2s,background 0.2s;}
        .upload-zone:hover,.upload-zone.drag{border-color:${C.terracotta};background:#fffaf8;}
        .upload-zone.has-file{border-color:${C.success};background:#f0faf4;}
        .entry-card{background:${C.cream};border-radius:12px;padding:20px;border:1px solid ${C.border};margin-bottom:12px;}
        .share-btn{background:none;border:none;cursor:pointer;color:${C.muted};font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:5px;padding:0;transition:color 0.15s;}
        .share-btn:hover{color:${C.slate};}
        .submit-cta-btn{padding:12px 24px;background:${C.terracotta};color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:background 0.2s,color 0.2s;border:2px solid ${C.terracotta};}
        .submit-cta-btn:hover{background:#fff;color:${C.terracotta};}
        .submit-price-btn{width:100%;padding:14px;background:${C.terracotta};color:#fff;border:2px solid ${C.terracotta};border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;transition:background 0.2s,color 0.2s;}
        .submit-price-btn:hover{background:#fff;color:${C.terracotta};}
        .chart-row-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:8px;}








        /* Header */
        .vet-header{background:${C.navyDark};min-height:393px;padding:80px 0 88px;position:relative;overflow:hidden;box-sizing:border-box;border-bottom:1px solid rgba(255,255,255,0.07);}








        /* Info strip */
        .info-2col{display:grid;grid-template-columns:1fr 1fr;}
        /* Vertical divider — absolute, doesn't span full cell height */
        .v-div{position:absolute;right:0;top:20px;bottom:20px;width:1px;background:${C.border};}
        /* Divider row — two floating lines on desktop, one on mobile */
        .info-div-row{display:grid;grid-template-columns:1fr 1fr;padding:0;}
        .info-div-left{padding:0 20px;}
        .info-div-right{padding:0 20px;}
        /* Mobile-only divider — shown only when stacked */
        .info-mob-div{display:none;height:1px;background:${C.border};margin:0 20px;}








        @media(max-width:768px){
          .vet-header{min-height:338px;padding:80px 0 88px;}
          .info-2col{grid-template-columns:1fr;}
          .v-div{display:none;}
          /* Divider row: collapse to single column, hide right */
          .info-div-row{grid-template-columns:1fr;}
          .info-div-right{display:none;}
          /* Show mobile-only dividers */
          .info-mob-div{display:block;}
          /* Hours columns */
          .hours-2col{display:none!important;}
          .hours-1col{display:flex!important;}
          /* Price badge */
          .chart-row-header{flex-direction:column;align-items:flex-start;gap:6px;}
          /* Submit */
          .submit-cta-btn{width:100%;box-sizing:border-box;padding:14px;}
          .submit-cta-wrap{flex-direction:column!important;}
          .form-2col{grid-template-columns:1fr!important;}
          .seg-group{flex-wrap:wrap!important;}
        }
        @media(max-width:375px){.entry-card{padding:14px;}}
      `}</style>

      {/* Pricing modal */}
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
                  color: C.navyDark,
                  fontFamily: "var(--font-urbanist,system-ui)",
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
                  fontSize: "28px",
                  color: "#aaa",
                  lineHeight: 1,
                  padding: "0 0 0 12px",
                  fontWeight: "300",
                }}
              >
                ×
              </button>
            </div>
            <p
              style={{
                margin: "0 0 12px",
                fontSize: "15px",
                color: C.slate,
                lineHeight: "1.7",
              }}
            >
              Prices shown are estimates based on community submissions and may
              have changed.
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "15px",
                color: C.slate,
                lineHeight: "1.7",
              }}
            >
              Always confirm pricing directly with your vet before booking.
            </p>
          </div>
        </div>
      )}

      {/* Sheet */}
      {sheetMounted && (
        <div
          className={`sheet-overlay${sheetVisible ? " visible" : ""}`}
          onClick={closeSheet}
        >
          <div className="sheet-box" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header-row">
              <div style={{ width: "32px" }} />
              <div className="sheet-handle-bar" />
              <button
                className="sheet-close-btn"
                onClick={closeSheet}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div style={{ padding: "16px 24px 48px" }}>
              {session === null ? (
                <div style={{ textAlign: "center", padding: "16px 0 32px" }}>
                  <div style={{ fontSize: "44px", marginBottom: "16px" }}>
                    🐾
                  </div>
                  <h3
                    style={{
                      margin: "0 0 8px",
                      fontSize: "20px",
                      fontWeight: "800",
                      color: C.navyDark,
                      fontFamily: "var(--font-urbanist,system-ui)",
                    }}
                  >
                    Create a free account
                  </h3>
                  <p
                    style={{
                      margin: "0 0 28px",
                      fontSize: "15px",
                      color: C.slate,
                      lineHeight: "1.7",
                      maxWidth: "300px",
                      marginLeft: "auto",
                      marginRight: "auto",
                    }}
                  >
                    Join PetParrk to submit prices and help pet owners in your
                    community.
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      maxWidth: "300px",
                      margin: "0 auto",
                    }}
                  >
                    <Link
                      href={`/auth?redirect=${encodeURIComponent(returnUrl)}`}
                      style={{
                        display: "block",
                        padding: "14px",
                        background: C.terracotta,
                        color: "#fff",
                        borderRadius: "12px",
                        fontSize: "15px",
                        fontWeight: "700",
                        textDecoration: "none",
                        textAlign: "center",
                      }}
                    >
                      Create free account
                    </Link>
                    <Link
                      href={`/auth?redirect=${encodeURIComponent(returnUrl)}`}
                      style={{
                        display: "block",
                        padding: "14px",
                        background: "transparent",
                        color: C.navyDark,
                        borderRadius: "12px",
                        fontSize: "15px",
                        fontWeight: "700",
                        textDecoration: "none",
                        textAlign: "center",
                        border: `1.5px solid ${C.border}`,
                      }}
                    >
                      Sign in
                    </Link>
                  </div>
                </div>
              ) : formStatus === "success" ? (
                <div style={{ textAlign: "center", padding: "16px 0 32px" }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                    🎉
                  </div>
                  <h4
                    style={{
                      fontSize: "20px",
                      fontWeight: "800",
                      color: C.navyDark,
                      margin: "0 0 8px",
                      fontFamily: "var(--font-urbanist,system-ui)",
                    }}
                  >
                    Thank you!
                  </h4>
                  <p
                    style={{
                      fontSize: "15px",
                      color: C.slate,
                      lineHeight: "1.7",
                      margin: "0 0 28px",
                    }}
                  >
                    Your submission is under review.
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      maxWidth: "300px",
                      margin: "0 auto",
                    }}
                  >
                    <button
                      onClick={resetForm}
                      style={{
                        padding: "13px 32px",
                        background: C.terracotta,
                        color: "#fff",
                        border: "none",
                        borderRadius: "12px",
                        fontSize: "15px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      Submit another price
                    </button>
                    <button
                      onClick={closeSheet}
                      style={{
                        padding: "13px 32px",
                        background: "transparent",
                        color: C.slate,
                        border: `1.5px solid ${C.border}`,
                        borderRadius: "12px",
                        fontSize: "15px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3
                    style={{
                      margin: "0 0 4px",
                      fontSize: "20px",
                      fontWeight: "800",
                      color: C.navyDark,
                      fontFamily: "var(--font-urbanist,system-ui)",
                    }}
                  >
                    Submit a Price
                  </h3>
                  <p
                    style={{
                      margin: "0 0 16px",
                      fontSize: "14px",
                      color: C.muted,
                    }}
                  >
                    Help other pet owners know what to expect.
                  </p>
                  <div
                    style={{
                      height: "1px",
                      background: C.border,
                      margin: "0 0 20px",
                    }}
                  />
                  <div style={{ marginBottom: "16px" }}>
                    <label className="pp-label">Vet</label>
                    <input
                      type="text"
                      value={vetName}
                      readOnly
                      className="pp-input"
                      style={{
                        background: C.cream,
                        color: C.slate,
                        cursor: "default",
                      }}
                    />
                  </div>
                  {entries.map((entry, idx) => (
                    <div key={idx} className="entry-card">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "14px",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: "13px",
                            fontWeight: "700",
                            color: C.muted,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          Service {entries.length > 1 ? idx + 1 : ""}
                        </p>
                        {entries.length > 1 && (
                          <button
                            onClick={() => removeEntry(idx)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "13px",
                              color: C.error,
                              fontWeight: "700",
                              padding: 0,
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div style={{ marginBottom: "14px" }}>
                        <label className="pp-label">
                          Service <span style={{ color: C.terracotta }}>*</span>
                        </label>
                        <div className="pp-select-wrap">
                          <select
                            value={entry.service_name}
                            onChange={(e) =>
                              updateEntry(idx, "service_name", e.target.value)
                            }
                            className="pp-input"
                          >
                            <option value="">— Select —</option>
                            <optgroup label="Exam">
                              <option>Annual Wellness Exam</option>
                              <option>Doctor Exam</option>
                              <option>Vet Tech Exam</option>
                            </optgroup>
                            <optgroup label="Vaccine">
                              <option>Bordetella Vaccine</option>
                              <option>Canine Influenza Vaccine</option>
                              <option>DHPP Vaccine</option>
                              <option>FeLV Vaccine</option>
                              <option>FVRCP Vaccine</option>
                              <option>Leptospirosis Vaccine</option>
                              <option>Rabies Vaccine</option>
                              <option>Vaccine Package — Cat</option>
                              <option>Vaccine Package — Dog</option>
                            </optgroup>
                            <optgroup label="Dental">
                              <option>Dental Cleaning</option>
                              <option>Dental Cleaning (No Anesthesia)</option>
                            </optgroup>
                            <optgroup label="Surgery">
                              <option>Neuter</option>
                              <option>Spay</option>
                            </optgroup>
                            <optgroup label="Emergency">
                              <option>Emergency Visit</option>
                              <option>Urgent Care Visit</option>
                            </optgroup>
                          </select>
                        </div>
                      </div>
                      {isVaccinePackage(entry.service_name) && (
                        <div style={{ marginBottom: "14px" }}>
                          <label className="pp-label">Vaccines Included</label>
                          <input
                            type="text"
                            value={entry.vaccines_included || ""}
                            onChange={(e) =>
                              updateEntry(
                                idx,
                                "vaccines_included",
                                e.target.value,
                              )
                            }
                            placeholder="e.g. Rabies, DHPP, Bordetella…"
                            className="pp-input"
                          />
                          <p
                            style={{
                              margin: "4px 0 0",
                              fontSize: "12px",
                              color: C.muted,
                            }}
                          >
                            This will display publicly on the vet profile.
                          </p>
                        </div>
                      )}
                      <div style={{ marginBottom: "14px" }}>
                        <label className="pp-label">
                          Price Type{" "}
                          <span style={{ color: C.terracotta }}>*</span>
                        </label>
                        <div
                          className="seg-group"
                          style={{ display: "flex", gap: "8px" }}
                        >
                          {["exact", "range", "starting"].map((type) => (
                            <button
                              key={type}
                              onClick={() =>
                                updateEntry(idx, "price_type", type)
                              }
                              className={`seg-btn${entry.price_type === type ? " active" : ""}`}
                            >
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div
                        className="form-2col"
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            entry.price_type === "range" ? "1fr 1fr" : "1fr",
                          gap: "12px",
                          marginBottom: "14px",
                        }}
                      >
                        <div>
                          <label className="pp-label">
                            {entry.price_type === "range"
                              ? "Price Low ($)"
                              : "Price ($)"}{" "}
                            <span style={{ color: C.terracotta }}>*</span>
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 85"
                            value={entry.price_low}
                            onChange={(e) =>
                              updateEntry(idx, "price_low", e.target.value)
                            }
                            className="pp-input"
                          />
                        </div>
                        {entry.price_type === "range" && (
                          <div>
                            <label className="pp-label">
                              Price High ($){" "}
                              <span style={{ color: C.terracotta }}>*</span>
                            </label>
                            <input
                              type="number"
                              placeholder="e.g. 200"
                              value={entry.price_high}
                              onChange={(e) =>
                                updateEntry(idx, "price_high", e.target.value)
                              }
                              className="pp-input"
                            />
                          </div>
                        )}
                      </div>
                      <div style={{ marginBottom: "14px" }}>
                        <label className="pp-label">Species</label>
                        <div className="pp-select-wrap">
                          <select
                            value={entry.species}
                            onChange={(e) =>
                              updateEntry(idx, "species", e.target.value)
                            }
                            className="pp-input"
                          >
                            <option value="">— Select —</option>
                            <option value="dog">Dog</option>
                            <option value="cat">Cat</option>
                            <option value="rabbit">Rabbit</option>
                            <option value="bird">Bird</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                      {entry.species === "other" && (
                        <div
                          style={{ marginTop: "10px", marginBottom: "14px" }}
                        >
                          <input
                            type="text"
                            value={entry.species_other || ""}
                            onChange={(e) =>
                              updateEntry(idx, "species_other", e.target.value)
                            }
                            placeholder="e.g. Guinea pig, bird…"
                            className="pp-input"
                          />
                        </div>
                      )}
                      <div style={{ marginBottom: "14px" }}>
                        <label className="pp-label">Includes</label>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            flexWrap: "wrap",
                          }}
                        >
                          {[
                            { key: "includes_bloodwork", label: "Bloodwork" },
                            { key: "includes_xrays", label: "X-Rays" },
                            { key: "includes_anesthesia", label: "Anesthesia" },
                          ].map(({ key, label }) => (
                            <button
                              key={key}
                              onClick={() => updateEntry(idx, key, !entry[key])}
                              className={`pill-toggle${entry[key] ? " active" : ""}`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div
                        className="form-2col"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "12px",
                        }}
                      >
                        <div>
                          <label className="pp-label">CareCredit</label>
                          <div className="pp-select-wrap">
                            <select
                              value={entry.carecredit}
                              onChange={(e) =>
                                updateEntry(idx, "carecredit", e.target.value)
                              }
                              className="pp-input"
                            >
                              <option value="">— Select —</option>
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                              <option value="unknown">Unknown</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="pp-label">
                            Accepting New Patients
                          </label>
                          <div className="pp-select-wrap">
                            <select
                              value={entry.accepting_new_patients}
                              onChange={(e) =>
                                updateEntry(
                                  idx,
                                  "accepting_new_patients",
                                  e.target.value,
                                )
                              }
                              className="pp-input"
                            >
                              <option value="">— Select —</option>
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                              <option value="unknown">Unknown</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addEntry}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "transparent",
                      color: C.terracotta,
                      border: `1.5px dashed ${C.terracotta}`,
                      borderRadius: "12px",
                      fontSize: "14px",
                      fontWeight: "700",
                      cursor: "pointer",
                      marginBottom: "20px",
                    }}
                  >
                    + Add another service
                  </button>
                  <div style={{ marginBottom: "16px" }}>
                    <label className="pp-label">Date of Visit</label>
                    <input
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="pp-input"
                      style={{ textAlign: "left" }}
                    />
                  </div>
                  <div style={{ marginBottom: "16px" }}>
                    <label className="pp-label">Notes</label>
                    <textarea
                      value={submitterNote}
                      onChange={(e) => setSubmitterNote(e.target.value)}
                      placeholder="Anything else that would help others?"
                      className="pp-input"
                      rows={3}
                      style={{ resize: "vertical" }}
                    />
                  </div>
                  <div style={{ marginBottom: "20px" }}>
                    <label className="pp-label">
                      Receipt or Invoice{" "}
                      <span style={{ fontWeight: "400", color: C.muted }}>
                        (optional · JPG, PNG, PDF · max 5MB)
                      </span>
                    </label>
                    <div
                      className={`upload-zone${submitFile ? " has-file" : isDragging ? " drag" : ""}`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const f = e.dataTransfer.files?.[0];
                        if (f) validateAndSetFile(f);
                      }}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          if (e.target.files?.[0])
                            validateAndSetFile(e.target.files[0]);
                        }}
                      />
                      {submitFile ? (
                        <>
                          <div
                            style={{ fontSize: "24px", marginBottom: "8px" }}
                          >
                            📎
                          </div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "14px",
                              fontWeight: "700",
                              color: C.navyDark,
                              overflowWrap: "break-word",
                              wordBreak: "break-all",
                            }}
                          >
                            {submitFile.name}
                          </p>
                          <p
                            style={{
                              margin: "4px 0 0",
                              fontSize: "13px",
                              color: C.muted,
                            }}
                          >
                            Tap to change.
                          </p>
                        </>
                      ) : (
                        <>
                          <div
                            style={{ fontSize: "24px", marginBottom: "8px" }}
                          >
                            📄
                          </div>
                          <p
                            style={{
                              margin: "0 0 4px",
                              fontSize: "14px",
                              fontWeight: "600",
                              color: C.slate,
                            }}
                          >
                            Drag and drop, or tap to upload.
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "13px",
                              color: C.muted,
                            }}
                          >
                            JPG, PNG, or PDF — max 5MB.
                          </p>
                        </>
                      )}
                    </div>
                    <div
                      style={{
                        background: C.cream,
                        borderRadius: "8px",
                        padding: "10px 14px",
                        marginTop: "10px",
                        border: `1px solid ${C.border}`,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: "13px",
                          color: C.navyDark,
                          lineHeight: "1.6",
                        }}
                      >
                        <strong>Before uploading:</strong> Remove or black out
                        any account numbers, card numbers, or billing details.
                        We only use the service name and price.
                      </p>
                    </div>
                  </div>
                  {formStatus === "error" && (
                    <div
                      style={{
                        background: "#FCEAEA",
                        color: C.error,
                        borderRadius: "8px",
                        padding: "10px 14px",
                        fontSize: "14px",
                        marginBottom: "16px",
                      }}
                    >
                      Please select a service and enter a price for each entry.
                    </div>
                  )}
                  <button onClick={handleSubmit} className="submit-price-btn">
                    Submit{" "}
                    {entries.length > 1 ? `${entries.length} Prices` : "Price"}
                  </button>
                  <p
                    style={{
                      fontSize: "13px",
                      color: C.muted,
                      textAlign: "center",
                      marginTop: "12px",
                      lineHeight: "1.6",
                    }}
                  >
                    All submissions are reviewed before going live.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER — maze texture + center-left golden glow ── */}
      <div className="vet-header">
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 0,
            backgroundImage: MAZE_BG,
            backgroundSize: "80px 80px",
            backgroundRepeat: "repeat",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 1,
            background:
              "radial-gradient(ellipse 72% 80% at 50% 50%, rgba(28,48,65,0.2) 0%, rgba(8,16,24,0.78) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 1,
            background:
              "linear-gradient(to right, rgba(6,12,20,0.68) 0%, transparent 28%, transparent 72%, rgba(6,12,20,0.68) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 1,
            background:
              "linear-gradient(to bottom, rgba(6,12,20,0.55) 0%, transparent 30%)",
          }}
        />
        {/* HIW/Contact style dark vignette — no gold */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 2,
            background:
              "radial-gradient(ellipse 75% 85% at 50% 50%, rgba(44,70,87,0.5) 0%, rgba(23,37,49,0) 45%, rgba(10,18,26,0.6) 80%, rgba(6,12,18,0.85) 100%)",
          }}
        />

        <div
          className="pp-container"
          style={{ position: "relative", zIndex: 3 }}
        >
          <div style={{ height: "31px" }} />
          <h1
            style={{
              margin: "0 0 10px",
              fontSize: "clamp(30px,5.5vw,56px)",
              fontWeight: "800",
              color: "#fff",
              fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
              letterSpacing: "-0.025em",
              lineHeight: "1.05",
              overflowWrap: "break-word",
              wordBreak: "break-word",
            }}
          >
            {vet.name}
          </h1>
          {locationLine && (
            <p
              style={{
                margin: "0 0 16px",
                fontSize: "17px",
                color: "rgba(255,255,255,0.6)",
                overflowWrap: "break-word",
              }}
            >
              {locationLine}
            </p>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
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
                    background: "rgba(239,200,139,0.16)",
                    color: C.gold,
                    padding: "4px 11px",
                    borderRadius: "20px",
                    border: "1px solid rgba(239,200,139,0.28)",
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
                  background: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.5)",
                  padding: "4px 11px",
                  borderRadius: "20px",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {vet.ownership?.startsWith("Other:")
                  ? vet.ownership.replace("Other: ", "")
                  : vet.ownership}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ background: C.cream }}>
        <div
          className="pp-container"
          style={{ padding: "24px 24px 80px", boxSizing: "border-box" }}
        >
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            <div style={{ marginBottom: "20px" }}>
              <Link
                href="/vets"
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: C.terracotta,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                ← Back to all vets
              </Link>
            </div>

            {/* ── INFO STRIP ──
               Desktop: 2-col grid
               - Vertical divider: absolute, top/bottom inset so it floats
               - Horizontal divider: separate row with TWO padded lines (one per column)
               Mobile: single-col stacked
               - .info-div-row collapses to 1-col, right column hidden
               - .info-mob-div shown under Address and Call
          ── */}
            <div
              style={{
                background: C.white,
                borderRadius: "16px",
                marginBottom: "24px",
                border: `1px solid ${C.border}`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: "14px",
                  padding: "14px 24px 0",
                }}
              >
                <button onClick={handleShare} className="share-btn">
                  🔗 {shareConfirmed ? "Copied!" : "Share"}
                </button>
                <button
                  onClick={toggleSave}
                  className={`save-btn${saveAnimating ? " save-animating" : ""}`}
                  title={isSaved ? "Remove from saved" : "Save this vet"}
                >
                  {isSaved ? "❤️" : "🤍"}
                </button>
              </div>

              {/* Row 1 */}
              <div className="info-2col">
                {/* Address */}
                <div style={{ padding: "20px 24px 0", position: "relative" }}>
                  <div className="v-div" />
                  <InfoLabel>Location</InfoLabel>
                  {vet.address && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(vet.address + " " + (vet.city || "") + " CA " + (vet.zip_code || ""))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: "14px",
                        color: C.terracotta,
                        textDecoration: "none",
                        fontWeight: "500",
                        display: "block",
                        lineHeight: "1.6",
                        overflowWrap: "break-word",
                        wordBreak: "break-word",
                      }}
                    >
                      {vet.address}
                      <br />
                      {vet.city}, CA {vet.zip_code} ↗
                    </a>
                  )}
                  {vet.website && (
                    <a
                      href={`https://${vet.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: "14px",
                        color: C.terracotta,
                        textDecoration: "none",
                        display: "block",
                        overflowWrap: "break-word",
                        wordBreak: "break-all",
                      }}
                    >
                      {vet.website} ↗
                    </a>
                  )}
                  {/* Mobile-only divider under Address */}
                  <div
                    className="info-mob-div"
                    style={{ margin: "20px 0 0" }}
                  />
                </div>
                {/* Hours */}
                <div style={{ padding: "20px 24px" }}>
                  <InfoLabel>Hours</InfoLabel>
                  <HoursDisplay lines={hoursLines} />
                </div>
              </div>

              {/* Divider row — TWO floating lines on desktop, ONE on mobile */}
              <div className="info-div-row">
                <div className="info-div-left">
                  <div style={{ height: "1px", background: C.border }} />
                </div>
                <div className="info-div-right">
                  <div style={{ height: "1px", background: C.border }} />
                </div>
              </div>

              {/* Row 2 */}
              <div className="info-2col">
                {/* Call + Website */}
                <div style={{ padding: "20px 24px 0", position: "relative" }}>
                  <div className="v-div" />
                  <InfoLabel>Call</InfoLabel>
                  {vet.phone && (
                    <a
                      href={`tel:${vet.phone}`}
                      style={{
                        fontSize: "14px",
                        fontWeight: "400",
                        color: C.navyDark,
                        textDecoration: "none",
                        display: "block",
                        marginBottom: "6px",
                        overflowWrap: "break-word",
                      }}
                    >
                      {formatPhone(vet.phone)}
                    </a>
                  )}
                  {/* Mobile-only divider under Call */}
                  <div
                    className="info-mob-div"
                    style={{ margin: "20px 0 0" }}
                  />
                </div>
                {/* Details — last section, no divider after */}
                <div style={{ padding: "20px 24px" }}>
                  <InfoLabel>Details</InfoLabel>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 10px",
                        borderRadius: "20px",
                        fontSize: "13px",
                        fontWeight: "600",
                        background: vet.carecredit ? "#EDFAF3" : "#FCEAEA",
                        color: vet.carecredit ? C.success : C.error,
                        width: "fit-content",
                      }}
                    >
                      {vet.carecredit ? "✅" : "❌"} CareCredit{" "}
                      {vet.carecredit ? "accepted" : "not accepted"}
                    </span>
                    {vet.accepting_new_patients !== null && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 10px",
                          borderRadius: "20px",
                          fontSize: "13px",
                          fontWeight: "600",
                          background: vet.accepting_new_patients
                            ? "#EDFAF3"
                            : "#FCEAEA",
                          color: vet.accepting_new_patients
                            ? C.success
                            : C.error,
                          width: "fit-content",
                        }}
                      >
                        {vet.accepting_new_patients ? "✅" : "❌"}{" "}
                        {vet.accepting_new_patients
                          ? "Accepting"
                          : "Not accepting"}{" "}
                        new patients
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── PRICE COMPARISON ── */}
            {visibleChartPrices.length > 0 && (
              <div
                ref={chartRef}
                style={{
                  background: C.white,
                  borderRadius: "16px",
                  padding: "24px 28px",
                  marginBottom: "24px",
                  border: `1px solid ${C.border}`,
                }}
              >
                <h3
                  style={{
                    margin: "0 0 4px",
                    fontSize: "18px",
                    fontWeight: "800",
                    color: C.navyDark,
                    fontFamily: "var(--font-urbanist,system-ui)",
                  }}
                >
                  Price Comparison
                </h3>
                <p
                  style={{
                    margin: "0 0 24px",
                    fontSize: "14px",
                    color: C.muted,
                  }}
                >
                  How this vet compares to the Bay Area average
                </p>
                {prices.map((price) => {
                  if (price.price_type === "starting") return null;
                  const serviceName = price.services?.name;
                  const vetPrice = price.price_low || price.price_paid;
                  const allForSvc = allPrices.filter(
                    (p) =>
                      p.services?.name === serviceName &&
                      p.price_low &&
                      p.services?.id !== 8 &&
                      p.price_type !== "starting",
                  );
                  const avg =
                    allForSvc.length > 0
                      ? Math.round(
                          allForSvc.reduce((s, p) => s + p.price_low, 0) /
                            allForSvc.length,
                        )
                      : null;
                  if (!vetPrice || !avg) return null;
                  const isCheaper = vetPrice <= avg;
                  const max = Math.max(vetPrice, avg) * 1.2;
                  const isLast =
                    visibleChartPrices[visibleChartPrices.length - 1]?.id ===
                    price.id;
                  return (
                    <div key={price.id}>
                      <div style={{ marginBottom: "20px" }}>
                        <div className="chart-row-header">
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: "700",
                              color: C.navyDark,
                              overflowWrap: "break-word",
                            }}
                          >
                            {serviceName}
                          </span>
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: "700",
                              padding: "3px 10px",
                              borderRadius: "20px",
                              background: isCheaper ? "#EDFAF3" : "#FCEAEA",
                              color: isCheaper ? C.success : C.error,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {isCheaper ? "✓ Below average" : "↑ Above average"}
                          </span>
                        </div>
                        {[
                          {
                            label: "This vet",
                            width: Math.round((vetPrice / max) * 100),
                            value: vetPrice,
                            barColor: isCheaper ? C.success : C.error,
                          },
                          {
                            label: "Bay Area avg",
                            width: Math.round((avg / max) * 100),
                            value: avg,
                            barColor: C.muted,
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
                                  fontSize: "13px",
                                  color: C.muted,
                                  width: "84px",
                                  flexShrink: 0,
                                  fontWeight: "600",
                                }}
                              >
                                {bar.label}
                              </span>
                              <div
                                style={{
                                  flex: 1,
                                  background: "#f0ede8",
                                  borderRadius: "5px",
                                  height: "30px",
                                  overflow: "hidden",
                                  position: "relative",
                                }}
                              >
                                <div
                                  style={{
                                    width: chartVisible
                                      ? `${bar.width}%`
                                      : "0%",
                                    height: "100%",
                                    background: bar.barColor,
                                    borderRadius: "5px",
                                    transition:
                                      "width 0.9s cubic-bezier(0.4,0,0.2,1)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "flex-end",
                                    paddingRight: "10px",
                                    boxSizing: "border-box",
                                  }}
                                >
                                  {bar.width > 15 && (
                                    <span
                                      style={{
                                        fontSize: "13px",
                                        color: "#fff",
                                        fontWeight: "700",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      ${bar.value.toLocaleString()}
                                    </span>
                                  )}
                                </div>
                                {bar.width <= 15 && (
                                  <span
                                    style={{
                                      position: "absolute",
                                      left: `calc(${bar.width}% + 6px)`,
                                      top: "50%",
                                      transform: "translateY(-50%)",
                                      fontSize: "13px",
                                      color: bar.barColor,
                                      fontWeight: "700",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    — ${bar.value.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {!isLast && (
                        <div
                          style={{
                            height: "1px",
                            background: C.border,
                            marginBottom: "20px",
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── PRICING ── */}
            <div
              style={{
                background: C.white,
                borderRadius: "16px",
                padding: "24px 28px",
                marginBottom: "8px",
                border: `1px solid ${C.border}`,
              }}
            >
              {vet.accepting_new_patients === false &&
              !prices.some((p) => p.is_verified && p.price_low) ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <div style={{ fontSize: "32px", marginBottom: "12px" }}>
                    🚫
                  </div>
                  <h3
                    style={{
                      margin: "0 0 8px",
                      fontSize: "18px",
                      fontWeight: "800",
                      color: C.navyDark,
                      fontFamily: "var(--font-urbanist,system-ui)",
                    }}
                  >
                    Not currently accepting new patients
                  </h3>
                  <p
                    style={{
                      margin: "0 0 20px",
                      fontSize: "15px",
                      color: C.slate,
                      lineHeight: "1.7",
                      maxWidth: "320px",
                      marginLeft: "auto",
                      marginRight: "auto",
                    }}
                  >
                    Call ahead to check availability.
                  </p>
                  {vet.phone && (
                    <a
                      href={`tel:${vet.phone}`}
                      style={{
                        display: "inline-block",
                        padding: "12px 28px",
                        background: C.terracotta,
                        color: "#fff",
                        borderRadius: "12px",
                        fontSize: "15px",
                        textDecoration: "none",
                        fontWeight: "700",
                      }}
                    >
                      Call to check availability
                    </a>
                  )}
                </div>
              ) : (
                <>
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
                        color: C.navyDark,
                        fontFamily: "var(--font-urbanist,system-ui)",
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
                        color: C.terracotta,
                        textDecoration: "underline",
                        cursor: "pointer",
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
                        fontSize: "13px",
                        color: C.muted,
                      }}
                    >
                      Last verified {formatVerifiedDate(lastVerified)}
                    </p>
                  )}
                  {pricedRows.length === 0 ? (
                    <p
                      style={{
                        color: C.muted,
                        fontStyle: "italic",
                        fontSize: "15px",
                        padding: "16px 0",
                      }}
                    >
                      No pricing available yet.
                    </p>
                  ) : (
                    pricedRows.map((p, i, arr) => {
                      const accordionCopy = ACCORDION_COPY[p.services?.id];
                      const isExpanded = !!expandedRows[p.id];
                      const noteLines = parseNotes(p.notes);
                      const isLast = i === arr.length - 1;
                      return (
                        <div key={p.id}>
                          <div className="price-row">
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span
                                  style={{
                                    fontSize: "15px",
                                    fontWeight: "600",
                                    color: C.navyDark,
                                    overflowWrap: "break-word",
                                  }}
                                >
                                  {p.services?.name}
                                </span>
                                {noteLines.map((note, j) => (
                                  <p
                                    key={j}
                                    style={{
                                      margin: "2px 0 0",
                                      fontSize: "13px",
                                      color: C.muted,
                                      overflowWrap: "break-word",
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
                                  flexShrink: 0,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "15px",
                                    fontWeight: "800",
                                    color: C.navyDark,
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
                                    className={`expand-btn${isExpanded ? " is-open" : ""}`}
                                    onClick={() => toggleRow(p.id)}
                                    aria-label={
                                      isExpanded ? "Collapse" : "Expand"
                                    }
                                  >
                                    <svg
                                      className={`expand-icon${isExpanded ? " open" : ""}`}
                                      width="12"
                                      height="12"
                                      viewBox="0 0 12 12"
                                      fill="none"
                                      aria-hidden="true"
                                    >
                                      <line
                                        x1="6"
                                        y1="0"
                                        x2="6"
                                        y2="12"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                      />
                                      <line
                                        x1="0"
                                        y1="6"
                                        x2="12"
                                        y2="6"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          {accordionCopy && (
                            <div
                              className={`acc-wrap${isExpanded ? " open" : ""}`}
                            >
                              <div className="acc-inner">
                                <div
                                  style={{
                                    background: "#f9f9f7",
                                    borderRadius: "10px",
                                    padding: "20px",
                                    marginBottom: "8px",
                                  }}
                                >
                                  <p
                                    style={{
                                      margin: "0 0 6px",
                                      fontSize: "12px",
                                      fontWeight: "700",
                                      color: C.muted,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                    }}
                                  >
                                    {accordionCopy.heading}
                                  </p>
                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize: "14px",
                                      color: C.slate,
                                      lineHeight: "1.6",
                                    }}
                                  >
                                    {accordionCopy.body}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          {!isLast && (
                            <div
                              style={{
                                height: "1px",
                                background: C.border,
                                margin: "0",
                              }}
                            />
                          )}
                        </div>
                      );
                    })
                  )}
                </>
              )}
            </div>

            {!(
              vet.accepting_new_patients === false &&
              !prices.some((p) => p.is_verified && p.price_low)
            ) && (
              <p
                style={{
                  fontSize: "13px",
                  color: C.muted,
                  textAlign: "center",
                  margin: "0 0 24px",
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
                    fontSize: "13px",
                    color: C.muted,
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  Learn more.
                </button>
              </p>
            )}

            {/* ── SUBMIT CTA ── */}
            <div
              style={{
                background: C.white,
                borderRadius: "16px",
                padding: "24px 28px",
                border: `1px solid ${C.border}`,
              }}
            >
              <div
                className="submit-cta-wrap"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "16px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: "15px",
                      fontWeight: "700",
                      color: C.navyDark,
                      fontFamily: "var(--font-urbanist,system-ui)",
                      overflowWrap: "break-word",
                    }}
                  >
                    Visited {vet.name}?
                  </p>
                  <p style={{ margin: 0, fontSize: "14px", color: C.slate }}>
                    Help other pet owners by sharing what you paid.
                  </p>
                </div>
                <button onClick={openSheet} className="submit-cta-btn">
                  Submit a Price
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
