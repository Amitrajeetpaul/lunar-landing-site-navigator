import { STEP_H, type Sample } from './ephemeris';

/** One continuous stretch where a flag is constant (e.g. the Sun is below the terrain skyline). */
export interface Run { start: number; end: number; hours: number; cutStart: boolean; cutEnd: boolean }

/**
 * Continuous runs of `value` in a visibility flag array, one entry per 3 h sample (same convention as the
 * "longest outage" figure: a run of n samples is n x 3 h). `cutStart` / `cutEnd` mean the run touches the edge of
 * the window, so its true length is at least what is shown.
 */
export function runs(samples: Sample[], flag: Uint8Array, value: 0 | 1): Run[] {
  const out: Run[] = [], n = flag.length;
  let i = 0;
  while (i < n) {
    if (flag[i] !== value) { i++; continue; }
    let j = i;
    while (j < n && flag[j] === value) j++;
    const hours = (j - i) * STEP_H;
    out.push({ start: samples[i].t, end: samples[i].t + hours * 3600_000, hours, cutStart: i === 0, cutEnd: j === n });
    i = j;
  }
  return out;
}

export const longest = (r: Run[]) => r.reduce<Run | null>((a, b) => (!a || b.hours > a.hours ? b : a), null);

/** Plain arithmetic only: energy = power x time. No battery efficiency, depth of discharge, ageing or heating model. */
export const energyWh = (loadW: number, hours: number) => loadW * hours;

/** Great-circle distance between two lunar points in km (sphere of radius 1737.4 km). */
export function moonDistanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * 1737.4 * Math.asin(Math.min(1, Math.sqrt(h)));
}
