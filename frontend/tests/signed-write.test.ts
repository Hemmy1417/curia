/**
 * Repository-level proof that Curia contract writes are SIGNED by the
 * connected wallet.
 *
 * The wallet context (lib/genlayer/wallet.tsx) creates ONE provider-backed
 * genlayer-js client:
 *
 *   createClient({ chain: CHAIN, account: addr, provider })
 *
 * and useCuriaContract (lib/hooks/useCuria.ts) injects that client into the
 * Curia wrapper. These tests pin the three properties that make writes
 * wallet-signed:
 *
 *   1. The wrapper routes every write through the INJECTED client — it never
 *      builds its own signer.
 *   2. With no connected wallet the wrapper refuses to write — there is no
 *      silent unsigned fallback.
 *   3. A client created exactly the way the wallet context creates it sends
 *      the signing request (eth_sendTransaction) through the injected
 *      EIP-1193 provider — i.e. the user's wallet signs the transaction.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import Curia from "../lib/contracts/curia";

const CONTRACT = ("0x" + "ab".repeat(20)) as `0x${string}`;
const ACCOUNT = ("0x" + "12".repeat(20)) as `0x${string}`;
const TX_HASH = ("0x" + "cd".repeat(32)) as `0x${string}`;

// Keep the suite fully offline: genlayer-js fires sim_getConsensusContract
// over fetch when a client is created; answer it locally.
const CONSENSUS_MAIN = {
  address: ("0x" + "01".repeat(20)) as `0x${string}`,
  abi: [
    {
      type: "function",
      name: "addTransaction",
      stateMutability: "nonpayable",
      inputs: [
        { name: "sender", type: "address" },
        { name: "recipient", type: "address" },
        { name: "numOfInitialValidators", type: "uint256" },
        { name: "maxRotations", type: "uint256" },
        { name: "txData", type: "bytes" },
      ],
      outputs: [],
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: CONSENSUS_MAIN }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
});

function acceptedReceipt() {
  return {
    status: "ACCEPTED",
    consensus_data: { leader_receipt: [{ execution_result: "SUCCESS" }] },
  };
}

describe("signed writes via the wallet-context client", () => {
  it("routes writes through the injected provider-backed client", async () => {
    const walletClient: any = {
      writeContract: vi.fn().mockResolvedValue(TX_HASH),
      waitForTransactionReceipt: vi.fn().mockResolvedValue(acceptedReceipt()),
      readContract: vi.fn(),
    };
    const curia = new Curia(CONTRACT, walletClient);

    const { txHash } = await curia.closeEntries("1");

    expect(txHash).toBe(TX_HASH);
    expect(walletClient.writeContract).toHaveBeenCalledTimes(1);
    expect(walletClient.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: CONTRACT,
        functionName: "close_entries",
        args: ["1"],
      }),
    );
    expect(walletClient.waitForTransactionReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ hash: TX_HASH }),
    );
  });

  it("passes the payable value through the injected client", async () => {
    const walletClient: any = {
      writeContract: vi.fn().mockResolvedValue(TX_HASH),
      waitForTransactionReceipt: vi.fn().mockResolvedValue(acceptedReceipt()),
      readContract: vi.fn(),
    };
    const curia = new Curia(CONTRACT, walletClient);
    const poolWei = 10n ** 18n;

    await curia.createRound({
      title: "Test round",
      brief: "A test brief long enough to pass validation.",
      criteriaText: "Criteria long enough to pass validation.",
      tiersBps: [7000, 3000],
      poolWei,
    });

    expect(walletClient.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "create_round", value: poolWei }),
    );
  });

  it("refuses to write when no wallet client is connected (no unsigned fallback)", async () => {
    const curia = new Curia(CONTRACT); // read-only: bare RPC client, no signer
    await expect(curia.closeEntries("1")).rejects.toThrow(/connect a wallet/i);
  });

  it("sends the signing request through the injected EIP-1193 provider", async () => {
    // A minimal EIP-1193 wallet double that records every request it signs.
    const calls: Array<{ method: string; params: any[] }> = [];
    const provider = {
      request: async ({ method, params = [] }: { method: string; params?: any[] }) => {
        calls.push({ method, params });
        switch (method) {
          case "eth_chainId":
            return `0x${studionet.id.toString(16)}`;
          case "eth_getTransactionCount":
            return "0x0";
          case "eth_estimateGas":
            return "0x30d40";
          case "eth_gasPrice":
            return "0x1";
          case "eth_sendTransaction":
            return TX_HASH; // the wallet signs and broadcasts
          default:
            return "0x1";
        }
      },
    };

    // EXACTLY how lib/genlayer/wallet.tsx builds the connected client.
    const client: any = createClient({ chain: studionet, account: ACCOUNT, provider });
    // Deterministically pin the consensus contract (normally resolved via the
    // stubbed sim_getConsensusContract fetch above, but that runs async).
    client.chain.consensusMainContract = CONSENSUS_MAIN;

    const txHash = await client.writeContract({
      address: CONTRACT,
      functionName: "close_entries",
      args: ["1"],
      value: 0n,
    });

    expect(txHash).toBe(TX_HASH);
    const sendTx = calls.find((c) => c.method === "eth_sendTransaction");
    expect(sendTx, "eth_sendTransaction must be signed by the wallet provider").toBeDefined();
    expect(String(sendTx!.params[0].from).toLowerCase()).toBe(ACCOUNT.toLowerCase());
  });
});
