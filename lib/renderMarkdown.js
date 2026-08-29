// =============================================================
// lib/renderMarkdown.js — shared lightweight markdown renderer
//
// Extracted from the symptom checker so the chat page and the health
// history page format assistant messages identically. One implementation
// means paragraph breaks, lists, blockquotes, and inline bold never drift
// between the two surfaces.
//
// Supports: paragraphs, bullet lists, numbered lists, blockquotes,
// headings (normalized to bold labels), and inline **bold**.
// =============================================================
"use client";

const C = {
  navyDark: "#172531",
  terracotta: "#CF5C36",
  cream: "#F5F0E8",
  slate: "#4B5563",
  muted: "#717A86",
  border: "#EDE8E0",
};

export function renderMarkdown(content, isUser = false) {
  const blocks = [];
  const lines = content.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Skip blank lines (used as paragraph separator)
    if (line.trim() === "") {
      i++;
      continue;
    }
    // Blockquote: lines starting with "> "
    if (line.startsWith("> ")) {
      const quoteLines = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ type: "blockquote", lines: quoteLines });
      continue;
    }
    // Bullet list: consecutive lines starting with "- " or "* "
    if (line.match(/^[-*]\s+/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", items });
      continue;
    }
    // Numbered list: consecutive lines starting with "1. ", "2. ", etc.
    if (line.match(/^\d+\.\s+/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "olist", items });
      continue;
    }
    // Heading: line starting with #, ##, or ### (AI may slip these in even if instructed not to)
    // Strip the # characters and treat as a bold "section label" paragraph
    if (line.match(/^#{1,6}\s+/)) {
      const cleaned = line.replace(/^#{1,6}\s+/, "");
      blocks.push({ type: "heading", text: cleaned });
      i++;
      continue;
    }
    // Paragraph: consecutive non-blank lines that aren't list/quote
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("> ") &&
      !lines[i].match(/^[-*]\s+/) &&
      !lines[i].match(/^\d+\.\s+/) &&
      !lines[i].match(/^#{1,6}\s+/)
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", lines: paraLines });
  }

  const renderInline = (text, key) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((p, k) =>
      k % 2 === 1 ? <strong key={`${key}-${k}`}>{p}</strong> : p,
    );
  };

  return blocks.map((block, bi) => {
    const isLast = bi === blocks.length - 1;
    if (block.type === "blockquote") {
      return (
        <div
          key={bi}
          style={{
            margin: isLast ? "16px 0 0" : "16px 0",
            padding: "10px 12px",
            borderLeft: `3px solid ${isUser ? "rgba(255,255,255,0.5)" : C.terracotta}`,
            background: isUser ? "rgba(255,255,255,0.08)" : "#FAF5EE",
            borderRadius: "0 8px 8px 0",
            fontSize: "14px",
            fontWeight: 500,
            color: isUser ? "rgba(255,255,255,0.9)" : C.slate,
            lineHeight: 1.55,
          }}
        >
          {block.lines.map((ln, li) => (
            <p
              key={li}
              style={{
                margin: li === block.lines.length - 1 ? 0 : "0 0 4px",
              }}
            >
              {renderInline(ln, `${bi}-${li}`)}
            </p>
          ))}
        </div>
      );
    }
    if (block.type === "list") {
      return (
        <ul
          key={bi}
          style={{
            margin: isLast ? "0" : "0 0 14px",
            paddingLeft: "20px",
            color: isUser ? "#fff" : C.navyDark,
          }}
        >
          {block.items.map((it, li) => (
            <li
              key={li}
              style={{
                margin: "0 0 4px",
                lineHeight: 1.55,
              }}
            >
              {renderInline(it, `${bi}-${li}`)}
            </li>
          ))}
        </ul>
      );
    }
    if (block.type === "olist") {
      return (
        <ol
          key={bi}
          style={{
            margin: isLast ? "0" : "0 0 14px",
            paddingLeft: "24px",
            color: isUser ? "#fff" : C.navyDark,
          }}
        >
          {block.items.map((it, li) => (
            <li
              key={li}
              style={{
                margin: "0 0 4px",
                lineHeight: 1.55,
                paddingLeft: "4px",
              }}
            >
              {renderInline(it, `${bi}-${li}`)}
            </li>
          ))}
        </ol>
      );
    }
    if (block.type === "heading") {
      return (
        <p
          key={bi}
          style={{
            margin: isLast ? "8px 0 0" : "8px 0 6px",
            fontWeight: 700,
            fontSize: "16px",
            color: isUser ? "#fff" : C.navyDark,
          }}
        >
          {renderInline(block.text, `${bi}-h`)}
        </p>
      );
    }
    // paragraph
    return (
      <p
        key={bi}
        style={{
          margin: isLast ? 0 : "0 0 14px",
          color: isUser ? "#fff" : C.navyDark,
        }}
      >
        {block.lines.map((ln, li) => (
          <span key={li}>
            {renderInline(ln, `${bi}-${li}`)}
            {li < block.lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  });
}
