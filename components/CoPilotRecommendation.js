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
          background: var(--surface-2, #f6f4ef);
          border: 1px solid var(--border, #e4dfd3);
          border-radius: 12px;
        }
        .cpr-title {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 12px;
          color: var(--ink, #1a1a1a);
        }
        .cpr-vet {
          padding: 12px 0;
          border-top: 1px solid var(--border, #e4dfd3);
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
          color: var(--ink, #1a1a1a);
          text-decoration: none;
        }
        .cpr-vet-name :global(a:hover) {
          text-decoration: underline;
        }
        .cpr-vet-meta {
          font-size: 12px;
          color: var(--ink-soft, #706b60);
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
          background: #e4f0e6;
          color: #1c5c30;
        }
        .cpr-badge-warn {
          background: #f7e5d8;
          color: #8b3f18;
        }
        .cpr-badge-info {
          background: #e6ecf3;
          color: #1e4a76;
        }
        .cpr-vet-reason {
          font-size: 13px;
          color: var(--ink-soft, #706b60);
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
          border: 1px solid var(--border, #e4dfd3);
          background: white;
          color: var(--ink, #1a1a1a);
          cursor: pointer;
          text-decoration: none;
          font-weight: 500;
        }
        .cpr-btn:hover {
          background: var(--surface-2, #f6f4ef);
        }
        .cpr-btn-call {
          background: #1c5c30;
          color: white;
          border-color: #1c5c30;
        }
        .cpr-btn-call:hover {
          background: #164e27;
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
          border: 1px solid var(--border, #e4dfd3);
        }
        .cpr-est-empty {
          font-size: 13px;
          color: var(--ink-soft, #706b60);
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
          background: #e4f0e6;
          color: #1c5c30;
        }
        .cpr-conf-medium {
          background: #f6efd8;
          color: #7a5b1a;
        }
        .cpr-conf-low {
          background: #f7e5d8;
          color: #8b3f18;
        }
        .cpr-est-reason {
          font-size: 13px;
          color: var(--ink-soft, #706b60);
          margin-top: 4px;
          line-height: 1.45;
        }
      `}</style>
    </div>
  );
}
