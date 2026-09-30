# HISTORY.md — Session Log

Newest first. Log what was done, blockers, and next steps.

---

## 2026-09-30 — Phase 6: scoring, rounds, scoreboard, winners

**Done**
- `src/scoring.js` gift-dominant engine (tunable weights) + tests.
- `src/round.js` state machine (countdown/playing/roundEnd/intermission) with auto-loop + tests.
- Game integration: join → team scoring, round lifecycle, winner settlement by combined score,
  per-round reset (territory/marbles/scores) with viewer respawn (cinematic suppressed on reset).
- Live team scoreboard (`src/scoreboard.js`) + round banner; manual Start/End/Auto controls.
- Winners persistence: server store + `/api/winners` routes + client mirror with localStorage.

**Verified**
- `npm run lint` clean · `npm test` 61 passed · `npm run build` ok · `npm run smoke` PASS
  (health + teams + winners + socket).

**Next**
- Phase 7: gift → power-up mappings UI + effect executor.

---

## 2026-09-30 — Phase 5: camera pan/zoom + join cinematic

**Done**
- `Camera` rewritten with focus pan/zoom (exponential easing), cinematic blur, and shake preserved.
- `src/joinCinematic.js`: queue + focus/hold/return state machine + screen-space intro card showing
  the joiner's profile photo, name and team colour.
- Game wires cinematic enqueue on viewer spawn, blur during world draw, and card after restore.
- Debug **Cinematic** section: queue count, blur % slider, Skip Intro.
- Unit tests for the camera tween and cinematic phases (48 total).

**Verified**
- `npm run lint` clean · `npm test` 48 passed · `npm run build` ok · `npm run smoke` PASS.

**Next**
- Phase 6: scoring engine (gift-dominant), live team scoreboard, round lifecycle + winners.

---

## 2026-09-30 — Phase 4: viewer avatar marbles

**Done**
- `src/zones.js` generic N-team zone layout + centroids/spawn tiles (unit tested); grid and map
  refactored to be team-driven.
- `src/viewerManager.js`: chat join → matcher → avatar marble; cap + reinforcement queue with
  swap-on-death; AI fill for empty teams.
- `Marble` gained `teamId`/`viewerId`/`isBot`/`avatar` and circular profile-photo rendering.
- `Game` now sets teams from the registry, builds zones per match, spawns viewer/bot marbles, and
  routes bridge events and deaths.
- Debug **Viewers** panel (active/queued/total + cap and AI-fill controls).

**Verified**
- `npm run lint` clean · `npm test` 43 passed · `npm run build` ok · `npm run smoke` PASS.

**Next**
- Phase 5: camera pan/zoom + join cinematic + blur slider.

---

## 2026-09-30 — Phase 3: teams, flags & i18n

**Done**
- `config/teams.json` (8 default teams) + `server/stores/teamsStore.js` (atomic).
- `server/uploads.js` (magic-byte validation) and `server/httpRoutes.js`
  (`GET/PUT /api/teams`, `POST /api/flags`); refactored `server/index.js` to use it.
- `src/teams.js` pure matcher (number · ISO2 · EN · AR · emoji, fuzzy; Arabic normalization).
- `src/teamRegistry.js` (server sync + localStorage fallback + flag cache),
  `src/imageUtils.js` (3:2 cover-crop), `src/teamsPanel.js` debug **Teams** editor.
- `src/i18n.js` (EN/AR + RTL), language selector, localized primary UI.

**Verified**
- `npm run lint` clean · `npm test` 31 passed · `npm run build` ok · `npm run smoke` PASS
  (health + teams endpoint + socket event).

**Next**
- Phase 4: spawn viewer avatar marbles (photo + name + team colour), active cap + queue, AI fill.

---

## 2026-09-30 — Phase 1: bridge server + auto-connect

**Done**
- Added npm scripts (`dev`/`server`/`client`/`test`/`smoke`/`lint`) and installed the bridge stack
  (`express`, `socket.io`, `socket.io-client`, `tiktok-live-connector`, `ws`); bumped Vite to 8.3.1.
- Built `server/`: `index.js`, `connectionManager`, `directBridge`, `tikfinityBridge`, `normalize`,
  `mock`, and `stores/` (atomic JSON + config).
- Implemented boot-time auto-connect from `.tiktok-config.json` with `auto|direct|tikfinity|mock`.
- Added `src/net/bridgeClient.js` and wired a debug-panel **Connection** + **Mock Event** UI.
- Added ESLint flat config, 14 Vitest unit tests, and a socket smoke test.

**Verified**
- `npm run lint` clean · `npm test` 14 passed · `npm run build` ok · `npm run smoke` PASS.
- `npm audit` → 0 vulnerabilities.

**Next**
- Phase 3: teams/flags model, join-keyword matcher (number · ISO2 · EN · AR · emoji), i18n.

---

## 2026-09-30 — Planning & documentation foundation

**Done**
- Studied the existing `TERRITORY WITH SWORDS` engine and two reference apps
  (`beyblade project`, `draw with viewers`) to choose a rework direction.
- Confirmed all design decisions with the streamer (bridge, teams, flags, avatars,
  scoring, rounds, persistence, tech).
- Authored the full documentation set: README, AGENTS, GUARDRAILS, ARCHITECTURE,
  GAME_DESIGN, BRIDGE, PLANS, TESTING, DECISIONS, HISTORY, CHANGELOG.
- Established code-health guardrails (file limits, separation, security, performance, tests).

**Decisions**
- D-001…D-012 recorded in [DECISIONS.md](./DECISIONS.md).

- Added `.gitignore` and connected the workspace to
  `github.com/ambitious2223/territory-io-countries`, merging the shared history (no force-push)
  and publishing the Territory With Flags tree to `master` (removed the superseded State.io scaffold).

**Next**
- Phase 0: npm scripts (`dev`/`server`/`client`/`test`/`smoke`/`lint`).
- Phase 1: bridge server scaffold + auto-connect + Mock + status UI.
