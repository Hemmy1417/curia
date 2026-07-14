"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Curia from "../contracts/curia";
import { CONTRACT_ADDRESS, CONTRACT_CONFIGURED, explorerTxUrl } from "../config";
import { useWallet } from "../genlayer/wallet";
import { success, error } from "../toast";
import type { Round, Entry, Verdict, ProtocolStats } from "../contracts/types";

export function useCuriaContract(): Curia | null {
  // The wallet context owns the ONE provider-backed client (created with the
  // connected EIP-1193 provider). Injecting it here is what makes writes
  // signed by the user's wallet — the wrapper never builds its own signer.
  const { client } = useWallet();
  return useMemo(() => {
    if (!CONTRACT_CONFIGURED) return null;
    return new Curia(CONTRACT_ADDRESS, client);
  }, [client]);
}

// ── READ HOOKS ──────────────────────────────────────────────────────────────

// Studionet rate-limits the RPC at 500 requests/hour. Long stale time, no
// focus refetch, single retry — mutations invalidate what matters anyway.
const READ_DEFAULTS = {
  refetchOnWindowFocus: false,
  staleTime: 60_000,
  retry: 1,
} as const;

export function useProtocolStats() {
  const contract = useCuriaContract();
  return useQuery<ProtocolStats | null, Error>({
    queryKey: ["protocolStats"],
    queryFn: () => (contract ? contract.getProtocolStats() : Promise.resolve(null)),
    ...READ_DEFAULTS,
    enabled: !!contract,
  });
}

export function useRounds(limit = 50) {
  const contract = useCuriaContract();
  return useQuery<Round[], Error>({
    queryKey: ["rounds", limit],
    queryFn: () => (contract ? contract.getRounds(limit) : Promise.resolve([])),
    ...READ_DEFAULTS,
    enabled: !!contract,
  });
}

export function useRound(id: string | null) {
  const contract = useCuriaContract();
  return useQuery<Round | null, Error>({
    queryKey: ["round", id],
    queryFn: () => (contract && id ? contract.getRound(id) : Promise.resolve(null)),
    ...READ_DEFAULTS,
    enabled: !!contract && !!id,
  });
}

export function useEntriesByRound(roundId: string | null) {
  const contract = useCuriaContract();
  return useQuery<Entry[], Error>({
    queryKey: ["entriesByRound", roundId],
    queryFn: () =>
      contract && roundId ? contract.getEntriesByRound(roundId) : Promise.resolve([]),
    ...READ_DEFAULTS,
    enabled: !!contract && !!roundId,
  });
}

export function useVerdict(roundId: string | null, enabled = true) {
  const contract = useCuriaContract();
  return useQuery<Verdict | null, Error>({
    queryKey: ["verdict", roundId],
    queryFn: () =>
      contract && roundId ? contract.getVerdict(roundId) : Promise.resolve(null),
    ...READ_DEFAULTS,
    enabled: !!contract && !!roundId && enabled,
  });
}

export function useMyRounds() {
  const contract = useCuriaContract();
  const { address } = useWallet();
  return useQuery<Round[], Error>({
    queryKey: ["myRounds", address],
    queryFn: () =>
      contract && address ? contract.getRoundsBySponsor(address) : Promise.resolve([]),
    ...READ_DEFAULTS,
    enabled: !!contract && !!address,
  });
}

export function useMyEntries() {
  const contract = useCuriaContract();
  const { address } = useWallet();
  return useQuery<Entry[], Error>({
    queryKey: ["myEntries", address],
    queryFn: () =>
      contract && address ? contract.getEntriesByApplicant(address) : Promise.resolve([]),
    ...READ_DEFAULTS,
    enabled: !!contract && !!address,
  });
}

// ── WRITE HOOKS ─────────────────────────────────────────────────────────────

function useCuriaMutation<TArgs>(opts: {
  run: (contract: Curia, args: TArgs) => Promise<{ receipt: any; txHash: string }>;
  successTitle: (args: TArgs, data: any) => string;
  successDescription?: (args: TArgs, data: any) => string;
  errorTitle: string;
}) {
  const contract = useCuriaContract();
  const qc = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const mutation = useMutation({
    mutationFn: async (args: TArgs) => {
      if (!contract) throw new Error("Contract not configured");
      setIsPending(true);
      const out = await opts.run(contract, args);
      return { ...out, args };
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries();
      setIsPending(false);
      success(opts.successTitle(data.args, data), {
        description: opts.successDescription?.(data.args, data),
        explorerUrl: explorerTxUrl(data?.txHash),
      });
    },
    onError: (err: any) => {
      setIsPending(false);
      error(opts.errorTitle, { description: err?.message || "Please try again." });
    },
  });

  return { mutate: mutation.mutate, isPending };
}

export function useCreateRound() {
  const m = useCuriaMutation<{
    title: string; brief: string; criteriaText: string;
    tiersBps: number[]; poolWei: bigint;
  }>({
    run: (c, a) => c.createRound(a),
    successTitle: () => "Round convened",
    successDescription: () =>
      "The pool is deposited and the docket is open for entries.",
    errorTitle: "Round creation failed",
  });
  return { createRound: m.mutate, isCreating: m.isPending };
}

export function useSubmitEntry() {
  const m = useCuriaMutation<{ roundId: string; summary: string; evidenceUrls: string[] }>({
    run: (c, a) => c.submitEntry(a),
    successTitle: () => "Entry filed",
    successDescription: () => "Your case is on the docket awaiting the ruling.",
    errorTitle: "Entry failed",
  });
  return { submitEntry: m.mutate, isSubmitting: m.isPending };
}

export function useCloseEntries() {
  const m = useCuriaMutation<{ roundId: string }>({
    run: (c, a) => c.closeEntries(a.roundId),
    successTitle: () => "Docket closed",
    successDescription: () => "No further entries — the round can now be adjudicated.",
    errorTitle: "Close failed",
  });
  return { closeEntries: m.mutate, isClosing: m.isPending };
}

export function useAdjudicate() {
  const m = useCuriaMutation<{ roundId: string }>({
    run: (c, a) => c.adjudicate(a.roundId),
    successTitle: () => "The court has ruled",
    successDescription: () =>
      "The verdict is canonical — winners can claim their awards.",
    errorTitle: "Adjudication failed",
  });
  return { adjudicate: m.mutate, isAdjudicating: m.isPending };
}

export function useClaimAward() {
  const m = useCuriaMutation<{ entryId: string }>({
    run: (c, a) => c.claimAward(a.entryId),
    successTitle: () => "Award claimed",
    successDescription: () => "Your tier's share has been sent to your wallet.",
    errorTitle: "Claim failed",
  });
  return { claimAward: m.mutate, isClaiming: m.isPending };
}

export function useReclaimResidual() {
  const m = useCuriaMutation<{ roundId: string }>({
    run: (c, a) => c.reclaimResidual(a.roundId),
    successTitle: () => "Residual reclaimed",
    successDescription: () => "Unawarded funds returned to the sponsor.",
    errorTitle: "Reclaim failed",
  });
  return { reclaimResidual: m.mutate, isReclaiming: m.isPending };
}
