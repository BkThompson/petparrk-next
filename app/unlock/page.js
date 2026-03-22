"use client";
import { useState } from "react";

export default function Unlock() {
  const [val, setVal] = useState("");

  function unlock() {
    document.cookie = `preview_token=${val}; path=/; max-age=604800`;
    window.location.href = "/";
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: "12px",
        fontFamily: "system-ui",
      }}
    >
      <input
        type="password"
        placeholder="Enter password"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && unlock()}
        style={{
          padding: "10px",
          fontSize: "16px",
          border: "1px solid #ddd",
          borderRadius: "6px",
        }}
      />
      <button
        onClick={unlock}
        style={{
          padding: "10px 24px",
          background: "#111",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Enter
      </button>
    </div>
  );
}
