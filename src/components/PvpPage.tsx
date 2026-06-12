import React from "react";
import { ArrowLeft, Shield, History, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { BrowserProvider, Contract, parseEther } from "ethers";
import PvpWheelVisual from "./PvpWheelVisual";
import MyBetsModal from "./MyBetsModal";
import AboutModal from "./AboutModal";
import BetPanel, { AutoConfig } from "./BetPanel";
import { sounds } from "../lib/pvpSounds";

const API = "https://lit-api.test-hub.xyz";
const STATUS_URL = `${API}/bets/status`;
const HISTORY_URL = `${API}/bets/history`;
const CONFIRM_URL = `${API}/bets/confirm`;
const TILES = 30;

const CONTRACT_ADDRESS = "0x162ED453121f91eb3595e7f4513F78a0b5b02a81";
const CHAIN_ID = 4441;
const CHAIN_ID_HEX = "0x1159";
const RPC_URL = "https://liteforge.rpc.caldera.xyz/http";
const EXPLORER_TX = "https://liteforge.explorer.caldera.xyz/tx";
const MIN_BET = 0.001;

const BET_ABI = [
  "function placeBet(uint8 tile) external payable",
  "function placeBetMulti(uint8[] calldata tiles) external payable",
  "function getCurrentRound() external view returns (uint256 id, bool resolved, uint8 winningTile, uint256 totalPool)"
];

async function ensureLiteForge() {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("No wallet found. Install MetaMask.");
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID_HEX }] });
  } catch (e: any) {
    if (e?.code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: CHAIN_ID_HEX,
          chainName: "LiteForge",
          rpcUrls: [RPC_URL],
          nativeCurrency: { name: "zkLTC", symbol: "zkLTC", decimals: 18 },
          blockExplorerUrls: ["https://liteforge.explorer.caldera.xyz"],
        }],
      });
    } else {
      throw e;
    }
  }
}


type Status = {
  round_id?: number | null;
  status: "open" | "locked" | "cooldown" | "starting";
  time_left_ms?: number;
  total_pool?: number;
  drand_target_round?: number | string;
  drand_verify_url?: string;
  cooldown_ms?: number;
  next_round_at?: number;
};

type MyBet = { round_id: number; tile: number; amount: number };
type Payout = { wallet?: string; bet?: number; payout?: number };
type EndedRound = {
  round_id: number;
  winning_tile: number;
  total_pool?: number;
  status?: string;
  drand_verify_url?: string;
  drand_round?: number | string;
  payouts?: Payout[];
  is_bonanza?: number;
};


type RoundDetails = {
  round_id: number;
  winning_tile: number;
  drand_randomness?: string;
  drand_target_round?: number | string;
  drand_verify_url?: string;
};

function numOrNull(value: unknown) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function validWinningTile(value: unknown) {
  const n = numOrNull(value);
  if (n == null || n < 1 || n > TILES) return null;
  return n;
}

function normalizeEndedRound(raw: any): EndedRound | null {
  const roundId = numOrNull(raw?.round_id ?? raw?.id ?? raw?.roundId);
  const winningTile = validWinningTile(raw?.winning_tile);
  const status = String(raw?.status ?? "").toLowerCase();
  const isResolved = status === "resolved" || status === "settled" || status === "complete";
  if (roundId == null || winningTile == null || (status && !isResolved)) return null;
  return {
    round_id: roundId,
    winning_tile: winningTile,
    total_pool: Number.isFinite(Number(raw?.total_pool)) ? Number(raw?.total_pool) : 0,
    status,
    drand_verify_url: raw?.drand_verify_url,
    drand_round: raw?.drand_target_round ?? raw?.drand_round,
    payouts: Array.isArray(raw?.payouts) ? raw.payouts as Payout[] : [],
    is_bonanza: Number(raw?.is_bonanza) === 1 ? 1 : 0,
  };
}


export default function PvpPage({ onBack, onAbout }: { onBack: () => void; onAbout?: () => void }) {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const addr = isConnected && address ? address.toLowerCase() : null;

  const [status, setStatus] = React.useState<Status | null>(null);
  const [statusFetchedAt, setStatusFetchedAt] = React.useState<number>(Date.now());
  const [history, setHistory] = React.useState<EndedRound[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(true);
  const [myBets, setMyBets] = React.useState<MyBet[]>([]);
  const [selectedTiles, setSelectedTilesState] = React.useState<Set<number>>(new Set());
  const selectedTilesRef = React.useRef<Set<number>>(new Set());
  const updateSelection = React.useCallback((next: Set<number>) => {
    selectedTilesRef.current = next;
    setSelectedTilesState(new Set(next));
  }, []);
  const [placing, setPlacing] = React.useState(false);
  const [autoCfg, setAutoCfg] = React.useState<AutoConfig | null>(null);
  const lastAutoBetRoundRef = React.useRef<number | null>(null);

  const [verifyModal, setVerifyModal] = React.useState<{ loading: boolean; data: RoundDetails | null; error?: string; round_id: number } | null>(null);
  const [, setNow] = React.useState(Date.now());
  const [lastResolvedRound, setLastResolvedRound] = React.useState<EndedRound | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = React.useState<number>(0);
  const [toast, setToast] = React.useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = React.useState<string | null>(null);
  const [animationWinner, setAnimationWinner] = React.useState<EndedRound | null>(null);
  const [myBetsRefresh, setMyBetsRefresh] = React.useState(0);

  const prevRoundRef = React.useRef<number | null>(null);
  const prevStatusRef = React.useRef<string | null>(null);
  const pendingAnimationRoundRef = React.useRef<number | null>(null);
  const animationTriggeredRoundRef = React.useRef<number | null>(null);
  const activeStatusRef = React.useRef<string | null>(null);
  const activeRoundRef = React.useRef<number | null>(null);
  const historyRetryTimerRef = React.useRef<number | null>(null);
  const zeroHoldTimerRef = React.useRef<number | null>(null);
  const zeroHoldCallbacksRef = React.useRef<Array<() => void>>([]);
  const visibleRoundEndsAtRef = React.useRef<number>(0);

  // tick for countdown
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    const unlockAudio = () => sounds.unlock();
    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio);
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  // poll status every 1s (fast enough to catch short cooldown window)
  const lastPollStatusRef = React.useRef<string | null>(null);
  const lastPollRoundRef = React.useRef<number | null>(null);
  const loadHistoryRef = React.useRef<(roundId?: number | null) => void>(() => {});
  const clearHistoryRetry = React.useCallback(() => {
    if (historyRetryTimerRef.current != null) {
      window.clearTimeout(historyRetryTimerRef.current);
      historyRetryTimerRef.current = null;
    }
  }, []);
  const startAnimationForWinner = React.useCallback((winner: EndedRound, reason: string) => {
    const roundId = numOrNull(winner.round_id);
    const tile = validWinningTile(winner.winning_tile);
    if (roundId == null || tile == null) return false;
    if (animationTriggeredRoundRef.current === roundId) return false;
    const stableWinner = { ...winner, round_id: roundId, winning_tile: tile };
    console.log("[Animation] winner found — starting wheel animation", { ...stableWinner, reason });
    clearHistoryRetry();
    animationTriggeredRoundRef.current = roundId;
    pendingAnimationRoundRef.current = null;
    setAnimationWinner(stableWinner);
    setLastResolvedRound(stableWinner);
    return true;
  }, [clearHistoryRetry]);
  const scheduleWinnerRetry = React.useCallback((roundId: number) => {
    if (historyRetryTimerRef.current != null) return;
    historyRetryTimerRef.current = window.setTimeout(() => {
      historyRetryTimerRef.current = null;
      if (pendingAnimationRoundRef.current === roundId && animationTriggeredRoundRef.current !== roundId) {
        loadHistoryRef.current?.(roundId);
      }
    }, 650);
  }, []);
  const runAfterVisibleZero = React.useCallback((apiTimeLeftMs: unknown, fn: () => void) => {
    const visibleMsLeft = Math.max(0, visibleRoundEndsAtRef.current - Date.now());
    const apiMsLeft = Math.max(0, Number(apiTimeLeftMs) || 0);
    const msLeft = Math.max(visibleMsLeft, apiMsLeft);
    if (msLeft <= 0) {
      fn();
      return;
    }
    zeroHoldCallbacksRef.current.push(fn);
    if (zeroHoldTimerRef.current != null) return;
    zeroHoldTimerRef.current = window.setTimeout(() => {
      zeroHoldTimerRef.current = null;
      const callbacks = zeroHoldCallbacksRef.current.splice(0);
      callbacks.forEach((callback) => callback());
    }, msLeft + 120);
  }, []);
  const queueAnimationForRound = React.useCallback((roundId: number | null, reason: string) => {
    if (roundId == null) return;
    if (animationTriggeredRoundRef.current === roundId || pendingAnimationRoundRef.current === roundId) return;
    console.log("[Animation] queued round end", { roundId, reason });
    pendingAnimationRoundRef.current = roundId;
    loadHistoryRef.current?.(roundId);
  }, []);
  const loadStatus = React.useCallback(async () => {
    try {
      const r = await fetch(STATUS_URL, { cache: "no-store" });
      if (!r.ok) { console.error("[BetsOnBlock] status http", r.status); return; }
      const j = await r.json();
      const apiRoundId = numOrNull(j.round_id ?? j.id ?? j.roundId);
      const apiTimeLeftMs = Math.max(0, Number(j.time_left_ms) || 0);
      if (j.status === "open" && apiTimeLeftMs > 0) {
        visibleRoundEndsAtRef.current = Date.now() + apiTimeLeftMs;
      }
      console.log("[Poll]", j.status, "round:", apiRoundId ?? j.round_id, "time_left:", j.time_left_ms);

      const statusWinnerTile = validWinningTile(j.winning_tile ?? j.result?.winning_tile);
      if (apiRoundId != null && statusWinnerTile != null && j.status !== "open") {
        const winnerFromStatus = {
          round_id: apiRoundId,
          winning_tile: statusWinnerTile,
          status: String(j.status ?? "").toLowerCase(),
          drand_verify_url: j.drand_verify_url,
          drand_round: j.drand_target_round ?? j.drand_round,
        };
        runAfterVisibleZero(j.time_left_ms, () => startAnimationForWinner(winnerFromStatus, "status"));
      } else if (apiRoundId != null && j.status !== "open" && animationTriggeredRoundRef.current !== apiRoundId) {
        runAfterVisibleZero(j.time_left_ms, () => loadHistoryRef.current?.(apiRoundId));
      }

      const prevStatus = lastPollStatusRef.current;
      const prevRound = lastPollRoundRef.current;

      // TRIGGER 1: entering cooldown / new-round window. Do not queue on locked/verifying;
      // at that point drand often has not returned a winning tile yet.
      const enteringCooldown = j.status === "cooldown" && prevStatus !== "cooldown";
      // TRIGGER 2: round_id changed (previous round just ended)
      const roundChanged = prevRound != null && apiRoundId != null && prevRound !== apiRoundId;

      if (enteringCooldown || roundChanged) {
        const endedRoundId = roundChanged ? prevRound : (apiRoundId ?? prevRound);
        console.log("[Poll] round ended — fetching history for winner", { enteringCooldown, roundChanged, endedRoundId, prevRound, newRound: apiRoundId });
        if (roundChanged) {
          queueAnimationForRound(endedRoundId, "round-change");
        } else {
          runAfterVisibleZero(j.time_left_ms, () => queueAnimationForRound(endedRoundId, "cooldown"));
        }
      }

      lastPollStatusRef.current = j.status ?? null;
      activeStatusRef.current = j.status ?? null;
      activeRoundRef.current = apiRoundId;
      if (apiRoundId != null) lastPollRoundRef.current = apiRoundId;

      setStatus({
        ...j,
        round_id: apiRoundId ?? ((j.status === "locked" || j.status === "cooldown" || j.status === "starting") ? prevRound : null),
        time_left_ms: apiTimeLeftMs,
        total_pool: Number.isFinite(Number(j.total_pool)) ? Number(j.total_pool) : 0,
      });
      setStatusFetchedAt(Date.now());
    } catch (e) { console.error("[BetsOnBlock] status fetch error:", e); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueAnimationForRound, runAfterVisibleZero, startAnimationForWinner]);
  React.useEffect(() => {
    loadStatus();
    const id = setInterval(loadStatus, 1000);
    return () => clearInterval(id);
  }, [loadStatus]);

  // poll history every 10s
  const loadHistory = React.useCallback(async (targetRoundId?: number | null) => {
    setHistoryLoading(true);
    try {
      const r = await fetch(HISTORY_URL, { cache: "no-store" });
      if (!r.ok) { console.error("[BetsOnBlock] history http", r.status); return; }
      const j = await r.json();
      console.log("[BetsOnBlock] history:", j);
      const arr: any[] = Array.isArray(j) ? j : (j.history || j.rounds || []);
      const normalized = arr
        .map(normalizeEndedRound)
        .filter((r): r is EndedRound => r != null)
        .sort((a, b) => b.round_id - a.round_id);
      setHistory(normalized);
      if (normalized[0]) setLastResolvedRound((prev) => prev?.round_id === normalized[0].round_id ? prev : normalized[0]);

      const wantedRound = targetRoundId ?? pendingAnimationRoundRef.current;
      const latestResolvedCurrentRound = normalized[0]?.round_id === activeRoundRef.current ? normalized[0] : null;
      const fallbackWinner = wantedRound == null && activeStatusRef.current !== "open"
        ? (latestResolvedCurrentRound ?? (activeStatusRef.current === "cooldown" ? normalized[0] : null))
        : null;
      const winner = wantedRound != null ? normalized.find((item) => item.round_id === wantedRound) : fallbackWinner;
      if (winner) {
        runAfterVisibleZero(0, () => startAnimationForWinner(winner, wantedRound != null ? "history-exact" : "history-latest"));
      } else if (wantedRound != null) {
        console.log("[Animation] winner not ready yet", { wantedRound });
        scheduleWinnerRetry(wantedRound);
      }
    } catch (e) { console.error("[BetsOnBlock] history fetch error:", e); }
    finally { setHistoryLoading(false); }
  }, [runAfterVisibleZero, scheduleWinnerRetry, startAnimationForWinner]);
  React.useEffect(() => { loadHistoryRef.current = loadHistory; }, [loadHistory]);
  React.useEffect(() => () => {
    clearHistoryRetry();
    if (zeroHoldTimerRef.current != null) window.clearTimeout(zeroHoldTimerRef.current);
    zeroHoldCallbacksRef.current = [];
  }, [clearHistoryRetry]);
  React.useEffect(() => {
    loadHistory();
    const id = setInterval(loadHistory, 10000);
    return () => clearInterval(id);
  }, [loadHistory]);

  // refetch immediately when the tab/page becomes visible again
  React.useEffect(() => {
    const onVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        loadStatus();
        loadHistory();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadStatus, loadHistory]);

  // poll user's bets when connected
  const loadMyBets = React.useCallback(async () => {
    if (!addr) { setMyBets([]); return; }
    try {
      const r = await fetch(`${API}/bets/wallet/${addr}`, { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      const arr: MyBet[] = Array.isArray(j) ? j : (j.bets || []);
      setMyBets(arr);
    } catch { /* */ }
  }, [addr]);
  React.useEffect(() => {
    loadMyBets();
    const id = setInterval(loadMyBets, 3000);
    return () => clearInterval(id);
  }, [loadMyBets]);

  // keep a stable previous round marker for UI fallbacks
  React.useEffect(() => {
    if (!status?.round_id) return;
    prevRoundRef.current = status.round_id;
  }, [status?.round_id]);

  // cooldown countdown + status transitions
  React.useEffect(() => {
    if (!status) return;
    const prev = prevStatusRef.current;
    if (status.status === "cooldown") {
      const ms = status.cooldown_ms ?? (status.next_round_at ? status.next_round_at - Date.now() : 0);
      setCooldownSeconds(Math.max(0, Math.ceil(ms / 1000)));
      if (prev !== "cooldown") loadHistory(status.round_id ?? prevRoundRef.current);
    } else if (prev === "cooldown" && status.status === "open") {
      setCooldownSeconds(0);
      setToast(`🎲 Round #${status.round_id} Started — Place Your Bets!`);
      setTimeout(() => setToast(null), 3500);
    }
    prevStatusRef.current = status.status;
  }, [status, loadHistory]);

  // tick cooldown each second
  React.useEffect(() => {
    if (status?.status !== "cooldown") return;
    const id = setInterval(() => {
      setCooldownSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [status?.status, status?.round_id]);

  async function openVerify(round_id: number) {
    setVerifyModal({ loading: true, data: null, round_id });
    try {
      const r = await fetch(`${API}/bets/round/${round_id}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`http_${r.status}`);
      const j = await r.json();
      setVerifyModal({ loading: false, data: j, round_id });
    } catch (e: any) {
      setVerifyModal({ loading: false, data: null, error: e?.message || "Failed to load", round_id });
    }
  }

  // derived
  const timeLeftMs = status
    ? Math.max(0, (status.time_left_ms ?? 0) - (Date.now() - statusFetchedAt))
    : 0;
  const visibleTimeLeftMs = Math.max(timeLeftMs, visibleRoundEndsAtRef.current - Date.now());
  const isLocked = status?.status === "locked";
  const isOpen = status?.status === "open";
  const isCooldown = status?.status === "cooldown";
  const myBetsThisRound = myBets.filter((b) => status && b.round_id === status.round_id);
  const myTilesThisRound = new Set(myBetsThisRound.map((b) => b.tile));

  const setSelectedTiles = updateSelection;

  const onSegmentClick = (tile: number) => {
    if (!addr) { openConnectModal?.(); return; }
    if (isLocked || isCooldown) return;
    const next = new Set(selectedTilesRef.current);
    if (next.has(tile)) next.delete(tile); else next.add(tile);
    updateSelection(next);
  };

  const placeBetsForTiles = React.useCallback(async (tiles: number[], amt: number) => {
    if (!addr || tiles.length === 0) return;
    if (!(amt >= MIN_BET)) {
      setToast(`❌ Minimum bet is ${MIN_BET} zkLTC`);
      setTimeout(() => setToast(null), 3500);
      return;
    }
    const eth = (window as any).ethereum;
    if (!eth) {
      setToast("❌ No wallet found. Install MetaMask.");
      setTimeout(() => setToast(null), 3500);
      return;
    }
    setPlacing(true);
    try {
      await ensureLiteForge();
    } catch (e: any) {
      setPlacing(false);
      setToast(`❌ ${e?.message || "Wrong network. Switch to LiteForge."}`);
      setTimeout(() => setToast(null), 3500);
      return;
    }
    const provider = new BrowserProvider(eth);
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== CHAIN_ID) {
      setPlacing(false);
      setToast("❌ Wrong network. Switch to LiteForge (4441).");
      setTimeout(() => setToast(null), 3500);
      return;
    }
    const signer = await provider.getSigner();
    const contract = new Contract(CONTRACT_ADDRESS, BET_ABI, signer);
    const value = parseEther(String(amt));

    let okCount = 0;
    let errMsg: string | null = null;
    let lastTxHash: string | null = null;
    const tilesArray = tiles.filter((t) => !myTilesThisRound.has(t)).map(Number);
    if (tilesArray.length === 0) {
      setPlacing(false);
      return;
    }
    const totalValue = value * BigInt(tilesArray.length);
    try {
      const tx = tilesArray.length === 1
        ? await contract.placeBet(tilesArray[0], { value: totalValue })
        : await contract.placeBetMulti(tilesArray, { value: totalValue });
      const receipt = await tx.wait();
      const txHash: string = receipt?.hash ?? tx.hash;
      lastTxHash = txHash;
      okCount = tilesArray.length;
      sounds.betPlaced();
      // notify backend for each tile
      for (const tile of tilesArray) {
        try {
          await fetch(CONFIRM_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wallet: addr, tile: Number(tile), amount: Number(amt), tx_hash: txHash }),
          });
        } catch { /* non-fatal */ }
      }
    } catch (e: any) {
      errMsg = e?.shortMessage || e?.reason || e?.message || "tx failed";
    }
    setPlacing(false);
    if (okCount > 0) {
      const shortTx = lastTxHash ? `${lastTxHash.slice(0, 8)}…${lastTxHash.slice(-6)}` : "";
      setToast(
        lastTxHash
          ? `✓ Bet placed on ${okCount} tile${okCount > 1 ? "s" : ""} · TX ${shortTx}`
          : `✓ Bet placed on ${okCount} tile${okCount > 1 ? "s" : ""}`
      );
      setLastTxHash(lastTxHash);
      selectedTilesRef.current = new Set();
      setSelectedTilesState(new Set());
      loadMyBets();
      loadStatus();
      setMyBetsRefresh((n) => n + 1);
      window.setTimeout(() => setMyBetsRefresh((n) => n + 1), 2500);
    } else if (errMsg) {
      setToast(`❌ ${errMsg}`);
    }
    setTimeout(() => setToast(null), 6000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addr, loadMyBets, loadStatus]);

  // AUTO BETTING — when round changes and we still have rounds left, place bets
  React.useEffect(() => {
    if (!autoCfg || !isOpen || !status?.round_id || !addr) return;
    if (autoCfg.roundsLeft <= 0 && !autoCfg.autoReload) {
      setAutoCfg(null);
      return;
    }
    if (lastAutoBetRoundRef.current === status.round_id) return;
    lastAutoBetRoundRef.current = status.round_id;
    (async () => {
      await placeBetsForTiles(autoCfg.tiles, autoCfg.amount);
      setAutoCfg((cur) => {
        if (!cur) return cur;
        if (cur.autoReload) return cur;
        const next = { ...cur, roundsLeft: cur.roundsLeft - 1 };
        if (next.roundsLeft <= 0) return null;
        return next;
      });
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCfg, isOpen, status?.round_id, addr]);

  // clear selection when round changes (so a fresh round starts clean)
  React.useEffect(() => {
    selectedTilesRef.current = new Set();
    setSelectedTilesState(new Set());
  }, [status?.round_id]);



  // wheel geometry (responsive: shrinks on mobile)
  const [SIZE, setSIZE] = React.useState<number>(() => {
    if (typeof window === "undefined") return 560;
    const w = window.innerWidth;
    return w < 768 ? Math.min(Math.max(w - 48, 280), 400) : 560;
  });
  React.useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      setSIZE(w < 768 ? Math.min(Math.max(w - 48, 280), 400) : 560);
    };
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  // approximate total round window for progress bar — use whatever we last saw
  const totalRoundMsRef = React.useRef<number>(60000);
  React.useEffect(() => {
    const apiTimeLeft = status?.time_left_ms ?? 0;
    if (status?.status === "open" && apiTimeLeft > totalRoundMsRef.current) {
      totalRoundMsRef.current = apiTimeLeft;
    }
  }, [status]);
  const cooldownMsLeft = isCooldown
    ? Math.max(0, (status?.cooldown_ms ?? cooldownSeconds * 1000))
    : 0;

  return (
    <div className="app zone-mode" style={{ minHeight: "100vh", background: "#f3f4f6", backgroundImage: "linear-gradient(rgba(15,23,42,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(15,23,42,.06) 1px,transparent 1px)", backgroundSize: "32px 32px" }}>
      <style>{`@keyframes pvpSpinIn { from { transform: rotate(-360deg); } to { transform: rotate(0); } }`}</style>
      <div className="topbar">
        <div className="logo" style={{ cursor: "pointer" }} onClick={onBack}>
          <img src="https://raw.githubusercontent.com/dopedopex/your-friendly-helper/main/logo.png" alt="" width={36} height={36} style={{ borderRadius: 10, objectFit: "cover" }} />
          <div><h1>Bets<b>On</b>Block</h1></div>
        </div>
        <div className="pvp-topbar-mid" style={{ flex: 1, display: "flex", justifyContent: "center", padding: "0 16px" }}>
          <div className="pvp-drand-bar" style={{
            background: "#ffffff", border: "2px solid #0f172a",
            borderRadius: 12, padding: "8px 14px", boxShadow: "3px 3px 0 0 rgba(15,23,42,.9)", color: "#0f172a",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
            minWidth: 360, maxWidth: 560, width: "100%",
          }}>
            <div className="side-head" style={{ fontSize: 12, marginBottom: 0 }}>
              <Shield size={13} style={{ verticalAlign: "middle", marginRight: 6, color: "#7c5cff" }} />
              Drand · <span style={{ color: "#7c5cff" }}>Target</span> · #{status?.drand_target_round ?? "—"} · Round <span style={{ color: "#0f172a" }}>#{status?.round_id ?? "—"}</span>
            </div>
            {status?.drand_verify_url && (
              <a href={status.drand_verify_url} target="_blank" rel="noreferrer"
                className="verify-btn"
                style={{ gap: 6, textDecoration: "none", whiteSpace: "nowrap" }}>
                Verify on Drand <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
        <div className="pvp-topbar-right" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 10 }}>
          <AboutModal onOpen={onAbout} />
          <MyBetsModal address={addr} refreshKey={myBetsRefresh} />
          <span className="live-head" style={{ display: "inline-flex", alignItems: "center" }}><span className="pulse" /> PVP <b className="mono" style={{ marginLeft: 4 }}>#{status?.round_id ?? "…"}</b></span>
        </div>

      </div>

      <div className="wrap" style={{ paddingTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
          <button className="back-link" onClick={onBack} style={{ color: "#0f172a" }}><ArrowLeft size={14} /> Back to home</button>
        </div>



        <div className="pvp-3col" style={{ display: "grid", gridTemplateColumns: "320px 1fr 320px", gap: 22, alignItems: "start" }}>
          {/* BET PANEL */}
          <BetPanel
            roundId={status?.round_id ?? null}
            statusLabel={isOpen ? "Mining Open" : isLocked ? "Verifying" : isCooldown ? "Resolving" : "—"}
            isOpen={isOpen}
            isLocked={isLocked}
            isCooldown={isCooldown}
            selectedTiles={selectedTiles}
            setSelectedTiles={setSelectedTiles}
            onPlaceBets={placeBetsForTiles}
            placing={placing}
            myBets={myBetsThisRound.map((b) => ({ tile: b.tile, amount: Number(b.amount) }))}
            walletConnected={!!addr}
            walletAddress={addr}
            onConnect={() => openConnectModal?.()}
            autoActive={!!autoCfg}
            autoRoundsLeft={autoCfg?.autoReload ? Infinity as any : (autoCfg?.roundsLeft ?? 0)}
            onStartAuto={(cfg) => { lastAutoBetRoundRef.current = null; setAutoCfg(cfg); }}
            onStopAuto={() => setAutoCfg(null)}
          />

          {/* WHEEL COLUMN */}
          <div className="pvp-wheel-col" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* WHEEL */}
            <div className="pvp-wheel-card" style={{
              background: "radial-gradient(ellipse at center, #ffffff 0%, #f1f3f7 75%)",
              border: "2px solid #0f172a", borderRadius: 22,
              boxShadow: "4px 4px 0 0 rgba(15,23,42,.9)",
              padding: 24,
              display: "flex", justifyContent: "center", alignItems: "center",
              position: "relative", minHeight: 600,
            }}>
              <PvpWheelVisual
                size={SIZE}
                tiles={TILES}
                roundId={status?.round_id ?? null}
                timeLeftMs={visibleTimeLeftMs}
                totalRoundMs={totalRoundMsRef.current}
                isOpen={isOpen}
                isLocked={isLocked}
                isCooldown={isCooldown}
                cooldownMs={cooldownMsLeft || cooldownSeconds * 1000}
                players={myBets.filter((b) => b.round_id === status?.round_id).length}
                pot={animationWinner?.total_pool ?? status?.total_pool ?? 0}
                winningTile={animationWinner?.winning_tile ?? null}
                animationRoundId={animationWinner?.round_id ?? null}
                isBonanza={animationWinner?.is_bonanza === 1}
                myTiles={myTilesThisRound}
                myPayout={(() => {
                  if (!addr || !animationWinner?.payouts) return null;
                  const p = animationWinner.payouts.find(
                    (x) => x.wallet?.toLowerCase() === addr
                  );
                  return p?.payout != null ? Number(p.payout) : 0;
                })()}
                selectedTiles={selectedTiles}
                onTileClick={onSegmentClick}
                onAnimationComplete={() => {
                  console.log("[Animation] completed", animationWinner);
                  clearHistoryRetry();
                  setAnimationWinner(null);
                  pendingAnimationRoundRef.current = null;
                  prevStatusRef.current = "";
                  prevRoundRef.current = null;
                }}
              />

            </div>
          </div>

          {/* ENDED ROUNDS (right column) */}
          <EndedRoundsPanel history={history} loading={historyLoading} onVerify={openVerify} />
        </div>

        

      </div>



      {/* VERIFY MODAL */}
      {verifyModal && (
        <div className="modal-bg" onClick={() => setVerifyModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              <Shield size={18} style={{ display: "inline", marginRight: 8, verticalAlign: "-3px" }} />
              How this round resolved
            </h3>
            <p className="sub">
              Round #{verifyModal.round_id} — every step below is derived only from public Drand randomness, so you can re-run it yourself.
            </p>

            {verifyModal.loading && <div className="empty">Loading round #{verifyModal.round_id}…</div>}
            {verifyModal.error && <div className="warn">Could not load round #{verifyModal.round_id}: {verifyModal.error}</div>}

            {verifyModal.data && (() => {
              const d = verifyModal.data!;
              const rand = (d.drand_randomness || "").replace(/^0x/, "");
              let bigStr = "—", remStr = "—";
              try {
                if (rand) {
                  const big = BigInt("0x" + rand);
                  bigStr = big.toString();
                  remStr = (big % 30n).toString();
                }
              } catch { /* */ }
              const shortHex = rand.length > 40 ? rand.slice(0, 40) + "…" : rand;
              const shortBig = bigStr.length > 40 ? bigStr.slice(0, 40) + "…" : bigStr;
              const tile = d.winning_tile;
              return (
                <>
                  <PvpAccordion
                    name="PVP Tiles"
                    result={`Tile ${tile}`}
                    steps={[
                      [`Drand randomness (round #${d.drand_target_round ?? "—"})`, shortHex || "—"],
                      ["Convert hex → BigInt", shortBig],
                      ["BigInt % 30 (get 0-29)", remStr],
                      ["Add 1 (tiles are 1-30)", `${remStr} + 1 = ${tile}`],
                    ]}
                  />

                  {d.drand_verify_url && (
                    <a className="pf-btn" style={{ marginTop: 12 }}
                      href={d.drand_verify_url} target="_blank" rel="noreferrer">
                      Verify on Drand <ExternalLink size={11} />
                    </a>
                  )}
                </>
              );
            })()}

            <button className="modal-close" onClick={() => setVerifyModal(null)}>Close</button>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#0a0a0a", color: "#fde047",
          border: "3px solid #000", borderRadius: 12,
          boxShadow: "5px 5px 0 0 #000",
          padding: "12px 18px",
          fontFamily: "'Space Grotesk',system-ui,sans-serif",
          fontWeight: 900, fontSize: 14, letterSpacing: ".04em",
          zIndex: 1000,
          animation: "fade-in .3s ease-out",
        }}>
          <span>{toast}</span>
          {lastTxHash && (
            <a
              href={`${EXPLORER_TX}/${lastTxHash}`}
              target="_blank"
              rel="noreferrer"
              style={{ marginLeft: 12, color: "#7c5cff", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              View TX <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function PvpAccordion({ name, result, steps }: { name: string; result: string; steps: Array<[string, string]> }) {
  const [open, setOpen] = React.useState(true);
  return (
    <div className="pf-game">
      <button className="pf-game-head" onClick={() => setOpen((o) => !o)}>
        <span className="gn">{name}</span>
        <span className="gr">{result}</span>
        <span className={`chev ${open ? "o" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="pf-steps">
          {steps.map(([label, val], i) => (
            <div className="pf-step" key={i}>
              <span className="si">{i + 1}</span>
              <span className="sl">{label}</span>
              {val && <span className="sv">{val}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EndedRoundsPanel({ history, loading, onVerify }: { history: EndedRound[]; loading: boolean; onVerify: (id: number) => void }) {
  const PAGE_SIZE = 10;
  const [page, setPage] = React.useState(0);
  const totalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
  React.useEffect(() => { if (page >= totalPages) setPage(totalPages - 1); }, [page, totalPages]);
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = history.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const btn: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 4,
    background: "#ffffff", border: "1.5px solid #0f172a",
    color: "#0f172a", fontWeight: 800, fontSize: 11,
    padding: "6px 10px", borderRadius: 8, cursor: "pointer",
    fontFamily: "inherit", letterSpacing: ".05em", textTransform: "uppercase",
    boxShadow: "2px 2px 0 0 rgba(15,23,42,.85)",
  };

  return (
    <div style={{
      background: "#ffffff", border: "2px solid #0f172a",
      borderRadius: 14, padding: 18, boxShadow: "4px 4px 0 0 rgba(15,23,42,.9)", color: "#0f172a",
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div className="side-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 0 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <History size={15} /> Ended Rounds
        </span>
        <span className="side-head" style={{
          fontSize: 12, padding: "3px 10px", borderRadius: 999,
          background: "rgba(124,92,255,.12)", color: "#7c5cff",
          border: "1px solid rgba(124,92,255,.4)", marginBottom: 0,
        }}>{history.length} Total</span>
      </div>
      <div style={{ borderTop: "1px solid rgba(15,23,42,.10)", paddingTop: 10, minHeight: 480 }}>
        {loading && history.length === 0 ? (
          <div style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 10, padding: "24px 0" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#7c5cff", display: "inline-block", animation: "pulse 1.4s cubic-bezier(0.4,0,0.6,1) infinite" }} />
            Loading rounds…
          </div>
        ) : history.length === 0 ? (
          <div style={{ fontSize: 11, color: "#64748b" }}>No settled rounds yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pageItems.map((r) => (
              <div key={r.round_id}
                style={{
                  background: "#ffffff", border: "1.5px solid #0f172a",
                  borderRadius: 11, padding: "10px 12px",
                  boxShadow: "2px 2px 0 0 rgba(15,23,42,.85)",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                }}>
                <span className="mono" style={{ color: "#0f172a", fontWeight: 800, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  #{r.round_id} · Tile <span style={{ color: "#7c5cff" }}>{r.winning_tile}</span>
                  {r.is_bonanza === 1 && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 3,
                      background: "linear-gradient(90deg,#fbbf24,#f59e0b)",
                      color: "#7c2d12", fontWeight: 900, fontSize: 10,
                      padding: "2px 7px", borderRadius: 999,
                      border: "1.5px solid #b45309",
                      letterSpacing: ".06em", textTransform: "uppercase",
                      boxShadow: "0 0 8px rgba(253,224,71,.65)",
                    }}>🎉 BONANZA</span>
                  )}
                </span>
                <button className="verify-btn" onClick={() => onVerify(r.round_id)}>Verify</button>

              </div>
            ))}
          </div>
        )}
      </div>
      {history.length > PAGE_SIZE && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 8, paddingTop: 8, borderTop: "1px solid rgba(15,23,42,.10)",
        }}>
          <button
            style={{ ...btn, opacity: safePage <= 0 ? 0.4 : 1, cursor: safePage <= 0 ? "not-allowed" : "pointer" }}
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft size={12} /> Prev
          </button>
          <span style={{ fontSize: 11, color: "#475569", fontWeight: 800, letterSpacing: ".05em" }}>
            Page {safePage + 1} of {totalPages}
          </span>
          <button
            style={{ ...btn, opacity: safePage >= totalPages - 1 ? 0.4 : 1, cursor: safePage >= totalPages - 1 ? "not-allowed" : "pointer" }}
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Next <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}