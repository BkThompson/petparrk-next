"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import { useToast } from "../../components/ToastProvider";

const SESSION_KEY = "petparrk_symptom_session";

export default function ProfilePage() {
  const router = useRouter();
  const showToast = useToast();
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showAddPet, setShowAddPet] = useState(false);
  const [editingPetId, setEditingPetId] = useState(null);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    bio: "",
    zip_code: "",
    is_public: false,
  });
  const emptyPetForm = {
    name: "",
    species: "Dog",
    species_other: "",
    breed: "",
    birthday: "",
    weight_lbs: "",
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
  const [contacts, setContacts] = useState({});
  const [showContactsFor, setShowContactsFor] = useState(null);
  const [newContact, setNewContact] = useState({
    name: "",
    phone: "",
    relationship: "",
  });
  const [editingContactId, setEditingContactId] = useState(null);
  const [showAddContactFor, setShowAddContactFor] = useState(null);
  const [editContactForm, setEditContactForm] = useState({
    name: "",
    phone: "",
    relationship: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingPetPhoto, setUploadingPetPhoto] = useState(null);
  const [convertingPhoto, setConvertingPhoto] = useState(false);
  const [symptomHistory, setSymptomHistory] = useState({});
  const [showHistoryFor, setShowHistoryFor] = useState(null);
  const [cityState, setCityState] = useState("");
  const [deleteCheckConfirm, setDeleteCheckConfirm] = useState(null);
  const fileInputRef = useRef(null);
  const petPhotoRefs = useRef({});
  const newPetPhotoRef = useRef(null);
  const petCardRefs = useRef({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) router.push("/auth");
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
      if (!session) router.push("/auth");
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    async function fetchData() {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (profileData) {
        setProfile(profileData);
        setProfileForm({
          full_name: profileData.full_name || "",
          bio: profileData.bio || "",
          zip_code: profileData.zip_code || "",
          is_public: profileData.is_public || false,
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
        setProfile(newProfile);
      }
      const { data: petsData } = await supabase
        .from("pets")
        .select("*")
        .eq("owner_id", session.user.id)
        .order("created_at");
      setPets(petsData || []);
      setLoading(false);
    }
    fetchData();
  }, [session]);

  async function fetchSymptomHistory(petId) {
    const { data } = await supabase
      .from("symptom_checks")
      .select("*")
      .eq("pet_id", petId)
      .order("created_at", { ascending: false })
      .limit(10);
    setSymptomHistory((prev) => ({ ...prev, [petId]: data || [] }));
    setShowHistoryFor(petId);
  }

  async function handleDeleteSymptomCheck(petId, checkId) {
    const { error } = await supabase
      .from("symptom_checks")
      .delete()
      .eq("id", checkId);
    if (!error) {
      setSymptomHistory((prev) => ({
        ...prev,
        [petId]: prev[petId].filter((c) => c.id !== checkId),
      }));
      showToast("Check deleted.");
    } else showToast("Failed to delete.", "error");
    setDeleteCheckConfirm(null);
  }

  function handleCheckSymptoms(pet) {
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
    router.push("/symptom-checker/chat");
  }

  function handleViewSymptomCheck(pet, check) {
    try {
      const transcript = JSON.parse(check.transcript || "[]");
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
        return converted;
      } catch {
        setConverting(false);
        alert("Could not convert HEIC file. Please try a JPG or PNG instead.");
        return null;
      }
    }
    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        file.type,
      )
    ) {
      alert("Please use JPG, PNG, WebP, GIF, or HEIC.");
      return null;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("Photo must be under 10MB");
      return null;
    }
    return file;
  }

  async function handlePhotoUpload(e) {
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
  }

  async function handlePetPhotoUpload(e, petId) {
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
  }

  async function handleNewPetPhotoPreview(e) {
    const raw = e.target.files?.[0];
    if (!raw) return;
    const file = await prepareImageFile(raw, setConvertingPhoto);
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPendingPetPhoto({ file, previewUrl: url });
  }

  async function fetchContactsForPet(petId) {
    const { data } = await supabase
      .from("pet_emergency_contacts")
      .select("*")
      .eq("pet_id", petId);
    setContacts((prev) => ({ ...prev, [petId]: data || [] }));
    setShowContactsFor(petId);
  }

  async function handleAddContact(petId) {
    if (!newContact.name) return;
    const { data } = await supabase
      .from("pet_emergency_contacts")
      .insert({ pet_id: petId, ...newContact })
      .select()
      .single();
    setContacts((prev) => ({
      ...prev,
      [petId]: [...(prev[petId] || []), data],
    }));
    setNewContact({ name: "", phone: "", relationship: "" });
    setShowAddContactFor(null);
    showToast("Contact added!");
  }

  async function handleUpdateContact(petId, contactId) {
    const { error } = await supabase
      .from("pet_emergency_contacts")
      .update({
        name: editContactForm.name,
        phone: editContactForm.phone,
        relationship: editContactForm.relationship,
      })
      .eq("id", contactId);
    if (!error) {
      setContacts((prev) => ({
        ...prev,
        [petId]: prev[petId].map((c) =>
          c.id === contactId ? { ...c, ...editContactForm } : c,
        ),
      }));
      setEditingContactId(null);
      showToast("Contact updated!");
    } else showToast("Failed to update contact.", "error");
  }

  async function handleDeleteContact(petId, contactId) {
    await supabase.from("pet_emergency_contacts").delete().eq("id", contactId);
    setContacts((prev) => ({
      ...prev,
      [petId]: prev[petId].filter((c) => c.id !== contactId),
    }));
    showToast("Contact removed.");
  }

  function closeAllEditing() {
    setEditingProfile(false);
    setShowAddPet(false);
    setEditingPetId(null);
    setEditingContactId(null);
    setShowAddContactFor(null);
    setNewContact({ name: "", phone: "", relationship: "" });
    setDeleteCheckConfirm(null);
    setPetForm(emptyPetForm);
    setPendingPetPhoto(null);
    setMicrochipError("");
  }

  function startEditContact(c) {
    closeAllEditing();
    setEditingContactId(c.id);
    setEditContactForm({
      name: c.name || "",
      phone: c.phone || "",
      relationship: c.relationship || "",
    });
  }

  async function handleSaveProfile() {
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: session.user.id,
      full_name: profileForm.full_name,
      bio: profileForm.bio,
      zip_code: profileForm.zip_code,
      is_public: profileForm.is_public,
      updated_at: new Date().toISOString(),
    });
    if (!error) {
      setProfile((prev) => ({ ...prev, ...profileForm }));
      setEditingProfile(false);
      showToast("Profile saved!");
    } else showToast("Failed to save profile.", "error");
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
          weight_lbs: petForm.weight_lbs || null,
          birthday: petForm.birthday || null,
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
          weight_lbs: petForm.weight_lbs || null,
          birthday: petForm.birthday || null,
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
        setShowAddPet(false);
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

  function startEditPet(pet) {
    closeAllEditing();
    setEditingPetId(pet.id);
    setTimeout(() => {
      const el = petCardRefs.current[pet.id];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > window.innerHeight)
        el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    setPetForm({
      name: pet.name || "",
      species: pet.species || "Dog",
      species_other: "",
      breed: pet.breed || "",
      birthday: pet.birthday || "",
      weight_lbs: pet.weight_lbs || "",
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
    setShowAddPet(false);
    setPendingPetPhoto(null);
  }

  const calcAge = (birthday) => {
    if (!birthday) return null;
    const years = Math.floor(
      (Date.now() - new Date(birthday).getTime()) / (1000 * 60 * 60 * 24 * 365),
    );
    return years === 0
      ? "< 1 year old"
      : years === 1
        ? "1 year old"
        : `${years} years old`;
  };
  const speciesEmoji = (s) =>
    s === "Dog"
      ? "🐶"
      : s === "Cat"
        ? "🐱"
        : s === "Bird"
          ? "🐦"
          : s === "Rabbit"
            ? "🐰"
            : "🐾";
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
      return { emoji: "🔴", label: "Emergency", color: "#c62828" };
    if (result === "SEE_VET")
      return { emoji: "🟡", label: "See vet soon", color: "#e65100" };
    if (result === "MONITOR")
      return { emoji: "🟢", label: "Monitor at home", color: "#2d6a4f" };
    return { emoji: "⚪", label: result, color: "#888" };
  }
  function formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

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

  const previewName = petForm.name.trim() || "...";
  const previewSubtitle = [
    petForm.breed,
    petForm.birthday ? calcAge(petForm.birthday) : null,
    petForm.weight_lbs ? `${petForm.weight_lbs} lbs` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const formPhotoUrl = pendingPetPhoto?.previewUrl || null;
  const avatarUrl =
    profile?.avatar_url || session?.user?.user_metadata?.avatar_url || null;
  const avatarLetter = session?.user?.email?.[0]?.toUpperCase();

  if (session === undefined || loading) return null;
  if (!session) return null;

  // ── Shared section header style ───────────────────────────────────
  const sectionHead = {
    margin: "0 0 10px 0",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    color: "#999",
  };

  // ── Pet info display: 3 sections with dividers ────────────────────
  function renderPetInfoSections(pet) {
    const hasMedical = pet.allergies || pet.medications || pet.microchip_number;
    const hasVet = pet.vet_name || pet.vet_phone;
    const hasOwner = pet.owner_name || pet.owner_phone || pet.owner_email;
    if (!hasMedical && !hasVet && !hasOwner) return null;

    const vetGpsQuery = [pet.vet_name, pet.vet_address, pet.vet_city]
      .filter(Boolean)
      .join(", ");
    const vetGpsUrl = vetGpsQuery
      ? `https://maps.google.com/?q=${encodeURIComponent(vetGpsQuery)}`
      : null;

    return (
      <>
        {/* Section 1: Medical Info */}
        {hasMedical && (
          <div
            style={{
              borderTop: "1px solid #eee",
              paddingTop: "12px",
              marginBottom: "12px",
            }}
          >
            <p style={sectionHead}>🏥 Medical Info</p>
            {pet.allergies && (
              <p className="detail-row">
                <span style={{ color: "#888" }}>⚠️ Allergies: </span>
                <span style={{ color: "#c62828", fontWeight: "600" }}>
                  {pet.allergies}
                </span>
              </p>
            )}
            {pet.medications && (
              <p className="detail-row">
                <span style={{ color: "#888" }}>💊 Medications: </span>
                <span style={{ color: "#333" }}>{pet.medications}</span>
              </p>
            )}
            {pet.microchip_number && (
              <p className="detail-row">
                <span style={{ color: "#888" }}>🔖 Microchip: </span>
                <span
                  style={{
                    color: "#333",
                    fontFamily: "monospace",
                    fontSize: "12px",
                  }}
                >
                  {pet.microchip_number}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Section 2: My Vet */}
        {hasVet && (
          <div
            style={{
              borderTop: "1px solid #eee",
              paddingTop: "12px",
              marginBottom: "12px",
            }}
          >
            <p style={sectionHead}>🩺 My Vet</p>
            {/* Contact card style — no labels, stacked lines */}
            {pet.vet_name && (
              <p
                className="detail-row"
                style={{
                  fontWeight: "600",
                  color: "#333",
                  marginBottom: "2px",
                }}
              >
                {!pet.vet_address && vetGpsUrl ? (
                  <a
                    href={vetGpsUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: "#2d6a4f",
                      textDecoration: "none",
                      fontWeight: "600",
                    }}
                  >
                    {pet.vet_name}
                  </a>
                ) : (
                  pet.vet_name
                )}
              </p>
            )}
            {pet.vet_address && (
              <p className="detail-row" style={{ marginBottom: "2px" }}>
                {vetGpsUrl ? (
                  <a
                    href={vetGpsUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#2d6a4f", textDecoration: "none" }}
                  >
                    <span style={{ display: "block" }}>{pet.vet_address}</span>
                    {(pet.vet_city || pet.vet_zip) && (
                      <span style={{ display: "block" }}>
                        {[pet.vet_city, pet.vet_zip].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </a>
                ) : (
                  <>
                    <span style={{ display: "block" }}>{pet.vet_address}</span>
                    {(pet.vet_city || pet.vet_zip) && (
                      <span style={{ display: "block", color: "#555" }}>
                        {[pet.vet_city, pet.vet_zip].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </>
                )}
              </p>
            )}
            {pet.vet_phone && (
              <p className="detail-row" style={{ marginBottom: "2px" }}>
                <a
                  href={`tel:${pet.vet_phone}`}
                  style={{ color: "#2d6a4f", textDecoration: "none" }}
                >
                  {formatPhone(pet.vet_phone)}
                </a>
              </p>
            )}
          </div>
        )}

        {/* Section 3: Owner Contact */}
        {hasOwner && (
          <div
            style={{
              borderTop: "1px solid #eee",
              paddingTop: "12px",
              marginBottom: "12px",
            }}
          >
            <p style={sectionHead}>👤 Owner Contact</p>
            {pet.owner_name && (
              <p className="detail-row">
                <span style={{ color: "#888" }}>Name: </span>
                <span style={{ color: "#333" }}>{pet.owner_name}</span>
              </p>
            )}
            {pet.owner_phone && (
              <p className="detail-row">
                <span style={{ color: "#888" }}>Phone: </span>
                <a
                  href={`tel:${pet.owner_phone}`}
                  style={{ color: "#2d6a4f", textDecoration: "none" }}
                >
                  {formatPhone(pet.owner_phone)}
                </a>
              </p>
            )}
            {pet.owner_email && (
              <p className="detail-row">
                <span style={{ color: "#888" }}>Email: </span>
                <a
                  href={`mailto:${pet.owner_email}`}
                  style={{ color: "#2d6a4f", textDecoration: "none" }}
                >
                  {pet.owner_email}
                </a>
              </p>
            )}
          </div>
        )}
      </>
    );
  }

  function renderPetFormFields() {
    return (
      <>
        <div className="form-grid">
          <div className="field">
            <label className="label">Name *</label>
            <input
              className="input"
              value={petForm.name}
              onChange={(e) => setPetForm({ ...petForm, name: e.target.value })}
              placeholder="e.g. Buddy"
            />
          </div>
          <div className="field">
            <label className="label">Species</label>
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
            >
              <option>Dog</option>
              <option>Cat</option>
              <option>Bird</option>
              <option>Rabbit</option>
              <option>Other</option>
            </select>
            {petForm.species === "Other" && (
              <input
                className="input"
                style={{ marginTop: "6px" }}
                value={petForm.species_other || ""}
                onChange={(e) =>
                  setPetForm({ ...petForm, species_other: e.target.value })
                }
                placeholder="e.g. Guinea Pig, Ferret..."
              />
            )}
          </div>
          <div className="field">
            <label className="label">Breed</label>
            <input
              className="input"
              value={petForm.breed}
              onChange={(e) =>
                setPetForm({ ...petForm, breed: e.target.value })
              }
              placeholder="e.g. Golden Retriever"
            />
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
          </div>
          <div className="field">
            <label className="label">Weight (lbs)</label>
            <input
              className="input"
              type="number"
              value={petForm.weight_lbs}
              onChange={(e) =>
                setPetForm({ ...petForm, weight_lbs: e.target.value })
              }
              placeholder="e.g. 45"
            />
          </div>
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
              placeholder="9, 10, or 15 digits"
              style={{ borderColor: microchipError ? "#c62828" : undefined }}
            />
            {microchipError && (
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontSize: "12px",
                  color: "#c62828",
                }}
              >
                ⚠️ {microchipError}
              </p>
            )}
          </div>
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
          <textarea
            className="input"
            value={petForm.notes}
            onChange={(e) => setPetForm({ ...petForm, notes: e.target.value })}
            placeholder="Any other important info..."
            rows={2}
            style={{ resize: "vertical", height: "auto" }}
          />
        </div>
        <p className="section-divider">Owner Contact Info</p>
        <p style={{ margin: "-8px 0 12px 0", fontSize: "12px", color: "#aaa" }}>
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
        <p
          className="label"
          style={{
            margin: "16px 0 4px 0",
            fontWeight: "700",
            fontSize: "13px",
            color: "#111",
          }}
        >
          🏥 My Vet
        </p>
        <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "#aaa" }}>
          Shown on the medical card so emergency responders know your vet.
        </p>
        <div className="form-grid">
          <div className="field">
            <label className="label">Vet Name</label>
            <input
              className="input"
              value={petForm.vet_name}
              onChange={(e) =>
                setPetForm({ ...petForm, vet_name: e.target.value })
              }
              placeholder="e.g. Oakland Animal Hospital"
            />
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
      </>
    );
  }

  return (
    <>
      <style>{`
        .input { width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #ddd; font-size: 14px; box-sizing: border-box; font-family: system-ui, sans-serif; outline: none; background: #fff; height: 40px; color: #111; -webkit-appearance: none; appearance: none; display: block; text-align: left; }
        input[type="date"].input { text-align: left; }
        input[type="date"].input::-webkit-date-and-time-value { text-align: left; }
        input[type="date"].input::-webkit-datetime-edit { text-align: left; padding: 0; }
        input[type="date"].input::-webkit-datetime-edit-fields-wrapper { padding: 0; text-align: left; }
        .input:focus { border-color: #2d6a4f; }
        select.input { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 42px; cursor: pointer; }
        input[type="number"].input { -moz-appearance: textfield; }
        input[type="number"].input::-webkit-outer-spin-button, input[type="number"].input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .btn-primary { padding: 0 20px; height: 44px; background: #2d6a4f; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 600; font-family: system-ui, sans-serif; display: inline-flex; align-items: center; white-space: nowrap; }
        .btn-primary:hover { background: #245a42; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-secondary { padding: 0 20px; height: 44px; min-width: 80px; background: #fff; color: #555; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; cursor: pointer; font-family: system-ui, sans-serif; display: inline-flex; align-items: center; justify-content: center; white-space: nowrap; }
        .btn-secondary:hover { background: #f5f5f5; }
        .btn-sm { height: 40px; min-width: 80px; padding: 0 14px; font-size: 13px; border-radius: 8px; cursor: pointer; font-family: system-ui, sans-serif; display: inline-flex; align-items: center; justify-content: center; white-space: nowrap; }
        .btn-danger-sm { height: 44px; padding: 0 20px; min-width: 80px; font-size: 14px; border-radius: 8px; cursor: pointer; font-family: system-ui, sans-serif; display: inline-flex; align-items: center; justify-content: center; color: #c62828; background: none; border: 1px solid #ffcdd2; white-space: nowrap; }
        .section { background: #fff; border: 1px solid #ddd; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
        .label { display: block; font-size: 12px; color: #888; margin-bottom: 4px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
        .field { margin-bottom: 14px; }
        .tag { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; background: #e8f5e9; color: #2d6a4f; margin-right: 4px; margin-bottom: 4px; }
        .photo-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.45); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; cursor: pointer; }
        .avatar-wrap:hover .photo-overlay { opacity: 1; }
        .pet-photo-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.45); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; cursor: pointer; }
        .pet-photo-wrap:hover .pet-photo-overlay { opacity: 1; }
        .section-divider { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #aaa; margin: 20px 0 12px 0; padding-top: 16px; border-top: 1px solid #f0f0f0; }
        .pet-hi-card { text-align: center; padding: 16px 0 20px 0; border-bottom: 1px solid #f0f0f0; margin-bottom: 16px; }
        .detail-row { margin: 0 0 8px 0; font-size: 13px; line-height: 1.4; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .contact-grid { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 8px; align-items: end; }
        .history-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .history-row-btns { display: flex; gap: 8px; flex-shrink: 0; align-items: center; }
        .btn-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .pet-bottom-row { display: flex; justify-content: flex-end; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 12px; padding-top: 10px; border-top: 1px solid #eee; }
        .pet-bottom-row-editing { display: flex; justify-content: flex-start; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 12px; padding-top: 10px; border-top: 1px solid #eee; }
        @media (max-width: 600px) {
          .form-grid { grid-template-columns: 1fr; }
          .contact-grid { grid-template-columns: 1fr; }
          .contact-grid .contact-btn-row { margin-top: 12px; }
          .contact-grid .contact-btn-row .btn-primary, .contact-grid .contact-btn-row .btn-secondary { flex: 1; justify-content: center; }
          .history-row { flex-direction: column; align-items: flex-start; gap: 0; }
          .history-row-btns { width: 100%; margin-top: 12px; }
          .btn-row { flex-direction: column; align-items: stretch; }
          .btn-row .btn-primary, .btn-row .btn-secondary { width: 100%; justify-content: center; }
          .pet-bottom-row { justify-content: stretch; }
          .pet-bottom-row > *, .pet-bottom-row-editing > * { flex: 1; justify-content: center; }
        }
      `}</style>

      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "20px",
          fontFamily: "system-ui, sans-serif",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <Link
            href="/"
            style={{
              color: "#2d6a4f",
              fontSize: "14px",
              textDecoration: "none",
            }}
          >
            ← Back to all vets
          </Link>
          <Navbar />
        </div>

        {/* ── Profile header ── */}
        <div className="section">
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "16px",
              marginBottom: "14px",
            }}
          >
            <div
              className="avatar-wrap"
              style={{
                position: "relative",
                width: "72px",
                height: "72px",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background: avatarUrl ? "transparent" : "#2d6a4f",
                  color: "#fff",
                  fontSize: "26px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  border: "2px solid #e0e0e0",
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  avatarLetter
                )}
              </div>
              <div
                className="photo-overlay"
                onClick={() => fileInputRef.current?.click()}
              >
                {convertingPhoto ? (
                  <span style={{ fontSize: "11px", color: "#fff" }}>
                    Converting...
                  </span>
                ) : uploadingPhoto ? (
                  <span style={{ fontSize: "11px", color: "#fff" }}>
                    Uploading...
                  </span>
                ) : (
                  <>
                    <span style={{ fontSize: "18px" }}>📷</span>
                    <span
                      style={{
                        fontSize: "10px",
                        color: "#fff",
                        marginTop: "2px",
                      }}
                    >
                      Change
                    </span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
                onChange={handlePhotoUpload}
                style={{ display: "none" }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1
                style={{
                  margin: "0 0 4px 0",
                  fontSize: "1.3rem",
                  color: "#111",
                }}
              >
                {profile?.full_name || session?.user?.email}
              </h1>
              <p
                style={{ margin: "0 0 2px 0", fontSize: "13px", color: "#888" }}
              >
                {session?.user?.email}
              </p>
              {profile?.zip_code && (
                <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>
                  {cityState
                    ? `${cityState} ${profile.zip_code}`
                    : profile.zip_code}
                </p>
              )}
            </div>
          </div>
          {profile?.bio && (
            <p
              style={{
                margin: "0 0 14px 0",
                fontSize: "14px",
                color: "#555",
                lineHeight: "1.6",
              }}
            >
              {profile.bio}
            </p>
          )}
          {!editingProfile && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "12px",
                borderTop: "1px solid #f0f0f0",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <Link
                href="/saved"
                style={{
                  fontSize: "12px",
                  color: "#2d6a4f",
                  textDecoration: "none",
                }}
              >
                ❤️ View saved vets →
              </Link>
              <button
                onClick={() => {
                  closeAllEditing();
                  setEditingProfile(true);
                }}
                className="btn-secondary"
                style={{ fontSize: "12px", padding: "5px 10px" }}
              >
                Edit Profile
              </button>
            </div>
          )}
          {editingProfile && (
            <div
              style={{
                marginTop: "16px",
                paddingTop: "16px",
                borderTop: "1px solid #f0f0f0",
              }}
            >
              <div className="field">
                <label className="label">Display Name</label>
                <input
                  className="input"
                  value={profileForm.full_name}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      full_name: e.target.value,
                    })
                  }
                  placeholder="Your name"
                />
              </div>
              <div className="field">
                <label className="label">Bio</label>
                <textarea
                  className="input"
                  value={profileForm.bio}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, bio: e.target.value })
                  }
                  placeholder="A little about you and your pets..."
                  rows={3}
                  style={{ resize: "vertical", height: "auto" }}
                />
              </div>
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
                  style={{ maxWidth: "140px" }}
                />
              </div>
              <div
                className="field"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <input
                  type="checkbox"
                  id="is_public"
                  checked={profileForm.is_public}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      is_public: e.target.checked,
                    })
                  }
                />
                <label
                  htmlFor="is_public"
                  style={{ fontSize: "14px", color: "#333", cursor: "pointer" }}
                >
                  Make my profile public
                </label>
              </div>
              <div className="btn-row">
                <button
                  onClick={handleSaveProfile}
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Profile"}
                </button>
                <button
                  onClick={() => setEditingProfile(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── My Pets ── */}
        <div className="section">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#111" }}>
              🐾 My Pets
            </h2>
            <button
              onClick={() => {
                if (showAddPet) {
                  setShowAddPet(false);
                } else {
                  closeAllEditing();
                  setShowAddPet(true);
                }
              }}
              className="btn-primary"
            >
              {showAddPet ? "Cancel" : "+ Add Pet"}
            </button>
          </div>

          {showAddPet && (
            <div
              style={{
                marginBottom: "16px",
                paddingBottom: "16px",
                borderBottom: "1px solid #eee",
              }}
            >
              <div className="pet-hi-card">
                <div
                  className="pet-photo-wrap"
                  style={{
                    position: "relative",
                    width: "88px",
                    height: "88px",
                    margin: "0 auto 12px auto",
                  }}
                >
                  <div
                    style={{
                      width: "88px",
                      height: "88px",
                      borderRadius: "50%",
                      background: formPhotoUrl ? "transparent" : "#e8f5e9",
                      border: "2px solid #ddd",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      fontSize: "36px",
                    }}
                  >
                    {formPhotoUrl ? (
                      <img
                        src={formPhotoUrl}
                        alt="pet"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      speciesEmoji(petForm.species)
                    )}
                  </div>
                  <div
                    className="pet-photo-overlay"
                    onClick={() => newPetPhotoRef.current?.click()}
                  >
                    <span style={{ fontSize: "18px" }}>📷</span>
                    <span
                      style={{
                        fontSize: "10px",
                        color: "#fff",
                        marginTop: "2px",
                      }}
                    >
                      Add photo
                    </span>
                  </div>
                  <input
                    ref={newPetPhotoRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
                    onChange={handleNewPetPhotoPreview}
                    style={{ display: "none" }}
                  />
                </div>
                <p
                  style={{
                    margin: "0 0 4px 0",
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "#111",
                  }}
                >
                  Hi, I'm {previewName}! {speciesEmoji(petForm.species)}
                </p>
                {previewSubtitle && (
                  <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>
                    {previewSubtitle}
                  </p>
                )}
              </div>
              {renderPetFormFields()}
              <div className="btn-row" style={{ marginTop: "4px" }}>
                <button
                  onClick={handleSavePet}
                  className="btn-primary"
                  disabled={saving || !petForm.name || !!microchipError}
                >
                  {saving
                    ? "Saving..."
                    : convertingPhoto
                      ? "Converting photo..."
                      : "Add Pet"}
                </button>
                <button
                  onClick={() => {
                    setPetForm(emptyPetForm);
                    setPendingPetPhoto(null);
                    setMicrochipError("");
                  }}
                  className="btn-secondary"
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    setShowAddPet(false);
                    setPendingPetPhoto(null);
                    setMicrochipError("");
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {pets.length === 0 && !showAddPet && (
            <p style={{ color: "#999", fontSize: "14px", fontStyle: "italic" }}>
              No pets added yet. Add your first pet!
            </p>
          )}

          {pets.map((pet) => (
            <div
              key={pet.id}
              ref={(el) => {
                petCardRefs.current[pet.id] = el;
              }}
              style={{
                border: "1px solid #eee",
                borderRadius: "12px",
                padding: "14px",
                marginBottom: "12px",
                background: "#fafafa",
              }}
            >
              {/* Pet header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "10px",
                }}
              >
                <div
                  className="pet-photo-wrap"
                  style={{
                    position: "relative",
                    width: "56px",
                    height: "56px",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      background: "#e8f5e9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      border: "2px solid #ddd",
                      fontSize: "24px",
                    }}
                  >
                    {pet.photo_url ? (
                      <img
                        src={pet.photo_url}
                        alt={pet.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      speciesEmoji(pet.species)
                    )}
                  </div>
                  <div
                    className="pet-photo-overlay"
                    onClick={() => petPhotoRefs.current[pet.id]?.click()}
                  >
                    {uploadingPetPhoto === pet.id ? (
                      <span style={{ fontSize: "10px", color: "#fff" }}>
                        ...
                      </span>
                    ) : (
                      <span style={{ fontSize: "14px" }}>📷</span>
                    )}
                  </div>
                  <input
                    ref={(el) => {
                      petPhotoRefs.current[pet.id] = el;
                    }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
                    onChange={(e) => handlePetPhotoUpload(e, pet.id)}
                    style={{ display: "none" }}
                  />
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1rem",
                    color: "#111",
                    fontWeight: "700",
                    flex: 1,
                  }}
                >
                  Hi, I'm {pet.name}! {speciesEmoji(pet.species)}
                </h3>
              </div>

              {editingPetId === pet.id && (
                <div style={{ margin: "12px 0" }}>{renderPetFormFields()}</div>
              )}

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  marginBottom: pet.notes ? "8px" : "12px",
                }}
              >
                {pet.breed && <span className="tag">{pet.breed}</span>}
                {pet.birthday && (
                  <span className="tag">{calcAge(pet.birthday)}</span>
                )}
                {pet.weight_lbs && (
                  <span className="tag">{pet.weight_lbs} lbs</span>
                )}
              </div>

              {pet.notes && (
                <p
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: "13px",
                    color: "#666",
                    fontStyle: "italic",
                    lineHeight: "1.5",
                  }}
                >
                  {pet.notes}
                </p>
              )}

              {/* ── 3 Sectioned info blocks ── */}
              {renderPetInfoSections(pet)}

              {/* Emergency Contacts */}
              <div
                style={{
                  marginTop: "10px",
                  paddingTop: "10px",
                  borderTop: "1px solid #eee",
                }}
              >
                <button
                  onClick={() => {
                    if (showContactsFor === pet.id) {
                      setShowContactsFor(null);
                      setEditingContactId(null);
                      setShowAddContactFor(null);
                      setNewContact({ name: "", phone: "", relationship: "" });
                    } else {
                      setEditingContactId(null);
                      setShowAddContactFor(null);
                      setNewContact({ name: "", phone: "", relationship: "" });
                      fetchContactsForPet(pet.id);
                    }
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2d6a4f",
                    fontSize: "13px",
                    cursor: "pointer",
                    padding: 0,
                    fontWeight: "600",
                    fontFamily: "system-ui, sans-serif",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  🚨 Emergency Contacts
                  <span
                    style={{
                      display: "inline-block",
                      transition: "transform 0.3s",
                      transform:
                        showContactsFor === pet.id
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                      fontSize: "10px",
                    }}
                  >
                    ▼
                  </span>
                </button>
                <div
                  style={{
                    overflow: "hidden",
                    maxHeight: showContactsFor === pet.id ? "1200px" : "0px",
                    opacity: showContactsFor === pet.id ? 1 : 0,
                    transition:
                      showContactsFor === pet.id
                        ? "max-height 0.4s ease, opacity 0.3s ease"
                        : "max-height 0.25s ease, opacity 0.2s ease",
                  }}
                >
                  <div style={{ marginTop: "6px" }}>
                    {(contacts[pet.id] || []).map((c) => (
                      <div key={c.id}>
                        <div
                          style={{
                            padding: "12px 0",
                            borderBottom: "1px solid #f5f5f5",
                          }}
                        >
                          <div className="history-row">
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <span
                                style={{
                                  fontSize: "14px",
                                  fontWeight: "600",
                                  color: "#111",
                                }}
                              >
                                {c.name}
                              </span>
                              {c.relationship && (
                                <span
                                  style={{
                                    fontSize: "12px",
                                    color: "#888",
                                    marginLeft: "8px",
                                  }}
                                >
                                  ({c.relationship})
                                </span>
                              )}
                              {c.phone && (
                                <span
                                  style={{
                                    display: "block",
                                    fontSize: "13px",
                                    marginTop: "8px",
                                  }}
                                >
                                  <a
                                    href={`tel:${c.phone}`}
                                    style={{
                                      color: "#2d6a4f",
                                      textDecoration: "none",
                                    }}
                                  >
                                    📞 {formatPhone(c.phone)}
                                  </a>
                                </span>
                              )}
                            </div>
                            <div className="history-row-btns">
                              <button
                                onClick={() =>
                                  editingContactId === c.id
                                    ? setEditingContactId(null)
                                    : startEditContact(c)
                                }
                                className="btn-sm"
                                style={{
                                  background: "#fff",
                                  color: "#555",
                                  border: "1px solid #ddd",
                                }}
                              >
                                {editingContactId === c.id ? "Cancel" : "Edit"}
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteContact(pet.id, c.id)
                                }
                                className="btn-sm"
                                style={{
                                  color: "#c62828",
                                  background: "none",
                                  border: "1px solid #ffcdd2",
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                        {editingContactId === c.id && (
                          <div
                            style={{
                              background: "#f9f9f9",
                              borderRadius: "8px",
                              padding: "12px 0",
                              marginBottom: "8px",
                            }}
                          >
                            <div className="contact-grid">
                              <div>
                                <label className="label">Name</label>
                                <input
                                  className="input"
                                  value={editContactForm.name}
                                  onChange={(e) =>
                                    setEditContactForm({
                                      ...editContactForm,
                                      name: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="label">Phone</label>
                                <input
                                  className="input"
                                  value={editContactForm.phone}
                                  onChange={(e) =>
                                    setEditContactForm({
                                      ...editContactForm,
                                      phone: handlePhoneInput(e.target.value),
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="label">Relationship</label>
                                <input
                                  className="input"
                                  value={editContactForm.relationship}
                                  onChange={(e) =>
                                    setEditContactForm({
                                      ...editContactForm,
                                      relationship: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div
                                className="contact-btn-row"
                                style={{
                                  display: "flex",
                                  gap: "8px",
                                  alignSelf: "flex-end",
                                }}
                              >
                                <button
                                  onClick={() =>
                                    handleUpdateContact(pet.id, c.id)
                                  }
                                  className="btn-primary"
                                  style={{ height: "40px" }}
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingContactId(null)}
                                  className="btn-secondary"
                                  style={{ height: "40px" }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {(contacts[pet.id] || []).length === 0 && (
                      <p
                        style={{
                          fontSize: "13px",
                          color: "#999",
                          fontStyle: "italic",
                          margin: "4px 0 8px 0",
                        }}
                      >
                        No emergency contacts yet.
                      </p>
                    )}
                    {showAddContactFor === pet.id ? (
                      <div
                        className="contact-grid"
                        style={{ marginTop: "10px" }}
                      >
                        <div>
                          <label className="label">Name</label>
                          <input
                            className="input"
                            value={newContact.name}
                            onChange={(e) =>
                              setNewContact({
                                ...newContact,
                                name: e.target.value,
                              })
                            }
                            placeholder="Contact name"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="label">Phone</label>
                          <input
                            className="input"
                            value={newContact.phone}
                            onChange={(e) =>
                              setNewContact({
                                ...newContact,
                                phone: handlePhoneInput(e.target.value),
                              })
                            }
                            placeholder="(555) 555-5555"
                          />
                        </div>
                        <div>
                          <label className="label">Relationship</label>
                          <input
                            className="input"
                            value={newContact.relationship}
                            onChange={(e) =>
                              setNewContact({
                                ...newContact,
                                relationship: e.target.value,
                              })
                            }
                            placeholder="e.g. Spouse"
                          />
                        </div>
                        <div
                          className="contact-btn-row"
                          style={{
                            display: "flex",
                            gap: "8px",
                            alignSelf: "flex-end",
                          }}
                        >
                          <button
                            onClick={() => handleAddContact(pet.id)}
                            className="btn-primary"
                            style={{ height: "40px" }}
                          >
                            Add
                          </button>
                          <button
                            onClick={() => {
                              setShowAddContactFor(null);
                              setNewContact({
                                name: "",
                                phone: "",
                                relationship: "",
                              });
                            }}
                            className="btn-secondary"
                            style={{ height: "40px" }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          closeAllEditing();
                          setShowAddContactFor(pet.id);
                        }}
                        className="btn-secondary"
                        style={{ marginTop: "10px", width: "100%" }}
                      >
                        + Add Contact
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Check Symptoms */}
              <div
                style={{
                  marginTop: "10px",
                  paddingTop: "10px",
                  borderTop: "1px solid #eee",
                }}
              >
                <button
                  onClick={() => handleCheckSymptoms(pet)}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "#2d6a4f",
                    color: "#fff",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "15px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  🩺 Check Symptoms for {pet.name}
                </button>
              </div>

              {/* Symptom History */}
              <div
                style={{
                  marginTop: "10px",
                  paddingTop: "10px",
                  borderTop: "1px solid #eee",
                }}
              >
                <button
                  onClick={() => {
                    if (showHistoryFor === pet.id) {
                      setShowHistoryFor(null);
                    } else {
                      setEditingContactId(null);
                      setNewContact({ name: "", phone: "", relationship: "" });
                      fetchSymptomHistory(pet.id);
                    }
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2d6a4f",
                    fontSize: "13px",
                    cursor: "pointer",
                    padding: 0,
                    fontWeight: "600",
                    fontFamily: "system-ui, sans-serif",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  🩺 Symptom History
                  <span
                    style={{
                      display: "inline-block",
                      transition: "transform 0.3s",
                      transform:
                        showHistoryFor === pet.id
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                      fontSize: "10px",
                    }}
                  >
                    ▼
                  </span>
                </button>
                <div
                  style={{
                    overflow: "hidden",
                    maxHeight: showHistoryFor === pet.id ? "800px" : "0px",
                    opacity: showHistoryFor === pet.id ? 1 : 0,
                    transition:
                      showHistoryFor === pet.id
                        ? "max-height 0.4s ease, opacity 0.3s ease"
                        : "max-height 0.25s ease, opacity 0.2s ease",
                  }}
                >
                  <div style={{ marginTop: "6px" }}>
                    {(symptomHistory[pet.id] || []).length === 0 ? (
                      <p
                        style={{
                          fontSize: "13px",
                          color: "#999",
                          fontStyle: "italic",
                          margin: "4px 0 8px 0",
                        }}
                      >
                        No symptom checks yet.
                      </p>
                    ) : (
                      (symptomHistory[pet.id] || []).map((check) => {
                        const t = triageLabel(check.triage_result);
                        const isConfirming =
                          deleteCheckConfirm?.checkId === check.id;
                        return (
                          <div
                            key={check.id}
                            style={{
                              padding: "12px 0",
                              borderBottom: "1px solid #f5f5f5",
                            }}
                          >
                            {!isConfirming ? (
                              <div className="history-row">
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    minWidth: 0,
                                    flex: 1,
                                  }}
                                >
                                  <span
                                    style={{ fontSize: "16px", flexShrink: 0 }}
                                  >
                                    {t.emoji}
                                  </span>
                                  <div style={{ minWidth: 0 }}>
                                    <p
                                      style={{
                                        margin: 0,
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        color: t.color,
                                      }}
                                    >
                                      {t.label}
                                    </p>
                                    <p
                                      style={{
                                        margin: 0,
                                        fontSize: "11px",
                                        color: "#aaa",
                                      }}
                                    >
                                      {formatDate(check.created_at)}
                                    </p>
                                  </div>
                                </div>
                                <div className="history-row-btns">
                                  <button
                                    onClick={() =>
                                      handleViewSymptomCheck(pet, check)
                                    }
                                    className="btn-sm"
                                    style={{
                                      color: "#2d6a4f",
                                      background: "none",
                                      border: "1px solid #c8e6c9",
                                    }}
                                  >
                                    View →
                                  </button>
                                  <button
                                    onClick={() => {
                                      closeAllEditing();
                                      setDeleteCheckConfirm({
                                        petId: pet.id,
                                        checkId: check.id,
                                      });
                                    }}
                                    className="btn-sm"
                                    style={{
                                      color: "#c62828",
                                      background: "none",
                                      border: "1px solid #ffcdd2",
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="history-row">
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    minWidth: 0,
                                    flex: 1,
                                  }}
                                >
                                  <span
                                    style={{ fontSize: "16px", flexShrink: 0 }}
                                  >
                                    {t.emoji}
                                  </span>
                                  <div style={{ minWidth: 0 }}>
                                    <p
                                      style={{
                                        margin: 0,
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        color: t.color,
                                      }}
                                    >
                                      {t.label}
                                    </p>
                                    <p
                                      style={{
                                        margin: 0,
                                        fontSize: "11px",
                                        color: "#aaa",
                                      }}
                                    >
                                      {formatDate(check.created_at)}
                                    </p>
                                  </div>
                                </div>
                                <div
                                  className="history-row-btns"
                                  style={{ alignItems: "center" }}
                                >
                                  <span
                                    style={{
                                      fontSize: "12px",
                                      color: "#c62828",
                                      fontWeight: "600",
                                      whiteSpace: "nowrap",
                                      lineHeight: "40px",
                                    }}
                                  >
                                    Delete?
                                  </span>
                                  <button
                                    onClick={() =>
                                      handleDeleteSymptomCheck(pet.id, check.id)
                                    }
                                    className="btn-sm"
                                    style={{
                                      color: "#fff",
                                      background: "#c62828",
                                      border: "none",
                                      fontWeight: "600",
                                    }}
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setDeleteCheckConfirm(null)}
                                    className="btn-sm"
                                    style={{
                                      color: "#555",
                                      background: "#f0f0f0",
                                      border: "none",
                                    }}
                                  >
                                    No
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom row */}
              {editingPetId === pet.id ? (
                <div className="pet-bottom-row-editing">
                  <button
                    onClick={handleSavePet}
                    className="btn-primary"
                    disabled={saving || !petForm.name || !!microchipError}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingPetId(null);
                      setMicrochipError("");
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="pet-bottom-row">
                  <button
                    onClick={() => {
                      closeAllEditing();
                      const url = `${window.location.origin}/pet/${pet.id}`;
                      if (navigator.share) {
                        navigator
                          .share({ title: `${pet.name}'s Medical Card`, url })
                          .catch(() => {});
                      } else if (navigator.clipboard) {
                        navigator.clipboard
                          .writeText(url)
                          .then(() => showToast("Link copied!"));
                      } else {
                        window.prompt("Copy this link:", url);
                      }
                    }}
                    className="btn-secondary"
                  >
                    🔗 Share
                  </button>
                  <button
                    onClick={() => startEditPet(pet)}
                    className="btn-secondary"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      closeAllEditing();
                      handleDeletePet(pet.id);
                    }}
                    className="btn-danger-sm"
                  >
                    🗑️ Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <footer
          style={{
            marginTop: "40px",
            borderTop: "1px solid #ddd",
            paddingTop: "24px",
            paddingBottom: "40px",
            textAlign: "center",
            color: "#888",
            fontSize: "13px",
          }}
        >
          <p
            style={{
              margin: "0 0 8px 0",
              fontWeight: "bold",
              color: "#2d6a4f",
              fontSize: "15px",
            }}
          >
            🐾 PetParrk
          </p>
          <p style={{ margin: 0 }}>
            Questions?{" "}
            <a
              href="mailto:bkalthompson@gmail.com"
              style={{ color: "#2d6a4f", textDecoration: "none" }}
            >
              bkalthompson@gmail.com
            </a>
          </p>
        </footer>
      </div>
    </>
  );
}
