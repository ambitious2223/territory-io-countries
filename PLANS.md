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
- [x] `src/scoring.js` (gift-dominant, tunable via `setWeights`)
- [x] Live team scoreboard (DOM, flag/emoji + territory % + score)
- [x] Round state machine (`src/round.js`) + auto-loop + manual Start/End/Auto
- [x] Winners persistence (`stores/winnersStore` + `/api/winners`, client mirror)
- [~] In-app winners HUD/admin and scoring-weight sliders (engine supports them; UI pending)

**Verify:** a timed round ends, correct winner, auto-resets; manual end/next work.

---

## Phase 7 — Gift → power-up mappings
- [x] `stores/mappingsStore` + `config/mappings.json` + `GET/PUT /api/mappings`
- [x] Content-tab mappings editor (gift name / min coins → effect) + Add/Save
- [x] `giftEffects.js` executor with 8 effects (overcharge, shield, boost, heal, colorbomb, area-convert, spawn, instant-claim)
- [x] Game wiring: matching gift triggers the effect for the gifter's team

**Verify:** map a gift to an effect; sending it triggers the effect; params respected.

---

## Phase 12 — Clean capture, debug workspace, overlay
- [x] One-touch capture; convert meter + inset rendering removed
- [x] Post-capture **hold** (`TILE_HOLD_TIME`) so borders can't flicker; freshness tint
- [x] Rounded union nation outlines via `src/outline.js` (marching squares)
- [x] Quieter feedback: throttled claim SFX, fewer sparks, one enclosure-fill pass per frame
- [x] Draggable translucent debug **FAB** + tabbed debug workspace (`debugPanel.js`/`debugFab.js`)
- [x] Live **leaderboard overlay** at `/leaderboard.html` over a bridge relay (`overlay:state`);
      `buildStandings()`/`buildOverlayPayload()`; Vite multi-page build
- [x] Tests (outline/overlay/convert), lint/test/build/smoke green; released **2.2.0**

**Verify:** one touch flips a tile and no half-convert squares appear; the FAB drags/opens; the
overlay URL renders the live leaderboard + feed + timer in a second browser source.

---

## Phase 11 — Ricochet confinement
- [x] Balls are confined to their nation and **reflect** off neutral/enemy borders
- [x] Contact-accumulated conversion (no sit-timer, no pathfinding)
- [x] Bounce jitter, substep anti-tunnel, trapped-ball rescue; ball-ball collisions off
- [x] Grid `blocksAt`/`convertOnHit`/`nearestOwnedTile`; dead targeting API pruned
- [x] Tests updated; lint/test/build/smoke green; released **2.1.0**

**Verify:** balls never leave their colour, borders stay crisp, and hitting the border converts it.

---

## Phase 10 — Conquest redesign
- [x] Neutral arena + spread **home bases**; thick nation **borders**
- [x] **Slow-convert** capture (adjacent tiles), contested-tile cancellation
- [x] Remove swords/HP/knockback/kills; territory is the only conflict
- [x] **Conquerable** bases with per-nation **elimination**
- [x] **Win by land** (most territory / 65% domination)
- [x] Nation scoreboard + **Conquest feed** + base banners (EN/AR)
- [x] Mappings/manifest/gift effects reconciled; dead modules removed
- [x] Tests for base layout + slow-convert; lint/test/build/smoke green; released **2.0.0**

**Verify:** nations expand from their bases, borders creep and get eaten, a wiped nation is
eliminated, and the land leader wins at time-up.

---

## Phase 8 — TikFinity & Tikora tabs
- [x] `tikfinityBridge.js` (ws 21213) + mode routing (done in Phase 1)
- [x] TikFinity host/port fields in the Connect panel
- [x] `tikora.manifest.json` + `src/tikora.js` hub client (loads `hub-client.js`, routes effects)
- [x] `/api/tikora/config` (env + saved config) and auto-connect when enabled
- [x] Debug **Tikora Hub** panel (key, relay, status, connect/disconnect)

**Verify:** each source independently drives the game; fallback works.

---

## Phase 9 — Polish & hardening
- [x] Interaction SFX (join, gift); capture/victory audio already present; join intro card VFX
- [x] Performance pass: shared per-frame tile-count map (scoreboard + domination)
- [x] Winners HUD (All-Time Winners) + scoring-weight editor in the debug panel
- [x] Full test + smoke coverage; ESLint clean
- [x] Docs finalised; CHANGELOG released as **1.0.0**

**Verify:** 60 FPS with cap reached; all gates green.

---

## Stretch goals
- [ ] Team-vs-team multi-streamer relay (two bridged chats)
- [ ] Leaderboard persistence across sessions (already via winners store)
- [ ] Additional map presets and animated flag idle effects
- [ ] OBS theme packs / transparency presets
```
