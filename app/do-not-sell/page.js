"use client";

import Link from "next/link";

const EFFECTIVE_DATE = "April 14, 2026";
const CONTACT_EMAIL = "[legal@petparrk.com]";

export default function DoNotSell() {
  return (
    <>
      <style>{`        .legal-body { background: #F5F0E8; padding: 48px 0 96px; }
        .legal-container { max-width: 900px; margin: 0 auto; padding: 0 24px; }
        .legal-page-title { margin-bottom: 48px; padding-bottom: 32px; border-bottom: 1px solid #D1C9BC; }
        .legal-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #6B7280; margin-bottom: 10px; font-family: var(--font-urbanist,'Urbanist',sans-serif); }
        .legal-h1 { font-size: clamp(24px,3vw,34px); font-weight: 800; color: #172531; margin: 0 0 10px; font-family: var(--font-urbanist,'Urbanist',sans-serif); letter-spacing: -0.02em; line-height: 1.15; }
        .legal-date { font-size: 14px; color: #6B7280; margin: 0; }
        .legal-section { margin-bottom: 44px; }
        .legal-h2 { font-size: 15px; font-weight: 700; color: #172531; text-transform: uppercase; letter-spacing: 0.07em; margin: 0 0 16px; font-family: var(--font-urbanist,'Urbanist',sans-serif); padding-bottom: 8px; }
        .legal-h3 { font-size: 16px; font-weight: 700; color: #172531; margin: 24px 0 10px; font-family: var(--font-urbanist,'Urbanist',sans-serif); }
        .legal-p { font-size: 16px; color: #1F2937; line-height: 1.85; margin: 0 0 14px; }
        .legal-caps { font-size: 14px; color: #1F2937; line-height: 1.8; font-weight: 600; margin: 0 0 14px; }
        .legal-ul { margin: 10px 0 16px 22px; padding: 0; }
        .legal-ul li { font-size: 16px; color: #1F2937; line-height: 1.85; margin-bottom: 6px; }
        .legal-divider { height: 1px; background: #D1C9BC; margin: 44px 0; }
        .legal-notice-box { background: #fff; border: 1px solid #D1C9BC; border-radius: 12px; padding: 24px 28px; margin-bottom: 32px; }
        .legal-notice-box p { font-size: 16px; color: #1F2937; line-height: 1.85; margin: 0; }
        .legal-link { color: #CF5C36; font-weight: 600; text-decoration: none; }
        .legal-link:hover { text-decoration: underline; }
        @media(max-width:768px) { .legal-body { padding: 40px 0 80px; } }
`}</style>
      <div className="legal-body">
        <div className="legal-container">
          <div className="legal-page-title">
            <p className="legal-eyebrow">Legal</p>
            <h1 className="legal-h1">
              Do Not Sell or Share My Personal Information
            </h1>
            <p className="legal-date">Effective Date: {EFFECTIVE_DATE}</p>
          </div>
          <div className="legal-notice-box">
            <p>
              <strong>Current Status:</strong> PetParrk does not sell your
              personal information to third parties. PetParrk does not share
              your personal information for cross-context behavioral
              advertising. No opt-out action is required at this time because we
              do not engage in these practices.
            </p>
          </div>
          <div className="legal-section">
            <h2 className="legal-h2">Our Current Data Practices</h2>
            <p className="legal-p">
              As of the effective date of this notice, PetParrk does not engage
              in the sale or sharing of personal information as defined under
              the California Consumer Privacy Act (CCPA), as amended by the
              California Privacy Rights Act (CPRA). Specifically:
            </p>
            <ul className="legal-ul">
              <li>
                We do not sell your personal information to data brokers,
                advertisers, or any third parties;
              </li>
              <li>
                We do not share your personal information with third parties for
                the purpose of cross-context behavioral advertising;
              </li>
              <li>
                We do not use your pet's health data, symptom checker inputs, or
                personally identifiable information to serve targeted
                advertising;
              </li>
              <li>
                We do not display third-party advertisements inside the PetParrk
                platform.
              </li>
            </ul>
          </div>
          <div className="legal-divider" />
          <div className="legal-section">
            <h2 className="legal-h2">Future Practices and Disclosure</h2>
            <p className="legal-p">
              PetParrk may in the future introduce affiliate partnerships or
              referral programs that could involve the use of tracking
              technologies. If and when such practices are introduced, they may
              constitute "sharing" of personal information under CCPA. PetParrk
              commits to:
            </p>
            <ul className="legal-ul">
              <li>
                Updating this page to reflect any change in our data sharing
                practices before those practices take effect;
              </li>
              <li>
                Providing users with notice of material changes through the
                Service or by email;
              </li>
              <li>
                Offering California residents a clear mechanism to opt out of
                any sale or sharing of personal information at the time such
                practices are introduced;
              </li>
              <li>
                Not retroactively changing our practices with respect to data
                already collected without providing notice and, where required
                by law, obtaining consent.
              </li>
            </ul>
          </div>
          <div className="legal-divider" />
          <div className="legal-section">
            <h2 className="legal-h2">Your California Rights</h2>
            <p className="legal-p">
              If you are a California resident, you have the right under CCPA to
              opt out of the sale or sharing of your personal information.
              Because PetParrk does not currently sell or share personal
              information, no action is required. If you believe PetParrk has
              sold or shared your personal information inconsistently with this
              notice, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="legal-link">
                {CONTACT_EMAIL}
              </a>{" "}
              with the subject line "CCPA Opt-Out Request."
            </p>
            <p className="legal-p">
              For a complete description of your California privacy rights,
              review our{" "}
              <Link href="/privacy-policy#california" className="legal-link">
                Privacy Policy — California Residents section
              </Link>
              .
            </p>
          </div>
          <div className="legal-divider" />
          <div className="legal-section">
            <h2 className="legal-h2">Contact</h2>
            <p className="legal-p">
              <strong>PetParrk, Inc.</strong>
              <br />
              Email:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="legal-link">
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
