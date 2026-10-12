// FILE: app/blog/[slug]/loading.js   (BlogArticleLoading)
// Shown while one article is loading: the paw-print loader with
// "Loading article…". Must be called loading.js and sit in the app/blog/[slug]
// folder, next to that folder's page.js.
import PageLoader from "../../../components/PageLoader";

export default function BlogArticleLoading() {
  return <PageLoader for="blogArticle" />;
}