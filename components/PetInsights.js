// components/PetInsights.js
//
// Track 3 Phase C — Shared insights display.
//
// One component, three surfaces, controlled by the `surface` prop:
//   surface="care"     → full panel (Care Card)
//   surface="history"  → full panel (HealthHistory)
//   surface="profile"  → reminders only, quiet strip, renders NOTHING when empty
//
// Keeping this in one component means insight copy and styling live in one
// place — tuning the wording updates every surface at once.
//
// CONTENT CONSTRAINT: insights are factual/trend only. This component never
// adds interpretation beyond what the API returned.

"use client";
import { useEffect, useState } from "react";
import {
  Syringe,
  Pill,
  CalendarClock,
  TrendingUp,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { getInsightsForPet } from "../lib/copilotApi";

const CATEGORY_ICON = {
  vaccination: Syringe,
  medication: Pill,
  visit: CalendarClock,
  weight: TrendingUp,
  general: Sparkles,
};

// Severity → pill styling. These describe TIMING, never medical urgency.
const SEVERITY_STYLE = {
  overdue: {
    label: "Overdue",
    bg: "rgba(201, 64, 64, 0.12)",
    color: "#C94040",
  },
  soon: {
    label: "Soon",
    bg: "rgba(217, 162, 27, 0.14)",
    color: "#8C6A11",
  },
  info: {
    label: null,
    bg: "rgba(113, 122, 134, 0.12)",
    color: "#4B5563",
  },
};

const SEVERITY_ORDER = { overdue: 0, soon: 1, info: 2 };

export default function PetInsights({
  petId,
  surface = "care",
  petName,
  className = "",
  onLoaded, // optional: called with the count of visible insights
}) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!petId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getInsightsForPet(petId);
        if (!cancelled) setInsights(data.insights || []);
      } catch {
        if (!cancelled) setError(true);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [petId]);

  const isProfile = surface === "profile";

  // Profile shows ONLY actionable, date-based reminders.
  const visible = insights
    .filter((i) => (isProfile ? i.profile_eligible : true))
    .sort((a, b) => {
      const s =
        (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
      if (s !== 0) return s;
      if (a.reference_date && b.reference_date)
        return a.reference_date < b.reference_date ? -1 : 1;
      return 0;
    });

  // Profile renders nothing at all when there's nothing actionable —
  // an empty "Reminders" heading on an identity page is clutter.
  const isEmptyForProfile =
    isProfile && (loading || error || visible.length === 0);

  useEffect(() => {
    if (typeof onLoaded === "function" && !loading) {
      onLoaded(error ? 0 : visible.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, visible.length]);

  if (isEmptyForProfile) return null;

  // Health surfaces: stay quiet while loading, but do show an all-clear state.
  if (loading) {
    return (
      <div className={`pin-wrap ${className}`}>
        <div className="pin-skeleton" />
        <style jsx>{skeletonCss}</style>
      </div>
    );
  }
  if (error) return null;

  if (isProfile) {
    return (
      <div className={`pin-profile ${className}`}>
        {visible.map((i) => {
          const sev = SEVERITY_STYLE[i.severity] || SEVERITY_STYLE.info;
          const Icon = CATEGORY_ICON[i.category] || Sparkles;
          return (
            <div key={i.id} className="pin-profile-row">
              <span
                className="pin-profile-icon"
                style={{ background: sev.bg, color: sev.color }}
              >
                <Icon size={14} strokeWidth={2.2} />
              </span>
              <span className="pin-profile-text">{i.title}</span>
            </div>
          );
        })}
        <style jsx>{profileCss}</style>
      </div>
    );
  }

  // ── Full panel (Care Card + HealthHistory)
  return (
    <div className={`pin-wrap ${className}`}>
      <div className="pin-header">
        <p className="pin-eyebrow">Insights</p>
        <h2 className="pin-title">What we're tracking</h2>
        <p className="pin-sub">
          {visible.length > 0
            ? "Based on the records on file. Always confirm with your vet."
            : "Nothing needs attention right now."}
        </p>
      </div>

      {visible.length > 0 && (
        <div className="pin-list">
          {visible.map((i) => {
            const sev = SEVERITY_STYLE[i.severity] || SEVERITY_STYLE.info;
            const Icon = CATEGORY_ICON[i.category] || Sparkles;
            return (
              <div key={i.id} className="pin-item">
                <span
                  className="pin-item-icon"
                  style={{ background: sev.bg, color: sev.color }}
                >
                  <Icon size={16} strokeWidth={2.2} />
                </span>
                <div className="pin-item-body">
                  <div className="pin-item-title-row">
                    <p className="pin-item-title">{i.title}</p>
                    {sev.label ? (
                      <span
                        className="pin-item-pill"
                        style={{ background: sev.bg, color: sev.color }}
                      >
                        {sev.label}
                      </span>
                    ) : null}
                  </div>
                  {i.detail ? (
                    <p className="pin-item-detail">{i.detail}</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{panelCss}</style>
    </div>
  );
}

const skeletonCss = `
  .pin-skeleton {
    height: 96px;
    border-radius: 16px;
    background: linear-gradient(
      90deg,
      rgba(237, 232, 224, 0.5) 25%,
      rgba(237, 232, 224, 0.9) 37%,
      rgba(237, 232, 224, 0.5) 63%
    );
    background-size: 400% 100%;
    animation: pin-shimmer 1.4s ease infinite;
  }
  @keyframes pin-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
  }
`;

const panelCss = `
  .pin-header { margin-bottom: 16px; }
  .pin-eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-terracotta, #cf5c36);
    margin: 0 0 6px;
  }
  .pin-title {
    font-size: 22px;
    font-weight: 800;
    color: var(--color-navy-dark, #172531);
    margin: 0 0 6px;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }
  .pin-sub {
    font-size: 16px;
    font-weight: 500;
    color: var(--color-slate, #4b5563);
    margin: 0;
    line-height: 1.55;
  }
  .pin-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .pin-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 16px;
    border: 1px solid var(--color-border, #ede8e0);
    border-radius: 14px;
    background: #fff;
  }
  .pin-item-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .pin-item-body { min-width: 0; flex: 1; }
  .pin-item-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .pin-item-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--color-navy-dark, #172531);
    margin: 0;
    line-height: 1.3;
  }
  .pin-item-pill {
    display: inline-flex;
    align-items: center;
    padding: 3px 9px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .pin-item-detail {
    margin: 6px 0 0;
    font-size: 15px;
    font-weight: 500;
    color: var(--color-slate, #4b5563);
    line-height: 1.6;
  }
`;

const profileCss = `
  .pin-profile {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .pin-profile-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .pin-profile-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .pin-profile-text {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-navy-dark, #172531);
    line-height: 1.5;
  }
`;
