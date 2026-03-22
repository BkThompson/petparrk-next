import { NextResponse } from "next/server";

const ALLOWED_IPS = []; // leave empty, we'll use a secret token instead

export function middleware(request) {
  const token = request.cookies.get("preview_token")?.value;
  const url = request.nextUrl.clone();

  if (token === "petparrk2026078118!") {
    return NextResponse.next();
  }

  // Allow access to the unlock page itself
  if (url.pathname === "/unlock") {
    return NextResponse.next();
  }

  url.pathname = "/unlock";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|unlock).*)"],
};
