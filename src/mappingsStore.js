import defaultConfig from '../config/mappings.json'
import { createMapping } from './mappings.js'

const STORAGE_KEY = 'twf_mappings'
const listeners = new Set()

let baseUrl = ''

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed.mappings) ? parsed : null
  } catch {
    return null
  }
}

function saveLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    void 0
  }
}

let state = loadLocal() || clone(defaultConfig)

function notify() {
  for (const fn of listeners) fn(state)
}

function commit(next, shouldNotify = true) {
  state = next
  saveLocal()
  if (shouldNotify) notify()
}

export function getConfig() {
  return state
}

export function getMappings() {
  return state.mappings
}

export function setBaseUrl(url) {
  baseUrl = url
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export async function loadFromServer() {
  try {
    const response = await fetch(`${baseUrl}/api/mappings`)
    if (!response.ok) return
    const data = await response.json()
    if (Array.isArray(data.mappings)) commit(data)
  } catch {
    void 0
  }
}

export async function saveToServer() {
  try {
    const response = await fetch(`${baseUrl}/api/mappings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    })
    if (response.ok) commit(await response.json())
  } catch {
    void 0
  }
}

export function addMapping() {
  const mapping = createMapping()
  commit({ ...state, mappings: [...state.mappings, mapping] })
  return mapping
}

export function updateMapping(id, patch) {
  commit(
    {
      ...state,
      mappings: state.mappings.map((mapping) => {
        if (mapping.id !== id) return mapping
        const resolved = typeof patch === 'function' ? patch(mapping) : patch
        return { ...mapping, ...resolved, match: { ...mapping.match, ...(resolved.match || {}) } }
      })
    },
    false
  )
}

export function removeMapping(id) {
  commit({ ...state, mappings: state.mappings.filter((mapping) => mapping.id !== id) })
}
