# Independent validation sources for lunar south pole Sun and Earth visibility

Legend: VERIFIED = number read in a source I opened this session (abstract page or full-text PDF). SEARCH-ONLY = from a search snippet, not opened. RECALLED = from memory, not checked. Anything not cited is a gap.

## Q1. Gridded and published datasets beyond PGDA product 69

### Takeaway
Product 69 is itself the Mazarico 2011 LOLA product, so Mazarico 2011 is NOT independent of what the app already uses. Genuinely independent checks are Gläser 2014/2018 (DLR, 20 m, 2 m and 10 m heights), Bussey 2010 (Kaguya), Speyerer and Robinson 2013 (LROC WAC imagery, observed rather than modelled), Barker 2021 (5 m, 1 m and 5 m heights, 2024-2026 only) and the Bryant JPL radar study (51% Earth, 92% Sun).

### Cited Findings
- PGDA product 69 serves LOLA polar maps in four types (average Sun illumination, permanent shadow/LPSR, average Earth visibility, sky visibility). Resolutions: 240 m/px for 65-90 deg S; 120 m/px for 75-90 deg; 60 m/px for 85-90 deg (sky visibility is 240 m only). Formats: IMG (int16), JP2, GeoTIFF (added 2025-03-20), COG. Averages cover a full nutation cycle (~18.6 yr) with hourly steps. The Sun is a finite disc. For Earth, the Earth counts as visible if ANY part of its disc is unobscured, which the page says may be slightly optimistic for DSN-only links. File sizes are not listed on the page. VERIFIED — [PGDA 69](https://pgda.gsfc.nasa.gov/products/69)
- Cite as Mazarico et al. 2011, Icarus 211, 1066-1081, doi:10.1016/j.icarus.2010.10.030. VERIFIED — same page
- Mazarico 2011 abstract: 240 m DEMs to 75 deg, illumination to 80 deg, several 18.6-yr cycles at 6 h resolution (the NTRS abstract says 6 h; the PGDA page says hourly for the released maps; the discrepancy is unresolved). PSR area 16,055 km2 (south). A Shackleton-rim location is sunlit continuously for 240 days per year, longest darkness about 1.5 days. VERIFIED — [NTRS 20120010094](https://ntrs.nasa.gov/citations/20120010094)
- Bussey et al. 2010 (Icarus 208, 558, "Illumination conditions of the south pole of the Moon derived using Kaguya topography"): the most illuminated place is 86% of the year, near the Shackleton rim at 88.74 S, 124.5 E; two areas under 10 km apart are collectively lit 94% of the year. The same snippet says the 86% is for Kaguya low-res; Kaguya high-res gave 78% and LOLA 90% (AGU 2010 abstract, Quinn et al.). NOTE: "3 days dark" is NOT in the abstract snippets. SEARCH-ONLY — [Bussey ADS](https://ui.adsabs.harvard.edu/abs/2010Icar..208..558B), [AGU abstract](https://ui.adsabs.harvard.edu/abs/2010AGUFM.P51C1447Q) (ADS fetch returned 405; not opened)
- Speyerer and Robinson 2013, Icarus 222, 122-136, doi:10.1016/j.icarus.2012.10.010: LROC WAC stacked lit/shadow images, 15 Feb 2010 to 5 Feb 2011, so ONE lunar year of observation, not 18.6 yr. Percentage-based and time-weighted maps (WAC_POLE_ILL_PCT_SOUTH, WAC_POLE_ILL_TWI_SOUTH). Observed, so it is independent of any DEM. Site numbers (e.g. "243 days") NOT verified. SEARCH-ONLY — [LROC PCT map](https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_POLE_ILL_PCT_SOUTH), [PGDA 69 refs](https://pgda.gsfc.nasa.gov/products/69)
- Gläser et al. 2018 (PSS 162, 170-178, doi:10.1016/j.pss.2017.07.006): 20 m/px DTMs (400x400 km) from LOLA; 50x50 km regions, hourly 2017-2037. Three high-illumination regions per pole, averages 69.5-82.9% (highest: Whipple rim, north). For a lander with 2 m structural height: 77.1-88.0%, maximum at the ridge between Shackleton and de Gerlache (south). VERIFIED — [DLR elib 119091](https://elib.dlr.de/119091)
- Barker et al. 2021: the correct citation is Planetary and Space Science 203, 105119 (NOT Icarus 354), doi:10.1016/j.pss.2020.105119. 5 m/px LDEMs for 4 sites (Site 1 = Connecting Ridge, Site 4 = Shackleton rim, Site 7 = isolated peak near Shackleton, Site 11 = de Gerlache rim, per a secondary description — SEARCH-ONLY). Illumination window is 1 Jan 2024 to 1 Jan 2026 (2 years, not 18.6). Heights 1 m and 5 m. Sun is a 2D extended source with limb darkening at 550 nm; the visible fraction is the disc cut horizontally at the horizon elevation at the disc-centre azimuth. Table 2, Site 1 RoIs 1-7, 1st-percentile average illumination (case A): 1 m: 67.4-71.2%; 5 m: 82.8-89.3%. LCIP-1 (longest continuous illumination, days) at 5 m: 119-231; 99th pct longest continuous shadow (LCSP) at 5 m: 4-8 days. No Earth visibility in this paper. VERIFIED (full text read) — [NTRS 20205009660 PDF](https://ntrs.nasa.gov/api/citations/20205009660/downloads/Mike%20Barker_%20Paper_%20Improved%20Lola.pdf)
- Barker et al. 2023 (south pole roughness/PSR maps, 13 Artemis III regions): abstract has no illumination or Earth numbers. VERIFIED — [NTRS 20230014419 PDF](https://ntrs.nasa.gov/api/citations/20230014419/downloads/BarkernewviewSTIupdated.pdf). The user's "PSJ 4 183" citation was not confirmed.
- Mazarico, Barker, Nicholas 2018 (Adv. Space Res. 62, 3214, doi:10.1016/j.asr.2018.08.022) shows Faustini Sun-disc visibility and sunlit-Earth visibility maps, but only as figures; no numeric tables. VERIFIED — [PMC6398960](https://pmc.ncbi.nlm.nih.gov/articles/PMC6398960)
- NASA SVS 4893/4944: not opened. Gap.

### Inferences
- Because PGDA 69 = Mazarico 2011, the "Sun ~9 points" gap at the centre pixel may reflect height and disc rules (PGDA is surface-level, any-disc-visible for Earth; Gläser 2 m and Barker 1/5 m are raised). Compare at matching heights.
- Barker's 2-year window explains lower values than 18.6-yr means; do not compare directly.

### Gaps
- Range-request support and file sizes for PGDA/imbrium/PDS files: not tested (no HEAD request done). Likely worth `curl -I` for Accept-Ranges.
- De Rosa 2012 numbers, Mazarico 2011 per-site table, Speyerer-Robinson site table: full text not opened.

## Q2. Per-site numbers

### Takeaway
Best verified: Connecting Ridge (Shackleton-de Gerlache): 92.27%/92.3% at 2 m and 95.65%/95.66% at 10 m over 19 yr, longest darkness typically 3-5 days (Gläser 2014). Mazarico: Shackleton rim 240 d continuous, ~1.5 d darkest. No verified per-site Earth percentages for Haworth, Faustini, Nobile, Malapert.

### Cited Findings
- Gläser et al. 2014 (EPSC 9, "Connecting Ridge - A landing site at the lunar south pole with extended illumination"): 20 m/px LOLA DTM, simulated at surface, 2 m and 10 m heights, 19 years; 92.3% (2 m) and 95.66% (10 m); longest dark 3-5 days. Abstract gives no DOI. VERIFIED — [DLR elib 94242](https://elib.dlr.de/94242). The Icarus 243:78-90 version (doi 10.1016/j.icarus.2014.08.033 — DOI RECALLED) is reported by search as 92.27% and 95.65% (SEARCH-ONLY, [openpolar record](https://openpolar.no/Record/ftdlr:oai:elib.dlr.de:94240/Details)). Disc rule not stated in either abstract; Gläser's method (RECALLED) treats the Sun as an extended disc in ray-traced horizon calcs — check full text.
- The 13 Artemis III candidate regions (Faustini Rim A, Peak Near Shackleton, Connecting Ridge, Connecting Ridge Extension, two de Gerlache rim, de Gerlache-Kocher Massif, Haworth, Malapert Massif, Leibnitz Beta Plateau, two Nobile Rim, Amundsen Rim); each region about 15 km square; all contain sites with continuous sunlight for the planned 6.5 surface days. Selection criteria included Earth communications. SEARCH-ONLY — [NASA release](https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-landing-next-americans-on-Moon/), [collectSPACE](https://www.collectspace.com/news/news-081922a-artemis-iii-moon-landing-regions.html)
- Malapert: Lowman outpost study says the summit probably has Earth always in view; Shackleton rim sees Earth about half of each month; Malapert sunlit 90% or more of the year (citing Schrunk and Sharpe). SEARCH-ONLY (PDF fetch 404 on redirect) — [Lowman Malapert outpost](https://www3.nd.edu/~cneal/lunar-l/Malapert-Mt-Outpost.pdf); NASA page: "Malapert Massif also has exceptional Earth visibility" ([source](https://science.nasa.gov/image-detail/20100618)). ILOA doc [Moonbase Mons Malapert](https://iloa.org/media/Moonbase_Mons_Malapert.pdf) not opened.

### Gaps
- No verified numbers for Haworth, Faustini, Nobile, or Peak near Shackleton in any opened source; these would have to be read from the PGDA grids themselves.

## Q3. Direct-to-Earth communication availability studies

### Takeaway
The only quantitative published DTE statistic found: Bryant (JPL) best south-pole base site, 92% solar and 51% DTE, GSSR 40 m DEM.

### Cited Findings
- Bryant, IPN Progress Report 42-176 (15 Feb 2009), pp. 1-43: GSSR 2006 DEM, 40 m horizontal, ~5 m relative vertical accuracy; horizon masks within 100 km of the pole; best site multi-year averages solar 92% and DTE 51%; also peaks with continuous DTE; compared with actual Sun/Earth visibility averaged 2009-2028. VERIFIED — [IPN 42-176C](https://ipnpr.jpl.nasa.gov/progress_report/42-176/176C.html). Per-site tables are in the PDF, not opened.
- Same work as SpaceOps 2010 paper (NTRS 20150008843), which says "about 50%". VERIFIED — [NTRS 20150008843](https://ntrs.nasa.gov/citations/20150008843); other NTRS id 20150014706 also listed (not opened).
- Malmstrom et al. 2006 AIAA "Continuous Communications to the Moon's South Pole": direct line of sight from the south pole to Earth either does not exist or exists only periodically in many areas of interest. SEARCH-ONLY (abstract) — [citation](https://docs.moondao.com/Reference/Citations/@MalmstromEtAl2006)

### Gaps
- Artemis base camp comm studies, Lunar Pathfinder, Queqiao figures: not researched in this pass.

## Q4. Mission-observed data points

### Takeaway
Few usable official numbers. IM-2 gave a qualitative result (shadowed crater, ~13 h life); Chandrayaan-3 Sun elevation at landing is unconfirmed forum material.

### Cited Findings
- IM-2 Athena: landed 6 Mar 2025 about 12:30 pm ET on Mons Mouton, ~250 m from target, on its side in a crater; "sunlight could not reach the solar cells"; mission ended 7 Mar ~1:15 am ET, about 12 h 45 min after landing; article does not mention Earth visibility. VERIFIED — [SpacePolicyOnline](https://spacepolicyonline.com/news/im-2-mission-ends-one-day-after-lunar-landing/). Wikipedia-derived page claims 8 d 5 h (contradicts; likely wrong) — [wiki mirror](https://wiki.krisyotam.com/content/wikipedia_en_all_nopic_2026-03/IM-2). Tilt means the model needs a non-flat-ground caveat.
- Chandrayaan-3: landed 23 Aug 2023 12:33 UTC at ~69.37 S, 32.35 E (target 69.367621 S, 32.348126 E). A forum post claims ISRO said landing needed 6-9 deg Sun elevation and touched down at 8.75 deg, minimum 6 deg for operations. UNVERIFIED forum quote — [Bharat Rakshak](https://forums.bharat-rakshak.com/viewtopic.php?p=2599929). Landing time source — [Scientific American](https://www.scientificamerican.com/article/chandrayaan-3-makes-historic-touchdown-on-the-moon/). Sleep mode 4 Sep 2023, wake hoped ~22 Sep (Vikram), Pragyan asleep 2 Sep — [Live Science](https://www.livescience.com/space/the-moon/india-lands-on-moon-chandrayaan-3-becomes-worlds-1st-spacecraft-to-land-near-lunar-south-pole). The mission was not designed to run a full day (forum, unverified). Horizons can check 8.75 deg directly at 12:33 UTC.

### Inferences
- Chandrayaan-3 operational span (about 23 Aug to 2-4 Sep, ~10-12 Earth days) is a usable sunlit-duration check against the app at 69.37 S, 32.35 E.

### Gaps
- IM-1 (Malapert A, 80.13 S), Chang'e-4/6 (Queqiao relay), Apollo touchdown Sun elevations: NOT researched or opened. RECALLED only; Apollo values are available from the Apollo Lunar Surface Journal and are Horizons-checkable.
- No Earth visibility figure for IM-2 or Chandrayaan-3 landing sites found.

## Q5. Range access and sizes for grids

### Gaps
- Not tested. PGDA says COG versions exist (COG implies HTTP Range). No sizes on page. LROC WAC percentage map page at data.lroc.im-ldi.com not opened. Recommended next step: `curl -sI` on the imbrium and PGDA COG URLs for Accept-Ranges and Content-Length.
