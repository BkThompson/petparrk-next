"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const GREEN = "#2d6a4f";
const GREEN_LIGHT = "#e8f5e9";
const GREEN_DARK = "#1b4332";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [validSession, setValidSession] = useState(false);

  // Supabase puts the recovery token in the URL hash — this checks for it
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setValidSession(true);
      } else {
        setError(
          "This reset link is invalid or has expired. Please request a new one."
        );
      }
    });
  }, []);

  async function handleReset(e) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      await supabase.auth.signOut();
      setSuccessMsg("✅ Password updated! Redirecting you to sign in…");
      setTimeout(() => router.push("/auth"), 2500);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "8px",
    border: "1.5px solid #ddd",
    fontSize: "15px",
    fontFamily: "system-ui, sans-serif",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#444",
    marginBottom: "6px",
  };

  const primaryBtn = {
    width: "100%",
    padding: "13px",
    background: loading ? "#aaa" : GREEN,
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: loading ? "not-allowed" : "pointer",
    fontFamily: "system-ui, sans-serif",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f9f7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "40px 36px",
          width: "100%",
          maxWidth: "420px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "36px", marginBottom: "4px" }}>🐾</div>
          <h1
            style={{
              margin: 0,
              color: GREEN,
              fontSize: "1.6rem",
              fontWeight: "700",
            }}
          >
            PetParrk
          </h1>
          <p style={{ margin: "6px 0 0", color: "#777", fontSize: "14px" }}>
            Choose a new password
          </p>
        </div>

        {/* Banners */}
        {error && (
          <div
            style={{
              background: "#fde8e8",
              color: "#b91c1c",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "14px",
              marginBottom: "16px",
            }}
          >
            {error}
            {!validSession && (
              <div style={{ marginTop: "10px" }}>
                <button
                  onClick={() => router.push("/auth")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#b91c1c",
                    textDecoration: "underline",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: 0,
                  }}
                >
                  Request a new reset link →
                </button>
              </div>
            )}
          </div>
        )}
        {successMsg && (
          <div
            style={{
              background: GREEN_LIGHT,
              color: GREEN_DARK,
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "14px",
              marginBottom: "16px",
            }}
          >
            {successMsg}
          </div>
        )}

        {validSession && !successMsg && (
          <form onSubmit={handleReset}>
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>New Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  style={{ ...inputStyle, paddingRight: "44px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#888",
                    fontSize: "18px",
                  }}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={labelStyle}>Confirm New Password</label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your new password"
                style={inputStyle}
              />
            </div>

            <button type="submit" style={primaryBtn} disabled={loading}>
              {loading ? "Updating…" : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
