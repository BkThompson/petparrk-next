/* ════════════════════════════════════════════════════════════════════════
   profileStyles — CSS shared by ProfileMain and ProfileUsername.

   The two pages' inline <style> blocks were 196-of-212 selectors identical.
   Returned as ONE string rather than composable chunks: the source has
   duplicate selectors and order-dependent overrides, so preserving source
   order by construction is safer than trusting each caller to compose it
   correctly.

   Stays per-page (appended after this string):
     • ProfileMain's owner-only rules
     • ProfileUsername's `pu-` preview-mode rules
     • five media queries whose CONTENTS genuinely differ between the pages

   Note the signature: the shared rules interpolate more than brand tokens —
   they also read `bannerPalette` and call `pageGradient(bannerKey)`, both of
   which are page-local. They are passed in rather than imported so this file
   stays a pure function of its inputs.

   Usage:
     <style>{`${profileCss({ C, bannerKey, bannerPalette })}${pageCss}`}</style>
   ════════════════════════════════════════════════════════════════════════ */

import { pageGradient } from "./petTileHelpers";

export function profileCss({ C, bannerKey, bannerPalette }) {
  return `
  .pp-shell {
    background: ${C.cream};
    /* Single source of truth for the pet-card max width. The card, the
       add-pet button, and the bottom utility buttons all reference this
       so they stay aligned — change it here only. */
    --pp-card-max: 460px;
   {/* min-height: calc(100vh - 64px); */}
  }
  .pp-hero {
    position: relative;
    background: ${pageGradient(bannerKey)};
    padding: 60px 0 110px;
    overflow: hidden;
  }
  .pp-hero-wallpaper {
    position: absolute; inset: 0;
    z-index: 0; pointer-events: none;
  }
  .pp-hero-wallpaper > div {
    will-change: transform;
  }
  .pp-hero-content {
    position: relative; z-index: 2;
  }
  .pp-identity {
    display: grid;
    grid-template-columns: 230px 1fr;
    gap: 15px;
    align-items: start;
  }
  .pp-identity-left {
    display: flex; flex-direction: column;
    align-items: center; gap: 16px;
  }
  .pp-level-desktop-wrap {
    display: flex; justify-content: center;
    overflow: visible;
  }
  .pp-avatar-outer {
    width: 156px; height: 156px;
    border-radius: 50%;
    padding: 2.5px;
    background: linear-gradient(135deg,
      rgba(255,234,176,0.95) 0%,
      rgba(207,92,54,0.50) 22%,
      rgba(255,255,255,0.20) 50%,
      rgba(207,92,54,0.45) 78%,
      rgba(255,234,176,0.95) 100%);
    box-shadow:
      0 12px 36px rgba(0,0,0,0.55),
      inset 0 1px 0 rgba(255,255,255,0.18);
    flex-shrink: 0;
    position: relative;
  }
  .pp-avatar-ring {
    width: 100%; height: 100%;
    border-radius: 50%;
    background: linear-gradient(135deg, ${C.terracotta} 0%, ${C.gold} 100%);
    padding: 4px;
    box-sizing: border-box;
  }
  .pp-avatar-inner {
    width: 100%; height: 100%; border-radius: 50%;
    background: ${bannerPalette.stops[3]};
    display: flex; align-items: center; justify-content: center;
    color: ${C.gold}; font-size: 56px; font-weight: 800;
    overflow: hidden;
  }
  .pp-avatar-inner img {
    width: 100%; height: 100%; object-fit: cover; display: block;
  }
  .pp-avatar-camera {
    position: absolute; bottom: 6px; right: 6px;
    width: 44px; height: 44px;
    border-radius: 50%;
    background: ${C.terracotta}; color: #fff;
    border: 3px solid #fff;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.30);
    transition: background 0.15s;
    line-height: 1;
  }
  .pp-avatar-camera:hover { background: ${C.terracottaDark}; }
  .pp-level-outer {
    position: relative;
    border-radius: 24px;
    padding: 1.5px;
    background: linear-gradient(135deg,
      #FFE8B8 0%,
      #EFC88B 18%,
      #FFFFFF 32%,
      #EFC88B 50%,
      #FFFFFF 68%,
      #EFC88B 82%,
      #FFE8B8 100%);
    filter: drop-shadow(0 0 8px rgba(239,200,139,0.45)) drop-shadow(0 4px 10px rgba(0,0,0,0.30));
    transition: filter 0.2s;
    display: inline-block;
    line-height: 1;
    cursor: pointer;
  }
  .pp-level-outer:hover {
    filter: drop-shadow(0 0 18px rgba(239,200,139,0.85)) drop-shadow(0 4px 14px rgba(0,0,0,0.35)) brightness(1.10);
  }
  .pp-level-badge {
    display: inline-flex; align-items: center; gap: 9px;
    padding: 9px 14px;
    border-radius: 22px;
    position: relative;
    z-index: 2; /* above celebration particles */
    font-size: 14px;
    font-weight: 800;
    /* UPPERCASE (locked). Centers under avatar, overhangs the
       150px column into the gutter. */
    letter-spacing: 0.10em;
    text-transform: uppercase;
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
    white-space: nowrap;
    border: none;
    line-height: 1;
    cursor: pointer;
    box-shadow:
      inset 0 1.5px 0 rgba(255,255,255,0.55),
      inset 0 -2px 4px rgba(0,0,0,0.32),
      0 6px 16px rgba(0,0,0,0.35);
  }
  .pp-level-badge.l0 {
    background: linear-gradient(160deg, #2a3e4e 0%, #1e303e 50%, #142433 100%);
    color: ${C.gold};
  }
  .pp-level-badge.l0 .lv-progress {
    color: ${C.terracotta};
    font-weight: 900;
    background: rgba(255,255,255,0.10);
    padding: 2px 8px;
    border-radius: 10px;
    line-height: 1;
  }
  .pp-level-badge .lv-num {
    padding: 4px 10px;
    border-radius: 11px;
    font-size: 14px;
    font-weight: 900;
    line-height: 1;
    letter-spacing: 0.04em;
  }
  .pp-identity-right {
    padding-top: 6px;
    padding-left: 4px;
    min-width: 0;
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto auto;
    column-gap: 16px;
    row-gap: 6px;
    align-items: baseline;
  }
  .pp-id-name { grid-column: 1; grid-row: 1; }
  .pp-id-handle { grid-column: 1; grid-row: 2; }
  .pp-id-location { grid-column: 1; grid-row: 3; }
  .pp-id-joined { grid-column: 2; grid-row: 1; justify-self: end; }
  .pp-id-edit { grid-column: 2; grid-row: 2; justify-self: end; }
  .pp-bio-desktop { grid-column: 1 / -1; grid-row: 4; }
  .pp-name {
    margin: 0;
    font-size: clamp(26px, 4.5vw, 32px); font-weight: 800;
    color: #fff;
    letter-spacing: -0.025em;
    line-height: 1.05;
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
  }
  .pp-handle {
    margin: 0; font-size: 16px;
    color: ${C.gold};
    font-weight: 700;
    line-height: 1.2;
  }
  .pp-handle.empty { color: rgba(255,255,255,0.45); font-style: italic; font-weight: 500; }
  .pp-location {
    margin: 0; font-size: 15px;
    color: rgba(255,255,255,0.95);
    font-weight: 600;
    line-height: 1.3;
  }
  .pp-joined {
    margin: 0; font-size: 15px;
    color: rgba(255,255,255,0.92);
    font-weight: 600;
    white-space: nowrap;
    line-height: 1.3;
  }
  .pp-edit-link {
    /* 19.5px as a bare text button. Padding with a compensating negative
       margin grows the target without moving the link. */
    display: inline-flex; align-items: center; min-height: 44px;
    background: none; border: none; padding: 12px 0; margin: -12px 0;
    font-size: 15px;
    color: ${C.gold};
    font-weight: 600; cursor: pointer;
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
    transition: color 0.15s, text-decoration 0.15s;
    line-height: 1.3;
    white-space: nowrap;
    text-decoration: none;
  }
  .pp-edit-link:hover {
    color: #fff;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .pp-bio {
    margin: 14px 0 0;
    font-size: 16px;
    font-weight: 500;
    color: rgba(255,255,255,0.92);
    line-height: 1.6;
    /* Capped at 630px so the full-width bio never reaches up alongside
       the Joined/Edit column on the right (prevents the text wrapping
       under those controls at mid widths). */
    max-width: 630px;
  }
  .pp-bio-mobile { display: none; }
  .pp-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: -68px;
    position: relative;
    z-index: 5;
  }
  .pp-stat-link {
    text-decoration: none; display: block;
    background: none; border: none; padding: 0; width: 100%;
    font: inherit; cursor: pointer;
    border-radius: 14px;
  }
  .pp-stat-outer {
    padding: 1.5px;
    border-radius: 14px;
    background: linear-gradient(15deg,
      rgba(239,200,139,0.75) 0%,
      rgba(207,92,54,0.45) 25%,
      rgba(255,255,255,0.32) 50%,
      rgba(207,92,54,0.45) 75%,
      rgba(239,200,139,0.75) 100%);
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }
  .pp-stat-link:hover .pp-stat-outer {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(23,37,49,0.18);
  }
  .pp-stat {
    background: #fff;
    border-radius: 12px;
    padding: 22px 14px 18px;
    text-align: center;
    position: relative; overflow: hidden;
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
    box-shadow: 0 6px 18px rgba(23,37,49,0.12);
  }
  .pp-stat::before {
    content: ""; position: absolute;
    top: 0; left: 0; right: 0;
    height: 5px;
  }
  .pp-stat.pack::before { background: ${C.terracotta}; }
  .pp-stat.saved::before { background: ${C.gold}; }
  .pp-stat.checks::before { background: ${C.navyDark}; }
  .pp-stat-num {
    margin: 0; font-size: clamp(30px, 4vw, 34px); font-weight: 800;
    color: ${C.navyDark}; line-height: 1; letter-spacing: -0.025em;
  }
  .pp-stat-label {
    margin: 8px 0 0; font-size: 14px; font-weight: 700;
    color: ${C.muted}; text-transform: uppercase; letter-spacing: 0.03em;
  }
  .pp-pack-section::before {
    content: "";
    display: block;
    height: 1px;
    background: linear-gradient(to right,
      transparent 0%,
      ${bannerPalette.accent}33 30%,
      ${bannerPalette.accent}55 50%,
      ${bannerPalette.accent}33 70%,
      transparent 100%);
    margin: 40px 0 30px;
  }
  .pp-divider {
    height: 1px;
    background: linear-gradient(to right,
      transparent 0%,
      ${bannerPalette.accent}33 30%,
      ${bannerPalette.accent}55 50%,
      ${bannerPalette.accent}33 70%,
      transparent 100%);
    margin: 28px 0 22px;
  }
  .pp-quick-actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin: 0 0 28px;
  }
  .pp-quick-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px 16px;
    background: #fff;
    border: 2px solid ${C.terracotta};
    border-radius: 12px;
    color: ${C.terracotta};
    font-size: 14px;
    font-weight: 700;
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
    text-decoration: none;
    transition: background 0.15s, color 0.15s;
    cursor: pointer;
  }
  .pp-quick-action:hover {
    background: ${C.terracotta};
    color: #fff;
  }
  .pp-qa-icon {
    display: inline-flex; align-items: center; justify-content: center;
    line-height: 1;
  }
  .pp-qa-label { line-height: 1; white-space: nowrap; }
  .pp-pending-indicator {
    margin: 24px auto;
    // max-width: 540px;
    padding: 14px 18px;
    background: ${C.warningBg};
    border: 1px solid ${C.warning};
    border-radius: 12px;
    text-align: center;
  }
  .pp-pending-indicator p {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
    color: ${C.warning};
    line-height: 1.6;
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
  }
  .pp-pending-indicator strong {
    font-weight: 800;
  }
  .pp-utility-links {
    display: flex;
    align-items: stretch;
    justify-content: center;
    flex-wrap: wrap;
    gap: 12px;
    padding: 28px 0 60px;
    margin-top: 8px;
    border-top: 1px solid ${C.border};
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
  }
  .pp-utility-link {
    flex: 1 1 0;
    min-width: 180px;
    padding: 0 24px;
    height: 48px;
    box-sizing: border-box;
    font-size: 15px;
    font-weight: 700;
    color: ${C.navyDark};
    background: #fff;
    border: 2px solid ${C.navyDark};
    border-radius: 12px;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    cursor: pointer;
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
    white-space: nowrap;
  }
  .pp-utility-link:hover {
    background: ${C.navyDark};
    color: #fff;
    border-color: ${C.navyDark};
    text-decoration: none;
  }
  .pp-utility-link-btn {
    color: #fff;
    background: ${C.terracotta};
    border: 2px solid ${C.terracotta};
    font-weight: 700;
  }
  .pp-utility-link-btn:hover {
    background: #fff;
    color: ${C.terracotta};
    border-color: ${C.terracotta};
  }
  .pp-utility-sep {
    display: none;
  }
  @media (max-width: 600px) {
    .pp-utility-links {
      flex-direction: column;
      max-width: var(--pp-card-max);
      margin-left: auto;
      margin-right: auto;
    }
    .pp-utility-link { width: 100%; flex: 0 0 auto; }
  }
  .pp-cc-section {
    padding: 32px 0 60px;
    text-align: center;
  }
  .pp-cc-eyebrow {
    margin: 0 0 24px;
    font-size: 11px;
    font-weight: 700;
    color: ${bannerPalette.accent};
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
  }
  .pp-cc-medal-outer {
    position: relative;
    padding: 1.5px;
    border-radius: 24px;
    background: linear-gradient(135deg,
      #FFE8B8 0%,
      #EFC88B 18%,
      #FFFFFF 32%,
      #EFC88B 50%,
      #FFFFFF 68%,
      #EFC88B 82%,
      #FFE8B8 100%);
    filter: drop-shadow(0 0 14px rgba(239,200,139,0.45)) drop-shadow(0 12px 32px rgba(0,0,0,0.30));
    max-width: 480px;
    margin: 0 auto 28px;
  }
  .pp-cc-medal {
    position: relative;
    border-radius: 22.5px;
    padding: 48px 32px 32px;
    box-shadow:
      inset 0 1.5px 0 rgba(255,255,255,0.40),
      inset 0 -2px 6px rgba(0,0,0,0.32);
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
    overflow: hidden;
  }
  .pp-cc-verified {
    position: absolute;
    top: 16px; right: 16px;
    width: 32px; height: 32px;
    border-radius: 50%;
    background: ${C.gold};
    display: flex; align-items: center; justify-content: center;
    box-shadow:
      0 2px 8px rgba(0,0,0,0.30),
      inset 0 1px 0 rgba(255,255,255,0.45);
    z-index: 2;
  }
  .pp-cc-number {
    font-size: clamp(76px, 11vw, 96px);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.04em;
    margin: 0 0 8px;
  }
  .pp-cc-number-label {
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.18em;
    color: rgba(255,255,255,0.95);
    margin: 0 0 24px;
  }
  .pp-cc-verified-line {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: 999px;
    background: rgba(0,0,0,0.20);
    font-size: 13px;
    font-weight: 600;
    color: rgba(255,255,255,0.90);
    letter-spacing: 0.10em;
  }
  .pp-cc-blurb {
    margin: 0 auto;
    max-width: 480px;
    font-size: 16px;
    font-weight: 500;
    line-height: 1.6;
    color: ${C.slate};
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
  }
  .pp-cc-empty {
    max-width: 460px;
    margin: 0 auto;
    padding: 32px 28px;
    background: #fff;
    border: 1.5px solid ${C.border};
    border-radius: 16px;
    text-align: center;
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
    box-shadow: 0 2px 12px rgba(23,37,49,0.05);
  }
  .pp-cc-empty-icon {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: ${C.cream};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
  }
  .pp-cc-empty-title {
    margin: 0 0 8px;
    font-size: 18px;
    font-weight: 800;
    color: ${C.navyDark};
    letter-spacing: -0.01em;
  }
  .pp-cc-empty-body {
    margin: 0;
    font-size: 15px;
    font-weight: 500;
    line-height: 1.6;
    color: ${C.slate};
    text-wrap: pretty;
  }
  .pp-pack-section { padding: 0px 0 20px; }
  .pp-pack-head {
    display: flex; align-items: flex-end;
    justify-content: space-between; gap: 16px;
    margin-bottom: 18px;
  }
  .pp-pack-eyebrow {
    margin: 0 0 4px; font-size: 11px; font-weight: 700;
    color: ${bannerPalette.accent};
    text-transform: uppercase; letter-spacing: 0.10em;
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
  }
  .pp-pack-title {
    margin: 0; font-size: clamp(22px, 2.6vw, 24px); font-weight: 800;
    color: ${C.navyDark}; letter-spacing: -0.025em;
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
  }
  .pp-add-pet-btn {
    padding: 0 24px; height: 44px;
    background: ${C.navyDark}; color: #fff;
    border: 2px solid ${C.navyDark}; border-radius: 12px;
    font-size: 15px; font-weight: 700;
    cursor: pointer; white-space: nowrap;
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    transition: background 0.15s, border-color 0.15s;
  }
  .pp-add-pet-btn:hover {
    background: #fff;
    color: ${C.navyDark};
    border-color: ${C.navyDark};
  }
  .pp-pet-grid { display: grid; gap: 16px; align-items: start; }
  .pp-pet-grid.cols-1 { grid-template-columns: 340px; justify-content: center; }
  .pp-pet-grid.cols-2 { grid-template-columns: repeat(2, 340px); justify-content: center; }
  .pp-pet-grid.cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .pp-pet-grid.cols-4 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .pp-form-card {
    background: #fff; border: 1px solid ${C.border};
    border-radius: 16px; padding: 28px; margin-top: 20px;
    box-shadow: 0 2px 12px rgba(23,37,49,0.05);
  }
  .pp-form-head {
    margin-bottom: 18px; padding-bottom: 14px;
    border-bottom: 1px solid ${C.border};
  }
  .pp-form-head-x {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }
  .pp-form-head h3 {
    margin: 0; font-size: 18px; font-weight: 800;
    color: ${C.navyDark}; letter-spacing: -0.01em;
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
  }
  .pp-form-eyebrow {
    font-size: 11px; font-weight: 700; color: ${C.terracotta};
    text-transform: uppercase; letter-spacing: 0.10em;
    margin: 0 0 12px;
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
  }
  .pp-form-subtitle {
    margin: 8px 0 0;
    font-size: 15px; font-weight: 600;
    color: ${C.slate};
    line-height: 1.6;
    {/* max-width: 540px; */}
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
  }
  .pp-section-divider {
    font-size: 13px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.10em;
    color: ${C.navyDark};
    margin: 28px 0 14px; padding-top: 18px;
    border-top: 1px solid ${C.border};
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
  }
  .input {
    width: 100%; padding: 0 14px; border-radius: 12px;
    border: 2px solid #DAD3C5; font-size: 15px;
    box-sizing: border-box;
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
    outline: none; background: #fff; height: 44px;
    color: ${C.navyDark}; -webkit-appearance: none; appearance: none;
    transition: border-color 0.15s;
  }
  textarea.input { padding: 12px 14px; height: auto; }
  .input:focus { border-color: ${C.terracotta}; }
  select.input {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23717A86' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 12px center;
    padding-right: 38px; cursor: pointer;
  }
  input[type="number"].input { -moz-appearance: textfield; }
  input[type="number"].input::-webkit-outer-spin-button,
  input[type="number"].input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .pp-weight-row {
    display: flex;
    gap: 8px;
    align-items: stretch;
  }
  .pp-weight-input { flex: 1 1 auto; min-width: 0; }
  .pp-weight-unit-toggle {
    display: inline-flex;
    border: 2px solid ${C.borderStrong};
    border-radius: 12px;
    overflow: hidden;
    flex-shrink: 0;
    height: 44px;
  }
  .pp-weight-unit-btn {
    padding: 0 14px;
    background: #fff;
    border: none;
    color: ${C.muted};
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
    transition: background 0.15s, color 0.15s;
  }
  .pp-weight-unit-btn.active {
    background: ${C.navyDark};
    color: #fff;
  }
  .pp-weight-unit-btn:not(.active):hover {
    background: rgba(23,37,49,0.04);
    color: ${C.navyDark};
  }
  .label {
    display: block; font-size: 13px; color: ${C.muted};
    margin-bottom: 6px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.10em;
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
  }
  .field { margin-bottom: 14px; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .field-hint { margin: 4px 0 0; font-size: 14px; font-weight: 600; color: ${C.muted}; }
  .btn-primary {
    padding: 0 24px; height: 42px; min-width: 90px;
    background: ${C.terracotta}; color: #fff;
    border: 2px solid ${C.terracotta}; border-radius: 12px;
    font-size: 15px; cursor: pointer; font-weight: 700;
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
    display: inline-flex; align-items: center; justify-content: center;
    white-space: nowrap; transition: background 0.15s, border-color 0.15s;
  }
  .btn-primary:hover {
    background: #fff;
    color: ${C.terracotta};
    border-color: ${C.terracotta};
  }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-secondary {
    padding: 0 24px; height: 42px; min-width: 90px;
    background: #fff; color: ${C.navyDark};
    border: 2px solid ${C.border}; border-radius: 12px;
    font-size: 15px; cursor: pointer; font-weight: 600;
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
    display: inline-flex; align-items: center; justify-content: center;
    white-space: nowrap; transition: background 0.15s, border-color 0.15s;
  }
  .btn-secondary:hover {
    background: ${C.navyDark};
    color: #fff;
    border-color: ${C.navyDark};
  }
  .btn-danger-sm {
    height: 42px; padding: 0 24px;
    font-size: 15px; border-radius: 8px;
    color: ${C.error}; background: #fff;
    border: 1px solid #F4C5C5; cursor: pointer;
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
    font-weight: 700; transition: background 0.15s;
  }
  .btn-danger-sm:hover { background: ${C.error}; color: ${C.white}; border: 1px solid ${C.error}; font-weight: 700; line-height: 1; transition: background 0.15s; }
  .btn-row {
    display: flex; gap: 10px; align-items: center;
    flex-wrap: wrap; margin-top: 6px;
  }
  .pp-banner-pick-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 10px;
    margin-top: 8px;
  }
  .pp-banner-swatch {
    background: #fff;
    border: 2px solid ${C.border};
    border-radius: 12px;
    padding: 10px;
    cursor: pointer;
    text-align: center;
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
    transition: transform 0.1s, border-color 0.15s, box-shadow 0.15s;
  }
  .pp-banner-swatch:hover {
    border-color: ${C.borderStrong};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(23,37,49,0.06);
  }
  .pp-banner-swatch.selected {
    border-color: ${C.terracotta};
    box-shadow: 0 0 0 3px rgba(207,92,54,0.15);
  }
  .pp-banner-swatch-color {
    height: 60px; border-radius: 8px;
    position: relative; overflow: hidden;
    margin-bottom: 8px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -2px 4px rgba(0,0,0,0.25);
  }
  .pp-banner-swatch-color svg {
    color: rgba(255,255,255,0.75);
    /* Sized and stroked here rather than via each icon's props: the swatches
       are rendered from more than one component, and CSS overrides both the
       dimensions and the stroke-width Lucide writes onto the element, so this
       reaches all of them.
       The icons come in at size 20 on a 24-unit viewBox. Blowing them up to
       35px scaled the stroke with them — a 1.8 stroke rendered around 2.6px,
       which closed up the thin gaps and read as rough rather than crisp. 28px
       with a 1.4 stroke keeps them close to the weight they were drawn at. */
    width: 32px;
    height: 32px;
    stroke-width: 1.2;
  }
  .pp-banner-swatch-label {
    font-size: 13px; font-weight: 700; color: ${C.navyDark};
    line-height: 1.2;
    display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .pp-empty {
    background: #fff;
    border: 2px dashed ${C.borderStrong};
    border-radius: 16px;
    padding: 56px 24px;
    text-align: center;
  }
  .pp-modal-backdrop {
    position: fixed; inset: 0;
    background: rgba(23,37,49,0.55);
    z-index: 100;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
    /* Scroll the backdrop itself when the modal is taller than the
       viewport, so the top is never clipped by flex centering. */
    overflow-y: auto;
  }
  .pp-modal {
    background: #fff;
    border-radius: 18px;
    max-width: 560px; width: 100%;
    max-height: 86vh;
    overflow-y: auto;
    box-shadow: 0 30px 60px rgba(0,0,0,0.40);
    font-family: var(--font-urbanist,'Urbanist',sans-serif);
  }
  .pp-modal-head {
    padding: 20px 20px 16px;
    border-bottom: 1px solid ${C.border};
    display: flex; justify-content: space-between; align-items: center;
  }
  .pp-modal-head h3 {
    margin: 0; font-size: 20px; font-weight: 800;
    color: ${C.navyDark};
  }
  .pp-modal-close {
    width: 44px; height: 44px;
    border: none; background: transparent;
    color: ${C.muted}; cursor: pointer;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s, color 0.15s;
    line-height: 1;
  }
  .pp-modal-close:hover { background: ${C.cream}; color: ${C.navyDark}; }
  .pp-modal-body { padding: 0; }
  .pp-level-row {
    display: grid;
    grid-template-columns: 64px 1fr;
    gap: 14px; align-items: flex-start;
    padding: 24px 24px;
    border-bottom: 1px solid ${C.border};
    position: relative;
  }
  .pp-level-row:last-child { border-bottom: none; }
  .pp-level-row.current {
    background: linear-gradient(90deg, rgba(207,92,54,0.07), rgba(207,92,54,0.02));
    border-bottom: 1px solid ${C.border};
  }
  .pp-level-row.current::before {
    content: "";
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: ${C.terracotta};
  }
  .pp-level-row-medal {
    padding: 1.5px;
    border-radius: 14px;
    background: linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(0,0,0,0.18) 100%);
  }
  .pp-level-row-medal-inner {
    width: 100%; height: 64px;
    border-radius: 13px;
    display: flex; align-items: center; justify-content: center;
    box-shadow:
      inset 0 1.5px 0 rgba(255,255,255,0.55),
      inset 0 -2px 4px rgba(0,0,0,0.30);
  }
  .pp-level-row-body { min-width: 0; }
  .pp-level-row-head {
    display: flex; flex-direction: column; gap: 3px;
    margin-bottom: 7px;
  }
  .pp-level-row-nameline {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  }
  .pp-level-row-num {
    font-size: 12px; font-weight: 800;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: ${C.muted};
    line-height: 1;
  }
  .pp-level-row-name {
    font-size: 20px; font-weight: 800;
    color: ${C.navyDark};
    letter-spacing: -0.01em;
  }
  .pp-level-row-tag {
    font-size: 11px; font-weight: 800;
    padding: 3px 8px;
    border-radius: 4px;
    letter-spacing: 0.10em; text-transform: uppercase;
    line-height: 1;
  }
  .pp-level-row-tag.current { background: ${C.terracotta}; color: #fff; }
  .pp-level-row-summary {
    font-size: 16px;
    font-weight: 500;
    color: ${C.slate};
    margin: 0 0 8px;
    line-height: 1.55;
  }
  .pp-ladder-wrap {
    padding: 0;
    border-top: 1px solid ${C.border};
  }
  .pp-tier-sec { border-bottom: 1px solid ${C.border}; }
  .pp-tier-head {
    display: flex; align-items: center; gap: 12px;
    width: 100%; text-align: left; border: none; background: none;
    padding: 20px; cursor: pointer; font-family: inherit;
  }
  .pp-tier-head.current { background: #FAFAF8; padding: 20px; }
  .pp-tier-head:disabled { cursor: default; }
  .pp-tier-icon {
    width: 57px; height: 57px; border-radius: 12px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    align-self: flex-start;
  }
  .pp-tier-icon svg { width: 30px; height: 30px; }
  .pp-tier-meta { flex: 1; min-width: 0; }
  .pp-tier-eyebrow {
    font-size: 11px; font-weight: 800; letter-spacing: 0.10em;
    text-transform: uppercase; color: ${C.muted}; margin-bottom: 5px;
  }
  .pp-tier-name {
    font-size: 20px; font-weight: 800; color: ${C.navyDark};
    line-height: 1.15;
  }
  .pp-tier-name.future { color: #9AA4AE; }
  .pp-tier-desc {
    font-size: 14px; font-weight: 500; color: ${C.muted};
    margin-top: 2px; line-height: 1.35;
  }
  .pp-tier-caret {
    color: #B8C0C9; flex-shrink: 0; align-self: flex-start; margin-top: 2px;
    transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .pp-tier-caret.open { transform: rotate(180deg); }
  .pp-tier-levels { padding: 20px; }
  .pp-lvl-row {
    position: relative; padding-left: 32px; padding-bottom: 18px;
  }
  .pp-lvl-row:last-child { padding-bottom: 2px; }
  .pp-lvl-line {
    position: absolute; left: 7px; top: 22px; bottom: -14px; width: 2px;
  }
  .pp-lvl-node {
    position: absolute; left: 0; top: 4px;
    width: 15px; height: 15px; border-radius: 50%;
    background: #fff; border: 2px solid #D6DBE0; box-sizing: border-box;
  }
  .pp-lvl-node.current {
    width: 17px; height: 17px; left: -1px; top: 3px; border: 3px solid ${C.terracotta};
    box-shadow: 0 0 0 3px rgba(207,92,54,0.2);
  }
  .pp-lvl-headline {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    min-height: 22px;
  }
  .pp-lvl-name { font-size: 17px; font-weight: 800; color: ${C.navyDark}; }
  .pp-lvl-row.future .pp-lvl-name { color: #9AA4AE; font-weight: 600; }
  .pp-lvl-done {
    font-size: 12px; color: ${C.success}; font-weight: 800;
    display: inline-flex; align-items: center; gap: 3px;
  }
  .pp-lvl-done svg { flex-shrink: 0; }
  .pp-lvl-here {
    background: ${C.terracotta}; color: #fff; font-size: 10px; font-weight: 800;
    padding: 3px 7px; border-radius: 4px; letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .pp-lvl-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
  /* Kept in step with the identical rule in profile/[username]/page.js — this
     file and that page both carry a copy, and changing one without the other
     is how a fix appears not to take.
     Weight up from 500 and an outline added: at 500 on a pale grey fill these
     read as disabled rather than completed. */
  .pp-lvl-pill {
    font-size: 12px; font-weight: 700; color: #6B7682; background: #F2EFE9;
    padding: 3px 10px; border-radius: 999px;
    border: var(--pill-border-w, 2px) solid #E2DCD2;
    display: inline-flex; align-items: center; gap: 4px;
  }
  .pp-lvl-pill svg { flex-shrink: 0; }
  .pp-lvl-expand { margin-top: 12px; }
  .pp-ladder-story {
    margin: 0; padding: 20px;
    border-bottom: 1px solid ${C.terracotta}22;
    background: linear-gradient(160deg, ${C.terracotta}12, ${C.terracotta}06);
  }
  .pp-story-eyebrow {
    margin: 0 0 12px; font-size: 12px; font-weight: 800;
    letter-spacing: 0.10em; text-transform: uppercase;
    color: ${C.terracotta};
  }
  .pp-story-p {
    margin: 0 0 15px; font-size: 15px; font-weight: 500;
    color: ${C.slate}; line-height: 1.6;
  }
  .pp-story-p:last-child { margin-bottom: 0; }
  .pp-story-p strong { color: ${C.navyDark}; font-weight: 800; }
  .pp-ladder-intro {
    padding: 18px 24px 20px;
  }
  .pp-ladder-intro p {
    margin: 0; font-size: 15px; line-height: 1.5;
    color: ${C.slate};
  }
  .pp-ladder-intro strong { color: ${C.navyDark}; font-weight: 800; }
  .pp-level-row-expand {
    margin-top: 16px;
    padding-top: 4px;
  }
  .pp-ladder-head {
    font-size: 12px; font-weight: 800; letter-spacing: 0.08em;
    text-transform: uppercase; color: ${C.navyDark};
    margin: 0; padding: 18px 24px 8px;
  }
  .pp-level-row-req {
    font-size: 14.5px; font-weight: 700; color: ${C.muted};
    margin: 0;
  }
  .pp-level-row-reqs {
    margin: 0; padding: 0; list-style: none;
  }
  .pp-level-row-reqs li {
    font-size: 15px;
    line-height: 1.5;
    padding: 4px 0;
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  .pp-level-row-reqs .req-icon {
    flex-shrink: 0;
    margin-top: 2px;
  }
  .pp-level-row-reqs .req-icon-met { color: ${C.success}; }
  .pp-level-row-reqs .req-icon-todo { color: ${C.borderStrong}; }
  .pp-level-row-reqs li.req-met {
    color: ${C.muted};
    font-weight: 500;
  }
  .pp-level-row-reqs li.req-todo {
    color: ${C.navyDark};
    font-weight: 600;
  }
  .pp-add-pet-mobile { display: block; margin-top: 20px; text-align: center; }
  @media (min-width: 501px) and (max-width: 768px) {
    .pp-container-mixed { max-width: 720px; }
    .pp-identity {
      grid-template-columns: 130px 1fr;
      gap: 28px;
    }

      .pp-pack-section { 
      padding: 0px 0 0px;
       }
    .pp-avatar-outer { width: 130px; height: 130px; padding: 3px; }
    .pp-avatar-inner { font-size: 44px; }
    .pp-handle { font-size: 17px; }
    .pp-location { font-size: 17px; }
    /* Restore the remaining text that was shrunk for true phones — at
       this width (501-768) there's room for the larger, on-brand sizing
       so the page doesn't look phone-sized on a small tablet. */
    .pp-joined { font-size: 15px; }
    .pp-stat-label { font-size: 14px; }
    .pp-cc-number-label { font-size: 13px; }
    .pp-cc-blurb { font-size: 16px; }

    /* Level badge: content-sized at small tablet (NOT full-width fill).
       Override the mobile rules that force display:block + width:100%. */
    /* TABLET (501–768): badge LEFT-aligned, natural width (not full,
       not centered). */
    .pp-level-mobile-wrap {
      max-width: none;
      width: auto;
      text-align: left;
    }
    .pp-level-mobile-wrap .pp-level-outer {
      display: inline-block;
      width: auto;
    }
    .pp-level-mobile-wrap .pp-level-badge {
      display: inline-flex;
      width: auto;
      justify-content: flex-start;
    }
  }
  @media (min-width: 769px) {
    .pp-level-mobile-wrap { display: none; }
  }
  `;
}
