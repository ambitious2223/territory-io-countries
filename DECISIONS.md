# DECISIONS.md — Decision Log

Format: **D-xxx — Title**, with Context · Decision · Rationale · Alternatives.

---

## D-040 — Cinematic performance: blur opt-in, cached nation outlines
- **Context:** Owner: "automatic zoom or cinematic is making the game look so laggy." Two causes:
  `ctx.filter = blur(6px)` re-blitting the whole 1200×800 canvas every frame during the intro,
  and `drawBorders` re-scanning 1536 tiles × 8 nations + re-tracing outlines each frame.
- **Decision:** `Camera.blurScale` defaults to **0** (the intro now uses a cheap 0.32-alpha veil
  rect; the debug slider opts back into blur). Borders are **cached**: `paintTile` sets
  `outlinesDirty`, `rebuildOutlines()` stores traced loops per nation plus a browser `Path2D`
  (`outline.buildPath`, `null` when `Path2D` is unavailable → per-frame stroke fallback), and
  `drawBorders` strokes the cache.
- **Rationale:** Both were per-frame costs with no per-frame input; ownership is the only thing
  that invalidates geometry.
- **Alternatives:** Downscale offscreen blur (complex); throttle outline rebuild (still pays
  re-trace); remove the cinematic entirely (it's a loved feature).

## D-039 — Looser join matching (words, Arabic articles, scaled typos)
- **Context:** Owner: Arabic comments were hard to match; first parts of names and misspellings
  should count. Audit showed Arabic was exact-only (excluded from fuzzy/prefix), no word-level
  match, no `ال` handling, one uniform threshold.
- **Decision:** Candidate keys = EN + AR + aliases + article-stripped Arabic; passes run
  exact → **any-word** → **prefix** → **length-scaled Levenshtein** (1/2/3 by target length,
  ≤-length pre-filter) over full names and their words; emoji/number/ISO unchanged.
- **Rationale:** Chat comments are noisy (`مصر ❤️`, `أنا من مصر`, `الامارت`); thresholds scale so
  short lookalikes (`iran`/`india`) stay rejected.
- **Alternatives:** Strict equality (unusable in Arabic chat); synonym tables per nation (manual
  upkeep); pure substring `includes` (too loose: `in` → india).

## D-038 — Half-arena join guide + rotating gameplay tips
- **Context:** New stream viewers (and testing sessions) don't know how to join; static banners
  are either too small to notice or hog the arena.
- **Decision:** A **join guide covering 50 % of the arena** (`JOIN_GUIDE_SHARE: 0.5`, rounded
  glass card, numbered steps + chips for every nation) shows on **each round start**, auto-hides
  after 10 s and is always dismissible with ✕. **Rotating top-strip tips** fire once per milestone
  per round (first join, first gift, halfway, final 30 s), queueing at 6 s each. Both master
  switches live in **debug → Advanced → Guide & Tips** and persist (`twf.guide`/`twf.tips`);
  "Show now" re-opens the guide on demand. Rendering + hit-testing live in one module
  (`src/onboarding.js`), driven by a round-state observer.
- **Rationale:** Onboarding without obstructing play; everything dismissible and streamer-controlled.
- **Alternatives:** Permanent help panel (cluttered); DOM overlay (misses canvas scaling);
  sidebar instructions (invisible on stream layouts).

## D-037 — "Skip pick-a-side" testing bypass
- **Context:** The pick-a-side prompt (D-034) is right for real viewers but blocked debugging —
  injected gifts sat held until timeout and the effect dropped.
- **Decision:** `CONFIG.PROMPT_BYPASS` (persisted checkbox in debug → Advanced → Mock Event,
  **default off**) short-circuits the prompt: an unaffiliated activator's effect resolves to
  `pickBypassTeam` (explicit teamId → least-loaded nation) and the user is registered via
  `scoring.registerUser`, so follow-up effects hit the same team. Real flow unchanged when off.
- **Rationale:** One toggle, obvious defaults: viewers still get the prompt; testers don't wait
  20 s per injection.
- **Alternatives:** Auto-bypass for mock-sourced events only (breaks hub ▶Run testing); shorten
  the timeout (still drops the effect).

## D-036 — Complete Arabic, text-only switch (no layout mirroring)
- **Context:** The switch to Arabic set `document.dir = 'rtl'`, which **reordered the whole UI**;
  several surfaces were also still English-only (round states, map/mode/mock options, effect and
  floating-VFX texts, scoring weights, team names on canvas/leaderboard/cinematic, the overlay).
- **Decision:** `applyLanguage` now always keeps `dir="ltr"` — the language switch translates
  **text only, never positions**. Everything above was moved onto the dictionaries (round, map,
  mode, mock, `effect.*` ×12, `vfx.*` ×12, scoring ×6, placeholders, viewer/winner fallbacks);
  team labels resolve through `teamLabel(team, getLanguage())` everywhere, and the overlay
  payload carries `nameAr` with `?lang=ar`/localStorage-driven `setLanguage()`. Enforced by
  `tests/i18n.test.js` (key parity, `data-i18n` markup scan, dynamic key families, `dir=ltr`).
- **Rationale:** Owner decision — fixed geometry/OBS layouts must not jump when translating;
  "total translation" means every visible string.
- **Alternatives:** Keep RTL mirroring (rejected — positions must not change); ship Arabic only
  for the sidebar (rejected — half-translated UI reads as broken).

## D-035 — Twelve-effect power-up catalog; manifest as single source of truth
- **Context:** The hub was asked to control every power-up, but the game declared only six effects
  and `mappings.js` carried a second hardcoded copy of the list.
- **Decision:** Added **freeze** (enemy soldiers stop — movement control, no damage), **shield**
  (nation's tiles unclaimable for N s; respected by bombs/enclosures/claims; white dashed border),
  **team_speed**, **claim_storm** (shuffled frontier sweep, capped), **mega_bomb** (radius ≤ 8),
  **summon** (1–8 photo-carrying allies). `tikora.manifest.json` now holds all 12 and **derives**
  `EFFECT_OPTIONS` for the mappings UI; `tests/manifest.test.js` fails on drift. Every hub-supplied
  param is clamped (`EFFECT_*_MAX`). Freeze/shield are control/border effects, consistent with the
  fixed "no combat, territory only" rule.
- **Rationale:** One list, three consumers (game executor, mappings UI, hub UI); clamps protect the
  round economy from bad mapping values.
- **Alternatives:** Freeze as a board-only pickup (hub couldn't map it); shield bypassing bombs
  (removes the counter-play); clamping in the hub only (game must stay safe standalone).

## D-034 — Pick-a-side prompt + effects carry the activator's identity (game + hub)
- **Context:** Effect-spawned soldiers used the team name and a blank avatar; a gift from someone
  who hadn't joined a nation did nothing; the hub stripped `avatar/name/userId` from the effect
  event it already receives.
- **Decision:** The effect `event` is forwarded whole (game) and the hub now sends
  `avatar/name/userId` (companion hub commit). `giftEffects` builds soldiers via
  `activatorProfile()`. Non-members get a **"Pick a side!"** pop-up (photo + nickname, EN/AR) and
  the effect is **held in a queue** (`src/joinPrompt.js`), fired on their join, dropped after
  `JOIN_PROMPT_TIMEOUT` (20 s). Both effect paths (hub + in-game mappings) funnel through
  `executeEffect`, so the rules are identical.
- **Rationale:** Gifts should visibly belong to a person, and "supporting" a team before picking
  one makes no sense — the prompt turns a no-op gift into a join driver.
- **Alternatives:** Skip non-member gifts (wasted revenue); auto-join them silently (decides for
  the viewer); show the prompt without holding the effect (inconsistent).

## D-033 — Tracking auto-zoom + black/white contrast outline
- **Context:** The join cinematic locked onto the spawn point while the soldier was already moving
  away, could not be disabled, and team-colour ball rings vanished on the team's own territory.
- **Decision:** The cinematic **follows the marble's live position** during focus/hold
  (`track` ref); a persisted **Auto-zoom toggle** (debug → Cinematic, `CONFIG.AUTOZOOM_ON_JOIN`)
  gates it (join sound still plays); ball outline = **black outer ring + white inner ring**, keeping
  team glow/tint for ownership.
- **Rationale:** Follow = you actually see the new viewer's soldier; black/white contrasts against
  *every* background while tint/glow still say "belongs to nation X".
- **Alternatives:** Complementary-hue ring (clashes with some enemy colours); longer static focus
  (still stale); no toggle (streamers want camera control).

## D-032 — Finer grid, slow base speed with live control, durations in seconds
- **Context:** On 384 tiles a single soldier ate percentages almost instantly, the default pace was
  fast, and TikTok interactions were supposed to grant speed — but `POWERUP_OVERCHARGE_DURATION`
  (6.0) was decremented by frame-dt, so overcharge lasted **0.1 s**, the capture hold ~40 ms,
  power-ups spawned every ~0.15 s and the claim-SFX throttle never engaged.
- **Decision:** Grid **48×32 @ 25 px** (1536 tiles, one touch = 0.065 %) with compensations keeping
  the physical look (base 8×8, map walls as 2×2 blocks, outline 3 px / radius 0.4, ball radius 11,
  color-bomb radius 4, territory score weight ÷4). `MARBLE_SPEED` 1.9 → **1.1** with a persisted
  **live Soldiers slider** (0.5–3.0) that rescales balls already on the field; overcharge ×2.2.
  All second-based duration accumulators normalize `dt / 60` (matching cinematic/vfx/camera).
- **Rationale:** Finer tiles make expansion earned instead of instant; a slow baseline makes
  interaction-earned speed the main lever; seconds-vs-frames normalization makes every existing
  duration constant mean what its docs say.
- **Alternatives:** Keep 50 px and slow growth only via ball speed (still lumpy at 384 tiles);
  convert constants to frame counts (opaque, fps-fragile).

## D-031 — Capital size slider, capitals above fighters, auto-saving teams
- **Context:** The streamer wanted a per-nation capital size, clear visual layering (capitals not
  buried under balls), a readable country-name label, and team edits persisted without clicking
  Save.
- **Decision:** `capitalScale` lives in the teams config (server-persisted, slider in the Teams tab,
  0.5x–2.5x) and scales the medallion, emoji and name pill in `bases.js`. Render order is grid →
  powerups/particles → **balls → capitals** → event text. Name banner = dark rounded pill +
  team-colour border + shadowed bold text. Team edits **auto-save** 1.5 s after the last change
  (`TEAMS_AUTOSAVE_MS`) with a `beforeunload` flush.
- **Rationale:** Focus-preserving saves required splitting panel listeners from game listeners in
  `teamRegistry` (a panel re-render would recreate the text inputs mid-typing); the game still
  learns about edits on each save. Capitals above balls matches "stronghold as a place".
- **Alternatives:** Notify listeners on save and accept focus loss; keep manual Save only; scale
  capitals per team (unnecessary — one streamer preference).

## D-030 — Stronghold team photo + ball team identity; live upload; lean debug menu
- **Context:** Uploading a team photo appeared to do nothing (the registry never notified after
  upload, and the stronghold drew the emoji/letter, never the photo). In play, the viewer's TikTok
  avatar is the ball, so team ownership needed a clear, non-clashing cue.
- **Decision:** (1) `uploadFlag` notifies so uploads apply live, with a thumbnail/status in the team
  row. (2) Strongholds render as a **3D circular medallion** with the team photo clipped in
  (`src/bases.js`). (3) Balls keep the viewer avatar and add a **team-colour ring + glow + light
  tint + nameplate**. (4) The debug panel is regrouped to Connection · Teams · Overlay · Advanced.
- **Rationale:** The photo has an obvious home; the ball reads as a person *and* a nation; the debug
  panel shows only everyday controls.
- **Alternatives:** Tint-only (weak at 30 px); team colour replacing the avatar (loses identity);
  keep the flag only in the leaderboard (no in-world ownership).

## D-029 — Hardwired Chic Aura Hub (Tikora) identity; hub owns the controls
- **Context:** Connecting the game to the hub required pasting a `gk_…` key and relay URL into the
  in-game debug panel. The hub already launches the game and injects `TIKORA_GAME_SLUG` /
  `TIKORA_GAME_KEY` / `TIKORA_RELAY_URL` / `TIKORA_GAME_LAUNCH_URL`, and the bridge looked for the
  wrong variable names (`TIKORA_KEY`/`TIKORA_SLUG`).
- **Decision:** Resolve identity automatically (`server/tikoraIdentity.js`): env → launch-URL query →
  legacy `TIKORA_*` → saved config → manifest. `countriesio.bat` opens `TIKORA_GAME_LAUNCH_URL`
  when set. The client auto-connects on boot. **Remove the manual key/relay inputs and
  Connect/Disconnect** from the debug panel (read-only status only) and drop `POST /api/tikora/config`.
  Activating/deactivating and effect mapping live entirely in the hub.
- **Rationale:** Zero setup, one source of truth, and no split-brain between the hub and the game.
- **Alternatives:** Keep manual key entry as the primary path (the status quo the user rejected);
  subscribe to hub control events in-game (unnecessary — the hub already gates delivery).

## D-028 — One minimal leaderboard everywhere; no conquest feed
- **Context:** The overlay rendered two columns (leaderboard + conquest feed) and the main game had
  left **Nations** and right **Conquest** sidebars. Rows also wrapped (a 5-column grid rendered 6
  cells) and the header stretched wider than the list, making the overlay hard to read.
- **Decision:** Keep a **single minimal live leaderboard** (`rank · flag · name · territory %`).
  Remove the conquest feed from the overlay *and* the main game. The overlay is one column whose
  header (state + timer) matches the list width; it stays transparent for OBS with a text shadow so
  it also reads on white. Delete `src/feed.js`, the `sidebar.conquest`/`feed.*` strings and the
  unused `tf()` helper; drop `feed`/`viewers` from the overlay payload.
- **Rationale:** Matches the streamer's "live leaderboard is enough"; one source of truth for
  standings; removes the wrapping/width bug and dead code.
- **Alternatives:** Keep the feed on the main game only (still two lists); keep viewers as an extra
  column (rejected as non-minimal).

## D-022 — Tikora is an effect hub, not a bridge chat source
- **Context:** Docs listed Tikora beside Direct/TikFinity as a chat source with a `tikora` connection
  mode, but `connectionManager` never implemented that mode and Tikora only delivers mapped effects.
- **Decision:** Remove `tikora` from `server/constants.js` `MODES`; the bridge chat sources are
  `auto | direct | tikfinity | mock`. Tikora runs in the client (`src/tikora.js`) via the served
  `hub-client.js`, independently of the active chat source.
- **Rationale:** Matches shipped behaviour; avoids a phantom mode that silently fell back to Direct.
- **Alternatives:** Implement a status-only `tikora` mode (ambiguous; carries no chat events).

## D-027 — Leaderboard overlay delivered over the bridge relay
- **Context:** The streamer wants a second OBS browser source showing a styled live leaderboard,
  conquest feed and timer. The game is client-side, so a second page has no shared state.
- **Decision:** The main game (the authority) emits a serialisable snapshot (`overlay:state`, ~4 Hz)
  over its existing bridge socket; `server/index.js` relays it as `overlay:leaderboard`, caches the
  latest, and replays it to newly connected sockets. `leaderboard.html` is a **display-only**
  subscriber (`src/overlay/leaderboard.js`) that never runs the engine. Styles/params via URL.
- **Rationale:** Works across separate tabs, browsers, OBS sources and machines; the bridge already
  fronts every client; caching removes the "empty until next tick" flash.
- **Alternatives:** BroadcastChannel/localStorage (same-browser only); running a second engine.

## D-026 — Rounded union nation outlines
- **Context:** Per-tile border seams read as a noisy grid rather than clean borders.
- **Decision:** `src/outline.js` traces each nation's tile mask with marching squares, then
  `strokeLoops` draws one continuous path with explicit rounded corners (clamped corner radius).
- **Rationale:** Crisp, curved borders; pure geometry so it is unit-tested off-canvas.

## D-025 — One-touch capture with a short post-capture hold
- **Context:** Two-hit neutral conversion left half-converted tiles rendering as floating inset
  squares — visually cluttered — and border tug-of-war flickered.
- **Decision:** A single contact captures any non-owned tile. The captured tile is **held** for
  `TILE_HOLD_TIME` (~2.5 s) during which no other colour can retake it; holds expire off a grid
  clock (`grid.tick`). The convert meter is removed entirely.
- **Rationale:** Matches "one hit is enough", removes the clutter source, and the hold keeps enemy
  borders stable without slowing the initial land-grab.
- **Alternatives:** Instant capture with no hold (flickery borders); neutral 1 / enemy N hits
  (reintroduces per-tile progress visuals).

## D-024 — Confined ricochet balls; contact-accumulated conversion
- **Context:** Balls that marched to the frontier one tile at a time drifted far from their base and
  left ragged, intermingled borders — it still read as a mess.
- **Decision:** A ball is a **puck confined to its nation**. `Grid.blocksAt` treats every tile the
  ball does not own (neutral, enemy, wall) as solid; the ball moves in a straight line, and on each
  contact it adds a chunk to that tile's convert meter and **reflects** (axis-aligned bounce + a
  small random-angle jitter). Balls never leave their nation and never pass through each other;
  a ball stranded by a flip is snapped to the nearest owned tile. Faster balls hit more often and
  more balls cover more border, so speed and viewer count drive expansion.
- **Rationale:** Keeps every territory self-contained with crisp borders (the user's goal), makes
  the border a physical wall, and preserves slow-convert as **accumulated hits**.
- **Alternatives:** Yo-yo return-to-base trips; splix trail+fill; paper.io continuous paint.

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
