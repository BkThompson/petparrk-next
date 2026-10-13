// Small accessibility helpers.
import { useEffect, useRef } from "react";

// Keyboard activation for elements that act like buttons but can't be a
// <button> (they wrap block content, or are styled as cards). Enter and Space
// do the same as a click. Pair with role="button" and tabIndex={0}.
export function onActivate(fn) {
  return (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn(e);
    }
  };
}

// Standard keyboard behaviour for a pop-up dialog. Returns a ref for the
// dialog box (give it role="dialog" aria-modal="true" and a name).
//   - focus moves into the dialog when it opens (first control, else the box)
//   - Tab and Shift+Tab stay inside it
//   - Escape closes it (pass { escape: false } if the dialog handles Escape)
//   - focus returns to whatever opened it when it closes
export function useDialog(open, onClose, { escape = true } = {}) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    const box = ref.current;
    const focusables = () =>
      box
        ? [...box.querySelectorAll(FOCUSABLE)].filter(
            (el) => el.offsetParent !== null || el.getClientRects().length,
          )
        : [];
    const first = focusables()[0];
    if (first) first.focus({ preventScroll: true });
    else if (box) {
      if (!box.hasAttribute("tabindex")) box.setAttribute("tabindex", "-1");
      box.focus({ preventScroll: true });
    }

    const onKey = (e) => {
      if (e.key === "Escape" && escape) {
        e.stopPropagation();
        closeRef.current?.();
        return;
      }
      if (e.key !== "Tab" || !box) return;
      const f = focusables();
      if (!f.length) {
        e.preventDefault();
        return;
      }
      const a = f[0];
      const z = f[f.length - 1];
      if (!box.contains(document.activeElement)) {
        e.preventDefault();
        a.focus();
      } else if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (opener && typeof opener.focus === "function" && document.contains(opener)) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [open, escape]);

  return ref;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// "smooth" unless the person has asked their device to reduce motion.
// Use for scrollIntoView / scrollTo: { behavior: smoothScroll() }.
export function smoothScroll() {
  if (typeof window === "undefined" || !window.matchMedia) return "smooth";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}
