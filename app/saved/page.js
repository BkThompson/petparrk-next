"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

function formatPrice(low, high) {
  if (!low) return null;
  if (low === high) return `$${Number(low).toLocaleString()}`;
  return `$${Number(low).toLocaleString()}–$${Number(high).toLocaleString()}`;
}

export default function SavedPage() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [savedVets, setSavedVets] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState(new Set());
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) router.push("/auth");
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
      if (!session) router.push("/auth");
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!session) return;
    async function fetchSaved() {
      const { data: savedData } = await supabase
        .from("saved_vets")
        .select("vet_id, saved_at")
        .eq("user_id", session.user.id);
      if (!savedData || savedData.length === 0) {
        setSavedVets([]);
        setLoading(false);
        return;
      }
      const vetIds = savedData.map((s) => s.vet_id);
      const { data: vetData } = await supabase
        .from("vets")
        .select("*")
        .in("id", vetIds);
      const { data: priceData } = await supabase
        .from("vet_prices")
        .select("*, services(name)")
        .in("vet_id", vetIds);
      const priceMap = {};
      priceData?.forEach((p) => {
        if (!priceMap[p.vet_id]) priceMap[p.vet_id] = [];
        priceMap[p.vet_id].push(p);
      });
      setSavedVets(vetData || []);
      setPrices(priceMap);
      setLoading(false);
    }
    fetchSaved();
  }, [session]);

  async function handleUnsave(vetId) {
    // Start remove animation
    setRemovingIds((prev) => new Set([...prev, vetId]));

    // Wait for animation to finish, then remove from DB and state
    setTimeout(async () => {
      await supabase
        .from("saved_vets")
        .delete()
        .eq("user_id", session.user.id)
        .eq("vet_id", vetId);
      setSavedVets((prev) => prev.filter((v) => v.id !== vetId));
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(vetId);
        return next;
      });
    }, 400);
  }

  async function handleSignOut() {
    setShowDropdown(false);
    await supabase.auth.signOut();
    router.push("/auth");
  }

  const avatarLetter = session?.user?.email?.[0]?.toUpperCase();

  if (session === undefined) return null;

  return (
    <>
      <style>{`
        @keyframes heartPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.5); }
          70%  { transform: scale(0.85); }
          100% { transform: scale(1); }
        }
        .heart-btn { transition: transform 0.1s; border: none; background: none; cursor: pointer; padding: 0; font-size: 20px; line-height: 1; }
        .heart-btn:hover { transform: scale(1.15); }

        .vet-card {
          border: 1px solid #ddd;
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 12px;
          background: #ffffff;
          overflow: hidden;
          max-height: 400px;
          opacity: 1;
          transform: translateY(0);
          transition: max-height 0.4s ease, opacity 0.3s ease, transform 0.4s ease, margin-bottom 0.4s ease, padding 0.4s ease;
        }
        .vet-card.removing {
          max-height: 0;
          opacity: 0;
          transform: translateY(-8px);
          margin-bottom: 0;
          padding-top: 0;
          padding-bottom: 0;
        }

        .avatar-dropdown-item { display: block; width: 100%; padding: 10px 16px; text-align: left; background: none; border: none; font-size: 13px; cursor: pointer; color: #333; white-space: nowrap; box-sizing: border-box; }
        .avatar-dropdown-item:hover { background: #f5f5f5; }
        .avatar-dropdown-item.danger { color: #555; }
        .avatar-dropdown-item.danger:hover { background: #f5f5f5; }
      `}</style>

      <div
        style={{
          maxWidth: "860px",
          margin: "0 auto",
          padding: "20px",
          fontFamily: "system-ui, sans-serif",
          minHeight: "100vh",
        }}
      >
        {/* Top nav */}
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

          {session !== undefined && session && (
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <div
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "#2d6a4f",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                {avatarLetter}
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
                    minWidth: "180px",
                    zIndex: 100,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 16px",
                      borderBottom: "1px solid #f0f0f0",
                    }}
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
                  <Link
                    href="/saved"
                    onClick={() => setShowDropdown(false)}
                    style={{
                      display: "block",
                      padding: "10px 16px",
                      fontSize: "13px",
                      color: "#333",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f5f5f5")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "none")
                    }
                  >
                    ❤️ Saved Vets
                  </Link>
                  <div style={{ borderTop: "1px solid #f0f0f0" }}>
                    <button
                      onClick={handleSignOut}
                      className="avatar-dropdown-item danger"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <h1
            style={{
              margin: "0 0 4px 0",
              color: "#2d6a4f",
              fontSize: "1.6rem",
            }}
          >
            ❤️ Saved Vets
          </h1>
          <p style={{ margin: 0, color: "#888", fontSize: "14px" }}>
            Vets you've saved for later
          </p>
        </div>

        {loading && <p style={{ color: "#888" }}>Loading...</p>}

        {!loading && savedVets.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              background: "#fff",
              borderRadius: "12px",
              border: "1px solid #ddd",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🐾</div>
            <h2
              style={{ margin: "0 0 8px 0", color: "#333", fontSize: "1.2rem" }}
            >
              No saved vets yet
            </h2>
            <p
              style={{ margin: "0 0 20px 0", color: "#888", fontSize: "14px" }}
            >
              Tap the 🤍 on any vet to save them here.
            </p>
            <Link
              href="/"
              style={{
                display: "inline-block",
                padding: "10px 24px",
                background: "#2d6a4f",
                color: "#fff",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              Browse Vets
            </Link>
          </div>
        )}

        {/* Saved Vet Cards */}
        {savedVets.map((vet) => {
          const vetPrices = prices[vet.id] || [];
          const exam = vetPrices.find(
            (p) => p.services?.name === "Doctor Exam"
          );
          const dental = vetPrices.find(
            (p) => p.services?.name === "Dental Cleaning"
          );
          const spay = vetPrices.find(
            (p) => p.services?.name === "Spay (~40lb dog)"
          );
          const neuter = vetPrices.find(
            (p) => p.services?.name === "Neuter (~40lb dog)"
          );
          const isRemoving = removingIds.has(vet.id);

          return (
            <div
              key={vet.id}
              className={`vet-card${isRemoving ? " removing" : ""}`}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>
                    <Link
                      href={`/vet/${vet.slug}`}
                      style={{ color: "#111", textDecoration: "none" }}
                    >
                      {vet.name}
                    </Link>
                  </h2>
                  <p
                    style={{
                      margin: "0 0 2px 0",
                      color: "#666",
                      fontSize: "13px",
                    }}
                  >
                    {vet.neighborhood}
                  </p>
                  <p style={{ margin: "0", fontSize: "13px" }}>
                    <a
                      href={`tel:${vet.phone}`}
                      style={{ color: "#666", textDecoration: "none" }}
                    >
                      {vet.phone}
                    </a>
                  </p>
                </div>
              </div>

              {!exam && !dental && !spay && !neuter ? (
                <p
                  style={{
                    margin: "12px 0 0 0",
                    fontSize: "13px",
                    color: "#999",
                    fontStyle: "italic",
                  }}
                >
                  No pricing available
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  {exam && (
                    <div
                      style={{
                        background: "#f0f0f0",
                        borderRadius: "6px",
                        padding: "6px 10px",
                        fontSize: "13px",
                      }}
                    >
                      <span style={{ color: "#666" }}>Exam </span>
                      <span style={{ fontWeight: "bold", color: "#111" }}>
                        {formatPrice(exam.price_low, exam.price_high)}
                      </span>
                    </div>
                  )}
                  {dental && (
                    <div
                      style={{
                        background: "#f0f0f0",
                        borderRadius: "6px",
                        padding: "6px 10px",
                        fontSize: "13px",
                      }}
                    >
                      <span style={{ color: "#666" }}>Dental </span>
                      <span style={{ fontWeight: "bold", color: "#111" }}>
                        {formatPrice(dental.price_low, dental.price_high)}
                      </span>
                    </div>
                  )}
                  {spay && (
                    <div
                      style={{
                        background: "#f0f0f0",
                        borderRadius: "6px",
                        padding: "6px 10px",
                        fontSize: "13px",
                      }}
                    >
                      <span style={{ color: "#666" }}>Spay </span>
                      <span style={{ fontWeight: "bold", color: "#111" }}>
                        {formatPrice(spay.price_low, spay.price_high)}
                      </span>
                    </div>
                  )}
                  {neuter && (
                    <div
                      style={{
                        background: "#f0f0f0",
                        borderRadius: "6px",
                        padding: "6px 10px",
                        fontSize: "13px",
                      }}
                    >
                      <span style={{ color: "#666" }}>Neuter </span>
                      <span style={{ fontWeight: "bold", color: "#111" }}>
                        {formatPrice(neuter.price_low, neuter.price_high)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom row — heart */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "10px",
                  borderTop: "1px solid #f0f0f0",
                  paddingTop: "8px",
                }}
              >
                <button
                  onClick={() => handleUnsave(vet.id)}
                  title="Remove from saved"
                  className="heart-btn"
                >
                  ❤️
                </button>
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <footer
          style={{
            marginTop: "60px",
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
          <p style={{ margin: "0 0 8px 0" }}>
            Real prices. Real vets. No surprises.
          </p>
          <p style={{ margin: "0" }}>
            Questions or feedback?{" "}
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
