import { useEffect, useState } from 'react';
import { analyze, fmtDur, fromInput, toInput, type Analysis } from '../lib/analysis';
import { MISSIONS, PRESETS, type Site } from '../lib/sites';
import type { Rule } from '../lib/visibility';
import { WindowFinder } from './WindowFinder';
import { moonDistanceKm } from '../lib/dark';
import { missionScore, type Weights } from '../lib/score';

interface Scn { id: number; site: Site; start: number }
let nextId = 1;
const DAY = 86400000;

function Strip({ a }: { a: Analysis }) {
  const rows: [Uint8Array, string][] = [[a.flags.sun, '#f4b73f'], [a.flags.earth, '#58a6ff'], [a.flags.both, '#7dd89b']];
  const n = a.flags.sun.length;
  return (
    <svg viewBox="0 0 300 40" className="strip">
      {rows.map(([f, c], r) => {
        const out: JSX.Element[] = []; let s = -1;
        f.forEach((v, i) => { if (v && s < 0) s = i; if ((!v || i === n - 1) && s >= 0) { const e = v ? i + 1 : i; out.push(<rect key={`${r}-${s}`} x={(s / n) * 300} y={r * 14} width={Math.max(((e - s) / n) * 300, 1.5)} height={11} fill={c} />); s = -1; } });
        return <g key={r}><rect x={0} y={r * 14} width={300} height={11} className="track" />{out}</g>;
      })}
    </svg>
  );
}

export function Compare({ start, days, mast, useHorizons, rule, current, relay, weights }: { start: number; days: number; mast: number; useHorizons: boolean; rule: Rule; current: Site; relay: boolean; weights: Weights }) {
  const [scns, setScns] = useState<Scn[]>(() => PRESETS.slice(0, 3).map((s) => ({ id: nextId++, site: s, start })));
  const [res, setRes] = useState<Record<number, Analysis>>({});
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState(0);

  useEffect(() => {
    let live = true; setBusy(true);
    Promise.all(scns.map((s) => analyze(s.site, s.start, days, mast, useHorizons, rule, undefined, relay).then((a) => [s.id, a] as const)))
      .then((r) => { if (live) { setRes(Object.fromEntries(r)); setBusy(false); } });
    return () => { live = false; };
  }, [scns, days, mast, useHorizons, rule, relay]);

  const done = scns.filter((s) => res[s.id]);
  const sc = (id: number) => missionScore(res[id].verdict, days, res[id].slopeUnder10, weights).score;
  const rank = [...done].sort((a, b) => sc(b.id) - sc(a.id));
  const best = rank[0]?.id;

  return (
    <div className="cmp">
      <WindowFinder site={current} from={start} days={days} mast={mast} useHorizons={useHorizons} rule={rule} relay={relay} onUse={(t) => setScns((q) => [...q, { id: nextId++, site: current, start: t }])} />
      <div className="panel">
        <h3>Scenario comparison</h3>
        <p className="muted">Each card is one site and start date, scored over the same {days}-day window. Best = highest mission score (Sun, Sun + Earth, short outages, gentle ground; weights set on the Verdict screen).{relay ? ' A relay is assumed for Earth contact.' : ''} Each site uses real NASA LOLA terrain where it loads (cards say which).</p>
        <div className="row">
          <button onClick={() => setScns(PRESETS.map((s) => ({ id: nextId++, site: s, start })))}>All presets, same date</button>
          <button onClick={() => setScns([...PRESETS, ...MISSIONS].map((s) => ({ id: nextId++, site: s, start })))}>All {PRESETS.length + MISSIONS.length} sites, same date</button>
          <button onClick={() => setScns([0, 15, 30, 45].map((d) => ({ id: nextId++, site: current, start: start + d * DAY })))}>Current site, 4 start dates</button>
          <span className="spacer" />
          <select aria-label="Preset site to add" value={pick} onChange={(e) => setPick(+e.target.value)}>{PRESETS.map((s, i) => <option key={s.name} value={i}>{s.name}</option>)}</select>
          <button onClick={() => setScns([...scns, { id: nextId++, site: PRESETS[pick], start }])}>Add</button>
          <button onClick={() => setScns([...scns, { id: nextId++, site: current, start }])}>Add current site</button>
        </div>
        {busy && <p className="muted">Fetching ephemeris and LOLA terrain…</p>}
        {!busy && done.length >= 3 && (
          <p className="muted">Best at this date, by mission score: {rank.slice(0, 5).map((q, i) => `${i + 1}. ${q.site.name} (${sc(q.id).toFixed(0)})`).join(' · ')}. Scores use Sun, Earth, outages and slope only: a planning aid, not landing clearance.</p>
        )}
        {!busy && done.length > 0 && (() => {
          const safe = done.filter((q) => res[q.id].verdict.sunOutageD === 0);
          return (
            <p className="muted">
              {safe.length
                ? <>Cards with no Sun outage over these {days} days: {safe.map((q) => `${q.site.name} (${moonDistanceKm(current, q.site) < 1 ? 'the selected site' : `${Math.round(moonDistanceKm(current, q.site))} km from the selected site`})`).join('; ')}.</>
                : <>None of these cards keeps the Sun for the whole {days}-day window. Try another start date, or press “All presets, same date” to look for a lit alternative.</>}
            </p>
          );
        })()}

      </div>
      <div className="cards">
        {scns.map((s) => {
          const a = res[s.id];
          return (
            <div key={s.id} className={`panel card ${best === s.id ? 'best' : ''}`}>
              <div className="row"><b>{s.site.name}</b>{best === s.id && <span className="badge ok">BEST</span>}{a && a.verdict.sunOutageD === 0 && <span className="badge ok" title="The Sun stays above the terrain for the whole window">NO SUN OUTAGE</span>}{a && <span className="badge" title="Mission score">{sc(s.id).toFixed(0)}/100</span>}<span className="spacer" />
                <button className="x" onClick={() => setScns(scns.filter((q) => q.id !== s.id))} aria-label="Remove">×</button></div>
              <div className="muted mono">lat {s.site.lat} · lon {s.site.lon}</div>
              <input type="datetime-local" aria-label={`Start date for ${s.site.name}`} value={toInput(s.start)} onChange={(e) => { const v = fromInput(e.target.value); if (!Number.isNaN(v)) setScns(scns.map((q) => q.id === s.id ? { ...q, start: v } : q)); }} />
              {a ? (
                <>
                  <Bar label="Sun" v={a.verdict.sunPct} c="var(--sun)" />
                  <Bar label="Earth" v={a.verdict.earthPct} c="var(--earth)" />
                  <Bar label="Both" v={a.verdict.bothPct} c="var(--both)" />
                  <Strip a={a} />
                  <div className="kv"><span>Longest Sun outage</span><b>{fmtDur(a.verdict.sunOutageD)}</b></div>
                  <div className="kv"><span>Longest Earth outage</span><b>{fmtDur(a.verdict.earthOutageD)}</b></div>
                  <div className="kv"><span>Longest outage of both</span><b>{fmtDur(a.verdict.bothOutageD)}</b></div>
                  <div className="muted tiny">{a.source === 'horizons' ? 'JPL Horizons' : 'Series model (fallback)'} · {a.terrain === 'lola' ? 'LOLA terrain' : 'prototype terrain'}</div>
                </>
              ) : <p className="muted">Calculating…</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Bar({ label, v, c }: { label: string; v: number; c: string }) {
  return <div className="bar"><span>{label}</span><div className="track"><div style={{ width: `${v}%`, background: c }} /></div><b>{v.toFixed(0)}%</b></div>;
}
