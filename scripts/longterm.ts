// npm run longterm   (network, about 15 minutes)
// 18.6-year statistics (one full lunar nodal cycle, 2026-01-01 to 2044-09-01, 3-hour steps) for the candidate and landing sites:
// JPL Horizons Sun and Earth az/el from each site + the real LOLA skyline (baked in public/lola) -> % of time with Sun, Earth, both and
// the longest dark spell, for a 2 m and a 10 m mast, under the "whole disc" and "any part" rules. Writes public/longterm.json.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { decodeTerrain, lolaSlug } from '../src/lib/lola';
import { computeHorizon } from '../src/lib/terrain';
import { flagsFor, verdictFor, type Rule } from '../src/lib/visibility';
import type { Sample } from '../src/lib/ephemeris';
import { MISSIONS, PRESETS, type Site } from '../src/lib/sites';

process.on('unhandledRejection', (e) => console.error('unhandled', String(e).slice(0, 150)));
const START = '2026-01-01 00:00', STOP = '2044-09-01 00:00';

async function horizons(cmd: string, s: Site): Promise<[number, number, number][]> {
  const q = new URLSearchParams({ format: 'json', COMMAND: `'${cmd}'`, OBJ_DATA: "'NO'", MAKE_EPHEM: "'YES'", EPHEM_TYPE: "'OBSERVER'", CENTER: "'coord@301'", COORD_TYPE: "'GEODETIC'",
    SITE_COORD: `'${s.lon},${s.lat},0'`, START_TIME: `'${START}'`, STOP_TIME: `'${STOP}'`, STEP_SIZE: "'3 h'", QUANTITIES: "'4,13'", ANG_FORMAT: "'DEG'", CSV_FORMAT: "'YES'" });
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(`https://ssd.jpl.nasa.gov/api/horizons.api?${q}`, { signal: AbortSignal.timeout(180000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const text: string = (await r.json()).result ?? '';
      const a = text.indexOf('$$SOE'), b = text.indexOf('$$EOE'); if (a < 0 || b < 0) throw new Error('no ephemeris');
      return text.slice(a + 5, b).trim().split('\n').map((row) => { const n = row.split(',').slice(1).map((x) => x.trim()).filter((x) => /^-?\d/.test(x)).map(Number); return [n[0], n[1], n[2] / 7200] as [number, number, number]; });
    } catch (e) { console.warn('  retry', cmd, String(e).slice(0, 80)); await new Promise((r) => setTimeout(r, 4000 * (i + 1))); }
  }
  throw new Error('Horizons failed for ' + s.name);
}

const sites: (Site & { kind: string })[] = [...PRESETS.map((s) => ({ ...s, kind: 'candidate' })), ...MISSIONS.map((s) => ({ ...s, kind: 'landing' }))];
const out: any = { source: 'JPL Horizons (DE441) + NASA LOLA terrain', start: START, stop: STOP, stepHours: 3, years: 18.67, masts: [2, 10], sites: [] };
const t0 = Date.parse(START.replace(' ', 'T') + ':00Z');
for (const s of sites) {
  const f = `public/lola/${lolaSlug(s)}.bin`; if (!existsSync(f)) { console.warn('no terrain file for', s.name); continue; }
  const b = readFileSync(f), terrain = decodeTerrain(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer)!;
  const t1 = Date.now();
  const sun = await horizons('10', s), earth = await horizons('399', s);
  const n = Math.min(sun.length, earth.length);
  const samples: Sample[] = Array.from({ length: n }, (_, i) => ({ t: t0 + i * 3 * 3600e3, sunAz: sun[i][0], sunEl: sun[i][1], earthAz: earth[i][0], earthEl: earth[i][1], sunR: sun[i][2], earthR: earth[i][2] }));
  const entry: any = { name: s.name, lat: s.lat, lon: s.lon, kind: s.kind, terrain: terrain.label, samples: n, mast: {} };
  for (const mast of [2, 10]) {
    const hor = computeHorizon(terrain, mast); entry.mast[mast] = {};
    for (const rule of ['any', 'whole'] as Rule[]) {
      const fl = flagsFor(samples, hor, rule), v = verdictFor(fl);
      entry.mast[mast][rule] = { sun: +v.sunPct.toFixed(1), earth: +v.earthPct.toFixed(1), both: +v.bothPct.toFixed(1), sunDarkD: +v.sunOutageD.toFixed(1), earthDarkD: +v.earthOutageD.toFixed(1), bothDarkD: +v.bothOutageD.toFixed(1) };
      if (mast === 2 && rule === 'any') { // how much it varies from year to year
        const yr = (i: number) => new Date(samples[i].t).getUTCFullYear(), byY = new Map<number, { n: number; s: number; b: number }>();
        for (let i = 0; i < n; i++) { const y = yr(i), e = byY.get(y) ?? { n: 0, s: 0, b: 0 }; e.n++; e.s += fl.sun[i]; e.b += fl.both[i]; byY.set(y, e); }
        const full = [...byY.values()].filter((e) => e.n > 2000);
        entry.yearly = { sunMin: +Math.min(...full.map((e) => (100 * e.s) / e.n)).toFixed(1), sunMax: +Math.max(...full.map((e) => (100 * e.s) / e.n)).toFixed(1), bothMin: +Math.min(...full.map((e) => (100 * e.b) / e.n)).toFixed(1), bothMax: +Math.max(...full.map((e) => (100 * e.b) / e.n)).toFixed(1) };
      }
    }
  }
  out.sites.push(entry); writeFileSync('public/longterm.json', JSON.stringify(out));
  const a = entry.mast[2].any, w = entry.mast[2].whole;
  console.log(`${s.name.padEnd(44)} 2m: Sun ${w.sun}-${a.sun}%  Earth ${w.earth}-${a.earth}%  both ${w.both}-${a.both}%  longest dark Sun ${a.sunDarkD} d  (${((Date.now() - t1) / 1000).toFixed(0)}s)`);
}
console.log('done', out.sites.length, 'sites');
