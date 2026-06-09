import React from "react";
import { History as HistoryIcon, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

const HISTORY_URL = "https://lit-api.test-hub.xyz/bets/history";
const PAGE_SIZE = 3;

type RawBet = { wallet?: string; tile?: number | string; amount?: number | string; tx_hash?: string };
type RawPayout = { wallet?: string; bet?: number | string; payout?: number | string };
type RawRound = {
  id?: number | string;
  round_id?: number | string;
  status?: string;
  winning_tile?: number | string;
  total_pool?: number | string;
  bets?: RawBet[];
  payouts?: RawPayout[];
};

type MyRound = {
  id: number;
  winning_tile: number;
  total_pool: number;
  myBets: { tile: number; amount: number }[];
  totalSpent: number;
  totalWon: number;
  net: number;
};

const num = (v: any, d = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export default function MyBetsModal({
  address,
  refreshKey,
}: {
  address: string | null;
  refreshKey: number | string;
}) {
  const [open, setOpen] = React.useState(false);
  const [rounds, setRounds] = React.useState<MyRound[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(0);

  const fetchHistory = React.useCallback(async () => {
    if (!address) { setRounds([]); return; }
    const addr = address.toLowerCase();
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(HISTORY_URL, { cache: "no-store" });
      if (!r.ok) throw new Error(`http_${r.status}`);
      const j = await r.json();
      const arr: RawRound[] = Array.isArray(j) ? j : (j.history || j.rounds || []);
      const myRounds: MyRound[] = [];
      for (const raw of arr) {
        const id = num(raw.round_id ?? raw.id, NaN);
        if (!Number.isFinite(id)) continue;
        const myBets = (raw.bets || [])
          .filter((b) => (b.wallet || "").toLowerCase() === addr)
          .map((b) => ({ tile: num(b.tile), amount: num(b.amount) }));
        if (myBets.length === 0) continue;
        const totalSpent = myBets.reduce((s, b) => s + b.amount, 0);
        const totalWon = (raw.payouts || [])
          .filter((p) => (p.wallet || "").toLowerCase() === addr)
          .reduce((s, p) => s + num(p.payout), 0);
        myRounds.push({
          id,
          winning_tile: num(raw.winning_tile),
          total_pool: num(raw.total_pool),
          myBets: myBets.sort((a, b) => a.tile - b.tile),
          totalSpent,
          totalWon,
          net: totalWon - totalSpent,
        });
      }
      myRounds.sort((a, b) => b.id - a.id);
      setRounds(myRounds);
    } catch (e: any) {
      setErr(e?.message || "fetch failed");
    } finally {
      setLoading(false);
    }
  }, [address]);

  React.useEffect(() => { if (open) { setPage(0); fetchHistory(); } }, [open, fetchHistory]);
  React.useEffect(() => { if (open) fetchHistory(); }, [refreshKey]); // eslint-disable-line

  const totalPages = Math.max(1, Math.ceil(rounds.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRounds = rounds.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#ffffff", color: "#0f172a",
          border: "2px solid #0f172a",
          borderRadius: 10, padding: "8px 14px",
          fontWeight: 800, fontSize: 13, cursor: "pointer",
          fontFamily: "'Space Grotesk',system-ui,sans-serif",
          boxShadow: "3px 3px 0 0 rgba(15,23,42,.9)",
          letterSpacing: ".04em", textTransform: "uppercase",
        }}
      >
        <HistoryIcon size={14} /> My Bets
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(15,23,42,.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20, backdropFilter: "blur(3px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(1180px, 100%)", maxHeight: "92vh",
              background: "#f3f4f6",
              backgroundImage:
                "linear-gradient(rgba(15,23,42,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(15,23,42,.06) 1px,transparent 1px)",
              backgroundSize: "32px 32px",
              border: "2px solid #0f172a", borderRadius: 18,
              boxShadow: "6px 6px 0 0 rgba(15,23,42,.9)",
              color: "#0f172a",
              display: "flex", flexDirection: "column", overflow: "hidden",
              fontFamily: "'Space Grotesk',system-ui,sans-serif",
            }}
          >
            {/* Header with notebook title card */}
            <div style={{
              position: "relative",
              padding: "26px 22px 18px",
              display: "flex", alignItems: "center", justifyContent: "center",
              borderBottom: "2px solid #0f172a",
            }}>
              <div style={{
                background: "#ffffff", border: "2px solid #0f172a",
                borderRadius: 14, padding: "12px 32px",
                boxShadow: "4px 4px 0 0 rgba(15,23,42,.9)",
                fontWeight: 900, fontSize: 22, letterSpacing: ".10em",
              }}>
                MY BETS
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  position: "absolute", right: 18, top: 18,
                  background: "#ffffff", border: "2px solid #0f172a",
                  color: "#0f172a", borderRadius: 10, padding: 6, cursor: "pointer",
                  display: "inline-flex", boxShadow: "2px 2px 0 0 rgba(15,23,42,.9)",
                }}
              ><X size={16} /></button>
            </div>

            {/* Body */}
            <div style={{ padding: "22px 22px 8px", overflowY: "auto", flex: 1 }}>
              {!address ? (
                <Empty>Connect wallet to see your bets</Empty>
              ) : loading && rounds.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, gap: 10, color: "#475569", fontWeight: 700 }}>
                  <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
                  Loading…
                </div>
              ) : err ? (
                <Empty color="#dc2626">Failed to load: {err}</Empty>
              ) : rounds.length === 0 ? (
                <Empty>No bets yet</Empty>
              ) : (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${pageRounds.length}, minmax(0, 1fr))`,
                  gap: 22,
                  alignItems: "start",
                }}>
                  {pageRounds.map((r) => <RoundCard key={r.id} r={r} />)}
                </div>
              )}
            </div>

            {/* Pagination */}
            {address && rounds.length > 0 && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 10, padding: "14px 22px 18px",
                borderTop: "2px solid #0f172a",
                background: "#ffffff",
              }}>
                <PagerBtn
                  disabled={safePage <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft size={14} /> Prev
                </PagerBtn>
                <span style={{ fontSize: 13, color: "#0f172a", fontWeight: 800, letterSpacing: ".06em" }}>
                  Page {safePage + 1} of {totalPages} · {rounds.length} round{rounds.length === 1 ? "" : "s"}
                </span>
                <PagerBtn
                  disabled={safePage >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  Next <ChevronRight size={14} />
                </PagerBtn>
              </div>
            )}
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </>
  );
}

function RoundCard({ r }: { r: MyRound }) {
  const won = r.net > 0;
  return (
    <div style={{ position: "relative", paddingTop: 16 }}>
      {/* WIN / LOSS badge */}
      <div style={{
        position: "absolute", top: 0, right: 14, zIndex: 2,
        background: won ? "#16a34a" : "#dc2626",
        color: "#fff", border: "2px solid #0f172a",
        borderRadius: 999, padding: "10px 14px",
        boxShadow: "3px 3px 0 0 rgba(15,23,42,.9)",
        display: "flex", flexDirection: "column", alignItems: "center",
        fontFamily: "'Space Grotesk',system-ui,sans-serif",
        minWidth: 86,
      }}>
        <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".08em" }}>
          {won ? "WIN" : "LOSS"}
        </span>
        <span className="mono" style={{ fontSize: 12, fontWeight: 800, marginTop: 2 }}>
          {won ? "+" : ""}{r.net.toFixed(4)}
        </span>
      </div>

      {/* Card body */}
      <div style={{
        background: "#ffffff", border: "2px solid #0f172a",
        borderRadius: 14, padding: "16px 14px 14px",
        boxShadow: "4px 4px 0 0 rgba(15,23,42,.9)",
        display: "flex", flexDirection: "column", gap: 10,
        minHeight: 380,
      }}>
        <div className="mono" style={{
          fontSize: 18, fontWeight: 900, color: "#0f172a",
          paddingBottom: 8, borderBottom: "1.5px dashed rgba(15,23,42,.18)",
        }}>
          #{r.id}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto", paddingRight: 4 }}>
          {r.myBets.map((b, i) => {
            const isWinner = b.tile === r.winning_tile;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 8, padding: "9px 12px",
                background: isWinner ? "#2563eb" : "#ffffff",
                color: isWinner ? "#ffffff" : "#0f172a",
                border: `2px solid ${isWinner ? "#0f172a" : "rgba(15,23,42,.65)"}`,
                borderRadius: 10,
                boxShadow: isWinner ? "2px 2px 0 0 rgba(15,23,42,.9)" : "none",
                fontWeight: 700, fontSize: 13,
              }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    width: 16, height: 16, borderRadius: 4,
                    background: isWinner ? "#ffffff" : "transparent",
                    border: `2px solid ${isWinner ? "#ffffff" : "#0f172a"}`,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    color: "#2563eb", fontSize: 11, fontWeight: 900, lineHeight: 1,
                  }}>{isWinner ? "✓" : ""}</span>
                  Tile {b.tile}
                </span>
                <span className="mono" style={{
                  fontSize: 11, fontWeight: 800,
                  padding: "3px 8px", borderRadius: 999,
                  background: isWinner ? "#16a34a" : "rgba(15,23,42,.08)",
                  color: isWinner ? "#fff" : "#475569",
                }}>
                  {b.amount.toFixed(3)}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{
          marginTop: "auto", paddingTop: 10,
          borderTop: "1.5px dashed rgba(15,23,42,.18)",
          fontSize: 12, color: "#475569",
          display: "flex", flexDirection: "column", gap: 3,
        }}>
          <span>Winning tile: <b style={{ color: "#16a34a" }}>#{r.winning_tile}</b></span>
          <span>Spent: <b className="mono" style={{ color: "#0f172a" }}>{r.totalSpent.toFixed(3)}</b> · Won: <b className="mono" style={{ color: "#0f172a" }}>{r.totalWon.toFixed(3)}</b></span>
        </div>
      </div>
    </div>
  );
}

function Empty({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{
      padding: 60, textAlign: "center", color: color || "#475569",
      fontSize: 14, fontWeight: 700,
    }}>{children}</div>
  );
}

function PagerBtn({ disabled, onClick, children }: { disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "#ffffff", border: "2px solid #0f172a",
        color: "#0f172a", fontWeight: 800, fontSize: 12,
        padding: "8px 14px", borderRadius: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        boxShadow: disabled ? "none" : "2px 2px 0 0 rgba(15,23,42,.9)",
        fontFamily: "inherit", letterSpacing: ".05em", textTransform: "uppercase",
      }}
    >{children}</button>
  );
}
