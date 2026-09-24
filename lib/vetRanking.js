// lib/vetRanking.js
//
// Decides which vets to show someone, and in what order. Used by
// /api/vets/nearby, which both the symptom checker and the home page call —
// so the two can never disagree about what's near you.
//
// The rules, and why:
//
// EMERGENCY → emergency-capable vets, nearest first. Emergency departments
//   take walk-ins at any hour, so this is where location matters most.
//
// SEE_VET → general practices first. Most specialists see patients by referral
//   from a regular vet, not directly — sending someone straight to an
//   ophthalmologist usually means being told to see their own vet first.
//   Matching specialists are returned separately, for a "usually by referral"
//   line, and only when they're within reach.
//
// Birds, reptiles and small mammals are never sent to a dogs-and-cats-only
// hospital.
//
// "Open now" is only ever claimed when the hours parse cleanly. Unreadable
// hours come back as unknown — shown, never hidden, never called open. Getting
// that wrong would send someone to a locked door.

const EMERGENCY_TYPES = ["Emergency", "Urgent Care"];

// How far is useful. A specialist 370 miles away looks authoritative and is no
// help at all, so each kind of result has a ceiling.
const RADIUS = {
  EMERGENCY: 60, // an emergency is worth a longer drive
  GENERAL: 30,
  SPECIALIST: 30,
};

const DOG_CAT = ["dog", "cat", "puppy", "kitten", "canine", "feline"];

// Symptom words → specialty. Matched against the triage differentials, which
// are plain-English condition names like "Eye infection (conjunctivitis)".
const SPECIALTY_KEYWORDS = {
  Ophthalmology: [
    "eye",
    "conjunctiv",
    "cornea",
    "uveitis",
    "glaucoma",
    "cataract",
    "vision",
    "retina",
    "ocular",
  ],
  Dermatology: [
    "skin",
    "derm",
    "itch",
    "rash",
    "allerg",
    "hot spot",
    "otitis",
    "ear infection",
    "mange",
    "hair loss",
    "alopecia",
    "flea",
  ],
  Cardiology: ["heart", "cardiac", "murmur", "arrhythm", "congestive"],
  Neurology: [
    "seizure",
    "neuro",
    "epilep",
    "paralys",
    "spinal",
    "disc",
    "vestibular",
    "head tilt",
    "tremor",
  ],
  Oncology: [
    "tumor",
    "tumour",
    "mass",
    "lump",
    "cancer",
    "lymphoma",
    "neoplas",
  ],
  // No "gastro": an ordinary stomach bug is general-practice territory, and
  // listing internal medicine specialists for it would be noise.
  "Internal Medicine": [
    "kidney",
    "renal",
    "liver",
    "hepat",
    "diabet",
    "thyroid",
    "pancreat",
    "endocrine",
    "chronic",
  ],
  Surgery: [
    "fracture",
    "obstruction",
    "foreign body",
    "cruciate",
    "ligament",
    "bloat",
    "gdv",
    "laceration",
  ],
};

export function isExotic(species) {
  const s = String(species || "").toLowerCase();
  if (!s) return false;
  return !DOG_CAT.some((d) => s.includes(d));
}

export function matchSpecialties(differentials) {
  const text = (differentials || [])
    .map((d) => (typeof d === "string" ? d : d?.name || d?.label || ""))
    .join(" ")
    .toLowerCase();
  const found = new Set();
  for (const [specialty, words] of Object.entries(SPECIALTY_KEYWORDS)) {
    if (words.some((w) => text.includes(w))) found.add(specialty);
  }
  return found;
}

export function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ── Open now ──────────────────────────────────────────────────────────────

const DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
const DAY_ABBR = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// Current day and minute-of-day in California, whatever timezone the server
// runs in. Every vet in the directory is in California.
export function californiaNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const day = DAYS.indexOf(String(get("weekday")).toLowerCase());
  let hour = parseInt(get("hour"), 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(get("minute"), 10);
  return { day, minutes: hour * 60 + minute };
}

// "9:00 am" / "9am" / "12:30 PM" / "noon" → minutes from midnight, or null.
function parseTime(str) {
  const t = String(str).trim().toLowerCase();
  if (t === "noon") return 12 * 60;
  if (t === "midnight") return 0;
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const mer = m[3] ? m[3].replace(/\./g, "") : null;
  if (h > 24 || min > 59) return null;
  if (mer === "pm" && h !== 12) h += 12;
  if (mer === "am" && h === 12) h = 0;
  if (!mer && h > 24) return null;
  return h * 60 + min;
}

// Does this day label cover `day` (0 = Sunday)? Handles "Monday", "Mon",
// "Mon-Fri", "Monday - Friday", "Daily", "Weekdays", "Weekends".
function labelCoversDay(label, day) {
  const l = label.toLowerCase().trim();
  if (/\b(daily|every day|7 days)\b/.test(l)) return true;
  if (/\bweekdays?\b/.test(l)) return day >= 1 && day <= 5;
  if (/\bweekends?\b/.test(l)) return day === 0 || day === 6;

  const idx = (w) => {
    const w3 = w.slice(0, 3);
    return DAY_ABBR.indexOf(w3);
  };
  const range = l.match(/([a-z]{3,9})\s*(?:-|–|—|to|through)\s*([a-z]{3,9})/);
  if (range) {
    const a = idx(range[1]);
    const b = idx(range[2]);
    if (a === -1 || b === -1) return false;
    if (a <= b) return day >= a && day <= b;
    return day >= a || day <= b; // wraps the week, e.g. Sat–Mon
  }
  const single = l.match(/^([a-z]{3,9})/);
  if (single) return idx(single[1]) === day;
  return false;
}

// Is the time inside any of the ranges on this line? Handles several ranges
// ("9am–12pm, 2pm–6pm") and overnight ones ("6pm–2am").
function timeInRanges(rangesText, minutes) {
  const text = rangesText.toLowerCase();
  if (/\bclosed\b/.test(text)) return false;
  if (/24\s*hours?|24\/7|open 24/.test(text)) return true;

  const pieces = text.split(/,|;|&|\band\b/);
  let parsedAny = false;
  for (const piece of pieces) {
    const m = piece.match(/(.+?)\s*(?:-|–|—|to)\s*(.+)/);
    if (!m) continue;
    let open = parseTime(m[1]);
    let close = parseTime(m[2]);
    // "9–5" with no meridiem: read as a working day rather than guessing.
    if (
      open !== null &&
      close !== null &&
      !/[ap]\.?m/.test(piece) &&
      close <= open
    ) {
      close += 12 * 60;
    }
    if (open === null || close === null) continue;
    parsedAny = true;
    if (close > open) {
      if (minutes >= open && minutes < close) return true;
    } else {
      if (minutes >= open || minutes < close) return true;
    }
  }
  return parsedAny ? false : null;
}

// true = open, false = closed, null = the hours couldn't be read reliably.
export function isOpenNow(hours, now = californiaNow()) {
  if (!hours || typeof hours !== "string") return null;
  const text = hours.trim();
  if (!text) return null;

  // Whole-week statements.
  if (
    /^(open\s*)?24\s*(hours|hrs)|24\/7/i.test(text) &&
    !/closed/i.test(text)
  ) {
    return true;
  }

  // Split on newlines, then on a comma that starts a new day label — never
  // inside a range. An earlier version split on any day name, which cut
  // "Mon-Fri: 8am-6pm" into "Mon-" and "Fri: 8am-6pm" and lost the range.
  const lines = text
    .split(/\r?\n/)
    .flatMap((l) =>
      l.split(
        /,\s*(?=[A-Za-z]{3,9}\s*(?:(?:-|–|—|to|through)\s*[A-Za-z]{3,9}\s*)?:)/,
      ),
    )
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const m = line.match(/^([^:]+?)\s*:\s*(.+)$/);
    if (!m) continue;
    if (!labelCoversDay(m[1], now.day)) continue;
    const r = timeInRanges(m[2], now.minutes);
    if (r !== null) return r;
  }
  return null;
}

// ── Ranking ───────────────────────────────────────────────────────────────

function openOrder(v) {
  // Open first, then unknown, then closed — closed vets still show, just last.
  return v.open_now === true ? 0 : v.open_now === null ? 1 : 2;
}

function byOpenThenDistance(a, b) {
  return openOrder(a) - openOrder(b) || a.distance_miles - b.distance_miles;
}

export function rankVets({
  vets,
  lat,
  lng,
  triage,
  differentials,
  species,
  now,
}) {
  const clock = now || californiaNow();
  const exotic = isExotic(species);
  const wanted = matchSpecialties(differentials);

  const enriched = (vets || [])
    .filter(
      (v) => typeof v.latitude === "number" && typeof v.longitude === "number",
    )
    .filter((v) => !(exotic && v.dogs_cats_only))
    .map((v) => {
      const types = v.vet_type || [];
      const specs = v.specialties || [];
      return {
        ...v,
        distance_miles: distanceMiles(lat, lng, v.latitude, v.longitude),
        open_now: isOpenNow(v.hours, clock),
        is_emergency: types.some((t) => EMERGENCY_TYPES.includes(t)),
        treats_exotics: specs.includes("Exotics"),
        matched_specialties: specs.filter((s) => wanted.has(s)),
      };
    });

  const within = (list, miles) => list.filter((v) => v.distance_miles <= miles);

  let primary;
  if (triage === "EMERGENCY") {
    primary = within(
      enriched.filter((v) => v.is_emergency),
      RADIUS.EMERGENCY,
    );
    if (exotic) {
      // An exotics-capable emergency hospital beats a nearer one that may not
      // be able to help a bird or reptile at all.
      primary.sort(
        (a, b) =>
          Number(b.treats_exotics) - Number(a.treats_exotics) ||
          byOpenThenDistance(a, b),
      );
    } else {
      primary.sort(byOpenThenDistance);
    }
  } else {
    // General practice only. Three kinds of vet are left out, because none of
    // them is where you book an ordinary sick visit:
    //   - emergency-only hospitals, which don't take routine appointments
    //   - specialist-only clinics, which see patients by referral — without
    //     this, a dermatology clinic appeared as a "general practice" for an
    //     eye infection
    //   - vaccine-only clinics, which don't examine sick animals
    // A hospital that also offers general practice (SFAMC) still qualifies.
    primary = within(
      enriched.filter((v) => {
        const types = v.vet_type || [];
        const gp = types.includes("General Practice");
        if (gp) return true;
        const specialtyOnly = types.includes("Specialty");
        const vaccineOnly =
          types.length > 0 && types.every((t) => t === "Vaccine Clinic");
        return !v.is_emergency && !specialtyOnly && !vaccineOnly;
      }),
      RADIUS.GENERAL,
    );
    if (exotic) {
      primary.sort(
        (a, b) =>
          Number(b.treats_exotics) - Number(a.treats_exotics) ||
          byOpenThenDistance(a, b),
      );
    } else {
      primary.sort(byOpenThenDistance);
    }
  }

  let specialists = [];
  if (triage === "SEE_VET" && wanted.size > 0) {
    const primaryIds = new Set(primary.slice(0, 3).map((v) => v.id));
    specialists = within(
      enriched.filter(
        (v) => v.matched_specialties.length > 0 && !primaryIds.has(v.id),
      ),
      RADIUS.SPECIALIST,
    ).sort((a, b) => a.distance_miles - b.distance_miles);
  }

  const shape = (v) => ({
    id: v.id,
    slug: v.slug,
    name: v.name,
    phone: v.phone,
    address: v.address,
    city: v.city,
    distance_miles: Math.round(v.distance_miles * 10) / 10,
    open_now: v.open_now,
    is_emergency: v.is_emergency,
    treats_exotics: v.treats_exotics,
    matched_specialties: v.matched_specialties,
    accepting_new_patients: v.accepting_new_patients,
    carecredit: v.carecredit,
  });

  return {
    primary: primary.slice(0, 3).map(shape),
    specialists: specialists.slice(0, 3).map(shape),
    covered: primary.length > 0,
    matched_specialties: [...wanted],
  };
}
