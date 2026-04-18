"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

const SESSION_KEY = "petparrk_symptom_session";
const C = {
  navyDark: "#172531",
  navyMid: "#2C4657",
  terracotta: "#CF5C36",
  gold: "#EFC88B",
  cream: "#F5F0E8",
  white: "#FFFFFF",
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

  if (session === undefined) return null;

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

        .sc-pet-card { border:1px solid ${C.border}; border-radius:14px; padding:20px 24px; display:flex; align-items:center; gap:16px; cursor:pointer; transition:background 0.15s; background:${C.white}; position:relative; overflow:hidden; }
        .sc-pet-card::before { content:""; position:absolute; left:0; top:0; bottom:0; width:3px; background:${C.terracotta}; opacity:0; transition:opacity 0.15s; border-radius:0 2px 2px 0; }
        .sc-pet-card:hover { background:#fafaf8; }
        .sc-pet-card:hover::before { opacity:1; }

        /* Vertical divider desktop — inset */
        .sc-vdiv { width:1px; background:${C.border}; align-self:stretch; margin:4px 0; flex-shrink:0; }

        /* Stats desktop */
        .sc-stats { display:flex; flex-direction:column; gap:6px; flex-shrink:0; min-width:130px; padding-left:4px; }
        .sc-stat { display:flex; align-items:baseline; gap:4px; }
        .sc-stat-label { font-size:13px; font-weight:600; color:${C.muted}; }
        .sc-stat-value { font-size:13px; font-weight:600; color:${C.navyDark}; }

        /* Mobile stats — hidden on desktop */
        .sc-mob-stats { display:none; }

        @media(max-width:600px) {
          .sc-pet-card { flex-wrap:wrap; padding:10px 18px; align-items:center; }
          .sc-vdiv { display:none; }
          .sc-stats { display:none; }
          .sc-mob-stats { display:flex; gap:20px; width:100%; padding-top:10px; border-top:1px solid ${C.border}; margin-left:66px; margin-right:0; }
        .sc-mob-stats .sc-stat { flex:0 0 auto; display:flex; flex-direction:column; align-items:flex-start; }
        .sc-mob-stats .sc-stat-label { font-size:13px; font-weight:600; text-transform:capitalize; color:${C.muted}; white-space:nowrap; }
        .sc-mob-stats .sc-stat-value { font-size:13px; font-weight:600; color:${C.navyDark}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        }
        .sc-input { width:100%; padding:11px 14px; border-radius:10px; border:1.5px solid ${C.border}; font-size:15px; font-family:var(--font-urbanist,system-ui); background:#fff; outline:none; box-sizing:border-box; transition:border-color 0.15s; color:${C.navyDark}; -webkit-appearance:none; }
        .sc-input:focus { border-color:${C.terracotta}; }
        .sc-input::placeholder { color:${C.muted}; }
        .sc-resume-btn { padding:10px 20px; background:${C.terracotta}; color:#fff; border:2px solid ${C.terracotta}; border-radius:10px; font-size:13px; cursor:pointer; font-weight:700; white-space:nowrap; font-family:var(--font-urbanist,system-ui); transition:background 0.2s,color 0.2s; }
        .sc-resume-btn:hover { background:#fff; color:${C.terracotta}; }
        .sc-btn-primary { height:48px; padding:0 28px; background:${C.terracotta}; color:#fff; border:2px solid ${C.terracotta}; border-radius:12px; font-size:15px; cursor:pointer; font-weight:700; font-family:var(--font-urbanist,system-ui); transition:background 0.2s; display:inline-flex; align-items:center; justify-content:center; text-decoration:none; }
        .sc-btn-primary:hover { background:#a8471d; }
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
              fontSize: "11px",
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
          style={{ padding: "56px 24px 80px", boxSizing: "border-box" }}
        >
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            {/* ── HOW IT WORKS ── */}
            <div style={{ marginBottom: "48px" }}>
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
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
                    icon: "🔍",
                    step: "01",
                    title: "Pick the area",
                    body: "Tell us what part of your pet's body or behavior has changed.",
                  },
                  {
                    icon: "🕐",
                    step: "02",
                    title: "How long",
                    body: "Let us know when it started — minutes ago or days.",
                  },
                  {
                    icon: "🌡️",
                    step: "03",
                    title: "Severity",
                    body: "Rate how serious it seems. You know your pet best.",
                  },
                ].map((s) => (
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
                          width: "56px",
                          height: "56px",
                          borderRadius: "16px",
                          background: C.cream,
                          border: `1px solid ${C.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "26px",
                          margin: "0 auto 18px",
                        }}
                      >
                        {s.icon}
                      </div>
                      <h3
                        style={{
                          fontSize: "17px",
                          fontWeight: "800",
                          color: C.navyDark,
                          margin: "0 0 10px",
                          fontFamily: "var(--font-urbanist,system-ui)",
                        }}
                      >
                        {s.title}
                      </h3>
                      <p
                        style={{
                          fontSize: "13px",
                          color: C.slate,
                          lineHeight: "1.7",
                          margin: 0,
                        }}
                      >
                        {s.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                height: "1px",
                background: C.border,
                marginBottom: "40px",
              }}
            />

            {/* ── PET SELECTION / GUEST FORM ── */}
            {session ? (
              <>
                {resumeData && (
                  <div
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
                          fontSize: "14px",
                          color: C.success,
                        }}
                      >
                        Resume check for {resumeData.selectedPet?.name}
                      </p>
                      <p
                        style={{ margin: 0, fontSize: "13px", color: C.slate }}
                      >
                        {resumeData.messages.length - 1} message
                        {resumeData.messages.length !== 2 ? "s" : ""} ·{" "}
                        {resumeData.triageResult
                          ? `Result: ${resumeData.triageResult === "EMERGENCY" ? "🔴 Emergency" : resumeData.triageResult === "SEE_VET" ? "🟡 See vet" : "🟢 Monitor"}`
                          : "In progress"}
                      </p>
                    </div>
                    <button onClick={resumeSession} className="sc-resume-btn">
                      Resume →
                    </button>
                  </div>
                )}
                {pets.length > 0 ? (
                  <>
                    <h2
                      style={{
                        margin: "0 0 6px",
                        fontSize: "20px",
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
                        fontSize: "15px",
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
                        const emoji =
                          pet.species === "Dog"
                            ? "🐶"
                            : pet.species === "Cat"
                              ? "🐱"
                              : pet.species === "Bird"
                                ? "🐦"
                                : pet.species === "Rabbit"
                                  ? "🐰"
                                  : "🐾";
                        const lastCheck = lastChecks[pet.id];
                        return (
                          <div
                            key={pet.id}
                            className="sc-pet-card"
                            onClick={() => startNewCheck(pet)}
                          >
                            {/* Avatar */}
                            <div
                              style={{
                                width: "52px",
                                height: "52px",
                                borderRadius: "50%",
                                background: C.cream,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                overflow: "hidden",
                                flexShrink: 0,
                                fontSize: "22px",
                                border: `2px solid ${C.border}`,
                              }}
                            >
                              {pet.photo_url ? (
                                <img
                                  src={pet.photo_url}
                                  alt={pet.name}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              ) : (
                                emoji
                              )}
                            </div>

                            {/* Left: name, breed, last check */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p
                                style={{
                                  margin: 0,
                                  fontWeight: "700",
                                  fontSize: "16px",
                                  color: C.navyDark,
                                  fontFamily: "var(--font-urbanist,system-ui)",
                                }}
                              >
                                {pet.name}
                              </p>
                              <p
                                style={{
                                  margin: "2px 0 0",
                                  fontSize: "13px",
                                  fontWeight: "600",
                                  color: C.muted,
                                }}
                              >
                                {[pet.species, pet.breed]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                              {lastCheck &&
                                (() => {
                                  const e =
                                    lastCheck.triage_result === "EMERGENCY"
                                      ? "🔴"
                                      : lastCheck.triage_result === "SEE_VET"
                                        ? "🟡"
                                        : "🟢";
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
                                      style={{
                                        margin: "4px 0 0",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        color: C.terracotta,
                                        /* textDecoration: "underline",
                                        textDecorationStyle: "dotted",
                                        textUnderlineOffset: "2px",*/
                                      }}
                                    >
                                      {e} {l} · {d}
                                    </p>
                                  );
                                })()}
                            </div>

                            {/* Vertical divider — desktop only, inset top/bottom */}
                            <div className="sc-vdiv" />

                            {/* Stats — desktop only */}
                            <div className="sc-stats">
                              {pet.birthday && (
                                <div className="sc-stat">
                                  <span className="sc-stat-label">Age:</span>
                                  <span className="sc-stat-value">
                                    {(() => {
                                      const yrs = Math.floor(
                                        (Date.now() - new Date(pet.birthday)) /
                                          (365.25 * 24 * 3600 * 1000),
                                      );
                                      return yrs < 1
                                        ? "< 1 yr"
                                        : yrs === 1
                                          ? "1 yr"
                                          : `${yrs} yrs`;
                                    })()}
                                  </span>
                                </div>
                              )}
                              {pet.weight_lbs && (
                                <div className="sc-stat">
                                  <span className="sc-stat-label">Weight:</span>
                                  <span className="sc-stat-value">
                                    {pet.weight_lbs} lbs
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
                                    {(() => {
                                      const yrs = Math.floor(
                                        (Date.now() - new Date(pet.birthday)) /
                                          (365.25 * 24 * 3600 * 1000),
                                      );
                                      return yrs < 1
                                        ? "< 1 yr"
                                        : yrs === 1
                                          ? "1 yr"
                                          : `${yrs} yrs`;
                                    })()}
                                  </span>
                                </div>
                              )}
                              {pet.weight_lbs && (
                                <div className="sc-stat">
                                  <span className="sc-stat-label">Weight:</span>
                                  <span className="sc-stat-value">
                                    {pet.weight_lbs} lbs
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
                    <div style={{ fontSize: "44px", marginBottom: "16px" }}>
                      🐾
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
                      Add a pet to get started
                    </h3>
                    <p
                      style={{
                        margin: "0 0 24px",
                        fontSize: "15px",
                        color: C.slate,
                      }}
                    >
                      You'll need to add a pet to your profile before running a
                      symptom check.
                    </p>
                    <Link href="/profile" className="sc-btn-primary">
                      Add a Pet →
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2
                  style={{
                    margin: "0 0 6px",
                    fontSize: "20px",
                    fontWeight: "800",
                    color: C.navyDark,
                    fontFamily: "var(--font-urbanist,system-ui)",
                  }}
                >
                  Try one free check
                </h2>
                <p
                  style={{
                    margin: "0 0 24px",
                    fontSize: "15px",
                    color: C.muted,
                  }}
                >
                  No account needed. Sign up to save history and check unlimited
                  times.
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
                            letterSpacing: "0.06em",
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
                      Start Free Check →
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
                fontSize: "12px",
                color: C.muted,
                textAlign: "center",
                lineHeight: "1.8",
              }}
            >
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
