# GUARDRAILS.md — Code Health Rules

Non-negotiable rules for every contribution. If a rule blocks you, raise it as a decision
([DECISIONS.md](./DECISIONS.md)) rather than breaking it silently.

---

## 1. Hard limits

1. **Max 400 lines per source file.** Approaching the limit → split by responsibility.
   Data files (`config/*.json`, card/flag lists, translation dictionaries) are exempt.
2. **No comments** in code unless explicitly requested. Names and structure carry the meaning.
3. **No magic numbers.** Tunables live in `src/config.js` or `config/*.json` as named constants.
4. **No global state.** State lives in a class instance or an explicitly exported module.
5. **No unused imports, variables or files.** Delete dead code; do not leave it "for later".
6. **No `console.log` in shipped client code.** Use a small structured logger; server logging is
   namespaced (`[CHAT/direct]`, `[GIFT/tikfinity]`, `[BRIDGE]`).
7. **No `any`-style escape hatches.** Validate at the boundary instead of casting.

---

## 2. Architecture rules

- **Separation of concerns** is mandatory:
  - rendering only draws; `update()` only mutates; never mix them.
  - game logic never lives in the bridge server; bridge/socket code never lives in the renderer.
  - persistence only touches `server/stores/` (or the client's localStorage fallback mirror).
- **Entity management:** balls live in one array on the `Game` instance; eliminated balls are
  filtered out, not mutated in place. The grid is the single source of truth for territory.
- **Game loop discipline:** `requestAnimationFrame` is the only animation driver. All state
  mutation happens in `update()`; all drawing in `render()`. Never draw from `update()`, never
  mutate state from `render()`.
- **Camera:** world layers (grid, bases, borders, balls, particles) are transformed by the
  camera; HUD is always screen-space. Camera pan/zoom is pure presentation — never gameplay state.
- **Bridge boundary:** the client only ever consumes the unified event schema. Raw TikTok /
  TikFinity payloads are normalized on the server before they cross the socket. Tikora is a
  client-side effect hub (not a chat source) and routes effects through the shared executor.

---

## 3. Security rules

- **No secrets in the repo.** `.env`, `.tiktok-config.json`, tokens and keys are gitignored.
- **Validate every inbound payload** on the bridge server before it is used or forwarded
  (type, range, length). Reject malformed events; never trust the wire.
- **Uploads:** flag images are validated by base64 magic bytes, size-capped, and written with
  ASCII-slug filenames. Never write a client-supplied path.
- **No shell/`eval`/dynamic `require`** on any remote-supplied string.
- **Rate-limit** user-driven effects (follow/share/like/comment) to prevent score abuse.
- **Dedupe** gifts by `msgId` and apply the combo rule (`giftType === 1 && !repeatEnd` → skip).

---

## 4. Performance rules

- **Target:** solid 60 FPS on mid-range hardware with the maximum active balls.
- **Budgets:** ≤ 26 balls, grid ≤ 24×16 (384 tiles), particle pool ≤ 250.
- **No allocation in the hot loop** — reuse/pool objects (particles, vectors, per-frame sets).
- **Redraw only what changed** (dirty-tile flag on the grid).
- **Batch socket emissions** — never emit per particle or per frame; aggregate and flush.
- **Cache avatar/flag `Image` objects**; never load an image inside the render loop.
- Measure with the in-app Diagnostics tab (FPS + frame time) before claiming a perf win.

---

## 5. Testing rules

- **Pure logic must be unit-tested** (Vitest): join-keyword matcher, home-base layout, ball
  slow-convert, scoring, event normalization, like-delta, team assignment, round settlement.
- **Test after every feature** — run the game (or **Mock mode**) and verify visually.
- **Zero console errors** before moving on.
- **Smoke test** (`npm run smoke`) must pass for any bridge/socket change.
- Full strategy + manual QA checklist: [TESTING.md](./TESTING.md).

---

## 6. Code-health checklist (before marking a task done)

- [ ] Every changed file is under 400 lines.
- [ ] No comments, no magic numbers, no dead code, no unused imports.
- [ ] Each function does one thing; each file has one responsibility.
- [ ] Async paths have error handling; no unhandled promise rejections.
- [ ] User-facing strings go through `i18n.js` `t()` (EN + AR present).
- [ ] `npm run lint`, `npm test`, `npm run smoke` all pass.
- [ ] Verified in the running game at stable FPS.
- [ ] Docs updated where behaviour changed (ARCHITECTURE / BRIDGE / CHANGELOG).
- [ ] No secrets, no `node_modules/`, no `dist/` staged.

---

## 7. File organization rules

- `src/renderer.js` — only canvas drawing and camera transform.
- `src/game.js` — only orchestration, loop, input, lifecycle.
- `src/grid.js` / `src/map.js` — only territory data and graph/base operations.
- `src/marble.js` — only ball movement (confined ricochet) and capture behaviour.
- `src/scoring.js` — only interaction → score math (no DOM, no canvas).
- `src/teams.js` — only team model and join-keyword matching (pure, unit-tested).
- `src/net/bridgeClient.js` — only socket transport + status; no game rules.
- `server/*` — only connection, normalization, persistence, static serving.

---

## 8. Anti-patterns to avoid

- Rendering in `update()` or logic in a draw path.
- Mixing TikTok connector code with game logic.
- God objects (one class orchestrating everything).
- Bypassing the adjacency/zone graph for neighbour lookups.
- Duplicating tunables instead of reading `config`.
- Emitting a socket message per game tick.
- String literals in JSX/HTML instead of translation keys.
- Adding dependencies "because it's convenient".

---

## 9. Dependency policy

- **Frontend runtime deps:** `socket.io-client` only.
- **Server runtime deps:** `express`, `socket.io`, `tiktok-live-connector`, `ws` (+ optional `zod`
  for boundary validation).
- **Dev deps:** `vite`, `vitest`, `eslint`, `concurrently`.
- Any addition outside this list requires a DECISIONS entry with rationale and alternatives.

---

## 10. Git hygiene

- Conventional Commits; one logical change per commit.
- Never commit `node_modules/`, `dist/`, `.env`, `.tiktok-config.json`, or `public/flags/*` uploads.
- Never force-push or rewrite shared history.
- Keep the working tree clean; do not commit generated artifacts.
- Update [CHANGELOG.md](./CHANGELOG.md) on every shipped change.
