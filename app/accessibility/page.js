"use client";

const EFFECTIVE_DATE = "October 13, 2026";
const CONTACT_EMAIL = "[legal@petparrk.com]";

export default function Accessibility() {
  return (
    <>
      <style>{`        .legal-body { background: var(--color-cream); padding: 48px 0 96px; }
        .legal-page-title { margin-bottom: 48px; padding-bottom: 32px; border-bottom: 1px solid var(--color-border-strong); }
        .legal-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase; color: var(--color-muted); margin-bottom: 10px; font-family: var(--font-urbanist,'Urbanist',sans-serif); }
        .legal-h1 { font-size: clamp(24px,3vw,34px); font-weight: 800; color: var(--color-navy-dark); margin: 0 0 10px; font-family: var(--font-urbanist,'Urbanist',sans-serif); letter-spacing: -0.025em; line-height: 1.15; }
        .legal-date { font-size: 14px; font-weight: 500; color: var(--color-ink); margin: 0; }
        .legal-section { margin-bottom: 44px; }
        .legal-h2 { font-size: 16px; font-weight: 700; color: var(--color-navy-dark); text-transform: uppercase; letter-spacing: 0.10em; margin: 0 0 16px; font-family: var(--font-urbanist,'Urbanist',sans-serif); padding-bottom: 8px; }
        .legal-h3 { font-size: 17px; font-weight: 700; color: var(--color-navy-dark); margin: 24px 0 10px; font-family: var(--font-urbanist,'Urbanist',sans-serif); }
        .legal-p { font-size: 16px; font-weight: 500; color: var(--color-ink); line-height: 1.85; margin: 0 0 14px; }
        .legal-caps { font-size: 15px; color: var(--color-ink); line-height: 1.8; font-weight: 600; margin: 0 0 14px; }
        .legal-ul { margin: 10px 0 16px 22px; padding: 0; }
        .legal-ul li { font-size: 16px; font-weight: 500; color: var(--color-ink); line-height: 1.85; margin-bottom: 8px; }
        .legal-divider { height: 1px; background: var(--color-border-strong); margin: 44px 0; }
        .legal-notice-box { background: var(--color-white); border: 1px solid var(--color-border-strong); border-radius: 12px; padding: 24px 28px; margin-bottom: 32px; }
        .legal-notice-box p { font-size: 16px; color: var(--color-ink); line-height: 1.85; margin: 0; }
        .legal-link { color: var(--color-terracotta-700); font-weight: 600; text-decoration: none; }
        @media (hover: hover) { .legal-link:hover { text-decoration: underline; } }
        @media(max-width:768px) { .legal-body { padding: 40px 0 80px; } }
`}</style>
      <div className="legal-body">
        <div className="pp-container-text">
          <div className="legal-page-title">
            <p className="legal-eyebrow">Legal</p>
            <h1 className="legal-h1">Accessibility Statement</h1>
            <p className="legal-date">Last updated: {EFFECTIVE_DATE}</p>
          </div>
          <div className="legal-section">
            <h2 className="legal-h2">Our Commitment</h2>
            <p className="legal-p">
              PetParrk, LLC is committed to ensuring that our platform is
              accessible to all users, including individuals with disabilities.
              We believe that every pet owner should be able to use PetParrk
              with ease, regardless of ability or the assistive technologies
              they rely on.
            </p>
            <p className="legal-p">
              PetParrk is partially conformant with the Web Content
              Accessibility Guidelines (WCAG) 2.1 Level AA. Partially conformant
              means that some parts of the content do not fully conform to the
              accessibility standard. The areas we know about are listed under
              Known Limitations below. We are working toward full conformance
              and treat it as ongoing work rather than a finished state.
            </p>
          </div>
          <div className="legal-divider" />
          <div className="legal-section">
            <h2 className="legal-h2">What We Have Done</h2>
            <p className="legal-p">
              In October 2026 we completed an accessibility review of PetParrk.
              As a result:
            </p>
            <ul className="legal-ul">
              <li>
                <strong>Color contrast.</strong> Text meets at least 4.5:1
                contrast against its background (3:1 for large text), and form
                field borders and focus indicators meet at least 3:1.
              </li>
              <li>
                <strong>Keyboard.</strong> On the pages we tested, every link,
                button, form field and card-style control can be reached and
                used with a keyboard alone. A &ldquo;Skip to main content&rdquo; link is the first
                item on every page.
              </li>
              <li>
                <strong>Visible focus.</strong> Whatever you reach with the
                keyboard shows a clear focus ring.
              </li>
              <li>
                <strong>Pop-ups.</strong> Dialogs move focus inside when they
                open, keep it there while open, close with the Escape key and
                return you to where you were.
              </li>
              <li>
                <strong>Labels and images.</strong> Every form field has a name
                that screen readers announce. Meaningful images have text
                alternatives, and decorative graphics are hidden from screen
                readers.
              </li>
              <li>
                <strong>Messages.</strong> Errors and status messages, such as a
                password mismatch, are announced as soon as they appear.
                Symptom Checker replies are read out once they finish.
              </li>
              <li>
                <strong>Page structure.</strong> Pages use headings, landmarks
                and lists so screen reader users can move around them quickly.
              </li>
              <li>
                <strong>Reduced motion.</strong> If you turn on your device&apos;s
                &ldquo;Reduce motion&rdquo; setting, animations and smooth
                scrolling are switched off across the site.
              </li>
            </ul>
          </div>
          <div className="legal-divider" />
          <div className="legal-section">
            <h2 className="legal-h2">How We Tested</h2>
            <ul className="legal-ul">
              <li>
                Automated checks against WCAG 2.1 A and AA on 25 pages, at
                desktop and phone screen sizes.
              </li>
              <li>
                Keyboard-only testing of every interactive element on 14 key
                pages.
              </li>
              <li>
                Manual testing with VoiceOver in Safari on macOS for the main
                tasks: searching for a vet, reading a vet page, using the
                Symptom Checker and creating an account.
              </li>
            </ul>
            <p className="legal-p">
              Automated tools catch only some accessibility problems, which is
              why we also test by hand. We repeat these checks when we make
              significant changes.
            </p>
          </div>
          <div className="legal-divider" />
          <div className="legal-section">
            <h2 className="legal-h2">Known Limitations</h2>
            <p className="legal-p">
              We prefer to name what we know rather than describe our gaps in
              general terms. Areas we are currently aware of:
            </p>
            <ul className="legal-ul">
              <li>
                <strong>Signed-in areas.</strong> Your profile, the Pet Card
                editors and health history have been checked for keyboard use
                and labeling, but have had less hands-on screen reader testing
                than the public pages.
              </li>
              <li>
                <strong>The Find a Vet map</strong> is visual only. Every vet
                shown on the map is also included in the text list of
                results.
              </li>
              <li>
                <strong>Third-party components.</strong> The security check on
                sign-up is provided by Cloudflare, and the map by Mapbox. We
                chose them with accessibility in mind, but we don&apos;t control
                how they work.
              </li>
            </ul>
            <p className="legal-p">
              If you encounter a barrier that is not listed here, please report
              it using the details below so we can prioritize a fix.
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
              using. We will acknowledge your message within ten (10) business
              days and will tell you what we intend to do about it and when.
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
