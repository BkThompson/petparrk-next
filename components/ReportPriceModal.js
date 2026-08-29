// components/ReportPriceModal.js
//
// Modal for reporting incorrect prices on the vet slug page.
// Styling matches InlineSubmitPriceForm exactly — same class vocab,
// same button sizes, same border radii, same focus rings.

"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const C = {
  navyDark: "#172531",
  terracotta: "#CF5C36",
  cream: "#F5F0E8",
  slate: "#4B5563",
  muted: "#717A86",
  border: "#EDE8E0",
  borderStrong: "#DAD3C5",
  errorBg: "#FCEAEA",
  errorBorder: "#F5C6C6",
  errorText: "#C94040",
  successBg: "#EDFAF3",
  successBorder: "#A7F3D0",
  successText: "#1A6641",
};

const CATEGORIES = [
  { value: "too_high", label: "Price is too high" },
  { value: "too_low", label: "Price is too low" },
  { value: "not_offered", label: "This clinic doesn't offer this service" },
  { value: "wrong_service", label: "Wrong service label" },
  { value: "other", label: "Something else" },
];

export default function ReportPriceModal({
  open,
  onClose,
  vetId,
  vetName,
  serviceName,
  serviceId,
  vetPriceId,
  currentPrice,
}) {
  const [category, setCategory] = useState("");
  const [suggestedLow, setSuggestedLow] = useState("");
  const [suggestedHigh, setSuggestedHigh] = useState("");
  const [reasonText, setReasonText] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (open) {
      setCategory("");
      setSuggestedLow("");
      setSuggestedHigh("");
      setReasonText("");
      setContactEmail("");
      setResult(null);
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  if (!open) return null;

  async function submit() {
    if (!category) {
      setResult({ error: "Please select what's wrong." });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers = { "Content-Type": "application/json" };
      if (session) headers.Authorization = `Bearer ${session.access_token}`;

      const res = await fetch("/api/price-report", {
        method: "POST",
        headers,
        body: JSON.stringify({
          vetPriceId,
          vetId,
          serviceId,
          reasonCategory: category,
          suggestedPriceLow: suggestedLow || null,
          suggestedPriceHigh: suggestedHigh || null,
          reasonText: reasonText || null,
          contactEmail: contactEmail || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error || "Something went wrong." });
      } else {
        setResult({ success: data.message || "Thanks for the report." });
        setTimeout(() => onClose(), 1800);
      }
    } catch (err) {
      setResult({ error: err.message || "Something went wrong." });
    }
    setSubmitting(false);
  }

  return (
    <div className="rpm-overlay" onClick={onClose}>
      <div className="rpm-card" onClick={(e) => e.stopPropagation()}>
        <button
          className="rpm-close"
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 4 L14 14 M14 4 L4 14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="rpm-head">
          <h3>Report incorrect price</h3>
          <div className="rpm-subtitle">
            {vetName && <div className="rpm-subtitle-line">{vetName}</div>}
            {serviceName && (
              <div className="rpm-subtitle-line rpm-subtitle-line-service">
                {serviceName}
              </div>
            )}
            {currentPrice && (
              <div className="rpm-subtitle-line rpm-subtitle-line-price">
                Currently {currentPrice}
              </div>
            )}
          </div>
        </div>

        {result?.success ? (
          <div className="rpm-success">
            <h4>Thanks for the report</h4>
            <p>{result.success}</p>
          </div>
        ) : (
          <>
            <div className="rpm-field">
              <label className="rpm-label">
                What's wrong? <span className="rpm-required">*</span>
              </label>
              <div className="rpm-radios">
                {CATEGORIES.map((c) => (
                  <label
                    key={c.value}
                    className={`rpm-radio-row ${category === c.value ? "is-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="rpm-category"
                      value={c.value}
                      checked={category === c.value}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {(category === "too_high" || category === "too_low") && (
              <div className="rpm-field">
                <label className="rpm-label">What should the price be?</label>
                <div className="rpm-grid-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Low"
                    value={suggestedLow}
                    onChange={(e) => setSuggestedLow(e.target.value)}
                    className="rpm-input"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="High (optional)"
                    value={suggestedHigh}
                    onChange={(e) => setSuggestedHigh(e.target.value)}
                    className="rpm-input"
                  />
                </div>
              </div>
            )}

            <div className="rpm-field">
              <label className="rpm-label">Additional context</label>
              <textarea
                className="rpm-input rpm-textarea"
                placeholder="How do you know? Any details help us verify faster."
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="rpm-field">
              <label className="rpm-label">Email for follow-up</label>
              <input
                type="email"
                className="rpm-input"
                placeholder="you@example.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>

            {result?.error && <div className="rpm-error">{result.error}</div>}

            <div className="rpm-final-row">
              <button
                className="rpm-cancel-btn"
                onClick={onClose}
                type="button"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="rpm-submit-btn"
                onClick={submit}
                type="button"
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit report"}
              </button>
            </div>
            <p className="rpm-reviewed-note">
              Reports are reviewed before any change goes live.
            </p>
          </>
        )}
      </div>

      <style jsx>{`
        .rpm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(23, 37, 49, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 9999;
          animation: rpm-fade-in 0.2s ease;
        }
        @keyframes rpm-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .rpm-card {
          position: relative;
          background: #fff;
          border: 1.5px solid ${C.terracotta};
          border-radius: 16px;
          padding: 28px;
          box-shadow:
            0 4px 20px rgba(207, 92, 54, 0.08),
            0 24px 60px rgba(23, 37, 49, 0.25);
          font-family: var(--font-urbanist, "Urbanist", sans-serif);
          max-width: 480px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          animation: rpm-scale-in 0.28s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes rpm-scale-in {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(6px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .rpm-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 36px;
          height: 36px;
          border: none;
          background: transparent;
          color: ${C.muted};
          cursor: pointer;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition:
            background 0.15s,
            color 0.15s;
          z-index: 10;
        }
        .rpm-close:hover {
          background: ${C.cream};
          color: ${C.navyDark};
        }

        .rpm-head {
          padding-bottom: 16px;
          border-bottom: 1px solid ${C.border};
          margin-bottom: 20px;
          padding-right: 40px;
        }
        .rpm-head h3 {
          margin: 0;
          font-size: 22px;
          font-weight: 800;
          color: ${C.navyDark};
          letter-spacing: -0.01em;
        }
        .rpm-subtitle {
          margin: 10px 0 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .rpm-subtitle-line {
          font-size: 15px;
          font-weight: 700;
          color: ${C.navyDark};
          line-height: 1.4;
        }
        .rpm-subtitle-line-service {
          font-weight: 500;
          color: ${C.slate};
        }
        .rpm-subtitle-line-price {
          font-weight: 500;
          color: ${C.muted};
          font-size: 14px;
          margin-top: 2px;
        }

        .rpm-field {
          margin-bottom: 14px;
        }
        .rpm-label {
          display: block;
          font-size: 14px;
          font-weight: 700;
          color: ${C.muted};
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .rpm-required {
          color: ${C.terracotta};
        }

        .rpm-input {
          width: 100%;
          height: 46px;
          padding: 11px 14px;
          border: 1.5px solid ${C.border};
          border-radius: 10px;
          font-size: 15px;
          font-weight: 500;
          background: #fff;
          color: ${C.navyDark};
          outline: none;
          font-family: var(--font-urbanist, "Urbanist", sans-serif);
          box-sizing: border-box;
          transition: border-color 0.15s;
          -webkit-appearance: none;
          appearance: none;
        }
        .rpm-input:focus {
          border-color: ${C.terracotta};
        }
        .rpm-textarea {
          padding: 12px;
          height: auto;
          min-height: 80px;
          resize: vertical;
        }
        .rpm-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .rpm-radios {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .rpm-radio-row {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 15px;
          color: ${C.navyDark};
          cursor: pointer;
          padding: 12px 14px;
          border: 1.5px solid ${C.border};
          border-radius: 10px;
          font-weight: 500;
          transition:
            background 0.15s,
            border-color 0.15s;
        }
        .rpm-radio-row:hover {
          background: ${C.cream};
        }
        .rpm-radio-row.is-selected {
          background: ${C.cream};
          border-color: ${C.terracotta};
        }
        .rpm-radio-row input {
          margin: 0;
          accent-color: ${C.terracotta};
          flex-shrink: 0;
        }

        .rpm-error {
          margin: 8px 0 14px;
          padding: 12px 14px;
          background: ${C.errorBg};
          border: 1px solid ${C.errorBorder};
          border-radius: 10px;
          color: ${C.errorText};
          font-size: 14px;
          font-weight: 600;
        }

        .rpm-final-row {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          align-items: center;
          margin-top: 8px;
        }
        .rpm-cancel-btn {
          padding: 0 24px;
          height: 42px;
          background: #fff;
          color: ${C.navyDark};
          border: 1.5px solid ${C.border};
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition:
            background 0.15s,
            color 0.15s,
            border-color 0.15s;
          font-family: var(--font-urbanist, "Urbanist", sans-serif);
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
        }
        .rpm-cancel-btn:hover:not(:disabled) {
          background: ${C.navyDark};
          color: #fff;
          border-color: ${C.navyDark};
        }
        .rpm-submit-btn {
          padding: 0 24px;
          height: 42px;
          background: ${C.terracotta};
          color: #fff;
          border: 2px solid ${C.terracotta};
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition:
            background 0.2s,
            color 0.2s;
          font-family: var(--font-urbanist, "Urbanist", sans-serif);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          white-space: nowrap;
        }
        .rpm-submit-btn:hover:not(:disabled) {
          background: #fff;
          color: ${C.terracotta};
        }
        .rpm-submit-btn:disabled,
        .rpm-cancel-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .rpm-reviewed-note {
          font-size: 14px;
          font-weight: 500;
          color: ${C.muted};
          text-align: center;
          margin-top: 12px;
          line-height: 1.6;
        }

        .rpm-success {
          padding: 32px 24px;
          text-align: center;
        }
        .rpm-success h4 {
          margin: 0 0 8px;
          font-size: 20px;
          font-weight: 800;
          color: ${C.successText};
        }
        .rpm-success p {
          margin: 0;
          font-size: 15px;
          font-weight: 500;
          color: ${C.slate};
          line-height: 1.6;
        }

        /* ── Mobile: stack buttons full-width ─────────────────── */
        @media (max-width: 600px) {
          .rpm-card {
            padding: 24px 20px;
          }
          .rpm-final-row {
            flex-direction: column-reverse;
            gap: 10px;
            align-items: stretch;
          }
          .rpm-cancel-btn,
          .rpm-submit-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
