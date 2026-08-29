"use client";

/* CommunityContributions — the public-facing contributions panel.
   Extracted from ProfileMain / ProfileUsername (they were byte-identical). */

import { ShieldCheck, Sprout } from "lucide-react";

export default function CommunityContributions({
  C,
  profile,
  counts,
  level,
  currentLevelDef,
  joinedDate,
  memberDays,
  bannerKey,
  bannerPalette,
}) {
  const verifiedCount = counts.verifiedSubmissions || 0;
  const monthsActive = Math.floor(memberDays / 30);

  // Number on the dark medal: lightest stop (legible against deep medal bg)
  // Strong text in blurb on cream: deepest stop (legible against cream)
  const numberColor = currentLevelDef ? currentLevelDef.stops[0] : C.gold;
  const numberShadow = currentLevelDef ? currentLevelDef.stops[3] : C.navyDark;
  const blurbAccent = currentLevelDef ? currentLevelDef.stops[2] : C.navyDark;

  // Adaptive copy based on contribution level
  let credibilityCopy;
  const username = profile?.username
    ? `@${profile.username}`
    : profile?.full_name || "This user";
  const levelName = currentLevelDef?.name || "member";

  if (verifiedCount === 0) {
    credibilityCopy = (
      <>
        <strong style={{ fontWeight: 700, color: C.navyDark }}>
          {username}
        </strong>{" "}
        is just getting started — no verified prices yet.
      </>
    );
  } else if (verifiedCount < 10) {
    credibilityCopy = (
      <>
        <strong style={{ fontWeight: 700, color: C.navyDark }}>
          {username}
        </strong>{" "}
        has contributed{" "}
        <strong style={{ color: C.navyDark }}>
          {verifiedCount} verified {verifiedCount === 1 ? "price" : "prices"}
        </strong>{" "}
        {monthsActive >= 1
          ? `over ${monthsActive === 1 ? "1 month" : `${monthsActive} months`}.`
          : "as a new member."}
      </>
    );
  } else {
    credibilityCopy = (
      <>
        <strong style={{ fontWeight: 700, color: C.navyDark }}>
          {username}
        </strong>{" "}
        is a <strong style={{ color: blurbAccent }}>{levelName}</strong> who has
        been contributing for{" "}
        <strong style={{ color: C.navyDark }}>
          {monthsActive === 1 ? "1 month" : `${monthsActive} months`}
        </strong>
        .
      </>
    );
  }

  return (
    <div className="pp-cc-section">
      <p className="pp-cc-eyebrow">Community Contributions</p>

      {verifiedCount === 0 ? (
        // 0-state: simple "Just getting started" card (no medal, no chromatic gradient)
        <div className="pp-cc-empty">
          <div className="pp-cc-empty-icon">
            <Sprout size={32} strokeWidth={1.8} color={C.terracotta} />
          </div>
          <h3 className="pp-cc-empty-title">Just getting started</h3>
          <p className="pp-cc-empty-body">
            <strong style={{ fontWeight: 700, color: C.navyDark }}>
              {username}
            </strong>{" "}
            {currentLevelDef ? (
              <>
                is a <strong style={{ color: blurbAccent }}>{levelName}</strong>{" "}
                in the PetParrk community
              </>
            ) : (
              "is a new member of the PetParrk community"
            )}
            {monthsActive >= 1
              ? `, a member for ${monthsActive === 1 ? "1 month" : `${monthsActive} months`}.`
              : "."}
          </p>
          <p className="pp-cc-empty-body" style={{ marginTop: "6px" }}>
            Verified price contributions will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* The medal — chromatic panel with level-colored number */}
          <div className="pp-cc-medal-outer">
            <div
              className="pp-cc-medal"
              style={{
                background: `linear-gradient(160deg, ${bannerPalette.stops[1]} 0%, ${bannerPalette.stops[2]} 50%, ${bannerPalette.stops[3]} 100%)`,
              }}
            >
              {/* Verified checkmark badge — upper right */}
              <div
                className="pp-cc-verified"
                title="Each price reviewed by PetParrk admins"
              >
                <ShieldCheck size={18} strokeWidth={2.4} color={C.navyDark} />
              </div>

              <div
                className="pp-cc-number"
                style={{
                  color: numberColor,
                  textShadow: `0 4px 24px ${numberShadow}88`,
                }}
              >
                {verifiedCount}
              </div>
              <div className="pp-cc-number-label">
                VERIFIED {verifiedCount === 1 ? "PRICE" : "PRICES"}
              </div>

              <div className="pp-cc-verified-line">
                <ShieldCheck size={14} strokeWidth={2.2} color={C.gold} />
                <span>Each price reviewed by PetParrk admins</span>
              </div>
            </div>
          </div>

          {/* Credibility blurb */}
          <p className="pp-cc-blurb">{credibilityCopy}</p>
        </>
      )}
    </div>
  );
}
