"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Landmark, Plus, X } from "lucide-react";
import { useCreateRound } from "@/lib/hooks/useCuria";
import { useWallet } from "@/lib/genlayer/wallet";
import { parseGen, formatGen } from "@/lib/utils";
import { HowTo } from "@/components/HowTo";
import { error as toastError } from "@/lib/toast";

const ORDINAL = ["1st", "2nd", "3rd", "4th", "5th"];

export default function NewRoundPage() {
  const router = useRouter();
  const { isConnected } = useWallet();
  const { createRound, isCreating } = useCreateRound();

  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [criteria, setCriteria] = useState("");
  const [pool, setPool] = useState("1");
  const [tiers, setTiers] = useState<number[]>([50, 30, 20]);   // percents in the UI

  const tierSum = tiers.reduce((a, b) => a + b, 0);
  let poolWei = BigInt(0);
  try { poolWei = parseGen(pool || "0"); } catch { /* invalid until fixed */ }

  const setTier = (i: number, v: number) =>
    setTiers(tiers.map((t, j) => (j === i ? Math.max(0, Math.min(100, v)) : t)));

  const submit = () => {
    if (title.trim().length < 4)
      return toastError("Title too short", { description: "At least 4 characters." });
    if (brief.trim().length < 40)
      return toastError("Brief too short", { description: "Describe the round in at least 40 characters." });
    if (criteria.trim().length < 20)
      return toastError("Criteria too short", { description: "Tell the court how to judge — at least 20 characters." });
    if (tierSum !== 100)
      return toastError("Tiers must sum to 100%", { description: `Currently ${tierSum}%.` });
    for (let i = 0; i < tiers.length - 1; i++) {
      if (tiers[i] < tiers[i + 1])
        return toastError("Tiers must be non-ascending", { description: "A later prize cannot exceed an earlier one (ties are fine)." });
    }
    if (tiers.some((t) => t <= 0))
      return toastError("Empty tier", { description: "Every tier needs a positive share." });
    if (poolWei < BigInt("100000000000000000"))
      return toastError("Pool too small", { description: "Minimum pool is 0.1 GEN." });

    createRound(
      {
        title: title.trim(),
        brief: brief.trim(),
        criteriaText: criteria.trim(),
        tiersBps: tiers.map((t) => t * 100),
        poolWei,
      },
      { onSuccess: () => router.push("/docket") } as any,
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 space-y-8">
      <div>
        <div className="eyebrow mb-1">Deposit the pool, open the docket</div>
        <h1 className="display text-4xl text-ink">Convene a round</h1>
      </div>

      <HowTo
        id="new"
        reference="CU-02"
        title="Convening a court"
        items={[
          { label: "The deposit is the pool", body: "The GEN you send with this transaction IS the prize pool — held by the contract until the court rules. No promises, no invoices." },
          { label: "Criteria bind the court", body: "The judging criteria you write here are exactly what validators rank entries against. Be specific: vague criteria produce vague rulings." },
          { label: "Tiers are ranks", body: "First place takes the largest share; ties are allowed. The court may leave any tier unfilled if no entry merits it — you reclaim that residual." },
          { label: "Closing is yours", body: "There is no clock on GenLayer. The docket stays open until you close it, and anyone may convene the court once it's closed." },
        ]}
      />

      <div className="card p-7 space-y-5">
        <div>
          <label className="field-label">Round title</label>
          <input
            className="input" placeholder="Summer Builder Grants — Round 1"
            value={title} onChange={(e) => setTitle(e.target.value)} disabled={isCreating}
          />
        </div>

        <div>
          <label className="field-label">Brief (what is this round for?)</label>
          <textarea
            className="input"
            placeholder="What should applicants build or have built? What does the sponsor want to reward?"
            value={brief} onChange={(e) => setBrief(e.target.value)} disabled={isCreating}
          />
        </div>

        <div>
          <label className="field-label">Judging criteria (the court ranks against these)</label>
          <textarea
            className="input"
            placeholder="e.g. Working code in a public repository; clear GenLayer use case; evidence verifiable by fetch; originality over forks."
            value={criteria} onChange={(e) => setCriteria(e.target.value)} disabled={isCreating}
          />
        </div>

        <div>
          <label className="field-label">Prize pool (GEN — deposited now)</label>
          <input
            className="input mono" type="number" min="0.1" step="0.1"
            value={pool} onChange={(e) => setPool(e.target.value)} disabled={isCreating}
          />
        </div>

        <div>
          <label className="field-label">
            Prize tiers — {tierSum}% allocated{tierSum !== 100 && (
              <span style={{ color: "var(--danger)" }}> (must be 100%)</span>
            )}
          </label>
          <div className="space-y-2">
            {tiers.map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="chip chip-adjudicated w-20 justify-center shrink-0">
                  {ORDINAL[i] ?? `${i + 1}th`}
                </span>
                <input
                  className="input mono !w-28" type="number" min="1" max="100"
                  value={t} onChange={(e) => setTier(i, Number(e.target.value))} disabled={isCreating}
                />
                <span className="text-sm text-muted flex-1">
                  % · {poolWei > BigInt(0) ? `${formatGen((poolWei * BigInt(t * 100)) / BigInt(10000))} GEN` : "—"}
                </span>
                {tiers.length > 1 && (
                  <button
                    className="btn btn-ghost !h-9 !px-3"
                    onClick={() => setTiers(tiers.filter((_, j) => j !== i))}
                    disabled={isCreating}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {tiers.length < 5 && (
            <button
              className="btn btn-ghost !h-9 mt-2 text-xs"
              onClick={() => setTiers([...tiers, 0])}
              disabled={isCreating}
            >
              <Plus className="w-3.5 h-3.5" /> Add tier
            </button>
          )}
        </div>

        <button
          className="btn btn-primary w-full"
          disabled={!isConnected || isCreating}
          onClick={submit}
        >
          {isCreating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Depositing the pool…</>
          ) : (
            <><Landmark className="w-4 h-4" /> Deposit {pool || "0"} GEN &amp; convene</>
          )}
        </button>
        {!isConnected && (
          <p className="text-xs text-muted text-center">Connect a wallet to convene a round.</p>
        )}
      </div>
    </div>
  );
}
