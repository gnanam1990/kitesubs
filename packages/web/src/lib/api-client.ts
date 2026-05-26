const configuredApiBase = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "");
const API_BASE = configuredApiBase ?? (import.meta.env.DEV ? "http://localhost:3030" : "");
const LOCAL_STORE_KEY = "kitesubs:local-store:v1";
const LOCAL_PLAN_PREFIX = "local_";

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
  status: "active" | "cancelled" | "overdue";
  next_renewal: number;
  created_at: number;
  cancelled_at: number | null;
}

export interface Payment {
  id: string;
  subscription_id: string;
  tx_hash: string | null;
  amount_raw: string;
  status: "pending" | "confirmed" | "failed";
  paid_at: number | null;
  due_at: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE) return localRequest<T>(path, init);

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new Error(body.error ?? `API ${res.status}`);
  }
  return body as T;
}

interface LocalStore {
  plans: Plan[];
  subscriptions: Subscription[];
  payments: Payment[];
}

type EncodedPlan = Omit<Plan, "id">;

function emptyStore(): LocalStore {
  return { plans: [], subscriptions: [], payments: [] };
}

function readStore(): LocalStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_STORE_KEY) ?? "");
    if (Array.isArray(parsed.plans) && Array.isArray(parsed.subscriptions) && Array.isArray(parsed.payments)) {
      return parsed as LocalStore;
    }
  } catch {
    // Ignore corrupt local state and start fresh.
  }
  return emptyStore();
}

function writeStore(store: LocalStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(store));
}

function randomId(prefix: string) {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${id}`;
}

function encodePlanId(plan: EncodedPlan): string {
  const bytes = new TextEncoder().encode(JSON.stringify(plan));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `${LOCAL_PLAN_PREFIX}${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

function decodePlanId(id: string): Plan | null {
  if (!id.startsWith(LOCAL_PLAN_PREFIX)) return null;
  try {
    const padded = id
      .slice(LOCAL_PLAN_PREFIX.length)
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil((id.length - LOCAL_PLAN_PREFIX.length) / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const plan = JSON.parse(new TextDecoder().decode(bytes)) as EncodedPlan;
    return { id, ...plan };
  } catch {
    return null;
  }
}

function findPlan(store: LocalStore, id: string): Plan | null {
  return store.plans.find((plan) => plan.id === id) ?? decodePlanId(id);
}

async function parseBody(init?: RequestInit): Promise<Record<string, unknown>> {
  if (!init?.body || typeof init.body !== "string") return {};
  return JSON.parse(init.body) as Record<string, unknown>;
}

async function localRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const url = new URL(path, "https://local.kitesubs");
  const method = init?.method ?? "GET";
  const store = readStore();

  if (method === "POST" && url.pathname === "/plans") {
    const body = await parseBody(init);
    const planPayload: EncodedPlan = {
      merchant_address: String(body.merchant_address),
      title: String(body.title),
      description: typeof body.description === "string" ? body.description : null,
      amount_raw: String(body.amount_raw),
      token_address: String(body.token_address),
      token_decimals: Number(body.token_decimals),
      token_symbol: String(body.token_symbol),
      period_days: Number(body.period_days),
      network: body.network === "testnet" ? "testnet" : "mainnet",
      active: true,
      created_at: Date.now(),
    };
    const plan: Plan = { id: encodePlanId(planPayload), ...planPayload };
    store.plans = [plan, ...store.plans.filter((item) => item.id !== plan.id)];
    writeStore(store);
    return { plan } as T;
  }

  if (method === "GET" && url.pathname === "/plans") {
    const merchant = (url.searchParams.get("merchant") ?? "").toLowerCase();
    const plans = store.plans
      .filter((plan) => plan.merchant_address.toLowerCase() === merchant)
      .sort((a, b) => b.created_at - a.created_at);
    return { plans } as T;
  }

  const planSubscriptionMatch = url.pathname.match(/^\/plans\/([^/]+)\/subscriptions$/);
  if (method === "GET" && planSubscriptionMatch) {
    const subscriptions = store.subscriptions
      .filter((subscription) => subscription.plan_id === planSubscriptionMatch[1])
      .sort((a, b) => b.created_at - a.created_at);
    return { subscriptions } as T;
  }

  const planPaymentsMatch = url.pathname.match(/^\/plans\/([^/]+)\/payments$/);
  if (method === "GET" && planPaymentsMatch) {
    const subscriptionIds = new Set(
      store.subscriptions
        .filter((subscription) => subscription.plan_id === planPaymentsMatch[1])
        .map((subscription) => subscription.id),
    );
    const payments = store.payments
      .filter((payment) => subscriptionIds.has(payment.subscription_id))
      .sort((a, b) => (b.paid_at ?? 0) - (a.paid_at ?? 0));
    return { payments } as T;
  }

  const planMatch = url.pathname.match(/^\/plans\/([^/]+)$/);
  if (method === "GET" && planMatch) {
    const plan = findPlan(store, planMatch[1]);
    if (!plan) throw new Error("plan not found");
    return { plan } as T;
  }

  if (method === "POST" && url.pathname === "/subscriptions") {
    const body = await parseBody(init);
    const plan = findPlan(store, String(body.plan_id));
    if (!plan) throw new Error("plan not found");
    const now = Date.now();
    const subscription: Subscription = {
      id: randomId("sub"),
      plan_id: plan.id,
      subscriber_address: String(body.subscriber_address),
      status: "active",
      next_renewal: now + plan.period_days * 24 * 60 * 60 * 1000,
      created_at: now,
      cancelled_at: null,
    };
    const payment: Payment = {
      id: randomId("pay"),
      subscription_id: subscription.id,
      tx_hash: String(body.first_tx_hash),
      amount_raw: plan.amount_raw,
      status: "confirmed",
      paid_at: now,
      due_at: now,
    };
    store.subscriptions = [subscription, ...store.subscriptions];
    store.payments = [payment, ...store.payments];
    writeStore(store);
    return { subscription, payment } as T;
  }

  if (method === "GET" && url.pathname === "/subscriptions") {
    const subscriber = (url.searchParams.get("subscriber") ?? "").toLowerCase();
    const subscriptions = store.subscriptions
      .filter((subscription) => subscription.subscriber_address.toLowerCase() === subscriber)
      .sort((a, b) => b.created_at - a.created_at);
    return { subscriptions } as T;
  }

  const subscriptionMatch = url.pathname.match(/^\/subscriptions\/([^/]+)$/);
  if (method === "GET" && subscriptionMatch) {
    const subscription = store.subscriptions.find((item) => item.id === subscriptionMatch[1]);
    if (!subscription) throw new Error("subscription not found");
    const plan = findPlan(store, subscription.plan_id);
    if (!plan) throw new Error("plan not found");
    const payments = store.payments
      .filter((payment) => payment.subscription_id === subscription.id)
      .sort((a, b) => (b.paid_at ?? 0) - (a.paid_at ?? 0));
    return { subscription, plan, payments } as T;
  }

  const cancelMatch = url.pathname.match(/^\/subscriptions\/([^/]+)\/cancel$/);
  if (method === "POST" && cancelMatch) {
    const subscription = store.subscriptions.find((item) => item.id === cancelMatch[1]);
    if (!subscription) throw new Error("subscription not found");
    subscription.status = "cancelled";
    subscription.cancelled_at = Date.now();
    writeStore(store);
    return { subscription } as T;
  }

  const renewMatch = url.pathname.match(/^\/subscriptions\/([^/]+)\/renew$/);
  if (method === "POST" && renewMatch) {
    const body = await parseBody(init);
    const subscription = store.subscriptions.find((item) => item.id === renewMatch[1]);
    if (!subscription) throw new Error("subscription not found");
    const plan = findPlan(store, subscription.plan_id);
    if (!plan) throw new Error("plan not found");
    const now = Date.now();
    const payment: Payment = {
      id: randomId("pay"),
      subscription_id: subscription.id,
      tx_hash: String(body.tx_hash),
      amount_raw: plan.amount_raw,
      status: "confirmed",
      paid_at: now,
      due_at: subscription.next_renewal,
    };
    subscription.status = "active";
    subscription.next_renewal = now + plan.period_days * 24 * 60 * 60 * 1000;
    store.payments = [payment, ...store.payments];
    writeStore(store);
    return { subscription, payment } as T;
  }

  throw new Error(`Local API route not implemented: ${method} ${url.pathname}`);
}

// === plans ===

export function createPlan(input: {
  merchant_address: string;
  title: string;
  description?: string | null;
  amount_raw: string;
  token_address: string;
  token_decimals: number;
  token_symbol: string;
  period_days: number;
  network: KiteNetwork;
}): Promise<{ plan: Plan }> {
  return request<{ plan: Plan }>("/plans", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getPlan(id: string): Promise<{ plan: Plan }> {
  return request(`/plans/${id}`);
}

export function listPlansByMerchant(merchant: string): Promise<{ plans: Plan[] }> {
  return request(`/plans?merchant=${encodeURIComponent(merchant)}`);
}

export function listPlanSubscriptions(planId: string): Promise<{ subscriptions: Subscription[] }> {
  return request(`/plans/${planId}/subscriptions`);
}

export function listPlanPayments(planId: string): Promise<{ payments: Payment[] }> {
  return request(`/plans/${planId}/payments`);
}

// === subscriptions ===

export function subscribe(input: {
  plan_id: string;
  subscriber_address: string;
  first_tx_hash: string;
}): Promise<{ subscription: Subscription; payment: Payment }> {
  return request("/subscriptions", { method: "POST", body: JSON.stringify(input) });
}

export function listSubscriptions(subscriber: string): Promise<{ subscriptions: Subscription[] }> {
  return request(`/subscriptions?subscriber=${encodeURIComponent(subscriber)}`);
}

export function getSubscription(
  id: string
): Promise<{ subscription: Subscription; plan: Plan; payments: Payment[] }> {
  return request(`/subscriptions/${id}`);
}

export function cancelSubscription(id: string): Promise<{ subscription: Subscription }> {
  return request(`/subscriptions/${id}/cancel`, { method: "POST" });
}

export function renewSubscription(
  id: string,
  tx_hash: string
): Promise<{ subscription: Subscription; payment: Payment }> {
  return request(`/subscriptions/${id}/renew`, {
    method: "POST",
    body: JSON.stringify({ tx_hash }),
  });
}

export function apiBase(): string {
  return API_BASE || "browser-local-store";
}
