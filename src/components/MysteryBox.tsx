import React from "react";
import { createPortal } from "react-dom";
import boxImg from "@/assets/mystery-box-3d.png";

type Rarity = "common" | "rare" | "epic" | "legendary";

const RARITY = {
  common:    { color: "#CD853F", label: "COMMON",     min: 5,   max: 20 },
  rare:      { color: "#4fc3f7", label: "RARE",       min: 25,  max: 60 },
  epic:      { color: "#ce93d8", label: "EPIC",       min: 75,  max: 150 },
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
  totalBetsPlaced: number;
}) {
  const [state, setState] = React.useState<State>({ betsProgress: 0, todayBoxes: 0, lastBetCount: 0 });
  const [open, setOpen] = React.useState(false);
  const [stage, setStage] = React.useState<"idle" | "shake" | "burst" | "reveal">("idle");
  const [reward, setReward] = React.useState<{ rarity: Rarity; points: number } | null>(null);
  const [rotY, setRotY] = React.useState(-20);
  const [rotX, setRotX] = React.useState(-15);
  const dragRef = React.useRef<{ x: number; y: number; rx: number; ry: number; moved: boolean } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (stage !== "idle") return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, rx: rotX, ry: rotY, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) dragRef.current.moved = true;
    setRotY(dragRef.current.ry + dx * 0.6);
    setRotX(Math.max(-80, Math.min(80, dragRef.current.rx - dy * 0.6)));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const moved = dragRef.current?.moved;
    dragRef.current = null;
    if (!moved && canClaimRef.current && stage === "idle") onBoxClick();
  };
  const canClaimRef = React.useRef(false);

  React.useEffect(() => {
    if (!walletAddress) {
      setState({ betsProgress: 0, todayBoxes: 0, lastBetCount: 0 });
      return;
    }
    const s = loadState(walletAddress);
    setState({ ...s, lastBetCount: totalBetsPlaced });
     
  }, [walletAddress]);

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

  const canClaim = !!walletAddress && state.betsProgress >= BETS_NEEDED && state.todayBoxes < MAX_BOXES;
  const maxed = state.todayBoxes >= MAX_BOXES;
  canClaimRef.current = canClaim;

  const openModal = () => {
    setStage("idle");
    setReward(null);
    setOpen(true);
  };
  const closeModal = () => {
    if (stage === "shake" || stage === "burst") return;
    setOpen(false);
    setStage("idle");
    setReward(null);
  };

  const onBoxClick = () => {
    if (!canClaim || stage !== "idle") return;
    const rarity = rollRarity();
    const def = RARITY[rarity];
    const points = Math.floor(def.min + Math.random() * (def.max - def.min + 1));
    setReward({ rarity, points });
    setStage("shake");
    window.setTimeout(() => setStage("burst"), 1500);
    window.setTimeout(() => {
      setStage("reveal");
      if (walletAddress) {
        setState((prev) => {
          const next = { ...prev, betsProgress: 0, todayBoxes: prev.todayBoxes + 1 };
          saveState(walletAddress, next);
          return next;
        });
      }
    }, 2000);
  };

  const pct = Math.min(100, (state.betsProgress / BETS_NEEDED) * 100);

  return (
    <>
      <style>{`
        @keyframes mbx-wiggle {
          0%, 100% { transform: rotate(-4deg) translateY(0); }
          50% { transform: rotate(4deg) translateY(-3px); }
        }
        @keyframes mbx-pulse-btn {
          0%, 100% { box-shadow: 5px 5px 0 0 rgba(0,0,0,.9), 0 0 0 0 rgba(204,0,0,.6); }
          50% { box-shadow: 5px 5px 0 0 rgba(0,0,0,.9), 0 0 0 8px rgba(204,0,0,0); }
        }
        @keyframes mbx-shake {
          0%,100% { transform: translate(0,0) rotate(0); }
          20% { transform: translate(-10px,3px) rotate(-8deg); }
          40% { transform: translate(10px,-3px) rotate(8deg); }
          60% { transform: translate(-8px,4px) rotate(-6deg); }
          80% { transform: translate(8px,-2px) rotate(6deg); }
        }
        @keyframes mbx-burst {
          0% { transform: scale(1); opacity: 1; }
          60% { transform: scale(1.6); opacity: 1; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes mbx-reveal {
          0% { transform: scale(.4); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes mbx-confetti {
          0% { transform: translateY(-20px) rotate(0); opacity: 1; }
          100% { transform: translateY(320px) rotate(720deg); opacity: 0; }
        }
        @keyframes mbx-float {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-8px) rotate(3deg); }
        }
        .mbx-float-idle { animation: mbx-float 3s ease-in-out infinite; transform-origin: 50% 70%; }
        .mbx-wiggle-ready { animation: mbx-wiggle 0.6s ease-in-out infinite; transform-origin: 50% 70%; }
      `}</style>

      {/* TOPBAR TRIGGER BUTTON — same family as About / My Bets */}
      <button
        onClick={openModal}
        title="Mystery Box"
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#fff", color: "#0a0a0a", border: "3px solid #000",
          borderRadius: 12, padding: "10px 14px", fontWeight: 900,
          fontFamily: "'Space Grotesk',system-ui,sans-serif",
          letterSpacing: ".04em", textTransform: "uppercase",
          boxShadow: "5px 5px 0 0 rgba(0,0,0,.9)", cursor: "pointer",
          fontSize: 12, lineHeight: 1, position: "relative",
          animation: canClaim ? "mbx-pulse-btn 1.6s ease-in-out infinite" : undefined,
        }}
        onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translate(3px,3px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "2px 2px 0 0 rgba(0,0,0,.9)"; }}
        onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ""; (e.currentTarget as HTMLButtonElement).style.boxShadow = "5px 5px 0 0 rgba(0,0,0,.9)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ""; (e.currentTarget as HTMLButtonElement).style.boxShadow = "5px 5px 0 0 rgba(0,0,0,.9)"; }}
      >
        <span style={{ fontSize: 14 }}>🎁</span> Mystery Box
        {canClaim && (
          <span style={{
            background: "#cc0000", color: "#fff", borderRadius: 999,
            padding: "2px 7px", fontSize: 10, border: "2px solid #000",
            marginLeft: 2,
          }}>READY</span>
        )}
      </button>

      {open && createPortal((
        <div
          onClick={closeModal}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
            background: "rgba(0,0,0,.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", border: "3px solid #000",
              borderRadius: 18, padding: "28px 24px 24px",
              boxShadow: "8px 8px 0 0 rgba(0,0,0,.9)",
              width: "100%", maxWidth: 360,
              position: "relative",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
              fontFamily: "'Space Grotesk',system-ui,sans-serif",
            }}
          >
            <button
              onClick={closeModal}
              aria-label="Close"
              style={{
                position: "absolute", top: 10, right: 10,
                width: 28, height: 28, borderRadius: 8,
                background: "#fff", border: "2px solid #000",
                fontWeight: 900, cursor: "pointer", lineHeight: 1,
                boxShadow: "2px 2px 0 0 rgba(0,0,0,.9)",
              }}
            >×</button>

            <div style={{
              fontWeight: 900, fontSize: 12, letterSpacing: ".18em",
              textTransform: "uppercase", color: "#0a0a0a",
            }}>Mystery Box</div>

            {/* TOP: claims left today */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#3b82f6", border: "2px solid #000", borderRadius: 8,
              padding: "6px 14px", fontWeight: 900, fontSize: 13,
              fontFamily: "ui-monospace,monospace", color: "#fff",
              boxShadow: "2px 2px 0 0 #000",
            }}>
              <span>{state.todayBoxes}</span>
              <span style={{ opacity: .6 }}>/</span>
              <span>{MAX_BOXES}</span>
              <span style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", marginLeft: 4 }}>claims today</span>
            </div>

            {/* BOX */}
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={{
                width: 200, height: 200, position: "relative",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: stage === "idle" ? (canClaim ? "grab" : "grab") : "default",
                touchAction: "none",
                perspective: "800px",
                userSelect: "none",
              }}
            >
              {stage !== "reveal" && (
                <img
                  src={boxImg}
                  alt="Mystery Box"
                  draggable={false}
                  className={
                    stage === "shake" || dragRef.current ? undefined
                    : canClaim ? "mbx-wiggle-ready"
                    : "mbx-float-idle"
                  }
                  style={{
                    width: "100%", height: "100%", objectFit: "contain",
                    transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
                    transformStyle: "preserve-3d",
                    transition: dragRef.current ? "none" : "transform .15s ease-out, filter .2s ease",
                    animation: stage === "shake" ? "mbx-shake .25s ease-in-out infinite"
                      : stage === "burst" ? "mbx-burst .5s ease-out forwards"
                      : undefined,
                    filter: canClaim
                      ? "drop-shadow(0 0 16px rgba(255,215,0,.65))"
                      : "drop-shadow(0 6px 12px rgba(0,0,0,.35))",
                    pointerEvents: "none",
                  }}
                />
              )}
              {stage === "reveal" && reward && (
                <>
                  <div style={{
                    animation: "mbx-reveal .5s ease-out forwards",
                    background: "#0a0a0a",
                    border: `3px solid ${RARITY[reward.rarity].color}`,
                    borderRadius: 14,
                    padding: "22px 28px",
                    textAlign: "center",
                    boxShadow: `0 0 40px ${RARITY[reward.rarity].color}80`,
                  }}>
                    <div style={{
                      fontSize: 36, fontWeight: 900, color: "#fff",
                      fontFamily: "ui-monospace,monospace",
                      textShadow: `0 0 12px ${RARITY[reward.rarity].color}`,
                    }}>+{reward.points} pts</div>
                    <div style={{
                      marginTop: 4, fontSize: 14, fontWeight: 900, letterSpacing: ".22em",
                      color: RARITY[reward.rarity].color,
                    }}>{RARITY[reward.rarity].label}</div>
                  </div>
                  {reward.rarity === "legendary" && Array.from({ length: 30 }).map((_, i) => {
                    const colors = ["#FFD700", "#ff6b6b", "#4fc3f7", "#ce93d8", "#0a0a0a"];
                    const left = Math.random() * 220 - 20;
                    const delay = Math.random() * 0.5;
                    return (
                      <span key={i} style={{
                        position: "absolute", top: -10, left,
                        width: 8, height: 12, background: colors[i % colors.length],
                        animation: `mbx-confetti 2s ${delay}s ease-in forwards`,
                        borderRadius: 2, pointerEvents: "none",
                      }} />
                    );
                  })}
                </>
              )}
            </div>

            {/* BOTTOM: bets progress */}
            {stage !== "reveal" && (
              <>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "#3b82f6", border: "2px solid #000", borderRadius: 8,
                  padding: "6px 14px", fontWeight: 900, fontSize: 13,
                  fontFamily: "ui-monospace,monospace", color: "#fff",
                  boxShadow: "2px 2px 0 0 #000",
                }}>
                  <span>{state.betsProgress}</span>
                  <span style={{ opacity: .6 }}>/</span>
                  <span>{BETS_NEEDED}</span>
                  <span style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", marginLeft: 4 }}>bets</span>
                </div>

                <div style={{ width: "100%", height: 8, background: "#f1f5f9", borderRadius: 999, overflow: "hidden", border: "2px solid #000" }}>
                  <div style={{
                    width: `${pct}%`, height: "100%",
                    background: canClaim ? "linear-gradient(90deg,#cc0000,#FFD700)" : "#94a3b8",
                    transition: "width 240ms ease",
                  }} />
                </div>

                <div style={{
                  fontSize: 11, color: "#475569", fontWeight: 700,
                  textAlign: "center", letterSpacing: ".04em", marginTop: 2,
                }}>
                  {!walletAddress
                    ? "Connect wallet to start collecting"
                    : maxed
                    ? "All 3 boxes claimed — come back tomorrow"
                    : canClaim
                    ? "Tap the box to open!"
                    : `Place ${BETS_NEEDED - state.betsProgress} more bet${BETS_NEEDED - state.betsProgress === 1 ? "" : "s"} to unlock`}
                </div>
              </>
            )}
            {stage === "reveal" && (
              <button
                onClick={closeModal}
                style={{
                  marginTop: 4, background: "#0a0a0a", color: "#fff",
                  border: "3px solid #000", borderRadius: 10,
                  padding: "10px 22px", fontWeight: 900, fontSize: 12,
                  letterSpacing: ".14em", textTransform: "uppercase", cursor: "pointer",
                  boxShadow: "4px 4px 0 0 rgba(0,0,0,.9)",
                }}
              >Awesome</button>
            )}
          </div>
        </div>
      ), document.body)}
    </>
  );
}
