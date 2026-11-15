// npm run test:ai   (no network, no API key)
// Tests the optional AI brief end to end against a MOCK /ai/explain: the number guard (numbersOk) and every response shape the client
// must survive (good reply, invented numbers, 429, 501/404 = no key, malformed JSON, empty text, network failure).
import { aiBrief, numbersOk, type Facts } from '../src/lib/aiBrief';

const f: Facts = { site: 'Apollo 11', window_days: 30, antenna_m: 2, relay_assumed: false, sun_pct: 49, earth_pct: 100, both_pct: 49, longest_sun_outage_days: 14.9, longest_earth_outage_days: 0, longest_both_outage_days: 14.9, mission_score: 48, slope_under_10deg_pct: 100, max_sun_elevation_deg: 62.5, sun_label: 'moderate', earth_label: 'strong' };
let pass = 0, fail = 0;
const ok = (name: string, cond: boolean) => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`); };

// ---- number guard
ok('faithful text accepted', numbersOk('Apollo 11 has the Sun up 49% of the time and Earth 100%, with a longest dark spell of 14.9 days. Score 48. Planning aid only.', f).ok);
ok('site name digits are not figures (Apollo 11)', numbersOk('Apollo 11 is a near-side site.', f).ok);
ok('invented percentage rejected', !numbersOk('The Sun is up 52% of the time.', f).ok);
ok('invented duration rejected', !numbersOk('The longest gap is 20 days.', f).ok);
ok('trailing zero accepted (2.0 for 2)', numbersOk('With a 2.0 m antenna the Sun is up 49%.', f).ok);
ok('faithful rounding accepted (15 for 14.9)', numbersOk('The longest dark spell is about 15 days.', f).ok);
ok('unrelated near-miss rejected (16 for 14.9)', !numbersOk('The longest dark spell is 16 days.', f).ok);
ok('thousands separators are rejected, not mis-read (1,200)', !numbersOk('About 1,200 hours.', f).ok);
ok('unicode minus does not hide a number (−5)', !numbersOk('The Sun is −5 degrees below.', f).ok);
ok('hours form of a sub-day figure accepted', numbersOk('Dark for 6 hours.', { ...f, longest_sun_outage_days: 0.25 }).ok);

ok('threshold from a fact key is allowed (under 10°)', numbersOk('Slope is under 10° across 100% of the ground.', f).ok);
ok('threshold NOT in a key is still rejected (under 7°)', !numbersOk('Slope is under 7° across 100% of the ground.', f).ok);
ok('non-breaking space in a site name (Apollo\u00A011)', numbersOk('During the window at Apollo\u00A011 the Sun is up 49%.', f).ok);
ok('typographic hyphen and apostrophe in a site name', numbersOk('Chang\u2019e\u20114 is on the far side.', { ...f, site: "Chang'e-4" }).ok);

// ---- mock server
type Mode = 'good' | 'invented' | '429' | '501' | '404' | 'malformed' | 'empty' | 'network';
let mode: Mode = 'good';
globalThis.fetch = (async (_u: any) => {
  if (mode === 'network') throw new TypeError('fetch failed');
  const j = (status: number, body: string) => new Response(body, { status, headers: { 'content-type': 'application/json' } });
  if (mode === '429') return j(429, JSON.stringify({ error: 'rate limited' }));
  if (mode === '501') return j(501, JSON.stringify({ error: 'No ANTHROPIC_API_KEY set on the server.' }));
  if (mode === '404') return j(404, 'not found');
  if (mode === 'malformed') return j(200, '{not json');
  if (mode === 'empty') return j(200, JSON.stringify({ text: '   ' }));
  if (mode === 'invented') return j(200, JSON.stringify({ text: 'Earth is visible 73% of the time.' }));
  return j(200, JSON.stringify({ text: 'Apollo 11 gets the Sun 49% of the time and Earth 100%. Planning aid only, not landing clearance.' }));
}) as typeof fetch;
for (const [m, expect] of [['good', 'text'], ['invented', 'rejected'], ['429', 'error'], ['501', 'no-key'], ['404', 'no-key'], ['malformed', 'error'], ['empty', 'empty'], ['network', 'fetch']] as [Mode, string][]) {
  mode = m; const r = await aiBrief(f);
  const good = m === 'good' ? 'text' in r : 'error' in r && (r.error.includes(expect) || expect === 'error');
  ok(`mock ${m.padEnd(9)} -> ${'text' in r ? 'accepted text' : 'error: ' + r.error.slice(0, 60)}`, good);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
