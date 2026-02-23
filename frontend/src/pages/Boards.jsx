import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import '../styles/demo-auth.css'
import ProfileDialog from '../components/ProfileDialog.jsx'
import ShareDialog from '../components/ShareDialog.jsx'
import BoardSettingsDialog from '../components/BoardSettingsDialog.jsx'

export default function Boards() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
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
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const avatarBtnRef = useRef(null)
  const [langOpen, setLangOpen] = useState(false)
  const langDdRef = useRef(null)

  const currentLang = i18n.language || 'en'

  // Выпадающее меню на карточке доски (шестерёнка)
  const [openCardMenuId, setOpenCardMenuId] = useState(null)

  // Поделиться доской
  const [shareData, setShareData] = useState({ open: false, id: null, name: '' })

  // Настройки доски
  const [settingsData, setSettingsData] = useState({ open: false, id: null })

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

  const changeLanguage = async (newLang) => {
    i18n.changeLanguage(newLang)
    setLangOpen(false)
    // Sync with backend
    try {
      await fetch('/api/v1/users/me/locale', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: newLang })
      })
    } catch (e) {
      console.error('Failed to sync locale with backend', e)
    }
  }

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
    if(min < 1) return t('time.justNow', 'just now')
    if(min < 60) return `${min} ${t('time.minAgo', 'min ago')}`
    const h = Math.floor(min/60)
    if(h < 24) return `${h} ${t('time.hoursAgo', 'hours ago')}`
    const d = Math.floor(h/24)
    return `${d} ${t('time.daysAgo', 'days ago')}`
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
    if (!window.confirm(t('boards.confirmDelete', 'Are you sure you want to delete this board?'))) return
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
            <a className="nav__link" href="https://easyplanningpoker.atlassian.net/servicedesk/customer/portal/34" target="_blank" rel="noopener noreferrer">{t('common.support', 'Support')}</a>

            {/* Языковой выпадающий список — полностью переиспользуем подход как на Login */}
            <div className="langDropdown" ref={langDdRef}>
              <button
                type="button"
                className="langDropdown__button"
                aria-haspopup="listbox"
                aria-expanded={langOpen}
                onClick={() => setLangOpen(o=>!o)}
                title={t('user.selectLocale', 'Select language')}
              >
                {currentLang === 'en' ? 'English' : currentLang === 'ru' ? 'Русский' : currentLang === 'de' ? 'Deutsch' : currentLang}
                <span className="langDropdown__chevron" aria-hidden="true">▾</span>
              </button>
              {langOpen && (
                <ul className="langDropdown__menu" role="listbox" aria-label="Languages">
                  <li
                    role="option"
                    aria-selected={currentLang === 'en'}
                    className={`langDropdown__option ${currentLang === 'en' ? 'is-selected' : ''}`}
                    onClick={() => changeLanguage('en')}
                    tabIndex={0}
                    onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' ') { changeLanguage('en') } }}
                  >
                    English
                  </li>
                  <li
                    role="option"
                    aria-selected={currentLang === 'ru'}
                    className={`langDropdown__option ${currentLang === 'ru' ? 'is-selected' : ''}`}
                    onClick={() => changeLanguage('ru')}
                    tabIndex={0}
                    onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' ') { changeLanguage('ru') } }}
                  >
                    Русский
                  </li>
                  <li
                    role="option"
                    aria-selected={currentLang === 'de'}
                    className={`langDropdown__option ${currentLang === 'de' ? 'is-selected' : ''}`}
                    onClick={() => changeLanguage('de')}
                    tabIndex={0}
                    onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' ') { changeLanguage('de') } }}
                  >
                    Deutsch
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
                  <button className="userMenu__item" role="menuitem" onClick={goProfile}>{t('common.profile', 'Profile')}</button>
                  <button className="userMenu__item" role="menuitem" onClick={onLogout}>{t('common.logout', 'Log out')}</button>
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
              <h1 className="boardsTitle">{t('boards.title', 'Your boards')}</h1>
              <p className="boardsSubtitle">{t('boards.subtitle', 'Create a board, invite teammates, estimate stories.')}</p>
            </div>
            <div className="boardsHeader__right">
              <div className="search">
                <svg className="search__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 16l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <input
                  type="search"
                  placeholder={t('boards.searchPlaceholder', 'Search boards')}
                  value={search}
                  onChange={(e)=>setSearch(e.target.value)}
                  aria-label={t('boards.searchLabel', 'Search boards')}
                />
              </div>
              <button className="btn btn--primary" type="button" onClick={openCreate}>
                <span className="btn__icon" aria-hidden="true">＋</span>
                {t('boards.create', 'Create board')}
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
                  <div className="createPanel__title">{t('boards.createTitle', 'Create board')}</div>
                  <div className="createPanel__subtitle">{t('boards.createSubtitle', 'Name it so your team can find it quickly.')}</div>
                </div>
              </div>
              <div className="createPanel__body">
                <label className="field">
                  <span className="field__label">{t('boards.fieldName', 'Board name')}</span>
                  <input
                    type="text"
                    placeholder={t('boards.placeholderName', 'e.g. Sprint 18 estimates')}
                    maxLength={60}
                    value={newName}
                    onChange={(e)=>setNewName(e.target.value)}
                    onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); confirmCreate() } }}
                  />
                </label>
                <label className="field">
                  <span className="field__label">{t('boards.fieldDesc', 'Description (optional)')}</span>
                  <input
                    type="text"
                    placeholder={t('boards.placeholderDesc', 'Short note (optional)')}
                    maxLength={120}
                    value={newDesc}
                    onChange={(e)=>setNewDesc(e.target.value)}
                  />
                </label>
                {/* Переключатель Pin to top удалён согласно требованиям */}
                <div className="createPanel__actions">
                  <button className="btn btn--ghost" type="button" onClick={closeCreate}>{t('common.cancel', 'Cancel')}</button>
                  <button className="btn btn--primary" type="button" onClick={confirmCreate}>{t('boards.createBtn', 'Create')}</button>
                </div>
              </div>
            </section>
          )}

          {/* Блоки Total boards, Updated in 24h и Pinned убраны */}

          <section className="boardsList" aria-label="Boards list">
            {filtered.length > 0 && (
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
                        <button className="cardMenu__item" role="menuitem" onClick={()=>{ setOpenCardMenuId(null); setSettingsData({ open: true, id: b.id }) }}>{t('common.settings', 'Settings')}</button>
                        <button className="cardMenu__item" role="menuitem" onClick={()=>{ setOpenCardMenuId(null); setShareData({ open: true, id: b.id, name: b.name }) }}>{t('boards.share', 'Share')}</button>
                        <button className="cardMenu__item cardMenu__item--danger" role="menuitem" onClick={()=>{ setOpenCardMenuId(null); confirmDelete(b.id) }}>{t('common.delete', 'Delete')}</button>
                      </div>
                    )}

                    <h3 className="boardCard__title">{b.name || t('boards.untitled', 'Untitled board')}</h3>
                    <p className="boardCard__desc">{b.description || t('boards.noDescription', 'No description')}</p>
                    <div className="boardMeta">
                      <span className="metaPill">👥 {Number(b.participants||0)} {t('boards.participantsCount', 'participants')}</span>
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
      <ShareDialog
        open={shareData.open}
        onClose={() => setShareData({ ...shareData, open: false })}
        boardId={shareData.id}
        boardName={shareData.name}
      />
      <BoardSettingsDialog
        open={settingsData.open}
        onClose={() => setSettingsData({ ...settingsData, open: false })}
        boardId={settingsData.id}
      />
    </div>
  )
}
