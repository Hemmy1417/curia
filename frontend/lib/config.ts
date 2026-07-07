import { studionet } from "genlayer-js/chains";

// Contract + chain wiring. All NEXT_PUBLIC_* values bake at build time.
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "").trim();
export const CHAIN_RPC   = (process.env.NEXT_PUBLIC_GENLAYER_RPC_URL ?? "https://studio.genlayer.com/api").trim();
export const CHAIN_ID    = Number(process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID ?? 61999);
export const CHAIN_NAME  = process.env.NEXT_PUBLIC_GENLAYER_CHAIN_NAME ?? "GenLayer Studio";
export const CHAIN_HEX   = `0x${CHAIN_ID.toString(16)}`;

export const CHAIN = studionet;

export const CONTRACT_CONFIGURED = CONTRACT_ADDRESS.length === 42;

export const EXPLORER_URL = (process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL ?? "https://explorer-studio.genlayer.com").trim();

export function explorerTxUrl(hash: string): string {
  if (!hash) return "";
  return `${EXPLORER_URL.replace(/\/$/, "")}/tx/${hash}`;
}

export function explorerAddressUrl(addr: string): string {
  if (!addr) return "";
  return `${EXPLORER_URL.replace(/\/$/, "")}/address/${addr}`;
}
