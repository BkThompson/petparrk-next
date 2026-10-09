// FILE: app/sitemap.js
// Next.js serves this at /sitemap.xml so Google can find every article.
// At launch, add your other public pages (/, /vets, /about…) to the list.
import { getAllPosts, SITE_URL } from "../lib/blogPosts";

export const revalidate = 3600;

export default async function sitemap() {
  const posts = (await getAllPosts()).filter((p) => !p.draft);
  return [
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.8 },
    ...posts.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: p.updated || p.published,
      changeFrequency: "monthly",
      priority: 0.7,
    })),
  ];
}