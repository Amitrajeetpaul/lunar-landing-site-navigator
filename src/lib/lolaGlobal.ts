// Real terrain for ANY point on the Moon: NASA LOLA global shape map (PDS, LRO_ES_52), simple-cylindrical raw int16 files
// LDEM_256 (118 m/px, four hemisphere tiles), LDEM_64 (473.8 m), LDEM_16 (1.9 km), height in metres relative to the 1737.4 km sphere (DN * 0.5),
// little-endian, one row per 1/ppd degree, longitude 0..360 east. Read with HTTP range requests, re-sampled onto the site's
// local east/north grids exactly like the polar product, so the same horizon code runs on it.
import type { Layer } from './terrain';
import type { Site } from './sites';

const R = 1_737_400, D2R = Math.PI / 180;
let base = '/imbrium'; // dev/preview proxy -> https://imbrium.mit.edu/DATA/LOLA_GDR/CYLINDRICAL/IMG
export const setGlobalBase = (u: string) => { base = u; };

let busy = 0; const q: (() => void)[] = [];
const take = async () => { while (busy >= 8) await new Promise<void>((r) => q.push(r)); busy++; };
const give = () => { busy--; q.shift()?.(); };
async function range(file: string, a: number, b: number): Promise<ArrayBuffer> {
  await take();
  try {
    for (let i = 0; ; i++) {
      try {
        const r = await fetch(`${base}/${file}`, { headers: { Range: `bytes=${a}-${b}` }, signal: AbortSignal.timeout(45000) }); // a stalled request must fail and retry, not hang the load
        if (r.status === 200) throw new Error('refusing: server ignored the Range header');
        if (r.status !== 206) throw new Error(`HTTP ${r.status}`);
        return await r.arrayBuffer();
      } catch (e) { if (i >= 5 || String(e).includes('refusing')) throw e; await new Promise((res) => setTimeout(res, 1200 * (i + 1))); }
    }
  } finally { give(); }
}

interface Win { ppd: number; i0: number; rows: number; cols: number; jc: number; half: number; z: Float32Array }

/** LDEM_256 (118 m) ships as four hemisphere tiles: rows 0-23039 = 90N..0 (file 00N_90N), 23040+ = 0..90S (file 90S_00S); columns 0-46079 = 0..180E, then 180..360E. */
async function readWindow256(latMin: number, latMax: number, lon: number, lonSpan: number): Promise<Win> {
  const ppd = 256, W = 360 * ppd, H = 180 * ppd, T = 23040, TW = 46080;
  const i0 = Math.max(0, Math.floor((90 - latMax) * ppd) - 1), i1 = Math.min(H - 1, Math.ceil((90 - latMin) * ppd) + 1), rows = i1 - i0 + 1;
  const jc = Math.floor((((lon % 360) + 360) % 360) * ppd), half = Math.min(Math.ceil(lonSpan * ppd) + 2, Math.floor(W / 2) - 1), cols = 2 * half + 1;
  const z = new Float32Array(rows * cols);
  await Promise.all(Array.from({ length: rows }, async (_, r) => {
    const i = i0 + r, rowTile = i < T ? '00N_90N' : '90S_00S', lr = i < T ? i : i - T;
    for (let c = 0; c < cols;) { // a window may straddle the equator tiles' lon seam at 180 E or the 360/0 wrap
      const g = (((jc - half + c) % W) + W) % W, colTile = g < TW ? '000_180' : '180_360', lc = g % TW, n = Math.min(cols - c, TW - lc);
      const dv = new DataView(await range(`LDEM_256_${rowTile}_${colTile}.IMG`, (lr * TW + lc) * 2, (lr * TW + lc + n) * 2 - 1));
      for (let k = 0; k < n; k++) z[r * cols + c + k] = dv.getInt16(k * 2, true) * 0.5;
      c += n;
    }
  }));
  return { ppd, i0, rows, cols, jc, half, z };
}

/** Heights for rows i0..i1 and columns jc-half..jc+half (longitude wraps at 360). */
async function readWindow(ppd: number, latMin: number, latMax: number, lon: number, lonSpan: number): Promise<Win> {
  if (ppd === 256) return readWindow256(latMin, latMax, lon, lonSpan);
  const file = `LDEM_${ppd}.IMG`, W = 360 * ppd, H = 180 * ppd;
  const i0 = Math.max(0, Math.floor((90 - latMax) * ppd) - 1), i1 = Math.min(H - 1, Math.ceil((90 - latMin) * ppd) + 1), rows = i1 - i0 + 1;
  const jc = Math.floor((((lon % 360) + 360) % 360) * ppd), half = Math.min(Math.ceil(lonSpan * ppd) + 2, Math.floor(W / 2) - 1), cols = 2 * half + 1;
  const z = new Float32Array(rows * cols);
  const fill = (r: number, c0: number, buf: ArrayBuffer, n: number, dst: number) => { const dv = new DataView(buf); for (let k = 0; k < n; k++) z[r * cols + dst + k] = dv.getInt16((c0 + k) * 2, true) * 0.5; };
  const bandBytes = rows * W * 2;
  if (bandBytes <= 8e6) { // few rows of a coarse file: one request for the whole band, then cut the columns out
    const buf = await range(file, i0 * W * 2, (i1 + 1) * W * 2 - 1), dv = new DataView(buf);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) z[r * cols + c] = dv.getInt16((r * W + (((jc - half + c) % W) + W) % W) * 2, true) * 0.5;
  } else { // fine file: one small request per row (two when the window wraps past 360 deg)
    await Promise.all(Array.from({ length: rows }, async (_, r) => {
      const i = i0 + r, js = jc - half;
      if (js >= 0 && js + cols <= W) { fill(r, 0, await range(file, (i * W + js) * 2, (i * W + js + cols) * 2 - 1), cols, 0); return; }
      const a = ((js % W) + W) % W, n1 = Math.min(cols, W - a);
      fill(r, 0, await range(file, (i * W + a) * 2, (i * W + a + n1) * 2 - 1), n1, 0);
      if (n1 < cols) fill(r, 0, await range(file, i * W * 2, (i * W + (cols - n1)) * 2 - 1), cols - n1, n1);
    }));
  }
  return { ppd, i0, rows, cols, jc, half, z };
}

type V3 = [number, number, number];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };

async function layer(site: Site, ppd: number, halfM: number): Promise<Layer> {
  const lat = site.lat, lon = ((site.lon % 360) + 360) % 360;
  const p = lat * D2R, l = lon * D2R;
  const u: V3 = [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)], e: V3 = [-Math.sin(l), Math.cos(l), 0], n: V3 = norm(cross(u, e));
  const res = (2 * Math.PI * R) / (360 * ppd); // metres per pixel along a meridian
  const reach = (halfM * Math.SQRT2 * 1.03 + 3 * res) / R / D2R; // degrees of latitude the corners reach
  const win = await readWindow(ppd, lat - reach, lat + reach, lon, reach / Math.max(Math.cos(Math.min(89, Math.abs(lat) + reach) * D2R), 0.05));
  const cells = Math.round((2 * halfM) / res), nOut = cells + 1, h = new Float32Array(nOut * nOut), W = 360 * ppd;
  for (let j = 0; j < nOut; j++) for (let i = 0; i < nOut; i++) {
    const E = (i - cells / 2) * res, N = (j - cells / 2) * res, d = Math.hypot(E, N), a = d / R, k = d > 0 ? Math.sin(a) / d : 1 / R, c = Math.cos(a);
    const px = c * u[0] + k * (N * n[0] + E * e[0]), py = c * u[1] + k * (N * n[1] + E * e[1]), pz = c * u[2] + k * (N * n[2] + E * e[2]);
    const la = Math.asin(Math.max(-1, Math.min(1, pz))) / D2R, lo = (((Math.atan2(py, px) / D2R) % 360) + 360) % 360;
    const gy = (90 - la) * ppd - 0.5 - win.i0;
    let gx = lo * ppd - 0.5 - (win.jc - win.half); gx = ((gx % W) + W) % W; if (gx > W / 2 + win.half) gx -= W; // wrap into the window
    const iy = Math.floor(gy), ix = Math.floor(gx);
    if (iy < 0 || ix < 0 || iy >= win.rows - 1 || ix >= win.cols - 1) { h[j * nOut + i] = NaN; continue; }
    const fx = gx - ix, fy = gy - iy, o = iy * win.cols + ix, z = win.z;
    h[j * nOut + i] = (z[o] * (1 - fx) + z[o + 1] * fx) * (1 - fy) + (z[o + win.cols] * (1 - fx) + z[o + win.cols + 1] * fx) * fy;
  }
  return { n: nOut, widthM: (nOut - 1) * res, h };
}

// Fine near the site, coarse far away. 150 km reach (the polar product uses 300 km because the Sun hugs the horizon there; elsewhere
// relief beyond 150 km drops below the horizon by curvature, d^2/2R = 6.5 km at 150 km). Transfer is ~0.3 MB/s, so the far band is kept small.
const SPEC = [{ ppd: 256, halfM: 6000 }, { ppd: 64, halfM: 25000 }, { ppd: 16, halfM: 150000 }];
export async function buildGlobalLayers(site: Site, onStep?: (d: number, t: number) => void): Promise<Layer[]> {
  const out: Layer[] = [];
  for (const [i, s] of SPEC.entries()) { onStep?.(i, SPEC.length); out.push(await layer(site, s.ppd, s.halfM)); }
  onStep?.(SPEC.length, SPEC.length);
  return out;
}
