# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project aims to follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Full documentation set: README, AGENTS, GUARDRAILS, ARCHITECTURE, GAME_DESIGN, BRIDGE,
  PLANS, TESTING, DECISIONS, HISTORY, CHANGELOG.
- Code-health guardrails (file limits, separation of concerns, security, performance, testing).
- Bridge server (`server/`): Express + Socket.IO with `/health`, `/api/mock-event`, static
  serving, and **boot-time auto-connect** from `.tiktok-config.json`.
- `connectionManager` with `auto | direct | tikfinity | mock` modes, retries and fallback.
- `directBridge` (`tiktok-live-connector`) and `tikfinityBridge` (`ws://127.0.0.1:21213`).
- `server/normalize.js`: unified event schema, like-delta reconstruction, gift combo skip and
  `msgId` dedupe, tolerant user extraction.
- Client `src/net/bridgeClient.js` (socket.io-client) and debug-panel **Connection** + **Mock Event** sections.
- Tooling: ESLint flat config, Vitest unit tests, and a socket end-to-end smoke test.
- Scripts: `dev`, `server`, `client`, `test`, `smoke`, `lint`.
- Teams & flags: `config/teams.json` default roster (8), `server/stores/teamsStore.js`, and
  `GET/PUT /api/teams` + `POST /api/flags` routes with magic-byte image validation.
- `src/teams.js` pure join-keyword matcher (team number · ISO2 · English · Arabic · flag emoji, fuzzy).
- `src/teamRegistry.js` (server sync + localStorage fallback + flag image cache) and
  `src/imageUtils.js` 3:2 cover-crop for consistent flag uploads.
- Debug panel **Teams** editor (add/remove, EN/AR names, ISO2, colour, flag upload).
- `src/i18n.js` — English + Arabic with RTL; language selector; primary UI localized.

### Changed
- Project re-scoped from "Territory With Swords" (local AI battle) to
  **Territory With Flags** — a TikTok-LIVE team/flag territory-conquest game.
- Bumped Vite to `8.3.1`; added `express`, `socket.io`, `socket.io-client`,
  `tiktok-live-connector`, `ws`. `npm audit` now reports **0 vulnerabilities**.

### Fixed
- Removed pre-existing unused imports/args flagged by the new linter.

## [0.1.0] - 2026-09-30
### Added
- Initial planning and design baseline for the TikTok-integrated rework.
- Confirmed architecture: Vite + vanilla-JS canvas frontend (:1935) and a Node bridge
  server (:3020) with direct / TikFinity / Tikora TikTok sources.
