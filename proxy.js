import { NextResponse } from "next/server";

export function proxy(request) {
  // Skip protection in local development
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  // Preview gate token, read from the environment (set PREVIEW_TOKEN in your
  // host, e.g. Vercel → Project → Settings → Environment Variables).
  const PREVIEW_TOKEN = process.env.PREVIEW_TOKEN;

  // Fail-safe: if no token is configured, the gate is effectively OFF and the
  // site is public. This is what makes launch a one-step action — remove/empty
  // PREVIEW_TOKEN in the host and the whole site opens, with no code change.
  if (!PREVIEW_TOKEN) {
    return NextResponse.next();
  }

  const token = request.cookies.get("preview_token")?.value;
  const url = request.nextUrl.clone();

  if (token === PREVIEW_TOKEN) {
    return NextResponse.next();
  }

  if (url.pathname === "/unlock") {
    return NextResponse.next();
  }

  // Redirect to the unlock gate. If a (wrong) token was present, add ?retry=1
  // so the unlock page can show an "incorrect password" hint.
  url.pathname = "/unlock";
  if (token) {
    url.searchParams.set("retry", "1");
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|unlock).*)"],
};
