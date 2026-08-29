"use client";

// ============================================================================
// CareCardView — SINGLE SOURCE OF TRUTH for the Care Card read-view.
// ----------------------------------------------------------------------------
// Rendered by BOTH:
//   • the owner display page  (app/pet-card/[slug]/care/page.js)      mode="owner"
//   • the public token page   (app/pet-card/[slug]/care/[token]/page.js) mode="public"
// Each page loads its OWN data (owner loaders vs shared-token loaders) and passes
// { pet, medical } in as props. Everything visual — markup, styles, jump-nav,
// scroll-spy — lives here, so the two read-views can never drift again.
//   mode="owner"  → renders OwnerActionsSection (Edit / Share & Privacy / Download)
//   mode="public" → omits all owner actions (no-login shared card)
// ============================================================================

import { useEffect, useState, useRef } from "react";
import {
  Dog,
  Cat,
  Bird,
  Rabbit,
  Fish,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  HeartPulse,
  Syringe,
  Pill,
  UtensilsCrossed,
  PawPrint,
  Stethoscope,
  Siren,
  CalendarClock,
  PhoneCall,
  ShieldCheck,
  Users,
  ArrowUp,
  Link2,
  QrCode,
  Download,
  Printer,
  Share2,
  Pencil,
  Check,
  Plus,
  ClipboardList,
  ChevronDown,
} from "lucide-react";
import Breadcrumb from "./Breadcrumb";
import VisitRecap from "./VisitRecap";
import PetInsights from "./PetInsights";
import { getActiveVisitPrepForPet, getRecapsForPet } from "../lib/copilotApi";

// ----------------------------------------------------------------------------
// Main component. Data comes in via props; each page owns its own loading.
// ----------------------------------------------------------------------------
export default function CareCardView({ pet, medical, mode = "public", slug }) {
  const isOwner = mode === "owner";
  return (
    <>
      <CareCardStyles />
      <div className="pcc-body">
        <div className="pcc-container">
          {isOwner ? (
            <Breadcrumb
              items={[
                { label: "Pet Cards", href: "/pet-card" },
                { label: pet.name || "Pet" },
                { label: "Care Card" },
              ]}
            />
          ) : null}
          <PetHeader pet={pet} />
          <CareJumpNav />
          {isOwner ? (
            <div className="pcc-section pcc-insights-section">
              <PetInsights petId={pet.id} surface="care" petName={pet.name} />
            </div>
          ) : null}
          <div className="pcc-anchor" id="sec-identity" data-nav="Identity">
            <IdentitySection pet={pet} />
          </div>
          <div className="pcc-anchor" id="sec-safety" data-nav="Safety">
            <SafetySection pet={pet} />
          </div>
          <div className="pcc-anchor" id="sec-emergency" data-nav="Emergency">
            <EmergencyContactsSection
              items={medical.emergency_contacts || []}
            />
          </div>
          <div className="pcc-anchor" id="sec-medical" data-nav="Medical">
            <MedicalSection
              vaccinations={medical.vaccinations || []}
              medications={medical.medications || []}
            />
          </div>
          <div className="pcc-anchor" id="sec-routine" data-nav="Routine">
            <CareRoutineSection pet={pet} />
          </div>
          <div className="pcc-anchor" id="sec-vets" data-nav="Vets">
            <VetSection pet={pet} />
          </div>
          <div
            className="pcc-anchor"
            id="sec-specialists"
            data-nav="Specialists"
          >
            <SpecialistsSection items={medical.specialists || []} />
          </div>
          <div className="pcc-anchor" id="sec-insurance" data-nav="Insurance">
            <InsuranceSection pet={pet} />
          </div>
          <div className="pcc-anchor" id="sec-visits" data-nav="Visits">
            <VetVisitsSection
              items={medical.vet_visits || []}
              isOwner={isOwner}
              petId={pet.id}
              slug={slug}
            />
          </div>
          {isOwner ? (
            <OwnerActionsSection slug={slug} petName={pet.name} />
          ) : null}
          <HelplineSection />
          <PetParrkFooter />
        </div>
        <ScrollTopButton />
      </div>
    </>
  );
}

function meaningfulField(val) {
  if (!val) return false;
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
    return false;
  return true;
}

// ============================================================================
// SCROLL-TO-TOP — floating button that appears after scrolling down. Pairs with
// the jump-nav (which only goes down to sections); this gets you back up.
// Hidden in print.
// ============================================================================
function ScrollTopButton() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <button
      type="button"
      className="pcc-scrolltop"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <ArrowUp size={20} strokeWidth={2.4} />
    </button>
  );
}

// ============================================================================
// JUMP NAV — sticky in-page navigation. Builds itself from the section anchors
// that ACTUALLY rendered (empty sections return null, so their .pcc-anchor is
// empty and we skip it — the nav never links to a missing section). Click =
// smooth scroll with sticky offset. Scroll-spy highlights the current section.
// Hidden in print (the PDF wants the full document, not nav chrome).
// ============================================================================
function CareJumpNav() {
  const [links, setLinks] = useState([]);
  const [activeId, setActiveId] = useState(null);

  // After mount, read which anchors have content and build the link list.
  useEffect(() => {
    const anchors = Array.from(document.querySelectorAll(".pcc-anchor"));
    const present = anchors
      .filter((a) => a.children.length > 0) // empty section => null => skip
      .map((a) => ({ id: a.id, label: a.getAttribute("data-nav") }));
    setLinks(present);
  }, []);

  // Scroll-spy: highlight the section currently nearest the top.
  useEffect(() => {
    if (links.length === 0) return;
    const ids = links.map((l) => l.id);
    const onScroll = () => {
      // A section becomes "current" once its top passes just below the sticky
      // jump-nav. This threshold is intentionally a touch LARGER than the anchor
      // scroll-margin landing point (nav 64 + jump-nav 56 = 120), so a section
      // that has just been scrolled into place — whose top rests at ~120px —
      // reliably registers as current instead of the previous one (off-by-one).
      const offset = 132;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - offset <= 0) current = id;
      }
      // Bottom-of-page guard: the final section often can't scroll its top up
      // to the offset line (there isn't enough content below it), so the loop
      // would stick on the second-to-last link. Once we're within a few px of
      // the page bottom, force the last section active.
      const scrolledToBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (scrolledToBottom) current = ids[ids.length - 1];
      setActiveId(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [links]);

  function jumpTo(e, id) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    // Native scroll — honors the .pcc-anchor `scroll-margin-top`, so the
    // section always lands just below the navbar + sticky jump-nav. Robust
    // against smooth-scroll timing (no mid-animation rect measurement).
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    if (history.replaceState) history.replaceState(null, "", `#${id}`);
  }

  if (links.length <= 1) return null; // nothing to navigate

  return (
    <nav className="pcc-jumpnav" aria-label="Jump to section">
      <div className="pcc-jumpnav-track">
        {links.map((l) => (
          <a
            key={l.id}
            href={`#${l.id}`}
            onClick={(e) => jumpTo(e, l.id)}
            className={`pcc-jumpnav-link ${
              activeId === l.id ? "is-active" : ""
            }`}
          >
            {l.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function PetHeader({ pet }) {
  const SpeciesIcon = getSpeciesIcon(pet.species);
  // Header shows only the age — species + breed live in the Identity
  // section below to avoid duplicating facts across the card.
  const ageStr = formatAge(pet.birthday);
  const ageWithSuffix = ageStr ? `${ageStr} old` : null;

  return (
    <div className="pcc-pet-header">
      <div className="pcc-pet-photo-wrap">
        {pet.photo_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={pet.photo_url}
            alt={pet.name || "Pet"}
            className="pcc-pet-photo"
          />
        ) : (
          <div className="pcc-pet-photo-placeholder">
            <SpeciesIcon size={48} strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="pcc-pet-header-info">
        <p className="pcc-pet-eyebrow">Care Card</p>
        <h1 className="pcc-pet-name">{pet.name || "Unnamed pet"}</h1>
        {ageWithSuffix ? (
          <p className="pcc-pet-quick-meta">{ageWithSuffix}</p>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================================
// IDENTITY SECTION
// ============================================================================
function IdentitySection({ pet }) {
  const fields = [];
  if (pet.species)
    fields.push({ label: "Species", value: capitalize(pet.species) });
  if (pet.breed) fields.push({ label: "Breed", value: pet.breed });
  if (pet.sex) fields.push({ label: "Sex", value: capitalize(pet.sex) });
  if (pet.altered_status) {
    // altered_status is text: "Spayed" | "Neutered" | "Intact" | "Unknown".
    const sexLower = (pet.sex || "").toLowerCase();
    const isAltered =
      pet.altered_status === "Spayed" || pet.altered_status === "Neutered";
    fields.push({
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
    // Age is shown in the header; only the date lives here.
    fields.push({
      label: "Birthday",
      value: formatShortDate(pet.birthday),
    });
  }
  if (pet.weight_value) {
    fields.push({
      label: "Weight",
      value: `${pet.weight_value} ${pet.weight_unit || "lbs"}`,
    });
  }
  if (pet.color_markings)
    fields.push({ label: "Color", value: pet.color_markings });
  if (pet.microchip_number) {
    fields.push({ label: "Microchip", value: pet.microchip_number });
  }

  if (fields.length === 0) return null;

  return (
    <div className="pcc-section">
      <div className="pcc-section-header">
        <p className="pcc-section-eyebrow">Identity</p>
        <h2 className="pcc-section-title">About {pet.name || "your pet"}</h2>
        <p className="pcc-section-sub">The basics at a glance.</p>
      </div>

      <div className="pcc-list">
        <div className="pcc-list-item">
          <div className="pcc-list-item-body">
            <div className="pcc-list-item-title-row">
              <span className="pcc-list-item-icon-inline">
                <PawPrint size={18} strokeWidth={2} />
              </span>
              <p className="pcc-list-item-title">{pet.name || "Unnamed pet"}</p>
            </div>
            <div className="pcc-list-item-sep" />
            <div
              className="pcc-list-item-meta pcc-list-item-meta--identity"
              style={{ "--col-count": 2 }}
            >
              {fields.map((f) => (
                <div key={f.label} className="pcc-list-item-meta-row">
                  <span className="pcc-list-item-meta-label">{f.label}:</span>
                  {f.subValue ? (
                    <span className="pcc-list-item-meta-value pcc-identity-value-stack">
                      <span>{f.value}</span>
                      <span className="pcc-identity-sub-line">
                        {f.subValue}
                      </span>
                    </span>
                  ) : (
                    <span className="pcc-list-item-meta-value">{f.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SAFETY SECTION — allergies, conditions, quirks
// ============================================================================
// Most critical content on the card, so it lives near the top. Uses the
// editor's TextareaCard visual pattern: single list-item card per topic,
// with the icon top-aligned next to a multi-line prose body (no bold title).
function SafetySection({ pet }) {
  const blocks = [];
  if (meaningfulField(pet.allergies)) {
    blocks.push({
      key: "allergies",
      icon: AlertTriangle,
      title: "Allergies",
      text: pet.allergies,
    });
  }
  if (meaningfulField(pet.medical_conditions)) {
    blocks.push({
      key: "conditions",
      icon: HeartPulse,
      title: "Medical conditions",
      text: pet.medical_conditions,
    });
  }
  if (meaningfulField(pet.quirks_and_warnings)) {
    blocks.push({
      key: "quirks",
      icon: AlertCircle,
      title: "Quirks & warnings",
      text: pet.quirks_and_warnings,
    });
  }

  if (blocks.length === 0) return null;

  return (
    <div className="pcc-section pcc-section--safety">
      <div className="pcc-section-header">
        <p className="pcc-section-eyebrow pcc-section-eyebrow--alert">
          <AlertTriangle size={14} strokeWidth={2.5} />
          Safety
        </p>
        <h2 className="pcc-section-title">Read this first</h2>
        <p className="pcc-section-sub">
          Allergies, conditions, and quirks worth knowing before anything else.
        </p>
      </div>

      {blocks.map((b) => (
        <div key={b.key} className="pcc-subsection">
          <h3 className="pcc-sub-title">{b.title}</h3>
          <div className="pcc-list">
            <div className="pcc-list-item pcc-list-item--single">
              <div className="pcc-list-item-body">
                <div className="pcc-list-item-title-row pcc-list-item-title-row--prose">
                  <span className="pcc-list-item-icon-inline">
                    <b.icon size={18} strokeWidth={2} />
                  </span>
                  <p className="pcc-list-item-prose">{b.text}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// VACCINATIONS SECTION
// ============================================================================
// ============================================================================
// MEDICAL — groups Vaccinations + Medications under one section (matches the
// Care editor's "Medical" grouping and order: Vaccinations first, then
// Medications). The section only renders if at least one subsection has data;
// each subsection hides itself independently when empty.
// ============================================================================
function MedicalSection({ vaccinations, medications }) {
  const hasVaccines = vaccinations && vaccinations.length > 0;
  // Owner view: include the full medication history, including past/ended meds.
  const activeMeds = medications || [];
  const hasMeds = activeMeds.length > 0;
  if (!hasVaccines && !hasMeds) return null;

  return (
    <div className="pcc-section">
      <div className="pcc-section-header">
        <p className="pcc-section-eyebrow">Medical</p>
        <h2 className="pcc-section-title">What keeps them healthy</h2>
        <p className="pcc-section-sub">
          Vaccination record and current medications.
        </p>
      </div>
      <VaccinationsSection items={vaccinations} />
      <MedicationsSection items={medications} />
    </div>
  );
}

function VaccinationsSection({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="pcc-subsection">
      <h3 className="pcc-sub-title">Vaccinations</h3>
      <p className="pcc-sub-sub">Current immunization record.</p>
      <div className="pcc-list">
        {items.map((v) => {
          const status = getVaccinationStatus(v.next_due);
          const metaRows = [
            v.next_due && {
              label: "Next due",
              value: formatShortDate(v.next_due),
            },
            v.date_administered && {
              label: "Given",
              value: formatShortDate(v.date_administered),
            },
            v.administered_by && {
              label: "Given by",
              value: v.administered_by,
            },
          ].filter(Boolean);

          return (
            <div key={v.id} className="pcc-list-item">
              <div className="pcc-list-item-body">
                <div className="pcc-list-item-title-row">
                  <span className="pcc-list-item-icon-inline">
                    <Syringe size={18} strokeWidth={2} />
                  </span>
                  <p className="pcc-list-item-title">
                    {v.vaccine_type || "Vaccination"}
                  </p>
                  {status ? (
                    <span className={`pcc-list-item-status ${status.kind}`}>
                      {status.label}
                    </span>
                  ) : null}
                </div>
                {metaRows.length > 0 ? (
                  <>
                    <div className="pcc-list-item-sep" />
                    <div
                      className="pcc-list-item-meta pcc-list-item-meta--vaccinations"
                      style={{ "--col-count": metaRows.length }}
                    >
                      {metaRows.map((row, i) => (
                        <div key={i} className="pcc-list-item-meta-row">
                          <span className="pcc-list-item-meta-label">
                            {row.label}:
                          </span>
                          <span className="pcc-list-item-meta-value">
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
                {v.notes ? <NotesSection notes={v.notes} /> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// MEDICATIONS SECTION
// ============================================================================
function MedicationsSection({ items }) {
  if (!items || items.length === 0) return null;
  // Owner view: show the FULL medication history, including past/ended meds.
  const active = items;
  if (active.length === 0) return null;

  return (
    <div className="pcc-subsection">
      <h3 className="pcc-sub-title">Medications</h3>
      <p className="pcc-sub-sub">Active prescriptions and supplements.</p>
      <div className="pcc-list">
        {active.map((m) => {
          const metaRows = [
            m.dosage && { label: "Dose", value: m.dosage },
            m.frequency && { label: "Frequency", value: m.frequency },
            m.started_date && {
              label: "Started",
              value: formatShortDate(m.started_date),
            },
            m.prescribing_vet && {
              label: "Prescribed by",
              value: m.prescribing_vet,
            },
          ].filter(Boolean);

          return (
            <div key={m.id} className="pcc-list-item">
              <div className="pcc-list-item-body">
                <div className="pcc-list-item-title-row">
                  <span className="pcc-list-item-icon-inline">
                    <Pill size={18} strokeWidth={2} />
                  </span>
                  <p className="pcc-list-item-title">
                    {m.medication_name || "Medication"}
                  </p>
                  <span className="pcc-list-item-status active">Active</span>
                </div>
                {metaRows.length > 0 ? (
                  <>
                    <div className="pcc-list-item-sep" />
                    <div
                      className="pcc-list-item-meta pcc-list-item-meta--medications"
                      style={{ "--col-count": metaRows.length }}
                    >
                      {metaRows.map((row, i) => (
                        <div key={i} className="pcc-list-item-meta-row">
                          <span className="pcc-list-item-meta-label">
                            {row.label}:
                          </span>
                          <span className="pcc-list-item-meta-value">
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
                {m.notes ? <NotesSection notes={m.notes} /> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// CARE ROUTINE SECTION — feeding + walks (free-text)
// ============================================================================
function CareRoutineSection({ pet }) {
  const hasFeeding = pet.feeding_schedule?.trim();
  const hasWalks = pet.walk_schedule?.trim();
  if (!hasFeeding && !hasWalks) return null;

  const blocks = [];
  if (hasFeeding) {
    blocks.push({
      key: "feeding",
      icon: UtensilsCrossed,
      title: "Feeding",
      text: pet.feeding_schedule,
    });
  }
  if (hasWalks) {
    blocks.push({
      key: "walks",
      icon: PawPrint,
      title: "Walks",
      text: pet.walk_schedule,
    });
  }

  return (
    <div className="pcc-section">
      <div className="pcc-section-header">
        <p className="pcc-section-eyebrow">Routine</p>
        <h2 className="pcc-section-title">Daily routine</h2>
        <p className="pcc-section-sub">How they like to live.</p>
      </div>

      {blocks.map((b) => (
        <div key={b.key} className="pcc-subsection">
          <h3 className="pcc-sub-title">{b.title}</h3>
          <div className="pcc-list">
            <div className="pcc-list-item pcc-list-item--single">
              <div className="pcc-list-item-body">
                <div className="pcc-list-item-title-row pcc-list-item-title-row--prose">
                  <span className="pcc-list-item-icon-inline">
                    <b.icon size={18} strokeWidth={2} />
                  </span>
                  <p className="pcc-list-item-prose">{b.text}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// VETS SECTION — primary + emergency
// ============================================================================
// Matches editor's VetEmergencySection pattern: one parent section with
// .pcc-subsection blocks inside, each with an h3 sub-title + sub-sub
// description above the white card. No inline pill — the sub-title above
// the card does the labeling job, and the vet name reads as the title.
function VetSection({ pet }) {
  const hasPrimary =
    pet.primary_vet_name || pet.primary_vet_phone || pet.primary_vet_address;
  const hasEmergency =
    pet.emergency_vet_name ||
    pet.emergency_vet_phone ||
    pet.emergency_vet_address;
  if (!hasPrimary && !hasEmergency) return null;

  return (
    <div className="pcc-section">
      <div className="pcc-section-header">
        <p className="pcc-section-eyebrow">Vets</p>
        <h2 className="pcc-section-title">Who to call</h2>
        <p className="pcc-section-sub">
          Primary vet for routine care; emergency vet when minutes matter.
        </p>
      </div>

      {hasPrimary ? (
        <div className="pcc-subsection">
          <h3 className="pcc-sub-title">Primary vet</h3>
          <p className="pcc-sub-sub">
            Your everyday vet — first call for routine care.
          </p>
          <div className="pcc-list">
            <VetCard
              kind="primary"
              name={pet.primary_vet_name}
              phone={pet.primary_vet_phone}
              address={pet.primary_vet_address}
              addressLine2={pet.primary_vet_address_line2}
            />
          </div>
        </div>
      ) : null}

      {hasEmergency ? (
        <div className="pcc-subsection">
          <h3 className="pcc-sub-title">Emergency vet</h3>
          <p className="pcc-sub-sub">For after-hours and urgent care.</p>
          <div className="pcc-list">
            <VetCard
              kind="emergency"
              name={pet.emergency_vet_name}
              phone={pet.emergency_vet_phone}
              address={pet.emergency_vet_address}
              addressLine2={pet.emergency_vet_address_line2}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function VetCard({ kind, name, phone, address, addressLine2 }) {
  const Icon = kind === "emergency" ? Siren : Stethoscope;
  const isEmergency = kind === "emergency";
  const metaRows = [
    phone && {
      label: "Phone",
      value: (
        <a href={phoneTelHref(phone)} className="pcc-phone-link">
          {formatPhoneDisplay(phone)}
        </a>
      ),
    },
    address && {
      label: "Address",
      value: (() => {
        const { line1, line2 } = splitAddressForDisplay(address, addressLine2);
        return (
          <>
            {line1}
            {line1 && line2 ? <br /> : null}
            {line2}
          </>
        );
      })(),
    },
  ].filter(Boolean);

  const minWidthClass = isEmergency
    ? "pcc-list-item-meta--emergency-vet"
    : "pcc-list-item-meta--primary-vet";

  return (
    <div
      className={`pcc-list-item pcc-list-item--vet pcc-list-item--vet-${kind}`}
    >
      <div className="pcc-list-item-body">
        <div className="pcc-list-item-title-row">
          <span className="pcc-list-item-icon-inline">
            <Icon size={18} strokeWidth={2} />
          </span>
          <p className="pcc-list-item-title">
            {name || (isEmergency ? "Emergency vet" : "Primary vet")}
          </p>
        </div>
        {metaRows.length > 0 ? (
          <>
            <div className="pcc-list-item-sep" />
            <div
              className={`pcc-list-item-meta ${minWidthClass}`}
              style={{ "--col-count": metaRows.length }}
            >
              {metaRows.map((row, i) => (
                <div key={i} className="pcc-list-item-meta-row">
                  <span className="pcc-list-item-meta-label">{row.label}:</span>
                  <span className="pcc-list-item-meta-value">{row.value}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================================
// INSURANCE SECTION
// ============================================================================
// ============================================================================
// EMERGENCY CONTACTS — human people to call. The single most vital section on a
// care card for a sitter or a stranger who finds a lost pet. Placed high (right
// after Safety) for that reason.
// ============================================================================
function EmergencyContactsSection({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="pcc-section">
      <div className="pcc-section-header">
        <p className="pcc-section-eyebrow">Emergency</p>
        <h2 className="pcc-section-title">Who to call</h2>
        <p className="pcc-section-sub">
          People to reach if something happens and the owner can&apos;t be
          reached.
        </p>
      </div>
      <div className="pcc-list">
        {items.map((c, i) => {
          const metaRows = [
            c.relationship && {
              label: "Relationship",
              value: c.relationship,
            },
            c.phone && {
              label: "Phone",
              value: (
                <a href={phoneTelHref(c.phone)} className="pcc-phone-link">
                  {formatPhoneDisplay(c.phone)}
                </a>
              ),
            },
            c.phone_secondary && {
              label: "Alt phone",
              value: (
                <a
                  href={phoneTelHref(c.phone_secondary)}
                  className="pcc-phone-link"
                >
                  {formatPhoneDisplay(c.phone_secondary)}
                </a>
              ),
            },
            c.email && {
              label: "Email",
              value: (
                <a href={`mailto:${c.email}`} className="pcc-phone-link">
                  {c.email}
                </a>
              ),
            },
          ].filter(Boolean);

          return (
            <div className="pcc-list-item" key={c.id || i}>
              <div className="pcc-list-item-body">
                <div className="pcc-list-item-title-row">
                  <span className="pcc-list-item-icon-inline">
                    <Users size={18} strokeWidth={2} />
                  </span>
                  <p className="pcc-list-item-title">{c.name || "Contact"}</p>
                </div>
                {metaRows.length > 0 ? (
                  <>
                    <div className="pcc-list-item-sep" />
                    <div className="pcc-list-item-meta pcc-list-item-meta--contacts">
                      {metaRows.map((r, j) => (
                        <div className="pcc-list-item-meta-row" key={j}>
                          <span className="pcc-list-item-meta-label">
                            {r.label}:
                          </span>
                          <span className="pcc-list-item-meta-value">
                            {r.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// SPECIALISTS — vets with ongoing specialty care (cardiologist, behaviorist,
// etc.). Useful for a sitter/emergency vet to know who else treats the pet.
// ============================================================================
function SpecialistsSection({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="pcc-section">
      <div className="pcc-section-header">
        <p className="pcc-section-eyebrow">Specialists</p>
        <h2 className="pcc-section-title">Ongoing specialty care</h2>
        <p className="pcc-section-sub">
          Vets who treat specific conditions beyond routine care.
        </p>
      </div>
      <div className="pcc-list">
        {items.map((s, i) => {
          const metaRows = [
            s.specialty && { label: "Specialty", value: s.specialty },
            s.phone && {
              label: "Phone",
              value: (
                <a href={phoneTelHref(s.phone)} className="pcc-phone-link">
                  {formatPhoneDisplay(s.phone)}
                </a>
              ),
            },
            s.address && {
              label: "Address",
              value: (() => {
                const { line1, line2 } = splitAddressForDisplay(
                  s.address,
                  s.address_line2,
                );
                return (
                  <>
                    {line1}
                    {line1 && line2 ? <br /> : null}
                    {line2}
                  </>
                );
              })(),
            },
          ].filter(Boolean);

          return (
            <div className="pcc-list-item" key={s.id || i}>
              <div className="pcc-list-item-body">
                <div className="pcc-list-item-title-row">
                  <span className="pcc-list-item-icon-inline">
                    <Stethoscope size={18} strokeWidth={2} />
                  </span>
                  <p className="pcc-list-item-title">
                    {s.name || "Specialist"}
                  </p>
                </div>
                {metaRows.length > 0 ? (
                  <>
                    <div className="pcc-list-item-sep" />
                    <div className="pcc-list-item-meta pcc-list-item-meta--specialists">
                      {metaRows.map((r, j) => (
                        <div className="pcc-list-item-meta-row" key={j}>
                          <span className="pcc-list-item-meta-label">
                            {r.label}:
                          </span>
                          <span className="pcc-list-item-meta-value">
                            {r.value}
                          </span>
                        </div>
                      ))}
                    </div>
                    {s.notes ? <NotesSection notes={s.notes} /> : null}
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InsuranceSection({ pet }) {
  if (!pet.insurance_provider && !pet.insurance_phone) {
    return null;
  }

  // Policy number is deliberately NOT shown on the shared card — it's sensitive
  // account information. Provider + claims phone are enough for an emergency vet
  // to confirm coverage exists and make a call.
  const metaRows = [
    pet.insurance_phone && {
      label: "Phone",
      value: (
        <a href={phoneTelHref(pet.insurance_phone)} className="pcc-phone-link">
          {formatPhoneDisplay(pet.insurance_phone)}
        </a>
      ),
    },
  ].filter(Boolean);

  return (
    <div className="pcc-section">
      <div className="pcc-section-header">
        <p className="pcc-section-eyebrow">Insurance</p>
        <h2 className="pcc-section-title">Coverage</h2>
        <p className="pcc-section-sub">
          For unexpected vet bills — keep this handy.
        </p>
      </div>
      <div className="pcc-list">
        <div className="pcc-list-item">
          <div className="pcc-list-item-body">
            <div className="pcc-list-item-title-row">
              <span className="pcc-list-item-icon-inline">
                <ShieldCheck size={18} strokeWidth={2} />
              </span>
              <p className="pcc-list-item-title">
                {pet.insurance_provider || "Pet insurance"}
              </p>
            </div>
            {metaRows.length > 0 ? (
              <>
                <div className="pcc-list-item-sep" />
                <div
                  className="pcc-list-item-meta pcc-list-item-meta--insurance"
                  style={{ "--col-count": metaRows.length }}
                >
                  {metaRows.map((row, i) => (
                    <div key={i} className="pcc-list-item-meta-row">
                      <span className="pcc-list-item-meta-label">
                        {row.label}:
                      </span>
                      <span className="pcc-list-item-meta-value">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// VET VISITS SECTION
// ============================================================================
function VetVisitsSection({ items, isOwner = false, petId, slug }) {
  const hasVisits = items && items.length > 0;

  // Owner-only state: active prep + past recaps + inline recap widget.
  // Hooks must be declared before any early return (rules of hooks).
  const [activePrep, setActivePrep] = useState([]);
  const [recaps, setRecaps] = useState([]);
  const [recapOpen, setRecapOpen] = useState(false);
  const [expandedRecap, setExpandedRecap] = useState(null);
  const [loadedOwnerData, setLoadedOwnerData] = useState(false);
  const recapWidgetRef = useRef(null);

  // When the recap widget opens, scroll it into view so the user can see it
  // (the "Add a recap" buttons can be far from where the widget appears).
  useEffect(() => {
    if (recapOpen && recapWidgetRef.current) {
      recapWidgetRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [recapOpen]);

  useEffect(() => {
    if (!isOwner || !petId) return;
    let cancelled = false;
    (async () => {
      try {
        const [prep, recapList] = await Promise.all([
          getActiveVisitPrepForPet(petId).catch(() => []),
          getRecapsForPet(petId).catch(() => []),
        ]);
        if (cancelled) return;
        setActivePrep(prep || []);
        setRecaps(recapList || []);
      } catch {
        /* non-blocking */
      }
      if (!cancelled) setLoadedOwnerData(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOwner, petId]);

  // For owners, always render the section (so they can add a first recap).
  // For the public view, keep original behavior: hide when empty.
  if (!hasVisits && !isOwner) return null;

  const recent = (items || []).slice(0, 5);

  // Build a lookup of recaps by visit date so we can attach summaries
  const recapByDate = {};
  for (const r of recaps) {
    if (r.visit_date) recapByDate[r.visit_date] = r;
  }

  return (
    <div className="pcc-section">
      <div className="pcc-section-header">
        <p className="pcc-section-eyebrow">Visits</p>
        <h2 className="pcc-section-title">Recent vet visits</h2>
        <p className="pcc-section-sub">
          {hasVisits
            ? `Last ${recent.length} visit${recent.length === 1 ? "" : "s"} on record.`
            : "No visits recorded yet."}
        </p>
      </div>

      {/* ── Owner-only: Upcoming visit prep ── */}
      {isOwner && activePrep.length > 0 && (
        <div className="pcc-visit-prep">
          {activePrep.map((prep) => (
            <UpcomingVisitPrep
              key={prep.id}
              prep={prep}
              onAddRecap={() => setRecapOpen(true)}
            />
          ))}
        </div>
      )}

      {/* ── Visit list ── */}
      {hasVisits && (
        <div className="pcc-list">
          {recent.map((v) => {
            const reason = v.reason || v.visit_reason;
            const vetName = v.clinic_name || v.vet_name;
            const metaRows = [
              v.visit_date && {
                label: "Date",
                value: formatShortDate(v.visit_date),
              },
              vetName && { label: "Vet", value: vetName },
              v.cost != null && { label: "Cost", value: `$${v.cost}` },
            ].filter(Boolean);

            const recap = v.visit_date ? recapByDate[v.visit_date] : null;
            const isExpanded = expandedRecap === v.id;

            return (
              <div key={v.id} className="pcc-list-item">
                <div className="pcc-list-item-body">
                  <div className="pcc-list-item-title-row">
                    <span className="pcc-list-item-icon-inline">
                      <CalendarClock size={18} strokeWidth={2} />
                    </span>
                    <p className="pcc-list-item-title">
                      {reason || "Vet visit"}
                    </p>
                  </div>
                  {metaRows.length > 0 ? (
                    <>
                      <div className="pcc-list-item-sep" />
                      <div
                        className="pcc-list-item-meta pcc-list-item-meta--vet-history"
                        style={{ "--col-count": metaRows.length }}
                      >
                        {metaRows.map((row, i) => (
                          <div key={i} className="pcc-list-item-meta-row">
                            <span className="pcc-list-item-meta-label">
                              {row.label}:
                            </span>
                            <span className="pcc-list-item-meta-value">
                              {row.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}
                  {v.treatment ? (
                    <div className="pcc-visit-treatment">{v.treatment}</div>
                  ) : null}
                  {v.notes ? <NotesSection notes={v.notes} /> : null}

                  {/* Owner-only: view recap summary if one exists */}
                  {isOwner && recap && recap.plain_summary ? (
                    <div className="pcc-visit-recap">
                      <button
                        type="button"
                        className="pcc-recap-toggle"
                        onClick={() =>
                          setExpandedRecap(isExpanded ? null : v.id)
                        }
                      >
                        <ClipboardList size={14} strokeWidth={2} />
                        {isExpanded ? "Hide recap" : "View recap"}
                        <ChevronDown
                          size={14}
                          strokeWidth={2}
                          className={`pcc-recap-chevron ${isExpanded ? "open" : ""}`}
                        />
                      </button>
                      {isExpanded && (
                        <p className="pcc-recap-summary">
                          {recap.plain_summary}
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Owner-only: add-a-recap nudge + inline widget ── */}
      {isOwner && (
        <div className="pcc-add-visit">
          {!recapOpen ? (
            <button
              type="button"
              className="pcc-add-visit-prompt"
              onClick={() => setRecapOpen(true)}
            >
              <span className="pcc-add-visit-icon">
                <Plus size={16} strokeWidth={2.4} />
              </span>
              Just got back from the vet? Add a visit recap
            </button>
          ) : (
            <div className="pcc-recap-widget" ref={recapWidgetRef}>
              <button
                type="button"
                className="pcc-recap-close"
                onClick={() => setRecapOpen(false)}
                aria-label="Close"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 4 L14 14 M14 4 L4 14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <VisitRecap
                petId={petId}
                onComplete={() => {
                  getRecapsForPet(petId)
                    .then((list) => setRecaps(list || []))
                    .catch(() => {});
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Owner-only: renders an active pre-visit prep block with a recap nudge.
function UpcomingVisitPrep({ prep, onAddRecap }) {
  const [open, setOpen] = useState(false);
  const content = prep.prep_content || {};
  const reason = prep.visit_reason || "Upcoming visit";

  return (
    <div className="pcc-prep-card">
      <div className="pcc-prep-head">
        <div className="pcc-prep-head-left">
          <span className="pcc-prep-eyebrow">Upcoming visit</span>
          <p className="pcc-prep-title">{reason}</p>
        </div>
        <button
          type="button"
          className="pcc-prep-toggle"
          onClick={() => setOpen(!open)}
        >
          {open ? "Hide prep" : "View prep"}
          <ChevronDown
            size={15}
            strokeWidth={2}
            className={`pcc-recap-chevron ${open ? "open" : ""}`}
          />
        </button>
      </div>

      {open && (
        <div className="pcc-prep-body">
          {renderPrepSection("Questions to ask", content.questions_to_ask)}
          {renderPrepSection("Worth mentioning", content.symptoms_to_mention)}
          {renderPrepSection("What to bring", content.what_to_bring)}
          {content.what_to_expect ? (
            <div className="pcc-prep-block">
              <p className="pcc-prep-block-label">What to expect</p>
              <p className="pcc-prep-block-text">{content.what_to_expect}</p>
            </div>
          ) : null}
          {content.cost_note ? (
            <div className="pcc-prep-block">
              <p className="pcc-prep-block-label">On cost</p>
              <p className="pcc-prep-block-text">{content.cost_note}</p>
            </div>
          ) : null}
        </div>
      )}

      <div className="pcc-prep-nudge">
        Had your visit?{" "}
        <button
          type="button"
          className="pcc-prep-nudge-link"
          onClick={onAddRecap}
        >
          Add a recap
        </button>
      </div>
    </div>
  );
}

function renderPrepSection(label, items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="pcc-prep-block">
      <p className="pcc-prep-block-label">{label}</p>
      <ul className="pcc-prep-list">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// ============================================================================
// OWNER ACTIONS — owner-only affordances for their own Care Card display.
// Mirrors the Hero display page's "view the card, then act on it" pattern:
// Edit the details, manage sharing/privacy, or save a PDF. Sharing is managed
// on the dedicated Share & Privacy page (single source of truth), so "Share"
// routes there rather than minting a link inline.
// ============================================================================
function OwnerActionsSection({ slug, petName }) {
  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  return (
    <div className="pcc-section pcc-section--share">
      <div className="pcc-section-header">
        <p className="pcc-section-eyebrow">Your card</p>
        <h2 className="pcc-section-title">
          {petName ? `${petName}'s` : "This"} Care Card
        </h2>
        <p className="pcc-section-sub">
          This is how your Care Card looks. Edit the details, manage who can see
          it, or save a copy.
        </p>
      </div>

      <div className="pcc-share-actions">
        <a
          className="pcc-btn pcc-btn--primary"
          href={`/pet-card/${slug}/care-edit`}
          aria-label="Edit Care Card"
        >
          <Pencil size={16} strokeWidth={2} />
          Edit Care Card
        </a>
        <a
          className="pcc-btn pcc-btn--secondary"
          href={`/pet-card/${slug}/share`}
          aria-label="Manage sharing and privacy"
        >
          <Share2 size={16} strokeWidth={2} />
          Share &amp; Privacy
        </a>
        <button
          type="button"
          className="pcc-btn pcc-btn--secondary"
          onClick={handlePrint}
          aria-label="Download or print this Care Card"
        >
          <Download size={16} strokeWidth={2} />
          Download PDF
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// PET POISON HELPLINE — fixed-content safety footer card
// ============================================================================
function HelplineSection() {
  return (
    <div className="pcc-section pcc-section--helpline">
      <div className="pcc-helpline-card">
        <div className="pcc-helpline-icon">
          <PhoneCall size={20} strokeWidth={2} />
        </div>
        <div className="pcc-helpline-body">
          <p className="pcc-helpline-title">Pet Poison Helpline</p>
          <p className="pcc-helpline-sub">
            24/7 expert advice if your pet eats something dangerous.
          </p>
          <a href="tel:18884264435" className="pcc-helpline-phone">
            (888) 426-4435
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FOOTER + UNAVAILABLE STATE
// ============================================================================
function PetParrkFooter() {
  return (
    <footer className="pcc-page-footer">
      <p>Powered by PetParrk</p>
    </footer>
  );
}

export function UnavailableState({ message }) {
  return (
    <>
      <CareCardStyles />
      <div className="pcc-body">
        <div className="pcc-container">
          <div className="pcc-unavailable">
            <Link2 size={40} strokeWidth={1.5} />
            <h2>Card unavailable</h2>
            <p>{message}</p>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// SMALL HELPERS
// ============================================================================

// Notes section — mirrors editor's NotesSection. Long text (>150 chars
// AND overflowing the 3-line clamp) renders a truncated preview with a
// Read more / Show less toggle. Short text renders inline with no toggle.
// Saves vertical space on mobile while letting viewers expand on demand.
function NotesSection({ notes }) {
  const trimmed = (notes || "").trim();
  const [expanded, setExpanded] = useState(false);
  const [cssClamped, setCssClamped] = useState(true);

  const textRef = useRef(null);
  const [isLong, setIsLong] = useState(false);
  const [clampedHeight, setClampedHeight] = useState(0);
  const [fullHeight, setFullHeight] = useState(0);

  // Measure both heights. Two gates avoid false positives on short text:
  //   1. Char length > 150 — short content never shows Read more.
  //   2. Pixel tolerance of +4 — covers sub-pixel rendering drift between
  //      `display: -webkit-box` (clamped) and `display: block` (unclamped).
  // Re-measures once fonts.ready resolves to catch font-swap layout shift.
  useEffect(() => {
    if (!textRef.current) return;
    const el = textRef.current;

    function measure() {
      if (!textRef.current) return;
      const hadClamp = el.classList.contains("pcc-notes-clamped");

      el.classList.add("pcc-notes-clamped");
      const ch = el.clientHeight;

      el.classList.remove("pcc-notes-clamped");
      const fh = el.scrollHeight;

      if (hadClamp) el.classList.add("pcc-notes-clamped");

      setClampedHeight(ch);
      setFullHeight(fh);
      setIsLong(trimmed.length > 150 && fh > ch + 4);
    }

    measure();

    if (
      typeof document !== "undefined" &&
      document.fonts &&
      document.fonts.ready
    ) {
      document.fonts.ready.then(measure).catch(() => {});
    }
  }, [trimmed]);

  // Coordinate clamp class with expand state. On expand: drop clamp
  // immediately so content reflows. On collapse: keep clamp removed until
  // the max-height transition finishes, then re-apply via onTransitionEnd.
  useEffect(() => {
    if (expanded) {
      setCssClamped(false);
    }
  }, [expanded]);

  function handleTransitionEnd(e) {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== "max-height") return;
    if (!expanded) {
      setCssClamped(true);
    }
  }

  if (trimmed.length === 0) return null;

  const targetHeight = expanded ? fullHeight : clampedHeight;
  const maxHeightStyle = targetHeight ? `${targetHeight}px` : "none";

  return (
    <div className="pcc-notes">
      <p className="pcc-notes-label">Notes:</p>
      <div
        className="pcc-notes-content"
        style={{ maxHeight: maxHeightStyle }}
        onTransitionEnd={handleTransitionEnd}
      >
        <p
          ref={textRef}
          className={`pcc-notes-text ${cssClamped ? "pcc-notes-clamped" : ""}`}
        >
          {trimmed}
        </p>
      </div>
      {isLong ? (
        <button
          type="button"
          className="pcc-notes-toggle"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}

function getSpeciesIcon(species) {
  const s = (species || "").toLowerCase();
  if (s === "dog") return Dog;
  if (s === "cat") return Cat;
  if (s === "bird") return Bird;
  if (s === "rabbit") return Rabbit;
  if (s === "fish") return Fish;
  return Sparkles;
}

function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Full age formatter — "3 years, 2 months" — used inside Identity meta.
function formatAge(birthday) {
  if (!birthday) return null;
  const b = new Date(birthday);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  let months = now.getMonth() - b.getMonth();
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return null;
  if (years === 0 && months === 0) return "less than a month";
  if (years === 0) return `${months} month${months !== 1 ? "s" : ""}`;
  if (months === 0) return `${years} year${years !== 1 ? "s" : ""}`;
  return `${years} year${years !== 1 ? "s" : ""}, ${months} month${months !== 1 ? "s" : ""}`;
}

// Shortens the live URL for the QR section caption. The full URL is still
// what gets encoded in the QR — this is purely visual: collapses the long
// random token to "abcd…wxyz" so the line stays readable.
function formatShortDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Vaccination status — matches editor's class names: overdue/soon/ok.
function getVaccinationStatus(nextDueIso) {
  if (!nextDueIso) return null;
  const due = new Date(nextDueIso);
  if (Number.isNaN(due.getTime())) return null;
  const now = new Date();
  const daysUntil = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return { kind: "overdue", label: "Overdue" };
  if (daysUntil <= 30) return { kind: "soon", label: "Due soon" };
  return { kind: "ok", label: "Current" };
}

function phoneTelHref(value) {
  if (!value) return "";
  const s = String(value).replace(/\D/g, "");
  if (s.length === 10) return `tel:+1${s}`;
  if (s.length === 11) return `tel:+${s}`;
  if (s.length > 0) return `tel:${s}`;
  return "";
}

// Split an address into street (line1) and city/state/zip (line2), matching the
// Care editor's logic exactly so the token renders addresses the same way:
// if line2 is populated, use both as-is; otherwise split the street at the first
// "comma/period + space" so city/state/zip drop onto their own row.
function splitAddressForDisplay(addr, line2) {
  const a = (addr || "").trim();
  const l2 = (line2 || "").trim();
  if (l2) return { line1: a, line2: l2 };
  const sepRegex = /(?:,|\.) /;
  const match = a.match(sepRegex);
  if (!match) return { line1: a, line2: "" };
  const idx = a.indexOf(match[0]);
  return {
    line1: a.slice(0, idx).trim(),
    line2: a.slice(idx + match[0].length).trim(),
  };
}

function formatPhoneDisplay(value) {
  if (!value) return "";
  const s = String(value).replace(/\D/g, "");
  if (s.length === 10)
    return `(${s.slice(0, 3)}) ${s.slice(3, 6)}-${s.slice(6)}`;
  if (s.length === 11)
    return `+${s[0]} (${s.slice(1, 4)}) ${s.slice(4, 7)}-${s.slice(7)}`;
  return value;
}

// ============================================================================
// STYLES
// ============================================================================
// Visual tokens, spacings, breakpoints, and typography are taken directly from
// the editor's `.pce-*` system so the two pages render as siblings. Class
// prefix is `.pcc-*` to avoid collisions when both stylesheets coexist.
//
// Key parity points with editor:
//   - --color-cream (#F5F0E8), --color-terracotta (#CF5C36),
//     --color-navy-dark (#172531), --color-muted (#717A86) CSS variables
//   - Container max-width 900px, padding 0 24px
//   - Body padding 32px 0 96px on desktop, 20px 0 80px on mobile
//   - Section padding 28px 24px on desktop, 22px 18px on mobile
//   - List item: 20px padding, 12px radius, #EDE8E0 border, soft shadow
//   - Inline icons sit BEFORE titles in terracotta color
//   - Meta labels use ":" colon, with per-section min-width modifiers
//   - Status pills use editor's exact rgba tints
//   - @375px breakpoint stacks label-above-value
//   - @640px breakpoint tightens section padding + pet header
// ============================================================================
function CareCardStyles() {
  return (
    <style>{`
      .pcc-body {
        background: var(--color-cream, #F5F0E8);
        min-height: 100vh;
        padding: 32px 0 96px;
        font-family: var(--font-urbanist, 'Urbanist', sans-serif);
        color: var(--color-navy-dark, #172531);
      }
      .pcc-container {
        max-width: 900px;
        margin: 0 auto;
        padding-left: 24px;
        padding-right: 24px;
      }

      /* ---- Jump nav: sticky in-page section navigation ---- */
      .pcc-jumpnav {
        position: sticky;
        top: var(--nav-height, 64px);
        z-index: 20;
        margin: 8px 0 24px;
        background: rgba(245, 240, 232, 0.92);
        backdrop-filter: saturate(180%) blur(8px);
        -webkit-backdrop-filter: saturate(180%) blur(8px);
        border-top: 1px solid #EDE8E0;
        border-bottom: 1px solid #EDE8E0;
      }
      .pcc-jumpnav-track {
        display: flex;
        gap: 4px;
        align-items: stretch;
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none;
        scroll-behavior: smooth;
      }
      /* Anchors carry the scroll offset so clicking a jump link (and native
         #hash navigation) lands the section BELOW the primary navbar + the
         sticky jump-nav, instead of hidden underneath them. Reliable native
         mechanism — no fragile getBoundingClientRect math. */
      .pcc-anchor {
        scroll-margin-top: calc(var(--nav-height, 64px) + 56px);
      }
      .pcc-jumpnav-track::-webkit-scrollbar { display: none; } /* WebKit */
      .pcc-jumpnav-link {
        flex: 1 1 0;
        min-width: max-content;
        text-align: center;
        padding: 9px 14px;
        border-radius: 0;
        font-size: 14px;
        font-weight: 600;
        color: #717A86;
        text-decoration: none;
        white-space: nowrap;
        transition: background 0.15s, color 0.15s;
        font-family: var(--font-urbanist, 'Urbanist', sans-serif);
      }
      .pcc-jumpnav-link:hover {
        background: #EDE8E0;
        color: var(--color-navy-dark, #172531);
      }
      .pcc-jumpnav-link.is-active {
        background: var(--color-terracotta, #CF5C36);
        color: #fff;
      }
      @media print {
        .pcc-jumpnav { display: none !important; }
      }

      /* ---- Scroll-to-top floating button ---- */
      .pcc-scrolltop {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 30;
        width: 44px;
        height: 44px;
        border-radius: 9999px;
        border: none;
        background: var(--color-navy-dark, #172531);
        color: #fff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 6px 20px rgba(23, 37, 49, 0.28);
        transition: background 0.15s, transform 0.15s;
      }
      .pcc-scrolltop:hover {
        background: #0f1a24;
        transform: translateY(-2px);
      }
      @media print {
        .pcc-scrolltop { display: none !important; }
      }

      /* Pet header — compact identity strip at the top.
         140px photo (larger than editor's 88px) because viewers benefit from
         a clearer ID photo. Horizontal layout matches editor exactly. */
      .pcc-pet-header {
        display: flex;
        gap: 24px;
        align-items: center;
        padding: 24px;
        background: #fff;
        border-radius: 16px;
        border: 1px solid rgba(23, 37, 49, 0.06);
        margin-bottom: 28px;
        box-shadow: 0 2px 12px rgba(23, 37, 49, 0.05);
      }
      .pcc-pet-photo-wrap {
        position: relative;
        width: 140px;
        height: 140px;
        border-radius: 16px;
        overflow: hidden;
        flex-shrink: 0;
        background: #EDE8E0;
      }
      .pcc-pet-photo {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .pcc-pet-photo-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #717A86;
      }
      .pcc-pet-header-info {
        flex: 1;
        min-width: 0;
      }
      .pcc-pet-eyebrow {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--color-terracotta, #CF5C36);
        margin: 0 0 6px;
      }
      .pcc-pet-name {
        font-size: 28px;
        font-weight: 800;
        color: var(--color-navy-dark, #172531);
        margin: 0 0 6px;
        letter-spacing: -0.01em;
        font-family: var(--font-urbanist, 'Urbanist', sans-serif);
        line-height: 1.15;
        word-break: break-word;
      }
      .pcc-pet-breed {
        font-size: 15px;
        font-weight: 600;
        color: var(--color-navy-dark, #172531);
        margin: 0 0 4px;
        line-height: 1.3;
      }
      .pcc-pet-quick-meta {
        font-size: 15px;
        font-weight: 500;
        color: #717A86;
        margin: 0;
        line-height: 1.4;
      }

      /* Section — white card wrapping each topic.
         Matches editor's .pce-section exactly. */
      .pcc-section {
        background: #fff;
        border-radius: 16px;
        padding: 28px 24px;
        margin-bottom: 20px;
        border: 1px solid rgba(23, 37, 49, 0.06);
      }
      /* Safety section — viewer-facing visual urgency. Subtle red tint so
         a sitter scanning the card sees allergies/conditions first. The
         editor doesn't carry this treatment (owners don't need urgency
         cues on their own data) — Care Card-only divergence. */
      .pcc-section--safety {
        background: rgba(201, 64, 64, 0.05);
        border-color: rgba(201, 64, 64, 0.18);
      }
      .pcc-section-header {
        margin-bottom: 20px;
      }
      .pcc-section-eyebrow {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--color-terracotta, #CF5C36);
        margin: 0 0 6px;
        font-family: var(--font-urbanist, 'Urbanist', sans-serif);
      }
      /* Safety eyebrow variant — red with small AlertTriangle inline. */
      .pcc-section-eyebrow--alert {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: #C94040;
      }
      .pcc-section-title {
        font-size: 22px;
        font-weight: 800;
        color: var(--color-navy-dark, #172531);
        margin: 0 0 4px;
        letter-spacing: -0.01em;
        font-family: var(--font-urbanist, 'Urbanist', sans-serif);
        line-height: 1.2;
      }
      .pcc-section-sub {
        font-size: 16px;
        font-weight: 500;
        color: #4B5563;
        margin: 0;
        line-height: 1.55;
      }

      /* Subsection — grouping inside sections (e.g. Allergies inside Safety) */
      .pcc-subsection { margin-top: 28px; }
      .pcc-subsection:first-of-type { margin-top: 0; }
      .pcc-sub-title {
        font-size: 17px;
        font-weight: 800;
        color: var(--color-navy-dark, #172531);
        margin: 0 0 6px;
        font-family: var(--font-urbanist, 'Urbanist', sans-serif);
        letter-spacing: -0.01em;
      }
      .pcc-sub-sub {
        font-size: 16px;
        font-weight: 500;
        color: #717A86;
        margin: 0 0 12px;
        line-height: 1.55;
      }

      /* List of cards */
      .pcc-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .pcc-list-item {
        display: flex;
        align-items: flex-start;
        gap: 4px;
        padding: 20px;
        background: #fff;
        border: 1px solid #EDE8E0;
        border-radius: 12px;
        box-shadow: 0 2px 12px rgba(23, 37, 49, 0.07);
        transition: box-shadow 0.25s, border-color 0.25s;
      }
      .pcc-list-item:hover {
        border-color: rgba(239, 200, 139, 0.9);
        box-shadow:
          0 0 0 1.5px rgba(239, 200, 139, 0.9),
          0 16px 48px rgba(23, 37, 49, 0.13);
      }
      .pcc-list-item-body { flex: 1; min-width: 0; }

      /* Inline icon — sits next to title text inside the title row. */
      .pcc-list-item-icon-inline {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--color-terracotta, #CF5C36);
        flex-shrink: 0;
        line-height: 0;
      }
      .pcc-list-item-title-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 0;
      }
      /* Multi-line prose variant — anchors icon to top of first line. */
      .pcc-list-item-title-row--prose {
        align-items: flex-start;
        flex-wrap: nowrap;
      }
      .pcc-list-item-title-row--prose .pcc-list-item-icon-inline {
        margin-top: 2px;
      }
      .pcc-list-item-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--color-navy-dark, #172531);
        margin: 0;
        font-family: var(--font-urbanist, 'Urbanist', sans-serif);
        line-height: 1.3;
        word-break: break-word;
      }
      .pcc-list-item-prose {
        font-size: 16px;
        font-weight: 500;
        color: var(--color-navy-dark, #172531);
        margin: 0;
        font-family: var(--font-urbanist, 'Urbanist', sans-serif);
        line-height: 1.55;
        white-space: pre-wrap;
        word-break: break-word;
      }

      /* Status pill — inline with title. Class names + colors match editor. */
      .pcc-list-item-status {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .pcc-list-item-status.overdue {
        background: rgba(201, 64, 64, 0.12);
        color: #C94040;
      }
      .pcc-list-item-status.soon {
        background: rgba(217, 162, 27, 0.14);
        color: #8C6A11;
      }
      .pcc-list-item-status.ok,
      .pcc-list-item-status.active {
        background: rgba(26, 102, 65, 0.12);
        color: #1A6641;
      }
      .pcc-list-item-status.ended {
        background: rgba(113, 122, 134, 0.14);
        color: #4B5563;
      }

      /* ── Phase B: Visit prep + recap (owner-only) ───────────────── */
      .pcc-visit-prep { margin-bottom: 20px; }
      .pcc-prep-card {
        border: 1.5px solid var(--color-terracotta, #cf5c36);
        border-radius: 16px;
        padding: 20px;
        margin-top: 20px;
        background: #fff;
      }
      .pcc-prep-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }
      .pcc-prep-eyebrow {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--color-terracotta, #cf5c36);
        display: block;
        margin-bottom: 4px;
      }
      .pcc-prep-title {
        font-size: 17px;
        font-weight: 800;
        color: var(--color-navy-dark, #172531);
        margin: 0;
        line-height: 1.3;
      }
      .pcc-prep-toggle,
      .pcc-recap-toggle {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: none;
        border: none;
        cursor: pointer;
        font-family: inherit;
        font-size: 13px;
        font-weight: 700;
        color: var(--color-terracotta, #cf5c36);
        padding: 4px 6px;
        flex-shrink: 0;
        transition: color 0.15s;
      }
      .pcc-prep-toggle:hover,
      .pcc-recap-toggle:hover { color: var(--color-navy-dark, #172531); }
      .pcc-recap-chevron {
        transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .pcc-recap-chevron.open { transform: rotate(180deg); }
      .pcc-prep-body {
        margin-top: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .pcc-prep-block-label {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--color-muted, #717A86);
        margin: 0 0 8px;
      }
      .pcc-prep-block-text {
        font-size: 15px;
        font-weight: 500;
        color: var(--color-navy-dark, #172531);
        line-height: 1.6;
        margin: 0;
      }
      .pcc-prep-list {
        margin: 0;
        padding-left: 18px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .pcc-prep-list li {
        font-size: 15px;
        font-weight: 500;
        color: var(--color-navy-dark, #172531);
        line-height: 1.6;
      }
      .pcc-prep-nudge {
        margin-top: 8px;
        padding-top: 14px;
        border-top: 1px solid var(--color-border, #ede8e0);
        font-size: 14px;
        font-weight: 500;
        color: var(--color-slate, #4b5563);
      }
      .pcc-prep-nudge-link {
        background: none;
        border: none;
        cursor: pointer;
        font-family: inherit;
        font-size: 14px;
        font-weight: 700;
        color: var(--color-terracotta, #cf5c36);
        padding: 0;
        text-decoration: underline;
        transition: color 0.15s;
      }
      .pcc-prep-nudge-link:hover { color: var(--color-navy-dark, #172531); }

      .pcc-visit-treatment {
        margin-top: 12px;
        font-size: 15px;
        font-weight: 500;
        color: var(--color-navy-dark, #172531);
        line-height: 1.6;
      }
      .pcc-visit-recap { margin-top: 12px; }
      .pcc-recap-summary {
        margin: 8px 0 0;
        font-size: 15px;
        font-weight: 500;
        color: var(--color-navy-dark, #172531);
        line-height: 1.6;
        padding: 12px 14px;
        background: var(--color-cream, #f5f0e8);
        border-radius: 10px;
      }

      .pcc-add-visit { margin-top: 24px; }
      .pcc-add-visit-prompt {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        background: none;
        border: none;
        cursor: pointer;
        font-family: inherit;
        font-size: 15px;
        font-weight: 600;
        color: var(--color-slate, #4b5563);
        padding: 10px 0;
        text-align: left;
        transition: color 0.15s;
      }
      .pcc-add-visit-prompt:hover { color: var(--color-terracotta, #cf5c36); }
      .pcc-add-visit-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--color-cream, #f5f0e8);
        color: var(--color-terracotta, #cf5c36);
        flex-shrink: 0;
        transition: background 0.15s, color 0.15s;
      }
      .pcc-add-visit-prompt:hover .pcc-add-visit-icon {
        background: var(--color-terracotta, #cf5c36);
        color: #fff;
      }
      .pcc-recap-widget {
        position: relative;
        border: 1.5px solid var(--color-border, #ede8e0);
        border-radius: 16px;
        padding: 24px;
        background: #fff;
      }
      .pcc-recap-close {
        position: absolute;
        top: 14px;
        right: 14px;
        width: 36px;
        height: 36px;
        border: none;
        background: transparent;
        color: var(--color-muted, #717A86);
        cursor: pointer;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s, color 0.15s;
        z-index: 2;
      }
      .pcc-recap-close:hover {
        background: var(--color-cream, #f5f0e8);
        color: var(--color-navy-dark, #172531);
      }

      /* Subtle horizontal rule splitting title row from meta details. */
      .pcc-list-item-sep {
        height: 1px;
        background: rgba(23, 37, 49, 0.08);
        margin: 12px 0;
      }

      /* Meta rows — label:value pairs.
         Mobile (default <720px): stacked rows with "Label: Value" inline.
         Desktop (>=720px): grid using --col-count from JSX. */
      .pcc-list-item-meta {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .pcc-list-item-meta-row {
        display: flex;
        gap: 8px;
        align-items: baseline;
        font-size: 16px;
        line-height: 1.4;
        font-family: var(--font-urbanist, 'Urbanist', sans-serif);
      }
      .pcc-list-item-meta-label {
        font-weight: 500;
        color: #717A86;
        flex-shrink: 0;
        min-width: 70px;
        line-height: 1.3;
      }
      .pcc-list-item-meta-value {
        font-weight: 600;
        color: var(--color-navy-dark, #172531);
        word-break: break-word;
        min-width: 0;
      }

      /* Per-section min-widths so values line up.
         Numbers match editor's exact tuning. */
      @media (min-width: 376px) {
        .pcc-list-item-meta--identity .pcc-list-item-meta-label {
          min-width: 72px;
        }
        .pcc-list-item-meta--vet-history .pcc-list-item-meta-label {
          min-width: 33px;
        }
        .pcc-list-item-meta--primary-vet .pcc-list-item-meta-label,
        .pcc-list-item-meta--emergency-vet .pcc-list-item-meta-label {
          min-width: 61px;
        }
        .pcc-list-item-meta--insurance .pcc-list-item-meta-label {
          min-width: 45px;
        }
        .pcc-list-item-meta--vaccinations .pcc-list-item-meta-label {
          min-width: 67px;
        }
        .pcc-list-item-meta--medications .pcc-list-item-meta-label {
          min-width: 76px;
        }
        .pcc-list-item-meta--contacts .pcc-list-item-meta-label {
          min-width: 88px;
        }
        .pcc-list-item-meta--specialists .pcc-list-item-meta-label {
          min-width: 69px;
        }
      }

      /* Identity birthday: date + "(X years old)" stacked in value column. */
      .pcc-identity-value-stack {
        display: inline-flex;
        flex-direction: column;
        gap: 2px;
      }
      .pcc-identity-sub-line {
        font-size: 13px;
        font-weight: 500;
        color: #717A86;
        font-family: var(--font-urbanist, 'Urbanist', sans-serif);
      }

      /* Smallest phones (<=375px): stack label above value full-width. */
      @media (max-width: 375px) {
        .pcc-list-item-meta-row {
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
        }
        .pcc-list-item-meta-label {
          min-width: 40px;
          font-size: 16px;
          line-height: 1.3;
        }
      }

      /* Desktop (>=720px): grid layout for meta rows. */
      @media (min-width: 720px) {
        .pcc-list-item-meta {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, max-content));
          gap: 14px 32px;
          align-items: flex-start;
        }
        .pcc-list-item-meta--identity,
        .pcc-list-item-meta--insurance,
        .pcc-list-item-meta--contacts {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .pcc-list-item-meta--identity .pcc-list-item-meta-row,
        .pcc-list-item-meta--insurance .pcc-list-item-meta-row,
        .pcc-list-item-meta--contacts .pcc-list-item-meta-row {
          flex-direction: row;
          align-items: baseline;
          gap: 8px;
        }
        .pcc-list-item-meta--identity .pcc-list-item-meta-label,
        .pcc-list-item-meta--insurance .pcc-list-item-meta-label,
        .pcc-list-item-meta--contacts .pcc-list-item-meta-label {
          font-size: 16px;
          letter-spacing: 0;
          line-height: 1.4;
        }
        .pcc-list-item-meta--identity .pcc-list-item-meta-label {
          min-width: 72px;
        }
    
        .pcc-list-item-meta--contacts .pcc-list-item-meta-label {
          min-width: 40px;
        }

        .pcc-list-item-meta--insurance .pcc-list-item-meta-label {
          min-width: 40px;
        }
        .pcc-list-item-meta-row {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
          min-width: 0;
        }
        .pcc-list-item-meta-label {
          font-size: 16px;
          line-height: 1.3;
          min-width: 0;
        }
        .pcc-list-item-meta-value {
          font-size: 16px;
          line-height: 1.4;
          word-break: break-word;
        }
      }

      /* Vet card variants — emergency vet gets a warning-red treatment. */
      .pcc-list-item--vet-emergency {
        background: rgba(201, 64, 64, 0.04);
        border-color: rgba(201, 64, 64, 0.25);
      }
      .pcc-list-item--vet-emergency .pcc-list-item-icon-inline {
        color: #C94040;
      }

      /* Phone link — inline anchor inside meta values. */
      .pcc-phone-link {
        color: var(--color-terracotta, #CF5C36);
        font-weight: 600;
        text-decoration: none;
      }
      .pcc-phone-link:hover {
        text-decoration: underline;
      }

      /* Notes — appears below meta in vaccinations/meds/visits. */
      .pcc-notes {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid rgba(23, 37, 49, 0.08);
      }
      .pcc-notes-label {
        font-size: 16px;
        font-weight: 500;
        color: #717A86;
        margin: 0 0 4px;
        line-height: 1.4;
        font-family: var(--font-urbanist, 'Urbanist', sans-serif);
      }
      .pcc-notes-text {
        font-size: 16px;
        font-weight: 500;
        color: var(--color-navy-dark, #172531);
        margin: 0;
        line-height: 1.5;
        word-break: break-word;
        white-space: pre-wrap;
        font-family: var(--font-urbanist, 'Urbanist', sans-serif);
      }
      .pcc-notes-content {
        overflow: hidden;
        transition: max-height 0.3s ease;
      }
      /* 3-line clamp with browser-rendered ellipsis. Toggle by adding/
         removing this class on the inner text node. */
      .pcc-notes-clamped {
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .pcc-notes-toggle {
        background: none;
        border: none;
        padding: 6px 0 0;
        margin: 0;
        font-size: 14px;
        font-weight: 700;
        color: var(--color-terracotta, #CF5C36);
        cursor: pointer;
        font-family: var(--font-urbanist, 'Urbanist', sans-serif);
        transition: color 0.15s;
      }
      .pcc-notes-toggle:hover {
        color: var(--color-navy-dark, #172531);
        text-decoration: underline;
        text-underline-offset: 2px;
      }

      /* Pet Poison Helpline card */
      .pcc-section--helpline {
        padding: 0 !important;
        background: transparent;
        border: none;
      }
      .pcc-helpline-card {
        display: flex;
        gap: 14px;
        padding: 18px 20px;
        background: rgba(207, 92, 54, 0.06);
        border: 1.5px solid rgba(207, 92, 54, 0.2);
        border-radius: 14px;
      }
      .pcc-helpline-icon {
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: rgba(207, 92, 54, 0.14);
        color: var(--color-terracotta, #CF5C36);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .pcc-helpline-body {
        flex: 1;
        min-width: 0;
      }
      .pcc-helpline-title {
        font-size: 16px;
        font-weight: 700;
        margin: 0 0 2px;
        color: var(--color-navy-dark, #172531);
      }
      .pcc-helpline-sub {
        font-size: 15px;
        font-weight: 500;
        color: #717A86;
        line-height: 1.4;
        margin: 0 0 8px;
      }
      .pcc-helpline-phone {
        font-size: 17px;
        font-weight: 700;
        color: var(--color-terracotta, #CF5C36);
        text-decoration: none;
        font-variant-numeric: tabular-nums;
      }
      .pcc-helpline-phone:hover {
        text-decoration: underline;
      }

      /* QR / share-back card */
      .pcc-qr-card {
        display: flex;
        gap: 24px;
        align-items: center;
        padding: 20px;
        background: var(--color-cream, #F5F0E8);
        border: 1px solid #EDE8E0;
        border-radius: 12px;
      }
      .pcc-qr-svg {
        flex-shrink: 0;
        padding: 12px;
        background: #fff;
        border-radius: 10px;
        border: 1px solid #EDE8E0;
        line-height: 0;
      }
      .pcc-qr-svg svg {
        display: block;
      }
      .pcc-qr-placeholder {
        width: 140px;
        height: 140px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #717A86;
      }
      .pcc-qr-info {
        flex: 1;
        min-width: 0;
      }
      .pcc-qr-label {
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #717A86;
        margin: 0 0 4px;
      }
      .pcc-qr-url {
        font-size: 14px;
        font-weight: 500;
        color: var(--color-navy-dark, #172531);
        margin: 0 0 12px;
        word-break: break-all;
        line-height: 1.4;
        font-variant-numeric: tabular-nums;
      }
      /* ============================================================
         Share section buttons — Option Z styling.
         Share = filled terracotta (primary CTA).
         Both Downloads = identical navy outline (visual peers).
         Same look on desktop and mobile; layout differs only.
         ============================================================ */
      .pcc-share-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 16px;
      }
      .pcc-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        height: 42px;
        min-width: 90px;
        padding: 0 24px;
        // line-height: 1;
        border-radius: 12px;
        font-size: 15px;
        font-weight: 700;
        font-family: var(--font-urbanist, 'Urbanist', sans-serif);
        white-space: nowrap;
        cursor: pointer;
        border: 2px solid transparent;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
      }
      .pcc-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .pcc-btn--primary {
        background: var(--color-terracotta, #CF5C36);
        color: #fff;
        border-color: var(--color-terracotta, #CF5C36);
      }
      .pcc-btn--primary:hover:not(:disabled) {
        background: #fff;
        color: var(--color-terracotta, #CF5C36);
      }
      .pcc-btn--secondary {
        background: #fff;
        color: var(--color-navy-dark, #172531);
        border-color: rgba(23, 37, 49, 0.18);
        font-weight: 600;
      }
      .pcc-btn--secondary:hover:not(:disabled) {
        background: var(--color-navy-dark, #172531);
        color: #fff;
        border-color: var(--color-navy-dark, #172531);
      }

      /* Hints — two paragraphs with breathing room. */
      .pcc-share-hints {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .pcc-share-hint {
        font-size: 13px;
        font-weight: 500;
        color: #717A86;
        margin: 0;
        line-height: 1.55;
      }
      .pcc-share-hint strong {
        font-weight: 700;
        color: var(--color-navy-dark, #172531);
      }

      /* Divider before the QR collapsible. */
      .pcc-share-divider {
        height: 1px;
        background: rgba(23, 37, 49, 0.08);
        margin: 20px 0 16px;
      }

      /* QR collapsible toggle — low-prominence text button. */
      .pcc-share-qr-toggle {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 0;
        background: none;
        border: none;
        font-size: 14px;
        font-weight: 600;
        color: var(--color-terracotta, #CF5C36);
        cursor: pointer;
        font-family: var(--font-urbanist, 'Urbanist', sans-serif);
      }
      .pcc-share-qr-toggle:hover {
        color: var(--color-navy-dark, #172531);
      }

      /* Page footer */
      .pcc-page-footer {
        margin-top: 32px;
        text-align: center;
        font-size: 13px;
        color: #717A86;
      }
      .pcc-page-footer p { margin: 0; }

      /* Unavailable state */
      .pcc-unavailable {
        max-width: 420px;
        margin: 80px auto;
        padding: 32px 24px;
        text-align: center;
        color: #717A86;
      }
      .pcc-unavailable h2 {
        font-size: 22px;
        font-weight: 800;
        margin: 16px 0 8px;
        color: var(--color-navy-dark, #172531);
      }
      .pcc-unavailable p {
        font-size: 15px;
        line-height: 1.5;
        margin: 0;
      }

      /* MOBILE — matches editor's @640px breakpoint exactly */
      @media (max-width: 640px) {
        .pcc-container { padding-left: 16px; padding-right: 16px; }
        .pcc-body { padding: 20px 0 80px; }
        .pcc-section { padding: 22px 18px; }
        /* Helpline card on mobile — tighten inner padding so its left/
           right edges line up with content edges of adjacent sections. */
        .pcc-helpline-card { padding: 16px 14px; gap: 12px; }
        .pcc-helpline-icon { width: 36px; height: 36px; border-radius: 9px; }
        .pcc-pet-header {
          padding: 16px;
          gap: 16px;
        }
        .pcc-pet-photo-wrap {
          width: 100px;
          height: 100px;
          border-radius: 14px;
        }
        .pcc-pet-name {
          font-size: 24px;
        }
        .pcc-pet-quick-meta {
          font-size: 14px;
        }
        .pcc-qr-card {
          flex-direction: column;
          align-items: stretch;
          text-align: center;
          gap: 16px;
        }
        .pcc-qr-svg {
          align-self: center;
        }
        .pcc-share-actions {
          flex-direction: column;
          gap: 10px;
        }
        .pcc-share-actions > .pcc-btn {
          width: 100%;
        }
      }

      /* Very narrow phones */
      @media (max-width: 375px) {
        .pcc-pet-header {
          flex-direction: column;
          text-align: center;
          gap: 14px;
        }
        .pcc-pet-photo-wrap {
          margin: 0 auto;
        }
        .pcc-list-item-title-row {
          flex-wrap: wrap;
        }
      }

      /* Print friendliness — vets often print and pin to the chart. */
      @media print {
        .pcc-body {
          background: #fff;
          padding: 0;
        }
        .pcc-section,
        .pcc-list-item,
        .pcc-pet-header {
          box-shadow: none;
          break-inside: avoid;
        }
        .pcc-list-item:hover {
          box-shadow: none;
          border-color: #EDE8E0;
        }
        .pcc-share-actions,
        .pcc-share-hints,
        .pcc-share-divider,
        .pcc-share-qr-toggle {
          display: none;
        }
        .pcc-page-footer {
          margin-top: 16px;
        }
      }
    `}</style>
  );
}
