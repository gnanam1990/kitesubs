import { useCallback, useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, getDefaultConfig, lightTheme } from "@rainbow-me/rainbowkit";
import { ArrowRight, Loader2, AlertTriangle, Repeat, Users, Bot } from "lucide-react";

import { kiteMainnet, kiteTestnet } from "./lib/kite-chain";
import { getPlan, type KiteNetwork, type Plan } from "./lib/api-client";

import { SiteHeader } from "./components/site-header";
import { SiteFooter } from "./components/site-footer";
import { CreatePlanForm } from "./components/create-plan-form";
import { PlanCard } from "./components/plan-card";
import { PlanShareCard } from "./components/plan-share-card";
import { SubscribeButton } from "./components/subscribe-button";
import { SubscriberDashboard } from "./components/subscriber-dashboard";
import { MerchantDashboard } from "./components/merchant-dashboard";

const NETWORK_STORAGE_KEY = "kitesubs:network";
const WALLETCONNECT_PROJECT_ID = "00000000000000000000000000000000";

const wagmiConfig = getDefaultConfig({
  appName: "KiteSubs",
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [kiteMainnet, kiteTestnet],
  ssr: false,
});

const queryClient = new QueryClient();

const rainbowTheme = lightTheme({
  accentColor: "#9B8564",
  accentColorForeground: "#FEF8F0",
  borderRadius: "medium",
  fontStack: "system",
});

type Route =
  | { name: "landing" }
  | { name: "create" }
  | { name: "plan"; id: string }
  | { name: "share"; id: string }
  | { name: "subscriber" }
  | { name: "merchant" };

function readRoute(): Route {
  if (typeof window === "undefined") return { name: "landing" };
  const path = window.location.pathname;
  const planMatch = path.match(/^\/p\/([^/]+)(\/share)?\/?$/);
  if (planMatch) {
    return planMatch[2] ? { name: "share", id: planMatch[1] } : { name: "plan", id: planMatch[1] };
  }
  if (path === "/create") return { name: "create" };
  if (path === "/dashboard/subscriber") return { name: "subscriber" };
  if (path === "/dashboard/merchant") return { name: "merchant" };
  return { name: "landing" };
}

function readInitialNetwork(): KiteNetwork {
  if (typeof window === "undefined") return "mainnet";
  const stored = window.localStorage.getItem(NETWORK_STORAGE_KEY);
  return stored === "testnet" ? "testnet" : "mainnet";
}

function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function InnerApp() {
  const [route, setRoute] = useState<Route>(() => readRoute());
  const [network, setNetwork] = useState<KiteNetwork>(() => readInitialNetwork());

  useEffect(() => {
    const onPop = () => setRoute(readRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(NETWORK_STORAGE_KEY, network);
    }
  }, [network]);

  const toggleNetwork = () => setNetwork((n) => (n === "mainnet" ? "testnet" : "mainnet"));

  return (
    <div className="min-h-screen flex flex-col bg-kite-bg text-kite-fg">
      <SiteHeader
        network={network}
        onToggleNetwork={toggleNetwork}
        onNavigate={navigate}
        currentPath={window.location.pathname}
      />

      {route.name === "landing" && <Landing onNavigate={navigate} />}

      {route.name === "create" && (
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-xl mx-auto mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-kite-fg mb-2">
              Create a subscription plan
            </h1>
            <p className="text-sm text-kite-fg/65">
              Set a price + period, share the link, get paid each cycle.
            </p>
          </div>
          <CreatePlanForm network={network} onCreated={(id) => navigate(`/p/${id}/share`)} />
        </main>
      )}

      {route.name === "plan" && <PlanRoute id={route.id} />}
      {route.name === "share" && <ShareRoute id={route.id} />}
      {route.name === "subscriber" && <SubscriberDashboard />}
      {route.name === "merchant" && <MerchantDashboard onNavigate={navigate} />}

      <SiteFooter />
    </div>
  );
}

function Landing({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <main className="flex-1">
      <section className="kite-gradient border-b border-kite-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-kite-fg mb-5">
            Recurring revenue, on Kite.
          </h1>
          <p className="text-base sm:text-lg text-kite-fg/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            Sell subscriptions in USDC.e. Subscribers renew with a wallet today; their agent's
            kpass session does it for them tomorrow.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={() => onNavigate("/create")}
              className="h-12 px-6 rounded-xl bg-kite-primary text-kite-bg font-semibold text-sm tracking-tight shadow-sm hover:bg-kite-primary/90 transition-all duration-150 inline-flex items-center gap-2"
            >
              Create a plan <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate("/dashboard/subscriber")}
              className="h-12 px-6 rounded-xl border border-kite-border bg-kite-bg/60 text-kite-fg font-semibold text-sm tracking-tight hover:bg-kite-bg transition-all duration-150"
            >
              Manage my subscriptions
            </button>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Card
            icon={Users}
            title="For creators"
            body="Weekly research notes. Monthly drops. Tip jar that doesn't ghost you. Subscribers can cancel any time."
          />
          <Card
            icon={Repeat}
            title="For API operators"
            body="Sell metered access, prepaid bundles, or flat tiers. Renewal verified on-chain — no chargebacks."
          />
          <Card
            icon={Bot}
            title="For AI agents"
            body="v0.2 will let an agent's kpass session auto-renew within an allowance cap. v0.1 is wallet-only."
          />
        </div>
      </section>
    </main>
  );
}

function Card({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Users;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-kite-card border border-kite-border rounded-xl p-5">
      <div className="w-9 h-9 rounded-lg bg-kite-primary/15 text-kite-primary flex items-center justify-center mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-base font-semibold tracking-tight text-kite-fg mb-1.5">{title}</h3>
      <p className="text-sm text-kite-fg/65 leading-relaxed">{body}</p>
    </div>
  );
}

function PlanRoute({ id }: { id: string }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { plan: p } = await getPlan(id);
      setPlan(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load plan");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="flex items-center gap-2 text-sm text-kite-fg/55">
          <Loader2 className="w-4 h-4 animate-spin text-kite-primary" /> Loading plan…
        </div>
      </main>
    );
  }
  if (error || !plan) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-md text-center">
          <AlertTriangle className="w-10 h-10 text-kite-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold tracking-tight text-kite-fg mb-2">Plan not found</h1>
          <p className="text-sm text-kite-fg/65">{error ?? "Could not load this plan."}</p>
        </div>
      </main>
    );
  }
  return (
    <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <PlanCard plan={plan}>
        <SubscribeButton plan={plan} onSubscribed={() => navigate("/dashboard/subscriber")} />
      </PlanCard>
    </main>
  );
}

function ShareRoute({ id }: { id: string }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlan(id)
      .then((res) => setPlan(res.plan))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [id]);

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-sm text-kite-destructive">{error}</div>
      </main>
    );
  }
  if (!plan) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="flex items-center gap-2 text-sm text-kite-fg/55">
          <Loader2 className="w-4 h-4 animate-spin text-kite-primary" /> Preparing share view…
        </div>
      </main>
    );
  }
  const url = `${window.location.origin}/p/${plan.id}`;
  return (
    <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <PlanShareCard plan={plan} url={url} onCreateAnother={() => navigate("/create")} />
    </main>
  );
}

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowTheme} appInfo={{ appName: "KiteSubs" }}>
          <InnerApp />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
