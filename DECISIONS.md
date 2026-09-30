# DECISIONS.md — Decision Log

Format: **D-xxx — Title**, with Context · Decision · Rationale · Alternatives.

---

## D-022 — Tikora is an effect hub, not a bridge chat source
- **Context:** Docs listed Tikora beside Direct/TikFinity as a chat source with a `tikora` connection
  mode, but `connectionManager` never implemented that mode and Tikora only delivers mapped effects.
- **Decision:** Remove `tikora` from `server/constants.js` `MODES`; the bridge chat sources are
  `auto | direct | tikfinity | mock`. Tikora runs in the client (`src/tikora.js`) via the served
  `hub-client.js`, independently of the active chat source.
- **Rationale:** Matches shipped behaviour; avoids a phantom mode that silently fell back to Direct.
- **Alternatives:** Implement a status-only `tikora` mode (ambiguous; carries no chat events).

## D-023 — Conquest redesign: home bases + slow border convert; swords removed
- **Context:** The sword/marble arena read as chaos — every ball path-found to a frontier tile,
  stood in a claim ring, got interrupted, while orbital blades spun and kills fired whole-map
  conversion waves. There was no stable "home" and no continuous border.
- **Decision:** Rebuild the loop around **home bases + adjacent slow-convert**. The arena starts
  neutral; each nation has a compact base and balls pour out, converting adjacent tiles over time
  so borders creep and get eaten. Remove `combat.js`, `sword.js`, `territory.js`, `ai.js` and all
  HP/knockback/kills. Add `feed.js` (conquest feed) and per-nation base banners. Rounds are won by
  **most territory** (or 65% domination); a nation at zero tiles is **eliminated**.
- **Rationale:** Reads clearly on a stream, makes ball count and movement/conversion speed the
  levers the streamer asked for, and removes noisy micro-combat.
- **Alternatives:** Keep swords as a secondary layer; paper.io continuous paint; splix trail+fill.

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

## D-003 — Bridge chat sources + auto-connect; Tikora as a client-side effect hub
- **Context:** Reference apps use direct `tiktok-live-connector`, a TikFinity fallback, and a Tikora hub.
- **Decision:** Support **Direct + TikFinity chat sources plus Mock** (auto-fallback) on the bridge,
  each with debug controls; integrate **Tikora as a client-side effect hub** (not a chat source).
- **Rationale:** Robustness (fallback) and compatibility (Tikora/Stream Deck users) without treating
  Tikora as something it is not — it only routes mapped effects.
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

## D-021 — Tikora hub via manifest + served hub-client, shared effect executor
- **Context:** Tikora routes streamer-mapped effects to games; the reference app declares a manifest
  and loads Tikora's own `hub-client.js`.
- **Decision:** Declare effects in `tikora.manifest.json`; load `hub-client.js` from the relay at
  runtime (no bundled protocol); route received effects through the same `executeEffect` used by
  gift mappings; ack each effect. Config lives in `.tiktok-config.json` (+ env), with auto-connect.
- **Rationale:** Zero dependency on Tikora internals; one effect executor keeps behaviour consistent.
- **Alternatives:** Reimplement the Tikora protocol; separate effect paths.

## D-020 — Declarative gift→effect mappings with a pure matcher
- **Context:** Gifts must drive power-ups, configured by the streamer without code changes.
- **Decision:** Store ordered rules in `config/mappings.json` (`giftName` contains / `giftId` /
  `minCoins` → effect + params); match with a pure `matchMapping` (first match wins); execute via a
  registry (`giftEffects.js`) that targets the gifter's team marble (spawning one if needed).
- **Rationale:** Data-driven and testable; the same registry can later back the Tikora manifest effects.
- **Alternatives:** Hardcoded gift handling; per-gift code branches.

## D-019 — Combined-score rounds with gift-dominant weighting
- **Context:** The streamer wants timed rounds decided by territory **plus** interaction, with gifts
  dominant and everything tunable.
- **Decision:** `ScoringEngine` blends interaction (gifts × coins, likes, unique comments, one-time
  follow/share) with territory (tiles × weight); `RoundManager` drives countdown → playing →
  intermission and auto-loops, with manual override. Winner = highest combined score at time-up.
- **Rationale:** Matches the fixed decisions; keeps gameplay engine and scoring independent/pure.
- **Alternatives:** Territory-only; gift-only (ignores non-payers).

## D-018 — Camera transform + queued join cinematic
- **Context:** The camera only did screen shake; the request wants a cinematic zoom to each new
  viewer showing their profile photo, with a blur control.
- **Decision:** Give the camera a single world transform (focus + zoom + shake) applied to world
  layers only; drive it from a `JoinCinematic` queue that focuses a spawn, holds, then returns.
  Blur is applied to the world draw via `ctx.filter` (not the HUD).
- **Rationale:** One transform keeps rendering simple; HUD stays crisp; sequential queue prevents
  multiple joins from fighting over the camera.
- **Alternatives:** Per-entity cameras; DOM-based intro (can't sample the canvas position).

## D-017 — Generic team zone layout + separate bot/viewer accounting
- **Context:** The engine had a hardcoded 8-zone layout and 8 named marbles.
- **Decision:** Generate contiguous zones for any team count (`src/zones.js`); marbles are created
  from viewer/bot profiles via `ViewerManager`, and the viewer cap counts **viewers only** (bots
  are spawned by AI fill to keep empty teams alive and do not consume the cap).
- **Rationale:** Supports 2–12 teams, keeps the arena lively when few viewers join, and protects the
  performance budget by bounding viewer avatars.
- **Alternatives:** Keep the fixed 8-zone layout; cap viewers and bots together.

## D-016 — Client team registry with server sync + 3:2 flag normalization
- **Context:** Flags must look consistent and survive restarts/offline.
- **Decision:** `teamRegistry.js` syncs via `GET/PUT /api/teams` and mirrors to localStorage; uploaded
  flags are cover-cropped to **3:2** (`imageUtils.js`) before the server validates and stores them.
- **Rationale:** Consistent presentation, durable data, resilient offline behaviour.
- **Alternatives:** Store raw uploads (inconsistent aspect); server-side crop (needs an image lib).
