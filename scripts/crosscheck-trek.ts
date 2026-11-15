// npm run check:trek   (network)
// Cross-checks this app's baked terrain height at each of the 19 candidate and landing sites against NASA Moon Trek's own LOLA elevation
// service (ArcGIS ImageServer identify, LRO_LOLA_DEM_Global_256ppd_v06): a different server and pipeline. Prints the differences.
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { decodeTerrain, lolaSlug } from '../src/lib/lola';
import { MISSIONS, PRESETS } from '../src/lib/sites';

const SVC = 'https://trek.nasa.gov/moon/trekarcgis/rest/services/LRO_LOLA_DEM_Global_256ppd_v06/ImageServer/identify';
const trek = async (lat: number, lon: number) => {
  const L = ((((lon + 180) % 360) + 360) % 360) - 180, g = encodeURIComponent(JSON.stringify({ x: L, y: lat }));
  for (let i = 0; i < 3; i++) { try { const j: any = await (await fetch(`${SVC}?geometry=${g}&geometryType=esriGeometryPoint&returnGeometry=false&f=json`, { signal: AbortSignal.timeout(30000) })).json(); const v = parseFloat(j.value); if (Number.isFinite(v)) return v; } catch { /* retry */ } await new Promise((r) => setTimeout(r, 1500)); }
  return NaN;
};
const rows: { name: string; ours: number; trek: number; diff: number }[] = [];
for (const s of [...PRESETS, ...MISSIONS]) {
  const f = `public/lola/${lolaSlug(s)}.bin`; if (!existsSync(f)) continue;
  const b = readFileSync(f), t = decodeTerrain(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer)!, l = t.layers[0], n = l.n, m = Math.floor((n - 1) / 2);
  const ours = l.h[m * n + m], v = await trek(s.lat, s.lon);
  rows.push({ name: s.name.split(' (')[0], ours: +ours.toFixed(1), trek: v, diff: +(ours - v).toFixed(1) });
  console.log(`${s.name.split(' (')[0].padEnd(24)} ours ${ours.toFixed(1).padStart(8)} m   Moon Trek ${String(v).padStart(8)} m   difference ${(ours - v).toFixed(1).padStart(6)} m`);
}
const d = rows.filter((r) => Number.isFinite(r.diff)).map((r) => Math.abs(r.diff));
console.log(`\n${d.length} sites: mean |difference| ${(d.reduce((a, b) => a + b, 0) / d.length).toFixed(1)} m, median ${d.sort((a, b) => a - b)[Math.floor(d.length / 2)].toFixed(1)} m, max ${Math.max(...d).toFixed(1)} m`);
writeFileSync('public/crosscheck_trek.json', JSON.stringify({ source: 'NASA Moon Trek LRO_LOLA_DEM_Global_256ppd_v06 ImageServer identify', rows }, null, 1));
