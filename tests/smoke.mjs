import { spawn } from 'node:child_process'
import { io } from 'socket.io-client'

const PORT = 3999
const URL = `http://localhost:${PORT}`

const child = spawn(process.execPath, ['server/index.js'], {
  env: { ...process.env, PORT: String(PORT), BRIDGE_MODE: 'mock', CORS_ORIGINS: '*' },
  stdio: ['ignore', 'inherit', 'inherit']
})

async function waitForHealth(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const response = await fetch(`${URL}/health`)
      if (response.ok) return response.json()
    } catch {
      void 0
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('server did not become healthy')
}

function stopChild() {
  return new Promise((resolve) => {
    if (child.exitCode !== null) return resolve()
    child.once('exit', resolve)
    child.kill()
    setTimeout(resolve, 1500)
  })
}

async function main() {
  const health = await waitForHealth()
  if (!health.ok) throw new Error('health not ok')
  console.log(`health ok — source=${health.source} state=${health.tiktokState}`)

  const teamsResponse = await fetch(`${URL}/api/teams`)
  const teamsData = await teamsResponse.json()
  if (!Array.isArray(teamsData.teams) || teamsData.teams.length < 2) {
    throw new Error('teams endpoint returned invalid data')
  }
  console.log(`teams ok — ${teamsData.teams.length} teams`)

  const winnersResponse = await fetch(`${URL}/api/winners`)
  const winnersData = await winnersResponse.json()
  if (!Array.isArray(winnersData.teams)) {
    throw new Error('winners endpoint returned invalid data')
  }
  console.log('winners ok')

  const mappingsResponse = await fetch(`${URL}/api/mappings`)
  const mappingsData = await mappingsResponse.json()
  if (!Array.isArray(mappingsData.mappings)) {
    throw new Error('mappings endpoint returned invalid data')
  }
  console.log(`mappings ok — ${mappingsData.mappings.length} rules`)

  const socket = io(URL, { transports: ['websocket'] })
  await new Promise((resolve, reject) => {
    socket.on('connect', resolve)
    socket.on('connect_error', reject)
    setTimeout(() => reject(new Error('socket timeout')), 5000)
  })
  console.log('socket connected')

  const received = new Promise((resolve, reject) => {
    socket.on('tiktok-event', resolve)
    setTimeout(() => reject(new Error('no event received')), 5000)
  })

  const response = await fetch(`${URL}/api/mock-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'chat', username: 'smoke', message: 'SA' })
  })
  if (!response.ok) throw new Error('mock-event request failed')

  const event = await received
  if (event.type !== 'chat' || event.message !== 'SA') throw new Error('unexpected event payload')
  console.log(`event received — ${event.username}: ${event.message}`)

  const overlaySocket = io(URL, { transports: ['websocket'] })
  await new Promise((resolve, reject) => {
    overlaySocket.on('connect', resolve)
    overlaySocket.on('connect_error', reject)
    setTimeout(() => reject(new Error('overlay socket timeout')), 5000)
  })
  const overlayReceived = new Promise((resolve, reject) => {
    overlaySocket.on('overlay:leaderboard', resolve)
    setTimeout(() => reject(new Error('no overlay payload relayed')), 5000)
  })
  socket.emit('overlay:state', { probe: 'ok' })
  const relayed = await overlayReceived
  if (relayed.probe !== 'ok') throw new Error('overlay relay payload mismatch')
  console.log('overlay relay ok')

  const lateSocket = io(URL, { transports: ['websocket'] })
  const cached = await new Promise((resolve, reject) => {
    lateSocket.on('overlay:leaderboard', resolve)
    lateSocket.on('connect_error', reject)
    setTimeout(() => reject(new Error('no cached overlay snapshot')), 5000)
  })
  if (cached.probe !== 'ok') throw new Error('overlay cache mismatch')
  console.log('overlay cache replay ok')

  socket.close()
  overlaySocket.close()
  lateSocket.close()
  await stopChild()
  console.log('SMOKE PASS')
}

main().catch(async (error) => {
  console.error('SMOKE FAIL:', error.message)
  await stopChild()
  process.exitCode = 1
})
