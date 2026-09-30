# HISTORY.md — Session Log

Newest first. Log what was done, blockers, and next steps.

---

## 2026-09-30 — Planning & documentation foundation

**Done**
- Studied the existing `TERRITORY WITH SWORDS` engine and two reference apps
  (`beyblade project`, `draw with viewers`) to choose a rework direction.
- Confirmed all design decisions with the streamer (bridge, teams, flags, avatars,
  scoring, rounds, persistence, tech).
- Authored the full documentation set: README, AGENTS, GUARDRAILS, ARCHITECTURE,
  GAME_DESIGN, BRIDGE, PLANS, TESTING, DECISIONS, HISTORY, CHANGELOG.
- Established code-health guardrails (file limits, separation, security, performance, tests).

**Decisions**
- D-001…D-012 recorded in [DECISIONS.md](./DECISIONS.md).

- Added `.gitignore` and connected the workspace to
  `github.com/ambitious2223/territory-io-countries`, merging the shared history (no force-push)
  and publishing the Territory With Flags tree to `master` (removed the superseded State.io scaffold).

**Next**
- Phase 0: npm scripts (`dev`/`server`/`client`/`test`/`smoke`/`lint`).
- Phase 1: bridge server scaffold + auto-connect + Mock + status UI.
