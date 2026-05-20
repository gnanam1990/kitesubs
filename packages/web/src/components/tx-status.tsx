import { Loader2, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { explorerTxUrl, type KiteNetwork } from "../lib/kite-chain";

export type TxState =
  | { kind: "idle" }
  | { kind: "awaiting_signature" }
  | { kind: "pending"; hash: `0x${string}` }
  | { kind: "success"; hash: `0x${string}`; note?: string }
  | { kind: "failed"; error: string };

interface Props {
  state: TxState;
  network: KiteNetwork;
}

export function TxStatus({ state, network }: Props) {
  if (state.kind === "idle") return null;

  if (state.kind === "awaiting_signature") {
    return (
      <div className="flex items-center gap-2 text-sm text-kite-fg/70">
        <Loader2 className="w-4 h-4 animate-spin text-kite-primary" />
        Confirm in your wallet…
      </div>
    );
  }
  if (state.kind === "pending") {
    return (
      <div className="flex items-center gap-2 text-sm text-kite-fg/80">
        <Loader2 className="w-4 h-4 animate-spin text-kite-primary" />
        <span>Submitted, verifying on-chain</span>
        <a
          href={explorerTxUrl(state.hash, network)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono text-xs text-kite-primary hover:text-kite-fg"
        >
          {state.hash.slice(0, 8)}…{state.hash.slice(-6)} <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }
  if (state.kind === "success") {
    return (
      <div className="flex flex-col gap-2 px-4 py-3 rounded-lg bg-kite-accent/10 border border-kite-accent/30 text-kite-accent">
        <div className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="w-5 h-5" />
          {state.note ?? "Payment confirmed"}
        </div>
        <a
          href={explorerTxUrl(state.hash, network)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono text-xs text-kite-accent/90 hover:text-kite-accent underline underline-offset-2"
        >
          View on KiteScan <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1 px-4 py-3 rounded-lg bg-kite-destructive/10 border border-kite-destructive/30 text-kite-destructive">
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="w-5 h-5" />
        Transaction failed
      </div>
      <p className="text-xs font-mono break-all opacity-80">{state.error}</p>
    </div>
  );
}
