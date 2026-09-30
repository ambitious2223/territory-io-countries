# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project aims to follow [Semantic Versioning](https://semver.org/).

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
