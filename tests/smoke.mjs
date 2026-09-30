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

  socket.close()
  await stopChild()
  console.log('SMOKE PASS')
}

main().catch(async (error) => {
  console.error('SMOKE FAIL:', error.message)
  await stopChild()
  process.exitCode = 1
})
