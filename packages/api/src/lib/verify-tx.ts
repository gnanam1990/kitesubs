import { decodeEventLog, parseAbi } from "viem";
import { clientFor, type KiteNetwork } from "./chain.ts";

const TRANSFER_ABI = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

const NATIVE = (token: string) =>
  !token ||
  token === "" ||
  token.toLowerCase() === "0x0000000000000000000000000000000000000000";

export interface VerifyArgs {
  tx_hash: `0x${string}`;
  expected_to: string;
  expected_amount: bigint;
  token: string;
  network: KiteNetwork;
}

export async function verifyPayment(args: VerifyArgs): Promise<
  | { valid: true }
  | { valid: false; reason: string }
> {
  const client = clientFor(args.network);
  try {
    const receipt = await client.getTransactionReceipt({ hash: args.tx_hash });
    if (receipt.status !== "success") return { valid: false, reason: "transaction reverted" };

    if (NATIVE(args.token)) {
      const tx = await client.getTransaction({ hash: args.tx_hash });
      if (tx.to?.toLowerCase() !== args.expected_to.toLowerCase()) {
        return { valid: false, reason: "tx recipient does not match plan" };
      }
      if (tx.value < args.expected_amount) {
        return { valid: false, reason: "tx value is less than plan amount" };
      }
      return { valid: true };
    }

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== args.token.toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({
          abi: TRANSFER_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName !== "Transfer") continue;
        const { to, value } = decoded.args as { to: string; value: bigint };
        if (
          to.toLowerCase() === args.expected_to.toLowerCase() &&
          value >= args.expected_amount
        ) {
          return { valid: true };
        }
      } catch {
        // Log isn't a Transfer event — skip.
      }
    }
    return { valid: false, reason: "no matching ERC-20 Transfer event found in receipt" };
  } catch (err) {
    return {
      valid: false,
      reason: `RPC error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
