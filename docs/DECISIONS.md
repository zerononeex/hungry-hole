# HUNGRY HOLE v2 — builder decisions log

Things the spec left open, things that could not be done exactly as written, and the
call made instead. Newest at the bottom of each section. Kakashi: anything here is a
one-line change if the owner disagrees.

## Structure and flow
- **Ch 1 unlock vs. back door.** Finishing the 3-item checklist completes and unlocks
  Ch 2 (spec: "finishing all 3 checklist items completes the chapter"). The back door is
  still the exit: until the checklist is done it says "Finish your checklist, then sneak
  out the back door!", after it plays the chapter-complete screen.
- **Stairs slide is gated on eating a bed.** The stairs are a one-way slide, and the bed
  (a checklist item) is upstairs. To stop a child sliding down early and soft-locking the
  checklist, the stairs stay blocked ("Eat a bed first, then slide down the stairs!")
  until a bed is eaten. Everything else required is reachable downstairs too.
- **Doors.** At size 1–2 the hole slips under doors; at sizes 3–5 doors block; from size 6
  a door is just a tier-6 object and can be eaten.
- **The Sun (Ch 6) is locked until all 8 planets are eaten** (it is the last checklist item;
  eating it first would skip the planet lesson). It shows as inactive until then.
- **Chapter end screens.** Ch 5 ends with a short Moon cinematic, Ch 7 with the
  "YOU ARE THE BLACK HOLE" finale, credits, +5,000 coins and Journey complete (first time
  only). Other chapters show the normal chapter-complete card.
- **Avoid quests never fail.** Eating the forbidden thing resets that quest's count to 0
  with an "Oops! Start that one again" toast. Nothing is lost.
- **Quest helpers.** If an active quest or checklist item needs a small thing that is too
  tiny to see at the current zoom, a few copies are kept near the hole with a soft glow
  so it is always findable. A compass arrow (gold = checklist, blue = tiny quest) points
  at landmarks, sequence tiles, or the country/municipality a quest needs.
- **Respawn.** Ordinary (generated) things respawn 45 s after being eaten, only when the
  hole is at least 4 hole-widths away, with a little pop-in. Checklist/quest/landmark
  objects (`keep`) never respawn once eaten.
- **Cultural respect: totem poles (Ch 3) are scenery and cannot be eaten.**

## Art
- **Code-drawn sprites for things with no emoji** (desk, dresser, fridge, BBQ, dog house,
  manhole, White Rock, dam, planets, stars, ring station, crystal moon, pyramids, Great
  Wall, landmarks, etc.). They are simple canvas shapes, no external images.
- **Ch 7 "laser moon" became a "Crystal Moon".** A grey moon with a dish reads as a famous
  film space station, which the no-franchise-IP rule forbids. It is now a purple moon with
  cyan crystal spikes. Same tier, same quest.
- **Emoji are game objects only.** All menus/buttons/HUD use text and inline SVG icons.
- **Icon links added.** `apple-touch-icon.png` and `icon-512.png` already at the repo root
  are linked from `<head>` (spec said Kakashi would wire them; harmless to do here).

## Economy and balance (playtested with an automated bot)
- Size need per level is `need × L²` (chapter `need` 22–100) so an efficient bot reaches
  max size in ~8–10 minutes per chapter; a child should take roughly 2–3× longer.
- Points per eat are a tier table × a per-chapter point value (`pv`) and drop to as low as
  15% for things far below the hole's size, so late-game sweeping cannot flood the wallet.
  Points convert to coins at 10:1 live, as specified.
- Upgrade cost = 30 × 1.4^(n−1) × chapter cost multiplier (1, 1.3, 1.8, 2.4, 3, 3.6, 4.5).
  Bot runs that finish the checklist and all 40 tiny quests earn enough to max about 2–3
  upgrades in that chapter, which is the spec target. Coins keep coming on replay.
- The v1 "magnet pickup" item is not built; the Magnet Aura upgrade covers that idea.
- Tiny quest bonus = 20 × chapter multiplier, checklist item bonus = 100 × multiplier.

## Geography and education
- **Ch 3 Metro Vancouver** uses a simple lon/lat projection (1 map unit ≈ 3 m) with
  hand-traced, simplified coastlines, rivers, highways and municipality rules. Positions
  are roughly real; shapes are simplified for play.
- **Ch 5 passport stamps** are given by the nearest country "seed" within a radius, which
  is conservative (open ocean and some border areas give no stamp). About 31 countries.
- **Speech** uses the browser's speechSynthesis after the first tap; if no voice is
  available it falls back to a ding.

## Things not done
- No skins, shop items, lives, ads, accounts, or multiplayer (spec).
- GitHub Pages, merging, and other repos were not touched (spec).

---

# v3: 3D revamp + pace retune (builder decisions, 2026-10-30)

Authority: SPEC v3 addendum > v2 rulings above > existing code. Every v2 ruling above still
holds (totem poles are scenery, Crystal Moon, stairs gated on a bed, the Sun locked until
all 8 planets, avoid quests reset and never fail, respawn rules), except the two "Art"
bullets about code-drawn sprites and emoji, which the 3D model library replaces.

## Renderer
- **Three.js r147 UMD build**, vendored as `three.min.js` at the repo root (from the npm
  package `three@0.147.0`, `build/three.min.js`, global `THREE`, no CDN). r147 is one of
  the last releases that still ships the classic UMD file. It is loaded by a plain
  `<script>` tag before the game script, so the site works offline after the first load.
- **Exactly one renderer.** The world is WebGL (`<canvas id="gl">`). The HUD, name plates,
  compass arrow, chapter transitions and cinematic captions are drawn on the existing 2D
  canvas (`#cv`) layered above it, and all DOM menus are unchanged. Nothing draws the
  world in 2D any more (see Cleanup).
- **Camera.** Perspective, fov 38°, fixed 55° tilt, always looking at the camera point
  that v2 already eased toward the hole. Its distance is derived from v2's zoom so the
  same world width fills the 1280×720 stage, which keeps zoom-with-size, Wide Eyes and the
  stage contain-fit exactly as in v2.
- **Camera-relative world.** Every frame places objects relative to the camera, which
  keeps float precision on the huge maps and makes the Ch 5 wrap-around globe seamless.
- **Ground.** One plane. Its texture is a 2048×1536 canvas region that follows the camera
  and is painted by each chapter's own v2 zone painter (`bg`), so roads, sand, grass and
  water look the way they did and water is still never eaten. It is repainted when the
  view leaves the region or the zoom changes by more than 28%. Space chapters hash their
  stars in world coordinates so they do not swim.
- **The hole.** The ground shader cuts the hole out and adds a soft shadow ring and a rim
  band that flashes on each swallow. Under it sits a shallow pit: a dark inner wall shader
  plus a slowly swirling floor disc. A faint ghost of the rim is drawn on top of
  everything, so the hole is never lost behind tall things.
- **X-ray.** Anything standing between the camera and the pit is drawn see-through
  (32%). My call: with real heights, a backpack or a tower would otherwise hide the hole
  completely.
- **Lighting.** A hemisphere sky/ground light plus one sun, computed per face on the CPU
  while the frame is built (identical maths to Lambert). There are no shadow maps; every
  object gets a soft blob shadow quad that is also cut out by the hole.
- **Landmark name plates are projected labels.** Each label is projected from the top of
  its object onto the HUD canvas, so the text stays crisp and readable at every zoom and
  never turns edge-on. Billboard sprites were the other option; projected labels need no
  per-label textures.
- **Ch 1 walls** are real 3D boxes (140 units high, with a dark cap) built once per
  chapter from the v2 wall rectangles. Doors face their gaps.

## Model library
- 203 procedural recipes built from box, cylinder, cone, sphere, prism, torus and
  rock primitives, flat shaded with vertex colours. Every type in all 7 chapters (410
  type entries) maps to a recipe and parameters, with per-chapter overrides where one name
  means different things (for example the Ch 4 island and the Ch 5 island). Families share
  recipes with palette variants (cars, trucks, buses; houses; towers; trees; quadrupeds;
  boats; planets; stars).
- **Footprint and height.** Each model is normalised so that its longest footprint side is
  1, which equals the object's **fit-width** (`1.3 × the tier's v2 size`). Heights are real
  ratios: a tower is 3.6 fit-widths tall, a sedan about 0.4, a mountain 0.7 to 0.85. A v2
  size factor `s > 1` now only makes a thing taller, so tiers and fits stay honest.
- The data test checks that every type resolves to a recipe, a footprint (w×d) and a
  height. It caught 11 types with recipes but no mapping (treasure chest, crown and nine
  World Tour foods, the doll and the tuk-tuk), which are now mapped.
- Natural things (trees, rocks, animals) get a random yaw. Authored furniture keeps the
  orientation it was placed with. Generated buildings snap to quarter turns.
- Letter, number and answer tiles are chunky 3D tiles whose top face is a small canvas
  texture. Coins are spinning 3D coins at 0.6 of their tier's fit-width.
- Rocky Mountains got a slate-blue palette so they read against the grey mountain zone.

## Topple physics
- **Fits** when `fit-width <= hole diameter`. Because the hole's diameter at size L runs
  from `1.3 × size(L)` up to the next size, this is exactly "tier <= size", so v2's
  progression is unchanged. A fitting object near the hole is captured: it tips over the
  rim toward the centre, sinks below the ground, spins and shrinks (340 ms), then the v2
  eat pipeline runs (XP, coins, quests, name flash, speech).
- **Support** is the share of the object's footprint circle that still has ground (circle
  overlap with the hole). Lean grows with missing support. A fitting thing leans harder as
  it goes. A too-big thing leans only up to a rest angle and stays put, with the v2 bump
  thud and wobble.
- **Wobble rule.** From 85% of the needed size, each solid bump (hole moving faster than a
  quarter of its own width per second, at most one bump every 300 ms) adds 0.36 wobble,
  so three solid bumps tip it in. Below 85% bumps only wobble it. Inactive things (wrong
  tiles, the Sun before the planets, gated items) never fall at any size.
- Movers (people, animals, cars) lean the same way. The Ch 5 Moon and the Ch 7 finale are
  rebuilt on the same capture and fall system, with scripted parameters (a slow 2.6 s fall
  for the Moon; the two giant stars spiral in, then everything in view, then the pit opens
  until the swirl fills the screen).
- Doors (anchored while size <= 2), the stairs and bed gate, the Sun lock and the totem
  poles behave as in v2.

## Spawning
- v2 chunk semantics are unchanged (authored grid plus generated tier layers, respawn
  rules). Two additions: the gather rectangle is padded by each layer's half fit-width, and
  authored cells by the widest authored footprint. Otherwise a mountain whose centre is just
  off screen would vanish while its slopes should still be visible.
- Off-screen things are culled per object, and things smaller than 16 px on screen are
  drawn as a single box in the model's main colour.

## Pace retune
- **Growth need is ×0.20 of v2, not ×0.35.** At ×0.35 with +50% XP the bot's checklist
  times were 2.3 to 5.0 minutes (Ch 2, 4, 5, 6 and 7 failed the gate). The addendum says
  to tune until the gate passes. The final values are need ×0.20 and XP per eat ×1.8
  (coins per eat scale the same way).
- Hole speed is +20% (3.6 to 4.32 hole-widths per second). Ch 5 travels at 5.2 because a
  globe has the most dead travel. Every run starts 30% of the way into size 1 (plus the
  Head Start upgrade).
- **Checklist trims** are as specified: Ch 1 Lego 12 and soldiers 6; Ch 4 trees 15 and
  whales 6; Ch 5 stamps 6 (Wonders stay 7); Ch 6 belt items 10.
- **Smaller worlds.**
  - Ch 2 is now 3×2 blocks of 20 houses (120 houses), with the park still one block away.
  - Ch 3 is ×0.6, Ch 4 ×0.55, and Ch 6 and Ch 7 ×0.42. A `shrinkMap` wrapper scales the
    map size, start, zones, regions, hints, areas, paths and painters together, so every
    named place keeps its real relative position.
  - Ch 5 is 200 map units per degree (was 400).
  - More eating near the hole comes from the shrink, because the same zone densities now
    sit in a smaller area.
- **v2 saves.** These are additive only, on the same key `hungry-hole-data-v1`:
  - A new per-chapter flag `mv: 3` marks a position as being on a v3 map. A v2 save
    without it has its position rescaled once onto the smaller map, and clamped inside it.
  - Checklist counts above a trimmed target are clamped to the new target. If the new
    targets are already met, the chapter completes on load.
  - The behaviour test loads a hand-written v2 save to cover this.

### Balance table (seeded bot, `node tests/balance-bot.js`, checklist sim-minutes)
| Chapter | seed 0 | seeds 0 to 4 | gate |
|---|---|---|---|
| Ch 1 The House | 0.85 | 0.55 to 2.33 | <= 2.5 |
| Ch 2 Neighbourhood | 1.80 | 1.39 to 1.82 | <= 2.5 |
| Ch 3 Metro Vancouver | 0.93 | 0.93 to 2.15 | <= 2.5 |
| Ch 4 Wilderness | 2.02 | 1.87 to 2.05 | <= 2.5 |
| Ch 5 World Tour | 2.38 | 2.28 to 2.83 | <= 3.0 |
| Ch 6 Space | 2.30 | 2.30 to 2.77 | <= 3.0 |
| Ch 7 The Humbling | 2.29 | 2.29 to 2.40 | <= 2.5 |

The bot now starts each chapter from a fresh state, makes seeded choices
(`BOT_SEED=n`), steers at the game's own speed, stops when the checklist is done and exits
non-zero if any chapter misses the gate. Ch 1 has the widest spread across seeds (how fast the bot
reaches its last checklist items varies most there).

## Performance
- Every visible object is baked into one dynamic mesh per material each frame:
  - solid, see-through, glowing parts, blob shadows and helper glows;
  - so there are about 7 draw calls in total, with no instancing.
- Lighting is baked per face during that pass, so the GPU runs the cheapest material.
- More savings:
  - Off-screen culling per object.
  - Tiny things are drawn as single boxes.
  - The ground texture has no mipmaps (it is repainted at the current zoom anyway).
  - Antialiasing is on only when `devicePixelRatio < 1.5`.
  - The 3D pixel ratio is capped at 1.6.
- **Adaptive resolution.** When frames average over 22 ms, the 3D layer's pixel ratio
  steps down, to half at most, and steps back up when frames are under 14 ms. The HUD
  stays sharp.
- **Probe result (`node tests/perf.js`)**:
  - Setup: Ch 3 downtown at size 4/8 (mid), 1180×820, steering in a loop for 10 s.
  - Result: **about 10 to 11 fps on average in headless Chromium in this build container.
    This is below the ≥50 target.**
  - Why: the container has no GPU, so Chromium draws WebGL with SwiftShader, a CPU
    software rasteriser. Measured there:
    - The full downtown scene takes about 160 ms of software-GPU time per frame at full
      resolution.
    - The ground quad alone takes about 15 ms.
    - The fps scales with vertex count, not with pixels or materials.
    - With the merged meshes hidden, the same page runs at 50 fps; with them it is about 13.
  - Tried and kept: CPU lighting, culling, box LOD, adaptive resolution and texture
    filtering.
  - Tried and reverted: per-chunk static meshes. They drew more vertices and were slower
    under SwiftShader.
  - The CPU side of a frame (game logic plus building the frame) is small next to that.
    Real hardware (an iPad GPU) runs vertex work orders of magnitude faster.
  - The 50 fps figure should be confirmed on a real iPad (Kakashi). If it falls short
    there, the next levers are `LOD_PX` (box LOD threshold), the region size `REG_W/REG_H`
    and the gather margins.

## Cleanup (exactly one renderer)
Deleted v2 2D world-rendering code. `grep` on the final `index.html` finds 0 hits for each
of these names:
- `drawWorld` (the 2D world pass), `drawTile`, `drawHole`, `drawMenuBack`, `drawStars`
  and `STARS`;
- `SPR` (the sprite cache), `PAINT` (the 2D painters for code-drawn things), `ball` and
  `EMOJI_FONT`;
- the 2D eat queue `G.falling`, and the 2D `ptrWorld` (replaced by a ground raycast).

The type tables are now `[name, tier, opts]`:
- The emoji slot was removed from all 410 type entries.
- All 2D-only `draw:` keys, the Ch 1 `box()` sprite helper and the planet and star colour
  options are gone.
- The Space helper filter uses a `planet` flag instead of `draw: 'planet'`.
- A page-level check confirmed that every chapter's parsed type data (name, tier, tags,
  size, plural, movement, sway) is byte-identical before and after.

`render()` now has one world path (`drawWorld3D`) and one menu path (`drawMenu3D`, the same
pit on a starry floor with props from every chapter circling in).

## Tests
- `tests/data.js`: as v2, plus every type resolves to a recipe, footprint and height. It
  exits non-zero on failure.
- `tests/behaviour.js` (16 checks), adapted to the physics:
  - fits, falls in, then is eaten;
  - too big leans toward the hole and is never eaten;
  - wobble at 90% tips in, wobble at 80% never does;
  - wrong tiles never fall, even at max size;
  - checklist and unlock, tiny quests, avoid quests, sequences;
  - Banker 60% and overdraft refused; upgrade spends only that wallet;
  - per-chapter resume; export to import byte-equal; save survives reload;
  - other keys untouched; a hand-written v2 save loads and plays;
  - two-tap reset keeps other keys.
- `tests/ui-flow.js`: unchanged flows, still clean.
- `tests/balance-bot.js`: pace-gate table (above).
- `tests/screens.js`: refreshed `docs/screenshots`, including `18-tower-looming` and
  `19-mountain`.
- `tests/perf.js`: the fps probe (above). It prints CPU and fps numbers and exits non-zero
  while it is below 50 fps.

# v4 — owner feedback batch (judgment calls)

The v4 addendum in `docs/SPEC.md` is the authority. These are the calls the spec left to the builder.

## Flow and progression
- **Gate = target size.** Reaching the last size completes a chapter, unlocks the next and shows the
  celebration card; MAIN MENU returns to the menu (no zoom-out, no auto-advance). The 3-item checklist
  still ticks and pays coins but gates nothing. The one lock that stays is the standing "Sun is last"
  rule: the Sun now waits for all 8 planets (any order, a `needs` list), not for the in-order checklist.
- **Growth retune (balance bot, time to target size).** Per-chapter `need`: Ch1 280 (with `needP` 1.2,
  a flatter curve, because a house has a finite amount of food), Ch2 155, Ch3 280, Ch4 235, Ch5 340,
  Ch6 215, Ch7 170. Result: every chapter lands in the 8–15 min window for the bot (report below).
  Ch1 still has a ~3-minute stretch at size 7 while the bot hunts the last furniture across 20 rooms.
- **Ch1 no-fail door rule (found by the per-room test).** At this pace, 5 small rooms (kids' bathroom,
  guest bathroom, main bathroom, office, laundry) do not hold enough food to grow from the 8 cm
  under-door gap to the 85 cm door. Rather than pack bathrooms with clutter (against the density cut)
  or speed the whole chapter back up to 2 minutes, a shut-in hole that has eaten everything it fits
  in its rooms gets a kind fix: after 4 seconds the nearest shut door swings open ("Creak! The door
  swings open for you."). The door stays a door you can eat later. The other rooms have enough food
  on their own. `tests/reachability.js` reports which rooms rely on the rule and runs the real engine
  to prove the door opens.
- **Upgrades are stronger:** Speed and Vacuum +10%/level (was 6), Coin +12% (8), Lucky 4% (3), Payday
  +20% (15), Wide Eyes +6% (4); Growth x1.0→x2.5. **Prices are flatter:** growth factor 1.38 per level
  (was 1.45), because runs are now 3–4x longer and earn more.
- The balance bot itself had a bug in metric chapters: it never moved toward targets closer than
  1 unit, which is 1 metre in Ch1–4 (an ant-sized hole sat still). Fixed to 2% of the hole size.

## Maps and generation
- **Metre table (`MT`)**: one table of [fit width, height] in metres; Ch1–4 take every size from it
  (`metric: 1`). A type may override it (`m:` in the chapter types), e.g. Ch4's dinosaur skeleton
  (12 m) versus Ch1's toy dinosaur (30 cm). Ch5–7 keep tier ladders (scale doctrine).
- **Map sizes**, measured as map area / (max hole)² v3→v4: Ch1 0.6x (the house is 28×18 m at true
  scale; in starting-hole units it is 3.5x), Ch2 1.9x (27x in starting-hole units), Ch3 7.8x,
  Ch4 47x, Ch5 4x (globe back to 400 units/degree), Ch6 5.7x and Ch7 5.7x (`shrinkMap` deleted).
  Ch1/Ch2 follow the owner's own expression of the 4–5x rule (20 rooms; 5×5 blocks).
- **Filler cut:** loose scatter at 30% of v3 (`FILL_K`); things are placed logically through each
  zone's `at()` (cars in lanes and facing the road, people on sidewalks, boats on water, buildings
  along streets with setbacks). Buildings keep their own density (`bd`) so streets stay full.
- **Edges:** every border is invisible (a clamp, or Ch3's real-outline polygon) and every chapter
  has a non-interactive scenery surround (`C.outside` zones with `deco`), so no map ends in blank.
  Ch7's red border line was removed; there are no edge messages anywhere.

## Ch1 — The House
- One floor, 20 rooms, stairs deleted. Doors obey fit/wobble; a hole up to **8 cm** slides under a
  closed door (`GAP`). Walls collide with a hole radius capped at 0.36 m so a giant hole still fits
  through every doorway (the v3 "left side unreachable" bug).

## Ch3 — Metro Vancouver from OpenStreetMap
- The OSM APIs (Overpass, extracts) were blocked from the build container, so the bake reads the
  **Overture Maps** release on S3, which is OSM-derived and ODbL. `tools/bake-ch3.py` (+
  `tools/bake-ch3-places.py`) writes `data/ch3-osm.js` (1.16 MB): a 100 m land-use grid, a 40 m water
  mask, water/park/beach polygons, roads by class, SkyTrain/highway paths, and 897 POIs (697 schools,
  122 high schools, 62 community centres, 16 casinos). Size was cut from 1.9 MB by per-class packed
  roads and coarser quantisation.
- Buildings are the generic library (~22 types) placed along the real streets by land use, not
  OSM footprints (clarification 8). Landmarks are hand-modelled at their real coordinates.
- POI labels are quiet: hidden until the place is an I Spy / Educational / quest target
  (`labelOn`). Named places are `keep` so an eaten landmark stays eaten.
- Bounds: the border south (Peace Arch, US land as backdrop), Pitt Meadows east, Whistler north,
  Langley out. Hole ladder 1.5 m → 450 m. Credit "© OpenStreetMap contributors (ODbL), via Overture
  Maps" is in Settings.
- **Privacy:** homes are generic map data; nothing marks any real house. Ch2's "Your house" is the
  game's fictional backyard.

## Ch4 — The Wilderness
- One west-to-east journey: forest (ant-sized campsite start, 8 mm hole) → greenlands (river + the
  Big Dam, scaled to a 60 m river dam so it is eatable inside the 64 m ladder) → desert (oasis, mesas,
  dinosaur dig) → ocean (reefs, whales, wreck) → Antarctic ice (research station, igloos). Mesas
  (400 m) are scenery-sized on purpose. Water is never eaten. Ice zone penguin density halved.

## Ch5–Ch7
- **Ch5:** the flat strip map became a **mini-globe** (orthographic, re-rendered only when you move
  half a degree; visited 10° cells glow gold; the country name underneath). One flag per country
  (quiet label) is the "find France" target. The Moon finale sky now shows the Sun, Mercury and Mars.
- **Ch6:** planets sized by one play-unit table in compressed real order (Pluto 14 < Europa < Io <
  Moon 22 < Callisto < Titan < Ganymede < Mercury 30 < Mars 40 < Venus 56 < Earth 60 < Neptune 110 <
  Uranus 118 < Saturn 175 < Jupiter 210 < Sun 330), so moons are eaten long before their planets.
  ISS, Mars rover, Voyager 1, Jupiter's four big moons and Titan are named places. Saturn's ring is an
  annulus zone full of eatable ice and rock bits.
- **Ch7:** no scale. Added space whale, flying cars, an original starfighter, a star serpent, a space
  wizard, space cows, giant rubber ducks, a teapot planet and solar-panel debris fields. All original
  designs. Ch7 pools never use the ISS or the rover.

## Modes
- **I Spy:** 30-item pool per chapter; a shuffle-bag deck per chapter in the save deals 5 per run
  without repeats until the deck is used up. Every pool includes the hat. Win pays
  `ISPY_BONUS × chapter cost` into that chapter's wallet.
- **Educational:** 5–8 curriculum sets per chapter (house fetch-lists, colour fetches, Vancouver
  places, nature, countries/landmarks, planets and moons, silly space). Sums spawn only in your
  current room/district/biome/country. "Help me find it" sets an arrow that stays until the target is
  eaten; for a sum it points at the nearest answer tile, never specifically at the right one.
- **Find-the-answer tiles look identical** (no glow on the right answer); sequence hunts keep their
  next-tile glow.

## Saves
- Key stays `hungry-hole-data-v1`. v2/v3 saves keep wallets, upgrades, boards, checklists, passport,
  eaten landmarks and completed chapters; positions and sizes restart once on the new v4 maps (`mv: 4`).

## Cleanup audit (v4)
- Deleted: the old point-to-steer touch scheme (`G.ptr`), `shrinkMap` and its calls, the SVG upgrade
  icons (3D `UPICON` renders instead), stairs, the old Ch1–Ch4 layouts and their Langley geometry,
  unused v3 types (savanna animals, the treasure set, `university`, `rockies`) and their now-unused
  recipes, `clearGL`. Evidence: `tests/data.js` resolves every remaining type to a recipe, a search
  finds no other unreferenced function, and `tests/reachability.js` passes on every map.
- Kept on purpose: the audio slots (`audio/manifest.js`, MUSIC toggle) — they are wiring, not dead code.

## Tests (v4)
- `tests/data.js`: every type has a 3D model; Ch1–4 every type has real metres; I Spy pools are 30
  distinct, include the hat, and every target exists and is eatable at max size; every Educational
  step resolves; Ch3 POIs present, quiet labels hidden until targeted, no Langley.
- `tests/reachability.js` (new): flood fill at max size with the game's own collision; Ch1 also checks
  every set of rooms you can be shut into (just past the under-door gap): either it holds enough food
  to grow until a door fits, or (5 small rooms) the no-fail rule opens a door once it is eaten out.
- `tests/behaviour.js`: adds joystick, doors (under-gap / stopped / eaten), checklist-is-bonus,
  size gate + menu return, HUD upgrades pause/resume, I Spy lifecycle + re-roll, Educational help arrow
  + local sums + identical tiles, v3 save migration.
- `tests/balance-bot.js`: now reports time to target size per chapter.
- `tests/screens.js`: 32 screenshots (menus, 16 chapter scenes, the Ch5 finale sky, each mode).

# v4.1 fixes (owner rulings + audio addendum)

## Music on iPhone
- **Why it was silent:** music was a bare `new Audio()` element whose `play()` was called by `syncMusic()`, and `syncMusic()` runs from the frame loop, never inside a tap. iOS Safari refuses `play()` outside a user gesture; the rejection handler then set the current track to `null`, so the game never tried again. The SFX were audible because they were synthesised on the WebAudio context, which *is* resumed inside the tap. (The sound-effect files went through `new Audio()` too, so on iPhone they quietly fell back to the synth.)
- **Fix:** one WebAudio path for everything. `audioInit()` (first tap) creates and resumes the context, then starts decoding. Each track is `fetch` + `decodeAudioData`, then looped as an `AudioBufferSourceNode` → music gain (0.55, or 0 when MUSIC is off) → analyser → speakers. Chapter/menu changes swap the source as before. Only the current track and `menu.mp3` stay decoded, to keep memory down. SFX files decode into buffers on the same context. File names and `audio/manifest.js` are unchanged. The media-element path is deleted.
- **Hook:** `HH.debugAudio()` returns `{ track, playing, ctxState, gainValue, level, time, sfx, sfxListed, bad }`. `level` is the analyser's peak, so "playing" means samples are actually flowing, not just that a node exists.
- **Test:** `tests/audio.js` launches Chromium with no autoplay flags (the browser blocks sound until a gesture), clicks STORY for real, and then checks that the right track is playing with the context `running` for the menu and every chapter. It also checks the MUSIC toggle and that every SFX file decodes.

## Voice removed
`speak()`, every `speechSynthesis` call and the Settings Voice row are deleted. Old saves lose `settings.voice` on load. The sequence-hunt next-tile glow and the visual toasts stay. `tests/audio.js` runs scripted Story, I Spy (Ch2, Ch4) and Educational (Ch1, Ch5, three sets each, sums included) and asserts zero `speechSynthesis` use: no `speak`, no `SpeechSynthesisUtterance`, not even a read of `window.speechSynthesis`.

## HUD UPGRADES button
The round up-arrow became an orange (#ff8c1a) pill that reads UPGRADES. Its behaviour is the same: pause, open Upgrades, and BACK resumes the exact run (the behaviour test checks the colour, the label, and that position and size are kept). Screenshot: `docs/screenshots/42-hud-upgrades-button.jpg`.

# v5 — THE WORLDS REDO (builder decisions, 2026-10-31)

Branch `claude/hungry-hole-v5`. Zero named this branch in the v5 prompt, which overrides the session's default branch name (`claude/project-thread-tltki1`). Nothing is merged and no PR is open: GitHub Pages serves `main`, so merging is publishing, and that is Kakashi's call.

## Where the prompt and the spec differ (the spec's latest ruling wins)
- **Educational and the objective ladder.** The prompt says "Educational ignores gating"; spec v5.0 says Educational targets come as an ordered ladder with the growth cap. These do not clash once "gating" is read as the zone rings (v4.7). So in Educational the whole map is open (no rings), and each lesson step is a rung: the set starts pre-sized for step 1 (v4.9), and the hole is capped at the current step's target. Math tiles never glow; sequence tiles do.
- **Music v2 (spec v5.13).** The spec puts orchestrated music "in scope" as same-name drop-in files. The prompt says the 13 audio files and `audio/manifest.js` stay exactly as they are. Nothing in code needs to change for the drop-in, so this build does not touch, generate or rename any audio. When the owner drops in new files with the same names, they play.
- **Roster.** Spec v5.13 is final: five worlds. Wilderness and Chaos are retired, not parked. Old Backyard (old Ch2) was already folded into the Home. Saves keep the retired worlds' data aside (see Saves).

## H. Exactly five worlds
- **The worlds:** 1 The Home · 2 Metro Vancouver · 3 Stanley Park · 4 Space · 5 The Globe. "WORLDS" is the word used everywhere in the UI.
- **Old code removed:** Backyard, Wilderness and Chaos are gone from the UI, from data and from the models. Model recipes are now keyed per world (`MODEL.PER['key:type']`), so one world's look never leaks into another.
- **Music per world:** the files are unchanged, so each world reuses the old track that fits it best.
  - Home: `ch1.mp3`
  - Vancouver: `ch3.mp3` (old Vancouver)
  - Stanley Park: `ch4.mp3`
  - Space: `ch6.mp3`
  - Globe: `ch5.mp3`
  - `ch2.mp3` and `ch7.mp3` are not used. Their files stay listed in the manifest, untouched.

## Saves (ground rule: `hungry-hole-data-v1` never changes)
- **One-time migration** (`migrate5`) for any save without `w5`:
  - Home ← old 1
  - Vancouver ← old 3
  - Stanley Park is new
  - Space ← old 6
  - Globe ← old 5
- **Retired worlds:** the save data of old 2, 4 and 7 is copied verbatim into `S.retired` and ignored. Nothing else is touched.
- **Kept per world:** wallets, upgrades, quest boards, checklist counts, completions, passport and learning totals.
- **Eaten landmarks:** kept for Vancouver, whose map is unchanged. For Home, Space and the Globe the maps are new, so their old ids would mean different things. Those are parked as `eaten4` and the world starts fresh.
- **Stanley Park unlock:** it opens if old Vancouver was complete, because finishing Vancouver used to open the next chapter.
- **Shared origin:** the game only ever reads and writes its own key. It never enumerates storage and never clears it. "Reset everything" rewrites only `hungry-hole-data-v1`.
- **Test:** `tests/behaviour.js` "v4 save with RETIRED-world data" builds a seven-chapter v4 save that carries progress, wallets, I Spy decks and Educational sets in worlds 4 and 7. It checks:
  - all of that sits verbatim in `S.retired`
  - every kept world's wallet, upgrades, board, completion and eaten landmarks are intact
  - all five worlds play
  - nothing changes after a reload
  - another app's key on the same origin is untouched
- The v2 and v3 save tests were updated to the five-world mapping and still pass.

## A1–A2. Objective ladder, rings, modes
- **Story:** every world's tasks are its size-gate beats (8–12 per world). The hole is capped at the next objective (fit size × 1.04), with a friendly message: "You're not growing anymore until you get X. Complete your objective to grow more!" Eating the objective lifts the cap. The checklist is a bonus and never completes a world.
- **Rings:** one nested playable rect per beat, so the border grows as the ladder climbs.
- **I Spy:** plays inside the ring that holds the current target.
- **Educational:** the whole map is open.
- **Exploration:** any world, the whole map, free size with + / −, no objectives. It pays no coins, so it can't be used to farm wallets.
- **Restart:** restarting a world replays the ladder from the first objective (beat and eaten list reset). The checklist, board and wallet are kept.

## A3. Density: "classy, not carpeted"
- **Filler:** loose filler is `FILL_K` (0.3 of v3) × a per-world `fill`. Placed things (buildings along roads, trees in forests, authored landmarks) are exempt through `fillKeep`.
- **Per-world filler factors** (share of the v3 scatter):

  | World | Filler share | Kept dense |
  | --- | --- | --- |
  | Home | 0.06 | — |
  | Vancouver | 0.09 | street trees, forests and buildings stay dense |
  | Stanley Park | 0.03 | the forest trees stay dense |
  | Space | 0.30 | — |
  | Globe | 0.075 | — |

  Every world is cut by at least 70%; most by 90% or more. Vancouver's trees stay dense, as the owner asked.
- **Type→room whitelist:** the Home has an explicit `ALLOW` map, enforced in `tests/data.js`. Every zone list and every authored object must pass `C.okIn`. The test caught a hat listed in a bedroom, so hats are now allowed in closets, halls and bedrooms.
- **Cars:** only on roads (lane-snapped). Parked cars sit at curbs, driveways and lots.
- **People:** on sidewalks.
- **The Globe's town:** cars, houses and trees snap to a street grid. The data test checks that every town vehicle is on it.
- **Street furniture:**
  - `crossingsOf()` finds real X crossings and T junctions between different roads in the OSM road data (angle > 20°, deduped within 9 m).
  - `furnishCrossing()` puts 4 streetlights at the corners of each crossing, a stop sign at 1 in 3 crossings and a bin at 1 in 5.
  - This runs in Vancouver and Stanley Park's city streets, and streams with the lamp layer.
  - The old random lamp scatter was removed from Vancouver zones. Stanley Park's OSM lamps within 16 m of a crossing are skipped so corners aren't doubled.
  - The Globe has no streetlights, per the spec.
- **Eats per size step (honest numbers):** the bot reports the average eats per size step:

  | World | Average eats per size step |
  | --- | --- |
  | Home | about 23 |
  | Space | about 45 |
  | Stanley Park | about 70 |
  | Globe | about 76 |
  | Vancouver | about 255 |

  These are far above "about 4". The reason is that the bot keeps eating while it travels and while it is capped at an objective, and those eats are counted against the step. Size-worthy eats (things at most one size below you) are lower:

  | World | Size-worthy eats per step |
  | --- | --- |
  | Space | 9 |
  | Home | 15 |
  | Stanley Park | 32 |
  | Globe | 65 |
  | Vancouver | 95 |

  XP per eat was raised (per-world `xpk` 2–3) and filler cut hard. The pace bot (8–15 min) is the guardrail that was tuned to, and every world is inside it. Getting to a literal ~4 meaningful eats per step would mean hiding most edible things on the travel legs. That would make the worlds feel empty, so I stopped at "classy" and left this for Kakashi to judge in play.

## A4. Movement and idle life
- **Movers:** cars, buses, boats, SkyTrain, animals, ships, whales and the rest stay in their zone. Off-stream movers are paused, they stay edible, and they never flee.
- **Idle life:**
  - `sway` on plants and trees
  - butterflies flutter (Home, Stanley Park)
  - sunlight glints twinkle on open water in every world (`waterGlints`)
  - carousels, desk globes and planets turn (`SPIN`)
  - the nursery mobile turns and the rocking horse rocks
  - clouds drift
- **Terrain:** textured ground with relief. Mountains block until they are edible.
- **Labels:** only on active targets (`labelOn`).

## A5. Targeting
- **Targets:** the help arrow is always on. Every target gets a beacon pillar and a label at any zoom. Targets self-heal: a missing one is re-placed inside the current ring.
- **I Spy:**
  - a 30-item pool per world, dealt from a saved shuffle-bag, 5 per run
  - each hand is sorted into a size ladder, smallest first
  - a fresh run starts at starting size with the world's upgrades
- **Educational:** all worlds are unlocked and every set is pre-sized. The Globe starts lessons city-sized (`eduMin` 25), because the planet is big. Grade 2/3, Learning Full/Sometimes/Off and "How big am I?" are unchanged.

## A6. Minimap
- **Placement:** bottom-left in every world; the Globe keeps a globe look (an orthographic mini-globe that names the country you're over).
- **Markers:** the hole is a pulsing dot, targets are stars, the partner is a dot (the hook is ready for co-op).
- **Big map:** tapping the minimap opens it, and it cycles 100 / 50 / 25%. The zoomed views follow the hole.
- **Steering:** a minimap touch never steers.

## A7. Walls
- **Walls are absolute.** Collision radius is capped, so a big hole still fits through doorways and up stairs. The new behaviour test pushes the biggest hole at 8 walls from both sides; it never crosses.
- **Open-top dollhouse:** walls fade between the camera and the hole. X-ray is visual only.
- **Flat things you sit on** (the picnic blanket, rugs, the Moon's face) are drawn cut away over the open hole and laid flat, so they never cover it. Before this fix, Space's Apollo start hid the hole under the Moon.

## B. Title and modes
- **Title:** a living Vancouver title scene: SkyTrain on its guideway, buses, cars, clouds, the hole at a crosswalk.
- **Mode strip:** a cream strip with STORY / I SPY / EDUCATIONAL / EXPLORATION, and a small SETTINGS gear.
- **Removed:** there are no Upgrades or Chapters menu buttons. Upgrades open from the in-game HUD (orange UPGRADES), and boards from the Story world pick.
- **World pick:** every mode opens one. `tests/ui-flow.js` checks the strip, the four pickers and that the old buttons are gone.

## C. The Home
- **Layout:** transcribed from the owner's floorplan as layout only. No text from the image appears anywhere.
- **Building:** two floors, with stairs as paths: you roll up the run and the floor changes at its middle. Also a deck, garage, side paths, front and back yards, and the alley.
- **Pace:** the last objective (the family car, 4.6 m) was out of reach in a long bot run. Two causes:
  - the top size step ended exactly at the car's size, so you needed the whole last level
  - a big hole starves in a small house, because things only respawned out of sight (4 hole-widths)
- **Fix:** top size 5.2 m, `needP` 1.13, and `respawnR` 6 m in the Home, so things come back once you're a room away. Three bot seeds now finish in 9.4–11.0 min.

## D. Metro Vancouver
New: SkyTrain guideway, pillars and stations; blue buses; street trees; forests; the Grouse trail; snow on Cypress and Whistler; intersection streetlights; the objective ladder (Steam Clock → … → Whistler).

## E. Stanley Park
- **Map:** a real OSM bake inside the owner's red-line boundary.
- **Start:** a picnic blanket on Ceperley Meadow, at ant scale. The ladder runs from the picnic sandwich to Deadman's Island.
- **Landmarks:** an enterable Aquarium (an open-top hall with front doors), Brockton and Prospect Point lighthouses, the Hollow Tree, Siwash Rock, the Girl in a Wetsuit and more.
- **Rules:** water is never food. Totem poles are scenery only.

## F. Space
- **Start:** at the Apollo landing site. The Moon's surface is a zoomed-in stage, a deliberate scale break: the Moon you finally swallow is 15 units across, but its face where you start is far bigger. Earth starts orbiting only after the Moon.
- **Contents:** orbiting planets, real moons, dwarf planets, the Oort cloud and Planet Nine.

## G. The Globe
- **Map data:** a true-scale equirectangular map baked from Natural Earth (public domain) by `tools/bake-globe.py`. It holds land, lakes, country outlines, rivers as lines (the Nile is named), major highways as lines and cities.
- **Map scale:** 400 world units per degree. Growth is compressed (13 sizes from 4 cm to 950 km in game metres), so one world can go from a house to Everest.
- **Start:** small-house size on a Kitsilano street with looping traffic. Kitsilano was chosen to sit well away from the owner's own corner, which never appears or is singled out.
- **Speed:**
  - The speed upgrade counts double here (`upSpd` 2).
  - Water travel is faster.
  - I Spy and Educational move 5× faster (`runSpd`), because their targets are continents apart.
- **Highways:** while you're small, cars drive the nearest real highway (a pool of 18, reassigned as you move). From far out, highways show as flowing light. There are no streetlights.
- **Landmarks:** about 400, in `data/globe-landmarks.js`, with every country covered (≥150 is checked in the data test).
  - CN, RU, CA and the US have 10 or more each; big countries have 4–5.
  - All New 7 Wonders and Giza are in, plus the named ones: Tokyo Tower, Skytree, the Shard, Buckingham Palace, the Louvre and Tower Bridge.
  - Every country has a capital marker where no landmark is near.
  - Holy sites where non-believers can't go (the Kaaba and similar) are deliberately left out.
- **Theme parks:** 24, at the real locations of major parks, drawn in our own art and unnamed. The data test checks they are unnamed.
- **Oceans:** ships, whales, orcas and sharks (no salmon).
- **Finale:** the ladder runs Kits Pool → … → Everest. Eating Everest rolls the credits and pays +5,000 coins the first time.

## I. Co-op: NOT SHIPPED (reported plainly)
Two-device co-op over WebRTC with a room code and no servers of our own was not built in this pass, and I would not call it reliable if it were. Reasons:
- **Signalling:** WebRTC needs a signalling exchange before the two iPads can talk. With no server of our own, that means either a third-party public broker (PeerJS cloud or similar), whose uptime we don't control and which sends play data to someone else, or copying a ~2 KB offer/answer blob between iPads by hand, which kids can't do.
- **iPad networking:** iOS Safari hides local addresses behind mDNS candidates, so same-Wi-Fi connections fail on some routers without a TURN relay, and a TURN relay is a server.
- **Testing:** two real iPads can't be exercised from this container, so "works" could not be verified.

What is ready: the partner dot on the minimap and the mini-globe (`G.mate`) and a shared-ladder-friendly run model (I Spy and Educational hands are already data). The decision Kakashi or the owner needs to make is whether a third-party signalling broker is acceptable.

## Performance (iPad levers)
- **iPad levers:**
  - streaming radius: cells generate only around the camera
  - off-stream movers paused
  - every visible object merged into one dynamic mesh per material each frame
  - highways and rivers drawn as lines on the ground texture
- **Two stalls found and fixed in this pass:**
  - The ground canvas was GPU-backed. Painting thousands of OSM paths into it and uploading stalled Stanley Park's West End to about 1 fps in headless Chromium. It is now a CPU canvas (`willReadFrequently`), and that spot runs at about 24–31 fps.
  - The camera crawled through extreme zooms after a big size jump (a world or mode switch, or a big +/−), re-texturing at each step. It now snaps when it is more than 3× off target.
- **`tests/perf.js`** probes the three heaviest spots:

  | Spot | fps |
  | --- | --- |
  | Vancouver downtown | 17–21 |
  | Stanley Park West End | 24.5 |
  | Globe street start | 18–22 |

  These are in GPU-less headless Chromium (SwiftShader), in line with v4's 17–20. The 50 fps target can't be measured without a GPU; it needs checking on a real iPad.

## Results per section (tests at hand-off)
| Section | Result |
| --- | --- |
| A1–A2 ladder, rings | behaviour test "objective ladder" (cap holds at the next objective; last objective completes the world, unlocks the next, MAIN MENU returns) |
| A3 density | data test whitelist PASS ×5; Globe street-grid PASS; per-world factors above |
| A4 movement / idle life | movers in-zone and paused off-stream; water glints, spin, sway, butterflies |
| A5 targeting | I Spy and Educational behaviour tests PASS; audio scripted runs PASS |
| A6 minimap | screens `27-w5-big-map`, `28-w3-big-map` |
| A7 walls | behaviour "walls are absolute" PASS (16/16 pushes held) |
| B title / modes | ui-flow PASS (four modes, five worlds per picker, no old buttons) |
| C–G worlds | reachability 100% in all five; pace bot in window in all five (table below) |
| H five worlds | data PASS ×5; music per world PASS in audio test |
| I co-op | not shipped (above) |
| Saves | retired-world migration test PASS |
| Audio | 8/8, Chromium launched with no autoplay bypass |

### Pace bot (`node tests/balance-bot.js`, sim-minutes to finish the objective ladder; window 8–15)
| World | Finish (sim-min) | Objectives eaten at (min) | Eats / size step (all, size-worthy) |
| --- | --- | --- | --- |
| W1 The Home | 11.0 / 9.8 / 9.4 (seeds 0 / 3 / 5) | e.g. 1.7 2.7 3.4 5.0 5.8 6.1 6.9 … | ~23, ~15 |
| W2 Metro Vancouver | 8.7 | 2.41 3.04 4.24 4.37 5.59 6.72 7.73 8.63 8.72 8.75 | ~256, ~96 |
| W3 Stanley Park | 8.5 | 0.13 0.24 0.59 3.95 6.01 7.16 7.96 8.40 8.47 8.53 | ~70, ~32 |
| W4 Space | 8.2 | 0.12 0.28 0.36 0.45 0.96 3.92 6.69 7.66 8.18 | ~45, ~10 |
| W5 The Globe | 9.6 | 0.37 0.97 1.15 1.33 2.33 4.87 6.05 7.81 8.70 9.04 9.40 9.62 | ~78, ~67 |

All five worlds finish inside the 8–15 minute window. The game itself uses `Math.random`, so the same seed varies by about a minute between runs (one Home run at an interim tuning came in at 7.5, which is why Home was nudged to `needP` 1.13). Vancouver, Stanley Park and Space sit near the bottom of the window. A real child explores more than the bot, so they should land mid-window; tune `need` up per world if Kakashi finds them quick.

---

# v5.1 — two-iPad co-op, Parts 2–14, owner requests (branch `claude/hungry-hole-v51-coop`)

## Co-op (all four modes) — SHIPPED, verified in tests, NOT yet verified on real iPads
- **How two iPads find each other:** the host taps *Play together → Host* and gets a 6-letter room code (no I/O/0/1 look-alikes). The guest types it in. Signalling goes through the public PeerJS broker (`peerjs@1.5.4` from jsDelivr, room id `hungryhole-v51-<CODE>`); after that the iPads talk directly over WebRTC. No server of ours.
- **PeerJS is loaded only when a co-op button is tapped** (`NET.load`, 9 s timeout). A blocked or offline CDN never touches solo play: the game boots and plays with zero console errors, and only the co-op buttons say "Can't connect right now…" (test: *PeerJS blocked*).
- **Host-authoritative.** The host runs the world: the eaten set, the objective ladder, the size cap, I Spy hands, lesson steps and placed targets. The guest predicts its own hole and asks; the host confirms or refuses. Every wire message is checked (`W8`) before use; junk is dropped.
- **Messages:**
  - Setup: `hello`, `ready`, `start`.
  - Movement and state: `pos`, `st`, `cap`, `sz`, `ups`.
  - Eating: `re` (request), `add`, `learn`, `win`, `done`.
  - Repair: `snap` (full resync), `need`, `full`.
  - Session: `pause`, `hb` (heartbeat), `bye`, `nope` (refused, e.g. version mismatch).
- **Saves:**
  - Each iPad keeps its own save under the unchanged key `hungry-hole-data-v1`.
  - The guest's coins are banked into the guest's wallet exactly once.
  - The guest's own world progress is never changed by playing in someone else's room.
  - Exploration saves nothing for either iPad.
- **Disconnects:**
  - A `bye`, or 6 s without hearing anything (heartbeats go every second), drops the partner.
  - The host carries on solo with the guest's coins banked.
  - The guest returns to the menu with its coins kept.
- **Evidence:** `tests/coop.js` passes 19/19. It runs two browser contexts with separate saves over a BroadcastChannel transport (`?nettest=bc`). It covers:
  - host, join and `hello`
  - position sync
  - both holes advancing the ladder
  - the size cap
  - snapshot repair
  - coins banked once
  - shared pause
  - disconnect
  - I Spy together, with the shared hand and the bonus to both wallets
  - Educational, Exploration, Globe and Space together
  - a `hello` version mismatch
  - junk wire messages
  - heartbeat timeout
  - blocked PeerJS
- **Not verified, said plainly:**
  - The live PeerJS cloud broker could not be reached from this container.
  - Two real iPads could not be exercised.
  - iOS Safari's mDNS-hidden local addresses can stop a direct WebRTC link on some home routers. That would need a TURN relay, which is a server, and none is configured.
  - Kakashi: please try it once on two iPads on the home Wi-Fi before merging. If the link never forms, the fix is a TURN entry in the `new Peer({...})` config, not a code rewrite.
- **Uptime:** the broker is third-party, so we don't control its uptime. When it is down, co-op says it can't connect and solo play is untouched.

## Part 2 — music
A pause overlay never changes or restarts the music (Upgrades, Quest Board). `tests/audio.js` proves both the track and its playback position (9/9). The audio files and the manifest are untouched.

## Part 3 — minimap
The minimap moved to the top-left, with the objective/quest stack below it. The bottom-left is free for the joystick.

## Parts 4–5 — Vancouver ground
- Residential and school land is lawn green (`#a8cf86`).
- North of about 49.9° (Whistler), the ground is snow (`#f2f5f8`), the green areas are drawn as snow, and peaks use snow colours.
- The mountain land-use cells between the city and Whistler are forest green, not grey alpine.

## Part 6 — rectangle boundary
- Metro Vancouver's playable area is now the whole map rectangle. The irregular play polygon was removed, and reachability checks every cell in the rectangle.
- **Judgment call:** the owner's older rules (SPEC #15: Langley is out, nothing south of the border) are kept for *named places*. Those places' labels and landmarks aren't placed, though the ground there is playable. Otherwise the open rectangle would start labelling Langley and Washington State.

## Part 7 — YVR
- Buildings and ground:
  - the International and South terminals
  - the control tower
  - three parkades and a car lot
  - hangars, checked against the water mask
  - a fuel farm
- Planes:
  - 3 planes taxi.
  - Take-off and landing circuits run on both runways (3 + 2 planes). They climb and descend along the path (`alts`), and a plane in the air can't be eaten.
  - 3 high flyovers.

## Part 8 — Science World
- Science World is a geodesic sphere (icosphere detail 2) with a strut along every edge, on columns, with a plaza and an entrance wing, at real scale.
- Its exact coordinates fell in the water mask, so it is placed at the nearest dry spot, at the east end of False Creek (lon −123.1026, lat 49.2741).

## Part 9 — Home
- "GO UPSTAIRS" and "GO DOWNSTAIRS" signs with arrows are painted at both ends of the stairs.
- There is **no garage**. The two cars sit in a carport under the porch, and a storage room behind it holds the toolbench, the shelf and the recycling.
- The garden beds moved clear of the deck stairs.
- **Judgment call:** the old garden-bed layout also passed a plain smallest-size flood test, so reachability now also checks that the stair foot is clear.
- **Judgment call (found by the pace bot):** the storage room behind the carport is only 1.6 m deep. With the 1.4 m doorway first drawn there, a big hole could never get at the toolbench, the shelf or the recycling, and the Home bot stalled at size 9 short of the family car (20.4 and 20.9 minutes). The storage room now opens to the carport across 6.4 m, like an open back bay under the porch. The bot then finishes in 10.1 and 12.2 minutes (seeds 0 and 3), and reachability is still 100%.

## Part 10 — Exploration sandbox
Upgrades are free 0–10 steppers in Exploration. They last for the session only and are never saved.

## Part 11 — no perpetual teeter
Nothing rocks forever. A thing that doesn't qualify sits still against the hole. A qualifying bump topples a thing in once. Behaviour tests cover both.

## Part 12 — never show the void
- Past every edge and corner, the world visibly continues as scenery you can't eat:
  - **Vancouver:** sea to the west, snowy peaks to the north, valley forest to the east, towns to the south.
  - **Stanley Park:** sea to the west and north, city streets to the south and east.
- Screenshots 50–56 show every world at max size at a map corner.

## Part 13 — the Globe over the poles
- **How it works:**
  - The Globe no longer wraps top to bottom.
  - Driving past a pole puts you at the same point on the sphere: longitude +180°, latitude mirrored. Your velocity carries on (you are now heading away from the pole), and the camera turns half a circle round the hole in the same frame.
  - Just past the pole, the far side of the Earth is drawn turned round the hole's meridian, both the ground and the things on it. That is exactly what the turned camera shows after the crossing, so **nothing on screen moves at the crossing**. Before/after screenshots at both poles match, apart from twinkling glints and clouds that drift with time.
  - Things past the pole are drawn only. You can eat them once you are over.
- **Evidence:** `tests/behaviour.js` runs two tests, one from northern Canada (−100°, 80°) over the North Pole and one from Antarctica (30°, −80°) over the South Pole. With the stick held straight, each drive:
  - lands at longitude +180 (80° E, in Russia; −150° for the south run)
  - takes the same distance per frame on the sphere across the crossing
  - shows no kink on screen in the hole or in four tracked points on both sides of the pole (0 px)
- **Judgment call:**
  - The camera stays turned (south-up) while the finger stays down, so a held drive stays straight.
  - When the finger lifts, the camera swings smoothly back to north-up over about two seconds.
  - This relaxes the v5 rule that "the camera never turns", for the Globe only.
  - The minimap and the mini-globe stay north-up.
- **Also:**
  - A country's edge along the pole itself is no longer stroked as a border.
  - The Antarctic plateau is painted solid to the pole, so there is no seam line.
  - Drifting clouds and storms that drift over a pole are folded too.
  - In co-op, a partner who crosses a pole is snapped, not slid round the world.

## Part 14 — Space
Space's ambient scatter was cut by half (spec addendum 13). The longer run was accepted by the owner, and the bot time is in the table below.

## Owner requests during the build
- **Main menu art:** the owner's HUNGRY HOLE logo and the four button images, plus the settings icon, cut from the owner's menu image. The moving background is kept.
- **World order:** World 4 is now **the Globe** and World 5 is **Space** (size order).
  - Existing saves are moved once (`migrate51`, marked `w51`): each world keeps its own wallet, upgrades, eaten set, beat, I Spy and Educational progress.
  - If World 3 was finished, World 4 (the Globe) is unlocked.
  - **Judgment call:** the finale (+5000 coins, the journey flag, credits) moved with the last world, so it now plays after **Space**, and the credits read "…to the whole world… to the Sun itself".
  - The music stays with its world: the Globe keeps `ch5.mp3`, Space keeps `ch4.mp3`. No audio files changed.

## v5.1 results (tests at hand-off)
| Suite | Result |
| --- | --- |
| `tests/data.js` | PASS ×5, no errors |
| `tests/behaviour.js` | 29/29, including the v5 → v5.1 world-order move and both pole drives |
| `tests/coop.js` | 19/19 |
| `tests/audio.js` | 9/9 (Globe `ch5.mp3`, Space `ch4.mp3`; a pause overlay keeps the track and position) |
| `tests/ui-flow.js` | clean, 0 console errors |
| `tests/reachability.js` | 100% in all five worlds; Vancouver's whole rectangle; Home deck → backyard at the smallest size, stair foot clear |
| `tests/screens.js` | refreshed, 0 console errors. New: 50–56 (each world at max size at a map corner), 57–62 (stairs, carport, YVR, Science World, north forest), 63 (play-together picker), 64–65 (the Globe at the North Pole and the South Pole) |
| `tests/perf.js` | GPU-less headless: Vancouver 18.6, Stanley Park 22.8, Globe 14.6–16.2 fps. The pre-Part-13 build measures the Globe at 15.6 on the same machine, so the pole work costs nothing measurable. The 50 fps target still needs a real iPad. |

### Pace bot, v5.1 (`node tests/balance-bot.js 1,2,3,4,5 40`, sim-minutes; window 8–15, Space relaxed)
| World | Finish | Objectives eaten at (min) |
| --- | --- | --- |
| W1 The Home | 10.1 / 12.2 (seeds 0 / 3), after the storage fix | 2.12 3.63 4.33 6.03 7.21 7.84 9.52 10.08 |
| W2 Metro Vancouver | 8.1 | 2.41 3.04 3.89 4.02 5.25 6.15 7.14 8.04 8.12 8.15 |
| W3 Stanley Park | 8.5 | 0.13 0.24 0.62 3.99 6.07 7.17 7.97 8.41 8.48 8.54 |
| W4 The Globe | 10.0 | 0.37 1.08 1.29 1.57 2.52 5.03 6.18 7.85 8.84 9.24 9.7 10 |
| W5 Space | 8.0 | 0.11 0.35 0.39 0.48 0.85 4 6.7 7.43 8.01 |

# v5.2 — the Globe becomes a school, plus the fix batch (spec v5.15 addenda 14–31)

## P1–P2 Canada Place and the SeaBus
- Metro Vancouver's Story run now starts at Canada Place. Exploration keeps its old start (the Kitsilano / False Creek side), because the addendum names Story.
- The SeaBus is the game's own twin-hull catamaran. It runs Waterfront Station ↔ Lonsdale Quay and rests at each terminal.

## P3 World order
- The order is now 1 Home, 2 Stanley Park, 3 Metro Vancouver, 4 Globe, 5 Space.
- Saves are moved once by `migrate52`, marked `w52`. Each world keeps its wallet, upgrades, eaten set, beat, I Spy and Educational progress, and its song: Home `ch1`, Metro Vancouver `ch2`, Stanley Park `ch3`, Space `ch4`, Globe `ch5`. No audio file or manifest changed.
- `tests/behaviour.js` has a v5.1 → v5.2 migration test.

## P4 Hunt targets never vanish
- **Root cause:** `relocateTiles` re-dealt the tiles every 3 s whenever the hole was in another room or area, or more than 9 hole-widths from all of them. That is the owner's vanishing B-E-D tile.
- Tiles are now moved only if they are off the map.
- The self-heal revives a removed target in place.
- Tiles are never placed under furniture.
- A win popup never fires into a later run.

## P5 Quest stack
- The quest column is 268 px wide, with tighter rows and a 12 px text floor.
- The I Spy, Educational and Exploration cards are slimmer too.

## P6 Minimap
- The corner minimap defaults to a 25% window that follows the hole. 25 / 50 / 100 is chosen on the big map.
- The choice is kept in `S.settings.mini` inside the one save key. No new storage key was added.
- The Globe's minimap stays the turning mini-globe, which is already centred on the hole.

## P7 Speed ×2
- `BASE_X = 2` doubles the base speed in every world. The pace table is below.
- The pole-crossing test now drives with the Exploration dial at 0.5. That keeps each frame's step at the v5.1 distance, which the test's screen-kink metric is calibrated for. At ×2, the perspective acceleration near the screen edge alone went past the 25% tolerance. With instrumentation on, there was no fold discontinuity.

## P12 Globe borders and labels
- Labels are drawn in screen space. Text painted on the ground under 2 world units rounded away, and buildings covered it.
- Tiers are set by hole diameter:

  | Hole diameter | Labels shown |
  | --- | --- |
  | tiny (< 0.5 units) | capitals and countries |
  | mid (< 100) | capitals and countries |
  | giant | countries (thinned) and continents, no capitals |

- **Density rule:** greedy by country interior size, with screen boxes and 2.6× the font size of air at the giant tier. Europe at max size shows 23 names; the test cap is 24, with no overlaps.
- **Name points:** each name sits at the pole of inaccessibility, from a distance transform of the country raster.
- **Missing polygons:** five sovereign states had no polygon in the 1:50m data (Vatican, Monaco, Nauru, Tuvalu, Maldives). They get small round outlines at their real spots.
- **Border cells:** `ccAt` now asks the exact polygons on a border cell. Before, anti-aliased raster blends read as a third country (the Faroe Islands showed up in Czechia).

## P13 Country readout
- The yellow name at the bottom is the plain map name without "the".
- A few names are shortened: "United States", "UK", "UAE", "DR Congo".
- Nothing shows over open sea.

## P14 Exploration speed
- The ADJUST SPEED dial sits under ADJUST SIZE, with steps of 10 / 20 / 35 / 50 / 70 / 100%.
- It is session-only (`G.exSpd`). It resets on reload and is not saved.

## P15 UFOs out
- **Finding:** the Globe never scattered the `ufo` type. What read as UFOs were the storm, big storm, hurricane and giant storm system models: stacked white rings round a dome look like a saucer.
- They are replaced size for size by clouds, so the high tiers keep the same food:

  | Cloud | Size |
  | --- | --- |
  | big cloud | 55 |
  | cloud bank | 140 |
  | giant cloud | 350 |
  | sea of clouds | 900 |

- Two real UFOs remain as a hidden treat (`ufo1` / `ufo2`, about 8 units, placed by the build's seeded rng).
- Coins at tier 7 and up now spawn in every Globe zone at a 30% cell rate (`C.coinHi`), over ocean and land alike.

## P16 Animals
- `tools/bake-animals.py` and `tools/animal_families.py` produce `data/globe-animals.js`: 195 countries × 8, 735 species, 55 families, zero unmapped.
- Species map to families by ordered regex rules with word boundaries. A stallion is not a lion, a Carpathian Brown Bear is not a carp, a peafowl is not an owl, a hedgehog is not a hog, and Dorcas is not an orca.
- New shapes: ape, roo, koala, bat, monotreme.
- **Sizing:** animals are sized relative to the hole when they spawn. The flagship animal is ×1.25 and has 3× the spawn weight.
- **Streaming:** 40 are kept round the hole. Each stays inside its own country's land, shore, coastal sea (within roaming range of its spawn), or lakes and rivers, by habitat.
- **When they show:** they are hidden at the giant tier (hole ≥ 100 units), where they would be sub-pixel. They are also off in co-op, because each iPad would roll its own.
- They are eatable and never saved.

## P17 Landmarks: the owner's roster
- All 2,358 places in `world_195_countries_famous_landmarks.xlsx` (195 countries, 10-15 each) are geocoded by hand in `tools/landmarks/geo-*.txt` (spreadsheet order, one "lat lon" per place) and baked by `tools/bake-landmarks.py` into `data/globe-landmarks52.js`. The bake checks every point against the Globe's own 1:50m country polygons: 1,866 fall inside as given; 355 coastal or border places sit a hair outside the simplified outline and are stepped onto their own country's side; 118 water places (reefs, bays, lakes, island groups) stay in their sea; 19 islands and atolls too small for the map get small round island outlines in their country (Kiribati, Micronesia, Seychelles' Aldabra, San Andrés, Fernando de Noronha...). Anything more than 0.4 deg inside another country stops the bake. One listing is on the far side of a border in reality (Radom National Park, listed under South Sudan, lies just inside Sudan); it is shown on South Sudan's side of the border, since the owner's list is the roster.
- Natural features (997: national parks, reefs, canyons, falls, lakes, mountains, deserts, beaches, caves...) are painted soft areas with their names (land ones clipped to land, water ones over the water), never point models. Built places (1,361) are landmark models in the game's own art (palace, church, mosque, temple, castle, fort, tower, bridge, statue, ruins...). City parks (Stanley Park, Central Park) are small areas; national parks and reserves are big ones.
- The hand-made objective ladder (Mount Fuji, Tokyo Tower, Tokyo Skytree, Tower Bridge, the Pyramids, Niagara...) is kept: an owner entry that names one of those IS that landmark (same model, same objective size). The 360 old anonymous picks are gone: the owner's list replaces them.
- No IP: the eight theme parks are "a theme park" (the game's fairytale castle park); brand and film names are plain words (a brewery museum, a rum distillery, a big seaside resort, a grand hotel, Phang Nga Bay, a batik workshop, a candle workshop).
- Labels: area names show below the giant tier with the same density rule as country names; built landmarks keep their name plates.
- Tests: `tests/globe-school.js` checks the whole roster is on the Globe (no missing place, no brand name), every built landmark and land area stands in its own country, and the spot-checks (Japan: Mount Fuji, Tokyo Tower, Tokyo Skytree; UK: Buckingham Palace, Tower Bridge; Canada: Stanley Park; Egypt: Pyramids of Giza) within 0.08 deg of the real place. `tests/data.js` counts the named areas as landmarks for its per-country minimums.
- Found on the way: a v5.1 edit had put the back yard's two shrubs and the birdbath inside a code comment, so they had vanished from the Home (and I Spy's birdbath target with them). Restored.

## P10 The front yard
- Fence on the street side and both lot edges, in 1.2 m sections (22), with the garden gate standing open where the concrete front path meets the sidewalk. The gate is a thin open leaf beside the gap and never blocks.
- Flowers along both sides of the path (26), a trampoline, four more bushes, a second tree out front (the apple tree out back is unchanged). The gnome and planter moved to make room.
- `tests/reachability.js` now also floods from the sidewalk at the smallest size and requires the front door to be reached through the gate, with nothing standing on the path. Passes.

## P11 Second Beach Pool and the fence rule
- A white picket fence runs all the way round the pool, 4 m out from the water, in 2.4 m sections (one gap is the way in, on the side facing the picnic start; no section stands in water). Three slides sit on the deck between the water and the fence: the seal slide (a slide with a big grey seal at the top, an objective-ready keep object) and two water slides.
- The fence rule: every fence is a chain of sections, each its own object eaten at its own size. That covers the new front fence, the pool fence, and the Home's back fence, which was a wall and is now sections (its open gate kept). Metro Vancouver's fences were already 2.4 m single sections. The deck railing is a railing, not a fence, and stays a wall.
- Test (`behaviour.js`, "fences are chains of sections"): one section at a time goes, the rest stay; the whole front run can be eaten; the gate is open; the pool has 3 slides including the seal slide.
- Found on the way, the same comment-swallow bug as the birdbath: a trailing comment had eaten code on the same line; fixed, and both cases are now one statement per line.

## P18 Stanley Park's apron
- Past Stanley Park's map edges the ground is now painted from Metro Vancouver's own baked map (same OpenStreetMap source), aligned by the two worlds' projections: English Bay and Burrard Inlet to the north and west (with the real North Shore beyond), the West End, downtown, Coal Harbour and False Creek to the south and east. The beige placeholder street grid is gone (kept only as a fallback if the Vancouver map data were missing). Scenery in the apron follows the same map: city buildings only on land, nothing on the water. Screenshots 53/54 refreshed.

## P8 + P9 Real height
- One mechanism for both: a world may give `hAt(x, y)`, its ground height. Everything is drawn relative to the ground under the hole, so the hole always sits at the centre and, as it climbs, the land below visibly falls away (and comes up to meet it going down). The ground is a grid, dense round the hole and coarse toward the horizon; its heights come from a height map of the painted region, read in the ground's vertex shader, with slope shading from the same sun as the models. Objects stand on the ground under them; things falling into the hole slide down from their height. Worlds without `hAt` (the Globe, Space) keep the two-triangle flat plane. Height is never an obstacle: movement and reachability are unchanged.
- **P9 Home stairs.** The main floor and the deck stand 2.7 m above the lower floor and the yards. Each stair run is 12 real steps in the ground itself (treads and risers you can see, the risers shaded), with solid side walls the full height of the run. The hole and camera glide up the run (continuous), the steps pass under it. Stair fixtures are scenery: never eaten at any size. The lot stays flat. The floor switch at the middle of a run is unchanged; at that moment the other storey appears at its true height (above you going up, below you going down).
- **P8 Hills.** Real ground height for Stanley Park (20 m grid; the park's high ground is about 80 m) and Metro Vancouver (200 m grid; Grouse about 1,100 m on this grid) from the public Terrain Tiles (Mapzen / AWS open data: SRTM, GMTED, NED and others), baked by `tools/bake-elevation.py` into `data/elevation.js` (670 KB). Each summit with enough prominence (10 m in the park, 100 m in Metro Vancouver) is a hill: Stanley Park 7, Metro Vancouver 301, named where a known peak is close (Mount Garibaldi, Whistler Mountain, Mount Strachan, Crown Mountain, Mount Fromme, Golden Ears, the Stawamus Chief, Burnaby Mountain...). A hill is a keep-object you roll over (never solid) until the hole is a fifth of the hill's full width (its summit dome); then it is eaten whole: the ground sinks to the hill's base as it falls, everything standing on it goes with it, and it stays flat (kept in the world's eaten set in story runs, restored on reload). The big North Shore mountains stay landscape at Metro Vancouver's largest size; the old cone-shaped mountain models are gone wherever the real ground now stands. The Home stays flat.
- Tests (`behaviour.js`, "real height"): the stair run climbs 0 to 2.7 m with 12 tread levels, the hole really rises riding it, stair fixtures survive a 9 m hole, the lot is flat; Stanley Park's high ground is real, a hill rolls under a small hole, is eaten whole by a big one (ground at its base afterwards, all 78 things on it gone), and stays flat after a reload; Grouse stands over 600 m.
- Perf: CPU per frame is unchanged (about 1–3 ms; the height map is rebuilt only with a ground repaint or while a hill sinks). Headless fps here (SwiftShader, no GPU) is 14–15 in the two hilly worlds against about 17 before, from the denser ground grid; the Globe is unchanged at about 12.

## Found while testing (fixed)
- **Globe soft-lock (from Part 17).** The step that keeps every landmark on its own side of a border moved the Lions Gate Bridge (it stands over the First Narrows) about 4 km north, outside the Vancouver zone ring of the Globe's 4th objective; the hole is held inside that ring, so Story stalled at objective 3/12 (the pace bot sat at size 4 for 40 minutes). The objective ladder's hand-placed landmarks are now never moved. `tests/data.js` gained a check for every world: each Story objective stands inside the zone ring of its own beat (it fails on the old code).
- **A stale "last good spot" from another world.** Stanley Park's and Metro Vancouver's invisible border put the hole back on the last in-bounds spot, which was kept across worlds; switching world could throw the hole to the other world's coordinates (it is what blanked screenshots 53/54 into a plain green field). Cleared on every world load.
- **The camera under the upper storey.** Past the middle of a stair run the floor flips and the upper storey is drawn at its true height, which was above a small hole's low camera (you saw the upstairs from underneath). While on the upper half of a run the camera now lifts to clear the storey and its furniture, and settles back at the top.

## P7 pace: the owner's call
Speed ×2 makes every Story run shorter. The owner chose (in this thread, 31 Oct) to keep ×2 and the new pace rather than slow growth or drop the speed change, so the 8–15 minute window is superseded for v5.2. For the record, the same build at ×1 lands Home 9.4, Stanley Park 8.3, Metro Vancouver 8.3, Space 8.3 minutes: the speed change is the whole difference.

## P19 Co-op hardening
Kakashi's runs went 18/19, 16/19 and 17/19. The same three failures showed up here before the fix: 17/19 and 18/19, sometimes 19/19.

**Root cause 1 (the test harness, behind all three signatures).** `tests/coop.js` relays messages between the two pages, and it did so with one `page.evaluate` per message, chained in order. Each evaluate has to wait for the page's main thread. With SwiftShader drawing two 3D pages, that wait is often 50–300 ms, and messages flow at about 25 a second each way.
- So the queue backed up. I instrumented it: messages waited 206 ms on average and up to 2.7 s, and up to 6.4 s on a loaded machine.
- Meanwhile the tests read results after a fixed 0.6–1 s sleep, so they read stale positions, a bonus not yet arrived, and an answer not yet credited. This matches all three signatures, and it explains why the failures came and went with machine load.
- **Fix:** the relay now delivers whatever has piled up in one evaluate, in order, which is how a data channel streams. The tests for those three now wait for the result with a deadline (3–4 s) instead of a fixed sleep.
- After the fix, the wire waits about 11 ms on average, at most about 300 ms. The run prints these numbers at the end (`wire: … queue wait …`).

**Root cause 2 (the game: partner position freshness).** The partner's hole eased toward its last streamed spot by a fixed fraction per frame: `k = dt × 12`, with `dt` capped at 0.05 s.
- At a few frames a second, which is a slow iPad or a heavy scene, the partner trailed behind for seconds.
- It now eases by wall time, `1 − e^(−12·t)`, on both the host and the guest, so it settles in about 0.3 s at any frame rate.

**Root cause 3 (the game: Educational credits for the guest).** The guest's flood guard dropped any learning credit that arrived within 250 ms of the last one. Two right answers delivered together by a network burst counted once.
- The guard is now "at most 4 credits in any second". Junk and flood messages are still dropped; the "wire is never trusted" test is unchanged and passes.

**I Spy bonus timing:** no game defect was found. The bonus rides the next state message (every 100 ms). It was late only because of root cause 1.

**Acceptance.** These are the actual runs:

| Run | Conditions | Result | Wire wait (avg / max) |
| --- | --- | --- | --- |
| 1 | three runs back to back | 19/19 | 11 / 265 ms |
| 2 | three runs back to back | 19/19 | 10 / 277 ms |
| 3 | three runs back to back | 19/19 | 12 / 299 ms |
| 4 | with the balance bot running alongside | 19/19 | 15 / 462 ms |

## v5.2 results (tests at hand-off)
| Suite | Result |
| --- | --- |
| `tests/data.js` | PASS ×5, no errors (new: every Story objective inside its own zone ring) |
| `tests/behaviour.js` | 38/38 (new: v5.1 → v5.2 world order, targets never vanish, fences are chains of sections, real height) |
| `tests/globe-school.js` (new) | 6/6: animals roster and spot-checks, animals in the world, landmark roster, landmarks in their countries, spot-checks |
| `tests/coop.js` | 19/19 in five runs (three back to back, one with the pace bot running alongside, one in the final suite) |
| `tests/reachability.js` | 100% in all five worlds; Home deck → backyard at the smallest size; front path sidewalk → gate → front door clear |
| `tests/audio.js` | 9/9 (each world its own song in the new order) |
| `tests/ui-flow.js` | clean, 0 console errors |
| `tests/screens.js` | refreshed, 0 console errors. 53/54 now show the real surround; new 66–77 (stairs mid-climb, front yard, Second Beach Pool, a Stanley Park hill, North Shore mountains, Canada Place Story start, the SeaBus, Europe borders and names, Paris at capital size, East Africa areas, Australia's animals, Japan's landmarks) |
| `tests/perf.js` | GPU-less headless (SwiftShader), exits non-zero as it always has here: Vancouver 14.9, Stanley Park 14.6, Globe 11.9 fps; CPU 1.4–2.7 ms a frame. v5.1 measured 18.6 / 22.8 / 14.6–16.2 on the same kind of machine: the denser ground grid for real height and the Globe's labels, areas and animals cost GPU fill here. The 50 fps target still needs a real iPad. |

### Pace bot, v5.2 at speed ×2 (`node tests/balance-bot.js 1,2,3,4,5 40`, sim-minutes; kept by the owner's call, see P7)
| World | Finish | Objectives eaten at (min) |
| --- | --- | --- |
| W1 The Home | 7.2 | 1.26 1.83 2.78 4.2 5.02 6.26 6.89 7.23 |
| W2 Stanley Park | 4.5 | 0.08 0.15 0.46 2.2 3.24 3.82 4.2 4.44 4.48 4.52 |
| W3 Metro Vancouver | 4.7 | 1.88 2.19 2.52 2.64 3.27 3.71 4.2 4.66 4.72 4.74 |
| W4 The Globe | 5.1 (after the Lions Gate fix; before it, stuck at 3/12) | 0.19 0.5 0.6 0.73 1.21 2.53 3.13 3.98 4.48 4.66 4.89 5.08 |
| W5 Space | 4.3 | 0.07 0.2 0.23 0.3 0.59 2.24 3.67 4 4.3 |

At ×1 (same build, for comparison): Home 9.4, Stanley Park 8.3, Metro Vancouver 8.3, Space 8.3.

### Not verified, said plainly
- Co-op still has not been tried on two real iPads or the live PeerJS broker (unchanged from v5.1).
- Frame rate on a real iPad: the headless numbers above have no GPU.
- At Metro Vancouver's maximum size in the north-west corner the Coast Mountains rise steeply round the hole (screenshot 51); it is the real ground, but worth a look on the iPad.

# v5.3 — multiplayer grows up: four players, nobody falls behind (spec v5.15 addenda 32–39)
Branch `claude/hungry-hole-v53`, built on `main` after the v5.2 merge (b69efa5). The batch rule is addendum 37: in multiplayer no
player may end up smaller, weaker, shut out or stuck while the others advance. Solo play changes only where Parts 6 and 7 say
(I Spy and Educational are redesigned for every player); everything else is multiplayer-only. Addendum 40 (Globe animals
must roam and be animated) is not part of this batch and is not done here.

## Part 1 — up to four players (addendum 32)
- **Topology: a star through the host.** The host holds one link per guest (`N.peers`, up to `MAXG` = 3); a guest holds one link,
  to the host. Guests never talk to each other. The host's save is still the session truth, guests still stream their hole
  (~10 Hz), and the host relays everything else (eats, movers, the ladder, snapshots) plus every hole's position to every guest.
- **Transport.** `NET.host` now keeps the room open and calls `link` once per friend, for as long as the session lives, so a
  friend can join a game already going (and a guest who dropped can come back). A fifth player gets "That game already has
  4 players". The PeerJS host's links no longer destroy the host's Peer when one guest leaves. The test transport's host end is a
  hub: one channel, links routed by sender. Nothing above the transport knows how bytes travel (unchanged).
- **Slots and colours.** Each player has a slot (0 = host, 1–3 = guests) that picks a colour: cyan, pink, green, orange. Every
  player sees, for every other player, their name plate (edged in their colour) or an arrow in their colour with their name,
  a minimap and mini-globe dot in their colour, and their hole drawn in their colour (the ground shader cuts up to three
  partner holes). Two friends with the same name are told apart (Ana, Ana2).
- **The wire.** `cap` carries the eater's slot instead of 'g'/'h'; `st` carries the host's hole (`h`) and the other guests'
  (`ps`); `hello` gives the guest its slot; `win` carries a hand number. `GAME_V` is 5.3, so a 5.2 iPad is told to update.
- **Shared ladder, shared pause.** Any player's eat advances everyone. The pause is still shared: the host works out, for each
  guest, whether someone else paused, and everyone sees who.
- **Soft disconnects, per player.** A guest who leaves (or goes silent for 6 s) has already banked the coins they earned on their
  own iPad; their hole fades out on every screen and the session plays on for the rest. When the last guest leaves, the host's
  run carries on solo. If the host leaves, every guest goes home with their coins. Nobody's own progress is ever touched.
- **Found while testing (fixed): a guest's eat could credit the wrong player.** The host runs each guest's hole inside a swap of
  the engine's one-hole state. A fall that ended during that pass was eaten inside the swap, so with more than one guest the
  coins and the I Spy bonus could land on whichever guest's pass finished it, and the other guests' bonuses were skipped.
  Falls that end during a guest's pass are now collected and eaten after the swap (`mateStep`).

## Part 2 — I Spy together is won as a team (addendum 33)
When a multiplayer I Spy hand is finished, the host records the win on its own save and sends every guest still in the game a
`win` with a hand number; each guest marks that world's I Spy as won on its own save (`S.ispy[n].wins`) once per hand number,
however many times the wire repeats it. The win bonus is paid into each player's tally on the host and banked into their own
wallet, once. A guest who left before the finish gets their coins only. Solo I Spy is unchanged.

## Part 3 — Upgrades never pause multiplayer (addendum 34)
In a multiplayer session the HUD's Upgrades button sets `G.upLive` instead of pausing: the frame loop keeps running the world for
that player and their iPad never tells the others it is paused, so their hole sits unsteered where it was. This holds for host
and guests alike. The Educational quest menu (also a personal overlay) gets the same rule. The deliberate Pause button is still
shared. Solo, Upgrades still pauses the run.

## Part 4 — the whole world is open (addendum 35)
`ringNow()` returns nothing for a multiplayer run (`G.run.mp`, set when the world is loaded with a session), in every mode, for
everyone, so neither the hole's own clamp nor the host's check of a guest's position applies a ring. The world's outer border is
unchanged. Each iPad builds and draws the world round its own hole wherever it is (it always did; nothing streams from the
host). If the friends all leave, the run stays open until the host loads a world again; snapping a ring shut round someone
who is outside it would throw them across the map. Solo Story keeps its rings (tested).

## Part 5 — the team grows together (addendum 36)
In multiplayer Story the host's hole carries the team's one size. Before each guest's hole is run it is set to the team size,
and after a guest eats, its growth is copied back to the team and to every other guest (`teamFrom`). Every hole is drawn at the
team size and the cap (the next objective) applies to it. Coins and points stay each player's own.

**The size upgrades, reconciled (recorded as asked):**
- **Growth Boost** stays personal and still counts: a bite grows the team by what that player's own Growth Boost makes it worth.
  It speeds the whole team, so nobody is left behind by it.
- **Head Start** does not apply to a guest joining a multiplayer Story: the team is at the host's current size (the session's
  truth), and the guest joins at it. A guest's solo save is never written by a session (they play on a scratch copy).

## Part 6 — I Spy is a fixed-size hunt (addendum 38)
- **One size per hand.** "Size" is the world's size ladder (the HUD's Size 1, 2, 3…). The 30-item I Spy list is still a
  shuffle-bag (the saved deck format is unchanged): a hand takes the next item, then the other undealt items of that size.
  When the list has fewer than five of that size, the hand is filled with other kinds of thing of that size that live in the
  world (never water, scenery, a totem pole, a door or a cloud), then with things that size already standing there (the
  Home's furniture lives in its rooms). A size with very few things in the whole world (Space's Saturn and Jupiter) deals a
  shorter hand rather than mixing sizes.
- **One size per hole.** The hole is set to exactly what fits the hand's biggest thing (the v5.0 fit rule, ×1.04) the moment the
  hand starts, and `addXP` does nothing in I Spy: eating still pays coins and points, the size never moves. The arrow points
  at the nearest thing still to find (a hand has no order). Solo I Spy's ring is the smallest ring that holds every thing
  still to find.
- **Upgrades are unlimited**, session-only: a sandbox like Exploration's (`G.sandUp`) that starts every upgrade at 10, each
  settable 0–10 for free, never written back. The exception is the four coin upgrades (Points Boost, Coin Boost, Lucky Coins,
  Quest Payday): coins earned in I Spy are real, so they pay at the player's own bought level. A free ×2.2 coin boost would
  make I Spy the best coin farm in the game; the coin upgrades decide no access and no size, so equality is untouched.
- In multiplayer every hole starts the hand at the identical size, by construction.

## Part 7 — Educational: fixed size, unlimited upgrades, a speed dial, animal hunts (addendum 39)
- **One size per set:** the fit of the set's biggest target (across all its steps) plus one size step of the world's ladder
  (`stepUp`). It is set when the set starts, never moves, and there is no size control. A set with no target at all (the
  sums) uses the lesson size (the Globe's `eduMin`, else the starting size) plus a step.
- **Unlimited upgrades** on Part 6's terms. **The speed dial:** Educational shows Exploration's ADJUST SPEED stepper (10–100%,
  session-only) and not its size buttons.
- **Globe animal hunts:** three new Globe sets (Africa; Asia and Australia; the Americas). A target `@CC.j` is species j of
  country CC in the owner's dataset, placed on its own habitat in its own country, marked and kept until eaten, and shared in
  multiplayer like any placed target (its size and model ride the `add` message). Hunt animals are sized from the lesson size,
  so these sets play at a hole width of 49–57 Globe units (400 to a degree), under the giant tier (100) where animals stop
  appearing. They stand still: making them roam
  and animate is addendum 40, not this batch.

## Other
- Exploration together is unchanged. In multiplayer the Globe's roaming ambient animals stay off (as in v5.2: each iPad would
  roll its own); hunt animals are placed targets and are shared.
- A tile is no longer pulled by Magnet Aura. With the sandbox at 10, magnet pulled sum tiles, which have no base position, and
  sent them to NaN (found by the placed-targets test).

## The no-kid-falls-behind audit (addendum 37) of the finished multiplayer
Each way a player could fall behind in a multiplayer session, and where it stands now:

| Could a player end up… | Story | I Spy | Educational | Exploration |
| --- | --- | --- | --- | --- |
| **smaller** | No: one team size (Part 5) | No: one hand size for all (Part 6) | No: one set size for all (Part 7) | Size is each player's own dial, by design; nothing is earned, and anyone can dial to any size |
| **weaker** (slower, less reach) | Upgrades stay personal (coins buy comfort), but they gate nothing: size is shared and the whole world is open | No: everything unlocked for everyone | No: everything unlocked, plus the speed dial | Sandbox: everything free for everyone |
| **shut out** (zone rings, full room) | No rings (Part 4). A late friend can join a game already going, up to four | No rings | No rings | Never had rings |
| **stuck** (frozen by someone else) | Upgrades and the quest menu pause nobody (Part 3); only the deliberate Pause is shared | Same | Same | Same |
| **left with nothing** (credit) | Coins they earn are theirs and banked as they go; leaving keeps them | Team win on every save still in the game; the bonus to every wallet once | Each player's right answers count on their own save | Nothing is saved for anyone (unchanged) |

Two things the audit noticed and left as they are, said plainly:
- **Speed in Story.** A player with more Speed bought moves faster in multiplayer Story. It gates nothing (size is shared, the
  world is open, any player's eat advances everyone) and it is the "comfort" coins buy, so it stays.
- **Exploration's size** is personal: that is the mode (each player dials their own size). No one can be held back there,
  because the dial goes to any size for anyone.

## v5.3 results (tests at hand-off)
| Suite | Result |
| --- | --- |
| `tests/data.js` | PASS ×5, no errors (new: every Globe animal-hunt target names a real species of its country, inside the lesson size) |
| `tests/behaviour.js` | 44/44. New: I Spy one size per hand, played at exactly its size, never growing (20 hands across all five worlds); I Spy and Educational upgrade sandbox (starts at 10, coin upgrades your own, nothing written back, solo Upgrades still pauses); Educational set size = biggest target + one step for every set of every world, unchanged by eating, no size control; Educational speed dial (35% → 0.35× travel); the three Globe animal hunts (every species in its own country, eatable at the set size, under the giant tier, checked off when eaten); solo Story still held by its ring |
| `tests/coop.js` | 28/28 in three runs back to back (the first with the balance bot running alongside). The test transport now carries four pages. New four-player tests: three guests join one code and all four holes sync, each seen by name and colour; one guest's eat advances the ladder on all four; team size grows when only the host eats, and when only a guest eats, and parks at the same cap; no rings, a guest drives out through the solo ring and is drawn and populated at the far end of the world; Upgrades pauses nobody (guest on Upgrades: the host's world keeps moving and the host eats; host on Upgrades: a guest keeps playing and eats); a guest drops and the other three play on with the leaver's coins kept; I Spy with four (one size for every hole, the leaver gets no win, the three who finish each get the win on their own save once, even when the message repeats, and the bonus in their wallet); Educational with four (one fixed size, the speed dial and no size control on every iPad). Wire wait 66–96 ms average, 2.4–3.0 s worst, with four SwiftShader pages drawing at once |
| `tests/reachability.js` | 100% in all five worlds (unchanged) |
| `tests/audio.js` | 9/9 |
| `tests/ui-flow.js` | clean, 0 console errors |
| `tests/globe-school.js` | 6/6 |
| `tests/screens.js` | refreshed (the I Spy and Educational scenes changed); new 78–81 (a one-size I Spy hand in the Home, I Spy's everything-unlocked Upgrades, Educational's speed dial with no size buttons, a Globe animal hunt in Kenya) and, from `HH_SHOTS=docs/screenshots node tests/coop.js`, 82–85 (a four-player game seen by the host and by a guest, the host's pause with the room code, a guest paused by the host) |
| `tests/perf.js` | GPU-less headless, exits non-zero as it always has here: Vancouver 15.1, Stanley Park 13.5, Globe 12.5 fps (v5.2: 14.9 / 14.6 / 11.9) |

### Pace bot, v5.3 (`node tests/balance-bot.js 1,2,3,4,5 40`, sim-minutes; solo Story is untouched by this batch)
| World | Finish | Objectives eaten at (min) |
| --- | --- | --- |
| W1 The Home | 7.5 | 1.26 1.83 2.76 4.32 5.28 6.3 7.13 7.46 |
| W2 Stanley Park | 4.3 | 0.08 0.15 0.39 2.01 3.04 3.61 4 4.23 4.28 4.31 |
| W3 Metro Vancouver | 4.7 | 1.88 2.19 2.52 2.64 3.27 3.71 4.2 4.66 4.72 4.74 |
| W4 The Globe | 5.1 | 0.17 0.54 0.63 0.74 1.26 2.54 3.14 4.01 4.48 4.68 4.95 5.09 |
| W5 Space | 4.4 | 0.07 0.19 0.22 0.29 0.53 2.09 3.52 4.06 4.36 |

These are under the 8–15 minute window, the same as v5.2: the owner chose on 2026-10-31 to keep base speed ×2 (v5.2, P7), and
this batch does not touch solo Story's pace. At ×1 the same worlds land at about 8.3–9.4 minutes.

### Not verified, said plainly
- Co-op has still not been tried on real iPads or the live PeerJS broker, now with up to four (the owner's multi-iPad test). The
  star through the host means the host's iPad sends about three times the traffic it did with one friend: roughly 30 small
  state messages a second. That is light for WebRTC, but a slow host iPad is the first thing to watch.
- Frame rate on a real iPad (the headless numbers have no GPU). The host now simulates up to three guests' holes.
- I Spy hands in a size with very few things in its world are shorter than five (Space's biggest size has only Saturn and
  Jupiter); the rule "one size per hand" was kept over "five per hand".
