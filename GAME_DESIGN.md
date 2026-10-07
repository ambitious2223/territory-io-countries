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
A **mappings UI** maps each gift (by id, name, or min coins) to a power-up with tunable params —
and the same list is declared in `tikora.manifest.json`, so the **hub** maps gifts *and free
triggers* (chat, like, follow, share, member) onto them:
- **Overcharge / Speed Boost** — one soldier moves faster for N seconds.
- **Team Speed** — every soldier of the nation gets that burst.
- **Freeze** — enemy soldiers stop for N seconds (icy ring; movement only — no damage).
- **Shield** — the nation's tiles can't be captured for N seconds (bombs/enclosures respect it);
  shown as a white dashed border.
- **Color Bomb / Area Convert** — instantly paint a radius around the gifter's soldier.
- **Mega Bomb** — the same, up to 8 tiles.
- **Claim Storm** — instantly claim up to N frontier tiles of your border.
- **Spawn Ally / Summon Allies** — one or up to eight new soldiers carrying the activator's
  photo + nickname.
- **Instant Claim** — temporary overcharge, for "instant" style gifts.

All params are clamped to safe config limits. These are the **12 effects** in the manifest; the
mappings UI dropdown is generated from it, and a test keeps the two in sync.

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
- On-canvas: **3D circular strongholds** show the uploaded team photo (emoji fallback) with a
  **pill name banner** (team-colour border); capitals are a fixed size relative to a streamer
  **capital-size slider** (0.5x–2.5x) and draw **above the balls** but below event text.
  **Rounded union borders** separate territories.
- Balls show the viewer's **TikTok profile photo** as the fighter, framed by a **team-colour ring +
  glow**, a light team **tint**, and a **team-colour nameplate** above — so team ownership is clear.
- Top bar: pause, speed, round timer, map select, mute, restart; the debug panel opens from the
  floating gear button.
- Debug panel: a floating gear opens a tabbed workspace — **Connection · Teams · Overlay ·
  Advanced**. Connection holds a **Soldiers speed slider** (live, persisted) beside the bridge
  controls. Teams holds the capital-size slider, the editor + photo upload (all team edits
  **auto-save** after ~1.5 s); Advanced (collapsed) holds the dev tools. The Tikora section is
  **read-only** — the hub owns activating/deactivating effects.
- **Auto-zoom:** on every new viewer join the camera **follows their moving soldier** during focus
  and hold (photo + nickname card), then returns. Toggle it with **Auto-zoom** in the Cinematic
  section (persisted); with it off, joins still announce (sound) but the camera stays put.
- **Pick-a-side prompt:** a gift/effect from someone **without a nation** raises an animated pop-up
  with their **profile photo + nickname** asking them to comment a country; the effect is **held**
  and fires automatically the moment they join (dropped after `JOIN_PROMPT_TIMEOUT`, 20 s).
  Effect soldiers always carry the activator's **photo and nickname**.
- **i18n:** English default, complete **Arabic** for every user-facing string (round/map/mode/mock
  labels, effect + floating texts, scoring weights, team names on canvas, leaderboard, cinematic
  and overlay). The language switch is **text-only — positions never mirror** (fixed decision
  D-036). Arabic join aliases always work.

---

## 8. Configuration defaults

| Parameter | Value |
| --- | --- |
| Canvas | 1200×800 |
| Grid | 48×32 tiles (25 px) — each old square = 4 small squares (1536 total) |
| Nations | 2–12 (default 8) |
| Home base | 8×8 tiles (same physical size as before), spread across the arena |
| Soldier radius / speed | 11 px / **1.1 px·frame slow default**; live slider 0.5–3.0 (persisted) |
| Overcharge | ×2.2 speed for 6 s — the reward for gifts/interaction |
| Capture | one touch per tile (neutral or enemy) |
| Tile hold | ~2.5 s before a captured tile can be retaken |
| Bounce jitter | ±0.3 rad per bounce |
| Borders | rounded union outline, ~3 px nation colour (darkened) |
| Active ball cap | 24 |
| Round / intermission | 180 s / 20 s |
| Win | Most territory (or 65% domination) |
