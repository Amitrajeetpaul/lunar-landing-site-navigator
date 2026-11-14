import { type Sample, STEP_H, sampleAt } from './ephemeris';
import { horizonAt } from './terrain';

/**
 * How a disc counts as "visible" against the terrain horizon at its azimuth.
 *  any    : any part of the disc clears the horizon (what the PGDA / Mazarico studies count; optimistic)
 *  centre : the disc centre clears it (a point antenna / point source)
 *  whole  : the whole disc clears it (conservative)
 */
export type Rule = 'any' | 'centre' | 'whole';
export const RULES: { id: Rule; label: string; note: string }[] = [
  { id: 'any', label: 'Any part of the disc (published-study style)', note: 'Counts a body as visible once its upper edge clears the terrain. Comparable with PGDA / Mazarico results; optimistic for a radio link.' },
  { id: 'centre', label: 'Disc centre', note: 'A point source: the centre of the Sun or Earth must clear the terrain.' },
  { id: 'whole', label: 'Whole disc (conservative)', note: 'The entire disc must clear the terrain. Lower bound for power and for a narrow-beam link.' },
];
const k = (r: Rule) => (r === 'any' ? 1 : r === 'whole' ? -1 : 0);

export interface Flags { sun: Uint8Array; earth: Uint8Array; both: Uint8Array }
export interface Verdict {
  sunPct: number; earthPct: number; bothPct: number;
  sunOutageD: number; earthOutageD: number; bothOutageD: number;
  hours: number;
}

export const sunVisible = (s: { sunAz: number; sunEl: number; sunR: number }, hor: Float32Array, rule: Rule) =>
  s.sunEl + k(rule) * s.sunR > horizonAt(hor, s.sunAz);
export const earthVisible = (s: { earthAz: number; earthEl: number; earthR: number }, hor: Float32Array, rule: Rule) =>
  s.earthEl + k(rule) * s.earthR > horizonAt(hor, s.earthAz);

/** relay = assume a lunar relay satellite keeps Earth contact always available (an assumption, not data). */
export function flagsFor(samples: Sample[], hor: Float32Array, rule: Rule, relay = false): Flags {
  const n = samples.length, sun = new Uint8Array(n), earth = new Uint8Array(n), both = new Uint8Array(n);
  samples.forEach((s, i) => {
    sun[i] = sunVisible(s, hor, rule) ? 1 : 0;
    earth[i] = relay || earthVisible(s, hor, rule) ? 1 : 0;
    both[i] = sun[i] & earth[i];
  });
  return { sun, earth, both };
}

function longestOutage(a: Uint8Array) {
  let best = 0, run = 0;
  for (const v of a) { run = v ? 0 : run + 1; if (run > best) best = run; }
  return (best * STEP_H) / 24;
}
const pct = (a: Uint8Array) => (a.reduce((s, v) => s + v, 0) / a.length) * 100;

export function verdictFor(f: Flags): Verdict {
  return {
    sunPct: pct(f.sun), earthPct: pct(f.earth), bothPct: pct(f.both),
    sunOutageD: longestOutage(f.sun), earthOutageD: longestOutage(f.earth), bothOutageD: longestOutage(f.both),
    hours: f.sun.length * STEP_H,
  };
}

/** Days until the flag next flips from its value at sample index `i` (null if it never does in the window). */
export function timeToChange(flag: Uint8Array, i: number): number | null {
  for (let q = i + 1; q < flag.length; q++) if (flag[q] !== flag[i]) return ((q - i) * STEP_H) / 24;
  return null;
}

export type Status = 'VISIBLE' | 'BEHIND TERRAIN' | 'BELOW HORIZON';
export function statusOf(el: number, vis: boolean): Status {
  return vis ? 'VISIBLE' : el < 0 ? 'BELOW HORIZON' : 'BEHIND TERRAIN';
}

export function nowAt(samples: Sample[], t: number, hor: Float32Array, rule: Rule) {
  const s = sampleAt(samples, t);
  return {
    s, sunHor: horizonAt(hor, s.sunAz), earthHor: horizonAt(hor, s.earthAz),
    sunVis: sunVisible(s, hor, rule), earthVis: earthVisible(s, hor, rule),
  };
}
