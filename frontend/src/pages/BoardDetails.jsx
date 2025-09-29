import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiUrl } from '../lib/apiBase'
import { getSavedTheme, saveTheme, applyTheme } from '../lib/theme.js'

export default function BoardDetails() {
  const { id } = useParams()
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [theme, setTheme] = useState('light')
  const navigate = useNavigate()

  const logout = () => {
    try {
      // Persist current theme for auth pages before clearing user context
      const isDark = typeof document !== 'undefined' && document.documentElement?.classList?.contains('dark')
      localStorage.setItem('signinTheme', isDark ? 'dark' : 'light')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('expiresIn')
      localStorage.removeItem('currentUser')
    } catch {}
    navigate('/login')
  }

  useEffect(() => {
    try {
      const saved = getSavedTheme()
      setTheme(saved)
      applyTheme(saved)
    } catch {}

    const token = localStorage.getItem('accessToken')
    if (!token) {
      navigate('/login')
      return
    }

    const fetchBoard = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(apiUrl(`/api/boards/${id}`) , {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.status === 401) {
          logout()
          return
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.message || 'Failed to load board')
        }
        const data = await res.json()
        setBoard(data)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchBoard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const menuRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <header className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
        <button onClick={() => navigate('/boards')} className="text-sm text-blue-600 hover:underline">← Back to boards</button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const next = theme === 'light' ? 'dark' : 'light'
              setTheme(next)
              saveTheme(next)
              applyTheme(next)
            }}
            className="toggle"
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            <span className="moon">☾</span>
            <span className="sun">☀</span>
          </button>
          <div className="user-menu" ref={menuRef}>
            <button
              className="avatarBtn"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="User menu"
              onClick={() => setMenuOpen(v=>!v)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21a8 8 0 0 0-16 0" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
            <div className={`dropdown ${menuOpen ? 'open' : ''}`} role="menu">
              <button className="item" role="menuitem" onClick={() => { setMenuOpen(false); navigate('/boards') }}>Profile</button>
              <button className="item" role="menuitem" onClick={() => { setMenuOpen(false); logout() }}>Sign out</button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto">
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-700 bg-red-50 border border-red-200 rounded p-2 inline-block dark:bg-red-950/30 dark:text-red-300 dark:border-red-800">{error}</div>}
        {!loading && !error && board && (
          <div>
            <h1 className="text-2xl font-semibold mb-4">{board.name}</h1>
            <div className="space-y-2">
              <div><span className="text-gray-500 dark:text-gray-400">Description:</span> {board.description || '—'}</div>
              <div><span className="text-gray-500 dark:text-gray-400">Created:</span> {new Date(board.createdAt).toLocaleString()}</div>
              <div><span className="text-gray-500 dark:text-gray-400">ID:</span> {board.id}</div>
            </div>
            <div className="mt-4">
              <button onClick={() => navigate(`/boards/${board.id}/estimate`)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Go to estimation</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
