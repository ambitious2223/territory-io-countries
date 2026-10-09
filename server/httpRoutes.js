import { getTeamsConfig, saveTeamsConfig, updateTeam } from './stores/teamsStore.js'
import { getWinners, addWinner, clearWinners } from './stores/winnersStore.js'
import { getConfig } from './stores/configStore.js'
import { readJson } from './stores/store.js'
import { TIKORA_MANIFEST_PATH, TIKORA_DEFAULTS } from './constants.js'
import { resolveTikoraIdentity } from './tikoraIdentity.js'
import { saveFlagImage } from './uploads.js'
import { buildMockEvent } from './mock.js'

function tikoraConfig() {
  const config = getConfig()
  const manifest = readJson(TIKORA_MANIFEST_PATH, { slug: TIKORA_DEFAULTS.slug })
  return resolveTikoraIdentity({ env: process.env, config, manifest })
}

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

  app.get('/api/tikora/config', (_req, res) => {
    res.json(tikoraConfig())
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
