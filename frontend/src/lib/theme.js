// Simple theme management utility: per-user theme persistence and DOM application

const THEME_LIGHT = 'light'
const THEME_DARK = 'dark'

function getCurrentUserId() {
  try {
    const raw = localStorage.getItem('currentUser')
    if (!raw) return 'guest'
    const user = JSON.parse(raw)
    return user?.id || user?.email || user?.username || 'guest'
  } catch {
    return 'guest'
  }
}

function getThemeKey() {
  const uid = getCurrentUserId()
  return `theme:${uid}`
}

export function getSavedTheme() {
  try {
    const key = getThemeKey()
    const saved = localStorage.getItem(key)
    if (saved === THEME_LIGHT || saved === THEME_DARK) return saved
    // Fallback to legacy signinTheme key if present
    const legacy = localStorage.getItem('signinTheme')
    if (legacy === THEME_LIGHT || legacy === THEME_DARK) return legacy
  } catch {}
  // Default: light
  return THEME_LIGHT
}

export function saveTheme(theme) {
  try {
    const val = theme === THEME_DARK ? THEME_DARK : THEME_LIGHT
    localStorage.setItem(getThemeKey(), val)
  } catch {}
}

export function applyTheme(theme) {
  const val = theme === THEME_DARK ? THEME_DARK : THEME_LIGHT
  const root = document.documentElement
  if (!root) return
  if (val === THEME_DARK) root.classList.add('dark')
  else root.classList.remove('dark')
}

export function toggleTheme() {
  const current = getSavedTheme()
  const next = current === THEME_DARK ? THEME_LIGHT : THEME_DARK
  saveTheme(next)
  applyTheme(next)
  return next
}

export const Theme = { THEME_LIGHT, THEME_DARK, getSavedTheme, saveTheme, applyTheme, toggleTheme }
