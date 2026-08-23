# AGENTS.md - State.io TikTok Live Game

## Project Overview
Interactive TikTok Live game where viewers control factions in a State.io-style territory conquest. Viewers join teams via comments and deploy troops through likes, shares, follows, and gifts. Displayed as an OBS browser source overlay.

## Architecture
- **Backend**: Node.js + Express + Socket.io
- **Frontend**: HTML5 Canvas (vanilla JS)
- **TikTok Integration**: `tiktok-live-connector` npm package
- **Display**: OBS Browser Source (localhost URL)

## File Structure
```
state-io-live/
├── server.js              # Express + Socket.io + TikTok connector
├── game/
│   ├── engine.js          # Core game loop, troop production, combat
│   ├── map.js             # Territory/node definitions, adjacency graph
│   ├── ai.js              # Auto-targeting logic (nearest vs strongest)
│   ├── factions.js        # Team management, troop pools
│   └── renderer.js        # Canvas drawing
├── public/
│   ├── index.html         # Game view (OBS browser source)
│   ├── win-screen.html    # Victory overlay
│   └── admin.html         # Debug/control panel
├── config/
│   ├── teams.json         # Team definitions (colors, icons, names)
│   └── map.json           # Map layout (node positions, adjacency)
├── AGENTS.md              # This file
├── PLANS.md               # Project plan and milestones
├── GUARDRAILS.md          # Testing rules and code quality
└── CHANGELOG.md           # Change history
```

## Code Style Rules
1. **Max 400 lines per file** - split if approaching limit
2. **No comments** unless explicitly requested
3. **Clean imports** - use ES modules (import/export)
4. **Single responsibility** - each file does ONE thing
5. **No magic numbers** - use named constants in config

## Key Concepts
- **Territory/Node**: A circle on the map with troop count, owner, position
- **Faction**: A team with color, icon, name, supporter list
- **Troop Pool**: Accumulated troops from viewer interactions, waiting to deploy
- **Deployment**: Moving troops from pool to a target territory
- **Auto-Targeting**: AI picks nearest (likes) or strongest (gifts) enemy

## Running the Project
```bash
npm install
npm start
# Opens on http://localhost:3000
# Game view: http://localhost:3000 (use in OBS)
# Admin panel: http://localhost:3000/admin.html
```

## TikTok Connection
Set environment variable before starting:
```bash
set TIKTOK_USERNAME=your_username
npm start
```
