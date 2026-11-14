// npm run bake:lola   (network, slow: PGDA's server is slow, roughly a minute per site)
// Reads the real LOLA south-pole DEM from NASA PGDA by HTTP range requests, re-samples it around each preset
// site and writes public/lola/<lat>_<lon>.bin so the app opens instantly.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { buildLolaTerrain, encodeTerrain, lolaCovers, lolaSlug, setLolaUrl } from '../src/lib/lola';
import { MISSIONS, PRESETS } from '../src/lib/sites';

process.on('unhandledRejection', (e) => console.error('unhandled', String(e).slice(0, 120)));
setLolaUrl('https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_20MPP_ADJ.TIF');
mkdirSync('public/lola', { recursive: true });
for (const s of [...PRESETS, ...MISSIONS.filter((m) => lolaCovers(m.lat))]) {
  const f = `public/lola/${lolaSlug(s)}.bin`;
  if (existsSync(f) && !process.argv.includes('--force')) { console.log('have', f); continue; }
  const t0 = Date.now();
  let t; for (let k = 0; k < 3 && !t; k++) { try { t = await buildLolaTerrain(s); } catch (e) { console.warn('retry', String(e).slice(0, 80)); await new Promise((r) => setTimeout(r, 5000)); } }
  if (!t) { console.error('FAILED', s.name); continue; }
  writeFileSync(f, encodeTerrain(t));
  console.log('wrote', f, ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
