import { useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { usePayment } from "../lib/payment";
import { TxStatus, type TxState } from "./tx-status";
import { kiteMainnet, kiteTestnet } from "../lib/kite-chain";
import { subscribe, type Plan, type Subscription } from "../lib/api-client";

interface Props {
  plan: Plan;
  onSubscribed: (subscription: Subscription) => void;
}

export function SubscribeButton({ plan, onSubscribed }: Props) {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { pay } = usePayment();
  const [state, setState] = useState<TxState>({ kind: "idle" });

  const targetChainId = plan.network === "mainnet" ? kiteMainnet.id : kiteTestnet.id;
  const wrongNetwork = isConnected && chainId !== targetChainId;
  const selfSubscribe = isConnected && address && address.toLowerCase() === plan.merchant_address.toLowerCase();

  const handle = async () => {
    if (!address) return;
    setState({ kind: "awaiting_signature" });
    try {
      if (wrongNetwork) {
        await switchChainAsync({ chainId: targetChainId });
      }
      const hash = await pay(plan.token_address, plan.merchant_address, BigInt(plan.amount_raw));
      setState({ kind: "pending", hash });
      // Submit to backend; it will verify on-chain.
      const result = await subscribe({
        plan_id: plan.id,
        subscriber_address: address,
        first_tx_hash: hash,
      });
      setState({ kind: "success", hash, note: "Subscribed — first payment confirmed" });
      onSubscribed(result.subscription);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message.split("\n")[0]
          : typeof err === "string"
            ? err
            : "Unknown error";
      setState({ kind: "failed", error: message });
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col gap-3 items-stretch">
        <p className="text-xs text-kite-fg/60 text-center">Connect a wallet to subscribe</p>
        <div className="self-center">
          <ConnectButton label="Connect wallet" />
        </div>
      </div>
    );
  }

  if (selfSubscribe) {
    return (
      <div className="px-4 py-3 rounded-lg bg-kite-muted border border-kite-border text-sm text-kite-fg/70">
        This is your own plan — you can't subscribe to yourself.
      </div>
    );
  }

  if (!plan.active) {
    return (
      <div className="px-4 py-3 rounded-lg bg-kite-muted border border-kite-border text-sm text-kite-fg/70">
        This plan is paused by the merchant.
      </div>
    );
  }

  const busy = state.kind === "awaiting_signature" || state.kind === "pending";

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handle}
        disabled={busy}
        className="w-full h-12 rounded-xl bg-kite-primary text-kite-bg font-semibold text-sm tracking-tight shadow-sm hover:bg-kite-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
      >
        {wrongNetwork ? `Switch to ${plan.network}, then subscribe` : "Subscribe"}
      </button>
      <TxStatus state={state} network={plan.network} />
      {state.kind === "failed" && (
        <button
          onClick={() => setState({ kind: "idle" })}
          className="text-xs text-kite-fg/60 hover:text-kite-fg underline underline-offset-2 self-center"
        >
          Try again
        </button>
      )}
    </div>
  );
}
