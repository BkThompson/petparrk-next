// Server-safe blog UI: no hooks, no "use client". Pages that import this stay
// server components, so Google gets fully rendered HTML.
import Link from "next/link";
// Breadcrumb is your existing component (components/Breadcrumb.js).
import Breadcrumb from "./Breadcrumb";
import BlogFaq from "./BlogFaq";
import { ArrowRight } from "lucide-react";
import { BRAND, CTA, formatDate, getPage, getActiveCategories } from "../lib/blogPosts";

// Falls back to system sans (never serif) if the font variable isn't set.
const FONT = "var(--font-urbanist, 'Urbanist'), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// ── Topic colors for the price covers ─────────────────────────────────────
// Each article's card art is its own price range, drawn in a brand color.
const TONES = {
  Dental: { bg: "#CF5C36", fg: "#FFFFFF", sub: "rgba(255,255,255,0.88)", track: "rgba(255,255,255,0.28)", band: "#172531" },
  Surgery: { bg: "#172531", fg: "#FFFFFF", sub: "rgba(255,255,255,0.72)", track: "rgba(255,255,255,0.16)", band: "#CF5C36" },
  Exams: { bg: "#E8D9C0", fg: "#172531", sub: "rgba(23,37,49,0.72)", track: "rgba(23,37,49,0.14)", band: "#CF5C36" },
  Vaccines: { bg: "#2C4657", fg: "#FFFFFF", sub: "rgba(255,255,255,0.75)", track: "rgba(255,255,255,0.16)", band: "#EFC88B" },
  Emergency: { bg: "#EFC88B", fg: "#172531", sub: "rgba(23,37,49,0.75)", track: "rgba(23,37,49,0.16)", band: "#CF5C36" },
};
const toneFor = (topic) => TONES[topic] || TONES.Dental;

export const BLOG_CSS = `
  .bl, .ba { font-family: ${FONT}; color: #1F2937; background: #F5F0E8; }
  .bl h1, .bl h2, .ba h1, .ba h2, .ba h3 { text-wrap: balance; }
  .bl p, .ba p, .ba li { text-wrap: pretty; }

  /* ── Shared bits ───────────────────────────────────────────────────── */
  /* Same as the site's .badge .badge-terracotta (globals.css). */
  .b-topic { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 999px; border: var(--pill-border-w, 2px) solid rgba(139,58,30,0.22); background: #FEF3EB; color: #8B3A1E; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; white-space: nowrap; line-height: 1.4; }
  /* Same as the site's small gold/terracotta eyebrow labels. */
  .b-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase; margin: 0 0 12px; }
  .b-meta { font-size: 14px; font-weight: 600; color: #4D6473; margin: 0; display: flex; flex-wrap: wrap; gap: 4px 14px; }
  .b-meta > span + span::before { content: ""; display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: currentColor; opacity: 0.5; margin-right: 14px; vertical-align: middle; position: relative; top: -2px; }

  /* Price cover: the card art is the article's own price range */
  .b-cover { position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; padding: 24px; min-height: 196px; box-sizing: border-box; }
  .b-cover::before { content: ""; position: absolute; inset: 0; pointer-events: none;
    background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 9px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.03) 0 1px, transparent 1px 9px); }
  .b-cover > * { position: relative; }
  .b-cover p { color: inherit; }
  .b-cover-label { font-size: 14px; font-weight: 700; margin: 0 0 4px; }
  .b-cover-price { font-size: clamp(30px, 3.4vw, 40px); font-weight: 800; letter-spacing: -0.035em; line-height: 1.05; margin: 0 0 16px; }
  .b-cover-track { position: relative; height: 10px; border-radius: 999px; }
  .b-cover-band { position: absolute; top: 0; bottom: 0; border-radius: 999px; }
  .b-cover-ends { display: flex; justify-content: space-between; margin-top: 8px; font-size: 12.5px; font-weight: 700; }

  /* ── Index: hero ───────────────────────────────────────────────────── */
  .bl-hero { position: relative; overflow: hidden; background: #172531; padding: 80px 0 168px; min-height: 393px; box-sizing: border-box; border-bottom: 1px solid rgba(255,255,255,0.07); }
  .bl-hero-glow { position: absolute; top: -40%; right: -10%; width: 900px; height: 800px; pointer-events: none;
    background: radial-gradient(ellipse at center, rgba(239,200,139,0.10) 0%, rgba(239,200,139,0.04) 35%, transparent 70%); }
  /* Faint rows of price ranges behind the headline */
  .bl-hero-ranges { position: absolute; inset: 0; pointer-events: none; opacity: 0.75;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='520' height='168'%3E%3Cg fill='none' stroke-linecap='round'%3E%3Cpath d='M20 24H300' stroke='%23ffffff' stroke-opacity='.06' stroke-width='6'/%3E%3Cpath d='M110 24H190' stroke='%23CF5C36' stroke-opacity='.28' stroke-width='6'/%3E%3Cpath d='M220 80H500' stroke='%23ffffff' stroke-opacity='.06' stroke-width='6'/%3E%3Cpath d='M330 80H380' stroke='%23EFC88B' stroke-opacity='.24' stroke-width='6'/%3E%3Cpath d='M60 136H360' stroke='%23ffffff' stroke-opacity='.06' stroke-width='6'/%3E%3Cpath d='M150 136H260' stroke='%23CF5C36' stroke-opacity='.22' stroke-width='6'/%3E%3C/g%3E%3C/svg%3E");
    background-size: 520px 168px;
    -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 45%, #000 100%); mask-image: linear-gradient(to right, transparent 0%, #000 45%, #000 100%); }
  .bl-hero .pp-container { position: relative; z-index: 1; }
  .bl-hero-inner { max-width: 760px; }
  .bl-h1 { font-size: clamp(30px, 5.5vw, 56px); font-weight: 800; color: #fff; letter-spacing: -0.025em; line-height: 1.05; margin: 0 0 16px; }
  .bl-sub { font-size: 17px; font-weight: 500; line-height: 1.75; color: rgba(255,255,255,0.65); margin: 0; max-width: 560px; }
  .bl-hero .bc-link { color: #EFC88B; }
  .bl-hero .bc-link:hover { color: #fff; }
  .bl-hero .bc-current, .bl-hero .bc-plain { color: rgba(255,255,255,0.85); }

  /* ── Index: body ───────────────────────────────────────────────────── */
  .bl-body { padding-bottom: 96px; }
  .bl-feature { position: relative; z-index: 2; margin-top: -104px; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); background: #fff; border-radius: 24px; overflow: hidden; text-decoration: none; color: inherit;
    box-shadow: var(--shadow-xl, 0 16px 48px rgba(23,37,49,0.18)); transition: transform 0.2s ease, box-shadow 0.2s ease; }
  .bl-feature:hover { transform: translateY(-3px); box-shadow: var(--shadow-xl, 0 16px 48px rgba(23,37,49,0.18)); }
  .bl-feature:focus-visible, .bl-card:focus-visible { outline: 3px solid rgba(207,92,54,0.55); outline-offset: 4px; }
  .bl-feature .b-cover { min-height: 340px; padding: 36px; }
  .bl-feature .b-cover-price { font-size: clamp(40px, 5vw, 60px); }
  .bl-feature-body { padding: 40px 40px 36px; display: flex; flex-direction: column; justify-content: center; gap: 14px; }
  .bl-feature-kicker { display: flex; align-items: center; gap: 10px; }
  .bl-feature-title { font-size: clamp(25px, 2.8vw, 34px); font-weight: 800; color: #172531; letter-spacing: -0.025em; line-height: 1.12; margin: 0; transition: color 0.15s ease; }
  .bl-feature:hover .bl-feature-title { color: #CF5C36; }
  .bl-feature:hover .bl-feature-cta { color: #172531; }
  .bl-feature-cta { transition: color 0.15s ease; }
  .bl-feature-dek { font-size: 17px; font-weight: 500; line-height: 1.6; color: #374151; margin: 0; }
  .bl-feature-cta { margin-top: 6px; display: inline-flex; align-items: center; gap: 4px; font-size: 14px; font-weight: 700; color: #CF5C36; }

  .bl-section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin: 72px 0 24px; }
  .bl-h2 { font-size: clamp(24px, 2.6vw, 30px); font-weight: 800; color: #172531; letter-spacing: -0.02em; margin: 0; }
  .bl-count { font-size: 14px; font-weight: 600; color: #4D6473; margin: 0; }
  .bl-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px; }
  .bl-card { height: 100%; display: flex; flex-direction: column; background: #fff; border: 1px solid #E7DFD2; border-radius: 16px; overflow: hidden; text-decoration: none; color: inherit; transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
  .bl-card:hover { transform: translateY(-3px); border-color: #D9CDB9; box-shadow: var(--shadow-hover, 0 8px 32px rgba(23,37,49,0.15)); }
  .bl-card-body { padding: 22px 22px 24px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
  .bl-card-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .bl-card-read { font-size: 13px; font-weight: 600; color: #4D6473; }
  .bl-card-title { font-size: 20px; font-weight: 800; color: #172531; letter-spacing: -0.015em; line-height: 1.25; margin: 0; transition: color 0.15s ease; }
  .bl-card:hover .bl-card-title { color: #CF5C36; }
  .bl-card-dek { font-size: 15.5px; font-weight: 500; line-height: 1.55; color: #4B5563; margin: 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .bl-card-date { margin-top: auto; padding-top: 6px; font-size: 13px; font-weight: 600; color: #4D6473; }
  .bl-empty { margin-top: -40px; position: relative; background: #fff; border-radius: 16px; padding: 36px; font-size: 17px; font-weight: 500; line-height: 1.7; }

  /* Category buttons — pill shape with the site's 2px chip border */
  .bl-cats { margin: 56px 0 0; }
  /* Category or page-2 views have no featured card overlapping the banner. */
  .bl-hero--plain { padding-bottom: 88px; }
  .bl-hero--plain + .bl-body > .bl-cats:first-child { margin-top: 48px; }
  .bl-cats ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 10px; }
  .bl-cat { display: inline-flex; align-items: center; min-height: 40px; padding: 0 18px; border-radius: 999px; border: 2px solid var(--color-border-strong, #D1C9BD); background: #fff; color: #172531; font-size: 14px; font-weight: 700; text-decoration: none; transition: border-color .15s, color .15s, background .15s; }
  .bl-cat:hover { border-color: #CF5C36; color: #CF5C36; }
  .bl-cat[aria-current="page"] { background: #172531; border-color: #172531; color: #fff; }
  .bl-cat:focus-visible { outline: none; box-shadow: var(--shadow-focus, 0 0 0 3px rgba(207,92,54,0.25)); }
  .bl-cats + section .bl-section-head { margin-top: 36px; }

  /* Pagination */
  .bl-pager { margin-top: 48px; display: flex; justify-content: center; }
  .bl-pager ol { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .bl-pager a, .bl-pager span { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; height: 44px; padding: 0 14px; box-sizing: border-box; border-radius: 999px; font-size: 15px; font-weight: 700; text-decoration: none; }
  .bl-pager a { color: #172531; background: #fff; border: 1px solid #E0D6C6; }
  .bl-pager a:hover { border-color: #CF5C36; color: #CF5C36; }
  .bl-pager a:focus-visible { outline: 3px solid rgba(207,92,54,0.55); outline-offset: 2px; }
  .bl-pager [aria-current="page"] { background: #172531; color: #fff; border: 1px solid #172531; }
  .bl-pager .is-disabled { color: #9AA3AD; background: transparent; border: 1px solid #E7DFD2; }

  /* Waitlist band */
  .b-band { margin-top: 88px; position: relative; overflow: hidden; background: #172531; border-radius: 24px; padding: 48px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 24px 40px; align-items: center; }
  .b-band::after { content: ""; position: absolute; right: -120px; top: -160px; width: 480px; height: 420px; pointer-events: none; background: radial-gradient(ellipse at center, rgba(207,92,54,0.30) 0%, transparent 65%); }
  .b-band > * { position: relative; z-index: 1; }
  .b-band .b-eyebrow { margin-bottom: 10px; }
  .b-band-title { font-size: clamp(24px, 3vw, 32px); font-weight: 800; color: #fff; letter-spacing: -0.025em; line-height: 1.15; margin: 0 0 10px; }
  .b-band-text { font-size: 17px; font-weight: 500; line-height: 1.6; color: rgba(255,255,255,0.75); margin: 0; max-width: 560px; }
  /* Same as How It Works .bt .bt-tc: 12px corners, 2px border, colors flip on hover. */
  .b-btn { height: 48px; padding: 0 32px; box-sizing: border-box; border-radius: 12px; font-size: 15px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; background: #CF5C36; color: #fff; border: 2px solid #CF5C36; transition: background .25s, color .25s; }
  .b-btn:hover { background: #fff; color: #CF5C36; }
  .b-btn:focus-visible { outline: 3px solid #EFC88B; outline-offset: 3px; }

  /* ── Article: header ───────────────────────────────────────────────── */
  /* Same navy banner as the blog home page (glow + faint price lines). */
  .ba-head { position: relative; overflow: hidden; padding: 36px 0 132px; background: #172531; border-bottom: 1px solid rgba(255,255,255,0.07); }
  .ba-head .pp-container { z-index: 1; }
  .ba-head .bc-link { color: #EFC88B; }
  .ba-head .bc-link:hover { color: #fff; }
  .ba-head .bc-current, .ba-head .bc-plain { color: rgba(255,255,255,0.85); }
  .ba-head .bc-sep { color: rgba(255,255,255,0.5); }
  .ba-head .pp-container { position: relative; }
  /* Header, glance card and body share one centered column (680 + 64 + 240). */
  .ba-head-inner, .ba-glance, .ba-layout { max-width: 984px; margin-left: auto; margin-right: auto; }
  .ba-head-inner > .ba-h1, .ba-head-inner > .ba-dek { max-width: 820px; }
  .ba-head .bc-nav { margin-bottom: 36px; }
  .ba-h1 { font-size: clamp(30px, 5.5vw, 56px); font-weight: 800; color: #fff; letter-spacing: -0.025em; line-height: 1.05; margin: 14px 0 16px; }
  .ba-dek { font-size: clamp(18px, 2.1vw, 21px); font-weight: 500; line-height: 1.55; color: rgba(255,255,255,0.7); margin: 0 0 28px; max-width: 700px; }
  .ba-byline { display: flex; align-items: center; gap: 14px; }
  .ba-avatar { flex: none; width: 44px; height: 44px; border-radius: 50%; background: #EFC88B; color: #172531; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; }
  .ba-author { font-size: 16px; font-weight: 800; color: #172531; margin: 0 0 2px; }
  .ba-head .b-meta { color: rgba(255,255,255,0.65); }
  .ba-head .ba-author { color: #fff; }
  .ba-author-box .ba-avatar { background: #172531; color: #EFC88B; }

  /* At a glance */
  .ba-glance { position: relative; z-index: 2; margin-top: -84px; background: #fff; border-radius: 20px; box-shadow: var(--shadow-lg, 0 8px 32px rgba(23,37,49,0.14)); padding: 26px 32px 22px; }
  .ba-glance-title { font-size: 15px; font-weight: 800; color: #172531; margin: 0 0 16px; }
  .ba-glance-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 0; }
  .ba-glance-grid div { padding: 2px 24px 4px; border-left: 1px solid #EDE6DA; }
  .ba-glance-grid div:first-child { padding-left: 0; border-left: 0; }
  .ba-glance-grid dt { order: 2; font-size: 14px; font-weight: 600; color: #4D6473; margin: 4px 0 0; }
  .ba-glance-grid dd { margin: 0; font-size: clamp(24px, 2.8vw, 32px); font-weight: 800; color: #172531; letter-spacing: -0.03em; line-height: 1.1; }
  .ba-glance-grid div { display: flex; flex-direction: column; }
  .ba-glance-grid div:first-child dd { color: #CF5C36; }
  .ba-glance-note { font-size: 13px; font-weight: 500; color: #4B5563; margin: 16px 0 0; padding-top: 14px; border-top: 1px solid #F1ECE3; }

  /* Layout: article + "On this page" */
  .ba-layout { display: grid; grid-template-columns: minmax(0, 680px) 240px; justify-content: space-between; gap: 64px; padding: 56px 0 24px; }
  .ba-toc { position: sticky; top: 96px; align-self: start; }
  .ba-toc-title { font-size: 14px; font-weight: 800; color: #172531; margin: 0 0 12px; }
  .ba-toc ol { list-style: none; margin: 0; padding: 0; border-left: 2px solid #E3D9C9; }
  .ba-toc li { margin: 0; }
  .ba-toc a { display: block; padding: 7px 0 7px 16px; margin-left: -2px; border-left: 2px solid transparent; font-size: 14px; font-weight: 600; line-height: 1.4; color: #4D6473; text-decoration: none; }
  .ba-toc a:hover { color: #CF5C36; border-left-color: #CF5C36; }
  .ba-toc a:focus-visible { outline: 3px solid rgba(207,92,54,0.45); outline-offset: 2px; border-radius: 4px; }
  .ba-toc-mobile { display: none; }

  /* Article body */
  .ba-p { font-size: 18px; font-weight: 500; line-height: 1.8; margin: 0 0 22px; color: #1F2937; }
  .ba-content > .ba-p:first-child { font-size: 20px; line-height: 1.7; color: #172531; }
  .ba-h2 { font-size: clamp(25px, 2.8vw, 30px); font-weight: 800; color: #172531; letter-spacing: -0.02em; line-height: 1.2; margin: 56px 0 18px; scroll-margin-top: 96px; }
  .ba-h3 { font-size: 20px; font-weight: 800; color: #172531; line-height: 1.3; margin: 32px 0 12px; }
  .ba-ul, .ba-ol { margin: 0 0 24px; padding: 0; list-style: none; }
  .ba-ul li, .ba-ol li { position: relative; font-size: 18px; font-weight: 500; line-height: 1.7; margin-bottom: 12px; padding-left: 30px; }
  .ba-ul li::before { content: ""; position: absolute; left: 6px; top: 0.72em; width: 8px; height: 8px; border-radius: 50%; background: #CF5C36; }
  .ba-ol { counter-reset: ba; }
  .ba-ol li { counter-increment: ba; padding-left: 42px; }
  .ba-ol li::before { content: counter(ba); position: absolute; left: 0; top: 2px; width: 28px; height: 28px; border-radius: 50%; background: #172531; color: #EFC88B; font-size: 14px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
  .ba-link { color: #B84E2C; font-weight: 700; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
  .ba-link:hover { color: #172531; }
  .ba-content strong { color: #172531; font-weight: 800; }

  .ba-range { margin: 32px 0 36px; padding: 26px 28px 22px; background: #fff; border: 1px solid #E7DFD2; border-radius: 16px; }
  .ba-range-label { font-size: 15px; font-weight: 700; color: #4D6473; margin: 0 0 6px; }
  .ba-range-typical { font-size: clamp(32px, 5vw, 44px); font-weight: 800; color: #172531; letter-spacing: -0.035em; line-height: 1.05; margin: 0 0 4px; }
  .ba-range-cap { font-size: 15px; font-weight: 600; color: #374151; margin: 0 0 22px; }
  .ba-range-track { position: relative; height: 14px; border-radius: 999px; background: #EDE6DA; }
  .ba-range-band { position: absolute; top: 0; bottom: 0; border-radius: 999px; background: #CF5C36; }
  .ba-range-ends { display: flex; justify-content: space-between; gap: 16px; margin-top: 10px; font-size: 14px; font-weight: 600; color: #4D6473; }
  .ba-range-ends b { color: #172531; font-weight: 800; }
  .ba-range-note { font-size: 14px; font-weight: 500; line-height: 1.6; color: #4B5563; margin: 16px 0 0; }

  .ba-table-wrap { overflow-x: auto; margin: 28px 0 32px; border: 1px solid #E7DFD2; border-radius: 16px; background: #fff; }
  .ba-table { width: 100%; border-collapse: collapse; font-size: 16px; }
  .ba-table caption { text-align: left; font-size: 15px; font-weight: 800; color: #172531; padding: 18px 20px 6px; }
  .ba-table th { text-align: left; font-weight: 700; font-size: 14px; color: #4D6473; padding: 12px 20px; border-bottom: 1px solid #EDE6DA; background: #FBF8F3; }
  .ba-table td { padding: 14px 20px; border-bottom: 1px solid #F1ECE3; font-weight: 500; line-height: 1.5; vertical-align: top; }
  .ba-table td:first-child { font-weight: 700; color: #172531; }
  .ba-table tr:last-child td { border-bottom: 0; }

  .ba-callout { margin: 28px 0; padding: 20px 24px; background: #FBF3E3; border: 1px solid #F0DDB8; border-radius: 16px; }
  .ba-callout-title { font-size: 16px; font-weight: 800; color: #172531; margin: 0 0 6px; }
  .ba-callout .ba-p { font-size: 17px; line-height: 1.65; margin: 0; }

  .ba-gate { position: relative; overflow: hidden; margin: 48px 0; padding: 32px 32px 30px; background: #172531; border-radius: 20px; }
  .ba-gate::after { content: ""; position: absolute; right: -80px; bottom: -140px; width: 360px; height: 320px; pointer-events: none; background: radial-gradient(ellipse at center, rgba(207,92,54,0.32) 0%, transparent 65%); }
  .ba-gate > * { position: relative; z-index: 1; }
  .ba-gate-title { font-size: clamp(21px, 2.6vw, 25px); font-weight: 800; letter-spacing: -0.02em; line-height: 1.25; margin: 0 0 10px; color: #fff; }
  .ba-gate-text { font-size: 17px; font-weight: 500; line-height: 1.65; margin: 0 0 22px; color: rgba(255,255,255,0.78); }


  .ba-author-box { display: flex; gap: 16px; align-items: center; margin-top: 56px; padding: 24px; background: #fff; border: 1px solid #E7DFD2; border-radius: 16px; }
  .ba-author-box .ba-author { margin-bottom: 4px; }
  .ba-author-role { font-size: 13px; font-weight: 700; color: #CF5C36; margin: 0 0 8px; }
  .ba-author-bio { font-size: 16px; font-weight: 500; line-height: 1.65; margin: 0; color: #374151; }

  .ba-related { padding: 24px 0 96px; }

  /* ── Responsive ───────────────────────────────────────────────────── */
  @media (max-width: 1023px) {
    .bl-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; }
    .bl-feature { grid-template-columns: 1fr; }
    .bl-feature .b-cover { min-height: 230px; padding: 28px; }
    .bl-feature-body { padding: 28px 28px 30px; }
    .ba-layout { grid-template-columns: minmax(0, 1fr); max-width: 680px; padding-top: 40px; gap: 0; }
    .ba-head-inner, .ba-glance { max-width: 680px; }
    .ba-toc { display: none; }
    .ba-toc-mobile { display: block; margin: 0 0 8px; background: #fff; border: 1px solid #E7DFD2; border-radius: 16px; }
    .ba-toc-mobile summary { cursor: pointer; list-style: none; padding: 16px 20px; font-size: 15px; font-weight: 800; color: #172531; display: flex; justify-content: space-between; align-items: center; }
    .ba-toc-mobile summary::-webkit-details-marker { display: none; }
    .ba-toc-mobile summary::after { content: "+"; font-size: 20px; color: #CF5C36; }
    .ba-toc-mobile[open] summary::after { content: "–"; }
    .ba-toc-mobile ol { margin: 0; padding: 0 20px 14px 40px; }
    .ba-toc-mobile li { padding: 6px 0; font-size: 15px; font-weight: 600; line-height: 1.4; }
    .ba-toc-mobile a { color: #2C4657; text-decoration: none; }
    .ba-toc-mobile a:hover { color: #CF5C36; text-decoration: underline; }
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
    .ba-head { padding: 24px 0 112px; }
    .ba-head .bc-nav { margin-bottom: 24px; }
    .ba-glance { margin-top: -80px; padding: 22px 20px 18px; border-radius: 16px; }
    .ba-glance-grid { grid-template-columns: 1fr; }
    .ba-glance-grid div { flex-direction: row; align-items: baseline; justify-content: space-between; gap: 12px; padding: 12px 0; border-left: 0; border-top: 1px solid #EDE6DA; }
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
    .bl-feature:hover, .bl-card:hover { transform: none; }
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
          <a key={k++} href={href} className="ba-link" target="_blank" rel="noopener noreferrer">
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
  if (!c) return <div className="b-cover" style={{ background: t.bg }} aria-hidden="true" />;
  const left = pos(c.typicalLow, c.low, c.high);
  const right = pos(c.typicalHigh, c.low, c.high);
  return (
    <div className="b-cover" style={{ background: t.bg, color: t.fg }} aria-hidden="true">
      <p className="b-cover-label" style={{ color: t.sub }}>
        {c.label}, typical in California
      </p>
      <p className="b-cover-price">
        {money(c.typicalLow)}–{money(c.typicalHigh)}
      </p>
      <div className="b-cover-track" style={{ background: t.track }}>
        <div className="b-cover-band" style={{ left: `${left}%`, width: `${Math.max(3, right - left)}%`, background: t.band }} />
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
          Read article <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
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
        <span className="bl-card-date">{formatDate(post.updated || post.published)}</span>
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
  const pageHref = (n) => blogHref({ page: n, category });
  if (totalPages <= 1) return null;
  const nums = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <nav className="bl-pager" aria-label="Blog pages">
      <ol>
        <li>
          {page > 1 ? (
            <Link href={pageHref(page - 1)} rel="prev">
              Newer
            </Link>
          ) : (
            <span className="is-disabled">Newer</span>
          )}
        </li>
        {nums.map((n) => (
          <li key={n}>
            {n === page ? (
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
            <Link href={pageHref(page + 1)} rel="next">
              Older
            </Link>
          ) : (
            <span className="is-disabled">Older</span>
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
          <Link href="/blog" className="bl-cat" aria-current={!current ? "page" : undefined}>
            All
          </Link>
        </li>
        {cats.map((c) => (
          <li key={c.key}>
            <Link
              href={blogHref({ category: c.key })}
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
        {CTA.label} <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
      </Link>
    </aside>
  );
}

export function WaitlistBand() {
  return (
    <aside className="b-band">
      <div>
        <p className="b-eyebrow" style={{ color: "#EFC88B" }}>
          {BRAND}
        </p>
        <p className="b-band-title">Know what you&apos;ll pay before your next vet visit</p>
        <p className="b-band-text">{CTA.line}</p>
      </div>
      <Link href={CTA.href} className="b-btn">
        {CTA.label} <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
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
        <div className="ba-range-band" style={{ left: `${left}%`, width: `${Math.max(2, right - left)}%` }} />
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
              {CTA.label} <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
            </Link>
          </aside>
        );
      case "faq":
        // Answers are rendered here on the server (bold/links work), then
        // handed to the How-It-Works-style toggle.
        return <BlogFaq key={i} items={b.items.map((f) => ({ q: f.q, a: <Inline text={f.a} /> }))} />;
      default:
        return null;
    }
  });
}

// ── The /blog list (every /blog address) ─────────────────────

export async function BlogIndex({ page = 1, category = null }) {
  const [{ lead, posts, totalPages }, cats] = await Promise.all([getPage(page, category), getActiveCategories()]);
  const catLabel = category ? cats.find((c) => c.key === category)?.label : null;
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
              {(page > 1 || catLabel) && (
                <Breadcrumb
                  items={[
                    { label: "Blog", href: "/blog" },
                    ...(catLabel ? [{ label: catLabel, href: page > 1 ? blogHref({ category }) : undefined }] : []),
                    ...(page > 1 ? [{ label: `Page ${page}` }] : []),
                  ]}
                />
              )}
              {!(page > 1 || catLabel) && (
                <p className="b-eyebrow" style={{ color: "#EFC88B" }}>
                  Blog
                </p>
              )}
              <h1 className="bl-h1">
                Honest answers for
                <br />
                dog owners.
              </h1>
              <p className="bl-sub">
                What vet care really costs, how to look after your dog, and the things we wish someone
                had told us sooner.
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
              <CategoryNav current={category} cats={cats} />
              {posts.length > 0 && (
                <section aria-labelledby="bl-all">
                  <div className="bl-section-head">
                    <h2 id="bl-all" className="bl-h2">
                      {catLabel || "Latest articles"}
                      {page > 1 ? `, page ${page}` : ""}
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
              <Pagination page={page} totalPages={totalPages} category={category} />
            </>
          )}
          <WaitlistBand />
        </div>
      </main>
    </>
  );
}