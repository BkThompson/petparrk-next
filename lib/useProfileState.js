"use client";

/* ════════════════════════════════════════════════════════════════════════
   useProfileState — state, refs, and handlers shared by ProfileMain and
   ProfileUsername.

   The two pages declared 35 identical useState/useRef hooks and 19
   identical handlers between them. Everything that does not depend on the
   owner/public distinction lives here.

   Deliberately NOT moved: the page JSX. The owner/public boundary lives in
   that markup, and folding it into `{isOwner && …}` branches inside one
   large component would make a privacy boundary harder to audit, not
   easier. Each page keeps its own render tree, and its own extra state
   (ProfileMain: profileDirtyRef; ProfileUsername: publicLevelState).

   Pure helpers (formatPhone, prepareImageFile, …) live in profileUtils.js.
   ════════════════════════════════════════════════════════════════════════ */

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";
import { useToast } from "../components/ToastProvider";
import {
  SESSION_KEY,
  petFormWeight,
  petWeightFromForm,
} from "./petTileHelpers";
import { prepareImageFile } from "./profileUtils";

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

export function useProfileState() {
  const router = useRouter();
  const showToast = useToast();

  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [pets, setPets] = useState([]);
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
  const [careCompleteCount, setCareCompleteCount] = useState(0);
  const [heroPublished, setHeroPublished] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showAddPet, setShowAddPet] = useState(false);
  const [justSavedPet, setJustSavedPet] = useState(null);
  const [editingPetId, setEditingPetId] = useState(null);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [expandedTiers, setExpandedTiers] = useState({});
  const [celebrate, setCelebrate] = useState(null);
  const [showInlineSubmit, setShowInlineSubmit] = useState(false);
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
  const inlineSubmitRef = useRef(null);
  const submitCtaRef = useRef(null);

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

  function closeSubmitForm() {
    setShowInlineSubmit(false);
    setTimeout(() => {
      if (!submitCtaRef.current) return;
      const top =
        submitCtaRef.current.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top, behavior: "smooth" });
    }, 50);
  }

  function scrollToForm(target = "profile") {
    // Poll for the target element to be rendered AND have height before
    // scrolling. A fixed timeout worked for same-page opens (page already
    // stable) but failed when arriving cross-page (e.g. /profile?add=1): at a
    // fixed delay the form often isn't mounted/sized yet, so the scroll landed
    // nowhere. Polling handles both cases.
    let tries = 0;
    const attempt = () => {
      const ref = target === "pet" ? petFormRef.current : formAreaRef.current;
      // Wait until the element exists and has actually rendered with height
      // (an empty wrapper div reports offsetHeight 0 until the form mounts).
      if (ref && ref.offsetHeight > 0) {
        const top = ref.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: "smooth" });
        return;
      }
      tries += 1;
      if (tries <= 40) {
        setTimeout(attempt, 50); // retry for up to ~2s
      }
    };
    // Start after a tick so state updates (e.g. setShowAddPet) can begin rendering.
    setTimeout(attempt, 50);
  }

  function scrollToPack() {
    if (!packSectionRef.current) return;
    const top =
      packSectionRef.current.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  }

  function startAddPet() {
    closeAllEditing();
    setShowAddPet(true);
    scrollToForm("pet");
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
      // DB stores canonical lbs; the form holds display units.
      weight_value: petFormWeight(pet),
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

  async function handleDeletePet(petId) {
    if (!confirm("Remove this pet?")) return;
    await supabase.from("pets").delete().eq("id", petId);
    setPets((prev) => prev.filter((p) => p.id !== petId));
    showToast("Pet removed.");
  }

  async function handleNewPetPhotoPreview(e) {
    const raw = e.target.files?.[0];
    if (!raw) return;
    const file = await prepareImageFile(raw, setConvertingPhoto);
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPendingPetPhoto({ file, previewUrl: url });
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
        return false;
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
    let ok = false;
    if (!error) {
      setProfile((prev) => ({ ...prev, ...payload }));
      setEditingProfile(false);
      showToast("Profile saved!");
      ok = true;
    } else if (
      error.code === "23505" ||
      /username/i.test(error.message || "")
    ) {
      setUsernameError("That username is taken.");
    } else {
      showToast("Failed to save profile.", "error");
    }
    setSaving(false);
    return ok;
  }

  async function handleSavePet() {
    setSaving(true);
    let ok = false;
    if (editingPetId) {
      const resolvedSpecies =
        petForm.species === "Other"
          ? petForm.species_other || "Other"
          : petForm.species;
      // Profile is identity-only quick-edit: write ONLY identity fields so we
      // never overwrite medical/vet/owner data that's managed in the Pet Editor.
      const identityUpdate = {
        name: petForm.name,
        species: resolvedSpecies,
        breed: petForm.breed,
        sex: petForm.sex || null,
        birthday: petForm.birthday || null,
        weight_value: petWeightFromForm(
          petForm.weight_value,
          petForm.weight_unit,
        ),
        weight_unit: petForm.weight_unit || "lbs",
      };
      const { error } = await supabase
        .from("pets")
        .update(identityUpdate)
        .eq("id", editingPetId);
      if (!error) {
        // Mirror DB write: canonical weight_value must be in lbs.
        // petForm.weight_value is in display units, so convert before
        // merging into local state so the card renders correctly.
        const canonicalWeightLbs = petWeightFromForm(
          petForm.weight_value,
          petForm.weight_unit,
        );
        setPets((prev) =>
          prev.map((p) =>
            p.id === editingPetId
              ? {
                  ...p,
                  ...petForm,
                  species: resolvedSpecies,
                  weight_value: canonicalWeightLbs,
                  weight_unit: petForm.weight_unit || "lbs",
                }
              : p,
          ),
        );
        setEditingPetId(null);
        showToast("Pet updated!");
        ok = true;
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
          // Form value is in display unit; convert to canonical lbs for DB
          weight_value: petWeightFromForm(
            petForm.weight_value,
            petForm.weight_unit,
          ),
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
        ok = true;
      } else showToast("Failed to add pet.", "error");
    }
    // Only reset/close the form when the save actually succeeded; on failure
    // keep the form open with the user's input intact so they can retry.
    if (ok) {
      setPetForm(emptyPetForm);
      setMicrochipError("");
    }
    setSaving(false);
    return ok;
  }

  return {
    // ── state ──
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

    // ── setters ──
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

    // ── refs ──
    fileInputRef,
    petPhotoRefs,
    newPetPhotoRef,
    formAreaRef,
    petFormRef,
    packSectionRef,
    inlineSubmitRef,
    submitCtaRef,

    // ── handlers ──
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

    // ── passthrough ──
    router,
    showToast,
    emptyPetForm,
  };
}
