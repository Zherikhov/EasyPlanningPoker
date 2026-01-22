import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import '../styles/demo-auth.css'

export default function Vote() {
  const navigate = useNavigate()
  const { boardId } = useParams()
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark'
    return window.localStorage.getItem('pp-theme') || 'dark'
  })

  const [state, setState] = useState(null) // серверное состояние голосования
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Тема на <html>
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const html = document.documentElement
      html.classList.remove('theme-light', 'theme-dark')
      html.classList.add(`theme-${theme}`)
      window.localStorage.setItem('pp-theme', theme)
    }
  }, [theme])

  const token = useMemo(() => (typeof window !== 'undefined' ? window.localStorage.getItem('pp-token') : null), [])

  // Загрузка краткой инфы о борде (для заголовка) и состояния голосования
  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    const load = async () => {
      try {
        const [resBoard, resState] = await Promise.all([
          fetch(`/api/v1/boards/${boardId}/summary`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`/api/v1/boards/${boardId}/vote/state`, { headers: { 'Authorization': `Bearer ${token}` } })
        ])
        if (resBoard.status === 401 || resState.status === 401) {
          navigate('/login', { replace: true }); return
        }
        if (!resBoard.ok) throw new Error('Failed to load board')
        if (!resState.ok) throw new Error('Failed to load voting state')
        setBoard(await resBoard.json())
        setState(await resState.json())
      } catch (e) {
        setError(e.message || 'Ошибка загрузки')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [boardId, navigate, token])

  const reloadState = async () => {
    if (!token) return
    try {
      const res = await fetch(`/api/v1/boards/${boardId}/vote/state`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (res.status === 401) { navigate('/login', { replace: true }); return }
      if (res.ok) setState(await res.json())
    } catch (_) {}
  }

  // Лёгкое «реалтайм»-обновление: опрос состояния каждые 2 секунды, пока вкладка видима
  useEffect(() => {
    if (!token) return
    let intervalId = null

    const start = () => {
      if (intervalId) return
      intervalId = setInterval(() => {
        // чтобы не мешать действиям пользователя — берём актуальное состояние с сервера
        reloadState()
      }, 2000)
    }
    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') start()
      else stop()
    }

    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, boardId])

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  const onCardClick = async (label, numeric) => {
    // Нельзя голосовать, если голосование закрыто
    if (!token || state?.closed) return
    try {
      const res = await fetch(`/api/v1/boards/${boardId}/vote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ valueLabel: label, numericValue: numeric ?? null })
      })
      if (res.status === 401) { navigate('/login', { replace: true }); return }
      if (res.ok) {
        const data = await res.json()
        setState(data)
      }
    } catch (e) {
      setError(e.message || 'Не удалось отправить голос')
    }
  }

  const onRevealToggle = async () => {
    if (!token || !state?.permissions?.canReveal) return
    try {
      const res = await fetch(`/api/v1/boards/${boardId}/vote/reveal`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ revealed: !state.revealed })
      })
      if (res.status === 401) { navigate('/login', { replace: true }); return }
      if (res.ok) setState(await res.json())
    } catch (e) {
      setError(e.message || 'Не удалось переключить раскрытие')
    }
  }

  const onReset = async () => {
    if (!token || !state?.permissions?.canReset) return
    try {
      const res = await fetch(`/api/v1/boards/${boardId}/vote/reset`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.status === 401) { navigate('/login', { replace: true }); return }
      if (res.ok) setState(await res.json())
    } catch (e) {
      setError(e.message || 'Не удалось сбросить голоса')
    }
  }

  if (loading) {
    return (
      <div className={`pp-root theme-${theme}`}>
        <header className="topbar">
          <div className="topbar__inner">
            <a className="brand" href="#" onClick={(e)=>e.preventDefault()}>
              <span className="brand__mark" aria-hidden="true">◆</span>
              <span className="brand__text">Planning Poker</span>
            </a>
            <div className="topbar__actions">
              <button className="themeToggle" type="button" onClick={toggleTheme} aria-label="Toggle theme">
                <span className="themeToggle__pill" aria-hidden="true"></span>
              </button>
            </div>
          </div>
        </header>
        <main className="boards">
          <div className="boards__inner">
            <p className="muted">Loading…</p>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`pp-root theme-${theme}`}>
        <header className="topbar">
          <div className="topbar__inner">
            <a className="brand" href="#" onClick={(e)=>e.preventDefault()}>
              <span className="brand__mark" aria-hidden="true">◆</span>
              <span className="brand__text">Planning Poker</span>
            </a>
            <div className="topbar__actions">
              <button className="themeToggle" type="button" onClick={toggleTheme} aria-label="Toggle theme">
                <span className="themeToggle__pill" aria-hidden="true"></span>
              </button>
            </div>
          </div>
        </header>
        <main className="boards">
          <div className="boards__inner">
            <p className="muted">{error}</p>
            <button className="btn btn--ghost" type="button" onClick={()=>navigate('/boards')}>Back to boards</button>
          </div>
        </main>
      </div>
    )
  }

  const revealed = !!state?.revealed
  const closed = !!state?.closed
  const scale = Array.isArray(state?.scale) ? state.scale : []
  const participants = Array.isArray(state?.participants) ? state.participants : []
  const myVote = state?.myVote || null

  return (
    <div className={`pp-root theme-${theme}`}>
      <header className="topbar">
        <div className="topbar__inner">
          <a className="brand" href="#" onClick={(e)=>e.preventDefault()}>
            <span className="brand__mark" aria-hidden="true">◆</span>
            <span className="brand__text">Planning Poker</span>
          </a>
          <div className="topbar__actions">
            <span className="sessionName" title="Board">{board?.name || 'Board'}</span>
            <button className="themeToggle" type="button" onClick={toggleTheme} aria-label="Toggle theme">
              <span className="themeToggle__pill" aria-hidden="true"></span>
            </button>
          </div>
        </div>
      </header>

      <main className="boards">
        <div className="boards__inner">
          {/* Story panel */}
          <section className="storyPanel" style={{border:'1px solid var(--border)', background:'var(--panel)', borderRadius:18, padding:16, boxShadow:'0 12px 26px rgba(0,0,0,.14)'}}>
            <div className="storyHead" style={{display:'flex', justifyContent:'space-between', gap:12}}>
              <h1 className="storyTitle" style={{margin:0, fontSize:20}}>{state?.currentItem?.title || 'Estimation'}</h1>
              <span className="statusPill" style={{padding:'6px 10px', border:'1px solid var(--border)', borderRadius:999, color:'var(--muted)'}}>
                {closed ? 'Closed' : (revealed ? 'Revealed' : 'Hidden')}
              </span>
            </div>
            {state?.currentItem?.description && (
              <p className="storyDesc" style={{marginTop:6, color:'var(--muted)'}}>{state.currentItem.description}</p>
            )}
          </section>

          {/* Participants */}
          <section className="participantsPanel" style={{border:'1px solid var(--border)', background:'var(--panel)', borderRadius:18, padding:16, boxShadow:'0 12px 26px rgba(0,0,0,.14)', marginTop:12}}>
            <div className="panelHead" style={{display:'flex', justifyContent:'space-between'}}>
              <h2 style={{margin:0, fontSize:15}}>Participants</h2>
              <div className="muted" style={{color:'var(--muted)', fontSize:12}}>{revealed ? 'Cards are revealed' : 'Cards are hidden'}</div>
            </div>
            <div className="participantsGrid" style={{marginTop:12, display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:12}}>
              {participants.map(p => {
                const hasVote = !!p.voted
                const display = revealed ? (p.value ?? '—') : (hasVote ? '●' : '—')
                return (
                  <div key={p.id} className={`participant${hasVote ? ' voted' : ''}`} style={{border:'1px solid var(--border)', borderRadius:16, padding:12, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, background:'rgba(255,255,255,.02)'}}>
                    <div className="pLeft" style={{display:'flex', alignItems:'center', gap:10, minWidth:0}}>
                      <div className="avatar" style={{width:34, height:34, borderRadius:999, display:'grid', placeItems:'center', background:'rgba(37,99,235,.22)', color:'var(--primary-ink)', fontWeight:900}}>
                        {String(p.name||'U').trim().charAt(0).toUpperCase()}
                      </div>
                      <div className="name" title={p.name} style={{fontSize:14, fontWeight:800, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:160}}>{p.name}</div>
                    </div>
                    <div className={`voteChip${revealed ? '' : ' hidden'}`} style={{minWidth:46, height:34, borderRadius:12, border:'1px solid var(--border)', display:'grid', placeItems:'center', fontWeight:950, fontSize:16, background:'rgba(255,255,255,.03)', color:!revealed ? 'rgba(156,163,175,.75)' : undefined}}>
                      {display}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Voting cards */}
          <section className="votingPanel" style={{border:'1px solid var(--border)', background:'var(--panel)', borderRadius:18, padding:16, boxShadow:'0 12px 26px rgba(0,0,0,.14)', marginTop:12}}>
            <div className="panelHead" style={{display:'flex', justifyContent:'space-between'}}>
              <h2 style={{margin:0, fontSize:15}}>Your vote</h2>
              <div className="panelHint muted" style={{color:'var(--muted)', fontSize:12}}>
                {closed ? 'Voting is closed' : 'Pick a card.'}
              </div>
            </div>

            <div className="cards" style={{marginTop:12, display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10}}>
              {scale.map(sc => {
                const active = myVote === sc.label
                return (
                  <button key={sc.position} type="button"
                          className={`card${active ? ' active' : ''}`}
                          onClick={() => onCardClick(sc.label, sc.numeric)}
                          disabled={closed}
                          style={{
                            height:62, borderRadius:16, border:'1px solid var(--border)', background: active ? 'linear-gradient(180deg, rgba(37,99,235,.95), rgba(37,99,235,.80))' : 'rgba(255,255,255,.02)',
                            color: active ? 'var(--primary-ink)' : 'var(--text)', fontSize:18, fontWeight:950, cursor:'pointer'
                          }}>
                    {sc.label}
                  </button>
                )
              })}
            </div>

            <div className="yourChoice" style={{marginTop:12, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <span className="muted" style={{color:'var(--muted)'}}>Selected:</span>
              <span className="choicePill" style={{padding:'8px 12px', border:'1px solid var(--border)', borderRadius:999, background:'rgba(255,255,255,.03)', fontWeight:900}}>{myVote || '—'}</span>
            </div>
          </section>

          {/* Controls */}
          <section className="controlsPanel" style={{display:'flex', justifyContent:'space-between', gap:12, marginTop:12}}>
            <button className="btn btn--ghost" type="button" onClick={onReset} disabled={!state?.permissions?.canReset}>Reset votes</button>
            <button className="btn btn--primary" type="button" onClick={onRevealToggle} disabled={!state?.permissions?.canReveal}>
              {revealed ? 'Hide cards' : 'Reveal cards'}
            </button>
          </section>

          <div style={{marginTop:16}}>
            <button className="btn btn--ghost" type="button" onClick={()=>navigate('/boards')}>Back to boards</button>
            <button className="btn btn--ghost" type="button" onClick={reloadState} style={{marginLeft:8}}>Refresh</button>
          </div>
        </div>
      </main>
    </div>
  )
}
