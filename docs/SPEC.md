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
- `sequence` — eat a set of letter/number tiles IN EXACT ORDER (see Sequence Hunts below)

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

## Sequence Hunts — the educational bonus levels (added by owner 2026-10-29)
One bonus "Hunt" level per world, shown as level 6 on the level map. It does NOT gate
anything; it uses the same stars (so total stars become 60 + 12 = 72).
A Hunt's main goal is a `sequence` quest: special letter/number tiles are scattered
across the map and must be eaten **in exact order**.
- Toy Cleanup Hunt: numbers **1 → 10** in order (owner's pick).
- City Hunt: **E-A-R-T-H** in order (owner's pick).
- Space Hunt: **P-L-A-N-E-T** in order.
- Treasure Hunt: **G-O-L-D** in order.
Mechanics (kind, no-fail design):
- The HUD shows the whole sequence as a strip; found items tick off, the NEXT tile is
  the only active one — it glows, pulses, and is the only tile that can fall in. All
  other tiles are visible but inactive (they nudge/wobble if touched), so a wrong order
  is impossible and there is never a punishment or reset.
- Tiles are always eatable regardless of hole size (tier 0) — learning is never blocked
  by growth. The rest of the map is a normal level, so they keep growing while hunting.
- When a tile is eaten, the game SPEAKS it aloud via speech synthesis ("E!", "7!")
  when available after the first tap (iPad Safari rule), with a happy pop + the letter
  shown big briefly. Voice can be toggled off in Settings; the pop/ding is the fallback.
- Each Hunt also carries 2 normal side quests (same types as regular levels).

## Tiny Quests — 40 per world, rolling (added by owner 2026-10-29)
"40 side quests per stage" (owner) is implemented as a **quest pool**, not 40 on screen:
- Every world has a pool of **40 Tiny Quests** (data list in the level config).
- During any level in that world, **up to 3 Tiny Quests are active at a time** under the
  side-quest chips. The moment one is ticked, the next one rolls in with a little
  "New quest!" pop — so a run is a constant stream of tiny wins.
- A **Quest Board** per world (on the level map) shows all 40 with ticks for every one
  ever completed across all runs — finishing a world's whole board earns a Board Badge
  shown on the world card. Tiny Quest progress persists in the save.
- Level side quests (the 2 per level, above) are separate and unchanged; Tiny Quests are
  bonus-only, never required, never lost — an active one you don't finish just stays
  unfinished, no ✗.
Tiny Quest types reuse the quest engine plus three learning types:
- `findAnswer` — a question tile floats at the top of the HUD ("7 × 5 = ?"); number
  tiles are scattered on the map among close decoys (28, 34, 36, 40…). Eat the correct
  answer (35) to tick it. Wrong-answer tiles are inactive like sequence tiles — they
  shake and speak their number, they cannot be eaten and never punish. Questions are
  Grade 2–3 level: × tables to 5×5 then 10×10, +/− to 100, "what's missing: 3, 6, __, 12".
- `firstLetter` — "Eat something that starts with B" — any matching world object counts
  (Toy: ball/block/book; City: bus/bike/bin; Space: …world lists in config).
- `pattern` — eat objects in a shown pattern (red, blue, red, blue…) using the world's
  colour-varied objects; teaches patterns, the seed of coding loops/sequences.
Pool mix per world (40): ~18 world-flavoured eat/collect/avoid/combo quests,
~8 findAnswer math, ~6 spelling/letter (firstLetter, vowel hunt A-E-I-O-U order,
missing-letter word), ~4 pattern/if-then, ~4 reach-size/score stretch quests.
Difficulty of math/letter quests is a Settings choice: **Grade 2 or Grade 3** (one
toggle, default Grade 2), because the players are in Grades 2 and 3.

## ENDGAME — "THE BIG JOURNEY" (design locked 2026-10-29, build phase = AFTER v1)
A fifth, unlockable mode — separate from the 20 levels. One epic, slow journey from a
single Lego brick to becoming a black hole. It reuses the same engine; what changes per
chapter is the object set, the size scale, and the camera zoom (each chapter transition
plays a "ZOOMING OUT…" moment and the world visibly rescales).

- **Unlock:** complete all 5 main goals in ANY ONE world (Toy Cleanup is the natural
  first path — the Journey literally starts in that bedroom).
- **Structure:** 7 chapters (owner revised 2026-10-29 — NOT 12; fewer, bigger chapters).
  There is NO fail timer — this mode is a long, savable trek, not a race. Each chapter
  has a **3-item checklist** (like side quests, but these ARE the chapter goal:
  specific must-eats). Eating anything grows you as usual; finishing all 3 checklist
  items completes the chapter. Each chapter also has its own Tiny Quest board
  (the 40-quest replay system) — the owner's replay point: finish the Bedroom chapter,
  go back later, and tick off everything you didn't finish the first time.
  Chapters 2–5 each START SMALL AGAIN relative to their new scale (the zoom-out makes
  you the little guy in a bigger world) — that reset-and-regrow rhythm is the mode's
  heartbeat. Chapter transitions play the "ZOOMING OUT…" moment.
- **At every chapter end the player chooses:** STOP & SPEND (bank coins, go to the
  Upgrades shop, journey checkpoint is saved) or KEEP GOING (next chapter, same run,
  coins keep accumulating — bigger payout if you go further before stopping).
- **Saving:** the journey autosaves at every chapter boundary (furthest chapter +
  chapter-start size). Home screen gets a CONTINUE THE JOURNEY button next to a fresh
  New Journey. A fresh run always starts at zero (Chapter 1, tiniest size) — upgrades
  are the only thing that carry into a new run, exactly like Slingshot Plane.
- **Coins:** when a run stops (player choice, at ANY chapter) coins are banked =
  score ÷ 10, + 250 per chapter completed, + 5,000 for finishing the Journey,
  × Coin Boost upgrade. Quitting mid-chapter still banks coins for progress made so
  far ("whatever size you get to, you get coins" — owner's rule).
- **Water ruling (owner, hedged — Kakashi's clean call, flagged to him):** water itself
  is NEVER eaten — not the river, not the ocean. The dam counts as an object; boats,
  whales and islands do the growing in the wet chapters. "Too much" was his instinct
  and it is right: eating an ocean breaks the size fantasy.

### The 7 chapters (owner's revised route, 2026-10-29, in his order)
1. **The Bedroom** — Checklist: eat 25 Lego bricks · eat 10 toy soldiers · eat 1 bed.
   Ladder: Lego brick/marble/die → toy soldiers → toy car → toy truck → Nerf gun →
   chair → desk → bed. Then ZOOM OUT.
2. **Backyard & the Neighbourhood** — Checklist: eat 1 backyard tree · eat 1 family
   car · eat 3 houses on the street. Ladder: garden things/shoes/plants → BBQ/dog
   house → the backyard tree → the car → bikes/bins/people → trucks → houses.
   Then ZOOM OUT.
3. **The City** — Checklist: eat 10 manhole covers · eat 3 buses · eat 1 office building.
   Ladder: manhole covers/drains/pothole patches (the city's own little holes!),
   lampposts, cones, hydrants → people/bins → cars/buses/trucks → houses →
   small buildings → office buildings. Then ZOOM OUT.
4. **The Wilderness** — you start SMALL AGAIN, out in the wild. One big roaming chapter
   with zones: forest (trees, deer, bears), beach (crabs, shells, beach umbrellas),
   savannah (zebras, lions, acacia trees), rivers (fish — the water is scenery),
   mountains (pines up the edges, boulders, goats, hawks overhead), the shore and
   shallow ocean (coral reefs, turtles, sharks), and a dam on the river.
   Checklist: eat 40 trees · eat 10 whales out in the ocean · eat 1 dam.
5. **World Tour** — now big enough for whole buildings, high-rises and construction
   sites, and the map is THE GLOBE: a wrap-around world (leaving the top brings you in
   at the bottom, east wraps to west — a circle, not a flat rectangle; a mini globe
   tracker shows where you've been). Travel between regions: Europe, Africa, Asia,
   Japan, Singapore, Indonesia, the Americas and more. **Landmarks are the stars of
   this chapter** — famous places drawn big and labelled: Eiffel Tower (Paris),
   Colosseum (Rome), Great Wall (China), Taj Mahal (India), Pyramids of Giza,
   Statue of Liberty, Big Ben (London), Sydney Opera House, Christ the Redeemer,
   Chichen Itza (Mexico), Mount Fuji, Marina Bay (Singapore).
   Checklist (the headline mission): **collect the 7 World Wonders** (Great Wall,
   Colosseum, Taj Mahal, Chichen Itza, Christ the Redeemer, Petra, Machu Picchu —
   each ticks off with its name and country spoken/shown) · eat 10 landmarks total ·
   eat 1 whole island. As the chapter ends you have eaten most of Earth: finish with
   the last mountains — then **THE MOON**: a special slow animation, the Moon tips,
   wobbles, and spirals in. Chapter complete.
6. **Fictional Space** — NOT the plain real solar system: a made-up, packed space
   playground. Space debris, satellites, asteroids, meteors, ice planets, rock moons,
   alien saucers, mini stars (eatable early), mystery planets floating in the belt —
   and the real planets to learn: a sequence quest eats the planets **in order from
   the Sun** (Mercury → Neptune, spoken aloud). Checklist: planets in order · eat
   20 asteroids · eat 1 Sun. Eating THE SUN ends the chapter…
7. **The Humbling (Final)** — …and ZOOM OUT reveals you are still small: bigger
   planets, giant moons, a giant UFO, a ringed mega space-station and laser-moon
   (generic sci-fi, no film IP), BIGGER suns and giant stars. Education scales up
   with you: find-the-answer quests with big numbers (48 × 5), count-the-stars
   sequences, spell G-A-L-A-X-Y. Checklist: eat 2 giant stars · eat 1 giant UFO ·
   spell GALAXY. Finale: the two giant stars you've been circling get pulled in
   together — star + star collide into the hole — full-screen swirl cinematic:
   **"YOU ARE THE BLACK HOLE"** — everything spirals in, credits, +5,000 coins,
   Journey marked COMPLETE (re-runnable forever for coins and unfinished boards).

### The 10 Upgrades (Epic Mode ONLY — the 20 levels stay pure, no upgrades there)
Bought with banked coins between runs, from the Journey screen. Permanent once bought.
Prices rise steeply so the top levels are true endgame.
1. **Speed** (5 lvls) — move +5% per level. 100 / 250 / 500 / 1,000 / 2,000
2. **Growth Boost** (5 lvls) — size gained per eat ×1.1 / ×1.2 / ×1.3 / ×1.5 / ×2.0
   (owner's ladder — ×2.0 exists ONLY at max level). 150 / 400 / 800 / 1,600 / 3,200
3. **Points Boost** (5 lvls) — points per eat ×1.1 / ×1.2 / ×1.3 / ×1.5 / ×2.0. Same prices as Growth.
4. **Coin Boost** (5 lvls) — coins banked +10% per level. 100 / 300 / 600 / 1,200 / 2,400
5. **Magnet Aura** (5 lvls) — small always-on magnet, radius +25% per level. 100 / 250 / 500 / 1,000 / 2,000
6. **Quest Compass** (3 lvls) — edge arrows point to the nearest checklist item;
   lvl 2 shows all 3 checklist types, lvl 3 also shows distance. 200 / 600 / 1,500
7. **Head Start** (2 lvls) — start each chapter 1 size stage bigger per level (max 2).
   1,000 / 3,000 — deliberately expensive, it skips real growing.
8. **Rainbow Trail** (cosmetic, 1 lvl) — the hole leaves a fading rainbow swirl trail. 500
9. **Golden Glow** (cosmetic, 1 lvl) — gold sparkle rim, coins sparkle when banked. 1,500
10. **Crown Galaxy Rim** (cosmetic, 1 lvl, the flex) — crowned rim with a swirling galaxy
    inside the hole. Only buyable after finishing the Journey once. 5,000

Save additions for the Endgame (ADDITIVE fields on `hungry-hole-data-v1` when the
Endgame build lands — never reshape existing fields): coins, upgrade levels owned,
journey checkpoint (chapter + flag), journey completions count, cosmetics owned.

## Verification the builder must run before saying done
- Serve `site/` over http; zero console errors.
- Data test: all 20 levels load; for every level — collect items spawn ≥2× need,
  avoid items present 5–7 when an avoid quest exists, main goal is tier-reachable.
- Play test (automated drag or scripted): eat → grow → size up; collect quest ticks;
  avoid quest fails on eating one but the level continues; combo quest ticks; timer
  fail screen appears; win screen stars match quests done; save survives reload.
- Screenshots: home, world map, one level per world, win screen — portrait iPad size.
