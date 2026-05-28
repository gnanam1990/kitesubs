import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { plansRouter } from "./routes/plans.ts";
import { subscriptionsRouter } from "./routes/subscriptions.ts";
import { seedIfEmpty } from "./lib/store.ts";

const app = new Hono();

app.use("/*", cors({ origin: "*", allowHeaders: ["Content-Type", "Authorization"] }));

app.get("/health", (c) =>
  c.json({ ok: true, service: "kitesubs-api", store: "in-memory" })
);

app.route("/plans", plansRouter);
app.route("/subscriptions", subscriptionsRouter);

seedIfEmpty();

const port = Number(process.env.PORT ?? 3030);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`KiteSubs API listening on http://localhost:${info.port}`);
});
