"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const SESSION_KEY = "petparrk_symptom_session";

const SYMPTOM_AREAS = [
  {
    id: "stomach",
    label: "Stomach / Digestion",
    emoji: "🤢",
    desc: "Vomiting, diarrhea, not eating",
  },
  {
    id: "eyes_ears",
    label: "Eyes / Ears",
    emoji: "👁️",
    desc: "Discharge, scratching, redness",
  },
  {
    id: "skin",
    label: "Skin / Coat",
    emoji: "🐾",
    desc: "Itching, rash, hair loss, lumps",
  },
  {
    id: "breathing",
    label: "Breathing / Cough",
    emoji: "💨",
    desc: "Coughing, wheezing, labored breath",
  },
  {
    id: "behavior",
    label: "Behavior / Energy",
    emoji: "😴",
    desc: "Lethargy, hiding, confusion",
  },
  {
    id: "movement",
    label: "Limping / Movement",
    emoji: "🦴",
    desc: "Limping, stiffness, won't stand",
  },
  {
    id: "other",
    label: "Something else",
    emoji: "🔍",
    desc: "Doesn't fit the categories above",
  },
];

const DURATIONS = [
  {
    id: "just_now",
    label: "Just started",
    emoji: "⚡",
    desc: "Less than an hour ago",
  },
  { id: "today", label: "Today", emoji: "📅", desc: "Started sometime today" },
  {
    id: "few_days",
    label: "2–3 days",
    emoji: "📆",
    desc: "Been going on a couple days",
  },
  {
    id: "week_plus",
    label: "A week or more",
    emoji: "📋",
    desc: "Ongoing for a while",
  },
];

const SEVERITIES = [
  {
    id: "mild",
    label: "Mild",
    emoji: "😐",
    desc: "Barely noticeable. Eating, drinking, acting mostly normal.",
    color: "#2d6a4f",
    bg: "#e8f5e9",
    border: "#c8e6c9",
  },
  {
    id: "moderate",
    label: "Moderate",
    emoji: "😟",
    desc: "Clearly not themselves. Something is off but they're responsive.",
    color: "#e65100",
    bg: "#fff3e0",
    border: "#ffe0b2",
  },
  {
    id: "severe",
    label: "Severe",
    emoji: "😰",
    desc: "Visibly distressed, in pain, or not responding normally.",
    color: "#c62828",
    bg: "#fce8e8",
    border: "#f5c6c6",
  },
];

export default function SymptomCheckerChatPage() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [selectedPet, setSelectedPet] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [triageResult, setTriageResult] = useState(null);
  const [differentials, setDifferentials] = useState([]);
  const [triageCardExpanded, setTriageCardExpanded] = useState(true);
  const [nearbyVets, setNearbyVets] = useState([]);
  const [guestMode, setGuestMode] = useState(false);
  const [guestPet, setGuestPet] = useState({ species: "", breed: "", age: "" });
  const [freeCheckUsed, setFreeCheckUsed] = useState(false);
  const [triageMounted, setTriageMounted] = useState(false);
  const [ready, setReady] = useState(false); // prevents flash before session loads

  // Guided flow
  const [guidedStep, setGuidedStep] = useState(1); // 1, 2, 3, or "chat"
  const [guidedAnswers, setGuidedAnswers] = useState({
    area: null,
    duration: null,
    severity: null,
  });
  const [stepDirection, setStepDirection] = useState(1);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isChromeiOS, setIsChromeiOS] = useState(false);
  const inputRef = useRef(null);

  // ── Auth ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // ── Load session from sessionStorage on mount ─────────────────────
  // Guard with a ref so React Strict Mode's double-invoke doesn't
  // redirect on the second run (which sees autoStart already cleared).
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (!saved) {
        router.replace("/symptom-checker");
        return;
      }
      const parsed = JSON.parse(saved);

      if (parsed.autoStart && parsed.selectedPet) {
        // Fresh check for a named pet — start guided flow
        setSelectedPet(parsed.selectedPet);
        setGuestMode(false);
        setGuidedStep(1);
        setReady(true);
      } else if (parsed.autoStart && parsed.guestMode) {
        // Fresh guest check
        setGuestMode(true);
        setGuestPet(parsed.guestPet || { species: "", breed: "", age: "" });
        setGuidedStep(1);
        setReady(true);
      } else if (parsed.messages?.length > 0) {
        // Resume a saved session
        setSelectedPet(parsed.selectedPet || null);
        setMessages(parsed.messages || []);
        setTriageResult(parsed.triageResult || null);
        setDifferentials(parsed.differentials || []);
        setGuestMode(parsed.guestMode || false);
        setGuestPet(parsed.guestPet || { species: "", breed: "", age: "" });
        setFreeCheckUsed(parsed.freeCheckUsed || false);
        setGuidedStep("chat");
        setReady(true);
      } else {
        router.replace("/symptom-checker");
      }
    } catch (e) {
      router.replace("/symptom-checker");
    }
  }, []);

  // ── Persist session ───────────────────────────────────────────────
  useEffect(() => {
    if (!ready || messages.length === 0) return;
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          selectedPet,
          messages,
          triageResult,
          differentials,
          guestMode,
          guestPet,
          freeCheckUsed,
        }),
      );
    } catch (e) {}
  }, [
    messages,
    triageResult,
    differentials,
    selectedPet,
    guestMode,
    freeCheckUsed,
    ready,
  ]);

  // ── Scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Focus input ───────────────────────────────────────────────────
  useEffect(() => {
    if (guidedStep !== "chat") return;
    const isMobile = window.innerWidth < 768;
    if (!isMobile) inputRef.current?.focus();
  }, [guidedStep]);

  // ── Speech recognition support check ─────────────────────────────
  // Explicit checks — never rely on the API existing as a proxy for "works".
  // Firefox defines nothing. Chrome/FF iOS define it but Apple blocks access.
  useEffect(() => {
    const ua = navigator.userAgent;

    // Always block these — they either have no API or it doesn't work
    const isFirefox = ua.includes("Firefox") || ua.includes("FxiOS");
    const isChromeIOS = ua.includes("CriOS"); // Chrome on iPhone/iPad
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const isNonSafariIOS = isIOS && !ua.includes("Safari"); // any iOS browser that isn't Safari

    if (isFirefox || isChromeIOS || isNonSafariIOS) {
      setSpeechSupported(false);
      return;
    }

    // For everything else, check if the API actually exists
    const api = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!api);
  }, []);

  // ── Voice recording ───────────────────────────────────────────────
  function toggleRecording() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return; // Button shouldn't show — guard just in case

    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
    };
    recognition.onerror = (e) => {
      setRecording(false);
      if (e.error === "not-allowed") {
        // Safari iOS: Settings > Safari > Microphone > Allow
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const msg = isIOS
          ? "Mic access denied. On iPhone: Settings → Safari → Microphone → Allow."
          : "Mic access denied. Please allow microphone access in your browser settings.";
        alert(msg);
      }
    };
    recognition.onend = () => setRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }

  // ── Triage card mount — fires on every entry into chat ────────────
  useEffect(() => {
    if (!triageResult || guidedStep !== "chat") return;
    setTriageMounted(false);
    const raf = requestAnimationFrame(() => setTriageMounted(true));
    supabase
      .from("vets")
      .select("*")
      .eq("status", "active")
      .limit(3)
      .then(({ data }) => setNearbyVets(data || []));
    return () => cancelAnimationFrame(raf);
  }, [triageResult, guidedStep]);

  // ── Reset ─────────────────────────────────────────────────────────
  function resetSession() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
    router.push("/symptom-checker");
  }

  // ── Guided flow ───────────────────────────────────────────────────
  function selectArea(area) {
    setGuidedAnswers((a) => ({ ...a, area }));
    setStepDirection(1);
    setGuidedStep(2);
  }

  function selectDuration(duration) {
    setGuidedAnswers((a) => ({ ...a, duration }));
    setStepDirection(1);
    setGuidedStep(3);
  }

  async function selectSeverity(severity) {
    const answers = { ...guidedAnswers, severity };
    setGuidedAnswers(answers);
    setStepDirection(1);
    setGuidedStep("chat");

    const areaLabel =
      SYMPTOM_AREAS.find((a) => a.id === answers.area)?.label || answers.area;
    const durationLabel =
      DURATIONS.find((d) => d.id === answers.duration)?.label ||
      answers.duration;
    const petName = selectedPet?.name;
    const petDesc = selectedPet
      ? `${selectedPet.name} (${[selectedPet.species, selectedPet.breed]
          .filter(Boolean)
          .join(", ")})`
      : guestPet.species
        ? `my ${[guestPet.breed, guestPet.species].filter(Boolean).join(" ")}${
            guestPet.age ? ", " + guestPet.age + " old" : ""
          }`
        : "my pet";

    const firstMessage = `I'm checking on ${petDesc}. The issue is related to their **${areaLabel}**. It started **${durationLabel.toLowerCase()}** and seems **${severity.toLowerCase()}** in severity. What should I know?`;
    const greeting = `Hi! I'm here to help check on ${
      petName || "your pet"
    }. 🐾\n\nBefore we start, please know that I provide triage guidance only — I'm not a veterinarian or medical professional, and this is not a substitute for professional veterinary care.\n\nNow, tell me — what's going on with ${
      petName || "your pet"
    } today? Describe what you're seeing and I'll ask a few follow-up questions.`;

    const greetingMessage = { role: "assistant", content: greeting };
    const userMessage = { role: "user", content: firstMessage };
    setMessages([greetingMessage, userMessage]);
    await callAPI([userMessage]);
  }

  // ── API ───────────────────────────────────────────────────────────
  async function callAPI(apiMessages) {
    setLoading(true);
    try {
      const res = await fetch("/api/symptom-checker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          pet: selectedPet || (guestMode ? guestPet : null),
        }),
      });
      const data = await res.json();
      const content =
        data.content || "Sorry, something went wrong. Please try again.";

      let newTriageResult = null;
      if (content.includes("[TRIAGE_RESULT: EMERGENCY]"))
        newTriageResult = "EMERGENCY";
      else if (content.includes("[TRIAGE_RESULT: SEE_VET]"))
        newTriageResult = "SEE_VET";
      else if (content.includes("[TRIAGE_RESULT: MONITOR]"))
        newTriageResult = "MONITOR";

      const diffMatch = content.match(/\[DIFFERENTIALS:\s*([^\]]+)\]/);
      const parsedDiffs = diffMatch
        ? diffMatch[1]
            .split(",")
            .map((d) => d.trim())
            .filter(Boolean)
        : [];
      if (parsedDiffs.length > 0) setDifferentials(parsedDiffs);

      if (newTriageResult) {
        setTriageResult(newTriageResult);
        setTriageCardExpanded(true);
        if (guestMode) setFreeCheckUsed(true);
      }

      const cleanContent = content
        .replace(/\[TRIAGE_RESULT: EMERGENCY\]/g, "")
        .replace(/\[TRIAGE_RESULT: SEE_VET\]/g, "")
        .replace(/\[TRIAGE_RESULT: MONITOR\]/g, "")
        .replace(/\[DIFFERENTIALS:[^\]]*\]/g, "")
        .trim();

      const assistantMessage = { role: "assistant", content: cleanContent };
      setMessages((prev) => [...prev, assistantMessage]);

      if (session && selectedPet && newTriageResult) {
        await supabase.from("symptom_checks").insert({
          pet_id: selectedPet.id,
          owner_id: session.user.id,
          triage_result: newTriageResult,
          differentials: parsedDiffs,
          transcript: JSON.stringify([...apiMessages, assistantMessage]),
          created_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ]);
    }
    setLoading(false);
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
      const apiMessages = updatedMessages
        .filter((_, i) => !(i === 0 && updatedMessages[0].role === "assistant"))
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/symptom-checker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
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

      const diffMatch = content.match(/\[DIFFERENTIALS:\s*([^\]]+)\]/);
      const parsedDiffs = diffMatch
        ? diffMatch[1]
            .split(",")
            .map((d) => d.trim())
            .filter(Boolean)
        : [];
      if (parsedDiffs.length > 0) setDifferentials(parsedDiffs);

      if (newTriageResult !== triageResult) {
        setTriageResult(newTriageResult);
        setTriageCardExpanded(true);
      }

      const cleanContent = content
        .replace(/\[TRIAGE_RESULT: EMERGENCY\]/g, "")
        .replace(/\[TRIAGE_RESULT: SEE_VET\]/g, "")
        .replace(/\[TRIAGE_RESULT: MONITOR\]/g, "")
        .replace(/\[DIFFERENTIALS:[^\]]*\]/g, "")
        .trim();

      const assistantMessage = { role: "assistant", content: cleanContent };
      setMessages((prev) => [...prev, assistantMessage]);

      if (session && selectedPet && content.includes("[TRIAGE_RESULT:")) {
        await supabase.from("symptom_checks").insert({
          pet_id: selectedPet.id,
          owner_id: session.user.id,
          triage_result: newTriageResult,
          differentials: parsedDiffs,
          transcript: JSON.stringify([...updatedMessages, assistantMessage]),
          created_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
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

  // ── Render helpers ────────────────────────────────────────────────
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
                  k % 2 === 1 ? <strong key={k}>{part}</strong> : part,
                )}
              </p>
            );
          })}
        </div>
      </div>
    );
  }

  function renderTriageCard() {
    if (!triageResult || !triageMounted) return null;
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
          marginBottom: "10px",
          background: config.bg,
          border: `2px solid ${config.border}`,
          borderRadius: "12px",
          overflow: "hidden",
          cursor: triageCardExpanded ? "default" : "pointer",
        }}
        onClick={
          !triageCardExpanded ? () => setTriageCardExpanded(true) : undefined
        }
      >
        <motion.div
          initial={false}
          animate={{
            opacity: triageCardExpanded ? 0 : 1,
            height: triageCardExpanded ? 0 : "auto",
          }}
          transition={{
            opacity: { duration: 0.2, delay: triageCardExpanded ? 0 : 0.2 },
            height: { duration: 0.3, delay: triageCardExpanded ? 0 : 0.15 },
          }}
          style={{ overflow: "hidden" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
            }}
          >
            <span style={{ fontSize: "16px" }}>{config.emoji}</span>
            <span
              style={{
                fontWeight: "700",
                fontSize: "14px",
                color: config.color,
                flex: 1,
              }}
            >
              {config.label}
            </span>
            <span
              style={{ fontSize: "12px", color: config.color, opacity: 0.7 }}
            >
              Tap to expand ↓
            </span>
          </div>
        </motion.div>
        <motion.div
          initial={false}
          animate={{
            opacity: triageCardExpanded ? 1 : 0,
            height: triageCardExpanded ? "auto" : 0,
          }}
          transition={{
            opacity: { duration: 0.2, delay: triageCardExpanded ? 0.2 : 0 },
            height: { duration: 0.3, delay: triageCardExpanded ? 0.15 : 0 },
          }}
          style={{ overflow: "hidden" }}
        >
          <div style={{ padding: "16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "6px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span style={{ fontSize: "20px" }}>{config.emoji}</span>
                <span
                  style={{
                    fontWeight: "700",
                    fontSize: "16px",
                    color: config.color,
                  }}
                >
                  {config.label}
                </span>
              </div>
              <button
                onClick={() => setTriageCardExpanded(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: config.color,
                  opacity: 0.7,
                  padding: "2px 4px",
                  fontWeight: "600",
                }}
              >
                Collapse ↑
              </button>
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

            {differentials.length > 0 && (
              <div style={{ marginBottom: "14px" }}>
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
                  Could be
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {differentials.map((d, i) => (
                    <span
                      key={i}
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        background: "#fff",
                        border: `1px solid ${config.border}`,
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: config.color,
                      }}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

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
        </motion.div>
      </div>
    );
  }

  // ── Guided flow screens ───────────────────────────────────────────
  function renderGuidedFlow() {
    const petName = selectedPet?.name || guestPet.species || "your pet";
    const stepVariants = {
      enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
      center: { x: 0, opacity: 1 },
      exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
    };
    const stepNum = guidedStep === 1 ? 1 : guidedStep === 2 ? 2 : 3;

    return (
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "20px",
          fontFamily: "system-ui, sans-serif",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <style>{`
          .guided-area-card { border: 2px solid #e8e8e8; border-radius: 14px; padding: 14px 16px; cursor: pointer; background: #fff; display: flex; align-items: center; gap: 14px; transition: all 0.15s ease; margin-bottom: 10px; }
          .guided-area-card:hover { border-color: #2d6a4f; background: #f0f7f4; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(45,106,79,0.1); }
          .guided-pill { border: 2px solid #e8e8e8; border-radius: 50px; padding: 12px 20px; cursor: pointer; background: #fff; display: flex; align-items: center; gap: 10px; transition: all 0.15s ease; }
          .guided-pill:hover { border-color: #2d6a4f; background: #f0f7f4; }
          .guided-severity-card { border: 2px solid #e8e8e8; border-radius: 16px; padding: 18px 20px; cursor: pointer; background: #fff; transition: all 0.15s ease; margin-bottom: 12px; }
          .guided-severity-card:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
        `}</style>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <button
            onClick={() => {
              if (guidedStep === 1) router.push("/symptom-checker");
              else {
                setStepDirection(-1);
                setGuidedStep((s) => s - 1);
              }
            }}
            style={{
              background: "none",
              border: "none",
              color: "#2d6a4f",
              fontSize: "14px",
              cursor: "pointer",
              padding: 0,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            ← Back
          </button>
          
        </div>

        {selectedPet && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "20px",
              padding: "10px 14px",
              background: "#f9f9f9",
              borderRadius: "10px",
              border: "1px solid #eee",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "#e8f5e9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                fontSize: "16px",
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
              ) : (
                "🐾"
              )}
            </div>
            <span
              style={{ fontWeight: "600", fontSize: "13px", color: "#111" }}
            >
              Checking on {selectedPet.name}
            </span>
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

        <div style={{ marginBottom: "28px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: "700",
                color: "#2d6a4f",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Step {stepNum} of 3
            </span>
            <span style={{ fontSize: "12px", color: "#aaa" }}>
              {stepNum === 1 ? "Area" : stepNum === 2 ? "Duration" : "Severity"}
            </span>
          </div>
          <div
            style={{
              height: "4px",
              background: "#eee",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(stepNum / 3) * 100}%`,
                background: "#2d6a4f",
                borderRadius: "4px",
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait" custom={stepDirection}>
          {guidedStep === 1 && (
            <motion.div
              key="step1"
              custom={stepDirection}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <h2
                style={{
                  margin: "0 0 6px 0",
                  fontSize: "1.3rem",
                  fontWeight: "700",
                  color: "#111",
                }}
              >
                What area is the problem?
              </h2>
              <p
                style={{
                  margin: "0 0 20px 0",
                  fontSize: "14px",
                  color: "#888",
                }}
              >
                Tap the one that best describes what's going on with {petName}.
              </p>
              {SYMPTOM_AREAS.map((area) => (
                <div
                  key={area.id}
                  className="guided-area-card"
                  onClick={() => selectArea(area.id)}
                >
                  <span
                    style={{
                      fontSize: "28px",
                      flexShrink: 0,
                      width: "40px",
                      textAlign: "center",
                    }}
                  >
                    {area.emoji}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: "0 0 2px 0",
                        fontWeight: "700",
                        fontSize: "15px",
                        color: "#111",
                      }}
                    >
                      {area.label}
                    </p>
                    <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>
                      {area.desc}
                    </p>
                  </div>
                  <span
                    style={{ color: "#ccc", fontSize: "18px", flexShrink: 0 }}
                  >
                    →
                  </span>
                </div>
              ))}
            </motion.div>
          )}

          {guidedStep === 2 && (
            <motion.div
              key="step2"
              custom={stepDirection}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <h2
                style={{
                  margin: "0 0 6px 0",
                  fontSize: "1.3rem",
                  fontWeight: "700",
                  color: "#111",
                }}
              >
                How long has this been going on?
              </h2>
              <p
                style={{
                  margin: "0 0 20px 0",
                  fontSize: "14px",
                  color: "#888",
                }}
              >
                Give your best estimate — it helps with the assessment.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                {DURATIONS.map((d) => (
                  <div
                    key={d.id}
                    className="guided-pill"
                    onClick={() => selectDuration(d.id)}
                    style={{
                      flexDirection: "column",
                      alignItems: "flex-start",
                      padding: "18px",
                      borderRadius: "14px",
                    }}
                  >
                    <span style={{ fontSize: "28px", marginBottom: "8px" }}>
                      {d.emoji}
                    </span>
                    <p
                      style={{
                        margin: "0 0 4px 0",
                        fontWeight: "700",
                        fontSize: "15px",
                        color: "#111",
                      }}
                    >
                      {d.label}
                    </p>
                    <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>
                      {d.desc}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {guidedStep === 3 && (
            <motion.div
              key="step3"
              custom={stepDirection}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <h2
                style={{
                  margin: "0 0 6px 0",
                  fontSize: "1.3rem",
                  fontWeight: "700",
                  color: "#111",
                }}
              >
                How severe does it seem?
              </h2>
              <p
                style={{
                  margin: "0 0 20px 0",
                  fontSize: "14px",
                  color: "#888",
                }}
              >
                Use your best judgment — you know {petName} best.
              </p>
              {SEVERITIES.map((s) => (
                <div
                  key={s.id}
                  className="guided-severity-card"
                  style={{ borderColor: "#e8e8e8" }}
                  onClick={() => selectSeverity(s.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = s.color;
                    e.currentTarget.style.background = s.bg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#e8e8e8";
                    e.currentTarget.style.background = "#fff";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                    }}
                  >
                    <span style={{ fontSize: "32px", flexShrink: 0 }}>
                      {s.emoji}
                    </span>
                    <div>
                      <p
                        style={{
                          margin: "0 0 4px 0",
                          fontWeight: "700",
                          fontSize: "16px",
                          color: s.color,
                        }}
                      >
                        {s.label}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "13px",
                          color: "#555",
                          lineHeight: "1.5",
                        }}
                      >
                        {s.desc}
                      </p>
                    </div>
                    <span
                      style={{
                        marginLeft: "auto",
                        color: "#ccc",
                        fontSize: "18px",
                        flexShrink: 0,
                      }}
                    >
                      →
                    </span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <p
          style={{
            margin: "24px 0 0 0",
            fontSize: "11px",
            color: "#bbb",
            textAlign: "center",
          }}
        >
          ⚕️ PetParrk is not a veterinary service. Always consult a licensed
          veterinarian.
        </p>
      </div>
    );
  }

  if (!ready) return null;

  // ── Guided steps 1–3 ─────────────────────────────────────────────
  if (guidedStep !== "chat") return renderGuidedFlow();

  // ── Chat screen ───────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .chat-input { width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid #ddd; font-size: 14px; font-family: system-ui, sans-serif; outline: none; resize: none; box-sizing: border-box; }
        .chat-input:focus { border-color: #2d6a4f; }
        .send-btn { padding: 12px 20px; background: #2d6a4f; color: #fff; border: none; border-radius: 12px; font-size: 14px; cursor: pointer; font-weight: 600; white-space: nowrap; }
        .send-btn:hover { background: #245a42; }
        .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        @keyframes dotBounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-5px); opacity: 1; } }
        @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(198,40,40,0.4); } 50% { box-shadow: 0 0 0 6px rgba(198,40,40,0); } }
        .thinking-dot { width: 7px; height: 7px; border-radius: 50%; background: #999; display: inline-block; animation: dotBounce 1.2s infinite ease-in-out; }
        .thinking-dot:nth-child(1) { animation-delay: 0s; }
        .thinking-dot:nth-child(2) { animation-delay: 0.2s; }
        .thinking-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>

      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "20px",
          fontFamily: "system-ui, sans-serif",
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <button
            onClick={() => router.push("/symptom-checker")}
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
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <textarea
                ref={inputRef}
                className="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  recording
                    ? "Listening..."
                    : triageResult
                      ? "Ask a follow-up question..."
                      : "Add more detail or ask a follow-up..."
                }
                rows={2}
                style={{
                  paddingRight: speechSupported ? "42px" : "14px",
                  borderColor: recording ? "#2d6a4f" : undefined,
                  display: "block",
                }}
              />
              {speechSupported && (
                <button
                  onClick={toggleRecording}
                  title={recording ? "Stop recording" : "Record voice"}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "24px",
                    height: "24px",
                    borderRadius: "4px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: "15px",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: recording ? "#c62828" : "#bbb",
                    animation: recording ? "pulse 1.2s infinite" : "none",
                    lineHeight: 1,
                  }}
                >
                  {recording ? "⏹" : "🎙"}
                </button>
              )}
            </div>
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
