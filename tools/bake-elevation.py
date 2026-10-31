#!/usr/bin/env python3
"""v5.2 Part 8: bake real ground height for Stanley Park and Metro Vancouver from the public Terrain Tiles
(terrarium PNG encoding, s3.amazonaws.com/elevation-tiles-prod; sources: SRTM, GMTED, NED, ETOPO1 and others, see
https://github.com/tilezen/joerd/blob/master/docs/attribution.md), and find the hills in it.

Output data/elevation.js:
  window.HH_EL = { sp: {...}, van: {...} }, each { cell (m), w, h, z: base64 Uint16 heights in decimetres (row-major, sea
  and anything below 0 is 0), hills: [[x, y, r, base, top, name], ...] in that world's own metres }.

A hill is a summit with enough prominence over the saddle that joins it to higher ground; its radius is how far its
slopes reach above the halfway height, so eating it flattens it down to its base.

python3 -I tools/bake-elevation.py data/stanley.js data/ch3-osm.js data/elevation.js [tile cache dir]
"""
import base64, io, json, math, os, struct, sys, urllib.request
from PIL import Image

SP_JS, VAN_JS, OUT = sys.argv[1:4]
CACHE = sys.argv[4] if len(sys.argv) > 4 else '/tmp/dem'
URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'


def proj_of(path):
    s = open(path, encoding='utf-8').read(400000)
    i = s.index('"proj"'); j = s.index(']', i)
    pr = json.loads(s[s.index('[', i):j + 1])
    def num(k):
        a = s.index('"%s"' % k) + len(k) + 3
        b = a
        while s[b] in '0123456789.': b += 1
        return float(s[a:b])
    return pr, num('W'), num('H')


TILES = {}


def tile(z, x, y):
    k = (z, x, y)
    if k in TILES: return TILES[k]
    fn = os.path.join(CACHE, '%d_%d_%d.png' % k)
    if not os.path.exists(fn):
        os.makedirs(CACHE, exist_ok=True)
        with urllib.request.urlopen(URL.format(z=z, x=x, y=y), timeout=60) as r, open(fn, 'wb') as f: f.write(r.read())
    im = Image.open(fn).convert('RGB'); TILES[k] = (im.load(), im.size[0]); return TILES[k]


def elev(lon, lat, z):
    n = 2 ** z
    fx = (lon + 180) / 360 * n
    fy = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n
    tx, ty = int(fx), int(fy)
    px, sz = tile(z, tx, ty)
    u, v = (fx - tx) * sz - .5, (fy - ty) * sz - .5
    def at(i, j):
        ii, jj, X, Y = i, j, tx, ty
        if ii < 0: X -= 1; ii += sz
        if ii >= sz: X += 1; ii -= sz
        if jj < 0: Y -= 1; jj += sz
        if jj >= sz: Y += 1; jj -= sz
        p, _ = tile(z, X, Y) if (X, Y) != (tx, ty) else (px, sz)
        r, g, b = p[ii, jj]
        return r * 256 + g + b / 256 - 32768
    i0, j0 = math.floor(u), math.floor(v); a, b = u - i0, v - j0
    return (at(i0, j0) * (1 - a) * (1 - b) + at(i0 + 1, j0) * a * (1 - b) + at(i0, j0 + 1) * (1 - a) * b + at(i0 + 1, j0 + 1) * a * b)


NAMES = {'sp': [('Prospect Point', -123.1414, 49.3140), ('Ferguson Point', -123.1572, 49.3013), ('Brockton Point', -123.1172, 49.3004),
                ('the park\'s high ground', -123.1440, 49.3060), ('Third Beach bluff', -123.1555, 49.3045)],
         'van': [('Grouse Mountain', -123.0815, 49.3805), ('Cypress Mountain', -123.2100, 49.4050), ('Mount Seymour', -122.9500, 49.3700),
                 ('the Lions', -123.1400, 49.4570), ('the Stawamus Chief', -123.1370, 49.6840), ('Mount Garibaldi', -123.0050, 49.8500),
                 ('Whistler Mountain', -122.9500, 50.0600), ('Blackcomb Mountain', -122.8900, 50.0900), ('Golden Ears', -122.6000, 49.4000),
                 ('Burnaby Mountain', -122.9200, 49.2780), ('Little Mountain', -123.1130, 49.2420), ('Hollyburn Mountain', -123.1880, 49.3800),
                 ('Mount Fromme', -123.0600, 49.3800), ('Eagle Ridge', -122.8200, 49.3200), ('Burke Mountain', -122.7300, 49.3200),
                 ('Mount Strachan', -123.1900, 49.4150), ('Crown Mountain', -123.0950, 49.4050), ('Sumas Mountain', -122.2500, 49.1000)]}


def bake(key, pr, W, H, cell, zoom, prom):
    lon0, lat0, kx, ky = pr
    w, h = int(math.ceil(W / cell)) + 1, int(math.ceil(H / cell)) + 1
    g = [[0.0] * w for _ in range(h)]
    for j in range(h):
        lat = lat0 - j * cell / ky
        for i in range(w):
            g[j][i] = max(0.0, elev(lon0 + i * cell / kx, lat, zoom))
    # hills: summits with enough prominence (flood from the highest down; a summit's saddle is where its basin meets a higher one)
    order = sorted(((g[j][i], i, j) for j in range(h) for i in range(w)), reverse=True)
    lab = [[-1] * w for _ in range(h)]; peaks = []; parent = []
    def find(a):
        while parent[a] != a: parent[a] = parent[parent[a]]; a = parent[a]
        return a
    saddle = {}
    for e, i, j in order:
        nb = set()
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                ii, jj = i + di, j + dj
                if (di or dj) and 0 <= ii < w and 0 <= jj < h and lab[jj][ii] >= 0: nb.add(find(lab[jj][ii]))
        if not nb:
            lab[j][i] = len(peaks); parent.append(len(peaks)); peaks.append([i, j, e]); continue
        nb = sorted(nb, key=lambda p: -peaks[p][2]); top = nb[0]; lab[j][i] = top
        for other in nb[1:]:                     # the lower peak's basin meets a higher one here: its saddle is e
            if other not in saddle: saddle[other] = e
            parent[other] = top
    hills = []
    for p, (i, j, top) in enumerate(peaks):
        base = saddle.get(p, 0.0)
        if top - base < prom or top < 8: continue
        half = base + (top - base) * .5
        # radius: how far the slopes stay above halfway, averaged over 16 directions
        rs = []
        for k in range(16):
            a = k * math.pi / 8; r = 0
            while True:
                r += 1; ii, jj = int(round(i + math.cos(a) * r)), int(round(j + math.sin(a) * r))
                if not (0 <= ii < w and 0 <= jj < h) or g[jj][ii] < half or r > 400: break
            rs.append(r)
        R = sum(rs) / len(rs) * cell * 2          # the foot of the slope: about twice the halfway radius
        x, y = i * cell, j * cell
        lon, lat = lon0 + x / kx, lat0 - y / ky
        nm = min(NAMES[key], key=lambda q: math.hypot((q[1] - lon) * kx, (q[2] - lat) * ky))
        name = nm[0] if math.hypot((nm[1] - lon) * kx, (nm[2] - lat) * ky) < max(R * .6, 600) else ''
        hills.append([round(x), round(y), round(R), round(base, 1), round(top, 1), name])
    data = b''.join(struct.pack('<%dH' % w, *[min(65535, int(round(v * 10))) for v in row]) for row in g)
    print(key, w, 'x', h, 'cells of', cell, 'm; max', round(max(max(r) for r in g)), 'm;', len(hills), 'hills:',
          ', '.join('%s %dm r%d' % (q[5] or '?', q[4] - q[3], q[2]) for q in sorted(hills, key=lambda q: q[3] - q[4])[:14]))
    return {'cell': cell, 'w': w, 'h': h, 'z': base64.b64encode(data).decode(), 'hills': hills}


sp = proj_of(SP_JS); van = proj_of(VAN_JS)
out = {'sp': bake('sp', *sp, cell=20, zoom=14, prom=10), 'van': bake('van', *van, cell=200, zoom=11, prom=100)}
with open(OUT, 'w', encoding='utf-8') as f:
    f.write('/* v5.2 Part 8: real ground height for Stanley Park (sp) and Metro Vancouver (van), baked by tools/bake-elevation.py from\n'
            '   the public Terrain Tiles (Mapzen / AWS open data: SRTM, GMTED, NED, ETOPO1 and others). Heights in decimetres;\n'
            '   hills: [x, y, radius, base, top, name] in the world\'s own metres. */\n')
    f.write('window.HH_EL = ' + json.dumps(out, separators=(',', ':')) + ';\n')
