import { useEffect, useState } from 'react';
import type { Site } from '../lib/sites';
import type { Terrain } from '../lib/terrain';

const SVC = 'https://trek.nasa.gov/moon/trekarcgis/rest/services/LRO_LOLA_DEM_Global_256ppd_v06/ImageServer/identify';
const cache = new Map<string, Promise<number>>();
/** NASA Moon Trek's own LOLA elevation at a point (ImageServer identify; CORS-open). Longitude must be -180..180. */
function trekElevation(lat: number, lon: number): Promise<number> {
  const L = ((((lon + 180) % 360) + 360) % 360) - 180, key = `${lat.toFixed(4)},${L.toFixed(4)}`;
  let p = cache.get(key);
  if (!p) {
    p = fetch(`${SVC}?geometry=${encodeURIComponent(JSON.stringify({ x: L, y: lat }))}&geometryType=esriGeometryPoint&returnGeometry=false&f=json`, { signal: AbortSignal.timeout(15000) })
      .then((r) => r.json()).then((j) => { const v = parseFloat(j.value); if (!Number.isFinite(v)) throw new Error('no value'); return v; });
    p.catch(() => cache.delete(key)); cache.set(key, p);
  }
  return p;
}

/** Live cross-check of this app's terrain height at the site against NASA Moon Trek's LOLA service (a different server and pipeline). */
export function TrekCheck({ site, terrain }: { site: Site; terrain: Terrain }) {
  const [v, setV] = useState<{ state: 'loading' | 'ok' | 'err'; m?: number }>({ state: 'loading' });
  const l = terrain.layers[0], n = l.n, ours = l.h[Math.floor((n - 1) / 2) * n + Math.floor((n - 1) / 2)];
  useEffect(() => {
    if (terrain.kind !== 'lola') return;
    let live = true; setV({ state: 'loading' });
    trekElevation(site.lat, site.lon).then((m) => live && setV({ state: 'ok', m })).catch(() => live && setV({ state: 'err' }));
    return () => { live = false; };
  }, [site.lat, site.lon, terrain.kind]);
  if (terrain.kind !== 'lola' || Number.isNaN(ours)) return null;
  const diff = v.m === undefined ? null : ours - v.m;
  return (
    <div className="card">
      <div className="card-h"><b>Cross-check with NASA Moon Trek</b>{v.state === 'ok' && diff !== null && <span className={`badge ${Math.abs(diff) <= 25 ? 'ok' : 'warn'}`}>{Math.abs(diff) <= 25 ? 'MATCHES' : 'DIFFERS'}</span>}</div>
      {v.state === 'loading' && <small className="muted">Asking NASA Moon Trek for its LOLA elevation at this spot…</small>}
      {v.state === 'err' && <small className="muted">Moon Trek did not answer (offline or busy). The check is optional; nothing else depends on it.</small>}
      {v.state === 'ok' && diff !== null && (
        <>
          <div className="kv stack"><span>Elevation at this spot (metres above the 1737.4 km sphere)</span><b>this app {ours.toFixed(1)} m · Moon Trek {v.m!.toFixed(1)} m · difference {diff.toFixed(1)} m</b></div>
          <small className="muted">Moon Trek’s ImageServer serves NASA’s LOLA elevation from a separate server and pipeline, so agreement checks our terrain reader, projection and frame. Cited: NASA/JPL Moon Trek.</small>
        </>
      )}
    </div>
  );
}
