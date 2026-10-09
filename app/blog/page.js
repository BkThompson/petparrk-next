// FILE: app/blog/page.js   (BlogListPage)
// The /blog list page: featured article, category buttons, article grid.
// Next.js requires this file to be named page.js.
//
// Handles every list address through the link itself, so no extra folders:
//   /blog                              all articles, page 1
//   /blog?page=2                       all articles, page 2
//   /blog?category=vet-costs           one category
//   /blog?category=vet-costs&page=2    one category, page 2
import { notFound, permanentRedirect } from "next/navigation";
import { BRAND, SITE_URL, getCategories, getPage } from "../../lib/blogPosts";
import { BlogIndex, blogHref } from "../../components/BlogBlocks";

const DESCRIPTION =
  "What vet care really costs, how to look after your dog, and the things we wish someone had told us sooner. Price guides built from real quotes California clinics gave us.";

function read(sp) {
  const rawPage = sp?.page;
  const rawCat = sp?.category;
  const page = rawPage === undefined ? 1 : Number(rawPage);
  const category = rawCat === undefined ? null : String(rawCat);
  return { page, category };
}

// Newly published articles appear within this many seconds.
export const revalidate = 60; // keep in step with REFRESH_SECONDS in lib/blogPosts.js

// Next 16: searchParams is a Promise.
export async function generateMetadata({ searchParams }) {
  const { page, category } = read(await searchParams);
  const cat = (await getCategories()).find((c) => c.key === category);
  const base = cat ? `${cat.label} | ${BRAND} Blog` : `Blog: honest answers for dog owners | ${BRAND}`;
  const title = Number.isInteger(page) && page > 1 ? `${base} (page ${page})` : base;
  const url = `${SITE_URL}${blogHref({ page: Number.isInteger(page) ? page : 1, category: cat ? category : null })}`;
  return {
    title,
    description: DESCRIPTION,
    alternates: { canonical: url },
    openGraph: { title, description: DESCRIPTION, url, type: "website" },
  };
}

export default async function BlogPage({ searchParams }) {
  const { page, category } = read(await searchParams);

  if (!Number.isInteger(page) || page < 1) notFound();
  if (category && !(await getCategories()).some((c) => c.key === category)) notFound();
  // "?page=1" is the same page as no page number — send it to the clean address.
  if ((await searchParams)?.page === "1") permanentRedirect(blogHref({ category }));
  if (page > (await getPage(1, category)).totalPages) notFound();

  return <BlogIndex page={page} category={category} />;
}