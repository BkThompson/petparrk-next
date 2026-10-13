// HeroBanner — the illustrated page-top banner.
//
// One continuous scene with the text on top. The art is a background layer:
// fitted to the banner's height and pinned to the right, so narrower screens
// crop the left (shadowed) side and the subject stays in view. Each device
// downloads only its own file (<picture>): phone up to 640px, tablet
// 641–1023px, desktop 1024px and up.
//
// Pages pass their text as children and style it with the shared classes:
//   .hb-eyebrow  small label above the headline (optional)
//   .hb-h1       headline
//   .hb-lede     paragraph
//
// variant: "home" (tallest) | "standard" | "listing"
// Heights come from the illustration brief; they're minimums, so a long
// headline grows the banner instead of spilling out of it.
//
// The art is decorative (the text carries the meaning), so alt="".

export default function HeroBanner({ art, variant = "standard", children }) {
  return (
    <section className={`hb hb--${variant}`}>
      <picture className="hb-art">
        <source media="(min-width: 1024px)" srcSet={art.wide} />
        {art.tablet ? (
          <source media="(min-width: 641px)" srcSet={art.tablet} />
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={art.phone || art.wide}
          alt=""
          decoding="async"
          fetchPriority="high"
        />
      </picture>
      <div className="pp-container hb-inner">
        <div className="hb-text">{children}</div>
      </div>
      <style>{HB_CSS}</style>
    </section>
  );
}

const HB_CSS = `
  .hb {
    position: relative;
    display: flex;
    /* clip, not hidden: hidden on an ancestor flattens 3D transforms on iOS. */
    overflow: clip;
    background: var(--color-navy-dark);
    color: var(--color-white);
  }
  .hb--home     { min-height: 860px; }
  .hb--standard,
  .hb--listing  { min-height: 540px; }
  @media (min-width: 641px) {
    .hb--home     { min-height: 820px; }
    .hb--standard,
    .hb--listing  { min-height: 600px; }
  }
  @media (min-width: 1024px) {
    .hb--home     { min-height: 568px; }
    .hb--standard,
    .hb--listing  { min-height: 393px; }
  }

  /* Art: fitted to height, pinned right. Wider than the screen → the left
     side crops; on screens wider than the art, the navy section background
     shows on the left and the art's left edge fades into it. */
  .hb-art, .hb-art img { position: absolute; top: 0; right: 0; bottom: 0; }
  .hb-art { left: 0; pointer-events: none; }
  .hb-art img {
    height: 100%;
    width: auto;
    max-width: none;
    display: block;
    -webkit-mask-image: linear-gradient(to right, transparent 0, var(--color-black) 6%);
            mask-image: linear-gradient(to right, transparent 0, var(--color-black) 6%);
  }

  .hb-inner {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: flex-start;
    padding-top: 48px;
    padding-bottom: 48px;
  }
  @media (min-width: 641px) { .hb-inner { padding-top: 72px; } }
  /* Desktop: text centred in the banner, over the scene's shadowed side. */
  @media (min-width: 1024px) {
    .hb-inner { align-items: center; padding-top: 40px; padding-bottom: 40px; }
  }

  .hb-text { width: 100%; max-width: 680px; }
  .hb--home .hb-text { max-width: 820px; }

  .hb-eyebrow {
    margin: 0 0 14px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-gold);
  }
  .hb-h1 {
    margin: 0 0 20px;
    font-family: var(--font-urbanist, 'Urbanist', sans-serif);
    font-size: clamp(36px, 9vw, 48px);
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.025em;
    color: var(--color-white);
    text-shadow: 0 1px 3px rgb(var(--color-navy-deeper-rgb) / 0.8);
  }
  .hb--home .hb-h1 { font-size: clamp(38px, 10vw, 56px); line-height: 1.03; }
  @media (min-width: 641px) {
    .hb-h1 { font-size: 52px; }
    .hb--home .hb-h1 { font-size: 64px; }
  }
  /* 1024–1279: a little smaller so Home's second line clears the laptop. */
  @media (min-width: 1024px) {
    .hb-h1 { font-size: 52px; }
    .hb--home .hb-h1 { font-size: 60px; }
  }
  @media (min-width: 1280px) {
    .hb-h1 { font-size: 56px; }
    .hb--home .hb-h1 { font-size: 72px; }
  }

  .hb-lede {
    margin: 0 0 32px;
    max-width: 600px;
    font-size: 18px;
    font-weight: 500;
    line-height: 1.6;
    color: rgb(var(--color-white-rgb) / 0.85);
    text-shadow: 0 1px 3px rgb(var(--color-navy-deeper-rgb) / 0.8);
  }
  @media (min-width: 641px) { .hb-lede { font-size: 20px; } }
`;
