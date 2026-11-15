# Higher-resolution global and near-global lunar elevation data readable in small windows (as of 2026-11-15)

Legend: [V] = verified by me with curl/HTTP/byte inspection in this session (2026-11-15). [D] = read in a page or label only. [?] = not confirmed.
"CORS" below means a response header `Access-Control-Allow-Origin` was present when I sent `Origin: https://example.com`.
All int16 LOLA products use SCALING_FACTOR 0.5 m/DN and are heights relative to a 1737.4 km sphere (not a geoid) unless stated.

## 1. Does LOLA LDEM_256 exist, where, and why did LDEM_256.IMG return 404?

### Takeaway
LDEM_256 exists but is never a single file. At imbrium.mit.edu it is 4 hemisphere-quarter IMG tiles (each 2.12 GB, same size as LDEM_128), and the 404 is only because the name `LDEM_256.IMG` does not exist. Each tile is row-major raw int16 with HTTP Range support, so it can be read exactly like LDEM_128.IMG. The same files are mirrored at PDS Geosciences, and a single-file 118 m GeoTIFF exists on the USGS S3 bucket (with CORS). Moon Trek does not give metric elevation.

### Cited Findings
- [V] `LDEM_256.IMG` returns 404 at https://imbrium.mit.edu/DATA/LOLA_GDR/CYLINDRICAL/IMG/LDEM_256.IMG. The directory listing at https://imbrium.mit.edu/DATA/LOLA_GDR/CYLINDRICAL/IMG/ has these 256 ppd files instead (dated 2019-06 for LDEM; each 2,123,366,400 bytes): `LDEM_256_00N_90N_000_180.IMG`, `LDEM_256_00N_90N_180_360.IMG`, `LDEM_256_90S_00S_000_180.IMG`, `LDEM_256_90S_00S_180_360.IMG` (plus matching `.LBL`). Also in the listing: `LDEM_512_*` 16 tiles (45-degree lat bands x 90-degree lon, each 2,123,366,400 bytes), `LDEM_128.IMG` (2,123,366,400), `LDEM_64.IMG` (530,841,600), `LDEM_16.IMG`, `LDEM_4.IMG`.
- [V] Label https://imbrium.mit.edu/DATA/LOLA_GDR/CYLINDRICAL/IMG/LDEM_256_90S_00S_000_180.LBL: LINES 23040, LINE_SAMPLES 46080, SAMPLE_TYPE LSB_INTEGER 16-bit, SCALING_FACTOR 0.5, OFFSET 1737400, "pixel registered", "Map values are relative to a radius of 1737.4 km", "may be edge artifacts at [the 45-degree latitude band] boundary", gaps filled with GMT `surface` (tension 0.5, anisotropy 0.5), version V3.0, data through LRO_ES_52, product dated 2017-09. One row = 46080 x 2 = 92,160 bytes. Tile covers lat -90..0 and lon 0..180 E; one row is 0.00390625 deg (256 ppd, ~118.45 m at the equator).
- [V] Range support on `LDEM_256_90S_00S_000_180.IMG`: `-r 1000-1015` returns `206 Partial Content`, `Content-Range: bytes 1000-1015/2123366400`. imbrium is nginx/1.18; `Accept-Ranges: bytes` confirmed on LDEM_128.IMG (HEAD: 200, Content-Length 2123366400).
- [V] No CORS header from imbrium.mit.edu (neither on HEAD nor on a 206 response with an Origin header sent). A browser app therefore needs a same-origin proxy (the existing app presumably already has one) unless the host changed.
- [V] Other formats at imbrium: `CYLINDRICAL/FLOAT_IMG/` (float32 versions, e.g. `LDEM_128_FLOAT.IMG` 4,246,732,800 bytes; `LDEM_256_*_FLOAT.IMG` 4.25 GB each), `CYLINDRICAL/JP2/` (e.g. `LDEM_128.JP2` 647,268,591 bytes; `LDEM_256_90S_00S_000_180.JP2` 500,914,193; `LDEM_256_00N_90N_000_180.JP2` 427,545,233), plus `PA/`. There is no GeoTIFF folder. A set of `LDEM_1024_*` JP2 tiles (15 deg x 30 deg tiles, ~80-100 MB each, file dates March 2011) also sits in the JP2 folder; these are an old (2011) version, I did not verify their full coverage or ppd label [D: names only].
- [V] PDS Geosciences mirror, same sizes and Range support (HTTP/2 200, `accept-ranges: bytes`): https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/ldem_128.img (2,123,366,400) and `.../ldem_256_90s_00s_000_180.img` (2,123,366,400). No CORS header observed there either.
- [V] USGS Astrogeology S3 bucket hosts a single-file LOLA 118 m GeoTIFF: https://planetarymaps.usgs.gov/mosaic/Lunar_LRO_LOLA_Global_LDEM_118m_Mar2014.tif (302 redirect to https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Lunar_LRO_LOLA_Global_LDEM_118m_Mar2014.tif). 8,494,203,833 bytes, 206 Range OK, `Access-Control-Allow-Origin: *`, `Accept-Ranges: bytes`. Header inspected: BigTIFF, 92160 x 46080, int16 signed, no compression, 1 row per strip (not tiled), GDAL-style tags. Label (`...118m_Mar2014.lbl`): equirect, 256 ppd, pixel 118.4506 m, multiplier 0.5, radius 1737400, DataSetId LRO_LOLA_DEM_Global_256ppd_v6 / LDEM_256_FLOAT_JULY2013 v2.0 -- i.e. an older (July 2013, v2) LOLA grid, not the 2017/2019 V3.0 one. S3 object listing of `mosaic/` also shows `Lunar_LRO_LOLA_DEM_Global_128ppd_v04.cub` (2,123,436,131).
- [V] Moon Trek (https://trek.nasa.gov/tiles/Moon/EQ/) does expose an OGC RESTful WMTS with CORS `*`, but only for rendered images. The elevation-named layer `LRO_LOLA_DEM_Global_128ppd_v04` (WMTSCapabilities.xml returns 200) delivers 8-bit gray+alpha PNG tiles (checked a tile with `file`: "256 x 256, 8-bit gray+alpha"), so no metric height. See section 6.

### Inferences
- A window read from an LDEM_256 hemisphere tile with Range is straightforward: row `r`, column `c`, byte offset = (r*46080 + c)*2. Rows are 92,160 B apart, so a 50 km window at the equator (~424 px) is 424 range requests of ~848 B (~360 KB payload), or a single contiguous Range of ~39 MB covering all rows. Per-row requests are required for efficiency.
- The 4-tile file naming (hemisphere x 180 deg) means a lookup has to pick one of four tiles; windows straddling lon 0/180 need two tiles. The 118 m S3 GeoTIFF avoids that (single file) but is the older v2 data and also row-strips.
- Critical for the south pole: in an equirectangular grid a 50 km window at 85 S spans 1/cos(85 deg) = 11.5x more longitude. 50 km = 1.65 deg of latitude = 423 rows, but ~19 deg of longitude = ~4900 columns at 256 ppd (~9.8 KB per row, ~4.1 MB total). Above ~85 S use the polar stereographic products (section 5).

### Gaps
- Did not check whether imbrium's LDEM_256 data is bit-for-bit what the PDS archive calls V3.0 for all four tiles (only the south-west one's label was read).
- Did not verify coverage/ppd of the `LDEM_1024` JP2 tiles or whether the JP2 files are tiled/JPX with random access (JP2 partial decoding needs a JPEG2000 decoder in the browser; not tested).

## 2. SLDEM2015 (LOLA + Kaguya TC merged, ~59 m, 60 S-60 N) and Kaguya/SELENE products

### Takeaway
SLDEM2015 at 512 ppd (59.2 m/px) is available as one single 22.65 GB uncompressed int16 GeoTIFF on the USGS S3 bucket with Range support and CORS `*`, plus as JP2 and float32 IMG tiles at imbrium.mit.edu (no CORS). It is the best global product readable today by Range requests, but it stops at 60 S, so it does not cover the south pole itself.

### Cited Findings
- [V] USGS single-file product: https://planetarymaps.usgs.gov/mosaic/LolaKaguya_Topo/Lunar_LRO_LOLAKaguya_DEMmerge_60N60S_512ppd.tif (302 -> https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/LolaKaguya_Topo/Lunar_LRO_LOLAKaguya_DEMmerge_60N60S_512ppd.tif). Content-Length 22,650,225,603; Range `206`; `Access-Control-Allow-Origin: *`. BigTIFF, 184,320 x 61,440, int16, no compression, 1 row per strip (blockYSize 1; the sibling `..._geo.vrt` says BlockXSize=184320, BlockYSize=1), geotransform origin -180, 60, step 0.001953125 deg; VRT scale 0.5, nodata -32768. The `.lbl` (https://astrogeology.usgs.gov/ckan/dataset/21cbb67a-ea2b-445b-8ff7-c69cae74689e/resource/7590b7b7-c185-4283-b687-15107dea50fa/download/lunar_lro_lolakaguya_demmerge_60n60s_512ppd.lbl) gives Equirectangular, radius 1737400 m, lat -60..60, 512 pixel/deg, PixelResolution 59.2253 m, Multiplier 0.5, "ProductVersionId SLDEM2015". Sibling shade file `Lunar_LRO_LOLAKaguya_Shade_60N60S_512ppd.tif` 11,325,604,841 bytes.
- [V] imbrium.mit.edu SLDEM2015 tree (https://imbrium.mit.edu/DATA/SLDEM2015/): `GLOBAL/JP2/` has `SLDEM2015_128_60S_60N_000_360.JP2` (495,358,026), `SLDEM2015_256_60S_60N_000_360.JP2` (1,664,615,694), `SLDEM2015_512_60S_60N_000_360.JP2` (5,463,941,625), `SLDEM2015_DATA_QUALITY.JP2` (13,049). `GLOBAL/FLOAT_IMG/` has `SLDEM2015_128_60S_60N_000_360_FLOAT.IMG` (2,831,155,200), `SLDEM2015_256_60S_60N_000_360_FLOAT.IMG` (11,324,620,800), `SLDEM2015_DATA_QUALITY_FLOAT.IMG` (259,200). `TILES/FLOAT_IMG/` and `TILES/JP2/` have six 256 ppd tiles (e.g. `SLDEM2015_256_60S_0S_000_120_FLOAT.IMG` 1,887,436,800; the JP2 versions ~275-281 MB each) and 512 ppd FLOAT tiles of 30 deg x 45 deg (`SLDEM2015_512_00N_30N_000_045_FLOAT.IMG` 1,415,577,600 bytes, etc.). There is no int16 .IMG for SLDEM2015 there, only float32 IMG and JP2. Range on `SLDEM2015_256_60S_60N_000_360.JP2` and on `SLDEM2015_256_60S_0S_000_120_FLOAT.IMG` returns 206 [V]. No CORS [V by absence].
- [D] Precision: SLDEM2015 combines LOLA and SELENE TC stereo (Barker et al. 2016, Icarus 273, 346) with typical vertical accuracy ~3-4 m and horizontal ~ 60 m posting; USGS says reference is a 1737.4 km sphere, public domain ([USGS](https://www.usgs.gov/media/images/lro-lola-and-kaguya-terrain-camera-dem-merge-60n60s-512ppd), [NASA SVS](https://svs.gsfc.nasa.gov/cgi-bin/details.cgi?aid=4720)). Not re-verified against the paper.
- [V] Slope/azimuth derived products also at imbrium (`/DATA/SLDEM2015_SLOPE/`, `/DATA/SLDEM2015_AZIMUTH/`; README states 64/128/256/512 ppd, 256 and 512 ppd tiled).
- [D] JAXA DARTS hosts the original SELENE TC DTM products: https://darts.isas.jaxa.jp/datasets/sln-l-tc-4-dtm-ortho-v3.0/ (DTM/ortho v3.0, 10 m/px stereo-derived, per-scene), https://darts.isas.jaxa.jp/datasets/darts:sln-l-tc-5-dtm-map-v2.0/ and the SLDEM2013 page https://darts.isas.jaxa.jp/en/datasets/sln-l-tc-5-sldem2013-v1.0 (older merged LOLA/TC product); a mesh search app exists. I did not curl any DARTS file, so Range/CORS/size is [?].
- [D] USGS re-processed Kaguya TC stereo DTMs (Ames Stereo Pipeline, aligned to LOLA, 7-37 m/px, vertical precision ~4 m, CC0, Cloud Optimized GeoTIFFs, no account) at `s3://astrogeo-ard/moon/kaguya/terrain_camera/usgs_dtms/` ([AWS registry](https://registry.opendata.aws/jaxa-usgs-nasa-kaguya-tc-dtms/)); STAC collections exist at https://stac.astrogeology.usgs.gov/api/collections (`kaguya_terrain_camera_usgs_dtms_v2`, `..._v2_equi`, `..._v2_southpolar`, `..._v2_northpolar` [V: seen in collection list]). These are per-stereo-pair scenes, not global mosaics. Not curled.
- [V] Kaguya TC ortho global mosaics are on the same bucket (e.g. `Lunar_Kaguya_TC_Ortho_Global_4096ppd_v02.jp2` 194.7 GB) but those are imagery, not elevation.

### Inferences
- Window cost for SLDEM2015 512 ppd GeoTIFF at the equator: 50 km = ~844 px; row stride 368,640 B; 844 range requests of 1,688 B each (~1.4 MB payload), or one contiguous ~311 MB range (not sensible). Because the strips are 1 row tall, a client can use `geotiff.js` / hand-rolled offset math without a COG, but 844 requests per window is heavy; a proxy that does the 844 reads server-side and returns a ~1.4 MB binary would be more practical, or bake a small COG or pre-cut tiles.
- At 60 S the same 50 km window is 2x as wide in degrees (cos 60 = 0.5), so ~1.7x more columns than at equator in pixels does not apply (pixels are fixed angular); the window is ~1688 columns wide x 844 rows.
- The merged product is not defined poleward of 60 S, so for the pole the only option is pure LOLA (section 5) or local SfS/NAC (sections 4, 5).

### Gaps
- DARTS file sizes/URLs and Range/CORS behaviour were not tested.
- Did not check the SLDEM2015 DATA_QUALITY map semantics.

## 3. GLD100 (LROC WAC global DTM, 100 m)

### Takeaway
GLD100 exists as a single 10.46 GB uncompressed int16 GeoTIFF on the USGS S3 bucket (79 S-79 N, 100 m/px, Range + CORS `*`), and as 100 m tiles on the LROC data portal. It is stereo-derived (WAC images), noisier than LOLA, and its vertical accuracy is limited, but it reaches 79 S (further south than SLDEM2015).

### Cited Findings
- [V] https://planetarymaps.usgs.gov/mosaic/Lunar_LRO_WAC_GLD100_DTM_79S79N_100m_v1.1.tif -> S3 `mosaic/Lunar_LRO_WAC_GLD100_DTM_79S79N_100m_v1.1.tif`; Content-Length 10,461,394,351; 206 Range; `Access-Control-Allow-Origin: *`. Header: BigTIFF, 109,165 x 47,912, int16 signed, no compression, one row per strip. Label (.lbl): Equirectangular, CenterLongitude 180 (so x origin -5458203 m, lon 0..360), lat -79..79, PixelResolution 100 m, 303.234 px/deg, radius 1737400, DataSetId LRO-L-LROC-5-RDR-V1.0, ProductId WAC_GLD100_100M v1.1. The aux.xml statistics: min -9091, max 10761, mean -442.3 m. Stored as whole metres, Multiplier 1.0.
- [V] LROC portal landing page https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_GLD100 returns 200; individual tiles e.g. `WAC_GLD100_E300N3150_100M`, `WAC_GLD100_P900S0000_100M` (polar), with .IMG and .TIF extra downloads (a tile page lists `WAC_GLD100_E300S3150_100M.TIF` at 473.67 MB [D from search snippet]).
- [V] Colour-shade and DTM variants at USGS: `Lunar_LROC_WAC_GLD100_ClrShade_79s79n_118m_v1_1.tif` (11,185,005,343 bytes; image, not height).
- [D] Scholten et al. 2012, JGR Planets 117, doi:10.1029/2011JE003926 (stereo from LROC WAC; horizontal 100 m posting, effective resolution ~ 3 pixels; vertical accuracy is a few tens of metres in places) -- from page snippets only; not re-read.
- [D] Usage: LROC/PDS products are public NASA data; no licence restriction found on the pages I read. Citation: Scholten et al. 2012.
- [D] Known artefacts: mosaic/tiling seams at orbit boundaries and noise from stereo matching on shaded/low-contrast terrain, large-scale tilts relative to LOLA ([D], general to the product; not tested here).

### Inferences
- Window cost: 50 km = 500 px; 500 range requests of 1,000 B each (~0.5 MB) from a row stride of 218,330 B; same remarks as above. Compared with LOLA 118 m, GLD100 adds no extra horizontal resolution except 100 m vs 118 m; its main value is coverage to 79 degrees and independence from LOLA track gaps, at the cost of lower vertical quality. For this app, LOLA is almost certainly better near the pole.

### Gaps
- Did not curl the LROC portal tile files (they likely redirect to pds.mcp.nasa.gov like NAC DTMs; see section 4).
- No quantified artefact numbers read from the paper.

## 4. LROC NAC DTMs (1-5 m)

### Takeaway
NAC DTMs are catalogued per-site at https://data.lroc.im-ldi.com/lroc/rdr_product_select (and `view_rdr_product/<NAC_DTM_...>` pages), and the files are served via redirect to NASA's PDS Imaging node (pds.mcp.nasa.gov), which supports Range and has CORS `*`. They are per-stereo-pair DTMs (small, patchy coverage), 1-5 m/px, sizes hundreds of MB to ~10 GB. There is no global product. Coverage exists for Apollo sites, Chandrayaan-3, Shackleton, Malapert, Nobile (Mons Mouton area); no IM-1 (Malapert A) product was found by search.

### Cited Findings
- [V] Example product page https://data.lroc.im-ldi.com/lroc/view_rdr_product/NAC_DTM_APOLLO16_1_M119747321_50CM: IMG 1.04 GB, extra TIF 532.90 MB and a pyramid TIF `.PYR.TIF` 731.35 MB, lon 15.26-15.42 E, lat -9.65 to -8.71 (title says DTM 2 m with 0.5 m orthophoto). File URLs: `https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/DATA/SDP/NAC_DTM/APOLLO16_1/NAC_DTM_APOLLO16_1_M119747321_50CM.IMG` and `.../EXTRAS/BROWSE/NAC_DTM/APOLLO16_1/NAC_DTM_APOLLO16_1_M119747321_50CM.TIF`.
- [V] Those URLs redirect (302) to `https://pds.mcp.nasa.gov/data/store/img/lunar_reconnaissance_orbiter/pds4/lroc/lro-l-lroc-5-rdr/LROLRC_2001/EXTRAS/BROWSE/NAC_DTM/APOLLO16_1/NAC_DTM_APOLLO16_1_M119747321_50CM.TIF`, which returns 200, `content-length: 558786082`, `accept-ranges: bytes`, and a Range request returns `206`, `content-range: bytes 0-99/558786082`, `access-control-allow-origin: *`. (The old pds.lroc.asu.edu host 301-redirects to pds.lroc.im-ldi.com.) Directory listing of the PDS tree is a JavaScript app, not parseable HTML [V: fetched, got an SPA shell].
- [V] The TIF internal layout (tiled vs strip, compression) of the Apollo 16 file was not parsed (my parser failed on the PDS redirect); the `.PYR.TIF` suggests a pyramid version for the LROC web viewer.
- [D] Site examples found via search (all `https://data.lroc.im-ldi.com/lroc/view_rdr_product/...`): Apollo 11 `NAC_DTM_APOLLO11_*` (2 m DTM, confidence map, colour gradient); Apollo 16 two sites (`NAC_DTM_APOLLO16_1_M119747321_50CM`, `NAC_DTM_APOLLO16_2_M152770233_50CM`); Apollo 17 `NAC_DTM_APOLLO17_2M_MOSAIC_60CM` (2 m DTM, 0.6 m orthophoto, 9.85 GB); Chandrayaan-3 landing site (pre-landing) `NAC_DTM_VIKRAMSITE1_M1442997156_100CM` and `..._M1443025251_100CM` (1 m orthophoto, ~3 m DTM per search summary); Mons Mouton / Nobile `NAC_DTM_NOBILE03`, `NAC_DTM_NOBILE04` (~3 m/px, centre ~ -84.47, 32.34); Shackleton rim `dtm_detail/182` (DLR-made, ESA lander site; 2010/2013) and 2013 LROC news "New NAC Topography Released" (https://www.lroc.im-ldi.com/news/709, brings archive to 112 DTMs, includes Shackleton, Malapert massif, Connecting Ridge). LROC `NAC_ROI_SHKLTNPKLO2` is an image mosaic (not DTM).
- [D] LROC NAC DTMs are made from geometric stereo pairs; "not all of the stereo pairs have been made into DTMs" (https://data.lroc.im-ldi.com/lroc/dtm_detail/182). Also in ODE: https://ode.rsl.wustl.edu/moon/pagehelp/Content/Missions_Instruments/LRO/LROC/SDR/SDNDTM.htm.
- [D] An arXiv preprint (https://arxiv.org/html/2602.14993v1, not peer reviewed) calls LROC NAC DTMs the current standard at ~1 m for surface operations.
- [?] No LROC NAC DTM found for IM-1 (Malapert A, 80.1 S) or IM-2 (Mons Mouton plateau beyond the generic Nobile/Mouton DTMs); the Chandrayaan-3 site (~69.4 S, 32.3 E) is covered by the pre-landing DTMs.
- [D] Licence: LROC/PDS data are public NASA data, no restrictions stated on the product pages read.

### Inferences
- Finding a DTM for a site: query the LROC RDR product selector (https://data.lroc.im-ldi.com/lroc/rdr_product_select) with bounding box, or use the per-product lat/lon extents on each `view_rdr_product` page; a bake script could scrape these into a small JSON index (name, bbox, resolution, IMG/TIF URL). The ODE (ode.rsl.wustl.edu/moon) also lists SDR NAC DTM products.
- Since the PDS host honours Range and CORS, a browser can read windows from NAC TIFs directly if the TIF is tiled/COG; if it is strip-based, a proxy or bake step is easier. A 50 km window at 2 m is 25,000 px square, larger than most NAC DTMs (typically ~10-20 km wide), so the practical unit is "the whole DTM" (500 MB-1 GB for a few-km site) -- hence bake/clip for the app.
- The vertical datum is height relative to the 1737.4 km sphere in the NAC DTM labels [D, standard for LROC RDR; I did not open a label this session].

### Gaps
- Did not retrieve the full list of all NAC DTMs (count ~112 as of 2013; more since).
- Did not parse TIF internal layout, compression, or confirm datum from a label.
- IM-1/IM-2 site DTMs not confirmed to exist.

## 5. South polar products beyond the 20 m PGDA LDEM_80S_20MPP_ADJ

### Takeaway
There are several true 5 m / 10 m polar LOLA products, several already COG with Range support. The best-for-browser ones: the USGS-hosted `ldem_87s_5mpp_cog.tif` (87-90 S, 4.2 GB COG, 512 px tiles, Range + CORS `*`), the PGDA 20 m / 10 m COGs (Range, no CORS), and imbrium polar IMG files (5 m/10 m/20 m raw int16, Range, no CORS). Higher-quality SfS/NAC-derived 5 m DEMs for the 13 Artemis III candidate regions are on Zenodo as zip archives (not windowable). A 1 m Haworth SfS DEM exists on the USGS S3.

### Cited Findings
- [V] imbrium polar IMG (https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/), int16, polar stereographic, 0.5 m/DN relative to 1737.4 km: south files: `LDEM_875S_5M.IMG` (1,840,545,792 B; 30336 x 30336), `LDEM_875S_10M.IMG` (460,136,448), `LDEM_875S_20M.IMG` (115,034,112), `LDEM_85S_10M.IMG` (1,840,545,792), `LDEM_85S_20M.IMG` (460,136,448), `LDEM_85S_40M.IMG` (115,034,112), `LDEM_80S_20M.IMG` (1,848,320,000), `LDEM_80S_40M.IMG` (462,080,000), `LDEM_80S_80M.IMG` (115,520,000), `LDEM_75S_30M.IMG` (1,860,012,032), `LDEM_75S_60M.IMG`, `LDEM_75S_120M.IMG`, `LDEM_60S_60M.IMG` (1,926,963,200), `LDEM_60S_120M.IMG`, `LDEM_60S_240M.IMG`, `LDEM_45S_100M.IMG` (1,658,880,000) etc. JP2 versions in `POLAR/JP2/` (e.g. `LDEM_875S_5M.JP2` 185,186,696; `LDEM_85S_10M.JP2` 231,368,857; `LDEM_80S_20M.JP2` 267,689,172) and float in `POLAR/FLOAT_IMG/`. Label of `LDEM_875S_5M`: "5m/pix... true at the pole in polar stereographic (spherical) projection", LINES 30336, SAMPLE_TYPE LSB_INTEGER, SCALING 0.5, OFFSET 1737400, DERIVED_MIN -8760, MAX 4744. Range on `LDEM_875S_5M.IMG` and `LDEM_80S_20M.IMG`: HEAD `Accept-Ranges: bytes` [V]. No CORS [V by absence]. These are the older (2016/2017 vintage, "preliminary LOLA data" wording in label) polar grids; the 20 m + 5 m PGDA products are the track-adjusted newer ones.
- [V] Polar IMG window cost: row stride 60,672 B for 5 m (30336 x 2); a 50 km window = 10,000 px -> 10,000 rows x 20,000 B = 200 MB raw -- too big; a 5 km window = 1000 px = 1000 requests of 2 KB (2 MB). At 20 m (80S_20M: 2.05 km? compute: 1.848e9 bytes/2 = 924e6 px -> 30400 px/side) 50 km = 2500 px -> 2500 requests of 5 KB (12.5 MB raw).
- [V] USGS S3 `Lunar_safed/LMAP/SouthPolar/ldem_87s_5mpp_cog.tif` (https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Lunar_safed/LMAP/SouthPolar/ldem_87s_5mpp_cog.tif), 4,200,862,545 B; Range 206; CORS `*`; BigTIFF COG with 40000 x 40000 px, float32, deflate + predictor 2, 512 x 512 tiles (6,241 tiles); README (`ldem_87s_5mpp_README.txt` in same folder): 97 fields of 20 x 20 km with 2 km overlap, blended; typical RMS residual 30-55 cm between fields; polar stereographic, MOON_ME frame (DE421), pixel-registered; "interpolation fill-in of empty pixels". Companion: `ldem_87s_5mpp_hillshade_cog.tif` (806,457,378 B). Mean compressed tile size near the centre: 656,657 B (measured over 400 central tiles) of 1,048,576 B raw. => 50 km window (10,000 px = ~20 x 20 tiles) ~ 263 MB at full resolution; 2 km x 2 km (400 px) = 1-4 tiles = 0.7-2.6 MB.
- [V] PGDA copy: https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/87S/ldem_87s_5mpp.tif (3,465,285,714 B; Accept-Ranges bytes; 206 on Range; tiled 256 px, deflate + predictor 3, 40000 x 40000, float32) plus `ldsm_87s_5mpp.tif` (slope), `ldec_87s_5mpp.tif` (count), `ldem_87s_5mpp_hillshade.tif`. No CORS header [V]. (Page: https://pgda.gsfc.nasa.gov/products/81; description says "pixel-registered").
- [V] PGDA per-site 5 m DEMs (https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/, page https://pgda.gsfc.nasa.gov/products/78): sites Site01 (Connecting ridge), Site04 (Shackleton rim), Site06 (Nobile rim 1), Site07 (Peak near Shackleton), Site11 (de Gerlache rim), Site20/20v2 (Leibnitz beta plateau), Site23 (Malapert massif), Site42 (de Gerlache-Kocher massif), LM1 (Shackleton Rim B). Files `SiteNN_final_adj_5mpp_surf.tif` (LDEM, e.g. Site01 40,980,810 B, Site04 40,980,806 B; Range 206 [V]), `_ldec.tif`, `_slp.tif`, `_toterr.tif`, `_slperr.tif`, `.xyzi` point clouds, 100 clones each. Median RMS Z error ~0.30-0.50 m and slope error 1.5-2.5 deg; ~90% of 5-m pixels are interpolated (Barker et al. 2021, PSS 203, 105119, https://doi.org/10.1016/j.pss.2020.105119). Frame: south polar stereographic, MOON_ME, DE421. No CORS [V].
- [V] PGDA 20 m series COGs (https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/ and page https://pgda.gsfc.nasa.gov/products/90): `LDEM_80S_20MPP_ADJ.TIF` 2,696,082,051 B (30400 x 30400 float32, deflate + predictor 3, 512 tiles, Range 206, no CORS), also `LDEM_83S_10MPP_ADJ.TIF` (4.8 GB), `LDEM_75S_30MPP_ADJ.TIF` (2.7 GB), `LDEM_60S_60MPP_ADJ.TIF` (2.9 GB), `LDEM_60S_120MPP_ADJ.TIF` (785 MB), `LDEM_60S_240MPP_ADJ.TIF` (210 MB), `LDEM_80S_40MPP_ADJ.TIF` (685 MB), `LDEM_80S_80MPP_ADJ.TIF` (181 MB), each with `_ERR`, `_EFFRES`, `_HILL`, LDSM slope, LDEC count. Measured mean compressed tile 596,190 B near the centre of the 20 m file => a 50 km window at 20 m (2500 px = 5-6 tiles per side) ~ 15-21 MB. (The `/data/LOLA_20mpp/` folder URL itself returns 404; products are individually linked from the product page.)
- [V] PGDA also lists as new products: "Enhanced Topography Models for Selected Lunar South Pole Regions with Shape-from-Shading" (https://pgda.gsfc.nasa.gov/products/104, 2026-04-02), "A New View of the Lunar South Pole from LOLA" (https://pgda.gsfc.nasa.gov/products/90), "Improving Lunar Topography with Deep Learning Schrödinger Bridges" (https://pgda.gsfc.nasa.gov/products/106, 2026-05-08; the page itself calls it "a methodological demonstration", ~5-6 m RMS error on test set, not for operational use).
- [V] Zenodo SfS archive https://zenodo.org/records/17954508 (doi 10.5281/zenodo.17954508, CC-BY-4.0, published 2025-12-16): 13 Artemis III candidate regions (Amundsen Rim, Nobile Rim 2, Haworth, Faustini Rim A, de Gerlache Rim 2, Connecting Ridge Extension, Connecting Ridge, Nobile Rim 1, Peak Near Shackleton, de Gerlache Rim, Leibnitz Beta Plateau, Malapert Massif, de Gerlache-Kocher Massif); one ZIP each, 1.05-4.35 GB (e.g. `A3CLR22_11_Malapert_Massif.zip` 2,213,137,537 B; `A3CLR22_2_Haworth.zip` 4,353,812,518; total ~26.6 GB); contents: 32-bit compressed GeoTIFFs, 5 m pixel, Moon (2015) South Polar Stereographic. Bounding boxes in README.md of the record (e.g. Malapert Massif lon -5.66..5.15, lat -86.33..-85.63; Haworth lon -34.98..-12.36, lat -87.39..-86.11). ZIPs are not Range-friendly for windowing without downloading (zip central directory + deflate; may work if entries are stored, not tested). Zenodo CORS/Range not tested [?].
- [V] USGS S3: Haworth SfS 1 m DEM `Lunar_Photoclinometry/Haworth-SfS/Lunar_LROnac_Haworth_sfs-dem_1m_v3.tif` (562,551,423 B) and shade (140,692,598 B) at https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Lunar_Photoclinometry/Haworth-SfS/ (CORS/Range expected from the same bucket; not individually tested).
- [V] USGS S3 also hosts Artemis "84_SouthProject_v2" bundles (`84S.zip` 4.5 GB, `87S.zip` 2.38 GB; READ_ME files) and big NAC mosaics (`LRO_LROC_NAC_SPOLE-90_Mosaic_1m_controlled_cog.tif` 77.2 GB; `NAC_SPOLE_mosaic_1m_cog.tif` 42.6 GB; `ShadowCam_SPOLE-90_Mosaic_1m_cog.tif` 19.9 GB) -- imagery, not heights; the 84S/87S zips contain terrain/mesh data [D, not opened].

### Inferences
- For the app's polar use case, the single most practical file is the S3 5 m COG for 87-90 S (CORS + Range + COG tiles, can be read with geotiff.js from the browser directly; for wide views use overviews if present [?: I did not confirm internal overviews exist; check IFD count] or sample at 20 m from PGDA through a proxy). For 80-87 S, the 20 m/10 m PGDA COGs are COGs but have no CORS, so a thin pass-through proxy (Range forwarding) suffices.
- Neighbouring raw int16 polar IMG at imbrium works with a proxy using row-offset math, but PGDA's newer track-adjusted COGs are more accurate and COG-tiled.
- Vertical datum: PGDA polar COGs are heights in metres (float32) relative to the 1737.4 km reference sphere in the MOON_ME frame [D from README: "surface height Z (meters)"]; they are not geoid heights.

### Gaps
- Overviews in the 87S COG not checked; exact extents (centre of image = pole, ~±100 km) inferred from 40000 x 40000 px x 5 m = 200 km.
- Zenodo ZIP internal layout, Range and CORS not tested.
- "LOLA 10 m" 83S COG Range/CORS not individually tested (same server/behaviour as the 20 m file).

## 6. NASA Moon Trek: tile services, subset/profile services, direct downloads, CORS

### Takeaway
Moon Trek's public tile endpoints (`https://trek.nasa.gov/tiles/Moon/EQ|NP|SP/<layer>/1.0.0/...`) are RESTful WMTS with CORS `*`, but they serve 8-bit PNG shaded/colour images, not metric heights, and the LOLA DEM layer stops at zoom 5 (128 ppd class). There is no elevation-value tile service I could find. Do not use Moon Trek as the elevation source; use it only for context basemaps.

### Cited Findings
- [V] https://trek.nasa.gov/tiles/Moon/EQ/LRO_LOLA_ClrShade_Global_128ppd_v04/1.0.0/WMTSCapabilities.xml returns 200 with `Access-Control-Allow-Origin: *`. Tile URL pattern: `https://trek.nasa.gov/tiles/Moon/EQ/<layer>/1.0.0/default/default028mm/{z}/{row}/{col}.png` (e.g. `.../LRO_LOLA_ClrShade_Global_128ppd_v04/1.0.0/default/default028mm/2/1/1.png` returned 200 PNG, 185,740 B, CORS `*`; the `.jpg` variants 404). Level 0 is 2 x 1 tiles, 256 px, top-left (-180, 90). `LRO_LOLA_DEM_Global_128ppd_v04` and `LRO_LOLA_Shade_Global_128ppd_v04` also have WMTSCapabilities (200); the DEM layer's capabilities list TileMatrix 0-5 (64 x 32 tiles at level 5 => max ~ 64*256 = 16,384 px across 360 deg = ~45 ppd in what the DEM layer's Capabilities list). Sample DEM tile checked: `.../LRO_LOLA_DEM_Global_128ppd_v04/1.0.0/default/default028mm/3/2/3.png` is 256x256 8-bit gray+alpha, 35,493 B.
- [V] Layer-name guesses `Moon_LRO_LOLA_Global_LDEM_118m`, `SLDEM2015_Global_59m`, `LRO_LOLA_LDEM_Global_256ppd` do not exist (404). The Trek tile directory `https://trek.nasa.gov/tiles/Moon/EQ/` returns 403 (no listing).
- [D] Trek API doc: https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=moon says all map layers are OGC RESTful WMTS, with EQ / north-polar / south-polar services; "If the image tile is missing, that means there is no data coverage".
- [D] Moon Trek's web app also has an elevation-profile tool and a subset/download tool backed by Trek web services (e.g. `trek.nasa.gov/moon/TrekWS/...`); I did not locate, test, or confirm a documented public API for these, so [?]. https://trek.nasa.gov/moon/ landing page returns 200 with CORS `*`.

### Inferences
- Because the DEM tiles are 8-bit, any height decoded from them would be quantised to 256 levels over the whole range (~20 km) = ~80 m steps, useless for terrain meshes.

### Gaps
- Could not find a documented Trek elevation-subset or profile REST API; did not test the Trek web app's internal endpoints.
- The exact ppd of the Trek DEM layer at max zoom was not measured.

## 7. Verdict table: can a window be read client-side with Range today, and bytes per 50 km window

All "payload" figures are my arithmetic from verified dimensions unless noted as measured. "Direct" = browser to host with CORS; "proxy" = needs a pass-through that forwards Range headers and adds CORS.

| Product | Resolution / coverage | Access (verified) | Client Range today? | Bytes per 50 km window (equator unless noted) |
|---|---|---|---|---|
| LDEM_128.IMG (current app) | 237 m, global | imbrium, Range yes, CORS no | proxy | 211 px: 211 row requests x 422 B = 89 KB |
| LDEM_256 hemisphere IMG tiles (4) | 118 m, global | imbrium + PDS Geosciences, Range yes, CORS no | proxy; 424 row requests | ~360 KB (848 B x 424); 4.1 MB at 85 S (equirect widening) |
| LOLA 118m GeoTIFF (v2 2013) | 118 m, global | USGS S3, Range yes, CORS yes | direct; row-strip, 424 requests | ~360 KB |
| SLDEM2015 512ppd GeoTIFF | 59 m, 60 S-60 N | USGS S3, Range yes, CORS yes | direct; 844 requests | ~1.4 MB (1,688 B x 844) |
| SLDEM2015 JP2/float tiles | 59-118 m | imbrium, Range yes, CORS no | proxy; float32 doubles bytes | float32 tile: ~2.8 MB; JP2 needs decoder |
| GLD100 GeoTIFF | 100 m, 79 S-79 N | USGS S3, Range yes, CORS yes | direct; 500 requests | ~0.5 MB |
| LOLA polar IMG 20 m (80S_20M) | 20 m, 80-90 S | imbrium, Range yes, CORS no | proxy; 2500 row requests | ~12.5 MB raw |
| PGDA LDEM_80S_20MPP_ADJ COG | 20 m, 80-90 S | PGDA, Range yes, CORS no | proxy; COG tiles | ~15-21 MB (measured ~596 KB/tile, 25-36 tiles) |
| USGS ldem_87s_5mpp_cog | 5 m, 87-90 S | S3, Range yes, CORS yes | direct; COG tiles | ~263 MB at full res (measured ~657 KB/tile x 400); a 5 km window ~2.6 MB |
| PGDA site 5 m LDEMs | 5 m, small sites | PGDA, Range yes, CORS no | proxy; whole file 41 MB | whole site ~41 MB |
| Zenodo SfS 5 m (13 Artemis III regions) | 5 m | Zenodo ZIPs 1-4 GB | no; download + bake | n/a until unzipped |
| LROC NAC DTMs | 1-5 m, per site | pds.mcp.nasa.gov, Range yes, CORS yes | direct if TIF is tiled [?]; otherwise bake | site-sized; whole file 0.5-10 GB |
| Moon Trek WMTS | ~128 ppd image tiles | CORS yes | direct but not metric | not applicable |

What each option would take:
- Zero-effort upgrade: point the proxy at an LDEM_256 hemisphere tile (choose tile by lat/lon, byte offset (r*46080+c)*2); 118 m instead of 237 m.
- Best equatorial/mid-latitude: SLDEM2015 512 ppd from the USGS S3 TIFF (direct from browser, CORS). To cut the 844-request cost, add a small Edge/Node function that fetches the rows server-side and returns a single binary window.
- South pole: use polar stereographic COGs; 87S 5 m COG from S3 is directly readable (use `geotiff.js`); for 80-87 S use PGDA 20 m/10 m COGs through a Range-forwarding proxy.
- Beyond that: bake local clips (COG or small int16 PNG tiles) for each target site from Zenodo SfS and LROC NAC DTMs.

### Inferences
- Latitude is the main gotcha: equirect products widen in pixel terms by 1/cos(lat) per 50 km, so a polar window should come from the polar stereographic COGs, not LDEM_256/SLDEM/GLD100.
- Vertical reference in all LOLA-derived products is a 1737.4 km sphere (OFFSET in labels), not an areoid/geoid; labels explicitly say geoid conversion is a separate step [V from LBL text]. GLD100 and SLDEM2015 follow the same sphere [V from lbl: radius 1737400; "Multiplier" convention differs: GLD100 1.0, LOLA 0.5].

### Gaps
- Licence statements were not found as explicit text for LOLA/GLD100 on imbrium; they are NASA/PDS public data. Zenodo SfS is CC-BY-4.0 [V]; USGS Kaguya TC DTMs are CC0 [D].
- Not tested: actual decode of any window through a client; Range on the Zenodo host; Trek elevation-subset services; JAXA DARTS downloads.
