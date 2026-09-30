# AGENTS.md — Territory With Flags

Orientation for any AI agent or human contributor working in this repository. Read this
**before** touching code. Non-negotiable rules live in [GUARDRAILS.md](./GUARDRAILS.md).

---

## 1. What this project is

A real-time **TikTok LIVE** territory-conquest game. Viewers comment a **country/team**
(number, ISO2, English name, Arabic name, or flag emoji) to join a nation. Each joined viewer
becomes a single **ball** that pours out of their nation's **home base** and **ricochets off the
border**, converting tiles on every contact so borders creep forward and get eaten back. There is
no sword combat — the only conflict is territory. Likes, comments, follows, shares and gifts feed power-ups and a
tunable interaction score. A timed round is won by **most territory**; rounds **auto-loop**.

It is shipped as an **OBS browser source** overlay and is designed around a streamer running
it locally next to a live TikTok.

Full rules: [GAME_DESIGN.md](./GAME_DESIGN.md). Bridge: [BRIDGE.md](./BRIDGE.md).

---

## 2. Fixed decisions (do not silently change)

| Topic | Decision |
| --- | --- |
| Frontend | HTML5 Canvas, **vanilla JS (ES modules)** — no React, no game engine |
| Bundler | Vite |
| Bridge server | Node.js + Express + Socket.IO, port **3020** |
| App port | **1935** |
| Bridge chat sources | **Direct** `tiktok-live-connector` + **TikFinity** WebSocket (auto-fallback, + Mock), each with debug controls |
| Tikora | **Client-side effect hub** (not a chat source): loads `hub-client.js`, runs in `src/tikora.js` |
| Auto-connect | Bridge connects on boot from `.tiktok-config.json` |
| Teams | **2–12**, streamer-configured from a default 8-slot roster |
| Viewer model | **One ball per viewer**, hard cap **~24** active, overflow queued |
| Join inputs | number · ISO2 · English name · Arabic name · flag emoji (fuzzy) |
| Flags | **Streamer-uploaded images**, consistent 3:2 save + upload helper |
| Combat | **None** — no swords/HP; conflict is territory only |
| Territory | **Home bases + confined ricochet balls**; border contact converts tiles |
| Scoring | Gift/interaction score is tunable, but the round is won by **land** |
| Round | **3 min** + ~**20 s** intermission, auto-loop, manual override always available |
| Win | **Most territory** at time-up (or 65% domination) |
| Persistence | Server JSON stores (atomic) **+ localStorage fallback** |
| i18n | English default, **full Arabic + RTL** for all UI |
| Gifts | Mapped to power-ups via a **mappings UI** |

If a change conflicts with the table above, stop and raise it — do not just implement it.

---

## 3. Architecture at a glance

```
OBS / browser
  └── Vite app (:1935): canvas engine + DOM HUD + debug panel
        ├── net/bridgeClient.js  (socket.io-client)
        │     │  receives: tiktok-event, tiktok:status
        │     ▼
        │   Bridge server (:3020): Express + Socket.IO
        │     ├── connectionManager — modes: auto | direct | tikfinity | mock
        │     ├── directBridge      — tiktok-live-connector
        │     ├── tikfinityBridge   — ws://127.0.0.1:21213
        │     ├── normalize         — one unified event schema
        │     └── httpRoutes/stores — REST + JSON persistence
        └── tikora.js / tikoraClient.js — client-side effect hub
              └── hub-client.js relay ws://127.0.0.1:27016 (effects only)
```

Details, socket event contracts and data flow: [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 4. Repository map

```
server/    bridge + persistence (never import game rendering)
src/       game engine, systems, UI, bridge client, i18n
config/    default JSON (teams.json, mappings.json; winners.json written at runtime)
public/    static assets; public/flags/ = uploaded flags
docs       *.md files at the repo root
```

Keep these boundaries. See "File Organization Rules" in GUARDRAILS.md.

---

## 5. Code standards (summary)

- **Max 400 lines per file** — split before you reach it (data files exempt).
- **No comments** unless explicitly requested.
- **No magic numbers** — named constants live in `src/config.js` or `config/*.json`.
- **ES modules only**; no CommonJS in `src/`, no `require()`.
- **One responsibility per file**; entities that hold state are classes, stateless ops are functions.
- **No hardcoded URLs/secrets** — use `.env` / `.tiktok-config.json` / config.
- **All user-facing UI text** goes through `src/i18n.js` `t()` — no literal strings in markup.
- **Conventional Commits** (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).

---

## 6. Build / run / verify

```bash
npm install
npm run dev        # bridge :3020 + app :1935
npm test           # pure-logic unit tests
npm run smoke      # bridge + socket end-to-end
npm run lint       # must be clean before commit
npm run build      # production bundle
```

**Definition of done for any task:** lint clean, tests pass, smoke passes, and the change is
verified in the running game (or via Mock mode) at a stable frame rate.

---

## 7. What agents must NOT do

- Do not add frameworks (React/Vue/Svelte/Phaser/PixiJS) or TypeScript to the current frontend.
- Do not add npm dependencies without a documented decision in [DECISIONS.md](./DECISIONS.md).
- Do not commit `node_modules/`, `dist/`, `.env`, `.tiktok-config.json`, or uploaded flags.
- Do not put game logic in the bridge server or bridge code in the renderer.
- Do not write secrets, tokens or API keys anywhere in the repo.
- Do not force-push or rewrite shared history.
- Do not mark a task complete while lint/tests are failing.

---

## 8. Where to log work

- Architectural choices → [DECISIONS.md](./DECISIONS.md)
- End-of-session notes → [HISTORY.md](./HISTORY.md)
- Shipped changes → [CHANGELOG.md](./CHANGELOG.md)
- Roadmap status → [PLANS.md](./PLANS.md)
