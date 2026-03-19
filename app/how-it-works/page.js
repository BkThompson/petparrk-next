"use client";

export default function HowItWorksPage() {
  return (
    <div
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "60px 20px 80px",
        fontFamily: "var(--font, 'Urbanist', sans-serif)",
      }}
    >
      <div style={{ maxWidth: "720px", margin: "0 auto", textAlign: "center" }}>
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
          How It Works
        </p>
        <h1
          style={{
            fontSize: "clamp(28px, 5vw, 44px)",
            fontWeight: "800",
            color: "var(--color-navy-dark, #172531)",
            lineHeight: "1.15",
            marginBottom: "20px",
          }}
        >
          Vet care without the surprises.
        </h1>
        <p
          style={{
            fontSize: "18px",
            color: "var(--color-slate, #4B5563)",
            lineHeight: "1.7",
            marginBottom: "60px",
          }}
        >
          PetParrk helps you find the right vet, know what you'll pay, and stay
          on top of your pet's health — all in one place.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "24px",
          marginBottom: "60px",
        }}
      >
        {[
          {
            step: "01",
            title: "Find a Vet",
            description:
              "Search and filter vets in your neighborhood. Compare exam fees, dental costs, and more — before you walk in.",
            icon: "🔍",
          },
          {
            step: "02",
            title: "Check Symptoms",
            description:
              "Not sure if it's an emergency? Our AI symptom checker gives you instant triage guidance — 24/7, for free.",
            icon: "🩺",
          },
          {
            step: "03",
            title: "Track Your Pet's Health",
            description:
              "Build your pet's health history over time. Records, vet visits, and reminders — all in one place.",
            icon: "📋",
          },
        ].map(({ step, title, description, icon }) => (
          <div
            key={step}
            style={{
              background: "#fff",
              border: "1px solid var(--color-border, #EDE8E0)",
              borderRadius: "20px",
              padding: "32px",
              boxShadow: "0 4px 16px rgba(23,37,49,0.08)",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.1em",
                color: "var(--color-terracotta, #CF5C36)",
                marginBottom: "12px",
              }}
            >
              STEP {step}
            </div>
            <div style={{ fontSize: "32px", marginBottom: "16px" }}>{icon}</div>
            <h3
              style={{
                fontSize: "20px",
                fontWeight: "700",
                color: "var(--color-navy-dark, #172531)",
                marginBottom: "10px",
              }}
            >
              {title}
            </h3>
            <p
              style={{
                fontSize: "15px",
                color: "var(--color-slate, #4B5563)",
                lineHeight: "1.7",
              }}
            >
              {description}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "var(--color-navy-dark, #172531)",
          borderRadius: "24px",
          padding: "48px 40px",
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
          Built for the East Bay
        </p>
        <h2
          style={{
            fontSize: "clamp(24px, 4vw, 36px)",
            fontWeight: "800",
            color: "#fff",
            marginBottom: "16px",
            lineHeight: "1.2",
          }}
        >
          Real prices. Real vets. No surprises.
        </h2>
        <p
          style={{
            fontSize: "16px",
            color: "rgba(255,255,255,0.7)",
            lineHeight: "1.7",
            maxWidth: "480px",
            margin: "0 auto 32px",
          }}
        >
          PetParrk is starting in Oakland and Berkeley — and expanding across
          California and beyond.
        </p>
        <a
          href="/"
          style={{
            display: "inline-block",
            padding: "14px 32px",
            background: "var(--color-terracotta, #CF5C36)",
            color: "#fff",
            borderRadius: "12px",
            fontSize: "16px",
            fontWeight: "700",
            textDecoration: "none",
          }}
        >
          Find a Vet Now
        </a>
      </div>
    </div>
  );
}
