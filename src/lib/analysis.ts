import { getEphemeris, STEP_H, type Sample, type Source } from './ephemeris';
import type { Site } from './sites';
import { loadLolaTerrain } from './lola';
import { computeHorizon, proceduralTerrain, type Terrain } from './terrain';
import { flagsFor, verdictFor, type Flags, type Rule, type Verdict } from './visibility';
import { NASA_BASELINE_M, radiusFor, slopeStats } from './slope';

export interface Analysis { site: Site; start: number; days: number; samples: Sample[]; source: Source; flags: Flags; verdict: Verdict; terrain: Terrain['kind']; slopeUnder10: number | null }

/** Real LOLA terrain for any lunar site (20 m at the south pole, 118 m elsewhere); the labelled stand-in only if the NASA read fails. */
export async function terrainFor(site: Site): Promise<Terrain> {
  try { return await loadLolaTerrain(site); } catch { /* fall back */ }
  return proceduralTerrain(site.lat, site.lon);
}

export const slopeUnder10Of = (t: Terrain) => (t.kind === 'lola' ? slopeStats(t.layers[0], radiusFor(t.layers[0], 100), NASA_BASELINE_M)?.under10 ?? null : null);

export async function analyze(site: Site, start: number, days: number, mastM: number, useHorizons: boolean, rule: Rule = 'any', terrain?: Terrain, relay = false): Promise<Analysis> {
  const { samples, source } = await getEphemeris(site, start, days, useHorizons);
  const ter = terrain ?? (await terrainFor(site));
  const hor = computeHorizon(ter, mastM);
  const flags = flagsFor(samples, hor, rule, relay);
  return { site, start, days, samples, source, flags, verdict: verdictFor(flags), terrain: ter.kind, slopeUnder10: slopeUnder10Of(ter) };
}

export const fmtDur = (d: number) => (d < 1 ? `${Math.round(d * 24)} h` : `${d.toFixed(1)} d`);
export const toInput = (ms: number) => new Date(ms).toISOString().slice(0, 16);
export const fromInput = (v: string) => Date.parse(v + ':00Z');

export interface WindowScore { start: number; verdict: Verdict }

/** Score every daily start date in [from, from+scanDays] over a `days`-long window from ONE ephemeris request. */
export async function scanWindows(site: Site, from: number, scanDays: number, days: number, mastM: number, useHorizons: boolean, rule: Rule, terrain?: Terrain, relay = false) {
  const { samples, source } = await getEphemeris(site, from, scanDays + days, useHorizons);
  const ter = terrain ?? (await terrainFor(site));
  const hor = computeHorizon(ter, mastM);
  const per = 24 / STEP_H, len = days * per + 1, out: WindowScore[] = [];
  for (let d = 0; d <= scanDays; d++) {
    const sl = samples.slice(d * per, d * per + len);
    if (sl.length < len) break;
    out.push({ start: from + d * 86400000, verdict: verdictFor(flagsFor(sl, hor, rule, relay)) });
  }
  return { scores: out, source, terrain: ter.kind };
}
