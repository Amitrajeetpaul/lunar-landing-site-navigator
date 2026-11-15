import { useState } from 'react';
import { IconWarning } from './Icons';
import { fmtDur } from '../lib/analysis';
import { energyWh, longest, runs, type Run } from '../lib/dark';
import type { Sample } from '../lib/ephemeris';
import type { Flags } from '../lib/visibility';

const when = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ');
const MAX_ROWS = 6;

function RunList({ list, what }: { list: Run[]; what: string }) {
  if (!list.length) return <small className="muted">No {what} in this window.</small>;
  return (
    <>
      {list.slice(0, MAX_ROWS).map((r) => (
        <div key={r.start} className="kv"><span>{when(r.start)} to {when(r.end)} UTC{r.cutStart ? ' · already under way' : ''}{r.cutEnd ? ' · continues past window' : ''}</span><b>{r.cutStart || r.cutEnd ? 'at least ' : ''}{fmtDur(r.hours / 24)}</b></div>
      ))}
      {list.length > MAX_ROWS && <small className="muted">+ {list.length - MAX_ROWS} more.</small>}
    </>
  );
}

/** When exactly is it dark, and what would it take to ride it out? Answers "what if our visit falls in the dark?". */
export function DarkCard({ samples, flags, days, relay }: { samples: Sample[]; flags: Flags; days: number; relay: boolean }) {
  const [load, setLoad] = useState(50);
  const [stay, setStay] = useState(7);
  const sunDark = runs(samples, flags.sun, 0), sunLit = runs(samples, flags.sun, 1), earthGap = relay ? [] : runs(samples, flags.earth, 0);
  const worst = longest(sunDark), bestLit = longest(sunLit);
  const fits = bestLit ? stay * 24 <= bestLit.hours : false;
  const wh = worst ? energyWh(load, worst.hours) : 0;
  return (
    <div className="card">
      <div className="label">Dark periods and what to do about them</div>
      <div className="kv stack"><span>Sun below the skyline (power)</span></div>
      <RunList list={sunDark} what="Sun outage" />
      {bestLit && <div className="kv"><span>Longest continuous sunlit stretch{bestLit.cutStart || bestLit.cutEnd ? ' (touches the window edge)' : ''}</span><b>{bestLit.cutStart || bestLit.cutEnd ? 'at least ' : ''}{fmtDur(bestLit.hours / 24)}</b></div>}
      {sunLit.length === 0 && <div className="warnbox" role="alert"><IconWarning /><span>There is no sunlight at all in this window. Solar power cannot work here during it, so any visit needs stored power or another source. The 18.6-year card shows whether this is rare or the normal state for this spot.</span></div>}
      <label className="inl">Planned stay <input type="number" min={1} max={60} value={stay} onChange={(e) => setStay(Math.min(60, Math.max(1, Math.round(+e.target.value) || 1)))} /> days</label>
      {bestLit
        ? <div className="kv"><span>Does a {stay}-day stay fit in one sunlit stretch?</span><b>{fits ? 'Yes' : 'No'}{(bestLit.cutStart || bestLit.cutEnd) && !fits ? ' (the stretch touching the window edge may be longer)' : ''}</b></div>
        : <small className="muted">No sunlit stretch in this window.</small>}
      <div className="kv stack"><span>{relay ? 'Earth contact' : 'Earth out of sight (communication)'}</span></div>
      {relay ? <small className="muted">A relay is assumed, so there are no Earth gaps here.</small> : <RunList list={earthGap} what="Earth gap" />}
      <div className="kv stack"><span>Riding out the longest dark spell</span></div>
      {worst ? (
        <>
          <label className="inl">Load during the dark <input type="number" min={0} max={100000} value={load} onChange={(e) => setLoad(Math.max(0, +e.target.value || 0))} /> W</label>
          <div className="kv"><span>Energy to stay powered for {worst.cutStart || worst.cutEnd ? 'at least ' : ''}{fmtDur(worst.hours / 24)}</span><b>{worst.cutStart || worst.cutEnd ? 'at least ' : ''}{wh >= 10000 ? `${(wh / 1000).toFixed(1)} kWh` : `${wh.toFixed(0)} Wh`}</b></div>
        </>
      ) : <small className="muted">The Sun is never lost in these {days} days, so no stored energy is needed for Sun outages.</small>}
      <small className="muted">What to do if the visit falls in a dark period: move the start date (best start-date finder on Compare, which also lists dates with no Sun outage), choose a shorter stay that fits inside a lit stretch, pick another site, or carry stored power. The energy figure is plain arithmetic, load times hours: it ignores battery efficiency, usable capacity, ageing and any heating, and the app does not model temperature. A planning aid, not a power-system design.</small>
    </div>
  );
}
