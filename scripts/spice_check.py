"""Independent cross-check with NASA NAIF SPICE (spiceypy), not Horizons checked against itself.

For each site: Sun and Earth azimuth/elevation from SPICE (DE440s + lunar mean-Earth frame MOON_ME, light time + stellar aberration),
compared with (a) live JPL Horizons and (b) our fallback series model, every 3 h for 30 days.

Setup (once):   python3 -m venv v && v/bin/pip install spiceypy numpy
                download into one folder: de440s.bsp naif0012.tls pck00011.tpc moon_pa_de440_200625.bpc moon_de440_250416.tf
                (https://naif.jpl.nasa.gov/pub/naif/generic_kernels/ : spk/planets, lsk, pck, pck, fk/satellites)
Run:            npx tsx scripts/dump-series.ts > series.json
                v/bin/python scripts/spice_check.py <kernel_dir> series.json
"""
import json, math, subprocess, sys, urllib.parse
import numpy as np
import spiceypy as sp

kdir, series_file = sys.argv[1], sys.argv[2]
for k in ['naif0012.tls', 'pck00011.tpc', 'de440s.bsp', 'moon_pa_de440_200625.bpc', 'moon_de440_250416.tf']:
    sp.furnsh(f'{kdir}/{k}')
R = 1737.4  # km, the sphere Horizons uses for coord@301 sites

def spice_azel(lat, lon, times_ms):
    la, lo = math.radians(lat), math.radians(lon)
    site = np.array(sp.georec(lo, la, 0.0, R, 0.0))                       # in MOON_ME (body-fixed)
    E = np.array([-math.sin(lo), math.cos(lo), 0]); N = np.array([-math.sin(la) * math.cos(lo), -math.sin(la) * math.sin(lo), math.cos(la)])
    U = np.array([math.cos(la) * math.cos(lo), math.cos(la) * math.sin(lo), math.sin(la)])
    out = []
    for t in times_ms:
        et = sp.str2et(__import__('datetime').datetime.utcfromtimestamp(t / 1000).strftime('%Y-%m-%d %H:%M:%S') + ' UTC')
        row = []
        for body in ('SUN', 'EARTH'):
            v, _ = sp.spkpos(body, et, 'MOON_ME', 'LT+S', 'MOON')
            d = np.array(v) - site
            row += [math.degrees(math.atan2(d @ E, d @ N)) % 360, math.degrees(math.asin((d @ U) / np.linalg.norm(d)))]
        out.append(row)
    return np.array(out)

def horizons_azel(lat, lon, t0_ms, days):
    fmt = lambda ms: __import__('datetime').datetime.utcfromtimestamp(ms / 1000).strftime('%Y-%m-%d %H:%M')
    res = []
    for cmd in ('10', '399'):
        q = urllib.parse.urlencode({'format': 'json', 'COMMAND': f"'{cmd}'", 'OBJ_DATA': "'NO'", 'MAKE_EPHEM': "'YES'", 'EPHEM_TYPE': "'OBSERVER'", 'CENTER': "'coord@301'",
            'COORD_TYPE': "'GEODETIC'", 'SITE_COORD': f"'{lon},{lat},0'", 'START_TIME': f"'{fmt(t0_ms)}'", 'STOP_TIME': f"'{fmt(t0_ms + days * 86400000)}'",
            'STEP_SIZE': "'3 h'", 'QUANTITIES': "'4'", 'ANG_FORMAT': "'DEG'", 'CSV_FORMAT': "'YES'"})
        txt = json.loads(subprocess.run(['curl', '-sS', '--max-time', '40', f'https://ssd.jpl.nasa.gov/api/horizons.api?{q}'], capture_output=True, text=True, check=True).stdout)['result']
        rows = txt.split('$$SOE')[1].split('$$EOE')[0].strip().split('\n')
        res.append([[float(x) for x in r.split(',')[1:] if x.strip() and x.strip()[0] in '-0123456789'][:2] for r in rows])
    return np.hstack([np.array(res[0]), np.array(res[1])])

def diff(a, b):  # azimuth wrap-safe; azimuth error as great-circle-ish (scaled by cos el)
    d = a - b; d[:, [0, 2]] = (d[:, [0, 2]] + 180) % 360 - 180
    d[:, 0] *= np.cos(np.radians(b[:, 1])); d[:, 2] *= np.cos(np.radians(b[:, 3]))
    return d

def line(tag, d):
    n = ['Sun az', 'Sun el', 'Earth az', 'Earth el']
    return f'  {tag:<22}' + '  '.join(f'{n[i]} rms {np.sqrt(np.mean(d[:, i] ** 2)):.6f} max {np.abs(d[:, i]).max():.6f}' for i in range(4))

for s in json.load(open(series_file)):
    arr = np.array(s['samples']); t = arr[:, 0]
    sp_ = spice_azel(s['lat'], s['lon'], t)
    hz = horizons_azel(s['lat'], s['lon'], s['t0'], 30)
    n = min(len(hz), len(sp_), len(arr))
    ser = arr[:n, [1, 2, 3, 4]]
    print(f"{s['name']}  ({n} samples, degrees)")
    print(line('SPICE vs Horizons', diff(sp_[:n], hz[:n])))
    print(line('Series vs SPICE', diff(ser, sp_[:n])))
    print(line('Series vs Horizons', diff(ser, hz[:n])))
