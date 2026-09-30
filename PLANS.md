# PLANS.md — Roadmap

Phased delivery. Each phase ends with a **verification** step; a phase is done only when lint,
tests and smoke pass and the feature is confirmed in the running game (or Mock mode).

Legend: `[x]` done · `[ ]` todo · `[~]` in progress.

---

## Phase 0 — Documentation & repo (current)
- [x] Author full docs set (README, AGENTS, GUARDRAILS, ARCHITECTURE, GAME_DESIGN, BRIDGE, PLANS, TESTING, DECISIONS, HISTORY, CHANGELOG)
- [x] Define fixed decisions and guardrails
- [ ] Connect workspace to `ambitious2223/territory-io-countries` and publish `main`
- [ ] Add `.gitignore`, npm scripts (`dev`/`server`/`client`/`test`/`smoke`/`lint`)

**Verify:** docs render on GitHub; `npm run dev` still boots the existing game.

---

## Phase 1 — Bridge server scaffold + auto-connect
- [ ] `server/index.js` (Express + Socket.IO + static), `/health`
- [ ] `connectionManager` with modes + retries + fallback
- [ ] `directBridge` (`tiktok-live-connector`)
- [ ] `server/mock.js` + `/api/mock-event`
- [ ] `src/net/bridgeClient.js` + status UI in the debug Connect tab
- [ ] Auto-connect on boot from `.tiktok-config.json`

**Verify:** with no username, Mock events reach the browser; with a username, status = `live`.

---

## Phase 2 — Event normalization
- [ ] `normalize.js`: unified schema, like-delta, gift combo/dedupe, user extraction
- [ ] Chat/gift/like/follow/share/member from Direct
- [ ] Bounded dedupe set + rate-limit helpers

**Verify:** unit tests for normalize; live chat/gift appear correctly.

---

## Phase 3 — Teams, flags & i18n
- [ ] `src/teams.js` model + `config/teams.json`
- [ ] Join-keyword matcher (number · ISO2 · EN · AR · emoji, fuzzy)
- [ ] `stores/teamsStore` + `uploadRoutes` + flag upload helper (3:2)
- [ ] `src/flags.js` image cache
- [ ] `src/i18n.js` (EN/AR + RTL) and debug **Teams** tab

**Verify:** upload a flag, type each keyword variant, correct team resolves.

---

## Phase 4 — Viewer avatars
- [ ] Spawn avatar marble per viewer (photo + name + team colour)
- [ ] Active cap (24) + reinforcement queue + swap-on-death
- [ ] AI fill for thin teams
- [ ] Per-viewer analytics

**Verify:** 30 mock joins → 24 active, 6 queued; one dies → a queued viewer spawns.

---

## Phase 5 — Camera & join cinematic
- [ ] Extend `Camera` with pan/zoom/tween
- [ ] `joinCinematic.js` queue + intro card
- [ ] Blur % slider in debug Diagnostics tab
- [ ] HUD stays screen-space

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
- [ ] `tikfinityBridge.js` (ws 21213) + Connect sub-tab
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
