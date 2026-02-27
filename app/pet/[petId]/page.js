"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";

export default function PetCardPage() {
  const { petId } = useParams();
  const [pet, setPet] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!petId) return;
    async function fetchPet() {
      const { data: petData, error } = await supabase
        .from("pets")
        .select("*")
        .eq("id", petId)
        .single();

      if (error || !petData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setPet(petData);

      const { data: contactData } = await supabase
        .from("pet_emergency_contacts")
        .select("*")
        .eq("pet_id", petId);
      setContacts(contactData || []);
      setLoading(false);
    }
    fetchPet();
  }, [petId]);

  function formatPhone(phone) {
    if (!phone) return null;
    const d = phone.replace(/\D/g, "");
    if (d.length === 10)
      return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    if (d.length === 11 && d[0] === "1")
      return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
    return phone;
  }

  const calcAge = (birthday) => {
    if (!birthday) return null;
    const years = Math.floor(
      (Date.now() - new Date(birthday).getTime()) / (1000 * 60 * 60 * 24 * 365)
    );
    return years === 0
      ? "< 1 year old"
      : years === 1
      ? "1 year old"
      : `${years} years old`;
  };

  const speciesEmoji = (s) =>
    s === "Dog"
      ? "🐶"
      : s === "Cat"
      ? "🐱"
      : s === "Bird"
      ? "🐦"
      : s === "Rabbit"
      ? "🐰"
      : "🐾";

  function handleCopy() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    window.print();
  }

  const [pageUrl, setPageUrl] = useState("");
  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);
  const qrUrl = pageUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
        pageUrl
      )}`
    : null;

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontFamily: "system-ui, sans-serif",
          color: "#888",
        }}
      >
        Loading...
      </div>
    );

  if (notFound)
    return (
      <div
        style={{
          maxWidth: "500px",
          margin: "80px auto",
          padding: "20px",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "48px", margin: "0 0 16px 0" }}>🐾</p>
        <h1 style={{ color: "#111", margin: "0 0 8px 0" }}>Pet not found</h1>
        <p style={{ color: "#888" }}>
          This medical card link may be invalid or has been removed.
        </p>
        <Link href="/" style={{ color: "#2d6a4f", fontSize: "14px" }}>
          ← Back to PetParrk
        </Link>
      </div>
    );

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .card { box-shadow: none !important; border: 1px solid #ccc !important; }
        }
        .info-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #aaa; width: 110px; flex-shrink: 0; padding-top: 1px; }
        .info-value { font-size: 14px; color: #222; flex: 1; line-height: 1.4; }
        .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #aaa; margin: 20px 0 10px 0; }
        .alert-pill { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; margin-right: 6px; margin-bottom: 4px; }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "#f5f5f0",
          fontFamily: "system-ui, sans-serif",
          padding: "24px 16px 60px 16px",
        }}
      >
        {/* Top bar — no print */}
        <div
          className="no-print"
          style={{
            maxWidth: "600px",
            margin: "0 auto 16px auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
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
            🐾 PetParrk
          </Link>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleCopy}
              style={{
                padding: "6px 14px",
                background: "#fff",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "13px",
                cursor: "pointer",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {copied ? "✅ Copied!" : "🔗 Copy Link"}
            </button>
            <button
              onClick={handlePrint}
              style={{
                padding: "6px 14px",
                background: "#2d6a4f",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "13px",
                cursor: "pointer",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              🖨️ Print
            </button>
          </div>
        </div>

        {/* Medical Card */}
        <div
          className="card"
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            background: "#fff",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "#2d6a4f",
              padding: "24px 24px 20px 24px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                margin: "0 0 4px 0",
                fontSize: "11px",
                color: "rgba(255,255,255,0.7)",
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontWeight: "600",
              }}
            >
              🏥 Pet Medical Card
            </p>

            {/* Pet photo */}
            <div
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                margin: "12px auto",
                border: "3px solid rgba(255,255,255,0.4)",
                overflow: "hidden",
                background: "rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "36px",
              }}
            >
              {pet.photo_url ? (
                <img
                  src={pet.photo_url}
                  alt={pet.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                speciesEmoji(pet.species)
              )}
            </div>

            <h1
              style={{
                margin: "0 0 4px 0",
                fontSize: "1.6rem",
                color: "#fff",
                fontWeight: "800",
              }}
            >
              Hi, I'm {pet.name}! {speciesEmoji(pet.species)}
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                color: "rgba(255,255,255,0.8)",
              }}
            >
              {[
                pet.breed,
                pet.birthday ? calcAge(pet.birthday) : null,
                pet.weight_lbs ? `${pet.weight_lbs} lbs` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          <div style={{ padding: "20px 24px" }}>
            {/* Medical Info */}
            {(pet.allergies || pet.medications || pet.microchip_number) && (
              <>
                <p className="section-title">🏥 Medical Info</p>

                {pet.allergies && (
                  <div className="info-row">
                    <span className="info-label">⚠️ Allergies</span>
                    <span
                      className="info-value"
                      style={{ color: "#c62828", fontWeight: "600" }}
                    >
                      {pet.allergies}
                    </span>
                  </div>
                )}
                {pet.medications && (
                  <div className="info-row">
                    <span className="info-label">💊 Medications</span>
                    <span className="info-value">{pet.medications}</span>
                  </div>
                )}
                {pet.microchip_number && (
                  <div className="info-row">
                    <span className="info-label">🔖 Microchip</span>
                    <span
                      className="info-value"
                      style={{ fontFamily: "monospace", fontSize: "13px" }}
                    >
                      {pet.microchip_number}
                    </span>
                  </div>
                )}
                {pet.notes && (
                  <div className="info-row">
                    <span className="info-label">📝 Notes</span>
                    <span
                      className="info-value"
                      style={{ fontStyle: "italic", color: "#555" }}
                    >
                      {pet.notes}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Owner Contact */}
            {(pet.owner_name || pet.owner_phone || pet.owner_email) && (
              <>
                <p className="section-title">👤 Owner Contact</p>
                {pet.owner_name && (
                  <div className="info-row">
                    <span className="info-label">Name</span>
                    <span className="info-value" style={{ fontWeight: "600" }}>
                      {pet.owner_name}
                    </span>
                  </div>
                )}
                {pet.owner_phone && (
                  <div className="info-row">
                    <span className="info-label">Phone</span>
                    <span className="info-value">
                      <a
                        href={`tel:${pet.owner_phone}`}
                        style={{
                          color: "#2d6a4f",
                          fontWeight: "600",
                          textDecoration: "none",
                          fontSize: "15px",
                        }}
                      >
                        📞 {formatPhone(pet.owner_phone)}
                      </a>
                    </span>
                  </div>
                )}
                {pet.owner_email && (
                  <div className="info-row">
                    <span className="info-label">Email</span>
                    <span className="info-value">
                      <a
                        href={`mailto:${pet.owner_email}`}
                        style={{ color: "#2d6a4f", textDecoration: "none" }}
                      >
                        ✉️ {pet.owner_email}
                      </a>
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Emergency Contacts */}
            {contacts.length > 0 && (
              <>
                <p className="section-title">🚨 Emergency Contacts</p>
                {contacts.map((c) => (
                  <div key={c.id} className="info-row">
                    <span className="info-label">
                      {c.relationship || "Contact"}
                    </span>
                    <span className="info-value">
                      <span style={{ fontWeight: "600" }}>{c.name}</span>
                      {c.phone && (
                        <a
                          href={`tel:${c.phone}`}
                          style={{
                            display: "block",
                            color: "#2d6a4f",
                            textDecoration: "none",
                            marginTop: "2px",
                          }}
                        >
                          📞 {formatPhone(c.phone)}
                        </a>
                      )}
                    </span>
                  </div>
                ))}
              </>
            )}

            {/* QR Code + footer */}
            <div
              style={{
                marginTop: "24px",
                paddingTop: "20px",
                borderTop: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              <div>
                <p
                  style={{
                    margin: "0 0 4px 0",
                    fontSize: "12px",
                    color: "#aaa",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Scan to view card
                </p>
                <p style={{ margin: 0, fontSize: "11px", color: "#ccc" }}>
                  Powered by PetParrk
                </p>
              </div>
              <div style={{ textAlign: "center" }}>
                {qrUrl && (
                  <img
                    src={qrUrl}
                    alt="QR code"
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "8px",
                      border: "1px solid #eee",
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p
          className="no-print"
          style={{
            maxWidth: "600px",
            margin: "16px auto 0 auto",
            textAlign: "center",
            fontSize: "12px",
            color: "#bbb",
          }}
        >
          This card was shared by the pet owner.{" "}
          <Link href="/" style={{ color: "#2d6a4f", textDecoration: "none" }}>
            Create your own on PetParrk →
          </Link>
        </p>
      </div>
    </>
  );
}
