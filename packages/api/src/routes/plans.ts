import { Hono } from "hono";
import {
  createPlan,
  getPlan,
  listPlansByMerchant,
  listSubscriptionsByPlan,
  listPaymentsByPlan,
  setPlanActive,
} from "../lib/store.ts";
import { requireWriteAuth } from "../lib/auth.ts";

export const plansRouter = new Hono();

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

plansRouter.post("/", requireWriteAuth, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") return c.json({ error: "invalid json" }, 400);

  const requiredKeys = [
    "merchant_address",
    "title",
    "amount_raw",
    "token_address",
    "token_decimals",
    "token_symbol",
    "period_days",
    "network",
  ] as const;
  for (const key of requiredKeys) {
    if (!(key in body)) return c.json({ error: `missing field: ${key}` }, 400);
  }

  if (body.network !== "mainnet" && body.network !== "testnet") {
    return c.json({ error: "network must be mainnet or testnet" }, 400);
  }
  if (!ADDRESS_RE.test(body.merchant_address)) {
    return c.json({ error: "invalid merchant_address" }, 400);
  }
  if (!ADDRESS_RE.test(body.token_address)) {
    return c.json({ error: "invalid token_address" }, 400);
  }
  if (typeof body.period_days !== "number" || body.period_days < 1) {
    return c.json({ error: "period_days must be a positive integer" }, 400);
  }

  const plan = createPlan({
    merchant_address: body.merchant_address.toLowerCase(),
    title: body.title,
    description: body.description ?? null,
    amount_raw: body.amount_raw,
    token_address: body.token_address.toLowerCase(),
    token_decimals: body.token_decimals,
    token_symbol: body.token_symbol,
    period_days: body.period_days,
    network: body.network,
  });
  return c.json({ plan });
});

plansRouter.get("/:id", (c) => {
  const id = c.req.param("id");
  const plan = getPlan(id);
  if (!plan) return c.json({ error: "plan not found" }, 404);
  return c.json({ plan });
});

plansRouter.get("/", (c) => {
  const merchant = c.req.query("merchant");
  if (!merchant) return c.json({ error: "merchant query param required" }, 400);
  const merchantPlans = listPlansByMerchant(merchant);
  return c.json({ plans: merchantPlans });
});

plansRouter.get("/:id/subscriptions", (c) => {
  return c.json({ subscriptions: listSubscriptionsByPlan(c.req.param("id")) });
});

plansRouter.get("/:id/payments", (c) => {
  return c.json({ payments: listPaymentsByPlan(c.req.param("id")) });
});

plansRouter.post("/:id/active", requireWriteAuth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const active = body?.active !== false;
  const plan = setPlanActive(c.req.param("id") ?? "", active);
  if (!plan) return c.json({ error: "plan not found" }, 404);
  return c.json({ plan });
});
