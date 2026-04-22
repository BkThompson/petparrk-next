"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

const C = {
  navyDark: "#172531",
  navyMid: "#2C4657",
  terracotta: "#CF5C36",
  gold: "#EFC88B",
  cream: "#F5F0E8",
  white: "#FFFFFF",
  slate: "#4B5563",
  muted: "#717A86",
  border: "#EDE8E0",
  error: "#C94040",
  success: "#2A7D4F",
};

function formatPrice(low, high, type) {
  if (!low) return null;
  if (type === "starting") return `$${Number(low).toLocaleString()}+`;
  if (type === "range" && low !== high)
    return `$${Number(low).toLocaleString()}–$${Number(high).toLocaleString()}`;
  return `$${Number(low).toLocaleString()}`;
}

function formatPhone(p) {
  if (!p) return null;
  const d = p.replace(/\D/g, "");
  if (d.length === 10)
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return p;
}

export default function SavedVets() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [vets, setVets] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/auth");
        return;
      }
      setSession(data.session);
      fetchSaved(data.session.user.id);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) router.push("/auth");
      else setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function fetchSaved(userId) {
    setLoading(true);
    const { data: saved } = await supabase
      .from("saved_vets")
      .select("vet_id")
      .eq("user_id", userId);

    if (!saved || saved.length === 0) {
      setVets([]);
      setLoading(false);
      return;
    }

    const vetIds = saved.map((s) => s.vet_id).filter(Boolean);

    const { data: vetData } = await supabase
      .from("vets")
      .select("*")
      .in("id", vetIds);

    if (!vetData) {
      setVets([]);
      setLoading(false);
      return;
    }

    const vetMap = {};
    vetData.forEach((v) => {
      vetMap[v.id] = v;
    });
    const vetList = vetIds.map((id) => vetMap[id]).filter(Boolean);

    const { data: priceData } = await supabase
      .from("vet_prices")
      .select("*, services(name)")
      .in("vet_id", vetIds);

    const priceMap = {};
    priceData?.forEach((p) => {
      if (!priceMap[p.vet_id]) priceMap[p.vet_id] = [];
      priceMap[p.vet_id].push(p);
    });

    setVets(vetList);
    setPrices(priceMap);
    setLoading(false);
  }

  async function handleUnsave(vetId) {
    if (!session) return;
    setRemovingId(vetId);
    await supabase
      .from("saved_vets")
      .delete()
      .eq("user_id", session.user.id)
      .eq("vet_id", vetId);
    setVets((prev) => prev.filter((v) => v.id !== vetId));
    setRemovingId(null);
  }

  const filtered = vets.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.neighborhood || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.city || "").toLowerCase().includes(search.toLowerCase()),
  );

  if (session === undefined || loading)
    return (
      <div
        style={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: C.cream,
        }}
      >
        <p style={{ color: C.muted, fontSize: "14px" }}>Loading…</p>
      </div>
    );

  return (
    <>
      <style>{`
        @keyframes heartPop { 0%{transform:scale(1)} 40%{transform:scale(1.3)} 100%{transform:scale(1)} }


        .sv-body { background: ${C.cream}; min-height: calc(100vh - 64px); padding: 48px 0 96px; }
        .sv-container { max-width: 900px; margin: 0 auto; padding: 0 24px; }


        .sv-search { width: 100%; padding: 13px 18px; border-radius: 12px; border: 1.5px solid ${C.border}; font-size: 15px; font-family: var(--font-urbanist,'Urbanist',sans-serif); background: ${C.white}; color: ${C.navyDark}; outline: none; box-sizing: border-box; transition: border-color 0.15s; }
        .sv-search:focus { border-color: ${C.terracotta}; }
        .sv-search::placeholder { color: ${C.muted}; }


        .sv-list { background: ${C.white}; border: 1px solid ${C.border}; border-radius: 16px; overflow: hidden; }


        /* Row — 3 columns: left | middle | right */
        .sv-row {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          padding: 20px 24px;
          position: relative;
          transition: background 0.15s;
          min-height: 80px;
        }
        .sv-row-divider { padding: 0 24px; }
        .sv-row-divider-line { height: 1px; background: ${C.border}; }
        .sv-row::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: ${C.terracotta}; opacity: 0; transition: opacity 0.15s; border-radius: 0 2px 2px 0; }
        .sv-row:hover { background: #fafaf8; }
        .sv-row:hover::before { opacity: 1; }


        /* Left column */
        .sv-left { padding-right: 20px; min-width: 0; display: flex; flex-direction: column; justify-content: flex-start; }
        .sv-name-link { text-decoration: none; display: block; }
        .sv-name-link:hover .sv-name { color: ${C.terracotta}; }
        .sv-name { font-size: 15px; font-weight: 700; color: ${C.navyDark}; font-family: var(--font-urbanist,'Urbanist',sans-serif); margin: 0 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sv-meta { font-size: 13px; color: ${C.muted}; margin: 0 0 2px; line-height: 1.5; }
        .sv-meta-link { font-size: 13px; color: ${C.terracotta}; margin: 0 0 2px; line-height: 1.5; text-decoration: none; }
        .sv-meta-link:hover { text-decoration: underline; }


        /* Middle column — vertical divider via border-left */
        .sv-middle {
          padding: 0 20px;
          border-left: 1px solid ${C.border};
          margin: 4px 0;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          gap: 10px;
          min-width: 0;
        }


        /* Accepting badge */
        .sv-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; white-space: nowrap; width: fit-content; }
        .sv-badge-ok { background: #EDFAF3; color: ${C.success}; }
        .sv-badge-no { background: #FCEAEA; color: ${C.error}; }


        /* Price chips */
        .sv-chip { display: inline-flex; align-items: center; gap: 5px; background: ${C.cream}; border-radius: 6px; padding: 4px 10px; font-size: 13px; white-space: nowrap; width: fit-content; }
        .sv-chip-label { color: ${C.muted}; font-weight: 500; }
        .sv-chip-value { color: ${C.terracotta}; font-weight: 700; }


        /* Right column — heart top, View centered */
        .sv-right {
          display: flex;
          align-items: flex-start;
          justify-content: flex-end;
          padding-left: 16px;
          position: relative;
          align-self: flex-start;
        }
        .sv-unsave-wrap {
          position: absolute;
          top: 0;
          right: 0;
        }


        /* Unsave */
        .sv-unsave { background: none; border: none; cursor: pointer; font-size: 16px; line-height: 1; padding: 0; transition: transform 0.15s; }
        .sv-unsave:hover { transform: scale(1.2); }
        .sv-unsave.removing { animation: heartPop 0.3s ease forwards; opacity: 0.5; pointer-events: none; }






        /* Empty / no results */
        .sv-empty { text-align: center; padding: 80px 24px; }
        .sv-empty-icon { font-size: 48px; margin-bottom: 16px; }
        .sv-empty-title { font-size: 20px; font-weight: 800; color: ${C.navyDark}; margin: 0 0 8px; font-family: var(--font-urbanist,'Urbanist',sans-serif); }
        .sv-empty-sub { font-size: 15px; color: ${C.muted}; margin: 0 0 28px; line-height: 1.7; }
        .sv-browse-btn { display: inline-flex; align-items: center; justify-content: center; height: 48px; padding: 0 28px; background: ${C.terracotta}; color: #fff; border: 2px solid ${C.terracotta}; border-radius: 12px; font-size: 15px; font-weight: 700; text-decoration: none; font-family: var(--font-urbanist,'Urbanist',sans-serif); transition: background 0.2s, color 0.2s; }
        .sv-browse-btn:hover { background: #fff; color: ${C.terracotta}; }


        /* Mobile */
        @media(max-width: 600px) {
          .sv-body { padding: 32px 0 80px; }
          .sv-row {
            grid-template-columns: 1fr auto;
            grid-template-rows: auto;
            padding: 16px 18px;
          }
          .sv-left { grid-column: 1; padding-right: 12px; }
          .sv-middle { display: none; }
          .sv-right { grid-column: 2; padding-left: 12px; }


          /* Mobile: show accepting + chips inside left column */
          .sv-mob-extra { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
        .sv-mob-chips { display: flex; flex-direction: row; flex-wrap: wrap; gap: 6px; }
          .sv-name { font-size: 14px; }
        }
        @media(min-width: 601px) {
          .sv-mob-extra { display: none; }
        }
      
        .nav-link-dark:hover { color:#172531 !important; }
      `}</style>

      <div className="sv-body">
        <div className="sv-container">
          {/* Page title */}
          <div style={{ marginBottom: "28px" }}>
            <p
              style={{
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: C.muted,
                marginBottom: "8px",
                fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
              }}
            >
              Your Account
            </p>
            <h1
              style={{
                fontSize: "clamp(22px,3vw,30px)",
                fontWeight: "800",
                color: C.navyDark,
                margin: "0 0 4px",
                fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
                letterSpacing: "-0.02em",
              }}
            >
              Saved Vets
            </h1>
            <p style={{ fontSize: "14px", color: C.muted, margin: 0 }}>
              {vets.length > 0
                ? `${vets.length} vet${vets.length !== 1 ? "s" : ""} saved`
                : "Your saved vets will appear here."}
            </p>
          </div>

          {/* Search */}
          {vets.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <input
                type="text"
                className="sv-search"
                placeholder="Search your saved vets…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}

          {/* Empty state */}
          {vets.length === 0 && (
            <div className="sv-list">
              <div className="sv-empty">
                <div className="sv-empty-icon">🤍</div>
                <h2 className="sv-empty-title">No saved vets yet</h2>
                <p className="sv-empty-sub">
                  Browse the vet directory and tap the heart icon
                  <br />
                  on any vet to save them here.
                </p>
                <Link href="/vets" className="sv-browse-btn">
                  Browse Vets →
                </Link>
              </div>
            </div>
          )}

          {/* No search results */}
          {vets.length > 0 && filtered.length === 0 && (
            <div className="sv-list">
              <div className="sv-empty">
                <div className="sv-empty-icon">🔍</div>
                <h2 className="sv-empty-title">No results</h2>
                <p className="sv-empty-sub">No saved vets match "{search}".</p>
              </div>
            </div>
          )}

          {/* Vet list */}
          {filtered.length > 0 && (
            <div className="sv-list">
              {filtered.map((vet) => {
                const vp = prices[vet.id] || [];
                const exam = vp.find(
                  (p) => p.services?.name === "Doctor Exam" && p.price_low,
                );
                const dental = vp.find(
                  (p) => p.services?.name === "Dental Cleaning" && p.price_low,
                );
                const location = [vet.neighborhood, vet.city]
                  .filter(Boolean)
                  .join(" · ");
                const isRemoving = removingId === vet.id;

                return (
                  <div key={vet.id}>
                    {filtered.indexOf(vet) > 0 && (
                      <div className="sv-row-divider">
                        <div className="sv-row-divider-line" />
                      </div>
                    )}
                    <div className="sv-row">
                      {/* Left: name, location, phone, website */}
                      <div className="sv-left">
                        <Link
                          href={`/vet/${vet.slug}`}
                          className="sv-name-link"
                        >
                          <p className="sv-name">{vet.name}</p>
                        </Link>
                        {location && <p className="sv-meta">{location}</p>}
                        {vet.phone && (
                          <p className="sv-meta">
                            <a
                              href={`tel:${vet.phone}`}
                              style={{ color: C.muted, textDecoration: "none" }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {formatPhone(vet.phone)}
                            </a>
                          </p>
                        )}
                        {vet.website && (
                          <a
                            href={`https://${vet.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sv-meta-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {vet.website} ↗
                          </a>
                        )}

                        {/* Mobile only: accepting + chips */}
                        <div className="sv-mob-extra">
                          {vet.accepting_new_patients === true && (
                            <span className="sv-badge sv-badge-ok">
                              ✅ Accepting
                            </span>
                          )}
                          {vet.accepting_new_patients === false && (
                            <span className="sv-badge sv-badge-no">
                              ✕ Not Accepting
                            </span>
                          )}
                          {(exam || dental) && (
                            <div className="sv-mob-chips">
                              {exam && (
                                <span className="sv-chip">
                                  <span className="sv-chip-label">Exam</span>
                                  <span className="sv-chip-value">
                                    {formatPrice(
                                      exam.price_low,
                                      exam.price_high,
                                      exam.price_type,
                                    )}
                                  </span>
                                </span>
                              )}
                              {dental && (
                                <span className="sv-chip">
                                  <span className="sv-chip-label">Dental</span>
                                  <span className="sv-chip-value">
                                    {formatPrice(
                                      dental.price_low,
                                      dental.price_high,
                                      dental.price_type,
                                    )}
                                  </span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Middle: accepting + chips (desktop only) */}
                      <div className="sv-middle">
                        {vet.accepting_new_patients === true && (
                          <span className="sv-badge sv-badge-ok">
                            ✅ Accepting
                          </span>
                        )}
                        {vet.accepting_new_patients === false && (
                          <span className="sv-badge sv-badge-no">
                            ✕ Not Accepting
                          </span>
                        )}
                        {exam && (
                          <span className="sv-chip">
                            <span className="sv-chip-label">Exam</span>
                            <span className="sv-chip-value">
                              {formatPrice(
                                exam.price_low,
                                exam.price_high,
                                exam.price_type,
                              )}
                            </span>
                          </span>
                        )}
                        {dental && (
                          <span className="sv-chip">
                            <span className="sv-chip-label">Dental</span>
                            <span className="sv-chip-value">
                              {formatPrice(
                                dental.price_low,
                                dental.price_high,
                                dental.price_type,
                              )}
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Right: heart only */}
                      <div className="sv-right">
                        <div className="sv-unsave-wrap">
                          <button
                            className={`sv-unsave${isRemoving ? " removing" : ""}`}
                            onClick={() => handleUnsave(vet.id)}
                            title="Remove from saved"
                            aria-label="Remove from saved"
                          >
                            ❤️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Browse more */}
          {vets.length > 0 && (
            <div style={{ textAlign: "right", marginTop: "20px" }}>
              <Link
                href="/vets"
                className="nav-link-dark"
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  color: C.terracotta,
                  textDecoration: "none",
                }}
              >
                Browse more vets →
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
