// FILE: app/blog/loading.js   (BlogListLoading)
// Shown while the blog list is loading: the paw-print loader with
// "Loading articles…". Next.js finds it by its name, so it must be called
// loading.js and sit in the app/blog folder, next to app/blog/page.js.
import PageLoader from "../../components/PageLoader";

export default function BlogLoading() {
  return <PageLoader for="blog" />;
}