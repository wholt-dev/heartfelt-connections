import React from "react";

const API_BASE = (import.meta as any).env?.VITE_API_URL || "";

type Stats = { totalBets: number; totalWon: number; totalLoss: number };

export default function HeaderStats() {
  const [stats, setStats] = React.useState<Stats>({ totalBets: 0, totalWon: 0, totalLoss: 0 });

  const load = React.useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/stats`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (!r.ok) return;
      const j = await r.json();
      const num = (v: any) => {
        const n = typeof v === "string" ? Number(v) : (typeof v === "number" ? v : 0);
        return Number.isFinite(n) ? n : 0;
      };
      setStats({
        totalBets: num(j.totalBets ?? j.total_bets ?? j.bets),
        totalWon: num(j.totalWon ?? j.total_won ?? j.won ?? j.wins),
        totalLoss: num(j.totalLoss ?? j.total_loss ?? j.loss ?? j.losses ?? j.losts),
      });
    } catch { /* */ }
  }, []);

  React.useEffect(() => {
    let alive = true;
    const tick = () => { if (alive) load(); };
    tick();
    const id = setInterval(tick, 5000);
    const onNav = () => tick();
    window.addEventListener("popstate", onNav);
    window.addEventListener("hashchange", onNav);
    window.addEventListener("focus", onNav);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener("popstate", onNav);
      window.removeEventListener("hashchange", onNav);
      window.removeEventListener("focus", onNav);
    };
  }, [load]);

  const pill = (label: string, value: number) => (
    <div
      style={{
        display: "inline-flex", flexDirection: "column", alignItems: "center",
        background: "#0a0a0a", color: "#fff",
        border: "3px solid #000", borderRadius: 12,
        padding: "8px 18px",
        fontFamily: "'Space Grotesk',system-ui,sans-serif",
        boxShadow: "5px 5px 0 0 rgba(0,0,0,.9)",
        lineHeight: 1.1, minWidth: 92,
      }}
    >
      <span style={{
        fontSize: 9, letterSpacing: ".18em", textTransform: "uppercase",
        color: "rgba(255,255,255,.55)", fontWeight: 700, marginBottom: 4,
      }}>{label}</span>
      <span style={{
        fontSize: 16, fontWeight: 900, color: "#fff",
        fontFamily: "'JetBrains Mono',monospace", letterSpacing: "-.01em",
      }}>{value.toLocaleString()}</span>
    </div>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {pill("Total Bets", stats.totalBets)}
      {pill("Total Won", stats.totalWon)}
      {pill("Total Loss", stats.totalLoss)}
    </div>
  );
}
