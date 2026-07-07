/**
 * Curia brand mark — a balance/pillar glyph in Material blue. The mark is
 * three columns under a pediment: the court. Rendered inline so it inherits
 * crisp scaling everywhere.
 */
export function CuriaMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="2" y="4" width="28" height="4" rx="2" fill="var(--primary)" />
      <rect x="5" y="11" width="4" height="13" rx="2" fill="var(--primary)" />
      <rect x="14" y="11" width="4" height="13" rx="2" fill="var(--primary)" opacity="0.75" />
      <rect x="23" y="11" width="4" height="13" rx="2" fill="var(--primary)" />
      <rect x="2" y="26" width="28" height="3" rx="1.5" fill="var(--primary)" opacity="0.55" />
    </svg>
  );
}

export function CuriaWordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const px = size === "sm" ? 24 : size === "lg" ? 40 : 30;
  const text = size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-xl";
  return (
    <span className="inline-flex items-center gap-2.5">
      <CuriaMark size={px} />
      <span className={`display ${text} tracking-tight`} style={{ color: "var(--ink)" }}>
        Curia
      </span>
    </span>
  );
}
