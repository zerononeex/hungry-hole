# HUNGRY HOLE — Locked Spec v1 (2026-10-29)

Family-only, not for sale. Portrait browser game for the kids (ages 8 and 7) on iPad Safari,
played from a GitHub Pages site added to the Home Screen. Clean-room game inspired by
hole-eats-and-grows games (Hole.io / All in Hole style) — the idea only, no copied assets,
names, art, or code.

Working title: **Hungry Hole**

## Repos
- PRIVATE dev (builders ALWAYS pick this): `zerononeex/hungry-hole` · `main`
- PUBLIC play mirror (NEVER picked as a build session): `zerononeex/hungry-hole-play`
  → https://zerononeex.github.io/hungry-hole-play/
- Builder ships a finished `site/` folder in the dev repo and ends its hand-off with
  "SITE READY TO MIRROR". Kakashi mirrors `site/` into the play repo and verifies live.

## Core loop (locked)
- Top-down 2D. Drag anywhere — the hole follows the finger with smooth, slightly slidey
  movement. Mouse works the same for desktop testing. No steering buttons.
- The map is bigger than the screen (~1600×2400); the camera follows the hole.
- Every object has a size tier. If the object's centre is over the hole AND its tier is
  at or below the hole's current size level, it tips, spirals, shrinks and drops in
  (~180 ms) with a gulp sound and points. If it is too big, it wobbles / bumps — no other
  penalty except where a quest says so.
- Eating grows the hole continuously. Size levels 1–6 (City uses 6; other worlds 5).
  Eat-XP = the object's tier. Small (tier 1–2) objects respawn away from the hole to
  keep growth always possible; quest collect/avoid items never respawn.
- Score: tier 1 = 10, 2 = 20, 3 = 40, 4 = 80, 5 = 150, 6 = 300. Quest collect items +50 bonus each.
- One pickup type in v1: **Magnet** — appears occasionally, pulls in all eatable objects
  nearby for 8 seconds.
- Round timer per level (below). Time out with the main goal unfinished = friendly fail
  screen ("So close!"), Retry / Level Map, no lives, no penalty, progress never lost.

## The level + side-quest system (locked — the heart of the game)
Every level has:
1. **ONE Main Goal** — finish it before the timer ends to WIN the level.
2. **TWO Side Quests** — optional, shown live as checklist chips under the main goal.
   They never fail the level. A lost side quest (e.g. an Avoid quest) just gets an ✗
   for that run; the level plays on.
3. **Stars:** 1★ for the main goal, +1★ if at least 1 side quest is done, +1★ if both
   are done. Best stars + best score saved per level.

Quest types the engine must support (data-driven, levels are config, not code):
- `collect` — eat N of a specific item ("Eat 3 rubber ducks")
- `avoid` — eat ZERO of a specific item for the whole run ("Don't eat any toy frogs")
- `total` — eat N objects of any kind
- `score` — reach N points
- `combo` — eat N objects within 6 seconds
- `reachSize` — reach size level N
- `bigEat` — eat at least 1 of a specific big item
- `speed` — finish the main goal with at least N seconds left (judged at the win moment)
- `noBump` — bump into too-big objects no more than N times

Unlocks: next level unlocks when the previous level's MAIN goal is done. Next world
unlocks when level 5's main goal of the previous world is done. Side quests are never
required to unlock anything. Each unlocked world also gets a **Free Play** button:
120 seconds, no goals, just eat everything and chase a high score.

Quest fairness rules for level data: collect items spawn at least 2× the needed count;
avoid items spawn 5–7, spread out, never blocking the only path to a quest item;
every level must be completable by tier progression (test it in code, don't eyeball it).

## Worlds and size ladders (locked)

### World 1 — TOY CLEANUP (playroom floor, warm wood + rug)
- T1: marble, die, crayon, brick, puzzle piece
- T2: rubber duck, toy frog, toy car, block, small ball
- T3: book, toy dinosaur, toy truck, small teddy, toy train
- T4: big teddy, toy box, kids' chair, skateboard
- T5: play table, bookshelf, toy kitchen

### World 2 — SPACE HOLE (dark starfield)
- T1: star, space rock, crystal
- T2: asteroid, comet, satellite debris
- T3: small moon, satellite, alien, rocket
- T4: small planet, big UFO, space-station pod
- T5: big planet, space station, the Sun (level 5 only)

### World 3 — TREASURE HOLE (sunken pirate cove, sand + teal)
- T1: coin, shell, pearl
- T2: ruby, emerald, sapphire, gold nugget, crab, pufferfish, starfish
- T3: gold bar, goblet, message bottle, small anchor
- T4: treasure chest, crown, cannon, statue
- T5: giant treasure chest, golden statue, big anchor

### World 4 — CITY (streets + parks) — ladder in the owner's own order
- T1: litter (cup, can, newspaper), garbage bag
- T2: trash can, street lamp, traffic cone, fire hydrant
- T3: person, bicycle, mailbox, big garbage bin (dumpster)
- T4: car, pickup truck, bus
- T5: house, semi truck, small building
- T6: apartment building, office tower
- People are cartoon pedestrians who fall in slapstick-style, no gore, and pop back
  on the Free Play / next level as normal. Several City levels use them as Avoid items.

## The 20 levels (locked)

### Toy Cleanup — 90s, 90s, 105s, 105s, 120s
1. **First Cleanup** — Main: eat 12 things. Side: eat 3 blocks · get a 4-in-a-row combo.
2. **Duck, Duck… Frog!** — Main: eat 3 rubber ducks. Side: don't eat any toy frogs · eat 15 things.
3. **Block Party** — Main: eat 15 blocks. Side: eat 3 toy cars · reach size 4.
4. **Teddy Trouble** — Main: eat 2 big teddies. Side: don't eat any toy frogs · score 1,000.
5. **The Big Cleanup** — Main: eat 1 play table. Side: eat 3 toy dinosaurs · finish with 20+ seconds left.

### Space Hole — 90s, 90s, 105s, 105s, 120s
1. **First Orbit** — Main: eat 12 things. Side: eat 3 stars · get a 4-in-a-row combo.
2. **Comet Catcher** — Main: eat 4 comets. Side: don't eat any satellites · eat 20 things.
3. **Moon Munch** — Main: eat 2 small moons. Side: eat 3 aliens · reach size 4.
4. **Planet Snack** — Main: eat 2 small planets. Side: don't eat any UFOs · score 1,200.
5. **Eat the Sun** — Main: eat 1 Sun. Side: eat 1 space station · finish with 20+ seconds left.

### Treasure Hole — 90s, 90s, 105s, 105s, 120s
1. **Coins, Coins, Coins** — Main: eat 15 coins. Side: eat 3 pearls · don't eat any crabs.
2. **Ruby Rush** — Main: eat 4 rubies. Side: eat 20 things · don't eat any pufferfish.
3. **Golden Goblets** — Main: eat 3 goblets. Side: eat 3 emeralds · reach size 4.
4. **Chest Quest** — Main: eat 2 treasure chests. Side: don't eat any crabs · score 1,200.
5. **The Giant Chest** — Main: eat 1 giant treasure chest. Side: eat 1 crown · finish with 20+ seconds left.

### City — 90s, 90s, 105s, 105s, 120s
1. **Street Sweeper** — Main: eat 12 things. Side: eat 4 garbage bags · don't eat any people.
2. **Bin Day** — Main: eat 4 trash cans. Side: eat 3 street lamps · eat 20 things.
3. **Rush Hour** — Main: eat 3 cars. Side: don't eat any people · get a 5-in-a-row combo.
4. **Moving Day** — Main: eat 2 houses. Side: eat 2 buses · reach size 5.
5. **Downtown** — Main: eat 1 office tower. Side: eat 2 houses · finish with 20+ seconds left.

Total stars possible: 60.

## Hole skins (cosmetic reward, locked)
Chosen on the level-map screen. Unlocked by total stars earned, never reset:
Classic Black (start) · Galaxy Rim (10★) · Rainbow Rim (25★) · Gold Rim (40★).

## Screens / HUD
- Home: title, big Play button (goes to world map), Free Play is per-world.
- World map: 4 world cards with star totals; locked worlds show what's needed.
- Level map (per world): 5 level buttons with stars + best score, Free Play button,
  hole-skin picker.
- In level (portrait HUD): timer bar across the top; main-goal pill with live progress
  (icon + 2/3); two side-quest chips under it that tick ✓ live or ✗ when lost; score;
  hole-size meter (current size level + progress to next); pause button.
  Pause menu: Resume, Restart, Quit to map, Sound on/off. Auto-pause when the app
  is backgrounded / tab hidden.
- Win screen: stars earned (animated in), score + best, side-quest results list,
  Next / Replay / Map. Fail screen: what the main goal still needed, Retry / Map.

## Art and sound (v1, locked)
- Objects are large, clear emoji sprites with a soft drop shadow on the map — instantly
  readable for kids, zero external assets, keeps the game one fast file. Each world has
  a code-drawn canvas background in its theme (playroom floor/rug, starfield, cove sand,
  city streets with roads/park blocks drawn as a simple grid the objects sit on).
- The hole: black circle with a themed rim, subtle inner shadow / swirl, objects spiral
  in as they're eaten. Too-big objects sit still (no fake wobble that implies they fit).
- Sound: tiny WebAudio synth only (gulp/pop pitch rises with tier, ding on quest tick,
  little fanfare on win, soft thud on bump). No audio files. Sound on/off in pause + home.
- No emojis in menus/buttons as UI icons — text labels and simple shapes for UI;
  emojis are the *game objects only*.

## Tech rules (locked)
- `site/` in the dev repo, single self-contained `index.html` (inline CSS+JS, no build
  step, no external requests). Works offline once loaded.
- True full-playfield width on iPad portrait — no letterbox pillar bars (learned the
  hard way on Weird Fishing). Test at 820×1180 (iPad) and 390×844 (iPhone).
- Save: localStorage key **`hungry-hole-data-v1`** — never rename or change its shape
  without a migration. This origin (zerononeex.github.io) is shared with other family
  apps: the game must never clear, enumerate, or touch any other key.
  Save shape: unlocked worlds/levels, stars + best score per level, total stars,
  chosen skin, sound setting. Settings has an in-game Reset Progress (two-tap confirm)
  — that is the ONLY reset path; never advise clearing Safari website data for this app.
- Performance: object count per map modest (~120 active), canvas rendering, no per-frame
  DOM churn. 60fps target on a school iPad.
- Discipline: minimal code (Ponytail), and every build ends with a cleanup pass
  (dead code / duplicates removed, with search evidence) before reporting done.

## Verification the builder must run before saying done
- Serve `site/` over http; zero console errors.
- Data test: all 20 levels load; for every level — collect items spawn ≥2× need,
  avoid items present 5–7 when an avoid quest exists, main goal is tier-reachable.
- Play test (automated drag or scripted): eat → grow → size up; collect quest ticks;
  avoid quest fails on eating one but the level continues; combo quest ticks; timer
  fail screen appears; win screen stars match quests done; save survives reload.
- Screenshots: home, world map, one level per world, win screen — portrait iPad size.
