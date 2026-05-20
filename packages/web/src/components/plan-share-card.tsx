import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Copy, Check, ExternalLink, Plus, Share2 } from "lucide-react";
import { formatTokenAmount, periodLabel } from "../lib/format";
import type { Plan } from "../lib/api-client";

interface Props {
  plan: Plan;
  url: string;
  onCreateAnother: () => void;
}

export function PlanShareCard({ plan, url, onCreateAnother }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error(err);
    }
  };

  const amount = formatTokenAmount(plan.amount_raw, plan.token_decimals);
  const tweet = `Subscribe to ${plan.title} — ${amount} ${plan.token_symbol} / ${periodLabel(plan.period_days)} via Kite: ${url}`;
  const tweetHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;

  return (
    <div className="w-full max-w-xl mx-auto bg-kite-card border border-kite-border rounded-2xl p-6 sm:p-10 shadow-sm">
      <div className="flex items-center gap-2 text-kite-accent mb-4">
        <CheckCircle2 className="w-6 h-6" />
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Your plan is live</h1>
      </div>

      <p className="text-sm text-kite-fg/70 mb-6">
        Share this URL with your audience. Anyone with a Kite wallet can subscribe.
      </p>

      <div className="flex items-stretch gap-2 mb-6">
        <input
          type="text"
          readOnly
          value={url}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          className="flex-1 min-w-0 bg-kite-bg border border-kite-border rounded-md px-3 py-2 text-xs font-mono text-kite-fg/85 truncate"
        />
        <button
          onClick={copy}
          className="flex items-center gap-1.5 px-3 rounded-md bg-kite-primary text-kite-bg text-xs font-semibold hover:bg-kite-primary/90 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" /> Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" /> Copy
            </>
          )}
        </button>
      </div>

      <div className="flex justify-center mb-6">
        <div className="p-3 bg-kite-bg rounded-xl border border-kite-border">
          <QRCodeSVG value={url} size={176} bgColor="#FEF8F0" fgColor="#1F1A14" level="M" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-kite-border bg-kite-bg hover:bg-kite-muted text-kite-fg text-sm font-semibold transition-colors"
        >
          Open plan <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <a
          href={tweetHref}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-kite-border bg-kite-bg hover:bg-kite-muted text-kite-fg text-sm font-semibold transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" /> Share
        </a>
        <button
          onClick={onCreateAnother}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-kite-border bg-kite-bg hover:bg-kite-muted text-kite-fg text-sm font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Another plan
        </button>
      </div>
    </div>
  );
}
