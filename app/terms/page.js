"use client";

import Link from "next/link";

const EFFECTIVE_DATE = "April 14, 2026";
const CONTACT_EMAIL = "[legal@petparrk.com]";
const COMPANY_ADDRESS = "[Company Address], Oakland, California";

export default function TermsOfService() {
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
            <h1 className="legal-h1">Terms of Service</h1>
            <p className="legal-date">Effective Date: {EFFECTIVE_DATE}</p>
          </div>

          {/* 1 */}
          <div className="legal-section">
            <h2 className="legal-h2">1. Acceptance of Terms</h2>
            <p className="legal-p">
              These Terms of Service ("Terms") constitute a legally binding
              agreement between you ("User" or "you") and PetParrk, Inc.
              ("PetParrk," "we," "us," or "our") governing your access to and
              use of the PetParrk platform, including our website, applications,
              and all related services (collectively, the "Service").
            </p>
            <p className="legal-caps">
              BY ACCESSING OR USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE
              READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS. IF YOU DO
              NOT AGREE TO THESE TERMS, YOU MAY NOT ACCESS OR USE THE SERVICE.
            </p>
            <p className="legal-p">
              These Terms incorporate by reference our Privacy Policy, available
              at{" "}
              <a href="/privacy-policy" className="legal-link">
                petparrk.com/privacy-policy
              </a>
              , which governs our collection and use of your personal
              information.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 2 */}
          <div className="legal-section">
            <h2 className="legal-h2">2. Description of Service</h2>
            <p className="legal-p">
              PetParrk is a pet care information and decision-support platform
              that provides:
            </p>
            <ul className="legal-ul">
              <li>
                A directory of veterinary clinics in the San Francisco Bay Area,
                including community-submitted pricing information;
              </li>
              <li>
                An AI-powered symptom triage tool that provides general guidance
                regarding the urgency of pet health concerns;
              </li>
              <li>
                A pet health profile feature allowing users to maintain records
                of their pet's health history, vaccinations, and veterinary
                visits;
              </li>
              <li>
                Community-sourced veterinary pricing data submitted by
                registered users.
              </li>
            </ul>
            <p className="legal-p">
              PetParrk is not a veterinary clinic, medical practice, or licensed
              healthcare provider. The Service is provided for informational and
              organizational purposes only.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 3 */}
          <div className="legal-section">
            <h2 className="legal-h2">3. Eligibility</h2>
            <p className="legal-p">
              You must be at least 13 years of age to access or use the Service.
              By using the Service, you represent and warrant that you are at
              least 13 years of age and that you have the legal capacity to
              enter into these Terms. If you are accessing the Service on behalf
              of an organization, you represent that you have the authority to
              bind that organization to these Terms.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 4 */}
          <div className="legal-section">
            <h2 className="legal-h2">4. Account Registration and Security</h2>
            <p className="legal-p">
              Certain features of the Service require registration of an
              account. When you register, you agree to provide accurate,
              complete, and current information and to update such information
              as necessary to maintain its accuracy.
            </p>
            <p className="legal-p">
              You are solely responsible for maintaining the confidentiality of
              your account credentials and for all activity that occurs under
              your account. You agree to notify PetParrk immediately at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="legal-link">
                {CONTACT_EMAIL}
              </a>{" "}
              if you suspect unauthorized access to or use of your account.
              PetParrk shall not be liable for any loss or damage arising from
              unauthorized use of your account credentials.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 5 */}
          <div className="legal-section">
            <h2 className="legal-h2">5. Medical Disclaimer</h2>
            <p className="legal-caps">
              THE SERVICE, INCLUDING THE AI-POWERED SYMPTOM TRIAGE TOOL, IS
              PROVIDED FOR INFORMATIONAL PURPOSES ONLY. THE SERVICE DOES NOT
              CONSTITUTE AND IS NOT A SUBSTITUTE FOR PROFESSIONAL VETERINARY
              ADVICE, DIAGNOSIS, OR TREATMENT. PETPARRK DOES NOT PROVIDE MEDICAL
              ADVICE, AND NOTHING IN THE SERVICE CREATES A
              VETERINARIAN-CLIENT-PATIENT RELATIONSHIP BETWEEN PETPARRK AND ANY
              USER.
            </p>
            <p className="legal-caps">
              ALWAYS SEEK THE ADVICE OF A LICENSED VETERINARIAN WITH RESPECT TO
              ANY QUESTIONS OR CONCERNS YOU HAVE REGARDING YOUR PET'S HEALTH. IN
              THE EVENT OF A PET HEALTH EMERGENCY, CONTACT A LICENSED
              VETERINARIAN OR EMERGENCY ANIMAL HOSPITAL IMMEDIATELY.
            </p>
            <p className="legal-p">
              The AI symptom triage tool is designed to provide general urgency
              guidance only. Outputs from the tool may be incomplete,
              inaccurate, or inapplicable to your pet's specific circumstances.
              You assume full responsibility for any decisions you make based on
              information provided through the Service.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 6 */}
          <div className="legal-section">
            <h2 className="legal-h2">6. Pricing Data and Accuracy</h2>
            <p className="legal-p">
              Pricing information displayed on the Service is submitted by
              community members based on their individual experiences with
              veterinary clinics. PetParrk reviews submissions for plausibility
              before publishing but does not independently verify the accuracy
              of any submitted price.
            </p>
            <p className="legal-p">
              Displayed prices are estimates only. Actual prices charged by
              veterinary clinics may differ materially from information shown on
              the Service. PetParrk makes no warranty or representation
              regarding the accuracy, completeness, or timeliness of any pricing
              information.
            </p>
            <p className="legal-p">
              All published prices on PetParrk are sourced from actual user
              submissions. Where verified submission data is not available, no
              price is displayed. PetParrk does not generate or publish
              AI-estimated prices as substitutes for real submission data.
            </p>
            <p className="legal-p">
              Always confirm current pricing directly with your veterinarian
              before scheduling or authorizing any services.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 7 */}
          <div className="legal-section">
            <h2 className="legal-h2">7. User-Submitted Content</h2>
            <h3 className="legal-h3">7.1 License Grant</h3>
            <p className="legal-p">
              By submitting pricing data, reviews, or other content to the
              Service ("User Content"), you grant PetParrk a non-exclusive,
              worldwide, royalty-free license to use, display, reproduce, and
              distribute such User Content solely for the purpose of operating
              and improving the Service. You retain ownership of your User
              Content.
            </p>
            <h3 className="legal-h3">7.2 Representations and Warranties</h3>
            <p className="legal-p">
              By submitting User Content, you represent and warrant that: (a)
              the content is accurate to the best of your knowledge and reflects
              your genuine experience; (b) you have the right to submit such
              content; (c) the content does not violate any applicable law or
              these Terms; and (d) receipt images or supporting documents you
              upload have been redacted to remove personal financial
              information, including account numbers and payment card numbers.
            </p>
            <h3 className="legal-h3">7.3 Prohibited Content</h3>
            <p className="legal-p">
              You may not submit User Content that is false, misleading,
              defamatory, obscene, unlawful, or that violates the rights of any
              third party. PetParrk reserves the right to remove any User
              Content that violates these Terms or that we determine, in our
              sole discretion, is otherwise inappropriate.
            </p>
            <h3 className="legal-h3">7.4 Pet Health Records</h3>
            <p className="legal-p">
              Health records, notes, and other personal pet health information
              you enter into your pet profile are stored privately and are not
              shared with other users or displayed publicly. You may export or
              delete such records at any time.
            </p>
            <h3 className="legal-h3">7.5 Community Standards</h3>
            <p className="legal-p">
              All User Content must comply with PetParrk's Code of Conduct,
              available at{" "}
              <a href="/code-of-conduct" className="legal-link">
                petparrk.com/code-of-conduct
              </a>
              , which is incorporated by reference into these Terms. Violations
              of the Code of Conduct constitute violations of these Terms and
              are subject to all remedies available hereunder.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 8 */}
          <div className="legal-section">
            <h2 className="legal-h2">8. Prohibited Conduct</h2>
            <p className="legal-p">You agree not to:</p>
            <ul className="legal-ul">
              <li>
                Use the Service for any unlawful purpose or in violation of any
                applicable law or regulation;
              </li>
              <li>
                Submit false, fabricated, or intentionally misleading pricing
                data or other content;
              </li>
              <li>
                Attempt to gain unauthorized access to any portion of the
                Service or to any systems or networks connected to the Service;
              </li>
              <li>
                Interfere with or disrupt the integrity or performance of the
                Service;
              </li>
              <li>
                Use automated means, including bots, scrapers, or crawlers, to
                access, collect, or copy data from the Service without our
                express written consent;
              </li>
              <li>
                Transmit any viruses, malware, or other malicious code through
                the Service;
              </li>
              <li>
                Impersonate any person or entity or falsely represent your
                affiliation with any person or entity;
              </li>
              <li>
                Use the Service in any manner that could damage, disable,
                overburden, or impair the Service.
              </li>
            </ul>
          </div>

          <div className="legal-divider" />

          {/* 9 */}
          <div className="legal-section">
            <h2 className="legal-h2">9. Intellectual Property</h2>
            <p className="legal-p">
              The Service and all content, features, and functionality thereof —
              including but not limited to software, text, graphics, logos, and
              the selection and arrangement thereof — are owned by PetParrk or
              its licensors and are protected by applicable copyright,
              trademark, patent, and other intellectual property laws.
            </p>
            <p className="legal-p">
              Subject to your compliance with these Terms, PetParrk grants you a
              limited, non-exclusive, non-transferable, revocable license to
              access and use the Service for your personal, non-commercial
              purposes. You may not copy, modify, distribute, sell, or create
              derivative works based on the Service or any portion thereof
              without our prior written consent.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 10 */}
          <div className="legal-section">
            <h2 className="legal-h2">10. Disclaimer of Warranties</h2>
            <p className="legal-caps">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT
              WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. TO THE FULLEST EXTENT
              PERMITTED BY APPLICABLE LAW, PETPARRK EXPRESSLY DISCLAIMS ALL
              WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND
              NON-INFRINGEMENT.
            </p>
            <p className="legal-caps">
              PETPARRK DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED,
              ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL
              COMPONENTS. PETPARRK DOES NOT WARRANT THE ACCURACY, COMPLETENESS,
              OR RELIABILITY OF ANY CONTENT AVAILABLE THROUGH THE SERVICE,
              INCLUDING COMMUNITY-SUBMITTED PRICING DATA.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 11 */}
          <div className="legal-section">
            <h2 className="legal-h2">11. Limitation of Liability</h2>
            <p className="legal-caps">
              TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT
              SHALL PETPARRK, ITS OFFICERS, DIRECTORS, EMPLOYEES, AFFILIATES,
              AGENTS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING
              BUT NOT LIMITED TO LOSS OF PROFITS, DATA, GOODWILL, OR OTHER
              INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH YOUR
              ACCESS TO OR USE OF THE SERVICE, EVEN IF PETPARRK HAS BEEN ADVISED
              OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p className="legal-caps">
              PETPARRK'S TOTAL CUMULATIVE LIABILITY TO YOU FOR ALL CLAIMS
              ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE SHALL NOT
              EXCEED THE GREATER OF (A) ONE HUNDRED DOLLARS ($100.00) OR (B) THE
              TOTAL AMOUNT PAID BY YOU TO PETPARRK IN THE TWELVE (12) MONTHS
              PRECEDING THE CLAIM.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 12 */}
          <div className="legal-section">
            <h2 className="legal-h2">12. Indemnification</h2>
            <p className="legal-p">
              You agree to indemnify, defend, and hold harmless PetParrk and its
              officers, directors, employees, affiliates, agents, and licensors
              from and against any and all claims, liabilities, damages, losses,
              costs, and expenses (including reasonable attorneys' fees) arising
              out of or relating to: (a) your access to or use of the Service;
              (b) your User Content; (c) your violation of these Terms; or (d)
              your violation of any applicable law or the rights of any third
              party.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 13 */}
          <div className="legal-section">
            <h2 className="legal-h2">13. Termination</h2>
            <p className="legal-p">
              PetParrk reserves the right to suspend or terminate your access to
              the Service, with or without notice, for any reason, including but
              not limited to your violation of these Terms. Upon termination,
              your right to use the Service will immediately cease.
            </p>
            <p className="legal-p">
              You may terminate your account at any time through the account
              deletion process within the Service or by contacting us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="legal-link">
                {CONTACT_EMAIL}
              </a>
              . Sections 5, 7, 9, 10, 11, 12, 14, and 15 shall survive
              termination.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 14 */}
          <div className="legal-section">
            <h2 className="legal-h2">14. Dispute Resolution and Arbitration</h2>
            <h3 className="legal-h3">14.1 Informal Resolution</h3>
            <p className="legal-p">
              Before initiating any formal dispute resolution proceeding, you
              agree to contact PetParrk at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="legal-link">
                {CONTACT_EMAIL}
              </a>{" "}
              and provide a written description of the dispute, your desired
              resolution, and your contact information. The parties will attempt
              to resolve the dispute informally for thirty (30) days from the
              date of notice.
            </p>
            <h3 className="legal-h3">14.2 Binding Arbitration</h3>
            <p className="legal-p">
              If the parties are unable to resolve the dispute informally, any
              claim, dispute, or controversy arising out of or relating to these
              Terms or the Service shall be resolved by binding arbitration
              administered by JAMS pursuant to its Consumer Arbitration Rules
              then in effect. The arbitration shall be conducted in California.
              The arbitrator's decision shall be final and binding and may be
              entered as a judgment in any court of competent jurisdiction.
            </p>
            <h3 className="legal-h3">14.3 Class Action Waiver</h3>
            <p className="legal-caps">
              YOU AND PETPARRK AGREE THAT EACH MAY BRING CLAIMS AGAINST THE
              OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY AND NOT AS A
              PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE
              PROCEEDING. UNLESS BOTH YOU AND PETPARRK AGREE OTHERWISE, THE
              ARBITRATOR MAY NOT CONSOLIDATE MORE THAN ONE PERSON'S CLAIMS.
            </p>
            <h3 className="legal-h3">14.4 Exceptions</h3>
            <p className="legal-p">
              Either party may seek injunctive or other equitable relief in a
              court of competent jurisdiction to prevent the actual or
              threatened infringement, misappropriation, or violation of
              intellectual property rights.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 15 */}
          <div className="legal-section">
            <h2 className="legal-h2">15. Governing Law</h2>
            <p className="legal-p">
              These Terms shall be governed by and construed in accordance with
              the laws of the State of California, without regard to its
              conflict of law provisions. To the extent that any dispute is not
              subject to arbitration under Section 14, you consent to the
              exclusive jurisdiction of the state and federal courts located in
              California.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 16 */}
          <div className="legal-section">
            <h2 className="legal-h2">16. General Provisions</h2>
            <h3 className="legal-h3">16.1 Entire Agreement</h3>
            <p className="legal-p">
              These Terms, together with the Privacy Policy and any other
              agreements expressly incorporated by reference herein, constitute
              the entire agreement between you and PetParrk with respect to the
              Service and supersede all prior or contemporaneous agreements,
              representations, and understandings.
            </p>
            <h3 className="legal-h3">16.2 Severability</h3>
            <p className="legal-p">
              If any provision of these Terms is held to be invalid, illegal, or
              unenforceable, the remaining provisions shall continue in full
              force and effect.
            </p>
            <h3 className="legal-h3">16.3 Waiver</h3>
            <p className="legal-p">
              PetParrk's failure to enforce any right or provision of these
              Terms shall not constitute a waiver of such right or provision.
            </p>
            <h3 className="legal-h3">16.4 Assignment</h3>
            <p className="legal-p">
              You may not assign or transfer these Terms or any of your rights
              or obligations hereunder without PetParrk's prior written consent.
              PetParrk may assign these Terms without restriction.
            </p>
            <h3 className="legal-h3">16.5 Modifications</h3>
            <p className="legal-p">
              PetParrk reserves the right to modify these Terms at any time. We
              will provide notice of material changes by updating the effective
              date and, where appropriate, through additional notice via the
              Service or by email. Your continued use of the Service following
              the effective date of any modification constitutes your acceptance
              of the revised Terms.
            </p>
            <h3 className="legal-h3">16.6 Force Majeure</h3>
            <p className="legal-p">
              PetParrk shall not be liable for any failure or delay in
              performance resulting from causes beyond its reasonable control,
              including acts of God, natural disasters, pandemic, governmental
              action, war, or failures of third-party infrastructure.
            </p>
          </div>

          <div className="legal-divider" />

          {/* 17 */}
          <div className="legal-section">
            <h2 className="legal-h2">17. Contact</h2>
            <p className="legal-p">
              Questions regarding these Terms should be directed to:
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
