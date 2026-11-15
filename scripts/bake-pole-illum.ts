// npm run bake:illum   (network, several minutes)
// Bakes NASA's own 18.6-year average Sun-visibility map (LOLA Lunar Polar Illumination, PGDA product 69 / PDS AVGVISIB_75S_120M_201608)
// onto the same 80-90 S grid as public/lola/pole_map.bin, so the pole map can show it as an overlay.
// Output: public/lola/pole_illum.bin = u32 headerLen | JSON {w,h} | Uint8 per pixel (0-100 = % of time sunlit, 255 = no data)
import { readFileSync, writeFileSync } from 'node:fs';

const URL_ = 'https://imbrium.mit.edu/EXTRAS/ILLUMINATION/IMG/AVGVISIB_75S_120M_201608.IMG', RES = 120;
process.on('unhandledRejection', (e) => console.error('unhandled', String(e).slice(0, 120)));
const pm = readFileSync('public/lola/pole_map.bin'), dv0 = new DataView(pm.buffer, pm.byteOffset, pm.byteLength);
const hl = dv0.getUint32(0, true), head = JSON.parse(new TextDecoder().decode(pm.subarray(4, 4 + hl)).replace(/\0+$/, '')); // {w,h,x0,top,res}
const size = +(await fetch(URL_, { method: 'HEAD' })).headers.get('content-length')!;
const N = Math.round(Math.sqrt(size / 2)), c0 = (N - 1) / 2;
console.log('NASA map', N, 'x', N, 'px at', RES, 'm; target grid', head.w, 'x', head.h, 'at', head.res, 'm');
// rows needed: the target grid spans y in [top - h*res, top]
const rA = Math.max(0, Math.floor(c0 - head.top / RES) - 4), rB = Math.min(N - 1, Math.ceil(c0 - (head.top - head.h * head.res) / RES) + 4);
const rows = rB - rA + 1, stride = N * 2, data = new Uint8Array(rows * stride);
async function range(a: number, b: number) {
  for (let i = 0; i < 5; i++) { try { const r = await fetch(URL_, { headers: { Range: `bytes=${a}-${b}` }, signal: AbortSignal.timeout(90000) }); if (r.status !== 206) throw new Error('HTTP ' + r.status); return new Uint8Array(await r.arrayBuffer()); } catch (e) { console.warn('  retry', String(e).slice(0, 60)); await new Promise((r) => setTimeout(r, 3000 * (i + 1))); } }
  throw new Error('range failed');
}
const CH = Math.max(1, Math.floor(4e6 / stride));
for (let r = 0; r < rows; r += CH) { const n = Math.min(CH, rows - r); data.set(await range((rA + r) * stride, (rA + r + n) * stride - 1), r * stride); if ((r / CH) % 5 === 0) console.log(`  ${Math.round((100 * r) / rows)}% (${r}/${rows} rows)`); }
const px = (row: number, col: number) => { const rr = row - rA; if (rr < 0 || rr >= rows || col < 0 || col >= N) return NaN; return new DataView(data.buffer).getInt16(rr * stride + col * 2, true); };
const out = new Uint8Array(head.w * head.h).fill(255);
for (let j = 0; j < head.h; j++) for (let i = 0; i < head.w; i++) {
  const X = head.x0 + (i + 0.5) * head.res, Y = head.top - (j + 0.5) * head.res, col = c0 + X / RES, row = c0 - Y / RES;
  let s = 0, n = 0; // average the ~5x5 block of NASA pixels that fall inside this 640 m pixel
  for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) { const v = px(Math.round(row) + dr, Math.round(col) + dc); if (!Number.isNaN(v) && v >= 0) { s += v; n++; } }
  if (n) out[j * head.w + i] = Math.max(0, Math.min(100, Math.round((s / n) * 0.00004 * 100)));
}
const h = new TextEncoder().encode(JSON.stringify({ w: head.w, h: head.h })), buf = new Uint8Array(4 + h.length + out.length);
new DataView(buf.buffer).setUint32(0, h.length, true); buf.set(h, 4); buf.set(out, 4 + h.length); writeFileSync('public/lola/pole_illum.bin', buf);
let lit = 0, shadow = 0, nodata = 0; for (const v of out) { if (v === 255) nodata++; else if (v === 0) shadow++; else lit++; }
console.log(`wrote public/lola/pole_illum.bin (${(buf.length / 1e6).toFixed(2)} MB): lit ${lit}, shadowed(0%) ${shadow}, no data ${nodata} pixels`);
