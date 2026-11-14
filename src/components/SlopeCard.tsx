import { useEffect, useMemo, useRef } from 'react';
import type { Terrain } from '../lib/terrain';
import { cellOf, radiusFor, slopeImage, slopeStats } from '../lib/slope';

const SIZE = 220;

/** Real slope map and statistics from the finest LOLA grid around the site. Not a landing-safety certificate. */
export function SlopeCard({ terrain }: { terrain: Terrain }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const real = terrain.kind === 'lola';
  const layer = terrain.layers[0];
  const cell = cellOf(layer), HALF = Math.max(1000, 12 * cell);
  const s100 = useMemo(() => (real ? slopeStats(layer, radiusFor(layer, 100)) : null), [layer, real]);
  const s500 = useMemo(() => (real ? slopeStats(layer, radiusFor(layer, 500, 8)) : null), [layer, real]);

  useEffect(() => {
    const cv = ref.current; if (!cv || !real) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    ctx.putImageData(new ImageData(slopeImage(layer, Math.min(HALF, layer.widthM / 2 - 50), SIZE), SIZE, SIZE), 0, 0);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(SIZE / 2 - 9, SIZE / 2); ctx.lineTo(SIZE / 2 + 9, SIZE / 2); ctx.moveTo(SIZE / 2, SIZE / 2 - 9); ctx.lineTo(SIZE / 2, SIZE / 2 + 9); ctx.stroke();
  }, [layer, real, HALF]);

  if (!real) return <div className="card"><div className="label">Slope check</div><small className="muted">Needs real LOLA terrain. The NASA terrain read failed for this site, so no slope numbers are shown.</small></div>;
  return (
    <div className="card">
      <div className="label">Slope check · LOLA {cell.toFixed(0)} m</div>
      <canvas ref={ref} width={SIZE} height={SIZE} className="slopemap" aria-label="Slope map around the site" />
      <div className="legend"><i style={{ background: 'rgb(60,190,120)' }} />&lt;5° <i style={{ background: 'rgb(240,200,70)' }} />5–10° <i style={{ background: 'rgb(240,140,50)' }} />10–15° <i style={{ background: 'rgb(225,70,70)' }} />&gt;15°</div>
      {[s100, s500].map((s) => s && (
        <div key={s.radiusM} className="kv stack"><span>Within {s.radiusM} m</span><b>median {s.medianDeg.toFixed(1)}° · {s.under10.toFixed(0)}% under 10° · max {s.maxDeg.toFixed(0)}°</b></div>
      ))}
      <small className="muted">Map is ±{(HALF / 1000).toFixed(1)} km, north up, white cross = site. Slope uses a {(2 * cell).toFixed(0)} m baseline on a {cell.toFixed(0)} m grid{cell < 100 ? ' that is partly interpolated' : ' (much coarser than a lander footprint)'}, so rocks and small craters are not resolved. Landers need local surveys and tighter limits: this is a screening aid.</small>
    </div>
  );
}
