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
          display: block;
          font-size: 13px;
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          margin-bottom: 8px;
          transition: color 0.15s;
        }
        .footer-link:hover { color: #fff; }
      `}</style>

      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "32px",
            marginBottom: "40px",
          }}
        >
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
                fontSize: "13px",
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
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              Product
            </div>
            {[
              ["Find a Vet", "/vets"],
              ["Symptom Checker", "/symptom-checker"],
              ["Pet Health Card", "/profile"],
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
                letterSpacing: "0.08em",
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
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              Legal
            </div>
            {[
              ["Privacy Policy", "/privacy-policy"],
              ["Terms of Service", "/terms"],
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
