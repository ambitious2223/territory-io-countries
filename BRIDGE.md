# BRIDGE.md — TikTok / TikFinity / Tikora Integration

The bridge server (`server/`, port **3020**) is the only component that talks to TikTok. It
normalizes every source into one **unified event schema** and relays it to the game over
Socket.IO. It **auto-connects on boot**.

---

## 1. Sources

The bridge connects to **one** TikTok chat source at a time:

| Source | Transport | Notes |
| --- | --- | --- |
| **Direct** | `tiktok-live-connector` (`TikTokLiveConnection`) | Primary; no API key required |
| **TikFinity** | WebSocket `ws://127.0.0.1:21213` | Desktop Events API fallback |
| **Mock** | in-process | Offline testing and demos |

Tikora is **not** a chat source. It is a separate, **client-side effect hub** that receives
streamer-mapped effects (see §6) and runs alongside whichever chat source is active.

### Modes (`connectionManager`)
- `auto` — try Direct first; after **2** failures fall back to TikFinity; both keep retrying.
- `direct` — Direct only.
- `tikfinity` — TikFinity only.
- `mock` — no TikTok; events are injected locally.
- A selection from the debug panel **overrides** the automatic choice.

---

## 2. Configuration

`.tiktok-config.json` (gitignored, created on first save):

```json
{
  "username": "",
  "mode": "auto",
  "autoConnect": true,
  "tikfinityHost": "127.0.0.1",
  "tikfinityPort": 21213,
  "tikoraEnabled": false,
  "tikoraSlug": "",
  "tikoraKey": "",
  "tikoraRelayUrl": "ws://127.0.0.1:27016/",
  "tunnelEnabled": true,
  "tunnelTarget": "http://localhost:1935"
}
```

`.env` overrides (never committed): `PORT=3020`, `TIKTOK_USERNAME`, `BRIDGE_MODE`, `CORS_ORIGINS`,
`TWF_TUNNEL=0` (disable the overlay tunnel, e.g. tests).

**Hub-injected identity (preferred):** when launched from the Chic Aura Hub (Tikora), the process
inherits `TIKORA_GAME_SLUG`, `TIKORA_GAME_KEY`, `TIKORA_RELAY_URL` and `TIKORA_GAME_LAUNCH_URL`
(the `?game=&key=` URL). Identity resolution precedence is: env → launch-URL query → legacy
`TIKORA_SLUG`/`TIKORA_KEY` → saved `.tiktok-config.json` → manifest slug / default relay. No key is
ever pasted into the game.

**Auto-connect:** on boot, if `autoConnect` and a username are present, `connectionManager`
starts the configured mode. If no username is set, the server starts in **Mock** so the game
runs immediately.

---

## 3. Normalization rules

- **Gift combo:** ignore intermediate `giftType === 1 && !repeatEnd`; process only `repeatEnd`.
- **Gift dedupe:** keep a bounded `Set` of recent `msgId`s (max ~200) and drop duplicates.
- **Gift value:** `coins = diamondCount × repeatCount`.
- **Like delta:** TikTok emits likes sparsely — reconstruct from `totalLikeCount` deltas, with
  re-baselining when the room counter resets; fall back to the event burst count.
- **User extraction:** tolerate all connector/TikFinity field shapes (`user.nickname`,
  `uniqueId`, `profilePictureUrl`, `avatar`, …).
- **Dual-source dedupe:** when one source is live, the inactive source's events are dropped.

---

## 4. Unified event schema (server → client, `tiktok-event`)

```js
{
  type: 'chat' | 'gift' | 'like' | 'follow' | 'share' | 'member',
  source: 'direct' | 'tikfinity' | 'mock',
  userId, username, name, avatar,
  message,                         // chat only
  giftId, giftName, coins, repeatCount, msgId,
  likeCount,                       // like only
  ts
}
```

Status events (`tiktok:status`):

```js
{ username, mode, source, tiktokState: 'idle'|'connecting'|'live'|'offline'|'error',
  roomId, lastError }
```

---

## 5. Server API

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/health` | Connection state, source, username, mode, clients |
| GET/PUT | `/api/teams` | Read / write the team roster |
| GET/POST/DELETE | `/api/winners` | Read / append / clear persisted winners |
| POST | `/api/flags` | Upload a flag image (`{ teamId, imageData }`) |
| POST | `/api/mock-event` | Inject a mock event (`{ type, username, teamIndex, value }`) |
| GET | `/api/tikora/config` | Resolved hub identity `{ slug, key, relayUrl, enabled }` (read-only) |
| GET | `/api/tunnel` | Cloudflare tunnel state `{ enabled, status, url, error, target }` |
| POST | `/api/tunnel` | `{ action: 'start' \| 'stop' }` — start/stop the overlay tunnel |

Socket events are listed in [ARCHITECTURE.md](./ARCHITECTURE.md) §8.

**Overlay tunnel:** unless `TWF_TUNNEL=0`, the bridge spawns a Cloudflare **quick tunnel** to
`tunnelTarget` (default `http://localhost:1935`) on boot and parses the public URL, surfaced as
`tunnel:status` / `GET /api/tunnel`. The child is killed on exit or `SIGINT`/`SIGTERM`. Since the
streaming app runs locally, the overlay page still reaches the bridge at `localhost:3020`, so only
the game page needs the public URL.

---

## 6. Tikora integration

- Tikora is a **client-side effect hub**, not a chat source — it never carries chat/like/gift
  events, and the bridge server does not connect to it.
- `tikora.manifest.json` declares this game's **effects** (key, label, kind, params) and is the
  single source of truth Tikora reads (and the game sends as capabilities).
- The game is **hardwired to the hub**: on boot it resolves its slug/key/relay (§2) and connects
  itself. There is **no manual key entry** and **no in-game connect/disconnect** — activating,
  deactivating and mapping effects all live in the hub. The debug panel only *displays* status.
- On connect, `src/tikora.js` loads Tikora's served `hub-client.js`, connects to the relay, sends
  its **capabilities**, receives mapped `effect` messages, routes them through the shared effect
  executor, and **acks** each one.
- The effect's `event` carries the **activator's identity** (`username`, `name`, `avatar`,
  `userId` in addition to gift metadata), so effect soldiers can show who triggered them. If the
  activator has no nation, the game queues a "pick a side" prompt and applies the effect when they
  join.
- Gift → power-up **mapping** happens **only in the hub** (its Trigger → Effect mapper); the game
  declares effects in `tikora.manifest.json` and executes what the hub sends — there is no
  in-app mapping. One built-in default still runs game-side on **every** gift bridge event
  (D-049): a coin-scaled speed `boost` on the donor's own ball, in addition to any hub effect.

---

## 7. Reconnection

| Source | Behaviour |
| --- | --- |
| Direct | retry every 10 s; fall back after 2 failures (auto mode) |
| TikFinity | retry every 8 s |
| Tikora (hub) | client-side reconnect via `hub-client.js`; independent of the chat source |

A previous connection is always torn down before a new one is opened (never leave dangling
listeners). Manual disconnect stops all retries until the host reconnects.

---

## 8. Debug panel — Connect tab

- **Connect** section: username, **mode** select (`Auto · Direct · TikFinity · Mock`), TikFinity
  host/port, **Connect/Disconnect**, live status badge, source, event count, last error, and a
  mock-event injector.
- **Tikora Hub** section (read-only): status, resolved game slug and relay — all driven by the hub
  launch. No key input, no connect/disconnect (managed in the hub).
