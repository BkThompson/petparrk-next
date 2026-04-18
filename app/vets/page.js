"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

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
  { label: "All prices", value: "all" },
  { label: "Under $75", value: "under75" },
  { label: "$75–$125", value: "75to125" },
  { label: "$125+", value: "over125" },
  { label: "No Pricing Available", value: "noprice" },
];

function StarField() {
  const dots = React.useMemo(() => {
    const arr = [];
    let s = 42;
    const rand = () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
    for (let i = 0; i < 200; i++) {
      arr.push({
        x: rand() * 100,
        y: rand() * 100,
        r: rand() < 0.2 ? 1.4 : rand() < 0.5 ? 0.9 : 0.5,
        o: 0.05 + rand() * 0.1,
      });
    }
    return arr;
  }, []);
  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 3,
      }}
    >
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={`${d.x}%`}
          cy={`${d.y}%`}
          r={d.r}
          fill="rgba(160,210,240,1)"
          opacity={d.o}
        />
      ))}
    </svg>
  );
}

const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

if (
  typeof document !== "undefined" &&
  !document.getElementById("mbgl-preconnect")
) {
  const link = document.createElement("link");
  link.id = "mbgl-preconnect";
  link.rel = "preconnect";
  link.href = "https://api.mapbox.com";
  document.head.appendChild(link);
}

if (
  typeof window !== "undefined" &&
  !document.getElementById("mbgl-preconnect")
) {
  const l = document.createElement("link");
  l.id = "mbgl-preconnect";
  l.rel = "preconnect";
  l.href = "https://api.mapbox.com";
  document.head.appendChild(l);
}

const BAY_PINS = [
  { lng: -122.035, lat: 37.725, color: "#CF5C36", delay: 400 },
  { lng: -122.156, lat: 37.726, color: "#CF5C36", delay: 750 },
  { lng: -122.082, lat: 37.43, color: "#CF5C36", delay: 1100 },
  { lng: -121.922, lat: 37.699, color: "#EFC88B", delay: 1450 },
  { lng: -121.95, lat: 37.99, color: "#EFC88B", delay: 1800 },
  { lng: -122.434, lat: 37.591, color: "#CF5C36", delay: 2150 },
  { lng: -122.418, lat: 37.686, color: "#EFC88B", delay: 2500 },
  { lng: -122.255, lat: 37.878, color: "#EFC88B", delay: 2850 },
  { lng: -122.223, lat: 37.805, color: "#CF5C36", delay: 3200 },
  { lng: -122.265, lat: 37.532, color: "#EFC88B", delay: 3550 },
  { lng: -122.065, lat: 37.905, color: "#CF5C36", delay: 3900 },
  { lng: -122.232, lat: 37.84, color: "#CF5C36", delay: 4250 },
  { lng: -121.988, lat: 37.51, color: "#EFC88B", delay: 4600 },
  { lng: -122.117, lat: 37.74, color: "#EFC88B", delay: 4950 },
  { lng: -122.02, lat: 37.938, color: "#EFC88B", delay: 5300 },
  { lng: -122.466, lat: 37.952, color: "#EFC88B", delay: 5650 },
  { lng: -122.27, lat: 37.813, color: "#EFC88B", delay: 6000 },
  { lng: -122.447, lat: 37.76, color: "#CF5C36", delay: 6350 },
  { lng: -122.089, lat: 37.668, color: "#EFC88B", delay: 6700 },
  { lng: -121.978, lat: 37.952, color: "#CF5C36", delay: 7050 },
  { lng: -122.432, lat: 37.804, color: "#CF5C36", delay: 7400 },
  { lng: -121.776, lat: 37.682, color: "#CF5C36", delay: 7750 },
  { lng: -122.458, lat: 37.532, color: "#EFC88B", delay: 8100 },
  { lng: -122.355, lat: 37.568, color: "#CF5C36", delay: 8450 },
  { lng: -121.822, lat: 37.7, color: "#EFC88B", delay: 8800 },
  { lng: -122.499, lat: 38.088, color: "#CF5C36", delay: 9150 },
  { lng: -122.416, lat: 37.774, color: "#EFC88B", delay: 9500 },
  { lng: -121.96, lat: 37.67, color: "#CF5C36", delay: 9850 },
];

function MapHeader({ isMobile, onReady }) {
  const mapDivRef = useRef(null);
  const pinDivRef = useRef(null);

  useEffect(() => {
    if (!mapDivRef.current) return;

    if (!document.getElementById("mbgl-css")) {
      const link = document.createElement("link");
      link.id = "mbgl-css";
      link.rel = "stylesheet";
      link.href = "https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css";
      document.head.appendChild(link);
    }

    if (!document.getElementById("mbgl-hide")) {
      const st = document.createElement("style");
      st.id = "mbgl-hide";
      st.textContent =
        ".mapboxgl-ctrl-logo,.mapboxgl-ctrl-attrib{display:none!important}";
      document.head.appendChild(st);
    }

    let map;
    let destroyed = false;
    import("mapbox-gl")
      .then((mod) => {
        const mbgl = mod.default || mod;
        mbgl.accessToken = MAPBOX_TOKEN;

        map = new mbgl.Map({
          container: mapDivRef.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: [-121.5, 37.5],
          zoom: 5.0,
          pitch: 0,
          bearing: 0,
          interactive: false,
          attributionControl: false,
          fadeDuration: 0,
        });

        const FLY_DELAY = 600;
        const FLY_DUR = 4200;

        map.on("load", () => {
          setTimeout(() => {
            map.flyTo({
              center: [-122.4, 37.68],
              zoom: 9.4,
              pitch: 20,
              bearing: -8,
              duration: FLY_DUR,
              essential: true,
              easing: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
            });

            const placedPins = [];

            map.on("resize", () => {
              placedPins.forEach(({ lng, lat, el }) => {
                const pt = map.project([lng, lat]);
                el.style.left = `${pt.x}px`;
                el.style.top = `${pt.y}px`;
              });
            });

            map.once("moveend", () => {
              if (!pinDivRef.current || !map || destroyed) return;
              pinDivRef.current.innerHTML = "";
              placedPins.length = 0;

              const W = pinDivRef.current.clientWidth;
              const H = pinDivRef.current.clientHeight;
              const mb = map.getBounds();

              const visiblePins = BAY_PINS.filter((pin) => {
                const pt = map.project([pin.lng, pin.lat]);
                return (
                  pt.x > 20 &&
                  pt.x < W - 20 &&
                  pt.y > 20 &&
                  pt.y < H - 20 &&
                  pin.lng > mb.getWest() &&
                  pin.lng < mb.getEast() &&
                  pin.lat > mb.getSouth() &&
                  pin.lat < mb.getNorth()
                );
              });

              visiblePins.forEach((pin, idx) => {
                setTimeout(() => {
                  if (!pinDivRef.current || !map || destroyed) return;
                  const pt = map.project([pin.lng, pin.lat]);
                  const tooClose = placedPins.some((p) => {
                    const pp = map.project([p.lng, p.lat]);
                    return Math.hypot(pp.x - pt.x, pp.y - pt.y) < 20;
                  });
                  if (tooClose) return;

                  const el = document.createElement("div");
                  el.style.cssText = `
                  position:absolute;
                  left:${pt.x}px;
                  top:${pt.y}px;
                  transform:translate(-50%,-50%);
                  width:11px; height:11px;
                  border-radius:50%;
                  background:${pin.color};
                  box-shadow:0 0 0 2px rgba(255,255,255,0.80),
                             0 0 10px ${pin.color},
                             0 0 22px ${pin.color}99;
                  animation:mapPinDrop 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards;
                  opacity:0;
                  pointer-events:none;
                `;
                  pinDivRef.current.appendChild(el);
                  placedPins.push({ lng: pin.lng, lat: pin.lat, el });
                }, idx * 350);
              });

              setTimeout(
                () => {
                  onReady?.();
                },
                visiblePins.length * 350 + 600,
              );
            });
          }, FLY_DELAY);
        });
      })
      .catch((e) =>
        console.error("mapbox-gl failed. Run: npm install mapbox-gl", e),
      );

    return () => {
      destroyed = true;
      if (map) {
        map.remove();
        map = null;
      }
      if (pinDivRef.current) pinDivRef.current.innerHTML = "";
    };
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          display: isMobile ? "block" : "none",
        }}
      >
        <img
          src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/-122.28,37.68,9.0,0/1200x340@2x?access_token=${MAPBOX_TOKEN}`}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.3,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(52,130,185,0.20)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right, rgba(6,14,22,0.97) 0%, rgba(6,14,22,0.85) 25%, rgba(6,14,22,0.50) 65%, transparent 100%)",
          }}
        />
      </div>
      <div
        ref={mapDivRef}
        style={{
          position: "absolute",
          inset: 0,
          display: isMobile ? "none" : "block",
          filter: "brightness(1.05) contrast(1.15) saturate(1.2)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(52,130,185,0.18)",
          zIndex: 1,
          pointerEvents: "none",
          display: isMobile ? "none" : "block",
        }}
      />
      <div
        ref={pinDivRef}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
          overflow: "hidden",
          display: isMobile ? "none" : "block",
        }}
      />
    </div>
  );
}

function VetsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [session, setSession] = useState(undefined);
  const [savedVetIds, setSavedVetIds] = useState(new Set());
  const [animatingId, setAnimatingId] = useState(null);
  const [vets, setVets] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [neighborhood, setNeighborhood] = useState("All");
  const [acceptingFilter, setAcceptingFilter] = useState("All");
  const [priceRange, setPriceRange] = useState("all");
  const [sortBy, setSortBy] = useState("price");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [ownership, setOwnership] = useState("All");
  const [vetTypeFilter, setVetTypeFilter] = useState("All");
  const [visibleCount, setVisibleCount] = useState(20);
  const [isMobile, setIsMobile] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const loaderRef = useRef(null);

  const handleZoomComplete = useCallback(() => setMapVisible(true), []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (e) => {
        if (e[0].isIntersecting) setVisibleCount((p) => p + 20);
      },
      { threshold: 0.1 },
    );
    if (loaderRef.current) obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [loading]); // ← fixed: was [], now [loading] so observer attaches after data loads

  useEffect(() => {
    setVisibleCount(20);
  }, [
    search,
    neighborhood,
    acceptingFilter,
    priceRange,
    sortBy,
    ownership,
    vetTypeFilter,
  ]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchData() {
      const { data: vd } = await supabase
        .from("vets")
        .select("*")
        .eq("status", "active")
        .order("name");
      const { data: pd } = await supabase
        .from("vet_prices")
        .select("*, services(name)");
      const pm = {};
      pd?.forEach((p) => {
        if (!pm[p.vet_id]) pm[p.vet_id] = [];
        pm[p.vet_id].push(p);
      });
      setVets(vd || []);
      setPrices(pm);
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

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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
    // ── FIX: neighborhood filter now uses composite neighborhood||city key ──
    .filter((v) => {
      if (neighborhood === "All") return true;
      const [hood, city] = neighborhood.split("||");
      return v.neighborhood === hood && v.city === city;
    })
    .filter((v) => ownership === "All" || v.ownership === ownership)
    .filter((v) => {
      if (vetTypeFilter === "All") return true;
      return (Array.isArray(v.vet_type) ? v.vet_type : [v.vet_type])
        .filter((t) => t && typeof t === "string")
        .map((t) => t.trim())
        .includes(vetTypeFilter);
    })
    .filter((v) => {
      if (acceptingFilter === "All") return true;
      if (acceptingFilter === "Yes") return v.accepting_new_patients === true;
      return v.accepting_new_patients === false;
    })
    .filter((v) => {
      if (priceRange === "all") return true;
      const ep =
        prices[v.id]?.find((p) => p.services?.name === "Doctor Exam")
          ?.price_low ?? null;
      if (priceRange === "noprice")
        return !prices[v.id] || prices[v.id].length === 0;
      if (ep === null) return false;
      if (priceRange === "under75") return ep < 75;
      if (priceRange === "75to125") return ep >= 75 && ep <= 125;
      return ep > 125;
    })
    .filter(
      (v) =>
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        (v.neighborhood || "").toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      if (sortBy === "az") return a.name.localeCompare(b.name);
      const ae =
        prices[a.id]?.find((p) => p.services?.name === "Doctor Exam")
          ?.price_low ?? null;
      const be =
        prices[b.id]?.find((p) => p.services?.name === "Doctor Exam")
          ?.price_low ?? null;
      if (ae === null && be === null) return 0;
      if (ae === null) return 1;
      if (be === null) return -1;
      return ae - be;
    });

  return (
    <>
      <style>{`
        @keyframes heartPop{0%{transform:scale(1)}40%{transform:scale(1.5)}70%{transform:scale(0.85)}100%{transform:scale(1)}}
        @keyframes mapPinDrop{0%{transform:translateY(-50px) scale(0.3);opacity:0}60%{transform:translateY(5px) scale(1.15);opacity:1}80%{transform:translateY(-3px) scale(0.95)}100%{transform:translateY(0) scale(1);opacity:1}}
        .heart-btn{transition:transform 0.1s;border:none;background:none;cursor:pointer;padding:0;font-size:20px;line-height:1}
        .heart-btn:hover{transform:scale(1.15)}
        .heart-animating{animation:heartPop 0.4s ease forwards}
        .vet-card{border-radius:16px;padding:20px;background:#fff;transition:box-shadow 0.25s,transform 0.25s;box-shadow:0 2px 12px rgba(23,37,49,0.07);border:1px solid #EDE8E0;position:relative}
        .vet-card-outer{border-radius:18px;padding:1.5px;height:100%;background:#EDE8E0;transition:transform 0.3s,background 0.25s ease}
        .vet-card-outer:hover{background:#EDE8E0;transform:translateY(-3px)}
        .vet-card-outer:hover .vet-card{box-shadow:0 0 0 1.5px rgba(239,200,139,0.9),0 16px 48px rgba(23,37,49,0.13)}
        .vet-card{border-radius:17px!important;display:flex!important;flex-direction:column!important;height:100%!important;box-sizing:border-box!important}
        .filter-pill{padding:8px 16px;border-radius:20px;border:1px solid #EDE8E0;background:#fff;color:#1A1A1A;cursor:pointer;font-size:13px;font-weight:500;font-family:var(--font,'Urbanist',sans-serif);transition:all 0.15s;white-space:nowrap}
        .filter-pill:hover{border-color:#172531}
        .filter-pill.active{background:#172531;color:#fff;border-color:#172531}
        .pp-select{padding:8px 36px 8px 14px;border-radius:10px;border:1px solid #EDE8E0;font-size:14px;font-family:var(--font,'Urbanist',sans-serif);background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239CA3AF' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 12px center;color:#1A1A1A;outline:none;cursor:pointer;height:38px;appearance:none;-webkit-appearance:none}
        .pp-select:focus{border-color:#CF5C36}
        .dir-search{width:100%;padding:12px 16px;border-radius:10px;border:1.5px solid #EDE8E0;font-size:15px;outline:none;box-sizing:border-box;font-family:var(--font,'Urbanist',sans-serif);background:#fff;transition:border-color 0.15s}
        .dir-search:focus{border-color:#CF5C36}
        .badge{display:inline-flex;align-items:center;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;white-space:nowrap}
        .badge-navy{background:#EBF0F5;color:#2C4657}
        .badge-success{background:#EDFAF3;color:#1A6641}
        .badge-error{background:#FCEAEA;color:#C94040}
        .badge-terra{background:#FEF3EB;color:#8B3A1E}
        .price-chip{display:inline-flex;align-items:center;gap:5px;background:#F5F0E8;border-radius:8px;padding:4px 10px;font-size:13px}
        .price-chip-label{color:#717A86;font-weight:500}
        .price-chip-value{color:#CF5C36;font-weight:700}
        .more-filters{overflow:hidden;max-height:0;opacity:0;transition:max-height 0.5s ease-in-out,opacity 0.5s ease-in-out}
        .more-filters.open{max-height:500px;opacity:1}
        .more-filters-inner{display:flex;flex-wrap:wrap;gap:16px;align-items:center}
        .filter-group{display:flex;align-items:center;gap:8px;line-height:1}
        .filter-group-label{font-size:11px;font-weight:700;color:#717A86;text-transform:uppercase;letter-spacing:0.08em;white-space:nowrap;display:flex;align-items:center;padding-top:2px}
        @media(max-width:768px){
          .vets-header{min-height:368px!important;height:368px!important;padding:80px 0 88px!important}
          .sort-label{display:none!important}
          .filter-group{flex-direction:column!important;align-items:flex-start!important;gap:6px!important}
          .filter-group .filter-pill{width:100%;text-align:center;box-sizing:border-box}
          .more-filters-inner{gap:20px!important}
          .ownership-pills{flex-direction:column!important;width:100%!important}
          .ownership-pills .filter-pill{width:100%!important;text-align:center!important;box-sizing:border-box!important}
          .more-filters-inner .filter-group{width:100%!important}
          .more-filters-inner .filter-group>div{width:100%!important;flex-direction:column!important}
          .more-filters-inner .filter-group .filter-pill{width:100%!important;text-align:center!important;box-sizing:border-box!important}
          .more-filters-inner .pp-select{width:100%!important;box-sizing:border-box!important}
          .filters-row{flex-direction:column!important;align-items:stretch!important}
          .filters-row .pp-select,.filters-row .dir-search{width:100%!important;max-width:100%!important;box-sizing:border-box}
          .filters-row .filter-pill{flex:1;text-align:center}
          .more-filters-inner{flex-direction:column;align-items:flex-start}
        }
      `}</style>

      <div style={{ background: "#F5F0E8", minHeight: "calc(100vh - 64px)" }}>
        <div
          className="vets-header"
          style={{
            background: "#172531",
            padding: "80px 0 88px",
            minHeight: "393px",
            position: "relative",
            overflow: "hidden",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            boxSizing: "border-box",
          }}
        >
          <MapHeader isMobile={isMobile} onReady={handleZoomComplete} />
          <StarField />
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 2,
              background:
                "linear-gradient(to right, rgba(6,14,22,0.97) 0%, rgba(6,14,22,0.90) 18%, rgba(6,14,22,0.55) 34%, rgba(6,14,22,0.10) 48%, transparent 58%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 2,
              background:
                "linear-gradient(to bottom, rgba(6,14,22,0.35) 0%, transparent 22%, transparent 78%, rgba(6,14,22,0.35) 100%)",
            }}
          />

          <div
            style={{
              maxWidth: "1280px",
              margin: "0 auto",
              padding: "0 24px",
              position: "relative",
              zIndex: 4,
            }}
          >
            <p
              style={{
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#EFC88B",
                marginBottom: "12px",
              }}
            >
              San Francisco Bay Area
            </p>
            <h1
              style={{
                fontSize: "clamp(30px,5.5vw,56px)",
                fontWeight: "800",
                color: "#fff",
                fontFamily: "var(--font,'Urbanist',sans-serif)",
                marginBottom: "16px",
                letterSpacing: "-0.025em",
                lineHeight: "1.05",
              }}
            >
              Find a Vet
            </h1>
            <p
              style={{
                fontSize: "17px",
                color: "rgba(255,255,255,0.65)",
                margin: 0,
                lineHeight: "1.75",
                maxWidth: "380px",
              }}
            >
              {loading
                ? "Loading…"
                : `${vets.length} verified vets across the Bay Area`}
            </p>
          </div>
        </div>

        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "32px 24px 80px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "20px",
              marginBottom: "20px",
              border: "1px solid #EDE8E0",
              boxShadow: "0 2px 8px rgba(23,37,49,0.05)",
            }}
          >
            <div
              className="filters-row"
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <input
                type="text"
                className="dir-search"
                placeholder="Search by vet name or neighborhood..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  flex: "1",
                  minWidth: "180px",
                  maxWidth: "400px",
                  height: "38px",
                  boxSizing: "border-box",
                }}
              />

              {/* ── FIX: neighborhood dropdown uses neighborhood||city composite value ── */}
              <select
                className="pp-select"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
              >
                <option value="All">All Neighborhoods</option>
                {Object.entries(
                  vets.reduce((acc, v) => {
                    if (!v.neighborhood || !v.city) return acc;
                    if (!acc[v.city]) acc[v.city] = new Set();
                    acc[v.city].add(v.neighborhood);
                    return acc;
                  }, {}),
                )
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([city, hoods]) => (
                    <optgroup key={city} label={city}>
                      {[...hoods].sort().map((h) => (
                        <option key={h} value={`${h}||${city}`}>
                          {h}
                        </option>
                      ))}
                    </optgroup>
                  ))}
              </select>

              {[
                { label: "Accepting Patients", value: "Yes" },
                { label: "All Vets", value: "All" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAcceptingFilter(opt.value)}
                  className={`filter-pill${acceptingFilter === opt.value ? " active" : ""}`}
                >
                  {opt.label}
                </button>
              ))}
              <span
                className="sort-label"
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#717A86",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  alignSelf: "center",
                  lineHeight: "1",
                  paddingBottom: "1px",
                }}
              >
                Sort:
              </span>
              {[
                ["price", "Cheapest"],
                ["az", "A–Z"],
              ].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setSortBy(val)}
                  className={`filter-pill${sortBy === val ? " active" : ""}`}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => setShowMoreFilters(!showMoreFilters)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "20px",
                  border: "1px solid #EDE8E0",
                  background: showMoreFilters ? "#f0f0f0" : "#fff",
                  color: "#555",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                  fontFamily: "var(--font,'Urbanist',sans-serif)",
                  whiteSpace: "nowrap",
                  minWidth: "130px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                {showMoreFilters ? "Fewer" : "More filters"}
                <span
                  style={{
                    fontSize: "10px",
                    display: "inline-block",
                    transform: showMoreFilters
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.5s ease-in-out",
                  }}
                >
                  ▼
                </span>
              </button>
            </div>

            <div className={`more-filters${showMoreFilters ? " open" : ""}`}>
              <div
                style={{
                  paddingTop: "16px",
                  marginTop: "16px",
                  borderTop: "1px solid #EDE8E0",
                }}
              >
                <div className="more-filters-inner">
                  <div className="filter-group">
                    <span className="filter-group-label">Price</span>
                    <div
                      style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                    >
                      {PRICE_RANGES.map((r) => (
                        <button
                          key={r.value}
                          onClick={() => setPriceRange(r.value)}
                          className={`filter-pill${priceRange === r.value ? " active" : ""}`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="filter-group">
                    <span className="filter-group-label">Ownership</span>
                    <select
                      className="pp-select"
                      value={ownership}
                      onChange={(e) => setOwnership(e.target.value)}
                    >
                      {["All", "Independent", "Corporate", "Other"].map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  {vetTypes.length > 2 && (
                    <div className="filter-group">
                      <span className="filter-group-label">Type</span>
                      <select
                        className="pp-select"
                        value={vetTypeFilter}
                        onChange={(e) => setVetTypeFilter(e.target.value)}
                      >
                        {vetTypes.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <p
            style={{ color: "#717A86", fontSize: "14px", marginBottom: "16px" }}
          >
            {loading
              ? "Loading…"
              : `${filtered.length} vet${filtered.length !== 1 ? "s" : ""} found`}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))",
              gap: "20px",
              alignItems: "stretch",
            }}
          >
            {filtered.slice(0, visibleCount).map((vet) => {
              const vp = prices[vet.id] || [];
              const exam = vp.find(
                (p) => p.services?.name === "Doctor Exam" && p.price_low,
              );
              const dental = vp.find(
                (p) => p.services?.name === "Dental Cleaning" && p.price_low,
              );
              const spay = vp.find(
                (p) => p.services?.name === "Spay (~40lb dog)" && p.price_low,
              );
              const neuter = vp.find(
                (p) => p.services?.name === "Neuter (~40lb dog)" && p.price_low,
              );
              const lu = vet.last_verified
                ? new Date(vet.last_verified + "T12:00:00")
                : vp.length > 0
                  ? new Date(Math.max(...vp.map((p) => new Date(p.created_at))))
                  : null;
              const isSaved = savedVetIds.has(vet.id);
              return (
                <div key={vet.id} className="vet-card-outer">
                  <div className="vet-card">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "8px",
                      }}
                    >
                      <div style={{ flex: 1, paddingRight: "12px" }}>
                        <Link
                          href={`/vet/${vet.slug}`}
                          style={{
                            fontSize: "16px",
                            fontWeight: "700",
                            color: "#172531",
                            textDecoration: "none",
                            fontFamily: "var(--font,'Urbanist',sans-serif)",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {vet.name}
                        </Link>
                        <p
                          style={{
                            fontSize: "14px",
                            color: "#717A86",
                            margin: "2px 0 0",
                          }}
                        >
                          {[vet.neighborhood, vet.city]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <button
                        onClick={(e) => toggleSave(e, vet.id)}
                        className={`heart-btn${animatingId === vet.id ? " heart-animating" : ""}`}
                      >
                        {isSaved ? "❤️" : "🤍"}
                      </button>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                        marginBottom: "10px",
                      }}
                    >
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
                        <span className="badge badge-terra">
                          {vet.ownership}
                        </span>
                      )}
                    </div>
                    {vet.phone && (
                      <p
                        style={{
                          fontSize: "14px",
                          color: "#4B5563",
                          marginBottom: "4px",
                        }}
                      >
                        <a
                          href={`tel:${vet.phone}`}
                          style={{ color: "inherit", textDecoration: "none" }}
                        >
                          {formatPhone(vet.phone)}
                        </a>
                      </p>
                    )}
                    {!exam && !dental && !spay && !neuter ? (
                      <p
                        style={{
                          fontSize: "13px",
                          color: "#717A86",
                          fontStyle: "italic",
                          margin: "10px 0 0",
                        }}
                      >
                        No pricing available
                      </p>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          marginTop: "10px",
                          marginBottom: "14px",
                          flexWrap: "wrap",
                          minHeight: "32px",
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
                        {spay && (
                          <span className="price-chip">
                            <span className="price-chip-label">Spay</span>
                            <span className="price-chip-value">
                              {formatPrice(
                                spay.price_low,
                                spay.price_high,
                                spay.price_type,
                              )}
                            </span>
                          </span>
                        )}
                        {neuter && (
                          <span className="price-chip">
                            <span className="price-chip-label">Neuter</span>
                            <span className="price-chip-value">
                              {formatPrice(
                                neuter.price_low,
                                neuter.price_high,
                                neuter.price_type,
                              )}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "auto",
                        paddingTop: "14px",
                        borderTop: "1px solid #EDE8E0",
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

          {visibleCount < filtered.length && (
            <div
              ref={loaderRef}
              style={{
                textAlign: "center",
                padding: "32px",
                color: "#717A86",
                fontSize: "14px",
              }}
            >
              Loading more vets…
            </div>
          )}
          {visibleCount >= filtered.length &&
            filtered.length > 0 &&
            !loading && (
              <div
                style={{
                  textAlign: "center",
                  padding: "24px",
                  color: "#717A86",
                  fontSize: "13px",
                }}
              >
                All {filtered.length} vets shown
              </div>
            )}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <p style={{ fontSize: "32px", margin: "0 0 12px" }}>🔍</p>
              <p
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#172531",
                  margin: "0 0 8px",
                }}
              >
                No vets found
              </p>
              <p style={{ fontSize: "14px", color: "#717A86", margin: 0 }}>
                Try adjusting your filters
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function VetsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "40px", textAlign: "center", color: "#717A86" }}>
          Loading…
        </div>
      }
    >
      <VetsContent />
    </Suspense>
  );
}
