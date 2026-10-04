# Territory With Flags

An interactive **TikTok LIVE** territory-conquest game. Viewers join a country/team by
commenting and become a **single ball** that pours out of their nation's **home base** to slowly
convert the neutral arena tile by tile. Borders creep forward and get eaten back; the nation
holding the **most land** when the timer runs out wins. Built as an **OBS browser-source overlay**.

- **Frontend:** HTML5 Canvas, vanilla JS (ES modules), bundled by Vite
- **Bridge server:** Node.js + Express + Socket.IO (Direct + TikFinity chat sources, Mock; Tikora effect hub)
- **Persistence:** on-disk JSON stores with localStorage fallback
- **Languages:** English (default) + Arabic (RTL)

> Repository: `https://github.com/ambitious2223/territory-io-countries`

---

## Status — v2.4.1

Every gate is green: `npm run lint`, `npm test` (96 tests incl. hub-identity/team-registry/outline/
overlay + a headless game-loop test), `npm run build`, and `npm run smoke`.

**Shipped**

- **Conquest core:** neutral arena, one **home base per nation**, one **ball per viewer**. A ball
  is **confined to its nation** and **ricochets off the border**, **claiming a tile on a single
  touch** (neutral or enemy) so borders creep and get eaten. A freshly claimed tile is held for a
  couple of seconds so contested borders don't flicker. No swords, no HP — territory is the only
  conflict.
- **Conquerable bases / last stand:** a nation at zero tiles is **eliminated** for the round.
- **Win by land:** most territory at time-up, or an immediate 65% **domination** win.
- TikTok bridge with **auto-connect**: **Direct** (`tiktok-live-connector`) + **TikFinity**
  (`ws://127.0.0.1:21213`) chat sources with auto-fallback, plus **Mock** for offline.
- **Tikora** (Chic Aura Hub) integration as a **client-side effect hub**: the game **hardwires its
  identity from the hub** — when launched from Tikora it inherits `TIKORA_GAME_SLUG`/`_KEY`/`_URL`
  (or the `?game=&key=` launch URL) and connects itself. **No game key to paste**; activating /
  deactivating effects stays in the hub.
- Nations 2–12 with streamer-uploaded 3:2 flags and multilingual join keywords
  (number · ISO2 · English · Arabic · emoji, fuzzy matching).
- Balls with profile photos, a hard cap + reinforcement queue, and AI fill.
- **Presentation:** one minimal **live leaderboard** (`rank · flag · name · territory %`, leader
  crown), **3D circular strongholds** showing the uploaded team photo, and **rounded union borders**.
  Balls show the viewer's TikTok photo with a **team-colour ring, glow, tint and nameplate**, so you
  always know who belongs to which nation.
- **Team photos:** upload a flag/photo per team in **Debug → Teams**; it appears in the stronghold,
  the leaderboard and the overlay. Uploads apply live.
- **Lean debug menu:** Connection · Teams · Overlay · Advanced (secondary tools collapsed). A
  floating draggable button opens it (position + state persist).
- **Overlay URL:** a standalone `/leaderboard.html` page (same minimal leaderboard + round timer)
  for a second OBS browser source — see [Standalone leaderboard overlay](#standalone-leaderboard-overlay).
- Camera pan/zoom **join cinematic** with a profile-photo intro card and adjustable blur.
- Gift → power-up mappings (overcharge, color bomb, area convert, spawn ally, instant claim) with
  an in-app editor; auto-looping timed rounds and persisted all-time winners.
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
| Standalone leaderboard overlay | http://localhost:1935/leaderboard.html |
| Bridge health | http://localhost:3020/health |

On boot the bridge **auto-connects** using `.tiktok-config.json` (username + mode). No TikTok
username yet? It starts in **Mock** mode so the game is fully testable offline.

### Running from the Chic Aura Hub (Tikora) — no key to paste

The game **hardwires itself to the hub**. Add it once in Tikora's **Game Store**:

| Field | Value |
| --- | --- |
| Name | Territory With Flags |
| Slug | `territory-with-flags` |
| Type | webapp |
| Port | `1935` |
| Launch (.bat) | `C:\dev\TERRITORY WITH SWORDS\countriesio.bat` |

Then generate/copy its `gk_…` key in **Game Hub**. Pressing **▶ Run** starts `countriesio.bat`,
which opens the hub's launch URL (`?game=territory-with-flags&key=gk_…`) and injects
`TIKORA_GAME_SLUG`/`TIKORA_GAME_KEY`/`TIKORA_RELAY_URL`; the game reads them from
`GET /api/tikora/config` (or the URL) and connects automatically. **All activation/deactivation and
effect mapping live in the hub** — the in-game debug panel only *shows* the hub status. Running
`npm run dev` by hand still works fully offline (Mock / TikFinity).

### Standalone leaderboard overlay

A minimal, single-column **live leaderboard** (rank · flag · name · territory %, plus a round timer
and state). The debug **System** tab shows a copyable overlay URL. Add it as a second **OBS browser
source** (transparent background by default). Customise with query params:

`http://localhost:1935/leaderboard.html?rows=8&theme=glass&bg=0&rtl=0&scale=1`

| Param | Meaning |
| --- | --- |
| `rows` | Max nations shown (default 12) |
| `theme` | `glass` (default) or `neon` |
| `bg` | `1` adds a glass panel background (default transparent) |
| `rtl` | `1` for right-to-left |
| `scale` | UI scale multiplier (e.g. `1.2`) |

The page is a **display-only subscriber**; the main game tab must be open and publishing.

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
├── index.html            # Game shell + HUD markup
├── leaderboard.html      # Standalone OBS leaderboard overlay page
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
│   ├── outline.js        # Rounded union border tracing (marching squares)
│   ├── debugPanel.js     # Tabbed debug panel markup
│   ├── debugFab.js       # Draggable debug button + tabs
│   └── overlay/          # Standalone leaderboard subscriber + styles
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
