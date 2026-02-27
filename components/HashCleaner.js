"use client";
import { useEffect } from "react";

export default function HashCleaner() {
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
    }
  }, []);
  return null;
}
