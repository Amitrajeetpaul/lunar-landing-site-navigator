// Server-only AI helper, shared by the Vite dev/preview middleware and the Vercel Edge Function (api/explain.ts), so both run the same code.
// Keys come from the SERVER environment only (ANTHROPIC_API_KEY or GROQ_API_KEY) and are never sent to the browser or put in an error message.
import type { Facts } from './aiBrief';

export const SYSTEM = 'You write short plain-language briefs for lunar mission planners, teachers and students from a JSON object of facts about one landing site and date window. Field meanings: sun_pct = percent of time the Sun is above the local skyline; earth_pct = percent of time Earth is above it (direct line of sight); both_pct = percent of time both are available at once; longest_sun_outage_days / longest_earth_outage_days = the longest continuous stretch with no Sun / no Earth; longest_both_outage_days = the longest stretch in which the Sun or Earth or both are unavailable (so it is at least as long as either single outage); mission_score = a 0-100 comparison score; slope_under_10deg_pct = percent of nearby ground with slope under 10 degrees; max_sun_elevation_deg = highest the Sun gets above the horizon; antenna_m = antenna height; window_days = length of the window; relay_assumed = true means Earth contact is assumed to be available through a relay satellite, so earth_pct is 100 by assumption. Write exactly 3 sentences of plain prose. Rules: (1) Use ONLY numbers that appear in the JSON, written exactly as given; never invent, convert, round differently or compute new numbers. (2) Describe the Sun and Earth with the given sun_label and earth_label words (strong, moderate, weak) and never call a percentage most or the majority of the time. (3) Say what the numbers mean for solar power and for direct-to-Earth communication, and mention a long outage only if it is listed, saying it would need a battery or relay. Take care to attribute an outage to the right thing: if the Earth outage is 0, Earth is never the cause. (4) You may state the slope figure with its 10 degree threshold, but NEVER call a site flat, gentle, stable, safe, suitable or good for landing, and never mention rocks or hazards. (5) Never mention field names, underscores or the words JSON, label or relay_assumed; write naturally. (6) End with exactly: Planning aid only, not landing clearance. Output plain text only.';

const num = (v: unknown, lo: number, hi: number) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const LABELS = ['strong', 'moderate', 'weak'];

/** Strict allow-list validation of the request body. Returns a NEW object with only the known fields, or null. Stops oversized or injected input reaching the model. */
export function validateFacts(x: any): Facts | null {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
  const site = x.site;
  if (typeof site !== 'string' || site.length < 1 || site.length > 80 || !/^[\p{L}\p{N} .,'\u2019()\-\u2013\u00B0+]+$/u.test(site)) return null;
  if (!num(x.window_days, 1, 366) || !num(x.antenna_m, 0, 100) || typeof x.relay_assumed !== 'boolean') return null;
  for (const k of ['sun_pct', 'earth_pct', 'both_pct', 'mission_score']) if (!num(x[k], 0, 100)) return null;
  for (const k of ['longest_sun_outage_days', 'longest_earth_outage_days', 'longest_both_outage_days']) if (!num(x[k], 0, 7000)) return null;
  if (!(x.slope_under_10deg_pct === null || num(x.slope_under_10deg_pct, 0, 100)) || !num(x.max_sun_elevation_deg, -90, 90)) return null;
  if (!LABELS.includes(x.sun_label) || !LABELS.includes(x.earth_label)) return null;
  return { site, window_days: x.window_days, antenna_m: x.antenna_m, relay_assumed: x.relay_assumed, sun_pct: x.sun_pct, earth_pct: x.earth_pct, both_pct: x.both_pct,
    longest_sun_outage_days: x.longest_sun_outage_days, longest_earth_outage_days: x.longest_earth_outage_days, longest_both_outage_days: x.longest_both_outage_days,
    mission_score: x.mission_score, slope_under_10deg_pct: x.slope_under_10deg_pct, max_sun_elevation_deg: x.max_sun_elevation_deg, sun_label: x.sun_label, earth_label: x.earth_label };
}

export interface AiEnv { ANTHROPIC_API_KEY?: string; GROQ_API_KEY?: string; AI_PROVIDER?: string; GROQ_MODEL?: string; ANTHROPIC_MODEL?: string }
export const aiConfigured = (env: AiEnv) => !!((env.AI_PROVIDER === 'groq' ? env.GROQ_API_KEY : env.AI_PROVIDER === 'anthropic' ? env.ANTHROPIC_API_KEY : env.ANTHROPIC_API_KEY || env.GROQ_API_KEY));

/** Calls the configured provider. Never throws and never includes the key in the result. */
export async function generateBrief(env: AiEnv, facts: Facts): Promise<{ status: number; body: { text?: string; error?: string } }> {
  const provider = env.AI_PROVIDER || (env.ANTHROPIC_API_KEY ? 'anthropic' : env.GROQ_API_KEY ? 'groq' : '');
  const key = provider === 'groq' ? env.GROQ_API_KEY : env.ANTHROPIC_API_KEY;
  if (!provider || !key) return { status: 501, body: { error: 'No ANTHROPIC_API_KEY or GROQ_API_KEY set on the server.' } };
  try {
    if (provider === 'groq') {
      const model = env.GROQ_MODEL || 'openai/gpt-oss-120b';
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', signal: AbortSignal.timeout(25000), headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, max_tokens: 800, temperature: 0.2, ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}), messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: JSON.stringify(facts) }] }),
      });
      if (!r.ok) return { status: 502, body: { error: `Groq API HTTP ${r.status}` } };
      const j: any = await r.json();
      return { status: 200, body: { text: String(j.choices?.[0]?.message?.content ?? '').trim() } };
    }
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: AbortSignal.timeout(25000), headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 400, system: SYSTEM, messages: [{ role: 'user', content: JSON.stringify(facts) }] }),
    });
    if (!r.ok) return { status: 502, body: { error: `Claude API HTTP ${r.status}` } };
    const j: any = await r.json();
    return { status: 200, body: { text: (j.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('').trim() } };
  } catch (e) { return { status: 500, body: { error: String((e as Error)?.name === 'TimeoutError' ? 'AI provider timed out' : 'AI provider request failed') } }; }
}
