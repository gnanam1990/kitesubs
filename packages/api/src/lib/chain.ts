import { createPublicClient, http, defineChain } from "viem";

export const kiteMainnet = defineChain({
  id: 2366,
  name: "Kite Mainnet",
  nativeCurrency: { name: "Kite", symbol: "KITE", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.gokite.ai"] } },
});

export const kiteTestnet = defineChain({
  id: 2368,
  name: "Kite Testnet",
  nativeCurrency: { name: "Kite", symbol: "KITE", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc-testnet.gokite.ai"] } },
});

const mainnetClient = createPublicClient({ chain: kiteMainnet, transport: http() });
const testnetClient = createPublicClient({ chain: kiteTestnet, transport: http() });

export type KiteNetwork = "mainnet" | "testnet";

export function clientFor(network: KiteNetwork) {
  return network === "testnet" ? testnetClient : mainnetClient;
}
