import { Hono } from "hono";
import {
  createSubscription,
  getPlan,
  getSubscription,
  cancelSubscription,
  isPaymentTxUsed,
  listSubscriptionsBySubscriber,
  listPaymentsBySubscription,
  recordRenewal,
} from "../lib/store.ts";
import { verifyPayment } from "../lib/verify-tx.ts";
import { requireWriteAuth } from "../lib/auth.ts";

export const subscriptionsRouter = new Hono();

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const TX_RE = /^0x[a-fA-F0-9]{64}$/;

subscriptionsRouter.post("/", requireWriteAuth, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "invalid json" }, 400);

  const { plan_id, subscriber_address, first_tx_hash } = body;
  if (!plan_id || !subscriber_address || !first_tx_hash) {
    return c.json({ error: "plan_id, subscriber_address, first_tx_hash all required" }, 400);
  }
  if (!ADDRESS_RE.test(subscriber_address)) return c.json({ error: "invalid subscriber_address" }, 400);
  if (!TX_RE.test(first_tx_hash)) return c.json({ error: "invalid first_tx_hash" }, 400);
  const normalizedTxHash = first_tx_hash.toLowerCase();
  if (isPaymentTxUsed(normalizedTxHash)) {
    return c.json({ error: "payment_tx_already_used" }, 409);
  }

  const plan = getPlan(plan_id);
  if (!plan) return c.json({ error: "plan not found" }, 404);
  if (!plan.active) return c.json({ error: "plan is not active" }, 400);

  const verification = await verifyPayment({
    tx_hash: normalizedTxHash as `0x${string}`,
    expected_to: plan.merchant_address,
    expected_from: subscriber_address,
    expected_amount: BigInt(plan.amount_raw),
    token: plan.token_address,
    network: plan.network,
  });
  if (!verification.valid) {
    return c.json({ error: `tx verification failed: ${verification.reason}` }, 400);
  }

  const result = createSubscription({
    plan_id,
    subscriber_address: subscriber_address.toLowerCase(),
    first_payment_tx: normalizedTxHash,
    amount_raw: plan.amount_raw,
  });
  if (!result) return c.json({ error: "payment_tx_already_used" }, 409);
  return c.json(result);
});

subscriptionsRouter.get("/", (c) => {
  const subscriber = c.req.query("subscriber");
  if (!subscriber) return c.json({ error: "subscriber query param required" }, 400);
  return c.json({ subscriptions: listSubscriptionsBySubscriber(subscriber) });
});

subscriptionsRouter.get("/:id", (c) => {
  const sub = getSubscription(c.req.param("id"));
  if (!sub) return c.json({ error: "subscription not found" }, 404);
  const payments = listPaymentsBySubscription(sub.id);
  const plan = getPlan(sub.plan_id);
  return c.json({ subscription: sub, plan, payments });
});

subscriptionsRouter.get("/:id/payments", (c) => {
  return c.json({ payments: listPaymentsBySubscription(c.req.param("id")) });
});

subscriptionsRouter.post("/:id/cancel", requireWriteAuth, (c) => {
  const sub = cancelSubscription(c.req.param("id") ?? "");
  if (!sub) return c.json({ error: "subscription not found" }, 404);
  return c.json({ subscription: sub });
});

subscriptionsRouter.post("/:id/renew", requireWriteAuth, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.tx_hash) return c.json({ error: "tx_hash required" }, 400);
  if (!TX_RE.test(body.tx_hash)) return c.json({ error: "invalid tx_hash" }, 400);
  const normalizedTxHash = body.tx_hash.toLowerCase();
  if (isPaymentTxUsed(normalizedTxHash)) {
    return c.json({ error: "payment_tx_already_used" }, 409);
  }

  const sub = getSubscription(c.req.param("id") ?? "");
  if (!sub) return c.json({ error: "subscription not found" }, 404);
  if (sub.status === "cancelled") return c.json({ error: "subscription is cancelled" }, 400);

  const plan = getPlan(sub.plan_id);
  if (!plan) return c.json({ error: "plan disappeared" }, 500);

  const verification = await verifyPayment({
    tx_hash: normalizedTxHash as `0x${string}`,
    expected_to: plan.merchant_address,
    expected_from: sub.subscriber_address,
    expected_amount: BigInt(plan.amount_raw),
    token: plan.token_address,
    network: plan.network,
  });
  if (!verification.valid) {
    return c.json({ error: `tx verification failed: ${verification.reason}` }, 400);
  }

  const result = recordRenewal({
    subscription_id: sub.id,
    tx_hash: normalizedTxHash,
    amount_raw: plan.amount_raw,
  });
  if (!result) return c.json({ error: "payment_tx_already_used" }, 409);
  return c.json(result);
});
