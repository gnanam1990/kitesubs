import { defineChain, type Address } from "viem";

export const kiteMainnet = defineChain({
  id: 2366,
  name: "Kite Mainnet",
  nativeCurrency: { name: "Kite", symbol: "KITE", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.gokite.ai"] } },
  blockExplorers: { default: { name: "KiteScan", url: "https://kitescan.ai" } },
});

export const kiteTestnet = defineChain({
  id: 2368,
  name: "Kite Testnet",
  nativeCurrency: { name: "Kite", symbol: "KITE", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc-testnet.gokite.ai"] } },
  blockExplorers: { default: { name: "KiteScan Testnet", url: "https://testnet.kitescan.ai" } },
});

export type KiteNetwork = "mainnet" | "testnet";

export const MAINNET_USDC_ADDRESS = "0x7aB6f3ed87C42eF0aDb67Ed95090f8bF5240149e" as Address;
export const MAINNET_USDC_DECIMALS = 6;
export const TESTNET_USDT_ADDRESS = "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63" as Address;
export const TESTNET_USDT_DECIMALS = 18;

export function explorerBase(network: KiteNetwork): string {
  return network === "testnet" ? "https://testnet.kitescan.ai" : "https://kitescan.ai";
}

export function explorerTxUrl(hash: string, network: KiteNetwork = "mainnet"): string {
  return `${explorerBase(network)}/tx/${hash}`;
}

export function isValidAddress(s: string): s is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}
