import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

// Optional AI-written brief. The browser posts only the verdict numbers to /ai/explain; this middleware adds the API key from the
// SERVER environment (ANTHROPIC_API_KEY) and calls the Claude API, so the key never reaches the browser. No key = HTTP 501 and the
// app keeps its rule-based brief. Run: ANTHROPIC_API_KEY=... npm run dev
const SYSTEM = 'You write short plain-language briefs for lunar mission planners, teachers and students. You are given a JSON object of facts about one landing site and date window. Write 3 to 4 sentences. Use ONLY numbers that appear in the JSON, written exactly as given; never invent, convert, round differently or compute new numbers. Explain what the numbers mean for solar power and for direct-to-Earth communication, mention any long outage that would need a battery or relay, and end with: Planning aid only, not landing clearance. Output plain text only.';
function aiProxy(): Plugin {
  const handler = async (req: any, res: any, next: () => void) => {
    if (!req.url?.startsWith('/ai/explain')) return next();
    const send = (code: number, body: unknown) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body)); };
    if (req.method !== 'POST') return send(405, { error: 'POST only' });
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return send(501, { error: 'No ANTHROPIC_API_KEY set on the server.' });
    let raw = ''; for await (const c of req) { raw += c; if (raw.length > 20000) return send(413, { error: 'too large' }); }
    try {
      const facts = JSON.parse(raw);
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
