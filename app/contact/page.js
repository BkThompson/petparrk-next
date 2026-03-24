import Link from "next/link";

export default function ContactPage() {
  return (
    <>
      <style>{`
        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: start;
        }
        .contact-images { display: block; }
        @media (max-width: 768px) {
          .contact-grid { grid-template-columns: 1fr; gap: 48px; }
          .contact-images { display: none; }
        }
        .contact-reason {
          border-left: 3px solid var(--color-terracotta, #CF5C36);
          padding-left: 20px;
        }
        .contact-btn-primary {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 16px 24px; border-radius: 12px;
          text-decoration: none; font-weight: 700; font-size: 15px;
          font-family: var(--font-urbanist, 'Urbanist', sans-serif);
          background: var(--color-navy-dark, #172531); color: #fff;
          border: 2px solid var(--color-navy-dark, #172531);
          transition: opacity 0.15s ease;
        }
        .contact-btn-primary:hover { opacity: 0.88; }
        .contact-btn-secondary {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 16px 24px; border-radius: 12px;
          text-decoration: none; font-weight: 700; font-size: 15px;
          font-family: var(--font-urbanist, 'Urbanist', sans-serif);
          background: transparent;
          color: var(--color-navy-dark, #172531);
          border: 2px solid var(--color-navy-dark, #172531);
          transition: background 0.15s ease;
        }
        .contact-btn-secondary:hover { background: rgba(23,37,49,0.05); }
      `}</style>

      {/* Page header */}
      <div
        style={{
          background: "var(--color-navy-dark, #172531)",
          padding: "56px 0",
          minHeight: "180px",
          boxSizing: "border-box",
        }}
      >
        <div className="pp-container">
          <p
            style={{
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--color-gold, #EFC88B)",
              marginBottom: "8px",
            }}
          >
            Say Hello
          </p>
          <h1
            style={{
              fontSize: "clamp(24px, 4vw, 36px)",
              fontWeight: "800",
              color: "#fff",
              fontFamily: "var(--font-urbanist, 'Urbanist', sans-serif)",
              marginBottom: "8px",
            }}
          >
            Contact
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "rgba(255,255,255,0.6)",
              margin: 0,
            }}
          >
            We'd love to hear from you.
          </p>
        </div>
      </div>

      <section
        style={{ background: "var(--color-cream, #F5F0E8)", padding: "80px 0" }}
      >
        <div className="pp-container">
          <div className="contact-grid">
            {/* Left — text */}
            <div>
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--color-terracotta, #CF5C36)",
                  marginBottom: "16px",
                }}
              >
                Get in touch
              </p>
              <h2
                style={{
                  fontSize: "clamp(24px, 3vw, 34px)",
                  fontWeight: "800",
                  color: "var(--color-navy-dark, #172531)",
                  marginBottom: "20px",
                  fontFamily: "var(--font-urbanist, 'Urbanist', sans-serif)",
                  lineHeight: "1.2",
                }}
              >
                We're a small team building something we believe in.
              </h2>
              <p
                style={{
                  fontSize: "17px",
                  color: "var(--color-slate, #4B5563)",
                  lineHeight: "1.8",
                  marginBottom: "40px",
                }}
              >
                Whether you have feedback on the product, a question about your
                vet search, or you just want to tell us about your pet — we read
                everything and respond to as many messages as we can.
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "28px",
                  marginBottom: "48px",
                }}
              >
                {[
                  {
                    label: "General feedback",
                    body: "Tell us what's working, what's not, or what you wish PetParrk could do. Your feedback shapes what we build.",
                  },
                  {
                    label: "Vet partnerships",
                    body: "Are you a vet or clinic interested in being featured or partnering with us? We'd love to connect.",
                  },
                  {
                    label: "Press & media",
                    body: "Writing about pet care, health tech, or consumer startups? Reach out and we'll get back to you quickly.",
                  },
                  {
                    label: "Submit a price",
                    body: "Visited a vet recently? Help the community by submitting what you paid from that vet's profile page.",
                  },
                ].map((item) => (
                  <div key={item.label} className="contact-reason">
                    <p
                      style={{
                        fontSize: "15px",
                        fontWeight: "700",
                        color: "var(--color-navy-dark, #172531)",
                        marginBottom: "4px",
                        fontFamily:
                          "var(--font-urbanist, 'Urbanist', sans-serif)",
                      }}
                    >
                      {item.label}
                    </p>
                    <p
                      style={{
                        fontSize: "14px",
                        color: "var(--color-slate, #4B5563)",
                        lineHeight: "1.7",
                        margin: 0,
                      }}
                    >
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <a
                  href="mailto:info@petparrk.com"
                  className="contact-btn-primary"
                >
                  ✉️ info@petparrk.com
                </a>
                <a
                  href="mailto:support@petparrk.com"
                  className="contact-btn-secondary"
                >
                  💬 support@petparrk.com
                </a>
              </div>
            </div>

            {/* Right — image placeholders, hidden on mobile */}
            <div className="contact-images">
              {/* Main large placeholder */}
              <div
                style={{
                  width: "100%",
                  aspectRatio: "4/5",
                  background:
                    "linear-gradient(160deg, #2C4657 0%, #172531 100%)",
                  borderRadius: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    color: "rgba(255,255,255,0.25)",
                  }}
                >
                  <div style={{ fontSize: "64px", marginBottom: "12px" }}>
                    🐾
                  </div>
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      margin: 0,
                    }}
                  >
                    Photo coming soon
                  </p>
                </div>
              </div>
              {/* Two smaller placeholders */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                {[
                  { emoji: "🐶", label: "Dog" },
                  { emoji: "🐱", label: "Cat" },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      aspectRatio: "1",
                      background: "var(--color-border, #EDE8E0)",
                      borderRadius: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div style={{ fontSize: "36px" }}>{item.emoji}</div>
                    <p
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        color: "var(--color-muted, #9CA3AF)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        margin: 0,
                      }}
                    >
                      Photo coming soon
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        style={{
          background: "var(--color-navy-dark, #172531)",
          paddingTop: "48px",
          paddingBottom: "0",
          paddingLeft: "20px",
          paddingRight: "20px",
        }}
      >
        <div
          className="pp-container-text"
          style={{ textAlign: "center", paddingBottom: "48px" }}
        >
          <p
            style={{
              fontSize: "17px",
              color: "rgba(255,255,255,0.7)",
              lineHeight: "1.7",
              marginBottom: "24px",
            }}
          >
            Not sure where to start? Browse our vet directory — no account
            required.
          </p>
          <Link
            href="/vets"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "14px 32px",
              background: "var(--color-terracotta, #CF5C36)",
              color: "#fff",
              borderRadius: "12px",
              fontSize: "15px",
              fontWeight: "700",
              textDecoration: "none",
              fontFamily: "var(--font-urbanist, 'Urbanist', sans-serif)",
            }}
          >
            Find a Vet →
          </Link>
        </div>
        <div
          style={{
            height: "1px",
            background:
              "linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,0.2) 20%, rgba(255,255,255,0.2) 80%, rgba(255,255,255,0))",
            margin: "0 24px",
          }}
        />
      </section>
    </>
  );
}
