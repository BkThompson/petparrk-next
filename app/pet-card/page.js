"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Dog,
  Cat,
  Bird,
  Rabbit,
  Fish,
  Sparkles,
  ArrowRight,
  Award,
  Plus,
  ClipboardList,
  PlusCircle,
  ShieldCheck,
  Heart,
  Share2,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import PageLoader from "../../components/PageLoader";
import HeroNameplate from "../../components/HeroNameplate";
import { getOwnerPets } from "../../lib/petCardApi";

// =============================================================
// SPECIES ICON + COLOR MAPPING (matches Profile page conventions)
// =============================================================

const SPECIES_ICON = {
  dog: Dog,
  cat: Cat,
  bird: Bird,
  small_furry: Rabbit,
  reptile_fish: Fish,
  mixed: Sparkles,
};

// Soft tinted backgrounds per species (lighter than Profile's hero gradients,
// suitable as a card-size empty-state placeholder)
const SPECIES_TINT = {
  dog: { bg: "rgba(185,90,24,0.10)", icon: "#B95A18" },
  cat: { bg: "rgba(106,38,96,0.10)", icon: "#6A2660" },
  bird: { bg: "rgba(27,92,130,0.10)", icon: "#1B5C82" },
  small_furry: { bg: "rgba(181,118,20,0.10)", icon: "#B57614" },
  reptile_fish: { bg: "rgba(26,102,56,0.10)", icon: "#1A6638" },
  mixed: { bg: "rgba(107,63,203,0.10)", icon: "#6B3FCB" },
};

// Map raw species string to bucket key (matches Profile's speciesBucket)
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

// Format age like Profile (simple display: "3 years", "6 months", "2 weeks")
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
// IDENTITY TAG DISPLAY (badges)
// =============================================================

const IDENTITY_TAG_META = {
  champion: { emoji: "🏆", label: "Champion" },
  service_therapy: { emoji: "⛑️", label: "Service" },
  rescue: { emoji: "🛟", label: "Rescue" },
  adventurer: { emoji: "🥾", label: "Adventurer" },
  royalty: { emoji: "👑", label: "Royalty" },
  working: { emoji: "🐾", label: "Working" },
  birthday_pup: { emoji: "🎂", label: "Birthday" },
  forever_loved: { emoji: "🌈", label: "Forever Loved" },
  puppy_kitten: { emoji: "👶", label: "Puppy" },
  senior: { emoji: "🧓", label: "Senior" },
  special_needs: { emoji: "🩺", label: "Special Needs" },
  foodie: { emoji: "🍎", label: "Foodie" },
  bff_pair: { emoji: "🤝", label: "BFF Pair" },
};

// =============================================================
// MAIN COMPONENT
// =============================================================

export default function PetCardLandingPage() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [pets, setPets] = useState(null); // null = loading, [] = none
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

  // Load pets when signed in
  useEffect(() => {
    if (session === undefined) return; // still loading session
    if (session === null) {
      setPets([]); // signed out — no pets to load
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await getOwnerPets();
      if (cancelled) return;
      if (error) {
        setLoadError("Could not load your pets. Please refresh.");
        setPets([]);
        return;
      }
      setPets(data || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  // ===========================================================
  // RENDER STATES
  // ===========================================================

  // Loading (session unknown OR pets loading for a signed-in user)
  if (session === undefined || (session && pets === null)) {
    return <PageLoader for="petCards" />;
  }

  // Signed-out: marketing page
  if (session === null) {
    return <MarketingView />;
  }

  // Signed-in, 0 pets: empty state
  if (pets.length === 0) {
    return <EmptyPetsView error={loadError} />;
  }

  // Signed-in, 1 pet: PageLoader visible during redirect
  if (pets.length === 1) {
    return <PageLoader for="openingCard" />;
  }

  // Signed-in, 2+ pets: picker
  return <PetPickerView pets={pets} />;
}

// =============================================================
// MARKETING VIEW (signed out)
// =============================================================

function MarketingView() {
  return (
    <>
      <style>{`
        .pc-marketing { background: var(--color-cream, #F5F0E8); min-height: calc(100vh - 64px); }
        .pc-container { max-width: 1040px; margin: 0 auto; padding: 0 24px; }

        /* Hero */
        .pc-hero { padding: 64px 0 32px; text-align: center; }
        .pc-hero-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-terracotta, #CF5C36);
          margin-bottom: 14px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pc-hero h1 {
          font-size: clamp(30px, 5.5vw, 56px);
          font-weight: 800;
          color: var(--color-navy-dark, #172531);
          letter-spacing: -0.025em;
          line-height: 1.05;
          margin: 0 0 18px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pc-hero p.pc-lede {
          font-size: 17px;
          font-weight: 500;
          color: var(--color-slate, #4B5563);
          line-height: 1.6;
          max-width: 640px;
          margin: 0 auto 32px;
        }
        .pc-cta-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

        /* Buttons */
        .pc-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 42px;
          padding: 0 24px;
          line-height: 1;
          background: var(--color-terracotta, #CF5C36);
          color: #fff;
          border: 2px solid var(--color-terracotta, #CF5C36);
          border-radius: 12px;
          text-decoration: none;
          font-weight: 700;
          font-size: 15px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: background 0.2s, color 0.2s;
        }
        .pc-btn-primary:hover { background: #fff; color: var(--color-terracotta, #CF5C36); }
        .pc-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 42px;
          padding: 0 24px;
          line-height: 1;
          background: transparent;
          color: var(--color-navy-dark, #172531);
          border: 2px solid var(--color-navy-dark, #172531);
          border-radius: 12px;
          text-decoration: none;
          font-weight: 700;
          font-size: 15px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: background 0.2s, color 0.2s;
        }

          .pc-btn-primary-signed-out {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 48px !important;
          padding: 0 24px;
          line-height: 1;
          background: var(--color-terracotta, #CF5C36);
          color: #fff;
          border: 2px solid var(--color-terracotta, #CF5C36);
          border-radius: 12px;
          text-decoration: none;
          font-weight: 700;
          font-size: 15px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: background 0.2s, color 0.2s;
        }

         .pc-btn-primary-signed-out:hover { background: #fff; color: var(--color-terracotta, #CF5C36);}


        .pc-btn-secondary:hover { background: var(--color-navy-dark, #172531); color: #fff; }

        /* Three features section. Section padding tightened on the bottom
           so the closing CTA sits closer to the cards instead of floating
           in a large vertical gap. */
        .pc-features { padding: 12px 0 20px; }
        .pc-features-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 768px) {
          .pc-features-grid { grid-template-columns: repeat(3, 1fr); gap: 24px; }
        }
        /* Light marketing card pattern — matches SCH .sc-step-outer and
           HIW step cards in structure (centered content, hover lift), but
           with the cream-page light theme. */
        .pc-feature-card {
          background: #fff;
          border-radius: 16px;
          padding: 36px 28px;
          border: 1px solid #EDE8E0;
          text-align: center;
          transition: transform 0.3s ease, border-color 0.2s,
                      box-shadow 0.2s;
        }
        .pc-feature-card:hover {
          transform: translateY(-4px);
          border-color: rgba(207,92,54,0.25);
          box-shadow: 0 16px 40px rgba(23,37,49,0.10);
        }
        /* Icon centered via auto margins (text-align centers inline-flex
           too, but auto margins are more explicit and reliable). */
        .pc-feature-icon-wrap {
          width: 60px;
          height: 60px;
          border-radius: 16px;
          background: rgba(207,92,54,0.10);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          color: var(--color-terracotta, #CF5C36);
        }
        .pc-feature-card h3 {
          font-size: 22px;
          font-weight: 800;
          color: var(--color-navy-dark, #172531);
          margin: 0 0 12px;
          letter-spacing: -0.025em;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pc-feature-card p {
          font-size: 15px;
          font-weight: 500;
          color: var(--color-slate, #4B5563);
          line-height: 1.7;
          margin: 0;
        }

        /* Closing CTA — padding-top tightened so it sits closer to
           the feature cards above instead of floating in a big gap. */
        .pc-closing {
          padding: 24px 0 80px;
          text-align: center;
        }
        .pc-closing h2 {
          font-size: clamp(26px, 3.5vw, 34px);
          font-weight: 800;
          color: var(--color-navy-dark, #172531);
          margin: 0 0 14px;
          letter-spacing: -0.025em;
          line-height: 1.15;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pc-closing p {
          font-size: 16px;
          font-weight: 500;
          color: var(--color-slate, #4B5563);
          line-height: 1.6;
          margin: 0 0 26px;
          max-width: 520px;
          margin-left: auto;
          margin-right: auto;
        }

        @media (max-width: 640px) {
          .pc-container { padding: 0 16px; }
          .pc-hero { padding: 48px 0 32px; }
          .pc-features { padding: 12px 0 20px; }
          .pc-feature-card { padding: 24px 22px; }
          .pc-cta-row .pc-btn-primary,
          .pc-cta-row .pc-btn-secondary,
          .pc-closing .pc-btn-primary { width: 100%; justify-content: center; }
        }
      `}</style>

      <div className="pc-marketing">
        <div className="pc-container">
          {/* Hero */}
          <section className="pc-hero">
            <p className="pc-hero-eyebrow">Pet Cards</p>
            <h1>One card for every moment your pet matters most.</h1>
            <p className="pc-lede">
              A complete record for the vet. A trusted handoff for the sitter. A
              celebration of who your pet really is — built once, ready whenever
              you need it.
            </p>
            <div className="pc-cta-row">
              <Link
                href="/auth?tab=signup"
                className="pc-btn-primary pc-btn-primary-signed-out"
              >
                Create your free card
                <ArrowRight size={16} strokeWidth={2.4} />
              </Link>
            </div>
          </section>

          {/* Three features */}
          <section className="pc-features">
            <div className="pc-features-grid">
              <div className="pc-feature-card">
                <div className="pc-feature-icon-wrap">
                  <ShieldCheck size={24} strokeWidth={2} />
                </div>
                <h3>Care Card</h3>
                <p>
                  Vaccinations, medications, allergies, microchip, emergency
                  contacts — organized so a vet or sitter can find what they
                  need in seconds.
                </p>
              </div>

              <div className="pc-feature-card">
                <div className="pc-feature-icon-wrap">
                  <Heart size={24} strokeWidth={2} />
                </div>
                <h3>Hero Card</h3>
                <p>
                  The personality behind the paws. Loves, quirks, fun facts,
                  identity tags — a card that celebrates who your pet really is.
                </p>
              </div>

              <div className="pc-feature-card">
                <div className="pc-feature-icon-wrap">
                  <Share2 size={24} strokeWidth={2} />
                </div>
                <h3>Share anywhere</h3>
                <p>
                  Send a private link, download a PDF, or post the Hero Card to
                  share what makes your pet special. You stay in control.
                </p>
              </div>
            </div>
          </section>

          {/* Closing CTA */}
          <section className="pc-closing">
            <h2>Built for every pet. Free to start.</h2>
            <p>
              Add your pet&apos;s details once. Generate cards on demand, update
              anytime, share with confidence.
            </p>
            <Link
              href="/auth?tab=signup"
              className="pc-btn-primary pc-btn-primary-signed-out"
            >
              Create your free card
              <ArrowRight size={16} strokeWidth={2.4} />
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}

// =============================================================
// EMPTY STATE (signed in, 0 pets)
// =============================================================

function EmptyPetsView({ error }) {
  return (
    <>
      <style>{`
        .pc-empty { background: var(--color-cream, #F5F0E8); min-height: calc(100vh - 64px); display: flex; align-items: center; justify-content: center; padding: 48px 24px; }
        .pc-empty-card {
          background: #fff;
          border-radius: 20px;
          padding: 48px 36px;
          max-width: 460px;
          width: 100%;
          text-align: center;
          border: 1px solid rgba(23,37,49,0.06);
        }
        .pc-empty-icon {
          width: 72px;
          height: 72px;
          border-radius: 18px;
          background: rgba(207,92,54,0.10);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          color: var(--color-terracotta, #CF5C36);
        }
        .pc-empty h2 {
          font-size: 22px;
          font-weight: 800;
          color: var(--color-navy-dark, #172531);
          margin: 0 0 10px;
          letter-spacing: -0.01em;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pc-empty p {
          font-size: 16px;
          font-weight: 500;
          color: var(--color-slate, #4B5563);
          line-height: 1.6;
          margin: 0 0 24px;
        }
        .pc-empty-err {
          font-size: 14px;
          color: #C94040;
          margin: 0 0 16px;
        }
        @media (max-width: 480px) {
          .pc-empty-card { padding: 36px 24px; }
        }
      `}</style>
      <div className="pc-empty">
        <div className="pc-empty-card">
          <div className="pc-empty-icon">
            <PlusCircle size={36} strokeWidth={2} />
          </div>
          <h2>No pets yet</h2>
          {error ? <p className="pc-empty-err">{error}</p> : null}
          <p>
            Add a pet from your profile to start building their Health and Hero
            cards.
          </p>
          <Link href="/profile?add=1" className="pc-btn-primary">
            Go to your profile
            <ArrowRight size={16} strokeWidth={2.4} />
          </Link>
        </div>
      </div>
      <style>{`
        .pc-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 42px;
          padding: 0 24px;
          line-height: 1;
          background: var(--color-terracotta, #CF5C36);
          color: #fff;
          border: 2px solid var(--color-terracotta, #CF5C36);
          border-radius: 12px;
          text-decoration: none;
          font-weight: 700;
          font-size: 15px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: background 0.2s, color 0.2s;
        }
        .pc-btn-primary:hover { background: #fff; color: var(--color-terracotta, #CF5C36); }

          .pc-btn-primary-signed-out {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 48px !important;
          padding: 0 24px;
          line-height: 1;
          background: var(--color-terracotta, #CF5C36);
          color: #fff;
          border: 2px solid var(--color-terracotta, #CF5C36);
          border-radius: 12px;
          text-decoration: none;
          font-weight: 700;
          font-size: 15px;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          transition: background 0.2s, color 0.2s;
        }

         .pc-btn-primary-signed-out:hover { background: #fff; color: var(--color-terracotta, #CF5C36); }

      `}</style>
    </>
  );
}

// =============================================================
// PET CARDS HUB — central directory of all your cards.
// Two sections (Hero Cards / Care Cards). Every pet appears in
// BOTH. Entries are mini card-previews echoing the real card
// fronts — NOT full pet info (that lives in the cards themselves).
// =============================================================

// Default Hero theme colors (bg/card) for the mini preview when a pet hasn't
// customized them. Rarity + accent are owned by the shared HeroNameplate.
const HUB_DEFAULT_BG = "#F8EFE2";
const HUB_DEFAULT_CARD = "#FFFFFF";

function hubMeaningful(v) {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s && s !== "none" && s !== "n/a" && s !== "-";
}

// ── Mini HERO preview ────────────────────────────────────────
// Published => faithful mini of the card front (photo + nameplate +
// rarity, themed by the published snapshot's colors), links to the Hero
// display. Not published => "Set up" state linking to the Hero editor.
function HeroPreviewTile({ pet }) {
  const pub = pet.hero_published || null;
  const isPublished = !!pet.hero_is_published && !!pub;
  // When published, read the PUBLISHED SNAPSHOT so the preview matches exactly
  // what the public sees (not the live draft).
  const data = isPublished ? { ...pet, ...pub } : pet;

  const bgColor = data.hero_bg_color || HUB_DEFAULT_BG;
  const cardColor = data.hero_card_color || HUB_DEFAULT_CARD;

  if (!isPublished) {
    return (
      <Link
        href={`/pet-card/${pet.slug}/hero-edit`}
        className="pc-hub-tile pc-hub-tile--setup"
        aria-label={`Set up ${pet.name}'s Hero Card`}
      >
        <div className="pc-hub-inner pc-hub-setup-inner">
          <div className="pc-hub-setup-icon">
            <Sparkles size={26} strokeWidth={1.75} />
          </div>
          <p className="pc-hub-setup-name">{pet.name}</p>
          <span className="pc-hub-setup-cta">
            <Plus size={14} strokeWidth={2.4} />
            Set up Hero Card
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/pet-card/${pet.slug}/hero`}
      className="pc-hub-tile pc-hub-tile--hero"
      aria-label={`Open ${pet.name}'s Hero Card`}
    >
      <div className="pc-hub-inner" style={{ background: bgColor }}>
        <div className="pc-hub-hero-photo">
          <HeroNameplate
            variant="mini"
            name={pet.name}
            nickname={data.nickname}
            breed={pet.breed}
            photoUrl={pet.photo_url}
            species={pet.species}
            rarity={data.hero_rarity}
            cardColor={cardColor}
          />
        </div>
      </div>
    </Link>
  );
}

// ── Mini CARE preview ────────────────────────────────────────
// Every pet always has a Care card (it's the pet's core info), so this is
// always "live" — no set-up state. Styled in the Care card (pcc-) visual
// language: clean, clinical, terracotta accent. Links to the owner Care
// display.
function CarePreviewTile({ pet }) {
  return (
    <Link
      href={`/pet-card/${pet.slug}/care`}
      className="pc-hub-tile pc-hub-tile--care"
      aria-label={`Open ${pet.name}'s Care Card`}
    >
      <div className="pc-hub-inner">
        <div className="pc-hub-care-photo">
          {pet.photo_url ? (
            <img src={pet.photo_url} alt={pet.name} loading="lazy" />
          ) : (
            <div className="pc-hub-care-photo-ph">
              <ClipboardList
                size={28}
                strokeWidth={1.6}
                color="rgba(255,255,255,0.9)"
              />
            </div>
          )}
        </div>
        <div className="pc-hub-care-body">
          <span className="pc-hub-care-eyebrow">
            <ClipboardList size={12} strokeWidth={2.2} />
            Care Card
          </span>
          <span className="pc-hub-care-name">{pet.name}</span>
          {hubMeaningful(pet.breed) && (
            <span className="pc-hub-care-breed">{pet.breed}</span>
          )}
        </div>
        <ArrowRight size={16} strokeWidth={2.2} className="pc-hub-care-arrow" />
      </div>
    </Link>
  );
}

function PetPickerView({ pets }) {
  const petCount = pets.length;
  // Hero grid columns — MATCHES ProfileMain's gridCols exactly for cross-page
  // consistency: 1 centered, 2 centered pair, 3+ => 3-up (cols-4 CSS is also
  // 3-up, so 4 pets flow 3 + 1 just like Profile).
  const heroCols =
    petCount === 1 ? 1 : petCount === 2 ? 2 : petCount === 4 ? 4 : 3;
  // Care grid — count-driven 3-up, MATCHING Hero exactly (1 centered, 2 pair,
  // 3+ => 3-up). Wide tiles hold up fine at ~320px in a 3-wide row.
  const careCols = heroCols;
  return (
    <>
      <style>{`
        .pc-hub { 
          background: var(--color-cream, #F5F0E8); 
          // min-height: calc(100vh - 64px); 
          padding: 56px 0 60px; 
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .pc-hub .pp-container-mixed { max-width: 760px; }
        }
        @media (min-width: 501px) and (max-width: 768px) {
          .pc-hub .pp-container-mixed { max-width: 720px; }
        }
        /* Match ProfileMain's mobile gutter exactly (0 16px) so both pages
           share the same edge padding on phones. */
        @media (max-width: 768px) {
          .pc-hub .pp-container-mixed { padding: 0 16px; }
        }

        /* ── Page header + add action ── */
        .pc-hub-header {
          display: flex; align-items: flex-end; justify-content: space-between;
          gap: 20px; margin-bottom: 20px; flex-wrap: wrap;
        }
        .pc-hub-header-text { text-align: left; }
        .pc-hub-eyebrow {
          margin: 0 0 4px; font-size: 11px; font-weight: 700;
          color: var(--color-terracotta, #CF5C36);
          text-transform: uppercase; letter-spacing: 0.10em;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        .pc-hub-header-text h1 {
          margin: 0; font-size: clamp(30px, 2.6vw, 30px); font-weight: 800;
          color: var(--color-navy-dark, #172531); letter-spacing: -0.025em;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        /* Subtitle only — scoped to the sibling <p> after h1 so it never
           overrides the eyebrow <p>'s (inline) accent color. */
        .pc-hub-header-text h1 + p {
          margin: 6px 0 0; color: var(--color-slate, #4B5563); font-size: 16px; font-weight: 500;
        }
        /* Add-a-pet button — MATCHES ProfileMain's .pp-add-pet-btn exactly. */
        .pc-hub-add {
          padding: 0 24px; height: 42px;
          background: var(--color-navy-dark, #172531); color: #fff;
          border: 2px solid var(--color-navy-dark, #172531); border-radius: 10px;
          font-size: 15px; font-weight: 700;
          cursor: pointer; white-space: nowrap; text-decoration: none;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
          flex-shrink: 0;
        }
        .pc-hub-add:hover {
          background: #fff;
          color: var(--color-navy-dark, #172531);
          border-color: var(--color-navy-dark, #172531);
        }
        .pc-hub-add-mobile { display: none; margin-top: 28px; }
        .pc-hub-add-mobile .pc-hub-add { width: 100%; }
        @media (max-width: 767px) {
          .pc-hub-add-top { display: none; }
          .pc-hub-add-mobile { display: block; margin-top: -20px;}
        }

        /* ── Sections ── */
        .pc-hub-section { margin-bottom: 40px; }
        .pc-hub-section:last-of-type { margin-bottom: 0; }
        /* Divider line above each section title — mirrors ProfileMain's
           .pp-section-divider (hairline top border + padding above the label). */
        .pc-hub-section-head {
          display: flex; align-items: center; gap: 9px;
          margin-bottom: 16px; padding-top: 30px;
          border-top: 1px solid var(--color-border, #EDE8E0);
        }
        .pc-hub-section-title {
          font-size: 18px; font-weight: 800; letter-spacing: 0.04em;
          text-transform: uppercase; color: var(--color-navy-dark, #172531); margin: 0;
        }
        .pc-hub-section-count {
          font-size: 13px; font-weight: 800; color: var(--color-navy-dark, #172531);
          background: rgba(23,37,49,0.10); border-radius: 999px; padding: 2px 10px;
          line-height: 1.6;
        }
        .pc-hub-section-icon { color: var(--color-terracotta, #CF5C36); display: inline-flex; }

        /* ── Grids ── */
        /* ── Grids: count-driven columns, MATCHING ProfileMain's pet-grid for
           cross-page consistency. Hero (portrait tiles): 1 centered / 2
           centered pair / 3+ => 3-up. Care (wide horizontal rows): 1 centered
           / 2+ => 2-up (a 3-wide row stretches too thin). ── */
        .pc-hub-grid { display: grid; gap: 16px; }

        /* Hero — mirrors .pp-pet-grid exactly */
        .pc-hub-grid--hero.cols-1 { grid-template-columns: 320px; justify-content: center; }
        .pc-hub-grid--hero.cols-2 { grid-template-columns: repeat(2, 300px); justify-content: center; }
        .pc-hub-grid--hero.cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .pc-hub-grid--hero.cols-4 { grid-template-columns: repeat(3, minmax(0, 1fr)); }

        /* Care — capped at 2-up */
        .pc-hub-grid--care.cols-1 { grid-template-columns: minmax(0, 460px); justify-content: center; }
        .pc-hub-grid--care.cols-2 { grid-template-columns: repeat(2, minmax(0, 460px)); justify-content: center; }
        .pc-hub-grid--care.cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .pc-hub-grid--care.cols-4 { grid-template-columns: repeat(3, minmax(0, 1fr)); }

        /* TABLET (768–1023): Hero drops to 2-up so tiles keep a card-like size */
        @media (min-width: 768px) and (max-width: 1023px) {
          .pc-hub-grid--hero.cols-3,
          .pc-hub-grid--hero.cols-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .pc-hub-grid--care.cols-3,
          .pc-hub-grid--care.cols-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        /* ≤767: single column that FILLS the container (caps at 460px like
           ProfileMain's --pp-card-max, so on phones the tile spans full width
           with no centered side-gutter — matches Profile exactly). */
        @media (max-width: 767px) {
          .pc-hub-grid--hero.cols-1,
          .pc-hub-grid--hero.cols-2,
          .pc-hub-grid--hero.cols-3,
          .pc-hub-grid--hero.cols-4 {
            grid-template-columns: minmax(0, 460px);
            justify-content: center;
            gap: 30px;
          }
          .pc-hub-grid--care.cols-1,
          .pc-hub-grid--care.cols-2,
          .pc-hub-grid--care.cols-3,
          .pc-hub-grid--care.cols-4 {
            grid-template-columns: minmax(0, 460px);
            justify-content: center;
          }
        }

        /* ── Shared tile base ── */
        /* Frame look mirrors Profile's .pp-pet-card-outer / .pp-pet-card:
           18px radius, a resting 1.5px border-color frame, matching shadow,
           and a soft-gold frame on hover (rgba(239,200,139,0.5)). */
        /* TWO-LAYER FRAME (mirrors Profile's .pp-pet-card-outer / .pp-pet-card):
           the tile is the OUTER — 1.5px of frame-color padding shows as a ring
           around the inner content; radius 18px outer / 16.5px inner. On hover
           the frame turns soft gold (rgba(239,200,139,0.5)), exactly like
           Profile. Because the frame is a background behind 1.5px of padding
           (not a same-color border on cream), it stays visible on any bg. */
        .pc-hub-tile {
          display: block; text-decoration: none;
          border-radius: 18px; padding: 1.5px;
          background: var(--color-border, #EDE8E0);
          box-shadow: 0 2px 12px rgba(23,37,49,0.07);
          transition: transform 0.3s, background 0.25s ease, box-shadow 0.25s;
          font-family: var(--font-urbanist,'Urbanist',sans-serif);
        }
        /* Hover — EXACT match to Profile's .pp-pet-card-outer:hover: the outer
           frame goes soft gold (0.5), and the inner card gets a 0.9 gold ring
           via box-shadow + lift. The 0.9 ring is drawn ON the inner edge so it
           reads on BOTH the white Care inner and the dark Hero inner. */
        .pc-hub-tile:hover {
          transform: translateY(-3px);
          background: rgba(239,200,139,0.5);
        }
        .pc-hub-tile:hover > .pc-hub-inner {
          box-shadow: 0 0 0 1.5px rgba(239,200,139,0.9), 0 16px 48px rgba(23,37,49,0.13);
        }
        /* Inner surface — the actual card content, clipped to a slightly
           smaller radius so the frame shows around it. */
        .pc-hub-tile > .pc-hub-inner {
          border-radius: 16.5px; overflow: hidden; height: 100%;
          display: block; position: relative;
          transition: box-shadow 0.25s;
        }

        /* ── HERO mini preview ── */
        .pc-hub-tile--hero { position: relative; }
        /* Aspect-ratio frame; the photo + nameplate come from the shared
           <HeroNameplate variant="mini"> component (single source of truth). */
        .pc-hub-hero-photo {
          position: relative; width: 100%; aspect-ratio: 4 / 5; overflow: hidden;
        }

        /* ── HERO set-up state ── */
        /* Setup is a dashed CTA, not a framed card — override the frame: no
           padding-frame, a real dashed border, transparent inner. */
        .pc-hub-tile--setup {
          background: #fff; padding: 0;
          border: 1.5px dashed var(--color-border-strong, #DAD3C5);
          box-shadow: none;
        }
        .pc-hub-tile--setup > .pc-hub-inner {
          background: transparent; border-radius: 16.5px;
          display: flex; align-items: center; justify-content: center;
          aspect-ratio: 4 / 5;
        }
        .pc-hub-tile--setup:hover {
          background: #fff;
          border-color: var(--color-terracotta, #CF5C36);
          box-shadow: 0 10px 28px rgba(23,37,49,0.10);
        }
        .pc-hub-setup-inner {
          display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 20px; text-align: center;
        }
        .pc-hub-setup-icon {
          width: 56px; height: 56px; border-radius: 50%;
          background: var(--color-cream, #F5F0E8);
          display: flex; align-items: center; justify-content: center;
          color: var(--color-terracotta, #CF5C36);
        }
        .pc-hub-setup-name {
          margin: 0; font-size: 18px; font-weight: 800;
          color: var(--color-navy-dark, #172531);
        }
        .pc-hub-setup-cta {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 14px; font-weight: 700; color: var(--color-terracotta, #CF5C36);
        }

        /* ── CARE mini preview (pcc- visual language) ── */
        .pc-hub-tile--care > .pc-hub-inner {
          background: #fff; display: flex; align-items: center; gap: 14px; padding: 14px;
        }
        .pc-hub-care-photo {
          width: 64px; height: 64px; border-radius: 12px; overflow: hidden; flex-shrink: 0;
        }
        .pc-hub-care-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .pc-hub-care-photo-ph {
          width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #5C8FA8 0%, #2C5F6B 100%);
        }
        .pc-hub-care-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
        .pc-hub-care-eyebrow {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 12px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
          color: var(--color-terracotta, #CF5C36);
        }
        .pc-hub-care-name {
          font-size: 18px; font-weight: 800; color: var(--color-navy-dark, #172531);
          line-height: 1.15; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .pc-hub-care-breed {
          font-size: 14px; font-weight: 500; color: var(--color-, #4B5563);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .pc-hub-care-arrow { color: var(--color-terracotta, #CF5C36); flex-shrink: 0; transition: transform 0.15s; }
        .pc-hub-tile--care:hover .pc-hub-care-arrow { transform: translateX(3px); }

        @media (max-width: 480px) {
          .pc-hub { padding: 40px 0 72px; }
        }
      `}</style>

      <div className="pc-hub">
        <div className="pp-container-mixed">
          <div className="pc-hub-header">
            <div className="pc-hub-header-text">
              <p className="pc-hub-eyebrow">The Hub</p>
              <h1>Your Pet Cards</h1>
              <p>Every card for every pet, all in one place.</p>
            </div>
            <Link href="/profile?add=1" className="pc-hub-add pc-hub-add-top">
              <Plus size={16} strokeWidth={2.4} />
              Add a pet
            </Link>
          </div>

          {/* HERO CARDS */}
          <div className="pc-hub-section">
            <div className="pc-hub-section-head">
              <span className="pc-hub-section-icon">
                <Award size={17} strokeWidth={2.2} />
              </span>
              <h2 className="pc-hub-section-title">Hero Cards</h2>
              <span className="pc-hub-section-count">{pets.length}</span>
            </div>
            <div className={`pc-hub-grid pc-hub-grid--hero cols-${heroCols}`}>
              {pets.map((pet) => (
                <HeroPreviewTile key={pet.id} pet={pet} />
              ))}
            </div>
          </div>

          {/* CARE CARDS */}
          <div className="pc-hub-section">
            <div className="pc-hub-section-head">
              <span className="pc-hub-section-icon">
                <ClipboardList size={17} strokeWidth={2.2} />
              </span>
              <h2 className="pc-hub-section-title">Care Cards</h2>
              <span className="pc-hub-section-count">{pets.length}</span>
            </div>
            <div className={`pc-hub-grid pc-hub-grid--care cols-${careCols}`}>
              {pets.map((pet) => (
                <CarePreviewTile key={pet.id} pet={pet} />
              ))}
            </div>
          </div>

          {/* Add-a-pet — bottom on tablet/mobile (top button hidden ≤767px) */}
          <div className="pc-hub-add-mobile">
            <Link href="/profile?add=1" className="pc-hub-add">
              <Plus size={16} strokeWidth={2.4} />
              Add a pet
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
