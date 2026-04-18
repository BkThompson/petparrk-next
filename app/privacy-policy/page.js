"use client";

import Link from "next/link";

const EFFECTIVE_DATE = "April 14, 2026";
const CONTACT_EMAIL = "[legal@petparrk.com]";
const COMPANY_ADDRESS = "[Company Address], Oakland, California";

export default function PrivacyPolicy() {
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
            <h1 className="legal-h1">Privacy Policy</h1>
            <p className="legal-date">Effective Date: {EFFECTIVE_DATE}</p>
          </div>

          {/* 1 */}
          <div className="legal-section">
            <h2 className="legal-h2">1. Scope and Who We Are</h2>
            <p className="legal-p">
              PetParrk, Inc. ("PetParrk," "we," "us," or "our") operates the
              PetParrk platform, including our website and any associated
              applications or services (collectively, the "Service"). This
              Privacy Policy describes how we collect, use, disclose, and
              protect personal information when you access or use the Service.
            </p>
            <p className="legal-p">
              By using the Service, you acknowledge that you have read and
              understood this Privacy Policy. If you do not agree with our
              practices, please do not use the Service.
            </p>
            <p className="legal-p">
              PetParrk is not a veterinary clinic, healthcare provider, or
              medical practice. Nothing in the Service constitutes veterinary or
              medical advice, diagnosis, or treatment.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 2 */}
          <div className="legal-section">
            <h2 className="legal-h2">2. Information We Collect</h2>
            <h3 className="legal-h3">2.1 Information You Provide Directly</h3>
            <p className="legal-p">
              We collect information you provide when you create an account, use
              our features, or contact us, including:
            </p>
            <ul className="legal-ul">
              <li>
                Account and contact information, such as your name, email
                address, and password credentials;
              </li>
              <li>
                Pet profile information, such as your pet's name, species,
                breed, age, weight, and photographs;
              </li>
              <li>
                Health records and notes you choose to enter, including
                veterinary visit summaries, vaccination records, and
                medications;
              </li>
              <li>
                Symptom checker inputs, including descriptions of your pet's
                symptoms, behavior, and relevant history;
              </li>
              <li>
                Price submissions, including veterinary service prices and
                optional receipt uploads you submit to our community pricing
                database;
              </li>
              <li>
                Communications you send to us, including support requests and
                feedback.
              </li>
            </ul>
            <h3 className="legal-h3">
              2.2 Information Collected Automatically
            </h3>
            <p className="legal-p">
              When you use the Service, we automatically collect certain
              technical information, including:
            </p>
            <ul className="legal-ul">
              <li>
                Device information, such as IP address, browser type and
                version, operating system, and device identifiers;
              </li>
              <li>
                Usage data, such as pages visited, features used, session
                duration, and click activity;
              </li>
              <li>
                Approximate geographic location derived from your IP address,
                used to surface relevant local veterinary information.
              </li>
            </ul>
            <h3 className="legal-h3">2.3 Information from Third Parties</h3>
            <p className="legal-p">
              If you choose to sign in through a third-party authentication
              service (such as Google), we receive basic profile information
              from that service consistent with your privacy settings on that
              platform.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 3 */}
          <div className="legal-section">
            <h2 className="legal-h2">3. How We Use Your Information</h2>
            <p className="legal-p">
              We use the information we collect for the following purposes:
            </p>
            <ul className="legal-ul">
              <li>
                To provide, operate, and maintain the Service, including your
                pet profile, health records, symptom checker, and access to the
                veterinary pricing database;
              </li>
              <li>
                To personalize your experience, including surfacing relevant
                veterinary listings based on your location;
              </li>
              <li>
                To process and display community-submitted pricing data, which
                you voluntarily contribute to the platform;
              </li>
              <li>
                To communicate with you regarding your account, updates to the
                Service, and responses to your inquiries;
              </li>
              <li>
                To detect, investigate, and prevent fraud, abuse, and security
                incidents;
              </li>
              <li>
                To analyze aggregate usage patterns and improve the Service;
              </li>
              <li>To comply with applicable legal obligations.</li>
            </ul>
            <p className="legal-p">
              We do not use your pet's health information, symptom checker
              inputs, or personally identifiable data to deliver targeted
              advertising to you or third parties.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 4 */}
          <div className="legal-section">
            <h2 className="legal-h2">4. How We Share Your Information</h2>
            <h3 className="legal-h3">
              4.1 We Do Not Sell Your Personal Information
            </h3>
            <p className="legal-p">
              PetParrk does not sell your personal information to third parties.
              We do not share your individually identifiable information with
              advertisers, data brokers, or marketing platforms.
            </p>
            <h3 className="legal-h3">4.2 Service Providers</h3>
            <p className="legal-p">
              We share personal information with third-party service providers
              who assist us in operating the Service, including hosting
              infrastructure, analytics, email delivery, and payment processing.
              These providers are contractually obligated to use your
              information solely to perform services on our behalf and in
              compliance with this Privacy Policy.
            </p>
            <h3 className="legal-h3">4.3 Community-Submitted Pricing Data</h3>
            <p className="legal-p">
              Price submissions you voluntarily contribute to the PetParrk
              pricing database are displayed publicly to other users as
              aggregated, anonymized pricing information associated with a
              veterinary clinic. We do not display your name or personal account
              information in connection with submitted prices. Receipt images
              and supporting documents you upload are used solely for internal
              verification purposes and are not published.
            </p>
            <h3 className="legal-h3">
              4.4 Affiliate Partnerships and Future Practices
            </h3>
            <p className="legal-p">
              PetParrk may in the future introduce affiliate referral programs
              or other commercial partnerships. If such arrangements involve the
              use of tracking technologies that could constitute "sharing" of
              personal information under applicable law, we will update this
              Privacy Policy, provide notice to users before such practices take
              effect, and offer California residents a clear mechanism to opt
              out. We will not change our data sharing practices with respect to
              already-collected information without providing prior notice.
            </p>
            <h3 className="legal-h3">4.5 Aggregated and De-Identified Data</h3>
            <p className="legal-p">
              We may use and disclose aggregated, de-identified data — data that
              cannot reasonably be used to identify you or your pet — for
              business analysis, service improvement, research, and industry
              reporting. Such data does not constitute personal information
              under applicable law.
            </p>
            <h3 className="legal-h3">4.6 Legal Disclosures</h3>
            <p className="legal-p">
              We may disclose your personal information when required by
              applicable law, regulation, legal process, or governmental
              request, or when we reasonably believe disclosure is necessary to
              protect the rights, property, or safety of PetParrk, our users, or
              the public.
            </p>
            <h3 className="legal-h3">4.7 Business Transfers</h3>
            <p className="legal-p">
              If PetParrk is involved in a merger, acquisition, or sale of all
              or a portion of its assets, your personal information may be
              transferred as part of that transaction. We will provide notice
              before your personal information is transferred and becomes
              subject to a different privacy policy.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 5 */}
          <div className="legal-section">
            <h2 className="legal-h2">5. Your Rights and Choices</h2>
            <h3 className="legal-h3">5.1 Access and Correction</h3>
            <p className="legal-p">
              You may access and update your account information and pet
              profiles at any time through the Service. You are responsible for
              maintaining the accuracy of the information you provide.
            </p>
            <h3 className="legal-h3">5.2 Data Portability</h3>
            <p className="legal-p">
              You may request an export of your pet's health profile at any time
              by contacting us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="legal-link">
                {CONTACT_EMAIL}
              </a>
              . Your pet's health records belong to you. PetParrk does not lock
              you into our platform.
            </p>
            <h3 className="legal-h3">5.3 Deletion</h3>
            <p className="legal-p">
              You may request deletion of your account and associated personal
              information through your account settings or by contacting us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="legal-link">
                {CONTACT_EMAIL}
              </a>
              . We will process deletion requests within thirty (30) days,
              subject to legal retention obligations, fraud prevention
              requirements, and dispute resolution needs.
            </p>
            <h3 className="legal-h3">5.4 Communications Preferences</h3>
            <p className="legal-p">
              You may opt out of marketing communications at any time by using
              the unsubscribe link in any marketing email or by contacting us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="legal-link">
                {CONTACT_EMAIL}
              </a>
              . Transactional communications relating to your account may
              continue after you unsubscribe from marketing.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 6 */}
          <div className="legal-section">
            <h2 className="legal-h2">6. Data Retention</h2>
            <p className="legal-p">
              We retain your personal information for as long as your account is
              active or as necessary to provide the Service. We also retain
              information as necessary to comply with legal obligations, resolve
              disputes, enforce our agreements, and prevent fraud and abuse.
              When information is no longer required for these purposes, we
              delete or de-identify it.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 7 */}
          <div className="legal-section">
            <h2 className="legal-h2">7. Data Security</h2>
            <p className="legal-p">
              We implement administrative, technical, and physical safeguards
              designed to protect your personal information against unauthorized
              access, disclosure, alteration, and destruction. These measures
              include encryption of data in transit and access controls limiting
              internal access to personal information.
            </p>
            <p className="legal-caps">
              NOTWITHSTANDING THE FOREGOING, NO METHOD OF TRANSMISSION OVER THE
              INTERNET OR METHOD OF ELECTRONIC STORAGE IS COMPLETELY SECURE. WE
              CANNOT GUARANTEE THE ABSOLUTE SECURITY OF YOUR INFORMATION. YOU
              PROVIDE INFORMATION TO US AT YOUR OWN RISK.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 8 */}
          <div className="legal-section">
            <h2 className="legal-h2">8. Children's Privacy</h2>
            <p className="legal-p">
              The Service is not directed to children under the age of 13. We do
              not knowingly collect personal information from children under 13.
              If you believe that a child under 13 has provided personal
              information to us, please contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="legal-link">
                {CONTACT_EMAIL}
              </a>{" "}
              and we will take reasonable steps to delete such information.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 9 */}
          <div id="california" className="legal-section">
            <h2 className="legal-h2">9. California Residents — CCPA</h2>
            <p className="legal-p">
              If you are a California resident, you have the following rights
              under the California Consumer Privacy Act of 2018, as amended by
              the California Privacy Rights Act of 2020, subject to applicable
              exceptions:
            </p>
            <ul className="legal-ul">
              <li>
                <strong>Right to Know:</strong> You have the right to request
                disclosure of the categories and specific pieces of personal
                information we have collected about you, the categories of
                sources, the business purposes for collection, and the
                categories of third parties with whom we share information;
              </li>
              <li>
                <strong>Right to Delete:</strong> You have the right to request
                deletion of personal information we have collected about you,
                subject to certain exceptions;
              </li>
              <li>
                <strong>Right to Correct:</strong> You have the right to request
                correction of inaccurate personal information we maintain about
                you;
              </li>
              <li>
                <strong>Right to Opt Out of Sale or Sharing:</strong> PetParrk
                does not sell your personal information and does not share it
                for cross-context behavioral advertising;
              </li>
              <li>
                <strong>Right to Non-Discrimination:</strong> We will not
                discriminate against you for exercising any of your CCPA rights.
              </li>
            </ul>
            <p className="legal-p">
              To exercise your rights, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="legal-link">
                {CONTACT_EMAIL}
              </a>{" "}
              with the subject line "CCPA REQUEST." We will verify your identity
              before responding. We will respond within 45 days of receipt, with
              a possible 45-day extension where reasonably necessary.
            </p>
            <p className="legal-p">
              <strong>Do Not Track:</strong> The Service does not alter its
              behavior in response to Do Not Track signals from your browser.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 10 */}
          <div className="legal-section">
            <h2 className="legal-h2">10. Changes to This Policy</h2>
            <p className="legal-p">
              We may update this Privacy Policy from time to time. When we make
              material changes, we will notify you by updating the effective
              date and, where appropriate, by providing additional notice
              through the Service or by email. Your continued use of the Service
              after the effective date of any modification constitutes your
              acceptance of the changes.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 11 */}
          <div className="legal-section">
            <h2 className="legal-h2">11. Contact</h2>
            <p className="legal-p">
              If you have questions, concerns, or requests regarding this
              Privacy Policy or our privacy practices, please contact us:
            </p>
            <p className="legal-p">
              <strong>PetParrk, Inc.</strong>
              <br />
              Email:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="legal-link">
                {CONTACT_EMAIL}
              </a>
              <br />
              Mailing Address: {COMPANY_ADDRESS}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
