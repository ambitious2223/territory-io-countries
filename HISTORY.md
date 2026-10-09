# HISTORY.md — Session Log

Newest first. Log what was done, blockers, and next steps.

---

## 2026-10-08 — Win celebration with sound (2.19.0)

Owner: "Start the win celebration process — detailed and great with sound effects."

**Done**
- `src/scoring.js`: per-viewer contributor tracking (`contributors` map + `topContributors`).
- `src/confetti.js`: pooled ConfettiSystem — centre burst + top rain, gravity + sway, flag-clipped
  pieces (18 % chance when the winner has a flag image), capped at `WIN_CONFETTI_MAX` (240),
  self-stops after `WIN_CONFETTI_TIME` (10 s).
- `src/winScreen.js`: full-screen celebration — colour wash + vignette, confetti, medallion
  (easeOutCubic pop), VICTORY/name/stat line (stroked), podium at 0.9 s: top-3 nation cards +
  top-3 supporters (avatar circles, nation-colour ring, nickname, score). EN/AR strings.
- `src/audio.js`: `playConfetti` (band-passed noise burst), `playReveal` (triangle sweep + thump),
  `playPodium` (three staggered bells). Timed from `WinScreen.update` (`WIN_MEDALLION_REVEAL`,
  `WIN_PODIUM_DELAY`).
- `game.js`: `finishRound` → `winScreen.show()` (domination toast + inline playVictory removed —
  the screen owns them); `resetRound` → hide; update/render wiring.
- Tests: contributors, confetti lifecycle/cap, winScreen snapshot/schedule/draw (173 total).

**Verified**
- `npm run lint` clean · `npm test` **173 passed** · build + smoke green.

---

## 2026-10-08 — Manual camera + nation jumps (2.18.0)

Owner: "a manual zoom for whenever I need to zoom somewhere, and any other stream-management
tools." Chose: hybrid mouse+keyboard, stays until reset, and nation jump presets (the +30s /
clean-view / follow-leader options were left out for now).

**Done**
- `src/cameraControls.js`: `ManualCamera` class — click-to-focus (1.8×), click-a-ball follow
  (re-uses cinematic tracking; dead ball auto-resets), wheel zoom toward cursor (1–3×),
  4 px-threshold drag pan, arrow-key pan, `+`/`-` zoom, `0`/`Esc` reset. Manual input cancels any
  running cinematic (`cinematic.skip()`), yellow toasts on focus/follow/reset (EN/AR). Keyboard
  input ignored while typing in panel fields.
- Camera section in the glass panel (Connection tab): Arena / Leader buttons + per-nation chips,
  rebuilt live when teams change.
- Wired into `Game` (constructor + per-frame `update`). Tests: zoom-toward-cursor math, clamps,
  focus/follow/death-reset, pan/zoom/reset, presets, attach smoke (7 tests, 162 total).

**Verified**
- `npm run lint` clean · `npm test` **162 passed** · build + smoke green.

---

## 2026-10-08 — Modern glass debug menu (2.17.0)

Owner: "a rework of the D-Bug menu for a more modern look" (after choosing: glass floating card
+ cyan accent, built after the brainstorm).

**Done**
- `src/debugPanel.css` (new module stylesheet, imported by `debugPanel.js`): glass panel
  (380 px, blur, radius 18), section cards with collapsible headers, pill tabs, status pills,
  toggle switches, segmented mode control, viewer meter, custom scrollbars, glass FAB.
- Markup: `#conn-mode` is now a hidden input driven by the segmented buttons (`.value` API kept
  for `initConnectionPanel`); checkboxes got the `toggle` class; viewers meter + blur value chip
  added. `ui.js` wires segments, pill states (bridge/tikora), meter width, blur %, and section
  collapse via delegation.
- Removed ~280 lines of dead CSS from `index.html` (old panel, legacy `.lb-*`, `.mapping-*`).
- `tests/debugPanel.test.js` pins every wired id + tab list (155 tests total).

**Verified**
- `npm run lint` clean · `npm test` **155 passed** · build + smoke green.

---

## 2026-10-08 — Hub-only effect mapping (2.16.0)

Owner: "We don't have to have any of the declared effects in the controls hard-coded into the web
app. It should always rely on the hub." (A similar message earlier was meant for another program.)

**Done**
- Deleted the in-app gift-mappings feature end-to-end: `src/mappings.js`, `mappingsPanel.js`,
  `mappingsStore.js`, `config/mappings.json`, `server/stores/mappingsStore.js`,
  `GET/PUT /api/mappings`, the Advanced-tab editor, `executeGiftEffect`, the runtime gift branch,
  related i18n keys, `tests/mappings.test.js`, the smoke mappings check.
- Gift events still score + play the gift sound. Manifest ↔ executor sync test retained.
- Docs: D-045, AGENTS gifts row, BRIDGE API/routing notes, GAME_DESIGN §5, ARCHITECTURE
  (module/persistence rows), README, TESTING; phases renumbered (menu = 28, win = 29).

**Verified**
- `npm run lint` clean · `npm test` **152 passed** · build + smoke green.

---

## 2026-10-08 — Hint copy: names only (2.15.2)

User: "The top part of the description instruction is already enough … the ID / number / flag are
pretty vague parameters. Let's keep it clean with names only."

**Done**
- Permanent hint reduced to one line: `COMMENT YOUR COUNTRY NAME TO JOIN!` (EN) /
  `علّق اسم دولتك للانضمام!` (AR) — `hint.line2` removed from markup + dictionaries.
- Round-start guide card loses its code/number/flag step → two steps (name → most territory wins);
  card height recalculated. Matching behaviour untouched (codes/numbers still work for those who
  type them).
- Tests 161 green (key parity auto-verifies EN↔AR).

**Verified**
- `npm run lint` clean · `npm test` **161 passed** · build + smoke green.

---

## 2026-10-08 — Hint off the map + debug overlay removed (2.15.1)

User: the permanent hint "taking place in the bottom left corner of the map … make it fit in the
empty area between the controls and the arena", and the stats/frame overlay drawn over the arena
when the debug menu opens should go.

**Done**
- Hint is now a centered DOM strip (`#join-hint`) inside `.canvas-wrap` — CSS `-webkit-text-stroke`
  black outline over gold, `paint-order: stroke fill`, responsive clamp sizing, `pointer-events:
  none`; it occupies only the letterbox band and never touches the canvas. `onboarding` lost
  `drawHint`/`fitFont`; `ui.js initOnboardingPanel` applies the persisted flag to the element.
- Deleted the canvas debug overlay entirely: `src/debug.js` gone, `game.js` no longer constructs,
  feeds or draws it, `DEBUG_FPS_GRAPH_*`/`DEBUG_FPS_HISTORY` removed. DOM Performance panel
  unchanged.
- Hint test rewritten to persistence-only; 161 tests green.

**Verified**
- `npm run lint` clean · `npm test` **161 passed** · build + smoke green.

---

## 2026-10-08 — Reset Players button (2.15.0)

User: "old players keep joining next matches — how can I have a reset player to 0 button beside
the start game button?"

**Done**
- `ViewerManager.clearHumans()` (drops people + their queued slots, marks their balls dead, keeps
  bots), `ScoringEngine.clearUsers()` (forget registrations + first-interaction sets), and
  `game.resetPlayers()` (clears humans → removes dead balls → clears prompts).
- **Reset Players** button in the top bar between **Start** and **End** (EN `Reset Players` /
  AR `تصفير اللاعبين`), wired in `ui.js initControls`.
- Tests: humans/balls/prompts/registrations wiped with bots intact; next round never brings old
  players back (161 total).

**Verified**
- `npm run lint` clean · `npm test` **161 passed** · build + smoke green.

---

## 2026-10-08 — Permanent join hint (2.14.0)

User: "permanent instructions for joining on screen where there is no other component — big bold
text yellow with outer stroke black — without downscaling any of the other components."

**Done**
- `Onboarding.drawHint()`: bottom-left lane (x16, baselines 756/789 — clear of the centred tips,
  cinematic card and pick-a-side prompt), gold (`#FFD700`) bold text with a 6/4 px black
  `strokeText` outline over a translucent dark rounded plate; `fitFont` shrinks only the hint if a
  line is too wide (never other components). Rendered first in `Onboarding.draw()`.
- `hint.line1`/`hint.line2` EN+AR; **Join hint** toggle (persisted `twf.hint`, default on) in
  Advanced → Guide & Tips.
- Tests: hint draws by default (2 stroked lines), toggle persists and silences it (159 total).

**Verified**
- `npm run lint` clean · `npm test` **159 passed** · build + smoke green.

---

## 2026-10-08 — Hub effects not activating: root-caused (2.13.0)

User report: "Game is not resetting every time, players stay each new round; some hub effects
don't activate (Pebble's freeze) — investigate."

**Investigation (read-only, hub DB `%APPDATA%\Tikora\tikora.db`)**
- Mappings for `territory-with-flags` are clean (5 gift mappings, `who: everyone`, enabled,
  no cooldown).
- **`effect_log` shows `freeze` DELIVERED to the game socket twice** (17:47:03, 17:50:11,
  `ahmadabostaiti`) → hub, relay and the game's connection all worked; the drop was inside the
  game.
- Code trace found three holes: `scoring.reset()` wipes user→team each round; known viewers'
  re-comments returned `null` so prompts never resolved (20 s drop); chat registers `userId` while
  hub events may fall back to `username` (key mismatch).
- Roster: players persisting each round = by design (user confirmed; fixed registration instead).
- Note: `colorbomb` mapping payload `radius: 259` is clamped to 8 by `EFFECT_*_MAX` (safety from
  2.8.0); the other 4 mappings have `trigger_count: 0` (those gift IDs were never sent).

**Fixed**
- Both-key registration at join and re-registration of all viewers in `resetRound`.
- `executeEffect`: `teamId` → `teamOf` over both keys → viewer roster team → prompt/bypass.
- Known-viewer chats resolve queued prompts; prompt items age from creation with a `dropped` count.
- Telemetry: `effectStats` + `Effects`/`Last effect` debug rows + console log per hub effect.
- `IDLE + Auto on` guard restarts the countdown (End-during-countdown no longer strands the game).

**Verified**
- `npm run lint` clean · `npm test` **158 passed** (new `effectRouting` regression suite + prompt
  aging) · build + smoke green.

---

## 2026-10-08 — Loose join matching + cinematic performance (2.12.0)

Two user reports: "remove letter-sensitivity, especially Arabic — first part of a word and
misspellings should count" and "auto-zoom/cinematic makes the game look laggy".

**Done — matching** (`src/teams.js` `matchTeam`)
- Root causes found: Arabic names were excluded from the fuzzy/prefix loop (exact-only), no
  word-level matching, no `ال` article handling, tight uniform threshold.
- Now: candidate keys = name.en + name.ar + aliases **+ article-stripped Arabic**; passes run
  exact → **any-word equality** → **prefix** → **length-scaled Levenshtein** (1/2/3 by target
  length) over full names *and* their words, with a length pre-filter. Numbers/ISO/emoji unchanged.
- 6 new test cases (Arabic article/typo, multiword first word, emoji+extra words, case, negatives).

**Done — performance**
- `Camera.blurScale` default **0**: no full-canvas `ctx.filter` blur during the cinematic
  (replaced by a 0.32-alpha veil rect); slider in debug still opts in. Cinematic test updated.
- `Grid` caches border geometry: `rebuildOutlines()` runs only when `outlinesDirty` (set by
  `paintTile`), storing traced loops per nation + a browser `Path2D` (`buildPath`, null in node →
  stroke fallback). `drawBorders` now strokes cached paths instead of re-tracing every frame.

**Verified**
- `npm run lint` clean · `npm test` **151 passed** · build + smoke green.

---

## 2026-10-08 — Onboarding: half-arena join guide + rotating tips (2.11.0)

User: "50% of the arena size, a big pop-out notification of how to join, and some instructions
along the gameplay, always dismissible" (confirmed: pop-out = 50% of arena, shows each round
start with auto-hide + ✕, rotating contextual tips).

**Done**
- New `src/onboarding.js`:
  - **Join guide**: card = `CANVAS_WIDTH × JOIN_GUIDE_SHARE` (0.5) with 3 numbered steps + nation
    chips (colour, emoji, localized name). Shown on every `COUNTDOWN` transition, auto-hides after
    `JOIN_GUIDE_TIME` (10 s), ✕ dismisses until the next round.
  - **Tips**: milestone queue (`join`, `gift`, `mid`, `final`) at a top strip — each shows
    `TIP_TIME` (6 s), rotates, once per milestone per round; phase checks on round time.
  - Persisted switches `twf.guide` / `twf.tips` + `handlePointer` canvas hit-testing (✕ rects).
- Wired into `game.js` (round-state observer, draw after prompts, click hit-test, join/gift
  milestones via `game.onboarding`), debug **Advanced → Guide & Tips** (two checkboxes +
  "Show now"), i18n EN/AR for every new string.
- Tests: guide show/hide/dismiss/close-hit, tip rotation + dedupe + phases, persistence, draw
  smoke (`tests/onboarding.test.js`, 9 tests).

**Verified**
- `npm run lint` clean · `npm test` **143 passed** · build + smoke green.

---

## 2026-10-08 — Pick-a-side bypass for testing (2.10.0)

User likes the pick-a-side flow but it blocked debugging (held effects dropped while waiting for
a join).

**Done**
- `CONFIG.PROMPT_BYPASS` + checkbox in debug → Advanced → **Mock Event** ("Skip pick-a-side"),
  persisted (`twf.bypassPrompt`, default off). When on, `executeEffect` resolves an unknown
  activator to `pickBypassTeam` (target teamId → least-loaded nation) and registers the user so
  follow-up effects reuse that team — no prompt.
- Tests: bypass applies without prompting + off-by-default still prompts.

**Verified**
- `npm run lint` clean · `npm test` **134 passed** · build + smoke green.

---

## 2026-10-08 — Total Arabic, positions fixed (2.9.0)

User: "total accurate Arabic translation **without switching the UI positions of anything**".

**Done**
- `applyLanguage` no longer sets `dir='rtl'` — Arabic is a **text-only** switch (D-036 updates the
  AGENTS/GAME_DESIGN/README/TESTING "RTL" wording accordingly).
- Translated the hardcoded English: round states, map/mode/mock options, 12 effect labels +
  floating VFX texts, scoring weights, placeholders, FAB title, `Viewer`/`Winner` fallbacks.
- Localized team names via `teamLabel(team, getLanguage())` on canvas (banners/capital letters),
  leaderboard, join cinematic, effect identities, bot names, debug tile list; overlay payload gains
  `nameAr` and the overlay honours `?lang=ar`/saved language (title, round labels, names).
- Language switch now re-renders scoring + mappings panels (labels refresh live).
- `tests/i18n.test.js`: key parity, non-empty values, `data-i18n` markup scan, dynamic key
  families, `dir=ltr` assertion.

**Verified**
- `npm run lint` clean · `npm test` **133 passed** · build + smoke green.

---

## 2026-10-08 — Power-up catalog for the hub (2.8.0)

Phase 18 ("declare every kind of power-up and wire it to the hub").

**Done**
- Six new effects: `freeze` (enemy soldiers stop, icy ring), `shield` (nation's tiles unclaimable
  for N s — white dashed border; respected by bombs/enclosures/claims), `team_speed`,
  `claim_storm` (frontier sweep, shuffled, capped), `mega_bomb`, `summon` (1–8 allies with the
  activator's identity). All params clamped via `EFFECT_*_MAX` constants; old effects use the same
  clamped helpers.
- Grid gained `setShield/isShielded` (+ `paintTile` shield guard, dashed outline); marble gained
  `freeze(seconds)`; victory paint bypasses shields.
- `tikora.manifest.json` = 12 effects and now **drives** `EFFECT_OPTIONS` (mappings dropdown);
  `tests/manifest.test.js` enforces manifest ↔ `EFFECT_KEYS` sync so they can't drift.
- Hub needs no change: manifest sync (path seeded earlier) or live capabilities show all 12.

**Verified**
- `npm run lint` clean · `npm test` **127 passed** (manifest/shield/claim_storm/freeze/summon) ·
  build + smoke green.

---

## 2026-10-08 — Auto-zoom, contrast outline, pick-a-side (2.7.0)

**Done**
- `JoinCinematic` tracks the joiner's **live position** during focus/hold (`track` marble ref);
  persisted **Auto-zoom** toggle (debug Cinematic section, `CONFIG.AUTOZOOM_ON_JOIN`); join sound
  now plays even when auto-zoom is off.
- New `src/joinPrompt.js`: photo + nickname **"Pick a side!"** pop-up; effects from non-members are
  **queued** and fired the moment they join (`JOIN_PROMPT_TIMEOUT` 20 s, EN/AR). Wired into
  `executeEffect` (both hub effects and in-game gift mappings funnel through it) and resolved in
  `handleBridgeEvent`.
- `giftEffects`: `activatorProfile()` — spawned/affected soldiers use the gifter's **name + photo**
  instead of the team name; `tikora.js` forwards `username/name/avatar/userId` from the hub event.
- Marble outline switched to **black outer + white inner ring** (team glow/tint retained).
- Tests: cinematic tracking/dead-soldier, joinPrompt queue/resolve/timeout, giftEffects identity →
  116 passed. Hub companion patch forwards avatar/name/userId (separate repo commit).

**Verified**
- `npm run lint` clean · `npm test` **116 passed** · build + smoke green.
- Hub companion commits (separate repo, its own 5 gates green): effect event now carries
  avatar/name/userId (`81da6da`), and the hub **seeds Territory With Flags into its Game Store**
  with path/port/bat + manifest sync (`4aec1eb`) — the game appears automatically on hub start.

---

## 2026-10-08 — Finer grid, slow soldiers, real seconds (2.6.0)

User: grid too coarse (one soldier eats percentages), soldiers should default slow with TikTok
interactions granting speed — "and anything related, plan it with this".

**Done**
- Grid 48×32 @ 25 px (1536 tiles), base 8×8, radius 11, outline/border/color-bomb compensations,
  map walls as 2×2 blocks + spawn clearance so physical look is unchanged.
- Default speed 1.1 + **live Soldiers slider** (Connection tab, 0.5–3.0, localStorage, rescales
  live balls via `src/speedControl.js`); overcharge ×2.2.
- **Related discovery:** all duration constants were accumulating **frames while stored as
  seconds** — overcharge 0.1 s, hold 40 ms, power-ups every 0.15 s, claim-SFX throttle dead,
  bounce flash invisible. Normalized to seconds (÷60) in marble/grid/game/powerups/viewerManager;
  cinematic/vfx/camera were already correct.
- Territory score weight ÷4; removed dead `BASE_INSET`/`OUTLINE_SMOOTH_PASSES`.

**Verified**
- `npm run lint` clean · `npm test` **106 passed** (new `speedControl` + `durations` tests) ·
  build + smoke green.

---

## 2026-10-04 — Capital slider, layering, autosave (2.5.0)

**Done**
- Capital-size slider (Teams tab, 0.5x–2.5x) persisted as `capitalScale` in the teams config;
  `bases.js` scales the medallion, emoji and name banner from it.
- Render order fixed: balls draw **before** capitals, so fighters sit under the stronghold; event
  text stays topmost.
- Name banner restyled as a dark rounded pill with team-colour border + shadowed bold text.
- `teamRegistry`: split panel/game listener sets, added `setBaseUrl`, debounced auto-save
  (`TEAMS_AUTOSAVE_MS` 1.5 s) with a `beforeunload` flush; saves notify only the game so typed
  text keeps focus and edits appear live in-game. `main.js` switched to `subscribeGame`.

**Verified**
- `npm run lint` clean · `npm test` **100 passed** (capital scale + autosave debounce tests) ·
  build + smoke green.

---

## 2026-10-04 — Fix team-photo upload CORS (2.4.1)

The team picker still did nothing. Root cause: the Express REST API had **no CORS headers**, so a
browser POST from the Vite app (`:1935`) to the bridge (`:3020`) failed at the preflight `OPTIONS`.
Confirmed with a live probe (no `Access-Control-Allow-Origin`). Added an `applyCors` middleware to
`server/index.js`; re-probed — `OPTIONS 204` + ACAO, `POST /api/flags` 200 returning the URL, and
the flag file serves. Added a smoke assertion so it can't regress.

---

## 2026-10-04 — Stronghold photos, ball identity, lean debug menu (2.4.0)

**Done**
- Team-photo upload fixed: `uploadFlag` now notifies, so the team editor + game update live; the
  editor row shows a photo thumbnail and an uploading/error state.
- `src/bases.js`: strongholds drawn as 3D circular medallions with the uploaded photo clipped in
  (emoji fallback). Extracted from `game.js`.
- `marble.js`: balls get a team-colour ring + glow, a light team tint over the avatar, and a
  team-colour nameplate — the TikTok photo stays the fighter, ownership is obvious.
- Debug panel regrouped to **Connection · Teams · Overlay · Advanced** (secondary tools collapsed).

**Verified**
- `npm run lint` clean · `npm test` **96 passed** (new `teamRegistry` test) · build + smoke green.

---

## 2026-10-04 — Hardwired to the Chic Aura Hub (2.3.0)

User asked to hardwire the game to the hub (`C:\dev\windows app interactive for streams`, the
Tikora Electron app): no game-key setup, activating/deactivating stays in the hub.

**Done**
- `server/tikoraIdentity.js` resolves hub identity (env `TIKORA_GAME_*` → `TIKORA_GAME_LAUNCH_URL`
  query → legacy → `.tiktok-config.json` → manifest); `httpRoutes` uses it and drops the `POST`.
- `countriesio.bat` opens `%TIKORA_GAME_LAUNCH_URL%` (falls back to `:1935`).
- `src/main.js` auto-connects from config or `?game=&key=`; debug Tikora tab is read-only
  (`src/debugPanel.js`, `src/ui.js`); removed the manual key/relay inputs + Connect/Disconnect.
- Noted in docs that the hub is a **separate repo** (`ambitious2223/tiktok-games-launcher`).

**Verified**
- `npm run lint` clean · `npm test` **95 passed** (new `tikoraIdentity` tests) · `npm run build`
  OK · `npm run smoke` PASS.

---

## 2026-10-04 — Minimal leaderboard everywhere (2.2.1)

User opened the overlay and found the rows wrapping (a 5-column grid rendered 6 cells) and the
layout hard to read; asked for one minimal leaderboard and no second conquest list.

**Done**
- Overlay rows fixed to a 4-cell grid (`rank · flag · name · %`); removed bar/viewer cells and the
  whole conquest feed column; header/timer now spans the single column width; text-shadow added so
  it reads on white while staying transparent for OBS.
- Removed the **Conquest sidebar from the main game** too; `index.html` is now a two-column layout,
  and the left leaderboard drops the viewer column.
- Deleted `src/feed.js`, the `sidebar.conquest` / `feed.*` i18n strings and the unused `tf()`;
  `overlaySnapshot` no longer emits `feed`/`viewers`.

**Verified**
- `npm run lint` clean · `npm test` **90 passed** · `npm run build` OK · `npm run smoke` PASS.

---

## 2026-10-04 — One-touch capture, clean borders, overlay + debug FAB (2.2.0)

User feedback: the half-convert inset squares looked cluttered and two-hit capture felt wrong;
wanted one touch, a floating draggable debug button, and a styled live leaderboard overlay URL.

**Done**
- **Capture:** one contact claims a tile outright. Removed the convert meter (`grid.convert`) and
  its inset rendering; added a per-tile **hold** (`TILE_HOLD_TIME` ~2.5 s) off a grid clock so
  enemy borders can't flicker. Neutral/enemy handled identically; enemy is "slower to hold" by
  waiting out the hold.
- **Borders:** new pure `src/outline.js` (marching squares + rounded corner strokes); `grid.draw`
  renders one rounded union outline per nation.
- **Feedback:** throttled claim SFX, fewer sparks, `autoFillEnclosures` once per frame per colour;
  ball speed 2.2 → 1.9.
- **Debug UI:** top-bar Debug button replaced by a translucent draggable **FAB** (`debugFab.js`)
  with persisted position/state; panel rebuilt as tabbed workspace (`debugPanel.js`) and moved out
  of `index.html`; `D` hotkey kept.
- **Overlay:** `leaderboard.html` + `src/overlay/*` display-only page (leaderboard + conquest feed
  + timer, URL-param themed). Bridge relays `overlay:state` → `overlay:leaderboard` and caches the
  last snapshot. Shared `buildStandings()`/`buildOverlayPayload()`; Vite multi-page build.

**Verified**
- `npm run lint` clean · `npm test` **90 passed** (new outline/overlay tests) · `npm run build`
  OK (index + leaderboard) · `npm run smoke` PASS incl. overlay relay + cache replay.

---

## 2026-09-30 — Ricochet balls (2.1.0)

Paired with the user's rule: *"every ball, whenever it reaches a new pixel, has to bounce back."*

**Done**
- `marble.js` rewritten from a target-seeking converter to a **confined puck**: straight-line
  motion, axis-aligned **reflection** off any non-owned tile, contact-accumulated conversion,
  bounce jitter, substepping to avoid tunnelling, and rescue to the nearest owned tile if an
  enemy flips the tile under it.
- `grid.js`: added `blocksAt`, `convertOnHit`, `nearestOwnedTile`; pruned the old targeting and
  convert API.
- `config.js`: `CONVERT_HIT_CHUNK` / `CONVERT_ENEMY_HIT_CHUNK` / `BALL_BOUNCE_JITTER` /
  `BALL_MAX_SUBSTEP`; removed the sit-timer constants.
- `game.js` / `debug.js` updated for the new event shape; tests rewritten
  (`tests/convert.test.js`) plus the headless loop test now forces PLAYING and asserts growth.

**Verified**
- `npm run lint` clean · `npm test` **81 passed** · `npm run build` ok · `npm run smoke` PASS.

---

## 2026-09-30 — Conquest redesign (2.0.0)

**Done — all phases**
1. **World:** config rewritten for bases + slow-convert (removed sword/combat/HP constants);
   `zones.js` now lays out spread home bases for 2–12 nations; `grid.js` gained a
   `convert` state array, neutral start and thick nation **borders**.
2. **Balls:** `marble.js` rewritten — no `Sword`/HP/knockback; balls target a spread frontier
   tile, travel, then **slow-convert** it (neutral vs enemy time), with in-progress cancellation
   when contested.
3. **Round:** `game.js` rewritten — base setup, per-nation **elimination**, **territory-only**
   win by tiles, base banners, conquest-feed emission; deleted `combat.js`, `sword.js`,
   `territory.js`, `ai.js`.
4. **Cleanup:** power-ups trimmed to overcharge + colorbomb; gift effects/UI/manifest/JSON drop
   `shield`/`heal`; audio loses hit/deflect/interruption/sweep; `utils.js` and `analytics.js`
   trimmed of dead combat helpers.
5. **Presentation:** `scoreboard.js` territory-first with crown + eliminated state; new
   `feed.js` + right-sidebar Conquest feed (EN/AR); base banners on canvas.
6. **Verify:** new base/convert tests + a headless game-loop test; lint clean; **80 tests pass**; build ok; smoke PASS.

**Status:** shipped as **2.0.0**. Open follow-ups: a visual/browser pass, real Direct connect,
and a Tikora relay test.

---

## 2026-09-30 — Docs/code reconciliation (1.0.1)

**Done**
- Confirmed Tikora is implemented **client-side** (`src/tikora.js` + `tikoraClient.js` load Tikora's
  `hub-client.js`), not as a bridge chat source; `connectionManager` only handles
  `auto | direct | tikfinity | mock`.
- Removed the phantom `tikora` mode from `server/constants.js` `MODES`.
- Aligned docs with code: README status, AGENTS (fixed decisions + architecture), ARCHITECTURE
  (diagram + module tables + persistence), BRIDGE (sources/modes/API/Tikora section), TESTING
  (coverage + QA), and DECISIONS (D-003 refined, D-022 added).
- Released **1.0.1**.

**Verified**
- `npm run lint` clean · `npm test` 73 passed · `npm run smoke` PASS.

---

## 2026-09-30 — Phase 9: polish & release 1.0.0

**Done**
- Added synthesized join + gift SFX; join sound on viewer spawn.
- Debug **All-Time Winners** panel and **Scoring Weights** editor (live tuning).
- Performance: shared per-frame tile-count map consumed by the scoreboard and domination check.
- Finalised docs; released CHANGELOG **1.0.0**.

**Verified**
- `npm run lint` clean · `npm test` 73 passed · `npm run build` ok · `npm run smoke` PASS.

**Status:** all planned phases (0–9) complete. Open follow-ups: real-stream verification, Tikora
relay test, and optional dirty-tile caching if a larger arena is ever needed.

---

## 2026-09-30 — Phase 8: TikFinity tab + Tikora hub

**Done**
- TikFinity host/port inputs wired into the Connect panel.
- `tikora.manifest.json` (8 declared effects) + `src/tikoraClient.js` (loads `hub-client.js`) +
  `src/tikora.js` (`TikoraHub`: connect, capabilities, effect routing, ack).
- Refactored `giftEffects.js` to expose `executeEffect(game, key, params, target)` shared by gifts
  and Tikora.
- `GET/POST /api/tikora/config`; config persisted in `.tiktok-config.json`; auto-connect on boot
  when enabled; debug **Tikora Hub** panel.

**Verified**
- `npm run lint` clean · `npm test` 73 passed · `npm run build` ok · `npm run smoke` PASS.

**Next**
- Phase 9: polish (VFX/SFX, perf pass), winners HUD, scoring-weight sliders, docs finalise.

---

## 2026-09-30 — Phase 7: gift → power-up mappings

**Done**
- `config/mappings.json` defaults, `server/stores/mappingsStore.js`, `GET/PUT /api/mappings`.
- `src/mappings.js` pure matcher (`giftName`/`giftId`/`minCoins`, first-match) + client store
  `src/mappingsStore.js` with localStorage fallback.
- `src/giftEffects.js` registry + executor (8 effects) targeting the gifter's team marble.
- Game wiring: gift events run `matchMapping` → `executeGiftEffect`.
- Debug **Content** mappings editor; tests for matcher + executor.

**Verified**
- `npm run lint` clean · `npm test` 69 passed · `npm run build` ok · `npm run smoke` PASS
  (health + teams + winners + mappings + socket).

**Next**
- Phase 8: TikFinity Connect sub-tab + Tikora hub (manifest + relay).

---

## 2026-09-30 — Phase 6: scoring, rounds, scoreboard, winners

**Done**
- `src/scoring.js` gift-dominant engine (tunable weights) + tests.
- `src/round.js` state machine (countdown/playing/roundEnd/intermission) with auto-loop + tests.
- Game integration: join → team scoring, round lifecycle, winner settlement by combined score,
  per-round reset (territory/marbles/scores) with viewer respawn (cinematic suppressed on reset).
- Live team scoreboard (`src/scoreboard.js`) + round banner; manual Start/End/Auto controls.
- Winners persistence: server store + `/api/winners` routes + client mirror with localStorage.

**Verified**
- `npm run lint` clean · `npm test` 61 passed · `npm run build` ok · `npm run smoke` PASS
  (health + teams + winners + socket).

**Next**
- Phase 7: gift → power-up mappings UI + effect executor.

---

## 2026-09-30 — Phase 5: camera pan/zoom + join cinematic

**Done**
- `Camera` rewritten with focus pan/zoom (exponential easing), cinematic blur, and shake preserved.
- `src/joinCinematic.js`: queue + focus/hold/return state machine + screen-space intro card showing
  the joiner's profile photo, name and team colour.
- Game wires cinematic enqueue on viewer spawn, blur during world draw, and card after restore.
- Debug **Cinematic** section: queue count, blur % slider, Skip Intro.
- Unit tests for the camera tween and cinematic phases (48 total).

**Verified**
- `npm run lint` clean · `npm test` 48 passed · `npm run build` ok · `npm run smoke` PASS.

**Next**
- Phase 6: scoring engine (gift-dominant), live team scoreboard, round lifecycle + winners.

---

## 2026-09-30 — Phase 4: viewer avatar marbles

**Done**
- `src/zones.js` generic N-team zone layout + centroids/spawn tiles (unit tested); grid and map
  refactored to be team-driven.
- `src/viewerManager.js`: chat join → matcher → avatar marble; cap + reinforcement queue with
  swap-on-death; AI fill for empty teams.
- `Marble` gained `teamId`/`viewerId`/`isBot`/`avatar` and circular profile-photo rendering.
- `Game` now sets teams from the registry, builds zones per match, spawns viewer/bot marbles, and
  routes bridge events and deaths.
- Debug **Viewers** panel (active/queued/total + cap and AI-fill controls).

**Verified**
- `npm run lint` clean · `npm test` 43 passed · `npm run build` ok · `npm run smoke` PASS.

**Next**
- Phase 5: camera pan/zoom + join cinematic + blur slider.

---

## 2026-09-30 — Phase 3: teams, flags & i18n

**Done**
- `config/teams.json` (8 default teams) + `server/stores/teamsStore.js` (atomic).
- `server/uploads.js` (magic-byte validation) and `server/httpRoutes.js`
  (`GET/PUT /api/teams`, `POST /api/flags`); refactored `server/index.js` to use it.
- `src/teams.js` pure matcher (number · ISO2 · EN · AR · emoji, fuzzy; Arabic normalization).
- `src/teamRegistry.js` (server sync + localStorage fallback + flag cache),
  `src/imageUtils.js` (3:2 cover-crop), `src/teamsPanel.js` debug **Teams** editor.
- `src/i18n.js` (EN/AR + RTL), language selector, localized primary UI.

**Verified**
- `npm run lint` clean · `npm test` 31 passed · `npm run build` ok · `npm run smoke` PASS
  (health + teams endpoint + socket event).

**Next**
- Phase 4: spawn viewer avatar marbles (photo + name + team colour), active cap + queue, AI fill.

---

## 2026-09-30 — Phase 1: bridge server + auto-connect

**Done**
- Added npm scripts (`dev`/`server`/`client`/`test`/`smoke`/`lint`) and installed the bridge stack
  (`express`, `socket.io`, `socket.io-client`, `tiktok-live-connector`, `ws`); bumped Vite to 8.3.1.
- Built `server/`: `index.js`, `connectionManager`, `directBridge`, `tikfinityBridge`, `normalize`,
  `mock`, and `stores/` (atomic JSON + config).
- Implemented boot-time auto-connect from `.tiktok-config.json` with `auto|direct|tikfinity|mock`.
- Added `src/net/bridgeClient.js` and wired a debug-panel **Connection** + **Mock Event** UI.
- Added ESLint flat config, 14 Vitest unit tests, and a socket smoke test.

**Verified**
- `npm run lint` clean · `npm test` 14 passed · `npm run build` ok · `npm run smoke` PASS.
- `npm audit` → 0 vulnerabilities.

**Next**
- Phase 3: teams/flags model, join-keyword matcher (number · ISO2 · EN · AR · emoji), i18n.

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
