import React from "react";
import { Shield, ExternalLink } from "lucide-react";
import { api } from "../lib/api";

const EXPLORER = "https://liteforge.explorer.caldera.xyz";

export default function ProvablyFair({ block, onClose }: { block: number; onClose: () => void }) {
  const [data, setData] = React.useState<{ block: any; signals: any } | null>(null);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    api.verify(block).then(setData).catch((e) => setErr(e.message || "failed"));
  }, [block]);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3><Shield size={18} style={{ display: "inline", marginRight: 8, verticalAlign: "-3px", color: "var(--accent-2)" }} />Provably Fair</h3>
        <p className="sub">Every result comes purely from this block's public data. Below is the exact breakdown of how each number is derived, so you can re-run it yourself.</p>

        {err && <div className="warn">Could not load block #{block}: {err}</div>}
        {!data && !err && <div className="empty">Reading block #{block.toLocaleString()}…</div>}

        {data && <Breakdown data={data} />}

        {data && (
          <a className="pf-btn" style={{ marginTop: 6 }} href={`${EXPLORER}/block/${data.block.number}`} target="_blank" rel="noreferrer">
            Open block on explorer <ExternalLink size={11} />
          </a>
        )}
        <button className="modal-close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function Breakdown({ data }: { data: { block: any; signals: any } }) {
  const { block, signals: s } = data;
  const hash: string = block.hash;
  const lastChar = hash.slice(-1);
  const dec: string = s.decimal;
  const last2 = dec.slice(-2);
  const last3 = dec.slice(-3);
  const lastDecDigit = dec.slice(-1);

  return (
    <>
      {/* block facts */}
      <div className="pf-row"><span className="k">Block</span><span className="v acc">#{block.number.toLocaleString()}</span></div>
      <div className="pf-row"><span className="k">Transactions</span><span className="v">{block.txCount}</span></div>
      <div className="pf-row"><span className="k">Gas used</span><span className="v">{Number(block.gasUsed).toLocaleString()}</span></div>

      {/* the hash, with the last character highlighted (it drives most games) */}
      <div className="pf-hash-label">Block hash (last digit decides Coin Flip / Lucky Digit / Hi-Lo)</div>
      <div className="pf-hash">
        {hash.slice(0, -1)}<span className="hl-blue">{lastChar}</span>
      </div>

      {/* hash as decimal, last 3 highlighted (drives the mod games) */}
      <div className="pf-hash-label">Hash as a number (last digits decide Number / Closest)</div>
      <div className="pf-hash dec">
        {dec.slice(0, -3)}<span className="hl-green">{last3.slice(0, 1)}</span><span className="hl-gold">{last3.slice(1)}</span>
      </div>

      <div className="pf-sep">How each game resolves</div>

      <Game
        name="Coin Flip" result={s.even ? "EVEN" : "ODD"}
        steps={[
          ["Take the hash as a number", ""],
          ["Look at its last digit", lastDecDigit],
          [`${lastDecDigit} is ${Number(lastDecDigit) % 2 === 0 ? "even" : "odd"} → so the whole number is`, s.even ? "EVEN" : "ODD"],
        ]}
      />

      <Game
        name="Lucky Digit" result={s.lastNibble.toString(16)} 
        steps={[
          ["Take the very last character of the hash", lastChar],
          ["That hex digit is your result", `${lastChar}  (= ${parseInt(lastChar, 16)} in decimal)`],
        ]}
      />

      <Game
        name="Hi-Lo" result={s.lastNibble >= 8 ? "HIGH" : "LOW"}
        steps={[
          ["Last hex digit", `${lastChar} (= ${s.lastNibble})`],
          ["0-7 = LOW, 8-f = HIGH", `${s.lastNibble} ${s.lastNibble >= 8 ? "≥ 8 → HIGH" : "≤ 7 → LOW"}`],
        ]}
      />

      <Game
        name="Number 0-99" result={String(s.mod100)}
        steps={[
          ["Divide the hash number by 100, keep only the remainder", "hash mod 100"],
          ["The remainder is always the last 2 digits", last2],
          ["Result", String(s.mod100)],
        ]}
        visual={<DivVisual dec={dec} keep={2} divisor={100} result={s.mod100} />}
      />

      <Game
        name="Closest (PvP)" result={String(s.mod1000)}
        steps={[
          ["Divide the hash number by 1000, keep the remainder", "hash mod 1000"],
          ["The remainder is always the last 3 digits", last3],
          ["Closest guess to this number wins the whole pot", String(s.mod1000)],
        ]}
        visual={<DivVisual dec={dec} keep={3} divisor={1000} result={s.mod1000} />}
      />

      <Game
        name="Txn Over/Under" result={block.txCount > 5 ? "OVER" : "UNDER"}
        steps={[
          ["Count transactions in the block", String(block.txCount)],
          ["Compare to the line of 5", `${block.txCount} ${block.txCount > 5 ? "> 5 → OVER" : "≤ 5 → UNDER"}`],
        ]}
      />

      <Game
        name="Gas Over/Under" result={Number(block.gasUsed) > 500000 ? "OVER" : "UNDER"}
        steps={[
          ["Gas used by the block", Number(block.gasUsed).toLocaleString()],
          ["Compare to the line of 500,000", `${Number(block.gasUsed).toLocaleString()} ${Number(block.gasUsed) > 500000 ? "> 500k → OVER" : "≤ 500k → UNDER"}`],
        ]}
      />

      <Game
        name="Perfect Block ⚡" result={`#${block.number.toLocaleString()}`}
        steps={[
          ["You guess the exact block number before the round opens (first 2 min only)", ""],
          ["When the round settles, the chain's current block number is taken", `#${block.number.toLocaleString()}`],
          ["If your guess === that block number, you win 50× your stake", `Stake 0.01 → Win 0.50 zkLTC`],
          ["No randomness from the hash — only the block height decides", "block.number"],
        ]}
      />
    </>
  );
}

function Game({ name, result, steps, visual }: { name: string; result: string; steps: Array<[string, string]>; visual?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
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
          {visual}
        </div>
      )}
    </div>
  );
}

/** Visual: show the giant hash number with everything except the last `keep`
 *  digits dimmed/struck, and the kept digits highlighted as the remainder. */
function DivVisual({ dec, keep, divisor, result }: { dec: string; keep: number; divisor: number; result: number }) {
  const head = dec.slice(0, -keep);
  const tail = dec.slice(-keep);
  // shorten the head so it fits; keep the tail fully visible
  const shortHead = head.length > 30 ? "…" + head.slice(-30) : head;
  return (
    <div className="pf-visual">
      <div className="pf-visual-lbl">hash ÷ {divisor.toLocaleString()} → remainder = last {keep} digits</div>
      <div className="pf-visual-num">
        <span className="discard">{shortHead}</span><span className="keep">{tail}</span>
      </div>
      <div className="pf-visual-foot">
        <span className="x">grey = removed by ÷ {divisor.toLocaleString()}</span>
        <span className="eq">remainder = <b>{result}</b></span>
      </div>
    </div>
  );
}
