import React from "react";
import boxAsset from "@/assets/mystery-box.png.asset.json";

type Rarity = "common" | "rare" | "epic" | "legendary";

const RARITY = {
  common:    { color: "#CD853F", label: "COMMON",    min: 5,   max: 20 },
  rare:      { color: "#4fc3f7", label: "RARE",      min: 25,  max: 60 },
  epic:      { color: "#ce93d8", label: "EPIC",      min: 75,  max: 150 },
  legendary: { color: "#FFD700", label: "LEGENDARY!", min: 200, max: 500 },
} as const;

function rollRarity(): Rarity {
  const r = Math.random();
  if (r < 0.60) return "common";
  if (r < 0.88) return "rare";
  if (r < 0.98) return "epic";
  return "legendary";
}

const BETS_NEEDED = 10;
const MAX_BOXES = 3;

function todayKey(wallet: string) {
  const d = new Date();
  const day = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  return `mbx::${wallet.toLowerCase()}::${day}`;
}

type State = { betsProgress: number; todayBoxes: number; lastBetCount: number };

function loadState(wallet: string): State {
  try {
    const raw = localStorage.getItem(todayKey(wallet));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { betsProgress: 0, todayBoxes: 0, lastBetCount: 0 };
}
function saveState(wallet: string, s: State) {
  try { localStorage.setItem(todayKey(wallet), JSON.stringify(s)); } catch {}
}

export default function MysteryBox({
  walletAddress,
  totalBetsPlaced,
}: {
  walletAddress: string | null;
  totalBetsPlaced: number; // monotonically increasing count of bets the user has placed in this session
}) {
  const [state, setState] = React.useState<State>({ betsProgress: 0, todayBoxes: 0, lastBetCount: 0 });
  const [opening, setOpening] = React.useState(false);
  const [reward, setReward] = React.useState<{ rarity: Rarity; points: number } | null>(null);
  const [stage, setStage] = React.useState<"shake" | "burst" | "reveal">("shake");

  // Load when wallet changes
  React.useEffect(() => {
    if (!walletAddress) return;
    const s = loadState(walletAddress);
    // sync session bet count baseline
    setState({ ...s, lastBetCount: totalBetsPlaced });
     
  }, [walletAddress]);

  // Increment progress when totalBetsPlaced grows
  React.useEffect(() => {
    if (!walletAddress) return;
    setState((prev) => {
      const delta = Math.max(0, totalBetsPlaced - prev.lastBetCount);
      if (delta === 0) return prev;
      const nextProgress = Math.min(BETS_NEEDED, prev.betsProgress + delta);
      const next = { ...prev, betsProgress: nextProgress, lastBetCount: totalBetsPlaced };
      saveState(walletAddress, next);
      return next;
    });
  }, [totalBetsPlaced, walletAddress]);

  const canClaim = state.betsProgress >= BETS_NEEDED && state.todayBoxes < MAX_BOXES;
  const maxed = state.todayBoxes >= MAX_BOXES;

  const onClaim = () => {
    if (!walletAddress || !canClaim || opening) return;
    const rarity = rollRarity();
    const def = RARITY[rarity];
    const points = Math.floor(def.min + Math.random() * (def.max - def.min + 1));
    setReward({ rarity, points });
    setStage("shake");
    setOpening(true);
    // shake -> burst -> reveal
    window.setTimeout(() => setStage("burst"), 1500);
    window.setTimeout(() => setStage("reveal"), 2000);
    // auto-dismiss
    window.setTimeout(() => {
      setOpening(false);
      setReward(null);
      setState((prev) => {
        const next = { ...prev, betsProgress: 0, todayBoxes: prev.todayBoxes + 1 };
        saveState(walletAddress, next);
        return next;
      });
    }, 6000);
  };

  const dismiss = () => {
    if (!opening || !walletAddress) return;
    setOpening(false);
    setReward(null);
    setState((prev) => {
      const next = { ...prev, betsProgress: 0, todayBoxes: prev.todayBoxes + 1 };
      saveState(walletAddress, next);
      return next;
    });
  };

  const pct = Math.min(100, (state.betsProgress / BETS_NEEDED) * 100);

  return (
    <>
      <style>{`
        @keyframes mbx-wiggle {
          0%, 100% { transform: rotate(-4deg) translateY(0); }
          50% { transform: rotate(4deg) translateY(-2px); }
        }
        @keyframes mbx-pulse-btn {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,215,0,.6), 0 0 12px rgba(204,0,0,.6); }
          50% { box-shadow: 0 0 0 8px rgba(255,215,0,0), 0 0 22px rgba(255,215,0,.8); }
        }
        @keyframes mbx-shake {
          0%,100% { transform: translate(0,0) rotate(0); }
          20% { transform: translate(-8px,2px) rotate(-6deg); }
          40% { transform: translate(8px,-2px) rotate(6deg); }
          60% { transform: translate(-6px,3px) rotate(-4deg); }
          80% { transform: translate(6px,-1px) rotate(4deg); }
        }
        @keyframes mbx-burst {
          0% { transform: scale(1); opacity: 1; }
          60% { transform: scale(1.6); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes mbx-reveal {
          0% { transform: scale(.4); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes mbx-confetti {
          0% { transform: translateY(-20px) rotate(0); opacity: 1; }
          100% { transform: translateY(280px) rotate(720deg); opacity: 0; }
        }
        .mbx-wiggle { animation: mbx-wiggle 1.4s ease-in-out infinite; transform-origin: 50% 70%; }
      `}</style>

      <div style={{
        background: "rgba(20,0,0,0.8)",
        border: "1px solid #cc0000",
        borderRadius: 8,
        padding: 12,
        width: "100%",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        position: "relative",
      }}>
        <div style={{
          position: "absolute", top: 8, right: 10,
          fontSize: 10, fontWeight: 800, letterSpacing: ".08em",
          background: "rgba(204,0,0,.25)", color: "#ff6b6b",
          border: "1px solid #cc0000", borderRadius: 999,
          padding: "2px 8px",
        }}>Today: {state.todayBoxes}/{MAX_BOXES} box</div>

        <div style={{ width: 90, height: 90, marginTop: 14 }} className={canClaim && !opening ? "mbx-wiggle" : undefined}>
          <img src={boxAsset.url} alt="Mystery Box" style={{ width: "100%", height: "100%", objectFit: "contain", filter: canClaim ? "drop-shadow(0 0 10px rgba(255,215,0,.6))" : "drop-shadow(0 4px 8px rgba(0,0,0,.6))" }} />
        </div>

        {!maxed && (
          <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,.08)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{
              width: `${pct}%`, height: "100%",
              background: canClaim
                ? "linear-gradient(90deg,#cc0000,#FFD700)"
                : "rgba(255,255,255,.25)",
              transition: "width 240ms ease",
            }} />
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 8 }}>
          {maxed ? (
            <div style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: 700, color: "#ff9999", padding: "8px 0" }}>
              Come back tomorrow
            </div>
          ) : (
            <>
              <button
                onClick={onClaim}
                disabled={!canClaim}
                style={{
                  flex: 1,
                  background: canClaim
                    ? "linear-gradient(90deg,#cc0000,#FFD700)"
                    : "rgba(255,255,255,.08)",
                  color: canClaim ? "#0f172a" : "#888",
                  border: "1px solid " + (canClaim ? "#FFD700" : "#444"),
                  borderRadius: 6,
                  padding: "8px 12px",
                  fontWeight: 900,
                  fontSize: 12,
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  cursor: canClaim ? "pointer" : "not-allowed",
                  animation: canClaim ? "mbx-pulse-btn 1.6s ease-in-out infinite" : undefined,
                }}
              >
                {canClaim ? "Claim 🎁" : "Claim"}
              </button>
              <div style={{ fontSize: 11, color: "#cbd5e1", fontFamily: "ui-monospace,monospace", fontWeight: 700, whiteSpace: "nowrap" }}>
                {state.betsProgress}/{BETS_NEEDED} bets
              </div>
            </>
          )}
        </div>
      </div>

      {opening && reward && (
        <div
          onClick={dismiss}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <div style={{ position: "relative", width: 280, height: 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {stage !== "reveal" && (
              <img
                src={boxAsset.url}
                alt="Opening"
                style={{
                  width: 220, height: 220, objectFit: "contain",
                  animation: stage === "shake" ? "mbx-shake .25s ease-in-out infinite" : "mbx-burst .5s ease-out forwards",
                  filter: "drop-shadow(0 0 24px rgba(255,215,0,.6))",
                }}
              />
            )}
            {stage === "reveal" && (
              <div style={{
                animation: "mbx-reveal .5s ease-out forwards",
                background: "rgba(20,0,0,.9)",
                border: `3px solid ${RARITY[reward.rarity].color}`,
                borderRadius: 14,
                padding: "28px 36px",
                textAlign: "center",
                boxShadow: `0 0 40px ${RARITY[reward.rarity].color}80`,
              }}>
                <div style={{
                  fontSize: 42, fontWeight: 900, color: "#fff",
                  fontFamily: "ui-monospace,monospace",
                  textShadow: `0 0 12px ${RARITY[reward.rarity].color}`,
                }}>+{reward.points} pts</div>
                <div style={{
                  marginTop: 6, fontSize: 16, fontWeight: 900, letterSpacing: ".2em",
                  color: RARITY[reward.rarity].color,
                }}>{RARITY[reward.rarity].label}</div>
              </div>
            )}
            {stage === "reveal" && reward.rarity === "legendary" && (
              <>
                {Array.from({ length: 30 }).map((_, i) => {
                  const colors = ["#FFD700", "#ff6b6b", "#4fc3f7", "#ce93d8", "#fff"];
                  const left = Math.random() * 280;
                  const delay = Math.random() * 0.5;
                  const bg = colors[i % colors.length];
                  return (
                    <span key={i} style={{
                      position: "absolute", top: 0, left,
                      width: 8, height: 12, background: bg,
                      animation: `mbx-confetti 1.8s ${delay}s ease-in forwards`,
                      borderRadius: 2,
                    }} />
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
