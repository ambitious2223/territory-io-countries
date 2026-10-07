# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project aims to follow [Semantic Versioning](https://semver.org/).

## [2.5.0] - 2026-10-04

### Added
- **Capital size slider** (Debug → Teams): scales every stronghold medallion and its name banner
  from 0.5x to 2.5x (default 1.0x), persisted in the teams config (`capitalScale`).
- **Auto-save for teams**: any edit (name, colour, ISO, photo, capital size, add/remove team) is
  saved to `/api/teams` automatically **1.5 s** after the last change, with a flush on page close.
  The Save button remains as an instant save.

### Changed
- **Render layering**: strongholds now draw **above the balls** (fighters) and below floating event
  text — a capital is never covered by its own units.
- **Capital name banner** restyled: rounded dark pill with a team-colour border and bold white
  shadowed text, scaling with the capital slider.
- Team registry now keeps **panel listeners** (debug UI re-render) separate from **game listeners**:
  auto-saves update the running game live without stealing focus from the text fields.

## [2.4.1] - 2026-10-04

### Fixed
- **Team photo upload from the browser.** The Express REST API sent **no CORS headers**, so the
  app on `:1935` was blocked at preflight when posting to the bridge on `:3020` — choosing a file
  did nothing. Added a CORS middleware (`Access-Control-Allow-Origin` for allowed origins, handles
  `OPTIONS`) and a smoke assertion. This also unblocks the cross-origin teams/mappings/winners REST
  calls in dev (previously masked by localStorage fallbacks).

## [2.4.0] - 2026-10-04

### Added
- **Team photos in the stronghold.** Bases render as a **3D circular medallion** (radial-gradient
  disc, drop shadow, specular highlight, bright rim) with the uploaded team photo clipped inside;
  the emoji/letter is the fallback. Extracted to `src/bases.js`.
- **Ball team identity.** Each viewer ball now shows the TikTok avatar with a **team-colour ring +
  glow**, a **light team tint** (~22 %) on the photo, and a **team-colour nameplate** above it, so
  ownership is unmistakable while the face still reads.

### Fixed
- **Team-photo upload now updates live.** `uploadFlag` notifies subscribers after saving, so the
  editor and the running game refresh immediately (previously the new flag only appeared after a
  reload). The team row shows a thumbnail of the saved photo and an uploading/error state.

### Changed
- **Debug menu simplified.** Tabs are now **Connection · Teams · Overlay · Advanced**. The bulk of
  the tools (Mock, Viewers, Cinematic, Scoring, Winners, Gift Mappings, Performance, Particles,
  Tile Ownership) moved into a collapsed **Advanced** tab.

## [2.3.0] - 2026-10-04

### Changed
- **Hardwired to the Chic Aura Hub (Tikora).** The game resolves its hub slug/key/relay
  automatically — `TIKORA_GAME_SLUG` / `TIKORA_GAME_KEY` / `TIKORA_RELAY_URL` env, the
  `TIKORA_GAME_LAUNCH_URL` (`?game=&key=`) query, legacy `TIKORA_*`, saved config, then the
  manifest slug — and connects on boot. **No game key is pasted anywhere.**
- `countriesio.bat` opens `%TIKORA_GAME_LAUNCH_URL%` when the hub provides it (falls back to
  `http://localhost:1935`), so the hub's launch URL reaches the browser.
- The debug **Tikora** tab is **read-only** (status, game slug, relay). Activating/deactivating and
  mapping effects stay in the hub.

### Removed
- In-game Tikora key/relay inputs and Connect/Disconnect buttons; `POST /api/tikora/config`
  (`GET` now returns the resolved identity).

### Added
- `server/tikoraIdentity.js` (`resolveTikoraIdentity`, `parseLaunchUrl`) + tests.

## [2.2.1] - 2026-10-04

### Changed
- **Leaderboard overlay is now a single minimal leaderboard.** Rows are `rank · flag · name · %`
  only; the conquest feed column, the colour bar and the viewer count are gone. The header (state +
  timer) is fixed to the same width as the list, so the timer aligns with the column.
- Overlay stays **transparent by default** (OBS-ready) and now carries a text shadow so it reads on
  a white browser background too. `feed` URL param removed.
- **Conquest sidebar removed from the main game window** as well — the right-hand feed is gone and
  the canvas takes the space. The left leaderboard is reduced to `rank · flag · name · %`.
- Overlay payload no longer includes `feed` or `viewers`.

### Removed
- `src/feed.js` (`ConquestFeed`) and its i18n strings (`sidebar.conquest`, `feed.*`), plus the now
  unused `tf()` translation helper.

## [2.2.0] - 2026-10-04

### Changed
- **One-touch capture.** Any contact claims a tile outright — neutral or enemy. The two-hit
  convert meter (and its floating inset-square rendering, the main visual clutter) is gone.
- **Post-capture hold.** A freshly claimed tile is hardened for `TILE_HOLD_TIME` (~2.5 s) so a
  contested border can't flicker; the enemy must wait it out before retaking. A subtle freshness
  tint fades as the hold expires.
- **Rounded union outlines.** Nation borders are now traced with marching squares
  (`src/outline.js`) and stroked as one continuous rounded path instead of per-tile seams.
- **Quieter feedback.** Claim SFX is throttled and sparks reduced; enclosure fill runs once per
  frame per changed colour instead of per hit. Ball speed nudged to 1.9 px/frame.

### Added
- **Floating draggable debug button (FAB)** replaces the top-bar Debug button. Translucent,
  repositionable, click to open/close; position + open state persist. The `D` hotkey still works.
- **Tabbed debug panel** (Connection / Players / Content / Match / System) rebuilt in
  `src/debugPanel.js` + `src/debugFab.js`; markup moved out of `index.html`.
- **Live leaderboard overlay** at `/leaderboard.html` — standalone OBS browser-source page showing
  leaderboard, conquest feed and round timer, with URL params (`rows`, `feed`, `theme`, `bg`,
  `rtl`, `scale`). Served over a new bridge relay (`overlay:state` → `overlay:leaderboard`) with
  the last snapshot cached for late connections. Copy/Open link in the debug System tab.

### Removed
- `Grid` convert state (`convert[][]`, chunk constants) and the per-tile border renderer.

## [2.1.0] - 2026-09-30

### Changed
- **Balls are now confined pucks that ricochet off the border.** A ball never leaves its nation:
  any tile it does not own (neutral, enemy or wall) is solid, so it claims on contact and bounces
  back (axis-aligned reflection + a small angle jitter). This keeps every territory self-contained
  with crisp borders instead of ragged tendrils.
- Capture is now **accumulated contacts**: each bump adds a chunk to the tile's convert meter
  (`0.5` neutral, `0.2` enemy); the last nation to hit a contested tile takes the meter over.
  Faster balls and more balls convert faster.
- Removed target pathfinding, spread-target reservation and the sit-to-convert timer; a ball
  stranded by a flip is snapped to its nearest owned tile. Ball-ball collisions remain off.

### Removed
- `Grid` targeting helpers (`getFrontierTiles`, neighbour counts, `setConvert`/`getConvert`/
  `clearConvert`, `isOwnedBy`, `getTileType`, `isValidSpawn`, `getTileAtWorld`, `paintAtWorld`) —
  replaced by `blocksAt`, `convertOnHit` and `nearestOwnedTile`.

## [2.0.0] - 2026-09-30

### Changed
- **Conquest redesign.** The arena now starts **neutral** with one compact **home base** per
  nation; each viewer is a single **ball** that pours out and **slow-converts** adjacent tiles, so
  borders creep forward and get eaten back. More balls and higher movement/conversion speed =
  faster expansion.
- Rounds are now won by **most territory** at time-up (or an immediate **65% domination**),
  instead of a combined interaction score.
- A nation whose tile count reaches **0 is eliminated** and stops spawning for the round
  (conquerable home bases — a last stand, not a safe haven).
- HUD: nation **scoreboard** now shows territory % and active balls with a leader crown; added a
  live right-side **Conquest feed**; on-canvas **base banners** and thick nation **borders**.

### Removed
- Swords, HP, knockback, kills and PvP damage — `src/sword.js`, `src/combat.js`,
  `src/territory.js` (conversion waves) and `src/ai.js` are gone. The mappings UI, Tikora manifest
  and `config/mappings.json` drop the now-meaningless `shield`/`heal` effects.

### Added
- `src/feed.js` — the Conquest feed (joins, eliminations, winner) with EN/AR strings.
- `Grid` slow-convert API (`setConvert`/`getConvert`/`clearConvert`) and nation-border rendering.
- `src/zones.js` now generates spread **home-base** layouts for 2–12 nations.
- Unit tests for base layout and ball slow-convert (`tests/zones.test.js`, `tests/convert.test.js`)
  plus a headless game-loop smoke test (`tests/runtime.test.js`).

## [1.0.1] - 2026-09-30

### Fixed
- Removed the phantom `tikora` value from `server/constants.js` `MODES`; the bridge chat sources are
  `auto | direct | tikfinity | mock`. Previously a `tikora` mode silently fell back to Direct.

### Changed
- Reconciled docs with shipped behaviour: **Tikora is a client-side effect hub**, not a bridge chat
  source (updated README, AGENTS, ARCHITECTURE, BRIDGE, TESTING and DECISIONS; added D-022).
- Corrected stale module/file references (module responsibility tables, TESTING coverage list,
  repository maps, persistence stores).

## [1.0.0] - 2026-09-30

### Added
- Full documentation set: README, AGENTS, GUARDRAILS, ARCHITECTURE, GAME_DESIGN, BRIDGE,
  PLANS, TESTING, DECISIONS, HISTORY, CHANGELOG.
- Code-health guardrails (file limits, separation of concerns, security, performance, testing).
- Bridge server (`server/`): Express + Socket.IO with `/health`, `/api/mock-event`, static
  serving, and **boot-time auto-connect** from `.tiktok-config.json`.
- `connectionManager` with `auto | direct | tikfinity | mock` modes, retries and fallback.
- `directBridge` (`tiktok-live-connector`) and `tikfinityBridge` (`ws://127.0.0.1:21213`).
- `server/normalize.js`: unified event schema, like-delta reconstruction, gift combo skip and
  `msgId` dedupe, tolerant user extraction.
- Client `src/net/bridgeClient.js` (socket.io-client) and debug-panel **Connection** + **Mock Event** sections.
- Tooling: ESLint flat config, Vitest unit tests, and a socket end-to-end smoke test.
- Scripts: `dev`, `server`, `client`, `test`, `smoke`, `lint`.
- Teams & flags: `config/teams.json` default roster (8), `server/stores/teamsStore.js`, and
  `GET/PUT /api/teams` + `POST /api/flags` routes with magic-byte image validation.
- `src/teams.js` pure join-keyword matcher (team number · ISO2 · English · Arabic · flag emoji, fuzzy).
- `src/teamRegistry.js` (server sync + localStorage fallback + flag image cache) and
  `src/imageUtils.js` 3:2 cover-crop for consistent flag uploads.
- Debug panel **Teams** editor (add/remove, EN/AR names, ISO2, colour, flag upload).
- `src/i18n.js` — English + Arabic with RTL; language selector; primary UI localized.
- Teams-driven arena: `src/zones.js` generates contiguous zones for any team count (2–12),
  driving grid colours and spawn points; `map.js` clears spawns around team centroids.
- Viewer avatars: `src/viewerManager.js` turns chat join commands into avatar marbles with
  profile photos, team colours and names; hard cap (~24) with a reinforcement queue that swaps
  in on death; AI fill seeds a bot for any team without a marble.
- Marble avatar rendering (circular profile photo, colour fallback) and per-viewer fields.
- Debug **Viewers** section (active/queued/total, cap + AI-fill toggles).
- Camera pan/zoom with exponential focus easing and cinematic blur; HUD remains screen-space.
- `src/joinCinematic.js` — queued join intros that pan/zoom to a new viewer with a profile-photo
  card (focus → hold → return), plus a debug **Cinematic** section (blur % slider, Skip Intro).
- `src/scoring.js` — gift-dominant scoring engine (gifts, likes, unique comments, follows, shares,
  territory) with tunable weights and a combined leaderboard.
- `src/round.js` — round state machine (countdown → playing → end → intermission) with auto-loop
  and manual start/end; wired into the game loop.
- Live team scoreboard (flag/emoji, territory %, combined score) and a round-state banner.
- Manual **Start / End / Auto** round controls in the control bar.
- Winners persistence: `server/stores/winnersStore.js` + `GET/POST/DELETE /api/winners` and a
  client mirror (`src/winnersStore.js`) with localStorage fallback; winners saved on round end.
- Gift → power-up mappings: `config/mappings.json` defaults, `server/stores/mappingsStore.js` +
  `GET/PUT /api/mappings`, pure `matchMapping` (`src/mappings.js`), and a client store
  (`src/mappingsStore.js`) with localStorage fallback.
- `src/giftEffects.js` executor with eight effects (overcharge, shield, boost, heal, colorbomb,
  area-convert, spawn ally, instant-claim); matching gifts trigger the effect for the gifter's team.
- Debug **Content — Gift Mappings** editor (enable, gift name, min coins, effect, add/remove, save).
- TikFinity host/port fields in the Connect panel (mode routing already supported).
- Tikora hub integration: `tikora.manifest.json` declares the game's effects; `src/tikoraClient.js`
  loads Tikora's `hub-client.js`; `src/tikora.js` connects the relay, advertises capabilities,
  routes effects via the shared executor and acknowledges them.
- `GET/POST /api/tikora/config` (env `TIKORA_SLUG`/`TIKORA_KEY`/`TIKORA_RELAY_URL` + saved config)
  with **auto-connect** when enabled; debug **Tikora Hub** panel (key, relay, status).
- Interaction audio: synthesized **join** blip and **gift** sparkle; join also plays on viewer spawn.
- Debug **All-Time Winners** panel and **Scoring Weights** editor (live-updates `ScoringEngine`).
- Performance: one shared per-frame tile-count map reused by the scoreboard and domination check
  (removes repeated per-marble `countTiles` scans).

### Changed
- Project re-scoped from "Territory With Swords" (local AI battle) to
  **Territory With Flags** — a TikTok-LIVE team/flag territory-conquest game.
- Bumped Vite to `8.3.1`; added `express`, `socket.io`, `socket.io-client`,
  `tiktok-live-connector`, `ws`. `npm audit` now reports **0 vulnerabilities**.

### Fixed
- Removed pre-existing unused imports/args flagged by the new linter.

## [0.1.0] - 2026-09-30
### Added
- Initial planning and design baseline for the TikTok-integrated rework.
- Confirmed architecture: Vite + vanilla-JS canvas frontend (:1935) and a Node bridge
  server (:3020) with Direct / TikFinity chat sources; Tikora integrated as an effect hub.
