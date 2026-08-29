"use client";

// ============================================================================
// Hero Card — OWNER display page  (app/pet-card/[slug]/hero/page.js)
// ============================================================================
// Thin wrapper: authenticates, loads the owner's pet, and renders the shared
// <HeroCardView>. All card markup/design lives in components/HeroCardView.js so
// this page and the public token page stay in sync automatically.
// ============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import PageLoader from "../../../../components/PageLoader";
import {
  getOwnerPetBySlug,
  getPublicHeroCardBySlug,
} from "../../../../lib/petCardApi";
import { HeroCardView } from "../../../../components/HeroCardView";

export default function HeroCardPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const previewMode = searchParams.get("preview") === "public";
  // ?u=<username> marks a PUBLIC visit (a shared/profile link). When present and
  // the viewer isn't the owner, we load the published card via the public loader
  // instead of bouncing to auth.
  const publicUsername = searchParams.get("u");
  const slug = params?.slug;

  const [session, setSession] = useState(undefined);
  const [pet, setPet] = useState(null);
  const [publicMode, setPublicMode] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session || null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(s || null));
    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (!slug) return;
    let cancelled = false;

    // Resolve the viewer's own username (if logged in) so we can tell whether
    // a ?u link belongs to the current user (owner) or someone else (public).
    (async () => {
      // PUBLIC PATH: a ?u link and either logged out, or logged in as a
      // DIFFERENT user. Load the published card via the public loader — no auth
      // required, showcase columns only, gated by the four publish/share flags.
      if (publicUsername) {
        let viewerOwnsThis = false;
        if (session) {
          const { data: ownProfile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", session.user.id)
            .maybeSingle();
          viewerOwnsThis =
            ownProfile?.username &&
            ownProfile.username.toLowerCase() === publicUsername.toLowerCase();
        }

        if (!viewerOwnsThis) {
          const { data, error } = await getPublicHeroCardBySlug(
            publicUsername,
            slug,
          );
          if (cancelled) return;
          if (error || !data) {
            setNotFound(true);
            return;
          }
          setPet(data);
          setPublicMode(true);
          return;
        }
        // Owner following their own ?u link → fall through to the owner path.
      }

      // OWNER PATH: no ?u (or the owner viewing their own). Requires a session.
      if (session === null) {
        router.replace(`/auth?redirect=/pet-card/${slug}/hero`);
        return;
      }
      const { data, error } = await getOwnerPetBySlug(slug);
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        return;
      }
      setPet(data);
    })();

    return () => {
      cancelled = true;
    };
  }, [session, slug, router, publicUsername]);

  if (session === undefined || (!pet && !notFound)) {
    return <PageLoader for="heroCard" />;
  }
  if (notFound) {
    return (
      <div className="hc-notfound">
        <p className="hc-notfound-title">We couldn&apos;t find that pet.</p>
        <p className="hc-notfound-sub">
          The link may be incorrect, or this pet isn&apos;t public.
        </p>
        <Link href="/pet-card" className="hc-notfound-btn">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Pet Cards
        </Link>
        <style>{`
          .hc-notfound {
            min-height:70vh;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            gap:10px;
            padding:40px;
            text-align:center;
            font-family:var(--font-urbanist,'Urbanist',sans-serif);
            color:#172531;
          }

          .hc-notfound-title { 
            font-size: 20px; 
            font-weight: 800; 
            margin: 0; 
          }
          .hc-notfound-sub {
            font-size: 16px; 
            font-weight: 500; 
            color: #4B5563;
            margin: 0 0 10px; 
            max-width: 380px; 
            line-height: 1.5;
          }
          .hc-notfound-btn {
            display:inline-flex;
            align-items:center;
            gap:8px;
            padding:0px 24px;
            height: 42px;
            border-radius:12px;
            background:#CF5C36;
            color:#fff;
            font-size:15px;
            font-weight:700;
            text-decoration:none;
            border:2px solid #CF5C36;
            transition:background 0.15s, color 0.15s;
          }
          .hc-notfound-btn:hover {
           background:#fff;
            color:#CF5C36;
          }
          `}</style>
      </div>
    );
  }
  if (!pet) return <PageLoader for="heroCard" />;

  return (
    <HeroCardView
      pet={pet}
      slug={slug}
      previewMode={previewMode}
      publicMode={publicMode}
    />
  );
}
