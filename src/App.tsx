import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Compare } from './components/Compare';
import { Learn } from './components/Learn';
import { PoleMap } from './components/PoleMap';
import { PowerCard } from './components/PowerCard';
import { LongTermCard } from './components/LongTermCard';
import { DarkCard } from './components/DarkCard';
import { SlopeCard } from './components/SlopeCard';
import { TrekCheck } from './components/TrekCheck';
import { ScoreCard } from './components/ScoreCard';
import { ShareCard } from './components/ShareCard';
import { Report } from './components/Report';
import { HorizonChart } from './components/HorizonChart';
import { Scene3D } from './components/Scene3D';
import { IconBars, IconCheck, IconCompare, IconInfo, IconLearn, IconEarth, IconMountain, IconPin, IconSun, IconWarning, Logo } from './components/Icons';
import { Timeline } from './components/Timeline';
import { fmtDur, fromInput, slopeUnder10Of, toInput } from './lib/analysis';
import { DEFAULT_WEIGHTS, missionScore, type Weights } from './lib/score';
import { slopeStats } from './lib/slope';
import { aiBrief, factsFrom } from './lib/aiBrief';
import { maxSunEl } from './lib/power';
import { brief } from './lib/brief';
import { getEphemeris, sampleAt, seriesEphemeris, STEP_H, type Sample, type Source } from './lib/ephemeris';
import { MISSIONS, PRESETS, type Site } from './lib/sites';
import { loadLolaTerrain } from './lib/lola';
import { computeHorizon, proceduralTerrain, terrainFromImage, type Terrain } from './lib/terrain';
import { flagsFor, nowAt, RULES, statusOf, timeToChange, verdictFor, type Rule } from './lib/visibility';

const DEFAULT_START = Date.UTC(2026, 10, 14, 0, 0);
const SPEEDS: [string, number][] = [['1 h / s', 3600e3], ['6 h / s', 6 * 3600e3], ['1 day / s', 86400e3], ['3 days / s', 3 * 86400e3]];

// ---- state restored from the shareable link
const Q0 = () => new URLSearchParams(location.search);
function initSite(): Site {
  const q = Q0(), lat = parseFloat(q.get('lat') ?? ''), lon = parseFloat(q.get('lon') ?? '');
  if (Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90) {
    const p = PRESETS.find((x) => Math.abs(x.lat - lat) < 1e-6 && Math.abs(x.lon - lon) < 1e-6);
    return p ?? { name: `Custom (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`, lat: Math.max(lat, -89.99), lon };
  }
  return PRESETS[0];
}
const INIT_SITE = initSite();
const INIT_START = (() => { const v = Q0().get('start'); const t = v ? fromInput(v) : NaN; return Number.isNaN(t) ? DEFAULT_START : t; })();
const INIT_DAYS = (() => { const d = +(Q0().get('days') ?? 30); return [15, 30, 60].includes(d) ? d : 30; })();
const INIT_MAST = (() => { const m = parseFloat(Q0().get('mast') ?? ''); return Number.isFinite(m) && m >= 0 && m <= 50 ? m : 2; })();
const INIT_RULE = (() => { const r = Q0().get('rule'); return (r === 'centre' || r === 'whole' ? r : 'any') as Rule; })();
const INIT_W = (() => { const a = (Q0().get('w') ?? '').split(',').map(Number); return a.length === 4 && a.every((x) => Number.isFinite(x) && x >= 0 && x <= 100) ? { sun: a[0], both: a[1], outage: a[2], slope: a[3] } : DEFAULT_WEIGHTS; })();

export function App() {
  const [tab, setTab] = useState<'site' | 'compare' | 'learn'>(() => { const t = new URLSearchParams(location.search).get('tab'); return t === 'compare' || t === 'learn' ? t : 'site'; });
  const [site, setSite] = useState<Site>(INIT_SITE);
  const [latS, setLatS] = useState(String(INIT_SITE.lat)), [lonS, setLonS] = useState(String(INIT_SITE.lon));
  const [mast, setMast] = useState(INIT_MAST);
  const [start, setStart] = useState(INIT_START), [cursor, setCursor] = useState(INIT_START);
  const [days, setDays] = useState(INIT_DAYS);
  const [useHz, setUseHz] = useState(true);
  const [rule, setRule] = useState<Rule>(INIT_RULE);
  const [relay, setRelay] = useState(() => Q0().get('relay') === '1');
  const [weights, setWeights] = useState<Weights>(INIT_W);
  const [play, setPlay] = useState(false), [speed, setSpeed] = useState(SPEEDS[2][1]);
  const [upload, setUpload] = useState<Terrain | null>(null);
  const [up, setUp] = useState({ min: '-2000', max: '2000', width: '20', msg: '' });
  const fileRef = useRef<HTMLInputElement>(null);
  // Which tab is open: each tab shows only its own sections, on desktop and on phone.
  type Pane = 'site' | 'verdict' | 'horizon' | 'timeline';
  const [pane, setPane] = useState<Pane>(() => { const q = new URLSearchParams(location.search).get('pane'); return (q === 'verdict' || q === 'horizon' || q === 'timeline' ? q : 'site') as Pane; });
  const go = (p: Pane | 'compare' | 'learn') => {
    if (p === 'compare' || p === 'learn') { setTab(p); window.scrollTo({ top: 0 }); return; }
    setTab('site'); setPane(p); window.scrollTo({ top: 0 });
  };

  const proc = useMemo(() => proceduralTerrain(site.lat, site.lon), [site]);
  const [lola, setLola] = useState<{ terrain: Terrain | null; status: 'loading' | 'ok' | 'error' | 'outside'; msg: string }>({ terrain: null, status: 'loading', msg: '' });
  useEffect(() => {
    let live = true; setLola({ terrain: null, status: 'loading', msg: '' });
    loadLolaTerrain(site).then((t) => live && setLola({ terrain: t, status: 'ok', msg: '' }))
      .catch((e) => live && setLola({ terrain: null, status: 'error', msg: String(e?.message ?? e) }));
    return () => { live = false; };
  }, [site]);
  const terrain = upload ?? (lola.status === 'ok' && lola.terrain ? lola.terrain : proc);
  const horizon = useMemo(() => computeHorizon(terrain, mast), [terrain, mast]);

  // Ephemeris: show the series model instantly, then upgrade to JPL Horizons when it answers.
  const [eph, setEph] = useState<{ samples: Sample[]; source: Source | 'loading' }>(() => ({ samples: seriesEphemeris(INIT_SITE, INIT_START, INIT_DAYS), source: 'loading' }));
  useEffect(() => {
    let live = true;
    setEph({ samples: seriesEphemeris(site, start, days), source: useHz ? 'loading' : 'series' });
    if (useHz) getEphemeris(site, start, days, true).then((r) => { if (live) setEph(r); });
    return () => { live = false; };
  }, [site, start, days, useHz]);

  const { samples } = eph;
  const flags = useMemo(() => flagsFor(samples, horizon, rule, relay), [samples, horizon, rule, relay]);
  const verdict = useMemo(() => verdictFor(flags), [flags]);
  // the same window under the strictest and loosest disc rule, so every percentage comes with its bounds
  const lo = useMemo(() => verdictFor(flagsFor(samples, horizon, 'whole', relay)), [samples, horizon, relay]);
  const hi = useMemo(() => verdictFor(flagsFor(samples, horizon, 'any', relay)), [samples, horizon, relay]);
  const slope100 = useMemo(() => (terrain.kind === 'lola' ? slopeStats(terrain.layers[0], 100) : null), [terrain]);
  const score = useMemo(() => missionScore(verdict, days, slopeUnder10Of(terrain), weights), [verdict, days, terrain, weights]);

  // keep the address bar in step with the state, so the link is always shareable
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    q.set('lat', String(site.lat)); q.set('lon', String(site.lon)); q.set('start', toInput(start)); q.set('days', String(days)); q.set('mast', String(mast));
    if (rule !== 'any') q.set('rule', rule); else q.delete('rule');
    if (relay) q.set('relay', '1'); else q.delete('relay');
    const w = `${weights.sun},${weights.both},${weights.outage},${weights.slope}`;
    if (w !== '35,30,20,15') q.set('w', w); else q.delete('w');
    if (tab !== 'site') q.set('tab', tab); else q.delete('tab');
    if (tab === 'site' && pane !== 'site') q.set('pane', pane); else q.delete('pane');
    try { history.replaceState(null, '', `${location.pathname}?${q.toString()}`); } catch { /* ignore */ }
  }, [site, start, days, mast, rule, relay, weights, tab, pane]);
  const [ai, setAi] = useState<{ text: string; key: string } | null>(null);
  const [aiMsg, setAiMsg] = useState(''); const [aiBusy, setAiBusy] = useState(false);
  const briefKey = `${site.name}|${start}|${days}|${mast}|${rule}|${relay}|${upload ? 'u' : terrain.kind}`;
  const writeAi = async () => {
    setAiBusy(true); setAiMsg('');
    const r = await aiBrief(factsFrom(baseName(site.name), days, mast, relay, verdict, score.score, slope100?.under10 ?? null, maxSunEl(samples)));
    if ('text' in r) setAi({ text: r.text, key: briefKey });
    else setAiMsg(r.error === 'no-key' ? 'AI explanation is switched off: no API key on the server. Start the app with ANTHROPIC_API_KEY set to enable it. Showing the rule-based brief.' : `AI explanation unavailable (${r.error}). Showing the rule-based brief.`);
    setAiBusy(false);
  };
  const band = (a: number, b: number) => (Math.round(a) === Math.round(b) ? `${Math.round(a)}%` : `${Math.round(a)}–${Math.round(b)}%`);
  const now = useMemo(() => nowAt(samples, cursor, horizon, rule), [samples, cursor, horizon, rule]);
  const idx = Math.min(Math.max(Math.round((cursor - samples[0].t) / (STEP_H * 3600e3)), 0), samples.length - 1);

  // playback
  useEffect(() => {
    if (!play) return;
    let raf = 0, last = performance.now();
    const end = samples[samples.length - 1].t;
    const tick = (n: number) => {
      const dt = n - last; last = n;
      setCursor((c) => { const x = c + (dt / 1000) * speed; return x > end ? start : x; });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [play, speed, start, samples]);

  const choose = (s: Site) => { setSite(s); setLatS(String(s.lat)); setLonS(String(s.lon)); setUpload(null); };
  const applyCoords = (la: string, lo: string) => {
    setLatS(la); setLonS(lo);
    const lat = parseFloat(la), lon = parseFloat(lo);
    if (Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -360 && lon <= 360)
      { setSite({ name: `Custom (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`, lat: Math.max(lat, -89.99), lon }); setUpload(null); }
  };
  const setTime = (v: string) => { const t = fromInput(v); if (!Number.isNaN(t)) { setStart(t); setCursor(t); } };

  const applyUpload = async () => {
    const f = fileRef.current?.files?.[0]; if (!f) return setUp({ ...up, msg: 'Choose an image first.' });
    try { setUpload(await terrainFromImage(f, +up.min, +up.max, +up.width)); setUp({ ...up, msg: 'Applied.' }); }
    catch { setUp({ ...up, msg: 'Could not read that image.' }); }
  };

  const countdown = (flag: Uint8Array, name: string, up_: string, down: string) => {
    const dt = timeToChange(flag, idx);
    if (flag[idx]) return dt === null ? `${name} stays ${up_} for the rest of the window` : `${down} in ${fmtDur(dt)}`;
    return dt === null ? `No ${name.toLowerCase()} for the rest of the window` : `Back in ${fmtDur(dt)}`;
  };

  const rows: { key: string; name: string; dot: string; el: number; az: number; hor: number; vis: boolean; flag: Uint8Array; up: string; down: string }[] = [
    { key: 'sun', name: 'Sun', dot: 'var(--sun)', el: now.s.sunEl, az: now.s.sunAz, hor: now.sunHor, vis: now.sunVis, flag: flags.sun, up: 'in view', down: 'Sunset' },
    { key: 'earth', name: 'Earth', dot: 'var(--earth)', el: now.s.earthEl, az: now.s.earthAz, hor: now.earthHor, vis: relay || now.earthVis, flag: flags.earth, up: 'in view', down: 'Earthset' },
  ];
  const srcLabel = eph.source === 'horizons' ? 'JPL Horizons (live)' : eph.source === 'loading' ? 'Asking JPL Horizons… (series model meanwhile)' : 'Series model (Horizons off or unreachable)';

  const baseName = (n: string) => n.split(' (')[0];
  const tagOf = (n: string) => { const t = n.includes(' (') ? n.slice(n.indexOf('(') + 1, n.lastIndexOf(')')) : ''; return t === 'LOLA-refined' ? '' : t; };
  const NAV: { id: Pane | 'compare' | 'learn'; label: string; Icon: (p: { size?: number }) => JSX.Element }[] = [
    { id: 'site', label: 'Site', Icon: IconPin }, { id: 'verdict', label: 'Verdict', Icon: IconCheck },
    { id: 'horizon', label: 'Horizon', Icon: IconMountain }, { id: 'timeline', label: 'Timeline', Icon: IconBars },
    { id: 'compare', label: 'Compare', Icon: IconCompare }, { id: 'learn', label: 'Learn', Icon: IconLearn },
  ];
  const active = tab !== 'site' ? tab : pane;
  const terrainBadge = upload ? ['UPLOADED', 'warn'] : terrain.kind === 'lola' ? [`LOLA ${Math.round(terrain.layers[0].widthM / (terrain.layers[0].n - 1))} m`, 'ok'] : lola.status === 'loading' ? ['LOADING', 'warn'] : ['PROTOTYPE', 'bad'];

  return (
    <div className="app" data-pane={pane}>
      <header className="top">
        <div className="brand"><Logo /><span>Lunar Navigator</span></div>
        <nav className="pills" aria-label="Sections">
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} className={active === id ? 'pill on' : 'pill'} onClick={() => go(id)}><Icon size={16} />{label}</button>
          ))}
        </nav>
        <span className="avatar" title="Team GIT_HAPPENS">G</span>
      </header>

      <main>
      {tab === 'learn' ? (
        <Learn site={site} samples={samples} days={days} />
      ) : tab === 'compare' ? (
        <Compare start={start} days={days} mast={mast} useHorizons={useHz} rule={rule} current={site} relay={relay} weights={weights} />
      ) : (
        <div className="cols">
          {/* ---------------- left column: site ---------------- */}
          <div className="col">
            <section id="b-hero" className={'blk' + (['site','verdict'].includes(pane) ? '' : ' off')} data-pane="site" style={{ '--o': 1 } as CSSProperties}>
              <div className="title">{baseName(site.name)} · {days} days</div>
              <div className="hero">
                <span>Sun above the horizon</span>
                <b>{verdict.sunPct.toFixed(0)}%</b>
                <span>{relay ? 'Relay assumed' : `Earth in view ${verdict.earthPct.toFixed(0)}%`} · both {verdict.bothPct.toFixed(0)}% · score {score.score.toFixed(0)}/100</span>
              </div>
              {terrain.kind === 'procedural' && !upload && lola.status !== 'loading' && (
                <div className="warnbox" role="alert"><IconWarning /><span><b>Stand-in terrain.</b> The NASA terrain read failed (network or server), so the skyline is a placeholder. Sun and Earth angles are still real (JPL Horizons) but the percentages are not reliable until the real terrain loads. Re-select the site to retry.</span></div>
              )}
            </section>

            <section className={'blk' + (['site'].includes(pane) ? '' : ' off')} data-pane="site" style={{ '--o': 3 } as CSSProperties}>
              <div className="label">Site</div>
              <div className="sites">
                {PRESETS.map((p) => (
                  <button key={p.name} className={site.name === p.name ? 'site on' : 'site'} onClick={() => choose(p)}>
                    <span className="ico"><IconPin /></span>
                    <span className="meta"><b>{baseName(p.name)}</b><small>lat {p.lat.toFixed(1)}° · lon {p.lon.toFixed(1)}°{tagOf(p.name) ? ` · ${tagOf(p.name)}` : ''}</small></span>
                    <span className="sel">{site.name === p.name ? 'Selected' : 'Select'}</span>
                  </button>
                ))}
              </div>
              <div className="card">
                <div className="card-h"><span className="ico"><IconPin /></span><b>Custom coordinates</b></div>
                <div className="row">
                  <label className="inl">Lat °<input value={latS} onChange={(e) => applyCoords(e.target.value, lonS)} /></label>
                  <label className="inl">Lon °E<input value={lonS} onChange={(e) => applyCoords(latS, e.target.value)} /></label>
                </div>
                <small className="muted">Any lunar site uses real NASA LOLA terrain (20 m at 81–90°S, 118 m elsewhere), read live: about a minute the first time.</small>
              </div>
              <div className="card">
                <div className="card-h"><span className="ico"><IconMountain /></span><b>Antenna height</b></div>
                <label className="inl"><input type="number" min={0} max={50} value={mast} onChange={(e) => setMast(Math.max(0, +e.target.value || 0))} /> m above the surface</label>
              </div>
              <div className="card">
                <div className="card-h"><span className="ico"><IconPin /></span><b>Past and planned landings</b></div>
                <select value="" onChange={(e) => { const m = MISSIONS[+e.target.value]; if (m) choose(m); }} aria-label="Choose a mission landing site">
                  <option value="">Choose a landing site…</option>
                  {MISSIONS.map((m, i) => <option key={m.name} value={i}>{m.name} · {m.year}{m.lat <= -81 ? ' · real LOLA 20 m' : ' · real LOLA 118 m'}</option>)}
                </select>
                <small className="muted">Apollo, CLPS, Chang’e and Chandrayaan sites. Terrain is real NASA LOLA everywhere: 20 m at 81–90°S, 118 m elsewhere (baked for these sites, so they open instantly). Coordinates from NASA NSSDC and mission reports.</small>
              </div>
            </section>

            <section className={'blk' + (['horizon'].includes(pane) ? '' : ' off')} data-pane="horizon" style={{ '--o': 2 } as CSSProperties}>
              <div className="card">
                <div className="card-h"><span className="ico"><IconMountain /></span><b>Terrain data</b><span className={`badge ${terrainBadge[1]}`}>{terrainBadge[0]}</span></div>
                <small className="muted">{upload ? upload.label : lola.status === 'loading' ? 'Reading NASA LOLA terrain…' : terrain.label}{!upload && lola.msg ? ` ${lola.msg} Showing the stand-in.` : ''}</small>
                <details open={(new URLSearchParams(location.search).get('open') ?? '').includes('heightmap')}>
                  <summary>Use my own heightmap</summary>
                  <p className="muted tiny">Load a grayscale heightmap exported from NASA Moon Trek or a LOLA model, set its real elevation range and width. The site is the image centre.</p>
                  <input ref={fileRef} type="file" accept="image/*" />
                  <div className="row">
                    <label className="inl">Min m<input value={up.min} onChange={(e) => setUp({ ...up, min: e.target.value })} /></label>
                    <label className="inl">Max m<input value={up.max} onChange={(e) => setUp({ ...up, max: e.target.value })} /></label>
                    <label className="inl">Width km<input value={up.width} onChange={(e) => setUp({ ...up, width: e.target.value })} /></label>
                  </div>
                  <div className="row"><button onClick={applyUpload}>Apply</button>{upload && <button onClick={() => setUpload(null)}>Reset</button>}<span className="muted tiny">{up.msg}</span></div>
                </details>
              </div>
              <TrekCheck site={site} terrain={terrain} />
              <SlopeCard terrain={terrain} />
              <div className="card links">
                <div className="label">Explore further</div>
                <a href="https://quickmap.lroc.im-ldi.com" target="_blank" rel="noreferrer">LROC QuickMap</a>
                <a href="https://trek.nasa.gov/moon/" target="_blank" rel="noreferrer">NASA Moon Trek</a>
                <a href="https://ssd.jpl.nasa.gov/horizons/" target="_blank" rel="noreferrer">JPL Horizons</a>
                <a href="https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/" target="_blank" rel="noreferrer">CSA Moon Exploration</a>
              </div>
            </section>
          </div>

          {/* ---------------- centre column: 3D, time, right now ---------------- */}
          <div className="col">
            {['site','horizon'].includes(pane) && <section className="blk" data-pane="site" style={{ '--o': 2 } as CSSProperties}>
              <div className="label">3D terrain view</div>
              {Q0().get('no3d') === '1' ? <div className="card" style={{ height: 300 }}><small className="muted">3D view hidden (?no3d=1)</small></div> : <Scene3D terrain={terrain} mastM={mast} now={now.s} samples={samples} />}
            </section>}

            <section className={'blk' + (['site','timeline'].includes(pane) ? '' : ' off')} data-pane="site" style={{ '--o': 4 } as CSSProperties}>
              <div className="card">
                <div className="label">Time (UTC)</div>
                <input type="datetime-local" aria-label="Time (UTC)" value={toInput(cursor)} onChange={(e) => setTime(e.target.value)} />
                <div className="row">
                  <button className="primary" onClick={() => setPlay(!play)}>{play ? 'Pause' : 'Play'}</button>
                  <label className="inl">Speed <select value={speed} onChange={(e) => setSpeed(+e.target.value)}>{SPEEDS.map(([l, v]) => <option key={l} value={v}>{l}</option>)}</select></label>
                </div>
                <small className="muted">Window starts {toInput(start).replace('T', ' ')} UTC. Typing a time here restarts the window.</small>
              </div>
            </section>

            {['site'].includes(pane) && <section className="blk" data-pane="horizon" style={{ '--o': 3 } as CSSProperties}>
              <div className="label">South-pole map</div>
              <div className="card"><PoleMap site={site} onPick={choose} /></div>
            </section>}

            <section className={'blk' + (['verdict','timeline'].includes(pane) ? '' : ' off')} data-pane="verdict" style={{ '--o': 2 } as CSSProperties}>
              <div className="label">Right now at the site</div>
              {rows.map((r) => {
                const st = statusOf(r.el, r.vis);
                return (
                  <div key={r.key} className="now">
                    <span className="ico">{r.key === 'sun' ? <IconSun /> : <IconEarth />}</span>
                    <span className="meta"><b>{r.name}</b><small>el {r.el.toFixed(2)}° · az {r.az.toFixed(0)}° · horizon {r.hor.toFixed(2)}°</small><small>{countdown(r.flag, r.name, r.up, r.down)}</small></span>
                    <span className={`pill-s ${r.vis ? 'ok' : 'bad'}`}>{r.key === 'earth' && relay && !now.earthVis ? 'Via relay' : st === 'VISIBLE' ? 'Visible' : st === 'BEHIND TERRAIN' ? 'Behind terrain' : 'Below horizon'}</span>
                  </div>
                );
              })}
            </section>

            <section className={'blk' + (['verdict'].includes(pane) ? '' : ' off')} data-pane="verdict" style={{ '--o': 3 } as CSSProperties}>
              <PowerCard now={now.s} samples={samples} sunFlag={flags.sun} sunVisible={now.sunVis} days={days} />
              <DarkCard samples={samples} flags={flags} days={days} relay={relay} />
              <LongTermCard site={site} terrain={terrain} />
            </section>

            <section className={'blk' + (['verdict'].includes(pane) ? '' : ' off')} data-pane="verdict" style={{ '--o': 4 } as CSSProperties}>
              <div className="card">
                <div className="label">Plain-language brief</div>
                <p>{ai && ai.key === briefKey ? ai.text : brief(site.name, days, verdict, relay)}</p>
                <div className="row"><button onClick={writeAi} disabled={aiBusy}>{aiBusy ? 'Writing…' : ai && ai.key === briefKey ? 'Rewrite with AI' : 'Write with AI'}</button>{ai && ai.key === briefKey && <button onClick={() => setAi(null)}>Show rule-based</button>}</div>
                <small className="muted">{ai && ai.key === briefKey ? <><span className="badge ok">AI-WRITTEN</span> Every number was checked against the verdict, but the wording is the AI's: read it against the numbers shown. </> : 'Rule-based from the numbers on this page. '}Optional AI step: only the verdict numbers and the site name are sent to the AI provider you configured (Claude or Groq), through the local server; the verdict itself is always plain calculation.</small>
                {aiMsg && <small className="muted">{aiMsg}</small>}
              </div>
            </section>
          </div>

          {/* ---------------- right column: results ---------------- */}
          <div className="col">
            <section id="b-outage" className={'blk' + (['verdict'].includes(pane) ? '' : ' off')} data-pane="verdict" style={{ '--o': 1 } as CSSProperties}>
              <div className="outage">
                <span>Longest Sun outage · next {days} days</span>
                <b>{verdict.sunOutageD === 0 ? 'None' : fmtDur(verdict.sunOutageD)}</b>
                <span>Longest Earth outage {verdict.earthOutageD === 0 ? 'none' : fmtDur(verdict.earthOutageD)}</span>
              </div>
            </section>

            <section className={'blk' + (['verdict'].includes(pane) ? '' : ' off')} data-pane="verdict" style={{ '--o': 5 } as CSSProperties}>
              <ScoreCard score={score} w={weights} setW={setWeights} />
              <ShareCard relay={relay} setRelay={setRelay} />
            </section>

            <section className={'blk' + (['verdict'].includes(pane) ? '' : ' off')} data-pane="verdict" style={{ '--o': 6 } as CSSProperties}>
              <div className="card">
                <div className="label">Visibility rule and ephemeris</div>
                <label className="inl">Disc rule
                  <select value={rule} onChange={(e) => setRule(e.target.value as Rule)}>{RULES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
                <small className="muted">{RULES.find((r) => r.id === rule)!.note} Every percentage shows its range from whole disc to any part.</small>
                <p className="tiny"><span className={`badge ${eph.source === 'horizons' ? 'ok' : 'warn'}`}>{eph.source === 'horizons' ? 'LIVE' : eph.source === 'loading' ? 'LOADING' : 'FALLBACK'}</span> {srcLabel}</p>
                <label className="inl"><input type="checkbox" checked={useHz} onChange={(e) => setUseHz(e.target.checked)} /> Use JPL Horizons</label>
              </div>
            </section>

            <section id="b-horizon" className={'blk' + (['horizon'].includes(pane) ? '' : ' off')} data-pane="horizon" style={{ '--o': 1 } as CSSProperties}>
              <div className="label">Horizon and sky paths</div>
              <div className="card flush">
                <HorizonChart horizon={horizon} samples={samples} now={now.s} rule={rule} />
                <div className="chips"><span className="chipk"><i style={{ background: 'var(--sun)' }} />Sun path</span><span className="chipk"><i style={{ background: 'var(--earth)' }} />Earth path</span></div>
                <div className="note"><IconInfo /><span>Anything below the outline is blocked by terrain. Planning aid, not landing clearance.</span></div>
              </div>
            </section>

            <section id="b-timeline" className={'blk' + (['timeline'].includes(pane) ? '' : ' off')} data-pane="timeline" style={{ '--o': 1 } as CSSProperties}>
              <div className="label">Visibility timeline</div>
              <div className="card">
                <label className="inl">Window <select value={days} onChange={(e) => setDays(+e.target.value)}>{[15, 30, 60].map((d) => <option key={d} value={d}>{d} days</option>)}</select></label>
                <div className="stats">
                  <div><span>Sun above horizon</span><b style={{ color: 'var(--sun)' }}>{verdict.sunPct.toFixed(0)}%</b><small>whole disc to any part: {band(lo.sunPct, hi.sunPct)}</small></div>
                  <div><span>Longest Sun outage</span><b className="mono">{fmtDur(verdict.sunOutageD)}</b></div>
                  <div><span>Earth in view</span><b style={{ color: 'var(--earth)' }}>{verdict.earthPct.toFixed(0)}%</b><small>whole disc to any part: {band(lo.earthPct, hi.earthPct)}</small></div>
                  <div><span>Longest Earth outage</span><b className="mono">{fmtDur(verdict.earthOutageD)}</b></div>
                  <div className="wide"><span>Sun and Earth together</span><b style={{ color: 'var(--both)' }}>{verdict.bothPct.toFixed(0)}%</b><small>whole disc to any part: {band(lo.bothPct, hi.bothPct)}</small></div>
                </div>
                <Timeline samples={samples} flags={flags} cursor={cursor} onPick={(t) => { setPlay(false); setCursor(t); }} />
                <small className="muted">Hour by hour from the time you set. Click the bars to jump to a moment.</small>
              </div>
            </section>
          </div>
        </div>
      )}

      </main>
      <Report siteName={site.name} lat={site.lat} lon={site.lon} start={start} days={days} mast={mast} ruleLabel={RULES.find((r) => r.id === rule)!.label} relay={relay}
        source={srcLabel} terrainLabel={terrain.label} verdict={verdict} lo={lo} hi={hi} score={score} slope={slope100} horizon={horizon} samples={samples} now={now.s} rule={rule}
        brief={brief(site.name, days, verdict, relay)} />

      <nav className="tabbar" aria-label="Sections">
        {NAV.map(({ id, label, Icon }) => (
          <button key={id} className={active === id ? 'on' : ''} onClick={() => go(id)}><Icon size={22} /><span>{label}</span></button>
        ))}
      </nav>
    </div>
  );
}
