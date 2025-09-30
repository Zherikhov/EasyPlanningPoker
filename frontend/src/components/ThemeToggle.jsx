import React, { useEffect, useState } from 'react'
import { getSavedTheme, saveTheme, applyTheme } from '../lib/theme.js'

export default function ThemeToggle() {
  const [theme, setTheme] = useState('light')
  useEffect(() => {
    try { const t = getSavedTheme(); setTheme(t); applyTheme(t) } catch {}
  }, [])

  const onToggle = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    try { saveTheme(next); applyTheme(next) } catch {}
  }

  return (
    <button className="toggle" aria-label="Toggle theme" title="Toggle theme" onClick={onToggle}>
      <span className="moon">☾</span>
      <span className="sun">☀</span>
    </button>
  )
}
