import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from '../lib/apiBase'
import { getSavedTheme, saveTheme, applyTheme } from '../lib/theme.js'
import '../styles/workspace.css'

export default function Boards() {
  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [creating, setCreating] = useState(false)
  const [theme, setTheme] = useState('light')
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

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

  const loadBoards = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(apiUrl('/api/boards'), { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) return logout()
      if (res.status === 204) {
        setBoards([])
        return
      }
      if (!res.ok) {
        let msg = 'Failed to load boards'
        try {
          const err = await res.json()
          if (err && err.message) msg = err.message
        } catch {}
        throw new Error(msg)
      }
      let data = []
      try { data = await res.json() } catch { data = [] }
      if (!Array.isArray(data)) data = []
      setBoards(data)
    } catch (e) {
      if (!e || !e.message) { setBoards([]) } else { setError(e.message) }
    } finally { setLoading(false) }
  }

  useEffect(() => {
    // apply saved theme
    try {
      const saved = getSavedTheme()
      setTheme(saved)
      applyTheme(saved)
    } catch {}

    if (!token) { navigate('/login'); return }
    loadBoards()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Board title is required'); return }
    setCreating(true)
    setError('')
    try {
      const res = await fetch(apiUrl('/api/boards'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      if (res.status === 401) return logout()
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Failed to create board')
      }
      const created = await res.json()
      setBoards((prev) => [created, ...prev])
      setIsModalOpen(false)
      setForm({ name: '', description: '' })
    } catch (e) {
      setError(e.message)
    } finally { setCreating(false) }
  }

  // client-side filtering similar to demo search
  const filtered = useMemo(() => {
    const q = (query || '').toLowerCase()
    if (!q) return boards
    return boards.filter(b =>
      (b.name || '').toLowerCase().includes(q) ||
      (b.description || '').toLowerCase().includes(q)
    )
  }, [boards, query])

  // helper to derive chips from description (comma separated) similar to demo tags
  const chips = (text) => (text || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 4)

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
    <div>
      <header className="topbar">
        <div className="brand" onClick={() => navigate('/boards')} style={{cursor:'pointer'}}>
          <div className="logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor"/>
              <path d="M8 12h8M12 8v8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span>Workspace</span>
        </div>
        <div className="search">
          <svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input id="search" type="search" placeholder="Search boards" value={query} onChange={(e)=>setQuery(e.target.value)} />
        </div>
        <div className="actions">
          <button className="create" id="createTop" onClick={()=>setIsModalOpen(true)}>Create board</button>
          <button className="toggle" id="themeToggle" aria-label="Toggle theme" onClick={() => {
            const next = theme === 'light' ? 'dark' : 'light'
            setTheme(next); saveTheme(next); applyTheme(next)
          }}>
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

      <main className="wrap">
        <nav className="tabs">
          <button className="tab active" data-filter="active" type="button">Active</button>
          <button className="tab" data-filter="shared" type="button" disabled>Shared with me</button>
        </nav>

        {loading && <div className="meta">Loading...</div>}
        {error && <div className="meta" style={{color:'#B91C1C'}}>{error}</div>}

        {!loading && !error && (
          filtered.length ? (
            <section id="grid" className="grid">
              {filtered.map((b) => (
                <article key={b.id} className="card" onClick={()=>navigate(`/boards/${b.id}`)}>
                  <div className="row">
                    <div className="title">{b.name}</div>
                    <span className="kebab">⋯</span>
                  </div>
                  {!!chips(b.description).length && (
                    <div className="badges">
                      {chips(b.description).map((t,i)=> <span key={i} className="badge">{t}</span>)}
                    </div>
                  )}
                  <div className="row">
                    <div className="meta">{new Date(b.createdAt).toLocaleDateString()} · ID {b.id}</div>
                    <div className="avatars">
                      <div className="dot" />
                      <div className="dot" />
                      <div className="dot" />
                    </div>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <section id="empty" className="empty">
              <div className="emptyCard">
                <div className="emptyIcon">+</div>
                <div className="emptyText">You have no boards</div>
                <button className="create" id="createBottom" onClick={()=>setIsModalOpen(true)}>Create board</button>
              </div>
            </section>
          )
        )}
      </main>


      {isModalOpen && (
        <div className="modal">
          <div className="modalCard">
            <div className="modalHead">
              <h2 id="modalTitle">Create board</h2>
              <button className="close" aria-label="Close" onClick={()=>setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={onSubmit}>
              <div className="field">
                <label htmlFor="boardTitle">Title</label>
                <input id="boardTitle" type="text" value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} placeholder="Project Alpha" required maxLength={200} />
              </div>
              <div className="field">
                <label htmlFor="boardDesc">Description (comma to create tags)</label>
                <textarea id="boardDesc" value={form.description} onChange={(e)=>setForm({...form, description:e.target.value})} placeholder="Frontend, Design" maxLength={1000} />
              </div>
              <div className="actionsRow">
                <button type="button" className="sec" onClick={()=>setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="create" disabled={creating}>{creating ? 'Creating…' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
