import type { RoundStatus, Tier } from "@/lib/contracts/types";

export function StatusChip({ status }: { status: RoundStatus }) {
  const cls =
    status === "OPEN" ? "chip-open" :
    status === "CLOSED" ? "chip-closed" : "chip-adjudicated";
  const label =
    status === "OPEN" ? "Open for entries" :
    status === "CLOSED" ? "Awaiting ruling" : "Ruled";
  return <span className={`chip ${cls}`}>{label}</span>;
}

const ORDINAL = ["1st", "2nd", "3rd", "4th", "5th"];

export function tierLabel(tier: Tier): string {
  if (tier === null) return "Pending";
  if (tier === "NO_AWARD") return "No award";
  return `${ORDINAL[tier] ?? `${tier + 1}th`} place`;
}

export function TierChip({ tier }: { tier: Tier }) {
  if (tier === null) return <span className="chip chip-neutral">Pending</span>;
  if (tier === "NO_AWARD") return <span className="chip chip-noaward">No award</span>;
  return <span className="chip chip-award">{tierLabel(tier)}</span>;
}
