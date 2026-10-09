// FILE: sanity.cli.js   (goes in the top folder of your project, next to package.json)
// Lets the one-time import command (in BLOG-CMS-SETUP.md) find your CMS
// project. It reads the same settings as the website, from .env.local.

import { loadEnvConfig } from "@next/env";
import { defineCliConfig } from "sanity/cli";

loadEnvConfig(process.cwd());

export default defineCliConfig({
  api: {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  },
});