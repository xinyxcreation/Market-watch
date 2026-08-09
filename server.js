import Fastify from "fastify";
import cors from "@fastify/cors";

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

const PORT = Number(process.env.PORT || 8787);
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || "";

const watched = {
  crypto: ["BINANCE:BTCUSDT", "BINANCE:ETHUSDT", "BINANCE:SOLUSDT"],
  stocks: ["NVDA", "TSLA"]
};

function requireKey(reply) {
  if (!FINNHUB_API_KEY) {
    reply.code(503);
    throw new Error("FINNHUB_API_KEY is not configured");
  }
}

async function fh(path, params = {}) {
  const url = new URL(`https://finnhub.io/api/v1${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  }
  url.searchParams.set("token", FINNHUB_API_KEY);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Finnhub HTTP ${r.status}`);
  return r.json();
}

app.get("/api/health", async () => ({
  ok: true,
  provider: "Finnhub",
  configured: Boolean(FINNHUB_API_KEY)
}));

app.get("/api/quote/:symbol", async (req, reply) => {
  requireKey(reply);
  return fh("/quote", { symbol: req.params.symbol });
});

app.get("/api/candles/:symbol", async (req, reply) => {
  requireKey(reply);
  const to = Math.floor(Date.now() / 1000);
  const from = to - 30 * 24 * 60 * 60;
  return fh("/stock/candle", {
    symbol: req.params.symbol,
    resolution: req.query.resolution || "D",
    from,
    to
  });
});

app.get("/api/news/:symbol", async (req, reply) => {
  requireKey(reply);
  const d = new Date();
  const to = d.toISOString().slice(0, 10);
  d.setDate(d.getDate() - Number(req.query.days || 7));
  const from = d.toISOString().slice(0, 10);
  return fh("/company-news", { symbol: req.params.symbol, from, to });
});

app.get("/api/earnings", async (req, reply) => {
  requireKey(reply);
  return fh("/calendar/earnings", {
    from: req.query.from,
    to: req.query.to,
    symbol: req.query.symbol || ""
  });
});

app.get("/api/market", async (req, reply) => {
  requireKey(reply);
  const result = {};
  for (const [type, symbols] of Object.entries(watched)) {
    result[type] = {};
    for (const symbol of symbols) {
      result[type][symbol] = await fh("/quote", { symbol });
    }
  }
  return result;
});

app.setErrorHandler((err, req, reply) => {
  req.log.error(err);
  reply.code(err.statusCode || 500).send({ error: err.message });
});

app.listen({ port: PORT, host: "0.0.0.0" });
