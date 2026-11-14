// npm run find:rims  (offline: reads the baked public/lola files)
// Scans candidate points around a feature with the real LOLA horizon and ranks them by sunlight over 2028
// (the Artemis IV/V year). Uses the series ephemeris for speed; final numbers come from Horizons in the app.
import { readFileSync } from 'node:fs';
import { decodeTerrain, lolaSlug } from '../src/lib/lola';
import { computeHorizon, heightAt } from '../src/lib/terrain';
import { seriesEphemeris } from '../src/lib/ephemeris';
import { flagsFor, verdictFor } from '../src/lib/visibility';
import type { Site } from '../src/lib/sites';

const R = 1737400, rad = Math.PI / 180;
const jobs: { centre: Site; half: number; step: number }[] = [
  { centre: { name: 'Shackleton', lat: -89.9, lon: 129.8 }, half: 14000, step: 500 },
  { centre: { name: 'Haworth', lat: -87.45, lon: -5.0 }, half: 30000, step: 1000 },
  { centre: { name: 'Faustini', lat: -87.18, lon: 77.0 }, half: 26000, step: 1000 },
];
const t0 = Date.UTC(2028, 0, 1), days = 365, MAST = 2;

function offsetToLatLon(c: Site, E: number, N: number) {
  const p = c.lat * rad, l = c.lon * rad;
  const u = [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)], e = [-Math.sin(l), Math.cos(l), 0];
  const n = [u[1] * e[2] - u[2] * e[1], u[2] * e[0] - u[0] * e[2], u[0] * e[1] - u[1] * e[0]];
  const d = Math.hypot(E, N), a = d / R, k = d > 0 ? Math.sin(a) / d : 1 / R, co = Math.cos(a);
  const v = [0, 1, 2].map((i) => co * u[i] + k * (N * n[i] + E * e[i]));
  return { lat: Math.asin(v[2]) / rad, lon: Math.atan2(v[1], v[0]) / rad };
}

for (const j of jobs) {
  const b = readFileSync(`public/lola/${lolaSlug(j.centre)}.bin`);
  const t = decodeTerrain(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))!;
  const res: { E: number; N: number; lat: number; lon: number; elev: number; sun: number; earth: number; both: number; out: number }[] = [];
  for (let E = -j.half; E <= j.half; E += j.step) for (let N = -j.half; N <= j.half; N += j.step) {
    const z = heightAt(t, E, N); if (Number.isNaN(z)) continue;
    const ll = offsetToLatLon(j.centre, E, N);
    const hor = computeHorizon(t, MAST, E, N, 180); // 2 deg rays: screening only
    const v = verdictFor(flagsFor(seriesEphemeris({ name: '', ...ll }, t0, days), hor, 'centre'));
    res.push({ E, N, ...ll, elev: z, sun: v.sunPct, earth: v.earthPct, both: v.bothPct, out: v.sunOutageD });
  }
  res.sort((a, b) => b.sun - a.sun);
  console.log(`\n== ${j.centre.name}: ${res.length} candidates, 2028, mast ${MAST} m, disc centre. Top by sunlight:`);
  for (const r of res.slice(0, 6)) console.log(`  lat ${r.lat.toFixed(3)} lon ${r.lon.toFixed(3)} | elev ${r.elev.toFixed(0)} m | Sun ${r.sun.toFixed(0)}% (longest dark ${r.out.toFixed(1)} d) Earth ${r.earth.toFixed(0)}% both ${r.both.toFixed(0)}%`);
}
