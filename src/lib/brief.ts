import type { Verdict } from './visibility';

const d = (x: number) => (x < 1 ? `${(x * 24).toFixed(0)} h` : `${x.toFixed(1)} d`);

/** Rule-based plain-language brief. Every figure comes straight from the verdict. */
export function brief(name: string, days: number, v: Verdict, relay = false): string {
  const sun = v.sunPct >= 70 ? 'strong' : v.sunPct >= 40 ? 'moderate' : 'weak';
  const earth = v.earthPct >= 70 ? 'strong' : v.earthPct >= 40 ? 'moderate' : 'weak';
  const parts = [
    `${name}, next ${days} days: sunlight is ${sun} (${v.sunPct.toFixed(0)}% of the time, longest dark spell ${d(v.sunOutageD)}).`,
    relay ? 'A relay satellite is assumed to keep Earth contact always available, so contact depends on the Sun here.' : `Direct-to-Earth contact is ${earth} (${v.earthPct.toFixed(0)}%, longest gap ${d(v.earthOutageD)}).`,
    `Both are available together ${v.bothPct.toFixed(0)}% of the time, with the longest gap ${d(v.bothOutageD)}.`,
  ];
  if (v.sunOutageD > 3) parts.push('A battery or heater plan would need to cover the long dark spell.');
  if (v.earthOutageD > 3) parts.push('Expect long stretches that need a relay or stored data.');
  parts.push('Planning aid only, not landing clearance.');
  return parts.join(' ');
}
