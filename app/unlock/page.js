"use client";
import { useState, useRef, useEffect } from "react";
import { Eye, EyeOff, CheckCircle } from "lucide-react";

export default function Unlock() {
  // Waitlist state
  const [email, setEmail] = useState("");
  const [wlStatus, setWlStatus] = useState("idle"); // idle | loading | done | error
  const [wlError, setWlError] = useState("");

  // Managed (visible) Turnstile for bot protection — the SAME widget/keys the
  // login page uses, which are known to work. A visible checkbox is normal on a
  // signup form and resets cleanly for repeat submissions (unlike the invisible
  // widget, which fought repeat-submit on this page). The token is read at
  // submit time from a ref; we never gate the button on it, so the UI can't
  // hang. After each submit we reset the widget for a fresh token.
  const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const captchaTokenRef = useRef("");
  const turnstileRef = useRef(null);
  const widgetIdRef = useRef(null);

  // Exact pattern from the working login page (same managed widget + keys,
  // confirmed working on localhost).
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return; // not configured — route fails open in dev
    const SCRIPT_SRC =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

    function renderWidget() {
      if (!window.turnstile || !turnstileRef.current) return;
      // If a widget id exists but the container is empty (e.g. re-mount), clear
      // the id and render fresh; if the widget is still in the DOM, do nothing.
      if (widgetIdRef.current !== null) {
        if (turnstileRef.current.childElementCount > 0) return;
        widgetIdRef.current = null;
      }
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (t) => {
          captchaTokenRef.current = t;
        },
        "expired-callback": () => {
          captchaTokenRef.current = "";
        },
        "error-callback": () => {
          captchaTokenRef.current = "";
        },
        theme: "light",
      });
    }

    if (window.turnstile) {
      renderWidget();
      return;
    }
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
    // wlStatus matters: the widget's container lives in the form branch, which
    // unmounts on the "done"/"already" confirmation. When "Add another email"
    // returns to the form (wlStatus → "idle"), the container is a fresh empty
    // div, so the effect must re-run to render the widget into it again. The
    // childElementCount guard above prevents a double-render when it's already
    // present.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [TURNSTILE_SITE_KEY, wlStatus]);

  // Clear the spent token and the widget id. The widget's container unmounts
  // with the form on the confirmation screen; when "Add another email" brings
  // the form back, the effect (keyed on wlStatus) renders a fresh widget into
  // the new container, which issues a new token. Never blocks the UI.
  function resetCaptcha() {
    captchaTokenRef.current = "";
    widgetIdRef.current = null;
  }

  // Password-unlock state (Brandon/Susan preview access) — unchanged behavior.
  const [val, setVal] = useState("");
  const [error, setError] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  async function joinWaitlist() {
    const trimmed = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      setWlStatus("error");
      setWlError("Please enter a valid email address.");
      return;
    }
    // If Turnstile is configured, require a completed verification before
    // submitting — otherwise the server gets an empty token and 403s. This
    // gives a clear message instead of a confusing failure.
    if (TURNSTILE_SITE_KEY && !captchaTokenRef.current) {
      setWlStatus("error");
      setWlError("Please complete the verification above, then try again.");
      return;
    }
    setWlStatus("loading");
    setWlError("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          captchaToken: captchaTokenRef.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      // Token is single-use — reset now so the next submit gets a fresh one.
      resetCaptcha();
      if (res.ok && data.ok) {
        // Option A: tell the user plainly if they were already on the list.
        setWlStatus(data.duplicate ? "already" : "done");
        return;
      }
      // Friendly messages per failure reason.
      if (data.error === "disposable") {
        setWlStatus("error");
        setWlError("Please use a permanent email address.");
      } else if (data.error === "captcha") {
        setWlStatus("error");
        setWlError("Couldn't verify you're human. Please try again.");
      } else if (data.error === "invalid_email") {
        setWlStatus("error");
        setWlError("Please enter a valid email address.");
      } else {
        setWlStatus("error");
        setWlError("Something went wrong. Please try again.");
      }
    } catch (e) {
      resetCaptcha();
      setWlStatus("error");
      setWlError("Something went wrong. Please try again.");
    }
  }

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

  // Input style taken from the site's design system (Auth page inputStyle).
  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "2px solid var(--color-border, #EDE8E0)",
    fontSize: "16px",
    fontWeight: "500",
    fontFamily: "var(--font-urbanist, system-ui)",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
    transition: "border-color 0.15s",
  };

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
        padding: "40px 24px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontSize: "44px", marginBottom: "2px" }}>🐾</div>
      <h1
        style={{
          margin: 0,
          fontSize: "28px",
          fontWeight: 800,
          color: "#F5F0E8",
          letterSpacing: "-0.01em",
        }}
      >
        PetParrk
      </h1>

      {wlStatus === "done" || wlStatus === "already" ? (
        <>
          <CheckCircle
            size={40}
            strokeWidth={2}
            color="var(--color-success, #2a7d4f)"
            style={{ marginBottom: "2px" }}
          />
          <p
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 700,
              color: "#F5F0E8",
              textAlign: "center",
            }}
          >
            {wlStatus === "already"
              ? "You're already on the list!"
              : "You're on the list!"}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: 500,
              color: "#9BA6B2",
              textAlign: "center",
              maxWidth: "460px",
              lineHeight: 1.55,
            }}
          >
            {wlStatus === "already" ? (
              <>
                This email is already signed up — we&apos;ll see you at launch.
              </>
            ) : (
              <>
                We&apos;ll email you the moment PetParrk goes live.
                <br />
                Thanks for being an early supporter.
              </>
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              setEmail("");
              setWlStatus("idle");
              setWlError("");
              resetCaptcha();
            }}
            className="preview-link"
            style={{ marginTop: "0px", marginBottom: "10px" }}
          >
            Add another email
          </button>
        </>
      ) : (
        <>
          <p
            style={{
              margin: "0 0 10px",
              fontSize: "16px",
              fontWeight: 500,
              color: "#9BA6B2",
              textAlign: "center",
              maxWidth: "460px",
              lineHeight: 1.55,
            }}
          >
            Know what you&apos;ll pay before you go — vet pricing transparency
            and a smarter health companion for your dog.
            <br />
            <span style={{ fontWeight: 700, color: "#F5F0E8" }}>
              Launching soon.
            </span>
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              width: "300px",
              maxWidth: "100%",
            }}
          >
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (wlStatus === "error") setWlStatus("idle");
              }}
              onKeyDown={(e) => e.key === "Enter" && joinWaitlist()}
              style={inputStyle}
            />
            {wlStatus === "error" && (
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color: "#CF5C36",
                  fontWeight: 600,
                }}
              >
                {wlError}
              </p>
            )}
            <button
              onClick={joinWaitlist}
              disabled={wlStatus === "loading"}
              className="wl-btn"
            >
              {wlStatus === "loading" ? "Joining\u2026" : "Join the waitlist"}
            </button>
            {/* Managed Turnstile checkbox (verifies the person is human). */}
            <div
              ref={turnstileRef}
              style={{
                display: "flex",
                justifyContent: "center",
                minHeight: "65px",
              }}
            />
          </div>
        </>
      )}

      {/* Preview access for Brandon/Susan — password protection preserved. */}
      <div style={{ marginTop: 0, textAlign: "center" }}>
        {!pwOpen ? (
          <button
            type="button"
            onClick={() => setPwOpen(true)}
            className="preview-link"
          >
            Have a preview password?
          </button>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{ position: "relative", width: "260px", maxWidth: "100%" }}
            >
              <input
                type={showPw ? "text" : "password"}
                placeholder="Enter password"
                value={val}
                autoFocus
                onChange={(e) => {
                  setVal(e.target.value);
                  if (error) setError(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && unlock()}
                style={{ ...inputStyle, padding: "12px 44px 12px 14px" }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: "6px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "34px",
                  height: "34px",
                  padding: 0,
                  border: "none",
                  background: "none",
                  color: "#717A86",
                  cursor: "pointer",
                }}
              >
                {showPw ? (
                  <EyeOff size={18} strokeWidth={2} />
                ) : (
                  <Eye size={18} strokeWidth={2} />
                )}
              </button>
            </div>
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
              Enter preview
            </button>
          </div>
        )}
      </div>

      <style>{`
        .wl-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 48px;
          padding: 0 24px;
          border-radius: 10px;
          background: #CF5C36;
          color: #fff;
          border: 2px solid #CF5C36;
          cursor: pointer;
          font-size: 15px;
          font-weight: 700;
          font-family: inherit;
          box-sizing: border-box;
          transition: background 0.18s, color 0.18s;
        }
        .wl-btn:hover { background: #fff; color: #CF5C36; }
        .wl-btn:disabled { opacity: 0.7; cursor: default; }

        .unlock-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 44px;
          padding: 0 24px;
          border-radius: 12px;
          background: transparent;
          color: #F5F0E8;
          border: 2px solid #2c3d4b;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
          font-family: inherit;
          box-sizing: border-box;
          transition: border-color 0.18s;
        }
        .unlock-btn:hover { border-color: #F5F0E8; }

        .preview-link {
          background: none;
          border: none;
          color: #9BA6B2;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          text-decoration: underline;
          font-family: inherit;
          transition: color 0.15s;
        }
        .preview-link:hover { color: #F5F0E8; }
      `}</style>
    </div>
  );
}
