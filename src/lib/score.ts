import type { Verdict } from './visibility';

/** The mission score is a transparent weighted average of four 0-100 sub-scores. Weights are user-adjustable. */
export interface Weights { sun: number; both: number; outage: number; slope: number }
export const DEFAULT_WEIGHTS: Weights = { sun: 35, both: 30, outage: 20, slope: 15 };

export interface ScorePart { key: keyof Weights; label: string; value: number | null; weight: number; how: string }
export interface Score { score: number; parts: ScorePart[] }

/**
 * sun    = % of time the Sun is above the horizon
 * both   = % of time Sun and Earth (or relay) are both available
 * outage = 100 x (1 - longest joint outage / half the window), floored at 0
 * slope  = % of ground within 100 m with slope under 10 degrees (LOLA only; left out if unavailable)
 */
export function missionScore(v: Verdict, days: number, slopeUnder10: number | null, w: Weights): Score {
  const parts: ScorePart[] = [
    { key: 'sun', label: 'Sunlight', value: v.sunPct, weight: w.sun, how: '% of time the Sun is up' },
    { key: 'both', label: 'Sun + Earth together', value: v.bothPct, weight: w.both, how: '% of time both are available' },
    { key: 'outage', label: 'Short outages', value: Math.max(0, 100 * (1 - v.bothOutageD / (days * 0.5))), weight: w.outage, how: '100 means no joint outage, 0 means half the window' },
    { key: 'slope', label: 'Gentle ground', value: slopeUnder10, weight: w.slope, how: '% of ground within 100 m under 10°' },
  ];
  const used = parts.filter((p) => p.value !== null && p.weight > 0);
  const tot = used.reduce((s, p) => s + p.weight, 0);
  const score = tot > 0 ? used.reduce((s, p) => s + (p.value as number) * p.weight, 0) / tot : 0;
  return { score, parts };
}
