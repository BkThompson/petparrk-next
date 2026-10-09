// FILE: sanity/schema.js
// The fields you see in the CMS editor at /studio: what an article, author,
// category and the blog settings are made of. You shouldn't need to edit
// this file to write or change articles.

import { defineArrayMember, defineField, defineType } from "sanity";

// ── Blocks you can add inside an article ───────────────────────────────────

const priceRange = defineType({
  name: "priceRange",
  title: "Price range bar",
  type: "object",
  description: "The orange range bar: what most clinics charge, plus the lowest and highest seen.",
  fields: [
    defineField({ name: "label", title: "Label", type: "string", description: 'e.g. "Dog dental cleaning with anesthesia, California"', validation: (r) => r.required() }),
    defineField({ name: "typicalLow", title: "Typical — low ($)", type: "number", validation: (r) => r.required().min(0) }),
    defineField({ name: "typicalHigh", title: "Typical — high ($)", type: "number", validation: (r) => r.required().min(0) }),
    defineField({ name: "low", title: "Lowest seen ($)", type: "number", validation: (r) => r.required().min(1) }),
    defineField({ name: "high", title: "Highest seen ($)", type: "number", validation: (r) => r.required().min(1) }),
    defineField({ name: "note", title: "Small note under the bar", type: "string" }),
  ],
  validation: (r) =>
    r.custom((v) => {
      if (!v) return true;
      const { low, typicalLow, typicalHigh, high } = v;
      if ([low, typicalLow, typicalHigh, high].some((n) => typeof n !== "number")) return true;
      return low <= typicalLow && typicalLow <= typicalHigh && typicalHigh <= high
        ? true
        : "Numbers must go up in order: lowest ≤ typical low ≤ typical high ≤ highest.";
    }),
  preview: {
    select: { label: "label", a: "typicalLow", b: "typicalHigh" },
    prepare: ({ label, a, b }) => ({ title: `Price range: $${a ?? "?"}–$${b ?? "?"}`, subtitle: label }),
  },
});

const priceTable = defineType({
  name: "priceTable",
  title: "Table",
  type: "object",
  description: "A simple table. Use **double asterisks** around words to make them bold.",
  fields: [
    defineField({ name: "caption", title: "Title above the table (optional)", type: "string" }),
    defineField({
      name: "columns",
      title: "Column headings",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      validation: (r) => r.required().min(1),
    }),
    defineField({
      name: "rows",
      title: "Rows",
      type: "array",
      of: [
        defineArrayMember({
          name: "row",
          title: "Row",
          type: "object",
          fields: [
            defineField({
              name: "cells",
              title: "Cells (left to right)",
              type: "array",
              of: [defineArrayMember({ type: "string" })],
            }),
          ],
          preview: { select: { cells: "cells" }, prepare: ({ cells }) => ({ title: (cells || []).join("  ·  ") }) },
        }),
      ],
    }),
  ],
  preview: {
    select: { caption: "caption", columns: "columns" },
    prepare: ({ caption, columns }) => ({ title: caption || "Table", subtitle: (columns || []).join(" · ") }),
  },
});

const callout = defineType({
  name: "callout",
  title: "Callout box",
  type: "object",
  description: "A soft highlighted box for a tip or heads-up.",
  fields: [
    defineField({ name: "title", title: "Title", type: "string" }),
    defineField({ name: "text", title: "Text", type: "text", rows: 3, validation: (r) => r.required() }),
  ],
  preview: { select: { title: "title", text: "text" }, prepare: ({ title, text }) => ({ title: `Callout: ${title || ""}`, subtitle: text }) },
});

const faq = defineType({
  name: "faq",
  title: "Questions and answers",
  type: "object",
  description: "Opens and closes like the FAQ on How It Works.",
  fields: [
    defineField({
      name: "items",
      title: "Questions",
      type: "array",
      of: [
        defineArrayMember({
          name: "faqItem",
          title: "Question",
          type: "object",
          fields: [
            defineField({ name: "q", title: "Question", type: "string", validation: (r) => r.required() }),
            defineField({ name: "a", title: "Answer", type: "text", rows: 3, validation: (r) => r.required() }),
          ],
          preview: { select: { title: "q", subtitle: "a" } },
        }),
      ],
    }),
  ],
  preview: { select: { items: "items" }, prepare: ({ items }) => ({ title: `Questions and answers (${(items || []).length})` }) },
});

// ── Documents ──────────────────────────────────────────────────────────────

const author = defineType({
  name: "author",
  title: "Author",
  type: "document",
  fields: [
    defineField({ name: "name", title: "Name shown on articles", type: "string", validation: (r) => r.required() }),
    defineField({ name: "role", title: "Title", type: "string", description: 'e.g. "Founder, PetParrk" or "Contributor, PetParrk"' }),
    defineField({
      name: "bio",
      title: "Short bio (optional)",
      type: "text",
      rows: 3,
      description: "One or two friendly sentences, shown at the end of each article. Leave empty to show just the name and title.",
    }),
  ],
  preview: { select: { title: "name", subtitle: "role" } },
});

const category = defineType({
  name: "category",
  title: "Category",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Name", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      title: "Web address",
      type: "slug",
      options: { source: "title", maxLength: 60 },
      description: "Used in the category link. Click Generate.",
      validation: (r) => r.required(),
    }),
    defineField({ name: "order", title: "Order on the blog page", type: "number", description: "Lower numbers show first.", initialValue: 10 }),
  ],
  preview: { select: { title: "title", subtitle: "slug.current" } },
});

const post = defineType({
  name: "post",
  title: "Article",
  type: "document",
  groups: [
    { name: "article", title: "Article", default: true },
    { name: "card", title: "Card & Google" },
  ],
  fields: [
    defineField({ name: "title", title: "Title", type: "string", group: "article", validation: (r) => r.required().max(110) }),
    defineField({ name: "dek", title: "Subtitle", type: "text", rows: 2, group: "article", description: "One or two sentences under the title." }),
    defineField({
      name: "author",
      title: "Author",
      type: "reference",
      to: [{ type: "author" }],
      group: "article",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "reference",
      to: [{ type: "category" }],
      group: "article",
      validation: (r) => r.required(),
    }),
    defineField({ name: "topic", title: "Topic label", type: "string", group: "article", description: 'The small tag on the card, e.g. "Dental".' }),
    defineField({
      name: "publishedAt",
      title: "Date",
      type: "date",
      group: "article",
      options: { dateFormat: "MMMM D, YYYY" },
      initialValue: () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }),
      validation: (r) => r.required(),
    }),
    defineField({
      name: "updatedAt",
      title: "Last updated (optional)",
      type: "date",
      group: "article",
      options: { dateFormat: "MMMM D, YYYY" },
      description: 'Set this when you refresh the numbers. The article then shows "Updated" with this date.',
    }),
    defineField({
      name: "glance",
      title: "At a glance (up to 3 numbers)",
      type: "array",
      group: "article",
      validation: (r) => r.max(3),
      of: [
        defineArrayMember({
          type: "object",
          name: "glanceItem",
          fields: [
            defineField({ name: "value", title: "Number", type: "string", description: 'e.g. "$650–$1,300"' }),
            defineField({ name: "label", title: "Label", type: "string", description: 'e.g. "What most clinics charge"' }),
          ],
          preview: { select: { title: "value", subtitle: "label" } },
        }),
      ],
    }),
    defineField({
      name: "body",
      title: "Article",
      type: "array",
      group: "article",
      of: [
        defineArrayMember({
          type: "block",
          styles: [
            { title: "Paragraph", value: "normal" },
            { title: "Section heading", value: "h2" },
            { title: "Sub-heading", value: "h3" },
          ],
          lists: [
            { title: "Bullets", value: "bullet" },
            { title: "Numbered", value: "number" },
          ],
          marks: {
            decorators: [{ title: "Bold", value: "strong" }],
            annotations: [
              {
                name: "link",
                type: "object",
                title: "Link",
                fields: [
                  defineField({
                    name: "href",
                    title: "Link to",
                    type: "string",
                    description: 'Another page on the site starts with "/", e.g. /blog/dog-vaccine-cost-california. Other websites start with https://',
                    validation: (r) => r.required(),
                  }),
                ],
              },
            ],
          },
        }),
        defineArrayMember({ type: "priceRange" }),
        defineArrayMember({ type: "priceTable" }),
        defineArrayMember({ type: "callout" }),
        defineArrayMember({ type: "faq" }),
      ],
    }),

    // ── Card & Google ──
    defineField({
      name: "slug",
      title: "Web address",
      type: "slug",
      group: "card",
      options: { source: "title", maxLength: 96 },
      description: "Click Generate. Don't change it after publishing, or old links break.",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "crumb",
      title: "Short name for the breadcrumb",
      type: "string",
      group: "card",
      description: 'e.g. "Dental cleaning cost". Shown as Blog › Dental cleaning cost.',
      validation: (r) => r.max(40),
    }),
    defineField({
      name: "description",
      title: "Google description",
      type: "text",
      rows: 3,
      group: "card",
      description: "What Google shows under the title. Aim for 120–160 characters.",
      validation: (r) => r.max(170).warning("Google cuts this off after about 160 characters."),
    }),
    defineField({
      name: "featured",
      title: "Feature at the top of the blog",
      type: "boolean",
      group: "card",
      initialValue: false,
      description: "The big card at the top of /blog. Turn it on for one article at a time.",
    }),
    defineField({
      name: "cover",
      title: "Price card",
      type: "object",
      group: "card",
      description: "The price shown on this article's card. Leave empty for a plain colored card.",
      fields: [
        defineField({ name: "label", title: "Label", type: "string", description: 'e.g. "Dental cleaning"' }),
        defineField({ name: "typicalLow", title: "Typical — low ($)", type: "number" }),
        defineField({ name: "typicalHigh", title: "Typical — high ($)", type: "number" }),
        defineField({ name: "low", title: "Lowest seen ($)", type: "number" }),
        defineField({ name: "high", title: "Highest seen ($)", type: "number" }),
      ],
    }),
  ],
  orderings: [{ title: "Newest first", name: "dateDesc", by: [{ field: "publishedAt", direction: "desc" }] }],
  preview: {
    select: { title: "title", date: "publishedAt", author: "author.name" },
    prepare: ({ title, date, author }) => ({ title, subtitle: [author, date].filter(Boolean).join(" · ") }),
  },
});

const blogSettings = defineType({
  name: "blogSettings",
  title: "Blog settings",
  type: "document",
  fields: [
    defineField({ name: "bylinePrefix", title: "Before the author's name", type: "string", description: 'e.g. "By:" shows "By: Brandon". Leave empty to show just the name.' }),
    defineField({
      name: "endNoteTitle",
      title: "End-of-article box — title",
      type: "string",
      description: "The box at the end of every article that points readers to the product. Leave this and the text empty to hide the box.",
    }),
    defineField({
      name: "endNoteText",
      title: "End-of-article box — extra text (optional)",
      type: "text",
      rows: 2,
      description: 'Shown before the built-in sentence ("We open in early 2027…", which changes by itself at launch).',
    }),
    defineField({ name: "disclaimerTitle", title: "Disclaimer — title", type: "string" }),
    defineField({ name: "disclaimerText", title: "Disclaimer — text", type: "text", rows: 3 }),
  ],
  preview: { prepare: () => ({ title: "Blog settings" }) },
});

export const schemaTypes = [post, author, category, blogSettings, priceRange, priceTable, callout, faq];