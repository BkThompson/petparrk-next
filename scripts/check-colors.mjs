#!/usr/bin/env node
// scripts/check-colors.mjs
//
// Fails if any colour is hardcoded outside the token files.
//
//   node scripts/check-colors.mjs            → list every hardcoded colour, exit 1 if any
//   node scripts/check-colors.mjs --summary  → counts per file only
//
// Allowed homes for raw colour values:
//   app/globals.css   — inside the :root token block only
//   lib/tokens.js     — the HEX mirror (checked against globals.css below)
//   lib/palettes.js   — named non-interface palettes (pet banners, card designer, art)
//
// Everything else must use var(--color-…), rgb(var(--color-…-rgb) / a),
// or C / rgba() from lib/tokens.js. Comments are ignored.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const DIRS = ["app", "components", "lib"];
const EXT = /\.(m?js|jsx|ts|tsx|css)$/;
const ALLOW = new Set(["lib/tokens.js", "lib/palettes.js"]);
const summary = process.argv.includes("--summary");

// #rgb, #rgba, #rrggbb, #rrggbbaa — not part of a longer word, not an HTML entity.
const HEX = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
// rgb()/rgba()/hsl()/hsla() with a literal number as the first argument.
const FN = /\b(?:rgba?|hsla?)\(\s*[\d.]/g;
// URL-encoded hex inside SVG data URIs (%23rrggbb). Use svgHex() from lib/tokens.js.
const ENC = /%23(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    // Server routes build emails and API responses, where CSS variables
    // don't exist. Those colours must stay real hex.
    if (relative(ROOT, p).split("\\").join("/") === "app/api") continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXT.test(name)) out.push(p);
  }
  return out;
}

// Blank out comments but keep line numbers. Skips "//" inside URLs (://).
function stripComments(src) {
  let s = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  s = s.replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, pre) => pre + " ".repeat(m.length - pre.length));
  // JSX comments {/* … */} are covered by the block rule above.
  return s;
}

// globals.css: only the first :root { … } block may hold raw values.
function maskRootBlock(src) {
  const start = src.indexOf(":root {");
  if (start < 0) return src;
  let depth = 0, i = src.indexOf("{", start);
  for (let j = i; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) {
      const block = src.slice(start, j + 1).replace(/[^\n]/g, " ");
      return src.slice(0, start) + block + src.slice(j + 1);
    }
  }
  return src;
}

const findings = [];
for (const d of DIRS) {
  let files = [];
  try { files = walk(join(ROOT, d)); } catch { continue; }
  for (const file of files) {
    const rel = relative(ROOT, file).split("\\").join("/");
    if (ALLOW.has(rel)) continue;
    let src = stripComments(readFileSync(file, "utf8"));
    if (rel === "app/globals.css") src = maskRootBlock(src);
    src.split("\n").forEach((line, i) => {
      for (const re of [HEX, FN, ENC]) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(line))) findings.push({ file: rel, line: i + 1, value: m[0], text: line.trim() });
      }
    });
  }
}

// CSS variables can't work inside SVG data URIs (the image can't see the
// page's styles): use svgHex() / HEX / rgbaHex() from lib/tokens.js there.
for (const d of DIRS) {
  let files = [];
  try { files = walk(join(ROOT, d)); } catch { continue; }
  for (const file of files) {
    const rel = relative(ROOT, file).split("\\").join("/");
    const src = readFileSync(file, "utf8");
    const blocks = [
      ...src.matchAll(/data:image\/svg\+xml[^"`]*/g),
      ...src.matchAll(/encodeURIComponent\(\s*`[^`]*`/g),
    ];
    for (const b of blocks) {
      if (/var\(--/.test(b[0])) {
        const line = src.slice(0, b.index).split("\n").length;
        findings.push({ file: rel, line, value: "var() in SVG data URI", text: b[0].slice(0, 80) });
      }
    }
    // Other places a CSS variable is read as literal text: <meta> content,
    // props of libraries that serialise or parse colours (QR export, Vanta),
    // and hex maths fallbacks. These need HEX.x.
    const sinks = [
      [/<meta[^>]*content=["{]?\s*["'`]?var\(--/g, "var() in <meta> content"],
      [/\b(?:bgColor|fgColor)=\{?\s*["'`]var\(--/g, "var() in exported QR colour"],
      [/(?:\|\||\?\?)\s*["'`]var\(--[^"'`]*["'`]\s*\)\s*\.replace\(/g, "var() fed to hex maths"],
    ];
    for (const [re, value] of sinks) {
      for (const m of src.matchAll(re)) {
        const line = src.slice(0, m.index).split("\n").length;
        findings.push({ file: rel, line, value, text: m[0].slice(0, 80) });
      }
    }
  }
}

// Every var(--color-…) used must exist in globals.css, or it silently renders
// as nothing (transparent / inherited).
{
  const defined = new Set([...readFileSync(join(ROOT, "app/globals.css"), "utf8").matchAll(/(--color-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  for (const d of DIRS) {
    let files = [];
    try { files = walk(join(ROOT, d)); } catch { continue; }
    for (const file of files) {
      const rel = relative(ROOT, file).split("\\").join("/");
      const lines = stripComments(readFileSync(file, "utf8")).split("\n");
      lines.forEach((line, i) => {
        for (const m of line.matchAll(/var\((--color-[a-z0-9-]+)/g)) {
          if (!defined.has(m[1])) findings.push({ file: rel, line: i + 1, value: "unknown token " + m[1], text: line.trim() });
        }
        // lib/tokens.js builds names as v("name") → --color-name
        if (rel === "lib/tokens.js") for (const m of line.matchAll(/\bv\("([a-z0-9-]+)"\)/g)) {
          if (!defined.has("--color-" + m[1])) findings.push({ file: rel, line: i + 1, value: "unknown token --color-" + m[1], text: line.trim() });
        }
      });
    }
  }
}

// lib/tokens.js HEX must match globals.css.
const css = readFileSync(join(ROOT, "app/globals.css"), "utf8");
const cssTokens = Object.fromEntries([...css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2].toLowerCase()]));
const tokensSrc = readFileSync(join(ROOT, "lib/tokens.js"), "utf8");
const hexBlock = tokensSrc.slice(tokensSrc.indexOf("export const HEX"));
const camelToKebab = (k) => k.replace(/([a-z])([A-Z0-9])/g, "$1-$2").replace(/([0-9])([A-Za-z])/g, "$1-$2").toLowerCase();
const drift = [];
for (const m of hexBlock.matchAll(/(\w+):\s*"(#[0-9a-fA-F]{6})"/g)) {
  const name = camelToKebab(m[1]);
  if (cssTokens[name] && cssTokens[name] !== m[2].toLowerCase()) drift.push(`${m[1]}: tokens.js ${m[2]} ≠ globals.css ${cssTokens[name]}`);
  if (!cssTokens[name]) drift.push(`${m[1]}: no --color-${name} in globals.css`);
}

if (summary) {
  const by = {};
  for (const f of findings) by[f.file] = (by[f.file] || 0) + 1;
  for (const [f, n] of Object.entries(by).sort((a, b) => b[1] - a[1])) console.log(String(n).padStart(5), f);
} else {
  for (const f of findings) console.log(`${f.file}:${f.line}  ${f.value}  ${f.text.slice(0, 100)}`);
}
for (const d of drift) console.log("TOKEN DRIFT  " + d);
const files = new Set(findings.map((f) => f.file)).size;
console.log(`\n${findings.length} hardcoded colour${findings.length === 1 ? "" : "s"} in ${files} file${files === 1 ? "" : "s"}${drift.length ? `, ${drift.length} token drift` : ""}.`);
process.exit(findings.length || drift.length ? 1 : 0);
