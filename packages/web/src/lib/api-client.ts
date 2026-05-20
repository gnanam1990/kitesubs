const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? "http://localhost:3030";

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
  return API_BASE;
}
