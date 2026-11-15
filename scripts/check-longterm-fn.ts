// npm run check:longterm   (network, about 1-2 minutes)
// Verifies the in-browser long-term function (longEphemeris + computeLongTerm) against the precomputed public/longterm.json for one site.
import { readFileSync } from 'node:fs';
import { decodeTerrain, lolaSlug } from '../src/lib/lola';
import { longEphemeris, setHorizonsBase } from '../src/lib/ephemeris';
import { computeLongTerm } from '../src/lib/longterm';
import { PRESETS } from '../src/lib/sites';

setHorizonsBase('https://ssd.jpl.nasa.gov/api/horizons.api');
const site = PRESETS[0], b = readFileSync(`public/lola/${lolaSlug(site)}.bin`);
const terrain = decodeTerrain(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer)!;
const t0 = Date.now(); const samples = await longEphemeris(site, (d, t) => process.stdout.write(`\r  chunk ${d}/${t}`));
console.log(`\n${samples.length} samples in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
const got = computeLongTerm(samples, terrain), ref = JSON.parse(readFileSync('public/longterm.json', 'utf8')).sites.find((s: any) => s.name === site.name);
let maxd = 0, n = 0;
for (const m of ['2', '10']) for (const r of ['any', 'whole']) for (const k of Object.keys(ref.mast[m][r])) { const d = Math.abs((got.mast[m] as any)[r][k] - ref.mast[m][r][k]); maxd = Math.max(maxd, d); n++; if (d > 0.05) console.log('  DIFF', m, r, k, (got.mast[m] as any)[r][k], 'vs', ref.mast[m][r][k]); }
for (const k of Object.keys(ref.yearly)) { const d = Math.abs((got.yearly as any)[k] - ref.yearly[k]); maxd = Math.max(maxd, d); n++; if (d > 0.05) console.log('  DIFF yearly', k, (got.yearly as any)[k], 'vs', ref.yearly[k]); }
console.log(`compared ${n} numbers against the precomputed entry; largest difference ${maxd.toFixed(2)}`);
console.log(`2 m any-part: Sun ${got.mast['2'].any.sun}%, Earth ${got.mast['2'].any.earth}%, both ${got.mast['2'].any.both}%, longest dark Sun ${got.mast['2'].any.sunDarkD} d`);
process.exit(maxd <= 0.05 ? 0 : 1);
