import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        background: "var(--color-navy-dark, #172531)",
        padding: "48px 0 40px",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "32px",
            marginBottom: "40px",
          }}
        >
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
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "var(--color-gold, #EFC88B)",
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
              ["How It Works", "/how-it-works"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.6)",
                  textDecoration: "none",
                  marginBottom: "8px",
                }}
              >
                {label}
              </Link>
            ))}
          </div>
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "var(--color-gold, #EFC88B)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              Company
            </div>
            {[
              ["About", "/about"],
              ["Contact", "/contact"],
              ["Press", "/press"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.6)",
                  textDecoration: "none",
                  marginBottom: "8px",
                }}
              >
                {label}
              </Link>
            ))}
          </div>
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "var(--color-gold, #EFC88B)",
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
              ["Your Privacy Choices", "/privacy-policy"],
            ].map(([label, href]) => (
              <Link
                key={label}
                href={href}
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.6)",
                  textDecoration: "none",
                  marginBottom: "8px",
                }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <p
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.4)",
              margin: 0,
            }}
          >
            © 2026 PetParrk. Prices are community-sourced and verified by our
            team. Always call to confirm before your visit.
          </p>
          <a
            href="mailto:bkalthompson@gmail.com"
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.5)",
              textDecoration: "none",
            }}
          >
            bkalthompson@gmail.com
          </a>
        </div>
      </div>
    </footer>
  );
}
