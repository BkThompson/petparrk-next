"use client";

import {
  ArtStomach,
  ArtEyes,
  ArtSkin,
  ArtBreathing,
  ArtBehavior,
  ArtLimping,
  ArtSomethingElse,
} from "../../../components/BrandArt";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dog,
  Cat,
  Bird,
  Rabbit,
  Fish,
  PawPrint,
  Mic,
  CircleStop,
  Clock,
  Sun,
  Calendar,
  CalendarDays,
  CircleAlert,
  TriangleAlert,
  OctagonAlert,
  ChevronDown,
  Clipboard,
  ChevronUp,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import PageLoader from "../../../components/PageLoader";
import {
  triggerVetRecommendation,
  triggerCostEstimate,
  triggerVisitPrep,
} from "../../../lib/copilotApi";
import { renderMarkdown } from "../../../lib/renderMarkdown";

const SESSION_KEY = "petparrk_symptom_session";
const NAVBAR_H = 64;

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

// ── Species helpers (matches profile page logic) ────────────────────────
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

const SYMPTOM_AREAS = [
  {
    id: "stomach",
    label: "Stomach / Digestion",
    art: ArtStomach,
    desc: "Vomiting, diarrhea, not eating",
  },
  {
    id: "eyes_ears",
    label: "Eyes / Ears",
    art: ArtEyes,
    desc: "Discharge, scratching, redness",
  },
  {
    id: "skin",
    label: "Skin / Coat",
    art: ArtSkin,
    desc: "Itching, rash, hair loss, lumps",
  },
  {
    id: "breathing",
    label: "Breathing / Cough",
    art: ArtBreathing,
    desc: "Coughing, wheezing, labored breath",
  },
  {
    id: "behavior",
    label: "Behavior / Energy",
    art: ArtBehavior,
    desc: "Lethargy, hiding, confusion",
  },
  {
    id: "movement",
    label: "Limping / Movement",
    art: ArtLimping,
    desc: "Limping, stiffness, won't stand",
  },
  {
    id: "other",
    label: "Something else",
    art: ArtSomethingElse,
    desc: "Doesn't fit the categories above",
  },
];
const DURATIONS = [
  {
    id: "just_now",
    label: "Just started",
    icon: Clock,
    desc: "Less than an hour ago",
  },
  { id: "today", label: "Today", icon: Sun, desc: "Started sometime today" },
  {
    id: "few_days",
    label: "2–3 days",
    icon: Calendar,
    desc: "Been going on a couple days",
  },
  {
    id: "week_plus",
    label: "A week or more",
    icon: CalendarDays,
    desc: "Ongoing for a while",
  },
];
const SEVERITIES = [
  {
    id: "mild",
    label: "Mild",
    icon: CircleAlert,
    desc: "Barely noticeable. Eating, drinking, acting mostly normal.",
    color: C.success,
    bg: "#EDFAF3",
    border: "#A7F3D0",
  },
  {
    id: "moderate",
    label: "Moderate",
    icon: TriangleAlert,
    desc: "Clearly not themselves. Something is off but they're responsive.",
    color: "#B45309",
    bg: "#FFFBEB",
    border: "#FCD34D",
  },
  {
    id: "severe",
    label: "Severe",
    icon: OctagonAlert,
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
            width: "45px",
            height: "45px",
            borderRadius: "50%",
            background: C.cream,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            border: `1.5px solid ${C.border}`,
            flexShrink: 0,
            color: C.terracotta,
          }}
        >
          {selectedPet.photo_url ? (
            <img
              src={selectedPet.photo_url}
              alt={selectedPet.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            (() => {
              const SpeciesIcon =
                BANNER_LUCIDE[speciesBucket(selectedPet.species)] || PawPrint;
              // 18px inside a 45px chip filled only 40% of it. 27px matches
              // the proportion the species icon has on the Pet Card tiles.
              return <SpeciesIcon size={27} strokeWidth={1.8} />;
            })()
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="pc-name">Checking on {selectedPet.name}</p>
          <p
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: "600",
            }}
          >
            {selectedPet.species && (
              <span style={{ color: C.muted }}>{selectedPet.species}</span>
            )}
            {selectedPet.species && selectedPet.breed && (
              <span style={{ color: C.muted }}>{" · "}</span>
            )}
            {selectedPet.breed && (
              <span style={{ color: C.navyDark }}>{selectedPet.breed}</span>
            )}
          </p>
        </div>
        {/* Desktop: Triage chip in top row */}
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
        </div>
      </div>
      {/* Mobile: Triage chip on second row, indented past avatar */}
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
  const [recommendation, setRecommendation] = useState(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [costEstimates, setCostEstimates] = useState({}); // { vetId: estimateData }
  const [estimateLoading, setEstimateLoading] = useState({}); // { vetId: true }
  const [visitPrep, setVisitPrep] = useState(null); // { visitPrepId, prepContent }
  const [visitPrepLoading, setVisitPrepLoading] = useState(false);
  const [visitPrepExpanded, setVisitPrepExpanded] = useState(false);
  // Follow-up: links this check to a prior one and supplies background context.
  const [followUpCheckId, setFollowUpCheckId] = useState(null);
  const [followUpSummary, setFollowUpSummary] = useState(null);
  const [triageCardExpanded, setTriageCardExpanded] = useState(true);
  const [nearbyVets, setNearbyVets] = useState([]);
  const [guestMode, setGuestMode] = useState(false);
  const [guestPet, setGuestPet] = useState({ species: "", breed: "", age: "" });
  const [freeCheckUsed, setFreeCheckUsed] = useState(false);
  // Set by the symptom-checker landing page when a guest passes Turnstile,
  // carried through the session object. Null for signed-in users.
  const [guestCaptchaToken, setGuestCaptchaToken] = useState(null);

  // Turnstile lives here rather than only on the landing page. Five different
  // places write the guest session and only one of them carried a token, so
  // any other entry path — Start New Check, the back link, a resumed session —
  // arrived with nothing and the first message was rejected. Every path ends
  // up on this page, so this is the one place that covers them all.
  const [guidedStep, setGuidedStep] = useState(1);
  // Invisible widget: verifies silently so a challenge never interrupts
  // someone mid-triage. Sign-in keeps the managed widget, where a visible
  // check reads as reassurance. Falls back to the managed key if the
  // invisible one isn't configured.
  const TURNSTILE_SITE_KEY =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY_INVISIBLE ||
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const turnstileRef = useRef(null);
  const turnstileWidgetId = useRef(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    // Match the server's definition of a guest: no signed-in session. The
    // client's guestMode flag is only set by some entry paths, so gating on it
    // left the widget unrendered for Start New Check, the back link and
    // resumed sessions — while the route still demanded a token.
    if (session || session === undefined) return;
    if (guestCaptchaToken) return;
    let widgetId;
    function renderWidget() {
      if (!window.turnstile || !turnstileRef.current) return;
      if (turnstileRef.current.dataset.rendered === "1") return;
      turnstileRef.current.dataset.rendered = "1";
      widgetId = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => setGuestCaptchaToken(token),
        "expired-callback": () => setGuestCaptchaToken(null),
        "error-callback": () => setGuestCaptchaToken(null),
      });
      turnstileWidgetId.current = widgetId;
    }
    if (window.turnstile) {
      renderWidget();
      return;
    }
    const existing = document.querySelector(
      'script[src*="challenges.cloudflare.com"]',
    );
    const script = existing || document.createElement("script");
    if (!existing) {
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", renderWidget);
    return () => {
      script.removeEventListener("load", renderWidget);
      // Cloudflare keeps its own registry of widget ids. Without this it logs
      // "Cannot find Widget" when React removes the node from underneath it —
      // which is exactly what the console was showing.
      if (widgetId && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetId);
        } catch {}
      }
    };
    // The container is mounted outside AnimatePresence, so it exists from the
    // first step onward and this runs once instead of chasing step changes.
  }, [TURNSTILE_SITE_KEY, session, guestCaptchaToken]);
  const [triageMounted, setTriageMounted] = useState(false);
  const [ready, setReady] = useState(false);
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
      // Follow-up linkage carried from the entry page.
      if (parsed.followUpCheckId) setFollowUpCheckId(parsed.followUpCheckId);
      if (parsed.followUpSummary) setFollowUpSummary(parsed.followUpSummary);
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
        setGuestCaptchaToken(parsed.captchaToken || null);
        if (parsed.recommendation) setRecommendation(parsed.recommendation);
        if (parsed.costEstimates) setCostEstimates(parsed.costEstimates);
        if (parsed.visitPrep) setVisitPrep(parsed.visitPrep);
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
          recommendation,
          costEstimates,
          visitPrep,
          followUpCheckId,
          followUpSummary,
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
    recommendation,
    costEstimates,
    visitPrep,
    followUpCheckId,
    followUpSummary,
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

  // Scroll to top whenever guidedStep changes (better UX on mobile)
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [guidedStep]);

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
      // Mid-stream the tag arrives a character at a time, so "[DIFFERENTIALS:
      // Ear inf" has no closing bracket yet and the rules above can't match it
      // — which is why it flashed on screen before disappearing. Drop any
      // unterminated tag still being typed at the end of the buffer.
      .replace(/\[(TRIAGE_RESULT|DIFFERENTIALS)[^\]]*$/, "")
      .trim();
    return { newTriage, parsedDiffs, clean };
  }

  async function callStream(apiMessages, onChunk, onDone) {
    // The route reads this to tell a signed-in user from a guest. Without it
    // everyone is treated as a guest, which means the guest limit and the
    // captcha requirement apply to account holders too.
    const headers = { "Content-Type": "application/json" };
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    const res = await fetch("/api/symptom-checker", {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages: apiMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        pet: selectedPet || (guestMode ? guestPet : null),
        // Background from a prior check, when this is a follow-up. The route
        // appends it to the system prompt as context, never as a diagnosis.
        followUpContext: followUpSummary || null,
        // Guests only. The route requires this on the first message of a new
        // check when TURNSTILE_SECRET_KEY is configured; without it every
        // first message is rejected and the retry only works because by then
        // it is no longer the first turn.
        captchaToken: session ? null : guestCaptchaToken || null,
      }),
    });
    // Turnstile tokens are single-use. Once one has been spent on the first
    // message of a check, the next check must not reuse it — Cloudflare
    // rejects that as "timeout-or-duplicate". Resetting asks the widget for a
    // fresh token, which arrives via the callback above.
    if (!session && turnstileWidgetId.current && window.turnstile?.reset) {
      try {
        window.turnstile.reset(turnstileWidgetId.current);
        setGuestCaptchaToken(null);
      } catch {}
    }
    if (!res.ok) {
      // A guest who has used their three free checks gets a 401 with
      // guest_limit_reached. Surfacing that as "Something went wrong" made a
      // deliberate limit look like a crash.
      let payload = null;
      try {
        payload = await res.json();
      } catch {}
      if (res.status === 401 && payload?.error === "guest_limit_reached") {
        setFreeCheckUsed(true);
        const err = new Error("guest_limit_reached");
        err.code = "guest_limit_reached";
        throw err;
      }
      throw new Error("Stream failed");
    }
    if (!res.body) throw new Error("Stream failed");
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
          if (session && selectedPet && newTriage) {
            const { data: savedCheck, error: saveError } = await supabase
              .from("symptom_checks")
              .insert({
                pet_id: selectedPet.id,
                owner_id: session.user.id,
                triage_result: newTriage,
                differentials: parsedDiffs,
                transcript: JSON.stringify([greetMsg, firstMsg, aMsg]),
                created_at: new Date().toISOString(),
                parent_check_id: followUpCheckId || null,
              })
              .select("id")
              .single();

            if (saveError) {
              console.error(
                "symptom_checks insert failed:",
                saveError.message,
                saveError,
              );
            }
            if (savedCheck && newTriage !== "MONITOR") {
              setRecommendationLoading(true);
              triggerVetRecommendation({
                symptomCheckId: savedCheck.id,
                petId: selectedPet.id,
                triageResult: newTriage,
                differentials: parsedDiffs,
                userZip: null,
              })
                .then((rec) => {
                  if (rec && rec.rankedVets && rec.rankedVets.length > 0) {
                    setRecommendation({
                      recommendationId: rec.recommendationId,
                      symptomCheckId: savedCheck.id,
                      rankedVets: rec.rankedVets,
                      differentials: parsedDiffs,
                      triageResult: newTriage,
                    });
                  }
                })
                .catch((err) => console.error("Recommendation failed:", err))
                .finally(() => setRecommendationLoading(false));
            }
          }
        },
      );
    } catch (e) {
      setMessages([
        greetMsg,
        firstMsg,
        {
          role: "assistant",
          content:
            e?.code === "guest_limit_reached"
              ? "You've used both of your free checks. Create a free account to keep checking on your pet — your history is saved, and there's no limit."
              : "Something went wrong. Please try again.",
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
          if (session && selectedPet && full.includes("[TRIAGE_RESULT:")) {
            const { data: savedCheck, error: saveError } = await supabase
              .from("symptom_checks")
              .insert({
                pet_id: selectedPet.id,
                owner_id: session.user.id,
                triage_result: newTriage,
                differentials: parsedDiffs,
                transcript: JSON.stringify([...updated, aMsg]),
                created_at: new Date().toISOString(),
                parent_check_id: followUpCheckId || null,
              })
              .select("id")
              .single();

            if (saveError) {
              console.error(
                "symptom_checks insert failed:",
                saveError.message,
                saveError,
              );
            }
            if (savedCheck && newTriage !== "MONITOR") {
              setRecommendationLoading(true);
              triggerVetRecommendation({
                symptomCheckId: savedCheck.id,
                petId: selectedPet.id,
                triageResult: newTriage,
                differentials: parsedDiffs,
                userZip: null,
              })
                .then((rec) => {
                  if (rec && rec.rankedVets && rec.rankedVets.length > 0) {
                    setRecommendation({
                      recommendationId: rec.recommendationId,
                      symptomCheckId: savedCheck.id,
                      rankedVets: rec.rankedVets,
                      differentials: parsedDiffs,
                      triageResult: newTriage,
                    });
                  }
                })
                .catch((err) => console.error("Recommendation failed:", err))
                .finally(() => setRecommendationLoading(false));
            }
          }
        },
      );
    } catch (e) {
      setMessages([
        ...updated,
        {
          role: "assistant",
          content:
            e?.code === "guest_limit_reached"
              ? "You've used both of your free checks. Create a free account to keep checking on your pet — your history is saved, and there's no limit."
              : "Something went wrong. Please try again.",
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

  // Markdown-lite rendering lives in lib/renderMarkdown.js so the health
  // history page formats assistant messages identically.

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
            fontSize: "16px",
            fontWeight: 500,
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
            renderMarkdown(msg.content, isUser)
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
              color: "#fff",
            }}
          >
            <PawPrint size={14} strokeWidth={2} />
          </div>
        )}
      </div>
    );
  }

  async function getCostEstimate(vetId, vetName) {
    if (costEstimates[vetId] || estimateLoading[vetId]) return;
    if (!recommendation) return;
    setEstimateLoading((l) => ({ ...l, [vetId]: true }));
    try {
      const data = await triggerCostEstimate({
        recommendationId: recommendation.recommendationId,
        symptomCheckId: recommendation.symptomCheckId,
        petId: selectedPet?.id,
        vetId: vetId,
        differentials: recommendation.differentials,
      });
      setCostEstimates((e) => ({ ...e, [vetId]: data }));
    } catch (err) {
      setCostEstimates((e) => ({
        ...e,
        [vetId]: { error: err.message || "Estimate failed" },
      }));
    }
    setEstimateLoading((l) => ({ ...l, [vetId]: false }));
  }

  function renderPrepContent(content, cfg) {
    if (!content) return null;
    const sections = [
      { key: "questions_to_ask", label: "Questions to ask", isList: true },
      { key: "symptoms_to_mention", label: "Worth mentioning", isList: true },
      { key: "what_to_bring", label: "What to bring", isList: true },
      { key: "what_to_expect", label: "What to expect", isList: false },
      { key: "cost_note", label: "On cost", isList: false },
    ];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {sections.map((sec) => {
          const val = content[sec.key];
          if (sec.isList) {
            if (!Array.isArray(val) || val.length === 0) return null;
            return (
              <div key={sec.key}>
                <p
                  style={{
                    margin: "0 0 8px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: C.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {sec.label}
                </p>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: "18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {val.map((item, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: "14px",
                        color: C.navyDark,
                        lineHeight: "1.6",
                        fontWeight: 500,
                      }}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          }
          if (!val || typeof val !== "string") return null;
          return (
            <div key={sec.key}>
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {sec.label}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  color: C.navyDark,
                  lineHeight: "1.6",
                  fontWeight: 500,
                }}
              >
                {val}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  async function getVisitPrep() {
    if (visitPrep || visitPrepLoading) {
      setVisitPrepExpanded((v) => !v);
      return;
    }
    if (!recommendation && !triageResult) return;
    setVisitPrepLoading(true);
    try {
      const data = await triggerVisitPrep({
        petId: selectedPet?.id,
        symptomCheckId: recommendation?.symptomCheckId,
        triageResult: triageResult,
        differentials: differentials,
      });
      setVisitPrep(data);
      setVisitPrepExpanded(true);
    } catch (err) {
      console.error("Visit prep failed:", err);
    }
    setVisitPrepLoading(false);
  }

  function renderTriageCard() {
    if (!triageResult || !triageMounted) return null;
    const cfg = {
      EMERGENCY: {
        dotColor: "#C94040",
        label: "Emergency — Act Now",
        color: "#C94040",
        bg: "#FCEAEA",
        border: "#F5C6C6",
        pillBg: "rgba(201, 64, 64, 0.12)",
        msg: "Take your pet to an emergency vet immediately. Don't wait.",
        vetLabel: "24-Hour Emergency Vets",
      },
      SEE_VET: {
        dotColor: "#D9A21B",
        label: "See a Vet Soon",
        color: "#B45309",
        bg: "#FFFBEB",
        border: "#FCD34D",
        pillBg: "rgba(217, 162, 27, 0.14)",
        msg: "Schedule an appointment within 24–48 hours.",
        vetLabel: "Nearby Vets",
      },
      MONITOR: {
        dotColor: "#1A6641",
        label: "Monitor at Home",
        color: "#2A7D4F",
        bg: "#EDFAF3",
        border: "#A7F3D0",
        pillBg: "rgba(26, 102, 65, 0.12)",
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
        {/* Always-visible header */}
        <div style={{ padding: "18px 22px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: cfg.dotColor,
                  flexShrink: 0,
                }}
              />
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
              onClick={(e) => {
                e.stopPropagation();
                setTriageCardExpanded(!triageCardExpanded);
              }}
              className="triage-toggle-btn"
              style={{ color: cfg.color, opacity: 0.7 }}
              aria-label={triageCardExpanded ? "Collapse" : "Expand"}
            >
              {triageCardExpanded ? "Collapse" : "Expand"}
              <span
                className={`triage-chevron ${triageCardExpanded ? "open" : ""}`}
              >
                <ChevronDown size={14} strokeWidth={2.4} />
              </span>
            </button>
          </div>
        </div>
        {/* Animated body */}
        <div className={`triage-body ${triageCardExpanded ? "open" : ""}`}>
          <div className="triage-body-inner">
            <div style={{ padding: "0 22px 22px" }}>
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
                      fontSize: "13px",
                      fontWeight: "700",
                      color: C.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.02em",
                    }}
                  >
                    Could be:
                  </p>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}
                  >
                    {differentials.map((d, i) => (
                      <span
                        key={i}
                        style={{
                          display: "inline-block",
                          padding: "4px 12px",
                          background: "#fff",
                          border: `1px solid ${cfg.border}`,
                          borderRadius: "20px",
                          fontSize: "14px",
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
              {cfg.vetLabel && recommendationLoading && !recommendation && (
                <div style={{ marginBottom: "8px" }}>
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
                    Finding vets that fit best…
                  </p>
                  <div className="triage-skeleton">
                    <div className="triage-skeleton-line medium" />
                    <div className="triage-skeleton-line short" />
                    <div
                      className="triage-skeleton-line long"
                      style={{ marginBottom: 0 }}
                    />
                  </div>
                  <div className="triage-skeleton">
                    <div className="triage-skeleton-line medium" />
                    <div className="triage-skeleton-line short" />
                    <div
                      className="triage-skeleton-line long"
                      style={{ marginBottom: 0 }}
                    />
                  </div>
                  <div className="triage-skeleton">
                    <div className="triage-skeleton-line medium" />
                    <div className="triage-skeleton-line short" />
                    <div
                      className="triage-skeleton-line long"
                      style={{ marginBottom: 0 }}
                    />
                  </div>
                </div>
              )}
              {cfg.vetLabel &&
                (recommendation?.rankedVets?.length > 0 ||
                  (nearbyVets.length > 0 && !recommendationLoading)) && (
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
                      {recommendation?.rankedVets?.length > 0
                        ? `${cfg.vetLabel} — picked for this`
                        : cfg.vetLabel}
                    </p>
                    {(recommendation?.rankedVets?.length > 0
                      ? recommendation.rankedVets.map((v) => ({
                          id: v.vet_id,
                          slug: v.vet_slug,
                          name: v.name,
                          city: v.city,
                          phone: v.phone,
                          neighborhood: null,
                          reasoning: v.reasoning,
                          accepting_new_patients: v.accepting_new_patients,
                          fit_signal: v.fit_signal,
                        }))
                      : nearbyVets
                    ).map((vet) => (
                      <div
                        key={vet.id}
                        style={{
                          background: "#fff",
                          borderRadius: "12px",
                          padding: "16px 16px",
                          marginBottom: "15px",
                          border: `1px solid ${C.border}`,
                        }}
                      >
                        <div
                          className="triage-vet-row"
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
                                margin: "0 0 5px",
                                fontWeight: "700",
                                fontSize: "16px",
                                color: C.navyDark,
                                fontFamily: "var(--font-urbanist,system-ui)",
                              }}
                            >
                              {vet.name}
                            </p>
                            <p
                              style={{
                                margin: "0 0 5px",
                                fontSize: "15px",
                                fontWeight: 500,
                                color: C.muted,
                              }}
                            >
                              {[vet.neighborhood, vet.city]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                            {vet.reasoning && (
                              <p
                                style={{
                                  margin: "0 0 10px",
                                  fontSize: "14px",
                                  fontWeight: 500,
                                  color: C.navyDark,
                                  fontStyle: "italic",
                                  lineHeight: "1.5",
                                  opacity: 0.85,
                                }}
                              >
                                {vet.reasoning}
                              </p>
                            )}
                            {vet.fit_signal && vet.fit_signal.label && (
                              <div
                                className="fit-badge"
                                title={vet.fit_signal.tooltip || ""}
                                style={{
                                  marginTop: 0,
                                  marginBottom: "10px",
                                  background: cfg.pillBg,
                                  color: cfg.color,
                                }}
                              >
                                {vet.fit_signal.label}
                              </div>
                            )}
                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                flexWrap: "wrap",
                                alignItems: "center",
                              }}
                            >
                              {vet.phone && (
                                <a
                                  href={`tel:${vet.phone}`}
                                  className="triage-phone-btn"
                                  style={{
                                    background: cfg.color,
                                    ["--btn-color"]: cfg.color,
                                  }}
                                >
                                  {vet.phone}
                                </a>
                              )}
                              {recommendation?.rankedVets?.length > 0 &&
                                !costEstimates[vet.id] &&
                                !estimateLoading[vet.id] && (
                                  <button
                                    type="button"
                                    className="triage-estimate-btn"
                                    onClick={() =>
                                      getCostEstimate(vet.id, vet.name)
                                    }
                                    style={{ ["--btn-color"]: cfg.color }}
                                  >
                                    Estimate cost
                                  </button>
                                )}
                              {estimateLoading[vet.id] && (
                                <span
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    color: C.muted,
                                    padding: "8px 4px",
                                  }}
                                >
                                  Calculating…
                                </span>
                              )}
                            </div>
                            {costEstimates[vet.id] &&
                              !costEstimates[vet.id].error &&
                              costEstimates[vet.id].estimateLow != null && (
                                <div
                                  style={{
                                    marginTop: "10px",
                                    padding: "14px 14px",
                                    background: cfg.bg,
                                    borderRadius: "12px",
                                    border: `1px solid ${cfg.border}`,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontWeight: 800,
                                      fontSize: "16px",
                                      color: cfg.color,
                                      fontFamily:
                                        "var(--font-urbanist,system-ui)",
                                    }}
                                  >
                                    {costEstimates[vet.id].estimateLow ===
                                    costEstimates[vet.id].estimateHigh
                                      ? `$${costEstimates[vet.id].estimateLow}`
                                      : `$${costEstimates[vet.id].estimateLow}–$${costEstimates[vet.id].estimateHigh}`}
                                  </div>
                                  {costEstimates[vet.id].reasoning && (
                                    <p
                                      style={{
                                        margin: "0 0 0",
                                        fontSize: "14px",
                                        color: C.navyDark,
                                        lineHeight: "1.6",
                                        fontWeight: 500,
                                      }}
                                    >
                                      {costEstimates[vet.id].reasoning}
                                    </p>
                                  )}
                                </div>
                              )}
                            {costEstimates[vet.id] &&
                              (costEstimates[vet.id].error ||
                                costEstimates[vet.id].estimateLow == null) && (
                                <p
                                  style={{
                                    marginTop: "8px",
                                    fontSize: "13px",
                                    color: C.muted,
                                    fontStyle: "italic",
                                  }}
                                >
                                  {costEstimates[vet.id].reasoning ||
                                    "Cost data not available. Call for a quote."}
                                </p>
                              )}
                          </div>
                          <a
                            href={`/vet/${vet.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="triage-view-profile"
                          >
                            View profile ↗
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              {cfg.vetLabel && session && (
                <div className="triage-prep">
                  <button
                    type="button"
                    className="triage-prep-toggle"
                    onClick={getVisitPrep}
                    style={{
                      ["--btn-color"]: cfg.color,
                      background: cfg.pillBg,
                      color: cfg.color,
                    }}
                  >
                    <Clipboard size={16} strokeWidth={2.2} />
                    {visitPrepLoading
                      ? "Preparing…"
                      : visitPrep
                        ? visitPrepExpanded
                          ? "Hide visit prep"
                          : "Show visit prep"
                        : "Prep me for this visit"}
                    {visitPrep && (
                      <span
                        className={`triage-chevron ${visitPrepExpanded ? "open" : ""}`}
                        style={{ marginLeft: "auto" }}
                      >
                        <ChevronDown size={15} strokeWidth={2.2} />
                      </span>
                    )}
                  </button>
                  {visitPrep && (
                    <div
                      className={`triage-prep-body ${visitPrepExpanded ? "open" : ""}`}
                    >
                      <div className="triage-prep-body-inner">
                        <div style={{ paddingTop: "14px" }}>
                          {renderPrepContent(visitPrep.prepContent, cfg)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div
                className="triage-action-row"
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
                    style={{
                      background: cfg.color,
                      ["--btn-color"]: cfg.color,
                    }}
                  >
                    View Pet Profile
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!ready) return <PageLoader for="symptomChat" />;

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
          /* Hover only where hover exists. On touch devices the hover state
             sticks after a tap, so returning to a step showed an option
             looking already selected when nothing was. */
          @media (hover: hover) {
            .g-dur:hover{border-color:${C.terracotta};background:#fafaf8;}
            .g-card:hover{border-color:${C.terracotta};background:#fafaf8;}
            .g-sev:hover{border-color:${C.terracotta};background:#fafaf8;}
          }
          /* The tile keeps its border in every state. Clearing it on hover was
             tried and reverted: hover doesn't exist on touch, so the effect was
             desktop-only, and removing an edge reads as receding when the row
             is meant to be gaining emphasis. The colour comes from the severity
             via --sev-border, set inline on the tile. */
          .g-sev-tile { border: 1px solid var(--sev-border, transparent); }
          .g-sev{border:1.5px solid ${C.border};border-radius:14px;padding:18px 20px;cursor:pointer;background:#fff;transition:border-color 0.15s,background 0.15s,transform 0.15s;margin-bottom:10px;color:${C.navyDark};}
          
        .back-btn { background:none !important; border:none !important; cursor:pointer; font-size:13px; color:${C.terracotta} !important; font-weight:700; font-family:var(--font-urbanist,system-ui); display:inline-flex; align-items:center; gap:4px; line-height:1; padding:15px 0; margin-top:-15px; transition:color 0.15s; outline:none !important; box-shadow:none !important; -webkit-appearance:none; appearance:none; }
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
            className="guided-scroll"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "32px 24px 40px",
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
                  <ArrowLeft
                    size={14}
                    strokeWidth={2.4}
                    style={{ marginRight: "4px", verticalAlign: "middle" }}
                  />{" "}
                  Back to Symptom Checker
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
                      fontSize: "13px",
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
                      fontSize: "13px",
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
              {/* Outside AnimatePresence on purpose. Inside the animated step
                  this mounted and was then torn down by the step transition —
                  Cloudflare logged "Cannot find Widget" each time and no token
                  survived. Mounted here it renders once and persists across
                  all three steps. Hidden until the last step so it doesn't
                  distract, but visibility: hidden keeps it in the DOM where
                  visibility toggling with display:none would not. */}
              {!session && TURNSTILE_SITE_KEY && (
                <div
                  style={{
                    height: guidedStep === 3 ? "auto" : 0,
                    overflow: "hidden",
                    marginBottom: guidedStep === 3 ? 16 : 0,
                  }}
                >
                  <div ref={turnstileRef} />
                </div>
              )}
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
                        fontSize: "16px",
                        fontWeight: 500,
                        color: C.slate,
                      }}
                    >
                      Tap the one that best describes what's going on with{" "}
                      {petName}.
                    </p>
                    {SYMPTOM_AREAS.map((area) => {
                      const Art = area.art;
                      return (
                        <div
                          key={area.id}
                          className="g-card"
                          onClick={() => selectArea(area.id)}
                        >
                          <span
                            style={{
                              flexShrink: 0,
                              width: "68px",
                              height: "68px",
                              borderRadius: "18px",
                              background: "rgba(207,92,54,0.14)",
                              border: "1px solid rgba(207,92,54,0.28)",
                              boxSizing: "border-box",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Art size={44} />
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                margin: "0 0 2px",
                                fontWeight: "700",
                                fontSize: "17px",
                                color: C.navyDark,
                                fontFamily: "var(--font-urbanist,system-ui)",
                              }}
                            >
                              {area.label}
                            </p>
                            <p
                              style={{
                                margin: 0,
                                fontSize: "15px",
                                fontWeight: "500",
                                color: C.muted,
                                textWrap: "pretty",
                              }}
                            >
                              {area.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
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
                        fontSize: "16px",
                        fontWeight: 500,
                        color: C.slate,
                      }}
                    >
                      Give your best estimate — it helps with the assessment.
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      {DURATIONS.map((d) => {
                        const Icon = d.icon;
                        return (
                          <div
                            key={d.id}
                            className="g-card"
                            onClick={() => selectDuration(d.id)}
                          >
                            <span
                              style={{
                                flexShrink: 0,
                                width: "68px",
                                height: "68px",
                                borderRadius: "18px",
                                background: "rgba(207,92,54,0.14)",
                                border: "1px solid rgba(207,92,54,0.28)",
                                boxSizing: "border-box",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: C.terracotta,
                              }}
                            >
                              <Icon size={30} strokeWidth={2} />
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p
                                style={{
                                  margin: "0 0 2px",
                                  fontWeight: "700",
                                  fontSize: "17px",
                                  color: C.navyDark,
                                  fontFamily: "var(--font-urbanist,system-ui)",
                                }}
                              >
                                {d.label}
                              </p>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: "15px",
                                  fontWeight: 500,
                                  color: C.muted,
                                  textWrap: "pretty",
                                }}
                              >
                                {d.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
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
                        fontSize: "16px",
                        fontWeight: 500,
                        color: C.slate,
                      }}
                    >
                      Use your best judgment — you know {petName} best.
                    </p>
                    {SEVERITIES.map((s) => {
                      const Icon = s.icon;
                      return (
                        <div
                          key={s.id}
                          className="g-sev"
                          disabled={
                            !session &&
                            !!TURNSTILE_SITE_KEY &&
                            !guestCaptchaToken
                          }
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
                            <span
                              className="g-sev-tile"
                              style={{
                                flexShrink: 0,
                                width: "68px",
                                height: "68px",
                                borderRadius: "18px",
                                background: s.bg,
                                // Only the colour is passed inline, as a custom
                                // property. The border itself is declared in
                                // CSS — an inline `border` would beat the hover
                                // rule and never clear.
                                "--sev-border": `${s.color}44`,
                                boxSizing: "border-box",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: s.color,
                              }}
                            >
                              <Icon size={30} strokeWidth={2} />
                            </span>
                            <div>
                              <p
                                style={{
                                  margin: "0 0 4px",
                                  fontWeight: "800",
                                  fontSize: "17px",
                                  color: s.color,
                                  fontFamily: "var(--font-urbanist,system-ui)",
                                }}
                              >
                                {s.label}
                              </p>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: "15px",
                                  fontWeight: 500,
                                  color: C.muted,
                                  lineHeight: "1.5",
                                  textWrap: "pretty",
                                }}
                              >
                                {s.desc}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
              <p
                style={{
                  margin: "24px 0 0",
                  fontSize: "13px",
                  fontWeight: "500",
                  color: C.muted,
                  textAlign: "center",
                  // Second copy of the disclaimer — the first one was capped
                  // last round and this one was missed.
                  maxWidth: "68ch",
                  textWrap: "balance",
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    verticalAlign: "middle",
                    marginRight: "4px",
                  }}
                >
                  ⚕️
                </span>
                PetParrk provides triage guidance only. We are not veterinarians
                or medical professionals.
                <br />
                This is not a substitute for professional veterinary care.
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
        /* The guest wall renders in the chat view, so its button styles belong
           here. They were in the guided-flow block, where the wall never
           appears, which is why the button rendered as a bare link. */
        .sc-signup-btn {
          display: inline-flex; align-items: center; justify-content: center;
          height: 44px; padding: 0 24px; border-radius: 12px;
          background: ${C.terracotta}; color: #fff;
          border: 2px solid ${C.terracotta};
          text-decoration: none; font-size: 15px; font-weight: 700;
          font-family: var(--font-urbanist,system-ui);
          transition: background 0.2s, color 0.2s;
        }
        .sc-signup-btn:hover { background: #fff; color: ${C.terracotta}; }
        .chat-textarea { font-weight: 500; }
        .chat-messages {
          flex: 1;
          overflow-y: scroll;
          padding: 32px 24px 20px;
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
        .triage-outline-btn { height:42px; padding:0 24px; background:#fff; border:2px solid ${C.border}; border-radius:12px; font-size:15px; cursor:pointer; font-weight:700; font-family:var(--font-urbanist,system-ui); color:${C.navyDark}; transition:background 0.2s,color 0.2s,border-color 0.2s; }
        .triage-outline-btn:hover { background:${C.navyDark}; color:#fff; border-color:${C.navyDark}; }
        .triage-primary-btn { height:42px; padding:0 24px; border:2px solid transparent; border-radius:12px; font-size:15px; font-weight:700; font-family:var(--font-urbanist,system-ui); color:#fff; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; transition:background 0.2s,color 0.2s,border-color 0.2s; }
        .triage-primary-btn:hover { background:#fff !important; color:var(--btn-color) !important; border-color:var(--btn-color) !important; }
        .triage-phone-btn { display:inline-flex; align-items:center; height:35px; padding:0 18px; border-radius:10px; font-size:14px; font-weight:700; color:#fff; text-decoration:none; border:2px solid transparent; transition:background 0.2s, color 0.2s, border-color 0.2s; }
        .triage-phone-btn:hover { background:#fff !important; color:var(--btn-color) !important; border-color:var(--btn-color) !important; }
        .triage-estimate-btn { background:#fff; border:2px solid var(--btn-color); border-radius:999px; padding:8px 16px; font-size:14px; font-weight:700; cursor:pointer; font-family:var(--font-urbanist,system-ui); color:var(--btn-color); transition:background 0.2s, color 0.2s; }
        .triage-estimate-btn:hover { background:var(--btn-color); color:#fff; }
        .triage-view-profile { font-size:13px; color:${C.terracotta}; text-decoration:underline; white-space:nowrap; flex-shrink:0; margin-top:2px; font-weight:700; transition:color 0.15s; }
        .triage-view-profile:hover { color:${C.navyDark}; }
        .triage-body { display:grid; grid-template-rows:0fr; opacity:0; transition:grid-template-rows 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease; }
        .triage-body.open { grid-template-rows:1fr; opacity:1; }
        .triage-body-inner { overflow:hidden; }
        .triage-toggle-btn { background:none; border:none; cursor:pointer; padding:4px 6px; font-weight:700; font-size:13px; font-family:var(--font-urbanist,system-ui); display:inline-flex; align-items:center; gap:4px; transition:opacity 0.15s; }
        .triage-toggle-btn:hover { opacity:0.7; }
        .triage-chevron { transition:transform 0.45s cubic-bezier(0.4,0,0.2,1); display:inline-flex; }
        .triage-chevron.open { transform:rotate(180deg); }
        .triage-skeleton { background:#fff; border-radius:12px; padding:14px 16px; margin-bottom:8px; overflow:hidden; position:relative; }
        .triage-skeleton::before { content:""; position:absolute; inset:0; background:linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent); animation:triage-shimmer 1.4s infinite; }
        @keyframes triage-shimmer { 0% { transform:translateX(-100%); } 100% { transform:translateX(100%); } }
        .triage-skeleton-line { height:14px; background:${C.border}; border-radius:6px; margin-bottom:8px; }
        .triage-skeleton-line.short { width:40%; }
        .triage-skeleton-line.medium { width:65%; }
        .triage-skeleton-line.long { width:85%; }
        .fit-badge { display:inline-flex; align-items:center; padding:4px 10px; margin-top:8px; border-radius:9999px; font-size:12px; font-weight:600; letter-spacing:0.02em; white-space:nowrap; }
        .triage-prep { margin-top:16px; }
        .triage-prep-toggle { width:100%; display:inline-flex; align-items:center; gap:8px; height:46px; padding:0 16px; border:none; border-radius:12px; font-size:14px; font-weight:700; cursor:pointer; font-family:var(--font-urbanist,system-ui); transition:filter 0.15s; }
        .triage-prep-toggle:hover { filter:brightness(0.96); }
        .triage-prep-body { display:grid; grid-template-rows:0fr; opacity:0; transition:grid-template-rows 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease; }
        .triage-prep-body.open { grid-template-rows:1fr; opacity:1; }
        .triage-prep-body-inner { overflow:hidden; }
        @media (max-width: 600px) {
          .triage-vet-row { flex-direction: column !important; align-items: stretch !important; }
          .triage-vet-row > a { align-self: flex-start; margin-top: 4px; }
          .triage-action-row { flex-direction: column !important; }
          .triage-action-row .triage-outline-btn,
          .triage-action-row .triage-primary-btn { width: 100%; }
        }
        .start-over-btn { background:none; border:none; cursor:pointer; font-size:14px; color:${C.terracotta}; font-weight:700; padding:15px 0; margin-top:-15px; font-family:var(--font-urbanist,system-ui); white-space:nowrap; flex-shrink:0; transition:color 0.15s; text-decoration:none; display:inline-flex; align-items:center; line-height:1; }
        .start-over-btn:hover { color:#172531; }
        .back-btn { background:none !important; border:none !important; cursor:pointer; font-size:13px; color:${C.terracotta} !important; font-weight:700; font-family:var(--font-urbanist,system-ui); display:inline-flex; align-items:center; gap:4px; line-height:1; padding:15px 0; margin-top:-15px; transition:color 0.15s; outline:none !important; box-shadow:none !important; -webkit-appearance:none; appearance:none; }
        .back-btn:link, .back-btn:visited { color:${C.terracotta} !important; }
        .back-btn:hover { color:#172531 !important; outline:none !important; box-shadow:none !important; }
        .back-btn:active { color:#172531 !important; outline:none !important; box-shadow:none !important; }
        .back-btn:focus { color:${C.terracotta} !important; outline:none !important; box-shadow:none !important; background:none !important; border:none !important; }
        .back-btn:focus-visible { color:${C.terracotta} !important; outline:none !important; box-shadow:none !important; background:none !important; border:none !important; }
        .back-btn:focus:not(:focus-visible) { color:${C.terracotta} !important; outline:none !important; box-shadow:none !important; }
        .pc-name { margin:0; font-weight:700; font-size:20px; color:${C.navyDark}; font-family:var(--font-urbanist,system-ui); }
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
            <div
              style={{
                marginBottom: "30px",
                paddingTop: "5px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
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
                <ArrowLeft
                  size={14}
                  strokeWidth={2.4}
                  style={{ marginRight: "4px", verticalAlign: "middle" }}
                />{" "}
                Back to Symptom Checker
              </button>
              <button onClick={resetSession} className="start-over-btn">
                <RotateCcw
                  size={14}
                  strokeWidth={2.4}
                  style={{ marginRight: "4px", verticalAlign: "middle" }}
                />{" "}
                Start over
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
                  className="sc-signup-title"
                  style={{
                    margin: "0 0 6px",
                    fontSize: "24px",
                    color: C.navyDark,
                    fontWeight: "700",
                  }}
                >
                  Create a free account to continue.
                </p>
                <p
                  className="sc-signup-sub"
                  style={{
                    margin: "0 0 20px",
                    fontSize: "16px",
                    fontWeight: 500,
                    color: C.muted,
                  }}
                >
                  Your account keeps a record of every check, so you can see how
                  things change over time.
                </p>
                <Link href="/auth" className="sc-signup-btn">
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
                      {recording ? (
                        <CircleStop size={16} strokeWidth={2} />
                      ) : (
                        <Mic size={16} strokeWidth={2} />
                      )}
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
                      width="18"
                      height="18"
                      viewBox="0 0 12 13"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{ display: "block" }}
                    >
                      <path
                        d="M6 10.5V1.5M6 1.5L2 5.5M6 1.5L10 5.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
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
                marginTop: "10px",
                fontSize: "13px",
                fontWeight: "500",
                color: C.muted,
                textAlign: "center",
                lineHeight: "1.8",
                // Ran 111-138ch at wide widths; capped and centred.
                maxWidth: "68ch",
                textWrap: "balance",
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
