# Ephemeris accuracy and method for Sun and Earth positions seen from a lunar surface site (JPL Horizons-centred)

Research date: 2026-11-14. Research budget was about 15 tool calls; several gaps remain and are flagged. Items marked "Live test" were run by me against the Horizons API (3 small queries, spaced several seconds apart) on 2026-11-14.

## 1. Horizons API for a lunar surface observer

### Takeaway
Horizons supports Moon-surface topocentric sites with CENTER='coord@301', COORD_TYPE='GEODETIC', SITE_COORD='E-lon,lat,alt_km' (east-positive for the Moon). QUANTITIES=4 returns airless apparent az/el of the target centre (Azi a-app, Elev), referenced to the local zenith of the reference sphere. The live service on 2026-11-14 used DE441 and the "MEAN_ME (high precision)" lunar orientation. The API returns no CORS header, so a browser needs a server proxy.

### Cited Findings
- Live test: a query with COMMAND='10', CENTER='coord@301', COORD_TYPE='GEODETIC', SITE_COORD='0,-89.54,0', QUANTITIES='4,13', ANG_FORMAT='DEG', STEP_SIZE='1h' against https://ssd.jpl.nasa.gov/api/horizons.api (format=text) returned HTTP 200. The header read: "Target body name: Sun (10) {source: DE441}", "Center body name: Moon (301) {source: DE441}", "Center-site name: (user defined site below)", "Center geodetic : 0.0, -89.54, -1.92914E-13 {E-lon(deg),Lat(deg),Alt(km)}", "Center pole/equ : MEAN_ME (high precision) {East-longitude positive}", "Center radii : 1737.4, 1737.4, 1737.4 km" (a sphere of radius 1737.4 km), "Rel. light bend : Sun, EARTH", "Atmos refraction: NO (AIRLESS)", "Vis. interferer : EARTH (R_eq= 6378.137) km". Column header: "Azi____(a-app)___Elev". — Live test, [Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html)
- Live test: the same site on 2026-11-15 00:00 UT gave Sun az 114.441995 deg, elev +1.366057 deg, Ang-diam 1941.613 arcsec (1h step: elev rising about 0.0037 deg/h). Earth (COMMAND='399', QUANTITIES='4,13,20') gave az 357.381 deg, elev -3.093 deg, Ang-diam 6500.14 arcsec, delta 0.00270594 au (about 404,800 km). — Live test
- The observer-table "Azi (a-app) Elev" definition printed in the live output footer: "Airless apparent azimuth and elevation of target center... Azimuth is measured clockwise from north... Elevation angle is with respect to a plane perpendicular to the reference surface local zenith direction. TOPOCENTRIC ONLY. Units: DEGREES". The Horizons manual labels airless output "a-app" and refracted "r-app". — Live test; [Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html)
- Manual: elevation is "the angular distance above or below the plane perpendicular to the local zenith", and this plane "is not necessarily the visible horizon, due to station elevation" (horizon dip). — [Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html)
- Apparent coordinates account for light-time, deflection of light by large or nearby masses, and stellar aberration. Only the Sun's mass is used for relativistic deflection in one passage; another passage says relativity is included "via 2nd order terms in stellar aberration and the deflection of light due to gravity fields of the Sun (and Earth, for topocentric observers)". Astrometric = "adjusted for light-time aberration only". The live header lists "Rel. light bend: Sun, EARTH". The manual's wording is partly inconsistent about which bodies bend light. — [Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html); live header
- Atmospheric refraction is "Available only for Earth-based sites"; "No refraction effects are modeled for non-Earth sites". So the Moon is always airless. — [Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html)
- Moon longitude is east-positive for site input; the Earth, Moon and Sun are noted as exceptions to the usual westward convention. — [Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html)
- Lunar orientation: the manual says the high-precision lunar rotational-pole model "is available only over the timespan A.D. 1550 - 2650", and outside that Horizons switches automatically to the low-precision IAU model. The manual says the lunar principal axis (PA) frame "is not currently available in Horizons", so Horizons surface coordinates are Mean Earth/polar axis. The manual also says IAU2009 rotation models are used except Earth and Moon, which use higher-precision models. — [Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html)
- Quantity 13 (angular diameter) is "the equatorial angular width of the target body full disk". Quantities 14/15 give apparent sub-observer and sub-solar planetodetic lon/lat on the target. For the Sun, Ang-diam uses radius 695,700 km (live header "Target radii: 695700.0"). — [Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html); live header
- Row limits: TLIST accepts "up to 10,000 discrete output times", and URL length may impose smaller limits. A POST route exists for batch input files. ELEV_CUT and ANG_RATE_CUTOFF exist as output filters. — [Horizons API docs](https://ssd-api.jpl.nasa.gov/doc/horizons.html)
- CORS: live test with an Origin header returned no Access-Control-Allow-Origin header, so browser JS cannot call the API directly. Use a server-side proxy. — Live test (one request)
- Rate limits: the API docs and manual contain no stated rate limit, concurrency cap or terms-of-use text, according to my fetches. A third-party search summary says anecdotally JPL may rate-limit heavy use. The API docs list HTTP 503 as "Service Unavailable". Best practice is sequential requests with a pause between them, and caching. — [Horizons API docs](https://ssd-api.jpl.nasa.gov/doc/horizons.html)
- The manual carries a caution: "IF YOUR CAREER OR SPACECRAFT DEPENDS ON A NON-LUNAR NATURAL SATELLITE OR SMALL-BODY EPHEMERIS, CONTACT JPL BEFORE USING IT." — [Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html)
- DE440 covers 1550-2650 and DE441 covers -13,200 to +17,191. DE441 omits lunar core-mantle damping, giving about 10 m along-track Moon difference 100 years out. — [Park et al. 2021 via search summary](https://ssd.jpl.nasa.gov/doc/de440_de441.html)
- Typical accuracy: the manual and docs fetched give no explicit az/el accuracy figure. I found no published statement. (See Inferences.)

### Inferences
- A request design that works: one call per site per target with START/STOP, STEP_SIZE in minutes (or TLIST up to 10,000 times), QUANTITIES='4' (add 13 for angular diameter, 20 for range), ANG_FORMAT='DEG', CSV_FORMAT='YES', format=json or text. Parse between $$SOE and $$EOE. Cache results server-side. Sequential requests with 2 s or more spacing is polite behaviour (my own convention, not a JPL rule).
- Elevation reference is the reference-sphere zenith (radius 1737.4 km), with alt=0 meaning that sphere. A DEM-derived site must use alt = (DEM elevation relative to 1737.4 km) in km. Local terrain slope is not included. Terrain horizon masking must be done separately.
- Because the horizon is the sphere's tangent plane and sites sit within about 1 deg of the pole, Sun elevation extremes at the pole are about +/-1.5 deg (ecliptic obliquity to lunar equator 1.54 deg), consistent with the live +1.37 deg result.
- The service now reports DE441 as the source for Sun/Earth/Moon. This is the live header, not a documented policy. For 2026 the DE440/DE441 lunar orbit difference is expected to be tiny, but I did not quantify it.

### Gaps
- No official rate limit or terms-of-use text found; JPL contact is horizons@ssd.jpl.nasa.gov (from a search summary, unverified).
- No JPL-stated az/el accuracy for lunar-surface sites.
- Manual passage on "coord@301" for the Moon specifically not found; behaviour verified only by live test.

## 2. LOLA DEM frame and frame-mismatch effect at the south pole

### Takeaway
PGDA south-pole LOLA DEMs are in the MOON_ME frame of DE421. Horizons uses MEAN_ME (high precision) with a DE440/DE441 realization. NAIF defines MOON_ME_DE440_ME421 to stay aligned with the DE421 ME frame, so the mismatch is small (order of 1 m on the surface over 2000-2040 per NAIF) and negligible for az/el at this accuracy. The PA vs ME difference (about 875 m, 0.029 deg) matters only if someone mixes PA-frame data with ME coordinates.

### Cited Findings
- PGDA 5 m/px South Pole LDEMs use polar stereographic X/Y in metres, "MOON_ME reference frame of ephemeris DE421". The 87-90S mosaic uses the same convention. — [PGDA LOLA 5 mpp](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/) (via search summary)
- PGDA global shape model is in MOON_PA (DE421), but LRO adopted the ME frame for cartographic registration in 2008. The PA to ME rotation is a constant matrix per ephemeris version. — [PGDA product 95](https://pgda.gsfc.nasa.gov/products/95)
- NAIF moon_de440 frame kernel: MOON_ME is an alias for MOON_ME_DE440_ME421, "closely aligned" with the DE421 ME frame; it is a constant rotation from MOON_PA_DE440 with angles (67.8526, 78.6944, 0.2785) arcsec. — [NAIF moon_de440 FK](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_de440_250416.tf)
- Same kernel: over 1900-2051 the maximum rotation between the DE440-defined ME and DE421 ME is 5.82e-7 rad, "slightly over 1 m on a great circle"; over 2000-2040 it is 3.07e-7 rad, "approximately 53.4 cm". PA to ME angle is about 0.02886 deg, "approximately 875 m". DE440 ME vs IAU_MOON (2000-2040): amplitude about 0.0051 deg (about 155 m), mean 0.00239 deg (72 m). — [NAIF moon_de440 FK](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_de440_250416.tf)
- Offset angle comparison (arcsec): DE421 -78.513, 0.290, -67.753; DE440 -78.694, 0.278, -67.853 (differences about 0.18, 0.012, 0.10 arcsec). The ESA Moonlight paper notes the PA-ME offset is about 860 m at the surface and depends on the ephemeris. — [Moonlight reference frames paper](https://arxiv.org/pdf/2409.10043) (via search summary; last digit of the DE421 third angle is inconsistent between tables)

### Inferences
- Rotation difference 0.1-0.2 arcsec equals 0.5-1 m on the surface (1 arcsec is about 8.4 m at lunar radius). Viewed as a horizon-elevation error for a site position error of 1 m, this is a position offset of 1 m, i.e. far smaller than a DEM pixel (5 m) or typical LOLA geolocation error. At the pole the position shift cannot change Sun/Earth direction (which is far away); it only shifts the site by about 1 m. Sun/Earth az/el change by about 0.00003 deg for 1 m. The effect on az/el itself is far below arcminute.
- Azimuth near the pole is very sensitive to longitude (az roughly follows longitude), so an arcsecond-scale frame error would show as an azimuth error of about (1 m / distance from pole). At 89.5 deg lat (about 15 km from the pole), 1 m is about 0.004 deg of azimuth. This is my calculation, not a cited figure.
- Mismatch matters only if the DEM were in PA coordinates (0.029 deg, about 875 m, enough to move a site by tens of 5 m pixels) or if Horizons fell back to the low-precision IAU model (155 m maximum).

### Gaps
- I did not find a PGDA statement quantifying DE421 vs DE440 ME differences for the DEMs.
- Whether Horizons "MEAN_ME (high precision)" is exactly MOON_ME_DE440_ME421 is inferred from the kernel alias, not stated by Horizons.

## 3. Earth libration, parallax and Earth visibility at the pole

### Takeaway
Optical libration (latitude about 6.7 deg, longitude about 7.9 deg) puts Earth a few degrees above or below the horizon at the south pole; Earth is a disc of angular radius about 0.9-1.0 deg and therefore partially visible near the horizon. Terrain masks dominate real visibility. Pole studies use a finite disc and "any part visible" criteria, but DSN-oriented studies are more conservative.

### Cited Findings
- Libration in longitude "can reach 7 deg 54 arcmin" and libration in latitude about "6 deg 50 arcmin"; diurnal (parallax) libration "reaches less than 1 deg"; about 59 percent of the surface is seen from Earth over time. — [Wikipedia: Libration](https://en.wikipedia.org/wiki/Libration)
- Live Earth data at 2026-11-15: angular diameter 6500.1 arcsec (radius about 0.903 deg), distance 0.0027059 au (about 404,800 km), elevation -3.09 deg at 89.54 S, 0 E. — Live test
- NASA SVS: Sun "never more than a few degrees above or below" the horizon at the pole; Earth "bobs up and down, never veering far from 0 deg longitude". — [NASA SVS 5228](https://svs.gsfc.nasa.gov/5228)
- PGDA/Mazarico Earth visibility maps use a finite disc; Earth counted visible "if any part of its disc is not obscured", which "may be very slightly optimistic for radio link studies that would involve only DSN stations". Averaged hourly over 18.6 years. — [PGDA product 69](https://pgda.gsfc.nasa.gov/products/69)
- JPL IPN Progress Report 42-176 (Bryant): south pole terrain horizon masks from a 40 m GSSR DEM; Earth visibility from the area of Earth's motion region below the horizon mask; best south-pole site had 92 percent average solar availability and 51 percent direct-to-Earth availability (2009-2028). Disc/point treatment not stated in the abstract. — [IPN PR 42-176C](https://ipnpr.jpl.nasa.gov/progress_report/42-176/176C.html)
- An AIAA paper notes that, because of low Earth and Sun elevation angles at the south pole, accurate terrain data is critical. — [AIAA 2010-8780](https://ssdl1.gatech.edu/sites/default/files/ssdl-files/papers/conferencePapers/AIAA-2010-8780.pdf) (via search summary)

### Inferences
- Periods 27.21 d (draconic) and 27.55 d (anomalistic) and distance range 356,000-406,700 km are standard values from my background knowledge; I did not source them in this session. Earth angular radius at 384,400 km is asin(6371/384400)=0.95 deg; the live value 0.903 deg at 404,800 km is consistent (6378/404800 gives about 0.90 deg). At 356,500 km perigee radius is about 1.03 deg.
- At a pole Earth's elevation is approximately in the range set by latitude libration (-6.7 to +6.7 deg offset of sub-Earth latitude), so geometrically Earth is above the sphere horizon about half of the time (~14 days per 27.3 d), disc fully above when elevation exceeds the Earth radius (about 1 deg). For a site at 89.5 S, near-zero elevations are common and Earth-above-horizon fraction near 50 percent is consistent with the 51 percent DTE figure reported by Bryant (though that is terrain-limited, so equality is a coincidence).
- For comms, treating Earth as a disc with a minimum elevation mask applied to the disc centre (or to the limb, for a conservative bound) is a modelling choice. Sources found treat visibility as any-part-of-disc (optimistic) or integrate over the region. I found no explicit NASA/DSN standard stating a mask value or centre vs limb. Report both centre and whole-disc/any-part fractions.

### Gaps
- No sourced figure for libration periods, geocentric distance range, DSN minimum elevation mask, or LunaNet requirements.
- Bryant report full text not read (abstract only).

## 4. Solar disc and sunrise/sunset conventions

### Takeaway
Horizons gives the Sun's centre and a full-disc angular diameter (1941.6 arcsec on 2026-11-15, so radius about 0.2697 deg, since 1 au varies through the year). Illumination papers model the Sun as an extended disc (many sub-sources) and report fractions of flux or disc visible, so percent-sunlit depends on convention.

### Cited Findings
- Live Sun angular diameter on the Moon 2026-11-15 00:00 UT: 1941.613 arcsec, falling slowly (1941.556 at 03:00). Radius 695,700 km. — Live test
- Faustini example in a SPICE-based illumination paper: the Sun was modelled as 100 discrete sub-sources, limb darkening weighted, output as percentage of flux visible; the paper gives no formal sunrise definition. — [PMC6398960](https://pmc.ncbi.nlm.nih.gov/articles/PMC6398960)
- Mazarico et al. (2011): LOLA polar maps at 240 m/px, hourly steps over about 18.6 years, validated against LRO WAC images. — [Mazarico 2011 summary](https://ntrs.nasa.gov/citations/20120010094) (via search summary)
- PGDA treats the light source as a finite disc. — [PGDA product 69](https://pgda.gsfc.nasa.gov/products/69)

### Inferences
- Solar radius of 0.2666 deg (arcsin(695700/149597870.7)=0.2665 deg at 1 au) and about +/-1.7 percent seasonal variation are from my background knowledge, consistent with the live value (0.2697 deg in mid-November, where the distance is near 1.0 au minus a bit; the live value implies a distance of about 0.988 au). I did not source the +/-1.7 percent figure.
- Convention matters: sunrise at centre elevation 0 vs upper limb at 0 (centre at -0.27 deg) vs whole disc (centre at +0.27 deg). At the pole the Sun moves only about 0.0037 deg/hour in elevation near the extreme and is within +/-1.54 deg of the horizon, so a 0.27 deg shift in threshold changes sunlit fraction noticeably (a few to tens of percent for a crest site). State the convention with every percent figure and prefer fraction of disc visible.

### Gaps
- No sourced statement of which convention each major paper uses for "sunrise"; only that they use extended discs.

## 5. Simple analytic models (Meeus) vs SPICE route

### Takeaway
Meeus Chapter 53 gives optical plus physical libration and sub-solar selenographic coordinates good to well under a degree, adequate for coarse geometry but not for arcminute-level work at a pole. The SPICE route (DE440 SPK + moon_pa/ moon_de440 FK + pck, frame MOON_ME) reproduces Horizons.

### Cited Findings
- Physical libration "can never be larger than 0.04 degree in both longitude and latitude" (Meeus-based PyMeeus docs). — [PyMeeus Moon](https://pymeeus.readthedocs.io/en/stable/bodies/Moon.html)
- Meeus lunar position accuracy quoted as 10 arcsec in longitude, 3 arcsec in latitude, 0.2 arcsec in HP (position series, not libration). — [Starlink SUN/267](https://starlink.eao.hawaii.edu/docs/sun267.htx/sun267ss22.html)
- NAIF provides the lunar frame kernel moon_de440_250416.tf with MOON_ME alias, and the PCK moon_pa_de440 with libration. — [NAIF FK](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_de440_250416.tf)
- DE440 ME vs IAU_MOON (the low-precision IAU model) differs by up to 0.0051 deg (155 m). — NAIF FK above.

### Inferences
- SPICE recipe: load naif0012.tls, de440.bsp (or de441 parts), moon_pa_de440_200625.bpc, moon_de440_250416.tf, pck00011.tpc; then spkpos/spkezr('SUN','ET','MOON_ME','LT+S','MOON') with the site vector in MOON_ME, rotate to the local ENU frame (azimuth clockwise from north, elevation above the sphere tangent plane) using lat/lon from the 1737.4 km sphere. LT+S matches Horizons airless apparent (light bending small). Validate against 3-5 Horizons rows. I did not run this.
- Meeus Ch. 53 accuracy: I could not confirm a documented accuracy figure; the series is truncated, giving libration errors of order arcminutes (my background knowledge, unverified). It is also referenced to the mean Earth/polar-axis-like cartographic frame of its era, with uncertainty about frame definition.

### Gaps
- No source for Meeus Ch. 53 libration accuracy; did not run a SPICE comparison against Horizons.

## 6. Open-source tools and validation

### Takeaway
I found no authoritative, widely validated open-source tool that gives lunar-surface Sun/Earth az/el, other than SPICE-based research codes and NASA data products.

### Cited Findings
- The Mazarico and PGDA products use SPICE-based horizon-map methods; the PMC illumination toolkit uses SPICE and can fix sources in "any SPICE-recognized frame", modelling Earth as a 671-element extended source. — [PMC6398960](https://pmc.ncbi.nlm.nih.gov/articles/PMC6398960)
- Candidates surfaced but not verified: TUB-Light (GPU south-pole illumination), zkbt/illumination, Solshade (JOSS), across-tools, pylunar. — [search results](https://github.com/zkbt/illumination)
- NASA SVS 5228 visualisation used DE421 and LOLA DEM; no code named. — [NASA SVS 5228](https://svs.gsfc.nasa.gov/5228)

### Inferences
- Mazarico 2011 validated against LRO WAC images; the PGDA products were updated as maps improved. The practical validation for a new implementation is cross-checking against Horizons rows (live test confirms a quick path).

### Gaps
- LunaNet and NASA SVS source code not found. No tool's README was inspected for validation claims.
