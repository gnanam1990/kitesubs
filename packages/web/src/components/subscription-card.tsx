import { useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { usePayment } from "../lib/payment";
import { TxStatus, type TxState } from "./tx-status";
import { RenewalStatus } from "./renewal-status";
import { PaymentHistoryTable } from "./payment-history-table";
import { kiteMainnet, kiteTestnet } from "../lib/kite-chain";
import {
  cancelSubscription,
  renewSubscription,
  type Plan,
  type Subscription,
  type Payment,
} from "../lib/api-client";
import { formatTokenAmount, periodLabel } from "../lib/format";

interface Props {
  subscription: Subscription;
  plan: Plan;
  payments: Payment[];
  onChange: (updated: Subscription) => void;
}

export function SubscriptionCard({ subscription, plan, payments, onChange }: Props) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { pay } = usePayment();

  const [state, setState] = useState<TxState>({ kind: "idle" });
  const [cancelling, setCancelling] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const dueIn = subscription.next_renewal - Date.now();
  const canRenew =
    isConnected &&
    subscription.status !== "cancelled" &&
    dueIn < 24 * 60 * 60 * 1000;

  const targetChainId = plan.network === "mainnet" ? kiteMainnet.id : kiteTestnet.id;
  const wrongNetwork = isConnected && chainId !== targetChainId;

  const handleRenew = async () => {
    setState({ kind: "awaiting_signature" });
    try {
      if (wrongNetwork) {
        await switchChainAsync({ chainId: targetChainId });
      }
      const hash = await pay(plan.token_address, plan.merchant_address, BigInt(plan.amount_raw));
      setState({ kind: "pending", hash });
      const result = await renewSubscription(subscription.id, hash);
      setState({ kind: "success", hash, note: "Renewed" });
      onChange(result.subscription);
    } catch (err) {
      const message =
        err instanceof Error ? err.message.split("\n")[0] : "Unknown error";
      setState({ kind: "failed", error: message });
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Cancel this subscription? Future renewals will stop.")) return;
    setCancelling(true);
    try {
      const result = await cancelSubscription(subscription.id);
      onChange(result.subscription);
    } catch (err) {
      console.error(err);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="bg-kite-card border border-kite-border rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-bold tracking-tight text-kite-fg mb-1">
            {plan.title}
          </h3>
          <p className="text-sm font-mono text-kite-fg/70">
            {formatTokenAmount(plan.amount_raw, plan.token_decimals)} {plan.token_symbol}
            <span className="text-kite-fg/45 ml-1">/ {periodLabel(plan.period_days)}</span>
          </p>
        </div>
        <RenewalStatus subscription={subscription} />
      </div>

      {subscription.status !== "cancelled" && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {canRenew && (
            <button
              onClick={handleRenew}
              disabled={state.kind === "awaiting_signature" || state.kind === "pending"}
              className="h-9 px-4 rounded-md bg-kite-primary text-kite-bg text-xs font-semibold hover:bg-kite-primary/90 disabled:opacity-60 transition-colors"
            >
              {wrongNetwork ? `Switch to ${plan.network}, then renew` : "Renew now"}
            </button>
          )}
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="h-9 px-4 rounded-md border border-kite-border bg-kite-bg text-kite-fg text-xs font-semibold hover:bg-kite-muted disabled:opacity-60 transition-colors"
          >
            {cancelling ? "Cancelling…" : "Cancel"}
          </button>
        </div>
      )}

      <TxStatus state={state} network={plan.network} />

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 text-xs text-kite-fg/55 hover:text-kite-fg underline underline-offset-2"
      >
        {expanded ? "Hide payment history" : `Show payment history (${payments.length})`}
      </button>

      {expanded && (
        <div className="mt-3 border-t border-kite-border/60 pt-3">
          <PaymentHistoryTable payments={payments} plan={plan} />
        </div>
      )}
    </div>
  );
}
