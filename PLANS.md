# PLANS.md — Roadmap

Phased delivery. Each phase ends with a **verification** step; a phase is done only when lint,
tests and smoke pass and the feature is confirmed in the running game (or Mock mode).

Legend: `[x]` done · `[ ]` todo · `[~]` in progress.

---

## Phase 0 — Documentation & repo
- [x] Author full docs set (README, AGENTS, GUARDRAILS, ARCHITECTURE, GAME_DESIGN, BRIDGE, PLANS, TESTING, DECISIONS, HISTORY, CHANGELOG)
- [x] Define fixed decisions and guardrails
- [x] Connect workspace to `ambitious2223/territory-io-countries` and publish `master`
- [x] Add `.gitignore`
- [x] Add npm scripts (`dev`/`server`/`client`/`test`/`smoke`/`lint`)
- [x] Toolchain: Vite 8, Vitest, ESLint flat config, `@eslint/js`; 0 audit vulnerabilities

**Verify:** docs render on GitHub; `npm run dev` still boots the existing game.

---

## Phase 1 — Bridge server scaffold + auto-connect
- [x] `server/index.js` (Express + Socket.IO + static), `/health`
- [x] `connectionManager` with modes + retries + fallback
- [x] `directBridge` (`tiktok-live-connector`)
- [x] `tikfinityBridge` (ws `21213`) + mode routing
- [x] `server/mock.js` + `/api/mock-event`
- [x] `src/net/bridgeClient.js` + status UI in the debug Connect tab
- [x] Auto-connect on boot from `.tiktok-config.json`

**Verify:** with no username, Mock events reach the browser; with a username, status = `live`.

---

## Phase 2 — Event normalization
- [x] `normalize.js`: unified schema, like-delta, gift combo/dedupe, user extraction
- [x] Chat/gift/like/follow/share/member from Direct + TikFinity
- [~] Bounded dedupe set done; rate-limit helpers pending

**Verify:** unit tests for normalize; live chat/gift appear correctly.

---

## Phase 3 — Teams, flags & i18n
- [x] `src/teams.js` model + `config/teams.json` (8 default teams)
- [x] Join-keyword matcher (number · ISO2 · EN · AR · emoji, fuzzy)
- [x] `stores/teamsStore` + `httpRoutes` (`GET/PUT /api/teams`, `POST /api/flags`) + 3:2 upload helper
- [x] Flag image cache (`teamRegistry.js`) + `imageUtils.js` cover-crop
- [x] `src/i18n.js` (EN/AR + RTL), translation pass on primary UI, debug **Teams** + **Language** tabs

**Verify:** upload a flag, type each keyword variant, correct team resolves.

---

## Phase 4 — Viewer avatars
- [x] Generic N-team zone layout (`src/zones.js`) driving grid colours + spawn points
- [x] Spawn avatar marble per viewer (photo + name + team colour) via `ViewerManager`
- [x] Active cap (24) + reinforcement queue + swap-on-death
- [x] AI fill for thin teams (seeds/respawns a bot when a team has no marble)
- [x] Per-viewer analytics (each viewer marble registered; kills tracked)
- [x] Debug **Viewers** panel (active/queued/total, cap + AI-fill controls)

**Verify:** 30 mock joins → 24 active, 6 queued; one dies → a queued viewer spawns.

---

## Phase 5 — Camera & join cinematic
- [x] Extend `Camera` with pan/zoom/tween (exponential focus easing + blur)
- [x] `joinCinematic.js` queue + profile-photo intro card (focus → hold → return)
- [x] Blur % slider + Skip Intro in the debug **Cinematic** section
- [x] HUD stays screen-space (world blurred under the camera transform only)

**Verify:** each join pans/zooms to spawn; blur slider changes backdrop; 60 FPS holds.

---

## Phase 6 — Scoring & rounds
- [x] `src/scoring.js` (gift-dominant, tunable via `setWeights`)
- [x] Live team scoreboard (DOM, flag/emoji + territory % + score)
- [x] Round state machine (`src/round.js`) + auto-loop + manual Start/End/Auto
- [x] Winners persistence (`stores/winnersStore` + `/api/winners`, client mirror)
- [~] In-app winners HUD/admin and scoring-weight sliders (engine supports them; UI pending)

**Verify:** a timed round ends, correct winner, auto-resets; manual end/next work.

---

## Phase 7 — Gift → power-up mappings
- [x] `stores/mappingsStore` + `config/mappings.json` + `GET/PUT /api/mappings`
- [x] Content-tab mappings editor (gift name / min coins → effect) + Add/Save
- [x] `giftEffects.js` executor with 8 effects (overcharge, shield, boost, heal, colorbomb, area-convert, spawn, instant-claim)
- [x] Game wiring: matching gift triggers the effect for the gifter's team

**Verify:** map a gift to an effect; sending it triggers the effect; params respected.

---

## Phase 23 — Hub-effect delivery fixes + telemetry
- [x] Registrations survive round resets (both keys, at join and on reset)
- [x] Layered effect team resolution (teamId → teamOf both keys → roster → prompt/bypass)
- [x] Known-viewer chats resolve queued prompts; prompt items age from creation with drop counts
- [x] Effect telemetry (effectStats + Effects/Last effect debug rows + console) and IDLE+Auto guard
- [x] Tests (158) + docs; released **2.13.0** — root cause proven via the hub's `effect_log`

**Verify:** debug → Connection → Tikora shows `Last effect · applied` for a gift; the same gift
after a round reset still works without re-commenting.

---

## Phase 24 — Permanent join hint
- [x] Always-on bottom-left gold hint (black stroke, dark plate, self-fitting) drawn in screen
      space, clear of tips/cinematic/prompt/guide; EN/AR; persisted **Join hint** toggle
- [x] Tests (159); released **2.14.0**

**Verify:** the hint is visible in every game state and never overlaps the tips strip, cinematic
card or pick-a-side prompt; the toggle hides it.

---

## Phase 25 — Reset Players button
- [x] `clearHumans` (roster/queue/balls) + `clearUsers` + `game.resetPlayers()`; button between
      Start and End; AI/effect soldiers survive so the arena stays filled
- [x] Tests (161); released **2.15.0**

**Verify:** click Reset Players → human soldiers vanish, Viewers panel empties, next round needs
fresh comments; AI soldiers keep playing meanwhile.

---

## Phase 26 — Hint relocation + arena debug overlay removal
- [x] Permanent join hint moved off the canvas into a centered DOM strip in the band between the
      controls and the arena (CSS stroke text, EN/AR, persisted switch intact)
- [x] Canvas debug overlay deleted (`src/debug.js`, `debug.draw`/`pushFrame`, dead FPS constants);
      the panel's Performance section is the only stats surface
- [x] Tests (161); released **2.15.1**

**Verify:** the hint never covers map tiles; opening the debug panel draws nothing on the arena.

---

## Phase 27 — Hub-only effect mapping
- [x] In-app gift-mappings feature removed end-to-end (editor, matcher, `/api/mappings`,
      `config/mappings.json`, runtime gift branch); gift events still score + play a sound
- [x] `tikora.manifest.json` is the sole declaration; the hub is the sole mapper
- [x] Docs (D-045) + tests (152); released **2.16.0**

**Verify:** the debug panel has no Gift Mappings section; `/api/mappings` 404s; a hub-mapped gift
still fires its effect; Mock gift injects only score (no effect) without the hub.

---

## Phase 28 — Modern glass debug menu (approved: glass card + cyan accent)
- [x] Debug CSS extracted to `src/debugPanel.css`; glass panel (380 px, blur, radius 18, cyan
      hairline); drag/collapse/FAB persistence kept
- [x] Status pills, toggle switches, segmented mode control (hidden `#conn-mode`), viewer meter,
      blur value chip, collapsible section cards, glass FAB
- [x] Markup-guard test (`tests/debugPanel.test.js`); docs (D-046); released **2.17.0**

**Verify:** the panel looks like a modern glass card; every control still works (connect, toggles,
sliders, teams, language); sections collapse; ~280 lines of dead CSS gone from `index.html`.

---

## Phase 29 — Manual camera + nation jump presets
- [x] `ManualCamera`: click-to-focus / click-ball follow / wheel zoom toward cursor / drag pan /
      arrows + `+`/`-`/`0`/`Esc`; cancels auto-zoom; stays until reset; toasts (EN/AR)
- [x] Camera section (Connection tab): Arena · Leader · per-nation chips (1.6× capitals)
- [x] Tests (7, 162 total); docs (D-047); released **2.18.0**
- Deferred (offered, not selected): +30s extend, clean-view toggle, follow-leader auto mode

**Verify:** click a border → focus; click a ball → follows until it dies; wheel zooms toward the
cursor; 0 returns to the arena; Camera chips jump to capitals; typing in the panel doesn't move
the camera.

---

## Phase 30 — Win celebration with sound (approved, D-041/D-048)
- [x] Per-viewer contributor tracking (`topContributors`)
- [x] Pooled confetti system (burst + rain, flag-clipped pieces, cap, self-stop)
- [x] `WinScreen`: wash + vignette, medallion pop, VICTORY/name/stat line, top-3 nations + top-3
      supporters podium; fade in / clear on reset
- [x] Procedural sounds: confetti burst, reveal pop, podium bells (+ existing victory fanfare)
- [x] Tests (173); docs; released **2.19.0**

**Verify:** End a round and watch the full sequence with sound; supporters row reflects the round's
biggest interactors; nothing lingers into the next round.
- [ ] Confetti (pooled, winner colours + flag-clipped pieces), flag medallion, VICTORY + stats
- [ ] Top-3 nations row + overall top-3 supporters (avatars/nicknames, per-viewer scores in
      `ScoringEngine`)
- [ ] Full-screen canvas overlay above the kept colour sweep; EN/AR; tests; release **2.14.0**

---

## Phase 31 — Auto gift speed burst + Camera tab (D-049)
- [x] Built-in default: every gift → coin-scaled `boost` on the donor's own ball
      (`GIFT_SPEED_PER_COIN` / `_MIN` / `_MAX`), routed through `executeEffect` (prompt-holding,
      identity, telemetry for free); fires with or without the hub
- [x] Camera tab (5th pill): presets moved out of Connection + **Players** list
      (`src/cameraPanel.js`) — one button per living human viewer, click → follow, `.active`
      pulse, signature-diffed rebuild; cleared on round reset; `manualCamera.follow` cleared too
- [x] Tests (188 total); docs (D-049, AGENTS/BRIDGE/GAME_DESIGN amended); released **2.20.0**

**Verify:** Mock-inject a gift with the hub closed → donor's ball bursts (bigger coins = longer,
2–10 s cap); a nation-less donor gets the pick-a-side prompt. Camera tab: buttons track joins and
deaths, clear on round reset, clicking a name follows that player; Arena/Leader/chips unchanged.

---

## Phase 32 — Win celebration glow-up + per-nation anthem (D-050)
- [x] Animated entrance: overshoot medallion + rotating rays, VICTORY scale-in, count-up stats,
      reveal confetti burst + crowd swell
- [x] Depth/clarity: faint winner flag watermark, reason headline, win-count badge
- [x] Real podium: staggered cards, raised centre 1st place, gold/silver/bronze medals + supporter
      rings/crown; `Next round in Ns` intermission countdown
- [x] Per-nation **procedural anthem** (`anthemFrequencies` seeded by nation id) replacing the
      generic fanfare; procedural drumroll + crowd
- [x] Refactors: `src/winArt.js` (drawing) + `src/celebrationAudio.js` (sounds) keep files < 400 lines
- [x] Tests (194 total); docs (D-050); released **2.21.0**

**Verify:** End a round → drumroll → medallion pop with rays + the winner's anthem + crowd + a
second confetti burst → VICTORY + reason + counting stats + win badge → raised podium with medals
→ "Next round in Ns". Different winners sound different; nothing lingers into the next round.

---

## Phase 33 — Built-in Cloudflare overlay tunnel (D-051)
- [x] `server/tunnel.js`: spawn `cloudflared tunnel --url <target>`, parse the quick-tunnel URL,
      status lifecycle, kill child on exit/signals
- [x] `server/index.js` auto-start + `tunnel:status` relay/replay; `GET/POST /api/tunnel`;
      `tunnelEnabled`/`tunnelTarget` config; smoke forced off (`TWF_TUNNEL=0`)
- [x] Client: `onTunnel`, Overlay-tab public link + status row + Start/Stop toggle, i18n (EN/AR)
- [x] Tests (201 total); docs; released **2.22.0**

**Verify:** Launch the app → Overlay tab shows a live `https://…trycloudflare.com/leaderboard.html`
link ready to Copy; Stop/Start toggles it and persists; no tunnel spawns under tests/smoke.

---

## Phase 22 — Loose join matching + cinematic performance
- [x] `matchTeam`: Arabic in fuzzy/prefix, `ال` article optional, any-word/first-word matching,
      length-scaled typo tolerance with lookalike negatives
- [x] Cinematic blur off by default (cheap dark veil; slider opts in) + border outline cache
      (`rebuildOutlines` on dirty, browser Path2D)
- [x] Tests (151); docs; released **2.12.0**

**Verify:** Arabic partial/typo comments join the right nation while lookalikes don't; the join
cinematic no longer drops frames (raise the blur slider to compare).

---

## Phase 21 — Onboarding: join guide + gameplay tips
- [x] Half-arena (50 %) "How to Join" card each round start: steps + nation chips, 10 s auto-hide,
      ✕ dismiss, persisted switch + "Show now" in **Advanced → Guide & Tips**
- [x] Rotating dismissible tips (join / gift / halfway / final 30 s), once per milestone per round
- [x] `src/onboarding.js` (render + hit-test + persistence); tests (9); released **2.11.0**

**Verify:** each round start shows the big guide; it hides itself / ✕ works; tips pop once per
milestone and rotate; both switches persist; Arabic renders with no mirroring.

---

## Phase 20 — Pick-a-side bypass for testing
- [x] `PROMPT_BYPASS` toggle (debug → Advanced → Mock Event, persisted, default off); unknown
      activators apply instantly to the least-loaded nation + are registered there
- [x] Tests (bypass applies / default still prompts); docs; released **2.10.0**

**Verify:** inject a gift as a stranger with the toggle on → effect fires instantly, no pop-up;
toggle off → the pick-a-side prompt returns.

---

## Phase 19 — Total Arabic, no layout mirroring
- [x] Language switch is text-only (`dir` stays `ltr`); docs updated (D-036)
- [x] Translate hardcoded English: round/map/mode/mock labels, 12 effect labels, VFX texts,
      scoring weights, placeholders, fallbacks
- [x] Localize team names everywhere (canvas/leaderboard/cinematic/effects/bots/overlay `nameAr`)
- [x] `tests/i18n.test.js` (parity + markup scan + dynamic keys + no-mirror); released **2.9.0**

**Verify:** switch Arabic — every string translates and **nothing moves**; switch back — English.

---

## Phase 18 — Power-up catalog declared for the hub
- [x] Six new power-ups in `giftEffects` + manifest (freeze, shield, team_speed, claim_storm,
      mega_bomb, summon) incl. clamped params
- [x] `tikora.manifest.json` = 12 effects and **drives** the in-game mappings dropdown
      (`EFFECT_OPTIONS`); `tests/manifest.test.js` enforces sync
- [x] Grid `setShield/isShielded` (+ bomb/enclosure/claim guards, dashed outline), marble `freeze`
- [x] Hub shows them automatically (manifest sync via seeded path / live capabilities)
- [x] Tests (127) + docs; released **2.8.0**

**Verify:** restart Tikora (or reconnect the game) → Game Hub lists all 12 effects; map a gift to
each new effect and use **▶ Run**/Gift Gallery inject to see freeze, shield's dashed border, the
claim-storm sweep and a summon of photo-carrying allies.

---

## Phase 17 — Auto-zoom tracking, contrast outline, pick-a-side
- [x] Cinematic tracks the joiner's live position + persisted **Auto-zoom** toggle (debug Cinematic)
- [x] Black/white **contrast ring** on soldiers (team glow/tint retained)
- [x] **Pick-a-side** pop-up (photo + nickname) with held-effect queue for non-member gifters
- [x] Effect soldiers use the activator's **photo + name**; hub forwards avatar/name/userId
      (companion commit in the hub repo)
- [x] Tests (cinematic tracking, joinPrompt, giftEffects identity); released **2.7.0**

**Verify:** zoom follows the moving soldier; soldier readable on own colour; gift from a stranger
pops "Pick a side!" and fires when they join; effect soldier shows the gifter's photo.

---

## Phase 16 — Finer grid + slow soldiers + real seconds
- [x] Grid 48×32 @ 25 px (1536 tiles) with physical-look compensations (base 8×8, 2×2 wall blocks,
      outline 3 px, ball radius 11, color-bomb 4, score weight ÷4)
- [x] Default speed 1.1 + **live Soldiers slider** (Connection tab, 0.5–3.0, persisted, rescales
      live balls); overcharge ×2.2
- [x] Normalized duration constants to seconds (overcharge, hold, claim-SFX, power-up spawn, AI
      fill, bounce flash) — previously frame-counted and effectively broken
- [x] Tests (`speedControl`, `durations`), docs; released **2.6.0**

**Verify:** one soldier creeps (no % jumps), slider changes pace live on stream, a gift gives a
clear 6-second speed burst, power-ups appear every ~8–15 s (not constantly), map walls look as
thick as before.

---

## Phase 15 — Capital slider, layering, auto-save
- [x] Capital-size slider (Teams tab, 0.5x–2.5x) persisted as `capitalScale`; `bases.js` scales
      the medallion, emoji and name pill
- [x] Render order: capitals above balls, below event text
- [x] Name banner restyled (dark pill + team-colour border + shadowed text)
- [x] Debounced team auto-save (1.5 s + unload flush) with panel/game listener split so typing
      keeps focus and edits appear live in-game
- [x] Tests (capital scale, autosave debounce), docs; released **2.5.0**

**Verify:** drag the slider → capitals resize live; capitals cover their balls but not event text;
rename a team and see it update + survive a reload without clicking Save.

---

## Phase 14 — Stronghold photos, ball identity, lean debug
- [x] Team photo upload applies live (`uploadFlag` notifies) + row thumbnail/status
- [x] `src/bases.js`: 3D circular stronghold medallion with the team photo (emoji fallback)
- [x] Ball identity: team-colour ring + glow + light tint + nameplate over the TikTok avatar
- [x] Debug panel regrouped to Connection · Teams · Overlay · Advanced; tests/docs; released **2.4.0**

**Verify:** uploading a team photo shows instantly in the stronghold/leaderboard/overlay; each ball
reads as its nation; the debug panel shows only the everyday controls.

---

## Phase 13 — Hardwire to the Chic Aura Hub
- [x] `server/tikoraIdentity.js` (env → launch-URL → config → manifest) + `httpRoutes` uses it
- [x] `countriesio.bat` opens `TIKORA_GAME_LAUNCH_URL` when launched by the hub
- [x] Client auto-connects from config/query; **no manual key**
- [x] Debug Tikora tab read-only; removed key/relay inputs + Connect/Disconnect; no `POST /api/tikora/config`
- [x] Tests (`tikoraIdentity`), docs; released **2.3.0**

**Verify:** launched from the hub, the game joins with the injected identity and receives effects
with zero setup; the hub remains the only place to activate/deactivate effects.

---

## Phase 12 — Clean capture, debug workspace, overlay
- [x] One-touch capture; convert meter + inset rendering removed
- [x] Post-capture **hold** (`TILE_HOLD_TIME`) so borders can't flicker; freshness tint
- [x] Rounded union nation outlines via `src/outline.js` (marching squares)
- [x] Quieter feedback: throttled claim SFX, fewer sparks, one enclosure-fill pass per frame
- [x] Draggable translucent debug **FAB** + tabbed debug workspace (`debugPanel.js`/`debugFab.js`)
- [x] Live **leaderboard overlay** at `/leaderboard.html` over a bridge relay (`overlay:state`);
      `buildStandings()`/`buildOverlayPayload()`; Vite multi-page build
- [x] Tests (outline/overlay/convert), lint/test/build/smoke green; released **2.2.0**

**Verify:** one touch flips a tile and no half-convert squares appear; the FAB drags/opens; the
overlay URL renders the minimal live leaderboard + timer in a second browser source.

---

## Phase 11 — Ricochet confinement
- [x] Balls are confined to their nation and **reflect** off neutral/enemy borders
- [x] Contact-accumulated conversion (no sit-timer, no pathfinding)
- [x] Bounce jitter, substep anti-tunnel, trapped-ball rescue; ball-ball collisions off
- [x] Grid `blocksAt`/`convertOnHit`/`nearestOwnedTile`; dead targeting API pruned
- [x] Tests updated; lint/test/build/smoke green; released **2.1.0**

**Verify:** balls never leave their colour, borders stay crisp, and hitting the border converts it.

---

## Phase 10 — Conquest redesign
- [x] Neutral arena + spread **home bases**; thick nation **borders**
- [x] **Slow-convert** capture (adjacent tiles), contested-tile cancellation
- [x] Remove swords/HP/knockback/kills; territory is the only conflict
- [x] **Conquerable** bases with per-nation **elimination**
- [x] **Win by land** (most territory / 65% domination)
- [x] Nation scoreboard + **Conquest feed** + base banners (EN/AR)
- [x] Mappings/manifest/gift effects reconciled; dead modules removed
- [x] Tests for base layout + slow-convert; lint/test/build/smoke green; released **2.0.0**

**Verify:** nations expand from their bases, borders creep and get eaten, a wiped nation is
eliminated, and the land leader wins at time-up.

---

## Phase 8 — TikFinity & Tikora tabs
- [x] `tikfinityBridge.js` (ws 21213) + mode routing (done in Phase 1)
- [x] TikFinity host/port fields in the Connect panel
- [x] `tikora.manifest.json` + `src/tikora.js` hub client (loads `hub-client.js`, routes effects)
- [x] `/api/tikora/config` (env + saved config) and auto-connect when enabled
- [x] Debug **Tikora Hub** panel (key, relay, status, connect/disconnect)

**Verify:** each source independently drives the game; fallback works.

---

## Phase 9 — Polish & hardening
- [x] Interaction SFX (join, gift); capture/victory audio already present; join intro card VFX
- [x] Performance pass: shared per-frame tile-count map (scoreboard + domination)
- [x] Winners HUD (All-Time Winners) + scoring-weight editor in the debug panel
- [x] Full test + smoke coverage; ESLint clean
- [x] Docs finalised; CHANGELOG released as **1.0.0**

**Verify:** 60 FPS with cap reached; all gates green.

---

## Stretch goals
- [ ] Team-vs-team multi-streamer relay (two bridged chats)
- [ ] Leaderboard persistence across sessions (already via winners store)
- [ ] Additional map presets and animated flag idle effects
- [ ] OBS theme packs / transparency presets
```
