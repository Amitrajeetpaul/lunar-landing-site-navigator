import { DEFAULT_WEIGHTS, type Score, type Weights } from '../lib/score';

const NAMES: Record<keyof Weights, string> = { sun: 'Sunlight', both: 'Sun + Earth together', outage: 'Short outages', slope: 'Gentle ground' };

/** The headline number, with its formula and adjustable weights in plain sight. */
export function ScoreCard({ score, w, setW }: { score: Score; w: Weights; setW: (w: Weights) => void }) {
  return (
    <div className="card">
      <div className="label">Mission score</div>
      <div className="scoreRow"><b className="bigScore">{score.score.toFixed(0)}</b><span className="muted">/ 100 · weighted average of the four parts below</span></div>
      {score.parts.map((p) => (
        <div key={p.key} className="bar sbar" title={p.how}>
          <span>{p.label}</span>
          <div className="track"><div style={{ width: `${p.value ?? 0}%`, background: p.value === null ? 'transparent' : 'var(--both)' }} /></div>
          <b>{p.value === null ? 'n/a' : p.value.toFixed(0)}</b>
        </div>
      ))}
      <details open={(new URLSearchParams(location.search).get('open') ?? '').includes('weights')}>
        <summary>Adjust the weights</summary>
        {(Object.keys(NAMES) as (keyof Weights)[]).map((k) => (
          <label key={k} className="wrow">{NAMES[k]}<input type="range" min={0} max={100} value={w[k]} onChange={(e) => setW({ ...w, [k]: +e.target.value })} /><b>{w[k]}</b></label>
        ))}
        <button onClick={() => setW(DEFAULT_WEIGHTS)}>Reset weights</button>
        <p className="muted tiny">Score = Σ(weight × part) ÷ Σ(weights of parts available). Short outages = 100 × (1 − longest joint outage ÷ half the window). Gentle ground = % of ground within 100 m under 10° (LOLA sites only; left out otherwise). This is a comparison aid, not a safety rating.</p>
      </details>
    </div>
  );
}
