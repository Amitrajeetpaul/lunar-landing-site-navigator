// npm run bake:map   Reads the whole-pole 640 m overview of the LOLA DEM from NASA PGDA (HTTP range requests) and writes
// public/lola/pole_map.bin for the 2D map: u32 headerLen | JSON {w,h,x0,top,res,scale} | Int16 heights (metres / scale, -32768 = none)
import { mkdirSync, writeFileSync } from 'node:fs';
import { readOverview, setLolaUrl } from '../src/lib/lola';

process.on('unhandledRejection', (e) => console.error('unhandled', String(e).slice(0, 120)));
setLolaUrl('https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_20MPP_ADJ.TIF');
const o = await readOverview(5);
const scale = 0.5, head = new TextEncoder().encode(JSON.stringify({ w: o.w, h: o.h, x0: o.x0, top: o.top, res: o.res, scale }));
const pad = (4 + head.length) % 2, out = new Uint8Array(4 + head.length + pad + o.w * o.h * 2), dv = new DataView(out.buffer);
dv.setUint32(0, head.length + pad, true); out.set(head, 4);
let p = 4 + head.length + pad, bad = 0;
for (let i = 0; i < o.w * o.h; i++, p += 2) {
  const v = o.data[i];
  if (!Number.isFinite(v) || v < -20000 || v > 20000) { dv.setInt16(p, -32768, true); bad++; } else dv.setInt16(p, Math.round(v / scale), true);
}
mkdirSync('public/lola', { recursive: true });
writeFileSync('public/lola/pole_map.bin', out);
console.log('wrote public/lola/pole_map.bin', o.w, 'x', o.h, 'res', o.res, 'm', 'nodata', bad, (out.length / 1e6).toFixed(1) + ' MB');
