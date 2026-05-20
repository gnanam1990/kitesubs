import { AddressDisplay } from "./address-display";
import { PreviewBadge } from "./preview-badge";
import { formatTokenAmount, periodLabel } from "../lib/format";
import type { Plan } from "../lib/api-client";

interface Props {
  plan: Plan;
  children?: React.ReactNode;
}

export function PlanCard({ plan, children }: Props) {
  const amount = formatTokenAmount(plan.amount_raw, plan.token_decimals);
  return (
    <div className="w-full max-w-xl mx-auto bg-kite-card border border-kite-border rounded-2xl shadow-sm p-6 sm:p-10">
      <div className="text-xs font-bold uppercase tracking-widest text-kite-fg/45 mb-3">
        Subscription
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-kite-fg mb-2 break-words">
        {plan.title}
      </h1>
      {plan.description && (
        <p className="text-sm text-kite-fg/70 mb-6 leading-relaxed whitespace-pre-wrap">
          {plan.description}
        </p>
      )}

      <div className="space-y-4 mb-6">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-kite-fg/45 font-semibold mb-1">
            Price
          </div>
          <div className="font-mono font-bold text-3xl sm:text-4xl tracking-tight text-kite-fg tabular-nums">
            {amount}
            <span className="text-kite-fg/40 text-xl sm:text-2xl ml-2 font-medium">
              {plan.token_symbol}
            </span>
            <span className="text-kite-fg/55 text-base sm:text-lg ml-2 font-medium">
              / {periodLabel(plan.period_days)}
            </span>
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-widest text-kite-fg/45 font-semibold mb-1">
            Merchant
          </div>
          <AddressDisplay address={plan.merchant_address} className="text-base" />
        </div>
      </div>

      {children}

      <div className="mt-6 pt-5 border-t border-kite-border/60 text-xs text-kite-fg/55 leading-relaxed">
        <div className="flex items-center gap-2 mb-1.5">
          <PreviewBadge
            label="Auto-renew"
            tooltip="Agent auto-renew via kpass + on-chain allowance contract lands in v0.2. v0.1 requires you to manually confirm each renewal."
          />
        </div>
        <p>
          v0.1 requires you to confirm each renewal from your wallet. Agent auto-renew via kpass
          is coming in v0.2.
        </p>
      </div>
    </div>
  );
}
