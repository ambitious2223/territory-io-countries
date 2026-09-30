# DECISIONS.md — Decision Log

Format: **D-xxx — Title**, with Context · Decision · Rationale · Alternatives.

---

## D-001 — Evolve the existing vanilla-JS canvas game
- **Context:** A working Canvas engine (grid, marbles, swords, territory, audio, VFX) already exists.
- **Decision:** Extend it in place rather than rewriting in React.
- **Rationale:** Lowest risk, reuses proven systems, keeps the OBS-friendly single bundle.
- **Alternatives:** React rewrite (more work, discards the engine); hybrid React shell.

## D-002 — Keep territory + swords, reskin around flags
- **Context:** The core loop already produces compelling territory play.
- **Decision:** Teams/flags become the identity layer; claiming/combat engine is retained.
- **Rationale:** Minimal churn, maximum reused value.
- **Alternatives:** Capture-the-flag rewrite; pure painting with no combat.

## D-003 — Tri-source bridge with auto-connect
- **Context:** Reference apps use direct `tiktok-live-connector`, TikFinity fallback, and Tikora hub.
- **Decision:** Support all three plus Mock, each with its own debug tab; auto-connect on server boot.
- **Rationale:** Robustness (fallback) and compatibility (Tikora/Stream Deck users).
- **Alternatives:** Direct only; TikFinity only.

## D-004 — Reuse the draw-with-viewers bridge server (port 3020)
- **Context:** A proven bridge exists (`liveEvents.ts` + `tiktok-bridge-server.js`).
- **Decision:** Adapt it for the game server on **3020**; app on **1935**.
- **Rationale:** Battle-tested normalization/dedupe/reconnect logic.
- **Alternatives:** Write a bridge from scratch.

## D-005 — Viewer = avatar marble, capped at 24 with a queue
- **Context:** Large audiences would overwhelm a per-viewer physics scene.
- **Decision:** One avatar marble per viewer; 24 active; overflow queued as reinforcements.
- **Rationale:** Preserves the join cinematic and personal presence while protecting FPS.
- **Alternatives:** Champion-per-team only; higher cap with reduced detail.

## D-006 — Teams 2–12, configured by the streamer
- **Context:** Different streams want different roster sizes.
- **Decision:** Dynamic team count with a generated zone layout for any N.
- **Rationale:** Flexibility; the zone generator replaces the fixed 8-zone layout.
- **Alternatives:** Fixed 8 teams.

## D-007 — Join via number · ISO2 · EN · AR · emoji (fuzzy)
- **Context:** Viewers may not know the exact keyword.
- **Decision:** Accept all five forms with tolerant matching and Arabic normalization.
- **Rationale:** Maximizes successful joins from Arabic- and English-speaking audiences.
- **Alternatives:** Single keyword.

## D-008 — Gift-dominant scoring, fully tunable
- **Context:** Monetization is a primary goal.
- **Decision:** Gifts dominate; every weight is a debug slider.
- **Rationale:** Rewards gifting while keeping the streamer in control.
- **Alternatives:** Balanced; viewer-count dominant.

## D-009 — Timed 3-minute rounds, auto-loop with manual override
- **Context:** Live streams need a repeatable cadence.
- **Decision:** 3:00 round + ~20 s intermission, auto-loop, manual controls always available.
- **Rationale:** Predictable pacing; streamer can take over anytime.
- **Alternatives:** Streamer-controlled only; endless match.

## D-010 — Server JSON stores + localStorage fallback
- **Context:** Flags, mappings and winners must survive restarts.
- **Decision:** Atomic on-disk JSON, mirrored to localStorage when offline.
- **Rationale:** Durable and resilient.
- **Alternatives:** localStorage only; server only.

## D-011 — Frontend stays dependency-light; bridge adds server deps
- **Context:** The frontend previously had zero runtime deps.
- **Decision:** Frontend adds only `socket.io-client`; the server adds express/socket.io/connector/ws.
- **Rationale:** Keeps the client bundle small while enabling the bridge.
- **Alternatives:** React ecosystem; CDN-only socket client.

## D-012 — Tikora via `tikora.manifest.json` + hub-client relay
- **Context:** Tikora routes effects declared by a manifest.
- **Decision:** Publish our effect list and consume mapped effects over the hub relay.
- **Rationale:** Interoperability with Tikora's Game Hub without a hard dependency.
- **Alternatives:** Skip Tikora.

## D-013 — Modern toolchain (Vite 8, Vitest, ESLint flat config)
- **Context:** The original dev dependency was Vite 5 with known `esbuild` advisories.
- **Decision:** Upgrade to Vite `8.3.1`, add Vitest for unit tests and ESLint (flat config) as the
  code-health gate, and add `@eslint/js`.
- **Rationale:** Clears all `npm audit` advisories (0) and provides the lint/test gates required by
  [GUARDRAILS.md](./GUARDRAILS.md); Node 24 supports the new major.
- **Alternatives:** Stay on Vite 5 (vulnerable); skip lint/tests (fails the definition of done).

## D-014 — Bridge event source abstraction + TikFinity in Phase 1
- **Context:** TikFinity was planned for Phase 8, but the adapter is small and was needed to prove
  the fallback path.
- **Decision:** Ship `directBridge` and `tikfinityBridge` together behind `connectionManager`; keep
  Tikora for Phase 8.
- **Rationale:** An early working fallback de-risks the source abstraction; no extra deps (`ws` already present).
- **Alternatives:** Defer all non-direct sources to Phase 8.

## D-015 — Shared `config/teams.json` + pure matcher
- **Context:** Teams must be editable by the streamer and match viewer input on the client.
- **Decision:** Keep one `config/teams.json` (read/written by the server, imported as the client
  default) and put all join matching in pure, unit-tested `src/teams.js`.
- **Rationale:** Single source of truth; the matcher is deterministic and testable without a browser.
- **Alternatives:** Separate client/server rosters; matching in the socket layer.

## D-016 — Client team registry with server sync + 3:2 flag normalization
- **Context:** Flags must look consistent and survive restarts/offline.
- **Decision:** `teamRegistry.js` syncs via `GET/PUT /api/teams` and mirrors to localStorage; uploaded
  flags are cover-cropped to **3:2** (`imageUtils.js`) before the server validates and stores them.
- **Rationale:** Consistent presentation, durable data, resilient offline behaviour.
- **Alternatives:** Store raw uploads (inconsistent aspect); server-side crop (needs an image lib).
