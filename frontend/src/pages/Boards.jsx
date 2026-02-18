import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/demo-auth.css'
import ProfileDialog from '../components/ProfileDialog.jsx'

export default function Boards() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark'
    return window.localStorage.getItem('pp-theme') || 'dark'
  })
  // Состояния Boards
  const [boards, setBoards] = useState([])
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  // Pin to top удалён по требованиям
  const [lang, setLang] = useState(() => {
    if (typeof window === 'undefined') return 'en'
    return window.localStorage.getItem('pp-lang') || 'en'
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const avatarBtnRef = useRef(null)
  const [langOpen, setLangOpen] = useState(false)
  const langDdRef = useRef(null)

  // Выпадающее меню на карточке доски (шестерёнка)
  const [openCardMenuId, setOpenCardMenuId] = useState(null)

  useEffect(() => {
    const token = window.localStorage.getItem('pp-token')
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    const load = async () => {
      try {
        const res = await fetch('/api/v1/users/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        if (!res.ok) throw new Error('Failed to load profile')
        const data = await res.json()
        setProfile(data)
      } catch (e) {
        setError(e.message || 'Ошибка загрузки')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [navigate])

  // Применяем класс темы на <html> и сохраняем выбор
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pp-theme', theme)
      const rootEl = document.documentElement
      rootEl.classList.remove('theme-light', 'theme-dark')
      rootEl.classList.add(`theme-${theme}`)
    }
  }, [theme])

  // Сохраняем выбранный язык
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pp-lang', lang)
    }
  }, [lang])

  // Закрытие меню по клику вне и по Esc
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

  // Закрытие выпадающего списка языка по клику вне и по Esc (как на Login)
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

  // Закрытие меню карточек (шестерёнка) по клику вне и по Esc
  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (openCardMenuId == null) return
      const el = e.target
      // если клик по кнопке или внутри меню — игнор
      if (el && (el.closest && (el.closest('.cardMenuBtn') || el.closest('.cardMenu')))) return
      setOpenCardMenuId(null)
    }
    const onKeyDown = (e) => {
      if (openCardMenuId == null) return
      if (e.key === 'Escape') setOpenCardMenuId(null)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [openCardMenuId])

  const onLogout = async () => {
    const token = window.localStorage.getItem('pp-token')
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
    } catch (_) { /* ignore */ }
    try { window.localStorage.removeItem('pp-token') } catch (_) {}
    navigate('/login', { replace: true })
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

  const onAvatarImgError = (e) => {
    // скрываем битую картинку, показываем fallback-букву
    if (e?.currentTarget) {
      e.currentTarget.style.display = 'none'
    }
  }

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  const [showProfile, setShowProfile] = useState(false)
  const goProfile = () => {
    setMenuOpen(false)
    setShowProfile(true)
  }

  // ---------- Boards helpers ----------
  // Загрузка досок текущего пользователя с бэкенда
  useEffect(() => {
    const token = window.localStorage.getItem('pp-token')
    if (!token) return
    const controller = new AbortController()
    const loadBoards = async () => {
      try {
        const url = new URL('/api/v1/boards', window.location.origin)
        url.searchParams.set('mode', 'all')
        if (search && search.trim()) url.searchParams.set('search', search.trim())
        const res = await fetch(url.toString(), {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: controller.signal
        })
        if (res.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        if (!res.ok) throw new Error('Failed to load boards')
        const data = await res.json()
        const items = Array.isArray(data?.items) ? data.items : []
        const mapped = items.map(it => ({
          id: it.id,
          key: it.key,
          name: it.name,
          description: it.description,
          participants: it.participantsCount ?? 0,
          updated_at: it.lastUsedAt ? new Date(it.lastUsedAt).getTime() : 0
        }))
        setBoards(mapped)
      } catch (e) {
        if (e?.name !== 'AbortError') setError(e.message || 'Ошибка загрузки досок')
      }
    }
    loadBoards()
    return () => controller.abort()
  }, [navigate, search])

  const fmtUpdated = (ts) => {
    const delta = Date.now() - ts
    const min = Math.floor(delta/60000)
    if(min < 1) return 'just now'
    if(min < 60) return `${min} min ago`
    const h = Math.floor(min/60)
    if(h < 24) return `${h} hours ago`
    const d = Math.floor(h/24)
    return `${d} days ago`
  }

  const filtered = useMemo(() => {
    const sorted = [...boards].sort((a,b)=> (b.updated_at||0) - (a.updated_at||0))
    return sorted
  }, [boards])

  const openCreate = () => {
    setIsClosing(false)
    setCreateOpen(true)
  }
  const closeCreate = () => {
    setIsClosing(true)
  }
  const onAnimationEnd = () => {
    if (isClosing) {
      setCreateOpen(false)
      setIsClosing(false)
    }
  }
  const confirmCreate = async () => {
    const name = (newName||'').trim()
    if (name.length < 2) return
    const token = window.localStorage.getItem('pp-token')
    try {
      const res = await fetch('/api/v1/boards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, description: (newDesc||'').trim() })
      })
      if (res.status === 401) {
        navigate('/login', { replace: true })
        return
      }
      if (!res.ok) throw new Error('Failed to create board')
      // Перезагрузим список
      setNewName(''); setNewDesc('')
      setIsClosing(true)
      // триггерим перезагрузку через изменение search (или можно напрямую загрузить)
      // здесь перезагрузим напрямую
      const url = new URL('/api/v1/boards', window.location.origin)
      url.searchParams.set('mode', 'all')
      const res2 = await fetch(url.toString(), { headers: { 'Authorization': `Bearer ${token}` } })
      const data2 = await res2.json()
      const items2 = Array.isArray(data2?.items) ? data2.items : []
      const mapped2 = items2.map(it => ({
        id: it.id,
        key: it.key,
        name: it.name,
        description: it.description,
        participants: it.participantsCount ?? 0,
        updated_at: it.lastUsedAt ? new Date(it.lastUsedAt).getTime() : 0
      }))
      setBoards(mapped2)
    } catch (e) {
      setError(e.message || 'Ошибка создания доски')
    }
  }

  const confirmDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this board?')) return
    const token = window.localStorage.getItem('pp-token')
    try {
      const res = await fetch(`/api/v1/boards/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.status === 401) {
        navigate('/login', { replace: true })
        return
      }
      if (!res.ok) throw new Error('Failed to delete board')
      setBoards(prev => prev.filter(b => b.id !== id))
    } catch (e) {
      setError(e.message || 'Ошибка удаления')
    }
  }

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

            {/* Языковой выпадающий список — полностью переиспользуем подход как на Login */}
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
          <section className="boardsHeader">
            <div className="boardsHeader__left">
              <h1 className="boardsTitle">Your boards</h1>
              <p className="boardsSubtitle">Create a board, invite teammates, estimate stories.</p>
            </div>
            <div className="boardsHeader__right">
              <div className="search">
                <svg className="search__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 16l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <input
                  type="search"
                  placeholder="Search boards"
                  value={search}
                  onChange={(e)=>setSearch(e.target.value)}
                  aria-label="Search boards"
                />
              </div>
              <button className="btn btn--primary" type="button" onClick={openCreate}>
                <span className="btn__icon" aria-hidden="true">＋</span>
                Create board
              </button>
            </div>
          </section>

          {createOpen && (
            <section
              className={`createPanel ${isClosing ? 'createPanel--closing' : ''}`}
              onAnimationEnd={onAnimationEnd}
            >
              <div className="createPanel__head">
                <div>
                  <div className="createPanel__title">Create board</div>
                  <div className="createPanel__subtitle">Name it so your team can find it quickly.</div>
                </div>
              </div>
              <div className="createPanel__body">
                <label className="field">
                  <span className="field__label">Board name</span>
                  <input
                    type="text"
                    placeholder="e.g. Sprint 18 estimates"
                    maxLength={60}
                    value={newName}
                    onChange={(e)=>setNewName(e.target.value)}
                    onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); confirmCreate() } }}
                  />
                </label>
                <label className="field">
                  <span className="field__label">Description (optional)</span>
                  <input
                    type="text"
                    placeholder="Short note (optional)"
                    maxLength={120}
                    value={newDesc}
                    onChange={(e)=>setNewDesc(e.target.value)}
                  />
                </label>
                {/* Переключатель Pin to top удалён согласно требованиям */}
                <div className="createPanel__actions">
                  <button className="btn btn--ghost" type="button" onClick={closeCreate}>Cancel</button>
                  <button className="btn btn--primary" type="button" onClick={confirmCreate}>Create</button>
                </div>
              </div>
            </section>
          )}

          {/* Блоки Total boards, Updated in 24h и Pinned убраны */}

          <section className="boardsList" aria-label="Boards list">
            {filtered.length === 0 ? (
              <div className="emptyState">
                <div className="emptyState__icon" aria-hidden="true">🗂️</div>
                <h2>No boards yet</h2>
                <p className="muted">Create your first board to start estimating with your team.</p>
                <button className="btn btn--primary" type="button" onClick={openCreate}>Create board</button>
              </div>
            ) : (
              <div className="boardsGrid">
                {filtered.map(b => (
                  <article key={b.id} className="boardCard" role="button" tabIndex={0} aria-label={`Open board ${b.name}`}
                           onClick={()=>{ navigate(`/boards/${b.id}/vote`) }}
                           onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); navigate(`/boards/${b.id}/vote`) } }}>
                    {/* Кнопка-шестерёнка */}
                    <button
                      type="button"
                      className="cardMenuBtn"
                      aria-haspopup="menu"
                      aria-expanded={openCardMenuId === b.id}
                      title="Board actions"
                      onClick={(e)=>{ e.stopPropagation(); setOpenCardMenuId(prev => prev === b.id ? null : b.id) }}
                      onKeyDown={(e)=>{ e.stopPropagation(); if(e.key==='Enter' || e.key===' '){ e.preventDefault(); setOpenCardMenuId(prev => prev === b.id ? null : b.id) } }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>

                    {/* Выпадающее меню карточки */}
                    {openCardMenuId === b.id && (
                      <div className="cardMenu" role="menu" onClick={(e)=> e.stopPropagation()}>
                        <button className="cardMenu__item" role="menuitem" onClick={()=>{ setOpenCardMenuId(null); /* навигация на настройки в будущем */ }}>Settings</button>
                        <button className="cardMenu__item" role="menuitem" onClick={()=>{ setOpenCardMenuId(null); /* поделиться — фронтовая заглушка */ alert('Share link copied (demo)') }}>Share</button>
                        <button className="cardMenu__item cardMenu__item--danger" role="menuitem" onClick={()=>{ setOpenCardMenuId(null); confirmDelete(b.id) }}>Delete</button>
                      </div>
                    )}

                    <h3 className="boardCard__title">{b.name || 'Untitled board'}</h3>
                    <p className="boardCard__desc">{b.description || 'No description'}</p>
                    <div className="boardMeta">
                      <span className="metaPill">👥 {Number(b.participants||0)} participants</span>
                      <span className="metaPill">🕒 {fmtUpdated(b.updated_at || Date.now())}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      {showProfile && (
        <ProfileDialog open={showProfile} onClose={() => setShowProfile(false)} />
      )}
    </div>
  )
}
