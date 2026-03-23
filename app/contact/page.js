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
        style={{ background: "var(--color-cream, #F5F0E8)", padding: "72px 0" }}
      >
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 24px" }}>
          <p
            style={{
              fontSize: "17px",
              color: "var(--color-slate, #4B5563)",
              lineHeight: "1.8",
              marginBottom: "48px",
            }}
          >
            PetParrk is a small team with big ambitions. Whether you have
            feedback, a question, or just want to share your experience — we
            read every message and respond to as many as we can.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
              marginBottom: "56px",
            }}
          >
            {[
              {
                emoji: "💬",
                title: "General feedback",
                body: "Tell us what's working, what's not, or what you wish PetParrk could do. Your feedback directly shapes what we build next.",
              },
              {
                emoji: "🏥",
                title: "Vet partnerships",
                body: "Are you a vet or clinic interested in being featured or partnering with PetParrk? We'd love to talk.",
              },
              {
                emoji: "📰",
                title: "Press & media",
                body: "Writing about pet care, health tech, or local startups? Reach out and we'll get back to you quickly.",
              },
              {
                emoji: "🐾",
                title: "Submit a price",
                body: "Visited a vet recently? Help the community by submitting what you paid. Find the vet on our directory and submit directly from their profile.",
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  background: "#fff",
                  border: "1px solid var(--color-border, #EDE8E0)",
                  borderRadius: "16px",
                  padding: "24px",
                  boxShadow: "0 2px 8px rgba(23,37,49,0.05)",
                }}
              >
                <div style={{ fontSize: "28px", marginBottom: "12px" }}>
                  {item.emoji}
                </div>
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: "700",
                    color: "var(--color-navy-dark, #172531)",
                    marginBottom: "8px",
                    fontFamily: "var(--font-urbanist, 'Urbanist', sans-serif)",
                  }}
                >
                  {item.title}
                </h3>
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

          {/* Email CTA */}
          <div
            style={{
              background: "var(--color-navy-dark, #172531)",
              borderRadius: "20px",
              padding: "40px 36px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "36px", marginBottom: "16px" }}>✉️</div>
            <h2
              style={{
                fontSize: "22px",
                fontWeight: "800",
                color: "#fff",
                marginBottom: "10px",
                fontFamily: "var(--font-urbanist, 'Urbanist', sans-serif)",
              }}
            >
              Drop us a line
            </h2>
            <p
              style={{
                fontSize: "15px",
                color: "rgba(255,255,255,0.65)",
                lineHeight: "1.7",
                marginBottom: "24px",
              }}
            >
              For anything else, email us directly. We're a small team so
              responses may take a day or two — but we do respond.
            </p>
            <a
              href="mailto:hello@petparrk.com"
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
              hello@petparrk.com
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
