// FILE: app/blog/[slug]/page.js   (BlogArticlePage)
// One article, e.g. /blog/dog-teeth-cleaning-cost-california.
// Next.js requires this file to be named page.js.
// One article. Server component on purpose (no "use client"). Every article
// is built as static HTML at deploy time — fast, and readable by search engines.
import { notFound } from "next/navigation";
import { BRAND, getAllPosts, getPost, getRelated, getSettings, formatDate, SITE_URL } from "../../../lib/blogPosts";
import { BLOG_CSS, BlogBlocks, EndNote, PostCard, slugify } from "../../../components/BlogBlocks";
import Breadcrumb from "../../../components/Breadcrumb";

// Newly published edits appear within this many seconds.
export const revalidate = 60;

export async function generateStaticParams() {
  return (await getAllPosts()).map((p) => ({ slug: p.slug }));
}

// Next 16: params is a Promise.
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    title: `${post.title} | ${BRAND}`,
    description: post.description,
    alternates: { canonical: url },
    robots: post.draft ? { index: false, follow: false } : undefined,
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      publishedTime: post.published,
      modifiedTime: post.updated || post.published,
      authors: post.authorInfo ? [post.authorInfo.name] : undefined,
    },
  };
}

export default async function BlogPost({ params }) {
  const { slug } = await params;
  const [post, settings] = await Promise.all([getPost(slug), getSettings()]);
  if (!post) notFound();

  const url = `${SITE_URL}/blog/${post.slug}`;
  const related = await getRelated(post.slug, 3);
  const author = post.authorInfo;
  const dateLabel = post.updated ? `Updated ${formatDate(post.updated)}` : formatDate(post.published);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.description,
      datePublished: post.published,
      dateModified: post.updated || post.published,
      author: author ? { "@type": "Person", name: author.name } : undefined,
      publisher: { "@type": "Organization", name: BRAND },
      mainEntityOfPage: url,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Blog", item: `${SITE_URL}/blog` },
        { "@type": "ListItem", position: 2, name: post.crumb || post.title, item: url },
      ],
    },
  ];

  const tocLinks = post.headings.map((h) => (
    <li key={h}>
      <a href={`#${slugify(h)}`}>{h}</a>
    </li>
  ));

  return (
    <>
      <style>{BLOG_CSS}</style>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <main className="ba">
        <header className="ba-head">
          <div className="bl-hero-glow" />
          <div className="bl-hero-ranges" />
          <div className="pp-container">
            <div className="ba-head-inner">
              <Breadcrumb items={[{ label: "Blog", href: "/blog" }, { label: post.crumb || post.title }]} />
              <span className="b-topic">{post.topic}</span>
              <h1 className="ba-h1">{post.title}</h1>
              {post.dek && <p className="ba-dek">{post.dek}</p>}
              <div className="ba-byline">
                {author && (
                  <span className="ba-avatar" aria-hidden="true">
                    {author.name.charAt(0)}
                  </span>
                )}
                <div>
                  {author && (
                    <p className="ba-author">
                      {settings.bylinePrefix ? `${settings.bylinePrefix} ` : ""}{author.name}
                    </p>
                  )}
                  <p className="b-meta">
                    <span>{dateLabel}</span>
                    <span>{post.readMinutes} min read</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="pp-container">
          {post.glance?.length > 0 && (
            <section className="ba-glance" aria-labelledby="ba-glance-title">
              <p id="ba-glance-title" className="ba-glance-title">
                At a glance
              </p>
              <dl className="ba-glance-grid">
                {post.glance.map((g) => (
                  <div key={g.label}>
                    <dt>{g.label}</dt>
                    <dd>{g.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="ba-glance-note">
                From real prices California clinics gave us. Typical means the middle half of clinics.
              </p>
            </section>
          )}

          <div className="ba-layout">
            <article className="ba-content">
              {post.headings.length > 2 && (
                <details className="ba-toc-mobile">
                  <summary>On this page</summary>
                  <ol>{tocLinks}</ol>
                </details>
              )}
              <BlogBlocks blocks={post.blocks} />

              {/* Same for every article — edited once in the CMS under "Blog settings". */}
              {/* Leave both end-note fields empty in Blog settings to hide the box. */}
              {(settings.endNoteTitle || settings.endNoteText) && (
                <EndNote title={settings.endNoteTitle} text={settings.endNoteText} />
              )}
              <BlogBlocks blocks={[{ type: "callout", title: settings.disclaimerTitle, text: settings.disclaimerText }]} />

              {author && (
                <footer className="ba-author-box">
                  <span className="ba-avatar" aria-hidden="true">
                    {author.name.charAt(0)}
                  </span>
                  <div>
                    <p className="ba-author">{author.name}</p>
                    <p className="ba-author-role" style={author.bio ? undefined : { margin: 0 }}>
                      {author.role}
                    </p>
                    {author.bio && <p className="ba-author-bio">{author.bio}</p>}
                  </div>
                </footer>
              )}
            </article>

            {post.headings.length > 2 && (
              <nav className="ba-toc" aria-label="On this page">
                <p className="ba-toc-title">On this page</p>
                <ol>{tocLinks}</ol>
              </nav>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section className="ba-related" aria-labelledby="ba-related-title">
            <div className="pp-container">
              <div className="bl-section-head">
                <h2 id="ba-related-title" className="bl-h2">
                  Keep reading
                </h2>
              </div>
              <ul className="bl-grid">
                {related.map((p) => (
                  <li key={p.slug}>
                    <PostCard post={p} />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
    </>
  );
}