import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { shortAddress } from "../lib/format";

interface Props {
  address: string;
  className?: string;
}

export function AddressDisplay({ address, className = "" }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-sm ${className}`}>
      <span className="text-kite-fg/80">{shortAddress(address)}</span>
      <button
        onClick={copy}
        className="p-0.5 rounded text-kite-fg/40 hover:text-kite-fg hover:bg-kite-muted transition-colors"
        title="Copy"
      >
        {copied ? <Check className="w-3 h-3 text-kite-accent" /> : <Copy className="w-3 h-3" />}
      </button>
    </span>
  );
}
