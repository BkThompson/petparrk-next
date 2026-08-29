"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import {
  Camera,
  X,
  Plus,
  Lock,
  PawPrint,
  ArrowRight,
  Check,
  ChevronDown,
} from "lucide-react";
import PageLoader from "../../components/PageLoader";
import { useUnsavedChanges } from "../../components/UnsavedChangesModal";
import { useProfileState } from "../../lib/useProfileState";
import {
  formatJoinDate,
  handlePhoneInput,
  relativeTimeShort,
  triageLabel,
} from "../../lib/profileUtils";
import PetFormCard from "../../components/PetFormCard";
import ProfileEditForm from "../../components/ProfileEditForm";
import { profileCss } from "../../lib/profileStyles";
import HeroWallpaper from "../../components/HeroWallpaper";
import CommunityContributions from "../../components/CommunityContributions";
import InlineSubmitPriceForm from "../../components/InlineSubmitPriceForm";
import {
  BadgeCelebration,
  BadgeCelebrationStyles,
} from "../../components/BadgeCelebration";
import PetTile, { PetTileStyles } from "../../components/PetTile";
import {
  BANNER_PALETTE,
  C,
  autoBannerKey,
  petWeightChanged,
} from "../../lib/petTileHelpers";
import {
  TIERS,
  tierGradient,
  fullPetProfile,
  memberDays,
  calculateLevel,
  computeLevelState,
  buildLadderView,
  tierForLevel,
  computeCareCompleteCount,
} from "../../lib/levelSystem";
import LevelProgress from "../../components/LevelProgress";

export default function ProfilePage() {
  const {
    session,
    profile,
    pets,
    loading,
    cityState,
    latestChecks,
    checkedPetIds,
    counts,
    careCompleteCount,
    heroPublished,
    editingProfile,
    showAddPet,
    justSavedPet,
    editingPetId,
    showLevelModal,
    expandedTiers,
    celebrate,
    showInlineSubmit,
    usernameError,
    profileForm,
    petForm,
    microchipError,
    pendingPetPhoto,
    saving,
    uploadingPhoto,
    uploadingPetPhoto,
    convertingPhoto,
    setSession,
    setProfile,
    setPets,
    setLoading,
    setCityState,
    setLatestChecks,
    setCheckedPetIds,
    setCounts,
    setCareCompleteCount,
    setHeroPublished,
    setEditingProfile,
    setShowAddPet,
    setJustSavedPet,
    setEditingPetId,
    setShowLevelModal,
    setExpandedTiers,
    setCelebrate,
    setShowInlineSubmit,
    setUsernameError,
    setProfileForm,
    setPetForm,
    setMicrochipError,
    setPendingPetPhoto,
    setSaving,
    setUploadingPhoto,
    setUploadingPetPhoto,
    setConvertingPhoto,
    fileInputRef,
    petPhotoRefs,
    newPetPhotoRef,
    formAreaRef,
    petFormRef,
    packSectionRef,
    inlineSubmitRef,
    submitCtaRef,
    closeAllEditing,
    closeSubmitForm,
    scrollToForm,
    scrollToPack,
    startAddPet,
    startEditPet,
    handleDeletePet,
    handleNewPetPhotoPreview,
    handlePhotoUpload,
    handlePetPhotoUpload,
    handleViewSymptomCheck,
    handleSaveProfile,
    handleSavePet,
    router,
    showToast,
    emptyPetForm,
  } = useProfileState();

  // Local: collapses the "Submit a vet price" toggle while the form's success
  // card is showing, so the two don't compete. Resets whenever the form closes.
  const [priceSubmitted, setPriceSubmitted] = useState(false);
  useEffect(() => {
    if (!showInlineSubmit) setPriceSubmitted(false);
  }, [showInlineSubmit]);
  const searchParams = useSearchParams();
  const previewMode = searchParams.get("preview") === "public";

  // Product-depth signals for the XP gates (computed in the load effect).

  const { confirmUnsaved, unsavedModal } = useUnsavedChanges();
  // Which tiers are expanded in the level modal (collapsible). The current
  // tier auto-expands; users can toggle others.
  // One-shot celebration payload passed to LevelProgress when the owner
  // levels up (new computed level > previously cached level).
  // Lock background scroll while the level modal is open (same pattern as
  // UnsavedChangesModal — site-standard, compensates for scrollbar width).
  useEffect(() => {
    if (!showLevelModal) return;
    const body = document.body;
    const scrollBarComp =
      window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPadRight = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (scrollBarComp > 0) {
      body.style.paddingRight = `${scrollBarComp}px`;
    }
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadRight;
    };
  }, [showLevelModal]);

  // Is the profile edit form changed vs the saved profile? Drives the
  // unsaved-changes warning before discarding.
  function isProfileDirty() {
    if (!editingProfile) return false;
    const p = profile || {};
    return (
      (profileForm.full_name || "") !== (p.full_name || "") ||
      (profileForm.username || "") !== (p.username || "") ||
      (profileForm.bio || "") !== (p.bio || "") ||
      (profileForm.zip_code || "") !== (p.zip_code || "") ||
      !!profileForm.is_public !== !!p.is_public ||
      profileForm.show_location_public !== (p.show_location_public !== false) ||
      profileForm.show_bio_public !== (p.show_bio_public !== false) ||
      (profileForm.banner_color || "auto") !== (p.banner_color || "auto")
    );
  }
  // Standardized unsaved-changes guard (matches Hero & Care): if there are
  // unsaved edits, ask "Save them before leaving?" — OK saves, Cancel discards.
  // Returns true once it's OK to proceed with closing the form.
  async function confirmDiscardProfile() {
    if (!isProfileDirty()) return true;
    const choice = await confirmUnsaved();
    if (choice === "keep") return false; // dismissed — keep editing
    if (choice === "save") {
      // Only proceed (close) if the save actually succeeded; on failure
      // (e.g. taken username) keep the form open with edits intact.
      return await handleSaveProfile();
    }
    // Discard — proceed to close, dropping the edits.
    return true;
  }
  // Is the pet add/edit form changed vs its starting values?
  function isPetDirty() {
    if (!showAddPet && !editingPetId) return false;
    const base = editingPetId
      ? pets.find((p) => p.id === editingPetId) || {}
      : emptyPetForm;
    const keys = Object.keys(emptyPetForm);
    return keys.some((k) => {
      // weight_value / weight_unit straddle the DB<->form boundary: the DB
      // holds a canonical-lbs NUMBER, the form a display-unit STRING. Compare
      // through the boundary helper, never directly.
      if (k === "weight_value" || k === "weight_unit") {
        return editingPetId
          ? petWeightChanged(petForm.weight_value, petForm.weight_unit, base)
          : (petForm[k] ?? "") !== (emptyPetForm[k] ?? "");
      }
      return (petForm[k] ?? "") !== (base[k] ?? emptyPetForm[k] ?? "");
    });
  }
  async function confirmDiscardPet() {
    if (!isPetDirty()) return true;
    const choice = await confirmUnsaved();
    if (choice === "keep") return false; // dismissed — keep editing
    if (choice === "save") {
      // Only proceed (close) if the save actually succeeded.
      return await handleSavePet();
    }
    // Discard — proceed to close, dropping the edits.
    return true;
  }

  // Guard for switching between forms: if the profile OR pet form has unsaved
  // edits, prompt before opening a different form (which would discard them).
  // Returns true once it's OK to proceed with the switch.
  async function confirmDiscardAny() {
    if (isProfileDirty()) return await confirmDiscardProfile();
    if (isPetDirty()) return await confirmDiscardPet();
    return true;
  }

  // "Add a pet" that first prompts if another form has unsaved edits.
  async function handleStartAddPet() {
    if (!(await confirmDiscardAny())) return;
    startAddPet();
  }

  // Edit an existing pet, prompting first if another form has unsaved edits.
  async function handleStartEditPet(pet) {
    if (!(await confirmDiscardAny())) return;
    startEditPet(pet);
  }

  // Warn before leaving (tab close / refresh) if a form has unsaved edits —
  // same safety net as Hero and Care.
  const profileDirtyRef = useRef(false);
  profileDirtyRef.current = !!editingProfile || !!editingPetId || showAddPet;
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e) => {
      if (profileDirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Deep-link from the Pet Cards hub: /profile?add=1 opens the add-pet form
  // directly, so "Add a pet" is one click instead of two (land on profile →
  // click Add a pet again). The param is stripped immediately after so a
  // refresh or back-nav doesn't re-open the form. Owner-only by construction:
  // ProfileMain is always the owner's own page.
  useEffect(() => {
    if (searchParams.get("add") !== "1") return;
    startAddPet();
    // Remove ?add=1 without a navigation, so the form doesn't re-trigger on
    // refresh and the URL reads cleanly.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("add");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Auth ────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) router.push("/auth");
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) router.push("/auth");
    });
    return () => subscription.unsubscribe();
  }, []);

  // ─── Fetch ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    async function fetchData() {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (cancelled) return;

      if (profileData) {
        setProfile(profileData);
        setProfileForm({
          full_name: profileData.full_name || "",
          username: profileData.username || "",
          bio: profileData.bio || "",
          zip_code: profileData.zip_code || "",
          is_public: profileData.is_public || false,
          show_location_public: profileData.show_location_public !== false, // default true
          show_bio_public: profileData.show_bio_public !== false, // default true
          banner_color: profileData.banner_color || "auto",
        });
      } else {
        const { data: newProfile } = await supabase
          .from("profiles")
          .insert({
            id: session.user.id,
            full_name: session.user.user_metadata?.full_name || "",
            avatar_url: session.user.user_metadata?.avatar_url || "",
          })
          .select()
          .single();
        if (!cancelled) setProfile(newProfile);
      }

      const { data: petsData } = await supabase
        .from("pets")
        .select("*")
        .eq("owner_id", session.user.id)
        .order("created_at");
      if (!cancelled) setPets(petsData || []);

      const [savedRes, checksRes, submissionsRes, verifiedRes, pendingRes] =
        await Promise.all([
          supabase
            .from("saved_vets")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.user.id),
          supabase
            .from("symptom_checks")
            .select("*", { count: "exact", head: true })
            .eq("owner_id", session.user.id),
          supabase
            .from("price_submissions")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.user.id),
          supabase
            .from("price_submissions")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.user.id)
            .eq("status", "verified"),
          supabase
            .from("price_submissions")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.user.id)
            .eq("status", "pending"),
        ]);

      if (!cancelled) {
        setCounts({
          saved: savedRes.count || 0,
          checks: checksRes.count || 0,
          submissions: submissionsRes.count || 0,
          verifiedSubmissions: verifiedRes.count || 0,
          pendingSubmissions: pendingRes.count || 0,
        });
      }

      // Gather latest symptom checks (if any) for the pet cards + level calc.
      const allPetsChecked = new Set();
      if (petsData?.length) {
        const ids = petsData.map((p) => p.id);
        const { data: checkRows } = await supabase
          .from("symptom_checks")
          .select(
            "id, pet_id, triage_result, created_at, transcript, differentials",
          )
          .in("pet_id", ids)
          .order("created_at", { ascending: false });
        if (!cancelled && checkRows) {
          const latest = {};
          checkRows.forEach((c) => {
            if (!latest[c.pet_id]) latest[c.pet_id] = c;
            allPetsChecked.add(c.pet_id);
          });
          setLatestChecks(latest);
          setCheckedPetIds([...allPetsChecked]);
        }
      }

      // Product-depth signals for the XP gates (owner's own data only).
      const heroPub = (petsData || []).some((p) => p.hero_is_published);
      let careCount = 0;
      if (petsData?.length) {
        careCount = await computeCareCompleteCount(
          supabase,
          petsData.map((p) => p.id),
        );
      }
      if (!cancelled) {
        setHeroPublished(heroPub);
        setCareCompleteCount(careCount);
      }

      // Write ALL cached values back in a single update so the public profile
      // (ProfileUsername) renders accurate level/stats/banner without needing
      // RLS access to private tables. Runs on every owner self-view, even when
      // the owner has no pets or no checks — so the cache never goes stale.
      if (!cancelled && session && profileData?.id) {
        const fullPetsCount = (petsData || []).filter(fullPetProfile).length;
        const { level: computedLevel } = calculateLevel({
          pets: petsData || [],
          profile: profileData,
          counts: {
            saved: savedRes.count || 0,
            checks: checksRes.count || 0,
            verifiedSubmissions: verifiedRes.count || 0,
            checkedPetIds: [...allPetsChecked],
            heroPublished: heroPub,
            careComplete: careCount > 0,
            careCompleteCount: careCount,
          },
          session,
        });
        // Celebration: if the freshly computed level is higher than what
        // was cached last time, the owner just leveled up. Fire a one-shot
        // celebration (bigger when the jump crosses a tier boundary).
        const prevLevel = profileData?.cached_level ?? null;
        if (
          typeof prevLevel === "number" &&
          computedLevel > prevLevel &&
          computedLevel >= 1
        ) {
          const crossed =
            tierForLevel(computedLevel) !== tierForLevel(prevLevel || 1);
          const tierNum = tierForLevel(computedLevel);
          const tierObj = TIERS[tierNum - 1] || null;
          setCelebrate({
            level: computedLevel,
            tierCrossed: crossed,
            tierName: tierObj?.name || null,
            tierN: tierNum,
          });
        }
        const { error: cacheErr } = await supabase
          .from("profiles")
          .update({
            cached_pets_count: (petsData || []).length,
            cached_full_pets_count: fullPetsCount,
            cached_saved_count: savedRes.count || 0,
            cached_checks_count: checksRes.count || 0,
            cached_verified_count: verifiedRes.count || 0,
            cached_distinct_checked_pets: allPetsChecked.size,
            cached_level: computedLevel,
            cached_banner: autoBannerKey(petsData || []),
            cached_stats_updated_at: new Date().toISOString(),
          })
          .eq("id", session.user.id);
        if (cacheErr) {
          console.error("Failed to write cached profile stats:", cacheErr);
        }
      }

      if (!cancelled) setLoading(false);
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    const zip = profile?.zip_code;
    if (!zip || zip.length !== 5) {
      setCityState("");
      return;
    }
    fetch(`https://api.zippopotam.us/us/${zip}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.places?.[0])
          setCityState(
            `${d.places[0]["place name"]}, ${d.places[0]["state abbreviation"]}`,
          );
        else setCityState("");
      })
      .catch(() => setCityState(""));
  }, [profile?.zip_code]);

  // ─── Helpers ─────────────────────────────────────────────────────────

  // 5MB cap, JPG/PNG only (HEIC converts to JPG first) — matches slug page

  // Close the inline submit-price form and restore scroll to the trigger,
  // so the user isn't left stranded at the bottom of the page.

  if (session === undefined || loading) return <PageLoader for="profile" />;
  if (!session) return null;

  const isOwner = !previewMode;
  const avatarUrl =
    profile?.avatar_url || session?.user?.user_metadata?.avatar_url || null;
  const avatarLetter =
    profile?.full_name?.[0]?.toUpperCase() ||
    session?.user?.email?.[0]?.toUpperCase() ||
    "?";

  // NEW XP engine — computes tier (from XP + gates), sub-level, XP bar
  // progress, and the quest checklist, all from the single source of truth.
  const levelState = computeLevelState({
    pets,
    profile,
    counts: {
      ...counts,
      checkedPetIds,
      heroPublished,
      careComplete: careCompleteCount > 0,
      careCompleteCount,
    },
    session,
  });
  const level = levelState.level;
  // The compact LevelBadge + CommunityContributions read `currentLevelDef`
  // (a tier object with stops/icon/name/pillBg/pillText) — TIERS entries have
  // exactly that shape, so they work unchanged.
  const currentLevelDef = levelState.tier || null;

  const joinedDate = formatJoinDate(
    profile?.created_at || session.user.created_at,
  );
  const username = profile?.username || "";

  const autoKey = autoBannerKey(pets);
  const savedBannerKey =
    profile?.banner_color && profile.banner_color !== "auto"
      ? profile.banner_color
      : autoKey;
  const previewKey =
    editingProfile && profileForm.banner_color !== "auto"
      ? profileForm.banner_color
      : editingProfile && profileForm.banner_color === "auto"
        ? autoKey
        : savedBannerKey;
  const bannerKey = editingProfile ? previewKey : savedBannerKey;
  const bannerPalette = BANNER_PALETTE[bannerKey] || BANNER_PALETTE.mixed;

  const formPhotoUrl = pendingPetPhoto?.previewUrl || null;
  const petCount = pets.length;
  const familyCount =
    petCount === 0
      ? "No pets yet"
      : petCount === 1
        ? "1 family member"
        : `${petCount} family members`;
  const gridCols =
    petCount === 1 ? 1 : petCount === 2 ? 2 : petCount === 4 ? 4 : 3;
  return (
    <>
      <BadgeCelebrationStyles />
      <style>{`${profileCss({ C, bannerKey, bannerPalette })}
        @media (max-width: 640px) {
          .pp-weight-row { flex-direction: column; }
          .pp-weight-unit-toggle { align-self: stretch; }
          .pp-weight-unit-btn { flex: 1; }
          .pp-weight-unit-toggle { margin-top: 5px; }
        }
        .pp-edit-full-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          align-self: flex-start;
          margin: 15px 0 0;
          padding: 0 20px;
          height: 42px;
          background: transparent;
          color: ${C.terracotta};
          border: 1.5px solid ${C.terracotta};
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: background 0.15s, color 0.15s;
        }
        .pp-edit-full-link:hover {
          background: ${C.terracotta};
          color: #fff;
        }
        .pp-edit-full-link span { transition: transform 0.15s; }
        .pp-edit-full-link:hover span { transform: translateX(3px); }
        @media (max-width: 640px) {
          .pp-edit-full-link { display: flex; width: 100%; }
        }
        .pp-add-pet-mobile--single { display: block; }
        .pp-add-pet-mobile--multi { display: none; }
        @media (max-width: 767px) {
          .pp-add-pet-mobile--multi { display: block; }
          /* Top-right button hidden once cards stack. */
          .pp-pack-head .pp-add-pet-top { display: none; }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .pp-container-mixed { max-width: 760px; }
          /* Bio fills the tablet width (desktop caps it at 630 to clear the
             Joined/Edit column, but tablet is narrower so it can go wider
             without reaching them). */
          .pp-bio { max-width: 720px; }
          .pp-pet-grid.cols-3,
          .pp-pet-grid.cols-4 { 
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 30px 16px;
            }
        }
        @media (max-width: 768px) {
          .pp-hero { padding: 40px 0 80px; }
          /* Modal: top-align + full scroll so the header/top is never clipped
             on small screens. */
          .pp-modal-backdrop { align-items: flex-start; padding: 16px; }
          .pp-modal { max-height: none; margin: 8px 0; }
          .pp-container-mixed { padding: 0 16px; }

          /* Bottom utility buttons: stay a wrapping row down to true mobile;
             only stack full-width at ≤500px (see phone block below). */

          .pp-identity {
            grid-template-columns: 84px 1fr;
            gap: 40px;
            margin-bottom: 18px;
            margin-left: 16px;
          }
          .pp-identity-left {
            align-items: center;
            gap: 0;
          }
          .pp-avatar-outer { width: 130px; height: 130px; padding: 2px; }
          .pp-avatar-inner { font-size: 28px; }
          .pp-avatar-camera {
            width: 30px; height: 30px;
            bottom: 0; right: 0;
            border-width: 2px;
          }
          .pp-avatar-camera svg { width: 14px; height: 14px; }

          .pp-identity-right {
            padding-top: 4px; padding-left: 0;
            grid-template-columns: 1fr;
            grid-template-rows: auto auto auto auto auto;
            row-gap: 0;
            column-gap: 0;
          }
          /* Mobile order: Name → Handle → Location (group 1) → gap → Joined → Edit (group 2) */
          .pp-id-name { grid-column: 1; grid-row: 1; margin-bottom: 4px; }
          .pp-id-handle { grid-column: 1; grid-row: 2; margin-bottom: 4px; }
          .pp-id-location { grid-column: 1; grid-row: 3; }
          .pp-id-joined { grid-column: 1; grid-row: 4; justify-self: start; margin-top: 18px; margin-bottom: 4px; }
          .pp-id-edit { grid-column: 1; grid-row: 5; justify-self: start; }

          .pp-name { line-height: 1.1; }
          .pp-handle { font-size: 16px; }
          .pp-location { font-size: 15px; }
          .pp-joined { font-size: 15px; }
          .pp-edit-link { font-size: 16px; display: inline-block; }

          /* Mobile: level pill drops below identity row, full-width with cap */
          .pp-level-mobile-wrap {
            display: block;
            margin-top: 25px;
            margin-bottom: 0;
            max-width: 480px;
            text-align: left;
          }
          .pp-level-mobile-wrap .pp-level-outer {
            display: block;
            width: 100%;
            border-radius: 24px;
            box-sizing: border-box;
          }
          /* MOBILE (≤500): badge spans the full width, content centered
             (cleaner than pushing the pill to the edge). */
          .pp-level-mobile-wrap .pp-level-badge {
            display: flex;
            width: 100%;
            justify-content: center;
            box-sizing: border-box;
          }

          /* Mobile wallpaper handled by independent positionsMobile array in JS */

          /* Hide desktop level placement on mobile */
          .pp-level-desktop-wrap { display: none; }

          .pp-bio-desktop { display: none; }
          .pp-bio-mobile { display: block; margin-top: 26px; margin-bottom: 12px; font-size: 16px; font-weight: 500; line-height: 1.55; }

          /* Stats trio: more space above (less overlap into hero so there's room) */
          .pp-stats { gap: 10px; margin-top: -40px; }
          .pp-stat { padding: 18px 8px 16px; }
          .pp-stat-label { font-size: 11px; letter-spacing: 0.02em; }

        
          .pp-add-pet-mobile { display: block; margin-top: 20px; text-align: center; }
          .pp-add-pet-mobile .pp-add-pet-btn {
            width: 100%;
            max-width: var(--pp-card-max);
            height: 42px;
            font-size: 15px;
            margin-bottom: 20px;
          }

          /* Pet-grid single-column stack moved to ≤767 block below so that
             exactly 768px shows 2 columns (matches the hub). */
          .pp-pet-grid { gap: 16px; }

          .pp-form-card { padding: 20px; }
          .form-grid { grid-template-columns: 1fr; }

          /* Quick actions: stack to single column on small mobile, smaller padding */
          .pp-quick-actions {
            grid-template-columns: 1fr;
            gap: 8px;
            margin-bottom: 24px;
          }
          .pp-quick-action {
            padding: 14px 12px;
            font-size: 14px;
          }

          /* Community Contributions: tighter on mobile */
          .pp-cc-section { padding: 24px 0 60px; }
          .pp-cc-medal { padding: 36px 24px 24px; }
          .pp-cc-number-label { font-size: 13px; }
          .pp-cc-blurb { font-size: 15px; }
          .pp-cc-verified-line { font-size: 11px; }
        }
        @media (max-width: 767px) {
          .pp-pet-grid.cols-1,
          .pp-pet-grid.cols-2,
          .pp-pet-grid.cols-3,
          .pp-pet-grid.cols-4 {
            grid-template-columns: minmax(0, var(--pp-card-max));
            justify-content: center;
            gap: 15px;
          }
        }
        @media (max-width: 500px) {
          /* All grid variants collapse to a single column on phones.
             (Previously a trailing comma after .cols-3 glued the NEXT rule
             onto this selector list, so cols-2/3/4 never got their rule.) */
          .pp-pet-grid.cols-1,
          .pp-pet-grid.cols-2,
          .pp-pet-grid.cols-3,
          .pp-pet-grid.cols-4 {
            grid-template-columns: 1fr;
            gap: 15px;
          }

          .pp-pack-section {
            padding: 0px 0 0px;
          }

          .btn-row { flex-direction: column; align-items: stretch; }
          .btn-row .btn-primary,
          .btn-row .btn-secondary { width: 100%; justify-content: center; }
          .pp-banner-pick-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
      `}</style>
      {unsavedModal}
      <div className="pp-shell">
        {/* ════════════════════════════════════════════════════════════
            HERO — full chromatic gradient with wallpaper
            ════════════════════════════════════════════════════════════ */}
        <div className="pp-hero">
          <HeroWallpaper bannerKey={bannerKey} />

          <div className="pp-hero-content">
            <div className="pp-container-mixed">
              <div className="pp-identity">
                {/* LEFT: avatar + level (desktop only here) */}
                <div className="pp-identity-left">
                  <div className="pp-avatar-outer">
                    <div className="pp-avatar-ring">
                      <div className="pp-avatar-inner">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="avatar" />
                        ) : (
                          avatarLetter
                        )}
                      </div>
                    </div>
                    {isOwner && (
                      <>
                        <button
                          className="pp-avatar-camera"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          title="Change profile photo"
                          aria-label="Change profile photo"
                        >
                          <Camera size={18} />
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
                          onChange={handlePhotoUpload}
                          style={{ display: "none" }}
                        />
                      </>
                    )}
                  </div>

                  {/* Desktop level placement — under avatar */}
                  <div className="pp-level-desktop-wrap">
                    <LevelBadge
                      level={level}
                      currentLevelDef={currentLevelDef}
                      subLevel={levelState.subLevel}
                      onClick={() => setShowLevelModal(true)}
                      celebrate={celebrate}
                      onCelebDone={() => setCelebrate(null)}
                    />
                  </div>
                </div>

                {/* RIGHT: identity stack */}
                <div className="pp-identity-right">
                  <h1 className="pp-name pp-id-name">
                    {profile?.full_name || session?.user?.email || "Pet Parent"}
                  </h1>
                  <p
                    className={`pp-handle pp-id-handle ${username ? "" : "empty"}`}
                  >
                    {username ? `@${username}` : "no username yet"}
                  </p>
                  {(isOwner || profile?.show_location_public !== false) && (
                    <p className="pp-location pp-id-location">
                      {cityState ||
                        (profile?.zip_code
                          ? `ZIP ${profile.zip_code}`
                          : "Location not set")}
                    </p>
                  )}
                  {joinedDate && (
                    <p className="pp-joined pp-id-joined">
                      Joined {joinedDate}
                    </p>
                  )}
                  {isOwner && (
                    <button
                      className="pp-edit-link pp-id-edit"
                      onClick={async () => {
                        if (editingProfile) {
                          if (!(await confirmDiscardProfile())) return;
                          setEditingProfile(false);
                        } else {
                          if (!(await confirmDiscardAny())) return;
                          closeAllEditing();
                          setEditingProfile(true);
                          scrollToForm();
                        }
                      }}
                    >
                      Edit profile
                    </button>
                  )}
                  {profile?.bio &&
                    !editingProfile &&
                    (isOwner || profile?.show_bio_public !== false) && (
                      <p className="pp-bio pp-bio-desktop">{profile.bio}</p>
                    )}
                </div>
              </div>

              {/* Mobile-only level pill — full-width below identity */}
              <div className="pp-level-mobile-wrap">
                <LevelBadge
                  level={level}
                  currentLevelDef={currentLevelDef}
                  subLevel={levelState.subLevel}
                  onClick={() => setShowLevelModal(true)}
                  celebrate={celebrate}
                  onCelebDone={() => setCelebrate(null)}
                />
              </div>

              {/* Mobile-only bio — below level pill */}
              {profile?.bio &&
                !editingProfile &&
                (isOwner || profile?.show_bio_public !== false) && (
                  <p className="pp-bio pp-bio-mobile">{profile.bio}</p>
                )}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            BODY — cream, on-brand
            ════════════════════════════════════════════════════════════ */}
        <div className="pp-container-mixed">
          {/* Stats trio — owner only (private/personal data) */}
          {isOwner && (
            <div className="pp-stats">
              <button onClick={scrollToPack} className="pp-stat-link">
                <div className="pp-stat-outer">
                  <div className="pp-stat pack">
                    <p className="pp-stat-num">{pets.length}</p>
                    <p className="pp-stat-label">My Pack</p>
                  </div>
                </div>
              </button>
              <Link href="/saved" className="pp-stat-link">
                <div className="pp-stat-outer">
                  <div className="pp-stat saved">
                    <p className="pp-stat-num">{counts.saved}</p>
                    <p className="pp-stat-label">Saved Vets</p>
                  </div>
                </div>
              </Link>
              <Link href="/health-history" className="pp-stat-link">
                <div className="pp-stat-outer">
                  <div className="pp-stat checks">
                    <p className="pp-stat-num">{counts.checks}</p>
                    <p className="pp-stat-label">Health Checks</p>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Owner-only body: quick actions, edit form, pack */}
          {isOwner && (
            <>
              {/* Profile edit form */}
              <div ref={formAreaRef}>
                {editingProfile && isOwner && (
                  <ProfileEditForm
                    C={C}
                    profileForm={profileForm}
                    setProfileForm={setProfileForm}
                    savedUsername={profile?.username || ""}
                    previewHref={
                      profile?.username
                        ? `/profile/${profile.username}?preview=public`
                        : "#"
                    }
                    onCopyLink={async () => {
                      const uname = profile?.username;
                      if (!uname) return false;
                      const url = `${window.location.origin}/profile/${uname}`;
                      // Modern API first; fall back to execCommand for
                      // non-secure contexts (mobile dev over local network).
                      let ok = false;
                      try {
                        if (navigator.clipboard && window.isSecureContext) {
                          await navigator.clipboard.writeText(url);
                          ok = true;
                        } else {
                          const ta = document.createElement("textarea");
                          ta.value = url;
                          ta.style.position = "fixed";
                          ta.style.left = "-9999px";
                          ta.style.top = "0";
                          ta.setAttribute("readonly", "");
                          document.body.appendChild(ta);
                          ta.select();
                          ta.setSelectionRange(0, ta.value.length);
                          try {
                            ok = document.execCommand("copy");
                          } catch (_e) {
                            ok = false;
                          }
                          document.body.removeChild(ta);
                        }
                      } catch (_err) {
                        ok = false;
                      }
                      showToast?.(
                        ok
                          ? "Link copied to clipboard"
                          : "Could not copy — try again",
                      );
                      return ok;
                    }}
                    usernameError={usernameError}
                    setUsernameError={setUsernameError}
                    autoKey={autoKey}
                    onSave={handleSaveProfile}
                    onCancel={async () => {
                      if (!(await confirmDiscardProfile())) return;
                      setEditingProfile(false);
                      setUsernameError("");
                      // Discard unsaved edits — restore the form to the saved
                      // profile values so a reopened form doesn't show stale
                      // (unsaved) input like a changed-but-not-saved username.
                      setProfileForm({
                        full_name: profile?.full_name || "",
                        username: profile?.username || "",
                        bio: profile?.bio || "",
                        zip_code: profile?.zip_code || "",
                        is_public: profile?.is_public || false,
                        show_location_public:
                          profile?.show_location_public !== false,
                        show_bio_public: profile?.show_bio_public !== false,
                        banner_color: profile?.banner_color || "auto",
                      });
                    }}
                    saving={saving}
                  />
                )}
              </div>

              {/* Pack section */}
              <div ref={packSectionRef} className="pp-pack-section">
                <div className="pp-pack-head">
                  <div>
                    <p className="pp-pack-eyebrow">My Pack</p>
                    <h2 className="pp-pack-title">{familyCount}</h2>
                  </div>
                  {isOwner && pets.length >= 2 && (
                    <button
                      className="pp-add-pet-btn pp-add-pet-top"
                      onClick={handleStartAddPet}
                    >
                      <Plus size={16} strokeWidth={2.4} />
                      Add a pet
                    </button>
                  )}
                </div>

                {/* Pending review indicator — owner only, above the pets */}
                {isOwner && counts.pendingSubmissions > 0 && (
                  <div className="pp-pending-indicator">
                    <p>
                      <strong>
                        {counts.pendingSubmissions} submission
                        {counts.pendingSubmissions === 1 ? "" : "s"} pending
                        review
                      </strong>{" "}
                      — typically verified within 5–7 business days.
                    </p>
                  </div>
                )}

                {pets.length === 0 ? (
                  <div className="pp-empty">
                    {isOwner ? (
                      <>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            marginBottom: "16px",
                            color: C.terracotta,
                          }}
                        >
                          <PawPrint size={48} strokeWidth={1.6} />
                        </div>
                        <h3
                          style={{
                            margin: "0 0 10px",
                            fontSize: "22px",
                            fontWeight: 800,
                            color: C.navyDark,
                          }}
                        >
                          Add your first pet
                        </h3>
                        <p
                          style={{
                            margin: "0 auto 22px",
                            maxWidth: "360px",
                            fontSize: "16px",
                            fontWeight: 500,
                            color: C.slate,
                            lineHeight: 1.55,
                          }}
                        >
                          Build their profile, track health checks, and save
                          your favorite vets — all in one place.
                        </p>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                          }}
                        >
                          <button
                            className="pp-add-pet-btn"
                            onClick={handleStartAddPet}
                          >
                            <Plus size={16} strokeWidth={2.4} />
                            Add a pet
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p
                          style={{
                            margin: "0 0 8px",
                            fontSize: "16px",
                            fontWeight: 700,
                            color: C.navyDark,
                          }}
                        >
                          No pets yet
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "14px",
                            fontWeight: 500,
                            color: C.muted,
                          }}
                        >
                          This user hasn't added any pets yet.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <PetTileStyles />
                    <div className={`pp-pet-grid cols-${gridCols}`}>
                      {pets.map((pet) => {
                        const recent = latestChecks[pet.id];
                        const triage = recent
                          ? triageLabel(recent.triage_result)
                          : null;
                        return (
                          <PetTile
                            key={pet.id}
                            pet={pet}
                            isOwner={isOwner}
                            recent={recent}
                            triage={triage}
                            bannerPalette={bannerPalette}
                            petPhotoRefs={petPhotoRefs}
                            onEdit={handleStartEditPet}
                            onPhotoUpload={handlePetPhotoUpload}
                            onViewSymptomCheck={handleViewSymptomCheck}
                            relativeTimeShort={relativeTimeShort}
                            includeStyles={false}
                          />
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Bottom Add a pet — shown when there's a single card (all
                   widths) OR when 2+ cards are stacked on mobile (≤767). The
                   count class on the wrapper lets CSS hide it once the top-right
                   button takes over at ≥768 with 2+ cards. */}
                {isOwner && pets.length >= 1 && (
                  <div
                    className={`pp-add-pet-mobile ${pets.length >= 2 ? "pp-add-pet-mobile--multi" : "pp-add-pet-mobile--single"}`}
                  >
                    <button
                      className="pp-add-pet-btn"
                      onClick={handleStartAddPet}
                    >
                      <Plus size={16} strokeWidth={2.4} />
                      Add a pet
                    </button>
                  </div>
                )}

                {/* Pet add/edit form */}
                <div ref={petFormRef}>
                  {(showAddPet || editingPetId) && isOwner && (
                    <PetFormCard
                      C={C}
                      isEdit={!!editingPetId}
                      petForm={petForm}
                      setPetForm={setPetForm}
                      microchipError={microchipError}
                      setMicrochipError={setMicrochipError}
                      pendingPetPhoto={pendingPetPhoto}
                      setPendingPetPhoto={setPendingPetPhoto}
                      formPhotoUrl={formPhotoUrl}
                      newPetPhotoRef={newPetPhotoRef}
                      handleNewPetPhotoPreview={handleNewPetPhotoPreview}
                      handlePhoneInput={handlePhoneInput}
                      saving={saving}
                      convertingPhoto={convertingPhoto}
                      onSave={handleSavePet}
                      onCancel={async () => {
                        if (!(await confirmDiscardPet())) return;
                        setShowAddPet(false);
                        setEditingPetId(null);
                        setPetForm(emptyPetForm);
                        setPendingPetPhoto(null);
                        setMicrochipError("");
                        setJustSavedPet(null);
                      }}
                      onDelete={
                        editingPetId
                          ? () => {
                              handleDeletePet(editingPetId);
                              setEditingPetId(null);
                              setPetForm(emptyPetForm);
                            }
                          : null
                      }
                      pets={pets}
                      editingPetId={editingPetId}
                      justSavedPet={justSavedPet}
                      onAddAnother={() => {
                        setJustSavedPet(null);
                        setPetForm(emptyPetForm);
                        setPendingPetPhoto(null);
                        setMicrochipError("");
                      }}
                      onDone={() => {
                        setShowAddPet(false);
                        setJustSavedPet(null);
                        setPetForm(emptyPetForm);
                        setPendingPetPhoto(null);
                        setMicrochipError("");
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Inline Submit a Price form — expanded by clicking utility link */}
              <div ref={inlineSubmitRef}>
                {showInlineSubmit && (
                  <InlineSubmitPriceForm
                    C={C}
                    session={session}
                    showToast={showToast}
                    onClose={closeSubmitForm}
                    onSubmitted={() => setPriceSubmitted(true)}
                  />
                )}
              </div>

              {/* Quick links — bottom utility row, owner only */}
              <div className="pp-utility-links">
                {!priceSubmitted && (
                  <button
                    type="button"
                    ref={submitCtaRef}
                    className="pp-utility-link pp-utility-link-btn"
                    onClick={async () => {
                      if (showInlineSubmit) {
                        closeSubmitForm();
                      } else {
                        if (!(await confirmDiscardAny())) return;
                        closeAllEditing();
                        setShowInlineSubmit(true);
                        setTimeout(() => {
                          if (!inlineSubmitRef.current) return;
                          const top =
                            inlineSubmitRef.current.getBoundingClientRect()
                              .top +
                            window.scrollY -
                            80;
                          window.scrollTo({ top, behavior: "smooth" });
                        }, 150);
                      }
                    }}
                  >
                    {showInlineSubmit ? "Close form" : "Submit a vet price"}
                  </button>
                )}
                {!priceSubmitted && <span className="pp-utility-sep">·</span>}
                <Link href="/symptom-checker" className="pp-utility-link">
                  Start a health check
                </Link>
                <span className="pp-utility-sep">·</span>
                <Link href="/vets" className="pp-utility-link">
                  Find a vet
                </Link>
              </div>
            </>
          )}

          {/* Public viewer: Community Contributions panel */}
          {!isOwner && (
            <CommunityContributions
              C={C}
              profile={profile}
              counts={counts}
              level={level}
              currentLevelDef={currentLevelDef}
              joinedDate={joinedDate}
              memberDays={memberDays(profile, session)}
              bannerKey={bannerKey}
              bannerPalette={bannerPalette}
            />
          )}
        </div>

        {/* Public preview top bar */}
        {previewMode && (
          <div
            style={{
              position: "fixed",
              top: 64,
              left: 0,
              right: 0,
              background: C.navyDark,
              color: "#fff",
              padding: "10px 16px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "16px",
              zIndex: 60,
              fontSize: "13px",
              fontWeight: 500,
              fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
              boxShadow: "0 4px 14px rgba(0,0,0,0.20)",
            }}
          >
            <span>Public preview — this is what others would see</span>
            <Link
              href="/profile"
              style={{ color: C.gold, textDecoration: "none", fontWeight: 700 }}
            >
              Exit preview{" "}
              <ArrowRight
                size={14}
                strokeWidth={2.4}
                style={{ marginLeft: "4px", verticalAlign: "middle" }}
              />
            </Link>
          </div>
        )}

        {/* Level explainer modal */}
        {showLevelModal && (
          <div
            className="pp-modal-backdrop"
            onClick={() => setShowLevelModal(false)}
          >
            <div className="pp-modal" onClick={(e) => e.stopPropagation()}>
              <div className="pp-modal-head">
                <h3>Levels</h3>
                <button
                  className="pp-modal-close"
                  onClick={() => setShowLevelModal(false)}
                  aria-label="Close"
                >
                  <X size={20} strokeWidth={2.2} />
                </button>
              </div>
              <div className="pp-modal-body">
                {/* Combined intro: one cohesive section telling the story
                    of the system (XP → Levels → Tiers) without spoiling the
                    specific milestones — those reveal as you expand tiers.
                    Stable terracotta (system-level, same for everyone). */}
                <div className="pp-ladder-story">
                  <p className="pp-story-eyebrow">How leveling works</p>
                  <p className="pp-story-p">
                    Every time you care for your pets and help the community,
                    you earn <strong>XP</strong> — the spark that sets your
                    journey through the pack in motion.
                  </p>
                  <p className="pp-story-p">
                    That XP builds toward the next <strong>Level</strong>. Each
                    level sets clear milestones to reach — complete them all and
                    you climb to the next.
                  </p>
                  <p className="pp-story-p">
                    Levels group into seven <strong>Tiers</strong>, the prestige
                    bands that shape your badge. Every few levels you break into
                    a new tier — the milestones worth chasing.
                  </p>
                  <p className="pp-story-p">
                    Your current tier is open below, showing the levels you've
                    earned and what's next. Keep climbing to unlock the tiers
                    ahead.
                  </p>
                </div>

                {/* Tier-grouped ladder. Each tier is a collapsible section
                    (icon + name + description) with its levels nested on a
                    vertical track. Current tier auto-expands; the current
                    level shows the XP bar + "Ways to earn XP" checklist.
                    Future (unreached) tiers hide their levels. */}
                <div className="pp-ladder-wrap">
                  {buildLadderView(levelState.signals).map((group) => {
                    const t = group.tier;
                    const Icon = t.icon;
                    const isFuture = !group.reached;
                    const open = group.isCurrent
                      ? expandedTiers[t.n] !== false
                      : expandedTiers[t.n] === true;
                    return (
                      <div key={t.n} className="pp-tier-sec">
                        <button
                          type="button"
                          className={`pp-tier-head ${group.isCurrent ? "current" : ""}`}
                          onClick={() =>
                            !isFuture &&
                            setExpandedTiers((prev) => ({
                              ...prev,
                              [t.n]: !open,
                            }))
                          }
                          disabled={isFuture}
                        >
                          <div
                            className="pp-tier-icon"
                            style={{
                              background: tierGradient(t.n),
                              opacity: isFuture ? 0.55 : 1,
                            }}
                          >
                            <Icon size={22} strokeWidth={2.2} color={t.text} />
                          </div>
                          <div className="pp-tier-meta">
                            <div className="pp-tier-eyebrow">Tier {t.n}</div>
                            <div
                              className={`pp-tier-name ${isFuture ? "future" : ""}`}
                            >
                              {t.name}
                            </div>
                            <div className="pp-tier-desc">{t.summary}</div>
                          </div>
                          {!isFuture && (
                            <ChevronDown
                              size={20}
                              strokeWidth={2.4}
                              className={`pp-tier-caret ${open ? "open" : ""}`}
                            />
                          )}
                        </button>

                        {!isFuture && open && (
                          <div className="pp-tier-levels">
                            {group.levels.map((lvl, idx) => {
                              const last = idx === group.levels.length - 1;
                              const st = lvl.state;
                              return (
                                <div
                                  key={lvl.level}
                                  className={`pp-lvl-row ${st}`}
                                >
                                  {!last && (
                                    <span
                                      className="pp-lvl-line"
                                      style={{
                                        background:
                                          st === "done"
                                            ? t.stops[1]
                                            : "#E2E6EA",
                                      }}
                                    />
                                  )}
                                  <span
                                    className={`pp-lvl-node ${st}`}
                                    style={
                                      st === "done"
                                        ? {
                                            background: t.stops[1],
                                            borderColor: t.stops[1],
                                          }
                                        : undefined
                                    }
                                  />
                                  <div className="pp-lvl-body">
                                    <div className="pp-lvl-headline">
                                      <span className="pp-lvl-name">
                                        Level {lvl.level}
                                      </span>
                                      {(st === "done" ||
                                        (st === "current" &&
                                          lvl.level === 1)) && (
                                        <span className="pp-lvl-done">
                                          <Check size={12} strokeWidth={3} />
                                          Complete
                                        </span>
                                      )}
                                      {st === "current" && (
                                        <span className="pp-lvl-here">
                                          You are here
                                        </span>
                                      )}
                                    </div>
                                    {/* Earned pills. Completed levels always
                                        show them. The current level normally
                                        doesn't (its reqs are echoed in the
                                        checklist below) — except Level 1, whose
                                        auto-met "Create your account" would
                                        otherwise never be seen. */}
                                    {(st === "done" ||
                                      (st === "current" && lvl.level === 1)) &&
                                      lvl.requirements.length > 0 && (
                                        <div className="pp-lvl-pills">
                                          {lvl.requirements
                                            .filter((r) => r.met)
                                            .map((r, i) => (
                                              <span
                                                key={i}
                                                className="pp-lvl-pill"
                                              >
                                                <Check
                                                  size={12}
                                                  strokeWidth={3}
                                                  color="#94A0AB"
                                                />
                                                {r.label}
                                              </span>
                                            ))}
                                        </div>
                                      )}
                                    {st === "current" && isOwner && (
                                      <div className="pp-lvl-expand">
                                        {/* Celebration lives on the level badge
                                            (always on screen), not here inside
                                            a modal the user may never open. */}
                                        <LevelProgress
                                          state={levelState}
                                          animate
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════
// LevelBadge — chromatic gloss, distinct color per level, inverted L# pill
// ════════════════════════════════════════════════════════════════════════
// BadgeCelebration — one-shot burst anchored on the level badge.
//
// Pure CSS keyframes. No animation library, so it cannot fail silently the
// way a lazy `import("gsap")` inside a try/catch can. Each particle carries
// its own angle/distance/delay as CSS custom properties; the keyframes read
// them. Particles sit BEHIND the badge (z-index) so they never obscure it.
// ════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════
function LevelBadge({
  level,
  currentLevelDef,
  subLevel,
  onClick,
  celebrate,
  onCelebDone,
}) {
  const lv = currentLevelDef;
  // Safe fallback — new engine always yields a tier, but guard anyway.
  if (!lv) return null;
  const Icon = lv.icon;
  const grad = `linear-gradient(160deg, ${lv.stops[0]} 0%, ${lv.stops[1]} 30%, ${lv.stops[2]} 70%, ${lv.stops[3]} 100%)`;
  return (
    <div className="pp-level-outer" onClick={onClick}>
      <button
        className="pp-level-badge"
        style={{ background: grad, color: lv.text }}
        onClick={onClick}
      >
        <Icon size={26} strokeWidth={2.2} color={lv.text} />
        <span>{lv.name}</span>
        <span
          className="lv-num"
          style={{ background: lv.pillBg, color: lv.pillText }}
        >
          Lv&nbsp;{subLevel || 1}
        </span>
      </button>
      <BadgeCelebration
        celebrate={celebrate}
        tierDef={lv}
        onDone={onCelebDone}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// ProfileEditForm — edit profile + banner picker
// ════════════════════════════════════════════════════════════════════════
