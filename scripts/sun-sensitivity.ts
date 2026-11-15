// npm run sun:sensitivity   (network, about 3 minutes)
// Why do three sharp-crest sites differ most from NASA's illumination map? Test the "location precision" explanation: compute this app's
// 18.6-year Sun % at 5 x 5 offsets (60 m steps, +-120 m) around each site, for a ground-level and a 2 m mast, and compare the spread with
// the spread of NASA's own 3 x 3 pixels (public/validation_nasa.json).
import { readFileSync } from 'node:fs';
import { decodeTerrain, lolaSlug } from '../src/lib/lola';
import { longEphemeris, setHorizonsBase } from '../src/lib/ephemeris';
import { computeHorizon } from '../src/lib/terrain';
import { flagsFor, verdictFor } from '../src/lib/visibility';
import { PRESETS } from '../src/lib/sites';

setHorizonsBase('https://ssd.jpl.nasa.gov/api/horizons.api');
const nasa = JSON.parse(readFileSync('public/validation_nasa.json', 'utf8')).rows;
const STEP = 60, offs = [-2, -1, 0, 1, 2].map((k) => k * STEP);
for (const name of ['Peak near Shackleton D', 'de Gerlache ridge C', 'Haworth rim']) {
  const site = PRESETS.find((p) => p.name.startsWith(name))!, row = nasa.find((r: any) => r.name.startsWith(name));
  const b = readFileSync(`public/lola/${lolaSlug(site)}.bin`), terrain = decodeTerrain(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer)!;
  const samples = await longEphemeris(site);
  console.log(`\n${name}: NASA centre ${row.nasaSun}%, NASA 3x3 range ${row.nasaSunRange[0]}-${row.nasaSunRange[1]}%`);
  for (const mast of [0, 2]) {
    const g: number[][] = offs.map((oy) => offs.map((ox) => verdictFor(flagsFor(samples, computeHorizon(terrain, mast, ox, oy), 'any')).sunPct));
    const flat = g.flat(), in3 = [1, 2, 3].flatMap((r) => [1, 2, 3].map((c) => g[r][c]));
    const centre = g[2][2], inside = flat.filter((v) => Math.abs(v - row.nasaSun) <= 3).length;
    console.log(`  mast ${mast} m: centre ${centre.toFixed(1)}%, 3x3 (+-60 m) ${Math.min(...in3).toFixed(0)}-${Math.max(...in3).toFixed(0)}%, 5x5 (+-120 m) ${Math.min(...flat).toFixed(0)}-${Math.max(...flat).toFixed(0)}%, offsets within 3 points of NASA's centre value: ${inside}/25`);
  }
}
