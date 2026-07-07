"use client";

/**
 * The live backdrop — Material 3 expressive, light. Slow-drifting gradient
 * blobs in primary blue and container tones behind the whole app, plus a
 * faint dot grid. Calm, procedural, unmistakably 2026-Google. Reduced-motion
 * users get the static composition.
 */
export function Backdrop() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      {/* base wash */}
      <div className="absolute inset-0" style={{ background: "var(--canvas)" }} />

      {/* drifting blobs */}
      <div
        className="absolute rounded-full"
        style={{
          width: 620, height: 620, top: -220, left: -140,
          background: "radial-gradient(circle at 40% 40%, rgba(211,227,253,0.9), rgba(211,227,253,0) 70%)",
          animation: "blob-drift 26s ease-in-out infinite",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 520, height: 520, top: "30%", right: -180,
          background: "radial-gradient(circle at 60% 40%, rgba(26,115,232,0.14), rgba(26,115,232,0) 70%)",
          animation: "blob-drift 34s ease-in-out infinite reverse",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 460, height: 460, bottom: -180, left: "28%",
          background: "radial-gradient(circle at 50% 50%, rgba(196,238,208,0.55), rgba(196,238,208,0) 70%)",
          animation: "blob-drift 30s ease-in-out infinite",
          animationDelay: "-12s",
        }}
      />

      {/* faint dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(11,87,208,0.10) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.5), rgba(0,0,0,0.15) 60%, transparent)",
        }}
      />
    </div>
  );
}
