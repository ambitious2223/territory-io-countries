# DECISIONS.md — Decision Log

Format: **D-xxx — Title**, with Context · Decision · Rationale · Alternatives.

---

## D-053 — Donation speed ramps to 6× (donor only); overlay language follows the app
- **Context:** Owner: "make the max speed for donators 6x or 8x ... only for separate balls, not for
  the whole team", and the overlay "displays English even though my main app is in Arabic". Chose:
  **6×**, linear by coins, **no short timer cap** (coins decide the seconds; 60 s safety default,
  tunable), and donations only.
- **Decision (A):** `Marble` gets a numeric `speedMult`; `applyPowerup('overcharge', duration, mult)`
  takes the max of each. `autoGiftSpeed` computes `mult = clamp(2.2 + coins·k, 2.2, GIFT_SPEED_MAX_MULT)`
  (6× at `GIFT_SPEED_COINS_TO_MAX`=200) and `seconds = clamp(coins·GIFT_SPEED_SEC_PER_COIN, 1, 60)`,
  applied to the **donor's own ball**. The `boost` effect accepts a per-call `max` so the gift path
  escapes the shared `EFFECT_DURATION_MAX` (30 s) clamp; pickups/hub stay at 2.2×. All four knobs
  (sec/coin, max sec, max mult, coins-to-max) are tuned from the debug menu and persisted
  (`src/giftTuning.js` + Advanced → Gift Speed).
- **Decision (B):** `overlaySnapshot` includes `lang`; the overlay adopts it (rebuild on change) and
  the Overlay-tab link appends `?lang=`, so the standalone overlay — now a different origin from the
  tunnelled game — matches the app's language live.
- **Rationale:** speed is the reward donors feel; letting coins drive both intensity and time, with a
  high but adjustable ceiling, keeps it exciting yet bounded. Deriving the overlay language from the
  game (not its own storage) is the only origin-proof fix.
- **Alternatives:** 8× cap (rejected — hard to follow on stream); uncapped timer (rejected in favour
  of a tunable 60 s default); scaling every overcharge source (rejected — donations only).

## D-052 — Overlay renders in place; streamed from the built page (no HMR)
- **Context:** Owner: overlay "is like refreshing a lot and flashing a lot" on the streaming app.
  Two causes: the overlay replaced `root.innerHTML` on every ~4 Hz broadcast while rows carried a
  0.3 s entry animation (so the animation restarted nonstop), and the tunnelled overlay was served
  by the Vite dev server, whose HMR client can force-reload the page when its socket drops.
- **Decision (A):** `src/overlay/leaderboard.js` builds its skeleton once and reconciles rows in
  place (keyed by team id; only changed text/flags updated; identical payloads skipped); the entry
  animation moved to a one-shot `.ov-new` class. A pure `overlayModel.js` supplies the rows +
  change signature (unit-tested).
- **Decision (B):** the overlay is streamed from the **built** page served by the bridge
  (`tunnelTarget` → `http://localhost:3020`), so no Vite client/HMR is involved; `countriesio.bat`
  builds first. The game page (`:1935`) keeps HMR for development. Trade-off (accepted): overlay
  code changes need a rebuild to appear in the stream.
- **Rationale:** In-place updates remove the visible flashing; serving a built page removes the
  reload loop while leaving the dev workflow intact for the game.
- **Alternatives:** remove the animation only (still rebuilds 4×/s; flags reload); disable Vite HMR
  globally (kills the streamer's dev hot-reload); throttle broadcasts (still animates each tick).

## D-051 — Built-in Cloudflare quick tunnel for the overlay link
- **Context:** Owner: "can we get a Cloudflare link for the overlay because my streaming service
  doesn't accept localhost links" — they were run-running cloudflared by hand and copying the URL.
  Answered questions: local streaming app on the PC · auto-start · random URL each session.
- **Decision:** The bridge spawns `cloudflared tunnel --url http://localhost:1935 --no-autoupdate`
  on boot (unless `TWF_TUNNEL=0`), parses the `*.trycloudflare.com` URL from its output, and exposes
  it as `tunnel:status` (socket) + `GET /api/tunnel`. The Overlay tab shows
  `https://<id>.trycloudflare.com/leaderboard.html`, with a status row and a Start/Stop button that
  persists `tunnelEnabled`. New `server/tunnel.js` owns the child process (killed on exit/signal).
- **Rationale:** Because the streaming app runs locally, the overlay page still reaches the bridge
  at `localhost:3020`, so only the game page needs a public URL — one tunnel, no proxy/CORS changes.
  Auto-start removes the manual step; the toggle keeps it private when not streaming.
- **Alternatives:** Named tunnel with a fixed hostname (needs a Cloudflare account/domain — parked);
  pasting the URL manually (still two steps); tunnelling the bridge + a Vite proxy for same-origin
  sockets (only needed if the service runs remotely — deferred).
- **Security note:** the whole app is reachable at the random URL while running.

## D-050 — Win celebration glow-up + per-nation procedural anthem
- **Context:** Owner: "tell me the current shape of the winner screen and how we can polish that
  to be really great", plus "would it be a good idea to choose a song for each country and the
  leader's song plays immediately when they take the lead… songs will change frequently." The
  looping leader-song was judged chaotic and copyright-risky on TikTok; the owner chose a
  **winner anthem only**, sourced **procedurally per nation**.
- **Decision (A) — glow-up:** `WinScreen` gains an animated entrance (overshoot medallion + rotating
  light rays, VICTORY scale-in, count-up stats, second confetti burst at reveal), a faint winner
  **flag watermark**, a **reason headline**, a **win-count badge**, a **raised centre 1st place**
  with staggered cards and gold/silver/bronze medals, supporter **medal rings + crown**, and a
  **next-round countdown** from the intermission timer. Drawing helpers moved to `src/winArt.js`.
- **Decision (B) — anthem:** `anthemFrequencies(teamId)` returns a deterministic short motif
  (root + mode seeded from the nation id); `playAnthem` renders it with two oscillators + a
  lowpass sweep. Played once by `show()` in place of the old generic `playVictory`. A procedural
  **drumroll** leads into the reveal and a **crowd swell** lands with it. Sounds moved to
  `src/celebrationAudio.js`.
- **Rationale:** "Great" = motion, depth and payoff at the one moment viewers are watching;
  a per-nation motif gives identity at zero licensing/asset cost and fits the existing procedural
  audio architecture. A one-shot winner anthem avoids mid-round thrash entirely.
- **Alternatives:** Looping leader song with hysteresis/crossfade/ducking (rejected by owner —
  frequent cuts + copyright risk); bundled/uploaded anthem files (licensing + large assets);
  a short lead-change sting (deferred, not selected).
- **Amends:** D-048 (generic `playVictory` replaced by the winner's procedural anthem).

## D-049 — Automatic coin-scaled gift speed burst; Camera gets its own tab with player follow buttons
- **Context:** Owner (2 requests): "if anybody is having [an] automated coin value based speed …
  once they donate I need to have an effect even if I don't have a mapping in the hub" and "add
  lively controls … put the camera tab by its own tab … a button of each viewer … Clicking on the
  button of the player name leads the camera to them and follows around." D-045 made effects
  100 % hub-driven, so gifts with no mapping only scored + chimed.
- **Decision (A) — always-on speed burst:** every `gift` bridge event also runs
  `autoGiftSpeed(game, event)` → `executeEffect(game, 'boost', { duration })` on the **donor's own
  ball**, duration = `coins × GIFT_SPEED_PER_COIN` clamped to `GIFT_SPEED_MIN`(2 s)–`GIFT_SPEED_MAX`
  (10 s). It reuses the full effect pipeline (layered team resolution, pick-a-side holding,
  identity spawn, VFX, telemetry) and fires **in addition to** any hub mapping, hub or no hub.
- **Decision (B) — Camera tab:** the panel gains a fifth tab `camera` holding the existing
  presets (moved from Connection) plus a **Players** section. `src/cameraPanel.js` owns init and a
  signature-diffed per-frame rebuild of one `.cam-player-btn` per **living human viewer**
  (`cameraPlayerList`); click resolves the viewer's current marble and `followBall`s it; the
  followed ball's button gets `.active` (pulse). Buttons clear when the match's marbles are gone
  and rebuild for the new match. `resetRound` now also clears `manualCamera.follow` so the camera
  never chases a discarded ghost ball.
- **Rationale:** The owner wants donations to always *feel* like something happened without
  configuring the hub — a single fixed default is not a second mapping system (D-045 removed
  configurability, not sensible defaults). Follow-by-name is the practical streamer tool: you
  can't reliably click a moving ball mid-stream.
- **Alternatives:** Fallback only when the hub is silent (flaky — hub effects arrive on a
  separate channel with no correlation id); put the default in the hub (useless offline and
  outside the game's control); buttons for bots too (duplicates the nation chips); auto-follow on
  join (steals the camera — manual only, per D-047).
- **Amends:** D-045 (gifts now have one built-in game-side default; mapping configurability
  stays hub-only) and D-047's note that presets live in the Connection tab.

## D-048 — Win celebration: canvas screen, procedural sound, contributors podium
- **Context:** D-041 approved confetti + flag + top-3; the owner added "detailed and great with
  sound effects". The old end-of-round feedback was a colour sweep + a `DOMINATION!` toast.
- **Decision:** `WinScreen` (canvas, top-most) plays: colour wash + vignette → **ConfettiSystem**
  (pooled 240 pieces, burst + 10 s rain, some pieces clipped from the winner's flag) → flag
  **medallion** pop (`WIN_MEDALLION_REVEAL`) → VICTORY + winner name + stat line → **podium** at
  0.9 s (top-3 nations + overall top-3 supporters from new per-viewer scoring). Sound: layered
  `playVictory` + `playConfetti` at reveal, `playReveal` on the medallion, `playPodium` (bells) on
  the podium — all procedural/panned/voice-capped `AudioEngine` methods. The arena colour sweep is
  kept as the backdrop; the sidebar panel keeps Play Again; hide on `resetRound`.
- **Rationale:** One owned sequence with staged timing feels like a real stream moment; pooled
  confetti and existing audio architecture keep it cheap; contributors give the audience the
  "who made this happen" moment the owner asked for.
- **Alternatives:** DOM/HTML overlay (breaks canvas capture layering); asset-based sound files
  (none in repo — everything is procedural); auto-looping celebration (clutters intermission).

## D-047 — Streamer manual camera: hybrid input, stays until reset
- **Context:** Owner: "a manual zoom for whenever I need to zoom somewhere" + stream-management
  tools. `Camera` already had smooth `focusOn`/`resetFocus`; only the input layer was missing.
- **Decision:** `ManualCamera` (`src/cameraControls.js`) — click focuses (1.8×), clicking a soldier
  follows it (dead → reset), wheel zooms toward the cursor (1–3×), drag pans, arrows/`+`/`-`/`0`/
  `Esc` as keyboard backup. Manual input **cancels the running cinematic** (streamer always wins;
  auto-zoom re-arms on the next join) and the view **stays until reset** — no surprise snap-back.
  Camera presets (Arena/Leader/nation chips) live in the glass panel's Connection tab. WASD was
  dropped because `D` is bound to the debug panel; arrows own panning. (+30s, clean-view and
  follow-leader were offered and not selected — parked for later.)
- **Rationale:** Mouse-first matches how the game window is driven (browser or OBS Interact);
  "stay until reset" fits deliberate showcase framing.
- **Alternatives:** Keyboard-only (rejected); panel-only sliders (rejected); auto-return timer
  (rejected — fights deliberate framing).

## D-046 — Debug menu: modern glass card, real controls, no dead CSS
- **Context:** Owner wanted "a more modern look" after approving a glass floating card + cyan
  accent; the panel was a dense 260 px flat list with raw checkboxes/selects and ~280 lines of
  styling parked in `index.html`.
- **Decision:** Debug styling moved to `src/debugPanel.css`; panel restyled (380 px, blur, cards,
  collapsible sections, pill tabs, status pills with dots, toggle switches, segmented
  Auto/Direct/TikFinity/Mock control behind a hidden `#conn-mode` input so the `.value` contract
  holds, viewer meter, blur value chip, glass FAB). Drag/collapse/FAB persistence and every
  element id kept; dead `.lb-*`/`.mapping-*` CSS deleted; markup-guard test added.
- **Rationale:** Modern look with zero behavioural risk — ids and wiring untouched; test prevents
  markup/JS drift.
- **Alternatives:** Docked drawer/bottom sheet (rejected by owner); full React port (forbidden by
  guardrails).

## D-045 — Gift→effect mapping is hub-only; the app never hardcodes effect controls
- **Context:** Owner: "We don't have to have any of the declared effects in the controls
  hard-coded into the web app. It should always rely on the hub." The app carried a second,
  parallel mapping system (in-app Gift Mappings editor, `matchMapping`, `/api/mappings`,
  `config/mappings.json`) duplicating the hub's Trigger→Effect mapper.
- **Decision:** Delete the in-app mapping feature entirely — editor UI, matcher, store, endpoint,
  config file and the runtime gift branch in `handleBridgeEvent`. The game keeps only:
  **declaration** (`tikora.manifest.json`, which the hub reads) and **execution** (`giftEffects`
  via `tikora.js`). Gift events still play their sound and feed interaction scores.
- **Consequence (accepted):** effects are 100 % hub-driven — Mock/offline gift injects no longer
  fire effects; wire gifts in Tikora → Game Hub.
- **Alternatives:** Keep the editor as an offline fallback (rejected — two sources of truth);
  sync the two systems (rejected — needless complexity). *(D-035's "mappings UI consumer" of the
  manifest is removed by this decision.)*

## D-044 — Join hint lives between controls and arena (DOM strip); canvas debug overlay removed
- **Context:** The permanent hint covered bottom-left map tiles, and opening the debug panel painted
  an FPS graph, stats boxes, velocity arrows and hitbox circles over the arena (duplicating the
  panel's Performance text).
- **Decision:** The hint is a **centered DOM strip** in the letterbox band between the control bar
  and the canvas (`pointer-events: none`, CSS `-webkit-text-stroke` for the black outline), toggled
  by the existing persisted switch. The canvas debug overlay (`src/debug.js`) is **deleted** along
  with its `DEBUG_FPS_*` constants; `debugMode` now only controls the DOM panel.
- **Rationale:** Map stays clean for the stream; stats live in one place (the panel); a DOM strip
  can't consume canvas space or resize any component.
- **Alternatives:** Keep hint on canvas with a plate (covered tiles); reserve layout space for the
  hint (shrinks the arena); keep overlay behind a checkbox (rejected — panel already has the stats).

## D-043 — Permanent gold join hint in the bottom-left lane *(superseded by D-044 — moved out of the map)*
- **Context:** Owner wanted always-visible joining instructions: "where there is no other
  component, big bold text yellow with outer stroke black, without downscaling any other
  component."
- **Decision:** Render a permanent hint **inside `Onboarding`** in the bottom-left screen lane
  (baselines 756/789 at x16) — deliberately chosen because the rotating tips are top-centre, the
  cinematic card and pick-a-side prompt are bottom-centre, and the join guide is centred: no
  overlap in any state. Gold `#FFD700` bold text, black `strokeText` outline (6/4 px), translucent
  dark plate for contrast over world content. Only the hint itself auto-fits (`fitFont`) if a line
  would overrun the lane; no other component scales. Screen-space (fixed under camera zoom),
  EN/AR, persisted toggle (default on).
- **Alternatives:** Top-left (collides with the rotating tips strip); inside the centre guide
  (not permanent); outside the canvas (letterbox space is inconsistent at stream resolutions);
  static DOM bar (would consume layout space = "downscaling" other components).

## D-042 — Effect identity resolution across layers; prompt aging; effect telemetry
- **Context:** Live test: the hub logged a `freeze` effect as **delivered** to the game's socket,
  yet nothing happened in-game. Traced to three game-side holes: `scoring.reset()` wiping user→team
  each round; known viewers' re-comments returning `null` so queued prompts never resolved
  (silent 20 s drop); chat registering `userId` while hub events can fall back to `username`.
- **Decision:** Team resolution is layered — explicit `teamId` → `scoring.teamOf` over **both keys**
  → the viewer roster's `teamId` → only then prompt/bypass. Joins and round resets register under
  both keys; known-viewer chats re-register and resolve queued prompts. Prompt items age from
  creation time with a counted `dropped`. New **effect telemetry** (`effectStats` +
  `Effects`/`Last effect` debug rows + console log) makes the next live test self-diagnosing; an
  `IDLE + autoLoop` guard restarts stranded rounds.
- **Rationale:** The hub's own log proved delivery; the game must resolve identity independently of
  which key each layer happens to carry, and never fail silently.
- **Alternatives:** Patch the hub to always send `userId` (helps but doesn't cover resets);
  drop the prompt (kills the join driver); only fix registration (leaves key mismatch).

## D-041 — Win celebration: confetti + flag + podium (approved, Phase 29)
- **Context:** The win screen was an arena colour sweep plus a small sidebar panel; owner wants
  "a much better win screen… confetti with the flag of the winner… name and most contributors
  profile pictures and their nicknames. Top three."
- **Decision (approved):** a **full-screen canvas celebration** on top of the kept colour-sweep
  backdrop — pooled confetti (winner-colour + gold/white + pieces clipped from the winner's flag),
  a flag medallion + VICTORY + localized winner name + stats, a **top-3 nations** row, and the
  **overall top-3 supporters** (avatar + nickname + score, ringed in their nation's colour),
  fed by new per-viewer score tracking in `ScoringEngine`. EN/AR strings; hide on round reset.
- **Not yet implemented** — scheduled as Phase 30.

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
