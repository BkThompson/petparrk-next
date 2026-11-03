import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer
      style={{
        background: "var(--color-navy-dark)",
        padding: "48px 0 40px",
      }}
    >
      <style>{`
        .footer-link {
          /* 44px target at every width, not just on phones — a tablet runs
             desktop layout but is still touch. */
          display: flex;
          align-items: center;
          font-size: 14px;
          font-weight: 500;
          color: rgb(var(--color-white-rgb) / 0.6);
          text-decoration: none;
          margin-bottom: 4px;
          transition: color 0.15s;
        }
        @media (hover: hover) { .footer-link:hover { color: var(--color-white); } }

        /* Four named columns rather than auto-fit. auto-fit could only place
           three tracks below 1024px, which orphaned Legal onto its own row
           at 769 and 900 — at 900 it missed a fourth track by 44px. */
        .footer-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 32px;
          margin-bottom: 40px;
        }
        @media (max-width: 1023px) { .footer-grid { gap: 24px; } }
        /* Below the site boundary four columns stop fitting, so pair them
           two-by-two. Still no orphan: four blocks, two rows. */
        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: repeat(2, 1fr); gap: 32px 24px; }
          .footer-link { margin-bottom: 0; }
        }
        @media (max-width: 480px) { .footer-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="pp-container">
        <div className="footer-grid">
          {/* Brand */}
          <div>
            <div style={{ marginBottom: "12px" }}>
              <Logo height={30} />
            </div>
            {/* Tagline above the descriptor. The name carries a story, but a
                first-time visitor knows none of it, so the line under the
                logo has to earn its place. "Know what's ahead" covers all of
                it: the prices, the triage, the co-pilot, the records. Every
                one exists to remove an unknown before someone walks into a
                clinic, and the Arrow points ahead, so the words and the mark
                say the same thing.

                Two earlier lines are retired and should not come back.
                "Know before you cross" read as a pet dying and crossing
                over. "Walk in knowing" never said knowing what, so it always
                needed a second line to explain it.

                The line under it names the three things the product actually
                does. The old descriptor ("Real prices. Real vets. No
                surprises.") described pricing only, and that promise is
                already made above — so nothing was lost. */}
            <p
              style={{
                fontSize: "17px",
                fontWeight: "700",
                // Cream, not white. It sits directly under the Logo, whose
                // wordmark and light blades are #F5F0E8 — pure white beside
                // it read as a brighter, different colour and made the logo
                // look dull. Cream is the brand value; white is not in the
                // palette at all. About 14:1 on navy, so nothing is lost on
                // contrast. If this is ever flipped, change the Logo rather
                // than this line: the mark is the fixed asset.
                color: "var(--color-cream)",
                lineHeight: "1.4",
                margin: "0 0 6px",
                fontFamily: "var(--font-urbanist, 'Urbanist', sans-serif)",
              }}
            >
              Know what's ahead.
            </p>
            <p
              style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "rgb(var(--color-white-rgb) / 0.5)",
                lineHeight: "1.7",
                margin: 0,
              }}
            >
              Real prices. Instant guidance.
              <br />
              Your pet&apos;s whole history.
            </p>
          </div>

          {/* Product */}
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "var(--color-gold)",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              Product
            </div>
            {[
              ["Find a Vet", "/vets"],
              ["Symptom Checker", "/symptom-checker"],
              ["Pet Cards", "/pet-card"],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="footer-link">
                {label}
              </Link>
            ))}
          </div>

          {/* Company */}
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "var(--color-gold)",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              Company
            </div>
            {[
              ["About", "/about"],
              ["How It Works", "/how-it-works"],
              ["Blog", "/blog"],
              ["Contact", "/contact"],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="footer-link">
                {label}
              </Link>
            ))}
          </div>

          {/* Legal */}
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "var(--color-gold)",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              Legal
            </div>
            {[
              ["Privacy Policy", "/privacy-policy"],
              ["Terms of Service", "/terms-of-service"],
              ["Code of Conduct", "/code-of-conduct"],
              ["Accessibility", "/accessibility"],
              ["Do Not Sell My Information", "/do-not-sell"],
            ].map(([label, href]) => (
              <Link key={label} href={href} className="footer-link">
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: "1px solid rgb(var(--color-white-rgb) / 0.1)",
            paddingTop: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <p
            style={{
              fontSize: "13px",
              fontWeight: "500",
              color: "rgb(var(--color-white-rgb) / 0.6)", // 6.5:1 on navy (0.4 was 3.68)
              margin: 0,
            }}
          >
            © 2026 Nehalyn, LLC.
          </p>
          {/*
          <p
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "rgb(var(--color-white-rgb) / 0.4)",
              margin: 0,
            }}
          >
            Always call to confirm before your visit.
            Prices are community-sourced and verified by our
            team.
          </p>
          */}
        </div>
      </div>
    </footer>
  );
}
