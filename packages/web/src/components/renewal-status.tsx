import { Clock, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { relativeToNow } from "../lib/format";
import type { Subscription } from "../lib/api-client";

interface Props {
  subscription: Subscription;
}

export function RenewalStatus({ subscription }: Props) {
  if (subscription.status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-kite-fg/55">
        <XCircle className="w-3.5 h-3.5" />
        Cancelled
      </span>
    );
  }

  const dueIn = subscription.next_renewal - Date.now();
  const isOverdue = dueIn < 0 || subscription.status === "overdue";

  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-kite-destructive">
        <AlertTriangle className="w-3.5 h-3.5" />
        Renewal overdue ({relativeToNow(subscription.next_renewal)})
      </span>
    );
  }

  const within24h = dueIn < 24 * 60 * 60 * 1000;
  if (within24h) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-kite-primary">
        <Clock className="w-3.5 h-3.5" />
        Due {relativeToNow(subscription.next_renewal)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-kite-accent">
      <CheckCircle2 className="w-3.5 h-3.5" />
      Active · next {relativeToNow(subscription.next_renewal)}
    </span>
  );
}
