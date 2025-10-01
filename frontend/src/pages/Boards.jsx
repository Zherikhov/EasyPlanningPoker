import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from '../lib/apiBase'
import { getSavedTheme, applyTheme } from '../lib/theme.js'
import '../styles/workspace.css'

export default function Boards() {
  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('active') // 'active' | 'shared'
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

  // client-side filtering with tab and search
  const filtered = useMemo(() => {
    const q = (query || '').toLowerCase()
    let list = boards
    if (tab === 'shared') {
      list = list.filter(b => b.shared)
    }
    if (!q) return list
    return list.filter(b =>
      (b.name || '').toLowerCase().includes(q) ||
      (b.description || '').toLowerCase().includes(q)
    )
  }, [boards, query, tab])

  // helper to derive chips from description (comma separated) similar to demo tags
  const chips = (text) => (text || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 4)


  return (
    <div>

      <main className="wrap">
        <nav className="tabs">
          <button className={`tab ${tab === 'active' ? 'active' : ''}`} data-filter="active" type="button" onClick={()=>setTab('active')}>Active</button>
          <button className={`tab ${tab === 'shared' ? 'active' : ''}`} data-filter="shared" type="button" onClick={()=>setTab('shared')} disabled={!boards.some(b=>b.shared)}>Shared with me</button>
        </nav>

        <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:12}}>
          <div className="search" style={{flex:1}}>
            <svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input id="search" type="search" placeholder="Search boards" value={query} onChange={(e)=>setQuery(e.target.value)} />
          </div>
          <button className="create" id="createTop" onClick={()=>setIsModalOpen(true)}>Create board</button>
        </div>

        {loading && <div className="meta">Loading...</div>}
        {error && <div className="meta" style={{color:'#B91C1C'}}>{error}</div>}

        {!loading && !error && (
          filtered.length ? (
            <section id="grid" className="grid">
              {filtered.map((b) => (
                <article key={b.id} className="card" onClick={()=>navigate(`/boards/${b.id}`)}>
                  <div className="row">
                    <div className="title">{b.name}</div>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      {b.shared && <span className="badge" title="Shared with you">Shared</span>}
                      <span className="kebab">⋯</span>
                    </div>
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
