import { useEffect, useMemo, useRef } from 'react';
import type { Terrain } from '../lib/terrain';
import { baselineOf, cellOf, kFor, NASA_BASELINE_M, radiusFor, slopeImage, slopeStats } from '../lib/slope';

const SIZE = 220;

/** Real slope map and statistics from the finest LOLA grid around the site. Not a landing-safety certificate. */
export function SlopeCard({ terrain }: { terrain: Terrain }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const real = terrain.kind === 'lola';
  const layer = terrain.layers[0];
  const cell = cellOf(layer), HALF = Math.max(1000, 12 * cell);
  const s100 = useMemo(() => (real ? slopeStats(layer, radiusFor(layer, 100), NASA_BASELINE_M) : null), [layer, real]);
  const s500 = useMemo(() => (real ? slopeStats(layer, radiusFor(layer, 500, 8), NASA_BASELINE_M) : null), [layer, real]);

  useEffect(() => {
    const cv = ref.current; if (!cv || !real) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    ctx.putImageData(new ImageData(slopeImage(layer, Math.min(HALF, layer.widthM / 2 - 50), SIZE, kFor(layer, NASA_BASELINE_M)), SIZE, SIZE), 0, 0);
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
        <div key={s.radiusM} className="kv stack"><span>Within {Math.round(s.radiusM)} m</span><b>under 5°: {s.under5.toFixed(0)}% · under 10°: {s.under10.toFixed(0)}% · under 20°: {s.under20.toFixed(0)}%</b><small className="muted">median {s.medianDeg.toFixed(1)}° · steepest {s.maxDeg.toFixed(0)}°</small></div>
      ))}
      <small className="muted">Map is ±{(HALF / 1000).toFixed(1)} km, north up, white cross = site. Slope is measured over about {Math.round(baselineOf(layer, NASA_BASELINE_M))} m, close to NASA's Artemis HLS criterion of a landing slope <strong>under 10° over 100 m</strong> (NASA NTRS 20240009596); the grid is {cell.toFixed(0)} m per pixel{cell < 100 ? ' and partly interpolated' : ' (coarse next to a lander footprint)'}. This is a screening aid: rocks, boulders and small craters are not assessed, and no public rock data exists near the pole.</small>
    </div>
  );
}
