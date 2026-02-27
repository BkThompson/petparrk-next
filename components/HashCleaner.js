"use client";
import { useEffect } from "react";

export default function HashCleaner() {
  useEffect(() => {
    const hash = window.location.hash;
    // Only strip a bare # with nothing after it (left by OAuth redirect)
    // Never strip if it contains actual token data Supabase needs
    if (hash === "#" || hash === "#/") {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
    }
  }, []);
  return null;
}
