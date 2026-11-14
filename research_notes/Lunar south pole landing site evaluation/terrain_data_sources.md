# Lunar south-pole terrain data sources and accuracy for horizon/visibility analysis

Note on the brief: the PGDA product 90 paper is Barker et al. 2023, Planetary Science Journal 4, 183 (DOI 10.3847/PSJ/acf3e1), not 2016. No 2016 paper by that title was found; the PGDA page itself cites the 2023 paper. The 5 m/pixel precursor is Barker et al. 2021 (Planetary and Space Science, "Improved LOLA elevation maps for south pole landing sites: Error estimates and their impact on illumination conditions"). Research date: 2026-11-14. Items under "Inferences" are my own reasoning or arithmetic, not documented.

## PGDA product 90: grid spec, accuracy, EFFRES/ERR, versions, server, licence

### Takeaway
The product is a 20 m/pixel polar stereographic LDEM (80-90 S) built from track-adjusted LOLA points, with per-pixel EFFRES, RMS height-error (ERR) and slope-error maps. Typical RMS height error is sub-metre to a few metres, and most 20 m pixels contain no LOLA spot (fill factor ~15-75%), so values are interpolated. The server supports HTTP range requests, so partial reads of the 2.7 GB GeoTIFF are feasible.

### Cited Findings
- Grid: south polar stereographic X/Y in metres, MOON_ME frame of JPL DE421. Filenames follow PREFIX_LAT_PIX_STEMS.TIF (LDEM height, LDEC spot counts, LDSM slope, LDRM roughness, LPSR PSR). The product page does not state the reference sphere. — [PGDA product 90](https://pgda.gsfc.nasa.gov/products/90)
- Projection is "stereographic centered at the pole. Scale is true at the pole, with a projection radius of 1737.4 km". Heights are above the reference sphere. — [Barker et al. 2023 (NTRS PDF)](https://ntrs.nasa.gov/api/citations/20230014419/downloads/BarkernewviewSTIupdated.pdf). Older PGDA product 69 states 1737.4 km sphere in polar stereographic — [PGDA 69](https://pgda.gsfc.nasa.gov/products/69)
- Tile table in paper: LDEM_80S_20MPP_ADJ extends to ±304 km (80 S), also 10 m (83 S, ±151.68 km), 30 m (75 S, ±457.44 km), 40 and 80 m (80 S), and 60/120/240 m (60 S, ±931.2 km). — [Barker et al. 2023](https://ntrs.nasa.gov/api/citations/20230014419/downloads/BarkernewviewSTIupdated.pdf)
- Files: base URL https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/. LDEM_80S_20MPP_ADJ.TIF is 2.6 GB, LDSM_80S_20MPP_ADJ.TIF 3.6 GB, LDEM_83S_10MPP_ADJ.TIF 4.8 GB, LPSR_80S_20MPP_ADJ.TIF 148 MB. Also provided: LDEM_*_EFFRES, LDEM_*_ERR (surface height error, m), LDSM_*_ERR (slope error, deg), LDEC (LOLA spots per pixel), LDEM_HILL hillshade (45/45), and XYZI point clouds (LDEM_80S_ADJ.XYZI 13 GB; binary double X,Y,Z,ID). — [PGDA 90](https://pgda.gsfc.nasa.gov/products/90)
- Product page gives no explicit horizontal or vertical accuracy numbers; it directs users to the ERR and EFFRES products. — [PGDA 90](https://pgda.gsfc.nasa.gov/products/90)
- Effective resolution (EFFRES) is defined as "the diameter of the largest circle that can fit between nearby LOLA spots". "Much of the Artemis zone (i.e., poleward of 84 S) has an effective resolution of ~20 m/pix", which is why 20 m is the reference product. Resolution worsens with distance from the pole. — [Barker et al. 2023](https://ntrs.nasa.gov/api/citations/20230014419/downloads/BarkernewviewSTIupdated.pdf)
- Coverage statistics: per-tile track counts range ~1500 to ~12,500, and the fill factor (share of 20 m pixels with at least one LOLA spot) ranges ~15% to ~75%. All pixels, filled or not, get heights by natural-neighbour interpolation. — [Barker et al. 2023](https://ntrs.nasa.gov/api/citations/20230014419/downloads/BarkernewviewSTIupdated.pdf)
- ADJ method: iterative track adjustment. 2% of tracks are removed, the removed tracks are fit with 3-D offsets to the reduced DEM, repeated in 50 batches and 5 iterations. Residuals are RMS ~1-2 m, MAD ~0.35-0.50 m. ~0.1% of points are removed as invalid. Tiles (64 tiles of 80 km, 2 km overlap) are re-aligned to the original LDEM with pc_align; mean translation 0.76 +/- 0.29 m horizontal, 0.32 +/- 0.08 m radial. Overlap differences are 0.00 +/- 0.70 m (median absolute 0.12 m). — [Barker et al. 2023](https://ntrs.nasa.gov/api/citations/20230014419/downloads/BarkernewviewSTIupdated.pdf)
- Track geolocation: RMS total along/cross/radial offsets applied were 8.7/9.5/0.64 m, consistent with LRO orbit reconstruction accuracy. Conservative final geolocation error estimate is 1.00/1.00/0.15 m (along/cross/radial), about an order of magnitude better than before. This is track position error, not DEM pixel height error. MOON_ME (DE421) has "an overall uncertainty of a few meters" relative to the principal-axis frame. — [Barker et al. 2023](https://ntrs.nasa.gov/api/citations/20230014419/downloads/BarkernewviewSTIupdated.pdf)
- Error maps: RMS height/slope uncertainty is derived from an ensemble of "clone" DEMs on 4 representative tiles, fitted as piecewise-linear splines against EFFRES (MAD of fit residuals ~20%, truncated at EFFRES 700 m). The ERR maps are uncertainty in gridded pixel values relative to the true average height/slope within each pixel. — [Barker et al. 2023](https://ntrs.nasa.gov/api/citations/20230014419/downloads/BarkernewviewSTIupdated.pdf)
- 5 m precursor (Barker 2021) for comparison: median RMS height error ~0.30-0.50 m, median RMS slope error ~1.5-2.5 deg in regions of interest; ~90% of 5 m pixels interpolated; interpolation error depends mainly on gap size. — [Barker et al. 2021 (NTRS)](https://ntrs.nasa.gov/api/citations/20205009660/downloads/Mike%20Barker_%20Paper_%20Improved%20Lola.pdf), [PGDA 78](https://pgda.gsfc.nasa.gov/products/78)
- Old versus ADJ: the earlier PDS LDEMs showed orbital-error artefacts (hillshade comparison, Figs 2, A1-A10). A constant horizontal geolocation error produces a large vertical error on slopes. Isolated invalid returns and "streaks" were removed in ADJ; some likely spurious noise points remain visible in NAC comparisons (Fig. 4 points A-C). The PDS-archived PSR map is 60 m/pix; the new one is 20 m. The PGDA page does not describe non-ADJ versions, and "nearly all products carry the ADJ stem". — [Barker et al. 2023](https://ntrs.nasa.gov/api/citations/20230014419/downloads/BarkernewviewSTIupdated.pdf), [PGDA 90](https://pgda.gsfc.nasa.gov/products/90)
- PSR completeness (a proxy for small-feature loss): innermost tile (median EFFRES 20 m) ~70% complete for 1-pixel PSRs, ~90% for >=100 m; outer tile (median EFFRES 56 m) ~40% for 1 pixel, ~90% for >=200 m. — [Barker et al. 2023](https://ntrs.nasa.gov/api/citations/20230014419/downloads/BarkernewviewSTIupdated.pdf)
- Server (tested 2026-11-14 with curl): `HEAD` on LDEM_80S_20MPP_ADJ.TIF returned 200, `Accept-Ranges: bytes`, Content-Length 2696082051, Last-Modified 2023-07-07, ETag present, X-Powered-By Express. A `Range: bytes=0-15` request returned 206 with 16 bytes (`49 49 2B 00 08 00 ...`, i.e. little-endian BigTIFF). No `Access-Control-Allow-Origin` header was returned for a request with an Origin header on LDSM_80S_20MPP_ADJ.TIF (only Accept-Ranges and Content-Length matched my grep), so browser-side fetching from another origin is probably blocked (not verified with a browser). No rate limits documented; none observed in a few requests. — direct test; file listing at [PGDA 90](https://pgda.gsfc.nasa.gov/products/90)
- DOI https://doi.org/10.60903/gsfcpgda-lola-spole redirects (HTTP 302) to https://pgda.gsfc.nasa.gov/products/90 — direct test.
- Mirror: the paper says the LOLA polar gridded PDS products are at https://imbrium.mit.edu/ . https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/ returned HTTP 200 (nginx) on my test, but I did not inspect its contents, and these are the older PDS-archived (non-ADJ) products per the paper. — [Barker et al. 2023](https://ntrs.nasa.gov/api/citations/20230014419/downloads/BarkernewviewSTIupdated.pdf); direct test
- Licence/citation: the page has only a "Data Usage Policy" heading that asks users to cite Barker et al. 2023, Planet. Sci. J., 4, 183 (DOI 10.3847/PSJ/acf3e1) and data DOI 10.60903/gsfcpgda-lola-spole, and links NASA privacy and reproduction guidelines. No explicit licence text. — [PGDA 90](https://pgda.gsfc.nasa.gov/products/90)

### Inferences
- COG overviews: I could not confirm the file has internal overviews or tiling. The header shows BigTIFF only. Check with `gdalinfo` before relying on windowed reads (GDAL /vsicurl/ will work given range support either way).
- Rows of the 20 m grid are 304 km half-extent, so the raster is about 30,400 x 30,400 pixels (2 x 304 km / 20 m); consistent with 2.6 GB (about 2 bytes/pixel if int16, or float16/compressed). Dtype not verified.
- Because the pole region is flagged ~20 m EFFRES but pixel fill is only 15-75%, small features (< ~50 m) are statistically interpolated, not measured.

### Gaps
- Exact ERR/EFFRES numeric values at specific latitudes (Figure 7/8 data) were not extracted from the PDF.
- Whether LDEM_80S_20MPP_ADJ.TIF has COG tiling/overviews, its nodata value and data type (not probed).
- Non-ADJ 20 m product definition and the content of the imbrium.mit.edu POLAR directory.
- Explicit licence text and any rate limiting from PGDA were not found.

## Does 20 m support sub-degree horizons; sensitivity to resolution

### Takeaway
Near-field horizon error is dominated by a few metres of height uncertainty at tens to hundreds of metres range, so it can exceed fractions of a degree if the observer sits at ~1 m; the literature handles this with nested resolutions and by evaluating observer heights of 1-5 m. Far-field topography (50-200 km) is insensitive to the pole DEM's local errors.

### Cited Findings
- Horizon method (Mazarico 2011): horizon computed along 720 sight lines (0.5 deg spacing), nested grids: 5 m/pix LDEM for <5 km, 80 m for 5-100 km, 240 m beyond; Sun as a 2-D extended disc with limb darkening, visible fraction approximated by dividing the disc horizontally at the horizon elevation at disc-centre azimuth. — [Barker et al. 2021](https://ntrs.nasa.gov/api/citations/20205009660/downloads/Mike%20Barker_%20Paper_%20Improved%20Lola.pdf)
- 2023 PSR horizons: "angular elevation of the local horizon is computed in all directions for every pixel using a series of nested maps ... 20 m/pix out to a distance of 7 km and ending with 480 m/pix at a distance of 310 km". — [Barker et al. 2023](https://ntrs.nasa.gov/api/citations/20230014419/downloads/BarkernewviewSTIupdated.pdf)
- Horizon decomposition: near-field component "roughly 100 m away (though sometimes as low as 10s of m, or as high as ~1 km)" and far-field "roughly 50-200 km away". Far-field horizon changes negligibly between locations within a region; unadjusted orbital errors in low-res far-field LDEMs do not significantly affect results since far-field is ~3 orders of magnitude farther and pixels average many spots. — [Barker et al. 2021](https://ntrs.nasa.gov/api/citations/20205009660/downloads/Mike%20Barker_%20Paper_%20Improved%20Lola.pdf)
- Height errors that are metre-scale at 1 m observer height materially change illumination; at 5 m height the effect of DEM uncertainty is "significantly reduced". Clone perturbations are more likely to raise than lower the horizon, so including errors usually gives less favourable illumination than the nominal DEM. — [Barker et al. 2021](https://ntrs.nasa.gov/api/citations/20205009660/downloads/Mike%20Barker_%20Paper_%20Improved%20Lola.pdf), [PGDA 78](https://pgda.gsfc.nasa.gov/products/78)
- Artefacts (spurious "flag-poles"/"pot-holes" from isolated bad returns) become more visible at higher resolution. — [Barker et al. 2021](https://ntrs.nasa.gov/api/citations/20205009660/downloads/Mike%20Barker_%20Paper_%20Improved%20Lola.pdf) (via search summary; see also 0.1% removal in Barker 2023)
- Rocks/boulders and sub-footprint roughness are not modelled; LOLA single-spot height variation ~0.4-0.6 m over highlands (Neumann 2015, cited in Barker 2021). Diviner rock abundance ~0.2-0.5% typical highlands. — [Barker et al. 2021](https://ntrs.nasa.gov/api/citations/20205009660/downloads/Mike%20Barker_%20Paper_%20Improved%20Lola.pdf)
- Artemis HLS landing ellipse requirement 100 m radius, so single-pixel accuracy matters less than neighbourhood statistics. — [Barker et al. 2021](https://ntrs.nasa.gov/api/citations/20205009660/downloads/Mike%20Barker_%20Paper_%20Improved%20Lola.pdf)

### Inferences
- Rule-of-thumb arithmetic (mine): a 2 m height error at 100 m range is atan(2/100) = 1.1 deg; at 500 m it is 0.23 deg; at 2 km, 0.057 deg. So 20 m DEM with ~1-3 m RMS ERR near the pole can give > 0.5 deg horizon error for observers within a few hundred metres of a steep rim; beyond ~1 km, sub-0.1 deg is plausible. This depends on actual ERR values and is not documented in the literature as a threshold.
- Sub-degree accuracy is therefore plausible for mid/far-field horizons (> ~1 km), but not guaranteed for the near-field at 1 m height. For a mast/solar-array height of 5 m or more, errors shrink (documented qualitatively).
- No paper was found that quantifies horizon error versus DEM pixel size directly for 20 m versus other scales; the closest are the clone-based 5 m studies.

### Gaps
- No direct sensitivity study of horizon elevation vs pixel size (e.g. 20 vs 60 vs 240 m) was located.
- Review noting a combined LOLA-photogrammetry 20 m/2 m DEM (from a search snippet) was not verified at source.

## LROC QuickMap and NASA Moon Trek

### Takeaway
Neither offers a documented numeric elevation API. QuickMap is an interactive viewer with LOLA-derived layers and no found public API; Moon Trek exposes OGC REST WMTS tiles (rendered PNG/JPG, so colour-shaded imagery, not elevations) with open CORS on at least some endpoints. For numeric terrain use PGDA GeoTIFFs.

### Cited Findings
- QuickMap layers (2020 update lists): SLDEM2015 slope and azimuth, roughness at several scales, sky/Earth visibility, and Sun visibility at 60, 120, 240 m (LOLA-derived, polar orthographic views), PSR mosaics under LROC NAC layers; custom slope rendering with 16.6 deg mask. — [LROC QuickMap Jan2020 PDF](https://files.actgate.com/quickmap/LROC_QuickMap_Jan2020.pdf), [LROC Spring 2020 update](https://www.lroc.asu.edu/posts/1153). Lists date from 2020; current inventory not checked.
- Fetch of https://quickmap.lroc.im-ldi.com/ returned only the title "QuickMap" (JS app); no terms or API text obtained. Search found no official API documentation; URL state is encoded in a `sat=` query parameter. — [WebFetch of QuickMap](https://quickmap.lroc.im-ldi.com/), search results above
- Moon Trek API doc: OGC RESTful WMTS 1.0.0, template `https://{WMTS endpoint}/1.0.0/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png`; services listed: Equirectangular, North Pole, South Pole; PNG or JPG per ResourceURL in GetCapabilities; missing tile = no coverage. No WCS, elevation query, rate limit, terms, or CORS statement on the page. — [Trek WMTS doc](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=moon)
- Direct test: `https://trek.nasa.gov/tiles/Moon/EQ/LRO_LOLA_ClrShade_Global_128ppd_v04/1.0.0/WMTSCapabilities.xml` returns 200 with `Access-Control-Allow-Origin: *`, tiles 256x256 PNG, layer = "ClrShade" (colour-shaded relief, i.e. rendered image). The tile directory `https://trek.nasa.gov/tiles/Moon/SP/` returns 403 and my guessed SP layer name returned 404; the exact south polar layer identifiers were not found. `https://trek.nasa.gov/moon/` also sends `Access-Control-Allow-Origin: *`. — direct test
- Third-party catalog notes a NASA Open API (api.data.gov key) gateway for WMTS with "US Government Work (Public Domain)" licence; unverified secondary source. — [apis.io listing](https://apis.io/apis/nasa-gov/nasa-gov-wmts-api/)
- NASA PGDA also offers a 30 m/pix 1.1 GB south polar DEM archive (product 92, large-scale models for optical navigation). — [PGDA 92](https://pgda.gsfc.nasa.gov/products/92)

### Inferences
- Moon Trek tiles encode colour not metres unless a layer is a raw-elevation grayscale; I did not find one documented, so assume not suitable for numeric horizon work.
- Scraping QuickMap's internal tile service would be undocumented and of unclear terms; avoid.

### Gaps
- Moon Trek terms of use, official list of south polar layer IDs, any WCS/elevation service: not found.
- QuickMap terms of use, API, and documented limitations (current layer inventory not retrieved).

## Far-field extent and curvature

### Takeaway
Literature practice: include terrain out to ~100-310 km using coarser nested grids (80-480 m pixels), with near-field (<5-7 km) at fine resolution. Curvature must be included for any range beyond a few km.

### Cited Findings
- Nested ranges used in published work: 5 m (<5 km), 80 m (5-100 km), 240 m (>100 km) — [Barker 2021](https://ntrs.nasa.gov/api/citations/20205009660/downloads/Mike%20Barker_%20Paper_%20Improved%20Lola.pdf); 20 m (to 7 km) to 480 m (to 310 km) — [Barker 2023](https://ntrs.nasa.gov/api/citations/20230014419/downloads/BarkernewviewSTIupdated.pdf).
- Far-field horizon features sit roughly 50-200 km away — [Barker 2021](https://ntrs.nasa.gov/api/citations/20205009660/downloads/Mike%20Barker_%20Paper_%20Improved%20Lola.pdf).
- Sun treated as an extended disc; the PGDA illumination product (Mazarico 2011) models a finite disc, hourly steps over the 18.6-year cycle. — [PGDA 69](https://pgda.gsfc.nasa.gov/products/69)

### Inferences (my arithmetic, R = 1737.4 km)
- Curvature drop d^2/(2R): 10 km = 28.8 m; 30 km = 259 m; 100 km = 2.88 km; 300 km = 25.9 km. Horizon elevation of a feature of height h (above observer) at distance d is approximately h/d - d/(2R) radians.
- A 1 km ridge reaches 1.5 deg at d about 29 km (solving 1000 = d(0.02619 + d/3.4748e6)); a 1 km feature at 10 km is 5.7 deg minus 0.3 deg curvature, so it dominates well beyond 1.5 deg; at 38 km without curvature it would give 1.5 deg, so ignoring curvature overestimates the reach. For a 5 km relief feature, 1.5 deg is reached at about 94 km. Adding the Sun's ~0.27 deg semi-diameter changes these distances by roughly 10-20%.
- A ridge of height h blocks a Sun at elevation e out to d about h/tan(e) before curvature; at e = 1.5 deg, every 100 m of relief matters out to about 3.8 km. Consequently relevant terrain extends to 100+ km for 4-6 km relief.
- Recommended practical design (derived from the documented nested schemes): 20 m to 5-7 km, 80-120 m to 100 km, 240-480 m to 300 km; for a pole-centred 20 m LDEM the 80 S edge is ~304 km, so use the 60 S 60/240 m products beyond that.

### Gaps
- No paper directly gives a minimum radius criterion for a 1.5 deg Sun; figures above are derived.

## Data-use terms and redistribution

### Takeaway
NASA content is generally not copyrighted in the US; request is to cite the data and paper and credit NASA, and not imply endorsement. No explicit PGDA licence text was found, so redistribution of derived tiles appears permissible with citation but is not formally licensed in writing.

### Cited Findings
- PGDA product 90 asks for citation of Barker et al. 2023 (PSJ 4, 183) and DOI 10.60903/gsfcpgda-lola-spole; no licence terms stated. — [PGDA 90](https://pgda.gsfc.nasa.gov/products/90)
- NASA media guidelines: content "generally are not subject to copyright in the United States"; NASA should be acknowledged as the source; use must not imply NASA endorsement or promotion of a commercial product; third-party copyrighted material is separately marked. — [NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)
- That page does not contain a non-US-government-site disclaimer. — same source.
- Third-party listing claims the NASA Open API WMTS is "US Government Work (Public Domain)". — [apis.io](https://apis.io/apis/nasa-gov/nasa-gov-wmts-api/) (secondary).

### Inferences
- Suggested attribution for a shipped app: "Terrain derived from LOLA data (NASA/GSFC PGDA product 90): Barker, M. K. et al. 2023, Planet. Sci. J. 4, 183, doi:10.3847/PSJ/acf3e1; data doi:10.60903/gsfcpgda-lola-spole." Include a statement that the app is not endorsed by NASA and that derived tiles are modified/downsampled.
- Keep derived-tile metadata (version ADJ, resample method) with the data.

### Gaps
- NASA's standard "non-US-Government site" disclaimer text was not located; the user should check the current nasa.gov external-link policy page.
- No licence file (CC0/PD dedication) found for PGDA data; legal review recommended for commercial redistribution.
