import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { existsSync } from 'fs'
import { BRIDGE_PORT, CORS_ORIGINS, PUBLIC_DIR, DIST_DIR } from './constants.js'
import { ConnectionManager } from './connectionManager.js'
import { registerHttpRoutes } from './httpRoutes.js'

const app = express()
const server = createServer(app)
const io = new Server(server, { cors: { origin: CORS_ORIGINS, methods: ['GET', 'POST', 'PUT'] } })

app.use(express.json({ limit: '5mb' }))
if (existsSync(PUBLIC_DIR)) app.use(express.static(PUBLIC_DIR))
if (existsSync(DIST_DIR)) app.use(express.static(DIST_DIR))

const manager = new ConnectionManager()
let lastOverlay = null

manager.on('status', (status) => io.emit('tiktok:status', status))
manager.on('event', (event) => io.emit('tiktok-event', event))

registerHttpRoutes(app, { manager, getClientCount: () => io.engine.clientsCount })

io.on('connection', (socket) => {
  socket.emit('tiktok:status', manager.snapshot())
  if (lastOverlay) socket.emit('overlay:leaderboard', lastOverlay)
  socket.on('tiktok:connect', (payload) => manager.reconnect(payload || {}))
  socket.on('tiktok:disconnect', () => manager.stop())
  socket.on('overlay:state', (payload) => {
    lastOverlay = payload
    socket.broadcast.emit('overlay:leaderboard', payload)
  })
})

server.listen(BRIDGE_PORT, () => {
  console.log(`[bridge] listening on http://localhost:${BRIDGE_PORT}`)
  manager.start()
})
