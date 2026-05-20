import { Globe } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { KiteLogo } from "./kite-logo";
import type { KiteNetwork } from "../lib/api-client";

interface Props {
  network: KiteNetwork;
  onToggleNetwork: () => void;
  onNavigate: (path: string) => void;
  currentPath: string;
}

export function SiteHeader({ network, onToggleNetwork, onNavigate, currentPath }: Props) {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-kite-border bg-kite-bg/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate("/");
          }}
          className="flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <KiteLogo />
          <span className="hidden sm:inline-block h-4 w-px bg-kite-border" />
          <span className="hidden sm:inline-block font-sans text-xs font-bold tracking-widest text-kite-primary uppercase">
            Subs
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-1">
          <NavLink href="/dashboard/subscriber" label="My subscriptions" current={currentPath} onNavigate={onNavigate} />
          <NavLink href="/dashboard/merchant" label="Merchant" current={currentPath} onNavigate={onNavigate} />
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleNetwork}
            title={`Switch to ${network === "mainnet" ? "Testnet" : "Mainnet"}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border tracking-wide transition-all duration-200 ${
              network === "mainnet"
                ? "bg-kite-primary/10 text-kite-primary border-kite-primary/40"
                : "bg-kite-accent/10 text-kite-accent border-kite-accent/40"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{network === "mainnet" ? "Mainnet" : "Testnet"}</span>
          </button>
          <ConnectButton chainStatus="icon" showBalance={false} accountStatus={{ smallScreen: "avatar", largeScreen: "address" }} />
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  label,
  current,
  onNavigate,
}: {
  href: string;
  label: string;
  current: string;
  onNavigate: (path: string) => void;
}) {
  const active = current.startsWith(href);
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onNavigate(href);
      }}
      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
        active
          ? "bg-kite-primary/10 text-kite-primary"
          : "text-kite-fg/70 hover:text-kite-fg hover:bg-kite-muted"
      }`}
    >
      {label}
    </a>
  );
}
