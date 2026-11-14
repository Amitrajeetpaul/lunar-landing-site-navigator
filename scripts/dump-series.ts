// Dumps our fallback series model for a few sites as JSON, for scripts/spice_check.py
import { seriesEphemeris } from '../src/lib/ephemeris';
import { PRESETS } from '../src/lib/sites';
const t0 = Date.parse('2026-11-14T00:00:00Z');
const out = [0, 3, 5].map((i) => ({ name: PRESETS[i].name, lat: PRESETS[i].lat, lon: PRESETS[i].lon, t0, samples: seriesEphemeris(PRESETS[i], t0, 30).map((s) => [s.t, s.sunAz, s.sunEl, s.earthAz, s.earthEl]) }));
console.log(JSON.stringify(out));
