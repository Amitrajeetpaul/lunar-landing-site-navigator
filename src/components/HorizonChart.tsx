import type { Sample } from '../lib/ephemeris';
import { horizonAt } from '../lib/terrain';
import { earthVisible, sunVisible, type Rule } from '../lib/visibility';

const W = 1010, H = 560, L = 62, Rr = 14, T = 14, B = 34;
const COMPASS: [number, string][] = [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W'], [360, 'N']];

export function HorizonChart({ horizon, samples, now, rule }: { horizon: Float32Array; samples: Sample[]; now: Sample; rule: Rule }) {
  const maxH = Math.max(...horizon);
  const top = Math.max(8, Math.ceil(maxH / 2) * 2 + 2), bot = -2;
  const x = (az: number) => L + (az / 360) * (W - L - Rr);
  const y = (el: number) => T + ((top - el) / (top - bot)) * (H - T - B);
  const ticks: number[] = []; for (let v = bot; v <= top; v += 2) ticks.push(v);
  const outline = Array.from({ length: 361 }, (_, a) => `${x(a)},${y(Math.max(horizonAt(horizon, a), bot))}`).join(' ');
  // plot only the portion of each path that is near the visible band
  const dots = (kind: 'sun' | 'earth') => samples.map((s, i) => {
    const az = kind === 'sun' ? s.sunAz : s.earthAz, el = kind === 'sun' ? s.sunEl : s.earthEl;
    if (el < bot - 1 || el > top + 1) return null;
    const vis = kind === 'sun' ? sunVisible(s, horizon, rule) : earthVisible(s, horizon, rule);
    return <circle key={i} cx={x(az)} cy={y(el)} r={3.2} fill={kind === 'sun' ? '#f4b73f' : '#58a6ff'} opacity={vis ? 1 : 0.28} />;
  });
  const marker = (az: number, el: number, c: string) =>
    el > bot - 1 && el < top + 1 ? <circle cx={x(az)} cy={y(el)} r={9} fill={c} stroke="#fff" strokeWidth={2.2} /> : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Terrain horizon with Sun and Earth paths">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - Rr} y1={y(v)} y2={y(v)} className={v === 0 ? 'ax0' : 'grid'} />
          <text x={L - 10} y={y(v) + 5} textAnchor="end" className="tick">{v}°</text>
        </g>
      ))}
      {COMPASS.map(([a, l]) => (
        <g key={a}>
          <line x1={x(a)} x2={x(a)} y1={T} y2={H - B} className="grid" />
          <text x={x(a)} y={H - 10} textAnchor="middle" className="tick">{l}</text>
        </g>
      ))}
      <polygon points={`${x(0)},${y(bot)} ${outline} ${x(360)},${y(bot)}`} className="terr" />
      <polyline points={outline} className="terrLine" />
      {dots('earth')}{dots('sun')}
      {marker(now.sunAz, now.sunEl, '#f4b73f')}{marker(now.earthAz, now.earthEl, '#58a6ff')}
    </svg>
  );
}
