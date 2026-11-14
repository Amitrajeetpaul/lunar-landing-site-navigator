import type { Site } from './sites';

/** Az/el in degrees (clockwise from north, airless). sunR / earthR are the apparent disc radii in degrees. */
export interface Sample { t: number; sunAz: number; sunEl: number; earthAz: number; earthEl: number; sunR: number; earthR: number }
export type Source = 'horizons' | 'series';

export const STEP_H = 3;
const STEP_MS = STEP_H * 3600_000;
const R_MOON = 1737.4; // km
const rad = Math.PI / 180;
const deg = 180 / Math.PI;
const jd = (ms: number) => ms / 86400000 + 2440587.5;
const wrap360 = (a: number) => ((a % 360) + 360) % 360;

// ---------------------------------------------------------------- series model (fallback)
// Approximate selenographic geometry. Good to a fraction of a degree for planning, not mission use.
// Phase constants are fitted against 60 days of JPL Horizons data (npm test -- --fit): Sun ~0.03 deg RMS,
// Earth ~0.5 deg RMS in that span, and it drifts further out. Horizons is the primary source; this is the offline fallback.
export const SERIES = {
  JD_NEW_MOON: 2451550.02, SYNODIC: 29.530588853,
  SUN_DIR: 1, SUN_LAT_AMP: 1.5427, SUN_LAT_PERIOD: 346.62, SUN_LAT_JD0: 2461447.0,
  LIB_LON_AMP: 7.0, LIB_LAT_AMP: 6.7,
  ANOM: 27.55455, ANOM_JD0: 2451589.7,
  DRAC: 27.212221, DRAC_JD0: 2451578.7,
};

function basis(latDeg: number, lonDeg: number) {
  const p = latDeg * rad, l = lonDeg * rad;
  const cp = Math.cos(p), sp = Math.sin(p), cl = Math.cos(l), sl = Math.sin(l);
  return {
    u: [cp * cl, cp * sl, sp], // up
    e: [-sl, cl, 0], // east
    n: [-sp * cl, -sp * sl, cp], // north
  };
}
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function azEl(site: Site, bodyLat: number, bodyLon: number, distKm: number): [number, number] {
  const { u, e, n } = basis(site.lat, site.lon);
  const b = basis(bodyLat, bodyLon).u;
  const k = Number.isFinite(distKm) ? distKm : 1;
  const d = [b[0] * k - (Number.isFinite(distKm) ? R_MOON * u[0] : 0),
             b[1] * k - (Number.isFinite(distKm) ? R_MOON * u[1] : 0),
             b[2] * k - (Number.isFinite(distKm) ? R_MOON * u[2] : 0)];
  const len = Math.hypot(d[0], d[1], d[2]);
  return [wrap360(Math.atan2(dot(d, e), dot(d, n)) * deg), Math.asin(dot(d, u) / len) * deg];
}

export function seriesSample(site: Site, t: number): Sample {
  const S = SERIES, J = jd(t);
  const phase = (((J - S.JD_NEW_MOON) / S.SYNODIC) % 1 + 1) % 1;
  const sunLon = 180 - S.SUN_DIR * 360 * phase;
  const sunLat = S.SUN_LAT_AMP * Math.sin(2 * Math.PI * (J - S.SUN_LAT_JD0) / S.SUN_LAT_PERIOD);
  const M = 2 * Math.PI * (J - S.ANOM_JD0) / S.ANOM;
  const F = 2 * Math.PI * (J - S.DRAC_JD0) / S.DRAC;
  const earthLon = S.LIB_LON_AMP * Math.sin(M);
  const earthLat = S.LIB_LAT_AMP * Math.sin(F);
  const dist = 384400 * (1 - 0.0549 * Math.cos(M));
  const [sunAz, sunEl] = azEl(site, sunLat, sunLon, Infinity);
  const [earthAz, earthEl] = azEl(site, earthLat, earthLon, dist);
  const earthR = Math.asin(6378.137 / dist) * deg; // 0.90-1.03 deg over the orbit
  return { t, sunAz, sunEl, earthAz, earthEl, sunR: 0.2666, earthR };
}

export function seriesEphemeris(site: Site, t0: number, days: number): Sample[] {
  const n = Math.round((days * 24) / STEP_H) + 1;
  return Array.from({ length: n }, (_, i) => seriesSample(site, t0 + i * STEP_MS));
}

// ---------------------------------------------------------------- JPL Horizons (primary)
const fmtT = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ');

// Horizons is a shared public service: send one request at a time and retry once.
let chain: Promise<unknown> = Promise.resolve();
function queued<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn).catch(async () => { await new Promise((r) => setTimeout(r, 800)); return fn(); });
  chain = run.catch(() => undefined);
  return run as Promise<T>;
}

async function horizonsBody(cmd: string, site: Site, t0: number, days: number): Promise<[number, number, number][]> {
  const q = new URLSearchParams({
    format: 'json', COMMAND: `'${cmd}'`, OBJ_DATA: "'NO'", MAKE_EPHEM: "'YES'", EPHEM_TYPE: "'OBSERVER'",
    CENTER: "'coord@301'", COORD_TYPE: "'GEODETIC'", SITE_COORD: `'${site.lon},${site.lat},0'`,
    START_TIME: `'${fmtT(t0)}'`, STOP_TIME: `'${fmtT(t0 + days * 86400000)}'`,
    STEP_SIZE: `'${STEP_H} h'`, QUANTITIES: "'4,13'", ANG_FORMAT: "'DEG'", CSV_FORMAT: "'YES'",
  });
  const res = await fetch(`/horizons?${q}`, { signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`Horizons HTTP ${res.status}`);
  const text: string = (await res.json()).result ?? '';
  const a = text.indexOf('$$SOE'), b = text.indexOf('$$EOE');
  if (a < 0 || b < 0) throw new Error('Horizons: no ephemeris in reply');
  return text.slice(a + 5, b).trim().split('\n').map((row) => {
    const nums = row.split(',').slice(1).map((s) => s.trim()).filter((s) => /^-?\d/.test(s)).map(Number);
    if (nums.length < 3) throw new Error('Horizons: bad row');
    return [nums[0], nums[1], nums[2] / 7200] as [number, number, number]; // angular diameter (arcsec) -> radius (deg)
  });
}

export async function horizonsEphemeris(site: Site, t0: number, days: number): Promise<Sample[]> {
  const sun = await queued(() => horizonsBody('10', site, t0, days));
  const earth = await queued(() => horizonsBody('399', site, t0, days));
  const n = Math.min(sun.length, earth.length);
  return Array.from({ length: n }, (_, i) => ({
    t: t0 + i * STEP_MS, sunAz: sun[i][0], sunEl: sun[i][1], earthAz: earth[i][0], earthEl: earth[i][1], sunR: sun[i][2], earthR: earth[i][2],
  }));
}

// Cached, with automatic fallback to the series model.
const cache = new Map<string, Sample[]>();
export async function getEphemeris(site: Site, t0: number, days: number, preferHorizons = true) {
  const key = `${site.lat},${site.lon},${t0},${days}`;
  if (preferHorizons) {
    const hit = cache.get(key);
    if (hit) return { samples: hit, source: 'horizons' as Source };
    try {
      const samples = await horizonsEphemeris(site, t0, days);
      cache.set(key, samples);
      return { samples, source: 'horizons' as Source };
    } catch { /* fall through */ }
  }
  return { samples: seriesEphemeris(site, t0, days), source: 'series' as Source };
}

// ---------------------------------------------------------------- interpolation
const lerpAz = (a: number, b: number, f: number) => {
  let d = b - a;
  if (d > 180) d -= 360; else if (d < -180) d += 360;
  return wrap360(a + d * f);
};

export function sampleAt(samples: Sample[], t: number): Sample {
  const x = Math.min(Math.max((t - samples[0].t) / STEP_MS, 0), samples.length - 1);
  const i = Math.min(Math.floor(x), samples.length - 2), f = x - i;
  if (samples.length < 2) return samples[0];
  const a = samples[i], b = samples[i + 1];
  return {
    t, sunAz: lerpAz(a.sunAz, b.sunAz, f), sunEl: a.sunEl + (b.sunEl - a.sunEl) * f,
    earthAz: lerpAz(a.earthAz, b.earthAz, f), earthEl: a.earthEl + (b.earthEl - a.earthEl) * f,
    sunR: a.sunR + (b.sunR - a.sunR) * f, earthR: a.earthR + (b.earthR - a.earthR) * f,
  };
}
