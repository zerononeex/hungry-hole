#!/usr/bin/env python3
"""v5.2 Part 17: bake the owner's world_195_countries_famous_landmarks.xlsx (195 countries, 10-15 famous places each,
2,358 in all) into data/globe-landmarks52.js.

Locations: tools/landmarks/geo-*.txt, one "lat lon" line per landmark in the spreadsheet's order under "# Country".
They were written by the builder from general geographic knowledge (no geocoding service was reachable from the
build machine) and every one is checked here against the Globe's own country outlines (data/globe.js):
  - inside its country: kept as written
  - a land place within 0.5 deg of its country (the 1:50m coastline is simplified): moved onto the nearest land of
    its own country
  - a wet place (reef, marine park, blue hole, lagoon, bay, dive site...): kept at sea, in its own country's waters
  - an island or atoll too small for the 1:50m map: kept, and a small island outline is added to that country
A place inside a neighbour's outline by under 0.4 deg (simplified borders) goes just inside its own side; anything
further into another country stops the bake.

Each landmark: [ISO2, label, lon, lat, look, kind, radius (deg, areas only), spreadsheet name]
  kind  - 'pt' a built place (an eatable model, look = the game's landmark model)
          'area' a natural feature (painted on the ground as an area, named on the map)
No franchise names: theme parks and film sets become "a theme park" (the game's own castle park), brand names
become what the place is.

python3 -I tools/bake-landmarks.py landmarks.xlsx data/globe.js tools/landmarks data/globe-landmarks52.js
"""
import glob, json, math, re, sys, unicodedata
import openpyxl
from shapely.geometry import Point, Polygon, MultiPolygon
from shapely.ops import nearest_points

XLSX, GLOBE, GEODIR, OUT = sys.argv[1:5]
ALIAS = {'Brunei': 'BN', 'Cabo Verde': 'CV', 'Congo (Republic of the)': 'CG', 'Czechia': 'CZ', 'Eswatini': 'SZ', 'Gambia': 'GM',
         'Laos': 'LA', 'Micronesia (Federated States of)': 'FM', 'North Korea': 'KP', 'Russia': 'RU', 'South Korea': 'KR',
         'Vatican City': 'VA', 'Sao Tome and Principe': 'ST', 'São Tomé and Príncipe': 'ST'}
# the five sovereign states the 1:50m map has no outline for (the game draws these same circles: index.html MICRO)
MICRO = {'VA': [(12.4534, 41.9029, .006)], 'MC': [(7.4246, 43.7384, .012)], 'NR': [(166.931, -.5228, .035)],
         'TV': [(179.19, -8.52, .04), (177.15, -7.48, .03), (178.68, -7.48, .03), (179.88, -9.38, .03), (176.12, -5.69, .03)],
         'MV': [(73.51, 4.18, .07), (73.42, 3.22, .06), (73.08, 1.87, .06), (73.15, -.62, .07), (72.98, 5.62, .06), (73.02, 6.65, .06), (73.55, 2.3, .05)]}

# no franchise IP: theme parks and film sets are the game's own unbranded castle park; brands say what the place is
THEME = re.compile(r'legoland|tivoli gardens|disney|ferrari world|jerudong park|haw par villa|hobbiton|popeye village|universal studios|everland|six flags', re.I)
BRAND = {'Guinness Storehouse': 'a brewery museum', 'Mount Gay Rum Visitor Centre': 'a rum distillery', 'Atlantis Paradise Island': 'a big seaside resort',
         'Empire Brunei': 'a grand hotel', 'Phang Nga Bay (James Bond Island)': 'Phang Nga Bay', 'Caribelle Batik': 'a batik workshop',
         'Swazi Candles Centre': 'a candle workshop', 'Giant\'s Causeway (shared island tip) / Blarney Castle': 'Blarney Castle'}

# natural features -> painted areas: (pattern, area type, radius in degrees)
AREAS = [(r"giant's causeway|hopewell rocks", 'beach', .04), (r'highlands|whistler|blackcomb|ski resort', 'mountain', .25), (r'great barrier reef', 'reef', 2.5), (r'\breefs?\b|coral|blue corner|dive site|marine (national )?park|marine reserve|sea park|protected area', 'reef', .25),
         (r'blue hole|ocean trench|sinkhole', 'water', .03),
         (r'\bdesert\b|sahara|kalahari|gobi|sand dunes|dunes|erg chebbi|wahiba sands|sand sea|singing dune', 'desert', .8),
         (r'salt flats?|salt pans?|salar|chott|salt lake|lac salé|pedra de lume', 'salt', .3),
         (r'glacier|jökulsárlón|ice cave|icefield', 'ice', .15),
         (r'rainforest|cloud forest|\bforest\b|jungle|mangrove|pushcha|hallerbos|bamboo grove', 'forest', .25),
         (r'wetlands?|swamp|marsh|\bdelta\b|okavango|pantanal|sudd|bog', 'wetland', .5),
         (r'canyon|gorge|ravine|fjord|\bsound\b|tsingy|karst|stone forest|chimneys', 'canyon', .15),
         (r'falls\b|waterfalls?|cascades?|cascata|cataract|chutes|saltos|foss\b|foss |gullfoss|skógafoss|seljalandsfoss|dettifoss', 'falls', .04),
         (r'\blakes?\b|\blagoons?\b|lagoa|laguna|lac\b|loch|\bpool\b|crater lake|heaven lake|blue eye|\bbay\b|bahía|\bcove\b|\binlet\b|strait|channel|kaindy', 'water', .12),
         (r'archipelago|islands\b|\bcays\b|\batoll\b|island group|isles|keys', 'islands', .25),
         (r'volcano|volcán|volcanic|\bcrater\b|caldera|mud volcanoes', 'volcano', .1),
         (r'mountains?\b|\bmount\b|\bmt\.?\b|\bpeak\b|\bpico\b|highlands|massif|\brange\b|ridge|\bhills\b|plateau|\bpass\b|monte\b|jebel|jabal|cerro|\bmorne\b|alps|alpine|\btepui|roraima|uluru|table mountain|matterhorn|jungfrau|kilimanjaro|everest|fuji', 'mountain', .2),
         (r'national park|nature park|natural park|nature reserve|game reserve|wildlife|reserve\b|sanctuary|biosphere|conservation area|safari|\bpark\b(?!.*(palace|museum|monument))', 'park', .3),
         (r'valley|vale|valle|plain of|\bplain\b|savannah|steppe|corridor|grasslands?', 'valley', .25),
         (r'beach|playa|praia|plage|\bsands\b|\bcoast\b|riviera|seashore', 'beach', .04),
         (r'\bisland\b|\bisla\b|\bilha\b|\bîle\b|\bnosy\b|\bkoh\b|\bcay\b|\bmotu\b|\bislet', 'island', .06),
         (r'\bcaves?\b|grotto|cave of|underground lake', 'cave', .03),
         (r'hot springs?|geysers?|geothermal|thermal wonderland|blowholes?', 'springs', .04),
         (r'\briver\b|rapids|meeting of waters|confluence', 'river', .1),
         (r'oasis', 'oasis', .05)]
BUILT = re.compile(r'palace|castle|fort\b|fortress|citadel|cathedral|church|basilica|mosque|temple|monastery|abbey|museum|tower|bridge|'
                   r'square|market|souq|bazaar|memorial|monument|statue|mausoleum|tomb|ruins|archaeolog|ancient|historic|old town|'
                   r'gate|stadium|opera|theatre|theater|library|station|hotel|house|villa|garden|cemetery|shrine|pagoda|stupa|'
                   r'wall\b|walls\b|amphitheatre|arena|dam\b|lighthouse|harbour|port\b|wharf|quarter|district|village|town\b|city\b|centre|center', re.I)
POINT = re.compile(r'lighthouse|\btower\b|skytree|castle|palace|cathedral|mosque|church|museum|statue|stadium|opera house', re.I)
# which landmark model a built place uses (the game's existing landmark looks)
LOOKS = [(r'pyramid', 'steppyr'), (r'mosque|masjid|minaret|jame\'', 'mosque'), (r'mud mosque|djenn|djinguereber|sankore|agadez', 'mudmosque'),
         (r'cathedral|basilica|church|chapel|abbey|monastery|sanctuary of|kirk|duomo|sé\b|chiesa|lavra|pogost|sophia', 'church'),
         (r'pagoda', 'pagoda'), (r'stupa|chorten|dagoba|boudhanath|swayambhunath|shwedagon|borobudur', 'stupa'), (r'shrine|torii|jinja|taisha', 'shrine'),
         (r'temple|wat\b|kovil|mandir|angkor|bayon|prohm|ziggurat', 'temple'), (r'castle|schloss|château|chateau|alcázar|kasbah|dzong', 'castle'),
         (r'fort\b|fortress|citadel|bastion|kale\b|qal|ramparts|walls\b|wall\b|casemates|ark of', 'fort'),
         (r'palace|palais|palacio|palazzo|istana|qasr|rova|residenz|residence', 'palace'), (r'bridge|most\b|pont\b|ponte|puente|viaduct|causeway', 'bridge'),
         (r'lighthouse|phare|farol', 'lighthouse'), (r'tower|skytree|torre|minar|spire|needle|turm', 'tower'), (r'ferris|giant wheel|riesenrad|\beye\b', 'wheel'),
         (r'windmill', 'windmill'), (r'statue|christ|buddha|colossus|monument|memorial|obelisk|arch\b|arc\b|gate|mausoleum|tomb|heroes', 'statue'),
         (r'stadium|circuit|arena|oval', 'stadium'), (r'opera|theatre|theater|concert hall|library', 'opera'),
         (r'ruins|archaeolog|ancient|roman|greek|mayan|maya|inca|amphitheatre|acropolis|forum|necropolis|petroglyph|rock art|megalith|stone circle|henge', 'ruins'),
         (r'dam\b|locks|canal', 'dam'), (r'skyscraper|burj|twin towers|trade center|centre tower|tower$', 'skyscraper'),
         (r'market|souq|souk|bazaar|mall|quarter|old town|old city|historic|medina|district|village|town|city|street|square|plaza|boulevard|promenade|waterfront|corniche', 'skyline'),
         (r'museum|gallery|museo|musée|center|centre|house|villa|hall|parliament|capitol|government', 'palace'), (r'garden|park', 'forest')]


def norm(s):
    return unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower().replace('&', 'and').replace('.', '').strip()


def split_list(s):
    out, d, cur = [], 0, ''
    for ch in s:
        d += ch == '('; d -= ch == ')'
        if ch == ',' and d == 0:
            out.append(cur.strip()); cur = ''
        else:
            cur += ch
    if cur.strip():
        out.append(cur.strip())
    return out


def circle(lon, lat, r, n=12):
    return Polygon([(lon + math.cos(a * 2 * math.pi / n) * r, lat + math.sin(a * 2 * math.pi / n) * r) for a in range(n)])


def main():
    src = open(GLOBE, encoding='utf-8').read()
    g = json.loads(src[src.index('{'):src.rstrip().rstrip(';').rindex('}') + 1])
    codes = {norm(r[1]): r[0] for r in g['countries']}
    shapes = {}
    for r in g['countries']:
        for poly in r[3]:
            rings = [[(ring[i] / 100, ring[i + 1] / 100) for i in range(0, len(ring), 2)] for ring in poly]
            if len(rings[0]) >= 3:
                shapes.setdefault(r[0], []).append(Polygon(rings[0], rings[1:]).buffer(0))
    for cc, dots in MICRO.items():
        shapes.setdefault(cc, []).extend(circle(lo, la, rr) for lo, la, rr in dots)
    geo = {cc: MultiPolygon([p for q in v for p in (q.geoms if hasattr(q, 'geoms') else [q])]) for cc, v in shapes.items()}

    ws = openpyxl.load_workbook(XLSX, read_only=True)['195 Countries & Landmarks']
    rows = [r for r in ws.iter_rows(values_only=True)][1:]
    names = {r[0].strip(): split_list(r[1]) for r in rows if r and r[0]}
    coords = {}
    for f in sorted(glob.glob(GEODIR + '/geo-*.txt')):
        cur = None
        for line in open(f, encoding='utf-8').read().split('\n'):
            if line.startswith('# '):
                cur = line[2:].strip(); coords[cur] = []
            elif line.strip():
                lat, lon = map(float, line.split()[:2]); coords[cur].append((lon, lat))
    out, islands, stats = [], {}, {'inside': 0, 'snapped': 0, 'wet': 0, 'island': 0, 'theme': 0, 'area': 0, 'pt': 0}
    bad = []
    for country, lst in names.items():
        cc = ALIAS.get(country) or codes.get(norm(country))
        if not cc or cc not in geo:
            sys.exit(f'no map country for {country}')
        if len(coords.get(country, [])) != len(lst):
            sys.exit(f'{country}: {len(lst)} landmarks but {len(coords.get(country, []))} locations')
        for name, (lon, lat) in zip(lst, coords[country]):
            label, look, kind, rad = BRAND.get(name, name), None, 'pt', 0
            if THEME.search(name):
                label, look = 'a theme park', 'themepark'; stats['theme'] += 1
            else:
                n = name.lower()
                for rx, typ, r in ([] if POINT.search(n) else AREAS):
                    if re.search(rx, n) and not (typ in ('park', 'valley', 'mountain', 'beach', 'island', 'river') and BUILT.search(re.sub(r'\(.*?\)', '', n)) and not re.search(r'national park|nature|reserve|wildlife', n)):
                        if typ == 'park' and not re.search(r'national|reserve|wildlife|sanctuary|biosphere|conservation|safari|nature|natural|marine|geopark', n):
                            r = .04   # a city park (Stanley Park, Central Park) is a park, not a national park
                        kind, look, rad = 'area', typ, r; break
                if kind == 'pt':
                    look = next((lk for rx, lk in LOOKS if re.search(rx, n)), 'palace')
            stats[kind] += 1
            p, shp = Point(lon, lat), geo[cc]
            wet = kind == 'area' and look in ('reef', 'water', 'islands', 'island')
            if shp.contains(p):
                stats['inside'] += 1
            else:
                d = shp.distance(p)
                other = next((c for c, s in geo.items() if c != cc and s.contains(p)), None)
                if other and d > .4:
                    bad.append(f'{country} | {name} lies in {other} ({d:.2f} deg out)'); continue
                if other:  # a border place: the 1:50m border is simplified, so it goes just inside its own side
                    q = nearest_points(shp.buffer(-0.01) if not shp.buffer(-0.01).is_empty else shp, p)[0]
                    lon, lat = round(q.x, 4), round(q.y, 4); stats['snapped'] += 1
                    out.append([cc, label, lon, lat, look, kind, rad, name]); continue
                near = min(geo.items(), key=lambda kv: kv[1].distance(p))[0]
                if wet and (near == cc or d < .6):
                    stats['wet'] += 1
                elif d <= .5 and not re.search(r'island|atoll|isla|ilha|île|cay|motu|islet', name, re.I):
                    q = nearest_points(shp.buffer(-0.005) if not shp.buffer(-0.005).is_empty else shp, p)[0]
                    lon, lat = round(q.x, 4), round(q.y, 4); stats['snapped'] += 1
                else:
                    rr = .05 if kind == 'pt' or look == 'island' else min(.12, rad * .4)
                    islands.setdefault(cc, []).append([round(lon, 4), round(lat, 4), rr]); stats['island'] += 1
            out.append([cc, label, round(lon, 4), round(lat, 4), look, kind, rad, name])
    if bad:
        sys.exit('\n'.join(bad))
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('/* v5.2 Part 17: the owner\'s landmark roster (world_195_countries_famous_landmarks.xlsx), baked by\n'
                '   tools/bake-landmarks.py: [ISO2, label, lon, lat, look, kind (pt | area), area radius (deg), spreadsheet name].\n'
                '   islands: small outlines for islands and atolls too small for the 1:50m map, per country [lon, lat, radius]. */\n')
        f.write('window.HH_LM2 = ' + json.dumps({'lm': out, 'islands': islands}, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(len(out), 'landmarks;', json.dumps(stats))


main()
