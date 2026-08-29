"use client";

/* AutoGrowTextarea — a textarea that fits its content height as the user
   types AND when the value is set programmatically (e.g. a long saved bio
   loaded into the edit form). The effect on [value] is what fixes the
   "content cut off until you type" bug.

   Shared by ProfileMain, ProfileUsername, and InlineSubmitPriceForm. */

import { useRef, useEffect } from "react";

export default function AutoGrowTextarea({ value, style, minHeight, ...rest }) {
  const ref = useRef(null);
  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };
  useEffect(() => {
    resize();
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onInput={resize}
      style={{
        resize: "none",
        overflow: "hidden",
        minHeight: minHeight || "84px",
        ...style,
      }}
      {...rest}
    />
  );
}
