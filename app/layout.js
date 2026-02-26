export const metadata = {
  title: "PetParrk — Vet Pricing Transparency for the East Bay",
  description:
    "Compare real vet prices in Oakland, Berkeley, and the East Bay. See exam fees, dental costs, and more before your visit. No surprises.",
  openGraph: {
    title: "PetParrk — East Bay Vet Pricing",
    description:
      "Real vet prices for Oakland, Berkeley, and the East Bay. Compare costs before you go.",
    url: "https://petparrk.vercel.app",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
