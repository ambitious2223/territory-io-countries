# ARCHITECTURE.md — Territory With Flags

## 1. System overview

```
┌──────────────────────────────────────────────────────────────────┐
│ OBS browser source / browser (:1935)                             │
│   Canvas engine (grid, bases, balls, borders, particles)         │
│   DOM HUD (leaderboard, timer, debug panel, i18n)                │
│   net/bridgeClient.js ── socket.io-client ──┐                    │
└─────────────────────────────────────────────┼────────────────────┘
                                              │ tiktok-event / tiktok:status
┌─────────────────────────────────────────────▼────────────────────┐
│ Bridge server (:3020) — Node + Express + Socket.IO              │
│   connectionManager  (auto | direct | tikfinity | mock)          │
│   directBridge · tikfinityBridge · httpRoutes · uploads          │
│   normalize (one event schema)                                   │
│   stores/ (config, teams, winners)                                │
└──────────────────────────────────────────────────────────────────┘
        ▲ ws 127.0.0.1:21213 (TikFinity)

  Tikora (client-side): src/tikora.js loads hub-client.js
        ▲ ws 127.0.0.1:27016 — effects only, not chat
```

- No TikTok OAuth or API key required — username-based connection.
- The frontend is a static Vite bundle; the server also serves `dist/` for production.
- The server is the only component that talks to TikTok for **chat events**. The client is
  source-agnostic. Tikora is a **client-side effect hub**, not a bridge source (see BRIDGE.md §6).

---

## 2. Stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML5 Canvas 2D, vanilla JS (ES modules) |
| Audio | Web Audio API (procedural synthesis) |
| Bundler | Vite |
| Bridge | Node.js, Express, Socket.IO, `tiktok-live-connector`, `ws` |
| Persistence | Atomic JSON stores (+ localStorage fallback) |

---

## 3. Frontend modules

| Module | Responsibility |
| --- | --- |
| `main.js` | Bootstrap: create `Game`, connect bridge client, init panels, start loop |
| `game.js` | Loop, round state machine, base setup, elimination, rendering orchestration, input |
| `config.js` | All tunable constants (canvas, grid, convert, camera, scoring, cinematic) |
| `grid.js` | Tile ownership, one-touch capture + hold, shield, claimFrontier, containment |
| `map.js` | Wall/map generation |
| `zones.js` | Home-base layout for N nations (2–12) + centroids/spawn tiles |
| `marble.js` | Viewer ball: confined ricochet + capture; numeric `speedMult` overcharge; avatar with team ring/glow/tint/nameplate |
| `bases.js` | Stronghold rendering: scaled 3D medallion + team photo + name pill |
| `outline.js` | Marching-squares union outline + rounded-corner path (pure) |
| `powerups.js` | Power-up entities and pickup logic |
| `particles.js` | Pooled spark/trail particles |
| `vfx.js` | Floating event text |
| `audio.js` | Procedural panned SFX (join, gift, claim, elimination) + delegating win-audio methods |
| `celebrationAudio.js` | Procedural win sounds: confetti, reveal, podium bells, drumroll, crowd + per-nation anthems |
| `winScreen.js` | Full-screen win celebration: animated entrance, reason/stats, podium, intermission countdown |
| `winArt.js` | Win-screen canvas drawing helpers (medallion, rays, flag backdrop, supporter) |
| `confetti.js` | Pooled confetti (burst + rain, flag-clipped pieces, gravity/sway) |
| `cameraControls.js` | Streamer `ManualCamera` (click/follow/wheel/drag/arrows, presets) |
| `analytics.js` | Round duration tracking |
| `renderer.js` | Camera (pan/zoom/shake) + shared draw helpers |
| `viewerManager.js` | Viewer/bot roster, active cap + reinforcement queue |
| `ui.js` | DOM HUD, control bar, debug panels, game-over, i18n wiring |
| `debugPanel.js` | Builds the floating tabbed debug panel (Connection/Camera/Teams/Overlay/Advanced) |
| `cameraPanel.js` | Camera tab: Arena/Leader/nation presets + live per-viewer follow buttons |
| `debugFab.js` | Draggable debug FAB, tab switching, overlay-link copy |
| `teams.js` | Team model + join-keyword matcher (pure) |
| `teamRegistry.js` | Team sync via `/api/teams`, localStorage, flag images, capitalScale, debounced auto-save |
| `teamsPanel.js` | Teams editor UI |
| `scoring.js` | Interaction → score engine (pure) |
| `round.js` | Round lifecycle state machine |
| `scoreboard.js` | `buildStandings()` + team scoreboard rendering |
| `overlaySnapshot.js` | Builds the serialisable leaderboard payload for the overlay |
| `overlay/overlayModel.js` | Pure overlay row model + change signature (rank/crown/flag/percent) |
| `overlay/leaderboard.js` | Standalone OBS leaderboard page (bridge subscriber; in-place DOM updates, no engine) |
| `winnersStore.js` | Winners persistence + sync |
| `joinCinematic.js` | Camera intro queue for new joiners (tracks the moving soldier) |
| `joinPrompt.js` | "Pick a side" pop-up + held-effect queue for non-member gifters |
| `giftEffects.js` | Gift → power-up effect executor (runs as the activator's identity) + built-in coin-scaled gift speed burst |
| `giftTuning.js` | Gift-speed tuning (sec/coin, max sec, max mult, coins-to-max) load/save/apply |
| `giftPanel.js` | Debug "Gift Speed" inputs wired to `giftTuning` |
| `tikora.js` | Tikora effect hub (manifest + served `hub-client.js`); auto-connects, hub-driven |
| `tikoraClient.js` | Loads Tikora's `hub-client.js` over the relay |
| `imageUtils.js` | Image load + 3:2 cover-crop |
| `utils.js` | Shared helpers |
| `net/bridgeClient.js` | Socket transport + connection status |
| `i18n.js` | EN/AR dictionaries + `t()` |

---

## 4. Bridge server modules

| Module | Responsibility |
| --- | --- |
| `server/index.js` | Express + Socket.IO + static + boot-time auto-connect |
| `connectionManager.js` | Source selection (`auto/direct/tikfinity/mock`), retries, fallback |
| `directBridge.js` | `tiktok-live-connector` connection + raw listeners |
| `tikfinityBridge.js` | TikFinity WebSocket listener + payload routing |
| `normalize.js` | Raw payload → unified event schema; like-delta; gift combo/dedupe |
| `tunnel.js` | Cloudflare quick tunnel: spawn/parse URL, status + lifecycle |
| `httpRoutes.js` | REST: health, teams, winners, flags, tikora identity, mock, tunnel |
| `tikoraIdentity.js` | Resolve hub slug/key/relay from env → launch URL → config → manifest (pure) |
| `uploads.js` | Flag image validation + write to `public/flags` |
| `stores/*.js` | Atomic JSON read/write for config, teams, winners |
| `mock.js` | Server-side mock event injection |
| `constants.js` | Paths, ports, modes, retry/dedupe constants |

See [BRIDGE.md](./BRIDGE.md) for the event contracts.

---

## 5. Data flow

```
Bridge source → normalize() → io.emit('tiktok-event', evt)
  → bridgeClient → ViewerManager.handleEvent(evt) + Scoring.applyEvent(evt)
    → Game state (balls, nations, queues) → render()/HUD

Game (authority) → every ~0.25 s → io.emit('overlay:state', snapshot)
  → bridge relays 'overlay:leaderboard' (+ caches last) → leaderboard.html page
```

Round flow:

```
IDLE → COUNTDOWN → PLAYING → ROUND_END → INTERMISSION → (auto) COUNTDOWN …
                                └─ winnersStore.add()
```

---

## 6. Rendering pipeline

```
render()
  ctx.clear
  camera.apply()            # pan/zoom/shake; world space begins
    grid.draw               # tiles + freshness tint + rounded union nation outlines
    powerups.draw
    particles.draw
    balls.draw (avatar + team ring/glow/tint + nameplate)
    drawBases               # capital medallion (capitalScale) + photo + name pill — above balls
    vfx.draw
  camera.restore()
  HUD (DOM): nation leaderboard, timer, control bar, pause overlay
```

**Camera:** a single `Camera` object owns `zoom`, `pan`, `target`, easing and shake. Cinematic
intros, focus, and shake all feed the same transform. HUD is never transformed.

---

## 7. Capture strategy

There is no combat. A ball is a puck confined to its nation: `Grid.blocksAt(x, y, color)` returns
true for any tile it does not own, so the ball **reflects** off the border and calls
`Grid.convertOnHit(row, col, color)`, which **captures the tile in one touch** (`paintTile`) and
starts a **hold** (`hold[r][c] = now + TILE_HOLD_TIME`). While held, no other colour can retake
the tile, so contested borders cannot flicker; `grid.tick(dt)` advances the clock and holds expire
naturally. `autoFillEnclosures` converts fully surrounded pockets instantly, `nearestOwnedTile`
rescues a ball trapped by a flip, and a nation at zero tiles is eliminated. Nation outlines are
traced from a boolean mask by `outline.traceOutline` (marching squares) and stroked as rounded
union paths.

---

## 8. Socket event contracts

### Server → Client
| Event | Payload |
| --- | --- |
| `tiktok-event` | unified event (see BRIDGE.md §4) |
| `tiktok:status` | `{ username, mode, source, tiktokState, roomId, lastError }` |
| `tunnel:status` | `{ enabled, status, url, error, target }` (replayed on connect) |
| `overlay:leaderboard` | `{ type, round, claimable, teams[], updatedAt }` (relayed + cached) |

### Client → Server
| Event | Payload |
| --- | --- |
| `tiktok:connect` | `{ username, mode, tikfinityHost?, tikfinityPort? }` |
| `tiktok:disconnect` | – |
| `overlay:state` | leaderboard snapshot emitted by the game (~4 Hz) |
| `flag:upload` (HTTP POST) | `{ teamId, imageData }` |
| `mock:event` (HTTP POST) | `{ type, username, teamIndex, value }` |

---

## 9. Persistence

| Store | File | Contents |
| --- | --- | --- |
| Config | `.tiktok-config.json` | username, mode, host/port, Tikora settings |
| Teams | `config/teams.json` | roster, flags, colours, aliases |
| Winners | `config/winners.json` | all-time team + viewer winners (created at runtime) |

Gift → power-up mappings live **only in the hub** (its own SQLite store) — the game has no mapping
storage.

All stores use **atomic write** (write temp → rename). The client mirrors to localStorage and
re-syncs when the server is reachable.

---

## 10. Performance budget

| Resource | Budget |
| --- | --- |
| Active marbles | ≤ 26 |
| Grid tiles | ≤ 1536 |
| Particles | ≤ 250 (pooled) |
| Frame time | ≤ 16.6 ms (60 FPS) |
| Socket emissions | batched, ≤ ~10/s |
