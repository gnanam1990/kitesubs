import { useState } from "react";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";
import { Wand2 } from "lucide-react";
import {
  MAINNET_USDC_ADDRESS,
  MAINNET_USDC_DECIMALS,
  TESTNET_USDT_ADDRESS,
  TESTNET_USDT_DECIMALS,
  isValidAddress,
} from "../lib/kite-chain";
import { createPlan, type KiteNetwork } from "../lib/api-client";

const TOKENS = [
  {
    id: "usdc",
    label: "USDC.e",
    address: MAINNET_USDC_ADDRESS,
    decimals: MAINNET_USDC_DECIMALS,
    symbol: "USDC.e",
    networks: ["mainnet"] as KiteNetwork[],
  },
  {
    id: "tusdt",
    label: "Test USDT",
    address: TESTNET_USDT_ADDRESS,
    decimals: TESTNET_USDT_DECIMALS,
    symbol: "tUSDT",
    networks: ["testnet"] as KiteNetwork[],
  },
  {
    id: "kite",
    label: "KITE (native)",
    address: "",
    decimals: 18,
    symbol: "KITE",
    networks: ["mainnet", "testnet"] as KiteNetwork[],
  },
];

const PERIODS = [
  { id: 1, label: "Daily" },
  { id: 7, label: "Weekly" },
  { id: 30, label: "Monthly" },
  { id: 90, label: "Quarterly" },
  { id: 365, label: "Yearly" },
];

interface Props {
  network: KiteNetwork;
  onCreated: (planId: string) => void;
}

export function CreatePlanForm({ network, onCreated }: Props) {
  const { address } = useAccount();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [tokenId, setTokenId] = useState(network === "mainnet" ? "usdc" : "tusdt");
  const [periodDays, setPeriodDays] = useState(30);
  const [merchant, setMerchant] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = TOKENS.find((t) => t.id === tokenId) ?? TOKENS[0];
  const availableTokens = TOKENS.filter((t) => t.networks.includes(network));

  const merchantAddr = merchant || address || "";
  const merchantError =
    merchantAddr && !isValidAddress(merchantAddr) ? "Not a valid 0x address" : null;
  const amountError = (() => {
    if (!amount) return null;
    const n = parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) return "Must be a positive number";
    return null;
  })();

  const canSubmit =
    title.trim() && amount && merchantAddr && !amountError && !merchantError && !submitting;

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const amount_raw = parseUnits(amount, token.decimals).toString();
      const result = await createPlan({
        merchant_address: merchantAddr,
        title: title.trim(),
        description: description.trim() || null,
        amount_raw,
        token_address: token.address,
        token_decimals: token.decimals,
        token_symbol: token.symbol,
        period_days: periodDays,
        network,
      });
      onCreated(result.plan.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create plan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="bg-kite-muted/70 border border-kite-border rounded-xl px-4 py-3 mb-6 text-xs text-kite-fg/75 leading-relaxed">
        <strong className="font-semibold text-kite-fg">v0.1 uses an in-memory store.</strong>{" "}
        Plans live for as long as the API process runs. For production, swap to Postgres — the
        store interface is one file.
      </div>

      <form
        onSubmit={handle}
        className="bg-kite-card border border-kite-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-5"
      >
        <Field label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="API Pro — 10k calls/month"
            maxLength={120}
            className={INPUT_CLS}
          />
        </Field>

        <Field label="Description (optional)" hint={`${description.length} / 280`}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={280}
            placeholder="What's included? Why subscribe?"
            className={`${INPUT_CLS} resize-none`}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
          <Field label="Amount per period" error={amountError}>
            <input
              type="number"
              step="any"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="5.00"
              className={`${INPUT_CLS} font-mono`}
            />
          </Field>
          <Field label="Token">
            <select
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              className={INPUT_CLS}
            >
              {availableTokens.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.symbol}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Period">
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => {
              const active = p.id === periodDays;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodDays(p.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                    active
                      ? "bg-kite-primary/15 text-kite-primary border-kite-primary/40"
                      : "bg-kite-bg text-kite-fg/70 border-kite-border hover:bg-kite-muted"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field
          label="Merchant address (receives payment)"
          error={merchantError}
          right={
            address && (
              <button
                type="button"
                onClick={() => setMerchant(address)}
                className="text-[11px] font-mono text-kite-primary hover:text-kite-fg flex items-center gap-1"
              >
                <Wand2 className="w-3 h-3" /> Use connected
              </button>
            )
          }
        >
          <input
            type="text"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder={address ? `Defaults to ${address.slice(0, 8)}…` : "0x…"}
            className={`${INPUT_CLS} font-mono`}
          />
        </Field>

        {error && (
          <div className="px-3 py-2 rounded-md bg-kite-destructive/10 border border-kite-destructive/30 text-kite-destructive text-xs">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full h-12 rounded-xl bg-kite-primary text-kite-bg font-semibold text-sm tracking-tight shadow-sm hover:bg-kite-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
        >
          {submitting ? "Creating…" : "Create plan"}
        </button>
      </form>
    </div>
  );
}

const INPUT_CLS =
  "w-full bg-kite-bg border border-kite-border focus:border-kite-primary focus:outline-none focus:ring-1 focus:ring-kite-primary/40 rounded-md px-3 py-2 text-sm text-kite-fg placeholder-kite-fg/35 transition-colors";

function Field({
  label,
  children,
  error,
  hint,
  right,
}: {
  label: string;
  children: React.ReactNode;
  error?: string | null;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs uppercase tracking-widest text-kite-fg/50 font-semibold">
          {label}
        </label>
        {right}
      </div>
      {children}
      <div className="flex justify-between text-[11px] mt-1">
        <span className="text-kite-destructive">{error ?? ""}</span>
        <span className="text-kite-fg/45 font-mono">{hint ?? ""}</span>
      </div>
    </div>
  );
}
