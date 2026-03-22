import { NextResponse } from "next/server";

export function middleware(request) {
  // Skip protection in local development
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  const token = request.cookies.get("preview_token")?.value;
  const url = request.nextUrl.clone();

  if (token === "your-secret-word-here") {
    return NextResponse.next();
  }

  if (url.pathname === "/unlock") {
    return NextResponse.next();
  }

  url.pathname = "/unlock";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|unlock).*)"],
};
