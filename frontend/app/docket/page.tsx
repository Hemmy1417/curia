"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Gavel } from "lucide-react";
import { useRounds } from "@/lib/hooks/useCuria";
import { formatGen, shortAddr } from "@/lib/utils";
import { StatusChip } from "@/components/Chips";
import { HowTo } from "@/components/HowTo";
import type { RoundStatus } from "@/lib/contracts/types";

const FILTERS: { key: "all" | RoundStatus; label: string }[] = [
  { key: "all",         label: "All" },
  { key: "OPEN",        label: "Open" },
  { key: "CLOSED",      label: "Awaiting ruling" },
  { key: "ADJUDICATED", label: "Ruled" },
];

export default function DocketPage() {
  const { data: rounds, isLoading } = useRounds(50);
  const [filter, setFilter] = useState<"all" | RoundStatus>("all");

  const list = (rounds ?? []).filter((r) => filter === "all" || r.status === filter);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 space-y-8">
      <div>
        <div className="eyebrow mb-1">Every round, public</div>
        <h1 className="display text-4xl text-ink">The docket</h1>
      </div>

      <HowTo
        id="docket"
        reference="CU-01"
        title="Reading the docket"
        items={[
          { label: "Open means enterable", body: "Any wallet except the sponsor may file one entry with evidence while a round is open — up to eight entries per round." },
          { label: "Closed means pending", body: "The sponsor has closed the docket; anyone may now trigger adjudication. One panel ruling settles the whole round." },
          { label: "Ruled means claimable", body: "Winners pull their tier's share directly from the round page. The sponsor reclaims any tier the court left unfilled." },
          { label: "Pools are pre-funded", body: "Every pool shown was deposited in GEN when the round was convened — there are no unfunded prizes on this docket." },
        ]}
      />

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="chip transition-colors"
            style={
              filter === f.key
                ? { background: "var(--primary)", color: "var(--on-primary)" }
                : { background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--hairline)" }
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="card p-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
        </div>
      ) : list.length === 0 ? (
        <div className="card p-12 text-center">
          <Gavel className="w-10 h-10 mx-auto mb-3 text-muted opacity-40" />
          <p className="text-soft">No rounds match this filter.</p>
          <Link href="/new" className="btn btn-primary mt-4 inline-flex">Convene the first round</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {list.map((r) => (
            <Link key={r.round_id} href={`/rounds/${r.round_id}`} className="card card-hover p-6 block">
              <div className="flex items-center justify-between mb-3">
                <StatusChip status={r.status} />
                <span className="mono text-xs text-muted">#{r.round_id}</span>
              </div>
              <div className="display text-xl text-ink mb-1">{r.title}</div>
              <p className="text-sm text-muted line-clamp-2 mb-4">{r.brief}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">
                  {r.entry_count}/{8} entries · {r.tiers_bps.length} tier{r.tiers_bps.length > 1 ? "s" : ""}
                </span>
                <span className="display" style={{ color: "var(--primary)" }}>
                  {formatGen(r.pool_wei)} GEN
                </span>
              </div>
              <div className="text-[11px] text-muted mt-2 mono">
                Sponsor {shortAddr(r.sponsor)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
