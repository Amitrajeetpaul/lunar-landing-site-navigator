import type { Sample } from '../lib/ephemeris';
import type { Flags } from '../lib/visibility';

const W = 1010, ROW = 36, GAP = 12, L = 92, Rr = 44, T = 6;

function runs(a: Uint8Array) {
  const out: [number, number][] = []; let s = -1;
  a.forEach((v, i) => { if (v && s < 0) s = i; if ((!v || i === a.length - 1) && s >= 0) { out.push([s, v ? i + 1 : i]); s = -1; } });
  return out;
}

export function Timeline({ samples, flags, cursor, onPick }: { samples: Sample[]; flags: Flags; cursor: number; onPick: (t: number) => void }) {
  const n = samples.length, t0 = samples[0].t, t1 = samples[n - 1].t;
  const plotW = W - L - Rr, H = T + 3 * ROW + 2 * GAP + 44;
  const x = (i: number) => L + (i / (n - 1)) * plotW;
  const rows: [string, Uint8Array, string][] = [['Sun', flags.sun, '#f4b73f'], ['Earth', flags.earth, '#58a6ff'], ['Both', flags.both, '#7dd89b']];
  const spanD = (t1 - t0) / 86400000, every = spanD > 35 ? 10 : 5;
  const ticks: number[] = []; for (let d = 0; d <= spanD; d += every) ticks.push(d);
  const fmt = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const cx = L + Math.min(Math.max((cursor - t0) / (t1 - t0), 0), 1) * plotW;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart tl" role="img" aria-label="Visibility timeline"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * W;
        onPick(t0 + Math.min(Math.max((px - L) / plotW, 0), 1) * (t1 - t0));
      }}>
      {rows.map(([name, f, c], r) => {
        const y = T + r * (ROW + GAP);
        return (
          <g key={name}>
            <text x={L - 14} y={y + ROW / 2 + 5} textAnchor="end" className="rowl">{name}</text>
            <rect x={L} y={y} width={plotW} height={ROW} rx={3} className="track" />
            {runs(f).map(([a, b], k) => <rect key={k} x={x(a)} y={y} width={Math.max(x(b) - x(a), 2)} height={ROW} fill={c} rx={2} />)}
          </g>
        );
      })}
      {ticks.map((d) => {
        const px = L + (d / spanD) * plotW;
        return <g key={d}><line x1={px} x2={px} y1={T + 3 * ROW + 2 * GAP + 6} y2={T + 3 * ROW + 2 * GAP + 14} className="grid" />
          <text x={px} y={T + 3 * ROW + 2 * GAP + 34} textAnchor="middle" className="tick">{fmt(t0 + d * 86400000)}</text></g>;
      })}
      <line x1={cx} x2={cx} y1={0} y2={T + 3 * ROW + 2 * GAP + 6} stroke="#fff" strokeWidth={3} />
    </svg>
  );
}
