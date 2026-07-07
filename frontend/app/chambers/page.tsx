"use client";

import Link from "next/link";
import { Loader2, Landmark, FileText } from "lucide-react";
import { useMyRounds, useMyEntries, useRounds } from "@/lib/hooks/useCuria";
import { useWallet } from "@/lib/genlayer/wallet";
import { formatGen } from "@/lib/utils";
import { StatusChip, TierChip } from "@/components/Chips";

export default function ChambersPage() {
  const { isConnected } = useWallet();
  const { data: myRounds, isLoading: loadingRounds } = useMyRounds();
  const { data: myEntries, isLoading: loadingEntries } = useMyEntries();
  const { data: allRounds } = useRounds(50);
  const roundTitle = new Map((allRounds ?? []).map((r) => [r.round_id, r.title]));
  const roundStatus = new Map((allRounds ?? []).map((r) => [r.round_id, r.status]));

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-24 text-center">
        <Landmark className="w-10 h-10 mx-auto mb-3 text-muted opacity-40" />
        <p className="text-soft">Connect a wallet to see your chambers.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 space-y-10">
      <div>
        <div className="eyebrow mb-1">Your rounds and entries</div>
        <h1 className="display text-4xl text-ink">Chambers</h1>
      </div>

      {/* Sponsored rounds */}
      <section className="space-y-4">
        <h2 className="display text-xl text-ink">Rounds you convened</h2>
        {loadingRounds ? (
          <div className="card p-10 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--primary)" }} />
          </div>
        ) : (myRounds ?? []).length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-soft">You haven't convened a round.</p>
            <Link href="/new" className="btn btn-tonal mt-4 inline-flex">Convene one</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {(myRounds ?? []).map((r) => (
              <Link key={r.round_id} href={`/rounds/${r.round_id}`} className="card card-hover p-5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="display text-base text-ink truncate">{r.title}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {r.entry_count} entries · pool {formatGen(r.pool_wei)} GEN
                    {!r.residual_reclaimed && BigInt(r.residual_wei || "0") > BigInt(0) &&
                      r.status !== "OPEN" && (
                      <span style={{ color: "var(--amber)" }}>
                        {" "}· residual {formatGen(r.residual_wei)} GEN unclaimed
                      </span>
                    )}
                  </div>
                </div>
                <StatusChip status={r.status} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Filed entries */}
      <section className="space-y-4">
        <h2 className="display text-xl text-ink">Entries you filed</h2>
        {loadingEntries ? (
          <div className="card p-10 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--primary)" }} />
          </div>
        ) : (myEntries ?? []).length === 0 ? (
          <div className="card p-10 text-center">
            <FileText className="w-9 h-9 mx-auto mb-3 text-muted opacity-40" />
            <p className="text-soft">No entries yet — find a round on the docket.</p>
            <Link href="/docket" className="btn btn-tonal mt-4 inline-flex">Browse the docket</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {(myEntries ?? []).map((e) => {
              const ruled = roundStatus.get(e.round_id) === "ADJUDICATED";
              return (
                <Link key={e.entry_id} href={`/rounds/${e.round_id}`} className="card card-hover p-5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="display text-base text-ink truncate">
                      {roundTitle.get(e.round_id) ?? `Round #${e.round_id}`}
                    </div>
                    <div className="text-xs text-muted mt-0.5 truncate">{e.summary}</div>
                    {ruled && typeof e.tier === "number" && (
                      <div className="text-xs mt-1 font-semibold" style={{ color: "var(--primary)" }}>
                        Award {formatGen(e.awarded_wei)} GEN{e.claimed ? " · claimed" : " · claimable"}
                      </div>
                    )}
                  </div>
                  <TierChip tier={ruled ? e.tier : null} />
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
