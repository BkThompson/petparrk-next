import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        background: "var(--color-navy-dark, #172531)",
        padding: "48px 0 40px",
      }}
    >
      <style>{`
        .footer-link {
          /* 44px target at every width, not just on phones — a tablet runs
             desktop layout but is still touch. */
          display: flex;
          align-items: center;
          min-height: 44px;
          font-size: 15px;
          font-weight: 500;
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          margin-bottom: 4px;
          transition: color 0.15s;
        }
        .footer-link:hover { color: #fff; }

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
            <div
              style={{
                fontSize: "18px",
                fontWeight: "800",
                color: "#fff",
                marginBottom: "8px",
                fontFamily: "var(--font-urbanist, 'Urbanist', sans-serif)",
              }}
            >
              PetParrk
            </div>
            <p
              style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "rgba(255,255,255,0.5)",
                lineHeight: "1.7",
                margin: 0,
              }}
            >
              Real prices. Real vets.
              <br />
              No surprises.
            </p>
          </div>

          {/* Product */}
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "var(--color-gold,#EFC88B)",
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
                color: "var(--color-gold,#EFC88B)",
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
                color: "var(--color-gold,#EFC88B)",
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
            borderTop: "1px solid rgba(255,255,255,0.1)",
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
              color: "rgba(255,255,255,0.4)",
              margin: 0,
            }}
          >
            © 2026 PetParrk, LLC.
          </p>
          {/* 
          <p
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "rgba(255,255,255,0.4)",
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
