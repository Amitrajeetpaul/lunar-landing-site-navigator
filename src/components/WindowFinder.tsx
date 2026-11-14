import { useEffect, useState } from 'react';
import { fmtDur, scanWindows, type WindowScore } from '../lib/analysis';
import type { Site } from '../lib/sites';
import type { Rule } from '../lib/visibility';

const SCAN = 120;
const fmtD = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Which start date is best for this site? One Horizons request, every daily start scored. */
export function WindowFinder({ site, from, days, mast, useHorizons, rule, relay, onUse }: { site: Site; from: number; days: number; mast: number; useHorizons: boolean; rule: Rule; relay: boolean; onUse: (start: number) => void }) {
  const [res, setRes] = useState<{ scores: WindowScore[]; source: string; terrain: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { setRes(null); }, [site, from, days, mast, useHorizons, rule, relay]);

  const run = () => {
    setBusy(true); setErr('');
    scanWindows(site, from, SCAN, days, mast, useHorizons, rule, undefined, relay).then(setRes).catch((e) => setErr(String(e?.message ?? e))).finally(() => setBusy(false));
  };

  useEffect(() => { if (new URLSearchParams(location.search).get('scan') === '1') run(); /* eslint-disable-next-line */ }, []);

  const sc = res?.scores ?? [];
  const ranked = [...sc].sort((a, b) => b.verdict.bothPct - a.verdict.bothPct || a.verdict.bothOutageD - b.verdict.bothOutageD);
  const picks: WindowScore[] = [];
  for (const r of ranked) if (picks.length < 3 && picks.every((p) => Math.abs(p.start - r.start) >= 3 * 86400000)) picks.push(r);
  const worst = sc.length ? sc.reduce((a, b) => (b.verdict.bothPct < a.verdict.bothPct ? b : a)) : null;
  const W = 1000, H = 120;

  return (
    <div className="panel">
      <h3>Best start-date finder · {site.name}</h3>
      <p className="muted">Scores every start date over the next {SCAN} days (from the window start), each for a {days}-day mission window, from a single ephemeris request. Ranked by time with Sun and Earth together, then by shortest joint outage.</p>
      <div className="row"><button className="primary" onClick={run} disabled={busy}>{busy ? 'Scanning…' : `Scan ${SCAN} days`}</button></div>
      {err && <p className="muted">Scan failed: {err}</p>}
      {res && sc.length > 0 && (
        <>
          <svg viewBox={`0 0 ${W} ${H + 20}`} className="scan">
            {sc.map((r, i) => {
              const h = (r.verdict.bothPct / 100) * H, isPick = picks.some((p) => p.start === r.start);
              return <rect key={r.start} x={(i / sc.length) * W} y={H - h} width={Math.max(W / sc.length - 1, 1)} height={Math.max(h, 1)} fill={isPick ? '#7dd89b' : '#4a6fb0'} onClick={() => onUse(r.start)}><title>{fmtD(r.start)}: both {r.verdict.bothPct.toFixed(0)}%, longest joint outage {fmtDur(r.verdict.bothOutageD)}</title></rect>;
            })}
            <text x={0} y={H + 16} className="axis">{fmtD(sc[0].start)}</text>
            <text x={W} y={H + 13} textAnchor="end" className="axis">{fmtD(sc[sc.length - 1].start)}</text>
            <text x={W / 2} y={H + 13} textAnchor="middle" className="axis">bar height = time with Sun and Earth together (0–100%)</text>
          </svg>
          <div className="picks">
            {picks.map((p, i) => (
              <div key={p.start} className={`pick ${i === 0 ? 'top' : ''}`}>
                <b>{i === 0 ? 'Best' : `#${i + 1}`}: {fmtD(p.start)}</b>
                <span>Both {p.verdict.bothPct.toFixed(0)}% · Sun {p.verdict.sunPct.toFixed(0)}% · Earth {p.verdict.earthPct.toFixed(0)}%</span>
                <span>Longest joint outage {fmtDur(p.verdict.bothOutageD)}</span>
                <button onClick={() => onUse(p.start)}>Use this date</button>
              </div>
            ))}
          </div>
          {worst && <small className="muted">Worst start: {fmtD(worst.start)} with {worst.verdict.bothPct.toFixed(0)}% both. Spread best to worst: {(ranked[0].verdict.bothPct - worst.verdict.bothPct).toFixed(0)} points, so the date matters. {res.source === 'horizons' ? 'JPL Horizons' : 'Series model (fallback)'} · {res.terrain === 'lola' ? 'LOLA terrain' : 'prototype terrain'}. Click a bar to use that date.</small>}
        </>
      )}
    </div>
  );
}
