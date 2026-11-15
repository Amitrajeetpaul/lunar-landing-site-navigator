# Lunar landing-site safety screening (slope, roughness, rocks, hazards, PSR): public data and thresholds

Verification legend. VERIFIED = I opened the source or ran curl myself (2026-11-15). SNIPPET = seen only in a search-result summary, not opened. UNVERIFIED = could not confirm.

## 1. Public hazard-relevant datasets (URL, format, resolution, coverage, licence, client-side readability)

### Takeaway
Good public slope inputs exist (LOLA 20 m polar DEM, 5 m site DEMs, 5 m Shape-from-Shading DEMs with multi-baseline slope and roughness for the 13 Artemis III regions), and PSR/illumination maps are available as GeoTIFF/COG. Diviner rock abundance is published only for about +/-60 deg latitude, so it does NOT cover the south pole. No polar rock layer was found. PGDA and imbrium servers send no CORS headers, so a small proxy is needed for browser reads, even though Range requests work.

### Cited Findings
- PGDA product 78 "High-Resolution LOLA Topography for Lunar South Pole Sites" is 5 m/pixel LDEMs, not 20 m. Files are GeoTIFF (LDEM, LDEC spot counts, slope, slope uncertainty, 100 error clones), XYZI point clouds and shapefiles. Sites: 01, 04, 06, 07, 11, 20, 20v2, 23, 42, Haworth, Shoemaker, LM1-LM8. South polar stereographic, MOON_ME. Quoted uncertainties: median RMS height error about 0.30-0.50 m, median RMS slope error about 1.5-2.5 deg, and about 90% of 5 m pixels interpolated. No licence stated on the page. VERIFIED — [PGDA product 78](https://pgda.gsfc.nasa.gov/products/78)
- Example file: `https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site01/Site01_final_adj_5mpp_surf.tif` returns HTTP 200, `Accept-Ranges: bytes`, Content-Length 40,980,810, and a `-r 0-99` request returns 206. I saw no `Access-Control-Allow-Origin` header when sending an Origin header. VERIFIED by curl — [file](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site01/Site01_final_adj_5mpp_surf.tif)
- A Barker/Mazarico/LOLA-team presentation says the data gaps in LOLA DEMs are interpolated, LDEC count maps can mask interpolated values, and PDS hosts a 20 m/pix 80-90 deg S DEM. Typical height/slope RMS uncertainties are 0.3-0.5 m / 1.5-2.5 deg, spatially correlated with gap size. It points to PGDA product 81 as the south pole 5 m/pix DEM mosaic. VERIFIED (downloaded PDF and read text) — [Barker NTRS 20220014571](https://ntrs.nasa.gov/api/citations/20220014571/downloads/Barker.topographic.presentation%20UPDATED.pdf); [PGDA 81](https://pgda.gsfc.nasa.gov/products/81) (title verified; contents not read)
- The 20 m polar LOLA GDR sits at `https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/` (subdirs `IMG/`, `FLOAT_IMG/`, `JP2/`). `IMG/LDEM_80S_20M.LBL` returns 200 with Accept-Ranges: bytes; no CORS header seen. My guessed names `LDEM_80S_20MPP_ADJ.TIF` and `LDEM_80S_20M.JP2` returned 404, so the app's existing file naming should be reused rather than my guesses. File size of the 20 m IMG not checked. VERIFIED by curl (directory and LBL only).
- NEW and most relevant: PGDA product 104, Bertone, Barker, Mazarico, Beyer and Petro (Planetary Science Journal, doi:10.3847/PSJ/ae5b70). It gives 5 m/pix Shape-from-Shading DEMs (LROC NAC plus LOLA) for the 13 original Artemis III candidate regions (>4,500 km2 total). Per region it includes SDEM, hillshade, slope maps at multiple baselines, and VRM roughness maps at multiple baselines. The page does not list the baselines. VERIFIED — [PGDA 104](https://pgda.gsfc.nasa.gov/products/104)
- Zenodo record 10.5281/zenodo.17954508 holds this data under licence CC-BY-4.0. Files are one ZIP per region, 1.05 GB to 4.35 GB each (Amundsen Rim 1.78 GB, Haworth 4.35 GB, de Gerlache-Kocher 2.11 GB, etc.), plus a README listing region bounding boxes (13 regions between lat -83.5 and -89.8). Inner file formats and baseline values not inspected. VERIFIED via Zenodo API — [Zenodo record](https://doi.org/10.5281/zenodo.17954508)
- Illumination, Earth visibility and PSR: PGDA product 69 lists average solar illumination (AVGVISIB), permanent shadow (LPSR), Earth visibility, each at 240 m/px (65-90 deg), 120 m/px (75-90 deg), 60 m/px (85-90 deg), both poles; sky visibility 240 m only. Formats IMG, JP2, GeoTIFF (added 2025-03-20) and Cloud-Optimized GeoTIFF. Licence not stated; cite Mazarico et al. 2011, Icarus 211, 1066-1081, doi:10.1016/j.icarus.2010.10.030. The page has some mismatched links, so verify filenames. VERIFIED — [PGDA 69](https://pgda.gsfc.nasa.gov/products/69)
- Files: `http://imbrium.mit.edu/EXTRAS/ILLUMINATION/JP2/LPSR_65S_240M_201608.JP2`, `LPSR_75S_120M_201608.JP2` (plus 85S presumably, only 65/75 seen in my listing grep, which was truncated to 12 lines) exist. `https://pgda.gsfc.nasa.gov/data/MoonIllumination/AVGVISIB_85S_060M_201608.TIF` is 33,994,464 bytes and a Range request returned 206. I did not confirm the exact COG filenames. VERIFIED by curl for the TIF; LPSR TIF/COG names UNVERIFIED.
- Diviner rock abundance (Bandfield et al. 2011, JGR 116, E00H02, doi:10.1029/2011JE003866): PDS GDR Level 3 product, simple cylindrical, 32 ppd (about 950 m/px at equator), latitude -60 to +60 only, values 0-1 (fraction), 10 nighttime lunar-hour maps plus an all-hours average, formats .IMG, .JP2 (geotagged), .LBL. VERIFIED — [ODE GDR_L3 page](https://ode.rsl.wustl.edu/moon/pagehelp/Content/Missions_Instruments/LRO/DIVINER/GDR_L3.htm). Data path listed there: `https://pds-geosciences.wustl.edu/lro/lro-l-dlre-4-rdr-v1/lrodlr_1001/data/gdr_l2/` (the page does not say that path holds RA files; not opened by me).
- Newer Diviner Global High-Resolution Mosaics: 128 ppd, 70S-70N, include rock abundance at slope-adjusted midnight, DOI 10.17189/wj0s-w188. SNIPPET only — [ODE GHRM page](https://ode.rsl.wustl.edu/moon/pagehelp/Content/Missions_Instruments/Lunar%20Reconnaissance%20Orbiter%20(LRO)/DIVINER/GHRM.htm). A search also reported one radar paper citing a +/-70 deg limit; conflict with the +/-60 figure not resolved (probably product-version dependent).
- Diviner rock abundance sensitivity: a search result said the data are sensitive to rocks larger than about 0.5 m, with more smaller rocks likely present. SNIPPET — not a primary-source quote.
- PGDA also lists "Large-Scale Roughness Properties of the Lunar Poles" and "A New View of the Lunar South Pole from LOLA" in its catalogue (titles seen in product index; contents not opened). PARTIAL.
- A published polar rock proxy: 70-cm Earth-based radar polarization ratio at 450 m resolution (60-90 deg S, Campbell et al. 2006 Icarus 180). SNIPPET only — [ADS](https://ui.adsabs.harvard.edu/abs/2006Icar..180....1C/abstract). Not a ready browser layer.
- CORS: when sending an `Origin:` header, neither `pgda.gsfc.nasa.gov` (5 m GeoTIFF) nor `imbrium.mit.edu` (LDEM label) returned `Access-Control-Allow-Origin`. VERIFIED by curl.

### Inferences
- The app can read a window from a stripped GeoTIFF or COG via Range through a thin proxy (or pre-bake tiles). Browser-direct reading of PGDA/imbrium will probably fail on CORS. Plain IMG at 20 m is trivially Range-readable by row offset.
- The Zenodo ZIPs are 1-4 GB each; a proxy cannot cheaply Range into a ZIP unless entries are stored uncompressed. Pre-processing offline into small slope-fraction summary JSON per region is the realistic route.
- There is no Diviner-derived rock layer for the south pole (outside +/-60), so any rock layer at the pole would be absent or a coarse radar proxy. The honest option is to label rock abundance as "not assessed poleward of 60 deg".

### Gaps
- LROC NAC boulder / rock-size-frequency maps, Mini-RF, and CLPS site data products: I did not open any source on these in the time budget. No claim is made. A public global NAC boulder map was not found.
- Baselines of the multi-baseline slope/VRM maps in the PGDA 104 archive were not read (ZIP contents not inspected).
- Licence of PGDA/imbrium files not stated on the pages (NASA data are generally public, but I have not seen the terms; the page only links "Reproduction Guidelines").
- Exact file size of the 20 m polar LDEM and whether an official 20 m slope map is distributed (versus computing slope from the DEM) not established.

## 2. Standard thresholds

### Takeaway
The only agency threshold I could verify is from NASA HLS/Artemis III briefings: landing slope < 10 deg evaluated over 100 m, EVA slope < 20 deg over 2 km. The oft-cited "5-6 deg" is NOT confirmed as a slope limit: "6 deg" is the latitude requirement; "5 deg" appears in an academic paper (and a Scoville slide, snippet) as a conservative screening choice, and "8 deg" is a reported crew tilt tolerance (secondary source).

### Cited Findings
- Slide "Key Artemis III Landing Requirements": "1. Land within 6 deg latitude of the South Pole; 2. Surface slope for landing (100m): <10 deg; 3. Surface slope limit for EVA (2km): <20 deg; 4. Direct with Earth (DWE) communication...; 5. Lighting...; 6. Land within 100 m of a target". Later slides: "Slopes for landing must be less than 10 deg ... White contours show regions of continuous 8 deg slope". Same text in a 2025 overview. VERIFIED (downloaded and read) — [Artemis HLS Update, NASA LaRC/ARC EDL Seminar 2024](https://ntrs.nasa.gov/api/citations/20240009596/downloads/ArtemisHLSUpdate_2024.pdf); [Artemis Overview 2025](https://ntrs.nasa.gov/api/citations/20250009323/downloads/ArtemisOverview2025IntSPAPPSChallenge.pdf). The slides cite PGDA product 78 for the 6-degree-latitude map. The slides do not state the DEM baseline used for the "<10 deg" map; "(100m)" appears to be the evaluation scale.
- The slides' "Direct with Earth" criterion: Earth visibility under 25% area masked; surface lighting: solar visibility less than 5% masked. VERIFIED (same slides; the Earth-visibility and 5% wording is a paraphrase of slide captions "Earth visibility < 25%" and "Solar visibility less 5%").
- Academic multi-criteria study (Artemis III sites, arXiv 2406.19863): "The HLS slope requirement is 0 to 5 deg" per the fetched summary; authors "generate a buffer zone around all pixels with a slope of less than 5 deg in the LOLA topography maps", using 5 m/pixel LOLA DEMs, about 90% interpolated; resulting 732 polygons (25 m2 to 25,000 m2), 1,247 candidate points, 14 regions; no rock or roughness criteria. Note this conflicts with NASA's <10 deg slide: the paper's 5 deg is a stricter or differently-sourced figure. The quotes come from a WebFetch summary of the arXiv HTML, not my own reading of the full text. PARTIALLY VERIFIED — [arXiv 2406.19863](https://arxiv.org/html/2406.19863v2)
- NASA ISRU site-criteria presentation (Kleinhenz, LSSW April 2023): baseline slope limit "<= 20 deg" at 5 m/pix LOLA, sun visibility > 75%. SNIPPET only (PDF downloaded but text not extracted) — [NTRS 20230004302](https://ntrs.nasa.gov/api/citations/20230004302/downloads/Kleinhenz_LSSWArtemis3_April2023_ISRUsiteCriteria.pdf)
- Scoville (NASA) Shackleton-de Gerlache ridge slide uses a 100 m-radius landing circle with slope under 5 deg on a LOLA 5 m DTM. SNIPPET only — [NTRS 20210026296](https://ntrs.nasa.gov/api/citations/20210026296/downloads/Scoville%20Final%20presentation%20-%20compressed.pptx.pdf)
- NASA OIG / press: crew operations need landed tilt of no more than 8 deg. SECONDARY (The Register); primary OIG report not found — [The Register](https://www.theregister.com/2026/03/11/nasa_oig_artemis_lander/)
- Chandrayaan-3: primary site "found to be safe for landing with slope less than 4 deg in about 78 per cent of landing area" and alternate site "overall slope of less than 7 deg ... which satisfied the criteria used for the selection of PLS of Chandrayaan-3", with an OHRC-derived hazard map showing about 75% hazard-free. Slope baseline/resolution not stated in the text I read. VERIFIED (downloaded PDF text) — [arXiv 2308.10712](https://arxiv.org/pdf/2308.10712)
- Apollo 15 landed with about 11 deg tilt, "only 1 deg away from the tolerance" (implies about 12 deg tolerance). SNIPPET from a landing-hazard paper; primary Apollo document not opened — [arXiv 2409.09309](https://arxiv.org/html/2409.09309v2)
- Slope uncertainty: LOLA 5 m slope RMS error 1.5-2.5 deg (above). A NASA thermal study uses slope contours/regions "LROC QuickMap terrain slope" of candidate regions with maxima around 33 deg in boxed areas (context only) — [NTRS 20260002598](https://ntrs.nasa.gov/api/citations/20260002598/downloads/2026_SlopeStudy_Generic_Asset_04_03_2026.pdf)
- A remote-sensing paper (SNIPPET) treats low slope (<15 deg), TRI <10 and low rock abundance as suitability, measuring rock abundance as areal fraction of rocks >1 m — [MDPI doi:10.3390/rs15123184](https://doi.org/10.3390/rs15123184) (not opened; the match was possibly another paper in the same result set, so low confidence).
- Autonomous-landing paper: terrain resolution should be at least half the maximum tolerable rock height for hazard detection (no value given). SNIPPET.

### Inferences
- A defensible display set: 5 deg (conservative screening, matches academic/Scoville usage), 10 deg (NASA Artemis III landing slope over 100 m), 20 deg (EVA / ISRU). Label them "illustrative thresholds from public NASA briefings", not mission requirements for any vehicle.
- Baseline matters: LOLA 5 m slope has 1.5-2.5 deg RMS error and 90% interpolation, and the NASA 10 deg requirement is stated "(100m)", so a 20 m-baseline slope is a coarser proxy that underestimates local steepness of small craters and overestimates nothing about boulders.

### Gaps
- Could not verify: CLPS / Blue Ghost / IM-1 / SLIM / Apollo slope tolerances from primary documents (searches returned no payload-guide figures; a "10 deg" for IM-1 appeared only as an executive's design claim, and an "18 deg" IM-1 slope was ambiguous — not used). Not verified: any rock-height or rock-abundance numeric criterion (e.g. 0.3 m) from agency sources.
- Quantitative effect of 5/20/100 m baselines: no source with measured numbers was found; only the qualitative statement (above) from LOLA team material. Do not state numbers.

## 3. Artemis III landing-region studies: criteria and per-site slope fractions

### Takeaway
NASA's public criteria were slope < 10 deg (100 m), EVA < 20 deg, Earth visibility, lighting, within 6 deg of the pole. I did not find any published table of per-site fraction of area under 5/10 deg at 20 m or 5 m baselines; the data to compute it exist in the PGDA 104/Zenodo archive.

### Cited Findings
- 13 candidate regions announced August 2022 (all within 6 deg latitude of the pole); criteria included slope, Earth communication and lighting. Updated to nine regions in October 2024 per NASA. SNIPPET (search summary) — [NASA release](https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-landing-next-americans-on-Moon/)
- Mazarico & Barker used LOLA-derived topography to simulate illumination across the 13 regions (LPSC/USRA abstract 2007). SNIPPET — [USRA abstract](https://www.hou.usra.edu/meetings/Artemis_III_2023/pdf/2007.pdf)
- The Bertone et al. SfS archive provides slope and VRM roughness maps at multiple baselines for all 13 regions (above). VERIFIED.
- Barker states the 20 m polar LDEM is the preferred reference product because shorter-baseline products can show orbit-determination artifacts (a snippet of a NASA presentation; the sentence about about 20 m/pix artifacts was seen in search results, and the downloaded Barker deck confirms 5 m DEM with 90% interpolation). PARTIAL.

### Inferences
- Because no published per-site "fraction below 5/10 deg" table was found, the app should not cite one. It can compute its own from the 20 m DEM and say so.

### Gaps
- Mazarico/Barker/Smith per-site slope-fraction numbers, and the Huang et al. 2023 assessment results, not found or not opened.

## 4. Is a slope-fraction layer at 20 m and a kilometre-scale rock layer defensible? Recommended wording and priorities

### Takeaway
Yes for slope, if labelled as a coarse screening statistic with stated baseline, interpolation fraction and uncertainty; no for rocks at the south pole (no Diviner coverage). Rock abundance at about 1 km is defensible only equatorward of 60 deg and must be labelled as a regional proxy for rocks > about 0.5 m.

### Inferences (my recommendations, not sourced facts)
Suggested caveats:
- Slope: "Slope computed from NASA LOLA elevation data at [20 m] spacing using [2-pixel / 40 m] baseline. It is a terrain screening aid, not a landing-site certification. Slopes at lander-footprint scales (about 1-10 m) are not resolved and are typically steeper; about 90% of 5 m LOLA pixels are interpolated and slope RMS error is 1.5-2.5 deg at 5 m. NASA's Artemis III briefings cite < 10 deg over 100 m for landing; thresholds shown are illustrative, not mission requirements for any vehicle."
- Slope-fraction: "Share of cells within the selected radius below 5, 10 and 20 deg at the stated baseline."
- Rocks: "Rock abundance (Diviner, Bandfield et al. 2011) is a regional thermal estimate at about 1 km, sensitive to rocks larger than roughly 0.5 m; it is unavailable poleward of about 60 deg and says nothing about individual boulders. Hazards such as boulders, small craters and lighting are not assessed."
Ranking by value vs effort:
1. LPSR / illumination overlay (PGDA 69, 240/120/60 m COG/TIF): high value, low effort (single raster, Range supported, citation requirement known).
2. Slope-fraction (<5/<10/<20 deg) from the existing 20 m DEM, with an explicit baseline label and the NASA 10 deg/100 m caption: high value, low effort (already computing slope). Add a second baseline if available (e.g., 5 m site DEMs) to show baseline sensitivity.
3. Per-region summaries from the PGDA 104 Zenodo archive (CC-BY-4.0; pre-processed offline into small JSON, not browser-read): high value for the 13 Artemis regions, moderate to high effort (1-4 GB ZIPs). Rock abundance layer (Diviner 32 ppd JP2, -60..60 only): low value for a polar app, moderate effort; only add for non-polar sites.

### Gaps
- No primary source defines what wording "honest" requires; the above is my judgement.

## 5. PSR data

### Takeaway
LPSR rasters are public from the LOLA team (Mazarico et al. 2011 method) in JP2 and COG/GeoTIFF form at 240/120/60 m for both poles.

### Cited Findings
- See PGDA product 69 entries in section 1: LPSR_65S_240M_201608, LPSR_75S_120M_201608 files in `http://imbrium.mit.edu/EXTRAS/ILLUMINATION/JP2/` verified in a directory listing (85S 60 m file name not seen in my truncated grep); cite Mazarico et al. 2011 — [PGDA 69](https://pgda.gsfc.nasa.gov/products/69)
- Related: Planetary Science Journal paper on secondary illumination in PSRs within Artemis III regions (not opened) — [IOP](https://iopscience.iop.org/article/10.3847/PSJ/ad1b50)

### Inferences
- LPSR is based on LOLA topography at 2016-era processing (files dated 201608) and is a modelled "never-lit" mask, not observed; label as such.

### Gaps
- Exact LPSR COG filenames and sizes, and licence statements, not verified.
