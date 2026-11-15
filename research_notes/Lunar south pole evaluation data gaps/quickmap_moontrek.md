# QuickMap and Moon Trek: programmatic and embeddable access (tested 2026-11-15)

Evidence labels: [TEST] = I ran curl/script and saw the result; [DOCS] = stated in a fetched page; [JS] = read from the app's own shipped JavaScript or config (discoverable, not documented); [UNVERIFIED].
All CORS tests sent `Origin: https://example.com`.

## 1. QuickMap: URL parameters, embed policy, tile/JSON endpoints, terms

### Takeaway
QuickMap cannot be embedded in an iframe from another origin, and I found no documented or verifiable lat/lon/zoom deep-link parameters in the current (July 2026) build. Its useful programmatic surface is an undocumented CORS-open NAC footprint API (features-api.quickmap.io) and CDN-hosted tile/terrain servers that appear to be internal. Treat QuickMap as a link target only.

### Cited Findings
- Embedding is blocked: `https://quickmap.lroc.im-ldi.com/` returns `x-frame-options: sameorigin` and `content-security-policy: frame-ancestors 'self';`. No `Access-Control-Allow-Origin` on the HTML. [TEST] curl -I on https://quickmap.lroc.im-ldi.com/
- Current QuickMap is a new React/Cesium/OpenLayers SPA (bundle `/assets/index-DeMHb3Go.js`, build time 2026-07-29), developed by Applied Coherent Technology (ACT) for the LROC team at ASU. [TEST] page HTML meta description and bundle string `BUILD TIME 2026-07-29T17:56:05Z`
- The only URL query parameter I could find in the shipped bundle is `?fullscreen` (adds a "minimal" UI class). No `lat`, `lon`, `zoom`, `layers` parser was found by static search. State appears to live in an internal "document" with keys such as `view` (projection, center, resolution/extent, camera) and `queryOpts`, exportable as `quickmap-state.json`; there is a `applyLegacyQueryState` reducer, which suggests old-style query links are still translated, but I could not recover its parameter names. [JS] https://quickmap.lroc.im-ldi.com/assets/index-DeMHb3Go.js
- Old-format deep links existed: a January 2020 release note shows `https://quickmap.lroc.asu.edu/layers?sat=...` and a `proj=22` option; the Oct 2020 release notes say camera position is "stored in permalink" and add "guidance on how to cite Lunar QuickMap on the Permalink pop-up". No current parameter list is published. [DOCS] https://files.actgate.com/quickmap/LROC_QuickMap_Oct2020/index.html (via search snippet for the Jan2020 PDF https://files.actgate.com/quickmap/LROC_QuickMap_Jan2020.pdf)
- Hidden NAC footprint API: `GET https://features-api.quickmap.io/collections/nac.geojson?limit=1&intersects=<minLon>,<minLat>,<maxLon>,<maxLat>` returns HTTP 200 GeoJSON FeatureCollection with `access-control-allow-origin: *`. Sample fetched: feature id 2550241, polygon near (-62..128, -87.8..-88.8), properties include `gid`, `url` (https://data.lroc.im-ldi.com/lroc/view_lroc/LRO-L-LROC-3-CDR-V1.0/M1103289958RC for another item), `published`, `stop_time`, `mapnacpath`. The bundle also calls `...nac.geojson?limit=10&product_id="<id>"`. Provides image footprints/metadata, not elevation or illumination. [TEST] + [JS]
- Tile/terrain hosts referenced in the bundle (a developer tile-source picker): `https://lroc-tiles.actgate.com/tiles`, `https://hermes.actgate.com/tiles`, `https://hermes-tiles.actgate.com/tiles`, `https://tharsis.actgate.com/tiles`, `https://act-test.im-ldi.com/tiles`; lunar terrain `https://dem-tiles.b-cdn.net/lunar/qts_demstack/`; features `https://satview.actgate.com/fcgi-bin/fprovweb` (satellite/ephemeris backend); `/api/v2/maps/` (returned the SPA HTML shell, not JSON). Bare root URLs returned 404 or no response; exact layer-path tile patterns (layer names like `qts_demstack`, formats png) are only revealed through the dev UI placeholder `layername e.g. qts_demstack`. CORS on b-cdn/hermes is `*`, but I could not construct a working tile URL. [TEST] 404 on `/lunar/qts_demstack/0/0/0.png`; [JS]
- Terms: LROC page says PDS-delivered data are public domain; website images (e.g. Featured Images) are copyrighted; educational use permitted with credit "NASA/GSFC/Arizona State University" (or "NASA/GSFC/ASU"); commercial use of LROC images not downloaded from the PDS archive requires prior permission. QuickMap is listed only as a link under "Mapping Tools" with no QuickMap-specific API terms; Lunaserv (the LROC WMS) has a citation requirement and no other stated programmatic terms. [DOCS] https://lroc.im-ldi.com/about/terms
- The LROC-run WMS "Lunaserv" is the documented machine interface, separate from QuickMap (named on the terms page; endpoint URL and CORS not tested by me). [DOCS] https://lroc.im-ldi.com/about/terms

### Inferences
- The hidden endpoints are application back-ends, not published APIs; building a product on them risks silent breakage and there is no stated permission. Use at most for a lightweight "NAC coverage here" indicator via a proxy with caching, and cite NASA/GSFC/ASU.
- Because framing is blocked, "embedding" QuickMap is impossible; a plain `<a target="_blank">` to the root URL is the only safe link, since parameter names are unconfirmed.

### Gaps
- Current QuickMap deep-link syntax (lat/lon/zoom/layers/date): not found in docs or bundle; would need a browser session (open QuickMap, use Share/Permalink, read the URL). I did not use a browser. [UNVERIFIED]
- Working tile URL pattern for LROC WAC/NAC/LOLA hillshade on the actgate/b-cdn hosts, and any QuickMap point-query/sun-angle/illumination JSON API: not found.
- Lunaserv WMS URL and CORS: not tested.

## 2. Moon Trek: documented and discoverable services, CORS, terms

### Takeaway
Moon Trek is far more open: WMTS tiles, a Solr search index, ArcGIS ImageServer DEM services, and tool REST services all answer with `Access-Control-Allow-Origin: *`. Only the WMTS tile service is formally documented; the rest is discoverable via the viewer's public config.json. No terms of use, API key, or rate limits are stated anywhere I found.

### Cited Findings
- WMTS template (documented): `https://{WMTS endpoint}/1.0.0/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png|jpg`; values come from each layer's `WMTSCapabilities.xml`; three services (Equirectangular, North Pole, South Pole); only copyright note is "(c) 2016 Trek"; no terms, no API key mentioned. [DOCS] https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=moon
- Verified working tile and capabilities (HTTP 200, `Access-Control-Allow-Origin: *`): `https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/0/0/0.jpg` (49,475 bytes, image/jpeg) and `.../LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/WMTSCapabilities.xml`. [TEST]
- Directory listing `https://trek.nasa.gov/tiles/Moon/SP/` is 403; my guessed south-pole layer capabilities path `.../SP/LRO_LOLA_ClrShade_South_Pole_Global_120m_v04/...` and a guessed `EQ/LRO_LOLA_ClrShade_Global_128ppd_v04/.../1/0/0.jpg` were 404 (wrong layer names, not an outage). Authoritative layer names: `https://trek.nasa.gov/tiles/Moon/rasters/{eq|np|sp}/list.json` (eq list returned 200, 965 bytes, JSON `Layers.Layer[]` with `UUID`, `title`, `layerProjection`, bounding). I did not fetch the sp list successfully (my one sp/np attempt was only the eq list); fetch `.../rasters/sp/list.json` to get exact SP layer names. [TEST] eq list; [JS] sp/np URLs from config
- Solr-style search API works with CORS `*`: `GET https://trek.nasa.gov/moon/TrekServices/ws/index/eq/searchItems?start=0&rows=3&q=polar` returned 9,391 matching items (numFound) including bookmark items with `title`, `bbox`, `shape`, `layers`, `trekProjection`, e.g. Apollo 11 bbox 23.46991,0.66413,23.49843,0.67824 with layers WAC mosaic plus a NAC mosaic. Variants `sp/searchItems` and `SP/` returned 404 with this query form; the config uses `searchItems?bbox=&key=&start=&rows=&facetKeys=&facetValues=&intersects=&proj=` and `/moon/TrekServices/ws/index/moon/{eq|np|sp}/searchRaster`. [TEST] + [JS]
- Config enumerates the service surface (all under https://trek.nasa.gov/moon/): `TrekServices/ws/elevationProfile{,NP,SP}/calculate | sdistance | multiDEM | multiDEM/interpolated | combined`, `TrekServices/ws/profiler{,NP,SP}/multi`, `TrekWS/rest/{light, los/, slope, path, esp, crater/detect, rock/detect, rockfall/detect, transform/latlon/subset/stream/tiff}`, `TrekWS/rest/cat/{abstract,data/stream,legend/stream,metadata/...}?label=`, `DSBservice/webapi/lroc/CUMINDEX/...` (LROC product index by bbox/point), `TrekServices/ws/model/moon/trekOBJ.zip` and `trekSTL.stl`, ArcGIS feature services under `trekarcgis2/` and `trekarcgis3/` (CLPS_sites, Lunar_Landing_Impact_Sites, A3_Named_regions, Endurance traverse). [JS] https://trek.nasa.gov/moon/jpl/config/config.json
- Viewer tools listed as enabled: sunAngle, lighting, los, slope, dynamicElevation, subset, STL, nacSearch, rockFall (config `menu.menuComponents.tools`). [JS] same config
- Probe results: `TrekWS/rest/light` returned 400 on a bare GET (exists, needs parameters); `TrekWS/rest/los/` returned 405 (POST-only); `elevationProfile/calculate` with a GeoJSON LineString query returned only `{"totalDistance":"0.0"}` and a bare GET returned 204, so its request contract is not figured out. The shipped JS source for these tools was not located. [TEST]
- CORS and framing: HTML and services return `Access-Control-Allow-Origin: *`; HTML has `X-Frame-Options: nasa.gov` and `Content-Security-Policy: frame-ancestors 'self' aelp.smartsparrow.com;`. So the Moon Trek viewer cannot be iframed by arbitrary sites (CSP frame-ancestors overrides the nonstandard X-Frame-Options value). [TEST]
- Viewer version 3.6.29-Moon; trek page itself documents no API/Help beyond the tile API doc (`/moon/help/` is 404). [TEST] https://trek.nasa.gov/moon/
- Permalinks: Moon Trek config lists `permalinkVersions: ["0.1"]` and a share/"mappermalink" menu item, and a 2017 EPSC abstract says users can create URL-encoded links. The URL grammar is not published and I did not recover it. [JS] config.json; [DOCS-snippet] https://meetingorganizer.copernicus.org/EPSC2017/EPSC2017-100.pdf
- Terms, attribution, rate limits: none found on the tile API page, home page, or config. Mirrors of the tile service exist behind api.nasa.gov (needs a free API key) per search snippet. [DOCS] https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=moon; [UNVERIFIED] api.nasa.gov gateway: https://api.nasa.gov/mars-wmts/catalog (Mars, not Moon)

### Inferences
- Bundled tiles (WAC mosaic, LOLA color-shade/hillshade layers once the correct names are read from `rasters/*/list.json`) can reasonably serve as a pole-map background in a browser app, with attribution "NASA/JPL Moon Trek; LRO LROC/LOLA". South-pole imagery needs a polar-stereographic tile matrix set (IAU2000:30120) from that layer's capabilities, not Web Mercator.
- Because no usage policy or rate limit is published and the endpoint is a shared government service, route through a small caching proxy and fetch only needed tiles.

### Gaps
- Layer names for SP/NP tiles and their TileMatrixSet ids (fetch `rasters/sp/list.json` and each layer's capabilities).
- Request contracts for `light`, `elevationProfile*/calculate`, `sunAngle` services; whether a point sun-elevation/illumination time series is returned by any HTTP call.
- Rate limits and official terms of use.

## 3. Point queries: elevation, illumination, visibility via HTTP

### Takeaway
Yes for elevation: Moon Trek's ArcGIS ImageServer `identify` returns LOLA DEM pixel values for a lat/lon (or polar x,y) with CORS `*`, tested. Illumination/sun-angle/visibility point values: no working request found on either site.

### Cited Findings
- Global LOLA DEM (256 ppd, v06; Float32, pixel size 0.00390625 deg, geographic Moon 2000 sphere 1737.4 km): request `GET https://trek.nasa.gov/moon/trekarcgis/rest/services/LRO_LOLA_DEM_Global_256ppd_v06/ImageServer/identify?geometry={"x":0,"y":-89.5}&geometryType=esriGeometryPoint&returnGeometry=false&returnCatalogItems=false&f=json` (geometry URL-encoded) returned HTTP 200, CORS `*`, body `{"objectId":0,"name":"Pixel","value":"-721.5","location":{"x":0,"y":-89.5,"spatialReference":{"wkt":"GEOGCS[\"GCS_MOON\",...]"}},...}`. Same service at y=-89.99 returned value "1274". Service metadata: `.../ImageServer?f=json` (capabilities Image,Metadata,Mensuration). [TEST]
- South-polar DEM (100 m/px, stereographic, units meters from the pole): `GET https://trek.nasa.gov/moon/trekarcgis/rest/services/LRO_LOLA_DEM_SPole45_100mp_v04/ImageServer/identify?geometry={"x":0,"y":0}&geometryType=esriGeometryPoint&returnGeometry=false&f=json` returned `"value":"1277"` at the pole with PROJCS Moon2000_spole (Stereographic_South_Pole, std parallel -90, meters). Convert lat/lon to x,y with the spherical polar stereographic formula using R = 1737400 m, central meridian 0 (matches config `extents.southpole` +/-1,095,700 m). Elevation values are metres relative to the 1737.4 km reference sphere; I did not cross-check absolute values against published LOLA numbers. [TEST] + [JS] config projections
- Equivalent north-pole DEM: `.../LRO_LOLA_DEM_NPole45_100mp_v04/ImageServer` (not tested). [JS]
- Illumination/sun/visibility: the viewer has `sunAngle`, `lighting`, `los` (line-of-sight) and `rockFall` tools backed by `TrekWS/rest/light` (400 on bare GET) and `TrekWS/rest/los/` (405, POST). I could not obtain a successful response or example payload. [TEST] partial
- QuickMap: no point-query, sun-angle, or illumination JSON API discovered; its terrain tiles are on b-cdn.net/actgate hosts with an unrecovered layout. [JS]

### Inferences
- Use the ImageServer `identify` call (through a proxy for caching) as the real elevation lookup for a site; precompute illumination offline from the LOLA data rather than depending on Trek's `light` service until its request format is confirmed.

### Gaps
- Request/response format for `TrekWS/rest/light`, `los`, `slope`, and the `elevationProfileSP/calculate` family.
- Verification of absolute elevation values vs published LOLA-derived site elevations.

## 4. Legitimate "use as data source" patterns and deep-link templates

### Takeaway
Best supported pattern: (a) WMTS tiles as pole-map backdrop and `identify` for elevation, both CORS-open from Moon Trek; (b) plain outbound links for "Explore further". Exact site-specific deep links are NOT confirmed for either viewer; only root URLs are safe.

### Cited Findings
- Safe, verified-to-resolve links (HTTP 200): `https://trek.nasa.gov/moon/` and `https://quickmap.lroc.im-ldi.com/`. [TEST]
- Moon Trek permalink: the viewer builds it via its Share > permalink control (`permalinkVersions: ["0.1"]`); grammar unpublished. The Solr bookmark items give Moon Trek its own site-bookmark objects (bbox + layer list), so a site-specific bookmark exists only for items in the index (Apollo 11/12 seen). [JS] + [TEST]
- QuickMap: `?fullscreen` (minimal UI) is the only confirmed query parameter; a lat/lon template cannot be asserted. A test fetch of `https://quickmap.lroc.im-ldi.com/?lat=-89.9&lon=0` returns the normal 200 SPA shell, which proves nothing about whether the parameters are honoured. [TEST]
- Embedding: neither viewer can be iframed from a third-party origin (QuickMap frame-ancestors 'self'; Moon Trek frame-ancestors 'self' aelp.smartsparrow.com). [TEST]
- Moon Trek also publishes `treklite` (https://trek.nasa.gov/treklite/, in config) as a lighter viewer; embeddability and URL options not tested. [JS]

### Inferences
- Recommended "Explore further" behaviour: open Moon Trek or QuickMap root in a new tab and show the site's lat/lon text beside the link so users can type into the viewer's fly-to search; upgrade to site-specific URLs only after someone copies a real permalink from each viewer's Share dialog in a browser and the app builds the template from that observed format.
- Do not rely on iframes.

### Gaps
- Exact permalink templates for both viewers (needs an interactive browser session; recommended as a follow-up, 10 minutes of work).

## 5. NASA Space Apps 2026 challenge page: Lunar Landing Site Navigator

### Takeaway
I could not locate the challenge's Resources tab; no additional data links or API/data-usage notes were obtained.

### Cited Findings
- 2026 hackathon runs November 14-15, 2026; theme "The Next Frontier"; NASA says several 2026 challenges relate to lunar missions. [DOCS] https://www.spaceappschallenge.org/2026/ and https://science.nasa.gov/universe/nasa-welcomes-all-ages-experience-levels-for-space-apps-challenge/
- Searches for "Lunar Landing Site Navigator" returned only prior-year analogues (2018 Mission to the Moon, 2021 Planetary Lander Video Game, whose resources suggested Moon Trek). Direct fetch of `https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/` returned a Next.js "not found" shell (my guessed slug); the challenge list page had no matching links in raw HTML (client-rendered); WebFetch failed with a certificate error. [TEST]

### Inferences
- Treat Moon Trek (the 2021 lander challenge pointed to it) as plausibly sanctioned for this challenge, but that is unconfirmed for 2026.

### Gaps
- Challenge page and Resources tab content: not retrieved (need correct URL from the challenge listing in a browser).
