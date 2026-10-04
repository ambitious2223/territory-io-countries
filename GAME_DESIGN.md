# GAME_DESIGN.md — Territory With Flags

## 1. Concept

The arena starts **neutral**. Each team (a country/nation) owns a small, clearly-marked **home
base** with its flag and name. When a viewer joins, they become a single **ball** that pours out
of their base and expands the nation's border tile by tile. Balls slowly **convert** the tiles
they stand on; where two nations meet, borders creep forward and get eaten back. Interaction
(likes, comments, follows, shares, gifts) feeds power-ups and a live score, but the round is won
by **land**. A nation that loses every tile is **eliminated** for the round.

The only "combat" is territory: no swords, no HP, no knockback.

---

## 2. Teams & flags

- **2–12 teams**, streamer-configured. Ships with a default 8-slot roster.
- Each team: `{ id, index, name {en,ar}, iso2, emoji, color, flagImage, aliases, eliminated }`.
- **Flags are streamer-uploaded images** stored in `public/flags/`, saved at a consistent
  **3:2** aspect via the upload helper (drag/drop → crop → base64 POST → server write).
- Each team's territory colour derives from its flag (auto dominant-colour pick, manually
  overridable in the debug panel).

### Joining
A viewer joins by commenting **any** of:
1. team **number** (1…N, shown on the flag card)
2. **ISO2** code (`SA`, `BR`)
3. **English** name (`Saudi Arabia`)
4. **Arabic** name (`السعودية`)
5. **flag emoji** (`🇸🇦`)

Matching is tolerant: case-insensitive, diacritics/tatweel stripped, alef/maqsura folded,
leading `@` ignored, fuzzy prefix/Levenshtein fallback. Joins are reflected in the **live
leaderboard** (a nation's active-ball count and territory). Eliminated nations stop accepting joins
until the next round.

---

## 3. Viewer representation

- One **ball per viewer**, showing their profile photo (circular), name and team colour.
- **Global cap ~24 active** (debug slider). Overflow joins a per-team **reinforcement queue**;
  a queued viewer spawns when an active ball is removed (elimination / cap change).
- A ball **bounces around inside its own nation** and never fights directly — it only spreads
  colour.
- **AI fill** (optional) tops up thin nations so a quiet room stays alive.
- **Mock mode** simulates viewers for offline testing.

### Join cinematic
When a viewer joins, the camera **pans/zooms** from the arena edge to that nation's base over
~1.2 s and shows a card with their photo, name and flag. Multiple joins play sequentially with
a skip. A **blur percentage slider** (0–100, debug panel) blurs the backdrop during the intro.

---

## 4. Movement & territory

- The world is a neutral grid; each nation starts with a compact **base block** (default 4×4).
- A ball is a **puck that never leaves its nation**. It moves in a straight line and, whenever it
  reaches a tile that is not its own (neutral, enemy or wall), it **claims on contact and ricochets
  back** — the nation's border is literally the wall it bounces off. This keeps every territory
  self-contained and its edges crisp.
- A single contact captures the tile — no meter, no second hit. The moment a ball touches neutral
  or enemy land it flips to the nation, the "box" grows, and balls can then enter it. **Faster
  balls hit the border more often and more balls cover more border, so speed and viewer count
  decide how fast a nation expands.**
- A freshly captured tile is **hardened for a short hold** (`TILE_HOLD_TIME`, ~2.5 s) during which
  no other colour can take it back, so a contested border cannot flicker. Once the hold expires the
  tile is normal again and can be re-eaten.
- Balls never pass through foreign land (and never through each other). Each bounce adds a small
  random angle so balls don't settle into repetitive orbits.
- Nation outlines are drawn as one **rounded union shape** so borders read as clean curves rather
  than a grid of per-tile seams.
- `autoFillEnclosures` instantly claims any pocket fully surrounded by a nation's colour.
- If an enemy converts the tile a ball is standing on, the ball is **snapped to the nearest owned
  tile** so nothing is stranded in foreign land.
- A nation whose tile count reaches **0 is eliminated**: its balls vanish and it stops spawning.

### Bases
Each base is drawn with its flag/emoji and name banner. Bases are **conquerable** — an aggressive
neighbour can eat a base and wipe the nation out (a last stand, not a safe haven).

---

## 5. Interaction & power-ups

Every team accumulates a live **score** from interaction (displayed in the debug panel):

| Source | Default effect |
| --- | --- |
| **Gift** | `coins × GIFT_PER_COIN` |
| Like | small trickle per tap |
| Comment | points per unique commenter |
| Follow | one-time bonus |
| Share | one-time bonus |
| Territory | tiles held (shown as % on the scoreboard) |

**Anti-abuse:** per-user rate limits, follow/share cooldowns, unique-commenter set, like-delta
reconstruction, gift `msgId` dedupe, gift-streak combo rule.

### Gifts → power-ups
A **mappings UI** maps each gift (by id, name, or min coins) to a power-up with tunable params:
- **Overcharge** — a ball moves and converts noticeably faster for N seconds.
- **Speed Boost** — alias of overcharge for quick gift rules.
- **Color Bomb / Area Convert** — instantly paints a radius around the gifter's ball.
- **Spawn Ally** — adds an AI ball to the nation.
- **Instant Claim** — temporary overcharge, used for "instant" style gifts.

Only these effects exist now that HP/shields are gone; the mappings UI, the Tikora manifest and
`config/mappings.json` all reflect the same list.

---

## 6. Round lifecycle

```
IDLE → COUNTDOWN → PLAYING (3:00) → ROUND_END → INTERMISSION (~20s) → next
```

- **Auto-loop** on by default; the control bar always allows **manual start/end/next**.
- At round end the **winner is the nation holding the most tiles** (tie-break: most active
  balls). The result is celebrated with VFX/audio, saved to the winners store, and the arena resets
  to neutral + fresh bases.
- A nation that reaches **65%** of the arena triggers an immediate **domination** win.

---

## 7. HUD & presentation

- Left sidebar: one minimal **live leaderboard** — rank, flag, name, territory %, leader crown;
  eliminated nations are struck through.
- Standalone `leaderboard.html` overlay: the same minimal board plus round state and timer, for OBS.
- On-canvas: nation **base banners**; balls show their name; **rounded union borders** separate
  territories.
- Top bar: pause, speed, round timer, map select, mute, restart; the debug panel opens from the
  floating gear button.
- Debug panel: a floating gear opens a tabbed workspace (Connection · Players · Content · Match ·
  System). The Tikora tab is **read-only** — the hub owns activating/deactivating effects.
- **i18n:** English default, full **Arabic + RTL** for all UI; Arabic join aliases always work.

---

## 8. Configuration defaults

| Parameter | Value |
| --- | --- |
| Canvas | 1200×800 |
| Grid | 24×16 tiles (50 px) |
| Nations | 2–12 (default 8) |
| Home base | 4×4 tiles, spread across the arena |
| Ball radius / speed | 15 px / 1.9 px·frame |
| Capture | one touch per tile (neutral or enemy) |
| Tile hold | ~2.5 s before a captured tile can be retaken |
| Bounce jitter | ±0.3 rad per bounce |
| Borders | rounded union outline, ~4 px nation colour (darkened) |
| Active ball cap | 24 |
| Round / intermission | 180 s / 20 s |
| Win | Most territory (or 65% domination) |
