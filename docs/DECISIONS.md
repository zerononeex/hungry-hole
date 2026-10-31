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
