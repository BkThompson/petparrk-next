import Link from "next/link";

export default function AboutPage() {
  return (
    <>
      <style>{`
        .about-value-card {
          background: #fff;
          border: 1px solid var(--color-border, #EDE8E0);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(23,37,49,0.05);
        }
        .about-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }
        .about-problem-card {
          background: #fff;
          border: 1px solid var(--color-border, #EDE8E0);
          border-radius: 16px;
          padding: 28px 24px;
          box-shadow: 0 2px 8px rgba(23,37,49,0.05);
        }
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
            Our Story
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
            About PetParrk
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "rgba(255,255,255,0.6)",
              margin: 0,
            }}
          >
            Built in Oakland. Built for pet owners.
          </p>
        </div>
      </div>

      {/* Mission section */}
      <section
        style={{ background: "var(--color-cream, #F5F0E8)", padding: "72px 0" }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 24px" }}>
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
            Why we exist
          </p>
          <h2
            style={{
              fontSize: "clamp(26px, 4vw, 40px)",
              fontWeight: "800",
              color: "var(--color-navy-dark, #172531)",
              lineHeight: "1.2",
              marginBottom: "24px",
              fontFamily: "var(--font-urbanist, 'Urbanist', sans-serif)",
            }}
          >
            Pet care shouldn't feel like a guessing game.
          </h2>
          <p
            style={{
              fontSize: "17px",
              color: "var(--color-slate, #4B5563)",
              lineHeight: "1.8",
              marginBottom: "20px",
            }}
          >
            PetParrk started with a simple frustration — the kind every pet
            owner knows. You call a vet, ask about pricing, and hear "it
            depends." You search online and find conflicting, scary information.
            You wonder if what your pet is doing is normal or an emergency. And
            every time, you're left guessing.
          </p>
          <p
            style={{
              fontSize: "17px",
              color: "var(--color-slate, #4B5563)",
              lineHeight: "1.8",
              marginBottom: "20px",
            }}
          >
            We built PetParrk to change that. Starting in the East Bay — Oakland
            and Berkeley — we're building a platform that gives pet owners real
            information: real prices from real vets, AI-powered guidance when
            you're not sure what's wrong, and a place to track your pet's health
            over time.
          </p>
          <p
            style={{
              fontSize: "17px",
              color: "var(--color-slate, #4B5563)",
              lineHeight: "1.8",
            }}
          >
            No paywalls. No ads. No surprises. Just honest, transparent tools to
            help you make better decisions for your pet.
          </p>
        </div>
      </section>

      {/* Problems we solve */}
      <section style={{ background: "#fff", padding: "72px 0" }}>
        <div
          style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px" }}
        >
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <p
              style={{
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--color-terracotta, #CF5C36)",
                marginBottom: "12px",
              }}
            >
              The problem
            </p>
            <h2
              style={{
                fontSize: "clamp(24px, 3vw, 32px)",
                fontWeight: "800",
                color: "var(--color-navy-dark, #172531)",
                fontFamily: "var(--font-urbanist, 'Urbanist', sans-serif)",
              }}
            >
              Three things that shouldn't be this hard
            </h2>
          </div>
          <div className="about-grid">
            {[
              {
                emoji: "💸",
                title: "Knowing what you'll pay",
                body: "Vet prices vary wildly and are almost never published upfront. Most pet owners only find out what something costs after it's already done. We publish real, verified prices so you can compare before you go.",
              },
              {
                emoji: "🤔",
                title: "Knowing when to worry",
                body: "Is your dog vomiting because they ate grass, or is it something serious? At 2am, there's no good answer. Our symptom checker gives you instant triage guidance — not a diagnosis, but real direction when you need it most.",
              },
              {
                emoji: "📋",
                title: "Keeping it all together",
                body: "Vaccination records, vet notes, health history — it's scattered across paper files, PDFs, and your vet's system that you can't access. We give you one place to build and own your pet's health story.",
              },
            ].map((item) => (
              <div key={item.title} className="about-problem-card">
                <div style={{ fontSize: "36px", marginBottom: "16px" }}>
                  {item.emoji}
                </div>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "var(--color-navy-dark, #172531)",
                    marginBottom: "10px",
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
        </div>
      </section>

      {/* Values */}
      <section
        style={{ background: "var(--color-cream, #F5F0E8)", padding: "72px 0" }}
      >
        <div
          style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px" }}
        >
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <p
              style={{
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--color-terracotta, #CF5C36)",
                marginBottom: "12px",
              }}
            >
              What we believe
            </p>
            <h2
              style={{
                fontSize: "clamp(24px, 3vw, 32px)",
                fontWeight: "800",
                color: "var(--color-navy-dark, #172531)",
                fontFamily: "var(--font-urbanist, 'Urbanist', sans-serif)",
              }}
            >
              Our values
            </h2>
          </div>
          <div className="about-grid">
            {[
              {
                emoji: "🐾",
                title: "Pet owners first",
                body: "Every decision we make starts with one question: does this help the pet owner? Not the vet, not the advertiser, not us.",
              },
              {
                emoji: "🔍",
                title: "Transparency always",
                body: "Honest pricing, clear information, no hidden agendas. We show our work and tell you where our data comes from.",
              },
              {
                emoji: "🌱",
                title: "Prevention over reaction",
                body: "The best vet visit is the one you didn't need to panic about. We're building tools that help you stay ahead.",
              },
              {
                emoji: "🤝",
                title: "Community over competition",
                body: "We're not replacing vets — we're helping you work with them better. Great vets deserve to be found. Pet owners deserve to find them.",
              },
              {
                emoji: "🔓",
                title: "Accessibility for all",
                body: "Pet care shouldn't be a privilege. We're keeping the core platform free and fighting to make information that's always existed behind phone calls available to everyone.",
              },
            ].map((item) => (
              <div key={item.title} className="about-value-card">
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
        </div>
      </section>

      {/* Vision + CTA */}
      <section
        style={{
          background: "var(--color-navy-mid, #2C4657)",
          padding: "72px 0",
        }}
      >
        <div
          style={{
            maxWidth: "720px",
            margin: "0 auto",
            padding: "0 24px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--color-gold, #EFC88B)",
              marginBottom: "16px",
            }}
          >
            Where we're going
          </p>
          <h2
            style={{
              fontSize: "clamp(24px, 4vw, 36px)",
              fontWeight: "800",
              color: "#fff",
              lineHeight: "1.2",
              marginBottom: "20px",
              fontFamily: "var(--font-urbanist, 'Urbanist', sans-serif)",
            }}
          >
            Every pet owner's trusted companion for confident, informed care.
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "rgba(255,255,255,0.7)",
              lineHeight: "1.7",
              marginBottom: "36px",
            }}
          >
            We're starting in Oakland and Berkeley and expanding across the Bay
            Area and beyond. If you're a pet owner, a vet, or just someone who
            thinks this problem matters — we'd love to hear from you.
          </p>
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/vets"
              style={{
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
              Find a Vet
            </Link>
            <Link
              href="/contact"
              style={{
                padding: "13px 32px",
                background: "transparent",
                color: "#fff",
                border: "2px solid rgba(255,255,255,0.4)",
                borderRadius: "12px",
                fontSize: "15px",
                fontWeight: "700",
                textDecoration: "none",
                fontFamily: "var(--font-urbanist, 'Urbanist', sans-serif)",
              }}
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
