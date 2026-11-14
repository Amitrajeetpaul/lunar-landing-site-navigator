import type { Sample } from '../lib/ephemeris';
import type { Score } from '../lib/score';
import type { SlopeStats } from '../lib/slope';
import type { Verdict, Rule } from '../lib/visibility';
import { fmtDur } from '../lib/analysis';
import { HorizonChart } from './HorizonChart';

const band = (a: number, b: number) => (Math.round(a) === Math.round(b) ? `${Math.round(a)}%` : `${Math.round(a)}–${Math.round(b)}%`);

/** Print-only one-page report (shown by the browser's Save as PDF). */
export function Report(p: {
  siteName: string; lat: number; lon: number; start: number; days: number; mast: number; ruleLabel: string; relay: boolean;
  source: string; terrainLabel: string; verdict: Verdict; lo: Verdict; hi: Verdict; score: Score; slope: SlopeStats | null;
  horizon: Float32Array; samples: Sample[]; now: Sample; rule: Rule; brief: string;
}) {
  const v = p.verdict;
  return (
    <section className="report">
      <h1>Lunar Landing Site Navigator: site report</h1>
      <p><b>{p.siteName}</b> · lat {p.lat.toFixed(3)}°, lon {p.lon.toFixed(3)}°E · window {new Date(p.start).toISOString().slice(0, 16).replace('T', ' ')} UTC + {p.days} days · antenna {p.mast} m</p>
      <p>Disc rule: {p.ruleLabel}. Earth contact: {p.relay ? 'relay satellite assumed always available' : 'direct to Earth'}.</p>
      <h2>Verdict</h2>
      <table>
        <tbody>
          <tr><th>Sun above the horizon</th><td>{v.sunPct.toFixed(0)}% (whole disc to any part: {band(p.lo.sunPct, p.hi.sunPct)})</td><th>Longest Sun outage</th><td>{fmtDur(v.sunOutageD)}</td></tr>
          <tr><th>Earth contact</th><td>{v.earthPct.toFixed(0)}% ({band(p.lo.earthPct, p.hi.earthPct)})</td><th>Longest Earth outage</th><td>{fmtDur(v.earthOutageD)}</td></tr>
          <tr><th>Sun and Earth together</th><td>{v.bothPct.toFixed(0)}% ({band(p.lo.bothPct, p.hi.bothPct)})</td><th>Longest joint outage</th><td>{fmtDur(v.bothOutageD)}</td></tr>
        </tbody>
      </table>
      <p>{p.brief}</p>
      <h2>Mission score: {p.score.score.toFixed(0)} / 100</h2>
      <table>
        <tbody>{p.score.parts.map((q) => <tr key={q.key}><th>{q.label} (weight {q.weight})</th><td>{q.value === null ? 'n/a (no LOLA terrain)' : q.value.toFixed(0)}</td><td>{q.how}</td></tr>)}</tbody>
      </table>
      {p.slope && <p>Slope within {p.slope.radiusM} m (LOLA grid, baseline about twice the cell size): median {p.slope.medianDeg.toFixed(1)}°, {p.slope.under10.toFixed(0)}% under 10°, maximum {p.slope.maxDeg.toFixed(0)}°.</p>}
      <h2>Horizon and sky paths</h2>
      <div className="rchart"><HorizonChart horizon={p.horizon} samples={p.samples} now={p.now} rule={p.rule} /></div>
      <h2>Data and assumptions</h2>
      <ul>
        <li>Sun and Earth positions: {p.source}.</li>
        <li>Terrain: {p.terrainLabel}</li>
        <li>Horizon from 720 rays with Moon curvature; visibility tested every 3 hours.</li>
        <li>Planning aid only. Sunlight and Earth contact are assessed; rocks, local hazards and landing safety are not.</li>
      </ul>
      <p className="small">Link to reproduce: {location.href}</p>
      <p className="small">Generated {new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC by Team GIT_HAPPENS · NASA Space Apps 2026</p>
    </section>
  );
}
