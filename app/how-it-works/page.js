"use client";
import Link from "next/link";

const STEPS = [
  {
    step: "01",
    icon: "🔍",
    title: "Find a Vet",
    description:
      "Search and filter vets in your neighborhood. Compare exam fees, dental costs, and more — before you walk in the door.",
  },
  {
    step: "02",
    icon: "🩺",
    title: "Check Symptoms",
    description:
      "Not sure if it's an emergency? Our AI symptom checker gives you instant triage guidance — 24/7, completely free.",
  },
  {
    step: "03",
    icon: "📋",
    title: "Track Your Pet's Health",
    description:
      "Build your pet's health history over time. Store records, vet visits, and important notes all in one place.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <style>{`
        .hiw-card {
          background: #fff;
          border: 1px solid var(--color-border, #EDE8E0);
          border-radius: 20px;
          padding: 36px 28px;
          box-shadow: 0 2px 8px rgba(23,37,49,0.05);
          transition: box-shadow 0.2s ease, transform 0.2s ease;
          text-align: center;
        }
        .hiw-card:hover {
          box-shadow: 0 8px 24px rgba(23,37,49,0.10);
          transform: translateY(-2px);
        }
        .hiw-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        @media (max-width: 768px) {
          .hiw-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Page header */}
      <div
        style={{
          background: "var(--color-navy-dark, #172531)",
          padding: "56px 0 64px",
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
            How It Works
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
            Vet care without the surprises.
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "rgba(255,255,255,0.6)",
              margin: 0,
            }}
          >
            Three simple steps to take control of your pet's health.
          </p>
        </div>
      </div>

      {/* Steps */}
      <section
        style={{ background: "var(--color-cream, #F5F0E8)", padding: "64px 0" }}
      >
        <div
          style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px" }}
        >
          <div className="hiw-grid">
            {STEPS.map((step) => (
              <div key={step.step} className="hiw-card">
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    letterSpacing: "0.1em",
                    color: "var(--color-terracotta, #CF5C36)",
                    textTransform: "uppercase",
                    marginBottom: "16px",
                  }}
                >
                  Step {step.step}
                </div>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                  {step.icon}
                </div>
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: "700",
                    color: "var(--color-navy-dark, #172531)",
                    marginBottom: "12px",
                    fontFamily: "var(--font-urbanist, 'Urbanist', sans-serif)",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--color-slate, #4B5563)",
                    lineHeight: "1.7",
                    margin: 0,
                  }}
                >
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          background: "var(--color-navy-mid, #2C4657)",
          padding: "64px 0",
        }}
      >
        <div
          style={{
            maxWidth: "560px",
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
            Built for the Bay Area
          </p>
          <h2
            style={{
              fontSize: "clamp(24px, 4vw, 36px)",
              fontWeight: "800",
              color: "#fff",
              marginBottom: "16px",
              lineHeight: "1.2",
              fontFamily: "var(--font-urbanist, 'Urbanist', sans-serif)",
            }}
          >
            Real prices. Real vets. No surprises.
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "rgba(255,255,255,0.7)",
              lineHeight: "1.7",
              marginBottom: "32px",
            }}
          >
            PetParrk is starting in Oakland and Berkeley — and expanding across
            the Bay Area and beyond.
          </p>
          <Link
            href="/vets"
            style={{
              display: "inline-block",
              padding: "14px 32px",
              background: "var(--color-terracotta, #CF5C36)",
              color: "#fff",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "700",
              textDecoration: "none",
              fontFamily: "var(--font-urbanist, 'Urbanist', sans-serif)",
            }}
          >
            Find a Vet Now
          </Link>
        </div>
      </section>
    </>
  );
}
