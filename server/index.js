import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { existsSync } from 'fs'
import { BRIDGE_PORT, CORS_ORIGINS, PUBLIC_DIR, DIST_DIR } from './constants.js'
import { ConnectionManager } from './connectionManager.js'
import { TunnelManager } from './tunnel.js'
import { getConfig } from './stores/configStore.js'
import { registerHttpRoutes } from './httpRoutes.js'

const app = express()
const server = createServer(app)
const io = new Server(server, { cors: { origin: CORS_ORIGINS, methods: ['GET', 'POST', 'PUT'] } })

function applyCors(req, res, next) {
  const origin = req.headers.origin
  if (origin && (CORS_ORIGINS.includes('*') || CORS_ORIGINS.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
}

app.use(applyCors)
app.use(express.json({ limit: '5mb' }))
if (existsSync(PUBLIC_DIR)) app.use(express.static(PUBLIC_DIR))
if (existsSync(DIST_DIR)) app.use(express.static(DIST_DIR))

const manager = new ConnectionManager()
const config = getConfig()
const tunnel = new TunnelManager({
  enabled: process.env.TWF_TUNNEL !== '0',
  target: config.tunnelTarget,
})
let lastOverlay = null

manager.on('status', (status) => io.emit('tiktok:status', status))
manager.on('event', (event) => io.emit('tiktok-event', event))
tunnel.on('status', (status) => io.emit('tunnel:status', status))

registerHttpRoutes(app, { manager, tunnel, getClientCount: () => io.engine.clientsCount })

io.on('connection', (socket) => {
  socket.emit('tiktok:status', manager.snapshot())
  socket.emit('tunnel:status', tunnel.snapshot())
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
  if (tunnel.enabled && getConfig().tunnelEnabled) tunnel.start()
})
