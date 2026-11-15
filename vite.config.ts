import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { aiConfigured, generateBrief, validateFacts, type AiEnv } from './src/lib/aiServer';

// Optional AI brief. The browser posts only the verdict numbers to /ai/explain; this middleware validates them, adds the API key from the
// SERVER environment (ANTHROPIC_API_KEY, or GROQ_API_KEY for Groq) and calls that provider through src/lib/aiServer.ts, so the key never
// reaches the browser. No key = HTTP 501 and the app keeps its rule-based brief. On Vercel the same code runs as api/explain.ts.
function aiProxy(): Plugin {
  const handler = async (req: any, res: any, next: () => void) => {
    if (!req.url?.startsWith('/ai/explain')) return next();
    const send = (code: number, body: unknown) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body)); };
    if (req.method !== 'POST') return send(405, { error: 'POST only' });
    if (!aiConfigured(process.env as AiEnv)) return send(501, { error: 'No ANTHROPIC_API_KEY or GROQ_API_KEY set on the server.' });
    let raw = ''; for await (const c of req) { raw += c; if (raw.length > 4000) return send(413, { error: 'too large' }); }
    let facts; try { facts = validateFacts(JSON.parse(raw)); } catch { facts = null; }
    if (!facts) return send(400, { error: 'invalid facts' });
    const out = await generateBrief(process.env as AiEnv, facts);
    return send(out.status, out.body);
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
