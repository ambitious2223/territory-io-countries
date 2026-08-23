# GUARDRAILS.md - Code Quality & Testing Rules

## Hard Limits
1. **Max 400 lines per file** - If approaching, split into smaller modules
2. **No comments** in code unless user explicitly requests them
3. **No console.log spam** - Use structured logging only
4. **No hardcoded values** - All config in config/ JSON files
5. **No global variables** - Use modules/classes

## Testing Requirements
- **Test after every feature** - Run `npm start` and verify in browser
- **Mock TikTok events** - Use the /api/mock-event endpoint to test
- **Check console for errors** - Zero errors before moving to next feature
- **Verify 60fps** - Open Chrome DevTools Performance tab during gameplay

## Code Quality Checklist
Before marking any task complete:
- [ ] File is under 400 lines
- [ ] No unused imports
- [ ] No magic numbers (use constants)
- [ ] Functions do ONE thing
- [ ] Error handling exists for async operations
- [ ] Game loop runs at stable 60fps

## File Organization Rules
- **engine.js**: ONLY game logic (loops, combat, production)
- **renderer.js**: ONLY drawing (canvas API calls)
- **map.js**: ONLY territory data and graph operations
- **ai.js**: ONLY targeting decisions
- **factions.js**: ONLY team management and troop pools
- **server.js**: ONLY server setup and TikTok routing

## Anti-Patterns to Avoid
- DON'T put rendering code in engine.js
- DON'T put game logic in renderer.js
- DON'T mix TikTok connector code with game logic
- DON'T create god objects (one class doing everything)
- DON'T skip the adjacency graph - always use it for neighbor lookups

## Performance Rules
- Use requestAnimationFrame for game loop (not setInterval)
- Pool troop projectiles (reuse objects, don't create/destroy)
- Only redraw changed territories (dirty flag system)
- Batch Socket.io emissions (don't emit every single event)

## Git Hygiene
- One feature per commit
- Never commit node_modules
- Update CHANGELOG.md after each milestone
