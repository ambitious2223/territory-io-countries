# GAME_DESIGN.md — Territory With Flags

## 1. Concept

Colour-coded nations fight for a shared arena. Viewers pick a country/team and spawn as an
**avatar marble** with an **orbital sword**. Marbles roam, claim grid tiles for their nation,
and eliminate rivals. Interaction (likes, comments, follows, shares, gifts) feeds each team's
power and score. At the end of the timed round the nation with the highest **combined** score
(territory + interaction) wins.

---

## 2. Teams & flags

- **2–12 teams**, streamer-configured. Ships with a default 8-slot roster.
- Each team: `{ id, index, name {en,ar}, iso2, emoji, color, flagImage, aliases }`.
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
leading `@` ignored, fuzzy prefix/Levenshtein fallback. Unmatched comments get a rate-limited
hint. First join is free; **switching teams costs a gift** and transfers a share of score;
otherwise a viewer is locked to their team for the round.

---

## 3. Viewer representation

- One **avatar marble per viewer**, showing their profile photo (circular), name and team colour.
- **Global cap ~24 active** (debug slider). Overflow joins a per-team **reinforcement queue**;
  a queued viewer spawns when an active marble dies.
- **AI fill** (optional) tops up thin teams.
- **Mock mode** simulates viewers for offline testing.

### Join cinematic
When a viewer joins, the camera **pans/zooms** from the arena edge to the spawn point over
~1.2 s and shows a card with their photo, name and flag. Multiple joins play sequentially with
a skip. A **blur percentage slider** (0–100, debug panel) blurs the backdrop during the intro.

---

## 4. Movement, combat & territory

- Marbles path to the nearest frontier tile, stand on it while a **claim ring** fills, and are
  **interrupted** if a rival contests them.
- **Orbital swords** deal damage on blade→marble contact; blade→blade contact deflects.
- Eliminated marbles respawn from the queue; **territory stays with the team**.
- Eliminating a rival triggers a **colour-conversion wave** over the victim's tiles.
- `autoFillEnclosures` claims areas fully surrounded by a team's colour.

---

## 5. Scoring (gift-dominant)

Every team accumulates a live score. Defaults (all tunable in the debug panel):

| Source | Default effect |
| --- | --- |
| **Gift** | `coins × GIFT_PER_COIN` — **dominant** |
| Like | small trickle per tap |
| Comment | points per unique commenter |
| Follow | one-time bonus |
| Share | one-time bonus |
| Territory | tiles held, evaluated at round end |

**Anti-abuse:** per-user rate limits, follow/share cooldowns, unique-commenter set, like-delta
reconstruction, gift `msgId` dedupe, gift-streak combo rule.

### Gifts → power-ups
A **mappings UI** maps each gift (by id, name, or min coins) to a power-up/action with tunable
params. Effects extend the base roster: overcharge, shield, colour-bomb, area-convert, speed
boost, freeze, spawn-reinforcement, giant/shrink, instant-claim.

---

## 6. Round lifecycle

```
IDLE → COUNTDOWN → PLAYING (3:00) → ROUND_END → INTERMISSION (~20s) → next
```

- **Auto-loop** on by default; the control bar always allows **manual start/end/next**.
- At round end the winning team is computed from **combined** score, celebrated with VFX/audio,
  saved to the winners store, and zones/territories reset for the next round.

---

## 7. HUD & presentation

- Left sidebar: live team scoreboard (flag, territory %, score, join count).
- Top bar: pause, speed, round timer, map select, debug, mute, restart.
- Floating **debug panel** tabs: Connect · Teams · Content · Game · Winners · Diagnostics.
- **i18n:** English default, full **Arabic + RTL** for all UI; Arabic join aliases always work.

---

## 8. Configuration defaults

| Parameter | Value |
| --- | --- |
| Canvas | 1200×800 |
| Grid | 24×16 tiles (50 px) |
| Teams | 2–12 (default 8) |
| Marble radius / speed | 18 px / 1.5 px·frame |
| Marble health | 100 |
| Sword length / orbit / spin | 30 / 40 / 0.05 rad·frame |
| Sword damage | 25 |
| Active marble cap | 24 |
| Round / intermission | 180 s / 20 s |
| Gift score per coin | 1 |
