# Validating a lunar south-pole Sun and Earth visibility calculator against published results

Research done 2026-11-14. Many primary papers (Icarus/PSS full text) were paywalled or returned as binary PDF, so several figures below are abstract-level only. Gaps are listed explicitly.

## 1. Published illumination statistics (percent sunlit, longest dark, longest light) for named sites

### Takeaway
Published numbers that can be checked directly: Mazarico 2011 (best Shackleton-rim point: lit continuously up to 240 days, longest darkness about 1.5 days); Gläser 2014 (Connecting Ridge 92.3% at 2 m, 95.65% at 10 m, 19 yr); Gläser 2017 (ridge 92.1%, Shackleton rim 85.5%); Mazarico 2018 / NTRS 20170007365 (69.5-88.0% at 2 m, 20 yr). I found no per-site table for de Gerlache rim, Malapert, Haworth, Faustini or Nobile rim with stated mast height. The Shackleton crater wall/floor is NOT a good benchmark for sunlit statistics (interior is permanently shadowed).

### Cited Findings
- Mazarico et al. 2011 (Icarus 211): LOLA 240 m polar DEMs to 75 deg lat, illumination computed to 80 deg lat, several 18.6-yr precession cycles at 6 h time step. A location near the Shackleton rim is sunlit continuously for 240 days per year; its longest continuous total darkness is about 1.5 days. Abstract says small height gains of about 10 m substantially improve average illumination and shorten the night (the exact threshold symbol was lost in the page text). Validated against LROC WAC images. PSR area totals: 12,866 km2 north, 16,055 km2 south. — [NTRS 20120010094](https://ntrs.nasa.gov/citations/20120010094)
- Gläser et al. 2014 (Icarus), "Illumination conditions at the lunar south pole using high resolution DTMs from LOLA": 19-year span (one precession cycle). Connecting Ridge sunlit 92.27% of the time at 2 m above ground and 95.65% at 10 m (EPSC abstract rounds to 92.3% and 95.66%). — [DLR elib 94242 / openpolar record](https://openpolar.no/Record/ftdlr:oai:elib.dlr.de:94242/Map); [Icarus record listing](https://openpolar.no/Record/ftdlr:oai:elib.dlr.de:94240/Map)
- Gläser et al. 2017 (PSS), as summarised by a search result (not verified in the paper itself): Sun visible along the Connecting Ridge (site C1) 92.1% of the time, Shackleton rim (site S) 85.5%. Mast height and date range for these two were not retrievable. — [secondary summary via search](https://elib.dlr.de/94242)
- Mazarico, Speyerer, Robinson et al. (PSS, 2018; NTRS 20170007365): six sites (Hinshelwood, Peary, Whipple rims in north; Shackleton rim and two ridge locations between Shackleton and de Gerlache in south). Average illumination 69.5% to 82.9% for initial sites; 77.1% to 88.0% for the detailed lander/rover study; highest 88.0% on the south-pole ridge. Assumed height 2 m (lander solar panels). DTMs 20 m/pixel, 400 x 400 km; illumination simulated on 50 x 50 km regions; 1 Jan 2017 to 1 Jan 2037 (20 yr) at 1 h steps. Longest dark/light durations, solar disc treatment and Earth visibility not stated in the text I could read. — [NTRS 20170007365 PDF](https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/20170007365.pdf)
- Speyerer and Robinson 2013 (Icarus 222:122-136): empirical, from 3,807 south-pole LROC WAC images, one lunar year 15 Feb 2010 to 5 Feb 2011. Products: percentage-based and time-weighted illumination maps (WAC_POLE_ILL_PCT_SOUTH, WAC_POLE_ILL_TWI_SOUTH). Binary lit/shadow images stacked; time-weighted version compensates for skipped orbits. Site-level percentages not on the product pages. — [LROC 991](https://lroc.im-ldi.com/images/991); [PCT south](https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_POLE_ILL_PCT_SOUTH); [TWI south](https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_POLE_ILL_TWI_SOUTH)
- Barker et al. 2021 (PSS 203, doi 10.1016/j.pss.2020.105119): LOLA-only 5 m/pixel DEMs, 16 x 16 km, for four south-pole sites (Mazarico 2011 sites 1, 4, 7, 11). Orbit-corrected geolocation error about 10-20 cm horizontal, 2-4 cm vertical; height RMS about 0.30-0.50 m, slope RMS 1.5-2.5 deg. Shows height error propagation to horizon elevation, but no numeric horizon/illumination error in the abstract. — [NTRS 20205009660](https://ntrs.nasa.gov/citations/20205009660)
- Kumari et al. 2022 (PSJ), Artemis sites 007 and 011: reported about 80% illumination (secondary news report), higher than previously reported for sites 001 and 004. Mast height/date range not retrieved. — [UAF news](https://www.uaf.edu/news/archives/2023/research-provides-details-of-possible-nasa-moon-landing-sites.php); [paper record](https://ouci.dntb.gov.ua/works/4O2vv6O7)
- Older, weaker figure: Shackleton rim peaks about 80-90% of each lunar orbit sunlit (Spudis et al. 1995 as cited on Wikipedia; low quality). — [Wikipedia Shackleton](https://en.wikipedia.org/wiki/Shackleton_(crater))
- NASA Artemis III: nine candidate regions (Oct 2024): Peak near Cabeus B, Haworth, Malapert Massif, Mons Mouton Plateau, Mons Mouton, Nobile Rim 1, Nobile Rim 2, de Gerlache Rim 2, Slater Plain. No region-specific illumination values in the NTRS paper; south polar illumination shifts roughly 2-3 weeks per year. A Universe Today report says Artemis III became an Earth-orbit test and landing moved to Artemis IV (secondary; verify with NASA). — [NTRS 20250011660](https://ntrs.nasa.gov/citations/20250011660)

### Inferences
- For a ray-marching tool, the strongest numeric checks are: (a) a Connecting Ridge point at 2 m and 10 m masts should give about 92% and about 96% over a full 18.6-19 yr cycle; (b) Shackleton rim best points about 85-88% at 2 m; (c) best rim point should show about 1.5 d max darkness at 6 h/1 h sampling. Your 15-60 day windows can only be compared for the pattern (e.g. long continuous light/dark runs), not the long-term percentages, because illumination varies on 18.6 yr and annual (about 2-3 weeks) scales.
- A 3 h step is coarser than 1 h (2018 paper) but finer than 6 h (2011); durations measured in steps have 1-6 h quantisation.
- Preset at lat -89.9 sits in permanently shadowed crater; getting 0% sunlit is the expected result, not a bug (see section 4).

### Gaps
- Exact lat/lon of the Mazarico 2011 sites 1/4/7/11, the Gläser "C1" and "S" points and Mazarico 2018 ridge sites: not retrieved (full papers inaccessible).
- Per-site statistics with mast height for de Gerlache rim, Malapert, Haworth, Faustini, Nobile rim: not found.
- Longest continuous light figures: not found in any accessible source.

## 2. Earth visibility / direct-to-Earth figures

### Takeaway
I found no accessible quantitative per-site Earth-visibility percentages. Only qualitative statements (Malapert excellent, near continuous) and the geometry that Earth librates about 12 deg in total elevation near Malapert. A 2025 JGR Planets paper (doi 10.1029/2025JE009127) reportedly maps Earth visibility for Artemis III regions; I could not retrieve it.

### Cited Findings
- LOLA team: Malapert Massif has exceptional Earth visibility and is suggested for communications; summit probably keeps Earth in view almost continuously; Earth visibility from the broader area varies on a 28-day cycle with Earth rising and setting over about 12 deg total. — [LOLA Malapert post](https://lunarnetworks.blogspot.com/2010/06/lolas-malapert-region.html); [Moonbase Mons Malapert](https://iloa.org/media/Moonbase_Mons_Malapert.pdf)
- NASA LPSC 2026 Artemis update: if direct-to-Earth comms are used, regions with greater Earth visibility are preferred; no numbers. — [NTRS 20250011660](https://ntrs.nasa.gov/citations/20250011660)
- Artemis site-selection text notes polar sites may have periods without direct Earth view. — [NTRS 20230016267](https://ntrs.nasa.gov/api/citations/20230016267/downloads/Lunar%20Site%20Selection.pdf)

### Inferences
- Malapert at -85.99 is a good sanity check: Earth centre elevation from the site is roughly 4 deg (Earth libration and site latitude), so with horizon max 4.8 deg the tool should show Earth visible much but not all of the time, hinging on azimuth toward Earth (near 0 deg lon, i.e. facing Earth). Treat the tool's Earth percentage there as high (qualitatively "near continuous" in the literature) and flag anything below that. This is my reasoning, not a published number.
- At true polar sites Earth is below the horizon about half the libration cycle or more; Shackleton-wall results of zero are plausible.

### Gaps
- No per-site percentage of Earth visibility with mast height and dates for any of the named sites. Next step: obtain 10.1029/2025JE009127 and the Kumari 2022 PSJ full text (Arizona repository returned 403).

## 3. Datasets/tools to check independently

### Takeaway
Best cross-checks: PGDA LOLA south-pole DEMs (same input as the tool), LROC WAC illumination maps (empirical, 1 year), SPICE/Horizons for ephemeris. Assumptions are rarely stated on product pages.

### Cited Findings
- PGDA product 90 (Barker et al. 2023, PSJ 4:183, doi 10.3847/PSJ/acf3e1; data DOI 10.60903/gsfcpgda-lola-spole): 80S set includes 20 m/pixel DEMs (80-90 S) plus 40/80/120/240 m; 83S set 10 m; 75S 30 m; 60S 60-240 m. Cloud-optimised GeoTIFFs for elevation, error, effective resolution, hillshade, slope, roughness, PSR; XYZI point clouds; south polar stereographic X/Y in metres, MOON_ME frame of JPL DE421. Page states no mast height, time span or solar disc info. — [PGDA 90](https://pgda.gsfc.nasa.gov/products/90)
- PGDA product 78: earlier high-resolution LOLA topography for south-pole sites. — [PGDA 78](https://pgda.gsfc.nasa.gov/products/78)
- LROC WAC south pole illumination maps (percent and time-weighted), 15 Feb 2010 - 5 Feb 2011, n=3807; lit/dark binary per image, no solar-disc or mast notion (surface imaging at about 100 m scale). — [LROC 991](https://lroc.im-ldi.com/images/991)
- NASA SVS 4893: animation of 2 lunar days of south polar illumination using LOLA DEM (dataset 653) and WAC colour mosaic; Sun within 1.5 deg of horizon; shadows from peaks up to about 120 km away. No dates, DEM grid, height or solar-disc info on page. This is visual only, not a numeric benchmark. — [SVS 4893](https://svs.gsfc.nasa.gov/4893/)
- SVS 4716 "Visualizing Shackleton Crater" exists (not read). — [SVS 4716](https://svs.gsfc.nasa.gov/4716/)
- LROC QuickMap and Moon Trek solar-illumination tools, SPICE/spiceypy: not fetched; I have no verified documentation of their assumptions (gap).

### Inferences
- Use PGDA 20 m DEM + your own pipeline in the same polar stereographic frame, and pull Sun position from SPICE (DE421/DE440 plus a lunar frame kernel) as an independent ephemeris check against Horizons; differences should be arcseconds.
- Important frame note: PGDA uses the MOON_ME (mean-Earth/polar-axis) frame; make sure the app's lon/lat and Sun/Earth vectors use the same frame (not the principal-axis frame, which differs by hundreds of metres at the pole).

### Gaps
- QuickMap/Moon Trek illumination layer documentation not retrieved.

## 4. Shackleton coordinates, size, depth

### Takeaway
Shackleton centre is about -89.67, 129.78 (IAU/USGS), diameter about 21 km, depth about 4.2 km. The preset at -89.9, 129.8 is inside the crater, on the pole-facing inner wall, not on the rim.

### Cited Findings
- USGS Gazetteer (feature 5450), adopted by IAU 1994, planetographic +East: solution 1 centre -89.67, 129.78, diameter 20.92 km; solution 2 -89.63, 132.32, 21.00 km; solution 3 -89.90, 0.00, 19.00 km (an old point value). — [USGS Gazetteer](https://planetarynames.wr.usgs.gov/Feature/5450)
- Diameter 21.0 km and depth 4.2 km (Haruyama et al. 2008 as cited); floor diameter 6.6 km; central peak about 200 m. — [Wikipedia Shackleton](https://en.wikipedia.org/wiki/Shackleton_(crater))
- A hobbyist site suggests centre nearer -89.69, 130.8 (low confidence). — [the-moon.us](https://the-moon.us/wiki/Shackleton)

### Inferences
- Geometry (my calculation, 1 deg = 30.3 km on a 1737.4 km sphere): centre is 0.33 deg = 10.0 km from the pole; crater radius about 10.5 km, so the pole sits almost on the rim. Point -89.9 on the same meridian is 0.23 deg = about 7.0 km from centre toward the pole, i.e. about 3.5 km inside the rim, on the wall. This matches the tool's elevation of -339 m (wall) and horizon 4.4-33 deg. On that meridian the near-pole rim crest is at roughly the pole itself (centre-to-pole 10 km vs radius 10.5 km). Do not use -89.9, 129.8 as a rim benchmark; it is on the wall.
- Geometric note (my calculation): the crater rim on the far side from the pole, along the 129.78 E meridian extended through the pole (i.e. lon about -50.2), lies near -89.67 + 0.35 = about -89.32 deg. Literature rim sites are on the sunlit rim crest; verify any chosen rim test point against the DEM elevation and published coordinates (not retrieved) before using it as a benchmark.

### Gaps
- Exact published rim-site coordinates; rim and floor absolute elevations (Zuber 2012 Nature not retrieved).

## 5. Sources of disagreement between calculators

### Takeaway
Few papers quantify these; the quantified ones are mast height (large) and DEM height error (small, about 0.3-0.5 m RMS at 5 m grid). Others below are partly inferred.

### Cited Findings
- Mast height: Connecting Ridge 92.27% at 2 m vs 95.65% at 10 m (a 3.4 percentage point change for 8 m); Mazarico 2011 states about 10 m gains substantially improve illumination and shorten nights. — [Gläser 2014](https://openpolar.no/Record/ftdlr:oai:elib.dlr.de:94242/Map); [NTRS 20120010094](https://ntrs.nasa.gov/citations/20120010094)
- Grid: 240 m (Mazarico 2011) vs 20 m (Mazarico 2018, PGDA) vs 5 m (Barker 2021). Mazarico 2018 reports 69.5-88.0% for 20 m DTMs; the 2011 240 m model gave the 240-day continuous-light claim for the best site. — [NTRS 20170007365](https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/20170007365.pdf)
- DEM error: LOLA-only 5 m DEM heights 0.3-0.5 m RMS, slopes 1.5-2.5 deg; orbit-corrected geolocation 10-20 cm. — [NTRS 20205009660](https://ntrs.nasa.gov/citations/20205009660)
- Time step: 6 h (2011), 1 h (2018), vs your 3 h. — same sources.
- Duration of record: 18.6-19-20 yr (2011, 2014, 2018) vs one year (Speyerer 2013) vs your 15-60 days. Illumination at the south pole shifts about 2-3 weeks per year. — [NTRS 20250011660](https://ntrs.nasa.gov/citations/20250011660)
- Shadows from peaks up to about 120 km away matter at the pole (Sun within 1.5 deg of horizon). — [SVS 4893](https://svs.gsfc.nasa.gov/4893/)
- DEM version: PGDA 2023 products (Barker 2023) supersede earlier 240 m / 20 m sets; frame is MOON_ME / DE421. — [PGDA 90](https://pgda.gsfc.nasa.gov/products/90)

### Inferences (not published numbers)
- Solar disc: at 0.2666 deg radius requirement (full disc must clear), versus treating the Sun's centre or partial lit fraction, the horizon is effectively raised by 0.27 deg; with the Sun hugging 0-1.5 deg and moving slowly in elevation at the pole, this alone can change percent-lit by several points and lengthen darkness runs. Some papers use centre or fractional-disc; their disc treatment was not stated in sources I accessed, so check before comparing.
- Far-field cutoff: a 120 km shadow caster at 0.3 deg corresponds to roughly 0.6 km height above the line of sight at that range plus curvature; truncating far-field terrain (e.g. 50 km grid as in Mazarico 2018) removes distant ridges. Horizon height from a mast also needs curvature-of-Moon handling (drop = d^2/2R: about 0.3 m at 1 km, 7 m at 5 km, 290 m at 100 km).
- A 2 m vs 10 m mast changes horizon angle at 10 km range by about 0.05 deg, comparable to a few percent of solar disc radius, so it matters in the narrow grazing regime.
- Horizon azimuth resolution of 1 deg (360 samples) is coarse against narrow ridges at kilometre distances (1 deg is 175 m at 10 km); expect small percent changes.

### Gaps
- No paper found that directly compares independent calculators or quantifies solar-disc, azimuth-sampling, or far-field-cutoff effects. Ephemeris (DE421 vs DE440, Horizons): no published sensitivity found; expected small.
