"use client";
import { useEffect } from "react";

function cleanHash() {
  const hash = window.location.hash;
  // Strip bare # or # left after Supabase processes OAuth tokens
  if (
    !hash ||
    hash === "#" ||
    hash === "#/" ||
    !hash.includes("access_token")
  ) {
    if (hash) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
    }
  }
}

export default function HashCleaner() {
  useEffect(() => {
    // Run on mount (catches bare # on page load)
    cleanHash();
    // Also run after Supabase processes the token and leaves a bare #
    window.addEventListener("hashchange", cleanHash);
    return () => window.removeEventListener("hashchange", cleanHash);
  }, []);
  return null;
}
