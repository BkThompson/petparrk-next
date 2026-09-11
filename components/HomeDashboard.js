"use client";

// =============================================================
// components/HomeDashboard.js — the logged-in homepage strip.
//
// Renders above the marketing/vet sections when a user is signed in,
// turning the homepage into a "daily companion" surface. Everything it
// shows is driven by the SAME level system the profile uses
// (lib/levelSystem computeLevelState), so the tier/level/XP a user sees
// here always matches their profile and the signup modal.
//
// Sections:
//   1. Welcome + tier badge + XP progress toward next level
//   2. Quick actions (Check symptoms / Add a pet / Find a vet)
//   3. My pets — each with its last symptom-check result (🔴/🟡/🟢 + date)
//   4. Saved vets (compact) — data passed in from Home (already fetched)
//
// Design tokens match the rest of the app (Palette D, Urbanist).
// =============================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import {
  computeLevelState,
  computeCareCompleteCount,
} from "../lib/levelSystem";
import { ArtEmptyPets } from "./BrandArt";
import {
  Stethoscope,
  PlusCircle,
  Search,
  ArrowRight,
  ChevronRight,
} from "lucide-react";

const C = {
  navyDark: "#172531",
  terracotta: "#CF5C36",
  gold: "#EFC88B",
  cream: "#F5F0E8",
  border: "#EDE8E0",
  borderStrong: "#DAD3C5",
  muted: "#717A86",
  slate: "#4B5563",
};

const SESSION_KEY = "petparrk_symptom_session";

// Map a triage result code to an emoji + label (mirrors symptom checker).
function triageDisplay(result) {
  if (result === "EMERGENCY") return { emoji: "🔴", label: "Emergency" };
  if (result === "SEE_VET") return { emoji: "🟡", label: "See vet soon" };
  if (result === "MONITOR") return { emoji: "🟢", label: "Monitor at home" };
  return null;
}

export default function HomeDashboard({ session, savedVets = [] }) {
  const [profile, setProfile] = useState(null);
  const [pets, setPets] = useState([]);
  const [lastChecks, setLastChecks] = useState({}); // { petId: checkRow }
  const [levelState, setLevelState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;
    const uid = session.user.id;

    async function load() {
      try {
        // Fetch profile, pets, and the counts the level system needs.
        const [
          profileRes,
          petsRes,
          savedCountRes,
          checksCountRes,
          verifiedRes,
        ] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", uid).single(),
          supabase.from("pets").select("*").eq("owner_id", uid),
          supabase
            .from("saved_vets")
            .select("*", { count: "exact", head: true })
            .eq("user_id", uid),
          supabase
            .from("symptom_checks")
            .select("*", { count: "exact", head: true })
            .eq("owner_id", uid),
          supabase
            .from("price_submissions")
            .select("*", { count: "exact", head: true })
            .eq("user_id", uid)
            .eq("status", "approved"),
        ]);

        if (cancelled) return;

        const profileData = profileRes.data || null;
        const petsData = petsRes.data || [];
        setProfile(profileData);
        setPets(petsData);

        // Last symptom check per pet (most recent).
        const petIds = petsData.map((p) => p.id);
        const checkMap = {};
        if (petIds.length > 0) {
          const { data: checks } = await supabase
            .from("symptom_checks")
            .select("*")
            .eq("owner_id", uid)
            .order("created_at", { ascending: false });
          if (checks) {
            checks.forEach((chk) => {
              if (chk.pet_id && !checkMap[chk.pet_id])
                checkMap[chk.pet_id] = chk;
            });
          }
        }
        if (cancelled) return;
        setLastChecks(checkMap);

        // Care-complete count (async DB computation, same as profile).
        let careCount = 0;
        try {
          careCount = await computeCareCompleteCount(supabase, petIds);
        } catch (e) {
          careCount = 0;
        }
        if (cancelled) return;

        // Distinct pets that have at least one check (from the fresh map).
        const checkedPetIds = Object.keys(checkMap);

        const heroPublished = petsData.some((p) => p.hero_is_published);

        // Compute level state from the SAME source of truth as the profile.
        const state = computeLevelState({
          pets: petsData,
          profile: profileData,
          counts: {
            checks: checksCountRes.count || 0,
            saved: savedCountRes.count || 0,
            verifiedSubmissions: verifiedRes.count || 0,
            checkedPetIds,
            heroPublished,
            careComplete: careCount > 0,
            careCompleteCount: careCount,
          },
          session,
        });
        if (!cancelled) setLevelState(state);
      } catch (e) {
        // Fail quiet — dashboard just won't show level data.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const firstName = (
    profile?.full_name ||
    session?.user?.user_metadata?.full_name ||
    ""
  )
    .trim()
    .split(" ")[0];

  const tier = levelState?.tier || null;
  const progress = levelState?.progress || null;
  const level = levelState?.level ?? 0;

  // Start a fresh symptom check for a given pet (mirrors profile behavior).
  // Resume a past symptom-check session for this pet.
  function resumeCheck(pet, chk) {
    try {
      const t = JSON.parse(chk.transcript || "[]");
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          selectedPet: pet,
          messages: t,
          triageResult: chk.triage_result,
          differentials: chk.differentials || [],
          guestMode: false,
          freeCheckUsed: false,
        }),
      );
    } catch (e) {}
    window.location.href = "/symptom-checker/chat";
  }

  function startCheckForPet(pet) {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          selectedPet: pet,
          messages: [],
          triageResult: null,
          differentials: [],
          guestMode: false,
          freeCheckUsed: false,
          autoStart: true,
        }),
      );
    } catch (e) {}
    window.location.href = "/symptom-checker/chat";
  }

  return (
    <section className="hd-band">
      <div className="pp-container hd-wrap">
        <style>{`
        .hd-band { background: #fff; border-bottom: 1px solid ${C.border}; }
        .hd-wrap { padding-top: 40px; padding-bottom: 48px; font-family: var(--font-urbanist,'Urbanist',sans-serif); }
        .hd-greeting { font-size: 26px; font-weight: 800; color: ${C.navyDark}; margin: 0 0 2px; letter-spacing: -0.01em; }
        .hd-sub { font-size: 15px; color: ${C.muted}; margin: 0 0 22px; font-weight: 500; }
        .hd-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 16px; margin-bottom: 16px; }
        .hd-card { background: #fff; border: 1px solid ${C.border}; border-radius: 18px; padding: 22px; box-shadow: 0 2px 10px rgba(23,37,49,0.05); }
        .hd-card-list { padding-bottom: 7px; }
        .hd-card-title { font-size: 13px; font-weight: 700; color: ${C.muted}; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 14px; }
        .hd-card-title-pets { margin-bottom: 0; }

        /* Tier + progress */
        .hd-tier-row { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
        .hd-tier-badge { width: 52px; height: 52px; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .hd-tier-name { font-size: 20px; font-weight: 800; color: ${C.navyDark}; margin: 0; line-height: 1.1; }
        .hd-tier-level { font-size: 14px; color: ${C.muted}; font-weight: 600; margin: 2px 0 0; }
        .hd-bar-track { height: 8px; background: ${C.border}; border-radius: 100px; overflow: hidden; }
        .hd-bar-fill { height: 100%; background: ${C.terracotta}; border-radius: 100px; transition: width 0.6s ease; }
        .hd-bar-label { font-size: 13px; color: ${C.muted}; font-weight: 600; margin-top: 8px; display: flex; justify-content: space-between; }

        /* Quick actions */
        .hd-actions { display: flex; flex-direction: column; gap: 10px; }
        .hd-action { display: flex; align-items: center; gap: 12px; padding: 13px 16px; border-radius: 12px; border: 1px solid ${C.border}; background: #fff; color: ${C.navyDark}; text-decoration: none; font-size: 16px; font-weight: 700; transition: border-color 0.15s, background 0.15s, transform 0.1s; }
        .hd-action:hover { border-color: ${C.terracotta}; background: ${C.cream}; transform: translateY(-1px); }
        .hd-action-icon { color: ${C.terracotta}; display: inline-flex; flex-shrink: 0; }
        .hd-action-arrow { margin-left: auto; color: ${C.muted}; display: inline-flex; }

        /* Pets */
        .hd-pets { display: flex; flex-direction: column; }
        .hd-pet { display: flex; align-items: center; gap: 16px; padding: 16px 0; transition: background 0.15s; }
        .hd-pet + .hd-pet { border-top: 1px solid ${C.border}; }
        .hd-pet-top { display: flex; align-items: center; gap: 16px; flex: 1; min-width: 0; }
        .hd-pet-photo { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; flex-shrink: 0; background: ${C.cream}; border: 2px solid ${C.border}; }
        .hd-pet-info { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .hd-pet-name { font-size: 20px; font-weight: 700; color: ${C.navyDark}; margin: 0; line-height: 1.15; }
        .hd-pet-breed { font-size: 16px; font-weight: 500; color: ${C.muted}; margin: 0; line-height: 1.2; }
        .hd-pet-check { display: flex; flex-direction: column; gap: 2px; margin: 0; }
        .hd-check-label { font-size: 13px; font-weight: 700; color: ${C.muted}; text-transform: uppercase; font-family: var(--font-urbanist,'Urbanist',sans-serif); margin-top: 5px; }
        .hd-check-none { font-size: 16px; color: ${C.muted}; font-weight: 500; }
        .hd-pet-check-link { font-size: 16px; color: ${C.terracotta}; cursor: pointer; font-weight: 600;  text-underline-offset: 2px; width: fit-content; }
        .hd-pet-check-link:hover { color: #a8471d; text-decoration: underline; }
        .hd-pet-cta { flex-shrink: 0; min-height: 44px; font-size: 14px; font-weight: 700; color: ${C.terracotta}; cursor: pointer; background: none; border: none; font-family: inherit; white-space: nowrap; display: inline-flex; align-items: center; gap: 3px; transition: color 0.15s, transform 0.15s; }
        .hd-pet-cta:hover { color: #a8471d; transform: translateX(3px); }
        .hd-empty { text-align: center; padding: 24px 20px 32px; color: ${C.slate}; }
        .hd-empty-msg { font-size: 16px; font-weight: 500; line-height: 1.55; color: ${C.slate}; margin: 0; }
        .hd-empty-cta { display: inline-flex; align-items: center; justify-content: center; height: 42px; margin-top: 12px; padding: 0 24px; background: ${C.navyDark}; color: #fff; border: 2px solid ${C.navyDark}; border-radius: 12px; text-decoration: none; font-size: 15px; font-weight: 700; transition: background 0.15s, color 0.15s; }
        .hd-empty-cta:hover { background: #fff; color: ${C.navyDark}; border: 2px solid ${C.navyDark}; }

        /* Saved vets compact */
        .hd-saved { display: flex; flex-direction: column; }
        .hd-saved-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 4px; }
        .hd-saved-item + .hd-saved-item { border-top: 1px solid ${C.border}; }
        .hd-saved-link { font-size: 16px; font-weight: 600; color: ${C.navyDark}; text-decoration: none; transition: color 0.15s; }
        .hd-saved-chev { display: inline-flex; align-items: center; color: ${C.muted}; text-decoration: none; transition: color 0.15s, transform 0.15s; }
        .hd-saved-link:hover { color: ${C.terracotta}; }
        .hd-saved-chev:hover { color: ${C.terracotta}; transform: translateX(2px); }
        .hd-see-all { display: inline-flex; align-items: center; min-height: 44px; font-size: 13px; font-weight: 700; color: ${C.terracotta}; text-decoration: none; text-transform: none; letter-spacing: 0; }
        .hd-see-all:hover { color: ${C.navyDark}; }

        /* Page tier — matches the site boundary in globals.css so the
           dashboard's gutter flips at the same width as every other
           section on the homepage. Horizontal padding comes from
           .pp-container; never set it here. */
        @media (max-width: 768px) {
          .hd-wrap { padding-bottom: 4px; }
          .hd-greeting { font-size: 22px; }
        }

        /* Component collapse — the two top cards hold up as a pair down to
           ~314px / 265px tracks, so they stay side by side through the
           whole tablet range and only stack on phones. */
        @media (max-width: 640px) {
          .hd-grid { grid-template-columns: 1fr; }
          /* Phone pet card: photo + [name/breed/last-check] stacked in the
             info column, then "Check now" on its own row, right-aligned. */
          .hd-pet { display: grid; grid-template-columns: 1fr; grid-template-rows: auto auto; gap: 0; padding: 16px 0; }
          .hd-pet-top { grid-row: 1; align-items: flex-start; }
          .hd-pet-cta { grid-row: 2; justify-self: end; padding-top: 15px; padding-left: 76px; }
        }
      `}</style>

        <h1 className="hd-greeting">
          {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        </h1>
        <p className="hd-sub">Here's how your pack is doing today.</p>

        <div className="hd-grid">
          {/* Tier + progress card */}
          <div className="hd-card">
            <p className="hd-card-title">Your standing</p>
            {tier ? (
              <>
                <div className="hd-tier-row">
                  <span
                    className="hd-tier-badge"
                    style={{
                      background: `linear-gradient(160deg, ${tier.stops[0]} 0%, ${tier.stops[1]} 30%, ${tier.stops[2]} 70%, ${tier.stops[3]} 100%)`,
                    }}
                  >
                    {tier.icon ? (
                      <tier.icon size={26} strokeWidth={2} color={tier.text} />
                    ) : null}
                  </span>
                  <div>
                    <p className="hd-tier-name">{tier.name}</p>
                    <p className="hd-tier-level">Level {level}</p>
                  </div>
                </div>
                {progress && progress.nextLevel ? (
                  <>
                    <div className="hd-bar-track">
                      <div
                        className="hd-bar-fill"
                        style={{ width: `${progress.pct || 0}%` }}
                      />
                    </div>
                    <div className="hd-bar-label">
                      <span>{progress.pct || 0}% to next level</span>
                      <span>
                        {progress.earnedXp}/{progress.totalXp} XP
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="hd-tier-level" style={{ marginTop: 4 }}>
                    You've reached the top of the pack. 🏔️
                  </p>
                )}
              </>
            ) : (
              <p className="hd-tier-level">
                {loading
                  ? "\u00A0"
                  : "Start building your pet's profile to level up."}
              </p>
            )}
          </div>

          {/* Quick actions card */}
          <div className="hd-card">
            <p className="hd-card-title">Quick actions</p>
            <div className="hd-actions">
              <Link href="/symptom-checker" className="hd-action">
                <span className="hd-action-icon">
                  <Stethoscope size={20} strokeWidth={2} />
                </span>
                Check symptoms
                <span className="hd-action-arrow">
                  <ArrowRight size={17} strokeWidth={2.2} />
                </span>
              </Link>
              <Link href="/profile" className="hd-action">
                <span className="hd-action-icon">
                  <PlusCircle size={20} strokeWidth={2} />
                </span>
                Add a pet
                <span className="hd-action-arrow">
                  <ArrowRight size={17} strokeWidth={2.2} />
                </span>
              </Link>
              <Link href="/vets" className="hd-action">
                <span className="hd-action-icon">
                  <Search size={20} strokeWidth={2} />
                </span>
                Find a vet
                <span className="hd-action-arrow">
                  <ArrowRight size={17} strokeWidth={2.2} />
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* My pets card */}
        <div className="hd-card hd-card-list" style={{ marginBottom: 16 }}>
          <p className="hd-card-title hd-card-title-pets">My pets</p>
          {pets.length > 0 ? (
            <div className="hd-pets">
              {pets.map((pet) => {
                const chk = lastChecks[pet.id];
                const td = chk ? triageDisplay(chk.triage_result) : null;
                const dateStr = chk
                  ? new Date(chk.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : null;
                return (
                  <div key={pet.id} className="hd-pet">
                    <div className="hd-pet-top">
                      {pet.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="hd-pet-photo"
                          src={pet.photo_url}
                          alt={pet.name}
                        />
                      ) : (
                        <span
                          className="hd-pet-photo"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 24,
                          }}
                        >
                          🐾
                        </span>
                      )}
                      <div className="hd-pet-info">
                        <p className="hd-pet-name">{pet.name}</p>
                        {pet.breed ? (
                          <p className="hd-pet-breed">{pet.breed}</p>
                        ) : null}
                        {td ? (
                          <div className="hd-pet-check">
                            <span className="hd-check-label">Last check:</span>
                            <span
                              className="hd-pet-check-link"
                              onClick={() => resumeCheck(pet, chk)}
                            >
                              {td.emoji} {td.label} · {dateStr}
                            </span>
                          </div>
                        ) : (
                          <div className="hd-pet-check">
                            <span className="hd-check-label">Last check:</span>
                            <span className="hd-check-none">No checks yet</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      className="hd-pet-cta"
                      onClick={() => startCheckForPet(pet)}
                    >
                      Check now
                      <ChevronRight size={16} strokeWidth={2.4} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="hd-empty">
              <ArtEmptyPets width={140} />
              <p className="hd-empty-msg">You haven't added any pets yet.</p>
              <Link href="/profile?add=1" className="hd-empty-cta">
                + Add your first pet
              </Link>
            </div>
          )}
        </div>

        {/* Saved vets card — only if there are any */}
        {savedVets && savedVets.length > 0 ? (
          <div className="hd-card hd-card-list" style={{ marginBottom: 16 }}>
            <p
              className="hd-card-title"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Saved vets</span>
              <Link href="/saved" className="hd-see-all">
                See all
              </Link>
            </p>
            <div className="hd-saved">
              {savedVets.slice(0, 4).map((v) => {
                const vetHref = v.slug ? `/vet/${v.slug}` : "/vets";
                return (
                  <div key={v.id} className="hd-saved-item">
                    <Link href={vetHref} className="hd-saved-link">
                      {v.name}
                    </Link>
                    <Link
                      href={vetHref}
                      className="hd-saved-chev"
                      aria-label={`View ${v.name}`}
                    >
                      <ChevronRight size={18} strokeWidth={2} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
