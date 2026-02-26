const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const supabase = createClient(
  "https://zkpnaaqmketspxcyvejd.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function generateSitemap() {
  const { data: vets, error } = await supabase
    .from("vets")
    .select("id")
    .eq("status", "active");

  if (error) {
    console.error("Supabase error:", error);
    return;
  }

  const baseUrl = "https://petparrk.vercel.app";

  const vetUrls = vets
    .map(
      (vet) => `
  <url>
    <loc>${baseUrl}/vet/${vet.id}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join("");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>${vetUrls}
</urlset>`;

  fs.writeFileSync("public/sitemap.xml", sitemap);
  console.log(`Sitemap generated with ${vets.length} vets!`);
}

generateSitemap();
