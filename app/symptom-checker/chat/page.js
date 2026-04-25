"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const SESSION_KEY = "petparrk_symptom_session";
const NAVBAR_H = 64;

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
    emoji: "🕐",
    desc: "Less than an hour ago",
  },
  { id: "today", label: "Today", emoji: "🌤️", desc: "Started sometime today" },
  {
    id: "few_days",
    label: "2–3 days",
    emoji: "📅",
    desc: "Been going on a couple days",
  },
  {
    id: "week_plus",
    label: "A week or more",
    emoji: "🗓️",
    desc: "Ongoing for a while",
  },
];
const SEVERITIES = [
  {
    id: "mild",
    label: "Mild",
    emoji: "😐",
    desc: "Barely noticeable. Eating, drinking, acting mostly normal.",
    color: C.success,
    bg: "#EDFAF3",
    border: "#A7F3D0",
  },
  {
    id: "moderate",
    label: "Moderate",
    emoji: "😟",
    desc: "Clearly not themselves. Something is off but they're responsive.",
    color: "#B45309",
    bg: "#FFFBEB",
    border: "#FCD34D",
  },
  {
    id: "severe",
    label: "Severe",
    emoji: "😰",
    desc: "Visibly distressed, in pain, or not responding normally.",
    color: C.error,
    bg: "#FCEAEA",
    border: "#F5C6C6",
  },
];

function PetChip({ selectedPet, onStartOver }) {
  if (!selectedPet) return null;
  return (
    <div
      style={{
        marginBottom: "14px",
        padding: "10px 14px",
        background: "#fff",
        borderRadius: "12px",
        border: `1px solid ${C.border}`,
        color: C.navyDark,
        cursor: "default",
      }}
    >
      {/* Top row: avatar + name + desktop actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: C.cream,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            fontSize: "16px",
            border: `1.5px solid ${C.border}`,
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="pc-name">Checking on {selectedPet.name}</p>
          <p style={{ margin: 0, fontSize: "13px", color: C.muted }}>
            {[selectedPet.species, selectedPet.breed]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {/* Desktop: actions stay in the top row */}
        <div className="pc-desk-actions">
          <span
            style={{
              fontSize: "12px",
              background: C.cream,
              padding: "4px 10px",
              borderRadius: "20px",
              color: C.navyDark,
              fontWeight: "700",
              border: `1px solid ${C.border}`,
              whiteSpace: "nowrap",
            }}
          >
            Triage
          </span>
          <button onClick={onStartOver} className="start-over-btn">
            ↩ Start over
          </button>
        </div>
      </div>
      {/* Mobile: actions on second row, indented past avatar */}
      <div className="pc-mob-actions">
        <span
          style={{
            fontSize: "12px",
            background: C.cream,
            padding: "4px 10px",
            borderRadius: "20px",
            color: C.navyDark,
            fontWeight: "700",
            border: `1px solid ${C.border}`,
            whiteSpace: "nowrap",
          }}
        >
          Triage
        </span>
        <button onClick={onStartOver} className="start-over-btn">
          ↩ Start over
        </button>
      </div>
    </div>
  );
}

export default function SymptomCheckerChatPage() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [selectedPet, setSelectedPet] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [triageResult, setTriageResult] = useState(null);
  const [differentials, setDifferentials] = useState([]);
  const [triageCardExpanded, setTriageCardExpanded] = useState(true);
  const [nearbyVets, setNearbyVets] = useState([]);
  const [guestMode, setGuestMode] = useState(false);
  const [guestPet, setGuestPet] = useState({ species: "", breed: "", age: "" });
  const [freeCheckUsed, setFreeCheckUsed] = useState(false);
  const [triageMounted, setTriageMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [guidedStep, setGuidedStep] = useState(1);
  const [guidedAnswers, setGuidedAnswers] = useState({
    area: null,
    duration: null,
    severity: null,
  });
  const [stepDirection, setStepDirection] = useState(1);
  const [recording, setRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const messagesAreaRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

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
        setSelectedPet(parsed.selectedPet);
        setGuidedStep(1);
        setReady(true);
      } else if (parsed.autoStart && parsed.guestMode) {
        setGuestMode(true);
        setGuestPet(parsed.guestPet || { species: "", breed: "", age: "" });
        setGuidedStep(1);
        setReady(true);
      } else if (parsed.messages?.length > 0) {
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

  // Auto-scroll to bottom of messages area on new content
  useEffect(() => {
    if (messagesAreaRef.current) {
      messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // When triage first appears — scroll messages area to TOP so user sees result card
  useEffect(() => {
    if (!triageResult || guidedStep !== "chat") return;
    setTriageMounted(false);
    requestAnimationFrame(() => {
      setTriageMounted(true);
      setTimeout(() => {
        if (messagesAreaRef.current)
          messagesAreaRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }, 150);
    });
    supabase
      .from("vets")
      .select("*")
      .eq("status", "active")
      .limit(3)
      .then(({ data }) => setNearbyVets(data || []));
  }, [triageResult, guidedStep]);

  useEffect(() => {
    if (guidedStep !== "chat") return;
    if (window.innerWidth >= 768) textareaRef.current?.focus();
  }, [guidedStep]);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (ua.includes("Firefox") || ua.includes("FxiOS") || ua.includes("CriOS"))
      return;
    if (/iPhone|iPad|iPod/.test(ua) && !ua.includes("Safari")) return;
    setSpeechSupported(
      !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    );
  }, []);

  // Auto-resize textarea
  const adjustTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, []);

  function handleInputChange(e) {
    setInput(e.target.value);
    adjustTextarea();
  }

  function toggleRecording() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = "en-US";
    r.onresult = (e) => {
      setInput((p) =>
        p ? p + " " + e.results[0][0].transcript : e.results[0][0].transcript,
      );
      setTimeout(adjustTextarea, 10);
    };
    r.onerror = (e) => {
      setRecording(false);
      if (e.error === "not-allowed") alert("Mic access denied.");
    };
    r.onend = () => setRecording(false);
    recognitionRef.current = r;
    r.start();
    setRecording(true);
  }

  function resetSession() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
    router.push("/symptom-checker");
  }
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

  function processContent(content, prevTriage) {
    let newTriage = prevTriage;
    if (content.includes("[TRIAGE_RESULT: EMERGENCY]")) newTriage = "EMERGENCY";
    else if (content.includes("[TRIAGE_RESULT: SEE_VET]"))
      newTriage = "SEE_VET";
    else if (content.includes("[TRIAGE_RESULT: MONITOR]"))
      newTriage = "MONITOR";
    const diffMatch = content.match(/\[DIFFERENTIALS:\s*([^\]]+)\]/);
    const parsedDiffs = diffMatch
      ? diffMatch[1]
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean)
      : [];
    const clean = content
      .replace(/\[TRIAGE_RESULT: EMERGENCY\]/g, "")
      .replace(/\[TRIAGE_RESULT: SEE_VET\]/g, "")
      .replace(/\[TRIAGE_RESULT: MONITOR\]/g, "")
      .replace(/\[DIFFERENTIALS:[^\]]*\]/g, "")
      .trim();
    return { newTriage, parsedDiffs, clean };
  }

  async function callStream(apiMessages, onChunk, onDone) {
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
    if (!res.ok || !res.body) throw new Error("Stream failed");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      full += decoder.decode(value, { stream: true });
      onChunk(full);
    }
    onDone(full);
  }

  async function selectSeverity(severity) {
    const answers = { ...guidedAnswers, severity };
    setGuidedAnswers(answers);
    setStepDirection(1);
    setGuidedStep("chat");
    const areaLabel =
      SYMPTOM_AREAS.find((a) => a.id === answers.area)?.label || answers.area;
    const durLabel =
      DURATIONS.find((d) => d.id === answers.duration)?.label ||
      answers.duration;
    const petDesc = selectedPet
      ? `${selectedPet.name} (${[selectedPet.species, selectedPet.breed].filter(Boolean).join(", ")})`
      : guestPet.species
        ? `my ${[guestPet.breed, guestPet.species].filter(Boolean).join(" ")}${guestPet.age ? ", " + guestPet.age + " old" : ""}`
        : "my pet";
    const petName = selectedPet?.name;
    const firstMsg = {
      role: "user",
      content: `I'm checking on ${petDesc}. The issue is related to their **${areaLabel}**. It started **${durLabel.toLowerCase()}** and seems **${severity.toLowerCase()}** in severity. What should I know?`,
    };
    const greetMsg = {
      role: "assistant",
      content: `Hi! I'm here to help check on ${petName || "your pet"}. 🐾\n\nBefore we start, please know that I provide triage guidance only — I'm not a veterinarian or medical professional, and this is not a substitute for professional veterinary care.\n\nNow, tell me — what's going on with ${petName || "your pet"} today? Describe what you're seeing and I'll ask a few follow-up questions.`,
    };
    setMessages([greetMsg, firstMsg, { role: "assistant", content: "" }]);
    setLoading(true);
    setStreaming(true);
    try {
      await callStream(
        [firstMsg],
        (partial) => {
          const { clean } = processContent(partial, null);
          setMessages([
            greetMsg,
            firstMsg,
            { role: "assistant", content: clean },
          ]);
        },
        async (full) => {
          const { newTriage, parsedDiffs, clean } = processContent(full, null);
          const aMsg = { role: "assistant", content: clean };
          setMessages([greetMsg, firstMsg, aMsg]);
          if (parsedDiffs.length > 0) setDifferentials(parsedDiffs);
          if (newTriage) {
            setTriageResult(newTriage);
            setTriageCardExpanded(true);
            if (guestMode) setFreeCheckUsed(true);
          }
          if (session && selectedPet && newTriage)
            await supabase.from("symptom_checks").insert({
              pet_id: selectedPet.id,
              owner_id: session.user.id,
              triage_result: newTriage,
              differentials: parsedDiffs,
              transcript: JSON.stringify([greetMsg, firstMsg, aMsg]),
              created_at: new Date().toISOString(),
            });
        },
      );
    } catch (e) {
      setMessages([
        greetMsg,
        firstMsg,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ]);
    }
    setLoading(false);
    setStreaming(false);
  }

  async function sendMessage() {
    if (!input.trim() || loading || streaming || (guestMode && freeCheckUsed))
      return;
    const userMsg = { role: "user", content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages([...updated, { role: "assistant", content: "" }]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setLoading(true);
    setStreaming(true);
    try {
      const apiMsgs = updated
        .filter((_, i) => !(i === 0 && updated[0].role === "assistant"))
        .map((m) => ({ role: m.role, content: m.content }));
      await callStream(
        apiMsgs,
        (partial) => {
          const { clean } = processContent(partial, triageResult);
          setMessages([...updated, { role: "assistant", content: clean }]);
        },
        async (full) => {
          const { newTriage, parsedDiffs, clean } = processContent(
            full,
            triageResult,
          );
          const aMsg = { role: "assistant", content: clean };
          setMessages([...updated, aMsg]);
          if (parsedDiffs.length > 0) setDifferentials(parsedDiffs);
          if (newTriage && newTriage !== triageResult) {
            setTriageResult(newTriage);
            setTriageCardExpanded(true);
            if (guestMode) setFreeCheckUsed(true);
          }
          if (session && selectedPet && full.includes("[TRIAGE_RESULT:"))
            await supabase.from("symptom_checks").insert({
              pet_id: selectedPet.id,
              owner_id: session.user.id,
              triage_result: newTriage,
              differentials: parsedDiffs,
              transcript: JSON.stringify([...updated, aMsg]),
              created_at: new Date().toISOString(),
            });
        },
      );
    } catch (e) {
      setMessages([
        ...updated,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ]);
    }
    setLoading(false);
    setStreaming(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function renderMsg(msg, i) {
    const isUser = msg.role === "user";
    const isStreamingMsg = streaming && i === messages.length - 1 && !isUser;
    const lines = msg.content.split("\n");
    return (
      <div
        key={i}
        style={{
          display: "flex",
          justifyContent: isUser ? "flex-end" : "flex-start",
          marginBottom: "14px",
          alignItems: "flex-start",
        }}
      >
        {!isUser && (
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              background: C.terracotta,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginRight: "8px",
              marginTop: "2px",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="-1.5 -1 21 25"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
            >
              <circle cx="9" cy="1.5" r="1.5" fill="white" />
              <line
                x1="9"
                y1="3"
                x2="9"
                y2="7"
                stroke="white"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <rect
                x="0"
                y="7"
                width="18"
                height="15"
                rx="4"
                stroke="white"
                strokeWidth="1.3"
              />
              <circle
                cx="0"
                cy="14.5"
                r="2.2"
                stroke="white"
                strokeWidth="1.2"
              />
              <circle
                cx="18"
                cy="14.5"
                r="2.2"
                stroke="white"
                strokeWidth="1.2"
              />
              <circle cx="4.5" cy="12" r="2.2" fill="white" />
              <circle cx="13.5" cy="12" r="2.2" fill="white" />
              <path
                d="M3 16.5 Q9 20 15 16.5"
                stroke="white"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          </div>
        )}
        <div
          style={{
            maxWidth: "78%",
            background: isUser ? C.navyMid : "#fff",
            color: isUser ? "#fff" : C.navyDark,
            padding: "12px 16px",
            borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
            fontSize: "15px",
            lineHeight: "1.65",
            border: isUser ? "none" : `1px solid ${C.border}`,
            boxShadow: isUser ? "none" : "0 1px 4px rgba(23,37,49,0.06)",
          }}
        >
          {msg.content === "" && isStreamingMsg ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "2px 0",
              }}
            >
              <span className="dot-bounce" />
              <span className="dot-bounce" style={{ animationDelay: "0.2s" }} />
              <span className="dot-bounce" style={{ animationDelay: "0.4s" }} />
            </div>
          ) : (
            lines.map((line, j) => {
              const parts = line.split(/\*\*(.*?)\*\*/g);
              return (
                <p
                  key={j}
                  style={{
                    margin: j === lines.length - 1 ? 0 : "0 0 6px",
                    color: isUser ? "#fff" : C.navyDark,
                  }}
                >
                  {parts.map((p, k) =>
                    k % 2 === 1 ? <strong key={k}>{p}</strong> : p,
                  )}
                </p>
              );
            })
          )}
        </div>
        {isUser && (
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              background: C.navyMid,
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginLeft: "8px",
              marginTop: "2px",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                filter: "brightness(0) invert(1)",
                display: "block",
                lineHeight: 1,
              }}
            >
              🐾
            </span>
          </div>
        )}
      </div>
    );
  }

  function renderTriageCard() {
    if (!triageResult || !triageMounted) return null;
    const cfg = {
      EMERGENCY: {
        emoji: "🔴",
        label: "Emergency — Act Now",
        color: "#C94040",
        bg: "#FCEAEA",
        border: "#F5C6C6",
        msg: "Take your pet to an emergency vet immediately. Don't wait.",
        vetLabel: "24-Hour Emergency Vets",
      },
      SEE_VET: {
        emoji: "🟡",
        label: "See a Vet Soon",
        color: "#B45309",
        bg: "#FFFBEB",
        border: "#FCD34D",
        msg: "Schedule an appointment within 24–48 hours.",
        vetLabel: "Nearby Vets",
      },
      MONITOR: {
        emoji: "🟢",
        label: "Monitor at Home",
        color: "#2A7D4F",
        bg: "#EDFAF3",
        border: "#A7F3D0",
        msg: "Watch carefully for the next 24 hours.",
        vetLabel: null,
      },
    }[triageResult];
    return (
      <div
        style={{
          marginBottom: "16px",
          background: cfg.bg,
          border: `2px solid ${cfg.border}`,
          borderRadius: "14px",
          overflow: "hidden",
          cursor: triageCardExpanded ? "default" : "pointer",
        }}
        onClick={
          !triageCardExpanded ? () => setTriageCardExpanded(true) : undefined
        }
      >
        {!triageCardExpanded && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 18px",
            }}
          >
            <span style={{ fontSize: "16px" }}>{cfg.emoji}</span>
            <span
              style={{
                fontWeight: "700",
                fontSize: "14px",
                color: cfg.color,
                flex: 1,
                fontFamily: "var(--font-urbanist,system-ui)",
              }}
            >
              {cfg.label}
            </span>
            <span style={{ fontSize: "12px", color: cfg.color, opacity: 0.7 }}>
              Tap to expand ↓
            </span>
          </div>
        )}
        {triageCardExpanded && (
          <div style={{ padding: "20px 22px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "10px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <span style={{ fontSize: "22px" }}>{cfg.emoji}</span>
                <span
                  style={{
                    fontWeight: "800",
                    fontSize: "17px",
                    color: cfg.color,
                    fontFamily: "var(--font-urbanist,system-ui)",
                  }}
                >
                  {cfg.label}
                </span>
              </div>
              <button
                onClick={() => setTriageCardExpanded(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: cfg.color,
                  opacity: 0.7,
                  padding: "2px 6px",
                  fontWeight: "700",
                }}
              >
                Collapse ↑
              </button>
            </div>
            <p
              style={{
                margin: "0 0 16px",
                fontSize: "15px",
                color: C.navyDark,
                fontWeight: "600",
                lineHeight: "1.6",
              }}
            >
              {cfg.msg}
            </p>
            {differentials.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <p
                  style={{
                    margin: "0 0 8px",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: C.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
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
                        padding: "4px 12px",
                        background: "#fff",
                        border: `1px solid ${cfg.border}`,
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "700",
                        color: cfg.color,
                      }}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {cfg.vetLabel && nearbyVets.length > 0 && (
              <div>
                <p
                  style={{
                    margin: "0 0 10px",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: C.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {cfg.vetLabel}
                </p>
                {nearbyVets.map((vet) => (
                  <div
                    key={vet.id}
                    style={{
                      background: "#fff",
                      borderRadius: "12px",
                      padding: "14px 16px",
                      marginBottom: "8px",
                      border: `1px solid ${C.border}`,
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
                            margin: "0 0 2px",
                            fontWeight: "700",
                            fontSize: "15px",
                            color: C.navyDark,
                            fontFamily: "var(--font-urbanist,system-ui)",
                          }}
                        >
                          {vet.name}
                        </p>
                        <p
                          style={{
                            margin: "0 0 10px",
                            fontSize: "13px",
                            color: C.muted,
                          }}
                        >
                          {[vet.neighborhood, vet.city]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {vet.phone && (
                          <a
                            href={`tel:${vet.phone}`}
                            className="triage-phone-btn"
                            style={{ background: cfg.color }}
                          >
                            {vet.phone}
                          </a>
                        )}
                      </div>
                      <a
                        href={`/vet/${vet.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: "12px",
                          color: C.terracotta,
                          textDecoration: "underline",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          marginTop: "2px",
                          fontWeight: "600",
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
                gap: "10px",
                marginTop: "16px",
                flexWrap: "wrap",
              }}
            >
              <button onClick={resetSession} className="triage-outline-btn">
                Start New Check
              </button>
              {session && (
                <Link
                  href="/profile"
                  className="triage-primary-btn"
                  style={{ background: cfg.color }}
                >
                  View Pet Profile
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!ready) return null;

  // ── GUIDED FLOW — no header, full viewport ──
  if (guidedStep !== "chat") {
    const petName = selectedPet?.name || guestPet.species || "your pet";
    const sv = {
      enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
      center: { x: 0, opacity: 1 },
      exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
    };
    const stepNum = guidedStep === 1 ? 1 : guidedStep === 2 ? 2 : 3;
    return (
      <>
        <style>{`
          .g-card{border:1.5px solid ${C.border};border-radius:14px;padding:18px 18px;cursor:pointer;background:#fff;display:flex;align-items:center;gap:14px;transition:border-color 0.15s,box-shadow 0.15s,transform 0.15s;margin-bottom:10px;color:${C.navyDark};}
          .g-dur{border:1.5px solid ${C.border};border-radius:14px;padding:18px 18px;cursor:pointer;background:#fff;display:flex;flex-direction:column;align-items:center;text-align:center;transition:border-color 0.15s,box-shadow 0.15s,transform 0.15s;color:${C.navyDark};}
          .g-dur:hover{border-color:${C.terracotta};background:#fafaf8;}
          .g-card:hover{border-color:${C.terracotta};background:#fafaf8;}
          .g-sev:hover{border-color:${C.terracotta};background:#fafaf8;}
          .g-sev{border:1.5px solid ${C.border};border-radius:14px;padding:18px 20px;cursor:pointer;background:#fff;transition:border-color 0.15s,background 0.15s,transform 0.15s;margin-bottom:10px;color:${C.navyDark};}
          
        .back-btn { background:none !important; border:none !important; cursor:pointer; font-size:14px; color:${C.terracotta} !important; font-weight:700; font-family:var(--font-urbanist,system-ui); display:inline-flex; align-items:center; gap:4px; line-height:1; padding:0; transition:color 0.15s; outline:none !important; box-shadow:none !important; -webkit-appearance:none; appearance:none; }
        .back-btn:hover { color:#172531 !important; outline:none !important; box-shadow:none !important; }
        .back-btn:active { color:#172531 !important; outline:none !important; box-shadow:none !important; }
        .back-btn:focus { color:${C.terracotta} !important; outline:none !important; box-shadow:none !important; background:none !important; border:none !important; }
        .back-btn:focus-visible { color:${C.terracotta} !important; outline:none !important; box-shadow:none !important; background:none !important; border:none !important; }
        .back-btn:focus:not(:focus-visible) { color:${C.terracotta} !important; outline:none !important; box-shadow:none !important; }
        `}</style>
        {/* Full viewport height, no header */}
        <div
          style={{
            background: C.cream,
            minHeight: `calc(100vh - ${NAVBAR_H}px)`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "30px 24px 40px",
              boxSizing: "border-box",
              //scrollbarGutter: "stable",
            }}
          >
            <div
              style={{
                maxWidth: "768px",
                margin: "0 auto",
                fontFamily: "var(--font-urbanist,system-ui,sans-serif)",
              }}
            >
              <div style={{ marginBottom: "30px", paddingTop: "0px" }}>
                <button
                  onClick={(e) => {
                    e.currentTarget.blur();
                    if (guidedStep === 1) router.push("/symptom-checker");
                    else {
                      setStepDirection(-1);
                      setGuidedStep((s) => s - 1);
                    }
                  }}
                  className="back-btn"
                >
                  ← Back
                </button>
              </div>
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
                      color: C.terracotta,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Step {stepNum} of 3
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: C.muted,
                    }}
                  >
                    {stepNum === 1
                      ? "Area"
                      : stepNum === 2
                        ? "Duration"
                        : "Severity"}
                  </span>
                </div>
                <div
                  style={{
                    height: "4px",
                    background: C.border,
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(stepNum / 3) * 100}%`,
                      background: C.terracotta,
                      borderRadius: "4px",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
              <AnimatePresence mode="wait" custom={stepDirection}>
                {guidedStep === 1 && (
                  <motion.div
                    key="s1"
                    custom={stepDirection}
                    variants={sv}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    <h2
                      style={{
                        margin: "0 0 6px",
                        fontSize: "clamp(20px,3vw,26px)",
                        fontWeight: "800",
                        color: C.navyDark,
                        fontFamily: "var(--font-urbanist,system-ui)",
                      }}
                    >
                      What area is the problem?
                    </h2>
                    <p
                      style={{
                        margin: "0 0 20px",
                        fontSize: "15px",
                        color: C.slate,
                      }}
                    >
                      Tap the one that best describes what's going on with{" "}
                      {petName}.
                    </p>
                    {SYMPTOM_AREAS.map((area) => (
                      <div
                        key={area.id}
                        className="g-card"
                        onClick={() => selectArea(area.id)}
                      >
                        <span
                          style={{
                            fontSize: "26px",
                            flexShrink: 0,
                            width: "36px",
                            textAlign: "center",
                          }}
                        >
                          {area.emoji}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              margin: "0 0 2px",
                              fontWeight: "700",
                              fontSize: "15px",
                              color: C.navyDark,
                              fontFamily: "var(--font-urbanist,system-ui)",
                            }}
                          >
                            {area.label}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "13px",
                              color: C.muted,
                            }}
                          >
                            {area.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
                {guidedStep === 2 && (
                  <motion.div
                    key="s2"
                    custom={stepDirection}
                    variants={sv}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    <h2
                      style={{
                        margin: "0 0 6px",
                        fontSize: "clamp(20px,3vw,26px)",
                        fontWeight: "800",
                        color: C.navyDark,
                        fontFamily: "var(--font-urbanist,system-ui)",
                      }}
                    >
                      How long has this been going on?
                    </h2>
                    <p
                      style={{
                        margin: "0 0 20px",
                        fontSize: "15px",
                        color: C.slate,
                      }}
                    >
                      Give your best estimate — it helps with the assessment.
                    </p>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "10px",
                      }}
                    >
                      {DURATIONS.map((d) => (
                        <div
                          key={d.id}
                          className="g-dur"
                          onClick={() => selectDuration(d.id)}
                        >
                          <span
                            style={{ fontSize: "26px", marginBottom: "10px" }}
                          >
                            {d.emoji}
                          </span>
                          <p
                            style={{
                              margin: "0 0 4px",
                              fontWeight: "700",
                              fontSize: "15px",
                              color: C.navyDark,
                              fontFamily: "var(--font-urbanist,system-ui)",
                            }}
                          >
                            {d.label}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "13px",
                              color: C.muted,
                            }}
                          >
                            {d.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
                {guidedStep === 3 && (
                  <motion.div
                    key="s3"
                    custom={stepDirection}
                    variants={sv}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    <h2
                      style={{
                        margin: "0 0 6px",
                        fontSize: "clamp(20px,3vw,26px)",
                        fontWeight: "800",
                        color: C.navyDark,
                        fontFamily: "var(--font-urbanist,system-ui)",
                      }}
                    >
                      How severe does it seem?
                    </h2>
                    <p
                      style={{
                        margin: "0 0 20px",
                        fontSize: "15px",
                        color: C.slate,
                      }}
                    >
                      Use your best judgment — you know {petName} best.
                    </p>
                    {SEVERITIES.map((s) => (
                      <div
                        key={s.id}
                        className="g-sev"
                        onClick={() => selectSeverity(s.id)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = s.border;
                          e.currentTarget.style.background = s.bg;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = C.border;
                          e.currentTarget.style.background = "#fff";
                        }}
                        onTouchStart={(e) => {
                          e.currentTarget.style.borderColor = s.border;
                          e.currentTarget.style.background = s.bg;
                        }}
                        onTouchEnd={(e) => {
                          e.currentTarget.style.borderColor = C.border;
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
                          <span style={{ fontSize: "30px", flexShrink: 0 }}>
                            {s.emoji}
                          </span>
                          <div>
                            <p
                              style={{
                                margin: "0 0 4px",
                                fontWeight: "800",
                                fontSize: "16px",
                                color: s.color,
                                fontFamily: "var(--font-urbanist,system-ui)",
                              }}
                            >
                              {s.label}
                            </p>
                            <p
                              style={{
                                margin: 0,
                                fontSize: "13px",
                                color: C.slate,
                                lineHeight: "1.5",
                              }}
                            >
                              {s.desc}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              <p
                style={{
                  margin: "24px 0 0",
                  fontSize: "12px",
                  color: C.muted,
                  textAlign: "center",
                }}
              >
                ⚕️ PetParrk is not a veterinary service. Always consult a
                licensed veterinarian.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── CHAT VIEW — fixed layout, no header, full viewport ──
  return (
    <>
      <style>{`
        /* Full-viewport chat shell — page never scrolls, only messages area scrolls */
        .chat-shell {
          position: fixed;
          top: ${NAVBAR_H}px;
          left: 0; right: 0; bottom: 0;
          display: flex;
          flex-direction: column;
          background: ${C.cream};
        }
        .chat-messages {
          flex: 1;
          overflow-y: scroll;
          padding: 30px 24px 20px;
          scrollbar-width: none;
        }
        .chat-messages::-webkit-scrollbar { display: none; }
        .chat-footer {
          border-top: 1px solid ${C.border};
          padding: 12px 24px 16px;
          background: ${C.cream};
          flex-shrink: 0;
        }
































        /* Auto-expanding textarea with icons inside */
        .chat-input-wrap {
          position: relative;
          background: #fff;
          border: 1.5px solid ${C.border};
          border-radius: 16px;
          transition: border-color 0.15s, box-shadow 0.15s;
          display: flex;
          align-items: flex-end;
        }
        /* Remove ALL focus styling on the input wrapper — eliminates orange square on all browsers */
        .chat-input-wrap:focus-within {
          border-color: ${C.border};
          outline: none !important;
          box-shadow: none !important;
        }
        .chat-input-wrap:focus-within * {
          outline: none !important;
          box-shadow: none !important;
        }
        .chat-textarea:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        .chat-input-wrap.recording {
          border-color: ${C.terracotta};
        }
        .chat-textarea {
          flex: 1;
          padding: 13px 16px 13px 16px;
          border: none;
          background: transparent;
          -webkit-tap-highlight-color: transparent;
          font-size: 15px;
          font-family: var(--font-urbanist, system-ui, sans-serif);
          color: ${C.navyDark};
          outline: none;
          resize: none;
          line-height: 1.5;
          min-height: 48px;
          max-height: 180px;
          overflow-y: auto;
          box-sizing: border-box;
        }
        .chat-textarea::placeholder { color: ${C.muted}; }
































        /* Icon buttons inside the input — sit at bottom-right */
        .input-icons {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 0 8px 8px 0;
          flex-shrink: 0;
          align-self: flex-end;
        }
        .icon-btn {
          width: 34px; height: 34px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px;
          font-weight: 900;
          line-height: 1;
          transition: background 0.15s, opacity 0.2s;
          flex-shrink: 0;
          padding: 0;
        }
        .mic-btn {
          background: transparent;
          color: ${C.muted};
          outline: none;
        }
        .mic-btn:hover { background: ${C.cream}; color: ${C.navyDark}; }
        .mic-btn:focus { outline: none; }
        .mic-btn.recording-active { color: ${C.terracotta}; }
        .triage-outline-btn { height:40px; padding:0 20px; background:#fff; border:1.5px solid ${C.border}; border-radius:10px; font-size:14px; cursor:pointer; font-weight:700; font-family:var(--font-urbanist,system-ui); color:${C.navyDark}; transition:background 0.15s,color 0.15s,border-color 0.15s; }
        .triage-outline-btn:hover { background:${C.navyDark}; color:#fff; border-color:${C.navyDark}; }
        .triage-primary-btn { height:40px; padding:0 20px; border-radius:10px; font-size:14px; font-weight:700; font-family:var(--font-urbanist,system-ui); color:#fff; text-decoration:none; display:inline-flex; align-items:center; transition:filter 0.15s; }
        .triage-primary-btn:hover { filter:brightness(0.85); }
        .triage-phone-btn { display:inline-flex; align-items:center; height:40px; padding:0 18px; border-radius:10px; font-size:14px; font-weight:700; color:#fff; text-decoration:none; transition:filter 0.15s; }
        .triage-phone-btn:hover { filter:brightness(0.85); }
        .start-over-btn { background:none; border:none; cursor:pointer; font-size:13px; color:${C.muted}; font-weight:600; padding:0; font-family:var(--font-urbanist,system-ui); white-space:nowrap; flex-shrink:0; margin-left:4px; transition:color 0.15s; text-decoration:none; }
        .start-over-btn:hover { color:${C.terracotta}; text-decoration:underline; text-underline-offset:2px; }
        .back-btn { background:none !important; border:none !important; cursor:pointer; font-size:14px; color:${C.terracotta} !important; font-weight:700; font-family:var(--font-urbanist,system-ui); display:inline-flex; align-items:center; gap:4px; line-height:1; padding:0; transition:color 0.15s; outline:none !important; box-shadow:none !important; -webkit-appearance:none; appearance:none; }
        .back-btn:link, .back-btn:visited { color:${C.terracotta} !important; }
        .back-btn:hover { color:#172531 !important; outline:none !important; box-shadow:none !important; }
        .back-btn:active { color:#172531 !important; outline:none !important; box-shadow:none !important; }
        .back-btn:focus { color:${C.terracotta} !important; outline:none !important; box-shadow:none !important; background:none !important; border:none !important; }
        .back-btn:focus-visible { color:${C.terracotta} !important; outline:none !important; box-shadow:none !important; background:none !important; border:none !important; }
        .back-btn:focus:not(:focus-visible) { color:${C.terracotta} !important; outline:none !important; box-shadow:none !important; }
        .pc-name { margin:0; font-weight:700; font-size:16px; color:${C.navyDark}; font-family:var(--font-urbanist,system-ui); }
        .pc-desk-actions { display:flex; align-items:center; gap:8px; flex-shrink:0; }
        .pc-mob-actions { display:none; }
        @media(max-width:600px) {
          .pc-name { font-size:18px; }
          .pc-desk-actions { display:none; }
          .pc-mob-actions { display:flex; align-items:center; gap:8px; margin-top:8px; padding-top:8px; margin-left:42px; border-top:1px solid ${C.border}; }
        }
        /* Send button — always visible. Gray when empty, navyMid when has content */
        .send-icon-btn {
          background: rgba(155,165,175,0.25);
          color: rgba(120,130,140,0.7);
          opacity: 1;
          pointer-events: none;
          outline: none;
          box-shadow: none;
          transition: background 0.2s, color 0.2s;
        }
        .send-icon-btn.visible {
          background: #CF5C36;
          color: #fff;
          pointer-events: auto;
          cursor: pointer;
        }
        .send-icon-btn.visible:hover { background: #a8471d; }
        .send-icon-btn:focus { outline: none; box-shadow: none; }
































        @keyframes dotBounce { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-5px);opacity:1} }
        .dot-bounce { width:7px;height:7px;border-radius:50%;background:${C.muted};display:inline-block;animation:dotBounce 1.2s infinite ease-in-out; }
      
        .scc-arrow-btn { background:none; border:none; cursor:pointer; padding:0; display:inline-flex; align-items:center; flex-shrink:0; }
        .scc-arrow { display:inline-block; font-size:16px; color:${C.terracotta}; font-weight:700; transition:transform 0.2s ease; }
        .scc-arrow-btn:hover .scc-arrow { transform:translateX(4px); }
      
        .sv-arrow { font-size: 16px; font-weight: 700; color: ${C.terracotta}; background: none; border: none; cursor: pointer; padding: 0; display: inline-flex; align-items: center; gap: 3px; transition: gap 0.2s ease; }
        .sv-arrow:hover { gap: 7px; }
        .sv-arrow .sv-arrow-icon { display: inline-block; transition: transform 0.2s ease; }
        .sv-arrow:hover .sv-arrow-icon { transform: translateX(3px); }
      `}</style>

      <div className="chat-shell">
        {/* Scrollable messages area */}
        <div ref={messagesAreaRef} className="chat-messages">
          <div style={{ maxWidth: "768px", margin: "0 auto" }}>
            <div style={{ marginBottom: "30px", paddingTop: "0px" }}>
              <button
                onClick={(e) => {
                  e.currentTarget.blur();
                  setGuidedStep(3);
                  setMessages([]);
                  setTriageResult(null);
                  setDifferentials([]);
                  setTriageMounted(false);
                }}
                className="back-btn"
              >
                ← Back
              </button>
            </div>
            <PetChip selectedPet={selectedPet} onStartOver={resetSession} />
            {/* Triage card — at top of messages, auto-scrolled to on appearance */}
            {triageResult && renderTriageCard()}
            {/* Messages */}
            {messages.map((msg, i) => renderMsg(msg, i))}
            {guestMode && freeCheckUsed && (
              <div
                style={{
                  textAlign: "center",
                  padding: "24px",
                  background: "#fff",
                  borderRadius: "16px",
                  border: `1px solid ${C.border}`,
                  marginTop: "16px",
                }}
              >
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: "15px",
                    color: C.navyDark,
                    fontWeight: "700",
                  }}
                >
                  You've used your free check.
                </p>
                <p
                  style={{
                    margin: "0 0 20px",
                    fontSize: "14px",
                    color: C.muted,
                  }}
                >
                  Sign up to save history and check as many times as you need.
                </p>
                <Link
                  href="/auth"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    height: "44px",
                    padding: "0 24px",
                    background: C.terracotta,
                    color: "#fff",
                    borderRadius: "12px",
                    textDecoration: "none",
                    fontSize: "15px",
                    fontWeight: "700",
                    fontFamily: "var(--font-urbanist,system-ui)",
                  }}
                >
                  Sign Up Free
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Pinned footer */}
        <div className="chat-footer">
          <div style={{ maxWidth: "768px", margin: "0 auto" }}>
            {!(guestMode && freeCheckUsed) && (
              <div
                className={`chat-input-wrap${recording ? " recording" : ""}`}
              >
                <textarea
                  ref={textareaRef}
                  className="chat-textarea"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    triageResult
                      ? "Ask a follow-up question…"
                      : "Describe what you're seeing…"
                  }
                  rows={1}
                />
                <div className="input-icons">
                  {/* Voice button — always visible if supported */}
                  {speechSupported && (
                    <button
                      className={`icon-btn mic-btn${recording ? " recording-active" : ""}`}
                      onClick={toggleRecording}
                      title={recording ? "Stop recording" : "Record voice"}
                    >
                      {recording ? "⏹" : "🎙"}
                    </button>
                  )}
                  {/* Send button — only appears when input has content */}
                  <button
                    className={`icon-btn send-icon-btn${input.trim() ? " visible" : ""}`}
                    onClick={sendMessage}
                    disabled={loading || streaming || !input.trim()}
                    title="Send"
                  >
                    <svg
                      width="21"
                      height="21"
                      viewBox="0 0 13 14"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{ display: "block" }}
                    >
                      <path
                        d="M6 10.5V1.5M6 1.5L2 5.5M6 1.5L10 5.5"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            <p
              style={{
                margin: "8px 0 0",
                fontSize: "11px",
                color: C.muted,
                textAlign: "center",
                lineHeight: "1.8",
              }}
            >
              ⚕️ PetParrk is not a veterinary service and does not provide
              medical advice.
              <br />
              Always consult a licensed veterinarian.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
