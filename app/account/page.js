"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

export default function AccountPage() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState(null);
  const [savingEmail, setSavingEmail] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) router.push("/auth");
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) router.push("/auth");
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Passwords don't match." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({
        type: "error",
        text: "Password must be at least 8 characters.",
      });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setPasswordMsg({ type: "error", text: error.message });
    else {
      setPasswordMsg({
        type: "success",
        text: "Password updated successfully!",
      });
      setNewPassword("");
      setConfirmPassword("");
    }
    setSavingPassword(false);
  }

  async function handleChangeEmail() {
    if (!newEmail || !newEmail.includes("@")) {
      setEmailMsg({ type: "error", text: "Please enter a valid email." });
      return;
    }
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) setEmailMsg({ type: "error", text: error.message });
    else {
      setEmailMsg({
        type: "success",
        text: "Confirmation sent to your new email. Please check your inbox.",
      });
      setNewEmail("");
    }
    setSavingEmail(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/auth");
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteMsg(null);
    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (!currentSession) {
        setDeleteMsg({
          type: "error",
          text: "Session expired. Please sign in again.",
        });
        setDeleting(false);
        return;
      }
      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: { Authorization: `Bearer ${currentSession.access_token}` },
      });
      const result = await res.json();
      if (!res.ok) {
        setDeleteMsg({
          type: "error",
          text: result.error || "Something went wrong. Please try again.",
        });
        setDeleting(false);
        return;
      }
      await supabase.auth.signOut();
      router.push("/?deleted=true");
    } catch (err) {
      setDeleteMsg({
        type: "error",
        text: "Something went wrong. Please try again.",
      });
      setDeleting(false);
    }
  }

  const isGoogleUser =
    session?.user?.app_metadata?.provider === "google" ||
    session?.user?.identities?.some((i) => i.provider === "google");

  if (session === undefined) return null;
  if (!session) return null;

  return (
    <>
      <style>{`
        .input { width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #ddd; font-size: 14px; box-sizing: border-box; font-family: system-ui, sans-serif; outline: none; }
        .input:focus { border-color: #2d6a4f; }
        .btn-primary { padding: 8px 20px; background: #2d6a4f; color: #fff; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; font-weight: 600; font-family: system-ui, sans-serif; }
        .btn-primary:hover { background: #245a42; }
        .btn-secondary { padding: 8px 20px; background: #fff; color: #555; border: 1px solid #ddd; border-radius: 8px; font-size: 13px; cursor: pointer; font-family: system-ui, sans-serif; }
        .btn-secondary:hover { background: #f5f5f5; }
        .btn-danger { padding: 8px 20px; background: #fff; color: #c62828; border: 1px solid #c62828; border-radius: 8px; font-size: 13px; cursor: pointer; font-weight: 600; font-family: system-ui, sans-serif; }
        .btn-danger:hover { background: #fce8e8; }
        .btn-danger-solid { padding: 10px 24px; background: #c62828; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 600; font-family: system-ui, sans-serif; }
        .btn-danger-solid:hover { background: #b71c1c; }
        .btn-danger-solid:disabled { opacity: 0.6; cursor: not-allowed; }
        .section { background: #fff; border: 1px solid #ddd; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
        .section-danger { background: #fff; border: 1px solid #f5c6c6; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
        .label { display: block; font-size: 12px; color: #888; margin-bottom: 4px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
        .field { margin-bottom: 14px; }
        .msg-success { background: #e8f5e9; color: #2d6a4f; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 12px; }
        .msg-error { background: #fce8e8; color: #c62828; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 12px; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal { background: #fff; border-radius: 16px; padding: 28px; max-width: 420px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
      `}</style>

      {showDeleteModal && (
        <div
          className="modal-overlay"
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2
              style={{
                margin: "0 0 12px 0",
                fontSize: "1.2rem",
                color: "#111",
              }}
            >
              Delete your account?
            </h2>
            <p
              style={{
                margin: "0 0 8px 0",
                fontSize: "14px",
                color: "#555",
                lineHeight: "1.5",
              }}
            >
              This will permanently delete your account, your profile, and all
              your pet records. This cannot be undone.
            </p>
            <p
              style={{
                margin: "0 0 20px 0",
                fontSize: "14px",
                color: "#c62828",
                fontWeight: "600",
              }}
            >
              Are you absolutely sure?
            </p>
            {deleteMsg && (
              <div
                className={
                  deleteMsg.type === "success" ? "msg-success" : "msg-error"
                }
              >
                {deleteMsg.text}
              </div>
            )}
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn-secondary"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="btn-danger-solid"
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Yes, delete my account"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "20px",
          fontFamily: "system-ui, sans-serif",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <Link
            href="/"
            style={{
              color: "#2d6a4f",
              fontSize: "14px",
              textDecoration: "none",
            }}
          >
            ← Back to all vets
          </Link>
          
        </div>

        <h1 style={{ margin: "0 0 20px 0", fontSize: "1.4rem", color: "#111" }}>
          ⚙️ Account Settings
        </h1>

        <div className="section">
          <h2 style={{ margin: "0 0 12px 0", fontSize: "1rem", color: "#111" }}>
            Account Info
          </h2>
          <p style={{ margin: "0 0 12px 0", fontSize: "14px" }}>
            <span style={{ color: "#888" }}>Email: </span>
            <span style={{ color: "#333" }}>{session.user.email}</span>
          </p>
          <Link
            href="/profile"
            style={{
              fontSize: "13px",
              color: "#2d6a4f",
              textDecoration: "none",
              fontWeight: "600",
            }}
          >
            👤 Edit my profile →
          </Link>
        </div>

        {isGoogleUser && (
          <div className="section">
            <h2
              style={{ margin: "0 0 8px 0", fontSize: "1rem", color: "#111" }}
            >
              Google Account
            </h2>
            <p style={{ margin: 0, fontSize: "14px", color: "#555" }}>
              You signed in with Google. To change your email or password, visit
              your{" "}
              <a
                href="https://myaccount.google.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#2d6a4f" }}
              >
                Google account settings
              </a>
              .
            </p>
          </div>
        )}

        {!isGoogleUser && (
          <div className="section">
            <h2
              style={{ margin: "0 0 12px 0", fontSize: "1rem", color: "#111" }}
            >
              Change Email
            </h2>
            {emailMsg && (
              <div
                className={
                  emailMsg.type === "success" ? "msg-success" : "msg-error"
                }
              >
                {emailMsg.text}
              </div>
            )}
            <div className="field">
              <label className="label">New Email Address</label>
              <input
                className="input"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email"
              />
            </div>
            <button
              onClick={handleChangeEmail}
              className="btn-primary"
              disabled={savingEmail}
            >
              {savingEmail ? "Sending..." : "Update Email"}
            </button>
          </div>
        )}

        {!isGoogleUser && (
          <div className="section">
            <h2
              style={{ margin: "0 0 12px 0", fontSize: "1rem", color: "#111" }}
            >
              Change Password
            </h2>
            {passwordMsg && (
              <div
                className={
                  passwordMsg.type === "success" ? "msg-success" : "msg-error"
                }
              >
                {passwordMsg.text}
              </div>
            )}
            <div className="field">
              <label className="label">New Password</label>
              <input
                className="input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <div className="field">
              <label className="label">Confirm New Password</label>
              <input
                className="input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
              />
            </div>
            <button
              onClick={handleChangePassword}
              className="btn-primary"
              disabled={savingPassword}
            >
              {savingPassword ? "Updating..." : "Update Password"}
            </button>
          </div>
        )}

        <div className="section">
          <h2 style={{ margin: "0 0 8px 0", fontSize: "1rem", color: "#111" }}>
            Sign Out
          </h2>
          <p style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#555" }}>
            Sign out of your PetParrk account on this device.
          </p>
          <button onClick={handleSignOut} className="btn-secondary">
            Sign Out
          </button>
        </div>

        <div className="section-danger">
          <h2
            style={{ margin: "0 0 8px 0", fontSize: "1rem", color: "#c62828" }}
          >
            ⚠️ Danger Zone
          </h2>
          <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#555" }}>
            Permanently delete your account, your profile, and all your pet
            records. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="btn-danger"
          >
            Delete my account
          </button>
        </div>

        <footer
          style={{
            marginTop: "40px",
            borderTop: "1px solid #ddd",
            paddingTop: "24px",
            paddingBottom: "40px",
            textAlign: "center",
            color: "#888",
            fontSize: "13px",
          }}
        >
          <p
            style={{
              margin: "0 0 8px 0",
              fontWeight: "bold",
              color: "#2d6a4f",
              fontSize: "15px",
            }}
          >
            🐾 PetParrk
          </p>
          <p style={{ margin: "0" }}>
            Questions?{" "}
            <a
              href="mailto:bkalthompson@gmail.com"
              style={{ color: "#2d6a4f", textDecoration: "none" }}
            >
              bkalthompson@gmail.com
            </a>
          </p>
        </footer>
      </div>
    </>
  );
}
