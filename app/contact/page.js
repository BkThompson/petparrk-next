import Link from "next/link";

export default function ContactPage() {
  return (
    <>
      {/* Page header */}
      <div
        style={{
          background: "var(--color-navy-dark, #172531)",
          padding: "56px 0",
          minHeight: "180px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px" }}
        >
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
        <div
          style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 480px), 1fr))",
              gap: "60px",
              alignItems: "start",
            }}
          >
            {/* Left — text content */}
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
                  fontSize: "clamp(26px, 3vw, 36px)",
                  fontWeight: "800",
                  color: "var(--color-navy-dark, #172531)",
                  marginBottom: "24px",
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

              {/* Contact reasons */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "32px",
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
                    body: "Writing about pet care, health tech, or Bay Area startups? Reach out and we'll get back to you quickly.",
                  },
                  {
                    label: "Submit a price",
                    body: "Visited a vet recently? Help the community by submitting what you paid from that vet's profile page.",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      borderLeft: "3px solid var(--color-terracotta, #CF5C36)",
                      paddingLeft: "20px",
                    }}
                  >
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

              {/* Email CTAs */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <a
                  href="mailto:info@petparrk.com"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "16px 24px",
                    background: "var(--color-navy-dark, #172531)",
                    color: "#fff",
                    borderRadius: "12px",
                    textDecoration: "none",
                    fontFamily: "var(--font-urbanist, 'Urbanist', sans-serif)",
                    fontWeight: "700",
                    fontSize: "15px",
                    border: "2px solid var(--color-navy-dark, #172531)",
                  }}
                >
                  <span>✉️</span> info@petparrk.com
                </a>
                <a
                  href="mailto:support@petparrk.com"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "15px 24px",
                    background: "var(--color-terracotta, #CF5C36)",
                    color: "#fff",
                    border: "2px solid var(--color-terracotta, #CF5C36)",
                    borderRadius: "12px",
                    textDecoration: "none",
                    fontFamily: "var(--font-urbanist, 'Urbanist', sans-serif)",
                    fontWeight: "700",
                    fontSize: "15px",
                  }}
                >
                  <span>🛟</span> support@petparrk.com
                </a>
              </div>
            </div>

            {/* Right — image placeholder */}
            <div style={{ position: "relative" }}>
              {/* Main image placeholder */}
              <div
                style={{
                  width: "100%",
                  aspectRatio: "4/5",
                  background:
                    "linear-gradient(135deg, #2C4657 0%, #172531 100%)",
                  borderRadius: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  <div style={{ fontSize: "64px", marginBottom: "12px" }}>
                    🐾
                  </div>
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    Photo coming soon
                  </p>
                </div>
                {/* Decorative overlay */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "24px",
                    left: "24px",
                    right: "24px",
                  }}
                >
                  <p
                    style={{
                      color: "rgba(255,255,255,0.9)",
                      fontSize: "18px",
                      fontWeight: "800",
                      fontFamily:
                        "var(--font-urbanist, 'Urbanist', sans-serif)",
                      lineHeight: "1.3",
                      margin: 0,
                    }}
                  >
                    "Real prices. Real vets. No surprises."
                  </p>
                </div>
              </div>

              {/* Two smaller image placeholders */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                {["🐶", "🐱"].map((emoji, i) => (
                  <div
                    key={i}
                    style={{
                      aspectRatio: "1",
                      background: "var(--color-border, #EDE8E0)",
                      borderRadius: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "40px",
                    }}
                  >
                    {emoji}
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
          padding: "60px 0",
        }}
      >
        <div
          style={{
            maxWidth: "800px",
            margin: "0 auto",
            padding: "0 24px",
            textAlign: "center",
          }}
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
      </section>
    </>
  );
}
