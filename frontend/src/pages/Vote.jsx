import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import '../styles/demo-auth.css'

export default function Vote() {
  const navigate = useNavigate()
  const { boardId } = useParams()
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark'
    return window.localStorage.getItem('pp-theme') || 'dark'
  })

  // Профиль и состояния для тулбара, как на Boards
  const [profile, setProfile] = useState(null)
  const [lang, setLang] = useState(() => {
    if (typeof window === 'undefined') return 'en'
    return window.localStorage.getItem('pp-lang') || 'en'
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const menuRef = useRef(null)
  const avatarBtnRef = useRef(null)
  const langDdRef = useRef(null)

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
  // Флаг, чтобы не создавать конкурентные запросы reloadState при частом опросе
  const reloadingRef = useRef(false)

  // Загрузка профиля пользователя для тулбара (как на Boards)
  useEffect(() => {
    const loadProfile = async () => {
      const t = window.localStorage.getItem('pp-token')
      if (!t) { navigate('/login', { replace: true }); return }
      try {
        const res = await fetch('/api/v1/users/me', { headers: { 'Authorization': `Bearer ${t}` } })
        if (res.status === 401) { navigate('/login', { replace: true }); return }
        if (res.ok) setProfile(await res.json())
      } catch (_) { /* ignore */ }
    }
    loadProfile()
  }, [navigate])

  // Сохранение языка
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pp-lang', lang)
    }
  }, [lang])

  // Закрытие меню пользователя по клику вне и Esc
  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!menuOpen) return
      if (menuRef.current && !menuRef.current.contains(e.target) && avatarBtnRef.current && !avatarBtnRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    const onKeyDown = (e) => {
      if (!menuOpen) return
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  // Закрытие выпадающего списка языка
  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!langOpen) return
      if (langDdRef.current && !langDdRef.current.contains(e.target)) {
        setLangOpen(false)
      }
    }
    const onKeyDown = (e) => {
      if (!langOpen) return
      if (e.key === 'Escape') setLangOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [langOpen])

  // Загрузка краткой инфы о борде (для заголовка) и состояния голосования
  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    const load = async () => {
      try {
        // Явный вход в голосование, чтобы пользователь появился как участник (и для восстановления после kick)
        await fetch(`/api/v1/boards/${boardId}/vote/join`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
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
    if (reloadingRef.current) return
    reloadingRef.current = true
    try {
      const res = await fetch(`/api/v1/boards/${boardId}/vote/state`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (res.status === 401) { navigate('/login', { replace: true }); return }
      if (res.ok) setState(await res.json())
    } catch (_) {
      // игнорируем единичные ошибки сети при опросе
    } finally {
      reloadingRef.current = false
    }
  }

  // Лёгкое «реалтайм»-обновление: более частый опрос состояния (каждые 500 мс), пока вкладка видима
  useEffect(() => {
    if (!token) return
    let intervalId = null

    const start = () => {
      if (intervalId) return
      intervalId = setInterval(() => {
        // чтобы не мешать действиям пользователя — берём актуальное состояние с сервера
        reloadState()
      }, 500)
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
    const onFocus = () => {
      // Мгновенно подтягиваем состояние при возвращении к вкладке
      reloadState()
    }

    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, boardId])

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  // Хэндлеры тулбара (аналогичные Boards)
  const onLogout = async () => {
    const t = window.localStorage.getItem('pp-token')
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST', headers: t ? { 'Authorization': `Bearer ${t}` } : {} })
    } catch (_) {}
    try { window.localStorage.removeItem('pp-token') } catch (_) {}
    navigate('/login', { replace: true })
  }

  const goProfile = () => {
    setMenuOpen(false)
    navigate('/profile')
  }

  const userName = useMemo(() => {
    if (!profile) return ''
    return profile.displayName || profile.name || profile.username || profile.email || ''
  }, [profile])

  const userInitial = useMemo(() => {
    const src = (userName || '').trim()
    if (!src) return '?'
    const firstWord = src.split(/\s+/)[0]
    const ch = firstWord.charAt(0)
    return ch ? ch.toUpperCase() : '?'
  }, [userName])

  const avatarUrl = profile?.avatarUrl || profile?.avatar_url || null
  const onAvatarImgError = (e) => { if (e?.currentTarget) e.currentTarget.style.display = 'none' }

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
      if (res.status === 403) { navigate('/boards', { replace: true }); return }
      if (res.ok) {
        const data = await res.json()
        setState(data)
        // Подтягиваем актуальное состояние сразу после голоса
        reloadState()
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
      if (res.ok) {
        setState(await res.json())
        reloadState()
      }
    } catch (e) {
      setError(e.message || 'Не удалось переключить раскрытие')
    }
  }

  // Если текущего пользователя нет среди участников, значит он кикнут — перенаправляем на /boards
  useEffect(() => {
    if (!profile || !state) return
    try {
      const myId = profile?.id
      const presentIds = (state?.participants || []).map(p => p?.userId).filter(Boolean)
      if (myId && !presentIds.includes(myId)) {
        navigate('/boards', { replace: true })
      }
    } catch (_) { /* ignore */ }
  }, [state, profile, navigate])

  const onReset = async () => {
    if (!token || !state?.permissions?.canReset) return
    try {
      const res = await fetch(`/api/v1/boards/${boardId}/vote/reset`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.status === 401) { navigate('/login', { replace: true }); return }
      if (res.ok) {
        setState(await res.json())
        reloadState()
      }
    } catch (e) {
      setError(e.message || 'Не удалось сбросить голоса')
    }
  }

  const onKick = async (userId) => {
    if (!token || !state?.permissions?.canReveal) return // используем canReveal как прокси-право модерации
    try {
      const res = await fetch(`/api/v1/boards/${boardId}/vote/kick/${userId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.status === 401) { navigate('/login', { replace: true }); return }
      if (res.ok) {
        setState(await res.json())
        reloadState()
      }
    } catch (e) {
      setError(e.message || 'Не удалось удалить участника')
    }
  }

  if (loading) {
    return (
      <div className={`pp-root theme-${theme}`}>
        <header className="topbar">
          <div className="topbar__inner">
            <a className="brand" href="/boards" onClick={(e)=>{e.preventDefault(); navigate('/boards')}}>
              <span className="brand__mark" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2"/>
                  <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </span>
              <span className="brand__text">Planning Poker</span>
            </a>
            <nav className="nav nav--hidden-on-mobile" aria-label="Top navigation" />
            <div className="topbar__actions">
              <a className="nav__link" href="https://github.com/Zherikhov/EasyPlanningPoker" target="_blank" rel="noopener noreferrer">GitHub</a>
              <div className="langDropdown" ref={langDdRef}>
                <button type="button" className="langDropdown__button" aria-haspopup="listbox" aria-expanded={langOpen} onClick={() => setLangOpen(o=>!o)} title="Select language">
                  {lang === 'en' ? 'English' : lang}
                  <span className="langDropdown__chevron" aria-hidden="true">▾</span>
                </button>
                {langOpen && (
                  <ul className="langDropdown__menu" role="listbox" aria-label="Languages">
                    <li role="option" aria-selected={lang === 'en'} className={`langDropdown__option ${lang === 'en' ? 'is-selected' : ''}`} onClick={() => { setLang('en'); setLangOpen(false) }} tabIndex={0}
                        onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' ') { setLang('en'); setLangOpen(false) } }}>
                      English
                    </li>
                  </ul>
                )}
              </div>
              <button className="themeToggle" type="button" aria-label="Theme toggle (visual)" aria-pressed={theme === 'light'} title={theme === 'light' ? 'Переключить на тёмную тему' : 'Переключить на светлую тему'} onClick={toggleTheme}>
                <span className="themeToggle__pill" aria-hidden="true"></span>
              </button>
              <div className="userMenu" ref={menuRef}>
                <button type="button" className="userAvatarBtn" aria-haspopup="menu" aria-expanded={menuOpen} onClick={()=>setMenuOpen(o=>!o)} ref={avatarBtnRef}>
                  <span className="userAvatarBtn__fallback" aria-hidden={!!avatarUrl}>{userInitial}</span>
                  {avatarUrl && (
                    <img src={avatarUrl} alt={userName || 'User avatar'} className="userAvatarBtn__img" onError={onAvatarImgError} draggable={false} />
                  )}
                </button>
                {menuOpen && (
                  <div className="userMenu__dropdown" role="menu">
                    <button className="userMenu__item" role="menuitem" onClick={goProfile}>Profile</button>
                    <button className="userMenu__item" role="menuitem" onClick={onLogout}>Log out</button>
                  </div>
                )}
              </div>
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
            <a className="brand" href="/boards" onClick={(e)=>{e.preventDefault(); navigate('/boards')}}>
              <span className="brand__mark" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2"/>
                  <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </span>
              <span className="brand__text">Planning Poker</span>
            </a>
            <nav className="nav nav--hidden-on-mobile" aria-label="Top navigation" />
            <div className="topbar__actions">
              <a className="nav__link" href="https://github.com/Zherikhov/EasyPlanningPoker" target="_blank" rel="noopener noreferrer">GitHub</a>
              <div className="langDropdown" ref={langDdRef}>
                <button type="button" className="langDropdown__button" aria-haspopup="listbox" aria-expanded={langOpen} onClick={() => setLangOpen(o=>!o)} title="Select language">
                  {lang === 'en' ? 'English' : lang}
                  <span className="langDropdown__chevron" aria-hidden="true">▾</span>
                </button>
                {langOpen && (
                  <ul className="langDropdown__menu" role="listbox" aria-label="Languages">
                    <li role="option" aria-selected={lang === 'en'} className={`langDropdown__option ${lang === 'en' ? 'is-selected' : ''}`} onClick={() => { setLang('en'); setLangOpen(false) }} tabIndex={0}
                        onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' ') { setLang('en'); setLangOpen(false) } }}>
                      English
                    </li>
                  </ul>
                )}
              </div>
              <button className="themeToggle" type="button" aria-label="Theme toggle (visual)" aria-pressed={theme === 'light'} title={theme === 'light' ? 'Переключить на тёмную тему' : 'Переключить на светлую тему'} onClick={toggleTheme}>
                <span className="themeToggle__pill" aria-hidden="true"></span>
              </button>
              <div className="userMenu" ref={menuRef}>
                <button type="button" className="userAvatarBtn" aria-haspopup="menu" aria-expanded={menuOpen} onClick={()=>setMenuOpen(o=>!o)} ref={avatarBtnRef}>
                  <span className="userAvatarBtn__fallback" aria-hidden={!!avatarUrl}>{userInitial}</span>
                  {avatarUrl && (
                    <img src={avatarUrl} alt={userName || 'User avatar'} className="userAvatarBtn__img" onError={onAvatarImgError} draggable={false} />
                  )}
                </button>
                {menuOpen && (
                  <div className="userMenu__dropdown" role="menu">
                    <button className="userMenu__item" role="menuitem" onClick={goProfile}>Profile</button>
                    <button className="userMenu__item" role="menuitem" onClick={onLogout}>Log out</button>
                  </div>
                )}
              </div>
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
          <a className="brand" href="/boards" onClick={(e)=>{e.preventDefault(); navigate('/boards')}}>
            <span className="brand__mark" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2"/>
                <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
            <span className="brand__text">Planning Poker</span>
          </a>

          <nav className="nav nav--hidden-on-mobile" aria-label="Top navigation" />

          <div className="topbar__actions">
            <a className="nav__link" href="https://github.com/Zherikhov/EasyPlanningPoker" target="_blank" rel="noopener noreferrer">GitHub</a>

            <div className="langDropdown" ref={langDdRef}>
              <button
                type="button"
                className="langDropdown__button"
                aria-haspopup="listbox"
                aria-expanded={langOpen}
                onClick={() => setLangOpen(o=>!o)}
                title="Select language"
              >
                {lang === 'en' ? 'English' : lang}
                <span className="langDropdown__chevron" aria-hidden="true">▾</span>
              </button>
              {langOpen && (
                <ul className="langDropdown__menu" role="listbox" aria-label="Languages">
                  <li
                    role="option"
                    aria-selected={lang === 'en'}
                    className={`langDropdown__option ${lang === 'en' ? 'is-selected' : ''}`}
                    onClick={() => { setLang('en'); setLangOpen(false) }}
                    tabIndex={0}
                    onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' ') { setLang('en'); setLangOpen(false) } }}
                  >
                    English
                  </li>
                </ul>
              )}
            </div>

            <button
              className="themeToggle"
              type="button"
              aria-label="Theme toggle (visual)"
              aria-pressed={theme === 'light'}
              title={theme === 'light' ? 'Переключить на тёмную тему' : 'Переключить на светлую тему'}
              onClick={toggleTheme}
            >
              <span className="themeToggle__pill" aria-hidden="true"></span>
            </button>

            {/* User avatar + dropdown (правый край) */}
            <div className="userMenu" ref={menuRef}>
              <button
                type="button"
                className="userAvatarBtn"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={()=>setMenuOpen(o=>!o)}
                ref={avatarBtnRef}
              >
                {/* Буква как фон, картинка сверху если есть */}
                <span className="userAvatarBtn__fallback" aria-hidden={!!avatarUrl}>{userInitial}</span>
                {avatarUrl && (
                  <img
                    src={avatarUrl}
                    alt={userName || 'User avatar'}
                    className="userAvatarBtn__img"
                    onError={onAvatarImgError}
                    draggable={false}
                  />
                )}
              </button>
              {menuOpen && (
                <div className="userMenu__dropdown" role="menu">
                  <button className="userMenu__item" role="menuitem" onClick={goProfile}>Profile</button>
                  <button className="userMenu__item" role="menuitem" onClick={onLogout}>Log out</button>
                </div>
              )}
            </div>
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
            <div className="participantsGrid" style={{marginTop:12, display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:12}}>
              {participants.map(p => {
                const hasVote = !!p.voted
                const showCheck = !revealed && hasVote
                const display = revealed ? (p.value ?? '—') : (hasVote ? '' : '—')
                // Всегда используем avatarUrl, пришедший с сервера для каждого участника,
                // без локальной подмены по совпадению имени, чтобы исключить рассинхрон между пользователями
                const pAvatarUrl = p?.avatarUrl || null
                const pInitial = String(p.name||'U').trim().charAt(0).toUpperCase()
                return (
                  <div key={p.id} className={`participant${hasVote ? ' voted' : ''}`} style={{border:'1px solid var(--border)', borderRadius:16, padding:16, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, background:'rgba(255,255,255,.02)'}}>
                    <div className="pLeft" style={{display:'flex', alignItems:'center', gap:10, minWidth:0, flex:1}}>
                      <div className="participantAvatar" aria-hidden={false}>
                        <span className="participantAvatar__fallback" aria-hidden={!!pAvatarUrl}>{pInitial}</span>
                        {pAvatarUrl && (
                          <img src={pAvatarUrl} alt="" className="participantAvatar__img" onError={(e)=>{ if(e?.currentTarget) e.currentTarget.style.display='none' }} draggable={false} />
                        )}
                      </div>
                      <div className="name" title={p.name} style={{fontSize:14, fontWeight:800, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100%'}}>{p.name}</div>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <div
                        className={`voteChip${revealed ? '' : ' hidden'}`}
                        style={{
                          minWidth:46,
                          height:34,
                          borderRadius:12,
                          border:'1px solid var(--border)',
                          display:'grid',
                          placeItems:'center',
                          fontWeight:950,
                          fontSize:16,
                          background:'rgba(255,255,255,.03)',
                          color: showCheck ? '#22c55e' : (!revealed ? 'rgba(156,163,175,.75)' : undefined)
                        }}
                      >
                        {showCheck ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          display
                        )}
                      </div>
                      {/* Кнопка удаления участника доступна модератору; скрываем для самого себя и когда нет userId (напр. гость) */}
                      {state?.permissions?.canReveal && p.userId && profile?.id !== p.userId && (
                        <button
                          type="button"
                          className="iconBtn"
                          aria-label="Remove participant"
                          title="Remove participant"
                          onClick={() => onKick(p.userId)}
                          style={{
                            width:28,
                            height:28,
                            borderRadius:8,
                            border:'1px solid var(--border)',
                            display:'grid',
                            placeItems:'center',
                            background:'transparent',
                            color:'var(--muted)'
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </button>
                      )}
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
