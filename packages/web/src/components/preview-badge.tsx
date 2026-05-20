import { Info } from "lucide-react";

interface Props {
  label?: string;
  tooltip?: string;
}

export function PreviewBadge({ label = "Preview", tooltip = "Coming in v0.2." }: Props) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase rounded-md bg-kite-muted border border-kite-border text-kite-fg/70 cursor-help"
      title={tooltip}
    >
      <Info className="w-3 h-3" />
      {label}
    </span>
  );
}
