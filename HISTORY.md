# HISTORY.md — Session Log

Newest first. Log what was done, blockers, and next steps.

---

## 2026-10-04 — Capital slider, layering, autosave (2.5.0)

**Done**
- Capital-size slider (Teams tab, 0.5x–2.5x) persisted as `capitalScale` in the teams config;
  `bases.js` scales the medallion, emoji and name banner from it.
- Render order fixed: balls draw **before** capitals, so fighters sit under the stronghold; event
  text stays topmost.
- Name banner restyled as a dark rounded pill with team-colour border + shadowed bold text.
- `teamRegistry`: split panel/game listener sets, added `setBaseUrl`, debounced auto-save
  (`TEAMS_AUTOSAVE_MS` 1.5 s) with a `beforeunload` flush; saves notify only the game so typed
  text keeps focus and edits appear live in-game. `main.js` switched to `subscribeGame`.

**Verified**
- `npm run lint` clean · `npm test` **100 passed** (capital scale + autosave debounce tests) ·
  build + smoke green.

---

## 2026-10-04 — Fix team-photo upload CORS (2.4.1)

The team picker still did nothing. Root cause: the Express REST API had **no CORS headers**, so a
browser POST from the Vite app (`:1935`) to the bridge (`:3020`) failed at the preflight `OPTIONS`.
Confirmed with a live probe (no `Access-Control-Allow-Origin`). Added an `applyCors` middleware to
`server/index.js`; re-probed — `OPTIONS 204` + ACAO, `POST /api/flags` 200 returning the URL, and
the flag file serves. Added a smoke assertion so it can't regress.

---

## 2026-10-04 — Stronghold photos, ball identity, lean debug menu (2.4.0)

**Done**
- Team-photo upload fixed: `uploadFlag` now notifies, so the team editor + game update live; the
  editor row shows a photo thumbnail and an uploading/error state.
- `src/bases.js`: strongholds drawn as 3D circular medallions with the uploaded photo clipped in
  (emoji fallback). Extracted from `game.js`.
- `marble.js`: balls get a team-colour ring + glow, a light team tint over the avatar, and a
  team-colour nameplate — the TikTok photo stays the fighter, ownership is obvious.
- Debug panel regrouped to **Connection · Teams · Overlay · Advanced** (secondary tools collapsed).

**Verified**
- `npm run lint` clean · `npm test` **96 passed** (new `teamRegistry` test) · build + smoke green.

---

## 2026-10-04 — Hardwired to the Chic Aura Hub (2.3.0)

User asked to hardwire the game to the hub (`C:\dev\windows app interactive for streams`, the
Tikora Electron app): no game-key setup, activating/deactivating stays in the hub.

**Done**
- `server/tikoraIdentity.js` resolves hub identity (env `TIKORA_GAME_*` → `TIKORA_GAME_LAUNCH_URL`
  query → legacy → `.tiktok-config.json` → manifest); `httpRoutes` uses it and drops the `POST`.
- `countriesio.bat` opens `%TIKORA_GAME_LAUNCH_URL%` (falls back to `:1935`).
- `src/main.js` auto-connects from config or `?game=&key=`; debug Tikora tab is read-only
  (`src/debugPanel.js`, `src/ui.js`); removed the manual key/relay inputs + Connect/Disconnect.
- Noted in docs that the hub is a **separate repo** (`ambitious2223/tiktok-games-launcher`).

**Verified**
- `npm run lint` clean · `npm test` **95 passed** (new `tikoraIdentity` tests) · `npm run build`
  OK · `npm run smoke` PASS.

---

## 2026-10-04 — Minimal leaderboard everywhere (2.2.1)

User opened the overlay and found the rows wrapping (a 5-column grid rendered 6 cells) and the
layout hard to read; asked for one minimal leaderboard and no second conquest list.

**Done**
- Overlay rows fixed to a 4-cell grid (`rank · flag · name · %`); removed bar/viewer cells and the
  whole conquest feed column; header/timer now spans the single column width; text-shadow added so
  it reads on white while staying transparent for OBS.
- Removed the **Conquest sidebar from the main game** too; `index.html` is now a two-column layout,
  and the left leaderboard drops the viewer column.
- Deleted `src/feed.js`, the `sidebar.conquest` / `feed.*` i18n strings and the unused `tf()`;
  `overlaySnapshot` no longer emits `feed`/`viewers`.

**Verified**
- `npm run lint` clean · `npm test` **90 passed** · `npm run build` OK · `npm run smoke` PASS.

---

## 2026-10-04 — One-touch capture, clean borders, overlay + debug FAB (2.2.0)

User feedback: the half-convert inset squares looked cluttered and two-hit capture felt wrong;
wanted one touch, a floating draggable debug button, and a styled live leaderboard overlay URL.

**Done**
- **Capture:** one contact claims a tile outright. Removed the convert meter (`grid.convert`) and
  its inset rendering; added a per-tile **hold** (`TILE_HOLD_TIME` ~2.5 s) off a grid clock so
  enemy borders can't flicker. Neutral/enemy handled identically; enemy is "slower to hold" by
  waiting out the hold.
- **Borders:** new pure `src/outline.js` (marching squares + rounded corner strokes); `grid.draw`
  renders one rounded union outline per nation.
- **Feedback:** throttled claim SFX, fewer sparks, `autoFillEnclosures` once per frame per colour;
  ball speed 2.2 → 1.9.
- **Debug UI:** top-bar Debug button replaced by a translucent draggable **FAB** (`debugFab.js`)
  with persisted position/state; panel rebuilt as tabbed workspace (`debugPanel.js`) and moved out
  of `index.html`; `D` hotkey kept.
- **Overlay:** `leaderboard.html` + `src/overlay/*` display-only page (leaderboard + conquest feed
  + timer, URL-param themed). Bridge relays `overlay:state` → `overlay:leaderboard` and caches the
  last snapshot. Shared `buildStandings()`/`buildOverlayPayload()`; Vite multi-page build.

**Verified**
- `npm run lint` clean · `npm test` **90 passed** (new outline/overlay tests) · `npm run build`
  OK (index + leaderboard) · `npm run smoke` PASS incl. overlay relay + cache replay.

---

## 2026-09-30 — Ricochet balls (2.1.0)

Paired with the user's rule: *"every ball, whenever it reaches a new pixel, has to bounce back."*

**Done**
- `marble.js` rewritten from a target-seeking converter to a **confined puck**: straight-line
  motion, axis-aligned **reflection** off any non-owned tile, contact-accumulated conversion,
  bounce jitter, substepping to avoid tunnelling, and rescue to the nearest owned tile if an
  enemy flips the tile under it.
- `grid.js`: added `blocksAt`, `convertOnHit`, `nearestOwnedTile`; pruned the old targeting and
  convert API.
- `config.js`: `CONVERT_HIT_CHUNK` / `CONVERT_ENEMY_HIT_CHUNK` / `BALL_BOUNCE_JITTER` /
  `BALL_MAX_SUBSTEP`; removed the sit-timer constants.
- `game.js` / `debug.js` updated for the new event shape; tests rewritten
  (`tests/convert.test.js`) plus the headless loop test now forces PLAYING and asserts growth.

**Verified**
- `npm run lint` clean · `npm test` **81 passed** · `npm run build` ok · `npm run smoke` PASS.

---

## 2026-09-30 — Conquest redesign (2.0.0)

**Done — all phases**
1. **World:** config rewritten for bases + slow-convert (removed sword/combat/HP constants);
   `zones.js` now lays out spread home bases for 2–12 nations; `grid.js` gained a
   `convert` state array, neutral start and thick nation **borders**.
2. **Balls:** `marble.js` rewritten — no `Sword`/HP/knockback; balls target a spread frontier
   tile, travel, then **slow-convert** it (neutral vs enemy time), with in-progress cancellation
   when contested.
3. **Round:** `game.js` rewritten — base setup, per-nation **elimination**, **territory-only**
   win by tiles, base banners, conquest-feed emission; deleted `combat.js`, `sword.js`,
   `territory.js`, `ai.js`.
4. **Cleanup:** power-ups trimmed to overcharge + colorbomb; gift effects/UI/manifest/JSON drop
   `shield`/`heal`; audio loses hit/deflect/interruption/sweep; `utils.js` and `analytics.js`
   trimmed of dead combat helpers.
5. **Presentation:** `scoreboard.js` territory-first with crown + eliminated state; new
   `feed.js` + right-sidebar Conquest feed (EN/AR); base banners on canvas.
6. **Verify:** new base/convert tests + a headless game-loop test; lint clean; **80 tests pass**; build ok; smoke PASS.

**Status:** shipped as **2.0.0**. Open follow-ups: a visual/browser pass, real Direct connect,
and a Tikora relay test.

---

## 2026-09-30 — Docs/code reconciliation (1.0.1)

**Done**
- Confirmed Tikora is implemented **client-side** (`src/tikora.js` + `tikoraClient.js` load Tikora's
  `hub-client.js`), not as a bridge chat source; `connectionManager` only handles
  `auto | direct | tikfinity | mock`.
- Removed the phantom `tikora` mode from `server/constants.js` `MODES`.
- Aligned docs with code: README status, AGENTS (fixed decisions + architecture), ARCHITECTURE
  (diagram + module tables + persistence), BRIDGE (sources/modes/API/Tikora section), TESTING
  (coverage + QA), and DECISIONS (D-003 refined, D-022 added).
- Released **1.0.1**.

**Verified**
- `npm run lint` clean · `npm test` 73 passed · `npm run smoke` PASS.

---

## 2026-09-30 — Phase 9: polish & release 1.0.0

**Done**
- Added synthesized join + gift SFX; join sound on viewer spawn.
- Debug **All-Time Winners** panel and **Scoring Weights** editor (live tuning).
- Performance: shared per-frame tile-count map consumed by the scoreboard and domination check.
- Finalised docs; released CHANGELOG **1.0.0**.

**Verified**
- `npm run lint` clean · `npm test` 73 passed · `npm run build` ok · `npm run smoke` PASS.

**Status:** all planned phases (0–9) complete. Open follow-ups: real-stream verification, Tikora
relay test, and optional dirty-tile caching if a larger arena is ever needed.

---

## 2026-09-30 — Phase 8: TikFinity tab + Tikora hub

**Done**
- TikFinity host/port inputs wired into the Connect panel.
- `tikora.manifest.json` (8 declared effects) + `src/tikoraClient.js` (loads `hub-client.js`) +
  `src/tikora.js` (`TikoraHub`: connect, capabilities, effect routing, ack).
- Refactored `giftEffects.js` to expose `executeEffect(game, key, params, target)` shared by gifts
  and Tikora.
- `GET/POST /api/tikora/config`; config persisted in `.tiktok-config.json`; auto-connect on boot
  when enabled; debug **Tikora Hub** panel.

**Verified**
- `npm run lint` clean · `npm test` 73 passed · `npm run build` ok · `npm run smoke` PASS.

**Next**
- Phase 9: polish (VFX/SFX, perf pass), winners HUD, scoring-weight sliders, docs finalise.

---

## 2026-09-30 — Phase 7: gift → power-up mappings

**Done**
- `config/mappings.json` defaults, `server/stores/mappingsStore.js`, `GET/PUT /api/mappings`.
- `src/mappings.js` pure matcher (`giftName`/`giftId`/`minCoins`, first-match) + client store
  `src/mappingsStore.js` with localStorage fallback.
- `src/giftEffects.js` registry + executor (8 effects) targeting the gifter's team marble.
- Game wiring: gift events run `matchMapping` → `executeGiftEffect`.
- Debug **Content** mappings editor; tests for matcher + executor.

**Verified**
- `npm run lint` clean · `npm test` 69 passed · `npm run build` ok · `npm run smoke` PASS
  (health + teams + winners + mappings + socket).

**Next**
- Phase 8: TikFinity Connect sub-tab + Tikora hub (manifest + relay).

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
