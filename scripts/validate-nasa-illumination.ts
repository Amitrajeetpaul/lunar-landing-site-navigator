// npm run validate:nasa   (needs public/longterm.json from `npm run longterm`)
// Independent check against NASA's own long-term maps: LOLA "Lunar Polar Illumination" (Mazarico et al.), PGDA product 69 / PDS
// AVGVISIB_*: average Sun and Earth disc visibility over an 18.6-year cycle with one-hour steps, polar stereographic, any-part-of-the-disc.
// For each polar site we read NASA's value at the site (and its 3x3 neighbourhood) and compare with this app's 18.6-year result.
import { readFileSync, writeFileSync } from 'node:fs';

const R = 1_737_400, BASE = 'https://imbrium.mit.edu/EXTRAS/ILLUMINATION/IMG';
const PRODUCTS = [{ key: '85S_060M', res: 60, minLat: -85.0 }, { key: '75S_120M', res: 120, minLat: -75.5 }];

async function size(file: string) { const r = await fetch(`${BASE}/${file}`, { method: 'HEAD' }); return +r.headers.get('content-length')!; }
async function range(file: string, a: number, b: number) {
  for (let i = 0; i < 4; i++) { try { const r = await fetch(`${BASE}/${file}`, { headers: { Range: `bytes=${a}-${b}` }, signal: AbortSignal.timeout(40000) }); if (r.status !== 206) throw new Error('HTTP ' + r.status); return new DataView(await r.arrayBuffer()); } catch (e) { await new Promise((r) => setTimeout(r, 1500 * (i + 1))); } }
  throw new Error('range failed ' + file);
}
const stereo = (lat: number, lon: number) => { const p = (lat * Math.PI) / 180, l = (lon * Math.PI) / 180, px = Math.cos(p) * Math.cos(l), py = Math.cos(p) * Math.sin(l), pz = Math.sin(p), k = (2 * R) / (1 - pz); return { x: k * py, y: k * px }; };

type Orient = 'north-up-east-right' | 'mirrored' | 'rotated90' | 'rotated180';
const orient = (o: Orient, x: number, y: number) => (o === 'north-up-east-right' ? [x, y] : o === 'mirrored' ? [-x, y] : o === 'rotated90' ? [y, -x] : [-x, -y]);

async function sample(prod: typeof PRODUCTS[0], kind: 'SUN' | 'EARTH', lat: number, lon: number, o: Orient) {
  const file = `AVGVISIB_${prod.key}_201608${kind === 'EARTH' ? '_EARTH' : ''}.IMG`, N = Math.round(Math.sqrt((await sizeCache(file)) / 2)), c0 = (N - 1) / 2;
  const s = stereo(lat, lon), [x, y] = orient(o, s.x, s.y), col = Math.round(c0 + x / prod.res), row = Math.round(c0 - y / prod.res);
  if (col < 1 || row < 1 || col >= N - 1 || row >= N - 1) return null;
  const vals: number[] = [];
  for (let dr = -1; dr <= 1; dr++) { const dv = await range(file, ((row + dr) * N + col - 1) * 2, ((row + dr) * N + col + 1) * 2 + 1); for (let k = 0; k < 3; k++) vals.push(dv.getInt16(k * 2, true) * 0.00004 * 100); }
  return { centre: vals[4], min: Math.min(...vals), max: Math.max(...vals) };
}
const sizes = new Map<string, number>(); async function sizeCache(f: string) { if (!sizes.has(f)) sizes.set(f, await size(f)); return sizes.get(f)!; }

const lt = JSON.parse(readFileSync('public/longterm.json', 'utf8'));
const prodFor = (lat: number) => (lat <= PRODUCTS[0].minLat - 0.35 ? PRODUCTS[0] : lat <= -76 ? PRODUCTS[1] : null);
const rows: any[] = [];
for (const s of lt.sites) {
  const prod = prodFor(s.lat); if (!prod) continue;
  const sun = await sample(prod, 'SUN', s.lat, s.lon, 'north-up-east-right'), earth = await sample(prod, 'EARTH', s.lat, s.lon, 'north-up-east-right');
  if (!sun || !earth) { console.log('outside map:', s.name); continue; }
  const m = s.mast[2]; rows.push({ name: s.name, lat: s.lat, map: prod.key, nasaSun: +sun.centre.toFixed(1), nasaSunRange: [+sun.min.toFixed(1), +sun.max.toFixed(1)], oursSun: [m.whole.sun, m.any.sun], nasaEarth: +earth.centre.toFixed(1), nasaEarthRange: [+earth.min.toFixed(1), +earth.max.toFixed(1)], oursEarth: [m.whole.earth, m.any.earth] });
  console.log(`${s.name.padEnd(42)} ${prod.key}  Sun NASA ${sun.centre.toFixed(1).padStart(5)}% (3x3 ${sun.min.toFixed(0)}-${sun.max.toFixed(0)})  ours ${m.whole.sun}-${m.any.sun}%   Earth NASA ${earth.centre.toFixed(1).padStart(5)}% (3x3 ${earth.min.toFixed(0)}-${earth.max.toFixed(0)})  ours ${m.whole.earth}-${m.any.earth}%`);
}
// error summary against our "any part" result (NASA also counts any part of the disc)
const err = (key: 'Sun' | 'Earth') => rows.map((r) => Math.abs(r['nasa' + key] - r['ours' + key][1]));
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
console.log(`\nmean |NASA - ours(any part)|: Sun ${mean(err('Sun')).toFixed(1)} points, Earth ${mean(err('Earth')).toFixed(1)} points over ${rows.length} sites`);
// negative control: a wrong map orientation must agree much worse than the right one
for (const o of ['north-up-east-right', 'mirrored', 'rotated90', 'rotated180'] as Orient[]) {
  let tot = 0, n = 0;
  for (const s of lt.sites) { const prod = prodFor(s.lat); if (!prod || prod.key !== '85S_060M') continue; const v = await sample(prod, 'SUN', s.lat, s.lon, o); if (v) { tot += Math.abs(v.centre - s.mast[2].any.sun); n++; } }
  console.log(`orientation ${o.padEnd(20)} mean |Sun error| ${(tot / n).toFixed(1)} points (${n} sites)`);
}
writeFileSync('public/validation_nasa.json', JSON.stringify({ source: 'NASA LOLA Lunar Polar Illumination (PGDA product 69, PDS AVGVISIB), 18.6-year averages', rows }, null, 1));
