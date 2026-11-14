// Run: npm test   (needs network). Compares the series fallback with JPL Horizons and fits phases if asked.
import { SERIES, seriesSample } from './ephemeris';
import type { Site } from './sites';
import { execFileSync } from 'node:child_process';

const sites: Site[] = [{ name: 'Shackleton', lat: -89.9, lon: 129.8 }, { name: 'Malapert', lat: -85.99, lon: 0.12 }, { name: 'Faustini', lat: -87.18, lon: 77 }];
const t0 = Date.UTC(2026, 10, 14), days = 60;
const f = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ');

async function hz(cmd: string, s: Site) {
  const q = new URLSearchParams({ format: 'json', COMMAND: `'${cmd}'`, OBJ_DATA: "'NO'", MAKE_EPHEM: "'YES'", EPHEM_TYPE: "'OBSERVER'", CENTER: "'coord@301'", COORD_TYPE: "'GEODETIC'", SITE_COORD: `'${s.lon},${s.lat},0'`, START_TIME: `'${f(t0)}'`, STOP_TIME: `'${f(t0 + days * 864e5)}'`, STEP_SIZE: "'3 h'", QUANTITIES: "'4'", ANG_FORMAT: "'DEG'", CSV_FORMAT: "'YES'" });
  const txt: string = JSON.parse(execFileSync('curl', ['-s', '-m', '60', `https://ssd.jpl.nasa.gov/api/horizons.api?${q}`], { maxBuffer: 1e8 }).toString()).result; // curl: Node's TLS store may lack the proxy CA
  return txt.slice(txt.indexOf('$$SOE') + 5, txt.indexOf('$$EOE')).trim().split('\n').map((r) => {
    const n = r.split(',').slice(1).map((x) => x.trim()).filter((x) => /^-?\d/.test(x)).map(Number); return [n[0], n[1]];
  });
}
const dAz = (a: number, b: number) => { let d = a - b; while (d > 180) d -= 360; while (d < -180) d += 360; return d; };

const ref = await Promise.all(sites.map(async (s) => ({ s, sun: await hz('10', s), earth: await hz('399', s) })));
function err() {
  let se = 0, ee = 0, n = 0;
  for (const { s, sun, earth } of ref) sun.forEach((_, i) => {
    const m = seriesSample(s, t0 + i * 3 * 3600_000);
    se += (m.sunEl - sun[i][1]) ** 2; ee += (m.earthEl - earth[i][1]) ** 2 + (dAz(m.earthAz, earth[i][0]) * Math.cos(s.lat * Math.PI / 180) * 0.1) ** 2; n++;
  });
  return { sunEl: Math.sqrt(se / n), earthEl: Math.sqrt(ee / n) };
}
console.log('before fit', err());
if (process.argv.includes('--fit')) {
  const S = SERIES; let best = { e: 1e9, v: [0, 0, 0, 0, 0, 0] };
  const sunErr = () => { let se = 0, n = 0; for (const { s, sun } of ref) sun.forEach((_, i) => { se += (seriesSample(s, t0 + i * 3 * 3600_000).sunEl - sun[i][1]) ** 2; n++; }); return se / n; };
  let bs = 1e9, bv = [0, 0, 1];
  for (const dir of [1, -1]) for (let nm = -15; nm <= 15; nm += 0.25) for (let o = 0; o < S.SUN_LAT_PERIOD; o += 6) {
    S.JD_NEW_MOON = 2451550.02 + nm; S.SUN_LAT_JD0 = 2461200 + o; S.SUN_DIR = dir;
    const e = sunErr(); if (e < bs) { bs = e; bv = [S.JD_NEW_MOON, S.SUN_LAT_JD0, dir]; }
  }
  [S.JD_NEW_MOON, S.SUN_LAT_JD0, S.SUN_DIR] = bv;
  for (let nm = -0.5; nm <= 0.5; nm += 0.02) for (let o = -6; o <= 6; o += 0.5) {
    const a0 = bv[0] + nm, b0 = bv[1] + o; S.JD_NEW_MOON = a0; S.SUN_LAT_JD0 = b0;
    const e = sunErr(); if (e < bs) { bs = e; bv = [a0, b0, S.SUN_DIR]; }
  }
  [S.JD_NEW_MOON, S.SUN_LAT_JD0, S.SUN_DIR] = bv;
  console.log('sun fit', bv, 'rms el', Math.sqrt(bs));
  for (const sl of [1, -1]) for (const sf of [1, -1]) {
    S.LIB_LON_AMP = 7 * sl; S.LIB_LAT_AMP = 6.7 * sf;
    for (let a = 0; a < S.ANOM; a += 0.5) for (let d = 0; d < S.DRAC; d += 0.5) {
      S.ANOM_JD0 = 2451589.7 - 27 + a; S.DRAC_JD0 = 2451578.7 - 27 + d;
      const e = err().earthEl; if (e < best.e) best = { e, v: [S.LIB_LON_AMP, S.LIB_LAT_AMP, S.ANOM_JD0, S.DRAC_JD0, 0, 0] };
    }
  }
  [S.LIB_LON_AMP, S.LIB_LAT_AMP, S.ANOM_JD0, S.DRAC_JD0] = best.v;
  console.log('fit', { LIB_LON_AMP: S.LIB_LON_AMP, LIB_LAT_AMP: S.LIB_LAT_AMP, ANOM_JD0: S.ANOM_JD0, DRAC_JD0: S.DRAC_JD0, SUN_LAT_JD0: S.SUN_LAT_JD0, JD_NEW_MOON: S.JD_NEW_MOON }, err());
}
