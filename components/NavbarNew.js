"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";
import Link from "next/link";

function PawMark({ size = 28 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <ellipse cx="14" cy="17" rx="6.5" ry="5.5" fill="#CF5C36" />
      <ellipse cx="7.5" cy="10.5" rx="2.8" ry="3.2" fill="#CF5C36" />
      <ellipse cx="20.5" cy="10.5" rx="2.8" ry="3.2" fill="#CF5C36" />
      <ellipse cx="10.5" cy="8" rx="2.4" ry="2.8" fill="#CF5C36" />
      <ellipse cx="17.5" cy="8" rx="2.4" ry="2.8" fill="#CF5C36" />
    </svg>
  );
}

const NAV_LINKS = [
  { href: "/vets", label: "Find a Vet" },
  { href: "/symptom-checker", label: "Symptom Checker" },
  { href: "/how-it-works", label: "How It Works" },
];

const DROPDOWN_LINKS = [
  { href: "/profile", label: "My Profile", icon: "👤" },
  { href: "/saved", label: "Saved Vets", icon: "❤️" },
  { href: "/account", label: "Account Settings", icon: "⚙️" },
];

const MOBILE_SECONDARY_LINKS = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const BREAKPOINT = 768;

export default function NavbarNew() {
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] = useState(undefined);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(null);
  const [avatarError, setAvatarError] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDropdownClosing, setIsDropdownClosing] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const dropdownRef = useRef(null);
  const navLinksRef = useRef(null);
  const indicatorRef = useRef(null);
  const dropdownOpenRef = useRef(false);

  function _openDropdown() {
    dropdownOpenRef.current = true;
    setShowDropdown(true);
    setIsDropdownClosing(false);
  }

  function _closeDropdown() {
    if (!dropdownOpenRef.current) return;
    dropdownOpenRef.current = false;
    setIsDropdownClosing(true);
    setTimeout(() => {
      setShowDropdown(false);
      setIsDropdownClosing(false);
    }, 150);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        // Verify the user still exists server-side.
        // getSession() only reads from local storage — getUser() checks against Supabase.
        // If the account was deleted, this will return an error and we sign out immediately.
        const { error } = await supabase.auth.getUser();
        if (error) {
          await supabase.auth.signOut();
          setSession(null);
          return;
        }
      }
      setSession(data.session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setProfileAvatarUrl(data.avatar_url);
      });
  }, [session]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (!dropdownOpenRef.current) return;
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        _closeDropdown();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= BREAKPOINT && mobileOpen) closeMobileMenu();
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileOpen]);

  useEffect(() => {
    document.documentElement.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    closeMobileMenu();
  }, [pathname]);

  function closeMobileMenu() {
    if (!mobileOpen) return;
    setIsClosing(true);
    setTimeout(() => {
      setMobileOpen(false);
      setIsClosing(false);
    }, 220);
  }

  function toggleMobileMenu() {
    if (showDropdown) _closeDropdown();
    if (mobileOpen) {
      closeMobileMenu();
    } else {
      setMobileOpen(true);
    }
  }

  async function handleSignOut() {
    _closeDropdown();
    closeMobileMenu();
    await supabase.auth.signOut();
    router.push("/");
  }

  const avatarUrl =
    (!avatarError &&
      (profileAvatarUrl || session?.user?.user_metadata?.avatar_url)) ||
    null;
  const avatarLetter = session?.user?.email?.[0]?.toUpperCase();

  function moveIndicator(el) {
    if (!indicatorRef.current || !navLinksRef.current) return;
    const navRect = navLinksRef.current.getBoundingClientRect();
    const linkRect = el.getBoundingClientRect();
    indicatorRef.current.style.width = linkRect.width + "px";
    indicatorRef.current.style.transform = `translateX(${linkRect.left - navRect.left}px)`;
    indicatorRef.current.classList.add("visible");
  }

  useEffect(() => {
    if (!navLinksRef.current || !indicatorRef.current) return;
    const active = navLinksRef.current.querySelector(".pp-nav-link.active");
    if (active) moveIndicator(active);
    else indicatorRef.current.classList.remove("visible");
  }, [pathname]);

  return (
    <>
      <style>{`
        .pp-nav {
          position: sticky; top: 0; z-index: 100; width: 100%; height: 64px;
          background: var(--color-navy-dark, #172531);
          box-shadow: 0 2px 12px rgba(0,0,0,0.25);
          transition: box-shadow 0.2s ease;
          will-change: transform; transform: translateZ(0); backface-visibility: hidden;
        }
        .pp-nav.scrolled { box-shadow: 0 4px 24px rgba(23,37,49,0.25); }
        .pp-nav-inner {
          width: 100%; max-width: 1280px; margin: 0 auto; height: 100%;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; gap: 16px;
        }
        @media (min-width: 768px) { .pp-nav-inner { padding: 0 40px; } }


        .pp-logo { display: flex; align-items: center; gap: 8px; text-decoration: none; flex-shrink: 0; }
        .pp-logo-text { font-size: 20px; font-weight: 800; color: #fff; letter-spacing: -0.02em; font-family: var(--font,'Urbanist',sans-serif); }


        .pp-nav-links { display: none; align-items: center; gap: 32px; list-style: none; position: relative; }
        @media (min-width: 768px) { .pp-nav-links { display: flex; } }


        .pp-nav-indicator {
          position: absolute; bottom: -4px; height: 2px;
          background: #CF5C36; border-radius: 9999px;
          transition: transform 0.25s cubic-bezier(0.4,0,0.2,1), width 0.25s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease;
          pointer-events: none; opacity: 0; left: 0; transform-origin: left center;
        }
        .pp-nav-indicator.visible { opacity: 1; }


        .pp-nav-link { font-size: 14px; color: rgba(255,255,255,0.6); text-decoration: none; font-family: var(--font,'Urbanist',sans-serif); white-space: nowrap; padding-bottom: 8px; transition: color 0.15s ease; position: relative; }
        .pp-nav-link span { display: block; font-weight: 500; }
        .pp-nav-link span::before { content: attr(data-label); font-weight: 700; visibility: hidden; height: 0; display: block; overflow: hidden; pointer-events: none; user-select: none; }
        .pp-nav-link:hover { color: #fff; }
        .pp-nav-link.active { color: #EFC88B; }
        .pp-nav-link.active span { font-weight: 700; }


        .pp-nav-right { display: flex; align-items: center; gap: 12px; min-width: 120px; justify-content: flex-end; }


        .pp-signin-btn { display: none; }
        @media (min-width: 768px) {
          .pp-signin-btn {
            display: inline-flex; align-items: center; justify-content: center;
            padding: 8px 18px; border-radius: 12px; border: 2px solid rgba(255,255,255,0.35);
            background: transparent; color: #fff; font-size: 14px; font-weight: 700;
            font-family: var(--font-urbanist,'Urbanist',sans-serif); text-decoration: none;
            cursor: pointer; transition: border-color 0.2s, background 0.2s; white-space: nowrap;
          }
          .pp-signin-btn:hover { border-color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.06); }
        }
        .pp-get-started-btn { display: none; }
        @media (min-width: 768px) {
          .pp-get-started-btn { display: inline-flex; align-items: center; }
          .pp-get-started-btn:hover { background: #fff !important; color: #CF5C36 !important; }
        }


        .pp-avatar-btn {
          width: 36px; height: 36px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2);
          background: var(--color-terracotta, #CF5C36); color: #fff; font-size: 14px; font-weight: 700;
          display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden;
          transition: border-color 0.15s, transform 0.15s; flex-shrink: 0; font-family: var(--font,'Urbanist',sans-serif);
        }
        .pp-avatar-btn:hover { border-color: rgba(255,255,255,0.5); transform: scale(1.05); }


        .pp-dropdown {
          position: absolute; top: calc(100% + 8px); right: 0;
          background: linear-gradient(to bottom, #1E3347 0%, #172531 60%, #121E28 100%);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 4px;
          min-width: 210px; overflow: hidden; z-index: 200;
          animation: ddFadeIn 0.18s cubic-bezier(0.4,0,0.2,1);
        }
        .pp-dropdown.closing { animation: ddFadeOut 0.15s cubic-bezier(0.4,0,0.2,1) forwards; pointer-events: none; }
        @keyframes ddFadeIn  { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ddFadeOut { from { opacity:1; transform:translateY(0); } to { opacity:0; transform:translateY(-6px); } }


        .pp-dd-link { display: flex; align-items: center; gap: 10px; padding: 11px 16px; font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.85); text-decoration: none; font-family: var(--font-urbanist,'Urbanist',sans-serif); transition: background 0.12s, color 0.12s; }
        .pp-dd-link:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .pp-dd-divider { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 4px 0; }
        .pp-dd-signout { display: block; width: 100%; padding: 11px 16px; text-align: left; background: none; border: none; font-size: 14px; font-weight: 500; color: #CF5C36; cursor: pointer; font-family: var(--font-urbanist,'Urbanist',sans-serif); transition: background 0.12s; }
        .pp-dd-signout:hover { background: rgba(207,92,54,0.12); }


        .pp-hamburger { display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 5px; width: 36px; height: 36px; background: none; border: none; cursor: pointer; padding: 0; z-index: 310; flex-shrink: 0; border-radius: 6px; }
        .pp-hamburger:hover { background: rgba(255,255,255,0.08); }
        @media (min-width: 768px) { .pp-hamburger { display: none !important; } }
        .pp-hamburger-line { width: 22px; height: 2px; background: #fff; border-radius: 9999px; transition: transform 0.15s, opacity 0.15s; transform-origin: center; }
        .pp-hamburger.open .pp-hamburger-line:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .pp-hamburger.open .pp-hamburger-line:nth-child(2) { opacity: 0; transform: scaleX(0); }
        .pp-hamburger.open .pp-hamburger-line:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }


        .pp-mobile-overlay { position: fixed; inset: 0; z-index: 99; background: var(--color-navy-dark,#172531); display: flex; flex-direction: column; padding: 88px 32px 48px; overflow-y: auto; animation: mobileSlideIn 0.3s ease forwards; }
        @media (min-width: 768px) { .pp-mobile-overlay { display: none !important; } }
        .pp-mobile-overlay.closing { animation: mobileSlideOut 0.22s ease forwards; }
        @keyframes mobileSlideIn  { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes mobileSlideOut { from { opacity:1; transform:translateY(0); }    to { opacity:0; transform:translateY(-12px); } }


        .pp-mobile-links { display: flex; flex-direction: column; gap: 4px; flex: 1;}
        .pp-mobile-link { display: flex; align-items: center; gap: 14px; padding: 14px 0; font-size: 22px; font-weight: 700; color: rgba(255,255,255,0.75); text-decoration: none; font-family: var(--font,'Urbanist',sans-serif); transition: color 0.15s; animation: mobileLinkFadeIn 0.35s ease both; }
        .pp-mobile-link:hover { color: #fff; }
        .pp-mobile-link.active { color: var(--color-gold,#EFC88B); }
        @keyframes mobileLinkFadeIn { from { opacity:0; transform:translateX(-16px); } to { opacity:1; transform:translateX(0); } }
        .pp-mobile-link:nth-child(1) { animation-delay: 0.05s; }
        .pp-mobile-link:nth-child(2) { animation-delay: 0.10s; }
        .pp-mobile-link:nth-child(3) { animation-delay: 0.15s; }
        .pp-mobile-link:nth-child(4) { animation-delay: 0.20s; }
        .pp-mobile-link:nth-child(5) { animation-delay: 0.25s; }


        .pp-mobile-divider { width: 100%; height: 1px; background: rgba(255,255,255,0.1); margin: 20px 0 16px; }
        .pp-mobile-signup-btn { display: block; width: 100%; padding: 14px 0; text-align: center; background: var(--color-terracotta,#CF5C36); border: 2px solid var(--color-terracotta,#CF5C36); border-radius: 12px; font-size: 16px; font-weight: 700; color: #fff; text-decoration: none; font-family: var(--font-urbanist,'Urbanist',sans-serif); margin-bottom: 8px; transition: background 0.2s, color 0.2s; }
        .pp-mobile-signup-btn:hover { background: #fff; color: var(--color-terracotta,#CF5C36); }
        .pp-mobile-signin-btn { display: block; width: 100%; padding: 14px 0; text-align: center; background: rgba(255,255,255,0.1); border: 1.5px solid rgba(255,255,255,0.3); border-radius: 12px; font-size: 16px; font-weight: 700; color: #fff; text-decoration: none; font-family: var(--font-urbanist,'Urbanist',sans-serif); transition: background 0.15s; }
        .pp-mobile-signin-btn:hover { background: rgba(255,255,255,0.18); }
        .pp-mobile-signout { display: block; width: 100%; padding: 14px 0; text-align: center; background: rgba(207,92,54,0.15); border: 1.5px solid rgba(207,92,54,0.5); border-radius: 12px; font-size: 16px; font-weight: 700; color: #CF5C36; cursor: pointer; font-family: var(--font-urbanist,'Urbanist',sans-serif); transition: background 0.15s; }
        .pp-mobile-signout:hover { background: rgba(207,92,54,0.25); }


        .pp-mobile-section-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 2px; }
      `}</style>

      <nav className={`pp-nav${scrolled ? " scrolled" : ""}`}>
        <div className="pp-nav-inner">
          <Link href="/" className="pp-logo">
            <PawMark size={28} />
            <span className="pp-logo-text">PetParrk</span>
          </Link>

          <ul
            className="pp-nav-links"
            ref={navLinksRef}
            onMouseLeave={() => {
              const active = navLinksRef.current?.querySelector(
                ".pp-nav-link.active",
              );
              if (active && indicatorRef.current) moveIndicator(active);
              else if (indicatorRef.current)
                indicatorRef.current.classList.remove("visible");
            }}
          >
            <div className="pp-nav-indicator" ref={indicatorRef} />
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={`pp-nav-link${pathname === href ? " active" : ""}`}
                  onMouseEnter={(e) => moveIndicator(e.currentTarget)}
                >
                  <span data-label={label}>{label}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="pp-nav-right">
            {session === undefined ? null : session ? (
              <div ref={dropdownRef} style={{ position: "relative" }}>
                <button
                  className="pp-avatar-btn"
                  onClick={() => {
                    if (window.innerWidth >= BREAKPOINT) {
                      dropdownOpenRef.current
                        ? _closeDropdown()
                        : _openDropdown();
                    }
                  }}
                  aria-label="Account menu"
                  aria-expanded={showDropdown}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="avatar"
                      onError={() => setAvatarError(true)}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    avatarLetter
                  )}
                </button>
                {(showDropdown || isDropdownClosing) && (
                  <div
                    className={`pp-dropdown${isDropdownClosing ? " closing" : ""}`}
                  >
                    {DROPDOWN_LINKS.map(({ href, label, icon }) => (
                      <Link
                        key={href}
                        href={href}
                        className="pp-dd-link"
                        onClick={_closeDropdown}
                      >
                        <span style={{ fontSize: "16px" }}>{icon}</span>
                        {label}
                      </Link>
                    ))}
                    <hr className="pp-dd-divider" />
                    <button className="pp-dd-signout" onClick={handleSignOut}>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/auth" className="pp-signin-btn">
                  Sign In
                </Link>
                <Link
                  href="/auth?tab=signup"
                  className="pp-get-started-btn"
                  style={{
                    padding: "8px 18px",
                    borderRadius: "12px",
                    border: "2px solid #CF5C36",
                    background: "var(--color-terracotta,#CF5C36)",
                    color: "#fff",
                    fontSize: "14px",
                    fontWeight: "700",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    fontFamily: "var(--font-urbanist,'Urbanist',sans-serif)",
                    transition: "background 0.2s, color 0.2s",
                  }}
                >
                  Get Started
                </Link>
              </>
            )}

            <button
              className={`pp-hamburger${mobileOpen && !isClosing ? " open" : ""}`}
              onClick={toggleMobileMenu}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              <span className="pp-hamburger-line" />
              <span className="pp-hamburger-line" />
              <span className="pp-hamburger-line" />
            </button>
          </div>
        </div>
      </nav>

      {(mobileOpen || isClosing) && (
        <div
          className={`pp-mobile-overlay${isClosing ? " closing" : ""}`}
          role="dialog"
          aria-label="Navigation menu"
        >
          <div className="pp-mobile-links">
            <p className="pp-mobile-section-label">Product</p>
            {[
              ["/vets", "Find a Vet"],
              ["/symptom-checker", "Symptom Checker"],
              ["/profile", "Pet Health Card"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={`pp-mobile-link${pathname === href ? " active" : ""}`}
              >
                {label}
              </Link>
            ))}

            <div className="pp-mobile-divider" />

            <p className="pp-mobile-section-label">Explore</p>
            {[
              ["/how-it-works", "How It Works"],
              ["/about", "About"],
              ["/contact", "Contact"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={`pp-mobile-link${pathname === href ? " active" : ""}`}
              >
                {label}
              </Link>
            ))}

            <div className="pp-mobile-divider" />

            {session ? (
              <>
                <p className="pp-mobile-section-label">Account</p>
                <Link href="/profile" className="pp-mobile-link">
                  My Profile
                </Link>
                <Link href="/saved" className="pp-mobile-link">
                  Saved Vets
                </Link>
                <Link href="/account" className="pp-mobile-link">
                  Account Settings
                </Link>
                <div style={{ marginTop: "16px" }}>
                  <button className="pp-mobile-signout" onClick={handleSignOut}>
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link href="/auth?tab=signup" className="pp-mobile-signup-btn">
                  Create Account
                </Link>
                <Link href="/auth" className="pp-mobile-signin-btn">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
