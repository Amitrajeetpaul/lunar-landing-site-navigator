// Run: npm run verify:lola   (network). Loads real LOLA terrain for the presets and prints what the horizon calc sees.
import { setLolaUrl, buildLolaTerrain } from './lola';
import { computeHorizon, heightAt } from './terrain';
import { PRESETS } from './sites';

process.on('unhandledRejection', (e) => console.error('unhandled', String(e).slice(0, 120)));
setLolaUrl('https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_20MPP_ADJ.TIF');
for (const s of PRESETS) {
  const t0 = performance.now();
  const t = await buildLolaTerrain(s);
  const t1 = performance.now();
  const hor = computeHorizon(t, 2), t2 = performance.now();
  const h = Array.from(hor), mx = Math.max(...h), mn = Math.min(...h), ia = h.indexOf(mx);
  const v = t.view.h; let vmin = Infinity, vmax = -Infinity, nan = 0; for (const x of v) { if (x !== x) nan++; else { if (x < vmin) vmin = x; if (x > vmax) vmax = x; } }
  console.log(`${s.name.padEnd(26)} site elev ${heightAt(t, 0, 0).toFixed(0).padStart(6)} m | load ${(t1 - t0).toFixed(0)} ms, horizon ${(t2 - t1).toFixed(0)} ms | horizon min ${mn.toFixed(2)}° max ${mx.toFixed(2)}° @az ${ia} | local relief ${vmin.toFixed(0)}..${vmax.toFixed(0)} m | NaN ${nan}`);
}
