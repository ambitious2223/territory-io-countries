# PLANS.md — Roadmap

Phased delivery. Each phase ends with a **verification** step; a phase is done only when lint,
tests and smoke pass and the feature is confirmed in the running game (or Mock mode).

Legend: `[x]` done · `[ ]` todo · `[~]` in progress.

---

## Phase 0 — Documentation & repo
- [x] Author full docs set (README, AGENTS, GUARDRAILS, ARCHITECTURE, GAME_DESIGN, BRIDGE, PLANS, TESTING, DECISIONS, HISTORY, CHANGELOG)
- [x] Define fixed decisions and guardrails
- [x] Connect workspace to `ambitious2223/territory-io-countries` and publish `master`
- [x] Add `.gitignore`
- [x] Add npm scripts (`dev`/`server`/`client`/`test`/`smoke`/`lint`)
- [x] Toolchain: Vite 8, Vitest, ESLint flat config, `@eslint/js`; 0 audit vulnerabilities

**Verify:** docs render on GitHub; `npm run dev` still boots the existing game.

---

## Phase 1 — Bridge server scaffold + auto-connect
- [x] `server/index.js` (Express + Socket.IO + static), `/health`
- [x] `connectionManager` with modes + retries + fallback
- [x] `directBridge` (`tiktok-live-connector`)
- [x] `tikfinityBridge` (ws `21213`) + mode routing
- [x] `server/mock.js` + `/api/mock-event`
- [x] `src/net/bridgeClient.js` + status UI in the debug Connect tab
- [x] Auto-connect on boot from `.tiktok-config.json`

**Verify:** with no username, Mock events reach the browser; with a username, status = `live`.

---

## Phase 2 — Event normalization
- [x] `normalize.js`: unified schema, like-delta, gift combo/dedupe, user extraction
- [x] Chat/gift/like/follow/share/member from Direct + TikFinity
- [~] Bounded dedupe set done; rate-limit helpers pending

**Verify:** unit tests for normalize; live chat/gift appear correctly.

---

## Phase 3 — Teams, flags & i18n
- [x] `src/teams.js` model + `config/teams.json` (8 default teams)
- [x] Join-keyword matcher (number · ISO2 · EN · AR · emoji, fuzzy)
- [x] `stores/teamsStore` + `httpRoutes` (`GET/PUT /api/teams`, `POST /api/flags`) + 3:2 upload helper
- [x] Flag image cache (`teamRegistry.js`) + `imageUtils.js` cover-crop
- [x] `src/i18n.js` (EN/AR + RTL), translation pass on primary UI, debug **Teams** + **Language** tabs

**Verify:** upload a flag, type each keyword variant, correct team resolves.

---

## Phase 4 — Viewer avatars
- [x] Generic N-team zone layout (`src/zones.js`) driving grid colours + spawn points
- [x] Spawn avatar marble per viewer (photo + name + team colour) via `ViewerManager`
- [x] Active cap (24) + reinforcement queue + swap-on-death
- [x] AI fill for thin teams (seeds/respawns a bot when a team has no marble)
- [x] Per-viewer analytics (each viewer marble registered; kills tracked)
- [x] Debug **Viewers** panel (active/queued/total, cap + AI-fill controls)

**Verify:** 30 mock joins → 24 active, 6 queued; one dies → a queued viewer spawns.

---

## Phase 5 — Camera & join cinematic
- [x] Extend `Camera` with pan/zoom/tween (exponential focus easing + blur)
- [x] `joinCinematic.js` queue + profile-photo intro card (focus → hold → return)
- [x] Blur % slider + Skip Intro in the debug **Cinematic** section
- [x] HUD stays screen-space (world blurred under the camera transform only)

**Verify:** each join pans/zooms to spawn; blur slider changes backdrop; 60 FPS holds.

---

## Phase 6 — Scoring & rounds
- [ ] `src/scoring.js` (gift-dominant, tunable)
- [ ] Live team scoreboard (DOM)
- [ ] Round state machine + auto-loop + manual override
- [ ] `stores/winnersStore` + winners HUD/admin

**Verify:** a timed round ends, correct winner, auto-resets; manual end/next work.

---

## Phase 7 — Gift → power-up mappings
- [ ] `stores/mappingsStore` + `config/mappings.json`
- [ ] Content-tab mappings editor (trigger → effect + params)
- [ ] `giftEffects.js` executor + new effects (area-convert, boost, freeze, spawn, giant/shrink, instant-claim)

**Verify:** map a gift to an effect; sending it triggers the effect; params respected.

---

## Phase 8 — TikFinity & Tikora tabs
- [x] `tikfinityBridge.js` (ws 21213) + mode routing (done in Phase 1)
- [ ] TikFinity Connect sub-tab
- [ ] `tikora.manifest.json` + `tikoraHub.js` + Connect sub-tab
- [ ] `/api/tikora/config` env resolution

**Verify:** each source independently drives the game; fallback works.

---

## Phase 9 — Polish & hardening
- [ ] Interaction VFX/SFX (join, gift, kill, capture, victory)
- [ ] Performance pass (dirty tiles, pooling, batching)
- [ ] Full test + smoke coverage; ESLint clean
- [ ] Docs finalised; CHANGELOG released

**Verify:** 60 FPS with cap reached; all gates green.

---

## Stretch goals
- [ ] Team-vs-team multi-streamer relay (two bridged chats)
- [ ] Leaderboard persistence across sessions (already via winners store)
- [ ] Additional map presets and animated flag idle effects
- [ ] OBS theme packs / transparency presets
```
