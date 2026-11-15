import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

// Optional AI-written brief. The browser posts only the verdict numbers to /ai/explain; this middleware adds the API key from the
// SERVER environment (ANTHROPIC_API_KEY, or GROQ_API_KEY for Groq) and calls that provider, so the key never reaches the browser. No key = HTTP 501 and the
// app keeps its rule-based brief. Run: ANTHROPIC_API_KEY=... npm run dev
const SYSTEM = 'You write short plain-language briefs for lunar mission planners, teachers and students from a JSON object of facts about one landing site and date window. Field meanings: sun_pct = percent of time the Sun is above the local skyline; earth_pct = percent of time Earth is above it (direct line of sight); both_pct = percent of time both are available at once; longest_sun_outage_days / longest_earth_outage_days = the longest continuous stretch with no Sun / no Earth; longest_both_outage_days = the longest stretch in which the Sun or Earth or both are unavailable (so it is at least as long as either single outage); mission_score = a 0-100 comparison score; slope_under_10deg_pct = percent of nearby ground with slope under 10 degrees; max_sun_elevation_deg = highest the Sun gets above the horizon; antenna_m = antenna height; window_days = length of the window; relay_assumed = true means Earth contact is assumed to be available through a relay satellite, so earth_pct is 100 by assumption. Write exactly 3 sentences of plain prose. Rules: (1) Use ONLY numbers that appear in the JSON, written exactly as given; never invent, convert, round differently or compute new numbers. (2) Describe the Sun and Earth with the given sun_label and earth_label words (strong, moderate, weak) and never call a percentage most or the majority of the time. (3) Say what the numbers mean for solar power and for direct-to-Earth communication, and mention a long outage only if it is listed, saying it would need a battery or relay. Take care to attribute an outage to the right thing: if the Earth outage is 0, Earth is never the cause. (4) You may state the slope figure with its 10 degree threshold, but NEVER call a site flat, gentle, stable, safe, suitable or good for landing, and never mention rocks or hazards. (5) Never mention field names, underscores or the words JSON, label or relay_assumed; write naturally. (6) End with exactly: Planning aid only, not landing clearance. Output plain text only.';
function aiProxy(): Plugin {
  const handler = async (req: any, res: any, next: () => void) => {
    if (!req.url?.startsWith('/ai/explain')) return next();
    const send = (code: number, body: unknown) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body)); };
    if (req.method !== 'POST') return send(405, { error: 'POST only' });
    // Provider: AI_PROVIDER=anthropic|groq, else whichever key is set (Anthropic first). Keys live only in the server environment.
    const provider = process.env.AI_PROVIDER || (process.env.ANTHROPIC_API_KEY ? 'anthropic' : process.env.GROQ_API_KEY ? 'groq' : '');
    const key = provider === 'groq' ? process.env.GROQ_API_KEY : process.env.ANTHROPIC_API_KEY;
    if (!provider || !key) return send(501, { error: 'No ANTHROPIC_API_KEY or GROQ_API_KEY set on the server.' });
    let raw = ''; for await (const c of req) { raw += c; if (raw.length > 20000) return send(413, { error: 'too large' }); }
    try {
      const facts = JSON.parse(raw);
      if (provider === 'groq') { // Groq: OpenAI-compatible chat completions
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST', signal: AbortSignal.timeout(25000),
          headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
          body: JSON.stringify({ model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b', max_tokens: 800, temperature: 0.2, ...((process.env.GROQ_MODEL || 'openai/gpt-oss-120b').startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}), messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: JSON.stringify(facts) }] }),
        });
        if (!r.ok) return send(502, { error: `Groq API HTTP ${r.status}` });
        const j: any = await r.json();
        return send(200, { text: String(j.choices?.[0]?.message?.content ?? '').trim() });
      }
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', signal: AbortSignal.timeout(25000),
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 400, system: SYSTEM, messages: [{ role: 'user', content: JSON.stringify(facts) }] }),
      });
      if (!r.ok) return send(502, { error: `Claude API HTTP ${r.status}` });
      const j: any = await r.json();
      const text = (j.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('').trim();
      return send(200, { text });
    } catch (e) { return send(500, { error: String((e as Error).message ?? e) }); }
  };
  return { name: 'ai-explain', configureServer: (s) => { s.middlewares.use(handler); }, configurePreviewServer: (s) => { s.middlewares.use(handler); } };
}

// JPL Horizons sends no CORS headers, so the browser calls /horizons and the dev/preview
// server forwards it. For a static deploy, put the same rewrite on the host (Vercel/Cloudflare).
const horizons = {
  // NASA PGDA LOLA south-pole DEM (cloud-optimized GeoTIFF): the browser range-reads small windows through this.
  '/pgda': {
    target: 'https://pgda.gsfc.nasa.gov',
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/pgda/, '/data/LOLA_20mpp'),
  },
  // NASA/MIT LOLA global shape map (PDS), raw int16 files read by range requests for sites outside the 20 m polar product.
  '/imbrium': {
    target: 'https://imbrium.mit.edu',
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/imbrium/, '/DATA/LOLA_GDR/CYLINDRICAL/IMG'),
  },
  '/horizons': {
    target: 'https://ssd.jpl.nasa.gov',
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/horizons/, '/api/horizons.api'),
  },
};

export default defineConfig({
  plugins: [react(), aiProxy()],
  server: { proxy: horizons },
  preview: { proxy: horizons, allowedHosts: true },
});
