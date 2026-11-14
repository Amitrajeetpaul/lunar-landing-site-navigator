import { useState } from 'react';

export function ShareCard({ relay, setRelay }: { relay: boolean; setRelay: (v: boolean) => void }) {
  const [msg, setMsg] = useState('');
  const copy = async () => {
    try { await navigator.clipboard.writeText(location.href); setMsg('Link copied. It reopens this exact site, date, window, rule and relay setting.'); }
    catch { setMsg('Copy failed: copy the address bar instead (it already holds the full state).'); }
  };
  return (
    <div className="card">
      <div className="label">Relay, share and report</div>
      <label className="inl"><input type="checkbox" checked={relay} onChange={(e) => setRelay(e.target.checked)} /> Assume a relay satellite (Earth contact always available)</label>
      <small className="muted">An assumption, not data: shows how much a lunar relay would fix. Off = direct-to-Earth only.</small>
      <div className="row"><button onClick={copy}>Copy shareable link</button><button className="primary" onClick={() => window.print()}>Download report (PDF)</button></div>
      {msg && <small className="muted">{msg}</small>}
    </div>
  );
}
