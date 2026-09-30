# BRIDGE.md — TikTok / TikFinity / Tikora Integration

The bridge server (`server/`, port **3020**) is the only component that talks to TikTok. It
normalizes every source into one **unified event schema** and relays it to the game over
Socket.IO. It **auto-connects on boot**.

---

## 1. Sources

| Source | Transport | Notes |
| --- | --- | --- |
| **Direct** | `tiktok-live-connector` (`TikTokLiveConnection`) | Primary; no API key required |
| **TikFinity** | WebSocket `ws://127.0.0.1:21213` | Desktop Events API fallback |
| **Tikora** | `hub-client.js` relay `ws://127.0.0.1:27016` | Effect routing via `tikora.manifest.json` |
| **Mock** | in-process | Offline testing and demos |

### Modes (`connectionManager`)
- `auto` — try Direct first; after **2** failures fall back to TikFinity; both keep retrying.
- `direct` — Direct only.
- `tikfinity` — TikFinity only.
- `tikora` — Tikora hub only.
- A host selection from the debug panel **overrides** the automatic choice.

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
  "tikoraRelayUrl": "ws://127.0.0.1:27016/"
}
```

`.env` overrides (never committed): `PORT=3020`, `TIKTOK_USERNAME`, `CORS_ORIGINS`,
`BRIDGE_DEFAULT_URL`, `TIKORA_SLUG`, `TIKORA_KEY`.

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
  source: 'direct' | 'tikfinity' | 'tikora' | 'mock',
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
| POST | `/api/flags` | Upload a flag image (`{ teamId, imageData }`) |
| POST | `/api/mock-event` | Inject a mock event (`{ type, username, teamIndex, value }`) |
| GET | `/api/tikora/config` | Tikora launch env (slug/key) when run from Tikora |

Socket events are listed in [ARCHITECTURE.md](./ARCHITECTURE.md) §8.

---

## 6. Tikora integration

- `tikora.manifest.json` declares this game's **effects** (key, label, kind, params).
- On connect, the client loads Tikora's served `hub-client.js` and connects to the relay,
  sends its **capabilities**, receives mapped `effect` messages, routes them through the shared
  effect executor, and **acks** each one.
- Identity resolves: saved setting → `?game=&key=` → `GET /api/tikora/config` → manifest slug.
- Use **either** Tikora effect routing **or** the game's own gift mappings for a given gift —
  not both.

---

## 7. Reconnection

| Source | Behaviour |
| --- | --- |
| Direct | retry every 10 s; fall back after 2 failures (auto mode) |
| TikFinity | retry every 8 s |
| Tikora | reconnect via `hub-client.js` with backoff |

A previous connection is always torn down before a new one is opened (never leave dangling
listeners). Manual disconnect stops all retries until the host reconnects.

---

## 8. Debug panel — Connect tab

Sub-tabs for **Direct · TikFinity · Tikora · Mock**, each with: host/port, username, mode,
**Connect/Disconnect**, live status badge, last error, and a mock-event injector. A **pre-flight
checklist** (bridge reachable, audio unlocked, server reachable) gates "ready to go live".
