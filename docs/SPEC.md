# HUNGRY HOLE — Locked Spec v2 (2026-10-29, owner restructure applied)

Family-only, not for sale. LANDSCAPE browser game for the kids (ages 8 and 7) on iPad
Safari, and for the owner on his phone — played from a GitHub Pages site added to the
Home Screen. Clean-room game built from scratch, inspired by hole-eats-and-grows games
(Hole.io / All in Hole style) — the idea only, no copied assets, names, art, or code.

Working title: **Hungry Hole**

## Repo — ONE public repo, no mirroring (owner decision 2026-10-29)
- PUBLIC, build and play in the same place: `zerononeex/hungry-hole` · `main`
  → live at https://zerononeex.github.io/hungry-hole/
- The game is a single `index.html` at the REPO ROOT (GitHub Pages serves `main` / root),
  so merging a verified branch to main IS publishing. Builders work on a branch;
  Kakashi verifies the branch BEFORE merge (merge = live, instantly).
- `hungry-hole-play` is RETIRED — do not use it for anything.

## Orientation (owner decision 2026-10-29)
- LANDSCAPE. Logical stage 1280×720 (16:9), scaled to fit the screen (`contain`),
  centred, black bars where the device ratio differs (phone landscape gets side bars;
  the owner explicitly does not care — enjoying the game beats filling the screen).
  Bars are plain black. This game's letterbox acceptance does NOT change any other
  game's no-letterbox rule.
- Test at 1180×820 (iPad landscape) and 844×390 (iPhone landscape).

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

## Skins — REMOVED (owner decision 2026-10-29: "nah, don't do skins")
No skins, no hole-skin picker, no star-unlocked cosmetics anywhere. The hole looks
like the hole. (The cosmetic UPGRADES from the earlier Journey draft are also gone —
all 10 upgrades below are functional.)

## Screens / HUD (owner layout, 2026-10-29)
- **Main screen:** the game's hole sits in the middle, slowly swirling (you SEE your
  hole). On top: one big **START** (resumes where you left off / starts Chapter 1).
  Below it exactly three buttons: **CHAPTERS**, **UPGRADES**, **SETTINGS**.
  Settings also gets a small gear in the **bottom-right corner** — the "dashboard"
  corner (same corner in-game: bottom-right holds pause/settings cluster).
- **Chapters screen:** 7 chapter cards — name, your real-world size reached, checklist
  progress, Tiny Quest board count (e.g. 23/40), chapter coin wallet, locked/unlocked.
  Tapping a card RESUMES that chapter exactly where you left it (see Per-chapter state).
- **Upgrades screen:** a grid of all 10 upgrades for the SELECTED chapter (chapter tabs
  across the top). Each card: a clean **vector (SVG) icon**, name, 10 level pips,
  next-level cost. **TAP** a card to select it: a detail panel shows what it does,
  current effect, next-level effect, and a BUY button. **PRESS-AND-HOLD** a card:
  a description pop-up appears while you hold (owner's exact interaction). A
  **BANKER** button opens coin transfers between chapters (40% fee, see Economy).
- **Settings (the dashboard):** Sound on/off · Voice (speech) on/off · Learning
  Full/Sometimes/Off · Grade 2/Grade 3 · **Export Save** (download file + show a save
  code) · **Import Save** (file or paste code, with confirm) · **Learning Report**
  (quests completed by subject: math / spelling / science / geography counts) ·
  Reset Chapter · Reset Everything (two-tap confirms).
- **In game (landscape HUD):** top-left = chapter checklist pill + active Tiny Quest
  chips (tick live); top-centre = points; top-right = chapter coins + size meter;
  left edge = the **"How big am I?" scale readout** (real-world size, e.g. 40 cm →
  3 m → 1 km — see Education); bottom-right = pause/settings cluster.
  Pause menu: Resume, Restart Chapter Run (back to chapter-start size/position;
  coins, upgrades and quest boards are KEPT), Save & Main Menu, Sound toggle.
  Auto-pause when the tab is hidden. Journey chapters have no timer; see the levels
  question in Structure Notes for timed play.

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
- Single self-contained `index.html` **at the repo root** (inline CSS+JS, no build
  step, no external requests). Works offline once loaded. Pages serves `main` / root.
- Landscape stage 1280×720 scaled with `contain`; black bars are expected and fine
  (owner). Test at 1180×820 (iPad landscape) and 844×390 (iPhone landscape).
- Save: localStorage key **`hungry-hole-data-v1`** — never rename or change its shape
  without a migration; all future additions are ADDITIVE fields. This origin
  (zerononeex.github.io) is shared with other family apps: the game must never clear,
  enumerate, or touch any other key. In-game Export/Import (Settings) is the backup
  path — never advise clearing Safari website data for this app.
  Save shape v2: settings (sound, voice, learning mode, grade) · per-chapter state
  (see Per-chapter state: position, size progress, checklist, tiny-quest board,
  wallet, upgrade levels, unlocked) · learning report counters · stars/levels data
  if the levels structure survives (see Structure Notes).
- Performance: chapters are HUGE (below) — render only the camera's neighbourhood
  (spatial partitioning / chunked object lists), cap ACTIVE simulated objects,
  canvas rendering, no per-frame DOM churn. 60fps target on iPad.
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

## "THE BIG JOURNEY" — the 7 chapters (design locked 2026-10-29)
The game's backbone: one epic, slow journey from a single Lego brick to becoming a
black hole. What changes per chapter is the object set, the size scale, and the
camera zoom (each chapter transition plays a "ZOOMING OUT…" moment and the world
visibly rescales).

- **Structure:** 7 chapters (owner revised 2026-10-29 — NOT 12; fewer, bigger chapters).
  There is NO fail timer in chapters — this is a long, savable trek, not a race. Each
  chapter has a **3-item checklist** (like side quests, but these ARE the chapter goal:
  specific must-eats). Eating anything grows you as usual; finishing all 3 checklist
  items completes the chapter and unlocks the next. Each chapter also has its own
  Tiny Quest board (the 40-quest replay system) — the owner's replay point: finish
  the Bedroom chapter, go back later, and tick off everything you didn't finish.
  Chapters 2–5 each START SMALL AGAIN relative to their new scale (the zoom-out
  makes you the little guy in a bigger world) — that reset-and-regrow rhythm is the
  mode's heartbeat.
- **Per-chapter state, wallets, per-chapter upgrades and the 40% Banker** are defined
  in their own section below — chapters are resumable at any time from the Chapters
  screen; there is no "run" that can be lost. Coins are earned live (physical coins,
  points ÷ 10, quest bonuses) — no end-of-run banking step.

## Structure Notes — SETTLED (2026-10-29)
(A) WON: the game IS the 7 chapters. Toy/Space/Treasure/City level content folds
into chapters and Tiny Quest pools (Space = Ch 6–7, Treasure = a sunken-cove zone
in Ch 4 with the G-O-L-D sequence, Toy = Ch 1, City = Ch 3 Metro Vancouver).
The 20 timed levels remain in this spec's history sections only — do not build them.
BUILD = ONE single mega-prompt (owner, 2026-10-29: "I want one prompt… it could
run for 24 hours, I don't care"). No phase split. The builder works through the
whole spec in order inside one session/branch, committing in chunks, and the
internal build order (engine → menus → chapters 1→7 → polish) is sequencing
inside that one job, not separate prompts.
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
3. **METRO VANCOUVER** (owner, 2026-10-29: "if you're going to build Vancouver,
   build it properly — I'll be sharing this with people who live here"). This chapter
   is the REAL Lower Mainland with real names and ROUGHLY REAL relative positions
   (locals will play it — Richmond must be south of Vancouver, the North Shore must
   be across the inlet; perfect cartography not required, wrong-side-of-the-river
   IS a bug). **The map stops at the border — nothing south of the US border exists
   in this chapter** (White Rock sits right at the southern edge, with a funny
   border fence + sign at the map's bottom edge: end of the world, eh).
   The municipalities, placed properly relative to each other:
   - **Vancouver** (centre-west): Downtown (manhole-cover ladder below, office
     towers, SkyTrain trains running on elevated tracks — eatable when huge),
     Stanley Park on its NW peninsula (giant trees, seawall, bikes, totem poles),
     beaches on English Bay, neighbourhoods of houses everywhere else.
   - **Richmond** (south of Vancouver, across the Fraser's north arm, on its own
     flat island): farmland + suburbs, and on Sea Island **YVR AIRPORT** — luggage
     carts → food trucks → parked airplanes, a whole airplane is a top-tier eat.
   - **Burnaby** (east of Vancouver): Metrotown mall (a giant mall building),
     Deer Lake, SFU up on Burnaby Mountain.
   - **New Westminster** (SE of Burnaby, on the Fraser): the Quay, old buildings.
   - **Tri-Cities** (NE): Port Moody (inlet shore), Coquitlam, Port Coquitlam —
     houses, rivers, mountains at their backs.
   - **Pitt Meadows** (east, across the Pitt River): farms, barns, the airport's
     little sibling airfield.
   - **Surrey** (south of the Fraser, big): endless houses, farms to the east.
   - **Delta** (SW, between the river and the bay): farms, and **Tsawwassen** with
     BC Ferries at the terminal — a whole ferry is a top-tier eat.
   - **White Rock** (far south on the coast, at the border): the long pier, and
     **THE White Rock itself** — the famous white boulder on the beach, labelled.
   - **Langley** (east of Surrey): farms + **Fort Langley**, the little historic fort.
   - **The North Shore** (across Burrard Inlet by the Lions Gate Bridge): West
     Vancouver (fancy homes on the slope), North Vancouver, **Grouse Mountain**
     (the Skyride gondola going up and down, the two famous grizzly bears in their
     habitat, the peak chalet), **Capilano Suspension Bridge** (wobbling over the
     canyon — crossable!), and **Deep Cove** at the east end of the inlet (kayaks,
     the little village, Indian Arm reaching north as pure scenery water).
   Travel = bridges and highways, all crossable and labelled: Lions Gate (to the
   North Shore), Oak St / Arthur Laing (to Richmond/the airport), Ironworkers
   Memorial (to the North Shore east side), Port Mann (to Surrey), Pattullo
   (New West ↔ Surrey), Golden Ears (to Pitt Meadows/Maple Ridge edge), Highway 1
   running the whole map east–west with streaming traffic, Highway 99 south.
   Chapter ladder (region-wide): manhole covers/drains (the city's own little
   holes!), lampposts, cones, hydrants → people/bins/bikes → cars/buses/SkyTrain
   cars → trucks/houses → small buildings → office buildings, mall, airplanes,
   ferries → (final, biggest) Grouse Mountain's peak lodge area.
   Checklist: eat 10 manhole covers (Downtown) · eat 1 airplane at YVR · eat THE
   White Rock in White Rock. Then ZOOM OUT.
   (The earlier fictional Downtown → Snowpeak Town route is NOT deleted: Highway 1
   east out of the map is the road to the Wilderness chapter's mountains/snow —
   Snowpeak energy lives in Ch 4's mountain zone and Ch 2's highway east exit
   signposts it.)
4. **The Wilderness** — you start SMALL AGAIN, out in the wild. One big roaming chapter
   with zones: forest (trees, deer, bears, CAMPERS with tents and campfires), beach
   (crabs, shells, beach umbrellas), savannah (zebras, lions, acacia trees), DESERT
   past the beach (dunes, cacti, camels, an oasis), rivers (fish — the water is
   scenery), mountains (pines up the edges, boulders, goats, hawks overhead), the
   shore and shallow ocean (coral reefs, turtles, sharks), and a dam on the river.
   Exact layout is invented — kids don't need real geography here either.
   Checklist: eat 40 trees · eat 10 whales out in the ocean · eat 1 dam.
5. **World Tour** — now big enough for whole buildings, high-rises and construction
   sites, and the map is THE GLOBE: a wrap-around world (leaving the top brings you in
   at the bottom, east wraps to west — a circle, not a flat rectangle; a mini globe
   tracker shows where you've been).
   **ACCURACY RULE (owner, educational, non-negotiable here): this map must match the
   real Earth.** Continents in their real shapes/positions, every landmark IN its
   real country, every famous city in its real place. The kids are learning where
   things ARE: the Pyramids are in Egypt by the Nile, the Mayan pyramids are in
   Mexico, the Eiffel Tower is in Paris. If a placement is wrong, it's a bug.
   **Landmarks are the stars** — drawn big and labelled (name + city + country,
   spoken when eaten): Eiffel Tower (Paris, France), Colosseum (Rome, Italy),
   Great Wall (China), Taj Mahal (India), Pyramids of Giza + the Nile River
   (Egypt), Statue of Liberty (New York, USA), Big Ben (London, England),
   Sydney Opera House (Australia), Christ the Redeemer (Rio, Brazil),
   Chichen Itza (Mexico), Mount Fuji (Japan), Marina Bay (Singapore), Petra
   (Jordan), Machu Picchu (Peru), St. Basil's (Moscow, Russia), Table Mountain
   (Cape Town, South Africa).
   **CITIES TO VISIT** (each a real-place cluster of buildings + local flavour):
   Paris, Rome, London, Moscow, Cairo, Lagos (Nigeria), Cape Town, Singapore,
   Tokyo, Hanoi (Vietnam), Mexico City, Havana (Cuba), Buenos Aires (Argentina),
   Rio, New York, Sydney — and more if the map wants them.
   Chapter special: the **PASSPORT board** — visiting (eating anything in) a country
   stamps it in the chapter's passport page; ~20 countries to collect.
   Checklist (the headline mission): **collect the 7 World Wonders** (Great Wall,
   Colosseum, Taj Mahal, Chichen Itza, Christ the Redeemer, Petra, Machu Picchu —
   each ticks off with its name and country spoken/shown) · stamp 10 passport
   countries · eat 1 whole island. As the chapter ends you have eaten most of
   Earth: finish with the last mountains — then **THE MOON**: a special slow
   animation, the Moon tips, wobbles, and spirals in. Chapter complete.
6. **Space — OUR solar system first, done properly, on a HUGE map** (owner,
   2026-10-29). The map is enormous and packed — space is easy to repeat, so fill it:
   satellites and space stations around Earth, debris fields, comets, meteors,
   wandering UFOs, alien outposts, ice rocks — go everywhere, it's super fun.
   **ACCURACY RULE (educational, same as World Tour): the solar system itself must
   be correct** — the Sun, then the **8 planets in their real order** (Mercury,
   Venus, Earth + its Moon, Mars, Jupiter, Saturn with its rings, Uranus, Neptune),
   and the **asteroid belt in its real place, between Mars and Jupiter** (labelled).
   Pluto sits far out as a bonus, labelled "dwarf planet". Sizes/distances are
   play-scale (real scale is impossible), but ORDER and the belt's location are
   facts, not decoration. The planets-in-order sequence quest (spoken aloud) is
   this chapter's headline. Checklist: planets in order · eat 20 asteroids from
   the belt · eat 1 Sun. Eating THE SUN ends the chapter…
7. **The Humbling (Final)** — …and ZOOM OUT reveals you are still small. **From here
   the accuracy rules END: outside our solar system, space is completely fictional**
   (owner) — invent freely. Bigger
   planets, giant moons, a giant UFO, a ringed mega space-station and laser-moon
   (generic sci-fi, no film IP), BIGGER suns and giant stars. Education scales up
   with you: find-the-answer quests with big numbers (48 × 5), count-the-stars
   sequences, spell G-A-L-A-X-Y. Checklist: eat 2 giant stars · eat 1 giant UFO ·
   spell GALAXY. Finale: the two giant stars you've been circling get pulled in
   together — star + star collide into the hole — full-screen swirl cinematic:
   **"YOU ARE THE BLACK HOLE"** — everything spirals in, credits, +5,000 coins,
   Journey marked COMPLETE (re-runnable forever for coins and unfinished boards).

## Per-chapter state, economy, and the Banker (owner, 2026-10-29 — Slingshot rules)
- **Every chapter is its own little save.** Per chapter the game remembers: hole
  position, size progress, checklist progress, Tiny Quest board ticks, coin wallet,
  and upgrade levels. You can leave the Backyard mid-run, go back to the Bedroom and
  do more side quests, and later RESUME the Backyard exactly where you were
  (owner's exact scenario). Ordinary eaten objects respawn between visits so a
  chapter can never be emptied; checklist/quest/landmark items persist until eaten.
- **Coins come from three places:** (1) physical coins scattered everywhere in every
  chapter — just eat them; (2) points convert to coins continuously (every 10 points
  = 1 coin, paid live into the chapter wallet); (3) bonus coins for every checklist
  item and Tiny Quest completed in that chapter.
- **Chapter wallets are separate** (like Slingshot Plane worlds). **THE BANKER:**
  from the Upgrades screen you can transfer coins from one chapter's wallet to
  another — the Banker takes a **40% fee** (send 100, 60 arrive), shown before you
  confirm, with the Banker character (top hat, coin bag) doing his little animation.
- **Upgrades are PER CHAPTER** (the big balance ruling): maxing an upgrade helps only
  that chapter; a new chapter starts all upgrades at level 0 for that chapter. This
  is deliberate — every chapter gets its own from-zero climb.

### The 10 Upgrades (per chapter, EVERY one goes to level 10)
Each has a vector (SVG) icon, tap-to-select with detail + BUY panel, press-and-hold
for the description pop-up. Effect steps are smooth across 10 levels; cost of level
n = base × growth^(n−1) × chapter number multiplier, tuned so a thorough chapter
playthrough can max roughly 2–3 upgrades. (Builder playtest-tunes exact numbers;
the CAPS below are locked.)
1. **Speed** — +3% move speed / lvl (max +30%)
2. **Growth Boost** — growth multiplier climbing to **×2.0 at lvl 10** (owner's
   1.1→2.0 ladder stretched over 10 steps; ×2.0 only at the top)
3. **Points Boost** — points multiplier climbing to **×2.0 at lvl 10**
4. **Coin Boost** — +6% coins earned / lvl (max +60%)
5. **Magnet Aura** — always-on pull radius +12% / lvl
6. **Vacuum Reach** — eat capture radius +3% / lvl (things fall in a touch earlier)
7. **Lucky Coins** — +2% chance an eaten object also drops a bonus coin / lvl
8. **Quest Payday** — +10% coins from checklist + Tiny Quest completions / lvl
9. **Wide Eyes** — camera view +2.5% / lvl (you see more of these huge maps)
10. **Head Start** — +2% of the first size stage pre-grown per lvl at chapter start

## Huge chapter maps (owner, 2026-10-29 — chapters are PLACES, not arenas)
- **Ch 1 The Bedroom is really THE HOUSE.** Start in the kids' bedroom. While tiny you
  slip UNDER the door into the hallway: two more bedrooms, Mom & Dad's office,
  Mom & Dad's bedroom ("not as exciting" — it's got the big furniture though), then
  DOWN THE STAIRS to the open-concept living room + kitchen, and finally sneak out
  the back door — stepping into the backyard is the chapter's end trigger.
  Interior walls are real: rooms connect only through doors (under-door gap works
  only while small; once big, you eat the door). Stairs are a one-way slide down.
- **Ch 2 is a 4 × 4-block neighbourhood.** 16 blocks, each block = **2 rows of
  10 houses (20 per block, 320 houses)**, every house with a backyard you can get
  into, streets between all blocks, and a PARK one block away (playground, pond,
  big trees). Content is placed by seeded generation from layout rules (not random
  soup, not hand-placing 320 houses): every yard/street/park is full of stuff + coins.
- **Ch 3 City, Ch 4 Wilderness, Ch 5 World Tour, Ch 6–7 Space** scale the same way:
  districts / zones / a wrap-around globe / star fields — each chapter map is many
  screens across, with the Quest Compass (baseline UI: a small edge arrow to the
  nearest checklist item, always on) making big maps friendly.

## Education layer (owner's direction + Kakashi's ideas, presented 2026-10-29)
Core rule: education rides INSIDE the eating (Tiny Quests, Hunts, checklists) —
the game never stops to quiz. Settings: Learning Full/Sometimes/Off + Grade 2/3.
Already locked above: Sequence Hunts, findAnswer math, firstLetter, pattern quests.
Kakashi's additional ideas (presented, pending owner's pick — do not build unpicked):
- **"How big am I?" scale readout** (in HUD above): the hole's real-world size,
  climbing cm → m → km → island → Moon → Earth sizes. ★ top pick
- **Name flash on every eat**: the eaten object's name appears briefly (sight words).
- **Coins with values** (1/5/10/25¢) + "eat exactly 50¢" money quests.
- **Multiplication you can see**: soldiers in rows — "eat 4 rows of 5".
- **Estimation quests**: "eat ABOUT 20 things" (17–23 ticks it).
- **Food-chain sequences** (grass → grasshopper → frog → snake) and **habitat quests**
  in the Wilderness zones; **moon phases in order** in Ch 7.
- **Geography**: landmark eats flash country + one-line fact; compass quests
  ("north of the park"); French word tiles in the Paris zone.
- **Rhyme / opposite / syllable quests** (el-e-phant = 3 tiles in order).
- **Learning Report** on the Settings dashboard (counts by subject) — included in
  the Settings spec above.

## Verification the builder must run before saying done
- Serve the root `index.html` over http; zero console errors.
- Data test: every chapter/level loads; collect items spawn ≥2× need, avoid items
  present 5–7 when an avoid quest exists, checklist/main goal is tier-reachable.
- Play test (automated drag or scripted): eat → grow → size up; collect quest ticks;
  avoid quest fails on eating one but play continues; combo quest ticks; per-chapter
  resume restores position/size/wallet/upgrades; Banker transfer moves 60% and keeps
  40%; save export → import round-trips; save survives reload.
- Screenshots: main screen, chapters, upgrades (with hold pop-up), one scene per
  chapter — LANDSCAPE iPad size (1180×820) and iPhone landscape (844×390).
