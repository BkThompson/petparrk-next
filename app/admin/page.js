"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

const ADMIN_EMAILS = ["bkalthompson@gmail.com", "maggie.tursi@gmail.com"];

const TABS = [
  "Submissions",
  "Pending Vets",
  "Vets",
  "Prices",
  "Call Sheet",
  "Users",
  "Symptom Logs",
  "Team",
];

const VET_TYPES = [
  "General Practice",
  "Emergency",
  "Specialty",
  "Holistic",
  "Low-Cost / Non-Profit",
];
const OWNERSHIP_TYPES = ["Independent", "Corporate"];
const STATUS_TYPES = ["active", "inactive", "pending"];
const PRICE_TYPES = ["exact", "range", "starting"];

const TRIAGE_CONFIG = {
  EMERGENCY: {
    color: "#c62828",
    bg: "#fdecea",
    emoji: "🚨",
    label: "Emergency",
  },
  SEE_VET: {
    color: "#e65100",
    bg: "#fff3e0",
    emoji: "🟡",
    label: "See vet soon",
  },
  MONITOR: { color: "#1565c0", bg: "#e3f2fd", emoji: "🔵", label: "Monitor" },
  LOOKS_OK: { color: "#2d6a4f", bg: "#e8f5e9", emoji: "✅", label: "Looks OK" },
};

export default function AdminPage() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [authorized, setAuthorized] = useState(false);
  const [tab, setTab] = useState("Submissions");

  // Submissions
  const [submissions, setSubmissions] = useState([]);
  const [subFilter, setSubFilter] = useState("pending");
  const [subLoading, setSubLoading] = useState(true);

  // Pending Vets
  const [pendingVets, setPendingVets] = useState([]);
  const [pendingVetsLoading, setPendingVetsLoading] = useState(true);
  const [editingPendingVet, setEditingPendingVet] = useState(null);
  const [pendingVetForm, setPendingVetForm] = useState({});

  // Vets
  const [vets, setVets] = useState([]);
  const [vetsLoading, setVetsLoading] = useState(true);
  const [vetSearch, setVetSearch] = useState("");
  const [editingVet, setEditingVet] = useState(null);
  const [vetForm, setVetForm] = useState({});
  const [vetSaving, setVetSaving] = useState(false);
  const [showAddVet, setShowAddVet] = useState(false);
  const [addVetForm, setAddVetForm] = useState({
    name: "",
    slug: "",
    neighborhood: "",
    city: "Oakland",
    state: "",
    address: "",
    zip_code: "",
    phone: "",
    website: "",
    vet_type: ["General Practice"],
    ownership: "Independent",
    accepting_new_patients: null,
    carecredit: false,
    hours: "",
    status: "active",
    internal_notes: "",
  });

  // Prices
  const [selectedVetId, setSelectedVetId] = useState("");
  const [vetPriceSearch, setVetPriceSearch] = useState("");
  const [showVetDropdown, setShowVetDropdown] = useState(false);
  const [vetPrices, setVetPrices] = useState([]);
  const [services, setServices] = useState([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null);
  const [priceForm, setPriceForm] = useState({});
  const [priceSaving, setPriceSaving] = useState(false);
  const [showAddPrice, setShowAddPrice] = useState(false);
  const [addPriceForm, setAddPriceForm] = useState({
    service_id: "",
    price_low: "",
    price_high: "",
    price_type: "exact",
    includes_bloodwork: false,
    includes_xrays: false,
    includes_anesthesia: false,
    species: "",
    species_other: "",
    call_for_quote: false,
    notes: "",
  });
  const priceSearchRef = useRef(null);

  // Users
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");

  // Symptom Logs
  const [symptomLogs, setSymptomLogs] = useState([]);
  const [symptomLoading, setSymptomLoading] = useState(true);
  const [symptomFilter, setSymptomFilter] = useState("all");

  // Call Sheet
  const [callQueue, setCallQueue] = useState([]);
  const [callQueueLoading, setCallQueueLoading] = useState(true);
  const [callIndex, setCallIndex] = useState(0);
  const [callPrices, setCallPrices] = useState([]);
  const callPricesRef = useRef([]);
  // Keep ref in sync with state for use in async functions
  useEffect(() => {
    callPricesRef.current = callPrices;
  }, [callPrices]);
  const [callSaving, setCallSaving] = useState(false);
  const [callSpeciesError, setCallSpeciesError] = useState(false);
  const [pendingVetSearch, setPendingVetSearch] = useState("");
  const [callSheetSearch, setCallSheetSearch] = useState("");
  const [showCallbackNotes, setShowCallbackNotes] = useState(false);
  const [callbackNoteText, setCallbackNoteText] = useState("");
  const [callNotes, setCallNotes] = useState([]);
  const [allCallNotes, setAllCallNotes] = useState([]);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [allNotesLoading, setAllNotesLoading] = useState(false);
  const [allNotesEditingId, setAllNotesEditingId] = useState(null);
  const [allNotesEditingText, setAllNotesEditingText] = useState("");
  const [allNotesDeletingId, setAllNotesDeletingId] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [notesVetId, setNotesVetId] = useState(null);
  const [notesVetName, setNotesVetName] = useState("");
  const [callLog, setCallLog] = useState([]); // recently processed vets
  const [showAllVets, setShowAllVets] = useState(false); // toggle: show all vets vs only unpriced
  const [fullCallQueue, setFullCallQueue] = useState([]); // all vets regardless of prices
  const [deletePriceConfirm, setDeletePriceConfirm] = useState(null); // price id pending delete
  const [addPriceError, setAddPriceError] = useState(false);
  const [editPriceError, setEditPriceError] = useState(false);
  const [callSaved, setCallSaved] = useState(false);
  const [callReviewPrices, setCallReviewPrices] = useState([]); // saved prices shown in review
  const [callReviewVetId, setCallReviewVetId] = useState(null); // vet id for editing saved prices
  const [callReviewEditing, setCallReviewEditing] = useState(null); // index of row being edited in review

  // Team / admin users
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", full_name: "" });
  const [inviteError, setInviteError] = useState("");
  const [inviteSaving, setInviteSaving] = useState(false);
  const [teamDeactivatingId, setTeamDeactivatingId] = useState(null);
  const [teamEditingId, setTeamEditingId] = useState(null);
  const [teamEditName, setTeamEditName] = useState("");

  // Unverified prices
  const [unverifiedPrices, setUnverifiedPrices] = useState([]);
  const [unverifiedLoading, setUnverifiedLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({
    activeVets: 0,
    pendingSubs: 0,
    totalPrices: 0,
    pendingVets: 0,
    totalUsers: 0,
    totalSymptomChecks: 0,
  });

  // ── Auth ──────────────────────────────────────────────────────────
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session || !ADMIN_EMAILS.includes(data.session.user.email)) {
        router.push("/");
      } else {
        setAuthorized(true);
        setCurrentUserEmail(data.session.user.email);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s || !ADMIN_EMAILS.includes(s.user.email)) router.push("/");
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setEditingVet(null);
    setShowAddVet(false);
    setEditingPrice(null);
    setShowAddPrice(false);
    setEditingPendingVet(null);
  }, [tab]);

  useEffect(() => {
    if (!authorized) return;
    fetchSubmissions();
    fetchPendingVets();
    fetchVets();
    fetchServices();
    fetchUsers();
    fetchSymptomLogs();
    fetchStats();
    fetchCallQueue();
    fetchUnverifiedPrices();
  }, [authorized]);

  async function fetchStats() {
    const [
      { count: activeVets },
      { count: pendingSubs },
      { count: totalPrices },
      { count: pendingVetsCount },
      { count: totalUsers },
      { count: totalSymptomChecks },
    ] = await Promise.all([
      supabase
        .from("vets")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("price_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase.from("vet_prices").select("*", { count: "exact", head: true }),
      supabase
        .from("pending_vets")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("symptom_checks")
        .select("*", { count: "exact", head: true }),
    ]);
    setStats({
      activeVets: activeVets || 0,
      pendingSubs: pendingSubs || 0,
      totalPrices: totalPrices || 0,
      pendingVets: pendingVetsCount || 0,
      totalUsers: totalUsers || 0,
      totalSymptomChecks: totalSymptomChecks || 0,
    });
  }

  async function fetchSubmissions() {
    setSubLoading(true);
    const { data } = await supabase
      .from("price_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    setSubmissions(data || []);
    setSubLoading(false);
  }

  async function fetchPendingVets() {
    setPendingVetsLoading(true);
    const { data } = await supabase
      .from("pending_vets")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setPendingVets(data || []);
    setPendingVetsLoading(false);
  }

  async function fetchVets() {
    setVetsLoading(true);
    const { data } = await supabase.from("vets").select("*").order("name");
    setVets(data || []);
    setVetsLoading(false);
  }

  async function fetchServices() {
    const { data } = await supabase.from("services").select("*").order("name");
    setServices(data || []);
  }

  async function fetchUsers() {
    setUsersLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, bio, zip_code, created_at, is_public")
      .order("created_at", { ascending: false });
    setUsers(data || []);
    setUsersLoading(false);
  }

  async function fetchUnverifiedPrices() {
    setUnverifiedLoading(true);
    const { data } = await supabase
      .from("vet_prices")
      .select("*, services(name), vets(name), pending_vets(name)")
      .eq("is_verified", false)
      .eq("source", "ai_scraper")
      .order("created_at", { ascending: false });
    setUnverifiedPrices(data || []);
    setUnverifiedLoading(false);
  }

  async function approveUnverifiedPrice(id) {
    await supabase
      .from("vet_prices")
      .update({ is_verified: true })
      .eq("id", id);
    setUnverifiedPrices((prev) => prev.filter((p) => p.id !== id));
    fetchStats();
  }

  async function rejectUnverifiedPrice(id) {
    await supabase.from("vet_prices").delete().eq("id", id);
    setUnverifiedPrices((prev) => prev.filter((p) => p.id !== id));
  }

  async function fetchCallQueue() {
    setCallQueueLoading(true);
    const [{ data: pendingVetsList }, { data: activeVets }, { data: prices }] =
      await Promise.all([
        supabase
          .from("pending_vets")
          .select("*")
          .eq("status", "pending")
          .order("created_at"),
        supabase.from("vets").select("*").eq("status", "active").order("name"),
        supabase.from("vet_prices").select("vet_id"),
      ]);
    const vetsWithPrices = new Set((prices || []).map((p) => p.vet_id));
    const pending = (pendingVetsList || []).map((v) => ({
      ...v,
      _source: "pending",
      _hasPrices: false,
      _declined: v.notes === "declined_to_share",
    }));
    const activeAll = (activeVets || []).map((v) => ({
      ...v,
      _source: "active",
      _hasPrices: vetsWithPrices.has(v.id),
      _declined: v.internal_notes === "declined_to_share",
    }));
    const activeMissing = activeAll.filter(
      (v) => !v._hasPrices && !v._declined,
    );
    // Full queue = all pending + all active (for "show all" mode)
    setFullCallQueue([...pending, ...activeAll]);
    // Filtered queue = pending + active missing prices (normal mode)
    setCallQueue([...pending, ...activeMissing]);
    setCallQueueLoading(false);
  }

  async function saveCallPrices(vet) {
    setCallSaving(true);
    const latestPrices = callPricesRef.current;
    const validPrices = latestPrices.filter(
      (p) => p.service_id && p.species && (p.price_low || p.call_for_quote),
    );
    if (callPrices.length > 0 && validPrices.length < callPrices.length) {
      setCallSaving(false);
      setCallSpeciesError(true);
      return;
    }

    function cleanPrice(p, vetId) {
      return {
        vet_id: vetId,
        service_id: p.service_id,
        price_low: p.price_low ? parseFloat(p.price_low) : null,
        price_high: p.price_high ? parseFloat(p.price_high) : null,
        price_type: p.price_type || "exact",
        includes_bloodwork: !!p.includes_bloodwork,
        includes_xrays: !!p.includes_xrays,
        includes_anesthesia: !!p.includes_anesthesia,
        species:
          p.species === "other" ? p.speciesOther || "other" : p.species || null,
        call_for_quote: !!p.call_for_quote,
        notes: p.notes || null,
        is_verified: true,
        source: "call_sheet",
      };
    }

    // If we already created/found this vet in a previous save (add more prices flow), reuse that ID
    let savedVetId = callReviewVetId || vet.id;
    if (vet._source === "pending" && !callReviewVetId) {
      // Check if a vet with this name already exists — avoid duplicates
      const { data: existingVet } = await supabase
        .from("vets")
        .select("id")
        .ilike("name", vet.name.trim())
        .maybeSingle();

      if (existingVet) {
        // Vet already exists — reuse it, just mark pending as approved
        savedVetId = existingVet.id;
        await supabase
          .from("pending_vets")
          .update({ status: "approved" })
          .eq("id", vet.id);
      } else {
        // Create new vet
        const slug = (vet.slug || vet.name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        const { data: newVet, error: vetError } = await supabase
          .from("vets")
          .insert({
            name: vet.name,
            slug,
            address: vet.address,
            city: vet.city,
            state: vet.state || null,
            zip_code: vet.zip_code,
            phone: vet.phone,
            website: vet.website,
            hours: vet.hours,
            neighborhood:
              vet.neighborhood && vet.neighborhood !== vet.city
                ? vet.neighborhood
                : null,
            vet_type: vet.vet_type
              ? Array.isArray(vet.vet_type)
                ? vet.vet_type
                : [vet.vet_type]
              : ["General Practice"],
            accepting_new_patients: null,
            carecredit: false,
            status: "inactive",
          })
          .select()
          .single();
        if (vetError) {
          alert("Error approving vet: " + vetError.message);
          setCallSaving(false);
          return;
        }
        await supabase
          .from("pending_vets")
          .update({ status: "approved" })
          .eq("id", vet.id);
        savedVetId = newVet.id;
      }
      // Update the vet in both queues so it's treated as active on subsequent saves
      const updatedVet = {
        ...vet,
        id: savedVetId,
        _source: "active",
        _hasPrices: true,
      };
      setCallQueue((prev) =>
        prev.map((v) =>
          v.id === vet.id && v._source === "pending" ? updatedVet : v,
        ),
      );
      setFullCallQueue((prev) =>
        prev.map((v) =>
          v.id === vet.id && v._source === "pending" ? updatedVet : v,
        ),
      );
    }

    // Insert each price and capture the returned row with its DB id
    console.log(
      "saveCallPrices — saving",
      validPrices.length,
      "prices:",
      validPrices.map((p) => ({
        service: p.service_id,
        bloodwork: p.includes_bloodwork,
        xrays: p.includes_xrays,
        anesthesia: p.includes_anesthesia,
        species: p.species,
      })),
    );
    const savedRows = [];
    for (const p of validPrices) {
      const payload = cleanPrice(p, savedVetId);
      console.log("inserting price:", {
        bloodwork: payload.includes_bloodwork,
        xrays: payload.includes_xrays,
        anesthesia: payload.includes_anesthesia,
      });
      const { data, error } = await supabase
        .from("vet_prices")
        .insert(payload)
        .select()
        .single();
      if (error) {
        alert("Price error: " + error.message);
      } else {
        savedRows.push({ ...p, id: data.id });
      }
    }

    setCallSaving(false);
    setCallSaved(true);
    setCallReviewVetId(savedVetId);
    setCallReviewEditing(null);
    setCallPrices([]);
    // Fetch fresh from DB — single source of truth
    await fetchReviewPrices(savedVetId);
    // Mark vet as having prices in both queues
    setCallQueue((prev) =>
      prev.map((v) => (v.id === savedVetId ? { ...v, _hasPrices: true } : v)),
    );
    setFullCallQueue((prev) =>
      prev.map((v) => (v.id === savedVetId ? { ...v, _hasPrices: true } : v)),
    );
    fetchStats();
    fetchVets();
  }

  async function updateReviewPrice(index, form) {
    const row = callReviewPrices[index];
    const { error } = await supabase
      .from("vet_prices")
      .update({
        service_id: form.service_id,
        price_low: form.price_low ? parseFloat(form.price_low) : null,
        price_high: form.price_high ? parseFloat(form.price_high) : null,
        price_type: form.price_type,
        includes_bloodwork: !!form.includes_bloodwork,
        includes_xrays: !!form.includes_xrays,
        includes_anesthesia: !!form.includes_anesthesia,
        species:
          form.species === "other"
            ? form.speciesOther || "other"
            : form.species || null,
        call_for_quote: !!form.call_for_quote,
        notes: form.notes || null,
      })
      .eq("id", row.id);
    if (error) {
      alert("Update error: " + error.message);
      return;
    }
    setCallReviewEditing(null);
    await fetchReviewPrices(callReviewVetId);
    // Also refresh Prices tab if it has this vet selected
    if (selectedVetId === callReviewVetId) fetchPricesForVet(selectedVetId);
  }

  async function deleteReviewPrice(index) {
    const row = callReviewPrices[index];
    const { error } = await supabase
      .from("vet_prices")
      .delete()
      .eq("id", row.id);
    if (error) {
      alert("Delete error: " + error.message);
      return;
    }
    await fetchReviewPrices(callReviewVetId);
    // Also refresh Prices tab if it has this vet selected
    if (selectedVetId === callReviewVetId) fetchPricesForVet(selectedVetId);
  }

  function advanceFromReview() {
    const activeQueue = showAllVets ? fullCallQueue : callQueue;
    const vet = activeQueue[callIndex];
    if (vet) {
      setCallLog((prev) =>
        [
          { name: vet.name, count: callReviewPrices.length, ts: new Date() },
          ...prev,
        ].slice(0, 10),
      );
    }
    setCallSaved(false);
    setCallReviewPrices([]);
    setCallReviewVetId(null);
    setCallReviewEditing(null);
    setCallIndex((i) => i + 1);
  }

  async function markCallStatus(vet, status) {
    if (vet._source === "pending") {
      if (status === "skip") {
        await supabase
          .from("pending_vets")
          .update({ status: "rejected" })
          .eq("id", vet.id);
      } else if (status === "declined") {
        await supabase
          .from("pending_vets")
          .update({ notes: "declined_to_share" })
          .eq("id", vet.id);
      } else {
        await supabase
          .from("pending_vets")
          .update({ notes: status })
          .eq("id", vet.id);
      }
    } else {
      if (status === "declined") {
        await supabase
          .from("vets")
          .update({ internal_notes: "declined_to_share" })
          .eq("id", vet.id);
      } else {
        await supabase
          .from("vets")
          .update({ internal_notes: status })
          .eq("id", vet.id);
      }
    }
    // Tag vet in queue so badge shows immediately
    if (status === "declined") {
      setCallQueue((prev) =>
        prev.map((v, idx) =>
          idx === callIndex ? { ...v, _declined: true } : v,
        ),
      );
      setFullCallQueue((prev) =>
        prev.map((v, idx) =>
          idx === callIndex ? { ...v, _declined: true } : v,
        ),
      );
    }
    setCallIndex((i) => i + 1);
  }

  function addCallPriceRow() {
    setCallPrices((prev) => [
      ...prev,
      {
        service_id: "",
        price_low: "",
        price_high: "",
        price_type: "exact",
        includes_bloodwork: false,
        includes_xrays: false,
        includes_anesthesia: false,
        species: "",
        call_for_quote: false,
        notes: "",
      },
    ]);
  }

  function updateCallPrice(index, field, value) {
    setCallPrices((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );
  }

  function removeCallPrice(index) {
    setCallPrices((prev) => prev.filter((_, i) => i !== index));
  }

  async function fetchReviewPrices(vetId) {
    if (!vetId) return;
    const toBool = (v) => v === true || v === "true" || v === 1 || v === "1";
    const { data } = await supabase
      .from("vet_prices")
      .select("*, services(name)")
      .eq("vet_id", vetId)
      .order("created_at");
    const clean = (data || []).map((p) => ({
      ...p,
      includes_bloodwork: toBool(p.includes_bloodwork),
      includes_xrays: toBool(p.includes_xrays),
      includes_anesthesia: toBool(p.includes_anesthesia),
    }));
    setCallReviewPrices(clean);
  }

  async function fetchAllCallNotes() {
    setAllNotesLoading(true);
    const { data } = await supabase
      .from("call_notes")
      .select("*")
      .order("created_at", { ascending: false });
    setAllCallNotes(data || []);
    setAllNotesLoading(false);
  }

  async function fetchCallNotes(vetId) {
    if (!vetId) return;
    const { data } = await supabase
      .from("call_notes")
      .select("*")
      .eq("vet_id", vetId)
      .order("created_at", { ascending: false });
    setCallNotes(data || []);
  }

  async function saveCallNote(vetId, vetName, text) {
    if (!text.trim()) return;
    const { data, error } = await supabase
      .from("call_notes")
      .insert({ vet_id: vetId, vet_name: vetName, note: text.trim() })
      .select()
      .single();
    if (error) {
      alert("Error saving note: " + error.message);
      return;
    }
    setCallNotes((prev) => [data, ...prev]);
    setCallbackNoteText("");
    setAllCallNotes((prev) => [data, ...prev]);
  }

  async function updateCallNote(id, text) {
    if (!text.trim()) return;
    const { error } = await supabase
      .from("call_notes")
      .update({ note: text.trim(), updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      alert("Error updating note: " + error.message);
      return;
    }
    setCallNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, note: text.trim() } : n)),
    );
    setAllCallNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, note: text.trim() } : n)),
    );
    setEditingNoteId(null);
    setEditingNoteText("");
    setAllNotesEditingId(null);
    setAllNotesEditingText("");
  }

  async function deleteCallNote(id) {
    const { error } = await supabase.from("call_notes").delete().eq("id", id);
    if (error) {
      alert("Error deleting note: " + error.message);
      return;
    }
    setCallNotes((prev) => prev.filter((n) => n.id !== id));
    setAllCallNotes((prev) => prev.filter((n) => n.id !== id));
    setDeletingNoteId(null);
    setAllNotesDeletingId(null);
  }

  async function fetchAdminUsers() {
    setAdminUsersLoading(true);
    const { data } = await supabase
      .from("admin_users")
      .select("*")
      .order("created_at");
    setAdminUsers(data || []);
    setAdminUsersLoading(false);
  }

  async function inviteAdminUser() {
    if (!inviteForm.email.trim()) {
      setInviteError("Email is required.");
      return;
    }
    setInviteSaving(true);
    setInviteError("");
    const { error } = await supabase.from("admin_users").insert({
      email: inviteForm.email.trim().toLowerCase(),
      full_name: inviteForm.full_name.trim() || null,
      status: "active",
      can_view_call_sheet: false,
      can_edit_prices: false,
      can_approve_vets: false,
      can_manage_users: false,
      can_manage_team: false,
      invited_by: currentUserEmail,
    });
    if (error) {
      setInviteError(error.message);
      setInviteSaving(false);
      return;
    }
    setInviteForm({ email: "", full_name: "" });
    setShowInviteForm(false);
    setInviteSaving(false);
    fetchAdminUsers();
  }

  async function updateAdminPermission(id, field, value) {
    await supabase
      .from("admin_users")
      .update({ [field]: value })
      .eq("id", id);
    setAdminUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, [field]: value } : u)),
    );
  }

  async function updateAdminName(id, name) {
    await supabase
      .from("admin_users")
      .update({ full_name: name.trim() || null })
      .eq("id", id);
    setAdminUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, full_name: name.trim() || null } : u,
      ),
    );
    setTeamEditingId(null);
    setTeamEditName("");
  }

  async function toggleAdminStatus(user) {
    const newStatus = user.status === "active" ? "inactive" : "active";
    await supabase
      .from("admin_users")
      .update({ status: newStatus })
      .eq("id", user.id);
    setAdminUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)),
    );
    setTeamDeactivatingId(null);
  }

  async function fetchSymptomLogs() {
    setSymptomLoading(true);
    const { data } = await supabase
      .from("symptom_checks")
      .select("id, created_at, triage_result, pet_id, pets(name, species)")
      .order("created_at", { ascending: false })
      .limit(200);
    setSymptomLogs(data || []);
    setSymptomLoading(false);
  }

  async function fetchPricesForVet(vetId) {
    if (!vetId) return;
    setPricesLoading(true);
    setVetPrices([]); // clear stale data immediately
    // Add timestamp to bust any client-side caching
    const ts = Date.now();
    const { data, error } = await supabase
      .from("vet_prices")
      .select(`*, services(name), _ts:created_at`)
      .eq("vet_id", vetId)
      .order("created_at")
      .limit(200);
    if (error) console.error("fetchPricesForVet error:", error);
    // Handle both boolean and text columns (bloodwork/xrays stored as text in DB)
    const toBool = (v) => v === true || v === "true" || v === 1 || v === "1";
    const clean = (data || []).map((p) => ({
      ...p,
      includes_bloodwork: toBool(p.includes_bloodwork),
      includes_xrays: toBool(p.includes_xrays),
      includes_anesthesia: toBool(p.includes_anesthesia),
    }));
    console.log(
      "fetchPricesForVet — fetched",
      clean.length,
      "prices for vet",
      vetId,
      clean.map((p) => ({
        id: p.id,
        bw: p.includes_bloodwork,
        xr: p.includes_xrays,
      })),
    );
    setVetPrices(clean);
    setPricesLoading(false);
  }

  // ── Submission actions ────────────────────────────────────────────
  async function updateSubmissionStatus(id, status) {
    await supabase.from("price_submissions").update({ status }).eq("id", id);
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s)),
    );
    fetchStats();
  }

  // ── Pending Vet actions ───────────────────────────────────────────
  async function approvePendingVet(vet) {
    const form = editingPendingVet === vet.id ? pendingVetForm : vet;
    const slug = (form.slug || form.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const { error } = await supabase.from("vets").insert({
      name: form.name,
      slug,
      address: form.address,
      city: form.city,
      state: form.state || null,
      zip_code: form.zip_code,
      phone: form.phone,
      website: form.website,
      hours: form.hours,
      neighborhood:
        form.neighborhood && form.neighborhood !== form.city
          ? form.neighborhood
          : null,
      vet_type: form.vet_type
        ? Array.isArray(form.vet_type)
          ? form.vet_type
          : [form.vet_type]
        : ["General Practice"],
      accepting_new_patients: form.accepting_new_patients ?? null,
      carecredit: form.carecredit ?? false,
      status: "inactive",
      internal_notes: form.notes || form.internal_notes || null,
    });
    if (error) {
      alert("Error approving: " + error.message);
      return;
    }
    await supabase
      .from("pending_vets")
      .update({ status: "approved" })
      .eq("id", vet.id);
    setPendingVets((prev) => prev.filter((v) => v.id !== vet.id));
    setEditingPendingVet(null);
    fetchStats();
    fetchVets();
  }

  async function rejectPendingVet(id) {
    await supabase
      .from("pending_vets")
      .update({ status: "rejected" })
      .eq("id", id);
    setPendingVets((prev) => prev.filter((v) => v.id !== id));
    fetchStats();
  }

  // ── Vet actions ───────────────────────────────────────────────────
  function startEditVet(vet) {
    setEditingVet(vet.id);
    setVetForm({ ...vet });
  }

  async function saveVet() {
    setVetSaving(true);
    const { error } = await supabase
      .from("vets")
      .update({
        name: vetForm.name,
        slug: vetForm.slug,
        neighborhood: vetForm.neighborhood,
        city: vetForm.city,
        state: vetForm.state || null,
        address: vetForm.address,
        zip_code: vetForm.zip_code,
        phone: vetForm.phone,
        website: vetForm.website,
        vet_type: Array.isArray(vetForm.vet_type)
          ? vetForm.vet_type
          : [vetForm.vet_type],
        ownership: vetForm.ownership,
        accepting_new_patients: vetForm.accepting_new_patients,
        carecredit: vetForm.carecredit,
        hours: vetForm.hours,
        status: vetForm.status,
        internal_notes: vetForm.internal_notes,
        last_verified: vetForm.last_verified,
      })
      .eq("id", editingVet);
    if (!error) {
      setVets((prev) =>
        prev.map((v) => (v.id === editingVet ? { ...v, ...vetForm } : v)),
      );
      setEditingVet(null);
    } else {
      alert("Save failed: " + error.message);
    }
    setVetSaving(false);
  }

  async function addVet() {
    const slug =
      addVetForm.slug ||
      addVetForm.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const { data, error } = await supabase
      .from("vets")
      .insert({
        ...addVetForm,
        slug,
        vet_type: Array.isArray(addVetForm.vet_type)
          ? addVetForm.vet_type
          : [addVetForm.vet_type],
      })
      .select()
      .single();
    if (!error) {
      setVets((prev) =>
        [...prev, data].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setShowAddVet(false);
      setAddVetForm({
        name: "",
        slug: "",
        neighborhood: "",
        city: "Oakland",
        address: "",
        zip_code: "",
        phone: "",
        website: "",
        vet_type: ["General Practice"],
        ownership: "Independent",
        accepting_new_patients: null,
        carecredit: false,
        hours: "",
        status: "active",
        internal_notes: "",
      });
      fetchStats();
    } else {
      alert("Error: " + error.message);
    }
  }

  async function toggleVetStatus(vet) {
    const newStatus = vet.status === "active" ? "inactive" : "active";
    await supabase.from("vets").update({ status: newStatus }).eq("id", vet.id);
    setVets((prev) =>
      prev.map((v) => (v.id === vet.id ? { ...v, status: newStatus } : v)),
    );
    fetchStats();
  }

  // ── Price actions ─────────────────────────────────────────────────
  // FIX: convert numbers to strings so controlled number inputs work correctly
  function startEditPrice(price) {
    setEditingPrice(price.id);
    setPriceForm({
      ...price,
      price_low: price.price_low != null ? String(price.price_low) : "",
      price_high: price.price_high != null ? String(price.price_high) : "",
    });
  }

  async function savePrice(formData) {
    // Accept explicit formData so we never read stale closure state
    const f = formData || priceForm;
    if (!f.service_id || !f.species || (!f.price_low && !f.call_for_quote)) {
      setEditPriceError(true);
      return;
    }
    setEditPriceError(false);
    setPriceSaving(true);
    const payload = {
      service_id: f.service_id,
      price_low: f.price_low !== "" ? parseFloat(f.price_low) : null,
      price_high: f.price_high !== "" ? parseFloat(f.price_high) : null,
      price_type: f.price_type,
      includes_bloodwork: !!f.includes_bloodwork,
      includes_xrays: !!f.includes_xrays,
      includes_anesthesia: !!f.includes_anesthesia,
      species: f.species === "other" ? f.species_other || "Other" : f.species,
      call_for_quote: !!f.call_for_quote,
      notes: f.notes || null,
      is_verified: true,
    };
    console.log("savePrice — id:", editingPrice, "payload:", payload);
    const { data, error } = await supabase
      .from("vet_prices")
      .update(payload)
      .eq("id", editingPrice)
      .select();
    console.log("savePrice — result data:", data, "error:", error);
    if (error) {
      alert(
        "Save failed: " +
          error.message +
          "\n\nCode: " +
          error.code +
          "\n\nThis may be a Supabase RLS policy. Check that your admin user has UPDATE permission on vet_prices.",
      );
    } else if (!data || data.length === 0) {
      alert(
        "Save ran but 0 rows were updated.\n\nCheck Supabase RLS policies on the vet_prices table — the UPDATE policy may be blocking this.",
      );
    } else {
      // Update local state immediately so UI reflects the save without waiting for re-fetch
      setVetPrices((prev) =>
        prev.map((p) =>
          p.id === editingPrice
            ? { ...p, ...payload, services: p.services }
            : p,
        ),
      );
      setEditingPrice(null);
      if (callReviewVetId === selectedVetId) fetchReviewPrices(callReviewVetId);
    }
    setPriceSaving(false);
  }

  async function deletePrice(id) {
    await supabase.from("vet_prices").delete().eq("id", id);
    setVetPrices((prev) => prev.filter((p) => p.id !== id));
    setDeletePriceConfirm(null);
    fetchStats();
    if (callReviewVetId === selectedVetId) fetchReviewPrices(callReviewVetId);
  }

  async function addPrice() {
    if (
      !addPriceForm.service_id ||
      !addPriceForm.species ||
      (!addPriceForm.price_low && !addPriceForm.call_for_quote)
    ) {
      setAddPriceError(true);
      return;
    }
    setAddPriceError(false);
    const { data, error } = await supabase
      .from("vet_prices")
      .insert({
        vet_id: selectedVetId,
        service_id: addPriceForm.service_id,
        price_low: addPriceForm.price_low,
        price_high: addPriceForm.price_high || null,
        price_type: addPriceForm.price_type,
        includes_bloodwork: addPriceForm.includes_bloodwork,
        includes_xrays: addPriceForm.includes_xrays,
        includes_anesthesia: addPriceForm.includes_anesthesia,
        species:
          addPriceForm.species === "other"
            ? addPriceForm.species_other || "Other"
            : addPriceForm.species,
        call_for_quote: addPriceForm.call_for_quote,
        notes: addPriceForm.notes,
      })
      .select("*, services(name)")
      .single();
    if (!error) {
      setVetPrices((prev) => [...prev, data]);
      setShowAddPrice(false);
      setAddPriceForm({
        service_id: "",
        price_low: "",
        price_high: "",
        price_type: "exact",
        includes_bloodwork: false,
        includes_xrays: false,
        includes_anesthesia: false,
        species: "",
        species_other: "",
        call_for_quote: false,
        notes: "",
      });
      setAddPriceError(false);
      fetchStats();
      if (callReviewVetId === selectedVetId) fetchReviewPrices(callReviewVetId);
    } else {
      alert("Error: " + error.message);
    }
  }

  // ── Vet price search helpers ──────────────────────────────────────
  const filteredPriceVets = vetPriceSearch.trim()
    ? vets.filter((v) =>
        v.name.toLowerCase().includes(vetPriceSearch.trim().toLowerCase()),
      )
    : vets;

  function selectPriceVet(v) {
    setSelectedVetId(v.id);
    setVetPriceSearch(v.name);
    setShowVetDropdown(false);
    setEditingPrice(null);
    setShowAddPrice(false);
    fetchPricesForVet(v.id);
  }

  function handlePriceSearchChange(e) {
    const val = e.target.value;
    setVetPriceSearch(val);
    setShowVetDropdown(true);
    // If user clears the search, reset selected vet
    if (!val.trim()) {
      setSelectedVetId("");
      setVetPrices([]);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────
  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  function formatLogDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  function formatLogTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  }
  function formatDateTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  function formatPrice(low, high, type) {
    if (!low) return "—";
    if (type === "starting") return `$${Number(low).toLocaleString()}+`;
    if (type === "range" && high)
      return `$${Number(low).toLocaleString()}–$${Number(high).toLocaleString()}`;
    return `$${Number(low).toLocaleString()}`;
  }

  const filteredSubs = submissions.filter((s) =>
    subFilter === "all" ? true : s.status === subFilter,
  );
  const filteredVets = vets.filter(
    (v) =>
      v.name.toLowerCase().includes(vetSearch.toLowerCase()) ||
      v.neighborhood?.toLowerCase().includes(vetSearch.toLowerCase()),
  );
  const filteredUsers = users.filter(
    (u) =>
      !userSearch ||
      u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.zip_code?.includes(userSearch),
  );
  const filteredLogs =
    symptomFilter === "all"
      ? symptomLogs
      : symptomLogs.filter((s) => s.triage_result === symptomFilter);

  if (session === undefined || !authorized) return null;

  function PendingVetEditForm({ form, setForm, onApprove, onCancel }) {
    return (
      <div className="row-edit-bg" style={{ marginTop: "10px" }}>
        <div className="form-grid-3" style={{ marginBottom: "10px" }}>
          {[
            ["name", "Name"],
            ["address", "Address"],
            ["city", "City"],
            ["state", "State"],
            ["zip_code", "ZIP"],
            ["phone", "Phone"],
            ["website", "Website"],
            ["neighborhood", "Neighborhood"],
            ["vet_type", "Vet Type"],
            ["hours", "Hours"],
          ].map(([f, label]) => (
            <div key={f}>
              <label className="field-label">{label}</label>
              <input
                className="adm-input"
                value={form[f] || ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, [f]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
        <div className="form-grid-3" style={{ marginBottom: "12px" }}>
          <div>
            <label className="field-label">Accepting Patients</label>
            <select
              className="adm-input"
              value={
                form.accepting_new_patients === null
                  ? "unknown"
                  : form.accepting_new_patients
                    ? "yes"
                    : "no"
              }
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  accepting_new_patients:
                    e.target.value === "unknown"
                      ? null
                      : e.target.value === "yes",
                }))
              }
            >
              <option value="unknown">Unknown</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label className="field-label">CareCredit</label>
            <select
              className="adm-input"
              value={form.carecredit ? "yes" : "no"}
              onChange={(e) =>
                setForm((p) => ({ ...p, carecredit: e.target.value === "yes" }))
              }
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div>
            <label className="field-label">Notes</label>
            <input
              className="adm-input"
              value={form.notes || form.internal_notes || ""}
              onChange={(e) =>
                setForm((p) => ({ ...p, notes: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="pv-edit-btns" style={{ display: "flex", gap: "8px" }}>
          <button className="adm-btn adm-btn-green" onClick={onApprove}>
            Approve & Add to Site
          </button>
          <button className="adm-btn adm-btn-gray" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .adm-input { width: 100%; padding: 9px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; font-family: system-ui, sans-serif; outline: none; background: #fff; }
        .adm-input:focus { border-color: #2d6a4f; }
        select.adm-input { cursor: pointer; padding-right: 28px; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; }
        .adm-btn { padding: 7px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: system-ui, sans-serif; white-space: nowrap; }
        .adm-btn-green { background: #2d6a4f; color: #fff; }
        .adm-btn-green:hover { background: #245a42; }
        .adm-btn-red { background: #fce8e8; color: #c62828; border: 1px solid #f5c6c6; }
        .adm-btn-red:hover { background: #fbd0d0; }
        .call-no-prices-btns { display: flex; gap: 8px; }
        .call-no-prices-btns .adm-btn { flex: 1; }
        .call-sheet-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        @media (max-width: 600px) {
          .call-no-prices-btns { flex-direction: column; }
          .call-no-prices-btns .adm-btn { width: 100%; flex: unset; }
          .call-sheet-header { flex-direction: column; align-items: flex-start; gap: 16px; }
          .call-sheet-header > div:last-child { width: 100%; display: flex; gap: 6px; }
          .call-sheet-header > div:last-child .adm-btn { flex: 1; }
          .form-grid-4 { grid-template-columns: 1fr 1fr; }
          .form-grid-3 { grid-template-columns: 1fr 1fr; }
        }
        .adm-btn-gray { background: #f0f0f0; color: #444; border: 1px solid #ddd; }
        .adm-btn-gray:hover { background: #e5e5e5; }
        .adm-btn-outline { background: #fff; color: #2d6a4f; border: 1px solid #2d6a4f; }
        .adm-btn-outline:hover { background: #f0f7f4; }
        .adm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .stat-card { background: #fff; border: 1px solid #e8e8e8; border-radius: 10px; padding: 14px 18px; }
        .tab-btn { padding: 10px 16px; border: none; background: none; font-size: 14px; font-weight: 600; cursor: pointer; color: #888; border-bottom: 2px solid transparent; font-family: system-ui, sans-serif; white-space: nowrap; transition: color 0.25s ease, border-bottom-color 0.25s ease; }
        .tab-btn.active { color: #2d6a4f; border-bottom-color: #2d6a4f; }
        .tab-btn:hover:not(.active) { color: #555; }
        .tabs-scroll { overflow-x: auto; display: flex; border-bottom: 1px solid #eee; scrollbar-width: none; }
        .tabs-scroll::-webkit-scrollbar { display: none; }
        .tab-badge { display: inline-block; margin-left: 5px; background: #e65100; color: #fff; border-radius: 20px; padding: 1px 6px; font-size: 10px; }
        .badge { display: inline-flex; align-items: center; padding: 7px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; }
        .badge-pending { background: #fff8e1; color: #e65100; }
        .badge-approved { background: #e8f5e9; color: #2d6a4f; }
        .badge-rejected { background: #fce8e8; color: #c62828; }
        .badge-active { background: #e8f5e9; color: #2d6a4f; border: 1px solid #c8e6c9; }
        .badge-inactive { background: #f0f0f0; color: #888; border: 1px solid #ddd; }
        .row-edit-bg { background: #f9f9f9; border-radius: 10px; padding: 20px 20px 16px 20px; margin: 6px 0 20px 0; border: 1px solid #e8e8e8; }
        .pv-edit-btns .adm-btn { font-size: 11px; padding: 8px 10px; }
        @media (min-width: 425px) { .pv-edit-btns .adm-btn { font-size: 13px; padding: 7px 14px; } }
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        .form-grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16px; }
        .field-label { display: block; font-size: 11px; color: #888; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .sub-card { background: #fff; border: 1px solid #e8e8e8; border-radius: 10px; padding: 18px 20px; margin-bottom: 12px; }
        .pending-vet-card { background: #fff; border: 1px solid #e8e8e8; border-radius: 10px; padding: 18px 20px; margin-bottom: 12px; }
        .vet-row { border-bottom: 1px solid #f0f0f0; padding: 10px 0; }
        .vet-row:last-child { border-bottom: none; }
        .price-edit-pills { display: flex; gap: 6px; flex-wrap: nowrap; }
        @media (max-width: 600px) { .price-edit-pills { flex-wrap: wrap; gap: 4px; } }
        .price-row-wrap { border-bottom: 1px solid #f0f0f0; padding: 18px 16px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .price-row-wrap:last-child { border-bottom: none; }
        .price-row-info { flex: 1; min-width: 0; }
        .price-row-btns { display: flex; gap: 6px; flex-shrink: 0; align-self: flex-start; }
        @media (max-width: 600px) {
          .price-row-wrap { flex-direction: column; gap: 10px; }
          .price-row-btns { width: 100%; padding-top: 10px; border-top: 1px solid #f0f0f0; }
          .price-row-btns .adm-btn { flex: 1; text-align: center; }
        }
        .log-table-header { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; padding: 10px 16px; background: #fafaf8; border-bottom: 1px solid #efefed; }
        .log-table-header span { font-size: 13px; color: #888; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .log-row { border-bottom: 1px solid #f5f5f3; padding: 14px 16px; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; align-items: center; gap: 8px; }
        .log-row:last-child { border-bottom: none; }
        .log-row:hover { background: #fafaf8; }
        .log-mobile { display: none; }
        .log-col { display: block; }
        @media (max-width: 700px) {
          .log-table-header { display: none; }
          .log-row { display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; }
          .log-col { display: none !important; }
          .log-mobile { display: flex !important; flex-direction: column; gap: 6px; width: 100%; }
        }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .stat-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 20px; }
        .filter-bar { display: flex; gap: 6px; flex-wrap: wrap; }
        .tabs-scroll { display: flex; overflow-x: auto; border-bottom: 1px solid #e8e8e8; padding: 0 16px; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .tabs-scroll::-webkit-scrollbar { display: none; }
        .table-header { display: grid; padding: 10px 16px; background: #fafaf8; border-bottom: 1px solid #efefed; }
        .table-header span { font-size: 12px; color: #888; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        /* Users table — responsive */
        .users-table-header { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; padding: 10px 16px; background: #fafaf8; border-bottom: 1px solid #efefed; }
        .users-table-header span { font-size: 12px; color: #888; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .users-table-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; padding: 14px 16px; border-bottom: 1px solid #f5f5f3; align-items: start; gap: 8px; }
        .users-table-row:last-child { border-bottom: none; }
        .users-col { display: flex; flex-direction: column; gap: 2px; }
        .users-label { display: none; font-size: 11px; color: #aaa; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
        .users-mobile-detail { display: none; }
        .bio-desktop { display: block; }
        @media (max-width: 600px) { .bio-desktop { display: none; } }
        @media (max-width: 600px) {
          .users-table-header { display: none; }
          .users-table-row { grid-template-columns: 1fr; gap: 0; padding: 14px 16px; border-bottom: 1px solid #eee; }
          .users-col { display: none; }
          .users-col-name { margin-bottom: 6px; }
          .users-mobile-detail { display: block; }
        }
        html { scrollbar-gutter: stable; }
        .scroll-arrows { display: contents; }
        /* Notes panel — desktop: slides from right, mobile: slides from bottom */
        .notes-panel-desktop { top: 0; right: 0; bottom: 0; width: 380px; transform: translateX(100%); }
        .notes-panel-desktop.notes-panel-open { transform: translateX(0); }
        @media (max-width: 600px) {
          .notes-panel-desktop { top: auto; left: 0; right: 0; bottom: 0; width: 100%; height: 70vh; border-radius: 16px 16px 0 0; transform: translateY(100%); }
          .notes-panel-desktop.notes-panel-open { transform: translateY(0); }
        }
        /* Team tab */
        .team-edit-name-row { display: flex; gap: 8px; align-items: center; }
        .team-edit-name-input { flex: 1; }
        .team-edit-name-btns { display: flex; gap: 8px; flex-shrink: 0; }
        .team-edit-btn { font-size: 13px; padding: 7px 14px; }
        @media (max-width: 425px) {
          .team-edit-name-row { flex-direction: column; align-items: stretch; }
          .team-edit-name-input { width: 100%; }
          .team-edit-name-btns { justify-content: flex-end; margin-top: 8px; }
          .team-edit-btn { font-size: 11px; padding: 6px 10px; }
        }
        .team-member-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 16px; }
        .team-member-info { flex: 1; min-width: 0; }
        .team-member-actions { flex-shrink: 0; }
        .team-perms-grid { display: grid; grid-template-columns: repeat(3, auto); gap: 6px 16px; }
        @media (max-width: 700px) {
          .team-member-row { flex-direction: column; gap: 12px; }
          .team-member-actions { width: 100%; padding-top: 10px; border-top: 1px solid #f0f0f0; }
          .team-member-actions .adm-btn { width: 100%; text-align: center; }
          .team-perms-grid { grid-template-columns: repeat(2, auto); }
        }
        @media (max-width: 480px) {
          .team-perms-grid { grid-template-columns: 1fr 1fr; }
        }
        .scroll-arrow-btn { width: 40px; height: 40px; border-radius: 50%; background: #2d6a4f; color: #fff; border: none; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.2); font-family: system-ui, sans-serif; }
        .scroll-arrow-btn:hover { background: #245a42; }
        /* Price search dropdown — absolute so it doesn't push page content */
        .price-search-wrap { position: relative; }
        .price-search-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: #fff;
          border: 1px solid #e8e8e8;
          border-radius: 8px;
          max-height: 220px;
          overflow-y: auto;
          z-index: 100;
          box-shadow: 0 4px 16px rgba(0,0,0,0.10);
        }
        .price-search-item { padding: 9px 12px; cursor: pointer; font-size: 13px; border-bottom: 1px solid #f5f5f5; }
        .price-search-item:last-child { border-bottom: none; }
        .price-search-item:hover { background: #f0f7f4; }
        .price-search-item.selected { background: #e8f5e9; }
        .vet-row-inner { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
        .vet-row-buttons { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
        /* Includes pills */
        .includes-pills { display: flex; gap: 6px; flex-wrap: nowrap; }
        /* Symptom stats grid */
        .symptom-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .symptom-stat-label { font-size: 13px; }
        /* Pending vet card */
        .pv-card-inner { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
        .pv-buttons { display: flex; gap: 6px; flex-shrink: 0; }
        @media (max-width: 700px) {
          .stat-grid { grid-template-columns: repeat(3, 1fr); }
          .form-grid-2, .form-grid-3, .form-grid-4 { grid-template-columns: 1fr; }
          .section-header { flex-direction: column; align-items: flex-start !important; gap: 10px; }
          .vet-row-inner { flex-direction: column; gap: 12px; }
          .vet-row-buttons { width: 100%; padding-top: 10px; border-top: 1px solid #f0f0f0; gap: 8px; }
          .vet-row-buttons .badge { flex: 1; justify-content: center; }
          .vet-row-buttons .adm-btn { flex: 1; text-align: center; }
          .symptom-stats { grid-template-columns: repeat(2, 1fr); }
          .symptom-stats button { text-align: center; }
          .symptom-stat-label { font-size: 11px; }

          .pv-card-inner { flex-direction: column; }
          .pv-buttons { width: 100%; padding-top: 10px; border-top: 1px solid #f0f0f0; }
          .pv-buttons .adm-btn { flex: 1; }
          .filter-bar .adm-btn { padding: 5px 10px; font-size: 12px; }
        }
        @media (max-width: 600px) {
          .users-table-header { display: none; }
          .users-table-row { grid-template-columns: 1fr; gap: 4px; padding: 12px 16px; border-bottom: 1px solid #eee; }
          .users-label { display: block; }
          .users-col-name { margin-bottom: 4px; }
          /* Show compact meta line, hide individual cols */
          .users-col { display: none; }
          .users-meta-mobile { display: block !important; }
        }
        @media (min-width: 601px) {
          .users-meta-mobile { display: none !important; }
        }
        @media (max-width: 480px) {
          .stat-grid { grid-template-columns: repeat(2, 1fr); }
          .symptom-stats { grid-template-columns: repeat(2, 1fr); }
          .symptom-stats button { text-align: center; }
          .symptom-stat-label { font-size: 11px; }
        }
      `}</style>

      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "20px",
          fontFamily: "system-ui, sans-serif",
          minHeight: "100vh",
          background: "#f7f7f5",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <div>
            <h1
              style={{
                margin: "0 0 2px 0",
                fontSize: "1.3rem",
                color: "#111",
                fontWeight: "700",
              }}
            >
              🐾 PetParrk Admin
            </h1>
            <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>
              Signed in as {session?.user?.email}
            </p>
          </div>
          <Link
            href="/"
            style={{
              fontSize: "13px",
              color: "#2d6a4f",
              textDecoration: "none",
              fontWeight: "600",
            }}
          >
            ← Back to site
          </Link>
        </div>

        {/* Stats */}
        <div className="stat-grid">
          {[
            { label: "Active Vets", value: stats.activeVets, color: "#2d6a4f" },
            {
              label: "Pending Vets",
              value: stats.pendingVets,
              color: stats.pendingVets > 0 ? "#e65100" : "#111",
            },
            {
              label: "Pending Prices",
              value: stats.pendingSubs,
              color: stats.pendingSubs > 0 ? "#e65100" : "#111",
            },
            { label: "Total Prices", value: stats.totalPrices, color: "#111" },
            { label: "Total Users", value: stats.totalUsers, color: "#111" },
            {
              label: "Symptom Checks",
              value: stats.totalSymptomChecks,
              color: "#111",
            },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <p
                style={{
                  margin: "0 0 2px 0",
                  fontSize: "11px",
                  color: "#888",
                  fontWeight: "600",
                  textTransform: "uppercase",
                }}
              >
                {s.label}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  color: s.color,
                }}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            border: "1px solid #e8e8e8",
          }}
        >
          <div className="tabs-scroll" style={{ position: "relative" }}>
            {TABS.map((t) => (
              <button
                key={t}
                className={`tab-btn${tab === t ? " active" : ""}`}
                onClick={() => {
                  setTab(t);
                  setEditingVet(null);
                  setEditingPendingVet(null);
                  setEditingPrice(null);
                  setShowAddPrice(false);
                  setCallReviewEditing(null);
                  if (t === "Prices" && selectedVetId) {
                    setPricesLoading(true);
                    fetchPricesForVet(selectedVetId);
                  }
                  fetchAllCallNotes();
                  if (t === "Call Sheet" && callReviewVetId)
                    fetchReviewPrices(callReviewVetId);
                  if (t === "Team") fetchAdminUsers();
                }}
              >
                {t}
                {t === "Submissions" && stats.pendingSubs > 0 && (
                  <span className="tab-badge">{stats.pendingSubs}</span>
                )}
                {t === "Pending Vets" && stats.pendingVets > 0 && (
                  <span className="tab-badge">{stats.pendingVets}</span>
                )}
              </button>
            ))}
          </div>

          <div style={{ padding: "20px" }}>
            {/* ── SUBMISSIONS ──────────────────────────────────────── */}
            {tab === "Submissions" && (
              <div>
                <div className="section-header">
                  <h2 style={{ margin: 0, fontSize: "1rem", color: "#111" }}>
                    Price Submissions
                  </h2>
                  <div className="filter-bar">
                    {["pending", "approved", "rejected", "all"].map((f) => (
                      <button
                        key={f}
                        className={`adm-btn ${subFilter === f ? "adm-btn-green" : "adm-btn-gray"}`}
                        onClick={() => setSubFilter(f)}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                {subLoading && (
                  <p style={{ color: "#888", fontSize: "14px" }}>Loading...</p>
                )}
                {!subLoading && filteredSubs.length === 0 && (
                  <p
                    style={{
                      color: "#888",
                      fontSize: "14px",
                      fontStyle: "italic",
                    }}
                  >
                    No {subFilter} submissions.
                  </p>
                )}
                {filteredSubs.map((s) => (
                  <div key={s.id} className="sub-card">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            margin: "0 0 4px 0",
                            fontWeight: "600",
                            fontSize: "14px",
                            color: "#111",
                          }}
                        >
                          {s.vet_name} — {s.service_name}
                        </p>
                        <p style={{ margin: "0 0 2px 0", fontSize: "13px" }}>
                          <span style={{ color: "#888" }}>Price: </span>
                          <span style={{ fontWeight: "600", color: "#2d6a4f" }}>
                            ${Number(s.price_paid).toLocaleString()}
                          </span>
                          {s.visit_date && (
                            <>
                              <span
                                style={{ color: "#888", marginLeft: "12px" }}
                              >
                                Date:{" "}
                              </span>
                              <span>{formatDate(s.visit_date)}</span>
                            </>
                          )}
                        </p>
                        {s.submitter_note && (
                          <p
                            style={{
                              margin: "4px 0 0 0",
                              fontSize: "13px",
                              color: "#666",
                              fontStyle: "italic",
                            }}
                          >
                            "{s.submitter_note}"
                          </p>
                        )}
                        <p
                          style={{
                            margin: "4px 0 0 0",
                            fontSize: "12px",
                            color: "#aaa",
                          }}
                        >
                          Submitted {formatDate(s.created_at)}
                        </p>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexShrink: 0,
                        }}
                      >
                        <span className={`badge badge-${s.status}`}>
                          {s.status}
                        </span>
                        {s.status !== "approved" && (
                          <button
                            className="adm-btn adm-btn-green"
                            onClick={() =>
                              updateSubmissionStatus(s.id, "approved")
                            }
                          >
                            ✓ Approve
                          </button>
                        )}
                        {s.status !== "rejected" && (
                          <button
                            className="adm-btn adm-btn-red"
                            onClick={() =>
                              updateSubmissionStatus(s.id, "rejected")
                            }
                          >
                            ✕ Reject
                          </button>
                        )}
                        {s.status !== "pending" && (
                          <button
                            className="adm-btn adm-btn-gray"
                            onClick={() =>
                              updateSubmissionStatus(s.id, "pending")
                            }
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── PENDING VETS ─────────────────────────────────────── */}
            {tab === "Pending Vets" && (
              <div>
                <div className="section-header">
                  <div>
                    <h2
                      style={{
                        margin: "0 0 2px 0",
                        fontSize: "1rem",
                        color: "#111",
                      }}
                    >
                      Pending Vets
                    </h2>
                    <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>
                      Found by the AI agent — review before going live
                    </p>
                  </div>
                </div>
                <input
                  className="adm-input"
                  value={pendingVetSearch}
                  onChange={(e) => setPendingVetSearch(e.target.value)}
                  placeholder="Search by name..."
                  style={{ marginBottom: "14px", maxWidth: "360px" }}
                />
                {pendingVetsLoading && (
                  <p style={{ color: "#888", fontSize: "14px" }}>Loading...</p>
                )}
                {!pendingVetsLoading && pendingVets.length === 0 && (
                  <div style={{ textAlign: "center", padding: "48px 20px" }}>
                    <p style={{ fontSize: "32px", margin: "0 0 8px 0" }}>🏥</p>
                    <p style={{ color: "#bbb", fontSize: "14px", margin: 0 }}>
                      No pending vets.
                    </p>
                  </div>
                )}

                {pendingVets
                  .filter(
                    (v) =>
                      !pendingVetSearch.trim() ||
                      v.name
                        .toLowerCase()
                        .includes(pendingVetSearch.toLowerCase()),
                  )
                  .map((vet) => (
                    <div key={vet.id} className="pending-vet-card">
                      <div
                        className="pv-card-inner"
                        style={{
                          marginBottom:
                            editingPendingVet === vet.id ? "4px" : "0",
                        }}
                      >
                        <div>
                          {vet.source && (
                            <div style={{ marginBottom: "4px" }}>
                              <span
                                style={{
                                  fontSize: "11px",
                                  background: "#f0f0f0",
                                  color: "#666",
                                  padding: "1px 7px",
                                  borderRadius: "4px",
                                }}
                              >
                                via {vet.source}
                              </span>
                            </div>
                          )}
                          <div style={{ marginBottom: "2px" }}>
                            <span
                              style={{
                                fontWeight: "700",
                                fontSize: "14px",
                                color: "#111",
                              }}
                            >
                              {vet.name}
                            </span>
                          </div>
                          {vet.address && (
                            <p
                              style={{
                                margin: "0 0 1px 0",
                                fontSize: "13px",
                                color: "#666",
                              }}
                            >
                              {vet.address}
                            </p>
                          )}
                          {(() => {
                            const city =
                              vet.city && vet.city.length > 2
                                ? vet.city
                                : vet.neighborhood &&
                                    vet.neighborhood.length > 2
                                  ? vet.neighborhood
                                  : null;
                            const parts = [
                              city,
                              vet.state,
                              vet.zip_code,
                            ].filter(Boolean);
                            return parts.length > 0 ? (
                              <p
                                style={{
                                  margin: "0 0 2px 0",
                                  fontSize: "13px",
                                  color: "#666",
                                }}
                              >
                                {parts.join(", ")}
                              </p>
                            ) : null;
                          })()}
                          {vet.phone && (
                            <p
                              style={{
                                margin: "2px 0 0 0",
                                fontSize: "13px",
                                color: "#666",
                              }}
                            >
                              {vet.phone}
                            </p>
                          )}
                          <p
                            style={{
                              margin: "4px 0 0 0",
                              fontSize: "12px",
                              color: "#aaa",
                            }}
                          >
                            Found {formatDate(vet.created_at)}
                          </p>
                        </div>
                        <div className="pv-buttons">
                          <button
                            className="adm-btn adm-btn-green"
                            onClick={() => approvePendingVet(vet)}
                          >
                            ✅ Approve
                          </button>
                          <button
                            className="adm-btn adm-btn-outline"
                            onClick={() => {
                              if (editingPendingVet === vet.id) {
                                setEditingPendingVet(null);
                              } else {
                                setEditingPendingVet(vet.id);
                                setPendingVetForm({ ...vet });
                              }
                            }}
                          >
                            {editingPendingVet === vet.id
                              ? "Cancel"
                              : "✏️ Edit"}
                          </button>
                          <button
                            className="adm-btn adm-btn-red"
                            onClick={() => rejectPendingVet(vet.id)}
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                      {editingPendingVet === vet.id && (
                        <PendingVetEditForm
                          form={pendingVetForm}
                          setForm={setPendingVetForm}
                          onApprove={() => approvePendingVet(vet)}
                          onCancel={() => setEditingPendingVet(null)}
                        />
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* ── VETS ─────────────────────────────────────────────── */}
            {tab === "Vets" && (
              <div>
                <div className="section-header">
                  <h2 style={{ margin: 0, fontSize: "1rem", color: "#111" }}>
                    Vet Records
                  </h2>
                  <button
                    className="adm-btn adm-btn-green"
                    onClick={() => setShowAddVet(!showAddVet)}
                  >
                    {showAddVet ? "Cancel" : "+ Add Vet"}
                  </button>
                </div>
                {showAddVet && (
                  <div className="row-edit-bg" style={{ marginBottom: "16px" }}>
                    <p
                      style={{
                        margin: "0 0 12px 0",
                        fontWeight: "600",
                        fontSize: "13px",
                        color: "#111",
                      }}
                    >
                      New Vet
                    </p>
                    <div
                      className="form-grid-3"
                      style={{ marginBottom: "10px" }}
                    >
                      <div>
                        <label className="field-label">Name *</label>
                        <input
                          className="adm-input"
                          value={addVetForm.name}
                          onChange={(e) =>
                            setAddVetForm({
                              ...addVetForm,
                              name: e.target.value,
                            })
                          }
                          placeholder="Clinic name"
                        />
                      </div>
                      <div>
                        <label className="field-label">Slug</label>
                        <input
                          className="adm-input"
                          value={addVetForm.slug}
                          onChange={(e) =>
                            setAddVetForm({
                              ...addVetForm,
                              slug: e.target.value,
                            })
                          }
                          placeholder="auto-generated if blank"
                        />
                      </div>
                      <div>
                        <label className="field-label">Status</label>
                        <select
                          className="adm-input"
                          value={addVetForm.status}
                          onChange={(e) =>
                            setAddVetForm({
                              ...addVetForm,
                              status: e.target.value,
                            })
                          }
                        >
                          {STATUS_TYPES.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div
                      className="form-grid-4"
                      style={{ marginBottom: "10px" }}
                    >
                      <div>
                        <label className="field-label">Neighborhood</label>
                        <input
                          className="adm-input"
                          value={addVetForm.neighborhood}
                          onChange={(e) =>
                            setAddVetForm({
                              ...addVetForm,
                              neighborhood: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="field-label">City</label>
                        <input
                          className="adm-input"
                          value={addVetForm.city}
                          onChange={(e) =>
                            setAddVetForm({
                              ...addVetForm,
                              city: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="field-label">State</label>
                        <input
                          className="adm-input"
                          value={addVetForm.state || ""}
                          onChange={(e) =>
                            setAddVetForm({
                              ...addVetForm,
                              state: e.target.value,
                            })
                          }
                          placeholder="e.g. CA"
                        />
                      </div>
                      <div>
                        <label className="field-label">Phone</label>
                        <input
                          className="adm-input"
                          value={addVetForm.phone}
                          onChange={(e) =>
                            setAddVetForm({
                              ...addVetForm,
                              phone: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="field-label">Website</label>
                        <input
                          className="adm-input"
                          value={addVetForm.website}
                          onChange={(e) =>
                            setAddVetForm({
                              ...addVetForm,
                              website: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div
                      className="form-grid-4"
                      style={{ marginBottom: "10px" }}
                    >
                      <div>
                        <label className="field-label">Address</label>
                        <input
                          className="adm-input"
                          value={addVetForm.address}
                          onChange={(e) =>
                            setAddVetForm({
                              ...addVetForm,
                              address: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="field-label">ZIP</label>
                        <input
                          className="adm-input"
                          value={addVetForm.zip_code}
                          onChange={(e) =>
                            setAddVetForm({
                              ...addVetForm,
                              zip_code: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="field-label">Vet Type</label>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                            marginTop: "2px",
                          }}
                        >
                          {VET_TYPES.map((t) => (
                            <label
                              key={t}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                fontSize: "13px",
                                cursor: "pointer",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={(addVetForm.vet_type || []).includes(
                                  t,
                                )}
                                onChange={(e) => {
                                  const cur = addVetForm.vet_type || [];
                                  setAddVetForm({
                                    ...addVetForm,
                                    vet_type: e.target.checked
                                      ? [...cur, t]
                                      : cur.filter((x) => x !== t),
                                  });
                                }}
                              />
                              {t}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="field-label">Ownership</label>
                        <select
                          className="adm-input"
                          value={addVetForm.ownership}
                          onChange={(e) =>
                            setAddVetForm({
                              ...addVetForm,
                              ownership: e.target.value,
                            })
                          }
                        >
                          {OWNERSHIP_TYPES.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div
                      className="form-grid-3"
                      style={{ marginBottom: "10px" }}
                    >
                      <div>
                        <label className="field-label">
                          Accepting Patients
                        </label>
                        <select
                          className="adm-input"
                          value={
                            addVetForm.accepting_new_patients === null
                              ? "unknown"
                              : addVetForm.accepting_new_patients
                                ? "yes"
                                : "no"
                          }
                          onChange={(e) =>
                            setAddVetForm({
                              ...addVetForm,
                              accepting_new_patients:
                                e.target.value === "unknown"
                                  ? null
                                  : e.target.value === "yes",
                            })
                          }
                        >
                          <option value="unknown">Unknown</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                      <div>
                        <label className="field-label">CareCredit</label>
                        <select
                          className="adm-input"
                          value={addVetForm.carecredit ? "yes" : "no"}
                          onChange={(e) =>
                            setAddVetForm({
                              ...addVetForm,
                              carecredit: e.target.value === "yes",
                            })
                          }
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                      <div>
                        <label className="field-label">Last Verified</label>
                        <input
                          className="adm-input"
                          type="date"
                          value={addVetForm.last_verified || ""}
                          onChange={(e) =>
                            setAddVetForm({
                              ...addVetForm,
                              last_verified: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div style={{ marginBottom: "10px" }}>
                      <label className="field-label">Hours</label>
                      <textarea
                        className="adm-input"
                        rows={2}
                        style={{ height: "auto", resize: "vertical" }}
                        value={addVetForm.hours || ""}
                        onChange={(e) =>
                          setAddVetForm({
                            ...addVetForm,
                            hours: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div style={{ marginBottom: "12px" }}>
                      <label className="field-label">Internal Notes</label>
                      <textarea
                        className="adm-input"
                        rows={3}
                        style={{ height: "auto", resize: "vertical" }}
                        value={addVetForm.internal_notes || ""}
                        onChange={(e) =>
                          setAddVetForm({
                            ...addVetForm,
                            internal_notes: e.target.value,
                          })
                        }
                      />
                    </div>
                    <button
                      className="adm-btn adm-btn-green"
                      onClick={addVet}
                      disabled={!addVetForm.name}
                    >
                      Add Vet
                    </button>
                  </div>
                )}
                <input
                  className="adm-input"
                  value={vetSearch}
                  onChange={(e) => setVetSearch(e.target.value)}
                  placeholder="Search by name..."
                  style={{ marginBottom: "14px", maxWidth: "360px" }}
                />

                {vetsLoading && (
                  <p style={{ color: "#888", fontSize: "14px" }}>Loading...</p>
                )}
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e8e8e8",
                    borderRadius: "8px",
                    overflow: "hidden",
                    minHeight: "200px",
                  }}
                >
                  {filteredVets.map((vet) => (
                    <div key={vet.id}>
                      <div className="vet-row" style={{ padding: "14px 16px" }}>
                        <div className="vet-row-inner">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: "600",
                                  fontSize: "14px",
                                  color: "#111",
                                }}
                              >
                                {vet.name}
                              </span>
                              {vet.internal_notes === "declined_to_share" && (
                                <span
                                  style={{
                                    fontSize: "11px",
                                    background: "#fce4ec",
                                    color: "#c62828",
                                    padding: "1px 7px",
                                    borderRadius: "20px",
                                    fontWeight: "600",
                                    border: "1px solid #ef9a9a",
                                  }}
                                >
                                  🚫 Declined
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: "13px",
                                color: "#666",
                                marginTop: "3px",
                              }}
                            >
                              {vet.neighborhood}
                            </div>
                            <div
                              style={{
                                fontSize: "13px",
                                color: "#888",
                                marginTop: "2px",
                              }}
                            >
                              {vet.phone}
                            </div>
                          </div>
                          <div className="vet-row-buttons">
                            <span className={`badge badge-${vet.status}`}>
                              {vet.status === "active" ? "Active" : "Inactive"}
                            </span>
                            <button
                              className="adm-btn adm-btn-gray"
                              onClick={() => toggleVetStatus(vet)}
                            >
                              {vet.status === "active"
                                ? "Deactivate"
                                : "Activate"}
                            </button>
                            <button
                              className="adm-btn adm-btn-outline"
                              onClick={() =>
                                editingVet === vet.id
                                  ? setEditingVet(null)
                                  : startEditVet(vet)
                              }
                            >
                              {editingVet === vet.id ? "Cancel" : "Edit"}
                            </button>
                          </div>
                        </div>
                      </div>
                      {editingVet === vet.id && (
                        <div style={{ padding: "0 14px 14px 14px" }}>
                          <div className="row-edit-bg">
                            <div
                              className="form-grid-3"
                              style={{ marginBottom: "10px" }}
                            >
                              <div>
                                <label className="field-label">Name</label>
                                <input
                                  className="adm-input"
                                  value={vetForm.name || ""}
                                  onChange={(e) =>
                                    setVetForm({
                                      ...vetForm,
                                      name: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="field-label">Slug</label>
                                <input
                                  className="adm-input"
                                  value={vetForm.slug || ""}
                                  onChange={(e) =>
                                    setVetForm({
                                      ...vetForm,
                                      slug: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="field-label">Status</label>
                                <select
                                  className="adm-input"
                                  value={vetForm.status || "active"}
                                  onChange={(e) =>
                                    setVetForm({
                                      ...vetForm,
                                      status: e.target.value,
                                    })
                                  }
                                >
                                  {STATUS_TYPES.map((s) => (
                                    <option key={s}>{s}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div
                              className="form-grid-4"
                              style={{ marginBottom: "10px" }}
                            >
                              <div>
                                <label className="field-label">
                                  Neighborhood
                                </label>
                                <input
                                  className="adm-input"
                                  value={vetForm.neighborhood || ""}
                                  onChange={(e) =>
                                    setVetForm({
                                      ...vetForm,
                                      neighborhood: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="field-label">City</label>
                                <input
                                  className="adm-input"
                                  value={vetForm.city || ""}
                                  onChange={(e) =>
                                    setVetForm({
                                      ...vetForm,
                                      city: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="field-label">State</label>
                                <input
                                  className="adm-input"
                                  value={vetForm.state || ""}
                                  onChange={(e) =>
                                    setVetForm({
                                      ...vetForm,
                                      state: e.target.value,
                                    })
                                  }
                                  placeholder="e.g. CA"
                                />
                              </div>
                              <div>
                                <label className="field-label">Phone</label>
                                <input
                                  className="adm-input"
                                  value={vetForm.phone || ""}
                                  onChange={(e) =>
                                    setVetForm({
                                      ...vetForm,
                                      phone: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="field-label">Website</label>
                                <input
                                  className="adm-input"
                                  value={vetForm.website || ""}
                                  onChange={(e) =>
                                    setVetForm({
                                      ...vetForm,
                                      website: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>
                            <div
                              className="form-grid-4"
                              style={{ marginBottom: "10px" }}
                            >
                              <div>
                                <label className="field-label">Address</label>
                                <input
                                  className="adm-input"
                                  value={vetForm.address || ""}
                                  onChange={(e) =>
                                    setVetForm({
                                      ...vetForm,
                                      address: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="field-label">ZIP</label>
                                <input
                                  className="adm-input"
                                  value={vetForm.zip_code || ""}
                                  onChange={(e) =>
                                    setVetForm({
                                      ...vetForm,
                                      zip_code: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="field-label">Vet Type</label>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "4px",
                                    marginTop: "2px",
                                  }}
                                >
                                  {VET_TYPES.map((t) => (
                                    <label
                                      key={t}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        fontSize: "13px",
                                        cursor: "pointer",
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={(Array.isArray(
                                          vetForm.vet_type,
                                        )
                                          ? vetForm.vet_type
                                          : [vetForm.vet_type]
                                        ).includes(t)}
                                        onChange={(e) => {
                                          const cur = Array.isArray(
                                            vetForm.vet_type,
                                          )
                                            ? vetForm.vet_type
                                            : [vetForm.vet_type];
                                          setVetForm({
                                            ...vetForm,
                                            vet_type: e.target.checked
                                              ? [...cur, t]
                                              : cur.filter((x) => x !== t),
                                          });
                                        }}
                                      />
                                      {t}
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="field-label">Ownership</label>
                                <select
                                  className="adm-input"
                                  value={vetForm.ownership || ""}
                                  onChange={(e) =>
                                    setVetForm({
                                      ...vetForm,
                                      ownership: e.target.value,
                                    })
                                  }
                                >
                                  {OWNERSHIP_TYPES.map((t) => (
                                    <option key={t}>{t}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div
                              className="form-grid-3"
                              style={{ marginBottom: "10px" }}
                            >
                              <div>
                                <label className="field-label">
                                  Accepting Patients
                                </label>
                                <select
                                  className="adm-input"
                                  value={
                                    vetForm.accepting_new_patients == null
                                      ? "unknown"
                                      : vetForm.accepting_new_patients
                                        ? "yes"
                                        : "no"
                                  }
                                  onChange={(e) =>
                                    setVetForm({
                                      ...vetForm,
                                      accepting_new_patients:
                                        e.target.value === "unknown"
                                          ? null
                                          : e.target.value === "yes",
                                    })
                                  }
                                >
                                  <option value="unknown">Unknown</option>
                                  <option value="yes">Yes</option>
                                  <option value="no">No</option>
                                </select>
                              </div>
                              <div>
                                <label className="field-label">
                                  CareCredit
                                </label>
                                <select
                                  className="adm-input"
                                  value={vetForm.carecredit ? "yes" : "no"}
                                  onChange={(e) =>
                                    setVetForm({
                                      ...vetForm,
                                      carecredit: e.target.value === "yes",
                                    })
                                  }
                                >
                                  <option value="no">No</option>
                                  <option value="yes">Yes</option>
                                </select>
                              </div>
                              <div>
                                <label className="field-label">
                                  Last Verified
                                </label>
                                <input
                                  className="adm-input"
                                  type="date"
                                  value={
                                    vetForm.last_verified
                                      ? vetForm.last_verified.slice(0, 10)
                                      : ""
                                  }
                                  onChange={(e) =>
                                    setVetForm({
                                      ...vetForm,
                                      last_verified: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>
                            <div style={{ marginBottom: "10px" }}>
                              <label className="field-label">Hours</label>
                              <textarea
                                className="adm-input"
                                rows={2}
                                style={{ height: "auto", resize: "vertical" }}
                                value={vetForm.hours || ""}
                                onChange={(e) =>
                                  setVetForm({
                                    ...vetForm,
                                    hours: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div style={{ marginBottom: "12px" }}>
                              <label className="field-label">
                                Internal Notes
                              </label>
                              <textarea
                                className="adm-input"
                                rows={4}
                                style={{ height: "auto", resize: "vertical" }}
                                value={vetForm.internal_notes || ""}
                                onChange={(e) =>
                                  setVetForm({
                                    ...vetForm,
                                    internal_notes: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                className="adm-btn adm-btn-green"
                                onClick={saveVet}
                                disabled={vetSaving}
                              >
                                {vetSaving ? "Saving..." : "Save Changes"}
                              </button>
                              <button
                                className="adm-btn adm-btn-gray"
                                onClick={() => setEditingVet(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── PRICES ───────────────────────────────────────────── */}
            {tab === "Prices" && (
              <div>
                {/* ── Vet search FIRST — above everything ── */}
                <div className="section-header">
                  <h2 style={{ margin: 0, fontSize: "1rem", color: "#111" }}>
                    Prices
                  </h2>
                </div>
                <div style={{ marginBottom: "20px", maxWidth: "400px" }}>
                  <label className="field-label">Search Vet</label>
                  <div className="price-search-wrap">
                    <div style={{ position: "relative" }}>
                      <input
                        ref={priceSearchRef}
                        className="adm-input"
                        style={{
                          paddingRight: vetPriceSearch ? "32px" : "12px",
                        }}
                        value={vetPriceSearch}
                        onChange={handlePriceSearchChange}
                        onFocus={() => setShowVetDropdown(true)}
                        onBlur={() => {
                          setTimeout(() => setShowVetDropdown(false), 150);
                        }}
                        placeholder="Click to browse or type to filter..."
                        autoComplete="off"
                      />
                      {vetPriceSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setVetPriceSearch("");
                            setSelectedVetId("");
                            setVetPrices([]);
                            setShowVetDropdown(false);
                            setEditingPrice(null);
                            setShowAddPrice(false);
                          }}
                          style={{
                            position: "absolute",
                            right: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "16px",
                            color: "#aaa",
                            lineHeight: 1,
                            padding: 0,
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {showVetDropdown && (
                      <div className="price-search-dropdown">
                        {filteredPriceVets.length === 0 && (
                          <div
                            style={{
                              padding: "10px 12px",
                              fontSize: "13px",
                              color: "#888",
                            }}
                          >
                            No vets found
                          </div>
                        )}
                        {filteredPriceVets.slice(0, 50).map((v) => (
                          <div
                            key={v.id}
                            className={`price-search-item${selectedVetId === v.id ? " selected" : ""}`}
                            // onMouseDown fires BEFORE onBlur — this is the key fix
                            onMouseDown={() => selectPriceVet(v)}
                          >
                            {v.name}
                            {v.city ? (
                              <span style={{ color: "#888", fontSize: "13px" }}>
                                {" "}
                                — {v.city}
                              </span>
                            ) : (
                              ""
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedVetId && (
                    <p
                      style={{
                        margin: "6px 0 0 0",
                        fontSize: "13px",
                        color: "#2d6a4f",
                      }}
                    >
                      ✓ Showing prices for <strong>{vetPriceSearch}</strong>
                    </p>
                  )}
                </div>

                {selectedVetId && (
                  <>
                    <div className="section-header">
                      <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>
                        {vetPrices.length} price
                        {vetPrices.length !== 1 ? "s" : ""} on file
                      </p>
                      <button
                        className="adm-btn adm-btn-green"
                        onClick={() => setShowAddPrice(!showAddPrice)}
                      >
                        {showAddPrice ? "Cancel" : "+ Add Price"}
                      </button>
                    </div>

                    {showAddPrice && (
                      <div
                        className="row-edit-bg"
                        style={{ marginBottom: "14px" }}
                      >
                        <p
                          style={{
                            margin: "0 0 10px 0",
                            fontWeight: "600",
                            fontSize: "13px",
                          }}
                        >
                          New Price Row
                        </p>
                        <div
                          className="form-grid-4"
                          style={{ marginBottom: "10px" }}
                        >
                          <div>
                            <label className="field-label">Service *</label>
                            <select
                              className="adm-input"
                              style={
                                addPriceError && !addPriceForm.service_id
                                  ? {
                                      borderColor: "#c62828",
                                      borderWidth: "2px",
                                    }
                                  : {}
                              }
                              value={addPriceForm.service_id}
                              onChange={(e) => {
                                setAddPriceError(false);
                                setAddPriceForm({
                                  ...addPriceForm,
                                  service_id: e.target.value,
                                });
                              }}
                            >
                              <option value="">— Select —</option>
                              {services.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="field-label">Price Type</label>
                            <select
                              className="adm-input"
                              value={addPriceForm.price_type}
                              onChange={(e) =>
                                setAddPriceForm({
                                  ...addPriceForm,
                                  price_type: e.target.value,
                                })
                              }
                            >
                              {PRICE_TYPES.map((t) => (
                                <option key={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="field-label">Price Low *</label>
                            <input
                              className="adm-input"
                              style={
                                addPriceError &&
                                !addPriceForm.price_low &&
                                !addPriceForm.call_for_quote
                                  ? {
                                      borderColor: "#c62828",
                                      borderWidth: "2px",
                                    }
                                  : {}
                              }
                              type="number"
                              value={addPriceForm.price_low}
                              onChange={(e) => {
                                setAddPriceError(false);
                                setAddPriceForm({
                                  ...addPriceForm,
                                  price_low: e.target.value,
                                });
                              }}
                              placeholder="e.g. 65"
                            />
                          </div>
                          <div>
                            <label className="field-label">Price High</label>
                            <input
                              className="adm-input"
                              type="number"
                              value={addPriceForm.price_high}
                              onChange={(e) =>
                                setAddPriceForm({
                                  ...addPriceForm,
                                  price_high: e.target.value,
                                })
                              }
                              placeholder="range only"
                            />
                          </div>
                        </div>
                        <div
                          className="form-grid-2"
                          style={{ marginBottom: "14px" }}
                        >
                          <div>
                            <label className="field-label">Species</label>
                            <select
                              className="adm-input"
                              style={
                                addPriceError && !addPriceForm.species
                                  ? {
                                      borderColor: "#c62828",
                                      borderWidth: "2px",
                                    }
                                  : {}
                              }
                              value={
                                addPriceForm.species === "other" ||
                                (addPriceForm.species &&
                                  ![
                                    "dog",
                                    "cat",
                                    "rabbit",
                                    "bird",
                                    "other",
                                    "",
                                  ].includes(addPriceForm.species))
                                  ? "other"
                                  : addPriceForm.species || ""
                              }
                              onChange={(e) => {
                                setAddPriceError(false);
                                setAddPriceForm({
                                  ...addPriceForm,
                                  species: e.target.value,
                                  species_other: "",
                                });
                              }}
                            >
                              <option value="">— Select —</option>
                              <option value="dog">Dog</option>
                              <option value="cat">Cat</option>
                              <option value="rabbit">Rabbit</option>
                              <option value="bird">Bird</option>
                              <option value="other">Other...</option>
                            </select>
                            {(addPriceForm.species === "other" ||
                              (addPriceForm.species &&
                                ![
                                  "dog",
                                  "cat",
                                  "rabbit",
                                  "bird",
                                  "other",
                                  "",
                                ].includes(addPriceForm.species))) && (
                              <input
                                className="adm-input"
                                style={{ marginTop: "8px" }}
                                value={
                                  addPriceForm.species_other ||
                                  (addPriceForm.species &&
                                  ![
                                    "dog",
                                    "cat",
                                    "rabbit",
                                    "bird",
                                    "other",
                                    "",
                                  ].includes(addPriceForm.species)
                                    ? addPriceForm.species
                                    : "")
                                }
                                onChange={(e) =>
                                  setAddPriceForm({
                                    ...addPriceForm,
                                    species: "other",
                                    species_other: e.target.value,
                                  })
                                }
                                placeholder="e.g. Guinea pig, snake..."
                              />
                            )}
                          </div>
                          <div>
                            <label
                              className="field-label"
                              style={{ display: "block", marginBottom: "8px" }}
                            >
                              Includes
                            </label>
                            <div
                              style={{
                                display: "flex",
                                gap: "6px",
                                flexWrap: "nowrap",
                                marginBottom: "10px",
                              }}
                            >
                              {[
                                ["includes_bloodwork", "Bloodwork"],
                                ["includes_xrays", "X-rays"],
                                ["includes_anesthesia", "Anesthesia"],
                              ].map(([f, l]) => (
                                <button
                                  key={f}
                                  type="button"
                                  onClick={() =>
                                    setAddPriceForm((prev) => ({
                                      ...prev,
                                      [f]: !prev[f],
                                    }))
                                  }
                                  style={{
                                    padding: "3px 8px",
                                    borderRadius: "20px",
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    border: addPriceForm[f]
                                      ? "none"
                                      : "1px solid #ddd",
                                    background: addPriceForm[f]
                                      ? "#2d6a4f"
                                      : "#f5f5f5",
                                    color: addPriceForm[f] ? "#fff" : "#555",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {l}
                                </button>
                              ))}
                            </div>
                            <label
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                fontSize: "13px",
                                cursor: "pointer",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={!!addPriceForm.call_for_quote}
                                onChange={(e) =>
                                  setAddPriceForm({
                                    ...addPriceForm,
                                    call_for_quote: e.target.checked,
                                  })
                                }
                              />
                              Call for quote
                            </label>
                          </div>
                        </div>
                        <div style={{ marginBottom: "10px" }}>
                          <label className="field-label">Notes</label>
                          <input
                            className="adm-input"
                            value={addPriceForm.notes}
                            onChange={(e) =>
                              setAddPriceForm({
                                ...addPriceForm,
                                notes: e.target.value,
                              })
                            }
                            placeholder="Optional"
                          />
                        </div>
                        {addPriceError && (
                          <div
                            style={{
                              background: "#fff0f0",
                              border: "1px solid #ffcdd2",
                              borderRadius: "8px",
                              padding: "10px 14px",
                              marginBottom: "10px",
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                fontSize: "13px",
                                color: "#c62828",
                                fontWeight: "600",
                              }}
                            >
                              ⚠️ Please fill in all required fields:
                            </p>
                            <ul
                              style={{
                                margin: "6px 0 0 0",
                                paddingLeft: "18px",
                                fontSize: "13px",
                                color: "#c62828",
                              }}
                            >
                              {!addPriceForm.service_id && (
                                <li>Service is required</li>
                              )}
                              {!addPriceForm.species && (
                                <li>Species is required</li>
                              )}
                              {!addPriceForm.price_low &&
                                !addPriceForm.call_for_quote && (
                                  <li>Price or "Call for quote" is required</li>
                                )}
                            </ul>
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            className="adm-btn adm-btn-green"
                            onClick={addPrice}
                          >
                            Add Price
                          </button>
                        </div>
                      </div>
                    )}

                    {pricesLoading && (
                      <p style={{ color: "#888", fontSize: "14px" }}>
                        Loading prices...
                      </p>
                    )}
                    {!pricesLoading && vetPrices.length === 0 && (
                      <p
                        style={{
                          color: "#888",
                          fontSize: "14px",
                          fontStyle: "italic",
                        }}
                      >
                        No prices on file for this vet.
                      </p>
                    )}

                    <div
                      style={{
                        background: "#fff",
                        border: "1px solid #e8e8e8",
                        borderRadius: "8px",
                        overflow: "hidden",
                      }}
                    >
                      {vetPrices.map((p) => (
                        <div key={p.id}>
                          <div className="price-row-wrap">
                            <div className="price-row-info">
                              <div
                                style={{
                                  fontWeight: "600",
                                  fontSize: "14px",
                                  color: "#111",
                                  marginBottom: "6px",
                                }}
                              >
                                {p.services?.name || "—"}
                              </div>
                              <div style={{ marginBottom: "8px" }}>
                                <span
                                  style={{
                                    fontSize: "14px",
                                    color: "#2d6a4f",
                                    fontWeight: "600",
                                  }}
                                >
                                  {formatPrice(
                                    p.price_low,
                                    p.price_high,
                                    p.price_type,
                                  )}
                                </span>
                                <span
                                  style={{
                                    marginLeft: "8px",
                                    fontSize: "12px",
                                    color: "#888",
                                  }}
                                >
                                  ({p.price_type})
                                </span>
                              </div>
                              {p.species && (
                                <div style={{ marginBottom: "6px" }}>
                                  <span
                                    style={{
                                      fontSize: "12px",
                                      background: "#f0f0f0",
                                      color: "#555",
                                      padding: "2px 8px",
                                      borderRadius: "4px",
                                      textTransform: "capitalize",
                                    }}
                                  >
                                    {p.species}
                                  </span>
                                </div>
                              )}
                              {(p.includes_bloodwork ||
                                p.includes_xrays ||
                                p.includes_anesthesia ||
                                p.call_for_quote) && (
                                <div
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "6px",
                                    marginBottom: "6px",
                                  }}
                                >
                                  {p.includes_bloodwork && (
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        background: "#e8f5e9",
                                        color: "#2d6a4f",
                                        padding: "2px 8px",
                                        borderRadius: "4px",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      + bloodwork
                                    </span>
                                  )}
                                  {p.includes_xrays && (
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        background: "#e8f5e9",
                                        color: "#2d6a4f",
                                        padding: "2px 8px",
                                        borderRadius: "4px",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      + x-rays
                                    </span>
                                  )}
                                  {p.includes_anesthesia && (
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        background: "#e8f5e9",
                                        color: "#2d6a4f",
                                        padding: "2px 8px",
                                        borderRadius: "4px",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      + anesthesia
                                    </span>
                                  )}
                                  {p.call_for_quote && (
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        background: "#fff8e1",
                                        color: "#e65100",
                                        padding: "2px 8px",
                                        borderRadius: "4px",
                                      }}
                                    >
                                      call for quote
                                    </span>
                                  )}
                                </div>
                              )}
                              {p.notes && (
                                <p
                                  style={{
                                    margin: "6px 0 0 0",
                                    fontSize: "12px",
                                    color: "#888",
                                    fontStyle: "italic",
                                  }}
                                >
                                  {p.notes}
                                </p>
                              )}
                            </div>
                            <div className="price-row-btns">
                              <button
                                className="adm-btn adm-btn-outline"
                                onClick={() => {
                                  setDeletePriceConfirm(null);
                                  editingPrice === p.id
                                    ? setEditingPrice(null)
                                    : startEditPrice(p);
                                }}
                              >
                                {editingPrice === p.id ? "Cancel" : "Edit"}
                              </button>
                              {deletePriceConfirm === p.id ? (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "13px",
                                      color: "#c62828",
                                      fontWeight: "600",
                                    }}
                                  >
                                    Delete?
                                  </span>
                                  <button
                                    className="adm-btn adm-btn-red"
                                    onClick={() => deletePrice(p.id)}
                                  >
                                    Yes
                                  </button>
                                  <button
                                    className="adm-btn adm-btn-gray"
                                    onClick={() => setDeletePriceConfirm(null)}
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="adm-btn adm-btn-red"
                                  onClick={() => setDeletePriceConfirm(p.id)}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                          {editingPrice === p.id && (
                            <div style={{ padding: "0 12px 14px 12px" }}>
                              <div
                                className="row-edit-bg"
                                style={{ margin: 0 }}
                              >
                                <div
                                  className="form-grid-4"
                                  style={{ marginBottom: "10px" }}
                                >
                                  <div>
                                    <label className="field-label">
                                      Service
                                    </label>
                                    <select
                                      className="adm-input"
                                      value={priceForm.service_id || ""}
                                      onChange={(e) =>
                                        setPriceForm({
                                          ...priceForm,
                                          service_id: e.target.value,
                                        })
                                      }
                                    >
                                      {services.map((s) => (
                                        <option key={s.id} value={s.id}>
                                          {s.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="field-label">
                                      Price Type
                                    </label>
                                    <select
                                      className="adm-input"
                                      value={priceForm.price_type || "exact"}
                                      onChange={(e) =>
                                        setPriceForm({
                                          ...priceForm,
                                          price_type: e.target.value,
                                        })
                                      }
                                    >
                                      {PRICE_TYPES.map((t) => (
                                        <option key={t}>{t}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="field-label">
                                      Price Low
                                    </label>
                                    <input
                                      className="adm-input"
                                      type="number"
                                      value={priceForm.price_low}
                                      onChange={(e) =>
                                        setPriceForm({
                                          ...priceForm,
                                          price_low: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <label className="field-label">
                                      Price High
                                    </label>
                                    <input
                                      className="adm-input"
                                      type="number"
                                      value={priceForm.price_high}
                                      onChange={(e) =>
                                        setPriceForm({
                                          ...priceForm,
                                          price_high: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                </div>
                                <div
                                  className="form-grid-2"
                                  style={{ marginBottom: "14px" }}
                                >
                                  <div>
                                    <label className="field-label">
                                      Species
                                    </label>
                                    <select
                                      className="adm-input"
                                      style={
                                        editPriceError && !priceForm.species
                                          ? {
                                              borderColor: "#c62828",
                                              borderWidth: "2px",
                                            }
                                          : {}
                                      }
                                      value={
                                        priceForm.species === "other" ||
                                        (priceForm.species &&
                                          ![
                                            "dog",
                                            "cat",
                                            "rabbit",
                                            "bird",
                                            "other",
                                            "",
                                          ].includes(priceForm.species))
                                          ? "other"
                                          : priceForm.species || ""
                                      }
                                      onChange={(e) => {
                                        setEditPriceError(false);
                                        setPriceForm({
                                          ...priceForm,
                                          species: e.target.value,
                                          species_other: "",
                                        });
                                      }}
                                    >
                                      <option value="">— Select —</option>
                                      <option value="dog">Dog</option>
                                      <option value="cat">Cat</option>
                                      <option value="rabbit">Rabbit</option>
                                      <option value="bird">Bird</option>
                                      <option value="other">Other...</option>
                                    </select>
                                    {(priceForm.species === "other" ||
                                      (priceForm.species &&
                                        ![
                                          "dog",
                                          "cat",
                                          "rabbit",
                                          "bird",
                                          "other",
                                          "",
                                        ].includes(priceForm.species))) && (
                                      <input
                                        className="adm-input"
                                        style={{ marginTop: "8px" }}
                                        value={
                                          priceForm.species_other ||
                                          (priceForm.species &&
                                          ![
                                            "dog",
                                            "cat",
                                            "rabbit",
                                            "bird",
                                            "other",
                                            "",
                                          ].includes(priceForm.species)
                                            ? priceForm.species
                                            : "")
                                        }
                                        onChange={(e) =>
                                          setPriceForm({
                                            ...priceForm,
                                            species: "other",
                                            species_other: e.target.value,
                                          })
                                        }
                                        placeholder="e.g. Guinea pig, snake..."
                                      />
                                    )}
                                  </div>
                                  <div>
                                    <label
                                      className="field-label"
                                      style={{
                                        display: "block",
                                        marginBottom: "8px",
                                      }}
                                    >
                                      Includes
                                    </label>
                                    <div
                                      className="price-edit-pills"
                                      style={{ marginBottom: "10px" }}
                                    >
                                      {[
                                        ["includes_bloodwork", "Bloodwork"],
                                        ["includes_xrays", "X-rays"],
                                        ["includes_anesthesia", "Anesthesia"],
                                      ].map(([f, l]) => (
                                        <button
                                          key={f}
                                          type="button"
                                          onClick={() =>
                                            setPriceForm((prev) => ({
                                              ...prev,
                                              [f]: !prev[f],
                                            }))
                                          }
                                          style={{
                                            padding: "3px 8px",
                                            borderRadius: "20px",
                                            fontSize: "11px",
                                            fontWeight: "600",
                                            cursor: "pointer",
                                            border: priceForm[f]
                                              ? "none"
                                              : "1px solid #ddd",
                                            background: priceForm[f]
                                              ? "#2d6a4f"
                                              : "#f5f5f5",
                                            color: priceForm[f]
                                              ? "#fff"
                                              : "#555",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          {l}
                                        </button>
                                      ))}
                                    </div>
                                    <label
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        fontSize: "13px",
                                        cursor: "pointer",
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={!!priceForm.call_for_quote}
                                        onChange={(e) =>
                                          setPriceForm({
                                            ...priceForm,
                                            call_for_quote: e.target.checked,
                                          })
                                        }
                                      />
                                      Call for quote
                                    </label>
                                  </div>
                                </div>
                                <div
                                  style={{
                                    marginBottom: "14px",
                                    marginTop: "6px",
                                  }}
                                >
                                  <label className="field-label">Notes</label>
                                  <textarea
                                    className="adm-input"
                                    rows={3}
                                    style={{
                                      width: "100%",
                                      resize: "vertical",
                                      height: "auto",
                                    }}
                                    value={priceForm.notes || ""}
                                    onChange={(e) =>
                                      setPriceForm({
                                        ...priceForm,
                                        notes: e.target.value,
                                      })
                                    }
                                    placeholder="Notes about this price..."
                                  />
                                </div>
                                {editPriceError && (
                                  <div
                                    style={{
                                      background: "#fff0f0",
                                      border: "1px solid #ffcdd2",
                                      borderRadius: "8px",
                                      padding: "10px 14px",
                                      marginBottom: "10px",
                                    }}
                                  >
                                    <p
                                      style={{
                                        margin: 0,
                                        fontSize: "13px",
                                        color: "#c62828",
                                        fontWeight: "600",
                                      }}
                                    >
                                      ⚠️ Please fill in all required fields:
                                    </p>
                                    <ul
                                      style={{
                                        margin: "6px 0 0 0",
                                        paddingLeft: "18px",
                                        fontSize: "13px",
                                        color: "#c62828",
                                      }}
                                    >
                                      {!priceForm.service_id && (
                                        <li>Service is required</li>
                                      )}
                                      {!priceForm.species && (
                                        <li>Species is required</li>
                                      )}
                                      {!priceForm.price_low &&
                                        !priceForm.call_for_quote && (
                                          <li>
                                            Price or "Call for quote" is
                                            required
                                          </li>
                                        )}
                                    </ul>
                                  </div>
                                )}
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "8px",
                                    justifyContent: "flex-end",
                                  }}
                                >
                                  <button
                                    className="adm-btn adm-btn-gray"
                                    onClick={() => {
                                      setEditingPrice(null);
                                      setEditPriceError(false);
                                    }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    className="adm-btn adm-btn-green"
                                    onClick={() => savePrice(priceForm)}
                                    disabled={priceSaving}
                                  >
                                    {priceSaving ? "Saving..." : "Save Changes"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {unverifiedLoading && (
                  <p style={{ color: "#888", fontSize: "14px" }}>
                    Loading unverified prices...
                  </p>
                )}
                {unverifiedPrices.length > 0 && (
                  <div style={{ marginTop: "24px" }}>
                    <div
                      className="section-header"
                      style={{ marginBottom: "12px" }}
                    >
                      <div>
                        <h2
                          style={{ margin: 0, fontSize: "1rem", color: "#111" }}
                        >
                          🤖 AI-Found Prices
                          <span
                            style={{
                              marginLeft: "8px",
                              fontSize: "12px",
                              background: "#fff8e1",
                              color: "#e65100",
                              padding: "2px 8px",
                              borderRadius: "20px",
                              fontWeight: "600",
                            }}
                          >
                            {unverifiedPrices.length} to review
                          </span>
                        </h2>
                        <p
                          style={{ margin: 0, fontSize: "13px", color: "#888" }}
                        >
                          Found by the price scraper — verify before going live
                        </p>
                      </div>
                    </div>
                    <div
                      style={{
                        background: "#fff",
                        border: "1px solid #e8e8e8",
                        borderRadius: "8px",
                        overflow: "hidden",
                      }}
                    >
                      {unverifiedPrices.map((p, i) => (
                        <div
                          key={p.id}
                          style={{
                            padding: "12px 16px",
                            borderBottom:
                              i < unverifiedPrices.length - 1
                                ? "1px solid #f0f0f0"
                                : "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: "200px" }}>
                            <div
                              style={{
                                fontWeight: "600",
                                fontSize: "14px",
                                color: "#111",
                              }}
                            >
                              {p.vets?.name ||
                                p.pending_vets?.name ||
                                "Unknown vet"}
                            </div>
                            <div
                              style={{
                                fontSize: "13px",
                                color: "#666",
                                marginTop: "3px",
                              }}
                            >
                              {p.services?.name || "Unknown service"} —{" "}
                              <span
                                style={{ color: "#2d6a4f", fontWeight: "600" }}
                              >
                                {formatPrice(
                                  p.price_low,
                                  p.price_high,
                                  p.price_type,
                                )}
                              </span>
                            </div>
                            {p.notes && (
                              <div
                                style={{
                                  fontSize: "13px",
                                  color: "#888",
                                  fontStyle: "italic",
                                  marginTop: "3px",
                                }}
                              >
                                {p.notes}
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              className="adm-btn adm-btn-green"
                              onClick={() => approveUnverifiedPrice(p.id)}
                            >
                              ✓ Approve
                            </button>
                            <button
                              className="adm-btn adm-btn-red"
                              onClick={() => rejectUnverifiedPrice(p.id)}
                            >
                              ✕ Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── CALL SHEET ───────────────────────────────────────── */}
            {tab === "Call Sheet" &&
              (() => {
                const activeQueue = showAllVets ? fullCallQueue : callQueue;
                return (
                  <div>
                    {callQueueLoading && (
                      <p style={{ color: "#888", fontSize: "14px" }}>
                        Loading call queue...
                      </p>
                    )}
                    {!callQueueLoading && activeQueue.length === 0 && (
                      <div
                        style={{ textAlign: "center", padding: "48px 20px" }}
                      >
                        <p style={{ fontSize: "32px", margin: "0 0 8px 0" }}>
                          🎉
                        </p>
                        <p style={{ color: "#bbb", fontSize: "14px" }}>
                          All vets have been called!
                        </p>
                      </div>
                    )}
                    {!callQueueLoading &&
                      callIndex >= activeQueue.length &&
                      activeQueue.length > 0 && (
                        <div
                          style={{ textAlign: "center", padding: "48px 20px" }}
                        >
                          <p style={{ fontSize: "32px", margin: "0 0 8px 0" }}>
                            ✅
                          </p>
                          <p
                            style={{
                              color: "#2d6a4f",
                              fontSize: "14px",
                              fontWeight: "600",
                            }}
                          >
                            You've reached the end of the queue!
                          </p>
                          <button
                            className="adm-btn adm-btn-gray"
                            style={{ marginTop: "12px" }}
                            onClick={() => setCallIndex(0)}
                          >
                            Start over
                          </button>
                        </div>
                      )}

                    {/* Recently processed — always visible when there's history */}
                    {callLog.length > 0 && (
                      <div
                        style={{
                          background: "#f9f9f9",
                          border: "1px solid #eee",
                          borderRadius: "8px",
                          padding: "8px 12px",
                          marginBottom: "14px",
                        }}
                      >
                        <p
                          style={{
                            margin: "0 0 4px 0",
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#aaa",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Recently processed
                        </p>
                        {callLog.map((entry, i) => (
                          <p
                            key={i}
                            style={{
                              margin: "2px 0",
                              fontSize: "13px",
                              color: "#555",
                            }}
                          >
                            ✅ <strong>{entry.name}</strong> — {entry.count}{" "}
                            price{entry.count !== 1 ? "s" : ""} saved
                          </p>
                        ))}
                      </div>
                    )}
                    {!callQueueLoading &&
                      callIndex < activeQueue.length &&
                      (() => {
                        const vet = activeQueue[callIndex];
                        return (
                          <div>
                            {/* Header: title + toggle + nav buttons */}
                            <div
                              className="call-sheet-header"
                              style={{ marginBottom: "16px" }}
                            >
                              <div>
                                <h2
                                  style={{
                                    margin: "0 0 4px 0",
                                    fontSize: "1.1rem",
                                    color: "#111",
                                  }}
                                >
                                  Call Sheet
                                </h2>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: "13px",
                                    color: "#888",
                                  }}
                                >
                                  {callIndex + 1} of {activeQueue.length}{" "}
                                  {showAllVets ? "total" : "unpriced"} vets
                                </p>
                              </div>
                              {/* Smooth sliding toggle — fixed width prevents layout jump */}
                              <div
                                style={{
                                  display: "inline-flex",
                                  borderRadius: "6px",
                                  border: "1px solid #2d6a4f",
                                  overflow: "hidden",
                                  flexShrink: 0,
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowAllVets(false);
                                    setCallIndex(0);
                                    setCallPrices([]);
                                    setCallReviewPrices([]);
                                    setCallReviewVetId(null);
                                    setCallSaved(false);
                                  }}
                                  style={{
                                    padding: "6px 14px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    border: "none",
                                    background: !showAllVets
                                      ? "#2d6a4f"
                                      : "#fff",
                                    color: !showAllVets ? "#fff" : "#2d6a4f",
                                  }}
                                >
                                  Unpriced
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowAllVets(true);
                                    setCallIndex(0);
                                    setCallPrices([]);
                                    setCallReviewPrices([]);
                                    setCallReviewVetId(null);
                                    setCallSaved(false);
                                  }}
                                  style={{
                                    padding: "6px 14px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    border: "none",
                                    borderLeft: "1px solid #2d6a4f",
                                    background: showAllVets
                                      ? "#2d6a4f"
                                      : "#fff",
                                    color: showAllVets ? "#fff" : "#2d6a4f",
                                  }}
                                >
                                  All Vets
                                </button>
                              </div>
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                  className="adm-btn adm-btn-gray"
                                  onClick={() => {
                                    fetchCallQueue();
                                    setCallIndex(0);
                                    setCallPrices([]);
                                    setCallReviewPrices([]);
                                    setCallReviewVetId(null);
                                    setCallSaved(false);
                                    setCallReviewEditing(null);
                                  }}
                                >
                                  ↺ Refresh
                                </button>
                                <button
                                  className="adm-btn adm-btn-gray"
                                  onClick={() =>
                                    setCallIndex((i) => Math.max(0, i - 1))
                                  }
                                  disabled={callIndex === 0}
                                >
                                  ← Prev
                                </button>
                                <button
                                  className="adm-btn adm-btn-gray"
                                  onClick={() => {
                                    setCallIndex((i) => i + 1);
                                    setCallPrices([]);
                                  }}
                                >
                                  Skip →
                                </button>
                              </div>
                            </div>
                            {/* Call sheet vet search */}
                            <div
                              style={{
                                marginBottom: "14px",
                                position: "relative",
                                maxWidth: "400px",
                              }}
                            >
                              <input
                                className="adm-input"
                                value={callSheetSearch}
                                onChange={(e) =>
                                  setCallSheetSearch(e.target.value)
                                }
                                placeholder="Search vet by name to jump to them..."
                              />
                              {callSheetSearch.trim() && (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "calc(100% + 4px)",
                                    left: 0,
                                    right: 0,
                                    background: "#fff",
                                    border: "1px solid #e8e8e8",
                                    borderRadius: "8px",
                                    maxHeight: "200px",
                                    overflowY: "auto",
                                    zIndex: 100,
                                    boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
                                  }}
                                >
                                  {activeQueue
                                    .filter((v) =>
                                      v.name
                                        .toLowerCase()
                                        .includes(
                                          callSheetSearch.toLowerCase(),
                                        ),
                                    )
                                    .slice(0, 8)
                                    .map((v, idx) => {
                                      const realIdx = activeQueue.findIndex(
                                        (q) =>
                                          q.id === v.id &&
                                          q._source === v._source,
                                      );
                                      return (
                                        <div
                                          key={v.id + v._source}
                                          style={{
                                            padding: "9px 12px",
                                            cursor: "pointer",
                                            fontSize: "13px",
                                            borderBottom: "1px solid #f5f5f5",
                                          }}
                                          onMouseDown={() => {
                                            setCallIndex(realIdx);
                                            setCallPrices([]);
                                            setCallSheetSearch("");
                                          }}
                                        >
                                          {v.name}
                                          <span
                                            style={{
                                              fontSize: "11px",
                                              color: "#aaa",
                                              marginLeft: "8px",
                                            }}
                                          >
                                            #{realIdx + 1}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  {activeQueue.filter((v) =>
                                    v.name
                                      .toLowerCase()
                                      .includes(callSheetSearch.toLowerCase()),
                                  ).length === 0 && (
                                    <div
                                      style={{
                                        padding: "9px 12px",
                                        fontSize: "13px",
                                        color: "#aaa",
                                      }}
                                    >
                                      No vets found
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div
                              style={{
                                height: "4px",
                                background: "#f0f0f0",
                                borderRadius: "4px",
                                marginBottom: "24px",
                              }}
                            >
                              <div
                                style={{
                                  height: "4px",
                                  background: "#2d6a4f",
                                  borderRadius: "4px",
                                  width: `${((callIndex + 1) / activeQueue.length) * 100}%`,
                                  transition: "width 0.3s",
                                }}
                              />
                            </div>
                            {/* Vet card */}
                            <div
                              style={{
                                background: "#fff",
                                border: "1px solid #e8e8e8",
                                borderRadius: "12px",
                                padding: "20px",
                                marginBottom: "16px",
                              }}
                            >
                              {/* Badges: source + priced status */}
                              <div
                                style={{
                                  display: "flex",
                                  gap: "6px",
                                  marginBottom: "6px",
                                  flexWrap: "wrap",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "11px",
                                    background:
                                      vet._source === "pending"
                                        ? "#fff8e1"
                                        : "#e8f5e9",
                                    color:
                                      vet._source === "pending"
                                        ? "#e65100"
                                        : "#2d6a4f",
                                    padding: "2px 8px",
                                    borderRadius: "20px",
                                    fontWeight: "600",
                                  }}
                                >
                                  {vet._source === "pending" ? "New" : "Active"}
                                </span>
                                {vet._hasPrices && (
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      background: "#e8f5e9",
                                      color: "#2d6a4f",
                                      padding: "2px 8px",
                                      borderRadius: "20px",
                                      fontWeight: "600",
                                      border: "1px solid #c8e6c9",
                                    }}
                                  >
                                    ✓ Priced
                                  </span>
                                )}
                                {vet._declined && (
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      background: "#fce4ec",
                                      color: "#c62828",
                                      padding: "2px 8px",
                                      borderRadius: "20px",
                                      fontWeight: "600",
                                      border: "1px solid #ef9a9a",
                                    }}
                                  >
                                    🚫 Declined
                                  </span>
                                )}
                              </div>
                              <h3
                                style={{
                                  margin: "0 0 4px 0",
                                  fontSize: "1.1rem",
                                  color: "#111",
                                  fontWeight: "700",
                                }}
                              >
                                {vet.name}
                              </h3>

                              {/* Address: street on line 1, city/state/zip on line 2 */}
                              {vet.address && (
                                <p
                                  style={{
                                    margin: "0 0 2px 0",
                                    fontSize: "14px",
                                    color: "#555",
                                  }}
                                >
                                  {vet.address}
                                </p>
                              )}
                              {(vet.city && vet.city.length > 2) ||
                              (vet.neighborhood &&
                                vet.neighborhood.length > 2) ? (
                                <p
                                  style={{
                                    margin: "0 0 8px 0",
                                    fontSize: "14px",
                                    color: "#555",
                                  }}
                                >
                                  {[
                                    (vet.city && vet.city.length > 2
                                      ? vet.city
                                      : null) ||
                                      (vet.neighborhood &&
                                      vet.neighborhood.length > 2
                                        ? vet.neighborhood
                                        : null),
                                    vet.state,
                                    vet.zip_code,
                                  ]
                                    .filter(Boolean)
                                    .join(", ")}
                                </p>
                              ) : (
                                <div style={{ margin: "0 0 8px 0" }}>
                                  {(vet.state || vet.zip_code) && (
                                    <p
                                      style={{
                                        margin: "0 0 4px 0",
                                        fontSize: "14px",
                                        color: "#555",
                                      }}
                                    >
                                      {[vet.state, vet.zip_code]
                                        .filter(Boolean)
                                        .join(", ")}
                                    </p>
                                  )}
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px",
                                    }}
                                  >
                                    <input
                                      className="adm-input"
                                      style={{
                                        maxWidth: "180px",
                                        fontSize: "13px",
                                        padding: "4px 8px",
                                      }}
                                      placeholder="Enter city..."
                                      defaultValue=""
                                      onBlur={async (e) => {
                                        const city = e.target.value.trim();
                                        if (!city) return;
                                        const table =
                                          vet._source === "pending"
                                            ? "pending_vets"
                                            : "vets";
                                        await supabase
                                          .from(table)
                                          .update({ city })
                                          .eq("id", vet.id);
                                        setCallQueue((prev) =>
                                          prev.map((v, idx) =>
                                            idx === callIndex
                                              ? { ...v, city }
                                              : v,
                                          ),
                                        );
                                      }}
                                    />
                                    <span
                                      style={{
                                        fontSize: "11px",
                                        color: "#e65100",
                                        fontWeight: "600",
                                      }}
                                    >
                                      ⚠️ City missing
                                    </span>
                                  </div>
                                </div>
                              )}
                              {vet.website &&
                                (() => {
                                  try {
                                    const host = new URL(
                                      vet.website,
                                    ).hostname.replace(/^www\./, "");
                                    return (
                                      <a
                                        href={vet.website}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                          fontSize: "13px",
                                          color: "#2d6a4f",
                                          display: "block",
                                          marginBottom: "8px",
                                        }}
                                      >
                                        {host}
                                      </a>
                                    );
                                  } catch {
                                    return (
                                      <a
                                        href={vet.website}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                          fontSize: "13px",
                                          color: "#2d6a4f",
                                          display: "block",
                                          marginBottom: "8px",
                                        }}
                                      >
                                        {vet.website}
                                      </a>
                                    );
                                  }
                                })()}

                              {/* Phone button — no icon */}
                              {vet.phone && (
                                <a
                                  href={`tel:${vet.phone}`}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    background: "#2d6a4f",
                                    color: "#fff",
                                    padding: "5px 10px",
                                    borderRadius: "6px",
                                    textDecoration: "none",
                                    fontWeight: "600",
                                    fontSize: "13px",
                                    marginBottom: "12px",
                                  }}
                                >
                                  {vet.phone}
                                </a>
                              )}

                              {/* No prices? — row on desktop, stacked on mobile */}
                              <div
                                style={{
                                  borderTop: "1px solid #f0f0f0",
                                  paddingTop: "14px",
                                  marginBottom: "16px",
                                }}
                              >
                                <p
                                  style={{
                                    margin: "0 0 8px 0",
                                    fontSize: "12px",
                                    color: "#888",
                                    fontWeight: "600",
                                  }}
                                >
                                  No prices?
                                </p>
                                <div className="call-no-prices-btns">
                                  <button
                                    className="adm-btn adm-btn-gray"
                                    onClick={() =>
                                      markCallStatus(vet, "declined")
                                    }
                                  >
                                    🚫 Declined to share
                                  </button>
                                  <button
                                    className="adm-btn adm-btn-gray"
                                    onClick={() => {
                                      setNotesVetId(
                                        vet._source === "pending"
                                          ? vet.id
                                          : vet.id,
                                      );
                                      setNotesVetName(vet.name);
                                      fetchCallNotes(vet.id);
                                      setShowCallbackNotes(true);
                                    }}
                                  >
                                    🕐 Call back later
                                  </button>
                                </div>
                                {/* Call back later notes panel */}
                                {showCallbackNotes && notesVetId === vet.id && (
                                  <div
                                    style={{
                                      marginTop: "14px",
                                      background: "#f9f9f9",
                                      border: "1px solid #e8e8e8",
                                      borderRadius: "10px",
                                      padding: "16px",
                                    }}
                                  >
                                    {/* Header — title + X inline */}
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        gap: "12px",
                                        marginBottom: "14px",
                                      }}
                                    >
                                      <p
                                        style={{
                                          margin: 0,
                                          fontSize: "14px",
                                          fontWeight: "700",
                                          color: "#111",
                                        }}
                                      >
                                        Notes for {vet.name}
                                      </p>
                                      <button
                                        onClick={() =>
                                          setShowCallbackNotes(false)
                                        }
                                        style={{
                                          background: "none",
                                          border: "none",
                                          cursor: "pointer",
                                          fontSize: "18px",
                                          color: "#aaa",
                                          lineHeight: 1,
                                          padding: "0 2px",
                                          flexShrink: 0,
                                        }}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                    {/* Add new note */}
                                    <div style={{ marginBottom: "16px" }}>
                                      <textarea
                                        className="adm-input"
                                        rows={3}
                                        style={{
                                          width: "100%",
                                          resize: "vertical",
                                          height: "auto",
                                          marginBottom: "8px",
                                        }}
                                        value={callbackNoteText}
                                        onChange={(e) =>
                                          setCallbackNoteText(e.target.value)
                                        }
                                        placeholder="Add a note about this vet..."
                                      />
                                      <div
                                        style={{
                                          display: "flex",
                                          justifyContent: "flex-end",
                                        }}
                                      >
                                        <button
                                          className="adm-btn adm-btn-green"
                                          onClick={() =>
                                            saveCallNote(
                                              vet.id,
                                              vet.name,
                                              callbackNoteText,
                                            )
                                          }
                                        >
                                          Save Note
                                        </button>
                                      </div>
                                    </div>
                                    {/* Notes list — latest first */}
                                    {callNotes.length === 0 && (
                                      <p
                                        style={{
                                          fontSize: "13px",
                                          color: "#aaa",
                                          fontStyle: "italic",
                                          margin: 0,
                                        }}
                                      >
                                        No notes yet.
                                      </p>
                                    )}
                                    {callNotes.map((n) => (
                                      <div
                                        key={n.id}
                                        style={{
                                          borderTop: "1px solid #ebebeb",
                                          paddingTop: "12px",
                                          marginTop: "12px",
                                        }}
                                      >
                                        {editingNoteId === n.id ? (
                                          <div>
                                            <textarea
                                              className="adm-input"
                                              rows={3}
                                              style={{
                                                width: "100%",
                                                resize: "vertical",
                                                height: "auto",
                                                marginBottom: "8px",
                                              }}
                                              value={editingNoteText}
                                              onChange={(e) =>
                                                setEditingNoteText(
                                                  e.target.value,
                                                )
                                              }
                                            />
                                            <div
                                              style={{
                                                display: "flex",
                                                justifyContent: "flex-end",
                                                gap: "8px",
                                              }}
                                            >
                                              <button
                                                className="adm-btn adm-btn-gray"
                                                onClick={() => {
                                                  setEditingNoteId(null);
                                                  setEditingNoteText("");
                                                }}
                                              >
                                                Cancel
                                              </button>
                                              <button
                                                className="adm-btn adm-btn-green"
                                                onClick={() =>
                                                  updateCallNote(
                                                    n.id,
                                                    editingNoteText,
                                                  )
                                                }
                                              >
                                                Save Changes
                                              </button>
                                            </div>
                                          </div>
                                        ) : deletingNoteId === n.id ? (
                                          <div
                                            style={{
                                              background: "#fff0f0",
                                              border: "1px solid #ffcdd2",
                                              borderRadius: "6px",
                                              padding: "12px",
                                            }}
                                          >
                                            <p
                                              style={{
                                                margin: "0 0 10px 0",
                                                fontSize: "13px",
                                                color: "#c62828",
                                                fontWeight: "600",
                                              }}
                                            >
                                              Delete this note?
                                            </p>
                                            <div
                                              style={{
                                                display: "flex",
                                                justifyContent: "flex-end",
                                                gap: "8px",
                                              }}
                                            >
                                              <button
                                                className="adm-btn adm-btn-gray"
                                                onClick={() =>
                                                  setDeletingNoteId(null)
                                                }
                                              >
                                                Cancel
                                              </button>
                                              <button
                                                className="adm-btn adm-btn-red"
                                                onClick={() =>
                                                  deleteCallNote(n.id)
                                                }
                                              >
                                                Yes, Delete
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div>
                                            <p
                                              style={{
                                                margin: "0 0 6px 0",
                                                fontSize: "11px",
                                                color: "#aaa",
                                              }}
                                            >
                                              {formatLogDate(n.created_at)}
                                              {n.updated_at !== n.created_at
                                                ? " · edited"
                                                : ""}
                                            </p>
                                            <p
                                              style={{
                                                margin: "0 0 10px 0",
                                                fontSize: "13px",
                                                color: "#333",
                                                lineHeight: "1.5",
                                              }}
                                            >
                                              {n.note}
                                            </p>
                                            <div
                                              style={{
                                                display: "flex",
                                                justifyContent: "flex-end",
                                                gap: "8px",
                                              }}
                                            >
                                              <button
                                                className="adm-btn adm-btn-outline"
                                                onClick={() => {
                                                  setEditingNoteId(n.id);
                                                  setEditingNoteText(n.note);
                                                }}
                                              >
                                                Edit
                                              </button>
                                              <button
                                                className="adm-btn adm-btn-red"
                                                onClick={() =>
                                                  setDeletingNoteId(n.id)
                                                }
                                              >
                                                Delete
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Price entry */}
                              <div>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "10px",
                                  }}
                                >
                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize: "13px",
                                      fontWeight: "600",
                                      color: "#111",
                                    }}
                                  >
                                    Enter prices from call
                                  </p>
                                  <button
                                    className="adm-btn adm-btn-outline"
                                    onClick={addCallPriceRow}
                                  >
                                    + Add Price
                                  </button>
                                </div>
                                {callPrices.length === 0 && (
                                  <p
                                    style={{
                                      color: "#bbb",
                                      fontSize: "13px",
                                      fontStyle: "italic",
                                      margin: "0 0 12px 0",
                                    }}
                                  >
                                    No prices added yet — click "+ Add Price"
                                    for each service they quote you.
                                  </p>
                                )}
                                {callPrices.map((p, i) => (
                                  <div
                                    key={i}
                                    className="row-edit-bg"
                                    style={{ marginBottom: "20px" }}
                                  >
                                    {/* Row 1: Service + Price Type + Low + High */}
                                    <div
                                      className="form-grid-4"
                                      style={{ marginBottom: "14px" }}
                                    >
                                      <div>
                                        <label className="field-label">
                                          Service
                                        </label>
                                        <select
                                          className="adm-input"
                                          style={
                                            callSpeciesError && !p.service_id
                                              ? {
                                                  borderColor: "#c62828",
                                                  borderWidth: "2px",
                                                }
                                              : {}
                                          }
                                          value={p.service_id}
                                          onChange={(e) => {
                                            setCallSpeciesError(false);
                                            updateCallPrice(
                                              i,
                                              "service_id",
                                              e.target.value,
                                            );
                                          }}
                                        >
                                          <option value="">— Select —</option>
                                          {services.map((s) => (
                                            <option key={s.id} value={s.id}>
                                              {s.name}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="field-label">
                                          Price Type
                                        </label>
                                        <select
                                          className="adm-input"
                                          value={p.price_type}
                                          onChange={(e) =>
                                            updateCallPrice(
                                              i,
                                              "price_type",
                                              e.target.value,
                                            )
                                          }
                                        >
                                          {PRICE_TYPES.map((t) => (
                                            <option key={t}>{t}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="field-label">
                                          Price Low
                                        </label>
                                        <input
                                          className="adm-input"
                                          style={
                                            callSpeciesError &&
                                            !p.price_low &&
                                            !p.call_for_quote
                                              ? {
                                                  borderColor: "#c62828",
                                                  borderWidth: "2px",
                                                }
                                              : {}
                                          }
                                          type="number"
                                          value={p.price_low}
                                          onChange={(e) => {
                                            setCallSpeciesError(false);
                                            updateCallPrice(
                                              i,
                                              "price_low",
                                              e.target.value,
                                            );
                                          }}
                                          placeholder="e.g. 65"
                                        />
                                      </div>
                                      <div>
                                        <label className="field-label">
                                          Price High
                                        </label>
                                        <input
                                          className="adm-input"
                                          type="number"
                                          value={p.price_high}
                                          onChange={(e) =>
                                            updateCallPrice(
                                              i,
                                              "price_high",
                                              e.target.value,
                                            )
                                          }
                                          placeholder="range only"
                                        />
                                      </div>
                                    </div>
                                    {/* Row 1b: Species + Includes side by side */}
                                    <div
                                      className="form-grid-2"
                                      style={{ marginBottom: "14px" }}
                                    >
                                      <div>
                                        <label
                                          className="field-label"
                                          style={{
                                            display: "block",
                                            marginBottom: "8px",
                                          }}
                                        >
                                          Species *
                                        </label>
                                        <select
                                          className="adm-input"
                                          style={
                                            callSpeciesError && !p.species
                                              ? {
                                                  borderColor: "#c62828",
                                                  borderWidth: "2px",
                                                }
                                              : {}
                                          }
                                          value={
                                            p.species === "other" ||
                                            (p.species &&
                                              ![
                                                "dog",
                                                "cat",
                                                "rabbit",
                                                "bird",
                                                "other",
                                                "",
                                              ].includes(p.species))
                                              ? "other"
                                              : p.species || ""
                                          }
                                          onChange={(e) => {
                                            setCallSpeciesError(false);
                                            setCallPrices((prev) =>
                                              prev.map((row, idx) =>
                                                idx === i
                                                  ? {
                                                      ...row,
                                                      species: e.target.value,
                                                      speciesOther:
                                                        e.target.value !==
                                                        "other"
                                                          ? ""
                                                          : row.speciesOther,
                                                    }
                                                  : row,
                                              ),
                                            );
                                          }}
                                        >
                                          <option value="">— Select —</option>
                                          <option value="dog">Dog</option>
                                          <option value="cat">Cat</option>
                                          <option value="rabbit">Rabbit</option>
                                          <option value="bird">Bird</option>
                                          <option value="other">
                                            Other...
                                          </option>
                                        </select>
                                        {(p.species === "other" ||
                                          (p.species &&
                                            ![
                                              "dog",
                                              "cat",
                                              "rabbit",
                                              "bird",
                                              "other",
                                              "",
                                            ].includes(p.species))) && (
                                          <input
                                            className="adm-input"
                                            style={{ marginTop: "8px" }}
                                            value={
                                              p.speciesOther ||
                                              (p.species &&
                                              ![
                                                "dog",
                                                "cat",
                                                "rabbit",
                                                "bird",
                                                "other",
                                                "",
                                              ].includes(p.species)
                                                ? p.species
                                                : "")
                                            }
                                            onChange={(e) =>
                                              setCallPrices((prev) =>
                                                prev.map((row, idx) =>
                                                  idx === i
                                                    ? {
                                                        ...row,
                                                        species: "other",
                                                        speciesOther:
                                                          e.target.value,
                                                      }
                                                    : row,
                                                ),
                                              )
                                            }
                                            placeholder="e.g. Guinea pig, bird..."
                                          />
                                        )}
                                      </div>
                                      <div>
                                        <label
                                          className="field-label"
                                          style={{
                                            display: "block",
                                            marginBottom: "8px",
                                          }}
                                        >
                                          Includes
                                        </label>
                                        <div
                                          style={{
                                            display: "flex",
                                            gap: "6px",
                                            flexWrap: "nowrap",
                                          }}
                                        >
                                          {[
                                            ["includes_bloodwork", "Bloodwork"],
                                            ["includes_xrays", "X-rays"],
                                            [
                                              "includes_anesthesia",
                                              "Anesthesia",
                                            ],
                                          ].map(([field, label]) => (
                                            <button
                                              key={field}
                                              type="button"
                                              onClick={() =>
                                                setCallPrices((prev) =>
                                                  prev.map((row, idx) =>
                                                    idx === i
                                                      ? {
                                                          ...row,
                                                          [field]: !row[field],
                                                        }
                                                      : row,
                                                  ),
                                                )
                                              }
                                              style={{
                                                padding: "3px 8px",
                                                borderRadius: "20px",
                                                fontSize: "11px",
                                                fontWeight: "600",
                                                cursor: "pointer",
                                                border: p[field]
                                                  ? "none"
                                                  : "1px solid #ddd",
                                                background: p[field]
                                                  ? "#2d6a4f"
                                                  : "#f5f5f5",
                                                color: p[field]
                                                  ? "#fff"
                                                  : "#555",
                                                whiteSpace: "nowrap",
                                              }}
                                            >
                                              {label}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    {/* Row 3: Notes full width — larger textarea */}
                                    <div
                                      style={{
                                        marginBottom: "14px",
                                        marginTop: "6px",
                                      }}
                                    >
                                      <label
                                        className="field-label"
                                        style={{
                                          display: "block",
                                          marginBottom: "8px",
                                        }}
                                      >
                                        Notes
                                      </label>
                                      <textarea
                                        className="adm-input"
                                        rows={3}
                                        style={{
                                          width: "100%",
                                          resize: "vertical",
                                          height: "auto",
                                        }}
                                        value={p.notes}
                                        onChange={(e) =>
                                          updateCallPrice(
                                            i,
                                            "notes",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Notes about this price..."
                                      />
                                    </div>
                                    {/* Row 4: Clear + Remove buttons — right aligned */}
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        gap: "8px",
                                        alignItems: "center",
                                      }}
                                    >
                                      <button
                                        className="adm-btn adm-btn-gray"
                                        onClick={() => {
                                          const u = [...callPrices];
                                          u[i] = {
                                            ...u[i],
                                            service_id: "",
                                            price_low: "",
                                            price_high: "",
                                            price_type: "exact",
                                            includes_bloodwork: false,
                                            includes_xrays: false,
                                            includes_anesthesia: false,
                                            species: "",
                                            notes: "",
                                          };
                                          setCallPrices(u);
                                        }}
                                      >
                                        Clear
                                      </button>
                                      <button
                                        className="adm-btn adm-btn-red"
                                        onClick={() => removeCallPrice(i)}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ))}

                                {/* Save button */}
                                {callPrices.length > 0 && (
                                  <div style={{ marginTop: "8px" }}>
                                    {callSpeciesError && (
                                      <div
                                        style={{
                                          background: "#fff0f0",
                                          border: "1px solid #ffcdd2",
                                          borderRadius: "8px",
                                          padding: "10px 14px",
                                          marginBottom: "10px",
                                        }}
                                      >
                                        <p
                                          style={{
                                            margin: 0,
                                            fontSize: "13px",
                                            color: "#c62828",
                                            fontWeight: "600",
                                          }}
                                        >
                                          ⚠️ Complete all required fields before
                                          saving:
                                        </p>
                                        <ul
                                          style={{
                                            margin: "6px 0 0 0",
                                            paddingLeft: "18px",
                                            fontSize: "13px",
                                            color: "#c62828",
                                          }}
                                        >
                                          {callPrices.map((p, idx) => {
                                            const missing = [];
                                            if (!p.service_id)
                                              missing.push("Service");
                                            if (!p.species)
                                              missing.push("Species");
                                            if (
                                              !p.price_low &&
                                              !p.call_for_quote
                                            )
                                              missing.push("Price");
                                            return missing.length > 0 ? (
                                              <li key={idx}>
                                                Row {idx + 1}:{" "}
                                                {missing.join(", ")}
                                              </li>
                                            ) : null;
                                          })}
                                        </ul>
                                      </div>
                                    )}
                                    <button
                                      className="adm-btn adm-btn-green"
                                      style={{
                                        padding: "10px 24px",
                                        fontSize: "14px",
                                        width: "100%",
                                      }}
                                      onClick={() => {
                                        setCallSpeciesError(false);
                                        saveCallPrices(vet);
                                      }}
                                      disabled={callSaving}
                                    >
                                      {callSaving
                                        ? "Saving..."
                                        : "✅ Save Prices"}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* ── Review Panel — always visible once prices saved ── */}
                            {callReviewPrices.length > 0 && (
                              <div
                                style={{
                                  background: "#fff",
                                  border: "2px solid #2d6a4f",
                                  borderRadius: "12px",
                                  padding: "20px",
                                  marginTop: "16px",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginBottom: "16px",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "10px",
                                    }}
                                  >
                                    <span style={{ fontSize: "20px" }}>✅</span>
                                    <div>
                                      <p
                                        style={{
                                          margin: 0,
                                          fontSize: "15px",
                                          fontWeight: "700",
                                          color: "#2d6a4f",
                                        }}
                                      >
                                        Saved prices for {vet.name}
                                      </p>
                                      <p
                                        style={{
                                          margin: 0,
                                          fontSize: "13px",
                                          color: "#888",
                                        }}
                                      >
                                        {callReviewPrices.length} price
                                        {callReviewPrices.length !== 1
                                          ? "s"
                                          : ""}{" "}
                                        — edit or remove before moving on
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {callReviewPrices.map((row, i) => {
                                  const svc = services.find(
                                    (s) =>
                                      s.id === row.service_id ||
                                      s.id === parseInt(row.service_id),
                                  );
                                  const isEditing = callReviewEditing === i;
                                  return (
                                    <div
                                      key={row.id || i}
                                      style={{
                                        borderTop: "1px solid #f0f0f0",
                                        paddingTop: "12px",
                                        marginTop: "12px",
                                      }}
                                    >
                                      {!isEditing ? (
                                        /* ── Summary row — matches Prices tab display ── */
                                        <div>
                                          <p
                                            style={{
                                              margin: "0 0 6px 0",
                                              fontSize: "14px",
                                              fontWeight: "600",
                                              color: "#111",
                                            }}
                                          >
                                            {svc?.name || "Unknown service"}
                                          </p>
                                          <p
                                            style={{
                                              margin: "0 0 8px 0",
                                              fontSize: "14px",
                                              color: "#2d6a4f",
                                              fontWeight: "600",
                                            }}
                                          >
                                            {row.call_for_quote
                                              ? "Call for quote"
                                              : [
                                                  row.price_low &&
                                                    `$${parseFloat(row.price_low).toFixed(0)}`,
                                                  row.price_high &&
                                                    `– $${parseFloat(row.price_high).toFixed(0)}`,
                                                ]
                                                  .filter(Boolean)
                                                  .join(" ")}
                                            {row.price_type &&
                                              row.price_type !== "exact" && (
                                                <span
                                                  style={{
                                                    fontSize: "12px",
                                                    color: "#888",
                                                    marginLeft: "6px",
                                                  }}
                                                >
                                                  ({row.price_type})
                                                </span>
                                              )}
                                          </p>
                                          {row.species && (
                                            <div
                                              style={{ marginBottom: "8px" }}
                                            >
                                              <span
                                                style={{
                                                  fontSize: "12px",
                                                  background: "#f0f0f0",
                                                  color: "#555",
                                                  padding: "2px 8px",
                                                  borderRadius: "4px",
                                                  textTransform: "capitalize",
                                                }}
                                              >
                                                {row.species}
                                              </span>
                                            </div>
                                          )}
                                          {(row.includes_bloodwork === true ||
                                            row.includes_xrays === true ||
                                            row.includes_anesthesia ===
                                              true) && (
                                            <div
                                              style={{
                                                display: "flex",
                                                gap: "6px",
                                                flexWrap: "wrap",
                                                marginBottom: "8px",
                                              }}
                                            >
                                              {row.includes_bloodwork ===
                                                true && (
                                                <span
                                                  style={{
                                                    fontSize: "12px",
                                                    background: "#e8f5e9",
                                                    color: "#2d6a4f",
                                                    padding: "2px 8px",
                                                    borderRadius: "4px",
                                                    whiteSpace: "nowrap",
                                                  }}
                                                >
                                                  + bloodwork
                                                </span>
                                              )}
                                              {row.includes_xrays === true && (
                                                <span
                                                  style={{
                                                    fontSize: "12px",
                                                    background: "#e8f5e9",
                                                    color: "#2d6a4f",
                                                    padding: "2px 8px",
                                                    borderRadius: "4px",
                                                    whiteSpace: "nowrap",
                                                  }}
                                                >
                                                  + x-rays
                                                </span>
                                              )}
                                              {row.includes_anesthesia ===
                                                true && (
                                                <span
                                                  style={{
                                                    fontSize: "12px",
                                                    background: "#e8f5e9",
                                                    color: "#2d6a4f",
                                                    padding: "2px 8px",
                                                    borderRadius: "4px",
                                                    whiteSpace: "nowrap",
                                                  }}
                                                >
                                                  + anesthesia
                                                </span>
                                              )}
                                            </div>
                                          )}
                                          {row.notes && (
                                            <p
                                              style={{
                                                margin: "0 0 10px 0",
                                                fontSize: "13px",
                                                color: "#888",
                                                fontStyle: "italic",
                                              }}
                                            >
                                              {row.notes}
                                            </p>
                                          )}
                                          <div
                                            style={{
                                              display: "flex",
                                              gap: "6px",
                                              marginTop: "12px",
                                              paddingTop: "10px",
                                              borderTop: "1px solid #f0f0f0",
                                            }}
                                          >
                                            <button
                                              className="adm-btn adm-btn-outline"
                                              onClick={() =>
                                                setCallReviewEditing(i)
                                              }
                                            >
                                              Edit
                                            </button>
                                            <button
                                              className="adm-btn adm-btn-red"
                                              onClick={() =>
                                                deleteReviewPrice(i)
                                              }
                                            >
                                              Remove
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        /* ── Inline edit form ── */
                                        <div
                                          style={{
                                            background: "#f9f9f9",
                                            borderRadius: "8px",
                                            padding: "16px",
                                          }}
                                        >
                                          <div
                                            className="form-grid-4"
                                            style={{ marginBottom: "14px" }}
                                          >
                                            <div>
                                              <label className="field-label">
                                                Service
                                              </label>
                                              <select
                                                className="adm-input"
                                                value={row.service_id}
                                                onChange={(e) => {
                                                  const u = [
                                                    ...callReviewPrices,
                                                  ];
                                                  u[i] = {
                                                    ...u[i],
                                                    service_id: e.target.value,
                                                  };
                                                  setCallReviewPrices(u);
                                                }}
                                              >
                                                <option value="">
                                                  — Select —
                                                </option>
                                                {services.map((s) => (
                                                  <option
                                                    key={s.id}
                                                    value={s.id}
                                                  >
                                                    {s.name}
                                                  </option>
                                                ))}
                                              </select>
                                            </div>
                                            <div>
                                              <label className="field-label">
                                                Price Type
                                              </label>
                                              <select
                                                className="adm-input"
                                                value={
                                                  row.price_type || "exact"
                                                }
                                                onChange={(e) => {
                                                  const u = [
                                                    ...callReviewPrices,
                                                  ];
                                                  u[i] = {
                                                    ...u[i],
                                                    price_type: e.target.value,
                                                  };
                                                  setCallReviewPrices(u);
                                                }}
                                              >
                                                {[
                                                  "exact",
                                                  "range",
                                                  "starting",
                                                  "up to",
                                                ].map((t) => (
                                                  <option key={t}>{t}</option>
                                                ))}
                                              </select>
                                            </div>
                                            <div>
                                              <label className="field-label">
                                                Price Low
                                              </label>
                                              <input
                                                className="adm-input"
                                                type="number"
                                                value={row.price_low || ""}
                                                onChange={(e) => {
                                                  const u = [
                                                    ...callReviewPrices,
                                                  ];
                                                  u[i] = {
                                                    ...u[i],
                                                    price_low: e.target.value,
                                                  };
                                                  setCallReviewPrices(u);
                                                }}
                                                placeholder="e.g. 65"
                                              />
                                            </div>
                                            <div>
                                              <label className="field-label">
                                                Price High
                                              </label>
                                              <input
                                                className="adm-input"
                                                type="number"
                                                value={row.price_high || ""}
                                                onChange={(e) => {
                                                  const u = [
                                                    ...callReviewPrices,
                                                  ];
                                                  u[i] = {
                                                    ...u[i],
                                                    price_high: e.target.value,
                                                  };
                                                  setCallReviewPrices(u);
                                                }}
                                                placeholder="range only"
                                              />
                                            </div>
                                          </div>
                                          <div
                                            className="form-grid-2"
                                            style={{ marginBottom: "14px" }}
                                          >
                                            <div>
                                              <label className="field-label">
                                                Species *
                                              </label>
                                              <select
                                                className="adm-input"
                                                value={
                                                  row.species === "other" ||
                                                  (row.species &&
                                                    ![
                                                      "dog",
                                                      "cat",
                                                      "rabbit",
                                                      "bird",
                                                      "other",
                                                      "",
                                                    ].includes(row.species))
                                                    ? "other"
                                                    : row.species || ""
                                                }
                                                onChange={(e) => {
                                                  const u = [
                                                    ...callReviewPrices,
                                                  ];
                                                  u[i] = {
                                                    ...u[i],
                                                    species: e.target.value,
                                                    speciesOther: "",
                                                  };
                                                  setCallReviewPrices(u);
                                                }}
                                              >
                                                <option value="">
                                                  — Select —
                                                </option>
                                                <option value="dog">Dog</option>
                                                <option value="cat">Cat</option>
                                                <option value="rabbit">
                                                  Rabbit
                                                </option>
                                                <option value="bird">
                                                  Bird
                                                </option>
                                                <option value="other">
                                                  Other...
                                                </option>
                                              </select>
                                              {(row.species === "other" ||
                                                (row.species &&
                                                  ![
                                                    "dog",
                                                    "cat",
                                                    "rabbit",
                                                    "bird",
                                                    "other",
                                                    "",
                                                  ].includes(row.species))) && (
                                                <input
                                                  className="adm-input"
                                                  style={{ marginTop: "8px" }}
                                                  value={
                                                    row.speciesOther ||
                                                    (row.species &&
                                                    ![
                                                      "dog",
                                                      "cat",
                                                      "rabbit",
                                                      "bird",
                                                      "other",
                                                      "",
                                                    ].includes(row.species)
                                                      ? row.species
                                                      : "")
                                                  }
                                                  onChange={(e) => {
                                                    const u = [
                                                      ...callReviewPrices,
                                                    ];
                                                    u[i] = {
                                                      ...u[i],
                                                      species: "other",
                                                      speciesOther:
                                                        e.target.value,
                                                    };
                                                    setCallReviewPrices(u);
                                                  }}
                                                  placeholder="e.g. Guinea pig, snake..."
                                                />
                                              )}
                                            </div>
                                            <div>
                                              <label className="field-label">
                                                Includes
                                              </label>
                                              <div
                                                style={{
                                                  display: "flex",
                                                  gap: "6px",
                                                  flexWrap: "nowrap",
                                                  paddingTop: "2px",
                                                }}
                                              >
                                                {[
                                                  [
                                                    "includes_bloodwork",
                                                    "Bloodwork",
                                                  ],
                                                  ["includes_xrays", "X-rays"],
                                                  [
                                                    "includes_anesthesia",
                                                    "Anesthesia",
                                                  ],
                                                ].map(([field, label]) => (
                                                  <button
                                                    key={field}
                                                    type="button"
                                                    onClick={() => {
                                                      const u = [
                                                        ...callReviewPrices,
                                                      ];
                                                      u[i] = {
                                                        ...u[i],
                                                        [field]: !u[i][field],
                                                      };
                                                      setCallReviewPrices(u);
                                                    }}
                                                    style={{
                                                      padding: "3px 8px",
                                                      borderRadius: "20px",
                                                      fontSize: "11px",
                                                      fontWeight: "600",
                                                      cursor: "pointer",
                                                      border: row[field]
                                                        ? "none"
                                                        : "1px solid #ddd",
                                                      background: row[field]
                                                        ? "#2d6a4f"
                                                        : "#f5f5f5",
                                                      color: row[field]
                                                        ? "#fff"
                                                        : "#555",
                                                      whiteSpace: "nowrap",
                                                    }}
                                                  >
                                                    {label}
                                                  </button>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                          <div style={{ marginBottom: "14px" }}>
                                            <label className="field-label">
                                              Notes
                                            </label>
                                            <textarea
                                              className="adm-input"
                                              rows={3}
                                              style={{
                                                width: "100%",
                                                resize: "vertical",
                                                height: "auto",
                                              }}
                                              value={row.notes || ""}
                                              onChange={(e) => {
                                                const u = [...callReviewPrices];
                                                u[i] = {
                                                  ...u[i],
                                                  notes: e.target.value,
                                                };
                                                setCallReviewPrices(u);
                                              }}
                                              placeholder="Notes about this price..."
                                            />
                                          </div>
                                          <div
                                            style={{
                                              display: "flex",
                                              gap: "8px",
                                              justifyContent: "flex-end",
                                            }}
                                          >
                                            <button
                                              className="adm-btn adm-btn-gray"
                                              onClick={() =>
                                                setCallReviewEditing(null)
                                              }
                                            >
                                              Cancel
                                            </button>
                                            <button
                                              className="adm-btn adm-btn-green"
                                              onClick={() =>
                                                updateReviewPrice(i, row)
                                              }
                                            >
                                              Save Changes
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}

                                <div
                                  style={{
                                    marginTop: "20px",
                                    paddingTop: "16px",
                                    borderTop: "1px solid #f0f0f0",
                                  }}
                                >
                                  <p
                                    style={{
                                      margin: "0 0 8px 0",
                                      fontSize: "13px",
                                      color: "#888",
                                    }}
                                  >
                                    Add more prices above, or move on when
                                    ready.
                                  </p>
                                  <button
                                    className="adm-btn adm-btn-green"
                                    style={{
                                      width: "100%",
                                      padding: "12px",
                                      fontSize: "14px",
                                    }}
                                    onClick={advanceFromReview}
                                  >
                                    Next Vet →
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                  </div>
                );
              })()}

            {/* ── USERS ────────────────────────────────────────────── */}
            {tab === "Users" && (
              <div>
                <div className="section-header">
                  <h2 style={{ margin: 0, fontSize: "1rem", color: "#111" }}>
                    Users{" "}
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#888",
                        fontWeight: "400",
                      }}
                    >
                      ({users.length} total)
                    </span>
                  </h2>
                </div>
                <input
                  className="adm-input"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name or zip..."
                  style={{ marginBottom: "14px", maxWidth: "300px" }}
                />
                {usersLoading && (
                  <p style={{ color: "#888", fontSize: "14px" }}>Loading...</p>
                )}
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e8e8e8",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  <div className="users-table-header">
                    <span>Name</span>
                    <span>Zip</span>
                    <span>Profile</span>
                    <span>Joined</span>
                  </div>
                  {filteredUsers.length === 0 && (
                    <p
                      style={{
                        color: "#bbb",
                        fontSize: "14px",
                        padding: "20px",
                        textAlign: "center",
                      }}
                    >
                      No users found.
                    </p>
                  )}
                  {filteredUsers.map((u) => (
                    <div key={u.id} className="users-table-row">
                      <div className="users-col-name">
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#111",
                          }}
                        >
                          {u.full_name || (
                            <span
                              style={{ color: "#bbb", fontStyle: "italic" }}
                            >
                              No name
                            </span>
                          )}
                        </span>
                        {u.bio && (
                          <p
                            className="bio-desktop"
                            style={{
                              margin: "3px 0 0 0",
                              fontSize: "13px",
                              color: "#888",
                            }}
                          >
                            {u.bio}
                          </p>
                        )}
                      </div>
                      <div className="users-col">
                        <span className="users-label">Zip</span>
                        <span style={{ fontSize: "14px", color: "#666" }}>
                          {u.zip_code || "—"}
                        </span>
                      </div>
                      <div className="users-col">
                        <span className="users-label">Profile</span>
                        <span style={{ fontSize: "13px" }}>
                          {u.is_public ? (
                            <span style={{ color: "#2d6a4f" }}>✅ Public</span>
                          ) : (
                            <span style={{ color: "#bbb" }}>Private</span>
                          )}
                        </span>
                      </div>
                      <div className="users-col">
                        <span className="users-label">Joined</span>
                        <span style={{ fontSize: "13px", color: "#888" }}>
                          {formatDate(u.created_at)}
                        </span>
                      </div>
                      {/* Mobile labeled rows */}
                      <div className="users-mobile-detail">
                        {u.bio && (
                          <div style={{ marginBottom: "6px" }}>
                            <p
                              style={{
                                margin: "0 0 2px 0",
                                color: "#aaa",
                                fontWeight: "700",
                                fontSize: "11px",
                                textTransform: "uppercase",
                                letterSpacing: "0.4px",
                              }}
                            >
                              Bio:
                            </p>
                            <p
                              style={{
                                margin: 0,
                                fontSize: "13px",
                                color: "#666",
                              }}
                            >
                              {u.bio}
                            </p>
                          </div>
                        )}
                        <p style={{ margin: "0 0 3px 0" }}>
                          <span
                            style={{
                              color: "#aaa",
                              fontWeight: "700",
                              fontSize: "11px",
                              textTransform: "uppercase",
                              letterSpacing: "0.4px",
                            }}
                          >
                            Zip Code:{" "}
                          </span>
                          <span style={{ color: "#666", fontSize: "13px" }}>
                            {u.zip_code || "—"}
                          </span>
                        </p>
                        <p style={{ margin: "0 0 3px 0" }}>
                          <span
                            style={{
                              color: "#aaa",
                              fontWeight: "700",
                              fontSize: "11px",
                              textTransform: "uppercase",
                              letterSpacing: "0.4px",
                            }}
                          >
                            Profile:{" "}
                          </span>
                          <span style={{ fontSize: "13px" }}>
                            {u.is_public ? (
                              <span style={{ color: "#2d6a4f" }}>Public</span>
                            ) : (
                              <span style={{ color: "#888" }}>Private</span>
                            )}
                          </span>
                        </p>
                        <p style={{ margin: 0 }}>
                          <span
                            style={{
                              color: "#aaa",
                              fontWeight: "700",
                              fontSize: "11px",
                              textTransform: "uppercase",
                              letterSpacing: "0.4px",
                            }}
                          >
                            Joined:{" "}
                          </span>
                          <span style={{ color: "#888", fontSize: "13px" }}>
                            {formatDate(u.created_at)}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TEAM ────────────────────────────────────────────── */}
            {tab === "Team" && (
              <div>
                <div className="section-header">
                  <div>
                    <h2
                      style={{
                        margin: "0 0 2px 0",
                        fontSize: "1rem",
                        color: "#111",
                      }}
                    >
                      Team
                    </h2>
                    <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>
                      Manage admin access and permissions
                    </p>
                  </div>
                  {adminUsers.find((a) => a.email === currentUserEmail)
                    ?.can_manage_team && (
                    <button
                      className="adm-btn adm-btn-green"
                      onClick={() => {
                        setShowInviteForm((v) => !v);
                        setInviteError("");
                      }}
                    >
                      {showInviteForm ? "Cancel" : "+ Invite Person"}
                    </button>
                  )}
                </div>

                {/* Invite form */}
                {showInviteForm && (
                  <div className="row-edit-bg" style={{ marginBottom: "16px" }}>
                    <p
                      style={{
                        margin: "0 0 12px 0",
                        fontWeight: "600",
                        fontSize: "13px",
                        color: "#111",
                      }}
                    >
                      Invite Admin
                    </p>
                    <div
                      className="form-grid-2"
                      style={{ marginBottom: "12px" }}
                    >
                      <div>
                        <label className="field-label">Email *</label>
                        <input
                          className="adm-input"
                          type="email"
                          value={inviteForm.email}
                          onChange={(e) => {
                            setInviteForm((p) => ({
                              ...p,
                              email: e.target.value,
                            }));
                            setInviteError("");
                          }}
                          placeholder="email@example.com"
                        />
                      </div>
                      <div>
                        <label className="field-label">Full Name</label>
                        <input
                          className="adm-input"
                          value={inviteForm.full_name}
                          onChange={(e) =>
                            setInviteForm((p) => ({
                              ...p,
                              full_name: e.target.value,
                            }))
                          }
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                    <p
                      style={{
                        margin: "0 0 8px 0",
                        fontSize: "12px",
                        color: "#888",
                      }}
                    >
                      Permissions — you can change these at any time after
                      inviting.
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                        marginBottom: "14px",
                      }}
                    >
                      {[
                        ["can_view_call_sheet", "Call Sheet"],
                        ["can_edit_prices", "Edit Prices"],
                        ["can_approve_vets", "Approve Vets"],
                        ["can_manage_users", "Manage Users"],
                        ["can_manage_team", "Manage Team"],
                      ].map(([field, label]) => (
                        <label
                          key={field}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "13px",
                            cursor: "pointer",
                            background: "#f5f5f5",
                            padding: "5px 10px",
                            borderRadius: "6px",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={!!inviteForm[field]}
                            onChange={(e) =>
                              setInviteForm((p) => ({
                                ...p,
                                [field]: e.target.checked,
                              }))
                            }
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    {inviteError && (
                      <p
                        style={{
                          margin: "0 0 10px 0",
                          fontSize: "13px",
                          color: "#c62828",
                          fontWeight: "600",
                        }}
                      >
                        ⚠️ {inviteError}
                      </p>
                    )}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "8px",
                      }}
                    >
                      <button
                        className="adm-btn adm-btn-gray"
                        onClick={() => {
                          setShowInviteForm(false);
                          setInviteError("");
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="adm-btn adm-btn-green"
                        onClick={inviteAdminUser}
                        disabled={inviteSaving}
                      >
                        {inviteSaving ? "Saving..." : "Add to Team"}
                      </button>
                    </div>
                  </div>
                )}

                {adminUsersLoading && (
                  <p style={{ color: "#888", fontSize: "14px" }}>
                    Loading team...
                  </p>
                )}
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e8e8e8",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  {adminUsers.length === 0 && !adminUsersLoading && (
                    <p
                      style={{
                        color: "#bbb",
                        fontSize: "14px",
                        padding: "20px",
                        textAlign: "center",
                        fontStyle: "italic",
                      }}
                    >
                      No team members yet.
                    </p>
                  )}
                  {adminUsers.map((u, idx) => {
                    const isMe = u.email === currentUserEmail;
                    const isDeactivating = teamDeactivatingId === u.id;
                    return (
                      <div
                        key={u.id}
                        style={{
                          borderBottom:
                            idx < adminUsers.length - 1
                              ? "1px solid #f0f0f0"
                              : "none",
                        }}
                      >
                        {/* Member row */}
                        <div className="team-member-row">
                          <div className="team-member-info">
                            {/* Name + badges + edit */}
                            {teamEditingId === u.id ? (
                              <div
                                className="team-edit-name-row"
                                style={{ marginBottom: "6px" }}
                              >
                                <input
                                  className="adm-input team-edit-name-input"
                                  value={teamEditName}
                                  onChange={(e) =>
                                    setTeamEditName(e.target.value)
                                  }
                                  placeholder="Full name..."
                                />
                                <div className="team-edit-name-btns">
                                  <button
                                    className="adm-btn adm-btn-gray team-edit-btn"
                                    onClick={() => {
                                      setTeamEditingId(null);
                                      setTeamEditName("");
                                    }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    className="adm-btn adm-btn-green team-edit-btn"
                                    onClick={() =>
                                      updateAdminName(u.id, teamEditName)
                                    }
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  flexWrap: "wrap",
                                  marginBottom: "2px",
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: "600",
                                    fontSize: "14px",
                                    color: "#111",
                                  }}
                                >
                                  {u.full_name || (
                                    <span
                                      style={{
                                        color: "#bbb",
                                        fontStyle: "italic",
                                      }}
                                    >
                                      No name
                                    </span>
                                  )}
                                </span>
                                {isMe && (
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      background: "#e3f2fd",
                                      color: "#1565c0",
                                      padding: "1px 7px",
                                      borderRadius: "20px",
                                      fontWeight: "700",
                                      letterSpacing: "0.3px",
                                    }}
                                  >
                                    YOU
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: "10px",
                                    background:
                                      u.status === "active"
                                        ? "#e8f5e9"
                                        : "#f5f5f5",
                                    color:
                                      u.status === "active"
                                        ? "#2d6a4f"
                                        : "#888",
                                    padding: "1px 7px",
                                    borderRadius: "20px",
                                    fontWeight: "600",
                                  }}
                                >
                                  {u.status === "active"
                                    ? "Active"
                                    : "Inactive"}
                                </span>
                                <button
                                  className="adm-btn adm-btn-outline"
                                  style={{
                                    fontSize: "11px",
                                    padding: "2px 8px",
                                  }}
                                  onClick={() => {
                                    setTeamEditingId(u.id);
                                    setTeamEditName(u.full_name || "");
                                  }}
                                >
                                  Edit Name
                                </button>
                              </div>
                            )}
                            <p
                              style={{
                                margin: "0 0 4px 0",
                                fontSize: "12px",
                                color: "#888",
                              }}
                            >
                              {u.email}
                            </p>
                            {u.invited_by && u.invited_by !== "system" && (
                              <p
                                style={{
                                  margin: "0 0 8px 0",
                                  fontSize: "11px",
                                  color: "#aaa",
                                }}
                              >
                                Invited by {u.invited_by}
                              </p>
                            )}
                            {/* Permissions label + toggles */}
                            <p
                              style={{
                                margin: "14px 0 6px 0",
                                fontSize: "11px",
                                fontWeight: "700",
                                color: "#aaa",
                                textTransform: "uppercase",
                                letterSpacing: "0.4px",
                              }}
                            >
                              Permissions
                            </p>
                            <div className="team-perms-grid">
                              {[
                                ["can_view_call_sheet", "Call Sheet"],
                                ["can_edit_prices", "Edit Prices"],
                                ["can_approve_vets", "Approve Vets"],
                                ["can_manage_users", "Manage Users"],
                                ["can_manage_team", "Manage Team"],
                              ].map(([field, label]) => {
                                const locked =
                                  isMe && field === "can_manage_team";
                                const canEdit = adminUsers.find(
                                  (a) => a.email === currentUserEmail,
                                )?.can_manage_team;
                                return (
                                  <label
                                    key={field}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "5px",
                                      fontSize: "12px",
                                      cursor:
                                        locked || !canEdit
                                          ? "not-allowed"
                                          : "pointer",
                                      opacity: locked ? 0.4 : 1,
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={!!u[field]}
                                      disabled={locked || !canEdit}
                                      onChange={(e) =>
                                        updateAdminPermission(
                                          u.id,
                                          field,
                                          e.target.checked,
                                        )
                                      }
                                    />
                                    {label}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                          {/* Actions — only visible to team managers, not on own row */}
                          {!isMe &&
                            adminUsers.find((a) => a.email === currentUserEmail)
                              ?.can_manage_team && (
                              <div className="team-member-actions">
                                {isDeactivating ? (
                                  <div
                                    style={{
                                      background: "#fff0f0",
                                      border: "1px solid #ffcdd2",
                                      borderRadius: "6px",
                                      padding: "10px 12px",
                                    }}
                                  >
                                    <p
                                      style={{
                                        margin: "0 0 8px 0",
                                        fontSize: "13px",
                                        color: "#c62828",
                                        fontWeight: "600",
                                      }}
                                    >
                                      {u.status === "active"
                                        ? "Deactivate"
                                        : "Reactivate"}{" "}
                                      {u.full_name || u.email}?
                                    </p>
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        gap: "6px",
                                      }}
                                    >
                                      <button
                                        className="adm-btn adm-btn-gray"
                                        onClick={() =>
                                          setTeamDeactivatingId(null)
                                        }
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        className={`adm-btn ${u.status === "active" ? "adm-btn-red" : "adm-btn-green"}`}
                                        onClick={() => toggleAdminStatus(u)}
                                      >
                                        {u.status === "active"
                                          ? "Deactivate"
                                          : "Reactivate"}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    className={`adm-btn ${u.status === "active" ? "adm-btn-gray" : "adm-btn-green"}`}
                                    style={{
                                      fontSize: "12px",
                                      padding: "5px 10px",
                                    }}
                                    onClick={() => setTeamDeactivatingId(u.id)}
                                  >
                                    {u.status === "active"
                                      ? "Deactivate"
                                      : "Reactivate"}
                                  </button>
                                )}
                              </div>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── SYMPTOM LOGS ─────────────────────────────────────── */}
            {tab === "Symptom Logs" && (
              <div>
                <div className="section-header">
                  <h2 style={{ margin: 0, fontSize: "1rem", color: "#111" }}>
                    Symptom Logs{" "}
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#888",
                        fontWeight: "400",
                      }}
                    >
                      ({symptomLogs.length} shown)
                    </span>
                  </h2>
                </div>
                <div className="symptom-stats" style={{ marginBottom: "16px" }}>
                  {Object.entries(TRIAGE_CONFIG).map(([key, cfg]) => {
                    const count = symptomLogs.filter(
                      (s) => s.triage_result === key,
                    ).length;
                    const active = symptomFilter === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setSymptomFilter(active ? "all" : key)}
                        style={{
                          background: active ? cfg.color : cfg.bg,
                          border: `1px solid ${cfg.color}44`,
                          borderRadius: "10px",
                          padding: "12px 8px",
                          cursor: "pointer",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            marginBottom: "4px",
                          }}
                        >
                          <span style={{ fontSize: "16px" }}>{cfg.emoji}</span>
                          <span
                            style={{
                              fontSize: "20px",
                              fontWeight: "700",
                              color: active ? "#fff" : cfg.color,
                            }}
                          >
                            {count}
                          </span>
                        </div>
                        <p
                          className="symptom-stat-label"
                          style={{
                            margin: 0,
                            fontWeight: "600",
                            color: active ? "#fff" : cfg.color,
                          }}
                        >
                          {cfg.label}
                        </p>
                      </button>
                    );
                  })}
                  {symptomFilter !== "all" && (
                    <button
                      onClick={() => setSymptomFilter("all")}
                      style={{
                        background: "#f0f0f0",
                        border: "1px solid #ddd",
                        borderRadius: "10px",
                        padding: "10px 16px",
                        cursor: "pointer",
                        fontSize: "12px",
                        color: "#666",
                        alignSelf: "center",
                      }}
                    >
                      Clear ✕
                    </button>
                  )}
                </div>
                {symptomLoading && (
                  <p style={{ color: "#888", fontSize: "14px" }}>Loading...</p>
                )}
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e8e8e8",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  <div className="log-table-header">
                    <span>Pet</span>
                    <span>Species</span>
                    <span>Result</span>
                    <span>Date</span>
                    <span>Time</span>
                  </div>
                  {filteredLogs.length === 0 && (
                    <p
                      style={{
                        color: "#bbb",
                        fontSize: "14px",
                        padding: "20px",
                        textAlign: "center",
                      }}
                    >
                      No logs found.
                    </p>
                  )}
                  {filteredLogs.map((s) => {
                    const cfg = TRIAGE_CONFIG[s.triage_result] || {
                      color: "#888",
                      bg: "#f5f5f5",
                      label: s.triage_result,
                    };
                    return (
                      <div key={s.id} className="log-row">
                        {/* Desktop columns */}
                        <span
                          className="log-col"
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#111",
                          }}
                        >
                          {s.pets?.name || (
                            <span
                              style={{ color: "#bbb", fontStyle: "italic" }}
                            >
                              Guest
                            </span>
                          )}
                        </span>
                        <span
                          className="log-col"
                          style={{
                            fontSize: "14px",
                            color: "#666",
                            textTransform: "capitalize",
                          }}
                        >
                          {s.pets?.species || "—"}
                        </span>
                        <span className="log-col">
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: "600",
                              color: cfg.color,
                              background: cfg.bg,
                              padding: "3px 10px",
                              borderRadius: "20px",
                              whiteSpace: "nowrap",
                              display: "inline-block",
                            }}
                          >
                            {cfg.label || s.triage_result}
                          </span>
                        </span>
                        <span
                          className="log-col"
                          style={{ fontSize: "13px", color: "#555" }}
                        >
                          {formatLogDate(s.created_at)}
                        </span>
                        <span
                          className="log-col"
                          style={{ fontSize: "13px", color: "#888" }}
                        >
                          {formatLogTime(s.created_at)}
                        </span>
                        {/* Mobile labeled rows */}
                        <div className="log-mobile">
                          <div
                            style={{
                              display: "flex",
                              alignItems: "baseline",
                              gap: "6px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "10px",
                                color: "#aaa",
                                fontWeight: "700",
                                textTransform: "uppercase",
                                letterSpacing: "0.4px",
                                flexShrink: 0,
                              }}
                            >
                              Pet:
                            </span>
                            <span
                              style={{
                                fontSize: "13px",
                                fontWeight: "600",
                                color: "#111",
                              }}
                            >
                              {s.pets?.name || "Guest"}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "baseline",
                              gap: "6px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "10px",
                                color: "#aaa",
                                fontWeight: "700",
                                textTransform: "uppercase",
                                letterSpacing: "0.4px",
                                flexShrink: 0,
                              }}
                            >
                              Species:
                            </span>
                            <span
                              style={{
                                fontSize: "13px",
                                color: "#666",
                                textTransform: "capitalize",
                              }}
                            >
                              {s.pets?.species || "—"}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "10px",
                                color: "#aaa",
                                fontWeight: "700",
                                textTransform: "uppercase",
                                letterSpacing: "0.4px",
                                flexShrink: 0,
                              }}
                            >
                              Result:
                            </span>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: "600",
                                color: cfg.color,
                                background: cfg.bg,
                                padding: "2px 10px",
                                borderRadius: "20px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {cfg.label || s.triage_result}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "baseline",
                              gap: "6px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "10px",
                                color: "#aaa",
                                fontWeight: "700",
                                textTransform: "uppercase",
                                letterSpacing: "0.4px",
                                flexShrink: 0,
                              }}
                            >
                              Date:
                            </span>
                            <span style={{ fontSize: "13px", color: "#555" }}>
                              {formatLogDate(s.created_at)}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "baseline",
                              gap: "6px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "10px",
                                color: "#aaa",
                                fontWeight: "700",
                                textTransform: "uppercase",
                                letterSpacing: "0.4px",
                                flexShrink: 0,
                              }}
                            >
                              Time:
                            </span>
                            <span style={{ fontSize: "13px", color: "#888" }}>
                              {formatLogTime(s.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* ── Global Floating Notes Button + Panel — visible on all tabs ── */}
      {/* Panel — slides from right on desktop, up from bottom on mobile */}
      {/* Panel — slides from right on desktop, up from bottom on mobile */}
      <div
        className={`notes-panel-desktop${showAllNotes ? " notes-panel-open" : ""}`}
        style={{
          position: "fixed",
          zIndex: 500,
          background: "#fff",
          boxShadow: "0 0 32px rgba(0,0,0,0.18)",
          transition: "transform 0.3s ease",
          overflowY: "auto",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Panel header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid #ffe0b2",
            background: "#fff8e1",
            position: "sticky",
            top: 0,
          }}
        >
          <span
            style={{ fontSize: "14px", fontWeight: "700", color: "#e65100" }}
          >
            📋 All Call Notes{" "}
            {allCallNotes.length > 0 ? `(${allCallNotes.length})` : ""}
          </span>
          <button
            onClick={() => setShowAllNotes(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "20px",
              color: "#aaa",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
        {/* Panel content */}
        <div style={{ padding: "0" }}>
          {allNotesLoading && (
            <p
              style={{
                padding: "16px",
                color: "#888",
                fontSize: "13px",
                margin: 0,
              }}
            >
              Loading notes...
            </p>
          )}
          {!allNotesLoading && allCallNotes.length === 0 && (
            <p
              style={{
                padding: "16px",
                color: "#aaa",
                fontSize: "13px",
                fontStyle: "italic",
                margin: 0,
              }}
            >
              No notes saved yet.
            </p>
          )}
          {!allNotesLoading &&
            allCallNotes.map((n, i) => (
              <div
                key={n.id}
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                {allNotesEditingId === n.id ? (
                  <div>
                    <p
                      style={{
                        margin: "0 0 6px 0",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#2d6a4f",
                      }}
                    >
                      {n.vet_name}
                    </p>
                    <textarea
                      className="adm-input"
                      rows={3}
                      style={{
                        width: "100%",
                        resize: "vertical",
                        height: "auto",
                        marginBottom: "8px",
                      }}
                      value={allNotesEditingText}
                      onChange={(e) => setAllNotesEditingText(e.target.value)}
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "8px",
                      }}
                    >
                      <button
                        className="adm-btn adm-btn-gray"
                        onClick={() => {
                          setAllNotesEditingId(null);
                          setAllNotesEditingText("");
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="adm-btn adm-btn-green"
                        onClick={() =>
                          updateCallNote(n.id, allNotesEditingText)
                        }
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : allNotesDeletingId === n.id ? (
                  <div
                    style={{
                      background: "#fff0f0",
                      border: "1px solid #ffcdd2",
                      borderRadius: "6px",
                      padding: "12px",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 4px 0",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#111",
                      }}
                    >
                      {n.vet_name}
                    </p>
                    <p
                      style={{
                        margin: "0 0 10px 0",
                        fontSize: "13px",
                        color: "#c62828",
                        fontWeight: "600",
                      }}
                    >
                      Delete this note?
                    </p>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "8px",
                      }}
                    >
                      <button
                        className="adm-btn adm-btn-gray"
                        onClick={() => setAllNotesDeletingId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className="adm-btn adm-btn-red"
                        onClick={() => deleteCallNote(n.id)}
                      >
                        Yes, Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p
                      style={{
                        margin: "0 0 2px 0",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#111",
                      }}
                    >
                      {n.vet_name}
                    </p>
                    <p
                      style={{
                        margin: "0 0 6px 0",
                        fontSize: "11px",
                        color: "#aaa",
                      }}
                    >
                      {formatLogDate(n.created_at)}
                      {n.updated_at !== n.created_at ? " · edited" : ""}
                    </p>
                    <p
                      style={{
                        margin: "0 0 10px 0",
                        fontSize: "13px",
                        color: "#555",
                        lineHeight: "1.5",
                      }}
                    >
                      {n.note}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "8px",
                      }}
                    >
                      <button
                        className="adm-btn adm-btn-outline"
                        onClick={() => {
                          setAllNotesEditingId(n.id);
                          setAllNotesEditingText(n.note);
                          setAllNotesDeletingId(null);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="adm-btn adm-btn-red"
                        onClick={() => {
                          setAllNotesDeletingId(n.id);
                          setAllNotesEditingId(null);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* Unified floating action buttons — Notes (top) + ↑ + ↓, right: 29px (5px right of old 24px) */}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "19px",
          zIndex: 300,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => {
            setShowAllNotes((v) => !v);
            if (!showAllNotes) fetchAllCallNotes();
          }}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "#e65100",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontSize: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(230,81,0,0.35)",
            fontFamily: "system-ui, sans-serif",
          }}
          title="Call Notes"
        >
          📋
        </button>
        <button
          className="scroll-arrow-btn"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          title="Scroll to top"
        >
          ↑
        </button>
        <button
          className="scroll-arrow-btn"
          onClick={() =>
            window.scrollTo({
              top: document.body.scrollHeight,
              behavior: "smooth",
            })
          }
          title="Scroll to bottom"
        >
          ↓
        </button>
      </div>
      {showAllNotes && (
        <div
          onClick={() => setShowAllNotes(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            zIndex: 400,
          }}
        />
      )}
    </>
  );
}
