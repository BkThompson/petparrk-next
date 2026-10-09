// FILE: lib/blogPortableText.js
// Converts between the CMS's article format ("Portable Text") and the simple
// block list the blog's layout draws (paragraphs, headings, lists, price
// ranges, tables, callouts, FAQs). You shouldn't need to edit this file.
//
// Inside text: **bold** and [link text](/url) are the blog's shorthand; in the
// CMS they're the Bold button and the Link button.

let keySeq = 0;
const key = () => `k${(keySeq++).toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// ── Text: shorthand → CMS spans ────────────────────────────────────────────
function textToSpans(text) {
  const children = [];
  const markDefs = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) children.push({ _type: "span", _key: key(), text: text.slice(last, m.index), marks: [] });
    if (m[1] !== undefined) {
      children.push({ _type: "span", _key: key(), text: m[1], marks: ["strong"] });
    } else {
      const k = key();
      markDefs.push({ _type: "link", _key: k, href: m[3] });
      children.push({ _type: "span", _key: key(), text: m[2], marks: [k] });
    }
    last = re.lastIndex;
  }
  if (last < text.length || children.length === 0) {
    children.push({ _type: "span", _key: key(), text: text.slice(last), marks: [] });
  }
  return { children, markDefs };
}

// ── Text: CMS spans → shorthand ────────────────────────────────────────────
function spansToText(block) {
  const links = Object.fromEntries((block.markDefs || []).map((d) => [d._key, d]));
  return (block.children || [])
    .map((sp) => {
      let t = sp.text || "";
      if (!t) return "";
      const marks = sp.marks || [];
      const link = marks.map((mk) => links[mk]).find((d) => d && d._type === "link");
      if (marks.includes("strong")) t = `**${t}**`;
      if (link?.href) t = `[${t}](${link.href})`;
      return t;
    })
    .join("");
}

// Blog blocks → CMS body (used once, to copy the starting articles in).
export function blocksToPortableText(blocks) {
  const out = [];
  for (const b of blocks) {
    switch (b.type) {
      case "p":
      case "h2":
      case "h3": {
        const { children, markDefs } = textToSpans(b.text);
        out.push({ _type: "block", _key: key(), style: b.type === "p" ? "normal" : b.type, children, markDefs });
        break;
      }
      case "ul":
      case "ol":
        for (const item of b.items) {
          const { children, markDefs } = textToSpans(item);
          out.push({
            _type: "block",
            _key: key(),
            style: "normal",
            listItem: b.type === "ul" ? "bullet" : "number",
            level: 1,
            children,
            markDefs,
          });
        }
        break;
      case "range":
        out.push({
          _type: "priceRange",
          _key: key(),
          label: b.label,
          low: b.low,
          typicalLow: b.typicalLow,
          typicalHigh: b.typicalHigh,
          high: b.high,
          note: b.note || "",
        });
        break;
      case "table":
        out.push({
          _type: "priceTable",
          _key: key(),
          caption: b.caption || "",
          columns: b.columns,
          rows: b.rows.map((cells) => ({ _type: "row", _key: key(), cells })),
        });
        break;
      case "callout":
        out.push({ _type: "callout", _key: key(), title: b.title || "", text: b.text });
        break;
      case "faq":
        out.push({
          _type: "faq",
          _key: key(),
          items: b.items.map((f) => ({ _type: "faqItem", _key: key(), q: f.q, a: f.a })),
        });
        break;
      default:
        break;
    }
  }
  return out;
}

// CMS body → blog blocks (used every time a page is drawn).
export function portableTextToBlocks(body) {
  const out = [];
  for (const node of body || []) {
    if (node._type === "block") {
      const text = spansToText(node);
      if (node.listItem) {
        const type = node.listItem === "number" ? "ol" : "ul";
        const prev = out[out.length - 1];
        if (prev && prev.type === type) prev.items.push(text);
        else out.push({ type, items: [text] });
        continue;
      }
      if (!text.trim()) continue; // skip empty paragraphs
      const style = node.style === "h2" || node.style === "h3" ? node.style : "p";
      out.push({ type: style, text });
      continue;
    }
    switch (node._type) {
      case "priceRange":
        out.push({
          type: "range",
          label: node.label || "",
          low: Number(node.low),
          typicalLow: Number(node.typicalLow),
          typicalHigh: Number(node.typicalHigh),
          high: Number(node.high),
          note: node.note || "",
        });
        break;
      case "priceTable":
        out.push({
          type: "table",
          caption: node.caption || "",
          columns: node.columns || [],
          rows: (node.rows || []).map((r) => r.cells || []),
        });
        break;
      case "callout":
        out.push({ type: "callout", title: node.title || "", text: node.text || "" });
        break;
      case "faq":
        out.push({ type: "faq", items: (node.items || []).map((f) => ({ q: f.q || "", a: f.a || "" })) });
        break;
      default:
        break;
    }
  }
  return out;
}