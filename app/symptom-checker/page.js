"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import Navbar from "../../components/Navbar";

const SESSION_KEY = "petparrk_symptom_session";

export default function SymptomCheckerHomePage() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [pets, setPets] = useState([]);
  const [resumeData, setResumeData] = useState(null); // { pet, messages, triageResult }
  const [guestPet, setGuestPet] = useState({ species: "", breed: "", age: "" });
  const [lastChecks, setLastChecks] = useState({}); // { [petId]: { triage_result, created_at } }

  // ── Auth ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // ── Pets + last symptom check per pet ────────────────────────────
  useEffect(() => {
    if (!session) return;
    supabase
      .from("pets")
      .select("*")
      .eq("owner_id", session.user.id)
      .order("created_at")
      .then(async ({ data: petsData }) => {
        setPets(petsData || []);
        // Fetch most recent symptom check for each pet in parallel
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
                }))
            )
          );
          const map = {};
          checks.forEach(({ petId, check }) => {
            if (check) map[petId] = check;
          });
          setLastChecks(map);
        }
      });
  }, [session]);

  // ── Check for resumable session ───────────────────────────────────
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only show resume banner if there's a real in-progress session (not an autoStart)
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
        })
      );
    } catch (e) {}
    router.push("/symptom-checker/chat");
  }

  function resumeSession() {
    // sessionStorage already has the saved session, just navigate
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
        })
      );
    } catch (e) {}
    router.push("/symptom-checker/chat");
  }

  if (session === undefined) return null;

  return (
    <>
      <style>{`
        .pet-select-card { border: 1px solid #ddd; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; cursor: pointer; background: #fff; display: flex; align-items: center; gap: 12px; transition: border-color 0.15s, box-shadow 0.15s; }
        .pet-select-card:hover { border-color: #2d6a4f; box-shadow: 0 2px 8px rgba(45,106,79,0.12); }
      `}</style>
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "20px",
          fontFamily: "system-ui, sans-serif",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <Link
            href="/"
            style={{
              color: "#2d6a4f",
              fontSize: "14px",
              textDecoration: "none",
            }}
          >
            ← Back to all vets
          </Link>
          {session && <Navbar />}
        </div>

        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🩺</div>
          <h1
            style={{ margin: "0 0 8px 0", fontSize: "1.6rem", color: "#111" }}
          >
            Symptom Checker
          </h1>
          <p style={{ margin: "0 0 8px 0", fontSize: "15px", color: "#555" }}>
            Answer 3 quick questions and get an instant triage recommendation.
          </p>
          <p
            style={{
              margin: "0 auto",
              fontSize: "12px",
              color: "#aaa",
              maxWidth: "480px",
            }}
          >
            ⚕️ PetParrk provides triage guidance only. We are not veterinarians
            or medical professionals. This is not a substitute for professional
            veterinary care.
          </p>
        </div>

        {session ? (
          <>
            {/* Resume banner */}
            {resumeData && (
              <div
                style={{
                  background: "#e8f5e9",
                  border: "1px solid #c8e6c9",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  marginBottom: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <p
                    style={{
                      margin: "0 0 2px 0",
                      fontWeight: "700",
                      fontSize: "14px",
                      color: "#2d6a4f",
                    }}
                  >
                    Resume check for {resumeData.selectedPet?.name}
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#555" }}>
                    {resumeData.messages.length - 1} message
                    {resumeData.messages.length !== 2 ? "s" : ""} ·{" "}
                    {resumeData.triageResult
                      ? `Result: ${
                          resumeData.triageResult === "EMERGENCY"
                            ? "🔴 Emergency"
                            : resumeData.triageResult === "SEE_VET"
                            ? "🟡 See vet"
                            : "🟢 Monitor"
                        }`
                      : "In progress"}
                  </p>
                </div>
                <button
                  onClick={resumeSession}
                  style={{
                    padding: "8px 16px",
                    background: "#2d6a4f",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "13px",
                    cursor: "pointer",
                    fontWeight: "600",
                    whiteSpace: "nowrap",
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
                    margin: "0 0 14px 0",
                    fontSize: "1rem",
                    color: "#333",
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
                  return (
                    <div
                      key={pet.id}
                      className="pet-select-card"
                      onClick={() => startNewCheck(pet)}
                    >
                      <div
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "50%",
                          background: "#e8f5e9",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          flexShrink: 0,
                          fontSize: "20px",
                          border: "2px solid #ddd",
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
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontWeight: "700",
                            fontSize: "15px",
                            color: "#111",
                          }}
                        >
                          {pet.name}
                        </p>
                        <p
                          style={{
                            margin: "2px 0 0 0",
                            fontSize: "13px",
                            color: "#888",
                          }}
                        >
                          {[pet.species, pet.breed].filter(Boolean).join(" · ")}
                        </p>
                        {lastChecks[pet.id] &&
                          (() => {
                            const c = lastChecks[pet.id];
                            const emoji =
                              c.triage_result === "EMERGENCY"
                                ? "🔴"
                                : c.triage_result === "SEE_VET"
                                ? "🟡"
                                : "🟢";
                            const label =
                              c.triage_result === "EMERGENCY"
                                ? "Emergency"
                                : c.triage_result === "SEE_VET"
                                ? "See vet soon"
                                : "Monitor at home";
                            const date = new Date(
                              c.created_at
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            });
                            return (
                              <p
                                onClick={(e) => {
                                  e.stopPropagation();
                                  try {
                                    const transcript = JSON.parse(
                                      c.transcript || "[]"
                                    );
                                    sessionStorage.setItem(
                                      SESSION_KEY,
                                      JSON.stringify({
                                        selectedPet: pet,
                                        messages: transcript,
                                        triageResult: c.triage_result,
                                        differentials: c.differentials || [],
                                        guestMode: false,
                                        freeCheckUsed: false,
                                      })
                                    );
                                  } catch (err) {}
                                  router.push("/symptom-checker/chat");
                                }}
                                style={{
                                  margin: "3px 0 0 0",
                                  fontSize: "11px",
                                  color: "#2d6a4f",
                                  cursor: "pointer",
                                  textDecoration: "underline",
                                  textDecorationStyle: "dotted",
                                  textUnderlineOffset: "2px",
                                }}
                              >
                                Last check: {emoji} {label} · {date}
                              </p>
                            );
                          })()}
                      </div>
                      <span
                        style={{
                          marginLeft: "auto",
                          color: "#2d6a4f",
                          fontSize: "18px",
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
                  padding: "40px 20px",
                  background: "#f9f9f9",
                  borderRadius: "12px",
                  border: "1px solid #eee",
                }}
              >
                <p
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: "15px",
                    color: "#555",
                  }}
                >
                  You haven't added any pets yet.
                </p>
                <Link
                  href="/profile"
                  style={{
                    display: "inline-block",
                    padding: "10px 24px",
                    background: "#2d6a4f",
                    color: "#fff",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: "600",
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
              border: "1px solid #ddd",
              borderRadius: "12px",
              padding: "20px",
            }}
          >
            <h2
              style={{ margin: "0 0 4px 0", fontSize: "1rem", color: "#333" }}
            >
              Try one free check
            </h2>
            <p
              style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#888" }}
            >
              Sign up to save history and get personalized checks for your pets.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
              {[
                { label: "Species", key: "species", placeholder: "e.g. Dog" },
                { label: "Breed", key: "breed", placeholder: "e.g. Labrador" },
                { label: "Age", key: "age", placeholder: "e.g. 3 years" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      color: "#888",
                      marginBottom: "4px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      fontWeight: "600",
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
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #ddd",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={startGuestCheck}
                disabled={!guestPet.species}
                style={{
                  padding: "10px 20px",
                  background: "#2d6a4f",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  cursor: "pointer",
                  fontWeight: "600",
                  opacity: guestPet.species ? 1 : 0.5,
                }}
              >
                Start Free Check
              </button>
              <Link
                href="/auth"
                style={{
                  padding: "10px 20px",
                  background: "#fff",
                  color: "#2d6a4f",
                  border: "1px solid #2d6a4f",
                  borderRadius: "8px",
                  fontSize: "14px",
                  textDecoration: "none",
                  fontWeight: "600",
                }}
              >
                Sign Up Free
              </Link>
            </div>
          </div>
        )}

        <p
          style={{
            margin: "32px 0 0 0",
            fontSize: "11px",
            color: "#bbb",
            textAlign: "center",
          }}
        >
          ⚕️ PetParrk is not a veterinary service. Always consult a licensed
          veterinarian.
        </p>
      </div>
    </>
  );
}
