import type { Sample } from '../lib/ephemeris';
import { output, PANELS, powerSummary } from '../lib/power';

/** Solar elevation front and centre, plus a relative panel-output estimate. */
export function PowerCard({ now, samples, sunFlag, sunVisible, days }: { now: Sample; samples: Sample[]; sunFlag: Uint8Array; sunVisible: boolean; days: number }) {
  const sum = powerSummary(samples, sunFlag);
  return (
    <div className="card">
      <div className="label">Solar elevation and power</div>
      <div className="scoreRow"><b className="bigScore" style={{ color: 'var(--sun)' }}>{now.sunEl.toFixed(2)}°</b><span className="muted">Sun elevation now ({sunVisible ? 'visible' : 'blocked or below the horizon'})</span></div>
      {PANELS.map((p) => {
        const s = sum.find((x) => x.id === p.id)!;
        return (
          <div key={p.id} className="kv stack">
            <span>{p.label} <small className="muted">· {p.note}</small></span>
            <b>now {(output(p.id, now.sunEl, sunVisible) * 100).toFixed(0)}% · {days}-day average {s.avgPct.toFixed(0)}% · {s.equivHours.toFixed(0)} full-power-equivalent hours</b>
          </div>
        );
      })}
      <small className="muted">Relative to a panel that always faces a visible Sun (100%). Zero whenever terrain blocks the Sun. No panel efficiency, dust or temperature effects, so these are relative, not watts. Low Sun angles are why upright or tracking panels are used at the pole.</small>
    </div>
  );
}
