"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

const SESSION_KEY = "petparrk_symptom_session";

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
        .pet-select-card { border: 1px solid var(--color-border, #EDE8E0); border-radius: 16px; padding: 16px 18px; margin-bottom: 10px; cursor: pointer; background: #fff; display: flex; align-items: center; gap: 14px; transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s; box-shadow: 0 2px 8px rgba(23,37,49,0.05); }
        .pet-select-card:hover { border-color: var(--color-terracotta, #CF5C36); box-shadow: 0 4px 16px rgba(23,37,49,0.10); transform: translateY(-1px); }
        .sc-input { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1.5px solid var(--color-border, #EDE8E0); font-size: 14px; font-family: var(--font-urbanist, system-ui); background: #fff; outline: none; box-sizing: border-box; transition: border-color 0.15s; }
        .sc-input:focus { border-color: var(--color-terracotta, #CF5C36); }
        .sc-btn-primary { padding: 12px 24px; background: var(--color-terracotta, #CF5C36); color: #fff; border: none; border-radius: 12px; font-size: 14px; cursor: pointer; font-weight: 700; font-family: var(--font-urbanist, system-ui); transition: opacity 0.15s; }
        .sc-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
        .sc-btn-outline { padding: 12px 24px; background: transparent; color: var(--color-navy-dark, #172531); border: 1.5px solid var(--color-navy-dark, #172531); border-radius: 12px; font-size: 14px; cursor: pointer; font-weight: 700; font-family: var(--font-urbanist, system-ui); text-decoration: none; display: inline-block; transition: background 0.15s; }
        .sc-btn-outline:hover { background: rgba(23,37,49,0.05); }
      `}</style>

      {/* Standard page header — same height as all other pages */}
      <div
        style={{
          background: "var(--color-navy-dark, #172531)",
          padding: "56px 0",
          minHeight: "168px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px" }}
        >
          <p
            style={{
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--color-gold, #EFC88B)",
              marginBottom: "8px",
            }}
          >
            AI Triage
          </p>
          <h1
            style={{
              fontSize: "clamp(24px, 4vw, 36px)",
              fontWeight: "800",
              color: "#fff",
              fontFamily: "var(--font-urbanist, 'Urbanist', sans-serif)",
              marginBottom: "8px",
            }}
          >
            Symptom Checker
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "rgba(255,255,255,0.6)",
              margin: 0,
            }}
          >
            Answer 3 quick questions and get an instant triage recommendation.
          </p>
        </div>
      </div>

      <div
        style={{
          background: "var(--color-cream, #F5F0E8)",
          minHeight: "calc(100vh - 64px - 168px)",
        }}
      >
        <div
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            padding: "40px 24px 80px",
          }}
        >
          {/* Disclaimer */}
          <p
            style={{
              fontSize: "12px",
              color: "#9CA3AF",
              textAlign: "center",
              marginBottom: "32px",
              lineHeight: "1.6",
            }}
          >
            ⚕️ PetParrk provides triage guidance only. We are not veterinarians
            or medical professionals. This is not a substitute for professional
            veterinary care.
          </p>

          {session ? (
            <>
              {/* Resume banner */}
              {resumeData && (
                <div
                  style={{
                    background: "#EDFAF3",
                    border: "1px solid #A7F3D0",
                    borderRadius: "14px",
                    padding: "16px 18px",
                    marginBottom: "20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: "0 0 2px 0",
                        fontWeight: "700",
                        fontSize: "14px",
                        color: "#1A6641",
                      }}
                    >
                      Resume check for {resumeData.selectedPet?.name}
                    </p>
                    <p style={{ margin: 0, fontSize: "12px", color: "#555" }}>
                      {resumeData.messages.length - 1} message
                      {resumeData.messages.length !== 2 ? "s" : ""} ·{" "}
                      {resumeData.triageResult
                        ? `Result: ${resumeData.triageResult === "EMERGENCY" ? "🔴 Emergency" : resumeData.triageResult === "SEE_VET" ? "🟡 See vet" : "🟢 Monitor"}`
                        : "In progress"}
                    </p>
                  </div>
                  <button
                    onClick={resumeSession}
                    style={{
                      padding: "8px 18px",
                      background: "var(--color-terracotta, #CF5C36)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "10px",
                      fontSize: "13px",
                      cursor: "pointer",
                      fontWeight: "700",
                      whiteSpace: "nowrap",
                      fontFamily: "var(--font-urbanist, system-ui)",
                    }}
                  >
                    Resume →
                  </button>
                </div>
              )}

              {pets.length > 0 ? (
                <>
                  <h2
                    style={{
                      margin: "0 0 16px 0",
                      fontSize: "18px",
                      fontWeight: "700",
                      color: "var(--color-navy-dark, #172531)",
                      fontFamily: "var(--font-urbanist, system-ui)",
                    }}
                  >
                    Which pet are we checking on?
                  </h2>
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
                        className="pet-select-card"
                        onClick={() => startNewCheck(pet)}
                      >
                        <div
                          style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "50%",
                            background: "var(--color-cream, #F5F0E8)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                            flexShrink: 0,
                            fontSize: "22px",
                            border: "2px solid var(--color-border, #EDE8E0)",
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
                        <div style={{ flex: 1 }}>
                          <p
                            style={{
                              margin: 0,
                              fontWeight: "700",
                              fontSize: "15px",
                              color: "var(--color-navy-dark, #172531)",
                              fontFamily: "var(--font-urbanist, system-ui)",
                            }}
                          >
                            {pet.name}
                          </p>
                          <p
                            style={{
                              margin: "2px 0 0 0",
                              fontSize: "13px",
                              color: "#9CA3AF",
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
                                          triageResult: lastCheck.triage_result,
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
                                    display: "block",
                                    marginTop: "4px",
                                    fontSize: "12px",
                                    color: "var(--color-terracotta, #CF5C36)",
                                    cursor: "pointer",
                                    textDecoration: "underline",
                                    textDecorationStyle: "dotted",
                                    textUnderlineOffset: "2px",
                                  }}
                                >
                                  Last check: {e} {l} · {d}
                                </p>
                              );
                            })()}
                        </div>
                        <span
                          style={{
                            color: "var(--color-terracotta, #CF5C36)",
                            fontSize: "18px",
                            flexShrink: 0,
                          }}
                        >
                          →
                        </span>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "48px 24px",
                    background: "#fff",
                    borderRadius: "20px",
                    border: "1px solid var(--color-border, #EDE8E0)",
                  }}
                >
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>
                    🐾
                  </div>
                  <p
                    style={{
                      margin: "0 0 16px 0",
                      fontSize: "15px",
                      color: "#4B5563",
                    }}
                  >
                    You haven't added any pets yet.
                  </p>
                  <Link
                    href="/profile"
                    style={{
                      display: "inline-block",
                      padding: "12px 28px",
                      background: "var(--color-terracotta, #CF5C36)",
                      color: "#fff",
                      borderRadius: "12px",
                      textDecoration: "none",
                      fontSize: "14px",
                      fontWeight: "700",
                      fontFamily: "var(--font-urbanist, system-ui)",
                    }}
                  >
                    Add a Pet First
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div
              style={{
                background: "#fff",
                border: "1px solid var(--color-border, #EDE8E0)",
                borderRadius: "20px",
                padding: "28px",
                boxShadow: "0 2px 12px rgba(23,37,49,0.06)",
              }}
            >
              <h2
                style={{
                  margin: "0 0 6px 0",
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "var(--color-navy-dark, #172531)",
                  fontFamily: "var(--font-urbanist, system-ui)",
                }}
              >
                Try one free check
              </h2>
              <p
                style={{
                  margin: "0 0 20px 0",
                  fontSize: "14px",
                  color: "#9CA3AF",
                }}
              >
                Sign up to save history and get personalized checks for your
                pets.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "10px",
                  marginBottom: "20px",
                }}
              >
                {[
                  { label: "Species", key: "species", placeholder: "e.g. Dog" },
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
                        color: "#9CA3AF",
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
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  onClick={startGuestCheck}
                  disabled={!guestPet.species}
                  className="sc-btn-primary"
                >
                  Start Free Check
                </button>
                <Link href="/auth" className="sc-btn-outline">
                  Sign Up Free
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
