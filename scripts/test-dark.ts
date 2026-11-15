// npm run test:dark : offline checks of the dark-period runs and the energy arithmetic.
import { energyWh, longest, runs } from '../src/lib/dark';
import { STEP_H, type Sample } from '../src/lib/ephemeris';

let fail = 0;
const ok = (c: boolean, m: string) => { console.log((c ? 'PASS  ' : 'FAIL  ') + m); if (!c) fail++; };
const mk = (n: number): Sample[] => Array.from({ length: n }, (_, i) => ({ t: 1_000_000 + i * STEP_H * 3600_000, sunAz: 0, sunEl: 0, earthAz: 0, earthEl: 0, sunR: 0, earthR: 0 }));
const F = (a: number[]) => Uint8Array.from(a);

let r = runs(mk(8), F([1, 1, 0, 0, 0, 1, 0, 1]), 0);
ok(r.length === 2, 'two dark runs found');
ok(r[0].hours === 3 * STEP_H && !r[0].cutStart && !r[0].cutEnd, 'inner run: 3 samples = 9 h, not cut');
ok(r[1].hours === STEP_H, 'single-sample run = 3 h');
ok(r[0].start === 1_000_000 + 2 * STEP_H * 3600_000 && r[0].end === r[0].start + 9 * 3600_000, 'start and end times');
r = runs(mk(5), F([0, 0, 1, 1, 0]), 0);
ok(r.length === 2 && r[0].cutStart && !r[0].cutEnd && r[1].cutEnd && !r[1].cutStart, 'runs touching the window edges are flagged');
ok(runs(mk(4), F([1, 1, 1, 1]), 0).length === 0, 'no dark run when always lit');
ok(runs(mk(4), F([0, 0, 0, 0]), 0)[0].cutStart && runs(mk(4), F([0, 0, 0, 0]), 0)[0].cutEnd, 'always dark: both edges cut');
ok(runs(mk(6), F([1, 1, 0, 1, 1, 1]), 1).length === 2, 'lit runs');
ok(longest(runs(mk(8), F([1, 1, 0, 0, 0, 1, 0, 1]), 0))?.hours === 9, 'longest picks the 9 h run');
ok(longest([]) === null, 'longest of nothing is null');
// total hours agree with the existing percentage convention
const flag = F([1, 0, 0, 1, 0, 0, 0, 1]);
const dark = runs(mk(8), flag, 0).reduce((s, x) => s + x.hours, 0), lit = runs(mk(8), flag, 1).reduce((s, x) => s + x.hours, 0);
ok(dark + lit === 8 * STEP_H, 'dark plus lit hours equal the window');
ok(energyWh(50, 100) === 5000 && energyWh(0, 100) === 0, 'energy = load x hours');
console.log(fail ? `${fail} FAILED` : 'all passed');
process.exit(fail ? 1 : 0);
