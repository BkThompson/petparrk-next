// components/CoPilotRecommendation.js
//
// Renders a co-pilot recommendation inside the symptom checker chat.
// Shows ranked vets + on-demand cost estimates.

"use client";
import { useState } from "react";
import Link from "next/link";
import { triggerCostEstimate } from "@/lib/copilotApi";

export default function CoPilotRecommendation({
  recommendationId,
  symptomCheckId,
  petId,
  differentials,
  rankedVets,
  triageResult,
}) {
  const [estimates, setEstimates] = useState({}); // { vetId: estimateData }
  const [loading, setLoading] = useState({}); // { vetId: true }

  if (!rankedVets || rankedVets.length === 0) {
    return null;
  }

  async function getEstimate(vet) {
    if (estimates[vet.vet_id] || loading[vet.vet_id]) return;
    setLoading((l) => ({ ...l, [vet.vet_id]: true }));
    try {
      const data = await triggerCostEstimate({
        recommendationId,
        symptomCheckId,
        petId,
        vetId: vet.vet_id,
        differentials,
      });
      setEstimates((e) => ({ ...e, [vet.vet_id]: data }));
    } catch (err) {
      setEstimates((e) => ({
        ...e,
        [vet.vet_id]: { error: err.message },
      }));
    }
    setLoading((l) => ({ ...l, [vet.vet_id]: false }));
  }

  const triageTitle =
    triageResult === "EMERGENCY"
      ? "Nearest options for emergency care:"
      : triageResult === "SEE_VET"
        ? "Vets we recommend for this:"
        : "If you'd like to see someone anyway, here are options nearby:";

  return (
    <div className="cpr">
      <div className="cpr-title">{triageTitle}</div>
      {rankedVets.map((vet) => {
        const est = estimates[vet.vet_id];
        const isLoading = loading[vet.vet_id];
        return (
          <div key={vet.vet_id} className="cpr-vet">
            <div className="cpr-vet-head">
              <div>
                <div className="cpr-vet-name">
                  <Link href={`/vet/${vet.vet_slug}`}>{vet.name}</Link>
                </div>
                {vet.city && <div className="cpr-vet-meta">{vet.city}</div>}
              </div>
              <div className="cpr-vet-badges">
                {vet.accepting_new_patients === true && (
                  <span className="cpr-badge cpr-badge-good">
                    accepting new
                  </span>
                )}
                {vet.accepting_new_patients === false && (
                  <span className="cpr-badge cpr-badge-warn">
                    not accepting
                  </span>
                )}
                {vet.distance_bucket === "same_zip" && (
                  <span className="cpr-badge cpr-badge-info">nearby</span>
                )}
              </div>
            </div>
            {vet.reasoning && (
              <div className="cpr-vet-reason">{vet.reasoning}</div>
            )}
            <div className="cpr-vet-actions">
              {vet.phone && (
                <a href={`tel:${vet.phone}`} className="cpr-btn cpr-btn-call">
                  Call {vet.phone}
                </a>
              )}
              {!est && !isLoading && (
                <button
                  type="button"
                  className="cpr-btn cpr-btn-est"
                  onClick={() => getEstimate(vet)}
                >
                  Estimate cost
                </button>
              )}
              {isLoading && (
                <span className="cpr-btn cpr-btn-est cpr-btn-loading">
                  Calculating…
                </span>
              )}
            </div>
            {est && !est.error && est.estimateLow != null && (
              <div className="cpr-est">
                <div className="cpr-est-range">
                  ${est.estimateLow}–${est.estimateHigh}
                  {est.confidence && (
                    <span className={`cpr-conf cpr-conf-${est.confidence}`}>
                      {est.confidence} confidence
                    </span>
                  )}
                </div>
                <div className="cpr-est-reason">{est.reasoning}</div>
              </div>
            )}
            {est && (est.error || est.estimateLow == null) && (
              <div className="cpr-est cpr-est-empty">
                {est.reasoning ||
                  "Cost data not available for this clinic. Call for a quote."}
              </div>
            )}
          </div>
        );
      })}
      <style jsx>{`
        .cpr {
          margin: 16px 0 8px;
          padding: 16px;
          background: var(--color-cream);
          border: 1px solid var(--color-border);
          border-radius: 12px;
        }
        .cpr-title {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 12px;
          color: var(--color-ink);
        }
        .cpr-vet {
          padding: 12px 0;
          border-top: 1px solid var(--color-border);
        }
        .cpr-vet:first-of-type {
          border-top: 0;
          padding-top: 0;
        }
        .cpr-vet-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }
        .cpr-vet-name {
          font-weight: 600;
          font-size: 15px;
        }
        .cpr-vet-name :global(a) {
          color: var(--color-ink);
          text-decoration: none;
        }
        @media (hover: hover) {
          .cpr-vet-name :global(a:hover) {
            text-decoration: underline;
          }
        }
        .cpr-vet-meta {
          font-size: 12px;
          color: var(--color-muted);
          margin-top: 2px;
        }
        .cpr-vet-badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .cpr-badge {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 999px;
          font-weight: 500;
          white-space: nowrap;
        }
        .cpr-badge-good {
          background: var(--color-success-light);
          color: var(--color-success-text);
        }
        .cpr-badge-warn {
          background: var(--color-warning-light);
          color: var(--color-warning-text);
        }
        .cpr-badge-info {
          background: var(--color-badge-navy-bg);
          color: var(--color-info-text);
        }
        .cpr-vet-reason {
          font-size: 13px;
          color: var(--color-muted);
          margin-top: 6px;
          line-height: 1.45;
        }
        .cpr-vet-actions {
          display: flex;
          gap: 8px;
          margin-top: 10px;
          flex-wrap: wrap;
        }
        .cpr-btn {
          font-size: 13px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid var(--color-border);
          background: white;
          color: var(--color-ink);
          cursor: pointer;
          text-decoration: none;
          font-weight: 500;
        }
        @media (hover: hover) {
          .cpr-btn:hover {
            background: var(--color-cream);
          }
        }
        .cpr-btn-call {
          background: var(--color-success);
          color: white;
          border-color: var(--color-success);
        }
        @media (hover: hover) {
          .cpr-btn-call:hover {
            background: var(--color-success);
          }
        }
        .cpr-btn-loading {
          opacity: 0.6;
          cursor: default;
        }
        .cpr-est {
          margin-top: 10px;
          padding: 10px 12px;
          background: white;
          border-radius: 8px;
          border: 1px solid var(--color-border);
        }
        .cpr-est-empty {
          font-size: 13px;
          color: var(--color-muted);
        }
        .cpr-est-range {
          font-weight: 600;
          font-size: 15px;
        }
        .cpr-conf {
          margin-left: 10px;
          font-size: 11px;
          font-weight: 500;
          padding: 2px 8px;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .cpr-conf-high {
          background: var(--color-success-light);
          color: var(--color-success-text);
        }
        .cpr-conf-medium {
          background: var(--color-caution-light);
          color: var(--color-caution-text);
        }
        .cpr-conf-low {
          background: var(--color-warning-light);
          color: var(--color-warning-text);
        }
        .cpr-est-reason {
          font-size: 13px;
          color: var(--color-muted);
          margin-top: 4px;
          line-height: 1.45;
        }
      `}</style>
    </div>
  );
}
