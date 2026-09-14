"use client";

/* ════════════════════════════════════════════════════════════════════════
   PetFormCard — the add/edit pet form used on both profile pages.

   Identity-only by design: name, species, breed, sex, birthday, weight.
   Medical, Owner Contact, and Vet fields live in the full Pet Editor
   (/pet-card/[slug]); this form links out to it rather than duplicating it.

   Shared by:
     • app/profile/page.js            (ProfileMain)
     • app/profile/[username]/page.js (ProfileUsername)

   ProfileUsername previously carried a stale copy that still rendered the
   medical/vet/owner sections and saved them straight to the pets table.
   ════════════════════════════════════════════════════════════════════════ */

import { Camera, Check, PawPrint, X } from "lucide-react";
import { convertDisplayUnit, formatAge } from "../lib/petTileHelpers";

export default function PetFormCard({
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
                fontSize: "18px",
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
                fontSize: "16px",
                fontWeight: "600",
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
                  // Switching to lbs: form value is currently in kg, convert it.
                  if ((petForm.weight_unit || "lbs") === "lbs") return;
                  setPetForm({
                    ...petForm,
                    weight_unit: "lbs",
                    weight_value: convertDisplayUnit(
                      petForm.weight_value,
                      "kg",
                      "lbs",
                    ),
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
                  setPetForm({
                    ...petForm,
                    weight_unit: "kg",
                    weight_value: convertDisplayUnit(
                      petForm.weight_value,
                      "lbs",
                      "kg",
                    ),
                  });
                }}
              >
                kg
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Medical, Owner Contact, and Vet fields moved to the Pet Editor
         (full medical & care record). Profile keeps identity-only quick edits. */}

      <p
        style={{
          margin: "20px 0 0",
          padding: "12px 16px",
          background: C.cream,
          borderRadius: "10px",
          fontSize: "14px",
          fontWeight: "500",
          color: C.muted,
        }}
      >
        {isEdit ? (
          <>
            This is a quick edit. To add allergies, medications, vet info, and
            care details, open{" "}
            <strong style={{ color: C.navyDark }}>{editingPet?.name}'s</strong>{" "}
            full Pet Editor.
          </>
        ) : (
          <>
            Add the basics here. Once saved, open the pet's card to add medical,
            vet, and care details in the full Pet Editor.
          </>
        )}
      </p>
      {isEdit && editingPet?.slug && (
        <a href={`/pet-card/${editingPet.slug}`} className="pp-edit-full-link">
          Open Pet Editor
          <span aria-hidden="true" style={{ marginLeft: "6px" }}>
            →
          </span>
        </a>
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
