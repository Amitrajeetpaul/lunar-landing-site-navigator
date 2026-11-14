// npm run benchmark  (offline: baked terrain + series ephemeris). One lunar year per site, all three disc rules.
// Compare with the published figures in reports/ (Connecting Ridge ~81-92% at 2 m, Malapert ~74%).
import { readFileSync } from 'node:fs';
import { decodeTerrain, lolaSlug } from '../src/lib/lola';
import { computeHorizon, heightAt } from '../src/lib/terrain';
import { seriesEphemeris } from '../src/lib/ephemeris';
import { flagsFor, verdictFor, type Rule } from '../src/lib/visibility';
import { PRESETS } from '../src/lib/sites';

const t0 = Date.UTC(2028, 0, 1), days = 365, mast = Number(process.argv[2] ?? 2);
console.log(`2028, mast ${mast} m. Sun% / longest Sun outage (d) | Earth% | Both%   [whole disc -> any part]`);
for (const s of PRESETS) {
  const b = readFileSync(`public/lola/${lolaSlug(s)}.bin`);
  const t = decodeTerrain(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))!;
  const hor = computeHorizon(t, mast), sm = seriesEphemeris(s, t0, days);
  const v = (r: Rule) => verdictFor(flagsFor(sm, hor, r));
  const w = v('whole'), c = v('centre'), a = v('any');
  const h = Array.from(hor);
  console.log(`${s.name.padEnd(40)} elev ${heightAt(t, 0, 0).toFixed(0).padStart(5)} m  horizon ${Math.min(...h).toFixed(1)}..${Math.max(...h).toFixed(1)}° | Sun ${w.sunPct.toFixed(0)}-${a.sunPct.toFixed(0)}% (dark ${c.sunOutageD.toFixed(1)} d) | Earth ${w.earthPct.toFixed(0)}-${a.earthPct.toFixed(0)}% | Both ${w.bothPct.toFixed(0)}-${a.bothPct.toFixed(0)}%`);
}
