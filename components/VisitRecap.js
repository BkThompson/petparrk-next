// components/VisitRecap.js
//
// Track 3 Phase B — Post-visit recap flow.
// States: idle → input (typed/photo) → extracting → review → done
//
// Styling uses the PetParrk design tokens (Urbanist, brand palette, radii)
// to match the Care Card and the rest of the app.

"use client";
import { useState, useRef } from "react";
import { ClipboardList, Camera, Pencil, Check, X, Loader2 } from "lucide-react";
import { triggerVisitRecap, confirmRecapItems } from "../lib/copilotApi";

const C = {
  navyDark: "#172531",
  terracotta: "#cf5c36",
  cream: "#f5f0e8",
  slate: "#4b5563",
  muted: "#717A86",
  border: "#ede8e0",
  borderStrong: "#d1c9bd",
  success: "#2a7d4f",
  successLight: "#edfaf3",
  successText: "#1a6641",
};

export default function VisitRecap({ petId, visitPrepId, onComplete }) {
  const [mode, setMode] = useState("idle"); // idle | typing | extracting | review | done
  const [inputMethod, setInputMethod] = useState(null); // typed | photo
  const [typedText, setTypedText] = useState("");
  const [recap, setRecap] = useState(null); // { recapId, plainSummary, stagedItems }
  const [decisions, setDecisions] = useState({}); // { stagedItemId: 'accepted' | 'rejected' }
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [writeResult, setWriteResult] = useState(null);
  const fileRef = useRef(null);

  function reset() {
    setMode("idle");
    setInputMethod(null);
    setTypedText("");
    setRecap(null);
    setDecisions({});
    setError(null);
    setWriteResult(null);
  }

  async function submitTyped() {
    if (!typedText.trim()) {
      setError("Please describe what happened at the visit.");
      return;
    }
    setError(null);
    setMode("extracting");
    try {
      const data = await triggerVisitRecap({
        petId,
        visitPrepId,
        inputMethod: "typed",
        rawInput: typedText.trim(),
      });
      setRecap(data);
      setDecisions(smartDefaults(data.stagedItems));
      setMode("review");
    } catch (err) {
      setError(err.message || "Could not process the visit notes.");
      setMode("typing");
    }
  }

  async function submitPhoto(file) {
    if (!file) return;
    setError(null);
    setMode("extracting");
    try {
      const base64 = await fileToBase64(file);
      const data = await triggerVisitRecap({
        petId,
        visitPrepId,
        inputMethod: file.type === "application/pdf" ? "pdf" : "photo",
        documentBase64: base64,
        documentMediaType: file.type,
      });
      setRecap(data);
      setDecisions(smartDefaults(data.stagedItems));
      setMode("review");
    } catch (err) {
      setError(err.message || "Could not read that document.");
      setMode("idle");
    }
  }

  function toggleDecision(id) {
    setDecisions((d) => ({
      ...d,
      [id]: d[id] === "accepted" ? "rejected" : "accepted",
    }));
  }

  async function confirmAll() {
    setSubmitting(true);
    setError(null);
    try {
      const decisionList = (recap.stagedItems || []).map((s) => ({
        stagedItemId: s.id,
        decision: decisions[s.id] || "rejected",
      }));
      const result = await confirmRecapItems({
        recapId: recap.recapId,
        decisions: decisionList,
      });
      setWriteResult(result);
      setMode("done");
      if (onComplete) onComplete();
    } catch (err) {
      setError(err.message || "Could not save. Please try again.");
    }
    setSubmitting(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="vr-wrap">
      {mode === "idle" && (
        <div className="vr-idle">
          <div className="vr-idle-head">
            <ClipboardList size={20} strokeWidth={2} />
            <div>
              <p className="vr-idle-title">How did the visit go?</p>
              <p className="vr-idle-sub">
                Tell us what the vet said, or upload the receipt or discharge
                paper. We'll turn it into plain English and update your pet's
                records.
              </p>
            </div>
          </div>
          <div className="vr-idle-actions">
            <button
              className="vr-choice-btn"
              onClick={() => {
                setInputMethod("typed");
                setMode("typing");
              }}
            >
              <Pencil size={16} strokeWidth={2} />
              Type what happened
            </button>
            <button
              className="vr-choice-btn"
              onClick={() => fileRef.current?.click()}
            >
              <Camera size={16} strokeWidth={2} />
              Upload a photo or PDF
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) submitPhoto(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      )}

      {mode === "typing" && (
        <div className="vr-typing">
          <p className="vr-label">What did the vet say?</p>
          <textarea
            className="vr-textarea"
            placeholder="e.g. Bella has an ear infection. Vet prescribed Otomax, apply twice a day for 10 days. Come back in 2 weeks if not better."
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            rows={5}
            autoFocus
          />
          {error && <p className="vr-error">{error}</p>}
          <div className="vr-row-actions">
            <button className="vr-cancel-btn" onClick={reset}>
              Cancel
            </button>
            <button className="vr-submit-btn" onClick={submitTyped}>
              Continue
            </button>
          </div>
        </div>
      )}

      {mode === "extracting" && (
        <div className="vr-extracting">
          <Loader2 size={22} strokeWidth={2} className="vr-spin" />
          <p className="vr-extracting-text">Reading the visit details…</p>
        </div>
      )}

      {mode === "review" && recap && (
        <div className="vr-review">
          {recap.plainSummary && (
            <div className="vr-summary">
              <p className="vr-label">Summary</p>
              <p className="vr-summary-text">{recap.plainSummary}</p>
            </div>
          )}

          {recap.stagedItems && recap.stagedItems.length > 0 ? (
            <>
              <p className="vr-label" style={{ marginTop: "18px" }}>
                Add these to the records?
              </p>
              <p className="vr-review-sub">
                Vaccines and medications will be saved to the records — uncheck
                any that are wrong. Services and labs are shown for reference
                and are included in the visit's total.
              </p>
              {groupStagedItems(recap.stagedItems).map((group) => {
                const isServices = group.key === "visit_service";
                return (
                  <div key={group.key} className="vr-group">
                    <p className="vr-group-label">
                      {group.label}
                      {group.items.length > 1 ? ` (${group.items.length})` : ""}
                    </p>
                    <div className="vr-items">
                      {group.items.map((item) => {
                        // Services are informational only — read-only, not toggles
                        if (isServices) {
                          return (
                            <div
                              key={item.id}
                              className="vr-item vr-item--info"
                            >
                              <span className="vr-item-dot" />
                              <span className="vr-item-body">
                                <span className="vr-item-label">
                                  {item.display_label}
                                </span>
                              </span>
                            </div>
                          );
                        }
                        const accepted = decisions[item.id] === "accepted";
                        return (
                          <button
                            key={item.id}
                            className={`vr-item ${accepted ? "is-accepted" : "is-rejected"}`}
                            onClick={() => toggleDecision(item.id)}
                            type="button"
                          >
                            <span className="vr-item-check">
                              {accepted ? (
                                <Check size={15} strokeWidth={2.5} />
                              ) : (
                                <X size={15} strokeWidth={2.5} />
                              )}
                            </span>
                            <span className="vr-item-body">
                              <span className="vr-item-label">
                                {item.display_label}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <p className="vr-review-sub" style={{ marginTop: "12px" }}>
              No specific records to add from this visit, but the summary above
              is saved.
            </p>
          )}

          {error && <p className="vr-error">{error}</p>}

          <div className="vr-row-actions">
            <button className="vr-cancel-btn" onClick={reset}>
              Start over
            </button>
            <button
              className="vr-submit-btn"
              onClick={confirmAll}
              disabled={submitting}
            >
              {submitting ? "Saving…" : "Save to records"}
            </button>
          </div>
        </div>
      )}

      {mode === "done" && (
        <div className="vr-done">
          <div className="vr-done-icon">
            <Check size={22} strokeWidth={2.5} />
          </div>
          <p className="vr-done-title">Saved</p>
          <p className="vr-done-sub">
            {writeResult?.written > 0
              ? `Added ${writeResult.written} item${writeResult.written === 1 ? "" : "s"} to the records.`
              : "The visit summary is saved."}
          </p>
          <button className="vr-cancel-btn" onClick={reset}>
            Add another visit
          </button>
        </div>
      )}

      <style jsx>{`
        .vr-wrap {
          font-family: var(--font-urbanist, "Urbanist", sans-serif);
        }
        .vr-idle-head {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          color: var(--color-terracotta, #cf5c36);
        }
        .vr-idle-head :global(svg) {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
        }
        .vr-idle-title {
          margin: 0 0 4px;
          font-size: 17px;
          font-weight: 800;
          color: var(--color-navy-dark, #172531);
          font-family: var(--font-urbanist, "Urbanist", sans-serif);
          line-height: 1.3;
        }
        .vr-idle-sub {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
          color: #4b5563;
          line-height: 1.6;
        }
        .vr-idle-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
          flex-wrap: wrap;
        }
        .vr-choice-btn {
          flex: 1;
          min-width: 180px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 48px;
          padding: 0 24px;
          background: #fff;
          border: 2px solid var(--color-border, #ede8e0);
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          color: var(--color-navy-dark, #172531);
          cursor: pointer;
          font-family: inherit;
          transition:
            background 0.2s,
            border-color 0.2s,
            color 0.2s;
        }
        .vr-choice-btn:hover {
          background: var(--color-navy-dark, #172531);
          border-color: var(--color-navy-dark, #172531);
          color: #fff;
        }
        .vr-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--color-terracotta, #cf5c36);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          margin: 0 0 8px;
          font-family: var(--font-urbanist, "Urbanist", sans-serif);
        }
        .vr-textarea {
          width: 100%;
          padding: 14px;
          border: 1.5px solid var(--color-border, #ede8e0);
          border-radius: 12px;
          font-size: 16px;
          font-weight: 500;
          font-family: inherit;
          color: var(--color-navy-dark, #172531);
          background: #fff;
          resize: vertical;
          min-height: 120px;
          box-sizing: border-box;
          line-height: 1.6;
          transition: border-color 0.15s;
        }
        .vr-textarea:focus {
          outline: none;
          border-color: var(--color-terracotta, #cf5c36);
        }
        .vr-row-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }
        .vr-cancel-btn {
          padding: 0 24px;
          height: 42px;
          background: #fff;
          color: var(--color-navy-dark, #172531);
          border: 2px solid var(--color-border, #ede8e0);
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition:
            background 0.2s,
            color 0.2s,
            border-color 0.2s;
        }
        .vr-cancel-btn:hover {
          background: var(--color-navy-dark, #172531);
          color: #fff;
          border-color: var(--color-navy-dark, #172531);
        }
        .vr-submit-btn {
          padding: 0 24px;
          height: 42px;
          background: var(--color-terracotta, #cf5c36);
          color: #fff;
          border: 2px solid var(--color-terracotta, #cf5c36);
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition:
            background 0.2s,
            color 0.2s;
        }
        .vr-submit-btn:hover:not(:disabled) {
          background: #fff;
          color: var(--color-terracotta, #cf5c36);
        }
        .vr-submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .vr-error {
          margin: 14px 0 0;
          padding: 12px 14px;
          background: var(--color-error-light, #fceaea);
          border: 1px solid #f5c6c6;
          border-radius: 10px;
          color: var(--color-error, #c94040);
          font-size: 14px;
          font-weight: 600;
        }
        .vr-extracting {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 36px 0;
        }
        .vr-extracting-text {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #4b5563;
        }
        :global(.vr-spin) {
          animation: vr-spin 1s linear infinite;
          color: var(--color-terracotta, #cf5c36);
        }
        @keyframes vr-spin {
          to {
            transform: rotate(360deg);
          }
        }
        .vr-summary-text {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
          color: var(--color-navy-dark, #172531);
          line-height: 1.6;
        }
        .vr-review-sub {
          margin: 0 0 14px;
          font-size: 14px;
          font-weight: 500;
          color: #717a86;
          line-height: 1.5;
        }
        .vr-group {
          margin-bottom: 16px;
        }
        .vr-group-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--color-navy-dark, #172531);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin: 0 0 8px;
        }
        .vr-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .vr-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1.5px solid var(--color-border, #ede8e0);
          background: #fff;
          cursor: pointer;
          text-align: left;
          width: 100%;
          font-family: inherit;
          transition:
            border-color 0.15s,
            background 0.15s,
            opacity 0.15s;
        }
        .vr-item.is-accepted {
          border-color: var(--color-success, #2a7d4f);
          background: var(--color-success-light, #edfaf3);
        }
        .vr-item.is-rejected {
          opacity: 0.5;
        }
        .vr-item--info {
          cursor: default;
          background: var(--color-cream, #f5f0e8);
          border-color: transparent;
        }
        .vr-item-dot {
          display: inline-flex;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
        }
        .vr-item-dot::before {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--color-muted, #717a86);
        }
        .vr-item-check {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          flex-shrink: 0;
          color: #fff;
        }
        .vr-item.is-accepted .vr-item-check {
          background: var(--color-success, #2a7d4f);
        }
        .vr-item.is-rejected .vr-item-check {
          background: #717a86;
        }
        .vr-item-body {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .vr-item-label {
          font-size: 16px;
          font-weight: 700;
          color: var(--color-navy-dark, #172531);
          line-height: 1.3;
        }
        .vr-item-target {
          font-size: 13px;
          font-weight: 500;
          color: #717a86;
        }
        .vr-done {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 28px 0;
          text-align: center;
        }
        .vr-done-icon {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: var(--color-success-light, #edfaf3);
          color: var(--color-success, #2a7d4f);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .vr-done-title {
          margin: 0;
          font-size: 20px;
          font-weight: 800;
          color: var(--color-success-text, #1a6641);
        }
        .vr-done-sub {
          margin: 0 0 8px;
          font-size: 15px;
          font-weight: 500;
          color: #4b5563;
        }
        @media (max-width: 600px) {
          .vr-idle-actions {
            flex-direction: column;
          }
          .vr-choice-btn {
            width: 100%;
            flex: none;
          }
          .vr-row-actions {
            flex-direction: column-reverse;
          }
          .vr-cancel-btn,
          .vr-submit-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );

  function petLabel() {
    return "your pet";
  }
}

function smartDefaults(stagedItems) {
  const initial = {};
  (stagedItems || []).forEach((s) => {
    // Services default OFF (informational); everything else defaults ON.
    initial[s.id] =
      s.target_table === "visit_service" ? "rejected" : "accepted";
  });
  return initial;
}

// Group staged items for the review UI, in display order.
const GROUP_ORDER = [
  { key: "pet_vet_visits", label: "Visit" },
  { key: "pet_vaccinations", label: "Vaccinations" },
  { key: "pet_medications", label: "Medications" },
  { key: "visit_service", label: "Services & labs" },
];

function groupStagedItems(stagedItems) {
  const groups = [];
  for (const g of GROUP_ORDER) {
    const items = (stagedItems || []).filter((s) => s.target_table === g.key);
    if (items.length > 0) groups.push({ ...g, items });
  }
  return groups;
}

function targetLabel(table) {
  switch (table) {
    case "pet_vet_visits":
      return "Vet visit";
    case "pet_medications":
      return "Medication";
    case "pet_vaccinations":
      return "Vaccination";
    case "pet_weight_history":
      return "Weight";
    default:
      return "Record";
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = String(result).split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
