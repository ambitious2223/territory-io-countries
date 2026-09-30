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
- `src/map.js` — zone generation for N = 2…12 (contiguous, non-overlapping, full coverage).
- `src/scoring.js` — each source weight, gift scaling, round settlement/tie-break.
- `server/normalize.js` — gift combo skip, msgId dedupe, like-delta + re-baseline, user shapes.
- `server/connectionManager.js` — mode selection, fallback count, retry scheduling.

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
- [ ] Debug → Connect shows the right status badge for the chosen source.
- [ ] Joining by number, ISO2, EN, AR, and emoji all assign the correct team.
- [ ] Flag upload saves a 3:2 image and appears on the team card.
- [ ] 30 mock joins: ≤ 24 active, the rest queued and swapped in on death.
- [ ] Join cinematic pans/zooms to spawn; blur slider changes the backdrop.
- [ ] Likes/comments/follows/shares/gifts each increase the right team's score.
- [ ] Event rate-limits and dedupe suppress spam (rapid repeat gift/like).
- [ ] Round runs 3:00, announces the correct winner, auto-resets.
- [ ] Manual End / Next / Pause override the auto-loop.
- [ ] Arabic UI renders RTL with no clipped text; all strings translated.
- [ ] FPS stays ≥ 58 with the avatar cap reached (Diagnostics tab).
- [ ] No secrets, uploads, `node_modules/` or `dist/` staged in git.

---

## 5. Performance checks

- Open the Diagnostics tab; confirm FPS + frame time during a full-cap match.
- Watch the particle pool for leaks after many eliminations.
- Confirm socket traffic is batched (no per-frame emits) in the Network tab.
