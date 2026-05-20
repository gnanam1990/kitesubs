import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Loader2, Plus } from "lucide-react";
import {
  listPlansByMerchant,
  listPlanSubscriptions,
  type Plan,
  type Subscription,
} from "../lib/api-client";
import { formatTokenAmount, periodLabel } from "../lib/format";
import { AddressDisplay } from "./address-display";

interface PlanWithSubs {
  plan: Plan;
  subscriptions: Subscription[];
}

interface Props {
  onNavigate: (path: string) => void;
}

export function MerchantDashboard({ onNavigate }: Props) {
  const { isConnected, address } = useAccount();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PlanWithSubs[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const { plans } = await listPlansByMerchant(address);
      const enriched = await Promise.all(
        plans.map(async (plan) => {
          const { subscriptions } = await listPlanSubscriptions(plan.id);
          return { plan, subscriptions };
        })
      );
      setItems(enriched);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load merchant data");
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
          Connect to see your merchant dashboard
        </h2>
        <p className="text-sm text-kite-fg/65 mb-6">
          Your plans are keyed to the connected wallet.
        </p>
        <div className="flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  const totals = computeTotals(items);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-kite-fg">
            Merchant dashboard
          </h1>
          <p className="text-xs text-kite-fg/60 mt-1 font-mono">{address}</p>
        </div>
        <button
          onClick={() => onNavigate("/create")}
          className="h-10 px-4 rounded-lg bg-kite-primary text-kite-bg font-semibold text-sm hover:bg-kite-primary/90 transition-colors inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> New plan
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <Stat label="Active subscribers" value={String(totals.activeCount)} />
        <Stat label="Total plans" value={String(items.length)} />
        <Stat
          label="MRR (USDC.e equivalent)"
          value={totals.mrrUsd ? `≈ ${totals.mrrUsd.toFixed(2)}` : "—"}
          hint="Sums active subs at their monthly equivalent. Mixed tokens are rough."
        />
      </div>

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

      {!loading && items.length === 0 && (
        <div className="text-sm text-kite-fg/55 px-4 py-12 text-center bg-kite-card border border-kite-border rounded-2xl">
          You haven't created any plans yet. Tap "New plan" to make one.
        </div>
      )}

      <div className="space-y-6">
        {items.map(({ plan, subscriptions }) => (
          <section
            key={plan.id}
            className="bg-kite-card border border-kite-border rounded-2xl p-5 shadow-sm"
          >
            <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h2 className="text-lg font-bold tracking-tight text-kite-fg truncate">
                  {plan.title}
                </h2>
                <p className="text-sm font-mono text-kite-fg/70">
                  {formatTokenAmount(plan.amount_raw, plan.token_decimals)} {plan.token_symbol}{" "}
                  <span className="text-kite-fg/45">/ {periodLabel(plan.period_days)}</span>
                </p>
              </div>
              <a
                href={`/p/${plan.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(`/p/${plan.id}`);
                }}
                className="text-xs font-semibold text-kite-primary hover:text-kite-fg"
              >
                View public plan →
              </a>
            </header>

            {subscriptions.length === 0 ? (
              <p className="text-xs text-kite-fg/55">No subscribers yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-kite-muted/40">
                    <tr>
                      <th className="text-left px-3 py-2 text-[10px] uppercase tracking-widest font-bold text-kite-fg/55">
                        Subscriber
                      </th>
                      <th className="text-left px-3 py-2 text-[10px] uppercase tracking-widest font-bold text-kite-fg/55">
                        Status
                      </th>
                      <th className="text-left px-3 py-2 text-[10px] uppercase tracking-widest font-bold text-kite-fg/55">
                        Next renewal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((s) => (
                      <tr key={s.id} className="border-t border-kite-border/40">
                        <td className="px-3 py-2">
                          <AddressDisplay address={s.subscriber_address} />
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded ${
                              s.status === "active"
                                ? "bg-kite-accent/15 text-kite-accent"
                                : s.status === "overdue"
                                  ? "bg-kite-destructive/15 text-kite-destructive"
                                  : "bg-kite-muted text-kite-fg/55"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-kite-fg/70">
                          {new Date(s.next_renewal).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-kite-card border border-kite-border rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-widest font-bold text-kite-fg/50 mb-1">
        {label}
      </div>
      <div className="text-2xl font-mono font-bold text-kite-fg tabular-nums">{value}</div>
      {hint && <p className="text-[11px] text-kite-fg/50 mt-1">{hint}</p>}
    </div>
  );
}

function computeTotals(items: PlanWithSubs[]): {
  activeCount: number;
  mrrUsd: number | null;
} {
  let activeCount = 0;
  let mrrUsd = 0;
  let hasUsdLike = false;
  for (const { plan, subscriptions } of items) {
    const active = subscriptions.filter((s) => s.status === "active");
    activeCount += active.length;
    const isUsdLike = plan.token_symbol === "USDC.e" || plan.token_symbol === "tUSDT";
    if (isUsdLike && active.length > 0) {
      hasUsdLike = true;
      let amountFloat = 0;
      try {
        amountFloat = Number(BigInt(plan.amount_raw)) / 10 ** plan.token_decimals;
      } catch {
        amountFloat = 0;
      }
      const monthlyFactor = 30 / plan.period_days;
      mrrUsd += amountFloat * monthlyFactor * active.length;
    }
  }
  return { activeCount, mrrUsd: hasUsdLike ? mrrUsd : null };
}
