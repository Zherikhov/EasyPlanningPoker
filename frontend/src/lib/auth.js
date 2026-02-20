// Lightweight auth helper: access token storage, auto-refresh via refresh cookie, and fetch retry on 401

let refreshTimerId = null
let isRefreshing = false

export function getToken() {
  try { return window.localStorage.getItem('pp-token') } catch (_) { return null }
}

export function setToken(token) {
  try {
    if (token) window.localStorage.setItem('pp-token', token)
    else window.localStorage.removeItem('pp-token')
  } catch (_) {}
}

function decodeJwtExp(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (payload && typeof payload.exp === 'number') return payload.exp
  } catch (_) {}
  return null
}

function scheduleAutoRefresh() {
  if (refreshTimerId) {
    clearTimeout(refreshTimerId)
    refreshTimerId = null
  }
  const token = getToken()
  const exp = decodeJwtExp(token)
  if (!exp) return // nothing to schedule
  const now = Date.now()
  const target = exp * 1000 - 60_000 // try 60s before expiration
  const delay = Math.max(0, target - now)
  refreshTimerId = setTimeout(() => {
    // fire and forget; next successful refresh will reschedule
    refresh().catch(() => {/* noop; fallback on 401 handler */})
  }, delay)
}

export async function refresh() {
  if (isRefreshing) return Promise.resolve(false)
  isRefreshing = true
  try {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      // Important: send refresh HttpOnly cookie
      credentials: 'include'
    })
    if (!res.ok) throw new Error('refresh failed')
    const data = await res.json().catch(() => ({}))
    const newToken = data && data.token
    if (newToken) {
      setToken(newToken)
      scheduleAutoRefresh()
      return true
    }
    return false
  } catch (_) {
    return false
  } finally {
    isRefreshing = false
  }
}

export function setTokenAndSchedule(token) {
  setToken(token)
  scheduleAutoRefresh()
}

function attachI18nHeaders(init) {
  const token = getToken()
  const lang = window.localStorage.getItem('i18nextLng') || 'en'
  const newInit = { ...(init || {}) }
  const headers = new Headers(newInit.headers || {})
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (!headers.has('Accept-Language')) {
    headers.set('Accept-Language', lang)
  }
  newInit.headers = headers
  return newInit
}

function overwriteI18nHeaders(init) {
  const token = getToken()
  const lang = window.localStorage.getItem('i18nextLng') || 'en'
  const newInit = { ...(init || {}) }
  const headers = new Headers(newInit.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)
  headers.set('Accept-Language', lang)
  newInit.headers = headers
  return newInit
}

export function initAuth() {
  // schedule auto refresh for existing token
  scheduleAutoRefresh()

  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return
  if (window.__ppFetchWrapped) return

  const origFetch = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    // First try with current token and lang if caller didn't set them
    const firstInit = attachI18nHeaders(init)
    let res = await origFetch(input, firstInit)

    if (res.status !== 401) return res

    // On 401 try to refresh token once and retry
    const ok = await refresh()
    if (!ok) return res

    // Retry with new token, ensure we overwrite Authorization and Accept-Language
    const secondInit = overwriteI18nHeaders(init)
    res = await origFetch(input, secondInit)
    return res
  }
  window.__ppFetchWrapped = true
}
