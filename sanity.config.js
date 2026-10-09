"use client";

// FILE: sanity.config.js   (goes in the top folder of your project, next to package.json)
// Sets up the CMS editor that opens at /studio on your own site.

import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./sanity/schema";

const SETTINGS_ID = "blogSettings";

export default defineConfig({
  name: "blog",
  title: "PetParrk Blog",
  basePath: "/studio",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",

  schema: {
    types: schemaTypes,
    // "Blog settings" is a single page, so it can't be created twice.
    templates: (templates) => templates.filter((t) => t.schemaType !== "blogSettings"),
  },

  document: {
    // No "Delete" or "Duplicate" on Blog settings.
    actions: (actions, { schemaType }) =>
      schemaType === "blogSettings"
        ? actions.filter((a) => ["publish", "discardChanges", "restore"].includes(a.action))
        : actions,
  },

  plugins: [
    structureTool({
      title: "Blog",
      structure: (S) =>
        S.list()
          .title("Blog")
          .items([
            S.listItem()
              .title("Articles")
              .schemaType("post")
              .child(S.documentTypeList("post").title("Articles").defaultOrdering([{ field: "publishedAt", direction: "desc" }])),
            S.documentTypeListItem("author").title("Authors"),
            S.documentTypeListItem("category").title("Categories"),
            S.divider(),
            S.listItem()
              .title("Blog settings")
              .id(SETTINGS_ID)
              .child(S.document().schemaType("blogSettings").documentId(SETTINGS_ID).title("Blog settings")),
          ]),
    }),
  ],
});