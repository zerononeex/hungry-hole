#!/usr/bin/env python3
"""Bake World 3 (Stanley Park) map data from an Overture Maps extract into data/stanley.js.

Input: Overture GeoParquet files (base/water, base/land, base/land_use, transportation/segment, buildings/building,
base/infrastructure) clipped to lon -123.19..-123.10, lat 49.275..49.335 (see tools notes in docs/DECISIONS.md).
Output: window.HH_SP with everything in whole metres on the game's own grid (x east, y south, origin at the
north-west corner of the world box). Map data (c) OpenStreetMap contributors (ODbL), via Overture Maps.

python3 tools/bake-stanley.py <overture-dir> data/stanley.js
"""
import json, math, sys
import pyarrow.parquet as pq
import shapely
from shapely.geometry import box, Polygon, MultiPolygon, LineString, MultiLineString, Point
from shapely.ops import unary_union

SRC, OUT = sys.argv[1], sys.argv[2]
LON0, LAT0, LON1, LAT1 = -123.172, 49.326, -123.103, 49.277
KX, KY = 111320 * math.cos(math.radians(49.3)), 111200
W, H = round((LON1 - LON0) * KX), round((LAT0 - LAT1) * KY)
BOX = box(LON0, LAT1, LON1, LAT0)


def P(lon, lat):
    return ((lon - LON0) * KX, (LAT0 - lat) * KY)


def tx(g):
    return shapely.transform(g, lambda a: [[(x - LON0) * KX, (LAT0 - y) * KY] for x, y in a])


def rows(t):
    return pq.read_table(f'{SRC}/{t}.parquet').to_pylist()


def polys(g):
    if g.is_empty:
        return []
    if isinstance(g, Polygon):
        return [g]
    if isinstance(g, MultiPolygon):
        return list(g.geoms)
    return [p for p in getattr(g, 'geoms', []) if isinstance(p, Polygon)]


def enc_polys(geoms, tol=1.5, minarea=4):
    out = []
    for g in geoms:
        g = tx(g.intersection(BOX)).simplify(tol)
        for p in polys(g):
            if p.area < minarea:
                continue
            rings = [p.exterior] + list(p.interiors)
            out.append([[round(v) for xy in r.coords[:-1] for v in xy] for r in rings if len(r.coords) > 3])
    return out


def enc_lines(geoms, tol=1.0):
    out = []
    for g in geoms:
        g = tx(g.intersection(BOX)).simplify(tol)
        ls = [g] if isinstance(g, LineString) else list(getattr(g, 'geoms', []))
        for l in ls:
            if isinstance(l, LineString) and len(l.coords) > 1 and l.length > 2:
                out.append([round(v) for xy in l.coords for v in xy])
    return out


def inbox(g):
    b = g.bounds
    return b[2] > LON0 and b[0] < LON1 and b[3] > LAT1 and b[1] < LAT0


D = {'proj': [LON0, LAT0, KX, KY], 'W': W, 'H': H}

# ---- water and land cover ----
water, lakes, pools = [], [], []
for r in rows('water'):
    g = shapely.from_wkb(r['geometry'])
    if not inbox(g) or g.geom_type not in ('Polygon', 'MultiPolygon'):
        continue
    if r['subtype'] in ('ocean', 'water', 'river') or r['class'] in ('bay', 'strait'):
        water.append(g)
    elif r['subtype'] in ('lake', 'pond') or r['class'] in ('lagoon', 'reflecting_pool'):
        lakes.append(g)
    elif r['class'] == 'swimming_pool':
        pools.append(g)
D['water'] = enc_polys([unary_union(water)], 2)
D['lakes'] = enc_polys(lakes, 1)
D['pools'] = enc_polys(pools, .5, 2)
cover = {'forest': [], 'beach': [], 'grass': [], 'rock': []}
trees = []
for r in rows('land'):
    g = shapely.from_wkb(r['geometry'])
    if not inbox(g):
        continue
    if r['subtype'] == 'tree' and g.geom_type == 'Point':
        trees.append(g)
    elif r['subtype'] == 'forest' and g.geom_type in ('Polygon', 'MultiPolygon'):
        cover['forest'].append(g)
    elif r['subtype'] == 'sand' and g.geom_type in ('Polygon', 'MultiPolygon'):
        cover['beach'].append(g)
    elif r['subtype'] in ('grass', 'shrub') and g.geom_type in ('Polygon', 'MultiPolygon'):
        cover['grass'].append(g)
    elif r['subtype'] == 'rock' and g.geom_type in ('Polygon', 'MultiPolygon'):
        cover['rock'].append(g)
for k, v in cover.items():
    D[k] = enc_polys([unary_union(v)] if v else [], 2)
use = {'park': [], 'lawn': [], 'field': [], 'court': [], 'golf': [], 'play': [], 'marina': [], 'garden': [], 'res': [], 'com': []}
named = []
for r in rows('land_use'):
    g = shapely.from_wkb(r['geometry'])
    if not inbox(g) or g.geom_type not in ('Polygon', 'MultiPolygon'):
        continue
    c, s = r['class'], r['subtype']
    k = ('park' if c in ('park', 'dog_park', 'national_park', 'nature_reserve') else
         'lawn' if c in ('grass', 'meadow', 'recreation_ground') else
         'field' if c == 'pitch' and (r.get('surface') or '').endswith('grass') else
         'court' if c == 'pitch' else
         'golf' if s == 'golf' else
         'play' if c == 'playground' else
         'marina' if c == 'marina' else
         'garden' if s == 'horticulture' else
         'res' if c == 'residential' else
         'com' if s == 'developed' or c in ('school', 'religious', 'plaza', 'pedestrian') else None)
    if k:
        use[k].append(g)
for k, v in use.items():
    D[k] = enc_polys(v, 1)

# ---- streets, the seawall, bike paths, footpaths ----
lines = {'hwy': [], 'main': [], 'street': [], 'bike': [], 'foot': [], 'rail': []}
for r in rows('segment'):
    g = shapely.from_wkb(r['geometry'])
    if not inbox(g):
        continue
    c, nm = r['class'], ((r.get('names') or {}).get('primary') or '')
    if r['subtype'] == 'rail':
        continue
    k = ('hwy' if c in ('motorway', 'trunk', 'primary') else
         'main' if c in ('secondary', 'tertiary') else
         'street' if c in ('residential', 'service', 'unclassified', 'living_street') else
         'bike' if c == 'cycleway' or 'Bike' in nm else
         'foot' if c in ('footway', 'path', 'pedestrian', 'track', 'bridleway') else None)
    if k:
        lines[k].append(g)
D['roads'] = {k: enc_lines(v) for k, v in lines.items()}

# ---- buildings: centre, footprint size, heading, height ----
bld = []
for r in rows('building'):
    g = shapely.from_wkb(r['geometry'])
    if not inbox(g):
        continue
    g = tx(g)
    if g.area < 25:
        continue
    rr = g.minimum_rotated_rectangle
    cs = list(rr.exterior.coords)
    e1 = (cs[1][0] - cs[0][0], cs[1][1] - cs[0][1]); e2 = (cs[2][0] - cs[1][0], cs[2][1] - cs[1][1])
    l1, l2 = math.hypot(*e1), math.hypot(*e2)
    long_e = e1 if l1 >= l2 else e2
    yaw = math.atan2(long_e[0], long_e[1])          # long side along the model's z (game y) at yaw 0
    h = r.get('height') or ((r.get('num_floors') or 0) * 3.2) or (6 if g.area < 250 else 12)
    c = g.centroid
    bld.append([round(c.x), round(c.y), round(min(l1, l2)), round(max(l1, l2)), round(yaw, 2), round(h)])
D['bld'] = bld

# ---- street furniture and trees ----
pts = {'bench': [], 'lamp': [], 'bin': [], 'hydrant': [], 'fountain': [], 'toilets': [], 'art': [], 'tree': [], 'bikerack': []}
parking = []
piers = []
for r in rows('infrastructure'):
    g = shapely.from_wkb(r['geometry'])
    if not inbox(g):
        continue
    c = r['class']
    if c == 'parking' and g.geom_type in ('Polygon', 'MultiPolygon'):
        parking.append(g); continue
    if c == 'pier':
        piers.append(g); continue
    k = {'bench': 'bench', 'street_lamp': 'lamp', 'waste_basket': 'bin', 'fire_hydrant': 'hydrant', 'fountain': 'fountain',
         'drinking_water': 'fountain', 'toilets': 'toilets', 'artwork': 'art', 'bicycle_parking': 'bikerack'}.get(c)
    if k and g.geom_type == 'Point':
        x, y = P(g.x, g.y); pts[k] += [round(x), round(y)]
for t in trees:
    x, y = P(t.x, t.y); pts['tree'] += [round(x), round(y)]
D['pts'] = pts
D['parking'] = enc_polys(parking, 1)
D['piers'] = enc_polys([p for p in piers if p.geom_type in ('Polygon', 'MultiPolygon')], .5, 2)
D['pierl'] = enc_lines([p for p in piers if p.geom_type == 'LineString'], .5)

js = '/* World 3 (Stanley Park) map, baked by tools/bake-stanley.py. Map data (c) OpenStreetMap contributors (ODbL), via Overture Maps. */\n'
js += 'window.HH_SP = ' + json.dumps(D, separators=(',', ':')) + ';\n'
open(OUT, 'w').write(js)
print(OUT, len(js) // 1024, 'KB', {k: (len(v) if isinstance(v, list) else {a: len(b) for a, b in v.items()}) for k, v in D.items() if k not in ('proj', 'W', 'H')})
