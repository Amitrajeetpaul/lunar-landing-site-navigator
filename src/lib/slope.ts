import type { Layer } from './terrain';

/** Slope in degrees at grid cell (i,j): central difference over +-1 pixel (a 2-pixel, i.e. 40 m, baseline at 20 m/px). NaN if any neighbour is missing. */
export function slopeAt(l: Layer, i: number, j: number, k = 1): number {
  const n = l.n, d = l.widthM / (n - 1);
  if (i < k || j < k || i >= n - k || j >= n - k) return NaN;
  const dzdx = (l.h[j * n + i + k] - l.h[j * n + i - k]) / (2 * k * d);
  const dzdy = (l.h[(j + k) * n + i] - l.h[(j - k) * n + i]) / (2 * k * d);
  return (Math.atan(Math.hypot(dzdx, dzdy)) * 180) / Math.PI;
}

/** Finest cell size of a layer in metres, and the radius that holds at least ~4 cells so the statistic is meaningful. */
export const cellOf = (l: Layer) => l.widthM / (l.n - 1);
export const radiusFor = (l: Layer, wantM: number, cells = 4) => Math.max(wantM, cells * cellOf(l));

/** NASA's Artemis HLS briefings give a landing slope limit of under 10 degrees evaluated over 100 m (NTRS 20240009596), so slope here is measured over about that baseline. */
export const NASA_BASELINE_M = 100;
/** Pixels each side of the centre so the central-difference baseline (2k pixels) is closest to `baselineM`; at least 1. */
export const kFor = (l: Layer, baselineM: number) => Math.max(1, Math.round(baselineM / (2 * cellOf(l))));
export const baselineOf = (l: Layer, baselineM: number) => 2 * kFor(l, baselineM) * cellOf(l);

export interface SlopeStats { radiusM: number; cells: number; medianDeg: number; p90Deg: number; maxDeg: number; under5: number; under10: number; under20: number; baselineM: number }

/** Slope statistics for the disc of the given radius around the grid centre (the site). */
export function slopeStats(l: Layer, radiusM: number, baselineM?: number): SlopeStats | null {
  const n = l.n, d = l.widthM / (n - 1), c = (n - 1) / 2, r = radiusM / d, k = baselineM ? kFor(l, baselineM) : 1, v: number[] = [];
  for (let j = Math.max(k, Math.floor(c - r)); j <= Math.min(n - 1 - k, Math.ceil(c + r)); j++)
    for (let i = Math.max(k, Math.floor(c - r)); i <= Math.min(n - 1 - k, Math.ceil(c + r)); i++) {
      if (Math.hypot(i - c, j - c) > r) continue;
      const s = slopeAt(l, i, j, k); if (!Number.isNaN(s)) v.push(s);
    }
  if (v.length < 10) return null;
  v.sort((a, b) => a - b);
  const q = (p: number) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
  const frac = (deg: number) => (v.filter((x) => x < deg).length / v.length) * 100;
  return { radiusM, cells: v.length, medianDeg: q(0.5), p90Deg: q(0.9), maxDeg: v[v.length - 1], under5: frac(5), under10: frac(10), under20: frac(20), baselineM: 2 * k * d };
}

/** RGBA pixels (size x size, north up) of the slope colour map over +-halfM around the site. */
export function slopeImage(l: Layer, halfM: number, size: number, k = 1): Uint8ClampedArray<ArrayBuffer> {
  const n = l.n, d = l.widthM / (n - 1), c = (n - 1) / 2, out = new Uint8ClampedArray(new ArrayBuffer(size * size * 4));
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const i = Math.round(c + ((px / (size - 1)) * 2 - 1) * (halfM / d));
    const j = Math.round(c + (1 - (py / (size - 1)) * 2) * (halfM / d));
    const s = slopeAt(l, i, j, k), o = (py * size + px) * 4;
    const col = Number.isNaN(s) ? [30, 36, 60] : s < 5 ? [60, 190, 120] : s < 10 ? [240, 200, 70] : s < 15 ? [240, 140, 50] : [225, 70, 70];
    out[o] = col[0]; out[o + 1] = col[1]; out[o + 2] = col[2]; out[o + 3] = 255;
  }
  return out;
}
