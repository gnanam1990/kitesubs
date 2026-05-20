import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Loader2 } from "lucide-react";
import {
  listSubscriptions,
  getSubscription,
  type Plan,
  type Payment,
  type Subscription,
} from "../lib/api-client";
import { SubscriptionCard } from "./subscription-card";

interface Loaded {
  subscription: Subscription;
  plan: Plan;
  payments: Payment[];
}

export function SubscriberDashboard() {
  const { isConnected, address } = useAccount();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Loaded[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const { subscriptions } = await listSubscriptions(address);
      const enriched = await Promise.all(
        subscriptions.map(async (s) => {
          const detail = await getSubscription(s.id);
          return detail;
        })
      );
      setItems(enriched);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load subscriptions");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    load();
  }, [load]);

  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto text-center px-4 py-16">
        <h2 className="text-xl font-bold tracking-tight text-kite-fg mb-2">
          Connect to see your subscriptions
        </h2>
        <p className="text-sm text-kite-fg/65 mb-6">
          Your subscriptions are keyed to your wallet address.
        </p>
        <div className="flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-kite-fg">
            My subscriptions
          </h1>
          <p className="text-xs text-kite-fg/60 mt-1 font-mono">
            {address}
          </p>
        </div>
        <button
          onClick={load}
          className="text-xs font-semibold text-kite-primary hover:text-kite-fg"
        >
          Refresh
        </button>
      </header>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-kite-fg/55">
          <Loader2 className="w-4 h-4 animate-spin text-kite-primary" /> Loading…
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-lg bg-kite-destructive/10 border border-kite-destructive/30 text-kite-destructive text-sm">
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="text-sm text-kite-fg/55 px-4 py-12 text-center bg-kite-card border border-kite-border rounded-2xl">
          You haven't subscribed to anything yet. Open a plan link to subscribe.
        </div>
      )}

      <div className="space-y-4">
        {items.map((item) => (
          <SubscriptionCard
            key={item.subscription.id}
            subscription={item.subscription}
            plan={item.plan}
            payments={item.payments}
            onChange={(updated) =>
              setItems((prev) =>
                prev.map((p) =>
                  p.subscription.id === updated.id ? { ...p, subscription: updated } : p
                )
              )
            }
          />
        ))}
      </div>
    </div>
  );
}
