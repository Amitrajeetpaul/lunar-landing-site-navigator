import { STEP_H, type Sample } from './ephemeris';

/**
 * Relative solar output (1 = a panel that always faces the Sun with the Sun up), zero whenever the Sun is blocked.
 * horizontal: lies flat, output = sin(elevation)          (poor at the pole: the Sun is almost on the horizon)
 * vertical:   upright, turned toward the Sun, = cos(elevation)
 * tracking:   two-axis, always square on to the Sun = 1
 * Relative numbers only: no panel efficiency, dust, temperature or reflected light.
 */
export type Panel = 'horizontal' | 'vertical' | 'tracking';
export const PANELS: { id: Panel; label: string; note: string }[] = [
  { id: 'tracking', label: 'Sun-tracking panel', note: 'Always square on to the Sun' },
  { id: 'vertical', label: 'Upright panel turned to the Sun', note: 'Good at the pole: the Sun skims the horizon' },
  { id: 'horizontal', label: 'Flat panel', note: 'Poor at the pole: sin(elevation) is tiny' },
];
const rad = (d: number) => (d * Math.PI) / 180;
export const output = (p: Panel, sunEl: number, up: boolean) => (!up ? 0 : p === 'tracking' ? 1 : p === 'vertical' ? Math.cos(rad(sunEl)) : Math.max(0, Math.sin(rad(sunEl))));

export function powerSummary(samples: Sample[], sunFlag: Uint8Array) {
  const n = samples.length;
  return PANELS.map(({ id, label }) => {
    let e = 0; samples.forEach((s, i) => { e += output(id, s.sunEl, !!sunFlag[i]); });
    return { id, label, avgPct: (e / n) * 100, equivHours: e * STEP_H };
  });
}
export const maxSunEl = (samples: Sample[]) => samples.reduce((m, s) => Math.max(m, s.sunEl), -90);
