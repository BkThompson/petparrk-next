"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

// ── Admin whitelist ───────────────────────────────────────────────────────────
const ADMIN_EMAILS = ["bkalthompson@gmail.com", "maggie.tursi@gmai.com"];

const TABS = [
  "Submissions",
  "Pending Vets",
  "Vets",
  "Prices",
  "Users",
  "Symptom Logs",
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
  emergency: {
    color: "#c62828",
    bg: "#fdecea",
    emoji: "🚨",
    label: "Emergency",
  },
  see_vet_soon: {
    color: "#e65100",
    bg: "#fff3e0",
    emoji: "🟡",
    label: "See vet soon",
  },
  monitor: { color: "#1565c0", bg: "#e3f2fd", emoji: "🔵", label: "Monitor" },
  looks_ok: { color: "#2d6a4f", bg: "#e8f5e9", emoji: "✅", label: "Looks OK" },
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
    species: "dog",
    species_other: "",
    call_for_quote: false,
    notes: "",
  });

  // Users
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");

  // Symptom Logs
  const [symptomLogs, setSymptomLogs] = useState([]);
  const [symptomLoading, setSymptomLoading] = useState(true);
  const [symptomFilter, setSymptomFilter] = useState("all");

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
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session || !ADMIN_EMAILS.includes(data.session.user.email)) {
        router.push("/");
      } else {
        setAuthorized(true);
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

  async function fetchSymptomLogs() {
    setSymptomLoading(true);
    const { data } = await supabase
      .from("symptom_checks")
      .select("id, created_at, triage_result, species")
      .order("created_at", { ascending: false })
      .limit(200);
    setSymptomLogs(data || []);
    setSymptomLoading(false);
  }

  async function fetchPricesForVet(vetId) {
    setPricesLoading(true);
    const { data } = await supabase
      .from("vet_prices")
      .select("*, services(name)")
      .eq("vet_id", vetId)
      .order("created_at");
    setVetPrices(data || []);
    setPricesLoading(false);
  }

  // ── Submission actions ────────────────────────────────────────────
  async function updateSubmissionStatus(id, status) {
    await supabase.from("price_submissions").update({ status }).eq("id", id);
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
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
      zip_code: form.zip_code,
      phone: form.phone,
      website: form.website,
      hours: form.hours,
      neighborhood: form.neighborhood || form.city,
      vet_type: form.vet_type
        ? Array.isArray(form.vet_type)
          ? form.vet_type
          : [form.vet_type]
        : ["General Practice"],
      accepting_new_patients: form.accepting_new_patients ?? null,
      carecredit: form.carecredit ?? false,
      status: "active",
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
        prev.map((v) => (v.id === editingVet ? { ...v, ...vetForm } : v))
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
        [...prev, data].sort((a, b) => a.name.localeCompare(b.name))
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
      prev.map((v) => (v.id === vet.id ? { ...v, status: newStatus } : v))
    );
    fetchStats();
  }

  // ── Price actions ─────────────────────────────────────────────────
  function startEditPrice(price) {
    setEditingPrice(price.id);
    setPriceForm({ ...price });
  }

  async function savePrice() {
    setPriceSaving(true);
    const { error } = await supabase
      .from("vet_prices")
      .update({
        service_id: priceForm.service_id,
        price_low: priceForm.price_low || null,
        price_high: priceForm.price_high || null,
        price_type: priceForm.price_type,
        includes_bloodwork: priceForm.includes_bloodwork,
        includes_xrays: priceForm.includes_xrays,
        includes_anesthesia: priceForm.includes_anesthesia,
        species:
          priceForm.species === "other"
            ? priceForm.species_other || "Other"
            : priceForm.species,
        call_for_quote: priceForm.call_for_quote,
        notes: priceForm.notes,
      })
      .eq("id", editingPrice);
    if (!error) {
      await fetchPricesForVet(selectedVetId);
      setEditingPrice(null);
    } else {
      alert("Save failed: " + error.message);
    }
    setPriceSaving(false);
  }

  async function deletePrice(id) {
    if (!confirm("Delete this price row?")) return;
    await supabase.from("vet_prices").delete().eq("id", id);
    setVetPrices((prev) => prev.filter((p) => p.id !== id));
    fetchStats();
  }

  async function addPrice() {
    if (!addPriceForm.service_id || !addPriceForm.price_low) {
      alert("Service and low price are required.");
      return;
    }
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
        species: "dog",
        species_other: "",
        call_for_quote: false,
        notes: "",
      });
      fetchStats();
    } else {
      alert("Error: " + error.message);
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
  function formatDateTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  function formatPrice(low, high, type) {
    if (!low) return "—";
    if (type === "starting") return `$${Number(low).toLocaleString()}+`;
    if (type === "range" && high)
      return `$${Number(low).toLocaleString()}–$${Number(
        high
      ).toLocaleString()}`;
    return `$${Number(low).toLocaleString()}`;
  }

  const filteredSubs = submissions.filter((s) =>
    subFilter === "all" ? true : s.status === subFilter
  );
  const filteredVets = vets.filter(
    (v) =>
      v.name.toLowerCase().includes(vetSearch.toLowerCase()) ||
      v.neighborhood?.toLowerCase().includes(vetSearch.toLowerCase())
  );
  const filteredUsers = users.filter(
    (u) =>
      !userSearch ||
      u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.zip_code?.includes(userSearch)
  );
  const filteredLogs =
    symptomFilter === "all"
      ? symptomLogs
      : symptomLogs.filter((s) => s.triage_result === symptomFilter);

  if (session === undefined || !authorized) return null;

  // Reusable pending vet edit form
  function PendingVetEditForm({ form, setForm, onApprove, onCancel }) {
    return (
      <div className="row-edit-bg" style={{ marginTop: "10px" }}>
        <div className="form-grid-3" style={{ marginBottom: "10px" }}>
          {[
            ["name", "Name"],
            ["address", "Address"],
            ["city", "City"],
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
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="adm-btn adm-btn-green" onClick={onApprove}>
            ✅ Approve & Add to Site
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
        .adm-input { width: 100%; padding: 7px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; font-family: system-ui, sans-serif; outline: none; background: #fff; }
        .adm-input:focus { border-color: #2d6a4f; }
        select.adm-input { cursor: pointer; padding-right: 28px; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; }
        .adm-btn { padding: 5px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; font-family: system-ui, sans-serif; white-space: nowrap; }
        .adm-btn-green { background: #2d6a4f; color: #fff; }
        .adm-btn-green:hover { background: #245a42; }
        .adm-btn-red { background: #fce8e8; color: #c62828; border: 1px solid #f5c6c6; }
        .adm-btn-red:hover { background: #fbd0d0; }
        .adm-btn-gray { background: #f0f0f0; color: #444; border: 1px solid #ddd; }
        .adm-btn-gray:hover { background: #e5e5e5; }
        .adm-btn-outline { background: #fff; color: #2d6a4f; border: 1px solid #2d6a4f; }
        .adm-btn-outline:hover { background: #f0f7f4; }
        .adm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .stat-card { background: #fff; border: 1px solid #e8e8e8; border-radius: 10px; padding: 14px 18px; }
        .tab-btn { padding: 8px 14px; border: none; background: none; font-size: 13px; font-weight: 600; cursor: pointer; color: #888; border-bottom: 2px solid transparent; font-family: system-ui, sans-serif; white-space: nowrap; }
        .tab-btn.active { color: #2d6a4f; border-bottom-color: #2d6a4f; }
        .tab-btn:hover:not(.active) { color: #333; }
        .tab-badge { display: inline-block; margin-left: 5px; background: #e65100; color: #fff; border-radius: 20px; padding: 1px 6px; font-size: 10px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .badge-pending { background: #fff8e1; color: #e65100; }
        .badge-approved { background: #e8f5e9; color: #2d6a4f; }
        .badge-rejected { background: #fce8e8; color: #c62828; }
        .badge-active { background: #e8f5e9; color: #2d6a4f; }
        .badge-inactive { background: #f0f0f0; color: #888; }
        .row-edit-bg { background: #f9f9f9; border-radius: 8px; padding: 14px; margin: 4px 0 12px 0; border: 1px solid #e8e8e8; }
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        .form-grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; }
        .field-label { display: block; font-size: 11px; color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
        .sub-card { background: #fff; border: 1px solid #e8e8e8; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; }
        .pending-vet-card { background: #fff; border: 1px solid #e8e8e8; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; }
        .vet-row { border-bottom: 1px solid #f0f0f0; padding: 10px 0; }
        .vet-row:last-child { border-bottom: none; }
        .price-row { border-bottom: 1px solid #f0f0f0; padding: 8px 0; display: flex; align-items: center; gap: 12px; }
        .price-row:last-child { border-bottom: none; }
        .log-row { border-bottom: 1px solid #f5f5f3; padding: 10px 14px; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; align-items: center; gap: 8px; }
        .log-row:last-child { border-bottom: none; }
        .log-row:hover { background: #fafaf8; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .stat-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 20px; }
        .filter-bar { display: flex; gap: 6px; flex-wrap: wrap; }
        .tabs-scroll { display: flex; overflow-x: auto; border-bottom: 1px solid #e8e8e8; padding: 0 16px; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .tabs-scroll::-webkit-scrollbar { display: none; }
        .table-header { display: grid; padding: 8px 14px; background: #fafaf8; border-bottom: 1px solid #efefed; }
        .table-header span { font-size: 11px; color: #999; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        html { scrollbar-gutter: stable; }
        @media (max-width: 700px) {
          .stat-grid { grid-template-columns: repeat(3, 1fr); }
          .form-grid-2, .form-grid-3, .form-grid-4 { grid-template-columns: 1fr; }
          .section-header { flex-direction: column; align-items: flex-start !important; gap: 10px; }
          .vet-row-buttons { gap: 4px !important; }
          .log-row { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 480px) {
          .stat-grid { grid-template-columns: repeat(2, 1fr); }
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
            <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>
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
            overflow: "hidden",
          }}
        >
          <div className="tabs-scroll">
            {TABS.map((t) => (
              <button
                key={t}
                className={`tab-btn${tab === t ? " active" : ""}`}
                onClick={() => setTab(t)}
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
                        className={`adm-btn ${
                          subFilter === f ? "adm-btn-green" : "adm-btn-gray"
                        }`}
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
                              fontSize: "12px",
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
                            fontSize: "11px",
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
                    <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>
                      Found by the AI agent — review before going live
                    </p>
                  </div>
                </div>
                {pendingVetsLoading && (
                  <p style={{ color: "#888", fontSize: "14px" }}>Loading...</p>
                )}
                {!pendingVetsLoading && pendingVets.length === 0 && (
                  <div style={{ textAlign: "center", padding: "48px 20px" }}>
                    <p style={{ fontSize: "32px", margin: "0 0 8px 0" }}>🏥</p>
                    <p style={{ color: "#bbb", fontSize: "14px", margin: 0 }}>
                      No pending vets. The AI agent hasn't found any new ones
                      yet.
                    </p>
                  </div>
                )}
                {pendingVets.map((vet) => (
                  <div key={vet.id} className="pending-vet-card">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: "8px",
                        marginBottom:
                          editingPendingVet === vet.id ? "4px" : "0",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "2px",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: "700",
                              fontSize: "14px",
                              color: "#111",
                            }}
                          >
                            {vet.name}
                          </span>
                          {vet.source && (
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
                          )}
                        </div>
                        <p
                          style={{ margin: 0, fontSize: "12px", color: "#888" }}
                        >
                          {[vet.address, vet.city, vet.zip_code]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                        {vet.phone && (
                          <p
                            style={{
                              margin: "2px 0 0 0",
                              fontSize: "12px",
                              color: "#888",
                            }}
                          >
                            {vet.phone}
                          </p>
                        )}
                        <p
                          style={{
                            margin: "4px 0 0 0",
                            fontSize: "11px",
                            color: "#bbb",
                          }}
                        >
                          Found {formatDate(vet.created_at)}
                        </p>
                      </div>
                      <div
                        style={{ display: "flex", gap: "6px", flexShrink: 0 }}
                      >
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
                          {editingPendingVet === vet.id ? "Cancel" : "✏️ Edit"}
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
                                  t
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
                  placeholder="Search vets by name or neighborhood..."
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
                      <div className="vet-row" style={{ padding: "10px 14px" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: "10px",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: "600",
                                fontSize: "14px",
                                color: "#111",
                              }}
                            >
                              {vet.name}
                            </div>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#888",
                                marginTop: "2px",
                              }}
                            >
                              {vet.neighborhood}
                            </div>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#aaa",
                                marginTop: "1px",
                              }}
                            >
                              {vet.phone}
                            </div>
                          </div>
                          <div
                            className="vet-row-buttons"
                            style={{
                              display: "flex",
                              gap: "6px",
                              alignItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            <span className={`badge badge-${vet.status}`}>
                              {vet.status}
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
                                          vetForm.vet_type
                                        )
                                          ? vetForm.vet_type
                                          : [vetForm.vet_type]
                                        ).includes(t)}
                                        onChange={(e) => {
                                          const cur = Array.isArray(
                                            vetForm.vet_type
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
                <div className="section-header">
                  <h2 style={{ margin: 0, fontSize: "1rem", color: "#111" }}>
                    Prices
                  </h2>
                </div>
                <div style={{ marginBottom: "16px", maxWidth: "400px" }}>
                  <label className="field-label">Select Vet</label>
                  <select
                    className="adm-input"
                    value={selectedVetId}
                    onChange={(e) => {
                      setSelectedVetId(e.target.value);
                      setEditingPrice(null);
                      setShowAddPrice(false);
                      if (e.target.value) fetchPricesForVet(e.target.value);
                      else setVetPrices([]);
                    }}
                  >
                    <option value="">— Choose a vet —</option>
                    {vets.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
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
                              value={addPriceForm.service_id}
                              onChange={(e) =>
                                setAddPriceForm({
                                  ...addPriceForm,
                                  service_id: e.target.value,
                                })
                              }
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
                              type="number"
                              value={addPriceForm.price_low}
                              onChange={(e) =>
                                setAddPriceForm({
                                  ...addPriceForm,
                                  price_low: e.target.value,
                                })
                              }
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
                          className="form-grid-3"
                          style={{ marginBottom: "10px" }}
                        >
                          <div>
                            <label className="field-label">Species</label>
                            <select
                              className="adm-input"
                              value={addPriceForm.species || "dog"}
                              onChange={(e) =>
                                setAddPriceForm({
                                  ...addPriceForm,
                                  species: e.target.value,
                                  species_other: "",
                                })
                              }
                            >
                              <option value="dog">Dog</option>
                              <option value="cat">Cat</option>
                              <option value="rabbit">Rabbit</option>
                              <option value="bird">Bird</option>
                              <option value="other">Other</option>
                            </select>
                            {addPriceForm.species === "other" && (
                              <input
                                className="adm-input"
                                style={{ marginTop: "6px" }}
                                value={addPriceForm.species_other}
                                onChange={(e) =>
                                  setAddPriceForm({
                                    ...addPriceForm,
                                    species_other: e.target.value,
                                  })
                                }
                                placeholder="e.g. Guinea Pig..."
                              />
                            )}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "6px",
                              paddingTop: "18px",
                            }}
                          >
                            {[
                              ["includes_bloodwork", "Includes bloodwork"],
                              ["includes_xrays", "Includes x-rays"],
                              ["includes_anesthesia", "Includes anesthesia"],
                              ["call_for_quote", "Call for quote"],
                            ].map(([f, l]) => (
                              <label
                                key={f}
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
                                  checked={!!addPriceForm[f]}
                                  onChange={(e) =>
                                    setAddPriceForm({
                                      ...addPriceForm,
                                      [f]: e.target.checked,
                                    })
                                  }
                                />
                                {l}
                              </label>
                            ))}
                          </div>
                          <div>
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
                        </div>
                        <button
                          className="adm-btn adm-btn-green"
                          onClick={addPrice}
                        >
                          Add Price
                        </button>
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
                          <div
                            className="price-row"
                            style={{ padding: "10px 14px" }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: "600",
                                  fontSize: "13px",
                                  color: "#111",
                                  marginBottom: "3px",
                                }}
                              >
                                {p.services?.name || "—"}
                              </div>
                              <div>
                                <span
                                  style={{
                                    fontSize: "13px",
                                    color: "#2d6a4f",
                                    fontWeight: "600",
                                  }}
                                >
                                  {formatPrice(
                                    p.price_low,
                                    p.price_high,
                                    p.price_type
                                  )}
                                </span>
                                <span
                                  style={{
                                    marginLeft: "6px",
                                    fontSize: "11px",
                                    color: "#888",
                                  }}
                                >
                                  ({p.price_type})
                                </span>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: "4px",
                                  marginTop: "4px",
                                }}
                              >
                                {p.species && (
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      background: "#f0f0f0",
                                      color: "#555",
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                      textTransform: "capitalize",
                                    }}
                                  >
                                    {p.species}
                                  </span>
                                )}
                                {p.includes_bloodwork && (
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      background: "#e8f5e9",
                                      color: "#2d6a4f",
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    + bloodwork
                                  </span>
                                )}
                                {p.includes_xrays && (
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      background: "#e8f5e9",
                                      color: "#2d6a4f",
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    + x-rays
                                  </span>
                                )}
                                {p.includes_anesthesia && (
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      background: "#e8f5e9",
                                      color: "#2d6a4f",
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    + anesthesia
                                  </span>
                                )}
                                {p.call_for_quote && (
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      background: "#fff8e1",
                                      color: "#e65100",
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    call for quote
                                  </span>
                                )}
                                {p.notes && (
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      color: "#888",
                                      fontStyle: "italic",
                                    }}
                                  >
                                    {p.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: "6px",
                                flexShrink: 0,
                                alignSelf: "flex-start",
                              }}
                            >
                              <button
                                className="adm-btn adm-btn-outline"
                                onClick={() =>
                                  editingPrice === p.id
                                    ? setEditingPrice(null)
                                    : startEditPrice(p)
                                }
                              >
                                {editingPrice === p.id ? "Cancel" : "Edit"}
                              </button>
                              <button
                                className="adm-btn adm-btn-red"
                                onClick={() => deletePrice(p.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          {editingPrice === p.id && (
                            <div style={{ padding: "0 14px 14px 14px" }}>
                              <div className="row-edit-bg">
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
                                      value={priceForm.price_low || ""}
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
                                      value={priceForm.price_high || ""}
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
                                  className="form-grid-3"
                                  style={{ marginBottom: "10px" }}
                                >
                                  <div>
                                    <label className="field-label">
                                      Species
                                    </label>
                                    <select
                                      className="adm-input"
                                      value={priceForm.species || "dog"}
                                      onChange={(e) =>
                                        setPriceForm({
                                          ...priceForm,
                                          species: e.target.value,
                                          species_other: "",
                                        })
                                      }
                                    >
                                      <option value="dog">Dog</option>
                                      <option value="cat">Cat</option>
                                      <option value="rabbit">Rabbit</option>
                                      <option value="bird">Bird</option>
                                      <option value="other">Other</option>
                                    </select>
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "6px",
                                      paddingTop: "18px",
                                    }}
                                  >
                                    {[
                                      [
                                        "includes_bloodwork",
                                        "Includes bloodwork",
                                      ],
                                      ["includes_xrays", "Includes x-rays"],
                                      [
                                        "includes_anesthesia",
                                        "Includes anesthesia",
                                      ],
                                      ["call_for_quote", "Call for quote"],
                                    ].map(([f, l]) => (
                                      <label
                                        key={f}
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
                                          checked={!!priceForm[f]}
                                          onChange={(e) =>
                                            setPriceForm({
                                              ...priceForm,
                                              [f]: e.target.checked,
                                            })
                                          }
                                        />
                                        {l}
                                      </label>
                                    ))}
                                  </div>
                                  <div>
                                    <label className="field-label">Notes</label>
                                    <input
                                      className="adm-input"
                                      value={priceForm.notes || ""}
                                      onChange={(e) =>
                                        setPriceForm({
                                          ...priceForm,
                                          notes: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                </div>
                                <div style={{ display: "flex", gap: "8px" }}>
                                  <button
                                    className="adm-btn adm-btn-green"
                                    onClick={savePrice}
                                    disabled={priceSaving}
                                  >
                                    {priceSaving ? "Saving..." : "Save Changes"}
                                  </button>
                                  <button
                                    className="adm-btn adm-btn-gray"
                                    onClick={() => setEditingPrice(null)}
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
                  </>
                )}
              </div>
            )}

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
                  <div
                    className="table-header"
                    style={{
                      gridTemplateColumns: "2fr 1fr 1fr 1fr",
                      display: "grid",
                    }}
                  >
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
                    <div
                      key={u.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1fr 1fr 1fr",
                        padding: "10px 14px",
                        borderBottom: "1px solid #f5f5f3",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: "13px",
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
                            style={{
                              margin: "2px 0 0 0",
                              fontSize: "11px",
                              color: "#aaa",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {u.bio}
                          </p>
                        )}
                      </div>
                      <span style={{ fontSize: "13px", color: "#666" }}>
                        {u.zip_code || "—"}
                      </span>
                      <span style={{ fontSize: "12px" }}>
                        {u.is_public ? (
                          <span style={{ color: "#2d6a4f" }}>✅ Public</span>
                        ) : (
                          <span style={{ color: "#bbb" }}>Private</span>
                        )}
                      </span>
                      <span style={{ fontSize: "12px", color: "#bbb" }}>
                        {formatDate(u.created_at)}
                      </span>
                    </div>
                  ))}
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
                {/* Triage breakdown — click to filter */}
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                    marginBottom: "16px",
                  }}
                >
                  {Object.entries(TRIAGE_CONFIG).map(([key, cfg]) => {
                    const count = symptomLogs.filter(
                      (s) => s.triage_result === key
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
                          padding: "10px 16px",
                          cursor: "pointer",
                          textAlign: "left",
                          minWidth: "100px",
                          transition: "all 0.15s",
                        }}
                      >
                        <p style={{ margin: "0 0 2px 0", fontSize: "18px" }}>
                          {cfg.emoji}
                        </p>
                        <p
                          style={{
                            margin: "0 0 2px 0",
                            fontSize: "20px",
                            fontWeight: "700",
                            color: active ? "#fff" : cfg.color,
                          }}
                        >
                          {count}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "11px",
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
                  <div
                    className="table-header"
                    style={{
                      gridTemplateColumns: "2fr 1fr 1fr 1fr",
                      display: "grid",
                    }}
                  >
                    <span>Pet</span>
                    <span>Species</span>
                    <span>Result</span>
                    <span>Date</span>
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
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#111",
                          }}
                        >
                          {s.pet_id ? (
                            <span
                              style={{
                                color: "#888",
                                fontFamily: "monospace",
                                fontSize: "11px",
                              }}
                            >
                              {s.pet_id.slice(0, 8)}…
                            </span>
                          ) : (
                            <span
                              style={{ color: "#bbb", fontStyle: "italic" }}
                            >
                              Guest
                            </span>
                          )}
                        </span>
                        <span
                          style={{
                            fontSize: "13px",
                            color: "#666",
                            textTransform: "capitalize",
                          }}
                        >
                          {s.species || "—"}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "600",
                            color: cfg.color,
                            background: cfg.bg,
                            padding: "2px 8px",
                            borderRadius: "20px",
                            whiteSpace: "nowrap",
                            display: "inline-block",
                          }}
                        >
                          {cfg.label || s.triage_result}
                        </span>
                        <span style={{ fontSize: "12px", color: "#bbb" }}>
                          {formatDateTime(s.created_at)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
