#!/usr/bin/env python3
"""v5.2 Part 16: bake the owner's world_animals.xlsx (195 countries x 8 animals; Animal 1 = flagship) into
data/globe-animals.js, keyed by the Globe's ISO-2 country codes.

Each animal: [species name, model family, habitat, colour, second colour]
  family  - one of the game's low-poly animal families (tools/animal_families.py; every species must map, never a guess)
  habitat - land | coast | sea | river (where on the Globe it roams: the country's land, its shore, its coastal sea,
            or its rivers and lakes)

python3 -I tools/bake-animals.py world_animals.xlsx data/globe.js data/globe-animals.js
"""
import json, re, sys, os, unicodedata
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import openpyxl
import animal_families as AF

XLSX, GLOBE, OUT = sys.argv[1:4]

# dataset country name -> the Globe's ISO-2 code, where the map data spells it differently
ALIAS = {'Brunei': 'BN', 'Cabo Verde': 'CV', 'Congo (Republic of the)': 'CG', 'Czechia': 'CZ', 'Eswatini': 'SZ', 'Gambia': 'GM',
         'Laos': 'LA', 'Micronesia (Federated States of)': 'FM', 'North Korea': 'KP', 'Russia': 'RU', 'South Korea': 'KR',
         'Vatican City': 'VA', 'Sao Tome and Principe': 'ST', 'São Tomé and Príncipe': 'ST'}


def norm(s):
    return unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower().replace('&', 'and').replace('.', '').strip()


def country_codes(globe_js):
    src = open(globe_js, encoding='utf-8').read()
    data = json.loads(src[src.index('{'):src.rstrip().rstrip(';').rindex('}') + 1])
    return {norm(r[1]): r[0] for r in data['countries']}


# colours: the species' own colour words first, then the family's usual coat
WORDS = [(r'\bpolar\b|\bsnow\b|\barctic\b|white(?!-)|albino|beluga', '#f4f4f0'), (r'\bblack\b|panther', '#2b2b2b'), (r'golden|gold\b', '#e0a526'),
         (r'\bred\b|rufous', '#b5523b'), (r'scarlet|crimson|tomato', '#d0342c'), (r'\bblue\b|hyacinth', '#2f6fd0'), (r'\bgreen\b|emerald|kakapo|iguana', '#3f9b4a'),
         (r'grey|gray|silver', '#8d9399'), (r'brown|grizzly', '#7a5232'), (r'yellow', '#f2c94c'), (r'pink|flamingo', '#f28fb1'),
         (r'purple|violet', '#7e57c2'), (r'orange|monarch|orangutan', '#e67e22'), (r'tawny|sand|desert|fennec|dorcas|camel|lion\b', '#d8b26e')]
FAM = {'cat': '#d9a441', 'bear': '#6d4c33', 'panda': '#f5f5f5', 'canine': '#9a7b5a', 'hyena': '#a08a62', 'deer': '#9c6b3f', 'antelope': '#b98a52',
       'goat': '#a59580', 'bovine': '#5b4636', 'horse': '#8b5a2b', 'camelid': '#cfa875', 'elephant': '#8e9196', 'rhino': '#8a8d90', 'hippo': '#8d7f86',
       'tapir': '#4a4a4f', 'giraffe': '#d8a752', 'pig': '#6e5545', 'primate': '#6b4a35', 'marsupial': '#a9805a', 'monotreme': '#6d5240', 'rodent': '#8a6a4a',
       'rabbit': '#a68b6c', 'smallmammal': '#7b6450', 'smallcarnivore': '#a28b6a', 'otter': '#5b4231', 'bat': '#4a3b33', 'glider': '#8a7a6a',
       'whale': '#4f6577', 'dolphin': '#8fa3b5', 'seal': '#7d8790', 'seacow': '#8e8f8a', 'shark': '#7c8c99', 'ray': '#4d5b66', 'fish': '#e08a3c',
       'seaturtle': '#5d8a4f', 'turtle': '#6b7a45', 'croc': '#55703b', 'snake': '#5b7d3a', 'lizard': '#6f9a4a', 'frog': '#4caf50', 'salamander': '#e5884f',
       'bird': '#4f8fd6', 'raptor': '#6b4b2f', 'parrot': '#2fae4f', 'wader': '#e8e8e2', 'waterfowl': '#f2f2ee', 'seabird': '#ecf0f1', 'penguin': '#222831',
       'ratite': '#5a4a40', 'fowl': '#b5651d', 'insect': '#f39c12', 'jelly': '#f7c948', 'octopus': '#d9734e', 'snail': '#f0b090', 'crab': '#c0392b'}
SECOND = {'panda': '#1e1e1e', 'penguin': '#f4f4f0', 'bird': '#f2c94c', 'parrot': '#e74c3c', 'raptor': '#f0e6d2', 'giraffe': '#7a4a22', 'cat': '#3a2a1a',
          'whale': '#e8eef2', 'dolphin': '#e8eef2', 'seaturtle': '#a0794a', 'turtle': '#8a6a3a', 'wader': '#2b2b2b', 'fowl': '#2f6b3a'}


# shape details by species within a family (the family never changes: a koala is a marsupial drawn sitting, not a kangaroo)
EXTRA = [(r'zebra', {'stripes': 1, 'a': '#f5f5f5', 'b': '#1a1a1a'}), (r'tiger', {'stripes': 1, 'b': '#222'}),
         (r'\blion\b(?!.*tamarin)', {'mane': '#8a5a2a'}), (r'leopard|jaguar|cheetah|ocelot|genet|serval', {'spots': 1, 'b': '#3a2a1a'}),
         (r'llama|alpaca|vicu|guanaco', {'hump': 0}), (r'okapi', {'neck': .5, 'lh': 1.1, 'stripes': 1, 'b': '#f0e6d2', 'spots': 0}),
         (r'koala', {'m': 'koala'}), (r'wombat|tasmanian devil|opossum|cuscus', {'m': 'quadlow'}), (r'tree-kangaroo', {'m': 'roo', 'tail': 1.2}),
         (r'echidna', {'spikes': 1}), (r'orca', {'a': '#111', 'belly': '#fafafa', 'fin': .8}), (r'hammerhead', {'d': 3.2}),
         (r'gorilla|orangutan|chimpanzee|bonobo', {'tail': 0, 'big': 1}), (r'sloth', {'lh': .25}), (r'giant panda', {}),
         (r'flamingo', {'neck': 1, 'lg': 1.6}), (r'peafowl|peacock', {'tail': '#1f8a70'}), (r'bald eagle', {'head': '#fafafa'}),
         (r'puffin', {'beak': '#e8541e', 'a': '#222', 'head': '#f4f4f0'}), (r'toucan|hornbill', {'beak': '#f39c12'})]


def extra(name):
    n, out = name.lower(), {}
    for rx, e in EXTRA:
        if re.search(rx, n):
            out.update(e)
    return out


def colour(name, fam):
    n = name.lower()
    if fam not in ('panda', 'penguin', 'whale', 'dolphin', 'shark'):
        for rx, c in WORDS:
            if re.search(rx, n):
                return c
    return FAM[fam]


def main():
    codes = country_codes(GLOBE)
    ws = openpyxl.load_workbook(XLSX, read_only=True)['World Wildlife Directory']
    rows = [r for r in ws.iter_rows(values_only=True)]
    head = next(i for i, r in enumerate(rows) if r and r[0] == 'Country')
    out, unmapped, nocode = {}, [], []
    for r in rows[head + 1:]:
        if not r or not r[0]:
            continue
        name = r[0].strip()
        cc = ALIAS.get(name) or codes.get(norm(name))
        if not cc:
            nocode.append(name); continue
        lst = []
        for a in r[3:11]:
            a = (a or '').strip()
            fam = AF.family(a)
            if not fam:
                unmapped.append(a); continue
            row = [a, fam, AF.habitat(a, fam), colour(a, fam), SECOND.get(fam, '')]
            ex = extra(a)
            if ex:
                row.append(ex)
            lst.append(row)
        out[cc] = {'n': name, 'cont': r[1], 'sub': r[2], 'a': lst}
    if unmapped or nocode:
        sys.exit(f'unmapped species: {unmapped}; countries without a map code: {nocode}')
    fams = sorted({a[1] for v in out.values() for a in v['a']})
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('/* v5.2 Part 16: every country\'s animals, from the owner\'s world_animals.xlsx (195 countries x 8; the first is the\n'
                '   flagship / national animal). Baked by tools/bake-animals.py: [species, model family, habitat, colour, colour 2, {shape details}]. */\n')
        f.write('window.HH_AN = ' + json.dumps({'fams': fams, 'c': out}, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(f'{len(out)} countries, {sum(len(v["a"]) for v in out.values())} animals, {len(fams)} families: {" ".join(fams)}')


main()
