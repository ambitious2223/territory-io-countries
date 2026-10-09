# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project aims to follow [Semantic Versioning](https://semver.org/).

## [2.19.0] - 2026-10-08

### Added — win celebration (D-041)
- Replaces the flat DOMATION toast with a full-screen **canvas celebration** over the kept colour
  sweep: **pooled confetti** (winner colours + gold/white + pieces clipped from the winner's flag)
  bursting from the centre then raining ~10 s; a **flag medallion** popping in (photo/emoji);
  **VICTORY** + localized winner name + stat line (tiles · % · duration · reason); and a staggered
  **podium** — top-3 nations (rank · flag · name · %) plus the **overall top-3 supporters** with
  avatar, nickname, score and a nation-colour ring. Fades in, lives through intermission, clears
  on round reset.
- **Sound design**: layered victory fanfare + **confetti burst** (band-passed noise), a **reveal
  pop** when the medallion lands, and a three-bell **podium chime** — all procedural, panned,
  voice-capped.
- `ScoringEngine` now tracks **per-viewer contributors** (`topContributors()`).

## [2.18.0] - 2026-10-08

### Added — streamer manual camera + nation jumps
- **Manual camera** (`src/cameraControls.js`): **click** a map spot to focus (1.8×), **click a
  soldier** to follow them, **mouse wheel** zooms toward the cursor (1×–3×, clamped), **drag** pans.
  Keyboard: **arrows** pan, **+/-** zoom, **0**/**Esc** reset. Any manual input cancels the running
  auto-zoom cinematic (auto-zoom re-arms on the next join); a yellow toast confirms the mode.
  The camera **stays where you put it until you reset** — nothing snaps back on its own.
  A dead followed soldier auto-resets the view.
- **Camera section** (debug → Connection): **Arena** (reset), **Leader** (jump to the leading
  nation's capital) and one **chip per nation** to jump to its capital at 1.6×.
- Note: WASD was deliberately skipped — `D` is already bound to the debug panel; arrows own panning.

## [2.17.0] - 2026-10-08

### Changed — modern glass debug menu
- The debug panel is now a **glass card**: 380 px, translucent blur (`backdrop-filter`), 18 px
  radius, cyan hairline border, section **cards** with collapsible headers (click a heading),
  pill tabs with a glow, glassmorphic gear FAB. Drag / collapse / position persistence unchanged.
- **Modern controls** (all IDs unchanged): status **pills** with coloured dots (bridge/tikora
  online/error), **toggle switches** (AI Fill, guide/tips/hint, skip pick-a-side), a **segmented
  control** for Auto/Direct/TikFinity/Mock, a **meter bar** for viewers vs cap, and a value chip on
  the blur slider.
- Debug CSS moved out of `index.html` into **`src/debugPanel.css`**; ~280 lines of dead CSS
  (legacy `.lb-*`, `.mapping-*`, old panel styles) removed.
- New markup-guard test (`tests/debugPanel.test.js`) pins every wired id so markup/JS can't drift.

## [2.16.0] - 2026-10-08

### Removed — gift mapping is hub-only
- The in-app **Gift Mappings** feature is gone end-to-end: the editor UI (Advanced tab), the
  matcher (`src/mappings.js`), the store + `config/mappings.json`, `GET/PUT /api/mappings`, and the
  runtime gift branch in `handleBridgeEvent`. **The web app no longer declares or controls any
  gift→effect wiring** — `tikora.manifest.json` stays as the single declaration the hub reads, and
  the hub's Trigger→Effect mapper is the single place to wire gifts and free triggers (D-045).
- Gift events still play their sound and feed interaction scores; effects arrive **only via the
  hub**. (Accepted consequence: Mock/offline gift injects no longer fire effects.)

## [2.15.2] - 2026-10-08

### Changed — join messaging: names only
- The permanent hint is now a **single clean line**: `COMMENT YOUR COUNTRY NAME TO JOIN!` /
  `علّق اسم دولتك للانضمام!` — the vague formats line (code · number · flag emoji) is removed.
- The round-start **How to Join** card drops its code/number/flag step as well (two steps now):
  comment your country name → most territory wins. The matcher still *accepts* codes/numbers/flags
  — only the messaging is simplified. EN/AR parity kept (key-parity test).

## [2.15.1] - 2026-10-08

### Changed
- **Join hint relocated off the map.** The permanent instruction is now a centered DOM strip in
  the empty band **between the control bar and the arena** (CSS gold text with a black outer
  stroke) instead of covering bottom-left map tiles. The canvas-drawn version (and its fit-to-width
  code) is gone; the persisted **Join hint** switch and EN/AR strings are unchanged.

### Removed
- **Canvas debug overlay** (`src/debug.js`): the FPS/frame-time graph, particle & tile-ownership
  boxes, velocity arrows, hitbox circles and grid overlay that painted over the arena whenever the
  debug panel opened. The panel's **Performance** section already shows these stats as text —
  opening the debug menu now draws nothing on the map. Dead `DEBUG_FPS_*` constants dropped.

## [2.15.0] - 2026-10-08

### Added
- **Reset Players button** (top bar, right beside **Start**): wipes the human roster, their queued
  slots, their soldiers on the field, and their registrations/prompts in one click — so the next
  match starts with **zero returning players** and everyone must comment to join again. AI bots
  and effect-summoned soldiers survive, so the arena is never empty; teams left human-less are
  refilled by AI within its normal interval. EN/AR label.

## [2.14.0] - 2026-10-08

### Added
- **Permanent join hint** — always-on instruction text in the bottom-left screen lane (the empty
  region: top-centre tips, bottom-centre cinematic/prompt and the centre guide never overlap it):
  big bold **gold text with a black outer stroke** on a subtle dark plate —
  `COMMENT YOUR COUNTRY TO JOIN!` + the accepted formats line. Auto-fits the width (shrinks only
  itself if the line is long), never resizes or moves any other component. EN/AR.
  Toggle: debug → Advanced → Guide & Tips → **Join hint** (persisted, on by default).

## [2.13.0] - 2026-10-08

### Fixed — hub effects delivered but not activating (root causes from the hub's own effect log)
Investigation proved the hub **did** deliver (`effect_log` shows `delivered` to the game socket)
and the failure was inside the game:
- **Registrations survive round resets** — `resetRound()` re-registers every known viewer under
  *both* their `userId` and `username` (previously `scoring.reset()` wiped them, so round-≥2 gifts
  found no team).
- **Multi-key team resolution** for effects: `teamId` → `teamOf()` over userId **and** username →
  the viewer roster's team → only then the pick-a-side prompt (previously a username-vs-userId
  mismatch silently dropped effects into the prompt).
- **Known viewers resolve prompts** — a chat from someone already in the roster now re-registers
  and resolves their queued effect instead of leaving it to expire.
- **Prompt items age from creation** (a queued item can no longer wait forever), and every drop is
  counted instead of being silent.

### Added — effect telemetry (debug → Connection → Tikora)
- `Effects` (count received) and `Last effect` (`<key> · applied|queued|dropped|unknown · queue N ·
  dropped N`) so the next live test shows exactly where a gift lands; every hub effect also logs to
  the console.

### Fixed — stranded rounds
- If the round ever lands in `IDLE` while **Auto** is on (e.g. End pressed during the countdown),
  it now restarts the countdown instead of leaving the arena frozen.

## [2.12.0] - 2026-10-08

### Changed — much looser join matching
- Arabic names/aliases are now included in the **prefix and fuzzy passes** (previously exact-only),
  with the definite article (`ال…`) treated as optional on both sides.
- **Any word in the comment counts**: `مصر ❤️`, `I choose EGYPT 🎉`, `أنا من مصر`, or the first
  word of a multi-word name (`united` → United Arab Emirates) all join.
- Length-scaled typo tolerance (≤1 for 4–5 letters, ≤2 for 6–9, ≤3 for 10+), applied per word and
  per full name — so `الامارت` → الإمارات and `brzl` → Brazil count, while lookalikes
  (`iran` ≠ india) still don't.

### Fixed — cinematic lag
- The join cinematic's full-canvas `ctx.filter` **blur is off by default** (it forced an expensive
  GPU blit every frame while zooming) — replaced with a cheap dark veil. The blur slider in
  debug → Advanced → Cinematic can still opt back in.
- Nation borders are **cached**: traced loops + `Path2D` are rebuilt only when ownership changes
  instead of re-scanning 1536 tiles × 8 nations every frame (`grid.rebuildOutlines()`).

## [2.11.0] - 2026-10-08

### Added
- **Big "How to Join" pop-out (50 % of the arena)** — a half-arena card at **every round start**
  with 3 numbered steps and chips for every nation (flag + localized name). Auto-hides after 10 s,
  always has a **✕**, and can be re-triggered/disabled from **debug → Advanced → Guide & Tips**
  (persisted).
- **Rotating contextual gameplay tips** (top strip, each with ✕): first viewer join, first gift
  effect, halfway, final 30 s — one per milestone per round, queueing and rotating every 6 s.
  Master switch persisted next to the join guide.

## [2.10.0] - 2026-10-08

### Added
- **"Skip pick-a-side" testing toggle** (debug → Advanced → Mock Event): when on, an effect from
  someone without a nation applies immediately to the **least-loaded nation** (and registers them
  there so follow-up effects hit the same team) instead of showing the join prompt. Persisted across
  restarts; **off by default**, so real viewers still get the prompt. Fixes prompt-driven drag
  during mock-injection / hub ▶Run testing.

## [2.9.0] - 2026-10-08

### Changed
- **Language switch no longer mirrors the UI.** Arabic now changes **text only** — `dir` stays
  `ltr`, so nothing on screen ever changes position (fixed decision D-036; supersedes the earlier
  "full Arabic + RTL" wording in the docs).

### Added — total Arabic coverage
- Translated everything that was still hardcoded English: round states (IDLE/GET READY/LIVE/…),
  map names, connection modes, mock event types, **all 12 effect labels** (mappings dropdown) and
  **all floating VFX texts** (`+N TILES!`, DOMINATION!, ELIMINATED!, per-effect toasts), scoring
  weight labels, input placeholders, FAB tooltip, and the `Viewer`/`Winner` fallbacks.
- **Team names are localized everywhere**: stronghold banners, capital letters, leaderboard,
  join cinematic, effect identities, bot names, debug tile list — plus `nameAr` in the overlay
  payload; the overlay reads `?lang=ar` (or the saved language) and shows Arabic names/title/round
  labels.
- New `tests/i18n.test.js` guards it: EN↔AR key parity, every `data-i18n` key in markup exists,
  all dynamic key families present, `dir` stays `ltr` in both languages.

## [2.8.0] - 2026-10-08

### Added — full power-up catalog declared for the hub (12 effects)
- **Freeze** — stops every enemy soldier for N seconds (icy ring; movement only, no damage).
- **Shield** — hardens a nation's borders for N seconds: no other colour can capture its tiles
  (bombs, enclosures and frontier claims included). Shown as a **white dashed outline**; expires
  on its own clock.
- **Team Speed** — overcharge for the whole nation.
- **Claim Storm** — instantly claims up to N frontier tiles of your border.
- **Mega Bomb** — color bomb with a much bigger radius (max 8 tiles).
- **Summon** — spawns N allied soldiers carrying the activator's photo/nickname (1–8).
- All params are **clamped** to named config limits (`EFFECT_*_MAX`); pre-existing effects use the
  same clamped helpers.

### Changed
- **Manifest is the single source of truth**: `tikora.manifest.json` now lists all 12 effects and
  drives the in-game mappings dropdown (`EFFECT_OPTIONS` derives from it); a manifest-sync test
  fails if the game and the manifest ever drift. The hub picks all 12 up via manifest sync (restart
  Tikora or reconnect the game).
- Board power-up spawn list unchanged (overcharge, color bomb).

## [2.7.0] - 2026-10-08

### Added
- **Auto-zoom tracks the moving joiner**: the join cinematic now follows the soldier's live
  position during focus + hold (not the stale spawn point), with a persisted **Auto-zoom** toggle
  in the debug Cinematic section.
- **"Pick a side!" prompt**: when a gift/effect arrives from someone without a nation, an animated
  pop-up shows **their profile photo + nickname** asking them to comment a country; the effect is
  **held** and fires automatically once they join (20 s timeout). EN/AR.
- **Effect soldiers carry their activator**: spawned/affected soldiers use the gifter's **photo and
  nickname** instead of the team name. In-game gift mappings and hub effects both resolve team,
  photo and name the same way.

### Changed
- **Contrast outline**: soldiers now wear a **black outer ring + white inner ring** — readable on
  their own colour, neutral and enemy land alike; the team glow + tint still say which nation they
  belong to. Overcharge shows the inner ring yellow.

### Fixed (hub side, companion commit)
- The Tikora hub now forwards `avatar`, `name` and `userId` with each effect, so games can show who
  triggered it (previously stripped to gift metadata).

## [2.6.0] - 2026-10-08

### Changed
- **Fine-grained grid**: 24×16 @ 50 px → **48×32 @ 25 px** (384 → **1536 tiles**; each old square
  is now 4 small squares). One touch claims **0.065 %** instead of 0.26 %, so a lone soldier no
  longer snowballs percentages. Compensations keep the physical look: base **8×8** (same size),
  map walls drawn as **2×2 blocks** with full base clearance, outline 3 px / radius 0.4, color-bomb
  radius 4, soldier radius 11.
- **Slow default soldier speed**: `MARBLE_SPEED` 1.9 → **1.1**, with a new **live "Soldiers"
  speed slider** (Connection tab, 0.5–3.0, persisted, rescales balls already on the field).
  Overcharge multiplier 1.8 → **2.2** so interaction-earned speed clearly beats the base pace.

### Fixed
- **Duration constants were counting frames as seconds.** Overcharge lasted **0.1 s** instead of
  6 s, the capture hold ~40 ms instead of 2.5 s, power-ups spawned every ~0.15 s instead of every
  8–15 s, the claim-SFX throttle never engaged, the AI-fill interval never elapsed and the bounce
  flash never rendered. Normalized (÷60) in marble, grid, game, power-ups and viewerManager —
  matching the already-correct cinematic/vfx/camera timers.
- Territory score weight 0.5 → 0.125 so a 4× finer grid keeps score magnitudes comparable.

### Removed
- Dead constants `BASE_INSET`, `OUTLINE_SMOOTH_PASSES`.

## [2.5.0] - 2026-10-04

### Added
- **Capital size slider** (Debug → Teams): scales every stronghold medallion and its name banner
  from 0.5x to 2.5x (default 1.0x), persisted in the teams config (`capitalScale`).
- **Auto-save for teams**: any edit (name, colour, ISO, photo, capital size, add/remove team) is
  saved to `/api/teams` automatically **1.5 s** after the last change, with a flush on page close.
  The Save button remains as an instant save.

### Changed
- **Render layering**: strongholds now draw **above the balls** (fighters) and below floating event
  text — a capital is never covered by its own units.
- **Capital name banner** restyled: rounded dark pill with a team-colour border and bold white
  shadowed text, scaling with the capital slider.
- Team registry now keeps **panel listeners** (debug UI re-render) separate from **game listeners**:
  auto-saves update the running game live without stealing focus from the text fields.

## [2.4.1] - 2026-10-04

### Fixed
- **Team photo upload from the browser.** The Express REST API sent **no CORS headers**, so the
  app on `:1935` was blocked at preflight when posting to the bridge on `:3020` — choosing a file
  did nothing. Added a CORS middleware (`Access-Control-Allow-Origin` for allowed origins, handles
  `OPTIONS`) and a smoke assertion. This also unblocks the cross-origin teams/mappings/winners REST
  calls in dev (previously masked by localStorage fallbacks).

## [2.4.0] - 2026-10-04

### Added
- **Team photos in the stronghold.** Bases render as a **3D circular medallion** (radial-gradient
  disc, drop shadow, specular highlight, bright rim) with the uploaded team photo clipped inside;
  the emoji/letter is the fallback. Extracted to `src/bases.js`.
- **Ball team identity.** Each viewer ball now shows the TikTok avatar with a **team-colour ring +
  glow**, a **light team tint** (~22 %) on the photo, and a **team-colour nameplate** above it, so
  ownership is unmistakable while the face still reads.

### Fixed
- **Team-photo upload now updates live.** `uploadFlag` notifies subscribers after saving, so the
  editor and the running game refresh immediately (previously the new flag only appeared after a
  reload). The team row shows a thumbnail of the saved photo and an uploading/error state.

### Changed
- **Debug menu simplified.** Tabs are now **Connection · Teams · Overlay · Advanced**. The bulk of
  the tools (Mock, Viewers, Cinematic, Scoring, Winners, Gift Mappings, Performance, Particles,
  Tile Ownership) moved into a collapsed **Advanced** tab.

## [2.3.0] - 2026-10-04

### Changed
- **Hardwired to the Chic Aura Hub (Tikora).** The game resolves its hub slug/key/relay
  automatically — `TIKORA_GAME_SLUG` / `TIKORA_GAME_KEY` / `TIKORA_RELAY_URL` env, the
  `TIKORA_GAME_LAUNCH_URL` (`?game=&key=`) query, legacy `TIKORA_*`, saved config, then the
  manifest slug — and connects on boot. **No game key is pasted anywhere.**
- `countriesio.bat` opens `%TIKORA_GAME_LAUNCH_URL%` when the hub provides it (falls back to
  `http://localhost:1935`), so the hub's launch URL reaches the browser.
- The debug **Tikora** tab is **read-only** (status, game slug, relay). Activating/deactivating and
  mapping effects stay in the hub.

### Removed
- In-game Tikora key/relay inputs and Connect/Disconnect buttons; `POST /api/tikora/config`
  (`GET` now returns the resolved identity).

### Added
- `server/tikoraIdentity.js` (`resolveTikoraIdentity`, `parseLaunchUrl`) + tests.

## [2.2.1] - 2026-10-04

### Changed
- **Leaderboard overlay is now a single minimal leaderboard.** Rows are `rank · flag · name · %`
  only; the conquest feed column, the colour bar and the viewer count are gone. The header (state +
  timer) is fixed to the same width as the list, so the timer aligns with the column.
- Overlay stays **transparent by default** (OBS-ready) and now carries a text shadow so it reads on
  a white browser background too. `feed` URL param removed.
- **Conquest sidebar removed from the main game window** as well — the right-hand feed is gone and
  the canvas takes the space. The left leaderboard is reduced to `rank · flag · name · %`.
- Overlay payload no longer includes `feed` or `viewers`.

### Removed
- `src/feed.js` (`ConquestFeed`) and its i18n strings (`sidebar.conquest`, `feed.*`), plus the now
  unused `tf()` translation helper.

## [2.2.0] - 2026-10-04

### Changed
- **One-touch capture.** Any contact claims a tile outright — neutral or enemy. The two-hit
  convert meter (and its floating inset-square rendering, the main visual clutter) is gone.
- **Post-capture hold.** A freshly claimed tile is hardened for `TILE_HOLD_TIME` (~2.5 s) so a
  contested border can't flicker; the enemy must wait it out before retaking. A subtle freshness
  tint fades as the hold expires.
- **Rounded union outlines.** Nation borders are now traced with marching squares
  (`src/outline.js`) and stroked as one continuous rounded path instead of per-tile seams.
- **Quieter feedback.** Claim SFX is throttled and sparks reduced; enclosure fill runs once per
  frame per changed colour instead of per hit. Ball speed nudged to 1.9 px/frame.

### Added
- **Floating draggable debug button (FAB)** replaces the top-bar Debug button. Translucent,
  repositionable, click to open/close; position + open state persist. The `D` hotkey still works.
- **Tabbed debug panel** (Connection / Players / Content / Match / System) rebuilt in
  `src/debugPanel.js` + `src/debugFab.js`; markup moved out of `index.html`.
- **Live leaderboard overlay** at `/leaderboard.html` — standalone OBS browser-source page showing
  leaderboard, conquest feed and round timer, with URL params (`rows`, `feed`, `theme`, `bg`,
  `rtl`, `scale`). Served over a new bridge relay (`overlay:state` → `overlay:leaderboard`) with
  the last snapshot cached for late connections. Copy/Open link in the debug System tab.

### Removed
- `Grid` convert state (`convert[][]`, chunk constants) and the per-tile border renderer.

## [2.1.0] - 2026-09-30

### Changed
- **Balls are now confined pucks that ricochet off the border.** A ball never leaves its nation:
  any tile it does not own (neutral, enemy or wall) is solid, so it claims on contact and bounces
  back (axis-aligned reflection + a small angle jitter). This keeps every territory self-contained
  with crisp borders instead of ragged tendrils.
- Capture is now **accumulated contacts**: each bump adds a chunk to the tile's convert meter
  (`0.5` neutral, `0.2` enemy); the last nation to hit a contested tile takes the meter over.
  Faster balls and more balls convert faster.
- Removed target pathfinding, spread-target reservation and the sit-to-convert timer; a ball
  stranded by a flip is snapped to its nearest owned tile. Ball-ball collisions remain off.

### Removed
- `Grid` targeting helpers (`getFrontierTiles`, neighbour counts, `setConvert`/`getConvert`/
  `clearConvert`, `isOwnedBy`, `getTileType`, `isValidSpawn`, `getTileAtWorld`, `paintAtWorld`) —
  replaced by `blocksAt`, `convertOnHit` and `nearestOwnedTile`.

## [2.0.0] - 2026-09-30

### Changed
- **Conquest redesign.** The arena now starts **neutral** with one compact **home base** per
  nation; each viewer is a single **ball** that pours out and **slow-converts** adjacent tiles, so
  borders creep forward and get eaten back. More balls and higher movement/conversion speed =
  faster expansion.
- Rounds are now won by **most territory** at time-up (or an immediate **65% domination**),
  instead of a combined interaction score.
- A nation whose tile count reaches **0 is eliminated** and stops spawning for the round
  (conquerable home bases — a last stand, not a safe haven).
- HUD: nation **scoreboard** now shows territory % and active balls with a leader crown; added a
  live right-side **Conquest feed**; on-canvas **base banners** and thick nation **borders**.

### Removed
- Swords, HP, knockback, kills and PvP damage — `src/sword.js`, `src/combat.js`,
  `src/territory.js` (conversion waves) and `src/ai.js` are gone. The mappings UI, Tikora manifest
  and `config/mappings.json` drop the now-meaningless `shield`/`heal` effects.

### Added
- `src/feed.js` — the Conquest feed (joins, eliminations, winner) with EN/AR strings.
- `Grid` slow-convert API (`setConvert`/`getConvert`/`clearConvert`) and nation-border rendering.
- `src/zones.js` now generates spread **home-base** layouts for 2–12 nations.
- Unit tests for base layout and ball slow-convert (`tests/zones.test.js`, `tests/convert.test.js`)
  plus a headless game-loop smoke test (`tests/runtime.test.js`).

## [1.0.1] - 2026-09-30

### Fixed
- Removed the phantom `tikora` value from `server/constants.js` `MODES`; the bridge chat sources are
  `auto | direct | tikfinity | mock`. Previously a `tikora` mode silently fell back to Direct.

### Changed
- Reconciled docs with shipped behaviour: **Tikora is a client-side effect hub**, not a bridge chat
  source (updated README, AGENTS, ARCHITECTURE, BRIDGE, TESTING and DECISIONS; added D-022).
- Corrected stale module/file references (module responsibility tables, TESTING coverage list,
  repository maps, persistence stores).

## [1.0.0] - 2026-09-30

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
- Teams-driven arena: `src/zones.js` generates contiguous zones for any team count (2–12),
  driving grid colours and spawn points; `map.js` clears spawns around team centroids.
- Viewer avatars: `src/viewerManager.js` turns chat join commands into avatar marbles with
  profile photos, team colours and names; hard cap (~24) with a reinforcement queue that swaps
  in on death; AI fill seeds a bot for any team without a marble.
- Marble avatar rendering (circular profile photo, colour fallback) and per-viewer fields.
- Debug **Viewers** section (active/queued/total, cap + AI-fill toggles).
- Camera pan/zoom with exponential focus easing and cinematic blur; HUD remains screen-space.
- `src/joinCinematic.js` — queued join intros that pan/zoom to a new viewer with a profile-photo
  card (focus → hold → return), plus a debug **Cinematic** section (blur % slider, Skip Intro).
- `src/scoring.js` — gift-dominant scoring engine (gifts, likes, unique comments, follows, shares,
  territory) with tunable weights and a combined leaderboard.
- `src/round.js` — round state machine (countdown → playing → end → intermission) with auto-loop
  and manual start/end; wired into the game loop.
- Live team scoreboard (flag/emoji, territory %, combined score) and a round-state banner.
- Manual **Start / End / Auto** round controls in the control bar.
- Winners persistence: `server/stores/winnersStore.js` + `GET/POST/DELETE /api/winners` and a
  client mirror (`src/winnersStore.js`) with localStorage fallback; winners saved on round end.
- Gift → power-up mappings: `config/mappings.json` defaults, `server/stores/mappingsStore.js` +
  `GET/PUT /api/mappings`, pure `matchMapping` (`src/mappings.js`), and a client store
  (`src/mappingsStore.js`) with localStorage fallback.
- `src/giftEffects.js` executor with eight effects (overcharge, shield, boost, heal, colorbomb,
  area-convert, spawn ally, instant-claim); matching gifts trigger the effect for the gifter's team.
- Debug **Content — Gift Mappings** editor (enable, gift name, min coins, effect, add/remove, save).
- TikFinity host/port fields in the Connect panel (mode routing already supported).
- Tikora hub integration: `tikora.manifest.json` declares the game's effects; `src/tikoraClient.js`
  loads Tikora's `hub-client.js`; `src/tikora.js` connects the relay, advertises capabilities,
  routes effects via the shared executor and acknowledges them.
- `GET/POST /api/tikora/config` (env `TIKORA_SLUG`/`TIKORA_KEY`/`TIKORA_RELAY_URL` + saved config)
  with **auto-connect** when enabled; debug **Tikora Hub** panel (key, relay, status).
- Interaction audio: synthesized **join** blip and **gift** sparkle; join also plays on viewer spawn.
- Debug **All-Time Winners** panel and **Scoring Weights** editor (live-updates `ScoringEngine`).
- Performance: one shared per-frame tile-count map reused by the scoreboard and domination check
  (removes repeated per-marble `countTiles` scans).

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
  server (:3020) with Direct / TikFinity chat sources; Tikora integrated as an effect hub.
