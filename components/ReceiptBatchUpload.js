// components/ReceiptBatchUpload.js
//
// Track 3 Phase D — Multi-receipt price contribution.
//
// Flow: drop up to 5 files → each is extracted sequentially (Claude vision) →
// per-file status shown → clinic verified against this vet page → user sees a
// non-editable summary → submit. All rows share a receipt_batch_id per file so
// admins review each receipt as a unit.
//
// Placement: the vet slug page, so the expected clinic is known and each
// receipt's clinic can be verified against it.

"use client";
import { useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { extractReceiptPrices, submitReceiptBatch } from "../lib/copilotApi";
import {
  Upload,
  FileText,
  X,
  Check,
  AlertTriangle,
  Loader2,
} from "lucide-react";

const MAX_FILES = 5;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB, matches the receipts bucket
const ACCEPT = ["image/jpeg", "image/png", "application/pdf"];
const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

const C = {
  navyDark: "#172531",
  terracotta: "#CF5C36",
  cream: "#F5F0E8",
  slate: "#4B5563",
  muted: "#717A86",
  border: "#EDE8E0",
  success: "#1A6641",
  successBg: "#EDFAF3",
  error: "#C94040",
  errorBg: "#FCEAEA",
  warnBg: "#FEF6E9",
  warn: "#8C6A11",
};

export default function ReceiptBatchUpload({ vet, onDone }) {
  const [files, setFiles] = useState([]); // { id, file, status, result, error }
  const [phase, setPhase] = useState("select"); // select | processing | review | submitting | done
  const [dragOver, setDragOver] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submittedCount, setSubmittedCount] = useState(0);
  const inputRef = useRef(null);

  function addFiles(fileList) {
    setSubmitError(null);
    const incoming = Array.from(fileList);
    const room = MAX_FILES - files.length;

    const accepted = [];
    let rejectedMsg = null;

    for (const file of incoming) {
      if (accepted.length >= room) {
        rejectedMsg = `You can upload up to ${MAX_FILES} at a time. Any extra can go in a second batch.`;
        break;
      }
      if (!ACCEPT.includes(file.type)) {
        rejectedMsg = "Please upload JPG, PNG, or PDF files only.";
        continue;
      }
      if (file.size > MAX_SIZE) {
        rejectedMsg = `${file.name} is larger than 5MB. Please upload a smaller file.`;
        continue;
      }
      accepted.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        status: "queued",
        result: null,
        error: null,
      });
    }

    if (accepted.length > 0) setFiles((f) => [...f, ...accepted]);
    if (rejectedMsg) setSubmitError(rejectedMsg);
  }

  function removeFile(id) {
    setFiles((f) => f.filter((x) => x.id !== id));
  }

  async function processAll() {
    setPhase("processing");
    setSubmitError(null);

    // Sequential — better progress UX, and one bad file doesn't kill the batch.
    for (const item of files) {
      setFiles((prev) =>
        prev.map((x) =>
          x.id === item.id ? { ...x, status: "processing" } : x,
        ),
      );
      try {
        const base64 = await fileToBase64(item.file);
        const result = await extractReceiptPrices({
          documentBase64: base64,
          documentMediaType: item.file.type,
          expectedVet: { id: vet.id, name: vet.name },
        });

        let status = "done";
        if (result.error) status = "failed";
        else if (result.rejected === "too_old") status = "too_old";
        else if (result.clinic_match === "mismatch") status = "mismatch";
        else if (!result.line_items || result.line_items.length === 0)
          status = "empty";

        setFiles((prev) =>
          prev.map((x) =>
            x.id === item.id
              ? { ...x, status, result, error: result.error || null }
              : x,
          ),
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((x) =>
            x.id === item.id
              ? { ...x, status: "failed", error: err.message }
              : x,
          ),
        );
      }
    }
    setPhase("review");
  }

  // Files that will actually be submitted: extracted cleanly, clinic matches
  // (or was unknown), has line items, not too old.
  function submittableFiles() {
    return files.filter(
      (f) =>
        f.status === "done" &&
        f.result &&
        f.result.line_items &&
        f.result.line_items.length > 0,
    );
  }

  async function submit() {
    const toSubmit = submittableFiles();
    if (toSubmit.length === 0) {
      setSubmitError("There's nothing to submit from this batch.");
      return;
    }
    setPhase("submitting");
    setSubmitError(null);

    try {
      // Upload each receipt image to storage, then submit the batch.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Please sign in again.");

      const receipts = [];
      for (const f of toSubmit) {
        const path = `${session.user.id}/${Date.now()}_${sanitize(f.file.name)}`;
        const { error: upErr } = await supabase.storage
          .from("receipts")
          .upload(path, f.file, { upsert: false });
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

        receipts.push({
          receiptUrl: path,
          clinicName: f.result.clinic_name,
          visitDate: f.result.visit_date,
          species: f.result.species,
          lineItems: f.result.line_items,
        });
      }

      const { inserted } = await submitReceiptBatch({ vet, receipts });
      setSubmittedCount(inserted);
      setPhase("done");
      if (onDone) onDone(inserted);
    } catch (err) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
      setPhase("review");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === "done") {
    return (
      <div className="rbu-done">
        <div className="rbu-done-icon">
          <Check size={24} strokeWidth={2.5} />
        </div>
        <h4 className="rbu-done-title">Thank you for contributing!</h4>
        <p className="rbu-done-text">
          {submittedCount} price {submittedCount === 1 ? "item" : "items"} from
          your {submittableFiles().length === 1 ? "receipt" : "receipts"} are
          now pending review. Once our team verifies them, they'll help keep{" "}
          {vet.name}'s pricing accurate for the community.
        </p>
        <button
          className="rbu-btn-secondary"
          onClick={() => {
            setFiles([]);
            setPhase("select");
            setSubmittedCount(0);
          }}
        >
          Upload more
        </button>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="rbu-wrap">
      {(phase === "select" || phase === "processing") && (
        <>
          <div
            className={`rbu-drop ${dragOver ? "is-over" : ""} ${files.length >= MAX_FILES ? "is-full" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (files.length < MAX_FILES) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (phase === "select" && files.length < MAX_FILES)
                addFiles(e.dataTransfer.files);
            }}
            onClick={() => {
              if (phase === "select" && files.length < MAX_FILES)
                inputRef.current?.click();
            }}
            role="button"
            tabIndex={0}
          >
            <Upload size={26} strokeWidth={2} />
            <p className="rbu-drop-title">
              {files.length >= MAX_FILES
                ? "Maximum of 5 receipts reached"
                : "Drop receipts here, or click to browse"}
            </p>
            <p className="rbu-drop-sub">
              Up to {MAX_FILES} at once · JPG, PNG, or PDF · from the past 12
              months
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {files.length > 0 && (
            <div className="rbu-list">
              {files.map((f) => (
                <FileRow
                  key={f.id}
                  item={f}
                  vet={vet}
                  canRemove={phase === "select"}
                  onRemove={() => removeFile(f.id)}
                />
              ))}
            </div>
          )}

          {submitError && <p className="rbu-error-msg">{submitError}</p>}

          {phase === "select" && files.length > 0 && (
            <div className="rbu-actions">
              <button className="rbu-btn-primary" onClick={processAll}>
                Read {files.length}{" "}
                {files.length === 1 ? "receipt" : "receipts"}
              </button>
            </div>
          )}

          {phase === "processing" && (
            <p className="rbu-processing-note">
              Reading your receipts — this takes a few seconds each…
            </p>
          )}
        </>
      )}

      {(phase === "review" || phase === "submitting") && (
        <ReviewSummary
          files={files}
          vet={vet}
          submittable={submittableFiles()}
          submitting={phase === "submitting"}
          error={submitError}
          onBack={() => {
            setFiles([]);
            setPhase("select");
            setSubmitError(null);
          }}
          onSubmit={submit}
        />
      )}

      <style jsx>{styles}</style>
    </div>
  );
}

// ── Per-file row in the staged list ─────────────────────────────────────────
function FileRow({ item, vet, canRemove, onRemove }) {
  const { file, status, result } = item;
  const sizeKb = Math.round(file.size / 1024);

  const statusEl = {
    queued: <span className="rbu-status rbu-status-queued">Queued</span>,
    processing: (
      <span className="rbu-status rbu-status-processing">
        <Loader2 size={13} strokeWidth={2.4} className="rbu-spin" />
        Reading…
      </span>
    ),
    done: (
      <span className="rbu-status rbu-status-done">
        <Check size={13} strokeWidth={2.6} />
        {result?.line_items?.length || 0} found
      </span>
    ),
    mismatch: (
      <span className="rbu-status rbu-status-warn">
        <AlertTriangle size={13} strokeWidth={2.4} />
        Different clinic
      </span>
    ),
    too_old: (
      <span className="rbu-status rbu-status-warn">
        <AlertTriangle size={13} strokeWidth={2.4} />
        Over a year old
      </span>
    ),
    empty: <span className="rbu-status rbu-status-warn">No prices found</span>,
    failed: (
      <span className="rbu-status rbu-status-error">
        <X size={13} strokeWidth={2.4} />
        Couldn't read
      </span>
    ),
  }[status];

  return (
    <div className="rbu-file">
      <FileText size={18} strokeWidth={2} className="rbu-file-icon" />
      <div className="rbu-file-body">
        <p className="rbu-file-name">{file.name}</p>
        <p className="rbu-file-meta">{sizeKb} KB</p>
      </div>
      {statusEl}
      {canRemove && (
        <button
          className="rbu-file-remove"
          onClick={onRemove}
          aria-label="Remove"
        >
          <X size={16} strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}

// ── Non-editable review summary before submit ───────────────────────────────
function ReviewSummary({
  files,
  vet,
  submittable,
  submitting,
  error,
  onBack,
  onSubmit,
}) {
  const totalItems = submittable.reduce(
    (n, f) => n + (f.result?.line_items?.length || 0),
    0,
  );
  const skipped = files.filter(
    (f) => f.status === "mismatch" || f.status === "too_old",
  );

  return (
    <div className="rbu-review">
      <h4 className="rbu-review-title">Here's what we found</h4>

      {submittable.length > 0 ? (
        <div className="rbu-review-list">
          {submittable.map((f) => (
            <div key={f.id} className="rbu-review-receipt">
              <div className="rbu-review-receipt-head">
                <span className="rbu-review-receipt-name">
                  {f.result.clinic_name || vet.name}
                </span>
                {f.result.visit_date && (
                  <span className="rbu-review-receipt-date">
                    {formatDate(f.result.visit_date)}
                  </span>
                )}
              </div>
              <ul className="rbu-review-items">
                {f.result.line_items.map((li, i) => (
                  <li key={i} className="rbu-review-item">
                    <span className="rbu-review-item-label">
                      {li.raw_label}
                      {li.classification !== "mapped" && (
                        <span className="rbu-review-item-tag">
                          {li.classification === "product"
                            ? "product"
                            : "new service"}
                        </span>
                      )}
                    </span>
                    <span className="rbu-review-item-price">${li.price}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="rbu-review-empty">
          We couldn't pull any submittable prices from these files.
        </p>
      )}

      {skipped.length > 0 && (
        <div className="rbu-skipped">
          {skipped.map((f) => (
            <p key={f.id} className="rbu-skipped-line">
              {f.status === "mismatch" ? (
                <>
                  <strong>{f.file.name}</strong> looks like it's from{" "}
                  <strong>{f.result?.clinic_name || "another clinic"}</strong>.
                  To keep pricing accurate, we've set it aside from this batch.
                  You can add it on that clinic's page whenever you'd like.
                </>
              ) : (
                <>
                  <strong>{f.file.name}</strong> is more than a year old, so
                  we've set it aside — we keep pricing current by only accepting
                  receipts from the past 12 months.
                </>
              )}
            </p>
          ))}
        </div>
      )}

      {error && <p className="rbu-error-msg">{error}</p>}

      <div className="rbu-actions">
        <button
          className="rbu-btn-secondary"
          onClick={onBack}
          disabled={submitting}
        >
          Start over
        </button>
        {submittable.length > 0 && (
          <button
            className="rbu-btn-primary"
            onClick={onSubmit}
            disabled={submitting}
          >
            {submitting
              ? "Submitting…"
              : `Submit ${totalItems} ${totalItems === 1 ? "price" : "prices"}`}
          </button>
        )}
      </div>
    </div>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
function sanitize(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}
function formatDate(d) {
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const styles = `
  .rbu-wrap { font-family: var(--font-urbanist,'Urbanist',sans-serif); }
  .rbu-drop {
    border: 2px dashed ${C.border};
    border-radius: 16px;
    padding: 32px 24px;
    text-align: center;
    color: ${C.muted};
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s, color 0.2s;
  }
  .rbu-drop.is-over { border-color: ${C.terracotta}; background: ${C.cream}; color: ${C.terracotta}; }
  .rbu-drop.is-full { cursor: default; opacity: 0.6; }
  .rbu-drop-title { margin: 12px 0 4px; font-size: 16px; font-weight: 700; color: ${C.navyDark}; }
  .rbu-drop-sub { margin: 0; font-size: 13px; font-weight: 500; color: ${C.muted}; }
  .rbu-list { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
  .rbu-file {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 14px; border: 1px solid ${C.border}; border-radius: 12px; background: #fff;
  }
  .rbu-file-icon { color: ${C.muted}; flex-shrink: 0; }
  .rbu-file-body { flex: 1; min-width: 0; }
  .rbu-file-name {
    margin: 0; font-size: 14px; font-weight: 600; color: ${C.navyDark};
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .rbu-file-meta { margin: 2px 0 0; font-size: 12px; font-weight: 500; color: ${C.muted}; }
  .rbu-status {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 12px; font-weight: 700; white-space: nowrap; flex-shrink: 0;
    padding: 4px 10px; border-radius: 9999px;
  }
  .rbu-status-queued { background: rgba(113,122,134,0.12); color: ${C.slate}; }
  .rbu-status-processing { background: rgba(207,92,54,0.12); color: ${C.terracotta}; }
  .rbu-status-done { background: ${C.successBg}; color: ${C.success}; }
  .rbu-status-warn { background: ${C.warnBg}; color: ${C.warn}; }
  .rbu-status-error { background: ${C.errorBg}; color: ${C.error}; }
  .rbu-file-remove {
    background: none; border: none; cursor: pointer; color: ${C.muted};
    padding: 4px; display: flex; flex-shrink: 0; transition: color 0.15s;
  }
  .rbu-file-remove:hover { color: ${C.navyDark}; }
  :global(.rbu-spin) { animation: rbu-spin 1s linear infinite; }
  @keyframes rbu-spin { to { transform: rotate(360deg); } }
  .rbu-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
  .rbu-btn-primary {
    padding: 0 24px; height: 44px; background: ${C.terracotta}; color: #fff;
    border: 2px solid ${C.terracotta}; border-radius: 12px;
    font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit;
    transition: background 0.2s, color 0.2s;
  }
  .rbu-btn-primary:hover:not(:disabled) { background: #fff; color: ${C.terracotta}; }
  .rbu-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  .rbu-btn-secondary {
    padding: 0 24px; height: 44px; background: #fff; color: ${C.navyDark};
    border: 2px solid ${C.border}; border-radius: 12px;
    font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit;
    transition: background 0.2s, color 0.2s, border-color 0.2s;
  }
  .rbu-btn-secondary:hover:not(:disabled) { background: ${C.navyDark}; color: #fff; border-color: ${C.navyDark}; }
  .rbu-processing-note { margin: 16px 0 0; font-size: 14px; font-weight: 500; color: ${C.muted}; text-align: center; }
  .rbu-error-msg {
    margin: 14px 0 0; padding: 12px 14px; background: ${C.errorBg};
    border: 1px solid #F5C6C6; border-radius: 10px; color: ${C.error};
    font-size: 14px; font-weight: 600;
  }
  .rbu-review-title { margin: 0 0 16px; font-size: 20px; font-weight: 800; color: ${C.navyDark}; }
  .rbu-review-list { display: flex; flex-direction: column; gap: 14px; }
  .rbu-review-receipt { border: 1px solid ${C.border}; border-radius: 12px; padding: 16px; background: #fff; }
  .rbu-review-receipt-head {
    display: flex; justify-content: space-between; align-items: baseline;
    gap: 10px; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid ${C.border};
  }
  .rbu-review-receipt-name { font-size: 15px; font-weight: 700; color: ${C.navyDark}; }
  .rbu-review-receipt-date { font-size: 13px; font-weight: 500; color: ${C.muted}; }
  .rbu-review-items { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
  .rbu-review-item { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  .rbu-review-item-label { font-size: 14px; font-weight: 500; color: ${C.navyDark}; line-height: 1.4; }
  .rbu-review-item-tag {
    display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 9999px;
    background: ${C.cream}; color: ${C.muted}; font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.04em; vertical-align: middle;
  }
  .rbu-review-item-price { font-size: 14px; font-weight: 700; color: ${C.navyDark}; white-space: nowrap; }
  .rbu-review-empty { font-size: 15px; font-weight: 500; color: ${C.muted}; }
  .rbu-skipped { margin-top: 16px; display: flex; flex-direction: column; gap: 10px; }
  .rbu-skipped-line {
    margin: 0; padding: 12px 14px; background: ${C.warnBg}; border: 1px solid #F5E0BC;
    border-radius: 10px; font-size: 13px; font-weight: 500; color: ${C.navyDark}; line-height: 1.5;
  }
  .rbu-done { text-align: center; padding: 24px; font-family: var(--font-urbanist,'Urbanist',sans-serif); }
  .rbu-done-icon {
    width: 52px; height: 52px; border-radius: 50%; background: ${C.successBg}; color: ${C.success};
    display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;
  }
  .rbu-done-title { margin: 0 0 8px; font-size: 20px; font-weight: 800; color: ${C.navyDark}; }
  .rbu-done-text {
    margin: 0 auto 20px; font-size: 15px; font-weight: 500; color: ${C.slate};
    line-height: 1.6; max-width: 440px;
  }
  @media (max-width: 600px) {
    .rbu-actions { flex-direction: column-reverse; }
    .rbu-btn-primary, .rbu-btn-secondary { width: 100%; }
  }
`;
