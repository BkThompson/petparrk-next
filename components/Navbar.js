"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import Link from "next/link";

export default function Navbar() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(null);
  const [avatarError, setAvatarError] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setProfileAvatarUrl(data.avatar_url);
      });
  }, [session]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    setShowDropdown(false);
    await supabase.auth.signOut();
    router.push("/auth");
  }

  if (!session) return null;

  const avatarLetter = session.user.email?.[0]?.toUpperCase();
  const avatarUrl =
    (!avatarError &&
      (profileAvatarUrl || session.user.user_metadata?.avatar_url)) ||
    null;

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <div
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          background: avatarUrl ? "transparent" : "#2d6a4f",
          color: "#fff",
          fontSize: "13px",
          fontWeight: "700",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          overflow: "hidden",
          border: avatarUrl ? "2px solid #ddd" : "none",
          flexShrink: 0,
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="avatar"
            onError={() => setAvatarError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          avatarLetter
        )}
      </div>

      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: "40px",
            right: 0,
            background: "#fff",
            border: "1px solid #e0e0e0",
            borderRadius: "10px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            minWidth: "190px",
            zIndex: 1000,
            overflow: "hidden",
            textAlign: "left",
          }}
        >
          <div
            style={{ padding: "10px 16px", borderBottom: "1px solid #f0f0f0" }}
          >
            <p style={{ margin: 0, fontSize: "11px", color: "#888" }}>
              Signed in as
            </p>
            <p
              style={{
                margin: "2px 0 0 0",
                fontSize: "13px",
                fontWeight: "600",
                color: "#333",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "160px",
              }}
            >
              {session.user.email}
            </p>
          </div>
          {[
            { href: "/profile", label: "👤 My Profile" },
            { href: "/saved", label: "❤️ Saved Vets" },
            { href: "/account", label: "⚙️ Account" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setShowDropdown(false)}
              style={{
                display: "block",
                padding: "10px 16px",
                fontSize: "13px",
                color: "#333",
                textDecoration: "none",
                textAlign: "left",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#f5f5f5")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {label}
            </Link>
          ))}
          <div style={{ borderTop: "1px solid #f0f0f0" }}>
            <button
              onClick={handleSignOut}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 16px",
                textAlign: "left",
                background: "none",
                border: "none",
                fontSize: "13px",
                cursor: "pointer",
                color: "#555",
                fontFamily: "system-ui, sans-serif",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#f5f5f5")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
