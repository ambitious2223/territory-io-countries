import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { existsSync } from 'fs'
import { BRIDGE_PORT, CORS_ORIGINS, PUBLIC_DIR, DIST_DIR } from './constants.js'
import { ConnectionManager } from './connectionManager.js'
import { buildMockEvent } from './mock.js'

const app = express()
const server = createServer(app)
const io = new Server(server, { cors: { origin: CORS_ORIGINS, methods: ['GET', 'POST'] } })

app.use(express.json({ limit: '5mb' }))
if (existsSync(PUBLIC_DIR)) app.use(express.static(PUBLIC_DIR))
if (existsSync(DIST_DIR)) app.use(express.static(DIST_DIR))

const manager = new ConnectionManager()

manager.on('status', (status) => io.emit('tiktok:status', status))
manager.on('event', (event) => io.emit('tiktok-event', event))

io.on('connection', (socket) => {
  socket.emit('tiktok:status', manager.snapshot())
  socket.on('tiktok:connect', (payload) => manager.reconnect(payload || {}))
  socket.on('tiktok:disconnect', () => manager.stop())
})

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'territory-with-flags-bridge',
    ...manager.snapshot(),
    clients: io.engine.clientsCount
  })
})

app.post('/api/mock-event', (req, res) => {
  const event = buildMockEvent(req.body || {})
  manager.emitEvent(event)
  res.json({ success: true, event })
})

server.listen(BRIDGE_PORT, () => {
  console.log(`[bridge] listening on http://localhost:${BRIDGE_PORT}`)
  manager.start()
})
