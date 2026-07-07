# Curia — the GenLayer allocation court

Curia turns grant rounds, bounty pools, hackathon prizes, and contributor
rewards into **payable allocation courts**. Sponsors deposit real GEN.
Applicants submit evidence. GenLayer validators produce a canonical
allocation verdict. Recipients claim GEN payouts.

**Contract:** `0xaE3a006506b5158983aA9869Ed5Ed5E3771C9123` (GenLayer Studionet)

> **Payout fix (July 2026).** Wallet payouts are sent as EVM external
> messages (an empty `@gl.evm.contract_interface` proxy executed by the
> contract's ghost account). The GenVM-call pattern used on the first
> deploy errored at finalization on plain wallets and stranded the value —
> found by checking a winner's explorer page, fixed, and re-proven with a
> real balance bump.

## How a round works

1. **Convene** — the sponsor deposits the full prize pool in GEN and fixes
   prize tiers (basis-point shares, non-ascending, summing to 10000; ties
   allowed). No unfunded rounds, ever.
2. **Enter** — up to 8 applicants file one entry each: a case summary plus
   1–4 public evidence URLs. Sponsors cannot enter their own round.
3. **Close** — the sponsor closes the docket. GenLayer has no block clock,
   so deadlines are procedural, not temporal.
4. **Adjudicate** — anyone triggers the court. Validators fetch every
   entry's evidence into a single comparative ruling that assigns each
   entry exactly one tier or NO_AWARD, with per-entry reasoning. One court,
   one canonical verdict — no appeals.
5. **Claim / reclaim** — winners pull their tier's share; the sponsor
   reclaims the residual of tiers the court declined to fill (a weak field
   doesn't oblige the court to award every prize).

## Why GenLayer

Splitting a pot between competing claims requires subjective judgment over
evidence — the one thing deterministic contracts cannot do, and a single
off-chain LLM judge cannot do credibly (whoever runs the judge controls the
money). GenLayer's optimistic consensus over an LLM ruling makes the
verdict canonical: validators independently evaluate the same evidence and
must converge before anything pays out.

## Trust boundaries (stated honestly)

- The court judges **text the validators fetch** — repositories, pages,
  documents. It cannot run code or watch demos.
- Rounds close by **sponsor action**, not by clock.
- The docket caps at **8 entries** — every entry's evidence must fit one
  comparative ruling.
- Fetched evidence is treated strictly as material under review; prompt
  guardrails reject instructions embedded in it.
- Malformed verdicts are sanitized on-chain: duplicate or out-of-range
  tiers demote to NO_AWARD — money only moves on a valid tier claim.

## Structure

```
├── contracts/curia.py     # the Intelligent Contract (single ruling per round)
├── tests/direct/          # 27 deterministic tests (stubbed GenLayer runtime)
└── frontend/              # Next.js 16 — Google Stitch / Material 3 light design
```

## Frontend

- **Docket** — every round with status filters
- **Round room** — tiers, criteria, evidence-preflighted entry form,
  close / adjudicate / claim / reclaim, verdict with per-entry reasoning
- **Chambers** — your sponsored rounds (residual flags) and filed entries
- **Record** — every ruling, public and final

Every write surfaces its transaction hash with a Studionet explorer link.

## Running locally

```bash
cd frontend
npm install
# .env.local: NEXT_PUBLIC_CONTRACT_ADDRESS + Studionet RPC vars (see .env.Example)
npm run dev -- -p 4600
```

Tests: `python -m pytest tests/direct -q` from the repo root.
