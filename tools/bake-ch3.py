"""Bake Chapter 3 (Metro Vancouver) from Overture Maps extracts (OpenStreetMap-derived, ODbL).
Output: data/ch3-osm.js — window.HH_CH3 = {...}. The game never fetches live map data.
Geometry is projected to metres (equirectangular around 49.5 N), simplified and delta-encoded as base64 varints.
Buildings are NOT baked (spec clarification 8): only geography (land/water/parks/roads/landuse) and named POIs."""
import pyarrow.parquet as pq, shapely, numpy as np, json, math, collections, sys, re
from shapely.ops import unary_union, linemerge
from PIL import Image, ImageDraw
B = '/tmp/bake/'
LON0, LAT0, LON1, LAT1 = -123.30, 50.15, -122.55, 48.97
KX = 111320 * math.cos(math.radians(49.5)); KY = 111200
W = (LON1 - LON0) * KX; H = (LAT0 - LAT1) * KY
def P(lon, lat): return ((lon - LON0) * KX, (LAT0 - lat) * KY)
def projg(g): return shapely.transform(g, lambda c: np.column_stack([(c[:, 0] - LON0) * KX, (LAT0 - c[:, 1]) * KY]))
BOX = shapely.box(0, 0, W, H)
B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
def enc(vals):  # zigzag varint, 5 bits per char + continuation bit
    out = []
    for v in vals:
        z = (v << 1) ^ (v >> 31) if v >= 0 else ((-v) << 1) - 1
        while True:
            c = z & 31; z >>= 5
            if z: out.append(B64[c | 32])
            else: out.append(B64[c]); break
    return ''.join(out)
def encline(coords, q):
    a = np.round(np.asarray(coords) / q).astype(np.int64); d = np.diff(a, axis=0, prepend=[[0, 0]])
    return enc(d.flatten().tolist())
def rings(g):
    if g.is_empty: return []
    if g.geom_type == 'Polygon': return [g]
    return [p for p in getattr(g, 'geoms', []) if p.geom_type == 'Polygon']
def polyenc(g, tol, minarea, q=2):
    out = []
    for p in rings(g):
        if p.area < minarea: continue
        p = shapely.simplify(p, tol, preserve_topology=True)
        for pp in rings(p):
            rs = [pp.exterior] + [i for i in pp.interiors if shapely.Polygon(i).area >= minarea]
            parts = [encline(np.array(r.coords)[:-1], q) for r in rs if len(r.coords) > 3]
            if parts: b = pp.bounds; out.append([round(b[0]), round(b[1]), round(b[2]), round(b[3]), parts])
    return out
def load(name, cols): return pq.read_table(B + name + '.parquet', columns=cols)
log = lambda *a: print(*a, file=sys.stderr, flush=True)

# ---------- land & water ----------
t = load('base-land', ['subtype', 'class', 'geometry'])
lands = [shapely.from_wkb(g) for s, g in zip(t.column('subtype').to_pylist(), t.column('geometry').to_pylist()) if s == 'land']
land = projg(unary_union([g for g in lands if g.geom_type in ('Polygon', 'MultiPolygon')])).intersection(BOX.buffer(2000))
log('land', land.area / 1e6)
t = load('base-water', ['subtype', 'class', 'geometry'])
WCLS = {'river', 'lake', 'water', 'reservoir', 'pond', 'basin', 'canal', 'lagoon', 'tidal_channel', 'bay', 'strait', 'ocean', 'dock'}
wl = []
for s, c, g in zip(t.column('subtype').to_pylist(), t.column('class').to_pylist(), t.column('geometry').to_pylist()):
    if c in WCLS or s in ('ocean', 'lake', 'river', 'reservoir'):
        gg = shapely.from_wkb(g)
        if gg.geom_type in ('Polygon', 'MultiPolygon'): wl.append(projg(gg))
inland = unary_union([g for g in wl]).intersection(land)
ocean = BOX.buffer(2000).difference(land)
water = unary_union([ocean, inland])
log('water', water.area / 1e6)

# ---------- parks / greens / beaches (vector, for crisp drawing) ----------
t = load('base-land_use', ['subtype', 'class', 'names', 'geometry'])
LU = list(zip(t.column('subtype').to_pylist(), t.column('class').to_pylist(), t.column('names').to_pylist(), t.column('geometry').to_pylist()))
GREEN = {'park', 'recreation_ground', 'golf_course', 'grass', 'cemetery', 'pitch', 'garden', 'nature_reserve', 'dog_park', 'meadow', 'allotments'}
greens = []
for s, c, n, g in LU:
    if c in GREEN or s in ('park', 'golf', 'cemetery'):
        gg = shapely.from_wkb(g)
        if gg.geom_type in ('Polygon', 'MultiPolygon'): greens.append(projg(gg))
green = unary_union(greens).difference(water)
t = load('base-land', ['subtype', 'class', 'geometry'])
sand = [projg(shapely.from_wkb(g)) for s, c, g in zip(t.column('subtype').to_pylist(), t.column('class').to_pylist(), t.column('geometry').to_pylist()) if c in ('beach', 'sand')]
sand = [g for g in sand if g.geom_type in ('Polygon', 'MultiPolygon')]
beach = unary_union(sand).difference(water) if sand else shapely.Polygon()
forests = [projg(shapely.from_wkb(g)) for s, c, g in zip(t.column('subtype').to_pylist(), t.column('class').to_pylist(), t.column('geometry').to_pylist()) if s in ('forest',) or c in ('wood', 'forest')]
glac = [projg(shapely.from_wkb(g)) for s, c, g in zip(t.column('subtype').to_pylist(), t.column('class').to_pylist(), t.column('geometry').to_pylist()) if c in ('glacier', 'bare_rock', 'scree')]

# ---------- landuse grid (100 m) ----------
CELL = 100
GW, GH = int(math.ceil(W / CELL)), int(math.ceil(H / CELL))
img = Image.new('L', (GW, GH), 0)          # 0 = wild (forest/mountain)
dr = ImageDraw.Draw(img)
def fill(g, v):
    for p in rings(g):
        if p.area < CELL * CELL * .3: continue
        dr.polygon([(x / CELL, y / CELL) for x, y in p.exterior.coords], fill=v)
        for i in p.interiors:
            if shapely.Polygon(i).area > CELL * CELL: dr.polygon([(x / CELL, y / CELL) for x, y in i.coords], fill=0)
CLS = {'wild': 0, 'water': 1, 'res': 2, 'com': 3, 'core': 4, 'ind': 5, 'park': 6, 'farm': 7, 'air': 8, 'beach': 9, 'alpine': 10, 'school': 11, 'wet': 12, 'ski': 13, 'uni': 14}
# residential default where residential streets exist (dilated)
t = load('transportation-segment', ['subtype', 'class', 'names', 'geometry'])
SEG = list(zip(t.column('subtype').to_pylist(), t.column('class').to_pylist(), t.column('names').to_pylist(), t.column('geometry').to_pylist()))
resimg = Image.new('L', (GW, GH), 0); rd = ImageDraw.Draw(resimg)
for s, c, n, g in SEG:
    if c in ('residential', 'living_street', 'tertiary', 'unclassified', 'secondary', 'primary', 'service'):
        xy = projg(shapely.from_wkb(g)).coords
        rd.line([(x / CELL, y / CELL) for x, y in xy], fill=255, width=3)
res = np.array(resimg) > 0
from PIL import ImageFilter
res = np.array(Image.fromarray((res * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 0
for g in forests:
    pass
for g in glac: fill(g, CLS['alpine'])
order = [('agriculture', None, 'farm'), ('horticulture', None, 'farm'), ('residential', None, 'res'), ('developed', 'industrial', 'ind'), ('developed', 'works', 'ind'),
         ('resource_extraction', None, 'ind'), ('developed', 'brownfield', 'ind'), ('developed', 'commercial', 'com'), ('developed', 'retail', 'com'), ('construction', None, 'com'),
         ('winter_sports', 'downhill', 'ski'), ('park', None, 'park'), ('golf', 'golf_course', 'park'), ('recreation', 'recreation_ground', 'park'), ('cemetery', None, 'park'),
         ('protected', 'nature_reserve', 'park'), ('education', 'school', 'school'), ('education', 'university', 'uni'), ('education', 'college', 'uni')]
arr0 = np.array(img)
arr0[res] = CLS['res']
img = Image.fromarray(arr0); dr = ImageDraw.Draw(img)
for sub, cl, v in order:
    for s, c, n, g in LU:
        if s == sub and (cl is None or c == cl):
            gg = shapely.from_wkb(g)
            if gg.geom_type in ('Polygon', 'MultiPolygon'): fill(projg(gg), CLS[v])
# hand-drawn: the dense tower cores and YVR (lon/lat boxes)
CORES = [(-123.142, 49.292, -123.098, 49.273), (-123.006, 49.234, -122.993, 49.222), (-123.008, 49.270, -122.996, 49.262), (-122.853, 49.197, -122.838, 49.184),
         (-123.143, 49.172, -123.130, 49.160), (-123.085, 49.325, -123.075, 49.310), (-122.805, 49.282, -122.791, 49.274), (-122.917, 49.207, -122.902, 49.199)]
for a, b, c, d in CORES:
    x0, y0 = P(a, b); x1, y1 = P(c, d); dr.rectangle([x0 / CELL, y0 / CELL, x1 / CELL, y1 / CELL], fill=CLS['core'])
for a, b, c, d in [(-123.205, 49.205, -123.155, 49.183)]:
    x0, y0 = P(a, b); x1, y1 = P(c, d); dr.rectangle([x0 / CELL, y0 / CELL, x1 / CELL, y1 / CELL], fill=CLS['air'])
fill(beach, CLS['beach'])
arr = np.array(img)
# water mask (25 m) and water class in the grid
WC = 40; MW, MH = int(math.ceil(W / WC)), int(math.ceil(H / WC))
wimg = Image.new('L', (MW, MH), 0); wd = ImageDraw.Draw(wimg)
for p in rings(water):
    wd.polygon([(x / WC, y / WC) for x, y in p.exterior.coords], fill=1)
    for i in p.interiors: wd.polygon([(x / WC, y / WC) for x, y in i.coords], fill=0)
wm = np.array(wimg).astype(np.uint8)
wsm = np.array(Image.fromarray(wm * 255).resize((GW, GH), Image.BILINEAR)) / 255.0
arr[wsm > .5] = CLS['water']
log('grid', GW, GH, collections.Counter(arr.flatten().tolist()))
def rle(a):
    flat = a.flatten().tolist(); out = []; v = flat[0]; n = 0
    for x in flat:
        if x == v and n < 4000: n += 1
        else: out += [v, n]; v = x; n = 1
    out += [v, n]
    return enc(out)

# ---------- roads ----------
RC = {'motorway': 0, 'trunk': 1, 'primary': 2, 'secondary': 3, 'tertiary': 4, 'residential': 5, 'unclassified': 5, 'living_street': 5}
lines = collections.defaultdict(list); rail = []; sky = collections.defaultdict(list)
for s, c, n, g in SEG:
    nm = (n or {}).get('primary') or ''
    if s == 'rail':
        gg = projg(shapely.from_wkb(g))
        if 'SkyTrain' in nm or c == 'subway': sky[nm].append(gg)
        elif c == 'standard_gauge': rail.append(gg)
        continue
    k = RC.get(c)
    if k is None: continue
    lines[k].append(projg(shapely.from_wkb(g)))
roads = {}
TOL = {0: 8, 1: 8, 2: 6, 3: 6, 4: 6, 5: 7, 6: 8}
def addroads(k, geoms, q):
    vals = []; last = np.array([0, 0], np.int64); n = 0
    for l in geoms:
        l = shapely.simplify(l, TOL[k])
        if l.length < (30 if k >= 5 else 8): continue
        a = np.round(np.asarray(l.coords) / q).astype(np.int64)
        d = np.diff(np.vstack([last, a]), axis=0); last = a[-1]
        vals += [len(a)] + d.flatten().tolist(); n += 1
    roads[k] = [q, n, enc(vals)]
for k, ls in lines.items():
    m = linemerge(unary_union(ls)); addroads(k, m.geoms if hasattr(m, 'geoms') else [m], 3 if k == 5 else 2)
m = linemerge(unary_union(rail)); addroads(6, m.geoms if hasattr(m, 'geoms') else [m], 3)
log('roads', {k: (v[1], len(v[2])) for k, v in roads.items()})
# SkyTrain lines as mover paths (longest merged piece of each line)
paths = {}
for key, want in [('expo', 'Expo'), ('mill', 'Millennium'), ('canada', 'Canada')]:
    gs = [g for nm, L in sky.items() if want in nm for g in L]
    if not gs: continue
    mm = linemerge(unary_union(gs)); parts = list(mm.geoms) if hasattr(mm, 'geoms') else [mm]
    best = max(parts, key=lambda l: l.length); best = shapely.simplify(best, 20)
    paths[key] = [round(v) for xy in best.coords for v in xy]
# Hwy 1 and Hwy 99 for traffic (longest motorway pieces)
mw = linemerge(unary_union(lines[0])); parts = sorted(list(mw.geoms) if hasattr(mw, 'geoms') else [mw], key=lambda l: -l.length)
paths['hwy'] = [[round(v) for xy in shapely.simplify(l, 25).coords for v in xy] for l in parts[:6]]

# ---------- POIs ----------
pl = load('places', ['names', 'basic_category', 'confidence', 'geometry'])
PL = []
for n, c, cf, g in zip(pl.column('names').to_pylist(), pl.column('basic_category').to_pylist(), pl.column('confidence').to_pylist(), pl.column('geometry').to_pylist()):
    if not n or not n.get('primary'): continue
    pt = shapely.from_wkb(g); PL.append((n['primary'], c, cf or 0, pt.x, pt.y))
def inside(lon, lat): return LON0 <= lon <= LON1 and LAT1 <= lat <= LAT0
poi = []
seen = set()
def addp(kind, name, lon, lat, extra=None):
    key = ('sch' if kind in ('school', 'highschool') else kind, re.sub(r'elementary|secondary|school|annex|\W', '', name.lower()))
    if key in seen or not inside(lon, lat): return
    seen.add(key); x, y = P(lon, lat); poi.append([kind, round(x), round(y), name] + ([extra] if extra else []))
# schools from the OSM school grounds (named), typed by name
for s, c, n, g in LU:
    if c == 'school' and n and n.get('primary'):
        nm = n['primary']; ct = shapely.from_wkb(g).representative_point()
        hs = bool(re.search(r'Secondary|High School|Collegiate', nm))
        addp('highschool' if hs else 'school', nm, ct.x, ct.y)
for nm, c, cf, x, y in PL:
    if cf < .55: continue
    if c in ('elementary_school', 'middle_school') and re.search(r'Elementary|School|Annex|Academy', nm) and not re.search(r'Dance|Driving|Music|Swim|Martial|Tutor|Learning Centre|Montessori|Daycare|Preschool', nm): addp('school', nm, x, y)
    elif c == 'high_school' and re.search(r'Secondary|High', nm): addp('highschool', nm, x, y)
    elif c == 'community_center' and re.search(r'Community Cent|Recreation Cent|Rec Cent|Neighbourhood House', nm): addp('commcentre', nm, x, y)
    elif c == 'casino' and re.search(r'Casino|Grand Villa|Starlight|River Rock|Parq', nm) and not re.search(r'Bingo|Poker|Party', nm): addp('casino', nm, x, y)
# dedupe schools that sit very close with similar names
log('poi', collections.Counter(p[0] for p in poi))
json_out = {
    'proj': [LON0, LAT0, KX, KY], 'W': round(W), 'H': round(H),
    'grid': [GW, GH, CELL, rle(arr)], 'wmask': [MW, MH, WC, rle(wm)],
    'water': polyenc(water, 10, 3000), 'green': polyenc(green, 10, 6000), 'beach': polyenc(beach, 6, 1500),
    'roads': roads, 'paths': paths, 'poi': poi,
}
s = json.dumps(json_out, separators=(',', ':'))
open('/home/claude/hungry-hole/data/ch3-osm.js', 'w').write('/* Metro Vancouver geography for Chapter 3, baked from Overture Maps (OpenStreetMap data, (c) OpenStreetMap contributors, ODbL). Generated by tools/bake-ch3.py; do not edit by hand. */\nwindow.HH_CH3=' + s + ';\n')
log('bytes', len(s), {k: len(json.dumps(v)) for k, v in json_out.items()})
