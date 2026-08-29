"use client";

// ============================================================================
// Breadcrumb — SINGLE SOURCE OF TRUTH for feature-internal navigation.
// ----------------------------------------------------------------------------
// A slim trail strip that sits at the top of a page's body (below the site
// navbar), showing where the user is within a feature and letting them step
// back up the hierarchy. This is feature-internal nav — NOT the main site
// navbar, and NOT a "back button on the card."
//
// Usage — pass an ordered array of crumbs. The LAST crumb is the current page
// and renders as plain (non-link) text. Any crumb without an href also renders
// as plain text (e.g. a pet name that has no standalone overview page):
//
//   <Breadcrumb items={[
//     { label: "Pet Cards", href: "/pet-card" },
//     { label: pet.name },                       // no href → plain context crumb
//     { label: "Care Card", href: `/pet-card/${slug}/care` },
//     { label: "Edit" },                          // last → current page
//   ]} />
//
// Namespace: bc-  (self-contained; safe to drop on any page).
// Palette matches the app's existing back-strips: terracotta links → navy hover,
// current page in navy, chevron separators in muted.
// ============================================================================

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function Breadcrumb({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <nav className="bc-nav" aria-label="Breadcrumb">
      <ol className="bc-list">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const isLink = !!item.href && !isLast;
          return (
            <li key={`${item.label}-${i}`} className="bc-item">
              {isLink ? (
                <Link href={item.href} className="bc-link">
                  {item.label}
                </Link>
              ) : (
                <span
                  className={isLast ? "bc-current" : "bc-plain"}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <ChevronRight
                  className="bc-sep"
                  size={14}
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      <style>{`
        .bc-nav {
          width: 100%;
          margin: 0 0 20px;
        }
        .bc-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 2px 4px;
          font-family: var(--font-urbanist, 'Urbanist', sans-serif);
          font-size: 13px;
          font-weight: 700;
          line-height: 1.4;
        }
        .bc-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          min-width: 0;
        }
        .bc-link {
          color: var(--color-terracotta, #CF5C36);
          text-decoration: none;
          transition: color 0.15s;
          white-space: nowrap;
        }
        .bc-link:hover {
          color: var(--color-navy-dark, #172531);
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-thickness: 1.5px;
        }
        .bc-plain {
          color: var(--color-navy-dark, #172531);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 40vw;
        }
        .bc-current {
          color: var(--color-navy-dark, #172531);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          // max-width: 40vw;
        }
        .bc-sep {
          color: var(--color-muted, #717A86);
          flex: 0 0 auto;
          opacity: 0.7;
        }
        @media (max-width: 480px) {
          .bc-list { font-size: 13px; }
          .bc-plain, .bc-current { 
            // max-width: 32vw; 
          }
        }
      `}</style>
    </nav>
  );
}
