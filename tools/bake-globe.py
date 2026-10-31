#!/usr/bin/env python3
"""Bake World 5 (The Globe) map data from Natural Earth into data/globe.js.

Natural Earth is public domain (naturalearthdata.com). Inputs (GeoJSON, in one folder):
  ne_50m_land, ne_50m_lakes, ne_50m_admin_0_countries, ne_50m_rivers_lake_centerlines,
  ne_50m_populated_places_simple, ne_10m_roads
Output: window.HH_GLOBE with coordinates as integer hundredths of a degree (lon, lat), simplified for the game:
  land / lakes polygons, country outlines (ISO-2 code, name, polygon rings), rivers and major highways as lines,
  and the biggest cities per country (for the landmark layer).

python3 tools/bake-globe.py <natural-earth-dir> data/globe.js
"""
import json, sys
import shapely
from shapely.geometry import shape, Polygon, MultiPolygon, LineString, MultiLineString

SRC, OUT = sys.argv[1], sys.argv[2]


def load(n):
    return json.load(open(f'{SRC}/{n}.geojson'))['features']


def q(v):
    return round(v * 100)


def enc_poly(g, tol, minarea=0.0):
    out = []
    g = g.simplify(tol, preserve_topology=True)
    ps = [g] if isinstance(g, Polygon) else list(getattr(g, 'geoms', []))
    for p in ps:
        if not isinstance(p, Polygon) or p.area < minarea:
            continue
        rings = [p.exterior] + [r for r in p.interiors if Polygon(r).area > minarea * 4]
        rr = [[q(v) for xy in r.coords[:-1] for v in xy] for r in rings if len(r.coords) > 3]
        if rr:
            out.append(rr)
    return out


def enc_line(g, tol):
    g = g.simplify(tol)
    ls = [g] if isinstance(g, LineString) else list(getattr(g, 'geoms', []))
    return [[q(v) for xy in l.coords for v in xy] for l in ls if isinstance(l, LineString) and len(l.coords) > 1]


D = {'q': 100}
D['land'] = [r for f in load('ne_50m_land') for r in enc_poly(shape(f['geometry']), .015, .01)]
D['lakes'] = [r for f in load('ne_50m_lakes') if (f['properties'].get('scalerank') or 9) <= 5 for r in enc_poly(shape(f['geometry']), .03, .02)]
cs = []
for f in load('ne_50m_admin_0_countries'):
    p = f['properties']
    iso = p.get('ISO_A2_EH') or p.get('ISO_A2')
    if not iso or iso == '-99':
        iso = p['ADM0_A3'][:2]
    nm = p.get('NAME_LONG') or p['NAME']
    cs.append([iso, nm, p['ADM0_A3'], enc_poly(shape(f['geometry']), .06, .002)])
D['countries'] = cs
riv = []
for f in load('ne_50m_rivers_lake_centerlines'):
    p = f['properties']
    if (p.get('scalerank') or 9) <= 5:
        riv += [[p.get('name_en') or p.get('name') or ''] + [l] for l in enc_line(shape(f['geometry']), .05)]
D['rivers'] = riv
hw = []
for f in load('ne_10m_roads'):
    p = f['properties']
    if p.get('type') in ('Major Highway', 'Beltway') and (p.get('scalerank') or 9) <= 4 and f['geometry']:
        hw += enc_line(shape(f['geometry']), .03)
# join tiny pieces away: keep lines with some length
D['hwy'] = [l for l in hw if len(l) >= 4]
cities = []
for f in load('ne_50m_populated_places_simple'):
    p = f['properties']
    cities.append([p['name'], p['adm0_a3'], q(p['longitude']), q(p['latitude']), int(p.get('pop_max') or 0), int(p.get('adm0cap') or 0)])
cities.sort(key=lambda c: -c[4])
D['cities'] = cities
js = '/* World 5 (The Globe) map, baked by tools/bake-globe.py from Natural Earth (public domain). Coordinates: hundredths of a degree. */\n'
js += 'window.HH_GLOBE = ' + json.dumps(D, separators=(',', ':'), ensure_ascii=False) + ';\n'
open(OUT, 'w').write(js)
print(OUT, len(js.encode()) // 1024, 'KB', {k: len(v) for k, v in D.items() if isinstance(v, list)})
