// Real terrain: NASA PGDA "A New View of the Lunar South Pole from LOLA" (Barker et al.),
// LDEM_80S_20MPP_ADJ.TIF: a cloud-optimized GeoTIFF, south-polar stereographic metres on the
// 1737.4 km Moon sphere, 20 m/pixel, 80-90 deg S, with 40/80/160... m overviews. We read only
// the windows we need with HTTP range requests and re-sample them onto a local east/north grid.
import { BaseClient, BaseResponse, fromCustomClient, type GeoTIFF } from 'geotiff';
import type { Site } from './sites';
import { makeView, type Layer, type Terrain } from './terrain';
import { buildGlobalLayers } from './lolaGlobal';

const R = 1_737_400;
export const LOLA_FILE = 'LDEM_80S_20MPP_ADJ.TIF';
let base = `/pgda/${LOLA_FILE}`; // dev/preview proxy -> https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/
export const setLolaUrl = (u: string) => { base = u; tiffP = null; };

let tiffP: Promise<GeoTIFF> | null = null;

// PGDA is a public server that answers the odd 503 under load. Every range request goes through this client:
// one request in flight, retried with back-off, so one hiccup cannot fail a whole read.
class Resp extends BaseResponse {
  constructor(private r: Response) { super(); }
  get status() { return this.r.status; }
  getHeader(n: string) { return this.r.headers.get(n) ?? undefined; }
  getData() { return this.r.arrayBuffer(); }
}
let inflight = 0; const waiters: (() => void)[] = [];
const slot = async () => { while (inflight >= 1) await new Promise<void>((r) => waiters.push(r)); inflight++; };
const free = () => { inflight--; waiters.shift()?.(); };
class RetryClient extends BaseClient {
  async request({ headers, signal }: { headers?: Record<string, string>; signal?: AbortSignal } = {}) {
    await slot();
    try {
      for (let i = 0; ; i++) {
        try {
          const r = await fetch(this.url, { headers, signal: signal ?? AbortSignal.timeout(45000) });
          if (r.status >= 500 || r.status === 429 || r.status === 403) throw new Error(`HTTP ${r.status}`);
          if (!r.ok && r.status !== 206) console.warn('LOLA fetch status', r.status, headers?.Range);
          if (r.status === 200) throw new Error('server ignored the Range header (refusing to download the whole 2.7 GB file)');
          return new Resp(r) as unknown as BaseResponse;
        } catch (e) {
          if (i >= 6 || signal?.aborted || String(e).includes('refusing')) throw e;
          await new Promise((res) => setTimeout(res, 2000 * (i + 1)));
        }
      }
    } finally { free(); }
  }
}
const tiff = () => (tiffP ??= fromCustomClient(new RetryClient(base), { blockSize: 1024 * 1024, cacheSize: 256 } as never).catch((e) => { tiffP = null; throw e; }));

async function retry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let err: unknown;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) { err = e; tiffP = null; await new Promise((r) => setTimeout(r, 1500 * (i + 1))); }
  }
  throw err;
}

// The 20 m polar product covers 80-90 S (keep the +-50 km coarse layer inside it). Everywhere else uses the global 237 m map.
export const lolaCovers = (lat: number) => lat <= -81.0;
export const lolaGlobalOnly = (lat: number) => !lolaCovers(lat);

type V3 = [number, number, number];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };

function frame(latDeg: number, lonDeg: number) {
  const p = (latDeg * Math.PI) / 180, l = (lonDeg * Math.PI) / 180;
  const u: V3 = [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
  const e: V3 = [-Math.sin(l), Math.cos(l), 0];
  const n: V3 = norm(cross(u, e)); // north = up x east
  return { u, e, n };
}

/** Surface unit vector -> south-polar stereographic (x, y) in metres. x = 2R*py/(1-pz), y = 2R*px/(1-pz). */
const toStereo = (p: V3): [number, number] => { const k = (2 * R) / (1 - p[2]); return [k * p[1], k * p[0]]; };

async function buildLayer(t: GeoTIFF, imageIndex: number, site: Site, halfM: number): Promise<Layer> {
  const im = await t.getImage(imageIndex);
  const [x0, , x1, top] = (await t.getImage(0)).getBoundingBox(); // overviews carry no geotags: same extent, coarser pixels
  const res = (x1 - x0) / im.getWidth();
  const { u, e, n } = frame(site.lat, site.lon);
  const [cx, cy] = toStereo(u);
  // The site's east/north grid is rotated against the polar-stereographic x/y axes (by up to 90 deg), so its corners reach
  // sqrt(2) * halfM from the centre; polar-stereo scale adds ~1-2%. Window must cover them or the corners come out empty.
  const m = halfM * Math.SQRT2 * 1.03 + 4 * res;
  const c0 = Math.max(Math.floor((cx - m - x0) / res), 0), c1 = Math.min(Math.ceil((cx + m - x0) / res), im.getWidth());
  const r0 = Math.max(Math.floor((top - (cy + m)) / res), 0), r1 = Math.min(Math.ceil((top - (cy - m)) / res), im.getHeight());
  if (c1 - c0 < 4 || r1 - r0 < 4) throw new Error('site outside the LOLA tile');
  const ww = c1 - c0, wh = r1 - r0;
  const src = (await im.readRasters({ window: [c0, r0, c1, r1], interleave: false }) as unknown as ArrayLike<number>[])[0];

  const cells = Math.round((2 * halfM) / res), nOut = cells + 1, h = new Float32Array(nOut * nOut);
  for (let j = 0; j < nOut; j++) for (let i = 0; i < nOut; i++) {
    const E = (i - cells / 2) * res, N = (j - cells / 2) * res, d = Math.hypot(E, N), a = d / R;
    const k = d > 0 ? Math.sin(a) / d : 1 / R, c = Math.cos(a);
    const px = c * u[0] + k * (N * n[0] + E * e[0]), py = c * u[1] + k * (N * n[1] + E * e[1]), pz = c * u[2] + k * (N * n[2] + E * e[2]);
    const [x, y] = toStereo([px, py, pz]);
    const gx = (x - x0) / res - 0.5 - c0, gy = (top - y) / res - 0.5 - r0; // pixel centres
    const ix = Math.floor(gx), iy = Math.floor(gy);
    if (ix < 0 || iy < 0 || ix >= ww - 1 || iy >= wh - 1) { h[j * nOut + i] = NaN; continue; }
    const fx = gx - ix, fy = gy - iy, o = iy * ww + ix;
    const v00 = src[o], v10 = src[o + 1], v01 = src[o + ww], v11 = src[o + ww + 1];
    h[j * nOut + i] = (v00 * (1 - fx) + v10 * fx) * (1 - fy) + (v01 * (1 - fx) + v11 * fx) * fy;
  }
  // cells outside the NASA product stay NaN (= unknown); they are never interpolated or filled in
  return { n: nOut, widthM: nOut > 1 ? (nOut - 1) * res : 0, h };
}

// Nested grids like the published horizon work (fine near, coarse far). Image index in the COG pyramid:
// 0 = 20 m, 1 = 40 m, 2 = 80 m, 3 = 160 m, 4 = 320 m, 5 = 640 m, 6 = 1280 m. Far field out to 300 km because the
// Sun is never more than ~1.5 deg up, so ridges 100+ km away still cast shadows (NASA SVS 4893).
const SPEC = [{ image: 0, halfM: 3000 }, { image: 2, halfM: 15000 }, { image: 4, halfM: 50000 }, { image: 5, halfM: 150000 }, { image: 6, halfM: 300000 }];
const slug = (site: Site) => `${site.lat.toFixed(3)}_${site.lon.toFixed(3)}`;

/** Read the real LOLA pyramid over HTTP range requests and re-sample it onto the site's local grids. */
export async function buildLolaTerrain(site: Site, onStep?: (done: number, total: number) => void): Promise<Terrain> {
  if (lolaGlobalOnly(site.lat)) return finish(await buildGlobalLayers(site, onStep));
  const t = await tiff();
  const layers: Layer[] = [];
  for (const [i, l] of SPEC.entries()) { onStep?.(i, SPEC.length); layers.push(await buildLayer(t, l.image, site, l.halfM)); }
  onStep?.(SPEC.length, SPEC.length);
  return finish(layers);
}

function finish(layers: Layer[]): Terrain {
  const cell = layers[0].widthM / (layers[0].n - 1); // finest cell size tells which product it came from
  const label = cell < 100 ? 'NASA LOLA (PGDA): 20 m near field, coarser to 300 km' : `NASA LOLA global map: ${cell.toFixed(0)} m near field, coarser to 150 km`;
  const terrain: Terrain = { layers, view: layers[0], kind: 'lola', label };
  terrain.view = makeView(terrain, 20000, 385);
  return terrain;
}

// ---- compact file format so the preset sites can be baked once and served as static files
// "LOLA" | u32 headerLen | JSON {scale, layers:[{n,widthM}]} | Int16 grids (value = metres / scale)
const SCALE = 0.5;
export function encodeTerrain(t: Terrain): Uint8Array {
  const head = new TextEncoder().encode(JSON.stringify({ scale: SCALE, layers: t.layers.map((l) => ({ n: l.n, widthM: l.widthM })) }));
  const pad = (4 + 4 + head.length) % 2, body = t.layers.reduce((s, l) => s + l.h.length * 2, 0);
  const out = new Uint8Array(8 + head.length + pad + body), dv = new DataView(out.buffer);
  out.set([0x4c, 0x4f, 0x4c, 0x41]); dv.setUint32(4, head.length + pad, true); out.set(head, 8);
  let o = 8 + head.length + pad;
  for (const l of t.layers) for (const v of l.h) { dv.setInt16(o, Number.isNaN(v) ? -32768 : Math.max(-32767, Math.min(32767, Math.round(v / SCALE))), true); o += 2; }
  return out;
}
export function decodeTerrain(buf: ArrayBuffer): Terrain | null {
  const dv = new DataView(buf);
  if (buf.byteLength < 8 || dv.getUint32(0, false) !== 0x4c4f4c41) return null; // not our file (e.g. an HTML fallback page)
  const hl = dv.getUint32(4, true), head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hl)).replace(/\0+$/, ''));
  let o = 8 + hl; const layers: Layer[] = [];
  for (const l of head.layers as { n: number; widthM: number }[]) {
    const h = new Float32Array(l.n * l.n); for (let i = 0; i < h.length; i++, o += 2) { const q = dv.getInt16(o, true); h[i] = q === -32768 ? NaN : q * head.scale; }
    layers.push({ n: l.n, widthM: l.widthM, h });
  }
  return finish(layers);
}

const cache = new Map<string, Promise<Terrain>>();

/** Baked file for the preset sites (instant), else a live range-read of the NASA file (about a minute). */
export function loadLolaTerrain(site: Site, onStep?: (done: number, total: number) => void): Promise<Terrain> {
  const key = slug(site);
  let p = cache.get(key);
  if (!p) {
    p = (async () => {
      try {
        const r = await fetch(`/lola/${key}.bin`);
        if (r.ok) { const t = decodeTerrain(await r.arrayBuffer()); if (t) return t; }
      } catch { /* no baked file */ }
      return retry(() => buildLolaTerrain(site, onStep));
    })();
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}
export { slug as lolaSlug };

/** The whole-pole overview (image index 5 = 640 m/px by default) as one array, for the 2D map. */
export async function readOverview(imageIndex = 5) {
  return retry(async () => {
    const t = await tiff();
    const im = await t.getImage(imageIndex);
    const [x0, , x1, top] = (await t.getImage(0)).getBoundingBox();
    const w = im.getWidth(), h = im.getHeight();
    const data = (await im.readRasters({ interleave: false }) as unknown as ArrayLike<number>[])[0];
    return { w, h, x0, top, res: (x1 - x0) / w, data };
  });
}
