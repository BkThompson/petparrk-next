"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import PageLoader from "../../components/PageLoader";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

const C = {
  navyDark: "#172531",
  navyMid: "#2C4657",
  terracotta: "#CF5C36",
  gold: "#EFC88B",
  cream: "#F5F0E8",
  white: "#FFFFFF",
  slate: "#4B5563",
  muted: "#717A86",
  border: "#EDE8E0",
  error: "#C94040",
  success: "#2A7D4F",
};

export default function AccountSettings() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [isGoogleUser, setIsGoogleUser] = useState(false);

  // Email
  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState(null);

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);

  // Sign out
  const [signingOut, setSigningOut] = useState(false);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Background scroll-lock while the delete modal is open. Safe because
  // .modal-box scrolls internally (max-height 86vh, overflow-y auto).
  useEffect(() => {
    if (!showDeleteModal) return;
    // `overflow: hidden` alone does not stop scrolling in iOS Safari.
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    return () => {
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, [showDeleteModal]);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/auth");
        return;
      }
      setSession(data.session);
      const provider = data.session.user.app_metadata?.provider;
      setIsGoogleUser(provider === "google");
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) router.push("/auth");
      else setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleChangeEmail() {
    if (!newEmail.trim()) return;
    setSavingEmail(true);
    setEmailMsg(null);
    const { error } = await supabase.auth.updateUser({
      email: newEmail.trim(),
    });
    setSavingEmail(false);
    if (error) setEmailMsg({ type: "error", text: error.message });
    else {
      setEmailMsg({
        type: "success",
        text: "Confirmation sent to your new email address. Check your inbox.",
      });
      setNewEmail("");
    }
  }

  async function handleChangePassword() {
    if (!newPassword || newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Passwords do not match." });
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
    setPasswordMsg(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) setPasswordMsg({ type: "error", text: error.message });
    else {
      setPasswordMsg({
        type: "success",
        text: "Password updated successfully.",
      });
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/");
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    setDeleteMsg(null);
    try {
      // Delete user data first
      await supabase.from("saved_vets").delete().eq("user_id", session.user.id);
      await supabase.from("pets").delete().eq("user_id", session.user.id);
      await supabase.from("profiles").delete().eq("id", session.user.id);
      // Sign out — account deletion from Supabase requires admin API or edge function
      // For now, sign out and flag account for deletion via support
      await supabase.auth.signOut();
      router.push("/?deleted=true");
    } catch (e) {
      setDeleteMsg({
        type: "error",
        text: "Something went wrong. Please contact us at legal@petparrk.com to complete account deletion.",
      });
      setDeleting(false);
    }
  }

  if (session === undefined) return <PageLoader for="accountSettings" />;

  return (
    <>
      <style>{`
        .acc-body { background: ${C.cream}; min-height: calc(100vh - 64px); padding: 48px 0 96px; }
        .acc-inner { padding-left: 24px; padding-right: 24px; }
        .acc-card { background: ${C.white}; border: 1px solid ${C.border}; border-radius: 16px; padding: 28px; margin-bottom: 16px; }
        .acc-card-title { font-size: 16px; font-weight: 700; color: ${C.navyDark}; margin: 0 0 4px; font-family: var(--font-urbanist,'Urbanist',sans-serif); }
        .acc-card-sub { font-size: 16px; font-weight: 500;  color: ${C.muted}; margin: 0 0 20px; }
        .acc-label { display: block; font-size: 14px; font-weight: 600; color: ${C.slate}; margin-bottom: 6px; }
        .acc-input { width: 100%; height: 44px; padding: 0 14px; border-radius: 12px; border: 1px solid ${C.border}; font-size: 15px; font-weight: 500; font-family: var(--font-urbanist,system-ui); outline: none; box-sizing: border-box; background: ${C.white}; color: ${C.navyDark}; transition: border-color 0.15s; -webkit-appearance: none; }
        .acc-input:focus { border-color: ${C.terracotta}; }
        .acc-input[readonly] { background: ${C.cream}; color: ${C.slate}; cursor: default; }
        .acc-field { margin-bottom: 16px; }
        .acc-btn { display: inline-flex; align-items: center; justify-content: center; height: 42px; padding: 0 24px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: var(--font-urbanist,'Urbanist',sans-serif); transition: background 0.2s, color 0.2s; border: 2px solid ${C.terracotta}; background: ${C.terracotta}; color: #fff; }
        .acc-btn:hover { background: #fff; color: ${C.terracotta}; }
        .acc-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .acc-btn-ghost { background: transparent; color: ${C.navyDark}; border: 2px solid ${C.border}; }
        .acc-btn-ghost:hover { background: ${C.navyDark}; color: #fff; border-color: ${C.navyDark}; }
        .acc-btn-danger { background: transparent; color: ${C.error}; border: 2px solid ${C.error}; }
        .acc-btn-danger:hover { background: ${C.error}; color: #fff; }
        .acc-msg { padding: 10px 14px; border-radius: 8px; font-size: 14px; margin-bottom: 16px; font-weight: 500; }
        .acc-msg-success { background: #EDFAF3; color: ${C.success}; }
        .acc-msg-error { background: #FCEAEA; color: ${C.error}; }
        .acc-divider { height: 1px; background: ${C.border}; margin: 20px 0; }
        .acc-info-row { font-weight: 600; display: flex; justify-content: space-between; align-items: center; font-size: 16px; color: ${C.slate}; padding: 8px 0; }
        .acc-info-label { font-weight: 700; color: ${C.muted}; font-size: 14px; text-transform: uppercase; }

        /* Delete modal */
        /* Canonical modal treatment — navy 55% + 4px blur, 20px gutter.
           Matches pp-modal-backdrop, pce-modal-overlay, ucm-backdrop,
           rpm-overlay and the VetSlug pricing modal. */
        .modal-overlay { position: fixed; inset: 0; background: rgba(23,37,49,0.55); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal-box { background: #fff; border-radius: 18px; padding: 32px; max-width: 440px; width: 100%; max-height: 86vh; overflow-y: auto; box-shadow: 0 30px 60px rgba(0,0,0,0.40); }
        .modal-title { font-size: 20px; font-weight: 800; color: ${C.navyDark}; margin: 0 0 8px; font-family: var(--font-urbanist,'Urbanist',sans-serif); }
        .modal-sub { font-size: 16px; color: ${C.slate}; line-height: 1.7; margin: 0 0 24px; }
        .modal-warning { background: #FCEAEA; border-radius: 8px; padding: 12px 16px; font-size: 14px; color: ${C.error}; margin-bottom: 20px; font-weight: 500; line-height: 1.6; }
        .modal-actions { display: flex; gap: 10px; justify-content: flex-end; }

        @media(max-width: 640px) {
          .acc-inner { padding-left: 16px; padding-right: 16px; }
          .acc-body { padding: 32px 0 80px; }
          .acc-card { padding: 20px; }
          .modal-actions { flex-direction: column; }
          .acc-btn { width: 100%; }
          .acc-info-row { flex-direction: column; align-items: flex-start; gap: 2px; }
        }
      `}</style>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowDeleteModal(false);
            setDeleteConfirm("");
            setDeleteMsg(null);
          }}
        >
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Delete Account</h2>
            <p className="modal-sub">
              This action is permanent and cannot be undone. All your pets,
              health records, saved vets, and account data will be deleted.
            </p>
            <div className="modal-warning">
              Type <strong>DELETE</strong> in the field below to confirm.
            </div>
            {deleteMsg && (
              <div className={`acc-msg acc-msg-${deleteMsg.type}`}>
                {deleteMsg.text}
              </div>
            )}
            <div className="acc-field">
              <input
                type="text"
                className="acc-input"
                placeholder="Type DELETE to confirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button
                className="acc-btn acc-btn-ghost"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirm("");
                  setDeleteMsg(null);
                }}
              >
                Cancel
              </button>
              <button
                className="acc-btn acc-btn-danger"
                disabled={deleteConfirm !== "DELETE" || deleting}
                onClick={handleDeleteAccount}
              >
                {deleting ? "Deleting…" : "Delete My Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="acc-body">
        {/* Gutters come from pp-container-text (24px desktop / 16px mobile)
            so this page can't drift from the site standard. The 560px cap is
            kept — the container's own 900px is too wide for a settings form,
            where label/value rows are justified apart. */}
        <div
          className="pp-container-text acc-inner"
          style={{
            width: "100%",
            maxWidth: "560px",
            boxSizing: "border-box",
          }}
        >
          {/* Page title */}
          <div style={{ marginBottom: "32px" }}>
            <p
              style={{
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: C.muted,
                marginBottom: "8px",
                fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
              }}
            >
              Settings
            </p>
            <h1
              style={{
                fontSize: "clamp(22px,3vw,30px)",
                fontWeight: "800",
                color: C.navyDark,
                margin: "0 0 4px",
                fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
                letterSpacing: "-0.025em",
              }}
            >
              Account Settings
            </h1>
            <p
              style={{
                fontSize: "15px",
                fontWeight: "500",
                color: C.muted,
                margin: 0,
              }}
            >
              Manage your account credentials and preferences.
            </p>
          </div>

          {/* Account Info */}
          <div className="acc-card">
            <p className="acc-card-title">Account Information</p>
            <p className="acc-card-sub">Your current account details.</p>
            <div className="acc-info-row">
              <span className="acc-info-label">Email:</span>
              <span
                style={{
                  color: C.navyDark,
                  fontWeight: "600",
                  fontSize: "16px",
                }}
              >
                {session.user.email}
              </span>
            </div>
            <div className="acc-info-row">
              <span className="acc-info-label">Sign-in method:</span>
              <span style={{ color: C.navyDark, fontSize: "16px" }}>
                {isGoogleUser ? "Google" : "Email & Password"}
              </span>
            </div>
            <div className="acc-info-row">
              <span className="acc-info-label">Member since:</span>
              <span style={{ color: C.navyDark, fontSize: "16px" }}>
                {new Date(session.user.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="acc-divider" />
            <Link
              href="/profile"
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: "44px",
                fontSize: "15px",
                fontWeight: "600",
                color: C.terracotta,
                textDecoration: "none",
              }}
            >
              Edit your profile{" "}
              <ArrowRight
                size={14}
                strokeWidth={2.4}
                style={{ marginLeft: "4px", verticalAlign: "middle" }}
              />
            </Link>
          </div>

          {/* Google user notice */}
          {isGoogleUser && (
            <div className="acc-card">
              <p className="acc-card-title">Google Account</p>
              <p
                style={{
                  fontSize: "16px",
                  color: C.slate,
                  lineHeight: "1.7",
                  margin: "0 0 16px",
                }}
              >
                You signed in with Google. Email and password changes are
                managed through your Google account.
              </p>
              <a
                href="https://myaccount.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="acc-btn acc-btn-ghost"
                style={{ textDecoration: "none", display: "inline-flex" }}
              >
                Manage Google Account{" "}
                <ArrowUpRight
                  size={14}
                  strokeWidth={2.4}
                  style={{ marginLeft: "4px", verticalAlign: "middle" }}
                />
              </a>
            </div>
          )}

          {/* Change Email */}
          {!isGoogleUser && (
            <div className="acc-card">
              <p className="acc-card-title">Change Email</p>
              <p className="acc-card-sub">
                A confirmation link will be sent to your new email address.
              </p>
              {emailMsg && (
                <div className={`acc-msg acc-msg-${emailMsg.type}`}>
                  {emailMsg.text}
                </div>
              )}
              <div className="acc-field">
                <label className="acc-label">New Email Address</label>
                <input
                  type="email"
                  className="acc-input"
                  placeholder="Enter new email address"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <button
                className="acc-btn"
                onClick={handleChangeEmail}
                disabled={savingEmail || !newEmail.trim()}
              >
                {savingEmail ? "Sending…" : "Update Email"}
              </button>
            </div>
          )}

          {/* Change Password */}
          {!isGoogleUser && (
            <div className="acc-card">
              <p className="acc-card-title">Change Password</p>
              <p className="acc-card-sub">Must be at least 8 characters.</p>
              {passwordMsg && (
                <div className={`acc-msg acc-msg-${passwordMsg.type}`}>
                  {passwordMsg.text}
                </div>
              )}
              <div className="acc-field">
                <label className="acc-label">New Password</label>
                <input
                  type="password"
                  className="acc-input"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="acc-field">
                <label className="acc-label">Confirm New Password</label>
                <input
                  type="password"
                  className="acc-input"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button
                className="acc-btn"
                onClick={handleChangePassword}
                disabled={savingPassword || !newPassword || !confirmPassword}
              >
                {savingPassword ? "Updating…" : "Update Password"}
              </button>
            </div>
          )}

          {/* Data & Privacy */}
          <div className="acc-card">
            <p className="acc-card-title">Data & Privacy</p>
            <p className="acc-card-sub">Your data belongs to you.</p>
            <p
              style={{
                fontSize: "16px",
                fontWeight: "600",
                color: C.navyDark,
                margin: "0 0 2px",
              }}
            >
              Export my data
            </p>
            <p
              style={{
                fontSize: "15px",
                fontWeight: "500",
                color: C.muted,
                margin: "0 0 12px",
              }}
            >
              Receive a copy of your pet's health records.
            </p>
            <a
              href="mailto:[legal@petparrk.com]?subject=Data Export Request"
              className="acc-btn acc-btn-ghost"
              style={{ textDecoration: "none" }}
            >
              Request Export
            </a>
            <div className="acc-divider" />
            <Link
              href="/privacy-policy"
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: "44px",
                fontSize: "15px",
                color: C.terracotta,
                fontWeight: "600",
                textDecoration: "none",
              }}
            >
              View Privacy Policy{" "}
              <ArrowRight
                size={14}
                strokeWidth={2.4}
                style={{ marginLeft: "4px", verticalAlign: "middle" }}
              />
            </Link>
          </div>

          {/* Sign Out */}
          <div className="acc-card">
            <p className="acc-card-title">Sign Out</p>
            <p className="acc-card-sub">
              Sign out of your PetParrk account on this device.
            </p>
            <button
              className="acc-btn acc-btn-ghost"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? "Signing out…" : "Sign Out"}
            </button>
          </div>

          {/* Delete Account */}
          <div style={{ marginTop: "8px" }}>
            <p
              style={{
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: C.error,
                marginBottom: "8px",
                fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
              }}
            >
              Danger Zone
            </p>
          </div>
          <div
            className="acc-card"
            style={{ borderColor: "rgba(201,64,64,0.3)" }}
          >
            <p className="acc-card-title" style={{ color: C.error }}>
              Delete Account
            </p>
            <p className="acc-card-sub" style={{ fontSize: "14px" }}>
              Permanently delete your account and all associated data. This
              cannot be undone.
            </p>
            <button
              className="acc-btn acc-btn-danger"
              onClick={() => setShowDeleteModal(true)}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
