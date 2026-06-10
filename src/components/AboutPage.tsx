import React from "react";
import { ArrowLeft, Info } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, PieChart, Pie, Cell, Legend,
} from "recharts";

const BLUE = "#7c5cff";       // headline blue (same accent used across PVP)
const INK = "#0f172a";        // body text
const MUTED = "#475569";
const BORDER = "#0f172a";
const PANEL = "#ffffff";
const SOFT = "#f8fafc";
const GREEN = "#16a34a";
const RED = "#dc2626";
const GOLD = "#d97706";

const sectionTitle: React.CSSProperties = {
  color: BLUE, fontWeight: 900, fontSize: 14,
  letterSpacing: ".14em", textTransform: "uppercase",
  margin: "0 0 12px",
};

const codeBlock: React.CSSProperties = {
  background: SOFT, color: INK, border: `1.5px solid ${BORDER}`,
  borderRadius: 10, padding: 14, fontSize: 12.5, lineHeight: 1.7,
  fontFamily: "'JetBrains Mono','SF Mono',monospace",
  whiteSpace: "pre", overflowX: "auto",
  boxShadow: "2px 2px 0 0 rgba(15,23,42,.85)",
};

const card: React.CSSProperties = {
  background: PANEL, border: `1.5px solid ${BORDER}`,
  borderRadius: 12, padding: 14, color: INK,
  boxShadow: "2px 2px 0 0 rgba(15,23,42,.85)",
};

const sectionWrap: React.CSSProperties = {
  background: PANEL, border: `2px solid ${BORDER}`,
  borderRadius: 14, padding: 18, marginBottom: 18,
  boxShadow: "4px 4px 0 0 rgba(15,23,42,.9)",
};

function PhaseCard({ n, label, desc, color }: { n: number; label: string; desc: string; color: string }) {
  return (
    <div style={{ ...card, borderColor: color }}>
      <div style={{ color, fontWeight: 900, fontSize: 22, lineHeight: 1 }}>{n}</div>
      <div style={{ fontWeight: 900, fontSize: 14, marginTop: 6, color: INK }}>{label}</div>
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
        <span style={{ fontWeight: 700 }}>{label}</span>
        <span style={{ color: BLUE, fontFamily: "'JetBrains Mono',monospace", fontWeight: 800 }}>
          {value.toFixed(step < 1 ? 2 : 1)} {suffix}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: BLUE }}
      />
    </div>
  );
}

function ResultCard({ label, value, color = INK }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ ...card, padding: 12 }}>
      <div style={{ fontSize: 10.5, color: MUTED, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 800 }}>{label}</div>
      <div style={{ color, fontWeight: 900, fontSize: 18, marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>{value}</div>
    </div>
  );
}

export default function AboutPage({ onBack }: { onBack: () => void }) {
  const [yourBet, setYourBet] = React.useState(0.5);
  const [totalPool, setTotalPool] = React.useState(5.0);
  const [winTileTotal, setWinTileTotal] = React.useState(1.5);

  React.useEffect(() => {
    setWinTileTotal((v) => Math.min(Math.max(v, yourBet), totalPool));
  }, [yourBet, totalPool]);

  const share = winTileTotal > 0 ? yourBet / winTileTotal : 0;
  const prize = totalPool * 0.95;
  const payout = prize * share;
  const mult = yourBet > 0 ? payout / yourBet : 0;
  const pnl = payout - yourBet;

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
    <div
      className="app zone-mode"
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        backgroundImage: "linear-gradient(rgba(15,23,42,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(15,23,42,.06) 1px,transparent 1px)",
        backgroundSize: "32px 32px",
        color: INK,
        fontFamily: "'Space Grotesk',system-ui,sans-serif",
      }}
    >
      <style>{`
        .about-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .about-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .about-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .about-pie-row { display: grid; grid-template-columns: 260px 1fr; gap: 16px; align-items: center; }
        @media (max-width: 720px) {
          .about-grid-4, .about-grid-3, .about-grid-2, .about-pie-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px 48px" }}>
        <button
          onClick={onBack}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#fff", color: INK, border: `2px solid ${BORDER}`,
            borderRadius: 10, padding: "8px 14px", fontWeight: 800,
            fontSize: 12, letterSpacing: ".05em", textTransform: "uppercase",
            cursor: "pointer", boxShadow: "3px 3px 0 0 rgba(15,23,42,.9)",
            marginBottom: 16,
          }}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <Info size={22} color={BLUE} />
          <h1 style={{
            margin: 0, fontSize: 26, fontWeight: 900, color: INK,
            letterSpacing: "-.01em",
          }}>
            How It Works
          </h1>
        </div>

        {/* SECTION 1 */}
        <div style={sectionWrap}>
          <h3 style={sectionTitle}>1 Round Flow</h3>
          <div className="about-grid-4">
            <PhaseCard n={1} label="OPEN" desc="Players bet on 1–30 tiles" color={BLUE} />
            <PhaseCard n={2} label="LOCK" desc="No more bets accepted" color={GOLD} />
            <PhaseCard n={3} label="DRAND" desc="Winning tile drawn publicly" color="#9333ea" />
            <PhaseCard n={4} label="PAY" desc="Winners receive zkLTC" color={GREEN} />
          </div>
        </div>

        {/* SECTION 2 */}
        <div style={sectionWrap}>
          <h3 style={sectionTitle}>2 Payout Formula</h3>
          <pre style={codeBlock}>{`Step 1: Protocol fee
  fee = totalPool x 5%

Step 2: Prize pool
  prize = totalPool x 95%

Step 3: Your share of winning tile
  share = yourBetOnWinTile / totalBetsOnWinTile

Step 4: Your payout
  payout = prize x share
         = totalPool x 0.95 x (yourBet / winTileTotal)

Multiplier = payout / yourBet
           = (totalPool x 0.95) / totalOnWinTile`}</pre>
          <div className="about-grid-3" style={{ marginTop: 12 }}>
            <ResultCard label="Tile = 5% of pool" value="19×" color={GREEN} />
            <ResultCard label="Tile = 20% of pool" value="4.75×" color={BLUE} />
            <ResultCard label="Tile = 50% of pool" value="1.9×" color={GOLD} />
          </div>
        </div>

        {/* SECTION 3 */}
        <div style={sectionWrap}>
          <h3 style={sectionTitle}>3 Interactive Payout Calculator</h3>
          <Slider label="Your bet on winning tile" min={0.01} max={2.0} step={0.01} value={yourBet} onChange={setYourBet} suffix="zkLTC" />
          <Slider label="Total bets on winning tile" min={yourBet} max={totalPool} step={0.01} value={winTileTotal} onChange={setWinTileTotal} suffix="zkLTC" />
          <Slider label="Total pool this round" min={0.1} max={10.0} step={0.1} value={totalPool} onChange={setTotalPool} suffix="zkLTC" />
          <div className="about-grid-3" style={{ marginTop: 8 }}>
            <ResultCard label="Your share" value={`${(share * 100).toFixed(2)} %`} color={BLUE} />
            <ResultCard label="Prize pool" value={`${prize.toFixed(3)} zkLTC`} />
            <ResultCard label="Your payout" value={`${payout.toFixed(3)} zkLTC`} color={GOLD} />
            <ResultCard label="Multiplier" value={`${mult.toFixed(2)} ×`} color="#9333ea" />
            <ResultCard
              label="Net P&L"
              value={`${pnl >= 0 ? "+" : "−"}${Math.abs(pnl).toFixed(3)} zkLTC`}
              color={pnl >= 0 ? GREEN : RED}
            />
          </div>
        </div>

        {/* SECTION 4 */}
        <div style={sectionWrap}>
          <h3 style={sectionTitle}>4 Multiplier Curve</h3>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 18 }}>
                <CartesianGrid stroke="#cbd5e1" strokeDasharray="3 3" />
                <XAxis dataKey="x" stroke={MUTED} tick={{ fill: MUTED, fontSize: 11 }}
                  label={{ value: "Winning tile % of total pool", position: "insideBottom", offset: -8, fill: MUTED, fontSize: 11 }} />
                <YAxis domain={[0, 25]} stroke={MUTED} tick={{ fill: MUTED, fontSize: 11 }}
                  label={{ value: "Multiplier (×)", angle: -90, position: "insideLeft", fill: MUTED, fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 8, color: INK, fontSize: 12 }}
                  formatter={(v: any, _n, p: any) => [`Win tile = ${p.payload.x}% of pool → ${v}× multiplier`, ""]}
                  labelFormatter={() => ""}
                />
                <ReferenceLine y={1} stroke={RED} strokeDasharray="4 4" label={{ value: "Break-even", fill: RED, fontSize: 11, position: "insideTopRight" }} />
                <Line type="monotone" dataKey="y" stroke={BLUE} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize: 12.5, color: MUTED, marginTop: 8, lineHeight: 1.6 }}>
            Lower tile coverage = higher multiplier, higher risk. Higher tile coverage = lower multiplier, safer bet. EV is always −5% regardless of strategy.
          </div>
        </div>

        {/* SECTION 5 */}
        <div style={sectionWrap}>
          <h3 style={sectionTitle}>5 Pool Distribution</h3>
          <div className="about-pie-row">
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} stroke="#fff" strokeWidth={2}>
                    {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 8, color: INK, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: INK }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.9, color: INK }}>
              <div><b style={{ color: BLUE }}>House edge = 5%</b> flat</div>
              <div>Expected return = 95% of investment</div>
              <div>No hidden fees. No slippage.</div>
              <div>Same EV for every strategy.</div>
            </div>
          </div>
        </div>

        {/* SECTION 6 */}
        <div style={sectionWrap}>
          <h3 style={sectionTitle}>6 Expected Value (Any Strategy)</h3>
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
          <h3 style={sectionTitle}>7 Drand Provably Fair Randomness</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {["🏛 Cloudflare", "🏛 EPFL", "🏛 Univ. of Chile"].map((s) => (
              <span key={s} style={{
                background: SOFT, border: `1.5px solid ${BORDER}`, color: INK,
                borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 800,
                boxShadow: "2px 2px 0 0 rgba(15,23,42,.85)",
              }}>{s}</span>
            ))}
          </div>
          <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, marginBottom: 10 }}>
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
            marginTop: 12, background: "rgba(22,163,74,.08)",
            border: `1.5px solid ${GREEN}`, borderRadius: 10, padding: 12,
            color: INK, fontSize: 13, lineHeight: 1.7,
          }}>
            <div style={{ color: GREEN, fontWeight: 900, marginBottom: 4 }}>✓ Self-verify any past round:</div>
            1. Find round's Drand number in Ended Rounds<br />
            2. Visit the URL above with that number<br />
            3. Run the formula — result matches our tile
          </div>
        </div>

        {/* SECTION 8 */}
        <div style={sectionWrap}>
          <h3 style={sectionTitle}>8 Bonanza Rounds</h3>
          <div className="about-grid-2">
            <div style={{ ...card }}>
              <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 8, color: INK }}>Normal Round</div>
              <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                <div style={{ color: GREEN }}>✓ zkLTC payout to winners</div>
                <div style={{ color: RED }}>✗ No bonus points</div>
              </div>
            </div>
            <div style={{
              ...card,
              borderColor: GOLD,
              boxShadow: "2px 2px 0 0 rgba(15,23,42,.85), 0 0 0 2px rgba(217,119,6,.25), 0 0 24px rgba(217,119,6,.35)",
            }}>
              <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 8, color: GOLD }}>🎉 BONANZA Round</div>
              <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                <div style={{ color: GREEN }}>✓ zkLTC payout to winners</div>
                <div style={{ color: GREEN }}>✓ +10,000 LitDEX Points to ALL winners</div>
                <div style={{ color: MUTED, fontSize: 12 }}>(awarded on-chain, verifiable by tx hash)</div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 12, lineHeight: 1.6 }}>
            Bonanza designation is hidden until round resolves — you won't know in advance. Revealed with special animation after resolution. Bonanza rounds appear with 🎉 badge in round history.
          </div>
        </div>
      </div>
    </div>
  );
}
