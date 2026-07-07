"use client";

import Link from "next/link";
import { Scale, Coins, FileCheck, Landmark, ArrowRight } from "lucide-react";
import { useProtocolStats, useRounds } from "@/lib/hooks/useCuria";
import { formatGen } from "@/lib/utils";
import { StatusChip } from "@/components/Chips";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-6 py-5">
      <div className="eyebrow mb-1" style={{ color: "var(--muted)" }}>{label}</div>
      <div className="display text-2xl text-ink">{value}</div>
    </div>
  );
}

export default function HomePage() {
  const { data: stats } = useProtocolStats();
  const { data: rounds } = useRounds(6);
  const open = (rounds ?? []).filter((r) => r.status === "OPEN");

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 space-y-12">
      {/* Hero */}
      <section className="text-center pt-8 pb-4">
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 text-xs font-bold"
          style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
        >
          <Scale className="w-3.5 h-3.5" />
          GENLAYER · STUDIONET
        </div>
        <h1 className="display text-5xl sm:text-6xl leading-[1.05] text-ink max-w-3xl mx-auto">
          The allocation court for prize pools
        </h1>
        <p className="text-lg text-soft max-w-2xl mx-auto mt-5 leading-relaxed">
          Grant rounds, bounty pools, hackathon prizes, contributor rewards —
          convened as payable courts. Sponsors deposit real GEN. Applicants
          file evidence. GenLayer validators produce one canonical verdict.
          Winners claim.
        </p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <Link href="/docket" className="btn btn-primary">
            Browse the docket <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/new" className="btn btn-tonal">Convene a round</Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Rounds convened" value={String(stats?.total_rounds ?? 0)} />
        <Stat label="Entries filed" value={String(stats?.total_entries ?? 0)} />
        <Stat label="Pools deposited" value={`${formatGen(stats?.total_pool_volume_wei ?? "0")} GEN`} />
        <Stat label="Awards claimed" value={`${formatGen(stats?.total_awarded_wei ?? "0")} GEN`} />
      </section>

      {/* Open rounds */}
      {open.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="display text-2xl text-ink">Now on the docket</h2>
            <Link href="/docket" className="text-sm font-semibold" style={{ color: "var(--primary)" }}>
              View all →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {open.slice(0, 3).map((r) => (
              <Link key={r.round_id} href={`/rounds/${r.round_id}`} className="card card-hover p-6 block">
                <div className="flex items-center justify-between mb-3">
                  <StatusChip status={r.status} />
                  <span className="mono text-xs text-muted">#{r.round_id}</span>
                </div>
                <div className="display text-lg text-ink mb-1">{r.title}</div>
                <p className="text-sm text-muted line-clamp-2 mb-4">{r.brief}</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted">Prize pool</span>
                  <span className="display text-lg" style={{ color: "var(--primary)" }}>
                    {formatGen(r.pool_wei)} GEN
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="grid md:grid-cols-3 gap-4">
        {[
          {
            icon: Coins,
            title: "The pool is real",
            body: "No unfunded promises: the full prize pool is deposited in GEN the moment a round is convened, and tier shares are fixed on-chain before the first entry.",
          },
          {
            icon: FileCheck,
            title: "Evidence is the case",
            body: "Applicants file a summary plus public evidence — repositories, pages, documents. The court fetches and reads every citation before it ranks anything.",
          },
          {
            icon: Landmark,
            title: "One canonical verdict",
            body: "GenLayer validators reach consensus on a single ruling: each entry lands a prize tier or NO_AWARD, with per-entry reasoning published to the record.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="card p-6">
            <span
              className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
            >
              <Icon className="w-5 h-5" />
            </span>
            <div className="display text-lg text-ink mb-2">{title}</div>
            <p className="text-sm text-soft leading-relaxed">{body}</p>
          </div>
        ))}
      </section>

      {/* Honest boundaries */}
      <section className="card-tonal p-7">
        <div className="eyebrow mb-2">What the court can — and cannot — judge</div>
        <div className="grid md:grid-cols-3 gap-5 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          <p>
            <span className="font-bold text-ink">Text, not demos.</span>{" "}
            Validators read fetched pages and repositories. They cannot run
            your code or watch a video — cite what can be read.
          </p>
          <p>
            <span className="font-bold text-ink">Action, not clocks.</span>{" "}
            GenLayer exposes no block time, so rounds close when the sponsor
            closes them — deadlines are procedural, not temporal.
          </p>
          <p>
            <span className="font-bold text-ink">Eight entries, one ruling.</span>{" "}
            Every entry's evidence must fit a single comparative ruling, so
            the docket caps at eight. Small courts, sharp verdicts.
          </p>
        </div>
      </section>
    </div>
  );
}
