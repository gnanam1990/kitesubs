import { ExternalLink } from "lucide-react";
import { explorerTxUrl } from "../lib/kite-chain";
import { formatTokenAmount, relativeToNow } from "../lib/format";
import type { Payment, Plan } from "../lib/api-client";

interface Props {
  payments: Payment[];
  plan: Plan;
}

export function PaymentHistoryTable({ payments, plan }: Props) {
  if (payments.length === 0) {
    return (
      <div className="px-4 py-6 text-sm text-kite-fg/55 text-center">No payments yet.</div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-kite-muted/40">
          <tr>
            <Th>When</Th>
            <Th>Amount</Th>
            <Th>Status</Th>
            <Th>Transaction</Th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-t border-kite-border/40">
              <Td>
                <span className="font-mono text-xs text-kite-fg/75">
                  {p.paid_at ? relativeToNow(p.paid_at) : "—"}
                </span>
              </Td>
              <Td>
                <span className="font-mono font-semibold text-kite-fg tabular-nums">
                  {formatTokenAmount(p.amount_raw, plan.token_decimals)} {plan.token_symbol}
                </span>
              </Td>
              <Td>
                <StatusPill status={p.status} />
              </Td>
              <Td>
                {p.tx_hash ? (
                  <a
                    href={explorerTxUrl(p.tx_hash, plan.network)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs text-kite-primary hover:text-kite-fg"
                  >
                    {p.tx_hash.slice(0, 10)}…{p.tx_hash.slice(-6)} <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-kite-fg/30">—</span>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-3 py-2 text-[10px] uppercase tracking-widest font-bold text-kite-fg/55">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 align-middle">{children}</td>;
}

function StatusPill({ status }: { status: Payment["status"] }) {
  const cls =
    status === "confirmed"
      ? "bg-kite-accent/15 text-kite-accent"
      : status === "pending"
        ? "bg-kite-primary/15 text-kite-primary"
        : "bg-kite-destructive/15 text-kite-destructive";
  return (
    <span className={`inline-block text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded ${cls}`}>
      {status}
    </span>
  );
}
