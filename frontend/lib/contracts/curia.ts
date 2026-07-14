import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type {
  Round, Entry, Verdict, Assignment, ProtocolStats, TransactionReceipt, Tier,
} from "./types";
import { CONTRACT_ADDRESS } from "../config";

export type GenLayerClient = ReturnType<typeof createClient>;

/**
 * Typed wrapper around the deployed Curia contract. Sibling conventions:
 * - Every u256 is coerced to Number / decimal string HERE so no BigInt
 *   leaks into React Query keys or arithmetic.
 * - waitAndVerify rejects UNDETERMINED/CANCELED and surfaces UserError.
 * - Reads are defensive (null/[] on failure) so a fresh deploy renders
 *   empty states, not error boundaries.
 * - Writes return { receipt, txHash } so toasts can link the explorer.
 * - Writes sign through the wallet: the provider-backed client created by
 *   the wallet context (WalletProvider) is injected here and is the ONLY
 *   client writes go through — no bare client, no window.ethereum fallback.
 *   Reads fall back to a wallet-less RPC client so the app renders before
 *   a wallet is connected.
 */
class Curia {
  private client: GenLayerClient;          // reads: wallet client when connected, bare RPC otherwise
  private signer: GenLayerClient | null;   // writes: only the provider-backed wallet client
  private address: `0x${string}`;

  constructor(contractAddress: string = CONTRACT_ADDRESS, walletClient?: GenLayerClient | null) {
    this.address = contractAddress as `0x${string}`;
    this.signer = walletClient ?? null;
    this.client = walletClient ?? createClient({ chain: studionet });
  }

  // ── helpers ────────────────────────────────────────────────────────────

  private toObj(raw: any): Record<string, any> {
    if (!raw) return {};
    if (raw instanceof Map) return Object.fromEntries(raw.entries());
    if (typeof raw === "object") return raw;
    return {};
  }

  private async waitAndVerify(txHash: `0x${string}`): Promise<TransactionReceipt> {
    const receipt = (await this.client.waitForTransactionReceipt({
      hash: txHash as any,
      status: "ACCEPTED" as any,
      retries: 80,
      interval: 5000,
    })) as any;
    const status = String(receipt?.status ?? "").toUpperCase();
    const lr = receipt?.consensus_data?.leader_receipt;
    const r = Array.isArray(lr) ? lr[0] : lr;
    if (status.includes("UNDETERMINED") || status.includes("CANCELED")) {
      throw new Error("Validators could not reach consensus — try again");
    }
    if (r?.execution_result === "ERROR") {
      const stderr: string = r?.genvm_result?.stderr ?? "";
      const userErr = stderr.match(/UserError: (.+)/)?.[1];
      if (userErr) throw new Error(userErr);
      const lines = stderr.trim().split("\n").filter((l) => l.trim() && !l.startsWith("  "));
      const last = lines[lines.length - 1] || "";
      console.error("[Curia] contract execution error:", stderr);
      throw new Error(last.replace(/^.*?Error: /, "").slice(0, 200) || "Contract execution error");
    }
    return receipt as TransactionReceipt;
  }

  private async safeRead(functionName: string, args: any[] = []): Promise<any> {
    try {
      return await this.client.readContract({
        address: this.address,
        functionName,
        args,
      });
    } catch (err) {
      console.warn(`[Curia] safeRead "${functionName}" failed:`, err);
      return null;
    }
  }

  private async write(
    functionName: string,
    args: any[],
    value: bigint = BigInt(0),
  ): Promise<{ receipt: TransactionReceipt; txHash: string }> {
    // Signed writes MUST go through the wallet's provider-backed client —
    // fail loudly rather than fall back to an unsigned bare client.
    if (!this.signer) {
      throw new Error("Connect a wallet to sign this transaction");
    }
    const txHash = await this.signer.writeContract({
      address: this.address,
      functionName,
      args,
      value,
    });
    const receipt = await this.waitAndVerify(txHash);
    return { receipt, txHash: String(txHash) };
  }

  private normTier(t: any): Tier {
    if (t === null || t === undefined) return null;
    if (t === "NO_AWARD") return "NO_AWARD";
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }

  private normRound(raw: any): Round {
    const r = this.toObj(raw);
    return {
      ...r,
      round_id:     String(r.round_id ?? ""),
      sponsor:      String(r.sponsor ?? ""),
      tiers_bps:    Array.isArray(r.tiers_bps) ? r.tiers_bps.map(Number) : [],
      pool_wei:     String(r.pool_wei ?? "0"),
      entry_count:  Number(r.entry_count ?? 0),
      applicants:   Array.isArray(r.applicants) ? r.applicants.map(String) : [],
      residual_wei: String(r.residual_wei ?? "0"),
      residual_reclaimed: !!r.residual_reclaimed,
      created_seq:  Number(r.created_seq ?? 0),
      closed_seq:   Number(r.closed_seq ?? 0),
      adjudicated_seq: Number(r.adjudicated_seq ?? 0),
    } as Round;
  }

  private normEntry(raw: any): Entry {
    const e = this.toObj(raw);
    return {
      ...e,
      entry_id:      String(e.entry_id ?? ""),
      round_id:      String(e.round_id ?? ""),
      applicant:     String(e.applicant ?? ""),
      evidence_urls: Array.isArray(e.evidence_urls) ? e.evidence_urls.map(String) : [],
      tier:          this.normTier(e.tier),
      awarded_wei:   String(e.awarded_wei ?? "0"),
      claimed:       !!e.claimed,
      reasoning:     String(e.reasoning ?? ""),
      submitted_seq: Number(e.submitted_seq ?? 0),
    } as Entry;
  }

  private normVerdict(raw: any): Verdict {
    const v = this.toObj(raw);
    const assignments: Assignment[] = Array.isArray(v.assignments)
      ? v.assignments.map((a: any) => {
          const o = this.toObj(a);
          return {
            entry_id:    String(o.entry_id ?? ""),
            tier:        this.normTier(o.tier),
            awarded_wei: String(o.awarded_wei ?? "0"),
          };
        })
      : [];
    return {
      round_id:     String(v.round_id ?? ""),
      assignments,
      confidence:   Number(v.confidence ?? 0),
      summary:      String(v.summary ?? ""),
      awarded_wei:  String(v.awarded_wei ?? "0"),
      residual_wei: String(v.residual_wei ?? "0"),
      ruled_seq:    Number(v.ruled_seq ?? 0),
    };
  }

  // ── reads ──────────────────────────────────────────────────────────────

  async getProtocolStats(): Promise<ProtocolStats | null> {
    const raw = await this.safeRead("get_protocol_stats");
    if (!raw) return null;
    const s = this.toObj(raw);
    return {
      min_pool_wei:          String(s.min_pool_wei ?? "0"),
      max_tiers:             Number(s.max_tiers ?? 5),
      max_entries:           Number(s.max_entries ?? 8),
      max_urls:              Number(s.max_urls ?? 4),
      total_rounds:          Number(s.total_rounds ?? 0),
      total_entries:         Number(s.total_entries ?? 0),
      total_pool_volume_wei: String(s.total_pool_volume_wei ?? "0"),
      total_awarded_wei:     String(s.total_awarded_wei ?? "0"),
      total_reclaimed_wei:   String(s.total_reclaimed_wei ?? "0"),
    };
  }

  async getRound(id: string): Promise<Round | null> {
    const raw = await this.safeRead("get_round", [id]);
    return raw ? this.normRound(raw) : null;
  }

  async getRounds(limit = 50): Promise<Round[]> {
    const raw = await this.safeRead("get_rounds", [limit]);
    return Array.isArray(raw) ? raw.map((r) => this.normRound(r)) : [];
  }

  async getRoundsBySponsor(sponsor: string): Promise<Round[]> {
    const raw = await this.safeRead("get_rounds_by_sponsor", [sponsor]);
    return Array.isArray(raw) ? raw.map((r) => this.normRound(r)) : [];
  }

  async getEntry(entryId: string): Promise<Entry | null> {
    const raw = await this.safeRead("get_entry", [entryId]);
    return raw ? this.normEntry(raw) : null;
  }

  async getEntriesByRound(roundId: string): Promise<Entry[]> {
    const raw = await this.safeRead("get_entries_by_round", [roundId]);
    return Array.isArray(raw) ? raw.map((e) => this.normEntry(e)) : [];
  }

  async getEntriesByApplicant(applicant: string): Promise<Entry[]> {
    const raw = await this.safeRead("get_entries_by_applicant", [applicant]);
    return Array.isArray(raw) ? raw.map((e) => this.normEntry(e)) : [];
  }

  async getVerdict(roundId: string): Promise<Verdict | null> {
    const raw = await this.safeRead("get_verdict", [roundId]);
    if (!raw) return null;
    const v = this.normVerdict(raw);
    return v.round_id ? v : null;
  }

  // ── writes ─────────────────────────────────────────────────────────────

  async createRound(args: {
    title: string;
    brief: string;
    criteriaText: string;
    tiersBps: number[];
    poolWei: bigint;
  }) {
    return this.write(
      "create_round",
      [args.title, args.brief, args.criteriaText, args.tiersBps],
      args.poolWei,
    );
  }

  async submitEntry(args: { roundId: string; summary: string; evidenceUrls: string[] }) {
    return this.write("submit_entry", [args.roundId, args.summary, args.evidenceUrls]);
  }

  async closeEntries(roundId: string) {
    return this.write("close_entries", [roundId]);
  }

  async adjudicate(roundId: string) {
    return this.write("adjudicate", [roundId]);
  }

  async claimAward(entryId: string) {
    return this.write("claim_award", [entryId]);
  }

  async reclaimResidual(roundId: string) {
    return this.write("reclaim_residual", [roundId]);
  }
}

export default Curia;
