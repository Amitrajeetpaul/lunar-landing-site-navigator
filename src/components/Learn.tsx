import type { Sample } from '../lib/ephemeris';
import { maxSunEl } from '../lib/power';
import type { Site } from '../lib/sites';

const W = 300, H = 110;
function Curve({ pts, color, label, xl }: { pts: [number, number][]; color: string; label: string; xl: string }) {
  const path = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${(x * W).toFixed(1)},${(H - (Math.max(y, 0) / 90) * H).toFixed(1)}`).join('');
  return (
    <svg viewBox={`0 0 ${W} ${H + 22}`} className="learnchart" role="img" aria-label={label}>
      {[0, 30, 60, 90].map((g) => <g key={g}><line x1={0} x2={W} y1={H - (g / 90) * H} y2={H - (g / 90) * H} stroke="rgba(255,255,255,.12)" /><text x={2} y={H - (g / 90) * H - 2} fontSize="10" fill="#b3bcd8">{g}°</text></g>)}
      <path d={path} fill="none" stroke={color} strokeWidth={2} />
      <text x={W / 2} y={H + 14} textAnchor="middle" fontSize="11" fill="#b3bcd8">{xl}</text>
    </svg>
  );
}

const GLOSS: [string, string][] = [
  ['Azimuth', 'The compass direction you look in: 0° is north, 90° east, 180° south, 270° west.'],
  ['Elevation', 'How high something is above the flat horizon, in degrees. 0° is on the horizon, 90° is straight up.'],
  ['Horizon', 'Where ground meets sky. On the Moon it is the real skyline of hills and crater rims, and in each direction it can be higher than 0°.'],
  ['Outage', 'A stretch of time with no Sun (no power) or no Earth (no direct radio link).'],
  ['Libration', 'The Moon slowly nods and wobbles, so Earth seems to drift up and down in the sky by about 7° and can slip behind a ridge.'],
  ['Disc rule', 'The Sun and Earth are discs, not dots. “Any part” counts them as visible as soon as an edge peeks over the ridge; “whole” needs the full disc.'],
  ['Ephemeris', 'A table of where a planet or moon is at each time. We get it from NASA JPL Horizons.'],
  ['Relay satellite', 'A spacecraft in orbit that passes radio signals between a lander and Earth when Earth is hidden.'],
];

export function Learn({ site, samples, days }: { site: Site; samples: Sample[]; days: number }) {
  const maxEl = maxSunEl(samples);
  const expected = 90 - Math.abs(site.lat) + 1.54;
  const moon: [number, number][] = samples.map((s, i) => [i / (samples.length - 1), s.sunEl]);
  const earthDay: [number, number][] = Array.from({ length: 49 }, (_, i) => [i / 48, 68 * Math.max(0, Math.cos((i / 48 - 0.5) * 2 * Math.PI))]);
  return (
    <div className="learn">
      <div className="panel">
        <h3>Why the Moon’s south pole is so different</h3>
        <p>On Earth the Sun climbs high in the sky every day. At the Moon’s south pole it never does: it crawls around the horizon, so a single hill can hide it for days. That is why choosing the landing <i>place</i> and <i>date</i> matters so much.</p>
        <div className="learngrid">
          <div>
            <h4>The Sun at this site over {days} days (real, from JPL Horizons)</h4>
            <Curve pts={moon} color="#f4b73f" label="Sun elevation at this site" xl={`${days} days (Sun elevation, 0–90°)`} />
            <p className="muted">Highest Sun in this window: <b>{maxEl.toFixed(1)}°</b> above the flat horizon. Rule of thumb: at {site.lat.toFixed(1)}° the Sun peaks near 90 − |lat| + 1.5° = <b>{expected.toFixed(1)}°</b>.</p>
          </div>
          <div>
            <h4>A mid-latitude day on Earth (illustration)</h4>
            <Curve pts={earthDay} color="#58a6ff" label="Sun elevation on Earth over one day" xl="one day (Sun elevation, 0–90°)" />
            <p className="muted">Here the Sun swings up to about 68° (midsummer at 45° latitude). Same 0–90° scale: the lunar pole is almost flat.</p>
          </div>
        </div>
      </div>
      <div className="panel">
        <h3>Why so low? The tilt</h3>
        <div className="tilt">
          <div><span>Earth’s axis tilt</span><div className="track"><div style={{ width: `${(23.44 / 23.44) * 100}%`, background: '#58a6ff' }} /></div><b>23.4°</b></div>
          <div><span>Moon’s axis tilt</span><div className="track"><div style={{ width: `${(1.54 / 23.44) * 100}%`, background: '#f4b73f' }} /></div><b>1.5°</b></div>
        </div>
        <p className="muted">The Moon’s axis is almost upright, so there are no real seasons and the Sun stays within about 1.5° of the horizon at the pole. Its day is about 29.5 Earth days long, so a lunar “night” can last two weeks.</p>
        <ul>
          <li><b>No air:</b> shadows are razor sharp, the sky is black, and the horizon is exactly the ridge line.</li>
          <li><b>Permanently shadowed craters:</b> some floors have not seen sunlight for billions of years and are colder than −230 °C. That is where water ice can survive.</li>
          <li><b>Ridges and peaks</b> can stay sunlit for most of the year, which is why landing-site studies hunt for them.</li>
        </ul>
      </div>
      <div className="panel">
        <h3>Why small changes have large effects</h3>
        <p>In our own runs (30 days from 14 Nov 2026, 2 m antenna): the Shackleton ridge point had the Sun up 100% of the time, while the Faustini rim point had it up about 71%. A few kilometres and a different skyline changed the answer by nearly a third. Moving the start date also changes it: the best-start-date finder on the Compare tab shows an 11-point spread over a few weeks at one site.</p>
      </div>
      <div className="panel">
        <h3>Words used in this app</h3>
        <dl className="gloss">{GLOSS.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}</dl>
      </div>
    </div>
  );
}
