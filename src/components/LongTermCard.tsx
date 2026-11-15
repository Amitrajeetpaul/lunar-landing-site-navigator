import { useEffect, useState } from 'react';
import type { Site } from '../lib/sites';

interface Stat { sun: number; earth: number; both: number; sunDarkD: number; earthDarkD: number; bothDarkD: number }
interface Entry { name: string; lat: number; lon: number; mast: Record<string, { any: Stat; whole: Stat }>; yearly?: { sunMin: number; sunMax: number; bothMin: number; bothMax: number } }
interface Nasa { lat: number; name: string; nasaSun: number; nasaEarth: number; nasaSunRange: [number, number]; nasaEarthRange: [number, number]; map: string }
let cache: Promise<{ lt: Entry[]; nasa: Nasa[] }> | null = null;
const load = () => (cache ??= Promise.all([fetch('/longterm.json').then((r) => (r.ok ? r.json() : { sites: [] })).catch(() => ({ sites: [] })), fetch('/validation_nasa.json').then((r) => (r.ok ? r.json() : { rows: [] })).catch(() => ({ rows: [] }))]).then(([a, b]) => ({ lt: a.sites ?? [], nasa: b.rows ?? [] })));
const near = (a: number, b: number) => Math.abs(a - b) < 6e-4;
const band = (w: number, a: number) => (Math.round(w) === Math.round(a) ? `${Math.round(a)}%` : `${Math.round(w)}–${Math.round(a)}%`);
const dur = (d: number) => (d > 6000 ? 'never lit' : d < 1 ? `${Math.round(d * 24)} h` : `${d.toFixed(1)} d`);
const rng = (r: [number, number]) => (Math.round(r[0]) === Math.round(r[1]) ? `${Math.round(r[0])}%` : `${Math.round(r[0])}–${Math.round(r[1])}%`);

/** Full lunar nodal cycle (about 18.6 years, one-hour-class steps) for the candidate and landing sites, precomputed from Horizons + real LOLA terrain. */
export function LongTermCard({ site }: { site: Site }) {
  const [data, setData] = useState<{ lt: Entry[]; nasa: Nasa[] } | null>(null);
  useEffect(() => { load().then(setData); }, []);
  const e = data?.lt.find((x) => near(x.lat, site.lat) && near(x.lon, site.lon));
  const n = data?.nasa.find((x) => near(x.lat, site.lat) && x.name.split(' (')[0] === site.name.split(' (')[0]);
  return (
    <div className="card">
      <div className="label">Long term · 18.6-year cycle (2026–2044)</div>
      {!data && <small className="muted">Loading…</small>}
      {data && !e && <small className="muted">Full-cycle statistics are precomputed for the candidate and landing sites. For a custom site, use the best start-date finder on the Compare tab.</small>}
      {e && (
        <>
          {(['2', '10'] as const).map((m) => e.mast[m] && (
            <div key={m} className="kv stack"><span>{m} m antenna</span>
              <b>Sun {band(e.mast[m].whole.sun, e.mast[m].any.sun)} · Earth {band(e.mast[m].whole.earth, e.mast[m].any.earth)} · both {band(e.mast[m].whole.both, e.mast[m].any.both)}</b></div>
          ))}
          <div className="kv stack"><span>Longest dark spells in 18.6 years (2 m, any part of the disc)</span>
            <b>Sun {dur(e.mast['2'].any.sunDarkD)} · Earth {dur(e.mast['2'].any.earthDarkD)} · both {dur(e.mast['2'].any.bothDarkD)}</b></div>
          {e.yearly && <div className="kv stack"><span>Year to year (2 m, any part)</span><b>Sun {Math.round(e.yearly.sunMin)}–{Math.round(e.yearly.sunMax)}% · both {Math.round(e.yearly.bothMin)}–{Math.round(e.yearly.bothMax)}%</b></div>}
          {n && (
            <div className="kv stack"><span>Independent check: NASA’s own LOLA illumination map around this spot (±{n.map.startsWith('85S') ? 60 : 120} m, 18.6 years, any part of the disc)</span>
              <b>Sun {rng(n.nasaSunRange)} · Earth {rng(n.nasaEarthRange)}</b>
              <small className="muted">Centre pixel: Sun {Math.round(n.nasaSun)}% · Earth {Math.round(n.nasaEarth)}%. Nearby pixels differ a lot on sharp crests, so the range is the fair comparison.</small></div>
          )}
          <small className="muted">Whole disc to any part of the disc. One-lunar-nodal-cycle average from JPL Horizons and the real terrain skyline, so it is comparable with published multi-year figures. Not landing clearance.</small>
        </>
      )}
    </div>
  );
}
