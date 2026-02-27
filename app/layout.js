import "./globals.css";
import HashCleaner from "../components/HashCleaner";

export const metadata = {
  title: "PetParrk – Vet Pricing Transparency for the East Bay",
  description:
    "Compare real vet prices in Oakland, Berkeley, and the East Bay. See exam fees, dental costs, and more.",
  openGraph: {
    title: "PetParrk – East Bay Vet Pricing",
    description:
      "Real vet prices for Oakland, Berkeley, and the East Bay. Compare costs before you go.",
    url: "https://petparrk-next.vercel.app",
    type: "website",
  },
  verification: {
    google: "7s6yV00GY-q643NY-Vlq7Hh3zC6GCxh91Wiwlz8JebA",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta
          name="google-site-verification"
          content="7s6yV00GY-q643NY-Vlq7Hh3zC6GCxh91Wiwlz8JebA"
        />
      </head>
      <body>
        <HashCleaner />
        {children}
      </body>
    </html>
  );
}
