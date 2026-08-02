const STORAGE_KEY_API = 'shaggoth_api_url'
const STORAGE_KEY_TOKEN = 'shaggoth_api_token'
const STORAGE_KEY_ELEVENLABS_KEY = 'shaggoth_elevenlabs_key'
const STORAGE_KEY_ELEVENLABS_VOICE = 'shaggoth_elevenlabs_voice'

const defaults = {
  apiUrl: 'https://ai.relayapp.pro',
  apiKey: '',
  elevenlabsKey: 'sk_8f3a5da20e4eadd1212fef7aa09bd5dda70410914432865d',
  elevenlabsVoice: 'EXAVITQu4vr4xnSDxMaL', // Default to Bella
}

let _apiUrl = defaults.apiUrl
let _apiKey = defaults.apiKey
let _elevenlabsKey = defaults.elevenlabsKey
let _elevenlabsVoice = defaults.elevenlabsVoice

export async function initStorage() {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default
    let url = await AsyncStorage.getItem(STORAGE_KEY_API)
    const key = await AsyncStorage.getItem(STORAGE_KEY_TOKEN)
    const eKey = await AsyncStorage.getItem(STORAGE_KEY_ELEVENLABS_KEY)
    const eVoice = await AsyncStorage.getItem(STORAGE_KEY_ELEVENLABS_VOICE)
    
    // Migrate old hardcoded HTTP url to HTTPS
    if (url === 'http://100.103.3.35:8420') {
      url = 'https://ai.relayapp.pro'
      await AsyncStorage.setItem(STORAGE_KEY_API, url)
    }
    
    if (url) _apiUrl = url
    if (key) _apiKey = key
    if (eKey) _elevenlabsKey = eKey
    if (eVoice) _elevenlabsVoice = eVoice
  } catch {}
}

export async function saveApiUrl(url) {
  _apiUrl = url.replace(/\/+$/, '')
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default
    await AsyncStorage.setItem(STORAGE_KEY_API, _apiUrl)
  } catch {}
}

export async function saveApiKey(key) {
  _apiKey = key
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default
    await AsyncStorage.setItem(STORAGE_KEY_TOKEN, key)
  } catch {}
}

export async function saveElevenlabsKey(key) {
  _elevenlabsKey = key
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default
    await AsyncStorage.setItem(STORAGE_KEY_ELEVENLABS_KEY, key)
  } catch {}
}

export async function saveElevenlabsVoice(voice) {
  _elevenlabsVoice = voice
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default
    await AsyncStorage.setItem(STORAGE_KEY_ELEVENLABS_VOICE, voice)
  } catch {}
}

export function getApiUrl() { return _apiUrl }
export function getApiKey() { return _apiKey }
export function getElevenlabsKey() { return _elevenlabsKey }
export function getElevenlabsVoice() { return _elevenlabsVoice }

function headers() {
  const h = { 'Content-Type': 'application/json' }
  if (_apiKey) h['Authorization'] = 'Bearer ' + _apiKey
  return h
}

async function fetchJson(path, options = {}) {
  const url = `${_apiUrl}${path}`
  const res = await fetch(url, { ...options, headers: { ...headers(), ...options.headers } })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function health() {
  return fetchJson('/health')
}

export async function chat(message, sessionId, options = {}) {
  return fetchJson('/chat', {
    method: 'POST',
    body: JSON.stringify({ message, session_id: sessionId, ...options }),
  })
}

export async function chatStream(message, sessionId, onToken, onDone, onError, options = {}) {
  // React Native fetch doesn't support ReadableStream, so use
  // the standard JSON endpoint and deliver the full reply at once.
  try {
    const data = await chat(message, sessionId, options)
    if (data.reply) {
      const words = data.reply.split(/(?<=\s)/)
      for (let i = 0; i < words.length; i++) {
        onToken(words[i])
        await new Promise(r => setTimeout(r, 20))
      }
      onDone(data)
    }
  } catch (err) {
    onError(err.message)
  }
}

export async function getHistory(sessionId) {
  return fetchJson(`/history?session_id=${encodeURIComponent(sessionId)}`)
}

export async function getFacts() {
  return fetchJson('/facts')
}

export async function getPersonality() {
  return fetchJson('/personality')
}

export async function getGuardrails() {
  return fetchJson('/guardrails')
}

export async function getLearnStatus() {
  return fetchJson('/learn/status')
}

export async function startLearning(urls, depth, maxPages, steps) {
  return fetchJson('/learn/start', {
    method: 'POST',
    body: JSON.stringify({ urls, crawl_depth: depth, max_pages: maxPages, training_steps: steps }),
  })
}

export async function getKnowledge() {
  return fetchJson('/knowledge')
}

export async function searchKnowledge(query) {
  return fetchJson(`/knowledge/query?q=${encodeURIComponent(query)}`)
}

export async function registerPushToken(token, platform) {
  return fetchJson('/push/register', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
  })
}

