# Territory With Flags

An interactive **TikTok LIVE** territory-conquest game. Viewers join countries/teams by
commenting, then fight for land with orbital swords while likes, follows, shares and gifts
feed their nation's power. Built as an **OBS browser-source overlay**.

- **Frontend:** HTML5 Canvas, vanilla JS (ES modules), bundled by Vite
- **Bridge server:** Node.js + Express + Socket.IO (`tiktok-live-connector`, TikFinity fallback, Tikora hub)
- **Persistence:** on-disk JSON stores with localStorage fallback
- **Languages:** English (default) + Arabic (RTL)

> Repository: `https://github.com/ambitious2223/territory-io-countries`

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
│   ├── tikoraHub.js      # Tikora hub relay
│   ├── normalize.js      # Unified event schema
│   ├── stores/           # JSON persistence (atomic writes)
│   ├── uploadRoutes.js   # Flag image uploads -> public/flags
│   └── mock.js
├── public/
│   └── flags/            # Streamer-uploaded flag images
├── src/                  # Game engine + bridge client + systems
├── config/               # Default teams / map / settings JSON
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
