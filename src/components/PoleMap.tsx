import { useEffect, useRef, useState } from 'react';
import { MISSIONS, PRESETS, type Site } from '../lib/sites';

const R = 1_737_400;
interface MapData { w: number; h: number; x0: number; top: number; res: number; z: Float32Array }

async function loadMap(): Promise<MapData> {
  const buf = await (await fetch('/lola/pole_map.bin')).arrayBuffer(), dv = new DataView(buf);
  const hl = dv.getUint32(0, true), head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hl)).replace(/\0+$/, ''));
  const z = new Float32Array(head.w * head.h); let o = 4 + hl;
  for (let i = 0; i < z.length; i++, o += 2) { const q = dv.getInt16(o, true); z[i] = q === -32768 ? NaN : q * head.scale; }
  return { ...head, z };
}
/** lat/lon -> pixel on the south-polar stereographic map (same maths as the terrain reader). */
const toPx = (m: MapData, lat: number, lon: number): [number, number] => {
  const p = (lat * Math.PI) / 180, l = (lon * Math.PI) / 180;
  const px = Math.cos(p) * Math.cos(l), py = Math.cos(p) * Math.sin(l), pz = Math.sin(p), k = (2 * R) / (1 - pz);
  return [(k * py - m.x0) / m.res, (m.top - k * px) / m.res];
};
const ringR = (m: MapData, lat: number) => { const p = (lat * Math.PI) / 180; return ((2 * R * Math.cos(p)) / (1 - Math.sin(p))) / m.res; };

/** Real LOLA hillshade of the whole 80-90 S region, with the sites on it. Click a site to select it. */
export function PoleMap({ site, onPick }: { site: Site; onPick: (s: Site) => void }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const [m, setM] = useState<MapData | null>(null);
  const [err, setErr] = useState(false);
  const ill = useRef<HTMLCanvasElement>(null);
  const [showIllum, setShowIllum] = useState(() => new URLSearchParams(location.search).get('illum') === '1');
  const [illMsg, setIllMsg] = useState('');
  useEffect(() => { loadMap().then(setM).catch(() => setErr(true)); }, []);

  useEffect(() => {
    if (!m || !cv.current) return;
    const { w, h, z, res } = m, c = cv.current, ctx = c.getContext('2d')!;
    c.width = w; c.height = h;
    const img = ctx.createImageData(w, h);
    // low-angle light from the upper left, like a south-pole illumination view
    const az = (315 * Math.PI) / 180, el = (12 * Math.PI) / 180, lx = Math.cos(el) * Math.sin(az), ly = Math.cos(el) * Math.cos(az), lz = Math.sin(el);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const o = (j * w + i) * 4, a = z[j * w + i];
      if (Number.isNaN(a) || i < 1 || j < 1 || i >= w - 1 || j >= h - 1) { img.data[o] = 8; img.data[o + 1] = 12; img.data[o + 2] = 28; img.data[o + 3] = 255; continue; }
      const dx = (z[j * w + i + 1] - z[j * w + i - 1]) / (2 * res), dy = (z[(j - 1) * w + i] - z[(j + 1) * w + i]) / (2 * res);
      const nl = 1 / Math.hypot(dx, dy, 1), s = Math.max(0, (-dx * lx - dy * ly + lz) * nl);
      const v = 18 + 220 * Math.pow(s, 0.8);
      img.data[o] = v; img.data[o + 1] = v * 0.97; img.data[o + 2] = v * 0.92; img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [m]);

  // NASA's own 18.6-year average Sun-visibility map (LOLA Lunar Polar Illumination, PGDA product 69), baked onto the same grid
  useEffect(() => {
    if (!showIllum || !m || !ill.current) return;
    let live = true; setIllMsg('Loading NASA illumination map…');
    fetch('/lola/pole_illum.bin').then((r) => { if (!r.ok) throw new Error('missing'); return r.arrayBuffer(); }).then((buf) => {
      if (!live || !ill.current) return;
      const hl = new DataView(buf).getUint32(0, true), head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hl))), px = new Uint8Array(buf, 4 + hl);
      const c = ill.current, ctx = c.getContext('2d')!; c.width = head.w; c.height = head.h;
      const img = ctx.createImageData(head.w, head.h);
      for (let k = 0; k < px.length; k++) {
        const v = px[k], o = k * 4;
        if (v === 255) { img.data[o + 3] = 0; continue; }
        if (v === 0) { img.data[o] = 30; img.data[o + 1] = 70; img.data[o + 2] = 200; img.data[o + 3] = 120; continue; } // permanent shadow: blue
        img.data[o] = 255; img.data[o + 1] = 190; img.data[o + 2] = 60; img.data[o + 3] = 40 + Math.round(v * 1.6);  // sunlit: amber, more opaque = more sunlight
      }
      ctx.putImageData(img, 0, 0); setIllMsg('');
    }).catch(() => live && setIllMsg('Illumination map not found (run npm run bake:illum).'));
    return () => { live = false; };
  }, [showIllum, m]);

  if (err) return <small className="muted">Pole map data not found (run npm run bake:map).</small>;
  const pts = m ? [...PRESETS.map((s) => ({ s, kind: 'preset' as const })), ...MISSIONS.filter((x) => x.lat <= -80).map((s) => ({ s, kind: 'mission' as const }))] : [];
  const cur = m ? toPx(m, site.lat, site.lon) : [0, 0];
  const cx = m ? toPx(m, -90, 0)[0] : 0, cy = m ? toPx(m, -90, 0)[1] : 0;
  return (
    <div className="polemap">
      <div className="mapwrap">
        <canvas ref={cv} aria-label="Hillshade of the lunar south pole from LOLA" />
        <canvas ref={ill} aria-label="NASA 18.6-year average illumination" style={{ display: showIllum ? 'block' : 'none', pointerEvents: 'none' }} />
        {m && (
          <svg viewBox={`0 0 ${m.w} ${m.h}`} className="mapsvg">
            {[82, 84, 86, 88].map((l) => <g key={l}><circle cx={cx} cy={cy} r={ringR(m, -l)} fill="none" stroke="rgba(140,175,255,.75)" strokeWidth={3} strokeDasharray="12 10" /><text x={cx + ringR(m, -l) * 0.7071 + 4} y={cy - ringR(m, -l) * 0.7071} fontSize="22" fill="#9bb6ff">{l}°S</text></g>)}
            <text x={cx + 6} y={cy - 8} fontSize="22" fill="#9bb6ff">Pole</text>
            {pts.map(({ s, kind }) => { const [x, y] = toPx(m, s.lat, s.lon); const sel = s.lat === site.lat && s.lon === site.lon;
              return <g key={s.name} className="mk" onClick={() => onPick(s)}><title>{s.name}</title>
                <circle cx={x} cy={y} r={sel ? 15 : 11} fill={kind === 'preset' ? '#f4b73f' : '#58a6ff'} stroke="#fff" strokeWidth={sel ? 4 : 2} /></g>; })}
            {!pts.some(({ s }) => s.lat === site.lat && s.lon === site.lon) && <circle cx={cur[0]} cy={cur[1]} r={13} fill="none" stroke="#fff" strokeWidth={4} />}
          </svg>
        )}
      </div>
      <label className="inl" style={{ marginTop: 8 }}><input type="checkbox" checked={showIllum} onChange={(e) => setShowIllum(e.target.checked)} /> Show NASA’s 18.6-year Sun map (blue = sunlit under 0.5% of the time, amber = sunlit, more opaque = more sunlight)</label>
      {illMsg && <small className="muted">{illMsg}</small>}
      <small className="muted">Real NASA LOLA elevation, 640 m per pixel, hillshaded with a low Sun. Rings are latitudes. <span style={{ color: '#f4b73f' }}>●</span> our candidate sites, <span style={{ color: '#58a6ff' }}>●</span> past or planned landings. Click one to select it.</small>
    </div>
  );
}
