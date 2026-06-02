import React from "react";
import { Wallet, Shield, History, ArrowLeft } from "lucide-react";
import { api, type RoundView } from "./lib/api";

import * as W from "./lib/wallet";
import RoundCard from "./components/RoundCard";
import ProvablyFair from "./components/ProvablyFair";
import Home from "./components/Home";

export default function App() {
  const [view, setView] = React.useState<"home" | "zone">("home");
  const [rounds, setRounds] = React.useState<RoundView[]>([]);
  const [history, setHistory] = React.useState<RoundView[]>([]);
  const [head, setHead] = React.useState<number | null>(null);
  const [addr, setAddr] = React.useState<string | null>(null);
  const [bal, setBal] = React.useState<number>(0);
  const [pfBlock, setPfBlock] = React.useState<number | null>(null);
  const [connecting, setConnecting] = React.useState(false);

  // poll rounds + history when in the zone
  React.useEffect(() => {
    if (view !== "zone") return;
    let alive = true;
    const load = async () => {
      try {
        const [r, h] = await Promise.all([api.rounds(), api.history(8)]);
        if (!alive) return;
        setRounds(r.rounds); setHistory(h.history);
      } catch { /* */ }
    };
    load();
    const id = setInterval(load, 2000);
    return () => { alive = false; clearInterval(id); };
  }, [view]);

  // live head ticker
  React.useEffect(() => {
    let alive = true;
    const t = async () => { try { const h = await api.head(); if (alive) setHead(h.block); } catch { /* */ } };
    t();
    const id = setInterval(t, 1500);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // refresh balance periodically when connected
  React.useEffect(() => {
    if (!addr) return;
    let alive = true;
    const t = async () => { const b = await W.getBalance(addr); if (alive) setBal(b); };
    t();
    const id = setInterval(t, 8000);
    W.onAccountsChanged((a) => { setAddr(a); if (!a) setBal(0); });
    return () => { alive = false; clearInterval(id); };
  }, [addr]);

  const connect = async () => {
    setConnecting(true);
    try {
      const a = await W.connect();
      setAddr(a);
      setBal(await W.getBalance(a));
    } catch (e: any) {
      alert(e?.message || "Could not connect wallet");
    } finally { setConnecting(false); }
  };

  const totalLiveStaked = rounds.reduce((s, r) => s + r.totalStaked, 0);
  const totalLivePlayers = rounds.reduce((s, r) => s + r.players, 0);

  if (view === "home") {
    return (
      <>
        <div className="bg"><div className="blob b1" /><div className="blob b2" /><div className="blob b3" /><div className="ring r1" /><div className="ring r2" /><div className="dots d1" /><div className="dots d2" /></div>
        <div className="app">
          <div className="topbar">
            <div className="logo">
              <div className="mark">B</div>
              <div><h1>Bets<b>On</b>Block</h1><span>Provably fair · LitVM</span></div>
            </div>
            <div className="top-right">
              <div className="live-head"><span className="pulse" /> Block <b className="mono" style={{ color: "#fff", marginLeft: 4 }}>#{head?.toLocaleString() ?? "…"}</b></div>
              <button className="btn btn-primary btn-sm" onClick={() => setView("zone")}>Enter Zone</button>
            </div>
          </div>
          <Home onEnter={() => setView("zone")} />
        </div>
        {pfBlock != null && <ProvablyFair block={pfBlock} onClose={() => setPfBlock(null)} />}
      </>
    );
  }

  // ===== BETTING ZONE =====
  return (
    <>
      <div className="bg"><div className="blob b1" /><div className="blob b2" /><div className="blob b3" /><div className="ring r1" /><div className="ring r2" /><div className="dots d1" /><div className="dots d2" /></div>
      <div className="app">
        <div className="topbar">
          <div className="logo" style={{ cursor: "pointer" }} onClick={() => setView("home")}>
            <div className="mark">B</div>
            <div><h1>Bets<b>On</b>Block</h1><span>Provably fair · LitVM</span></div>
          </div>
          <div className="top-right">
            <div className="live-head"><span className="pulse" /> Block <b className="mono" style={{ color: "#fff", marginLeft: 4 }}>#{head?.toLocaleString() ?? "…"}</b></div>
            {addr ? (
              <>
                <div className="bal"><span className="coin">◆</span> {bal.toLocaleString(undefined, { maximumFractionDigits: 4 })} zkLTC</div>
                <span className="btn btn-ghost btn-sm" style={{ cursor: "default" }}>{addr.slice(0, 6)}…{addr.slice(-4)}</span>
              </>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={connect} disabled={connecting}>
                <Wallet size={14} /> {connecting ? "Connecting…" : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>

        <div className="ribbon">
          <div className="item"><span className="k">Live Pot</span><span className="v" style={{ color: "var(--gold)" }}>◆ {totalLiveStaked.toFixed(2)}</span></div>
          <div className="item"><span className="k">Players In Play</span><span className="v">{totalLivePlayers}</span></div>
          <div className="item"><span className="k">Active Rounds</span><span className="v">{rounds.length}</span></div>
          <div className="item"><span className="k">Bet Size</span><span className="v">0.01 zkLTC</span></div>
          <div className="item"><span className="k">Block Time</span><span className="v">~0.2s</span></div>
        </div>

        <div className="wrap">
          <button className="back-link" onClick={() => setView("home")}><ArrowLeft size={14} /> Back to home</button>
          <h1 className="page-title">Live Rounds</h1>
          <p className="page-sub">Place bets while a round is open. Stack multiple modes, each is a flat 0.01 zkLTC.</p>

          <div className="zone-grid">
            <div className="rounds">
              {rounds.length === 0 && <div className="empty">Connecting to the round engine…</div>}
              {rounds.map((r, i) => (
                <RoundCard
                  key={r.id}
                  round={r}
                  slot={i === 0 ? "closing" : "open"}
                  addr={addr}
                  onNeedConnect={connect}
                  onOpenPF={(b) => setPfBlock(b)}
                  onBet={() => { if (addr) W.getBalance(addr).then(setBal); }}
                />
              ))}
            </div>

            <aside className="side">
              <div className="side-head"><History size={15} /> Recent Blocks</div>
              {history.length === 0 && <div className="empty sm">No settled rounds yet.</div>}
              {history.map((r) => {
                const b = r.targetBlock;
                if (!b) return null;
                return (
                  <div className="hist-row" key={r.id}>
                    <span className="bn">#{b.number.toLocaleString()}</span>
                    <button className="verify-btn" onClick={() => setPfBlock(b.number)}>Verify</button>
                  </div>
                );
              })}
            </aside>
          </div>
        </div>
      </div>

      {pfBlock != null && <ProvablyFair block={pfBlock} onClose={() => setPfBlock(null)} />}
    </>
  );
}
