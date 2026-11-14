export const R_MOON_M = 1_737_400;

/** One square elevation grid centred on the site: metres, row j = south -> north, column i = west -> east. */
export interface Layer { n: number; widthM: number; h: Float32Array }
export interface Terrain {
  layers: Layer[]; // finest first; the horizon march uses the finest layer that covers each point
  view: Layer; // what the 3D view draws
  kind: 'procedural' | 'heightmap' | 'lola';
  label: string;
}

export function single(l: Layer, kind: Terrain['kind'], label: string): Terrain {
  return { layers: [l], view: l, kind, label };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function hash2(ix: number, iy: number, seed: number) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x: number, y: number, seed: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash2(xi, yi, seed), hash2(xi + 1, yi, seed), u),
              lerp(hash2(xi, yi + 1, seed), hash2(xi + 1, yi + 1, seed), u), v);
}
function fbm(x: number, y: number, seed: number) {
  let s = 0, a = 0.5, f = 1;
  for (let o = 0; o < 5; o++) { s += a * (vnoise(x * f, y * f, seed + o * 17) - 0.5); a *= 0.5; f *= 2.1; }
  return s;
}
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Stand-in terrain: crater with the site on its rim, a massif, small craters. Seeded by lat/lon. */
export function proceduralTerrain(lat: number, lon: number, widthKm = 20, n = 257): Terrain {
  const seed = Math.floor((lat + 90) * 1000) * 7919 + Math.floor((lon + 180) * 100);
  const r = rng(seed), W = widthKm * 1000, h = new Float32Array(n * n);
  const ang = r() * Math.PI * 2, BR = 6000;
  const big = { x: Math.sin(ang) * BR, y: Math.cos(ang) * BR };
  const massAng = ang + Math.PI * (0.6 + r() * 0.8);
  const mass = { x: Math.sin(massAng) * 6500, y: Math.cos(massAng) * 6500 };
  const slopeAng = r() * Math.PI * 2, slope = 0.05 + r() * 0.05;
  const smalls = Array.from({ length: 16 }, () => ({
    x: (r() - 0.5) * W, y: (r() - 0.5) * W, rad: 300 + r() * 1100,
  }));
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i / (n - 1) - 0.5) * W, y = (j / (n - 1) - 0.5) * W;
    let z = fbm(x / 2500, y / 2500, seed) * 500 + fbm(x / 500, y / 500, seed + 5) * 90;
    z += (x * Math.sin(slopeAng) + y * Math.cos(slopeAng)) * slope;
    const d = Math.hypot(x - big.x, y - big.y) / BR;
    z += d < 1 ? -1300 * (1 - d * d) : 0;
    z += 380 * Math.exp(-(((d - 1) / 0.13) ** 2));
    z += 900 * Math.exp(-((Math.hypot(x - mass.x, y - mass.y) / 1500) ** 2));
    for (const c of smalls) {
      const dd = Math.hypot(x - c.x, y - c.y) / c.rad;
      z += (dd < 1 ? -0.22 * c.rad * (1 - dd * dd) : 0) + 0.05 * c.rad * Math.exp(-(((dd - 1) / 0.18) ** 2));
    }
    h[j * n + i] = z;
  }
  return single({ n, widthM: W, h }, 'procedural', 'Prototype terrain (procedural stand-in)');
}

/** Build a terrain from an uploaded grayscale heightmap (e.g. Moon Trek / LOLA export). */
export async function terrainFromImage(file: File, minM: number, maxM: number, widthKm: number): Promise<Terrain> {
  const bmp = await createImageBitmap(file);
  const n = Math.min(512, bmp.width, bmp.height);
  const cv = document.createElement('canvas'); cv.width = cv.height = n;
  const ctx = cv.getContext('2d')!; ctx.drawImage(bmp, 0, 0, n, n);
  const px = ctx.getImageData(0, 0, n, n).data, h = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const p = ((n - 1 - j) * n + i) * 4; // image row 0 is north
    h[j * n + i] = minM + ((px[p] * 0.3 + px[p + 1] * 0.59 + px[p + 2] * 0.11) / 255) * (maxM - minM);
  }
  return single({ n, widthM: widthKm * 1000, h }, 'heightmap', 'Uploaded heightmap');
}

/** Bilinear height (m) of one layer at (east, north) metres from the site; NaN outside it. */
export function layerHeight(l: Layer, x: number, y: number) {
  const gx = (x / l.widthM + 0.5) * (l.n - 1), gy = (y / l.widthM + 0.5) * (l.n - 1);
  if (gx < 0 || gy < 0 || gx > l.n - 1 || gy > l.n - 1) return NaN;
  const i = Math.min(Math.floor(gx), l.n - 2), j = Math.min(Math.floor(gy), l.n - 2), fx = gx - i, fy = gy - j;
  const a = l.h[j * l.n + i], b = l.h[j * l.n + i + 1], c = l.h[(j + 1) * l.n + i], d = l.h[(j + 1) * l.n + i + 1];
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
}

/** Height in metres from the finest layer that covers the point (NaN if none does). */
export function heightAt(t: Terrain, x: number, y: number) {
  for (const l of t.layers) { const v = layerHeight(l, x, y); if (!Number.isNaN(v)) return v; }
  return NaN;
}

/** Re-sample every layer into one n x n view grid (used for the 3D mesh). */
export function makeView(t: Terrain, widthM = 20000, n = 257): Layer {
  const h = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const v = heightAt(t, (i / (n - 1) - 0.5) * widthM, (j / (n - 1) - 0.5) * widthM);
    h[j * n + i] = Number.isNaN(v) ? 0 : v;
  }
  return { n, widthM, h };
}

export const RAYS = 720; // 0.5 deg azimuth spacing, as in the published horizon calculations

/**
 * Horizon elevation (degrees) for each of 720 compass azimuths (0.5 deg steps), seen from (ox, oy) metres from the
 * grid centre at `mastM` above the ground. Ray-march outward through the layers (fine near the site, coarse far
 * away), keep the steepest angle, subtract Moon curvature d^2 / 2R. No atmosphere, no refraction.
 */
export function computeHorizon(t: Terrain, mastM: number, ox = 0, oy = 0, rays = RAYS): Float32Array {
  const out = new Float32Array(rays), h0 = heightAt(t, ox, oy) + mastM;
  const maxD = Math.max(...t.layers.map((l) => l.widthM)) / 2;
  // Lowest possible horizon: the dip of the smooth lunar limb seen from height H above the reference sphere,
  // acos(R/(R+H)) ~ sqrt(2H/R). H is the eye height above the sphere (site elevation + mast), not just the mast:
  // a peak 1.8 km up sees a horizon ~2.6 deg below horizontal, which is what lets it catch the low polar Sun.
  const limb = -Math.sqrt((2 * Math.max(h0, mastM)) / R_MOON_M) * (180 / Math.PI);
  for (let r = 0; r < rays; r++) {
    const az = (r / rays) * 2 * Math.PI, sx = Math.sin(az), sy = Math.cos(az);
    let best = -Infinity, d = 0;
    while (d < maxD) {
      let step = 0, z = NaN;
      for (const l of t.layers) {
        const cell = l.widthM / (l.n - 1);
        z = layerHeight(l, ox + sx * (d + cell * 0.5), oy + sy * (d + cell * 0.5));
        if (!Number.isNaN(z)) { step = cell * 0.5; break; }
      }
      if (!step) break;
      d += step;
      const a = Math.atan2(z - h0 - (d * d) / (2 * R_MOON_M), d);
      if (a > best) best = a;
    }
    out[r] = Math.max(best * (180 / Math.PI), limb);
  }
  return out;
}

/** Horizon elevation at an azimuth (degrees), linearly interpolated between rays. */
export function horizonAt(h: Float32Array, az: number) {
  const n = h.length, x = ((((az % 360) + 360) % 360) / 360) * n, i = Math.floor(x), f = x - i;
  return lerp(h[i % n], h[(i + 1) % n], f);
}
