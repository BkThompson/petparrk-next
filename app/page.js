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

const NEIGHBORHOOD_COORDS = {
  Temescal: { lat: 37.8358, lng: -122.2632 },
  Montclair: { lat: 37.8177, lng: -122.2126 },
  Rockridge: { lat: 37.8382, lng: -122.2508 },
  Piedmont: { lat: 37.8246, lng: -122.2329 },
  "Grand Lake": { lat: 37.8165, lng: -122.244 },
  Fruitvale: { lat: 37.7749, lng: -122.2244 },
  Berkeley: { lat: 37.8716, lng: -122.2727 },
  "North Berkeley": { lat: 37.883, lng: -122.2712 },
  Albany: { lat: 37.8871, lng: -122.2979 },
  Oakland: { lat: 37.8044, lng: -122.2712 },
  Emeryville: { lat: 37.8309, lng: -122.2854 },
  Alameda: { lat: 37.7652, lng: -122.2416 },
  "San Leandro": { lat: 37.7249, lng: -122.1561 },
  "Castro Valley": { lat: 37.694, lng: -122.0857 },
  "San Francisco": { lat: 37.7749, lng: -122.4194 },
  "Walnut Creek": { lat: 37.9101, lng: -122.0652 },
};

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180,
    dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getVetCoords(vet) {
  const hood = vet.neighborhood || vet.city || "";
  for (const [key, coords] of Object.entries(NEIGHBORHOOD_COORDS))
    if (hood.toLowerCase().includes(key.toLowerCase())) return coords;
  return NEIGHBORHOOD_COORDS["Oakland"];
}

const PILLARS = [
  {
    icon: "💰",
    title: "Transparent Pricing",
    description:
      "Real prices from real pet owners. See what exams, dental, and surgery actually cost before you commit.",
    cta: "Find a Vet",
    href: "/vets",
  },
  {
    icon: "🩺",
    title: "AI Symptom Triage",
    description:
      "When your pet isn't acting like themselves, get instant guidance on what to do next — day or night.",
    cta: "Check Symptoms",
    href: "/symptom-checker",
  },
  {
    icon: "📋",
    title: "Pet Health History",
    description:
      "One place for every vet visit, vaccine, and health note. Your pet's story, owned by you.",
    cta: "View Health Card",
    href: "/profile",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Search your area",
    description:
      "Browse verified vets by neighborhood, specialty, or price. Real listings, no guesswork.",
  },
  {
    number: "02",
    title: "See actual prices",
    description:
      "Real costs submitted by pet owners like you — exams, dental, surgery, and more.",
  },
  {
    number: "03",
    title: "Walk in prepared",
    description:
      "No surprises at checkout. You already know what to expect before you even call.",
  },
];

function Bone({ fill }) {
  return (
    <svg
      viewBox="0 0 120 44"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <circle cx="16" cy="10" r="9" fill={fill} />
      <circle cx="16" cy="34" r="9" fill={fill} />
      <circle cx="104" cy="10" r="9" fill={fill} />
      <circle cx="104" cy="34" r="9" fill={fill} />
      <rect x="12" y="16" width="96" height="12" fill={fill} />
    </svg>
  );
}

function Paw({ fill }) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <ellipse cx="50" cy="72" rx="22" ry="18" fill={fill} />
      <ellipse cx="25" cy="50" rx="11" ry="9" fill={fill} />
      <ellipse cx="75" cy="50" rx="11" ry="9" fill={fill} />
      <ellipse cx="38" cy="35" rx="10" ry="8" fill={fill} />
      <ellipse cx="62" cy="35" rx="10" ry="8" fill={fill} />
    </svg>
  );
}

const HERO_ELEMENTS_DESKTOP = [
  {
    type: "bone",
    w: 390,
    h: 143,
    fill: "#CF5C36",
    opacity: 0.048,
    rot: 32,
    pos: { top: "-12px", left: "-72px" },
    anim: "float1 23s ease-in-out infinite",
  },
  {
    type: "bone",
    w: 245,
    h: 90,
    fill: "#EFC88B",
    opacity: 0.068,
    rot: -22,
    pos: { top: "6%", right: "-22px" },
    anim: "float2 27s ease-in-out infinite 0.8s",
  },
  {
    type: "bone",
    w: 198,
    h: 73,
    fill: "#CF5C36",
    opacity: 0.055,
    rot: 58,
    pos: { bottom: "11%", right: "19%" },
    anim: "floatBR2 19s ease-in-out infinite 1.2s",
  },
  {
    type: "bone",
    w: 150,
    h: 55,
    fill: "#EFC88B",
    opacity: 0.062,
    rot: -44,
    pos: { top: "52%", left: "6%" },
    anim: "float3 21s ease-in-out infinite 2s",
  },
  {
    type: "bone",
    w: 208,
    h: 76,
    fill: "#CF5C36",
    opacity: 0.062,
    rot: 14,
    pos: { top: "16%", left: "39%" },
    anim: "float1 25s ease-in-out infinite 1.5s",
  },
  {
    type: "bone",
    w: 162,
    h: 59,
    fill: "#EFC88B",
    opacity: 0.052,
    rot: -55,
    pos: { bottom: "23%", left: "25%" },
    anim: "float2 17s ease-in-out infinite 2.5s",
  },
  {
    type: "bone",
    w: 118,
    h: 43,
    fill: "#CF5C36",
    opacity: 0.06,
    rot: 12,
    pos: { bottom: "4%", left: "46%" },
    anim: "floatBR1 22s ease-in-out infinite 3s",
  },
  {
    type: "paw",
    w: 228,
    h: 228,
    fill: "#EFC88B",
    opacity: 0.045,
    rot: -18,
    pos: { bottom: "4%", left: "2%" },
    anim: "float2 20s ease-in-out infinite 0.5s",
  },
  {
    type: "paw",
    w: 148,
    h: 148,
    fill: "#CF5C36",
    opacity: 0.06,
    rot: 24,
    pos: { top: "26%", right: "2%" },
    anim: "floatBR1 17s ease-in-out infinite",
  },
  {
    type: "paw",
    w: 94,
    h: 94,
    fill: "#EFC88B",
    opacity: 0.055,
    rot: -9,
    pos: { top: "4%", left: "29%" },
    anim: "float3 14s ease-in-out infinite 3s",
  },
  {
    type: "paw",
    w: 108,
    h: 108,
    fill: "#CF5C36",
    opacity: 0.057,
    rot: 36,
    pos: { top: "44%", right: "19%" },
    anim: "float3 19s ease-in-out infinite 1.8s",
  },
];

const HERO_ELEMENTS_MOBILE = [
  {
    type: "bone",
    w: 138,
    h: 51,
    fill: "#CF5C36",
    opacity: 0.037,
    rot: 22,
    pos: { top: "-4px", left: "-12px" },
    anim: "none",
  },
  {
    type: "paw",
    w: 82,
    h: 82,
    fill: "#EFC88B",
    opacity: 0.035,
    rot: -18,
    pos: { top: "4%", right: "-6px" },
    anim: "none",
  },
  {
    type: "bone",
    w: 92,
    h: 34,
    fill: "#EFC88B",
    opacity: 0.041,
    rot: -42,
    pos: { top: "38%", left: "-6px" },
    anim: "none",
  },
  {
    type: "paw",
    w: 72,
    h: 72,
    fill: "#CF5C36",
    opacity: 0.041,
    rot: 16,
    pos: { top: "36%", right: "-4px" },
    anim: "none",
  },
  {
    type: "bone",
    w: 110,
    h: 40,
    fill: "#CF5C36",
    opacity: 0.042,
    rot: 38,
    pos: { bottom: "13%", left: "2%" },
    anim: "none",
  },
  {
    type: "bone",
    w: 86,
    h: 32,
    fill: "#EFC88B",
    opacity: 0.039,
    rot: -24,
    pos: { bottom: "7%", right: "3%" },
    anim: "none",
  },
];

function HeroElement({ type, w, h, fill, opacity, rot, pos, anim }) {
  return (
    <div
      style={{
        position: "absolute",
        ...pos,
        pointerEvents: "none",
        transform: `rotate(${rot}deg)`,
      }}
    >
      <div
        className="hero-float"
        style={{
          width: w,
          height: h,
          opacity,
          animation: anim,
          willChange: "transform",
        }}
      >
        {type === "bone" ? <Bone fill={fill} /> : <Paw fill={fill} />}
      </div>
    </div>
  );
}

function useScrollReveal(threshold = 0.08) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [vets, setVets] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [savedVetIds, setSavedVetIds] = useState(new Set());
  const [animatingId, setAnimatingId] = useState(null);
  const [heroSearch, setHeroSearch] = useState("");
  const [userCoords, setUserCoords] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const [vetsRef, vetsVisible] = useScrollReveal();
  const [pillarsRef, pillarsVisible] = useScrollReveal();
  const [stepsRef, stepsVisible] = useScrollReveal();
  const [trustRef, trustVisible] = useScrollReveal();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      if (window.location.hash)
        window.history.replaceState(null, "", window.location.pathname);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        () => setUserCoords(null),
        { timeout: 5000 },
      );
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
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
        const n = new Set(prev);
        n.delete(vetId);
        return n;
      });
    } else {
      await supabase
        .from("saved_vets")
        .insert({ user_id: session.user.id, vet_id: vetId });
      setSavedVetIds((prev) => new Set([...prev, vetId]));
    }
  }

  const teaserVets = [...vets]
    .filter((v) => prices[v.id]?.some((p) => p.price_low))
    .sort((a, b) => {
      if (userCoords) {
        const aC = getVetCoords(a),
          bC = getVetCoords(b);
        return (
          getDistance(userCoords.lat, userCoords.lng, aC.lat, aC.lng) -
          getDistance(userCoords.lat, userCoords.lng, bC.lat, bC.lng)
        );
      }
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
    router.push(
      heroSearch.trim()
        ? `/vets?search=${encodeURIComponent(heroSearch.trim())}`
        : "/vets",
    );
  }

  const showCTA = session === null;

  return (
    <>
      <style>{`
        @keyframes heartPop     { 0%{transform:scale(1)} 40%{transform:scale(1.5)} 70%{transform:scale(0.85)} 100%{transform:scale(1)} }
        @keyframes fadeSlideUp  { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float1  { 0%,100%{transform:translate(0px,0px) scale(1)} 33%{transform:translate(-28px,18px) scale(1.04)} 66%{transform:translate(18px,-14px) scale(0.97)} }
        @keyframes float2  { 0%,100%{transform:translate(0px,0px) scale(1)} 33%{transform:translate(22px,-18px) scale(1.03)} 66%{transform:translate(-14px,22px) scale(0.98)} }
        @keyframes float3  { 0%,100%{transform:translate(0px,0px) scale(1)} 50% {transform:translate(8px,-12px)  scale(1.05)} }
        @keyframes floatBR1{ 0%,100%{transform:translate(0px,0px) scale(1)} 30%{transform:translate(-20px,-25px) scale(1.05)} 70%{transform:translate(15px,-10px) scale(0.96)} }
        @keyframes floatBR2{ 0%,100%{transform:translate(0px,0px) scale(1)} 40%{transform:translate(18px,-22px)  scale(1.08)} 75%{transform:translate(-12px,15px) scale(0.94)} }




        .anim-1{animation:fadeSlideUp 0.9s 0.10s ease both}
        .anim-2{animation:fadeSlideUp 0.9s 0.28s ease both}
        .anim-3{animation:fadeSlideUp 0.9s 0.48s ease both}
        .anim-4{animation:fadeSlideUp 0.9s 0.68s ease both}




        @media (max-width: 768px) { .hero-float { animation: none !important; } }




        .reveal-up    { opacity:0; transform:translateY(40px);  transition:opacity 1.2s cubic-bezier(0.22,1,0.36,1),transform 1.2s cubic-bezier(0.22,1,0.36,1); }
        .reveal-left  { opacity:0; transform:translateX(-40px); transition:opacity 1.2s cubic-bezier(0.22,1,0.36,1),transform 1.2s cubic-bezier(0.22,1,0.36,1); }
        .reveal-right { opacity:0; transform:translateX(40px);  transition:opacity 1.2s cubic-bezier(0.22,1,0.36,1),transform 1.2s cubic-bezier(0.22,1,0.36,1); }
        .reveal-scale { opacity:0; transform:scale(0.93);       transition:opacity 1.2s cubic-bezier(0.22,1,0.36,1),transform 1.2s cubic-bezier(0.22,1,0.36,1); }
        .reveal-up.visible,.reveal-left.visible,.reveal-right.visible,.reveal-scale.visible { opacity:1; transform:translateY(0) translateX(0) scale(1); }
        .reveal-delay-1{transition-delay:0.12s} .reveal-delay-2{transition-delay:0.26s} .reveal-delay-3{transition-delay:0.40s}




        .hero-input-wrap { position:relative; }
        .hero-search { width:100%; padding:18px 148px 18px 22px; border-radius:14px; border:1.5px solid rgba(255,255,255,0.1); font-size:16px; font-family:var(--font-urbanist,'Urbanist',sans-serif); background:rgba(255,255,255,0.06); color:#fff; outline:none; box-sizing:border-box; transition:border-color 0.2s,background 0.2s,box-shadow 0.2s; }
        .hero-search::placeholder { color:rgba(255,255,255,0.35); }
        .hero-search:focus { border-color:var(--color-terracotta,#CF5C36); background:rgba(255,255,255,0.09); box-shadow:0 0 0 6px rgba(207,92,54,0.08),0 0 24px rgba(207,92,54,0.12),0 8px 32px rgba(0,0,0,0.2); }
        .hero-btn { position:absolute; right:8px; top:50%; transform:translateY(-50%); background:var(--color-terracotta,#CF5C36); color:#fff; border:2px solid var(--color-terracotta,#CF5C36); border-radius:10px; padding:12px 22px; font-size:14px; font-weight:700; cursor:pointer; font-family:var(--font-urbanist,'Urbanist',sans-serif); white-space:nowrap; transition:background 0.2s,color 0.2s; }
        .hero-btn:hover { background:#fff; color:var(--color-terracotta,#CF5C36); }
        @media (max-width:480px) {
          .hero-input-wrap { display:flex; flex-direction:column; gap:10px; }
          .hero-search { padding:18px 22px; border-radius:14px; }
          .hero-btn { position:static; transform:none; width:100%; padding:16px; border-radius:12px; font-size:15px; border:2px solid var(--color-terracotta,#CF5C36); }
        }




        .pillar-card-outer { position:relative; border-radius:22px; padding:1.5px; background:linear-gradient(135deg,rgba(239,200,139,0.55) 0%,rgba(207,92,54,0.25) 12%,rgba(255,255,255,0.04) 28%,transparent 42%,transparent 58%,rgba(255,255,255,0.04) 72%,rgba(207,92,54,0.2) 88%,rgba(239,200,139,0.45) 100%); transition:transform 0.3s; }
        .pillar-card-outer:hover { transform:translateY(-4px); }
        .pillar-card { background:linear-gradient(160deg,rgba(42,62,78,0.98) 0%,rgba(30,48,62,0.98) 40%,rgba(26,42,55,0.98) 100%); border-radius:20px; padding:36px 28px 32px; text-align:center; position:relative; overflow:hidden; display:flex; flex-direction:column; height:100%; box-sizing:border-box; transition:background 0.3s,box-shadow 0.3s; }
        .pillar-card-outer:hover .pillar-card { background:linear-gradient(160deg,rgba(50,72,90,0.98) 0%,rgba(38,58,74,0.98) 40%,rgba(32,52,66,0.98) 100%); box-shadow:0 20px 50px rgba(0,0,0,0.35); }
        .pillar-link-wrap { margin-top:auto; padding-top:24px; }
        .pillar-icon-wrap { width:68px; height:68px; border-radius:18px; margin:0 auto 22px; display:flex; align-items:center; justify-content:center; font-size:30px; position:relative; z-index:1; box-shadow:0 4px 16px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.15); }
        .pillar-icon-wrap.pillar-icon-0 { background:rgba(207,92,54,0.14)!important; border:1px solid rgba(207,92,54,0.28); }
        .pillar-icon-wrap.pillar-icon-1 { background:rgba(100,160,210,0.14)!important; border:1px solid rgba(100,160,210,0.25); }
        .pillar-icon-wrap.pillar-icon-2 { background:rgba(80,140,80,0.14)!important; border:1px solid rgba(80,140,80,0.25); }




        .step-card { padding:32px 0; display:grid; grid-template-columns:72px 1fr; gap:20px; align-items:start; }
        .step-card+.step-card { border-top:1px solid rgba(255,255,255,0.07); }
        .step-number { font-size:clamp(44px,6vw,60px); font-weight:800; line-height:1; color:rgba(239,200,139,0.15); font-family:var(--font-urbanist,'Urbanist',sans-serif); user-select:none; }




        /* ── VET CARDS — match Find a Vet page exactly ── */
        .vet-card-outer { border-radius:18px; padding:1.5px; height:100%; background:#EDE8E0; transition:transform 0.3s,background 0.25s ease; }
        .vet-card-outer:hover { transform:translateY(-3px); }
        .vet-card-outer:hover .vet-card-inner { box-shadow:0 0 0 1.5px rgba(239,200,139,0.9),0 16px 48px rgba(23,37,49,0.13); }
        .vet-card-inner { border-radius:17px; padding:24px; background:#fff; display:flex; flex-direction:column; height:100%; box-sizing:border-box; transition:box-shadow 0.25s; }




        .heart-btn { transition:transform 0.15s; border:none; background:none; cursor:pointer; padding:0; font-size:20px; line-height:1; }
        .heart-btn:hover { transform:scale(1.2); }
        .heart-animating { animation:heartPop 0.4s ease forwards; }
        .badge { display:inline-flex; align-items:center; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:700; white-space:nowrap; }
        .badge-navy    { background:#EBF0F5; color:#2C4657; }
        .badge-success { background:#EDFAF3; color:#1A6641; }
        .badge-error   { background:#FCEAEA; color:#C94040; }
        .price-chip { display:inline-flex; align-items:center; gap:5px; background:#F5F0E8; border-radius:8px; padding:4px 10px; font-size:13px; }
        .price-chip-label { color:#717A86; font-weight:500; }
        .price-chip-value { font-weight:700; color:#CF5C36; }
        .pillars-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        .vets-grid    { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:20px; align-items:stretch; }
        @media(max-width:900px){ .pillars-grid{ grid-template-columns:1fr; } }




        .btn-primary {
          height:50px; padding:0 36px; line-height:1;
          background:var(--color-terracotta,#CF5C36); color:#fff;
          border:2px solid var(--color-terracotta,#CF5C36); border-radius:12px;
          font-size:16px; font-weight:700; cursor:pointer; text-decoration:none;
          font-family:var(--font-urbanist,'Urbanist',sans-serif);
          display:inline-flex; align-items:center; justify-content:center;
          transition:background 0.25s,color 0.25s;
        }
        .btn-primary:hover { background:#fff; color:var(--color-terracotta,#CF5C36); }
        .btn-outline-dark {
          height:50px; padding:0 36px; line-height:1;
          background:transparent; color:var(--color-navy-dark,#172531);
          border:2px solid var(--color-navy-dark,#172531); border-radius:12px;
          font-size:16px; font-weight:700; text-decoration:none;
          font-family:var(--font-urbanist,'Urbanist',sans-serif);
          display:inline-flex; align-items:center; justify-content:center;
          transition:background 0.25s,color 0.25s;
        }
        .btn-outline-dark:hover { background:var(--color-navy-dark,#172531); color:#fff; }




        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        .skeleton { background:linear-gradient(90deg,#f0ece4 25%,#e8e0d4 50%,#f0ece4 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:18px; }




        @media(max-width:640px){
          .step-card { grid-template-columns:52px 1fr; gap:14px; }
          .step-number { font-size:36px; }
          .steps-grid { grid-template-columns:1fr!important; }
          .btn-cta-group { flex-direction:column!important; align-items:stretch!important; }
          .btn-primary,.btn-outline-dark { width:100%; box-sizing:border-box; height:50px; justify-content:center; }
        }
      `}</style>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section
        style={{
          background: "var(--color-navy-dark,#172531)",
          padding: "108px 0 120px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "1100px",
            height: "900px",
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse at center, rgba(239,200,139,0.06) 0%, rgba(239,200,139,0.025) 40%, transparent 68%)",
            filter: "blur(60px)",
          }}
        />

        {(isMobile ? HERO_ELEMENTS_MOBILE : HERO_ELEMENTS_DESKTOP).map(
          (el, i) => (
            <HeroElement key={i} {...el} />
          ),
        )}

        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "80px",
            pointerEvents: "none",
            background:
              "linear-gradient(to bottom,transparent,var(--color-navy-dark,#172531))",
          }}
        />

        <div
          style={{
            maxWidth: "850px",
            margin: "0 auto",
            textAlign: "center",
            padding: "0 24px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            className="anim-1"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(239,200,139,0.08)",
              border: "1px solid rgba(239,200,139,0.2)",
              borderRadius: "20px",
              padding: "7px 18px",
              marginBottom: "32px",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "var(--color-gold,#EFC88B)",
                display: "inline-block",
                boxShadow: "0 0 8px rgba(239,200,139,0.6)",
              }}
            />
            <span
              style={{
                fontSize: "12px",
                fontWeight: "700",
                color: "var(--color-gold,#EFC88B)",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
              }}
            >
              Vet Pricing Transparency
            </span>
          </div>

          <h1
            className="anim-2"
            style={{
              fontSize: "clamp(40px,7.5vw,72px)",
              fontWeight: "800",
              color: "#fff",
              lineHeight: "1.03",
              marginBottom: "22px",
              fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
              letterSpacing: "-0.025em",
            }}
          >
            Know what you'll pay before{" "}
            <span style={{ color: "var(--color-gold,#EFC88B)" }}>
              your next vet visit.
            </span>
          </h1>

          <p
            className="anim-3"
            style={{
              fontSize: "18px",
              color: "rgba(255,255,255,0.6)",
              lineHeight: "1.75",
              maxWidth: "600px",
              margin: "0 auto 48px",
            }}
          >
            PetParrk gives you real vet prices, instant symptom guidance, and a
            health history your pet deserves.
          </p>

          <form
            className="anim-4"
            onSubmit={handleHeroSearch}
            style={{ maxWidth: "580px", margin: "0 auto" }}
          >
            <div className="hero-input-wrap">
              <input
                type="text"
                className="hero-search"
                placeholder="Search by vet name or neighborhood..."
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
              />
              <button type="submit" className="hero-btn">
                {heroSearch.trim() ? "Search" : "Browse All Vets"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ── VET TEASERS ──────────────────────────────────────────────── */}
      <section
        style={{ background: "var(--color-cream,#F5F0E8)", padding: "96px 0" }}
      >
        <div className="pp-container">
          <div
            ref={vetsRef}
            className={`reveal-up${vetsVisible ? " visible" : ""}`}
            style={{ marginBottom: "44px" }}
          >
            <p
              style={{
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--color-terracotta,#CF5C36)",
                marginBottom: "10px",
              }}
            >
              {userCoords ? "Vets near you" : "Real data, right now"}
            </p>
            <h2
              style={{
                fontSize: "clamp(26px,3.5vw,40px)",
                fontWeight: "800",
                color: "var(--color-navy-dark,#172531)",
                lineHeight: "1.1",
                fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              See what people actually paid
            </h2>
          </div>
          {loading ? (
            <div className="vets-grid">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: "220px" }} />
              ))}
            </div>
          ) : teaserVets.length > 0 ? (
            <div className="vets-grid">
              {teaserVets.map((vet, i) => {
                const vetPrices = prices[vet.id] || [];
                const exam = vetPrices.find(
                  (p) => p.services?.name === "Doctor Exam" && p.price_low,
                );
                const dental = vetPrices.find(
                  (p) => p.services?.name === "Dental Cleaning" && p.price_low,
                );
                const lu = vetPrices
                  .filter((p) => p.created_at)
                  .sort(
                    (a, b) => new Date(b.created_at) - new Date(a.created_at),
                  )[0]?.created_at
                  ? new Date(
                      vetPrices
                        .filter((p) => p.created_at)
                        .sort(
                          (a, b) =>
                            new Date(b.created_at) - new Date(a.created_at),
                        )[0].created_at,
                    )
                  : null;
                const isSaved = savedVetIds.has(vet.id),
                  isAnim = animatingId === vet.id;
                return (
                  <div
                    key={vet.id}
                    className={`vet-card-outer reveal-scale${vetsVisible ? " visible" : ""} reveal-delay-${i + 1}`}
                  >
                    <div className="vet-card-inner">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "10px",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <Link
                            href={`/vet/${vet.slug}`}
                            style={{
                              fontSize: "17px",
                              fontWeight: "700",
                              color: "var(--color-navy-dark,#172531)",
                              textDecoration: "none",
                              fontFamily:
                                "var(--font-urbanist,'Urbanist',sans-serif)",
                              display: "block",
                              marginBottom: "3px",
                            }}
                          >
                            {vet.name}
                          </Link>
                          <p
                            style={{
                              fontSize: "13px",
                              color: "#717A86",
                              margin: 0,
                            }}
                          >
                            {[vet.neighborhood, vet.city]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <button
                          onClick={(e) => toggleSave(e, vet.id)}
                          className={`heart-btn${isAnim ? " heart-animating" : ""}`}
                          title={
                            isSaved ? "Remove from saved" : "Save this vet"
                          }
                        >
                          {isSaved ? "❤️" : "🤍"}
                        </button>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "4px",
                          marginBottom: "14px",
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
                        {vet.ownership && (
                          <span className="badge badge-navy">
                            {vet.ownership?.startsWith("Other:")
                              ? vet.ownership.replace("Other: ", "")
                              : vet.ownership}
                          </span>
                        )}
                        {vet.accepting_new_patients === true && (
                          <span className="badge badge-success">
                            ✅ Accepting
                          </span>
                        )}
                        {vet.accepting_new_patients === false && (
                          <span className="badge badge-error">
                            ✕ Not Accepting
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                          marginBottom: "16px",
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
                          borderTop: "1px solid #EDE8E0",
                          paddingTop: "14px",
                          marginTop: "auto",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontSize: "12px", color: "#717A86" }}>
                          {lu
                            ? `Verified ${lu.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
                            : ""}
                        </span>
                        <Link
                          href={`/vet/${vet.slug}`}
                          style={{
                            fontSize: "13px",
                            fontWeight: "700",
                            color: "#CF5C36",
                            textDecoration: "none",
                          }}
                        >
                          View profile →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p
              style={{
                color: "#717A86",
                textAlign: "center",
                padding: "48px 0",
              }}
            >
              Loading vets...
            </p>
          )}
          <div
            className={`reveal-up${vetsVisible ? " visible" : ""} reveal-delay-3`}
            style={{ textAlign: "right", marginTop: "28px" }}
          >
            <Link
              href="/vets"
              style={{
                fontSize: "14px",
                fontWeight: "700",
                color: "var(--color-terracotta,#CF5C36)",
                textDecoration: "none",
              }}
            >
              See all vets →
            </Link>
          </div>
        </div>
      </section>

      {/* ── THREE PILLARS ────────────────────────────────────────────── */}
      <section
        style={{
          background: "var(--color-navy-mid,#2C4657)",
          padding: "96px 0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.025) 1px,transparent 1px)",
            backgroundSize: "36px 36px",
            pointerEvents: "none",
          }}
        />
        <div
          className="pp-container"
          style={{ position: "relative", zIndex: 1 }}
        >
          <div
            ref={pillarsRef}
            className={`reveal-up${pillarsVisible ? " visible" : ""}`}
            style={{ textAlign: "center", marginBottom: "56px" }}
          >
            <p
              style={{
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--color-gold,#EFC88B)",
                marginBottom: "12px",
              }}
            >
              A platform built around your pet
            </p>
            <h2
              style={{
                fontSize: "clamp(28px,4vw,44px)",
                fontWeight: "800",
                color: "#fff",
                lineHeight: "1.1",
                fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
                margin: "0 auto",
                maxWidth: "600px",
                letterSpacing: "-0.02em",
              }}
            >
              Everything you need to make confident decisions
            </h2>
          </div>
          <div className="pillars-grid" style={{ alignItems: "stretch" }}>
            {PILLARS.map((pillar, i) => (
              <div
                key={pillar.title}
                className={`reveal-left${pillarsVisible ? " visible" : ""} reveal-delay-${i + 1}`}
                style={{ height: "100%" }}
              >
                <div className="pillar-card-outer" style={{ height: "100%" }}>
                  <div className="pillar-card">
                    <div
                      className={`pillar-icon-wrap pillar-icon-${i}`}
                      style={{ filter: "brightness(1.35)" }}
                    >
                      {pillar.icon}
                    </div>
                    <h3
                      style={{
                        fontSize: "20px",
                        fontWeight: "800",
                        color: "#fff",
                        marginBottom: "12px",
                        fontFamily:
                          "var(--font-urbanist,'Urbanist',sans-serif)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {pillar.title}
                    </h3>
                    <p
                      style={{
                        fontSize: "15px",
                        color: "rgba(255,255,255,0.55)",
                        lineHeight: "1.75",
                        marginBottom: "28px",
                      }}
                    >
                      {pillar.description}
                    </p>
                    <div className="pillar-link-wrap">
                      <Link
                        href={pillar.href}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "13px",
                          fontWeight: "700",
                          color: "var(--color-gold,#EFC88B)",
                          textDecoration: "none",
                        }}
                      >
                        {pillar.cta} →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section
        style={{
          background: "var(--color-navy-dark,#172531)",
          padding: "96px 0 0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          className="pp-container"
          style={{ position: "relative", zIndex: 1, paddingBottom: "96px" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "80px",
              alignItems: "start",
            }}
            className="steps-grid"
          >
            <div
              ref={stepsRef}
              className={`reveal-up${stepsVisible ? " visible" : ""}`}
            >
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--color-gold,#EFC88B)",
                  marginBottom: "16px",
                }}
              >
                Simple process
              </p>
              <h2
                style={{
                  fontSize: "clamp(28px,4vw,44px)",
                  fontWeight: "800",
                  color: "#fff",
                  lineHeight: "1.1",
                  fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
                  marginBottom: "20px",
                  letterSpacing: "-0.02em",
                }}
              >
                It's simpler than you think
              </h2>
              <p
                style={{
                  fontSize: "16px",
                  color: "rgba(255,255,255,0.5)",
                  lineHeight: "1.75",
                  marginBottom: "36px",
                }}
              >
                Most pet owners spend hours calling vets, getting vague answers,
                and still feeling unprepared. PetParrk fixes that in three
                steps.
              </p>
              <Link
                href="/how-it-works"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "var(--color-gold,#EFC88B)",
                  textDecoration: "none",
                }}
              >
                Learn more →
              </Link>
            </div>
            <div>
              {STEPS.map((step, i) => (
                <div
                  key={step.number}
                  className={`step-card reveal-right${stepsVisible ? " visible" : ""} reveal-delay-${i + 1}`}
                >
                  <div className="step-number">{step.number}</div>
                  <div style={{ paddingTop: "6px" }}>
                    <h3
                      style={{
                        fontSize: "18px",
                        fontWeight: "800",
                        color: "#fff",
                        marginBottom: "8px",
                        fontFamily:
                          "var(--font-urbanist,'Urbanist',sans-serif)",
                      }}
                    >
                      {step.title}
                    </h3>
                    <p
                      style={{
                        fontSize: "15px",
                        color: "rgba(255,255,255,0.5)",
                        lineHeight: "1.7",
                        margin: 0,
                      }}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: "64px",
            paddingLeft: "20px",
            paddingRight: "20px",
          }}
        >
          <div
            ref={trustRef}
            className={`reveal-up${trustVisible ? " visible" : ""}`}
            style={{
              maxWidth: "1280px",
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
              gap: "16px",
              textAlign: "center",
              paddingBottom: "64px",
              paddingLeft: "24px",
              paddingRight: "24px",
            }}
          >
            {[
              {
                value: `${vets.length > 0 ? vets.length : "40"}+`,
                label: "Verified vets in the East Bay",
              },
              { value: "Free", label: "No account needed to browse" },
              {
                value: "Verified",
                label: "Every price reviewed before it goes live",
              },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`reveal-up${trustVisible ? " visible" : ""} reveal-delay-${i + 1}`}
                style={{ padding: "16px" }}
              >
                <div
                  style={{
                    fontSize: "clamp(36px,5vw,52px)",
                    fontWeight: "800",
                    color: "var(--color-gold,#EFC88B)",
                    fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
                    marginBottom: "8px",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.5)",
                    lineHeight: "1.6",
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              height: "1px",
              background:
                "linear-gradient(to right,rgba(255,255,255,0),rgba(255,255,255,0.2) 20%,rgba(255,255,255,0.2) 80%,rgba(255,255,255,0))",
              margin: "0 24px",
            }}
          />
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      {showCTA && (
        <section
          style={{
            background: "var(--color-cream,#F5F0E8)",
            padding: "104px 0",
          }}
        >
          <div
            style={{
              maxWidth: "640px",
              margin: "0 auto",
              textAlign: "center",
              padding: "0 24px",
            }}
          >
            <p
              style={{
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--color-terracotta,#CF5C36)",
                marginBottom: "16px",
              }}
            >
              Get started free
            </p>
            <h2
              style={{
                fontSize: "clamp(28px,4vw,44px)",
                fontWeight: "800",
                color: "var(--color-navy-dark,#172531)",
                marginBottom: "18px",
                fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
                lineHeight: "1.1",
                letterSpacing: "-0.02em",
              }}
            >
              Your pet's health, in one place.
            </h2>
            <p
              style={{
                fontSize: "17px",
                color: "var(--color-slate,#4B5563)",
                lineHeight: "1.75",
                marginBottom: "40px",
              }}
            >
              Save vets, run symptom checks, and build a health history your pet
              deserves — all for free.
            </p>
            <div
              className="btn-cta-group"
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link href="/auth?tab=signup" className="btn-primary">
                Create free account
              </Link>
              <Link href="/auth" className="btn-outline-dark">
                Sign in
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
Home;
