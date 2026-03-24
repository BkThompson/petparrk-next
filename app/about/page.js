import Link from "next/link";

const VALUES = [
  {
    number: "01",
    title: "Pet Owners First",
    body: "Every decision we make starts with one question: does this help the pet owner? Not the advertiser, not us — the person trying to do right by their pet.",
  },
  {
    number: "02",
    title: "Transparency Always",
    body: "Honest pricing, clear information, no hidden agendas. We show you where our data comes from and we never charge you to access information that should always have been available.",
  },
  {
    number: "03",
    title: "Prevention Over Reaction",
    body: "The best vet visit is the one you were prepared for. We're building tools that help you stay ahead — not just tools for when things go wrong.",
  },
  {
    number: "04",
    title: "Community Over Competition",
    body: "We're not replacing vets — we're helping you work with them better. Great vets deserve to be found. Pet owners deserve to find them.",
  },
  {
    number: "05",
    title: "Accessibility for All",
    body: "Pet care shouldn't be a privilege. We're keeping the core platform free and fighting to make information that's always existed behind phone calls available to everyone.",
  },
];

const PROBLEMS = [
  {
    label: "Decision Paralysis",
    title: "Is this an emergency?",
    body: "Your puppy is vomiting at 2am. Is it an emergency? Do you spend $500+ at the ER, or wait until morning and risk being wrong? Google gives you conflicting, scary results. There's no affordable, instant, trustworthy answer — so you panic or you guess.",
    emoji: "🌙",
    imageAlt: "Pet owner at night worried about sick pet",
  },
  {
    label: "Price Opacity",
    title: "What will this actually cost?",
    body: "You call five vets asking for a teeth cleaning price. Three refuse to quote without seeing your dog. You pick the one who gave you a number — $450 — and the final bill is $780. Pre-anesthesia bloodwork. IV fluids. Medication. Each charge was 'medically necessary' but never mentioned upfront.",
    emoji: "💸",
    imageAlt: "Shocked pet owner looking at vet bill",
  },
  {
    label: "Information Overload",
    title: "Where is everything?",
    body: "Vaccination records in a PDF. Vet notes locked in a system you can't access. Health questions spread across Reddit and Facebook groups. If you're a new pet owner, the information you need is everywhere and nowhere at the same time.",
    emoji: "📂",
    imageAlt: "Scattered pet health records and documents",
  },
];

export default function AboutPage() {
  return (
    <>
      <style>{`
        /* Problems section */
        .problem-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
          padding: 72px 0;
          border-top: 1px solid var(--color-border, #EDE8E0);
        }
        .problem-row:last-child { border-bottom: 1px solid var(--color-border, #EDE8E0); }
        .problem-row-reverse .problem-text { order: 2; }
        .problem-row-reverse .problem-image { order: 1; }
        .problem-text-inner {
          border-left: 3px solid var(--color-terracotta, #CF5C36);
          padding-left: 24px;
        }
        .problem-image-box {
          width: 100%;
          aspect-ratio: 4/3;
          background: linear-gradient(135deg, var(--color-cream, #F5F0E8) 0%, #E2D9CE 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 10px;
        }
        @media (max-width: 768px) {
          .problem-row, .problem-row-reverse {
            grid-template-columns: 1fr;
            gap: 28px;
            padding: 40px 0;
          }
          .problem-row-reverse .problem-text { order: unset; }
          .problem-row-reverse .problem-image { order: unset; }
          .problem-image { display: none; }
        }

        /* Values — Stripe editorial */
        .value-stripe-row {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 48px;
          padding: 48px 0;
          border-top: 1px solid var(--color-border, #EDE8E0);
          align-items: start;
        }
        .value-stripe-row:last-child { border-bottom: 1px solid var(--color-border, #EDE8E0); }
        .value-stripe-number {
          font-size: clamp(72px, 9vw, 110px);
          font-weight: 800;
          line-height: 1;
          color: var(--color-border, #EDE8E0);
          font-family: var(--font-urbanist, 'Urbanist', sans-serif);
          user-select: none;
          padding-top: 4px;
        }
        .value-stripe-title {
          font-size: clamp(20px, 2.5vw, 28px);
          font-weight: 800;
          color: var(--color-navy-dark, #172531);
          margin: 0 0 12px;
          font-family: var(--font-urbanist, 'Urbanist', sans-serif);
          line-height: 1.2;
        }
        .value-stripe-body {
          font-size: 17px;
          color: var(--color-slate, #4B5563);
          line-height: 1.8;
          margin: 0;
          max-width: 600px;
        }
        @media (max-width: 640px) {
          .value-stripe-row { grid-template-columns: 56px 1fr; gap: 16px; padding: 32px 0; }
          .value-stripe-number { font-size: 48px; }
          .value-stripe-title { font-size: 18px; }
          .value-stripe-body { font-size: 15px; }
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

      {/* Mission */}
      <section
        style={{ background: "var(--color-cream, #F5F0E8)", padding: "80px 0" }}
      >
        <div className="pp-container-text">
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
              fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: "800",
              color: "var(--color-navy-dark, #172531)",
              lineHeight: "1.15",
              marginBottom: "28px",
              fontFamily: "var(--font-urbanist, 'Urbanist', sans-serif)",
            }}
          >
            Pet care shouldn't feel like a guessing game.
          </h2>
          <p
            style={{
              fontSize: "18px",
              color: "var(--color-slate, #4B5563)",
              lineHeight: "1.8",
              marginBottom: "20px",
            }}
          >
            PetParrk started with a frustration every pet owner knows. You call
            a vet, ask about pricing, and hear "it depends." You search online
            and find conflicting, scary results. You wonder if what your pet is
            doing is normal or an emergency — and every time, you're left
            guessing.
          </p>
          <p
            style={{
              fontSize: "18px",
              color: "var(--color-slate, #4B5563)",
              lineHeight: "1.8",
              marginBottom: "20px",
            }}
          >
            We built PetParrk to change that. Starting in the East Bay, we're
            building a platform that gives pet owners real information: real
            prices from real vets, AI-powered guidance when you're not sure
            what's wrong, and a place to build and own your pet's health history
            over time.
          </p>
          <p
            style={{
              fontSize: "18px",
              color: "var(--color-slate, #4B5563)",
              lineHeight: "1.8",
            }}
          >
            No surprises. No gatekeeping. Just honest, transparent tools to help
            you make better decisions for your pet — every single day.
          </p>
        </div>
      </section>

      {/* Problems */}
      <section style={{ background: "#fff", padding: "80px 0" }}>
        <div className="pp-container">
          <div style={{ maxWidth: "900px", marginBottom: "64px" }}>
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
                fontSize: "clamp(26px, 3vw, 36px)",
                fontWeight: "800",
                color: "var(--color-navy-dark, #172531)",
                fontFamily: "var(--font-urbanist, 'Urbanist', sans-serif)",
                margin: 0,
              }}
            >
              Three things that shouldn't be this hard.
            </h2>
          </div>

          {PROBLEMS.map((p, i) => (
            <div
              key={p.title}
              className={`problem-row${i % 2 !== 0 ? " problem-row-reverse" : ""}`}
            >
              <div className="problem-text">
                <div className="problem-text-inner">
                  <p
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--color-terracotta, #CF5C36)",
                      marginBottom: "10px",
                    }}
                  >
                    {p.label}
                  </p>
                  <h3
                    style={{
                      fontSize: "clamp(20px, 2.5vw, 28px)",
                      fontWeight: "800",
                      color: "var(--color-navy-dark, #172531)",
                      marginBottom: "16px",
                      fontFamily:
                        "var(--font-urbanist, 'Urbanist', sans-serif)",
                      lineHeight: "1.2",
                    }}
                  >
                    {p.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "16px",
                      color: "var(--color-slate, #4B5563)",
                      lineHeight: "1.8",
                      margin: 0,
                    }}
                  >
                    {p.body}
                  </p>
                </div>
              </div>
              <div className="problem-image">
                <div className="problem-image-box">
                  <div style={{ fontSize: "52px" }}>{p.emoji}</div>
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "var(--color-muted, #9CA3AF)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      margin: 0,
                    }}
                  >
                    Photo coming soon
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Our answer */}
      <section
        style={{ background: "var(--color-cream, #F5F0E8)", padding: "80px 0" }}
      >
        <div className="pp-container-text">
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
            Our answer
          </p>
          <h2
            style={{
              fontSize: "clamp(26px, 3vw, 36px)",
              fontWeight: "800",
              color: "var(--color-navy-dark, #172531)",
              marginBottom: "28px",
              fontFamily: "var(--font-urbanist, 'Urbanist', sans-serif)",
            }}
          >
            The daily companion for confident pet care.
          </h2>
          <p
            style={{
              fontSize: "17px",
              color: "var(--color-slate, #4B5563)",
              lineHeight: "1.8",
              marginBottom: "20px",
            }}
          >
            PetParrk combines AI-powered symptom triage, transparent vet
            pricing, and owner-controlled health profiles into one platform —
            because the problem isn't that pet owners don't care enough, it's
            that they've never had the right tools.
          </p>
          <p
            style={{
              fontSize: "17px",
              color: "var(--color-slate, #4B5563)",
              lineHeight: "1.8",
            }}
          >
            We're not replacing vets. We're helping you get to the right vet, at
            the right time, knowing what you'll pay. When pet owners have better
            information, pets get better care.
          </p>
        </div>
      </section>

      {/* Values — Stripe style */}
      <section style={{ background: "#fff", padding: "80px 0" }}>
        <div className="pp-container">
          <div style={{ maxWidth: "900px", marginBottom: "64px" }}>
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
                margin: 0,
              }}
            >
              Our values
            </h2>
          </div>
          {VALUES.map((val) => (
            <div key={val.title} className="value-stripe-row">
              <div className="value-stripe-number">{val.number}</div>
              <div style={{ paddingTop: "12px" }}>
                <h3 className="value-stripe-title">{val.title}</h3>
                <p className="value-stripe-body">{val.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Vision CTA */}
      <section
        style={{
          background: "var(--color-navy-mid, #2C4657)",
          padding: "80px 0",
        }}
      >
        <div className="pp-container-text" style={{ textAlign: "center" }}>
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
              fontSize: "clamp(24px, 4vw, 38px)",
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
              fontSize: "17px",
              color: "rgba(255,255,255,0.7)",
              lineHeight: "1.7",
              marginBottom: "36px",
            }}
          >
            We're starting in Oakland and Berkeley and expanding across the Bay
            Area and beyond. If you're a pet owner, a vet, or someone who thinks
            this problem matters — we'd love to hear from you.
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
                border: "2px solid rgba(255,255,255,0.35)",
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
