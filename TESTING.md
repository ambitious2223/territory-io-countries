# TESTING.md — Strategy & QA

## 1. Principles

- **Pure logic is unit-tested.** Rendering is verified visually.
- **Zero console errors** before any task is considered done.
- Every bridge change must pass the socket **smoke** test.
- Prefer **Mock mode** for fast iteration; confirm on a real stream before going live.

---

## 2. Automated gates

| Command | Scope |
| --- | --- |
| `npm test` | Vitest unit tests (pure modules) |
| `npm run smoke` | Bridge + Socket.IO end-to-end |
| `npm run lint` | ESLint (must be clean, zero warnings) |
| `npm run build` | Production bundle succeeds |

### Required unit coverage (pure modules)
- `src/teams.js` — join-keyword matcher: number, ISO2, EN, AR, emoji, any-word/prefix matching,
  Arabic definite-article variants, length-scaled typo tolerance, negative lookalikes.
- `src/zones.js` — home-base layout for N = 2…12 (one full base per nation, rest neutral).
- `src/marble.js` + `src/grid.js` — confined ricochet + one-touch capture and post-capture hold;
  border outline cache rebuilds only on ownership change.
- `src/outline.js` — marching-squares union outline, rounded corner paths, `buildPath` (Path2D in
  the browser, null fallback elsewhere).
- `src/overlaySnapshot.js` — leaderboard snapshot shape, sorting and percents.
- `src/scoring.js` — each source weight, gift scaling, round settlement/tie-break.
- `src/round.js` — countdown → playing → intermission transitions.
- `src/viewerManager.js` — viewer cap + reinforcement-queue ordering.
- `src/joinCinematic.js` — cinematic queue sequencing.
- `src/tikoraClient.js` — relay → `hub-client.js` URL derivation + manifest shape.
- `server/tikoraIdentity.js` — hub identity precedence (env → launch URL → config → manifest).
- `src/teamRegistry.js` — flag upload notifies, capital scale clamps/notifies the game only,
  debounced auto-save (fake timers), save-to-server notifies the game but not the panel.
- `src/speedControl.js` — clamps/persists the soldier speed and rescales live balls.
- `tests/effectRouting.test.js` — effects survive round resets, queued prompts resolve on re-comment
  (known roster), username-only lookups find the team, telemetry counters, IDLE+Auto recovery.
- `tests/joinPrompt.test.js` — prompt queue, resolve-by-username, timeout, clear, **age-from-
  creation with drop counting**.
- `tests/manifest.test.js` — manifest ↔ `EFFECT_KEYS` stay in sync (12 effects).
- `tests/i18n.test.js` — EN↔AR key parity, every `data-i18n` key in markup is covered, dynamic
  key families exist, and `dir` stays `ltr` in both languages (no layout mirroring).
- `tests/giftEffects.test.js` — effect identity, plus freeze/shield/claim_storm/mega_bomb/
  summon/team_speed behaviour and param clamping.
- `tests/onboarding.test.js` — join guide show/auto-hide/dismiss/close-hit, tip rotation + phase
  milestones (once each), persisted switches, draw smoke.
- `tests/cinematic.test.js` — cinematic tracks a moving soldier and stops when it dies.
- `tests/durations.test.js` — overcharge lasts 6 s, capture hold 2.5 s, power-ups wait their
  interval (all in seconds, not frames).
- `tests/debugPanel.test.js` — panel markup pins every wired id and the four tabs.
- `tests/cameraControls.test.js` — zoom-toward-cursor math + clamps, focus/follow/death-reset,
  pan/zoom/reset, Arena/Leader/nation presets, canvas-handler attach.
- `tests/confetti.test.js` — burst + rain, piece cap, self-stop, clear-on-stop, draw smoke.
- `tests/winScreen.test.js` — snapshot (winner/top-3 nations/supporters), scheduled reveal/podium
  sounds fire once, fade-in + draw smoke + clean hide.
- `src/scoring.js` — also covers per-viewer `topContributors` (order, cap, reset).
- `server/normalize.js` — gift combo skip, msgId dedupe, like-delta + re-baseline, user shapes.
- `server/mock.js` — mock event construction.
- `server/uploads.js` — flag image validation.

---

## 3. Mock mode

The bridge starts in Mock when no username is configured. Use the Connect tab injector or:

```bash
curl -X POST http://localhost:3020/api/mock-event \
  -H "Content-Type: application/json" \
  -d '{"type":"join","username":"tester","teamIndex":1}'
```

Simulate: `join`, `chat`, `like`, `share`, `follow`, `gift` (with `value` coins).

---

## 4. Manual QA checklist (before a live stream)

- [ ] `npm run dev` starts bridge (:3020) + app (:1935) with no errors.
- [ ] `/health` reports the expected `source` and `tiktokState`.
- [ ] Debug → Connect shows the right status badge for the chosen source (opened via the FAB).
- [ ] The floating debug button drags, toggles the tabbed panel, and remembers its spot.
- [ ] Debug menu checks: glass panel with pill tabs; **segmented** mode switch still connects;
      toggles (AI Fill / guide / hints) switch and persist; Bridge/Tikora pills show green online /
      red offline; viewer meter tracks the cap; section headings collapse their card; language
      switch relabels everything (EN/AR) without moving the layout.
- [ ] **Manual camera:** click a map spot → smooth focus; click a soldier → camera follows it
      (resets when it dies); wheel zooms toward the cursor and never passes 3× or below 1×; drag
      pans; arrows pan, `+`/`-` zoom, `0`/`Esc` resets; a yellow toast appears; a running join
      cinematic is cancelled; **nothing moves on its own afterwards**.
- [ ] **Camera presets** (Connection tab): Arena resets, Leader jumps to the leading nation's
      capital, nation chips jump to each capital at 1.6×; chips update when teams are edited.
- [ ] **Win celebration:** end a round → colour wash + confetti (flag pieces if the winner has a
      photo) + medallion pop with sound → **VICTORY** + name + tiles/%/duration → podium with
      top-3 nations and top-3 supporters (photos, scores) + bell chime; plays through
      intermission and clears on the next round; gifts earlier in the round determine the
      supporters row.
- [ ] Joining by number, ISO2, EN, AR, and emoji all assign the correct team.
- [ ] Loose matching: `Egypt ❤`, `I choose EGYPT`, `united`, `الامارت`, `سعودية` all join the
      right nation; `iran`/`nope` join nothing.
- [ ] Flag upload saves a 3:2 image, shows a thumbnail in the team row, and appears **live** in that
      team's stronghold, the leaderboard and the overlay (no reload needed).
- [ ] Each ball shows a viewer profile photo with a team-colour ring/glow/tint and nameplate.
- [ ] Capital-size slider (0.5x–2.5x) rescales every stronghold + its name banner immediately.
- [ ] Capitals render **above** balls; the name pill stays readable on any territory colour.
- [ ] Edit a team name/colour and wait ~2 s → it shows live in-game and persists after a reload
      (no Save click needed).
- [ ] Grid is 48×32 (25 px) — one soldier creeps territory, no instant percentage jumps; map walls
      look as thick as before.
- [ ] Connection → **Soldiers speed slider** changes the pace instantly (balls already out there
      speed up) and the value survives a reload.
- [ ] A gift overcharge is clearly visible for ~6 s; power-ups appear every ~8–15 s (not
      constantly); claim sounds are throttled.
- [ ] A new viewer's join zooms in and **follows their moving soldier** (Auto-zoom off = no camera
      move, join sound still plays).
- [ ] Soldiers are readable on their **own** colour (black/white ring), team tint still obvious.
- [ ] Mock-inject a gift from a username who never commented → photo pop-up "Pick a side!" appears;
      when that user comments a nation, the held effect fires on their soldier (with their photo).
- [ ] With **Skip pick-a-side** (Advanced → Mock Event) checked, the same injection applies
      instantly to a nation and no pop-up appears; uncheck → prompt returns (default).
- [ ] **Effect telemetry:** debug → Connection → Tikora shows `Effects` counting up and
      `Last effect` reading `applied` after a working gift (or `queued`/`dropped` when it isn't —
      that's your diagnosis instead of guessing). Console shows `[hub] effect <key> from <user>`.
- [ ] **Round regression:** after a round resets, a gift from a viewer who played last round still
      applies immediately; pressing End during the countdown doesn't strand the game (Auto on
      restarts it).
- [ ] Round start shows the big **How to Join** card (≈ half the arena, steps + nation chips);
      it auto-hides after ~10 s, ✕ dismisses it, and **Advanced → Guide & Tips** turns it off/on
      (persists). Contextual tips appear once each (join/gift/halfway/final 30 s) and are ✕-able.
- [ ] The **permanent gold join hint** sits **centered in the band between the controls and the
      arena** (not on the map), bold gold with black outline in every state; the **Join hint**
      switch (persisted) hides/shows it without touching other components.
- [ ] Opening the debug panel draws **nothing over the arena** (no FPS graph, vectors or hitboxes);
      FPS/frame/particle stats read from the panel's Performance section instead.
- [ ] Restart Tikora → Game Hub lists **all 12 effects**; mapping dropdown in-game shows the same
      list; map each new effect (freeze / shield / team speed / claim storm / mega bomb / summon)
      and inject it: frozen soldiers get the icy ring, a shield shows the **white dashed border**
      and survives a bomb, claim storm sweeps the frontier, summon spawns photo-carrying allies.
- [ ] 30 mock joins: ≤ 24 active, the rest queued and swapped in on death.
- [ ] Join cinematic pans/zooms to spawn; the backdrop is a dark veil (blur slider starts at 0 —
      raise it and blur returns).
- [ ] The arena starts neutral with one visible home base per nation.
- [ ] Balls ricochet off their border, **never leave their colour**, and a **single touch** flips a
      tile (no half-convert squares). A freshly taken tile resists a retake for a couple of seconds.
- [ ] Nation borders render as clean rounded outlines, not a grid of seams.
- [ ] The leaderboard shows only `rank · flag · name · %` (no conquest list, no viewer counts).
- [ ] `/leaderboard.html` in a second browser window mirrors the leaderboard + timer on one line
      per nation (nothing wraps) and the timer matches the column width.
- [ ] A nation reduced to zero tiles is eliminated (greyed leaderboard) and stops spawning.
- [ ] The land leader wins at time-up; 65% triggers an immediate domination win.
- [ ] Likes/comments/follows/shares/gifts feed the interaction score / power-ups.
- [ ] Event rate-limits and dedupe suppress spam (rapid repeat gift/like).
- [ ] Round runs 3:00 and auto-resets to neutral + fresh bases.
- [ ] Manual End / Next / Pause override the auto-loop.
- [ ] **Reset Players** (top bar, beside Start): human soldiers vanish immediately, Viewers counts
      empty, queued humans and prompts/registrations are gone, AI soldiers keep playing — and the
      next round starts with **no returning players** (fresh comment required).
- [ ] Debug → **Winners** lists persisted winners after a round.
- [ ] Launched from the Chic Aura Hub (▶ Run), the game connects on its own — the debug Tikora tab
      shows `connected` plus the injected slug/relay, with no key pasted.
- [ ] Switching to Arabic translates **every** string (key-parity test green) with **no layout
      mirroring** and no clipped text; team names render in Arabic on canvas/leaderboard/overlay.
- [ ] FPS stays ≥ 58 with the avatar cap reached (Diagnostics tab).
- [ ] No secrets, uploads, `node_modules/` or `dist/` staged in git.

---

## 5. Performance checks

- Open the Diagnostics tab; confirm FPS + frame time during a full-cap match.
- Watch the particle pool for leaks after many eliminations.
- Confirm socket traffic is batched (no per-frame emits) in the Network tab.
