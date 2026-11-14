// npm run bake:global   Bakes the real LOLA global-map terrain for the non-polar mission sites into public/lola/<lat>_<lon>.bin.
// Slow (NASA/MIT server, roughly 40 s per site). Sites at 81-90 S use the 20 m polar product (npm run bake:lola) instead.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { buildLolaTerrain, encodeTerrain, lolaGlobalOnly, lolaSlug } from '../src/lib/lola';
import { setGlobalBase } from '../src/lib/lolaGlobal';
import { MISSIONS } from '../src/lib/sites';

process.on('unhandledRejection', (e) => console.error('unhandled', String(e).slice(0, 120)));
setGlobalBase('https://imbrium.mit.edu/DATA/LOLA_GDR/CYLINDRICAL/IMG');
mkdirSync('public/lola', { recursive: true });
for (const s of MISSIONS.filter((m) => lolaGlobalOnly(m.lat))) {
  const f = `public/lola/${lolaSlug(s)}.bin`;
  if (existsSync(f) && !process.argv.includes('--force')) { console.log('have', f); continue; }
  const t0 = Date.now();
  let t; for (let k = 0; k < 3 && !t; k++) { try { t = await buildLolaTerrain(s); } catch (e) { console.warn('retry', String(e).slice(0, 80)); await new Promise((r) => setTimeout(r, 4000)); } }
  if (!t) { console.error('FAILED', s.name); continue; }
  writeFileSync(f, encodeTerrain(t));
  console.log('wrote', f, ((Date.now() - t0) / 1000).toFixed(0) + 's', t.layers.map((l) => l.n).join('/'));
}
