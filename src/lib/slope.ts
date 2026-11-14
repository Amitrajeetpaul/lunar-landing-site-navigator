import type { Layer } from './terrain';

/** Slope in degrees at grid cell (i,j): central difference over +-1 pixel (a 2-pixel, i.e. 40 m, baseline at 20 m/px). NaN if any neighbour is missing. */
export function slopeAt(l: Layer, i: number, j: number): number {
  const n = l.n, d = l.widthM / (n - 1);
  if (i < 1 || j < 1 || i >= n - 1 || j >= n - 1) return NaN;
  const dzdx = (l.h[j * n + i + 1] - l.h[j * n + i - 1]) / (2 * d);
  const dzdy = (l.h[(j + 1) * n + i] - l.h[(j - 1) * n + i]) / (2 * d);
  return (Math.atan(Math.hypot(dzdx, dzdy)) * 180) / Math.PI;
}

/** Finest cell size of a layer in metres, and the radius that holds at least ~4 cells so the statistic is meaningful. */
export const cellOf = (l: Layer) => l.widthM / (l.n - 1);
export const radiusFor = (l: Layer, wantM: number, cells = 4) => Math.max(wantM, cells * cellOf(l));

export interface SlopeStats { radiusM: number; cells: number; medianDeg: number; p90Deg: number; maxDeg: number; under5: number; under10: number }

/** Slope statistics for the disc of the given radius around the grid centre (the site). */
export function slopeStats(l: Layer, radiusM: number): SlopeStats | null {
  const n = l.n, d = l.widthM / (n - 1), c = (n - 1) / 2, r = radiusM / d, v: number[] = [];
  for (let j = Math.max(1, Math.floor(c - r)); j <= Math.min(n - 2, Math.ceil(c + r)); j++)
    for (let i = Math.max(1, Math.floor(c - r)); i <= Math.min(n - 2, Math.ceil(c + r)); i++) {
      if (Math.hypot(i - c, j - c) > r) continue;
      const s = slopeAt(l, i, j); if (!Number.isNaN(s)) v.push(s);
    }
  if (v.length < 10) return null;
  v.sort((a, b) => a - b);
  const q = (p: number) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
  const frac = (deg: number) => (v.filter((x) => x < deg).length / v.length) * 100;
  return { radiusM, cells: v.length, medianDeg: q(0.5), p90Deg: q(0.9), maxDeg: v[v.length - 1], under5: frac(5), under10: frac(10) };
}

/** RGBA pixels (size x size, north up) of the slope colour map over +-halfM around the site. */
export function slopeImage(l: Layer, halfM: number, size: number): Uint8ClampedArray<ArrayBuffer> {
  const n = l.n, d = l.widthM / (n - 1), c = (n - 1) / 2, out = new Uint8ClampedArray(new ArrayBuffer(size * size * 4));
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const i = Math.round(c + ((px / (size - 1)) * 2 - 1) * (halfM / d));
    const j = Math.round(c + (1 - (py / (size - 1)) * 2) * (halfM / d));
    const s = slopeAt(l, i, j), o = (py * size + px) * 4;
    const col = Number.isNaN(s) ? [30, 36, 60] : s < 5 ? [60, 190, 120] : s < 10 ? [240, 200, 70] : s < 15 ? [240, 140, 50] : [225, 70, 70];
    out[o] = col[0]; out[o + 1] = col[1]; out[o + 2] = col[2]; out[o + 3] = 255;
  }
  return out;
}
