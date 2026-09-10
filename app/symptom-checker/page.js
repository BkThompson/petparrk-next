"use client";

import {
  ArtPickArea,
  ArtHowLong,
  ArtSeverity,
} from "../../components/BrandArt";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import {
  Dog,
  Cat,
  Bird,
  Rabbit,
  Fish,
  PawPrint,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import PageLoader from "../../components/PageLoader";

// ── Species + age helpers (matches profile page logic) ──────────────────
const BANNER_LUCIDE = {
  dog: Dog,
  cat: Cat,
  bird: Bird,
  small_furry: Rabbit,
  reptile_fish: Fish,
};

function speciesBucket(species) {
  if (!species) return null;
  const s = String(species).toLowerCase().trim();
  if (s.startsWith("dog")) return "dog";
  if (s.startsWith("cat")) return "cat";
  if (s.startsWith("bird")) return "bird";
  if (
    s.startsWith("rabbit") ||
    s.startsWith("hamster") ||
    s.startsWith("guinea") ||
    s.startsWith("ferret") ||
    s.startsWith("otter") ||
    s.startsWith("rat") ||
    s.startsWith("mouse")
  )
    return "small_furry";
  if (
    s.startsWith("reptile") ||
    s.startsWith("fish") ||
    s.startsWith("snake") ||
    s.startsWith("lizard") ||
    s.startsWith("turtle") ||
    s.startsWith("frog") ||
    s.startsWith("gecko")
  )
    return "reptile_fish";
  return null;
}

function formatAge(birthday) {
  if (!birthday) return null;
  const birthMs = new Date(birthday).getTime();
  if (isNaN(birthMs)) return null;
  const diffMs = Date.now() - birthMs;
  if (diffMs < 0) return "Not born yet";
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 7) return days <= 1 ? "1 day" : `${days} days`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return w === 1 ? "1 week" : `${w} weeks`;
  }
  const months = Math.floor(days / 30.44);
  if (months < 24) return months === 1 ? "1 month" : `${months} months`;
  const years = Math.floor(days / 365.25);
  return years === 1 ? "1 year" : `${years} years`;
}

const SESSION_KEY = "petparrk_symptom_session";
const C = {
  navyDark: "#172531",
  navyMid: "#2C4657",
  terracotta: "#CF5C36",
  gold: "#EFC88B",
  cream: "#F5F0E8",
  white: "#FFFFFF",
  ink: "#1A1A1A",
  slate: "#4B5563",
  muted: "#717A86",
  border: "#EDE8E0",
  success: "#2A7D4F",
  error: "#C94040",
};

export default function SymptomCheckerHomePage() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [pets, setPets] = useState([]);
  const [resumeData, setResumeData] = useState(null);
  const [guestPet, setGuestPet] = useState({ species: "", breed: "", age: "" });
  const [lastChecks, setLastChecks] = useState({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("pets")
      .select("*")
      .eq("owner_id", session.user.id)
      .order("created_at")
      .then(async ({ data: petsData }) => {
        setPets(petsData || []);
        if (petsData?.length) {
          const checks = await Promise.all(
            petsData.map((pet) =>
              supabase
                .from("symptom_checks")
                .select("triage_result, created_at, differentials, transcript")
                .eq("pet_id", pet.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .then(({ data }) => ({
                  petId: pet.id,
                  check: data?.[0] || null,
                })),
            ),
          );
          const map = {};
          checks.forEach(({ petId, check }) => {
            if (check) map[petId] = check;
          });
          setLastChecks(map);
        }
      });
  }, [session]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          !parsed.autoStart &&
          parsed.messages?.length > 0 &&
          parsed.selectedPet &&
          !parsed.triageResult
        ) {
          setResumeData(parsed);
        }
      }
    } catch (e) {}
  }, []);

  function startNewCheck(pet) {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          selectedPet: pet,
          messages: [],
          triageResult: null,
          differentials: [],
          guestMode: false,
          freeCheckUsed: false,
          autoStart: true,
        }),
      );
    } catch (e) {}
    router.push("/symptom-checker/chat");
  }
  function resumeSession() {
    router.push("/symptom-checker/chat");
  }
  function startGuestCheck() {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          selectedPet: null,
          messages: [],
          triageResult: null,
          differentials: [],
          guestMode: true,
          guestPet,
          freeCheckUsed: false,
          autoStart: true,
        }),
      );
    } catch (e) {}
    router.push("/symptom-checker/chat");
  }

  if (session === undefined)
    return <PageLoader message="Loading symptom checker…" />;

  return (
    <>
      <style>{`
        /* ── Chrome corner card — terracotta-dominant chrome, white interior ── */
        .sc-step-outer {
          position: relative; border-radius: 16px; padding: 0; height: 100%;
          border: 1px solid ${C.border};
          background: #fff;
          transition: transform 0.3s ease, border-color 0.2s, box-shadow 0.2s;
        }
        
        .sc-step-inner {
          border-radius: 15px; padding: 36px 28px; text-align: center;
          background: #ffffff;
          height: 100%; box-sizing: border-box; position: relative; overflow: hidden;
          transition: box-shadow 0.3s;
        }
        .sc-step-outer:hover .sc-step-inner {
          box-shadow: none;
        }
















        .sc-pet-card { 
          border:1px solid ${C.border}; 
          border-radius:14px; 
          padding:20px 24px; 
          display:flex; 
          align-items:center; 
          gap:16px; 
          transition:background 0.15s; 
          background:${C.white}; 
          position:relative; 
          }
        .sc-pet-card::before { content:""; position:absolute; left:0; top:0; bottom:0; width:3px; background:${C.terracotta}; opacity:0; transition:opacity 0.15s; border-radius:0 2px 2px 0; }

        /* Avatar - base styles shared by both; width/height owned by variant classes */
        /* Navy surface with a white species icon, matching the photo
           placeholders on Profile and Pet Card — same state, same pet,
           so it should read the same wherever it appears. */
        .sc-avatar { border-radius:50%; background:linear-gradient(135deg,#2C4657 0%,#172531 100%); align-items:center; justify-content:center; overflow:hidden; flex-shrink:0; border:2px solid ${C.border}; color:rgba(255,255,255,0.9); }
        .sc-avatar img { width:100%; height:100%; object-fit:cover; }
        .sc-avatar-desktop { display:flex; width:78px; height:78px; }
        .sc-avatar-mobile { display:none; }
        
















        /* Vertical divider desktop — inset */
        .sc-vdiv { width:1px; background:${C.border}; align-self:stretch; margin:4px 0; flex-shrink:0; }
















        /* Stats desktop */
        .sc-stats { display:flex; flex-direction:column; gap:4px; flex-shrink:0; min-width:130px; padding-left:4px; }
        .sc-stat { display:flex; align-items:baseline; gap:4px; }
        .sc-stat-label { font-size:16px; font-weight:500; color:${C.muted}; min-width: 53px;}
        .sc-stat-value { font-size:16px; font-weight:600; color:${C.navyDark}; }
















        /* Mobile-only lastcheck row wrapper (hidden on desktop, lastcheck renders inline in name col) */
        .sc-lastcheck-row { display:none; }
        .sc-lastcheck-inline { display:inline-flex; }

        /* Mobile stats — hidden on desktop */
        .sc-mob-stats { display:none; }
        .sc-top-row { display:contents; } /* transparent on desktop, becomes flex on mobile */








        /* Chevron — start new check */
        .sc-chevron { background:none; border:none; cursor:pointer; min-height:44px; min-width:44px; justify-content:center; padding:0 0 0 12px; color:${C.terracotta}; display:flex; align-items:center; flex-shrink:0; line-height:1; transition:color 0.2s, transform 0.2s; }
        .sc-chevron:hover { color:#a8471d; transform:translateX(4px); }
        .sc-lastcheck:hover { color:#a8471d !important; }
















        @media(max-width:600px) {
          .sc-resume-card { flex-direction:column; align-items:stretch !important; }
          .sc-resume-card .sc-resume-btn { width:100%; justify-content:center; }
          .sc-pet-card { 
            display:grid; 
            grid-template-columns:1fr auto; 
            grid-template-rows:auto auto auto; 
            padding:20px 24px 20px 24px; 
            align-items:center; 
            gap: 0; 
            }
          .sc-lastcheck-row { 
          display:flex; 
          grid-column:1 / span 2; 
          padding-top:5px; 
          // padding-bottom:10px;
          /* Indent to align with the name/breed text (avatar 52 + gap 16). */
          padding-left:78px;
          }
          .sc-lastcheck-inline { display:none !important; }
          .sc-vdiv { display:none; }
          .sc-stats { display:none; }
          .sc-chevron { grid-column:2; grid-row:1; align-self:center; padding:0 0 0 8px; }
          .sc-top-row { display:flex; align-items:flex-start; gap:16px; grid-column:1; }
          .sc-avatar-desktop { display:none; }
          .sc-avatar-mobile { display:flex; width:60px; height:60px; margin-top: 5px; }
          .sc-mob-stats { display:flex; gap:20px; grid-column:1 / span 2; padding-top:10px; margin-top:10px; border-top:1px solid ${C.border}; justify-content:space-between; padding-left:4px; padding-right:4px; }
        .sc-mob-stats .sc-stat { flex:0 0 auto; display:flex; flex-direction:column; align-items:flex-start; }
        .sc-mob-stats .sc-stat-label { font-size:16px; font-weight:500; text-transform:capitalize; color:${C.muted}; white-space:nowrap; }
        .sc-mob-stats .sc-stat-value { font-size:16px; font-weight:600; color:${C.navyDark}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        }
        .sc-input { width:100%; padding:11px 14px; border-radius:10px; border:1.5px solid ${C.border}; font-size:16px; font-weight:500; font-family:var(--font-urbanist,system-ui); background:#fff; outline:none; box-sizing:border-box; transition:border-color 0.15s; color:${C.navyDark}; -webkit-appearance:none; }
        .sc-input:focus { border-color:${C.terracotta}; }
        .sc-input::placeholder { color:${C.muted}; }
        .sc-resume-btn { padding:10px 20px; height:44px; background:${C.terracotta}; color:#fff; border:2px solid ${C.terracotta}; border-radius:10px; font-size:14px; cursor:pointer; font-weight:700; white-space:nowrap; font-family:var(--font-urbanist,system-ui); transition:background 0.2s,color 0.2s; display:inline-flex; align-items:center; }
        .sc-resume-btn:hover { background:#fff; color:${C.terracotta}; }
        .sc-btn-primary { height:44px; padding:0 28px; background:${C.terracotta}; color:#fff; border:2px solid ${C.terracotta}; border-radius:12px; font-size:15px; cursor:pointer; font-weight:700; font-family:var(--font-urbanist,system-ui); transition:background 0.2s; display:inline-flex; align-items:center; justify-content:center; text-decoration:none; }
        .sc-btn-primary:hover { background:${C.white}; color:${C.terracotta}; border:2px solid ${C.terracotta}; }
        .sc-btn-primary:disabled { opacity:0.4; cursor:not-allowed; }
        .sc-btn-outline { height:48px; padding:0 28px; background:transparent; color:${C.navyDark}; border:2px solid ${C.navyDark}; border-radius:12px; font-size:15px; cursor:pointer; font-weight:700; font-family:var(--font-urbanist,system-ui); text-decoration:none; display:inline-flex; align-items:center; justify-content:center; transition:background 0.2s,color 0.2s; }
        .sc-btn-outline:hover { background:${C.navyDark}; color:#fff; }
















        .sc-header { min-height:393px; height:393px; overflow:hidden; }
        @media(max-width:768px) {
          .sc-header { min-height:368px !important; height:368px !important; }
          .sc-steps-grid { grid-template-columns:1fr !important; }
          .sc-guest-grid { grid-template-columns:1fr !important; }
          .sc-btn-primary,.sc-btn-outline { width:100%; box-sizing:border-box; }
          .sc-btn-row { flex-direction:column !important; }
          .sc-hiw_cards {
            margin: 0 auto !important;
            max-width: 88%;
            }
        }
















        .sch-arrow-link { display: inline-flex; align-items: center; gap: 4px; font-weight: 700; text-decoration: none; transition: gap 0.2s ease; }
        .sch-arrow-link:hover { gap: 8px; }
        .sch-arrow-link .arr-icon { display: inline-block; transition: transform 0.2s ease; }
        .sch-arrow-link:hover .arr-icon { transform: translateX(3px); }
















      `}</style>

      {/* ── HEADER: concentric ring texture + centered warm glow ──
           Rings suggest scanning/monitoring — thematically right for symptom checker
           Different from vet slug maze (rectilinear). Same glow technique, centered.
      ── */}
      <div
        className="sc-header"
        style={{
          background: C.navyDark,
          padding: "80px 0 88px",
          position: "relative",
          overflow: "hidden",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          boxSizing: "border-box",
        }}
      >
        {/* Crosshatch texture — fine diagonal lines at +45° and -45°, premium and geometric */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 0,
          }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="hatch45"
              x="0"
              y="0"
              width="28"
              height="28"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="28"
                stroke="rgba(180,210,255,0.09)"
                strokeWidth="1"
              />
            </pattern>
            <pattern
              id="hatch315"
              x="0"
              y="0"
              width="28"
              height="28"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="28"
                stroke="rgba(180,210,255,0.07)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hatch45)" />
          <rect width="100%" height="100%" fill="url(#hatch315)" />
        </svg>

        {/* Center glow — matches HIW/Contact style: dark vignette, no gold */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse 75% 85% at 50% 50%, rgba(44,70,87,0.5) 0%, rgba(23,37,49,0) 45%, rgba(10,18,26,0.6) 80%, rgba(6,12,18,0.85) 100%)",
          }}
        />

        {/* Edge vignettes */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse 72% 80% at 50% 50%, rgba(28,48,65,0.15) 0%, rgba(8,16,24,0.75) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            pointerEvents: "none",
            background:
              "linear-gradient(to right, rgba(6,12,20,0.65) 0%, transparent 28%, transparent 72%, rgba(6,12,20,0.65) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            pointerEvents: "none",
            background:
              "linear-gradient(to bottom, rgba(6,12,20,0.5) 0%, transparent 32%)",
          }}
        />

        <div
          className="pp-container"
          style={{ position: "relative", zIndex: 3 }}
        >
          <div style={{ height: "31px" }} />
          <p
            style={{
              fontSize: "13px",
              fontWeight: "700",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: C.gold,
              marginBottom: "12px",
            }}
          >
            AI Triage
          </p>
          <h1
            style={{
              fontSize: "clamp(30px,5.5vw,56px)",
              fontWeight: "800",
              color: "#fff",
              fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
              letterSpacing: "-0.025em",
              lineHeight: "1.05",
              margin: "0 0 14px",
            }}
          >
            Symptom Checker
          </h1>
          <p
            style={{
              fontSize: "17px",
              fontWeight: 500,
              color: "rgba(255,255,255,0.65)",
              margin: 0,
              lineHeight: "1.75",
              maxWidth: "440px",
            }}
          >
            Describe what you're seeing. Get instant triage guidance — free,
            24/7.
          </p>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ background: C.cream }}>
        <div
          className="pp-container"
          style={{
            paddingTop: "56px",
            paddingBottom: "80px",
            boxSizing: "border-box",
          }}
        >
          <div className="pp-container-text">
            {/* ── HOW IT WORKS ── */}
            <div style={{ marginBottom: "48px" }}>
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.10em",
                  color: C.muted,
                  margin: "0 0 24px",
                }}
              >
                How it works
              </p>
              <div
                className="sc-steps-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "20px",
                  alignItems: "stretch",
                }}
              >
                {[
                  {
                    icon: ArtPickArea,
                    step: "01",
                    title: "Pick the area",
                    body: "Tell us what part of your pet's body or behavior has changed.",
                  },
                  {
                    icon: ArtHowLong,
                    step: "02",
                    title: "How long",
                    body: "Let us know when it started — minutes ago or days.",
                  },
                  {
                    icon: ArtSeverity,
                    step: "03",
                    title: "Severity",
                    body: "Rate how serious it seems. You know your pet best.",
                  },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.step} className="sc-step-outer">
                      <div className="sc-step-inner">
                        {/* Number watermark — faint terracotta on white */}
                        <div
                          style={{
                            position: "absolute",
                            top: "12px",
                            right: "16px",
                            fontSize: "64px",
                            fontWeight: "800",
                            color: "rgba(207,92,54,0.10)",
                            lineHeight: 1,
                            userSelect: "none",
                            pointerEvents: "none",
                          }}
                        >
                          {s.step}
                        </div>
                        <div
                          style={{
                            width: "68px",
                            height: "68px",
                            borderRadius: "18px",
                            // Terracotta tint, matching the spot tiles on Home
                            // and Pet Card. It was cream, and the art uses
                            // cream for its surfaces — the unselected rows and
                            // the clock face disappeared into the tile.
                            background: "rgba(207,92,54,0.14)",
                            border: "1px solid rgba(207,92,54,0.28)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 18px",
                            color: C.terracotta,
                          }}
                        >
                          <Icon size={44} />
                        </div>
                        <h3
                          style={{
                            fontSize: "20px",
                            fontWeight: "800",
                            color: C.navyDark,
                            margin: "0 0 10px",
                            fontFamily: "var(--font-urbanist,system-ui)",
                          }}
                        >
                          {s.title}
                        </h3>
                        <p
                          className="sc-hiw_cards"
                          style={{
                            fontSize: "16px",
                            fontWeight: 500,
                            color: C.slate,
                            lineHeight: "1.7",
                            margin: 0,
                          }}
                        >
                          {s.body}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                height: "1.5px",
                background: C.border,
                marginBottom: "40px",
              }}
            />

            {/* ── PET SELECTION / GUEST FORM ── */}
            {session ? (
              <>
                {resumeData && (
                  <div
                    className="sc-resume-card"
                    style={{
                      background: "#EDFAF3",
                      border: "1px solid #A7F3D0",
                      borderRadius: "14px",
                      padding: "16px 20px",
                      marginBottom: "24px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: "0 0 2px",
                          fontWeight: "700",
                          fontSize: "16px",
                          color: C.success,
                        }}
                      >
                        Resume check for {resumeData.selectedPet?.name}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "15px",
                          fontWeight: "500",
                          color: C.slate,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span>
                          {resumeData.messages.length - 1} message
                          {resumeData.messages.length !== 2 ? "s" : ""} ·
                        </span>
                        {resumeData.triageResult ? (
                          <>
                            <span>Result:</span>
                            <span
                              style={{
                                display: "inline-block",
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                background:
                                  resumeData.triageResult === "EMERGENCY"
                                    ? "#C94040"
                                    : resumeData.triageResult === "SEE_VET"
                                      ? "#D9A21B"
                                      : "#1A6641",
                                flexShrink: 0,
                              }}
                            />
                            <span>
                              {resumeData.triageResult === "EMERGENCY"
                                ? "Emergency"
                                : resumeData.triageResult === "SEE_VET"
                                  ? "See vet soon"
                                  : "Monitor at home"}
                            </span>
                          </>
                        ) : (
                          <span>In progress</span>
                        )}
                      </p>
                    </div>
                    <button onClick={resumeSession} className="sc-resume-btn">
                      Resume{" "}
                      <ArrowRight
                        size={14}
                        strokeWidth={2.4}
                        style={{
                          display: "inline",
                          verticalAlign: "top !imporant",
                          marginLeft: "4px",
                        }}
                      />
                    </button>
                  </div>
                )}
                {pets.length > 0 ? (
                  <>
                    <h2
                      style={{
                        margin: "0 0 6px",
                        fontSize: "22px",
                        fontWeight: "800",
                        color: C.navyDark,
                        fontFamily: "var(--font-urbanist,system-ui)",
                      }}
                    >
                      Which pet are we checking on?
                    </h2>
                    <p
                      style={{
                        margin: "0 0 20px",
                        fontSize: "16px",
                        fontWeight: 500,
                        color: C.muted,
                      }}
                    >
                      Select a pet to start a new symptom check.
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      {pets.map((pet) => {
                        const SpeciesIcon =
                          BANNER_LUCIDE[speciesBucket(pet.species)] || PawPrint;
                        const lastCheck = lastChecks[pet.id];
                        return (
                          <div key={pet.id} className="sc-pet-card">
                            {/* Top row wrapper: avatar + info (col1 row1 in mobile grid) */}
                            <div className="sc-top-row">
                              {/* Avatar - Desktop */}
                              <div className="sc-avatar sc-avatar-desktop">
                                {pet.photo_url ? (
                                  <img src={pet.photo_url} alt={pet.name} />
                                ) : (
                                  <SpeciesIcon size={44} strokeWidth={1.7} />
                                )}
                              </div>

                              {/* Avatar - Mobile */}
                              <div className="sc-avatar sc-avatar-mobile">
                                {pet.photo_url ? (
                                  <img src={pet.photo_url} alt={pet.name} />
                                ) : (
                                  <SpeciesIcon size={34} strokeWidth={1.8} />
                                )}
                              </div>

                              {/* Left: name, breed, last check */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p
                                  style={{
                                    margin: 0,
                                    fontWeight: "800",
                                    fontSize: "20px",
                                    color: C.navyDark,
                                    fontFamily:
                                      "var(--font-urbanist,system-ui)",
                                  }}
                                >
                                  {pet.name}
                                </p>
                                {pet.species && (
                                  <p
                                    style={{
                                      // margin: "2px 0 0",
                                      fontSize: "16px",
                                      fontWeight: "500",
                                      color: C.muted,
                                    }}
                                  >
                                    {pet.species}
                                  </p>
                                )}
                                {pet.breed && (
                                  <p
                                    style={{
                                      margin: "2px 0 0",
                                      fontSize: "16px",
                                      fontWeight: "600",
                                      color: C.navyDark,
                                    }}
                                  >
                                    {pet.breed}
                                  </p>
                                )}
                                {lastCheck &&
                                  (() => {
                                    const dotColor =
                                      lastCheck.triage_result === "EMERGENCY"
                                        ? "#C94040"
                                        : lastCheck.triage_result === "SEE_VET"
                                          ? "#D9A21B"
                                          : "#1A6641";
                                    const l =
                                      lastCheck.triage_result === "EMERGENCY"
                                        ? "Emergency"
                                        : lastCheck.triage_result === "SEE_VET"
                                          ? "See vet soon"
                                          : "Monitor at home";
                                    const d = new Date(
                                      lastCheck.created_at,
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    });
                                    return (
                                      <p
                                        className="sc-lastcheck sc-lastcheck-inline"
                                        onClick={(ev) => {
                                          ev.stopPropagation();
                                          try {
                                            const t = JSON.parse(
                                              lastCheck.transcript || "[]",
                                            );
                                            sessionStorage.setItem(
                                              SESSION_KEY,
                                              JSON.stringify({
                                                selectedPet: pet,
                                                messages: t,
                                                triageResult:
                                                  lastCheck.triage_result,
                                                differentials:
                                                  lastCheck.differentials || [],
                                                guestMode: false,
                                                freeCheckUsed: false,
                                              }),
                                            );
                                          } catch (err) {}
                                          router.push("/symptom-checker/chat");
                                        }}
                                        style={{
                                          margin: "4px 0 0",
                                          fontSize: "16px",
                                          fontWeight: "600",
                                          color: C.terracotta,
                                          textUnderlineOffset: "2px",
                                          cursor: "pointer",
                                          alignItems: "center",
                                          gap: "6px",
                                        }}
                                      >
                                        <span
                                          style={{
                                            display: "inline-block",
                                            width: 10,
                                            height: 10,
                                            borderRadius: "50%",
                                            background: dotColor,
                                            flexShrink: 0,
                                          }}
                                        />
                                        {l} · {d}
                                      </p>
                                    );
                                  })()}
                              </div>
                            </div>
                            {/* end sc-top-row */}

                            {/* Mobile-only lastCheck row (sits between top-row and divider) */}
                            {lastCheck &&
                              (() => {
                                const dotColor =
                                  lastCheck.triage_result === "EMERGENCY"
                                    ? "#C94040"
                                    : lastCheck.triage_result === "SEE_VET"
                                      ? "#D9A21B"
                                      : "#1A6641";
                                const l =
                                  lastCheck.triage_result === "EMERGENCY"
                                    ? "Emergency"
                                    : lastCheck.triage_result === "SEE_VET"
                                      ? "See vet soon"
                                      : "Monitor at home";
                                const d = new Date(
                                  lastCheck.created_at,
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                });
                                return (
                                  <p
                                    className="sc-lastcheck sc-lastcheck-row"
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      try {
                                        const t = JSON.parse(
                                          lastCheck.transcript || "[]",
                                        );
                                        sessionStorage.setItem(
                                          SESSION_KEY,
                                          JSON.stringify({
                                            selectedPet: pet,
                                            messages: t,
                                            triageResult:
                                              lastCheck.triage_result,
                                            differentials:
                                              lastCheck.differentials || [],
                                            guestMode: false,
                                            freeCheckUsed: false,
                                          }),
                                        );
                                      } catch (err) {}
                                      router.push("/symptom-checker/chat");
                                    }}
                                    style={{
                                      margin: 0,
                                      fontSize: "16px",
                                      fontWeight: "600",
                                      color: C.terracotta,
                                      cursor: "pointer",
                                      alignItems: "center",
                                      gap: "6px",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    <span
                                      style={{
                                        display: "inline-block",
                                        width: 10,
                                        height: 10,
                                        borderRadius: "50%",
                                        background: dotColor,
                                        flexShrink: 0,
                                      }}
                                    />
                                    {l} · {d}
                                  </p>
                                );
                              })()}

                            {/* Vertical divider — desktop only, inset top/bottom */}
                            <div className="sc-vdiv" />

                            {/* Stats — desktop only */}
                            <div className="sc-stats">
                              {pet.birthday && (
                                <div className="sc-stat">
                                  <span className="sc-stat-label">Age:</span>
                                  <span className="sc-stat-value">
                                    {formatAge(pet.birthday)}
                                  </span>
                                </div>
                              )}
                              {pet.weight_value && (
                                <div className="sc-stat">
                                  <span className="sc-stat-label">Weight:</span>
                                  <span className="sc-stat-value">
                                    {pet.weight_value}{" "}
                                    {pet.weight_unit || "lbs"}
                                  </span>
                                </div>
                              )}
                              {pet.sex && (
                                <div className="sc-stat">
                                  <span className="sc-stat-label">Sex:</span>
                                  <span className="sc-stat-value">
                                    {pet.sex}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Mobile stats — inset horizontal divider */}
                            <div className="sc-mob-stats">
                              {pet.birthday && (
                                <div className="sc-stat">
                                  <span className="sc-stat-label">Age:</span>
                                  <span className="sc-stat-value">
                                    {formatAge(pet.birthday)}
                                  </span>
                                </div>
                              )}
                              {pet.weight_value && (
                                <div className="sc-stat">
                                  <span className="sc-stat-label">Weight:</span>
                                  <span className="sc-stat-value">
                                    {pet.weight_value}{" "}
                                    {pet.weight_unit || "lbs"}
                                  </span>
                                </div>
                              )}
                              {pet.sex && (
                                <div className="sc-stat">
                                  <span className="sc-stat-label">Sex:</span>
                                  <span className="sc-stat-value">
                                    {pet.sex}
                                  </span>
                                </div>
                              )}
                            </div>
                            {/* Chevron — start new check */}
                            <button
                              className="sc-chevron"
                              onClick={() => startNewCheck(pet)}
                              aria-label="Start check"
                            >
                              <ChevronRight size={20} strokeWidth={2.4} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "56px 24px",
                      background: "#fff",
                      borderRadius: "20px",
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <div style={{ marginBottom: "16px", color: C.terracotta }}>
                      <PawPrint size={44} strokeWidth={1.8} />
                    </div>
                    <h3
                      style={{
                        margin: "0 0 8px",
                        fontSize: "22px",
                        fontWeight: "800",
                        color: C.navyDark,
                        fontFamily: "var(--font-urbanist,system-ui)",
                      }}
                    >
                      Add a pet to get started
                    </h3>
                    <p
                      style={{
                        margin: "0 0 24px",
                        fontSize: "16px",
                        fontWeight: "500",
                        color: C.slate,
                      }}
                    >
                      You'll need to add a pet to your profile before running a
                      symptom check.
                    </p>
                    <Link href="/profile?add=1" className="sc-btn-primary">
                      Add a Pet{" "}
                      <ArrowRight
                        size={14}
                        strokeWidth={2.4}
                        style={{ marginLeft: "4px" }}
                      />
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2
                  style={{
                    margin: "0 0 6px",
                    fontSize: "22px",
                    fontWeight: "800",
                    color: C.navyDark,
                    fontFamily: "var(--font-urbanist,system-ui)",
                  }}
                >
                  Check your pet's symptoms
                </h2>
                <p
                  style={{
                    margin: "0 0 24px",
                    fontSize: "15px",
                    color: C.muted,
                  }}
                >
                  Create a free account to get instant guidance, and to keep a
                  record of every check you run.
                </p>
                <div
                  style={{
                    background: "#fff",
                    border: `1px solid ${C.border}`,
                    borderRadius: "20px",
                    padding: "28px 28px 24px",
                    boxShadow: "0 2px 12px rgba(23,37,49,0.06)",
                  }}
                >
                  <div
                    className="sc-guest-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "14px",
                      marginBottom: "22px",
                    }}
                  >
                    {[
                      {
                        label: "Species",
                        key: "species",
                        placeholder: "e.g. Dog",
                      },
                      {
                        label: "Breed",
                        key: "breed",
                        placeholder: "e.g. Labrador",
                      },
                      { label: "Age", key: "age", placeholder: "e.g. 3 years" },
                    ].map(({ label, key, placeholder }) => (
                      <div key={key}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "11px",
                            color: C.muted,
                            marginBottom: "6px",
                            textTransform: "uppercase",
                            letterSpacing: "0.10em",
                            fontWeight: "700",
                          }}
                        >
                          {label}
                        </label>
                        <input
                          value={guestPet[key]}
                          onChange={(e) =>
                            setGuestPet({ ...guestPet, [key]: e.target.value })
                          }
                          placeholder={placeholder}
                          className="sc-input"
                        />
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      height: "1px",
                      background: C.border,
                      margin: "0 0 20px",
                    }}
                  />
                  <div
                    className="sc-btn-row"
                    style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
                  >
                    <button
                      onClick={startGuestCheck}
                      disabled={!guestPet.species}
                      className="sc-btn-primary"
                    >
                      Start Free Check{" "}
                      <ArrowRight
                        size={14}
                        strokeWidth={2.4}
                        style={{ marginLeft: "4px" }}
                      />
                    </button>
                    <Link href="/auth?tab=signup" className="sc-btn-outline">
                      Create Account
                    </Link>
                  </div>
                </div>
              </>
            )}

            <p
              style={{
                marginTop: "40px",
                fontSize: "13px",
                fontWeight: "500",
                color: C.muted,
                textAlign: "center",
                lineHeight: "1.8",
                // Ran 111-138ch at wide widths; capped and centred.
                maxWidth: "68ch",
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              {/* <span
                style={{
                  display: "inline-block",
                  verticalAlign: "middle",
                  marginRight: "4px",
                  marginTop: "-7px",
                  left: "48px",
                  padding: "",
                }}
              >
                ⚕️
              </span> */}
              ⚕️ PetParrk provides triage guidance only. We are not
              veterinarians or medical professionals.
              <br />
              This is not a substitute for professional veterinary care.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
