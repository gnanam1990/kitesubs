import { ArrowUpRight } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-kite-border bg-kite-card/20 py-8 text-xs text-kite-fg/60 font-medium">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span>Powered by</span>
          <a
            href="https://gokite.ai"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-0.5 text-kite-primary hover:text-kite-fg font-semibold transition-colors"
          >
            Kite <ArrowUpRight className="w-3 h-3" />
          </a>
          <span className="opacity-45">•</span>
          <span>Chain ID 2366</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="https://agentid-seven.vercel.app" target="_blank" rel="noreferrer" className="hover:text-kite-fg transition-colors">AgentID</a>
          <a href="https://github.com/gnanam1990/kitepay" target="_blank" rel="noreferrer" className="hover:text-kite-fg transition-colors">KitePay</a>
          <a href="https://kitescan.ai" target="_blank" rel="noreferrer" className="hover:text-kite-fg transition-colors">KiteScan</a>
        </div>
      </div>
    </footer>
  );
}
