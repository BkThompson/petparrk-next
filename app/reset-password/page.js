"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const GREEN = "var(--color-success)";

function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    async function init() {
      // Read code directly from window.location — no useSearchParams needed
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          setReady(true);
          return;
        }
      }

      // Fallback: already have a session
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setReady(true);
        return;
      }

      // Fallback: listen for PASSWORD_RECOVERY event
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          setReady(true);
        }
      });

      // Last resort: show form after 2s so user isn't stuck
      setTimeout(() => setReady(true), 2000);

      return () => subscription.unsubscribe();
    }
    init();
  }, []);

  async function handleReset(e) {
    e.preventDefault();
    if (password.length < 8) return setMessage("Password must be at least 8 characters.");
    if (password !== confirm) return setMessage("Passwords don't match.");

    setStatus("loading");
    setMessage("");

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("success");
      setMessage("Password updated! Redirecting to sign in...");
      await supabase.auth.signOut();
      setTimeout(() => router.push("/auth"), 2000);
    }
  }

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: "8px",
    border: "1px solid var(--color-border-field)", fontSize: "15px",
    fontFamily: "system-ui, sans-serif", boxSizing: "border-box",
  };

  return (
    <div style={{
      minHeight: "calc(100vh - 64px)", background: "var(--color-white)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: "20px",
      fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{
        background: "var(--color-white)", borderRadius: "16px", padding: "40px 36px",
        width: "100%", maxWidth: "420px", boxShadow: "0 4px 24px rgb(var(--color-black-rgb) / 0.08)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "36px", marginBottom: "4px" }}>🐾</div>
          <h1 style={{ margin: 0, color: GREEN, fontSize: "1.6rem", fontWeight: "700" }}>PetParrk</h1>
          <p style={{ margin: "6px 0 0", color: "var(--color-muted)", fontSize: "14px" }}>Set your new password</p>
        </div>

        {status === "success" ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>✅</div>
            <p style={{ color: GREEN, fontWeight: "600", fontSize: "14px" }}>{message}</p>
          </div>
        ) : !ready ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p style={{ color: "var(--color-muted)", fontSize: "14px" }}>Verifying your reset link...</p>
          </div>
        ) : (
          <form onSubmit={handleReset}>
            {message && (
              <div role="status" style={{
                background: status === "error" ? "var(--color-error-light)" : "var(--color-success-light)",
                color: status === "error" ? "var(--color-error-text)" : GREEN,
                borderRadius: "8px", padding: "10px 14px",
                fontSize: "14px", marginBottom: "16px",
              }}>
                {message}
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--color-slate)", marginBottom: "6px" }}>
                New Password
              </label>
              <div style={{ position: "relative" }}>
                <input aria-label="New password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  style={{ ...inputStyle, paddingRight: "44px" }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                  position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "18px",
                }}>
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--color-slate)", marginBottom: "6px" }}>
                Confirm Password
              </label>
              <input aria-label="Confirm Password"
                type={showPassword ? "text" : "password"}
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                style={inputStyle}
              />
            </div>

            <button type="submit" disabled={status === "loading"} style={{
              width: "100%", padding: "13px",
              background: status === "loading" ? "var(--color-muted)" : GREEN,
              color: "var(--color-white)", border: "none", borderRadius: "8px", fontSize: "15px",
              fontWeight: "600", cursor: status === "loading" ? "not-allowed" : "pointer",
              fontFamily: "system-ui, sans-serif",
            }}>
              {status === "loading" ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px" }}>
          <button onClick={() => router.push("/auth")} style={{
            background: "none", border: "none", color: "var(--color-muted)",
            cursor: "pointer", fontSize: "13px", fontFamily: "system-ui, sans-serif",
          }}>
            ← Back to Sign In
          </button>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui, sans-serif", color: "var(--color-muted)" }}>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
