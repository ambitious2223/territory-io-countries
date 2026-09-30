# ARCHITECTURE.md — Territory With Flags

## 1. System overview

```
┌──────────────────────────────────────────────────────────────────┐
│ OBS browser source / browser (:1935)                             │
│   Canvas engine (grid, marbles, swords, territory, particles)    │
│   DOM HUD (scoreboard, timer, control bar, debug panel, i18n)    │
│   net/bridgeClient.js ── socket.io-client ──┐                    │
└─────────────────────────────────────────────┼────────────────────┘
                                              │ tiktok-event / tiktok:status
┌─────────────────────────────────────────────▼────────────────────┐
│ Bridge server (:3020) — Node + Express + Socket.IO              │
│   connectionManager  (auto | direct | tikfinity | mock)          │
│   directBridge · tikfinityBridge · httpRoutes · uploads          │
│   normalize (one event schema)                                   │
│   stores/ (config, teams, mappings, winners)                     │
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
| `game.js` | Loop, lifecycle/round state machine, combat/territory orchestration, input |
| `config.js` | All tunable constants (canvas, grid, camera, scoring, cinematic) |
| `grid.js` | Tile ownership, fill progress, enclosure fill, drawing |
| `map.js` | Wall/map generation |
| `zones.js` | Generic contiguous zone layout for N teams (2–12) |
| `marble.js` | Viewer avatar marble: movement, claim, HP, power-ups, rendering |
| `sword.js` | Orbital blade geometry, rotation, drawing |
| `combat.js` | Blade↔marble and blade↔blade collision, damage events |
| `territory.js` | Elimination colour-conversion wave |
| `powerups.js` | Power-up entities and pickup logic |
| `particles.js` | Pooled spark/trail particles |
| `vfx.js` | Floating combat text |
| `audio.js` | Procedural panned SFX (join, gift, capture, victory) |
| `ai.js` | Steering for AI-fill marbles |
| `analytics.js` | Per-viewer and per-team stats |
| `renderer.js` | Camera (pan/zoom/shake) + shared draw helpers |
| `viewerManager.js` | Viewer/bot roster, active cap + reinforcement queue |
| `ui.js` | DOM HUD, control bar, debug panels, game-over, i18n wiring |
| `debug.js` | Canvas debug overlay (vectors, hitboxes, FPS) |
| `teams.js` | Team model + join-keyword matcher (pure) |
| `teamRegistry.js` | Team sync via `/api/teams`, localStorage, flag images |
| `teamsPanel.js` | Teams editor UI |
| `scoring.js` | Interaction → score engine (pure) |
| `round.js` | Round lifecycle state machine |
| `scoreboard.js` | Team scoreboard rendering |
| `winnersStore.js` | Winners persistence + sync |
| `mappings.js` | Gift-mapping matcher (pure) |
| `mappingsStore.js` | Mapping persistence + sync |
| `mappingsPanel.js` | Gift-mapping editor UI |
| `joinCinematic.js` | Camera intro queue for new joiners |
| `giftEffects.js` | Gift → power-up effect executor |
| `tikora.js` | Tikora effect hub (manifest + served `hub-client.js`) |
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
| `httpRoutes.js` | REST: health, teams, winners, mappings, flags, tikora config, mock |
| `uploads.js` | Flag image validation + write to `public/flags` |
| `stores/*.js` | Atomic JSON read/write for config, teams, mappings, winners |
| `mock.js` | Server-side mock event injection |
| `constants.js` | Paths, ports, modes, retry/dedupe constants |

See [BRIDGE.md](./BRIDGE.md) for the event contracts.

---

## 5. Data flow

```
Bridge source → normalize() → io.emit('tiktok-event', evt)
  → bridgeClient → Teams.assign(evt) + Scoring.apply(evt)
    → Game state (marbles, teams, queues) → render()/HUD
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
    grid.draw
    powerups.draw
    particles.draw
    swords.draw (alive marbles)
    marbles.draw (avatar + name + hp)
    vfx.draw
    debug.draw (if enabled)
  camera.restore()
  HUD (DOM): scoreboard, timer, control bar, pause overlay
```

**Camera:** a single `Camera` object owns `zoom`, `pan`, `target`, easing and shake. Cinematic
intros, focus, and shake all feed the same transform. HUD is never transformed.

---

## 7. Collision strategy

| Pair | Method |
| --- | --- |
| Blade → Marble | blade tip point-in-circle + blade segment-circle |
| Blade → Blade | segment–segment intersection (deflect, no damage) |
| Marble → boundary/wall | AABB clamp + velocity reflection against grid walls |
| Power-up → Marble | circle–circle |

---

## 8. Socket event contracts

### Server → Client
| Event | Payload |
| --- | --- |
| `tiktok-event` | unified event (see BRIDGE.md §4) |
| `tiktok:status` | `{ username, mode, source, tiktokState, roomId, lastError }` |

### Client → Server
| Event | Payload |
| --- | --- |
| `tiktok:connect` | `{ username, mode, tikfinityHost?, tikfinityPort? }` |
| `tiktok:disconnect` | – |
| `flag:upload` (HTTP POST) | `{ teamId, imageData }` |
| `mock:event` (HTTP POST) | `{ type, username, teamIndex, value }` |

---

## 9. Persistence

| Store | File | Contents |
| --- | --- | --- |
| Config | `.tiktok-config.json` | username, mode, host/port, Tikora settings |
| Teams | `config/teams.json` | roster, flags, colours, aliases |
| Mappings | `config/mappings.json` | gift → power-up rules |
| Winners | `config/winners.json` | all-time team + viewer winners (created at runtime) |

All stores use **atomic write** (write temp → rename). The client mirrors to localStorage and
re-syncs when the server is reachable.

---

## 10. Performance budget

| Resource | Budget |
| --- | --- |
| Active marbles | ≤ 26 |
| Grid tiles | ≤ 384 |
| Particles | ≤ 250 (pooled) |
| Frame time | ≤ 16.6 ms (60 FPS) |
| Socket emissions | batched, ≤ ~10/s |
