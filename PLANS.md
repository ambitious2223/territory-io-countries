# PLANS.md - Project Plan

## Phase 1: Foundation (Day 1)
- [x] Project scaffolding (package.json, folders, config files)
- [ ] TikTok Live connector integration
- [ ] Basic Express + Socket.io server
- [ ] Verify TikTok events flow to browser

## Phase 2: Game Engine (Day 2-3)
- [ ] Territory/Node class with position, troop count, owner
- [ ] Adjacency graph for neighbor lookups
- [ ] Troop production timer (passive income per territory)
- [ ] Combat resolution (attacker vs defender)
- [ ] Territory capture logic
- [ ] Win condition detection

## Phase 3: AI Targeting (Day 3)
- [ ] Nearest enemy targeting (for likes/shares/follows)
- [ ] Strongest enemy targeting (for gifts)
- [ ] Troop pool accumulation and batch deployment
- [ ] Strategic priority system

## Phase 4: Renderer (Day 3-4)
- [ ] Canvas setup with responsive sizing
- [ ] Draw territory nodes (circles with team colors)
- [ ] Draw troop count labels
- [ ] Animate troop movement between nodes
- [ ] Draw adjacency lines (debug mode)
- [ ] Win screen overlay

## Phase 5: Admin Panel (Day 4)
- [ ] Start/Stop game button
- [ ] Team configuration (count, colors, names, icons)
- [ ] Map configuration (node positions, spacing)
- [ ] Debug toggles (show counts, adjacency, troop pools)
- [ ] Manual troop injection controls
- [ ] Game speed multiplier

## Phase 6: Win Screen + Stats (Day 5)
- [ ] Detect win condition
- [ ] Calculate per-faction stats (troops deployed, territories held)
- [ ] Track top contributors (name, profile pic, contribution count)
- [ ] Animated win screen with scrolling names
- [ ] Auto-reset option

## Phase 7: Polish + Testing (Day 6-7)
- [ ] End-to-end test with mock TikTok events
- [ ] Performance optimization (60fps target)
- [ ] Error handling (TikTok disconnection, etc.)
- [ ] README with setup instructions

## Stretch Goals
- [ ] Sound effects
- [ ] Multiple map presets
- [ ] Leaderboard persistence across sessions
- [ ] Custom team icons upload
