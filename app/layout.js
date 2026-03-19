import "./globals.css";
import { Urbanist } from "next/font/google";
import ToastProvider from "../components/ToastProvider";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-urbanist",
  display: "swap",
});

export const metadata = {
  title: "PetParrk – Vet Pricing Transparency for the East Bay",
  description:
    "Compare real vet prices in Oakland, Berkeley, and the East Bay. Know what you'll pay before you go. No surprises.",
  keywords:
    "vet prices, veterinarian cost, East Bay vet, Oakland vet, Berkeley vet, pet care, vet pricing transparency",
  authors: [{ name: "PetParrk" }],
  openGraph: {
    title: "PetParrk – Know What You'll Pay Before You Go",
    description:
      "Real vet prices for Oakland, Berkeley, and the East Bay. Compare costs, check symptoms, and track your pet's health.",
    url: "https://petparrk-next.vercel.app",
    siteName: "PetParrk",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "PetParrk – Vet Pricing Transparency",
    description: "Real vet prices for the East Bay. No surprises.",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "7s6yV00GY-q643NY-Vlq7Hh3zC6GCxh91Wiwlz8JebA",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={urbanist.variable}>
      <head>
        <meta
          name="google-site-verification"
          content="7s6yV00GY-q643NY-Vlq7Hh3zC6GCxh91Wiwlz8JebA"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#172531" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body style={{ fontFamily: "var(--font-urbanist, var(--font))" }}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
