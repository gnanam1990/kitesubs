import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";

export type SubscriptionStatus = "active" | "cancelled" | "overdue";
export type PaymentStatus = "pending" | "confirmed" | "failed";
export type KiteNetwork = "mainnet" | "testnet";

export interface Plan {
  id: string;
  merchant_address: string;
  title: string;
  description: string | null;
  amount_raw: string;
  token_address: string;
  token_decimals: number;
  token_symbol: string;
  period_days: number;
  network: KiteNetwork;
  active: boolean;
  created_at: number;
}

export interface Subscription {
  id: string;
  plan_id: string;
  subscriber_address: string;
  status: SubscriptionStatus;
  next_renewal: number;
  created_at: number;
  cancelled_at: number | null;
}

export interface Payment {
  id: string;
  subscription_id: string;
  tx_hash: string | null;
  amount_raw: string;
  status: PaymentStatus;
  paid_at: number | null;
  due_at: number;
}

const plans = new Map<string, Plan>();
const subscriptions = new Map<string, Subscription>();
const payments = new Map<string, Payment>();
const paymentTxHashes = new Set<string>();

interface StoreSnapshot {
  plans: Plan[];
  subscriptions: Subscription[];
  payments: Payment[];
}

const STORE_FILE = resolve(process.env.KITESUBS_STORE_FILE ?? ".data/kitesubs-store.json");

function readSnapshot(): StoreSnapshot {
  if (!existsSync(STORE_FILE)) return { plans: [], subscriptions: [], payments: [] };

  const parsed = JSON.parse(readFileSync(STORE_FILE, "utf8")) as Partial<StoreSnapshot>;
  return {
    plans: Array.isArray(parsed.plans) ? parsed.plans : [],
    subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
    payments: Array.isArray(parsed.payments) ? parsed.payments : [],
  };
}

function persistStore() {
  mkdirSync(dirname(STORE_FILE), { recursive: true });
  const snapshot: StoreSnapshot = {
    plans: Array.from(plans.values()),
    subscriptions: Array.from(subscriptions.values()),
    payments: Array.from(payments.values()),
  };
  const tmpFile = `${STORE_FILE}.${process.pid}.tmp`;
  writeFileSync(tmpFile, JSON.stringify(snapshot, null, 2));
  renameSync(tmpFile, STORE_FILE);
}

function normalizeTxHash(txHash: string): string {
  return txHash.toLowerCase();
}

function loadStore() {
  try {
    const snapshot = readSnapshot();
    for (const plan of snapshot.plans) plans.set(plan.id, plan);
    for (const subscription of snapshot.subscriptions) subscriptions.set(subscription.id, subscription);
    for (const payment of snapshot.payments) {
      payments.set(payment.id, payment);
      if (payment.tx_hash) paymentTxHashes.add(normalizeTxHash(payment.tx_hash));
    }
  } catch (err) {
    throw new Error(
      `Could not load KITESUBS_STORE_FILE ${STORE_FILE}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

export function isPaymentTxUsed(txHash: string): boolean {
  return paymentTxHashes.has(normalizeTxHash(txHash));
}

// === plans ===

export function createPlan(input: Omit<Plan, "id" | "created_at" | "active">): Plan {
  const plan: Plan = {
    ...input,
    id: randomUUID(),
    active: true,
    created_at: Date.now(),
  };
  plans.set(plan.id, plan);
  persistStore();
  return plan;
}

export function getPlan(id: string): Plan | null {
  return plans.get(id) ?? null;
}

export function listPlansByMerchant(merchant: string): Plan[] {
  const lower = merchant.toLowerCase();
  return Array.from(plans.values())
    .filter((p) => p.merchant_address.toLowerCase() === lower)
    .sort((a, b) => b.created_at - a.created_at);
}

export function setPlanActive(id: string, active: boolean): Plan | null {
  const p = plans.get(id);
  if (!p) return null;
  p.active = active;
  persistStore();
  return p;
}

// === subscriptions ===

export function createSubscription(input: {
  plan_id: string;
  subscriber_address: string;
  first_payment_tx: string;
  amount_raw: string;
}): { subscription: Subscription; payment: Payment } | null {
  const plan = plans.get(input.plan_id);
  if (!plan) return null;
  const normalizedTxHash = normalizeTxHash(input.first_payment_tx);
  if (isPaymentTxUsed(normalizedTxHash)) return null;
  const now = Date.now();
  const next_renewal = now + plan.period_days * 24 * 60 * 60 * 1000;
  const sub: Subscription = {
    id: randomUUID(),
    plan_id: input.plan_id,
    subscriber_address: input.subscriber_address,
    status: "active",
    next_renewal,
    created_at: now,
    cancelled_at: null,
  };
  subscriptions.set(sub.id, sub);
  const pmt: Payment = {
    id: randomUUID(),
    subscription_id: sub.id,
    tx_hash: normalizedTxHash,
    amount_raw: input.amount_raw,
    status: "confirmed",
    paid_at: now,
    due_at: now,
  };
  payments.set(pmt.id, pmt);
  paymentTxHashes.add(normalizedTxHash);
  persistStore();
  return { subscription: sub, payment: pmt };
}

export function getSubscription(id: string): Subscription | null {
  return subscriptions.get(id) ?? null;
}

export function listSubscriptionsBySubscriber(subscriber: string): Subscription[] {
  const lower = subscriber.toLowerCase();
  return Array.from(subscriptions.values())
    .filter((s) => s.subscriber_address.toLowerCase() === lower)
    .sort((a, b) => b.created_at - a.created_at);
}

export function listSubscriptionsByPlan(planId: string): Subscription[] {
  return Array.from(subscriptions.values())
    .filter((s) => s.plan_id === planId)
    .sort((a, b) => b.created_at - a.created_at);
}

export function cancelSubscription(id: string): Subscription | null {
  const s = subscriptions.get(id);
  if (!s) return null;
  s.status = "cancelled";
  s.cancelled_at = Date.now();
  persistStore();
  return s;
}

export function recordRenewal(input: {
  subscription_id: string;
  tx_hash: string;
  amount_raw: string;
}): { subscription: Subscription; payment: Payment } | null {
  const sub = subscriptions.get(input.subscription_id);
  if (!sub) return null;
  const normalizedTxHash = normalizeTxHash(input.tx_hash);
  if (isPaymentTxUsed(normalizedTxHash)) return null;
  const plan = plans.get(sub.plan_id);
  if (!plan) return null;
  const now = Date.now();
  const pmt: Payment = {
    id: randomUUID(),
    subscription_id: sub.id,
    tx_hash: normalizedTxHash,
    amount_raw: input.amount_raw,
    status: "confirmed",
    paid_at: now,
    due_at: sub.next_renewal,
  };
  payments.set(pmt.id, pmt);
  paymentTxHashes.add(normalizedTxHash);
  sub.next_renewal = now + plan.period_days * 24 * 60 * 60 * 1000;
  sub.status = "active";
  persistStore();
  return { subscription: sub, payment: pmt };
}

// === payments ===

export function listPaymentsBySubscription(id: string): Payment[] {
  return Array.from(payments.values())
    .filter((p) => p.subscription_id === id)
    .sort((a, b) => (b.paid_at ?? 0) - (a.paid_at ?? 0));
}

export function listPaymentsByPlan(planId: string): Payment[] {
  const subIds = new Set(listSubscriptionsByPlan(planId).map((s) => s.id));
  return Array.from(payments.values())
    .filter((p) => subIds.has(p.subscription_id))
    .sort((a, b) => (b.paid_at ?? 0) - (a.paid_at ?? 0));
}

// === seed data ===
// Tiny sample so the UI isn't empty when the server first boots.

export function seedIfEmpty() {
  if (plans.size > 0) return;
  createPlan({
    merchant_address: "0x7d627b0F5Ec62155db013B8E7d1Ca9bA53218E82",
    title: "API Pro — 10k calls/month",
    description: "Unlimited rate limits on our text generation API. Cancel any time.",
    amount_raw: "5000000",
    token_address: "0x7aB6f3ed87C42eF0aDb67Ed95090f8bF5240149e",
    token_decimals: 6,
    token_symbol: "USDC.e",
    period_days: 30,
    network: "mainnet",
  });
  createPlan({
    merchant_address: "0xd26850d11e8412fC6035750BE6A871dff9091FAe",
    title: "Newsletter — Weekly research notes",
    description: "Every Sunday, three deep dives on agent infrastructure.",
    amount_raw: "1000000",
    token_address: "0x7aB6f3ed87C42eF0aDb67Ed95090f8bF5240149e",
    token_decimals: 6,
    token_symbol: "USDC.e",
    period_days: 7,
    network: "mainnet",
  });
}

loadStore();
