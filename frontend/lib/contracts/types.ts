// Shapes returned by the Curia contract, post-normalization: every u256 is
// a decimal string, every count a number — no BigInt past the wrapper.

export type RoundStatus = "OPEN" | "CLOSED" | "ADJUDICATED";
export type Tier = number | "NO_AWARD" | null;

export interface Round {
  round_id: string;
  sponsor: string;
  title: string;
  brief: string;
  criteria_text: string;
  tiers_bps: number[];
  pool_wei: string;
  status: RoundStatus;
  entry_count: number;
  applicants: string[];
  residual_wei: string;
  residual_reclaimed: boolean;
  created_seq: number;
  closed_seq: number;
  adjudicated_seq: number;
}

export interface Entry {
  entry_id: string;
  round_id: string;
  applicant: string;
  summary: string;
  evidence_urls: string[];
  tier: Tier;
  awarded_wei: string;
  claimed: boolean;
  reasoning: string;
  submitted_seq: number;
}

export interface Assignment {
  entry_id: string;
  tier: Tier;
  awarded_wei: string;
}

export interface Verdict {
  round_id: string;
  assignments: Assignment[];
  confidence: number;
  summary: string;
  awarded_wei: string;
  residual_wei: string;
  ruled_seq: number;
}

export interface ProtocolStats {
  min_pool_wei: string;
  max_tiers: number;
  max_entries: number;
  max_urls: number;
  total_rounds: number;
  total_entries: number;
  total_pool_volume_wei: string;
  total_awarded_wei: string;
  total_reclaimed_wei: string;
}

export type TransactionReceipt = Record<string, any>;
