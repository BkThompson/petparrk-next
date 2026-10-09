// FILE: app/studio/[[...tool]]/page.js   (BlogStudioPage)
// The CMS editor, at /studio on your own site. Log in with your Sanity account
// to write, edit and publish articles. Readers never see this page.
//
// The folder names really are "studio" and "[[...tool]]" — two square
// brackets on each side and three dots. Next.js requires the file name page.js.

import { NextStudio } from "next-sanity/studio";
import config from "../../../sanity.config";

export const dynamic = "force-static";
export { metadata, viewport } from "next-sanity/studio";

const connected = Boolean(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID);

export default function StudioPage() {
  if (!connected) {
    return (
      <div style={{ maxWidth: 560, margin: "96px auto", padding: "0 24px", fontFamily: "var(--font-urbanist, 'Urbanist'), sans-serif" }}>
        <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>The blog editor isn&apos;t connected yet</h1>
        <p style={{ fontSize: 17, lineHeight: 1.7, margin: 0 }}>
          Add <code>NEXT_PUBLIC_SANITY_PROJECT_ID</code> to <code>.env.local</code> (and in Vercel), then restart
          the site. Step 2 of <code>BLOG-CMS-SETUP.md</code> shows exactly how.
        </p>
      </div>
    );
  }
  // Covers the whole screen so the site's menu and footer don't show around the editor.
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "#fff" }}>
      <NextStudio config={config} />
    </div>
  );
}