// Route-level loading UI for /vets.
// Deliberately renders the SAME skeleton grid as the page's own loading state,
// so the user sees one continuous skeleton instead of a spinner that flashes
// and then swaps to skeletons.
export default function Loading() {
  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 24px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))",
          gap: "20px",
          alignItems: "stretch",
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={`sk-${i}`}
            className="vets-sk"
            style={{ height: "260px" }}
          />
        ))}
      </div>
      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .vets-sk{background:linear-gradient(90deg,#F0ECE4 25%,#D9D2C2 50%,#F0ECE4 75%);background-size:200% 100%;animation:shimmer 1.8s infinite;border-radius:18px}
      `}</style>
    </div>
  );
}
