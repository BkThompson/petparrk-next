import "./globals.css";
import localFont from "next/font/local";
import ToastProvider from "../components/ToastProvider";
import NavbarWrapper from "../components/NavbarWrapper";
import FooterWrapper from "../components/FooterWrapper";
import ScrollToTop from "../components/ScrollToTop";
import WelcomeModal from "../components/WelcomeModal";
import { Suspense } from "react";
import { HEX } from "../lib/tokens";

// Urbanist is kept in the project (app/fonts, SIL Open Font License) rather
// than fetched from Google at build time. Google Fonts sometimes answers with
// a URL format next/font/google can't parse, which fails the Vercel build at
// random (vercel/next.js#99114). Same font, same weights, same variable.
const urbanist = localFont({
  src: [
    { path: "./fonts/urbanist-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/urbanist-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/urbanist-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/urbanist-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/urbanist-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-urbanist",
  display: "swap",
});

// The site's real address, used for share links. NEXT_PUBLIC_SITE_URL wins if
// it's set; otherwise Vercel's own production address; otherwise localhost.
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Nehalyn — Vet Prices, Symptom Guidance and Pet Health Records",
  description:
    "Real vet prices, instant symptom guidance and your pet's full health history. Covering California.",
  keywords:
    "vet prices, how much does a vet visit cost, dog vet costs, veterinarian prices, vet price comparison, dog symptom checker, pet health records",
  authors: [{ name: "Nehalyn" }],
  openGraph: {
    title: "Nehalyn — Walk in knowing",
    description:
      "Real vet prices, symptom guidance and your pet's health history, all in one place. Covering California.",
    url: SITE_URL,
    siteName: "Nehalyn",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nehalyn — Vet Prices, Symptom Guidance and Pet Health Records",
    description: "Real vet prices, symptom guidance and pet health records.",
  },
  robots: {
    index: true,
    follow: true,
  },
  // Next.js writes the google-site-verification tag from this. It used to be
  // written a second time by hand in <head>, which wasn't needed.
  verification: {
    google: "7s6yV00GY-q643NY-Vlq7Hh3zC6GCxh91Wiwlz8JebA",
  },
  // Two marks, used by size. The browser tab gets the TWO-TONE pinwheel,
  // because at 16px four colours collapse into a smudge and the navy blade
  // disappears against a dark tab. The home-screen and PWA icons get the
  // COLOUR pinwheel, where there are enough pixels to carry it.
  // favicon.ico bundles 16, 32 and 48 in one file.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={urbanist.variable}
      style={{ scrollbarGutter: "stable" }}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={HEX.navyDark} />
      </head>
      <body
        style={{
          fontFamily: "var(--font-urbanist, var(--font))",
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        {/* First thing a keyboard user reaches: jumps past the navbar. */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <NavbarWrapper />
        <ScrollToTop />
        <main id="main-content" tabIndex={-1} style={{ flex: 1 }}>
          <ToastProvider>
            {children}
            <Suspense fallback={null}>
              <WelcomeModal />
            </Suspense>
          </ToastProvider>
        </main>
        <FooterWrapper />
      </body>
    </html>
  );
}
