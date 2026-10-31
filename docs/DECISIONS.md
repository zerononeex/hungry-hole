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
