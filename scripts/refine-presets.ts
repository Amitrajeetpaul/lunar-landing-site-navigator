// npm run refine:presets  (offline: reads the baked 20 m layer around each preset)
// A coordinate quoted for a peak or rim is rarely the exact crest. Scan +-2.5 km around it (150 m steps) with the real
// LOLA horizon and report the point with the most time of Sun AND Earth together in 2028 (mast 2 m, disc centre).
// Candidates are screening results (180 rays, series ephemeris): the app re-computes the chosen site in full.
import { readFileSync } from 'node:fs';
import { decodeTerrain, lolaSlug } from '../src/lib/lola';
import { computeHorizon, heightAt } from '../src/lib/terrain';
import { seriesEphemeris } from '../src/lib/ephemeris';
import { flagsFor, verdictFor } from '../src/lib/visibility';
import { PRESETS, type Site } from '../src/lib/sites';

const R = 1737400, rad = Math.PI / 180, t0 = Date.UTC(2028, 0, 1), HALF = 2400, STEP = 150;
function offsetToLatLon(c: Site, E: number, N: number) {
  const p = c.lat * rad, l = c.lon * rad;
  const u = [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)], e = [-Math.sin(l), Math.cos(l), 0];
  const n = [u[1] * e[2] - u[2] * e[1], u[2] * e[0] - u[0] * e[2], u[0] * e[1] - u[1] * e[0]];
  const d = Math.hypot(E, N), a = d / R, k = d > 0 ? Math.sin(a) / d : 1 / R, co = Math.cos(a);
  const v = [0, 1, 2].map((i) => co * u[i] + k * (N * n[i] + E * e[i]));
  return { lat: Math.asin(v[2]) / rad, lon: Math.atan2(v[1], v[0]) / rad };
}
for (const s of PRESETS.filter((p) => !p.name.includes('shadowed demo'))) {
  const b = readFileSync(`public/lola/${lolaSlug(s)}.bin`);
  const t = decodeTerrain(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))!;
  const res: { lat: number; lon: number; z: number; sun: number; earth: number; both: number; dark: number; d: number }[] = [];
  for (let E = -HALF; E <= HALF; E += STEP) for (let N = -HALF; N <= HALF; N += STEP) {
    const z = heightAt(t, E, N); if (Number.isNaN(z)) continue;
    const ll = offsetToLatLon(s, E, N);
    const v = verdictFor(flagsFor(seriesEphemeris({ name: '', ...ll }, t0, 365), computeHorizon(t, 2, E, N, 180), 'centre'));
    res.push({ ...ll, z, sun: v.sunPct, earth: v.earthPct, both: v.bothPct, dark: v.sunOutageD, d: Math.hypot(E, N) });
  }
  const at = res.find((r) => r.d === 0)!;
  res.sort((a, b) => b.both - a.both || b.sun - a.sun);
  const top = res[0];
  console.log(`${s.name}\n   as given : elev ${at.z.toFixed(0)} m  Sun ${at.sun.toFixed(0)}% Earth ${at.earth.toFixed(0)}% both ${at.both.toFixed(0)}%\n   refined  : lat ${top.lat.toFixed(3)} lon ${top.lon.toFixed(3)} (${(top.d / 1000).toFixed(1)} km away) elev ${top.z.toFixed(0)} m  Sun ${top.sun.toFixed(0)}% (dark ${top.dark.toFixed(1)} d) Earth ${top.earth.toFixed(0)}% both ${top.both.toFixed(0)}%`);
}
