"use client";

import { usePathname } from "next/navigation";
import NavbarNew from "./NavbarNew";

export default function NavbarWrapper() {
  const pathname = usePathname();
  // Admin is its own "app mode" — hide the public site nav (and its hamburger)
  // on all /admin routes so staff only see the admin's own navigation.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return null;
  }
  return <NavbarNew />;
}
