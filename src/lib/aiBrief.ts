import type { Verdict } from './visibility';

/** The only facts the AI sees. Every number it may quote is in here. */
export interface Facts { site: string; window_days: number; antenna_m: number; relay_assumed: boolean; sun_pct: number; earth_pct: number; both_pct: number; longest_sun_outage_days: number; longest_earth_outage_days: number; longest_both_outage_days: number; mission_score: number; slope_under_10deg_pct: number | null; max_sun_elevation_deg: number }

export function factsFrom(site: string, days: number, mast: number, relay: boolean, v: Verdict, score: number, slope: number | null, maxEl: number): Facts {
  const r1 = (x: number) => Math.round(x * 10) / 10;
  return { site, window_days: days, antenna_m: mast, relay_assumed: relay, sun_pct: Math.round(v.sunPct), earth_pct: Math.round(v.earthPct), both_pct: Math.round(v.bothPct),
    longest_sun_outage_days: r1(v.sunOutageD), longest_earth_outage_days: r1(v.earthOutageD), longest_both_outage_days: r1(v.bothOutageD),
    mission_score: Math.round(score), slope_under_10deg_pct: slope === null ? null : Math.round(slope), max_sun_elevation_deg: r1(maxEl) };
}

/**
 * Rule check: the AI text is accepted only if every number in it is one of the facts (or the same value in hours when it is a
 * day figure under 1 day). Anything else is rejected and the rule-based brief stays.
 */
export function numbersOk(text: string, f: Facts): { ok: boolean; bad: string[] } {
  const allowed = new Set<number>();
  for (const v of Object.values(f)) if (typeof v === 'number') { allowed.add(v); allowed.add(Math.round(v)); allowed.add(Math.round(v * 10) / 10); }
  for (const d of [f.longest_sun_outage_days, f.longest_earth_outage_days, f.longest_both_outage_days]) if (d > 0 && d < 1) allowed.add(Math.round(d * 24));
  // site names can contain digits (Apollo 11, IM-2, Chandrayaan-3): they are labels, not figures
  const stripped = text.split(f.site).join(' ').replace(/\bClaude\b|\bCLPS\b/g, '');
  const bad: string[] = [];
  for (const m of stripped.matchAll(/-?\d+(?:\.\d+)?/g)) { const n = parseFloat(m[0]); if (!allowed.has(n) && !allowed.has(Math.abs(n))) bad.push(m[0]); }
  return { ok: bad.length === 0, bad };
}

export async function aiBrief(f: Facts): Promise<{ text: string } | { error: string }> {
  try {
    const r = await fetch('/ai/explain', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { error: r.status === 501 || r.status === 404 ? 'no-key' : String(j.error ?? `HTTP ${r.status}`) };
    const text = String(j.text ?? '').trim();
    if (!text) return { error: 'empty reply' };
    const chk = numbersOk(text, f);
    return chk.ok ? { text } : { error: `rejected: the reply contained numbers that are not in the verdict (${chk.bad.join(', ')})` };
  } catch (e) { return { error: String((e as Error).message ?? e) }; }
}
