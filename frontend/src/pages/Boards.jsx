import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/demo-auth.css'

export default function Boards() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark'
    return window.localStorage.getItem('pp-theme') || 'dark'
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const avatarBtnRef = useRef(null)

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

  const goProfile = () => {
    setMenuOpen(false)
    navigate('/profile')
  }

  return (
    <div className={`pp-root theme-${theme}`}>
      <header className="topbar">
        <div className="topbar__inner">
          <a className="brand" href="#" onClick={(e)=>e.preventDefault()}>
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
            <a className="nav__link" href="#" onClick={(e)=>e.preventDefault()}>Boards</a>
            <a className="nav__link" href="https://github.com/Zherikhov/EasyPlanningPoker" target="_blank" rel="noopener noreferrer">GitHub</a>

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

      <main className="hero">
        <div className="hero__bg" aria-hidden="true"></div>
        <section className="hero__inner">
          <div className="hero__left">
            <h1 className="h1">Ваши доски</h1>
            {loading && (
              <p className="lead">Загрузка профиля...</p>
            )}
            {!loading && error && (
              <p className="lead" style={{ color: 'tomato' }}>{error}</p>
            )}
            {!loading && profile && (
              <p className="desc">Добро пожаловать, {userName || 'пользователь'}.</p>
            )}
          </div>
          <div className="hero__right">
            {/* Здесь может быть список досок или промо-блок */}
          </div>
        </section>
      </main>
    </div>
  )
}
