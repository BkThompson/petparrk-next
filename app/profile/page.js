"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showAddPet, setShowAddPet] = useState(false);
  const [editingPetId, setEditingPetId] = useState(null);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    bio: "",
    is_public: false,
  });
  const emptyPetForm = {
    name: "",
    species: "Dog",
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
  };
  const [petForm, setPetForm] = useState(emptyPetForm);
  const [microchipError, setMicrochipError] = useState("");
  const [pendingPetPhoto, setPendingPetPhoto] = useState(null); // for new pets before save
  const [contacts, setContacts] = useState({});
  const [showContactsFor, setShowContactsFor] = useState(null);
  const [newContact, setNewContact] = useState({
    name: "",
    phone: "",
    relationship: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingPetPhoto, setUploadingPetPhoto] = useState(null);
  const [convertingPhoto, setConvertingPhoto] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [avatarError, setAvatarError] = useState(false);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);
  const petPhotoRefs = useRef({});
  const newPetPhotoRef = useRef(null);

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
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  // Returns a File ready to upload — converts HEIC to JPEG automatically
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
          { type: "image/jpeg" }
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
        file.type
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
    await supabase
      .from("profiles")
      .upsert({
        id: session.user.id,
        avatar_url: urlWithCache,
        updated_at: new Date().toISOString(),
      });
    setProfile((prev) => ({ ...prev, avatar_url: urlWithCache }));
    setAvatarError(false);
    showSuccess("Profile photo updated!");
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
      prev.map((p) => (p.id === petId ? { ...p, photo_url: urlWithCache } : p))
    );
    showSuccess("Pet photo updated!");
    setUploadingPetPhoto(null);
  }

  // For new pet form — preview before save (also converts HEIC)
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

  async function handleSaveProfile() {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: session.user.id,
        full_name: profileForm.full_name,
        bio: profileForm.bio,
        is_public: profileForm.is_public,
        updated_at: new Date().toISOString(),
      });
    if (!error) {
      setProfile((prev) => ({ ...prev, ...profileForm }));
      setEditingProfile(false);
      showSuccess("Profile saved!");
    }
    setSaving(false);
  }

  async function handleSavePet() {
    setSaving(true);
    if (editingPetId) {
      const { error } = await supabase
        .from("pets")
        .update({
          ...petForm,
          weight_lbs: petForm.weight_lbs || null,
          birthday: petForm.birthday || null,
        })
        .eq("id", editingPetId);
      if (!error) {
        setPets((prev) =>
          prev.map((p) => (p.id === editingPetId ? { ...p, ...petForm } : p))
        );
        setEditingPetId(null);
        showSuccess("Pet updated!");
      }
    } else {
      const { data, error } = await supabase
        .from("pets")
        .insert({
          owner_id: session.user.id,
          ...petForm,
          weight_lbs: petForm.weight_lbs || null,
          birthday: petForm.birthday || null,
        })
        .select()
        .single();
      if (!error) {
        let finalPet = data;
        // Upload pending photo if any
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
        showSuccess("Pet added!");
      }
    }
    setPetForm(emptyPetForm);
    setMicrochipError("");
    setSaving(false);
  }

  async function handleDeletePet(petId) {
    if (!confirm("Remove this pet?")) return;
    await supabase.from("pets").delete().eq("id", petId);
    setPets((prev) => prev.filter((p) => p.id !== petId));
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
  }

  async function handleDeleteContact(petId, contactId) {
    await supabase.from("pet_emergency_contacts").delete().eq("id", contactId);
    setContacts((prev) => ({
      ...prev,
      [petId]: prev[petId].filter((c) => c.id !== contactId),
    }));
  }

  function startEditPet(pet) {
    setEditingPetId(pet.id);
    setPetForm({
      name: pet.name || "",
      species: pet.species || "Dog",
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
    });
    setShowAddPet(false);
    setPendingPetPhoto(null);
  }

  function showSuccess(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  }
  async function handleSignOut() {
    setShowDropdown(false);
    await supabase.auth.signOut();
    router.push("/auth");
  }

  const avatarLetter = session?.user?.email?.[0]?.toUpperCase();
  const avatarUrl =
    (!avatarError &&
      (profile?.avatar_url || session?.user?.user_metadata?.avatar_url)) ||
    null;

  const calcAge = (birthday) => {
    if (!birthday) return null;
    const years = Math.floor(
      (Date.now() - new Date(birthday).getTime()) / (1000 * 60 * 60 * 24 * 365)
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
    if (d.length === 11 && d[0] === "1")
      return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
    return phone;
  }

  function handlePhoneInput(raw) {
    // Strip non-digits, then apply mask as user types
    const d = raw.replace(/\D/g, "").slice(0, 10);
    if (d.length === 0) return "";
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }

  // Live preview name for the form
  const previewName = petForm.name.trim() || "...";
  const previewSubtitle = [
    petForm.breed,
    petForm.birthday ? calcAge(petForm.birthday) : null,
    petForm.weight_lbs ? `${petForm.weight_lbs} lbs` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const formPhotoUrl = editingPetId
    ? pets.find((p) => p.id === editingPetId)?.photo_url
    : pendingPetPhoto?.previewUrl;

  if (session === undefined || loading) return null;
  if (!session) return null;

  return (
    <>
      <style>{`
        .avatar-dropdown-item { display: block; width: 100%; padding: 10px 16px; text-align: left; background: none; border: none; font-size: 13px; cursor: pointer; color: #333; white-space: nowrap; box-sizing: border-box; }
        .avatar-dropdown-item:hover { background: #f5f5f5; }
        .avatar-dropdown-item.danger { color: #555; }
        .avatar-dropdown-item.danger:hover { background: #f5f5f5; }
        .input { width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #ddd; font-size: 14px; box-sizing: border-box; font-family: system-ui, sans-serif; outline: none; background: #fff; }
        .input:focus { border-color: #2d6a4f; }
        .btn-primary { padding: 8px 20px; background: #2d6a4f; color: #fff; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; font-weight: 600; }
        .btn-primary:hover { background: #245a42; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-secondary { padding: 8px 20px; background: #fff; color: #555; border: 1px solid #ddd; border-radius: 8px; font-size: 13px; cursor: pointer; }
        .btn-secondary:hover { background: #f5f5f5; }
        .btn-danger { padding: 6px 14px; background: none; color: #c62828; border: 1px solid #c62828; border-radius: 8px; font-size: 12px; cursor: pointer; }
        .btn-danger:hover { background: #fce8e8; }
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
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .contact-grid { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 8px; align-items: end; }
        @media (max-width: 500px) { .form-grid { grid-template-columns: 1fr; } .contact-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          padding: "20px",
          fontFamily: "system-ui, sans-serif",
          minHeight: "100vh",
        }}
      >
        {/* Top nav */}
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
          {session && (
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <div
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: avatarUrl ? "transparent" : "#2d6a4f",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  overflow: "hidden",
                  border: avatarUrl ? "2px solid #ddd" : "none",
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    onError={() => setAvatarError(true)}
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
              {showDropdown && (
                <div
                  style={{
                    position: "absolute",
                    top: "40px",
                    right: 0,
                    background: "#fff",
                    border: "1px solid #e0e0e0",
                    borderRadius: "10px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                    minWidth: "180px",
                    zIndex: 100,
                    overflow: "hidden",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 16px",
                      borderBottom: "1px solid #f0f0f0",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: "11px", color: "#888" }}>
                      Signed in as
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0 0",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#333",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "160px",
                      }}
                    >
                      {session?.user?.email}
                    </p>
                  </div>
                  {[
                    ["profile", "👤 My Profile"],
                    ["saved", "❤️ Saved Vets"],
                    ["account", "⚙️ Account"],
                  ].map(([path, label]) => (
                    <Link
                      key={path}
                      href={`/${path}`}
                      onClick={() => setShowDropdown(false)}
                      style={{
                        display: "block",
                        padding: "10px 16px",
                        fontSize: "13px",
                        color: "#333",
                        textDecoration: "none",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#f5f5f5")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "none")
                      }
                    >
                      {label}
                    </Link>
                  ))}
                  <div style={{ borderTop: "1px solid #f0f0f0" }}>
                    <button
                      onClick={handleSignOut}
                      className="avatar-dropdown-item danger"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {successMsg && (
          <div
            style={{
              background: "#e8f5e9",
              color: "#2d6a4f",
              padding: "10px 16px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            ✅ {successMsg}
          </div>
        )}

        {/* Profile Header */}
        <div className="section">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
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
                      onError={() => setAvatarError(true)}
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
                    <>
                      <span style={{ fontSize: "11px", color: "#fff" }}>
                        Converting...
                      </span>
                    </>
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
              <div>
                <h1
                  style={{
                    margin: "0 0 4px 0",
                    fontSize: "1.3rem",
                    color: "#111",
                  }}
                >
                  {profile?.full_name || session?.user?.email}
                </h1>
                <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>
                  {session?.user?.email}
                </p>
                {profile?.bio && (
                  <p
                    style={{
                      margin: "6px 0 0 0",
                      fontSize: "14px",
                      color: "#555",
                    }}
                  >
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setEditingProfile(!editingProfile)}
              className="btn-secondary"
              style={{ flexShrink: 0, fontSize: "12px", padding: "5px 10px" }}
            >
              {editingProfile ? "Cancel" : "Edit Profile"}
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                padding: "2px 10px",
                borderRadius: "20px",
                background: profile?.is_public ? "#e8f5e9" : "#f0f0f0",
                color: profile?.is_public ? "#2d6a4f" : "#888",
              }}
            >
              {profile?.is_public ? "🌐 Public profile" : "🔒 Private profile"}
            </span>
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
          </div>

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
                  style={{ resize: "vertical" }}
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
                  Make my profile public (shareable link)
                </label>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
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

        {/* My Pets */}
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
                setShowAddPet(!showAddPet);
                setEditingPetId(null);
                setPetForm(emptyPetForm);
                setPendingPetPhoto(null);
              }}
              className="btn-primary"
            >
              {showAddPet ? "Cancel" : "+ Add Pet"}
            </button>
          </div>

          {/* Add / Edit Pet Form */}
          {(showAddPet || editingPetId) && (
            <div
              style={{
                background: "#f9f9f9",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "16px",
              }}
            >
              {/* "Hi I'm [name]" header with photo */}
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
                    onClick={() =>
                      editingPetId
                        ? petPhotoRefs.current[editingPetId]?.click()
                        : newPetPhotoRef.current?.click()
                    }
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
                  {/* Hidden file inputs */}
                  <input
                    ref={newPetPhotoRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
                    onChange={handleNewPetPhotoPreview}
                    style={{ display: "none" }}
                  />
                  {editingPetId && (
                    <input
                      ref={(el) => {
                        petPhotoRefs.current[editingPetId] = el;
                      }}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
                      onChange={(e) => handlePetPhotoUpload(e, editingPetId)}
                      style={{ display: "none" }}
                    />
                  )}
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

              {/* Pet fields */}
              <div className="form-grid">
                <div className="field">
                  <label className="label">Name *</label>
                  <input
                    className="input"
                    value={petForm.name}
                    onChange={(e) =>
                      setPetForm({ ...petForm, name: e.target.value })
                    }
                    placeholder="e.g. Buddy"
                  />
                </div>
                <div className="field">
                  <label className="label">Species</label>
                  <select
                    className="input"
                    value={petForm.species}
                    onChange={(e) =>
                      setPetForm({ ...petForm, species: e.target.value })
                    }
                  >
                    <option>Dog</option>
                    <option>Cat</option>
                    <option>Bird</option>
                    <option>Rabbit</option>
                    <option>Other</option>
                  </select>
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
                      const val = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 15);
                      setPetForm({ ...petForm, microchip_number: val });
                      if (
                        val.length > 0 &&
                        val.length !== 9 &&
                        val.length !== 10 &&
                        val.length !== 15
                      ) {
                        setMicrochipError("Must be 9, 10, or 15 digits");
                      } else {
                        setMicrochipError("");
                      }
                    }}
                    placeholder="9, 10, or 15 digits"
                    style={{
                      borderColor: microchipError ? "#c62828" : undefined,
                    }}
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
                  {petForm.microchip_number.length === 15 &&
                    !microchipError && (
                      <p
                        style={{
                          margin: "4px 0 0 0",
                          fontSize: "12px",
                          color: "#2d6a4f",
                        }}
                      >
                        ✅ Valid 15-digit ISO microchip
                      </p>
                    )}
                  {petForm.microchip_number.length === 10 &&
                    !microchipError && (
                      <p
                        style={{
                          margin: "4px 0 0 0",
                          fontSize: "12px",
                          color: "#2d6a4f",
                        }}
                      >
                        ✅ Valid 10-digit microchip
                      </p>
                    )}
                  {petForm.microchip_number.length === 9 && !microchipError && (
                    <p
                      style={{
                        margin: "4px 0 0 0",
                        fontSize: "12px",
                        color: "#2d6a4f",
                      }}
                    >
                      ✅ Valid 9-digit microchip
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
                  onChange={(e) =>
                    setPetForm({ ...petForm, notes: e.target.value })
                  }
                  placeholder="Any other important info..."
                  rows={2}
                  style={{ resize: "vertical" }}
                />
              </div>

              <p className="section-divider">Owner Contact Info</p>
              <p
                style={{
                  margin: "-8px 0 12px 0",
                  fontSize: "12px",
                  color: "#aaa",
                }}
              >
                Shown on the medical card so vets and finders know who to
                contact.
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

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "4px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={handleSavePet}
                  className="btn-primary"
                  disabled={saving || !petForm.name || !!microchipError}
                >
                  {saving
                    ? "Saving..."
                    : convertingPhoto
                    ? "Converting photo..."
                    : editingPetId
                    ? "Save Changes"
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
                  Clear Form
                </button>
                <button
                  onClick={() => {
                    setShowAddPet(false);
                    setEditingPetId(null);
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

          {/* Pet cards */}
          {pets.map((pet) => (
            <div
              key={pet.id}
              style={{
                border: "1px solid #eee",
                borderRadius: "12px",
                padding: "14px",
                marginBottom: "12px",
                background: "#fafafa",
              }}
            >
              {/* Row 1: Photo + Name + Action buttons */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "10px",
                }}
              >
                {/* Photo */}
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

                {/* Name — vertically centered next to photo */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "1rem",
                      color: "#111",
                      fontWeight: "700",
                    }}
                  >
                    Hi, I'm {pet.name}! {speciesEmoji(pet.species)}
                  </h3>
                </div>

                {/* Edit + Share buttons top right */}
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <button
                    onClick={() => startEditPet(pet)}
                    className="btn-secondary"
                    style={{ fontSize: "12px", padding: "5px 10px" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/pet/${pet.id}`;
                      if (navigator.share) {
                        navigator
                          .share({
                            title: `${pet.name}'s Medical Card`,
                            text: `View ${pet.name}'s pet medical card on PetParrk`,
                            url,
                          })
                          .catch((e) => {
                            if (e.name !== "AbortError") console.error(e);
                          });
                      } else if (
                        navigator.clipboard &&
                        window.isSecureContext
                      ) {
                        navigator.clipboard
                          .writeText(url)
                          .then(() => showSuccess("Medical card link copied!"));
                      } else {
                        window.prompt("Copy this link:", url);
                      }
                    }}
                    className="btn-secondary"
                    style={{ fontSize: "12px", padding: "5px 10px" }}
                  >
                    🔗 Share
                  </button>
                </div>
              </div>

              {/* Row 2: Badges under the photo (full width) */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "4px",
                  marginBottom: "6px",
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

              {/* Row 3: Notes under badges */}
              {pet.notes && (
                <p
                  style={{
                    margin: "0 0 10px 0",
                    fontSize: "13px",
                    color: "#666",
                    fontStyle: "italic",
                  }}
                >
                  {pet.notes}
                </p>
              )}

              {/* Row 4: Medical facts left-aligned */}
              {(pet.allergies ||
                pet.medications ||
                pet.microchip_number ||
                pet.owner_name) && (
                <div
                  style={{
                    borderTop: "1px solid #eee",
                    paddingTop: "8px",
                    marginBottom: "4px",
                  }}
                >
                  {pet.allergies && (
                    <p
                      style={{
                        margin: "0 0 4px 0",
                        fontSize: "13px",
                        color: "#c62828",
                      }}
                    >
                      ⚠️ <strong>Allergies:</strong> {pet.allergies}
                    </p>
                  )}
                  {pet.medications && (
                    <p
                      style={{
                        margin: "0 0 4px 0",
                        fontSize: "13px",
                        color: "#555",
                      }}
                    >
                      💊 <strong>Medications:</strong> {pet.medications}
                    </p>
                  )}
                  {pet.microchip_number && (
                    <p
                      style={{
                        margin: "0 0 4px 0",
                        fontSize: "13px",
                        color: "#888",
                      }}
                    >
                      🔖 <strong>Microchip:</strong> {pet.microchip_number}
                    </p>
                  )}
                  {pet.owner_name && (
                    <p
                      style={{
                        margin: "0 0 4px 0",
                        fontSize: "13px",
                        color: "#555",
                      }}
                    >
                      👤 <strong>Owner:</strong> {pet.owner_name}
                    </p>
                  )}
                  {pet.owner_phone && (
                    <p style={{ margin: "0 0 4px 0", fontSize: "13px" }}>
                      📞 <strong>Phone:</strong>{" "}
                      <a
                        href={`tel:${pet.owner_phone}`}
                        style={{ color: "#2d6a4f", textDecoration: "none" }}
                      >
                        {formatPhone(pet.owner_phone)}
                      </a>
                    </p>
                  )}
                  {pet.owner_email && (
                    <p style={{ margin: "0 0 4px 0", fontSize: "13px" }}>
                      ✉️ <strong>Email:</strong>{" "}
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

              {/* Bottom actions: Delete (subtle, separated from main actions) */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "8px",
                  marginBottom: "2px",
                }}
              >
                <button
                  onClick={() => handleDeletePet(pet.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#c62828",
                    fontSize: "12px",
                    cursor: "pointer",
                    padding: "2px 0",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  🗑️ Delete pet
                </button>
              </div>

              {/* Emergency contacts */}
              <div
                style={{
                  marginTop: "10px",
                  paddingTop: "10px",
                  borderTop: "1px solid #eee",
                }}
              >
                <button
                  onClick={() =>
                    showContactsFor === pet.id
                      ? setShowContactsFor(null)
                      : fetchContactsForPet(pet.id)
                  }
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2d6a4f",
                    fontSize: "13px",
                    cursor: "pointer",
                    padding: 0,
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  🚨 Emergency Contacts
                  <span
                    style={{
                      display: "inline-block",
                      transition: "transform 0.3s ease",
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
                    maxHeight: showContactsFor === pet.id ? "400px" : "0px",
                    opacity: showContactsFor === pet.id ? 1 : 0,
                    transition:
                      showContactsFor === pet.id
                        ? "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease"
                        : "max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease",
                  }}
                >
                  <div style={{ marginTop: "10px" }}>
                    {(contacts[pet.id] || []).map((c) => (
                      <div
                        key={c.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 0",
                          borderBottom: "1px solid #f0f0f0",
                        }}
                      >
                        <div>
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
                              style={{ display: "block", fontSize: "13px" }}
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
                        <button
                          onClick={() => handleDeleteContact(pet.id, c.id)}
                          className="btn-danger"
                          style={{ fontSize: "11px", padding: "3px 8px" }}
                        >
                          Remove
                        </button>
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
                    <div className="contact-grid" style={{ marginTop: "10px" }}>
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
                      <button
                        onClick={() => handleAddContact(pet.id)}
                        className="btn-primary"
                        style={{ padding: "8px 12px" }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
          <p style={{ margin: "0" }}>
            Questions or feedback?{" "}
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
