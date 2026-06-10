import React from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, PieChart, Pie, Cell, Legend,
} from "recharts";

const GOLD = "#fbbf24";
const CYAN = "#22d3ee";
const PURPLE = "#a78bfa";
const GREEN = "#4ade80";
const RED = "#f87171";
const BG = "#0b1220";
const PANEL = "#111827";
const BORDER = "#1f2937";
const MUTED = "#94a3b8";

const sectionTitle: React.CSSProperties = {
  color: GOLD, fontWeight: 900, fontSize: 13,
  letterSpacing: ".14em", textTransform: "uppercase",
  margin: "0 0 10px",
};

const codeBlock: React.CSSProperties = {
  background: "#05080f", color: CYAN, border: `1px solid ${BORDER}`,
  borderRadius: 10, padding: 14, fontSize: 12.5, lineHeight: 1.7,
  fontFamily: "'JetBrains Mono','SF Mono',monospace",
  whiteSpace: "pre", overflowX: "auto",
};

const card: React.CSSProperties = {
  background: PANEL, border: `1px solid ${BORDER}`,
  borderRadius: 12, padding: 14, color: "#e5e7eb",
};

const sectionWrap: React.CSSProperties = {
  background: "rgba(255,255,255,.02)", border: `1px solid ${BORDER}`,
  borderRadius: 14, padding: 16, marginBottom: 16,
};

function PhaseCard({ n, label, desc, color }: { n: number; label: string; desc: string; color: string }) {
  return (
    <div style={{ ...card, borderColor: color, boxShadow: `0 0 0 1px ${color}33` }}>
      <div style={{ color, fontWeight: 900, fontSize: 22, lineHeight: 1 }}>{n}</div>
      <div style={{ fontWeight: 900, fontSize: 14, marginTop: 6, color: "#f9fafb" }}>{label}</div>
      <div style={{ fontSize: 11.5, color: MUTED, marginTop: 4, lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
}

function Slider({
  label, min, max, step, value, onChange, suffix,
}: { label: string; min: number; max: number; step: number; value: number; onChange: (n: number) => void; suffix?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: MUTED, marginBottom: 6 }}>
        <span>{label}</span>
        <span style={{ color: CYAN, fontFamily: "'JetBrains Mono',monospace", fontWeight: 800 }}>
          {value.toFixed(step < 1 ? 2 : 1)} {suffix}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: CYAN }}
      />
    </div>
  );
}

function ResultCard({ label, value, color = "#f9fafb" }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ ...card, padding: 12 }}>
      <div style={{ fontSize: 10.5, color: MUTED, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 800 }}>{label}</div>
      <div style={{ color, fontWeight: 900, fontSize: 18, marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>{value}</div>
    </div>
  );
}

export default function AboutModal() {
  const [open, setOpen] = React.useState(false);

  // calculator state
  const [yourBet, setYourBet] = React.useState(0.5);
  const [totalPool, setTotalPool] = React.useState(5.0);
  const [winTileTotal, setWinTileTotal] = React.useState(1.5);

  // keep winTileTotal within [yourBet, totalPool]
  React.useEffect(() => {
    setWinTileTotal((v) => Math.min(Math.max(v, yourBet), totalPool));
  }, [yourBet, totalPool]);

  const share = winTileTotal > 0 ? yourBet / winTileTotal : 0;
  const prize = totalPool * 0.95;
  const payout = prize * share;
  const mult = yourBet > 0 ? payout / yourBet : 0;
  const pnl = payout - yourBet;

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const chartData = React.useMemo(
    () => Array.from({ length: 100 }, (_, i) => {
      const x = i + 1;
      const y = Math.min(50, +(95 / x).toFixed(2));
      return { x, y };
    }),
    []
  );

  const pieData = [
    { name: "Winners", value: 95, color: GREEN },
    { name: "Protocol Fee", value: 5, color: GOLD },
  ];

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
        <Info size={14} /> About
      </button>

      {open && createPortal(
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,.72)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
        >
          <style>{`
            .about-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
            .about-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
            .about-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
            .about-pie-row { display: grid; grid-template-columns: 240px 1fr; gap: 16px; align-items: center; }
            @media (max-width: 720px) {
              .about-grid-4, .about-grid-3, .about-grid-2, .about-pie-row {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(900px, 100%)", maxHeight: "90vh", overflowY: "auto",
              background: BG, color: "#e5e7eb",
              border: `2px solid ${GOLD}`, borderRadius: 16,
              boxShadow: "0 20px 60px rgba(0,0,0,.6), 0 0 0 1px rgba(251,191,36,.3)",
              padding: 22, fontFamily: "'Space Grotesk',system-ui,sans-serif",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <Info size={18} color={GOLD} />
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, letterSpacing: ".06em", textTransform: "uppercase", color: "#f9fafb" }}>
                  ℹ️ How It Works
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  background: "transparent", border: `1px solid ${BORDER}`, color: "#e5e7eb",
                  borderRadius: 8, padding: 6, cursor: "pointer",
                }}
              ><X size={16} /></button>
            </div>

            {/* SECTION 1 */}
            <div style={sectionWrap}>
              <h3 style={sectionTitle}>1 · Round Flow</h3>
              <div className="about-grid-4">
                <PhaseCard n={1} label="OPEN" desc="Players bet on 1–30 tiles" color={CYAN} />
                <PhaseCard n={2} label="LOCK" desc="No more bets accepted" color={GOLD} />
                <PhaseCard n={3} label="DRAND" desc="Winning tile drawn publicly" color={PURPLE} />
                <PhaseCard n={4} label="PAY" desc="Winners receive zkLTC" color={GREEN} />
              </div>
            </div>

            {/* SECTION 2 */}
            <div style={sectionWrap}>
              <h3 style={sectionTitle}>2 · Payout Formula</h3>
              <pre style={codeBlock}>{`Step 1 — Protocol fee
  fee = totalPool × 5%

Step 2 — Prize pool
  prize = totalPool × 95%

Step 3 — Your share of winning tile
  share = yourBetOnWinTile ÷ totalBetsOnWinTile

Step 4 — Your payout
  payout = prize × share
         = totalPool × 0.95 × (yourBet ÷ winTileTotal)

Multiplier = payout ÷ yourBet
           = (totalPool × 0.95) ÷ totalOnWinTile`}</pre>
              <div className="about-grid-3" style={{ marginTop: 12 }}>
                <ResultCard label="Tile = 5% of pool" value="19×" color={GREEN} />
                <ResultCard label="Tile = 20% of pool" value="4.75×" color={CYAN} />
                <ResultCard label="Tile = 50% of pool" value="1.9×" color={GOLD} />
              </div>
            </div>

            {/* SECTION 3 */}
            <div style={sectionWrap}>
              <h3 style={sectionTitle}>3 · Interactive Payout Calculator</h3>
              <Slider label="Your bet on winning tile" min={0.01} max={2.0} step={0.01} value={yourBet} onChange={setYourBet} suffix="zkLTC" />
              <Slider label="Total bets on winning tile" min={yourBet} max={totalPool} step={0.01} value={winTileTotal} onChange={setWinTileTotal} suffix="zkLTC" />
              <Slider label="Total pool this round" min={0.1} max={10.0} step={0.1} value={totalPool} onChange={setTotalPool} suffix="zkLTC" />
              <div className="about-grid-3" style={{ marginTop: 8 }}>
                <ResultCard label="Your share" value={`${(share * 100).toFixed(2)} %`} color={CYAN} />
                <ResultCard label="Prize pool" value={`${prize.toFixed(3)} zkLTC`} />
                <ResultCard label="Your payout" value={`${payout.toFixed(3)} zkLTC`} color={GOLD} />
                <ResultCard label="Multiplier" value={`${mult.toFixed(2)} ×`} color={PURPLE} />
                <ResultCard
                  label="Net P&L"
                  value={`${pnl >= 0 ? "+" : "−"}${Math.abs(pnl).toFixed(3)} zkLTC`}
                  color={pnl >= 0 ? GREEN : RED}
                />
              </div>
            </div>

            {/* SECTION 4 */}
            <div style={sectionWrap}>
              <h3 style={sectionTitle}>4 · Multiplier Curve</h3>
              <div style={{ width: "100%", height: 260, background: "transparent" }}>
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                    <XAxis dataKey="x" stroke={MUTED} tick={{ fill: MUTED, fontSize: 11 }}
                      label={{ value: "Winning tile % of total pool", position: "insideBottom", offset: -2, fill: MUTED, fontSize: 11 }} />
                    <YAxis domain={[0, 25]} stroke={MUTED} tick={{ fill: MUTED, fontSize: 11 }}
                      label={{ value: "Multiplier (×)", angle: -90, position: "insideLeft", fill: MUTED, fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: "#05080f", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#e5e7eb", fontSize: 12 }}
                      formatter={(v: any, _n, p: any) => [`Win tile = ${p.payload.x}% of pool → ${v}× multiplier`, ""]}
                      labelFormatter={() => ""}
                    />
                    <ReferenceLine y={1} stroke={RED} strokeDasharray="4 4" label={{ value: "Break-even", fill: RED, fontSize: 11, position: "insideTopRight" }} />
                    <Line type="monotone" dataKey="y" stroke={CYAN} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 8, lineHeight: 1.6 }}>
                Lower tile coverage = higher multiplier, higher risk. Higher tile coverage = lower multiplier, safer bet. EV is always −5% regardless of strategy.
              </div>
            </div>

            {/* SECTION 5 */}
            <div style={sectionWrap}>
              <h3 style={sectionTitle}>5 · Pool Distribution</h3>
              <div className="about-pie-row">
                <div style={{ width: "100%", height: 200 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} stroke="none">
                        {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#05080f", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#e5e7eb", fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11, color: MUTED }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.8, color: "#e5e7eb" }}>
                  <div><b style={{ color: GOLD }}>House edge = 5%</b> flat</div>
                  <div>Expected return = 95% of investment</div>
                  <div>No hidden fees. No slippage.</div>
                  <div>Same EV for every strategy.</div>
                </div>
              </div>
            </div>

            {/* SECTION 6 */}
            <div style={sectionWrap}>
              <h3 style={sectionTitle}>6 · Expected Value (Any Strategy)</h3>
              <pre style={codeBlock}>{`For ANY bet amount I across ANY tiles:

Expected Return = I × 0.95
Expected Loss   = I × 0.05

Covering 1 tile:   EV = −5%
Covering 15 tiles: EV = −5%
Covering 30 tiles: EV = −5%

Strategy only changes VARIANCE, not EV.
Fewer tiles = high variance (boom or bust)
More tiles  = low variance (steady small returns)`}</pre>
            </div>

            {/* SECTION 7 */}
            <div style={sectionWrap}>
              <h3 style={sectionTitle}>7 · Drand Provably Fair Randomness</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                {["🏛 Cloudflare", "🏛 EPFL", "🏛 Univ. of Chile"].map((s) => (
                  <span key={s} style={{
                    background: PANEL, border: `1px solid ${BORDER}`, color: "#e5e7eb",
                    borderRadius: 999, padding: "5px 10px", fontSize: 11.5, fontWeight: 700,
                  }}>{s}</span>
                ))}
              </div>
              <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.6, marginBottom: 10 }}>
                Drand is a decentralized randomness network. Every few seconds it publishes a threshold BLS signature requiring majority of independent nodes to agree. No single party can predict or manipulate it.
              </div>
              <pre style={codeBlock}>{`1. Fetch Drand beacon at round lock time
   → randomValue = Drand.randomness (hex)

2. Rejection sampling (uniform distribution)
   → n = BigInt("0x" + randomValue)
   → max = floor(MAX / 30n) * 30n
   → while (n >= max) n = nextSample()
   → tile = Number(n % 30n) + 1   // result: 1–30

3. Anyone can verify:
   https://drand.cloudflare.com/public/[ROUND_NUMBER]
   Apply same formula → must match winning tile`}</pre>
              <div style={{
                marginTop: 10, background: "rgba(74,222,128,.08)",
                border: `1px solid ${GREEN}55`, borderRadius: 10, padding: 12,
                color: "#d1fae5", fontSize: 12.5, lineHeight: 1.7,
              }}>
                <div style={{ color: GREEN, fontWeight: 800, marginBottom: 4 }}>✓ Self-verify any past round:</div>
                1. Find round's Drand number in Ended Rounds<br />
                2. Visit the URL above with that number<br />
                3. Run the formula — result matches our tile
              </div>
            </div>

            {/* SECTION 8 */}
            <div style={sectionWrap}>
              <h3 style={sectionTitle}>8 · Bonanza Rounds</h3>
              <div className="about-grid-2">
                <div style={{ ...card }}>
                  <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 8, color: "#f9fafb" }}>Normal Round</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.8 }}>
                    <div style={{ color: GREEN }}>✓ zkLTC payout to winners</div>
                    <div style={{ color: RED }}>✗ No bonus points</div>
                  </div>
                </div>
                <div style={{ ...card, borderColor: GOLD, boxShadow: `0 0 0 1px ${GOLD}55, 0 0 18px ${GOLD}44` }}>
                  <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 8, color: GOLD }}>🎉 BONANZA Round</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.8 }}>
                    <div style={{ color: GREEN }}>✓ zkLTC payout to winners</div>
                    <div style={{ color: GREEN }}>✓ +10,000 LitDEX Points to ALL winners</div>
                    <div style={{ color: MUTED, fontSize: 11.5 }}>(awarded on-chain, verifiable by tx hash)</div>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: MUTED, marginTop: 12, lineHeight: 1.6 }}>
                Bonanza designation is hidden until round resolves — you won't know in advance. Revealed with special animation after resolution. Bonanza rounds appear with 🎉 badge in round history.
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
