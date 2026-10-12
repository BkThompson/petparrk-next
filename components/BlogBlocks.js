// Server-safe blog UI: no hooks, no "use client". Pages that import this stay
// server components, so Google gets fully rendered HTML.
import Link from "next/link";
import BlogFaq from "./BlogFaq";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import {
  BRAND,
  CTA,
  formatDate,
  getPage,
  getActiveCategories,
} from "../lib/blogPosts";
import { svgHex } from "../lib/tokens";
import { BLOG_COVER_ART } from "../lib/palettes";

// Falls back to system sans (never serif) if the font variable isn't set.
const FONT =
  "var(--font-urbanist, 'Urbanist'), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// ── Topic colors for the price covers ─────────────────────────────────────
// Each article's card art is its own price range, drawn in a brand color.
const TONES = {
  Dental: {
    bg: "var(--color-terracotta-600)",
    fg: "var(--color-white)",
    sub: "rgb(var(--color-white-rgb) / 0.88)",
    track: "rgb(var(--color-white-rgb) / 0.28)",
    band: "var(--color-navy-dark)",
  },
  Surgery: {
    bg: "var(--color-navy-dark)",
    fg: "var(--color-white)",
    sub: "rgb(var(--color-white-rgb) / 0.72)",
    track: "rgb(var(--color-white-rgb) / 0.16)",
    band: "var(--color-terracotta)",
  },
  Exams: {
    bg: BLOG_COVER_ART.orange150,
    fg: "var(--color-navy-dark)",
    sub: "rgb(var(--color-navy-dark-rgb) / 0.72)",
    track: "rgb(var(--color-navy-dark-rgb) / 0.14)",
    band: "var(--color-terracotta)",
  },
  Vaccines: {
    bg: "var(--color-navy-mid)",
    fg: "var(--color-white)",
    sub: "rgb(var(--color-white-rgb) / 0.75)",
    track: "rgb(var(--color-white-rgb) / 0.16)",
    band: "var(--color-gold)",
  },
  Emergency: {
    bg: "var(--color-gold)",
    fg: "var(--color-navy-dark)",
    sub: "rgb(var(--color-navy-dark-rgb) / 0.75)",
    track: "rgb(var(--color-navy-dark-rgb) / 0.16)",
    band: "var(--color-terracotta)",
  },
};
const toneFor = (topic) => TONES[topic] || TONES.Dental;

export const BLOG_CSS = `
  .bl, .ba { font-family: ${FONT}; color: var(--color-ink); background: var(--color-cream); }
  .bl h1, .bl h2, .ba h1, .ba h2, .ba h3 { text-wrap: balance; }
  .bl p, .ba p, .ba li { text-wrap: pretty; }

  /* ── Shared bits ───────────────────────────────────────────────────── */
  /* Same as the site's .badge .badge-terracotta (globals.css). */
  .b-topic {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 12px;
    border-radius: 999px;
    border: var(--pill-border-w, 2px) solid rgb(var(--color-warning-text-rgb) / 0.22);
    background: var(--color-warning-light);
    color: var(--color-warning-text);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.02em;
    white-space: nowrap;
    line-height: initial;
    height: 31px;
    }
  /* Same as the site's small gold/terracotta eyebrow labels. */
  .b-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase; margin: 0 0 12px; }
  .b-meta { font-size: 14px; font-weight: 600; color: var(--color-navy-light); margin: 0; display: flex; flex-wrap: wrap; gap: 4px 14px; }
  .b-meta > span + span::before { content: ""; display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: currentColor; opacity: 0.5; margin-right: 14px; vertical-align: middle; position: relative; top: -2px; }

  /* Price cover: the card art is the article's own price range */
  .b-cover { position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; padding: 24px; min-height: 196px; box-sizing: border-box; }
  .b-cover::before { content: ""; position: absolute; inset: 0; pointer-events: none;
    background-image: repeating-linear-gradient(45deg, rgb(var(--color-white-rgb) / 0.035) 0 1px, transparent 1px 9px), repeating-linear-gradient(-45deg, rgb(var(--color-black-rgb) / 0.03) 0 1px, transparent 1px 9px); }
  .b-cover > * { position: relative; }
  .b-cover p { color: inherit; }
  .b-cover-label { font-size: 14px; font-weight: 700; margin: 0 0 4px; }
  .b-cover-price { font-size: clamp(30px, 3.4vw, 40px); font-weight: 800; letter-spacing: -0.035em; line-height: 1.05; margin: 0 0 16px; }
  .b-cover-track { position: relative; height: 10px; border-radius: 999px; }
  .b-cover-band { position: absolute; top: 0; bottom: 0; border-radius: 999px; }
  .b-cover-ends { display: flex; justify-content: space-between; margin-top: 8px; font-size: 12.5px; font-weight: 700; }

  /* ── Index: hero ───────────────────────────────────────────────────── */
  .bl-hero { position: relative; overflow: hidden; background: var(--color-navy-dark); padding: 80px 0 168px; min-height: 393px; box-sizing: border-box; border-bottom: 1px solid rgb(var(--color-white-rgb) / 0.07); }
  .bl-hero-glow { position: absolute; top: -40%; right: -10%; width: 900px; height: 800px; pointer-events: none;
    background: radial-gradient(ellipse at center, rgb(var(--color-gold-rgb) / 0.1) 0%, rgb(var(--color-gold-rgb) / 0.04) 35%, transparent 70%); }
  /* Faint rows of price ranges behind the headline */
  .bl-hero-ranges { position: absolute; inset: 0; pointer-events: none; opacity: 0.75;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='520' height='168'%3E%3Cg fill='none' stroke-linecap='round'%3E%3Cpath d='M20 24H300' stroke='${svgHex("white")}' stroke-opacity='.06' stroke-width='6'/%3E%3Cpath d='M110 24H190' stroke='${svgHex("terracotta")}' stroke-opacity='.28' stroke-width='6'/%3E%3Cpath d='M220 80H500' stroke='${svgHex("white")}' stroke-opacity='.06' stroke-width='6'/%3E%3Cpath d='M330 80H380' stroke='${svgHex("gold")}' stroke-opacity='.24' stroke-width='6'/%3E%3Cpath d='M60 136H360' stroke='${svgHex("white")}' stroke-opacity='.06' stroke-width='6'/%3E%3Cpath d='M150 136H260' stroke='${svgHex("terracotta")}' stroke-opacity='.22' stroke-width='6'/%3E%3C/g%3E%3C/svg%3E");
    background-size: 520px 168px;
    -webkit-mask-image: linear-gradient(to right, transparent 0%, var(--color-black) 45%, var(--color-black) 100%); mask-image: linear-gradient(to right, transparent 0%, var(--color-black) 45%, var(--color-black) 100%); }
  .bl-hero .pp-container { position: relative; z-index: 1; }
  .bl-hero-inner { max-width: 760px; }
  .bl-h1 { font-size: clamp(30px, 5.5vw, 56px); font-weight: 800; color: var(--color-white); letter-spacing: -0.025em; line-height: 1.05; margin: 0 0 16px; }
  .bl-sub { font-size: 17px; font-weight: 500; line-height: 1.75; color: rgb(var(--color-white-rgb) / 0.65); margin: 0; max-width: 560px; }
  .bl-hero .bc-link { color: var(--color-gold); }
  @media (hover: hover) { .bl-hero .bc-link:hover { color: var(--color-white); } }
  .bl-hero .bc-current, .bl-hero .bc-plain { color: rgb(var(--color-white-rgb) / 0.85); }

  /* ── Index: body ───────────────────────────────────────────────────── */
  .bl-body { padding-bottom: 96px; }
  .bl-feature { position: relative; z-index: 2; margin-top: -104px; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); background: var(--color-white); border-radius: 24px; overflow: hidden; text-decoration: none; color: inherit;
    box-shadow: var(--shadow-xl); transition: transform 0.2s ease, box-shadow 0.2s ease; }
  @media (hover: hover) { .bl-feature:hover { transform: translateY(-3px); box-shadow: var(--shadow-xl); } }
  .bl-feature:focus-visible, .bl-card:focus-visible { outline: var(--focus-outline); outline-offset: 4px; }
  .bl-feature .b-cover { min-height: 340px; padding: 36px; }
  .bl-feature .b-cover-price { font-size: clamp(40px, 5vw, 60px); }
  .bl-feature-body { padding: 40px 40px 36px; display: flex; flex-direction: column; justify-content: center; gap: 14px; }
  .bl-feature-kicker { display: flex; align-items: center; gap: 10px; }
  .bl-feature-title { font-size: clamp(25px, 2.8vw, 34px); font-weight: 800; color: var(--color-navy-dark); letter-spacing: -0.025em; line-height: 1.12; margin: 0; transition: color 0.15s ease; }
  @media (hover: hover) { .bl-feature:hover .bl-feature-title { color: var(--color-terracotta); } }
  @media (hover: hover) { .bl-feature:hover .bl-feature-cta { color: var(--color-navy-dark); } }
  .bl-feature-cta { transition: color 0.15s ease; }
  .bl-feature-dek { font-size: 17px; font-weight: 500; line-height: 1.6; color: var(--color-slate); margin: 0; }
  .bl-feature-cta { margin-top: 6px; display: inline-flex; align-items: center; gap: 4px; font-size: 14px; font-weight: 700; color: var(--color-terracotta-700); }

  .bl-section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin: 72px 0 24px; }
  .bl-h2 { font-size: clamp(24px, 2.6vw, 30px); font-weight: 800; color: var(--color-navy-dark); letter-spacing: -0.02em; margin: 0; }
  .bl-count { font-size: 14px; font-weight: 600; color: var(--color-navy-light); margin: 0; }
  .bl-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px; }
  .bl-card { height: 100%; display: flex; flex-direction: column; background: var(--color-white); border: 1px solid var(--color-border); border-radius: 16px; overflow: hidden; text-decoration: none; color: inherit; transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
  @media (hover: hover) { .bl-card:hover { transform: translateY(-3px); border-color: var(--color-border-strong); box-shadow: var(--shadow-hover); } }
  .bl-card-body { padding: 22px 22px 24px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
  .bl-card-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .bl-card-read { font-size: 13px; font-weight: 600; color: var(--color-navy-light); }
  .bl-card-title { font-size: 20px; font-weight: 800; color: var(--color-navy-dark); letter-spacing: -0.015em; line-height: 1.25; margin: 0; transition: color 0.15s ease; }
  @media (hover: hover) { .bl-card:hover .bl-card-title { color: var(--color-terracotta); } }
  .bl-card-dek { font-size: 15.5px; font-weight: 500; line-height: 1.55; color: var(--color-slate); margin: 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .bl-card-date { margin-top: auto; padding-top: 6px; font-size: 13px; font-weight: 600; color: var(--color-navy-light); }
  .bl-empty { margin-top: -40px; position: relative; background: var(--color-white); border-radius: 16px; padding: 36px; font-size: 17px; font-weight: 500; line-height: 1.7; }

  /* Category buttons — pill shape with the site's 2px chip border */
  .bl-cats { margin: 56px 0 0; }
  /* Page and category links land here, not back at the top banner. */
  #articles { scroll-margin-top: 88px; }
  /* Category or page-2 views have no featured card overlapping the banner. */
  .bl-hero--plain { padding-bottom: 88px; }
  .bl-hero--plain + .bl-body > .bl-cats:first-child { margin-top: 48px; }
  .bl-cats ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 10px; }
  .bl-cat {
    display: inline-flex;
    align-items: center;
    min-height: 40px;
    padding: 0 18px;
    border-radius: 999px;
    border: 2px solid var(--color-border-strong);
    background: var(--color-white);
    color: var(--color-navy-dark);
    font-size: 14px;
    font-weight: 700;
    text-decoration: none;
    transition: border-color .15s, color .15s, background .15s;
    }
  @media (hover: hover) { .bl-cat:hover { border-color: var(--color-terracotta); color: var(--color-terracotta-700); } }
  .bl-cat[aria-current="page"] { background: var(--color-navy-dark); border-color: var(--color-navy-dark); color: var(--color-white); }
  .bl-cat:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
  .bl-cats + section .bl-section-head { margin-top: 36px; }

  /* Pagination */
  .bl-pager { margin-top: 48px; display: flex; justify-content: center; }
  .bl-pager ol { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .bl-pager a, .bl-pager span { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; height: 44px; padding: 0 14px; box-sizing: border-box; border-radius: 999px; font-size: 15px; font-weight: 700; text-decoration: none; }
  .bl-pager a { color: var(--color-navy-dark); background: var(--color-white); border: 2px solid var(--color-border-strong); }
  @media (hover: hover) { .bl-pager a:hover { border-color: var(--color-terracotta); color: var(--color-terracotta-700); } }
  .bl-pager a:focus-visible { outline: var(--focus-outline); outline-offset: 2px; }
  .bl-pager [aria-current="page"] { background: var(--color-navy-dark); color: var(--color-white); border: 1px solid var(--color-navy-dark); }
  .bl-pager .bl-step { gap: 6px; padding: 0 16px 0 12px; }
  .bl-pager .bl-gap { min-width: 24px; padding: 0; color: var(--color-navy-light); }
  .bl-pager .bl-step--next { padding: 0 12px 0 16px; }
  /* Phones: arrows only (the words stay for screen readers). */
  @media (max-width: 480px) {
    .bl-pager .bl-step, .bl-pager .bl-step--next { padding: 0; width: 44px; }
    .bl-step-label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  }
  .bl-pager .is-disabled { color: var(--color-muted); background: transparent; border: 2px solid var(--color-border); }

  /* Waitlist band */
  .b-band { margin-top: 88px; position: relative; overflow: hidden; background: var(--color-navy-dark); border-radius: 24px; padding: 48px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 24px 40px; align-items: center; }
  .b-band::after { content: ""; position: absolute; right: -120px; top: -160px; width: 480px; height: 420px; pointer-events: none; background: radial-gradient(ellipse at center, rgb(var(--color-terracotta-rgb) / 0.3) 0%, transparent 65%); }
  .b-band > * { position: relative; z-index: 1; }
  .b-band .b-eyebrow { margin-bottom: 10px; }
  .b-band-title { font-size: clamp(24px, 3vw, 32px); font-weight: 800; color: var(--color-white); letter-spacing: -0.025em; line-height: 1.15; margin: 0 0 10px; }
  .b-band-text { font-size: 17px; font-weight: 500; line-height: 1.6; color: rgb(var(--color-white-rgb) / 0.75); margin: 0; max-width: 560px; }
  /* Same as How It Works .bt .bt-tc: 12px corners, 2px border, colors flip on hover. */
  .b-btn { height: 48px; padding: 0 24px; box-sizing: border-box; border-radius: 12px; font-size: 15px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; background: var(--color-terracotta-600); color: var(--color-white); border: 2px solid var(--color-terracotta-600); transition: background .25s, color .25s; }
  @media (hover: hover) { .b-btn:hover { background: var(--color-white); color: var(--color-terracotta-700); } }
  .b-btn:focus-visible { outline: 3px solid var(--color-gold); outline-offset: 3px; }

  /* ── Article: header ───────────────────────────────────────────────── */
  /* Same navy banner as the blog home page (glow + faint price lines). */
  .ba-head { position: relative; overflow: hidden; padding: 56px 0 132px; background: var(--color-navy-dark); border-bottom: 1px solid rgb(var(--color-white-rgb) / 0.07); }
  .ba-head .pp-container { z-index: 1; }
  /* Article titles are long, so the faint price lines sit further back here. */
  .ba-head .bl-hero-ranges { opacity: 0.3; }
  /* Breadcrumb: a slim strip below the site navbar, above the banner. */
  .ba-crumbs { background: var(--color-cream); padding: 14px 0; border-bottom: 1px solid var(--color-border); }
  .ba-crumbs-inner { max-width: 984px; margin: 0 auto; }
  .ba-crumbs .bc-nav { margin: 0; }
  .ba-head .pp-container { position: relative; }
  /* Header, glance card and body share one centered column (680 + 64 + 240). */
  .ba-head-inner, .ba-glance, .ba-layout { max-width: 984px; margin-left: auto; margin-right: auto; }
  .ba-head-inner > .ba-h1, .ba-head-inner > .ba-dek { max-width: 820px; }
  .ba-h1 { font-size: clamp(30px, 5.5vw, 56px); font-weight: 800; color: var(--color-white); letter-spacing: -0.025em; line-height: 1.05; margin: 14px 0 16px; }
  .ba-dek { font-size: clamp(18px, 2.1vw, 21px); font-weight: 500; line-height: 1.55; color: rgb(var(--color-white-rgb) / 0.7); margin: 0 0 28px; max-width: 700px; }
  .ba-byline { display: flex; align-items: center; gap: 14px; }
  .ba-avatar { flex: none; width: 44px; height: 44px; border-radius: 50%; background: var(--color-gold); color: var(--color-navy-dark); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; }
  .ba-author { font-size: 16px; font-weight: 800; color: var(--color-navy-dark); margin: 0 0 2px; }
  .ba-head .b-meta { color: rgb(var(--color-white-rgb) / 0.65); }
  .ba-head .ba-author { color: var(--color-white); }
  .ba-author-box .ba-avatar { background: var(--color-navy-dark); color: var(--color-gold); }

  /* At a glance */
  .ba-glance { position: relative; z-index: 2; margin-top: -84px; background: var(--color-white); border-radius: 20px; box-shadow: var(--shadow-lg); padding: 26px 32px 22px; }
  .ba-glance-title { font-size: 15px; font-weight: 800; color: var(--color-navy-dark); margin: 0 0 16px; }
  .ba-glance-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 0; }
  .ba-glance-grid div { padding: 2px 24px 4px; border-left: 1px solid var(--color-border); }
  .ba-glance-grid div:first-child { padding-left: 0; border-left: 0; }
  .ba-glance-grid dt { order: 2; font-size: 14px; font-weight: 600; color: var(--color-navy-light); margin: 4px 0 0; }
  .ba-glance-grid dd { margin: 0; font-size: clamp(24px, 2.8vw, 32px); font-weight: 800; color: var(--color-navy-dark); letter-spacing: -0.03em; line-height: 1.1; }
  .ba-glance-grid div { display: flex; flex-direction: column; }
  .ba-glance-grid div:first-child dd { color: var(--color-terracotta); }
  .ba-glance-note { font-size: 14px; font-weight: 500; color: var(--color-slate); margin: 16px 0 0; padding-top: 14px; border-top: 1px solid var(--color-border); }

  /* Layout: article + "On this page" */
  .ba-layout { display: grid; grid-template-columns: minmax(0, 680px) 240px; justify-content: space-between; gap: 64px; padding: 56px 0 24px; }
  .ba-toc { position: sticky; top: 96px; align-self: start; }
  .ba-toc-title { font-size: 14px; font-weight: 800; color: var(--color-navy-dark); margin: 0 0 12px; }
  .ba-toc ol { list-style: none; margin: 0; padding: 0; border-left: 2px solid var(--color-border-strong); }
  .ba-toc li { margin: 0; }
  .ba-toc a { display: block; padding: 7px 0 7px 16px; margin-left: -2px; border-left: 2px solid transparent; font-size: 14px; font-weight: 600; line-height: 1.4; color: var(--color-navy-light); text-decoration: none; }
  @media (hover: hover) { .ba-toc a:hover { color: var(--color-terracotta-700); border-left-color: var(--color-terracotta); } }
  .ba-toc a:focus-visible { outline: var(--focus-outline); outline-offset: 2px; border-radius: 4px; }
  .ba-toc-mobile { display: none; }

  /* Article body */
  .ba-p { font-size: 18px; font-weight: 500; line-height: 1.8; margin: 0 0 22px; color: var(--color-ink); }
  .ba-content > .ba-p:first-child { font-size: 20px; line-height: 1.7; color: var(--color-navy-dark); }
  .ba-h2 { font-size: clamp(25px, 2.8vw, 30px); font-weight: 800; color: var(--color-navy-dark); letter-spacing: -0.02em; line-height: 1.2; margin: 56px 0 18px; scroll-margin-top: 96px; }
  .ba-h3 { font-size: 20px; font-weight: 800; color: var(--color-navy-dark); line-height: 1.3; margin: 32px 0 12px; }
  .ba-ul, .ba-ol { margin: 0 0 24px; padding: 0; list-style: none; }
  .ba-ul li, .ba-ol li { position: relative; font-size: 18px; font-weight: 500; line-height: 1.7; margin-bottom: 12px; padding-left: 30px; }
  .ba-ul li::before { content: ""; position: absolute; left: 6px; top: 0.72em; width: 8px; height: 8px; border-radius: 50%; background: var(--color-terracotta); }
  .ba-ol { counter-reset: ba; }
  .ba-ol li { counter-increment: ba; padding-left: 42px; }
  .ba-ol li::before { content: counter(ba); position: absolute; left: 0; top: 2px; width: 28px; height: 28px; border-radius: 50%; background: var(--color-navy-dark); color: var(--color-gold); font-size: 14px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
  .ba-link { color: var(--color-terracotta-700); font-weight: 700; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
  @media (hover: hover) { .ba-link:hover { color: var(--color-navy-dark); } }
  .ba-content strong { color: var(--color-navy-dark); font-weight: 800; }

  .ba-range { margin: 32px 0 36px; padding: 26px 28px 22px; background: var(--color-white); border: 1px solid var(--color-border); border-radius: 16px; }
  .ba-range-label { font-size: 15px; font-weight: 700; color: var(--color-navy-light); margin: 0 0 6px; }
  .ba-range-typical { font-size: clamp(32px, 5vw, 44px); font-weight: 800; color: var(--color-navy-dark); letter-spacing: -0.035em; line-height: 1.05; margin: 0 0 4px; }
  .ba-range-cap { font-size: 15px; font-weight: 600; color: var(--color-slate); margin: 0 0 22px; }
  .ba-range-track { position: relative; height: 14px; border-radius: 999px; background: var(--color-border); }
  .ba-range-band { position: absolute; top: 0; bottom: 0; border-radius: 999px; background: var(--color-terracotta); }
  .ba-range-ends { display: flex; justify-content: space-between; gap: 16px; margin-top: 10px; font-size: 14px; font-weight: 600; color: var(--color-navy-light); }
  .ba-range-ends b { color: var(--color-navy-dark); font-weight: 800; }
  .ba-range-note { font-size: 14px; font-weight: 500; line-height: 1.6; color: var(--color-slate); margin: 16px 0 0; }

  .ba-table-wrap { overflow-x: auto; margin: 28px 0 32px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-white); }
  .ba-table { width: 100%; border-collapse: collapse; font-size: 16px; }
  .ba-table caption { text-align: left; font-size: 15px; font-weight: 800; color: var(--color-navy-dark); padding: 18px 20px 6px; }
  .ba-table th { text-align: left; font-weight: 700; font-size: 15px; color: var(--color-navy-light); padding: 12px 20px; border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); background: var(--color-border); }
  /* No caption: the table's own frame is the top edge, so skip the extra line. */
  .ba-table thead:first-child th { border-top: 0; }
  .ba-table td { padding: 14px 20px; border-bottom: 1px solid var(--color-border); font-weight: 500; line-height: 1.5; vertical-align: top; }
  .ba-table td:first-child { font-weight: 700; color: var(--color-navy-dark); }
  .ba-table tr:last-child td { border-bottom: 0; }

  .ba-callout { margin: 28px 0; padding: 20px 24px; background: var(--color-caution-light); border: 1px solid rgb(var(--color-caution-rgb) / 0.4); border-radius: 16px; }
  .ba-callout-title { font-size: 16px; font-weight: 800; color: var(--color-navy-dark); margin: 0 0 6px; }
  .ba-callout .ba-p { font-size: 17px; line-height: 1.65; margin: 0; }

  .ba-gate { position: relative; overflow: hidden; margin: 48px 0; padding: 32px 32px 30px; background: var(--color-navy-dark); border-radius: 20px; }
  .ba-gate::after { content: ""; position: absolute; right: -80px; bottom: -140px; width: 360px; height: 320px; pointer-events: none; background: radial-gradient(ellipse at center, rgb(var(--color-terracotta-rgb) / 0.32) 0%, transparent 65%); }
  .ba-gate > * { position: relative; z-index: 1; }
  .ba-gate-title { font-size: clamp(21px, 2.6vw, 25px); font-weight: 800; letter-spacing: -0.02em; line-height: 1.25; margin: 0 0 10px; color: var(--color-white); }
  .ba-gate-text { font-size: 17px; font-weight: 500; line-height: 1.65; margin: 0 0 22px; color: rgb(var(--color-white-rgb) / 0.78); }


  .ba-author-box { display: flex; gap: 16px; align-items: center; margin-top: 56px; padding: 24px; background: var(--color-white); border: 1px solid var(--color-border); border-radius: 16px; }
  .ba-author-box .ba-author { margin-bottom: 4px; }
  .ba-author-role { font-size: 13px; font-weight: 700; color: var(--color-terracotta-700); margin: 0 0 8px; }
  .ba-author-bio { font-size: 16px; font-weight: 500; line-height: 1.65; margin: 0; color: var(--color-slate); }

  .ba-related { padding: 24px 0 96px; }

  /* ── Responsive ───────────────────────────────────────────────────── */
  @media (max-width: 1023px) {
    .bl-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; }
    .bl-feature { grid-template-columns: 1fr; }
    .bl-feature .b-cover { min-height: 230px; padding: 28px; }
    .bl-feature-body { padding: 28px 28px 30px; }
    .ba-layout { grid-template-columns: minmax(0, 1fr); max-width: 680px; padding-top: 40px; gap: 0; }
    .ba-head-inner, .ba-glance, .ba-crumbs-inner { max-width: 680px; }
    .ba-toc { display: none; }
    .ba-toc-mobile { display: block; margin: 0 0 8px; background: var(--color-white); border: 1px solid var(--color-border); border-radius: 16px; }
    .ba-toc-mobile summary { cursor: pointer; list-style: none; padding: 16px 20px; font-size: 15px; font-weight: 800; color: var(--color-navy-dark); display: flex; justify-content: space-between; align-items: center; }
    .ba-toc-mobile summary::-webkit-details-marker { display: none; }
    .ba-toc-mobile summary::after { content: "+"; font-size: 20px; color: var(--color-terracotta); }
    .ba-toc-mobile[open] summary::after { content: "–"; }
    .ba-toc-mobile ol { margin: 0; padding: 0 20px 14px 40px; }
    .ba-toc-mobile li { padding: 6px 0; font-size: 15px; font-weight: 600; line-height: 1.4; }
    .ba-toc-mobile a { color: var(--color-navy-mid); text-decoration: none; }
    @media (hover: hover) { .ba-toc-mobile a:hover { color: var(--color-terracotta-700); text-decoration: underline; } }
  }
  @media (max-width: 768px) {
    .bl-hero { padding: 48px 0 112px; }
    .bl-hero--plain { padding-bottom: 56px; }
    .bl-hero-ranges { opacity: 0.4; }
    .bl-grid { grid-template-columns: 1fr; gap: 18px; }
    .bl-feature { margin-top: -72px; border-radius: 16px; }
    .bl-feature .b-cover { min-height: 200px; padding: 24px; }
    .bl-feature-body { padding: 24px 22px 26px; }
    .bl-section-head { margin-top: 52px; }
    .b-btn { width: 100%; }
    .b-band { grid-template-columns: 1fr; padding: 32px 24px; border-radius: 20px; margin-top: 64px; }
    .ba-head { padding: 40px 0 112px; }
    .ba-glance { margin-top: -80px; padding: 22px 20px 18px; border-radius: 16px; }
    .ba-glance-grid { grid-template-columns: 1fr; }
    .ba-glance-grid div { flex-direction: row; align-items: baseline; justify-content: space-between; gap: 12px; padding: 12px 0; border-left: 0; border-top: 1px solid var(--color-border); }
    .ba-glance-grid div:first-child { border-top: 0; padding-top: 0; }
    .ba-glance-grid dd { font-size: 24px; }
    .ba-glance-grid dt { order: 0; margin: 0; text-align: left; }
    .ba-p, .ba-ul li, .ba-ol li { font-size: 17px; }
    .ba-content > .ba-p:first-child { font-size: 18.5px; }
    .ba-range, .ba-gate { padding-left: 20px; padding-right: 20px; }
    .ba-table { font-size: 15px; }
    .ba-table th, .ba-table td { padding-left: 14px; padding-right: 14px; }
    .ba-author-box { padding: 20px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .bl-feature, .bl-card, .bl-card-title, .bl-feature-title, .b-btn { transition: none; }
    @media (hover: hover) { .bl-feature:hover, .bl-card:hover { transform: none; } }
  }
`;

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const money = (n) => `$${Number(n).toLocaleString("en-US")}`;

/** Renders **bold** and [label](href) inside a string. */
export function Inline({ text }) {
  if (!text) return null;
  const parts = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      parts.push(<strong key={k++}>{m[1]}</strong>);
    } else {
      const href = m[3];
      const external = /^https?:\/\//.test(href);
      parts.push(
        external ? (
          <a
            key={k++}
            href={href}
            className="ba-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            {m[2]}
          </a>
        ) : (
          <Link key={k++} href={href} className="ba-link">
            {m[2]}
          </Link>
        ),
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

// Prices are right-skewed (most clinics cluster low, a few go very high), so
// the bars use a log scale — otherwise the typical band gets crushed to one side.
function pos(v, lo, hi) {
  const a = Math.log(lo);
  const b = Math.log(hi);
  if (b === a) return 0;
  return Math.min(100, Math.max(0, ((Math.log(v) - a) / (b - a)) * 100));
}

// ── Card art: the article's own price range ────────────────────────────────
export function PriceCover({ post }) {
  const c = post.cover;
  const t = toneFor(post.topic);
  if (!c)
    return (
      <div
        className="b-cover"
        style={{ background: t.bg }}
        aria-hidden="true"
      />
    );
  const left = pos(c.typicalLow, c.low, c.high);
  const right = pos(c.typicalHigh, c.low, c.high);
  return (
    <div
      className="b-cover"
      style={{ background: t.bg, color: t.fg }}
      aria-hidden="true"
    >
      <p className="b-cover-label" style={{ color: t.sub }}>
        {c.label}, typical in California
      </p>
      <p className="b-cover-price">
        {money(c.typicalLow)}–{money(c.typicalHigh)}
      </p>
      <div className="b-cover-track" style={{ background: t.track }}>
        <div
          className="b-cover-band"
          style={{
            left: `${left}%`,
            width: `${Math.max(3, right - left)}%`,
            background: t.band,
          }}
        />
      </div>
      <div className="b-cover-ends" style={{ color: t.sub }}>
        <span>{money(c.low)}</span>
        <span>{money(c.high)}</span>
      </div>
    </div>
  );
}

export function FeaturedCard({ post }) {
  return (
    <Link href={`/blog/${post.slug}`} className="bl-feature">
      <PriceCover post={post} />
      <div className="bl-feature-body">
        <div className="bl-feature-kicker">
          <span className="b-topic">{post.topic}</span>
        </div>
        <h2 className="bl-feature-title">
          {post.draft ? "[Draft] " : ""}
          {post.title}
        </h2>
        <p className="bl-feature-dek">{post.dek}</p>
        <p className="b-meta">
          {post.authorInfo && <span>{post.authorInfo.name}</span>}
          <span>{formatDate(post.updated || post.published)}</span>
          <span>{post.readMinutes} min read</span>
        </p>
        <span className="bl-feature-cta">
          Read article{" "}
          <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

export function PostCard({ post, headingLevel = 3 }) {
  const H = `h${headingLevel}`;
  return (
    <Link href={`/blog/${post.slug}`} className="bl-card">
      <PriceCover post={post} />
      <div className="bl-card-body">
        <div className="bl-card-top">
          <span className="b-topic">{post.topic}</span>
          <span className="bl-card-read">{post.readMinutes} min read</span>
        </div>
        <H className="bl-card-title">
          {post.draft ? "[Draft] " : ""}
          {post.title}
        </H>
        <p className="bl-card-dek">{post.dek}</p>
        <span className="bl-card-date">
          {formatDate(post.updated || post.published)}
        </span>
      </div>
    </Link>
  );
}

// Links for the list: /blog, /blog?page=2, /blog?category=vet-costs&page=2
export function blogHref({ page = 1, category = null } = {}) {
  const q = new URLSearchParams();
  if (category) q.set("category", category);
  if (page > 1) q.set("page", String(page));
  const qs = q.toString();
  return qs ? `/blog?${qs}` : "/blog";
}

export function Pagination({ page, totalPages, category = null }) {
  const pageHref = (n) => `${blogHref({ page: n, category })}#articles`;
  if (totalPages <= 1) return null;
  // Up to 7 pages: show every number. More: first, last, and the pages
  // around the current one, with "…" for the gaps (1 … 4 5 6 … 12).
  const nums = [];
  if (totalPages <= 7) {
    for (let n = 1; n <= totalPages; n++) nums.push(n);
  } else {
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    nums.push(1);
    if (start > 2) nums.push("gap-start");
    for (let n = start; n <= end; n++) nums.push(n);
    if (end < totalPages - 1) nums.push("gap-end");
    nums.push(totalPages);
  }
  return (
    <nav className="bl-pager" aria-label="Blog pages">
      <ol>
        <li>
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              rel="prev"
              className="bl-step"
              aria-label="Previous page"
            >
              <ChevronLeft size={18} strokeWidth={2.4} aria-hidden="true" />
              <span className="bl-step-label">Previous</span>
            </Link>
          ) : (
            <span className="bl-step is-disabled" aria-disabled="true">
              <ChevronLeft size={18} strokeWidth={2.4} aria-hidden="true" />
              <span className="bl-step-label">Previous</span>
            </span>
          )}
        </li>
        {nums.map((n) => (
          <li key={n}>
            {typeof n === "string" ? (
              <span className="bl-gap" aria-hidden="true">
                …
              </span>
            ) : n === page ? (
              <span aria-current="page">{n}</span>
            ) : (
              <Link href={pageHref(n)} aria-label={`Page ${n}`}>
                {n}
              </Link>
            )}
          </li>
        ))}
        <li>
          {page < totalPages ? (
            <Link
              href={pageHref(page + 1)}
              rel="next"
              className="bl-step bl-step--next"
              aria-label="Next page"
            >
              <span className="bl-step-label">Next</span>
              <ChevronRight size={18} strokeWidth={2.4} aria-hidden="true" />
            </Link>
          ) : (
            <span
              className="bl-step bl-step--next is-disabled"
              aria-disabled="true"
            >
              <span className="bl-step-label">Next</span>
              <ChevronRight size={18} strokeWidth={2.4} aria-hidden="true" />
            </span>
          )}
        </li>
      </ol>
    </nav>
  );
}

export function CategoryNav({ current, cats }) {
  if (cats.length === 0) return null;
  return (
    <nav className="bl-cats" aria-label="Blog categories">
      <ul>
        <li>
          <Link
            href="/blog#articles"
            className="bl-cat"
            aria-current={!current ? "page" : undefined}
          >
            All
          </Link>
        </li>
        {cats.map((c) => (
          <li key={c.key}>
            <Link
              href={`${blogHref({ category: c.key })}#articles`}
              className="bl-cat"
              aria-current={current === c.key ? "page" : undefined}
            >
              {c.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The product box at the end of every article. Title/text from the CMS; the
 *  last sentence and the button follow the launch switch. */
export function EndNote({ title, text }) {
  return (
    <aside className="ba-gate">
      {title && <p className="ba-gate-title">{title}</p>}
      <p className="ba-gate-text">
        {text && (
          <>
            <Inline text={text} />{" "}
          </>
        )}
        {CTA.line}
      </p>
      <Link href={CTA.href} className="b-btn">
        {CTA.label}{" "}
        <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
      </Link>
    </aside>
  );
}

export function WaitlistBand() {
  return (
    <aside className="b-band">
      <div>
        <p className="b-eyebrow" style={{ color: "var(--color-gold)" }}>
          {BRAND}
        </p>
        <p className="b-band-title">
          Know what you&apos;ll pay before your next vet visit
        </p>
        <p className="b-band-text">{CTA.line}</p>
      </div>
      <Link href={CTA.href} className="b-btn">
        {CTA.label}{" "}
        <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
      </Link>
    </aside>
  );
}

// ── Article body blocks ───────────────────────────────────────────────────
function PriceRange({ label, low, typicalLow, typicalHigh, high, note }) {
  const left = pos(typicalLow, low, high);
  const right = pos(typicalHigh, low, high);
  const summary = `${label}: most clinics charge ${money(typicalLow)} to ${money(
    typicalHigh,
  )}. Lowest seen ${money(low)}, highest seen ${money(high)}.`;
  return (
    <figure className="ba-range" aria-label={summary}>
      <p className="ba-range-label">{label}</p>
      <p className="ba-range-typical">
        {money(typicalLow)}–{money(typicalHigh)}
      </p>
      <p className="ba-range-cap">What most clinics charge</p>
      <div className="ba-range-track" aria-hidden="true">
        <div
          className="ba-range-band"
          style={{ left: `${left}%`, width: `${Math.max(2, right - left)}%` }}
        />
      </div>
      <div className="ba-range-ends" aria-hidden="true">
        <span>
          Lowest we&apos;ve seen <b>{money(low)}</b>
        </span>
        <span>
          Highest <b>{money(high)}</b>
        </span>
      </div>
      {note && (
        <figcaption className="ba-range-note">
          <Inline text={note} />
        </figcaption>
      )}
    </figure>
  );
}

export function BlogBlocks({ blocks }) {
  return blocks.map((b, i) => {
    switch (b.type) {
      case "p":
        return (
          <p key={i} className="ba-p">
            <Inline text={b.text} />
          </p>
        );
      case "h2":
        return (
          <h2 key={i} id={slugify(b.text)} className="ba-h2">
            {b.text}
          </h2>
        );
      case "h3":
        return (
          <h3 key={i} className="ba-h3">
            {b.text}
          </h3>
        );
      case "ul":
      case "ol": {
        const L = b.type;
        return (
          <L key={i} className={`ba-${b.type}`}>
            {b.items.map((it, j) => (
              <li key={j}>
                <Inline text={it} />
              </li>
            ))}
          </L>
        );
      }
      case "range":
        return <PriceRange key={i} {...b} />;
      case "table":
        return (
          <div key={i} className="ba-table-wrap">
            <table className="ba-table">
              {b.caption && <caption>{b.caption}</caption>}
              <thead>
                <tr>
                  {b.columns.map((c, j) => (
                    <th key={j} scope="col">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, j) => (
                  <tr key={j}>
                    {r.map((cell, n) => (
                      <td key={n}>
                        <Inline text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "callout":
        return (
          <aside key={i} className="ba-callout">
            {b.title && <p className="ba-callout-title">{b.title}</p>}
            <p className="ba-p">
              <Inline text={b.text} />
            </p>
          </aside>
        );
      case "gate":
        return (
          <aside key={i} className="ba-gate">
            <p className="ba-gate-title">{b.title}</p>
            <p className="ba-gate-text">
              <Inline text={b.text} /> {CTA.line}
            </p>
            <Link href={CTA.href} className="b-btn">
              {CTA.label}{" "}
              <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
            </Link>
          </aside>
        );
      case "faq":
        // Answers are rendered here on the server (bold/links work), then
        // handed to the How-It-Works-style toggle.
        return (
          <BlogFaq
            key={i}
            items={b.items.map((f) => ({ q: f.q, a: <Inline text={f.a} /> }))}
          />
        );
      default:
        return null;
    }
  });
}

// ── The /blog list (every /blog address) ─────────────────────

export async function BlogIndex({ page = 1, category = null }) {
  const [{ lead, posts, totalPages }, cats] = await Promise.all([
    getPage(page, category),
    getActiveCategories(),
  ]);
  const catLabel = category
    ? cats.find((c) => c.key === category)?.label
    : null;
  const total = (lead ? 1 : 0) + posts.length;
  return (
    <>
      <style>{BLOG_CSS}</style>
      <main className="bl">
        <header className={`bl-hero${lead ? "" : " bl-hero--plain"}`}>
          <div className="bl-hero-glow" />
          <div className="bl-hero-ranges" />
          <div className="pp-container">
            <div className="bl-hero-inner">
              <p className="b-eyebrow" style={{ color: "var(--color-gold)" }}>
                Blog
              </p>
              <h1 className="bl-h1">
                Honest answers for
                <br />
                dog owners.
              </h1>
              <p className="bl-sub">
                What vet care really costs, how to look after your dog, and the
                things we wish someone had told us sooner.
              </p>
            </div>
          </div>
        </header>

        <div className="pp-container bl-body">
          {total === 0 ? (
            <p className="bl-empty">
              Our first guides are on the way.{" "}
              <Link href={CTA.href} className="ba-link">
                {CTA.label}
              </Link>
            </p>
          ) : (
            <>
              {lead && <FeaturedCard post={lead} />}
              <div id="articles" />
              <CategoryNav current={category} cats={cats} />
              {posts.length > 0 && (
                <section aria-labelledby="bl-all">
                  <div className="bl-section-head">
                    <h2 id="bl-all" className="bl-h2">
                      {catLabel ||
                        (page > 1 ? "More articles" : "Latest articles")}
                    </h2>
                  </div>
                  <ul className="bl-grid">
                    {posts.map((p) => (
                      <li key={p.slug}>
                        <PostCard post={p} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <Pagination
                page={page}
                totalPages={totalPages}
                category={category}
              />
            </>
          )}
          <WaitlistBand />
        </div>
      </main>
    </>
  );
}
