# Hungry Hole

Family-only, not for sale. A LANDSCAPE browser game: drag a hole around huge places, eat things smaller than you, grow, finish chapter checklists and Tiny Quests, earn coins, buy per-chapter upgrades.

- **One public repo** — build and play here. Live: https://zerononeex.github.io/hungry-hole/ (`index.html` + the vendored `three.min.js` at the repo root; merging to `main` publishes).
- **The journey:** 7 chapters — The House, Backyard & Neighbourhood, The City, The Wilderness, World Tour, Fictional Space, The Humbling — from one Lego brick to becoming a black hole.
- **Spec:** `docs/SPEC.md` (v2, owner restructure applied). Builders: branch, build, Kakashi verifies BEFORE merge.
- **v3 (3D):** Three.js r147 vendored as `three.min.js` (no CDN, works offline). Builder decisions in `docs/DECISIONS.md`. Tests: `python3 -m http.server 8765` at the root, then `node tests/{data,behaviour,audio,reachability,ui-flow,balance-bot,screens,perf}.js`.
- **v4 (owner feedback batch):** true-scale Ch1–4 (metre table), Ch3 baked from OpenStreetMap data (`tools/bake-ch3.py` → `data/ch3-osm.js`, © OpenStreetMap contributors, ODbL), STORY / I SPY / EDUCATIONAL modes, audio slots in `audio/` (prompts in `docs/AUDIO_PROMPTS.md`). Decisions: `docs/DECISIONS.md` (v4 section).
- **v4.1:** music plays through WebAudio (fixes silent music on iPhone; `HH.debugAudio()` reports what is playing), text-to-speech removed game-wide, and an orange UPGRADES button in the HUD. Notes: `docs/DECISIONS.md` (v4.1 section).
