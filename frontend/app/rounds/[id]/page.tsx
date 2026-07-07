"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  Loader2, Gavel, Coins, FileText, Plus, X, AlertTriangle,
  CheckCircle2, ExternalLink, Landmark,
} from "lucide-react";
import {
  useRound, useEntriesByRound, useVerdict,
  useSubmitEntry, useCloseEntries, useAdjudicate,
  useClaimAward, useReclaimResidual,
} from "@/lib/hooks/useCuria";
import { useWallet } from "@/lib/genlayer/wallet";
import { formatGen, shortAddr } from "@/lib/utils";
import { classify } from "@/lib/evidence";
import { StatusChip, TierChip, tierLabel } from "@/components/Chips";
import { error as toastError } from "@/lib/toast";
import type { Entry, Round } from "@/lib/contracts/types";

const ORDINAL = ["1st", "2nd", "3rd", "4th", "5th"];

export default function RoundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: round, isLoading } = useRound(id);
  const { data: entries } = useEntriesByRound(id);
  const { data: verdict } = useVerdict(id, round?.status === "ADJUDICATED");
  const { address, isConnected } = useWallet();

  const { closeEntries, isClosing } = useCloseEntries();
  const { adjudicate, isAdjudicating } = useAdjudicate();
  const { reclaimResidual, isReclaiming } = useReclaimResidual();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-24 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }
  if (!round) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-24 text-center">
        <p className="text-soft">Round not found.</p>
        <Link href="/docket" className="btn btn-tonal mt-4 inline-flex">Back to the docket</Link>
      </div>
    );
  }

  const isSponsor = !!address && address.toLowerCase() === round.sponsor.toLowerCase();
  const hasEntered =
    !!address && round.applicants.some((a) => a.toLowerCase() === address.toLowerCase());
  const canEnter =
    isConnected && round.status === "OPEN" && !isSponsor && !hasEntered && round.entry_count < 8;
  const residual = BigInt(round.residual_wei || "0");
  const canReclaim =
    isSponsor && !round.residual_reclaimed && residual > BigInt(0) &&
    (round.status === "ADJUDICATED" || (round.status === "CLOSED" && round.entry_count === 0));

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 space-y-6">
      {/* Header */}
      <div className="card p-7">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <StatusChip status={round.status} />
          <span className="mono text-xs text-muted">Round #{round.round_id}</span>
        </div>
        <h1 className="display text-3xl text-ink mb-2">{round.title}</h1>
        <p className="text-sm text-soft leading-relaxed whitespace-pre-wrap mb-5">{round.brief}</p>

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-2xl p-4" style={{ background: "var(--surface-dim)" }}>
            <div className="eyebrow mb-1" style={{ color: "var(--muted)" }}>Prize pool</div>
            <div className="display text-xl" style={{ color: "var(--primary)" }}>
              {formatGen(round.pool_wei)} GEN
            </div>
          </div>
          <div className="rounded-2xl p-4" style={{ background: "var(--surface-dim)" }}>
            <div className="eyebrow mb-1" style={{ color: "var(--muted)" }}>Entries</div>
            <div className="display text-xl text-ink">{round.entry_count} / 8</div>
          </div>
          <div className="rounded-2xl p-4" style={{ background: "var(--surface-dim)" }}>
            <div className="eyebrow mb-1" style={{ color: "var(--muted)" }}>Sponsor</div>
            <div className="mono text-sm text-ink pt-1">{shortAddr(round.sponsor)}</div>
          </div>
        </div>

        {/* Tiers */}
        <div className="mt-5">
          <div className="eyebrow mb-2" style={{ color: "var(--muted)" }}>Prize tiers</div>
          <div className="flex gap-2 flex-wrap">
            {round.tiers_bps.map((bps, i) => (
              <span key={i} className="chip chip-adjudicated">
                {ORDINAL[i] ?? `${i + 1}th`} · {formatGen((BigInt(round.pool_wei) * BigInt(bps)) / BigInt(10000))} GEN
              </span>
            ))}
          </div>
        </div>

        {/* Criteria */}
        <div className="mt-5 rounded-2xl p-4" style={{ background: "var(--primary-soft)" }}>
          <div className="eyebrow mb-1">Judging criteria</div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--ink-soft)" }}>
            {round.criteria_text}
          </p>
        </div>

        {/* Sponsor / court actions */}
        <div className="flex gap-3 mt-6 flex-wrap">
          {isSponsor && round.status === "OPEN" && (
            <button
              className="btn btn-primary"
              disabled={isClosing}
              onClick={() => closeEntries({ roundId: round.round_id })}
            >
              {isClosing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />}
              Close the docket
            </button>
          )}
          {round.status === "CLOSED" && round.entry_count > 0 && (
            <button
              className="btn btn-primary"
              disabled={!isConnected || isAdjudicating}
              onClick={() => adjudicate({ roundId: round.round_id })}
            >
              {isAdjudicating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Landmark className="w-4 h-4" />}
              {isAdjudicating ? "The court is convening…" : "Convene the court"}
            </button>
          )}
          {canReclaim && (
            <button
              className="btn btn-tonal"
              disabled={isReclaiming}
              onClick={() => reclaimResidual({ roundId: round.round_id })}
            >
              {isReclaiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
              Reclaim residual ({formatGen(round.residual_wei)} GEN)
            </button>
          )}
        </div>
        {isAdjudicating && (
          <p className="text-xs text-muted mt-3">
            Validators are fetching every entry's evidence and reaching consensus
            on one ruling — this takes a minute or two. Leave the page open.
          </p>
        )}
      </div>

      {/* Verdict */}
      {round.status === "ADJUDICATED" && verdict && (
        <div className="card p-7" style={{ borderColor: "var(--primary)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Landmark className="w-5 h-5" style={{ color: "var(--primary)" }} />
            <h2 className="display text-xl text-ink">The verdict</h2>
            <span className="chip chip-adjudicated ml-auto">Confidence {verdict.confidence}/100</span>
          </div>
          <p className="text-sm text-soft leading-relaxed mb-4">{verdict.summary}</p>
          <div className="flex gap-4 text-sm flex-wrap">
            <span className="text-muted">
              Awarded: <span className="font-bold text-ink">{formatGen(verdict.awarded_wei)} GEN</span>
            </span>
            <span className="text-muted">
              Residual: <span className="font-bold text-ink">{formatGen(verdict.residual_wei)} GEN</span>
            </span>
          </div>
        </div>
      )}

      {/* Entries */}
      <section className="space-y-4">
        <h2 className="display text-2xl text-ink">
          Entries {round.entry_count > 0 && <span className="text-muted text-lg">({round.entry_count})</span>}
        </h2>
        {(entries ?? []).length === 0 ? (
          <div className="card p-10 text-center">
            <FileText className="w-9 h-9 mx-auto mb-3 text-muted opacity-40" />
            <p className="text-soft">No entries filed yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(entries ?? []).map((e) => (
              <EntryCard key={e.entry_id} entry={e} round={round} me={address} />
            ))}
          </div>
        )}
      </section>

      {/* Entry form */}
      {canEnter && <EntryForm roundId={round.round_id} />}
      {isConnected && round.status === "OPEN" && hasEntered && (
        <p className="text-sm text-muted text-center">
          Your entry is on the docket — one entry per applicant per round.
        </p>
      )}
    </div>
  );
}

function EntryCard({ entry, round, me }: { entry: Entry; round: Round; me: string | null }) {
  const { claimAward, isClaiming } = useClaimAward();
  const mine = !!me && me.toLowerCase() === entry.applicant.toLowerCase();
  const canClaim =
    mine && round.status === "ADJUDICATED" &&
    typeof entry.tier === "number" && !entry.claimed;

  return (
    <div className="card p-6" style={mine ? { borderColor: "var(--primary)" } : undefined}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <TierChip tier={round.status === "ADJUDICATED" ? entry.tier : null} />
        {entry.claimed && <span className="chip chip-open"><CheckCircle2 className="w-3 h-3" /> Claimed</span>}
        {mine && <span className="chip chip-neutral">Your entry</span>}
        <span className="mono text-xs text-muted ml-auto">
          Entry {entry.entry_id} · {shortAddr(entry.applicant)}
        </span>
      </div>

      <p className="text-sm text-soft leading-relaxed whitespace-pre-wrap mb-3">{entry.summary}</p>

      <div className="flex gap-2 flex-wrap mb-1">
        {entry.evidence_urls.map((u, i) => (
          <a
            key={i}
            href={u}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
            style={{ color: "var(--primary)" }}
          >
            <ExternalLink className="w-3 h-3" /> Evidence {i + 1}
          </a>
        ))}
      </div>

      {round.status === "ADJUDICATED" && entry.reasoning && (
        <div className="rounded-2xl p-4 mt-3" style={{ background: "var(--surface-dim)" }}>
          <div className="eyebrow mb-1" style={{ color: "var(--muted)" }}>Court reasoning</div>
          <p className="text-sm text-soft leading-relaxed">{entry.reasoning}</p>
        </div>
      )}

      {typeof entry.tier === "number" && round.status === "ADJUDICATED" && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted">
            {tierLabel(entry.tier)} award:{" "}
            <span className="font-bold text-ink">{formatGen(entry.awarded_wei)} GEN</span>
          </span>
          {canClaim && (
            <button
              className="btn btn-primary !h-10"
              disabled={isClaiming}
              onClick={() => claimAward({ entryId: entry.entry_id })}
            >
              {isClaiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
              Claim {formatGen(entry.awarded_wei)} GEN
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function EntryForm({ roundId }: { roundId: string }) {
  const { submitEntry, isSubmitting } = useSubmitEntry();
  const [summary, setSummary] = useState("");
  const [urls, setUrls] = useState<string[]>([""]);

  const verdicts = urls.map((u) => (u.trim() ? classify(u) : null));
  const hasBlocked = verdicts.some((v) => v?.status === "block");

  const submit = () => {
    const clean = urls.map((u) => u.trim()).filter(Boolean);
    if (summary.trim().length < 40)
      return toastError("Summary too short", { description: "State your case in at least 40 characters." });
    if (clean.length === 0)
      return toastError("Evidence required", { description: "Cite at least one public URL the court can fetch." });
    if (hasBlocked)
      return toastError("Inadmissible evidence", { description: "Replace the flagged URL — the court cannot read that host." });
    submitEntry({ roundId, summary: summary.trim(), evidenceUrls: clean });
  };

  return (
    <div className="card p-7">
      <h2 className="display text-xl text-ink mb-1">File your entry</h2>
      <p className="text-sm text-muted mb-5">
        One entry per wallet. The court reads your summary and fetches every
        evidence URL — cite pages that load without JavaScript (repositories
        and Gists work best).
      </p>

      <div className="space-y-4">
        <div>
          <label className="field-label">Case summary (min 40 chars)</label>
          <textarea
            className="input"
            placeholder="What did you build or contribute, and why does it merit a tier under the sponsor's criteria?"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="field-label">Evidence URLs (1–4)</label>
          <div className="space-y-2">
            {urls.map((u, i) => (
              <div key={i}>
                <div className="flex gap-2">
                  <input
                    className="input"
                    placeholder="https://github.com/you/project"
                    value={u}
                    onChange={(e) => setUrls(urls.map((x, j) => (j === i ? e.target.value : x)))}
                    disabled={isSubmitting}
                  />
                  {urls.length > 1 && (
                    <button
                      className="btn btn-ghost !h-11 !px-3"
                      onClick={() => setUrls(urls.filter((_, j) => j !== i))}
                      disabled={isSubmitting}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {verdicts[i] && verdicts[i]!.status !== "ok" && (
                  <p
                    className="flex items-start gap-1.5 text-xs mt-1.5 leading-relaxed"
                    style={{ color: verdicts[i]!.status === "block" ? "var(--danger)" : "var(--amber)" }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {verdicts[i]!.note}
                  </p>
                )}
              </div>
            ))}
          </div>
          {urls.length < 4 && (
            <button
              className="btn btn-ghost !h-9 mt-2 text-xs"
              onClick={() => setUrls([...urls, ""])}
              disabled={isSubmitting}
            >
              <Plus className="w-3.5 h-3.5" /> Add URL
            </button>
          )}
        </div>

        <button className="btn btn-primary w-full" disabled={isSubmitting} onClick={submit}>
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Filing your entry…</>
          ) : (
            <><FileText className="w-4 h-4" /> File entry</>
          )}
        </button>
      </div>
    </div>
  );
}
