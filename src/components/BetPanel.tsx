import React from "react";
import Coin from "./Coin";
import MysteryBox from "./MysteryBox";



const TILES = 30;

type Mode = "manual" | "auto";

export type AutoConfig = {
  tiles: number[];
  amount: number;
  roundsLeft: number;
  autoReload: boolean;
};

export default function BetPanel({
  roundId,
  statusLabel,
  isOpen,
  isLocked,
  isCooldown,
  selectedTiles,
  setSelectedTiles,
  onPlaceBets,
  placing,
  myBets,
  walletConnected,
  walletAddress,
  onConnect,
  autoActive,
  autoRoundsLeft,
  onStartAuto,
  onStopAuto,
}: {
  roundId: number | null;
  statusLabel: string;
  isOpen: boolean;
  isLocked: boolean;
  isCooldown: boolean;
  selectedTiles: Set<number>;
  setSelectedTiles: (s: Set<number>) => void;
  onPlaceBets: (tiles: number[], amount: number) => Promise<void>;
  placing: boolean;
  myBets: Array<{ tile: number; amount: number }>;
  walletConnected: boolean;
  walletAddress?: string | null;
  onConnect: () => void;
  autoActive: boolean;
  autoRoundsLeft: number;
  onStartAuto: (cfg: AutoConfig) => void;
  onStopAuto: () => void;
}) {
  const [betsPlacedCount, setBetsPlacedCount] = React.useState(0);
  const [mode, setMode] = React.useState<Mode>("manual");
  const [amount, setAmount] = React.useState("0.01");
  const [rounds, setRounds] = React.useState("1");
  const [autoReload, setAutoReload] = React.useState(false);

  const count = selectedTiles.size;
  const amt = Number(amount) || 0;
  const roundsNum = Math.max(1, Math.min(20, Number(rounds) || 1));
  const total = amt * count;
  const totalAll = total * roundsNum;
  const lockedUI = isLocked || isCooldown;

  const allTiles = React.useMemo(() => Array.from({ length: TILES }, (_, i) => i + 1), []);
  const setAll = (tiles: number[]) => setSelectedTiles(new Set(tiles));
  const setEven = () => setAll(allTiles.filter((n) => n % 2 === 0));
  const setOdd = () => setAll(allTiles.filter((n) => n % 2 === 1));
  const setAllSel = () => setAll(allTiles);
  const clearSel = () => setAll([]);

  // Derived active filter (no async state — instant + race-free)
  const isAllActive = count === TILES;
  const isEvenActive = !isAllActive && count === TILES / 2 && Array.from(selectedTiles).every((n) => n % 2 === 0);
  const isOddActive = !isAllActive && count === TILES / 2 && Array.from(selectedTiles).every((n) => n % 2 === 1);
  const bumpAmt = (delta: number) => {
    const next = Math.max(0, +(amt + delta).toFixed(4));
    setAmount(String(next));
  };

  const canPlace = walletConnected && count > 0 && amt > 0 && !lockedUI && !placing;
  const placeBets = async () => {
    if (!canPlace) return;
    const tiles = Array.from(selectedTiles);
    await onPlaceBets(tiles, amt);
    setBetsPlacedCount((c) => c + tiles.length);
  };

  const startAuto = () => {
    if (!walletConnected) { onConnect(); return; }
    if (count === 0 || amt <= 0) return;
    onStartAuto({
      tiles: Array.from(selectedTiles),
      amount: amt,
      roundsLeft: roundsNum,
      autoReload,
    });
  };

  // Shared UI
  const QuickBtn = ({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }) => (
    <button
      onClick={onClick}
      style={{
        background: active ? "#f1f5f9" : "transparent",
        color: "#0f172a",
        border: "1px solid #0f172a",
        borderRadius: 6,
        padding: "6px 12px",
        fontFamily: "ui-monospace,monospace",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >{label}</button>
  );

  return (
    <div
      style={{
        background: "#ffffff",
        border: "2px solid #0f172a",
        borderRadius: 14,
        boxShadow: "4px 4px 0 0 rgba(15,23,42,.9)",
        padding: 18,
        color: "#0f172a",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div className="side-head" style={{ fontSize: 13, marginBottom: 0 }}>
          Round #{roundId ?? "—"} · <span style={{ color: "#7c5cff" }}>{statusLabel}</span>
        </div>
        {autoActive && (
          <div className="side-head" style={{
            fontSize: 11, padding: "3px 8px", borderRadius: 999,
            background: "rgba(124,92,255,.12)", color: "#7c5cff",
            border: "1px solid rgba(124,92,255,.4)", marginBottom: 0,
          }}>Auto · {autoRoundsLeft} left</div>
        )}
      </div>

      {/* TABS — manual only */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", borderBottom: "1px solid #0f172a" }}>
        <button
          onClick={() => setMode("manual")}
          className="side-head"
          style={{
            background: "transparent", border: 0, cursor: "default",
            padding: "10px 0", margin: 0,
            color: "#7c5cff", fontSize: 14,
            borderBottom: "2px solid #fb923c",
          }}
        >Manual</button>
      </div>

      {/* TILES SELECTION */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div className="side-head" style={{ fontSize: 13, marginBottom: 0 }}>
          {mode === "auto" ? "Blocks" : "Tiles"} <b style={{ color: "#0f172a" }}>{count}</b> <span style={{ fontWeight: 600, color: "#475569" }}>selected</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <QuickBtn label="Even" onClick={setEven} active={isEvenActive} />
          <QuickBtn label="Odd" onClick={setOdd} active={isOddActive} />
          <QuickBtn label="All" onClick={setAllSel} active={isAllActive} />
          <button onClick={clearSel} title="Clear" style={{
            background: "transparent", border: "1px solid #0f172a",
            color: "#475569", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontWeight: 700,
          }}>×</button>
        </div>
      </div>

      {/* MYSTERY BOX */}
      <MysteryBox walletAddress={walletAddress ?? null} totalBetsPlaced={betsPlacedCount} />

      {/* AMOUNT */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
          <div className="side-head" style={{ fontSize: 13, marginBottom: 0 }}>
            {mode === "auto" ? "zkLTC" : "Amount"} <span style={{ color: "#64748b", fontWeight: 600 }}>· Min 0.01</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <QuickBtn label="+0.01" onClick={() => bumpAmt(0.01)} />
            <QuickBtn label="+0.1" onClick={() => bumpAmt(0.1)} />
            <QuickBtn label="+1" onClick={() => bumpAmt(1)} />
            <button onClick={() => setAmount("0")} style={{
              background: "transparent", border: "1px solid #0f172a",
              color: "#475569", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontWeight: 700,
            }}>×</button>
          </div>
        {mode === "manual" && (
          <div style={{ marginTop: 6, fontSize: 12, color: "#475569", fontWeight: 700 }}>
            Total: <span style={{ color: "#0f172a", fontFamily: "ui-monospace,monospace" }}>{total.toFixed(4)} zkLTC</span> for {count} tile{count === 1 ? "" : "s"}
          </div>
        )}
      </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Coin size={28} />
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            style={{
              background: "transparent", border: 0, outline: 0,
              color: "#0f172a", fontWeight: 800, fontSize: 28,
              fontFamily: "ui-monospace,monospace",
              width: "100%",
            }}
            placeholder="0.0"
          />
        </div>
      </div>

      {/* AUTO-only fields */}
      {mode === "auto" && (
        <>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            paddingTop: 10, borderTop: "1px solid rgba(15,23,42,.10)",
          }}>
            <div style={{ fontWeight: 800, fontSize: 13 }}>Rounds</div>
            <input
              type="text"
              inputMode="numeric"
              value={rounds}
              onChange={(e) => setRounds(e.target.value.replace(/[^\d]/g, ""))}
              style={{
                background: "transparent", border: 0, outline: 0,
                color: "#0f172a", fontWeight: 800, fontSize: 16, textAlign: "right",
                width: 60, fontFamily: "ui-monospace,monospace",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 13 }}>Auto-reload</div>
            <button
              onClick={() => setAutoReload((v) => !v)}
              style={{
                width: 38, height: 22, borderRadius: 999,
                background: autoReload ? "#7c5cff" : "#f1f5f9",
                border: 0, cursor: "pointer", position: "relative",
              }}
            >
              <span style={{
                position: "absolute", top: 2, left: autoReload ? 18 : 2,
                width: 18, height: 18, borderRadius: "50%", background: "#0f172a",
                transition: "left 160ms ease",
              }} />
            </button>
          </div>
          <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.45, marginTop: -6 }}>
            Round zkLTC rewards can be added back to this auto budget before the next round.
          </div>
          <div style={{ borderTop: "1px solid rgba(15,23,42,.10)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            <Row label="Total per round" value={total.toFixed(5)} />
            <Row label="Total" value={totalAll.toFixed(5)} />
          </div>
        </>
      )}

      {/* MY BETS */}
      <div style={{ borderTop: "1px solid rgba(15,23,42,.10)", paddingTop: 10 }}>
        <div className="side-head" style={{ fontSize: 13, marginBottom: 6 }}>
          My Bets This Round
        </div>
        {myBets.length === 0 ? (
          <div style={{ fontSize: 11, color: "#64748b" }}>No bets yet this round.</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {myBets.map((b) => (
              <span key={b.tile} style={{
                fontSize: 11, fontFamily: "ui-monospace,monospace", fontWeight: 800,
                background: "rgba(34,197,94,.12)", color: "#86efac",
                border: "1px solid rgba(34,197,94,.4)", borderRadius: 6,
                padding: "3px 7px",
              }}>#{b.tile} · {b.amount.toFixed(3)}</span>
            ))}
          </div>
        )}
      </div>

      {/* BUTTON */}
      {mode === "manual" ? (
        <button
          className="verify-btn"
          onClick={walletConnected ? placeBets : onConnect}
          disabled={walletConnected && !canPlace}
          style={{
            width: "100%", marginTop: 4, padding: "14px",
            fontSize: 13, letterSpacing: ".14em",
            opacity: walletConnected && !canPlace ? 0.55 : 1,
            cursor: walletConnected && !canPlace ? "not-allowed" : "pointer",
          }}
        >
          {!walletConnected ? "Connect Wallet" :
            placing ? "Placing…" :
            count === 0 ? "Select Tiles" :
            amt <= 0 ? "Enter zkLTC Amount" :
            lockedUI ? "Round Locked" :
            `Place Bet · ${total.toFixed(3)} zkLTC`}
        </button>
      ) : (
        autoActive ? (
          <button onClick={onStopAuto} style={{
            width: "100%", background: "#ef4444", color: "#0f172a",
            border: 0, borderRadius: 10, padding: "14px",
            fontWeight: 900, fontSize: 14, letterSpacing: ".14em",
            textTransform: "uppercase", cursor: "pointer",
          }}>Stop Auto Betting</button>
        ) : (
          <button
            onClick={startAuto}
            disabled={walletConnected && (count === 0 || amt <= 0)}
            style={{
              width: "100%",
              background: (count > 0 && amt > 0) || !walletConnected ? "#7c5cff" : "rgba(124,92,255,.4)",
              color: "#fff", border: 0, borderRadius: 10,
              padding: "14px", fontWeight: 900, fontSize: 14,
              letterSpacing: ".14em", textTransform: "uppercase", cursor: "pointer",
            }}
          >
            {!walletConnected ? "Connect Wallet" : "Start Auto Betting"}
          </button>
        )
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "#475569" }}>{label}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "ui-monospace,monospace", fontWeight: 800, color: "#0f172a" }}>
        <Coin size={14} /> {value}
      </span>
    </div>
  );
}
