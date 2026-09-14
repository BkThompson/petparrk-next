"use client";

import { ArtNoChecks } from "../../components/BrandArt";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import PageLoader from "../../components/PageLoader";
import Breadcrumb from "../../components/Breadcrumb";
import { ChevronDown, PawPrint, RefreshCw } from "lucide-react";
import { BANNER_LUCIDE, speciesBucket } from "../../lib/petTileHelpers";
import { getCopilotDataForCheck } from "../../lib/copilotApi";
import { renderMarkdown } from "../../lib/renderMarkdown";

// Palette (matches lib/petTileHelpers C + app-wide vars)
const C = {
  navyDark: "#172531",
  terracotta: "#CF5C36",
  cream: "#F5F0E8",
  slate: "#4B5563",
  muted: "#717A86",
  border: "#EDE8E0",
  borderStrong: "#DAD3C5",
  white: "#FFFFFF",
};

// Triage → color + label. Identical mapping to the pet-tile badges so the
// history reads consistently with the rest of the app.
function triageMeta(result) {
  if (result === "EMERGENCY")
    return { dot: "#C94040", text: "#A62F2F", label: "Emergency" };
  if (result === "SEE_VET")
    return { dot: "#EFC88B", text: "#8A6420", label: "See vet soon" };
  if (result === "MONITOR")
    return { dot: "#1A6641", text: "#155534", label: "Monitor at home" };
  return { dot: "#888", text: "#4B5563", label: result || "—" };
}

function relativeTime(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1 week ago";
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(days / 365);
  if (years === 1) return "1 year ago";
  return `${years} years ago`;
}

function fullDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Transcript is stored as a JSON string of chat messages. Parse defensively.
function parseTranscript(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── Co-pilot output for a past check ────────────────────────────────────────
// Lazily loads the ranked vets + cost estimates that were generated at the
// time of this check. Renders nothing if the check predates the co-pilot or
// landed on MONITOR (where no recommendation fires).
function CheckCopilotData({ checkId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getCopilotDataForCheck(checkId);
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setData(null);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [checkId]);

  if (loading) return null;
  if (!data || !data.recommendation) return null;

  const ranked = data.recommendation.ranked_vets || [];
  if (ranked.length === 0) return null;

  // Index estimates by vet so each vet can show the range generated for it
  const estimateByVet = {};
  for (const e of data.estimates || []) {
    if (e.vet_id != null) estimateByVet[e.vet_id] = e;
  }

  return (
    <div className="hh-copilot">
      <p className="hh-detail-label">Vets suggested at the time</p>
      <div className="hh-vets">
        {ranked.map((v) => {
          const est = estimateByVet[v.vet_id];
          return (
            <div key={v.vet_id || v.vet_slug} className="hh-vet">
              <div className="hh-vet-row">
                <div className="hh-vet-main">
                  <p className="hh-vet-name">{v.name}</p>
                  {v.city && <p className="hh-vet-city">{v.city}</p>}
                  {v.reasoning && (
                    <p className="hh-vet-reason">{v.reasoning}</p>
                  )}
                  <div className="hh-vet-actions">
                    {v.phone && (
                      <a href={`tel:${v.phone}`} className="hh-vet-phone">
                        {v.phone}
                      </a>
                    )}
                  </div>
                  {est && est.estimate_low != null && (
                    <div className="hh-vet-est-block">
                      <div className="hh-vet-est-amount">
                        {est.estimate_low === est.estimate_high
                          ? `$${est.estimate_low}`
                          : `$${est.estimate_low}–$${est.estimate_high}`}
                      </div>
                      {est.reasoning && (
                        <p className="hh-vet-est-reason">{est.reasoning}</p>
                      )}
                    </div>
                  )}
                </div>
                {v.vet_slug && (
                  <a
                    href={`/vet/${v.vet_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hh-vet-link"
                  >
                    View profile ↗
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="hh-copilot-note">
        These were the suggestions when this check ran. Availability and pricing
        may have changed.
      </p>
    </div>
  );
}

export default function HealthHistoryPage() {
  const router = useRouter();
  const [session, setSession] = useState(undefined); // undefined=loading, null=out
  const [checks, setChecks] = useState(null); // null=loading, [] = none
  const [petsById, setPetsById] = useState({});
  const [activePet, setActivePet] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  // Watch session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s || null);
    });
    return () => sub?.subscription?.unsubscribe();
  }, []);

  // Load checks + pets
  useEffect(() => {
    if (session === undefined) return;
    if (session === null) {
      router.replace("/auth?redirect=/health-history");
      return;
    }
    let cancelled = false;
    (async () => {
      // Owner's pets (for names/photos + the filter)
      const { data: pets } = await supabase
        .from("pets")
        .select("id, name, photo_url, species")
        .eq("owner_id", session.user.id);
      const map = {};
      (pets || []).forEach((p) => {
        map[p.id] = p;
      });

      // All checks, newest first
      const { data: rows } = await supabase
        .from("symptom_checks")
        .select(
          "id, pet_id, triage_result, differentials, transcript, created_at",
        )
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      setPetsById(map);
      setChecks(rows || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [session, router]);

  // Pets that actually have checks (for the filter pills)
  const petsWithChecks = useMemo(() => {
    if (!checks) return [];
    const ids = [...new Set(checks.map((c) => c.pet_id))];
    return ids.map((id) => petsById[id]).filter(Boolean);
  }, [checks, petsById]);

  const visibleChecks = useMemo(() => {
    if (!checks) return [];
    if (activePet === "all") return checks;
    return checks.filter((c) => c.pet_id === activePet);
  }, [checks, activePet]);

  if (session === undefined || checks === null) {
    return <PageLoader for="healthHistory" />;
  }

  return (
    <div className="hh-page">
      <div className="hh-container">
        <div className="hh-topbar">
          <Breadcrumb
            items={[
              { label: "Profile", href: "/profile" },
              { label: "Health Checks" },
            ]}
          />
        </div>

        <header className="hh-head">
          <p className="hh-eyebrow">Health Checks</p>
          <h1 className="hh-title">Your health check history</h1>
          <p className="hh-sub">
            Every symptom check you&apos;ve run, newest first. Tap any entry to
            revisit the full conversation.
          </p>
        </header>

        {checks.length === 0 ? (
          <div className="hh-empty">
            <ArtNoChecks width={140} />
            <p className="hh-empty-title">No health checks yet</p>
            <p className="hh-empty-sub">
              Run a symptom check to get quick, AI-guided triage for your pet.
              They&apos;ll show up here so you can look back anytime.
            </p>
            <Link href="/symptom-checker" className="hh-empty-btn">
              Start a health check
            </Link>
          </div>
        ) : (
          <>
            {/* Pet filter — only when there's more than one pet with checks */}
            {petsWithChecks.length > 1 && (
              <div
                className="hh-filter"
                role="tablist"
                aria-label="Filter by pet"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activePet === "all"}
                  className={`hh-pill${activePet === "all" ? " is-active" : ""}`}
                  onClick={() => setActivePet("all")}
                >
                  All pets
                </button>
                {petsWithChecks.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={activePet === p.id}
                    className={`hh-pill${activePet === p.id ? " is-active" : ""}`}
                    onClick={() => setActivePet(p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            <ol className="hh-list">
              {visibleChecks.map((c) => {
                const pet = petsById[c.pet_id];
                const tri = triageMeta(c.triage_result);
                const diffs = Array.isArray(c.differentials)
                  ? c.differentials
                  : [];
                const isOpen = expandedId === c.id;
                const transcript = isOpen ? parseTranscript(c.transcript) : [];
                return (
                  <li
                    key={c.id}
                    className={`hh-item${isOpen ? " is-open" : ""}`}
                  >
                    <button
                      type="button"
                      className="hh-row"
                      aria-expanded={isOpen}
                      onClick={() => setExpandedId(isOpen ? null : c.id)}
                    >
                      <span className="hh-pet">
                        {pet?.photo_url ? (
                          <img
                            src={pet.photo_url}
                            alt=""
                            className="hh-pet-photo"
                          />
                        ) : (
                          <span className="hh-pet-photo hh-pet-fallback">
                            {(() => {
                              const SpeciesIcon =
                                BANNER_LUCIDE[speciesBucket(pet?.species)] ||
                                PawPrint;
                              return <SpeciesIcon size={20} strokeWidth={2} />;
                            })()}
                          </span>
                        )}
                      </span>

                      <span className="hh-main">
                        <span className="hh-row-top">
                          <span className="hh-pet-name">
                            {pet?.name || "Unknown pet"}
                          </span>
                          <span
                            className="hh-triage"
                            style={{ color: tri.text }}
                          >
                            <span
                              className="hh-dot"
                              style={{ background: tri.dot }}
                            />
                            {tri.label}
                          </span>
                        </span>
                        <span className="hh-row-bottom">
                          <span
                            className="hh-date"
                            title={fullDate(c.created_at)}
                          >
                            {fullDate(c.created_at)} ·{" "}
                            {relativeTime(c.created_at)}
                          </span>
                          {diffs.length > 0 && (
                            <span className="hh-diffs">
                              {diffs
                                .slice(0, 3)
                                .map((d) =>
                                  typeof d === "string"
                                    ? d
                                    : d?.name || d?.label,
                                )
                                .filter(Boolean)
                                .map((label) => (
                                  <span className="hh-diff" key={label}>
                                    {label}
                                  </span>
                                ))}
                            </span>
                          )}
                        </span>
                      </span>

                      <span
                        className={`hh-chevron${isOpen ? " is-open" : ""}`}
                        aria-hidden="true"
                      >
                        <ChevronDown size={20} strokeWidth={2.2} />
                      </span>
                    </button>

                    {isOpen && (
                      <div className="hh-detail">
                        {diffs.length > 0 && (
                          <div className="hh-detail-diffs">
                            <p className="hh-detail-label">
                              Possible considerations:
                            </p>
                            <ul>
                              {diffs.map((d, i) => {
                                const name =
                                  typeof d === "string"
                                    ? d
                                    : d?.name || d?.label;
                                const note =
                                  typeof d === "object"
                                    ? d?.note || d?.description
                                    : null;
                                if (!name) return null;
                                return (
                                  <li key={i}>
                                    <span className="hh-diff-name">{name}</span>
                                    {note && (
                                      <span className="hh-diff-note">
                                        {" "}
                                        — {note}
                                      </span>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        {transcript.length > 0 ? (
                          <div className="hh-transcript">
                            <p className="hh-detail-label">Conversation</p>
                            {transcript.map((m, i) => {
                              const role =
                                m?.role ||
                                m?.from ||
                                (m?.isUser ? "user" : "bot");
                              const text =
                                m?.text || m?.content || m?.message || "";
                              if (!text) return null;
                              const mine = role === "user" || role === "human";
                              return (
                                <div
                                  key={i}
                                  className={`hh-msg${mine ? " hh-msg-user" : ""}`}
                                >
                                  {renderMarkdown(text, mine)}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="hh-no-transcript">
                            No conversation was saved for this check.
                          </p>
                        )}

                        {/* Co-pilot output that was generated for this check */}
                        <CheckCopilotData checkId={c.id} />

                        {/* Follow-up: starts a NEW check that receives this one
                            as context. Not a resumed conversation — a fresh
                            assessment that knows the history. */}
                        <div className="hh-followup">
                          <button
                            type="button"
                            className="hh-followup-btn"
                            onClick={() =>
                              router.push(
                                `/symptom-checker?followUp=${c.id}&petId=${c.pet_id}`,
                              )
                            }
                          >
                            <RefreshCw size={15} strokeWidth={2.2} />
                            Start a follow-up check
                          </button>
                          <p className="hh-followup-note">
                            Starts a new check for {pet?.name || "this pet"}{" "}
                            that includes what happened here as background.
                          </p>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>

      <style>{`
        .hh-page {
          min-height: calc(100vh - 64px);
          background: ${C.cream};
          font-family: var(--font-urbanist, 'Urbanist', sans-serif);
          color: ${C.navyDark};
        }
        .hh-container {
          max-width: 1040px;
          margin: 0 auto;
          padding: 0 24px 64px;
        }
        /* Records list runs the full 1040. Prose inside it doesn't:
           uncapped it reached 130ch at 1024px. */
        .hh-sub, .hh-empty-msg, 
        .hh-detail-body, 
        .hh-copilot p { 
          // max-width: 68ch; 
        }
        .hh-topbar { padding: 32px 0 0px; }
        .hh-topbar .bc-nav { margin-bottom: 20px; }

        .hh-head { padding: 8px 0 24px; }
        .hh-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: ${C.terracotta}; margin: 0 0 8px;
        }
        .hh-title { font-size: 28px; font-weight: 800; margin: 0 0 8px; letter-spacing: -0.01em; }
        .hh-sub { font-size: 15px; font-weight: 500; color: ${C.slate}; margin: 0; }

        /* Filter pills */
        .hh-filter { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 22px; }
        .hh-pill {
          display: inline-flex; align-items: center;
          padding: 7px 16px; border-radius: 999px; border: 1.5px solid ${C.borderStrong};
          background: ${C.white}; color: ${C.slate}; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .hh-pill:hover { border-color: ${C.terracotta}; color: ${C.terracotta}; }
        .hh-pill.is-active {
          background: ${C.navyDark}; border-color: ${C.navyDark}; color: #fff;
        }

        /* List */
        .hh-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 15px; }
        .hh-item {
          background: ${C.white}; border: 1px solid ${C.border}; border-radius: 14px;
          overflow: hidden;
          transition: box-shadow 0.18s, border-color 0.18s;
        }
        .hh-item:hover {
          border-color: rgba(239,200,139,0.9);
          box-shadow: 0 0 0 1px rgba(239,200,139,0.9), 0 8px 24px rgba(23,37,49,0.08);
        }
        .hh-item.is-open {
          border-color: rgba(239,200,139,0.9);
          box-shadow: 0 0 0 1px rgba(239,200,139,0.9), 0 8px 24px rgba(23,37,49,0.08);
        }
        /* align-items:flex-start on the row, not center. Centring the row tied
           the photo and the chevron together — both sat on the same vertical
           axis, so neither could be positioned independently. Each now sets
           its own alignment via align-self below. */
        .hh-row {
          width: 100%; display: flex; align-items: flex-start; gap: 14px;
          padding: 14px 16px; background: transparent; border: none; cursor: pointer;
          text-align: left; font-family: inherit;
        }
        .hh-row:hover { background: transparent; }

        /* .hh-pet is the wrapper that actually sits in .hh-row, so the
           alignment belongs here — align-self on the photo inside it has no
           effect, because the photo isn't a flex item of the row.
           Top-aligned at every width, matching the chevron on the other side,
           so the two ends of the row stay on the same line no matter how tall
           the middle grows when the condition pills wrap. */
        .hh-pet { display: flex; align-self: flex-start; flex: 0 0 auto; }
        .hh-pet-photo {
          width: 44px; height: 44px; border-radius: 50%; object-fit: cover;
          flex: 0 0 auto; display: block;
        }
        .hh-pet-fallback {
          display: flex; align-items: center; justify-content: center;
          background: ${C.navyDark}; color: rgba(255,255,255,0.85);
        }

        .hh-main { flex: 1 1 auto; min-width: 0; }
        .hh-row-top {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-bottom: 3px;
        }
        .hh-pet-name { font-size: 20px; font-weight: 800; color: ${C.navyDark}; }
        .hh-triage {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 16px; font-weight: 700; white-space: nowrap; flex: 0 0 auto;
        }
        .hh-dot { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; }

        .hh-row-bottom { display: flex; flex-direction: column; gap: 2px; }
        .hh-date { font-size: 16px; font-weight: 500; color: ${C.muted}; }
        /* Conditions as pills rather than one dot-separated line.
           The line was nowrap with an ellipsis, so on a phone it truncated and
           the last condition was never readable. Pills wrap instead, and two
           or three short ones often still sit on one line — so this costs less
           height than stacking them would.
           It also matches how the same conditions appear under "Could be" on
           the symptom checker result, which is where they come from. */
        .hh-diffs {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding-top: 6px;
        }
        .hh-diff {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          border-radius: 999px;
          background: ${C.cream};
          border: var(--pill-border-w, 2px) solid ${C.border};
          font-size: 14px;
          font-weight: 600;
          color: ${C.slate};
          line-height: 1.35;
        }

        /* Always top-aligned, at every width — it points at the row it opens,
           and a chevron drifting down a tall row loses that connection. */
        .hh-chevron { flex: 0 0 auto; align-self: flex-start; color: ${C.muted}; transition: transform 0.2s; display: flex; }
        .hh-chevron.is-open { transform: rotate(180deg); }

        /* Expanded detail */
        .hh-detail { padding: 4px 16px 18px; border-top: 1px solid ${C.border}; }
        .hh-detail-label {
          font-size: 16px; font-weight: 700; letter-spacing: 0.02em;
          text-transform: uppercase; color: ${C.muted}; margin: 14px 0 8px;
        }
        .hh-detail-diffs ul { margin: 0; padding: 0 0 0 22px; list-style: disc; }
        .hh-detail-diffs li { font-size: 14px; color: ${C.navyDark}; margin-bottom: 5px; line-height: 1.45; padding-left: 4px; }
        .hh-diff-name { font-weight: 700; }
        .hh-diff-note { color: ${C.slate}; font-weight: 500; }

        .hh-transcript { display: flex; flex-direction: column; gap: 15px; }
        .hh-msg {
          max-width: 85%; align-self: flex-start;
          background: ${C.cream}; color: ${C.navyDark};
          padding: 10px 13px; border-radius: 12px; border-top-left-radius: 4px;
          font-size: 15px; font-weight: 500; line-height: 1.65;
        }
        /* renderMarkdown emits <p>/<ul>/<ol> with their own spacing —
           strip the trailing margin so bubbles don't gain dead space. */
        .hh-msg > *:last-child { margin-bottom: 0 !important; }
        .hh-msg ul, .hh-msg ol { margin: 0 0 12px; padding-left: 20px; }
        .hh-msg li { margin-bottom: 4px; }
        .hh-msg-user {
          align-self: flex-end; background: ${C.navyDark}; color: #fff;
          border-top-left-radius: 12px; border-top-right-radius: 4px;
        }
        .hh-no-transcript { font-size: 14px; color: ${C.muted}; font-style: italic; margin: 12px 0 0; }

        /* ---- Co-pilot output on a past check ----
           Structure mirrors the triage card on the symptom checker so the
           same information reads identically on both surfaces. */
        .hh-copilot { margin-top: 20px; padding-top: 4px; border-top: 1px solid ${C.border}; }
        .hh-vets { display: flex; flex-direction: column; gap: 15px; }
        .hh-vet {
          background: ${C.white};
          border-radius: 12px;
          padding: 14px 16px;
          border: 1px solid ${C.border};
        }
        .hh-vet-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }
        .hh-vet-main { flex: 1; min-width: 0; }
        .hh-vet-name {
          margin: 0 0 5px; font-weight: 700; font-size: 16px;
          color: ${C.navyDark}; line-height: 1.3;
        }
        .hh-vet-city {
          margin: 0 0 5px; font-size: 15px; font-weight: 500; color: ${C.muted};
        }
        .hh-vet-reason {
          margin: 0 0 10px; font-size: 15px; font-weight: 500;
          color: ${C.navyDark}; line-height: 1.5; font-style: italic; opacity: 0.85;
        }
        .hh-vet-actions {
          display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
        }
        .hh-vet-phone {
          display: inline-flex; align-items: center; height: 35px; padding: 0 18px;
          border-radius: 12px; font-size: 14px; font-weight: 700;
          color: ${C.white}; background: ${C.terracotta}; text-decoration: none;
          border: 2px solid ${C.terracotta};
          transition: background 0.2s, color 0.2s;
        }
        .hh-vet-phone:hover { background: ${C.white}; color: ${C.terracotta}; }
        /* Price block — matches the chat estimate panel: tinted card, large
           bold amount, reasoning beneath. */
        .hh-vet-est-block {
          margin-top: 10px; padding: 14px 14px;
          background: #FFF7ED; border: 1px solid #FCD9B6;
          border-radius: 12px;
        }
        .hh-vet-est-amount {
          font-weight: 800; font-size: 16px; color: ${C.terracotta};
          font-family: var(--font-urbanist, 'Urbanist', sans-serif);
        }
        .hh-vet-est-reason {
          margin: 0 0 0; font-size: 14px; color: ${C.navyDark};
          line-height: 1.6; font-weight: 500;
        }
        .hh-vet-link {
          font-size: 13px; color: ${C.terracotta}; text-decoration: underline;
          white-space: nowrap; flex-shrink: 0; margin-top: 2px;
          font-weight: 700; transition: color 0.15s;
        }
        .hh-vet-link:hover { color: ${C.navyDark}; }
        .hh-copilot-note {
          margin: 12px 0 0; font-size: 13px; font-weight: 600;
          color: ${C.muted}; line-height: 1.5;
        }
        /* Mobile: stack like the chat card does — content full width,
           View profile drops beneath and left-aligns. */
        @media (max-width: 600px) {
          .hh-vet-row { flex-direction: column; align-items: stretch; }
          .hh-vet-link { align-self: flex-start; margin-top: 4px; }
        }

        /* ---- Follow-up ---- */
        .hh-followup { margin-top: 10px; padding-top: 20px; border-top: 1px solid ${C.border}; }
        .hh-followup-btn {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 8px; height: 42px; padding: 0 24px;
          background: ${C.white}; color: ${C.navyDark};
          border: 2px solid ${C.border}; border-radius: 12px;
          font-family: inherit; font-size: 15px; font-weight: 700;
          cursor: pointer;
          transition: background 0.2s, color 0.2s, border-color 0.2s;
        }
        .hh-followup-btn:hover {
          background: ${C.navyDark}; color: ${C.white}; border-color: ${C.navyDark};
        }
        .hh-followup-note {
          margin: 10px 0 0; font-size: 15px; font-weight: 600;
          color: ${C.muted}; line-height: 1.5;
        }
        @media (max-width: 600px) {
          .hh-followup-btn { width: 100%; }
        }

        /* Empty state */
        .hh-empty {
          text-align: center; padding: 56px 24px;
          background: ${C.white}; border: 1px solid ${C.border}; border-radius: 16px;
        }
        .hh-empty svg { margin-bottom: 14px; }
        .hh-empty-title { font-size: 19px; font-weight: 800; margin: 0 0 8px; }
        .hh-empty-sub {
          font-size: 15px; font-weight: 500; color: ${C.slate};
          margin: 0 auto 20px; max-width: 420px; line-height: 1.55;
        }
        .hh-empty-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 11px 22px; border-radius: 999px;
          background: ${C.terracotta}; color: #fff; border: 2px solid ${C.terracotta};
          font-size: 15px; font-weight: 700; text-decoration: none;
          transition: background 0.15s, color 0.15s;
        }
        .hh-empty-btn:hover { background: transparent; color: ${C.terracotta}; }

        @media (max-width: 768px) {
          .hh-container { padding: 0 16px 48px; }
          .hh-title { font-size: 24px; }
          .hh-row-top { flex-direction: column; align-items: flex-start; gap: 4px; }
        }
      `}</style>
    </div>
  );
}
