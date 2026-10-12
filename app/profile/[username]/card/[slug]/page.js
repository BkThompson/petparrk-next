"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageLoader from "../../../../../components/PageLoader";
import { getPublicHeroCardBySlug } from "../../../../../lib/petCardApi";
import { HeroCardView } from "../../../../../components/HeroCardView";

export default function PublicHeroCardPage() {
  const params = useParams();
  const username = params?.username;
  const slug = params?.slug;

  const [pet, setPet] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username || !slug) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await getPublicHeroCardBySlug(username, slug);
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
  }, [username, slug]);

  if (notFound) {
    return (
      <div className="hcp-notfound">
        <p>This Hero Card isn&apos;t available.</p>
        <Link href={`/profile/${username}`} className="hcp-back">
          Back to profile
        </Link>
        <style>{`
          .hcp-notfound {
            min-height: 70vh; display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 18px;
            padding: 40px; text-align: center;
            font-family: var(--font-urbanist,'Urbanist',sans-serif);
            color: var(--color-navy-dark);
          }
          .hcp-back {
            display: inline-flex; align-items: center;
            height: 42px; padding: 0 20px;
            border: 2px solid var(--color-navy-dark); border-radius: 12px;
            background: var(--color-navy-dark); color: var(--color-white);
            font-size: 16px; font-weight: 700; text-decoration: none;
            transition: background 0.15s, color 0.15s;
          }
          @media (hover: hover) { .hcp-back:hover { background: var(--color-white); color: var(--color-navy-dark); } }

          p{
            font-weight: 500;}
        `}</style>
      </div>
    );
  }

  if (!pet) return <PageLoader for="heroCard" />;

  return <HeroCardView pet={pet} slug={slug} publicMode />;
}
