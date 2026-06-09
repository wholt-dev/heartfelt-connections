import React from "react";
import { ChevronDown, ChevronRight, History as HistoryIcon } from "lucide-react";

const HISTORY_URL = "https://lit-api.test-hub.xyz/bets/history";
const PAGE_SIZE = 10;

type RawBet = { wallet?: string; tile?: number | string; amount?: number | string; tx_hash?: string; created_at?: string };
type RawPayout = { wallet?: string; bet?: number | string; payout?: number | string };
type RawRound = {
  id?: number | string;
  round_id?: number | string;
  status?: string;
  winning_tile?: number | string;
  total_pool?: number | string;
  tiles?: Record<string, { total?: number; bets?: number }>;
  bets?: RawBet[];
  payouts?: RawPayout[];
};

type MyRound = {
  id: number;
  winning_tile: number;
  total_pool: number;
  myBets: { tile: number; amount: number; tx_hash?: string }[];
  totalSpent: number;
  totalWon: number;
  net: number;
};

function num(v: any, d = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

export default function MyBetsHistory({
  address,
  refreshKey,
}: {
  address: string | null;
  refreshKey: number | string;
}) {
  const [rounds, setRounds] = React.useState<MyRound[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [expanded, setExpanded] = React.useState<Set<number>>(new Set());
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (!address) { setRounds([]); return; }
    const addr = address.toLowerCase();
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const r = await fetch(HISTORY_URL, { cache: "no-store" });
        if (!r.ok) throw new Error(`http_${r.status}`);
        const j = await r.json();
        const arr: RawRound[] = Array.isArray(j) ? j : (j.history || j.rounds || []);
        const mapped: MyRound[] = [];
        for (const raw of arr) {
          const id = num(raw.round_id ?? raw.id, NaN);
          if (!Number.isFinite(id)) continue;
          const myBets = (raw.bets || [])
            .filter((b) => (b.wallet || "").toLowerCase() === addr)
            .map((b) => ({ tile: num(b.tile), amount: num(b.amount), tx_hash: b.tx_hash }));
          if (myBets.length === 0) continue;
          const totalSpent = myBets.reduce((s, b) => s + b.amount, 0);
          const totalWon = (raw.payouts || [])
            .filter((p) => (p.wallet || "").toLowerCase() === addr)
            .reduce((s, p) => s + num(p.payout), 0);
          mapped.push({
            id,
            winning_tile: num(raw.winning_tile),
            total_pool: num(raw.total_pool),
            myBets,
            totalSpent,
            totalWon,
            net: totalWon - totalSpent,
          });
        }
        mapped.sort((a, b) => b.id - a.id);
        if (!cancelled) setRounds(mapped);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "fetch failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [address, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(rounds.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRounds = rounds.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const netColor = (net: number) =>
    net > 0 ? "#16a34a" : net < 0 ? "#dc2626" : "#64748b";
  const netLabel = (net: number) =>
    net > 0 ? `Net: +${net.toFixed(3)} zkLTC ✅`
    : net < 0 ? `Net: ${net.toFixed(3)} zkLTC ❌`
    : `Net: 0 zkLTC`;

  return (
    <div style={{
      background: "#ffffff", border: "2px solid #0f172a",
      borderRadius: 14, padding: 18,
      boxShadow: "4px 4px 0 0 rgba(15,23,42,.9)", color: "#0f172a",
      display: "flex", flexDirection: "column", gap: 12,
      marginTop: 22,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 14, letterSpacing: ".06em", textTransform: "uppercase" }}>
          <HistoryIcon size={16} /> My Bets
        </span>
        <span style={{
          fontSize: 12, padding: "3px 10px", borderRadius: 999,
          background: "rgba(124,92,255,.12)", color: "#7c5cff",
          border: "1px solid rgba(124,92,255,.4)", fontWeight: 700,
        }}>{rounds.length} round{rounds.length === 1 ? "" : "s"}</span>
      </div>

      <div style={{ borderTop: "1px solid rgba(15,23,42,.10)", paddingTop: 10 }}>
        {!address ? (
          <div style={{ fontSize: 13, color: "#64748b", padding: "12px 4px" }}>Connect wallet to see your bets</div>
        ) : loading && rounds.length === 0 ? (
          <div style={{ fontSize: 13, color: "#64748b", padding: "12px 4px" }}>Loading…</div>
        ) : err ? (
          <div style={{ fontSize: 13, color: "#dc2626", padding: "12px 4px" }}>Failed to load: {err}</div>
        ) : rounds.length === 0 ? (
          <div style={{ fontSize: 13, color: "#64748b", padding: "12px 4px" }}>No bets yet</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pageRounds.map((r) => {
              const isOpen = expanded.has(r.id);
              return (
                <div key={r.id} style={{
                  background: "#ffffff", border: "1.5px solid #0f172a",
                  borderRadius: 11, boxShadow: "2px 2px 0 0 rgba(15,23,42,.85)",
                  overflow: "hidden",
                }}>
                  <button
                    onClick={() => toggle(r.id)}
                    style={{
                      width: "100%", background: "transparent", border: "none",
                      padding: "10px 12px", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      fontSize: 13, color: "#0f172a", fontWeight: 700, textAlign: "left",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      Round #{r.id}
                    </span>
                    <span>Tile <span style={{ color: "#16a34a", fontWeight: 900 }}>{r.winning_tile}</span> Wins</span>
                    <span style={{ color: "#475569" }}>{r.myBets.length} tile{r.myBets.length === 1 ? "" : "s"}</span>
                    <span style={{ color: netColor(r.net), fontWeight: 800 }}>{netLabel(r.net)}</span>
                  </button>

                  {isOpen && (
                    <div style={{ padding: "10px 14px 14px", borderTop: "1px dashed rgba(15,23,42,.18)", background: "rgba(15,23,42,.02)" }}>
                      <div style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>
                        Winning tile: <span style={{ color: "#16a34a", fontWeight: 900 }}>{r.winning_tile}</span>
                        {" · "}Pool: <b>{r.total_pool.toFixed(3)} zkLTC</b>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                        <div style={{ fontWeight: 800, color: "#0f172a", padding: "4px 6px", borderBottom: "1px solid rgba(15,23,42,.15)" }}>Tile</div>
                        <div style={{ fontWeight: 800, color: "#0f172a", padding: "4px 6px", borderBottom: "1px solid rgba(15,23,42,.15)" }}>Amount</div>
                        <div style={{ fontWeight: 800, color: "#0f172a", padding: "4px 6px", borderBottom: "1px solid rgba(15,23,42,.15)" }}>Result</div>
                        {r.myBets.map((b, i) => {
                          const won = b.tile === r.winning_tile;
                          return (
                            <React.Fragment key={i}>
                              <div style={{ padding: "4px 6px" }}>{b.tile}</div>
                              <div style={{ padding: "4px 6px" }}>{b.amount.toFixed(3)}</div>
                              <div style={{ padding: "4px 6px", color: won ? "#16a34a" : "#dc2626", fontWeight: 800 }}>
                                {won ? "✅ WON" : "❌ LOST"}
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                      <div style={{ marginTop: 10, fontSize: 12, display: "flex", flexDirection: "column", gap: 3 }}>
                        <span>Total spent: <b>{r.totalSpent.toFixed(3)} zkLTC</b></span>
                        <span>Total won: <b>{r.totalWon.toFixed(3)} zkLTC</b></span>
                        <span style={{ color: netColor(r.net), fontWeight: 800 }}>
                          {r.net > 0 ? `Net profit: +${r.net.toFixed(3)} zkLTC`
                            : r.net < 0 ? `Net loss: ${r.net.toFixed(3)} zkLTC`
                            : "Net: 0 zkLTC"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {address && rounds.length > PAGE_SIZE && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, paddingTop: 6 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="verify-btn"
            style={{ opacity: safePage <= 1 ? 0.4 : 1, cursor: safePage <= 1 ? "not-allowed" : "pointer" }}
          >
            Prev
          </button>
          <span style={{ fontSize: 12, color: "#475569", fontWeight: 700 }}>
            Page {safePage} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="verify-btn"
            style={{ opacity: safePage >= totalPages ? 0.4 : 1, cursor: safePage >= totalPages ? "not-allowed" : "pointer" }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
