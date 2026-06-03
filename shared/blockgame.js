/**
 * blockgame.js — the provably-fair core of BetsOnBlock.
 *
 * Every game outcome is derived ONLY from the target block's public data
 * (hash, transaction count, gas used). Anyone can re-run these pure functions
 * against the on-chain block and confirm the result — no server trust needed.
 *
 * Shared by the backend (to settle rounds) and the frontend (to verify and to
 * render the "Provably Fair" breakdown).
 *
 * A "block snapshot" is:
 *   { number, hash, txCount, gasUsed }   // hash is a 0x... hex string
 */

/* ---------- derived values from a block ---------- */

export function hashToBigInt(hash) {
  return BigInt(hash);
}

/** last hex nibble of the hash, 0..15 */
export function lastNibble(hash) {
  const c = hash.slice(-1).toLowerCase();
  return parseInt(c, 16);
}

export function mod(hash, m) {
  return Number(BigInt(hash) % BigInt(m));
}

export function isEven(hash) {
  return BigInt(hash) % 2n === 0n;
}

/** Full set of derived signals for the Provably-Fair panel. */
export function deriveSignals(block) {
  const n = BigInt(block.hash);
  return {
    hash: block.hash,
    decimal: n.toString(),
    lastNibble: lastNibble(block.hash),     // 0..15  → Lucky Digit / Hi-Lo
    mod100: Number(n % 100n),               // 0..99  → Number game
    mod1000: Number(n % 1000n),             // 0..999 → Closest (PvP)
    even: n % 2n === 0n,                     // Coin Flip / Even-Odd
    txCount: block.txCount,                  // Txn Over/Under
    gasUsed: block.gasUsed,                  // Gas Over/Under, Gas Even/Odd
    gasEven: BigInt(block.gasUsed) % 2n === 0n,
  };
}

/* ---------- bet modes ----------
 * Each mode: how the user's `pick` is checked against the block, the payout
 * multiplier, and a human description for the verify panel.
 */
export const TX_LINE = 5;        // Txn Over/Under threshold
export const GAS_LINE = 500000;  // Gas Over/Under threshold
export const PERFECT_BLOCK_WINDOW_MS = 2 * 60 * 1000; // first 2 minutes of a round
export const PERFECT_BLOCK_MULTIPLIER = 50;           // 50x reward for exact guess

export const MODES = {
  coinflip: {
    label: "Coin Flip",
    desc: "Is the block hash even or odd?",
    picks: ["even", "odd"],
    multiplier: 1.96, // ~2x minus house edge (RTP ~98%)
    settle: (block, pick) => (isEven(block.hash) ? "even" : "odd") === pick,
    resultOf: (block) => (isEven(block.hash) ? "even" : "odd"),
  },
  hilo: {
    label: "Hi-Lo",
    desc: "Last hex digit Low (0-7) or High (8-f)?",
    picks: ["low", "high"],
    multiplier: 1.96,
    settle: (block, pick) => (lastNibble(block.hash) >= 8 ? "high" : "low") === pick,
    resultOf: (block) => (lastNibble(block.hash) >= 8 ? "high" : "low"),
  },
  digit: {
    label: "Lucky Digit",
    desc: "Guess the last hex digit (0-f).",
    picks: ["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f"],
    multiplier: 15.5, // 16 outcomes, ~97% RTP
    settle: (block, pick) => lastNibble(block.hash) === parseInt(pick, 16),
    resultOf: (block) => lastNibble(block.hash).toString(16),
  },
  number: {
    label: "Number 0-99",
    desc: "Guess hash mod 100 (0-99).",
    picks: null, // any integer 0..99
    multiplier: 97, // 100 outcomes, ~97% RTP
    settle: (block, pick) => mod(block.hash, 100) === Number(pick),
    resultOf: (block) => mod(block.hash, 100),
  },
  txou: {
    label: "Txn Over/Under",
    desc: `Will the block have more than ${TX_LINE} transactions?`,
    picks: ["over", "under"],
    multiplier: 1.96,
    settle: (block, pick) => (block.txCount > TX_LINE ? "over" : "under") === pick,
    resultOf: (block) => (block.txCount > TX_LINE ? "over" : "under"),
  },
  gasou: {
    label: "Gas Over/Under",
    desc: `Will gas used exceed ${GAS_LINE.toLocaleString()}?`,
    picks: ["over", "under"],
    multiplier: 1.96,
    settle: (block, pick) => (Number(block.gasUsed) > GAS_LINE ? "over" : "under") === pick,
    resultOf: (block) => (Number(block.gasUsed) > GAS_LINE ? "over" : "under"),
  },
  closest: {
    label: "Closest (PvP)",
    desc: "Guess hash mod 1000 (0-999). Closest guess wins the pot.",
    picks: null, // any integer 0..999, settled relative to others
    multiplier: 0, // PvP — pot split, handled separately
    settle: () => false,
    resultOf: (block) => mod(block.hash, 1000),
  },
  perfectblock: {
    label: "Perfect Block",
    desc: "Guess the exact block number → 50× reward.",
    picks: null, // any integer block number
    multiplier: PERFECT_BLOCK_MULTIPLIER,
    settle: (block, pick) => Number(block.number) === Number(pick),
    resultOf: (block) => block.number,
  },
};

/** Settle a single (non-PvP) bet. Returns { win, payout, result }. */
export function settleBet(block, mode, pick, stake) {
  const m = MODES[mode];
  if (!m) throw new Error(`unknown mode ${mode}`);
  const result = m.resultOf(block);
  if (mode === "closest") return { win: null, payout: 0, result }; // handled in pot logic
  const win = m.settle(block, String(pick));
  return { win, payout: win ? +(stake * m.multiplier).toFixed(6) : 0, result };
}

/** Settle the Closest PvP pool: nearest guess to (hash mod 1000) wins the pot
 *  (minus house rake). Ties split. bets = [{ wallet, pick, stake }] */
export function settleClosest(block, bets, rake = 0.02) {
  if (!bets.length) return { winners: [], target: mod(block.hash, 1000), pot: 0 };
  const target = mod(block.hash, 1000);
  const pot = bets.reduce((s, b) => s + b.stake, 0);
  const payoutPool = +(pot * (1 - rake)).toFixed(6);
  let best = Infinity;
  for (const b of bets) best = Math.min(best, Math.abs(Number(b.pick) - target));
  const winners = bets.filter((b) => Math.abs(Number(b.pick) - target) === best);
  const share = +(payoutPool / winners.length).toFixed(6);
  return { target, pot, payoutPool, winners: winners.map((w) => ({ ...w, payout: share })) };
}
