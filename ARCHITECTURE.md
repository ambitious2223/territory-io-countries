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
│   connectionManager  (auto | direct | tikfinity | tikora)        │
│   directBridge · tikfinityBridge · tikoraHub                    │
│   normalize (one event schema) · uploadRoutes                    │
│   stores/ (config, teams, settings, mappings, winners)          │
└──────────────────────────────────────────────────────────────────┘
        ▲ ws 127.0.0.1:21213 (TikFinity)   ▲ ws 127.0.0.1:27016 (Tikora)
```

- No TikTok OAuth or API key required — username-based connection.
- The frontend is a static Vite bundle; the server also serves `dist/` for production.
- The server is the only component that talks to TikTok. The client is source-agnostic.

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
| `main.js` | Bootstrap: create `Game`, connect bridge client, start loop |
| `game.js` | Loop, lifecycle/round state machine, combat/territory orchestration, input |
| `config.js` | All tunable constants (canvas, grid, camera, scoring, cinematic) |
| `grid.js` | Tile ownership, fill progress, enclosure fill, zone init, drawing |
| `map.js` | Wall/map generation and zone layout for N teams |
| `marble.js` | Viewer avatar marble: movement, claim, HP, power-ups, rendering |
| `sword.js` | Orbital blade geometry, rotation, drawing |
| `combat.js` | Blade↔marble and blade↔blade collision, damage events |
| `territory.js` | Elimination colour-conversion wave |
| `particles.js` | Pooled spark/trail particles |
| `vfx.js` | Floating combat text |
| `audio.js` | Procedural panned sound engine |
| `ai.js` | Steering for AI-fill marbles |
| `analytics.js` | Per-viewer and per-team stats |
| `renderer.js` | Camera (pan/zoom/shake) + shared draw helpers |
| `ui.js` | DOM HUD, control bar, debug panel, game-over, i18n wiring |
| `debug.js` | Canvas debug overlay (vectors, hitboxes, FPS) |
| `teams.js` | Team model + join-keyword matcher (pure) |
| `flags.js` | Flag registry + image cache |
| `scoring.js` | Interaction → score engine (pure) |
| `joinCinematic.js` | Camera intro queue for new joiners |
| `giftEffects.js` | Gift → power-up effect executor |
| `net/bridgeClient.js` | Socket transport + connection status |
| `i18n.js` | EN/AR dictionaries + `t()` |
| `mock.js` | In-browser mock event triggers for testing |

---

## 4. Bridge server modules

| Module | Responsibility |
| --- | --- |
| `server/index.js` | Express + Socket.IO + static + boot-time auto-connect |
| `connectionManager.js` | Source selection, retries, fallback, dedupe gate |
| `directBridge.js` | `tiktok-live-connector` connection + raw listeners |
| `tikfinityBridge.js` | TikFinity WebSocket listener + payload routing |
| `tikoraHub.js` | Tikora `hub-client.js` relay + manifest capability sync |
| `normalize.js` | Raw payload → unified event schema; like-delta; gift combo/dedupe |
| `stores/*.js` | Atomic JSON read/write for config, teams, settings, mappings, winners |
| `uploadRoutes.js` | Flag image upload + validation + static write |
| `mock.js` | Server-side mock event injection |

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
| Config | `.tiktok-config.json` | username, mode, host/port |
| Teams | `config/teams.json` | roster, flags, colours, aliases |
| Settings | `config/settings.json` | round length, scoring weights, caps |
| Mappings | `config/mappings.json` | gift → power-up rules |
| Winners | `config/winners.json` | all-time team + viewer winners |

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
