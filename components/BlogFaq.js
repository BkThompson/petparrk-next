"use client";

// FILE: components/BlogFaq.js
// The "Common questions" toggle inside blog articles. Works exactly like the
// FAQ on How It Works: one question open at a time, the + turns into an ×
// (rotates 45°), and the answer slides open. Colors are the light-page
// version, since articles sit on cream instead of navy.
//
// The answers are still in the page HTML when it loads (just collapsed), so
// Google reads them.

import { useState } from "react";

// `items` = [{ q: string, a: string or already-rendered content }].
export default function BlogFaq({ items }) {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="bfq">
      <style>{`
        .bfq { margin: 8px 0 32px; }
        .bfq-item { border-top: 1px solid rgba(23,37,49,0.12); }
        .bfq-item:last-child { border-bottom: 1px solid rgba(23,37,49,0.12); }
        .bfq-btn { width: 100%; background: none; border: 0; padding: 24px 0; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 16px; text-align: left; font: inherit; }
        .bfq-btn:focus-visible { outline: none; box-shadow: var(--shadow-focus, 0 0 0 3px rgba(207,92,54,0.25)); border-radius: 6px; }
        .bfq-q { font-size: 18px; font-weight: 800; color: #172531; margin: 0; line-height: 1.4; font-family: inherit; }
        .bfq-plus { font-size: 26px; font-weight: 300; color: #CF5C36; flex-shrink: 0; line-height: 1; transition: transform .3s; }
        .bfq-a { display: grid; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows .38s cubic-bezier(.4,0,.2,1), opacity .3s; }
        .bfq-a.open { grid-template-rows: 1fr; opacity: 1; }
        .bfq-a-inner { overflow: hidden; }
        .bfq-a-text { font-size: 16px; font-weight: 500; color: #374151; line-height: 1.75; margin: 0; padding: 0 32px 24px 0; }
        @media (prefers-reduced-motion: reduce) { .bfq-plus, .bfq-a { transition: none; } }
      `}</style>
      {items.map((faq, i) => {
        const open = openFaq === i;
        return (
          <div key={i} className="bfq-item">
            <button
              type="button"
              className="bfq-btn"
              aria-expanded={open}
              aria-controls={`bfq-a-${i}`}
              onClick={() => setOpenFaq(open ? null : i)}
            >
              <span className="bfq-q">{faq.q}</span>
              <span className="bfq-plus" aria-hidden="true" style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}>
                +
              </span>
            </button>
            <div id={`bfq-a-${i}`} className={`bfq-a${open ? " open" : ""}`} role="region">
              <div className="bfq-a-inner">
                <p className="bfq-a-text">{faq.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}