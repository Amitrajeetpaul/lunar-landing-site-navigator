import type { Sample } from './ephemeris';
import { computeHorizon, type Terrain } from './terrain';
import { flagsFor, verdictFor, type Rule } from './visibility';

export interface LtStat { sun: number; earth: number; both: number; sunDarkD: number; earthDarkD: number; bothDarkD: number }
export interface LtEntry { name?: string; lat: number; lon: number; mast: Record<string, { any: LtStat; whole: LtStat }>; yearly?: { sunMin: number; sunMax: number; bothMin: number; bothMax: number } }

const r1 = (x: number) => Math.round(x * 10) / 10;

/** Full-cycle statistics (2 m and 10 m masts, whole-disc and any-part rules) from Horizons samples and a terrain. Same method as scripts/longterm.ts. */
export function computeLongTerm(samples: Sample[], terrain: Terrain): Pick<LtEntry, 'mast' | 'yearly'> {
  const out: Pick<LtEntry, 'mast' | 'yearly'> = { mast: {} };
  for (const mast of [2, 10]) {
    const hor = computeHorizon(terrain, mast), m: any = {};
    for (const rule of ['any', 'whole'] as Rule[]) {
      const fl = flagsFor(samples, hor, rule), v = verdictFor(fl);
      m[rule] = { sun: r1(v.sunPct), earth: r1(v.earthPct), both: r1(v.bothPct), sunDarkD: r1(v.sunOutageD), earthDarkD: r1(v.earthOutageD), bothDarkD: r1(v.bothOutageD) };
      if (mast === 2 && rule === 'any') { // year-to-year spread over the full calendar years
        const byY = new Map<number, { n: number; s: number; b: number }>();
        samples.forEach((s, i) => { const y = new Date(s.t).getUTCFullYear(), e = byY.get(y) ?? { n: 0, s: 0, b: 0 }; e.n++; e.s += fl.sun[i]; e.b += fl.both[i]; byY.set(y, e); });
        const full = [...byY.values()].filter((e) => e.n > 2000), pc = (k: 's' | 'b') => full.map((e) => (100 * e[k]) / e.n);
        out.yearly = { sunMin: r1(Math.min(...pc('s'))), sunMax: r1(Math.max(...pc('s'))), bothMin: r1(Math.min(...pc('b'))), bothMax: r1(Math.max(...pc('b'))) };
      }
    }
    out.mast[mast] = m;
  }
  return out;
}
