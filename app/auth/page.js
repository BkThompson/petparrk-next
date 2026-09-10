"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";

// Known disposable / throwaway email domains. Blocking these at signup stops the
// low-effort bot & abuse accounts that use temporary inboxes to dodge email
// confirmation. This is a blocklist (catches known domains, not every possible
// one) — it works as one layer alongside CAPTCHA + required email confirmation,
// not as a standalone guarantee. Extend this list over time as needed.
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "grr.la",
  "sharklasers.com",
  "throwawaymail.com",
  "yopmail.com",
  "getnada.com",
  "trashmail.com",
  "maildrop.cc",
  "dispostable.com",
  "fakeinbox.com",
  "mintemail.com",
  "mailnesia.com",
  "mohmal.com",
  "emailondeck.com",
  "spamgourmet.com",
  "mytemp.email",
  "tempinbox.com",
  "burnermail.io",
  "temp-mail.io",
  "moakt.com",
  "tempmailo.com",
  "1secmail.com",
  "inboxkitten.com",
  "mailpoof.com",
  "vomoto.com",
]);

// Returns true if the email's domain is a known disposable provider.
function isDisposableEmail(email) {
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase();
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

// Validates a password against the same policy enforced server-side by Supabase
// (min 8 chars + lowercase + uppercase + digit + symbol). Returns an error
// string if invalid, or "" if the password passes. Keeping this in sync with
// the Supabase Auth password settings means users see a clear message here
// rather than a confusing rejection after submitting.
function getPasswordError(password) {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(password))
    return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(password))
    return "Password must include an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include a number.";
  if (!/[^A-Za-z0-9]/.test(password))
    return "Password must include a symbol (e.g. ! ? @ #).";
  return "";
}

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ── Cloudflare Turnstile (bot/abuse protection) ──────────────────────────
  // The widget produces a single-use token that we pass to every Supabase auth
  // call (signUp / signInWithPassword / resetPasswordForEmail). Supabase then
  // verifies it server-side and rejects any attempt without a valid token, so
  // scripted/bot signups are blocked. Requires:
  //   1. NEXT_PUBLIC_TURNSTILE_SITE_KEY set in env
  //   2. CAPTCHA enabled in Supabase → Auth → Bot and Abuse Protection
  const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [captchaToken, setCaptchaToken] = useState("");
  // Covers the auth form while we check for an existing session on mount,
  // so an already-authenticated user (e.g. arriving via email confirmation)
  // never sees the sign-in form flash before being redirected.
  const [checkingSession, setCheckingSession] = useState(true);
  const turnstileRef = useRef(null);
  const widgetIdRef = useRef(null);

  // Reset the widget so a fresh token is issued (tokens are single-use and
  // expire; we reset after each submit attempt and on mode switch).
  const resetCaptcha = useCallback(() => {
    setCaptchaToken("");
    if (window.turnstile && widgetIdRef.current !== null) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return; // not configured yet — skip silently
    const SCRIPT_SRC =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

    function renderWidget() {
      if (!window.turnstile || !turnstileRef.current) return;
      // If a widget was rendered into a now-unmounted div (mode switch),
      // reset the id so we render fresh into the currently-visible form.
      if (widgetIdRef.current !== null) {
        if (turnstileRef.current.childElementCount > 0) return; // still there
        widgetIdRef.current = null;
      }
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => setCaptchaToken(token),
        "expired-callback": () => setCaptchaToken(""),
        "error-callback": () => setCaptchaToken(""),
        theme: "light",
      });
    }

    if (window.turnstile) {
      renderWidget();
      return;
    }
    // Load the script once.
    let script = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", renderWidget);
    return () => script.removeEventListener("load", renderWidget);
    // checkingSession matters: the form (and this widget's container) is not
    // in the DOM while the session check runs, so an effect that fires during
    // that window finds turnstileRef.current === null and gives up. Re-running
    // once the form mounts is what actually gets the widget rendered.
  }, [TURNSTILE_SITE_KEY, mode, checkingSession]);
  // Read tab and redirect query params
  const redirectTo = searchParams.get("redirect") || "/";

  // Read tab query param — supports ?tab=signin, ?tab=signup, ?tab=forgot
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "signup") setMode("signup");
    else if (tab === "forgot") setMode("forgot");
    else setMode("signin");
  }, [searchParams]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        // No session — show the form.
        setCheckingSession(false);
        return;
      }

      // First-authenticated-load onboarding gate.
      // Supabase email confirmation can land the user here on /auth rather
      // than /auth/callback, so the callback gate alone is not enough. Mirror
      // it here: if this user has not yet seen the welcome intro, route them
      // to their destination with ?welcome=1 so the WelcomeModal fires. The
      // modal clears the flag on dismiss. Best-effort — any failure falls back
      // to a normal redirect so the user is never trapped on /auth.
      let target = redirectTo;
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("has_seen_welcome")
          .eq("id", data.session.user.id)
          .single();
        if (profile && profile.has_seen_welcome === false) {
          const url = new URL(redirectTo, window.location.origin);
          url.searchParams.set("welcome", "1");
          target = url.pathname + url.search;
        }
      } catch (e) {
        console.error("Welcome-gate lookup failed:", e?.message ?? e);
      }
      router.push(target);
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
    resetCaptcha();
    setMode(newMode);
  }

  async function handleGoogleSignIn() {
    setError("");
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
    if (error) setError(error.message);
  }

  async function handleSignIn(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    });
    setLoading(false);
    resetCaptcha();
    if (error) setError(error.message);
    else router.push(redirectTo);
  }

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
    // Match Supabase's password policy (lowercase + uppercase + digit + symbol)
    // so users get a clear message here instead of a cryptic server rejection.
    const pwError = getPasswordError(password);
    if (pwError) {
      setError(pwError);
      return;
    }
    if (isDisposableEmail(email)) {
      setError(
        "Please use a permanent email address — disposable email providers aren't allowed.",
      );
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        captchaToken,
      },
    });
    setLoading(false);
    resetCaptcha();
    if (error) setError(error.message);
    else {
      switchMode("signin");
      setSuccessMsg(
        "Account created! Check your email and click the confirmation link to get started.",
      );
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
      captchaToken,
    });
    setLoading(false);
    resetCaptcha();
    if (error) setError(error.message);
    else setSuccessMsg("Reset link sent! Check your inbox.");
  }

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1.5px solid var(--color-border, #EDE8E0)",
    fontSize: "16px",
    fontWeight: "500",
    fontFamily: "var(--font-urbanist, system-ui)",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
    transition: "border-color 0.15s",
  };

  const labelStyle = {
    display: "block",
    fontSize: "14px",
    fontWeight: "600",
    color: "var(--color-slate, #4B5563)",
    marginBottom: "6px",
  };

  const primaryBtn = {
    width: "100%",
    height: "48px",
    padding: "0 24px",
    background: "var(--color-terracotta, #CF5C36)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    border: "2px solid var(--color-terracotta, #CF5C36)",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: loading ? "not-allowed" : "pointer",
    fontFamily: "var(--font-urbanist, system-ui)",
    transition: "background 0.18s, color 0.18s",
  };

  const googleBtn = {
    width: "100%",
    height: "48px",
    padding: "0 24px",
    background: "#fff",
    color: "var(--color-navy-dark, #172531)",
    border: "1.5px solid var(--color-border, #EDE8E0)",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: "var(--font-urbanist, system-ui)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "border-color 0.15s",
  };

  const linkBtn = {
    background: "none",
    border: "none",
    color: "var(--color-terracotta, #CF5C36)",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    // 17px tall with padding 0. Vertical padding brings it to a 44px
    // target; the negative right margin keeps it flush to the edge.
    padding: "14px 0",
    fontFamily: "var(--font-urbanist, system-ui)",
  };

  const divider = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        margin: "20px 0",
        color: "var(--color-muted, #717A86)",
        fontSize: "14px",
        fontWeight: "500",
      }}
    >
      <div
        style={{
          flex: 1,
          height: "1px",
          background: "var(--color-border, #EDE8E0)",
        }}
      />
      or continue with email
      <div
        style={{
          flex: 1,
          height: "1px",
          background: "var(--color-border, #EDE8E0)",
        }}
      />
    </div>
  );

  const eyeBtn = (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      aria-label={showPassword ? "Hide password" : "Show password"}
      style={{
        position: "absolute",
        right: "12px",
        top: "50%",
        transform: "translateY(-50%)",
        background: "none",
        border: "none",
        cursor: "pointer",
        // 22.5px icon, 44px target. Padding rather than a pseudo-element
        // because nothing here depends on the button's own box.
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "44px",
        height: "44px",
        color: "var(--color-muted, #717A86)",
        fontSize: "18px",
      }}
    >
      {showPassword ? (
        <EyeOff size={18} strokeWidth={2} />
      ) : (
        <Eye size={18} strokeWidth={2} />
      )}
    </button>
  );

  if (checkingSession) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 64px)",
          background: "var(--color-cream, #F5F0E8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-busy="true"
        aria-live="polite"
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            border: "3px solid var(--color-border, #EDE8E0)",
            borderTopColor: "var(--color-terracotta, #CF5C36)",
            borderRadius: "50%",
            animation: "authSpin 0.7s linear infinite",
          }}
        />
        <span
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
          }}
        >
          Loading…
        </span>
        <style>{`@keyframes authSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      className="auth-page-wrap"
      style={{
        minHeight: "calc(100vh - 64px)",
        background: "var(--color-cream, #F5F0E8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: "48px",
        paddingBottom: "80px",
        fontFamily: "var(--font-urbanist, system-ui)",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "20px",
          padding: "40px 36px",
          width: "100%",
          maxWidth: "420px",
          boxShadow: "0 4px 24px rgba(23,37,49,0.08)",
          border: "1px solid var(--color-border, #EDE8E0)",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "32px", marginBottom: "6px" }}>🐾</div>
          <h1
            style={{
              margin: 0,
              color: "var(--color-navy-dark, #172531)",
              fontSize: "22px",
              fontWeight: "800",
              fontFamily: "var(--font-urbanist, system-ui)",
              letterSpacing: "-0.025em",
            }}
          >
            PetParrk
          </h1>
          <p
            style={{
              margin: "6px 0 0",
              color: "var(--color-muted, #717A86)",
              fontSize: "15px",
              fontWeight: "500",
            }}
          >
            {mode === "signin" && "Welcome back"}
            {mode === "signup" && "Create your free account"}
            {mode === "forgot" && "Reset your password"}
          </p>
        </div>

        {/* Mode tabs — sliding pill */}
        {mode !== "forgot" && (
          <div
            style={{
              position: "relative",
              display: "flex",
              background: "var(--color-cream, #F5F0E8)",
              borderRadius: "10px",
              padding: "4px",
              marginBottom: "24px",
            }}
          >
            {/* Sliding pill */}
            <div
              style={{
                position: "absolute",
                top: "4px",
                bottom: "4px",
                left: mode === "signin" ? "4px" : "calc(50% + 2px)",
                width: "calc(50% - 6px)",
                background: "#fff",
                borderRadius: "7px",
                boxShadow: "0 1px 4px rgba(23,37,49,0.1)",
                transition: "left 0.22s cubic-bezier(0.4,0,0.2,1)",
                pointerEvents: "none",
              }}
            />
            <button
              onClick={() => switchMode("signin")}
              style={{
                flex: 1,
                padding: "13px 8px",
                borderRadius: "7px",
                border: "none",
                background: "transparent",
                color:
                  mode === "signin"
                    ? "var(--color-navy-dark, #172531)"
                    : "var(--color-muted, #717A86)",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: "var(--font-urbanist, system-ui)",
                position: "relative",
                zIndex: 1,
                transition: "color 0.22s ease",
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => switchMode("signup")}
              style={{
                flex: 1,
                padding: "13px 8px",
                borderRadius: "7px",
                border: "none",
                background: "transparent",
                color:
                  mode === "signup"
                    ? "var(--color-navy-dark, #172531)"
                    : "var(--color-muted, #717A86)",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: "var(--font-urbanist, system-ui)",
                position: "relative",
                zIndex: 1,
                transition: "color 0.22s ease",
              }}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Banners */}
        {error && (
          <div
            style={{
              background: "#FCEAEA",
              color: "#C94040",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "16px",
              animation: "fadeIn 0.2s ease",
            }}
          >
            {error}
          </div>
        )}
        {successMsg && (
          <div
            style={{
              background: "#EDFAF3",
              color: "#1A6641",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "16px",
              animation: "fadeIn 0.2s ease",
            }}
          >
            {successMsg}
          </div>
        )}
        <style>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
          .auth-page-wrap { padding-left: 20px; padding-right: 20px; }
          @media (max-width: 640px) { .auth-page-wrap { padding-left: 16px; padding-right: 16px; } }
          .auth-form-content { animation: fadeIn 0.2s ease; }
          .auth-primary-btn:hover:not(:disabled) { background: #fff !important; color: var(--color-terracotta, #CF5C36) !important; border: 2px solid var(--color-terracotta, #CF5C36) !important; }
          .auth-google-btn:hover { border-color: var(--color-navy-dark, #172531) !important; background: var(--color-navy-dark, #172531) !important; color: #fff !important; }
        `}</style>

        {/* SIGN IN */}
        {mode === "signin" && (
          <div className="auth-form-content">
            <button
              className="auth-google-btn"
              style={googleBtn}
              onClick={handleGoogleSignIn}
            >
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
              {TURNSTILE_SITE_KEY && (
                <div
                  ref={turnstileRef}
                  className="cf-turnstile"
                  style={{ margin: "0 0 16px" }}
                />
              )}
              <button
                type="submit"
                className="auth-primary-btn"
                style={primaryBtn}
                disabled={loading}
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>
          </div>
        )}

        {/* SIGN UP */}
        {mode === "signup" && (
          <div className="auth-form-content">
            <button
              className="auth-google-btn"
              style={googleBtn}
              onClick={handleGoogleSignIn}
            >
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
                    placeholder="Create a strong password"
                    style={{ ...inputStyle, paddingRight: "44px" }}
                  />
                  {eyeBtn}
                </div>
                <p
                  style={{
                    margin: "6px 2px 0",
                    fontSize: "12.5px",
                    lineHeight: 1.4,
                    color: "var(--color-muted, #717A86)",
                  }}
                >
                  At least 8 characters, with an uppercase and lowercase letter,
                  a number, and a symbol.
                </p>
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
              {TURNSTILE_SITE_KEY && (
                <div
                  ref={turnstileRef}
                  className="cf-turnstile"
                  style={{ margin: "0 0 16px" }}
                />
              )}
              <button
                type="submit"
                className="auth-primary-btn"
                style={primaryBtn}
                disabled={loading}
              >
                {loading ? "Creating account…" : "Create Account"}
              </button>
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "var(--color-muted, #717A86)",
                  textAlign: "center",
                  marginTop: "12px",
                }}
              >
                By signing up you agree to our Terms &amp; Privacy Policy.
              </p>
            </form>
          </div>
        )}

        {/* FORGOT PASSWORD */}
        {mode === "forgot" && (
          <>
            <p
              style={{
                fontSize: "15px",
                color: "var(--color-slate, #4B5563)",
                marginBottom: "20px",
                lineHeight: "1.65",
              }}
            >
              Enter your email and we'll send you a link to reset your password.
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
              {TURNSTILE_SITE_KEY && (
                <div
                  ref={turnstileRef}
                  className="cf-turnstile"
                  style={{ margin: "0 0 16px" }}
                />
              )}
              <button
                type="submit"
                className="auth-primary-btn"
                style={primaryBtn}
                disabled={loading}
              >
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
            </form>
            <p
              style={{
                textAlign: "center",
                marginTop: "20px",
                fontSize: "14px",
              }}
            >
              <button style={linkBtn} onClick={() => switchMode("signin")}>
                <ArrowLeft
                  size={14}
                  strokeWidth={2.4}
                  style={{ marginRight: "4px", verticalAlign: "middle" }}
                />{" "}
                Back to Sign In
              </button>
            </p>
          </>
        )}

        {/* Browse without account */}
        {mode !== "forgot" && (
          <p
            style={{ textAlign: "center", marginTop: "16px", fontSize: "14px" }}
          >
            <button
              style={{
                background: "none",
                border: "none",
                color: "var(--color-muted, #717A86)",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                fontFamily: "var(--font-urbanist, system-ui)",
                padding: 0,
              }}
              onClick={() => router.push("/")}
            >
              Browse without an account{" "}
              <ArrowRight
                size={14}
                strokeWidth={2.4}
                style={{ marginLeft: "4px", verticalAlign: "middle" }}
              />
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageContent />
    </Suspense>
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
