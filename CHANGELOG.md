# CHANGELOG.md - State.io TikTok Live

## [0.1.0] - 2026-08-24
### Added
- Project scaffolding created
- Documentation files (AGENTS.md, PLANS.md, GUARDRAILS.md, CHANGELOG.md)
- Directory structure (game/, public/, config/)
- package.json with dependencies (express, socket.io, tiktok-live-connector)
- Config files (teams.json with 4 default factions, map.json with 14 territories)

## [0.2.0] - 2026-08-24
### Added
- game/map.js - Territory management, adjacency graph, troop operations
- game/factions.js - Team management, supporter tracking, troop pools
- game/ai.js - Auto-targeting (nearest enemy for likes, strongest for gifts)
- game/engine.js - Game loop, production, combat, win detection
- game/renderer.js - Canvas rendering, troop animations
- server.js - Express + Socket.io server, TikTok connector, mock event API
- public/index.html - Game view with canvas, win overlay, pool bar
- public/admin.html - Full control panel with mock event testing

### Tested
- 10/10 mock event API tests passing
- Server starts cleanly on port 3000
- All files under 400 line limit
