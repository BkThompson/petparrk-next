"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const GREEN = "#2d6a4f";
const GREEN_LIGHT = "#e8f5e9";
const GREEN_DARK = "#1b4332";

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState("signin"); // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // If already logged in, redirect to home
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push("/");
    });
  }, []);

  function reset() {
    setError("");
    setSuccessMsg("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setShowPassword(false);
  }

  function switchMode(newMode) {
    reset();
    setMode(newMode);
  }

  // ─── Google OAuth ─────────────────────────────────────────────────────────
  async function handleGoogleSignIn() {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  // ─── Email Sign In ────────────────────────────────────────────────────────
  async function handleSignIn(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push("/");
    }
  }

  // ─── Email Sign Up ────────────────────────────────────────────────────────
  async function handleSignUp(e) {
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
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccessMsg(
        "✅ Account created! Check your email to confirm, then sign in."
      );
      switchMode("signin");
    }
  }

  // ─── Forgot Password ──────────────────────────────────────────────────────
  async function handleForgotPassword(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccessMsg("📬 Reset link sent! Check your inbox.");
    }
  }

  // ─── Styles ───────────────────────────────────────────────────────────────
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

  const googleBtn = {
    width: "100%",
    padding: "12px",
    background: "#fff",
    color: "#333",
    border: "1.5px solid #ddd",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: "system-ui, sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  };

  const linkBtn = {
    background: "none",
    border: "none",
    color: GREEN,
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    padding: 0,
    fontFamily: "system-ui, sans-serif",
  };

  const divider = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        margin: "20px 0",
        color: "#aaa",
        fontSize: "13px",
      }}
    >
      <div style={{ flex: 1, height: "1px", background: "#eee" }} />
      or continue with email
      <div style={{ flex: 1, height: "1px", background: "#eee" }} />
    </div>
  );

  const eyeBtn = (
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
  );

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
            {mode === "signin" && "Know before you go to the vet"}
            {mode === "signup" && "Create your free account"}
            {mode === "forgot" && "Reset your password"}
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

        {/* ── SIGN IN ── */}
        {mode === "signin" && (
          <>
            <button style={googleBtn} onClick={handleGoogleSignIn}>
              <GoogleIcon /> Continue with Google
            </button>

            {divider}

            <form onSubmit={handleSignIn}>
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: "8px" }}>
                <label style={labelStyle}>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    style={{ ...inputStyle, paddingRight: "44px" }}
                  />
                  {eyeBtn}
                </div>
              </div>

              <div style={{ textAlign: "right", marginBottom: "20px" }}>
                <button
                  type="button"
                  style={linkBtn}
                  onClick={() => switchMode("forgot")}
                >
                  Forgot password?
                </button>
              </div>

              <button type="submit" style={primaryBtn} disabled={loading}>
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <p
              style={{
                textAlign: "center",
                marginTop: "20px",
                fontSize: "14px",
                color: "#666",
              }}
            >
              Don&apos;t have an account?{" "}
              <button style={linkBtn} onClick={() => switchMode("signup")}>
                Sign up free
              </button>
            </p>
          </>
        )}

        {/* ── SIGN UP ── */}
        {mode === "signup" && (
          <>
            <button style={googleBtn} onClick={handleGoogleSignIn}>
              <GoogleIcon /> Continue with Google
            </button>

            {divider}

            <form onSubmit={handleSignUp}>
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    style={{ ...inputStyle, paddingRight: "44px" }}
                  />
                  {eyeBtn}
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Confirm Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  style={inputStyle}
                />
              </div>

              <button type="submit" style={primaryBtn} disabled={loading}>
                {loading ? "Creating account…" : "Create Free Account"}
              </button>

              <p
                style={{
                  fontSize: "12px",
                  color: "#999",
                  textAlign: "center",
                  marginTop: "12px",
                }}
              >
                By signing up you agree to our Terms &amp; Privacy Policy.
              </p>
            </form>

            <p
              style={{
                textAlign: "center",
                marginTop: "16px",
                fontSize: "14px",
                color: "#666",
              }}
            >
              Already have an account?{" "}
              <button style={linkBtn} onClick={() => switchMode("signin")}>
                Sign in
              </button>
            </p>
          </>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {mode === "forgot" && (
          <>
            <p
              style={{
                fontSize: "14px",
                color: "#666",
                marginBottom: "20px",
                lineHeight: "1.5",
              }}
            >
              Enter your email and we&apos;ll send you a link to reset your
              password.
            </p>

            <form onSubmit={handleForgotPassword}>
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                />
              </div>

              <button type="submit" style={primaryBtn} disabled={loading}>
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
            </form>

            <p
              style={{
                textAlign: "center",
                marginTop: "20px",
                fontSize: "14px",
                color: "#666",
              }}
            >
              <button style={linkBtn} onClick={() => switchMode("signin")}>
                ← Back to Sign In
              </button>
            </p>
          </>
        )}

        {/* Browse without account */}
        {mode !== "forgot" && (
          <p
            style={{ textAlign: "center", marginTop: "16px", fontSize: "13px" }}
          >
            <button
              style={{ ...linkBtn, color: "#aaa", fontWeight: "400" }}
              onClick={() => router.push("/")}
            >
              Browse without an account →
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.8 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19.1 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.8 29.5 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.5 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.4C9.8 35.5 16.4 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C37 38.4 44 33 44 24c0-1.3-.1-2.7-.4-3.9z"
      />
    </svg>
  );
}
