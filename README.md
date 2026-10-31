# Hungry Hole

Family-only, not for sale. A LANDSCAPE browser game: drag a hole around huge places, eat things smaller than you, grow, finish chapter checklists and Tiny Quests, earn coins, buy per-chapter upgrades.

- **One public repo** — build and play here. Live: https://zerononeex.github.io/hungry-hole/ (`index.html` + the vendored `three.min.js` at the repo root; merging to `main` publishes).
- **The journey:** 7 chapters — The House, Backyard & Neighbourhood, The City, The Wilderness, World Tour, Fictional Space, The Humbling — from one Lego brick to becoming a black hole.
- **Spec:** `docs/SPEC.md` (v2, owner restructure applied). Builders: branch, build, Kakashi verifies BEFORE merge.
- **v3 (3D):** Three.js r147 vendored as `three.min.js` (no CDN, works offline). Builder decisions in `docs/DECISIONS.md`. Tests: `python3 -m http.server 8765` at the root, then `node tests/{data,behaviour,ui-flow,balance-bot,screens,perf}.js`.
