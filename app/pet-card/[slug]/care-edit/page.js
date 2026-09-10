"use client";

import { useEffect, useState, useRef, useCallback, Fragment } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  Dog,
  Cat,
  Bird,
  Rabbit,
  Fish,
  Sparkles,
  ArrowLeft,
  Camera,
  Check,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  Syringe,
  Pill,
  AlertCircle,
  UtensilsCrossed,
  PawPrint,
  Scale,
  Pause,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Stethoscope,
  Siren,
  BriefcaseMedical,
  UserRound,
  CalendarClock,
  ShieldCheck,
  PhoneCall,
  Link2,
  HeartPulse,
  AlertTriangle,
  Heart,
  Frown,
  Lightbulb,
  Award,
  ClipboardList,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { supabase } from "../../../../lib/supabase";
import PageLoader from "../../../../components/PageLoader";
import Breadcrumb from "../../../../components/Breadcrumb";
import { useUnsavedChanges } from "../../../../components/UnsavedChangesModal";
import {
  getOwnerPetBySlug,
  updatePet,
  uploadPetPhoto,
  prepareImageFile,
  MAX_PHOTO_BYTES,
  ACCEPTED_PHOTO_EXTENSIONS_INPUT,
  getPetVaccinations,
  addVaccination,
  updateVaccination,
  deleteVaccination,
  getPetMedications,
  addMedication,
  updateMedication,
  deleteMedication,
  normalizeSlug,
  validateSlug,
  checkSlugAvailable,
  getPetFeedings,
  addFeeding,
  updateFeeding,
  deleteFeeding,
  getPetWalks,
  addWalk,
  updateWalk,
  deleteWalk,
  getPetWeightHistory,
  addWeightEntry,
  updateWeightEntry,
  deleteWeightEntry,
  formatTimeOfDay,
  convertWeight,
  convertWeightTo,
  convertWeightFromDisplay,
  roundForDisplay,
  formatFrequency,
  formatRecurrence,
  formatDaysOfWeek,
  DAYS_OF_WEEK,
  getPetSpecialists,
  addSpecialist,
  updateSpecialist,
  deleteSpecialist,
  getPetEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  getPetVetVisits,
  addVetVisit,
  updateVetVisit,
  deleteVetVisit,
} from "../../../../lib/petCardApi";

// =============================================================
// SPECIES MAPPING (matches Profile + Pet Card landing)
// =============================================================

// Icon-size dials (mirrors the Hero editor). Change ONE value to resize every
// matching icon at once.
//   EDIT_ICON_SIZE  — the Pencil "edit" icon on each section header.
//   CLOSE_ICON_SIZE — the X "close" icon on each section's close/cancel button.
// (The small item-remove X's inside lists — remove a feeding, medication, etc. —
//  are a different, smaller UI role and keep their own size on purpose.)
const EDIT_ICON_SIZE = 14;
const CLOSE_ICON_SIZE = 17;

const SPECIES_OPTIONS = ["Dog", "Cat", "Rabbit", "Bird", "Other"];
const SEX_OPTIONS = ["Male", "Female", "Unknown"];
const ALTERED_OPTIONS = ["Spayed", "Neutered", "Intact", "Unknown"];

const SPECIES_ICON = {
  dog: Dog,
  cat: Cat,
  bird: Bird,
  small_furry: Rabbit,
  reptile_fish: Fish,
  mixed: Sparkles,
};

const SPECIES_TINT = {
  dog: { bg: "rgba(185,90,24,0.10)", icon: "#B95A18" },
  cat: { bg: "rgba(106,38,96,0.10)", icon: "#6A2660" },
  bird: { bg: "rgba(27,92,130,0.10)", icon: "#1B5C82" },
  small_furry: { bg: "rgba(181,118,20,0.10)", icon: "#B57614" },
  reptile_fish: { bg: "rgba(26,102,56,0.10)", icon: "#1A6638" },
  mixed: { bg: "rgba(107,63,203,0.10)", icon: "#6B3FCB" },
};

// Collapsible top-level section wrapper. Renders the section's eyebrow/title/sub
// as a clickable header (the whole header toggles open/closed), with a caret that
// rotates. The body is wrapped in the existing <Collapse> so the show/hide
// animation matches the rest of the editor exactly. Styling reuses pce-section /
// pce-section-header so nothing visual changes when expanded.
function SectionShell({ id, eyebrow, title, sub, open, onToggle, children }) {
  return (
    <div
      className={`pce-section pce-section--collapsible${open ? " is-open" : ""}`}
    >
      <button
        type="button"
        className="pce-section-header pce-section-toggle"
        aria-expanded={open}
        onClick={() => onToggle(id)}
      >
        <span className="pce-section-toggle-text">
          <span className="pce-section-eyebrow">{eyebrow}</span>
          <span className="pce-section-title">{title}</span>
          {sub ? <span className="pce-section-sub">{sub}</span> : null}
        </span>
        <ChevronDown
          size={22}
          strokeWidth={2.4}
          className="pce-section-caret"
        />
      </button>
      <Collapse open={open}>{children}</Collapse>
    </div>
  );
}

function Collapse({ open, children, className }) {
  return (
    <div
      className={`pce-collapse${open ? " is-open" : ""}${className ? " " + className : ""}`}
      aria-hidden={open ? undefined : true}
    >
      <div className="pce-collapse-inner">{children}</div>
    </div>
  );
}

// Shows the first `limit` items always; the rest live behind a smooth
// "Show all / Show less" toggle (same ease-in/out glide as the sections).
// `items` is an array; `renderItem(item, index, allItems)` returns each row.
// Index + allItems are passed so callers that need a neighbour (e.g. the
// previous entry for a weight delta) can compute it across the show-all split.
function CollapsibleList({ items, renderItem, limit = 5, noun = "entries" }) {
  const [expanded, setExpanded] = useState(false);
  const visible = items.slice(0, limit);
  const hidden = items.slice(limit);
  const hasMore = hidden.length > 0;
  return (
    <>
      <div className="pce-list">
        {visible.map((item, i) => renderItem(item, i, items))}
      </div>
      {hasMore && (
        <>
          <Collapse open={expanded}>
            <div className="pce-list pce-list--more">
              {hidden.map((item, i) => renderItem(item, i + limit, items))}
            </div>
          </Collapse>
          <button
            type="button"
            className="pce-showall-btn"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? "Show less" : `Show all ${items.length} ${noun}`}
            <ChevronDown
              size={15}
              strokeWidth={2.2}
              className={`pce-showall-chev${expanded ? " is-open" : ""}`}
            />
          </button>
        </>
      )}
    </>
  );
}

function speciesBucket(species) {
  if (!species) return "mixed";
  const s = String(species).toLowerCase().trim();
  if (s === "dog") return "dog";
  if (s === "cat") return "cat";
  if (s === "bird") return "bird";
  if (
    s === "rabbit" ||
    s === "hamster" ||
    s === "guinea pig" ||
    s === "small furry"
  )
    return "small_furry";
  if (
    s === "reptile" ||
    s === "fish" ||
    s === "amphibian" ||
    s === "reptile/fish"
  )
    return "reptile_fish";
  return "mixed";
}

// Format age like Profile (simple: "3 years", "6 months", "2 weeks")
function formatAge(birthday) {
  if (!birthday) return null;
  const birthMs = new Date(birthday).getTime();
  if (isNaN(birthMs)) return null;
  const diffMs = Date.now() - birthMs;
  if (diffMs < 0) return "Not born yet";
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 7) return days <= 1 ? "1 day" : `${days} days`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return w === 1 ? "1 week" : `${w} weeks`;
  }
  const months = Math.floor(days / 30.44);
  if (months < 24) return months === 1 ? "1 month" : `${months} months`;
  const years = Math.floor(days / 365.25);
  return years === 1 ? "1 year" : `${years} years`;
}

// =============================================================
// DEBOUNCE HOOK — for autosave
// =============================================================

// Header age display: appends "old" unless it sounds awkward
function formatAgeForHeader(birthday) {
  const a = formatAge(birthday);
  if (!a) return null;
  if (a === "Less than a month" || a === "Not born yet") return a;
  return `${a} old`;
}

function useDebouncedCallback(callback, delay) {
  const timerRef = useRef(null);
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });
  return useCallback(
    (...args) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay],
  );
}

// =============================================================
// MAIN PAGE COMPONENT
// =============================================================

export default function PetCardEditorPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug;

  const [session, setSession] = useState(undefined);
  const [pet, setPet] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Watch session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s || null);
    });
    return () => subscription?.unsubscribe();
  }, []);

  // Load pet when signed in
  useEffect(() => {
    if (session === undefined) return;
    if (session === null) {
      // Not signed in — bounce to auth with redirect back
      router.replace(`/auth?redirect=/pet-card/${slug}/care-edit`);
      return;
    }
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await getOwnerPetBySlug(slug);
      if (cancelled) return;
      if (error || !data) {
        // 404 if not found or not owner
        setNotFound(true);
        return;
      }
      setPet(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [session, slug, router]);

  // ===========================================================
  // RENDER STATES
  // ===========================================================

  if (session === undefined || (session && !pet && !notFound)) {
    return <PageLoader for="careEditor" />;
  }

  if (notFound) {
    return <NotFoundView />;
  }

  if (!pet) {
    return <PageLoader for="careEditor" />;
  }

  return <EditorView pet={pet} onPetChange={setPet} />;
}

// =============================================================
// NOT FOUND VIEW
// =============================================================

function NotFoundView() {
  return (
    <>
      <style>{`
        .pc-nf { background: var(--color-cream, #F5F0E8); min-height: calc(100vh - 64px); display: flex; align-items: center; justify-content: center; padding: 48px 24px; }
        .pc-nf-card {
          background: #fff;
          border-radius: 20px;
          padding: 48px 36px;
          max-width: 460px;
          width: 100%;
          text-align: center;
          border: 1px solid rgba(23,37,49,0.06);
        }
        .pc-nf-card h2 {
          font-size: 22px;
          font-weight: 800;
          color: var(--color-navy-dark, #172531);
          margin: 0 0 10px;
          letter-spacing: -0.01em;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pc-nf-card p {
          font-size: 15px;
          color: var(--color-slate, #4B5563);
          line-height: 1.7;
          margin: 0 0 24px;
        }
        .pc-nf-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 48px;
          padding: 0 28px;
          line-height: 1;
          background: var(--color-terracotta, #CF5C36);
          color: #fff;
          border: 2px solid var(--color-terracotta, #CF5C36);
          border-radius: 9999px;
          text-decoration: none;
          font-weight: 700;
          font-size: 15px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: background 0.2s, color 0.2s;
        }
        .pc-nf-btn:hover { background: #fff; color: var(--color-terracotta, #CF5C36); }
      `}</style>
      <div className="pc-nf">
        <div className="pc-nf-card">
          <p className="pc-notfound-title">Pet not found</p>
          <p className="pc-notfound-sub">
            We couldn&apos;t find this pet, or it doesn&apos;t belong to your
            account. Check the link, or pick a pet from your pack.
          </p>
          <Link href="/pet-card" className="pc-nf-btn">
            Back to Pet Cards
          </Link>
          <style>{`
            .pp-notfound {
              min-height: 70vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 10px;
              padding: 40px;
              text-align: center;
              font-family: var(--font-urbanist, 'Urbanist', sans-serif);
              color: #172531;
            }
            .pc-notfound-title { 
              font-size: 20px; 
              font-weight: 800; 
              margin: 0; 
            }
            .pc-notfound-sub {
              font-size: 16px; 
              font-weight: 500; 
              color: #4B5563;
              margin: 0 0 10px; 
              max-width: 380px; 
              line-height: 1.5;
            }
            .pc-nf-btn {
              display:inline-flex;
              align-items:center;
              gap:8px;
              padding:0px 24px;
              height: 42px;
              border-radius:12px;
              background:#CF5C36;
              color:#fff;
              font-size:15px;
              font-weight:700;
              text-decoration:none;
              border:2px solid #CF5C36;
              transition:background 0.15s, color 0.15s;
            }
            .pc-nf-btn:hover {
              background:#fff;
              color:#CF5C36;
            }
          `}</style>
        </div>
      </div>
    </>
  );
}

// =============================================================
// EDITOR VIEW — the actual editor
// =============================================================

function EditorView({ pet, onPetChange }) {
  // Save status: 'idle' | 'saving' | 'saved' | 'error'
  const [saveStatus, setSaveStatus] = useState("idle");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoConverting, setPhotoConverting] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef(null);
  // Site-wide form coordination: only ONE inline-add or edit form can be open
  // at a time across the entire editor. When the user opens form B while form A
  // is open, A auto-closes (and autosaves if applicable). String identifier like
  // "feedings-add", "primary-vet", "allergies", "identity", etc.
  const [openFormId, setOpenFormId] = useState(null);
  const { confirmUnsaved, unsavedModal } = useUnsavedChanges();

  // ---- Collapsible top-level sections ----
  // Research-backed defaults (NN/g): on mobile, long forms benefit from
  // collapsing — we open Identity and collapse the rest so the page is short
  // and scannable. On desktop, showing all content beats click-to-reveal, so
  // everything starts open. Computed once on mount from viewport width.
  // `openSections` is a Set of section ids that are currently expanded.
  const SECTION_IDS = ["identity", "medical", "care", "vetemergency"];
  const [openSections, setOpenSections] = useState(
    () => new Set(SECTION_IDS), // SSR-safe default: all open; corrected on mount
  );
  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    setOpenSections(isMobile ? new Set(["identity"]) : new Set(SECTION_IDS));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const toggleSection = (id) => {
    // Collapsing/opening a section closes any open inline edit form so we never
    // leave a form open behind a collapsed (or newly switched) section.
    setOpenFormId(null);
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const allOpen = openSections.size >= SECTION_IDS.length;
  const toggleAllSections = () =>
    setOpenSections(allOpen ? new Set() : new Set(SECTION_IDS));

  // Persist fields IMMEDIATELY. The inline forms already buffer their edits in
  // local draft state and only call this on their Save button, so there is no
  // autosave-on-keystroke — this just commits an explicit Save right away
  // instead of after a debounce delay.
  const saveFields = async (fields) => {
    setSaveStatus("saving");
    const { data, error } = await updatePet(pet.id, fields);
    if (error) {
      setSaveStatus("error");
      return false;
    }
    pendingFieldsRef.current = {};
    if (data) {
      onPetChange(data);
    }
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  };
  const debouncedSave = saveFields;

  // Field-level updater: optimistic local update + debounced save
  // updateField now accepts either (key, value) or (updatesObj) for multi-field updates.
  // It also accumulates pending changes across debounced calls so rapid edits don't
  // lose intermediate field updates (e.g. unit conversion changes two fields at once).
  const pendingFieldsRef = useRef({});
  function updateField(keyOrObj, value) {
    const updates =
      typeof keyOrObj === "object" ? keyOrObj : { [keyOrObj]: value };
    onPetChange({ ...pet, ...updates });
    pendingFieldsRef.current = { ...pendingFieldsRef.current, ...updates };
    return debouncedSave(pendingFieldsRef.current);
  }

  // Warn before leaving (tab close / refresh) while an edit form is open — the
  // open form may hold unsaved draft changes. Same safety net as Hero/Profile.
  const openFormRef = useRef(null);
  openFormRef.current = openFormId;
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e) => {
      if (openFormRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Slug change handler — validates format + uniqueness, then updates URL.
  // Returns { ok, error } so the IdentitySection can show feedback.
  async function handleSlugChange(rawValue) {
    const normalized = normalizeSlug(rawValue);

    // Validate format
    const formatError = validateSlug(normalized);
    if (formatError) {
      return { ok: false, error: formatError };
    }

    // Skip if unchanged
    if (normalized === pet.slug) {
      return { ok: true, error: null };
    }

    // Check uniqueness
    const { available, error: checkErr } = await checkSlugAvailable(
      normalized,
      pet.id,
    );
    if (checkErr) {
      return {
        ok: false,
        error: "Could not check URL availability. Please try again.",
      };
    }
    if (!available) {
      return { ok: false, error: "That URL is taken. Try another." };
    }

    // Save
    setSaveStatus("saving");
    const { data, error } = await updatePet(pet.id, { slug: normalized });
    if (error) {
      setSaveStatus("error");
      return { ok: false, error: "Could not save. Please try again." };
    }
    if (data) {
      onPetChange(data);
    }
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);

    // Update browser URL to match new slug WITHOUT triggering Next.js navigation.
    // We already have the updated pet data in state (via onPetChange above), so
    // a router.replace() would just unnecessarily re-fetch and leave the button
    // stuck spinning during the transition. history.replaceState updates the
    // URL bar in-place, no remount.
    if (typeof window !== "undefined") {
      window.history.replaceState(
        null,
        "",
        `/pet-card/${normalized}/care-edit`,
      );
    }

    return { ok: true, error: null };
  }

  // Photo upload — mirrors Profile pattern exactly
  async function handlePhotoUpload(e) {
    const raw = e.target.files?.[0];
    if (!raw) return;
    setPhotoError("");
    const { file, error: prepErr } = await prepareImageFile(
      raw,
      () => setPhotoConverting(true),
      () => setPhotoConverting(false),
    );
    if (prepErr) {
      setPhotoError(prepErr);
      e.target.value = "";
      return;
    }
    setPhotoUploading(true);
    setSaveStatus("saving");
    const { url, error } = await uploadPetPhoto(pet.id, file);
    setPhotoUploading(false);
    if (error) {
      setPhotoError(
        error.message || "Could not upload photo. Please try again.",
      );
      setSaveStatus("error");
      e.target.value = "";
      return;
    }
    onPetChange({ ...pet, photo_url: url });
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    e.target.value = "";
  }

  const bucket = speciesBucket(pet.species);
  const Icon = SPECIES_ICON[bucket] || Sparkles;
  const tint = SPECIES_TINT[bucket] || SPECIES_TINT.mixed;
  const ageStr = formatAgeForHeader(pet.birthday);

  return (
    <>
      <style>{`
        /* Reserve the scrollbar's space permanently so opening a modal (which
           locks body scroll) doesn't change the content width and shift the
           page left/right. */
        html { scrollbar-gutter: stable; }
        .pce-body { background: var(--color-cream, #F5F0E8); min-height: calc(100vh - 64px); padding: 32px 0 96px; }

        /* Top compact header row (back link + save indicator) */
        .pce-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          // min-height: 36px;
        }
        /* Breadcrumb lives inside the topbar flex row; kill its own bottom
           margin so the topbar's margin-bottom is the single source of the
           gap below it (keeps spacing identical to other pages). */
        .pce-topbar .bc-nav { margin-bottom: 0; }
        .pce-back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--color-terracotta, #CF5C36);
          text-decoration: none;
          font-size: 15px;
          font-weight: 700;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: color 0.15s;
        }
        .pce-back-link:hover { 
          color: var(--color-navy-dark, #172531);
          opacity: 1;
          
          }

        /* Persistent save status in top bar */
        .pce-save-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          font-weight: 600;
          color: var(--color-muted, #717A86);
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-save-status.saved { color: #1A6641; }
        .pce-save-status.error { color: #C94040; }

        /* Save indicator — bottom-right floating toast */
        .pce-save-toast {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 50;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: #fff;
          border-radius: 9999px;
          box-shadow: 0 8px 24px rgba(23,37,49,0.18), 0 0 0 1px rgba(23,37,49,0.06);
          font-size: 14px;
          font-weight: 600;
          color: var(--color-muted, #717A86);
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          animation: pce-toast-in 0.18s ease-out;
        }
        .pce-save-toast.saved { color: #1A6641; }
        .pce-save-toast.error { color: #C94040; }
        @keyframes pce-toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 640px) {
          .pce-save-toast { right: 16px; bottom: 16px; }
        }
        .pce-spin { animation: pce-spin 0.9s linear infinite; }
        @keyframes pce-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* Pet header — compact identity strip at top */
        .pce-pet-header {
          display: flex;
          gap: 20px;
          align-items: center;
          padding: 20px;
          background: #fff;
          border-radius: 16px;
          border: 1px solid rgba(23,37,49,0.06);
          margin-bottom: 28px;
        }
        .pce-pet-photo-wrap {
          position: relative;
          width: 88px;
          height: 88px;
          border-radius: 14px;
          overflow: hidden;
          flex-shrink: 0;
        }
        .pce-pet-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .pce-pet-photo-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pce-photo-change-btn {
          /* 32px before. */
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 44px;
          height: 44px;
          border-radius: 9999px;
          background: var(--color-terracotta, #CF5C36);
          color: #fff;
          border: 2px solid #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s;
        }
        .pce-photo-change-btn:hover { transform: scale(1.05); }
        .pce-photo-change-btn:disabled { opacity: 0.5; cursor: wait; }
        .pce-photo-input { display: none; }
        .pce-pet-header-info { flex: 1; min-width: 0; }
        .pce-pet-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-terracotta, #CF5C36);
          margin: 0 0 4px;
        }
        .pce-pet-name {
          font-size: clamp(19px, 2.6vw, 22px);
          font-weight: 800;
          color: var(--color-navy-dark, #172531);
          margin: 0 0 4px;
          letter-spacing: -0.01em;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          line-height: 1.2;
          word-break: break-word;
        }
        .pce-pet-quick-meta {
          font-size: 15px;
          font-weight: 500;
          color: #717A86;
          margin: 0;
          line-height: 1.4;
        }
        .pce-photo-error {
          font-size: 14px;
          color: #C94040;
          margin-top: 8px;
          line-height: 1.5;
        }

        /* Sections */
        .pce-section {
          background: #fff;
          border-radius: 16px;
          padding: 28px 24px;
          margin-bottom: 20px;
          border: 1px solid rgba(23,37,49,0.06);
        }
        .pce-section-header { margin-bottom: 20px; }

        /* Collapsible section: the header becomes a full-width clickable toggle.
           Resets default button styling so it looks identical to the static
           header, just with a caret on the right that rotates when open. */
        .pce-section-toggle {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          width: 100%;
          background: none;
          border: none;
          padding: 0;
          margin: 0 0 20px;
          cursor: pointer;
          text-align: left;
          font: inherit;
          color: inherit;
          -webkit-tap-highlight-color: transparent;
        }
        .pce-section-toggle .pce-section-toggle-text {
          display: flex;
          flex-direction: column;
        }
        .pce-section--collapsible:not(.is-open) .pce-section-toggle {
          margin-bottom: 0;
        }
        .pce-section-caret {
          flex-shrink: 0;
          margin-top: 6px;
          color: var(--color-slate, #4B5563);
          transition: transform 0.3s cubic-bezier(0.33, 1, 0.68, 1);
        }
        .pce-section--collapsible.is-open .pce-section-caret {
          transform: rotate(180deg);
        }
        .pce-expand-all-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 12px;
        }
        .pce-expand-all-btn {
          display: inline-flex;
          align-items: center;
          min-height: 44px;
          background: none;
          border: 2px solid var(--color-border, #EDE8E0);
          // border-radius: 9999px;
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 600;
          color: var(--color-slate, #4B5563);
          cursor: pointer;
          font-family: var(--font-urbanist, 'Urbanist', sans-serif);
          transition: background 0.15s, color 0.15s;
          border-radius: 12px;
        }
        .pce-expand-all-btn:hover {
          background: var(--color-cream, #F5F0E8);
          color: var(--color-navy-dark, #172531);
        }
        .pce-section-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-terracotta, #CF5C36);
          margin: 0 0 6px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-section-title {
          font-size: clamp(19px, 2.6vw, 22px);
          font-weight: 800;
          color: var(--color-navy-dark, #172531);
          margin: 0 0 4px;
          letter-spacing: -0.01em;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          line-height: 1.2;
        }
        .pce-section-sub {
          font-size: 16px;
          font-weight: 500;
          color: var(--color-slate, #4B5563);
          margin: 0;
          line-height: 1.55;
        }

        /* Section coming-soon placeholder */
        .pce-coming-soon {
          padding: 18px 20px;
          background: var(--color-cream, #F5F0E8);
          border-radius: 12px;
          color: var(--color-muted, #717A86);
          font-size: 16px;
          line-height: 1.55;
        }

        /* Form fields */
        .pce-field-grid {
          display: grid;
          grid-template-columns: 1fr;
          /* Match the 14px adjacency gap used elsewhere in forms for visual
             consistency — without this, fields inside grids felt slightly more
             spaced out than the rest of the modal. */
          gap: 14px;
        }
        /* FrequencyField wrapper — when it contains multiple sub-blocks
           (Frequency dropdown + days picker + Repeats), they stack with the
           standard 14px gap. The days picker gets a slightly tighter gap above
           it (-6px adjustment = effective 8px gap) as a visual cue that the
           picker is tied to the Frequency dropdown directly above it. */
        .pce-frequency-block {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .pce-frequency-block > .pce-field + .pce-days-picker {
          margin-top: -6px;
        }
        @media (min-width: 640px) {
          .pce-field-grid.two-col { grid-template-columns: 1fr 1fr; }
        }
        .pce-field {
          display: flex;
          flex-direction: column;
        }
        /* Form-block spacing is now handled by parent container gap rules
           on .pce-modal-body and .pce-entry-card (see above). Adjacency
           selectors are not needed — every direct child of those flex columns
           inherits the 14px gap automatically. If a form is rendered outside
           those containers, the parent should also use display:flex;
           flex-direction:column; gap:14px for consistent spacing. */
        .pce-label {
          font-size: 14px;
          font-weight: 700;
          color: var(--color-navy-dark, #172531);
          margin-bottom: 6px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-input,
        .pce-select {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          font-size: 15px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          color: var(--color-navy-dark, #172531);
          background: #fff;
          border: 1px solid rgba(23,37,49,0.10);
          border-radius: 12px;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
          -webkit-appearance: none;
          appearance: none;
        }
        textarea.pce-input { height: auto; padding: 12px 14px; min-height: 80px; }
        .pce-select {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          padding-right: 40px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23717A86' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          background-size: 12px 8px;
        }
        .pce-input:focus,
        .pce-select:focus {
          outline: none;
          border-color: var(--color-terracotta, #CF5C36);
          box-shadow: 0 0 0 3px rgba(207,92,54,0.12);
        }
        /* Pet card URL field — slug input + dedicated Update button.
           Update is intentional (not autosave) because changing URL breaks shared links. */
        .pce-slug-row {
          display: flex;
          gap: 8px;
          align-items: stretch;
        }
        .pce-slug-row .pce-input { flex: 1 1 auto; min-width: 0; }
        .pce-slug-save-btn {
          flex-shrink: 0;
          height: 46px;
          padding: 0 18px;
          font-size: 14px;
          font-weight: 700;
          color: var(--color-navy-dark, #172531);
          background: #fff;
          border: 1.5px solid rgba(23,37,49,0.16);
          border-radius: 10px;
          cursor: pointer;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: background 0.15s, border-color 0.15s, color 0.15s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          white-space: nowrap;
        }
        .pce-slug-save-btn:hover:not(:disabled) {
          background: var(--color-navy-dark, #172531);
          color: #fff;
          border-color: var(--color-navy-dark, #172531);
        }
        .pce-slug-save-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .pce-field-saved {
          color: #1A6641;
          font-weight: 600;
        }
        .pce-field-warn-soft {
          color: #8C6A11;
          font-weight: 500;
        }
        @media (max-width: 640px) {
          .pce-slug-row {
            flex-direction: column;
          }
          .pce-slug-save-btn { width: 100%; }
        }

        .pce-field-hint {
          /* 110ch at 1024. */
          max-width: 68ch;
          font-size: 13px;
          font-weight: 500;
          color: #717A86;
          margin: 6px 0 0;
          line-height: 1.4;
        }
        .pce-field-hint.pce-field-warn {
          color: #C94040;
          font-weight: 500;
        }
        .pce-field-hint--with-count {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
        }
        .pce-char-count {
          flex-shrink: 0;
          font-size: 13px;
          font-weight: 500;
          color: #717A86;
        }
        .pce-char-count.is-max {
          color: var(--color-terracotta, #CF5C36);
          font-weight: 600;
        }
        .pce-req-mark {
          color: #C94040;
          font-weight: 700;
          margin-left: 2px;
        }

        /* Textarea - used for allergies, conditions free-text */
        .pce-textarea {
          width: 100%;
          min-height: 80px;
          padding: 12px 14px;
          font-size: 15px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          color: var(--color-navy-dark, #172531);
          background: #fff;
          border: 1px solid rgba(23,37,49,0.10);
          border-radius: 12px;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
          resize: vertical;
          line-height: 1.5;
        }
        .pce-textarea:focus {
          outline: none;
          border-color: var(--color-terracotta, #CF5C36);
          box-shadow: 0 0 0 3px rgba(207,92,54,0.12);
        }

        /* List of structured items (vaccinations, medications) */
        .pce-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }
        /* List item: white card with warm border + soft shadow.
           Matches Profile pet card styling (.pp-pet-card).
           Hover adds amber-cream ring + deepened shadow for prominent feedback. */
        .pce-list-item {
          display: flex;
          align-items: flex-start;
          // gap: 4px;
          padding: 20px;
          background: #fff;
          border: 1px solid #EDE8E0;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(23,37,49,0.07);
          transition: box-shadow 0.25s, border-color 0.25s;
        }
        .pce-list-item:hover {
          border-color: rgba(239,200,139,0.9);
          box-shadow: 0 0 0 1.5px rgba(239,200,139,0.9),
                      0 16px 48px rgba(23,37,49,0.13);
        }
        /* Inline icon — sits next to title text inside the title row. */
        .pce-list-item-icon-inline {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--color-terracotta, #CF5C36);
          flex-shrink: 0;
          line-height: 0;
        }
        .pce-list-item-body { flex: 1; min-width: 0; }
        /* Title row: title + status pill side by side, vertically centered. */
        .pce-list-item-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          /* flex-wrap: wrap; */
          margin-bottom: 0;
        }
        /* Variant for TextareaCard (Allergies/Medical conditions/Quirks): the
           "title" is actually multi-line prose that may wrap to many lines.
           Anchor the icon to the TOP-LEFT so it stays adjacent to the first
           line of text regardless of how much the text wraps. */
        .pce-list-item-title-row--prose {
          align-items: flex-start;
          flex-wrap: nowrap;
        }
        /* Nudge the icon down slightly so it visually aligns with the first
           line of prose text (icon box top vs. text baseline) */
        .pce-list-item-title-row--prose .pce-list-item-icon-inline {
          margin-top: 2px;
        }
        .pce-list-item-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--color-navy-dark, #172531);
          margin: 0;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          line-height: 1.3;
          word-break: break-word;
        }
        /* Used by TextareaCard view-mode (Allergies, Medical conditions, Quirks)
           — renders the multi-line text content like body prose, not bold title. */
        .pce-list-item-prose {
          /* 88ch at 900 and above. */
          max-width: 68ch;
          font-size: 16px;
          font-weight: 500;
          color: var(--color-navy-dark, #172531);
          margin: 0;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          /* line-height: 1.5; */
          white-space: pre-wrap;
          word-break: break-word;
        }
        /* Status pill — sits inline with title for immediate awareness. */
        .pce-list-item-status {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          white-space: nowrap;
          flex-shrink: 0;
        }
        /* Separator: subtle horizontal line splitting status from meta details. */
        .pce-list-item-sep {
          height: 1px;
          background: rgba(23,37,49,0.08);
          margin: 12px 0;
        }
        /* Meta section — label:value rows.
           MOBILE (default, <720px): stacked rows, "Label: Value" inline.
           DESKTOP (>=720px): grid layout with equal-width columns,
           label on top + value below per column (uses --col-count from JSX). */
        .pce-list-item-meta {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .pce-list-item-meta-row {
          display: flex;
          gap: 8px;
          align-items: baseline;
          font-size: 16px;
          line-height: 1.4;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        /* Slug display in Identity view-mode card — shows the public URL path. */
        .pce-identity-slug {
          margin: 4px 0 0;
          padding-left: 28px;
          font-size: 16px;
          font-weight: 500;
          color: #717A86;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          word-break: break-all;
        }

        /* Per-section modifier classes for .pce-list-item-meta. Each section
           has its own min-width tuned to its longest label so labels and values
           sit on the same line without wrapping into adjacent columns.
           Mobile (<=375px) still uses the base stacked layout (label above value),
           so these modifiers only kick in above 375px where the grid is active.
           To tweak any section's label width, edit the px value in its block. */
        @media (min-width: 376px) {
          /* Identity (view-mode card): Species, Breed, Sex, Spay / Neuter, etc. */
          .pce-list-item-meta--identity .pce-list-item-meta-label {
            min-width: 72px;
          }

          /* Emergency contacts: Relationship, Phone, Alt phone, Email */
          .pce-list-item-meta--emergency .pce-list-item-meta-label {
            min-width: 88px;
          }

          /* Vet visit history: Date, Clinic, Reason */
          .pce-list-item-meta--vet-history .pce-list-item-meta-label {
            min-width: 54px;
          }

          /* Primary vet card: Phone, Address */
          .pce-list-item-meta--primary-vet .pce-list-item-meta-label {
            min-width: 60px;
          }

          /* Emergency vet card: Phone, Address */
          .pce-list-item-meta--emergency-vet .pce-list-item-meta-label {
            min-width: 61px;
          }

          /* Specialists: Specialty, Phone, Address */
          .pce-list-item-meta--specialists .pce-list-item-meta-label {
            min-width: 69px;
          }

          /* Insurance card: Policy #, Phone, CareCredit, CareCredit # */
          .pce-list-item-meta--insurance .pce-list-item-meta-label {
            min-width: 97px;
          }

          /* Feeding cards: Time, Amount, Days */
          .pce-list-item-meta--feedings .pce-list-item-meta-label {
            min-width: 76px;
          }

          /* Walk cards: Time, Duration, Days */
          .pce-list-item-meta--walks .pce-list-item-meta-label {
            min-width: 76px;
          }

          /* Vaccination cards: Given, Given by, Next due */
          .pce-list-item-meta--vaccinations .pce-list-item-meta-label {
            min-width: 43px;
          }

          /* Medication cards: Dose, Given, Given by, Frequency */
          .pce-list-item-meta--medications .pce-list-item-meta-label {
            min-width: 37px;
          }
        }

        /* Identity birthday: date + (X years old) on two lines within the
           value column. Used by .pce-identity-value-stack inside a meta-row. */
        .pce-identity-value-stack {
          display: inline-flex;
          flex-direction: column;
          gap: 2px;
        }
        .pce-identity-sub-line {
          font-size: 14px;
          font-weight: 500;
          color: #717A86;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }

        .pce-list-item-meta-label {
          font-weight: 500;
          color: #717A86;
          flex-shrink: 0;
          min-width: 70px;
        }
        /* Weight entry cards: align both labels ("Weight:" and "Change:")
           by giving the label column enough width to fit the longest one. */
        .pce-list-item-meta--weight .pce-list-item-meta-label {
          min-width: 59px;
        }
        /* Weight cards used to override align-items to center for the arrow icon
           in "Weight change" but that broke the layout in other contexts. Removed —
           default baseline alignment works correctly. */
        /* If a Weight entry has only one row (no previous to compare), use the
           tighter 40px label so it doesn't look airy with a 145px label and short value. */
        .pce-list-item-meta--weight[style*="--col-count: 1"] .pce-list-item-meta-label {
          min-width: 40px;
        }

        /* Inline arrow icon + text within the weight change value cell.
           Renders as a plain inline span (NOT inline-flex), so when the parent
           row uses align-items: baseline, the text inside this value sits on
           the baseline naturally — same as any other text value.
           The SVG icon is vertical-aligned to text-bottom so it sits on the
           same baseline as the text, rather than peeking above it. */
        .pce-weight-change {
          white-space: nowrap;
        }
        .pce-weight-change svg {
          vertical-align: text-bottom;
          margin-right: 2px;
        }
        /* Direction colors for the weight change indicator. We don't use
           red/green because for pets, gain/loss isn't inherently good or
           bad (depends on age, recovery, etc.). Instead: terracotta when
           there's any change (matches the chart line + tooltip value),
           muted gray when stable. Same logic as the chart's tooltip: the
           active data gets the accent color. */
        .pce-weight-change.up,
        .pce-weight-change.down {
          color: var(--color-terracotta, #CF5C36);
        }
        .pce-weight-change.up svg,
        .pce-weight-change.down svg {
          color: var(--color-terracotta, #CF5C36);
        }
        .pce-weight-change.stable {
          color: var(--color-muted, #717A86);
        }

        /* Weight change uses neutral dark navy (same as other meta values).
           No semantic coloring — pet weight goals vary (some pets need to gain,
           some need to lose, some maintain). The words "Gained" / "Lost" convey
           direction; color would imply a judgment that may not match the user's goal. */
        /* Default meta-value — renders inline beside the label. Multi-line
           values (e.g. 2-line addresses) use <br/> for line breaks rather than
           CSS flex tricks, which avoids browser quirks with inline-flex/block
           combinations and works reliably across all viewports and browsers. */
        .pce-list-item-meta-value {
          font-weight: 600;
          color: var(--color-navy-dark, #172531);
          word-break: break-word;
          min-width: 0;
        }
        /* Notes section — appears below meta when item has notes.
           Label on top + content below (matches label-above-value pattern).
           Long notes truncate at preview, expand with smooth transition. */
        .pce-notes {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(23,37,49,0.08);
        }
        .pce-notes-label {
          font-size: 16px;
          font-weight: 500;
          color: #717A86;
          margin: 0 0 4px;
          line-height: 1.4;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-notes-content {
          overflow: hidden;
          transition: max-height 0.3s ease;
          /* max-height set via inline style — uses measured content heights */
        }

        .pce-notes-text {
          /* 88ch at 900 and above. */
          max-width: 68ch;
          font-size: 16px;
          font-weight: 500;
          color: var(--color-navy-dark, #172531);
          margin: 0;
          line-height: 1.5;
          word-break: break-word;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        /* CSS line-clamp: native 3-line truncation with browser-rendered
           ellipsis. Applied to text in collapsed state. No JS text swap needed —
           the ellipsis appears instantly when the class is toggled. */
        .pce-notes-clamped {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .pce-notes-toggle {
          background: none;
          border: none;
          padding: 6px 0 0;
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          color: var(--color-terracotta, #CF5C36);
          cursor: pointer;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: color 0.15s;
        }
        .pce-notes-toggle:hover {
          color: var(--color-navy-dark, #172531);
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        /* Smallest phones (≤375px): stack label above value so values get full width.
           Larger phones use the inline label+value pattern (still readable). */
        @media (max-width: 375px) {
          .pce-list-item-meta-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
          }

          .pce-list-item-meta-label {
            min-width: 40px;
            font-size: 16px;
            /* letter-spacing: 0.04em; */
            line-height: 1.3;
          }
        }
        /* Special-case: Identity stacks on mobile (376-767px) because its values
           (breed, color, microchip) are the longest and wrap badly inline. Other
           sections stay inline in this range. Below 376px everything stacks. */
        @media (min-width: 600px) {
          /* Desktop: CSS Grid with natural-content columns. Each pair takes its own
             natural width (max-content) but gets at least 160px to avoid cramping.
             auto-fit fills the row with as many columns as fit, then wraps. */
          .pce-list-item-meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, max-content));
            gap: 14px 32px;
            align-items: flex-start;
          }
          /* Identity card: force a clean 2-column grid on desktop. Each row uses
             the inline label:value pattern (label left, value right) instead of the
             default column-stacked grid, so the 90px label min-width lines up. */
          .pce-list-item-meta--identity,
          .pce-list-item-meta--insurance {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .pce-list-item-meta--identity .pce-list-item-meta-row,
          .pce-list-item-meta--insurance .pce-list-item-meta-row {
            flex-direction: row;
            align-items: baseline;
            gap: 8px;
          }
          .pce-list-item-meta--identity .pce-list-item-meta-label,
          .pce-list-item-meta--insurance .pce-list-item-meta-label {
            font-size: 16px;
            letter-spacing: 0;
            line-height: 1.4;
          }
          .pce-list-item-meta--identity .pce-list-item-meta-label {
            min-width: 72px;
          }
          .pce-list-item-meta--insurance .pce-list-item-meta-label {
            /* min-width: 87px; */
            min-width: 40px;
          }
          .pce-list-item-meta-row {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
            min-width: 0;
          }
          .pce-list-item-meta-label {
            font-size: 16px;
            /* letter-spacing: 0.04em; */
            line-height: 1.3;
            min-width: 0;
          }
          .pce-list-item-meta-value {
            font-size: 16px;
            line-height: 1.4;
            word-break: break-word;
          }
        }
        .pce-list-item-status.overdue { background: rgba(201,64,64,0.12); color: #C94040; }
        .pce-list-item-status.soon    { background: rgba(217,162,27,0.14); color: #8C6A11; }
        .pce-list-item-status.ok      { background: rgba(26,102,65,0.12); color: #1A6641; }
        .pce-list-item-status.active  { background: rgba(26,102,65,0.12); color: #1A6641; }
        .pce-list-item-status.ended   { background: rgba(113,122,134,0.14); color: #4B5563; }
        .pce-list-item-actions {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }
        .pce-icon-btn {
          border-radius: 8px;
          padding: 4px;
          background: transparent;
          color: var(--color-muted, #717A86);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          transition: background 0.15s, color 0.15s;
        }
        .pce-icon-btn:hover { background: rgba(23,37,49,0.06); color: var(--color-navy-dark, #172531); }
        .pce-icon-btn.danger:hover { background: rgba(201,64,64,0.10); color: #C94040; }

        /* Empty state inside a list section. The 20px margin-bottom matches
           .pce-list's margin-bottom so the gap between the content area and
           whatever follows (typically a "+ Add" button or the next subsection)
           is identical whether the section is empty or has items. */
        .pce-list-empty {
          padding: 18px 20px;
          background: var(--color-cream, #F5F0E8);
          border-radius: 12px;
          color: var(--color-muted, #717A86);
          font-size: 16px;
          line-height: 1.55;
          margin-bottom: 20px;
        }

        /* =============================================================
           TAG INPUT (chip-style array editor) — used by Personality fields
           (traits, loves, dislikes) and Identity tags. Visually mimics a
           text input with chips rendered inline before the text caret.
           ============================================================= */
        .pce-tag-input {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 8px 10px;
          min-height: 44px;
          background: #fff;
          border: 1px solid rgba(23,37,49,0.16);
          border-radius: 12px;
          cursor: text;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          align-items: center;
        }
        .pce-tag-input:focus-within {
          border-color: var(--color-navy-dark, #172531);
          box-shadow: 0 0 0 3px rgba(23,37,49,0.08);
        }
        /* Error state: shown briefly when user attempts an invalid action
           (duplicate tag, max tags reached). Tint the border red for stronger
           visual feedback than just the message below. */
        .pce-tag-input--error {
          border-color: #C94040;
        }
        .pce-tag-input--error:focus-within {
          border-color: #C94040;
          box-shadow: 0 0 0 3px rgba(201,64,64,0.10);
        }
        /* At-limit notice: shown inside the chip box when the user has hit
           maxTags, in place of the input field. Italicized + muted so it
           reads as informational (not as another chip). */
        .pce-tag-input-limit-notice {
          font-size: 14px;
          font-style: italic;
          color: var(--color-muted, #717A86);
          padding: 4px 0;
          flex: 1 1 100%;
          width: 100%;
          min-width: 0;
        }
        .pce-tag-input-field {
          flex: 1;
          min-width: 80px;
          border: none;
          outline: none;
          background: transparent;
          font-size: 15px;
          font-family: inherit;
          color: var(--color-navy-dark, #172531);
          padding: 4px 0;
        }
        .pce-tag-input-field::placeholder {
          color: var(--color-muted, #717A86);
        }

        /* =============================================================
           SHARE SECTION — master toggle + per-card share URL controls
           ============================================================= */

        /* Master toggle row at the top of the Share section.
           Contains the description and the actual toggle switch. */
        .pce-share-master {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 20px;
          background: var(--color-cream, #F5F0E8);
          border-radius: 12px;
          margin-bottom: 20px;
        }
        .pce-share-master-text {
          flex: 1;
          min-width: 0;
        }
        .pce-share-master-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--color-navy-dark, #172531);
          margin: 0 0 2px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-share-master-sub {
          font-size: 15px;
          font-weight: 500;
          color: #717A86;
          line-height: 1.5;
          margin: 0;
        }

        /* iOS-style toggle switch. Solid pill background. When ON, the
           background turns navy dark; the knob slides to the right. */
        .pce-toggle {
          flex-shrink: 0;
          position: relative;
          width: 44px;
          height: 26px;
          border-radius: 999px;
          border: none;
          background: rgba(23,37,49,0.20);
          cursor: pointer;
          padding: 0;
          transition: background 180ms ease;
        }
        .pce-toggle.is-on {
          background: var(--color-navy-dark, #172531);
        }
        .pce-toggle-knob {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 20px;
          height: 20px;
          border-radius: 999px;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.18);
          transition: left 180ms ease;
        }
        .pce-toggle.is-on .pce-toggle-knob {
          left: 21px;
        }

        /* Group of share cards (one per card type). When master is OFF the
           whole group is faded but still readable so the user understands
           what they'd be turning on. */
        .pce-share-cards {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .pce-share-cards.is-disabled {
          opacity: 0.55;
          pointer-events: none;
          /* Allow the "Stop sharing" button to still work even when master
             is off — the user may want to clean up before disabling. But
             practically, master-off is a kill switch so revoking individual
             tokens isn't necessary. Keep it simple: full lockout when off. */
        }

        /* One share card: header + URL row + meta + actions. */
        .pce-share-card {
          background: #fff;
          border: 1px solid #EDE8E0;
          border-radius: 14px;
          padding: 20px;
          box-shadow: 0 2px 12px rgba(23,37,49,0.07);
        }
        .pce-share-card-header {
          display: flex;
          align-items: flex-start;
          gap: 0;
          margin-bottom: 16px;
        }
        .pce-share-card-icon {
          display: inline-flex;
          align-items: flex-start;
          justify-content: center;
          /* width: 36px; */
          height: 36px;
          color: var(--color-navy-dark, #172531);
          flex-shrink: 0;
          margin-right: 8px;
        }
        .pce-share-card-heading {
          flex: 1;
          min-width: 0;
        }
        .pce-share-card-title {
          font-size: 17px;
          font-weight: 800;
          color: var(--color-navy-dark, #172531);
          margin: 0 0 4px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-share-card-desc {
          font-size: 16px;
          font-weight: 500;
          line-height: 1.5;
          color: #717A86;
          margin: 0;
        }
        .pce-share-card-loading {
          font-size: 14px;
          color: var(--color-muted, #717A86);
          font-style: italic;
          margin: 0;
        }

        /* URL row: read-only input + Copy button, side by side.
           On mobile the input shrinks; the copy button has a fixed min width
           so its label always fits ("Copied" doesn't truncate). */
        /* QR code block — toggled below share URL meta. */
        .pce-share-qr {
          margin-top: 12px;
        }
        .pce-share-qr-toggle {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 0;
          background: transparent;
          border: none;
          font-size: 16px;
          font-weight: 700;
          color: var(--color-terracotta, #CF5C36);
          cursor: pointer;
          font-family: var(--font-urbanist, 'Urbanist', sans-serif);
        }
        .pce-share-qr-toggle:hover {
          color: var(--color-navy-dark, #172531);
        }
        .pce-share-qr-chevron {
          transition: transform 0.2s ease;
        }
        .pce-share-qr-toggle.is-open .pce-share-qr-chevron {
          transform: rotate(180deg);
        }
        .pce-share-qr-anim {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.28s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pce-share-qr-anim.is-open {
          grid-template-rows: 1fr;
        }
        .pce-share-qr-anim-inner {
          overflow: hidden;
          min-height: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .pce-share-qr-anim { transition: none; }
        }
        .pce-share-qr-panel {
          display: flex;
          gap: 20px;
          align-items: center;
          margin-top: 12px;
          padding: 16px;
          background: var(--color-cream, #F5F0E8);
          border: 1px solid #EDE8E0;
          border-radius: 12px;
        }
        .pce-share-qr-svg {
          flex-shrink: 0;
          padding: 10px;
          background: #fff;
          border-radius: 10px;
          border: 1px solid #EDE8E0;
          line-height: 0;
        }
        .pce-share-qr-svg svg {
          display: block;
        }
        /* QR caption — sits next to the QR image, mirrors PCC pattern. */
        .pce-share-qr-caption {
          flex: 1;
          min-width: 0;
        }
        .pce-share-qr-caption-label {
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #717A86;
          margin: 0 0 4px;
        }
        .pce-share-qr-caption-url {
          font-size: 16px;
          font-weight: 500;
          color: var(--color-navy-dark, #172531);
          margin: 0;
          word-break: break-all;
          line-height: 1.4;
          font-variant-numeric: tabular-nums;
        }
        .pce-share-qr-info {
          flex: 1;
          min-width: 0;
        }
        /* ============================================================
           Share section buttons — Option Z styling.
           Share = filled terracotta (primary).
           Both Downloads = identical navy outline (visual peers).
           Local 2px border definition so the buttons are pixel-equal,
           without touching the global .pce-btn-secondary class used
           elsewhere in the editor.
           ============================================================ */
        .pce-share-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 16px;
          margin-top: 20px;
        }
        .pce-share-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 48px;
          min-width: 90px;
          padding: 0 24px;
          line-height: 1;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          font-family: var(--font-urbanist, 'Urbanist', sans-serif);
          white-space: nowrap;
          cursor: pointer;
          border: 2px solid transparent;
          text-decoration: none;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .pce-share-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .pce-share-btn--primary {
          background: var(--color-terracotta, #CF5C36);
          color: #fff;
          border-color: var(--color-terracotta, #CF5C36);
        }
        .pce-share-btn--primary:hover:not(:disabled) {
          background: #fff;
          color: var(--color-terracotta, #CF5C36);
        }
        .pce-share-btn--secondary,
        a.pce-share-btn--secondary,
        a.pce-share-btn--secondary:link,
        a.pce-share-btn--secondary:visited {
          background: #fff;
          color: var(--color-navy-dark, #172531);
          border-color: rgba(23, 37, 49, 0.18);
          font-weight: 600;
        }
        /* :hover scoped to :not(:focus-visible) so hover doesn't stay
           "stuck" after a click leaves the button focused. */
        .pce-share-btn--secondary:hover:not(:disabled):not(:focus-visible),
        a.pce-share-btn--secondary:hover:not(:focus-visible) {
          background: var(--color-navy-dark, #172531);
          color: #fff;
          border-color: var(--color-navy-dark, #172531);
        }

        /* Hints — two paragraphs with breathing room. */
        .pce-share-hints {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 0;
        }
        .pce-share-hint {
          font-size: 15px;
          font-weight: 500;
          color: #717A86;
          margin: 0;
          line-height: 1.55;
        }
        .pce-share-hint strong {
          font-weight: 700;
          color: var(--color-navy-dark, #172531);
        }

        /* B1: Manage-link toggle — destructive actions tucked away. */
        .pce-share-manage {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(23, 37, 49, 0.08);
        }
        .pce-share-manage-toggle {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          font-size: 16px;
          font-weight: 700;
          color: var(--color-terracotta, #CF5C36);
          cursor: pointer;
          font-family: var(--font-urbanist, 'Urbanist', sans-serif);
          /* Smooth color + width animation so the label swap doesn't
             snap. Width adjusts to fit the (different-length) label,
             but the change animates over 200ms. */
          transition: color 0.15s ease, min-width 0.2s ease;
        }
        /* :hover scoped to :not(:focus-visible) so the color doesn't
           stay navy after a click that left focus on the button. */
        .pce-share-manage-toggle:hover:not(:focus-visible) {
          color: var(--color-navy-dark, #172531);
        }
        /* Chevron rotates 180° when manage panel is open, signaling
           expand/collapse to the user. */
        .pce-share-manage-chevron {
          transition: transform 0.2s ease;
        }
        .pce-share-manage-toggle.is-open .pce-share-manage-chevron {
          transform: rotate(180deg);
        }
        .pce-share-manage-panel {
          margin-top: 12px;
          padding: 18px 20px;
          background: rgba(23, 37, 49, 0.025);
          border: 1px solid rgba(23, 37, 49, 0.06);
          border-radius: 10px;
        }
        /* Smooth open/close: animate grid-template-rows 0fr -> 1fr so the panel
           expands to its natural height without a hardcoded max-height. Matches
           the Read more transition feel. */
        .pce-share-manage-anim {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.28s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pce-share-manage-anim.is-open {
          grid-template-rows: 1fr;
        }
        .pce-share-manage-anim-inner {
          overflow: hidden;
          min-height: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .pce-share-manage-anim { transition: none; }
        }
        /* Two hint paragraphs grouped, each on its own line. */
        .pce-share-manage-hints {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .pce-share-manage-hint {
          font-size: 15px;
          font-weight: 500;
          color: #717A86;
          margin: 0;
          line-height: 1.55;
        }
        .pce-share-manage-hint strong {
          font-weight: 700;
          color: var(--color-navy-dark, #172531);
        }
        /* Divider inside the panel — separates hints from buttons so
           the buttons read as their own distinct action area. */
        .pce-share-manage-divider {
          height: 1px;
          background: rgba(23, 37, 49, 0.10);
          margin: 16px 0;
        }
        .pce-share-manage-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        @media (max-width: 640px) {
          .pce-share-manage-actions {
            flex-direction: column;
            gap: 8px;
          }
          .pce-share-manage-actions > * {
            width: 100%;
          }
        }

        /* Divider between actions and QR-code collapsible. */
        .pce-share-divider {
          height: 1px;
          background: rgba(23, 37, 49, 0.08);
          margin: 20px 0 16px;
        }
        @media (max-width: 640px) {
          .pce-share-qr-toggle {
            /* Left-aligned on mobile to match PCC and the rest of the
               share section content. */
            justify-content: flex-start;
            padding: 6px 0;
          }
          .pce-share-qr-panel {
            flex-direction: column;
            align-items: stretch;
            text-align: center;
          }
          .pce-share-qr-svg {
            align-self: center;
          }
          .pce-share-actions {
            flex-direction: column;
            gap: 10px;
          }
          .pce-share-actions > .pce-share-btn {
            width: 100%;
          }
        }

        .pce-share-url-row {
          display: flex;
          align-items: stretch;
          gap: 8px;
          margin-bottom: 14px;
        }
        .pce-share-url {
          flex: 1;
          min-width: 0;
          height: 44px;
          padding: 0 14px;
          font-size: 15px;
          box-sizing: border-box;
          font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
          color: var(--color-navy-dark, #172531);
          background: var(--color-cream, #F5F0E8);
          border: 1px solid #EDE8E0;
          border-radius: 8px;
          outline: none;
        }
        .pce-share-url:focus {
          border-color: var(--color-navy-dark, #172531);
          box-shadow: 0 0 0 3px rgba(23,37,49,0.08);
        }
        .pce-share-copy-btn {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 14px;
          height: 40px;
          background: var(--color-navy-dark, #172531);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          cursor: pointer;
          transition: background 120ms ease;
          min-width: 86px;
          justify-content: center;
        }
        .pce-share-copy-btn:hover:not(:disabled) {
          background: #0F1A22;
        }
        .pce-share-copy-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Meta row below the URL: view count + Preview link. */
        .pce-share-card-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 14px;
          font-weight: 500;
          color: #717A86;
          margin-bottom: 16px;
        }
        .pce-share-card-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .pce-share-card-preview {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--color-navy-dark, #172531);
          font-weight: 600;
          text-decoration: none;
        }
        .pce-share-card-preview:hover {
          text-decoration: underline;
        }

        /* Action buttons row: Regenerate + Stop sharing.
           "New link" is secondary, "Stop sharing" is destructive (text-only,
           red on hover) so it's deliberately less prominent — accidentally
           revoking is a frustrating mistake. */
        .pce-share-card-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        /* Destructive text-only button. Used for "Stop sharing" — visually
           subdued to discourage accidental clicks, but reads clearly as a
           destructive action via the red hover state. */
        .pce-btn-danger-text {
          background: transparent;
          color: var(--color-muted, #717A86);
          border: none;
          font-size: 14px;
          font-weight: 600;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 8px;
          transition: color 120ms ease, background 120ms ease;
        }
        .pce-btn-danger-text:hover:not(:disabled) {
          color: #C94040;
          background: rgba(201,64,64,0.06);
        }
        .pce-btn-danger-text:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Mobile: stack URL row vertically so the input gets full width
           and the copy button drops below it. Stack the master toggle row
           too (text on top, toggle below) since the subtitle is longer than
           a typical toggle row can hold cleanly. Generate/New link/Stop
           sharing buttons become full-width so they're easy to tap. */
        @media (max-width: 640px) {
          .pce-share-url-row {
            flex-direction: column;
          }
          .pce-share-url-row .pce-share-url {
            flex: none;
            width: 100%;
          }
          .pce-share-copy-btn {
            width: 100%;
          }
          .pce-share-master {
            padding: 14px 16px;
          }
          .pce-share-card {
            padding: 16px;
          }
          /* Buttons inside the share card actions row stretch to full width
             on mobile. The flex container wraps so primary + destructive
             stack with proper gap. */
          .pce-share-card-actions {
            flex-direction: column;
            align-items: stretch;
          }
          .pce-share-card-actions .pce-btn-primary,
          .pce-share-card-actions .pce-btn-secondary,
          .pce-share-card-actions .pce-btn-danger-text {
            width: 100%;
            justify-content: center;
          }
        }

        /* Generate row: Expires field (label-above-dropdown) on the left,
           Generate button on the right, both the same height. On desktop
           they sit opposite-aligned with space between. On mobile they
           stack full-width with Expires above Generate. */
        .pce-share-generate-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .pce-share-expire-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .pce-share-expire-label {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          color: #717A86;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        /* Match the Generate button height (48px from .pce-btn-primary, the
           page-wide primary CTA size) so they line up cleanly side-by-side. */
        .pce-share-expire-select {
          height: 44px;
          max-width: 180px;
          padding: 0 32px 0 12px;
          font-size: 15px;
        }

        /* Recent activity (audit log) — collapsible list below the share
           cards. Subtle visual treatment so it doesn't compete with the
           primary share actions above. */
        .pce-share-activity {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #EDE8E0;
        }
        .pce-share-activity-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--color-navy-dark, #172531);
          margin: 0 0 12px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-share-activity-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .pce-share-activity-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 14px;
          color: var(--color-navy-dark, #172531);
          padding: 6px 0;
        }
        .pce-share-activity-action {
          flex: 1;
          min-width: 0;
          font-size: 15px;
          font-weight: 600;
        }
        .pce-share-activity-card {
          color: #717A86;
          font-weight: 500;
        }
        .pce-share-activity-time {
          flex-shrink: 0;
          color: #717A86;
          font-size: 15px;
          font-weight: 500;
        }
        .pce-share-activity-toggle {
          margin-top: 10px;
          background: transparent;
          border: none;
          color: var(--color-terracotta, #CF5C36);
          font-weight: 700;
          font-size: 14px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          cursor: pointer;
          padding: 4px 0;
        }
        .pce-share-activity-toggle.is-open {
          color: var(--color-navy-dark, #172531);
        }
        .pce-share-activity-toggle:hover {
          text-decoration: underline;
        }
        .pce-share-activity-toggle {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .pce-share-activity-chevron {
          transition: transform 0.2s ease;
        }
        .pce-share-activity-toggle.is-open .pce-share-activity-chevron {
          transform: rotate(180deg);
        }
        .pce-share-activity-anim {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.28s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pce-share-activity-anim.is-open {
          grid-template-rows: 1fr;
        }
        .pce-share-activity-anim-inner {
          overflow: hidden;
          min-height: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .pce-share-activity-anim { transition: none; }
        }

        @media (max-width: 640px) {
          /* Mobile: Expires field on top, Generate button below.
             Both full-width and same height for consistent tap targets. */
          .pce-share-generate-row {
            flex-direction: column;
            align-items: stretch;
          }
          .pce-share-expire-field {
            width: 100%;
          }
          .pce-share-expire-select {
            max-width: none;
            width: 100%;
          }
        }

        /* Chip — the rendered tag pill. Two variants:
           - default (inside TagInput): has a remove × button
           - --display (inside view-mode cards): static, no remove button */
        .pce-tag-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 4px 4px 10px;
          background: var(--color-cream, #F5F0E8);
          color: var(--color-navy-dark, #172531);
          font-size: 14px;
          font-weight: 600;
          border-radius: 999px;
          line-height: 1.3;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-tag-chip--display {
          padding: 4px 10px;
        }
        .pce-tag-chip-remove {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border: none;
          background: rgba(23,37,49,0.08);
          color: var(--color-navy-dark, #172531);
          border-radius: 999px;
          cursor: pointer;
          padding: 0;
          transition: background 120ms ease;
        }
        .pce-tag-chip-remove:hover {
          background: rgba(23,37,49,0.16);
        }

        /* Chip display row inside view-mode list-item — flex-wraps so long
           lists wrap to multiple lines instead of overflowing. */
        .pce-tag-chips-display {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          min-width: 0;
        }
        /* For TagArrayCard chip view, center-align the row vertically so the
           pencil icon aligns with the visual center of the chip cluster.
           Multi-row meta sections (vaccinations, weight, etc.) keep the
           default flex-start alignment because their content is taller. */
        .pce-list-item--chips {
          align-items: flex-start;
        }
        /* For cards whose body is logically ONE ROW of content (Nickname,
           Allergies, Medical conditions, Quirks, Fun fact). Target the BODY
           only — let it center its own content vertically inside its height.
           The outer list-item keeps the default flex-start alignment, so the
           pencil icon stays anchored to the top-right corner untouched.
           Multi-row meta cards (vaccinations, vet visits, etc.) don't get
           this modifier — their content stays naturally top-aligned. */
        .pce-list-item--single .pce-list-item-body {
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: 28px;
        }

        /* =============================================================
           IDENTITY TAGS — pill grid + chip display (Hero Card celebration)
           Used by IdentityTagsSection. Tag pills are larger, more visual
           than personality chips because they're the headline identity
           statements (like trading-card badges).
           ============================================================= */
        /* Mobile: 1 column so long labels (Emotional Support, Service /
           Therapy, Forever Loved, Special Needs) never wrap. Each pill gets
           the full row width and the same fixed height.
           Tablet: 2 columns. Desktop: 3 columns. We don't go to 4 columns
           because at narrower desktops long labels would wrap again. */
        .pce-identity-tag-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        @media (min-width: 640px) {
          .pce-identity-tag-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (min-width: 900px) {
          .pce-identity-tag-grid {
            grid-template-columns: 1fr 1fr 1fr;
          }
        }
        /* The pill is structured as a relative container so the (i) info
           button can sit absolutely in the top-right corner. Inner row uses
           flex with center alignment so icon + label stay vertically aligned
           even when label wraps to two lines. Fixed min-height ensures all
           pills have the same height regardless of label length. */
        .pce-identity-tag-pill {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
          padding: 12px 30px 12px 14px;
          background: #fff;
          border: 2px solid #EDE8E0;
          border-radius: 14px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          font-size: 14px;
          font-weight: 600;
          color: var(--color-navy-dark, #172531);
          cursor: pointer;
          transition: background 120ms ease, border-color 120ms ease,
                      transform 120ms ease, box-shadow 120ms ease;
          text-align: left;
          min-height: 64px;
        }
        .pce-identity-tag-pill:hover {
          border-color: rgba(207,92,54,0.40);
          background: rgba(245,240,232,0.50);
        }
        .pce-identity-tag-pill.is-selected {
          background: var(--color-navy-mid, #172531);
          border-color: var(--color-navy-mid, #172531);
          color: #fff;
        }
        .pce-identity-tag-pill.is-selected:hover {
          background: var(--color-navy-mid, #172531);
          border-color: var(--color-navy-mid, #172531);
        }
        /* Subtle press-down on click for tactile feel — matches the "trading
           card / picker game" feel users get from Pokemon-style selection. */
        .pce-identity-tag-pill:active {
          transform: scale(0.97);
        }
        .pce-identity-tag-emoji {
          font-size: 24px;
          line-height: 1;
          flex-shrink: 0;
        }
        .pce-identity-tag-label {
          line-height: 1.25;
          word-break: break-word;
          min-width: 0;
          flex: 1;
        }

        /* Info button in the top-right corner of each pill. Tapping it
           reveals the tag's description in a popover below the pill,
           explaining what the tag means before the user selects it. */
        .pce-identity-tag-info {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 20px;
          height: 20px;
          border-radius: 999px;
          border: none;
          background: rgba(23,37,49,0.10);
          color: var(--color-navy-dark, #172531);
          /* Urbanist (site default), heavy weight for clarity. The "i"
             reads cleanly as "info" at small sizes when bold. */
          font-family: var(--font-urbanist, 'Urbanist', sans-serif);
          font-size: 14px;
          font-weight: 800;
          font-style: normal;
          letter-spacing: 0.02em;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          line-height: 1;
          transition: background 120ms ease;
        }
        /* Mobile-only invisible tap area: expands the (i) hit zone to ~44x44
           without enlarging the visible button. Apple HIG minimum is 44pt.
           The pseudo-element extends outward from the button via negative
           insets, capturing taps in the surrounding empty corner. */
        @media (max-width: 640px) {
          .pce-identity-tag-info::before {
            content: "";
            position: absolute;
            top: -12px;
            right: -12px;
            bottom: -12px;
            left: -12px;
          }
        }
        .pce-identity-tag-info:hover {
          background: rgba(23,37,49,0.18);
        }
        .pce-identity-tag-pill.is-selected .pce-identity-tag-info {
          background: rgba(255,255,255,0.18);
          color: #fff;
        }
        .pce-identity-tag-pill.is-selected .pce-identity-tag-info:hover {
          background: rgba(255,255,255,0.28);
        }

        /* Description popover that appears below a tag pill when its (i)
           button is tapped. Spans the full row width inside the grid via
           grid-column: 1 / -1, so it doesn't squeeze the pills themselves. */
        .pce-identity-tag-info-popover {
          grid-column: 1 / -1;
          padding: 12px 14px;
          background: var(--color-cream, #F5F0E8);
          border: 1px solid #EDE8E0;
          border-radius: 10px;
          font-size: 14px;
          line-height: 1.5;
          color: var(--color-navy-dark, #172531);
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          margin-top: -4px;
        }
        .pce-identity-tag-info-popover-title {
          font-weight: 700;
          margin-bottom: 2px;
        }
        .pce-identity-tag-info-popover-close {
          display: inline-block;
          float: right;
          background: transparent;
          border: none;
          color: var(--color-muted, #717A86);
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          padding: 0;
          margin-left: 8px;
        }

        /* Display-mode chips for selected identity tags (inside view-mode
           list-item card). Smaller than the editor pills but with the same
           emoji + label structure. Cream background for warmth. */
        .pce-identity-tag-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--color-cream, #F5F0E8);
          color: var(--color-navy-dark, #172531);
          font-size: 14px;
          font-weight: 600;
          border-radius: 999px;
          line-height: 1.3;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-identity-tag-chip .pce-identity-tag-emoji {
          font-size: 15px;
        }

        /* List item variant for prose content (used by extension cards like
           Rescue story, Forever Loved memorial). Body grows vertically so
           the pencil stays top-right. */
        .pce-list-item--prose {
          align-items: flex-start;
        }
        .pce-list-item-prose {
          /* 88ch at 900 and above. */
          max-width: 68ch;
          font-size: 16px;
          line-height: 1.55;
          color: var(--color-navy-dark, #172531);
          /* margin removed — let parent container handle spacing */
          white-space: pre-wrap;
          word-break: break-word;
        }

        /* Add-row button (e.g. "+ Add vaccination") - matches Profile .pp-add-pet-btn */
        .pce-add-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 24px;
          height: 42px;
          background: var(--color-navy-dark, #172531);
          color: #fff;
          border: 2px solid var(--color-navy-dark, #172531);
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          white-space: nowrap;
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .pce-showall-btn {
          display: flex;
          width: fit-content;
          align-items: center;
          gap: 5px;
          margin-bottom: 20px;
          padding: 0 4px;
          background: none;
          border: none;
          color: var(--color-terracotta, #CF5C36);
          font-size: 14px;
          font-weight: 700;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          cursor: pointer;
          transition: color 0.15s;
        }
        .pce-showall-btn:hover { color: var(--color-terracotta-dark, #A8471D); }
        .pce-showall-chev {
          transition: transform 0.3s cubic-bezier(0.33,1,0.68,1);
        }
        .pce-showall-chev.is-open { transform: rotate(180deg); }
        .pce-list--more { margin-top: 0; }
        .pce-add-btn:hover {
          background: #fff;
          color: var(--color-navy-dark, #172531);
          border-color: var(--color-navy-dark, #172531);
        }

        /* Subsection - used to group e.g. "Vaccinations" inside Medical */
        .pce-subsection { margin-top: 28px; }
        .pce-subsection:first-child { margin-top: 0; }
        .pce-sub-title {
          font-size: 18px;
          font-weight: 800;
          color: var(--color-navy-dark, #172531);
          margin: 0 0 4px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          letter-spacing: -0.01em;
        }
        /* Field-level heading for sub-fields inside extension cards
           (Champion/Adventurer/Foodie). Smaller + lighter than .pce-sub-title
           so the section heading (h3) above remains visually dominant.
           Two-tier hierarchy: section heading → field heading → input.
           The 20px top margin gives breathing room between the parent
           section heading (or the previous field's content/button) and
           this field. The 4px bottom keeps the heading tight to its
           subtitle/input below. */
        .pce-field-heading {
          font-size: 14px;
          font-weight: 700;
          color: var(--color-navy-dark, #172531);
          margin: 20px 0 4px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          text-transform: none;
          letter-spacing: 0;
        }
        .pce-sub-sub {
          /* 100ch at 1024. */
          max-width: 68ch;
          font-size: 16px;
          font-weight: 500;
          color: #717A86;
          margin: 0 0 14px;
          line-height: 1.55;
        }

        /* Modal */
        /* Inline expanding form (vaccinations + medications add).
           Sits below the "+ Add" button when active. Replaces modal for add-mode. */
        .pce-inline-form {
          margin-top: 3px;
          position: relative;
          /* Match the Hero editor's active-edit look: terracotta border, soft
             terracotta glow ring, and a warm off-white tint so it's unmistakable
             which section you're editing. */
          border: 1px solid var(--color-terracotta, #CF5C36);
          box-shadow: 0 0 0 3px rgba(207,92,54,0.12);
          background: #FFFCFA;
          border-radius: 18px;
          /* Top padding reserves a band for the close button, so it sits above
             the fields instead of over them and the fields run full width. */
          padding: 52px 20px 20px;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        /* Inside the glowing form the entry card should blend (no double-card):
           drop its own border/shadow/bg so the terracotta form is the one card. */
        .pce-inline-form > .pce-entry-card {
          background: transparent;
          border: none;
          box-shadow: none;
          padding: 0;
          margin-bottom: 0;
        }
        .pce-form-close {
          position: absolute;
          top: 16px;
          right: 16px;
          border: none;
          background: transparent;
          color: var(--color-muted, #717A86);
          cursor: pointer;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          transition: background 0.15s, color 0.15s;
          z-index: 2;
        }
        /* Give the form content room so it never sits under the close X. */
        /* The close button used to be cleared horizontally, which shortened
           every field in the form by 34px — not just the row beside it. The
           form now reserves space above instead (see .pce-inline-form's
           padding-top), so children run the full width. */
        .pce-form-close:hover {
          background: rgba(23,37,49,0.06);
          color: var(--color-navy-dark, #172531);
        }
        .pce-collapse {
          display: grid; grid-template-rows: 0fr; opacity: 0; visibility: hidden;
          transition: grid-template-rows 0.3s cubic-bezier(0.33,1,0.68,1), opacity 0.22s ease, visibility 0s linear 0.3s;
        }
        .pce-collapse.is-open {
          grid-template-rows: 1fr; opacity: 1; visibility: visible;
          transition: grid-template-rows 0.3s cubic-bezier(0.33,1,0.68,1), opacity 0.26s ease 0.04s, visibility 0s linear 0s;
        }
        .pce-collapse-inner {
          overflow: hidden; 
          min-height: 0; 
          transform: translateY(-5px);
          transition: transform 0.3s 
          cubic-bezier(0.33,1,0.68,1);
          padding: 0 3px;
          margin-top: 3px
        }
        .pce-collapse.is-open .pce-collapse-inner { transform: translateY(0); }
        @media (prefers-reduced-motion: reduce) { .pce-collapse, .pce-collapse-inner { transition: none; } }
        .pce-inline-form-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 20px;
          flex-wrap: wrap;
        }
        @media (max-width: 640px) {
          .pce-inline-form-actions {
            flex-direction: column-reverse;
            border-top: 1px solid rgba(23,37,49,0.06);
            margin-top: 16px;
            padding-top: 16px;
          }
          .pce-inline-form-actions .pce-btn-primary,
          .pce-inline-form-actions .pce-btn-secondary {
            width: 100%;
          }
        }

        /* Multi-entry cards in add-mode modals (vaccinations, medications).
           Each entry is visually grouped as a card so the user sees clear
           boundaries between records being added at once. */
        .pce-entry-card {
          padding: 20px 20px 20px;
          background: #fff;
          border: 1px solid rgba(23,37,49,0.10);
          border-radius: 12px;
          margin-bottom: 12px;
          box-shadow: 0 1px 3px rgba(23,37,49,0.04);
          /* Single source of truth for vertical spacing inside entry cards.
             Same reasoning as .pce-modal-body — gap ensures every direct child
             gets a uniform 14px gap regardless of class. */
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .pce-entry-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          /* No margin-bottom — the parent's gap handles spacing to next child */
        }
        .pce-entry-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-terracotta, #CF5C36);
        }
        /* "Linked" badge shown in form headers when a directory vet is picked.
           Communicates that auto-filled data is sourced from the vet directory. */
        .pce-entry-linked-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 9px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #2E7D5F;
          background: rgba(46,125,95,0.10);
          border-radius: 999px;
          line-height: 1.4;
        }

        /* Split layout for inline form action rows that have a destructive
           action on one side (Clear / Delete) and the cancel+save buttons on
           the other. Used by Primary vet, Emergency vet, Insurance inline forms. */
        .pce-inline-form-actions--split {
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .pce-inline-form-actions-right {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        @media (max-width: 640px) {
          .pce-inline-form-actions--split {
            flex-direction: column-reverse;
            align-items: stretch;
            border-top: 1px solid rgba(23,37,49,0.06);
            margin-top: 16px;
            padding-top: 16px;
          }
          .pce-inline-form-actions-right {
            width: 100%;
          }
          .pce-inline-form-actions-right .pce-btn-secondary,
          .pce-inline-form-actions-right .pce-btn-primary {
            flex: 1 1 0;
          }
          .pce-inline-form-actions--split .pce-btn-danger-text {
            width: 100%;
            text-align: center;
          }
        }

        /* "+ Add another vaccination/medication" button — dashed outline,
           matches Vet Slug's .isp-add-entry treatment */
        .pce-add-entry {
          width: 100%;
          padding: 13px;
          background: transparent;
          color: var(--color-terracotta, #CF5C36);
          border: 1.5px dashed var(--color-terracotta, #CF5C36);
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 4px;
          margin-bottom: 8px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: background 0.15s;
        }
        .pce-add-entry:hover { background: rgba(207,92,54,0.06); }

        /* Show more / less button — appears below long lists.
           Same dashed-outline aesthetic as pce-add-entry but with chevron icon. */
        .pce-show-more-btn {
          width: 100%;
          padding: 12px;
          background: transparent;
          color: var(--color-navy-dark, #172531);
          border: 1.5px solid rgba(23,37,49,0.16);
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 8px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: background 0.15s, border-color 0.15s;
        }
        .pce-show-more-btn:hover {
          background: rgba(23,37,49,0.03);
          border-color: rgba(23,37,49,0.26);
        }

        /* Vet & Emergency: phone/email links inside meta values */
        .pce-link {
          color: var(--color-terracotta, #CF5C36);
          text-decoration: none;
          font-weight: 600;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-link:hover { text-decoration: underline; }

        /* Pet Poison Helpline footer card — static safety info, not editable */
        .pce-helpline-card {
          display: flex;
          gap: 14px;
          padding: 18px 20px;
          background: rgba(207,92,54,0.06);
          border: 1.5px solid rgba(207,92,54,0.20);
          border-radius: 14px;
          margin-top: 8px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-helpline-icon {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(207,92,54,0.14);
          color: var(--color-terracotta, #CF5C36);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pce-helpline-body { flex: 1; min-width: 0; }
        .pce-helpline-title {
          margin: 0 0 4px;
          font-size: 18px;
          font-weight: 800;
          color: var(--color-navy-dark, #172531);
        }
        .pce-helpline-sub {
          margin: 0 0 8px;
          font-size: 16px;
          font-weight: 500;
          color: #717A86;
          line-height: 1.4;
        }
        .pce-helpline-phone {
          display: inline-block;
          font-size: 17px;
          font-weight: 700;
          color: var(--color-terracotta, #CF5C36);
          text-decoration: none;
          letter-spacing: 0.01em;
        }
        .pce-helpline-phone:hover { text-decoration: underline; }

        /* Weight unit toggle — used in Identity section weight field.  */
        .pce-weight-row {
          display: flex;
          gap: 8px;
          align-items: stretch;
        }
        .pce-weight-input {
          flex: 1 1 auto;
          min-width: 0;
        }
        .pce-weight-unit-toggle {
          display: inline-flex;
          border: 1.5px solid rgba(23,37,49,0.16);
          border-radius: 10px;
          overflow: hidden;
          flex-shrink: 0;
        }
        .pce-weight-unit-btn {
          padding: 0 14px;
          background: #fff;
          border: none;
          color: var(--color-muted, #717A86);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: background 0.15s, color 0.15s;
        }
        .pce-weight-unit-btn.active {
          background: var(--color-navy-dark, #172531);
          color: #fff;
        }
        .pce-weight-unit-btn:not(.active):hover {
          background: rgba(23,37,49,0.04);
          color: var(--color-navy-dark, #172531);
        }

        /* Weight history chart container + range filters + trend pill */
        .pce-weight-range-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .pce-weight-range-tabs {
          display: inline-flex;
          border: 1px solid rgba(23,37,49,0.10);
          border-radius: 10px;
          overflow: hidden;
          background: #fff;
          height: 40px;
        }
        .pce-weight-range-btn {
          padding: 6px 14px;
          background: transparent;
          border: none;
          color: var(--color-muted, #717A86);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: background 0.15s, color 0.15s;
        }
        .pce-weight-range-btn.active {
          background: var(--color-navy-dark, #172531);
          color: #fff;
        }
        .pce-weight-range-btn:not(.active):hover {
          background: rgba(23,37,49,0.04);
          color: var(--color-navy-dark, #172531);
        }
        /* Vertical divider between adjacent tabs — hidden when either side is active.
           Result: dividers only appear between two inactive tabs. */
        .pce-weight-range-btn + .pce-weight-range-btn {
          border-left: 1px solid rgba(23,37,49,0.10);
        }
        .pce-weight-range-btn.active + .pce-weight-range-btn,
        .pce-weight-range-btn.active {
          border-left-color: transparent;
        }
        .pce-weight-trend {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-weight-trend.up {
          background: rgba(217,162,27,0.14);
          color: #8C6A11;
        }
        .pce-weight-trend.down {
          background: rgba(26,102,65,0.10);
          color: #1A6641;
        }
        .pce-weight-trend-summary {
          margin: 0 0 12px;
          font-size: 16px;
          font-weight: 600;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        /* Trend summary above chart: neutral color matching per-card weight change.
           Pet weight goals vary, so we don't pre-judge gain/loss as good or bad. */
        .pce-weight-trend-summary.up,
        .pce-weight-trend-summary.down,
        .pce-weight-trend-summary.stable { color: var(--color-navy-dark, #172531); }
        .pce-weight-trend.stable {
          background: rgba(23,37,49,0.06);
          color: var(--color-muted, #717A86);
        }
        .pce-weight-history-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .pce-weight-history-right .pce-weight-unit-toggle {
          height: 40px;
        }
        .pce-weight-history-right .pce-weight-unit-btn {
          padding: 0 12px;
          font-size: 14px;
        }
        .pce-weight-chart {
          background: #fff;
          border: 1px solid #EDE8E0;
          border-radius: 12px;
          padding: 14px 8px 8px;
          margin-bottom: 14px;
          box-shadow: 0 2px 12px rgba(23,37,49,0.05);
        }

        /* WEIGHT_CHART_TOOLTIP — Recharts tooltip styling, scoped to the
           weight chart's tooltip wrapper so it doesn't bleed to other charts.
           Targets Recharts' built-in classes (.recharts-tooltip-label is the
           date heading; .recharts-tooltip-item-value is the "81.4 lbs" value).
           font-weight: 600 (semi-bold) makes the data pop in quick-scan UI
           while staying readable at 13px. */
        .pce-weight-tooltip .recharts-tooltip-label {
          font-weight: 600;
          color: var(--color-navy-dark, #172531);
        }
        .pce-weight-tooltip .recharts-tooltip-item-value {
          font-weight: 600;
          color: var(--color-terracotta, #CF5C36);
        }
        .pce-weight-tooltip .recharts-tooltip-item-name {
          font-weight: 600;
          color: var(--color-navy-dark, #172531);
        }

        /* PAUSED state — feeding/walks that are temporarily inactive.  */
        .pce-list-item.is-paused {
          opacity: 0.65;
          background: rgba(23,37,49,0.02);
        }
        .pce-list-item-status.paused {
          background: rgba(23,37,49,0.08);
          color: var(--color-muted, #717A86);
        }

        /* Day-of-week picker — 7 toggle buttons for custom frequency */
        .pce-days-picker {
          display: flex;
          gap: 6px;
          margin-top: 0;
          flex-wrap: nowrap;
          width: 100%;
        }
        .pce-day-btn {
          flex: 1 1 0;
          min-width: 0;
          height: 42px;
          border-radius: 8px;
          border: 1.5px solid rgba(23,37,49,0.16);
          background: #fff;
          color: var(--color-muted, #717A86);
          font-size: 14px;
          font-weight: 700;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
          padding: 0;
        }
        .pce-day-btn:hover {
          background: rgba(23,37,49,0.04);
          color: var(--color-navy-dark, #172531);
        }
        .pce-day-btn.active {
          background: var(--color-terracotta, #CF5C36);
          border-color: var(--color-terracotta, #CF5C36);
          color: #fff;
        }
        .pce-day-btn.active:hover {
          background: #B84B26;
          border-color: #B84B26;
        }

        /* Checkbox row — used in modals for boolean toggles (e.g. paused). */
        .pce-checkbox-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: rgba(23,37,49,0.03);
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          line-height: 1.2;
          font-weight: 600;
          color: var(--color-navy-dark, #172531);
          margin-top: 4px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-checkbox-row input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: var(--color-terracotta, #CF5C36);
          cursor: pointer;
          flex-shrink: 0;
          /* Match line-height so checkbox aligns with first line of label, not centered on wrapped text. */
          margin-top: 2px;
        }
        .pce-checkbox-row > span {
          flex: 1;
          min-width: 0;
        }
        @media (max-width: 640px) {
          .pce-weight-row {
            flex-direction: column;
          }
          .pce-weight-unit-toggle {
            display: flex;
            width: 100%;
            height: 46px;
            margin-top: 5px;

          }
          .pce-weight-unit-btn {
            flex: 1 1 0;
            padding: 0 14px;
            font-size: 14px;
          }
        }

        /* Vet autocomplete dropdown */
        .pce-vet-autocomplete {
          position: relative;
          width: 100%;
        }
        .pce-vet-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: #fff;
          border: 1.5px solid rgba(23,37,49,0.10);
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(23,37,49,0.12);
          z-index: 10;
          max-height: 240px;
          overflow-y: auto;
        }
        .pce-vet-option {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          width: 100%;
          padding: 10px 14px;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(23,37,49,0.06);
          cursor: pointer;
          text-align: left;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: background 0.12s;
        }
        .pce-vet-option:last-child { border-bottom: none; }
        .pce-vet-option:hover { background: rgba(23,37,49,0.04); }
        .pce-vet-option-name {
          font-size: 14px;
          font-weight: 700;
          color: var(--color-navy-dark, #172531);
          line-height: 1.3;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .pce-vet-option-badge {
          display: inline-block;
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #2E7D5F;
          background: rgba(46,125,95,0.10);
          border-radius: 999px;
          line-height: 1.4;
        }
        .pce-vet-option-meta {
          font-size: 14px;
          font-weight: 500;
          color: var(--color-muted, #717A86);
          margin-top: 2px;
        }
        .pce-vet-dropdown-empty { padding: 12px 14px; }
        .pce-vet-empty-msg {
          margin: 0;
          font-size: 14px;
          color: var(--color-muted, #717A86);
          line-height: 1.4;
        }

        .pce-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(23,37,49,0.55);
          -webkit-backdrop-filter: blur(4px);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: pce-overlay-in 0.18s ease-out;
        }
        @keyframes pce-overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .pce-modal {
          background: #fff;
          border-radius: 18px;
          width: 100%;
          max-width: 560px;
          max-height: 86vh;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          box-shadow: 0 30px 60px rgba(0,0,0,0.40);
          animation: pce-modal-in 0.22s ease-out;
          box-sizing: border-box;
        }
        @keyframes pce-modal-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pce-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 22px 24px 14px;
        }
        .pce-modal-title {
          font-size: clamp(19px, 2.6vw, 22px);
          font-weight: 800;
          color: var(--color-navy-dark, #172531);
          margin: 0;
          letter-spacing: -0.01em;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pce-modal-close {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: transparent;
          color: var(--color-muted, #717A86);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, color 0.15s;
        }
        .pce-modal-close:hover { background: rgba(23,37,49,0.06); color: var(--color-navy-dark, #172531); }
        .pce-modal-body {
          padding: 0 24px 12px;
          display: flex;
          flex-direction: column;
          /* Single source of truth for vertical spacing between every direct
             child block (pce-field, pce-field-grid, pce-checkbox-row, etc.).
             Replaces the fragile adjacency-selector approach which required
             every possible pairing to be listed and failed when new blocks
             were added. With gap, ALL children space evenly automatically. */
          gap: 14px;
        }
        /* Error banner shown when save/delete fails. Works inside both modals
           (where modal-body has horizontal padding) and inline forms. */
        .pce-modal-error {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0 0 12px;
          padding: 12px 14px;
          background: rgba(220,38,38,0.06);
          border: 1.5px solid rgba(220,38,38,0.20);
          border-radius: 10px;
          color: #B91C1C;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.4;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        /* Inside modals, the body has 24px horizontal padding; the error sits
           outside body but before footer — give it matching horizontal margin. */
        .pce-modal .pce-modal-error {
          margin-left: 24px;
          margin-right: 24px;
        }
        .pce-modal-error svg {
          flex-shrink: 0;
          color: #DC2626;
        }
        .pce-modal-footer {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          padding: 14px 24px 22px;
          margin-top: 16px;
          flex-wrap: wrap;
          position: relative;
        }
        /* divider inset to the modal content width (matches inline form dividers,
           does not span the full modal edge-to-edge) */
        .pce-modal-footer::before {
          content: "";
          position: absolute;
          top: 0;
          left: 24px;
          right: 24px;
          height: 1px;
          background: rgba(23,37,49,0.06);
        }
        .pce-modal-footer .pce-btn-danger-text {
          margin-right: auto;
        }
        .pce-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 42px;
          min-width: 90px;
          padding: 0 24px;
          // line-height: 1;
          background: var(--color-terracotta, #CF5C36);
          color: #fff;
          border: 2px solid var(--color-terracotta, #CF5C36);
          border-radius: 12px;
          font-weight: 700;
          font-size: 15px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          white-space: nowrap;
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .pce-btn-primary:hover { background: #fff; color: var(--color-terracotta, #CF5C36); border-color: var(--color-terracotta, #CF5C36); }
        .pce-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; background: var(--color-terracotta, #CF5C36); color: #fff; border-color: var(--color-terracotta, #CF5C36); }
        .pce-btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 42px;
          min-width: 90px;
          padding: 0 24px;
          // line-height: 1;
          background: #fff;
          color: var(--color-navy-dark, #172531);
          border: 2px solid rgba(23,37,49,0.10);
          border-radius: 12px;
          font-weight: 600;
          font-size: 15px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          white-space: nowrap;
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .pce-btn-secondary:hover {
          background: var(--color-navy-dark, #172531);
          color: #fff;
          border-color: var(--color-navy-dark, #172531);
        }
        /* Delete button — red outline matching Profile's .btn-danger-sm.
           White bg + red border + red text. Inverts on hover. */
        .pce-btn-danger-text {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 42px;
          padding: 0 20px;
          font-size: 15px;
          font-weight: 700;
          color: #C94040;
          background: #fff;
          border: 2px solid #F4C5C5;
          border-radius: 12px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .pce-btn-danger-text:hover {
          background: #C94040;
          color: #fff;
          border-color: #C94040;
        }
        .pce-btn-danger-text:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .pce-body { padding: 20px 0 80px; }
          .pce-section { padding: 22px 18px; }
          .pce-pet-header { padding: 16px; gap: 14px; }
          .pce-pet-photo-wrap { width: 72px; height: 72px; }
          /* Modal footer: stack buttons vertically. Order: Save top, Cancel middle, Delete bottom.
             JSX order is Delete, Cancel, Save — flex order reverses for stacking. */
          .pce-modal-footer {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .pce-modal-footer .pce-btn-primary { order: 1; width: 100%; }
          .pce-modal-footer .pce-btn-secondary { order: 2; width: 100%; }
          .pce-modal-footer .pce-btn-danger-text { order: 3; width: 100%; margin-right: 0; }

          /* MOBILE FULL-WIDTH BUTTONS — all action buttons span full width.
             Exclusions: day-of-week (flex:1 already), pencil/X icons (small),
             unit sub-toggles inside other components stay sized.
             This block enforces full-width for everything else. */
          .pce-add-btn {
            width: 100%;
            justify-content: center;
          }
          .pce-weight-range-tabs {
            display: flex;
            width: 100%;
          }
          .pce-weight-range-btn {
            flex: 1 1 0;
            padding: 10px 8px;
            text-align: center;
          }
          .pce-weight-history-right {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .pce-weight-history-right .pce-weight-unit-toggle {
            display: flex;
            width: 100%;
            height: 40px;
          }
          .pce-weight-history-right .pce-weight-unit-btn {
            flex: 1 1 0;
            padding: 0 14px;
            font-size: 14px;
          }
          .pce-weight-range-row {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .pce-weight-trend {
            align-self: flex-start;
          }
        }
      `}</style>

      <div className="pce-body">
        {/* Rendered at the top of the page tree (like the Hero editor) so its
            position:fixed centering is always relative to the viewport, never a
            transformed/positioned ancestor deeper in the layout. */}
        {unsavedModal}
        <div className="pp-container-text">
          {/* Breadcrumb (left) + save indicator (right) share one row, so the
              spacing below the breadcrumb matches the other pages exactly. */}
          <div className="pce-topbar">
            <Breadcrumb
              items={[
                { label: "Pet Cards", href: "/pet-card" },
                { label: pet.name || "Pet" },
                { label: "Care Card", href: `/pet-card/${pet.slug}/care` },
                { label: "Edit" },
              ]}
            />
            <SaveStatus status={saveStatus} />
          </div>

          {/* Pet header — compact identity strip */}
          <div className="pce-pet-header">
            <div className="pce-pet-photo-wrap">
              {pet.photo_url ? (
                <img
                  src={pet.photo_url}
                  alt={pet.name}
                  className="pce-pet-photo"
                />
              ) : (
                <div
                  className="pce-pet-photo-placeholder"
                  style={{ background: tint.bg, color: tint.icon }}
                >
                  <Icon size={36} strokeWidth={1.75} />
                </div>
              )}
              <button
                type="button"
                className="pce-photo-change-btn"
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploading || photoConverting}
                aria-label={pet.photo_url ? "Change photo" : "Add photo"}
              >
                {photoUploading || photoConverting ? (
                  <Loader2 size={16} strokeWidth={2.4} className="pce-spin" />
                ) : (
                  <Camera size={16} strokeWidth={2.4} />
                )}
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept={ACCEPTED_PHOTO_EXTENSIONS_INPUT}
                onChange={handlePhotoUpload}
                className="pce-photo-input"
              />
            </div>
            <div className="pce-pet-header-info">
              <p className="pce-pet-eyebrow">Pet Card</p>
              <h1 className="pce-pet-name">{pet.name || "Unnamed pet"}</h1>
              {ageStr ? <p className="pce-pet-quick-meta">{ageStr}</p> : null}
              {photoError ? (
                <p className="pce-photo-error">{photoError}</p>
              ) : null}
            </div>
          </div>

          {/* Expand / collapse all sections */}
          <div className="pce-expand-all-row">
            <button
              type="button"
              className="pce-expand-all-btn"
              onClick={toggleAllSections}
            >
              {allOpen ? "Collapse all" : "Expand all"}
            </button>
          </div>

          {/* IDENTITY SECTION */}
          <SectionShell
            id="identity"
            eyebrow="Identity"
            title="Tell us about your pet"
            sub="The basics. Used everywhere your pet's card is shown."
            open={openSections.has("identity")}
            onToggle={toggleSection}
          >
            <IdentitySection
              pet={pet}
              onUpdate={updateField}
              onSlugChange={handleSlugChange}
              openFormId={openFormId}
              setOpenFormId={setOpenFormId}
              confirmUnsaved={confirmUnsaved}
            />
          </SectionShell>

          {/* MEDICAL SECTION — allergies, conditions, vaccinations, medications */}
          <SectionShell
            id="medical"
            eyebrow="Medical"
            title="What keeps them healthy"
            sub="Allergies, conditions, medications, and vaccinations — the medical context a vet or sitter needs at a glance."
            open={openSections.has("medical")}
            onToggle={toggleSection}
          >
            <MedicalSection
              pet={pet}
              onUpdate={updateField}
              setSaveStatus={setSaveStatus}
              openFormId={openFormId}
              setOpenFormId={setOpenFormId}
              confirmUnsaved={confirmUnsaved}
            />
          </SectionShell>
          {/* CARE SECTION — feeding, walks, weight history, quirks & warnings */}
          <SectionShell
            id="care"
            eyebrow="Care"
            title="Daily routine and tracking"
            sub="Feeding, walks, weight history, and quirks — what a sitter or family member needs to keep things normal."
            open={openSections.has("care")}
            onToggle={toggleSection}
          >
            <CareSection
              pet={pet}
              onUpdate={updateField}
              setSaveStatus={setSaveStatus}
              openFormId={openFormId}
              setOpenFormId={setOpenFormId}
              confirmUnsaved={confirmUnsaved}
            />
          </SectionShell>
          {/* VET & EMERGENCY SECTION — vets, contacts, visits, insurance, helpline */}
          <SectionShell
            id="vetemergency"
            eyebrow="Vet & Emergency"
            title="Who to call, where to go"
            sub="Vet contacts, emergency people, visit history, and insurance — the safety net for when something goes wrong."
            open={openSections.has("vetemergency")}
            onToggle={toggleSection}
          >
            <VetEmergencySection
              pet={pet}
              onUpdate={updateField}
              setSaveStatus={setSaveStatus}
              openFormId={openFormId}
              setOpenFormId={setOpenFormId}
              confirmUnsaved={confirmUnsaved}
            />
          </SectionShell>
        </div>
      </div>
      <SaveIndicator status={saveStatus} />
    </>
  );
}

// =============================================================
// SAVE INDICATOR — subtle status pill in top-right
// =============================================================

function SaveStatus({ status }) {
  if (status === "saving") {
    return (
      <span className="pce-save-status saving" role="status">
        <Loader2 size={14} strokeWidth={2.2} className="pce-spin" />
        Saving…
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="pce-save-status error" role="alert">
        Couldn&apos;t save
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="pce-save-status saved" role="status">
        <Check size={14} strokeWidth={2.4} />
        All changes saved
      </span>
    );
  }
  // idle — render nothing. The indicator only appears when a save is in
  // progress or just completed. After "saved" transitions back to idle via
  // the 2-second setTimeout in the parent, this returns null and the pill
  // disappears — distinct from a persistent "All changes saved" that was
  // showing on page load even when nothing had been saved yet.
  return null;
}

function SaveIndicator({ status }) {
  if (status === "idle") return null;
  if (status === "saving") {
    return (
      <div className="pce-save-toast saving" role="status">
        <Loader2 size={14} strokeWidth={2.2} className="pce-spin" />
        Saving…
      </div>
    );
  }
  if (status === "saved") {
    return (
      <div className="pce-save-toast saved" role="status">
        <Check size={14} strokeWidth={2.4} />
        Saved
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="pce-save-toast error" role="alert">
        Couldn&apos;t save — please retry
      </div>
    );
  }
  return null;
}

// =============================================================
// IDENTITY SECTION — name, species, breed, sex, altered, birthday,
// color/markings, microchip
// =============================================================

function PetUrlField({ pet, onSlugChange }) {
  const [draftSlug, setDraftSlug] = useState(pet.slug || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync draft when pet.slug changes externally (e.g. after successful save+redirect)
  useEffect(() => {
    setDraftSlug(pet.slug || "");
  }, [pet.slug]);

  const normalized = normalizeSlug(draftSlug);
  const hasChanged = normalized !== (pet.slug || "");
  const canSave = hasChanged && normalized.length > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setError("");
    setSaving(true);
    const result = await onSlugChange(draftSlug);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="pce-field">
      <label htmlFor="pce-slug" className="pce-label">
        Pet card URL
      </label>
      <div className="pce-slug-row">
        <input
          id="pce-slug"
          type="text"
          className="pce-input"
          value={draftSlug}
          onChange={(e) => {
            setDraftSlug(e.target.value);
            setError("");
            setSaved(false);
          }}
          placeholder="cooper"
          maxLength={40}
          autoComplete="off"
          style={{ borderColor: error ? "#C94040" : undefined }}
        />
        <button
          type="button"
          className="pce-slug-save-btn"
          onClick={handleSave}
          disabled={!canSave}
        >
          {saving ? (
            <Loader2 size={14} strokeWidth={2.4} className="pce-spin" />
          ) : (
            "Update URL"
          )}
        </button>
      </div>
      {error ? (
        <p className="pce-field-hint pce-field-warn">{error}</p>
      ) : saved ? (
        <p className="pce-field-hint pce-field-saved">URL updated.</p>
      ) : hasChanged ? (
        <p className="pce-field-hint pce-field-warn-soft">
          New URL: petparrk.com/pet-card/{normalized || "your-pet"} · Updating
          will break any links you've shared.
        </p>
      ) : (
        <p className="pce-field-hint">
          Your pet card lives at petparrk.com/pet-card/
          {normalized || "your-pet"}
        </p>
      )}
    </div>
  );
}

// =============================================================
// IDENTITY SECTION — view/edit pattern (matches Vet & Emergency sections)
// =============================================================
// Photo is always-editable in the editor header (handled outside this section).
// Slug now lives inside the edit form (was previously separate inline field).

function IdentitySection({
  pet,
  onUpdate,
  onSlugChange,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
}) {
  // Identity uses the site-wide openFormId coordinator. Opening this section's
  // form auto-closes any other open form across the page.
  const FORM_ID = "identity";
  const editing = openFormId === FORM_ID || !pet.name || pet.name.trim() === "";

  return (
    <>
      <Collapse open={editing}>
        <InlineIdentityForm
          pet={pet}
          onUpdate={onUpdate}
          onSlugChange={onSlugChange}
          confirmUnsaved={confirmUnsaved}
          onCancel={() => {
            // Cancel discards draft state and closes the form. Only allow
            // closing if the pet has a name on record (so brand-new pets are
            // forced to provide a name before they can dismiss the form).
            if (pet.name && pet.name.trim().length > 0) {
              setOpenFormId(null);
            }
          }}
          onSave={async (fields) => {
            // Save commits all draft fields, then closes the form — but only if
            // the save actually succeeded, so a failed save keeps the form open
            // with the user's edits intact.
            const ok = await onUpdate(fields);
            if (ok) setOpenFormId(null);
            return ok;
          }}
        />
      </Collapse>
      {!editing && (
        <IdentityDisplay pet={pet} onEdit={() => setOpenFormId(FORM_ID)} />
      )}
    </>
  );
}

// View-mode card showing all identity fields as a flat list.
// Layout:
//   - Mobile (<=640px): vertical stack, one row per field
//   - Desktop (>640px): 2-column grid using existing meta-grid pattern, label
//     min-width tuned to 90px via .pce-list-item-meta--identity modifier class.
// Birthday is the only special case: renders date + "(age old)" on two lines
// within its value column so the age info stays adjacent without overflowing
// into the next column.
function IdentityDisplay({ pet, onEdit }) {
  // Build a flat ordered list of fields to render. Each entry knows its label
  // and value. Skipped if empty. Birthday gets a special `subValue` field for
  // the parenthetical age line below the date.
  const fields = [];
  if (pet.species)
    fields.push({ key: "species", label: "Species", value: pet.species });
  if (pet.breed)
    fields.push({ key: "breed", label: "Breed", value: pet.breed });
  if (pet.sex) fields.push({ key: "sex", label: "Sex", value: pet.sex });
  if (pet.altered_status) {
    // Conditional label based on sex; value derived from altered_status
    // ("Spayed"/"Neutered" → Yes, "Intact" → No, "Unknown" passes through).
    const sexLower = (pet.sex || "").toLowerCase();
    const isAltered =
      pet.altered_status === "Spayed" || pet.altered_status === "Neutered";
    fields.push({
      key: "altered",
      label:
        sexLower === "male"
          ? "Neutered"
          : sexLower === "female"
            ? "Spayed"
            : "Altered",
      value:
        pet.altered_status === "Unknown" ? "Unknown" : isAltered ? "Yes" : "No",
    });
  }
  if (pet.birthday) {
    // Age is shown in the pet header; only the date lives here.
    fields.push({
      key: "birthday",
      label: "Birthday",
      value: formatShortDate(pet.birthday),
    });
  }
  if (pet.gotcha_date) {
    fields.push({
      key: "adoption",
      label: "Adoption",
      value: formatShortDate(pet.gotcha_date),
    });
  }
  if (pet.weight_value != null && pet.weight_value !== "") {
    const unit = pet.weight_unit || "lbs";
    const displayValue =
      unit === "lbs"
        ? roundForDisplay(Number(pet.weight_value))
        : roundForDisplay(convertWeightTo(Number(pet.weight_value), unit));
    fields.push({
      key: "weight",
      label: "Weight",
      value: `${displayValue} ${unit}`,
    });
  }
  if (pet.color_markings) {
    fields.push({ key: "color", label: "Color", value: pet.color_markings });
  }
  if (pet.microchip_number) {
    fields.push({
      key: "microchip",
      label: "Microchip",
      value: pet.microchip_number,
    });
  }

  const slugDisplay = pet.slug ? `/pet-card/${pet.slug}/care-edit` : null;

  return (
    <div className="pce-list">
      <div className="pce-list-item">
        <div className="pce-list-item-body">
          <div className="pce-list-item-title-row">
            <span className="pce-list-item-icon-inline">
              <PawPrint size={18} strokeWidth={2} />
            </span>
            <p className="pce-list-item-title">{pet.name || "Unnamed pet"}</p>
          </div>

          {slugDisplay ? (
            <p className="pce-identity-slug">{slugDisplay}</p>
          ) : null}

          {fields.length > 0 ? (
            <>
              <div className="pce-list-item-sep" />
              {/* Identity meta uses --col-count: 2 to force 2-column on desktop.
                  Each row stays on one line because .pce-list-item-meta--identity
                  sets a 90px label min-width that fits all our identity labels. */}
              <div
                className="pce-list-item-meta pce-list-item-meta--identity"
                style={{ "--col-count": 2 }}
              >
                {fields.map((f) => (
                  <div key={f.key} className="pce-list-item-meta-row">
                    <span className="pce-list-item-meta-label">{f.label}:</span>
                    {f.subValue ? (
                      <span className="pce-list-item-meta-value pce-identity-value-stack">
                        <span>{f.value}</span>
                        <span className="pce-identity-sub-line">
                          {f.subValue}
                        </span>
                      </span>
                    ) : (
                      <span className="pce-list-item-meta-value">
                        {f.value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
        <div className="pce-list-item-actions">
          <button
            type="button"
            className="pce-icon-btn"
            onClick={onEdit}
            aria-label="Edit identity"
          >
            <Pencil size={EDIT_ICON_SIZE} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit-mode form. Includes ALL identity fields including slug.
// Uses the same `onUpdate` autosave pattern internally (so debounced save
// continues to work), but presents like a coherent inline form with Done.
function InlineIdentityForm({
  pet,
  onUpdate,
  onSlugChange,
  onCancel,
  onSave,
  confirmUnsaved,
}) {
  // Buffer all field changes in local draft state. Changes commit to the parent
  // (and from there to the DB) when the user clicks Save, OR silently on
  // unmount if the form is closed by another opening (autosave-on-close).
  // Click Cancel to discard drafts without saving.
  //
  // The slug field is the ONE exception — PetUrlField has its own internal
  // save logic (with uniqueness validation against the DB) and commits via
  // onSlugChange immediately. Slug edits are NOT bufferable because we need to
  // validate uniqueness server-side before accepting them.
  const [draftName, setDraftName] = useState(pet.name || "");
  const [draftSpecies, setDraftSpecies] = useState(pet.species || "");
  const [draftBreed, setDraftBreed] = useState(pet.breed || "");
  const [draftSex, setDraftSex] = useState(pet.sex || "");
  const [draftAltered, setDraftAltered] = useState(pet.altered_status || "");
  const [draftBirthday, setDraftBirthday] = useState(pet.birthday || "");
  const [draftGotcha, setDraftGotcha] = useState(pet.gotcha_date || "");
  const [draftWeight, setDraftWeight] = useState(pet.weight_value);
  const [draftWeightUnit, setDraftWeightUnit] = useState(
    pet.weight_unit || "lbs",
  );
  const [draftColor, setDraftColor] = useState(pet.color_markings || "");
  const [draftMicrochip, setDraftMicrochip] = useState(
    pet.microchip_number || "",
  );

  // Species: handle "Other" mode locally. If saved species is not in the list,
  // start in "Other" mode with the existing value populating the text input.
  const isCustomSavedSpecies =
    !!pet.species && !SPECIES_OPTIONS.includes(pet.species);
  const [speciesIsOther, setSpeciesIsOther] = useState(isCustomSavedSpecies);

  const nameMissing = draftName.trim() === "";

  // Track explicit Cancel/Save so autosave-on-unmount knows to skip them.
  const skipAutosaveRef = useRef(false);
  // Refs hold the latest draft + initial snapshot so the unmount cleanup
  // sees fresh values (the cleanup runs once and captures whatever's in the
  // refs at that moment — useState values would be stale inside it).
  const draftRef = useRef(null);
  draftRef.current = {
    draftName,
    draftSpecies,
    draftBreed,
    draftSex,
    draftAltered,
    draftBirthday,
    draftGotcha,
    draftWeight,
    draftWeightUnit,
    draftColor,
    draftMicrochip,
  };
  const initialRef = useRef({
    name: pet.name || "",
    species: pet.species || "",
    breed: pet.breed || "",
    sex: pet.sex || "",
    altered_status: pet.altered_status || "",
    birthday: pet.birthday || "",
    gotcha_date: pet.gotcha_date || "",
    weight_value: pet.weight_value,
    weight_unit: pet.weight_unit || "lbs",
    color_markings: pet.color_markings || "",
    microchip_number: pet.microchip_number || "",
  });

  function buildFields(d) {
    return {
      name: (d.draftName || "").trim(),
      species: (d.draftSpecies || "").trim() || null,
      breed: (d.draftBreed || "").trim() || null,
      sex: d.draftSex || null,
      altered_status: d.draftAltered || null,
      birthday: d.draftBirthday || null,
      gotcha_date: d.draftGotcha || null,
      weight_value:
        d.draftWeight != null && d.draftWeight !== "" ? d.draftWeight : null,
      weight_unit: d.draftWeightUnit,
      color_markings: (d.draftColor || "").trim() || null,
      microchip_number: (d.draftMicrochip || "").trim() || null,
    };
  }

  // Autosave on unmount: when this form closes because another form opens
  // (or navigation happens), silently commit any pending changes. Skipped on
  // explicit Cancel (drafts intentionally discarded) and explicit Save
  // (already committed). Also skipped when the draft name is empty — we
  // shouldn't silently save a blank pet name.
  useEffect(() => {
    return () => {
      if (skipAutosaveRef.current) return;
      const d = draftRef.current;
      if (!d) return;
      const trimmedName = (d.draftName || "").trim();
      if (trimmedName === "") return;
      const init = initialRef.current;
      const dirty =
        trimmedName !== init.name ||
        (d.draftSpecies || "") !== init.species ||
        (d.draftBreed || "") !== init.breed ||
        (d.draftSex || "") !== init.sex ||
        (d.draftAltered || "") !== init.altered_status ||
        (d.draftBirthday || "") !== init.birthday ||
        (d.draftGotcha || "") !== init.gotcha_date ||
        d.draftWeight !== init.weight_value ||
        d.draftWeightUnit !== init.weight_unit ||
        (d.draftColor || "") !== init.color_markings ||
        (d.draftMicrochip || "") !== init.microchip_number;
      // If closed via something other than the form's own buttons, discard the
      // draft silently (we can't show an async modal during unmount; the Cancel
      // button path shows the styled modal instead).
      void dirty;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSave() {
    if (nameMissing) return;
    // Explicit save — skip the unmount autosave so we do not double-fire.
    skipAutosaveRef.current = true;
    onSave(buildFields(draftRef.current));
  }

  function isFormDirty() {
    const d = draftRef.current;
    if (!d) return false;
    const init = initialRef.current;
    return (
      (d.draftName || "").trim() !== init.name ||
      (d.draftSpecies || "") !== init.species ||
      (d.draftBreed || "") !== init.breed ||
      (d.draftSex || "") !== init.sex ||
      (d.draftAltered || "") !== init.altered_status ||
      (d.draftBirthday || "") !== init.birthday ||
      (d.draftGotcha || "") !== init.gotcha_date ||
      d.draftWeight !== init.weight_value ||
      d.draftWeightUnit !== init.weight_unit ||
      (d.draftColor || "") !== init.color_markings ||
      (d.draftMicrochip || "") !== init.microchip_number
    );
  }

  async function handleCancel() {
    skipAutosaveRef.current = true;
    // If there are unsaved edits, show the styled modal (Save / Discard / Keep).
    if (confirmUnsaved && isFormDirty()) {
      const choice = await confirmUnsaved();
      if (choice === "keep") {
        skipAutosaveRef.current = false;
        return; // stay in the form
      }
      if (choice === "save") {
        if (nameMissing) {
          skipAutosaveRef.current = false;
          return;
        }
        const ok = await onSave(buildFields(draftRef.current));
        if (ok === false) {
          skipAutosaveRef.current = false;
          return; // save failed — keep form open
        }
        return;
      }
      // choice === "discard" → fall through to discard + close
    }
    onCancel();
  }

  return (
    <div className="pce-inline-form">
      <button
        type="button"
        className="pce-form-close"
        aria-label="Close"
        onClick={handleCancel}
      >
        <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
      </button>
      <div className="pce-entry-card">
        <div className="pce-field">
          <label htmlFor="pce-name" className="pce-label">
            Name{" "}
            <span className="pce-req-mark" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="pce-name"
            type="text"
            className="pce-input"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="e.g. Cooper"
            maxLength={80}
            required
            aria-required="true"
          />
          {nameMissing ? (
            <p className="pce-field-hint pce-field-warn">Name is required.</p>
          ) : null}
        </div>

        {/* Pet card URL — separate field with format + uniqueness validation.
            Slug saves directly through onSlugChange (NOT buffered) because
            uniqueness must be validated against the DB before accepting it. */}
        <PetUrlField pet={pet} onSlugChange={onSlugChange} />

        <div className="pce-field">
          <label htmlFor="pce-species" className="pce-label">
            Species
          </label>
          <select
            id="pce-species"
            className="pce-select"
            value={speciesIsOther ? "Other" : draftSpecies}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "Other") {
                setSpeciesIsOther(true);
                if (SPECIES_OPTIONS.includes(draftSpecies)) {
                  setDraftSpecies("");
                }
              } else {
                setSpeciesIsOther(false);
                setDraftSpecies(v);
              }
            }}
          >
            <option value="">—</option>
            {SPECIES_OPTIONS.map((sp) => (
              <option key={sp} value={sp}>
                {sp}
              </option>
            ))}
          </select>
          {speciesIsOther ? (
            <div style={{ marginTop: 10 }}>
              <input
                type="text"
                className="pce-input"
                value={draftSpecies}
                onChange={(e) => setDraftSpecies(e.target.value)}
                placeholder="e.g. Tarantula, Hedgehog..."
                maxLength={40}
                aria-label="Other species"
              />
            </div>
          ) : null}
        </div>

        <div className="pce-field">
          <label htmlFor="pce-breed" className="pce-label">
            Breed
          </label>
          <input
            id="pce-breed"
            type="text"
            className="pce-input"
            value={draftBreed}
            onChange={(e) => setDraftBreed(e.target.value)}
            placeholder="e.g. Cavalier"
            maxLength={32}
          />
          <p className="pce-field-hint pce-field-hint--with-count">
            <span>Use the common breed name.</span>
            {draftBreed.length >= 24 ? (
              <span
                className={`pce-char-count${draftBreed.length >= 32 ? " is-max" : ""}`}
              >
                {draftBreed.length}/32
              </span>
            ) : null}
          </p>
        </div>

        <div className="pce-field">
          <label htmlFor="pce-sex" className="pce-label">
            Sex
          </label>
          <select
            id="pce-sex"
            className="pce-select"
            value={draftSex}
            onChange={(e) => setDraftSex(e.target.value)}
          >
            <option value="">—</option>
            {SEX_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="pce-field">
          <label htmlFor="pce-altered" className="pce-label">
            Spay / Neuter
          </label>
          <select
            id="pce-altered"
            className="pce-select"
            value={draftAltered}
            onChange={(e) => setDraftAltered(e.target.value)}
          >
            <option value="">—</option>
            {ALTERED_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <p className="pce-field-hint">Intact = not spayed or neutered.</p>
        </div>

        <div className="pce-field">
          <label htmlFor="pce-birthday" className="pce-label">
            Birthday
          </label>
          <input
            id="pce-birthday"
            type="date"
            className="pce-input"
            value={draftBirthday}
            onChange={(e) => setDraftBirthday(e.target.value)}
          />
          {draftBirthday && formatAge(draftBirthday) ? (
            <p className="pce-field-hint">{formatAge(draftBirthday)} old</p>
          ) : null}
        </div>

        <div className="pce-field">
          <label htmlFor="pce-gotcha" className="pce-label">
            Adoption date
          </label>
          <input
            id="pce-gotcha"
            type="date"
            className="pce-input"
            value={draftGotcha}
            onChange={(e) => setDraftGotcha(e.target.value)}
          />
          <p className="pce-field-hint">When you brought them home.</p>
        </div>

        <div className="pce-field">
          <label htmlFor="pce-weight" className="pce-label">
            Weight
          </label>
          <WeightInputWithToggle
            valueInLbs={draftWeight}
            displayUnit={draftWeightUnit}
            onValueChangeLbs={setDraftWeight}
            onUnitChange={setDraftWeightUnit}
            inputId="pce-weight"
          />
          <p className="pce-field-hint">
            Track weight history below in Care section.
          </p>
        </div>

        <div className="pce-field">
          <label htmlFor="pce-color" className="pce-label">
            Color / markings
          </label>
          <input
            id="pce-color"
            type="text"
            className="pce-input"
            value={draftColor}
            onChange={(e) => setDraftColor(e.target.value)}
            placeholder="e.g. Brindle"
            maxLength={32}
          />
          <p className="pce-field-hint pce-field-hint--with-count">
            <span>Main color or markings.</span>
            {draftColor.length >= 24 ? (
              <span
                className={`pce-char-count${draftColor.length >= 32 ? " is-max" : ""}`}
              >
                {draftColor.length}/32
              </span>
            ) : null}
          </p>
        </div>

        <div className="pce-field">
          <label htmlFor="pce-mc" className="pce-label">
            Microchip
          </label>
          <input
            id="pce-mc"
            type="text"
            inputMode="numeric"
            className="pce-input"
            value={draftMicrochip}
            onChange={(e) => {
              const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 15);
              setDraftMicrochip(digitsOnly);
            }}
            placeholder="e.g. 985112004567890"
            maxLength={15}
          />
          {draftMicrochip.length > 0 &&
          ![9, 10, 15].includes(draftMicrochip.length) ? (
            <p className="pce-field-hint pce-field-warn">
              Must be 9, 10, or 15 digits, numbers only.
            </p>
          ) : (
            <p className="pce-field-hint">
              Must be 9, 10, or 15 digits, numbers only.
            </p>
          )}
        </div>
      </div>

      <div className="pce-inline-form-actions">
        <button
          type="button"
          className="pce-btn-secondary"
          onClick={handleCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="pce-btn-primary"
          onClick={handleSave}
          disabled={nameMissing}
        >
          Save
        </button>
      </div>
    </div>
  );
}

// =============================================================
// PLACEHOLDER SECTION — for sections built in upcoming rounds
// =============================================================

function PlaceholderSection({ eyebrow, title, sub }) {
  return (
    <div className="pce-section">
      <div className="pce-section-header">
        <p className="pce-section-eyebrow">{eyebrow}</p>
        <h2 className="pce-section-title">{title}</h2>
        <p className="pce-section-sub">{sub}</p>
      </div>
      <div className="pce-coming-soon">Coming in the next update.</div>
    </div>
  );
}

// =============================================================
// TAG INPUT — reusable chip-style array field editor
// =============================================================
// Used by Personality section (traits/loves/dislikes) and Identity tags
// section (to be built next). Users type, press Enter or comma, and the
// text becomes a chip. Click X on a chip to remove. Backspace on empty
// input removes the last chip.
//
// Stored as text[] in the DB. Caller passes `value` (array) and `onChange`
// (called with new array). Component owns the in-progress text input only.

// =============================================================
// MEDICAL SECTION
// =============================================================
// Three subsections inside the Medical card:
//   1. Allergies + Conditions — free-text textareas, autosaved
//   2. Vaccinations — structured list with add/edit/delete modal
//   3. Medications — structured list with add/edit/delete modal

// =============================================================
// TextareaCard — reusable view/edit block for single-textarea fields.
// Used by: Allergies, Medical conditions, Quirks & warnings.
// Coordinates with the parent section's openFormId so only one is open at a time.
// =============================================================
function TextareaCard({
  formId,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
  value,
  fieldName,
  onUpdate,
  title,
  subtitle,
  placeholder,
  maxLength = 500,
  rows = 3,
  emptyPrompt,
  icon: Icon,
  // See TagArrayCard for explanation of headingLevel.
  headingLevel = "section",
}) {
  const editing = openFormId === formId;
  const hasValue = value && value.trim().length > 0;
  const [draft, setDraft] = useState(value || "");
  // Track whether the user explicitly cancelled this session — if so, we
  // suppress the autosave-on-close behavior so cancellation actually discards.
  const [cancelled, setCancelled] = useState(false);
  const draftRef = useRef(draft);
  const valueRef = useRef(value);
  draftRef.current = draft;
  valueRef.current = value;

  // Sync draft from value when entering edit mode (covers re-opens after autosave)
  useEffect(() => {
    if (editing) {
      setDraft(value || "");
      setCancelled(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  // Autosave on close: when this form transitions from open → closed (because
  // a DIFFERENT form opened, or user navigated away), commit any pending draft
  // changes. Skipped if the user explicitly clicked Cancel.
  const wasEditingRef = useRef(editing);
  useEffect(() => {
    if (wasEditingRef.current && !editing && !cancelled) {
      const draftTrimmed = (draftRef.current || "").trim();
      const valueTrimmed = (valueRef.current || "").trim();
      if (draftTrimmed !== valueTrimmed) {
        onUpdate(fieldName, draftTrimmed || null);
      }
    }
    wasEditingRef.current = editing;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  async function handleSave() {
    const next = draft.trim();
    if (next !== (value || "")) {
      const ok = await onUpdate(fieldName, next || null);
      if (ok) setOpenFormId(null);
    } else {
      // No change — nothing to save, just close.
      setOpenFormId(null);
    }
  }

  async function handleCancel() {
    if (confirmUnsaved && draft.trim() !== (value || "")) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return;
      if (choice === "save") {
        handleSave();
        return;
      }
    }
    setCancelled(true);
    setDraft(value || "");
    setOpenFormId(null);
  }

  return (
    <>
      {headingLevel === "label" ? (
        <h4 className="pce-field-heading">{title}</h4>
      ) : (
        <h3 className="pce-sub-title">{title}</h3>
      )}
      {subtitle ? <p className="pce-sub-sub">{subtitle}</p> : null}

      {hasValue && !editing ? (
        <div className="pce-list">
          <div className="pce-list-item pce-list-item--single">
            <div className="pce-list-item-body">
              <div className="pce-list-item-title-row pce-list-item-title-row--prose">
                {Icon ? (
                  <span className="pce-list-item-icon-inline">
                    <Icon size={18} strokeWidth={2} />
                  </span>
                ) : null}
                <p className="pce-list-item-prose">{value}</p>
              </div>
            </div>
            <div className="pce-list-item-actions">
              <button
                type="button"
                className="pce-icon-btn"
                onClick={() => setOpenFormId(formId)}
                aria-label={`Edit ${title.toLowerCase()}`}
              >
                <Pencil size={EDIT_ICON_SIZE} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!hasValue && !editing ? (
        <div className="pce-list-empty">
          {emptyPrompt || `No ${title.toLowerCase()} on file.`}
        </div>
      ) : null}

      <Collapse open={editing}>
        <div className="pce-inline-form">
          <button
            type="button"
            className="pce-form-close"
            aria-label="Close"
            onClick={handleCancel}
          >
            <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
          </button>
          <div className="pce-entry-card">
            <div className="pce-field">
              <textarea
                className="pce-textarea"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={placeholder}
                maxLength={maxLength}
                rows={rows}
                autoFocus
              />
            </div>
          </div>
          <div className="pce-inline-form-actions">
            <button
              type="button"
              className="pce-btn-secondary"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="pce-btn-primary"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>
      </Collapse>
      {!editing &&
        (!hasValue ? (
          // Only show the "+ Add X" button when there is no value yet. When a
          // value exists, the pencil icon on the view-mode card is the canonical
          // edit affordance — a separate "+ Edit X" button below would be a
          // redundant and contradictory affordance (the + icon means "add").
          // Same pattern as PrimaryVetBlock / EmergencyVetBlock / InsuranceBlock.
          <button
            type="button"
            className="pce-add-btn"
            onClick={() => setOpenFormId(formId)}
          >
            <Plus size={16} strokeWidth={2.4} />
            Add {title.toLowerCase()}
          </button>
        ) : null)}
    </>
  );
}

function MedicalSection({
  pet,
  onUpdate,
  setSaveStatus,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
}) {
  // Uses site-wide openFormId coordinator (passed from PetCardEditorPage)
  return (
    <>
      {/* Allergies — uses view/edit pattern via TextareaCard */}
      <div className="pce-subsection">
        <TextareaCard
          formId="allergies"
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
          value={pet.allergies}
          fieldName="allergies"
          onUpdate={onUpdate}
          title="Allergies"
          subtitle="Food, environmental, medication. Anything to avoid."
          placeholder="e.g. Chicken, beef. Mild reaction to tick medication X."
          maxLength={500}
          rows={3}
          icon={AlertTriangle}
        />
      </div>

      {/* Medical conditions — uses view/edit pattern via TextareaCard */}
      <div className="pce-subsection">
        <TextareaCard
          formId="medical-conditions"
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
          value={pet.medical_conditions}
          fieldName="medical_conditions"
          onUpdate={onUpdate}
          title="Medical conditions"
          subtitle="Ongoing or past diagnoses worth noting."
          placeholder="e.g. Hip dysplasia (mild), seasonal allergies."
          maxLength={500}
          rows={3}
          icon={HeartPulse}
        />
      </div>

      {/* Vaccinations */}
      <div className="pce-subsection">
        <VaccinationsBlock
          pet={pet}
          setSaveStatus={setSaveStatus}
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
        />
      </div>

      {/* Medications */}
      <div className="pce-subsection">
        <MedicationsBlock
          pet={pet}
          setSaveStatus={setSaveStatus}
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
        />
      </div>
    </>
  );
}

// =============================================================
// CARE SECTION (Build 5c) — feeding, walks, weight history, quirks
// =============================================================
// Mirrors MedicalSection structure exactly. Reuses every locked pattern:
//   - List item card visual (white + warm border + amber hover)
//   - Title-row with status pill (PAUSED only) + pencil top-right
//   - Label:value meta rows with responsive breakpoints
//   - NotesSection for long-form notes (3-line clamp + animated expand)
//   - Inline multi-add forms for fast bulk entry
//   - Edit modal pattern for single-record edits
//   - Two-tap delete confirm
//   - Body scroll-lock + Profile button order
// =============================================================
// WEIGHT INPUT WITH UNIT TOGGLE — used in Identity + Weight entries
// =============================================================
// Storage is ALWAYS in lbs (canonical). This component takes valueInLbs and
// displayUnit, shows the converted value in the input, and on input/toggle
// converts back to lbs before calling onValueChangeLbs.
// onUnitChange only updates the display preference — value stays as lbs in DB.

function WeightInputWithToggle({
  valueInLbs,
  displayUnit,
  onValueChangeLbs,
  onUnitChange,
  inputId,
  placeholder = "e.g. 45",
}) {
  // Convert the canonical lbs value to the displayed unit for the input field
  const displayValue =
    valueInLbs == null || valueInLbs === ""
      ? ""
      : displayUnit === "kg"
        ? String(roundForDisplay(convertWeightTo(Number(valueInLbs), "kg")))
        : String(valueInLbs);

  function handleInputChange(typedValue) {
    if (typedValue === "") {
      onValueChangeLbs(null);
      return;
    }
    const num = Number(typedValue);
    if (isNaN(num)) return;
    // Convert user's typed value back to lbs (canonical storage)
    const lbsValue =
      displayUnit === "kg"
        ? roundForDisplay(convertWeightFromDisplay(num, "kg"))
        : num;
    onValueChangeLbs(lbsValue);
  }

  return (
    <div className="pce-weight-row">
      <input
        id={inputId}
        type="number"
        inputMode="decimal"
        step="0.1"
        min="0"
        className="pce-input pce-weight-input"
        value={displayValue}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder}
      />
      <div
        className="pce-weight-unit-toggle"
        role="group"
        aria-label="Weight unit"
      >
        <button
          type="button"
          className={`pce-weight-unit-btn ${displayUnit === "lbs" ? "active" : ""}`}
          onClick={() => onUnitChange("lbs")}
        >
          lbs
        </button>
        <button
          type="button"
          className={`pce-weight-unit-btn ${displayUnit === "kg" ? "active" : ""}`}
          onClick={() => onUnitChange("kg")}
        >
          kg
        </button>
      </div>
    </div>
  );
}

// =============================================================
// FREQUENCY FIELD — shared by Feeding + Walk inline + modal forms
// Renders a frequency dropdown; if "Custom", reveals day-of-week checkboxes.
// Self-contained: caller passes value+onChange for both frequency AND days_of_week.
// =============================================================

function FrequencyField({
  frequency,
  daysOfWeek,
  recurrenceInterval,
  onFrequencyChange,
  onDaysChange,
  onRecurrenceChange,
}) {
  const showDayPicker = frequency === "custom";

  function toggleDay(dayKey) {
    const current = Array.isArray(daysOfWeek) ? daysOfWeek : [];
    if (current.includes(dayKey)) {
      onDaysChange(current.filter((d) => d !== dayKey));
    } else {
      onDaysChange([...current, dayKey]);
    }
  }

  return (
    // FrequencyField returns a SINGLE wrapper div so when used inside a parent
    // grid (e.g. FeedingModal's .pce-field-grid), it counts as ONE grid cell.
    // Previously the Fragment spread each child into its own grid cell, which
    // broke spacing when the day picker appeared (the 8px spacer became its
    // own grid row with full 14px gaps on each side = ~36px visible gap).
    <div className="pce-frequency-block">
      <div className="pce-field">
        <label className="pce-label">Frequency</label>
        <select
          className="pce-select"
          value={frequency || "daily"}
          onChange={(e) => onFrequencyChange(e.target.value)}
        >
          <option value="daily">Daily</option>
          <option value="weekdays">Weekdays</option>
          <option value="weekends">Weekends</option>
          <option value="as_needed">As needed</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      {showDayPicker ? (
        <>
          <div
            className="pce-days-picker"
            role="group"
            aria-label="Days of the week"
          >
            {DAYS_OF_WEEK.map((d) => {
              const active =
                Array.isArray(daysOfWeek) && daysOfWeek.includes(d.key);
              return (
                <button
                  key={d.key}
                  type="button"
                  className={`pce-day-btn ${active ? "active" : ""}`}
                  onClick={() => toggleDay(d.key)}
                  aria-pressed={active}
                  aria-label={d.label}
                >
                  {d.short}
                </button>
              );
            })}
          </div>
          <div className="pce-field">
            <label className="pce-label">Repeats</label>
            <select
              className="pce-select"
              value={recurrenceInterval || "weekly"}
              onChange={(e) => onRecurrenceChange(e.target.value)}
            >
              <option value="weekly">Every week</option>
              <option value="biweekly">Every other week</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </>
      ) : null}
    </div>
  );
}

function CareSection({
  pet,
  onUpdate,
  setSaveStatus,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
}) {
  // Uses site-wide openFormId coordinator (passed from PetCardEditorPage)
  return (
    <>
      {/* Feeding schedule */}
      <div className="pce-subsection">
        <FeedingsBlock
          pet={pet}
          setSaveStatus={setSaveStatus}
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
        />
      </div>

      {/* Walk / exercise schedule */}
      <div className="pce-subsection">
        <WalksBlock
          pet={pet}
          setSaveStatus={setSaveStatus}
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
        />
      </div>

      {/* Weight history */}
      <div className="pce-subsection">
        <WeightHistoryBlock
          pet={pet}
          onUpdate={onUpdate}
          setSaveStatus={setSaveStatus}
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
        />
      </div>

      {/* Quirks & warnings — view/edit pattern via TextareaCard */}
      <div className="pce-subsection">
        <TextareaCard
          formId="quirks-warnings"
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
          value={pet.quirks_warnings}
          fieldName="quirks_warnings"
          onUpdate={onUpdate}
          title="Quirks & warnings"
          subtitle="Behavior notes, fears, things to watch for. Anything a sitter should know."
          placeholder="e.g. Afraid of thunder. Reactive to other dogs on leash. Eats fast — uses slow feeder."
          maxLength={1000}
          rows={4}
          icon={Sparkles}
        />
      </div>
    </>
  );
}

// =============================================================
// FEEDINGS BLOCK — list + inline add + edit modal
// =============================================================

function FeedingsBlock({
  pet,
  setSaveStatus,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
}) {
  const FORM_ID = "feedings-add";
  const addOpen = openFormId === FORM_ID;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await getPetFeedings(pet.id);
      if (cancelled) return;
      if (!error && data) setItems(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pet.id]);

  function openAdd() {
    setOpenFormId(FORM_ID);
  }
  function closeAdd() {
    setOpenFormId(null);
  }
  function openEdit(item) {
    setOpenFormId(null); // close any open inline form first
    setEditingItem(item);
  }
  function closeEdit() {
    setEditingItem(null);
  }

  async function handleAddSave(fields) {
    setSaveStatus("saving");
    const { data, error } = await addFeeding(pet.id, fields);
    if (error) {
      setSaveStatus("error");
      return false;
    }
    setItems((prev) => [...prev, data].sort(sortByTime));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  }

  async function handleEditSave(fields) {
    setSaveStatus("saving");
    const { data, error } = await updateFeeding(editingItem.id, fields);
    if (error) {
      setSaveStatus("error");
      return false;
    }
    setItems((prev) =>
      prev.map((f) => (f.id === editingItem.id ? data : f)).sort(sortByTime),
    );
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  }

  async function handleDelete() {
    if (!editingItem) return false;
    setSaveStatus("saving");
    const { error } = await deleteFeeding(editingItem.id);
    if (error) {
      setSaveStatus("error");
      return false;
    }
    setItems((prev) => prev.filter((f) => f.id !== editingItem.id));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  }

  return (
    <>
      <h3 className="pce-sub-title">Feeding schedule</h3>
      <p className="pce-sub-sub">
        Meals, times, brands, portions — the daily food routine.
      </p>

      {loading ? (
        <div className="pce-list-empty">Loading…</div>
      ) : (
        <>
          {items.length === 0 && !addOpen ? (
            <div className="pce-list-empty">
              No feedings recorded. Add one to start tracking.
            </div>
          ) : (
            <CollapsibleList
              items={items}
              limit={5}
              noun="feedings"
              renderItem={(item) => (
                <FeedingItem
                  key={item.id}
                  item={item}
                  onEdit={() => openEdit(item)}
                />
              )}
            />
          )}

          {addOpen ? (
            <InlineAddFeedings
              confirmUnsaved={confirmUnsaved}
              onCancel={closeAdd}
              onSaveAll={handleAddSave}
              onDone={closeAdd}
            />
          ) : (
            <button type="button" className="pce-add-btn" onClick={openAdd}>
              <Plus size={16} strokeWidth={2.4} />
              Add feeding
            </button>
          )}
        </>
      )}

      {editingItem ? (
        <FeedingModal
          item={editingItem}
          confirmUnsaved={confirmUnsaved}
          onClose={closeEdit}
          onSave={handleEditSave}
          onDelete={handleDelete}
        />
      ) : null}
    </>
  );
}

function sortByTime(a, b) {
  // Sort by time_of_day ascending, nulls last
  if (!a.time_of_day && !b.time_of_day) return 0;
  if (!a.time_of_day) return 1;
  if (!b.time_of_day) return -1;
  return a.time_of_day.localeCompare(b.time_of_day);
}

// Single feeding row
function FeedingItem({ item, onEdit }) {
  const timeStr = formatTimeOfDay(item.time_of_day);
  const daysStr = formatDaysOfWeek(item.days_of_week);
  // For "custom" frequency: days in Frequency row, recurrence in Repeats row.
  // For other frequencies (daily/weekdays/weekends/as_needed): just Frequency.
  const isCustom = item.frequency === "custom" && daysStr;
  const freqDisplay = isCustom ? daysStr : formatFrequency(item.frequency);
  const repeatsDisplay = isCustom
    ? formatRecurrence(item.recurrence_interval || "weekly")
    : null;

  // Status pill: only show PAUSED when relevant. No frequency pill.
  const showPaused = !!item.is_paused;

  const metaRows = [];
  if (timeStr) metaRows.push({ label: "Time", value: timeStr });
  if (freqDisplay) metaRows.push({ label: "Frequency", value: freqDisplay });
  if (repeatsDisplay)
    metaRows.push({ label: "Repeats", value: repeatsDisplay });
  if (item.food) metaRows.push({ label: "Food", value: item.food });
  if (item.amount) metaRows.push({ label: "Amount", value: item.amount });

  return (
    <div className={`pce-list-item ${showPaused ? "is-paused" : ""}`}>
      <div className="pce-list-item-body">
        <div className="pce-list-item-title-row">
          <span className="pce-list-item-icon-inline">
            <UtensilsCrossed size={18} strokeWidth={2} />
          </span>
          <p className="pce-list-item-title">
            {item.name || "Untitled feeding"}
          </p>
          {showPaused ? (
            <span className="pce-list-item-status paused">Paused</span>
          ) : null}
        </div>
        {metaRows.length > 0 ? (
          <>
            <div className="pce-list-item-sep" />
            <div
              className="pce-list-item-meta pce-list-item-meta--feedings"
              style={{ "--col-count": metaRows.length }}
            >
              {metaRows.map((row, i) => (
                <div key={i} className="pce-list-item-meta-row">
                  <span className="pce-list-item-meta-label">{row.label}:</span>
                  <span className="pce-list-item-meta-value">{row.value}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}
        <NotesSection notes={item.notes} />
      </div>
      <div className="pce-list-item-actions">
        <button
          type="button"
          className="pce-icon-btn"
          onClick={onEdit}
          aria-label="Edit feeding"
        >
          <Pencil size={EDIT_ICON_SIZE} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

// Empty feeding entry for inline multi-add
const EMPTY_FEEDING_ENTRY = {
  name: "",
  time_of_day: "",
  frequency: "daily",
  days_of_week: null,
  recurrence_interval: "weekly",
  is_paused: false,
  food: "",
  amount: "",
  notes: "",
};

function InlineAddFeedings({ onCancel, onSaveAll, onDone, confirmUnsaved }) {
  const [entries, setEntries] = useState([{ ...EMPTY_FEEDING_ENTRY }]);
  const [saving, setSaving] = useState(false);

  // Dirty = the user has entered anything (more than the single empty entry, or
  // the one entry differs from a fresh empty entry).
  function isBatchDirty() {
    if (entries.length !== 1) return true;
    return (
      JSON.stringify(entries[0]) !== JSON.stringify({ ...EMPTY_FEEDING_ENTRY })
    );
  }
  async function handleCancel() {
    if (confirmUnsaved && isBatchDirty()) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return;
      if (choice === "save") {
        await handleSubmit();
        return;
      }
    }
    onCancel();
  }

  function updateEntry(idx, key, value) {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [key]: value } : e)),
    );
  }
  function addEntry() {
    setEntries((prev) => [...prev, { ...EMPTY_FEEDING_ENTRY }]);
  }
  function removeEntry(idx) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  const canSave =
    !saving &&
    entries.length > 0 &&
    entries.every((e) => e.name.trim().length > 0);

  async function handleSubmit() {
    if (!canSave) return;
    setSaving(true);
    let anyFailed = false;
    for (const e of entries) {
      const ok = await onSaveAll({
        name: e.name.trim(),
        time_of_day: e.time_of_day || null,
        frequency: e.frequency || "daily",
        days_of_week: e.frequency === "custom" ? e.days_of_week : null,
        recurrence_interval:
          e.frequency === "custom" ? e.recurrence_interval || "weekly" : null,
        is_paused: false,
        food: e.food.trim() || null,
        amount: e.amount.trim() || null,
        notes: e.notes.trim() || null,
      });
      if (ok === false) {
        anyFailed = true;
        break;
      }
    }
    setSaving(false);
    if (!anyFailed) onDone();
  }

  const count = entries.length;
  const primaryLabel = `Add ${count} ${count === 1 ? "feeding" : "feedings"}`;

  return (
    <div className="pce-inline-form">
      <button
        type="button"
        className="pce-form-close"
        aria-label="Close"
        onClick={handleCancel}
      >
        <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
      </button>
      {entries.map((entry, idx) => (
        <div key={idx} className="pce-entry-card">
          <div className="pce-entry-header">
            <span className="pce-entry-label">Feeding {idx + 1}</span>
            {entries.length > 1 ? (
              <button
                type="button"
                className="pce-icon-btn"
                onClick={() => removeEntry(idx)}
                aria-label={`Remove feeding ${idx + 1}`}
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            ) : null}
          </div>

          <div className="pce-field-grid">
            <div className="pce-field">
              <label className="pce-label">
                Meal name{" "}
                <span className="pce-req-mark" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                type="text"
                className="pce-input"
                value={entry.name}
                onChange={(e) => updateEntry(idx, "name", e.target.value)}
                placeholder="e.g. Breakfast, Dinner"
                maxLength={60}
                autoFocus={idx === 0}
              />
              {entry.name.trim() === "" ? (
                <p className="pce-field-hint pce-field-warn">
                  Meal name is required.
                </p>
              ) : null}
            </div>
          </div>

          <div className="pce-field-grid two-col">
            <div className="pce-field">
              <label className="pce-label">Time</label>
              <input
                type="time"
                className="pce-input"
                value={entry.time_of_day || ""}
                onChange={(e) =>
                  updateEntry(idx, "time_of_day", e.target.value)
                }
              />
            </div>
            <FrequencyField
              frequency={entry.frequency}
              daysOfWeek={entry.days_of_week}
              recurrenceInterval={entry.recurrence_interval}
              onFrequencyChange={(v) => updateEntry(idx, "frequency", v)}
              onDaysChange={(d) => updateEntry(idx, "days_of_week", d)}
              onRecurrenceChange={(r) =>
                updateEntry(idx, "recurrence_interval", r)
              }
            />
          </div>

          <div className="pce-field-grid two-col">
            <div className="pce-field">
              <label className="pce-label">Food / brand</label>
              <input
                type="text"
                className="pce-input"
                value={entry.food}
                onChange={(e) => updateEntry(idx, "food", e.target.value)}
                placeholder="e.g. Hill's Science Diet Adult"
                maxLength={120}
              />
            </div>
            <div className="pce-field">
              <label className="pce-label">Amount</label>
              <input
                type="text"
                className="pce-input"
                value={entry.amount}
                onChange={(e) => updateEntry(idx, "amount", e.target.value)}
                placeholder="e.g. 1 cup, 200g"
                maxLength={40}
              />
            </div>
          </div>

          <div className="pce-field">
            <label className="pce-label">Notes</label>
            <textarea
              className="pce-textarea"
              value={entry.notes}
              onChange={(e) => updateEntry(idx, "notes", e.target.value)}
              placeholder="e.g. Mix with warm water. Add joint supplement."
              maxLength={400}
              rows={3}
            />
          </div>
        </div>
      ))}

      <button type="button" className="pce-add-entry" onClick={addEntry}>
        <Plus size={16} strokeWidth={2.4} />
        Add another feeding
      </button>

      <div className="pce-inline-form-actions">
        <button
          type="button"
          className="pce-btn-secondary"
          onClick={handleCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="pce-btn-primary"
          onClick={handleSubmit}
          disabled={!canSave}
        >
          {saving ? (
            <>
              <Loader2 size={14} strokeWidth={2.4} className="pce-spin" />
              Saving…
            </>
          ) : (
            primaryLabel
          )}
        </button>
      </div>
    </div>
  );
}

// Edit modal for single feeding
function FeedingModal({ item, onClose, onSave, onDelete, confirmUnsaved }) {
  const [name, setName] = useState(item?.name || "");
  const [timeOfDay, setTimeOfDay] = useState(item?.time_of_day || "");
  const [frequency, setFrequency] = useState(item?.frequency || "daily");
  const [daysOfWeek, setDaysOfWeek] = useState(item?.days_of_week || null);
  const [recurrenceInterval, setRecurrenceInterval] = useState(
    item?.recurrence_interval || "weekly",
  );
  const [isPaused, setIsPaused] = useState(!!item?.is_paused);
  const [food, setFood] = useState(item?.food || "");
  const [amount, setAmount] = useState(item?.amount || "");
  const [notes, setNotes] = useState(item?.notes || "");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  function isDirty() {
    return (
      name !== (item?.name || "") ||
      timeOfDay !== (item?.time_of_day || "") ||
      frequency !== (item?.frequency || "daily") ||
      JSON.stringify(daysOfWeek) !==
        JSON.stringify(item?.days_of_week || null) ||
      recurrenceInterval !== (item?.recurrence_interval || "weekly") ||
      isPaused !== !!item?.is_paused ||
      food !== (item?.food || "") ||
      amount !== (item?.amount || "") ||
      notes !== (item?.notes || "")
    );
  }
  async function handleClose() {
    if (confirmUnsaved && isDirty()) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return;
      if (choice === "save") {
        await handleSave();
        return;
      }
    }
    onClose();
  }

  // Body scroll-lock with compensation for scrollbar to prevent layout shift
  useEffect(() => {
    // `overflow: hidden` alone does not stop scrolling in iOS Safari. Pinning
    // the body and offsetting it by the current scroll is what works. Previous
    // values are restored rather than cleared, so a modal opening on top of
    // another doesn't release the page when the inner one closes.
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    return () => {
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, []);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const ok = await onSave({
      name: name.trim(),
      time_of_day: timeOfDay || null,
      frequency,
      days_of_week: frequency === "custom" ? daysOfWeek : null,
      recurrence_interval: frequency === "custom" ? recurrenceInterval : null,
      is_paused: isPaused,
      food: food.trim() || null,
      amount: amount.trim() || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (ok) onClose();
  }

  async function handleDeleteClick() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000);
      return;
    }
    setSaving(true);
    const ok = await onDelete();
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <ModalShell onClose={handleClose} title="Edit feeding">
      <div className="pce-modal-body">
        <div className="pce-field">
          <label className="pce-label">
            Meal name{" "}
            <span className="pce-req-mark" aria-hidden="true">
              *
            </span>
          </label>
          <input
            type="text"
            className="pce-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Breakfast"
            maxLength={60}
          />
        </div>

        <div className="pce-field-grid">
          <div className="pce-field">
            <label className="pce-label">Time</label>
            <input
              type="time"
              className="pce-input"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
            />
          </div>

          <FrequencyField
            frequency={frequency}
            daysOfWeek={daysOfWeek}
            recurrenceInterval={recurrenceInterval}
            onFrequencyChange={setFrequency}
            onDaysChange={setDaysOfWeek}
            onRecurrenceChange={setRecurrenceInterval}
          />
        </div>

        <div className="pce-field">
          <label className="pce-label">Food / brand</label>
          <input
            type="text"
            className="pce-input"
            value={food}
            onChange={(e) => setFood(e.target.value)}
            placeholder="e.g. Hill's Science Diet Adult"
            maxLength={120}
          />
        </div>

        <div className="pce-field">
          <label className="pce-label">Amount</label>
          <input
            type="text"
            className="pce-input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 1 cup, 200g"
            maxLength={40}
          />
        </div>

        <div className="pce-field">
          <label className="pce-label">Notes</label>
          <textarea
            className="pce-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything a sitter should know about this meal."
            maxLength={500}
            rows={3}
          />
        </div>

        <label className="pce-checkbox-row">
          <input
            type="checkbox"
            checked={isPaused}
            onChange={(e) => setIsPaused(e.target.checked)}
          />
          <span>Pause this feeding (boarding, vacation, recovery)</span>
        </label>
      </div>

      <div className="pce-modal-footer">
        <button
          type="button"
          className="pce-btn-danger-text"
          onClick={handleDeleteClick}
          disabled={saving}
        >
          {deleteConfirm ? "Tap again to confirm" : "Delete"}
        </button>
        <button
          type="button"
          className="pce-btn-secondary"
          onClick={handleClose}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="pce-btn-primary"
          onClick={handleSave}
          disabled={saving || !name.trim()}
        >
          {saving ? (
            <Loader2 size={14} strokeWidth={2.4} className="pce-spin" />
          ) : (
            "Save changes"
          )}
        </button>
      </div>
    </ModalShell>
  );
}

// =============================================================
// WALKS BLOCK — same pattern as feedings, fewer fields
// =============================================================

function WalksBlock({
  pet,
  setSaveStatus,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
}) {
  const FORM_ID = "walks-add";
  const addOpen = openFormId === FORM_ID;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await getPetWalks(pet.id);
      if (cancelled) return;
      if (!error && data) setItems(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pet.id]);

  function openAdd() {
    setOpenFormId(FORM_ID);
  }
  function closeAdd() {
    setOpenFormId(null);
  }
  function openEdit(item) {
    setOpenFormId(null); // close any open inline form first
    setEditingItem(item);
  }
  function closeEdit() {
    setEditingItem(null);
  }

  async function handleAddSave(fields) {
    setSaveStatus("saving");
    const { data, error } = await addWalk(pet.id, fields);
    if (error) {
      setSaveStatus("error");
      return false;
    }
    setItems((prev) => [...prev, data].sort(sortByTime));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  }

  async function handleEditSave(fields) {
    setSaveStatus("saving");
    const { data, error } = await updateWalk(editingItem.id, fields);
    if (error) {
      setSaveStatus("error");
      return false;
    }
    setItems((prev) =>
      prev.map((w) => (w.id === editingItem.id ? data : w)).sort(sortByTime),
    );
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  }

  async function handleDelete() {
    if (!editingItem) return false;
    setSaveStatus("saving");
    const { error } = await deleteWalk(editingItem.id);
    if (error) {
      setSaveStatus("error");
      return false;
    }
    setItems((prev) => prev.filter((w) => w.id !== editingItem.id));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  }

  return (
    <>
      <h3 className="pce-sub-title">Walk &amp; exercise</h3>
      <p className="pce-sub-sub">
        Walks, park visits, play sessions — the activity routine.
      </p>

      {loading ? (
        <div className="pce-list-empty">Loading…</div>
      ) : (
        <>
          {items.length === 0 && !addOpen ? (
            <div className="pce-list-empty">
              No walks or exercise recorded. Add one to start tracking.
            </div>
          ) : (
            <CollapsibleList
              items={items}
              limit={5}
              noun="walks"
              renderItem={(item) => (
                <WalkItem
                  key={item.id}
                  item={item}
                  onEdit={() => openEdit(item)}
                />
              )}
            />
          )}

          {addOpen ? (
            <InlineAddWalks
              confirmUnsaved={confirmUnsaved}
              onCancel={closeAdd}
              onSaveAll={handleAddSave}
              onDone={closeAdd}
            />
          ) : (
            <button type="button" className="pce-add-btn" onClick={openAdd}>
              <Plus size={16} strokeWidth={2.4} />
              Add walk or activity
            </button>
          )}
        </>
      )}

      {editingItem ? (
        <WalkModal
          item={editingItem}
          confirmUnsaved={confirmUnsaved}
          onClose={closeEdit}
          onSave={handleEditSave}
          onDelete={handleDelete}
        />
      ) : null}
    </>
  );
}

function WalkItem({ item, onEdit }) {
  const timeStr = formatTimeOfDay(item.time_of_day);
  const daysStr = formatDaysOfWeek(item.days_of_week);
  const isCustom = item.frequency === "custom" && daysStr;
  const freqDisplay = isCustom ? daysStr : formatFrequency(item.frequency);
  const repeatsDisplay = isCustom
    ? formatRecurrence(item.recurrence_interval || "weekly")
    : null;
  const showPaused = !!item.is_paused;

  const metaRows = [];
  if (timeStr) metaRows.push({ label: "Time", value: timeStr });
  if (freqDisplay) metaRows.push({ label: "Frequency", value: freqDisplay });
  if (repeatsDisplay)
    metaRows.push({ label: "Repeats", value: repeatsDisplay });
  if (item.duration) metaRows.push({ label: "Duration", value: item.duration });

  return (
    <div className={`pce-list-item ${showPaused ? "is-paused" : ""}`}>
      <div className="pce-list-item-body">
        <div className="pce-list-item-title-row">
          <span className="pce-list-item-icon-inline">
            <PawPrint size={18} strokeWidth={2} />
          </span>
          <p className="pce-list-item-title">{item.name || "Untitled walk"}</p>
          {showPaused ? (
            <span className="pce-list-item-status paused">Paused</span>
          ) : null}
        </div>
        {metaRows.length > 0 ? (
          <>
            <div className="pce-list-item-sep" />
            <div
              className="pce-list-item-meta pce-list-item-meta--walks"
              style={{ "--col-count": metaRows.length }}
            >
              {metaRows.map((row, i) => (
                <div key={i} className="pce-list-item-meta-row">
                  <span className="pce-list-item-meta-label">{row.label}:</span>
                  <span className="pce-list-item-meta-value">{row.value}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}
        <NotesSection notes={item.notes} />
      </div>
      <div className="pce-list-item-actions">
        <button
          type="button"
          className="pce-icon-btn"
          onClick={onEdit}
          aria-label="Edit walk"
        >
          <Pencil size={EDIT_ICON_SIZE} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

const EMPTY_WALK_ENTRY = {
  name: "",
  time_of_day: "",
  frequency: "daily",
  days_of_week: null,
  recurrence_interval: "weekly",
  is_paused: false,
  duration: "",
  notes: "",
};

function InlineAddWalks({ onCancel, onSaveAll, onDone, confirmUnsaved }) {
  const [entries, setEntries] = useState([{ ...EMPTY_WALK_ENTRY }]);
  const [saving, setSaving] = useState(false);

  function isBatchDirty() {
    if (entries.length !== 1) return true;
    return (
      JSON.stringify(entries[0]) !== JSON.stringify({ ...EMPTY_WALK_ENTRY })
    );
  }
  async function handleCancel() {
    if (confirmUnsaved && isBatchDirty()) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return;
      if (choice === "save") {
        await handleSubmit();
        return;
      }
    }
    onCancel();
  }

  function updateEntry(idx, key, value) {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [key]: value } : e)),
    );
  }
  function addEntry() {
    setEntries((prev) => [...prev, { ...EMPTY_WALK_ENTRY }]);
  }
  function removeEntry(idx) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  const canSave =
    !saving &&
    entries.length > 0 &&
    entries.every((e) => e.name.trim().length > 0);

  async function handleSubmit() {
    if (!canSave) return;
    setSaving(true);
    let anyFailed = false;
    for (const e of entries) {
      const ok = await onSaveAll({
        name: e.name.trim(),
        time_of_day: e.time_of_day || null,
        frequency: e.frequency || "daily",
        days_of_week: e.frequency === "custom" ? e.days_of_week : null,
        recurrence_interval:
          e.frequency === "custom" ? e.recurrence_interval || "weekly" : null,
        is_paused: false,
        duration: e.duration.trim() || null,
        notes: e.notes.trim() || null,
      });
      if (ok === false) {
        anyFailed = true;
        break;
      }
    }
    setSaving(false);
    if (!anyFailed) onDone();
  }

  const count = entries.length;
  const primaryLabel = `Add ${count} ${count === 1 ? "walk" : "walks"}`;

  return (
    <div className="pce-inline-form">
      <button
        type="button"
        className="pce-form-close"
        aria-label="Close"
        onClick={handleCancel}
      >
        <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
      </button>
      {entries.map((entry, idx) => (
        <div key={idx} className="pce-entry-card">
          <div className="pce-entry-header">
            <span className="pce-entry-label">Walk {idx + 1}</span>
            {entries.length > 1 ? (
              <button
                type="button"
                className="pce-icon-btn"
                onClick={() => removeEntry(idx)}
                aria-label={`Remove walk ${idx + 1}`}
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            ) : null}
          </div>

          <div className="pce-field-grid">
            <div className="pce-field">
              <label className="pce-label">
                Activity name{" "}
                <span className="pce-req-mark" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                type="text"
                className="pce-input"
                value={entry.name}
                onChange={(e) => updateEntry(idx, "name", e.target.value)}
                placeholder="e.g. Morning walk, Park visit"
                maxLength={60}
                autoFocus={idx === 0}
              />
              {entry.name.trim() === "" ? (
                <p className="pce-field-hint pce-field-warn">
                  Activity name is required.
                </p>
              ) : null}
            </div>
          </div>

          <div className="pce-field-grid two-col">
            <div className="pce-field">
              <label className="pce-label">Time</label>
              <input
                type="time"
                className="pce-input"
                value={entry.time_of_day || ""}
                onChange={(e) =>
                  updateEntry(idx, "time_of_day", e.target.value)
                }
              />
            </div>
            <FrequencyField
              frequency={entry.frequency}
              daysOfWeek={entry.days_of_week}
              recurrenceInterval={entry.recurrence_interval}
              onFrequencyChange={(v) => updateEntry(idx, "frequency", v)}
              onDaysChange={(d) => updateEntry(idx, "days_of_week", d)}
              onRecurrenceChange={(r) =>
                updateEntry(idx, "recurrence_interval", r)
              }
            />
            <div className="pce-field">
              <label className="pce-label">Duration</label>
              <input
                type="text"
                className="pce-input"
                value={entry.duration}
                onChange={(e) => updateEntry(idx, "duration", e.target.value)}
                placeholder="e.g. 30 min, 1 hour"
                maxLength={40}
              />
            </div>
          </div>

          <div className="pce-field">
            <label className="pce-label">Notes</label>
            <textarea
              className="pce-textarea"
              value={entry.notes}
              onChange={(e) => updateEntry(idx, "notes", e.target.value)}
              placeholder="e.g. Loves the dog park. Leash-pulls near squirrels."
              maxLength={400}
              rows={3}
            />
          </div>
        </div>
      ))}

      <button type="button" className="pce-add-entry" onClick={addEntry}>
        <Plus size={16} strokeWidth={2.4} />
        Add another walk
      </button>

      <div className="pce-inline-form-actions">
        <button
          type="button"
          className="pce-btn-secondary"
          onClick={handleCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="pce-btn-primary"
          onClick={handleSubmit}
          disabled={!canSave}
        >
          {saving ? (
            <>
              <Loader2 size={14} strokeWidth={2.4} className="pce-spin" />
              Saving…
            </>
          ) : (
            primaryLabel
          )}
        </button>
      </div>
    </div>
  );
}

function WalkModal({ item, onClose, onSave, onDelete, confirmUnsaved }) {
  const [name, setName] = useState(item?.name || "");
  const [timeOfDay, setTimeOfDay] = useState(item?.time_of_day || "");
  const [frequency, setFrequency] = useState(item?.frequency || "daily");
  const [daysOfWeek, setDaysOfWeek] = useState(item?.days_of_week || null);
  const [recurrenceInterval, setRecurrenceInterval] = useState(
    item?.recurrence_interval || "weekly",
  );
  const [isPaused, setIsPaused] = useState(!!item?.is_paused);
  const [duration, setDuration] = useState(item?.duration || "");
  const [notes, setNotes] = useState(item?.notes || "");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  function isDirty() {
    return (
      name !== (item?.name || "") ||
      timeOfDay !== (item?.time_of_day || "") ||
      frequency !== (item?.frequency || "daily") ||
      JSON.stringify(daysOfWeek) !==
        JSON.stringify(item?.days_of_week || null) ||
      recurrenceInterval !== (item?.recurrence_interval || "weekly") ||
      isPaused !== !!item?.is_paused ||
      duration !== (item?.duration || "") ||
      notes !== (item?.notes || "")
    );
  }
  async function handleClose() {
    if (confirmUnsaved && isDirty()) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return;
      if (choice === "save") {
        await handleSave();
        return;
      }
    }
    onClose();
  }

  useEffect(() => {
    // `overflow: hidden` alone does not stop scrolling in iOS Safari. Pinning
    // the body and offsetting it by the current scroll is what works. Previous
    // values are restored rather than cleared, so a modal opening on top of
    // another doesn't release the page when the inner one closes.
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    return () => {
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, []);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const ok = await onSave({
      name: name.trim(),
      time_of_day: timeOfDay || null,
      frequency,
      days_of_week: frequency === "custom" ? daysOfWeek : null,
      recurrence_interval: frequency === "custom" ? recurrenceInterval : null,
      is_paused: isPaused,
      duration: duration.trim() || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (ok) onClose();
  }

  async function handleDeleteClick() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000);
      return;
    }
    setSaving(true);
    const ok = await onDelete();
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <ModalShell onClose={handleClose} title="Edit walk">
      <div className="pce-modal-body">
        <div className="pce-field">
          <label className="pce-label">
            Activity name{" "}
            <span className="pce-req-mark" aria-hidden="true">
              *
            </span>
          </label>
          <input
            type="text"
            className="pce-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Morning walk"
            maxLength={60}
          />
        </div>

        <div className="pce-field-grid">
          <div className="pce-field">
            <label className="pce-label">Time</label>
            <input
              type="time"
              className="pce-input"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
            />
          </div>

          <FrequencyField
            frequency={frequency}
            daysOfWeek={daysOfWeek}
            recurrenceInterval={recurrenceInterval}
            onFrequencyChange={setFrequency}
            onDaysChange={setDaysOfWeek}
            onRecurrenceChange={setRecurrenceInterval}
          />
        </div>

        <div className="pce-field">
          <label className="pce-label">Duration</label>
          <input
            type="text"
            className="pce-input"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 30 min, 1 hour"
            maxLength={40}
          />
        </div>

        <div className="pce-field">
          <label className="pce-label">Notes</label>
          <textarea
            className="pce-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything a sitter should know."
            maxLength={500}
            rows={3}
          />
        </div>

        <label className="pce-checkbox-row">
          <input
            type="checkbox"
            checked={isPaused}
            onChange={(e) => setIsPaused(e.target.checked)}
          />
          <span>Pause this activity (boarding, vacation, recovery)</span>
        </label>
      </div>

      <div className="pce-modal-footer">
        <button
          type="button"
          className="pce-btn-danger-text"
          onClick={handleDeleteClick}
          disabled={saving}
        >
          {deleteConfirm ? "Tap again to confirm" : "Delete"}
        </button>
        <button
          type="button"
          className="pce-btn-secondary"
          onClick={handleClose}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="pce-btn-primary"
          onClick={handleSave}
          disabled={saving || !name.trim()}
        >
          {saving ? (
            <Loader2 size={14} strokeWidth={2.4} className="pce-spin" />
          ) : (
            "Save changes"
          )}
        </button>
      </div>
    </ModalShell>
  );
}

// =============================================================
// WEIGHT HISTORY BLOCK — recharts line chart + filters + list
// =============================================================

function WeightHistoryBlock({
  pet,
  onUpdate,
  setSaveStatus,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
}) {
  const FORM_ID = "weight-add";
  const addOpen = openFormId === FORM_ID;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [rangeFilter, setRangeFilter] = useState("6m"); // 6m | 1y | all

  const weightUnit = pet.weight_unit || "lbs";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await getPetWeightHistory(pet.id);
      if (cancelled) return;
      if (!error && data) setItems(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pet.id]);

  function openAdd() {
    setOpenFormId(FORM_ID);
  }
  function closeAdd() {
    setOpenFormId(null);
  }
  function openEdit(item) {
    setOpenFormId(null); // close any open inline form first
    setEditingItem(item);
  }
  function closeEdit() {
    setEditingItem(null);
  }

  async function handleAddSave(fields) {
    setSaveStatus("saving");
    const { data, error } = await addWeightEntry(pet.id, fields);
    if (error) {
      setSaveStatus("error");
      return false;
    }
    setItems((prev) => [...prev, data].sort(sortByDate));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  }

  async function handleEditSave(fields) {
    setSaveStatus("saving");
    const { data, error } = await updateWeightEntry(editingItem.id, fields);
    if (error) {
      setSaveStatus("error");
      return false;
    }
    setItems((prev) =>
      prev.map((w) => (w.id === editingItem.id ? data : w)).sort(sortByDate),
    );
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  }

  async function handleDelete() {
    if (!editingItem) return false;
    setSaveStatus("saving");
    const { error } = await deleteWeightEntry(editingItem.id);
    if (error) {
      setSaveStatus("error");
      return false;
    }
    setItems((prev) => prev.filter((w) => w.id !== editingItem.id));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  }

  // Filter items by selected range
  const filteredItems = filterByRange(items, rangeFilter);

  // Trend: compare most recent entry to previous
  const rangeLabel =
    rangeFilter === "6m"
      ? "over last 6 months"
      : rangeFilter === "1y"
        ? "over last year"
        : "all-time";
  const trend = computeWeightTrend(items, weightUnit, rangeLabel);

  return (
    <>
      <h3 className="pce-sub-title">Weight history</h3>
      <p className="pce-sub-sub">
        Track weight over time. Useful for spotting trends, vet visits, and diet
        changes.
      </p>

      {loading ? (
        <div className="pce-list-empty">Loading…</div>
      ) : (
        <>
          {items.length === 0 && !addOpen ? (
            <div className="pce-list-empty">
              No weight entries recorded. Add the first entry to start tracking.
            </div>
          ) : (
            <>
              {/* Range filters + unit toggle + trend pill */}
              <div className="pce-weight-range-row">
                {items.length > 1 ? (
                  <div
                    className="pce-weight-range-tabs"
                    role="group"
                    aria-label="Date range"
                  >
                    <button
                      type="button"
                      className={`pce-weight-range-btn ${rangeFilter === "6m" ? "active" : ""}`}
                      onClick={() => setRangeFilter("6m")}
                    >
                      6 mo
                    </button>
                    <button
                      type="button"
                      className={`pce-weight-range-btn ${rangeFilter === "1y" ? "active" : ""}`}
                      onClick={() => setRangeFilter("1y")}
                    >
                      1 yr
                    </button>
                    <button
                      type="button"
                      className={`pce-weight-range-btn ${rangeFilter === "all" ? "active" : ""}`}
                      onClick={() => setRangeFilter("all")}
                    >
                      All time
                    </button>
                  </div>
                ) : (
                  <span />
                )}
                <div className="pce-weight-history-right">
                  <div
                    className="pce-weight-unit-toggle"
                    role="group"
                    aria-label="Weight unit"
                  >
                    <button
                      type="button"
                      className={`pce-weight-unit-btn ${weightUnit === "lbs" ? "active" : ""}`}
                      onClick={() => onUpdate("weight_unit", "lbs")}
                    >
                      lbs
                    </button>
                    <button
                      type="button"
                      className={`pce-weight-unit-btn ${weightUnit === "kg" ? "active" : ""}`}
                      onClick={() => onUpdate("weight_unit", "kg")}
                    >
                      kg
                    </button>
                  </div>
                </div>
              </div>

              {/* Trend summary — one-line sentence above the chart */}
              {trend ? (
                <p className={`pce-weight-trend-summary ${trend.kind}`}>
                  {trend.summary}
                </p>
              ) : null}

              {/* Chart — values converted from canonical lbs to display unit */}
              {filteredItems.length > 1 ? (
                <div className="pce-weight-chart">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart
                      data={filteredItems.map((it) => ({
                        date: it.date,
                        weight: roundForDisplay(
                          convertWeightTo(Number(it.weight_value), weightUnit),
                        ),
                      }))}
                      margin={{ top: 10, right: 10, left: 0, bottom: 12 }}
                    >
                      <CartesianGrid
                        stroke="rgba(23,37,49,0.06)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d) => formatChartDate(d)}
                        tick={{ fill: "#717A86", fontSize: 14 }}
                        stroke="rgba(23,37,49,0.10)"
                        tickMargin={10}
                      />
                      <YAxis
                        tick={{ fill: "#717A86", fontSize: 14 }}
                        stroke="rgba(23,37,49,0.10)"
                        unit={` ${weightUnit}`}
                        width={64}
                        tickMargin={8}
                      />
                      {/* WEIGHT_CHART_TOOLTIP — search for this comment to
                          find the tooltip styling fast.
                          separator=": " strips the default " : " (Recharts
                          ships with spaces around the colon in its own span). */}
                      <Tooltip
                        wrapperClassName="pce-weight-tooltip"
                        separator=": "
                        isAnimationActive={false}
                        cursor={{
                          stroke: "rgba(23,37,49,0.10)",
                          strokeDasharray: "3 3",
                        }}
                        contentStyle={{
                          background: "#fff",
                          border: "1px solid #EDE8E0",
                          borderRadius: 8,
                          fontFamily:
                            "var(--font-urbanist,'Urbanist',sans-serif)",
                          fontSize: 14,
                        }}
                        labelFormatter={(d) => formatChartDate(d)}
                        formatter={(v) => [`${v} ${weightUnit}`, "Weight"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#CF5C36"
                        strokeWidth={2.5}
                        dot={{ fill: "#CF5C36", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : null}

              {/* List — reverse-chronological, recent shown, rest behind glide toggle */}
              {(() => {
                const sorted = items.slice().reverse();
                return (
                  <CollapsibleList
                    items={sorted}
                    limit={5}
                    noun="weigh-ins"
                    renderItem={(item, i, allItems) => {
                      // allItems is reverse-chronological — newest first.
                      // The "previous entry" chronologically is at i+1 (older).
                      const prevItem = allItems[i + 1] || null;
                      return (
                        <WeightItem
                          key={item.id}
                          item={item}
                          previousItem={prevItem}
                          weightUnit={weightUnit}
                          onEdit={() => openEdit(item)}
                        />
                      );
                    }}
                  />
                );
              })()}
            </>
          )}

          {addOpen ? (
            <InlineAddWeights
              confirmUnsaved={confirmUnsaved}
              weightUnit={weightUnit}
              onCancel={closeAdd}
              onSaveAll={handleAddSave}
              onDone={closeAdd}
            />
          ) : (
            <button type="button" className="pce-add-btn" onClick={openAdd}>
              <Plus size={16} strokeWidth={2.4} />
              Add weight entry
            </button>
          )}
        </>
      )}

      {editingItem ? (
        <WeightModal
          item={editingItem}
          confirmUnsaved={confirmUnsaved}
          weightUnit={weightUnit}
          onClose={closeEdit}
          onSave={handleEditSave}
          onDelete={handleDelete}
        />
      ) : null}
    </>
  );
}

function sortByDate(a, b) {
  // Sort ascending by date
  if (!a.date && !b.date) return 0;
  if (!a.date) return 1;
  if (!b.date) return -1;
  return a.date.localeCompare(b.date);
}

function filterByRange(items, range) {
  if (range === "all" || items.length === 0) return items;
  const now = new Date();
  const cutoff = new Date(now);
  if (range === "6m") cutoff.setMonth(cutoff.getMonth() - 6);
  else if (range === "1y") cutoff.setFullYear(cutoff.getFullYear() - 1);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return items.filter((it) => it.date && it.date >= cutoffStr);
}

function computeWeightTrend(items, displayUnit, rangeLabel) {
  if (items.length < 2) return null;
  const sorted = items.slice().sort(sortByDate);
  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];
  if (latest.weight_value == null || previous.weight_value == null) return null;
  // Values stored in lbs; convert to display unit before computing diff
  const latestDisp = convertWeightTo(Number(latest.weight_value), displayUnit);
  const prevDisp = convertWeightTo(Number(previous.weight_value), displayUnit);
  const diff = latestDisp - prevDisp;
  const absDiff = Math.abs(diff).toFixed(1).replace(/\.0$/, "");
  // rangeLabel ends up in sentence: "over last 6 months" / "over last year" / "all-time"
  if (Math.abs(diff) < 0.1) {
    return {
      kind: "stable",
      label: "Stable",
      summary: rangeLabel ? `Stable ${rangeLabel}` : "Stable",
    };
  }
  if (diff > 0) {
    return {
      kind: "up",
      label: `+${absDiff}`,
      summary: rangeLabel
        ? `Up ${absDiff} ${displayUnit} ${rangeLabel}`
        : `Up ${absDiff} ${displayUnit}`,
    };
  }
  return {
    kind: "down",
    label: `-${absDiff}`,
    summary: rangeLabel
      ? `Down ${absDiff} ${displayUnit} ${rangeLabel}`
      : `Down ${absDiff} ${displayUnit}`,
  };
}

function formatChartDate(d) {
  if (!d) return "";
  const date = new Date(d + "T00:00:00");
  if (isNaN(date)) return d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function WeightItem({ item, previousItem, weightUnit, onEdit }) {
  const dateStr = item.date ? formatShortDate(item.date) : null;

  // Compute change from previous entry. Stored values are lbs; convert both
  // to display unit before computing diff so the number shown matches the
  // user's chosen unit.
  let changeDisplay = null;
  if (
    previousItem &&
    item.weight_value != null &&
    previousItem.weight_value != null
  ) {
    const cur = convertWeightTo(Number(item.weight_value), weightUnit);
    const prev = convertWeightTo(Number(previousItem.weight_value), weightUnit);
    const diff = cur - prev;
    const absDiff = Math.abs(diff).toFixed(1).replace(/\.0$/, "");
    if (Math.abs(diff) < 0.1) {
      changeDisplay = {
        kind: "stable",
        icon: null,
        ariaLabel: null,
        text: "No change",
      };
    } else if (diff > 0) {
      changeDisplay = {
        kind: "up",
        icon: ArrowUp,
        ariaLabel: "Up",
        text: `${absDiff} ${weightUnit}`,
      };
    } else {
      changeDisplay = {
        kind: "down",
        icon: ArrowDown,
        ariaLabel: "Down",
        text: `${absDiff} ${weightUnit}`,
      };
    }
  }

  return (
    <div className="pce-list-item">
      <div className="pce-list-item-body">
        <div className="pce-list-item-title-row">
          <span className="pce-list-item-icon-inline">
            <Scale size={18} strokeWidth={2} />
          </span>
          <p className="pce-list-item-title">{dateStr || "Untitled entry"}</p>
        </div>
        <div className="pce-list-item-sep" />
        <div
          className="pce-list-item-meta pce-list-item-meta--weight"
          style={{ "--col-count": changeDisplay ? 2 : 1 }}
        >
          <div className="pce-list-item-meta-row">
            <span className="pce-list-item-meta-label">Weight:</span>
            <span className="pce-list-item-meta-value">
              {item.weight_value != null
                ? `${roundForDisplay(convertWeightTo(Number(item.weight_value), weightUnit))} ${weightUnit}`
                : "—"}
            </span>
          </div>
          {changeDisplay ? (
            <div className="pce-list-item-meta-row">
              <span className="pce-list-item-meta-label">Change:</span>
              <span
                className={`pce-list-item-meta-value pce-weight-change ${changeDisplay.kind}`}
              >
                {changeDisplay.icon ? (
                  <changeDisplay.icon
                    size={16}
                    strokeWidth={2.4}
                    aria-label={changeDisplay.ariaLabel}
                  />
                ) : null}
                {changeDisplay.text}
              </span>
            </div>
          ) : null}
        </div>
        <NotesSection notes={item.notes} />
      </div>
      <div className="pce-list-item-actions">
        <button
          type="button"
          className="pce-icon-btn"
          onClick={onEdit}
          aria-label="Edit weight entry"
        >
          <Pencil size={EDIT_ICON_SIZE} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

const EMPTY_WEIGHT_ENTRY = {
  date: "",
  weight_value: "",
  notes: "",
};

function InlineAddWeights({
  weightUnit,
  onCancel,
  onSaveAll,
  onDone,
  confirmUnsaved,
}) {
  const [entries, setEntries] = useState([
    { ...EMPTY_WEIGHT_ENTRY, date: today() },
  ]);

  function isBatchDirty() {
    if (entries.length !== 1) return true;
    return (
      JSON.stringify(entries[0]) !==
      JSON.stringify({ ...EMPTY_WEIGHT_ENTRY, date: today() })
    );
  }
  async function handleCancel() {
    if (confirmUnsaved && isBatchDirty()) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return;
      if (choice === "save") {
        await handleSubmit();
        return;
      }
    }
    onCancel();
  }
  const [saving, setSaving] = useState(false);

  function updateEntry(idx, key, value) {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [key]: value } : e)),
    );
  }
  function addEntry() {
    setEntries((prev) => [...prev, { ...EMPTY_WEIGHT_ENTRY, date: today() }]);
  }
  function removeEntry(idx) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  function isEntryValid(e) {
    return e.date && e.weight_value !== "" && !isNaN(Number(e.weight_value));
  }

  const canSave = !saving && entries.length > 0 && entries.every(isEntryValid);

  async function handleSubmit() {
    if (!canSave) return;
    setSaving(true);
    let anyFailed = false;
    for (const e of entries) {
      // User typed weight in displayUnit; convert to canonical lbs before save
      const typedNum = Number(e.weight_value);
      const lbsValue =
        weightUnit === "kg"
          ? roundForDisplay(convertWeightFromDisplay(typedNum, "kg"))
          : typedNum;
      const ok = await onSaveAll({
        date: e.date,
        weight_value: lbsValue,
        notes: e.notes.trim() || null,
      });
      if (ok === false) {
        anyFailed = true;
        break;
      }
    }
    setSaving(false);
    if (!anyFailed) onDone();
  }

  const count = entries.length;
  const primaryLabel = `Add ${count} ${count === 1 ? "entry" : "entries"}`;

  return (
    <div className="pce-inline-form">
      <button
        type="button"
        className="pce-form-close"
        aria-label="Close"
        onClick={handleCancel}
      >
        <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
      </button>
      {entries.map((entry, idx) => (
        <div key={idx} className="pce-entry-card">
          <div className="pce-entry-header">
            <span className="pce-entry-label">Weight entry {idx + 1}</span>
            {entries.length > 1 ? (
              <button
                type="button"
                className="pce-icon-btn"
                onClick={() => removeEntry(idx)}
                aria-label={`Remove weight entry ${idx + 1}`}
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            ) : null}
          </div>

          <div className="pce-field-grid two-col">
            <div className="pce-field">
              <label className="pce-label">
                Date{" "}
                <span className="pce-req-mark" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                type="date"
                className="pce-input"
                value={entry.date}
                onChange={(e) => updateEntry(idx, "date", e.target.value)}
                max={today()}
                autoFocus={idx === 0}
              />
            </div>
            <div className="pce-field">
              <label className="pce-label">
                Weight ({weightUnit}){" "}
                <span className="pce-req-mark" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                className="pce-input"
                value={entry.weight_value}
                onChange={(e) =>
                  updateEntry(idx, "weight_value", e.target.value)
                }
                placeholder="e.g. 45"
              />
              {!isEntryValid(entry) ? (
                <p className="pce-field-hint pce-field-warn">
                  Date and weight are both required.
                </p>
              ) : null}
            </div>
          </div>

          <div className="pce-field">
            <label className="pce-label">Notes</label>
            <textarea
              className="pce-textarea"
              value={entry.notes}
              onChange={(e) => updateEntry(idx, "notes", e.target.value)}
              placeholder="e.g. Post-surgery checkup. After new food."
              maxLength={400}
              rows={3}
            />
          </div>
        </div>
      ))}

      <button type="button" className="pce-add-entry" onClick={addEntry}>
        <Plus size={16} strokeWidth={2.4} />
        Add another entry
      </button>

      <div className="pce-inline-form-actions">
        <button
          type="button"
          className="pce-btn-secondary"
          onClick={handleCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="pce-btn-primary"
          onClick={handleSubmit}
          disabled={!canSave}
        >
          {saving ? (
            <>
              <Loader2 size={14} strokeWidth={2.4} className="pce-spin" />
              Saving…
            </>
          ) : (
            primaryLabel
          )}
        </button>
      </div>
    </div>
  );
}

function WeightModal({
  item,
  weightUnit,
  onClose,
  onSave,
  onDelete,
  confirmUnsaved,
}) {
  const initialWeightValue =
    item?.weight_value != null
      ? String(
          roundForDisplay(
            convertWeightTo(Number(item.weight_value), weightUnit),
          ),
        )
      : "";
  const [date, setDate] = useState(item?.date || "");
  // Item.weight_value is canonical lbs; convert to displayUnit for initial value
  const [weightValue, setWeightValue] = useState(initialWeightValue);
  const [notes, setNotes] = useState(item?.notes || "");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  function isDirty() {
    return (
      date !== (item?.date || "") ||
      weightValue !== initialWeightValue ||
      notes !== (item?.notes || "")
    );
  }
  async function handleClose() {
    if (confirmUnsaved && isDirty()) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return;
      if (choice === "save") {
        await handleSave();
        return;
      }
    }
    onClose();
  }

  useEffect(() => {
    // `overflow: hidden` alone does not stop scrolling in iOS Safari. Pinning
    // the body and offsetting it by the current scroll is what works. Previous
    // values are restored rather than cleared, so a modal opening on top of
    // another doesn't release the page when the inner one closes.
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    return () => {
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, []);

  const canSave = !!date && weightValue !== "" && !isNaN(Number(weightValue));

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    // User typed weight in displayUnit; convert to canonical lbs before save
    const typedNum = Number(weightValue);
    const lbsValue =
      weightUnit === "kg"
        ? roundForDisplay(convertWeightFromDisplay(typedNum, "kg"))
        : typedNum;
    const ok = await onSave({
      date,
      weight_value: lbsValue,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (ok) onClose();
  }

  async function handleDeleteClick() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000);
      return;
    }
    setSaving(true);
    const ok = await onDelete();
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <ModalShell onClose={handleClose} title="Edit weight entry">
      <div className="pce-modal-body">
        <div className="pce-field-grid">
          <div className="pce-field">
            <label className="pce-label">
              Date{" "}
              <span className="pce-req-mark" aria-hidden="true">
                *
              </span>
            </label>
            <input
              type="date"
              className="pce-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={today()}
            />
          </div>

          <div className="pce-field">
            <label className="pce-label">
              Weight ({weightUnit}){" "}
              <span className="pce-req-mark" aria-hidden="true">
                *
              </span>
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              className="pce-input"
              value={weightValue}
              onChange={(e) => setWeightValue(e.target.value)}
            />
          </div>
        </div>

        <div className="pce-field">
          <label className="pce-label">Notes</label>
          <textarea
            className="pce-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything noteworthy about this measurement."
            maxLength={500}
            rows={3}
          />
        </div>
      </div>

      <div className="pce-modal-footer">
        <button
          type="button"
          className="pce-btn-danger-text"
          onClick={handleDeleteClick}
          disabled={saving}
        >
          {deleteConfirm ? "Tap again to confirm" : "Delete"}
        </button>
        <button
          type="button"
          className="pce-btn-secondary"
          onClick={handleClose}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="pce-btn-primary"
          onClick={handleSave}
          disabled={saving || !canSave}
        >
          {saving ? (
            <Loader2 size={14} strokeWidth={2.4} className="pce-spin" />
          ) : (
            "Save changes"
          )}
        </button>
      </div>
    </ModalShell>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// =============================================================
// VET AUTOCOMPLETE — reusable for "Given by" field
// =============================================================
// Searches vets table by name/city/address. Lets user pick from
// matches, or type freely if their vet isn't in our system.

function VetAutocomplete({
  value,
  onChange,
  onPick,
  placeholder,
  maxLength = 120,
}) {
  // Loads the vet directory once and offers an autocomplete dropdown.
  // - onChange(text): free-text typing
  // - onPick(vet): user selected a directory vet — full object including slug,
  //   phone, address, carecredit. If onPick is omitted, picking just calls
  //   onChange with the name (legacy behavior).
  const [vets, setVets] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Load vets once on mount. We pull every field we might auto-fill so we
  // don't need a second round trip when the user picks one.
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("vets")
      .select(
        "id, slug, name, phone, address, city, state, zip_code, carecredit, accepting_new_patients",
      )
      .order("name")
      .then(({ data }) => {
        if (!cancelled) setVets(data || []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const search = value || "";
  const filteredVets =
    search.trim().length === 0
      ? []
      : vets
          .filter((v) => {
            const q = search.toLowerCase();
            return (
              v.name?.toLowerCase().includes(q) ||
              v.city?.toLowerCase().includes(q)
            );
          })
          .slice(0, 6);

  function pickVet(vet) {
    // If consumer wants the full vet object (to also fill phone/address/slug),
    // they pass onPick. Otherwise we just set the text.
    if (typeof onPick === "function") {
      onPick(vet);
    } else {
      onChange(vet.name);
    }
    setShowDropdown(false);
  }

  return (
    <div className="pce-vet-autocomplete" ref={dropdownRef}>
      <input
        type="text"
        className="pce-input"
        value={search}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        placeholder={placeholder || "Vet name or clinic"}
        maxLength={maxLength}
        autoComplete="off"
      />
      {showDropdown && filteredVets.length > 0 ? (
        <div className="pce-vet-dropdown">
          {filteredVets.map((vet) => (
            <button
              key={vet.id}
              type="button"
              className="pce-vet-option"
              onClick={() => pickVet(vet)}
            >
              <span className="pce-vet-option-name">
                {vet.name}
                {vet.carecredit ? (
                  <span
                    className="pce-vet-option-badge"
                    title="Accepts CareCredit"
                  >
                    CareCredit
                  </span>
                ) : null}
              </span>
              {vet.city || vet.state ? (
                <span className="pce-vet-option-meta">
                  {[vet.city, vet.state].filter(Boolean).join(", ")}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
      {showDropdown && search.trim().length > 0 && filteredVets.length === 0 ? (
        <div className="pce-vet-dropdown pce-vet-dropdown-empty">
          <p className="pce-vet-empty-msg">
            No match in our system. Continue typing to save as plain text.
          </p>
        </div>
      ) : null}
    </div>
  );
}

// =============================================================
// INLINE ADD VACCINATIONS — replaces the modal for add-mode
// =============================================================
// Lives inside VaccinationsBlock. Expands below "+ Add vaccination" button.
// Multi-entry, same fields and validation as before.

function InlineAddVaccinations({ onCancel, onSave, confirmUnsaved }) {
  const EMPTY_ENTRY = {
    vaccine_type: "",
    date_administered: "",
    next_due: "",
    administered_by: "",
    lot_number: "",
    notes: "",
  };
  const [entries, setEntries] = useState([{ ...EMPTY_ENTRY }]);
  const [saving, setSaving] = useState(false);

  function isBatchDirty() {
    if (entries.length !== 1) return true;
    return JSON.stringify(entries[0]) !== JSON.stringify({ ...EMPTY_ENTRY });
  }
  async function handleCancel() {
    if (confirmUnsaved && isBatchDirty()) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return;
      if (choice === "save") {
        await handleSubmit();
        return;
      }
    }
    onCancel();
  }

  function updateEntry(idx, field, value) {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)),
    );
  }
  function addEntry() {
    setEntries((prev) => [...prev, { ...EMPTY_ENTRY }]);
  }
  function removeEntry(idx) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  const canSave =
    !saving &&
    entries.length > 0 &&
    entries.every((e) => e.vaccine_type.trim().length > 0);

  async function handleSubmit() {
    if (!canSave) return;
    setSaving(true);
    let anyFailed = false;
    for (const e of entries) {
      const ok = await onSave({
        vaccine_type: e.vaccine_type.trim(),
        date_administered: e.date_administered || null,
        next_due: e.next_due || null,
        administered_by: e.administered_by.trim() || null,
        lot_number: e.lot_number.trim() || null,
        notes: e.notes.trim() || null,
      });
      if (!ok) {
        anyFailed = true;
        break;
      }
    }
    setSaving(false);
    if (!anyFailed) onCancel(); // close the inline form on success
  }

  const count = entries.length;
  const primaryLabel = `Add ${count} ${count === 1 ? "vaccination" : "vaccinations"}`;

  return (
    <div className="pce-inline-form">
      <button
        type="button"
        className="pce-form-close"
        aria-label="Close"
        onClick={handleCancel}
      >
        <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
      </button>
      {entries.map((entry, idx) => (
        <div key={idx} className="pce-entry-card">
          <div className="pce-entry-header">
            <span className="pce-entry-label">Vaccination {idx + 1}</span>
            {entries.length > 1 ? (
              <button
                type="button"
                className="pce-icon-btn"
                onClick={() => removeEntry(idx)}
                aria-label={`Remove vaccination ${idx + 1}`}
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            ) : null}
          </div>

          <div className="pce-field-grid">
            <div className="pce-field">
              <label className="pce-label">
                Vaccine type{" "}
                <span className="pce-req-mark" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                type="text"
                className="pce-input"
                value={entry.vaccine_type}
                onChange={(e) =>
                  updateEntry(idx, "vaccine_type", e.target.value)
                }
                placeholder="e.g. Rabies, DHPP, Bordetella"
                maxLength={80}
                autoFocus={idx === 0}
              />
              {entry.vaccine_type.trim() === "" ? (
                <p className="pce-field-hint pce-field-warn">
                  Vaccine type is required.
                </p>
              ) : null}
            </div>
          </div>

          <div className="pce-field-grid two-col">
            <div className="pce-field">
              <label className="pce-label">Given</label>
              <input
                type="date"
                className="pce-input"
                value={entry.date_administered}
                onChange={(e) =>
                  updateEntry(idx, "date_administered", e.target.value)
                }
              />
            </div>
            <div className="pce-field">
              <label className="pce-label">Next due</label>
              <input
                type="date"
                className="pce-input"
                value={entry.next_due}
                onChange={(e) => updateEntry(idx, "next_due", e.target.value)}
              />
            </div>
            <div className="pce-field">
              <label className="pce-label">Given by</label>
              <VetAutocomplete
                value={entry.administered_by}
                onChange={(v) => updateEntry(idx, "administered_by", v)}
                placeholder="Search vets or type freely"
              />
            </div>
            <div className="pce-field">
              <label className="pce-label">Lot number</label>
              <input
                type="text"
                className="pce-input"
                value={entry.lot_number}
                onChange={(e) => updateEntry(idx, "lot_number", e.target.value)}
                placeholder="Optional"
                maxLength={40}
              />
              <p className="pce-field-hint">
                From the vaccine certificate, if you have it.
              </p>
            </div>
          </div>

          <div className="pce-field">
            <label className="pce-label">Notes</label>
            <textarea
              className="pce-textarea"
              value={entry.notes}
              onChange={(e) => updateEntry(idx, "notes", e.target.value)}
              placeholder="Reactions, batch info, anything else worth remembering."
              maxLength={400}
              rows={3}
            />
          </div>
        </div>
      ))}

      <button type="button" className="pce-add-entry" onClick={addEntry}>
        <Plus size={16} strokeWidth={2.4} />
        Add another vaccination
      </button>

      <div className="pce-inline-form-actions">
        <button
          type="button"
          className="pce-btn-secondary"
          onClick={handleCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="pce-btn-primary"
          onClick={handleSubmit}
          disabled={!canSave}
        >
          {saving ? (
            <>
              <Loader2 size={14} strokeWidth={2.4} className="pce-spin" />
              Saving…
            </>
          ) : (
            primaryLabel
          )}
        </button>
      </div>
    </div>
  );
}

// =============================================================
// INLINE ADD MEDICATIONS — replaces the modal for add-mode
// =============================================================

function InlineAddMedications({ onCancel, onSave, confirmUnsaved }) {
  const EMPTY_ENTRY = {
    medication_name: "",
    dosage: "",
    frequency: "",
    started_date: "",
    ended_date: "",
    reason: "",
    notes: "",
  };
  const [entries, setEntries] = useState([{ ...EMPTY_ENTRY }]);
  const [saving, setSaving] = useState(false);

  function isBatchDirty() {
    if (entries.length !== 1) return true;
    return JSON.stringify(entries[0]) !== JSON.stringify({ ...EMPTY_ENTRY });
  }
  async function handleCancel() {
    if (confirmUnsaved && isBatchDirty()) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return;
      if (choice === "save") {
        await handleSubmit();
        return;
      }
    }
    onCancel();
  }

  function updateEntry(idx, field, value) {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)),
    );
  }
  function addEntry() {
    setEntries((prev) => [...prev, { ...EMPTY_ENTRY }]);
  }
  function removeEntry(idx) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  const canSave =
    !saving &&
    entries.length > 0 &&
    entries.every((e) => e.medication_name.trim().length > 0);

  async function handleSubmit() {
    if (!canSave) return;
    setSaving(true);
    let anyFailed = false;
    for (const e of entries) {
      const ok = await onSave({
        medication_name: e.medication_name.trim(),
        dosage: e.dosage.trim() || null,
        frequency: e.frequency.trim() || null,
        started_date: e.started_date || null,
        ended_date: e.ended_date || null,
        reason: e.reason.trim() || null,
        notes: e.notes.trim() || null,
      });
      if (!ok) {
        anyFailed = true;
        break;
      }
    }
    setSaving(false);
    if (!anyFailed) onCancel();
  }

  const count = entries.length;
  const primaryLabel = `Add ${count} ${count === 1 ? "medication" : "medications"}`;

  return (
    <div className="pce-inline-form">
      <button
        type="button"
        className="pce-form-close"
        aria-label="Close"
        onClick={handleCancel}
      >
        <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
      </button>
      {entries.map((entry, idx) => (
        <div key={idx} className="pce-entry-card">
          <div className="pce-entry-header">
            <span className="pce-entry-label">Medication {idx + 1}</span>
            {entries.length > 1 ? (
              <button
                type="button"
                className="pce-icon-btn"
                onClick={() => removeEntry(idx)}
                aria-label={`Remove medication ${idx + 1}`}
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            ) : null}
          </div>

          <div className="pce-field-grid">
            <div className="pce-field">
              <label className="pce-label">
                Medication name{" "}
                <span className="pce-req-mark" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                type="text"
                className="pce-input"
                value={entry.medication_name}
                onChange={(e) =>
                  updateEntry(idx, "medication_name", e.target.value)
                }
                placeholder="e.g. Apoquel, Carprofen"
                maxLength={80}
                autoFocus={idx === 0}
              />
              {entry.medication_name.trim() === "" ? (
                <p className="pce-field-hint pce-field-warn">
                  Medication name is required.
                </p>
              ) : null}
            </div>
          </div>

          <div className="pce-field-grid two-col">
            <div className="pce-field">
              <label className="pce-label">Dosage</label>
              <input
                type="text"
                className="pce-input"
                value={entry.dosage}
                onChange={(e) => updateEntry(idx, "dosage", e.target.value)}
                placeholder="e.g. 5mg twice daily"
                maxLength={80}
              />
            </div>
            <div className="pce-field">
              <label className="pce-label">Frequency</label>
              <input
                type="text"
                className="pce-input"
                value={entry.frequency}
                onChange={(e) => updateEntry(idx, "frequency", e.target.value)}
                placeholder="e.g. Morning + evening"
                maxLength={80}
              />
            </div>
            <div className="pce-field">
              <label className="pce-label">Started</label>
              <input
                type="date"
                className="pce-input"
                value={entry.started_date}
                onChange={(e) =>
                  updateEntry(idx, "started_date", e.target.value)
                }
              />
            </div>
            <div className="pce-field">
              <label className="pce-label">Ended (if applicable)</label>
              <input
                type="date"
                className="pce-input"
                value={entry.ended_date}
                onChange={(e) => updateEntry(idx, "ended_date", e.target.value)}
              />
              <p className="pce-field-hint">Leave blank if still taking.</p>
            </div>
          </div>

          <div className="pce-field">
            <label className="pce-label">Reason / condition</label>
            <input
              type="text"
              className="pce-input"
              value={entry.reason}
              onChange={(e) => updateEntry(idx, "reason", e.target.value)}
              placeholder="e.g. Allergies, joint pain"
              maxLength={120}
            />
          </div>

          <div className="pce-field">
            <label className="pce-label">Notes</label>
            <textarea
              className="pce-textarea"
              value={entry.notes}
              onChange={(e) => updateEntry(idx, "notes", e.target.value)}
              placeholder="Side effects, instructions, anything else."
              maxLength={400}
              rows={3}
            />
          </div>
        </div>
      ))}

      <button type="button" className="pce-add-entry" onClick={addEntry}>
        <Plus size={16} strokeWidth={2.4} />
        Add another medication
      </button>

      <div className="pce-inline-form-actions">
        <button
          type="button"
          className="pce-btn-secondary"
          onClick={handleCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="pce-btn-primary"
          onClick={handleSubmit}
          disabled={!canSave}
        >
          {saving ? (
            <>
              <Loader2 size={14} strokeWidth={2.4} className="pce-spin" />
              Saving…
            </>
          ) : (
            primaryLabel
          )}
        </button>
      </div>
    </div>
  );
}

// =============================================================
// VACCINATIONS BLOCK — list + modal CRUD
// =============================================================

function VaccinationsBlock({
  pet,
  setSaveStatus,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
}) {
  const FORM_ID = "vaccinations-add";
  const addOpen = openFormId === FORM_ID;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  // Modal is only for editing an existing record.
  const [editingItem, setEditingItem] = useState(null);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await getPetVaccinations(pet.id);
      if (cancelled) return;
      if (!error && data) setItems(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pet.id]);

  function openAdd() {
    setOpenFormId(FORM_ID);
  }
  function closeAdd() {
    setOpenFormId(null);
  }
  function openEdit(item) {
    setOpenFormId(null); // close any open inline form first
    setEditingItem(item);
  }
  function closeEdit() {
    setEditingItem(null);
  }

  async function handleAddSave(fields) {
    setSaveStatus("saving");
    const { data, error } = await addVaccination(pet.id, fields);
    if (error) {
      setSaveStatus("error");
      return false;
    }
    setItems((prev) => [data, ...prev]);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  }

  async function handleEditSave(fields) {
    setSaveStatus("saving");
    const { data, error } = await updateVaccination(editingItem.id, fields);
    if (error) {
      setSaveStatus("error");
      return false;
    }
    setItems((prev) => prev.map((v) => (v.id === editingItem.id ? data : v)));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  }

  async function handleDelete() {
    if (!editingItem) return false;
    setSaveStatus("saving");
    const { error } = await deleteVaccination(editingItem.id);
    if (error) {
      setSaveStatus("error");
      return false;
    }
    setItems((prev) => prev.filter((v) => v.id !== editingItem.id));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  }

  return (
    <>
      <h3 className="pce-sub-title">Vaccinations</h3>
      <p className="pce-sub-sub">
        Track types, dates given, and when each is next due.
      </p>

      {loading ? (
        <div className="pce-list-empty">Loading…</div>
      ) : items.length === 0 ? (
        <div className="pce-list-empty">
          No vaccinations recorded. Add one to start tracking.
        </div>
      ) : (
        <CollapsibleList
          items={items}
          limit={5}
          noun="vaccinations"
          renderItem={(v) => (
            <VaccinationItem key={v.id} item={v} onEdit={() => openEdit(v)} />
          )}
        />
      )}

      {!addOpen ? (
        <button type="button" className="pce-add-btn" onClick={openAdd}>
          <Plus size={16} strokeWidth={2.4} />
          Add vaccination
        </button>
      ) : (
        <InlineAddVaccinations
          onCancel={closeAdd}
          onSave={handleAddSave}
          confirmUnsaved={confirmUnsaved}
        />
      )}

      {editingItem ? (
        <VaccinationModal
          item={editingItem}
          confirmUnsaved={confirmUnsaved}
          onClose={closeEdit}
          onSave={handleEditSave}
          onDelete={handleDelete}
        />
      ) : null}
    </>
  );
}

// Single vaccination row
// =============================================================
// NOTES SECTION — used in VaccinationItem + MedicationItem list rows
// =============================================================
// Renders pet notes with truncate + expand behavior:
// - Empty/null notes: renders nothing
// - Short notes (<=120 chars): full text, no toggle
// - Long notes (>120 chars): truncated preview + 'Read more' toggle
// - Smooth max-height transition on expand/collapse
function NotesSection({ notes }) {
  const trimmed = (notes || "").trim();
  // Two coordinated states:
  //   `expanded` — user-visible intent. Drives max-height target.
  //   `cssClamped` — actual CSS class application. Lags state changes:
  //     - On EXPAND: removed BEFORE height animates up (so content reflows
  //                  to natural height before animation).
  //     - On COLLAPSE: applied AFTER height animation finishes (via
  //                    onTransitionEnd), so text clamps once box has shrunk
  //                    to its final size. Prevents the "instant clamp + then
  //                    animate empty space" jerk.
  const [expanded, setExpanded] = useState(false);
  const [cssClamped, setCssClamped] = useState(true);

  const textRef = useRef(null);
  const [isLong, setIsLong] = useState(false);
  const [clampedHeight, setClampedHeight] = useState(0);
  const [fullHeight, setFullHeight] = useState(0);

  // Measure both heights on mount and whenever text changes. We toggle the
  // clamp class directly on the DOM (not via React state) to avoid extra
  // renders, then restore the original class.
  //
  // Long-content detection uses TWO gates:
  //   1. Char length > 150 — short text never triggers Read more even if
  //      sub-pixel rendering makes fh > ch.
  //   2. Pixel tolerance of +4 — covers measurement drift between
  //      `display: -webkit-box` (clamped) and `display: block` (unclamped).
  // We also re-measure once fonts finish loading, since Urbanist may not be
  // ready on initial paint and font swaps change measured dimensions.
  useEffect(() => {
    if (!textRef.current) return;
    const el = textRef.current;

    function measure() {
      if (!textRef.current) return;
      // Measure the natural (unclamped) full height.
      const wasClamped = el.classList.contains("pce-notes-clamped");
      el.classList.remove("pce-notes-clamped");
      // Force reflow so scrollHeight reflects the unclamped layout.
      void el.offsetHeight;
      const fh = el.scrollHeight;
      // Compute the height of exactly 2 lines from the resolved line-height,
      // rather than toggling the clamp class (which gives unreliable reads).
      const cs = window.getComputedStyle(el);
      let lh = parseFloat(cs.lineHeight);
      if (Number.isNaN(lh)) lh = parseFloat(cs.fontSize) * 1.4;
      const twoLine = lh * 2;
      if (wasClamped) el.classList.add("pce-notes-clamped");
      setClampedHeight(Math.round(twoLine));
      setFullHeight(fh);
      // Only offer Read more when the text genuinely exceeds 2 lines.
      setIsLong(fh > twoLine + 2);
    }

    measure();

    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(() => requestAnimationFrame(measure));
    }
    if (
      typeof document !== "undefined" &&
      document.fonts &&
      document.fonts.ready
    ) {
      document.fonts.ready.then(measure).catch(() => {});
    }
    // Re-measure on resize: a wider container may fit the text in ≤2 lines,
    // in which case "Read more" should disappear (and vice-versa).
    if (typeof window !== "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
  }, [trimmed]);

  // Coordinate CSS class with expanded state:
  // - Expanding: remove clamp immediately so height has full content to animate into
  // - Collapsing: keep clamp removed during animation; apply after via onTransitionEnd
  useEffect(() => {
    if (expanded) {
      setCssClamped(false);
    }
    // For collapse, cssClamped stays false until onTransitionEnd fires.
  }, [expanded]);

  function handleTransitionEnd(e) {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== "max-height") return;
    // On collapse completion: apply clamp class so ellipsis appears
    if (!expanded) {
      setCssClamped(true);
    }
  }

  if (trimmed.length === 0) return null;

  // Target height depends on expanded state, not class state. The transition
  // runs from current to target over 0.3s. Falls back to "none" before mount.
  const targetHeight = expanded ? fullHeight : clampedHeight;
  const maxHeightStyle = targetHeight ? `${targetHeight}px` : "none";

  return (
    <div className="pce-notes">
      <p className="pce-notes-label">Notes:</p>
      <div
        className="pce-notes-content"
        style={{ maxHeight: maxHeightStyle }}
        onTransitionEnd={handleTransitionEnd}
      >
        <p
          ref={textRef}
          className={`pce-notes-text ${cssClamped ? "pce-notes-clamped" : ""}`}
        >
          {trimmed}
        </p>
      </div>
      {isLong ? (
        <button
          type="button"
          className="pce-notes-toggle"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}

function VaccinationItem({ item, onEdit }) {
  const status = getVaccinationStatus(item.next_due);
  const adminDate = item.date_administered
    ? formatShortDate(item.date_administered)
    : null;
  const nextDate = item.next_due ? formatShortDate(item.next_due) : null;

  // Layout: title → status pill → separator → label:value meta rows.
  // Status sits under title for immediate awareness. Separator below status
  // visually splits "what this is" from "the details". Meta uses Profile's
  // label:value pattern (muted label + bold value) for consistency.
  const metaRows = [];
  if (nextDate) metaRows.push({ label: "Next due", value: nextDate });
  if (adminDate) metaRows.push({ label: "Given", value: adminDate });
  if (item.administered_by)
    metaRows.push({ label: "Given by", value: item.administered_by });

  return (
    <div className="pce-list-item">
      <div className="pce-list-item-body">
        <div className="pce-list-item-title-row">
          <span className="pce-list-item-icon-inline">
            <Syringe size={18} strokeWidth={2} />
          </span>
          <p className="pce-list-item-title">
            {item.vaccine_type || "Untitled vaccination"}
          </p>
          {status ? (
            <span className={`pce-list-item-status ${status.kind}`}>
              {status.label}
            </span>
          ) : null}
        </div>
        {metaRows.length > 0 ? (
          <>
            <div className="pce-list-item-sep" />
            <div
              className="pce-list-item-meta pce-list-item-meta--vaccinations"
              style={{ "--col-count": metaRows.length }}
            >
              {metaRows.map((row, i) => (
                <div key={i} className="pce-list-item-meta-row">
                  <span className="pce-list-item-meta-label">{row.label}:</span>
                  <span className="pce-list-item-meta-value">{row.value}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}
        <NotesSection notes={item.notes} />
      </div>
      <div className="pce-list-item-actions">
        <button
          type="button"
          className="pce-icon-btn"
          onClick={onEdit}
          aria-label="Edit vaccination"
        >
          <Pencil size={EDIT_ICON_SIZE} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

// Modal: add/edit vaccination
// - Edit mode (item exists): single entry, includes Delete button
// - Add mode (no item): multi-entry — start with 1, "+ Add another" appends more,
//   per-entry X removes (hidden when only 1 remains)
function VaccinationModal({ item, onClose, onSave, onDelete, confirmUnsaved }) {
  const isEdit = !!item;

  // EDIT MODE state (single record)
  const [vaccineType, setVaccineType] = useState(item?.vaccine_type || "");
  const [dateAdministered, setDateAdministered] = useState(
    item?.date_administered || "",
  );
  const [nextDue, setNextDue] = useState(item?.next_due || "");
  const [administeredBy, setAdministeredBy] = useState(
    item?.administered_by || "",
  );
  const [lotNumber, setLotNumber] = useState(item?.lot_number || "");
  const [notes, setNotes] = useState(item?.notes || "");

  function isDirty() {
    return (
      vaccineType !== (item?.vaccine_type || "") ||
      dateAdministered !== (item?.date_administered || "") ||
      nextDue !== (item?.next_due || "") ||
      administeredBy !== (item?.administered_by || "") ||
      lotNumber !== (item?.lot_number || "") ||
      notes !== (item?.notes || "")
    );
  }
  async function handleClose() {
    if (confirmUnsaved && isDirty()) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return;
      if (choice === "save") {
        await handleSubmit();
        return;
      }
    }
    onClose();
  }

  // ADD MODE state (array of entries)
  const EMPTY_VACC_ENTRY = {
    vaccine_type: "",
    date_administered: "",
    next_due: "",
    administered_by: "",
    lot_number: "",
    notes: "",
  };
  const [entries, setEntries] = useState([{ ...EMPTY_VACC_ENTRY }]);

  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function updateEntry(idx, field, value) {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)),
    );
  }
  function addEntry() {
    setEntries((prev) => [...prev, { ...EMPTY_VACC_ENTRY }]);
  }
  function removeEntry(idx) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  // Validation
  const editCanSave = vaccineType.trim().length > 0;
  const addCanSave =
    entries.length > 0 &&
    entries.every((e) => e.vaccine_type.trim().length > 0);
  const canSave = (isEdit ? editCanSave : addCanSave) && !saving;

  async function handleSubmit() {
    if (!canSave) return;
    setSaving(true);

    if (isEdit) {
      // EDIT — single record
      const ok = await onSave({
        vaccine_type: vaccineType.trim(),
        date_administered: dateAdministered || null,
        next_due: nextDue || null,
        administered_by: administeredBy.trim() || null,
        lot_number: lotNumber.trim() || null,
        notes: notes.trim() || null,
      });
      setSaving(false);
      if (ok) onClose();
      return;
    }

    // ADD — loop through entries
    let anyFailed = false;
    for (const e of entries) {
      const ok = await onSave({
        vaccine_type: e.vaccine_type.trim(),
        date_administered: e.date_administered || null,
        next_due: e.next_due || null,
        administered_by: e.administered_by.trim() || null,
        lot_number: e.lot_number.trim() || null,
        notes: e.notes.trim() || null,
      });
      if (!ok) {
        anyFailed = true;
        break;
      }
    }
    setSaving(false);
    if (!anyFailed) onClose();
  }

  async function handleDeleteClick() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setSaving(true);
    const ok = await onDelete();
    setSaving(false);
    if (ok) onClose();
  }

  // EDIT mode: render the original single-entry form
  if (isEdit) {
    return (
      <ModalShell title="Edit vaccination" onClose={handleClose}>
        <div className="pce-modal-body">
          <div className="pce-field-grid">
            <div className="pce-field">
              <label className="pce-label">
                Vaccine type{" "}
                <span className="pce-req-mark" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                type="text"
                className="pce-input"
                value={vaccineType}
                onChange={(e) => setVaccineType(e.target.value)}
                placeholder="e.g. Rabies, DHPP, Bordetella"
                maxLength={80}
                autoFocus
              />
              {vaccineType.trim() === "" ? (
                <p className="pce-field-hint pce-field-warn">
                  Vaccine type is required.
                </p>
              ) : null}
            </div>
          </div>

          <div className="pce-field-grid two-col">
            <div className="pce-field">
              <label className="pce-label">Given</label>
              <input
                type="date"
                className="pce-input"
                value={dateAdministered}
                onChange={(e) => setDateAdministered(e.target.value)}
              />
            </div>
            <div className="pce-field">
              <label className="pce-label">Next due</label>
              <input
                type="date"
                className="pce-input"
                value={nextDue}
                onChange={(e) => setNextDue(e.target.value)}
              />
            </div>
            <div className="pce-field">
              <label className="pce-label">Given by</label>
              <VetAutocomplete
                value={administeredBy}
                onChange={setAdministeredBy}
                placeholder="Search vets or type freely"
              />
            </div>
            <div className="pce-field">
              <label className="pce-label">Lot number</label>
              <input
                type="text"
                className="pce-input"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="Optional"
                maxLength={40}
              />
              <p className="pce-field-hint">
                From the vaccine certificate, if you have it.
              </p>
            </div>
          </div>

          <div className="pce-field">
            <label className="pce-label">Notes</label>
            <textarea
              className="pce-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reactions, batch info, anything else worth remembering."
              maxLength={400}
              rows={3}
            />
          </div>
        </div>

        <div className="pce-modal-footer">
          <button
            type="button"
            className="pce-btn-danger-text"
            onClick={handleDeleteClick}
            disabled={saving}
          >
            {confirmingDelete ? "Tap again to confirm" : "Delete"}
          </button>
          <button
            type="button"
            className="pce-btn-secondary"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="pce-btn-primary"
            onClick={handleSubmit}
            disabled={!canSave}
          >
            {saving ? (
              <>
                <Loader2 size={14} strokeWidth={2.4} className="pce-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </ModalShell>
    );
  }

  // ADD mode: multi-entry
  const count = entries.length;
  const primaryLabel = `Add ${count} ${count === 1 ? "vaccination" : "vaccinations"}`;

  return (
    <ModalShell title="Add vaccinations" onClose={handleClose}>
      <div className="pce-modal-body">
        {entries.map((entry, idx) => (
          <div key={idx} className="pce-entry-card">
            <div className="pce-entry-header">
              <span className="pce-entry-label">Vaccination {idx + 1}</span>
              {entries.length > 1 ? (
                <button
                  type="button"
                  className="pce-icon-btn"
                  onClick={() => removeEntry(idx)}
                  aria-label={`Remove vaccination ${idx + 1}`}
                >
                  <X size={16} strokeWidth={2.2} />
                </button>
              ) : null}
            </div>

            <div className="pce-field-grid">
              <div className="pce-field">
                <label className="pce-label">
                  Vaccine type{" "}
                  <span className="pce-req-mark" aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  type="text"
                  className="pce-input"
                  value={entry.vaccine_type}
                  onChange={(e) =>
                    updateEntry(idx, "vaccine_type", e.target.value)
                  }
                  placeholder="e.g. Rabies, DHPP, Bordetella"
                  maxLength={80}
                  autoFocus={idx === 0}
                />
                {entry.vaccine_type.trim() === "" ? (
                  <p className="pce-field-hint pce-field-warn">
                    Vaccine type is required.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="pce-field-grid two-col">
              <div className="pce-field">
                <label className="pce-label">Given</label>
                <input
                  type="date"
                  className="pce-input"
                  value={entry.date_administered}
                  onChange={(e) =>
                    updateEntry(idx, "date_administered", e.target.value)
                  }
                />
              </div>
              <div className="pce-field">
                <label className="pce-label">Next due</label>
                <input
                  type="date"
                  className="pce-input"
                  value={entry.next_due}
                  onChange={(e) => updateEntry(idx, "next_due", e.target.value)}
                />
              </div>
              <div className="pce-field">
                <label className="pce-label">Given by</label>
                <VetAutocomplete
                  value={entry.administered_by}
                  onChange={(v) => updateEntry(idx, "administered_by", v)}
                  placeholder="Search vets or type freely"
                />
              </div>
              <div className="pce-field">
                <label className="pce-label">Lot number</label>
                <input
                  type="text"
                  className="pce-input"
                  value={entry.lot_number}
                  onChange={(e) =>
                    updateEntry(idx, "lot_number", e.target.value)
                  }
                  placeholder="Optional"
                  maxLength={40}
                />
                <p className="pce-field-hint">
                  From the vaccine certificate, if you have it.
                </p>
              </div>
            </div>

            <div className="pce-field">
              <label className="pce-label">Notes</label>
              <textarea
                className="pce-textarea"
                value={entry.notes}
                onChange={(e) => updateEntry(idx, "notes", e.target.value)}
                placeholder="Reactions, batch info, anything else worth remembering."
                maxLength={400}
                rows={3}
              />
            </div>
          </div>
        ))}

        <button type="button" className="pce-add-entry" onClick={addEntry}>
          <Plus size={16} strokeWidth={2.4} />
          Add another vaccination
        </button>
      </div>

      <div className="pce-modal-footer">
        <button
          type="button"
          className="pce-btn-secondary"
          onClick={handleClose}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="pce-btn-primary"
          onClick={handleSubmit}
          disabled={!canSave}
        >
          {saving ? (
            <>
              <Loader2 size={14} strokeWidth={2.4} className="pce-spin" />
              Saving…
            </>
          ) : (
            primaryLabel
          )}
        </button>
      </div>
    </ModalShell>
  );
}

// =============================================================
// MEDICATIONS BLOCK — list + modal CRUD
// =============================================================

function MedicationsBlock({
  pet,
  setSaveStatus,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
}) {
  const FORM_ID = "medications-add";
  const addOpen = openFormId === FORM_ID;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await getPetMedications(pet.id);
      if (cancelled) return;
      if (!error && data) setItems(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pet.id]);

  function openAdd() {
    setOpenFormId(FORM_ID);
  }
  function closeAdd() {
    setOpenFormId(null);
  }
  function openEdit(item) {
    setOpenFormId(null); // close any open inline form first
    setEditingItem(item);
  }
  function closeEdit() {
    setEditingItem(null);
  }

  async function handleAddSave(fields) {
    setSaveStatus("saving");
    const { data, error } = await addMedication(pet.id, fields);
    if (error) {
      setSaveStatus("error");
      return false;
    }
    setItems((prev) => [data, ...prev]);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  }

  async function handleEditSave(fields) {
    setSaveStatus("saving");
    const { data, error } = await updateMedication(editingItem.id, fields);
    if (error) {
      setSaveStatus("error");
      return false;
    }
    setItems((prev) => prev.map((m) => (m.id === editingItem.id ? data : m)));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  }

  async function handleDelete() {
    if (!editingItem) return false;
    setSaveStatus("saving");
    const { error } = await deleteMedication(editingItem.id);
    if (error) {
      setSaveStatus("error");
      return false;
    }
    setItems((prev) => prev.filter((m) => m.id !== editingItem.id));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  }

  return (
    <>
      <h3 className="pce-sub-title">Medications</h3>
      <p className="pce-sub-sub">
        Current and past prescriptions. Mark ended to stop showing on the active
        list.
      </p>

      {loading ? (
        <div className="pce-list-empty">Loading…</div>
      ) : items.length === 0 ? (
        <div className="pce-list-empty">No medications recorded.</div>
      ) : (
        <CollapsibleList
          items={items}
          limit={5}
          noun="medications"
          renderItem={(m) => (
            <MedicationItem key={m.id} item={m} onEdit={() => openEdit(m)} />
          )}
        />
      )}

      {!addOpen ? (
        <button type="button" className="pce-add-btn" onClick={openAdd}>
          <Plus size={16} strokeWidth={2.4} />
          Add medication
        </button>
      ) : (
        <InlineAddMedications
          onCancel={closeAdd}
          onSave={handleAddSave}
          confirmUnsaved={confirmUnsaved}
        />
      )}

      {editingItem ? (
        <MedicationModal
          item={editingItem}
          confirmUnsaved={confirmUnsaved}
          onClose={closeEdit}
          onSave={handleEditSave}
          onDelete={handleDelete}
        />
      ) : null}
    </>
  );
}

function MedicationItem({ item, onEdit }) {
  const startedStr = item.started_date
    ? formatShortDate(item.started_date)
    : null;
  const endedStr = item.ended_date ? formatShortDate(item.ended_date) : null;
  const isActive = !item.ended_date;

  // Same layout as VaccinationItem. Each field gets its own label:value row.
  // Dosage and Frequency split into separate rows for consistency.
  const metaRows = [];
  if (item.dosage) metaRows.push({ label: "Dosage", value: item.dosage });
  if (item.frequency)
    metaRows.push({ label: "Frequency", value: item.frequency });
  if (startedStr) metaRows.push({ label: "Started", value: startedStr });
  if (endedStr) metaRows.push({ label: "Ended", value: endedStr });

  return (
    <div className="pce-list-item">
      <div className="pce-list-item-body">
        <div className="pce-list-item-title-row">
          <span className="pce-list-item-icon-inline">
            <Pill size={18} strokeWidth={2} />
          </span>
          <p className="pce-list-item-title">
            {item.medication_name || "Untitled medication"}
          </p>
          <span
            className={`pce-list-item-status ${isActive ? "active" : "ended"}`}
          >
            {isActive ? "Active" : "Ended"}
          </span>
        </div>
        {metaRows.length > 0 ? (
          <>
            <div className="pce-list-item-sep" />
            <div
              className="pce-list-item-meta pce-list-item-meta--medications"
              style={{ "--col-count": metaRows.length }}
            >
              {metaRows.map((row, i) => (
                <div key={i} className="pce-list-item-meta-row">
                  <span className="pce-list-item-meta-label">{row.label}:</span>
                  <span className="pce-list-item-meta-value">{row.value}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}
        <NotesSection notes={item.notes} />
      </div>
      <div className="pce-list-item-actions">
        <button
          type="button"
          className="pce-icon-btn"
          onClick={onEdit}
          aria-label="Edit medication"
        >
          <Pencil size={EDIT_ICON_SIZE} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function MedicationModal({ item, onClose, onSave, onDelete, confirmUnsaved }) {
  const isEdit = !!item;

  // EDIT MODE state
  const [name, setName] = useState(item?.medication_name || "");
  const [dosage, setDosage] = useState(item?.dosage || "");
  const [frequency, setFrequency] = useState(item?.frequency || "");
  const [startedDate, setStartedDate] = useState(item?.started_date || "");
  const [endedDate, setEndedDate] = useState(item?.ended_date || "");
  const [reason, setReason] = useState(item?.reason || "");
  const [notes, setNotes] = useState(item?.notes || "");

  function isDirty() {
    return (
      name !== (item?.medication_name || "") ||
      dosage !== (item?.dosage || "") ||
      frequency !== (item?.frequency || "") ||
      startedDate !== (item?.started_date || "") ||
      endedDate !== (item?.ended_date || "") ||
      reason !== (item?.reason || "") ||
      notes !== (item?.notes || "")
    );
  }
  async function handleClose() {
    if (confirmUnsaved && isDirty()) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return;
      if (choice === "save") {
        await handleSubmit();
        return;
      }
    }
    onClose();
  }

  // ADD MODE state
  const EMPTY_MED_ENTRY = {
    medication_name: "",
    dosage: "",
    frequency: "",
    started_date: "",
    ended_date: "",
    reason: "",
    notes: "",
  };
  const [entries, setEntries] = useState([{ ...EMPTY_MED_ENTRY }]);

  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function updateEntry(idx, field, value) {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)),
    );
  }
  function addEntry() {
    setEntries((prev) => [...prev, { ...EMPTY_MED_ENTRY }]);
  }
  function removeEntry(idx) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  const editCanSave = name.trim().length > 0;
  const addCanSave =
    entries.length > 0 &&
    entries.every((e) => e.medication_name.trim().length > 0);
  const canSave = (isEdit ? editCanSave : addCanSave) && !saving;

  async function handleSubmit() {
    if (!canSave) return;
    setSaving(true);

    if (isEdit) {
      const ok = await onSave({
        medication_name: name.trim(),
        dosage: dosage.trim() || null,
        frequency: frequency.trim() || null,
        started_date: startedDate || null,
        ended_date: endedDate || null,
        reason: reason.trim() || null,
        notes: notes.trim() || null,
      });
      setSaving(false);
      if (ok) onClose();
      return;
    }

    // ADD mode: loop entries
    let anyFailed = false;
    for (const e of entries) {
      const ok = await onSave({
        medication_name: e.medication_name.trim(),
        dosage: e.dosage.trim() || null,
        frequency: e.frequency.trim() || null,
        started_date: e.started_date || null,
        ended_date: e.ended_date || null,
        reason: e.reason.trim() || null,
        notes: e.notes.trim() || null,
      });
      if (!ok) {
        anyFailed = true;
        break;
      }
    }
    setSaving(false);
    if (!anyFailed) onClose();
  }

  async function handleDeleteClick() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setSaving(true);
    const ok = await onDelete();
    setSaving(false);
    if (ok) onClose();
  }

  // EDIT MODE
  if (isEdit) {
    return (
      <ModalShell title="Edit medication" onClose={handleClose}>
        <div className="pce-modal-body">
          <div className="pce-field-grid">
            <div className="pce-field">
              <label className="pce-label">
                Medication name{" "}
                <span className="pce-req-mark" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                type="text"
                className="pce-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Apoquel, Carprofen"
                maxLength={80}
                autoFocus
              />
              {name.trim() === "" ? (
                <p className="pce-field-hint pce-field-warn">
                  Medication name is required.
                </p>
              ) : null}
            </div>
          </div>

          <div className="pce-field-grid two-col">
            <div className="pce-field">
              <label className="pce-label">Dosage</label>
              <input
                type="text"
                className="pce-input"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g. 5mg twice daily"
                maxLength={80}
              />
            </div>
            <div className="pce-field">
              <label className="pce-label">Frequency</label>
              <input
                type="text"
                className="pce-input"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                placeholder="e.g. Morning + evening"
                maxLength={80}
              />
            </div>
            <div className="pce-field">
              <label className="pce-label">Started</label>
              <input
                type="date"
                className="pce-input"
                value={startedDate}
                onChange={(e) => setStartedDate(e.target.value)}
              />
            </div>
            <div className="pce-field">
              <label className="pce-label">Ended (if applicable)</label>
              <input
                type="date"
                className="pce-input"
                value={endedDate}
                onChange={(e) => setEndedDate(e.target.value)}
              />
              <p className="pce-field-hint">Leave blank if still taking.</p>
            </div>
          </div>

          <div className="pce-field">
            <label className="pce-label">Reason / condition</label>
            <input
              type="text"
              className="pce-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Allergies, joint pain"
              maxLength={120}
            />
          </div>

          <div className="pce-field">
            <label className="pce-label">Notes</label>
            <textarea
              className="pce-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Side effects, instructions, anything else."
              maxLength={400}
              rows={3}
            />
          </div>
        </div>

        <div className="pce-modal-footer">
          <button
            type="button"
            className="pce-btn-danger-text"
            onClick={handleDeleteClick}
            disabled={saving}
          >
            {confirmingDelete ? "Tap again to confirm" : "Delete"}
          </button>
          <button
            type="button"
            className="pce-btn-secondary"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="pce-btn-primary"
            onClick={handleSubmit}
            disabled={!canSave}
          >
            {saving ? (
              <>
                <Loader2 size={14} strokeWidth={2.4} className="pce-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </ModalShell>
    );
  }

  // ADD MODE
  const count = entries.length;
  const primaryLabel = `Add ${count} ${count === 1 ? "medication" : "medications"}`;

  return (
    <ModalShell title="Add medications" onClose={handleClose}>
      <div className="pce-modal-body">
        {entries.map((entry, idx) => (
          <div key={idx} className="pce-entry-card">
            <div className="pce-entry-header">
              <span className="pce-entry-label">Medication {idx + 1}</span>
              {entries.length > 1 ? (
                <button
                  type="button"
                  className="pce-icon-btn"
                  onClick={() => removeEntry(idx)}
                  aria-label={`Remove medication ${idx + 1}`}
                >
                  <X size={16} strokeWidth={2.2} />
                </button>
              ) : null}
            </div>

            <div className="pce-field-grid">
              <div className="pce-field">
                <label className="pce-label">
                  Medication name{" "}
                  <span className="pce-req-mark" aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  type="text"
                  className="pce-input"
                  value={entry.medication_name}
                  onChange={(e) =>
                    updateEntry(idx, "medication_name", e.target.value)
                  }
                  placeholder="e.g. Apoquel, Carprofen"
                  maxLength={80}
                  autoFocus={idx === 0}
                />
                {entry.medication_name.trim() === "" ? (
                  <p className="pce-field-hint pce-field-warn">
                    Medication name is required.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="pce-field-grid two-col">
              <div className="pce-field">
                <label className="pce-label">Dosage</label>
                <input
                  type="text"
                  className="pce-input"
                  value={entry.dosage}
                  onChange={(e) => updateEntry(idx, "dosage", e.target.value)}
                  placeholder="e.g. 5mg twice daily"
                  maxLength={80}
                />
              </div>
              <div className="pce-field">
                <label className="pce-label">Frequency</label>
                <input
                  type="text"
                  className="pce-input"
                  value={entry.frequency}
                  onChange={(e) =>
                    updateEntry(idx, "frequency", e.target.value)
                  }
                  placeholder="e.g. Morning + evening"
                  maxLength={80}
                />
              </div>
              <div className="pce-field">
                <label className="pce-label">Started</label>
                <input
                  type="date"
                  className="pce-input"
                  value={entry.started_date}
                  onChange={(e) =>
                    updateEntry(idx, "started_date", e.target.value)
                  }
                />
              </div>
              <div className="pce-field">
                <label className="pce-label">Ended (if applicable)</label>
                <input
                  type="date"
                  className="pce-input"
                  value={entry.ended_date}
                  onChange={(e) =>
                    updateEntry(idx, "ended_date", e.target.value)
                  }
                />
                <p className="pce-field-hint">Leave blank if still taking.</p>
              </div>
            </div>

            <div className="pce-field">
              <label className="pce-label">Reason / condition</label>
              <input
                type="text"
                className="pce-input"
                value={entry.reason}
                onChange={(e) => updateEntry(idx, "reason", e.target.value)}
                placeholder="e.g. Allergies, joint pain"
                maxLength={120}
              />
            </div>

            <div className="pce-field">
              <label className="pce-label">Notes</label>
              <textarea
                className="pce-textarea"
                value={entry.notes}
                onChange={(e) => updateEntry(idx, "notes", e.target.value)}
                placeholder="Side effects, instructions, anything else."
                maxLength={400}
                rows={3}
              />
            </div>
          </div>
        ))}

        <button type="button" className="pce-add-entry" onClick={addEntry}>
          <Plus size={16} strokeWidth={2.4} />
          Add another medication
        </button>
      </div>

      <div className="pce-modal-footer">
        <button
          type="button"
          className="pce-btn-secondary"
          onClick={handleClose}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="pce-btn-primary"
          onClick={handleSubmit}
          disabled={!canSave}
        >
          {saving ? (
            <>
              <Loader2 size={14} strokeWidth={2.4} className="pce-spin" />
              Saving…
            </>
          ) : (
            primaryLabel
          )}
        </button>
      </div>
    </ModalShell>
  );
}

// =============================================================
// MODAL SHELL — wraps any modal (overlay, header w/ close, body slot)
// =============================================================

function ModalShell({ title, onClose, children }) {
  // Close on Escape key
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Body scroll-lock when modal is open. The modal itself has
  // overflow-y: auto so its content stays scrollable.
  useEffect(() => {
    // `overflow: hidden` alone does not stop scrolling in iOS Safari.
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    return () => {
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, []);

  if (typeof document === "undefined") return null;
  // Inline fixed positioning + portal to document.body so the modal always
  // centers on the real viewport, never shifting with scroll or being cut off
  // at the top/bottom (which happened when it rendered deep in the page tree).
  const overlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    boxSizing: "border-box",
    zIndex: 4000,
  };
  return createPortal(
    <div
      className="pce-modal-overlay"
      style={overlayStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="pce-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="pce-modal-header">
          <h3 className="pce-modal-title">{title}</h3>
          <button
            type="button"
            className="pce-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// =============================================================
// MEDICAL HELPERS
// =============================================================

// Format a date like "Mar 4, 2024" — compact for list rows
// =============================================================
// Build 5d: Vet & Emergency section
// =============================================================
// Subsections:
//   1. Primary vet (single record on pets table)
//   2. Emergency vet (single record on pets table)
//   3. Specialists (list — pet_specialists table)
//   4. Emergency contacts (list — pet_emergency_contacts table)
//   5. Vet visit history (list — pet_vet_visits table)
//   6. Insurance (single record on pets table)
//   7. Pet Poison Helpline (static footer)

function VetEmergencySection({
  pet,
  onUpdate,
  setSaveStatus,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
}) {
  // Uses site-wide openFormId coordinator (passed from PetCardEditorPage).
  // Each block has its own formId string and asks via setOpenFormId(formId).
  // Opening one form closes all others across the entire editor page.

  return (
    <>
      {/* Primary vet */}
      <div className="pce-subsection">
        <PrimaryVetBlock
          pet={pet}
          onUpdate={onUpdate}
          setSaveStatus={setSaveStatus}
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
        />
      </div>

      {/* Emergency vet */}
      <div className="pce-subsection">
        <EmergencyVetBlock
          pet={pet}
          onUpdate={onUpdate}
          setSaveStatus={setSaveStatus}
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
        />
      </div>

      {/* Specialists */}
      <div className="pce-subsection">
        <SpecialistsBlock
          pet={pet}
          setSaveStatus={setSaveStatus}
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
        />
      </div>

      {/* Emergency contacts */}
      <div className="pce-subsection">
        <EmergencyContactsBlock
          pet={pet}
          setSaveStatus={setSaveStatus}
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
        />
      </div>

      {/* Vet visit history */}
      <div className="pce-subsection">
        <VetVisitsBlock
          pet={pet}
          setSaveStatus={setSaveStatus}
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
        />
      </div>

      {/* Insurance */}
      <div className="pce-subsection">
        <InsuranceBlock
          pet={pet}
          onUpdate={onUpdate}
          setSaveStatus={setSaveStatus}
          openFormId={openFormId}
          setOpenFormId={setOpenFormId}
          confirmUnsaved={confirmUnsaved}
        />
      </div>

      {/* Pet Poison Helpline — static safety footer */}
      <div className="pce-subsection">
        <HelplineFooter />
      </div>
    </>
  );
}

// =============================================================
// PRIMARY VET — single-record card with edit modal
// =============================================================

function PrimaryVetBlock({
  pet,
  onUpdate,
  setSaveStatus,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
}) {
  const FORM_ID = "primary-vet";
  const editing = openFormId === FORM_ID;

  const hasData =
    pet.primary_vet_name ||
    pet.primary_vet_phone ||
    pet.primary_vet_address ||
    pet.primary_vet_address_line2 ||
    pet.primary_vet_notes;

  function handleSave(fields) {
    return onUpdate({
      primary_vet_name: fields.name || null,
      primary_vet_phone: fields.phone || null,
      primary_vet_address: fields.address || null,
      primary_vet_address_line2: fields.address_line2 || null,
      primary_vet_notes: fields.notes || null,
      primary_vet_slug: fields.slug || null,
    });
  }

  return (
    <>
      <h3 className="pce-sub-title">Primary vet</h3>
      <p className="pce-sub-sub">
        Your everyday vet — the first call for routine care.
      </p>

      {hasData && !editing ? (
        <div className="pce-list">
          <SingleVetItem
            kind="primary"
            pet={pet}
            namePrefix="primary_vet"
            onEdit={() => setOpenFormId(FORM_ID)}
          />
        </div>
      ) : null}

      {!hasData && !editing ? (
        <div className="pce-list-empty">
          No primary vet on file. Add one so sitters and family know where to
          call.
        </div>
      ) : null}

      <Collapse open={editing}>
        <InlineVetContactForm
          confirmUnsaved={confirmUnsaved}
          title="Primary vet"
          initial={{
            name: pet.primary_vet_name || "",
            phone: pet.primary_vet_phone || "",
            address: pet.primary_vet_address || "",
            address_line2: pet.primary_vet_address_line2 || "",
            notes: pet.primary_vet_notes || "",
            slug: pet.primary_vet_slug || "",
          }}
          onCancel={() => setOpenFormId(null)}
          onSave={async (fields) => {
            const ok = await handleSave(fields);
            if (ok) setOpenFormId(null);
          }}
          onClear={async () => {
            const ok = await handleSave({
              name: "",
              phone: "",
              address: "",
              address_line2: "",
              notes: "",
              slug: "",
            });
            if (ok) setOpenFormId(null);
          }}
          hasData={hasData}
        />
      </Collapse>
      {!editing &&
        (!hasData ? (
          // Only show the "+ Add primary vet" button when there is no data.
          // When a vet exists, the SingleVetItem card displays its own pencil
          // icon which is the canonical edit affordance — a separate "+ Edit
          // primary vet" button below the card would be a redundant and
          // contradictory affordance (the + icon means "add").
          <button
            type="button"
            className="pce-add-btn"
            onClick={() => setOpenFormId(FORM_ID)}
          >
            <Plus size={16} strokeWidth={2.4} />
            Add primary vet
          </button>
        ) : null)}
    </>
  );
}

// =============================================================
// EMERGENCY VET — single-record card, same pattern as Primary vet
// =============================================================

function EmergencyVetBlock({
  pet,
  onUpdate,
  setSaveStatus,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
}) {
  const FORM_ID = "emergency-vet";
  const editing = openFormId === FORM_ID;

  const hasData =
    pet.emergency_vet_name ||
    pet.emergency_vet_phone ||
    pet.emergency_vet_address ||
    pet.emergency_vet_address_line2 ||
    pet.emergency_vet_notes;

  function handleSave(fields) {
    return onUpdate({
      emergency_vet_name: fields.name || null,
      emergency_vet_phone: fields.phone || null,
      emergency_vet_address: fields.address || null,
      emergency_vet_address_line2: fields.address_line2 || null,
      emergency_vet_notes: fields.notes || null,
      emergency_vet_slug: fields.slug || null,
    });
  }

  return (
    <>
      <h3 className="pce-sub-title">Emergency vet</h3>
      <p className="pce-sub-sub">
        24/7 emergency clinic. Often a different place than your primary vet.
      </p>

      {hasData && !editing ? (
        <div className="pce-list">
          <SingleVetItem
            kind="emergency"
            pet={pet}
            namePrefix="emergency_vet"
            onEdit={() => setOpenFormId(FORM_ID)}
          />
        </div>
      ) : null}

      {!hasData && !editing ? (
        <div className="pce-list-empty">
          No emergency vet on file. Most primary vets aren&apos;t open at 3am —
          add a 24/7 clinic now.
        </div>
      ) : null}

      <Collapse open={editing}>
        <InlineVetContactForm
          confirmUnsaved={confirmUnsaved}
          title="Emergency vet"
          initial={{
            name: pet.emergency_vet_name || "",
            phone: pet.emergency_vet_phone || "",
            address: pet.emergency_vet_address || "",
            address_line2: pet.emergency_vet_address_line2 || "",
            notes: pet.emergency_vet_notes || "",
            slug: pet.emergency_vet_slug || "",
          }}
          onCancel={() => setOpenFormId(null)}
          onSave={async (fields) => {
            const ok = await handleSave(fields);
            if (ok) setOpenFormId(null);
          }}
          onClear={async () => {
            const ok = await handleSave({
              name: "",
              phone: "",
              address: "",
              address_line2: "",
              notes: "",
              slug: "",
            });
            if (ok) setOpenFormId(null);
          }}
          hasData={hasData}
        />
      </Collapse>
      {!editing &&
        (!hasData ? (
          // Same reasoning as PrimaryVetBlock — the pencil icon on the existing
          // card is the edit affordance; a "+ Edit" button below would be
          // redundant.
          <button
            type="button"
            className="pce-add-btn"
            onClick={() => setOpenFormId(FORM_ID)}
          >
            <Plus size={16} strokeWidth={2.4} />
            Add emergency vet
          </button>
        ) : null)}
    </>
  );
}

// Single vet card render — used by both Primary + Emergency
function SingleVetItem({ kind, pet, namePrefix, onEdit }) {
  const Icon = kind === "emergency" ? Siren : Stethoscope;
  const name = pet[`${namePrefix}_name`];
  const phone = pet[`${namePrefix}_phone`];
  const address = pet[`${namePrefix}_address`];
  const addressLine2 = pet[`${namePrefix}_address_line2`];
  const notes = pet[`${namePrefix}_notes`];

  const metaRows = [];
  if (phone)
    metaRows.push({
      label: "Phone",
      value: (
        <a href={phoneTelHref(phone)} className="pce-link">
          {formatPhoneDisplay(phone)}
        </a>
      ),
    });
  if (address || addressLine2) {
    // Render address as two lines using <br/> for the line break — the simplest
    // and most reliable approach. <br/> is a real HTML line break that renders
    // inside inline content at every viewport, in every browser, without any
    // CSS dependency. Earlier attempts using inline-flex/block on nested spans
    // had inconsistent results across cards.
    const { line1, line2 } = splitAddressForDisplay(address, addressLine2);
    metaRows.push({
      label: "Address",
      value: (
        <>
          {line1}
          {line1 && line2 ? <br /> : null}
          {line2}
        </>
      ),
    });
  }

  return (
    <div className="pce-list-item">
      <div className="pce-list-item-body">
        <div className="pce-list-item-title-row">
          <span className="pce-list-item-icon-inline">
            <Icon size={18} strokeWidth={2} />
          </span>
          <p className="pce-list-item-title">
            {name || (kind === "emergency" ? "Emergency vet" : "Primary vet")}
          </p>
        </div>
        {metaRows.length > 0 ? (
          <>
            <div className="pce-list-item-sep" />
            <div
              className={`pce-list-item-meta pce-list-item-meta--${kind === "emergency" ? "emergency-vet" : "primary-vet"}`}
              style={{ "--col-count": metaRows.length }}
            >
              {metaRows.map((row, i) => (
                <div key={i} className="pce-list-item-meta-row">
                  <span className="pce-list-item-meta-label">{row.label}:</span>
                  <span className="pce-list-item-meta-value">{row.value}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}
        <NotesSection notes={notes} />
      </div>
      <div className="pce-list-item-actions">
        <button
          type="button"
          className="pce-icon-btn"
          onClick={onEdit}
          aria-label={`Edit ${kind === "emergency" ? "emergency" : "primary"} vet`}
        >
          <Pencil size={EDIT_ICON_SIZE} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

// Shared INLINE form for Primary + Emergency vet edits.
// Uses VetAutocomplete on the clinic/vet name field — picking a directory
// vet auto-fills phone + address and stores the slug for future linking.
function InlineVetContactForm({
  title,
  initial,
  onCancel,
  onSave,
  onClear,
  hasData,
  confirmUnsaved,
}) {
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [address, setAddress] = useState(initial.address);
  const [addressLine2, setAddressLine2] = useState(initial.address_line2 || "");
  const [notes, setNotes] = useState(initial.notes);
  const [slug, setSlug] = useState(initial.slug || "");
  const [clearConfirm, setClearConfirm] = useState(false);
  // Track explicit cancel/clear so autosave-on-unmount knows to skip
  const skipAutosaveRef = useRef(false);
  // Latest draft values held in refs so the unmount cleanup sees fresh values
  const draftRef = useRef({ name, phone, address, addressLine2, notes, slug });
  draftRef.current = { name, phone, address, addressLine2, notes, slug };
  const initialRef = useRef(initial);

  // Autosave on unmount: when this form is closed by another form opening,
  // commit any pending changes silently. Skipped if user clicked Cancel/Clear.
  useEffect(() => {
    return () => {
      if (skipAutosaveRef.current) return;
      const d = draftRef.current;
      const init = initialRef.current;
      const dirty =
        d.name !== init.name ||
        d.phone !== init.phone ||
        d.address !== init.address ||
        d.addressLine2 !== (init.address_line2 || "") ||
        d.notes !== init.notes ||
        d.slug !== (init.slug || "");
      void dirty;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePickVet(vet) {
    // User picked a directory vet — auto-fill all fields and stash slug.
    // buildVetAddress returns { line1, line2 } so we set both separately.
    setName(vet.name || "");
    setPhone(vet.phone || "");
    const { line1, line2 } = buildVetAddress(vet);
    setAddress(line1);
    setAddressLine2(line2);
    setSlug(vet.slug || "");
  }

  function handleNameChange(text) {
    setName(text);
    // If user manually edits the name, we keep the slug only if the typed
    // name still matches the directory name reasonably. Simplest rule:
    // any manual edit clears the slug (user can re-pick to restore link).
    if (slug) setSlug("");
  }

  function handleSubmit() {
    // Explicit save — skip the unmount autosave so we don't double-fire
    skipAutosaveRef.current = true;
    onSave({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      address_line2: addressLine2.trim(),
      notes: notes.trim(),
      slug: slug || "",
    });
  }

  function handleClear() {
    if (!clearConfirm) {
      setClearConfirm(true);
      setTimeout(() => setClearConfirm(false), 3000);
      return;
    }
    skipAutosaveRef.current = true;
    onClear();
  }

  function isVetFormDirty() {
    const d = draftRef.current;
    const init = initialRef.current;
    return (
      d.name !== init.name ||
      d.phone !== init.phone ||
      d.address !== init.address ||
      d.addressLine2 !== (init.address_line2 || "") ||
      d.notes !== init.notes ||
      d.slug !== (init.slug || "")
    );
  }

  async function handleCancel() {
    skipAutosaveRef.current = true;
    if (confirmUnsaved && isVetFormDirty()) {
      const choice = await confirmUnsaved();
      if (choice === "keep") {
        skipAutosaveRef.current = false;
        return;
      }
      if (choice === "save") {
        handleSubmit();
        return;
      }
    }
    onCancel();
  }

  return (
    <div className="pce-inline-form">
      <button
        type="button"
        className="pce-form-close"
        aria-label="Close"
        onClick={handleCancel}
      >
        <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
      </button>
      <div className="pce-entry-card">
        <div className="pce-entry-header">
          <span className="pce-entry-label">{title}</span>
          {slug ? (
            <span
              className="pce-entry-linked-badge"
              title="Linked to directory vet"
            >
              <Link2 size={12} strokeWidth={2.4} /> Linked
            </span>
          ) : null}
        </div>

        <div className="pce-field">
          <label className="pce-label">Clinic / vet name</label>
          <VetAutocomplete
            value={name}
            onChange={handleNameChange}
            onPick={handlePickVet}
            placeholder="Search vets or type freely"
          />
        </div>

        <div className="pce-field">
          <label className="pce-label">Phone</label>
          <PhoneInput
            value={phone}
            onChange={setPhone}
            placeholder="(555) 123-4567"
          />
        </div>

        <div className="pce-field">
          <label className="pce-label">Street address</label>
          <input
            type="text"
            className="pce-input"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St"
            maxLength={200}
            autoComplete="address-line1"
          />
        </div>

        <div className="pce-field">
          <label className="pce-label">City, state, zip</label>
          <input
            type="text"
            className="pce-input"
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            placeholder="Oakland, CA 94601"
            maxLength={200}
            autoComplete="address-line2"
          />
        </div>

        <div className="pce-field">
          <label className="pce-label">Notes</label>
          <textarea
            className="pce-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Hours, parking, what to ask for, etc."
            maxLength={500}
            rows={3}
          />
        </div>
      </div>

      <div className="pce-inline-form-actions pce-inline-form-actions--split">
        {hasData ? (
          <button
            type="button"
            className="pce-btn-danger-text"
            onClick={handleClear}
          >
            {clearConfirm ? "Tap again to confirm" : "Clear"}
          </button>
        ) : (
          <span />
        )}
        <div className="pce-inline-form-actions-right">
          <button
            type="button"
            className="pce-btn-secondary"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="pce-btn-primary"
            onClick={handleSubmit}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// SPECIALISTS BLOCK — list + inline add + edit modal
// =============================================================

const EMPTY_SPECIALIST_ENTRY = {
  name: "",
  specialty: "",
  phone: "",
  address: "",
  address_line2: "",
  notes: "",
  vet_slug: "",
};

function SpecialistsBlock({
  pet,
  setSaveStatus,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
}) {
  const FORM_ID = "specialists-add";
  const addOpen = openFormId === FORM_ID;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await getPetSpecialists(pet.id);
      if (cancelled) return;
      if (!error && data) setItems(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pet.id]);

  async function handleAddSave(fields) {
    setSaveStatus("saving");
    const { data, error } = await addSpecialist(pet.id, fields);
    if (error) {
      setSaveStatus("error");
      console.error("addSpecialist failed:", error);
      throw new Error(
        error.message || "Could not save specialist. Please try again.",
      );
    }
    setItems((prev) => [...prev, data]);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  }

  async function handleEditSave(fields) {
    setSaveStatus("saving");
    const { data, error } = await updateSpecialist(editingItem.id, fields);
    if (error) {
      setSaveStatus("error");
      console.error("updateSpecialist failed:", error);
      throw new Error(
        error.message || "Could not save changes. Please try again.",
      );
    }
    setItems((prev) => prev.map((s) => (s.id === editingItem.id ? data : s)));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  }

  async function handleDelete() {
    if (!editingItem) return false;
    setSaveStatus("saving");
    const { error } = await deleteSpecialist(editingItem.id);
    if (error) {
      setSaveStatus("error");
      console.error("deleteSpecialist failed:", error);
      throw new Error(error.message || "Could not delete. Please try again.");
    }
    setItems((prev) => prev.filter((s) => s.id !== editingItem.id));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  }

  return (
    <>
      <h3 className="pce-sub-title">Specialists</h3>
      <p className="pce-sub-sub">
        Cardiologist, dermatologist, behaviorist — vets with ongoing specialty
        care.
      </p>

      {loading ? (
        <div className="pce-list-empty">Loading…</div>
      ) : (
        <>
          {items.length === 0 && !addOpen ? (
            <div className="pce-list-empty">No specialists on file.</div>
          ) : (
            <CollapsibleList
              items={items}
              limit={5}
              noun="specialists"
              renderItem={(item) => (
                <SpecialistItem
                  key={item.id}
                  item={item}
                  onEdit={() => {
                    setOpenFormId(null);
                    setEditingItem(item);
                  }}
                />
              )}
            />
          )}

          {addOpen ? (
            <InlineAddSpecialists
              confirmUnsaved={confirmUnsaved}
              onCancel={() => setOpenFormId(null)}
              onSaveAll={handleAddSave}
              onDone={() => setOpenFormId(null)}
            />
          ) : (
            <button
              type="button"
              className="pce-add-btn"
              onClick={() => setOpenFormId(FORM_ID)}
            >
              <Plus size={16} strokeWidth={2.4} />
              Add specialist
            </button>
          )}
        </>
      )}

      {editingItem ? (
        <SpecialistModal
          item={editingItem}
          confirmUnsaved={confirmUnsaved}
          onClose={() => setEditingItem(null)}
          onSave={async (fields) => {
            const ok = await handleEditSave(fields);
            if (ok) setEditingItem(null);
          }}
          onDelete={async () => {
            const ok = await handleDelete();
            if (ok) setEditingItem(null);
          }}
        />
      ) : null}
    </>
  );
}

function SpecialistItem({ item, onEdit }) {
  const metaRows = [];
  if (item.specialty)
    metaRows.push({ label: "Specialty", value: item.specialty });
  if (item.phone)
    metaRows.push({
      label: "Phone",
      value: (
        <a href={phoneTelHref(item.phone)} className="pce-link">
          {formatPhoneDisplay(item.phone)}
        </a>
      ),
    });
  if (item.address || item.address_line2) {
    // See SingleVetItem above for explanation of the <br/> approach.
    const { line1, line2 } = splitAddressForDisplay(
      item.address,
      item.address_line2,
    );
    metaRows.push({
      label: "Address",
      value: (
        <>
          {line1}
          {line1 && line2 ? <br /> : null}
          {line2}
        </>
      ),
    });
  }

  return (
    <div className="pce-list-item">
      <div className="pce-list-item-body">
        <div className="pce-list-item-title-row">
          <span className="pce-list-item-icon-inline">
            <BriefcaseMedical size={18} strokeWidth={2} />
          </span>
          <p className="pce-list-item-title">
            {item.name || "Untitled specialist"}
          </p>
        </div>
        {metaRows.length > 0 ? (
          <>
            <div className="pce-list-item-sep" />
            <div
              className="pce-list-item-meta pce-list-item-meta--specialists"
              style={{ "--col-count": metaRows.length }}
            >
              {metaRows.map((row, i) => (
                <div key={i} className="pce-list-item-meta-row">
                  <span className="pce-list-item-meta-label">{row.label}:</span>
                  <span className="pce-list-item-meta-value">{row.value}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}
        <NotesSection notes={item.notes} />
      </div>
      <div className="pce-list-item-actions">
        <button
          type="button"
          className="pce-icon-btn"
          onClick={onEdit}
          aria-label="Edit specialist"
        >
          <Pencil size={EDIT_ICON_SIZE} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function InlineAddSpecialists({ onCancel, onSaveAll, onDone, confirmUnsaved }) {
  const [entries, setEntries] = useState([{ ...EMPTY_SPECIALIST_ENTRY }]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  function isBatchDirty() {
    if (entries.length !== 1) return true;
    return (
      JSON.stringify(entries[0]) !==
      JSON.stringify({ ...EMPTY_SPECIALIST_ENTRY })
    );
  }
  async function handleCancel() {
    if (confirmUnsaved && isBatchDirty()) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return;
      if (choice === "save") {
        await handleSubmit();
        return;
      }
    }
    onCancel();
  }

  function updateEntry(idx, key, value) {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [key]: value } : e)),
    );
  }
  function addEntry() {
    setEntries((prev) => [...prev, { ...EMPTY_SPECIALIST_ENTRY }]);
  }
  function removeEntry(idx) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  const canSave =
    !saving &&
    entries.length > 0 &&
    entries.every((e) => e.name.trim().length > 0);

  async function handleSubmit() {
    if (!canSave) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      for (const e of entries) {
        await onSaveAll({
          name: e.name.trim(),
          specialty: e.specialty.trim() || null,
          phone: e.phone.trim() || null,
          address: e.address.trim() || null,
          address_line2: e.address_line2.trim() || null,
          notes: e.notes.trim() || null,
          vet_slug: e.vet_slug || null,
        });
      }
      onDone();
    } catch (err) {
      setErrorMsg(err?.message || "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const count = entries.length;
  const primaryLabel = `Add ${count} ${count === 1 ? "specialist" : "specialists"}`;

  return (
    <div className="pce-inline-form">
      <button
        type="button"
        className="pce-form-close"
        aria-label="Close"
        onClick={handleCancel}
      >
        <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
      </button>
      {entries.map((entry, idx) => (
        <div key={idx} className="pce-entry-card">
          <div className="pce-entry-header">
            <span className="pce-entry-label">Specialist {idx + 1}</span>
            {entries.length > 1 ? (
              <button
                type="button"
                className="pce-icon-btn"
                onClick={() => removeEntry(idx)}
                aria-label={`Remove specialist ${idx + 1}`}
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            ) : null}
          </div>

          <div className="pce-field">
            <label className="pce-label">
              Name{" "}
              <span className="pce-req-mark" aria-hidden="true">
                *
              </span>
            </label>
            <VetAutocomplete
              value={entry.name}
              onChange={(v) => {
                updateEntry(idx, "name", v);
                if (entry.vet_slug) updateEntry(idx, "vet_slug", "");
              }}
              onPick={(vet) => {
                const { line1, line2 } = buildVetAddress(vet);
                setEntries((prev) =>
                  prev.map((e, i) =>
                    i === idx
                      ? {
                          ...e,
                          name: vet.name || "",
                          phone: vet.phone || "",
                          address: line1,
                          address_line2: line2,
                          vet_slug: vet.slug || "",
                        }
                      : e,
                  ),
                );
              }}
              placeholder="Dr. Smith / Bay Area Cardiology"
            />
          </div>

          <div className="pce-field">
            <label className="pce-label">Specialty</label>
            <input
              type="text"
              className="pce-input"
              value={entry.specialty}
              onChange={(e) => updateEntry(idx, "specialty", e.target.value)}
              placeholder="e.g. Cardiology, Dermatology, Behavior"
              maxLength={80}
            />
          </div>

          <div className="pce-field">
            <label className="pce-label">Phone</label>
            <PhoneInput
              value={entry.phone}
              onChange={(v) => updateEntry(idx, "phone", v)}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="pce-field">
            <label className="pce-label">Street address</label>
            <input
              type="text"
              className="pce-input"
              value={entry.address}
              onChange={(e) => updateEntry(idx, "address", e.target.value)}
              placeholder="123 Main St"
              maxLength={200}
              autoComplete="address-line1"
            />
          </div>

          <div className="pce-field">
            <label className="pce-label">City, state, zip</label>
            <input
              type="text"
              className="pce-input"
              value={entry.address_line2}
              onChange={(e) =>
                updateEntry(idx, "address_line2", e.target.value)
              }
              placeholder="Oakland, CA 94601"
              maxLength={200}
              autoComplete="address-line2"
            />
          </div>

          <div className="pce-field">
            <label className="pce-label">Notes</label>
            <textarea
              className="pce-textarea"
              value={entry.notes}
              onChange={(e) => updateEntry(idx, "notes", e.target.value)}
              placeholder="Reason for care, referral info, etc."
              maxLength={400}
              rows={2}
            />
          </div>
        </div>
      ))}

      <button type="button" className="pce-add-entry" onClick={addEntry}>
        <Plus size={16} strokeWidth={2.4} />
        Add another specialist
      </button>

      {errorMsg ? (
        <div className="pce-modal-error" role="alert">
          <AlertCircle size={16} strokeWidth={2.2} />
          <span>{errorMsg}</span>
        </div>
      ) : null}

      <div className="pce-inline-form-actions">
        <button
          type="button"
          className="pce-btn-secondary"
          onClick={handleCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="pce-btn-primary"
          onClick={handleSubmit}
          disabled={!canSave}
        >
          {saving ? (
            <>
              <Loader2 size={14} strokeWidth={2.4} className="pce-spin" />
              Saving…
            </>
          ) : (
            primaryLabel
          )}
        </button>
      </div>
    </div>
  );
}

function SpecialistModal({ item, onClose, onSave, onDelete, confirmUnsaved }) {
  const [name, setName] = useState(item?.name || "");
  const [specialty, setSpecialty] = useState(item?.specialty || "");
  const [phone, setPhone] = useState(item?.phone || "");
  const [address, setAddress] = useState(item?.address || "");
  const [addressLine2, setAddressLine2] = useState(item?.address_line2 || "");
  const [notes, setNotes] = useState(item?.notes || "");
  const [vetSlug, setVetSlug] = useState(item?.vet_slug || "");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  function isDirty() {
    return (
      name !== (item?.name || "") ||
      specialty !== (item?.specialty || "") ||
      phone !== (item?.phone || "") ||
      address !== (item?.address || "") ||
      addressLine2 !== (item?.address_line2 || "") ||
      notes !== (item?.notes || "") ||
      vetSlug !== (item?.vet_slug || "")
    );
  }
  async function handleClose() {
    if (confirmUnsaved && isDirty()) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return;
      if (choice === "save") {
        await handleSubmit();
        return;
      }
    }
    onClose();
  }

  const canSave = !saving && name.trim().length > 0;

  function handlePickVet(vet) {
    setName(vet.name || "");
    setPhone(vet.phone || "");
    const { line1, line2 } = buildVetAddress(vet);
    setAddress(line1);
    setAddressLine2(line2);
    setVetSlug(vet.slug || "");
  }

  function handleNameChange(text) {
    setName(text);
    if (vetSlug) setVetSlug("");
  }

  async function handleSubmit() {
    if (!canSave) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await onSave({
        name: name.trim(),
        specialty: specialty.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        address_line2: addressLine2.trim() || null,
        notes: notes.trim() || null,
        vet_slug: vetSlug || null,
      });
    } catch (err) {
      setErrorMsg(err?.message || "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteClick() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000);
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      await onDelete();
    } catch (err) {
      setErrorMsg(err?.message || "Delete failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Edit specialist" onClose={handleClose}>
      <div className="pce-modal-body">
        <div className="pce-field">
          <label className="pce-label">
            Name{" "}
            <span className="pce-req-mark" aria-hidden="true">
              *
            </span>
          </label>
          <VetAutocomplete
            value={name}
            onChange={handleNameChange}
            onPick={handlePickVet}
            placeholder="Dr. Smith / Bay Area Cardiology"
          />
        </div>

        <div className="pce-field">
          <label className="pce-label">Specialty</label>
          <input
            type="text"
            className="pce-input"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            maxLength={80}
          />
        </div>

        <div className="pce-field">
          <label className="pce-label">Phone</label>
          <PhoneInput value={phone} onChange={setPhone} />
        </div>

        <div className="pce-field">
          <label className="pce-label">Street address</label>
          <input
            type="text"
            className="pce-input"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St"
            maxLength={200}
            autoComplete="address-line1"
          />
        </div>

        <div className="pce-field">
          <label className="pce-label">City, state, zip</label>
          <input
            type="text"
            className="pce-input"
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            placeholder="Oakland, CA 94601"
            maxLength={200}
            autoComplete="address-line2"
          />
        </div>

        <div className="pce-field">
          <label className="pce-label">Notes</label>
          <textarea
            className="pce-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={400}
            rows={3}
          />
        </div>
      </div>

      {errorMsg ? (
        <div className="pce-modal-error" role="alert">
          <AlertCircle size={16} strokeWidth={2.2} />
          <span>{errorMsg}</span>
        </div>
      ) : null}

      <div className="pce-modal-footer">
        <button
          type="button"
          className="pce-btn-danger-text"
          onClick={handleDeleteClick}
          disabled={saving}
        >
          {deleteConfirm ? "Tap again to confirm" : "Delete"}
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="pce-btn-secondary"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="pce-btn-primary"
            onClick={handleSubmit}
            disabled={!canSave}
          >
            {saving ? (
              <>
                <Loader2 size={14} strokeWidth={2.4} className="pce-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// =============================================================
// EMERGENCY CONTACTS BLOCK
// =============================================================

const EMPTY_CONTACT_ENTRY = {
  name: "",
  relationship: "",
  phone: "",
  phone_secondary: "",
  email: "",
  notes: "",
};

function EmergencyContactsBlock({
  pet,
  setSaveStatus,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
}) {
  const FORM_ID = "contacts-add";
  const addOpen = openFormId === FORM_ID;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await getPetEmergencyContacts(pet.id);
      if (cancelled) return;
      if (!error && data) setItems(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pet.id]);

  async function handleAddSave(fields) {
    setSaveStatus("saving");
    const { data, error } = await addEmergencyContact(pet.id, fields);
    if (error) {
      setSaveStatus("error");
      console.error("addEmergencyContact failed:", error);
      throw new Error(
        error.message || "Could not save contact. Please try again.",
      );
    }
    setItems((prev) => [...prev, data]);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  }

  async function handleEditSave(fields) {
    setSaveStatus("saving");
    const { data, error } = await updateEmergencyContact(
      editingItem.id,
      fields,
    );
    if (error) {
      setSaveStatus("error");
      console.error("updateEmergencyContact failed:", error);
      throw new Error(
        error.message || "Could not save changes. Please try again.",
      );
    }
    setItems((prev) => prev.map((c) => (c.id === editingItem.id ? data : c)));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  }

  async function handleDelete() {
    if (!editingItem) return false;
    setSaveStatus("saving");
    const { error } = await deleteEmergencyContact(editingItem.id);
    if (error) {
      setSaveStatus("error");
      return false;
    }
    setItems((prev) => prev.filter((c) => c.id !== editingItem.id));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  }

  return (
    <>
      <h3 className="pce-sub-title">Emergency contacts</h3>
      <p className="pce-sub-sub">
        People who can take the pet in a crisis — a sister, neighbor, regular
        sitter.
      </p>

      {loading ? (
        <div className="pce-list-empty">Loading…</div>
      ) : (
        <>
          {items.length === 0 && !addOpen ? (
            <div className="pce-list-empty">
              No emergency contacts. Add 1–2 trusted people.
            </div>
          ) : (
            <CollapsibleList
              items={items}
              limit={5}
              noun="contacts"
              renderItem={(item) => (
                <EmergencyContactItem
                  key={item.id}
                  item={item}
                  onEdit={() => {
                    setOpenFormId(null);
                    setEditingItem(item);
                  }}
                />
              )}
            />
          )}

          {addOpen ? (
            <InlineAddEmergencyContacts
              confirmUnsaved={confirmUnsaved}
              onCancel={() => setOpenFormId(null)}
              onSaveAll={handleAddSave}
              onDone={() => setOpenFormId(null)}
            />
          ) : (
            <button
              type="button"
              className="pce-add-btn"
              onClick={() => setOpenFormId(FORM_ID)}
            >
              <Plus size={16} strokeWidth={2.4} />
              Add emergency contact
            </button>
          )}
        </>
      )}

      {editingItem ? (
        <EmergencyContactModal
          item={editingItem}
          confirmUnsaved={confirmUnsaved}
          onClose={() => setEditingItem(null)}
          onSave={async (fields) => {
            const ok = await handleEditSave(fields);
            if (ok) setEditingItem(null);
          }}
          onDelete={async () => {
            const ok = await handleDelete();
            if (ok) setEditingItem(null);
          }}
        />
      ) : null}
    </>
  );
}

function EmergencyContactItem({ item, onEdit }) {
  const metaRows = [];
  if (item.relationship)
    metaRows.push({ label: "Relationship", value: item.relationship });
  if (item.phone)
    metaRows.push({
      label: "Phone",
      value: (
        <a href={phoneTelHref(item.phone)} className="pce-link">
          {formatPhoneDisplay(item.phone)}
        </a>
      ),
    });
  if (item.phone_secondary)
    metaRows.push({
      label: "Alt phone",
      value: (
        <a href={phoneTelHref(item.phone_secondary)} className="pce-link">
          {formatPhoneDisplay(item.phone_secondary)}
        </a>
      ),
    });
  if (item.email)
    metaRows.push({
      label: "Email",
      value: (
        <a href={`mailto:${item.email}`} className="pce-link">
          {item.email}
        </a>
      ),
    });

  return (
    <div className="pce-list-item">
      <div className="pce-list-item-body">
        <div className="pce-list-item-title-row">
          <span className="pce-list-item-icon-inline">
            <UserRound size={18} strokeWidth={2} />
          </span>
          <p className="pce-list-item-title">
            {item.name || "Untitled contact"}
          </p>
        </div>
        {metaRows.length > 0 ? (
          <>
            <div className="pce-list-item-sep" />
            <div
              className="pce-list-item-meta pce-list-item-meta--emergency"
              style={{ "--col-count": metaRows.length }}
            >
              {metaRows.map((row, i) => (
                <div key={i} className="pce-list-item-meta-row">
                  <span className="pce-list-item-meta-label">{row.label}:</span>
                  <span className="pce-list-item-meta-value">{row.value}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}
        <NotesSection notes={item.notes} />
      </div>
      <div className="pce-list-item-actions">
        <button
          type="button"
          className="pce-icon-btn"
          onClick={onEdit}
          aria-label="Edit contact"
        >
          <Pencil size={EDIT_ICON_SIZE} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function InlineAddEmergencyContacts({
  onCancel,
  onSaveAll,
  onDone,
  confirmUnsaved,
}) {
  const [entries, setEntries] = useState([{ ...EMPTY_CONTACT_ENTRY }]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  function isBatchDirty() {
    if (entries.length !== 1) return true;
    return (
      JSON.stringify(entries[0]) !== JSON.stringify({ ...EMPTY_CONTACT_ENTRY })
    );
  }
  async function handleCancel() {
    if (confirmUnsaved && isBatchDirty()) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return;
      if (choice === "save") {
        await handleSubmit();
        return;
      }
    }
    onCancel();
  }

  function updateEntry(idx, key, value) {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [key]: value } : e)),
    );
  }
  function addEntry() {
    setEntries((prev) => [...prev, { ...EMPTY_CONTACT_ENTRY }]);
  }
  function removeEntry(idx) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  const canSave =
    !saving &&
    entries.length > 0 &&
    entries.every((e) => e.name.trim().length > 0);

  async function handleSubmit() {
    if (!canSave) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      for (const e of entries) {
        await onSaveAll({
          name: e.name.trim(),
          relationship: e.relationship.trim() || null,
          phone: e.phone.trim() || null,
          phone_secondary: e.phone_secondary.trim() || null,
          email: e.email.trim() || null,
          notes: e.notes.trim() || null,
        });
      }
      onDone();
    } catch (err) {
      setErrorMsg(err?.message || "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const count = entries.length;
  const primaryLabel = `Add ${count} ${count === 1 ? "contact" : "contacts"}`;

  return (
    <div className="pce-inline-form">
      <button
        type="button"
        className="pce-form-close"
        aria-label="Close"
        onClick={handleCancel}
      >
        <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
      </button>
      {entries.map((entry, idx) => (
        <div key={idx} className="pce-entry-card">
          <div className="pce-entry-header">
            <span className="pce-entry-label">Contact {idx + 1}</span>
            {entries.length > 1 ? (
              <button
                type="button"
                className="pce-icon-btn"
                onClick={() => removeEntry(idx)}
                aria-label={`Remove contact ${idx + 1}`}
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            ) : null}
          </div>

          <div className="pce-field">
            <label className="pce-label">
              Name{" "}
              <span className="pce-req-mark" aria-hidden="true">
                *
              </span>
            </label>
            <input
              type="text"
              className="pce-input"
              value={entry.name}
              onChange={(e) => updateEntry(idx, "name", e.target.value)}
              placeholder="Full name"
              maxLength={120}
            />
          </div>

          <div className="pce-field">
            <label className="pce-label">Relationship</label>
            <input
              type="text"
              className="pce-input"
              value={entry.relationship}
              onChange={(e) => updateEntry(idx, "relationship", e.target.value)}
              placeholder="e.g. Sister, Neighbor, Sitter"
              maxLength={60}
            />
          </div>

          <div className="pce-field">
            <label className="pce-label">Phone</label>
            <PhoneInput
              value={entry.phone}
              onChange={(v) => updateEntry(idx, "phone", v)}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="pce-field">
            <label className="pce-label">Alternate phone</label>
            <PhoneInput
              value={entry.phone_secondary}
              onChange={(v) => updateEntry(idx, "phone_secondary", v)}
              placeholder="Backup number"
            />
          </div>

          <div className="pce-field">
            <label className="pce-label">Email</label>
            <input
              type="email"
              className="pce-input"
              value={entry.email}
              onChange={(e) => updateEntry(idx, "email", e.target.value)}
              placeholder="email@example.com"
              maxLength={120}
            />
          </div>

          <div className="pce-field">
            <label className="pce-label">Notes</label>
            <textarea
              className="pce-textarea"
              value={entry.notes}
              onChange={(e) => updateEntry(idx, "notes", e.target.value)}
              placeholder="Has spare key, knows the pet, etc."
              maxLength={400}
              rows={2}
            />
          </div>
        </div>
      ))}

      <button type="button" className="pce-add-entry" onClick={addEntry}>
        <Plus size={16} strokeWidth={2.4} />
        Add another contact
      </button>

      {errorMsg ? (
        <div className="pce-modal-error" role="alert">
          <AlertCircle size={16} strokeWidth={2.2} />
          <span>{errorMsg}</span>
        </div>
      ) : null}

      <div className="pce-inline-form-actions">
        <button
          type="button"
          className="pce-btn-secondary"
          onClick={handleCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="pce-btn-primary"
          onClick={handleSubmit}
          disabled={!canSave}
        >
          {saving ? (
            <>
              <Loader2 size={14} strokeWidth={2.4} className="pce-spin" />
              Saving…
            </>
          ) : (
            primaryLabel
          )}
        </button>
      </div>
    </div>
  );
}

function EmergencyContactModal({
  item,
  onClose,
  onSave,
  onDelete,
  confirmUnsaved,
}) {
  const [name, setName] = useState(item?.name || "");
  const [relationship, setRelationship] = useState(item?.relationship || "");
  const [phone, setPhone] = useState(item?.phone || "");
  const [phoneSecondary, setPhoneSecondary] = useState(
    item?.phone_secondary || "",
  );
  const [email, setEmail] = useState(item?.email || "");
  const [notes, setNotes] = useState(item?.notes || "");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  function isDirty() {
    return (
      name !== (item?.name || "") ||
      relationship !== (item?.relationship || "") ||
      phone !== (item?.phone || "") ||
      phoneSecondary !== (item?.phone_secondary || "") ||
      email !== (item?.email || "") ||
      notes !== (item?.notes || "")
    );
  }
  async function handleClose() {
    if (confirmUnsaved && isDirty()) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return;
      if (choice === "save") {
        await handleSubmit();
        return;
      }
    }
    onClose();
  }

  const canSave = !saving && name.trim().length > 0;

  async function handleSubmit() {
    if (!canSave) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await onSave({
        name: name.trim(),
        relationship: relationship.trim() || null,
        phone: phone.trim() || null,
        phone_secondary: phoneSecondary.trim() || null,
        email: email.trim() || null,
        notes: notes.trim() || null,
      });
      // If onSave resolved without throwing, parent will close the modal.
      // If we got here without close, keep saving=false so user can retry.
    } catch (err) {
      setErrorMsg(err?.message || "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteClick() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000);
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      await onDelete();
    } catch (err) {
      setErrorMsg(err?.message || "Delete failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Edit contact" onClose={handleClose}>
      <div className="pce-modal-body">
        <div className="pce-field">
          <label className="pce-label">
            Name{" "}
            <span className="pce-req-mark" aria-hidden="true">
              *
            </span>
          </label>
          <input
            type="text"
            className="pce-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />
        </div>

        <div className="pce-field">
          <label className="pce-label">Relationship</label>
          <input
            type="text"
            className="pce-input"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder="e.g. Sister, Neighbor, Sitter"
            maxLength={60}
          />
        </div>

        <div className="pce-field">
          <label className="pce-label">Phone</label>
          <PhoneInput value={phone} onChange={setPhone} />
        </div>

        <div className="pce-field">
          <label className="pce-label">Alternate phone</label>
          <PhoneInput
            value={phoneSecondary}
            onChange={setPhoneSecondary}
            placeholder="Backup number"
          />
        </div>

        <div className="pce-field">
          <label className="pce-label">Email</label>
          <input
            type="email"
            className="pce-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            maxLength={120}
          />
        </div>

        <div className="pce-field">
          <label className="pce-label">Notes</label>
          <textarea
            className="pce-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={400}
            rows={3}
          />
        </div>
      </div>

      {errorMsg ? (
        <div className="pce-modal-error" role="alert">
          <AlertCircle size={16} strokeWidth={2.2} />
          <span>{errorMsg}</span>
        </div>
      ) : null}

      <div className="pce-modal-footer">
        <button
          type="button"
          className="pce-btn-danger-text"
          onClick={handleDeleteClick}
          disabled={saving}
        >
          {deleteConfirm ? "Tap again to confirm" : "Delete"}
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="pce-btn-secondary"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="pce-btn-primary"
            onClick={handleSubmit}
            disabled={!canSave}
          >
            {saving ? (
              <>
                <Loader2 size={14} strokeWidth={2.4} className="pce-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// =============================================================
// VET VISITS BLOCK — list + inline add + edit modal + Show more
// =============================================================

const EMPTY_VISIT_ENTRY = {
  visit_date: "",
  clinic_name: "",
  reason: "",
  notes: "",
  vet_slug: "",
};

function VetVisitsBlock({
  pet,
  setSaveStatus,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
}) {
  const FORM_ID = "visits-add";
  const addOpen = openFormId === FORM_ID;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await getPetVetVisits(pet.id);
      if (cancelled) return;
      if (!error && data) setItems(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pet.id]);

  function sortByDate(a, b) {
    const aDate = a.visit_date || "";
    const bDate = b.visit_date || "";
    return bDate.localeCompare(aDate);
  }

  async function handleAddSave(fields) {
    setSaveStatus("saving");
    const { data, error } = await addVetVisit(pet.id, fields);
    if (error) {
      setSaveStatus("error");
      console.error("addVetVisit failed:", error);
      throw new Error(
        error.message || "Could not save visit. Please try again.",
      );
    }
    setItems((prev) => [...prev, data].sort(sortByDate));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  }

  async function handleEditSave(fields) {
    setSaveStatus("saving");
    const { data, error } = await updateVetVisit(editingItem.id, fields);
    if (error) {
      setSaveStatus("error");
      console.error("updateVetVisit failed:", error);
      throw new Error(
        error.message || "Could not save changes. Please try again.",
      );
    }
    setItems((prev) =>
      prev.map((v) => (v.id === editingItem.id ? data : v)).sort(sortByDate),
    );
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  }

  async function handleDelete() {
    if (!editingItem) return false;
    setSaveStatus("saving");
    const { error } = await deleteVetVisit(editingItem.id);
    if (error) {
      setSaveStatus("error");
      console.error("deleteVetVisit failed:", error);
      throw new Error(error.message || "Could not delete. Please try again.");
    }
    setItems((prev) => prev.filter((v) => v.id !== editingItem.id));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  }

  return (
    <>
      <h3 className="pce-sub-title">Vet visit history</h3>
      <p className="pce-sub-sub">
        Past appointments — context for what&apos;s been done and why.
      </p>

      {loading ? (
        <div className="pce-list-empty">Loading…</div>
      ) : (
        <>
          {items.length === 0 && !addOpen ? (
            <div className="pce-list-empty">No visits recorded.</div>
          ) : (
            (() => {
              const sorted = items.slice().sort(sortByDate);
              return (
                <CollapsibleList
                  items={sorted}
                  limit={5}
                  noun="visits"
                  renderItem={(item) => (
                    <VetVisitItem
                      key={item.id}
                      item={item}
                      onEdit={() => {
                        setOpenFormId(null);
                        setEditingItem(item);
                      }}
                    />
                  )}
                />
              );
            })()
          )}

          {addOpen ? (
            <InlineAddVetVisits
              confirmUnsaved={confirmUnsaved}
              onCancel={() => setOpenFormId(null)}
              onSaveAll={handleAddSave}
              onDone={() => setOpenFormId(null)}
            />
          ) : (
            <button
              type="button"
              className="pce-add-btn"
              onClick={() => setOpenFormId(FORM_ID)}
            >
              <Plus size={16} strokeWidth={2.4} />
              Add vet visit
            </button>
          )}
        </>
      )}

      {editingItem ? (
        <VetVisitModal
          item={editingItem}
          confirmUnsaved={confirmUnsaved}
          onClose={() => setEditingItem(null)}
          onSave={async (fields) => {
            const ok = await handleEditSave(fields);
            if (ok) setEditingItem(null);
          }}
          onDelete={async () => {
            const ok = await handleDelete();
            if (ok) setEditingItem(null);
          }}
        />
      ) : null}
    </>
  );
}

function VetVisitItem({ item, onEdit }) {
  const dateStr = item.visit_date ? formatShortDate(item.visit_date) : null;
  const metaRows = [];
  if (item.clinic_name)
    metaRows.push({ label: "Clinic", value: item.clinic_name });
  if (item.reason) metaRows.push({ label: "Reason", value: item.reason });

  return (
    <div className="pce-list-item">
      <div className="pce-list-item-body">
        <div className="pce-list-item-title-row">
          <span className="pce-list-item-icon-inline">
            <CalendarClock size={18} strokeWidth={2} />
          </span>
          <p className="pce-list-item-title">{dateStr || "Undated visit"}</p>
        </div>
        {metaRows.length > 0 ? (
          <>
            <div className="pce-list-item-sep" />
            <div
              className="pce-list-item-meta pce-list-item-meta--vet-history"
              style={{ "--col-count": metaRows.length }}
            >
              {metaRows.map((row, i) => (
                <div key={i} className="pce-list-item-meta-row">
                  <span className="pce-list-item-meta-label">{row.label}:</span>
                  <span className="pce-list-item-meta-value">{row.value}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}
        <NotesSection notes={item.notes} />
      </div>
      <div className="pce-list-item-actions">
        <button
          type="button"
          className="pce-icon-btn"
          onClick={onEdit}
          aria-label="Edit vet visit"
        >
          <Pencil size={EDIT_ICON_SIZE} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function InlineAddVetVisits({ onCancel, onSaveAll, onDone, confirmUnsaved }) {
  const [entries, setEntries] = useState([{ ...EMPTY_VISIT_ENTRY }]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  function isBatchDirty() {
    if (entries.length !== 1) return true;
    return (
      JSON.stringify(entries[0]) !== JSON.stringify({ ...EMPTY_VISIT_ENTRY })
    );
  }
  async function handleCancel() {
    if (confirmUnsaved && isBatchDirty()) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return;
      if (choice === "save") {
        await handleSubmit();
        return;
      }
    }
    onCancel();
  }

  function updateEntry(idx, key, value) {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [key]: value } : e)),
    );
  }
  function addEntry() {
    setEntries((prev) => [...prev, { ...EMPTY_VISIT_ENTRY }]);
  }
  function removeEntry(idx) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  const canSave =
    !saving && entries.length > 0 && entries.every((e) => !!e.visit_date);

  async function handleSubmit() {
    if (!canSave) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      for (const e of entries) {
        await onSaveAll({
          visit_date: e.visit_date || null,
          clinic_name: e.clinic_name.trim() || null,
          reason: e.reason.trim() || null,
          notes: e.notes.trim() || null,
          vet_slug: e.vet_slug || null,
        });
      }
      onDone();
    } catch (err) {
      setErrorMsg(err?.message || "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const count = entries.length;
  const primaryLabel = `Add ${count} ${count === 1 ? "visit" : "visits"}`;

  return (
    <div className="pce-inline-form">
      <button
        type="button"
        className="pce-form-close"
        aria-label="Close"
        onClick={handleCancel}
      >
        <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
      </button>
      {entries.map((entry, idx) => (
        <div key={idx} className="pce-entry-card">
          <div className="pce-entry-header">
            <span className="pce-entry-label">Visit {idx + 1}</span>
            {entries.length > 1 ? (
              <button
                type="button"
                className="pce-icon-btn"
                onClick={() => removeEntry(idx)}
                aria-label={`Remove visit ${idx + 1}`}
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            ) : null}
          </div>

          <div className="pce-field">
            <label className="pce-label">
              Date{" "}
              <span className="pce-req-mark" aria-hidden="true">
                *
              </span>
            </label>
            <input
              type="date"
              className="pce-input"
              value={entry.visit_date}
              onChange={(e) => updateEntry(idx, "visit_date", e.target.value)}
            />
          </div>

          <div className="pce-field">
            <label className="pce-label">Clinic / vet</label>
            <VetAutocomplete
              value={entry.clinic_name}
              onChange={(v) => {
                updateEntry(idx, "clinic_name", v);
                if (entry.vet_slug) updateEntry(idx, "vet_slug", "");
              }}
              onPick={(vet) => {
                setEntries((prev) =>
                  prev.map((e, i) =>
                    i === idx
                      ? {
                          ...e,
                          clinic_name: vet.name || "",
                          vet_slug: vet.slug || "",
                        }
                      : e,
                  ),
                );
              }}
              placeholder="Search vets or type freely"
            />
          </div>

          <div className="pce-field">
            <label className="pce-label">Reason</label>
            <input
              type="text"
              className="pce-input"
              value={entry.reason}
              onChange={(e) => updateEntry(idx, "reason", e.target.value)}
              placeholder="e.g. Annual checkup, limping leg, vomiting"
              maxLength={200}
            />
          </div>

          <div className="pce-field">
            <label className="pce-label">Notes</label>
            <textarea
              className="pce-textarea"
              value={entry.notes}
              onChange={(e) => updateEntry(idx, "notes", e.target.value)}
              placeholder="Diagnoses, treatments, follow-up needed."
              maxLength={500}
              rows={2}
            />
          </div>
        </div>
      ))}

      <button type="button" className="pce-add-entry" onClick={addEntry}>
        <Plus size={16} strokeWidth={2.4} />
        Add another visit
      </button>

      {errorMsg ? (
        <div className="pce-modal-error" role="alert">
          <AlertCircle size={16} strokeWidth={2.2} />
          <span>{errorMsg}</span>
        </div>
      ) : null}

      <div className="pce-inline-form-actions">
        <button
          type="button"
          className="pce-btn-secondary"
          onClick={handleCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="pce-btn-primary"
          onClick={handleSubmit}
          disabled={!canSave}
        >
          {saving ? (
            <>
              <Loader2 size={14} strokeWidth={2.4} className="pce-spin" />
              Saving…
            </>
          ) : (
            primaryLabel
          )}
        </button>
      </div>
    </div>
  );
}

function VetVisitModal({ item, onClose, onSave, onDelete, confirmUnsaved }) {
  const [visitDate, setVisitDate] = useState(item?.visit_date || "");
  const [clinicName, setClinicName] = useState(item?.clinic_name || "");
  const [reason, setReason] = useState(item?.reason || "");
  const [notes, setNotes] = useState(item?.notes || "");
  const [vetSlug, setVetSlug] = useState(item?.vet_slug || "");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  function isDirty() {
    return (
      visitDate !== (item?.visit_date || "") ||
      clinicName !== (item?.clinic_name || "") ||
      reason !== (item?.reason || "") ||
      notes !== (item?.notes || "") ||
      vetSlug !== (item?.vet_slug || "")
    );
  }
  async function handleClose() {
    if (confirmUnsaved && isDirty()) {
      const choice = await confirmUnsaved();
      if (choice === "keep") return;
      if (choice === "save") {
        await handleSubmit();
        return;
      }
    }
    onClose();
  }

  const canSave = !saving && !!visitDate;

  function handlePickVet(vet) {
    setClinicName(vet.name || "");
    setVetSlug(vet.slug || "");
  }

  function handleClinicChange(text) {
    setClinicName(text);
    if (vetSlug) setVetSlug("");
  }

  async function handleSubmit() {
    if (!canSave) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await onSave({
        visit_date: visitDate || null,
        clinic_name: clinicName.trim() || null,
        reason: reason.trim() || null,
        notes: notes.trim() || null,
        vet_slug: vetSlug || null,
      });
    } catch (err) {
      setErrorMsg(err?.message || "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteClick() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000);
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      await onDelete();
    } catch (err) {
      setErrorMsg(err?.message || "Delete failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Edit vet visit" onClose={handleClose}>
      <div className="pce-modal-body">
        <div className="pce-field">
          <label className="pce-label">
            Date{" "}
            <span className="pce-req-mark" aria-hidden="true">
              *
            </span>
          </label>
          <input
            type="date"
            className="pce-input"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
          />
        </div>

        <div className="pce-field">
          <label className="pce-label">Clinic / vet</label>
          <VetAutocomplete
            value={clinicName}
            onChange={handleClinicChange}
            onPick={handlePickVet}
            placeholder="Search vets or type freely"
          />
        </div>

        <div className="pce-field">
          <label className="pce-label">Reason</label>
          <input
            type="text"
            className="pce-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
          />
        </div>

        <div className="pce-field">
          <label className="pce-label">Notes</label>
          <textarea
            className="pce-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={3}
          />
        </div>
      </div>

      {errorMsg ? (
        <div className="pce-modal-error" role="alert">
          <AlertCircle size={16} strokeWidth={2.2} />
          <span>{errorMsg}</span>
        </div>
      ) : null}

      <div className="pce-modal-footer">
        <button
          type="button"
          className="pce-btn-danger-text"
          onClick={handleDeleteClick}
          disabled={saving}
        >
          {deleteConfirm ? "Tap again to confirm" : "Delete"}
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="pce-btn-secondary"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="pce-btn-primary"
            onClick={handleSubmit}
            disabled={!canSave}
          >
            {saving ? (
              <>
                <Loader2 size={14} strokeWidth={2.4} className="pce-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// =============================================================
// INSURANCE BLOCK — single-record, inline form. Includes CareCredit toggle
// because CareCredit is a financing tool conceptually adjacent to insurance.
// =============================================================

// Top US pet insurance providers (2026). User picks from this list OR "Other"
// to type a custom name. Source: industry market share + Lemonade/Forbes 2026 rankings.
const KNOWN_INSURERS = [
  "Trupanion",
  "Healthy Paws",
  "Lemonade",
  "Embrace",
  "Pets Best",
  "Nationwide",
  "ASPCA Pet Health Insurance",
  "Spot",
  "Fetch by The Dodo",
  "MetLife Pet Insurance",
  "Figo",
  "Pumpkin",
];

function InsuranceBlock({
  pet,
  onUpdate,
  setSaveStatus,
  openFormId,
  setOpenFormId,
  confirmUnsaved,
}) {
  const FORM_ID = "insurance";
  const editing = openFormId === FORM_ID;

  const hasInsuranceData =
    pet.insurance_provider ||
    pet.insurance_policy_number ||
    pet.insurance_phone ||
    pet.insurance_notes;
  const hasCarecredit = !!pet.has_carecredit;
  const hasData = hasInsuranceData || hasCarecredit;

  function handleSave(fields) {
    return onUpdate({
      insurance_provider: fields.provider || null,
      insurance_policy_number: fields.policy_number || null,
      insurance_phone: fields.phone || null,
      insurance_notes: fields.notes || null,
      has_carecredit: !!fields.has_carecredit,
      carecredit_account: fields.carecredit_account || null,
    });
  }

  const metaRows = [];
  if (pet.insurance_policy_number)
    metaRows.push({ label: "Policy #", value: pet.insurance_policy_number });
  if (pet.insurance_phone)
    metaRows.push({
      label: "Phone",
      value: (
        <a href={phoneTelHref(pet.insurance_phone)} className="pce-link">
          {formatPhoneDisplay(pet.insurance_phone)}
        </a>
      ),
    });
  // CareCredit rows join the same metaRows array so the 2-column meta grid lays
  // them out alongside Policy/Phone (left col = insurance, right col = CareCredit).
  // On mobile they stack like every other meta row.
  if (hasCarecredit) {
    metaRows.push({ label: "CareCredit", value: "Yes" });
    if (pet.carecredit_account) {
      metaRows.push({
        label: "CareCredit #",
        value: pet.carecredit_account,
      });
    }
  }

  return (
    <>
      <h3 className="pce-sub-title">Insurance &amp; financing</h3>
      <p className="pce-sub-sub">
        Pet insurance and CareCredit account info — useful at the ER.
      </p>

      {hasData && !editing ? (
        <div className="pce-list">
          <div className="pce-list-item">
            <div className="pce-list-item-body">
              <div className="pce-list-item-title-row">
                <span className="pce-list-item-icon-inline">
                  <ShieldCheck size={18} strokeWidth={2} />
                </span>
                <p className="pce-list-item-title">
                  {pet.insurance_provider ||
                    (hasCarecredit ? "CareCredit only" : "Insurance")}
                </p>
              </div>
              {metaRows.length > 0 ? (
                <>
                  <div className="pce-list-item-sep" />
                  {/* Insurance card uses 2-column grid on desktop so Policy/Phone
                      and CareCredit info live side-by-side. On mobile rows stack. */}
                  <div
                    className="pce-list-item-meta pce-list-item-meta--insurance"
                    style={{ "--col-count": 2 }}
                  >
                    {metaRows.map((row, i) => (
                      <div key={i} className="pce-list-item-meta-row">
                        <span className="pce-list-item-meta-label">
                          {row.label}:
                        </span>
                        <span className="pce-list-item-meta-value">
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
              <NotesSection notes={pet.insurance_notes} />
            </div>
            <div className="pce-list-item-actions">
              <button
                type="button"
                className="pce-icon-btn"
                onClick={() => setOpenFormId(FORM_ID)}
                aria-label="Edit insurance"
              >
                <Pencil size={EDIT_ICON_SIZE} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!hasData && !editing ? (
        <div className="pce-list-empty">
          No insurance or CareCredit info on file.
        </div>
      ) : null}

      <Collapse open={editing}>
        <InlineInsuranceForm
          confirmUnsaved={confirmUnsaved}
          initial={{
            provider: pet.insurance_provider || "",
            policy_number: pet.insurance_policy_number || "",
            phone: pet.insurance_phone || "",
            notes: pet.insurance_notes || "",
            has_carecredit: !!pet.has_carecredit,
            carecredit_account: pet.carecredit_account || "",
          }}
          onCancel={() => setOpenFormId(null)}
          onSave={async (fields) => {
            const ok = await handleSave(fields);
            if (ok) setOpenFormId(null);
          }}
          onClear={async () => {
            const ok = await handleSave({
              provider: "",
              policy_number: "",
              phone: "",
              notes: "",
              has_carecredit: false,
              carecredit_account: "",
            });
            if (ok) setOpenFormId(null);
          }}
          hasData={hasData}
        />
      </Collapse>
      {!editing &&
        (!hasData ? (
          // Same reasoning as PrimaryVetBlock — the pencil icon on the existing
          // card is the edit affordance; a "+ Edit" button below would be
          // redundant.
          <button
            type="button"
            className="pce-add-btn"
            onClick={() => setOpenFormId(FORM_ID)}
          >
            <Plus size={16} strokeWidth={2.4} />
            Add insurance
          </button>
        ) : null)}
    </>
  );
}

function InlineInsuranceForm({
  initial,
  onCancel,
  onSave,
  onClear,
  hasData,
  confirmUnsaved,
}) {
  // Provider can be a known insurer OR "Other" (free text in a second field).
  const isKnown = KNOWN_INSURERS.includes(initial.provider);
  const [providerChoice, setProviderChoice] = useState(
    initial.provider ? (isKnown ? initial.provider : "__other__") : "",
  );
  const [providerOther, setProviderOther] = useState(
    isKnown ? "" : initial.provider,
  );
  const [policyNumber, setPolicyNumber] = useState(initial.policy_number);
  const [phone, setPhone] = useState(initial.phone);
  const [notes, setNotes] = useState(initial.notes);
  const [hasCarecredit, setHasCarecredit] = useState(!!initial.has_carecredit);
  const [carecreditAccount, setCarecreditAccount] = useState(
    initial.carecredit_account || "",
  );
  const [clearConfirm, setClearConfirm] = useState(false);
  // Autosave-on-unmount support — refs let cleanup see latest draft state
  const skipAutosaveRef = useRef(false);
  const draftRef = useRef(null);
  draftRef.current = {
    providerChoice,
    providerOther,
    policyNumber,
    phone,
    notes,
    hasCarecredit,
    carecreditAccount,
  };
  const initialRef = useRef(initial);

  function buildFields(d) {
    const finalProvider =
      d.providerChoice === "__other__"
        ? (d.providerOther || "").trim()
        : d.providerChoice;
    return {
      provider: finalProvider,
      policy_number: (d.policyNumber || "").trim(),
      phone: (d.phone || "").trim(),
      notes: (d.notes || "").trim(),
      has_carecredit: d.hasCarecredit,
      carecredit_account: d.hasCarecredit
        ? (d.carecreditAccount || "").trim()
        : "",
    };
  }

  // Autosave on unmount: when this form is closed by another opening,
  // commit any pending changes. Skipped on explicit Cancel/Clear/Save.
  useEffect(() => {
    return () => {
      if (skipAutosaveRef.current) return;
      const d = draftRef.current;
      const init = initialRef.current;
      const fresh = buildFields(d);
      const wasKnown = KNOWN_INSURERS.includes(init.provider);
      const initFields = {
        provider: init.provider || "",
        policy_number: init.policy_number || "",
        phone: init.phone || "",
        notes: init.notes || "",
        has_carecredit: !!init.has_carecredit,
        carecredit_account: init.has_carecredit
          ? init.carecredit_account || ""
          : "",
      };
      const dirty =
        fresh.provider !== initFields.provider ||
        fresh.policy_number !== initFields.policy_number ||
        fresh.phone !== initFields.phone ||
        fresh.notes !== initFields.notes ||
        fresh.has_carecredit !== initFields.has_carecredit ||
        fresh.carecredit_account !== initFields.carecredit_account;
      void dirty;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function isInsuranceFormDirty() {
    const d = draftRef.current;
    const init = initialRef.current;
    const fresh = buildFields(d);
    const initFields = {
      provider: init.provider || "",
      policy_number: init.policy_number || "",
      phone: init.phone || "",
      notes: init.notes || "",
      has_carecredit: !!init.has_carecredit,
      carecredit_account: init.has_carecredit
        ? init.carecredit_account || ""
        : "",
    };
    return (
      fresh.provider !== initFields.provider ||
      fresh.policy_number !== initFields.policy_number ||
      fresh.phone !== initFields.phone ||
      fresh.notes !== initFields.notes ||
      fresh.has_carecredit !== initFields.has_carecredit ||
      fresh.carecredit_account !== initFields.carecredit_account
    );
  }

  function handleSubmit() {
    skipAutosaveRef.current = true;
    onSave(buildFields(draftRef.current));
  }

  async function handleCancel() {
    skipAutosaveRef.current = true;
    if (confirmUnsaved && isInsuranceFormDirty()) {
      const choice = await confirmUnsaved();
      if (choice === "keep") {
        skipAutosaveRef.current = false;
        return;
      }
      if (choice === "save") {
        handleSubmit();
        return;
      }
    }
    onCancel();
  }

  function handleClear() {
    if (!clearConfirm) {
      setClearConfirm(true);
      setTimeout(() => setClearConfirm(false), 3000);
      return;
    }
    skipAutosaveRef.current = true;
    onClear();
  }

  return (
    <div className="pce-inline-form">
      <button
        type="button"
        className="pce-form-close"
        aria-label="Close"
        onClick={handleCancel}
      >
        <X size={CLOSE_ICON_SIZE} strokeWidth={2.2} />
      </button>
      <div className="pce-entry-card">
        <div className="pce-entry-header">
          <span className="pce-entry-label">Insurance &amp; financing</span>
        </div>

        <div className="pce-field">
          <label className="pce-label">Provider</label>
          <select
            className="pce-input"
            value={providerChoice}
            onChange={(e) => setProviderChoice(e.target.value)}
          >
            <option value="">Select a provider…</option>
            {KNOWN_INSURERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            <option value="__other__">Other (enter manually)</option>
          </select>
        </div>

        {providerChoice === "__other__" ? (
          <div className="pce-field">
            <label className="pce-label">Provider name</label>
            <input
              type="text"
              className="pce-input"
              value={providerOther}
              onChange={(e) => setProviderOther(e.target.value)}
              placeholder="Type your insurance provider"
              maxLength={120}
              autoFocus
            />
          </div>
        ) : null}

        <div className="pce-field">
          <label className="pce-label">Policy number</label>
          <input
            type="text"
            className="pce-input"
            value={policyNumber}
            onChange={(e) => setPolicyNumber(e.target.value)}
            placeholder="Account / policy ID"
            maxLength={80}
          />
        </div>

        <div className="pce-field">
          <label className="pce-label">Phone</label>
          <PhoneInput
            value={phone}
            onChange={setPhone}
            placeholder="Customer service number"
          />
        </div>

        <div className="pce-field">
          <label className="pce-label">Notes</label>
          <textarea
            className="pce-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Coverage details, deductible, claim notes."
            maxLength={500}
            rows={3}
          />
        </div>

        {/* CareCredit account — financial reference, not authorization */}
        <label className="pce-checkbox-row">
          <input
            type="checkbox"
            checked={hasCarecredit}
            onChange={(e) => setHasCarecredit(e.target.checked)}
          />
          <span>We have a CareCredit account</span>
        </label>

        {hasCarecredit ? (
          <div className="pce-field">
            <label className="pce-label">CareCredit account (optional)</label>
            <input
              type="text"
              className="pce-input"
              value={carecreditAccount}
              onChange={(e) => setCarecreditAccount(e.target.value)}
              placeholder="Last 4 digits or full account #"
              maxLength={40}
            />
            <p className="pce-field-hint">
              For your records. Only the cardholder can authorize charges —
              share the account number only with people you trust.
            </p>
          </div>
        ) : null}
      </div>

      <div className="pce-inline-form-actions pce-inline-form-actions--split">
        {hasData ? (
          <button
            type="button"
            className="pce-btn-danger-text"
            onClick={handleClear}
          >
            {clearConfirm ? "Tap again to confirm" : "Clear"}
          </button>
        ) : (
          <span />
        )}
        <div className="pce-inline-form-actions-right">
          <button
            type="button"
            className="pce-btn-secondary"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="pce-btn-primary"
            onClick={handleSubmit}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// HELPLINE FOOTER — static info card for Pet Poison Helpline
// =============================================================

function HelplineFooter() {
  return (
    <div className="pce-helpline-card">
      <div className="pce-helpline-icon">
        <PhoneCall size={20} strokeWidth={2} />
      </div>
      <div className="pce-helpline-body">
        <p className="pce-helpline-title">Pet Poison Helpline</p>
        <p className="pce-helpline-sub">
          24/7 expert advice if your pet eats something dangerous.
        </p>
        <a href="tel:18884264435" className="pce-helpline-phone">
          (888) 426-4435
        </a>
      </div>
    </div>
  );
}

// ============================================================================
// Phone number helpers — applied across every input + display in this editor.
//
// Storage rule: phone fields store digits ONLY (no formatting). Format applied
// on render. This keeps the data clean and lets us re-format consistently.
// ============================================================================

// Strip everything except digits. Used in onChange of phone inputs.
function cleanPhoneInput(value) {
  if (!value) return "";
  return String(value).replace(/\D/g, "").slice(0, 15);
}

// Format a digits-only phone number for display.
// 10 digits: (555) 124-7654
// 11 digits starting with 1: +1 (555) 124-7654
// Anything else: return as-is (user can still see what they typed)
function formatPhoneDisplay(digits) {
  if (!digits) return "";
  const s = String(digits).replace(/\D/g, "");
  if (s.length === 10) {
    return `(${s.slice(0, 3)}) ${s.slice(3, 6)}-${s.slice(6)}`;
  }
  if (s.length === 11 && s.startsWith("1")) {
    return `+1 (${s.slice(1, 4)}) ${s.slice(4, 7)}-${s.slice(7)}`;
  }
  return s;
}

// Build a tel: href from any phone string (digits or formatted).
function phoneTelHref(value) {
  if (!value) return "";
  const s = String(value).replace(/\D/g, "");
  if (s.length === 10) return `tel:+1${s}`;
  if (s.length === 11) return `tel:+${s}`;
  if (s.length > 0) return `tel:${s}`;
  return "";
}

// Build 2-line vet address fields from directory data.
// Returns { line1, line2 } where:
//   line1 = street address
//   line2 = "City, State Zip"
// These are stored as SEPARATE database columns (e.g. primary_vet_address +
// primary_vet_address_line2) so the display is clean without embedded newlines.
function buildVetAddress(vet) {
  const street = (vet.address || "").trim();
  const cityState = [vet.city, vet.state].filter(Boolean).join(", ");
  const parts = [];
  if (cityState) parts.push(cityState);
  if (vet.zip_code) parts.push(vet.zip_code);
  const line2 = parts.join(" ");
  return { line1: street, line2 };
}

// Smart display split for addresses with old single-field data. Used when
// `address_line2` is empty but `address` contains an inline separator (comma
// or period) that suggests a street/city boundary.
//
// Splits at the FIRST occurrence of ", " or ". " (with following space) so the
// street stays on line 1 and the city/state/zip lands on line 2. Recognizing
// "." handles legacy data entries where users typed periods instead of commas
// (e.g. "3315 Pierson St. Oakland. CA 94619").
//
// If neither separator is found, returns { line1, line2: "" } — single-line
// display. This is for DISPLAY only — does not modify stored data. Users who
// edit the vet entry will get separate input fields and the data will be
// migrated to the new schema naturally.
function splitAddressForDisplay(addr, line2) {
  const a = (addr || "").trim();
  const l2 = (line2 || "").trim();
  // If line2 is already populated, use the data as-is
  if (l2) return { line1: a, line2: l2 };
  // No line2 — try to find a separator. We look for "<sep><space>" patterns so
  // we don't break on periods inside abbreviations without a following space
  // (e.g. "U.S.A.") — though those rarely appear in addresses.
  const sepRegex = /(?:,|\.) /;
  const match = a.match(sepRegex);
  if (!match) return { line1: a, line2: "" };
  const idx = a.indexOf(match[0]);
  return {
    line1: a.slice(0, idx).trim(),
    line2: a.slice(idx + match[0].length).trim(),
  };
}

// Controlled phone input. Stores digits internally; displays formatted text.
// Pass `value` as either digits or formatted text — we always clean before
// invoking onChange, so the parent's state stays clean digits.
function PhoneInput({ value, onChange, placeholder, id, ariaLabel }) {
  const digits = cleanPhoneInput(value);
  const display = formatPhoneDisplay(digits);
  const isComplete = digits.length === 10 || digits.length === 11;
  const isPartial = digits.length > 0 && !isComplete;
  return (
    <input
      id={id}
      type="tel"
      className="pce-input"
      value={display}
      onChange={(e) => onChange(cleanPhoneInput(e.target.value))}
      placeholder={placeholder || "(555) 123-4567"}
      maxLength={20}
      autoComplete="tel"
      inputMode="tel"
      aria-label={ariaLabel}
      aria-invalid={isPartial ? "true" : undefined}
    />
  );
}

function formatShortDate(isoDate) {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Returns vaccination status pill metadata for a given next_due date
function getVaccinationStatus(nextDue) {
  if (!nextDue) return null;
  const due = new Date(nextDue);
  if (isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const msIn30Days = 30 * 24 * 60 * 60 * 1000;
  const diff = due.getTime() - today.getTime();
  if (diff < 0) return { kind: "overdue", label: "Overdue" };
  if (diff <= msIn30Days) return { kind: "soon", label: "Due soon" };
  return { kind: "ok", label: "Up to date" };
}
