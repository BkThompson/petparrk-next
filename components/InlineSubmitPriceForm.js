"use client";

/* ════════════════════════════════════════════════════════════════════════
   InlineSubmitPriceForm — the community price-submission form.

   Extracted from ProfileMain / ProfileUsername, where it existed as two
   ~1,390-line copies that had silently drifted apart in four CSS rules.
   ProfileMain's version is canonical.

   Shared by:
     • app/profile/page.js            (ProfileMain)
     • app/profile/[username]/page.js (ProfileUsername)

   Props: { C, session, showToast, onClose }
     C         — brand token object (navyDark, cream, terracotta, …)
     session   — Supabase session; the submitter
     showToast — (msg, kind) => void
     onClose   — () => void
   ════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef } from "react";
import {
  Check,
  Upload,
  X,
  Search,
  FileText,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { extractReceiptPrices } from "../lib/copilotApi";
import { supabase } from "../lib/supabase";
import AutoGrowTextarea from "./AutoGrowTextarea";

const SUBMIT_EMPTY_ENTRY = {
  service_name: "",
  service_other: "",
  price_type: "exact",
  price_low: "",
  price_high: "",
  species: "",
  species_other: "",
  includes_bloodwork: false,
  includes_xrays: false,
  includes_anesthesia: false,
  carecredit: "",
  accepting_new_patients: "",
  vaccines_included: "",
};

function isVaccinePackage(n) {
  return n && n.toLowerCase().includes("vaccine package");
}

export default function InlineSubmitPriceForm({
  C,
  session,
  showToast,
  onClose,
  onSubmitted, // fired once when a submission succeeds, so the host page can
  // collapse its own header/toggle and let the success card stand alone
  // When rendered on a vet's page the vet is already context: pass vetId +
  // vetName and the form locks to it, skipping the picker entirely. Every
  // downstream check (validation, vet_id, submit guard) reads `selectedVet`,
  // so seeding it here is all that's required.
  vetId,
  vetName,
}) {
  const vetLocked = !!vetId;
  const [vets, setVets] = useState([]);
  const [vetSearch, setVetSearch] = useState("");
  const [selectedVet, setSelectedVet] = useState(
    vetId ? { id: vetId, name: vetName } : null,
  );
  const [showDropdown, setShowDropdown] = useState(false);
  // New-vet path: when the user's vet isn't in the directory, they fill in
  // these fields and we create a pending_vets row for admin review.
  const [addingNewVet, setAddingNewVet] = useState(false);
  const [newVet, setNewVet] = useState({
    name: "",
    address: "",
    city: "",
    zip_code: "",
    phone: "",
  });

  const [entries, setEntries] = useState([{ ...SUBMIT_EMPTY_ENTRY }]);
  const [visitDate, setVisitDate] = useState("");
  const [submitterNote, setSubmitterNote] = useState("");
  const [submitFile, setSubmitFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [formStatus, setFormStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // ── Contribution mode: type prices in, or upload receipts for AI extraction.
  // Both paths end in the same editable `entries` rows and the same submit.
  const [mode, setMode] = useState("manual"); // 'manual' | 'upload'
  const [receiptFiles, setReceiptFiles] = useState([]); // {id,file,status,result}
  const [extracting, setExtracting] = useState(false);
  const [extractionRan, setExtractionRan] = useState(false);
  const [extractNotices, setExtractNotices] = useState([]); // skipped/mismatch messages
  const receiptInputRef = useRef(null);

  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("vets")
      .select("id, name, slug, city, state, address")
      .order("name")
      .range(0, 9999)
      .then(({ data }) => setVets(data || []));
  }, [session]);

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredVets =
    vetSearch.trim().length === 0
      ? []
      : (() => {
          const q = vetSearch.toLowerCase().trim();
          // Score each match so the most relevant surface in the top 8:
          //   3 = name starts with the query   (Montclair ← "mont" or "m")
          //   2 = a word in the name starts with the query
          //   1 = name contains the query anywhere
          //   0 = only city or address matches
          const scored = [];
          for (const v of vets) {
            const name = (v.name || "").toLowerCase();
            const city = (v.city || "").toLowerCase();
            const address = (v.address || "").toLowerCase();
            let score = -1;
            if (name.startsWith(q)) score = 3;
            else if (name.split(/\s+/).some((w) => w.startsWith(q))) score = 2;
            else if (name.includes(q)) score = 1;
            else if (city.includes(q) || address.includes(q)) score = 0;
            if (score >= 0) scored.push({ v, score });
          }
          scored.sort(
            (a, b) =>
              b.score - a.score ||
              (a.v.name || "").localeCompare(b.v.name || ""),
          );
          return scored.slice(0, 8).map((s) => s.v);
        })();

  // Soft duplicate guard: if the new-vet name closely resembles an existing
  // directory vet, surface it so the user can pick the real one instead of
  // creating a duplicate pending vet for the admin to clean up.
  const likelyDuplicate = (() => {
    if (!addingNewVet) return null;
    const n = newVet.name.trim().toLowerCase();
    if (n.length < 3) return null;
    return (
      vets.find((v) => {
        const vn = (v.name || "").toLowerCase();
        return vn === n || vn.includes(n) || n.includes(vn);
      }) || null
    );
  })();

  function pickVet(vet) {
    setSelectedVet(vet);
    setVetSearch(vet.name);
    setShowDropdown(false);
  }
  function clearVet() {
    setSelectedVet(null);
    setVetSearch("");
    setShowDropdown(false);
  }
  function updateEntry(idx, field, value) {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)),
    );
  }
  function addEntry() {
    setEntries((prev) => [...prev, { ...SUBMIT_EMPTY_ENTRY }]);
  }
  function removeEntry(idx) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }
  function validateAndSetFile(file) {
    const ok = ["image/jpeg", "image/png", "application/pdf"].includes(
      file.type,
    );
    if (!ok) {
      alert("Please use JPG, PNG, or PDF.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File must be under 5MB.");
      return;
    }
    setSubmitFile(file);
  }

  // ── Receipt upload mode ─────────────────────────────────────────────────
  const MAX_RECEIPTS = 5;
  const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

  function addReceipts(fileList) {
    setErrorMsg("");
    const incoming = Array.from(fileList);
    const room = MAX_RECEIPTS - receiptFiles.length;
    const accepted = [];
    let notice = null;
    for (const file of incoming) {
      if (accepted.length >= room) {
        notice = `You can upload up to ${MAX_RECEIPTS} at a time. Any extra can go in a second batch.`;
        break;
      }
      if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) {
        notice = "Please upload JPG, PNG, or PDF files only.";
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        notice = `${file.name} is larger than 5MB.`;
        continue;
      }
      accepted.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        status: "queued",
        result: null,
      });
    }
    if (accepted.length) setReceiptFiles((f) => [...f, ...accepted]);
    if (notice) setErrorMsg(notice);
  }

  function removeReceipt(id) {
    setReceiptFiles((f) => f.filter((x) => x.id !== id));
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
  }

  // Read all receipts, then turn their line items into editable entry rows.
  async function runExtraction() {
    if (!selectedVet) {
      setErrorMsg("Please choose the vet first, so we can match the receipts.");
      return;
    }
    if (receiptFiles.length === 0) return;

    setExtracting(true);
    setErrorMsg("");
    const notices = [];
    const newEntries = [];
    let earliestDate = "";

    for (const item of receiptFiles) {
      setReceiptFiles((prev) =>
        prev.map((x) =>
          x.id === item.id ? { ...x, status: "processing" } : x,
        ),
      );
      try {
        const base64 = await fileToBase64(item.file);
        const result = await extractReceiptPrices({
          documentBase64: base64,
          documentMediaType: item.file.type,
          expectedVet: { id: selectedVet.id, name: selectedVet.name },
        });

        let status = "done";
        if (result.error) {
          status = "failed";
          notices.push(`We couldn't read ${item.file.name}.`);
        } else if (result.rejected === "too_old") {
          status = "too_old";
          notices.push(
            `${item.file.name} is more than a year old, so we've set it aside — we keep pricing current by only accepting receipts from the past 12 months.`,
          );
        } else if (result.clinic_match === "mismatch") {
          status = "mismatch";
          notices.push(
            `${item.file.name} looks like it's from ${result.clinic_name || "another clinic"}. To keep pricing accurate, we've set it aside from this batch — you can add it on that clinic's page whenever you'd like.`,
          );
        } else if (!result.line_items || result.line_items.length === 0) {
          status = "empty";
          notices.push(`We couldn't find prices on ${item.file.name}.`);
        } else {
          // Success — map each line item into an editable entry row.
          if (result.visit_date && !earliestDate)
            earliestDate = result.visit_date;
          for (const li of result.line_items) {
            newEntries.push({
              ...SUBMIT_EMPTY_ENTRY,
              service_name: li.raw_label,
              price_type: "exact",
              price_low: String(li.price),
              price_high: "",
              species: result.species || "",
              // carry extraction metadata so submit can tag these rows
              _source: "receipt_extraction",
              _service_id: li.service_id,
              _raw_label: li.raw_label,
              _classification: li.classification,
              _receiptFileId: item.id,
            });
          }
        }

        setReceiptFiles((prev) =>
          prev.map((x) => (x.id === item.id ? { ...x, status, result } : x)),
        );
      } catch (err) {
        setReceiptFiles((prev) =>
          prev.map((x) => (x.id === item.id ? { ...x, status: "failed" } : x)),
        );
        notices.push(`We couldn't read ${item.file.name}.`);
      }
    }

    // Populate the editable rows. Replace the empty starter row if it's untouched.
    if (newEntries.length > 0) {
      setEntries((prev) => {
        const hasRealRows = prev.some((e) => e.service_name || e.price_low);
        return hasRealRows ? [...prev, ...newEntries] : newEntries;
      });
      if (earliestDate && !visitDate) setVisitDate(earliestDate);
    }
    setExtractNotices(notices);
    setExtractionRan(true);
    setExtracting(false);
  }

  async function handleSubmit() {
    setErrorMsg("");
    if (!selectedVet && !addingNewVet) {
      setErrorMsg("Please pick a vet, or add a new one.");
      return;
    }
    if (!selectedVet && addingNewVet) {
      if (
        !newVet.name.trim() ||
        !newVet.city.trim() ||
        !newVet.zip_code.trim()
      ) {
        setFormStatus("error");
        setErrorMsg(
          "For a new vet, please include at least the name, city, and ZIP so we can verify it.",
        );
        return;
      }
    }
    const valid = entries.every(
      (e) =>
        (e.service_name === "__other__"
          ? e.service_other && e.service_other.trim()
          : e.service_name) && e.price_low,
    );
    if (!valid) {
      setFormStatus("error");
      setErrorMsg("Please select a service and enter a price for each entry.");
      return;
    }

    // Visit date is required and must be within the last 12 months. Older
    // prices no longer reflect current rates and would skew the range; an
    // undated price can't be age-checked or trusted. Applies to every path.
    if (!visitDate) {
      setFormStatus("error");
      setErrorMsg("Please add the visit date so we know the price is current.");
      return;
    }
    {
      const vd = new Date(visitDate);
      const now = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      if (!isNaN(vd.getTime())) {
        if (vd > now) {
          setFormStatus("error");
          setErrorMsg("The visit date can't be in the future.");
          return;
        }
        if (vd < oneYearAgo) {
          setFormStatus("error");
          setErrorMsg(
            "We can only accept prices from the past 12 months, since older prices may no longer be accurate. Please check the visit date.",
          );
          return;
        }
      }
    }

    setFormStatus("submitting");

    // ── Upload receipt(s) to Supabase Storage ──
    // Filename pattern: {user_id}/{timestamp}_{sanitized_name}
    // The user_id folder prefix is required by RLS policy.
    let receiptUrl = null; // single-receipt (manual proof) path
    const receiptUrlByFileId = {}; // upload-mode: per-source-file urls

    if (mode === "upload") {
      // Upload each receipt that produced at least one entry.
      const usedFileIds = new Set(
        entries.map((e) => e._receiptFileId).filter(Boolean),
      );
      for (const rf of receiptFiles) {
        if (!usedFileIds.has(rf.id)) continue;
        const safeName = rf.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = `${session.user.id}/${Date.now()}_${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(filePath, rf.file, { cacheControl: "3600", upsert: false });
        if (uploadError) {
          setErrorMsg(`Receipt upload failed: ${uploadError.message}`);
          setFormStatus("error");
          return;
        }
        receiptUrlByFileId[rf.id] = filePath;
      }
    } else if (submitFile) {
      const safeName = submitFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${session.user.id}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(filePath, submitFile, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        setErrorMsg(`Receipt upload failed: ${uploadError.message}`);
        setFormStatus("error");
        return;
      }
      receiptUrl = filePath;
    }

    // If the user is submitting for a vet not in our directory, create a
    // pending_vets row first; the admin "Pending Vets" tab reviews it and,
    // on approval, promotes it to a real vet and migrates these prices.
    let pendingVetId = null;
    const resolvedVetName = selectedVet?.name || newVet.name.trim();
    if (!selectedVet && addingNewVet) {
      const { data: pv, error: pvError } = await supabase
        .from("pending_vets")
        .insert({
          name: newVet.name.trim(),
          address: newVet.address.trim() || null,
          city: newVet.city.trim() || null,
          zip_code: newVet.zip_code.trim() || null,
          phone: newVet.phone.trim() || null,
          status: "pending",
          source: "user_submission",
        })
        .select()
        .single();
      if (pvError || !pv) {
        setErrorMsg(pvError?.message || "Could not save the new vet.");
        setFormStatus("error");
        return;
      }
      pendingVetId = pv.id;
    }

    // One batch id groups all receipt-extracted rows from this submission so
    // admins review them together.
    const receiptBatchId = entries.some(
      (e) => e._source === "receipt_extraction",
    )
      ? crypto.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`
      : null;

    const rows = entries.map((e) => {
      const isExtracted = e._source === "receipt_extraction";
      return {
        vet_id: selectedVet ? selectedVet.id : null,
        pending_vet_id: pendingVetId,
        vet_name: resolvedVetName,
        user_id: session.user.id,
        service_name:
          e.service_name === "__other__"
            ? e.service_other?.trim() || "Other"
            : e.service_name,
        price_type: e.price_type,
        price_low: parseFloat(e.price_low),
        price_high: e.price_high ? parseFloat(e.price_high) : null,
        species:
          e.species === "other"
            ? e.species_other || "other"
            : e.species || null,
        includes_bloodwork: e.includes_bloodwork,
        includes_xrays: e.includes_xrays,
        includes_anesthesia: e.includes_anesthesia,
        carecredit: e.carecredit || null,
        accepting_new_patients: e.accepting_new_patients || null,
        vaccines_included: e.vaccines_included || null,
        visit_date: visitDate || null,
        submitter_note: submitterNote || null,
        receipt_url: isExtracted
          ? receiptUrlByFileId[e._receiptFileId] || null
          : receiptUrl,
        // Phase D metadata — null/'manual' for typed rows
        source: isExtracted ? "receipt_extraction" : "manual",
        service_id: isExtracted ? (e._service_id ?? null) : null,
        raw_label: isExtracted ? e._raw_label || null : null,
        receipt_batch_id: isExtracted ? receiptBatchId : null,
        extraction_confidence: isExtracted
          ? e._classification === "mapped"
            ? "high"
            : e._classification === "product"
              ? "unmapped"
              : "medium"
          : null,
      };
    });
    const { error } = await supabase.from("price_submissions").insert(rows);
    if (error) {
      setErrorMsg(error.message || "Submission failed.");
      setFormStatus("error");
      return;
    }
    setFormStatus("success");
    showToast?.("Price submitted! Thank you for contributing.");
    onSubmitted?.();
  }

  function resetAndClose() {
    setEntries([{ ...SUBMIT_EMPTY_ENTRY }]);
    setVisitDate("");
    setSubmitterNote("");
    setSubmitFile(null);
    setMode("manual");
    setReceiptFiles([]);
    setExtracting(false);
    setExtractionRan(false);
    setExtractNotices([]);
    setFormStatus(null);
    setErrorMsg("");
    setSelectedVet(null);
    setVetSearch("");
    onClose();
  }
  function submitAnother() {
    setEntries([{ ...SUBMIT_EMPTY_ENTRY }]);
    setVisitDate("");
    setSubmitterNote("");
    setSubmitFile(null);
    setMode("manual");
    setReceiptFiles([]);
    setExtracting(false);
    setExtractionRan(false);
    setExtractNotices([]);
    setFormStatus(null);
    setErrorMsg("");
    // When the vet is locked (rendered on a vet's page), keep it selected —
    // there's no picker to re-choose it, and clearing it would leave the
    // submit button permanently disabled. Otherwise clear for a fresh pick.
    if (vetLocked) {
      setSelectedVet({ id: vetId, name: vetName });
    } else {
      setSelectedVet(null);
      setVetSearch("");
    }
  }

  return (
    <>
      <style>{`
        .isp-card {
          background: #fff;
          border: 1.5px solid ${C.terracotta};
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 4px 20px rgba(207,92,54,0.08);
          margin-top: 20px;
          margin-bottom: 12px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          position: relative;
        }
        .isp-head {
          padding-bottom: 16px;
          border-bottom: 1px solid ${C.border};
          margin-bottom: 20px;
          /*padding-right: 48px; */
        }
        .isp-head-eyebrow {
          margin: 30px 0 12px;
          font-size: 11px;
          font-weight: 700;
          color: ${C.terracotta};
          text-transform: uppercase; letter-spacing: 0.10em;
        }
        .isp-head h3 {
          margin: 0;
          font-size: 22px; font-weight: 800;
          color: ${C.navyDark};
          letter-spacing: -0.01em;
        }
        .isp-head-subtitle {
          margin: 10px 0 0;
          font-size: 15px; font-weight: 500;
          color: ${C.slate};
          line-height: 1.6;
          /* text-wrap: balance; */
          max-width: 100%;
        }
        .isp-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 36px; height: 36px;
          border: none; background: transparent;
          color: ${C.muted}; cursor: pointer;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, color 0.15s;
          z-index: 10;
        }
        .isp-close:hover { background: ${C.cream}; color: ${C.navyDark}; }

        .isp-section { margin-bottom: 20px; }
        .isp-section-num {
          font-size: 13px;
          font-weight: 800;
          color: ${C.muted};
          text-transform: uppercase; letter-spacing: 0.10em;
          margin: 0 0 10px;
        }

        /* Vet picker */
        .isp-vet-picker { position: relative; }
        .isp-vet-input-wrap { position: relative; display: flex; align-items: center; }
        .isp-vet-input {
          width: 100%;
          padding: 0 44px 0 14px;
          height: 44px;
          border: 1px solid ${C.border};
          border-radius: 12px;
          font-size: 15px;
          font-weight: 500;
          color: ${C.navyDark};
          background: #fff;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s;
        }
        .isp-vet-input:focus { border-color: ${C.terracotta}; }
        .isp-vet-clear {
          position: absolute; right: 8px; top: 50%;
          transform: translateY(-50%);
          width: 28px; height: 28px;
          border-radius: 50%;
          background: ${C.cream};
          border: none;
          color: ${C.muted};
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .isp-vet-clear:hover { background: ${C.terracotta}; color: #fff; }
        .isp-vet-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          left: 0; right: 0;
          background: #fff;
          border: 1px solid ${C.border};
          border-radius: 12px;
          box-shadow: 0 12px 32px rgba(23,37,49,0.15);
          max-height: 280px;
          overflow-y: auto;
          z-index: 30;
        }
        .isp-vet-result {
          padding: 12px 16px;
          cursor: pointer;
          border-bottom: 1px solid ${C.border};
          transition: background 0.15s;
        }
        .isp-vet-result:last-child { border-bottom: none; }
        .isp-vet-result:hover { background: ${C.cream}; }
        .isp-vet-result-name {
          margin: 0 0 2px;
          font-size: 15px; font-weight: 700;
          color: ${C.navyDark};
        }
        .isp-vet-result-meta {
          margin: 0;
          font-size: 14px; font-weight: 500;
          color: ${C.muted};
        }
        .isp-vet-no-results {
          padding: 16px; text-align: center;
          color: ${C.muted};
          font-size: 14px;
          font-style: italic;
        }
        .isp-selected-vet {
          background: ${C.successBg};
          border: 1.5px solid ${C.success};
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 15px; font-weight: 600;
          color: ${C.success};
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 10px;
          gap: 10px;
        }

        /* Entries — white card with subtle shadow for unified look */
        /* Locked vet pill — shown instead of the picker when the form is
           rendered on a vet's page (vetId/vetName supplied). */
        .isp-locked-vet {
          /* Fallbacks: not every caller's C token object defines successBg. */
          background: ${C.successBg || "#EDFAF3"};
          border: 1.5px solid ${C.success || "#1A6641"};
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 14px;
          font-weight: 600;
          color: ${C.success || "#1A6641"};
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .isp-entry {
          background: #fff;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid ${C.border};
          margin-bottom: 12px;
          box-shadow: 0 1px 3px rgba(23,37,49,0.04);
        }
        .isp-entry-head {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 14px;
        }
        .isp-entry-num {
          margin: 0;
          font-size: 11px;
          font-weight: 700;
          color: ${C.muted};
          text-transform: uppercase;
          letter-spacing: 0.10em;
        }
        .isp-entry-remove {
          background: none; border: none;
          font-size: 13px; font-weight: 700;
          color: ${C.error};
          cursor: pointer;
          padding: 0;
        }

        /* Field labels — ALL CAPS unified vocab */
        .isp-label {
          display: block;
          font-size: 14px;
          font-weight: 700;
          color: ${C.muted};
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.10em;
        }
        .isp-required { color: ${C.terracotta}; }

        /* Inputs / selects — unified site-wide vocab */
        .isp-input, .isp-select {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          border: 1px solid #DAD3C5;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 500;
          background: #fff;
          color: ${C.navyDark};
          outline: none;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          box-sizing: border-box;
          transition: border-color 0.15s;
          -webkit-appearance: none;
          appearance: none;
        }
        .isp-input:focus, .isp-select:focus { border-color: ${C.terracotta}; }
        textarea.isp-input { padding: 12px 14px; height: auto; min-height: 80px; resize: none; }
        .isp-select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23717A86' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 12px center;
          padding-right: 38px;
          cursor: pointer;
        }
        .isp-field { margin-bottom: 14px; }
        .isp-field-hint {
          margin: 4px 0 0;
          font-size: 13px;
          color: ${C.muted};
        }
        .isp-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .isp-grid-1 { display: grid; grid-template-columns: 1fr; gap: 12px; }

        /* Price type segmented control */
        .isp-seg-group { display: flex; gap: 8px; }
        .isp-seg-btn {
          flex: 1;
          padding: 10px 6px;
          border: 1.5px solid ${C.border};
          border-radius: 12px;
          background: #fff;
          color: ${C.slate};
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s;
          text-align: center;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .isp-seg-btn.active {
          background: ${C.terracotta};
          color: #fff;
          border-color: ${C.terracotta};
        }

        /* Includes pill toggles */
        .isp-pill-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .isp-pill {
          padding: 7px 14px;
          border-radius: 20px;
          font-size: 13px; 
          font-weight: 700;
          border: 1.5px solid ${C.border};
          background: #fff;
          cursor: pointer;
          transition: all 0.15s;
          color: ${C.slate};
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .isp-pill.active {
          background: ${C.navyDark};
          color: #fff;
          border-color: ${C.navyDark};
        }

        /* Add another service button */
        .isp-add-entry {
          width: 100%;
          padding: 13px;
          background: transparent;
          color: ${C.terracotta};
          border: 1.5px dashed ${C.terracotta};
          border-radius: 12px;
          font-size: 14px; 
          font-weight: 800;
          cursor: pointer;
          margin-bottom: 20px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: background 0.15s;
        }
        .isp-add-entry:hover { background: rgba(207,92,54,0.06); }

        /* Mode toggle */
        .isp-mode-toggle {
          display: flex; gap: 8px; margin-bottom: 4px;
        }
        .isp-mode-btn {
          flex: 1; height: 48px; padding: 0 16px;
          background: #fff; color: ${C.navyDark};
          border: 2px solid ${C.border}; border-radius: 12px;
          font-size: 15px; font-weight: 700; cursor: pointer;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: background 0.2s, color 0.2s, border-color 0.2s;
        }
        .isp-mode-btn:hover { border-color: ${C.terracotta}; }
        .isp-mode-btn.is-active {
          background: ${C.terracotta}; color: #fff; border-color: ${C.terracotta};
        }
        .isp-mode-hint {
          margin: 12px 0 0; font-size: 14px; font-weight: 500;
          color: ${C.slate}; line-height: 1.6;
        }
        /* Receipt drop + list (upload mode) */
        .isp-receipt-drop {
          border: 2px dashed ${C.border}; border-radius: 16px;
          padding: 28px 24px; text-align: center; color: ${C.muted};
          cursor: pointer; transition: border-color 0.2s, background 0.2s, color 0.2s;
        }
        .isp-receipt-drop.drag { border-color: ${C.terracotta}; background: ${C.cream}; color: ${C.terracotta}; }
        .isp-receipt-drop.full { opacity: 0.6; cursor: default; }
        .isp-receipt-drop-title { margin: 10px 0 4px; font-size: 15px; font-weight: 700; color: ${C.navyDark}; }
        .isp-receipt-drop-sub { margin: 0; font-size: 13px; font-weight: 500; color: ${C.muted}; }
        .isp-receipt-list { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; }
        .isp-receipt-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border: 1px solid ${C.border}; border-radius: 12px;
          background: #fff; color: ${C.muted};
        }
        .isp-receipt-name {
          flex: 1; min-width: 0; font-size: 14px; font-weight: 600; color: ${C.navyDark};
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .isp-receipt-status {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 12px; font-weight: 700; color: ${C.terracotta}; white-space: nowrap;
        }
        .isp-receipt-remove {
          background: none; border: none; cursor: pointer; color: ${C.muted};
          padding: 2px; display: flex; transition: color 0.15s;
        }
        .isp-receipt-remove:hover { color: ${C.navyDark}; }
        .isp-extract-btn {
          margin-top: 14px; width: 100%; height: 44px;
          background: ${C.terracotta}; color: #fff;
          border: 2px solid ${C.terracotta}; border-radius: 12px;
          font-size: 15px; font-weight: 700; cursor: pointer;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: background 0.2s, color 0.2s;
        }
        .isp-extract-btn:hover:not(:disabled) { background: #fff; color: ${C.terracotta}; }
        .isp-extract-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .isp-extract-notice {
          display: flex; align-items: flex-start; gap: 8px; margin: 0 0 10px;
          padding: 12px 14px; background: #FEF6E9; border: 1px solid #F5E0BC;
          border-radius: 12px; font-size: 13px; font-weight: 500;
          color: ${C.navyDark}; line-height: 1.5;
        }
        .isp-extract-notice svg { color: #8C6A11; flex-shrink: 0; margin-top: 2px; }
        :global(.isp-spin) { animation: isp-spin 1s linear infinite; }
        @keyframes isp-spin { to { transform: rotate(360deg); } }

        /* Upload zone */
        .isp-upload-zone {
          border: 2px dashed ${C.border};
          border-radius: 12px;
          padding: 28px 16px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          background: #fff;
        }
        .isp-upload-zone:hover, .isp-upload-zone.drag {
          border-color: ${C.terracotta};
          background: #fffaf8;
        }
        .isp-upload-zone.has-file {
          border-color: ${C.success};
          background: #f0faf4;
        }
        .isp-upload-icon { color: ${C.terracotta}; margin-bottom: 8px; }
        .isp-upload-name {
          margin: 0;
          font-size: 14px; font-weight: 700;
          color: ${C.navyDark};
          overflow-wrap: break-word;
          word-break: break-all;
        }
        .isp-upload-text {
          margin: 0 0 4px;
          font-size: 14px; font-weight: 600;
          color: ${C.slate};
        }
        .isp-upload-hint {
          margin: 0;
          font-size: 13px;
          font-weight: 500;
          color: ${C.muted};
        }
        .isp-before-upload {
          background: ${C.cream};
          border-radius: 8px;
          padding: 10px 14px;
          margin-top: 10px;
          border: 1px solid ${C.border};
        }
        .isp-before-upload p {
          margin: 0;
          font-size: 13px;
          font-weight: 500;
          color: ${C.navyDark};
          line-height: 1.6;
        }

        /* Submit button row */
        .isp-error-banner {
          background: #FCEAEA;
          color: ${C.error};
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 14px;
          margin-bottom: 16px;
          font-weight: 600;
        }
        .isp-submit-btn {
          padding: 0 24px;
          height: 42px;
          background: ${C.terracotta};
          color: #fff;
          border: 2px solid ${C.terracotta};
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          white-space: nowrap;
        }
        .isp-submit-btn:hover { background: #fff; color: ${C.terracotta}; }
        .isp-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .isp-final-row {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          align-items: center;
        }
        .isp-cancel-btn {
          padding: 0 24px;
          height: 42px;
          background: #fff;
          color: ${C.navyDark};
          border: 2px solid ${C.border};
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
        }
        .isp-cancel-btn:hover {
          background: ${C.navyDark};
          color: #fff;
          border-color: ${C.navyDark};
        }
        .isp-reviewed-note {
          font-size: 14px;
          font-weight: 500;
          color: ${C.muted};
          text-align: center;
          margin-top: 12px;
          line-height: 1.6;
        }

        /* Success state */
        .isp-success {
          padding: 32px 0px;
          text-align: center;
        }
        .isp-success h4 {
          margin: 0 0 8px;
          font-size: 22px; 
          font-weight: 800;
          color: ${C.navyDark};
        }
        .isp-success p {
          margin: 0 0 20px;
          font-size: 15px; 
          font-weight: 500;
          color: ${C.slate};
          line-height: 1.6;
          max-width: 420px;
          margin-left: auto;
          margin-right: auto;
        }
        .isp-success-actions {
          display: flex; gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .isp-btn-primary-inline {
          padding: 0 24px; 
          height: 42px;
          background: ${C.terracotta}; 
          color: #fff;
          border: 2px solid ${C.terracotta}; 
          border-radius: 12px;
          font-size: 15px; 
          font-weight: 700;
          cursor: pointer; 
          // line-height: 1;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          display: inline-flex; align-items: center; justify-content: center;
          transition: background 0.15s, color 0.15s;
        }
        .isp-btn-primary-inline:hover { background: #fff; color: ${C.terracotta}; }
        .isp-btn-secondary-inline {
          padding: 0 24px; 
          height: 42px;
          background: #fff; 
          color: ${C.navyDark};
          border: 2px solid ${C.border}; 
          border-radius: 12px;
          font-size: 15px; 
          font-weight: 600;
          cursor: pointer; 
          // line-height: 1;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          display: inline-flex; 
          align-items: center; 
          justify-content: center;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .isp-btn-secondary-inline:hover {
          background: ${C.navyDark}; color: #fff; border-color: ${C.navyDark};
        }

        @media (max-width: 768px) {
          .isp-card { padding: 20px; }
          .isp-grid-2 { grid-template-columns: 1fr; }
          .isp-entry { padding: 16px; }
          .isp-final-row { flex-direction: column-reverse; }
          .isp-final-row .isp-submit-btn,
          .isp-final-row .isp-cancel-btn { width: 100%; }
          /* Success confirmation buttons stack full-width to match the
             main form's action row. Uses column (not column-reverse) because
             the primary action already comes first in the DOM here. */
          .isp-success-actions { flex-direction: column; }
          .isp-success-actions .isp-btn-primary-inline,
          .isp-success-actions .isp-btn-secondary-inline { width: 100%; }
          .isp-pill {
            padding: 7px 11px;
            font-size: 13px;
          }
        }
      `}</style>

      <div className="isp-card">
        {formStatus === "success" ? (
          <div className="isp-success">
            <h4>Thanks for contributing!</h4>
            <p>
              Your submission is now pending review. Once our team verifies it,
              it'll appear on the vet's page and count toward your community
              contributions.
            </p>
            <div className="isp-success-actions">
              <button
                onClick={submitAnother}
                className="isp-btn-primary-inline"
              >
                Submit another
              </button>
              <button
                onClick={resetAndClose}
                className="isp-btn-secondary-inline"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Close button — absolute top-right of card */}
            <button
              className="isp-close"
              onClick={resetAndClose}
              aria-label="Close form"
              type="button"
            >
              <X size={22} strokeWidth={2.2} />
            </button>

            {/* Header */}
            <div className="isp-head">
              <p className="isp-head-eyebrow">Community contribution</p>
              <h3>Submit a vet price</h3>
              <p className="isp-head-subtitle">
                Help other pet parents find honest pricing. Pick a vet, tell us
                what you paid, and we'll review and add it to their listing.
              </p>
            </div>

            {/* Vet is context on a vet page: show it locked instead of the
                picker. Seeded into `selectedVet`, so validation + submit are
                unchanged. */}
            {vetLocked ? (
              <div className="isp-section">
                <div className="isp-locked-vet">
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Check size={16} strokeWidth={2.6} />
                    <strong>{vetName}</strong>
                  </span>
                </div>
              </div>
            ) : (
              <>
                {/* Vet picker */}
                <div className="isp-section">
                  <p className="isp-section-num">1. Which vet?</p>
                  <div className="isp-vet-picker" ref={dropdownRef}>
                    <div className="isp-vet-input-wrap">
                      <input
                        className="isp-vet-input"
                        type="text"
                        value={vetSearch}
                        onChange={(e) => {
                          setVetSearch(e.target.value);
                          setSelectedVet(null);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Search by vet name, city, or address..."
                      />
                      {vetSearch && (
                        <button
                          type="button"
                          onClick={clearVet}
                          className="isp-vet-clear"
                          aria-label="Clear vet"
                        >
                          <X size={14} strokeWidth={2.4} />
                        </button>
                      )}
                    </div>

                    {showDropdown && vetSearch.trim() && (
                      <div className="isp-vet-dropdown">
                        {filteredVets.length === 0 ? (
                          <div
                            className="isp-vet-result"
                            onClick={() => {
                              setNewVet({
                                name: vetSearch.trim(),
                                address: "",
                                city: "",
                                zip_code: "",
                                phone: "",
                              });
                              setAddingNewVet(true);
                              setSelectedVet(null);
                              setShowDropdown(false);
                            }}
                            style={{ cursor: "pointer" }}
                          >
                            <p className="isp-vet-result-name">
                              + Add "{vetSearch.trim()}" as a new vet
                            </p>
                            <p className="isp-vet-result-meta">
                              Not in our directory yet — we'll review it
                            </p>
                          </div>
                        ) : (
                          filteredVets.map((vet) => (
                            <div
                              key={vet.id}
                              className="isp-vet-result"
                              onClick={() => pickVet(vet)}
                            >
                              <p className="isp-vet-result-name">{vet.name}</p>
                              {(vet.city || vet.state) && (
                                <p className="isp-vet-result-meta">
                                  {[vet.city, vet.state]
                                    .filter(Boolean)
                                    .join(", ")}
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {selectedVet && (
                    <div className="isp-selected-vet">
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <Check size={14} strokeWidth={2.6} />
                        <strong>{selectedVet.name}</strong>
                      </span>
                    </div>
                  )}

                  {addingNewVet && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "16px",
                        border: `1.5px solid ${C.border}`,
                        borderRadius: "12px",
                        background: C.cream,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "12px",
                        }}
                      >
                        <strong style={{ color: C.navyDark, fontSize: "15px" }}>
                          New vet details
                        </strong>
                        <button
                          type="button"
                          data-close-newvet
                          onClick={() => {
                            setAddingNewVet(false);
                            setNewVet({
                              name: "",
                              address: "",
                              city: "",
                              zip_code: "",
                              phone: "",
                            });
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: C.muted,
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: 600,
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                      {likelyDuplicate && (
                        <div
                          style={{
                            marginBottom: "12px",
                            padding: "10px 12px",
                            borderRadius: "10px",
                            background: "rgba(207,92,54,0.08)",
                            border: `1px solid rgba(207,92,54,0.35)`,
                            fontSize: "13px",
                            color: C.navyDark,
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>
                            Did you mean {likelyDuplicate.name}?
                          </span>{" "}
                          It's already in our directory.{" "}
                          <button
                            type="button"
                            onClick={() => {
                              pickVet(likelyDuplicate);
                              setAddingNewVet(false);
                              setNewVet({
                                name: "",
                                address: "",
                                city: "",
                                zip_code: "",
                                phone: "",
                              });
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              color: C.terracotta,
                              fontWeight: 700,
                              cursor: "pointer",
                              textDecoration: "underline",
                              fontSize: "13px",
                            }}
                          >
                            Use this vet instead
                          </button>
                        </div>
                      )}
                      <input
                        className="isp-vet-input"
                        value={newVet.name}
                        onChange={(e) =>
                          setNewVet({ ...newVet, name: e.target.value })
                        }
                        placeholder="Vet name *"
                        style={{ marginBottom: "8px" }}
                      />
                      <input
                        className="isp-vet-input"
                        value={newVet.address}
                        onChange={(e) =>
                          setNewVet({ ...newVet, address: e.target.value })
                        }
                        placeholder="Address"
                        style={{ marginBottom: "8px" }}
                      />
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          marginBottom: "8px",
                        }}
                      >
                        <input
                          className="isp-vet-input"
                          value={newVet.city}
                          onChange={(e) =>
                            setNewVet({ ...newVet, city: e.target.value })
                          }
                          placeholder="City *"
                        />
                        <input
                          className="isp-vet-input"
                          value={newVet.zip_code}
                          onChange={(e) =>
                            setNewVet({
                              ...newVet,
                              zip_code: e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 5),
                            })
                          }
                          placeholder="ZIP *"
                          style={{ maxWidth: "120px" }}
                        />
                      </div>
                      <input
                        className="isp-vet-input"
                        value={newVet.phone}
                        onChange={(e) =>
                          setNewVet({ ...newVet, phone: e.target.value })
                        }
                        placeholder="Phone"
                      />
                    </div>
                  )}
                </div>

                {/* Service entries */}
              </>
            )}

            {/* ── Contribution mode toggle ── */}
            <div className="isp-section">
              <p className="isp-section-num">
                {vetLocked ? "1" : "2"}. How would you like to add prices?
              </p>
              <div className="isp-mode-toggle">
                <button
                  type="button"
                  className={`isp-mode-btn ${mode === "manual" ? "is-active" : ""}`}
                  onClick={() => setMode("manual")}
                >
                  Enter them myself
                </button>
                <button
                  type="button"
                  className={`isp-mode-btn ${mode === "upload" ? "is-active" : ""}`}
                  onClick={() => setMode("upload")}
                >
                  Upload receipts
                </button>
              </div>
              {mode === "upload" && (
                <p className="isp-mode-hint">
                  Drop up to 5 receipts from the past year and we'll read the
                  prices for you. You can review and adjust everything before
                  submitting.
                </p>
              )}
            </div>

            {/* ── Upload panel (upload mode, before extraction) ── */}
            {mode === "upload" && !extractionRan && (
              <div className="isp-section">
                <div
                  className={`isp-receipt-drop ${isDragging ? "drag" : ""} ${receiptFiles.length >= MAX_RECEIPTS ? "full" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (receiptFiles.length < MAX_RECEIPTS) setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (receiptFiles.length < MAX_RECEIPTS)
                      addReceipts(e.dataTransfer.files);
                  }}
                  onClick={() => {
                    if (receiptFiles.length < MAX_RECEIPTS)
                      receiptInputRef.current?.click();
                  }}
                >
                  <Upload
                    size={24}
                    strokeWidth={2}
                    className="isp-upload-icon"
                  />
                  <p className="isp-receipt-drop-title">
                    {receiptFiles.length >= MAX_RECEIPTS
                      ? "Maximum of 5 receipts reached"
                      : "Drop receipts here, or click to browse"}
                  </p>
                  <p className="isp-receipt-drop-sub">
                    Up to 5 · JPG, PNG, or PDF · past 12 months
                  </p>
                  <input
                    ref={receiptInputRef}
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    multiple
                    style={{ display: "none" }}
                    onChange={(e) => {
                      addReceipts(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>

                {receiptFiles.length > 0 && (
                  <div className="isp-receipt-list">
                    {receiptFiles.map((rf) => (
                      <div key={rf.id} className="isp-receipt-row">
                        <FileText size={16} strokeWidth={2} />
                        <span className="isp-receipt-name">{rf.file.name}</span>
                        {rf.status === "processing" ? (
                          <span className="isp-receipt-status">
                            <Loader2
                              size={13}
                              strokeWidth={2.4}
                              className="isp-spin"
                            />
                            Reading…
                          </span>
                        ) : !extracting ? (
                          <button
                            type="button"
                            className="isp-receipt-remove"
                            onClick={() => removeReceipt(rf.id)}
                            aria-label="Remove"
                          >
                            <X size={15} strokeWidth={2.2} />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}

                {receiptFiles.length > 0 && (
                  <button
                    type="button"
                    className="isp-extract-btn"
                    onClick={runExtraction}
                    disabled={extracting || !selectedVet}
                  >
                    {extracting
                      ? "Reading receipts…"
                      : !selectedVet
                        ? "Choose a vet first"
                        : `Read ${receiptFiles.length} ${receiptFiles.length === 1 ? "receipt" : "receipts"}`}
                  </button>
                )}
              </div>
            )}

            {/* ── Notices from extraction (skipped / mismatched / too old) ── */}
            {extractNotices.length > 0 && (
              <div className="isp-section">
                {extractNotices.map((n, i) => (
                  <p key={i} className="isp-extract-notice">
                    <AlertTriangle size={15} strokeWidth={2.2} />
                    <span>{n}</span>
                  </p>
                ))}
              </div>
            )}

            {/* Entries — shown for manual mode always, and for upload mode
                once extraction has produced rows to review. */}
            {(mode === "manual" || extractionRan) && (
              <div className="isp-section">
                <p className="isp-section-num">
                  {vetLocked ? "2" : "3"}.{" "}
                  {mode === "upload"
                    ? "Review what we found"
                    : "What did you pay?"}
                </p>
                {entries.map((entry, idx) => (
                  <div key={idx} className="isp-entry">
                    <div className="isp-entry-head">
                      <p className="isp-entry-num">Service {idx + 1}</p>
                      {entries.length > 1 && (
                        <button
                          type="button"
                          className="isp-entry-remove"
                          onClick={() => removeEntry(idx)}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Service dropdown — categorized via optgroup */}
                    <div className="isp-field">
                      <label className="isp-label">
                        Service <span className="isp-required">*</span>
                      </label>
                      <select
                        className="isp-select"
                        value={entry.service_name}
                        onChange={(e) =>
                          updateEntry(idx, "service_name", e.target.value)
                        }
                      >
                        <option value="">— Select —</option>
                        <optgroup label="Exam">
                          <option>Annual Wellness Exam</option>
                          <option>Doctor Exam</option>
                          <option>Vet Tech Exam</option>
                        </optgroup>
                        <optgroup label="Vaccine">
                          <option>Bordetella Vaccine</option>
                          <option>Canine Influenza Vaccine</option>
                          <option>DHPP Vaccine</option>
                          <option>FeLV Vaccine</option>
                          <option>FVRCP Vaccine</option>
                          <option>Leptospirosis Vaccine</option>
                          <option>Rabies Vaccine</option>
                          <option>Vaccine Package — Cat</option>
                          <option>Vaccine Package — Dog</option>
                        </optgroup>
                        <optgroup label="Dental">
                          <option>Dental Cleaning</option>
                          <option>Dental Cleaning (No Anesthesia)</option>
                        </optgroup>
                        <optgroup label="Surgery">
                          <option>Spay</option>
                          <option>Neuter</option>
                        </optgroup>
                        <optgroup label="Diagnostics">
                          <option>Bloodwork</option>
                          <option>X-Ray</option>
                          <option>Ultrasound</option>
                          <option>Urinalysis</option>
                          <option>Fecal Test</option>
                        </optgroup>
                        <optgroup label="Preventive">
                          <option>Flea & Tick Treatment</option>
                          <option>Heartworm Test</option>
                          <option>Heartworm Prevention</option>
                          <option>Microchipping</option>
                          <option>Nail Trim</option>
                        </optgroup>
                        <optgroup label="Visit">
                          <option>Emergency Visit</option>
                          <option>Urgent Care Visit</option>
                        </optgroup>
                        <optgroup label="Treatment">
                          <option>Ear Infection Treatment</option>
                          <option>Eye Treatment</option>
                          <option>Skin / Allergy Treatment</option>
                          <option>Wound Treatment</option>
                          <option>Dental Extraction</option>
                        </optgroup>
                        <optgroup label="Other">
                          <option value="__other__">Other (type it in)</option>
                        </optgroup>
                      </select>
                    </div>

                    {/* Free-text service name when "Other" is chosen */}
                    {entry.service_name === "__other__" && (
                      <div className="isp-field">
                        <label className="isp-label">
                          What service was it?
                        </label>
                        <input
                          className="isp-input"
                          type="text"
                          value={entry.service_other || ""}
                          onChange={(e) =>
                            updateEntry(idx, "service_other", e.target.value)
                          }
                          placeholder="e.g. Allergy injection, senior blood panel…"
                        />
                      </div>
                    )}

                    {/* Vaccines included — only when service is a vaccine package */}
                    {isVaccinePackage(entry.service_name) && (
                      <div className="isp-field">
                        <label className="isp-label">Vaccines Included</label>
                        <input
                          type="text"
                          className="isp-input"
                          value={entry.vaccines_included || ""}
                          onChange={(e) =>
                            updateEntry(
                              idx,
                              "vaccines_included",
                              e.target.value,
                            )
                          }
                          placeholder="e.g. Rabies, DHPP, Bordetella…"
                        />
                        <p className="isp-field-hint">
                          This will display publicly on the vet profile.
                        </p>
                      </div>
                    )}

                    {/* Price type segmented control */}
                    <div className="isp-field">
                      <label className="isp-label">
                        Price Type <span className="isp-required">*</span>
                      </label>
                      <div className="isp-seg-group">
                        {["exact", "range", "starting"].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => updateEntry(idx, "price_type", type)}
                            className={`isp-seg-btn${entry.price_type === type ? " active" : ""}`}
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Price input(s) */}
                    <div
                      className={
                        entry.price_type === "range"
                          ? "isp-grid-2"
                          : "isp-grid-1"
                      }
                      style={{ marginBottom: "14px" }}
                    >
                      <div>
                        <label className="isp-label">
                          {entry.price_type === "range"
                            ? "Price Low ($)"
                            : "Price ($)"}{" "}
                          <span className="isp-required">*</span>
                        </label>
                        <input
                          type="number"
                          className="isp-input"
                          placeholder="e.g. 85"
                          value={entry.price_low}
                          onChange={(e) =>
                            updateEntry(idx, "price_low", e.target.value)
                          }
                        />
                      </div>
                      {entry.price_type === "range" && (
                        <div>
                          <label className="isp-label">
                            Price High ($){" "}
                            <span className="isp-required">*</span>
                          </label>
                          <input
                            type="number"
                            className="isp-input"
                            placeholder="e.g. 200"
                            value={entry.price_high}
                            onChange={(e) =>
                              updateEntry(idx, "price_high", e.target.value)
                            }
                          />
                        </div>
                      )}
                    </div>

                    {/* Species dropdown */}
                    <div className="isp-field">
                      <label className="isp-label">Species</label>
                      <select
                        className="isp-select"
                        value={entry.species}
                        onChange={(e) =>
                          updateEntry(idx, "species", e.target.value)
                        }
                      >
                        <option value="">— Select —</option>
                        <option value="dog">Dog</option>
                        <option value="cat">Cat</option>
                        <option value="rabbit">Rabbit</option>
                        <option value="bird">Bird</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    {entry.species === "other" && (
                      <div className="isp-field">
                        <input
                          type="text"
                          className="isp-input"
                          value={entry.species_other || ""}
                          onChange={(e) =>
                            updateEntry(idx, "species_other", e.target.value)
                          }
                          placeholder="e.g. Guinea pig, hedgehog…"
                        />
                      </div>
                    )}

                    {/* Includes pill toggles */}
                    <div className="isp-field">
                      <label className="isp-label">Includes</label>
                      <div className="isp-pill-row">
                        {[
                          { key: "includes_bloodwork", label: "Bloodwork" },
                          { key: "includes_xrays", label: "X-Rays" },
                          { key: "includes_anesthesia", label: "Anesthesia" },
                        ].map(({ key, label }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => updateEntry(idx, key, !entry[key])}
                            className={`isp-pill${entry[key] ? " active" : ""}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* CareCredit + Accepting new patients side-by-side */}
                    <div className="isp-grid-2">
                      <div>
                        <label className="isp-label">CareCredit</label>
                        <select
                          className="isp-select"
                          value={entry.carecredit}
                          onChange={(e) =>
                            updateEntry(idx, "carecredit", e.target.value)
                          }
                        >
                          <option value="">— Select —</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                      <div>
                        <label className="isp-label">
                          Accepting New Patients
                        </label>
                        <select
                          className="isp-select"
                          value={entry.accepting_new_patients}
                          onChange={(e) =>
                            updateEntry(
                              idx,
                              "accepting_new_patients",
                              e.target.value,
                            )
                          }
                        >
                          <option value="">— Select —</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="isp-add-entry"
                  onClick={addEntry}
                >
                  + Add another service
                </button>
              </div>
            )}

            {/* Section 3: Visit details */}
            <div className="isp-section">
              <p className="isp-section-num">
                {vetLocked ? "2" : "3"}. Visit details
              </p>

              <div className="isp-field">
                <label className="isp-label">
                  Date of Visit <span style={{ color: C.terracotta }}>*</span>
                </label>
                <input
                  type="date"
                  className="isp-input"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  min={
                    new Date(
                      new Date().setFullYear(new Date().getFullYear() - 1),
                    )
                      .toISOString()
                      .split("T")[0]
                  }
                  style={{ textAlign: "left" }}
                />
              </div>

              <div className="isp-field">
                <label className="isp-label">Notes</label>
                <AutoGrowTextarea
                  className="isp-input"
                  value={submitterNote}
                  onChange={(e) => setSubmitterNote(e.target.value)}
                  placeholder="Anything else that would help others?"
                  rows={3}
                  minHeight="80px"
                />
              </div>

              {/* Receipt upload — with inline privacy guidance.
                  Only in manual mode; upload mode already has the receipts. */}
              {mode === "manual" && (
                <div className="isp-field" style={{ marginBottom: "20px" }}>
                  <label className="isp-label">
                    Receipt or Invoice{" "}
                    <span
                      style={{
                        fontWeight: 500,
                        color: C.muted,
                        textTransform: "none",
                        letterSpacing: "0",
                      }}
                    >
                      (optional · JPG, PNG, PDF · max 5MB)
                    </span>
                  </label>
                  <div
                    className={`isp-upload-zone${submitFile ? " has-file" : isDragging ? " drag" : ""}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) validateAndSetFile(f);
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        if (e.target.files?.[0])
                          validateAndSetFile(e.target.files[0]);
                      }}
                    />
                    {submitFile ? (
                      <>
                        <div className="isp-upload-icon">
                          <Upload size={28} strokeWidth={1.8} />
                        </div>
                        <p className="isp-upload-name">{submitFile.name}</p>
                        <p
                          className="isp-upload-hint"
                          style={{ marginTop: "4px" }}
                        >
                          Tap to change.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="isp-upload-icon">
                          <Upload size={28} strokeWidth={1.8} />
                        </div>
                        <p className="isp-upload-text">
                          Drag and drop, or tap to upload.
                        </p>
                        <p className="isp-upload-hint">
                          JPG, PNG, or PDF — max 5MB.
                        </p>
                      </>
                    )}
                  </div>
                  <div className="isp-before-upload">
                    <p>
                      <strong>Privacy first:</strong> Remove or black out any
                      account numbers, card numbers, or billing details. We only
                      use the service name and price.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {formStatus === "error" && errorMsg && (
              <div className="isp-error-banner">{errorMsg}</div>
            )}

            <div className="isp-final-row">
              <button
                type="button"
                className="isp-cancel-btn"
                onClick={resetAndClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="isp-submit-btn"
                onClick={handleSubmit}
                disabled={
                  formStatus === "submitting" ||
                  (!selectedVet &&
                    !(
                      addingNewVet &&
                      newVet.name.trim() &&
                      newVet.city.trim() &&
                      newVet.zip_code.trim()
                    ))
                }
              >
                {formStatus === "submitting"
                  ? "Submitting..."
                  : `Submit ${entries.length > 1 ? `${entries.length} Prices` : "Price"}`}
              </button>
            </div>

            <p className="isp-reviewed-note">
              All submissions are reviewed before going live.
            </p>
          </>
        )}
      </div>
    </>
  );
}
