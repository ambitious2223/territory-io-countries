import { getTeamsConfig, saveTeamsConfig, updateTeam } from './stores/teamsStore.js'
import { getWinners, addWinner, clearWinners } from './stores/winnersStore.js'
import { getMappingsConfig, saveMappingsConfig } from './stores/mappingsStore.js'
import { saveFlagImage } from './uploads.js'
import { buildMockEvent } from './mock.js'

export function registerHttpRoutes(app, { manager, getClientCount }) {
  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'territory-with-flags-bridge',
      ...manager.snapshot(),
      clients: getClientCount()
    })
  })

  app.post('/api/mock-event', (req, res) => {
    const event = buildMockEvent(req.body || {})
    manager.emitEvent(event)
    res.json({ success: true, event })
  })

  app.get('/api/teams', (_req, res) => {
    res.json(getTeamsConfig())
  })

  app.put('/api/teams', (req, res) => {
    const body = req.body || {}
    if (!Array.isArray(body.teams)) {
      res.status(400).json({ error: 'Invalid teams payload' })
      return
    }
    res.json(saveTeamsConfig(body))
  })

  app.get('/api/winners', (_req, res) => {
    res.json(getWinners())
  })

  app.post('/api/winners', (req, res) => {
    const { board, entry } = req.body || {}
    res.json(addWinner(board, entry))
  })

  app.delete('/api/winners', (req, res) => {
    res.json(clearWinners(req.query.board))
  })

  app.get('/api/mappings', (_req, res) => {
    res.json(getMappingsConfig())
  })

  app.put('/api/mappings', (req, res) => {
    const body = req.body || {}
    if (!Array.isArray(body.mappings)) {
      res.status(400).json({ error: 'Invalid mappings payload' })
      return
    }
    res.json(saveMappingsConfig(body))
  })

  app.post('/api/flags', (req, res) => {
    const { teamId, imageData } = req.body || {}
    try {
      const url = saveFlagImage(teamId, imageData)
      updateTeam(teamId, { flagImage: url })
      res.json({ success: true, url })
    } catch (error) {
      res.status(400).json({ error: error.message })
    }
  })
}
