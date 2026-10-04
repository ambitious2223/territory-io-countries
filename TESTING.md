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
- `src/teams.js` — join-keyword matcher: number, ISO2, EN, AR, emoji, fuzzy, negatives.
- `src/zones.js` — home-base layout for N = 2…12 (one full base per nation, rest neutral).
- `src/marble.js` + `src/grid.js` — confined ricochet + one-touch capture and post-capture hold.
- `src/outline.js` — marching-squares union outline + rounded corner paths.
- `src/overlaySnapshot.js` — leaderboard snapshot shape, sorting and percents.
- `src/scoring.js` — each source weight, gift scaling, round settlement/tie-break.
- `src/round.js` — countdown → playing → intermission transitions.
- `src/viewerManager.js` — viewer cap + reinforcement-queue ordering.
- `src/joinCinematic.js` — cinematic queue sequencing.
- `src/mappings.js` — gift-rule matching (first match wins).
- `src/tikoraClient.js` — relay → `hub-client.js` URL derivation + manifest shape.
- `server/tikoraIdentity.js` — hub identity precedence (env → launch URL → config → manifest).
- `src/teamRegistry.js` — flag upload stores the URL and notifies subscribers (live update).
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
- [ ] Joining by number, ISO2, EN, AR, and emoji all assign the correct team.
- [ ] Flag upload saves a 3:2 image, shows a thumbnail in the team row, and appears **live** in that
      team's stronghold, the leaderboard and the overlay (no reload needed).
- [ ] Each ball shows a viewer profile photo with a team-colour ring/glow/tint and nameplate.
- [ ] 30 mock joins: ≤ 24 active, the rest queued and swapped in on death.
- [ ] Join cinematic pans/zooms to spawn; blur slider changes the backdrop.
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
- [ ] Debug → **Winners** lists persisted winners after a round.
- [ ] Launched from the Chic Aura Hub (▶ Run), the game connects on its own — the debug Tikora tab
      shows `connected` plus the injected slug/relay, with no key pasted.
- [ ] Arabic UI renders RTL with no clipped text; all strings translated.
- [ ] FPS stays ≥ 58 with the avatar cap reached (Diagnostics tab).
- [ ] No secrets, uploads, `node_modules/` or `dist/` staged in git.

---

## 5. Performance checks

- Open the Diagnostics tab; confirm FPS + frame time during a full-cap match.
- Watch the particle pool for leaks after many eliminations.
- Confirm socket traffic is batched (no per-frame emits) in the Network tab.
