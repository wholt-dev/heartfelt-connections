/**
 * index.js — BetsOnBlock API server.
 * Exposes the round engine: live rounds, place bet, history, chain stats.
 * In-memory state (hackathon scope); restartable. No DB needed for the demo.
 */
import express from "express";
import cors from "cors";
import { JsonRpcProvider } from "ethers";
import {
  startEngine, liveRounds, recentHistory, placeBet, betsForWallet,
} from "./rounds.js";
import { deriveSignals } from "../shared/blockgame.js";

const app = express();
app.use(cors());
app.use(express.json());

const provider = new JsonRpcProvider("https://liteforge.rpc.caldera.xyz/http", 4441, { staticNetwork: true });

app.get("/api/rounds", (_req, res) => {
  res.json({ rounds: liveRounds() });
});

app.get("/api/history", (req, res) => {
  // supports both legacy ?n=20 and paginated ?page=1&limit=20
  if (req.query.page || req.query.limit) {
    return res.json(recentHistory(req.query.page, req.query.limit));
  }
  res.json({ history: recentHistory(1, Number(req.query.n) || 20).history });
});

app.get("/api/bets/:wallet", (req, res) => {
  res.json(betsForWallet(req.params.wallet, req.query.page, req.query.limit));
});

app.post("/api/bet", (req, res) => {
  const out = placeBet(req.body || {});
  res.status(out.ok ? 200 : 400).json(out);
});

// live chain head (for the "blocks ticking" UI)
app.get("/api/head", async (_req, res) => {
  try {
    const bn = await provider.getBlockNumber();
    res.json({ block: bn });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// provably-fair: derive all signals from any block number (verify any past round)
app.get("/api/verify/:blockNumber", async (req, res) => {
  try {
    const b = await provider.getBlock(Number(req.params.blockNumber));
    if (!b) return res.status(404).json({ error: "block_not_found" });
    const block = { number: b.number, hash: b.hash, txCount: b.transactions.length, gasUsed: b.gasUsed.toString() };
    res.json({ block, signals: deriveSignals(block) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3201;
app.listen(PORT, () => {
  console.log(`[BetsOnBlock] API on http://localhost:${PORT}`);
  startEngine();
});
