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
  manhole, White Rock, dam, planets, stars, ring station, laser moon, pyramids, Great
  Wall, landmarks, etc.). They are simple canvas shapes, no external images.
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
