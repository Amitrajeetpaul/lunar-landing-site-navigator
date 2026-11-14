export interface Site { name: string; lat: number; lon: number }

/**
 * Presets. Each starts from a named feature (literature coordinate, or a scan of the LOLA terrain around a crater)
 * and was then refined to the best nearby crest with scripts/refine-presets.ts: the real LOLA horizon, Sun and Earth
 * together over 2028, mast 2 m, scanned +-2.4 km at 150 m spacing. A quoted coordinate is rarely the exact crest
 * (Malapert "M1" as quoted sits on a slope, with Earth blocked ~half the time; the refined point sees Earth all year).
 * Peaks are shown to compare sunlight and Earth contact. Slope and landing safety are NOT assessed.
 * The crater-centre point is permanently shadowed: a demonstration of what "no sunlight" looks like.
 */
export const PRESETS: Site[] = [
  { name: 'Shackleton ridge (LOLA-refined)', lat: -89.689, lon: -162.504 },
  { name: 'Peak near Shackleton D (LOLA-refined)', lat: -88.81, lon: 123.786 },
  { name: 'de Gerlache ridge C (LOLA-refined)', lat: -88.705, lon: -68.481 },
  { name: 'Malapert Massif (LOLA-refined)', lat: -85.975, lon: 2.136 },
  { name: 'Haworth rim (LOLA-refined)', lat: -86.993, lon: -24.317 },
  { name: 'Faustini rim (LOLA-refined)', lat: -86.299, lon: 79.151 },
  { name: 'Nobile rim (LOLA-refined)', lat: -85.405, lon: 31.647 },
  { name: 'Shackleton crater wall (shadowed demo)', lat: -89.9, lon: 129.8 },
];

/**
 * Named past and planned landing sites. Coordinates: Apollo = NASA NSSDC table (LRO-based, Wagner et al. 2017, Lunar Module position);
 * Chandrayaan-3 = ISRO/NSSDC; IM-1 = Intuitive Machines/NSSDC; IM-2 = reported landing point (~250 m from target); Chang'e-4/-6 = CNSA via Wikipedia.
 * Terrain is real NASA LOLA everywhere: the 20 m polar product at 81-90 S, the global 237 m map elsewhere (baked for these sites).
 */
export interface Mission extends Site { agency: string; year: string }
export const MISSIONS: Mission[] = [
  { name: 'Apollo 11 (Tranquility Base)', lat: 0.67416, lon: 23.47314, agency: 'NASA', year: '1969' },
  { name: 'Apollo 12 (Ocean of Storms)', lat: -3.0128, lon: -23.4219, agency: 'NASA', year: '1969' },
  { name: 'Apollo 14 (Fra Mauro)', lat: -3.64589, lon: -17.47194, agency: 'NASA', year: '1971' },
  { name: 'Apollo 15 (Hadley Rille)', lat: 26.13239, lon: 3.6333, agency: 'NASA', year: '1971' },
  { name: 'Apollo 16 (Descartes)', lat: -8.9734, lon: 15.5011, agency: 'NASA', year: '1972' },
  { name: 'Apollo 17 (Taurus-Littrow)', lat: 20.1911, lon: 30.7723, agency: 'NASA', year: '1972' },
  { name: 'Chang’e-4 (Von Kármán crater)', lat: -45.444, lon: 177.599, agency: 'CNSA', year: '2019' },
  { name: 'Chandrayaan-3 (Shiv Shakti point)', lat: -69.3733, lon: 32.3191, agency: 'ISRO', year: '2023' },
  { name: 'Chang’e-6 (Apollo basin)', lat: -41.6385, lon: -153.9852, agency: 'CNSA', year: '2024' },
  { name: 'IM-1 Odysseus (near Malapert A, CLPS)', lat: -80.13, lon: 1.44, agency: 'Intuitive Machines / NASA CLPS', year: '2024' },
  { name: 'IM-2 Athena (near Mons Mouton, CLPS)', lat: -84.7906, lon: 29.1957, agency: 'Intuitive Machines / NASA CLPS', year: '2025' },
];
