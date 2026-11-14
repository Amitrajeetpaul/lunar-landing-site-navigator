// Vercel Edge Function: forwards the browser's requests to NASA's servers (which send no CORS headers), passing the HTTP Range
// header through and streaming the answer back. Only three fixed upstreams are allowed, so this is not an open proxy.
export const config = { runtime: 'edge' };

const UP: Record<string, { base: string; ok: RegExp }> = {
  pgda: { base: 'https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/', ok: /^LDEM_80S_20MPP_ADJ\.TIF$/ },
  imbrium: { base: 'https://imbrium.mit.edu/DATA/LOLA_GDR/CYLINDRICAL/IMG/', ok: /^LDEM_(128|64|16|4)\.IMG$/ },
};

export default async function handler(req: Request): Promise<Response> {
  const u = new URL(req.url), src = u.searchParams.get('src') ?? '';
  let target: string;
  if (src === 'horizons') {
    const q = new URLSearchParams(u.search); q.delete('src');
    target = `https://ssd.jpl.nasa.gov/api/horizons.api?${q.toString()}`;
  } else if (UP[src]) {
    const file = u.searchParams.get('file') ?? '';
    if (!UP[src].ok.test(file)) return new Response('not allowed', { status: 403 });
    target = UP[src].base + file;
  } else return new Response('unknown source', { status: 404 });

  const h = new Headers(); const range = req.headers.get('range'); if (range) h.set('range', range);
  const r = await fetch(target, { headers: h, redirect: 'follow' });
  const out = new Headers();
  for (const k of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) { const v = r.headers.get(k); if (v) out.set(k, v); }
  // Horizons answers are keyed by their full query, so they can be cached briefly. Range answers must NOT be cached: a CDN that
  // ignored the Range header in its cache key could hand one byte range to a request for another.
  out.set('cache-control', src === 'horizons' ? 'public, max-age=300' : 'no-store');
  return new Response(r.body, { status: r.status, headers: out });
}
