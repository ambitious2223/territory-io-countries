# Territory With Flags

An interactive **TikTok LIVE** territory-conquest game. Viewers join countries/teams by
commenting, then fight for land with orbital swords while likes, follows, shares and gifts
feed their nation's power. Built as an **OBS browser-source overlay**.

- **Frontend:** HTML5 Canvas, vanilla JS (ES modules), bundled by Vite
- **Bridge server:** Node.js + Express + Socket.IO (Direct + TikFinity chat sources, Mock; Tikora effect hub)
- **Persistence:** on-disk JSON stores with localStorage fallback
- **Languages:** English (default) + Arabic (RTL)

> Repository: `https://github.com/ambitious2223/territory-io-countries`

---

## Status — v1.0.0

All planned phases (0–9) are complete and every gate is green: `npm run lint`, `npm test`
(73 unit tests), `npm run build`, and `npm run smoke`.

**Shipped**

- TikTok bridge with **auto-connect**: **Direct** (`tiktok-live-connector`) + **TikFinity**
  (`ws://127.0.0.1:21213`) chat sources with auto-fallback, plus **Mock** for offline.
- **Tikora** integration as a **client-side effect hub** (loads `hub-client.js` over
  `ws://127.0.0.1:27016`), independent of the active chat source.
- Teams 2–12 with streamer-uploaded 3:2 flags and multilingual join keywords
  (number · ISO2 · English · Arabic · emoji, fuzzy matching).
- Viewer avatar marbles with profile photos, a hard cap + reinforcement queue, and AI fill.
- Camera pan/zoom **join cinematic** with a profile-photo intro card and adjustable blur.
- Territory + sword combat, gift-dominant scoring, a live team scoreboard, auto-looping timed
  rounds, and persisted all-time winners.
- Gift → power-up mappings with an in-app content editor.
- Full English + Arabic (RTL) UI.

**Before going live** (not testable in CI): a visual/browser pass via `npm run dev`, a real Direct
connect with your username, and a Tikora relay test against a running Tikora install.

---

## Quick start

```bash
npm install
npm run dev            # starts bridge server (:3020) + Vite app (:1935)
```

| Surface | URL |
| --- | --- |
| Game (put this in OBS) | http://localhost:1935 |
| Bridge health | http://localhost:3020/health |

On boot the bridge **auto-connects** using `.tiktok-config.json` (username + mode). No TikTok
username yet? It starts in **Mock** mode so the game is fully testable offline.

---

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Bridge server + app together (recommended) |
| `npm run server` | Bridge server only (:3020, auto-connect) |
| `npm run client` | Vite dev app only (:1935) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm test` | Pure-logic unit tests (Vitest) |
| `npm run smoke` | End-to-end bridge/socket smoke test |
| `npm run lint` | ESLint code-health gate |

---

## Project layout

```
TERRITORY WITH SWORDS/
├── index.html            # Game shell + OBS overlay + debug panel markup
├── server/               # Bridge server (see BRIDGE.md)
│   ├── index.js          # Express + Socket.IO + auto-connect
│   ├── connectionManager.js
│   ├── directBridge.js   # tiktok-live-connector
│   ├── tikfinityBridge.js# ws://127.0.0.1:21213
│   ├── normalize.js      # Unified event schema
│   ├── httpRoutes.js     # /health + /api/{teams,flags,winners,mappings,tikora,mock-event}
│   ├── uploads.js        # Flag image validation + save -> public/flags
│   ├── mock.js
│   └── stores/           # JSON persistence (atomic writes)
├── public/
│   └── flags/            # Streamer-uploaded flag images
├── src/                  # Game engine, systems, bridge client, i18n, Tikora client
├── config/               # teams.json, mappings.json (+ winners.json at runtime)
├── tikora.manifest.json  # Effects Tikora reads
├── .tiktok-config.json   # Auto-connect configuration
└── docs: README, AGENTS, GUARDRAILS, ARCHITECTURE, GAME_DESIGN,
          BRIDGE, PLANS, TESTING, DECISIONS, HISTORY, CHANGELOG
```

---

## Documentation index

| Doc | Purpose |
| --- | --- |
| [AGENTS.md](./AGENTS.md) | Orientation for AI/agent contributors |
| [GUARDRAILS.md](./GUARDRAILS.md) | Non-negotiable code-health rules |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design + data flow |
| [GAME_DESIGN.md](./GAME_DESIGN.md) | Gameplay, teams, flags, scoring |
| [BRIDGE.md](./BRIDGE.md) | TikTok / TikFinity / Tikora integration |
| [PLANS.md](./PLANS.md) | Phased roadmap with acceptance criteria |
| [TESTING.md](./TESTING.md) | Test strategy + manual QA checklist |
| [DECISIONS.md](./DECISIONS.md) | Architectural decision log |
| [HISTORY.md](./HISTORY.md) | Session-by-session work log |
| [CHANGELOG.md](./CHANGELOG.md) | Release history |
