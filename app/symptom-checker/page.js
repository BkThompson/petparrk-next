"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import Navbar from "../../components/Navbar";

const SESSION_KEY = "petparrk_symptom_session";

export default function SymptomCheckerPage() {
  const [session, setSession] = useState(undefined);
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [triageResult, setTriageResult] = useState(null);
  const [nearbyVets, setNearbyVets] = useState([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [guestPet, setGuestPet] = useState({ species: "", breed: "", age: "" });
  const [freeCheckUsed, setFreeCheckUsed] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // Load pets
  useEffect(() => {
    if (!session) return;
    supabase
      .from("pets")
      .select("*")
      .eq("owner_id", session.user.id)
      .order("created_at")
      .then(({ data }) => setPets(data || []));
  }, [session]);

  // Restore session from sessionStorage on every mount — no matter how user navigated away
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.messages?.length > 0) {
          setSelectedPet(parsed.selectedPet || null);
          setMessages(parsed.messages || []);
          setTriageResult(parsed.triageResult || null);
          setSessionStarted(true);
          setGuestMode(parsed.guestMode || false);
          setFreeCheckUsed(parsed.freeCheckUsed || false);
        }
      }
    } catch (e) {}
  }, []);

  // Save session to sessionStorage on every change
  useEffect(() => {
    if (!sessionStarted || messages.length === 0) return;
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          selectedPet,
          messages,
          triageResult,
          guestMode,
          freeCheckUsed,
        })
      );
    } catch (e) {}
  }, [
    messages,
    triageResult,
    selectedPet,
    sessionStarted,
    guestMode,
    freeCheckUsed,
  ]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat starts
  useEffect(() => {
    if (sessionStarted) inputRef.current?.focus();
  }, [sessionStarted]);

  // Fetch nearby vets when triage result arrives
  useEffect(() => {
    if (!triageResult) return;
    supabase
      .from("vets")
      .select("*")
      .eq("status", "active")
      .limit(3)
      .then(({ data }) => setNearbyVets(data || []));
  }, [triageResult]);

  async function startSession(pet) {
    // Clear previous session first, then start fresh
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
    setSelectedPet(pet);
    setSessionStarted(true);
    setMessages([]);
    setTriageResult(null);
    setFreeCheckUsed(false);

    const greeting = pet
      ? `Hi! I'm here to help check on **${pet.name}**. 🐾\n\nBefore we start, please know that I provide triage guidance only — I'm not a veterinarian or medical professional, and this is not a substitute for professional veterinary care.\n\nNow, tell me — what's going on with ${pet.name} today? Describe what you're seeing and I'll ask a few follow-up questions.`
      : `Hi! I'm PetParrk's symptom checker. 🐾\n\nBefore we start, please know that I provide triage guidance only — I'm not a veterinarian or medical professional, and this is not a substitute for professional veterinary care.\n\nTo get started, could you tell me your pet's species (dog, cat, etc.), breed, and age?`;

    setMessages([{ role: "assistant", content: greeting }]);
  }

  // Only "Start New Check" clears the session — back/navigate away never clears it
  function resetSession() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
    setSelectedPet(null);
    setMessages([]);
    setTriageResult(null);
    setSessionStarted(false);
    setInput("");
    setFreeCheckUsed(false);
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    if (guestMode && freeCheckUsed) return;

    const userMessage = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/symptom-checker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          pet: selectedPet || (guestMode ? guestPet : null),
        }),
      });

      const data = await res.json();
      const content =
        data.content || "Sorry, something went wrong. Please try again.";

      let newTriageResult = triageResult;
      if (content.includes("[TRIAGE_RESULT: EMERGENCY]")) {
        newTriageResult = "EMERGENCY";
        if (guestMode) setFreeCheckUsed(true);
      } else if (content.includes("[TRIAGE_RESULT: SEE_VET]")) {
        newTriageResult = "SEE_VET";
        if (guestMode) setFreeCheckUsed(true);
      } else if (content.includes("[TRIAGE_RESULT: MONITOR]")) {
        newTriageResult = "MONITOR";
        if (guestMode) setFreeCheckUsed(true);
      }
      if (newTriageResult !== triageResult) setTriageResult(newTriageResult);

      const cleanContent = content
        .replace(/\[TRIAGE_RESULT: EMERGENCY\]/g, "")
        .replace(/\[TRIAGE_RESULT: SEE_VET\]/g, "")
        .replace(/\[TRIAGE_RESULT: MONITOR\]/g, "")
        .trim();

      const finalMessages = [
        ...updatedMessages,
        { role: "assistant", content: cleanContent },
      ];
      setMessages(finalMessages);

      if (session && selectedPet && content.includes("[TRIAGE_RESULT:")) {
        await supabase.from("symptom_checks").insert({
          pet_id: selectedPet.id,
          owner_id: session.user.id,
          triage_result: newTriageResult,
          transcript: JSON.stringify(finalMessages),
          created_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ]);
    }

    setLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function renderMessage(msg, i) {
    const isUser = msg.role === "user";
    const lines = msg.content.split("\n");
    return (
      <div
        key={i}
        style={{
          display: "flex",
          justifyContent: isUser ? "flex-end" : "flex-start",
          marginBottom: "12px",
        }}
      >
        {!isUser && (
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "#2d6a4f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              flexShrink: 0,
              marginRight: "8px",
              marginTop: "2px",
            }}
          >
            🐾
          </div>
        )}
        <div
          style={{
            maxWidth: "75%",
            background: isUser ? "#2d6a4f" : "#f9f9f9",
            color: isUser ? "#fff" : "#111",
            padding: "12px 16px",
            borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
            fontSize: "14px",
            lineHeight: "1.6",
            border: isUser ? "none" : "1px solid #eee",
          }}
        >
          {lines.map((line, j) => {
            const parts = line.split(/\*\*(.*?)\*\*/g);
            return (
              <p
                key={j}
                style={{ margin: j === lines.length - 1 ? 0 : "0 0 6px 0" }}
              >
                {parts.map((part, k) =>
                  k % 2 === 1 ? <strong key={k}>{part}</strong> : part
                )}
              </p>
            );
          })}
        </div>
      </div>
    );
  }

  function renderTriageCard() {
    if (!triageResult) return null;

    const config = {
      EMERGENCY: {
        emoji: "🔴",
        label: "Emergency — Act Now",
        color: "#c62828",
        bg: "#fce8e8",
        border: "#f5c6c6",
        message: "Take your pet to an emergency vet immediately. Don't wait.",
        vetLabel: "24-Hour Emergency Vets",
      },
      SEE_VET: {
        emoji: "🟡",
        label: "See a Vet Soon",
        color: "#e65100",
        bg: "#fff3e0",
        border: "#ffe0b2",
        message: "Schedule an appointment within 24-48 hours.",
        vetLabel: "Nearby Vets",
      },
      MONITOR: {
        emoji: "🟢",
        label: "Monitor at Home",
        color: "#2d6a4f",
        bg: "#e8f5e9",
        border: "#c8e6c9",
        message: "Watch carefully for the next 24 hours.",
        vetLabel: null,
      },
    }[triageResult];

    return (
      <div
        style={{
          background: config.bg,
          border: `2px solid ${config.border}`,
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "6px",
          }}
        >
          <span style={{ fontSize: "20px" }}>{config.emoji}</span>
          <span
            style={{ fontWeight: "700", fontSize: "16px", color: config.color }}
          >
            {config.label}
          </span>
        </div>
        <p
          style={{
            margin: "0 0 14px 0",
            fontSize: "14px",
            color: "#333",
            fontWeight: "500",
          }}
        >
          {config.message}
        </p>

        {config.vetLabel && nearbyVets.length > 0 && (
          <div>
            <p
              style={{
                margin: "0 0 8px 0",
                fontSize: "11px",
                fontWeight: "700",
                color: "#888",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {config.vetLabel}
            </p>
            {nearbyVets.map((vet) => (
              <div
                key={vet.id}
                style={{
                  background: "#fff",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  marginBottom: "8px",
                  border: "1px solid #eee",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: "0 0 2px 0",
                        fontWeight: "700",
                        fontSize: "14px",
                        color: "#111",
                      }}
                    >
                      {vet.name}
                    </p>
                    <p
                      style={{
                        margin: "0 0 10px 0",
                        fontSize: "12px",
                        color: "#888",
                      }}
                    >
                      {vet.neighborhood}
                    </p>
                    {vet.phone && (
                      <a
                        href={`tel:${vet.phone}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "9px 16px",
                          background: config.color,
                          color: "#fff",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontWeight: "700",
                          textDecoration: "none",
                        }}
                      >
                        📞 {vet.phone}
                      </a>
                    )}
                  </div>
                  <a
                    href={`/vet/${vet.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "11px",
                      color: "#2d6a4f",
                      textDecoration: "underline",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  >
                    View profile ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "12px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={resetSession}
            style={{
              padding: "8px 16px",
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "13px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Start New Check
          </button>
          {session && (
            <Link
              href="/profile"
              style={{
                padding: "8px 16px",
                background: config.color,
                color: "#fff",
                borderRadius: "8px",
                fontSize: "13px",
                textDecoration: "none",
                fontWeight: "600",
              }}
            >
              View Pet Profile
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (session === undefined) return null;

  // Pet selector screen
  if (!sessionStarted) {
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
              Describe what's going on and get an instant triage recommendation.
            </p>
            <p
              style={{
                margin: "0 auto",
                fontSize: "12px",
                color: "#aaa",
                maxWidth: "480px",
              }}
            >
              ⚕️ PetParrk provides triage guidance only. We are not
              veterinarians or medical professionals. This is not a substitute
              for professional veterinary care.
            </p>
          </div>

          {session ? (
            <>
              {/* Resume banner if there's an active saved session */}
              {messages.length > 0 && selectedPet && (
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
                      Resume check for {selectedPet.name}
                    </p>
                    <p style={{ margin: 0, fontSize: "12px", color: "#555" }}>
                      {messages.length - 1} message
                      {messages.length !== 2 ? "s" : ""} ·{" "}
                      {triageResult
                        ? `Result: ${
                            triageResult === "EMERGENCY"
                              ? "🔴 Emergency"
                              : triageResult === "SEE_VET"
                              ? "🟡 See vet"
                              : "🟢 Monitor"
                          }`
                        : "In progress"}
                    </p>
                  </div>
                  <button
                    onClick={() => setSessionStarted(true)}
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
                        onClick={() => startSession(pet)}
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
                            {[pet.species, pet.breed]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
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
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "13px",
                  color: "#888",
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
                  marginBottom: "16px",
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
                  onClick={() => {
                    setGuestMode(true);
                    startSession(null);
                  }}
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
        </div>
      </>
    );
  }

  // Chat screen
  return (
    <>
      <style>{`
        .chat-input { width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid #ddd; font-size: 14px; font-family: system-ui, sans-serif; outline: none; resize: none; box-sizing: border-box; }
        .chat-input:focus { border-color: #2d6a4f; }
        .send-btn { padding: 12px 20px; background: #2d6a4f; color: #fff; border: none; border-radius: 12px; font-size: 14px; cursor: pointer; font-weight: 600; white-space: nowrap; }
        .send-btn:hover { background: #245a42; }
        .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
        .thinking-dot {
          width: 7px; height: 7px; border-radius: 50%; background: #999;
          display: inline-block; animation: dotBounce 1.2s infinite ease-in-out;
        }
        .thinking-dot:nth-child(1) { animation-delay: 0s; }
        .thinking-dot:nth-child(2) { animation-delay: 0.2s; }
        .thinking-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>

      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "20px",
          fontFamily: "system-ui, sans-serif",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Back goes to pet selector — keeps session saved in storage so returning to checker restores it */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <button
            onClick={() => setSessionStarted(false)}
            style={{
              background: "none",
              border: "none",
              color: "#2d6a4f",
              fontSize: "14px",
              cursor: "pointer",
              padding: 0,
            }}
          >
            ← Back
          </button>
          {session && <Navbar />}
        </div>

        {selectedPet && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "16px",
              padding: "10px 14px",
              background: "#f9f9f9",
              borderRadius: "10px",
              border: "1px solid #eee",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "#e8f5e9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                fontSize: "18px",
                border: "2px solid #ddd",
                flexShrink: 0,
              }}
            >
              {selectedPet.photo_url ? (
                <img
                  src={selectedPet.photo_url}
                  alt={selectedPet.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : selectedPet.species === "Dog" ? (
                "🐶"
              ) : selectedPet.species === "Cat" ? (
                "🐱"
              ) : (
                "🐾"
              )}
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontWeight: "700",
                  fontSize: "14px",
                  color: "#111",
                }}
              >
                Checking on {selectedPet.name}
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>
                {[selectedPet.species, selectedPet.breed]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <span
              style={{
                marginLeft: "auto",
                fontSize: "11px",
                background: "#e8f5e9",
                padding: "2px 8px",
                borderRadius: "20px",
                color: "#2d6a4f",
              }}
            >
              🩺 Symptom Check
            </span>
          </div>
        )}

        {/* Triage card is sticky so it stays visible as conversation grows */}
        {triageResult && (
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              marginBottom: "8px",
            }}
          >
            {renderTriageCard()}
          </div>
        )}

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            marginBottom: "16px",
            minHeight: "300px",
          }}
        >
          {messages.map((msg, i) => renderMessage(msg, i))}

          {/* Animated thinking dots */}
          {loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "#2d6a4f",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  flexShrink: 0,
                }}
              >
                🐾
              </div>
              <div
                style={{
                  background: "#f9f9f9",
                  border: "1px solid #eee",
                  borderRadius: "16px 16px 16px 4px",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <span className="thinking-dot" />
                <span className="thinking-dot" />
                <span className="thinking-dot" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {guestMode && freeCheckUsed && (
          <div
            style={{
              textAlign: "center",
              padding: "16px",
              background: "#f9f9f9",
              borderRadius: "12px",
              border: "1px solid #eee",
              marginBottom: "16px",
            }}
          >
            <p
              style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#555" }}
            >
              You've used your free check. Sign up to save history and check as
              many times as you need.
            </p>
            <Link
              href="/auth"
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
              Sign Up Free
            </Link>
          </div>
        )}

        {!(guestMode && freeCheckUsed) && (
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                triageResult
                  ? "Ask a follow-up question..."
                  : "Describe what you're seeing..."
              }
              rows={2}
              style={{ flex: 1 }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="send-btn"
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
        )}

        <p
          style={{
            margin: "12px 0 0 0",
            fontSize: "11px",
            color: "#bbb",
            textAlign: "center",
          }}
        >
          ⚕️ PetParrk is not a veterinary service and does not provide medical
          advice. Always consult a licensed veterinarian.
        </p>
      </div>
    </>
  );
}
