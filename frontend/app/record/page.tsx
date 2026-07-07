"use client";

import Link from "next/link";
import { Loader2, Landmark } from "lucide-react";
import { useRounds } from "@/lib/hooks/useCuria";
import { formatGen, shortAddr } from "@/lib/utils";
import { HowTo } from "@/components/HowTo";

export default function RecordPage() {
  const { data: rounds, isLoading } = useRounds(50);
  const ruled = (rounds ?? []).filter((r) => r.status === "ADJUDICATED");

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 space-y-8">
      <div>
        <div className="eyebrow mb-1">Every ruling, public and final</div>
        <h1 className="display text-4xl text-ink">The record</h1>
      </div>

      <HowTo
        id="record"
        reference="CU-03"
        title="Reading the record"
        items={[
          { label: "Rulings are canonical", body: "Each round is settled by exactly one panel verdict, reached under GenLayer consensus. There is no appeal window and no second ruling." },
          { label: "Reasoning is published", body: "Every entry carries the court's per-entry reasoning — open a round to read why each entry landed its tier or NO_AWARD." },
          { label: "Money follows the record", body: "Awarded amounts are claimable exactly as recorded; residuals return to sponsors. The chain is the audit trail." },
        ]}
      />

      {isLoading ? (
        <div className="card p-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
        </div>
      ) : ruled.length === 0 ? (
        <div className="card p-12 text-center">
          <Landmark className="w-10 h-10 mx-auto mb-3 text-muted opacity-40" />
          <p className="text-soft">No rulings on the record yet.</p>
          <p className="text-xs text-muted mt-1">Verdicts appear here the moment the court rules.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ruled.map((r) => {
            const residual = BigInt(r.residual_wei || "0");
            const pool = BigInt(r.pool_wei || "0");
            const awarded = pool - residual;
            return (
              <Link key={r.round_id} href={`/rounds/${r.round_id}`} className="card card-hover p-6 block">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <span className="display text-lg text-ink">{r.title}</span>
                  <span className="mono text-xs text-muted">Round #{r.round_id}</span>
                </div>
                <div className="flex gap-5 text-sm flex-wrap">
                  <span className="text-muted">
                    Pool <span className="font-bold text-ink">{formatGen(r.pool_wei)} GEN</span>
                  </span>
                  <span className="text-muted">
                    Awarded <span className="font-bold" style={{ color: "var(--primary)" }}>
                      {formatGen(awarded.toString())} GEN
                    </span>
                  </span>
                  {residual > BigInt(0) && (
                    <span className="text-muted">
                      Residual <span className="font-bold text-ink">{formatGen(r.residual_wei)} GEN</span>
                    </span>
                  )}
                  <span className="text-muted mono ml-auto">{shortAddr(r.sponsor)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
