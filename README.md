# KiteSubs

Recurring USDC.e subscriptions on the [Kite](https://gokite.ai) blockchain. Sister project to [AgentID](https://agentid-seven.vercel.app), [KiteLeaderboard](https://kiteleaderboard.vercel.app), [KitePay](https://github.com/gnanam1990/kitepay), and [KiteIndex Lite](https://github.com/gnanam1990/kiteindex-lite).

Substack-style subscriptions, but the payment rail is USDC.e on Kite. Merchants create plans; subscribers pay each period from their wallet (v0.1) or via a kpass session (v0.2 — marked **PREVIEW**).

## Monorepo

| Package           | What it is                          | Storage          | Status                  |
| ----------------- | ----------------------------------- | ---------------- | ----------------------- |
| `packages/api`    | Hono server: plans, subs, payments  | **In-memory**    | Ships v0.1; restart wipes state |
| `packages/web`    | Vite playground: merchant + subscriber dashboards | Talks to API     | Ships v0.1              |

## Live deployment

- Web app: <https://kitesubs.vercel.app>
- Host: Vercel (`kitesubs`)
- Deployed package: `packages/web`
- Build: `pnpm build`
- Output: `dist`

The hosted web app is live. Subscription actions still need a deployed API and `VITE_API_BASE` configured to that API URL; otherwise the app uses the local development default (`http://localhost:3030`).

## v0.1 honest scope

- **In-memory store.** The backend keeps plans, subscriptions, and payment records in a `Map`. Restart wipes everything. To go to production: swap the store for Drizzle + Postgres (Supabase is easiest). The store interface is one file, so this is a contained refactor.
- **Wallet-only payments.** Subscribers click "Renew now" each period and sign the tx. Agent auto-renew via kpass session lands in v0.2.
- **On-chain tx verification.** When a renewal claim comes in, the API decodes the receipt and confirms the ERC-20 `Transfer` event matches the plan's amount + recipient. Trust nothing from the client.
- **No email/webhook notifications.** v0.2.
- **No fee.** Free.

## Run it locally

```bash
pnpm install

# Terminal 1 — API
pnpm --filter @kitesubs/api dev   # http://localhost:3030

# Terminal 2 — web
pnpm --filter @kitesubs/web dev   # http://localhost:3040
```

The web app talks to the API via `VITE_API_BASE` (defaults to `http://localhost:3030`).

## Token addresses

| Network  | Token   | Address                                        | Decimals |
| -------- | ------- | ---------------------------------------------- | -------- |
| Mainnet  | USDC.e  | `0x7aB6f3ed87C42eF0aDb67Ed95090f8bF5240149e`   | 6        |
| Testnet  | tUSDT   | `0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63`   | 18       |
| Either   | KITE    | (native, no contract)                          | 18       |

## Production path (v0.2)

1. Replace `packages/api/src/lib/store.ts` (in-memory) with Drizzle + Postgres. Schema is documented inline.
2. Add a renewal worker (node-cron or Supabase scheduled function) that marks `next_renewal < now` subscriptions as `overdue`.
3. Add kpass session integration so an agent can renew without human approval (within an allowance cap).
4. Deploy: API → Railway/Hetzner; Web → Vercel.

## Things deliberately NOT in v0.1

- Smart contract for trustless allowance enforcement
- Email / push notifications on upcoming renewals
- Refunds with on-chain reversal
- Multi-token plans
- Per-plan analytics (retention curves, churn cohort)
- Plan tiering
