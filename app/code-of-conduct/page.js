"use client";

const EFFECTIVE_DATE = "April 14, 2026";
const CONTACT_EMAIL = "[legal@petparrk.com]";

export default function CodeOfConduct() {
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
            <h1 className="legal-h1">Code of Conduct</h1>
            <p className="legal-date">Effective Date: {EFFECTIVE_DATE}</p>
          </div>
          <div className="legal-section">
            <h2 className="legal-h2">Purpose</h2>
            <p className="legal-p">
              PetParrk is a community-supported platform built on accurate,
              honest information. The quality of our veterinary pricing data,
              reviews, and community contributions depends on every user acting
              in good faith. This Code of Conduct applies to all content
              submitted to PetParrk, including price submissions, reviews, pet
              health records, and any future community features.
            </p>
          </div>
          <div className="legal-divider" />
          <div className="legal-section">
            <h2 className="legal-h2">Standards for Submissions</h2>
            <h3 className="legal-h3">Price Submissions</h3>
            <p className="legal-p">
              When submitting veterinary pricing data, you agree to the
              following standards:
            </p>
            <ul className="legal-ul">
              <li>
                All submitted prices must reflect actual charges you or someone
                you know personally paid to the veterinary clinic identified;
              </li>
              <li>
                You must not submit fabricated, estimated, or intentionally
                inflated or deflated prices;
              </li>
              <li>
                You must not submit prices on behalf of a veterinary clinic you
                are affiliated with for the purpose of influencing your clinic's
                listing;
              </li>
              <li>
                Receipt or invoice images you upload must be genuine documents,
                redacted to remove personal financial information;
              </li>
              <li>
                You must not submit prices for services you did not receive or
                for clinics you did not visit.
              </li>
            </ul>
            <h3 className="legal-h3">Reviews and Comments</h3>
            <p className="legal-p">
              All reviews and user comments must reflect genuine first-hand
              experiences. You may not submit reviews for clinics you have not
              personally visited, submit reviews to artificially improve or harm
              a clinic's standing, or submit content that is defamatory,
              harassing, threatening, obscene, or unlawful.
            </p>
          </div>
          <div className="legal-divider" />
          <div className="legal-section">
            <h2 className="legal-h2">Prohibited Conduct</h2>
            <ul className="legal-ul">
              <li>
                Submitting false, misleading, or fabricated information of any
                kind;
              </li>
              <li>
                Attempting to manipulate veterinary rankings, pricing data, or
                search results;
              </li>
              <li>Harassing, threatening, or targeting other users;</li>
              <li>
                Impersonating any person, veterinary professional, or
                organization;
              </li>
              <li>
                Attempting to scrape or collect data from PetParrk by automated
                means without authorization;
              </li>
              <li>
                Using PetParrk to promote unlicensed veterinary services or
                products;
              </li>
              <li>
                Engaging in any conduct that violates applicable federal, state,
                or local law.
              </li>
            </ul>
          </div>
          <div className="legal-divider" />
          <div className="legal-section">
            <h2 className="legal-h2">Enforcement</h2>
            <p className="legal-p">
              PetParrk reviews submitted content before it is published. We
              reserve the right to reject, remove, or modify any content that
              violates this Code of Conduct without prior notice. Users who
              repeatedly violate this Code of Conduct may have their accounts
              suspended or terminated.
            </p>
          </div>
          <div className="legal-divider" />
          <div className="legal-section">
            <h2 className="legal-h2">Reporting Violations</h2>
            <p className="legal-p">
              If you observe content or conduct that violates this Code of
              Conduct, please report it to{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="legal-link">
                {CONTACT_EMAIL}
              </a>{" "}
              with the subject line "Code of Conduct Report." Include a
              description of the content or conduct, the location on the
              platform where it appeared, and any relevant details.
            </p>
          </div>
          <div className="legal-divider" />
          <div className="legal-section">
            <h2 className="legal-h2">Relationship to Terms of Service</h2>
            <p className="legal-p">
              This Code of Conduct is incorporated by reference into PetParrk's
              Terms of Service. Violations of this Code of Conduct constitute
              violations of the Terms of Service and are subject to all remedies
              available thereunder.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
