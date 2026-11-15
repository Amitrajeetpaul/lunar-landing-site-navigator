// Vercel Edge Function behind POST /ai/explain (see vercel.json). Same code as the local dev proxy (src/lib/aiServer.ts).
// Protections: same-site requests only, strict schema validation (an allow-list of numeric fields and a plain-text site name), small request
// size and a small output cap, per-visitor and whole-site daily limits, and the API key only in the server environment.
// The limits are kept in memory, so they are approximate: a serverless platform runs several instances that do not share memory.
// For a hard guarantee, set a spend cap or use a free-tier key with no payment method on the provider side.
export const config = { runtime: 'edge' };
import { aiConfigured, generateBrief, validateFacts, type AiEnv } from '../src/lib/aiServer';

const DAY = 86_400_000;
const perIp = new Map<string, { d: number; n: number }>();
let all = { d: 0, n: 0 };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const ipOf = (req: Request) => (req.headers.get('x-vercel-forwarded-for') || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown').split(',')[0].trim();

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });
  const origin = req.headers.get('origin');
  let sameSite = false; try { sameSite = !!origin && new URL(origin).host === new URL(req.url).host; } catch { /* invalid origin */ }
  if (!sameSite) return json(403, { error: 'same-site requests only' });

  const env = process.env as unknown as AiEnv;
  if (!aiConfigured(env)) return json(501, { error: 'No ANTHROPIC_API_KEY or GROQ_API_KEY set on the server.' });

  const text = await req.text();
  if (text.length > 4000) return json(413, { error: 'too large' });
  let facts; try { facts = validateFacts(JSON.parse(text)); } catch { facts = null; }
  if (!facts) return json(400, { error: 'invalid facts' });

  // limits are read per request so they can be changed with environment variables without a code change
  const limitIp = Number(process.env.AI_LIMIT_PER_IP ?? 10), limitAll = Number(process.env.AI_LIMIT_PER_DAY ?? 300), day = Math.floor(Date.now() / DAY);
  if (all.d !== day) all = { d: day, n: 0 };
  if (all.n >= limitAll) return json(429, { error: 'Daily AI limit for this site reached. The rule-based brief is still available.' });
  const ip = ipOf(req); let e = perIp.get(ip);
  if (!e || e.d !== day) { e = { d: day, n: 0 }; perIp.set(ip, e); if (perIp.size > 5000) for (const [k, v] of perIp) if (v.d !== day) perIp.delete(k); }
  if (e.n >= limitIp) return json(429, { error: `Daily AI limit reached (${limitIp} per visitor). The rule-based brief is still available.` });
  all.n++; e.n++; // counted before the call, so a failing provider cannot be hammered either

  const out = await generateBrief(env, facts);
  return json(out.status, out.body);
}
