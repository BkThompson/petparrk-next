"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";
import {
  X,
  Check,
  Frown,
  Share2,
  Heart,
  ArrowLeft,
  ArrowUp,
  Ban,
  RefreshCw,
  Lock,
} from "lucide-react";
import PageLoader from "../../../components/PageLoader";
import { C } from "../../../lib/petTileHelpers";
import InlineSubmitPriceForm from "../../../components/InlineSubmitPriceForm";
import ReportPriceModal from "../../../components/ReportPriceModal";

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

// Auto-grow textarea — fits its content height as the user types AND when
// the value is set programmatically. The useEffect on [value] fixes the
// "content cut off after save / on reopen" issue, especially on mobile where
// the CSS resize handle does nothing. Forwards all other textarea props.
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
  function fmt(n) {
    const num = Number(n);
    return num % 1 === 0
      ? `$${num.toLocaleString()}`
      : `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (type === "starting") return `${fmt(low)}+`;
  if (type === "range" && low !== high) return `${fmt(low)}–${fmt(high)}`;
  return fmt(low);
}
function formatVerifiedDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

// ── Region helper — determines which regional average to compare against ──────
const SOCAL_CITIES = new Set([
  "Los Angeles",
  "Long Beach",
  "Glendale",
  "Pasadena",
  "Torrance",
  "Burbank",
  "Inglewood",
  "Compton",
  "Carson",
  "El Monte",
  "Downey",
  "West Covina",
  "Pomona",
  "Norwalk",
  "Palmdale",
  "Lancaster",
  "Santa Clarita",
  "Thousand Oaks",
  "Simi Valley",
  "Santa Monica",
  "Culver City",
  "Beverly Hills",
  "West Hollywood",
  "Van Nuys",
  "Chatsworth",
  "Encino",
  "Reseda",
  "North Hollywood",
  "Woodland Hills",
  "Tarzana",
  "Calabasas",
  "Malibu",
  "Manhattan Beach",
  "Redondo Beach",
  "Hermosa Beach",
  "El Segundo",
  "Hawthorne",
  "Gardena",
  "Lomita",
  "Whittier",
  "La Mirada",
  "Cerritos",
  "Lakewood",
  "Signal Hill",
  "Bellflower",
  "Paramount",
  "Lynwood",
  "South Gate",
  "Huntington Park",
  "Maywood",
  "Bell",
  "Commerce",
  "Montebello",
  "Pico Rivera",
  "La Puente",
  "Azusa",
  "Covina",
  "Glendora",
  "San Dimas",
  "La Verne",
  "Claremont",
  "Upland",
  "Monrovia",
  "Arcadia",
  "Temple City",
  "San Gabriel",
  "Rosemead",
  "Alhambra",
  "Monterey Park",
  "Altadena",
  "Anaheim",
  "Santa Ana",
  "Irvine",
  "Garden Grove",
  "Huntington Beach",
  "Fullerton",
  "Orange",
  "Costa Mesa",
  "Mission Viejo",
  "Westminster",
  "Newport Beach",
  "Buena Park",
  "Lake Forest",
  "Tustin",
  "Yorba Linda",
  "San Clemente",
  "Laguna Niguel",
  "Laguna Beach",
  "Dana Point",
  "San Juan Capistrano",
  "Aliso Viejo",
  "Rancho Santa Margarita",
  "Brea",
  "Placentia",
  "La Habra",
  "Cypress",
  "Los Alamitos",
  "Seal Beach",
  "Fountain Valley",
  "Stanton",
  "San Diego",
  "Chula Vista",
  "Oceanside",
  "Escondido",
  "Carlsbad",
  "El Cajon",
  "Vista",
  "San Marcos",
  "Encinitas",
  "National City",
  "La Mesa",
  "Santee",
  "Spring Valley",
  "Poway",
  "Lemon Grove",
  "Coronado",
  "Del Mar",
  "Solana Beach",
  "La Jolla",
  "San Bernardino",
  "Riverside",
  "Fontana",
  "Moreno Valley",
  "Ontario",
  "Rancho Cucamonga",
  "Corona",
  "Victorville",
  "Rialto",
  "Murrieta",
  "Temecula",
  "Hesperia",
  "Chino",
  "Chino Hills",
  "Redlands",
  "Highland",
  "Colton",
  "Loma Linda",
  "Yucaipa",
  "Perris",
  "Hemet",
  "Lake Elsinore",
  "Menifee",
  "Wildomar",
  "Norco",
  "Eastvale",
  "Jurupa Valley",
  "Oxnard",
  "Ventura",
  "Camarillo",
  "Santa Barbara",
  "Goleta",
  "Lompoc",
  "Santa Maria",
  "Palm Springs",
  "Palm Desert",
  "Cathedral City",
  "Indio",
  "Coachella",
  "Apple Valley",
  "Barstow",
]);

const CENTRAL_CA_CITIES = new Set([
  "Fresno",
  "Clovis",
  "Bakersfield",
  "Stockton",
  "Modesto",
  "Turlock",
  "Merced",
  "Visalia",
  "Tulare",
  "Hanford",
  "Porterville",
  "Madera",
  "Dinuba",
  "Selma",
  "Lodi",
  "Tracy",
  "Manteca",
  "Ripon",
  "Atwater",
  "Los Banos",
  "Chico",
  "Redding",
  "Red Bluff",
  "Yuba City",
  "Marysville",
]);

function getRegion(city) {
  if (!city) return "California";
  if (SOCAL_CITIES.has(city)) return "SoCal";
  if (CENTRAL_CA_CITIES.has(city)) return "Central CA";
  return "NorCal";
}

function getRegionFull(city) {
  if (!city) return "California";
  if (SOCAL_CITIES.has(city)) return "Southern California";
  if (CENTRAL_CA_CITIES.has(city)) return "Central California";
  return "Northern California";
}
function parseHours(s) {
  if (!s) return [];
  // First try splitting by newline — handles multi-day formats
  const byNewline = s
    .split(/[\r\n]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (byNewline.length > 1) return byNewline;
  // Single line — try comma-based day splitting
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

// Fix #8 — renders a single hours line, handles split hours without comma
function HoursLine({ line }) {
  const splitMatch = line.match(/^([A-Za-z][^:]*:\s*)(.+?),\s*(\d.+)$/);
  if (splitMatch) {
    const day = splitMatch[1].replace(/:\s*$/, "").trim();
    const firstTime = splitMatch[2];
    const secondTime = splitMatch[3];
    return (
      <div
        style={{
          display: "flex",
          fontSize: "15px",
          fontWeight: "500",
          lineHeight: "1.7",
        }}
      >
        <span
          style={{
            width: "83px",
            flexShrink: 0,
            fontWeight: "600",
            color: C.navyDark,
            minWidth: "88px",
          }}
        >
          {day}:
        </span>
        <span
          style={{ display: "flex", flexDirection: "column", color: C.slate }}
        >
          <span style={{ whiteSpace: "nowrap" }}>{firstTime}</span>
          <span style={{ whiteSpace: "nowrap" }}>{secondTime}</span>
        </span>
      </div>
    );
  }
  const colonIdx = line.indexOf(":");
  if (colonIdx > -1) {
    const day = line.slice(0, colonIdx).trim();
    const time = line.slice(colonIdx + 1).trim();
    return (
      <div
        style={{
          display: "flex",
          fontSize: "15px",
          fontWeight: "500",
          lineHeight: "1.7",
        }}
      >
        <span
          style={{
            width: "83px",
            flexShrink: 0,
            fontWeight: "600",
            color: C.navyDark,
            minWidth: "88px",
          }}
        >
          {day}:
        </span>
        <span
          style={{ color: C.slate, whiteSpace: "nowrap", fontWeight: "500" }}
        >
          {time}
        </span>
      </div>
    );
  }
  return (
    <span
      style={{
        fontSize: "14px",
        fontWeight: 500,
        color: C.slate,
        lineHeight: "1.7",
        display: "block",
      }}
    >
      {line}
    </span>
  );
}

function HoursDisplay({ lines }) {
  if (lines.length === 0)
    return (
      <p
        style={{ fontSize: "14px", fontWeight: 500, color: C.muted, margin: 0 }}
      >
        Call for hours
      </p>
    );
  if (lines.length >= 4) {
    const mid = Math.ceil(lines.length / 2);
    return (
      <>
        {/* Desktop — two side-by-side columns */}
        <div className="hours-2col" style={{ display: "flex", gap: "0" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              flex: 1,
              paddingRight: "12px",
            }}
          >
            {lines.slice(0, mid).map((l, i) => (
              <HoursLine key={i} line={l} />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              flex: 1,
              paddingLeft: "12px",
              borderLeft: `1px solid ${C.border}`,
            }}
          >
            {lines.slice(mid).map((l, i) => (
              <HoursLine key={i} line={l} />
            ))}
          </div>
        </div>
        {/* Mobile — single column */}
        <div
          className="hours-1col"
          style={{ display: "none", flexDirection: "column", gap: "2px" }}
        >
          {lines.map((l, i) => (
            <HoursLine key={i} line={l} />
          ))}
        </div>
      </>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2px",
      }}
    >
      {lines.map((l, i) => (
        <HoursLine key={i} line={l} />
      ))}
    </div>
  );
}

function InfoLabel({ children }) {
  return (
    <p
      style={{
        fontSize: "13px",
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: "0.10em",
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
  const [reviewServices, setReviewServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allPrices, setAllPrices] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [shareConfirmed, setShareConfirmed] = useState(false);
  const [chartVisible, setChartVisible] = useState(false);
  const [showInlineSubmit, setShowInlineSubmit] = useState(false);
  // True once a price has been submitted through the form. Collapses the
  // "Visited X? / Close form" header so the form's own success card stands
  // alone instead of sitting under a stale toggle.
  const [priceSubmitted, setPriceSubmitted] = useState(false);
  const [reportingPrice, setReportingPrice] = useState(null); // {id, serviceName, serviceId, display}
  const [vetName, setVetName] = useState("");
  const [vetId, setVetId] = useState(null);
  const chartRef = useRef(null);
  const inlineSubmitRef = useRef(null);
  const submitCtaRef = useRef(null);
  const sbWidthRef = useRef(0);

  // Close the inline submit-price form and restore scroll to the trigger,
  // so the user isn't left stranded at the bottom of the page.
  function closeSubmitForm() {
    setShowInlineSubmit(false);
    setPriceSubmitted(false);
    setTimeout(() => {
      if (!submitCtaRef.current) return;
      const top =
        submitCtaRef.current.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top, behavior: "smooth" });
    }, 50);
  }

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
        .select("*, services(id,name), vets(city)");
      setVet(vetData);
      // Prices flagged in_conflict have competing values under review — never
      // show a contested number publicly. Filter them out of the displayed
      // prices, and collect the affected service names to show a neutral
      // "pricing under review" note instead.
      const allVetPrices = priceData || [];
      const conflicted = allVetPrices.filter((p) => p.in_conflict);
      const cleanPrices = allVetPrices.filter((p) => !p.in_conflict);
      const reviewServiceNames = Array.from(
        new Set(conflicted.map((p) => p.services?.name).filter(Boolean)),
      );
      setPrices(cleanPrices);
      setReviewServices(reviewServiceNames);
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
    const vetRegion = getRegion(vet?.city);
    const all = allPrices.filter(
      (p) =>
        p.services?.name === price.services?.name &&
        p.price_low &&
        p.services?.id !== 8 &&
        p.price_type !== "starting" &&
        getRegion(p.vets?.city) === vetRegion,
    );
    return vp && all.length > 0;
  });
  const pricedRows = prices.filter((p) => p.price_low !== null);

  if (loading) return <PageLoader message="Loading vet profile…" />;
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
          <div
            style={{
              marginBottom: "12px",
              color: C.muted,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Frown size={32} strokeWidth={2} />
          </div>
          <p style={{ color: C.muted, fontSize: "15px", fontWeight: 500 }}>
            Vet not found.
          </p>
          <Link
            href="/vets"
            className="nav-link-dark"
            style={{ color: C.terracotta, fontSize: "14px", fontWeight: "700" }}
          >
            <ArrowLeft
              size={14}
              strokeWidth={2.4}
              style={{ marginRight: "4px", verticalAlign: "middle" }}
            />
            Back to all vets
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
        .price-gate-wrap{position:relative}
        .price-gate-wrap.gated{padding:10px 0 20px}
        .price-gate-wrap.gated .price-gate-inner{filter:blur(6px);pointer-events:none;user-select:none}
        .price-gate-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:2;padding:0 16px}
        .price-gate-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;background:#172531;color:#fff;border:2px solid #172531;border-radius:12px;padding:11px 22px;font-size:15px;font-weight:700;font-family:var(--font-urbanist,'Urbanist',sans-serif);cursor:pointer;text-decoration:none;box-shadow:0 4px 16px rgba(23,37,49,0.22);transition:background 0.15s,color 0.15s}
        .price-gate-btn:hover{background:#fff;color:#172531;border:2px solid #172531}
        @media(max-width:768px){.price-gate-btn{width:100%}}
        .save-btn{background:none;border:none;cursor:pointer;padding:0;line-height:1;transition:transform 0.1s;display:inline-flex;align-items:center;}
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
        .report-price-btn{background:none;border:none;color:${C.muted};font-size:13px;font-weight:600;cursor:pointer;padding:14px 10px;text-decoration:underline;font-family:inherit;transition:color 0.15s;}
        .report-price-btn:hover{color:${C.terracotta};}
        .price-row{padding:16px 0px;}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px;}
        .modal-box{background:#fff;border-radius:16px;padding:28px;max-width:440px;width:100%;position:relative;}
        .modal-close{position:absolute;top:14px;right:14px;width:36px;height:36px;border:none;background:transparent;color:${C.muted};cursor:pointer;border-radius:8px;display:flex;align-items:center;justify-content:center;transition:background 0.15s,color 0.15s;z-index:10;}
        .modal-close:hover{background:${C.cream};color:${C.navyDark};}
        .share-btn{background:none;border:none;cursor:pointer;color:${C.muted};font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:5px;padding:0;transition:color 0.15s;}
        .share-btn:hover{color:${C.slate};}
        .submit-cta-btn{padding:0 20px;height:42px;background:${C.terracotta};color:#fff;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:background 0.2s,color 0.2s;border:2px solid ${C.terracotta};font-family:var(--font-urbanist,'Urbanist',sans-serif);display:inline-flex;align-items:center;justify-content:center;}
        .submit-cta-btn:hover{background:#fff;color:${C.terracotta};}
        .toaster-create-btn{display:block;padding:14px;background:${C.terracotta};color:#fff;border:2px solid ${C.terracotta};border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;text-align:center;transition:background 0.18s,color 0.18s;}
        .toaster-create-btn:hover{background:#fff;color:${C.terracotta};}
        .toaster-signin-btn{display:block;padding:14px;background:transparent;color:${C.navyDark};border:2px solid ${C.navyDark};border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;text-align:center;transition:background 0.18s,color 0.18s;}
        .toaster-signin-btn:hover{background:${C.navyDark};color:#fff;}
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
        @media(max-width:375px){}
      
   
      `}</style>

      {/* Pricing modal */}
      {showPricingModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowPricingModal(false)}
        >
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowPricingModal(false)}
              aria-label="Close"
              type="button"
            >
              <X size={22} strokeWidth={2.2} />
            </button>
            <h3
              style={{
                margin: "0 0 16px",
                fontSize: "17px",
                fontWeight: "800",
                color: C.navyDark,
                fontFamily: "var(--font-urbanist,system-ui)",
                paddingRight: "40px",
              }}
            >
              About our pricing data
            </h3>
            <p
              style={{
                margin: "0 0 12px",
                fontSize: "15px",
                fontWeight: 500,
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
                fontWeight: 500,
                color: C.slate,
                lineHeight: "1.7",
                textWrap: "pretty",
              }}
            >
              Always confirm pricing directly with your vet before booking.
            </p>
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
                fontWeight: 500,
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
            {(typeof vet.vet_type === "string"
              ? vet.vet_type
                  .replace(/[\[\]"']/g, "")
                  .split(",")
                  .map((t) => t.trim())
              : Array.isArray(vet.vet_type)
                ? vet.vet_type.map((t) =>
                    String(t)
                      .replace(/[\[\]"']/g, "")
                      .trim(),
                  )
                : []
            )
              .filter(Boolean)
              .map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: "13px",
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
                  fontSize: "13px",
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
          style={{
            paddingTop: "24px",
            paddingBottom: "80px",
            boxSizing: "border-box",
          }}
        >
          <div className="pp-container-text">
            <div style={{ marginBottom: "20px" }}>
              <Link
                href="/vets"
                className="nav-link-dark"
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <ArrowLeft
                  size={14}
                  strokeWidth={2.4}
                  style={{ marginRight: "4px", verticalAlign: "middle" }}
                />
                Back to all vets
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
                  <Share2
                    size={16}
                    strokeWidth={2.2}
                    style={{ marginRight: "4px", verticalAlign: "middle" }}
                  />
                  {shareConfirmed ? "Copied!" : "Share"}
                </button>
                <button
                  onClick={toggleSave}
                  className={`save-btn${saveAnimating ? " save-animating" : ""}`}
                  title={isSaved ? "Remove from saved" : "Save this vet"}
                >
                  <Heart
                    size={22}
                    strokeWidth={2}
                    fill={isSaved ? "#CF5C36" : "none"}
                    color={isSaved ? "#CF5C36" : C.muted}
                  />
                </button>
              </div>

              {/* Row 1 */}
              <div className="info-2col">
                {/* Address */}
                <div style={{ padding: "20px 20px 0", position: "relative" }}>
                  <div className="v-div" />
                  <InfoLabel>Location</InfoLabel>
                  {vet.address && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(vet.address + " " + (vet.city || "") + " CA " + (vet.zip_code || ""))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: "15px",
                        color: C.terracotta,
                        textDecoration: "none",
                        fontWeight: "600",
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
                        fontSize: "15px",
                        fontWeight: "600",
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
                <div style={{ padding: "20px 20px" }}>
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
                <div style={{ padding: "20px 20px 0", position: "relative" }}>
                  <div className="v-div" />
                  <InfoLabel>Call</InfoLabel>
                  {vet.phone && (
                    <a
                      href={`tel:${vet.phone}`}
                      style={{
                        fontSize: "15px",
                        fontWeight: "600",
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
                <div style={{ padding: "20px 20px" }}>
                  <InfoLabel>Details</InfoLabel>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 10px",
                        borderRadius: "20px",
                        fontSize: "14px",
                        fontWeight: "700",
                        background: vet.carecredit ? "#EDFAF3" : "#FCEAEA",
                        color: vet.carecredit ? C.success : C.error,
                        width: "fit-content",
                      }}
                    >
                      {vet.carecredit ? (
                        <Check size={12} strokeWidth={2.6} />
                      ) : (
                        <X size={12} strokeWidth={2.6} />
                      )}{" "}
                      CareCredit {vet.carecredit ? "accepted" : "not accepted"}
                    </span>
                    {vet.accepting_new_patients !== null && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 10px",
                          borderRadius: "20px",
                          fontSize: "14px",
                          fontWeight: "700",
                          background: vet.accepting_new_patients
                            ? "#EDFAF3"
                            : "#FCEAEA",
                          color: vet.accepting_new_patients
                            ? C.success
                            : C.error,
                          width: "fit-content",
                        }}
                      >
                        {vet.accepting_new_patients ? (
                          <Check size={12} strokeWidth={2.6} />
                        ) : (
                          <X size={12} strokeWidth={2.6} />
                        )}{" "}
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
                  padding: "24px 20px",
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
                    margin: "0 0 20px",
                    fontSize: "15px",
                    fontWeight: "500",
                    color: C.muted,
                    lineHeight: "1.6",
                    textWrap: "pretty",
                    maxWidth: "98%",
                  }}
                >
                  How this vet compares to the {getRegionFull(vet?.city)}{" "}
                  average
                </p>
                <div className={`price-gate-wrap${!session ? " gated" : ""}`}>
                  {!session && (
                    <div className="price-gate-overlay">
                      <Link href="/auth" className="price-gate-btn">
                        <Lock size={14} strokeWidth={2.5} />
                        Sign up to see pricing
                      </Link>
                    </div>
                  )}
                  <div className="price-gate-inner">
                    {prices.map((price) => {
                      if (price.price_type === "starting") return null;
                      const serviceName = price.services?.name;
                      const vetPrice = price.price_low || price.price_paid;
                      const vetRegion = getRegion(vet?.city);
                      const allForSvc = allPrices.filter(
                        (p) =>
                          p.services?.name === serviceName &&
                          p.price_low &&
                          p.services?.id !== 8 &&
                          p.price_type !== "starting" &&
                          getRegion(p.vets?.city) === vetRegion,
                      );
                      const avg =
                        allForSvc.length > 0
                          ? Math.round(
                              allForSvc.reduce((s, p) => s + p.price_low, 0) /
                                allForSvc.length,
                            )
                          : null;
                      if (!vetPrice || !avg) return null;
                      const isEqual = vetPrice === avg;
                      const isCheaper = vetPrice < avg;
                      const max = Math.max(vetPrice, avg) * 1.2;
                      const isLast =
                        visibleChartPrices[visibleChartPrices.length - 1]
                          ?.id === price.id;
                      const badgeBg = isEqual
                        ? "#F5F0E8"
                        : isCheaper
                          ? "#EDFAF3"
                          : "#FCEAEA";
                      const badgeColor = isEqual
                        ? C.slate
                        : isCheaper
                          ? C.success
                          : C.error;
                      const badgeLabel = isEqual ? (
                        "≈ At average"
                      ) : isCheaper ? (
                        <>
                          <Check size={12} strokeWidth={2.6} /> Below average
                        </>
                      ) : (
                        <>
                          <ArrowUp size={12} strokeWidth={2.6} /> Above average
                        </>
                      );
                      const barColor = isEqual
                        ? C.muted
                        : isCheaper
                          ? C.success
                          : C.error;
                      return (
                        <div key={price.id}>
                          <div style={{ marginBottom: "20px" }}>
                            <div className="chart-row-header">
                              <span
                                style={{
                                  fontSize: "15px",
                                  fontWeight: "700",
                                  color: C.navyDark,
                                  overflowWrap: "break-word",
                                }}
                              >
                                {serviceName}
                              </span>
                              <span
                                style={{
                                  fontSize: "13px",
                                  fontWeight: "700",
                                  padding: "3px 10px",
                                  borderRadius: "20px",
                                  background: badgeBg,
                                  color: badgeColor,
                                  whiteSpace: "nowrap",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                {badgeLabel}
                              </span>
                            </div>
                            {[
                              {
                                label: "This vet",
                                width: Math.round((vetPrice / max) * 100),
                                value: vetPrice,
                                barColor,
                              },
                              {
                                label: `${vetRegion} avg`,
                                width: Math.round((avg / max) * 100),
                                value: avg,
                                barColor: C.muted,
                              },
                            ].map((bar) => (
                              <div
                                key={bar.label}
                                style={{ marginBottom: "8px" }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "14px",
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
                                      overflow: "visible",
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
                                        paddingRight:
                                          bar.width >= 15 ? "10px" : "0",
                                        boxSizing: "border-box",
                                        position: "relative",
                                      }}
                                    >
                                      {bar.width >= 15 ? (
                                        <span
                                          style={{
                                            fontSize: "13px",
                                            color: "#fff",
                                            fontWeight: "700",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          $
                                          {Number(bar.value) % 1 === 0
                                            ? bar.value.toLocaleString()
                                            : bar.value.toLocaleString(
                                                "en-US",
                                                {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                },
                                              )}
                                        </span>
                                      ) : (
                                        <span
                                          style={{
                                            fontSize: "13px",
                                            color: C.navyDark,
                                            fontWeight: "700",
                                            whiteSpace: "nowrap",
                                            position: "absolute",
                                            left: "calc(100% + 6px)",
                                          }}
                                        >
                                          $
                                          {Number(bar.value) % 1 === 0
                                            ? bar.value.toLocaleString()
                                            : bar.value.toLocaleString(
                                                "en-US",
                                                {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                },
                                              )}
                                        </span>
                                      )}
                                    </div>
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
                </div>
              </div>
            )}

            {/* ── PRICING ── */}
            <div
              style={{
                background: C.white,
                borderRadius: "16px",
                padding: "24px 20px",
                marginBottom: "8px",
                border: `1px solid ${C.border}`,
              }}
            >
              {vet.accepting_new_patients === false &&
              !prices.some((p) => p.is_verified && p.price_low) ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <div
                    style={{
                      marginBottom: "12px",
                      color: C.error,
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <Ban size={32} strokeWidth={2} />
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
                      fontWeight: 500,
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
                        padding: "12px 20px",
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
                        fontSize: "14px",
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
                        fontSize: "14px",
                        fontWeight: "500",
                        color: C.muted,
                      }}
                    >
                      Last verified {formatVerifiedDate(lastVerified)}
                    </p>
                  )}
                  {reviewServices.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "flex-start",
                        padding: "12px 14px",
                        marginBottom: "20px",
                        background: "#F5F0E8",
                        border: `1px solid ${C.border}`,
                        borderRadius: "12px",
                      }}
                    >
                      <RefreshCw
                        size={16}
                        strokeWidth={2.2}
                        color={C.slate}
                        style={{ flexShrink: 0, marginTop: "2px" }}
                      />
                      <p
                        style={{
                          margin: 0,
                          fontSize: "14px",
                          fontWeight: 500,
                          color: C.slate,
                          lineHeight: 1.5,
                        }}
                      >
                        Pricing for{" "}
                        <strong style={{ fontWeight: 700, color: C.navyDark }}>
                          {reviewServices.length === 1
                            ? reviewServices[0]
                            : reviewServices.length === 2
                              ? `${reviewServices[0]} and ${reviewServices[1]}`
                              : `${reviewServices.slice(0, -1).join(", ")}, and ${reviewServices[reviewServices.length - 1]}`}
                        </strong>{" "}
                        {reviewServices.length === 1 ? "is" : "are"} being
                        updated and will be back shortly.
                      </p>
                    </div>
                  )}
                  <div className={`price-gate-wrap${!session ? " gated" : ""}`}>
                    {!session && (
                      <div className="price-gate-overlay">
                        <Link href="/auth" className="price-gate-btn">
                          <Lock size={14} strokeWidth={2.5} />
                          Sign up to see pricing
                        </Link>
                      </div>
                    )}
                    <div className="price-gate-inner">
                      {pricedRows.length === 0 ? (
                        <p
                          style={{
                            color: C.muted,
                            fontStyle: "italic",
                            fontSize: "15px",
                            fontWeight: 500,
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
                                        fontSize: "16px",
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
                                          fontSize: "14px",
                                          fontWeight: 500,
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
                                        fontSize: "16px",
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
                                          fontSize: "11px",
                                          fontWeight: "700",
                                          color: C.muted,
                                          textTransform: "uppercase",
                                          letterSpacing: "0.10em",
                                        }}
                                      >
                                        {accordionCopy.heading}
                                      </p>
                                      <p
                                        style={{
                                          margin: 0,
                                          fontSize: "14px",
                                          fontWeight: 500,
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
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "flex-end",
                                  marginTop: "4px",
                                }}
                              >
                                <button
                                  type="button"
                                  className="report-price-btn"
                                  onClick={() =>
                                    setReportingPrice({
                                      id: p.id,
                                      serviceName: p.services?.name || "",
                                      serviceId: p.service_id,
                                      display: formatPrice(
                                        p.price_low,
                                        p.price_high,
                                        p.price_type,
                                      ),
                                    })
                                  }
                                >
                                  Report incorrect price
                                </button>
                              </div>
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
                    </div>
                  </div>
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
                  fontWeight: "500",
                  color: C.muted,
                  textAlign: "center",
                  margin: "24px 0 20px",
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
                    fontWeight: "600",
                    color: C.muted,
                    textDecoration: "underline",
                    cursor: "pointer",
                    fontFamily: "var(--font-urbanist,system-ui)",
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
                padding: "24px 20px",
                border: `1px solid ${C.border}`,
                display: priceSubmitted ? "none" : "block",
              }}
            >
              <div
                className="submit-cta-wrap"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "16px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: "16px",
                      fontWeight: "700",
                      color: C.navyDark,
                      fontFamily: "var(--font-urbanist,system-ui)",
                      overflowWrap: "break-word",
                    }}
                  >
                    Visited {vet.name}?
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "15px",
                      fontWeight: 500,
                      color: C.slate,
                    }}
                  >
                    Help other pet owners by sharing what you paid.
                  </p>
                </div>
                <button
                  ref={submitCtaRef}
                  onClick={() => {
                    // Contributing prices requires an account — send logged-out
                    // users to sign up instead of opening a form that would fail
                    // at the database (RLS requires auth.uid()).
                    if (!session) {
                      router.push("/auth");
                      return;
                    }
                    if (showInlineSubmit) {
                      closeSubmitForm();
                    } else {
                      setShowInlineSubmit(true);
                      setTimeout(() => {
                        if (!inlineSubmitRef.current) return;
                        const top =
                          inlineSubmitRef.current.getBoundingClientRect().top +
                          window.scrollY -
                          80;
                        window.scrollTo({ top, behavior: "smooth" });
                      }, 150);
                    }
                  }}
                  className="submit-cta-btn"
                >
                  {!session
                    ? "Sign up to submit a price"
                    : showInlineSubmit
                      ? "Close form"
                      : "Submit a vet price"}
                </button>
              </div>
            </div>

            {/* ── INLINE SUBMIT FORM ── */}
            <div ref={inlineSubmitRef}>
              {showInlineSubmit && (
                <InlineSubmitPriceForm
                  C={C}
                  session={session}
                  vetId={vetId}
                  vetName={vetName}
                  onClose={closeSubmitForm}
                  onSubmitted={() => setPriceSubmitted(true)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      <ReportPriceModal
        open={!!reportingPrice}
        onClose={() => setReportingPrice(null)}
        vetId={vetId}
        vetName={vetName}
        serviceName={reportingPrice?.serviceName}
        serviceId={reportingPrice?.serviceId}
        vetPriceId={reportingPrice?.id}
        currentPrice={reportingPrice?.display}
      />
    </>
  );
}
