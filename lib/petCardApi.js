// lib/petCardApi.js
//
// Pet Card API — wraps all Supabase queries for the Pet Card system.
//
// Two surfaces:
// 1) Owner-side functions (require auth, used by editor UI)
// 2) Public-share functions (read-only, used by /care and /hero share URLs)
//
// All functions return a consistent shape:
//   Success: { data, error: null }
//   Failure: { data: null, error }
//
// This file does NOT throw. Callers should check `error` to handle failures.
//
// Storage bucket: 'pets' (existing, used by profile page)
// Photo path pattern: `${ownerId}/${petId}.${ext}` (matches profile pattern)

import { supabase } from "./supabase";

// =============================================================
// CONSTANTS
// =============================================================

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB — matches profile page
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png"];
export const ACCEPTED_PHOTO_EXTENSIONS_INPUT =
  "image/jpeg,image/png,image/heic,image/heif,.heic,.heif";

export const VALID_IDENTITY_TAGS = [
  "champion",
  "service_therapy",
  "emotional_support",
  "rescue",
  "adventurer",
  "royalty",
  "working",
  "birthday",
  "forever_loved",
  "young",
  "senior",
  "special_needs",
  "foodie",
  "bff_pair",
];

export const VALID_CARD_TYPES = ["care", "hero"];

// Token length for share URLs (nanoid-like; ~12 chars is plenty unguessable)
const SHARE_TOKEN_LENGTH = 12;
const TOKEN_ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// =============================================================
// UTILITIES
// =============================================================

function generateShareToken(length = SHARE_TOKEN_LENGTH) {
  // Crypto-strong random token. Browser environment.
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += TOKEN_ALPHABET[arr[i] % TOKEN_ALPHABET.length];
  }
  return out;
}

// Sanitize identity tag values: only allow known tag slugs
function sanitizeIdentityTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.filter((t) => VALID_IDENTITY_TAGS.includes(t));
}

// HEIC → JPG conversion, matches profile page exactly (5MB cap, JPG/PNG only result)
// Returns: { file: File | null, error: string | null }
export async function prepareImageFile(raw, onConvertStart, onConvertEnd) {
  if (
    raw.type === "image/heic" ||
    raw.type === "image/heif" ||
    raw.name.toLowerCase().endsWith(".heic") ||
    raw.name.toLowerCase().endsWith(".heif")
  ) {
    if (onConvertStart) onConvertStart(true);
    try {
      const heic2any = (await import("heic2any")).default;
      const blob = await heic2any({
        blob: raw,
        toType: "image/jpeg",
        quality: 0.92,
      });
      const converted = new File(
        [blob],
        raw.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg"),
        { type: "image/jpeg" },
      );
      if (onConvertEnd) onConvertEnd(false);
      if (converted.size > MAX_PHOTO_BYTES) {
        return { file: null, error: "Photo must be under 5MB." };
      }
      return { file: converted, error: null };
    } catch {
      if (onConvertEnd) onConvertEnd(false);
      return {
        file: null,
        error: "Could not convert HEIC file. Please try JPG or PNG.",
      };
    }
  }
  if (!ACCEPTED_PHOTO_TYPES.includes(raw.type)) {
    return { file: null, error: "Please use JPG or PNG." };
  }
  if (raw.size > MAX_PHOTO_BYTES) {
    return { file: null, error: "Photo must be under 5MB." };
  }
  return { file: raw, error: null };
}

// =============================================================
// OWNER-SIDE: PET CRUD
// =============================================================

// Get all pets for the current authenticated user.
// Used by /pet-card landing/picker page.
export async function getOwnerPets() {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user)
    return { data: null, error: userErr || new Error("Not signed in") };

  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return { data, error };
}

// Get one pet by slug, only if owned by the current user.
// Used by /pet-card/[slug] editor.
export async function getOwnerPetBySlug(slug) {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user)
    return { data: null, error: userErr || new Error("Not signed in") };

  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .eq("slug", slug)
    .eq("owner_id", user.id)
    .single();

  return { data, error };
}

// Update pet fields. Validates identity_tags. Triggers updated_at.
// Normalize a user-entered slug to URL-safe form.
// Lowercase, alphanumeric + hyphens only, max 40 chars, no leading/trailing hyphens.
export function normalizeSlug(input) {
  if (!input) return "";
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// Validate slug format. Returns error message or null.
export function validateSlug(slug) {
  if (!slug || slug.trim().length === 0) {
    return "URL is required.";
  }
  const normalized = normalizeSlug(slug);
  if (normalized.length < 3) {
    return "URL must be at least 3 characters.";
  }
  if (normalized.length > 40) {
    return "URL is too long (max 40 characters).";
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(normalized)) {
    return "URL can only contain letters, numbers, and hyphens.";
  }
  // Reserve some routes that would clash with app routes
  const reserved = ["new", "edit", "create", "delete", "api", "admin"];
  if (reserved.includes(normalized)) {
    return "That URL is reserved.";
  }
  return null;
}

// Check if a slug is available. Returns { available, error }.
// Used to validate slug uniqueness before saving.
// excludePetId allows ignoring the current pet (so user can save own pet without "taken").
export async function checkSlugAvailable(slug, excludePetId = null) {
  const normalized = normalizeSlug(slug);
  if (!normalized) return { available: false, error: null };

  let query = supabase
    .from("pets")
    .select("id")
    .eq("slug", normalized)
    .limit(1);

  if (excludePetId) {
    query = query.neq("id", excludePetId);
  }

  const { data, error } = await query;
  if (error) return { available: false, error };
  return { available: !data || data.length === 0, error: null };
}

export async function updatePet(petId, fields) {
  // Defensive: only allow known scalar fields + arrays
  const payload = { ...fields };

  // Sanitize identity tags if present
  if ("identity_tags" in payload) {
    payload.identity_tags = sanitizeIdentityTags(payload.identity_tags);
  }

  // Coerce array fields (browser forms sometimes pass strings)
  const arrayFields = [
    "personality_traits",
    "loves",
    "competitions_won",
    "titles_earned",
    "favorite_trails",
    "places_visited",
    "favorite_foods",
  ];
  for (const f of arrayFields) {
    if (f in payload && payload[f] != null && !Array.isArray(payload[f])) {
      payload[f] = String(payload[f])
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  const { data, error } = await supabase
    .from("pets")
    .update(payload)
    .eq("id", petId)
    .select()
    .single();

  return { data, error };
}

// Upload a pet photo. Returns { url, error }.
// Matches profile page pattern: `${ownerId}/${petId}.${ext}` in 'pets' bucket.
// Accepts a File that has already passed prepareImageFile().
export async function uploadPetPhoto(petId, file) {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user)
    return { url: null, error: userErr || new Error("Not signed in") };

  const ext = file.name.split(".").pop().toLowerCase();
  const filePath = `${user.id}/${petId}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("pets")
    .upload(filePath, file, { upsert: true });
  if (uploadErr) return { url: null, error: uploadErr };

  const {
    data: { publicUrl },
  } = supabase.storage.from("pets").getPublicUrl(filePath);
  const urlWithCache = `${publicUrl}?t=${Date.now()}`;

  // Save photo_url to pet record
  const { error: updateErr } = await supabase
    .from("pets")
    .update({ photo_url: urlWithCache })
    .eq("id", petId);
  if (updateErr) return { url: null, error: updateErr };

  return { url: urlWithCache, error: null };
}

// ============================================================================
// HERO PHOTO GALLERY — up to 5 hero photos per pet
// ============================================================================
// Mirrors uploadPetPhoto rules (same 'pets' bucket, prepareImageFile validation,
// 5MB cap, HEIC convert). Files stored at `${user.id}/${petId}_hero_${slot}.${ext}`.

export const MAX_HERO_PHOTOS = 5;

// Upload one hero photo into the next free slot (or a given slot). Returns the
// updated { photos, index } so the caller can sync state. `file` must already
// have passed prepareImageFile().
export async function uploadHeroPhoto(
  petId,
  file,
  existingPhotos = [],
  slot = null,
) {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user)
    return {
      photos: null,
      index: null,
      error: userErr || new Error("Not signed in"),
    };

  const photos = Array.isArray(existingPhotos) ? [...existingPhotos] : [];
  if (slot == null) {
    if (photos.length >= MAX_HERO_PHOTOS) {
      return {
        photos: null,
        index: null,
        error: new Error(`You can store up to ${MAX_HERO_PHOTOS} photos.`),
      };
    }
    slot = photos.length;
  }

  const ext = file.name.split(".").pop().toLowerCase();
  const filePath = `${user.id}/${petId}_hero_${slot}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("pets")
    .upload(filePath, file, { upsert: true });
  if (uploadErr) return { photos: null, index: null, error: uploadErr };

  const {
    data: { publicUrl },
  } = supabase.storage.from("pets").getPublicUrl(filePath);
  const urlWithCache = `${publicUrl}?t=${Date.now()}`;

  if (slot < photos.length) photos[slot] = urlWithCache;
  else photos.push(urlWithCache);

  // Persist the gallery; make the newly-uploaded one active.
  const index = slot;
  const { error: updateErr } = await supabase
    .from("pets")
    .update({
      hero_photos: photos,
      hero_photo_index: index,
      photo_url: urlWithCache,
    })
    .eq("id", petId);
  if (updateErr) return { photos: null, index: null, error: updateErr };

  return { photos, index, error: null };
}

// Choose which stored photo is the active hero image.
export async function selectHeroPhoto(petId, photos, index) {
  const active = photos[index];
  const { error } = await supabase
    .from("pets")
    .update({ hero_photo_index: index, photo_url: active })
    .eq("id", petId);
  return { error };
}

// Remove a hero photo (and re-point the active index safely).
export async function deleteHeroPhoto(petId, photos, removeIndex, activeIndex) {
  const next = photos.filter((_, i) => i !== removeIndex);
  let nextActive = activeIndex;
  if (removeIndex === activeIndex) nextActive = 0;
  else if (removeIndex < activeIndex) nextActive = activeIndex - 1;
  nextActive = Math.max(0, Math.min(nextActive, next.length - 1));
  const activeUrl = next[nextActive] || null;

  const { error } = await supabase
    .from("pets")
    .update({
      hero_photos: next,
      hero_photo_index: next.length ? nextActive : 0,
      photo_url: activeUrl,
    })
    .eq("id", petId);
  return { photos: next, index: nextActive, error };
}

// =============================================================
// OWNER-SIDE: RELATED RECORDS (vaccinations, medications, etc.)
// =============================================================

// All four follow the same CRUD pattern. RLS makes them owner-only automatically.

// VACCINATIONS
export async function getPetVaccinations(petId) {
  const { data, error } = await supabase
    .from("pet_vaccinations")
    .select("*")
    .eq("pet_id", petId)
    .order("date_administered", { ascending: false });
  return { data, error };
}

export async function addVaccination(petId, fields) {
  const { data, error } = await supabase
    .from("pet_vaccinations")
    .insert({ pet_id: petId, ...fields })
    .select()
    .single();
  return { data, error };
}

export async function updateVaccination(vaccinationId, fields) {
  const { data, error } = await supabase
    .from("pet_vaccinations")
    .update(fields)
    .eq("id", vaccinationId)
    .select()
    .single();
  return { data, error };
}

export async function deleteVaccination(vaccinationId) {
  const { error } = await supabase
    .from("pet_vaccinations")
    .delete()
    .eq("id", vaccinationId);
  return { data: null, error };
}

// MEDICATIONS
export async function getPetMedications(petId) {
  const { data, error } = await supabase
    .from("pet_medications")
    .select("*")
    .eq("pet_id", petId)
    .order("started_date", { ascending: false });
  return { data, error };
}

export async function addMedication(petId, fields) {
  const { data, error } = await supabase
    .from("pet_medications")
    .insert({ pet_id: petId, ...fields })
    .select()
    .single();
  return { data, error };
}

export async function updateMedication(medicationId, fields) {
  const { data, error } = await supabase
    .from("pet_medications")
    .update(fields)
    .eq("id", medicationId)
    .select()
    .single();
  return { data, error };
}

export async function deleteMedication(medicationId) {
  const { error } = await supabase
    .from("pet_medications")
    .delete()
    .eq("id", medicationId);
  return { data: null, error };
}

// VET VISITS
export async function getPetVetVisits(petId) {
  const { data, error } = await supabase
    .from("pet_vet_visits")
    .select("*")
    .eq("pet_id", petId)
    .order("visit_date", { ascending: false });
  return { data, error };
}

export async function addVetVisit(petId, fields) {
  const { data, error } = await supabase
    .from("pet_vet_visits")
    .insert({ pet_id: petId, ...fields })
    .select()
    .single();
  return { data, error };
}

export async function updateVetVisit(visitId, fields) {
  const { data, error } = await supabase
    .from("pet_vet_visits")
    .update(fields)
    .eq("id", visitId)
    .select()
    .single();
  return { data, error };
}

export async function deleteVetVisit(visitId) {
  const { error } = await supabase
    .from("pet_vet_visits")
    .delete()
    .eq("id", visitId);
  return { data: null, error };
}

// EMERGENCY CONTACTS (uses pre-existing pet_emergency_contacts table)
export async function getPetEmergencyContacts(petId) {
  const { data, error } = await supabase
    .from("pet_emergency_contacts")
    .select("*")
    .eq("pet_id", petId)
    .order("created_at", { ascending: false });
  return { data, error };
}

export async function addEmergencyContact(petId, fields) {
  const { data, error } = await supabase
    .from("pet_emergency_contacts")
    .insert({ pet_id: petId, ...fields })
    .select()
    .single();
  return { data, error };
}

export async function updateEmergencyContact(contactId, fields) {
  const { data, error } = await supabase
    .from("pet_emergency_contacts")
    .update(fields)
    .eq("id", contactId)
    .select()
    .single();
  return { data, error };
}

export async function deleteEmergencyContact(contactId) {
  const { error } = await supabase
    .from("pet_emergency_contacts")
    .delete()
    .eq("id", contactId);
  return { data: null, error };
}

// SPECIALISTS (cardiologist, dermatologist, etc.)
export async function getPetSpecialists(petId) {
  const { data, error } = await supabase
    .from("pet_specialists")
    .select("*")
    .eq("pet_id", petId)
    .order("created_at", { ascending: true });
  return { data, error };
}

export async function addSpecialist(petId, fields) {
  const { data, error } = await supabase
    .from("pet_specialists")
    .insert({ pet_id: petId, ...fields })
    .select()
    .single();
  return { data, error };
}

export async function updateSpecialist(specialistId, fields) {
  const { data, error } = await supabase
    .from("pet_specialists")
    .update(fields)
    .eq("id", specialistId)
    .select()
    .single();
  return { data, error };
}

export async function deleteSpecialist(specialistId) {
  const { error } = await supabase
    .from("pet_specialists")
    .delete()
    .eq("id", specialistId);
  return { data: null, error };
}

// =============================================================
// SHARE TOKEN MANAGEMENT
// =============================================================

// Get the active share token for a given pet + card type.
// Returns null if no active token exists (owner needs to create one).
export async function getActiveShareToken(petId, cardType) {
  if (!VALID_CARD_TYPES.includes(cardType)) {
    return { data: null, error: new Error("Invalid card_type") };
  }
  const { data, error } = await supabase
    .from("pet_share_tokens")
    .select("*")
    .eq("pet_id", petId)
    .eq("card_type", cardType)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data, error };
}

// Create a new share token (revokes any existing active one for this pet+type).
// Returns the new token row for building share URLs.
// `expiresInDays` is optional: pass null/undefined for "never expires" (default),
// or a positive integer for a token that auto-expires after N days.
export async function createShareToken(petId, cardType, expiresInDays = null) {
  if (!VALID_CARD_TYPES.includes(cardType)) {
    return { data: null, error: new Error("Invalid card_type") };
  }

  // Step 1: revoke any existing active token for this pet+type. The DB
  // trigger logs this as a "revoked" event automatically.
  await supabase
    .from("pet_share_tokens")
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq("pet_id", petId)
    .eq("card_type", cardType)
    .eq("is_active", true);

  // Step 2: insert a new active token. If the caller passed an expiration
  // window, compute the absolute timestamp here so the DB doesn't have to.
  let expires_at = null;
  if (Number.isInteger(expiresInDays) && expiresInDays > 0) {
    const dt = new Date();
    dt.setDate(dt.getDate() + expiresInDays);
    expires_at = dt.toISOString();
  }

  const newToken = generateShareToken();
  const { data, error } = await supabase
    .from("pet_share_tokens")
    .insert({
      pet_id: petId,
      card_type: cardType,
      token: newToken,
      is_active: true,
      expires_at,
    })
    .select()
    .single();

  return { data, error };
}

// Revoke (deactivate) all active tokens for a pet+card_type.
// Owner clicks "Stop sharing" → existing URLs immediately 404.
export async function revokeShareTokens(petId, cardType) {
  if (!VALID_CARD_TYPES.includes(cardType)) {
    return { data: null, error: new Error("Invalid card_type") };
  }
  const { error } = await supabase
    .from("pet_share_tokens")
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq("pet_id", petId)
    .eq("card_type", cardType)
    .eq("is_active", true);
  return { data: null, error };
}

// Toggle the master share_enabled flag on the pet.
// false = ALL share URLs for this pet stop working (instant kill switch).
export async function setShareEnabled(petId, enabled) {
  const { data, error } = await supabase
    .from("pets")
    .update({ share_enabled: !!enabled })
    .eq("id", petId)
    .select("id, share_enabled")
    .single();
  return { data, error };
}

// List (or unlist) a pet's published Hero Card on the owner's public profile.
// Same shape as setShareEnabled. This flag is separate from share_enabled and
// from hero_is_published: publishing means "the card is finished", a token means
// "here is a link", and show_on_profile means "list me in the public directory".
// The public loader (get_public_hero_cards) requires all three to be true.
export async function setShowOnProfile(petId, value) {
  const { data, error } = await supabase
    .from("pets")
    .update({ show_on_profile: !!value })
    .eq("id", petId)
    .select("id, show_on_profile")
    .single();
  return { data, error };
}

// =============================================================
// VIEW COUNTS (owner-side)
// =============================================================

// Get total view count for a pet's share cards (last 30 days + lifetime).
// Owner-only via RLS.
export async function getCardViewStats(petId) {
  const { data, error } = await supabase
    .from("pet_card_views")
    .select("card_type, view_date, view_count")
    .eq("pet_id", petId);

  if (error) return { data: null, error };

  // Aggregate by card_type
  const stats = {
    care: { total: 0, last30Days: 0 },
    hero: { total: 0, last30Days: 0 },
  };
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  for (const row of data || []) {
    if (!stats[row.card_type]) continue;
    stats[row.card_type].total += row.view_count;
    if (new Date(row.view_date) >= cutoff) {
      stats[row.card_type].last30Days += row.view_count;
    }
  }

  return { data: stats, error: null };
}

// =============================================================
// PUBLIC-SHARE: anonymous read access via SECURITY DEFINER functions
// =============================================================

// Fetch a pet's data for a public Care or Hero card view.
// Each card type has its own DB function that returns only the columns
// safe for that card — Hero never sees insurance/microchip/medical data
// even if its token is leaked. Critical for PII isolation.
//
// Anyone with the token can call these. Returns null if token invalid,
// expired, revoked, or share_enabled is false.

export async function getSharedPetForCare(token) {
  const { data, error } = await supabase.rpc("get_pet_for_care_token", {
    p_token: token,
  });
  if (error) return { data: null, error };
  return { data: data && data.length ? data[0] : null, error: null };
}

export async function getSharedPetForHero(token) {
  const { data, error } = await supabase.rpc("get_pet_for_hero_token", {
    p_token: token,
  });
  if (error) return { data: null, error };
  return { data: data && data.length ? data[0] : null, error: null };
}

// Published Hero Cards an owner chose to LIST on their public profile.
//
// Unlike the two functions above, this takes no token. A token is a CAPABILITY —
// possession of an unguessable URL is the authorization. A profile grid is a
// DIRECTORY, so the authorization is a set of flags the owner set deliberately:
// profiles.is_public AND hero_is_published AND share_enabled AND show_on_profile.
//
// get_public_hero_cards is SECURITY DEFINER with a fixed, flattened column list.
// It returns slug, name, photo_url, breed, species, nickname, hero_rarity and
// hero_bg_color — and nothing else. Medical and PII columns are absent from its
// return type rather than filtered out of it, so a new key in the hero_published
// snapshot cannot leak here the way it would through a `jsonb` return.
//
// Callable by anyone, including anonymous visitors. Returns [] for a private
// profile, an unknown username, or an owner who has listed nothing.
export async function getPublicHeroCards(username) {
  if (!username) return { data: [], error: null };
  const { data, error } = await supabase.rpc("get_public_hero_cards", {
    p_username: username,
  });
  if (error) return { data: [], error };
  return { data: data || [], error: null };
}

// One full published Hero Card for a public profile visitor — no login, no
// token. The display companion to getPublicHeroCards (which returns the grid).
// Keyed on username + slug so a card only resolves if it belongs to the profile
// being viewed. Same four-flag gate and column contract as the token function;
// medical/PII columns are absent from the return type. Returns null when the
// card isn't listed, the profile is private, or the slug/username don't match.
export async function getPublicHeroCardBySlug(username, slug) {
  if (!username || !slug) return { data: null, error: null };
  const { data, error } = await supabase.rpc("get_public_hero_card_by_slug", {
    p_username: username,
    p_slug: slug,
  });
  if (error) return { data: null, error };
  return { data: data && data.length ? data[0] : null, error: null };
}

// Backward-compatible dispatcher. New code should use the type-specific
// functions above directly so the column shape is statically clear.
export async function getSharedPet(token, cardType) {
  if (cardType === "care") return getSharedPetForCare(token);
  if (cardType === "hero") return getSharedPetForHero(token);
  return { data: null, error: new Error("Invalid card_type") };
}

// Fetch Care Card medical data (vaccinations, medications, weight, visits).
// Token must be 'care' and active.
// Returns: { data: { vaccinations: [], medications: [], weight_history: [], vet_visits: [] } }
export async function getSharedCareMedical(token) {
  const { data, error } = await supabase.rpc("get_pet_medical_by_share_token", {
    p_token: token,
  });
  return { data, error };
}

// Record a card view (privacy-respecting; just bumps daily count).
// Call this once per page load on the public share URL.
export async function recordCardView(token, cardType) {
  if (!VALID_CARD_TYPES.includes(cardType)) {
    return { data: null, error: new Error("Invalid card_type") };
  }
  const { error } = await supabase.rpc("record_pet_card_view", {
    p_token: token,
    p_card_type: cardType,
  });
  return { data: null, error };
}

// Fetch the audit log of share-token events (created / revoked) for a pet.
// Owner-only via RLS. Used in the Share section to surface "Recent activity".
// Returns events in reverse chronological order.
export async function getShareTokenEvents(petId, limit = 20) {
  const { data, error } = await supabase
    .from("pet_share_token_events")
    .select("id, card_type, event_type, occurred_at")
    .eq("pet_id", petId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  return { data: data || [], error };
}

// =============================================================
// HELPERS (computed/derived)
// =============================================================

// Calculate age from birthday. Returns null if birthday missing.
// Returns { years, months, displayText } for flexible display.
export function calculateAge(birthdayString) {
  if (!birthdayString) return null;
  const birth = new Date(birthdayString);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  let displayText;
  if (years === 0 && months === 0) displayText = "Less than a month";
  else if (years === 0)
    displayText = `${months} month${months !== 1 ? "s" : ""}`;
  else if (months === 0) displayText = `${years} year${years !== 1 ? "s" : ""}`;
  else
    displayText = `${years} year${years !== 1 ? "s" : ""}, ${months} month${months !== 1 ? "s" : ""}`;
  return { years, months, displayText };
}

// Get the next-due vaccination, if any. Used for "alerts" sections on Care Card.
// Returns { vaccine, dueDate, isOverdue } or null.
export function getNextDueVaccination(vaccinations) {
  if (!vaccinations || !vaccinations.length) return null;
  const today = new Date();
  let earliest = null;
  for (const v of vaccinations) {
    if (!v.next_due) continue;
    const due = new Date(v.next_due);
    if (!earliest || due < earliest.due) {
      earliest = { vaccine: v.vaccine_type, due, isOverdue: due < today };
    }
  }
  if (!earliest) return null;
  return {
    vaccine: earliest.vaccine,
    dueDate: earliest.due.toISOString().slice(0, 10),
    isOverdue: earliest.isOverdue,
  };
}

// Build a share URL for a pet card.
// usage: buildShareUrl(pet.slug, 'care', token) -> /pet-card/cooper-thompson/care/abc123
export function buildShareUrl(slug, cardType, token, origin = "") {
  if (!slug || !cardType || !token) return "";
  return `${origin}/pet-card/${slug}/${cardType}/${token}`;
}

// Build the owner editor URL.
// usage: buildEditorUrl(pet.slug) -> /pet-card/cooper-thompson
export function buildEditorUrl(slug, origin = "") {
  if (!slug) return "";
  return `${origin}/pet-card/${slug}`;
}

// ===========================================================================
// CARE ENTRIES — feeding, walk, weight history (Build 5c)
// ===========================================================================
// Unified table pet_care_entries with entry_type discriminator.
// Each type uses a subset of columns; the API exposes typed CRUD helpers
// so callers don't deal with the discriminator directly.

// --- FEEDING ---------------------------------------------------------------

export async function getPetFeedings(petId) {
  if (!petId) return { data: null, error: new Error("petId is required") };
  const { data, error } = await supabase
    .from("pet_care_entries")
    .select("*")
    .eq("pet_id", petId)
    .eq("entry_type", "feeding")
    .order("time_of_day", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  return { data, error };
}

export async function addFeeding(petId, fields) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Not authenticated") };

  const payload = {
    pet_id: petId,
    user_id: user.id,
    entry_type: "feeding",
    name: fields.name?.trim() || null,
    time_of_day: fields.time_of_day || null,
    frequency: fields.frequency || "daily",
    days_of_week: fields.days_of_week || null,
    recurrence_interval: fields.recurrence_interval || "weekly",
    is_paused: !!fields.is_paused,
    food: fields.food?.trim() || null,
    amount: fields.amount?.trim() || null,
    notes: fields.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from("pet_care_entries")
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

export async function updateFeeding(entryId, fields) {
  const payload = {
    name: fields.name?.trim() || null,
    time_of_day: fields.time_of_day || null,
    frequency: fields.frequency || "daily",
    days_of_week: fields.days_of_week || null,
    recurrence_interval: fields.recurrence_interval || "weekly",
    is_paused: !!fields.is_paused,
    food: fields.food?.trim() || null,
    amount: fields.amount?.trim() || null,
    notes: fields.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from("pet_care_entries")
    .update(payload)
    .eq("id", entryId)
    .select()
    .single();
  return { data, error };
}

export async function deleteFeeding(entryId) {
  const { error } = await supabase
    .from("pet_care_entries")
    .delete()
    .eq("id", entryId);
  return { error };
}

// --- WALK ------------------------------------------------------------------

export async function getPetWalks(petId) {
  if (!petId) return { data: null, error: new Error("petId is required") };
  const { data, error } = await supabase
    .from("pet_care_entries")
    .select("*")
    .eq("pet_id", petId)
    .eq("entry_type", "walk")
    .order("time_of_day", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  return { data, error };
}

export async function addWalk(petId, fields) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Not authenticated") };

  const payload = {
    pet_id: petId,
    user_id: user.id,
    entry_type: "walk",
    name: fields.name?.trim() || null,
    time_of_day: fields.time_of_day || null,
    frequency: fields.frequency || "daily",
    days_of_week: fields.days_of_week || null,
    recurrence_interval: fields.recurrence_interval || "weekly",
    is_paused: !!fields.is_paused,
    duration: fields.duration?.trim() || null,
    notes: fields.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from("pet_care_entries")
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

export async function updateWalk(entryId, fields) {
  const payload = {
    name: fields.name?.trim() || null,
    time_of_day: fields.time_of_day || null,
    frequency: fields.frequency || "daily",
    days_of_week: fields.days_of_week || null,
    recurrence_interval: fields.recurrence_interval || "weekly",
    is_paused: !!fields.is_paused,
    duration: fields.duration?.trim() || null,
    notes: fields.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from("pet_care_entries")
    .update(payload)
    .eq("id", entryId)
    .select()
    .single();
  return { data, error };
}

export async function deleteWalk(entryId) {
  const { error } = await supabase
    .from("pet_care_entries")
    .delete()
    .eq("id", entryId);
  return { error };
}

// --- WEIGHT ----------------------------------------------------------------

export async function getPetWeightHistory(petId) {
  if (!petId) return { data: null, error: new Error("petId is required") };
  const { data, error } = await supabase
    .from("pet_care_entries")
    .select("*")
    .eq("pet_id", petId)
    .eq("entry_type", "weight")
    .order("date", { ascending: true });
  return { data, error };
}

export async function addWeightEntry(petId, fields) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Not authenticated") };

  const payload = {
    pet_id: petId,
    user_id: user.id,
    entry_type: "weight",
    date: fields.date || null,
    weight_value:
      fields.weight_value != null ? Number(fields.weight_value) : null,
    notes: fields.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from("pet_care_entries")
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

export async function updateWeightEntry(entryId, fields) {
  const payload = {
    date: fields.date || null,
    weight_value:
      fields.weight_value != null ? Number(fields.weight_value) : null,
    notes: fields.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from("pet_care_entries")
    .update(payload)
    .eq("id", entryId)
    .select()
    .single();
  return { data, error };
}

export async function deleteWeightEntry(entryId) {
  const { error } = await supabase
    .from("pet_care_entries")
    .delete()
    .eq("id", entryId);
  return { error };
}

// --- Helpers --------------------------------------------------------------

// Format time_of_day (HH:MM:SS) for display: "7:00 AM"
export function formatTimeOfDay(time) {
  if (!time) return null;
  const parts = time.split(":");
  if (parts.length < 2) return time;
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(h)) return time;
  const period = h >= 12 ? "pm" : "am";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m}${period}`;
}

// Convert weight between units. value is a number; returns a number.
export function convertWeight(value, fromUnit, toUnit) {
  if (value == null || isNaN(value)) return value;
  if (fromUnit === toUnit) return value;
  if (fromUnit === "lbs" && toUnit === "kg") return value * 0.453592;
  if (fromUnit === "kg" && toUnit === "lbs") return value * 2.20462;
  return value;
}

// Format frequency for display
export function formatFrequency(freq) {
  switch (freq) {
    case "daily":
      return "Daily";
    case "weekdays":
      return "Weekdays";
    case "weekends":
      return "Weekends";
    case "as_needed":
      return "As needed";
    case "custom":
      return "Custom";
    default:
      return "Daily";
  }
}

// Day-of-week helpers for custom scheduling
export const DAYS_OF_WEEK = [
  { key: "mon", short: "M", label: "Mon" },
  { key: "tue", short: "T", label: "Tue" },
  { key: "wed", short: "W", label: "Wed" },
  { key: "thu", short: "T", label: "Thu" },
  { key: "fri", short: "F", label: "Fri" },
  { key: "sat", short: "S", label: "Sat" },
  { key: "sun", short: "S", label: "Sun" },
];

// Format recurrence interval for display
export function formatRecurrence(interval) {
  switch (interval) {
    case "weekly":
      return "Every week";
    case "biweekly":
      return "Every other week";
    case "monthly":
      return "Monthly";
    default:
      return "Every week";
  }
}

// Format days_of_week array as readable string: "Mon, Wed, Fri"
export function formatDaysOfWeek(days) {
  if (!Array.isArray(days) || days.length === 0) return null;
  const order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const sorted = days
    .slice()
    .sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const labels = sorted.map((d) => {
    const found = DAYS_OF_WEEK.find((x) => x.key === d);
    return found ? found.label : d;
  });
  return labels.join(", ");
}

// Convert weight between units. Always pure math; rounding/snap-to-int
// handled by callers.
export function convertWeightTo(value, targetUnit) {
  if (value == null || isNaN(value)) return value;
  // Storage is always lbs; convert to target.
  if (targetUnit === "lbs") return value;
  if (targetUnit === "kg") return value * 0.453592;
  return value;
}

// Convert weight FROM displayed unit TO lbs (canonical storage).
export function convertWeightFromDisplay(value, fromUnit) {
  if (value == null || isNaN(value)) return value;
  if (fromUnit === "lbs") return value;
  if (fromUnit === "kg") return value * 2.20462;
  return value;
}

// Smart-round for display: snap to integer if within 0.15
export function roundForDisplay(value) {
  if (value == null || isNaN(value)) return value;
  const asInt = Math.round(value);
  if (Math.abs(value - asInt) < 0.15) return asInt;
  return Math.round(value * 10) / 10;
}
