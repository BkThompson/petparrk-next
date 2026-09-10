"use client";
import { useState } from "react";

export default function Unlock() {
  const [val, setVal] = useState("");
  const [error, setError] = useState(false);

  function unlock() {
    if (!val.trim()) {
      setError(true);
      return;
    }
    // Store the entered token; proxy.js validates it server-side against
    // PREVIEW_TOKEN. If it's wrong, proxy.js bounces back here with ?retry=1.
    document.cookie = `preview_token=${val}; path=/; max-age=604800`;
    window.location.href = "/";
  }

  // If proxy.js redirected back here after a failed check, show a hint.
  const showRetry =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("retry") === "1";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "14px",
        fontFamily: "var(--font-urbanist, 'Urbanist', system-ui, sans-serif)",
        background: "#172531",
        padding: "0 24px",
      }}
    >
      <div style={{ fontSize: "40px", marginBottom: "4px" }}>🐾</div>
      <h1
        style={{
          margin: 0,
          fontSize: "24px",
          fontWeight: 800,
          color: "#F5F0E8",
          letterSpacing: "-0.01em",
        }}
      >
        PetParrk
      </h1>
      <p
        style={{
          margin: "0 0 8px",
          fontSize: "16px",
          color: "#9BA6B2",
          textAlign: "center",
          maxWidth: "320px",
          lineHeight: 1.5,
        }}
      >
        This site is in private preview. Enter the password to continue.
      </p>
      <input
        type="password"
        placeholder="Enter password"
        value={val}
        autoFocus
        onChange={(e) => {
          setVal(e.target.value);
          if (error) setError(false);
        }}
        onKeyDown={(e) => e.key === "Enter" && unlock()}
        style={{
          padding: "12px 14px",
          fontSize: "16px",
          width: "260px",
          maxWidth: "100%",
          border: `1px solid ${error ? "#CF5C36" : "#2c3d4b"}`,
          borderRadius: "10px",
          background: "#0f1a24",
          color: "#F5F0E8",
          outline: "none",
        }}
      />
      {(error || showRetry) && (
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            color: "#CF5C36",
            fontWeight: 600,
          }}
        >
          {error
            ? "Please enter the password."
            : "Incorrect password. Please try again."}
        </p>
      )}
      <button onClick={unlock} className="unlock-btn">
        Enter
      </button>
      <style>{`
        .unlock-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 48px;
          padding: 0 24px;
          border-radius: 2px;
          background: #CF5C36;
          color: #fff;
          border: 2px solid #CF5C36;
          cursor: pointer;
          font-size: 15px;
          font-weight: 700;
          font-family: inherit;
          box-sizing: border-box;
          transition: background 0.2s, color 0.2s;
        }
        /* Inverts on hover — the same treatment the site's outlined buttons use. */
        .unlock-btn:hover {
          background: #fff;
          color: #CF5C36;
        }
        @media (max-width: 640px) {
          /* Full width of the form, not the viewport: the input above is 260px
             in a centred column, so a button spanning the whole screen would
             be much wider than the field it belongs to. */
          .unlock-btn { width: 100%; max-width: 260px; }
        }
      `}</style>
    </div>
  );
}
