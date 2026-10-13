"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import HomeDashboard from "../components/HomeDashboard";
import Link from "next/link";
import {
  ArtPricing,
  ArtTriage,
  ArtRecord,
  ArtSteps,
} from "../components/BrandArt";
import { Heart, Check, X, ArrowRight, Lock } from "lucide-react";
import HeroBanner from "../components/HeroBanner";
import { heroArt } from "../lib/heroArt";

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
    art: ArtPricing,
    title: "Transparent Pricing",
    description:
      "Real prices, verified before they go live. See what exams, dental, and surgery actually cost before you commit.",
    cta: "Find a Vet",
    href: "/vets",
  },
  {
    art: ArtTriage,
    title: "AI Symptom Triage",
    description:
      "When your pet isn't acting like themselves, get instant guidance on what to do next — day or night.",
    cta: "Check Symptoms",
    href: "/symptom-checker",
  },
  {
    art: ArtRecord,
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
      "Real costs for exams, dental, surgery, and more — each one checked and dated.",
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
    <svg aria-hidden="true"
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
    <svg aria-hidden="true"
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
    fill: "var(--color-terracotta)",
    opacity: 0.048,
    rot: 32,
    pos: { top: "-12px", left: "-72px" },
    anim: "float1 23s ease-in-out infinite",
  },
  {
    type: "bone",
    w: 245,
    h: 90,
    fill: "var(--color-gold)",
    opacity: 0.068,
    rot: -22,
    pos: { top: "6%", right: "-22px" },
    anim: "float2 27s ease-in-out infinite 0.8s",
  },
  {
    type: "bone",
    w: 198,
    h: 73,
    fill: "var(--color-terracotta)",
    opacity: 0.055,
    rot: 58,
    pos: { bottom: "11%", right: "19%" },
    anim: "floatBR2 19s ease-in-out infinite 1.2s",
  },
  {
    type: "bone",
    w: 150,
    h: 55,
    fill: "var(--color-gold)",
    opacity: 0.062,
    rot: -44,
    pos: { top: "52%", left: "6%" },
    anim: "float3 21s ease-in-out infinite 2s",
  },
  {
    type: "bone",
    w: 208,
    h: 76,
    fill: "var(--color-terracotta)",
    opacity: 0.062,
    rot: 14,
    pos: { top: "16%", left: "39%" },
    anim: "float1 25s ease-in-out infinite 1.5s",
  },
  {
    type: "bone",
    w: 162,
    h: 59,
    fill: "var(--color-gold)",
    opacity: 0.052,
    rot: -55,
    pos: { bottom: "23%", left: "25%" },
    anim: "float2 17s ease-in-out infinite 2.5s",
  },
  {
    type: "bone",
    w: 118,
    h: 43,
    fill: "var(--color-terracotta)",
    opacity: 0.06,
    rot: 12,
    pos: { bottom: "4%", left: "46%" },
    anim: "floatBR1 22s ease-in-out infinite 3s",
  },
  {
    type: "paw",
    w: 228,
    h: 228,
    fill: "var(--color-gold)",
    opacity: 0.045,
    rot: -18,
    pos: { bottom: "4%", left: "2%" },
    anim: "float2 20s ease-in-out infinite 0.5s",
  },
  {
    type: "paw",
    w: 148,
    h: 148,
    fill: "var(--color-terracotta)",
    opacity: 0.06,
    rot: 24,
    pos: { top: "26%", right: "2%" },
    anim: "floatBR1 17s ease-in-out infinite",
  },
  {
    type: "paw",
    w: 94,
    h: 94,
    fill: "var(--color-gold)",
    opacity: 0.055,
    rot: -9,
    pos: { top: "4%", left: "29%" },
    anim: "float3 14s ease-in-out infinite 3s",
  },
  {
    type: "paw",
    w: 108,
    h: 108,
    fill: "var(--color-terracotta)",
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
    fill: "var(--color-terracotta)",
    opacity: 0.037,
    rot: 22,
    pos: { top: "-4px", left: "-12px" },
    anim: "none",
  },
  {
    type: "paw",
    w: 82,
    h: 82,
    fill: "var(--color-gold)",
    opacity: 0.035,
    rot: -18,
    pos: { top: "4%", right: "-6px" },
    anim: "none",
  },
  {
    type: "bone",
    w: 92,
    h: 34,
    fill: "var(--color-gold)",
    opacity: 0.041,
    rot: -42,
    pos: { top: "38%", left: "-6px" },
    anim: "none",
  },
  {
    type: "paw",
    w: 72,
    h: 72,
    fill: "var(--color-terracotta)",
    opacity: 0.041,
    rot: 16,
    pos: { top: "36%", right: "-4px" },
    anim: "none",
  },
  {
    type: "bone",
    w: 110,
    h: 40,
    fill: "var(--color-terracotta)",
    opacity: 0.042,
    rot: 38,
    pos: { bottom: "13%", left: "2%" },
    anim: "none",
  },
  {
    type: "bone",
    w: 86,
    h: 32,
    fill: "var(--color-gold)",
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

  // Vets are public — anon can read active vets — so this runs for everyone.
  // It deliberately does NOT end the loading state: prices finish below, and
  // ending here would show the teaser section before the prices arrive, where
  // it would read "No vets to show yet" for a second and then fill in.
  useEffect(() => {
    async function fetchVets() {
      const { data: vetData } = await supabase
        .from("vets")
        .select("*")
        .eq("status", "active")
        .order("name");
      setVets(vetData || []);
      if (!vetData || vetData.length === 0) setLoading(false);
    }
    fetchVets();
  }, []);

  // Prices are account-only. Two separate reasons this waits on session:
  //   1. session === undefined means the session check hasn't come back yet.
  //      Firing the query now races the auth token restore, so a signed-in
  //      visitor on a hard refresh could send it unauthenticated and get an
  //      empty set back. That used to be harmless because anon could read
  //      prices. It isn't any more.
  //   2. A signed-out visitor never sends it at all. RLS returns nothing
  //      either way, but not asking is what makes the gate real — until now
  //      every price was in the DOM under a CSS blur, readable by anyone who
  //      opened devtools.
  useEffect(() => {
    if (session === undefined) return;
    if (!session) {
      setPrices({});
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function fetchPrices() {
      const { data: priceData } = await supabase
        .from("vet_prices")
        .select("*, services(name)");
      if (cancelled) return;
      const priceMap = {};
      priceData?.forEach((p) => {
        if (!priceMap[p.vet_id]) priceMap[p.vet_id] = [];
        priceMap[p.vet_id].push(p);
      });
      setPrices(priceMap);
      setLoading(false);
    }
    fetchPrices();
    return () => {
      cancelled = true;
    };
  }, [session]);

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
    // Signed in: only clinics we actually hold a price for — the section is
    // headed "See what people actually paid". Signed out: there are no prices
    // in state to filter on, so this emptied the entire section and the page
    // said "No vets to show yet". Show the nearest four and let the gate below
    // cover the numbers.
    .filter((v) => (session ? prices[v.id]?.some((p) => p.price_low) : true))
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
    .slice(0, 4);

  function handleHeroSearch(e) {
    e.preventDefault();
    router.push(
      heroSearch.trim()
        ? `/vets?search=${encodeURIComponent(heroSearch.trim())}`
        : "/vets",
    );
  }

  // Shared by the current hero and the illustrated one. margin centres it in
  // the current (centred) hero and left-aligns it in the new one.
  const heroForm = (margin) => (
    <form
      className="anim-4"
      onSubmit={handleHeroSearch}
      style={{ maxWidth: "580px", margin }}
    >
      <div className="hero-input-wrap">
        <input
          type="text"
          className="hero-search"
          placeholder="Search by vet name or neighborhood..."
          aria-label="Search by vet name or neighborhood"
          value={heroSearch}
          onChange={(e) => setHeroSearch(e.target.value)}
        />
        {/* The label follows what the button will actually do. The
            handler already branches on an empty field — it sends you to
            the full directory — but a button reading "Search" with
            nothing typed looks like it will do nothing. */}
        <button type="submit" className="hero-btn">
          {heroSearch.trim() ? "Search" : "Browse all vets"}
        </button>
      </div>
    </form>
  );
  // Illustrated banner once Home's art exists (lib/heroArt.js); until then
  // the current hero below.
  const homeArt = heroArt("home");

  const showCTA = session === null;
  // Saved vets (full objects) for the logged-in dashboard strip.
  const savedVetsList = vets.filter((v) => savedVetIds.has(v.id));

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

        @media (max-width: 768px) { 
          .hero-float { 
            animation: none !important; 
          } 
          .home-platform-build {
            margin: 0 auto;
            max-width: 90%;
          }
        }

        .reveal-up    { opacity:0; transform:translateY(40px);  transition:opacity 1.2s cubic-bezier(0.22,1,0.36,1),transform 1.2s cubic-bezier(0.22,1,0.36,1); }
        .reveal-left  { opacity:0; transform:translateX(-40px); transition:opacity 1.2s cubic-bezier(0.22,1,0.36,1),transform 1.2s cubic-bezier(0.22,1,0.36,1); }
        .reveal-right { opacity:0; transform:translateX(40px);  transition:opacity 1.2s cubic-bezier(0.22,1,0.36,1),transform 1.2s cubic-bezier(0.22,1,0.36,1); }
        .reveal-scale { opacity:0; transform:scale(0.93);       transition:opacity 1.2s cubic-bezier(0.22,1,0.36,1),transform 1.2s cubic-bezier(0.22,1,0.36,1); }
        .reveal-up.visible,.reveal-left.visible,.reveal-right.visible,.reveal-scale.visible { opacity:1; transform:translateY(0) translateX(0) scale(1); }
        .reveal-delay-1{transition-delay:0.12s} .reveal-delay-2{transition-delay:0.26s} .reveal-delay-3{transition-delay:0.40s}

        .hero-input-wrap { position:relative; }
        .hero-search { width:100%; padding:18px 148px 18px 22px; border-radius:14px; border:2px solid rgb(var(--color-white-rgb) / 0.4); font-size:16px; font-weight:500; font-family:var(--font-urbanist,'Urbanist',sans-serif); background:rgb(var(--color-white-rgb) / 0.06); color:var(--color-white); outline:none; box-sizing:border-box; transition:border-color 0.2s,background 0.2s,box-shadow 0.2s; }
        .hero-search::placeholder { color:rgb(var(--color-white-rgb) / 0.65); }
        /* Over the illustrated banner: a near-solid field so busy art doesn't show through. */
        .hb .hero-search { background:rgb(var(--color-navy-dark-rgb) / 0.85); border-color:rgb(var(--color-white-rgb) / 0.4); }
        .hb .hero-search:focus { background:rgb(var(--color-navy-dark-rgb) / 0.92); }
        .hero-search:focus { border-color:var(--color-terracotta); background:rgb(var(--color-white-rgb) / 0.09); box-shadow:0 0 0 6px rgb(var(--color-terracotta-rgb) / 0.08),0 0 24px rgb(var(--color-terracotta-rgb) / 0.12),0 8px 32px rgb(var(--color-black-rgb) / 0.2); }
        .hero-btn { position:absolute; right:8px; top:50%; transform:translateY(-50%); background:var(--color-terracotta-600); color:var(--color-white); border:2px solid var(--color-terracotta-600); border-radius:12px; padding:10px 22px; font-size:15px; font-weight:700; cursor:pointer; font-family:var(--font-urbanist,'Urbanist',sans-serif); white-space:nowrap; transition:background 0.2s,color 0.2s; }
        @media (hover: hover) { .hero-btn:hover { background:var(--color-white); color:var(--color-terracotta-700); } }
        @media (max-width:480px) {
          .hero-input-wrap { display:flex; flex-direction:column; gap:10px; }
          .hero-search { padding:18px 22px; border-radius:14px; }
          .hero-btn { position:static; transform:none; width:100%; padding:16px; border-radius:12px; font-size:15px; border:2px solid var(--color-terracotta-600); }
        }

        .pillar-card-outer { position:relative; border-radius:22px; padding:1.5px; background:linear-gradient(135deg,rgb(var(--color-gold-rgb) / 0.55) 0%,rgb(var(--color-terracotta-rgb) / 0.25) 12%,rgb(var(--color-white-rgb) / 0.04) 28%,transparent 42%,transparent 58%,rgb(var(--color-white-rgb) / 0.04) 72%,rgb(var(--color-terracotta-rgb) / 0.2) 88%,rgb(var(--color-gold-rgb) / 0.45) 100%); transition:transform 0.3s; }
        @media (hover: hover) { .pillar-card-outer:hover { transform:translateY(-4px); } }
        .pillar-card { background:linear-gradient(160deg,color-mix(in srgb, var(--color-navy-mid) 70%, var(--color-navy-dark)) 0%,color-mix(in srgb, var(--color-navy-mid) 30%, var(--color-navy-dark)) 40%,color-mix(in srgb, var(--color-navy-mid) 15%, var(--color-navy-dark)) 100%); border-radius:20px; padding:36px 28px 32px; text-align:center; position:relative; overflow:hidden; display:flex; flex-direction:column; height:100%; box-sizing:border-box; transition:background 0.3s,box-shadow 0.3s; }
        @media (hover: hover) { .pillar-card-outer:hover .pillar-card { background:linear-gradient(160deg,var(--color-navy-mid) 0%,color-mix(in srgb, var(--color-navy-mid) 65%, var(--color-navy-dark)) 40%,color-mix(in srgb, var(--color-navy-mid) 45%, var(--color-navy-dark)) 100%); box-shadow:0 20px 50px rgb(var(--color-black-rgb) / 0.35); } }
        .pillar-link-wrap { margin-top:auto; padding-top:14px; }
        .pillar-icon-wrap { width:68px; height:68px; border-radius:18px; margin:0 auto 22px; display:flex; align-items:center; justify-content:center; position:relative; z-index:1; box-shadow:0 4px 16px rgb(var(--color-black-rgb) / 0.3),inset 0 1px 0 rgb(var(--color-white-rgb) / 0.15); }
        .pillar-icon-wrap.pillar-icon-0 { background:rgb(var(--color-terracotta-rgb) / 0.14)!important; border:1px solid rgb(var(--color-terracotta-rgb) / 0.28); }
        .pillar-icon-wrap.pillar-icon-1 { background:rgb(var(--color-slate-blue-rgb) / 0.14)!important; border:1px solid rgb(var(--color-slate-blue-rgb) / 0.25); }
        .pillar-icon-wrap.pillar-icon-2 { background:rgb(var(--color-success-rgb) / 0.14)!important; border:1px solid rgb(var(--color-success-rgb) / 0.25); }

        .step-card { padding:32px 0; display:grid; grid-template-columns:72px 1fr; gap:20px; align-items:start; }
        .step-card+.step-card { border-top:1px solid rgb(var(--color-white-rgb) / 0.07); }
        .step-number { font-size:clamp(44px,6vw,60px); font-weight:800; line-height:1; color:rgb(var(--color-gold-rgb) / 0.15); font-family:var(--font-urbanist,'Urbanist',sans-serif); user-select:none; }

        /* ── VET CARDS — match Find a Vet page exactly ── */
        .vet-card-outer { border-radius:18px; padding:1.5px; height:100%; background:var(--color-border); transition:transform 0.3s,background 0.25s ease; }
        @media (hover: hover) { .vet-card-outer:hover { transform:translateY(-3px); } }
        @media (hover: hover) { .vet-card-outer:hover .vet-card-inner { box-shadow:0 0 0 1.5px rgb(var(--color-gold-rgb) / 0.9),0 16px 48px rgb(var(--color-navy-dark-rgb) / 0.13); } }
        .vet-card-inner { border-radius:17px; padding:24px; background:var(--color-white); display:flex; flex-direction:column; height:100%; box-sizing:border-box; transition:box-shadow 0.25s; }

        .heart-btn { transition:transform 0.15s; border:none; background:none; cursor:pointer; padding:0; line-height:1; display:inline-flex; align-items:center; justify-content:center; }
        @media (hover: hover) { .heart-btn:hover { transform:scale(1.2); } }
        .heart-animating { animation:heartPop 0.4s ease forwards; }
        /* Pill borders.
           --pill-border-w is the single place to change thickness for every
           pill on this page — badges and price chips together. Set it to 2px
           and they all thicken; nothing else needs touching.
           Each badge keeps a border in its OWN colour rather than a shared
           grey: one neutral outline would flatten navy, green and red into the
           same shape and lose the meaning the colour is carrying. The base
           rule uses a transparent border so the box never changes size between
           variants. */
        .badge { display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:20px;  font-weight:700; white-space:nowrap; border:var(--pill-border-w) solid transparent; }
        .badge-navy    { background:var(--color-badge-navy-bg); color:var(--color-navy-mid); border-color:rgb(var(--color-navy-mid-rgb) / 0.22); }
        .badge-success { background:var(--color-success-light); color:var(--color-success-text); border-color:rgb(var(--color-success-text-rgb) / 0.22); }
        .badge-error   { background:var(--color-error-light); color:var(--color-error-text); border-color:rgb(var(--color-error-rgb) / 0.24); }
        .price-chip { display:inline-flex; align-items:center; gap:5px; background:var(--color-cream); border:var(--pill-border-w) solid var(--color-border); border-radius:8px; padding:4px 10px; font-size:14px; }
        .price-chip-label { color:var(--color-muted); font-weight:600; }
        .price-chip-value { font-weight:700; color:var(--color-terracotta-700); }
        .price-gate-wrap{position:relative}
        .price-gate-wrap.gated{padding:10px 0 20px}
        .price-gate-wrap.gated .price-gate-inner{filter:blur(5px);pointer-events:none;user-select:none;-webkit-transform:translateZ(0);transform:translateZ(0);-webkit-backface-visibility:hidden;backface-visibility:hidden}
        .price-gate-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:2;padding:0 16px}
        .price-gate-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;background:var(--color-navy-dark);color:var(--color-white);border:2px solid var(--color-navy-dark);border-radius:12px;padding:9px 18px;font-size:15px;font-weight:700;font-family:var(--font,'Urbanist',sans-serif);cursor:pointer;text-decoration:none;box-shadow:0 2px 10px rgb(var(--color-navy-dark-rgb) / 0.2);transition:background 0.15s,color 0.15s}
        @media (hover: hover) { .price-gate-btn:hover {background:var(--color-white);color:var(--color-navy-dark);border:2px solid var(--color-navy-dark)} }
        @media(max-width:768px){
          .price-gate-overlay{padding:0 12px}
          .price-gate-btn{width:100%}
        }
        .pillars-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        .vets-grid    { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:20px; align-items:stretch; }
        /* Four teasers are fetched, but the fourth is only shown in the
           two-column tablet band, where three would orphan. Everywhere else
           the row already comes out even at three. */
        .vets-grid > *:nth-child(4) { display:none; }
        /* Pillars go 3-up only when the tracks stay usable. At 901px they
           would be 271px, which forces three-line titles. */
        @media(max-width:1023px){ .pillars-grid{ grid-template-columns:1fr; } }

        /* Illustration that fills the stranded left column of the steps
           section. Hidden on phones, where the column stacks anyway. */
        .steps-art { margin-top: 40px; }
        @media(max-width:640px){ .steps-art { display:none; } }

        /* ── TABLET BAND (660-1023px) ──────────────────────────────
           One column, but the card relayouts horizontally: illustration
           left, title + copy centre, CTA right. Without this the cards
           are full-width blocks with a centred icon over two lines. */
        @media (min-width:660px) and (max-width:1023px) {
          .pillars-grid { grid-template-columns:1fr; gap:16px; }
          .pillar-card {
            display:grid;
            grid-template-columns:auto minmax(0,1fr) auto;
            grid-template-rows:auto auto;
            column-gap:24px;
            row-gap:6px;
            align-items:center;
            text-align:left;
            padding:26px 28px;
          }
          .pillar-card > .pillar-icon-wrap {
            grid-column:1; grid-row:1 / span 2;
            margin:0; width:64px; height:64px; border-radius:17px;
          }
          .pillar-card > h3 {
            grid-column:2; grid-row:1;
            margin-bottom:0 !important;
            font-size:20px !important;
          }
          .pillar-card > p {
            grid-column:2; grid-row:2;
            margin:0 !important;
            max-width:none !important;
            font-size:15px !important;
            line-height:1.6 !important;
          }
          .pillar-card > .pillar-link-wrap {
            grid-column:3; grid-row:1 / span 2;
            margin-top:0; padding-top:0; white-space:nowrap;
          }
          /* Three teasers land 2 + 1 in this band. The section is a teaser
             with "See all vets" directly below it, so drop the orphan. */
          .vets-grid > *:nth-child(4) { display:block; }
          /* 80px between the two step columns costs more than it buys once
             the columns are ~320px. */
          .steps-grid { gap:40px !important; }
        }

        /* Trust stats stack rather than orphaning 2 + 1. */
        @media(max-width:640px){ .trust-grid { grid-template-columns:1fr !important; } }

      .btn-primary {
          height:50px; padding:0 36px; line-height:1;
          background:var(--color-terracotta-600); color:var(--color-white);
          border:2px solid var(--color-terracotta-600); border-radius:12px;
          font-size:15px; font-weight:700; cursor:pointer; text-decoration:none;
          font-family:var(--font-urbanist,'Urbanist',sans-serif);
          display:inline-flex; align-items:center; justify-content:center;
          transition:background 0.25s,color 0.25s;
        }
        @media (hover: hover) { .btn-primary:hover { background:var(--color-white); color:var(--color-terracotta-700); } }
        .btn-outline-dark {
          height:50px; padding:0 36px; line-height:1;
          background:transparent; color:var(--color-navy-dark);
          border:2px solid var(--color-navy-dark); border-radius:12px;
          font-size:15px; font-weight:700; text-decoration:none;
          font-family:var(--font-urbanist,'Urbanist',sans-serif);
          display:inline-flex; align-items:center; justify-content:center;
          transition:background 0.25s,color 0.25s;
        }
        @media (hover: hover) { .btn-outline-dark:hover { background:var(--color-navy-dark); color:var(--color-white); } }

        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        .skeleton { background:linear-gradient(90deg,var(--color-border) 25%,var(--color-border-strong) 50%,var(--color-border) 75%); background-size:200% 100%; animation:shimmer 1.8s infinite; border-radius:18px; }

        @media(max-width:640px){
          .step-card { grid-template-columns:52px 1fr; gap:14px; }
          .step-number { font-size:32px; }
          .steps-grid { grid-template-columns:1fr!important; }
          .btn-cta-group { flex-direction:column!important; align-items:stretch!important; }
          .btn-primary,.btn-outline-dark { width:100%; box-sizing:border-box; height:50px; justify-content:center; }
        }

  /* Widow control. "balance" evens short headings so the last line isn't one
     orphaned word; "pretty" does the same for body copy without re-flowing the
     whole paragraph. Both fall back to normal wrapping where unsupported. */
  h1, h2, h3 { text-wrap: balance; }
  p, li { text-wrap: pretty; }
        /* Sits on the navy steps panel. globals.css has
           ".reveal-up a:hover { color:var(--color-navy-dark) !important }", which made this
           vanish — the fix is at source: that rule now skips .pp-keep-color,
           which this link carries. Gold in every state, matching the gold
           buttons above it. */
        a.pp-steps-learnmore,
        a.pp-steps-learnmore:hover,
        a.pp-steps-learnmore:focus,
        a.pp-steps-learnmore:visited {
          color: var(--color-gold);
        }
      `}</style>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      {homeArt ? (
        <HeroBanner art={homeArt} variant="home">
          <h1 className="hb-h1 anim-2">
            Know what you'll pay before{" "}
            <span style={{ color: "var(--color-gold)" }}>
              your next vet visit.
            </span>
          </h1>
          <p className="hb-lede anim-3">
            PetParrk gives you real vet prices, instant symptom guidance, and a
            health history your pet deserves.
          </p>
          {heroForm("0")}
        </HeroBanner>
      ) : (
      <section
        style={{
          background: "var(--color-navy-dark)",
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
              "radial-gradient(ellipse at center, rgb(var(--color-gold-rgb) / 0.06) 0%, rgb(var(--color-gold-rgb) / 0.04) 28%, rgb(var(--color-gold-rgb) / 0.018) 52%, transparent 76%)",
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
              "linear-gradient(to bottom,transparent,var(--color-navy-dark))",
          }}
        />

        <div
          className="pp-container"
          style={{ position: "relative", zIndex: 1 }}
        >
          <div
            style={{
              maxWidth: "850px",
              margin: "0 auto",
              textAlign: "center",
            }}
          >
            <h1
              className="anim-2"
              style={{
                fontSize: "clamp(40px,7.5vw,72px)",
                fontWeight: "800",
                color: "var(--color-white)",
                lineHeight: "1.03",
                marginBottom: "22px",
                fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
                letterSpacing: "-0.025em",
              }}
            >
              Know what you'll pay before{" "}
              <span style={{ color: "var(--color-gold)" }}>
                your next vet visit.
              </span>
            </h1>

            <p
              className="anim-3"
              style={{
                fontSize: "18px",
                fontWeight: 500,
                color: "rgb(var(--color-white-rgb) / 0.6)",
                lineHeight: "1.75",
                maxWidth: "600px",
                margin: "0 auto 48px",
              }}
            >
              PetParrk gives you real vet prices, instant symptom guidance, and
              a health history your pet deserves.
            </p>

            {heroForm("0 auto")}
          </div>
        </div>
      </section>
      )}

      {/* ── LOGGED-IN DASHBOARD STRIP ────────────────────────────────── */}
      {session ? (
        <HomeDashboard session={session} savedVets={savedVetsList} />
      ) : null}

      {/* ── VET TEASERS ──────────────────────────────────────────────── */}
      <section
        style={{ background: "var(--color-cream)", padding: "96px 0" }}
      >
        <div className="pp-container">
          <div
            ref={vetsRef}
            className={`reveal-up${vetsVisible ? " visible" : ""}`}
            style={{ marginBottom: "44px" }}
          >
            <p
              style={{
                fontSize: "13px",
                fontWeight: "700",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--color-terracotta-700)",
                marginBottom: "10px",
              }}
            >
              {userCoords ? "Vets near you" : "Real data, right now"}
            </p>
            <h2
              style={{
                fontSize: "clamp(26px,3.5vw,40px)",
                fontWeight: "800",
                color: "var(--color-navy-dark)",
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
              {[1, 2, 3, 4].map((i) => (
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
                              color: "var(--color-navy-dark)",
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
                              fontSize: "15px",
                              fontWeight: "500",
                              color: "var(--color-muted)",
                              margin: 0,
                              // letterSpacing: "0.02em",
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
                          <Heart
                            size={22}
                            strokeWidth={2}
                            color="var(--color-terracotta)"
                            fill={isSaved ? "var(--color-terracotta)" : "none"}
                          />
                        </button>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "8px",
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
                            <Check size={12} strokeWidth={2.6} />
                            Accepting
                          </span>
                        )}
                        {vet.accepting_new_patients === false && (
                          <span className="badge badge-error">
                            <X size={12} strokeWidth={2.6} />
                            Not Accepting
                          </span>
                        )}
                      </div>
                      <div
                        className={`price-gate-wrap${!session ? " gated" : ""}`}
                        style={{ marginBottom: "16px" }}
                      >
                        {!session && (
                          <div className="price-gate-overlay">
                            <Link href="/auth" className="price-gate-btn">
                              <Lock size={13} strokeWidth={2.5} />
                              Sign up to see pricing
                            </Link>
                          </div>
                        )}
                        <div
                          className="price-gate-inner"
                          style={{
                            display: "flex",
                            gap: "8px",
                            flexWrap: "wrap",
                          }}
                        >
                          {/* Signed out there is no price data in state, so
                              the blur had nothing to blur and the card
                              collapsed to an empty strip with a button
                              floating in it. These are REDACTED placeholders,
                              not invented prices: a made-up number on a
                              price-transparency site is the one thing we
                              can't ship, blurred or not. aria-hidden so a
                              screen reader gets the sign-up link rather than
                              a row of bullets. */}
                          {!session && (
                            <>
                              <span className="price-chip" aria-hidden="true">
                                <span className="price-chip-label">Exam</span>
                                <span className="price-chip-value">$•••</span>
                              </span>
                              <span className="price-chip" aria-hidden="true">
                                <span className="price-chip-label">Dental</span>
                                <span className="price-chip-value">$•••</span>
                              </span>
                            </>
                          )}
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
                      </div>
                      <div
                        style={{
                          borderTop: "1px solid var(--color-border)",
                          paddingTop: "14px",
                          marginTop: "auto",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: "500",
                            color: "var(--color-muted)",
                            // letterSpacing: "0.02em",
                          }}
                        >
                          {lu
                            ? `Verified ${lu.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
                            : ""}
                        </span>
                        <Link
                          href={`/vet/${vet.slug}`}
                          style={{
                            fontSize: "14px",
                            fontWeight: "700",
                            color: "var(--color-terracotta-700)",
                            textDecoration: "none",
                          }}
                        >
                          View profile{" "}
                          <ArrowRight
                            size={14}
                            strokeWidth={2.4}
                            style={{
                              marginLeft: "4px",
                              verticalAlign: "middle",
                            }}
                          />
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
                color: "var(--color-muted)",
                textAlign: "center",
                padding: "48px 0",
              }}
            >
              No vets to show yet.
            </p>
          )}
          <div
            className={`reveal-up${vetsVisible ? " visible" : ""} reveal-delay-3`}
            style={{ textAlign: "right", marginTop: "28px" }}
          >
            <Link
              href="/vets"
              style={{
                fontSize: "13px",
                fontWeight: "700",
                color: "var(--color-terracotta-700)",
                textDecoration: "none",
              }}
            >
              See all vets{" "}
              <ArrowRight
                size={14}
                strokeWidth={2.4}
                style={{ marginLeft: "4px", verticalAlign: "middle" }}
              />
            </Link>
          </div>
        </div>
      </section>

      {/* ── THREE PILLARS ────────────────────────────────────────────── */}
      <section
        style={{
          background: "var(--color-navy-mid)",
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
              "radial-gradient(rgb(var(--color-white-rgb) / 0.025) 1px,transparent 1px)",
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
                fontSize: "13px",
                fontWeight: "700",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--color-gold)",
                marginBottom: "12px",
              }}
            >
              A platform built around your pet
            </p>
            <h2
              style={{
                fontSize: "clamp(28px,4vw,44px)",
                fontWeight: "800",
                color: "var(--color-white)",
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
            {PILLARS.map((pillar, i) => {
              const Art = pillar.art;
              return (
                <div
                  key={pillar.title}
                  className={`reveal-left${pillarsVisible ? " visible" : ""} reveal-delay-${i + 1}`}
                  style={{ height: "100%" }}
                >
                  <div className="pillar-card-outer" style={{ height: "100%" }}>
                    <div className="pillar-card">
                      <div className={`pillar-icon-wrap pillar-icon-${i}`}>
                        <Art size={44} />
                      </div>
                      <h3
                        style={{
                          fontSize: "22px",
                          fontWeight: "800",
                          color: "var(--color-white)",
                          marginBottom: "12px",
                          fontFamily:
                            "var(--font-urbanist,'Urbanist',sans-serif)",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {pillar.title}
                      </h3>
                      <p
                        className="home-platform-build"
                        style={{
                          fontSize: "16px",
                          fontWeight: 500,
                          color: "rgb(var(--color-white-rgb) / 0.55)",
                          lineHeight: "1.75",
                          /* marginBottom: "28px", */
                          textWrap: "pretty",
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
                            fontSize: "14px",
                            fontWeight: "700",
                            color: "var(--color-gold)",
                            textDecoration: "none",
                          }}
                        >
                          {pillar.cta}{" "}
                          <ArrowRight
                            size={14}
                            strokeWidth={2.4}
                            style={{
                              marginLeft: "4px",
                              verticalAlign: "middle",
                            }}
                          />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section
        style={{
          background: "var(--color-navy-dark)",
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
                  fontSize: "13px",
                  fontWeight: "700",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--color-gold)",
                  marginBottom: "16px",
                }}
              >
                Simple process
              </p>
              <h2
                style={{
                  fontSize: "clamp(28px,4vw,44px)",
                  fontWeight: "800",
                  color: "var(--color-white)",
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
                  fontWeight: 500,
                  color: "rgb(var(--color-white-rgb) / 0.5)",
                  lineHeight: "1.75",
                  marginBottom: "20px",
                }}
              >
                Most pet owners spend hours calling vets, getting vague answers,
                and still feeling unprepared. PetParrk fixes that in three
                steps.
              </p>
              <Link
                href="/how-it-works"
                className="pp-steps-learnmore pp-keep-color"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                  fontWeight: "700",
                  textDecoration: "none",
                }}
              >
                Learn more{" "}
                <ArrowRight
                  size={14}
                  strokeWidth={2.4}
                  style={{ marginLeft: "4px", verticalAlign: "middle" }}
                />
              </Link>
              <div className="steps-art">
                <ArtSteps width={320} />
              </div>
            </div>
            <div>
              {STEPS.map((step, i) => (
                <div
                  key={step.number}
                  className={`step-card reveal-right${stepsVisible ? " visible" : ""} reveal-delay-${i + 1}`}
                >
                  <div aria-hidden="true" className="step-number deco-num" data-num={step.number} />
                  <div style={{ paddingTop: "6px" }}>
                    <h3
                      style={{
                        fontSize: "18px",
                        fontWeight: "800",
                        color: "var(--color-white)",
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
                        fontWeight: 500,
                        color: "rgb(var(--color-white-rgb) / 0.5)",
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
            borderTop: "1px solid rgb(var(--color-white-rgb) / 0.06)",
            paddingTop: "64px",
          }}
        >
          <div
            ref={trustRef}
            className={`pp-container trust-grid reveal-up${trustVisible ? " visible" : ""}`}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: "16px",
              textAlign: "center",
              paddingBottom: "64px",
            }}
          >
            {[
              {
                value: `${vets.length > 0 ? vets.length : "40"}+`,
                label: "Verified vets across California",
              },
              {
                value: "Free",
                label: "Browse and check symptoms, no account needed",
              },
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
                    color: "var(--color-gold)",
                    fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
                    marginBottom: "8px",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 500,
                    color: "rgb(var(--color-white-rgb) / 0.5)",
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
                "linear-gradient(to right,rgb(var(--color-white-rgb) / 0),rgb(var(--color-white-rgb) / 0.2) 20%,rgb(var(--color-white-rgb) / 0.2) 80%,rgb(var(--color-white-rgb) / 0))",
              margin: "0 24px",
            }}
          />
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      {showCTA && (
        <section
          style={{
            background: "var(--color-cream)",
            padding: "104px 0",
          }}
        >
          <div className="pp-container">
            <div
              style={{
                maxWidth: "640px",
                margin: "0 auto",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--color-terracotta-700)",
                  marginBottom: "16px",
                }}
              >
                Get started free
              </p>
              <h2
                style={{
                  fontSize: "clamp(28px,4vw,44px)",
                  fontWeight: "800",
                  color: "var(--color-navy-dark)",
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
                  fontWeight: 500,
                  color: "var(--color-slate)",
                  lineHeight: "1.75",
                  marginBottom: "20px",
                }}
              >
                See what people paid, check symptoms any time, and keep every
                visit, vaccine and note in one place.
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
          </div>
        </section>
      )}
    </>
  );
}
