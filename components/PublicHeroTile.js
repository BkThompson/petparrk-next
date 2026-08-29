"use client";

// =============================================================
// PublicHeroTile — a published Hero Card as it appears on someone's
// PUBLIC profile.
//
// WHY THIS IS NOT `<PetTile isOwner={false}>`
//
// PetTile is the owner's tile. It knows how to build careHref, heroHref and
// shareHref, and it hides them behind `isOwner`. That is one edit away from a
// leak — and we shipped exactly that leak once, when PetTile's photo and name
// links pointed at /care ungated.
//
// This component has no careHref to hide. It cannot render a Care link, a Share
// link, or an editor link, because it has never heard of them. The only URL it
// can construct is `/profile/${username}/card/${slug}` — the public, tokenless,
// read-only card view. A component that CANNOT do the wrong thing beats one
// configured not to.
//
// DATA CONTRACT
//
// Every field comes from get_public_hero_cards(), whose return type is a fixed,
// flattened column list: slug, name, photo_url, breed, species, nickname,
// hero_rarity, hero_bg_color. No weight, no microchip, no medications, no
// birthday — those columns are absent from the function's signature, not merely
// filtered out of it.
//
// The card front is rendered by <HeroNameplate variant="mini">, the same
// component the real Hero Card uses for variant="full". Edit the nameplate once,
// both surfaces update. Note that mini defaults `showAge` to false, and the RPC
// does not return an age — so nothing to pass, and nothing to leak.
//
// The frame mirrors PetTile's two-layer structure exactly (outer 18px/1.5px
// border + inner 16px card, gold hover ring) so the public profile and the
// owner's Profile feel like the same product.
// =============================================================

import Link from "next/link";
import HeroNameplate from "./HeroNameplate";

// Count-driven columns, matching Profile's grid: a single card is centered, two
// sit as a centered pair, three or more flow 3-up (so four wraps 3+1). Profile
// already solved low-count centering; reusing the rule keeps the two pages
// visually consistent rather than merely similar.
export function publicHeroCols(n) {
  if (n === 1) return 1;
  if (n === 2) return 2;
  return 3;
}

export default function PublicHeroTile({ card, username }) {
  // hero_bg_color drives the tile background AND the nameplate's photo blend,
  // so the photo dissolves into the card exactly as it does on the real Hero
  // Card. Falls back to navy when the snapshot predates the color field.
  const bg = card.hero_bg_color || "#172531";

  return (
    <Link
      href={`/profile/${username}/card/${card.slug}`}
      className="pht-outer"
      aria-label={`View ${card.name}'s Hero Card`}
    >
      <div className="pht-card" style={{ background: bg }}>
        <div className="pht-photo">
          <HeroNameplate
            variant="mini"
            name={card.name}
            nickname={card.nickname}
            breed={card.breed}
            photoUrl={card.photo_url}
            species={card.species}
            rarity={card.hero_rarity}
            cardColor={bg}
          />
        </div>
      </div>
    </Link>
  );
}

// Frame CSS. Rendered once by the parent, not per tile.
export function PublicHeroTileStyles({ C }) {
  return (
    <style>{`
      /* Two-layer frame, identical to PetTile: the outer element IS the 1.5px
         border, so the hover ring can animate without shifting layout. */
      .pht-outer {
        border-radius: 18px;
        padding: 1.5px;
        height: 100%;
        background: ${C.border};
        transition: transform 0.3s, background 0.25s ease;
        text-decoration: none;
        display: block;
        color: inherit;
      }
      .pht-outer:hover { background: rgba(239,200,139,0.5); }
      .pht-outer:focus-visible {
        outline: 2px solid ${C.terracotta};
        outline-offset: 2px;
      }
      .pht-card {
        border-radius: 16px;
        transition: box-shadow 0.25s;
        box-shadow: 0 2px 12px rgba(23,37,49,0.07);
        border: 1px solid ${C.border};
        position: relative;
        overflow: hidden;
        height: 100%;
      }
      /* The 0.9 ring is a box-shadow on the INNER edge, so it reads at the same
         intensity over a dark hero background as it does over PetTile's white. */
      .pht-outer:hover .pht-card {
        box-shadow: 0 0 0 1.5px rgba(239,200,139,0.9), 0 16px 48px rgba(23,37,49,0.13);
      }
      /* Portrait, to match Profile's pet tile footprint (a 1:1 photo plus a
         name strip ≈ 340×406). The mini nameplate overlays the whole area, so
         the aspect ratio here IS the tile shape — 5/6 reads as a card front,
         not the oversized square a 1/1 ratio produced. */
      .pht-photo {
        aspect-ratio: 5 / 6;
        position: relative;
        overflow: hidden;
      }

      /* Grid — mirrors .pp-pet-grid so the public profile matches Profile. */
      .pht-grid { display: grid; gap: 16px; }
      .pht-grid.cols-1 { grid-template-columns: 340px; justify-content: center; }
      .pht-grid.cols-2 { grid-template-columns: repeat(2, 340px); justify-content: center; }
      .pht-grid.cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }

      @media (min-width: 768px) and (max-width: 1023px) {
        .pht-grid.cols-3 {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 30px 16px;
        }
      }
      /* Phones: one column, capped so a tile fills the screen the way Profile's
         does (340px left a growing side-gutter on real devices). */
      @media (max-width: 767px) {
        .pht-grid.cols-1,
        .pht-grid.cols-2,
        .pht-grid.cols-3 {
          grid-template-columns: minmax(0, 460px);
          justify-content: center;
          gap: 30px;
        }
      }
    `}</style>
  );
}
