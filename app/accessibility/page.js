"use client";

const EFFECTIVE_DATE = "April 14, 2026";
const CONTACT_EMAIL = "[legal@petparrk.com]";

export default function Accessibility() {
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
            <h1 className="legal-h1">Accessibility Statement</h1>
            <p className="legal-date">Effective Date: {EFFECTIVE_DATE}</p>
          </div>
          <div className="legal-section">
            <h2 className="legal-h2">Our Commitment</h2>
            <p className="legal-p">
              PetParrk is committed to ensuring that our platform is accessible
              to all users, including individuals with disabilities. We believe
              that every pet owner should be able to use PetParrk with ease,
              regardless of ability or the assistive technologies they rely on.
            </p>
            <p className="legal-p">
              We aim to conform to the Web Content Accessibility Guidelines
              (WCAG) 2.1 Level AA across our web and mobile experiences.
            </p>
          </div>
          <div className="legal-divider" />
          <div className="legal-section">
            <h2 className="legal-h2">Measures We Take</h2>
            <p className="legal-p">
              PetParrk takes the following measures to support accessibility:
            </p>
            <ul className="legal-ul">
              <li>
                We review color contrast ratios to ensure text is legible for
                users with low vision;
              </li>
              <li>
                We use semantic HTML elements to support screen reader
                navigation;
              </li>
              <li>
                We provide descriptive labels and alternative text for interface
                elements and images;
              </li>
              <li>
                We design interactive elements to be operable via keyboard in
                addition to mouse and touch input;
              </li>
              <li>
                We evaluate third-party components for accessibility compliance
                before integration.
              </li>
            </ul>
          </div>
          <div className="legal-divider" />
          <div className="legal-section">
            <h2 className="legal-h2">Known Limitations</h2>
            <p className="legal-p">
              While we work toward full WCAG 2.1 AA conformance, some areas of
              the platform may not yet fully meet these standards. PetParrk is
              an actively developed product and accessibility improvements are
              incorporated on an ongoing basis. If you encounter a specific
              barrier, we encourage you to report it to us so we can prioritize
              a fix.
            </p>
          </div>
          <div className="legal-divider" />
          <div className="legal-section">
            <h2 className="legal-h2">Feedback and Contact</h2>
            <p className="legal-p">
              If you experience difficulty accessing any part of PetParrk, or if
              you have suggestions for how we can improve accessibility, please
              contact us:
            </p>
            <p className="legal-p">
              <strong>Email:</strong>{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="legal-link">
                {CONTACT_EMAIL}
              </a>{" "}
              — Subject line: Accessibility Feedback
            </p>
            <p className="legal-p">
              Please include a description of the barrier you encountered, the
              page or feature affected, and the browser or device you were
              using. We will acknowledge your message and work to address the
              issue as promptly as possible.
            </p>
          </div>
          <div className="legal-divider" />
          <div className="legal-section">
            <h2 className="legal-h2">Alternative Formats</h2>
            <p className="legal-p">
              If you require information from PetParrk in an alternative format,
              please contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="legal-link">
                {CONTACT_EMAIL}
              </a>{" "}
              and we will make reasonable efforts to accommodate your request.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
