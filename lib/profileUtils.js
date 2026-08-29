/* ════════════════════════════════════════════════════════════════════════
   profileUtils — pure helpers shared by ProfileMain and ProfileUsername.

   These close over nothing: no component state, no refs, no Supabase
   client. Anything they need is passed in (e.g. prepareImageFile takes a
   setConverting callback). They were byte-identical in both pages.
   ════════════════════════════════════════════════════════════════════════ */

export function formatJoinDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function formatPhone(phone) {
  if (!phone) return null;
  const d = phone.replace(/\D/g, "");
  if (d.length === 10)
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
}

export function handlePhoneInput(raw) {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export async function prepareImageFile(file, setConverting) {
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

export function relativeTimeShort(iso) {
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

export function triageLabel(result) {
  if (result === "EMERGENCY")
    return { dot: "#C94040", text: "#A62F2F", short: "Emergency" };
  if (result === "SEE_VET")
    return { dot: "#EFC88B", text: "#8A6420", short: "See vet soon" };
  if (result === "MONITOR")
    return { dot: "#1A6641", text: "#155534", short: "Monitor at home" };
  return { dot: "#888", text: "#4B5563", short: result || "—" };
}
