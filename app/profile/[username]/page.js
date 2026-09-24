"use client";

import { ArtEmptyPets } from "../../../components/BrandArt";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import {
  convertWeightTo,
  roundForDisplay,
  getPublicHeroCards,
} from "../../../lib/petCardApi";
import HeroNameplate from "../../../components/HeroNameplate";
import {
  LEVELS,
  TIERS,
  levelGradient,
  tierGradient,
  fullPetProfile,
  fullOwnerProfile,
  memberDays,
  calculateLevel,
  computeLevelState,
  computeLevelStateFromSignals,
  buildLadderView,
  tierForLevel,
  computeCareCompleteCount,
} from "../../../lib/levelSystem";
import LevelProgress from "../../../components/LevelProgress";
import Link from "next/link";
import { useToast } from "../../../components/ToastProvider";
import {
  Camera,
  X,
  Plus,
  Lock,
  Sprout,
  HandHelping,
  Compass,
  Megaphone,
  Mountain,
  Dog,
  Cat,
  Bird,
  Rabbit,
  Fish,
  Sparkles,
  Shapes,
  AlertTriangle,
  Circle,
  PawPrint,
  Feather,
  Leaf,
  Bone,
  Heart,
  Pencil,
  ShieldCheck,
  Stethoscope,
  Search,
  DollarSign,
  Trash2,
  Upload,
  ArrowRight,
  Check,
  ChevronDown,
} from "lucide-react";
import PageLoader from "../../../components/PageLoader";

const SESSION_KEY = "petparrk_symptom_session";

// ─── Brand tokens ────────────────────────────────────────────────────────
const C = {
  navyDark: "#172531",
  navyDeeper: "#060E16",
  navyMid: "#2C4657",
  terracotta: "#CF5C36",
  terracottaDark: "#A8471D",
  gold: "#EFC88B",
  goldDark: "#C9A467",
  cream: "#F5F0E8",
  white: "#FFFFFF",
  slate: "#4B5563",
  muted: "#717A86",
  border: "#EDE8E0",
  borderStrong: "#DAD3C5",
  success: "#1A6641",
  successBg: "#EDFAF3",
  warning: "#8B3A1E",
  warningBg: "#FEF3EB",
  error: "#C94040",
};

// ─── Banner palette — chromatic 4-stop gradients ────────────────────────
const BANNER_PALETTE = {
  dog: {
    label: "Caramel",
    title: "Dog",
    group: "species",
    stops: ["#F09A5A", "#D25F1F", "#A8400F", "#752807"],
    text: "#FFEFD9",
    accent: "#B95A18",
  },
  cat: {
    label: "Plum",
    title: "Cat",
    group: "species",
    stops: ["#B967A8", "#8E3B7C", "#6A2660", "#471945"],
    text: "#F4DDF0",
    accent: "#6A2660",
  },
  bird: {
    label: "Sky",
    title: "Bird",
    group: "species",
    stops: ["#6BB0DC", "#2E7AA8", "#1B5C82", "#0E3D5A"],
    text: "#DCEAF6",
    accent: "#1B5C82",
  },
  small_furry: {
    label: "Honey",
    title: "Small Furry",
    group: "species",
    stops: ["#FFD98A", "#F0B23A", "#C98C10", "#8A5D04"],
    text: "#FFF1D5",
    accent: "#B57614",
  },
  reptile_fish: {
    label: "Sage",
    title: "Reptile/Fish",
    group: "species",
    stops: ["#7CBB57", "#4A8A2E", "#33641E", "#1B4012"],
    text: "#DCF1E2",
    accent: "#1A6638",
  },
  mixed: {
    label: "Royal Violet",
    title: "Mixed",
    group: "species",
    stops: ["#9D7AEB", "#6B3FCB", "#4A2A9E", "#2D1968"],
    text: "#E5DDF8",
    accent: "#6B3FCB",
  },
  emerald: {
    label: "Emerald Forest",
    group: "extra",
    stops: ["#3FCFA0", "#0E8060", "#0A5A45", "#043A2C"],
    text: "#D6F4E5",
    accent: "#0A5A45",
  },
  copper: {
    label: "Copper Bronze",
    group: "extra",
    stops: ["#D9A15C", "#A9702E", "#7E4F1C", "#4A2C0D"],
    text: "#FFE3D2",
    accent: "#973A0E",
  },
  teal: {
    label: "Midnight Teal",
    group: "extra",
    stops: ["#46B5C0", "#0E6973", "#084850", "#042C32"],
    text: "#D6EFEF",
    accent: "#084850",
  },
  rose: {
    label: "Rose Gold",
    group: "extra",
    stops: ["#F8A8B4", "#D85F70", "#A93D52", "#6E2034"],
    text: "#F9DBDF",
    accent: "#A93D52",
  },
  mono: {
    label: "Mono Navy",
    group: "extra",
    stops: ["#3B5570", "#1A2D44", "#0F1F2E", "#060F1A"],
    text: "#D7DFEC",
    accent: "#1A2D44",
  },
};

const BANNER_LUCIDE = {
  dog: Dog,
  cat: Cat,
  bird: Bird,
  small_furry: Rabbit,
  reptile_fish: Fish,
  // An assortment of shapes — a mixed bag. Sparkles read as "magic", which
  // is Auto's job.
  mixed: Shapes,
};

function pageGradient(key) {
  const stops = BANNER_PALETTE[key]?.stops || BANNER_PALETTE.mixed.stops;
  return `linear-gradient(15deg, ${stops[0]} 0%, ${stops[1]} 30%, ${stops[2]} 65%, ${stops[3]} 100%)`;
}

function speciesBucket(species) {
  if (!species) return null;
  const s = String(species).toLowerCase().trim();
  if (s.startsWith("dog")) return "dog";
  if (s.startsWith("cat")) return "cat";
  if (s.startsWith("bird")) return "bird";
  if (
    s.startsWith("rabbit") ||
    s.startsWith("hamster") ||
    s.startsWith("guinea") ||
    s.startsWith("ferret") ||
    s.startsWith("otter") ||
    s.startsWith("rat") ||
    s.startsWith("mouse")
  )
    return "small_furry";
  if (
    s.startsWith("reptile") ||
    s.startsWith("fish") ||
    s.startsWith("snake") ||
    s.startsWith("lizard") ||
    s.startsWith("turtle") ||
    s.startsWith("frog") ||
    s.startsWith("gecko")
  )
    return "reptile_fish";
  return null;
}

// Auto-grow textarea — fits its content height as the user types AND when
// the value is set programmatically (e.g. a long saved bio loaded into the
// edit form). The useEffect on [value] is what fixes the "content cut off
// after save / on reopen" issue, especially on mobile where the CSS resize
// handle does nothing. Forwards all other textarea props through.
function AutoGrowTextarea({ value, style, minHeight, ...rest }) {
  const ref = useRef(null);
  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };
  useEffect(() => {
    resize();
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onInput={resize}
      style={{
        resize: "none",
        overflow: "hidden",
        minHeight: minHeight || "84px",
        ...style,
      }}
      {...rest}
    />
  );
}

function autoBannerKey(pets) {
  if (!pets || pets.length === 0) return "mixed";
  const buckets = new Set();
  pets.forEach((p) => {
    const b = speciesBucket(p.species) || "other";
    buckets.add(b);
  });
  if (buckets.size > 1) return "mixed";
  const only = [...buckets][0];
  return BANNER_PALETTE[only] ? only : "mixed";
}

// Level system (TIERS, computeLevelState, helpers) imported from lib/levelSystem.

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

function meaningfulField(val) {
  if (!val) return null;
  const lower = String(val).trim().toLowerCase();
  if (
    !lower ||
    lower === "none" ||
    lower === "nothing" ||
    lower === "n/a" ||
    lower === "na" ||
    lower === "no" ||
    lower === "-"
  )
    return null;
  return val;
}

function shortenForChip(raw, max = 20) {
  const v = meaningfulField(raw);
  if (!v) return null;
  const first = String(v).split(/[,;]/)[0].trim();
  if (first.length > max) return first.slice(0, max - 1) + "…";
  return first;
}

function speciesCardGradient(species) {
  const bucket = speciesBucket(species);
  switch (bucket) {
    case "dog":
      return "linear-gradient(135deg, #C97A3D 0%, #7A4520 100%)";
    case "cat":
      return "linear-gradient(135deg, #7B4B6E 0%, #4A2C44 100%)";
    case "bird":
      return "linear-gradient(135deg, #5C8FA8 0%, #2C5F6B 100%)";
    case "small_furry":
      return "linear-gradient(135deg, #D9A05B 0%, #A06A2E 100%)";
    case "reptile_fish":
      return "linear-gradient(135deg, #6B8E6F 0%, #3E5C42 100%)";
    default:
      return "linear-gradient(135deg, #717A86 0%, #2C4657 100%)";
  }
}

// Hero wallpaper — paws + feathers + sparkles + leaves for mixed; species-specific for others
function HeroWallpaper({ bannerKey }) {
  // ─── Desktop / tablet positions (≥601px viewport) ──────────────────────
  // Edit these freely — each entry controls one icon's position, size,
  // rotation and opacity on desktop and tablet
  const positionsDesktop = [
    // CONTENT ZONE (where King's name/bio sits) — denser, higher opacity
    { top: "8%", left: "20%", size: 38, rot: 22, opacity: 0.18 },
    { top: "30%", left: "12%", size: 32, rot: -12, opacity: 0.16 },
    { top: "10%", left: "55%", size: 44, rot: 18, opacity: 0.1 },
    { top: "4%", left: "72%", size: 36, rot: -22, opacity: 0.08 },
    { top: "26%", left: "28%", size: 40, rot: 8, opacity: 0.08 }, // Icon near username
    { top: "30%", left: "48%", size: 34, rot: -16, opacity: 0.08 },
    { top: "28%", left: "65%", size: 42, rot: 24, opacity: 0.08 },
    { top: "50%", left: "18%", size: 36, rot: -10, opacity: 0.18 },
    { top: "46%", left: "40%", size: 30, rot: 26, opacity: 0.0 },
    { top: "42%", left: "58%", size: 44, rot: -18, opacity: 0.08 },
    { top: "48%", left: "81%", size: 36, rot: 14, opacity: 0.1 },
    { top: "60%", left: "28%", size: 32, rot: -24, opacity: 0.19 },
    { top: "50%", left: "39%", size: 32, rot: 12, opacity: 0.17 },
    { top: "62%", left: "65%", size: 38, rot: -8, opacity: 0.18 },
    { top: "78%", left: "32%", size: 36, rot: 28, opacity: 0.18 },
    { top: "72%", left: "48%", size: 42, rot: -14, opacity: 0.12 },
    { top: "80%", left: "70%", size: 34, rot: 20, opacity: 0.17 },
    { top: "92%", left: "20%", size: 38, rot: -26, opacity: 0.18 },
    { top: "94%", left: "60%", size: 32, rot: 10, opacity: 0.16 },

    // EDGES (gutters) — fewer, slightly lower opacity for accent only
    { top: "20%", left: "4%", size: 36, rot: -14, opacity: 0.14 },
    { top: "60%", left: "5%", size: 40, rot: 22, opacity: 0.15 },
    { top: "15%", left: "88%", size: 38, rot: 18, opacity: 0.14 },
    { top: "60%", left: "93%", size: 36, rot: -10, opacity: 0.15 },
    { top: "88%", left: "8%", size: 34, rot: 26, opacity: 0.13 },
    { top: "88%", left: "85%", size: 36, rot: -22, opacity: 0.13 },
  ];

  // ─── Mobile positions (≤600px viewport) ────────────────────────────────
  // Independent from desktop — edit positions, sizes, rotations, opacities
  // Narrow viewport so positions span 5%-90% horizontal
  const positionsMobile = [
    { top: "5%", left: "7%", size: 30, rot: -14, opacity: 0.08 },
    { top: "10%", left: "82%", size: 28, rot: 22, opacity: 0.1 },
    { top: "26%", left: "64%", size: 32, rot: -8, opacity: 0.06 },
    { top: "44%", left: "12%", size: 28, rot: 18, opacity: 0.1 },
    { top: "48%", left: "76%", size: 30, rot: -22, opacity: 0.1 },
    { top: "62%", left: "44%", size: 30, rot: 14, opacity: 0.06 },
    { top: "80%", left: "10%", size: 28, rot: -18, opacity: 0.15 },
    { top: "84%", left: "50%", size: 32, rot: 24, opacity: 0.1 },
    { top: "82%", left: "82%", size: 28, rot: -10, opacity: 0.1 },
  ];

  // Detect viewport — picks correct list at render time + on resize
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const positions = isMobile ? positionsMobile : positionsDesktop;

  // Pool of 10 Lucide icons that mix well at low opacity:
  // species shapes + organic/decorative shapes
  const MIXED_POOL = [
    PawPrint,
    Feather,
    Sparkles,
    Leaf,
    Bone,
    Cat,
    Dog,
    Fish,
    Bird,
    Heart,
  ];
  const isMixed = bannerKey === "mixed";
  const SpeciesIcon = BANNER_LUCIDE[bannerKey] || Sparkles;

  const pickIcon = (i) => {
    if (isMixed) return MIXED_POOL[i % MIXED_POOL.length];
    // Single species: rotate species icon + complementary shapes
    const single = [
      SpeciesIcon,
      PawPrint,
      SpeciesIcon,
      Sparkles,
      SpeciesIcon,
      Leaf,
      SpeciesIcon,
      Heart,
    ];
    return single[i % single.length];
  };

  return (
    <div className="pp-hero-wallpaper" aria-hidden="true">
      {positions.map((p, i) => {
        const Icon = pickIcon(i);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: p.top,
              left: p.left,
              transform: `rotate(${p.rot}deg)`,
              opacity: p.opacity,
              color: "#fff",
              pointerEvents: "none",
            }}
          >
            <Icon size={p.size} strokeWidth={1.6} />
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// PROFILE NOT FOUND
// Shown when the username doesn't exist or the profile isn't public.
// This is an ERROR state, not a loading state — never show a spinner here,
// or the visitor waits forever for something that will never load.
// ════════════════════════════════════════════════════════════════════════
function ProfileNotFound() {
  return (
    <div className="pp-notfound">
      <p className="pp-notfound-title">We couldn&apos;t find that profile.</p>
      <p className="pp-notfound-sub">
        The link may be incorrect, or this profile isn&apos;t public.
      </p>
      <Link href="/" className="pp-notfound-btn">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to PetParrk
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
        .pp-notfound-title { 
          font-size: 20px; 
          font-weight: 800; 
          margin: 0; 
        }
        .pp-notfound-sub {
          font-size: 16px; 
          font-weight: 500; 
          color: #4B5563;
          margin: 0 0 10px; 
          max-width: 380px; 
          line-height: 1.5;
        }
        .pp-notfound-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 24px;
          height: 42px;
          border-radius: 12px;
          background: #CF5C36;
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          text-decoration: none;
          border: 2px solid #CF5C36;
          transition: background 0.15s, color 0.15s;
        }
        .pp-notfound-btn:hover { 
          background: #fff; 
          color: #CF5C36; 
        }
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════
export default function ProfilePage() {
  const router = useRouter();
  const showToast = useToast();
  const searchParams = useSearchParams();
  const previewMode = searchParams.get("preview") === "public";
  const routeParams = useParams();
  const usernameFromUrl = routeParams?.username || null;

  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [pets, setPets] = useState([]);
  const [publicHeroCards, setPublicHeroCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cityState, setCityState] = useState("");
  const [latestChecks, setLatestChecks] = useState({});
  const [checkedPetIds, setCheckedPetIds] = useState([]);
  const [counts, setCounts] = useState({
    saved: 0,
    checks: 0,
    submissions: 0,
    verifiedSubmissions: 0,
  });
  // Product-depth signals for the XP gates (owner-only load path).
  const [careCompleteCount, setCareCompleteCount] = useState(0);
  // For public visitors (non-owners): level state computed from the
  // get_profile_level_signals RPC, so the badge is always fresh + correct
  // without cached_level. Null until the RPC returns.
  const [publicLevelState, setPublicLevelState] = useState(null);
  const [heroPublished, setHeroPublished] = useState(false);

  const [editingProfile, setEditingProfile] = useState(false);
  const [showAddPet, setShowAddPet] = useState(false);
  const [justSavedPet, setJustSavedPet] = useState(null);
  const [editingPetId, setEditingPetId] = useState(null);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [expandedTiers, setExpandedTiers] = useState({});
  const [celebrate, setCelebrate] = useState(null);
  // Lock background scroll while the level modal is open (same pattern as
  // UnsavedChangesModal — site-standard, compensates for scrollbar width).
  useEffect(() => {
    if (!showLevelModal) return;
    const body = document.body;
    // `overflow: hidden` alone does not stop scrolling in iOS Safari. Pinning
    // the body and offsetting it by the current scroll is what works; the
    // offset is restored with scrollTo on close so the page doesn't jump.
    const scrollY = window.scrollY;
    const scrollBarComp =
      window.innerWidth - document.documentElement.clientWidth;
    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
    };
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    if (scrollBarComp > 0) {
      body.style.paddingRight = `${scrollBarComp}px`;
    }
    return () => {
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.paddingRight = prev.paddingRight;
      window.scrollTo(0, scrollY);
    };
  }, [showLevelModal]);
  const [usernameError, setUsernameError] = useState("");

  const [profileForm, setProfileForm] = useState({
    full_name: "",
    username: "",
    bio: "",
    zip_code: "",
    is_public: false,
    show_location_public: true,
    show_bio_public: true,
    banner_color: "auto",
  });

  const emptyPetForm = {
    name: "",
    species: "Dog",
    species_other: "",
    breed: "",
    sex: "",
    birthday: "",
    weight_value: "",
    weight_unit: "lbs",
    allergies: "",
    medications: "",
    microchip_number: "",
    notes: "",
    owner_name: "",
    owner_phone: "",
    owner_email: "",
    vet_name: "",
    vet_address: "",
    vet_city: "",
    vet_zip: "",
    vet_phone: "",
  };
  const [petForm, setPetForm] = useState(emptyPetForm);
  const [microchipError, setMicrochipError] = useState("");
  const [pendingPetPhoto, setPendingPetPhoto] = useState(null);

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingPetPhoto, setUploadingPetPhoto] = useState(null);
  const [convertingPhoto, setConvertingPhoto] = useState(false);

  const fileInputRef = useRef(null);
  const petPhotoRefs = useRef({});
  const newPetPhotoRef = useRef(null);
  const formAreaRef = useRef(null);
  const petFormRef = useRef(null);
  const packSectionRef = useRef(null);

  // ─── Auth ────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      // Only redirect to /auth if there is NO public profile to view.
      // Public visitors can view /profile/[username] without signing in.
      if (!data.session && !usernameFromUrl) router.push("/auth");
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s && !usernameFromUrl) router.push("/auth");
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usernameFromUrl]);

  // ─── Fetch ───────────────────────────────────────────────────────────
  useEffect(() => {
    // Allow public visitors (no session) to view public profiles by username
    let cancelled = false;
    async function fetchData() {
      // Explicit safe column list — never select("*") on a publicly-readable
      // table. Internal moderation fields (status, is_flagged, flag_reason) are
      // deliberately excluded so they can't leak to public profile visitors.
      let profileQuery = supabase
        .from("profiles")
        .select(
          "id, username, full_name, bio, avatar_url, banner_color, is_public, show_bio_public, show_location_public, zip_code, cached_level, cached_pets_count, cached_full_pets_count, cached_saved_count, cached_checks_count, cached_verified_count, cached_distinct_checked_pets, cached_banner, has_seen_welcome, created_at",
        );
      if (usernameFromUrl) {
        profileQuery = profileQuery.eq("username", usernameFromUrl);
      } else if (session) {
        profileQuery = profileQuery.eq("id", session.user.id);
      } else {
        setLoading(false);
        return;
      }
      const { data: profileData } = await profileQuery.single();

      if (cancelled) return;

      if (profileData) {
        setProfile(profileData);

        // Published Hero cards for the public profile grid. Uses the
        // SECURITY-DEFINER RPC (getPublicHeroCards) which is safe for anonymous
        // visitors and returns ONLY showcase columns (no medical/PII), gated on
        // is_public + hero_is_published + share_enabled + show_on_profile. The
        // same set shows for everyone (owner, other users, logged out).
        if (usernameFromUrl) {
          getPublicHeroCards(profileData.username)
            .then(({ data }) => {
              if (!cancelled) setPublicHeroCards(data || []);
            })
            .catch(() => {
              if (!cancelled) setPublicHeroCards([]);
            });
        }
        // If the viewer is NOT the owner (logged out, or a different user),
        // compute this profile's level fresh from the DB via the RPC — no
        // dependence on cached_level. Owners compute live from their own data.
        const viewerIsOwner =
          !previewMode && !!session && session.user?.id === profileData.id;
        if (!viewerIsOwner && profileData.username) {
          try {
            const { data: sig, error: sigErr } = await supabase.rpc(
              "get_profile_level_signals",
              { p_username: profileData.username },
            );
            if (!cancelled && sig && !sigErr) {
              setPublicLevelState(computeLevelStateFromSignals(sig));
            }
          } catch {
            /* RPC unavailable — badge falls back to cached_level below. */
          }
        }
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
      } else if (session && !usernameFromUrl) {
        // Owner viewing their own profile for the first time — auto-create row.
        // Skip for public visitors viewing /profile/[username] (no session, or different user).
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

      // Pets, counts, and symptom checks require an authenticated session.
      // Public visitors viewing a public profile by username skip these fetches —
      // they only need the profile data + verifiedSubmissions count (fetched below).
      if (session) {
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

        // Owner viewing own profile — write cached stats back so public
        // visitors can see accurate level badges without needing RLS access.
        // Gather latest symptom checks (if any) for pet cards + level calc.
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

        // Single cached-stats write — OWNER ONLY (petsData/counts are the
        // session user's; a non-owner writing here would corrupt the viewed
        // profile). Runs on every owner self-view, even with no pets/checks,
        // so the public profile never shows a stale level/banner.
        if (
          !cancelled &&
          session &&
          profileData?.id &&
          session.user.id === profileData.id
        ) {
          const fullPetsCount = (petsData || []).filter(fullPetProfile).length;
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
          // Owner leveled up since last cache → one-shot celebration.
          const prevLevel = profileData?.cached_level ?? null;
          if (
            typeof prevLevel === "number" &&
            computedLevel > prevLevel &&
            computedLevel >= 1
          ) {
            const crossed =
              tierForLevel(computedLevel) !== tierForLevel(prevLevel || 1);
            const tierObj = TIERS[tierForLevel(computedLevel) - 1] || null;
            setCelebrate({
              level: computedLevel,
              tierCrossed: crossed,
              tierName: tierObj?.name || null,
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
            .eq("id", profileData.id);
          if (cacheErr) {
            console.error("Failed to write cached profile stats:", cacheErr);
          }
        }
      }

      // Public visitors: use cached stats from the profile row itself.
      // These columns are updated whenever the owner views their profile.
      // This avoids RLS restrictions on private tables (pets, saved_vets, etc.)
      // and is the standard industry pattern (Stack Overflow, Reddit, LinkedIn, GitHub).
      if (usernameFromUrl && profileData?.id && !session) {
        if (!cancelled) {
          // Simulate enough "pets" array so hasFullPet evaluates correctly
          // for level calc — we use the cached counts.
          const fullPetsCount = profileData.cached_full_pets_count || 0;
          const petsCount = profileData.cached_pets_count || 0;
          const placeholderPets = [];
          for (let i = 0; i < fullPetsCount; i++) {
            placeholderPets.push({
              name: "_",
              species: "_",
              breed: "_",
              birthday: "2020-01-01",
              sex: "_",
              weight_value: 1,
            });
          }
          // Fill remaining slots with empty pet objects so pets.length is right
          for (let i = fullPetsCount; i < petsCount; i++) {
            placeholderPets.push({});
          }
          setPets(placeholderPets);
          setCounts({
            saved: profileData.cached_saved_count || 0,
            checks: profileData.cached_checks_count || 0,
            submissions: 0,
            verifiedSubmissions: profileData.cached_verified_count || 0,
            pendingSubmissions: 0,
            checkedPetIds: Array.from(
              { length: profileData.cached_distinct_checked_pets || 0 },
              (_, i) => `_${i}`,
            ),
          });
        }
      }

      if (!cancelled) setLoading(false);
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [session, usernameFromUrl]);

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
  function formatPhone(phone) {
    if (!phone) return null;
    const d = phone.replace(/\D/g, "");
    if (d.length === 10)
      return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    return phone;
  }
  function handlePhoneInput(raw) {
    const d = raw.replace(/\D/g, "").slice(0, 10);
    if (d.length === 0) return "";
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  function triageLabel(result) {
    if (result === "EMERGENCY")
      return { dot: "#C94040", text: "#A62F2F", short: "Emergency" };
    if (result === "SEE_VET")
      return { dot: "#EFC88B", text: "#8A6420", short: "See vet soon" };
    if (result === "MONITOR")
      return { dot: "#1A6641", text: "#155534", short: "Monitor at home" };
    return { dot: "#888", text: "#4B5563", short: result || "—" };
  }
  function relativeTimeShort(iso) {
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
  function formatJoinDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }

  // 5MB cap, JPG/PNG only (HEIC converts to JPG first) — matches slug page
  async function prepareImageFile(file, setConverting) {
    if (!file) return null;
    const isHeic =
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif");
    if (isHeic) {
      setConverting(true);
      try {
        const heic2any = (await import("heic2any")).default;
        const blob = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.85,
        });
        const converted = new File(
          [blob],
          file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg"),
          { type: "image/jpeg" },
        );
        setConverting(false);
        if (converted.size > 5 * 1024 * 1024) {
          alert("Photo must be under 5MB.");
          return null;
        }
        return converted;
      } catch {
        setConverting(false);
        alert("Could not convert HEIC file. Please try JPG or PNG.");
        return null;
      }
    }
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      alert("Please use JPG or PNG.");
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Photo must be under 5MB.");
      return null;
    }
    return file;
  }

  async function handlePhotoUpload(e) {
    e.preventDefault();
    e.stopPropagation();
    const raw = e.target.files?.[0];
    if (!raw) return;
    const file = await prepareImageFile(raw, setConvertingPhoto);
    if (!file) return;
    setUploadingPhoto(true);
    const ext = file.name.split(".").pop();
    const filePath = `${session.user.id}/avatar.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });
    if (error) {
      alert("Upload failed: " + error.message);
      setUploadingPhoto(false);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const urlWithCache = `${publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").upsert({
      id: session.user.id,
      avatar_url: urlWithCache,
      updated_at: new Date().toISOString(),
    });
    setProfile((prev) => ({ ...prev, avatar_url: urlWithCache }));
    showToast("Profile photo updated!");
    setUploadingPhoto(false);
    e.target.value = "";
  }

  async function handlePetPhotoUpload(e, petId) {
    e.preventDefault();
    e.stopPropagation();
    const raw = e.target.files?.[0];
    if (!raw) return;
    const file = await prepareImageFile(raw, setConvertingPhoto);
    if (!file) return;
    setUploadingPetPhoto(petId);
    const ext = file.name.split(".").pop();
    const filePath = `${session.user.id}/${petId}.${ext}`;
    const { error } = await supabase.storage
      .from("pets")
      .upload(filePath, file, { upsert: true });
    if (error) {
      alert("Upload failed: " + error.message);
      setUploadingPetPhoto(null);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("pets").getPublicUrl(filePath);
    const urlWithCache = `${publicUrl}?t=${Date.now()}`;
    await supabase
      .from("pets")
      .update({ photo_url: urlWithCache })
      .eq("id", petId);
    setPets((prev) =>
      prev.map((p) => (p.id === petId ? { ...p, photo_url: urlWithCache } : p)),
    );
    showToast("Pet photo updated!");
    setUploadingPetPhoto(null);
    e.target.value = "";
  }

  async function handleNewPetPhotoPreview(e) {
    const raw = e.target.files?.[0];
    if (!raw) return;
    const file = await prepareImageFile(raw, setConvertingPhoto);
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPendingPetPhoto({ file, previewUrl: url });
  }

  async function handleSaveProfile() {
    setSaving(true);
    setUsernameError("");
    const username = profileForm.username.trim().toLowerCase();
    if (username) {
      if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        setUsernameError(
          "3–20 chars, lowercase letters, numbers, or underscore.",
        );
        setSaving(false);
        return;
      }
    }
    const payload = {
      id: session.user.id,
      full_name: profileForm.full_name,
      bio: profileForm.bio,
      zip_code: profileForm.zip_code,
      is_public: profileForm.is_public,
      show_location_public: profileForm.show_location_public,
      show_bio_public: profileForm.show_bio_public,
      banner_color: profileForm.banner_color || "auto",
      updated_at: new Date().toISOString(),
    };
    if (username) payload.username = username;

    const { error } = await supabase.from("profiles").upsert(payload);
    if (!error) {
      setProfile((prev) => ({ ...prev, ...payload }));
      setEditingProfile(false);
      showToast("Profile saved!");
    } else if (
      error.code === "23505" ||
      /username/i.test(error.message || "")
    ) {
      setUsernameError("That username is taken.");
    } else {
      showToast("Failed to save profile.", "error");
    }
    setSaving(false);
  }

  async function handleSavePet() {
    setSaving(true);
    if (editingPetId) {
      const { species_other: _so, ...petFormClean } = petForm;
      const resolvedSpecies =
        petForm.species === "Other"
          ? petForm.species_other || "Other"
          : petForm.species;
      const { error } = await supabase
        .from("pets")
        .update({
          ...petFormClean,
          species: resolvedSpecies,
          weight_value: petForm.weight_value || null,
          weight_unit: petForm.weight_unit || "lbs",
          birthday: petForm.birthday || null,
          sex: petForm.sex || null,
        })
        .eq("id", editingPetId);
      if (!error) {
        setPets((prev) =>
          prev.map((p) =>
            p.id === editingPetId
              ? { ...p, ...petForm, species: resolvedSpecies }
              : p,
          ),
        );
        setEditingPetId(null);
        showToast("Pet updated!");
      } else showToast("Failed to update pet.", "error");
    } else {
      const { species_other: _so, ...petFormClean } = petForm;
      const resolvedSpecies =
        petForm.species === "Other"
          ? petForm.species_other || "Other"
          : petForm.species;
      const { data, error } = await supabase
        .from("pets")
        .insert({
          owner_id: session.user.id,
          ...petFormClean,
          species: resolvedSpecies,
          weight_value: petForm.weight_value || null,
          weight_unit: petForm.weight_unit || "lbs",
          birthday: petForm.birthday || null,
          sex: petForm.sex || null,
        })
        .select()
        .single();
      if (!error) {
        let finalPet = data;
        if (pendingPetPhoto) {
          const ext = pendingPetPhoto.file.name.split(".").pop();
          const filePath = `${session.user.id}/${data.id}.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from("pets")
            .upload(filePath, pendingPetPhoto.file, { upsert: true });
          if (!uploadErr) {
            const {
              data: { publicUrl },
            } = supabase.storage.from("pets").getPublicUrl(filePath);
            const urlWithCache = `${publicUrl}?t=${Date.now()}`;
            await supabase
              .from("pets")
              .update({ photo_url: urlWithCache })
              .eq("id", data.id);
            finalPet = { ...data, photo_url: urlWithCache };
          }
        }
        setPets((prev) => [...prev, finalPet]);
        setJustSavedPet(finalPet);
        setPendingPetPhoto(null);
        showToast("Pet added!");
      } else showToast("Failed to add pet.", "error");
    }
    setPetForm(emptyPetForm);
    setMicrochipError("");
    setSaving(false);
  }

  async function handleDeletePet(petId) {
    if (!confirm("Remove this pet?")) return;
    await supabase.from("pets").delete().eq("id", petId);
    setPets((prev) => prev.filter((p) => p.id !== petId));
    showToast("Pet removed.");
  }

  function handleViewSymptomCheck(pet, check) {
    try {
      const transcript =
        typeof check.transcript === "string"
          ? JSON.parse(check.transcript)
          : check.transcript || [];
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          selectedPet: pet,
          messages: transcript,
          triageResult: check.triage_result,
          differentials: check.differentials || [],
          guestMode: false,
          freeCheckUsed: false,
        }),
      );
    } catch (e) {}
    router.push("/symptom-checker/chat");
  }

  function closeAllEditing() {
    setEditingProfile(false);
    setShowAddPet(false);
    setEditingPetId(null);
    setShowInlineSubmit(false);
    setPetForm(emptyPetForm);
    setPendingPetPhoto(null);
    setMicrochipError("");
    setUsernameError("");
    // Discard any unsaved profile edits (e.g. a changed-but-unsaved username)
    // so reopening the edit form shows the saved values, not stale drafts.
    setProfileForm({
      full_name: profile?.full_name || "",
      username: profile?.username || "",
      bio: profile?.bio || "",
      zip_code: profile?.zip_code || "",
      is_public: profile?.is_public || false,
      show_location_public: profile?.show_location_public !== false,
      show_bio_public: profile?.show_bio_public !== false,
      banner_color: profile?.banner_color || "auto",
    });
  }

  // Close the inline submit-price form and restore scroll to the trigger,
  // so the user isn't left stranded at the bottom of the page.
  function scrollToForm(target = "profile") {
    setTimeout(() => {
      const ref = target === "pet" ? petFormRef.current : formAreaRef.current;
      if (!ref) return;
      const top = ref.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }, 150);
  }
  function startEditPet(pet) {
    closeAllEditing();
    setEditingPetId(pet.id);
    setPetForm({
      name: pet.name || "",
      species: pet.species || "Dog",
      species_other: "",
      breed: pet.breed || "",
      sex: pet.sex || "",
      birthday: pet.birthday || "",
      weight_value: pet.weight_value || "",
      weight_unit: pet.weight_unit || "lbs",
      allergies: pet.allergies || "",
      medications: pet.medications || "",
      microchip_number: pet.microchip_number || "",
      notes: pet.notes || "",
      owner_name: pet.owner_name || "",
      owner_phone: pet.owner_phone || "",
      owner_email: pet.owner_email || "",
      vet_name: pet.vet_name || "",
      vet_address: pet.vet_address || "",
      vet_city: pet.vet_city || "",
      vet_zip: pet.vet_zip || "",
      vet_phone: pet.vet_phone || "",
    });
    scrollToForm("pet");
  }
  function startAddPet() {
    closeAllEditing();
    setShowAddPet(true);
    scrollToForm("pet");
  }
  function scrollToPack() {
    if (!packSectionRef.current) return;
    const top =
      packSectionRef.current.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  }

  if (session === undefined || loading)
    return <PageLoader for="publicProfile" />;
  // Allow logged-out visitors to view public profiles by username.
  // Only block if both session is missing AND there is no public URL to view.
  if (!session && !usernameFromUrl) return null;
  // Not a loading state — the profile genuinely doesn't exist (or isn't public).
  // Show a real empty state with a way out, never a spinner that never resolves.
  if (!profile) return <ProfileNotFound />;

  // True ownership check: compare auth user id to loaded profile id.
  // Profile is not owner when in preview mode, when logged out, or when viewing another user.
  const isOwner = !previewMode && !!session && session.user?.id === profile?.id;

  // Route context: the PUBLIC profile lives at /profile/[username] (usernameFromUrl
  // is set); the PRIVATE dashboard lives at bare /profile (usernameFromUrl is null).
  // A public profile must render the SAME public-safe content for everyone —
  // including the owner — so private data (stats, medical pet tiles, per-pet
  // owner actions) never appears there. The owner manages pets from /profile.
  const onPublicRoute = !!usernameFromUrl;
  // Show the private owner dashboard ONLY on the private /profile route (and in
  // preview we always force the public view). On the public URL, even the owner
  // sees the public view plus a "manage" affordance.
  const showOwnerDashboard = isOwner && !onPublicRoute;
  // (Ownership is captured by `isOwner` above. For a non-owner viewing
  // someone else's profile, we must NEVER fall back to the viewer's own
  // session data — avatar, name, email, join date, banner — or the visitor
  // would see THEIR identity bleeding onto the profile being viewed.)

  const avatarUrl =
    profile?.avatar_url ||
    (isOwner ? session?.user?.user_metadata?.avatar_url : null) ||
    null;
  const avatarLetter =
    profile?.full_name?.[0]?.toUpperCase() ||
    profile?.username?.[0]?.toUpperCase() ||
    (isOwner ? session?.user?.email?.[0]?.toUpperCase() : null) ||
    "?";

  // NEW XP engine — for the OWNER viewing their own profile, compute live
  // (full access to their data). For non-owner visitors, RLS hides the owner's
  // private tables, so we fall back to the cached tier the owner last wrote.
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
  // Non-owner level: prefer the fresh RPC-computed state (publicLevelState);
  // fall back to cached_level only if the RPC hasn't returned (or failed).
  const level = !isOwner
    ? (publicLevelState?.level ??
      (profile?.cached_level != null ? profile.cached_level : levelState.level))
    : levelState.level;
  // The compact LevelBadge + CommunityContributions read `currentLevelDef` (a
  // tier object). Owner = live tier; non-owner = RPC tier (or cached fallback).
  const currentLevelDef = !isOwner
    ? (publicLevelState?.tier ?? LEVELS[level - 1] ?? null)
    : levelState.tier || null;
  // Sub-level number: owner from live state; non-owner from the RPC (Piece 2 —
  // now available for public visitors). Null only if the RPC hasn't resolved.
  const displaySubLevel = isOwner
    ? levelState.subLevel
    : (publicLevelState?.subLevel ?? null);
  // The state that drives the level modal ladder: owner uses their live
  // state; a visitor uses the RPC-computed public state (or the owner's
  // live state as a harmless fallback before the RPC returns).
  const ladderState = isOwner ? levelState : publicLevelState || levelState;

  const joinedDate = formatJoinDate(
    profile?.created_at || (isOwner ? session?.user?.created_at : null),
  );
  const username = profile?.username || "";

  // autoBannerKey is derived from the viewer-accessible pets. For a non-owner
  // viewing someone else's profile, RLS hides the owner's pets, so an "auto"
  // banner can't be computed live. Use the owner's cached_banner (written on
  // their own visit); fall back to a neutral default if not yet cached.
  const autoKey = autoBannerKey(pets);
  const savedBannerKey =
    profile?.banner_color && profile.banner_color !== "auto"
      ? profile.banner_color
      : isOwner
        ? autoKey
        : profile?.cached_banner || "mixed";
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
      <style>{`
        /* Public preview spacer — pushes content below the fixed
           preview bar. Different heights per breakpoint:
           - Desktop (>768): single line, 44px
           - Tablet (481-768): full message wraps to 2 lines, 80px
           - Phone (≤480): short message single line, 56px */
        .pu-preview-spacer { height: 44px; }
        @media (max-width: 768px) {
          .pu-preview-spacer { height: 80px; }
        }
        @media (max-width: 480px) {
          .pu-preview-spacer { height: 56px; }
        }
        /* On phones (≤480), hide the descriptive tail so the bar fits
           on a single line. Desktop and tablet show full message. */
        .pu-preview-msg-tail { display: inline; }
        @media (max-width: 480px) {
          .pu-preview-msg-tail { display: none; }
        }
        .pp-shell {
          background: ${C.cream};
          /* Single source of truth for the pet-card max width — card,
             add-pet button, and utility buttons all reference this. */
          --pp-card-max: 460px;
         {/* min-height: calc(100vh - 64px); */}
        }

        /* ════════════════════════════════════════════════════════════
           HERO — full chromatic gradient with wallpaper, no hard stop
           ════════════════════════════════════════════════════════════ */
        .pp-hero {
          position: relative;
          background: ${pageGradient(bannerKey)};
          padding: 60px 0 110px;
          overflow: hidden;
        }
        .pp-hero-wallpaper {
          position: absolute; inset: 0;
          z-index: 0; pointer-events: none;
        }
        .pp-hero-wallpaper > div {
          will-change: transform;
        }
        .pp-hero-content {
          position: relative; z-index: 2;
        }

        /* ════════════════════════════════════════════════════════════
           IDENTITY (desktop)
           ════════════════════════════════════════════════════════════ */
        .pp-identity {
          display: grid;
          grid-template-columns: 230px 1fr;
          gap: 15px;
          align-items: start;
        }
        .pp-identity-left {
          display: flex; flex-direction: column;
          align-items: center; gap: 16px;
        }
        .pp-level-desktop-wrap {
          display: flex; justify-content: center;
          overflow: visible;
        }

        /* Avatar — chrome bevel ring, deep navy interior */
        .pp-avatar-outer {
          width: 156px; height: 156px;
          border-radius: 50%;
          padding: 2.5px;
          background: linear-gradient(135deg,
            rgba(255,234,176,0.95) 0%,
            rgba(207,92,54,0.50) 22%,
            rgba(255,255,255,0.20) 50%,
            rgba(207,92,54,0.45) 78%,
            rgba(255,234,176,0.95) 100%);
          box-shadow:
            0 12px 36px rgba(0,0,0,0.55),
            inset 0 1px 0 rgba(255,255,255,0.18);
          flex-shrink: 0;
          position: relative;
        }
        .pp-avatar-ring {
          width: 100%; height: 100%;
          border-radius: 50%;
          background: linear-gradient(135deg, ${C.terracotta} 0%, ${C.gold} 100%);
          padding: 4px;
          box-sizing: border-box;
        }
        .pp-avatar-inner {
          width: 100%; height: 100%; border-radius: 50%;
          background: ${bannerPalette.stops[3]};
          display: flex; align-items: center; justify-content: center;
          color: ${C.gold}; font-size: 56px; font-weight: 800;
          overflow: hidden;
        }
        .pp-avatar-inner img {
          width: 100%; height: 100%; object-fit: cover; display: block;
        }
        .pp-avatar-camera {
          position: absolute; bottom: 6px; right: 6px;
          width: 44px; height: 44px;
          border-radius: 50%;
          background: ${C.terracotta}; color: #fff;
          border: 3px solid #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.30);
          transition: background 0.15s;
          line-height: 1;
        }
        .pp-avatar-camera:hover { background: ${C.terracottaDark}; }

        /* ════════════════════════════════════════════════════════════
           LEVEL BADGE — chromatic gloss with boosted highlights
           ════════════════════════════════════════════════════════════ */
        .pp-level-outer {
          position: relative;
          border-radius: 24px;
          padding: 1.5px;
          background: linear-gradient(135deg,
            #FFE8B8 0%,
            #EFC88B 18%,
            #FFFFFF 32%,
            #EFC88B 50%,
            #FFFFFF 68%,
            #EFC88B 82%,
            #FFE8B8 100%);
          filter: drop-shadow(0 0 8px rgba(239,200,139,0.45)) drop-shadow(0 4px 10px rgba(0,0,0,0.30));
          transition: filter 0.2s;
          display: inline-block;
          line-height: 1;
          cursor: pointer;
        }
        .pp-level-outer:hover {
          filter: drop-shadow(0 0 18px rgba(239,200,139,0.85)) drop-shadow(0 4px 14px rgba(0,0,0,0.35)) brightness(1.10);
        }
        .pp-level-badge {
          display: inline-flex; align-items: center; gap: 9px;
          padding: 9px 14px;
          border-radius: 22px;
          font-size: 14px;
          font-weight: 800;
          /* UPPERCASE (locked preference) — identical to ProfileMain. */
          letter-spacing: 0.10em;
          text-transform: uppercase;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          white-space: nowrap;
          border: none;
          line-height: 1;
          cursor: pointer;
          box-shadow:
            inset 0 1.5px 0 rgba(255,255,255,0.55),
            inset 0 -2px 4px rgba(0,0,0,0.32),
            0 6px 16px rgba(0,0,0,0.35);
        }
        .pp-level-badge.l0 {
          background: linear-gradient(160deg, #2a3e4e 0%, #1e303e 50%, #142433 100%);
          color: ${C.gold};
        }
        .pp-level-badge.l0 .lv-progress {
          color: ${C.terracotta};
          font-weight: 900;
          background: rgba(255,255,255,0.10);
          padding: 2px 8px;
          border-radius: 10px;
          line-height: 1;
        }
        .pp-level-badge .lv-num {
          padding: 4px 10px;
          border-radius: 11px;
          font-size: 14px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: 0.04em;
        }

        /* ════════════════════════════════════════════════════════════
           IDENTITY RIGHT (desktop)
           ════════════════════════════════════════════════════════════ */
        .pp-identity-right {
          padding-top: 6px;
          padding-left: 4px;
          min-width: 0;
          display: grid;
          grid-template-columns: 1fr auto;
          grid-template-rows: auto auto auto;
          column-gap: 16px;
          row-gap: 6px;
          align-items: baseline;
        }
        .pp-id-name { grid-column: 1; grid-row: 1; }
        .pp-id-handle { grid-column: 1; grid-row: 2; }
        .pp-id-location { grid-column: 1; grid-row: 3; }
        .pp-id-joined { grid-column: 2; grid-row: 1; justify-self: end; }
        .pp-id-edit { grid-column: 2; grid-row: 2; justify-self: end; }
        .pp-bio-desktop { grid-column: 1 / -1; grid-row: 4; }

        .pp-name {
          margin: 0;
          font-size: clamp(26px, 4.5vw, 32px); font-weight: 800;
          color: #fff;
          letter-spacing: -0.025em;
          line-height: 1.05;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pp-handle {
          margin: 0; font-size: 16px;
          color: ${C.gold};
          font-weight: 700;
          line-height: 1.2;
        }
        .pp-handle.empty { color: rgba(255,255,255,0.45); font-style: italic; font-weight: 500; }
        .pp-location {
          margin: 0; font-size: 15px;
          color: rgba(255,255,255,0.95);
          font-weight: 600;
          line-height: 1.3;
        }
        .pp-joined {
          margin: 0; font-size: 15px;
          color: rgba(255,255,255,0.92);
          font-weight: 600;
          white-space: nowrap;
          line-height: 1.3;
        }
        .pp-edit-link {
          background: none; border: none; padding: 0;
          font-size: 14px;
          color: ${C.gold};
          font-weight: 700; cursor: pointer;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: color 0.15s, text-decoration 0.15s;
          line-height: 1.3;
          white-space: nowrap;
          text-decoration: none;
        }
        .pp-edit-link:hover {
          color: #fff;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .pp-bio {
          margin: 14px 0 0;
          font-size: 16px;
          font-weight: 500;
          color: rgba(255,255,255,0.92);
          line-height: 1.6;
          /* Capped at 630px so the full-width bio never reaches up alongside
             the Joined/Edit column at mid widths. */
          max-width: 630px;
        }
        .pp-bio-mobile { display: none; }

        /* ════════════════════════════════════════════════════════════
           STATS TRIO — chrome bevel ring, terracotta/gold/navy stripes
           ════════════════════════════════════════════════════════════ */
        .pp-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: -68px;
          position: relative;
          z-index: 5;
        }
        .pp-stat-link {
          text-decoration: none; display: block;
          background: none; border: none; padding: 0; width: 100%;
          font: inherit; cursor: pointer;
          border-radius: 14px;
        }
        .pp-stat-outer {
          padding: 1.5px;
          border-radius: 14px;
          background: linear-gradient(15deg,
            rgba(239,200,139,0.75) 0%,
            rgba(207,92,54,0.45) 25%,
            rgba(255,255,255,0.32) 50%,
            rgba(207,92,54,0.45) 75%,
            rgba(239,200,139,0.75) 100%);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .pp-stat-link:hover .pp-stat-outer {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(23,37,49,0.18);
        }
        .pp-stat {
          background: #fff;
          border-radius: 12px;
          padding: 22px 14px 18px;
          text-align: center;
          position: relative; overflow: hidden;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          box-shadow: 0 6px 18px rgba(23,37,49,0.12);
        }
        .pp-stat::before {
          content: ""; position: absolute;
          top: 0; left: 0; right: 0;
          height: 5px;
        }
        .pp-stat.pack::before { background: ${C.terracotta}; }
        .pp-stat.saved::before { background: ${C.gold}; }
        .pp-stat.checks::before { background: ${C.navyDark}; }
        .pp-stat-num {
          margin: 0; font-size: clamp(30px, 4vw, 34px); font-weight: 800;
          color: ${C.navyDark}; line-height: 1; letter-spacing: -0.025em;
        }
        .pp-stat-label {
          margin: 8px 0 0; font-size: 14px; font-weight: 700;
          color: ${C.muted}; text-transform: uppercase; letter-spacing: 0.10em;
        }

        /* Divider — now lives as ::before on pack section so it auto-hides */
        .pp-pack-section::before {
          content: "";
          display: block;
          height: 1px;
          background: linear-gradient(to right,
            transparent 0%,
            ${bannerPalette.accent}33 30%,
            ${bannerPalette.accent}55 50%,
            ${bannerPalette.accent}33 70%,
            transparent 100%);
          margin: 40px 0 30px;
        }

        /* Legacy divider (kept for any other usages, e.g. above edit form area) */
        .pp-divider {
          height: 1px;
          background: linear-gradient(to right,
            transparent 0%,
            ${bannerPalette.accent}33 30%,
            ${bannerPalette.accent}55 50%,
            ${bannerPalette.accent}33 70%,
            transparent 100%);
          margin: 28px 0 22px;
        }

        /* Quick Actions row */
        .pp-quick-actions {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin: 0 0 28px;
        }
        .pp-quick-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px 16px;
          background: #fff;
          border: 2px solid ${C.terracotta};
          border-radius: 12px;
          color: ${C.terracotta};
          font-size: 14px;
          font-weight: 700;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          text-decoration: none;
          transition: background 0.15s, color 0.15s;
          cursor: pointer;
        }
        .pp-quick-action:hover {
          background: ${C.terracotta};
          color: #fff;
        }
        .pp-qa-icon {
          display: inline-flex; align-items: center; justify-content: center;
          line-height: 1;
        }
        .pp-qa-label { line-height: 1; white-space: nowrap; }

        /* Pending submissions indicator — owner only, conditional render */
        .pp-pending-indicator {
          margin: 24px auto;
          padding: 14px 18px;
          background: ${C.warningBg};
          border: 1px solid ${C.warning};
          border-radius: 12px;
          text-align: center;
        }
        .pp-pending-indicator p {
          margin: 0;
          font-size: 15px;
          font-weight: 500;
          color: ${C.warning};
          line-height: 1.6;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pp-pending-indicator strong {
          font-weight: 800;
        }

        /* Utility links — bottom row of profile, owner only */
        .pp-utility-links {
          display: flex;
          align-items: stretch;
          justify-content: center;
          flex-wrap: wrap;
          gap: 12px;
          padding: 28px 0 60px;
          margin-top: 8px;
          border-top: 1px solid ${C.border};
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        /* Base utility link: outlined terracotta (secondary action treatment).
           The primary CTA "Submit a vet price" adds .pp-utility-link-btn to
           fill the background, establishing visual hierarchy. */
        .pp-utility-link {
          flex: 1 1 0;
          min-width: 180px;
          padding: 0 24px;
          height: 48px;
          box-sizing: border-box;
          font-size: 15px;
          font-weight: 700;
          color: ${C.navyDark};
          background: #fff;
          border: 1.5px solid ${C.muted};
          border-radius: 12px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
          cursor: pointer;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          white-space: nowrap;
        }
        .pp-utility-link:hover {
          background: ${C.navyDark};
          color: #fff;
          border-color: ${C.navyDark};
          text-decoration: none;
        }
        /* Primary CTA: matches site .btn-primary (terracotta, 2px border, w700). */
        .pp-utility-link-btn {
          color: #fff;
          background: ${C.terracotta};
          border: 2px solid ${C.terracotta};
          font-weight: 700;
        }
        .pp-utility-link-btn:hover {
          background: #fff;
          color: ${C.terracotta};
          border-color: ${C.terracotta};
        }
        .pp-utility-sep {
          display: none;
        }
        @media (max-width: 600px) {
          .pp-utility-links {
            flex-direction: column;
            max-width: var(--pp-card-max);
            margin-left: auto;
            margin-right: auto;
          }
          .pp-utility-link { width: 100%; flex: 0 0 auto; }
        }

        /* ════════════════════════════════════════════════════════════
           COMMUNITY CONTRIBUTIONS (public profile body) — Option A
           ════════════════════════════════════════════════════════════ */
        .pp-owner-note {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 8px 16px;
          margin: 24px 0 0;
          padding: 12px 18px;
          border: 1px solid ${C.border};
          border-radius: 12px;
          background: rgba(255,255,255,0.6);
          font-size: 16px;
          font-weight: 500;
          color: ${C.slate};
        }
        .pp-owner-note-link {
          display: inline-flex;
          align-items: center;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: ${C.terracotta};
          font-weight: 600;
          text-decoration: none;
          white-space: nowrap;
        }
        .pp-owner-note-link:hover { color: ${C.navyDark}; text-decoration: underline; }
        .pp-public-hero-section { padding: 32px 0 0; }
        .pp-public-hero-divider {
          margin-top: 32px;
          border-top: 1px solid ${C.border};
        }
        .pp-public-hero-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: #B57614;
          margin: 0 0 14px;
        }
        .pp-public-hero-grid { display: grid; gap: 16px; }
        .pp-public-hero-grid.cols-1 { grid-template-columns: 320px; justify-content: center; }
        .pp-public-hero-grid.cols-2 { grid-template-columns: repeat(2, 300px); justify-content: center; }
        .pp-public-hero-grid.cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .pp-public-hero-tile {
          display: block;
          text-decoration: none;
          border-radius: 18px;
          padding: 1.5px;
          background: ${C.border};
          box-shadow: 0 2px 12px rgba(23,37,49,0.07);
          transition: transform 0.3s, background 0.25s ease, box-shadow 0.25s;
        }
        .pp-public-hero-tile:hover {
          transform: translateY(-3px);
          background: rgba(239,200,139,0.5);
        }
        .pp-public-hero-tile:hover > .pp-public-hero-inner {
          box-shadow: 0 0 0 1.5px rgba(239,200,139,0.9), 0 16px 48px rgba(23,37,49,0.13);
        }
        .pp-public-hero-tile > .pp-public-hero-inner {
          border-radius: 16.5px;
          overflow: hidden;
          height: 100%;
        }
        .pp-public-hero-photo {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 5;
          overflow: hidden;
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .pp-public-hero-grid.cols-3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 767px) {
          .pp-public-hero-grid.cols-1,
          .pp-public-hero-grid.cols-2,
          .pp-public-hero-grid.cols-3 {
            grid-template-columns: minmax(0, 460px);
            justify-content: center;
            gap: 30px;
          }
        }
        .pp-cc-section {
          padding: 32px 0 60px;
          text-align: center;
        }
        .pp-cc-eyebrow {
          margin: 0 0 24px;
          font-size: 11px;
          font-weight: 700;
          color: ${bannerPalette.accent};
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }

        /* Chrome bevel ring around medal */
        .pp-cc-medal-outer {
          position: relative;
          padding: 1.5px;
          border-radius: 24px;
          background: linear-gradient(135deg,
            #FFE8B8 0%,
            #EFC88B 18%,
            #FFFFFF 32%,
            #EFC88B 50%,
            #FFFFFF 68%,
            #EFC88B 82%,
            #FFE8B8 100%);
          filter: drop-shadow(0 0 14px rgba(239,200,139,0.45)) drop-shadow(0 12px 32px rgba(0,0,0,0.30));
          max-width: 480px;
          margin: 0 auto 28px;
        }
        .pp-cc-medal {
          position: relative;
          border-radius: 22.5px;
          padding: 48px 32px 32px;
          box-shadow:
            inset 0 1.5px 0 rgba(255,255,255,0.40),
            inset 0 -2px 6px rgba(0,0,0,0.32);
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          overflow: hidden;
        }
        .pp-cc-verified {
          position: absolute;
          top: 16px; right: 16px;
          width: 32px; height: 32px;
          border-radius: 50%;
          background: ${C.gold};
          display: flex; align-items: center; justify-content: center;
          box-shadow:
            0 2px 8px rgba(0,0,0,0.30),
            inset 0 1px 0 rgba(255,255,255,0.45);
          z-index: 2;
        }
        .pp-cc-number {
          font-size: clamp(76px, 11vw, 96px);
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.04em;
          margin: 0 0 8px;
        }
        .pp-cc-number-label {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.18em;
          color: rgba(255,255,255,0.95);
          margin: 0 0 24px;
        }
        .pp-cc-verified-line {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(0,0,0,0.20);
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.90);
          letter-spacing: 0.10em;
        }
        .pp-cc-blurb {
          margin: 0 auto;
          max-width: 480px;
          font-size: 16px;
          font-weight: 500;
          line-height: 1.6;
          color: ${C.slate};
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }

        /* 0-state empty card — simple cream card */
        .pp-cc-empty {
          max-width: 460px;
          margin: 0 auto;
          padding: 32px 28px;
          background: #fff;
          border: 1.5px solid ${C.border};
          border-radius: 16px;
          text-align: center;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          box-shadow: 0 2px 12px rgba(23,37,49,0.05);
        }
        .pp-cc-empty-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: ${C.cream};
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }
        .pp-cc-empty-title {
          margin: 0 0 8px;
          font-size: 18px;
          font-weight: 800;
          color: ${C.navyDark};
          letter-spacing: -0.01em;
        }
        .pp-cc-empty-body {
          margin: 0;
          font-size: 15px;
          font-weight: 500;
          line-height: 1.6;
          color: ${C.slate};
          text-wrap: pretty;
        }

        /* ════════════════════════════════════════════════════════════
           PACK SECTION HEADER + GRID
           ════════════════════════════════════════════════════════════ */
        .pp-pack-section { padding: 0px 0 20px; }
        .pp-pack-head {
          display: flex; align-items: flex-end;
          justify-content: space-between; gap: 16px;
          margin-bottom: 18px;
        }
        .pp-pack-eyebrow {
          margin: 0 0 4px; font-size: 11px; font-weight: 700;
          color: ${bannerPalette.accent};
          text-transform: uppercase; letter-spacing: 0.10em;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pp-pack-title {
          margin: 0; font-size: clamp(22px, 2.6vw, 24px); font-weight: 800;
          color: ${C.navyDark}; letter-spacing: -0.025em;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pp-add-pet-btn {
          padding: 0 24px; height: 42px;
          background: ${C.navyDark}; color: #fff;
          border: 2px solid ${C.navyDark}; border-radius: 12px;
          font-size: 15px; font-weight: 700;
          cursor: pointer; white-space: nowrap;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          transition: background 0.15s, border-color 0.15s;
        }
        .pp-add-pet-btn:hover {
          background: #fff;
          color: ${C.navyDark};
          border-color: ${C.navyDark};
        }

        .pp-pet-grid { display: grid; gap: 16px; }
        .pp-pet-grid.cols-1 { grid-template-columns: 340px; justify-content: center; }
        .pp-pet-grid.cols-2 { grid-template-columns: repeat(2, 340px); justify-content: center; }
        .pp-pet-grid.cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .pp-pet-grid.cols-4 { grid-template-columns: repeat(3, minmax(0, 1fr)); }

        /* Pet card — vet-page outer/inner pattern */
        .pp-pet-card-outer {
          border-radius: 18px;
          padding: 1.5px;
          height: 100%;
          background: ${C.border};
          transition: transform 0.3s, background 0.25s ease;
          text-decoration: none;
          display: block;
          color: inherit;
        }
        .pp-pet-card-outer:hover { background: rgba(239,200,139,0.5); }
        .pp-pet-photo-link {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }
        .pp-pet-photo-link img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .pp-pet-name-link {
          display: inline-flex;
          align-items: center;
          min-height: 44px;
          color: inherit;
          text-decoration: none;
          transition: color 0.15s;
        }
        .pp-pet-name-link:hover { color: ${C.terracotta}; }
        .pp-pet-photo-link:focus-visible,
        .pp-pet-name-link:focus-visible {
          outline: 2px solid ${C.terracotta};
          outline-offset: 2px;
        }
        .pp-pet-card {
          border-radius: 16px;
          background: #fff;
          transition: box-shadow 0.25s;
          box-shadow: 0 2px 12px rgba(23,37,49,0.07);
          border: 1px solid ${C.border};
          position: relative;
          overflow: hidden;
          display: flex; flex-direction: column;
          height: 100%;
        }
        .pp-pet-card-outer:hover .pp-pet-card {
          box-shadow: 0 0 0 1.5px rgba(239,200,139,0.9), 0 16px 48px rgba(23,37,49,0.13);
        }
        .pp-pet-photo {
          /* height: 220px; */
          aspect-ratio: 1 / 1;
          position: relative;
          display: flex; 
          align-items: center; 
          justify-content: center;
          font-size: 64px;
          overflow: hidden;
        }
        .pp-pet-photo img {
          width: 100%; 
          height: 100%; 
          object-fit: cover; 
          display: block;
        }
        .pp-pet-photo-camera {
          position: absolute; bottom: 12px; right: 12px;
          z-index: 2;
          width: 44px; height: 44px;
          border-radius: 50%;
          background: ${C.terracotta};
          color: #fff;
          border: 2px solid #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.20);
          transition: background 0.15s;
          line-height: 1;
        }
        .pp-pet-photo-camera:hover { background: ${C.terracottaDark}; }

        .pp-pet-edit-btn {
          position: absolute; top: 12px; right: 12px;
          z-index: 2;
          width: 44px; height: 44px;
          border-radius: 50%;
          background: rgba(255,255,255,0.95);
          color: ${C.navyDark};
          border: 2px solid #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          transition: background 0.15s, color 0.15s;
          line-height: 1;
          z-index: 2;
        }
        .pp-pet-edit-btn:hover {
          background: ${C.navyDark};
          color: #fff;
        }

        .pp-pet-body { padding: 14px 16px 14px; flex: 1; display: flex; flex-direction: column; }
        .pp-pet-name {
          margin: 0 0 10px; font-size: 20px; font-weight: 800;
          color: ${C.navyDark}; letter-spacing: -0.01em;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pp-pet-name-divider {
          height: 1px;
          background: ${C.border};
          margin: 0 0 12px;
        }
        .pp-pet-specs {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-bottom: 12px;
          font-size: 16px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pp-pet-specs > div {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .pp-pet-spec-label { 
          color: ${C.muted}; 
          font-weight: 500; 
          white-space: nowrap;
          flex-shrink: 0;
        }
        .pp-pet-spec-value {
          color: ${C.navyDark};
          font-weight: 600;
          margin-left: auto;
          text-align: right;
          min-width: 0;
        }
        .pp-pet-spec-breed .pp-pet-spec-value {
          word-break: break-word;
        }

        .pp-pet-medlines {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 75px;
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid ${C.border};
        }
        .pp-medline {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 16px;
          line-height: 1.4;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          min-width: 0;
        }
        .pp-medline-label {
          color: ${C.muted};
          font-weight: 500;
          flex-shrink: 0;
        }
        .pp-medline-clip {
          overflow: hidden;
          transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        /* Navy, matching .pp-pet-spec-value, and deliberately not the banner
           accent. It used to be painted inline with the accent color, so the
           allergy and medication text changed every time the banner did — and
           an inline style overrides any class rule, which is why a CSS fix
           alone had no effect. */
        .pp-medline-value {
          color: ${C.navyDark};
          font-weight: 600;
          min-width: 0;
          display: block;
        }
        .pp-medline-value.pp-medvalue-clamp {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        @media (prefers-reduced-motion: reduce) {
          .pp-medline-clip { transition: none; }
        }
        .pp-medline-toggle {
          display: inline-flex;
          align-items: center;
          min-height: 44px;
          align-self: flex-start;
          background: none;
          border: none;
          padding: 2px 0 0;
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          color: ${C.terracotta};
          cursor: pointer;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: color 0.15s;
        }
        .pp-medline-toggle:hover {
          color: ${C.navyDark};
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .pp-pet-recent {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 16px;
          border-top: 1px solid ${C.border};
          border-left: none; border-right: none; border-bottom: none;
          background: #fff;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          width: 100%;
          cursor: pointer;
          font: inherit;
          transition: background 0.15s;
        }
        .pp-pet-recent { background: var(--recent-bg, #fff); }
        .pp-pet-recent:hover { background: var(--recent-bg-hover, ${C.cream}); }
        .pp-pet-recent-text {
          font-size: 15px;
          font-weight: 600;
          color: ${C.slate};
          display: flex; align-items: center; gap: 6px;
          min-width: 0;
          line-height: 1.3;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pp-pet-recent-text .dot {
          width: 8px; height: 8px; border-radius: 50%;
          flex-shrink: 0;
        }
        .pp-pet-recent-arrow {
          color: ${C.terracotta};
          transition: transform 0.15s;
          flex-shrink: 0;
          line-height: 1;
          display: inline-flex;
          align-items: center;
        }
        .pp-pet-recent:hover .pp-pet-recent-arrow { transform: translateX(3px); }
        .pp-pet-recent.empty { cursor: default; }
        .pp-pet-recent.empty:hover { background: #fff; }

        /* ════════════════════════════════════════════════════════════
           FORM CARD
           ════════════════════════════════════════════════════════════ */
        .pp-form-card {
          background: #fff; border: 1px solid ${C.border};
          border-radius: 16px; padding: 28px; margin-top: 20px;
          box-shadow: 0 2px 12px rgba(23,37,49,0.05);
        }
        .pp-form-head {
          margin-bottom: 18px; padding-bottom: 14px;
          border-bottom: 1px solid ${C.border};
        }
        .pp-form-head-x {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }
        .pp-form-head h3 {
          margin: 0; font-size: 18px; font-weight: 800;
          color: ${C.navyDark}; letter-spacing: -0.01em;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pp-form-eyebrow {
          font-size: 11px; font-weight: 700; color: ${C.terracotta};
          text-transform: uppercase; letter-spacing: 0.10em;
          margin: 0 0 12px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pp-form-subtitle {
          margin: 8px 0 0;
          font-size: 14px; font-weight: 500;
          color: ${C.slate};
          line-height: 1.5;
          {/* max-width: 540px; */}
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pp-section-divider {
          font-size: 12px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.10em;
          color: ${C.navyDark};
          margin: 28px 0 14px; padding-top: 18px;
          border-top: 1px solid ${C.border};
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }

        .input {
          width: 100%; padding: 0 14px; border-radius: 12px;
          border: 2px solid #DAD3C5; font-size: 15px;
          box-sizing: border-box;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          outline: none; background: #fff; height: 44px;
          color: ${C.navyDark}; -webkit-appearance: none; appearance: none;
          transition: border-color 0.15s;
        }
        textarea.input { padding: 12px 14px; height: auto; }
        .input:focus { border-color: ${C.terracotta}; }
        select.input {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23717A86' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 12px center;
          padding-right: 38px; cursor: pointer;
        }
        input[type="number"].input { -moz-appearance: textfield; }
        input[type="number"].input::-webkit-outer-spin-button,
        input[type="number"].input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

        /* Weight unit toggle — lbs/kg selector in pet form */
        .pp-weight-row {
          display: flex;
          gap: 8px;
          align-items: stretch;
        }
        .pp-weight-input { flex: 1 1 auto; min-width: 0; }
        .pp-weight-unit-toggle {
          display: inline-flex;
          border: 2px solid ${C.borderStrong};
          border-radius: 10px;
          overflow: hidden;
          flex-shrink: 0;
        }
        .pp-weight-unit-btn {
          padding: 0 14px;
          background: #fff;
          border: none;
          color: ${C.muted};
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: background 0.15s, color 0.15s;
        }
        .pp-weight-unit-btn.active {
          background: ${C.navyDark};
          color: #fff;
        }
        .pp-weight-unit-btn:not(.active):hover {
          background: rgba(23,37,49,0.04);
          color: ${C.navyDark};
        }
        @media (max-width: 640px) {
          .pp-weight-row { flex-direction: column; }
          .pp-weight-unit-toggle { align-self: stretch; }
          .pp-weight-unit-btn { flex: 1; }
        }

        .label {
          display: block; font-size: 13px; color: ${C.muted};
          margin-bottom: 6px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.10em;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .field { margin-bottom: 14px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .field-hint { margin: 4px 0 0; font-size: 13px; font-weight: 600; color: ${C.muted}; }

        .btn-primary {
          padding: 0 24px; height: 48px; min-width: 90px;
          background: ${C.terracotta}; color: #fff;
          border: 2px solid ${C.terracotta}; border-radius: 12px;
          font-size: 15px; cursor: pointer; font-weight: 700;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          display: inline-flex; align-items: center; justify-content: center;
          white-space: nowrap; transition: background 0.15s, border-color 0.15s;
        }
        .btn-primary:hover {
          background: #fff;
          color: ${C.terracotta};
          border-color: ${C.terracotta};
        }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary {
          padding: 0 24px; height: 48px; min-width: 90px;
          background: #fff; color: ${C.navyDark};
          border: 1.5px solid ${C.border}; border-radius: 12px;
          font-size: 15px; cursor: pointer; font-weight: 600;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          display: inline-flex; align-items: center; justify-content: center;
          white-space: nowrap; transition: background 0.15s, border-color 0.15s;
        }
        .btn-secondary:hover {
          background: ${C.navyDark};
          color: #fff;
          border-color: ${C.navyDark};
        }
        .btn-danger-sm {
          height: 48px; padding: 0 24px;
          font-size: 15px; border-radius: 12px;
          color: ${C.error}; background: #fff;
          border: 1px solid #F4C5C5; cursor: pointer;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          font-weight: 700; transition: background 0.15s;
        }
        .btn-danger-sm:hover { background: ${C.error}; color: ${C.white}; border: 1px solid ${C.error}; font-weight: 700; line-height: 1; transition: background 0.15s; }
        .btn-row {
          display: flex; gap: 10px; align-items: center;
          flex-wrap: wrap; margin-top: 6px;
        }

        /* Banner picker */
        .pp-banner-pick-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 10px;
          margin-top: 8px;
        }
        .pp-banner-swatch {
          background: #fff;
          border: 2px solid ${C.border};
          border-radius: 12px;
          padding: 10px;
          cursor: pointer;
          text-align: center;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: transform 0.1s, border-color 0.15s, box-shadow 0.15s;
        }
        .pp-banner-swatch:hover {
          border-color: ${C.borderStrong};
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(23,37,49,0.06);
        }
        .pp-banner-swatch.selected {
          border-color: ${C.terracotta};
          box-shadow: 0 0 0 3px rgba(207,92,54,0.15);
        }
        .pp-banner-swatch-color {
          height: 60px; border-radius: 8px;
          position: relative; overflow: hidden;
          margin-bottom: 8px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -2px 4px rgba(0,0,0,0.25);
        }
        /* Kept in step with the same rule in profileStyles.js — this page
           carries its own copy, and a change to one without the other is how
           "the fix didn't take" happens. See that file for why 28/1.4. */
        .pp-banner-swatch-color svg {
          color: rgba(255,255,255,0.55);
          width: 32px;
          height: 32px;
          stroke-width: 1.2;
        }
        .pp-banner-swatch-label {
          font-size: 12px; font-weight: 700; color: ${C.navyDark};
          line-height: 1.2;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }

        /* Empty state */
        .pp-empty {
          background: #fff;
          border: 2px dashed ${C.borderStrong};
          border-radius: 16px;
          padding: 56px 24px;
          text-align: center;
        }

        /* Modal */
        .pp-modal-backdrop {
          position: fixed; inset: 0;
          background: rgba(23,37,49,0.55);
          z-index: 100;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          -webkit-backdrop-filter: blur(4px);
          backdrop-filter: blur(4px);
          overflow-y: auto;
        }
        .pp-modal {
          background: #fff;
          border-radius: 18px;
          max-width: 560px; width: 100%;
          max-height: 86vh;
          overflow-y: auto;
          box-shadow: 0 30px 60px rgba(0,0,0,0.40);
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pp-modal-head {
          padding: 20px 20px 16px;
          border-bottom: 1px solid ${C.border};
          display: flex; justify-content: space-between; align-items: center;
        }
        .pp-modal-head h3 {
          margin: 0; font-size: 20px; font-weight: 800;
          color: ${C.navyDark};
        }
        .pp-modal-close {
          width: 44px; height: 44px;
          border: none; background: transparent;
          color: ${C.muted}; cursor: pointer;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, color 0.15s;
          line-height: 1;
        }
        .pp-modal-close:hover { background: ${C.cream}; color: ${C.navyDark}; }
        .pp-modal-body { padding: 0; }

        .pp-level-row {
          display: grid;
          grid-template-columns: 64px 1fr;
          gap: 14px; align-items: flex-start;
          padding: 24px 24px;
          border-bottom: 1px solid ${C.border};
          position: relative;
        }
        .pp-level-row:last-child { border-bottom: none; }
        .pp-level-row.current {
          background: linear-gradient(90deg, rgba(207,92,54,0.07), rgba(207,92,54,0.02));
          border-bottom: 1px solid ${C.border};
        }
        .pp-level-row.current::before {
          content: "";
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          background: ${C.terracotta};
        }
        .pp-level-row-medal {
          padding: 1.5px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(0,0,0,0.18) 100%);
        }
        .pp-level-row-medal-inner {
          width: 100%; height: 64px;
          border-radius: 13px;
          display: flex; align-items: center; justify-content: center;
          box-shadow:
            inset 0 1.5px 0 rgba(255,255,255,0.55),
            inset 0 -2px 4px rgba(0,0,0,0.30);
        }
        .pp-level-row-body { min-width: 0; }
        .pp-level-row-head {
          display: flex; flex-direction: column; gap: 3px;
          margin-bottom: 7px;
        }
        .pp-level-row-nameline {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        }
        .pp-level-row-num {
          font-size: 12px; font-weight: 800;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: ${C.muted};
          line-height: 1;
        }
        .pp-level-row-name {
          font-size: 20px; font-weight: 800;
          color: ${C.navyDark};
          letter-spacing: -0.01em;
        }
        .pp-level-row-tag {
          font-size: 11px; font-weight: 800;
          padding: 3px 8px;
          border-radius: 4px;
          letter-spacing: 0.10em; text-transform: uppercase;
          line-height: 1;
        }
        .pp-level-row-tag.current { background: ${C.terracotta}; color: #fff; }
        .pp-level-row-summary {
          font-size: 16px;
          font-weight: 500;
          color: ${C.slate};
          margin: 0 0 8px;
          line-height: 1.55;
        }
        .pp-ladder-wrap {
          padding: 0;
          border-top: 1px solid ${C.border};
        }
        .pp-tier-sec { border-bottom: 1px solid ${C.border}; }
        .pp-tier-head {
          display: flex; align-items: center; gap: 12px;
          width: 100%; text-align: left; border: none; background: none;
          padding: 20px; cursor: pointer; font-family: inherit;
        }
        .pp-tier-head.current { background: #FAFAF8; padding: 20px; }
        .pp-tier-head.static { cursor: default; }
        .pp-tier-head:disabled { cursor: default; }
        .pp-tier-icon {
          width: 57px; height: 57px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          align-self: flex-start;
        }
        .pp-tier-icon svg { width: 30px; height: 30px; }
        .pp-tier-meta { flex: 1; min-width: 0; }
        .pp-tier-eyebrow {
          font-size: 11px; font-weight: 800; letter-spacing: 0.10em;
          text-transform: uppercase; color: ${C.muted}; margin-bottom: 5px;
        }
        .pp-tier-name {
          font-size: 20px; font-weight: 800; color: ${C.navyDark};
          line-height: 1.15;
        }
        .pp-tier-name.future { color: #9AA4AE; }
        .pp-tier-desc {
          font-size: 14px; font-weight: 500; color: ${C.muted};
          margin-top: 2px; line-height: 1.35;
        }
        .pp-tier-caret {
          color: #B8C0C9; flex-shrink: 0; align-self: flex-start; margin-top: 2px;
          transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pp-tier-caret.open { transform: rotate(180deg); }
        .pp-tier-levels { padding: 20px; }
        .pp-lvl-row {
          position: relative; padding-left: 32px; padding-bottom: 18px;
        }
        .pp-lvl-row:last-child { padding-bottom: 2px; }
        .pp-lvl-line {
          position: absolute; left: 7px; top: 22px; bottom: -14px; width: 2px;
        }
        .pp-lvl-node {
          position: absolute; left: 0; top: 4px;
          width: 15px; height: 15px; border-radius: 50%;
          background: #fff; border: 2px solid #D6DBE0; box-sizing: border-box;
        }
        .pp-lvl-node.current {
          width: 17px; height: 17px; left: -1px; top: 3px; border: 3px solid ${C.terracotta};
          box-shadow: 0 0 0 3px rgba(207,92,54,0.2);
        }
        .pp-lvl-headline {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
          min-height: 22px;
        }
        .pp-lvl-name { font-size: 17px; font-weight: 800; color: ${C.navyDark}; }
        .pp-lvl-row.future .pp-lvl-name { color: #9AA4AE; font-weight: 600; }
        .pp-lvl-done {
          font-size: 12px; color: #16A34A; font-weight: 800;
          display: inline-flex; align-items: center; gap: 3px;
        }
        .pp-lvl-done svg { flex-shrink: 0; }
        .pp-lvl-here {
          background: ${C.terracotta}; color: #fff; font-size: 10px; font-weight: 800;
          padding: 3px 7px; border-radius: 4px; letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .pp-lvl-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
        /* Weight up from 500 and an outline added. At 500 on a pale grey fill
           these sat so far back they read as disabled rather than completed —
           the colour is also lifted from #94A0AB so the text carries against
           the fill. */
        .pp-lvl-pill {
          font-size: 12px; font-weight: 700; color: #6B7682; background: #F2EFE9;
          padding: 3px 10px; border-radius: 999px;
          border: var(--pill-border-w, 2px) solid #E2DCD2;
          display: inline-flex; align-items: center; gap: 4px;
        }
        .pp-lvl-pill svg { flex-shrink: 0; }
        .pp-lvl-expand { margin-top: 12px; }
        .pp-ladder-story {
          margin: 0; padding: 20px;
          border-bottom: 1px solid ${C.terracotta}22;
          background: linear-gradient(160deg, ${C.terracotta}12, ${C.terracotta}06);
        }
        .pp-story-eyebrow {
          margin: 0 0 12px; font-size: 12px; font-weight: 800;
          letter-spacing: 0.10em; text-transform: uppercase;
          color: ${C.terracotta};
        }
        .pp-story-p {
          margin: 0 0 15px; font-size: 15px; font-weight: 500;
          color: ${C.slate}; line-height: 1.6;
        }
        .pp-story-p:last-child { margin-bottom: 0; }
        .pp-story-p strong { color: ${C.navyDark}; font-weight: 800; }
        .pp-ladder-intro {
          padding: 18px 24px 20px;
        }
        .pp-ladder-intro p {
          margin: 0; font-size: 15px; line-height: 1.5;
          color: ${C.slate};
        }
        .pp-ladder-intro strong { color: ${C.navyDark}; font-weight: 800; }
        .pp-level-row-expand {
          margin-top: 16px;
          padding-top: 4px;
        }
        .pp-ladder-head {
          font-size: 12px; font-weight: 800; letter-spacing: 0.08em;
          text-transform: uppercase; color: ${C.navyDark};
          margin: 0; padding: 18px 24px 8px;
        }
        .pp-level-row-req {
          font-size: 14.5px; font-weight: 700; color: ${C.muted};
          margin: 0;
        }
        .pp-level-row-reqs {
          margin: 0; padding: 0; list-style: none;
        }
        .pp-level-row-reqs li {
          font-size: 15px;
          line-height: 1.5;
          padding: 4px 0;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .pp-level-row-reqs .req-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }
        .pp-level-row-reqs .req-icon-met { color: ${C.success}; }
        .pp-level-row-reqs .req-icon-todo { color: ${C.borderStrong}; }
        /* Completed items recede slightly; remaining work stays full-weight
           dark so the eye is drawn to what's left to do. */
        .pp-level-row-reqs li.req-met {
          color: ${C.muted};
          font-weight: 500;
        }
        .pp-level-row-reqs li.req-todo {
          color: ${C.navyDark};
          font-weight: 600;
        }

        /* L0 progress block */
        .pp-progress-block {
          margin: 0;
          padding: 18px 24px;
          background: linear-gradient(160deg, rgba(207,92,54,0.05) 0%, rgba(239,200,139,0.05) 100%);
          border-bottom: 1px solid ${C.border};
        }
        .pp-progress-block-eyebrow {
          margin: 0 0 4px;
          font-size: 11px; 
          font-weight: 700;
          color: ${C.terracotta};
          text-transform: uppercase; letter-spacing: 0.10em;
        }
        .pp-progress-block-title {
          margin: 0 0 12px;
          font-size: 17px; font-weight: 800;
          color: ${C.navyDark};
          letter-spacing: -0.01em;
        }
        .pp-progress-list { margin: 0; padding: 0; list-style: none; }
        .pp-progress-item {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 0;
          font-size: 15px;
          font-weight: 500;
          color: ${C.slate};
        }
        .pp-progress-check {
          width: 22px; height: 22px;
          border-radius: 50%;
          background: #fff;
          border: 1.5px solid ${C.borderStrong};
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px;
          line-height: 1;
        }
        .pp-progress-item.done .pp-progress-check {
          background: ${C.success};
          border-color: ${C.success};
          color: #fff;
        }
        .pp-progress-item.done {
          color: ${C.muted};
          text-decoration: line-through;
          text-decoration-color: ${C.borderStrong};
        }

        /* Mobile add-pet under grid */
        .pp-add-pet-mobile { display: block; margin-top: 20px; text-align: center; }

        /* ════════════════════════════════════════════════════════════
           TABLET (769-1024px) — iPad Pro portraits, small laptops
           Inherits desktop layout. Only narrows container + drops pet grid
           to 2 columns. No JSX or stacking changes — desktop pattern at
           smaller scale.
           ════════════════════════════════════════════════════════════ */
        @media (min-width: 768px) and (max-width: 1023px) {
          .pp-container-mixed { max-width: 760px; }
          .pp-bio { max-width: 720px; }
          .pp-pet-grid.cols-3,
          .pp-pet-grid.cols-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        /* ════════════════════════════════════════════════════════════
           MOBILE (≤768px) — phones + iPad Mini + iPad standard portrait
           ════════════════════════════════════════════════════════════ */
        @media (max-width: 768px) {
          .pp-hero { padding: 40px 0 80px; }
          .pp-container-mixed { padding: 0 16px; }
          /* Modal: top-align + full scroll so the header/top is never clipped
             on small screens. */
          .pp-modal-backdrop { align-items: flex-start; padding: 16px; }
          .pp-modal { max-height: none; margin: 8px 0; }

          /* Bottom utility buttons stack full-width on mobile */
          /* Utility buttons stack only on true small mobile (≤600) — see
             dedicated rule near the base styles. */

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
            width: 44px; height: 44px;
            bottom: 0; right: 0;
            border-width: 2px;
          }
          .pp-avatar-camera svg { width: 16px; height: 16px; }

           .pp-pack-head {
            padding-top: 36px
          }

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
             (cleaner than pushing the pill to the edge). Keeps desktop font. */
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
          .pp-stat-label { font-size: 11px; letter-spacing: 0.10em; }

          .pp-pack-section { padding: 0px 0 0px; }
          .pp-add-pet-mobile { display: block; margin-top: 20px; text-align: center; }
          .pp-add-pet-mobile .pp-add-pet-btn {
            width: 100%;
            max-width: var(--pp-card-max);
            height: 48px;
            font-size: 15px;
            margin-bottom: 20px;
          }

          /* Pet-grid single-column stack moved to ≤767 block below so 768px
             shows 2 columns (matches ProfileMain + hub). */
          .pp-pet-grid { gap: 16px; }
          .pp-pet-photo { 
            /* height: 200px; */
            aspect-ratio: 1 / 1;
            font-size: 56px; 
            }
          .pp-pet-name { font-size: 20px; }
          .pp-pet-specs { row-gap: 5px; }

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

        /* Pet-grid stacks to a single capped column only at ≤767px, so that
           exactly 768px still shows 2 columns (matches ProfileMain + hub). */
        @media (max-width: 767px) {
          .pp-pet-grid.cols-1,
          .pp-pet-grid.cols-2,
          .pp-pet-grid.cols-3,
           .pp-pet-grid.cols-4 {
            grid-template-columns: minmax(0, var(--pp-card-max));
            justify-content: center;
            gap: 30px;
          }
        }

        /* ════════════════════════════════════════════════════════════
           SMALL TABLET (501-768px) — large phones, foldables, iPad Mini
           portrait, iPad standard portrait. Uses mobile structure (avatar
           left, identity right, level badge below) but with bumped sizing
           AND content-sized level badge so elements feel proportional and
           badge doesn't dominate.
           ════════════════════════════════════════════════════════════ */
        @media (min-width: 501px) and (max-width: 768px) {
          .pp-container-mixed { max-width: 720px; }
          .pp-identity {
            grid-template-columns: 130px 1fr;
            gap: 28px;
          }

          .pp-pack-section { 
            padding: 0px 0 0px;
             }

          .pp-avatar-outer { width: 130px; height: 130px; padding: 3px; }
          .pp-avatar-inner { font-size: 44px; }
          .pp-handle { font-size: 17px; }
          .pp-location { font-size: 17px; }
          /* Restore the remaining text shrunk for true phones — at 501-768
             there's room for the larger, on-brand sizing. */
          .pp-joined { font-size: 15px; }
          .pp-stat-label { font-size: 14px; }
          .pp-cc-number-label { font-size: 13px; }
          .pp-cc-blurb { font-size: 16px; }

          /* Level badge: content-sized at small tablet (NOT full-width fill).
             Override the mobile rules that force display:block + width:100%. */
          /* TABLET (501–768): badge LEFT-aligned, natural width. */
          .pp-level-mobile-wrap {
            max-width: none;
            width: auto;
            text-align: left;
          }
          .pp-level-mobile-wrap .pp-level-outer {
            display: inline-block;
            width: auto;
          }
          .pp-level-mobile-wrap .pp-level-badge {
            display: inline-flex;
            width: auto;
            justify-content: flex-start;
          }
        }

        /* PHONE (≤500px) — true mobile, single-column pet grid */
        @media (max-width: 500px) {
          .pp-pet-grid.cols-1 { grid-template-columns: 1fr; }
          .pp-pet-grid.cols-2,
          .pp-pet-grid.cols-3,
          // .pp-pet-grid.cols-4 { 
          //   grid-template-columns: 1fr; 
          //   gap: 30px;
          //   }

          .btn-row { flex-direction: column; align-items: stretch; }
          .btn-row .btn-primary,
          .btn-row .btn-secondary { width: 100%; justify-content: center; }
          .pp-banner-pick-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        /* Hide mobile-level-wrap on tablet + desktop (≥769px) */
        @media (min-width: 769px) {
          .pp-level-mobile-wrap { display: none; }
        }
      `}</style>
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
                      subLevel={displaySubLevel}
                      onClick={() => setShowLevelModal(true)}
                    />
                  </div>
                </div>

                {/* RIGHT: identity stack */}
                <div className="pp-identity-right">
                  <h1 className="pp-name pp-id-name">
                    {profile?.full_name ||
                      (isOwner ? session?.user?.email : null) ||
                      "Pet Parent"}
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
                  {showOwnerDashboard && (
                    <button
                      className="pp-edit-link pp-id-edit"
                      onClick={() => {
                        if (editingProfile) setEditingProfile(false);
                        else {
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
                  subLevel={displaySubLevel}
                  onClick={() => setShowLevelModal(true)}
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
          {/* Stats trio — private dashboard only (personal/private data). */}
          {showOwnerDashboard && (
            <div className="pp-stats">
              <button onClick={scrollToPack} className="pp-stat-link">
                <div className="pp-stat-outer">
                  <div className="pp-stat pack">
                    <p className="pp-stat-num">{pets.length}</p>
                    <p className="pp-stat-label">My Pack</p>
                  </div>
                </div>
              </button>
              <Link href="/saved-vets" className="pp-stat-link">
                <div className="pp-stat-outer">
                  <div className="pp-stat saved">
                    <p className="pp-stat-num">{counts.saved}</p>
                    <p className="pp-stat-label">Saved Vets</p>
                  </div>
                </div>
              </Link>
              <Link href="/symptom-checker" className="pp-stat-link">
                <div className="pp-stat-outer">
                  <div className="pp-stat checks">
                    <p className="pp-stat-num">{counts.checks}</p>
                    <p className="pp-stat-label">Health Checks</p>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Owner-only body: quick actions, edit form, pack — private route only */}
          {showOwnerDashboard && (
            <>
              {/* Profile edit form */}
              <div ref={formAreaRef}>
                {editingProfile && isOwner && (
                  <ProfileEditForm
                    C={C}
                    profileForm={profileForm}
                    setProfileForm={setProfileForm}
                    savedUsername={profile?.username || ""}
                    usernameError={usernameError}
                    setUsernameError={setUsernameError}
                    autoKey={autoKey}
                    onSave={handleSaveProfile}
                    onCancel={() => {
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
                    <button className="pp-add-pet-btn" onClick={startAddPet}>
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
                          }}
                        >
                          <ArtEmptyPets width={140} />
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
                            fontSize: "14px",
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
                            onClick={startAddPet}
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
                            fontSize: "13px",
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
                  <div className={`pp-pet-grid cols-${gridCols}`}>
                    {pets.map((pet) => {
                      const recent = latestChecks[pet.id];
                      const triage = recent
                        ? triageLabel(recent.triage_result)
                        : null;
                      const ageStr = formatAge(pet.birthday);
                      const speciesDisplay = pet.species || "—";

                      return (
                        <div key={pet.id} className="pp-pet-card-outer">
                          <div className="pp-pet-card">
                            <div
                              className="pp-pet-photo"
                              style={{
                                background: pet.photo_url
                                  ? "transparent"
                                  : speciesCardGradient(pet.species),
                              }}
                            >
                              <Link
                                href={
                                  isOwner
                                    ? pet.slug
                                      ? `/pet-card/${pet.slug}/care-edit`
                                      : "/pet-card"
                                    : "/pet-card"
                                }
                                className="pp-pet-photo-link"
                                aria-label={`Open ${pet.name}'s pet card`}
                              >
                                {pet.photo_url ? (
                                  <img src={pet.photo_url} alt={pet.name} />
                                ) : (
                                  (() => {
                                    const SpeciesIcon =
                                      BANNER_LUCIDE[
                                        speciesBucket(pet.species)
                                      ] || PawPrint;
                                    return (
                                      <SpeciesIcon
                                        size={132}
                                        strokeWidth={1.4}
                                        color="rgba(255,255,255,0.85)"
                                      />
                                    );
                                  })()
                                )}
                              </Link>
                              {isOwner && (
                                <>
                                  <button
                                    className="pp-pet-edit-btn"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      startEditPet(pet);
                                    }}
                                    title="Edit pet"
                                    aria-label="Edit pet"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button
                                    className="pp-pet-photo-camera"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      petPhotoRefs.current[pet.id]?.click();
                                    }}
                                    title="Change pet photo"
                                    aria-label="Change pet photo"
                                  >
                                    <Camera size={18} />
                                  </button>
                                  <input
                                    ref={(el) => {
                                      petPhotoRefs.current[pet.id] = el;
                                    }}
                                    type="file"
                                    accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
                                    onChange={(e) =>
                                      handlePetPhotoUpload(e, pet.id)
                                    }
                                    style={{ display: "none" }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </>
                              )}
                            </div>

                            <div className="pp-pet-body">
                              <h3 className="pp-pet-name">
                                <Link
                                  href={
                                    isOwner
                                      ? pet.slug
                                        ? `/pet-card/${pet.slug}/care-edit`
                                        : "/pet-card"
                                      : "/pet-card"
                                  }
                                  className="pp-pet-name-link"
                                >
                                  {pet.name}
                                </Link>
                              </h3>
                              <div className="pp-pet-name-divider" />
                              <div className="pp-pet-specs">
                                <div className="pp-pet-spec-breed">
                                  <span className="pp-pet-spec-label">
                                    Breed:{" "}
                                  </span>
                                  <span className="pp-pet-spec-value">
                                    {pet.breed || speciesDisplay}
                                  </span>
                                </div>
                                <div>
                                  <span className="pp-pet-spec-label">
                                    Age:{" "}
                                  </span>
                                  <span className="pp-pet-spec-value">
                                    {ageStr || "—"}
                                  </span>
                                </div>
                                <div>
                                  <span className="pp-pet-spec-label">
                                    Sex:{" "}
                                  </span>
                                  <span className="pp-pet-spec-value">
                                    {pet.sex || "—"}
                                  </span>
                                </div>
                                <div>
                                  <span className="pp-pet-spec-label">
                                    Weight:{" "}
                                  </span>
                                  <span className="pp-pet-spec-value">
                                    {pet.weight_value
                                      ? (() => {
                                          const unit = pet.weight_unit || "lbs";
                                          const val =
                                            unit === "lbs"
                                              ? roundForDisplay(
                                                  Number(pet.weight_value),
                                                )
                                              : roundForDisplay(
                                                  convertWeightTo(
                                                    Number(pet.weight_value),
                                                    unit,
                                                  ),
                                                );
                                          return `${val} ${unit}`;
                                        })()
                                      : "—"}
                                  </span>
                                </div>
                                <div>
                                  <span className="pp-pet-spec-label">
                                    Microchipped:{" "}
                                  </span>
                                  <span className="pp-pet-spec-value">
                                    {pet.microchip_number?.trim()
                                      ? "Yes"
                                      : "No"}
                                  </span>
                                </div>
                              </div>

                              <div className="pp-pet-medlines">
                                <ClampedMedline
                                  C={C}
                                  label="Allergies:"
                                  value={pet.allergies}
                                  accent={bannerPalette.accent}
                                />
                                <ClampedMedline
                                  C={C}
                                  label="Meds:"
                                  value={pet.medications}
                                  accent={bannerPalette.accent}
                                />
                              </div>
                            </div>

                            {recent ? (
                              <button
                                type="button"
                                className="pp-pet-recent"
                                style={{
                                  "--recent-bg": `${triage.dot}26`,
                                  "--recent-bg-hover": `${triage.dot}40`,
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleViewSymptomCheck(pet, recent);
                                }}
                              >
                                <span
                                  className="pp-pet-recent-text"
                                  style={{
                                    color: triage.text,
                                    fontWeight: 700,
                                  }}
                                >
                                  <span
                                    className="dot"
                                    style={{ background: triage.dot }}
                                  />
                                  {triage.short} ·{" "}
                                  {relativeTimeShort(recent.created_at)}
                                </span>
                                <span
                                  className="pp-pet-recent-arrow"
                                  style={{ color: triage.text }}
                                >
                                  <ArrowRight size={16} strokeWidth={2.4} />
                                </span>
                              </button>
                            ) : (
                              <div className="pp-pet-recent empty">
                                <span
                                  className="pp-pet-recent-text"
                                  style={{ color: C.muted }}
                                >
                                  No checks yet
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Bottom Add a pet — shown only when there's a single card.
                   With 2+ cards the button moves to the pack-head (top-right). */}
                {isOwner && pets.length === 1 && (
                  <div className="pp-add-pet-mobile">
                    <button className="pp-add-pet-btn" onClick={startAddPet}>
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
                      onCancel={() => {
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

              {/* Quick links — bottom utility row.
                  Submit-a-price lives only on the owner's own dashboard
                  (/profile), not on this public profile. */}
              <div className="pp-utility-links">
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

          {/* Owner viewing their OWN public URL: a subtle reminder + link back
              to the private dashboard where they manage pets. Public visitors
              never see this. */}
          {isOwner && onPublicRoute && (
            <div className="pp-owner-note">
              <span>
                This is your public profile — this is what others see.
              </span>
              <Link href="/profile" className="pp-owner-note-link">
                Manage your profile
                <ArrowRight size={14} strokeWidth={2.4} />
              </Link>
            </div>
          )}

          {/* Published Hero cards — the public showcase grid. Primary content
              of a public profile, shown above Community Contributions. Same set
              for everyone; empty array simply renders nothing. */}
          {!showOwnerDashboard && publicHeroCards.length > 0 && (
            <div className="pp-public-hero-section">
              <p className="pp-public-hero-eyebrow">Hero Cards</p>
              <div
                className={`pp-public-hero-grid ${
                  publicHeroCards.length === 1
                    ? "cols-1"
                    : publicHeroCards.length === 2
                      ? "cols-2"
                      : "cols-3"
                }`}
              >
                {publicHeroCards.map((card) => (
                  <Link
                    key={card.slug}
                    href={`/pet-card/${card.slug}/hero?u=${encodeURIComponent(
                      profile?.username || "",
                    )}`}
                    className="pp-public-hero-tile"
                    aria-label={`Open ${card.name}'s Hero Card`}
                  >
                    <div
                      className="pp-public-hero-inner"
                      style={{ background: card.hero_bg_color || "#2A3B47" }}
                    >
                      <div className="pp-public-hero-photo">
                        <HeroNameplate
                          variant="mini"
                          name={card.name}
                          nickname={card.nickname}
                          breed={card.breed}
                          photoUrl={card.photo_url}
                          species={card.species}
                          rarity={card.hero_rarity}
                          cardColor={card.hero_bg_color || "#2A3B47"}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Divider between the Hero cards and Community Contributions —
              hairline top border like the hub / ProfileMain sections. Only
              when hero cards are present, so there's no stray line when empty. */}
          {!showOwnerDashboard && publicHeroCards.length > 0 && (
            <div className="pp-public-hero-divider" />
          )}

          {/* Public body (Community Contributions) — shown to everyone who
              isn't seeing the private owner dashboard, INCLUDING the owner when
              they view their own public /profile/[username] URL. */}
          {!showOwnerDashboard && (
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

        {/* Public preview bar — fixed below navbar; navyMid for
            contrast with navbar navyDark. Spacer div below pushes
            page content down so the bar never covers the hero. */}
        {previewMode && (
          <>
            <div
              style={{
                position: "fixed",
                top: 64,
                left: 0,
                right: 0,
                background: "#172531",
                color: "#fff",
                padding: "7px 16px",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px 16px",
                zIndex: 60,
                fontSize: "13px",
                fontWeight: 500,
                fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
                boxShadow: "0 4px 14px rgba(0,0,0,0.20)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                opacity: 0.85,
              }}
            >
              <span
                style={{
                  fontWeight: 500,
                }}
                className="pu-preview-msg-head"
              >
                {" Public preview "}
                <span className="pu-preview-msg-tail">
                  {" — this is what others would see"}
                </span>
              </span>
              <Link
                href="/profile"
                style={{
                  color: C.gold,
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Exit preview{" "}
                <ArrowRight
                  size={14}
                  strokeWidth={2.4}
                  style={{ marginLeft: "4px", verticalAlign: "middle" }}
                />
              </Link>
            </div>
            <div className="pu-preview-spacer" />
          </>
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
                    specific milestones. Stable terracotta (system-level). */}
                <div className="pp-ladder-story">
                  <p className="pp-story-eyebrow">How leveling works</p>
                  <p className="pp-story-p">
                    {isOwner ? (
                      <>
                        Every time you care for your pets and help the
                        community, you earn <strong>XP</strong> — the spark that
                        sets your journey through the pack in motion.
                      </>
                    ) : (
                      <>
                        Every time a member cares for their pets and helps the
                        community, they earn <strong>XP</strong> — the spark
                        that sets their journey through the pack in motion.
                      </>
                    )}
                  </p>
                  <p className="pp-story-p">
                    That XP builds toward the next <strong>Level</strong>. Each
                    level sets clear milestones to reach — complete them all and
                    you climb to the next.
                  </p>
                  <p className="pp-story-p">
                    Levels group into seven <strong>Tiers</strong>, the prestige
                    bands that shape the badge. Every few levels you break into
                    a new tier — the milestones worth chasing.
                  </p>
                  <p className="pp-story-p">
                    {isOwner ? (
                      <>
                        Your current tier is open below, showing the levels
                        you've earned and what's next. Keep climbing to unlock
                        the tiers ahead.
                      </>
                    ) : (
                      <>
                        Below are the seven tiers every member climbs through.
                        Create an account or sign in to start your own journey
                        and see how close you are to the next level.
                      </>
                    )}
                  </p>
                </div>

                {/* Tier-grouped collapsible ladder (shown to everyone). The
                    current level's XP bar + checklist render for the owner
                    only; visitors see the tiers/levels + completed pills. */}
                <div className="pp-ladder-wrap">
                  {buildLadderView(ladderState.signals).map((group) => {
                    const t = group.tier;
                    const Icon = t.icon;
                    const isFuture = !group.reached;
                    const open = group.isCurrent
                      ? expandedTiers[t.n] !== false
                      : expandedTiers[t.n] === true;
                    // Non-owners (logged out / no account / owner-while-logged-out)
                    // get a STATIC list of tiers only: no toggle, no expand,
                    // no levels/pills/XP. The interactive ladder is owner-only.
                    if (!isOwner) {
                      return (
                        <div key={t.n} className="pp-tier-sec">
                          <div className="pp-tier-head static">
                            <div
                              className="pp-tier-icon"
                              style={{
                                background: tierGradient(t.n),
                                opacity: 1,
                              }}
                            >
                              <Icon
                                size={22}
                                strokeWidth={2.2}
                                color={t.text}
                              />
                            </div>
                            <div className="pp-tier-meta">
                              <div className="pp-tier-eyebrow">Tier {t.n}</div>
                              <div className="pp-tier-name">{t.name}</div>
                              <div className="pp-tier-desc">{t.summary}</div>
                            </div>
                          </div>
                        </div>
                      );
                    }
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
                                          {isOwner ? "You are here" : "Current"}
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
                                        <LevelProgress
                                          state={levelState}
                                          animate
                                          celebrate={celebrate}
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
// ClampedMedline — stacked label + value for free-text fields (allergies,
// meds) on the pet card. Value clamps to 2 lines; an animated "Read more /
// Read less" toggle appears only when the text exceeds 2 lines.
// ════════════════════════════════════════════════════════════════════════
function ClampedMedline({ C, label, value, accent }) {
  const text = meaningfulField(value) ? value.trim() : "None";
  const [expanded, setExpanded] = useState(false);
  const [cssClamped, setCssClamped] = useState(true);
  const textRef = useRef(null);
  const [isLong, setIsLong] = useState(false);
  const [clampedHeight, setClampedHeight] = useState(0);
  const [fullHeight, setFullHeight] = useState(0);

  useEffect(() => {
    if (!textRef.current) return;
    const el = textRef.current;
    function measure() {
      if (!textRef.current) return;
      const wasClamped = el.classList.contains("pp-medvalue-clamp");
      el.classList.remove("pp-medvalue-clamp");
      void el.offsetHeight;
      const fh = el.scrollHeight;
      const cs = window.getComputedStyle(el);
      let lh = parseFloat(cs.lineHeight);
      if (Number.isNaN(lh)) lh = parseFloat(cs.fontSize) * 1.4;
      const twoLine = lh * 2;
      if (wasClamped) el.classList.add("pp-medvalue-clamp");
      setClampedHeight(Math.round(twoLine));
      setFullHeight(fh);
      setIsLong(fh > twoLine + 2);
    }
    measure();
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(() => requestAnimationFrame(measure));
    }
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(measure).catch(() => {});
    }
    if (typeof window !== "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
  }, [text]);

  useEffect(() => {
    if (expanded) setCssClamped(false);
  }, [expanded]);

  function handleTransitionEnd(e) {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== "max-height") return;
    if (!expanded) setCssClamped(true);
  }

  const targetHeight = expanded ? fullHeight : clampedHeight;
  const maxHeightStyle = targetHeight ? `${targetHeight}px` : "none";

  return (
    <div className="pp-medline">
      <span className="pp-medline-label">{label}</span>
      <div
        className="pp-medline-clip"
        style={{ maxHeight: maxHeightStyle }}
        onTransitionEnd={handleTransitionEnd}
      >
        <span
          ref={textRef}
          className={`pp-medline-value${cssClamped ? " pp-medvalue-clamp" : ""}`}
        >
          {text}
        </span>
      </div>
      {isLong && (
        <button
          type="button"
          className="pp-medline-toggle"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {expanded ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// LevelBadge — chromatic gloss, distinct color per level, inverted L# pill
// ════════════════════════════════════════════════════════════════════════
function LevelBadge({ level, currentLevelDef, subLevel, onClick }) {
  const lv = currentLevelDef;
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
        {subLevel ? (
          <span
            className="lv-num"
            style={{ background: lv.pillBg, color: lv.pillText }}
          >
            Lv&nbsp;{subLevel}
          </span>
        ) : null}
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// ProfileEditForm — edit profile + banner picker
// ════════════════════════════════════════════════════════════════════════
function ProfileEditForm({
  C,
  profileForm,
  setProfileForm,
  savedUsername,
  usernameError,
  setUsernameError,
  autoKey,
  onSave,
  onCancel,
  saving,
}) {
  // Live city/state preview from the zip the user is currently typing
  // (debounced), so they get instant feedback before saving.
  const [zipCity, setZipCity] = useState("");
  useEffect(() => {
    const zip = (profileForm.zip_code || "").trim();
    if (zip.length !== 5) {
      setZipCity("");
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      fetch(`https://api.zippopotam.us/us/${zip}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (cancelled) return;
          if (d?.places?.[0]) {
            setZipCity(
              `${d.places[0]["place name"]}, ${d.places[0]["state abbreviation"]}`,
            );
          } else {
            setZipCity("");
          }
        })
        .catch(() => {
          if (!cancelled) setZipCity("");
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [profileForm.zip_code]);

  return (
    <div className="pp-form-card" style={{ position: "relative" }}>
      <button
        className="pp-modal-close"
        onClick={onCancel}
        aria-label="Close form"
        type="button"
        style={{
          position: "absolute",
          top: "14px",
          right: "14px",
          zIndex: 10,
        }}
      >
        <X size={22} strokeWidth={2.2} />
      </button>
      <div className="pp-form-head" style={{ paddingRight: "48px" }}>
        <p className="pp-form-eyebrow">Profile</p>
        <h3>Edit your profile</h3>
      </div>
      <div className="form-grid">
        <div className="field">
          <label className="label">Display Name</label>
          <input
            className="input"
            value={profileForm.full_name}
            onChange={(e) =>
              setProfileForm({ ...profileForm, full_name: e.target.value })
            }
            placeholder="Your name"
          />
        </div>
        <div className="field">
          <label className="label">Username</label>
          <input
            className="input"
            value={profileForm.username}
            onChange={(e) => {
              setUsernameError("");
              setProfileForm({
                ...profileForm,
                username: e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9_]/g, "")
                  .slice(0, 20),
              });
            }}
            placeholder="username"
            style={{ borderColor: usernameError ? C.error : undefined }}
          />
          {usernameError ? (
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "14px",
                fontWeight: 500,
                color: C.error,
              }}
            >
              {usernameError}
            </p>
          ) : profileForm.username &&
            savedUsername &&
            profileForm.username !== savedUsername ? (
            <div
              style={{
                margin: "8px 0 0",
                padding: "12px 14px",
                background: C.warningBg,
                border: `1px solid ${C.warning}33`,
                borderRadius: "10px",
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
              }}
            >
              <AlertTriangle
                size={18}
                strokeWidth={2.2}
                style={{ color: C.warning, flexShrink: 0, marginTop: "1px" }}
              />
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: 700,
                    color: C.warning,
                    textWrap: "pretty",
                  }}
                >
                  Changing your username breaks shared links
                </p>
                <p
                  style={{
                    margin: "3px 0 0",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: C.warning,
                    lineHeight: 1.45,
                    textWrap: "pretty",
                  }}
                >
                  Anyone with your old link won&apos;t find your profile.
                </p>
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: C.warning,
                    lineHeight: 1.45,
                    textWrap: "pretty",
                  }}
                >
                  Your new URL will be:{" "}
                  <span style={{ fontWeight: 700, wordBreak: "break-all" }}>
                    petparrk.com/profile/{profileForm.username}
                  </span>
                  .
                </p>
              </div>
            </div>
          ) : (
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "14px",
                fontWeight: 500,
                color: C.muted,
              }}
            >
              Your profile lives at petparrk.com/profile/
              {profileForm.username || "username"}
            </p>
          )}
        </div>
      </div>
      <div className="field">
        <label className="label">Bio</label>
        <AutoGrowTextarea
          className="input"
          value={profileForm.bio}
          onChange={(e) =>
            setProfileForm({ ...profileForm, bio: e.target.value })
          }
          placeholder="A little about you and your pets..."
          rows={3}
          minHeight="84px"
        />
      </div>
      <div className="form-grid">
        <div className="field">
          <label className="label">Zip Code</label>
          <input
            className="input"
            value={profileForm.zip_code}
            onChange={(e) =>
              setProfileForm({
                ...profileForm,
                zip_code: e.target.value.replace(/\D/g, "").slice(0, 5),
              })
            }
            placeholder="e.g. 94610"
            style={{ maxWidth: "180px" }}
          />
          {zipCity && (
            <p
              style={{
                margin: "6px 0 0",
                fontSize: "13px",
                fontWeight: 600,
                color: C.terracotta,
              }}
            >
              {zipCity}
            </p>
          )}
        </div>
        <div className="field" style={{ alignSelf: "start" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: 600,
              color: C.navyDark,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={profileForm.is_public}
              onChange={(e) =>
                setProfileForm({ ...profileForm, is_public: e.target.checked })
              }
            />
            Make my profile public
          </label>
          <p
            style={{
              margin: "6px 0 0 24px",
              fontSize: "13px",
              fontWeight: "500",
              color: C.muted,
            }}
          >
            Other users can find you and see your community contributions.
          </p>

          {profileForm.is_public && (
            <div
              style={{
                marginTop: "14px",
                marginLeft: "24px",
                paddingLeft: "14px",
                borderLeft: `2px solid ${C.border}`,
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: C.slate,
                  cursor: "pointer",
                  marginBottom: "8px",
                }}
              >
                <input
                  type="checkbox"
                  checked={profileForm.show_location_public}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      show_location_public: e.target.checked,
                    })
                  }
                />
                Show my location publicly
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "13px",
                  fontWeight: "500",
                  color: C.slate,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={profileForm.show_bio_public}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      show_bio_public: e.target.checked,
                    })
                  }
                />
                Show my bio publicly
              </label>
            </div>
          )}

          {/* Preview link — always available, regardless of is_public */}
          <p
            style={{
              margin: "14px 0 0 24px",
              fontSize: "13px",
              fontWeight: 500,
              color: C.muted,
            }}
          >
            <Link
              href="?preview=public"
              style={{
                color: C.terracotta,
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Preview as public{" "}
              <ArrowRight
                size={14}
                strokeWidth={2.4}
                style={{ marginLeft: "4px", verticalAlign: "middle" }}
              />
            </Link>
          </p>
        </div>
      </div>

      <p className="pp-section-divider">Banner color</p>
      <p
        style={{
          margin: "-8px 0 16px",
          fontSize: "13px",
          fontWeight: "500",
          color: C.muted,
        }}
      >
        Auto picks a color based on your pack. Pick a custom one to override.
      </p>

      <div className="pp-banner-pick-grid">
        <button
          className={`pp-banner-swatch ${profileForm.banner_color === "auto" ? "selected" : ""}`}
          onClick={() =>
            setProfileForm({ ...profileForm, banner_color: "auto" })
          }
        >
          <div
            className="pp-banner-swatch-color"
            style={{ background: pageGradient(autoKey) }}
          >
            <Sparkles size={38} strokeWidth={1.6} />
          </div>
          <p className="pp-banner-swatch-label">Auto</p>
        </button>
        {Object.entries(BANNER_PALETTE)
          .filter(([_, v]) => v.group === "species")
          .map(([key, val]) => {
            const SpeciesIcon = BANNER_LUCIDE[key];
            return (
              <button
                key={key}
                className={`pp-banner-swatch ${profileForm.banner_color === key ? "selected" : ""}`}
                onClick={() =>
                  setProfileForm({ ...profileForm, banner_color: key })
                }
              >
                <div
                  className="pp-banner-swatch-color"
                  style={{ background: pageGradient(key) }}
                >
                  {SpeciesIcon && <SpeciesIcon size={38} strokeWidth={1.6} />}
                </div>
                <p className="pp-banner-swatch-label">{val.title}</p>
              </button>
            );
          })}
      </div>

      <p
        style={{
          margin: "20px 0 8px",
          fontSize: "11px",
          fontWeight: 700,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: "0.10em",
        }}
      >
        Custom
      </p>
      <div className="pp-banner-pick-grid">
        {Object.entries(BANNER_PALETTE)
          .filter(([_, v]) => v.group === "extra")
          .map(([key, val]) => (
            <button
              key={key}
              className={`pp-banner-swatch ${profileForm.banner_color === key ? "selected" : ""}`}
              onClick={() =>
                setProfileForm({ ...profileForm, banner_color: key })
              }
            >
              <div
                className="pp-banner-swatch-color"
                style={{ background: pageGradient(key) }}
              />
              <p className="pp-banner-swatch-label">{val.label}</p>
            </button>
          ))}
      </div>

      <div
        className="btn-row"
        style={{
          marginTop: "24px",
          paddingTop: "20px",
          borderTop: `1px solid ${C.border}`,
          justifyContent: "flex-end",
        }}
      >
        <button onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button onClick={onSave} className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
// ════════════════════════════════════════════════════════════════════════
// PetFormCard
// ════════════════════════════════════════════════════════════════════════
function PetFormCard({
  C,
  isEdit,
  petForm,
  setPetForm,
  microchipError,
  setMicrochipError,
  pendingPetPhoto,
  setPendingPetPhoto,
  formPhotoUrl,
  newPetPhotoRef,
  handleNewPetPhotoPreview,
  handlePhoneInput,
  saving,
  convertingPhoto,
  onSave,
  onCancel,
  onDelete,
  pets,
  editingPetId,
  justSavedPet,
  onAddAnother,
  onDone,
}) {
  const editingPet = isEdit ? pets.find((p) => p.id === editingPetId) : null;

  // ── Hybrid vet search ──────────────────────────────────────────────
  // Mirrors the submit-price form's search dropdown, but allows free-text:
  // picking a directory vet autofills all fields; typing a vet that isn't
  // listed still works (the user's vet may not be in our directory).
  const [vetList, setVetList] = useState([]);
  const [vetDropdownOpen, setVetDropdownOpen] = useState(false);
  const vetPickerRef = useRef(null);

  useEffect(() => {
    supabase
      .from("vets")
      .select("id, name, city, state, address, zip_code, phone")
      .order("name")
      .then(({ data }) => setVetList(data || []));
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (vetPickerRef.current && !vetPickerRef.current.contains(e.target)) {
        setVetDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const vetQuery = (petForm.vet_name || "").trim().toLowerCase();
  const filteredPetVets =
    vetQuery.length === 0
      ? []
      : vetList
          .filter((v) => {
            return (
              v.name?.toLowerCase().includes(vetQuery) ||
              v.city?.toLowerCase().includes(vetQuery) ||
              v.address?.toLowerCase().includes(vetQuery)
            );
          })
          .slice(0, 8);

  function pickPetVet(vet) {
    // Autofill the whole vet block from the directory record.
    setPetForm({
      ...petForm,
      vet_name: vet.name || "",
      vet_phone: vet.phone || "",
      vet_address: vet.address || "",
      vet_city: vet.city || "",
      vet_zip: vet.zip_code || "",
    });
    setVetDropdownOpen(false);
  }

  // Success state: show "Pet saved! Add another?" after a successful add.
  // Only applies on ADD (not edit) and only when justSavedPet is set.
  if (!isEdit && justSavedPet) {
    return (
      <div className="pp-form-card" style={{ position: "relative" }}>
        <button
          className="pp-modal-close"
          onClick={onDone}
          aria-label="Close form"
          type="button"
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            zIndex: 10,
          }}
        >
          <X size={22} strokeWidth={2.2} />
        </button>
        <div style={{ textAlign: "center", padding: "40px 24px 24px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 16px",
              borderRadius: "50%",
              background: "rgba(26,102,65,0.10)",
              color: "#1A6641",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Check size={32} strokeWidth={2.4} />
          </div>
          <h3
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: C.navyDark,
              margin: "0 0 8px",
              letterSpacing: "-0.01em",
              fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
            }}
          >
            {justSavedPet.name} saved!
          </h3>
          <p
            style={{
              fontSize: "15px",
              fontWeight: 500,
              color: C.slate || "#4B5563",
              margin: "0 0 28px",
              lineHeight: 1.55,
            }}
          >
            Want to add another pet to your pack?
          </p>
          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button type="button" className="btn-secondary" onClick={onDone}>
              Done
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={onAddAnother}
            >
              Add another pet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pp-form-card" style={{ position: "relative" }}>
      <button
        className="pp-modal-close"
        onClick={onCancel}
        aria-label="Close form"
        type="button"
        style={{
          position: "absolute",
          top: "14px",
          right: "14px",
          zIndex: 10,
        }}
      >
        <X size={22} strokeWidth={2.2} />
      </button>
      <div className="pp-form-head" style={{ paddingRight: "48px" }}>
        <p className="pp-form-eyebrow">{isEdit ? "Editing" : "New pet"}</p>
        <h3>{isEdit ? `Edit ${editingPet?.name || "pet"}` : "Add a pet"}</h3>
        {!isEdit && (
          <p className="pp-form-subtitle">
            Just need a name and species to get started — you can save now and
            add more details anytime.
          </p>
        )}
      </div>

      {!isEdit && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            padding: "10px 0 18px",
            borderBottom: `1px solid ${C.border}`,
            marginBottom: "18px",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "84px",
              height: "84px",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "84px",
                height: "84px",
                borderRadius: "16px",
                background: formPhotoUrl ? "transparent" : C.cream,
                border: `1px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                color: C.terracotta,
              }}
            >
              {formPhotoUrl ? (
                <img
                  src={formPhotoUrl}
                  alt="pet"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <PawPrint size={40} strokeWidth={1.8} />
              )}
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                newPetPhotoRef.current?.click();
              }}
              style={{
                position: "absolute",
                bottom: "-4px",
                right: "-4px",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: C.terracotta,
                color: "#fff",
                border: `3px solid #fff`,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px rgba(0,0,0,0.20)",
                lineHeight: 1,
              }}
              title="Add photo"
              aria-label="Add photo"
            >
              <Camera size={14} />
            </button>
            <input
              ref={newPetPhotoRef}
              type="file"
              accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
              onChange={handleNewPetPhotoPreview}
              style={{ display: "none" }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: "0 0 2px",
                fontSize: "16px",
                fontWeight: 800,
                color: C.navyDark,
                letterSpacing: "-0.01em",
                fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
              }}
            >
              {petForm.name.trim() || "New pet"}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                fontWeight: "500",
                color: C.muted,
              }}
            >
              {[
                petForm.species === "Other"
                  ? petForm.species_other
                  : petForm.species,
                petForm.breed,
                formatAge(petForm.birthday),
              ]
                .filter(Boolean)
                .join(" · ") || "Fill in the details below"}
            </p>
            <p className="field-hint" style={{ marginTop: 4 }}>
              (optional · JPG, PNG · max 5MB)
            </p>
          </div>
        </div>
      )}

      <div className="form-grid">
        <div className="field">
          <label className="label">
            Name{" "}
            <span className="req-mark" aria-hidden="true">
              *
            </span>
          </label>
          <input
            className="input"
            value={petForm.name}
            onChange={(e) => setPetForm({ ...petForm, name: e.target.value })}
            placeholder="e.g. Buddy"
            required
            aria-required="true"
          />
          {!petForm.name || petForm.name.trim() === "" ? (
            <p className="field-hint field-warn">Name is required.</p>
          ) : null}
        </div>
        <div className="field">
          <label className="label">
            Species{" "}
            <span className="req-mark" aria-hidden="true">
              *
            </span>
          </label>
          <select
            className="input"
            value={petForm.species}
            onChange={(e) =>
              setPetForm({
                ...petForm,
                species: e.target.value,
                species_other: "",
              })
            }
            required
            aria-required="true"
          >
            <option>Dog</option>
            <option>Cat</option>
            <option>Rabbit</option>
            <option>Bird</option>
            <option>Other</option>
          </select>
          {petForm.species === "Other" && (
            <div style={{ marginTop: "10px", marginBottom: "4px" }}>
              <input
                className="input"
                value={petForm.species_other || ""}
                onChange={(e) =>
                  setPetForm({ ...petForm, species_other: e.target.value })
                }
                placeholder="e.g. Tarantula, Hedgehog..."
              />
            </div>
          )}
          {!petForm.species ||
          (petForm.species === "Other" && !petForm.species_other) ? (
            <p className="field-hint field-warn">Species is required.</p>
          ) : null}
        </div>
        <div className="field">
          <label className="label">Breed</label>
          <input
            className="input"
            value={petForm.breed}
            onChange={(e) => setPetForm({ ...petForm, breed: e.target.value })}
            placeholder="e.g. Golden Retriever"
          />
        </div>
        <div className="field">
          <label className="label">Sex</label>
          <select
            className="input"
            value={petForm.sex || ""}
            onChange={(e) => setPetForm({ ...petForm, sex: e.target.value })}
          >
            <option value="">— Select —</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Unknown">Unknown</option>
          </select>
        </div>
        <div className="field">
          <label className="label">Birthday</label>
          <input
            className="input"
            type="date"
            value={petForm.birthday}
            onChange={(e) =>
              setPetForm({ ...petForm, birthday: e.target.value })
            }
          />
          {petForm.birthday && formatAge(petForm.birthday) && (
            <p className="field-hint">{formatAge(petForm.birthday)} old</p>
          )}
        </div>
        <div className="field">
          <label className="label">Weight</label>
          <div className="pp-weight-row">
            <input
              className="input pp-weight-input"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              value={petForm.weight_value}
              onChange={(e) =>
                setPetForm({ ...petForm, weight_value: e.target.value })
              }
              placeholder="e.g. 45"
            />
            <div
              className="pp-weight-unit-toggle"
              role="group"
              aria-label="Weight unit"
            >
              <button
                type="button"
                className={`pp-weight-unit-btn ${(petForm.weight_unit || "lbs") === "lbs" ? "active" : ""}`}
                onClick={() => {
                  // Convert kg → lbs if a value is set
                  if ((petForm.weight_unit || "lbs") === "lbs") return;
                  const v = petForm.weight_value;
                  const converted =
                    v !== "" && v != null && !isNaN(Number(v))
                      ? Math.round(Number(v) * 2.20462 * 10) / 10
                      : v;
                  setPetForm({
                    ...petForm,
                    weight_unit: "lbs",
                    weight_value: converted,
                  });
                }}
              >
                lbs
              </button>
              <button
                type="button"
                className={`pp-weight-unit-btn ${petForm.weight_unit === "kg" ? "active" : ""}`}
                onClick={() => {
                  if (petForm.weight_unit === "kg") return;
                  const v = petForm.weight_value;
                  const converted =
                    v !== "" && v != null && !isNaN(Number(v))
                      ? Math.round(Number(v) * 0.453592 * 10) / 10
                      : v;
                  setPetForm({
                    ...petForm,
                    weight_unit: "kg",
                    weight_value: converted,
                  });
                }}
              >
                kg
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="pp-section-divider">Medical</p>
      <div className="field">
        <label className="label">Microchip #</label>
        <input
          className="input"
          value={petForm.microchip_number}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "").slice(0, 15);
            setPetForm({ ...petForm, microchip_number: val });
            setMicrochipError(
              val.length > 0 &&
                val.length !== 9 &&
                val.length !== 10 &&
                val.length !== 15
                ? "Must be 9, 10, or 15 digits"
                : "",
            );
          }}
          placeholder="Microchip number"
          style={{
            borderColor: microchipError ? C.error : undefined,
            maxWidth: "260px",
          }}
        />
        <p className="field-hint">9, 10, or 15 digits</p>
        {microchipError && (
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "13px",
              fontWeight: 500,
              color: C.error,
            }}
          >
            {microchipError}
          </p>
        )}
      </div>
      <div className="field">
        <label className="label">Allergies</label>
        <input
          className="input"
          value={petForm.allergies}
          onChange={(e) =>
            setPetForm({ ...petForm, allergies: e.target.value })
          }
          placeholder="e.g. Chicken, pollen"
        />
        <p className="field-hint">Leave blank if none</p>
      </div>
      <div className="field">
        <label className="label">Medications</label>
        <input
          className="input"
          value={petForm.medications}
          onChange={(e) =>
            setPetForm({ ...petForm, medications: e.target.value })
          }
          placeholder="e.g. Apoquel 16mg daily"
        />
      </div>
      <div className="field">
        <label className="label">Notes</label>
        <AutoGrowTextarea
          className="input"
          value={petForm.notes}
          onChange={(e) => setPetForm({ ...petForm, notes: e.target.value })}
          placeholder="Any other important info..."
          rows={2}
          minHeight="64px"
        />
      </div>

      <p className="pp-section-divider">Owner Contact</p>
      <p
        style={{
          margin: "-8px 0 12px",
          fontSize: "13px",
          fontWeight: "500",
          color: C.muted,
        }}
      >
        Shown on the medical card so vets and finders know who to contact.
      </p>
      <div className="form-grid">
        <div className="field">
          <label className="label">Owner Name</label>
          <input
            className="input"
            value={petForm.owner_name}
            onChange={(e) =>
              setPetForm({ ...petForm, owner_name: e.target.value })
            }
            placeholder="Your full name"
          />
        </div>
        <div className="field">
          <label className="label">Owner Phone</label>
          <input
            className="input"
            value={petForm.owner_phone}
            onChange={(e) =>
              setPetForm({
                ...petForm,
                owner_phone: handlePhoneInput(e.target.value),
              })
            }
            placeholder="(555) 555-5555"
          />
        </div>
      </div>
      <div className="field">
        <label className="label">Owner Email</label>
        <input
          className="input"
          type="email"
          value={petForm.owner_email}
          onChange={(e) =>
            setPetForm({ ...petForm, owner_email: e.target.value })
          }
          placeholder="e.g. you@email.com"
        />
      </div>

      <p className="pp-section-divider">My Vet</p>
      <div className="form-grid">
        <div className="field">
          <label className="label">Vet Name</label>
          <div ref={vetPickerRef} style={{ position: "relative" }}>
            <input
              className="input"
              value={petForm.vet_name}
              onChange={(e) => {
                setPetForm({ ...petForm, vet_name: e.target.value });
                setVetDropdownOpen(true);
              }}
              onFocus={() => setVetDropdownOpen(true)}
              placeholder="Search or type your vet's name"
              autoComplete="off"
            />
            {vetDropdownOpen && filteredPetVets.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  zIndex: 20,
                  background: C.white,
                  border: `1.5px solid ${C.border}`,
                  borderRadius: "12px",
                  boxShadow: "0 12px 32px rgba(23,37,49,0.16)",
                  overflow: "hidden",
                  maxHeight: "264px",
                  overflowY: "auto",
                }}
              >
                {filteredPetVets.map((vet) => (
                  <div
                    key={vet.id}
                    onClick={() => pickPetVet(vet)}
                    style={{
                      padding: "10px 14px",
                      cursor: "pointer",
                      borderBottom: `1px solid ${C.border}`,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = C.cream)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "15px",
                        fontWeight: 700,
                        color: C.navyDark,
                      }}
                    >
                      {vet.name}
                    </p>
                    {(vet.city || vet.state) && (
                      <p
                        style={{
                          margin: "2px 0 0",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: C.muted,
                        }}
                      >
                        {[vet.city, vet.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="field">
          <label className="label">Vet Phone</label>
          <input
            className="input"
            value={petForm.vet_phone}
            onChange={(e) =>
              setPetForm({
                ...petForm,
                vet_phone: handlePhoneInput(e.target.value),
              })
            }
            placeholder="(555) 555-5555"
          />
        </div>
      </div>
      <div className="field">
        <label className="label">Vet Address</label>
        <input
          className="input"
          value={petForm.vet_address}
          onChange={(e) =>
            setPetForm({ ...petForm, vet_address: e.target.value })
          }
          placeholder="e.g. 123 Main St"
        />
      </div>
      <div className="form-grid">
        <div className="field">
          <label className="label">City</label>
          <input
            className="input"
            value={petForm.vet_city}
            onChange={(e) =>
              setPetForm({ ...petForm, vet_city: e.target.value })
            }
            placeholder="e.g. Oakland"
          />
        </div>
        <div className="field">
          <label className="label">ZIP</label>
          <input
            className="input"
            value={petForm.vet_zip}
            onChange={(e) =>
              setPetForm({ ...petForm, vet_zip: e.target.value })
            }
            placeholder="e.g. 94601"
          />
        </div>
      </div>

      {isEdit && (
        <p
          style={{
            margin: "20px 0 0",
            padding: "12px 16px",
            background: C.cream,
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: "500",
            color: C.muted,
          }}
        >
          Emergency contacts and symptom history live on{" "}
          <strong style={{ color: C.navyDark }}>{editingPet?.name}'s</strong>{" "}
          page. Save your edits, then tap the card to manage them.
        </p>
      )}

      <div
        className="btn-row"
        style={{
          marginTop: "24px",
          paddingTop: "20px",
          borderTop: `1px solid ${C.border}`,
          justifyContent: "space-between",
        }}
      >
        {onDelete ? (
          <button className="btn-danger-sm" onClick={onDelete}>
            Delete pet
          </button>
        ) : (
          <span />
        )}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={saving || !petForm.name || !!microchipError}
            onClick={onSave}
          >
            {saving
              ? "Saving..."
              : convertingPhoto
                ? "Converting photo..."
                : isEdit
                  ? "Save Changes"
                  : "Add Pet"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// CommunityContributions — public profile body (Option A)
// Hero metric: verified prices count, rendered in user's level color
// ════════════════════════════════════════════════════════════════════════
function CommunityContributions({
  C,
  profile,
  counts,
  level,
  currentLevelDef,
  joinedDate,
  memberDays,
  bannerKey,
  bannerPalette,
}) {
  const verifiedCount = counts.verifiedSubmissions || 0;
  const monthsActive = Math.floor(memberDays / 30);

  // Number on the dark medal: lightest stop (legible against deep medal bg)
  // Strong text in blurb on cream: deepest stop (legible against cream)
  const numberColor = currentLevelDef ? currentLevelDef.stops[0] : C.gold;
  const numberShadow = currentLevelDef ? currentLevelDef.stops[3] : C.navyDark;
  const blurbAccent = currentLevelDef ? currentLevelDef.stops[2] : C.navyDark;

  // Adaptive copy based on contribution level
  let credibilityCopy;
  const username = profile?.username
    ? `@${profile.username}`
    : profile?.full_name || "This user";
  const levelName = currentLevelDef?.name || "member";

  if (verifiedCount === 0) {
    credibilityCopy = (
      <>
        <strong style={{ fontWeight: 700, color: C.navyDark }}>
          {username}
        </strong>{" "}
        is just getting started — no verified prices yet.
      </>
    );
  } else if (verifiedCount < 10) {
    credibilityCopy = (
      <>
        <strong style={{ fontWeight: 700, color: C.navyDark }}>
          {username}
        </strong>{" "}
        has contributed{" "}
        <strong style={{ color: C.navyDark }}>
          {verifiedCount} verified {verifiedCount === 1 ? "price" : "prices"}
        </strong>{" "}
        {monthsActive >= 1
          ? `over ${monthsActive === 1 ? "1 month" : `${monthsActive} months`}.`
          : "as a new member."}
      </>
    );
  } else {
    credibilityCopy = (
      <>
        <strong style={{ fontWeight: 700, color: C.navyDark }}>
          {username}
        </strong>{" "}
        is a <strong style={{ color: blurbAccent }}>{levelName}</strong> who has
        been contributing for{" "}
        <strong style={{ color: C.navyDark }}>
          {monthsActive === 1 ? "1 month" : `${monthsActive} months`}
        </strong>
        .
      </>
    );
  }

  return (
    <div className="pp-cc-section">
      <p className="pp-cc-eyebrow">Community Contributions</p>

      {verifiedCount === 0 ? (
        // 0-state: simple "Just getting started" card (no medal, no chromatic gradient)
        <div className="pp-cc-empty">
          <div className="pp-cc-empty-icon">
            <Sprout size={32} strokeWidth={1.8} color={C.terracotta} />
          </div>
          <h3 className="pp-cc-empty-title">Just getting started</h3>
          <p className="pp-cc-empty-body">
            <strong style={{ fontWeight: 700, color: C.navyDark }}>
              {username}
            </strong>{" "}
            {currentLevelDef ? (
              <>
                is a <strong style={{ color: blurbAccent }}>{levelName}</strong>{" "}
                in the PetParrk community
              </>
            ) : (
              "is a new member of the PetParrk community"
            )}
            {monthsActive >= 1
              ? `, a member for ${monthsActive === 1 ? "1 month" : `${monthsActive} months`}.`
              : "."}
          </p>
          <p className="pp-cc-empty-body" style={{ marginTop: "6px" }}>
            Verified price contributions will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* The medal — chromatic panel with level-colored number */}
          <div className="pp-cc-medal-outer">
            <div
              className="pp-cc-medal"
              style={{
                background: `linear-gradient(160deg, ${bannerPalette.stops[1]} 0%, ${bannerPalette.stops[2]} 50%, ${bannerPalette.stops[3]} 100%)`,
              }}
            >
              {/* Verified checkmark badge — upper right */}
              <div
                className="pp-cc-verified"
                title="Each price reviewed by PetParrk admins"
              >
                <ShieldCheck size={18} strokeWidth={2.4} color={C.navyDark} />
              </div>

              <div
                className="pp-cc-number"
                style={{
                  color: numberColor,
                  textShadow: `0 4px 24px ${numberShadow}88`,
                }}
              >
                {verifiedCount}
              </div>
              <div className="pp-cc-number-label">
                VERIFIED {verifiedCount === 1 ? "PRICE" : "PRICES"}
              </div>

              <div className="pp-cc-verified-line">
                <ShieldCheck size={14} strokeWidth={2.2} color={C.gold} />
                <span>Each price reviewed by PetParrk admins</span>
              </div>
            </div>
          </div>

          {/* Credibility blurb */}
          <p className="pp-cc-blurb">{credibilityCopy}</p>
        </>
      )}
    </div>
  );
}
